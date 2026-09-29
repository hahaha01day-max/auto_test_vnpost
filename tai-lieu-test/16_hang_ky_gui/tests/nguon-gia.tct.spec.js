'use strict';

/**
 * 16_030_007 — Hai nhãn "Nguồn giá" có hệ quả khác hẳn nhau: ĐỎ "Chưa có giá — chặn chốt kỳ" thật sự chặn chốt;
 * VÀNG "Không rõ nguồn giá" chỉ cảnh báo, vẫn chốt được. Vai `tct`.
 *
 * Tiền đề: seed bước 18 (`00_seed/api-tests/18-ky-gui.api.spec.js`, sổ `duLieu.kyGui`) — hai NCC RIÊNG của làn,
 * mỗi NCC một kỳ hiện hành, mỗi kỳ đúng MỘT dòng nhập (kho TCT, pod của biên bản TCT — xem B15 `_VUONG_MAC.md`):
 *   `kyDoiSoat.KG3` — `SP_KG_CG`, phiếu nhập không mang giá ⇒ đơn giá đóng dấu 0, nguồn trống.
 *   `kyDoiSoat.KG4` — `SP_KG_KNG`, phiếu nhập mang giá 50.000 ⇒ có giá, nguồn trống.
 * 🔴 GHI MỘT CHIỀU: case CHỐT THẬT hai kỳ đó (kỳ của NCC riêng làn — 🚫 đụng kỳ thật của chuỗi). Kỳ đã khoá thì lần
 *    chạy sau đọc lại kết quả chốt cũ (khoá được = đã chốt, `status LOCKED`), 🚫 chốt lại.
 *
 * Trace vnpost-web f9c5c858: `features/consignmentRecon/pages/ConsignmentReconDetailPage.jsx:167-181` — nhãn ĐỎ khi
 * `unitPrice == null`, VÀNG khi có giá mà thiếu `priceSource`; nút "Chốt kỳ" → hộp "Chốt kỳ đối soát?" → "Chốt kỳ" =
 * `POST /consignment-recon/periods/{id}/lock`. BE `ReconSnapshotService:249-260` chặn chốt khi đơn giá `null` HOẶC `≤ 0`.
 * 🔴 Đo 28/09: qua giao diện/API 🚫 tạo được dòng đơn giá `null` — bỏ trống giá, BE lưu 0 ⇒ dòng giá 0 hiện nhãn VÀNG
 *    nhưng BỊ CHẶN chốt. Assertion giữ theo kịch bản (nhãn phải báo đúng hệ quả).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { moTrang } = require('../../shared/auth/login');
const seed = require('../../00_seed/seed-state');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';
const ROUTE = '/debt-reconciliation/consignment-recon';
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container').first();
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description).slice(0, 900) });
const nutChot = (page) => khung(page).locator('.ant-page-header-heading-extra button').first();

/** Mở chi tiết kỳ ở thẻ "Nhập trong kỳ", trả { nhan, lop, gia } của dòng `sku` + trạng thái nút chốt. */
async function docKy(page, kyId, sku) {
	const st = k.batHeader(page);
	const cho = page.waitForResponse((r) => r.url().includes(`/consignment-recon/periods/${kyId}/summary`), { timeout: 60_000 });
	await moTrang(page, `${ROUTE}/${kyId}?tab=import`, VAI);
	const sum = await (await cho).json();
	await expect(khung(page).locator('.ant-spin-spinning')).toHaveCount(0, { timeout: 20_000 });
	const pane = khung(page).locator('.ant-tabs-tabpane-active');
	// 🔴 Giữ cả ô tiêu đề trống — lọc đi là lệch chỉ số với ô dữ liệu.
	const cot = (await pane.locator('.ant-table-thead tr').last().locator('th').allInnerTexts()).map(chuan);
	const dong = pane.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: sku }).first();
	await expect(dong, `Kỳ ${kyId} không có dòng ${sku} ở thẻ Nhập trong kỳ`).toBeVisible({ timeout: 20_000 });
	const o = dong.locator('td').nth(cot.indexOf('Nguồn giá'));
	const r = (sum?.data?.nhap || []).find((x) => x.sku === sku) || {};
	return {
		st, sum: sum?.data, nhan: chuan(await o.innerText()), lop: (await o.locator('.ant-tag').getAttribute('class').catch(() => '')) || '',
		gia: r.unitPrice, nguon: r.priceSource, nut: chuan(await nutChot(page).innerText()),
	};
}

/** Bấm Chốt kỳ → xác nhận; trả { http, body, tb } của POST lock. Kỳ đã khoá ⇒ null. */
async function chot(page, kyId) {
	if (!/^Chốt kỳ$/.test(chuan(await nutChot(page).innerText()))) return null;
	await nutChot(page).click();
	const hop = page.getByRole('dialog').filter({ hasText: 'Chốt kỳ đối soát?' });
	await expect(hop).toBeVisible({ timeout: 10_000 });
	const cho = page.waitForResponse((r) => r.url().includes(`/consignment-recon/periods/${kyId}/lock`) && r.request().method() === 'POST', { timeout: 60_000 });
	await hop.getByRole('button', { name: 'Chốt kỳ' }).click();
	const r = await cho;
	await page.locator('.ant-message-notice').first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => null);
	return { http: r.status(), body: await r.json().catch(() => null), tb: chuan((await page.locator('.ant-message-notice').allInnerTexts()).join(' | ')) };
}

test('16_030_007 — Hai nhãn Nguồn giá có hệ quả khác hẳn nhau', async ({ page }) => {
	const i = loadCaseInput(GOC, '16_030_007');
	test.skip(Boolean(skipReason(i)), skipReason(i) ?? '');
	test.setTimeout(300_000);
	const kg = seed.doc().duLieu?.kyGui;
	test.skip(!kg?.kyDoiSoat?.KG3?.hienHanh || !kg?.tonKhoTct, 'Chưa chạy seed bước 18 (tới 18.10) cho làn này: VNPOST_LANE=<làn> node tool/bin/seed.js --api --buoc=18');
	const ca = [
		{ ten: 'khongRoNguon', ky: kg.kyDoiSoat.KG4.hienHanh.id, sp: kg.sanPham.khongRoNguon },
		{ ten: 'chuaCoGia', ky: kg.kyDoiSoat.KG3.hienHanh.id, sp: kg.sanPham.chuaCoGia },
	];
	const kq = {};
	for (const c of ca) {
		const truoc = await docKy(page, c.ky, c.sp.sku);
		const lock = await chot(page, c.ky);
		const detail = await k.goiApi(page, truoc.st, `/consignment-recon/periods/${c.ky}`, {}).catch(() => null);
		kq[c.ten] = { ky: c.ky, sku: c.sp.sku, gia: truoc.gia, nguon: truoc.nguon, nhan: truoc.nhan, lop: truoc.lop, nutTruoc: truoc.nut,
			lock: lock ? { http: lock.http, code: lock.body?.status?.code, msg: lock.body?.status?.message, tb: lock.tb } : '(kỳ đã khoá từ lượt trước)',
			statusSau: detail?.data?.status };
		ghiChu(c.ten, JSON.stringify(kq[c.ten]));
	}
	const kng = kq.khongRoNguon;
	const cg = kq.chuaCoGia;
	// Nhãn VÀNG: có giá, thiếu nguồn ⇒ chỉ cảnh báo, CHỐT ĐƯỢC.
	expect.soft(kng.nhan, 'Dòng có giá mà thiếu nguồn không mang nhãn vàng').toBe('Không rõ nguồn giá');
	expect.soft(kng.lop, 'Nhãn "Không rõ nguồn giá" không phải màu vàng').toMatch(/ant-tag-(warning|gold)/);
	expect.soft(kng.statusSau, `Kỳ chỉ có dòng nhãn vàng mà KHÔNG chốt được: ${JSON.stringify(kng.lock)}`).toBe('LOCKED');
	// Dòng THỰC SỰ bị chặn chốt (đơn giá 0) ⇒ phải mang nhãn ĐỎ.
	expect.soft(cg.statusSau, `Kỳ có dòng đơn giá ${cg.gia} lại CHỐT ĐƯỢC`).not.toBe('LOCKED');
	expect.soft(cg.nhan, `Dòng bị CHẶN chốt kỳ (đơn giá ${cg.gia}) lại hiện nhãn "${cg.nhan}" — người dùng tưởng vẫn chốt được`).toBe('Chưa có giá — chặn chốt kỳ');
	expect.soft(cg.lop).toMatch(/ant-tag-(error|red)/);
});
