'use strict';

/**
 * 🌱 **DỰNG NỀN — quầy thu ngân của điểm bán** (vai `shop`). 🚫 Không mang mã case nào.
 *
 * 🔴 Vì sao cần: **🚫 KHÔNG mở được ca nếu điểm bán chưa có quầy thu ngân** — ô "Quầy thu ngân"
 *    trong drawer mở ca là `required` (`WorkShiftPage.jsx`). Đo 23/09/2026 trên DB:
 *    `SHOP_CASHIER_COUNTER` 🚫 KHÔNG có dòng nào cho điểm bán Lý Sơn (`shop_id = 68056`) ⇒ cả cụm
 *    vòng đời ca 03b (mở ca · tạm chốt · chốt) skip sạch vì thiếu đúng một bản ghi này.
 *
 * 🔴 **Idempotent.** Danh sách đã có quầy thì dừng, 🚫 không tạo thêm: quầy gắn với quỹ tiền mặt
 *    (`createCashierCounter` invalidate cả `FUND_LIST`), đẻ thừa là đẻ thêm quỹ rỗng.
 *
 * Trace 23/09/2026: route `/finance/cashier-counter` · `GET /cashier-counter/get-all` ·
 * `POST /cashier-counter/create` (body `{shopId, name, code}`). Form là **Modal** (🚫 không phải
 * Drawer) với hai ô *Tên quầy* · *Mã quầy*.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { ghi: ghiSo } = require('../../00_seed/seed-state');

const VAI = 'shop';
const ROUTE = '/finance/cashier-counter';
const API = '/cashier-counter/get-all';

/** Quầy mặc định — đặt tên tự nhiên vì người dùng thật nhìn thấy nó trên màn mở ca. */
const TEN_QUAY = process.env.VNPOST_TEN_QUAY_SEED || 'Quầy 01';
const MA_QUAY = process.env.VNPOST_MA_QUAY_SEED || 'Q01';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const khung = (page) => page.locator('.ant-pro-page-container, main').first();

test.describe('🌱 Dựng nền 17 — quầy thu ngân cho điểm bán', () => {
  test('seed: bảo đảm điểm bán có ít nhất một quầy thu ngân', async ({ page }) => {
    test.setTimeout(180_000);

    const cho = page.waitForResponse((r) => r.url().includes(API) && r.status() !== 401, {
      timeout: 90_000,
    });
    await moTrang(page, ROUTE, VAI);
    const res = await cho;
    expect(res.status(), 'API danh sách quầy thu ngân 🚫 không trả 200').toBe(200);
    await page.waitForTimeout(2_000);

    const ghi = (mo) => test.info().annotations.push({ type: 'dựng nền', description: mo });

    const dong = khung(page).locator('.ant-table-tbody tr.ant-table-row');
    if ((await dong.count()) > 0) {
      // 🔴 Ghi TÊN QUẦY vào sổ seed dù 🚫 không tạo mới: `test-input.json` của 03b đòi
      //    `quayThuNgan` là giá trị bắt buộc, thiếu nó thì `skipReason()` cho skip cả case mở ca
      //    trong khi quầy vẫn đang có thật trên màn hình.
      // 🔴 Thứ tự cột đo 23/09: `# · Mã quầy · Tên quầy · …` — cột **mã đứng TRƯỚC tên**. Lấy
      //    ngược là sổ ghi `tenQuay: "Q02"` mà 🚫 không lỗi nào phát ra, rồi ô chọn quầy ở màn
      //    mở ca tìm mãi không ra.
      const ma = chuan(await dong.first().locator('td').nth(1).innerText());
      const ten = chuan(await dong.first().locator('td').nth(2).innerText());
      ghiSo('quayThuNgan', { tenQuay: ten, maQuay: ma, tuTao: false });
      ghi(`Điểm bán đã có ${await dong.count()} quầy thu ngân — dùng lại "${ten}", 🚫 không tạo thêm.`);
      return;
    }

    await khung(page).getByRole('button', { name: /Thêm quầy/ }).first().click();
    const modal = page.locator('.ant-modal-wrap:visible').last();
    await expect(modal.getByText('Thêm quầy thu ngân').first()).toBeVisible({ timeout: 20_000 });

    await modal.locator('#name').fill(TEN_QUAY);
    await modal.locator('#code').fill(MA_QUAY);

    const choTao = page.waitForResponse(
      (r) => /cashier-counter\/create/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await modal.getByRole('button', { name: /OK|Xác nhận|Đồng ý/ }).last().click();
    const resTao = await choTao;
    const body = await resTao.json().catch(() => null);
    expect(
      String(body?.status?.code),
      `Tạo quầy "${TEN_QUAY}" thất bại: ${JSON.stringify(body?.status)}`,
    ).toBe('200');

    // Kỳ vọng: quầy mới nằm trong danh sách — 🚫 đừng dừng ở mã 200.
    await expect(
      khung(page).getByRole('row').filter({ hasText: TEN_QUAY }).first(),
      `Tạo quầy trả 200 nhưng 🚫 không thấy "${TEN_QUAY}" trong danh sách`,
    ).toBeVisible({ timeout: 20_000 });

    ghiSo('quayThuNgan', { tenQuay: TEN_QUAY, maQuay: MA_QUAY, tuTao: true });
    ghi(`Đã tạo quầy "${TEN_QUAY}" (mã ${MA_QUAY}) cho điểm bán của vai ${VAI}.`);
    expect(chuan(await khung(page).innerText())).toContain(TEN_QUAY);
  });
});
