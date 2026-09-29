'use strict';

/**
 * Phân hệ 17 — Giao dịch viên không khai báo được quầy (vai `gdv`).
 *
 * Trace 25/09/2026: nút "Thêm quầy" là `Button` thường (🚫 không phải `PermissionButton`) ⇒ chặn
 * phải nằm ở quyền API `POST /cashier-counter/create` (gateway, quyền create_fund).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const q = require('./quay-ghi');

const GOC = path.join(__dirname, '..');

test('17_PQ_001 — Vai giao dịch viên không khai báo được quầy', async ({ page }) => {
	const i = loadCaseInput(GOC, '17_PQ_001');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(150_000);
	const { st, shopId } = await q.moQuay(page, 'gdv');
	const nut = q.khung(page).getByRole('button', { name: /Thêm quầy/ });
	const coNut = (await nut.count()) > 0 && (await nut.isEnabled());
	if (!coNut) return; // Không có nút ⇒ đạt kỳ vọng vế 1.
	const ma = q.maMoi();
	const body = await q.k.goiGhi(page, st, 'POST', '/cashier-counter/create', {}, { shopId, name: `${ma} gdv`, code: ma });
	if (String(body?.status?.code) === '200' && body?.data?.counterId) {
		await q.ngungQuayApi(page, st, shopId, body.data.counterId);
	}
	expect(String(body?.status?.code), `GDV vẫn thấy nút "Thêm quầy" VÀ tạo được quầy: ${JSON.stringify(body?.status)}`).not.toBe('200');
});
