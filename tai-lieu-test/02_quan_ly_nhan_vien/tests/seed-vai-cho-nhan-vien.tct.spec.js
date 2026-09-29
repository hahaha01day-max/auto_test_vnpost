'use strict';

/**
 * 🌱 **DỰNG NỀN — gán vai dùng được cho nhân viên điểm bán seed cũ.** 🚫 Không mang mã case nào.
 *
 * 🔴 Vấn đề phải chữa: tài khoản `autonv53035557` (nhân viên của `AUTO_SHOP_52295376` — điểm bán
 *    **duy nhất còn CHƯA khai tồn đầu kỳ**, thứ cụm 04_2 bắt buộc phải có) chỉ mang vai
 *    `AUTO_VT_52981950`, và vai đó có **0 chức năng** (`TBL_ROLE_FUNCTION` đếm 0 ngày 23/09).
 *    Hậu quả: đăng nhập xong **kẹt vĩnh viễn ở màn chọn phạm vi**, Spin quay mãi, 🚫 không một
 *    thông báo nào — bước setup đỏ với "vẫn dừng ở màn chọn phạm vi" nghe như sai `.env`.
 *
 * 🔴 **SỬA vai của dòng đã có, 🚫 KHÔNG thêm dòng vai trò thứ hai.** Nhiều vai trên **cùng một đơn
 *    vị** làm API trả `SSHOP-401` dù vai đang chọn đủ quyền (token 🚫 không mang `roleId`) ⇒ tài
 *    khoản sẽ đăng nhập được nhưng mọi màn rỗng câm — còn tệ hơn tình trạng đang chữa.
 *
 * 🔴 Gán quyền phải làm **trên giao diện**, 🚫 KHÔNG bằng SQL: auth-service cache phân quyền vào
 *    Redis với TTL 30 ngày, sửa thẳng DB là dữ liệu đúng mà hệ thống vẫn chạy theo bản cache cũ.
 */

const { test, expect } = require('@playwright/test');
const { chonOption, chuan, dong, moChiTiet, moDanhSach, timKiem } = require('./employee-page');

const VAI = 'tct';
const MA_NHAN_VIEN = process.env.VNPOST_MA_NV_SEED2 || 'AUTONV53035557';
const VAI_CAN_GAN = 'Cửa hàng trưởng';

test.describe('🌱 Dựng nền 02 — vai dùng được cho nhân viên điểm bán seed cũ', () => {
  test('seed: nhân viên điểm bán seed cũ phải mang vai có quyền', async ({ page }) => {
    test.setTimeout(240_000);
    await moDanhSach(page, VAI);

    const ghi = (mo) => test.info().annotations.push({ type: 'dựng nền', description: mo });

    await timKiem(page, MA_NHAN_VIEN);
    const hang = dong(page).filter({ hasText: MA_NHAN_VIEN }).first();
    test.skip(
      (await hang.count()) === 0,
      `🚫 Không tìm thấy nhân viên "${MA_NHAN_VIEN}" — kiểm lại mã trong sổ seed.`,
    );

    if ((await hang.innerText()).includes(VAI_CAN_GAN)) {
      ghi(`Nhân viên "${MA_NHAN_VIEN}" đã mang vai "${VAI_CAN_GAN}" — 🚫 không sửa gì.`);
      return;
    }

    /**
     * 🔴 Bảng nhân viên **🚫 KHÔNG có cột Hành động** — 🚫 không có nút sửa trên dòng. Đường sửa duy
     *    nhất đi qua **trang chi tiết** (bấm link TÊN nhân viên) rồi nút "Chỉnh sửa". Bám nút icon
     *    trên dòng là `locator.click` hết timeout 15s mà 🚫 không nói nút đó không tồn tại.
     */
    const tim = await moChiTiet(page, MA_NHAN_VIEN);
    expect(tim, `🚫 Không mở được chi tiết nhân viên "${MA_NHAN_VIEN}"`).not.toBeNull();
    // 🔴 RACE: nút "Chỉnh sửa" gọi hàm của thẻ Thông tin cá nhân. Bấm trước khi thẻ nạp xong thì
    //    drawer vẫn mở nhưng mọi ô TRẮNG, và lưu lại là **xoá sạch dữ liệu cũ của nhân viên**.
    await expect(page.locator('.ant-tabs-tabpane-active')).toContainText(chuan(MA_NHAN_VIEN), {
      timeout: 30_000,
    });
    await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
    const dr = page.locator('.ant-drawer-open').last();
    await expect(dr.locator('.ant-drawer-title')).toHaveText('Chỉnh sửa nhân viên', {
      timeout: 20_000,
    });
    // Chờ GIÁ TRỊ CŨ về — 🚫 đừng đọc sớm, `setFieldsValue` chạy sau API chi tiết (~3–4s).
    await expect
      .poll(async () => (await dr.locator('#employeeCode').inputValue()).length, { timeout: 30_000 })
      .toBeGreaterThan(0);

    const oVaiTro = dr.locator('#roles_0_roleId');
    await expect(oVaiTro, 'Drawer sửa 🚫 không có dòng vai trò nào').toBeVisible({ timeout: 20_000 });
    await chonOption(page, oVaiTro, VAI_CAN_GAN);

    const cho = page.waitForResponse(
      (r) => /chain-employment-profile/.test(r.url()) && r.request().method() !== 'GET',
      { timeout: 60_000 },
    );
    await dr.getByRole('button', { name: /Xác nhận|Lưu/ }).last().click();
    const res = await cho;
    const body = await res.json().catch(() => null);
    expect(
      String(body?.status?.code),
      `Đổi vai cho "${MA_NHAN_VIEN}" thất bại: ${JSON.stringify(body?.status)}`,
    ).toBe('200');

    // 🔴 Sau khi lưu, trang vẫn là **chi tiết nhân viên** — ô tìm kiếm 🚫 không có ở đó và
    //    `timKiem` chết với `locator.fill timeout` DÙ việc gán vai đã thành công. Quay lại danh
    //    sách trước khi đối chiếu.
    await moDanhSach(page, VAI);
    await timKiem(page, MA_NHAN_VIEN);
    await expect(
      dong(page).filter({ hasText: MA_NHAN_VIEN }).first(),
      `Đổi vai trả 200 nhưng danh sách vẫn 🚫 chưa hiện "${VAI_CAN_GAN}"`,
    ).toContainText(VAI_CAN_GAN, { timeout: 20_000 });
    ghi(`Đã đổi vai của "${MA_NHAN_VIEN}" sang "${VAI_CAN_GAN}".`);
  });
});
