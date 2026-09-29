'use strict';

/**
 * Sinh file Excel nhập điểm bán, đúng khuôn file mẫu `/files/DiemBan_Import.xlsx`.
 *
 * 🔴 14 cột, ĐÚNG THỨ TỰ và ĐÚNG TÊN dưới đây (đọc từ chính file mẫu ngày 17/09/2026).
 *    Sheet bắt buộc tên `Import_Cua_Hang`. Sai tên sheet hoặc thiếu cột là backend loại cả file,
 *    và thông báo lỗi không nói rõ cột nào — rất tốn công lần.
 */

const ExcelJS = require('exceljs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const COT = [
	'Mã cửa hàng',
	'Tên cửa hàng *',
	'Số điện thoại',
	'Email',
	'Loại hình điểm bán',
	'Địa chỉ',
	'Mã tỉnh',
	'Tên tỉnh',
	'Mã phường xã',
	'Tên phường xã',
	'Trạng thái',
	'Tọa độ',
	'SĐT quản lý',
	'Phân loại',
];

/**
 * 🔴 Đơn vị THẬT của chuỗi 626, đã đối chiếu `VNPOST_CORE.ORGANIZATION_UNIT` ngày 17/09/2026.
 *    🚫 ĐỪNG dùng mã trong dòng ví dụ của file mẫu (`06` / `0601`): chúng KHÔNG tồn tại, job nhập
 *    trả `status=SUCCESS` nhưng `totalFailed=1` kèm `errorMessage="Dòng 2: Đơn vị cấp xã/tỉnh
 *    không hợp lệ"` — nhìn qua rất dễ tưởng nhập thành công.
 */
const DON_VI = Object.freeze({
	maTinh: '00',
	tenTinh: 'Bưu điện Hà Nội',
	maXa: '0002',
	tenXa: 'Bưu điện xã Thanh Trì',
});

/** Một dòng hợp lệ, theo khuôn dòng ví dụ của file mẫu nhưng dùng đơn vị có thật. */
function dongHopLe({ ma, ten }) {
	return [
		ma,
		ten,
		'9683753999',
		`autotest${ma}@example.com`,
		'mua bán',
		'AUTO TEST - khong su dung',
		DON_VI.maTinh,
		DON_VI.tenTinh,
		DON_VI.maXa,
		DON_VI.tenXa,
		'Hoạt động',
		'21.028511,105.804817',
		'912345678',
		'Pos mini',
	];
}

/** Dòng thiếu Tên cửa hàng — trường bắt buộc duy nhất có dấu `*`. */
function dongThieuTen({ ma }) {
	const d = dongHopLe({ ma, ten: '' });
	d[1] = '';
	return d;
}

/**
 * Ghi ra file .xlsx trong thư mục tạm và trả về đường dẫn.
 * @param {Array<Array<string>>} dsDong danh sách dòng dữ liệu; rỗng = file chỉ có tiêu đề.
 */
async function taoFileExcel(dsDong, tenFile = 'import-diem-ban.xlsx') {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet('Import_Cua_Hang');
	ws.addRow(COT);
	for (const d of dsDong) ws.addRow(d);

	const thuMuc = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpost-xlsx-'));
	const duongDan = path.join(thuMuc, tenFile);
	await wb.xlsx.writeFile(duongDan);
	return duongDan;
}

/**
 * Mã điểm bán duy nhất cho mỗi lần chạy.
 * 🔴 Bắt buộc mở đầu bằng **mã đơn vị cha** (`DON_VI.maXa`), nếu không backend trả
 * `SSHOP-402 — Mã điểm bán phải bắt đầu bằng mã đơn vị cha`.
 */
const maMoi = () => `${DON_VI.maXa}AUTO${Date.now().toString().slice(-6)}`;

module.exports = { COT, DON_VI, dongHopLe, dongThieuTen, taoFileExcel, maMoi };
