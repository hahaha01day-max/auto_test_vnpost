#!/usr/bin/env node
'use strict';

/**
 * Sinh `tai-lieu-test/_CHECKLIST.md` — tiến độ hoàn thiện script auto test theo từng phân hệ.
 *
 * 🔴 File checklist KHÔNG viết tay. Viết tay là vài tuần sau số liệu lệch thực tế mà không ai biết:
 * người đọc vẫn tin bảng, trong khi module đã thêm case hoặc spec đã bị xoá.
 * Chạy lại: `node tool/bin/checklist.js`
 *
 * Cách đếm — 🚫 KHÔNG gọi `playwright --list` (48 module × ~0,5s và cần cả môi trường chạy được):
 * chỉ đọc file. Mã case nhận từ ĐẦU title `test('<mã> - ...')`, đúng quy ước ở `core/cases.js`.
 */

const fs = require('node:fs');
const path = require('node:path');

const { listModules, TEST_ROOT, PROJECT_ROOT } = require('../core/modules');
const { parseCsv } = require('../core/cases');
const { quetSpec } = require('../core/specs');
const goc = require('../core/goc');
const { phanHeCho } = require('../core/goc-mapping');

const OUT_FILE = path.join(TEST_ROOT, '_CHECKLIST.md');

/** Case QC đã xoá (cột `Trang thai QC` = QC_XOA, ghi bởi dong-bo-tu-qc.js) — không đếm vào checklist. */
function laQcXoa(head, r) {
  const i = head.indexOf('Trang thai QC');
  return i >= 0 && String(r[i] || '').trim() === 'QC_XOA';
}

/** Mã case khai trong tài liệu. */
function csvCaseIds(mod) {
  if (!mod.csvPath) return [];
  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  if (rows.length < 2) return [];
  return rows.slice(1).filter((r) => !laQcXoa(rows[0], r)).map((r) => (r[0] || '').trim()).filter(Boolean);
}

/**
 * Kết quả chạy thật theo cột `Trang thai chay` của `test-cases.csv` — cột do
 * `tool/bin/cap-nhat-trang-thai.js` ghi từ `results.json` sau mỗi lượt chạy.
 *
 * 🔴 `Chưa chạy` = MỌI dòng không phải `Đạt`/`Không đạt`: gồm ô rỗng (chưa từng chạy), `Chưa chạy`
 * (skip) và giá trị lạ. Phân hệ chưa có cột ⇒ toàn bộ là chưa chạy, 🚫 không báo 0/0/0 — nhìn như "không có case".
 * Đếm theo DÒNG của CSV, cùng mẫu số với cột `Kịch bản`.
 */
function ketQuaChay(mod) {
  const kq = { dat: 0, khongDat: 0, chuaChay: 0, coCot: false };
  if (!mod.csvPath) return kq;
  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  if (rows.length < 2) return kq;
  const i = rows[0].indexOf('Trang thai chay');
  kq.coCot = i >= 0;
  for (const r of rows.slice(1)) {
    if (!(r[0] || '').trim() || laQcXoa(rows[0], r)) continue;
    const v = i >= 0 ? String(r[i] || '').trim() : '';
    if (v === 'Đạt') kq.dat += 1;
    else if (v === 'Không đạt') kq.khongDat += 1;
    else kq.chuaChay += 1;
  }
  return kq;
}

/** Đếm case bật/tắt trong test-input.json. */
function inputStats(dir) {
  const file = path.join(dir, 'test-input.json');
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const cases = Object.values(parsed.cases || {});
    return {
      total: cases.length,
      blocked: cases.filter((c) => c.enabled === false).length,
      mutates: cases.filter((c) => c.mutates === true).length,
      allowed: cases.filter((c) => c.mutates === true && c.allowMutation === true).length,
    };
  } catch {
    return { total: 0, blocked: 0, mutates: 0, allowed: 0, loi: true };
  }
}

function pct(a, b) {
  return b === 0 ? 0 : Math.round((a / b) * 100);
}

/**
 * Độ phủ TÀI LIỆU GỐC theo phân hệ: sheet QC có bao nhiêu case, đã phủ bao nhiêu, còn thiếu bao nhiêu.
 *
 * 🔴 Vì sao gộp vào đây thay vì để riêng: nhãn "✅ đủ script" chỉ nói mọi case ĐÃ KHAI đều có spec.
 * `12_3_cong_no_nha_cung_cap` khai 1 case, case đó có script ⇒ ✅ — trong khi sheet QC có 68 case.
 * Không đặt hai con số cạnh nhau thì bảng này đánh lừa người đọc.
 */
function doPhuGoc() {
  const theoModule = new Map();
  for (const file of goc.danhSachFile()) {
    const r = goc.docCaFile(file);
    if (r.loi) continue;
    const trung = new Set();
    for (const nhom of goc.timTrungLap(r.cases)) nhom.slice(1).forEach((c) => trung.add(c.maKhoa));
    for (const c of r.cases) {
      const { module } = phanHeCho(file, c.nhom);
      if (!module) continue;
      if (!theoModule.has(module)) theoModule.set(module, { tong: 0, ma: new Set(), trung: new Set(), dong: [] });
      const o = theoModule.get(module);
      o.tong += 1;
      o.ma.add(c.maKhoa);
      if (trung.has(c.maKhoa)) o.trung.add(c.maKhoa);
      // 🔴 Đếm theo DÒNG, không theo MÃ: sheet QC có chỗ dùng một mã cho hai case khác nhau
      // (đo: `uat_vnpost_quan_ly_kho.csv` dùng `FUNC_1_142` và `FUNC_1_459` mỗi mã hai lần).
      // Lấy `ma.size` làm tử số thì hai case đã dựng vẫn bị báo là thiếu.
      o.dong.push({ ma: c.maKhoa, laBanTrung: trung.has(c.maKhoa) });
    }
  }
  return theoModule;
}

/** Mã gốc mà phân hệ đã khai trong cột `Ma goc` (một ô có thể chứa nhiều mã, ngăn bằng `;`). */
function maGocDaKhai(mod) {
  if (!mod.csvPath || !fs.existsSync(mod.csvPath)) return null;
  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  const i = rows[0].indexOf('Ma goc');
  if (i < 0) return null;
  const ra = new Set();
  for (const r of rows.slice(1)) {
    for (const x of String(r[i] || '').split(';')) {
      const ma = (x.includes('#') ? x.split('#').pop() : x).trim();
      if (ma) ra.add(ma);
    }
  }
  return ra;
}

function main() {
  const rows = [];
  const phuGoc = doPhuGoc();

  // 🔴 `00_seed` không phải phân hệ kiểm thử: nó là bộ SINH DỮ LIỆU NỀN, không có `test-cases.csv`
  //    và không mang mã case nào ⇒ để trong bảng thì nó hiện "⬜ chưa có kịch bản" và làm mẫu số
  //    phân hệ lệch (48/49).
  for (const mod of listModules().filter((m) => m.id !== '00_seed')) {
    const docIds = csvCaseIds(mod);
    const { ids: coded, that: codedThat, files } = quetSpec(mod.dir);
    const daCoScript = docIds.filter((id) => coded.has(id));
    const scriptThat = docIds.filter((id) => codedThat.has(id));
    // Spec mang mã không có trong CSV = case mồ côi, tài liệu chưa khai.
    const moCoi = [...coded].filter((id) => !docIds.includes(id));
    const input = inputStats(mod.dir);
    const chay = ketQuaChay(mod);

    const g = phuGoc.get(mod.id);
    const daKhai = maGocDaKhai(mod);
    const gocTong = g ? g.tong : 0;
    // Trừ bản trùng trong chính sheet — đã dựng một bản là đủ.
    const dongThat = g ? g.dong.filter((d) => !d.laBanTrung) : [];
    const gocPhu = g && daKhai ? dongThat.filter((d) => daKhai.has(d.ma)).length : 0;
    const gocThieu = g ? Math.max(0, dongThat.length - gocPhu) : 0;

    rows.push({
      id: mod.id,
      doc: docIds.length,
      script: daCoScript.length,
      that: scriptThat.length,
      vo: daCoScript.length - scriptThat.length,
      moCoi: moCoi.length,
      files,
      input,
      phanTram: pct(scriptThat.length, docIds.length),
      gocTong,
      gocPhu,
      gocThieu,
      coMaGoc: daKhai !== null,
      chay,
    });
  }

  const tongDoc = rows.reduce((s, r) => s + r.doc, 0);
  const tongScript = rows.reduce((s, r) => s + r.script, 0);
  const tongThat = rows.reduce((s, r) => s + r.that, 0);
  const tongVo = rows.reduce((s, r) => s + r.vo, 0);
  const tongMoCai = rows.reduce((s, r) => s + r.moCoi, 0);
  const coBatGhi = rows.filter((r) => r.input && r.input.allowed > 0);
  const tongDat = rows.reduce((s, r) => s + r.chay.dat, 0);
  const tongKhongDat = rows.reduce((s, r) => s + r.chay.khongDat, 0);
  const tongChuaChay = rows.reduce((s, r) => s + r.chay.chuaChay, 0);

  // 🔴 Trạng thái tính theo SCRIPT THẬT, 🚫 không theo `r.script`: đếm cả vỏ rỗng thì phân hệ
  //    48/50 case là vỏ vẫn hiện "✅ đủ script".
  const trangThai = (r) => {
    if (r.doc === 0) return '⬜ chưa có kịch bản';
    if (r.that === 0) return r.vo > 0 ? `📝 toàn vỏ rỗng (${r.vo} case)` : '📝 có kịch bản, chưa có script';
    if (r.that < r.doc) return `🔧 đang viết script (${r.phanTram}%)`;
    return '✅ đủ script';
  };

  let md = `# Checklist tiến độ auto test

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: \`node tool/bin/checklist.js\`
> Cập nhật: ${new Date().toISOString().slice(0, 10).split('-').reverse().join('/')}

- **Kịch bản đã khai:** ${tongDoc} case ở ${rows.filter((r) => r.doc > 0).length}/${rows.length} phân hệ
- **Script THẬT** (có phép kiểm, không skip vô điều kiện): ${tongThat} case (**${pct(tongThat, tongDoc)}%**)
- 🔴 **Vỏ rỗng** (\`test.skip\` cứng, không một phép kiểm nào): ${tongVo} case (**${pct(tongVo, tongDoc)}%**) — \`chua-chay-duoc*.spec.js\`
- Tổng có mã trong spec (thật + vỏ): ${tongScript}
- **Case mồ côi** (có spec, tài liệu chưa khai): ${tongMoCai}
- **Kết quả chạy thật:** ✅ Đạt ${tongDat} (**${pct(tongDat, tongDoc)}%**) · ❌ Không đạt ${tongKhongDat} (**${pct(tongKhongDat, tongDoc)}%**) · ⏸ Chưa chạy ${tongChuaChay} (**${pct(tongChuaChay, tongDoc)}%**) — cột \`Trang thai chay\` của \`test-cases.csv\`, ghi bằng \`node tool/bin/cap-nhat-trang-thai.js <phân hệ>\` sau mỗi lượt chạy
- **Tài liệu gốc (19 sheet QC):** ${rows.reduce((s, r) => s + r.gocTong, 0)} case — đã phủ ${rows.reduce((s, r) => s + r.gocPhu, 0)}, **còn thiếu ${rows.reduce((s, r) => s + r.gocThieu, 0)}**
- 🔴 **Vì sao từng case chưa xong + ai gỡ + đã xử lý tới đâu:** \`_VUONG_MAC.md\` (sổ ghi tay) — đọc trước khi khảo sát lại

## Cách đọc

| Cột | Nghĩa |
|---|---|
| \`Kịch bản\` | số dòng trong \`test-cases.csv\` |
| \`Script thật\` | case có \`expect(\` và **không** \`test.skip\` vô điều kiện — thật sự kiểm được gì |
| \`Vỏ rỗng\` | 🔴 case chỉ có dòng \`test.skip(... \|\| true)\`, chạy xong **luôn xanh mà không kiểm gì** |
| \`Mồ côi\` | spec có mã mà CSV chưa khai — 🔴 tài liệu đang thiếu, không phải script thừa |
| \`Đạt\` / \`Không đạt\` | kết quả lượt chạy GẦN NHẤT của từng case (cột \`Trang thai chay\`) |
| \`Chưa chạy\` | case chưa từng chạy, bị skip, hoặc phân hệ chưa ghi kết quả (\`*\` = CSV chưa có cột \`Trang thai chay\`) |
| \`Input\` | số case trong \`test-input.json\`; \`tắt\` = \`enabled:false\` (BLOCKED) |
| \`Ghi\` | số case \`mutates:true\`; \`(N bật)\` = còn \`allowMutation:true\` |
| \`Case gốc\` | số case của phân hệ này trong 19 sheet QC ở \`test-case-goc/\` |
| \`Đã phủ\` | số case gốc đã được khai ở cột \`Ma goc\` |
| \`Còn thiếu\` | 🔴 **việc phải làm cho TÀI LIỆU** — đã trừ các bản trùng trong chính sheet |
| \`—\` ở ba cột cuối | sheet QC không phủ phân hệ này; việc duy nhất là quét kỹ thuật mục 3.4 của skill |

| Phân hệ | Kịch bản | Script thật | Vỏ rỗng | Mồ côi | File spec | Input | Ghi | Trạng thái | ✅ Đạt | ❌ Không đạt | ⏸ Chưa chạy | Case gốc | Đã phủ | **Còn thiếu** |
|---|--:|--:|--:|--:|--:|---|---|---|--:|--:|--:|--:|--:|--:|
`;

  for (const r of rows) {
    const inp = r.input ? `${r.input.total} (${r.input.blocked} tắt)` : '—';
    const ghi = r.input
      ? r.input.mutates === 0
        ? '—'
        : `${r.input.mutates}${r.input.allowed > 0 ? ` (🔴 ${r.input.allowed} bật)` : ''}`
      : '—';
    const gocCot = r.gocTong === 0
      ? '— | — | —'
      : `${r.gocTong} | ${r.gocPhu} | ${r.gocThieu ? `**${r.gocThieu}**` : '✅ 0'}`;
    const c = r.chay;
    const chayCot = r.doc === 0
      ? '— | — | —'
      : `${c.dat || ''} | ${c.khongDat ? `**${c.khongDat}**` : ''} | ${c.chuaChay || ''}${c.coCot ? '' : '*'}`;
    md += `| \`${r.id}\` | ${r.doc} | ${r.that} | ${r.vo ? `**${r.vo}**` : ''} | ${r.moCoi || ''} | ${r.files || ''} | ${inp} | ${ghi} | ${trangThai(r)} | ${chayCot} | ${gocCot} |\n`;
  }

  md += `
## 🔴 Phân hệ còn cho phép ghi dữ liệu thật

${
    coBatGhi.length === 0
      ? 'Không có — mọi case `mutates` đều đang `allowMutation: false`.'
      : coBatGhi
          .map((r) => `- \`${r.id}\` — ${r.input.allowed} case đang bật \`allowMutation\``)
          .join('\n')
  }

## Việc tiếp theo, theo thứ tự

1. Phân hệ **⬜ chưa có kịch bản** → chạy skill \`test-scenario\`.
2. Phân hệ **📝 có kịch bản, chưa có script** → chạy skill \`auto-test\`.
3. Phân hệ có **case mồ côi** → bổ sung dòng vào \`test-cases.csv\` cho khớp spec đã có.

🚫 Đừng đọc cột \`Script thật\` như độ phủ chất lượng: nó chỉ nói case có **ít nhất một** \`expect\`,
không nói phép kiểm đó đo đúng nghiệp vụ.

🔴 Cột **Vỏ rỗng** là case đã khai, đã có tên trong spec, nhưng **chưa có thao tác nào** — phần lớn là
case GHI (thêm/sửa/xoá) để trống có chủ ý vì môi trường test không có dữ liệu nền. Gỡ bằng bộ seed
\`tai-lieu-test/00_seed\` rồi viết thao tác vào chính các case đó.

🔴 Và đừng đọc **✅ đủ script** như "phân hệ đã xong": nó chỉ so với số case ĐÃ KHAI. Nhìn cột
**Còn thiếu** mới biết tài liệu còn nợ bao nhiêu.
`;

  fs.writeFileSync(OUT_FILE, md);
  console.log(`Đã ghi ${path.relative(PROJECT_ROOT, OUT_FILE)}`);
  console.log(
    `  ${tongDoc} case kịch bản · ${tongThat} script thật (${pct(tongThat, tongDoc)}%) · `
      + `${tongVo} vỏ rỗng (${pct(tongVo, tongDoc)}%) · ${tongMoCai} mồ côi · `
      + `chạy: ${tongDat} đạt / ${tongKhongDat} không đạt / ${tongChuaChay} chưa chạy`,
  );
}

main();
