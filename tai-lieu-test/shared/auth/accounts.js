const path = require('node:path');
const { AUTH_DIR } = require('../config');

/**
 * Danh mục TÀI KHOẢN THEO VAI cho auto test.
 *
 * 🔴 Vì sao phải tách theo vai, không dùng một tài khoản cho cả luồng:
 * phạm vi dữ liệu của VNPost lọc theo **cấp đơn vị của người đăng nhập**
 * (`payload.orgUnitType`), và nhiều bước nghiệp vụ **cố ý** chỉ một vai làm được —
 * điểm bán lập phiếu, Tỉnh xác nhận, Tỉnh duyệt nợ đầu kỳ, hai cấp ký biên bản.
 * Chạy cả luồng bằng một tài khoản thì hoặc là 403, hoặc tệ hơn: **pass giả** vì
 * tài khoản quá quyền làm được cả hai đầu, che mất đúng lỗi phân quyền cần bắt.
 *
 * 🚫 KHÔNG đặt tài khoản/mật khẩu trong `test-input.json` hay trong spec. Secret chỉ
 * nằm ở `.env` / `.env.accounts` (đã gitignore). File này chỉ khai BẢN ĐỒ tên biến.
 *
 * Mỗi vai đăng nhập một lần rồi lưu session riêng ở `.auth/<key>.json`, nên thêm vai
 * không làm chậm bộ test: `roles.setup.js` chỉ đăng nhập những vai **thực sự được khai**.
 */

/** @typedef {{key:string,label:string,orgUnitType:string,envAccount:string,envPassword:string,envScope:string,viec:string}} VaiTest */

/** @type {VaiTest[]} */
const ROLES = [
  {
    key: 'tct',
    label: 'Tổng công ty',
    orgUnitType: 'TONG_CONG_TY',
    envAccount: 'VNPOST_ACCOUNT',
    envPassword: 'VNPOST_PASSWORD',
    envScope: 'VNPOST_SCOPE_LABEL',
    viec: 'xem toàn mạng lưới, ký biên bản đầu Tổng công ty',
  },
  {
    key: 'province',
    label: 'Kế toán Bưu điện Tỉnh',
    orgUnitType: 'BUU_DIEN_TINH',
    envAccount: 'VNPOST_ACCOUNT_PROVINCE',
    envPassword: 'VNPOST_PASSWORD_PROVINCE',
    envScope: 'VNPOST_SCOPE_LABEL_PROVINCE',
    viec: 'lập chuyến, kiểm đếm, duyệt nợ đầu kỳ, mở và ký kỳ đối soát',
  },
  {
    key: 'province_manager',
    label: 'Quản lý Bưu điện Tỉnh',
    orgUnitType: 'BUU_DIEN_TINH',
    envAccount: 'VNPOST_ACCOUNT_PROVINCE_MANAGER',
    envPassword: 'VNPOST_PASSWORD_PROVINCE_MANAGER',
    envScope: 'VNPOST_SCOPE_LABEL_PROVINCE_MANAGER',
    viec: 'phê duyệt cấp Tỉnh — tách khỏi kế toán Tỉnh để bắt lỗi một người vừa lập vừa duyệt',
  },
  {
    key: 'ward',
    label: 'Bưu điện Xã',
    orgUnitType: 'BUU_DIEN_XA',
    envAccount: 'VNPOST_ACCOUNT_WARD',
    envPassword: 'VNPOST_PASSWORD_WARD',
    envScope: 'VNPOST_SCOPE_LABEL_WARD',
    viec: 'xem các điểm bán trong xã — chủ yếu dùng cho ca kiểm PHẠM VI',
  },
  {
    key: 'shop',
    label: 'Quản lý điểm bán',
    orgUnitType: 'DIEM_BAN',
    envAccount: 'VNPOST_ACCOUNT_SHOP',
    envPassword: 'VNPOST_PASSWORD_SHOP',
    envScope: 'VNPOST_SCOPE_LABEL_SHOP',
    viec: 'duyệt chênh lệch két, lập phiếu nộp tiền, bàn giao, chốt ngày, khai nợ đầu kỳ',
  },
  {
    /**
     * 🔴 Nhân viên của **điểm bán do bộ seed tự dựng** (`AUTO_SHOP_*`, sổ `00_seed/seed-state.json`
     *    nhóm `nhanSu`) — 🚫 KHÔNG phải điểm bán thật.
     *
     * Vì sao phải có vai riêng: nhóm case vòng đời ca (mở ca · tạm chốt · chốt) **ghi quỹ tiền mặt
     * thật và khoá số liệu ca**. Chạy bằng `gdv`/`shop` là ghi thẳng vào điểm bán Lý Sơn — dữ liệu
     * vận hành thật, 🚫 không hoàn tác được. Mọi thao tác ghi tiền phải rơi vào điểm bán seed.
     */
    key: 'seed_shop',
    label: 'Nhân viên điểm bán seed (AUTO_SHOP)',
    orgUnitType: 'DIEM_BAN',
    envAccount: 'VNPOST_ACCOUNT_SEED_SHOP',
    envPassword: 'VNPOST_PASSWORD_SEED_SHOP',
    envScope: 'VNPOST_SCOPE_LABEL_SEED_SHOP',
    viec: 'mọi case GHI TIỀN (mở/chốt ca, quỹ) — chạy trên điểm bán seed, không đụng dữ liệu thật',
  },
  {
    /**
     * 🔴 Nhân viên điểm bán seed dùng cho cụm case 04_2 (tồn đầu kỳ). Bộ dữ liệu seed trỏ vai này
     *    vào **Cửa hàng trưởng của chính điểm bán seed** (`00_seed/vai-tro.json`, bí danh của `shop`).
     *    Tồn đầu kỳ khai được **nhiều lần cho một điểm bán**, backend chỉ chặn sản phẩm/biến thể
     *    ĐÃ có tồn đầu kỳ hoặc đã có phiếu nhập ở kho đó (`hasOpeningBalanceForProduct`) ⇒ case 04_2
     *    phải khai sản phẩm CHƯA khai ở điểm bán (seed bước 8 đã khai SP chính, FIFO, Giá tiêu chuẩn).
     */
    key: 'seed_shop2',
    label: 'Nhân viên điểm bán seed (tồn đầu kỳ)',
    orgUnitType: 'DIEM_BAN',
    envAccount: 'VNPOST_ACCOUNT_SEED_SHOP2',
    envPassword: 'VNPOST_PASSWORD_SEED_SHOP2',
    envScope: 'VNPOST_SCOPE_LABEL_SEED_SHOP2',
    viec: 'cụm 04_2 tồn kho đầu kỳ — mỗi sản phẩm/biến thể chỉ khai được một lần tại một kho',
  },
  {
    /**
     * 🔴 **Giao dịch viên** của điểm bán seed — 🚫 KHÔNG thay được bằng `seed_shop`:
     *    `SHOP_MANAGER` (Cửa hàng trưởng) bị **tắt `CREATE_IMPORT_STOCK`**, tức CHT 🚫 không nhập
     *    kho được. Cụm 04_3 (nhập / xuất / chuyển kho) phải chạy bằng vai này.
     *
     * 🔴 Chọn `autonv64359388` vì nó mang **đúng MỘT vai** ở điểm bán đó. Tài khoản mang nhiều vai
     *    trên cùng một đơn vị làm API trả `SSHOP-401` dù vai đang chọn đủ quyền ⇒ màn rỗng câm.
     */
    key: 'seed_gdv',
    label: 'Giao dịch viên điểm bán seed',
    orgUnitType: 'DIEM_BAN',
    envAccount: 'VNPOST_ACCOUNT_SEED_GDV',
    envPassword: 'VNPOST_PASSWORD_SEED_GDV',
    envScope: 'VNPOST_SCOPE_LABEL_SEED_GDV',
    viec: 'nhập/xuất/chuyển kho, bán hàng — mọi thao tác GHI TỒN trên điểm bán seed',
  },
  {
    // Seed tạo (00_seed/vai-tro.json) — mỗi vai trò trong DB một tài khoản.
    key: 'tct_cung_ung',
    label: 'Quản lý cung ứng Tổng công ty',
    orgUnitType: 'TONG_CONG_TY',
    envAccount: 'VNPOST_ACCOUNT_TCT_CUNG_UNG',
    envPassword: 'VNPOST_PASSWORD_TCT_CUNG_UNG',
    envScope: 'VNPOST_SCOPE_LABEL_TCT_CUNG_UNG',
    viec: 'vai CORP_SUPPLY_CHAIN — kiểm phân quyền cung ứng cấp TCT',
  },
  {
    // Seed tạo (00_seed/vai-tro.json) — mỗi vai trò trong DB một tài khoản.
    key: 'tct_ke_toan',
    label: 'Kế toán Tổng công ty',
    orgUnitType: 'TONG_CONG_TY',
    envAccount: 'VNPOST_ACCOUNT_TCT_KE_TOAN',
    envPassword: 'VNPOST_PASSWORD_TCT_KE_TOAN',
    envScope: 'VNPOST_SCOPE_LABEL_TCT_KE_TOAN',
    viec: 'vai CORP_ACCOUNTANT — kiểm phân quyền kế toán cấp TCT',
  },
  {
    // Seed tạo (00_seed/vai-tro.json) — mỗi vai trò trong DB một tài khoản.
    key: 'tct_marketing',
    label: 'Marketing Tổng công ty',
    orgUnitType: 'TONG_CONG_TY',
    envAccount: 'VNPOST_ACCOUNT_TCT_MARKETING',
    envPassword: 'VNPOST_PASSWORD_TCT_MARKETING',
    envScope: 'VNPOST_SCOPE_LABEL_TCT_MARKETING',
    viec: 'vai CORP_FINANCE (nhãn Marketing)',
  },
  {
    // Seed tạo (00_seed/vai-tro.json) — mỗi vai trò trong DB một tài khoản.
    key: 'province_cung_ung',
    label: 'Quản lý cung ứng Tỉnh',
    orgUnitType: 'BUU_DIEN_TINH',
    envAccount: 'VNPOST_ACCOUNT_PROVINCE_CUNG_UNG',
    envPassword: 'VNPOST_PASSWORD_PROVINCE_CUNG_UNG',
    envScope: 'VNPOST_SCOPE_LABEL_PROVINCE_CUNG_UNG',
    viec: 'vai PROVINCE_SUPPLY_CHAIN',
  },
  {
    // Seed tạo (00_seed/vai-tro.json) — mỗi vai trò trong DB một tài khoản.
    key: 'province_ke_toan',
    label: 'Kế toán Tỉnh (vai PROVINCE_ACCOUNTANT)',
    orgUnitType: 'BUU_DIEN_TINH',
    envAccount: 'VNPOST_ACCOUNT_PROVINCE_KE_TOAN',
    envPassword: 'VNPOST_PASSWORD_PROVINCE_KE_TOAN',
    envScope: 'VNPOST_SCOPE_LABEL_PROVINCE_KE_TOAN',
    viec: 'vai PROVINCE_ACCOUNTANT — tách khỏi `province` (đang là Quản lý tỉnh)',
  },
  {
    // Seed tạo (00_seed/vai-tro.json) — mỗi vai trò trong DB một tài khoản.
    key: 'shop_nhan_vien',
    label: 'Nhân viên khác điểm bán',
    orgUnitType: 'DIEM_BAN',
    envAccount: 'VNPOST_ACCOUNT_SHOP_NHAN_VIEN',
    envPassword: 'VNPOST_PASSWORD_SHOP_NHAN_VIEN',
    envScope: 'VNPOST_SCOPE_LABEL_SHOP_NHAN_VIEN',
    viec: 'vai SHOP_Employee',
  },
  {
    key: 'gdv',
    label: 'Giao dịch viên',
    orgUnitType: 'DIEM_BAN',
    envAccount: 'VNPOST_ACCOUNT_GDV',
    envPassword: 'VNPOST_PASSWORD_GDV',
    envScope: 'VNPOST_SCOPE_LABEL_GDV',
    viec: 'mở ca, bán hàng, kiểm đếm, kết ca',
  },
];

const ROLE_BY_KEY = new Map(ROLES.map((role) => [role.key, role]));

function getRole(key) {
  const role = ROLE_BY_KEY.get(key);
  if (!role) {
    throw new Error(
      `Vai "${key}" không có trong danh mục. Vai hợp lệ: ${ROLES.map((r) => r.key).join(', ')}.`,
    );
  }
  return role;
}

/** Session của một vai. Truyền vào `use.storageState` của project trong playwright.config.js. */
function storageStateFor(key) {
  return path.join(AUTH_DIR, `${getRole(key).key}.json`);
}

/** Tài khoản đã khai đủ trong .env chưa — 🚫 không ném lỗi, để nơi gọi tự quyết skip hay fail. */
function isConfigured(key) {
  const role = getRole(key);
  return Boolean(process.env[role.envAccount] && process.env[role.envPassword]);
}

function credentialsFor(key) {
  const role = getRole(key);
  if (!isConfigured(key)) {
    throw new Error(
      `Vai "${role.key}" (${role.label}) chưa có tài khoản. Khai ${role.envAccount} và ` +
        `${role.envPassword} trong .env (mẫu: .env.accounts.example).`,
    );
  }
  // 🔴 Màn chọn phạm vi liệt kê MỘT DÒNG cho mỗi cặp (đơn vị × vai), và tên đơn vị cha còn xuất hiện
  //    lần nữa làm PHỤ ĐỀ của các đơn vị con ("Bưu điện Hoàn Kiếm" / phụ đề "Bưu điện Hà Nội HN").
  //    Vì vậy tên đơn vị KHÔNG đủ để xác định dòng: phải kèm nhãn vai bên phải ("Quản lý tỉnh",
  //    "Giám đốc xã", "Cửa hàng trưởng", "Admin"). Khai thêm VNPOST_ROLE_LABEL_<VAI> khi tài khoản
  //    có nhiều dòng dễ lẫn — 🚫 đừng để bước đăng nhập tự chọn dòng đầu tiên nó gặp.
  const envRole = role.envScope.replace('SCOPE_LABEL', 'ROLE_LABEL');
  return {
    ...role,
    account: process.env[role.envAccount],
    password: process.env[role.envPassword],
    // Nhãn phạm vi phải bấm sau khi đăng nhập.
    //
    // 🔴 Bỏ trống = "tài khoản này chỉ có MỘT phạm vi, không phải chọn". 🚫 KHÔNG rơi lui về
    //    `VNPOST_SCOPE_LABEL` của vai khác như bản trước: vai `province` bỏ trống sẽ đi tìm nhãn
    //    của Tổng công ty, và nếu tài khoản tình cờ có dòng đó thì đăng nhập vào SAI PHẠM VI.
    scopeLabel: process.env[role.envScope] || undefined,
    // Nhãn vai ở cột phải của dòng đó. Bỏ trống ⇒ chỉ lọc theo tên đơn vị.
    roleLabel: process.env[envRole] || undefined,
    envRole,
  };
}

/** Các vai đã khai đủ tài khoản — nguồn để `roles.setup.js` biết cần đăng nhập những vai nào. */
function configuredRoles() {
  return ROLES.filter((role) => isConfigured(role.key));
}

/**
 * Lý do bỏ qua khi case đòi một vai chưa khai.
 *
 * 🔴 Dùng với `test.skip(...)`, 🚫 KHÔNG để case tự pass: thiếu tài khoản mà test vẫn xanh
 * nghĩa là báo cáo nói đã kiểm phân quyền trong khi chưa ai đăng nhập vai đó.
 */
function missingRoleReason(key) {
  if (isConfigured(key)) return null;
  const role = getRole(key);
  return `Chưa khai tài khoản vai ${role.key} (${role.label}) — cần ${role.envAccount}/${role.envPassword} trong .env`;
}

module.exports = {
  ROLES,
  configuredRoles,
  credentialsFor,
  getRole,
  isConfigured,
  missingRoleReason,
  storageStateFor,
};
