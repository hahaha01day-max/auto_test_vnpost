'use strict';

/**
 * Bước 3 — NHÂN VIÊN ở điểm bán đã seed, gắn một VAI TRÒ CÓ SẴN.
 *
 * 🔴 🚫 KHÔNG tạo vai trò mới. Vai trò tạo qua màn "Thêm vai trò" ra đời với **`scopes: {}`** —
 *    không một chức năng nào. Tài khoản gắn vai trò đó đăng nhập được nhưng 🚫 không vào nổi
 *    bên trong, và vì nó chỉ có ĐÚNG MỘT đơn vị nên rơi vào vòng lặp câm:
 *      `ShopPage` thấy 1 đơn vị ⇒ tự chọn ⇒ `navigate("/")`
 *      ⇒ `useChangeWorkingUnit` thấy quyền không dùng được ⇒ `navigate("/account?act=select-shop")`
 *      ⇒ `ShopPage` lại tự chọn ⇒ …
 *    Biểu hiện: `/chain-profile/get-list-chain-by-customer-id` bị gọi liên tục, lớp `Spin` phủ
 *    mãi không tắt, 🚫 KHÔNG có thông báo lỗi nào. Đo 22/09/2026 với `AUTO_VT_62391304`:
 *    `GET /auth/role/get-functions?roleId=66` trả `[{ id: 66, code: "...", scopes: {} }]`.
 *
 * 🔴 Tạo nhân viên là tạo **tài khoản đăng nhập thật**, và màn hình 🚫 KHÔNG có chức năng xoá
 *    (`02_quan_ly_nhan_vien/test-input.json` ghi rõ đây là lý do 8 case của phân hệ 02 bị khoá).
 *    Mỗi lượt seed tạo ĐÚNG MỘT nhân viên.
 */

const { test, expect } = require('@playwright/test');
const {
  dienDongVaiTro,
  moDanhSach,
  moDrawerThem,
  themDongVaiTro,
  timKiem,
} = require('../../02_quan_ly_nhan_vien/tests/employee-page');
const { ghi, lay, PREFIX, PREFIX_MA, runId } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

/**
 * Vai trò CÓ SẴN gán cho nhân viên seed. Đổi bằng `VNPOST_SEED_ROLE_NAME`.
 *
 * 🔴 Phải là **"Giao dịch viên"** (`SHOP_SALE`), 🚫 KHÔNG phải "Cửa hàng trưởng"
 *    (`SHOP_MANAGER`): đo trong `AUTHEN.TBL_ROLE_FUNCTION` ngày 22/09/2026 —
 *      SHOP_MANAGER · CREATE_IMPORT_STOCK · active = 0   ⇒ 🚫 KHÔNG có nút "Nhập kho"
 *      SHOP_MANAGER · CREATE_EXPORT_STOCK · active = 1   ⇒ chỉ có "Xuất kho"
 *      SHOP_SALE    · CREATE_IMPORT_STOCK · active = 1   ⇒ nhập kho được
 *    Nút "Nhập kho" là `PermissionButton permKey=create_import_stock`, thiếu quyền thì nút **ẩn
 *    hẳn** chứ không mờ đi ⇒ tìm theo nhãn ra 0 phần tử, lỗi đọc như "giao diện đổi".
 * 🔴 Số chức năng của mỗi vai (chuỗi 626, cấp DIEM_BAN): SHOP_MANAGER 176 · SHOP_SALE 64 ·
 *    SHOP_Employee 32. Vai do màn "Thêm vai trò" tạo ra: **0**.
 */
/**
 * 🔴 Phải gán CẢ HAI vai: không vai nào làm được cả hai việc bộ seed cần (đo
 *    `AUTHEN.TBL_ROLE_FUNCTION` 22/09/2026):
 *      `CREATE_IMPORT_STOCK`      (lập phiếu nhập kho) — chỉ SHOP_SALE
 *      `INVENTORY_OPENING_BALANCE` (tồn kho đầu kỳ)    — chỉ SHOP_MANAGER
 *    Thiếu vai nào thì việc tương ứng trả `SSHOP-401 Không có quyền truy cập`.
 * 🔴 Hệ quả: tài khoản seed có HAI dòng ở màn chọn điểm bán ⇒ đăng nhập phải chỉ rõ vai
 *    (`dangNhapNhanVienSeed(page, 'Cửa hàng trưởng')`), 🚫 không bấm dòng đầu gặp được.
 */
const VAI_TRO = (process.env.VNPOST_SEED_ROLE_NAMES || 'Giao dịch viên,Cửa hàng trưởng')
  .split(',')
  .map((x) => x.trim())
  .filter(Boolean);

test('seed 3.1 — chốt vai trò có sẵn cho nhân viên seed', async () => {
  // 🚫 KHÔNG gọi giao diện: đây chỉ là ghi vào sổ để bước 3.2 và các bước sau đọc lại.
  //    Vai trò có tồn tại hay không sẽ lộ ra ngay ở 3.2 khi chọn trong ô "Vai trò" — và lỗi
  //    ở đó liệt kê luôn danh sách vai đang có, đủ để sửa.
  ghi('nhanSu', {
    tenVaiTro: VAI_TRO[0],
    tenVaiTroPhu: VAI_TRO[1] || '',
    vaiTro: VAI_TRO.join(','),
    vaiTroTuTao: false,
  });
});

test('seed 3.2 — tạo nhân viên ở điểm bán đã seed, gắn vai trò vừa tạo', async ({ page }) => {
  const tenShop = lay('diemBan', 'tenShop');
  const vaiTro = String(lay('nhanSu', 'vaiTro')).split(',');

  const maNv = `${PREFIX_MA}NV${runId()}`;
  const tenDangNhap = `${PREFIX_MA.toLowerCase()}nv${runId()}`;
  const tenNv = `${PREFIX}NV_${runId()}`;
  // Số điện thoại là khoá nghiệp vụ — trùng là backend chặn. Lấy theo lượt seed cho khỏi đụng.
  const sdt = `09${runId()}`;

  await moDanhSach(page, 'tct');
  const dr = await moDrawerThem(page);

  await dr.locator('#employeeCode').fill(maNv);
  await dr.locator('#username').fill(tenDangNhap);
  await dr.locator('#name').fill(tenNv);
  await dr.locator('#phone').fill(sdt);

  // Mỗi vai một dòng: cùng điểm bán, khác vai trò.
  for (let i = 0; i < vaiTro.length; i += 1) {
    await themDongVaiTro(dr);
    await dienDongVaiTro(page, dr, { donVi: tenShop, vaiTro: vaiTro[i], dong: i });
  }

  const cho = page.waitForResponse(
    (r) => r.url().includes('chain-employment-profile') && r.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await dr.getByRole('button', { name: 'Lưu' }).click();
  const res = await cho;
  expect(String((await res.json())?.status?.code), 'Backend từ chối tạo nhân viên').toBe('200');

  await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 20_000 });
  await timKiem(page, maNv);

  ghi('nhanSu', { maNhanVien: maNv, tenNhanVien: tenNv, tenDangNhap, soDienThoai: sdt });
});
