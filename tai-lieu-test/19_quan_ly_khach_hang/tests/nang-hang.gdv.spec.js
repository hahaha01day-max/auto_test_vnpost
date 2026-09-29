'use strict';

/**
 * 19_130_003 – 130_008 · "Nâng hạng realtime" — vai `gdv` (POS làn), nhóm tạo bằng phiên phụ `tct`.
 *
 * 🔴 Trên `develop` không có hạng LƯU vào khách (xem `nhom-ghi.js`) ⇒ "lên hạng" = khách vào NHÓM ĐỐI TƯỢNG điều kiện
 *    "Tổng tiền hàng đã mua ∈ (tu, den] và Số lần mua hàng = 1". Mỗi case: khách rác mới (0 đơn) + nhóm rác riêng
 *    khoanh đúng giá trị đơn của case ⇒ trước đơn KHÔNG thuộc nhóm, sau thanh toán phải VÀO nhóm (trừ nháp/nợ).
 * 🔴 GHI THẬT: đơn thật ở điểm bán rác (trừ tồn SP_TC), nhóm rác xoá ở `finally`. Khách còn đơn ⇒ để lại (có đơn).
 * Modal "Hình thức thanh toán" (`components/paymentModals/PaymentMethodModal.jsx`): "Thanh toán hết" · "Trả góp" ·
 * "Thanh toán sau" × "Tiền mặt" · "Chuyển khoản" · "Quét QR".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
const g = require('./khach-ghi');
const n = require('./nhom-ghi');

const GOC = path.join(__dirname, '..');
const GIA = 100_000; // bảng giá bán seed (AUTO<làn>_BANGGIA) cho SP_TC
const CHO_VAO_NHOM = 150_000;
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const chuanTxt = (x) => String(x ?? '').replace(/\s+/g, ' ').trim();
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

/**
 * Dựng: khách rác + nhóm khoanh (sl-1)*GIA < tổng ≤ sl*GIA, gắn khách vào tab POS, thêm `sl` × SP_TC.
 * Trả { st, kh, tct, groupId }.
 */
async function dung(page, browser, id, sl, ctx) {
	// 🔴 Ghi dần vào `ctx` của case: bước sau hỏng thì `finally` vẫn có tct/groupId để xoá nhóm rác.
	const st = await p.moBan(page, test);
	const kh = await g.taoKhachApi(page, st, g.khachMoi(id));
	const tct = await g.k.moPhienPhu(browser, 'tct', '/promotion/customer-group');
	ctx.tct = tct;
	const ten = `${g.TIEN_TO}_NHOM_${id}_${Date.now().toString().slice(-6)}`;
	const groupId = await n.taoNhomApi(tct.page, tct.st, { ten, conditions: n.dkMotDon((sl - 1) * GIA, sl * GIA) });
	ctx.groupId = groupId;
	ghiChu('nhóm rác', `${groupId} ${ten} · điều kiện (${(sl - 1) * GIA}, ${sl * GIA}] & 1 đơn`);
	expect(groupId, 'Không lấy được groupId nhóm vừa tạo').toBeTruthy();
	expect(await n.laThanhVien(tct.page, tct.st, groupId, kh.ma), 'Tiền đề sai: khách mới (0 đơn) đã ở trong nhóm').toBe(false);
	await p.chonKhach(page, kh.ten);
	for (let i = 0; i < sl; i += 1) await p.them(page, p.sp().tc);
	await page.waitForTimeout(1_500);
	return Object.assign(ctx, { st, kh, tct, groupId, ten });
}

async function don(tct, groupId) {
	if (!tct) return;
	const tv = await g.k.goiGhi(tct.page, tct.st, 'GET', `${n.API}/get-members`, { groupId, page: 0, size: 5 }).catch(() => null);
	test.info().annotations.push({ type: 'số thành viên nhóm lúc xoá', description: String(tv?.page?.total_elements ?? (tv?.data?.length ?? '?')) });
	const b = await n.xoaNhomApi(tct.page, tct.st, groupId).catch((e) => ({ status: { message: e.message } }));
	test.info().annotations.push({ type: 'xoá nhóm rác', description: `${groupId} → ${JSON.stringify(b?.status)}` });
	await tct.dong();
}

/** Chờ khách vào nhóm (đánh giá qua Kafka, bất đồng bộ). Trả số giây hoặc null. */
async function choVaoNhom(tct, groupId, ma, ms = CHO_VAO_NHOM) {
	const t0 = Date.now();
	while (Date.now() - t0 < ms) {
		if (await n.laThanhVien(tct.page, tct.st, groupId, ma)) return Math.round((Date.now() - t0) / 1000);
		await tct.page.waitForTimeout(5_000);
	}
	return null;
}

/** Mở modal thanh toán, chọn cách + phương thức, xác nhận; đi hết SDK nếu có. Trả { draft, orderId, sdk }. */
async function thanhToan(page, { cach = 'Thanh toán hết', pt = 'Tiền mặt', traTruoc = null } = {}) {
	await page.mouse.move(600, 700);
	await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
	const m = page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last();
	await expect(m).toBeVisible({ timeout: 20_000 });
	await m.getByRole('button', { name: new RegExp(cach) }).first().click();
	await m.getByRole('button', { name: new RegExp(pt) }).first().click();
	await page.waitForTimeout(1_000);
	if (traTruoc != null) {
		// Ô ngay dưới nhãn "Nhập số tiền trả góp (*)" (🚫 input cuối: là ô "Nợ sau thanh toán" bị khoá).
		const o = m.getByText('Nhập số tiền trả góp').locator('xpath=following::input[1]');
		await o.click();
		await o.press('ControlOrMeta+a');
		await o.pressSequentially(String(traTruoc));
		await page.waitForTimeout(800);
	}
	// Chuyển khoản / QR phụ thuộc cấu hình tài khoản nhận của điểm bán.
	const khongTk = m.getByText(/không có bất kì tài khoản thanh toán/);
	if (await khongTk.isVisible().catch(() => false)) return { chan: chuanTxt(await khongTk.innerText()) };
	if (/QR/.test(pt)) {
		const tk = m.locator('div').filter({ hasText: /^VNPOST - / }).first();
		if (!(await tk.count())) return { chan: 'Không có tài khoản nhận VietQR' };
		const choQr = page.waitForResponse((r) => /qr|paygate|draft-checkout/i.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 }).catch(() => null);
		await tk.click();
		const rq = await choQr;
		await page.waitForTimeout(3_000);
		const anh = await m.locator('img, canvas, svg').filter({ hasNot: m.locator('.anticon') }).count();
		return { chan: `QR đã sinh (${rq ? `${rq.url().split('__api')[1]} → ${rq.status()}` : 'không thấy request'}, ${anh} ảnh) — cần giao dịch chuyển khoản THẬT để webhook xác nhận` };
	}
	const choDraft = page.waitForResponse((r) => /draft-checkout|spa-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 }).catch(() => null);
	await m.getByRole('button', { name: 'Xác nhận thanh toán' }).click();
	const r = await choDraft;
	const draft = r ? await r.json().catch(() => null) : null;
	const orderId = draft?.data?.orderId;
	// SDK VNPOST: iframe confirm-cash / confirm-* — bấm "Xác nhận thanh toán" trong khung nếu có.
	let sdk = 'không có';
	const khung = page.frameLocator('iframe[src*="confirm"]');
	if (await khung.getByText(/xác nhận giao dịch/i).waitFor({ timeout: 30_000 }).then(() => true, () => false)) {
		sdk = 'có';
		await khung.getByText('Xác nhận thanh toán', { exact: true }).click().catch(() => { sdk = 'có, bấm hỏng'; });
		await page.waitForTimeout(5_000);
	}
	const tb = p.chuan((await page.locator('.ant-message-notice, .ant-modal-confirm').allInnerTexts()).join(' | '));
	return { draft, orderId, sdk, tb, cuaSo: await m.isVisible().catch(() => false) };
}

test.describe('19_130 · Vào nhóm (nâng hạng) realtime theo thanh toán (vai gdv, GHI THẬT)', () => {
	for (const [id, sl, pt] of [
		['19_130_003', 3, 'Tiền mặt'],
		['19_130_007', 4, 'Chuyển khoản'],
		['19_130_008', 5, 'Quét QR'],
	]) {
		test(`${id} — vào nhóm ngay sau khi thanh toán hết bằng ${pt}`, async ({ page, browser }) => {
			chanNeuTat(id);
			test.setTimeout(420_000);
			const ctx = {};
			try {
				await dung(page, browser, id, sl, ctx);
				const kq = await thanhToan(page, { pt });
				if (kq.chan) {
					ghiChu('chặn bởi môi trường', kq.chan);
					await page.getByRole('dialog').filter({ hasText: 'Hình thức thanh toán' }).last().getByRole('button', { name: /Hu[ỷy]/ }).last().click().catch(() => null);
					test.skip(true, `${pt}: ${kq.chan}`);
				}
				ghiChu('thanh toán', JSON.stringify({ draft: kq.draft?.status, orderId: kq.orderId, sdk: kq.sdk, tb: kq.tb.slice(0, 200), modalCon: kq.cuaSo }));
				expect(String(kq.draft?.status?.code), `Thanh toán ${pt} không qua checkout: ${JSON.stringify(kq.draft?.status)} · ${kq.tb}`).toBe('200');
				const giay = await choVaoNhom(ctx.tct, ctx.groupId, ctx.kh.ma);
				ghiChu('vào nhóm sau', giay == null ? `KHÔNG vào sau ${CHO_VAO_NHOM / 1000}s` : `${giay}s`);
				expect(giay, `Thanh toán ${pt} xong mà khách không vào nhóm điều kiện sau ${CHO_VAO_NHOM / 1000}s`).not.toBeNull();
			} finally {
				await don(ctx?.tct, ctx?.groupId);
			}
		});
	}

	test('19_130_005 — Không nâng hạng khi đơn còn ở trạng thái nháp', async ({ page, browser }) => {
		chanNeuTat('19_130_005');
		test.setTimeout(420_000);
		const ctx = {};
		try {
			await dung(page, browser, '19_130_005', 6, ctx);
			const cho = page.waitForResponse((r) => /spa-checkout|draft/.test(r.url()) && r.request().method() === 'POST', { timeout: 20_000 });
			await page.keyboard.press('F7'); // lưu nháp
			const b = await (await cho).json().catch(() => ({}));
			ghiChu('lưu nháp', JSON.stringify(b?.status));
			expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
			const giay = await choVaoNhom(ctx.tct, ctx.groupId, ctx.kh.ma, 90_000);
			ghiChu('vào nhóm', giay == null ? 'không (đúng)' : `SAU ${giay}s — SAI`);
			expect(giay, 'Đơn NHÁP mà khách đã vào nhóm').toBeNull();
		} finally {
			await don(ctx?.tct, ctx?.groupId);
		}
	});

	test('19_130_004 — Nâng hạng realtime khi thanh toán sau rồi trả nợ', async ({ page, browser }) => {
		chanNeuTat('19_130_004');
		test.setTimeout(480_000);
		const ctx = {};
		try {
			await dung(page, browser, '19_130_004', 7, ctx);
			const cho = page.waitForResponse((r) => /spa-checkout/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
			await page.keyboard.press('F8'); // thanh toán sau
			const b = await (await cho).json().catch(() => ({}));
			expect(String(b?.status?.code), `Tạo đơn thanh toán sau lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			const orderId = b?.data?.orderId ?? b?.data?.id ?? b?.data;
			const luc1 = await choVaoNhom(ctx.tct, ctx.groupId, ctx.kh.ma, 90_000);
			ghiChu('sau khi ghi nợ', luc1 == null ? 'chưa vào nhóm (đúng)' : `ĐÃ vào sau ${luc1}s — SAI`);
			expect(luc1, 'Mới GHI NỢ (chưa trả) mà khách đã vào nhóm').toBeNull();
			// Trả nợ bằng API thu nợ của phiên phụ Quản lý tỉnh (CHT thiếu quyền CREATE_CUSTOMER_DEBT — xem báo cáo 090_001).
			const tinh = await g.k.moPhienPhu(browser, 'province', '/customer');
			try {
				const shopId = Number(ctx.st.h.shopid);
				const ct = await g.k.goiGhi(page, ctx.st, 'GET', `/orders/shops/${shopId}/${orderId}/details`);
				const tong = Number(ct?.data?.totalMoney ?? ct?.data?.priceAfterDiscount ?? ct?.data?.totalPrice ?? 0) || 7 * GIA;
				const tra = await g.k.goiGhi(tinh.page, tinh.st, 'POST', `/shops/${shopId}/customer/create-debt`, {}, {
					shopId, customerId: ctx.kh.id, customerName: ctx.kh.ten, type: 'PAYMENT', note: 'AUTO TEST 19_130_004 trả nợ',
					// createdBy = sysUserId người tạo phiếu (= AUTHEN.USER.user_id của tài khoản tỉnh — SELECT chỉ đọc).
					totalAmount: tong, createdBy: Number(g.selectDb(`SELECT user_id FROM AUTHEN.USER WHERE username='${String(process.env.VNPOST_ACCOUNT_PROVINCE).replace(/[^a-z0-9_]/gi, '')}'`)[0]?.[0]), actionTime: Date.now(), catName: 'Thu hồi nợ',
					paymentType: 'WEB', paymentMethod: 'MONEY', orders: [{ orderId, totalAmount: tong }], debts: [], imageIds: [],
				});
				ghiChu('trả nợ', `${tong} → ${JSON.stringify(tra?.status)}`);
				expect(String(tra?.status?.code), `Không trả được nợ đơn ${orderId}: ${JSON.stringify(tra?.status)}`).toBe('200');
			} finally {
				await tinh.dong();
			}
			const luc2 = await choVaoNhom(ctx.tct, ctx.groupId, ctx.kh.ma);
			ghiChu('sau khi trả nợ', luc2 == null ? 'KHÔNG vào nhóm' : `vào sau ${luc2}s`);
			expect(luc2, 'Trả hết nợ mà khách không vào nhóm').not.toBeNull();
		} finally {
			await don(ctx?.tct, ctx?.groupId);
		}
	});

	test('19_130_006 — Nâng hạng realtime khi thanh toán trả góp', async ({ page, browser }) => {
		chanNeuTat('19_130_006');
		test.setTimeout(420_000);
		const ctx = {};
		try {
			await dung(page, browser, '19_130_006', 8, ctx);
			const kq = await thanhToan(page, { cach: 'Trả góp', pt: 'Tiền mặt', traTruoc: 4 * GIA });
			ghiChu('trả góp 50%', JSON.stringify({ draft: kq.draft?.status, orderId: kq.orderId, sdk: kq.sdk, tb: kq.tb.slice(0, 200) }));
			expect(String(kq.draft?.status?.code), `Trả góp không qua checkout: ${JSON.stringify(kq.draft?.status)} · ${kq.tb}`).toBe('200');
			const giay = await choVaoNhom(ctx.tct, ctx.groupId, ctx.kh.ma);
			// Kỳ vọng CHƯA chốt (CSV): chỉ GHI LẠI hành vi — nhóm khoanh theo TỔNG đơn (8 × giá), khách mới trả 50%.
			ghiChu('hành vi thật', giay == null ? `trả góp 50%: KHÔNG vào nhóm sau ${CHO_VAO_NHOM / 1000}s (chờ tất toán?)` : `trả góp 50%: vào nhóm sau ${giay}s (tính theo tổng đơn)`);
		} finally {
			await don(ctx?.tct, ctx?.groupId);
		}
	});
});
