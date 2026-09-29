'use strict';

/**
 * Helper phân hệ 03b — Ca làm việc của nhân viên (`/lich-ca-nhan/ca-lam-viec`).
 *
 * 🔴 Đo 20/09/2026: màn KHÔNG dùng `.ant-card` cho thẻ ca — `TodayShiftCard.jsx` dựng bằng Tailwind
 * grid thuần, mỗi thẻ có đúng bốn nhãn con **Tên ca · Thời gian ca · Giờ đến · Giờ về** và một chấm
 * màu `.h-3.w-3.rounded-full`. ⇒ bám theo NHÃN, 🚫 đừng tìm `.ant-card`.
 *
 * 🔴 Khi tài khoản không có ca hôm nay, màn hiện đúng câu **"Chưa có ca làm việc hôm nay"**. Mọi case
 * đối chiếu thẻ ca phải **skip kèm lý do** ở tình huống đó — 🚫 không để vòng lặp 0 vòng rồi xanh.
 */

const { expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const ROUTE = '/lich-ca-nhan/ca-lam-viec';
const API_LICH = '/timekeeping/schedule';

const KHONG_CO_CA = 'Chưa có ca làm việc hôm nay';

async function moManCaCaNhan(page, vai) {
	const cho = page.waitForResponse(
		(r) => r.url().includes(API_LICH) && r.status() !== 401,
		{ timeout: 90_000 },
	);
	await moTrang(page, ROUTE, vai);
	const res = await cho;
	expect(res.status(), 'API lịch ca cá nhân không trả 200').toBe(200);
	await page.waitForTimeout(2_500);
	return res;
}

const khungMan = (page) => page.locator('.ant-pro-page-container');

/** Khối "Thông tin ca làm việc hôm nay" — nơi chứa các thẻ ca. */
const khoiHomNay = (page) =>
	khungMan(page)
		.locator('div')
		.filter({ hasText: /Thông tin ca làm việc hôm nay/ })
		.last();

/** Mỗi thẻ ca chứa đúng một nhãn "Tên ca". */
const theCa = (page) =>
	khungMan(page).locator('div').filter({ has: page.getByText('Tên ca', { exact: true }) });

/** Số thẻ ca hôm nay. 0 khi màn báo "Chưa có ca làm việc hôm nay". */
async function soTheCa(page) {
	if (await khungMan(page).getByText(KHONG_CO_CA).count()) return 0;
	return khungMan(page).getByText('Tên ca', { exact: true }).count();
}

/** Giá trị của một ô trong thẻ ca thứ `i`: nhãn nằm trên, giá trị nằm ngay dưới. */
async function oTheCa(page, i, nhan) {
	const o = khungMan(page).getByText(nhan, { exact: true }).nth(i);
	const cha = o.locator('xpath=..');
	const text = chuan(await cha.innerText());
	return chuan(text.replace(new RegExp(`^${nhan}`), ''));
}

/** Bỏ qua kèm lý do khi tài khoản không có ca nào hôm nay. */
async function boQuaNeuKhongCoCa(test, page) {
	if ((await soTheCa(page)) === 0) {
		test.skip(
			true,
			'Tài khoản đang đăng nhập KHÔNG có ca làm việc hôm nay — cần xếp lịch trước. ' +
				'🚫 Không tự xếp lịch: đó là ghi dữ liệu thật vào điểm bán đang chạy.',
		);
	}
}

/** 🔴 Chặn mọi request GHI của phân hệ chấm công — mở/chốt ca là thao tác không hoàn tác. */
async function chanGhi(page) {
	const daGoi = [];
	await page.route('**/timekeeping/**', async (route) => {
		if (route.request().method() === 'GET') return route.continue();
		daGoi.push(`${route.request().method()} ${route.request().url()}`);
		await route.fulfill({
			status: 403,
			contentType: 'application/json',
			body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }),
		});
	});
	return { daGoi };
}

module.exports = {
	API_LICH,
	KHONG_CO_CA,
	ROUTE,
	boQuaNeuKhongCoCa,
	chanGhi,
	chuan,
	khoiHomNay,
	khungMan,
	moManCaCaNhan,
	oTheCa,
	soTheCa,
	theCa,
};
