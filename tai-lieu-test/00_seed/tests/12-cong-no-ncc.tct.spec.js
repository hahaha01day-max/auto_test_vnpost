'use strict';

/**
 * Bước 12 — CÔNG NỢ NCC ban đầu cho `AUTO8_NCC` tại điểm bán seed (tiền đề 12_3).
 *
 * `AUTO8_NCC` chưa có giao dịch nào ⇒ không có dòng trên màn Công nợ NCC, mọi case thanh toán skip.
 * Màn chi tiết công nợ chỉ còn nút "Thanh toán" (Ghi nợ / Gạch nợ không có lối vào — đo 24/09) ⇒ dựng nợ
 * bằng "Điều chỉnh công nợ" → Tăng số phải trả NCC 1.000.000 đ → Nộp duyệt → Duyệt.
 * 🔴 Đơn vị ghi nhận = "Tổng công ty" (đơn vị của vai tct), 🚫 điểm bán seed: đo 24/09 chứng từ lập ở điểm bán seed
 *    (pod khác) KHÔNG ai duyệt/từ chối được — TCT/tỉnh gọi approve ra 404 "Thực thể không tồn tại", CHT/GDV 401.
 * Nguồn (vnpost-web af8cda07): `features/supplierDebt/pages/{ShopDebtSupplierPage,DrawerDebtAdjustment}.jsx`.
 * 🔴 Chứng từ đã duyệt KHÔNG xoá được — chạy một lần, sổ seed ghi `congNoNcc.daDuyet`.
 * 🔴 Chạy lẻ phải `--no-deps`.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { doc, ghi, PREFIX } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

const SO_TIEN = 1_000_000;

async function thongBao(page, fn) {
	const tb = page.locator('.ant-message-notice').first().waitFor({ timeout: 20_000 }).then(() => page.locator('.ant-message-notice').allInnerTexts()).catch(() => []);
	await fn();
	return (await tb).join(' | ');
}

async function chonO(page, dr, nhan, chu) {
	const o = dr.locator('.ant-form-item').filter({ has: page.locator(`label[title="${nhan}"]`) }).locator('.ant-select').first();
	await o.click();
	if (chu) await o.locator('input').fill(chu).catch(() => {});
	const muc = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
	await expect(muc.first(), `Ô "${nhan}" không có lựa chọn`).toBeVisible({ timeout: 20_000 });
	// Option bị nhãn ô bên dưới che (intercepts pointer) ⇒ `dispatchEvent('click')` thẳng vào ĐÚNG mục.
	//    🚫 Enter: Select không showSearch thì Enter chọn MỤC ĐẦU (đã lập nhầm "Chiết khấu thanh toán");
	//    ô NCC có showSearch nhưng Enter không nhận.
	await (chu ? muc.filter({ hasText: chu }).first() : muc.first()).dispatchEvent('click');
	if (chu) await expect(o, `Ô "${nhan}" không nhận "${chu}"`).toContainText(chu);
}

test('seed 12.1 — lập + nộp duyệt điều chỉnh tăng công nợ AUTO8_NCC', async ({ page }) => {
	test.skip(Boolean(doc().duLieu?.congNoNcc?.maChungTu), 'Sổ seed đã có chứng từ điều chỉnh — 🚫 không lập lại.');
	const d = doc().duLieu;
	await moTrang(page, '/debt-reconciliation/supplier-debt', 'tct');
	await page.getByRole('tab', { name: /điều chỉnh/i }).click();
	await page.getByRole('button', { name: 'Điều chỉnh công nợ' }).click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Điều chỉnh công nợ nhà cung cấp' }).last();
	await expect(dr).toBeVisible();
	// Đơn vị ghi nhận: bộ chọn 3 cột (xem SelectShopMultiple) — mở rồi chọn điểm bán seed.
	await dr.locator('.ant-select').filter({ hasText: 'Chọn điểm bán / kho' }).click();
	const bo = page.locator('.ant-drawer-open').filter({ hasText: 'Chọn Điểm bán / Kho' }).last();
	const cot = (i) => bo.locator('.sp-column').nth(i);
	// Danh sách dài ⇒ gõ ô tìm của từng cột rồi mới bấm.
	await cot(0).getByText('Tổng công ty', { exact: true }).click();
	// Cột 3 (kho của cấp Tổng công ty): chọn mục đầu ở tab Kho.
	await cot(2).getByText('Kho', { exact: true }).click().catch(() => {});
	await cot(2).locator('.sp-item').first().click();
	await bo.getByRole('button', { name: 'Xác nhận' }).click();
	await expect(bo).toBeHidden();
	await chonO(page, dr, 'Nhà cung cấp', d.nhaCungCap.tenNcc);
	await chonO(page, dr, 'Lý do điều chỉnh', 'Chênh lệch giá');
	const loai = dr.locator('.ant-form-item').filter({ has: page.locator('label[title="Khoản này thuộc loại nào?"]') });
	if (await loai.count()) await chonO(page, dr, 'Khoản này thuộc loại nào?');
	const chieu = dr.locator('.ant-form-item').filter({ has: page.locator('label[title="Chiều điều chỉnh"]') });
	if (await chieu.count()) await chieu.getByText('Tăng số phải trả NCC', { exact: true }).click();
	await dr.locator('.ant-form-item').filter({ has: page.locator('label[title="Số tiền (sau VAT)"]') }).locator('input').fill(String(SO_TIEN));
	await dr.getByPlaceholder('VD: BB-2026/07-001').fill(`${PREFIX}BB_CONGNO`);
	const cho = page.waitForResponse((r) => /supplier-debt\/adjustment/.test(r.url()) && r.request().method() === 'POST', { timeout: 30_000 });
	const tb = await thongBao(page, () => dr.getByRole('button', { name: 'Nộp duyệt' }).click());
	const res = await cho;
	const body = await res.json().catch(() => ({}));
	test.info().annotations.push({ type: 'đo', description: `${tb} · ${res.request().postData()?.slice(0, 400)}` });
	expect(String(body?.status?.code), `Lập điều chỉnh lỗi: ${body?.status?.message ?? tb}`).toBe('200');
	ghi('congNoNcc', { maChungTu: body?.data?.code || body?.data?.id || `${PREFIX}BB_CONGNO`, soTien: SO_TIEN, daDuyet: false });
});

test('seed 12.2 — duyệt điều chỉnh công nợ', async ({ page }) => {
	test.skip(Boolean(doc().duLieu?.congNoNcc?.daDuyet), 'Đã duyệt.');
	// 🔴 Chế độ 4 mắt: "Người lập chứng từ không được tự duyệt" ⇒ duyệt bằng Kế toán TCT (`tct_ke_toan`).
	await moTrang(page, '/debt-reconciliation/supplier-debt', 'tct_ke_toan');
	await page.getByRole('tab', { name: /điều chỉnh/i }).click();
	const dong = page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: doc().duLieu.congNoNcc.maChungTu }).first();
	await expect(dong, 'Không thấy chứng từ điều chỉnh vừa nộp').toBeVisible({ timeout: 20_000 });
	test.info().annotations.push({ type: 'đo', description: `thao tác: ${(await dong.getByRole('button').allInnerTexts()).join(' | ')}` });
	await dong.getByRole('button', { name: /Duyệt/ }).first().click();
	const hop = page.locator('.ant-popover:visible, .ant-modal-confirm, .ant-modal-wrap:visible').last();
	const cho = page.waitForResponse((r) => /adjustment\/.+\/approve/.test(r.url()), { timeout: 30_000 });
	await hop.locator('.ant-btn-primary').last().click();
	const res = await cho;
	const body = await res.json().catch(() => ({}));
	expect(String(body?.status?.code), `Duyệt lỗi: ${body?.status?.message}`).toBe('200');
	ghi('congNoNcc', { daDuyet: true });
});
