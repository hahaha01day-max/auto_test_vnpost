'use strict';

/**
 * Bước 3 (API) — BỘ TÀI KHOẢN: TCT · Tỉnh · Cửa hàng trưởng · GDV, MỖI TÀI KHOẢN MỘT VAI.
 * Chuỗi request bám `pages/employee/addOrEditEmployeeModal/index.jsx:186-225` · `pages/employee/actions.js:66-78`:
 *   GET /auth/chain-role/get-all → POST /chain-employment-profile/v1.2/create.
 * 🔴 Một vai/tài khoản: tài khoản nhiều vai cùng đơn vị bị API trả `SSHOP-401` dù vai đủ quyền.
 * 🔴 Chỉ vai CÓ SẴN — vai tự tạo ra đời với `scopes: {}` ⇒ đăng nhập kẹt vòng lặp câm.
 * 🔴 FE đổi số `09…` thành `849…` (PhoneInput E.164 bỏ dấu +), birthday mặc định = hôm nay.
 * 🔴 Payload đối chiếu bằng request THẬT của FE (bắt rồi abort) — 🚫 đừng suy payload chỉ từ đọc JSX.
 * 🚫 Nhân viên không xoá được — chạy lại là đẻ tài khoản mới.
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { doc, ghi, kh, lay, PREFIX, runId, VAI_TRO } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

/** Đơn vị gán vai, theo cấp — đơn vị do bước 1–2 của CHÍNH bộ này tạo (TCT là gốc chung). */
const DON_VI = {
  TONG_CONG_TY: () => ({ orgUnitCode: 'VNPOST', orgUnitName: 'Tong cong ty Buu dien Viet Nam' }),
  BUU_DIEN_TINH: () => ({ orgUnitCode: lay('toChuc', 'maTinh'), orgUnitName: lay('toChuc', 'tenTinh') }),
  BUU_DIEN_XA: () => ({ orgUnitCode: lay('toChuc', 'maXa'), orgUnitName: lay('toChuc', 'tenXa') }),
  DIEM_BAN: () => ({ orgUnitCode: lay('diemBan', 'maShop'), orgUnitName: lay('diemBan', 'tenShop') }),
};

/**
 * 🔴 Mọi vai trò đang có trong DB (`00_seed/vai-tro.json`), mỗi vai MỘT tài khoản. Vai 0 chức năng
 *    và vai cấp POS_PLUS bị loại có lý do trong file đó — 🚫 đừng thêm lại mà không đọc lý do.
 */
const TAI_KHOAN = VAI_TRO.vai.map((v) => ({
  vai: v.vai, hau: v.hau.toUpperCase(), vaiTro: v.roleName, roleCode: v.roleCode, cap: v.cap,
  donVi: () => ({ ...DON_VI[v.cap](), orgUnitType: v.cap }),
}));

for (const [i, tk] of TAI_KHOAN.entries()) {
  test(`seed 3.${i + 1} — tài khoản vai ${tk.vai} (${tk.vaiTro})`, async ({ page }) => {
    const daCo = (doc().duLieu.taiKhoanLan || {})[tk.vai];
    test.skip(Boolean(daCo), `Đã có tài khoản ${tk.vai} (${daCo?.tenDangNhap}) — 🚫 không đẻ thêm.`);

    const { goi } = await moPhienApi(page, 'tct');
    const donVi = tk.donVi();
    const vaiTro = (await goi('GET', '/auth/chain-role/get-all', { params: { page: 0, size: 5000, sort: 'createdDate,desc' } }) || [])
      .find((r) => r.roleCode === tk.roleCode && r.active !== false);
    expect(vaiTro?.roleId, `DB không còn vai ${tk.roleCode} (${tk.vaiTro}) — sinh lại 00_seed/vai-tro.json`).toBeTruthy();

    const id = runId();
    const tenDangNhap = String(kh(`taiKhoan.${tk.vai}`)).trim();
    const maNv = tenDangNhap.toUpperCase();
    const tenNv = `${PREFIX}${tk.hau.toUpperCase()}`;
    const sdt = `849${String(Number(id) + i + 1).slice(-8)}`;

    const d = await goi('POST', '/chain-employment-profile/v1.2/create', {
      data: {
        employeeCode: maNv, username: tenDangNhap, name: tenNv, phone: sdt,
        startDate: null, birthday: Date.now(), image: [],
        // 🔴 Đúng payload FE bắt được 23/09 (route.abort): role CHỈ có 3 trường. Gửi thêm
        //    orgUnitName/orgUnitType/parentOrgUnitCode là backend trả `SSHOP-402 Truyền sai tham số`.
        roles: [{ orgUnitCode: donVi.orgUnitCode, roleId: vaiTro.roleId, status: 1 }],
      },
    });
    expect(d, 'Tạo nhân viên trả data rỗng').toBeTruthy();

    ghi('taiKhoanLan', { [tk.vai]: { tenDangNhap, maNhanVien: maNv, donVi: donVi.orgUnitName, vaiTro: tk.vaiTro, roleCode: tk.roleCode, cap: tk.cap } });
    // Khoá `nhanSu` cũ (các phân hệ đang đọc) trỏ vào Cửa hàng trưởng MỘT vai.
    if (tk.vai === 'shop') {
      ghi('nhanSu', {
        tenVaiTro: tk.vaiTro, tenVaiTroPhu: '', vaiTro: tk.vaiTro, vaiTroTuTao: false,
        maNhanVien: maNv, tenNhanVien: tenNv, tenDangNhap, soDienThoai: `0${sdt.slice(2)}`,
      });
    }
  });
}

/**
 * Sinh `.env.lane<n>` từ sổ ⇒ từ bước 4 làn chạy bằng TCT RIÊNG, 🚫 không còn đăng nhập tài khoản chung.
 * Mật khẩu mặc định nhân viên mới `123456` (đổi bằng VNPOST_SEED_PASSWORD).
 */
test('seed 3.99 — sinh file tài khoản của làn', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { LANE, PROJECT_ROOT } = require('../../shared/config');
  test.skip(!LANE, 'Không có làn — tài khoản chung nằm ở .env, 🚫 không ghi đè.');
  const { ROLES } = require('../../shared/auth/accounts');
  const tk = doc().duLieu.taiKhoanLan || {};
  const mk = process.env.VNPOST_SEED_PASSWORD || '123456';
  // Vai trong accounts.js → tài khoản trong sổ (kể cả bí danh `bi`, vd seed_shop = Cửa hàng trưởng).
  const theoVai = {};
  for (const v of VAI_TRO.vai) for (const k of [v.vai, ...(v.bi || [])]) if (tk[v.vai]) theoVai[k] = tk[v.vai];
  const dong = [];
  for (const r of ROLES) {
    const t = theoVai[r.key];
    dong.push(`${r.envAccount}=${t?.tenDangNhap || ''}`, `${r.envPassword}=${t ? mk : ''}`,
      `${r.envScope}=${t?.donVi || ''}`, `${r.envScope.replace('SCOPE_LABEL', 'ROLE_LABEL')}=`);
  }
  const noiDung = [
    `# Làn ${LANE} — SINH TỰ ĐỘNG bởi seed 3.99 (API). Xem tai-lieu-test/LANE.md`,
    `VNPOST_SETUP_ROLES=${Object.keys(theoVai).join(',')}`,
    ...dong,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(PROJECT_ROOT, `.env.lane${LANE}`), noiDung, 'utf8');
});
