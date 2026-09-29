#!/usr/bin/env node
'use strict';

/**
 * Ghi TRẠNG THÁI CHẠY THẬT của từng case vào `test-cases.csv` của phân hệ, lấy từ
 * `test-output/playwright-results/results.json` của lượt vừa chạy.
 *
 *   node tool/bin/cap-nhat-trang-thai.js <thu-muc-phan-he>        # vd. 03a_quan_ly_ca_lich_lam_viec
 *   node tool/bin/cap-nhat-trang-thai.js <thu-muc-phan-he> --check
 *   node tool/bin/cap-nhat-trang-thai.js <thu-muc-phan-he> --ket-qua=<results.json>   # lượt chạy chia file spec
 *
 * `--ket-qua`: chạy song song nhiều làn trên CÙNG phân hệ thì mỗi làn ghi results.json riêng
 * (PLAYWRIGHT_JSON_OUTPUT_NAME) — 🚫 không để chung `test-output/playwright-results/results.json`, làn sau đè làn trước.
 *
 * Ba cột thêm vào CUỐI file (🚫 không đụng các cột có sẵn):
 *   - `Trang thai chay`: `Đạt` · `Không đạt` · `Chưa chạy`
 *   - `Ngay chay`: ngày của lượt chạy (dd/mm/yyyy)
 *   - `Ghi chu chay`: lý do skip / thông báo lỗi đầu tiên (rút gọn)
 *
 * 🔴 Chỉ ghi case CÓ MẶT trong lượt chạy. `results.json` bị ghi đè mỗi lượt, nên chạy lẻ một case
 *    thì các case khác GIỮ NGUYÊN trạng thái cũ — 🚫 không xoá thành rỗng.
 * 🔴 Cột tên `Ket qua` sẽ bị `core/cases.js` hiểu nhầm là "Kết quả kỳ vọng" ⇒ cố ý đặt tên khác.
 */

const fs = require('node:fs');
const path = require('node:path');
const { parseCsv } = require('../core/cases');

const COT = ['Trang thai chay', 'Ngay chay', 'Ghi chu chay'];
const MA = /^(\d{2}[a-z]?(?:_\d)?_(?:\d{3}|PQ)_\d{3}|CNDB-[A-Z]+-\d+|GVMD-\d+|BC-\d+|Vantai_\d+|12-don-vi-van-tai_\d{3}_\d{3}|\d{2}_TT\d{2}_\d{3})\b/;

const oCsv = (v) => {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const rutGon = (s, n = 300) =>
  String(s ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n);

/** Duyệt cây suite của reporter json → [{ id, trangThai, ghiChu }]. */
function docKetQua(json) {
  const out = [];
  const walk = (suite) => {
    for (const s of suite.suites ?? []) walk(s);
    for (const spec of suite.specs ?? []) {
      const id = (String(spec.title).trim().match(MA) || [])[1];
      if (!id) continue;
      for (const t of spec.tests ?? []) {
        if (t.projectName === 'setup') continue;
        const cuoi = (t.results ?? []).at(-1) ?? {};
        let trangThai;
        let ghiChu = '';
        if (t.status === 'expected' || t.status === 'flaky') trangThai = 'Đạt';
        else if (t.status === 'unexpected') {
          trangThai = 'Không đạt';
          ghiChu = rutGon(cuoi.error?.message ?? (cuoi.errors ?? [])[0]?.message);
        } else if (t.status === 'skipped') {
          trangThai = 'Chưa chạy';
          ghiChu = rutGon((cuoi.annotations ?? t.annotations ?? []).find((a) => a.type === 'skip')?.description);
        } else continue;
        out.push({ id, trangThai, ghiChu });
      }
    }
  };
  walk(json);
  return out;
}

/** Một mã chạy ở nhiều project/file: có một chỗ hỏng là hỏng, không thì có một chỗ đạt là đạt. */
function gop(ds) {
  const theoMa = new Map();
  const hang = { 'Không đạt': 3, 'Đạt': 2, 'Chưa chạy': 1 };
  for (const x of ds) {
    const cu = theoMa.get(x.id);
    if (!cu || hang[x.trangThai] > hang[cu.trangThai]) theoMa.set(x.id, x);
  }
  return theoMa;
}

function main() {
  const [, , thuMuc, ...conLai] = process.argv;
  const co = conLai.find((a) => a === '--check');
  const kqArg = conLai.find((a) => a.startsWith('--ket-qua='));
  if (!thuMuc) {
    console.error('Cách dùng: node tool/bin/cap-nhat-trang-thai.js <thu-muc-phan-he> [--check]');
    process.exit(1);
  }
  const goc = path.isAbsolute(thuMuc) ? thuMuc : path.join(__dirname, '..', '..', 'tai-lieu-test', thuMuc);
  const csv = path.join(goc, 'test-cases.csv');
  const kq = kqArg ? path.resolve(kqArg.slice('--ket-qua='.length))
    : path.join(goc, 'test-output', 'playwright-results', 'results.json');
  if (!fs.existsSync(csv)) throw new Error(`Không có ${csv}`);
  if (!fs.existsSync(kq)) throw new Error(`Không có ${kq} — lượt chạy chưa sinh reporter json (nhớ rtk proxy).`);

  const json = JSON.parse(fs.readFileSync(kq, 'utf8'));
  const ngay = new Date(json.stats?.startTime ?? fs.statSync(kq).mtime);
  const p = (x) => String(x).padStart(2, '0');
  const ngayChay = `${p(ngay.getDate())}/${p(ngay.getMonth() + 1)}/${ngay.getFullYear()}`;
  const ketQua = gop(docKetQua(json));

  const rows = parseCsv(fs.readFileSync(csv, 'utf8'));
  const header = rows[0];
  const viTri = COT.map((c) => {
    let i = header.indexOf(c);
    if (i < 0) {
      header.push(c);
      i = header.length - 1;
    }
    return i;
  });

  const dem = { 'Đạt': 0, 'Không đạt': 0, 'Chưa chạy': 0 };
  const coTrongCsv = new Set();
  for (const r of rows.slice(1)) {
    while (r.length < header.length) r.push('');
    const id = (r[0] || '').trim();
    coTrongCsv.add(id);
    const x = ketQua.get(id);
    if (!x) continue;
    r[viTri[0]] = x.trangThai;
    r[viTri[1]] = ngayChay;
    r[viTri[2]] = x.ghiChu;
    dem[x.trangThai] += 1;
  }
  const moCoi = [...ketQua.keys()].filter((id) => !coTrongCsv.has(id));

  console.log(
    `${path.basename(goc)} · lượt ${ngayChay}: Đạt ${dem['Đạt']} · Không đạt ${dem['Không đạt']} · Chưa chạy ${dem['Chưa chạy']}`,
  );
  if (moCoi.length) console.warn(`⚠️  Có kết quả nhưng CSV không có mã: ${moCoi.join(', ')}`);
  if (co === '--check') return;
  fs.writeFileSync(csv, `${rows.map((r) => r.map(oCsv).join(',')).join('\n')}\n`, 'utf8');
}

main();
