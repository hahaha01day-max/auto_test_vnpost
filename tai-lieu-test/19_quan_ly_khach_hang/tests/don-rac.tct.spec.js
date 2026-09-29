'use strict';

/**
 * DỌN RÁC 19 (`-g "don rac 19"`) — vai `tct` xoá mọi khách `A<làn>KH19…` còn sống, TRỪ khách nợ tiền đề.
 * 🔴 Xoá cấp chuỗi (`DELETE /chain-customers/delete`): xoá bằng phiên điểm bán trả 200 nhưng KHÔNG xoá khách
 *    tạo ở cấp chuỗi (đo DB 25/09/2026: `CHAIN_CUSTOMER.status` vẫn = 1).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { moMan } = require('./customer-page');
const g = require('./khach-ghi');

const SO = path.join(__dirname, '..', 'test-output', `tien-de.lane${g.LAN}.json`);

test('don rac 19 — xoá khách rác của làn', async ({ page }) => {
	test.setTimeout(300_000);
	const st = g.k.batHeader(page);
	await moMan(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	const giu = fs.existsSync(SO) ? String(JSON.parse(fs.readFileSync(SO, 'utf8')).khNo?.id) : '';
	const kq = [];
	// Danh sách id cho sẵn (lấy từ SELECT DB) — dùng khi API tìm kiếm hỏng.
	for (const id of (process.env.VNPOST_XOA_IDS || '').split(',').filter(Boolean)) {
		if (id === giu) continue;
		const b = await g.xoaKhachApi(page, st, id);
		kq.push(`${id} → ${b?.status?.code}`);
	}
	// Đối chứng lỗi tìm kiếm: một từ khoá chỉ khớp khách tên NULL.
	const thu = await g.k.goiGhi(page, st, 'GET', '/chain-customers/get-all-by-chain', { keyword: g.TIEN_TO, page: 0, size: 20 });
	test.info().annotations.push({ type: 'tìm theo tiền tố', description: JSON.stringify(thu?.status) });
	for (let vong = 0; vong < 20; vong += 1) {
		const ds = (await g.timApi(page, st, g.TIEN_TO)).filter((x) => String(x.customerId) !== giu);
		if (!ds.length) break;
		for (const x of ds) {
			const b = await g.xoaKhachApi(page, st, x.customerId);
			kq.push(`${x.customerCode} → ${b?.status?.code}`);
		}
	}
	// Nhóm đối tượng rác còn hoạt động (19_130_*).
	const n = require('./nhom-ghi');
	const nb = await g.k.goiGhi(page, st, 'GET', `${n.API}/get-list`, { keyword: g.TIEN_TO, page: 0, size: 50 });
	for (const x of (Array.isArray(nb?.data) ? nb.data : (nb?.data?.content ?? [])).filter((x) => String(x.groupName).startsWith(g.TIEN_TO))) {
		const b = await n.xoaNhomApi(page, st, x.groupId);
		kq.push(`nhóm ${x.groupId} → ${b?.status?.code}`);
	}
	test.info().annotations.push({ type: 'đã xoá', description: kq.join(' · ') || '(không có)' });
	expect((await g.timApi(page, st, g.TIEN_TO)).filter((x) => String(x.customerId) !== giu)).toHaveLength(0);
});
