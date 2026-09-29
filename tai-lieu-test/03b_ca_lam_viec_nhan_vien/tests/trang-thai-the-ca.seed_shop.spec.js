'use strict';

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { chanGhi } = require('./shift-card');
const { moVaDocTheCa, trongKhungChamCong, trangThaiPhien } = require('./the-ca-doc');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_shop';

/**
 * 03b_010_002 — nút trên thẻ ca đổi theo trạng thái ca, chạy trên điểm bán seed.
 *
 * Kỳ vọng tính TỪ DỮ LIỆU NGUỒN của từng thẻ (summary phiên + khung giờ ca), 🚫 không chép cứng
 * trạng thái hôm nay: CLOSED → "In chốt ca" · DRAFT_CLOSED → "Tiếp tục chốt" + nhãn "Phiên đang
 * tạm chốt" · OPEN → "Chốt ca" · chưa mở + trong giờ + không có ca nào đang mở → "Mở ca".
 * Một lượt chỉ gặp được những trạng thái đang có — trạng thái vắng mặt ghi vào annotation.
 * 🚫 Không ghi gì: `chanGhi` chặn mọi request ghi của chấm công.
 */
test('03b_010_002 — Nút trên thẻ ca đổi theo trạng thái ca', async ({ page }) => {
	const thieu = missingRoleReason(VAI);
	test.skip(Boolean(thieu), thieu ?? '');
	const ly = skipReason(loadCaseInput(GOC, '03b_010_002'));
	test.skip(Boolean(ly), ly ?? '');
	test.setTimeout(180_000);
	await chanGhi(page);

	const { the } = await moVaDocTheCa(page, VAI);
	expect(the.length, 'Tài khoản không có thẻ ca nào hôm nay để đối chiếu').toBeGreaterThan(0);
	const coCaDangMo = the.some((t) => ['OPEN', 'DRAFT_CLOSED'].includes(trangThaiPhien(t.summary)));
	const gapTrangThai = new Set();

	for (const t of the) {
		expect(t.cfg, `Không tìm được cấu hình của ca "${t.ten}" trong shift-all`).toBeTruthy();
		const st = trangThaiPhien(t.summary);
		const coNut = (n) => t.nut.includes(n);
		const moTa = `Thẻ "${t.ten}" (phiên ${st || 'chưa mở'}) có nút: [${t.nut.join(', ')}]`;
		if (st === 'CLOSED') {
			gapTrangThai.add('đã chốt');
			expect(coNut('In chốt ca'), moTa).toBe(true);
			expect(coNut('Chốt ca') || coNut('Mở ca'), moTa).toBe(false);
		} else if (st === 'DRAFT_CLOSED') {
			gapTrangThai.add('tạm chốt');
			expect(coNut('Tiếp tục chốt'), moTa).toBe(true);
			expect(t.chu, `${moTa} — thiếu nhãn "Phiên đang tạm chốt"`).toContain('Phiên đang tạm chốt');
		} else if (st === 'OPEN') {
			gapTrangThai.add('đang mở');
			expect(coNut('Chốt ca'), moTa).toBe(true);
			expect(coNut('Mở ca'), moTa).toBe(false);
		} else {
			const trongGio = trongKhungChamCong(t.cfg) !== false;
			if (!coCaDangMo && trongGio) {
				gapTrangThai.add('chưa mở, trong giờ');
				expect(coNut('Mở ca'), moTa).toBe(true);
			} else {
				gapTrangThai.add(coCaDangMo ? 'chưa mở, có ca khác đang mở' : 'chưa mở, ngoài giờ');
				expect(coNut('Mở ca'), moTa).toBe(false);
			}
			expect(coNut('Chốt ca') || coNut('In chốt ca') || coNut('Tiếp tục chốt'), moTa).toBe(false);
		}
	}
	test.info().annotations.push({
		type: 'ghi chú',
		description: `Trạng thái gặp được lượt này: ${[...gapTrangThai].join(' · ')}. Trạng thái khác của kịch bản chưa có trên dữ liệu hôm nay.`,
	});
});
