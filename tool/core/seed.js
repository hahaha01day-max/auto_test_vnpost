'use strict';

/**
 * LÕI BỘ SEED — dùng chung cho CLI (`tool/bin/seed.js`) và web công cụ (`/seed`).
 *
 * 🔴 Danh sách bước và sổ dữ liệu phải có MỘT nguồn duy nhất. Khai hai nơi thì web bảo "bước 3
 * chưa chạy" trong khi CLI bảo đã chạy, rồi ai đó bấm chạy lại — mà màn điểm bán / nhân viên /
 * đơn vị tổ chức KHÔNG có chức năng xoá, bản ghi rác ở lại vĩnh viễn.
 */

const fs = require('node:fs');
const path = require('node:path');

const SEED_MODULE_ID = '00_seed';
const SEED_DIR = path.join(__dirname, '..', '..', 'tai-lieu-test', SEED_MODULE_ID);
// Sổ theo LÀN — một nguồn với `00_seed/seed-state.js`, 🚫 không tự ghép tên file ở đây.
const { FILE: STATE_FILE } = require('../../tai-lieu-test/00_seed/seed-state');

/** Thứ tự phụ thuộc — 🚫 KHÔNG đảo. `nhom` = khoá trong sổ; có khoá là bước đã xong. */
const BUOC = [
  { so: 1, ten: 'Đơn vị tổ chức (tỉnh, xã)', nhom: 'toChuc' },
  { so: 2, ten: 'Điểm bán (kho tự sinh theo điểm bán)', nhom: 'diemBan' },
  { so: 3, ten: 'Vai trò và nhân viên', nhom: 'nhanSu' },
  { so: 4, ten: 'Danh mục, sản phẩm, đơn vị tính / SKU', nhom: 'sanPham' },
  // 🔴 Bảng giá bán KHÔNG phải để case trỏ tới (chỉ 4 case khai khoá tên bảng giá) mà là
  //    RÀNG BUỘC NỀN: sản phẩm không nằm trong bảng giá còn hiệu lực tại điểm bán thì
  //    🚫 không thêm được vào bill — kéo chết cả cụm POS (18_1/18_2/18_3/18_5, ~358 case)
  //    và làm bước nhập kho thành vô dụng vì hàng có tồn mà không bán ra được.
  { so: 5, ten: 'Bảng giá bán', nhom: 'bangGiaBan' },
  { so: 6, ten: 'Nhà cung cấp', nhom: 'nhaCungCap' },
  { so: 7, ten: 'Sản phẩm NCC và bảng giá mua', nhom: 'sanPhamNcc' },
  { so: 8, ten: 'Nhập kho — sinh tồn thật', nhom: 'tonKho' },
  // 🚫 KHÔNG seed chương trình khuyến mại (user chốt 22/09/2026): 49 case `tenCTKM` ở
  //    `11_khuyen_mai` chấp nhận để skip. Thêm lại thì chèn bước mới, 🚫 đừng đổi số bước cũ.
];

/** Tên test của bước bắt đầu bằng chuỗi này ⇒ dùng thẳng làm `--grep`. */
/**
 * Chuỗi lọc test của một bước. 🔴 🚫 Để trần `seed ${so}`: `--grep` là regex, `seed 1` khớp cả
 *    `seed 13.1` ⇒ run bước 1 chạy lạc sang bước 13 (đo 24/09/2026). Tên test có hai dạng `seed 1.1 — …`
 *    và `seed 8 — …` ⇒ hai literal (runner escape rồi nối bằng `|`); CLI dùng bản regex.
 */
const grepCacCuaBuoc = (so) => [`seed ${so}.`, `seed ${so} `];
const grepCuaBuoc = (so) => `seed ${so}[. ]`;

/**
 * Làn mà web dùng để seed (mặc định 3) — seed bằng API vào sổ/tài khoản RIÊNG của làn, 🚫 không đụng
 * bộ chung. Xem `tai-lieu-test/LANE.md`. Đổi bằng `TOOL_SEED_LANE`.
 */
const SEED_LANE = String(process.env.TOOL_SEED_LANE || '3');
const API_CONFIG = path.join(SEED_DIR, 'playwright.api.config.js');
const soCuaLan = (lane) => (lane ? path.join(SEED_DIR, `seed-state.lane${lane}.json`) : STATE_FILE);

function docSo(lane) {
  const f = soCuaLan(lane);
  if (!fs.existsSync(f)) return { runId: null, prefix: null, taoLuc: null, duLieu: {} };
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

/** Bước đã viết spec chưa — 🚫 đừng cho bấm chạy bước chưa có file, run sẽ xanh giả vì 0 test. */
function daCoSpec(so, api = false) {
  const dir = path.join(SEED_DIR, api ? 'api-tests' : 'tests');
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => f.startsWith(String(so).padStart(2, '0')));
}

/** Trạng thái đầy đủ của 9 bước, cho cả CLI lẫn web. */
function trangThai({ lane, api = false } = {}) {
  const so = docSo(lane);
  return {
    lane: lane || null,
    api,
    soFile: path.relative(path.join(SEED_DIR, '..', '..'), soCuaLan(lane)),
    runId: so.runId,
    prefix: so.prefix,
    taoLuc: so.taoLuc,
    buoc: BUOC.map((b) => {
      const d = so.duLieu[b.nhom] || null;
      return {
        ...b,
        xong: Boolean(d),
        coSpec: daCoSpec(b.so, api),
        giaTri: d ? Object.entries(d).map(([k, v]) => `${k}=${v && typeof v === 'object' ? Object.values(v).map((x) => x?.sku || JSON.stringify(x)).join('/') : v}`) : [],
        grep: grepCuaBuoc(b.so),
      };
    }),
  };
}

// ─────────────────────────── Bộ seed trên web (mỗi lần "Tạo dữ liệu" một bộ = một làn) ───────────

const { macDinh, VAI_TRO } = require('../../tai-lieu-test/00_seed/seed-state');
const { oSeRot } = require('./seed-rot');
const ROOT = path.join(SEED_DIR, '..', '..');
const MAT_KHAU_MAC_DINH = process.env.VNPOST_SEED_PASSWORD || '123456';

const TEN_CAP = { TONG_CONG_TY: 'TCT', BUU_DIEN_TINH: 'Tỉnh', BUU_DIEN_XA: 'Xã', DIEM_BAN: 'Điểm bán' };

/** Ô nhập trên màn seed, theo bước. Khoá = khoá của `macDinh()`. */
const O_NHAP = [
  { so: 1, o: [['toChuc.maTinh', 'Mã tỉnh'], ['toChuc.tenTinh', 'Tên tỉnh'], ['toChuc.maXa', 'Mã xã (phải bắt đầu bằng mã tỉnh)'], ['toChuc.tenXa', 'Tên xã']] },
  { so: 2, o: [['diemBan.maShop', 'Mã điểm bán (phải bắt đầu bằng mã xã)'], ['diemBan.tenShop', 'Tên điểm bán']] },
  // Mọi vai trò trong DB (`00_seed/vai-tro.json`) — mỗi vai một ô tên đăng nhập.
  // Mỗi cấp gom một hàng: tiêu đề cấp (ngắt hàng) rồi tới các ô của cấp đó.
  { so: 3, o: Object.keys(TEN_CAP).flatMap((cap) => {
    const vai = VAI_TRO.vai.filter((v) => v.cap === cap);
    return vai.length ? [['', TEN_CAP[cap], 'tieuDe'], ...vai.map((v) => [`taiKhoan.${v.vai}`, `${v.roleName} (${v.roleCode})`])] : [];
  }) },
  { so: 4, o: [['sanPham.maDanhMucCha', 'Mã danh mục cha'], ['sanPham.tenDanhMucCha', 'Tên danh mục cha'], ['sanPham.maDanhMuc', 'Mã danh mục'], ['sanPham.tenDanhMuc', 'Tên danh mục'],
    ['', 'Sản phẩm FIFO', 'tieuDe'], ['sanPham.FIFO.ten', 'Tên'], ['sanPham.FIFO.sku', 'SKU'],
    ['', 'Sản phẩm Đích danh (serial)', 'tieuDe'], ['sanPham.DD.ten', 'Tên'], ['sanPham.DD.sku', 'SKU'],
    ['', 'Sản phẩm Giá tiêu chuẩn', 'tieuDe'], ['sanPham.TC.ten', 'Tên'], ['sanPham.TC.sku', 'SKU'], ['sanPham.TC.giaTieuChuan', 'Giá tiêu chuẩn (giá vốn)', 'number'],
    ['', 'Sản phẩm chính — Bình quân, có biến thể / đơn vị quy đổi', 'tieuDe'],
    ['sanPham.BT.ten', 'Tên'], ['sanPham.BT.sku', 'SKU gốc (SKU biến thể/đơn vị sinh từ đây)'],
    ['sanPham.BT.coBienThe', 'Có biến thể', 'checkbox'], ['sanPham.BT.thuocTinh', 'Tên thuộc tính (vd Màu, Size)'], ['sanPham.BT.giaTri', 'Giá trị, cách nhau dấu phẩy'],
    ['sanPham.BT.coQuyDoi', 'Có đơn vị quy đổi', 'checkbox'], ['sanPham.BT.donViGoc', 'Đơn vị gốc'], ['sanPham.BT.quyDoi', 'Quy đổi: Đơn vị=hệ số, cách nhau dấu phẩy (vd Hộp=10, Thùng=100)']] },
  { so: 5, o: [['bangGiaBan.tenBangGia', 'Tên bảng giá bán'], ['bangGiaBan.tenPhienBan', 'Tên phiên bản'],
    ['', 'Giá bán (đã gồm VAT)', 'tieuDe'],
    ['bangGiaBan.donGia', 'SP chính — theo đơn vị gốc (quy đổi = × hệ số)', 'number'], ['bangGiaBan.donGia.FIFO', 'SP FIFO', 'number'],
    ['bangGiaBan.donGia.DD', 'SP Đích danh', 'number'], ['bangGiaBan.donGia.TC', 'SP Giá tiêu chuẩn', 'number']] },
  { so: 6, o: [['nhaCungCap.tenNhomNcc', 'Tên nhóm NCC'], ['nhaCungCap.maNcc', 'Mã NCC'], ['nhaCungCap.tenNcc', 'Tên NCC'], ['nhaCungCap.dienThoaiNcc', 'Điện thoại NCC']] },
  { so: 7, o: [['sanPhamNcc.soHopDong', 'Số hợp đồng'], ['sanPhamNcc.tenBangGiaMua', 'Tên bảng giá mua'],
    ['', 'Giá nhập (sau VAT)', 'tieuDe'],
    ['sanPhamNcc.giaNhap', 'SP chính — theo đơn vị gốc (quy đổi = × hệ số)', 'number'], ['sanPhamNcc.giaNhap.FIFO', 'SP FIFO', 'number'],
    ['sanPhamNcc.giaNhap.DD', 'SP Đích danh', 'number'], ['sanPhamNcc.giaNhap.TC', 'SP Giá tiêu chuẩn', 'number']] },
  { so: 8, o: [
    ['', 'Số lượng tồn đầu kỳ (SP chính: mỗi biến thể, theo đơn vị gốc; Đích danh không khai được — màn tồn đầu kỳ không nhận serial)', 'tieuDe'],
    ['tonKho.soLuong', 'SP chính', 'number'], ['tonKho.soLuong.FIFO', 'SP FIFO', 'number'], ['tonKho.soLuong.TC', 'SP Giá tiêu chuẩn', 'number'],
    ['', 'Giá vốn (SP Giá tiêu chuẩn lấy giá tiêu chuẩn ở mục 4)', 'tieuDe'],
    ['tonKho.giaVon', 'SP chính', 'number'], ['tonKho.giaVon.FIFO', 'SP FIFO', 'number']] },
];

/**
 * Bước cần có TRƯỚC — tích một bước là tự kéo theo các bước này (web lẫn server cùng tính).
 * 4 và 6 cần 3 vì phải chạy bằng TCT RIÊNG của bộ (sinh ở bước 3), 🚫 không mượn TCT chung.
 */
const PHU_THUOC = { 1: [], 2: [1], 3: [1, 2], 4: [3], 5: [2, 4], 6: [3], 7: [2, 4, 6], 8: [2, 3, 4] };

/** Bao đóng phụ thuộc của các bước đã chọn, xếp tăng dần. */
function kemPhuThuoc(chon) {
  const ra = new Set();
  const them = (so) => { if (ra.has(so)) return; ra.add(so); (PHU_THUOC[so] || []).forEach(them); };
  chon.map(Number).filter((n) => PHU_THUOC[n]).forEach(them);
  return [...ra].sort((a, b) => a - b);
}

const fileSo = (lane) => path.join(SEED_DIR, `seed-state.lane${lane}.json`);

/** Các bộ đã có (làn ≥ 2), mới nhất trước. */
function listBo() {
  return fs.readdirSync(SEED_DIR)
    .map((f) => /^seed-state\.lane(\d+)\.json$/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => b - a)
    .map((lane) => ({ ...trangThai({ lane: String(lane), api: true }), luuVao: docSo(String(lane)).luuVao || [], profileId: docSo(String(lane)).profileId || null }));
}

/** Bộ MỚI: làn kế tiếp + runId + giá trị mặc định để điền sẵn ô nhập. 🚫 Chưa ghi gì. */
function boMoi() {
  const lanes = listBo().map((b) => Number(b.lane));
  const lane = String(Math.max(3, ...lanes) + 1);
  const runId = String(Date.now()).slice(-8);
  const prefix = `AUTO${lane}_`;
  return { lane, runId, prefix, giaTri: macDinh(prefix, runId), oNhap: O_NHAP };
}

/**
 * Chuẩn hoá + kiểm tiền tố người dùng nhập: chữ HOA/số, bắt đầu bằng chữ, 2–8 ký tự, luôn kết thúc `_`.
 * 🔴 ≤ 8 ký tự vì mã tỉnh = `<tiền tố>T` cắt 10 ký tự — dài hơn là mã tỉnh mất chữ `T`, dễ trùng.
 * 🔴 Cấm tiền tố của bộ khác (trộn hai bộ vĩnh viễn) và `AUTOTEST` (seed-clean XOÁ THẬT tiền tố đó).
 */
function chuanTienTo(raw, lane) {
  const v = String(raw ?? '').trim().toUpperCase().replace(/_+$/, '');
  if (v === '') return `AUTO${lane}_`;
  if (!/^[A-Z][A-Z0-9]{1,7}$/.test(v)) throw new Error(`Tiền tố "${raw}" không hợp lệ: 2–8 ký tự chữ/số, bắt đầu bằng chữ (dấu "_" cuối tự thêm).`);
  if (v.startsWith('AUTOTEST')) throw new Error('Tiền tố AUTOTEST_ dành cho bản ghi rác của case — seed-clean sẽ xoá nó.');
  const p = `${v}_`;
  const trung = listBo().find((b) => String(b.prefix || '').toUpperCase() === p && String(b.lane) !== String(lane));
  if (trung) throw new Error(`Tiền tố ${p} đã dùng cho bộ dữ liệu ${trung.lane}.`);
  return p;
}

/**
 * Ghi sổ của bộ mới (kế hoạch = giá trị người dùng sửa) + `.env.lane<n>` khởi động.
 * 🔴 Từ chối nếu làn đã có sổ — chạy đè là trộn hai bộ dữ liệu vĩnh viễn.
 */
function taoBo({ lane, runId, prefix: tienTo, giaTri, by, profileId }) {
  if (!/^\d+$/.test(String(lane)) || Number(lane) < 4) throw new Error(`Bộ dữ liệu không hợp lệ: ${lane}`);
  if (fs.existsSync(fileSo(lane))) throw new Error(`Bộ dữ liệu ${lane} đã có sổ — tải lại trang để lấy bộ mới.`);
  const prefix = chuanTienTo(tienTo, lane);
  const md = macDinh(prefix, String(runId));
  // Ô điền sẵn theo tiền tố mặc định mà người dùng không sửa ⇒ sinh lại theo tiền tố đã chọn
  // (🚫 giữ `AUTO<làn>_…` trong bộ mang tiền tố khác — kể cả khi trình duyệt tắt JS).
  const mdCu = macDinh(`AUTO${lane}_`, String(runId));
  const keHoach = {};
  for (const k of Object.keys(md)) {
    const raw = giaTri?.[k];
    // Ô tích gửi kèm ô ẩn "0" ⇒ nhận MẢNG ['0','1'] khi tích, '0' khi bỏ — lấy giá trị cuối.
    if (typeof md[k] === 'boolean') { keHoach[k] = String([].concat(raw ?? (md[k] ? '1' : '0')).pop()) === '1'; continue; }
    const v = String(raw ?? '').trim();
    keHoach[k] = v === '' || v === String(mdCu[k]) ? md[k] : (typeof md[k] === 'number' ? Number(v) : v);
  }
  if (!String(keHoach['toChuc.maXa']).startsWith(keHoach['toChuc.maTinh'])) throw new Error('Mã xã phải bắt đầu bằng mã tỉnh.');
  if (!String(keHoach['diemBan.maShop']).startsWith(keHoach['toChuc.maXa'])) throw new Error('Mã điểm bán phải bắt đầu bằng mã xã.');
  fs.writeFileSync(fileSo(lane), `${JSON.stringify({ runId: String(runId), prefix, taoLuc: null, taoBoi: by, profileId: Number(profileId) || null, keHoach, duLieu: {} }, null, 2)}\n`);
  const envFile = path.join(ROOT, `.env.lane${lane}`);
  if (!fs.existsSync(envFile)) fs.writeFileSync(envFile, `# Làn ${lane} — tạo từ web /seed. Bước 1–3 dùng TCT của hồ sơ; seed 3.5 ghi đè file này.\n`);
  return { lane: String(lane) };
}

/**
 * "Lưu vào hồ sơ môi trường": tài khoản theo vai + rót dữ liệu vào input của case.
 * 🔴 Input rót vào bảng `case_inputs` của HỒ SƠ ĐÓ (🚫 không ghi `test-input.json`), đánh dấu
 *    `updated_by = seed:lane<n>`; ô người dùng đã tự khai (updated_by khác `seed:`) thì 🚫 không đè.
 */
function luuVaoHoSo({ lane, profileId, by }) {
  const profiles = require('./profiles');
  const inputs = require('./inputs');
  const { getDb, nowIso } = require('./db');
  const so = docSo(String(lane));
  const tk = so.duLieu?.taiKhoanLan || {};
  if (!tk.tct || !tk.shop) throw new Error(`Bộ dữ liệu ${lane} chưa tạo xong tài khoản (bước 3).`);
  // Vai hồ sơ ← tài khoản trong sổ, theo `vai-tro.json` (kể cả bí danh `bi`). Nhãn phạm vi = đơn vị gán.
  const vai = {};
  for (const v of VAI_TRO.vai) {
    if (!tk[v.vai]) continue;
    for (const k of [v.vai, ...(v.bi || [])]) vai[k] = [tk[v.vai], tk[v.vai].donVi];
  }
  let soVai = 0;
  for (const [role, [t, nhan]] of Object.entries(vai)) {
    if (!t?.tenDangNhap) continue;
    profiles.setAccount(Number(profileId), role, { account: t.tenDangNhap, password: MAT_KHAU_MAC_DINH, scopeLabel: nhan });
    soVai += 1;
  }

  const chung = docSo(null).duLieu || {};
  const o = oSeRot(so.duLieu || {}, path.join(ROOT, 'tai-lieu-test'), chung);
  const db = getDb();
  const daKhai = db.prepare('SELECT updated_by FROM case_inputs WHERE profile_id = ? AND module_id = ? AND case_id = ? AND field = ?');
  const theoModule = {};
  let boQua = 0;
  for (const x of o) {
    const cu = daKhai.get(Number(profileId), x.moduleId, x.caseId, x.field);
    if (cu && !String(cu.updated_by || '').startsWith('seed:')) { boQua += 1; continue; }
    (theoModule[x.moduleId] ||= []).push({ caseId: x.caseId, field: x.field, value: x.value });
  }
  let soO = 0;
  for (const [m, entries] of Object.entries(theoModule)) {
    inputs.setOverrides(Number(profileId), m, entries, `seed:lane${lane}`);
    soO += entries.length;
  }

  const f = fileSo(lane);
  const raw = JSON.parse(fs.readFileSync(f, 'utf8'));
  raw.luuVao = [...(raw.luuVao || []).filter((x) => x.profileId !== Number(profileId)), { profileId: Number(profileId), luc: nowIso(), boi: by, soVai, soO }];
  fs.writeFileSync(f, `${JSON.stringify(raw, null, 2)}\n`);
  return { soVai, soO, soModule: Object.keys(theoModule).length, boQua };
}

module.exports = {
  API_CONFIG, BUOC, O_NHAP, SEED_DIR, SEED_LANE, SEED_MODULE_ID, STATE_FILE,
  PHU_THUOC, VAI_TRO, boMoi, daCoSpec, kemPhuThuoc, docSo, grepCacCuaBuoc, grepCuaBuoc, listBo, luuVaoHoSo, taoBo, trangThai,
};
