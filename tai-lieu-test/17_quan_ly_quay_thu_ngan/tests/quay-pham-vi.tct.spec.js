'use strict';

/**
 * Phân hệ 17 — phạm vi cấp trên điểm bán (vai `tct`).
 *
 * 🔴 Vai tỉnh làn 8 chỉ thấy 1 điểm bán (drawer `shopOnly` bỏ HUB) ⇒ case cần NHIỀU điểm bán / điểm
 *    bán chưa có quầy chạy vai `tct`, duyệt các tỉnh seed `AUTO*`.
 *
 * Trace 25/09/2026 (vnpost-web 8ac2c516): `CashierCounterPage.jsx` / `FundPage.jsx` — cấp xã/tỉnh/TCT
 * phải chọn điểm bán qua `SelectShopMultiple` (ô "Chọn điểm bán" mở **drawer ba cột**, 🚫 không phải
 * dropdown); chưa chọn thì nút "Thêm quầy" / "Chuyển quỹ" `disabled`. `ModalTransferFund` lấy quỹ
 * theo `shopId` đã chọn (`SelectFund shopId={effectiveShopId}`).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const q = require('./quay-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const { chuan, khung, dong } = q;
const { moDrawer, moiShop, chonShop, dong_ } = require('./chon-diem-ban');

const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

const seed = require('../../00_seed/seed-state');
const { chonTheoTen } = require('./chon-diem-ban');

/** shopId điểm bán seed của các làn khác (đọc sổ seed `seed-state.lane*.json`). */
function shopLanKhac() {
	const fs = require('node:fs');
	const dir = path.join(__dirname, '../../00_seed');
	return fs
		.readdirSync(dir)
		.filter((f) => /^seed-state\.lane\d+\.json$/.test(f))
		.map((f) => {
			try {
				return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))?.duLieu?.diemBan?.shopId;
			} catch {
				return null;
			}
		})
		.filter(Boolean);
}

/** Hai điểm bán seed của làn: `chinh` (có quầy/quỹ) và `rong` (điểm bán nhận — chưa khai quầy). */
function haiShop() {
	const d = seed.doc().duLieu || {};
	const chinh = d.diemBan && d.toChuc && { tinh: d.toChuc.tenTinh, xa: d.toChuc.tenXa, shop: d.diemBan.tenShop, shopId: d.diemBan.shopId };
	const n = d.diemBanNhan;
	const rong = n && { tinh: n.tenTinh, xa: n.tenXa, shop: n.tenShop, shopId: n.shopId };
	return { chinh, rong };
}

test.describe('17 — Quầy / quỹ: vai TCT (nhiều điểm bán)', () => {
	test.describe.configure({ timeout: 400_000 });

	test('17_010_016 — Điểm bán chưa có quầy nào thì hiện trạng thái rỗng', async ({ page }) => {
		chanNeuTat('17_010_016');
		const { rong } = haiShop();
		test.skip(!rong, `Sổ seed làn ${seed.PREFIX} không có "diemBanNhan" — điểm bán chưa khai quầy.`);
		const { st } = await q.moQuay(page, VAI, { canShop: false });
		const ds = (await q.k.goiApi(page, st, '/cashier-counter/get-all', { shopId: rong.shopId, page: 0, size: 5 })).data || [];
		test.skip(ds.length > 0, `Điểm bán ${rong.shop} đã có ${ds.length} quầy — không còn là điểm bán rỗng.`);
		const x = await chonTheoTen(page, rong, '/cashier-counter/get-all');
		expect(x.shopId).toBe(rong.shopId);
		await expect(dong(page)).toHaveCount(0);
		await expect(khung(page).locator('.ant-empty')).toBeVisible();
		const nut = khung(page).getByRole('button', { name: /Thêm quầy/ });
		await expect(nut).toBeEnabled();
		await nut.click();
		await expect(page.getByRole('dialog').getByText('Thêm quầy thu ngân')).toBeVisible();
	});

	test('17_050_003 — Chặn chuyển quỹ giữa hai điểm bán khác nhau', async ({ page }) => {
		chanNeuTat('17_050_003');
		const { chinh, rong } = haiShop();
		const { st } = await q.moQuy(page, VAI, { canShop: false });
		const quyA = (await q.k.goiApi(page, st, '/fund/get-all', { shopId: chinh.shopId, page: 0, size: 200 })).data || [];
		expect(quyA.length, `Điểm bán ${chinh.shop} không có sổ quỹ`).toBeGreaterThan(0);
		// Quỹ của các điểm bán KHÁC (điểm bán seed các làn khác) — không được lọt vào ô chọn.
		const khac = [];
		for (const id of [rong?.shopId, ...shopLanKhac()].filter((v) => v && v !== chinh.shopId)) {
			const b = await q.k.goiGhi(page, st, 'GET', '/fund/get-all', { shopId: id, page: 0, size: 50 });
			khac.push(...(b?.data || []).map((f) => ({ ...f, shopId: id })));
		}
		const x = await chonTheoTen(page, chinh, '/fund/get-all');
		expect(x.shopId).toBe(chinh.shopId);
		const box = await q.moChuyenQuy(page);
		const lay = async (nhan) => {
			const item = box.locator('.ant-form-item').filter({ has: page.locator(`label:text-is("${nhan}")`) });
			await item.locator('.ant-select').click();
			const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
			await expect.poll(() => dd.locator('.ant-select-item-option').count(), { timeout: 15_000 }).toBeGreaterThan(0);
			const t = (await dd.locator('.ant-select-item-option').allInnerTexts()).map(chuan);
			await page.keyboard.press('Escape');
			return t;
		};
		const tenA = quyA.map((f) => chuan(f.name));
		for (const nhan of ['Quỹ chuyển', 'Quỹ nhận']) {
			const t = await lay(nhan);
			expect(t.filter((n) => !tenA.includes(n)), `Ô ${nhan} có quỹ KHÔNG thuộc điểm bán "${chinh.shop}"`).toEqual([]);
		}
		// Gọi thẳng API chuyển từ quỹ của điểm bán A sang quỹ của điểm bán khác phải bị chặn.
		const dich = khac[0];
		test.skip(!dich, 'Không điểm bán nào khác có sổ quỹ để thử chuyển chéo qua API.');
		const nguon = quyA[0];
		const du = () => Promise.all([q.soDu(page, st, chinh.shopId, nguon.fundId), q.soDu(page, st, dich.shopId, dich.fundId)]);
		const truoc = await du();
		const r = await q.chuyenQuyApi(page, st, chinh.shopId, nguon.fundId, dich.fundId, 1000);
		const sau = await du();
		test.info().annotations.push({ type: 'hành vi thật', description: `BE ${JSON.stringify(r?.status)} · số dư nguồn/đích trước ${truoc} → sau ${sau}` });
		if (sau[1] !== truoc[1]) await q.chuyenQuyApi(page, st, dich.shopId, dich.fundId, nguon.fundId, 1000); // trả lại
		expect(sau, `Chuyển 1.000đ sang quỹ của điểm bán khác (shop ${dich.shopId}) làm đổi số dư: ${JSON.stringify(r?.status)}`).toEqual(truoc);
		expect(String(r?.status?.code), `BE trả "Thành công" cho lệnh chuyển chéo điểm bán mà không làm gì (số dư không đổi) — phải báo lỗi`).not.toBe('200');
	});
});
