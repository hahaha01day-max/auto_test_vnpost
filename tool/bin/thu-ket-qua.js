'use strict';

/**
 * THU KẾT QUẢ CHẠY THẬT từ artifact Playwright rồi ghi ra `test-case-qc/_ket-qua.json`
 * để `to-qc-csv.js` điền vào cột `Kết quả`.
 *
 * 🔴 Chỉ lấy từ artifact máy sinh, 🚫 KHÔNG lấy con số trong `test-cases.md`: đó là chữ người viết,
 * không truy được về case nào đạt. Đọc hai nguồn:
 *   1. `test-output/playwright-results/results.json` — reporter json, chính xác nhất.
 *   2. `test-output/playwright-report/index.html` — báo cáo html, dữ liệu nằm trong thẻ
 *      `<template id="playwrightReportBase64">` dạng zip base64.
 *
 * 🔴 Mã case lấy từ ĐẦU title của `test()` (`'02_010_001 - tên case'`). Title không mở đầu bằng mã
 * thì bỏ qua — 🚫 đừng đoán theo tên file spec.
 *
 *   node tool/bin/thu-ket-qua.js            # quét toàn bộ, ghi _ket-qua.json
 *   node tool/bin/thu-ket-qua.js --check    # chỉ in thống kê
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.join(__dirname, '..', '..', 'tai-lieu-test');
const OUT = path.join(ROOT, 'test-case-qc', '_ket-qua.json');

/** `'02_010_001 - Mở màn'` / `'02_010_001 — Mở màn'` → `02_010_001` */
function maCase(title) {
  const m = String(title || '').trim()
    .match(/^(\d{2}[a-z]?(?:_\d)?_(?:\d{3}|PQ)_\d{3}|CNDB-[A-Z]+-\d+|GVMD-\d+|BC-\d+|Vantai_\d+|12-don-vi-van-tai_\d{3}_\d{3}|\d{2}_TT\d{2}_\d{3})\b/);
  return m ? m[1] : null;
}

/** Playwright: `expected` = đạt · `unexpected` = hỏng · `flaky` = đạt sau khi chạy lại. */
function quyDoi(outcome, status) {
  const v = outcome || status;
  if (v === 'expected' || v === 'passed') return 'Đạt';
  if (v === 'unexpected' || v === 'failed' || v === 'timedOut') return 'Không đạt';
  if (v === 'flaky') return 'Đạt';
  return null;                      // skipped / interrupted: chưa chạy, 🚫 để trống
}

function tuResultsJson(file) {
  const out = [];
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const di = (suite) => {
    for (const s of suite.suites || []) di(s);
    for (const sp of suite.specs || []) {
      for (const t of sp.tests || []) {
        const ma = maCase(sp.title);
        if (ma) out.push([ma, quyDoi(null, t.status)]);
      }
    }
  };
  for (const s of d.suites || []) di(s);
  return out;
}

function tuHtmlReport(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<template id="playwrightReportBase64">data:application\/zip;base64,([A-Za-z0-9+/=]+)<\/template>/);
  if (!m) return [];

  // Đọc zip thủ công: chỉ cần các entry .json, đều là deflate hoặc store.
  const buf = Buffer.from(m[1], 'base64');
  const out = [];
  let i = 0;
  while ((i = buf.indexOf('PK\x03\x04', i, 'binary')) !== -1) {
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const start = i + 30 + nameLen + extraLen;
    const name = buf.slice(i + 30, i + 30 + nameLen).toString();
    i = start + compSize;
    if (!name.endsWith('.json') || name === 'report.json' || !compSize) continue;
    let raw;
    try {
      const body = buf.slice(start, start + compSize);
      raw = method === 0 ? body : zlib.inflateRawSync(body);
    } catch { continue; }
    let d;
    try { d = JSON.parse(raw.toString('utf8')); } catch { continue; }
    for (const t of d.tests || []) {
      const ma = maCase(t.title);
      if (ma) out.push([ma, quyDoi(t.outcome, null)]);
    }
  }
  return out;
}

function main() {
  const check = process.argv.includes('--check');
  const ketQua = {};
  const thongKe = [];

  for (const mod of fs.readdirSync(ROOT).sort()) {
    const dir = path.join(ROOT, mod, 'test-output');
    if (!fs.existsSync(dir)) continue;

    const cap = [];
    const rj = path.join(dir, 'playwright-results', 'results.json');
    if (fs.existsSync(rj)) cap.push(...tuResultsJson(rj));
    const hr = path.join(dir, 'playwright-report', 'index.html');
    if (fs.existsSync(hr)) cap.push(...tuHtmlReport(hr));
    if (!cap.length) continue;

    const m = {};
    // Một case có thể chạy ở nhiều vai; "Không đạt" thắng "Đạt" để 🚫 không giấu lỗi.
    for (const [ma, kq] of cap) {
      if (!kq) continue;
      if (kq === 'Không đạt' || !m[ma]) m[ma] = kq;
    }
    const dat = Object.values(m).filter((x) => x === 'Đạt').length;
    const hong = Object.values(m).filter((x) => x === 'Không đạt').length;
    thongKe.push([mod, cap.length, dat, hong]);
    if (Object.keys(m).length) ketQua[mod] = m;
  }

  for (const [mod, n, dat, hong] of thongKe) {
    console.log(`${mod.padEnd(34)} ${String(n).padStart(4)} lượt · đạt ${String(dat).padStart(3)} · hỏng ${hong}`);
  }
  const tDat = thongKe.reduce((s, x) => s + x[2], 0);
  const tHong = thongKe.reduce((s, x) => s + x[3], 0);
  console.log(`\n${thongKe.length} phân hệ có artifact · ĐẠT ${tDat} · KHÔNG ĐẠT ${tHong}`);

  if (!check) {
    fs.writeFileSync(OUT, `${JSON.stringify(ketQua, null, 2)}\n`, 'utf8');
    console.log(`→ ${path.relative(process.cwd(), OUT)}`);
  }
}

main();
