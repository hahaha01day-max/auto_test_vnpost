'use strict';

/**
 * SINH DỮ LIỆU NỀN cho auto test — chạy **qua giao diện FE** bằng Playwright.
 *
 * 🔴 Vì sao qua FE chứ không phải SQL hay API: dữ liệu nền phải đi đúng đường người dùng thật đi,
 * nếu không sẽ thiếu side-effect mà chỉ tầng trên mới làm. Ví dụ: tạo điểm bán bằng SQL là mất
 * bản ghi `ORGANIZATION_UNIT_SHOP` (ánh xạ đơn vị ↔ điểm bán, do
 * `OrganizationUnitServiceImpl.assignShopToOrgUnit` ghi) **và mất luôn kho tự sinh** — điểm bán
 * không có kho thì mọi case kho phía sau vẫn skip, đúng thứ mình đang đi chữa.
 *
 * 🔴 Các bước PHỤ THUỘC NHAU và chạy NỐI TIẾP. Bước sau đọc bản ghi bước trước qua
 * `tai-lieu-test/00_seed/seed-state.json`. 🚫 Không chạy song song, 🚫 không chạy bước lẻ khi
 * chưa có sổ.
 *
 * 🔴 Chạy lại một bước đã xong là **đẻ thêm bản ghi trùng**, không phải chữa lỗi — phần lớn màn
 * KHÔNG có chức năng xoá (điểm bán, nhân viên, đơn vị tổ chức), bản ghi ở lại vĩnh viễn.
 * Vì vậy mặc định chỉ chạy bước CHƯA có trong sổ; muốn chạy lại phải nói rõ `--lam-lai`.
 *
 *   node tool/bin/seed.js                 # chạy các bước còn thiếu
 *   node tool/bin/seed.js --so            # xem sổ dữ liệu đã seed
 *   node tool/bin/seed.js --buoc=2        # chạy đúng bước 2
 *   node tool/bin/seed.js --lam-lai       # bỏ qua sổ, chạy lại từ đầu (đẻ bộ dữ liệu MỚI)
 *   node tool/bin/seed.js --thu           # chỉ in lệnh sẽ chạy
 *   node tool/bin/seed.js --api           # seed bằng API (00_seed/api-tests/), nhanh + ổn định hơn
 *
 * Môi trường: lấy `VNPOST_BASE_URL` trong `.env`. FE dev phải đang chạy —
 * `cd vnpost-web && pnpm start --port 3200` (🔴 biến `PORT` bị rsbuild bỏ qua, phải dùng cờ).
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { BUOC, SEED_DIR, STATE_FILE: STATE, grepCuaBuoc } = require('../core/seed');

const ROOT = path.join(__dirname, '..', '..');
// `--api`: bộ seed gọi API (`00_seed/api-tests/`) thay vì lái giao diện.
const API = process.argv.includes('--api');
const CONFIG = path.join(SEED_DIR, API ? 'playwright.api.config.js' : 'playwright.config.js');
const SPEC_DIR = path.join(SEED_DIR, API ? 'api-tests' : 'tests');

function doc() {
  if (!fs.existsSync(STATE)) return { duLieu: {} };
  return JSON.parse(fs.readFileSync(STATE, 'utf8'));
}

function inSo() {
  const s = doc();
  if (!s.taoLuc) {
    console.log('Sổ trống — chưa seed lần nào.');
    return;
  }
  console.log(`Lượt seed ${s.runId} · tiền tố ${s.prefix} · tạo lúc ${s.taoLuc}\n`);
  for (const b of BUOC) {
    const d = s.duLieu[b.nhom];
    const dau = d ? '✅' : '☐ ';
    const gia = d ? Object.entries(d).map(([k, v]) => `${k}=${v}`).join(' · ') : '';
    console.log(`${dau} ${b.so}. ${b.ten}`);
    if (gia) console.log(`     ${gia}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--so')) return inSo();

  const lamLai = args.includes('--lam-lai');
  const thu = args.includes('--thu');
  const chon = args.find((a) => a.startsWith('--buoc='));
  const soCanChay = chon ? Number(chon.split('=')[1]) : null;

  const s = doc();
  const canChay = BUOC.filter((b) => {
    if (soCanChay) return b.so === soCanChay;
    if (lamLai) return true;
    return !s.duLieu[b.nhom];
  }).filter((b) => fs.existsSync(SPEC_DIR)
    && fs.readdirSync(SPEC_DIR).some((f) => f.startsWith(String(b.so).padStart(2, '0'))));

  if (!canChay.length) {
    console.log('Không có bước nào để chạy. `--so` để xem sổ, `--lam-lai` để seed bộ mới.');
    return;
  }

  for (const b of canChay) {
    console.log(`\n=== Bước ${b.so}: ${b.ten}`);
    // 🔴 Gọi `npx` bằng spawn nên KHÔNG đi qua hook `rtk` — đó là chủ ý: chạy `npx playwright`
    //    trong shell có hook thì hook thay reporter bằng bản rút gọn và **không sinh
    //    `results.json` lẫn `playwright-report/`**, mất sạch bằng chứng lượt chạy.
    //    Chạy tay thì phải `rtk proxy npx playwright …`.
    const lenh = ['playwright', 'test', '--config', CONFIG, '--grep', grepCuaBuoc(b.so)];
    if (thu) {
      console.log(`  (thử) npx ${lenh.join(' ')}`);
      continue;
    }
    const kq = spawnSync('npx', lenh, { cwd: ROOT, stdio: 'inherit', env: process.env });
    if (kq.status !== 0) {
      console.error(`\n🔴 Bước ${b.so} hỏng — DỪNG. Bước sau phụ thuộc bước này, chạy tiếp là sai dữ liệu.`);
      process.exit(kq.status || 1);
    }
  }

  console.log('\n--- Sổ sau khi seed ---');
  inSo();
}

main();
