const { test, expect } = require('@playwright/test');
const { expectBusinessSuccess } = require('../../shared/assertions/response-assertions');
const { login, selectSupplyScope } = require('../../shared/vnpost-helpers');

const DELIVERY_ORDER_ROUTE = '/delivery/orders';
const DELIVERY_UNIT_ROUTE = '/delivery/units';

test.describe('VNPost - Đơn vị vận tải', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await selectSupplyScope(page);
  });

  test('Vantai_10 kiểm tra giao diện Quản lý đơn vận chuyển', async ({ page }, testInfo) => {
    const orderResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.request().method() === 'GET',
    );
    const unitResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );

    await page.goto(DELIVERY_ORDER_ROUTE, { waitUntil: 'domcontentloaded' });

    const [orderResponse, unitResponse] = await Promise.all([
      orderResponsePromise,
      unitResponsePromise,
    ]);
    const orderBody = await expectBusinessSuccess(orderResponse);
    await expectBusinessSuccess(unitResponse);

    await expect(page).toHaveURL(new RegExp(`${DELIVERY_ORDER_ROUTE}$`));
    const main = page.getByRole('main');
    await expect(main.getByText('Quản lý đơn vận chuyển', { exact: true })).toBeVisible();

    const filters = main.locator('form');
    await expect(filters.getByPlaceholder('Tìm theo mã VĐ/mã PC')).toBeVisible();
    await expect(filters.locator('.ant-select').filter({ hasText: 'ĐVVC' })).toBeVisible();
    await expect(
      filters.locator('.ant-select').filter({ hasText: 'Trạng thái VC' }),
    ).toBeVisible();
    await expect(
      filters.locator('.ant-select').filter({ hasText: 'Trạng thái TT' }),
    ).toBeVisible();
    await expect(filters.getByRole('button', { name: 'Tìm kiếm', exact: true })).toBeVisible();
    await expect(filters.getByRole('button', { name: 'Xóa lọc', exact: true })).toBeVisible();

    const addButton = main.getByRole('button', { name: /Thêm mới/i });
    const addButtonVisible = await addButton.isVisible().catch(() => false);
    if (!addButtonVisible) {
      testInfo.annotations.push({
        type: 'SRS_GAP',
        description:
          'Test case yêu cầu nút Thêm mới nhưng DeliveryOrderPage hiện đang comment phần PageContainer.extra.',
      });
    }
    test.fail(
      !addButtonVisible,
      'SRS_GAP: DeliveryOrderPage chưa hiển thị nút Thêm mới theo test case Vantai_10',
    );
    await expect(addButton, 'SRS yêu cầu hiển thị nút Thêm mới').toBeVisible();

    const table = main.getByRole('table');
    await expect(table).toBeVisible();
    for (const column of [
      'Mã VĐ',
      'Mã phiếu chuyển',
      'ĐVVC',
      'Nhân viên VC',
      'Biển số',
      'Trạng thái VC',
      'Số tiền',
      'Đã TT',
      'Trạng thái TT',
      'Hành động',
    ]) {
      await expect(table.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
    }

    expect(Array.isArray(orderBody?.data)).toBeTruthy();
    expect(orderBody?.page).toBeTruthy();
  });

  test('Vantai_11 kiểm tra giao diện Chi tiết đơn vận chuyển', async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_ORDER_ROUTE, { waitUntil: 'domcontentloaded' });
    const listBody = await expectBusinessSuccess(await listResponsePromise);

    expect(
      listBody?.data?.length,
      'Vantai_11 yêu cầu có ít nhất một đơn vận chuyển',
    ).toBeGreaterThan(0);

    const firstOrder = listBody.data[0];
    const main = page.getByRole('main');
    const firstRow = main.getByRole('row').filter({ hasText: firstOrder.code }).first();
    await expect(firstRow).toBeVisible();

    const detailResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/delivery-orders/${firstOrder.id}`) &&
        response.request().method() === 'GET',
    );
    await firstRow.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    const detailBody = await expectBusinessSuccess(await detailResponsePromise);
    expect(detailBody?.data?.id).toBe(firstOrder.id);

    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Chi tiết đơn vận chuyển', { exact: true }),
    });
    await expect(drawer).toBeVisible();

    for (const label of [
      'Mã vận đơn',
      'Mã phiếu chuyển',
      'Đơn vị vận chuyển',
      'Nhân viên VC',
      'Biển số xe',
      'Trạng thái vận chuyển',
      'Số tiền',
      'Đã thanh toán',
      'Còn nợ',
      'Trạng thái thanh toán',
    ]) {
      await expect(drawer.getByText(label, { exact: true })).toBeVisible();
    }

    const footer = drawer.locator('.ant-drawer-footer');
    await expect(footer.getByRole('button', { name: 'Đóng', exact: true })).toBeVisible();
    await expect(
      footer.getByRole('button', { name: 'Ghi nhận bồi thường', exact: true }),
    ).toBeVisible();
    await expect(
      footer.getByRole('button', { name: 'Đổi trạng thái vận chuyển', exact: true }),
    ).toBeVisible();
  });

  test('Vantai_12 kiểm tra giao diện Thanh toán đơn vận chuyển', async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_ORDER_ROUTE, { waitUntil: 'domcontentloaded' });
    const listBody = await expectBusinessSuccess(await listResponsePromise);

    const unpaidOrder = listBody?.data?.find(
      (order) => Number(order?.remainAmount || 0) > 0 && order?.payStatus !== 'PAY_COMPLETED',
    );
    expect(
      unpaidOrder,
      'Vantai_12 yêu cầu có ít nhất một đơn vận chuyển còn công nợ',
    ).toBeTruthy();

    const main = page.getByRole('main');
    const orderRow = main.getByRole('row').filter({ hasText: unpaidOrder.code }).first();
    await expect(orderRow).toBeVisible();
    await orderRow.getByRole('button', { name: 'Thanh toán', exact: true }).click();

    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText(new RegExp(`Thanh toán đơn vận chuyển.*${unpaidOrder.code}`)),
    });
    await expect(drawer).toBeVisible();

    for (const label of [
      'Mã vận đơn',
      'Mã phiếu chuyển',
      'ĐVVC',
      'Số tiền',
      'Đã thanh toán',
      'Còn nợ',
      'Số tiền thanh toán',
      'Phương thức thanh toán',
      'Ghi chú',
    ]) {
      await expect(drawer.getByText(label, { exact: true })).toBeVisible();
    }

    await expect(drawer.getByRole('spinbutton')).toBeVisible();
    await expect(drawer.getByPlaceholder('Nhập ghi chú')).toBeVisible();
    const footer = drawer.locator('.ant-drawer-footer');
    await expect(footer.getByRole('button', { name: 'Hủy', exact: true })).toBeVisible();
    await expect(footer.getByRole('button', { name: 'Lưu', exact: true })).toBeVisible();
  });

  test('Vantai_13 chuyển trạng thái từ Đang chờ sang Đang chuyển', async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_ORDER_ROUTE, { waitUntil: 'domcontentloaded' });
    const listResponse = await listResponsePromise;
    const listBody = await expectBusinessSuccess(listResponse);
    const waitingOrder = listBody?.data?.find((order) => order?.deliveryStatus === 'WAITING');
    expect(
      waitingOrder,
      'Vantai_13 yêu cầu có ít nhất một đơn vận chuyển trạng thái Đang chờ',
    ).toBeTruthy();

    let statusChanged = false;
    let drawer;

    try {
      const main = page.getByRole('main');
      const orderRow = main.getByRole('row').filter({ hasText: waitingOrder.code }).first();
      const initialDetailResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/delivery-orders/${waitingOrder.id}`) &&
          !response.url().includes('/delivery-status') &&
          response.request().method() === 'GET',
      );
      await orderRow.getByRole('button', { name: 'Chi tiết', exact: true }).click();
      await expectBusinessSuccess(await initialDetailResponsePromise);

      drawer = page.locator('.ant-drawer:visible').filter({
        has: page.getByText('Chi tiết đơn vận chuyển', { exact: true }),
      });
      await expect(drawer).toBeVisible();

      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/delivery-orders/${waitingOrder.id}/delivery-status`) &&
          response.request().method() === 'PUT',
      );
      const updatedDetailResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/delivery-orders/${waitingOrder.id}`) &&
          !response.url().includes('/delivery-status') &&
          response.request().method() === 'GET',
      );
      await drawer
        .locator('.ant-drawer-footer')
        .getByRole('button', { name: 'Đổi trạng thái vận chuyển', exact: true })
        .click();
      await page
        .locator('.ant-dropdown:visible')
        .getByText('Đang chuyển', { exact: true })
        .click();

      await expectBusinessSuccess(await updateResponsePromise);
      statusChanged = true;

      const updatedBody = await expectBusinessSuccess(await updatedDetailResponsePromise);
      expect(updatedBody?.data?.deliveryStatus).toBe('DELIVERING');
      await expect(drawer.getByText('Đang chuyển', { exact: true })).toBeVisible();
    } finally {
      if (statusChanged) {
        const restoreResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes(`/delivery-orders/${waitingOrder.id}/delivery-status`) &&
            response.request().method() === 'PUT',
        );
        await drawer
          .locator('.ant-drawer-footer')
          .getByRole('button', { name: 'Đổi trạng thái vận chuyển', exact: true })
          .click();
        await page
          .locator('.ant-dropdown:visible')
          .getByText('Đang chờ', { exact: true })
          .click();
        await expectBusinessSuccess(await restoreResponsePromise);
      }
    }
  });

  test('Vantai_14 chuyển trạng thái từ Đang chuyển sang Đã giao', async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_ORDER_ROUTE, { waitUntil: 'domcontentloaded' });
    const listBody = await expectBusinessSuccess(await listResponsePromise);
    const deliveringOrder = listBody?.data?.find(
      (order) => order?.deliveryStatus === 'DELIVERING',
    );
    expect(
      deliveringOrder,
      'Vantai_14 yêu cầu có ít nhất một đơn vận chuyển trạng thái Đang chuyển',
    ).toBeTruthy();

    let statusChanged = false;
    let drawer;
    try {
      const orderRow = page
        .getByRole('main')
        .getByRole('row')
        .filter({ hasText: deliveringOrder.code })
        .first();
      const initialDetailResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/delivery-orders/${deliveringOrder.id}`) &&
          !response.url().includes('/delivery-status') &&
          response.request().method() === 'GET',
      );
      await orderRow.getByRole('button', { name: 'Chi tiết', exact: true }).click();
      await expectBusinessSuccess(await initialDetailResponsePromise);

      drawer = page.locator('.ant-drawer:visible').filter({
        has: page.getByText('Chi tiết đơn vận chuyển', { exact: true }),
      });
      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/delivery-orders/${deliveringOrder.id}/delivery-status`) &&
          response.request().method() === 'PUT',
      );
      const updatedDetailResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/delivery-orders/${deliveringOrder.id}`) &&
          !response.url().includes('/delivery-status') &&
          response.request().method() === 'GET',
      );
      await drawer
        .locator('.ant-drawer-footer')
        .getByRole('button', { name: 'Đổi trạng thái vận chuyển', exact: true })
        .click();
      await page.locator('.ant-dropdown:visible').getByText('Đã giao', { exact: true }).click();

      await expectBusinessSuccess(await updateResponsePromise);
      statusChanged = true;
      const updatedBody = await expectBusinessSuccess(await updatedDetailResponsePromise);
      expect(updatedBody?.data?.deliveryStatus).toBe('DELIVERED');
      await expect(drawer.getByText('Đã giao', { exact: true })).toBeVisible();
    } finally {
      if (statusChanged) {
        const restoreResponsePromise = page.waitForResponse(
          (response) =>
            response.url().includes(`/delivery-orders/${deliveringOrder.id}/delivery-status`) &&
            response.request().method() === 'PUT',
        );
        await drawer
          .locator('.ant-drawer-footer')
          .getByRole('button', { name: 'Đổi trạng thái vận chuyển', exact: true })
          .click();
        await page
          .locator('.ant-dropdown:visible')
          .getByText('Đang chuyển', { exact: true })
          .click();
        await expectBusinessSuccess(await restoreResponsePromise);
      }
    }
  });

  test('Vantai_15 thanh toán toàn bộ số tiền còn nợ của đơn vận chuyển', async ({
    page,
  }) => {
    test.skip(
      process.env.VNPOST_ALLOW_FINANCIAL_MUTATION !== 'true' ||
        !process.env.VNPOST_PAYMENT_ORDER_CODE,
      'Case tài chính không thể hoàn tác: chỉ chạy khi VNPOST_ALLOW_FINANCIAL_MUTATION=true và có VNPOST_PAYMENT_ORDER_CODE chuyên dụng.',
    );

    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_ORDER_ROUTE, { waitUntil: 'domcontentloaded' });
    const listBody = await expectBusinessSuccess(await listResponsePromise);
    const order = listBody?.data?.find(
      (item) => item?.code === process.env.VNPOST_PAYMENT_ORDER_CODE,
    );
    expect(order, 'Không tìm thấy đơn thanh toán chuyên dụng đã cấu hình').toBeTruthy();
    expect(Number(order?.remainAmount || 0), 'Đơn phải còn công nợ').toBeGreaterThan(0);

    const row = page.getByRole('main').getByRole('row').filter({ hasText: order.code }).first();
    await row.getByRole('button', { name: 'Thanh toán', exact: true }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText(new RegExp(`Thanh toán đơn vận chuyển.*${order.code}`)),
    });
    await expect(drawer.getByRole('spinbutton')).toHaveValue(String(Number(order.remainAmount)));

    const paymentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders/debts/pay') &&
        response.request().method() === 'POST',
    );
    await drawer
      .locator('.ant-drawer-footer')
      .getByRole('button', { name: 'Lưu', exact: true })
      .click();
    await expectBusinessSuccess(await paymentResponsePromise);
    await expect(page.getByText('Thanh toán thành công', { exact: true })).toBeVisible();
  });

  test('Vantai_16 thanh toán nhiều lần cho cùng đơn vận chuyển', async ({ page }) => {
    test.skip(
      process.env.VNPOST_ALLOW_FINANCIAL_MUTATION !== 'true' ||
        !process.env.VNPOST_MULTI_PAYMENT_ORDER_CODE,
      'Case tài chính không thể hoàn tác: cần bật mutation và cấu hình đơn chuyên dụng cho thanh toán nhiều lần.',
    );

    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-orders') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_ORDER_ROUTE, { waitUntil: 'domcontentloaded' });
    const listBody = await expectBusinessSuccess(await listResponsePromise);
    const order = listBody?.data?.find(
      (item) => item?.code === process.env.VNPOST_MULTI_PAYMENT_ORDER_CODE,
    );
    expect(order, 'Không tìm thấy đơn thanh toán nhiều lần chuyên dụng').toBeTruthy();

    const originalRemain = Number(order?.remainAmount || 0);
    expect(originalRemain, 'Đơn phải còn công nợ').toBeGreaterThan(1);
    const firstAmount = Math.floor(originalRemain / 2);

    const pay = async (expectedRemain, amount) => {
      const row = page
        .getByRole('main')
        .getByRole('row')
        .filter({ hasText: order.code })
        .first();
      await row.getByRole('button', { name: 'Thanh toán', exact: true }).click();
      const drawer = page.locator('.ant-drawer:visible').filter({
        has: page.getByText(new RegExp(`Thanh toán đơn vận chuyển.*${order.code}`)),
      });
      const amountInput = drawer.getByRole('spinbutton');
      await expect(amountInput).toHaveValue(String(expectedRemain));
      await amountInput.fill(String(amount));

      const paymentResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/delivery-orders/debts/pay') &&
          response.request().method() === 'POST',
      );
      const refreshedListPromise = page.waitForResponse(
        (response) =>
          response.url().includes('/delivery-orders') &&
          response.request().method() === 'GET',
      );
      await drawer
        .locator('.ant-drawer-footer')
        .getByRole('button', { name: 'Lưu', exact: true })
        .click();
      await expectBusinessSuccess(await paymentResponsePromise);
      return expectBusinessSuccess(await refreshedListPromise);
    };

    const afterFirst = await pay(originalRemain, firstAmount);
    const firstResult = afterFirst?.data?.find((item) => item?.id === order.id);
    const remaining = originalRemain - firstAmount;
    expect(Number(firstResult?.remainAmount)).toBe(remaining);

    const afterSecond = await pay(remaining, remaining);
    const finalResult = afterSecond?.data?.find((item) => item?.id === order.id);
    expect(Number(finalResult?.remainAmount)).toBe(0);
    expect(finalResult?.payStatus).toBe('PAY_COMPLETED');
  });

  test('Vantai_31 kiểm tra giao diện Quản lý đơn vị vận chuyển', async ({ page }) => {
    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );

    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });

    const listResponse = await listResponsePromise;
    const listBody = await expectBusinessSuccess(listResponse);

    await expect(page).toHaveURL(new RegExp(`${DELIVERY_UNIT_ROUTE}$`));
    const main = page.getByRole('main');
    await expect(main.getByText('Quản lý đơn vị vận chuyển', { exact: true })).toBeVisible();
    await expect(main.getByRole('searchbox', { name: 'Tìm theo tên/mã' })).toBeVisible();

    const filters = main.locator('form');
    await expect(filters.locator('.ant-select').filter({ hasText: 'Loại' })).toBeVisible();
    await expect(filters.locator('.ant-select').filter({ hasText: 'Trạng thái' })).toBeVisible();
    await expect(main.getByRole('button', { name: /Thêm mới/i })).toBeVisible();

    const table = main.getByRole('table');
    await expect(table).toBeVisible();

    for (const column of [
      'Mã',
      'Tên đơn vị',
      'Loại',
      'Trạng thái',
      'Tổng còn nợ',
      'Hành động',
    ]) {
      await expect(table.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
    }

    expect(Array.isArray(listBody?.data)).toBeTruthy();
    expect(listBody?.page).toBeTruthy();

    if (Number(listBody?.page?.total_elements || 0) > 20) {
      await expect(page.locator('.ant-pagination')).toBeVisible();
    }
  });

  test('Vantai_32 tìm kiếm đơn vị vận chuyển theo tên hoặc mã', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    expect(
      initialBody?.data?.length,
      'Vantai_32 yêu cầu có ít nhất một đơn vị vận chuyển',
    ).toBeGreaterThan(0);

    const target = initialBody.data[0];
    const keyword = target.code;
    const searchResponsePromise = page.waitForResponse((response) => {
      if (
        !response.url().includes('/delivery-units') ||
        response.request().method() !== 'GET'
      ) {
        return false;
      }
      return new URL(response.url()).searchParams.get('keyword') === keyword;
    });

    const main = page.getByRole('main');
    await main.getByRole('searchbox', { name: 'Tìm theo tên/mã' }).fill(keyword);
    const searchBody = await expectBusinessSuccess(await searchResponsePromise);

    expect(searchBody?.data?.length).toBeGreaterThan(0);
    for (const unit of searchBody.data) {
      expect(`${unit?.code || ''} ${unit?.name || ''}`.toLowerCase()).toContain(
        keyword.toLowerCase(),
      );
    }

    const table = main.getByRole('table');
    await expect(table.getByRole('cell', { name: target.code, exact: true }).first()).toBeVisible();
  });

  test('Vantai_33 lọc đơn vị vận chuyển theo loại', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    const targetType = initialBody?.data?.find((unit) => unit?.type)?.type;
    expect(targetType, 'Vantai_33 yêu cầu dữ liệu có loại đơn vị vận chuyển').toBeTruthy();

    const typeLabel = targetType === 'INTERNAL' ? 'Nội bộ' : 'Bên ngoài';
    const filterResponsePromise = page.waitForResponse((response) => {
      if (
        !response.url().includes('/delivery-units') ||
        response.request().method() !== 'GET'
      ) {
        return false;
      }
      return new URL(response.url()).searchParams.get('type') === targetType;
    });

    const filters = page.getByRole('main').locator('form');
    await filters.locator('.ant-select').filter({ hasText: 'Loại' }).click();
    await page.locator('.ant-select-dropdown:visible').getByText(typeLabel, { exact: true }).click();
    const filteredBody = await expectBusinessSuccess(await filterResponsePromise);

    expect(filteredBody?.data?.length).toBeGreaterThan(0);
    for (const unit of filteredBody.data) {
      expect(unit?.type).toBe(targetType);
    }

    const table = page.getByRole('main').getByRole('table');
    const dataRows = table.locator('.ant-table-tbody .ant-table-row');
    await expect(dataRows.first()).toContainText(typeLabel);
  });

  test('Vantai_34 lọc đơn vị vận chuyển theo trạng thái hoạt động', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    const targetStatus = initialBody?.data?.find((unit) => unit?.status)?.status;
    expect(targetStatus, 'Vantai_34 yêu cầu dữ liệu có trạng thái hoạt động').toBeTruthy();

    const statusLabel = targetStatus === 'ACTIVE' ? 'Hoạt động' : 'Ngừng';
    const displayLabel = targetStatus === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động';
    const filterResponsePromise = page.waitForResponse((response) => {
      if (
        !response.url().includes('/delivery-units') ||
        response.request().method() !== 'GET'
      ) {
        return false;
      }
      return new URL(response.url()).searchParams.get('status') === targetStatus;
    });

    const filters = page.getByRole('main').locator('form');
    await filters.locator('.ant-select').filter({ hasText: 'Trạng thái' }).click();
    await page
      .locator('.ant-select-dropdown:visible')
      .getByText(statusLabel, { exact: true })
      .click();
    const filteredBody = await expectBusinessSuccess(await filterResponsePromise);

    expect(filteredBody?.data?.length).toBeGreaterThan(0);
    for (const unit of filteredBody.data) {
      expect(unit?.status).toBe(targetStatus);
    }

    const rows = page
      .getByRole('main')
      .getByRole('table')
      .locator('.ant-table-tbody .ant-table-row');
    await expect(rows.first()).toContainText(displayLabel);
  });

  test('Vantai_35 xem công nợ đơn vị vận chuyển', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    expect(
      initialBody?.data?.length,
      'Vantai_35 yêu cầu có ít nhất một đơn vị vận chuyển',
    ).toBeGreaterThan(0);

    const target = initialBody.data[0];
    const debtResponsePromise = page.waitForResponse((response) => {
      if (
        !response.url().includes('/delivery-orders') ||
        response.request().method() !== 'GET'
      ) {
        return false;
      }
      return new URL(response.url()).searchParams.get('deliveryUnitId') === String(target.id);
    });

    const row = page
      .getByRole('main')
      .getByRole('row')
      .filter({ hasText: target.code })
      .first();
    await row.getByRole('button', { name: 'Công nợ', exact: true }).click();
    await expectBusinessSuccess(await debtResponsePromise);

    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText(`Lịch sử ghi nợ và thanh toán - ${target.name}`, { exact: true }),
    });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Lịch sử ghi nợ', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Lịch sử thanh toán', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Lịch sử bồi thường', { exact: true })).toBeVisible();
  });

  test('Vantai_36 kiểm tra phân trang danh sách đơn vị vận chuyển', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    const total = Number(initialBody?.page?.total_elements || 0);
    test.skip(total <= 20, `Vantai_36 cần trên 20 bản ghi, môi trường hiện có ${total}.`);

    const pageResponsePromise = page.waitForResponse((response) => {
      if (
        !response.url().includes('/delivery-units') ||
        response.request().method() !== 'GET'
      ) {
        return false;
      }
      return new URL(response.url()).searchParams.get('page') === '1';
    });

    const pagination = page.getByRole('main').locator('.ant-pagination');
    await expect(pagination).toBeVisible();
    await pagination.getByTitle('2').click();
    const pageBody = await expectBusinessSuccess(await pageResponsePromise);

    expect(pageBody?.page?.current_page).toBe(1);
    expect(pageBody?.data?.length).toBeGreaterThan(0);
    await expect(pagination.locator('.ant-pagination-item-active')).toHaveText('2');
  });

  test('Vantai_37 kiểm tra giao diện Thêm đơn vị vận chuyển', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expectBusinessSuccess(await initialResponsePromise);

    await page.getByRole('main').getByRole('button', { name: /Thêm mới/i }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Thêm đơn vị vận chuyển', { exact: true }),
    });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Tên đơn vị', { exact: true })).toBeVisible();
    await expect(drawer.getByPlaceholder('Tên đơn vị vận chuyển')).toBeVisible();
    await expect(drawer.getByText('Mã đơn vị', { exact: true })).toBeVisible();
    await expect(drawer.getByPlaceholder('Ví dụ: GHTK, GHN...')).toBeVisible();
    await expect(drawer.getByText('Loại', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Trạng thái', { exact: true })).toBeVisible();

    const footer = drawer.locator('.ant-drawer-footer');
    await expect(footer.getByRole('button', { name: 'Hủy', exact: true })).toBeVisible();
    await expect(footer.getByRole('button', { name: 'Lưu', exact: true })).toBeVisible();
  });

  test('Vantai_38 thêm đơn vị Bên ngoài đang Hoạt động', async ({ page }, testInfo) => {
    test.skip(
      process.env.VNPOST_ALLOW_DELIVERY_UNIT_CREATE !== 'true',
      'Backend không có API xóa đơn vị vận chuyển; chỉ chạy khi cho phép tạo dữ liệu không thể cleanup.',
    );

    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expectBusinessSuccess(await initialResponsePromise);

    const suffix = `${Date.now()}${testInfo.workerIndex}`.slice(-10);
    const code = `AUTO_EXT_${suffix}`;
    const name = `AUTO Bên ngoài ${suffix}`;
    await page.getByRole('main').getByRole('button', { name: /Thêm mới/i }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Thêm đơn vị vận chuyển', { exact: true }),
    });
    await drawer.getByPlaceholder('Tên đơn vị vận chuyển').fill(name);
    await drawer.getByPlaceholder('Ví dụ: GHTK, GHN...').fill(code);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'POST',
    );
    await drawer
      .locator('.ant-drawer-footer')
      .getByRole('button', { name: 'Lưu', exact: true })
      .click();
    const createBody = await expectBusinessSuccess(await createResponsePromise);
    expect(createBody?.data?.code).toBe(code);
    expect(createBody?.data?.type).toBe('EXTERNAL');
    expect(createBody?.data?.status).toBe('ACTIVE');

    await expect(page.getByText('Tạo mới thành công', { exact: true })).toBeVisible();
    await expect(page.getByRole('main').getByRole('cell', { name: code, exact: true })).toBeVisible();
  });

  test('Vantai_39 thêm đơn vị Bên ngoài Ngừng hoạt động', async ({ page }, testInfo) => {
    test.skip(
      process.env.VNPOST_ALLOW_DELIVERY_UNIT_CREATE !== 'true',
      'Backend không có API xóa đơn vị vận chuyển; chỉ chạy khi cho phép tạo dữ liệu không thể cleanup.',
    );

    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expectBusinessSuccess(await initialResponsePromise);

    const suffix = `${Date.now()}${testInfo.workerIndex}`.slice(-10);
    const code = `AUTO_EXT_OFF_${suffix}`;
    const name = `AUTO Bên ngoài ngừng ${suffix}`;
    await page.getByRole('main').getByRole('button', { name: /Thêm mới/i }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Thêm đơn vị vận chuyển', { exact: true }),
    });
    await drawer.getByPlaceholder('Tên đơn vị vận chuyển').fill(name);
    await drawer.getByPlaceholder('Ví dụ: GHTK, GHN...').fill(code);

    const statusItem = drawer.locator('.ant-form-item').filter({
      has: drawer.getByText('Trạng thái', { exact: true }),
    });
    await statusItem.locator('.ant-select').click();
    await page
      .locator('.ant-select-dropdown:visible')
      .getByText('Ngừng hoạt động', { exact: true })
      .click();

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'POST',
    );
    await drawer
      .locator('.ant-drawer-footer')
      .getByRole('button', { name: 'Lưu', exact: true })
      .click();
    const createBody = await expectBusinessSuccess(await createResponsePromise);
    expect(createBody?.data?.code).toBe(code);
    expect(createBody?.data?.type).toBe('EXTERNAL');
    expect(createBody?.data?.status).toBe('INACTIVE');

    await expect(page.getByText('Tạo mới thành công', { exact: true })).toBeVisible();
    const createdRow = page.getByRole('main').getByRole('row').filter({ hasText: code }).first();
    await expect(createdRow).toContainText('Ngừng hoạt động');
  });

  test('Vantai_40 thêm đơn vị Nội bộ đang Hoạt động', async ({ page }, testInfo) => {
    test.skip(
      process.env.VNPOST_ALLOW_DELIVERY_UNIT_CREATE !== 'true',
      'Backend không có API xóa đơn vị vận chuyển; chỉ chạy khi cho phép tạo dữ liệu không thể cleanup.',
    );

    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expectBusinessSuccess(await initialResponsePromise);

    const suffix = `${Date.now()}${testInfo.workerIndex}`.slice(-10);
    const code = `AUTO_INT_${suffix}`;
    const name = `AUTO Nội bộ ${suffix}`;
    await page.getByRole('main').getByRole('button', { name: /Thêm mới/i }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Thêm đơn vị vận chuyển', { exact: true }),
    });
    await drawer.getByPlaceholder('Tên đơn vị vận chuyển').fill(name);
    await drawer.getByPlaceholder('Ví dụ: GHTK, GHN...').fill(code);

    const typeItem = drawer.locator('.ant-form-item').filter({
      has: drawer.getByText('Loại', { exact: true }),
    });
    await typeItem.locator('.ant-select').click();
    await page.locator('.ant-select-dropdown:visible').getByText('Nội bộ', { exact: true }).click();

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'POST',
    );
    await drawer
      .locator('.ant-drawer-footer')
      .getByRole('button', { name: 'Lưu', exact: true })
      .click();
    const createBody = await expectBusinessSuccess(await createResponsePromise);
    expect(createBody?.data?.code).toBe(code);
    expect(createBody?.data?.type).toBe('INTERNAL');
    expect(createBody?.data?.status).toBe('ACTIVE');

    await expect(page.getByText('Tạo mới thành công', { exact: true })).toBeVisible();
    const createdRow = page.getByRole('main').getByRole('row').filter({ hasText: code }).first();
    await expect(createdRow).toContainText('Nội bộ');
    await expect(createdRow).toContainText('Hoạt động');
  });

  test('Vantai_41 thêm đơn vị Nội bộ Ngừng hoạt động', async ({ page }, testInfo) => {
    test.skip(
      process.env.VNPOST_ALLOW_DELIVERY_UNIT_CREATE !== 'true',
      'Backend không có API xóa đơn vị vận chuyển; chỉ chạy khi cho phép tạo dữ liệu không thể cleanup.',
    );

    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expectBusinessSuccess(await initialResponsePromise);

    const suffix = `${Date.now()}${testInfo.workerIndex}`.slice(-10);
    const code = `AUTO_INT_OFF_${suffix}`;
    const name = `AUTO Nội bộ ngừng ${suffix}`;
    await page.getByRole('main').getByRole('button', { name: /Thêm mới/i }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Thêm đơn vị vận chuyển', { exact: true }),
    });
    await drawer.getByPlaceholder('Tên đơn vị vận chuyển').fill(name);
    await drawer.getByPlaceholder('Ví dụ: GHTK, GHN...').fill(code);

    const typeItem = drawer.locator('.ant-form-item').filter({
      has: drawer.getByText('Loại', { exact: true }),
    });
    await typeItem.locator('.ant-select').click();
    await page.locator('.ant-select-dropdown:visible').getByText('Nội bộ', { exact: true }).click();

    const statusItem = drawer.locator('.ant-form-item').filter({
      has: drawer.getByText('Trạng thái', { exact: true }),
    });
    await statusItem.locator('.ant-select').click();
    await page
      .locator('.ant-select-dropdown:visible')
      .getByText('Ngừng hoạt động', { exact: true })
      .click();

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'POST',
    );
    await drawer
      .locator('.ant-drawer-footer')
      .getByRole('button', { name: 'Lưu', exact: true })
      .click();
    const createBody = await expectBusinessSuccess(await createResponsePromise);
    expect(createBody?.data?.code).toBe(code);
    expect(createBody?.data?.type).toBe('INTERNAL');
    expect(createBody?.data?.status).toBe('INACTIVE');

    const createdRow = page.getByRole('main').getByRole('row').filter({ hasText: code }).first();
    await expect(createdRow).toContainText('Nội bộ');
    await expect(createdRow).toContainText('Ngừng hoạt động');
  });

  test('Vantai_42 validate thông tin bắt buộc khi thêm đơn vị vận chuyển', async ({
    page,
  }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expectBusinessSuccess(await initialResponsePromise);

    await page.getByRole('main').getByRole('button', { name: /Thêm mới/i }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Thêm đơn vị vận chuyển', { exact: true }),
    });
    let postCount = 0;
    const countPost = (request) => {
      if (
        request.url().includes('/delivery-units') &&
        request.method() === 'POST'
      ) {
        postCount += 1;
      }
    };
    page.on('request', countPost);
    try {
      await drawer
        .locator('.ant-drawer-footer')
        .getByRole('button', { name: 'Lưu', exact: true })
        .click();
      await expect(drawer.getByText('Vui lòng nhập tên', { exact: true })).toBeVisible();
      await expect(drawer.getByText('Vui lòng nhập mã', { exact: true })).toBeVisible();
      expect(postCount).toBe(0);
    } finally {
      page.off('request', countPost);
    }
  });

  test('Vantai_43 không cho thêm đơn vị có mã đã tồn tại', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    expect(
      initialBody?.data?.length,
      'Vantai_43 yêu cầu có ít nhất một mã đơn vị đã tồn tại',
    ).toBeGreaterThan(0);

    const existing = initialBody.data[0];
    await page.getByRole('main').getByRole('button', { name: /Thêm mới/i }).click();
    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Thêm đơn vị vận chuyển', { exact: true }),
    });
    await drawer.getByPlaceholder('Tên đơn vị vận chuyển').fill(`Trùng mã ${Date.now()}`);
    await drawer.getByPlaceholder('Ví dụ: GHTK, GHN...').fill(existing.code);

    const duplicateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'POST',
    );
    await drawer
      .locator('.ant-drawer-footer')
      .getByRole('button', { name: 'Lưu', exact: true })
      .click();
    const response = await duplicateResponsePromise;
    const body = await response.json();

    expect(String(body?.status?.code)).not.toBe('200');
    expect(body?.status?.message).toContain('Mã đơn vị vận chuyển đã tồn tại');
    await expect(page.getByText(/Mã đơn vị vận chuyển đã tồn tại/i)).toBeVisible();
    await expect(drawer).toBeVisible();
  });

  test('Vantai_44 sửa tên đơn vị vận chuyển', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    expect(
      initialBody?.data?.length,
      'Vantai_44 yêu cầu có ít nhất một đơn vị vận chuyển',
    ).toBeGreaterThan(0);

    const target = initialBody.data[0];
    const originalName = target.name;
    const updatedName = `${originalName} AUTO ${Date.now()}`;
    let changed = false;

    const updateName = async (name) => {
      const row = page
        .getByRole('main')
        .getByRole('row')
        .filter({ hasText: target.code })
        .first();
      await row.getByRole('button', { name: 'Sửa', exact: true }).click();
      const drawer = page.locator('.ant-drawer:visible').filter({
        has: page.getByText('Cập nhật đơn vị vận chuyển', { exact: true }),
      });
      const nameInput = drawer.getByPlaceholder('Tên đơn vị vận chuyển');
      await nameInput.fill(name);

      const updateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes(`/delivery-units/${target.id}`) &&
          response.request().method() === 'PUT',
      );
      await drawer
        .locator('.ant-drawer-footer')
        .getByRole('button', { name: 'Lưu', exact: true })
        .click();
      const body = await expectBusinessSuccess(await updateResponsePromise);
      expect(body?.data?.name).toBe(name);
    };

    try {
      await updateName(updatedName);
      changed = true;
      await expect(page.getByRole('main').getByText(updatedName, { exact: true })).toBeVisible();
    } finally {
      if (changed) {
        await updateName(originalName);
      }
    }
  });

  test('Vantai_45 không cho sửa mã đơn vị vận chuyển', async ({ page }) => {
    const initialResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/delivery-units') &&
        response.request().method() === 'GET',
    );
    await page.goto(DELIVERY_UNIT_ROUTE, { waitUntil: 'domcontentloaded' });
    const initialBody = await expectBusinessSuccess(await initialResponsePromise);
    expect(
      initialBody?.data?.length,
      'Vantai_45 yêu cầu có ít nhất một đơn vị vận chuyển',
    ).toBeGreaterThan(0);

    const target = initialBody.data[0];
    const row = page
      .getByRole('main')
      .getByRole('row')
      .filter({ hasText: target.code })
      .first();
    await row.getByRole('button', { name: 'Sửa', exact: true }).click();

    const drawer = page.locator('.ant-drawer:visible').filter({
      has: page.getByText('Cập nhật đơn vị vận chuyển', { exact: true }),
    });
    const codeInput = drawer.getByPlaceholder('Ví dụ: GHTK, GHN...');
    await expect(codeInput).toHaveValue(target.code);
    await expect(codeInput).toBeDisabled();

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
    } finally {
      page.off('request', countPut);
    }
  });
});
