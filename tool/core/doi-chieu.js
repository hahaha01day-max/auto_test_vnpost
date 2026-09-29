'use strict';

/**
 * PHÉP TÍNH ĐỘ PHỦ TÀI LIỆU GỐC — nguồn sự thật DUY NHẤT.
 *
 * 🔴 Vì sao tách ra đây: `bin/doi-chieu-goc.js` và `bin/checklist.js` từng tự tính riêng và cho
 * HAI con số khác nhau cho cùng một thứ (330/1181 vs 326/1251). Người đọc không biết tin cái nào,
 * và không có cách nào nhận ra sai ngoài việc tình cờ đặt hai file cạnh nhau. Mọi nơi cần số độ phủ
 * đều phải gọi hàm ở đây, 🚫 không tự cộng lại.
 */

const fs = require('node:fs');

const { parseCsv } = require('./cases');
const goc = require('./goc');
const { phanHeCho } = require('./goc-mapping');

/** Tách ô `Ma goc` thành danh sách mã: chấp nhận `A;B` và `file.csv#A`. */
function tachMaGoc(o) {
  return String(o || '')
    .split(';')
    .map((x) => (x.includes('#') ? x.split('#').pop() : x).trim())
    .filter(Boolean);
}

/** Mã gốc phân hệ đã khai. Trả `null` khi `test-cases.csv` chưa có cột `Ma goc`. */
function maGocDaKhai(mod) {
  if (!mod.csvPath || !fs.existsSync(mod.csvPath)) return null;
  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  const i = rows[0].indexOf('Ma goc');
  if (i < 0) return null;

  const ra = new Set();
  for (const r of rows.slice(1)) for (const ma of tachMaGoc(r[i])) ra.add(ma);
  return ra;
}

/**
 * Gom case gốc theo phân hệ.
 * @returns {{theoModule: Map<string, Array>, chuaGan: Array, thongTinFile: Array}}
 */
function gomCaseGoc() {
  const theoModule = new Map();
  const chuaGan = [];
  const thongTinFile = [];

  for (const file of goc.danhSachFile()) {
    const r = goc.docCaFile(file);
    thongTinFile.push({
      file,
      soCase: r.cases.length,
      tongKhaiBao: r.tongKhaiBao,
      lechKhaiBao: r.tongKhaiBao != null && r.tongKhaiBao !== r.cases.length,
      trungLap: r.loi ? [] : goc.timTrungLap(r.cases),
      loi: r.loi,
    });
    if (r.loi) continue;

    for (const c of r.cases) {
      const { module } = phanHeCho(file, c.nhom);
      if (!module) { chuaGan.push({ ...c, file }); continue; }
      if (!theoModule.has(module)) theoModule.set(module, []);
      theoModule.get(module).push({ ...c, file });
    }
  }
  return { theoModule, chuaGan, thongTinFile };
}

/**
 * Độ phủ của MỘT phân hệ.
 *
 * 🔴 `thieu` đã trừ **bản trùng trong chính sheet**: dựng một bản là đủ, dựng thêm là chạy hai lần
 * cùng một thao tác ghi dữ liệu. Vì vậy `goc !== khop + thieu` — phần chênh chính là số bản trùng.
 */
function doPhuMotPhanHe(caseGoc, daKhai) {
  const trung = new Set();
  for (const nhom of goc.timTrungLap(caseGoc)) nhom.slice(1).forEach((c) => trung.add(c.maKhoa));

  let khop = 0;
  const thieu = [];
  for (const c of caseGoc) {
    if (daKhai && daKhai.has(c.maKhoa)) { khop += 1; continue; }
    if (!trung.has(c.maKhoa)) thieu.push(c);
  }

  return { goc: caseGoc.length, khop, thieu, soTrung: trung.size, coCotMaGoc: daKhai !== null };
}

module.exports = { tachMaGoc, maGocDaKhai, gomCaseGoc, doPhuMotPhanHe };
