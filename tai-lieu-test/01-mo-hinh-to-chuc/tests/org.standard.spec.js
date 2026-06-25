const { test, expect } = require('@playwright/test');
const { extractApiHeaders } = require('../../shared/api/base-api');
const { OrganizationApi } = require('../../shared/api/organization-api');
const { expectBusinessSuccess } = require('../../shared/assertions/response-assertions');
const { buildOrganizationData } = require('../../shared/builders/organization-builder');
const { OrganizationPage } = require('../../shared/pages/organization.page');

test.describe('VNPost - Mô hình tổ chức chuẩn UI + API', () => {
  test('ORG-SMOKE-001 mở màn và tải cây tổ chức', async ({ page }) => {
    const organizationPage = new OrganizationPage(page);
    const apiRequest = await organizationPage.goto();

    expect(apiRequest.headers().appid).toBeTruthy();
    await expect(page.getByText('Mô hình tổ chức', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Thêm đơn vị/i })).toBeVisible();
  });

  test('ORG-VALIDATION-001 validate form tạo rỗng', async ({ page }) => {
    const organizationPage = new OrganizationPage(page);
    await organizationPage.goto();
    const drawer = await organizationPage.openCreateDrawer();

    await drawer.getByRole('button', { name: 'Xác nhận', exact: true }).click();

    await expect(drawer.getByText('Vui lòng nhập mã đơn vị')).toBeVisible();
    await expect(drawer.getByText('Vui lòng nhập tên đơn vị')).toBeVisible();
    await expect(drawer.getByText('Vui lòng chọn đơn vị cha')).toBeVisible();
  });

  test('ORG-CRUD-001 tạo từ UI, verify và cleanup bằng API', async ({ page, request }, testInfo) => {
    const organizationPage = new OrganizationPage(page);
    const listRequest = await organizationPage.goto();
    const api = new OrganizationApi(request, extractApiHeaders(listRequest));
    const data = buildOrganizationData(testInfo);
    let created = false;

    try {
      const createResponse = await organizationPage.create(data);
      const createBody = await expectBusinessSuccess(createResponse);
      created = true;

      const persisted = await api.detail(data.unitCode);
      expect(persisted?.unitCode).toBe(data.unitCode);
      expect(persisted?.unitName).toBe(data.unitName);
      if (data.parentCode) {
        expect(persisted?.parentCode).toBe(data.parentCode);
      }

      await organizationPage.search(data.unitName);
      await expect(page.getByText(data.unitName, { exact: true })).toBeVisible();
      testInfo.annotations.push({
        type: 'CREATED_ENTITY',
        description: String(createBody?.data?.unitCode || data.unitCode),
      });
    } finally {
      if (created) {
        await api.remove(data.unitCode);
      }
    }
  });
});
