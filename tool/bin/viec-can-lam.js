#!/usr/bin/env node
'use strict';

/**
 * Sinh `tai-lieu-test/_VIEC_CAN_LAM.md` — **việc còn phải làm** để 2472 case vỏ rỗng có phép kiểm.
 *
 * 🔴 Khác `_CHECKLIST.md`: file kia nói *còn bao nhiêu*, file này nói *làm gì trước và vì sao
 * chưa làm được*. Không có nó thì thứ tự làm phụ thuộc trí nhớ, và case bị chặn lẫn case viết
 * được ngay nằm chung một đống.
 *
 * 🚫 KHÔNG viết tay. Chạy lại: `node tool/bin/viec-can-lam.js`
 *
 * Phân loại mỗi case vỏ rỗng:
 *   SẴN SÀNG     — `enabled: true`, đủ input ⇒ viết phép kiểm được ngay.
 *   THIẾU INPUT  — `enabled: true` nhưng `data` còn khoá rỗng ⇒ rót giá trị từ sổ seed trước.
 *   KHOÁ GHI     — `mutates: true` và `allowMutation: false` ⇒ phải bật cờ mới chạy được.
 *   TẮT          — `enabled: false` kèm `_blocked` ⇒ đọc lý do trước khi đụng vào.
 */

const fs = require('node:fs');
const path = require('node:path');

const { listModules, TEST_ROOT, PROJECT_ROOT } = require('../core/modules');
const { parseCsv } = require('../core/cases');
const { quetSpec } = require('../core/specs');
const { docSo } = require('../core/seed');

const OUT_FILE = path.join(TEST_ROOT, '_VIEC_CAN_LAM.md');

function docCsvIds(mod) {
  if (!mod.csvPath || !fs.existsSync(mod.csvPath)) return [];
  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  if (rows.length < 2) return [];
  return rows.slice(1).map((r) => (r[0] || '').trim()).filter(Boolean);
}

function docInput(dir) {
  const f = path.join(dir, 'test-input.json');
  if (!fs.existsSync(f)) return { cases: {}, note: '' };
  try {
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return { cases: j.cases || {}, note: (j._note || '').trim() };
  } catch {
    return { cases: {}, note: '' };
  }
}

/**
 * Lý do một case bị tắt — 🔴 nằm ở BA chỗ, 🚫 đừng chỉ đọc `_blocked`:
 *   1. `_blocked` của chính case;
 *   2. `blockedReason` của chính case (**tên khoá khác**, 164 case dùng nó);
 *   3. `_note` cấp file, áp cho mọi case `mutates` của phân hệ (375 case dựa vào nó).
 * Chỉ đọc `_blocked` thì 539 case hiện ra là "tắt mà không ai biết vì sao" — đã báo cáo nhầm
 * đúng như vậy một lần (22/09/2026).
 */
function lyDoTat(c, note) {
  return (c?._blocked || '').trim() || (c?.blockedReason || '').trim() || note || '';
}

/** Vì sao tắt: rủi ro nghiệp vụ · thiếu dữ liệu nền · hạn chế kỹ thuật · chưa chốt kỳ vọng. */
function nhomLyDo(ly) {
  if (!ly) return 'KHÔNG RÕ';
  if (/SDK|OTP|SMS|thiết bị|may in|máy in|quét mã|camera/i.test(ly)) return 'HẠN CHẾ KỸ THUẬT';
  if (/chưa chốt|chưa rõ|chưa biết|cần user chốt/i.test(ly)) return 'CHƯA CHỐT KỲ VỌNG';
  if (/chưa có dữ liệu nền|cần có|cần phiếu|cần đơn|cần hoá đơn|cần sản phẩm|cần nhân viên|cần tài khoản|cần PO|dựng sẵn/i.test(ly)) {
    return 'THIẾU DỮ LIỆU NỀN';
  }
  // 🔴 Bắt cả dạng viết tắt "🔴 GHI: …" — phần lớn lý do dùng dạng này, bỏ sót là 483 case rơi
  //    nhầm vào nhóm "KHÁC" và trông như chưa ai phân loại.
  if (/\bGHI\b|thật|không hoàn tác|không gỡ|một chiều|không mở lại|trừ tồn|ghi tiền|bút toán/i.test(ly)) {
    return 'RỦI RO GHI THẬT';
  }
  return 'KHÁC';
}

/** Khoá trong `data` chưa có giá trị — đây chính là thứ bộ seed phải rót vào. */
function khoaThieu(c) {
  const d = c?.data || {};
  return Object.entries(d)
    .filter(([, v]) => v === '' || v === null || v === undefined)
    .map(([k]) => k);
}

function phanLoai(c) {
  if (!c) return 'SAN_SANG';
  // 🔴 Đã biết cần TIỀN ĐỀ gì (khai `canSeed` / `canTienDe`) ⇒ tách riêng khỏi TẮT, in lệnh dựng.
  if (c.canSeed || c.canTienDe) return 'CHO_TIEN_DE';
  if (c.enabled === false) return 'TAT';
  if (c.mutates === true && c.allowMutation !== true) return 'KHOA_GHI';
  if (khoaThieu(c).length) return 'THIEU_INPUT';
  return 'SAN_SANG';
}

/**
 * Tiền đề khai trong `test-input.json` (quy ước 28/09/2026, xem skill auto-test mục "Thiếu dữ liệu nền"):
 *   `canSeed: "<tên bước>"`   — dữ liệu NHIỀU phân hệ cần ⇒ một bước ở `00_seed/{tests,api-tests}/NN-<tên bước>.*.spec.js`.
 *   `canTienDe: "<tên test>"` — dữ liệu riêng phân hệ ⇒ một `test('<tên test> — …')` trong spec `tien-de.*` của phân hệ,
 *                               chạy với `VNPOST_TIEN_DE=1`.
 * Trả { loai, ten, coSan, lenh } — `coSan=false` nghĩa là bước/spec tiền đề CHƯA được viết.
 */
function tienDe(mod, c) {
  const seedDir = path.join(TEST_ROOT, '00_seed');
  if (c.canSeed) {
    const f = ['tests', 'api-tests'].flatMap((d) => (fs.existsSync(path.join(seedDir, d)) ? fs.readdirSync(path.join(seedDir, d)).map((x) => `${d}/${x}`) : []))
      .find((x) => x.includes(c.canSeed));
    const buoc = f ? (path.basename(f).match(/^(\d+)/) || [])[1] : null;
    return { loai: 'seed', ten: c.canSeed, coSan: Boolean(f), lenh: f ? `VNPOST_LANE=<làn> node tool/bin/seed.js${f.startsWith('api') ? ' --api' : ''} --buoc=${buoc}` : '🔴 chưa có bước seed — phải viết' };
  }
  const tDir = path.join(mod.dir, 'tests');
  const coSan = fs.existsSync(tDir) && fs.readdirSync(tDir).filter((x) => /\.js$/.test(x))
    .some((x) => fs.readFileSync(path.join(tDir, x), 'utf8').includes(`'${c.canTienDe}`));
  return { loai: 'tiền đề phân hệ', ten: c.canTienDe, coSan,
    lenh: coSan ? `VNPOST_TIEN_DE=1 VNPOST_LANE=<làn> npx playwright test --config tai-lieu-test/${mod.id}/playwright.config.js -g "${c.canTienDe}"` : '🔴 chưa có spec tiền đề — phải viết' };
}

function main() {
  const so = docSo();
  const giaTriSeed = new Set();
  for (const nhom of Object.values(so.duLieu || {})) {
    for (const [k, v] of Object.entries(nhom || {})) {
      if (v !== '' && v !== null && v !== undefined) giaTriSeed.add(k);
    }
  }

  const rows = [];
  const choTienDe = new Map(); // tên tiền đề → { td, mod, ids[] }
  const demKhoa = new Map();
  const demLyDo = new Map();

  for (const mod of listModules().filter((m) => m.id !== '00_seed')) {
    const docIds = docCsvIds(mod);
    if (!docIds.length) continue;
    const { ids, that } = quetSpec(mod.dir);
    const { cases: input, note } = docInput(mod.dir);

    const vo = docIds.filter((id) => !that.has(id));
    // 🔴 Tách "chưa có test nào" khỏi "vỏ rỗng": `_CHECKLIST.md` chỉ đếm case ĐÃ có tên trong
    //    spec, nên không tách thì hai file lệch nhau vài case và người đọc mất lòng tin vào cả hai.
    const chuaCoTest = docIds.filter((id) => !ids.has(id)).length;
    const dem = { SAN_SANG: 0, THIEU_INPUT: 0, KHOA_GHI: 0, CHO_TIEN_DE: 0, TAT: 0 };
    const khoaCuaModule = new Map();

    for (const id of vo) {
      const c = input[id];
      const loai = phanLoai(c);
      dem[loai] += 1;
      if (loai === 'CHO_TIEN_DE') {
        const td = tienDe(mod, c);
        const k = `${td.loai}|${td.ten}`;
        if (!choTienDe.has(k)) choTienDe.set(k, { td, mod: mod.id, ids: [] });
        choTienDe.get(k).ids.push(id);
      }
      if (loai === 'TAT') {
        const n = nhomLyDo(lyDoTat(c, note));
        demLyDo.set(n, (demLyDo.get(n) || 0) + 1);
      }
      for (const k of khoaThieu(c)) {
        khoaCuaModule.set(k, (khoaCuaModule.get(k) || 0) + 1);
        demKhoa.set(k, (demKhoa.get(k) || 0) + 1);
      }
    }

    rows.push({
      id: mod.id,
      tong: docIds.length,
      that: docIds.length - vo.length,
      vo: vo.length,
      chuaCoTest,
      ...dem,
      khoa: [...khoaCuaModule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    });
  }

  // Ưu tiên: làm trước phân hệ có nhiều case SẴN SÀNG nhất — đổi công ít nhất lấy nhiều case nhất.
  const theoSanSang = [...rows].sort((a, b) => b.SAN_SANG - a.SAN_SANG);
  const tong = (k) => rows.reduce((s, r) => s + r[k], 0);

  const ngay = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');
  let md = `# Việc cần làm — viết phép kiểm cho case vỏ rỗng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: \`node tool/bin/viec-can-lam.js\`
> Cập nhật: ${ngay}

Case **vỏ rỗng** = đã khai trong \`test-cases.csv\`, đã có tên trong spec, nhưng thân test 🚫 không có
một \`expect\` nào (hoặc \`test.skip\` vô điều kiện) — chạy xong **luôn xanh mà không kiểm gì**.

| Nhóm | Số case | Nghĩa |
|---|--:|---|
| **SẴN SÀNG** | **${tong('SAN_SANG')}** | \`enabled: true\`, đủ input ⇒ **viết được ngay** |
| THIẾU INPUT | ${tong('THIEU_INPUT')} | còn khoá rỗng trong \`data\` ⇒ rót giá trị từ sổ seed trước |
| KHOÁ GHI | ${tong('KHOA_GHI')} | \`mutates: true\` + \`allowMutation: false\` ⇒ phải bật cờ |
| CHỜ TIỀN ĐỀ | ${tong('CHO_TIEN_DE')} | đã khai \`canSeed\` / \`canTienDe\` ⇒ dựng dữ liệu theo lệnh ở mục "Chờ tiền đề" rồi viết script |
| TẮT | ${tong('TAT')} | \`enabled: false\` — xem bảng lý do bên dưới |
| **Tổng** | **${tong('vo')}** | trên tổng ${tong('tong')} case đã khai |

Trong đó **${tong('chuaCoTest')}** case còn chưa có một \`test()\` nào mang mã — số còn lại
(${tong('vo') - tong('chuaCoTest')}) đúng bằng cột **Vỏ rỗng** của \`_CHECKLIST.md\`.

🔴 Con số **SẴN SÀNG** là thứ đáng nhìn nhất: đó là việc làm được ngay hôm nay, 🚫 không chờ ai.

## Chờ tiền đề — ${tong('CHO_TIEN_DE')} case

Mỗi dòng là MỘT tiền đề; dựng xong thì các case trong dòng viết/chạy được. 🔴 Cột "Lệnh" báo *chưa có* nghĩa là
bước seed / spec tiền đề đó chưa ai viết — viết nó trước (khuôn: \`00_seed/README.md\`, \`19_quan_ly_khach_hang/tests/tien-de.gdv.spec.js\`).

| Loại | Tiền đề | Phân hệ | Case | Lệnh |
|---|---|---|---|---|
${[...choTienDe.values()].map((x) => `| ${x.td.loai} | \`${x.td.ten}\` | \`${x.mod}\` | ${x.ids.map((i) => `\`${i}\``).join(' ')} | ${x.td.coSan ? `\`${x.td.lenh}\`` : x.td.lenh} |`).join('\n') || '| — | — | — | — | — |'}

## Vì sao ${tong('TAT')} case đang TẮT

🔴 Lý do nằm ở **ba** chỗ: \`_blocked\` của case · \`blockedReason\` của case · \`_note\` cấp file.
🚫 Chỉ đọc \`_blocked\` là kết luận nhầm "tắt mà không ai biết vì sao".

| Nhóm lý do | Số case | Gỡ bằng cách nào |
|---|--:|---|
${[...demLyDo.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => {
    const cach = {
      'RỦI RO GHI THẬT': '🔴 **cần user quyết** — ghi tiền / tồn / chứng từ thật, nhiều thứ không hoàn tác',
      'THIẾU DỮ LIỆU NỀN': 'seed thêm dữ liệu rồi chạy `bat-case-seed-phu.js`',
      'HẠN CHẾ KỸ THUẬT': '🚫 không tự động hoá được (SDK bên thứ ba, OTP qua SMS, thiết bị phần cứng)',
      'CHƯA CHỐT KỲ VỌNG': 'hỏi nghiệp vụ để chốt kỳ vọng trước khi viết assert',
      'KHÔNG RÕ': '🔴 phải rà tay',
      KHÁC: 'đọc lý do từng case',
    }[n] || 'đọc lý do từng case';
    return `| ${n} | ${c} | ${cach} |`;
  }).join('\n')}

## Thứ tự đề nghị — nhiều case SẴN SÀNG nhất trước

| # | Phân hệ | Sẵn sàng | Thiếu input | Khoá ghi | Tắt | Vỏ rỗng | Script thật |
|--:|---|--:|--:|--:|--:|--:|--:|
`;
  theoSanSang.slice(0, 15).forEach((r, i) => {
    md += `| ${i + 1} | \`${r.id}\` | **${r.SAN_SANG}** | ${r.THIEU_INPUT} | ${r.KHOA_GHI} | ${r.TAT} | ${r.vo} | ${r.that} |\n`;
  });

  md += `
## Toàn bộ phân hệ

| Phân hệ | Tổng case | Script thật | Vỏ rỗng | Sẵn sàng | Thiếu input | Khoá ghi | Tắt | Khoá dữ liệu thiếu nhiều nhất |
|---|--:|--:|--:|--:|--:|--:|--:|---|
`;
  for (const r of rows) {
    const k = r.khoa.length
      ? r.khoa.map(([n, c]) => `${n}(${c})`).join(' · ')
      : '—';
    md += `| \`${r.id}\` | ${r.tong} | ${r.that} | ${r.vo} | ${r.SAN_SANG} | ${r.THIEU_INPUT} | ${r.KHOA_GHI} | ${r.TAT} | ${k} |\n`;
  }

  const khoaSap = [...demKhoa.entries()].sort((a, b) => b[1] - a[1]);
  md += `
## Khoá dữ liệu đang thiếu — bộ seed đã có chưa

Sổ seed: \`tai-lieu-test/00_seed/seed-state.json\` (lượt ${so.runId || '—'}).
Cột **Seed có** = sổ đã có khoá cùng tên; 🔴 không có nghĩa là phải seed thêm hoặc khai tay.

| Khoá | Số case chờ | Seed có |
|---|--:|---|
`;
  for (const [k, c] of khoaSap.slice(0, 30)) {
    md += `| \`${k}\` | ${c} | ${giaTriSeed.has(k) ? '✅' : '🔴 chưa'} |\n`;
  }

  md += `
## Cách làm một phân hệ

1. Đọc \`<phân hệ>/test-cases.md\` để biết route và API thật của từng task.
2. Mở \`chua-chay-duoc*.spec.js\` — mỗi case vỏ rỗng là một \`test()\` chỉ có \`chanNeuTat(id)\`.
3. Viết thao tác + \`expect\` vào case **SẴN SÀNG** trước; case ghi thì lấy dữ liệu từ sổ seed,
   🚫 đừng tạo dữ liệu mới trong spec kiểm thử.
4. Chạy lại \`node tool/bin/checklist.js\` và \`node tool/bin/viec-can-lam.js\` để thấy tiến độ thật.

🚫 **Đừng để case chạy xong mà không kiểm gì** — đó chính là cách 2472 case này ra đời.
`;

  fs.writeFileSync(OUT_FILE, md);
  console.log(`Đã ghi ${path.relative(PROJECT_ROOT, OUT_FILE)}`);
  console.log(
    `  vỏ rỗng ${tong('vo')} · sẵn sàng ${tong('SAN_SANG')} · thiếu input ${tong('THIEU_INPUT')} · `
      + `khoá ghi ${tong('KHOA_GHI')} · chờ tiền đề ${tong('CHO_TIEN_DE')} · tắt ${tong('TAT')}`,
  );
}

main();
