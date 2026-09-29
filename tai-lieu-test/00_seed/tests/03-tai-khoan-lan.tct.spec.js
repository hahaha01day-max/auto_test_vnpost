'use strict';

/**
 * Bước 3 (chỉ chạy khi có LÀN) — BỘ TÀI KHOẢN RIÊNG của làn: TCT · Tỉnh · Cửa hàng trưởng · GDV.
 *
 * 🔴 Vì sao phải có: nhiều phiên chạy song song mà dùng chung một tài khoản thì hệ thống xoay vòng
 *    refresh token ⇒ phiên này đăng nhập là phiên kia mất phiên, test treo ở `waitForResponse`
 *    trông như lỗi locator. Mỗi làn một bộ tài khoản là hết giẫm nhau. Xem `tai-lieu-test/LANE.md`.
 *
 * 🔴 MỖI TÀI KHOẢN ĐÚNG MỘT VAI. Tài khoản mang nhiều vai trên cùng một đơn vị làm API trả
 *    `SSHOP-401` dù vai đang chọn đủ quyền (lý do `seed_gdv` phải là tài khoản một vai).
 *
 * 🔴 Chỉ dùng vai trò CÓ SẴN (`AUTHEN.TBL_CHAIN_ROLE`, chuỗi 626): vai tự tạo ra đời với
 *    `scopes: {}` ⇒ đăng nhập xong kẹt vòng lặp câm ở màn chọn điểm bán.
 *
 * 🚫 Không xoá được nhân viên ⇒ tài khoản ở lại vĩnh viễn. Chạy lại bước này là đẻ thêm bộ mới.
 */

const { test, expect } = require('@playwright/test');
const {
  dienDongVaiTro,
  moDanhSach,
  moDrawerThem,
  themDongVaiTro,
  timKiem,
} = require('../../02_quan_ly_nhan_vien/tests/employee-page');
const { LANE } = require('../../shared/config');
const { doc, ghi, lay, PREFIX, PREFIX_MA, runId } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

/** Đơn vị gốc cấp Tổng công ty — `VNPOST_CORE.ORGANIZATION_UNIT` id 14, mã `VNPOST`. */
const TEN_TCT = process.env.VNPOST_LANE_TCT_UNIT || 'Tong cong ty Buu dien Viet Nam';

/** `vai` = khoá trong `shared/auth/accounts.js`; `donVi` đọc từ sổ lúc chạy. */
const TAI_KHOAN = [
  { vai: 'tct', hau: 'TCT', vaiTro: 'Admin', donVi: () => TEN_TCT },
  { vai: 'province', hau: 'QLT', vaiTro: 'Quản lý tỉnh', donVi: () => lay('toChuc', 'tenTinh') },
  { vai: 'shop', hau: 'CHT', vaiTro: 'Cửa hàng trưởng', donVi: () => lay('diemBan', 'tenShop') },
  { vai: 'gdv', hau: 'GDV', vaiTro: 'Giao dịch viên', donVi: () => lay('diemBan', 'tenShop') },
];

for (const [i, tk] of TAI_KHOAN.entries()) {
  test(`seed 3.${3 + i} — tài khoản làn vai ${tk.vai} (${tk.vaiTro})`, async ({ page }) => {
    test.skip(!LANE, 'Chỉ chạy khi đặt VNPOST_LANE — bộ chung không cần tài khoản riêng.');
    const daCo = (doc().duLieu.taiKhoanLan || {})[tk.vai];
    test.skip(Boolean(daCo), `Làn ${LANE} đã có tài khoản ${tk.vai} (${daCo?.tenDangNhap}) — 🚫 không đẻ thêm.`);

    const id = runId();
    const maNv = `${PREFIX_MA}${tk.hau}${id}`;
    const tenDangNhap = maNv.toLowerCase();
    const tenNv = `${PREFIX}${tk.hau}_${id}`;
    // Số điện thoại là khoá nghiệp vụ — mỗi tài khoản một số, 🚫 trùng là backend chặn.
    const sdt = `09${String(Number(id) + i + 1).padStart(8, '0').slice(-8)}`;
    const donVi = tk.donVi();

    await moDanhSach(page, 'tct');
    const dr = await moDrawerThem(page);
    await dr.locator('#employeeCode').fill(maNv);
    await dr.locator('#username').fill(tenDangNhap);
    await dr.locator('#name').fill(tenNv);
    await dr.locator('#phone').fill(sdt);
    await themDongVaiTro(dr);
    await dienDongVaiTro(page, dr, { donVi, vaiTro: tk.vaiTro, dong: 0 });

    const cho = page.waitForResponse(
      (r) => r.url().includes('chain-employment-profile') && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await dr.getByRole('button', { name: 'Lưu' }).click();
    const body = await (await cho).json();
    expect(String(body?.status?.code), `Backend từ chối tạo ${tk.vai}: ${body?.status?.message}`).toBe('200');

    await expect(page.locator('.ant-drawer-open')).toHaveCount(0, { timeout: 20_000 });
    await timKiem(page, maNv);

    ghi('taiKhoanLan', { [tk.vai]: { tenDangNhap, maNhanVien: maNv, donVi, vaiTro: tk.vaiTro } });
  });
}
