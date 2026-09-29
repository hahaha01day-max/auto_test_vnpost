'use strict';

/**
 * 🧹 **DỌN RÁC do case GHI để lại** — 🚫 KHÔNG phải test case, 🚫 không mang mã case nào.
 *
 * 🔴 Chỉ dọn thứ mang tiền tố **`AUTOTEST_`** — tiền tố mà các case ghi dùng cho bản ghi dùng một
 *    lần rồi tự xoá. Case chết giữa chừng thì bản ghi ở lại (đã xảy ra: nhóm NCC
 *    `AUTOTEST_NHOM_80591415_SUA` của lượt chạy đỏ 22/09 🚫 không được dọn).
 *
 * 🔴 🚫 TUYỆT ĐỐI KHÔNG đụng tiền tố **`AUTO_`**: đó là **dữ liệu nền** của bộ seed (sổ
 *    `00_seed/seed-state.json`) — điểm bán, nhân viên, sản phẩm, bảng giá, NCC, tồn kho đều gắn vào
 *    nó, và phần lớn 🚫 không dựng lại được (tồn đầu kỳ chỉ khai một lần cho mỗi điểm bán; điểm bán
 *    và nhân viên 🚫 không có chức năng xoá). Xoá nhầm là hỏng cả bộ test, 🚫 không có đường lùi.
 *
 * 🔴 Chỉ dọn những thứ **XOÁ ĐƯỢC trên giao diện**: nhóm NCC, nhà cung cấp. Danh mục và sản phẩm
 *    nền do seed tạo mang tiền tố `AUTO_` nên 🚫 không thuộc phạm vi ở đây.
 *
 *   node tool/bin/seed-clean.js            # chạy thử — chỉ LIỆT KÊ, 🚫 không xoá gì
 *   node tool/bin/seed-clean.js --ap-dung  # xoá thật
 */

const { test, expect } = require('@playwright/test');
const { chuan, khung, moMan, moNhomNCC, tim } = require('../../12_1_ho_so_nha_cung_cap/tests/supplier-page');

const VAI = 'tct';

/** 🔴 Tiền tố rác — 🚫 KHÔNG đổi thành `AUTO_`. Xem cảnh báo đầu file. */
const TIEN_TO_RAC = 'AUTOTEST_';

/** Mặc định chỉ liệt kê. Xoá thật khi `VNPOST_CLEAN_APPLY=1`. */
const XOA_THAT = process.env.VNPOST_CLEAN_APPLY === '1';

test.describe('🧹 Dọn rác AUTOTEST_ — thứ xoá được', () => {
  test('don: nhóm nhà cung cấp mang tiền tố AUTOTEST_', async ({ page }) => {
    test.setTimeout(300_000);
    await moMan(page, VAI);
    const ghi = (mo) => test.info().annotations.push({ type: 'dọn rác', description: mo });

    await moNhomNCC(page);
    const oTimNhom = page.getByPlaceholder('Tìm kiếm').first();
    await oTimNhom.fill(TIEN_TO_RAC);
    await page.waitForTimeout(3_000);

    const dongRac = () => page.getByRole('row').filter({ hasText: TIEN_TO_RAC });
    const so = await dongRac().count();
    if (so === 0) {
      ghi(`🚫 Không còn nhóm NCC nào mang tiền tố "${TIEN_TO_RAC}".`);
      return;
    }

    const ten = (await dongRac().allInnerTexts()).map(chuan);
    ghi(`Tìm thấy ${so} nhóm NCC rác: ${ten.join(' | ').slice(0, 400)}`);
    if (!XOA_THAT) {
      ghi('Chạy thử — 🚫 chưa xoá gì. Dùng `--ap-dung` để xoá thật.');
      return;
    }

    let daXoa = 0;
    // 🔴 Xoá TỪNG dòng rồi tìm lại: bảng dựng lại sau mỗi lần xoá, giữ locator cũ là "element is
    //    not attached to the DOM" ngay ở vòng thứ hai.
    for (let vong = 0; vong < so; vong += 1) {
      await oTimNhom.fill(TIEN_TO_RAC);
      await page.waitForTimeout(2_000);
      const hang = dongRac().first();
      if ((await hang.count()) === 0) break;
      const nhan = chuan(await hang.innerText());

      const cho = page.waitForResponse(
        (r) => /supplier-groups/.test(r.url()) && r.request().method() === 'DELETE',
        { timeout: 30_000 },
      );
      // 🔴 Nút xoá của bảng nhóm NCC mang icon **close**, 🚫 không phải `anticon-delete`.
      const nutXoa = hang.locator('button:has(.anticon-close), button:has(.anticon-delete)');
      await ((await nutXoa.count()) > 0 ? nutXoa.first() : hang.getByRole('button').last()).click({
        force: true,
      });
      const xacNhan = page
        .locator('.ant-popconfirm:visible, .ant-popover:visible, .ant-modal-confirm')
        .last();
      await xacNhan.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
      await xacNhan
        .getByRole('button', { name: /Đồng ý|Xác nhận|OK|Xoá|Xóa/ })
        .first()
        .click()
        .catch(() => {});
      const res = await cho.catch(() => null);
      if (res && res.status() < 400) {
        daXoa += 1;
        ghi(`Đã xoá nhóm "${nhan}".`);
      } else {
        ghi(`🔴 🚫 Không xoá được nhóm "${nhan}" — bỏ qua, xoá tay hoặc xem nhóm còn NCC gắn vào.`);
        break;
      }
    }

    expect(daXoa, 'Có nhóm rác nhưng 🚫 không xoá được cái nào').toBeGreaterThan(0);
  });
});
