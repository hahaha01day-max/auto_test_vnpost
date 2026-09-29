const { expect, test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const MODULE_DIR = path.resolve(__dirname, '..');
const ANH_DIR = path.join(MODULE_DIR, 'anh-chup');
const URL_CAU_HINH = '/settings?setting=costMethodDefault';

/**
 * Kiểm riêng phần FE dựng cây, bằng dữ liệu giả lập 3 cấp.
 *
 * 🔴 Vì sao không dùng dữ liệu thật: cây thật phụ thuộc `parentId` mà backend vừa bổ sung,
 * nên trước khi core-service khởi động lại thì ca này không chạy được bằng dữ liệu thật
 * (xem GVMD-019). Giả lập ở đây kiểm đúng một việc: FE có dựng cây từ `parentId` hay không.
 */
test('GVMD-020 FE dựng cây danh mục đúng theo parentId (giả lập dữ liệu)', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-020');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');
  test.skip(Boolean(missingRoleReason('tct')), missingRoleReason('tct') ?? '');

  const goi = { code: '200', message: 'Thành công', label: 'API_STATUS_SUCCESS' };
  const dong = (categoryId, categoryName, parentId) => ({
    id: null,
    categoryId,
    categoryName,
    categoryCode: `CODE_${categoryId}`,
    parentId,
    stockType: null,
    stockTypeName: null,
    effectiveStockType: 'MAC',
    effectiveStockTypeName: 'Bình quân gia quyền',
    source: 'SYSTEM',
    inheritedFromCategoryName: null,
  });

  await page.route('**/chain-cost-method-config/categories', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: goi,
        data: [
          dong(9001, 'Danh mục gốc kiểm thử', 0),
          dong(9002, 'Danh mục con kiểm thử', 9001),
          dong(9003, 'Danh mục cháu kiểm thử', 9002),
        ],
      }),
    }),
  );

  await moTrang(page, URL_CAU_HINH, 'tct');
  await page.getByRole('tab', { name: 'Cấu hình theo danh mục' }).click();

  const bang = page.locator('.ant-table').first();
  const dongCua = (ten) => bang.locator('tbody tr.ant-table-row').filter({ hasText: ten }).first();

  // Ban đầu chỉ có danh mục gốc; con và cháu còn nằm trong nhánh đang thu gọn.
  await expect(dongCua('Danh mục gốc kiểm thử')).toBeVisible();
  await expect(bang.getByText('Danh mục con kiểm thử')).toHaveCount(0);

  await dongCua('Danh mục gốc kiểm thử')
    .locator('.ant-table-row-expand-icon-collapsed')
    .click();
  await expect(dongCua('Danh mục con kiểm thử')).toBeVisible();
  await expect(bang.getByText('Danh mục cháu kiểm thử')).toHaveCount(0);

  await dongCua('Danh mục con kiểm thử')
    .locator('.ant-table-row-expand-icon-collapsed')
    .click();
  await expect(dongCua('Danh mục cháu kiểm thử')).toBeVisible();

  // Nút lá không được có nút mở rộng (antd vẫn hiện nút nếu `children` là mảng rỗng).
  await expect(
    dongCua('Danh mục cháu kiểm thử').locator('.ant-table-row-expand-icon-collapsed'),
  ).toHaveCount(0);

  await page.screenshot({ path: path.join(ANH_DIR, 'GVMD-020-cay-danh-muc.png'), fullPage: true });
});
