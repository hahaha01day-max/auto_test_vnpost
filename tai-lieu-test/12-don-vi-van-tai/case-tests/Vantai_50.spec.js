const { test, expect } = require('@playwright/test');
const { expectBusinessSuccess } = require('../../shared/assertions/response-assertions');
const { login, selectSupplyScope } = require('../../shared/vnpost-helpers');

const DELIVERY_UNIT_ROUTE = '/delivery/units';

test.describe('VNPost - Đơn vị vận tải - case lẻ', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectSupplyScope(page);
  });

  test('Vantai_50 sửa dữ liệu rồi click Hủy không cập nhật đơn vị vận chuyển', async ({
    page,
  }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    expect(
      initialBody?.data?.length,
      'Vantai_50 yêu cầu có ít nhất một đơn vị vận chuyển',
    ).toBeGreaterThan(0);

    const target = initialBody.data[0];
    const changedName = `${target.name} KHONG LUU ${Date.now()}`;
    const row = page
      .getByRole('main')
      .getByRole('row')
      .filter({ hasText: target.code })
      .filter({ hasText: target.name })
      .first();
    await row.getByRole('button', { name: 'Sửa', exact: true }).click();

    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Cập nhật đơn vị vận chuyển', { exact: true }),
    });
    await drawer.getByPlaceholder('Tên đơn vị vận chuyển').fill(changedName);

    let putCount = 0;
    const countPut = (request) => {
      if (
        request.url().includes(`/delivery-units/${target.id}`) &&
        request.method() === 'PUT'
      ) {
        putCount += 1;
      }
    };
    page.on('request', countPut);
    try {
      await drawer
        .locator('.ant-drawer-footer')
        .getByRole('button', { name: 'Hủy', exact: true })
        .click();
      await expect(drawer).toBeHidden();
      expect(putCount).toBe(0);

      const unchangedRow = page
        .getByRole('main')
        .getByRole('row')
        .filter({ hasText: target.code })
        .filter({ hasText: target.name })
        .first();
      await expect(unchangedRow).toContainText(target.name);
      await expect(unchangedRow).not.toContainText(changedName);
    } finally {
      page.off('request', countPut);
    }
  });
});
