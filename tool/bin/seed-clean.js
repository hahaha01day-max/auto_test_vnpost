#!/usr/bin/env node
'use strict';

/**
 * 🧹 **DỌN RÁC** do các case GHI để lại — chạy qua giao diện, giống bộ seed.
 *
 * 🔴 Phạm vi hẹp có chủ ý: chỉ bản ghi mang tiền tố **`AUTOTEST_`** và chỉ những thứ **xoá được
 *    trên giao diện** (hiện tại: nhóm nhà cung cấp). Tiền tố `AUTOTEST_` là của case ghi dùng một
 *    lần rồi tự dọn; case chết giữa chừng thì bản ghi ở lại.
 *
 * 🔴 🚫 TUYỆT ĐỐI KHÔNG dọn tiền tố **`AUTO_`** — đó là **dữ liệu nền** của bộ seed. Điểm bán,
 *    nhân viên, đơn vị tổ chức 🚫 không có chức năng xoá; tồn đầu kỳ chỉ khai được **một lần cho
 *    mỗi điểm bán**. Xoá nhầm một mắt xích là cả bộ test mất nền và 🚫 không dựng lại được.
 *
 * 🔴 Mặc định **chỉ liệt kê**. Phải nói rõ `--ap-dung` mới xoá — dọn nhầm 🚫 không có đường lùi.
 *
 *   node tool/bin/seed-clean.js            # liệt kê thứ sẽ xoá
 *   node tool/bin/seed-clean.js --ap-dung  # xoá thật
 */

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { SEED_DIR } = require('../core/seed');

const ROOT = path.join(__dirname, '..', '..');
const CONFIG = path.join(SEED_DIR, 'playwright.config.js');

function main() {
  const apDung = process.argv.includes('--ap-dung');

  console.log(
    apDung
      ? '🧹 XOÁ THẬT bản ghi rác mang tiền tố AUTOTEST_ (🚫 không đụng dữ liệu nền AUTO_).'
      : '🧹 Chạy thử — chỉ liệt kê, 🚫 không xoá gì. Thêm `--ap-dung` để xoá thật.',
  );

  // 🔴 Gọi `npx` bằng spawn nên 🚫 KHÔNG đi qua hook `rtk` — chủ ý: qua hook thì reporter bị thay
  //    và 🚫 không sinh `results.json`, mất sạch bằng chứng đã xoá những gì.
  const kq = spawnSync(
    'npx',
    ['playwright', 'test', '--config', CONFIG, '--grep', 'Dọn rác'],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, VNPOST_CLEAN_APPLY: apDung ? '1' : '0' },
    },
  );

  if (kq.status !== 0) {
    console.error('\n🔴 Lượt dọn hỏng — đọc log ở trên. 🚫 Đừng chạy lại mù, có thể đã xoá một phần.');
    process.exit(kq.status || 1);
  }
  console.log(
    apDung
      ? '\nXong. Thứ 🚫 không xoá được (điểm bán, nhân viên, đơn vị tổ chức, ca làm việc) vẫn ở lại — đó là giới hạn của sản phẩm, 🚫 không phải lỗi của bộ dọn.'
      : '\nXong lượt thử.',
  );
}

main();
