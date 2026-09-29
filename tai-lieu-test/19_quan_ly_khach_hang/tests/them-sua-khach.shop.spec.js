'use strict';

/**
 * 19 · Thêm / sửa khách hàng qua giao diện — vai `shop` (CHT điểm bán của làn).
 *
 * 🔴 Ghi THẬT: mỗi case tự tạo khách rác `A<làn>KH19…` rồi XOÁ ở `finally` (xoá qua API cùng phiên).
 * 🔴 Các case kịch bản ghi vai `gdv` (020_007–012, 030_004–006, 120_006/007) chạy vai `shop`:
 *    GDV không có quyền `create_customer` / `update_customer` ⇒ không mở được form (xem 19_020_006).
 */

const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, chuan, dong, khung, moMan, tim } = require('./customer-page');
const g = require('./khach-ghi');

const GOC = path.join(__dirname, '..');
const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

/** PNG thật (nhiễu ngẫu nhiên, không nén được) cỡ w×h RGB. */
function pngNhieu(w, h) {
	const zlib = require('node:zlib');
	const crc = (b) => {
		let c = ~0;
		for (const x of b) {
			c ^= x;
			for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
		}
		return (~c) >>> 0;
	};
	const khoi = (loai, du) => {
		const l = Buffer.alloc(4); l.writeUInt32BE(du.length);
		const t = Buffer.concat([Buffer.from(loai), du]);
		const c = Buffer.alloc(4); c.writeUInt32BE(crc(t));
		return Buffer.concat([l, t, c]);
	};
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
	const tho = Buffer.alloc((w * 3 + 1) * h);
	for (let i = 0; i < tho.length; i += 1) tho[i] = i % (w * 3 + 1) === 0 ? 0 : (Math.random() * 256) | 0;
	return Buffer.concat([
		Buffer.from('89504e470d0a1a0a', 'hex'), khoi('IHDR', ihdr), khoi('IDAT', zlib.deflateSync(tho, { level: 0 })), khoi('IEND', Buffer.alloc(0)),
	]);
}

let st;
const rac = [];

test.describe('19 · Thêm / sửa khách (vai shop, GHI THẬT)', () => {
	test.beforeEach(async ({ page }) => {
		st = g.k.batHeader(page);
		await moMan(page, VAI);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	});

	test.afterEach(async ({ page }) => {
		// Dọn mọi khách rác case vừa tạo (kể cả khi case đỏ giữa chừng).
		while (rac.length) {
			const id = rac.pop();
			const b = await g.xoaKhachApi(page, st, id).catch((e) => ({ status: { message: e.message } }));
			ghiChu('dọn khách', `${id} → ${JSON.stringify(b?.status)}`);
		}
	});

	test('19_020_001 — Thêm khách hàng mới', async ({ page }) => {
		chanNeuTat('19_020_001');
		const kh = g.khachMoi('020_001');
		const hop = await g.moFormThem(page);
		await g.dienForm(hop, kh);
		const res = await g.bamLuu(page, hop);
		expect(res, 'Bấm Lưu mà không có request tạo khách').toBeTruthy();
		const b = await res.json();
		if (b?.data?.customerId ?? b?.data?.id) rac.push(b.data.customerId ?? b.data.id);
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		expect(await g.thongBao(page)).toContain('Thêm khách hàng thành công');
		await expect(hop, 'Lưu xong mà màn nhập chưa đóng').toBeHidden({ timeout: 10_000 });
		// Khách vừa lập đứng ĐẦU danh sách (danh sách tải lại sau khi lưu).
		await page.waitForTimeout(2_500);
		expect(chuan(await dong(page).first().innerText()), 'Khách vừa thêm không đứng đầu danh sách').toContain(kh.ma);
	});

	test('19_010_004 — Danh sách hiển thị đúng khách vừa thêm', async ({ page }) => {
		chanNeuTat('19_010_004');
		const kh = g.khachMoi('010_004');
		const hop = await g.moFormThem(page);
		await g.dienForm(hop, kh);
		const b = await (await g.bamLuu(page, hop)).json();
		if (b?.data?.customerId) rac.push(b.data.customerId);
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		await tim(page, kh.ma);
		const d = dong(page).filter({ hasText: kh.ma });
		await expect(d, `Tìm mã ${kh.ma} không ra khách vừa thêm`).toHaveCount(1, { timeout: 20_000 });
		const chu = chuan(await d.innerText());
		expect(chu, 'Sai tên').toContain(kh.ten);
		expect(chu.replace(/\D/g, ''), 'Sai số điện thoại').toContain(kh.sdt.slice(1));
	});

	test('19_020_003 — Chặn thêm khách trùng số điện thoại tại điểm bán', async ({ page }) => {
		chanNeuTat('19_020_003');
		const a = await g.taoKhachApi(page, st, g.khachMoi('020_003 A'));
		rac.push(a.id);
		// Đối chứng: API tìm ra khách A ⇒ phép "B không có trong danh sách" bên dưới mới có nghĩa.
		expect(await g.timApi(page, st, a.ma), 'API tìm không ra khách A vừa tạo').toHaveLength(1);
		const b = g.khachMoi('020_003 B');
		const hop = await g.moFormThem(page);
		await g.dienForm(hop, { ...b, sdt: a.sdt });
		const res = await g.bamLuu(page, hop);
		const body = res ? await res.json() : null;
		if (body?.data?.customerId && body?.data?.label !== 'LABEL_PHONE_EXISTED') rac.push(body.data.customerId);
		const tb = await g.thongBao(page);
		ghiChu('nguyên văn', tb);
		ghiChu('BE', JSON.stringify({ status: body?.status, label: body?.data?.label }));
		expect(tb, 'Trùng SĐT mà không báo lỗi').toMatch(/đã tồn tại/);
		expect(await g.timApi(page, st, b.ma), 'Trùng SĐT mà khách B VẪN được lưu').toHaveLength(0);
	});

	for (const [id, nhan, gt, mongDoi] of [
		['19_020_007', 'Tên khách hàng', { ten: '' }, 'Vui lòng nhập tên khách hàng'],
		['19_020_008', 'Số điện thoại', { sdt: '' }, 'Vui lòng nhập số điện thoại khách hàng'],
		['19_020_009', 'Số điện thoại', { sdt: '09ab12' }, 'Số điện thoại không hợp lệ'],
		['19_020_010', 'Nhập Email', { email: 'auto.test.khong-a-cong' }, 'Email không đúng định dạng!'],
		['19_020_011', 'Số điện thoại', { sdt: '          ' }, 'Vui lòng nhập số điện thoại khách hàng'],
	]) {
		test(`${id} — validate ô ${nhan} khi thêm mới`, async ({ page }) => {
			chanNeuTat(id);
			const { daGoi } = await chanGhi(page);
			const hop = await g.moFormThem(page);
			await g.dienForm(hop, { ...g.khachMoi(id), ...gt });
			await hop.getByRole('button', { name: 'Lưu', exact: true }).click();
			const loi = await g.loiO(hop, nhan);
			ghiChu('nguyên văn lỗi', loi || '(không có lỗi ở ô)');
			ghiChu('thông báo chung', await g.thongBao(page, { cho: 2_000 }));
			expect(daGoi, `Form lỗi mà vẫn gửi request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
			expect(loi, `Ô "${nhan}" không báo lỗi`).toContain(mongDoi);
			await expect(hop, 'Form lỗi mà drawer đóng').toBeVisible();
		});
	}

	test('19_020_012 — Tên khách hàng có khoảng trắng đầu cuối', async ({ page }) => {
		chanNeuTat('19_020_012');
		const kh = g.khachMoi('020_012');
		const hop = await g.moFormThem(page);
		await g.dienForm(hop, { ...kh, ten: `   ${kh.ten}   ` });
		const b = await (await g.bamLuu(page, hop)).json();
		if (b?.data?.customerId) rac.push(b.data.customerId);
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		const ct = await g.chiTietApi(page, st, b.data.customerId);
		const ten = ct?.data?.customerName;
		ghiChu('tên lưu ở BE', JSON.stringify(ten));
		expect(ten, 'Tên KHÔNG được cắt khoảng trắng đầu/cuối').toBe(kh.ten);
	});

	test('19_020_006 — Huỷ thao tác thêm khách hàng giữa chừng (vai shop)', async ({ page }) => {
		chanNeuTat('19_020_006');
		const { daGoi } = await chanGhi(page);
		const kh = g.khachMoi('020_006');
		const hop = await g.moFormThem(page);
		await g.dienForm(hop, kh);
		await hop.getByRole('button', { name: 'Hủy', exact: true }).click();
		await expect(hop).toBeHidden({ timeout: 10_000 });
		expect(daGoi, `Huỷ mà vẫn gửi request: ${daGoi.join(' ; ')}`).toEqual([]);
	});

	test('19_030_001 — Cập nhật hồ sơ khách hàng', async ({ page }) => {
		chanNeuTat('19_030_001');
		const a = await g.taoKhachApi(page, st, g.khachMoi('030_001'));
		rac.push(a.id);
		await g.moChiTiet(page, a.ma);
		await khung(page).getByRole('button', { name: 'Sửa thông tin' }).click();
		const hop = g.drawer(page);
		await expect(hop).toContainText('Cập nhật thông tin khách hàng', { timeout: 15_000 });
		const tenMoi = `${a.ma} DA SUA`;
		await g.dienForm(hop, { ten: tenMoi });
		const b = await (await g.bamLuu(page, hop)).json();
		expect(String(b?.status?.code), JSON.stringify(b?.status)).toBe('200');
		expect(await g.thongBao(page)).toContain('Cập nhật thành công');
		await expect(hop).toBeHidden({ timeout: 10_000 });
		await expect(khung(page), 'Chi tiết chưa hiện tên mới').toContainText(tenMoi, { timeout: 15_000 });
		expect((await g.chiTietApi(page, st, a.id))?.data?.customerName, 'BE chưa lưu tên mới').toBe(tenMoi);
	});

	test('19_030_002 — Đổi sang số điện thoại đã có khách khác dùng bị chặn', async ({ page }) => {
		chanNeuTat('19_030_002');
		const a = await g.taoKhachApi(page, st, g.khachMoi('030_002 A'));
		rac.push(a.id);
		const b = await g.taoKhachApi(page, st, g.khachMoi('030_002 B'));
		rac.push(b.id);
		await g.moChiTiet(page, a.ma);
		await khung(page).getByRole('button', { name: 'Sửa thông tin' }).click();
		const hop = g.drawer(page);
		await expect(hop).toContainText('Cập nhật thông tin khách hàng', { timeout: 15_000 });
		await g.dienForm(hop, { sdt: b.sdt });
		const res = await g.bamLuu(page, hop);
		const body = res ? await res.json() : null;
		const tb = await g.thongBao(page);
		ghiChu('nguyên văn', tb);
		ghiChu('BE', JSON.stringify({ status: body?.status, label: body?.data?.label }));
		const sau = (await g.chiTietApi(page, st, a.id))?.data?.customerPhone;
		expect(String(sau), 'Khách A ĐÃ bị đổi sang SĐT của khách B').not.toContain(b.sdt.slice(1));
		expect(tb, 'Đổi sang SĐT trùng mà không báo lỗi').toMatch(/đã tồn tại|trùng/);
	});

	for (const [id, nhan, gt, mongDoi] of [
		['19_030_004', 'Tên khách hàng', { ten: '' }, 'Vui lòng nhập tên khách hàng'],
		['19_030_005', 'Số điện thoại', { sdt: '' }, 'Vui lòng nhập số điện thoại khách hàng'],
		['19_030_006', 'Nhập Email', { email: 'auto.test.khong-a-cong' }, 'Email không đúng định dạng!'],
	]) {
		test(`${id} — validate ô ${nhan} khi chỉnh sửa`, async ({ page }) => {
			chanNeuTat(id);
			const a = await g.taoKhachApi(page, st, g.khachMoi(id));
			rac.push(a.id);
			await g.moChiTiet(page, a.ma);
			const { daGoi } = await chanGhi(page);
			await khung(page).getByRole('button', { name: 'Sửa thông tin' }).click();
			const hop = g.drawer(page);
			await expect(hop).toContainText('Cập nhật thông tin khách hàng', { timeout: 15_000 });
			await g.dienForm(hop, gt);
			await hop.getByRole('button', { name: 'Lưu', exact: true }).click();
			const loi = await g.loiO(hop, nhan);
			ghiChu('nguyên văn lỗi', loi || '(không có lỗi ở ô)');
			expect(daGoi, `Form lỗi mà vẫn gửi request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
			expect(loi, `Ô "${nhan}" không báo lỗi`).toContain(mongDoi);
		});
	}

	test('19_030_003 — Huỷ chỉnh sửa khách hàng giữa chừng', async ({ page }) => {
		chanNeuTat('19_030_003');
		const a = await g.taoKhachApi(page, st, g.khachMoi('030_003'));
		rac.push(a.id);
		await g.moChiTiet(page, a.ma);
		const { daGoi } = await chanGhi(page);
		await khung(page).getByRole('button', { name: 'Sửa thông tin' }).click();
		const hop = g.drawer(page);
		await expect(hop).toContainText('Cập nhật thông tin khách hàng', { timeout: 15_000 });
		await g.dienForm(hop, { ten: `${a.ma} KHONG LUU` });
		await hop.getByRole('button', { name: 'Hủy', exact: true }).click();
		await expect(hop).toBeHidden({ timeout: 10_000 });
		expect(daGoi).toEqual([]);
		expect((await g.chiTietApi(page, st, a.id))?.data?.customerName).toBe(a.ten);
	});

	for (const [id, tep, mongDoi] of [
		['19_120_006', 'anh-1mb.png', 'Ảnh up không được vượt quá giới hạn 800Kb!'],
		['19_120_007', 'khong-phai-anh.txt', 'Bạn chỉ có thể tải lên file có định dạng image!'],
	]) {
		test(`${id} — tải ${tep} vào ô ảnh đại diện`, async ({ page }, info) => {
			chanNeuTat(id);
			const duong = path.join(info.outputDir, tep);
			fs.mkdirSync(info.outputDir, { recursive: true });
			if (tep.endsWith('.png')) fs.writeFileSync(duong, pngNhieu(600, 600)); // ảnh THẬT ~1,05MB (> 800Kb, < 2MB)
			else fs.writeFileSync(duong, 'auto test — không phải ảnh');
			ghiChu('kích thước tệp', `${fs.statSync(duong).size} byte`);
			const { daGoi } = await chanGhi(page);
			await page.route(/upload|file|image|drive/i, (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
			const hop = await g.moFormThem(page);
			const oTep = hop.locator('input[type="file"]').first();
			expect(await oTep.count(), 'Form thêm khách không có ô tải ảnh').toBeGreaterThan(0);
			await oTep.setInputFiles(duong);
			const tb = await g.thongBao(page);
			ghiChu('nguyên văn', tb || '(không có thông báo)');
			// 🔴 Ô ảnh bọc `antd-img-crop`: ảnh lọt kiểm tra là hộp "Chỉnh sửa ảnh" mở ra ⇒ ghi lại làm bằng chứng.
			const crop = page.getByRole('dialog').filter({ hasText: 'Chỉnh sửa ảnh' });
			ghiChu('hộp cắt ảnh mở', String(await crop.isVisible().catch(() => false)));
			expect(tb).toContain(mongDoi);
			expect(daGoi, `Tệp bị chặn mà vẫn có request ghi: ${daGoi.join(' ; ')}`).toEqual([]);
		});
	}
});
