'use strict';

/**
 * ÁNH XẠ: tài liệu gốc (sheet QC) → phân hệ trong `tai-lieu-test/`.
 *
 * 🔴 **KHÔNG phải 1 file = 1 phân hệ.** `uat_vnpost_quan_ly_kho.csv` có 508 case trải trên ít nhất 8
 * phân hệ; `uat_vnpost_nha_cung_cap.csv` có 253 case trải trên 6. Vì vậy ánh xạ làm ở mức **nhóm chức
 * năng** (tiêu đề nhóm trong sheet), không ở mức file.
 *
 * Cách khai:
 *   - `macDinh`  — phân hệ cho mọi nhóm không khớp luật nào.
 *   - `nhom[]`   — mỗi mục `{khop, module}`; `khop` so **không dấu, chữ thường, dạng chứa**
 *                  với tiêu đề nhóm. Luật đứng TRƯỚC thắng.
 *   - `module: null` — cố ý chưa có phân hệ nào nhận; `doi-chieu-goc.js` sẽ liệt kê riêng
 *                  thành "case gốc chưa có phân hệ" thay vì gán bừa.
 *
 * 🚫 Đừng đoán khi không chắc: để `null` và ghi `ghiChu`. Gán nhầm phân hệ nguy hiểm hơn để trống,
 * vì báo cáo sẽ nói "đã phủ" cho một phân hệ chẳng liên quan.
 */

/** Bỏ dấu để so tiêu đề nhóm — sheet QC viết hoa/thường và dấu không nhất quán. */
function boDau(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const ANH_XA = {
  'uat_vnpost_quan_ly_diem_ban_hub.csv': { macDinh: '01_quan_ly_diem_ban', nhom: [] },

  'uat_vnpost_nhan_vien.csv': {
    macDinh: '02_quan_ly_nhan_vien',
    nhom: [
      { khop: 'quan ly ca lam viec', module: '03a_quan_ly_ca_lich_lam_viec' },
      { khop: 'lich lam viec', module: '03a_quan_ly_ca_lich_lam_viec' },
      { khop: 'cong no nhan vien', module: '24_cong_no_nhan_vien' },
    ],
  },

  'uat_vnpost_phan_quyen_vai_tro.csv': { macDinh: '31_quan_ly_phan_quyen', nhom: [] },
  // 🔴 Quyết định 18/09/2026 của user: nhóm "tạo và xem danh sách Điểm bán/Hub" trong sheet này là
  // LUỒNG RIÊNG (tạo điểm bán từ màn Mô hình tổ chức), 🚫 không gộp vào `01_quan_ly_diem_ban`.
  // Vì thế bỏ luật nhóm cũ — cả sheet thuộc `32_mo_hinh_to_chuc`.
  'uat_vnpost_mo_hinh_to_chuc.csv': { macDinh: '32_mo_hinh_to_chuc', nhom: [] },

  'uat_vnpost_san_pham.csv': { macDinh: '08_quan_ly_san_pham', nhom: [] },
  'uat_vnpost_danh_muc_san_pham.csv': { macDinh: '08_quan_ly_san_pham', nhom: [] },
  'uat_vnpost_bang_gia.csv': { macDinh: '10_bang_gia_ban_san_pham', nhom: [] },

  // 🔴 File mang tên "bán tồn kho âm" nhưng 4/9 case bên trong là của DANH MỤC SẢN PHẨM,
  //    trùng y hệt `uat_vnpost_danh_muc_san_pham.csv`. Chỉ 5 case "giá vốn tạm tính" là đúng chủ đề.
  'uat_vnpost_ban_ton_kho_am.csv': {
    macDinh: null,
    ghiChu: 'Nội dung lẫn lộn — xem mục "Nghi vấn tài liệu" trong báo cáo tổng hợp',
    nhom: [
      { khop: 'danh muc', module: '08_quan_ly_san_pham' },
      { khop: 'gia von tam tinh', module: '07_2_cau_hinh_kho' },
    ],
  },

  'uat_vnpost_khach_hang.csv': { macDinh: '19_quan_ly_khach_hang', nhom: [] },
  'uat_vnpost_realtime.csv': { macDinh: '19_quan_ly_khach_hang', nhom: [] },
  'uat_vnpost_loyalty.csv': { macDinh: '20_khach_hang_than_thiet', nhom: [] },
  'uat_vnpost_ct_loyalty.csv': {
    macDinh: '20_khach_hang_than_thiet',
    nhom: [{ khop: 'thanh toan', module: '18_2_khach_hang_va_uu_dai' }],
  },

  'uat_vnpost_ban_hang.csv': {
    macDinh: '18_1_ban_hang_tai_quay',
    nhom: [
      { khop: 'quan ly ca', module: '03b_ca_lam_viec_nhan_vien' },
      { khop: 'quay thu ngan', module: '17_quan_ly_quay_thu_ngan' },
      { khop: 'ctkm', module: '11_khuyen_mai' },
      { khop: 'giam gia ban', module: '11_khuyen_mai' },
      { khop: 'chuc nang thanh toan', module: '18_3_thanh_toan_va_bien_lai' },
    ],
  },

  'uat_vnpost_doi_tra_hang.csv': {
    macDinh: '18_5_doi_tra_hang',
    nhom: [{ khop: 'doi diem', module: '20_khach_hang_than_thiet' }],
  },

  'uat_vnpost_nha_cung_cap.csv': {
    macDinh: '12_1_ho_so_nha_cung_cap',
    nhom: [
      { khop: 'san pham theo nha cung cap', module: '12_2_san_pham_va_bang_gia_ncc' },
      { khop: 'bang gia nha cung cap', module: '12_2_san_pham_va_bang_gia_ncc' },
      { khop: 'cong no nha cung cap', module: '12_3_cong_no_nha_cung_cap' },
      { khop: 'hop dong nha cung cap', module: '12_4_hop_dong_va_khuyen_mai_ncc' },
      { khop: 'khuyen mai', module: '12_4_hop_dong_va_khuyen_mai_ncc' },
      { khop: 'tra hang nha cung cap', module: '14_1_lap_va_duyet_phieu_xuat_tra' },
      { khop: 'dat hang nha cung cap', module: '13_3_dat_hang_va_nhap_hang' },
      { khop: 'phieu nhap hang tu ncc', module: '13_3_dat_hang_va_nhap_hang' },
      { khop: 'doi soat chung tu', module: '27_doi_soat_hoa_don' },
    ],
  },

  'uat_vnpost_quan_ly_kho.csv': {
    macDinh: '04_5_quan_ly_ton_kho',
    nhom: [
      { khop: 'ton kho dau ky', module: '04_2_ton_kho_dau_ky' },
      { khop: 'canh bao ton kho', module: '04_1_canh_bao_ton_kho' },
      { khop: 'cai dat canh bao', module: '04_1_canh_bao_ton_kho' },
      { khop: 'xuat nhap kho', module: '04_3_nhap_xuat_chuyen_kho' },
      { khop: 'phieu nhap kho', module: '04_3_nhap_xuat_chuyen_kho' },
      { khop: 'huy phieu nhap kho', module: '04_3_nhap_xuat_chuyen_kho' },
      { khop: 'chuyen kho', module: '04_3_nhap_xuat_chuyen_kho' },
      { khop: 'kiem kho', module: '04_4_kiem_kho' },
      { khop: 'phieu de xuat', module: '13_1_phieu_de_xuat_va_phe_duyet' },
      { khop: 'tao phieu de xuat', module: '13_1_phieu_de_xuat_va_phe_duyet' },
      { khop: 'phe duyet phieu de xuat', module: '13_1_phieu_de_xuat_va_phe_duyet' },
      { khop: 'gop phieu de xuat', module: '13_2_gop_tach_va_dieu_phoi' },
      { khop: 'tach phieu de xuat', module: '13_2_gop_tach_va_dieu_phoi' },
      { khop: 'lich su gop/tach', module: '13_2_gop_tach_va_dieu_phoi' },
      { khop: 'tong hop phieu de xuat', module: '13_2_gop_tach_va_dieu_phoi' },
      { khop: 'tao phieu dat hang ncc', module: '13_3_dat_hang_va_nhap_hang' },
      { khop: 'dat hang nha cung cap', module: '13_3_dat_hang_va_nhap_hang' },
      { khop: 'phieu nhap hang tu ncc', module: '13_3_dat_hang_va_nhap_hang' },
      { khop: 'gui tct', module: '13_3_dat_hang_va_nhap_hang' },
      { khop: 'doi soat chung tu', module: '27_doi_soat_hoa_don' },
      { khop: 'tra hang ncc', module: '14_1_lap_va_duyet_phieu_xuat_tra' },
      { khop: 'cai dat dong bang kho', module: '07_2_cau_hinh_kho' },
      { khop: 'cai dat han muc phe duyet', module: '07_4_van_hanh' },
      { khop: 'tao don van chuyen', module: '12-don-vi-van-tai' },
      { khop: 'the kho', module: '04_5_quan_ly_ton_kho' },
      { khop: 'chot ton kho', module: '29_bao_cao' },
      { khop: 'tong quan kho hang', module: '04_5_quan_ly_ton_kho' },
      { khop: 'quan ly kho', module: '04_5_quan_ly_ton_kho' },
      // Nhóm chế độ tính giá vốn — nằm ở phân hệ giá vốn mặc định.
      { khop: 'thuc te dich danh', module: '35-gia-von-mac-dinh' },
      { khop: 'gia tieu chuan', module: '35-gia-von-mac-dinh' },
      { khop: 'mac', module: '35-gia-von-mac-dinh' },
      { khop: 'fifo', module: '35-gia-von-mac-dinh' },
      { khop: 'che do quan li kho', module: '35-gia-von-mac-dinh' },
      // 🔴 Nhóm "Cập nhật cấu hình" (17 case) nằm ngay dưới "Cài đặt hạn mức phê duyệt" và nội
      //    dung là khoảng tiền / bước duyệt / role duyệt ⇒ thuộc 07_4, KHÔNG phải cấu hình kho.
      { khop: 'cap nhat cau hinh', module: '07_4_van_hanh' },
      { khop: 'chon diem ban', module: '13_1_phieu_de_xuat_va_phe_duyet' },
    ],
  },

  'uat_vnpost_tai_chinh.csv': {
    macDinh: null,
    ghiChu: 'Mỗi nhóm một phân hệ khác nhau; nhóm "Phiếu chi" hiện CHƯA có phân hệ nào',
    nhom: [
      { khop: 'phieu thu', module: '26_phieu_thu' },
      { khop: 'phieu chi', module: null },
      { khop: 'cong no nhan vien', module: '24_cong_no_nhan_vien' },
      { khop: 'cong no ncc', module: '12_3_cong_no_nha_cung_cap' },
      // 🔴 KHÔNG phải `13-cong-no-diem-ban-tinh`. Phân hệ đó là vế **Điểm bán ↔ Tỉnh**; nhóm này
      //    là vế **Tỉnh ↔ Tổng công ty** (phiếu nợ khi TCT chuyển kho / đặt hàng hộ tỉnh, khai báo
      //    thanh toán hai chiều). Gán nhầm thì 23 case Tỉnh–TCT hiện là "đã có phân hệ" trong khi
      //    chẳng ai dựng — che mất một mảng nghiệp vụ chưa phủ.
      { khop: 'cong no tinh - tct', module: null },
      { khop: 'tong quan', module: '17_quan_ly_quay_thu_ngan' },
    ],
  },

  'uat_vnpost_bao_cao.csv': { macDinh: '29_bao_cao', nhom: [] },
  'uat_vnpost_bao_cao_cong_no_khach_hang.csv': { macDinh: '34_cong_no_khach_hang', nhom: [] },
};

/**
 * Phân hệ nhận một case gốc. Trả `null` khi cố ý chưa gán.
 *
 * `tenNhom` là ĐƯỜNG DẪN nhóm dạng `cha > con > cháu` (xem `goc.js`).
 * 🔴 Khớp từ nhóm **LÁ ngược lên gốc**, 🚫 không khớp trên cả chuỗi: khớp cả chuỗi thì luật của một
 * nhóm cha bất kỳ sẽ nuốt hết nhóm con. Đo thực tế khi làm sai: `13_3` nhận 242 case và
 * `17_quan_ly_quay_thu_ngan` nhận 144, trong khi hai nhóm đó chỉ có vài chục.
 */
function phanHeCho(fileName, tenNhom) {
  const cf = ANH_XA[fileName];
  if (!cf) return { module: null, nguon: 'CHƯA KHAI ÁNH XẠ' };

  const doan = String(tenNhom || '').split('>').map((x) => boDau(x)).filter(Boolean);
  for (let i = doan.length - 1; i >= 0; i -= 1) {
    for (const luat of cf.nhom) {
      if (doan[i].includes(boDau(luat.khop))) {
        return { module: luat.module, nguon: `nhóm "${luat.khop}"` };
      }
    }
  }
  return { module: cf.macDinh, nguon: 'mặc định của file' };
}

function fileCuaModule(moduleId) {
  const out = [];
  for (const [file, cf] of Object.entries(ANH_XA)) {
    if (cf.macDinh === moduleId || cf.nhom.some((n) => n.module === moduleId)) out.push(file);
  }
  return out;
}

module.exports = { ANH_XA, phanHeCho, fileCuaModule, boDau };
