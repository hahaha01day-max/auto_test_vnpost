'use strict';

/**
 * 04_4_070_004 — Bán âm với sản phẩm quản lý theo Serial (vai `shop`; bán bằng phiên phụ `gdv`) — có thể GHI (28/09/2026).
 *
 * Kỳ vọng user chốt 28/09/2026 (A9): SP quản lý serial KHÔNG được bán âm, KỂ CẢ khi bán âm đang bật cho điểm bán — serial phải có
 * thật mới bán được; ghi nguyên văn thông báo chặn.
 * Tiền đề: SP đích danh + serial của làn (`AUTO<làn>_SP_DD`) tồn 0, 0 serial còn tồn (SELECT). Bán âm bật RIÊNG điểm bán làn
 * (`shared/ban-am.js`), khôi phục ở afterAll. 🔴 Nếu hệ thống KHÔNG chặn thì đơn bán thật được tạo (đó là lỗi cần báo).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const ka = require('../../shared/kho-api');
const banAm = require('../../shared/ban-am');

const GOC = path.join(__dirname, '..');
const { d } = ka;

test.describe('04_4 — Bán âm SP serial', () => {
	test.describe.configure({ timeout: 300_000 });
	test.beforeAll(async ({ browser }) => { test.setTimeout(120_000); await banAm.bat(browser, d().diemBan.maShop); });
	test.afterAll(async ({ browser }) => { test.setTimeout(120_000); await banAm.khoiPhuc(browser); });

	test('04_4_070_004 — Bán âm với sản phẩm quản lý theo Serial', async ({ browser }) => {
		const ly = skipReason(loadCaseInput(GOC, '04_4_070_004'));
		test.skip(Boolean(ly), ly ?? '');
		const x = ka.donVi(ka.SP.DD());
		const ten = d().sanPham.sanPhamTheoGiaVon.dichDanh.tenSanPham;
		const ton = ka.tonSo(x);
		const serial = Number(ka.sql(`select count(*) from SHOP_STOCK_SERIAL where shop_id=${d().diemBan.shopId} and variant_id=${x.variantId} and status=1`));
		test.skip(ton > 0 || serial > 0, `Tiền đề: ${ten} phải tồn 0 và 0 serial còn tồn (đang tồn ${ton}, ${serial} serial)`);

		const p = require('../../18_1_ban_hang_tai_quay/tests/pos-18');
		const g = await ka.moGdv(browser, 'gdv');
		try {
			await p.chanIn(g.page);
			await p.moBan(g.page, test);
			const r = await p.them(g.page, ten);
			const coDong = Boolean(r?.dong);
			let tt = null;
			// 🔴 Đo 28/09 làn 5: gợi ý SP serial tồn 0 mang nhãn "Hết hàng", bấm vào KHÔNG vào giỏ và KHÔNG có toast ⇒ chữ chặn duy nhất
			//    là nhãn trên gợi ý (SP thường tồn 0 khi bật bán âm vẫn thêm được — 18_1/ton-am). Gom cả nhãn gợi ý làm "thông báo".
			let thongBao = [r?.thongBao, /Hết hàng/.test(r?.goiY || '') ? `nhãn gợi ý: "${r.goiY}"` : ''].filter(Boolean).join(' | ');
			if (coDong) {
				// Đã vào giỏ ⇒ thử thanh toán; ghi thông báo / hộp chọn serial nếu có.
				tt = await p.thanhToanTienMat(g.page).catch((e) => ({ loi: e.message.slice(0, 200) }));
				thongBao = [thongBao, ...(await g.page.locator('.ant-message-notice, .ant-notification-notice, .ant-modal-confirm').allInnerTexts())].map(p.chuan).filter(Boolean).join(' | ');
			}
			await g.page.waitForTimeout(5_000);
			const tonSau = ka.tonSo(x);
			test.info().annotations.push({ type: 'đo', description: `${ten} tồn ${ton}, ${serial} serial · thêm vào giỏ: ${coDong ? 'ĐƯỢC' : 'không'} (${r?.dong || '-'}) · thanh toán ${JSON.stringify(tt?.draft?.status ?? tt?.loi ?? null)} đơn ${tt?.orderNumber || '-'} · thông báo "${thongBao}" · tồn sau ${tonSau}` });
			expect(tt?.orderId, `🔴 Bán được SP serial khi tồn 0 (đơn ${tt?.orderNumber})`).toBeFalsy();
			expect(tonSau, '🔴 SP serial bị bán âm').toBeGreaterThanOrEqual(0);
			expect(thongBao, 'Chặn mà không có thông báo nguyên văn').not.toBe('');
		} finally {
			await g.page.keyboard.press('Escape').catch(() => null);
			await p.donTab(g.page).catch(() => null);
			await g.dong();
		}
	});
});
