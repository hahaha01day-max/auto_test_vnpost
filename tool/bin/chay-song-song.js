#!/usr/bin/env node
'use strict';

/**
 * Chạy auto test SONG SONG trên nhiều làn, chia việc theo FILE SPEC (không theo phân hệ).
 *
 *   node tool/bin/chay-song-song.js --lan=12,13,14,15,16,17,18,19            # chạy toàn bộ
 *   node tool/bin/chay-song-song.js --lan=12,13 --chi-chua-chay               # chỉ case chưa Đạt/Không đạt
 *   node tool/bin/chay-song-song.js --lan=12,13 --phan-he=18_1_ban_hang_tai_quay,20_khach_hang_than_thiet
 *   node tool/bin/chay-song-song.js --lan=12,13 --thu                         # in kế hoạch, không chạy
 *
 * 🔴 Mỗi làn phải là làn ĐÃ SEED ĐỦ (sổ `00_seed/seed-state.lane<n>.json` + `.env.lane<n>`). Độ chính xác
 *    là ưu tiên số một: mỗi lượt nên dựng bộ làn MỚI (dữ liệu cũ bị lượt trước tiêu/chốt kỳ ⇒ hỏng giả).
 * 🔴 Đơn vị việc = một file spec. Hai làn chạy hai file của CÙNG phân hệ được, vì mỗi làn có dữ liệu riêng;
 *    nhưng reporter mặc định của phân hệ ghi chung `test-output/playwright-results/results.json` ⇒ ở đây
 *    mỗi việc ghi json/html/artifact vào thư mục RIÊNG `test-output/song-song/<lượt>/<việc>/`.
 * 🔴 Phân hệ ghi CẤU HÌNH DÙNG CHUNG của cả chuỗi (`07_*`, `31`, `32`) chạy nối tiếp trên MỘT làn cố định
 *    (làn đầu danh sách) — chạy song song là giẫm nhau.
 * 🔴 Gọi `npx` bằng spawn (không qua hook rtk) — hook thay reporter, mất results.json.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const { listModules, TEST_ROOT, PROJECT_ROOT } = require('../core/modules');
const { parseCsv } = require('../core/cases');

const args = process.argv.slice(2);
const arg = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const LAN = arg('lan').split(',').map((x) => x.trim()).filter(Boolean);
const CHI_CHUA_CHAY = args.includes('--chi-chua-chay');
const THU = args.includes('--thu');
const PHAN_HE = arg('phan-he') ? arg('phan-he').split(',') : null;
const CAU_HINH_CHUNG = /^(07_|31_|32_)/;
const MAC_DINH_GIAY_CASE = 20;

if (!LAN.length) {
  console.error('Thiếu --lan=<n,n,...>');
  process.exit(1);
}
for (const l of LAN) {
  const so = path.join(TEST_ROOT, '00_seed', `seed-state.lane${l}.json`);
  if (!fs.existsSync(path.join(PROJECT_ROOT, `.env.lane${l}`)) || !fs.existsSync(so)) {
    console.error(`Làn ${l} chưa seed (thiếu .env.lane${l} hoặc ${path.relative(PROJECT_ROOT, so)})`);
    process.exit(1);
  }
}

const LUOT = arg('luot') || (() => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
})();
const KHOA = path.join(PROJECT_ROOT, 'test-output', `.khoa-csv-${LUOT}`);
// Tiến độ từng việc cho màn `/song-song` của tool.
const TIEN_DO = path.join(PROJECT_ROOT, 'test-output', 'song-song', LUOT, 'viec.json');
fs.mkdirSync(path.dirname(TIEN_DO), { recursive: true });
let DS_VIEC = [];
const luuTienDo = () => fs.writeFileSync(TIEN_DO, JSON.stringify(DS_VIEC.map((v) => ({
  mod: v.mod, file: v.file, soCase: v.soCase, giay: Math.round(v.giay), chung: v.chung,
  trangThai: v.trangThai || 'Chờ', lan: v.lan || null, exit: v.exit ?? null, tomTat: v.tomTat || '',
  phut: v.phut ?? null, out: v.out || null,
})), null, 2));

const MA = /^(\d{2}[a-z]?(?:_\d)?_(?:\d{3}|PQ)_\d{3}|CNDB-[A-Z]+-\d+|GVMD-\d+|BC-\d+|Vantai_\d+|12-don-vi-van-tai_\d{3}_\d{3}|\d{2}_TT\d{2}_\d{3})\b/;
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mã case chưa có kết quả Đạt/Không đạt trong CSV. */
function maChuaChay(mod) {
  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  const i = rows[0].indexOf('Trang thai chay');
  return new Set(rows.slice(1)
    .filter((r) => (r[0] || '').trim() && !['Đạt', 'Không đạt'].includes(i >= 0 ? String(r[i] || '').trim() : ''))
    .map((r) => r[0].trim()));
}

/** Thời lượng (giây) của từng file spec theo results.json gần nhất của phân hệ. */
function thoiLuongTheoFile(dir) {
  const out = new Map();
  const kq = path.join(dir, 'test-output', 'playwright-results', 'results.json');
  if (!fs.existsSync(kq)) return out;
  try {
    const walk = (s) => {
      for (const x of s.suites ?? []) walk(x);
      for (const sp of s.specs ?? []) {
        const f = path.basename(sp.file || '');
        for (const t of sp.tests ?? []) {
          const d = (t.results ?? []).reduce((a, r) => a + (r.duration || 0), 0) / 1000;
          out.set(f, (out.get(f) || 0) + d);
        }
      }
    };
    walk(JSON.parse(fs.readFileSync(kq, 'utf8')));
  } catch { /* results.json hỏng ⇒ dùng ước lượng mặc định */ }
  return out;
}

/** Danh sách việc: một việc = một file spec (kèm grep mã nếu --chi-chua-chay). */
function lapViec() {
  const viec = [];
  for (const mod of listModules()) {
    if (mod.id === '00_seed' || !mod.csvPath) continue;
    if (PHAN_HE && !PHAN_HE.includes(path.basename(mod.dir))) continue;
    const cfg = path.join(mod.dir, 'playwright.config.js');
    const testDir = path.join(mod.dir, 'tests');
    if (!fs.existsSync(cfg) || !fs.existsSync(testDir)) continue;
    const chua = CHI_CHUA_CHAY ? maChuaChay(mod) : null;
    const tl = thoiLuongTheoFile(mod.dir);
    const files = fs.readdirSync(testDir, { recursive: true }).filter((f) => /\.spec\.js$/.test(f));
    for (const f of files) {
      const src = fs.readFileSync(path.join(testDir, f), 'utf8');
      const ma = [...new Set([...src.matchAll(/test(?:\.skip|\.only|\.fixme)?\(\s*['`"]([^'`"]+)/g)]
        .map((m) => (m[1].match(MA) || [])[1]).filter(Boolean))];
      const chon = chua ? ma.filter((x) => chua.has(x)) : ma;
      if (!chon.length) continue;
      const giay = tl.get(path.basename(f)) || chon.length * MAC_DINH_GIAY_CASE;
      viec.push({
        mod: path.basename(mod.dir),
        dir: mod.dir,
        cfg,
        file: f,
        grep: chua ? `(${chon.map(escRe).join('|')})` : null,
        soCase: chon.length,
        giay,
        chung: CAU_HINH_CHUNG.test(path.basename(mod.dir)),
      });
    }
  }
  return viec.sort((a, b) => b.giay - a.giay);
}

function khoa(fn) {
  for (;;) {
    try {
      fs.mkdirSync(KHOA);
      break;
    } catch {
      spawnSync('sleep', ['0.5']);
    }
  }
  try {
    fn();
  } finally {
    fs.rmdirSync(KHOA);
  }
}

function chayViec(v, lan) {
  return new Promise((resolve) => {
    const ten = `${path.basename(v.file, '.spec.js')}.lane${lan}`;
    const out = path.join(v.dir, 'test-output', 'song-song', LUOT, ten);
    fs.mkdirSync(out, { recursive: true });
    const lenh = ['playwright', 'test', '--config', v.cfg, escRe(v.file),
      '--reporter=list,json,html', `--output=${path.join(out, 'artifacts')}`];
    if (v.grep) lenh.push('--grep', v.grep);
    const env = {
      ...process.env,
      VNPOST_LANE: lan,
      PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(out, 'results.json'),
      PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(out, 'report'),
      PLAYWRIGHT_HTML_OPEN: 'never',
    };
    v.trangThai = 'Đang chạy'; v.lan = lan; v.out = path.relative(PROJECT_ROOT, out); luuTienDo();
    const bd = Date.now();
    const log = fs.openSync(path.join(out, 'run.log'), 'w');
    const p = spawn('npx', lenh, { cwd: PROJECT_ROOT, env, stdio: ['ignore', log, log] });
    p.on('close', (code) => {
      const kq = path.join(out, 'results.json');
      let tomTat = 'KHÔNG có results.json';
      if (fs.existsSync(kq)) {
        khoa(() => {
          const r = spawnSync('node', ['tool/bin/cap-nhat-trang-thai.js', v.mod, `--ket-qua=${kq}`],
            { cwd: PROJECT_ROOT, encoding: 'utf8' });
          tomTat = (r.stdout || r.stderr || '').trim().split('\n')[0];
        });
      }
      v.exit = code; v.tomTat = tomTat; v.phut = Math.round((Date.now() - bd) / 60000);
      v.trangThai = code === 0 ? 'Đạt hết' : (fs.existsSync(kq) ? 'Có case hỏng' : 'Lỗi chạy');
      luuTienDo();
      console.log(`[làn ${lan}] ${v.mod}/${v.file} exit=${code} ${v.phut}p · ${tomTat}`);
      resolve();
    });
  });
}

async function main() {
  const viec = lapViec();
  DS_VIEC = viec;
  luuTienDo();
  const chung = viec.filter((v) => v.chung);
  const rieng = viec.filter((v) => !v.chung);
  const tong = viec.reduce((s, v) => s + v.giay, 0);
  console.log(`Lượt ${LUOT} · ${viec.length} file spec · ${viec.reduce((s, v) => s + v.soCase, 0)} case · `
    + `ước ${Math.round(tong / 60)} phút tuần tự ⇒ ~${Math.round(tong / 60 / LAN.length)} phút trên ${LAN.length} làn`);
  console.log(`Làn ${LAN[0]} giữ nhóm cấu hình chung (${chung.length} file: ${[...new Set(chung.map((v) => v.mod))].join(', ')})`);
  if (THU) {
    for (const v of viec) console.log(`  ${String(Math.round(v.giay)).padStart(5)}s  ${v.soCase} case  ${v.mod}/${v.file}${v.chung ? '  [chung]' : ''}`);
    return;
  }

  // Làn đầu chạy nhóm cấu hình chung TRƯỚC rồi mới nhận việc thường; các làn khác nhận việc thường ngay.
  const hang = [...rieng];
  const tho = async (lan, truoc) => {
    for (const v of truoc) await chayViec(v, lan);
    for (;;) {
      const v = hang.shift();
      if (!v) return;
      await chayViec(v, lan);
    }
  };
  await Promise.all(LAN.map((lan, i) => tho(lan, i === 0 ? chung : [])));

  spawnSync('node', ['tool/bin/checklist.js'], { cwd: PROJECT_ROOT, stdio: 'inherit' });
  console.log(`XONG lượt ${LUOT}`);
}

main();
