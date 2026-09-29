'use strict';

/**
 * 26 · Phiếu thu, vai `shop` (Cửa hàng trưởng) — các case KHÔNG ghi.
 *
 * 🔴 `chanGhi` trả 403 cho mọi request ghi `expenses|receipt|fund|finance`: case kiểm validate vẫn bấm
 *    "Hoàn thành" được mà 🚫 không lập phiếu thật. Case nào lọt tới request ghi là validate KHÔNG chặn.
 * Chuỗi case GHI nằm ở `phieu-thu-ghi.shop.spec.js`.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { tenGdv, API, batHeader, boDau, chanGhi, chuan, dong, goiApi, khung, moMan, oTim, taiLaiBoi, thamSo } =
	require('./receipt-page');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Điểm bán ngang hàng có phiếu thu sẵn (đo DB 23/09/2026: `SHOP_ORDER_2` 10 phiếu). */
const SHOP_NGANG_HANG = 67785;

async function moFormLap(page) {
	await khung(page).getByRole('button', { name: 'Thêm phiếu thu' }).click();
	const d = page.getByRole('dialog', { name: 'Phiếu thu tiền' });
	await expect(d.getByRole('combobox', { name: 'Danh mục phiếu' })).toBeVisible();
	return d;
}

async function chonTrong(page, combobox, nhan) {
	await combobox.click();
	const dd = page.locator('.ant-select-dropdown:not(.ant-select-dropdown-hidden)').last();
	const muc = dd.locator('.ant-select-item-option');
	await expect(muc.first()).toBeVisible();
	const ds = await muc.allInnerTexts();
	const i = ds.findIndex((s) => boDau(s) === boDau(nhan));
	expect(i, `Không có lựa chọn "${nhan}". Đang có: ${ds.map(chuan).join(' · ')}`).toBeGreaterThanOrEqual(0);
	await muc.nth(i).click();
	await expect(dd).toBeHidden();
}

/** Điền đủ form hợp lệ, trừ các ô trong `bo`. */
async function dienForm(page, d, { bo = [], soTien = '12345' } = {}) {
	if (!bo.includes('danhMuc')) await chonTrong(page, d.getByRole('combobox', { name: 'Danh mục phiếu' }), 'Chưa phân loại');
	const oNv = d.locator('.ant-form-item').filter({ has: page.locator('label', { hasText: /^Nhân viên$/ }) })
		.getByRole('combobox');
	await chonTrong(page, oNv, tenGdv());
	if (!bo.includes('soTien')) await d.getByRole('spinbutton', { name: 'Số tiền cần thu' }).fill(soTien);
	await d.getByRole('textbox', { name: 'Ghi chú' }).fill('AUTOTEST_26_VALIDATE');
}

/** Bấm Hoàn thành; trả `{ ghi, canhBao }` — số request ghi đã phát & nguyên văn cảnh báo (nếu có). */
async function bamHoanThanh(page, d, chan) {
	const truoc = chan.daGoi.length;
	await d.getByRole('button', { name: 'Hoàn thành' }).click();
	const tb = page.locator('.ant-message-notice').last();
	await tb.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
	const canhBao = (await tb.count()) ? chuan(await tb.innerText()) : '';
	return { ghi: chan.daGoi.slice(truoc), canhBao };
}

test.describe('26 · Phiếu thu — đọc & validate (Cửa hàng trưởng)', () => {
	let chan;
	let kho;
	let trangThai;
	test.beforeEach(async ({ page }) => {
		chan = await chanGhi(page);
		kho = batHeader(page);
		trangThai = await moMan(page, VAI);
		expect(trangThai, 'Vai shop không đọc được danh sách phiếu thu').toContain(200);
	});

	test('26_010_001 — Màn Phiếu thu mặc định hiện phiếu trong ngày hôm nay', async ({ page }) => {
		chanNeuTat('26_010_001');
		const res = await taiLaiBoi(page, () => page.reload());
		const p = thamSo(res);
		const batDau = Number(p.start_date);
		const ketThuc = Number(p.end_date);
		const d = new Date();
		const dauNgay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
		expect(batDau, `Mốc bắt đầu ≠ 00:00 hôm nay: ${JSON.stringify(p)}`).toBe(dauNgay);
		expect(ketThuc, `Mốc kết thúc ≠ 23:59:59 hôm nay: ${JSON.stringify(p)}`).toBe(dauNgay + 86_399_000);
		expect(p.sort, 'Không sắp xếp theo thời gian tạo giảm dần').toBe('createdDate,DESC');
		await expect(khung(page).locator('.ant-picker-input input').first()).toHaveValue(/./);
	});

	test('26_090_002 — Danh sách phiếu thu rỗng', async ({ page }) => {
		chanNeuTat('26_090_002');
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill('ZZZ-KHONG-BAO-GIO-CO-999');
			await oTim(page).press('Enter');
		});
		expect(res.status()).toBe(200);
		expect((await res.json()).data).toEqual([]);
		await expect(dong(page)).toHaveCount(0);
		const rong = khung(page).locator('.ant-empty').first();
		await expect(rong, 'Danh sách rỗng mà không có khối trạng thái rỗng').toBeVisible();
		test.info().annotations.push({ type: 'nguyên văn trạng thái rỗng', description: chuan(await rong.innerText()) });
	});

	test('26_090_005 — Tìm phiếu thu bằng mã không tồn tại', async ({ page }) => {
		chanNeuTat('26_090_005');
		const res = await taiLaiBoi(page, async () => {
			await oTim(page).fill('PT-KHONG-TON-TAI-999');
			await oTim(page).press('Enter');
		});
		expect(res.status(), 'Tìm mã không tồn tại mà API lỗi').toBe(200);
		expect(thamSo(res).keyword).toBe('PT-KHONG-TON-TAI-999');
		await expect(dong(page)).toHaveCount(0);
		await expect(khung(page).locator('.ant-empty').first()).toBeVisible();
	});

	test('26_070_003 — Đơn vị ngang hàng không xem được phiếu của nhau', async ({ page }) => {
		chanNeuTat('26_070_003');
		// Đối chứng: phiên này đọc được phiếu của CHÍNH điểm bán mình.
		const cuaMinh = await goiApi(page, kho, 'GET', API, {
			params: { shopId: kho.h.shopid, pageNum: 1, pageSize: 5, page: 0, size: 5, start_date: 1_600_000_000_000, end_date: Date.now() },
		});
		expect(String(cuaMinh.body?.status?.code)).toBe('200');
		// Xin phiếu của điểm bán ngang hàng (cùng chuỗi, không trực thuộc nhau) bằng phiên điểm bán A.
		const r = await goiApi(page, kho, 'GET', API, {
			params: { shopId: SHOP_NGANG_HANG, pageNum: 1, pageSize: 50, page: 0, size: 50, start_date: 1_600_000_000_000, end_date: Date.now() },
		});
		const lo = (r.body?.data ?? []).filter((x) => Number(x.shopId) === SHOP_NGANG_HANG);
		test.info().annotations.push({ type: 'phản hồi khi xin phiếu shop khác', description: `${r.status} ${JSON.stringify(r.body?.status)}` });
		expect(lo.length, `Điểm bán ${kho.h.orgunitcode} đọc được ${lo.length} phiếu của điểm bán ngang hàng ${SHOP_NGANG_HANG}`)
			.toBe(0);
		// UI: mọi dòng đang hiện đều của chính điểm bán.
		const res = await taiLaiBoi(page, () => page.reload());
		expect(((await res.json()).data ?? []).every((x) => String(x.shopId) === String(kho.h.shopid))).toBe(true);
	});

	test('26_020_002 — Chọn Chuyển khoản thì hiện ô tài khoản nhận tiền', async ({ page }) => {
		chanNeuTat('26_020_002');
		const d = await moFormLap(page);
		const nhan = d.getByText('Thu tiền từ tài khoản', { exact: true });
		await expect(nhan).toHaveCount(0);
		const oPt = d.locator('.ant-col').filter({ has: page.getByText('Phương thức thanh toán', { exact: true }) })
			.getByRole('combobox');
		await chonTrong(page, oPt, 'Chuyển khoản');
		await expect(nhan, 'Chọn Chuyển khoản mà không hiện ô "Thu tiền từ tài khoản"').toBeVisible();
		await expect(d.locator('.ant-col').filter({ has: page.getByText('Thu tiền từ tài khoản', { exact: true }) })
			.getByRole('combobox')).toBeVisible();
	});

	test('26_050_002 — Tìm danh mục bỏ qua dấu tiếng Việt', async ({ page }) => {
		chanNeuTat('26_050_002');
		await khung(page).getByRole('button', { name: 'Danh mục phiếu thu' }).click();
		const dm = page.getByRole('dialog', { name: 'Danh mục phiếu thu' });
		const hang = dm.locator('.ant-table-tbody tr.ant-table-row');
		await expect(hang.first()).toBeVisible();
		const o = dm.getByRole('textbox', { name: 'Tìm kiếm danh mục theo tên' });
		// Đối chứng bỏ dấu: gõ không dấu tên đầy đủ của một danh mục có sẵn.
		await o.fill('thu hoi no');
		await expect(hang.filter({ hasText: /Thu h.*i n/ }), 'Gõ "thu hoi no" không ra "Thu hồi nợ"').toHaveCount(1);
		// Đúng kịch bản HDSD.
		await o.fill('thu no');
		const ten = (await hang.locator('td:nth-child(2)').allInnerTexts().catch(() => [])).map(chuan);
		expect(
			ten,
			`Gõ "thu no" không ra "Thu hồi công nợ khách hàng". Danh sách trả về: ${ten.join(' · ') || '(rỗng)'}`,
		).toContain('Thu hồi công nợ khách hàng');
	});

	test('26_080_001 — Bỏ trống số tiền khi lập phiếu thu', async ({ page }) => {
		chanNeuTat('26_080_001');
		const d = await moFormLap(page);
		await dienForm(page, d, { bo: ['soTien'] });
		const { ghi, canhBao } = await bamHoanThanh(page, d, chan);
		test.info().annotations.push({ type: 'nguyên văn', description: canhBao });
		expect(ghi, 'Bỏ trống số tiền mà vẫn gửi lệnh lập phiếu').toEqual([]);
		expect(canhBao).toBe('Nhập số tiền cần thu');
	});

	test('26_080_002 — Lập phiếu thu với số tiền bằng 0', async ({ page }) => {
		chanNeuTat('26_080_002');
		const d = await moFormLap(page);
		await dienForm(page, d, { soTien: '0' });
		const { ghi, canhBao } = await bamHoanThanh(page, d, chan);
		test.info().annotations.push({ type: 'nguyên văn', description: canhBao });
		expect(ghi, 'Số tiền 0 mà vẫn gửi lệnh lập phiếu').toEqual([]);
		expect(canhBao, 'Số tiền 0 bị chặn mà không có thông báo').not.toBe('');
	});

	test('26_080_003 — Lập phiếu thu với số tiền âm', async ({ page }) => {
		chanNeuTat('26_080_003');
		const d = await moFormLap(page);
		await dienForm(page, d, { soTien: '-5000' });
		const o = d.getByRole('spinbutton', { name: 'Số tiền cần thu' });
		await o.blur();
		const giaTri = await o.inputValue();
		test.info().annotations.push({ type: 'giá trị ô sau khi nhập -5000', description: giaTri });
		const { ghi, canhBao } = await bamHoanThanh(page, d, chan);
		test.info().annotations.push({ type: 'nguyên văn', description: canhBao });
		const khongNhanAm = !giaTri.includes('-');
		expect(khongNhanAm || ghi.length === 0, `Ô nhận "${giaTri}" và vẫn gửi lệnh lập phiếu`).toBe(true);
	});

	test('26_080_004 — Bỏ trống danh mục khi lập phiếu thu', async ({ page }) => {
		chanNeuTat('26_080_004');
		const d = await moFormLap(page);
		await dienForm(page, d, { bo: ['danhMuc'] });
		const { ghi, canhBao } = await bamHoanThanh(page, d, chan);
		test.info().annotations.push({ type: 'nguyên văn', description: canhBao });
		expect(ghi, 'Bỏ trống danh mục mà vẫn gửi lệnh lập phiếu').toEqual([]);
		expect(canhBao).toBe('Chọn danh mục phiếu');
	});

	test('26_080_005 — Huỷ giữa chừng khi lập phiếu thu', async ({ page }) => {
		chanNeuTat('26_080_005');
		const truoc = (await taiLaiBoi(page, () => page.reload())).url();
		const soTruoc = await dong(page).count();
		const d = await moFormLap(page);
		await dienForm(page, d);
		const soGhi = chan.daGoi.length;
		await d.getByRole('button', { name: 'Đóng' }).click();
		await expect(d).toBeHidden();
		expect(chan.daGoi.slice(soGhi), 'Đóng form mà vẫn gửi lệnh lập phiếu').toEqual([]);
		const res = await taiLaiBoi(page, () => page.reload());
		expect(res.url()).toBe(truoc);
		await expect(dong(page)).toHaveCount(soTruoc);
		expect(((await res.json()).data ?? []).filter((x) => x.note === 'AUTOTEST_26_VALIDATE')).toEqual([]);
	});

	test('26_080_006 — Chọn Chuyển khoản mà không chọn tài khoản nhận', async ({ page }) => {
		chanNeuTat('26_080_006');
		const d = await moFormLap(page);
		await dienForm(page, d);
		const oPt = d.locator('.ant-col').filter({ has: page.getByText('Phương thức thanh toán', { exact: true }) })
			.getByRole('combobox');
		await chonTrong(page, oPt, 'Chuyển khoản');
		await expect(d.getByText('Thu tiền từ tài khoản', { exact: true })).toBeVisible();
		const { ghi, canhBao } = await bamHoanThanh(page, d, chan);
		test.info().annotations.push({ type: 'nguyên văn', description: canhBao });
		expect(ghi, `Chuyển khoản không chọn tài khoản nhận mà vẫn gửi lệnh lập phiếu (thông báo: "${canhBao}")`)
			.toEqual([]);
	});
});
