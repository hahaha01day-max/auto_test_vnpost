'use strict';

/**
 * Sinh bản trình bày theo MẪU QC từ `tai-lieu-test/<phân hệ>/test-cases.csv`.
 *
 * 🔴 Bản gốc vẫn là `test-cases.csv` của từng phân hệ. File trong `test-case-qc/` là bản sinh ra
 * để giao QC — sửa tay ở đó là mất khi chạy lại. Muốn đổi nội dung case thì sửa `test-cases.csv`.
 *
 *   node tool/bin/to-qc-csv.js                 # toàn bộ 48 phân hệ
 *   node tool/bin/to-qc-csv.js 04_4_kiem_kho   # một phân hệ
 *   node tool/bin/to-qc-csv.js --check         # chỉ báo chỗ thiếu, không ghi file
 *
 * Xuất .xlsx bằng `node tool/bin/qc-csv-to-xlsx.js` sau khi chạy script này.
 *
 * Quy ước mẫu QC đã chốt với user — đặc tả đầy đủ ở `tai-lieu-test/_CHECKLIST_MAU_QC.md`:
 *   - 12 cột; đã bỏ `Sinh test script`, `Ứng dụng/ màn hình`, `SCRIPT` của mẫu gốc
 *   - `ID` giữ nguyên mã cũ, 🚫 không đánh lại thành `FUNC_<n>_<seq>`
 *   - dòng nhóm = cột `ID` rỗng, tiêu đề ở cột `Tình huống`; một dòng nhóm lớn viết HOA rồi tới
 *     các dòng nhóm con theo mã task
 *   - `Các bước thực hiện`: tách dòng trước mỗi `N.`, xoá đường link
 *   - `Kết quả mong muốn`: bỏ các đoạn ghi chú 🔴 của repo
 *   - `Ưu tiên` giữ cột nhưng để trống (trừ phân hệ có sẵn cột `Uu tien`) — QC tự điền
 *   - `Kết quả thực tế` · `Kết quả` · `Người thực hiện` · `Ngày tạo` · `Ngày thực hiện`: để trống
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', 'tai-lieu-test');
/** Kho tài liệu HDSD — `resource/hdsd/hdsd<phân hệ>/tasks/<mã>_*.md`, frontmatter có `tieu_de`. */
const HDSD_ROOT = path.join(__dirname, '..', '..', '..', 'resource', 'hdsd');
const OUT_DIR = path.join(ROOT, 'test-case-qc');

/**
 * Tên nhóm điền tay, giữ qua mọi lần chạy lại — ưu tiên cao nhất.
 * Dùng cho các nhóm mà README của phân hệ 🚫 không khai tên (script in ra "chưa đặt tên nhóm").
 * Cấu trúc: { "<phân hệ>": { "<mã nhóm>": "<tên>" } }
 */
const OVERRIDE_FILE = path.join(OUT_DIR, '_ten-nhom.json');

/**
 * Kết quả chạy thật, do `tool/bin/thu-ket-qua.js` sinh từ artifact Playwright.
 * 🔴 Chỉ điền cột `Kết quả` từ file này — 🚫 KHÔNG suy từ con số trong `test-cases.md`, vì ở đó
 * chỉ có tổng số "N đạt", không truy được case nào đạt.
 */
const KET_QUA_FILE = path.join(OUT_DIR, '_ket-qua.json');
const BO_QUA = new Set(['shared', 'test-case-goc', 'test-case-qc']);

const HEADER = [
  'ID', 'Tình huống', 'Điều kiện cần có', 'Các bước thực hiện', 'Ưu tiên\n(Cao/ TB/ Thấp)',
  'Kết quả mong  muốn', 'Kết quả thực tế', 'Kết quả', 'Người thực hiện', 'Ngày tạo',
  'Ngày thực hiện', '',
];
const NCOL = HEADER.length;
const COL = { id: 0, tinhHuong: 1, dieuKien: 2, buoc: 3, uuTien: 4, kyVong: 5, ketQua: 7 };

/** Nhãn khối metadata đầu file, theo đúng thứ tự mẫu QC. `File Script` đã bỏ theo chốt với user. */
const META_LABELS = [
  'Chức năng', 'Mã Testcase', 'Tổng các tình huống kiểm thử', 'Chưa thực hiện',
  'Đạt yêu cầu', 'Không đạt yêu cầu', 'Thực hiện sau', 'Không phải thực hiện',
];

// ── đọc / ghi CSV ────────────────────────────────────────────────────────────

/** Đọc CSV theo RFC 4180: ô bọc `"` được chứa `,`, `"` và xuống dòng. */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
      } else cell += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(cell); cell = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function readCases(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8')).filter((r) => r.some((c) => c.trim()));
  const head = rows.shift().map((h) => h.trim());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

function toCsv(rows) {
  const esc = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return `﻿${rows.map((r) => r.map(esc).join(',')).join('\r\n')}\r\n`;
}

// ── chuẩn hoá nội dung ô ─────────────────────────────────────────────────────

/**
 * Bỏ đường link và tách dòng trước mỗi bước `N.`.
 * 🚫 Không bẻ dòng theo dấu chấm: 748 case chỉ có một bước không đánh số, bẻ là cắt sai ở tên
 * viết tắt và số thập phân.
 */
function chuanHoaBuoc(raw) {
  let s = (raw || '').trim();
  if (!s) return '';
  s = s.replace(/https?:\/\/\S+/g, '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ');
  s = s.replace(/(?<!^)(?<!\n)(?=\b\d+\.\s)/g, '\n');
  return s.split('\n').map((l) => l.trim().replace(/\s+([,.;:])/g, '$1')).filter(Boolean).join('\n');
}

/** Dọn ô sau khi cắt: bỏ ký hiệu nội bộ, từ viết tắt, đuôi thừa; viết hoa lại đầu câu. */
function donDep(t) {
  return t
    .replace(/\s*[🔴🚫]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .replace(/[\s;,—–-]*\bHDSD\b[\s.]*$/, '')  // chữ "HDSD" lủng lẳng sau khi cắt ghi chú
    .replace(/\bHDSD\b/g, 'tài liệu hướng dẫn')  // 🚫 tài liệu giao QC không dùng từ viết tắt nội bộ
    .replace(/\bBE\b/g, 'Hệ thống')             // "BE trả lỗi …" → QC đọc được
    .replace(/\bFE\b/g, 'Giao diện')
    .replace(/[\s;,—–-]+$/, '')          // đuôi thừa sau khi cắt mệnh đề cuối
    .trim()
    .replace(/^./, (c) => c.toUpperCase())   // cắt mất vế đầu thì vế sau phải viết hoa lại
    || CHUA_CHOT;                            // dọn xong mà trắng thì vẫn phải có câu cho QC
}

/**
 * Câu mang dấu 🔴/🚫 chia làm HAI loại, 🚫 đừng cắt mù cả hai:
 *   - **Ghi chú kỹ thuật** cho người viết script: nhắc tên file code, service, mapper, sheet QC,
 *     bảo đi đo rồi mới chốt kỳ vọng, trỏ sang case khác. Loại này 🚫 không thuộc tài liệu QC.
 *   - **Nhấn mạnh của chính kỳ vọng**: "🚫 KHÔNG hiện 0%", "🚫 KHÔNG có vùng tải tệp". Cắt đi là
 *     mất nửa quan trọng nhất của kỳ vọng.
 * Phân biệt bằng CUE bên dưới: câu nói VỀ code / tài liệu / cách đo là ghi chú; câu nói về HÀNH VI
 * HỆ THỐNG thì giữ.
 */
/**
 * 🔴 `\\b` của JS chỉ hiểu chữ ASCII: `'ghi rõ'` KHÔNG BAO GIỜ khớp, vì `õ` không phải word-char
 * nên sau nó không có ranh giới từ. 🚫 Đừng thêm `\\b` sau chữ tiếng Việt có dấu.
 */
const CUE_GHI_CHU = new RegExp([
  'script', 'spec\\b', 'selector', 'trong code\\b', '\\bCode chỉ', 'rule required', 'lưu ý',
  'bị comment', 'HDSD[^.;]{0,14}(?:không|KHÔNG)',
  'assert', 'mapper', '-service\\b', 'kiểm bằng', 'xem nhận xét tay', 'bẫy đã (?:biết|gặp)',
  'repo\\b', 'case gốc', 'sheet\\b', 'ant-form-item', 'thuộc phân hệ', 'phân hệ \\d',
  'backend\\b', 'res\\.data', 'không chép kỳ vọng', 'kiểm (?:ở|lại) (?:bước|case|mục)',
  'ghi lại hành vi thật', 'phơi hành vi', 'ghi lại (?:có|hành vi)', 'ghi nhận\\b', 'ghi rõ',
  'chốt sau khi đo', 'chưa chốt', 'phải đo', 'trước khi viết', 'không đoán', 'không kết luận',
  'không tự sửa', 'không (?:chỉnh|sửa) kỳ vọng', 'không được dùng lẫn', 'không phải lỗi',
  'auto test', 'đo được', 'cần xác nhận', 'thao tác thường ngày', 'HDSD (?:khuyên|ghi|nói|khai)', 'case ghi .{0,12}thật',
  'lỗ hổng đặc tả', 'mâu thuẫn đặc tả', 'chưa có đặc tả',
  'HDSD\\s*\\d*\\s*(?:KHÔNG|không|cũng không)',
  '\\b\\d{2}[a-z]?(?:_\\d)?_\\d{3}_\\d{3}\\b',
  'playwright', '\\bDW\\b', 'đối chiếu số', 'đối chiếu bằng tay', 'kiểm bằng tay',
  // Câu hướng dẫn NGƯỜI TEST / người viết script, 🚫 không mô tả hành vi hệ thống.
  'ghi rõ', 'ghi lại\\b', 'ghi nhận\\b', 'ghi kết quả', 'đáng báo', 'báo ngay', 'báo lại',
  'đừng kỳ vọng', 'đừng tìm', 'đừng chấp nhận', 'đừng so', 'đừng bóc', 'không giả định',
  'case con\\b', 'case ghi\\b', 'thành một case', 'câu hỏi số tiền',
  'comment out', 'tài liệu (?:không|chưa) nói', 'ghi phiếu', 'từ code', 'đều phải kiểm',
  'phải kiểm(?: cả)?\\b', 'lỗ hổng', 'đáng ngờ', 'đọc cấu hình trước', 'nếu .{0,40}thì kiểm',
  'kiểm (?:cả )?(?:ở|tại) (?:phân hệ|màn|danh sách)', 'kiểm phần\\b', 'khác màn\\b',
  // Định danh code trong backtick: chỉ ASCII, không khoảng trắng — phân biệt với chuỗi UI tiếng Việt
  // cũng đặt trong backtick (`Đã huỷ 5 lịch của <tên nhân viên>`) vốn thuộc kỳ vọng thật.
  '`[A-Za-z_][A-Za-z0-9_.]*`',
].join('|'), 'i');

/** Tách câu để lọc: theo dấu chấm và xuống dòng. 🚫 Không tách ở `;` — ghi chú hay dùng `;` giữa chừng. */
function tachCau(t) {
  return t.split(/(?<=\.)\s+|\n+/).filter((c) => c.trim());
}

/** Câu chỉ toàn ghi chú, không cần dấu 🔴/🚫 đứng kèm. */
/** Ô mà kỳ vọng vốn chỉ là ghi chú — thay bằng câu này để QC biết phải làm gì. */
const CHUA_CHOT = 'Chưa chốt kỳ vọng — ghi lại hành vi thật của hệ thống khi test.';

const CUE_MANH = new RegExp([
  // Câu ra lệnh cho NGƯỜI TEST, đứng đầu mệnh đề hoặc sau dấu gạch nối.
  // 🚫 'ghi nhận' trần KHÔNG phải cue: "Ghi nhận công nợ giữa Tỉnh và NCC" là hành vi hệ thống.
  '^(?:[—–-]\\s*)?ghi (?:lại|rõ|phiếu)', 'ghi nhận (?:thực tế|hành vi|kết quả|lại)',
  '[—–-]\\s*ghi (?:lại|rõ|phiếu)',
  'ghi (?:lại|rõ) (?:giá trị|nguyên văn|cách|hành vi|thông báo|kết quả|chính xác)',
  'ghi rõ\\.',
  // Bình luận VỀ tài liệu / mã nguồn, 🚫 không mô tả hành vi hệ thống.
  'theo code hiện tại', 'không phải lỗi test', 'bẫy đã (?:biết|gặp)', 'bẫy SAI IM LẶNG',
  'lệch đặc tả', 'xem mục lỗ hổng', 'lỗ hổng đặc tả', 'mâu thuẫn đặc tả', 'xem nhận xét tay',
  'HDSD[^.;]{0,30}(?:ghi|viết|nói|khai|ngụ ý|bước)',
  '\\bsheet\\b', '\\bcase gốc\\b', 'kiểm bằng', 'đối chiếu phải biết',
  'chốt sau khi đo', 'không đoán', 'để ĐO', 'đo rồi user chốt', 'case này để',
  'thì là (?:lỗi|LỖI)', 'là yêu cầu mới',
  // Giọng RA LỆNH cho người test, 🚫 không mô tả hành vi hệ thống.
  'phải (?:đo|ghi rõ|viết theo|kiểm)', 'đo rồi (?:báo|user)', 'lấy nguyên văn',
  'đối chiếu (?:bằng tay|với)', 'tính tay', 'không chấp nhận một',
  'tách cột chênh lệch riêng từ', 'chạy để lấy hành vi', '^đối chiếu: phân hệ',
  'đáng báo', 'ghi phiếu', 'kiểm cả (?:việc|trường hợp|giá)', 'phải kiểm', 'biết bẫy này',
  'lưu ý (?:kết quả|khoảng|về)', 'comment out', '\\bCode (?:cho|tự|chỉ|đặt|gọi)',
  'trong code', 'từ code',
].join('|'), 'i');

/**
 * Dấu hiệu code — nhận ra NGAY CẢ khi mệnh đề không mang 🔴/🚫, vì tên file / tên class / đường dẫn
 * API trong kỳ vọng luôn là ghi chú cho người viết script, 🚫 không phải điều QC đối chiếu được.
 */
/** Ghi chú nối vào đuôi kỳ vọng bằng dấu gạch ngang, 🚫 không mang 🔴/🚫 nên phải bắt riêng. */
const CUE_DUOI_CAU = /script (?:so|phải|bám)|dùng đúng bản này|xem mục lỗ hổng/i;

const CUE_CODE = new RegExp([
  '\\bscript\\b',
  '\\.(?:jsx?|java|vue|ts)\\b',                       // tên file: ShopManagement.jsx
  '[A-Z][A-Za-z]+(?:Controller|Service|Tab|Modal|Drawer)\\b', // tên class
  '`[A-Za-z_][A-Za-z0-9_.]*`',                       // định danh trong backtick: `PHONE_PATTERN`
  '`[a-zA-Z]+:\\s*[A-Z_][A-Z0-9_]*`',                // `pattern: PHONE_PATTERN`
  '[A-Z][A-Za-z]+\\.[A-Z_]{3,}',                     // hằng trong class: LoyaltyErrorCode.OUT_OF_SCOPE
  '`\\\\d{2}[a-z]?(?:_\\\\d)?_\\\\d{3}_\\\\d{3}`',           // tham chiếu case khác: `02_010_005`
  '\\b[a-z][A-Za-z0-9]*\\(\\)',                        // lời gọi hàm: handlSearch()
  '\\b(?:disabled|hidden|required|value)=\\{',         // prop JSX: disabled={!isAddNew}
  '\\bcode (?:gọi|đặt|chỉ|ràng buộc|khai|có)',
  'sheet QC', 'khai trong code', '^Như `[^`]+`:',
  '`[^`]*[:(){}>][^`]*`',   // backtick có ký hiệu code: `min:6, max:50`, `allowOverlap: true`
  '=>',
  // camelCase là tên trường/biến trong code (shopId, orderAmountPerPoint, setFieldValue).
  // 🚫 KHÔNG bắt ALLCAPS_ (TONG_CONG_TY, HANDED_OVER, CREDIT_NOTE_ALREADY_SETTLED): đó là mã vai
  // trò, mã trạng thái và mã lỗi nghiệp vụ mà QC vẫn dùng khi lập phiếu.
  '\\b[a-z]+[A-Z][A-Za-z0-9]*\\b',
].join('|'));

/**
 * Bỏ ghi chú kỹ thuật của repo khỏi kỳ vọng, giữ nguyên phần kỳ vọng gốc từ sheet QC.
 *
 * 🔴 Cắt TỪ DẤU 🔴/🚫 TỚI HẾT CÂU, 🚫 không cắt cả câu: ghi chú hay được nối vào đuôi một kỳ vọng
 * thật ("Hiện Alert nguyên văn "…" — 🔴 khác hẳn thông báo của 01_090_005"). Cắt cả câu là mất
 * nguyên văn thông báo mà QC cần đối chiếu.
 *
 * 🔴 Giữ lại dấu 🔴/🚫 dùng để NHẤN MẠNH chính kỳ vọng ("🚫 KHÔNG hiện 0%", "🚫 KHÔNG có vùng tải
 * tệp") — phân biệt bằng `CUE_GHI_CHU`: câu nói VỀ code / tài liệu / cách đo là ghi chú; câu nói về
 * HÀNH VI HỆ THỐNG thì giữ. Cuối cùng bỏ ký tự 🔴/🚫 khỏi phần giữ lại, vì tài liệu giao QC 🚫
 * không mang ký hiệu nội bộ.
 *
 * 🔴 Cắt xong mà rỗng thì GIỮ NGUYÊN nội dung — có case kỳ vọng vốn CHỈ GỒM ghi chú, ô rỗng trơn
 * thì QC không có gì đối chiếu. `_soat-ghi-chu.md` liệt kê để soát tay.
 */
function boGhiChuRepo(raw, thongKe) {
  const s = (raw || '').replace(/\r\n?/g, '\n').trim();
  if (!s) return '';

  const sauDoan = s.split(/\n\s*\n/)
    .filter((d) => !d.trimStart().startsWith('🔴'))
    .map((d) => d.trim())
    .join('\n\n')
    .trim() || s;

  // Ghi chú lồng trong ngoặc giữa một kỳ vọng thật — bỏ riêng cụm ngoặc, 🚫 đừng bỏ cả câu.
  // Ghi chú lồng trong ngoặc giữa một kỳ vọng thật — bỏ riêng cụm ngoặc, 🚫 đừng bỏ cả mệnh đề:
  // "Chuyển sang trang chi tiết (route `EMPLOYEE_MANAGEMENT_DETAIL`…)" phải còn lại vế đầu.
  const khongNgoac = sauDoan
    // Cho phép MỘT cấp ngoặc lồng: `form.setFieldsValue({ active: true })`
    .replace(/\s*\((?:[^()]|\([^()]*\))*\)/g,
      (m) => (CUE_CODE.test(m) || CUE_MANH.test(m) ? '' : m))
    .replace(/\s*\([^()]*[🔴🚫][^()]*\)/g, (m) => (CUE_GHI_CHU.test(m) ? '' : m));

  // Lọc ở mức MỆNH ĐỀ (tách thêm ở `;`), 🚫 không ở mức câu: ghi chú hay dính chung câu với kỳ vọng
  // thật qua dấu `;` — "Ghi lại hành vi thật; khối tiền 🚫 không được tràn số".
  const giuCau = [];
  let coCatTaiLieu = false;
  for (const cau of tachCau(khongNgoac)) {
    const giuMenh = [];
    let dangTrongGhiChu = false;
    for (const menh of cau.split(/(?<=;)\s+/).filter((x) => x.trim())) {
      // Ghi chú thường trải qua nhiều mệnh đề; mệnh đề nối tiếp bắt đầu bằng chữ THƯỜNG là phần
      // còn lại của ghi chú vừa cắt, 🚫 không phải kỳ vọng mới.
      if (dangTrongGhiChu && /^[a-zàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/.test(menh.trim())) {
        if (thongKe) thongKe.cat.push(menh.trim());
        continue;
      }
      dangTrongGhiChu = false;
      const sach = menh.replace(/[🔴🚫]/g, ' ');
      const coDau = /[🔴🚫]/.test(menh);
      // Câu kỳ vọng do người soạn chủ động viết theo khuôn "Chưa chốt kỳ vọng — ghi nhận thực tế:
      // …" là NỘI DUNG, 🚫 không phải ghi chú; nó trùng khuôn cue nên phải miễn trừ trước.
      if (/^chưa chốt kỳ vọng/i.test(menh.trim())) { giuMenh.push(menh); continue; }

      const ghiChuTaiLieu = CUE_MANH.test(sach) || (coDau && CUE_GHI_CHU.test(sach));
      if (ghiChuTaiLieu || CUE_CODE.test(sach)) {
        if (thongKe) thongKe.cat.push(menh.trim());
        // 🔴 Chỉ ghi chú KIỂU TÀI LIỆU mới kéo dài sang mệnh đề sau. Mệnh đề bị cắt vì chứa tên
        // biến thường nằm GIỮA hai mệnh đề kỳ vọng thật ("… (onSelect gọi …); dropdown chỉ liệt kê
        // xã thuộc tỉnh B") — bật cờ ở đây là ăn mất vế sau.
        if (ghiChuTaiLieu) { dangTrongGhiChu = true; coCatTaiLieu = true; }
        // Ghi chú nối vào đuôi bằng dấu 🔴/🚫 — giữ lại phần kỳ vọng đứng TRƯỚC dấu.
        const vt = menh.search(/[🔴🚫]/);
        if (vt > 0) {
          const dau = menh.slice(0, vt).replace(/[\s—–,-]*$/, '').trim();
          if (dau && !CUE_MANH.test(dau) && !CUE_CODE.test(dau) && !CUE_GHI_CHU.test(dau)) {
            giuMenh.push(dau);
          }
        }
        continue;
      }
      // Ghi chú nối sau dấu gạch ngang — cắt riêng phần đuôi, giữ kỳ vọng đứng trước.
      const gach = menh.search(/\s+[—–]\s+/);
      if (gach > 0 && CUE_DUOI_CAU.test(menh.slice(gach))) {
        if (thongKe) thongKe.cat.push(menh.slice(gach).trim());
        giuMenh.push(menh.slice(0, gach).trim());
        continue;
      }
      if (coDau && thongKe) thongKe.ngo.push(menh.trim());
      giuMenh.push(menh);
    }
    if (giuMenh.length) giuCau.push(giuMenh.join(' '));
  }

  // Cắt sạch nghĩa là kỳ vọng vốn CHỈ GỒM ghi chú kỹ thuật — 🚫 đừng để ô trơn và cũng đừng trả lại
  // nguyên văn ghi chú: ghi một câu QC đọc được, và `_soat-ghi-chu.md` liệt kê để soạn kỳ vọng thật.
  if (!giuCau.join(' ').trim()) {
    // Cắt sạch mà KHÔNG có ghi chú kiểu tài liệu nghĩa là cả ô chỉ nói về code — giữ lại nguyên
    // văn còn hơn thay bằng câu "chưa chốt", vì nội dung vẫn mô tả hành vi hệ thống.
    if (!coCatTaiLieu) return donDep(khongNgoac);
    if (thongKe) thongKe.trong.push(s.replace(/\s*[🔴🚫]\s*/g, ' ').trim());
    return CHUA_CHOT;
  }
  const giu = giuCau.join(' ').trim();
  return donDep(giu);
}

// ── tên nhóm ─────────────────────────────────────────────────────────────────

/**
 * Rút mã nhóm ra khỏi mã case.
 *   `13_2_030_001` → `030`   ·  `26_10_001`  → `010` (README cũ ghi 2 chữ số, đệm về 3)
 *   `03a_PQ_001`   → `PQ`    ·  `CNDB-CD-001` → `CNDB-CD`  ·  `GVMD-001` → `GVMD`
 *   `Vantai_7`     → `null`  → phân hệ mã phẳng, 🚫 không sinh dòng nhóm con
 */
function maNhom(id) {
  const so = id.match(/^.+_(\d{2,3})_\d+$/);
  if (so) return so[1].padStart(3, '0');
  const pq = id.match(/^.+_([A-Z]{2,})_\d+$/);
  if (pq) return pq[1];
  const gach = id.match(/^([A-Za-z][A-Za-z0-9-]*?)-\d+$/);
  if (gach) return gach[1];
  return null;
}

/** Nhóm `PQ` ở mọi phân hệ là khối kiểm tra phân quyền — mẫu QC gốc gọi `KIỂM TRA PERMISSION`. */
const TEN_NHOM_CHUNG = { PQ: 'Kiểm tra permission' };

/**
 * Tên nhóm lấy từ HDSD: mỗi task là một file `tasks/<mã>_<slug>.md`, frontmatter có `tieu_de`.
 * Đây là nguồn chuẩn nhất — README của phân hệ nhiều chỗ khai thiếu hoặc còn ghi mã 2 chữ số.
 */
function docTenNhomHdsd(mod) {
  const dir = path.join(HDSD_ROOT, `hdsd${mod}`, 'tasks');
  const ten = new Map();
  if (!fs.existsSync(dir)) return ten;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.md'))) {
    const ma = f.match(/^(\d{2,3})_/);
    if (!ma) continue;
    const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/^tieu_de:\s*(.+)$/m);
    if (m) ten.set(chuanMa(ma[1]), m[1].trim().replace(/^["']|["']$/g, ''));
  }
  return ten;
}

function docTenNhom(files, override) {
  const ten = new Map();
  for (const [k, v] of Object.entries(override || {})) ten.set(k, v);
  for (const [k, v] of Object.entries(TEN_NHOM_CHUNG)) if (!ten.has(k)) ten.set(k, v);
  const ghi = (k, v) => {
    const s = (v || '').trim().replace(/\s*\(\d+\)\s*$/, '').replace(/`/g, '');
    if (s && !ten.has(k)) ten.set(k, s);
  };

  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    const txt = fs.readFileSync(f, 'utf8');

    // Dạng bảng:  | 010 | Tra cứu danh sách | 29 |   ·  | `CNDB-CD` | ... |
    for (const m of txt.matchAll(/^\|\s*`?([A-Za-z0-9][A-Za-z0-9-]*)`?\s*\|([^|]+)\|/gm)) {
      ghi(chuanMa(m[1]), m[2]);
    }
    // Dạng văn xuôi:  `010` form lập phiếu (1) · `020` file mẫu + upload (5)
    for (const m of txt.matchAll(/`(\d{2,3})`\s+([^·\n]+)/g)) ghi(chuanMa(m[1]), m[2]);
  }
  return ten;
}

/** Đệm mã task về 3 chữ số để khớp mã case, vì vài README còn ghi `10` thay cho `010`. */
function chuanMa(s) {
  return /^\d{2,3}$/.test(s) ? s.padStart(3, '0') : s;
}

function hoaDauDong(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Tên phân hệ lấy từ tiêu đề H1 của README, bỏ phần mã ở đầu. */
function tenPhanHe(dir, mod) {
  for (const f of ['README.md', 'test-cases.md']) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/^#\s+(.+)$/m);
    if (!m) continue;
    return m[1]
      .replace(/^Auto test\s*[—-]?\s*/i, '')
      .replace(/^[\w.]+\s+—\s+/, '')
      .trim();
  }
  return mod;
}

// ── sinh một phân hệ ─────────────────────────────────────────────────────────

/** Gom câu đã cắt và câu còn ngờ để xuất `_soat-ghi-chu.md` cho user soát tay. */
const soat = { cat: [], ngo: [], trong: [] };

function buildModule(mod, { check }) {
  const dir = path.join(ROOT, mod);
  const src = path.join(dir, 'test-cases.csv');
  if (!fs.existsSync(src)) return null;

  // Case QC đã xoá trên file Excel (đánh dấu bởi dong-bo-tu-qc.js) — không đưa lại vào bản QC.
  const cases = readCases(src).filter((c) => (c['Trang thai QC'] || '').trim() !== 'QC_XOA');
  const kq = (docKetQua() || {})[mod] || {};
  // Thứ tự ưu tiên: override điền tay → HDSD (`tieu_de`) → README/test-cases.md của phân hệ.
  const tenNhom = docTenNhom(
    [path.join(dir, 'README.md'), path.join(dir, 'test-cases.md')],
    { ...Object.fromEntries(docTenNhomHdsd(mod)), ...((docOverride() || {})[mod] || {}) },
  );
  const chucNang = tenPhanHe(dir, mod).toUpperCase();

  const blank = () => Array(NCOL).fill('');
  const rows = [];
  META_LABELS.forEach((label, i) => {
    const r = blank();
    r[1] = label;
    if (i === 0) r[3] = chucNang;
    else if (i === 1) r[3] = mod;
    else if (i === 2) r[3] = String(cases.length);
    else if (i === 3) r[3] = String(cases.length);
    else r[3] = '0';
    rows.push(r);
  });
  rows.push(blank(), blank(), HEADER);

  const nhomLon = blank();
  nhomLon[COL.tinhHuong] = chucNang;
  rows.push(nhomLon);

  const thieuTen = [];
  let cur = null;
  for (const c of cases) {
    const id = (c.ID || '').trim();
    if (!id) continue;
    const ma = maNhom(id);
    // Phân hệ mã phẳng (`Vantai_7`): không có cấp nhóm con, mọi case nằm dưới dòng nhóm lớn.
    if (ma && ma !== cur) {
      cur = ma;
      const ten = tenNhom.get(ma);
      if (!ten) thieuTen.push(ma);
      const g = blank();
      g[COL.tinhHuong] = ten ? `${ma} — ${hoaDauDong(ten)}` : `${ma} — (chưa đặt tên nhóm)`;
      rows.push(g);
    }
    const r = blank();
    r[COL.id] = id;
    r[COL.tinhHuong] = (c['Ten test case'] || '').trim();
    r[COL.dieuKien] = (c['Tien dieu kien'] || '').trim();
    r[COL.buoc] = chuanHoaBuoc(c['Buoc kiem thu']);
    r[COL.uuTien] = (c['Uu tien'] || '').trim();
    const tk = { cat: [], ngo: [], trong: [] };
    r[COL.kyVong] = boGhiChuRepo(c['Ket qua ky vong'], tk);
    r[COL.ketQua] = kq[id] || '';
    for (const x of tk.cat) soat.cat.push([mod, id, x]);
    for (const x of tk.ngo) soat.ngo.push([mod, id, x]);
    for (const x of tk.trong) soat.trong.push([mod, id, x]);
    rows.push(r);
  }

  const thieuBuoc = cases.filter((c) => !(c['Buoc kiem thu'] || '').trim()).length;
  const canhBao = [];
  if (thieuTen.length) canhBao.push(`🔴 thiếu tên nhóm: ${[...new Set(thieuTen)].join(', ')}`);
  if (thieuBuoc) canhBao.push(`⚠️ ${thieuBuoc} case rỗng cột bước`);

  if (!check) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, `${mod}.csv`), toCsv(rows), 'utf8');
  }
  return { mod, cases: cases.length, rows: rows.length, canhBao };
}

let _ketQua;
function docKetQua() {
  if (_ketQua === undefined) {
    _ketQua = fs.existsSync(KET_QUA_FILE) ? JSON.parse(fs.readFileSync(KET_QUA_FILE, 'utf8')) : null;
  }
  return _ketQua;
}

let _override;
function docOverride() {
  if (_override === undefined) {
    _override = fs.existsSync(OVERRIDE_FILE)
      ? JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'))
      : null;
  }
  return _override;
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.find((a) => !a.startsWith('--'));

  const mods = fs.readdirSync(ROOT)
    .filter((d) => fs.statSync(path.join(ROOT, d)).isDirectory() && !BO_QUA.has(d))
    .filter((d) => fs.existsSync(path.join(ROOT, d, 'test-cases.csv')))
    .filter((d) => !only || d === only)
    .sort();

  if (!mods.length) {
    console.error(only ? `🚫 Không có phân hệ ${only}` : '🚫 Không tìm thấy phân hệ nào');
    process.exit(1);
  }

  let tongCase = 0;
  const cover = [];
  for (const mod of mods) {
    const r = buildModule(mod, { check });
    if (!r) continue;
    tongCase += r.cases;
    if (r.canhBao.length) cover.push(r);
    console.log(`${check ? '🔍' : '✅'} ${mod.padEnd(34)} ${String(r.cases).padStart(4)} case` +
      (r.canhBao.length ? `   ${r.canhBao.join(' · ')}` : ''));
  }

  if (!check) {
    const dong = (ds) => ds.map(([m, i, c]) => `| \`${m}\` | \`${i}\` | ${c.replace(/\|/g, '\\|')} |`).join('\n');
    fs.writeFileSync(path.join(OUT_DIR, '_soat-ghi-chu.md'),
      '# Soát ghi chú kỹ thuật trong cột `Kết quả mong muốn`\n\n' +
      '> 🤖 Sinh tự động bởi `tool/bin/to-qc-csv.js` — 🚫 đừng sửa tay.\n' +
      '> Câu ở mục 1 đã bị BỎ khỏi bản QC. Câu ở mục 2 vẫn GIỮ vì máy không chắc là ghi chú —\n' +
      '> soát tay, chỗ nào là ghi chú thì sửa ở `<phân hệ>/test-cases.csv` rồi chạy lại.\n\n' +
      `## 1. Đã cắt (${soat.cat.length} câu)\n\n| Phân hệ | Case | Câu bị cắt |\n|---|---|---|\n` +
      `${dong(soat.cat)}\n\n` +
      `## 2. Còn ngờ — vẫn giữ trong bản QC (${soat.ngo.length} câu)\n\n` +
      `| Phân hệ | Case | Câu |\n|---|---|---|\n${dong(soat.ngo)}\n\n` +
      `## 3. 🔴 Kỳ vọng vốn CHỈ LÀ ghi chú — cần soạn lại (${soat.trong.length} case)\n\n` +
      'Bản QC đang ghi *"Chưa chốt kỳ vọng — ghi lại hành vi thật của hệ thống khi test."*\n' +
      'Sửa kỳ vọng thật ở `<phân hệ>/test-cases.csv` rồi chạy lại.\n\n' +
      `| Phân hệ | Case | Ghi chú gốc |\n|---|---|---|\n${dong(soat.trong)}\n`, 'utf8');
    console.log(`\n📋 ${soat.cat.length} câu ghi chú đã cắt · ${soat.ngo.length} câu còn ngờ · ` +
      `🔴 ${soat.trong.length} case kỳ vọng chỉ là ghi chú → test-case-qc/_soat-ghi-chu.md`);
  }

  console.log(`\n${mods.length} phân hệ · ${tongCase} case` +
    (check ? ' · --check: không ghi file' : ` → ${path.relative(process.cwd(), OUT_DIR)}/`));
  if (cover.length) {
    console.log(`🔴 ${cover.length} phân hệ cần soát tay (xem cảnh báo ở trên)`);
    console.log(`   Điền tên nhóm thiếu vào ${path.relative(process.cwd(), OVERRIDE_FILE)} ` +
      'rồi chạy lại — sửa thẳng file CSV sinh ra là mất.');
  }
}

if (require.main === module) main();

module.exports = { parseCsv, chuanHoaBuoc, boGhiChuRepo, BO_QUA };
