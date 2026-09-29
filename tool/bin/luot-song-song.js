#!/usr/bin/env node
'use strict';

/**
 * MỘT LƯỢT TRỌN GÓI: dựng N làn MỚI (seed từ đầu) rồi chạy auto test song song trên các làn đó.
 *
 *   node tool/bin/luot-song-song.js                    # 8 làn, toàn bộ case
 *   node tool/bin/luot-song-song.js --so-lan=4 --chi-chua-chay
 *   node tool/bin/luot-song-song.js --lan=12,13        # dùng làn ĐÃ seed, bỏ qua bước seed
 *
 * 🔴 Ưu tiên số một là ĐỘ CHÍNH XÁC ⇒ mỗi lượt dựng làn MỚI, 🚫 dùng lại dữ liệu làn cũ: lượt trước đã
 *    tiêu hàng, chốt kỳ tồn, đổi trạng thái chứng từ ⇒ lượt sau hỏng giả.
 * 🔴 Pha A (seed bước 1–3) đăng nhập bằng TCT CHUNG của `.env` ⇒ chạy NỐI TIẾP từng làn (xoay vòng refresh
 *    token làm phiên kia treo). Pha B (bước 4–8 + bổ sung) dùng tài khoản riêng của làn ⇒ song song.
 * 🔴 Làn seed thiếu dữ liệu bắt buộc bị LOẠI khỏi lượt chạy — để lại là sinh "không đạt" giả.
 * 🔴 Gọi `npx` bằng spawn (không qua hook rtk) — hook thay reporter, mất results.json.
 *
 * Trạng thái + log: `test-output/song-song/<lượt>/status.json`, `luot.log` (màn `/song-song` của tool đọc).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const SEED_DIR = path.join(ROOT, 'tai-lieu-test', '00_seed');
const OUT_ROOT = path.join(ROOT, 'test-output', 'song-song');

const args = process.argv.slice(2);
const arg = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
const SO_LAN = Number(arg('so-lan') || 8);
const LAN_CO_SAN = arg('lan') ? arg('lan').split(',').map((x) => x.trim()).filter(Boolean) : null;
const CHI_CHUA_CHAY = args.includes('--chi-chua-chay');
const SONG_SONG_SEED = 4;

/** Nhóm dữ liệu BẮT BUỘC có trong sổ — thiếu là loại làn. */
const BAT_BUOC = ['toChuc', 'diemBan', 'taiKhoanLan', 'nhanSu', 'sanPham', 'bangGiaBan', 'nhaCungCap', 'sanPhamNcc', 'tonKho', 'caLamViec'];
/** Nhóm bổ sung — thiếu thì vẫn chạy nhưng ghi cảnh báo (vài phân hệ sẽ skip/hỏng vì tiền đề). */
const BO_SUNG = ['quayThuNgan', 'khoPhu', 'sanPhamSanXuat', 'congNoNcc', 'bangGiaMuaTct', 'tuDoanhTinh', 'combo', 'danhMucB', 'kyGui', 'poRieng', 'boSungTon'];

const LUOT = arg('luot') || (() => {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
})();
const DIR = path.join(OUT_ROOT, LUOT);
fs.mkdirSync(DIR, { recursive: true });
const LOG = path.join(DIR, 'luot.log');
const STATUS = path.join(DIR, 'status.json');

const status = {
  luot: LUOT, pha: 'Chuẩn bị', batDau: new Date().toISOString(), ketThuc: null, loi: null,
  soLan: SO_LAN, chiChuaChay: CHI_CHUA_CHAY, lan: [], pid: process.pid,
};
const luu = () => fs.writeFileSync(STATUS, JSON.stringify(status, null, 2));
const ghi = (s) => {
  const dong = `[${new Date().toTimeString().slice(0, 8)}] ${s}`;
  fs.appendFileSync(LOG, `${dong}\n`);
  console.log(dong);
};
luu();

/** Chạy lệnh con, dồn stdout/stderr vào file log riêng của làn + trả exit code. */
function chay(lenh, cacArg, env, logFile) {
  return new Promise((resolve) => {
    const fd = fs.openSync(logFile, 'a');
    const p = spawn(lenh, cacArg, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', fd, fd] });
    p.on('close', (code) => {
      fs.closeSync(fd);
      resolve(code ?? 1);
    });
  });
}

/** Các số làn đã từng dùng (có `.env.lane<n>` hoặc sổ seed). */
function lanDaDung() {
  const so = new Set();
  for (const f of fs.readdirSync(ROOT)) {
    const m = f.match(/^\.env\.lane(\d+)$/);
    if (m) so.add(Number(m[1]));
  }
  for (const f of fs.readdirSync(SEED_DIR)) {
    const m = f.match(/^seed-state\.lane(\d+)\.json$/);
    if (m) so.add(Number(m[1]));
  }
  return so;
}

function docSo(lan) {
  try {
    return JSON.parse(fs.readFileSync(path.join(SEED_DIR, `seed-state.lane${lan}.json`), 'utf8')).duLieu || {};
  } catch {
    return {};
  }
}

async function seedLan(lan, pha) {
  const log = path.join(DIR, `seed-lane${lan}.log`);
  const env = { VNPOST_LANE: String(lan) };
  const o = status.lan.find((x) => x.so === lan);
  if (pha === 'A') {
    fs.writeFileSync(path.join(ROOT, `.env.lane${lan}`),
      `# Làn ${lan} — lượt ${LUOT}. Bước 1–3 dùng TCT chung; seed 3.99 ghi đè file này.\n`);
    for (const b of [1, 2, 3]) {
      o.seed = `Bước ${b}/3`; luu();
      const code = await chay('node', ['tool/bin/seed.js', '--api', `--buoc=${b}`], env, log);
      if (code !== 0) {
        o.seed = `HỎNG bước ${b}`; o.hong = true; luu();
        ghi(`làn ${lan}: seed bước ${b} HỎNG — loại làn (xem ${path.relative(ROOT, log)})`);
        return;
      }
    }
    o.seed = 'Xong bước 1–3'; luu();
    return;
  }
  o.seed = 'Bước 4–8'; luu();
  if (await chay('node', ['tool/bin/seed.js', '--api'], env, log) !== 0) {
    o.seed = 'HỎNG bước 4–8'; o.hong = true; luu();
    ghi(`làn ${lan}: seed bước 4–8 HỎNG — loại làn`);
    return;
  }
  o.seed = 'Bổ sung API'; luu();
  await chay('npx', ['playwright', 'test', '--config', 'tai-lieu-test/00_seed/playwright.api.config.js',
    '--grep', 'seed 1[3-9]\\.'], env, log);
  o.seed = 'Bổ sung giao diện'; luu();
  // 🔴 `--no-deps` (bắt buộc — thiếu là chạy lại bước 01–07, đẻ dữ liệu trùng) bỏ luôn project `setup`
  //    ⇒ làn MỚI chưa có `.auth-lane<n>/*.json`, mọi bước UI chết ở "Error reading storage state".
  //    Đăng nhập các vai của làn TRƯỚC.
  await chay('npx', ['playwright', 'test', '--config', 'tai-lieu-test/00_seed/playwright.config.js', '--project=setup'], env, log);
  await chay('npx', ['playwright', 'test', '--config', 'tai-lieu-test/00_seed/playwright.config.js', '--no-deps',
    '--grep', 'seed (9|10|11)[ .]|seed 12\\.|17 bo sung'], env, log);
  const so = docSo(lan);
  o.thieuBatBuoc = BAT_BUOC.filter((k) => !so[k]);
  o.thieuBoSung = BO_SUNG.filter((k) => !so[k]);
  o.hong = o.thieuBatBuoc.length > 0;
  o.seed = o.hong ? `THIẾU ${o.thieuBatBuoc.join(', ')}` : 'Đủ';
  luu();
  ghi(`làn ${lan}: seed ${o.seed}${o.thieuBoSung.length ? ` · thiếu bổ sung: ${o.thieuBoSung.join(', ')}` : ''}`);
}

async function main() {
  let lanChay;
  if (LAN_CO_SAN) {
    status.lan = LAN_CO_SAN.map((so) => ({ so: Number(so), seed: 'Dùng sẵn' }));
    lanChay = LAN_CO_SAN;
  } else {
    const daDung = lanDaDung();
    const bd = Math.max(9, ...daDung) + 1;
    const moi = Array.from({ length: SO_LAN }, (_, i) => bd + i);
    status.lan = moi.map((so) => ({ so, seed: 'Chờ' }));
    status.pha = 'Seed pha A (bước 1–3, nối tiếp)'; luu();
    ghi(`Lượt ${LUOT}: dựng ${SO_LAN} làn mới ${moi.join(', ')}`);
    for (const lan of moi) await seedLan(lan, 'A');

    status.pha = `Seed pha B (song song ${SONG_SONG_SEED})`; luu();
    const hang = moi.filter((lan) => !status.lan.find((x) => x.so === lan).hong);
    await Promise.all(Array.from({ length: SONG_SONG_SEED }, async () => {
      for (;;) {
        const lan = hang.shift();
        if (lan === undefined) return;
        await seedLan(lan, 'B');
      }
    }));
    lanChay = status.lan.filter((x) => !x.hong).map((x) => String(x.so));
  }

  if (!lanChay.length) throw new Error('Không làn nào seed đủ — dừng lượt.');
  status.pha = `Chạy test trên ${lanChay.length} làn`; luu();
  ghi(`Chạy auto test trên làn ${lanChay.join(', ')}${CHI_CHUA_CHAY ? ' (chỉ case chưa chạy)' : ' (toàn bộ)'}`);
  const code = await chay('node', ['tool/bin/chay-song-song.js', `--lan=${lanChay.join(',')}`, `--luot=${LUOT}`,
    ...(CHI_CHUA_CHAY ? ['--chi-chua-chay'] : [])], {}, LOG);
  status.pha = code === 0 ? 'Xong' : `Xong (bộ chạy thoát ${code})`;
  status.ketThuc = new Date().toISOString();
  luu();
  ghi(`XONG lượt ${LUOT}`);
}

main().catch((e) => {
  status.pha = 'Lỗi';
  status.loi = e.message;
  status.ketThuc = new Date().toISOString();
  luu();
  ghi(`🔴 ${e.message}`);
  process.exit(1);
});
