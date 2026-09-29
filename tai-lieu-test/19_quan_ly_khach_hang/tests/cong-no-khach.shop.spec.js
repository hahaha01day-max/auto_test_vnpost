'use strict';

/**
 * 19 · Hồ sơ / đơn hàng / ví điểm / công nợ của khách CÓ NỢ — vai `shop` (CHT điểm bán của làn).
 *
 * Tiền đề: `tien-de.gdv.spec.js` (`VNPOST_TIEN_DE=1 … -g "tien de 19"`) ⇒ sổ `test-output/tien-de.lane<làn>.json`
 * có `khNo` = khách rác với 1 đơn "Thanh toán sau" (2 × SP giá tiêu chuẩn).
 *
 * Trace `pages/customer/customerDebt/*` (25/09/2026):
 * - Tab "Công nợ khách hàng" chỉ còn nút **"Thanh toán"** — "Ghi nợ" / "Gạch nợ" bị comment (`CustomerDebt.jsx:325-339`).
 * - Drawer thanh toán: gõ "Số tiền thanh toán" là FE tự phân bổ vào các đơn còn nợ (đơn cũ trước).
 *   Số tiền 0 ⇒ `message.warning("Số tiền phải lớn hơn 0")` (câu "Vui lòng nhập số tiền thanh toán lớn hơn 0" là của GẠCH NỢ).
 * - Mọi thao tác đi `POST /shops/{shopId}/customer/create-debt` (`type` PAYMENT / DEBT / WRITE_OFF).
 *
 * 🔴 090_001 GHI THẬT: thu 50.000đ ⇒ sinh phiếu thu "Thu hồi nợ" trong sổ quỹ của điểm bán rác.
 * 🔴 Thứ tự case có chủ ý (1 worker): 090_001 trước 060_002 (đơn trả một phần), 050_003 (thử xoá) CUỐI CÙNG.
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, khung, moMan } = require('./customer-page');
const g = require('./khach-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const SO = path.join(GOC, 'test-output', `tien-de.lane${g.LAN}.json`);
const THU = 50_000;
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });
const so = (t) => Number(String(t ?? '').replace(/[^\d-]/g, '')) || 0;

function khNo() {
	const kh = fs.existsSync(SO) ? JSON.parse(fs.readFileSync(SO, 'utf8')).khNo : null;
	test.skip(!kh, `Chưa có tiền đề khách nợ — chạy: VNPOST_TIEN_DE=1 VNPOST_LANE=${g.LAN} … -g "tien de 19"`);
	return kh;
}

async function moThe(page, nhan) {
	const the = khung(page).locator('.ant-tabs-tab', { hasText: nhan }).first();
	await expect(the, `Chi tiết khách không có tab "${nhan}"`).toBeVisible({ timeout: 15_000 });
	await the.locator('.ant-tabs-tab-btn').dispatchEvent('click'); // 🔴 antd v6: click trần không đổi tab
	await page.waitForTimeout(3_000);
}

/** Giá trị cạnh nhãn (Descriptions / khối "Thông tin cửa hàng"): `Tiền phát sinh : 200.000 đ`. */
async function giaTri(page, nhan) {
	const chu = chuan(await khung(page).innerText());
	const m = chu.match(new RegExp(`${nhan}\\s*:?\\s*(-?[\\d.,]+)\\s*đ`));
	return m ? so(m[1]) : null;
}

const bangThe = (page) => khung(page).locator('.ant-tabs-tabpane-active .ant-table-tbody tr.ant-table-row');

let st;

test.describe('19 · Công nợ / hồ sơ khách có nợ (vai shop)', () => {
	test.beforeEach(async ({ page }) => {
		st = g.k.batHeader(page);
		await moMan(page, VAI);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	});

	test('19_040_001 — Hồ sơ khách hiện ba con số tổng hợp', async ({ page }) => {
		chanNeuTat('19_040_001');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		const ps = await giaTri(page, 'Tiền phát sinh');
		const tt = await giaTri(page, 'Đã thanh toán');
		const no = await giaTri(page, 'Còn nợ');
		ghiChu('đo', `phát sinh ${ps} · đã thanh toán ${tt} · còn nợ ${no}`);
		expect(ps, 'Không đọc được "Tiền phát sinh"').not.toBeNull();
		expect(ps, 'Khách có đơn thanh toán sau mà Tiền phát sinh = 0').toBeGreaterThan(0);
		expect(tt, 'Không đọc được "Đã thanh toán"').not.toBeNull();
		expect(no, 'Không đọc được "Còn nợ"').not.toBeNull();
		expect(no, 'Còn nợ ≠ Tiền phát sinh − Đã thanh toán').toBe(ps - tt);
	});

	test('19_040_002 — Trường chưa khai hiển thị dấu hiệu rõ ràng', async ({ page }) => {
		chanNeuTat('19_040_002');
		const kh = khNo(); // khách rác chỉ khai tên / mã / SĐT
		await g.moChiTiet(page, kh.ma);
		const hang = await khung(page).locator('.ant-tabs-tabpane-active').first().evaluate((goc) =>
			[...goc.querySelectorAll('.ant-descriptions-item, .ant-row, li, tr')]
				.map((e) => e.innerText.replace(/\s+/g, ' ').trim())
				.filter((t) => /^[^:]{2,40}:\s*$/.test(t)),
		);
		ghiChu('nhãn không có giá trị', hang.join(' | ') || '(không có)');
		const chu = chuan(await khung(page).innerText());
		expect(/Chưa khai báo|--/.test(chu), 'Không thấy dấu "Chưa khai báo" / "--" cho trường trống').toBe(true);
		expect(hang, 'Có trường chưa khai mà để TRỐNG').toEqual([]);
	});

	test('19_070_001 — Ô Phân loại chỉ chọn được sau khi chọn Hình thức', async ({ page }) => {
		chanNeuTat('19_070_001');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		await moThe(page, 'Ví điểm');
		const vung = khung(page).locator('.ant-tabs-tabpane-active');
		// 🔴 Bám VỊ TRÍ sau khi đã định danh bằng placeholder: chọn xong thì placeholder biến mất, lọc theo chữ là mất ô.
		const oHt = vung.locator('.ant-select').filter({ hasText: 'Chọn hình thức' }).first();
		await expect(oHt, 'Không thấy ô "Chọn hình thức"').toBeVisible();
		const tatCa = vung.locator('.ant-select');
		const iPl = await tatCa.evaluateAll((ds) => ds.findIndex((e) => e.innerText.includes('Chọn phân loại')));
		const iHt = await tatCa.evaluateAll((ds) => ds.findIndex((e) => e.innerText.includes('Chọn hình thức')));
		const oPl = tatCa.nth(iPl);
		const oHtCo = tatCa.nth(iHt);
		await expect(oPl, 'Không thấy ô "Chọn phân loại"').toBeVisible();
		await expect(oPl, 'Chưa chọn Hình thức mà Phân loại đã chọn được').toHaveClass(/ant-select-disabled/);
		const chon = async (o, nhan) => {
			await o.click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').filter({ hasText: nhan }).first().click();
			await page.waitForTimeout(1_000);
		};
		await chon(oHtCo, 'Bán hàng');
		await expect(oPl).not.toHaveClass(/ant-select-disabled/);
		await chon(oPl, 'Tích điểm');
		await expect(oPl).toContainText('Tích điểm');
		await chon(oHtCo, 'Trả hàng');
		await expect(oPl, 'Đổi Hình thức mà Phân loại không bị xoá').not.toContainText('Tích điểm');
	});

	test('19_070_002 — Điểm còn lại đọc ở dòng gần nhất không phải cộng gộp', async ({ page }) => {
		chanNeuTat('19_070_002');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		await moThe(page, 'Ví điểm');
		const dongs = bangThe(page);
		await page.waitForTimeout(2_000);
		const n = await dongs.count();
		const cot = (await khung(page).locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()).map(chuan);
		const iDiem = cot.indexOf('Điểm');
		const iCon = cot.indexOf('Điểm còn lại');
		expect(iCon, `Tab Ví điểm không có cột "Điểm còn lại". Cột: ${cot.join(' · ')}`).toBeGreaterThanOrEqual(0);
		test.skip(n === 0, `Khách ${kh.ma} chưa có biến động điểm nào (tích điểm chưa cấu hình cho làn?) — không có dòng để đối chiếu.`);
		const bang = [];
		for (let i = 0; i < n; i += 1) {
			const td = dongs.nth(i).locator('td');
			bang.push({ diem: so(await td.nth(iDiem).innerText()), con: so(await td.nth(iCon).innerText()) });
		}
		ghiChu('bảng điểm', JSON.stringify(bang));
		const hienCo = so(chuan(await khung(page).innerText()).match(/Điểm tích l[uũ]y\s*:?\s*([\d.,-]+)/)?.[1]);
		ghiChu('Điểm tích lũy (đầu trang)', hienCo);
		expect(bang[0].con, '"Điểm còn lại" dòng trên cùng ≠ điểm khách đang có').toBe(hienCo);
		// Dòng dưới là quá khứ: con[i] = con[i+1] + diem[i].
		for (let i = 0; i + 1 < n; i += 1) expect(bang[i].con, `Dòng ${i + 1}: Điểm còn lại không khớp dòng trước + Điểm`).toBe(bang[i + 1].con + bang[i].diem);
	});

	test('19_080_002 — Cột Loại chỉ có Sản phẩm hoặc Combo', async ({ page }) => {
		chanNeuTat('19_080_002');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		await moThe(page, 'Sản phẩm đã mua');
		const cot = (await khung(page).locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()).map(chuan);
		ghiChu('cột', cot.join(' · '));
		const i = cot.indexOf('Loại');
		expect(i, `Tab Sản phẩm đã mua không có cột "Loại". Cột: ${cot.join(' · ')}`).toBeGreaterThanOrEqual(0);
		const loai = (await bangThe(page).locator(`td:nth-child(${i + 1})`).allInnerTexts()).map(chuan);
		expect(loai.length, 'Khách có đơn mà tab Sản phẩm đã mua rỗng').toBeGreaterThan(0);
		for (const l of loai) expect(['Sản phẩm', 'Combo', '--']).toContain(l);
	});

	test('19_060_001 — Tab Đơn hàng mặc định chỉ lấy đơn trong tháng hiện tại', async ({ page }) => {
		chanNeuTat('19_060_001');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		const cho = page.waitForResponse((r) => /report\/customer-debt\/orders/.test(r.url()) && r.status() !== 401, { timeout: 30_000 });
		await moThe(page, 'Đơn hàng');
		const q = Object.fromEntries(new URL((await cho).url()).searchParams);
		ghiChu('tham số mặc định', JSON.stringify(q));
		const d = new Date();
		const dauThang = new Date(d.getFullYear(), d.getMonth(), 1);
		// Tham số là chuỗi `YYYY-MM-DD` (đo 25/09/2026).
		const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
		const cuoiThang = new Date(d.getFullYear(), d.getMonth() + 1, 0);
		expect(q.fromDate, 'Mặc định không lọc từ đầu tháng').toBe(iso(dauThang));
		expect([iso(cuoiThang), iso(d)], 'Mặc định không lọc tới cuối tháng / hôm nay').toContain(q.toDate);
		await expect(bangThe(page), 'Đơn trong tháng (tiền đề) không hiện').not.toHaveCount(0);
		// Lùi khoảng về tháng trước ⇒ đơn tháng này phải biến mất (bộ lọc thời gian có tác dụng).
		const rp = khung(page).locator('.ant-tabs-tabpane-active .ant-picker-range').first();
		const tr = new Date(dauThang.getFullYear(), dauThang.getMonth() - 1, 1);
		const f = (x) => `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
		const cho2 = page.waitForResponse((r) => /report\/customer-debt\/orders/.test(r.url()) && r.status() !== 401, { timeout: 30_000 });
		await rp.click();
		const ins = rp.locator('input');
		await ins.nth(0).fill(f(tr));
		await ins.nth(0).press('Enter');
		await ins.nth(1).fill(f(new Date(dauThang.getTime() - 86_400_000)));
		await ins.nth(1).press('Enter');
		await cho2;
		await page.waitForTimeout(2_000);
		expect(chuan(await khung(page).locator('.ant-tabs-tabpane-active').innerText()), 'Lọc tháng trước vẫn hiện đơn tháng này').not.toContain(String(kh.orderId));
	});

	test('19_090_005 — Ghi nợ với số tiền bằng 0 hoặc âm', async ({ page }) => {
		chanNeuTat('19_090_005');
		await nutCongNo(page, 'Ghi nợ');
	});

	test('19_090_003 — Ghi nợ thủ công cho khách hàng', async ({ page }) => {
		chanNeuTat('19_090_003');
		await nutCongNo(page, 'Ghi nợ');
	});

	test('19_090_002 — Gạch nợ không tạo phiếu thu hồi nợ', async ({ page }) => {
		chanNeuTat('19_090_002');
		await nutCongNo(page, 'Gạch nợ');
	});

	test('19_090_006 — Thanh toán công nợ với số tiền bằng 0', async ({ page }) => {
		chanNeuTat('19_090_006');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		await moThe(page, 'Công nợ');
		const { daGoi } = await chanGhi(page);
		const dr = await moThanhToan(page);
		await dr.getByPlaceholder('Số tiền thanh toán').fill('0');
		await dr.getByRole('button', { name: 'Lưu', exact: true }).click();
		const tb = await g.thongBao(page);
		ghiChu('nguyên văn', tb || '(không có)');
		expect(daGoi, `Số tiền 0 mà vẫn gửi request: ${daGoi.join(' ; ')}`).toEqual([]);
		expect(tb).toContain('Vui lòng nhập số tiền thanh toán lớn hơn 0');
	});

	test('19_090_001 — Thu hồi công nợ khách tạo phiếu thu thật', async ({ page }) => {
		chanNeuTat('19_090_001');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		await moThe(page, 'Công nợ');
		const truoc = await giaTri(page, 'Tiền còn nợ');
		ghiChu('còn nợ trước', truoc);
		expect(truoc, 'Khách tiền đề không còn nợ').toBeGreaterThanOrEqual(THU);
		const dr = await moThanhToan(page);
		// Nhân viên tạo phiếu: chọn nếu chưa có mặc định.
		const oNv = dr.locator('.ant-form-item').filter({ hasText: 'Nhân viên tạo phiếu' }).locator('.ant-select').first();
		if (!/\S/.test(chuan(await oNv.locator('.ant-select-selection-item').innerText().catch(() => '')))) {
			await oNv.click();
			await page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option').first().click();
		}
		await dr.getByPlaceholder('Số tiền thanh toán').fill(String(THU));
		await page.waitForTimeout(800);
		// 🔴 Từ 25/09 tiền mặt chỉ ghi vào QUỸ QUẦY: người thu (CHT) không có ca mở ⇒ BE SHIFT-010 "Chưa mở ca tại quầy…
		//    Vui lòng mở ca hoặc chọn quỹ quầy". Kịch bản không chỉ quỹ ⇒ chọn quỹ quầy ở ô "Quỹ thu" (`SelectFund`).
		const oQuy = dr.locator('.ant-form-item').filter({ hasText: 'Quỹ thu' }).locator('.ant-select').first();
		if (!/\S/.test(chuan(await oQuy.locator('.ant-select-selection-item').innerText().catch(() => '')))) {
			await oQuy.click();
			const dsQuy = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden) .ant-select-item-option');
			await dsQuy.first().waitFor({ state: 'visible', timeout: 15_000 }).catch(() => null);
			const ten = (await dsQuy.allInnerTexts()).map(chuan);
			ghiChu('quỹ có sẵn', JSON.stringify(ten));
			const iQuay = ten.findIndex((t) => /quầy/i.test(t));
			expect(iQuay, `Tiền đề: điểm bán không có quỹ quầy để thu tiền mặt (${JSON.stringify(ten)})`).toBeGreaterThanOrEqual(0);
			await dsQuy.nth(iQuay).click();
		}
		const cho = page.waitForResponse((r) => /customer\/create-debt/.test(r.url()), { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Lưu', exact: true }).click();
		const r = await cho;
		const body = r.request().postDataJSON();
		const b = await r.json();
		ghiChu('payload', JSON.stringify({ type: body.type, totalAmount: body.totalAmount, catName: body.catName, orders: body.orders, fundId: body.fundId }));
		ghiChu('BE', JSON.stringify(b?.status));
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		expect(body.type).toBe('PAYMENT');
		expect(body.catName, 'Phiếu thu không mang loại "Thu hồi nợ"').toBe('Thu hồi nợ');
		expect(await g.thongBao(page)).toContain('Thêm thành công');
		await page.waitForTimeout(3_000);
		const sau = await giaTri(page, 'Tiền còn nợ');
		ghiChu('còn nợ sau', sau);
		expect(sau, 'Công nợ không giảm đúng số vừa thu').toBe(truoc - THU);
		const so_ = JSON.parse(fs.readFileSync(SO, 'utf8'));
		so_.khNo.daThu = (so_.khNo.daThu || 0) + THU;
		fs.writeFileSync(SO, JSON.stringify(so_, null, 2));
	});

	test('19_060_002 — Đơn trả một phần vẫn hiện Chưa thanh toán', async ({ page }) => {
		chanNeuTat('19_060_002');
		const kh = khNo();
		test.skip(!kh.daThu, 'Đơn tiền đề chưa được trả một phần (19_090_001 chưa chạy / đỏ).');
		await g.moChiTiet(page, kh.ma);
		await moThe(page, 'Đơn hàng');
		const cot = (await khung(page).locator('.ant-tabs-tabpane-active .ant-table-thead th').allInnerTexts()).map(chuan);
		const d = bangThe(page).first();
		await expect(d).toBeVisible({ timeout: 15_000 });
		const td = (await d.locator('td').allInnerTexts()).map(chuan);
		const o = (nhan) => td[cot.indexOf(nhan)];
		ghiChu('dòng đơn', cot.map((c, i) => `${c}=${td[i]}`).join(' · '));
		expect(o('Trạng thái thanh toán')).toBe('Chưa thanh toán');
		expect(so(o('Còn nợ')), 'Cột Còn nợ ≠ Tổng tiền − Đã thanh toán').toBe(so(o('Tổng tiền')) - so(o('Đã thanh toán')));
		expect(so(o('Đã thanh toán')), 'Cột Đã thanh toán không có phần vừa trả').toBeGreaterThan(0);
	});

	test('19_050_003 — Chặn xoá khách còn công nợ', async ({ page }) => {
		chanNeuTat('19_050_003');
		const kh = khNo();
		await g.moChiTiet(page, kh.ma);
		await khung(page).getByRole('button', { name: /X[oó][aá]$/ }).click();
		const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
		const cho = page.waitForResponse((r) => /chain-customers?\/delete/.test(r.url()), { timeout: 30_000 });
		await pop.getByRole('button', { name: 'Đồng ý' }).click();
		const b = await (await cho).json().catch(() => ({}));
		const tb = await g.thongBao(page);
		ghiChu('BE', JSON.stringify(b?.status));
		ghiChu('nguyên văn', tb);
		const ct = await g.chiTietApi(page, st, kh.id);
		expect(String(ct?.status?.code), 'Khách CÒN NỢ đã bị xoá').toBe('200');
		expect(tb).toContain('Vui lòng cập nhật công nợ khách hàng trước khi xóa!');
	});
});

async function moThanhToan(page) {
	const nut = khung(page).getByRole('button', { name: /^Thanh toán$/ });
	await expect(nut, 'Tab Công nợ không có nút "Thanh toán"').toBeEnabled({ timeout: 15_000 });
	await nut.click();
	const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Thanh toán nợ khách hàng' }).last();
	await expect(dr).toBeVisible({ timeout: 15_000 });
	await page.waitForTimeout(1_500);
	return dr;
}

async function nutCongNo(page, nhan) {
	const kh = khNo();
	await g.moChiTiet(page, kh.ma);
	await moThe(page, 'Công nợ');
	const nut = khung(page).locator('.ant-tabs-tabpane-active').getByRole('button', { name: new RegExp(nhan) });
	expect(
		await nut.count(),
		`Tab Công nợ KHÔNG có nút "${nhan}" — FE đã comment nút này (pages/customer/customerDebt/CustomerDebt.jsx:325-339). ` +
			`Nút đang có: ${chuan((await khung(page).locator('.ant-tabs-tabpane-active button').allInnerTexts()).join(' · '))}`,
	).toBeGreaterThan(0);
}
