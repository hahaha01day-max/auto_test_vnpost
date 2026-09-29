#!/usr/bin/env node
'use strict';

/**
 * Dựng `test-cases.csv` cho phân hệ 01 — Quản lý điểm bán.
 *
 * Nguồn:
 *   - `01_quan_ly_diem_ban.csv`  — 54 case do QC viết trên Google Sheet (giữ nguyên, không sửa)
 *   - `resource/hdsd/hdsd01_quan_ly_diem_ban/tasks/*.md` — 8 task, dùng để gắn mã và tìm case thiếu
 *
 * 🔴 Kỳ vọng lấy từ HDSD, KHÔNG lấy từ code. Đọc code để biết kỳ vọng là biến bug hiện có thành
 * "kết quả mong muốn" — test kiểu đó vĩnh viễn xanh.
 */

const fs = require('node:fs');
const path = require('node:path');

const { PROJECT_ROOT } = require('../core/modules');
const { parseCsv } = require('../core/cases');

const DIR = path.join(PROJECT_ROOT, 'tai-lieu-test/01_quan_ly_diem_ban');
const SRC = path.join(DIR, '01_quan_ly_diem_ban.csv');

const TASKS = {
  '010': 'Tra cứu và lọc danh sách điểm bán',
  '020': 'Thêm điểm bán hoặc hub mới',
  '030': 'Sửa thông tin điểm bán',
  '040': 'Tạm ngừng hoặc khôi phục hoạt động điểm bán',
  '050': 'Gắn nhân viên và vai trò cho điểm bán',
  '060': 'Cho nhân viên thôi việc tại điểm bán',
  '070': 'Nhập danh sách điểm bán từ Excel',
  '080': 'Xuất danh sách điểm bán ra Excel',
};

/** Mã case trong sheet → task HDSD. Gắn theo NỘI DUNG case, không theo tên nhóm trong sheet. */
const MAP = {
  // Nhóm "xem danh sách" → 010
  DIEMBAN__1: '010', DIEMBAN__2: '010', DIEMBAN__3: '010', DIEMBAN__4: '010', DIEMBAN__5: '010',
  DIEMBAN__6: '010', DIEMBAN__7: '010', DIEMBAN__8: '010', DIEMBAN__9: '010', DIEMBAN__10: '010',

  // Nhóm "thêm mới" → 020
  DIEMBAN__11: '020', DIEMBAN__12: '020', DIEMBAN__13: '020', DIEMBAN__14: '020', DIEMBAN__15: '020',
  DIEMBAN__16: '020', DIEMBAN__17: '020', DIEMBAN__18: '020', DIEMBAN__19: '020', DIEMBAN__20: '020',
  DIEMBAN__21: '020',

  // Nhóm "xem chi tiết" — HDSD 01 KHÔNG có task riêng cho màn Chi tiết.
  // 22 là đọc thông tin → 010; 23/24 là nút Xoá/Khôi phục → 040.
  DIEMBAN__22: '010', DIEMBAN__23: '040', DIEMBAN__24: '040',

  // Nhóm "chỉnh sửa" → 030
  DIEMBAN__25: '030', DIEMBAN__26: '030', DIEMBAN__27: '030', DIEMBAN__28: '030', DIEMBAN__29: '030',

  // Nhóm "xoá/khôi phục" → 040
  DIEMBAN__30: '040', DIEMBAN__31: '040', DIEMBAN__32: '040', DIEMBAN__33: '040',

  // Nhóm "xoá/khôi phục" lặp lại lần 2 — 🔴 TRÙNG y hệt 30–33, xem DUPLICATES.
  DIEMBAN__34: '040', DIEMBAN__35: '040', DIEMBAN__36: '040', DIEMBAN__37: '040',

  // Nhóm thứ ba mang tên "xoá/khôi phục" nhưng nội dung là gắn/gỡ nhân viên.
  DIEMBAN__38: '050', DIEMBAN__39: '050', DIEMBAN__41: '050', DIEMBAN__42: '050', DIEMBAN__43: '050',
  DIEMBAN__40: '060', // "Xoá 1 dòng gán bằng nút X" — chỉ dòng vừa thêm mới xoá được (task 060)

  // Excel
  DIEMBAN__44: '070', DIEMBAN__45: '070', DIEMBAN__46: '070', DIEMBAN__47: '070', DIEMBAN__48: '070',
  DIEMBAN__49: '070', DIEMBAN__50: '070', DIEMBAN__51: '070',
  DIEMBAN__52: '080', DIEMBAN__53: '080', DIEMBAN__54: '080',
};

/**
 * 🔴 Case trùng lặp trong sheet: 34–37 giống hệt 30–33 (cùng tên, cùng màn hình, cùng nội dung).
 * Loại khỏi bộ chuẩn, ghi lại để QC biết mà sửa Sheet gốc.
 */
const DUPLICATES = { DIEMBAN__34: 'DIEMBAN__30', DIEMBAN__35: 'DIEMBAN__31', DIEMBAN__36: 'DIEMBAN__32', DIEMBAN__37: 'DIEMBAN__33' };

/**
 * Case BỔ SUNG — mỗi case bám một quy tắc HDSD viết rõ mà sheet chưa phủ.
 * Cột `hdsd` ghi chính xác dòng nào trong task để sau này còn truy được.
 */
const NEW_CASES = [
  // ── 010 ──
  { task: '010', ten: 'Đổi số dòng mỗi trang bằng ô chọn cạnh thanh phân trang',
    dk: 'Vai: province. Hệ thống có hơn 10 điểm bán trong phạm vi.',
    buoc: '1. Mở Vận hành > Quản lý cửa hàng\n2. Bấm ô chọn số dòng cạnh thanh phân trang\n3. Chọn mức lớn hơn 10',
    kq: 'Bảng hiển thị đúng số dòng vừa chọn; thanh phân trang tính lại số trang.',
    hdsd: '010 — "ô chọn bên cạnh cho phép tăng số dòng mỗi trang"', uu: 'TB', man: 'Màn danh sách điểm bán' },
  { task: '010', ten: 'Bộ lọc Bưu điện xã/phường chỉ liệt kê xã thuộc tỉnh đã chọn',
    dk: 'Vai: tct. Có ít nhất 2 tỉnh, mỗi tỉnh có xã riêng.',
    buoc: '1. Mở màn danh sách điểm bán\n2. Mở bộ lọc Bưu điện xã/phường khi CHƯA chọn tỉnh\n3. Chọn một Bưu điện tỉnh\n4. Mở lại bộ lọc xã/phường',
    kq: 'Sau khi chọn tỉnh, danh sách xã chỉ gồm xã thuộc tỉnh đó, không còn xã của tỉnh khác.',
    hdsd: '010 — Mẹo: "chỉ liệt kê các xã thuộc tỉnh bạn đã chọn"', uu: 'Cao', man: 'Màn danh sách điểm bán' },
  { task: '010', ten: 'Vai Bưu điện Tỉnh chỉ thấy điểm bán thuộc tỉnh mình',
    dk: 'Vai: province. Tồn tại điểm bán thuộc tỉnh khác.',
    buoc: '1. Đăng nhập vai province\n2. Mở màn danh sách điểm bán\n3. Tìm mã điểm bán thuộc tỉnh khác',
    kq: 'Không tìm thấy điểm bán ngoài phạm vi tỉnh; tổng số trên tiêu đề chỉ đếm điểm bán trong phạm vi.',
    hdsd: '010 — Lưu ý phạm vi: "người dùng cấp tỉnh chỉ thấy điểm bán thuộc tỉnh mình"', uu: 'Cao', man: 'Màn danh sách điểm bán' },
  { task: '010', ten: 'Danh sách hiển thị điểm bán ở MỌI trạng thái, kể cả tạm ngừng',
    dk: 'Có ít nhất 1 điểm bán Ngừng hoạt động.',
    buoc: '1. Mở màn danh sách, không đặt bộ lọc Trạng thái\n2. Tìm điểm bán đang Ngừng hoạt động',
    kq: 'Điểm bán Ngừng hoạt động vẫn hiện trong danh sách khi không lọc trạng thái.',
    hdsd: '010 — Lưu ý: "màn hình này hiển thị điểm bán ở mọi trạng thái"', uu: 'TB', man: 'Màn danh sách điểm bán' },
  { task: '010', ten: 'Cột Hành động chỉ hiện biểu tượng ứng với quyền của người dùng',
    dk: 'Vai không có quyền update_shop.',
    buoc: '1. Đăng nhập bằng vai không có quyền sửa\n2. Mở màn danh sách\n3. Quan sát cột Hành động',
    kq: 'Biểu tượng Sửa không hiện; các biểu tượng còn lại hiện theo đúng quyền đang có.',
    hdsd: '010 — bảng cột: "Chỉ hiện biểu tượng ứng với quyền bạn có"', uu: 'Cao', man: 'Màn danh sách điểm bán' },
  { task: '010', ten: 'Dòng Hub có biểu tượng Gắn nhân viên mờ và bấm không được',
    dk: 'Có ít nhất 1 điểm bán phân loại Hub.',
    buoc: '1. Mở màn danh sách\n2. Lọc Phân loại = Hub\n3. Quan sát biểu tượng Gắn nhân viên trên dòng hub',
    kq: 'Biểu tượng Gắn nhân viên bị làm mờ, bấm không mở màn hình nào.',
    hdsd: '010 + 050 — "hub không gắn nhân viên"', uu: 'Cao', man: 'Màn danh sách điểm bán' },
  { task: '010', ten: 'Liên kết Xem danh sách ở cột Số lượng nhân viên mở thẳng danh sách nhân viên',
    dk: 'Có điểm bán đã gắn ít nhất 1 nhân viên.',
    buoc: '1. Mở màn danh sách\n2. Bấm Xem danh sách tại cột Số lượng nhân viên của điểm bán đó',
    kq: 'Mở thẳng danh sách nhân viên của điểm bán, không phải đi qua màn Chi tiết.',
    hdsd: '010 — Mẹo: "bấm Xem danh sách ngay ở cột Số lượng nhân viên"', uu: 'Thấp', man: 'Màn danh sách điểm bán' },

  // ── 020 ──
  { task: '020', ten: 'Cấp chỉ chọn được từ cấp của người dùng trở xuống',
    dk: 'Vai: province.',
    buoc: '1. Mở màn danh sách, bấm Thêm điểm bán\n2. Mở danh sách chọn Cấp',
    kq: 'Vai Tỉnh không chọn được cấp TCT; chỉ còn Tỉnh và Xã.',
    hdsd: '020 bước 3 — "chỉ chọn được từ cấp của mình trở xuống"', uu: 'Cao', man: 'Màn thêm mới điểm bán/hub' },
  { task: '020', ten: 'Phân loại phụ thuộc Cấp — chọn cấp Tỉnh thì chỉ còn Hub',
    dk: 'Vai: tct (để chọn được mọi cấp).',
    buoc: '1. Bấm Thêm điểm bán\n2. Chọn Cấp = Tỉnh\n3. Mở danh sách Phân loại',
    kq: 'Danh sách Phân loại chỉ có Hub.',
    hdsd: '020 bước 4 + bảng cấp↔phân loại', uu: 'Cao', man: 'Màn thêm mới điểm bán/hub' },
  { task: '020', ten: 'Mã điểm bán trùng với điểm bán đã có thì bị chặn',
    dk: 'Biết trước mã của một điểm bán đang tồn tại.',
    buoc: '1. Bấm Thêm điểm bán, chọn cấp và phân loại\n2. Nhập Mã điểm bán trùng mã đã có\n3. Điền các trường bắt buộc còn lại\n4. Bấm Xác nhận',
    kq: 'Hệ thống báo lỗi trùng mã và KHÔNG tạo điểm bán mới.',
    hdsd: '020 bước 5 — "Mã và tên không được trùng"', uu: 'Cao', man: 'Màn thêm mới điểm bán/hub' },
  { task: '020', ten: 'Chọn phân loại Hub thì không có trường Loại hình điểm bán',
    dk: '—',
    buoc: '1. Bấm Thêm điểm bán\n2. Chọn Phân loại = Hub\n3. Quan sát form',
    kq: 'Trường Loại hình điểm bán (Mua bán / Ký gửi) không xuất hiện.',
    hdsd: '020 bước 6 — "Chọn Hub thì không có trường này"', uu: 'TB', man: 'Màn thêm mới điểm bán/hub' },

  // ── 030 ──
  { task: '030', ten: 'Phân loại và Mã điểm bán hiển thị mờ, không sửa được',
    dk: 'Có điểm bán đang hoạt động.',
    buoc: '1. Mở màn danh sách, bấm biểu tượng Sửa trên một dòng\n2. Thử sửa ô Phân loại và ô Mã điểm bán',
    kq: 'Hai trường hiển thị mờ, không nhập/không chọn được.',
    hdsd: '030 — Lưu ý: "hiển thị mờ và không sửa được"', uu: 'Cao', man: 'Màn sửa điểm bán/hub' },

  // ── 040 ──
  { task: '040', ten: 'Tạm ngừng điểm bán bằng ô Trạng thái trên màn Sửa',
    dk: 'Có điểm bán Đang hoạt động.',
    buoc: '1. Mở màn danh sách, bấm biểu tượng Sửa\n2. Ở mục Trạng thái góc trên bên phải, chọn Tạm ngừng\n3. Bấm Xác nhận',
    kq: 'Cột Trạng thái của điểm bán đổi sang Tạm ngừng trong danh sách.',
    hdsd: '040 bước 2–4 — luồng chuẩn nằm ở màn Sửa', uu: 'Cao', man: 'Màn sửa điểm bán/hub' },
  { task: '040', ten: 'Khôi phục hoạt động bằng ô Trạng thái trên màn Sửa',
    dk: 'Có điểm bán đang Tạm ngừng.',
    buoc: '1. Mở màn danh sách, lọc Trạng thái = Tạm ngừng\n2. Bấm biểu tượng Sửa\n3. Chọn Đang hoạt động\n4. Bấm Xác nhận',
    kq: 'Cột Trạng thái đổi sang Đang hoạt động.',
    hdsd: '040 bước 3', uu: 'Cao', man: 'Màn sửa điểm bán/hub' },

  // ── 050 ──
  { task: '050', ten: 'Bỏ trống ô Trạng thái trên dòng phân công mới thì bị chặn',
    dk: 'Có điểm bán không phải Hub.',
    buoc: '1. Mở màn Gắn nhân viên\n2. Bấm + Thêm nhân viên & vai trò\n3. Chọn nhân viên và vai trò, để trống ô Trạng thái\n4. Bấm Xác nhận',
    kq: 'Hệ thống báo thiếu thông tin ngay trên dòng đó, không lưu.',
    hdsd: '050 — Lưu ý: "cả ba ô trên mỗi dòng đều bắt buộc"', uu: 'Cao', man: 'Màn gắn nhân viên' },
  { task: '050', ten: 'Cột Số lượng nhân viên tăng đúng sau khi gắn nhân viên',
    dk: 'Biết số nhân viên hiện tại của điểm bán.',
    buoc: '1. Ghi lại số ở cột Số lượng nhân viên\n2. Gắn thêm 1 nhân viên và Xác nhận\n3. Quay lại danh sách',
    kq: 'Cột Số lượng nhân viên tăng đúng 1 đơn vị.',
    hdsd: '050 — Kết quả: "Số lượng nhân viên tăng lên tương ứng"', uu: 'TB', man: 'Màn danh sách điểm bán' },

  // ── 060 ──
  { task: '060', ten: 'Cho nhân viên thôi việc bằng cách đổi trạng thái sang Đã nghỉ',
    dk: 'Điểm bán có ít nhất 1 nhân viên Đang làm.',
    buoc: '1. Mở màn Gắn nhân viên của điểm bán\n2. Trên dòng nhân viên, đổi ô Trạng thái từ Đang làm sang Đã nghỉ\n3. Bấm Xác nhận',
    kq: 'Dòng nhân viên VẪN còn trong danh sách nhưng mang trạng thái Đã nghỉ — giữ lịch sử phân công.',
    hdsd: '060 bước 4–5 + Kết quả', uu: 'Cao', man: 'Màn gắn nhân viên' },
  { task: '060', ten: 'Dòng phân công đã lưu trước đó không xoá hẳn được',
    dk: 'Điểm bán có nhân viên đã gắn từ phiên trước.',
    buoc: '1. Mở màn Gắn nhân viên\n2. Tìm nút xoá trên dòng nhân viên đã lưu trước đó',
    kq: 'Không xoá hẳn được dòng đã lưu; chỉ đổi được trạng thái sang Đã nghỉ.',
    hdsd: '060 — cảnh báo đầu bài: "chỉ xoá hẳn khi dòng vừa được thêm trong cùng phiên"', uu: 'Cao', man: 'Màn gắn nhân viên' },

  // ── 070 ──
  { task: '070', ten: 'Bật Dừng lại khi có lỗi — dừng ở dòng lỗi đầu tiên',
    dk: 'Có file Excel chứa dòng lỗi ở giữa.',
    buoc: '1. Mở Nhập từ excel\n2. Bật ô Dừng lại khi có lỗi\n3. Chọn file và Xác nhận nhập',
    kq: 'Quá trình dừng tại dòng lỗi đầu tiên; các dòng sau dòng lỗi không được tạo.',
    hdsd: '070 bước 5', uu: 'Cao', man: 'Màn nhập từ excel' },
  { task: '070', ten: 'Tắt Dừng lại khi có lỗi — bỏ qua dòng lỗi và nhập tiếp',
    dk: 'Dùng đúng file như case bật cờ.',
    buoc: '1. Mở Nhập từ excel\n2. Tắt ô Dừng lại khi có lỗi\n3. Chọn file và Xác nhận nhập',
    kq: 'Dòng hợp lệ vẫn được tạo; kết quả báo đúng số Thành công / Thất bại.',
    hdsd: '070 bước 5', uu: 'Cao', man: 'Màn nhập từ excel' },
  { task: '070', ten: 'Tải file lỗi từ thẻ Lịch sử nhập',
    dk: 'Đã có lần nhập có dòng thất bại.',
    buoc: '1. Mở thẻ Lịch sử nhập\n2. Tìm lần nhập vừa rồi\n3. Bấm tải file lỗi',
    kq: 'Tải về file chỉ chứa các dòng lỗi kèm lý do.',
    hdsd: '070 — Mẹo: "mở thẻ Lịch sử nhập, tải file lỗi về"', uu: 'TB', man: 'Màn nhập từ excel' },
  { task: '070', ten: 'Đóng màn hình khi đang nhập thì việc nhập vẫn chạy ngầm',
    dk: 'File nhập đủ lớn để kịp đóng màn hình.',
    buoc: '1. Bấm Xác nhận nhập\n2. Đóng màn hình ngay khi đang chạy\n3. Mở lại thẻ Lịch sử nhập',
    kq: 'Lần nhập vẫn hoàn tất và xuất hiện trong Lịch sử nhập.',
    hdsd: '070 — Lưu ý: "đóng màn hình này không làm dừng việc nhập"', uu: 'TB', man: 'Màn nhập từ excel' },

  // ── 080 ──
  { task: '080', ten: 'Bấm Cập nhật trạng thái khi file chưa sẵn sàng',
    dk: 'Vừa bấm Xuất file excel.',
    buoc: '1. Bấm Xuất file excel\n2. Khi file chưa hiện, bấm Cập nhật trạng thái',
    kq: 'Danh sách file được tải lại và hiện file khi đã tạo xong.',
    hdsd: '080 bước 5', uu: 'TB', man: 'Màn xuất excel' },
  { task: '080', ten: 'Tải xuống file đã tạo từ cột Hành động',
    dk: 'Đã có file xuất ở trạng thái hoàn tất.',
    buoc: '1. Mở màn Xuất excel\n2. Bấm Tải xuống ở cột Hành động trên dòng file',
    kq: 'File Excel được tải về máy.',
    hdsd: '080 bước 6', uu: 'Cao', man: 'Màn xuất excel' },
];

function csvEscape(value) {
  const text = String(value == null ? '' : value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function main() {
  const rows = parseCsv(fs.readFileSync(SRC, 'utf8')).slice(1);
  const sheetCases = rows.filter((r) => r[0].trim()).map((r) => ({
    id: r[0].trim(), ten: r[1].trim(), dk: r[3].trim(), buoc: r[4].trim(),
    uu: r[5].trim(), man: r[6].trim(), kq: r[7].trim(),
  }));

  const counters = {};
  const out = [];
  const unmapped = [];

  const nextId = (task) => {
    counters[task] = (counters[task] || 0) + 1;
    return `01_${task}_${String(counters[task]).padStart(3, '0')}`;
  };

  // Giữ đúng thứ tự task để mã chạy liền mạch 010 → 080.
  for (const task of Object.keys(TASKS)) {
    for (const c of sheetCases) {
      if (DUPLICATES[c.id] || MAP[c.id] !== task) continue;
      // 🔴 `...c` phải đứng TRƯỚC `id`: nó mang theo `id` cũ (DIEMBAN__N), spread sau là đè mất
      //    mã mới vừa sinh — và CSV vẫn ghi ra bình thường nên lỗi chỉ lộ khi đọc lại.
      out.push({ ...c, id: nextId(task), task, goc: c.id, nguon: 'Sheet QC' });
    }
    for (const c of NEW_CASES.filter((x) => x.task === task)) {
      out.push({ id: nextId(task), task, ten: c.ten, dk: c.dk, buoc: c.buoc, kq: c.kq, uu: c.uu, man: c.man, goc: '', nguon: `HDSD ${c.hdsd}` });
    }
  }

  for (const c of sheetCases) if (!MAP[c.id] && !DUPLICATES[c.id]) unmapped.push(c.id);

  const header = ['ID', 'Ten test case', 'Tien dieu kien', 'Buoc kiem thu', 'Ket qua ky vong', 'Task', 'Ten task', 'Uu tien', 'Man hinh', 'Ma goc', 'Nguon'];
  const lines = out.map((c) =>
    [c.id, c.ten, c.dk, c.buoc, c.kq, c.task, TASKS[c.task], c.uu, c.man, c.goc, c.nguon].map(csvEscape).join(','),
  );
  fs.writeFileSync(path.join(DIR, 'test-cases.csv'), `${header.join(',')}\n${lines.join('\n')}\n`);

  // ── Báo cáo ──
  console.log(`\nSheet QC : ${sheetCases.length} case`);
  console.log(`  trùng lặp bị loại : ${Object.keys(DUPLICATES).length} (${Object.entries(DUPLICATES).map(([a, b]) => `${a}=${b}`).join(', ')})`);
  console.log(`  không map được    : ${unmapped.length ? unmapped.join(', ') : 'không'}`);
  console.log(`Bổ sung từ HDSD : ${NEW_CASES.length} case`);
  console.log(`Tổng bộ chuẩn   : ${out.length} case\n`);

  console.log('TASK  TỪ SHEET  BỔ SUNG  TỔNG  TÊN TASK');
  for (const task of Object.keys(TASKS)) {
    const fromSheet = out.filter((c) => c.task === task && c.nguon === 'Sheet QC').length;
    const added = out.filter((c) => c.task === task && c.nguon !== 'Sheet QC').length;
    console.log(`${task}   ${String(fromSheet).padStart(6)}   ${String(added).padStart(6)}  ${String(fromSheet + added).padStart(4)}  ${TASKS[task]}`);
  }
  console.log('');
}

main();
