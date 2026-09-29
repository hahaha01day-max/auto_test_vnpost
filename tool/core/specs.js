'use strict';

/**
 * Đọc spec để biết case nào **thật sự có phép kiểm**, case nào chỉ là **vỏ rỗng**.
 *
 * 🔴 Một nguồn duy nhất cho `bin/checklist.js` và `bin/viec-can-lam.js`. Khai hai nơi thì hai
 * báo cáo lệch nhau, và đó đúng là cách `_CHECKLIST.md` từng báo 100% trong khi 79% là vỏ rỗng.
 *
 * 🔴 Quy tắc phân loại (đọc file, 🚫 không chạy playwright):
 *   - có `expect(` **hoặc** `expect.poll(` / `expect.soft(` trong thân test ⇒ có phép kiểm;
 *     🚫 đừng chỉ tìm `expect(`: `await expect\n  .poll(...)` là dạng rất hay dùng và sẽ bị bỏ sót;
 *   - `… || true` trong `test.skip(...)` ⇒ skip VÔ ĐIỀU KIỆN, không bao giờ chạy;
 *   🚫 KHÔNG tính `test.skip(true, '…')` là vô điều kiện: các spec dùng đúng dạng đó để skip
 *      CÓ ĐIỀU KIỆN bên trong nhánh `if` ("dòng đầu không phải Pos mini thì bỏ qua"). Tính nhầm
 *      thì case có `expect` đầy đủ vẫn bị báo là vỏ rỗng — đã đo: 7 case của
 *      `01_quan_ly_diem_ban` bị xếp sai như vậy.
 *   - chỉ tính là script thật khi **có phép kiểm** và **không skip vô điều kiện**.
 *   Một mã nằm ở nhiều file thì chỉ cần MỘT chỗ thật là tính thật.
 */

const fs = require('node:fs');
const path = require('node:path');

const { CASE_ID_IN_TITLE } = require('./cases');

/**
 * Thân khối `{…}` bắt đầu từ dấu `{` đầu tiên kể từ `tu` — đếm ngoặc cân bằng.
 * Đủ cho mục đích ở đây: chỉ cần biết trong thân có `expect` hay không.
 */
function thanKhoi(src, tu) {
  const mo = src.indexOf('{', tu);
  if (mo < 0) return '';
  let sau = 0;
  for (let i = mo; i < src.length; i += 1) {
    if (src[i] === '{') sau += 1;
    else if (src[i] === '}') {
      sau -= 1;
      if (sau === 0) return src.slice(mo, i + 1);
    }
  }
  return src.slice(mo);
}

/**
 * 🔴 Tên các hàm khai TRONG CÙNG FILE mà thân có `expect`.
 *
 * Rất nhiều spec gom phép kiểm lặp lại vào một hàm trợ giúp rồi `test()` chỉ gọi hàm đó — xem
 * `boTrongMotO()` ở `02_quan_ly_nhan_vien/tests/validate-them-nhan-vien.tct.spec.js`. Chỉ soi thân
 * `test()` là 4 case có phép kiểm đầy đủ bị báo **vỏ rỗng**, và cách gom này là cách viết ĐƯỢC
 * KHUYẾN KHÍCH (tiêu đề vẫn phải viết nguyên văn để công cụ tìm được mã case).
 *
 * 🚫 Chỉ nhận hàm khai trong chính file đang quét — hàm nhập từ `*-page.js` là tiện ích thao tác
 *    (mở drawer, điền form), gọi nó 🚫 không có nghĩa là đã kiểm gì.
 */
function quetHamCoExpect(src) {
  const ten = new Set();
  const mau = [
    /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
  ];
  for (const re of mau) {
    for (const m of src.matchAll(re)) {
      let tu = m.index + m[0].length;
      // 🔴 `function chay(page, { dung, gio })` — `{` đầu tiên là tham số destructuring, 🚫 thân hàm.
      //    Mẫu `function` dừng ngay sau `(` ⇒ bỏ qua trọn danh sách tham số (đếm ngoặc) rồi mới tìm thân.
      //    Đo 26/09: 49 case 11_khuyen_mai gọi `chay(…)` bị báo vỏ rỗng vì lỗi này.
      if (src[tu - 1] === '(') {
        let sau = 1;
        while (tu < src.length && sau > 0) { if (src[tu] === '(') sau += 1; else if (src[tu] === ')') sau -= 1; tu += 1; }
      }
      // 🔴 Arrow một dòng `const choSl = (…) => expect.poll(…)` không có `{` — thân là biểu thức tới hết dòng.
      //    Đo 28/09: `18_1_030_012` chỉ gọi `choSl` nên bị báo vỏ rỗng.
      const sau = src.slice(tu).match(/^\s*(\S)/);
      const than = m[0].includes('=>') && sau && sau[1] !== '{' ? src.slice(tu, src.indexOf('\n', tu) + 1 || src.length) : thanKhoi(src, tu);
      if (/\bexpect\s*[.(]/.test(than)) ten.add(m[1]);
    }
  }
  return ten;
}

const goiHamCoPhepKiem = (than, ten) =>
  [...ten].some((t) => new RegExp(`\\b${t}\\s*\\(`).test(than));

/** Mã case dạng `04_3_060_001` · `03a_PQ_001` · `50_TT01_010` · `12-don-vi-van-tai_070_001`. */
const MA_CASE = /\b\d\d[a-z]?(?:-[a-z]+)*(?:_\d)?_(?:\d{3}|[A-Z]{2,}\d*)_\d{3}\b/g;

/**
 * Mã case của vòng lặp bao quanh `test()` ở vị trí `tu` — đọc từ đầu `for (…)` / `.forEach(`
 * tới đúng `)` đóng. Đầu vòng lặp chỉ là tên biến (`Object.entries(CASE)`) thì đọc thêm khối
 * khai `const CASE = …` trong cùng file.
 */
function maVongLap(src, tu) {
  const truoc = src.slice(0, tu);
  const mo = [...truoc.matchAll(/\bfor\s*\(|\.forEach\s*\(/g)].reverse();
  for (const m of mo) {
    const batDau = m.index + m[0].length - 1;
    let sau = 0;
    let dong = -1;
    for (let k = batDau; k < src.length; k += 1) {
      if (src[k] === '(') sau += 1;
      else if (src[k] === ')') { sau -= 1; if (sau === 0) { dong = k; break; } }
    }
    if (dong < 0) continue;
    // `.forEach(` bao cả thân ⇒ test phải nằm TRONG ngoặc; `for (…)` thì thân nằm sau `)`.
    const dauVong = m[0].startsWith('.') ? src.slice(m.index, tu) : src.slice(m.index, dong + 1);
    if (m[0].startsWith('.') && dong < tu) continue;
    if (!m[0].startsWith('.') && !thanKhoi(src, dong).includes(src.slice(tu, tu + 40))) continue;
    const ma = new Set(dauVong.match(MA_CASE) || []);
    if (!ma.size) {
      for (const [, ten] of dauVong.matchAll(/\b([A-Za-z_$][\w$]*)\b/g)) {
        const khai = src.match(new RegExp(`\\b(?:const|let|var)\\s+${ten}\\s*=\\s*`));
        if (!khai) continue;
        const k = khai.index + khai[0].length;
        const moNgoac = src[k];
        if (moNgoac !== '[' && moNgoac !== '{') continue;
        const dongNgoac = moNgoac === '[' ? ']' : '}';
        let s = 0;
        let e = k;
        for (; e < src.length; e += 1) {
          if (src[e] === moNgoac) s += 1;
          else if (src[e] === dongNgoac) { s -= 1; if (s === 0) break; }
        }
        for (const x of src.slice(k, e + 1).match(MA_CASE) || []) ma.add(x);
      }
    }
    return [...ma];
  }
  return [];
}

/**
 * `testMatch` của mọi project trong `playwright.config.js` của phân hệ; `null` = không đọc được
 * (khi đó không lọc). 🔴 File spec không khớp project nào thì Playwright KHÔNG BAO GIỜ chạy —
 * đếm nó là "script thật" là báo xanh cho thứ chưa ai chạy. Đo 28/09: 35 case (31 ở `18_2`)
 * chỉ nằm trong các spec cũ `*.playwright.spec.js` kiểu này.
 */
function mauChay(dir) {
  const f = path.join(dir, 'playwright.config.js');
  if (!fs.existsSync(f)) return null;
  try {
    const cfg = require(f);
    const mau = (cfg.projects || []).flatMap((p) => [].concat(p.testMatch || []));
    return mau.length ? mau : null;
  } catch {
    return null;
  }
}

function quetSpec(dir, sau = new Set([dir])) {
  const ids = new Set();
  const that = new Set();
  let files = 0;
  const mau = mauChay(dir);
  const duocChay = (ten) =>
    !mau || mau.some((m) => (m instanceof RegExp ? m.test(ten) : ten.includes(String(m).replace(/\*/g, ''))));

  const walk = (d, depth = 3) => {
    if (depth < 0 || !fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'test-output') continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) { walk(full, depth - 1); continue; }
      if (!/\.(spec|playwright)\.js$/.test(e.name)) continue;
      if (!duocChay(e.name)) continue;
      files += 1;
      const src = fs.readFileSync(full, 'utf8');
      // 🔴 Dùng ĐÚNG regex của `core/cases.js`. Bản lỏng hơn nhận nhầm chữ thường thành mã case.
      // 🔴 Thân chuỗi phải khớp tới ĐÚNG dấu nháy mở đầu, 🚫 không phải "ký tự nào khác mọi loại
      //    nháy": tên case hay chứa nháy kép bên trong nháy đơn —
      //    `test('01_010_028 - … không thấy nút "+ Thêm điểm bán"', …)`. Bản cũ dừng ở dấu `"` đó
      //    nên KHÔNG khớp được test nào trong cả file, và mọi case ở đó bị báo là vỏ rỗng dù đã
      //    viết đủ `expect`. Đo 22/09: riêng cách này làm lệch hàng trăm case.
      const hamCoExpect = quetHamCoExpect(src);
      const khop = [...src.matchAll(/\btest\s*(?:\.\w+)*\s*\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g)];
      for (let i = 0; i < khop.length; i += 1) {
        const id = (khop[i][2].match(CASE_ID_IN_TITLE) || [])[1];
        // 🔴 Tên dạng template `${id} — …` sinh từ vòng lặp: mã case nằm ở danh sách của `for`,
        //    🚫 không nằm trong tên. Bỏ qua là mọi case viết theo vòng lặp bị báo "chưa có test"
        //    dù thân có `expect` — đo 28/09: 168 case bị đếm sai như vậy.
        const dsMa = id ? [id] : /^\s*\$\{/.test(khop[i][2]) ? maVongLap(src, khop[i].index) : [];
        if (!dsMa.length) continue;
        const tu = khop[i].index;
        const den = i + 1 < khop.length ? khop[i + 1].index : src.length;
        const than = src.slice(tu, den);
        const coPhepKiem = /\bexpect\s*[.(]/.test(than) || goiHamCoPhepKiem(than, hamCoExpect);
        // 🔴 Chỉ tính `|| true` NẰM TRONG `test.skip(…)` — `[!dau, dau || true]` trong thân không phải skip.
        const skipVoDieuKien = /\btest\.skip\s*\([^;]*\|\|\s*true\b/.test(than);
        for (const ma of dsMa) {
          ids.add(ma);
          if (coPhepKiem && !skipVoDieuKien) that.add(ma);
        }
      }
    }
  };
  walk(dir);
  const trung = phuBoiPhanHeKhac(dir, that, sau);
  return { ids, that, files, trung };
}

/**
 * 🔴 Case user đã chốt là TRÙNG với case của phân hệ khác: `test-input.json` khai `trungVoi: "<mã case đích>"`.
 * Chỉ tính là đã phủ khi case đích là script thật ở phân hệ của nó (tra đệ quy, chặn vòng) — trỏ tới case vỏ
 * thì vẫn là vỏ. Không có cơ chế này thì case trùng bị đếm vỏ mãi mãi, hoặc phải viết lại script y hệt.
 */
function phuBoiPhanHeKhac(dir, that, sau) {
  const trung = new Map();
  const f = path.join(dir, 'test-input.json');
  if (!fs.existsSync(f)) return trung;
  let cases = {};
  try { cases = JSON.parse(fs.readFileSync(f, 'utf8')).cases || {}; } catch { return trung; }
  const goc = path.dirname(dir);
  for (const [id, c] of Object.entries(cases)) {
    const dich = c?.trungVoi;
    if (!dich || that.has(id)) continue;
    const thuMuc = fs.readdirSync(goc).filter((d) => dich.startsWith(`${d.split('_')[0]}_`) || dich.startsWith(d))
      .map((d) => path.join(goc, d)).find((d) => fs.existsSync(path.join(d, 'test-input.json')) && JSON.parse(fs.readFileSync(path.join(d, 'test-input.json'), 'utf8')).cases?.[dich]);
    if (!thuMuc || sau.has(thuMuc)) continue;
    sau.add(thuMuc);
    const ok = quetSpec(thuMuc, sau).that.has(dich);
    sau.delete(thuMuc);
    if (ok) { that.add(id); trung.set(id, dich); }
  }
  return trung;
}

module.exports = { quetSpec };
