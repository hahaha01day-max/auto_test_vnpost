'use strict';

/**
 * Sửa TẠM chương trình ĐỔI ĐIỂM của chuỗi rồi khôi phục (dùng chung 18_2_050_009, 18_3_050_004/005).
 * `PUT /loyalty/redeem-campaign/edit-campaign/{id}` body theo `20/tests/cau-hinh-loyalty.js › bodyDoi`. Chụp BẢN HIỆN TẠI ra
 * `18_2/test-output/doi-diem-goc.json` trước khi sửa (lượt chết giữa chừng ⇒ lượt sau khôi phục từ file), khôi phục trong `finally`.
 * 🚫 Không dùng bản chụp cũ của phân hệ 20 (có trước khi thêm tỉnh làn 8 vào phạm vi). Phiên phụ vai `tct`.
 */

const { expect, test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../../20_khach_hang_than_thiet/tests/cau-hinh-loyalty');

const SO = path.join(__dirname, '..', 'test-output', 'doi-diem-goc.json');

/** Chạy `fn` trong lúc chương trình đổi điểm bị sửa theo `doi`. Trả kết quả `fn`, hoặc `{ loiSua }` nếu BE không cho lưu. */
async function voiDoiDiem(browser, doi, fn) {
	const ps = await L.k.moPhienPhu(browser, 'tct', '/loyalty');
	let g;
	try {
		if (fs.existsSync(SO)) g = JSON.parse(fs.readFileSync(SO, 'utf8'));
		else {
			g = (await L.k.goiGhi(ps.page, ps.st, 'GET', '/loyalty/redeem-campaign/get-campaign'))?.data;
			expect(g?.campaignId, 'Chuỗi không có chương trình đổi điểm').toBeTruthy();
			fs.mkdirSync(path.dirname(SO), { recursive: true });
			fs.writeFileSync(SO, JSON.stringify(g, null, 1));
		}
		const b = await L.k.goiGhi(ps.page, ps.st, 'PUT', `/loyalty/redeem-campaign/edit-campaign/${g.campaignId}`, {}, { ...L.bodyDoi(g), ...doi });
		test.info().annotations.push({ type: 'sửa tạm đổi điểm', description: `${JSON.stringify(doi)} ⇒ ${JSON.stringify(b?.status)}` });
		if (String(b?.status?.code) !== '200') return { loiSua: b?.status };
		return await fn();
	} finally {
		if (g?.campaignId) {
			const r = await L.k.goiGhi(ps.page, ps.st, 'PUT', `/loyalty/redeem-campaign/edit-campaign/${g.campaignId}`, {}, L.bodyDoi(g));
			test.info().annotations.push({ type: 'khôi phục đổi điểm', description: JSON.stringify(r?.status) });
			if (String(r?.status?.code) === '200') fs.rmSync(SO, { force: true });
		}
		await ps.dong();
	}
}

module.exports = { voiDoiDiem, SO };
