'use strict';

/**
 * BẢN ĐỒ chuyển mã test sang mã HDSD.
 *
 * Nguồn mã: `resource/hdsd/hdsd<mã>_<slug>/tasks/<mã task>_<slug>.md`.
 * Mã case mới = `<mã phân hệ>_<mã task>_<STT tự tăng>` — STT chạy riêng trong từng (phân hệ, task).
 *
 * 🔴 Ba module CHƯA CÓ phân hệ HDSD nên **không đụng tới** ở đợt này (quyết định của user 17/09):
 *    `12-don-vi-van-tai`, `13-cong-no-diem-ban-tinh`, `35-gia-von-mac-dinh`.
 *    Bổ sung sau khi HDSD viết xong.
 */

/** Phân hệ HDSD đích → tên thư mục test mới + nhãn. */
const MODULES = {
  '02': { dir: '02_quan_ly_nhan_vien', label: 'Quản lý nhân viên' },
  '04_1': { dir: '04_1_canh_bao_ton_kho', label: 'Cảnh báo tồn kho và đề xuất nhập hàng' },
  '04_3': { dir: '04_3_nhap_xuat_chuyen_kho', label: 'Nhập kho, xuất kho và chuyển kho' },
  '04_4': { dir: '04_4_kiem_kho', label: 'Kiểm kho' },
  '04_5': { dir: '04_5_quan_ly_ton_kho', label: 'Quản lý tồn kho và hàng xả kho' },
  '08': { dir: '08_quan_ly_san_pham', label: 'Quản lý sản phẩm' },
  11: { dir: '11_khuyen_mai', label: 'Khuyến mại' },
  '12_1': { dir: '12_1_ho_so_nha_cung_cap', label: 'Hồ sơ nhà cung cấp' },
  '12_2': { dir: '12_2_san_pham_va_bang_gia_ncc', label: 'Sản phẩm và bảng giá nhà cung cấp' },
  '12_3': { dir: '12_3_cong_no_nha_cung_cap', label: 'Công nợ nhà cung cấp' },
  '13_1': { dir: '13_1_phieu_de_xuat_va_phe_duyet', label: 'Phiếu đề xuất đặt hàng và phê duyệt' },
  '13_2': { dir: '13_2_gop_tach_va_dieu_phoi', label: 'Gộp tách phiếu và điều phối nguồn hàng' },
  '13_3': { dir: '13_3_dat_hang_va_nhap_hang', label: 'Đặt hàng nhà cung cấp và nhập hàng' },
  '14_1': { dir: '14_1_lap_va_duyet_phieu_xuat_tra', label: 'Lập và duyệt phiếu xuất trả nhà cung cấp' },
  '18_1': { dir: '18_1_ban_hang_tai_quay', label: 'Bán hàng tại quầy' },
  '18_2': { dir: '18_2_khach_hang_va_uu_dai', label: 'Khách hàng và ưu đãi trên đơn' },
  '18_3': { dir: '18_3_thanh_toan_va_bien_lai', label: 'Thu tiền đơn hàng' },
  '18_4': { dir: '18_4_quan_ly_don_hang', label: 'Quản lý đơn hàng' },
  20: { dir: '20_khach_hang_than_thiet', label: 'Khách hàng thân thiết' },
  31: { dir: '31_quan_ly_phan_quyen', label: 'Quản lý phân quyền, chức năng, vai trò' },
  32: { dir: '32_mo_hinh_to_chuc', label: 'Mô hình tổ chức' },
};

/**
 * Mã case cũ → `<phân hệ>/<mã task>`.
 *
 * Gắn theo NỘI DUNG task trong `resource/hdsd/<phan-he>/tasks/`, không suy từ tên module cũ:
 * nhiều module test cũ trải trên vài phân hệ (11-kho trải 7 phân hệ, 05-ban-hang-pos trải 4).
 */
const CASE_TO_TASK = {
  // ── 01-mo-hinh-to-chuc → 32 ────────────────────────────────────────────────
  'ORG-SMOKE-001': '32/010',
  'ORG-VALIDATION-001': '32/020',
  'ORG-CRUD-001': '32/020',

  // ── 02-phan-quyen-vai-tro → 31 ─────────────────────────────────────────────
  'PVT-001': '31/010',
  'PVT-002': '31/010',
  'PVT-003': '31/010',
  'PVT-004': '31/010',
  'PVT-005': '31/010',
  'PVT-006': '31/010',
  'PVT-007': '31/010',
  'PVT-008': '31/020',
  'PVT-009': '31/020',
  'PVT-010': '31/020',
  'PVT-011': '31/010',
  'PVT-012': '31/010',

  // ── 04-quan-ly-san-pham → 08 ───────────────────────────────────────────────
  'CAT-001': '08/060',
  'CAT-002': '08/060',
  'CAT-003': '08/060',
  'CAT-004': '08/060',
  'CAT-005': '08/060',
  'CAT-006': '08/060',
  'PRD-001': '08/010',
  'PRD-002': '08/010',
  'PRD-003': '08/020',
  'PRD-004': '08/020',
  'PRD-005': '08/020',
  'PRD-006': '08/020',
  'PRD-007': '08/070',
  'PRD-008': '08/070',
  'PRD-009': '08/080',
  'PRD-010': '08/080',
  'PRD-011': '08/030',

  // ── 05-ban-hang-pos → 18_1 / 18_2 / 18_3 / 18_4 ────────────────────────────
  'POS-001': '18_4/010',
  'POS-002': '18_1/010',
  'POS-003': '18_1/010',
  'POS-004': '18_3/010',
  'POS-005': '18_3/090',
  'POS-006': '18_2/020',
  'POS-007': '18_1/050',
  'POS-008': '18_2/010',
  'POS-009': '18_1/020',
  'POS-010': '18_4/010',
  'POS-011': '18_4/020',
  'POS-012': '18_4/030',
  'POS-013': '18_1/020',
  'POS-014': '18_2/010',
  'POS-015': '18_1/020',

  // ── 08-loyalty → 20, và 2 case POS sang 18_2 / 18_3 ────────────────────────
  'LOY-001': '20/040',
  'LOY-002': '20/040',
  'LOY-003': '20/010',
  'LOY-004': '20/010',
  'LOY-005': '20/010',
  'LOY-006': '20/020',
  'LOY-007': '20/020',
  'LOY-008': '20/020',
  'LOY-009': '20/040',
  'LOY-010': '20/040',
  'LOY-011': '18_2/010',
  'LOY-012': '18_3/050',

  // ── 09 CSV (màn quản lý CTKM) → 11 ─────────────────────────────────────────
  'CTKM-001': '11/010',
  'CTKM-002': '11/010',
  'CTKM-003': '11/030',
  'CTKM-004': '11/030',
  'CTKM-005': '11/030',
  'CTKM-006': '11/030',
  'CTKM-007': '11/040',
  'CTKM-008': '11/040',
  'CTKM-009': '11/040',
  'CTKM-010': '11/030',
  'CTKM-011': '11/070',
  'CTKM-012': '11/050',
  'CTKM-013': '11/060',
  'CTKM-014': '11/080',
  'CTKM-015': '11/080',
  'CTKM-016': '11/080',
  'CTKM-017': '11/080',
  'CTKM-018': '11/080',
  'CTKM-019': '11/070',
  'CTKM-020': '11/070',
  'CTKM-021': '11/070',
  'CTKM-022': '11/070',
  'CTKM-023': '11/070',
  'CTKM-024': '11/080',
  'CTKM-025': '11/080',
  'CTKM-026': '11/080',
  'CTKM-027': '11/070',
  'CTKM-028': '11/070',
  'CTKM-029': '11/070',
  'CTKM-030': '11/030',
  'CTKM-031': '11/050',
  'CTKM-032': '11/050',

  // ── 10-nha-cung-cap → 12_1 / 12_2 / 12_3 / 14_1 ────────────────────────────
  'NCC-C1-001': '12_1/070',
  'NCC-C1-002': '12_1/070',
  'NCC-C1-003': '12_1/070',
  'NCC-C1-004': '12_1/070',
  'NCC-C1-005': '12_1/070',
  'NCC-C1-006': '12_1/070',
  'NCC-C1-007': '12_1/070',
  'NCC-C1-008': '12_1/070',
  'NCC-C1-009': '12_1/070',
  'NCC-C1-010': '12_1/070',
  'NCC-001': '12_1/010',
  'NCC-005': '12_1/070',
  'NCC-006': '12_1/070',
  'NCC-008': '12_1/070',
  'NCC-012': '12_1/070',
  'NCC-013': '12_1/070',
  'NCC-019': '12_1/030',
  'NCC-020': '12_1/030',
  'NCC-022': '12_1/030',
  'NCC-025': '12_1/010',
  'NCC-027': '12_1/020',
  'NCC-029': '12_2/010',
  'NCC-035': '12_2/040',
  'NCC-045': '12_3/010',
  'NCC-052': '14_1/030',

  // ── 11-kho → 13_1 / 13_2 / 13_3 / 04_1 / 04_3 / 04_4 / 04_5 ────────────────
  'KHO-001': '13_1/040',
  'KHO-002': '13_1/030',
  'KHO-008': '13_1/040',
  'KHO-011': '13_2/020',
  'KHO-016': '13_3/030',
  'KHO-017': '13_3/010',
  'KHO-023': '13_3/030',
  'KHO-028': '04_3/010',
  'KHO-029': '04_3/020',
  'KHO-041': '04_3/030',
  'KHO-038': '04_5/040',
  'KHO-048': '04_4/050',
  'KHO-049': '04_4/010',
  'KHO-054': '04_1/010',
  'KHO-055': '04_1/020',
  'KHO-062': '04_5/010',
  'KHO-063': '04_5/030',
  'KHO-065': '04_3/080',
  'KHO-066': '04_3/060',

  // ── quan-ly-nhan-vien → 02 ─────────────────────────────────────────────────
  'NV-001': '02/020',
  'NV-002': '02/020',
  'NV-003': '02/020',
  'NV-004': '02/020',
};

/**
 * Test KHÔNG có mã case, gắn theo title.
 *
 * 🔴 9 test trong `01-mo-hinh-to-chuc/tests/vnpost-org.playwright.spec.js` hiện KHÔNG chạy:
 * config của module dùng `testMatch: /org\.standard\.spec\.js/` nên file này bị loại.
 * Chuyển sang cây mới vẫn GIỮ NGUYÊN trạng thái đó (xem `EXCLUDE_FROM_RUN`) — bật 9 test đang
 * chết là một thay đổi hành vi, phải do người quyết định chứ không phải tác dụng phụ của việc
 * đổi tên thư mục.
 */
const TITLE_TO_TASK = {
  'đăng nhập và vào module Mô hình tổ chức': '32/010',
  'hiển thị cây tổ chức và xem chi tiết Tổng công ty': '32/010',
  'Nhập từ Excel - validate chưa chọn file và tải file mẫu': '32/040',
  'Thêm đơn vị - validate form rỗng': '32/020',
  'CRUD đơn vị test: thêm, tìm kiếm, cập nhật, xóa': '32/020',
  'Tìm kiếm không có kết quả': '32/010',
  'Tạo điểm bán/hub - mở form và validate rỗng': '32/050',
  'Mở danh sách điểm bán từ chi tiết Tổng công ty': '32/050',
  'Kiểm tra chức năng Xuất Excel theo tài liệu': '32/010',
};

/** File spec giữ nguyên trạng thái "không được chạy" sau khi chuyển. */
const EXCLUDE_FROM_RUN = new Set(['vnpost-org.playwright.spec.js']);

/** 45 test POS của module 09 đều là "áp dụng khuyến mãi trên đơn" → 18_2/020. */
const PROMOTION_POS_TASK = '18_2/020';

/** Module test cũ KHÔNG chuyển đợt này — chưa có phân hệ HDSD tương ứng. */
const DEFERRED = ['12-don-vi-van-tai', '13-cong-no-diem-ban-tinh', '35-gia-von-mac-dinh'];

module.exports = { MODULES, CASE_TO_TASK, TITLE_TO_TASK, EXCLUDE_FROM_RUN, PROMOTION_POS_TASK, DEFERRED };
