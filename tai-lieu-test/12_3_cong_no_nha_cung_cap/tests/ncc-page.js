'use strict';

/**
 * Helper dùng chung cho hai phân hệ con của nhà cung cấp:
 * **12_2** (sản phẩm & bảng giá NCC) và **12_3** (công nợ NCC).
 *
 * 🔴 Cả hai màn 🚫 KHÔNG có route đi thẳng cố định — vào từ màn **Quản lý nhà cung cấp**
 * (`/supplier/list`) bằng nút *Sản phẩm* / *Công nợ* của dòng NCC. Sau khi bấm *Sản phẩm*, URL
 * thành `/supplier/<id>/products`.
 *
 * | Màn | Tiêu đề | API |
 * |---|---|---|
 * | Sản phẩm theo NCC | *Danh sách sản phẩm theo nhà cung cấp* | `GET /supplier-products/by-supplier?supplierId=…` |
 * | Công nợ NCC | (mở ngay trên màn danh sách) | `GET /shops/supplier-debt/history?supplierId=…&historyGroup=DEBT` |
 */

const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE_NCC = '/supplier/list';
const API_SAN_PHAM = '/supplier-products/by-supplier';
const API_CONG_NO = '/shops/supplier-debt/history';

const khung = (page) => page.locator('.ant-pro-page-container, main').first();
const hop = (page) => page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();
const vung = async (page) => ((await hop(page).count()) ? hop(page) : khung(page));
const dong = (box) => box.locator('.ant-table-tbody tr.ant-table-row');
const cot = (box) => box.locator('.ant-table-thead th');

async function moDanhSachNCC(page, vai) {
	const cho = page.waitForResponse(
		(r) => r.url().includes('/chain-supplier') && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE_NCC, vai);
	await cho.catch(() => null);
	await page.waitForTimeout(2_500);
}

/** Bấm nút *Sản phẩm* hoặc *Công nợ* rồi chờ đúng API. Trả về `{ box, res }`. */
async function moTheoNut(page, nhanNut, apiPhan) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(apiPhan) && r.status() !== 401,
		{ timeout: 60_000 },
	);
	await khung(page).getByRole('button', { name: nhanNut, exact: true }).first().click({ force: true });
	const res = await cho.catch(() => null);
	await page.waitForTimeout(3_000);
	return { box: await vung(page), res };
}

async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/*', async (route) => {
		const req = route.request();
		if (req.method() === 'GET') return route.continue();
		if (!/supplier|debt/i.test(req.url())) return route.continue();
		daGoi.push(`${req.method()} ${req.url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

function boQua(test, lyDo) {
	test.skip(true, lyDo);
}

module.exports = {
	API_CONG_NO,
	API_SAN_PHAM,
	ROUTE_NCC,
	boQua,
	chanGhi,
	chuan,
	cot,
	dong,
	khung,
	moDanhSachNCC,
	moTheoNut,
	vung,
};
