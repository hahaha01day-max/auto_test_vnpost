const { expect, test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const MODULE_DIR = path.resolve(__dirname, '..');
const ANH_DIR = path.join(MODULE_DIR, 'anh-chup');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

const NHAN = {
  MAC: 'Bình quân gia quyền',
  FIFO: 'Nhập trước xuất trước',
  SPECIFIC_IDENTIFICATION: 'Thực tế đích danh',
  STANDARD: 'Giá tiêu chuẩn',
};

/**
 * Kiểm đúng phần vừa sửa ở `AddProductDrawer`: màn thêm sản phẩm phải lấy mặc định TỪ CẤU HÌNH.
 *
 * 🔴 Vì sao giả lập phản hồi thay vì đổi cấu hình thật: cấu hình trên môi trường này đang là MAC,
 * trùng đúng giá trị FE từng hardcode ⇒ chạy với dữ liệu thật thì pass cũng không chứng minh được
 * gì. Chặn API và trả FIFO là cách duy nhất phân biệt "đọc cấu hình" với "hardcode", mà không
 * phải ghi vào DB prod.
 */
test('GVMD-017 Màn thêm sản phẩm lấy mặc định theo cấu hình (giả lập FIFO)', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-017');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');
  test.skip(Boolean(missingRoleReason('tct')), missingRoleReason('tct') ?? '');

  const stockType = input.data.stockType;
  const goi = { code: '200', message: 'Thành công', label: 'API_STATUS_SUCCESS' };

  await page.route('**/chain-cost-method-config/system', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: goi, data: stockType }),
    }),
  );
  await page.route('**/chain-cost-method-config/categories', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: goi, data: [] }),
    }),
  );

  await moTrang(page, '/product/normal', 'tct');
  await page.getByRole('button', { name: /Thêm mới|Thêm sản phẩm/ }).first().click();

  const drawer = page.getByRole('dialog', { name: 'Thêm sản phẩm' });
  await expect(drawer).toBeVisible();

  const khoi = drawer
    .getByText('Phương pháp tính giá vốn', { exact: true })
    .locator('xpath=ancestor::div[3]');
  await khoi.scrollIntoViewIfNeeded();

  // 🚫 Không chờ bằng waitForTimeout: chờ đúng nội dung mong đợi xuất hiện trong khối.
  await expect(khoi).toContainText(NHAN[stockType]);
  expect(chuan(await khoi.innerText())).not.toContain(NHAN.MAC);

  await page.screenshot({ path: path.join(ANH_DIR, 'GVMD-017-mac-dinh-fifo.png'), fullPage: true });
});
