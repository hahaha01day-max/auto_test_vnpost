'use strict';

/**
 * 04_3 · 040 — Huỷ phiếu nhập kho (lập chứng từ đảo), vai `shop`, điểm bán seed của làn.
 *
 * Nguồn (vnpost-web af8cda07, `DrawerDetailImportReceipt.jsx`):
 * - Nút "Huỷ phiếu" chỉ hiện với phiếu nhập đã ghi sổ, bật khi `GET /stock/v2/import-export/<id>/adjustable`
 *   trả `adjustable=true` (tooltip liệt kê `blockers`).
 * - `modal.confirm` tiêu đề "Huỷ phiếu nhập kho", nút "Lập chứng từ" / "Đóng", ô "Lý do điều chỉnh *".
 *   Bỏ trống lý do ⇒ `message.error("Vui lòng nhập lý do")`, modal giữ nguyên.
 * - Xác nhận ⇒ `POST /stock/v2/import-export/<id>/adjustment` `{ reason }`; phiếu gốc mang
 *   `adjustedByStockInOutId`, tiêu đề drawer có nhãn "Đã huỷ (chứng từ đảo)" (tooltip = lý do).
 *
 * Phiếu dùng: phiếu nhập đã duyệt bất kỳ của điểm bán seed mà `/adjustable` cho huỷ.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const k = require('./ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const LY_DO = 'AUTO test 04_3_040 huy phieu';
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};

async function moMan(page) {
	const { shopId } = k.duLieuSeed();
	const st = k.batHeader(page);
	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/import`, VAI);
	await expect(page.locator('.ant-table-tbody tr.ant-table-row').first()).toBeVisible({ timeout: 60_000 });
	const ds = await k.goiApi(page, st, '/stock/v2/import-export/find', {
		shopId, type: 'IMPORT', page: 0, size: 50, sort: 'actionTime,DESC',
	});
	return { shopId, st, ds: ds.data || [] };
}

/**
 * Phiếu nhập đã duyệt còn huỷ được (hỏi `/adjustable`). 🔴 BE chỉ cho huỷ phiếu nhập **từ NCC**
 * (blocker `NOT_SUPPLIER_IMPORT`) — mà điểm bán không lập tay được phiếu nhập NCC (form không có
 * "Nhập từ"), nên nguồn duy nhất là phiếu nhập từ đơn đặt hàng NCC (PO) của điểm bán seed.
 * Trả về { phieu } hoặc { lyDo } để skip kèm lý do đo được.
 */
async function timPhieuHuyDuoc(page, ctx) {
	const ung = ctx.ds.filter((x) => x.status !== 'DRAFT' && !x.adjustedByStockInOutId && x.subType === 'IMPORT');
	const chan = new Set();
	for (const p of ung) {
		const a = await k.goiApi(page, ctx.st, `/stock/v2/import-export/${p.stockInOutId}/adjustable`, { shopId: ctx.shopId });
		if (a.data?.adjustable) return { phieu: p };
		for (const b of a.data?.blockers || []) chan.add(`${b.code}: ${b.message}`);
	}
	return {
		lyDo: `Không có phiếu nhập đã duyệt nào huỷ được ở điểm bán seed (${ung.length} phiếu, bị chặn: ${[...chan].join(' · ') || '—'}). Cần phiếu nhập từ NCC (qua đơn đặt hàng NCC).`,
	};
}

async function moChiTiet(page, code) {
	const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: code }).first();
	await expect(dong, `Phiếu ${code} không ở trang đầu danh sách`).toBeVisible();
	await dong.getByText(code).click();
	const ct = page.locator('.ant-drawer-open').filter({ hasText: 'Chi tiết phiếu nhập kho' }).last();
	await expect(ct).toBeVisible();
	return ct;
}

async function moHopThoaiHuy(page, ct) {
	const nut = ct.getByRole('button', { name: 'Huỷ phiếu' });
	await expect(nut, 'Nút "Huỷ phiếu" không bật').toBeEnabled({ timeout: 20_000 });
	await nut.click();
	const md = page.locator('.ant-modal-confirm').filter({ hasText: 'Huỷ phiếu nhập kho' }).last();
	await expect(md).toBeVisible();
	return md;
}

test.describe('04_3 · 040 — Huỷ phiếu nhập kho (điểm bán seed)', () => {
	test.describe.configure({ timeout: 240_000 });

	test('04_3_040_001 — Hộp thoại Huỷ phiếu nhập kho hiển thị đúng', async ({ page }) => {
		chanNeuTat('04_3_040_001');
		const ctx = await moMan(page);
		const { phieu: p, lyDo } = await timPhieuHuyDuoc(page, ctx);
		test.skip(!p, lyDo);
		const md = await moHopThoaiHuy(page, await moChiTiet(page, p.code));
		const chu = k.chuan(await md.innerText());
		expect(chu).toContain('Huỷ phiếu nhập kho');
		expect(chu, 'Thiếu câu cảnh báo hệ quả').toContain('Hệ thống sẽ lập một chứng từ điều chỉnh (bút toán đảo) trừ ngược toàn bộ số lượng đã nhập');
		expect(chu).toContain('Thao tác không thể hoàn tác');
		await expect(md.getByPlaceholder('Nhập lý do lập chứng từ điều chỉnh...'), 'Thiếu ô nhập lý do').toBeVisible();
		await expect(md.getByRole('button', { name: 'Lập chứng từ' })).toBeVisible();
		await md.getByRole('button', { name: 'Đóng' }).click();
		await expect(md).toBeHidden();
	});

	test('04_3_040_004 — Không nhập lý do huỷ thì bị chặn', async ({ page }) => {
		chanNeuTat('04_3_040_004');
		const ctx = await moMan(page);
		const { phieu: p, lyDo } = await timPhieuHuyDuoc(page, ctx);
		test.skip(!p, lyDo);
		const ct = await moChiTiet(page, p.code);
		const truoc = await k.chiTietPhieu(page, ctx.st, ctx.shopId, p.stockInOutId);
		const it = truoc.items[0];
		const ton = await k.tonVariant(page, ctx.st, ctx.shopId, it.productId, it.variantId);
		const daGoi = [];
		page.on('request', (r) => { if (r.url().includes('/adjustment') && r.method() === 'POST') daGoi.push(r.url()); });

		const md = await moHopThoaiHuy(page, ct);
		const thongBao = page.locator('.ant-message-notice').filter({ hasText: 'Vui lòng nhập lý do' }).first()
			.waitFor({ state: 'attached', timeout: 10_000 }).then(() => true, () => false);
		await md.getByRole('button', { name: 'Lập chứng từ' }).click();
		expect(await thongBao, 'Không có thông báo "Vui lòng nhập lý do"').toBe(true);
		await expect(md, 'Hộp thoại đóng dù chưa nhập lý do').toBeVisible();
		expect(daGoi, 'Vẫn gửi request huỷ khi bỏ trống lý do').toEqual([]);
		await md.getByRole('button', { name: 'Đóng' }).click();

		const sau = await k.chiTietPhieu(page, ctx.st, ctx.shopId, p.stockInOutId);
		expect(sau.adjustedByStockInOutId, 'Phiếu bị huỷ dù chưa nhập lý do').toBeFalsy();
		expect(await k.tonVariant(page, ctx.st, ctx.shopId, it.productId, it.variantId)).toBe(ton);
	});

	test('04_3_040_002 — Lập chứng từ huỷ phiếu nhập kho', async ({ page }) => {
		chanNeuTat('04_3_040_002');
		const ctx = await moMan(page);
		const { phieu: p, lyDo } = await timPhieuHuyDuoc(page, ctx);
		test.skip(!p, lyDo);
		const ct = await moChiTiet(page, p.code);
		const truoc = await k.chiTietPhieu(page, ctx.st, ctx.shopId, p.stockInOutId);
		expect(truoc.items?.length).toBeGreaterThan(0);
		const ton = {};
		for (const it of truoc.items) ton[it.variantId] = await k.tonVariant(page, ctx.st, ctx.shopId, it.productId, it.variantId);

		const md = await moHopThoaiHuy(page, ct);
		await md.getByPlaceholder('Nhập lý do lập chứng từ điều chỉnh...').fill(LY_DO);
		const thanhCong = page.locator('.ant-message-notice').filter({ hasText: 'Đã lập chứng từ điều chỉnh' }).first()
			.waitFor({ state: 'attached', timeout: 30_000 }).then(() => true, () => false);
		const { body } = await k.bamVaCho(page, md.getByRole('button', { name: 'Lập chứng từ' }), `/${p.stockInOutId}/adjustment`);
		expect(String(body?.status?.code), `Huỷ phiếu lỗi: ${body?.status?.message}`).toBe('200');
		expect(await thanhCong, 'Không có thông báo "Đã lập chứng từ điều chỉnh …"').toBe(true);

		const sau = await k.chiTietPhieu(page, ctx.st, ctx.shopId, p.stockInOutId);
		expect(sau.adjustedByStockInOutId, 'Phiếu gốc không mang dấu đã huỷ (adjustedByStockInOutId)').toBeTruthy();
		for (const it of truoc.items) {
			const sl = Number(it.quantity) * Number(it.convertToMainUnit || 1);
			expect(await k.tonVariant(page, ctx.st, ctx.shopId, it.productId, it.variantId), `Tồn ${it.sku} không giảm đúng ${sl}`).toBe(ton[it.variantId] - sl);
		}
		// Chứng từ đảo nằm ở danh sách phiếu xuất, loại "Điều chỉnh phiếu nhập".
		const ds = await k.goiApi(page, ctx.st, '/stock/v2/import-export/find', {
			shopId: ctx.shopId, type: 'EXPORT', page: 0, size: 50, sort: 'actionTime,DESC',
		});
		const dao = (ds.data || []).find((x) => x.stockInOutId === sau.adjustedByStockInOutId);
		expect(dao, 'Không thấy chứng từ đảo trong danh sách phiếu xuất').toBeTruthy();
		expect(dao.subType, 'Chứng từ đảo không phải loại Điều chỉnh phiếu nhập').toBe('IMPORT_ADJUSTMENT');
	});

	test('04_3_040_003 — Chi tiết phiếu đã huỷ mang nhãn chứng từ đảo', async ({ page }) => {
		chanNeuTat('04_3_040_003');
		const ctx = await moMan(page);
		const p = ctx.ds.find((x) => x.adjustedByStockInOutId);
		test.skip(!p, 'Chưa có phiếu nhập nào đã huỷ ở điểm bán seed — chạy 04_3_040_002 trước (cần phiếu nhập từ NCC).');
		const ct = await moChiTiet(page, p.code);
		const tag = ct.locator('.ant-drawer-title .ant-tag', { hasText: 'Đã huỷ (chứng từ đảo)' });
		await expect(tag, 'Thiếu nhãn "Đã huỷ (chứng từ đảo)"').toBeVisible();
		await tag.hover();
		const ct2 = await k.chiTietPhieu(page, ctx.st, ctx.shopId, p.stockInOutId);
		await expect(page.locator('.ant-tooltip:visible').last(), 'Tooltip nhãn không hiện lý do huỷ').toContainText(ct2.adjustmentReason || LY_DO);
		expect(ct2.adjustedByStockInOutId, 'Phiếu không tham chiếu chứng từ đảo').toBeTruthy();
		expect(ct2.items?.length, 'Dòng sản phẩm của phiếu đã huỷ bị xoá').toBeGreaterThan(0);
		await expect(ct.locator('.ant-table-tbody tr.ant-table-row').first(), 'Bảng sản phẩm không còn dòng').toBeVisible();
		// Tham chiếu chứng từ đảo trên màn: mã chứng từ đảo phải hiện ở đâu đó trong drawer.
		const dao = await k.chiTietPhieu(page, ctx.st, ctx.shopId, ct2.adjustedByStockInOutId);
		expect.soft(k.chuan(await ct.innerText()), `Drawer không hiện mã chứng từ đảo ${dao.code}`).toContain(dao.code);
	});
});
