'use strict';

/**
 * Bước 9 — KHO THỨ HAI cho điểm bán seed (để chuyển kho nội bộ, phân hệ 04_3 · 060).
 *
 * 🔴 Vì sao cần: màn Chuyển kho (`/inventory/transfer-warehouse`) ở vai Cửa hàng trưởng chỉ cho
 *    chọn "Kho nhận" là các kho CỦA CHÍNH điểm bán; điểm bán seed mới có 1 kho (tự sinh lúc tạo
 *    điểm bán) ⇒ không lập được phiếu chuyển kho nào.
 * Tạo qua màn "Quản lý kho" (`/inventory/warehouses` → "Thêm kho"), vai `shop`.
 * 🔴 CHẠY LẺ BẮT BUỘC `--no-deps`: project `shop` của 00_seed phụ thuộc `tct` ⇒ thiếu cờ là chạy lại
 *    TOÀN BỘ bước 1–7 bằng giao diện, đẻ bộ dữ liệu `<PREFIX>…_<runId>` mới và GHI ĐÈ sổ seed (đã mắc
 *    23/09/2026 ở làn 8). Lệnh đúng:
 *    `VNPOST_LANE=8 VNPOST_SETUP_ROLES=shop npx playwright test --config tai-lieu-test/00_seed/playwright.config.js --project=shop --no-deps tests/09-kho-phu`
 * Idempotent: đã có kho tên `<PREFIX>KHO2` thì chỉ ghi sổ, 🚫 không tạo thêm (màn không có xoá kho).
 */

const { test, expect } = require('@playwright/test');
const { ghi, lay, PREFIX } = require('../seed-state');
const { moTrang } = require('../../shared/auth/login');

const TEN_KHO = `${PREFIX}KHO2`;
const HEADER_API = ['authorization', 'appid', 'chainid', 'shopid', 'orgunitcode', 'orgunittype'];

test('seed 9 — kho thứ hai của điểm bán seed', async ({ page }) => {
	test.setTimeout(180_000);
	const shopId = lay('diemBan', 'shopId');
	let hd = null;
	page.on('request', (r) => {
		const h = r.headers();
		if (r.url().includes('/__api/') && h.authorization) hd = Object.fromEntries(HEADER_API.filter((k) => h[k]).map((k) => [k, h[k]]));
	});
	const dsKho = async () => {
		const r = await page.request.get(`${process.env.VNPOST_BASE_URL}/__api/shops/${shopId}/inventory`, { headers: hd });
		const b = await r.json();
		expect(String(b?.status?.code)).toBe('200');
		return b.data || [];
	};

	await moTrang(page, `${process.env.VNPOST_BASE_URL}/inventory/warehouses`, 'shop');
	await expect(page.getByRole('button', { name: /Thêm kho/ })).toBeVisible({ timeout: 60_000 });
	let kho = (await dsKho()).find((x) => x.name === TEN_KHO);
	if (!kho) {
		const chinh = (await dsKho()).find((x) => x.isDefault) || (await dsKho())[0];
		await page.getByRole('button', { name: /Thêm kho/ }).click();
		const md = page.locator('.ant-drawer-open, .ant-modal-wrap').filter({ hasText: 'Thêm kho hàng' }).last();
		await expect(md).toBeVisible();
		await md.locator('#name').fill(TEN_KHO);
		await md.locator('#phone').fill(chinh?.phone || '0900000000');
		await md.locator('#address').fill('AUTO TEST - khong su dung');
		for (const [id, ten] of [['province', chinh?.provinceName], ['ward', chinh?.wardName]]) {
			if (!ten) continue;
			await md.locator(`#${id}`).click();
			await md.locator(`#${id}`).fill(ten);
			const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
			await dd.locator('.ant-select-item-option', { hasText: ten }).first().click();
		}
		const cho = page.waitForResponse((r) => /inventor/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
		await md.getByRole('button', { name: 'Xác nhận' }).click();
		const b = await (await cho).json();
		expect(String(b?.status?.code), `Tạo kho lỗi: ${b?.status?.message}`).toBe('200');
		kho = (await dsKho()).find((x) => x.name === TEN_KHO);
	}
	expect(kho, `Không thấy kho ${TEN_KHO} sau khi tạo`).toBeTruthy();
	ghi('khoPhu', { id: kho.id, ten: kho.name });
});
