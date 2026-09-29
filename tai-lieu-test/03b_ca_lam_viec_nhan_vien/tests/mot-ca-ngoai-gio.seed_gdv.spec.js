'use strict';

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { chanGhi } = require('./shift-card');
const { moVaDocTheCa, trongKhungChamCong, trangThaiPhien } = require('./the-ca-doc');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_gdv';

const chanNeuTat = (id) => {
	const thieu = missingRoleReason(VAI);
	test.skip(Boolean(thieu), thieu ?? '');
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

/**
 * Nhân viên thứ hai của điểm bán seed — bộ dựng nền xếp đúng MỘT ca hôm nay cho người này.
 * 🚫 Không ghi gì: `chanGhi` chặn mọi request ghi của chấm công.
 */
test.describe('03b · 020/050 — thẻ ca của nhân viên có một ca (chỉ đọc)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('03b_020_004 — Ngoài khoảng giờ cho phép thì không thấy nút chấm công', async ({ page }) => {
		chanNeuTat('03b_020_004');
		await chanGhi(page);
		const { the, bayGio } = await moVaDocTheCa(page, VAI);
		expect(the.length, 'Tài khoản không có thẻ ca nào hôm nay').toBeGreaterThan(0);

		// Chỉ xét thẻ CHƯA mở phiên (thẻ đã mở luôn có nút Chốt/In theo thiết kế).
		const ngoaiGio = the.filter((t) => trongKhungChamCong(t.cfg, bayGio) === false && !trangThaiPhien(t.summary));
		const gio = `${String(Math.floor(bayGio / 60)).padStart(2, '0')}:${String(bayGio % 60).padStart(2, '0')}`;
		test.skip(
			ngoaiGio.length === 0,
			`Lúc ${gio} mọi ca hôm nay đều đang TRONG khung chấm công — tình huống "ngoài giờ" chỉ đo được ngoài khung đó.`,
		);
		for (const t of ngoaiGio) {
			const moTa = `Lúc ${gio}, ca "${t.ten}" (${t.cfg.beginTime}–${t.cfg.endTime}) ngoài khung mà thẻ có nút: [${t.nut.join(', ')}]`;
			expect(t.nut.filter((n) => /Chấm công|Mở ca/.test(n)), moTa).toEqual([]);
		}
	});

	test('03b_050_004 — Ngày chỉ có một ca thì không hiện nút Xem báo cáo', async ({ page }) => {
		chanNeuTat('03b_050_004');
		await chanGhi(page);
		const { the } = await moVaDocTheCa(page, VAI);
		test.skip(the.length !== 1, `Hôm nay tài khoản có ${the.length} ca — case cần đúng 1 ca.`);
		const [t] = the;
		expect(t.nut, `Thẻ ca duy nhất vẫn có nút "Xem báo cáo": [${t.nut.join(', ')}]`).not.toContain('Xem báo cáo');
		const noi = (await page.locator('.ant-pro-page-container').innerText()).normalize('NFC');
		expect(noi, 'Không thấy khối Báo cáo ca bên dưới thẻ').toContain('Báo cáo ca');
	});
});
