'use strict';

/**
 * 03b — **chặn bán hàng khi chưa mở ca** và **báo cáo ca chỉ của chính mình**, chạy bằng
 * **nhân viên THỨ HAI của điểm bán seed** (vai `seed_gdv`).
 *
 * 🔴 Vì sao phải là người thứ hai: `03b_050_005` đòi *"cùng điểm bán còn nhân viên khác cũng có ca
 *    trong ngày"* — một tài khoản 🚫 không dựng được tình huống đó. Bộ dựng nền
 *    `seed-ca-hom-nay.shop.spec.js` xếp ca hôm nay cho **cả hai** người.
 *
 * 🔴 Lý do chặn cũ của `03b_060_00x` (*"SĐT nằm trong danh sách bỏ qua hardcode ở routes/helpers.js"*)
 *    **đã lỗi thời**: đo 23/09/2026, `orderGuard` trong `src/routes/helpers.js` chỉ còn xét
 *    **cấp đơn vị** (`isShopLevel`) và **ca ở trạng thái OPEN** — 🚫 không còn danh sách số điện
 *    thoại nào. Giữ nguyên lý do cũ là treo case vĩnh viễn vì một điều kiện 🚫 không còn tồn tại.
 *
 * 🚫 Nhóm case ở đây **KHÔNG mở ca, KHÔNG ghi quỹ** — chỉ đọc màn và kiểm cú chặn điều hướng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason, storageStateFor } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');
const { chuan, khungMan, moManCaCaNhan, soTheCa } = require('./shift-card');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_gdv';

const chanNeuTat = (id) => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
  const i = loadCaseInput(GOC, id);
  const ly = skipReason(i);
  test.skip(Boolean(ly), ly ?? '');
  return i;
};

test.describe('03b · 060 — chặn vào màn bán hàng khi chưa mở ca', () => {
  test('03b_060_002 — Đã xếp lịch nhưng chưa mở ca thì không vào được màn tạo đơn', async ({
    page,
  }) => {
    chanNeuTat('03b_060_002');
    test.setTimeout(180_000);

    // Tiền đề: hôm nay CÓ ca (bộ dựng nền xếp) nhưng người này CHƯA mở ca nào.
    await moManCaCaNhan(page, VAI);
    const so = await soTheCa(page);
    test.skip(
      so === 0,
      'Tài khoản này 🚫 không có ca hôm nay — bộ dựng nền `seed-ca-hom-nay` phải chạy trước.',
    );
    const daMoCa = await khungMan(page)
      .getByRole('button', { name: /^(Chốt ca|Tiếp tục chốt|In chốt ca)$/ })
      .count();
    test.skip(
      daMoCa > 0,
      'Tài khoản này đã mở/chốt ca hôm nay ⇒ 🚫 không còn ở trạng thái "đã xếp lịch, chưa mở ca". '
        + 'Trạng thái đó chỉ quay lại ở một ngày khác.',
    );

    // Mở THẲNG đường dẫn tạo đơn — đúng thao tác của sheet.
    await moTrang(page, '/order/create-order', VAI);
    await page.waitForTimeout(3_000);

    /**
     * 🔴 Hai vế, phải kiểm CẢ HAI:
     *   1. hiện cảnh báo *"Yêu cầu mở ca trước khi bán hàng"* (`showOpenShiftModal`);
     *   2. **🚫 không ở lại** `/order/create-order` — chỉ kiểm vế 1 là pass giả, vì modal có thể
     *      hiện mà trang vẫn vào được.
     */
    const chu = chuan(await page.locator('body').innerText());
    const coCanhBao = /Yêu cầu mở ca trước khi bán hàng|cần mở ca làm việc trước/i.test(chu);
    expect(
      coCanhBao,
      `Chưa mở ca mà vào màn tạo đơn 🚫 không thấy cảnh báo nào. Nội dung trang: ${chu.slice(0, 300)}`,
    ).toBe(true);

    // Đóng cảnh báo rồi kiểm đã bị đẩy khỏi màn tạo đơn.
    await page.getByRole('button', { name: 'Đã hiểu' }).first().click().catch(() => {});
    await expect
      .poll(() => page.url(), {
        message: '🔴 Chưa mở ca mà VẪN Ở LẠI màn tạo đơn — cú chặn 🚫 không có tác dụng',
        timeout: 20_000,
      })
      .not.toMatch(/\/order\/create-order/);
  });
});

test.describe('03b · 050 — báo cáo ca theo tài khoản đang đăng nhập', () => {
  test('03b_050_005 — Báo cáo ca chỉ hiện số liệu của tài khoản đang đăng nhập', async ({
    page,
    browser,
  }) => {
    chanNeuTat('03b_050_005');
    test.setTimeout(240_000);

    // Người thứ hai (vai này).
    await moManCaCaNhan(page, VAI);
    test.skip(
      (await soTheCa(page)) === 0,
      'Tài khoản thứ hai 🚫 không có ca hôm nay — bộ dựng nền phải chạy trước.',
    );
    const chuNguoiHai = chuan(await khungMan(page).innerText());

    /**
     * 🔴 Người thứ nhất phải mở trong **CONTEXT RIÊNG**, 🚫 KHÔNG gọi `moTrang(page, …, 'seed_shop')`
     *    trên cùng `page`: phiên của người thứ hai vẫn còn sống nên `moTrang` 🚫 không đăng nhập
     *    lại — màn hiện ra vẫn là của người thứ hai, hai chuỗi giống hệt nhau, và case đỏ với lý do
     *    *"báo cáo không lọc theo người đăng nhập"* trong khi sản phẩm 🚫 không hề sai.
     */
    const ctx = await browser.newContext({ storageState: storageStateFor('seed_shop') });
    const page2 = await ctx.newPage();
    let chuNguoiMot = '';
    try {
      await moTrang(page2, '/lich-ca-nhan/ca-lam-viec', 'seed_shop');
      await page2.waitForTimeout(3_000);
      chuNguoiMot = chuan(await khungMan(page2).innerText());
    } finally {
      await ctx.close();
    }

    expect(
      chuNguoiMot,
      '🔴 Hai tài khoản khác nhau ở cùng điểm bán mà màn Ca làm việc hiện **y hệt nhau** ⇒ báo cáo '
        + '🚫 không lọc theo người đang đăng nhập.',
    ).not.toBe(chuNguoiHai);

    // Và mỗi màn chỉ được nhắc tên của chính người đang đăng nhập (nếu màn có hiện tên).
    const ten2 = (process.env.VNPOST_ACCOUNT_SEED_GDV || '').replace(/\D/g, '');
    if (ten2 && chuNguoiMot.includes(`AUTO_NV_${ten2}`)) {
      expect(
        false,
        `🔴 Màn của người thứ nhất lại hiện tên người thứ hai (AUTO_NV_${ten2}) — số liệu lẫn giữa `
          + 'hai nhân viên cùng điểm bán.',
      ).toBe(true);
    }
  });
});
