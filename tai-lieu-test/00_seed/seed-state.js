'use strict';

/**
 * SỔ DỮ LIỆU SEED — `00_seed/seed-state.json`.
 *
 * 🔴 Vì sao phải có sổ: các bước seed **phụ thuộc nhau** (xã cần tỉnh, điểm bán cần xã, sản phẩm
 * cần danh mục, bảng giá cần sản phẩm…). Bước sau phải đọc được đúng thứ bước trước vừa tạo,
 * và `test-input.json` của 48 phân hệ phải lấy giá trị từ đây. Giữ trong biến JS là mất khi
 * Playwright tách worker/process.
 *
 * 🔴 Mọi bản ghi seed mang tiền tố `VNPOST_SEED_PREFIX` (mặc định `AUTO_`) để tra ra và dọn được.
 *
 * 🚫 KHÔNG xoá file này giữa chừng: mất sổ là mất đường dọn, bản ghi ở lại hệ thống vĩnh viễn
 * vì nhiều màn không có chức năng xoá.
 */

const fs = require('node:fs');
const path = require('node:path');

const { LANE } = require('../shared/config');

/** Mỗi làn một sổ riêng — 🚫 làn này ghi đè sổ của làn khác là bước sau đọc nhầm bộ dữ liệu. */
const FILE = path.join(__dirname, LANE ? `seed-state.lane${LANE}.json` : 'seed-state.json');
/**
 * Tiền tố: biến môi trường → tiền tố người dùng nhập lúc tạo bộ ở web `/seed` (ghi trong sổ) → mặc định
 * `AUTO<làn>_`. 🔴 Phải đọc từ sổ: bộ tạo bằng web có thể mang tiền tố tự chọn, tính lại theo số làn là
 *    các bước sau đặt tên/mã lệch với bước trước.
 */
const tienToTrongSo = () => {
  try { return fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')).prefix || null : null; } catch { return null; }
};
const PREFIX = process.env.VNPOST_SEED_PREFIX || tienToTrongSo() || (LANE ? `AUTO${LANE}_` : 'AUTO_');
/** Tiền tố cho MÃ / tên đăng nhập / SKU — chỉ chữ số, 🚫 không gạch dưới: `AUTO` / `AUTO2`. */
const PREFIX_MA = PREFIX.replace(/[^A-Za-z0-9]/g, '');

/** Hậu tố dùng chung cho cả LƯỢT seed — 🚫 không sinh lại ở từng bước, nếu không mã sẽ lệch nhau. */
function runId() {
  if (!process.env.VNPOST_SEED_RUN_ID && fs.existsSync(FILE)) {
    const r = JSON.parse(fs.readFileSync(FILE, 'utf8')).runId;
    if (r) process.env.VNPOST_SEED_RUN_ID = String(r);
  }
  if (!process.env.VNPOST_SEED_RUN_ID) {
    process.env.VNPOST_SEED_RUN_ID = String(Date.now()).slice(-8);
  }
  return process.env.VNPOST_SEED_RUN_ID;
}

function doc() {
  if (!fs.existsSync(FILE)) return { runId: runId(), prefix: PREFIX, taoLuc: null, duLieu: {} };
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function ghi(nhom, ban) {
  const s = doc();
  s.runId = s.runId || runId();
  s.prefix = s.prefix || PREFIX;
  s.taoLuc = s.taoLuc || new Date().toISOString();
  s.duLieu[nhom] = { ...(s.duLieu[nhom] || {}), ...ban };
  fs.writeFileSync(FILE, `${JSON.stringify(s, null, 2)}\n`, 'utf8');
  return s.duLieu[nhom];
}

/** Đọc dữ liệu bước trước. Ném lỗi thay vì trả undefined — 🚫 để bước sau chạy với dữ liệu rỗng. */
function lay(nhom, khoa) {
  const v = (doc().duLieu[nhom] || {})[khoa];
  if (v === undefined || v === null || v === '') {
    throw new Error(
      `Chưa seed "${nhom}.${khoa}". Chạy bước seed sinh ra nó trước — xem 00_seed/README.md.`,
    );
  }
  return v;
}

/** Tên/mã có tiền tố + hậu tố lượt chạy: `AUTO_TINH_12345678`. */
function ten(loai, hau = '') {
  return `${PREFIX}${loai}_${runId()}${hau}`;
}

/**
 * GIÁ TRỊ MẶC ĐỊNH của một bộ seed — MỘT nguồn cho cả spec lẫn web (web điền sẵn vào ô input).
 * Khoá phẳng `<nhóm>.<khoá>`. 🔴 Thêm khoá mới thì spec phải đọc bằng `kh()`, 🚫 đừng tự ghép tên.
 */
/** Danh mục vai trò seed tạo tài khoản — chụp từ `AUTHEN.TBL_CHAIN_ROLE`, xem file. */
const VAI_TRO = JSON.parse(fs.readFileSync(path.join(__dirname, 'vai-tro.json'), 'utf8'));

function macDinh(prefix = PREFIX, id = runId()) {
  // 🔴 Bỏ hậu tố runId (23/09/2026) — tiền tố làn `AUTO<làn>_` đủ phân biệt bộ. Chỉ SĐT còn dùng id
  //    vì phải là số. Mã tỉnh ≤ 10 ký tự.
  const maTinh = `${prefix}T`.slice(0, 10);
  const maXa = `${maTinh}_01`;
  const sp = (hau) => ({ [`sanPham.${hau}.ten`]: `${prefix}SP_${hau}`, [`sanPham.${hau}.sku`]: `${prefix}SKU_${hau}` });
  return {
    'toChuc.maTinh': maTinh, 'toChuc.tenTinh': `${prefix}TINH`,
    'toChuc.maXa': maXa, 'toChuc.tenXa': `${prefix}XA`,
    'diemBan.maShop': `${maXa}_A01`, 'diemBan.tenShop': `${prefix}SHOP`,
    // Mỗi vai trò trong `vai-tro.json` một tên đăng nhập — khoá `taiKhoan.<vai>`.
    ...Object.fromEntries(VAI_TRO.vai.map((v) => [`taiKhoan.${v.vai}`, `${prefix.toLowerCase()}${v.hau}`])),
    'sanPham.maDanhMucCha': `${prefix}DMC`, 'sanPham.tenDanhMucCha': `${prefix}DANHMUCCHA`,
    'sanPham.maDanhMuc': `${prefix}DM`, 'sanPham.tenDanhMuc': `${prefix}DANHMUC`,
    ...sp('FIFO'), ...sp('DD'), ...sp('TC'),
    // 🔴 SP Giá tiêu chuẩn BẮT BUỘC khai giá tiêu chuẩn (CHAIN_PRODUCT_UNIT.mac_price > 0), không thì tồn
    //    đầu kỳ / nhập kho báo "chưa khai báo giá nhập cho đơn vị tính". Tồn đầu kỳ 🚫 dùng giá vốn trong file.
    'sanPham.TC.giaTieuChuan': 60000,
    // SP CHÍNH — giá vốn Bình quân, có biến thể và/hoặc đơn vị quy đổi (bật tắt trên web). 🚫 Không tắt được:
    //   bước 5, 7, 8 và `test-input.json` các phân hệ đều trỏ vào nó (SP Bình quân thường đã bỏ 23/09/2026).
    'sanPham.BT.ten': `${prefix}SP_BT`, 'sanPham.BT.sku': `${prefix}SKU_BT`,
    'sanPham.BT.coBienThe': true, 'sanPham.BT.thuocTinh': 'Màu', 'sanPham.BT.giaTri': 'Đỏ, Xanh',
    'sanPham.BT.coQuyDoi': true, 'sanPham.BT.donViGoc': 'Cái', 'sanPham.BT.quyDoi': 'Hộp=10',
    'bangGiaBan.tenBangGia': `${prefix}BANGGIA`, 'bangGiaBan.tenPhienBan': `${prefix}PB`,
    // Đơn giá bán (đã gồm VAT) RIÊNG từng sản phẩm — tất cả đều vào bảng giá, 🚫 thiếu là không bán được.
    // `donGia` = SP chính, theo ĐƠN VỊ GỐC; đơn vị quy đổi = giá × hệ số.
    'bangGiaBan.donGia': 100000, 'bangGiaBan.donGia.FIFO': 100000, 'bangGiaBan.donGia.DD': 100000, 'bangGiaBan.donGia.TC': 100000,
    'nhaCungCap.tenNhomNcc': `${prefix}NHOMNCC`, 'nhaCungCap.maNcc': `${prefix}NCC`,
    'nhaCungCap.tenNcc': `${prefix}NCC`, 'nhaCungCap.dienThoaiNcc': `09${id.slice(-8)}`,
    'sanPhamNcc.soHopDong': `${prefix}HD`, 'sanPhamNcc.tenBangGiaMua': `${prefix}BGMUA`,
    // Giá nhập (sau VAT) RIÊNG từng sản phẩm — `giaNhap` = SP chính theo ĐƠN VỊ GỐC, quy đổi = × hệ số.
    'sanPhamNcc.giaNhap': 60000, 'sanPhamNcc.giaNhap.FIFO': 60000, 'sanPhamNcc.giaNhap.DD': 60000, 'sanPhamNcc.giaNhap.TC': 60000,
    // Tồn đầu kỳ RIÊNG từng sản phẩm — SP chính: mỗi biến thể một dòng theo đơn vị gốc.
    // 🚫 Không có Đích danh: màn tồn đầu kỳ 🚫 nhận serial (`toStockItem` gán serials rỗng) mà
    //    `validateSerialRequirement` bắt số serial = số lượng ⇒ xác nhận là hỏng cả file.
    'tonKho.soLuong': 100, 'tonKho.giaVon': 60000,
    'tonKho.soLuong.FIFO': 100, 'tonKho.giaVon.FIFO': 60000,
    'tonKho.soLuong.TC': 100, // giá vốn = giá tiêu chuẩn khai ở bước 4 (`sanPham.TC.giaTieuChuan`)
  };
}

/**
 * Giá trị một khoá của bộ đang seed: người dùng đã sửa trên web (`keHoach` trong sổ) thì lấy nó,
 * không thì mặc định tính từ `runId` CỦA SỔ — 🔴 để mọi bước (mỗi bước một tiến trình) ra cùng tên.
 */
function kh(khoa) {
  const s = doc();
  const v = (s.keHoach || {})[khoa];
  if (v !== undefined && v !== null && v !== '') return v;
  const md = macDinh(s.prefix || PREFIX, s.runId || runId());
  if (!(khoa in md)) throw new Error(`Khoá kế hoạch seed không tồn tại: ${khoa}`);
  return md[khoa];
}

module.exports = { FILE, PREFIX, PREFIX_MA, VAI_TRO, doc, ghi, kh, lay, macDinh, ten, runId };
