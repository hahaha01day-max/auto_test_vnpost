'use strict';

/**
 * Bước 19 — PO RIÊNG của làn đã có phiếu nhập kho. Phục vụ phân hệ 27 (`canSeed: "po-rieng"`): upload hoá đơn XML
 * khớp PO mà 🚫 đụng PO của người khác (khớp là hệ thống TỰ hạch toán + ghi công nợ NCC — `autoAccountIfMatched`,
 * không dọn được).
 *
 * Luồng = khuôn đã chạy xanh `13_3/tests/po-ghi.js` (vai `tct`): lập PO kho TCT · NCC + HĐ của làn (bước 6–7) · SP giá
 * tiêu chuẩn → "Gửi nhà cung cấp" → "NCC xác nhận" → "Nhập kho" đủ SL. Lái giao diện (không có API gộp tương đương).
 * 🔴 Mỗi case 27 TIÊU một PO ⇒ tạo `SO_PO` cái, sổ `duLieu.poRieng.ds[]` ghi `dungBoi` khi case lấy dùng —
 *    case gọi `layPoTrong()` của `00_seed/po-rieng.js` để lấy PO chưa ai dùng. Hết PO trống ⇒ chạy lại bước này (tự bù cho đủ).
 */
const { test, expect } = require('@playwright/test');
const po = require('../../13_3_dat_hang_va_nhap_hang/tests/po-ghi');
const { doc, ghi } = require('../seed-state');

test.describe.configure({ mode: 'serial' });
const SO_PO = 3; // số PO TRỐNG luôn giữ sẵn — mỗi lần chạy bước này bù cho đủ
const SL = 3;
const ds = () => doc().duLieu?.poRieng?.ds || [];

test('seed 19.1 — PO riêng của làn: tạo, gửi NCC, NCC xác nhận, nhập kho đủ', async ({ page }) => {
  test.setTimeout(900_000);
  const trong = ds().filter((x) => !x.dungBoi && x.daNhapKho).length;
  for (let n = trong; n < SO_PO; n += 1) {
    const kq = await po.taoPO(page, 'Gửi nhà cung cấp', { sl: SL, ghiChu: 'AUTO TEST — PO riêng làn (seed 19)' });
    ghi('poRieng', { ds: [...ds(), { ma: kq.ma, id: kq.id, sl: SL, daNhapKho: false }] });
    await po.moChiTiet(page, kq.ma);
    const xn = await po.nccXacNhan(page);
    expect(xn.tb, `NCC xác nhận PO ${kq.ma} không thành công`).toContain('Đã xác nhận');
    await page.reload();
    await expect(page.getByText('Danh sách sản phẩm').first()).toBeVisible({ timeout: 30_000 });
    // 🔴 `po.nhapKho` trả về ngay sau `import-export`; `POST /purchase-orders/{id}/receive` đến SAU — rời trang sớm là huỷ.
    const rc = page.waitForResponse((r) => /purchase-orders\/\d+\/receive/.test(r.url()), { timeout: 90_000 }).catch(() => null);
    const nk = await po.nhapKho(page);
    const r = await rc;
    expect(nk.tb, `Nhập kho PO ${kq.ma} không thành công`).toMatch(/thành công/i);
    expect(r?.status(), `PO ${kq.ma} không ghi nhận nhận hàng (receive)`).toBe(200);
    const phieu = nk.body?.data?.code ?? nk.body?.data?.stockInOutId ?? null;
    ghi('poRieng', { ds: ds().map((x) => (x.ma === kq.ma ? { ...x, daNhapKho: true, phieuNhap: phieu } : x)) });
  }
  expect(ds().filter((x) => !x.dungBoi && x.daNhapKho).length).toBeGreaterThanOrEqual(SO_PO);
});
