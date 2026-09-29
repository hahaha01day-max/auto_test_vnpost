'use strict';

/**
 * Lượt chạy SONG SONG nhiều làn (seed làn mới + chạy auto test) — lõi cho màn `/song-song`.
 * Việc thật do `tool/bin/luot-song-song.js` làm; ở đây chỉ khởi động nó ở nền và đọc trạng thái.
 *
 * 🔴 Một lúc chỉ MỘT lượt: hai lượt cùng chạy là tranh CPU/RAM (mỗi làn một Chromium) và cùng ghi CSV.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT_ROOT = path.join(ROOT, 'test-output', 'song-song');

function docJson(file, macDinh) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return macDinh;
  }
}

function conSong(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Các lượt, mới nhất trước. `dangChay` = tiến trình còn sống và chưa ghi `ketThuc`. */
function listLuot() {
  if (!fs.existsSync(OUT_ROOT)) return [];
  return fs.readdirSync(OUT_ROOT)
    .filter((d) => fs.existsSync(path.join(OUT_ROOT, d, 'status.json')))
    .map((d) => {
      const st = docJson(path.join(OUT_ROOT, d, 'status.json'), {});
      return { ...st, dangChay: !st.ketThuc && conSong(st.pid) };
    })
    .sort((a, b) => String(b.luot).localeCompare(String(a.luot)));
}

function luotDangChay() {
  return listLuot().find((l) => l.dangChay) || null;
}

/** Khởi động một lượt ở nền. Trả mã lượt. */
function batDau({ soLan = 8, chiChuaChay = false } = {}) {
  const dang = luotDangChay();
  if (dang) throw new Error(`Lượt ${dang.luot} đang chạy — chờ xong hoặc dừng trước.`);
  const n = Math.max(1, Math.min(12, Number(soLan) || 8));
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  const luot = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  const cacArg = ['tool/bin/luot-song-song.js', `--so-lan=${n}`, `--luot=${luot}`];
  if (chiChuaChay) cacArg.push('--chi-chua-chay');
  fs.mkdirSync(path.join(OUT_ROOT, luot), { recursive: true });
  const fd = fs.openSync(path.join(OUT_ROOT, luot, 'nen.log'), 'a');
  // detached + unref: lượt sống tiếp khi tool restart; stop bằng cách kill cả nhóm tiến trình.
  const con = spawn('node', cacArg, { cwd: ROOT, detached: true, stdio: ['ignore', fd, fd], env: process.env });
  con.unref();
  return luot;
}

/** Dừng lượt: kill cả nhóm (seed + playwright con). */
function dung(luot) {
  const st = docJson(path.join(OUT_ROOT, luot, 'status.json'), null);
  if (!st?.pid) throw new Error(`Không có lượt ${luot}`);
  try {
    process.kill(-st.pid, 'SIGTERM');
  } catch {
    try { process.kill(st.pid, 'SIGTERM'); } catch { /* đã chết */ }
  }
  st.pha = 'Đã dừng tay';
  st.ketThuc = new Date().toISOString();
  fs.writeFileSync(path.join(OUT_ROOT, luot, 'status.json'), JSON.stringify(st, null, 2));
}

/** Trạng thái đầy đủ một lượt: status + tiến độ việc + đuôi log. */
function chiTiet(luot) {
  const dir = path.join(OUT_ROOT, luot);
  const st = docJson(path.join(dir, 'status.json'), null);
  if (!st) return null;
  const viec = docJson(path.join(dir, 'viec.json'), []);
  const dem = viec.reduce((a, v) => ((a[v.trangThai] = (a[v.trangThai] || 0) + 1), a), {});
  let log = '';
  try {
    log = fs.readFileSync(path.join(dir, 'luot.log'), 'utf8').split('\n').slice(-200).join('\n');
  } catch { /* chưa có log */ }
  return { ...st, dangChay: !st.ketThuc && conSong(st.pid), viec, dem, log };
}

module.exports = { listLuot, luotDangChay, batDau, dung, chiTiet, OUT_ROOT };
