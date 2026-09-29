'use strict';

/**
 * ĐỌC TÀI LIỆU GỐC (sheet QC xuất ra CSV) ở `tai-lieu-test/test-case-goc/`.
 *
 * 🔴 19 file KHÔNG đồng dạng — đo ngày 18/09/2026. Mọi hằng số dưới đây là hệ quả của số đo,
 * 🚫 đừng "dọn cho gọn" nếu chưa chạy lại `node tool/bin/doi-chieu-goc.js --tong-hop`:
 *
 * 1. **Dòng tiêu đề ở dòng 8 HOẶC dòng 9** → phải dò, 🚫 không cố định chỉ số.
 * 2. **Số cột từ 11 tới 15**, và cột `Điều kiện cần có` khi ở vị trí 2, khi ở vị trí 3 (ô gộp)
 *    → phải lấy cột **theo TÊN tiêu đề**, 🚫 không theo chỉ số.
 * 3. 🔴 **4/19 file có case nhưng cột ID BỎ TRỐNG** (`ban_ton_kho_am`, `bao_cao_cong_no_khach_hang`,
 *    `danh_muc_san_pham`, `loyalty`). Lọc theo "có ID" thì 4 file này ra **0 case** — đó chính là
 *    kết quả sai mà bản đầu tiên của bộ đếm đã cho ra. Nhận diện case bằng:
 *    **có `Các bước thực hiện` HOẶC `Kết quả mong muốn`**.
 * 4. **Tiền tố mã không tin được**: `FUNC_1` dùng ở HAI file khác nhau (`bao_cao_cong_no_khach_hang`
 *    và `quan_ly_kho`) ⇒ mã gốc chỉ duy nhất TRONG một file. Khoá đối chiếu luôn là
 *    `<tên file>#<mã>`, 🚫 không phải mã trần.
 *
 * ⭐ **Tự kiểm chứng:** mỗi sheet tự khai "Tổng các tình huống kiểm thử" ở dòng 3. Hàm `docCaFile()`
 * trả về cả `tongKhaiBao` để so với số đếm được — lệch là dấu hiệu parser sai HOẶC sheet khai sai,
 * phải xem chứ không được bỏ qua.
 */

const fs = require('node:fs');
const path = require('node:path');

const { TEST_ROOT } = require('./modules');
const { parseCsv } = require('./cases');

const GOC_DIR = path.join(TEST_ROOT, 'test-case-goc');

const chuan = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const khoaCot = (s) => chuan(s).toLowerCase();

/** Dò dòng tiêu đề: dòng có cả "Tình huống" và "Các bước thực hiện". */
function timDongTieuDe(rows) {
  for (let i = 0; i < Math.min(rows.length, 30); i += 1) {
    const cells = (rows[i] || []).map(khoaCot);
    if (cells.includes('tình huống') && cells.some((c) => c.startsWith('các bước'))) return i;
  }
  return -1;
}

function dungChiMuc(header) {
  const h = header.map(khoaCot);
  const tim = (...ten) => {
    for (const t of ten) {
      const i = h.findIndex((c) => c === t || c.startsWith(t));
      if (i >= 0) return i;
    }
    return -1;
  };
  return {
    id: tim('id'),
    ten: tim('tình huống'),
    dieuKien: tim('điều kiện'),
    buoc: tim('các bước'),
    uuTien: tim('ưu tiên'),
    manHinh: tim('ứng dụng', 'màn hình'),
    kyVong: tim('kết quả mong'),
  };
}

/**
 * @returns {{file:string, tongKhaiBao:number|null, dongTieuDe:number, cases:Array, loi:string|null}}
 *   mỗi case: `{ma, maDayDu, ten, nhom, dieuKien, buoc, uuTien, manHinh, kyVong, dong}`
 */
function docCaFile(fileName) {
  const filePath = path.join(GOC_DIR, fileName);
  if (!fs.existsSync(filePath)) return { file: fileName, cases: [], loi: `Không có file ${fileName}` };

  const rows = parseCsv(fs.readFileSync(filePath, 'utf8'));
  const hi = timDongTieuDe(rows);
  if (hi < 0) return { file: fileName, cases: [], loi: 'Không tìm được dòng tiêu đề (cần "Tình huống" + "Các bước thực hiện")' };

  const c = dungChiMuc(rows[hi]);
  // Dòng 3 của sheet: "Tổng các tình huống kiểm thử" | ... | <số>
  const dongTong = rows.slice(0, hi).find((r) => khoaCot(r[1]).startsWith('tổng các tình huống'));
  const tongKhaiBao = dongTong ? Number((dongTong.filter(Boolean).pop() || '').replace(/\D/g, '')) || null : null;

  const cases = [];
  // 🔴 Tiêu đề "chung chung" KHÔNG được ghi đè nhóm đang xét.
  //    Sheet hay chèn "HAPPY CASE" giữa nhóm thật và các case: "Đặt hàng nhà cung cấp" → "HAPPY CASE"
  //    → 30 case. Lấy tiêu đề gần nhất thì cả 30 case mang nhóm "HAPPY CASE", không luật ánh xạ nào
  //    khớp và cụm rơi vào phân hệ mặc định (đo: 04_5 nhận 156 case, 35-gia-von-mac-dinh nhận 0).
  //    🚫 Đã thử suy luận cha–con theo "có case hay chưa" và BỎ: sheet có nhiều tiêu đề rỗng liên
  //    tiếp vốn là anh em, suy ra cây sai và đường dẫn phình vô nghĩa (đo: một nhóm dài 9 cấp).
  const TIEU_DE_CHUNG = [
    'happy case', 'kiểm thử chức năng', 'kiểm thử giao diện', 'kiểm tra permission',
    'unhappy case', 'abnormal case',
  ];
  const laTieuDeChung = (t) => TIEU_DE_CHUNG.includes(khoaCot(t));

  let nhom = '';

  for (let i = hi + 1; i < rows.length; i += 1) {
    const r = rows[i];
    const buoc = chuan(r[c.buoc]);
    const kyVong = chuan(r[c.kyVong]);
    const ten = chuan(r[c.ten]);

    // 🔴 Dòng KHÔNG có bước và KHÔNG có kỳ vọng mà vẫn có tên = tiêu đề nhóm, không phải case.
    if (!buoc && !kyVong) {
      if (ten && !laTieuDeChung(ten)) nhom = ten;
      continue;
    }

    const ma = chuan(r[c.id]);
    cases.push({
      ma,
      // 🔴 4/19 sheet bỏ trống cột ID. Khoá nối phải LUÔN có giá trị, nếu không những case đó
      //    vĩnh viễn không khai `Ma goc` được và mãi nằm ở cột "chưa dựng".
      maKhoa: ma || `dong${i + 1}`,
      // Case không có mã thì sinh mã ổn định theo THỨ TỰ trong file (dòng) để còn nối được.
      maDayDu: `${fileName}#${ma || `dong${i + 1}`}`,
      ten,
      nhom,
      dieuKien: chuan(r[c.dieuKien]),
      buoc,
      uuTien: chuan(r[c.uuTien]),
      manHinh: chuan(r[c.manHinh]),
      kyVong,
      dong: i + 1,
    });
  }

  return { file: fileName, tongKhaiBao, dongTieuDe: hi, cases, loi: null };
}

function danhSachFile() {
  if (!fs.existsSync(GOC_DIR)) return [];
  return fs.readdirSync(GOC_DIR).filter((f) => f.endsWith('.csv')).sort();
}

/** Case trùng nhau TRONG cùng một file — so mọi trường nội dung, 🚫 không chỉ so tên. */
function timTrungLap(cases) {
  const theoNoiDung = new Map();
  for (const c of cases) {
    const khoa = [c.ten, c.dieuKien, c.buoc, c.kyVong].join('||').toLowerCase();
    if (!theoNoiDung.has(khoa)) theoNoiDung.set(khoa, []);
    theoNoiDung.get(khoa).push(c);
  }
  return [...theoNoiDung.values()].filter((v) => v.length > 1);
}

module.exports = { GOC_DIR, danhSachFile, docCaFile, timTrungLap, chuan };
