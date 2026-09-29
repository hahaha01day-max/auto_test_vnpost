const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/** 03b — Ca làm việc của nhân viên. Mã phân hệ lấy theo `resource/hdsd/hdsd03b_ca_lam_viec_nhan_vien/`. */
module.exports = defineConfig({
  testDir: path.join(DOC_ROOT, 'tests'),
  // Case QC đã xoá (cột `Trang thai QC` = QC_XOA) — loại khỏi lượt chạy, spec giữ nguyên.
  grepInvert: qcXoaGrepInvert(DOC_ROOT),
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  outputDir: path.join(DOC_ROOT, 'test-output/playwright-results'),
  reporter: [
    ['list'],
    ['html', { outputFolder: path.join(DOC_ROOT, 'test-output/playwright-report'), open: 'never' }],
    ['json', { outputFile: path.join(DOC_ROOT, 'test-output/playwright-results/results.json') }],
  ],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 1000 },
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // 🔴 `gdv` là vai chính (ca của chính mình); `province` chỉ dùng cho case kiểm phạm vi chặn
    //    bán hàng — chạy case đó bằng vai khác là pass giả.
    {
      name: 'setup',
      testDir: path.join(DOC_ROOT, '..', 'shared', 'auth'),
      testMatch: /roles\.setup\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // 🔴 Bộ DỰNG NỀN cấp dưới nhất: quầy thu ngân. 🚫 KHÔNG mở được ca nếu điểm bán chưa có
      //    quầy — ô "Quầy thu ngân" trong drawer mở ca là bắt buộc. Đo 23/09 trên DB: điểm bán
      //    seed `AUTO_SHOP_62391304` (shop_id 68127) 🚫 không có dòng nào trong
      //    `SHOP_CASHIER_COUNTER`. Spec nằm ở phân hệ 17 — dựng nền bằng chính script của chức
      //    năng tương ứng.
      name: 'seed-quay',
      dependencies: ['setup'],
      testDir: path.join(DOC_ROOT, '..', '17_quan_ly_quay_thu_ngan', 'tests'),
      testMatch: /seed-quay-thu-ngan\.shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_shop') },
    },
    {
      // 🔴 Ca của điểm bán seed: sinh ra chỉ có "Ca sáng 07:30–12:00" ⇒ lượt chạy buổi chiều
      //    🚫 không mở được ca nào. Spec ở phân hệ 03a thêm một ca phủ cả ngày và một ca thứ hai
      //    cho case `010_003` / `030_003`.
      name: 'seed-ca',
      dependencies: ['seed-quay'],
      testDir: path.join(DOC_ROOT, '..', '03a_quan_ly_ca_lich_lam_viec', 'tests'),
      testMatch: /seed-ca-cau-hinh\.shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_shop') },
    },
    {
      // 🔴 Bộ DỰNG NỀN: xếp ca hôm nay cho chính nhân viên của điểm bán seed. Không có ca thì màn
      //    chỉ hiện "Chưa có ca làm việc hôm nay" và 34/36 case vỏ rỗng skip sạch.
      name: 'seed',
      dependencies: ['seed-ca'],
      testMatch: /seed-ca-hom-nay\.shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_shop') },
    },
    {
      /**
       * 🔴 Vòng đời ca (mở · tạm chốt · chốt) chạy bằng vai `seed_shop` — nhân viên của **điểm bán
       *    do seed dựng**, 🚫 KHÔNG phải `gdv` của điểm bán Lý Sơn. Mọi thao tác ở đây ghi **quỹ
       *    tiền mặt thật và khoá số liệu ca**; chạy trên điểm bán vận hành thật là làm bẩn sổ quỹ
       *    của người khác, 🚫 không hoàn tác được.
       */
      name: 'seed_shop',
      dependencies: ['seed'],
      testMatch: /.*\.seed_shop\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_shop') },
    },
    {
      // 🔴 Nhân viên THỨ HAI của điểm bán seed — cần cho case đòi "cùng điểm bán còn người khác
      //    cũng có ca" (`050_005`) và cho cú chặn bán hàng khi chưa mở ca (`060_002`).
      name: 'seed_gdv',
      dependencies: ['seed'],
      testMatch: /.*\.seed_gdv\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_gdv') },
    },
    {
      // Tài khoản cấp điểm bán KHÔNG được xếp ca hôm nay (điểm bán seed cũ `AUTO_SHOP_52295376`)
      // — cần cho `010_004` (ngày không có ca) và `060_001` (chưa xếp lịch thì không bán được).
      name: 'seed_shop2',
      dependencies: ['setup'],
      testMatch: /.*\.seed_shop2\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('seed_shop2') },
    },
    {
      // Case ĐỌC của vai gdv trên điểm bán thật — 🚫 không ghi gì, giữ nguyên.
      name: 'gdv',
      dependencies: ['setup'],
      testMatch: /.*\.gdv\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('gdv') },
    },
    {
      name: 'province',
      dependencies: ['setup'],
      testMatch: /.*\.province\.spec\.js/,
      use: { ...devices['Desktop Chrome'], storageState: storageStateFor('province') },
    },
  ],
});
