'use strict';

/**
 * 04_4_070_001 — Đóng kỳ thì giá vốn chứng từ kiểm kho đã chốt không đổi + chặn lập phiếu lùi về kỳ đã đóng (vai `shop`) — GHI THẬT.
 *
 * "Đóng kỳ" = CHỐT TỒN KHO THÁNG (28/09/2026 trace): FE `features/inventory/overview/components/ModalCloseInventory.jsx`
 * ⇒ `POST /period-closing/close` (core `InventoryPeriodClosingServiceImpl`) ⇒ chốt xong ⇒ `VNPOST_CORE.INVENTORY_PERIOD_CLOSE`
 * status CLOSED theo shop/tháng ⇒ pod `InventoryPeriodGuardService.assertPeriodOpen` chặn mọi chứng từ kho có ngày trong tháng đó
 * ("Tháng MM/yyyy đã chốt tồn kho, không thể thực hiện nghiệp vụ kho", `INVENTORY_PERIOD_CLOSED`).
 * 🔴 Vai kế toán (tỉnh/TCT) gọi API này bị SSHOP-401 (đo 28/09) ⇒ chạy bằng CHT (`shop`, chốt shop của mình — TARGET).
 *
 * Tiền đề (tầng "riêng phân hệ, dùng lại được", sổ `test-output/ky-ke-toan.lane<N>.json`):
 * 1. Chứng từ kiểm kho ĐÃ CHỐT: đếm toàn kho bằng Excel, lệch +1 một lô FIFO để có dòng mang giá vốn; chốt phiên. Ghi dòng chứng từ.
 *    🔴 Đo 28/09: ô "Thời gian tạo phiếu" + "Lưu thông tin" chỉ đổi `created_time` của PHIẾU CON (2144 → 15/08), chứng từ chốt 2145
 *    vẫn mang `action_time` = lúc chốt phiên ⇒ 🚫 không lùi được chứng từ vào tháng cũ. Kỳ đóng được = tháng của chứng từ.
 * 2. Chốt tồn đúng tháng đó cho RIÊNG điểm bán làn — chỉ khi tháng đã qua (FE khoá tháng hiện tại; BE KHÔNG khoá — 🚫 gọi API chốt tháng
 *    đang chạy: sẽ chặn mọi nghiệp vụ kho của điểm bán tới hết tháng). 🔴 KHÔNG hoàn tác được (không có màn mở lại kỳ).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const { chon } = require('../../shared/db/otp');
const ka = require('../../shared/kho-api');
const kk = require('./kiem-kho-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';

const SO = path.join(GOC, 'test-output', `ky-ke-toan.lane${process.env.VNPOST_LANE || 0}.json`);
const BASE = () => process.env.VNPOST_BASE_URL;
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const { d } = ka;

const doc = () => (fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, 'utf8')) : {});
const ghiSo = (x) => { fs.mkdirSync(path.dirname(SO), { recursive: true }); fs.writeFileSync(SO, JSON.stringify({ ...doc(), ...x }, null, 1)); };
/** Tháng của chứng từ tiền đề: { nam, thang, mm_yyyy, yyyy_mm, ngayLui } — ngày lùi dùng cho bước "lập phiếu vào kỳ đã đóng". */
const ky = () => {
	const [nam, thang] = String(doc().actionTime || '').split('-').map(Number);
	const p = String(thang).padStart(2, '0');
	return { nam, thang, mm_yyyy: `${p}/${nam}`, yyyy_mm: `${nam}-${p}`, ngayLui: `10:00 15/${p}/${nam}` };
};
const trangThaiKy = () => chon(`select status from INVENTORY_PERIOD_CLOSE where shop_id=${d().diemBan.shopId} and period_year=${ky().nam} and period_month=${ky().thang} order by id desc limit 1`, 'VNPOST_CORE');
const thangDaQua = () => { const n = new Date(); return ky().nam * 12 + ky().thang < n.getFullYear() * 12 + n.getMonth() + 1; };
const dongChungTu = (id) => ka.sql(`select item_id, variant_id, price, coalesce(base_price,0), amount, quantity, pre_quantity, post_quantity from SHOP_STOCK_IN_OUT_ITEM where stock_in_out_id=${id} order by 1`)
	.split('\n').filter(Boolean);

/** Đặt "Thời gian tạo phiếu" trên trang phiếu rồi "Lưu thông tin"; trả body response. */
async function datNgayPhieu(page, ngay) {
	const the = page.locator('.ant-card, .ant-pro-card, div').filter({ has: page.getByText('Thông tin phiếu kiểm kho', { exact: true }) }).filter({ has: page.locator('.ant-picker') }).last();
	const o = the.locator('.ant-picker input').first();
	await o.click();
	await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
	await page.keyboard.type(ngay);
	await page.keyboard.press('Enter');
	await page.waitForTimeout(500);
	const cho = page.waitForResponse((r) => /inventory-check\/\d+/.test(r.url()) && ['PUT', 'PATCH', 'POST'].includes(r.request().method()) && !/items|tickets/.test(r.url()), { timeout: 20_000 });
	await page.getByRole('button', { name: 'Lưu thông tin' }).click();
	return (await cho).json().catch(() => null);
}

test.describe('04_4 — Đóng kỳ (chốt tồn tháng)', () => {
	test.describe.configure({ timeout: 360_000 });

	test('tien de ky ke toan — chứng từ kiểm kho đã chốt + chốt tồn tháng của nó', async ({ page }) => {
		const shopId = d().diemBan.shopId;
		const st = ka.k.batHeader(page);
		if (!doc().phieu) {
			const { sessionId, phieu } = await kk.vaoPhieuCuaToi(page, VAI);
			try {
				// Lệch +1 một lô FIFO để chứng từ có dòng điều chỉnh mang giá vốn.
				const fifo = ka.donVi(ka.SP.FIFO());
				const lo = (await ka.k.goiApi(page, st, '/stock/v2/batch-product', { shopId, productId: fifo.productId, variantId: fifo.variantId, size: 50 })).data
					.find((l) => Number(l.remainQuantity) > 0);
				expect(lo, 'SP FIFO của làn không còn lô tồn').toBeTruthy();
				await kk.demToanKhoExcel(page, st, shopId, { [lo.batchCode]: Number(lo.remainQuantity) + 1 }, test.info().outputPath('kiem-kho-t8.xlsx'));
				await kk.chonLyDo(page, d().sanPham.sanPhamTheoGiaVon.fifo.tenSanPham).catch(() => null);
				await page.getByRole('button', { name: 'Xác nhận đếm' }).click();
				await expect(page.locator('.ant-message-notice').filter({ hasText: 'Đã xác nhận đếm' }).first()).toBeAttached({ timeout: 30_000 });
				await moTrang(page, `${BASE()}/inventory/inventory-check/session-manage?shopId=${shopId}&sessionId=${sessionId}`, VAI);
				const rv = await kk.moTongHop(page);
				await rv.getByRole('tab', { name: /Tồn kho lệch/ }).click().catch(() => null);
				await page.waitForTimeout(1_000);
				const gc = rv.getByPlaceholder('Bắt buộc nhập ghi chú');
				for (let i = 0; i < (await gc.count()); i += 1) await gc.nth(i).fill('AUTO test 04_4_070_001 ky ke toan');
				const cho = page.waitForResponse((r) => /sessions\/\d+\/close/.test(r.url()), { timeout: 60_000 });
				await rv.getByRole('button', { name: 'Xác nhận chốt phiên' }).click();
				const b = await (await cho).json();
				expect(String(b?.status?.code), `Chốt phiên lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			} catch (e) {
				await kk.huyPhien(page, st, shopId, sessionId);
				throw e;
			}
			await page.waitForTimeout(5_000);
			const ct = ka.sql(`select stock_in_out_id, action_time from SHOP_STOCK_IN_OUT where shop_id=${shopId} and type='STOCK_CHECKS' and status='COMPLETED' order by stock_in_out_id desc limit 1`).split('\t');
			const dong = dongChungTu(ct[0]);
			test.info().annotations.push({ type: 'chứng từ', description: `phiếu con ${phieu} · chứng từ COMPLETED ${ct[0]} action_time ${ct[1]} · dòng ${JSON.stringify(dong)}` });
			ghiSo({ phieu: Number(ct[0]), actionTime: ct[1], dongTruoc: dong });
		}
		// 🔴 Tháng CHƯA qua: FE khoá, BE thì nhận ⇒ chỉ đóng bằng API khi user cho phép (VNPOST_DONG_KY_API=1, user chốt 28/09).
		//    Đóng tháng đang chạy = KHOÁ mọi nghiệp vụ kho của điểm bán làn tới hết tháng — chạy case này CUỐI CÙNG trên làn.
		const quaApi = !thangDaQua();
		test.skip(quaApi && process.env.VNPOST_DONG_KY_API !== '1', `Chứng từ tiền đề ${doc().phieu} thuộc tháng ${ky().mm_yyyy} — chưa hết tháng (FE khoá). Đặt VNPOST_DONG_KY_API=1 để đóng bằng API, hoặc chạy từ ngày 1 tháng sau.`);
		if (quaApi && trangThaiKy() !== 'CLOSED') {
			await moTrang(page, `${BASE()}/inventory/overview`, VAI);
			await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
			const body = { reportMonth: ky().yyyy_mm, shopIds: [shopId], scope: { type: 'TARGET', orgLevel: 'DIEM_BAN', orgCode: null } }; // = body modal gửi (TARGET)
			const b = await ka.k.goiGhi(page, st, 'POST', '/period-closing/close', {}, body);
			test.info().annotations.push({ type: 'đóng kỳ (API)', description: `body ${JSON.stringify(body)} · ${JSON.stringify(b?.status)} · data ${JSON.stringify(b?.data).slice(0, 400)}` });
			expect(String(b?.status?.code), `Chốt tồn tháng ${ky().mm_yyyy} lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			await expect.poll(trangThaiKy, { timeout: 120_000, intervals: [5_000], message: `INVENTORY_PERIOD_CLOSE tháng ${ky().mm_yyyy} không sang CLOSED` }).toBe('CLOSED');
			ghiSo({ dongKyLuc: new Date().toISOString(), dongKyBang: 'API' });
		}
		if (trangThaiKy() !== 'CLOSED') {
			// Đóng kỳ qua giao diện: Tổng quan kho → "Chốt tồn kho" → tháng của chứng từ → Chốt shop của tôi.
			await moTrang(page, `${BASE()}/inventory/overview`, VAI);
			const nut = page.getByRole('button', { name: /Chốt tồn kho/ }).first();
			await expect(nut, 'CHT không có nút "Chốt tồn kho"').toBeVisible({ timeout: 30_000 });
			await nut.click();
			const md = page.getByRole('dialog').filter({ hasText: 'Chốt tồn kho theo tháng' });
			await expect(md).toBeVisible();
			const oThang = md.locator('.ant-picker input').first();
			await oThang.click();
			await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
			await page.keyboard.type(ky().mm_yyyy);
			await page.keyboard.press('Enter');
			const cho = page.waitForResponse((r) => r.url().includes('/period-closing/close') && r.request().method() === 'POST', { timeout: 60_000 });
			await md.locator('.ant-btn-primary').last().click();
			const res = await cho;
			const body = res.request().postDataJSON();
			const b = await res.json().catch(() => null);
			test.info().annotations.push({ type: 'đóng kỳ', description: `body ${JSON.stringify(body)} · ${JSON.stringify(b?.status)} · data ${JSON.stringify(b?.data).slice(0, 300)}` });
			expect(body?.reportMonth, `Modal không gửi đúng tháng ${ky().yyyy_mm}`).toBe(ky().yyyy_mm);
			expect(String(b?.status?.code), `Chốt tồn tháng ${ky().mm_yyyy} lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
			await expect.poll(trangThaiKy, { timeout: 120_000, intervals: [5_000], message: `INVENTORY_PERIOD_CLOSE tháng ${ky().mm_yyyy} không sang CLOSED` }).toBe('CLOSED');
			ghiSo({ dongKyLuc: new Date().toISOString() });
		}
	});

	test('04_4_070_001 — Đóng kỳ kế toán thì giá vốn chứng từ đã chốt không đổi', async ({ page }) => {
		const ly = skipReason(loadCaseInput(GOC, '04_4_070_001'));
		test.skip(Boolean(ly), ly ?? '');
		const so = doc();
		test.skip(!so.phieu || trangThaiKy() !== 'CLOSED', 'Chưa có tiền đề — chạy test "tien de ky ke toan" trước');
		const shopId = d().diemBan.shopId;
		const sau = dongChungTu(so.phieu);
		// Lập phiếu kiểm kho mới lùi ngày vào tháng đã đóng ⇒ phải bị chặn.
		const st = ka.k.batHeader(page);
		const { sessionId } = await kk.vaoPhieuCuaToi(page, VAI);
		let bNgay = null;
		let tb = '';
		try {
			bNgay = await datNgayPhieu(page, ky().ngayLui);
			const n = page.locator('.ant-message-notice');
			await n.first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null);
			tb = chuan((await n.allInnerTexts()).join(' | '));
		} finally { await kk.huyPhien(page, st, shopId, sessionId); }
		test.info().annotations.push({ type: 'đo', description: `chứng từ ${so.phieu} (${so.actionTime}) · trước đóng kỳ ${JSON.stringify(so.dongTruoc)} · sau ${JSON.stringify(sau)} · lưu phiếu mới ngày ${ky().ngayLui}: ${JSON.stringify(bNgay?.status)} "${tb}"` });
		expect(sau, 'Giá vốn / số lượng dòng chứng từ kiểm kho đã chốt thay đổi sau khi đóng kỳ').toEqual(so.dongTruoc);
		expect(String(bNgay?.status?.code), `🔴 Lập phiếu kiểm kho lùi về tháng ${ky().mm_yyyy} đã đóng KHÔNG bị chặn (${JSON.stringify(bNgay?.status)})`).not.toBe('200');
		expect(chuan(bNgay?.status?.message || tb)).toContain(`${ky().mm_yyyy} đã chốt tồn kho`);
	});
});
