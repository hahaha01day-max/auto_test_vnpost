'use strict';

/**
 * `07_1_PQ_001` — vai **Bưu điện Tỉnh** 🚫 không được sửa cấu hình cấp Tổng công ty.
 *
 * 🔴 Chạy bằng chính vai `province`. Năm task của phân hệ đều khai vai chỉ `TONG_CONG_TY`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');

const GOC = path.join(__dirname, '..');
const { NHOM, chanGhi, chuan, khung, moNhom } = require('./settings-page');

const VAI = 'province';

test('07_1_PQ_001 — Vai Bưu điện Tỉnh không sửa được cấu hình cấp Tổng công ty', async ({ page }) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, '07_1_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	const { daGoi } = await chanGhi(page);
	await moNhom(page, NHOM.lamTronTien, VAI);

	const nutSua = khung(page).getByRole('button', { name: 'Sửa' });
	const soNut = await nutSua.count();

	// 🔴 Công tắc CÓ THỂ vẫn hiện nhưng bị vô hiệu — đó vẫn là "không bật/tắt được". Đếm riêng
	//    công tắc còn bấm được, 🚫 đừng chỉ đếm số công tắc trên màn.
	const congTac = khung(page).locator('.ant-switch');
	const tong = await congTac.count();
	let soBamDuoc = 0;
	for (let k = 0; k < tong; k += 1) {
		const lop = (await congTac.nth(k).getAttribute('class')) || '';
		const tat = (await congTac.nth(k).getAttribute('disabled')) !== null;
		if (!lop.includes('ant-switch-disabled') && !tat) soBamDuoc += 1;
	}
	const soCongTac = soBamDuoc;

	// 🔴 Ghi rõ hình thức chặn để báo cáo nói được CÁCH hệ thống chặn, không chỉ "bị chặn".
	test.info().annotations.push({
		type: 'quan sát ở vai tỉnh',
		description: `nút Sửa: ${soNut} · công tắc trên màn: ${tong} (bấm được: ${soBamDuoc}) · URL: ${page.url()}`,
	});

	expect(
		soNut === 0 && soCongTac === 0,
		`Vai ${VAI} vẫn thấy ${soNut} nút "Sửa" và ${soCongTac} công tắc BẬT/TẮT ĐƯỢC ở nhóm cấu ` +
			`hình cấp Tổng công ty (tổng ${tong} công tắc trên màn). ` +
			`Nội dung màn: ${chuan(await khung(page).innerText()).slice(0, 200)}`,
	).toBe(true);
	expect(daGoi, 'Vai tỉnh đã gửi được request ghi cấu hình').toEqual([]);
});
