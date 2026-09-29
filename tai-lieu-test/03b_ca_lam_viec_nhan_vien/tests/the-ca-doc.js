'use strict';

/**
 * Đọc màn Ca làm việc cá nhân KÈM dữ liệu nguồn mà `TodayShiftCard.jsx` dùng để quyết định nút:
 *   - `GET /timekeeping/shift-all` → khung giờ ca + `checkinAllowableMinutesBefore/After`;
 *   - `GET /timekeeping/shift-report/summary` → trạng thái phiên (`OPEN` · `DRAFT_CLOSED` · `CLOSED`);
 *   - `GET /timekeeping/schedule?…employeeId=…` → lịch hôm nay của chính người đăng nhập.
 *
 * 🔴 Body đọc NGAY trong predicate của `waitForResponse`: `moTrang` có thể đăng nhập lại và điều
 *    hướng, đọc `.json()` sau đó dễ gặp *"No resource with given identifier"*.
 */

const { moTrang } = require('../../shared/auth/login');
const { ROUTE, chuan, khungMan } = require('./shift-card');

function choJson(page, khop, timeout = 90_000) {
	let body;
	const cho = page.waitForResponse(
		async (r) => {
			if (!khop(r.url()) || r.status() !== 200) return false;
			body = await r.json().catch(() => undefined);
			return body !== undefined;
		},
		{ timeout },
	);
	return cho.then(() => body);
}

/** "HH:mm" + phút lệch → số phút trong ngày. */
const phut = (hhmm) => {
	const [h, m] = String(hhmm).split(':').map(Number);
	return h * 60 + m;
};
/** Phút hiện tại trong ngày theo giờ Việt Nam. */
const phutBayGio = () => {
	const d = new Date(Date.now() + 7 * 3600 * 1000);
	return d.getUTCHours() * 60 + d.getUTCMinutes();
};

/** Đúng công thức `isWithinTimekeepingWindow`; thiếu giờ ⇒ null (code coi là "không chặn"). */
function trongKhungChamCong(cfg, bayGio = phutBayGio()) {
	if (!cfg?.beginTime || !cfg?.endTime) return null;
	const tu = phut(cfg.beginTime) - (Number(cfg.checkinAllowableMinutesBefore) || 0);
	const den = phut(cfg.endTime) + (Number(cfg.checkoutAllowableMinutesAfter) || 0);
	return bayGio >= tu && bayGio <= den;
}

/**
 * Mở màn, trả:
 *   { the: [{ ten, chu, nut: [nhãn nút], cfg, summary }], khongCoCa: boolean, bayGio }
 */
async function moVaDocTheCa(page, vai) {
	const pCa = choJson(page, (u) => u.includes('/timekeeping/shift-all'));
	const pLich = choJson(page, (u) => u.includes('/timekeeping/schedule?') && u.includes('employeeId='));
	await moTrang(page, ROUTE, vai);
	const [ca, lich] = await Promise.all([pCa, pLich]);
	const theoTen = {};
	for (const x of ca?.data ?? []) theoTen[chuan(x.name)] = x;

	const k = khungMan(page);
	const coLich = (lich?.data ?? []).length > 0;
	let summary = [];
	if (coLich) {
		summary = (await choJson(page, (u) => u.includes('/timekeeping/shift-report/summary'), 45_000).catch(() => null))?.data ?? [];
		await k.getByText('Tên ca', { exact: true }).first().waitFor({ state: 'visible', timeout: 30_000 });
	} else {
		await k.getByText('Chưa có ca làm việc hôm nay').waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
	}
	const theoCa = {};
	for (const s of summary) if (s?.shiftId != null) theoCa[s.shiftId] = s;

	const doc = async () => {
		const so = await k.getByText('Tên ca', { exact: true }).count();
		const kq = [];
		for (let i = 0; i < so; i += 1) {
		const o = k
			.getByText('Tên ca', { exact: true })
			.nth(i)
			.locator('xpath=ancestor::div[contains(@class,"grid-cols-[minmax(0,1fr)_auto]")][1]');
		const chu = chuan(await o.innerText());
		const ten = chuan(chu.match(/^Tên ca (.+?) Thời gian ca/)?.[1] ?? '');
		const nut = (await o.getByRole('button').allInnerTexts()).map(chuan).filter((t) => t && !t.startsWith('Tên ca'));
		const cfg = theoTen[ten];
		kq.push({ ten, chu, nut, cfg, summary: cfg ? theoCa[cfg.id] : undefined, o });
		}
		return kq;
	};
	// 🔴 Nút của thẻ vẽ SAU khi summary về (qua Redux) — đọc ngay là ra mảng nút rỗng. Đọc lại tới
	//    khi hai lần liên tiếp giống nhau, và thẻ nào có phiên thì phải đã có nút.
	let the = await doc();
	for (let lan = 0; lan < 20; lan += 1) {
		await page.waitForTimeout(500);
		const lai = await doc();
		const giong = JSON.stringify(lai.map((t) => t.nut)) === JSON.stringify(the.map((t) => t.nut));
		const du = lai.every((t) => !t.summary?.status || t.nut.length > 0);
		the = lai;
		if (giong && du) break;
	}
	return {
		the,
		khongCoCa: (await k.getByText('Chưa có ca làm việc hôm nay').count()) > 0,
		coLich,
		bayGio: phutBayGio(),
	};
}

const trangThaiPhien = (s) => String(s?.status ?? '').toUpperCase();

module.exports = { moVaDocTheCa, trongKhungChamCong, trangThaiPhien };
