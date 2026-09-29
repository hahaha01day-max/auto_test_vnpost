'use strict';

/**
 * 13_3 · 030 — Đặt hàng nhà cung cấp (PO) ở vai `tct`: màn danh sách, tạo / sửa / huỷ, in, NCC xác nhận, nhập kho.
 *
 * Nguồn (vnpost-web — xem fe-moc.json): `features/purchaseOrder/pages/{PurchaseOrderListPage,PurchaseOrderFormPage,
 * PurchaseOrderDetailPage}.jsx`, `components/printV2/usePrint.js` (react-to-print → iframe in).
 * Kịch bản có 2 bộ mã trùng nội dung (030_003–029 từ sheet NCC, 030_031–059 từ sheet FUNC) ⇒ mỗi cặp dùng CHUNG
 * một phép kiểm (`cap`), mỗi mã vẫn chạy và báo cáo riêng.
 * PO đặt về kho TCT (user cho phép 24/09/2026). 🔴 PO KHÔNG xoá được ⇒ phiếu `AUTO TEST 13_3` ở lại.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const po = require('./po-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const ly = skipReason(loadCaseInput(GOC, id));
	test.skip(Boolean(ly), ly ?? '');
};
const ghi = (info, s) => info.annotations.push({ type: 'đo', description: String(s).slice(0, 600) });

test.describe('13_3 · 030 đặt hàng NCC (tct)', () => {
	const kiem_030_001 = async (page, info) => {
		await po.moDs(page);
		const k = po.khung(page);
		await expect(page.getByText('Đặt hàng nhà cung cấp').first()).toBeVisible();
		const nhan = (await k.locator('.ant-form-item-label').allInnerTexts()).map(po.chuan);
		const cot = (await k.locator('.ant-table-thead th').allInnerTexts()).map(po.chuan).filter(Boolean);
		ghi(info, `bộ lọc: ${nhan.join(' · ')} | cột: ${cot.join(' · ')}`);
		for (const b of ['Tìm kiếm', 'Xóa lọc']) await expect(k.getByRole('button', { name: b })).toBeVisible();
		await expect(page.getByRole('button', { name: /Tạo đơn đặt hàng/ })).toBeVisible();
		for (const c of ['STT', 'Mã phiếu', 'Cửa hàng / kho', 'Nhà cung cấp', 'Ngày gửi', 'Ngày nhập dự kiến', 'Trạng thái']) expect(cot, `Thiếu cột "${c}"`).toContain(c);
		// QC: bộ lọc Từ khóa · Trạng thái · Khoảng thời gian · Nhà cung cấp · Điểm bán/Kho.
		for (const l of ['Mã phiếu', 'Trạng thái', 'Khoảng thời gian', 'Nhà cung cấp']) expect(nhan, `Thiếu bộ lọc "${l}"`).toContain(l);
		expect.soft(nhan, 'Thiếu bộ lọc "Điểm bán / kho"').toContain('Điểm bán / kho');
	};
	test('13_3_030_001 — Màn Đặt hàng NCC hiện đủ bộ lọc, nút, cột', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_001');
		test.setTimeout(300_000);
		await kiem_030_001(page, info);
	});
	test('13_3_030_030 — Màn Đặt hàng NCC hiện đủ bộ lọc, nút, cột', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_030');
		test.setTimeout(300_000);
		await kiem_030_001(page, info);
	});

	const kiem_030_003 = async (page, info) => {
		const kq = await po.taoPO(page, 'Lưu nháp');
		ghi(info, `${kq.ma} · ${kq.tb}`);
		expect(await po.trangThai(page, kq.ma)).toBe('Bản nháp');
	};
	test('13_3_030_003 — Tạo phiếu đặt hàng NCC nháp', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_003');
		test.setTimeout(300_000);
		await kiem_030_003(page, info);
	});
	test('13_3_030_032 — Tạo phiếu đặt hàng NCC nháp', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_032');
		test.setTimeout(300_000);
		await kiem_030_003(page, info);
	});

	const kiem_010_001 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp');
		ghi(info, `${kq.ma} · ${kq.tb} · response status ${kq.body?.data?.status}`);
		expect(await po.trangThai(page, kq.ma)).toBe('Đã gửi NCC');
	};
	test('13_3_010_001 — Tạo phiếu đặt hàng NCC (Gửi nhà cung cấp)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_010_001');
		test.setTimeout(300_000);
		await kiem_010_001(page, info);
	});
	test('13_3_030_031 — Tạo phiếu đặt hàng NCC (Gửi nhà cung cấp)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_031');
		test.setTimeout(300_000);
		await kiem_010_001(page, info);
	});

	const kiem_030_002 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 2 });
		await po.moChiTiet(page, kq.ma);
		const noi = po.chuan(await po.khung(page).innerText());
		ghi(info, noi);
		for (const t of ['Kho đặt hàng', 'Mã phiếu', kq.ma, 'Đã gửi NCC', 'Kho nhận hàng', 'Nhà cung cấp', po.NCC(), 'Ngày nhập dự kiến', 'Phiếu đề xuất nhập hàng', 'Ghi chú', 'Tổng giá trị đặt hàng', 'Danh sách sản phẩm', po.SP().tenSanPham]) {
			expect(noi, `Chi tiết thiếu "${t}"`).toContain(t);
		}
		expect(noi, 'Tổng giá trị ≠ 2 × 60.000').toMatch(/Tổng giá trị đặt hàng 120\.000/);
		expect(noi, 'Ghi chú đã nhập không hiện ở chi tiết').toContain(po.GHI_CHU);
	};
	test('13_3_030_002 — Xem chi tiết phiếu đặt hàng NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_002');
		test.setTimeout(300_000);
		await kiem_030_002(page, info);
	});
	test('13_3_030_035 — Xem chi tiết phiếu đặt hàng NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_035');
		test.setTimeout(300_000);
		await kiem_030_002(page, info);
	});

	const kiem_030_004 = async (page, info) => {
		const kq = await po.taoPO(page, 'Lưu nháp');
		await po.moChiTiet(page, kq.ma);
		await page.getByRole('button', { name: 'Sửa phiếu' }).click();
		await expect(po.fi(page, 'Ghi chú').locator('textarea')).toBeVisible({ timeout: 30_000 });
		const moi = `${po.GHI_CHU} sửa ${Date.now() % 100000}`;
		await po.fi(page, 'Ghi chú').locator('textarea').fill(moi);
		const r = po.bangSp(page).locator('tbody tr.ant-table-row').first();
		await r.locator('.ant-input-number-input').first().fill('4');
		await r.locator('.ant-input-number-input').first().press('Tab');
		const tong = po.chuan(await page.locator('.ant-pro-card').filter({ hasText: 'Tổng giá trị đặt hàng' }).first().innerText());
		ghi(info, `màn sửa: ${tong}`);
		await expect(page.locator('.ant-pro-footer-bar button').filter({ hasText: /^Lưu nháp$/ }), `Màn sửa PO nháp khoá nút Lưu nháp (giá về 0 — ${tong.slice(0, 60)})`).toBeEnabled();
		const l = await po.luu(page, 'Lưu nháp');
		ghi(info, `${kq.ma} · ${l.tb}`);
		expect(l.tb).toContain('Cập nhật thành công');
		await po.moChiTiet(page, kq.ma);
		const noi = po.chuan(await po.khung(page).innerText());
		expect(noi).toContain(moi);
		expect(noi, 'SL sửa 4 ⇒ tổng 240.000').toMatch(/Tổng giá trị đặt hàng 240\.000/);
		expect(noi).toContain('Bản nháp');
	};
	test('13_3_030_004 — Chỉnh sửa phiếu đặt hàng nháp', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_004');
		test.setTimeout(300_000);
		await kiem_030_004(page, info);
	});
	test('13_3_030_033 — Chỉnh sửa phiếu đặt hàng nháp', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_033');
		test.setTimeout(300_000);
		await kiem_030_004(page, info);
	});

	async function huy(page, info, nhan) {
		const kq = await po.taoPO(page, nhan);
		await po.moChiTiet(page, kq.ma);
		await page.getByRole('button', { name: 'Huỷ phiếu' }).click();
		const tb = await po.chuan(await (async () => {
			const t = await require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi').thongBaoQuanh(page, () => page.locator('.ant-popover:visible .ant-btn-dangerous, .ant-popover:visible .ant-btn-primary').last().click());
			return t;
		})());
		ghi(info, `${kq.ma} · ${tb}`);
		expect(tb).toContain('Đã hủy phiếu đặt hàng');
		expect(await po.trangThai(page, kq.ma)).toBe('Đã huỷ');
	}
	test('13_3_030_005 — Huỷ phiếu đặt hàng nháp', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_005');
		test.setTimeout(300_000);
		await huy(page, info, 'Lưu nháp');
	});
	test('13_3_030_034 — Huỷ phiếu đặt hàng nháp', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_034');
		test.setTimeout(300_000);
		await huy(page, info, 'Lưu nháp');
	});
	test('13_3_030_006 — Huỷ phiếu đặt hàng NCC chưa xác nhận', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_006');
		test.setTimeout(300_000);
		await huy(page, info, 'Gửi nhà cung cấp');
	});
	test('13_3_030_036 — Huỷ phiếu đặt hàng NCC chưa xác nhận', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_036');
		test.setTimeout(300_000);
		await huy(page, info, 'Gửi nhà cung cấp');
	});

	const kiem_030_007 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp');
		await po.moChiTiet(page, kq.ma);
		// react-to-print dựng iframe, gọi print rồi GỠ iframe ngay ⇒ chép nội dung iframe ra window lúc nó vừa nạp.
		await page.evaluate(() => {
			window.__banIn = '';
			new MutationObserver((ms) => {
				for (const m of ms) for (const n of m.addedNodes) {
					if (n.tagName !== 'IFRAME') continue;
					const chep = () => { try { const t = n.contentDocument?.body?.innerText || ''; if (t) window.__banIn = t; } catch (_) {} };
					n.addEventListener('load', chep);
					setTimeout(chep, 300); setTimeout(chep, 800);
				}
			}).observe(document.body, { childList: true, subtree: true });
		});
		await page.getByRole('button', { name: /In phiếu/ }).click();
		await expect.poll(async () => po.chuan(await page.evaluate(() => window.__banIn)), { message: 'Bản in không có mã phiếu', timeout: 15_000 }).toContain(kq.ma);
		const noi = po.chuan(await page.evaluate(() => window.__banIn));
		ghi(info, noi);
		expect(noi).toContain(po.NCC());
		expect(noi).toContain(po.SP().tenSanPham);
	};
	test('13_3_030_007 — Kiểm tra in phiếu đặt hàng', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_007');
		test.setTimeout(300_000);
		await kiem_030_007(page, info);
	});
	test('13_3_030_037 — Kiểm tra in phiếu đặt hàng', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_037');
		test.setTimeout(300_000);
		await kiem_030_007(page, info);
	});

	const kiem_030_008 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 3 });
		await po.moChiTiet(page, kq.ma);
		const x = await po.nccXacNhan(page);
		ghi(info, JSON.stringify(x));
		expect(x.tb).toContain('Đã xác nhận nhà cung cấp đồng ý');
		expect(x.gui.items[0].confirmedQuantity).toBe(3);
		expect(await po.trangThai(page, kq.ma)).toBe('NCC xác nhận');
	};
	test('13_3_030_008 — Kiểm tra xác nhận phiếu đặt hàng (NCC xác nhận)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_008');
		test.setTimeout(300_000);
		await kiem_030_008(page, info);
	});
	test('13_3_030_038 — Kiểm tra xác nhận phiếu đặt hàng (NCC xác nhận)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_038');
		test.setTimeout(300_000);
		await kiem_030_008(page, info);
	});

	const kiem_030_009 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 3 });
		await po.moChiTiet(page, kq.ma);
		expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
		await page.reload();
		await page.getByText('Danh sách sản phẩm').first().waitFor();
		const nk = await po.nhapKho(page);
		ghi(info, `${kq.ma} · ${nk.tb} · ${JSON.stringify(nk.body?.data)?.slice(0, 200)}`);
		expect(nk.tb).toContain('Nhập kho thành công');
		expect(Number(nk.body?.data?.totalAmount), 'Giá trị phiếu nhập ≠ 3 × 60.000').toBe(180000);
		await po.moChiTiet(page, kq.ma);
		const r = po.chuan(await page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: po.SP().tenSanPham }).first().innerText());
		expect(r, 'Cột Đặt hàng / NCC xác nhận / Đã nhập kho ≠ 3 3 3').toMatch(/Cái 3 3 3\b/);
		expect(await po.trangThai(page, kq.ma)).toBe('Đã giao');
	};
	test('13_3_030_009 — Kiểm tra nhập kho từ phiếu đặt hàng NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_009');
		test.setTimeout(300_000);
		await kiem_030_009(page, info);
	});
	test('13_3_030_039 — Kiểm tra nhập kho từ phiếu đặt hàng NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_039');
		test.setTimeout(300_000);
		await kiem_030_009(page, info);
	});

	const kiem_030_011 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp');
		await po.moChiTiet(page, kq.ma);
		expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
		await page.reload();
		await page.getByText('Danh sách sản phẩm').first().waitFor();
		await expect(page.getByRole('button', { name: 'Sửa phiếu' }), 'PO NCC xác nhận vẫn có nút Sửa phiếu').toHaveCount(0);
		await po.moDs(page);
		await po.tim(page, kq.ma);
		const nut = po.dong(page).filter({ hasText: kq.ma }).first().locator('button:has(.anticon-edit)');
		await expect(nut, 'Nút sửa ở danh sách không bị khoá').toBeDisabled();
		ghi(info, kq.ma);
	};
	test('13_3_030_011 — Không cho sửa PO NCC đã xác nhận', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_011');
		test.setTimeout(300_000);
		await kiem_030_011(page, info);
	});
	test('13_3_030_041 — Không cho sửa PO NCC đã xác nhận', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_041');
		test.setTimeout(300_000);
		await kiem_030_011(page, info);
	});

	const kiem_030_021 = async (page, info) => {
		await po.moTaoDayDu(page);
		const r = po.bangSp(page).locator('tbody tr.ant-table-row').first();
		const o = await r.locator('input').evaluateAll((l) => l.map((e) => `${e.className.slice(0, 25)}|${e.value}|${e.disabled || e.readOnly}`));
		ghi(info, `ô nhập của dòng: ${o.join(' · ')} | dòng: ${po.chuan(await r.innerText())}`);
		expect(po.chuan(await r.innerText()), 'Giá không theo bảng giá NCC 60.000').toContain('60.000');
		// Ô nhập duy nhất được sửa là Số lượng (+ select ĐVT) — không có ô giá sửa được.
		await expect(r.getByPlaceholder('Nhập giá')).toHaveCount(0);
		const soOSua = await r.locator('.ant-input-number-input:not([disabled]):not([readonly])').count();
		expect(soOSua, 'Có nhiều hơn 1 ô số sửa được (ngoài Số lượng) — giá có thể đang cho sửa').toBe(1);
	};
	test('13_3_030_021 — Không cho chỉnh giá sản phẩm khác bảng giá', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_021');
		test.setTimeout(300_000);
		await kiem_030_021(page, info);
	});
	test('13_3_030_051 — Không cho chỉnh giá sản phẩm khác bảng giá', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_051');
		test.setTimeout(300_000);
		await kiem_030_021(page, info);
	});

	const kiem_030_019 = async (page, info) => {
		const bt = require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamBienThe;
		await po.moTaoDayDu(page);
		// Thay SP mặc định bằng SP biến thể.
		await po.bangSp(page).locator('tbody tr.ant-table-row').first().locator('button:has(.anticon-delete)').click().catch(() => {});
		const r = await po.themSp(page, bt.tenSanPham, 2);
		const dongs = (await po.bangSp(page).locator('tbody tr.ant-table-row').allInnerTexts()).map(po.chuan);
		ghi(info, `dòng: ${dongs.join(' | ')}`);
		for (const x of dongs) expect(x, `Dòng biến thể không lấy được giá NCC (bảng giá mua seed có đủ SKU biến thể 60.000): ${x}`).not.toContain('Chưa cài đặt');
		const l = await po.luu(page, 'Gửi nhà cung cấp');
		expect(l.tb).toContain('Tạo phiếu đặt hàng thành công');
		const skusBt = bt.skus.map((x) => x.sku);
		// Response tạo PO không trả dòng (items=[]) ⇒ đối chiếu ở trang chi tiết.
		await po.moChiTiet(page, l.ma);
		const ct = (await page.locator('.ant-table-tbody tr.ant-table-row').allInnerTexts()).map(po.chuan).filter((x) => x.includes(bt.tenSanPham));
		ghi(info, `${l.ma} · ${ct.join(' | ')}`);
		expect(ct.length, 'Chi tiết PO không có dòng SP biến thể').toBeGreaterThan(0);
		for (const x of ct) expect(skusBt.some((k) => x.includes(k)), `Dòng không mang SKU biến thể seed: ${x}`).toBe(true);
		expect(ct.join(' '), 'Dòng biến thể không hiện tên phân loại').toMatch(/Màu: (Đỏ|Xanh)/);
		expect(await po.trangThai(page, l.ma)).toBe('Đã gửi NCC');
	};
	test('13_3_030_019 — Đặt hàng NCC với sản phẩm có phân loại (biến thể)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_019');
		test.setTimeout(300_000);
		await kiem_030_019(page, info);
	});
	test('13_3_030_049 — Đặt hàng NCC với sản phẩm có phân loại (biến thể)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_049');
		test.setTimeout(300_000);
		await kiem_030_019(page, info);
	});

	const kiem_030_020 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 10 });
		await po.moChiTiet(page, kq.ma);
		expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
		await page.reload();
		await page.getByText('Danh sách sản phẩm').first().waitFor();
		await po.po_nutNhapKho(page).click();
		const dr = page.locator('.ant-drawer-open').filter({ hasText: 'Phiếu nhập kho' }).last();
		const r = dr.locator('tr[data-row-key]').first();
		await expect(r).toBeVisible({ timeout: 20_000 });
		const o = r.locator('.ant-input-number-input').first();
		await o.fill('50');
		await o.press('Tab');
		const m = page.locator('.ant-modal-confirm').filter({ hasText: 'Vượt quá dung sai cho phép' }).last();
		await expect(m, 'Nhập 50 / NCC xác nhận 10 mà không cảnh báo vượt dung sai').toBeVisible();
		const noi = po.chuan(await m.innerText());
		ghi(info, noi);
		const [, pt, max] = noi.match(/dung sai tối đa ([\d.,]+)%, số lượng không vượt quá ([\d.,]+)/) || [];
		expect(max, 'Cảnh báo không nêu số lượng tối đa').toBeTruthy();
		expect(Number(max), 'SL tối đa ≠ 10 × (1 + dung sai)').toBeCloseTo(10 * (1 + Number(pt) / 100), 4);
		await m.getByRole('button').last().click();
		await expect(o, 'Ô SL không tự đặt về mức tối đa cho phép theo dung sai').toHaveValue(String(Number(max)));
	};
	test('13_3_030_020 — Nhận hàng số lượng vượt dung sai', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_020');
		test.setTimeout(300_000);
		await kiem_030_020(page, info);
	});
	test('13_3_030_050 — Nhận hàng số lượng vượt dung sai', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_050');
		test.setTimeout(300_000);
		await kiem_030_020(page, info);
	});

	const kiem_030_010 = async (page, info) => {
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 2 });
		await po.moChiTiet(page, kq.ma);
		expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
		const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
		// 🔴 Đo 24/09: mọi vai TCT (tct / tct_cung_ung / tct_ke_toan) ở /inventory/import KHÔNG có nút "Nhập kho".
		const dr = await k.moFormNhap(page, 'tct');
		const f = (n) => dr.locator('.ant-form-item').filter({ hasText: n }).first();
		const nhanTu = f('Nhập từ').locator('.ant-select');
		if (!(await nhanTu.innerText()).includes('NCC')) {
			await nhanTu.click();
			await po.moSelect(page).filter({ hasText: /^NCC$|Nhà cung cấp/ }).first().click();
		}
		await f('Mã phiếu đặt hàng').locator('input').fill(kq.ma);
		const cho = page.waitForResponse((r) => /purchase-order/i.test(r.url()) && r.request().method() === 'GET', { timeout: 20_000 }).catch(() => null);
		await f('Mã phiếu đặt hàng').getByRole('button', { name: /Tải/ }).click();
		await cho;
		const dong = dr.locator('tr[data-row-key]').filter({ hasText: po.SP().tenSanPham }).first();
		await expect(dong, 'Tải mã PO mà không nạp sản phẩm của PO').toBeVisible({ timeout: 20_000 });
		const noi = po.chuan(await dr.innerText());
		ghi(info, noi.slice(0, 500));
		expect(noi, 'Không hiện NCC của PO').toContain(po.NCC());
		expect(po.chuan(await dong.innerText()), 'Dòng SP không mang SL đặt 2 / giá 60.000').toMatch(/60\.000/);
		const hom = new Date();
		await k.nhapLo(page, dong, [{ nsx: po.dmy(hom), hsd: po.dmy(new Date(hom.getTime() + 365 * 86400_000)) }]);
		const tb = await require('../../13_1_phieu_de_xuat_va_phe_duyet/tests/dx-ghi').thongBaoQuanh(page, () => dr.locator('button').filter({ hasText: /^\s*Nhập kho\s*$/ }).last().click(), 30_000);
		ghi(info, `${kq.ma} · ${tb}`);
		expect(tb).toContain('Nhập kho thành công');
		await po.moChiTiet(page, kq.ma);
		expect(po.chuan(await page.locator('.ant-table-tbody tr.ant-table-row').filter({ hasText: po.SP().tenSanPham }).first().innerText()), 'PO không ghi nhận Đã nhập kho 2').toMatch(/Cái 2 2 2\b/);
	};
	test('13_3_030_010 — Nhập kho từ mã phiếu PO (màn Nhập kho)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_010');
		test.setTimeout(300_000);
		await kiem_030_010(page, info);
	});
	test('13_3_030_040 — Nhập kho từ mã phiếu PO (màn Nhập kho)', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_040');
		test.setTimeout(300_000);
		await kiem_030_010(page, info);
	});

	const kiem_030_022 = async (page, info, browser) => {
		const km = await po.dungCtkm(browser, { giam: 5000, mua: 2, tang: 1 });
		try {
			const dd = require('../../00_seed/seed-state').doc().duLieu.sanPham.sanPhamTheoGiaVon.dichDanh;
			await po.moTaoDayDu(page);
			await po.bangSp(page).locator('tbody tr.ant-table-row').first().locator('button:has(.anticon-delete)').click();
			await po.themSp(page, dd.tenSanPham, 2);
			// CTKM tự áp sau 500ms debounce ⇒ chờ tag CTKM + dòng tặng.
			await expect(page.locator('.ant-tag').filter({ hasText: 'CTKM' }).first(), 'CTKM NCC không tự áp vào PO').toBeVisible({ timeout: 20_000 });
			const dongs = (await po.bangSp(page).locator('tbody tr.ant-table-row').allInnerTexts()).map(po.chuan);
			const tong = po.chuan(await page.locator('.ant-pro-card').filter({ hasText: 'Tổng giá trị đặt hàng' }).first().innerText());
			ghi(info, `${km.ten} · dòng: ${dongs.join(' | ')} · ${tong}`);
			expect(dongs.length, 'Mua 2 tặng 1 mà không sinh dòng hàng tặng').toBeGreaterThanOrEqual(2);
			const chinh = dongs[0];
			expect(chinh, 'Dòng chính không hiện giá gốc theo bảng giá (60.000 gồm VAT)').toMatch(/60\.000|55\.556/);
			expect(chinh, 'Dòng chính không hiện giảm giá 5.000 / SP').toMatch(/5\.000|10\.000/);
			expect(tong, 'Khối tổng không đếm dòng hàng tặng').toMatch(/Hàng tặng kèm 1 dòng/);
			const tang = dongs.find((x, i) => i > 0 && x.includes(dd.sku));
			expect(tang, 'Không có dòng tặng cùng SKU').toBeTruthy();
			expect(tang, 'Dòng tặng không đúng số lượng 1').toMatch(/\b1\b/);
		} finally { await km.dong(); }
	};
	test('13_3_030_022 — Đặt hàng NCC với giá gốc, giá khuyến mãi, tặng hàng theo bảng giá NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_022');
		test.setTimeout(300_000);
		await kiem_030_022(page, info, browser);
	});
	test('13_3_030_052 — Đặt hàng NCC với giá gốc, giá khuyến mãi, tặng hàng theo bảng giá NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_052');
		test.setTimeout(300_000);
		await kiem_030_022(page, info, browser);
	});

	const kiem_030_029 = async (page, info) => {
		const k = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho');
		const st = k.batHeader(page);
		const supplierId = require('../../00_seed/seed-state').doc().duLieu.sanPhamNcc.supplierId;
		const lichSu = async () => {
			const b = await k.goiGhi(page, st, 'GET', '/shops/supplier-debt/history', { supplierId, historyGroup: 'DEBT', page: 0, size: 50 });
			return Array.isArray(b?.data) ? b.data : b?.data?.content || [];
		};
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: 3 });
		await po.moChiTiet(page, kq.ma);
		await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
		const truoc = await lichSu();
		expect((await po.nccXacNhan(page)).tb).toContain('Đã xác nhận');
		await page.reload();
		await page.getByText('Danh sách sản phẩm').first().waitFor();
		const nk = await po.nhapKho(page);
		expect(nk.tb).toContain('Nhập kho thành công');
		const maNk = nk.body?.data?.code || nk.body?.data?.orderCode;
		const idNk = nk.body?.data?.stockInOutId;
		await expect.poll(async () => (await lichSu()).length, { message: 'Nhập kho từ PO mà lịch sử công nợ NCC không thêm dòng', timeout: 30_000 }).toBeGreaterThan(truoc.length);
		const sau = await lichSu();
		const idCu = new Set(truoc.map((x) => JSON.stringify(x)));
		const moi = sau.filter((x) => !idCu.has(JSON.stringify(x)));
		ghi(info, `${kq.ma} · NK ${maNk}/${idNk} · dòng công nợ mới: ${JSON.stringify(moi).slice(0, 500)}`);
		const khop = moi.find((x) => JSON.stringify(x).includes(String(idNk)) || (maNk && JSON.stringify(x).includes(maNk)));
		expect(khop, `Công nợ NCC không ghi nhận phiếu nhập ${maNk}`).toBeTruthy();
		expect(JSON.stringify(khop), 'Khoản công nợ ≠ giá trị phiếu nhập 180.000').toMatch(/\b180000(\.0+)?\b/);
	};
	test('13_3_030_029 — Kiểm tra công nợ giữa TCT và NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_029');
		test.setTimeout(300_000);
		await kiem_030_029(page, info);
	});
	test('13_3_030_059 — Kiểm tra công nợ giữa TCT và NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_059');
		test.setTimeout(300_000);
		await kiem_030_029(page, info);
	});
});

test.describe('13_3 · 030 tìm kiếm / lọc PO (tct)', () => {
	/** PO tiền định cho nhóm lọc — tạo 1 lần (Gửi NCC), ghi chú riêng. */
	let mau = null;
	async function poMau(page) {
		if (mau) return mau;
		const ghiChu = `${po.GHI_CHU} loc ${Date.now() % 1000000}`;
		const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { ghiChu });
		mau = { ...kq, ghiChu };
		return mau;
	}

	const kiem_030_012 = async (page, info) => {
		const m = await poMau(page);
		await po.moDs(page);
		const { url, body } = await po.tim(page, m.ma);
		ghi(info, `${url.search} → ${body.data?.length}`);
		expect(url.searchParams.get('keyword')).toBe(m.ma);
		expect(body.data.length).toBeGreaterThan(0);
		for (const p of body.data) expect(p.code).toContain(m.ma);
		await expect(po.dong(page).filter({ hasText: m.ma })).toHaveCount(1);
	};
	test('13_3_030_012 — Tìm kiếm theo mã phiếu', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_012');
		test.setTimeout(300_000);
		await kiem_030_012(page, info);
	});
	test('13_3_030_042 — Tìm kiếm theo mã phiếu', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_042');
		test.setTimeout(300_000);
		await kiem_030_012(page, info);
	});

	const kiem_030_013 = async (page, info) => {
		const m = await poMau(page);
		await po.moDs(page);
		const { url, body } = await po.tim(page, m.ghiChu);
		ghi(info, `${url.search} → ${body.data?.map((p) => p.code).join(',')}`);
		expect((body.data || []).map((p) => p.code), `Tìm theo ghi chú "${m.ghiChu}" không ra ${m.ma}`).toContain(m.ma);
	};
	test('13_3_030_013 — Tìm kiếm theo ghi chú', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_013');
		test.setTimeout(300_000);
		await kiem_030_013(page, info);
	});
	test('13_3_030_043 — Tìm kiếm theo ghi chú', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_043');
		test.setTimeout(300_000);
		await kiem_030_013(page, info);
	});

	const kiem_030_014 = async (page, info) => {
		await poMau(page);
		await po.moDs(page);
		const k = po.khung(page);
		for (const [tt, ma] of [['Đã gửi NCC', 'SENT'], ['Bản nháp', 'DRAFT'], ['Đã huỷ', 'CANCELLED']]) {
			await k.locator('.ant-form-item').filter({ hasText: /^Trạng thái$/ }).locator('.ant-select').first().click().catch(async () => {
				await k.locator('#status').click({ force: true });
			});
			await po.moSelect(page).filter({ hasText: new RegExp(`^${tt}$`) }).first().click();
			const cho = page.waitForResponse((r) => /\/purchase-orders\?/.test(r.url()) && r.url().includes(`status=${ma}`), { timeout: 20_000 });
			await k.getByRole('button', { name: 'Tìm kiếm' }).click();
			const ds = (await (await cho).json()).data || [];
			ghi(info, `${tt}: ${ds.length} phiếu`);
			expect(ds.length, `Lọc "${tt}" không ra phiếu nào (đã có phiếu seed trạng thái này)`).toBeGreaterThan(0);
			for (const p of ds) expect(p.status).toBe(ma);
		}
	};
	test('13_3_030_014 — Bộ lọc theo trạng thái', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_014');
		test.setTimeout(300_000);
		await kiem_030_014(page, info);
	});
	test('13_3_030_044 — Bộ lọc theo trạng thái', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_044');
		test.setTimeout(300_000);
		await kiem_030_014(page, info);
	});

	const kiem_030_015 = async (page, info) => {
		await poMau(page);
		await po.moDs(page);
		const k = po.khung(page);
		await k.locator('.ant-form-item').filter({ hasText: 'Nhà cung cấp' }).locator('.ant-select').click();
		await page.keyboard.type(po.NCC());
		await po.moSelect(page).filter({ hasText: po.NCC() }).first().click({ force: true });
		const cho = page.waitForResponse((r) => /\/purchase-orders\?/.test(r.url()) && r.url().includes('supplierId='), { timeout: 20_000 });
		await k.getByRole('button', { name: 'Tìm kiếm' }).click();
		const res = await cho;
		const sid = new URL(res.url()).searchParams.get('supplierId');
		const ds = (await res.json()).data || [];
		ghi(info, `supplierId=${sid} → ${ds.length}`);
		expect(ds.length).toBeGreaterThan(0);
		for (const p of ds) expect(String(p.supplierId)).toBe(sid);
	};
	test('13_3_030_015 — Bộ lọc PO theo NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_015');
		test.setTimeout(300_000);
		await kiem_030_015(page, info);
	});
	test('13_3_030_045 — Bộ lọc PO theo NCC', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_045');
		test.setTimeout(300_000);
		await kiem_030_015(page, info);
	});

	const kiem_030_016 = async (page, info) => {
		const m = await poMau(page);
		await po.moDs(page);
		const k = po.khung(page);
		const hom = new Date();
		const iso = `${hom.getFullYear()}-${String(hom.getMonth() + 1).padStart(2, '0')}-${String(hom.getDate()).padStart(2, '0')}`;
		await k.getByPlaceholder('Từ ngày').click();
		const o = page.locator(`.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td[title="${iso}"]`).first();
		await o.click();
		await o.click();
		const cho = page.waitForResponse((r) => /\/purchase-orders\?/.test(r.url()) && r.url().includes('fromDate='), { timeout: 20_000 });
		await k.getByRole('button', { name: 'Tìm kiếm' }).click();
		const res = await cho;
		const u = new URL(res.url());
		const ds = (await res.json()).data || [];
		ghi(info, `${u.search} → ${ds.length}`);
		expect(u.searchParams.get('fromDate')).toBe(iso);
		expect(u.searchParams.get('toDate')).toBe(iso);
		expect(ds.map((p) => p.code), 'PO tạo hôm nay không có trong kết quả lọc hôm nay').toContain(m.ma);
	};
	test('13_3_030_016 — Lọc PO theo khoảng thời gian', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_016');
		test.setTimeout(300_000);
		await kiem_030_016(page, info);
	});
	test('13_3_030_046 — Lọc PO theo khoảng thời gian', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_046');
		test.setTimeout(300_000);
		await kiem_030_016(page, info);
	});

	const kiem_030_017 = async (page, info) => {
		const m = await poMau(page);
		const dau = await po.moDs(page);
		const tong0 = dau?.page?.total_elements;
		const { body } = await po.tim(page, m.ma);
		expect(body.page.total_elements).toBe(1);
		const cho = page.waitForResponse((r) => /\/purchase-orders\?/.test(r.url()), { timeout: 20_000 });
		await po.khung(page).getByRole('button', { name: 'Xóa lọc' }).click();
		const res = await cho;
		const u = new URL(res.url());
		const b = await res.json();
		ghi(info, `trước ${tong0} · sau xoá ${b.page.total_elements} · ${u.search}`);
		expect(u.searchParams.get('keyword')).toBeNull();
		await expect(po.khung(page).locator('#keyword')).toHaveValue('');
		expect(b.page.total_elements).toBeGreaterThan(1);
	};
	test('13_3_030_017 — Xoá bộ lọc', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_017');
		test.setTimeout(300_000);
		await kiem_030_017(page, info);
	});
	test('13_3_030_047 — Xoá bộ lọc', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_047');
		test.setTimeout(300_000);
		await kiem_030_017(page, info);
	});

	const kiem_030_018 = async (page, info) => {
		const dau = await po.moDs(page);
		const tong = dau.page.total_elements;
		expect(tong, 'Cần > 20 phiếu để kiểm phân trang').toBeGreaterThan(20);
		const trang1 = (dau.data || []).map((p) => p.id);
		const cho = page.waitForResponse((r) => /\/purchase-orders\?/.test(r.url()) && r.url().includes('page=1'), { timeout: 20_000 });
		const t2 = po.khung(page).locator('.ant-pagination-item-2');
		await t2.scrollIntoViewIfNeeded();
		await t2.click({ force: true });
		const b = await (await cho).json();
		const trang2 = (b.data || []).map((p) => p.id);
		ghi(info, `tổng ${tong} · trang1 ${trang1.length} · trang2 ${trang2.length}`);
		expect(trang2.length).toBeGreaterThan(0);
		expect(trang2.filter((x) => trang1.includes(x)), 'Trang 2 trùng phiếu với trang 1').toEqual([]);
		await expect(po.khung(page).locator('.ant-pagination-item-active')).toHaveText('2');
	};
	test('13_3_030_018 — Phân trang', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_018');
		test.setTimeout(300_000);
		await kiem_030_018(page, info);
	});
	test('13_3_030_048 — Phân trang', async ({ page, browser }, info) => {
		chanNeuTat('13_3_030_048');
		test.setTimeout(300_000);
		await kiem_030_018(page, info);
	});
});
