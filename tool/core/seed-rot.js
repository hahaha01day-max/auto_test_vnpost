'use strict';

/**
 * LUẬT RÓT dữ liệu sổ seed vào input của case — MỘT nguồn cho CLI (`bin/seed-fill-input.js`, ghi
 * `test-input.json`) và web (`/seed` → "Lưu vào hồ sơ môi trường", ghi bảng `case_inputs`).
 * 🔴 Chỉ rót khoá nằm trong `required` và đang TRỐNG trong khuôn — xem giải thích trong file CLI.
 */

const BO_QUA_THU_MUC = new Set(['shared', 'test-case-goc', 'test-case-qc', '00_seed']);

/**
 * 🔴 Khoá **🚫 KHÔNG rót** ở một số phân hệ, vì phân hệ đó chạy trên đơn vị KHÁC đơn vị trong sổ.
 *    Đã trả giá: `04_2` chạy vai `seed_shop2` trên điểm bán `AUTO_SHOP_52295376` (điểm bán duy
 *    nhất còn CHƯA khai tồn đầu kỳ), nhưng sổ seed ghi điểm bán `AUTO_SHOP_62391304` ⇒ rót
 *    `maDiemBan` vào đó là lọc theo một điểm bán 🚫 không liên quan, case vẫn chạy và vẫn xanh/đỏ
 *    vì lý do chẳng ai ngờ tới.
 */
const NGOAI_LE = { '04_2_ton_kho_dau_ky': new Set(['maDiemBan', 'shopCode']) };

/**
 * Bản đồ **khoá trong `data`** → chỗ lấy giá trị trong sổ seed.
 *
 * `chi` là đường dẫn trong `duLieu` của sổ. `vi` giải thích vì sao khoá đó khớp — 🔴 thêm dòng mới
 * thì phải viết được `vi`, nếu không thì đừng thêm.
 */
const BAN_DO = [
  { khoa: 'sku', chi: 'sanPham.sku', vi: 'SKU sản phẩm nền — cái đang có tồn, bảng giá và hợp đồng NCC' },
  { khoa: 'sku1', chi: 'sanPham.sku', vi: 'SKU thứ nhất của case so sánh hai sản phẩm' },
  {
    khoa: 'sku2',
    chi: 'sanPham.sanPhamTheoGiaVon.fifo.sku',
    vi: 'SKU thứ hai — cố ý lấy sản phẩm FIFO để hai vế khác phương pháp giá vốn',
  },
  { khoa: 'maNCC', chi: 'nhaCungCap.maNcc', vi: 'mã nhà cung cấp cấp chuỗi do seed bước 6 tạo' },
  { khoa: 'tenNCC', chi: 'nhaCungCap.tenNcc', vi: 'tên nhà cung cấp nền' },
  { khoa: 'shopCode', chi: 'diemBan.maShop', vi: 'mã điểm bán nền' },
  { khoa: 'maDiemBan', chi: 'diemBan.maShop', vi: 'mã điểm bán nền' },
  { khoa: 'tenNhanVien', chi: 'nhanSu.tenNhanVien', vi: 'nhân viên nền của điểm bán seed' },
  { khoa: 'nhanVienThuHai', chi: 'nhanSu.tenNhanVien', vi: 'chỉ có một nhân viên nền — xem cảnh báo bên dưới' },
  { khoa: 'employeeCodeTonTai', chi: 'nhanSu.maNhanVien', vi: 'mã nhân viên CÓ THẬT để kiểm trùng mã' },
  { khoa: 'phoneTonTai', chi: 'nhanSu.soDienThoai', vi: 'số điện thoại CÓ THẬT để kiểm trùng' },
  { khoa: 'soDienThoaiTaiKhoan', chi: 'nhanSu.soDienThoai', vi: 'SĐT của tài khoản đang đăng nhập' },
  { khoa: 'tenBangGiaDaCo', chi: 'bangGiaBan.tenBangGia', vi: 'bảng giá bán nền, đã phê duyệt' },
  { khoa: 'thanhPham', chi: 'sanPham.tenSanPham', vi: 'tên sản phẩm nền' },
  { khoa: 'barcode', chi: 'sanPham.sku', vi: 'seed 🚫 không sinh barcode riêng — dùng SKU (xem cảnh báo)' },
];

/**
 * 🔴 Khoá cần **người quyết định**, 🚫 script không tự rót. Ghi ra để 🚫 không ai tưởng đã xong.
 */
const CAN_NGUOI = {
  nhanVienThuHai: 'sổ seed chỉ có MỘT nhân viên; case cần người thứ hai cùng điểm bán',
  barcode: 'seed 🚫 không sinh barcode — điền SKU là kiểm sai thứ (mã vạch ≠ SKU)',
};

const layTheoChi = (goc, chi) =>
  chi.split('.').reduce((o, k) => (o == null ? undefined : o[k]), goc);


/**
 * Danh sách ô sẽ rót cho sổ `duLieu`: [{ moduleId, caseId, field, value }].
 * @param {object} duLieu  `doc().duLieu` của một bộ seed
 * @param {string} testRoot  thư mục `tai-lieu-test`
 * @param {object} [duLieuChung]  `duLieu` của sổ CHUNG — ô khuôn đang mang ĐÚNG giá trị của sổ chung là
 *   giá trị do seed rót (`seed-fill-input --ap-dung`), 🚫 không phải người viết case chọn ⇒ được thay.
 *   Ô mang giá trị khác thì giữ nguyên.
 */
function oSeRot(duLieu, testRoot, duLieuChung = {}) {
  const fs = require('node:fs');
  const path = require('node:path');
  const banDo = BAN_DO.filter((b) => {
    if (CAN_NGUOI[b.khoa]) return false;
    const v = layTheoChi(duLieu, b.chi);
    return !(v === undefined || v === null || v === '');
  });
  const ra = [];
  for (const mod of fs.readdirSync(testRoot).sort()) {
    if (BO_QUA_THU_MUC.has(mod)) continue;
    const f = path.join(testRoot, mod, 'test-input.json');
    if (!fs.existsSync(f)) continue;
    const json = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const [caseId, c] of Object.entries(json.cases || {})) {
      if (!c.data) continue;
      const batBuoc = new Set(c.required || []);
      for (const b of banDo) {
        if (!batBuoc.has(b.khoa) || NGOAI_LE[mod]?.has(b.khoa) || !(b.khoa in c.data)) continue;
        const cu = c.data[b.khoa];
        const tuSeedChung = cu !== '' && cu != null && String(cu) === String(layTheoChi(duLieuChung, b.chi) ?? '\u0000');
        if (cu !== '' && cu !== null && cu !== undefined && !tuSeedChung) continue;
        ra.push({ moduleId: mod, caseId, field: b.khoa, value: layTheoChi(duLieu, b.chi) });
      }
    }
  }
  return ra;
}

module.exports = { BAN_DO, BO_QUA_THU_MUC, CAN_NGUOI, NGOAI_LE, layTheoChi, oSeRot };
