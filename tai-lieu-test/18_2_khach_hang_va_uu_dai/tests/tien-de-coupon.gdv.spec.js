'use strict';

/**
 * Tiền đề 18_2 nhóm 030 — đợt coupon cho điểm bán seed làn (25/09: không có mã hợp lệ nào cho AUTO8).
 * Payload theo vnpost-web `couponManagement/views/drawer/DrawerAddOrUpdateCoupon.jsx` (`POST /coupon-batch/create`),
 * phạm vi `DIEM_BAN_CU_THE` / `scopeType DIEM_BAN` / `orgUnitCode = shop_code` (đối chiếu COUPON_BATCH_SCOPE đợt 77/80/81).
 * Chạy bằng phiên phụ `tct_marketing`. Idempotent: có đợt tên `AUTO<lane> coupon 18_2` còn hạn thì dùng lại.
 * Sổ: `18_2/test-output/coupon.lane<N>.json` = { batchId, codes[] (UNUSED) }.
 *   VNPOST_LANE=8 VNPOST_SETUP_ROLES=gdv,tct_marketing npx playwright test --config … -g "tien de coupon"
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');

// 🔴 Chỉ CORP_ADMIN có CREATE_COUPON ⇒ chạy bằng TÀI KHOẢN GỐC `.env` (bỏ VNPOST_LANE), làn đích qua VNPOST_COUPON_LANE:
//   env -u VNPOST_LANE VNPOST_COUPON_LANE=8 VNPOST_COUPON_SHOP_CODE=AUTO8_T_01_A01 VNPOST_SETUP_ROLES=tct npx playwright test … -g "tien de coupon"
const LANE = process.env.VNPOST_COUPON_LANE || process.env.VNPOST_LANE || 'x';
const SO = path.join(__dirname, '..', 'test-output', `coupon.lane${LANE}.json`);
const TEN = `AUTO${LANE} coupon 18_2`;

test('tien de coupon 18_2 — đợt coupon cho điểm bán seed', async ({ browser }) => {
	test.setTimeout(180_000);
	test.skip(Boolean(process.env.VNPOST_LANE) || !process.env.VNPOST_COUPON_LANE, 'Bước tiền đề chạy bằng tài khoản gốc: bỏ VNPOST_LANE, đặt VNPOST_COUPON_LANE');
	const shopCode = process.env.VNPOST_COUPON_SHOP_CODE;
	expect(shopCode, 'Thiếu VNPOST_COUPON_SHOP_CODE (shop_code điểm bán seed)').toBeTruthy();
	const ps = await p.k.moPhienPhu(browser, 'tct', '/promotion/coupon');
	try {
		const d0 = new Date(); d0.setHours(0, 0, 0, 0);
		/** Đợt theo tên (dùng lại nếu còn hạn) ⇒ { batchId, codes }. */
		const dot = async (ten, them, tienTo) => {
			const ds = await p.k.goiGhi(ps.page, ps.st, 'GET', '/coupon-batch/list', { page: 0, size: 50, name: ten });
			let x = (ds?.data || []).find((b) => b.name === ten && Number(b.endDate) > Date.now());
			if (!x) {
				const body = {
					name: ten, status: 1, startDate: d0.getTime(), endDate: d0.getTime() + 90 * 86400_000 - 1,
					applyScopeLevel: 'DIEM_BAN_CU_THE', scopes: [{ scopeType: 'DIEM_BAN', orgUnitCode: shopCode }],
					discountType: 'VND', discountValue: 5000, maxDiscountAmount: 5000, allowCombineWithOtherPromotions: true,
					// 🔴 BE bắt buộc codeSuffix ("Ký tự kết thúc mã không được để trống").
					codeConfigs: [{ quantity: 30, codePrefix: tienTo, codeLength: 6, codeSuffix: 'Z' }],
					...them,
				};
				const r = await p.k.goiGhi(ps.page, ps.st, 'POST', '/coupon-batch/create', {}, body);
				test.info().annotations.push({ type: `tạo ${ten}`, description: JSON.stringify(r?.status) });
				expect(String(r?.status?.code), `Tạo đợt ${ten} lỗi: ${JSON.stringify(r?.status)}`).toBe('200');
				const ds2 = await p.k.goiGhi(ps.page, ps.st, 'GET', '/coupon-batch/list', { page: 0, size: 50, name: ten });
				x = (ds2?.data || []).find((b) => b.name === ten);
			}
			const batchId = x?.id ?? x?.couponId ?? x?.batchId;
			expect(batchId, `Không đọc được id đợt ${ten}`).toBeTruthy();
			const ma = await p.k.goiGhi(ps.page, ps.st, 'GET', `/coupon-batch/${batchId}/codes`, { page: 0, size: 100 });
			const codes = (ma?.data || []).filter((c) => String(c.status ?? 'UNUSED') === 'UNUSED').map((c) => c.code ?? c.couponCode);
			test.info().annotations.push({ type: `đợt ${ten}`, description: `id ${batchId} · ${codes.length} mã` });
			return { batchId, codes };
		};
		const chinh = await dot(TEN, {}, `A${LANE}C`);
		const toiThieu = await dot(`${TEN} toi thieu 200k`, { minOrderAmount: 200000 }, `A${LANE}M`);
		const khongChung = await dot(`${TEN} khong dung chung`, { allowCombineWithOtherPromotions: false }, `A${LANE}K`);
		expect(chinh.codes.length, 'Đợt không có mã UNUSED').toBeGreaterThan(0);
		let cu = {};
		try { cu = JSON.parse(fs.readFileSync(SO, 'utf8')); } catch { /* chưa có */ }
		fs.mkdirSync(path.dirname(SO), { recursive: true });
		fs.writeFileSync(SO, JSON.stringify({ ...cu, batchId: chinh.batchId, shopCode, codes: chinh.codes, daDung: cu.daDung || [], toiThieu, khongChung, ngay: new Date().toISOString() }, null, 1));
	} finally {
		await ps.dong();
	}
});
