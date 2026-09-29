const { test, expect } = require('@playwright/test');
const { expectBusinessSuccess } = require('../../shared/assertions/response-assertions');
const { login, selectSupplyScope } = require('../../shared/vnpost-helpers');

const DELIVERY_UNIT_ROUTE = '/delivery/units';

test.describe('VNPost - Đơn vị vận tải - case lẻ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectSupplyScope(page);
  });

  test('Vantai_51 kiểm tra giao diện màn hình Lịch sử ghi nợ', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    const target =
      initialBody?.data?.find(
        (unit) => Number(unit?.totalDeduction || 0) > Number(unit?.totalRecovery || 0),
      ) || initialBody?.data?.[0];
    test.skip(!target, 'Vantai_51 yêu cầu có ít nhất một đơn vị vận chuyển');

    const main = page.getByRole('main');
    const row = main
      .getByRole('row')
      .filter({ hasText: target.code })
      .filter({ hasText: target.name })
      .first();
    const debtResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.url().includes(`deliveryUnitId=${target.id}`) &&
        response.request().method() === 'GET',
    );
    await row.getByRole('button', { name: 'Công nợ', exact: true }).click();
    await expectBusinessSuccess(await debtResponsePromise);

    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText(`Lịch sử ghi nợ và thanh toán - ${target.name}`, { exact: true }),
    });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Lịch sử ghi nợ', { exact: true })).toBeVisible();

    for (const label of [
      Number(target.totalDebt || 0) < 0 ? 'Tổng ĐVVC nợ lại' : 'Tổng nợ',
      'Tổng tiền giao hàng',
      'Đã thanh toán giao hàng',
      'Tổng bồi thường',
      'Tổng thu hồi',
    ]) {
      await expect(drawer.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(drawer.getByRole('button', { name: 'Thanh toán', exact: true })).toBeVisible();
    if (Number(target.totalDeduction || 0) > Number(target.totalRecovery || 0)) {
      await expect(
        drawer.getByRole('button', { name: 'Thu hồi bồi thường', exact: true }),
      ).toBeVisible();
    }
    await expect(drawer.getByRole('button', { name: /Xuất excel/i })).toBeVisible();

    const table = drawer.getByRole('table').first();
    await expect(table).toBeVisible();
    for (const column of [
      '#',
      'Ngày tạo',
      'Mã vận đơn',
      'Mã phiếu chuyển',
      'Phân loại',
      'Ghi chú',
      'Giá trị',
      'Còn nợ',
    ]) {
      await expect(table.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
    }
  });
});
