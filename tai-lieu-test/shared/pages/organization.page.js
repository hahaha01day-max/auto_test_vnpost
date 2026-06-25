const { expect } = require('@playwright/test');

const ORGANIZATION_ROUTE = '/chain/organization-management';
const ORGANIZATION_API_PATH = '/v1.0/organization-unit';

class OrganizationPage {
  constructor(page) {
    this.page = page;
    this.searchInput = page.getByPlaceholder('Tìm kiếm');
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes(`${ORGANIZATION_API_PATH}/search`) &&
        response.request().method() === 'GET',
    );
    await this.page.goto(ORGANIZATION_ROUTE, { waitUntil: 'domcontentloaded' });
    const response = await listResponse;
    await expect(this.searchInput).toBeVisible();
    return response.request();
  }

  async openCreateDrawer() {
    await this.page.getByRole('button', { name: /Thêm đơn vị/i }).click();
    const drawer = this.page.locator('.ant-drawer:visible').filter({
      has: this.page.getByText('Thêm đơn vị tổ chức', { exact: true }),
    });
    await expect(drawer).toBeVisible();
    return drawer;
  }

  async create(data) {
    const drawer = await this.openCreateDrawer();
    await drawer.getByPlaceholder('Nhập mã đơn vị').fill(data.unitCode);
    await drawer.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(data.unitName);

    if (data.parentCode) {
      await drawer.getByPlaceholder('Chọn đơn vị cha').click();
      const popup = this.page.locator('.ant-select-dropdown:visible').last();
      await popup.getByText(new RegExp(data.parentCode), { exact: false }).first().click();
    } else {
      const parentName = process.env.VNPOST_ORG_PARENT_NAME;
      if (!parentName) {
        throw new Error('Thiếu VNPOST_ORG_PARENT_CODE hoặc VNPOST_ORG_PARENT_NAME.');
      }
      await drawer.getByPlaceholder('Chọn đơn vị cha').click();
      const popup = this.page.locator('.ant-select-dropdown:visible').last();
      await popup.getByText(parentName, { exact: false }).first().click();
    }

    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes(ORGANIZATION_API_PATH) &&
        !response.url().includes('/search') &&
        response.request().method() === 'POST',
    );
    await drawer.getByRole('button', { name: 'Xác nhận', exact: true }).click();
    return responsePromise;
  }

  async search(name) {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes(`${ORGANIZATION_API_PATH}/search`) &&
        response.request().method() === 'GET',
    );
    await this.searchInput.fill(name);
    await responsePromise;
  }
}

module.exports = { ORGANIZATION_ROUTE, OrganizationPage };
