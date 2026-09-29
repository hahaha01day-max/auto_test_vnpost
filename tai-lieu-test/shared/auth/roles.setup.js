const fs = require('node:fs');
const { test: setup } = require('@playwright/test');
const { AUTH_DIR } = require('../config');
const { ROLES, isConfigured, storageStateFor } = require('./accounts');
const { dangNhapVai } = require('./login');

/**
 * Đăng nhập MỘT LẦN cho từng vai rồi lưu session ra `.auth/<vai>.json`.
 *
 * 🔴 Vai nào chưa khai tài khoản trong `.env` thì **skip có lý do**, 🚫 không fail cả bộ:
 * một luồng thường chỉ cần 2–3 vai, bắt khai đủ 5 vai mới chạy được là chặn nhầm.
 * Nhưng case nào **đòi** vai đó vẫn phải skip kèm lý do (xem `missingRoleReason`),
 * 🚫 không được lặng lẽ pass bằng session của vai khác.
 *
 * 🔴 Mỗi vai một file session riêng. Dùng chung một file là hai vai ghi đè nhau, và
 * test chạy sau sẽ mang quyền của vai đăng nhập sau cùng — pass/fail trở thành ngẫu nhiên
 * theo thứ tự chạy, thứ khó truy nhất trong một bộ test.
 *
 * ⚠️ File session này chỉ dùng được cho TEST ĐẦU TIÊN của mỗi vai: hệ thống xoay vòng refresh token.
 * Spec phải mở trang bằng `moTrang(page, url, vai)` để tự đăng nhập lại — xem `login.js`.
 */
/**
 * 🔴 `VNPOST_SETUP_ROLES` (danh sách vai, ngăn bằng dấu phẩy) giới hạn số vai phải đăng nhập.
 * Không đặt thì đăng nhập tất cả vai đã khai như trước. Một phân hệ thường chỉ cần 2–3 vai;
 * đăng nhập thừa vừa tốn ~7s mỗi vai vừa làm đỏ cả lượt chạy khi vai không ai dùng bị lỗi.
 */
const CHI_VAI = (process.env.VNPOST_SETUP_ROLES || '')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

/**
 * ⭐ 24/09/2026 — setup LƯỜI (mặc định): KHÔNG đăng nhập trước, chỉ bảo đảm có file `.auth/<vai>.json`
 * (file rỗng nếu chưa có) để `browser.newContext({ storageState })` mở được. Vai nào thật sự được dùng
 * thì `moTrang` tự đăng nhập ở lần mở màn đầu tiên — vốn đã phải làm vậy vì refresh token xoay vòng.
 * Trước đây mỗi lượt đăng nhập đủ ~15 vai (~90s) dù case chỉ dùng 1–2 vai.
 * `VNPOST_SETUP_LOGIN=1` ⇒ đăng nhập sẵn như cũ (dùng khi muốn kiểm tài khoản / phạm vi của mọi vai).
 */
const DANG_NHAP_SAN = /^(1|true)$/i.test(process.env.VNPOST_SETUP_LOGIN || '');

for (const role of ROLES) {
  if (CHI_VAI.length && !CHI_VAI.includes(role.key)) continue;
  setup(`đăng nhập vai ${role.key} (${role.label})`, async ({ page }) => {
    setup.skip(
      !isConfigured(role.key),
      `Bỏ qua: chưa khai ${role.envAccount}/${role.envPassword} trong .env`,
    );

    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const file = storageStateFor(role.key);
    if (!DANG_NHAP_SAN) {
      if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({ cookies: [], origins: [] }));
      return;
    }
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dangNhapVai(page, role.key);
    await page.context().storageState({ path: file });
  });
}
