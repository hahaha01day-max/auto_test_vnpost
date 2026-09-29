'use strict';

/**
 * 18_5_140_002 — chặn hoàn trả khi lô truy được ÍT HƠN số lượng yêu cầu hoàn (vai `gdv`, điểm bán seed làn).
 *
 * Trace vnpost-pod-service `ReturnOrderServiceImpl.buildReturnStockItemsFromSpecificTrace` (28/09/2026): lô truy vết lấy từ
 * `batch_products` dòng đơn gốc, không có thì từ MỌI dòng phiếu xuất bán (`SHOP_STOCK_IN_OUT` type EXPORT theo order_id); còn
 * thiếu số lượng sau khi trừ hết các lô ⇒ `INVALID_RETURN_REQUEST` "Không đủ lô để hoàn đúng số lượng yêu cầu".
 *
 * Tiền đề có sẵn (không dựng mới): đơn bán VẮT qua tồn âm — một phần lấy từ lô, phần âm KHÔNG có lô (bán âm bật riêng điểm bán
 * làn, `shared/ban-am.js`; sinh bởi `18_1/tests/ton-am.gdv.spec.js` và `04_4/tests/ton-am.shop.spec.js`). Đo 28/09 làn 8:
 * đơn bán 149 SP TC, lô truy được 147. Tìm bằng SELECT, lấy đơn nhỏ nhất CHƯA từng hoàn trả, bán HÔM NAY (hạn trả chuỗi = 1 ngày —
 * đơn cũ bật hộp "Đơn hàng quá thời hạn trả hàng").
 * 🔴 Nếu BE KHÔNG chặn thì đơn hoàn trả được tạo thật (đó chính là lỗi cần báo).
 */

const { test, expect } = require('@playwright/test');
const ka = require('../../shared/kho-api');
const { BASE, SHOP, p, chuan, chanNeuTat, hoanTra, dongTra } = require('./doi-tra');

/** Đơn của điểm bán làn có dòng bán vượt số lô truy được: { orderId, orderCode, variantId, ten, sl, coLo }. */
function donLoThieu() {
	const r = ka.sql(`select s.order_id, s.order_code, i.variant_id, max(i.product_name), sum(i.quantity) sl,
		sum(case when i.batch_products like '%batchCode%' then i.quantity else 0 end) co_lo
		from SHOP_STOCK_IN_OUT s join SHOP_STOCK_IN_OUT_ITEM i using(stock_in_out_id)
		where s.shop_id=${SHOP()} and s.type='EXPORT' and s.order_id is not null and s.created_time >= curdate()
		and not exists (select 1 from RETURN_ORDER r where r.order_id=s.order_id)
		group by s.order_id, s.order_code, i.variant_id having co_lo>0 and co_lo<sl order by sl limit 1`);
	if (!r) return null;
	const [orderId, orderCode, variantId, ten, sl, coLo] = r.split('\t');
	return { orderId: Number(orderId), orderCode, variantId: Number(variantId), ten, sl: Number(sl), coLo: Number(coLo) };
}

test.describe('18_5 — Hoàn trả thiếu lô', () => {
	test.describe.configure({ timeout: 240_000 });
	test.afterEach(async ({ page }) => {
		await page.keyboard.press('Escape').catch(() => null);
		await p.donTab(page).catch(() => null);
	});

	test('18_5_140_002 — Chặn khi không đủ lô để hoàn đúng số lượng', async ({ page }) => {
		chanNeuTat('18_5_140_002');
		const don = donLoThieu();
		test.skip(!don, 'Không có đơn bán vắt qua tồn âm (lô truy được < số bán) ở điểm bán làn — chạy `18_1/tests/ton-am.gdv.spec.js` trước');
		await p.moBan(page, test); // bảo đảm ca mở có quầy (hoàn trả đòi ca — 18_5_140_001)
		await p.moTrang(page, `${BASE()}/order/created-orders/detail/${don.orderId}/${SHOP()}`, p.VAI);
		await expect(page.getByText('Doanh thu', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
		// 🔴 Bấm "Đổi trả hàng" khi chi tiết chưa nạp xong ⇒ bảng hàng trả rỗng (khuôn `doi-tra.js › moDoiTra`).
		await page.getByText('Sản phẩm đơn gốc').first().scrollIntoViewIfNeeded().catch(() => null);
		await page.waitForTimeout(3_000);
		await page.getByRole('button', { name: /Đổi trả hàng/ }).click();
		await expect(page.getByText('Hàng khách trả lại')).toBeVisible({ timeout: 30_000 });
		const dong = dongTra(page).filter({ hasText: don.ten }).first();
		await expect(dong, 'Màn đổi trả không nạp dòng hàng của đơn gốc').toBeVisible({ timeout: 30_000 });
		const o = dong.locator('input').first();
		await o.fill(String(don.sl));
		await o.press('Enter');
		await page.waitForTimeout(800);
		const slTra = Number(String(await o.inputValue()).replace(',', '.'));
		expect(slTra, `Không khai được số lượng trả = số đã bán (${don.sl})`).toBe(don.sl);
		const x = await hoanTra(page);
		const taoMoi = Number(ka.sql(`select count(*) from RETURN_ORDER where order_id=${don.orderId}`));
		test.info().annotations.push({ type: 'đo', description: `đơn ${don.orderCode} · ${don.ten} bán ${don.sl}, lô truy được ${don.coLo} · trả ${slTra} ⇒ "${x.tb}" · ${x.url?.split('?')[0]} ${JSON.stringify(x.body?.status)} · RETURN_ORDER của đơn: ${taoMoi}` });
		expect(chuan(x.tb), 'Không có thông báo chặn nguyên văn').toContain('Không đủ lô để hoàn đúng số lượng yêu cầu');
		expect(taoMoi, '🔴 Đã tạo đơn hoàn trả dù thiếu lô').toBe(0);
	});
});
