const { expect } = require('@playwright/test');
const { moTrang } = require('../auth/login');

const ORGANIZATION_ROUTE = '/chain/organization-management';
const ORGANIZATION_API_PATH = '/v1.0/organization-unit';

class OrganizationPage {
  constructor(page, roleKey = 'tct') {
    this.page = page;
    this.roleKey = roleKey;
    this.searchInput = page.getByPlaceholder('Tìm kiếm');
  }

  async goto() {
    const listResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes(`${ORGANIZATION_API_PATH}/search`) &&
        response.request().method() === 'GET',
    );
    // 🔴 `page.goto` trần không đủ: phiên lưu ở storageState có thể đã hết hạn giữa hai test,
    //    app đá về `/account` và mọi `waitForResponse` sau đó treo tới timeout với lý do vô nghĩa.
    //    `moTrang` tự đăng nhập lại đúng vai rồi mới đi tiếp.
    await moTrang(this.page, ORGANIZATION_ROUTE, this.roleKey);
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

    // 🔴 antd render placeholder của Select thành <span>, KHÔNG phải thuộc tính `placeholder`
    //    của <input> ⇒ `getByPlaceholder('Chọn đơn vị cha')` không bao giờ khớp. Bám theo
    //    accessible name của combobox (nhãn "Đơn vị cha" + dấu *) mới ổn định.
    const oChaCha = drawer.getByRole('combobox', { name: /Đơn vị cha/ });
    await oChaCha.click();

    const nhan = data.parentCode || process.env.VNPOST_ORG_PARENT_CODE
      || process.env.VNPOST_ORG_PARENT_NAME;
    if (!nhan) {
      throw new Error('Thiếu data.parentCode, VNPOST_ORG_PARENT_CODE hoặc VNPOST_ORG_PARENT_NAME.');
    }

    // Danh sách đơn vị cha dài và có phân trang ảo ⇒ gõ để lọc trước khi chọn.
    await oChaCha.fill(String(nhan));
    const popup = this.page.locator('.ant-select-dropdown:visible').last();
    await expect(popup).toBeVisible();

    // 🔴 Ô "Đơn vị cha" là **TreeSelect**, 🚫 không phải Select thường:
    //    - item là `.ant-select-tree-node-content-wrapper`, KHÔNG có `.ant-select-item-option`;
    //    - `getByText` trúng `<span aria-live="assertive">` mà antd chèn để đọc cho screen-reader
    //      (phần tử ẩn) rồi treo 20s ở "element is not visible";
    //    - lọc theo `treeNodeFilterProp: "title"`, mà title là `"<mã> - <tên>"`
    //      (`useOrganizationTreeMapping.jsx:60`) ⇒ gõ mã hay tên đều khớp.
    const nut = popup.locator('.ant-select-tree-node-content-wrapper')
      .filter({ hasText: new RegExp(String(nhan)) });
    await expect(nut.first()).toBeVisible();
    await nut.first().click();

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
