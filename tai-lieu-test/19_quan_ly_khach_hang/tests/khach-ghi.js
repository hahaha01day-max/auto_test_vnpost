'use strict';

/**
 * Helper GHI phân hệ 19 — thêm / sửa / ngừng / xoá khách hàng (làn riêng, dữ liệu rác `A<làn>KH19…`).
 *
 * Trace `vnpost-web` 25/09/2026 (`components/addAndUpdateCustomer/index.jsx`, `pages/customer/**`):
 *
 * | Việc | FE | Endpoint |
 * |---|---|---|
 * | Thêm | Drawer "Thêm khách hàng", footer `Hủy` · `Lưu` | `POST /chain-customer/create` (có shopId) · `/chain-customers/create` (cấp chuỗi) |
 * | Sửa / ngừng / kích hoạt | Drawer "Cập nhật thông tin khách hàng"; ngừng = PUT update kèm `businessStatus` | `PUT /chain-customer(s)/update?customerId=` |
 * | Xoá | Popconfirm "Hành động này sẽ không thể hoàn tác, bạn có chắc chắn muốn xóa?" | `DELETE /chain-customer/delete/{id}` · `/chain-customers/delete?customerId=` |
 * | Chi tiết | `/customer/detail/:id` | `GET /chain-customer/{id}/detail` · `/chain-customers/detail?customerId=` |
 *
 * 🔴 Trùng số điện thoại: BE trả **200** kèm `data.label = "LABEL_PHONE_EXISTED"`, FE tự báo
 *    "Số điện thoại khách hàng đã tồn tại trong cửa hàng" ⇒ 🚫 đừng tin `status.code` là đã tạo.
 * 🔴 Vai `gdv` KHÔNG có quyền `create_customer` (không có nút Thêm) ⇒ case form chạy vai `shop` (CHT).
 */

const { expect } = require('@playwright/test');
const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
const { chuan, dong, khung, taiLaiBoi } = require('./customer-page');

const LAN = process.env.VNPOST_LANE || '0';
const TIEN_TO = `A${LAN}KH19`;

/** Mã + tên + SĐT duy nhất cho một khách rác. SĐT dạng 09xxxxxxxx (khớp PHONE_PATTERN). */
function khachMoi(nhan = '') {
	const t = Date.now().toString();
	const ma = `${TIEN_TO}${t.slice(-7)}`;
	return {
		ma,
		ten: `${ma} AUTO TEST KHONG DUNG${nhan ? ` ${nhan}` : ''}`,
		sdt: `09${t.slice(-8)}`,
	};
}

/** Tạo khách qua API bằng chính phiên của vai (cùng body FE). Trả `data` BE. */
async function taoKhachApi(page, st, kh = khachMoi()) {
	const coShop = Boolean(st.h.shopid);
	const b = await k.goiGhi(page, st, 'POST', coShop ? '/chain-customer/create' : '/chain-customers/create', {}, {
		customerName: kh.ten,
		customerCode: kh.ma,
		// 🔴 FE gửi SĐT dạng `84…` (PhoneInput VN, bỏ dấu +) ⇒ API cũng gửi `84…`, 🚫 không `09…`:
		//    khác định dạng là BE không coi là trùng, case trùng SĐT pass/đỏ oan.
		customerPhone: `84${kh.sdt.slice(1)}`,
		chainId: Number(st.h.chainid),
		status: 1,
		groupIds: [],
		customerRank: 0,
		customerSource: 1,
		...(coShop ? { shopId: Number(st.h.shopid) } : {}),
	});
	expect(String(b?.status?.code), `Tạo khách lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	expect(b?.data?.label, `Tạo khách bị coi là trùng SĐT ${kh.sdt}`).not.toBe('LABEL_PHONE_EXISTED');
	return { ...kh, id: b.data?.customerId ?? b.data?.id, data: b.data };
}

async function chiTietApi(page, st, id) {
	const coShop = Boolean(st.h.shopid);
	return k.goiGhi(page, st, 'GET', coShop ? `/chain-customer/${id}/detail` : '/chain-customers/detail', coShop ? {} : { customerId: id });
}

/** Xoá khách rác (dọn). Bỏ qua lỗi — dọn không được thì báo ở annotation. */
async function xoaKhachApi(page, st, id) {
	if (!id) return null;
	const coShop = Boolean(st.h.shopid);
	return coShop
		? k.goiGhi(page, st, 'DELETE', `/chain-customer/delete/${id}`)
		: k.goiGhi(page, st, 'DELETE', '/chain-customers/delete', { customerId: id });
}

/**
 * Tìm khách theo từ khoá bằng API danh sách của vai (trả mảng dòng) — đúng tham số FE (`pages/customer/index.jsx`):
 * cấp điểm bán `keyword · page_num · page_size · shopId`, cấp chuỗi `keyword · page · size`.
 */
async function timApi(page, st, tuKhoa) {
	const coShop = Boolean(st.h.shopid);
	const b = coShop
		? await k.goiGhi(page, st, 'GET', `/chain-customer/get-all-in-chain-and-shop/${st.h.chainid}`, {
				keyword: tuKhoa, page_num: 0, page_size: 20, shopId: st.h.shopid, chainId: st.h.chainid, sort: 'createdDate,DESC',
			})
		: await k.goiGhi(page, st, 'GET', '/chain-customers/get-all-by-chain', { keyword: tuKhoa, page: 0, size: 20, sort: 'createdDate,DESC' });
	expect(String(b?.status?.code), `Tìm khách lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	const ds = Array.isArray(b?.data) ? b.data : (b?.data?.content ?? []);
	return ds.filter((x) => chuan(`${x.customerCode} ${x.customerName} ${x.customerPhone}`).includes(tuKhoa));
}

/**
 * id khách theo MÃ bằng SELECT thẳng DB (chỉ đọc) — dùng để DỌN khi API tìm kiếm hỏng
 * (🔴 khách tên NULL do nhập Excel làm `get-all-by-chain` trả SSHOP-500 — đo 25/09/2026).
 * Không có `all.env` / `mysql` ⇒ trả [].
 */
function selectDb(sql) {
	const fs = require('node:fs');
	const path = require('node:path');
	const env = path.join(__dirname, '..', '..', '..', '..', 'all.env');
	if (!fs.existsSync(env) || !/^\s*SELECT\b/i.test(sql)) return [];
	const lay = (k) => (fs.readFileSync(env, 'utf8').match(new RegExp(`^${k}=(.*)$`, 'm')) || [])[1];
	try {
		const out = require('node:child_process').execFileSync('mysql', [
			'--skip-ssl', '--connect-timeout=15', '-h', '103.109.43.112', '-u', lay('VNPOST_DATABASE_USERNAME'), `-p${lay('VNPOST_DATABASE_PASSWORD')}`, '-N', '-B', '-e', sql,
		], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000 });
		return out.split('\n').filter(Boolean).map((d) => d.split('\t'));
	} catch {
		return [];
	}
}

function idTheoMaDb(ma) {
	if (!/^[A-Za-z0-9_]+$/.test(ma)) return [];
	return selectDb(`SELECT customer_id FROM VNPOST_CORE.CHAIN_CUSTOMER WHERE customer_code='${ma}' AND status<>0`).map((d) => d[0]);
}

// ───────────── Giao diện ─────────────

const drawer = (page) => page.locator('.ant-drawer-open').last();

/** Ô của Form.Item theo nhãn CHÍNH XÁC (Mã khách hàng ≠ "Mã khách hàng (Chỉ dành cho…)"). */
function oTheoNhan(hop, nhan) {
	return hop
		.locator('.ant-form-item')
		.filter({ has: hop.page().locator('.ant-form-item-label label', { hasText: new RegExp(`^\\s*${nhan}\\s*$`) }) })
		.first();
}

/** Lỗi validate đang hiện của Form.Item có nhãn `nhan`. */
async function loiO(hop, nhan) {
	const o = oTheoNhan(hop, nhan).locator('.ant-form-item-explain-error');
	await o.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => null);
	return chuan((await o.allInnerTexts()).join(' | '));
}

async function moFormThem(page) {
	const nut = khung(page).getByRole('button', { name: 'Thêm khách hàng' });
	await expect(nut, 'Vai này không có nút "Thêm khách hàng" (thiếu quyền create_customer?)').toBeVisible({ timeout: 20_000 });
	await nut.click();
	const hop = drawer(page);
	await expect(hop).toContainText('Thêm khách hàng', { timeout: 15_000 });
	await expect(oTheoNhan(hop, 'Tên khách hàng')).toBeVisible({ timeout: 15_000 });
	return hop;
}

/** Điền các ô cơ bản; `null` = để nguyên, `''` = xoá trắng. */
async function dienForm(hop, { ten = null, ma = null, sdt = null, email = null } = {}) {
	const dien = async (nhan, v) => {
		if (v === null) return;
		const o = oTheoNhan(hop, nhan).locator('input').first();
		// 🔴 `fill('')` KHÔNG xoá được ô PhoneInput (giữ số cũ, gõ tiếp là nối đuôi) ⇒ chọn hết + Backspace.
		await o.click();
		await o.press('ControlOrMeta+a');
		await o.press('Backspace');
		if (v !== '') await o.pressSequentially(v, { delay: 5 });
		else await expect(o, `Không xoá trắng được ô ${nhan}`).toHaveValue('');
	};
	await dien('Tên khách hàng', ten);
	await dien('Mã khách hàng', ma);
	await dien('Số điện thoại', sdt);
	await dien('Nhập Email', email);
}

/** Bấm "Lưu" của drawer; trả response ghi (create/update) hoặc null khi không có request. */
async function bamLuu(page, hop, { timeout = 30_000 } = {}) {
	const cho = page
		.waitForResponse((r) => /chain-customers?\/(create|update)/.test(r.url()) && r.request().method() !== 'GET', { timeout })
		.catch(() => null);
	await hop.getByRole('button', { name: 'Lưu', exact: true }).click();
	return cho;
}

/** Thông báo antd đang hiện (message + notification), gộp một chuỗi. */
async function thongBao(page, { cho = 4_000 } = {}) {
	const tb = page.locator('.ant-message-notice, .ant-notification-notice');
	await tb.first().waitFor({ state: 'visible', timeout: cho }).catch(() => null);
	return chuan((await tb.allInnerTexts()).join(' | '));
}

/** Mở chi tiết khách bằng tìm trên danh sách rồi bấm tên. */
async function moChiTiet(page, tuKhoa) {
	await taiLaiBoi(page, async () => {
		await khung(page).locator('input[placeholder="Tên / số điện thoại khách hàng"]').first().fill(tuKhoa);
	});
	const d = dong(page).filter({ hasText: tuKhoa }).first();
	await expect(d, `Danh sách không ra khách "${tuKhoa}"`).toBeVisible({ timeout: 20_000 });
	await d.locator('a').first().click();
	await expect(page).toHaveURL(/\/customer\/detail\//, { timeout: 20_000 });
	await page.waitForTimeout(3_000);
	return Number(page.url().match(/detail\/(\d+)/)?.[1]);
}

module.exports = {
	LAN, TIEN_TO, khachMoi, idTheoMaDb, selectDb, taoKhachApi, chiTietApi, xoaKhachApi, timApi,
	drawer, oTheoNhan, loiO, moFormThem, dienForm, bamLuu, thongBao, moChiTiet, k,
};
