const { expect, test } = require('@playwright/test');
const path = require('node:path');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const ANH_DIR = path.join(path.resolve(__dirname, '..'), 'anh-chup');
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * Ảnh chứng minh cho báo cáo. 🚫 Không phải test nghiệm thu: nhóm này chỉ ghi lại
 * NGUYÊN TRẠNG để người đọc báo cáo tự đối chiếu, không thay thế case GVMD-001..012.
 */
test.beforeEach(async () => {
  test.skip(Boolean(missingRoleReason('tct')), missingRoleReason('tct') ?? '');
});

test('BC-01 Menu Cấu hình có mục "Giá vốn mặc định" và mở đúng tab', async ({ page }) => {
  await moTrang(page, '/settings?setting=costMethodDefault', 'tct');
  await expect(page.getByRole('menuitem', { name: /Làm tròn tiền$/ })).toBeVisible();

  const menu = page.locator('.setting-menu');
  const nhan = (await menu.getByRole('menuitem').allInnerTexts()).map(chuan);
  await page.screenshot({ path: path.join(ANH_DIR, 'BC-01-menu-cau-hinh.png'), fullPage: true });

  // Trước khi sửa: mục bị ẩn bởi `hidden: !shopPrivate` nên URL bị ép về `setting=roundingAmount`.
  expect(nhan.join(' | ')).toContain('Giá vốn mặc định');
  expect(page.url()).toContain('setting=costMethodDefault');
});

test('BC-02 Màn thêm sản phẩm — ô Phương pháp tính giá vốn', async ({ page }) => {
  await moTrang(page, '/product/normal', 'tct');
  await page.getByRole('button', { name: /Thêm mới|Thêm sản phẩm/ }).first().click();

  // Màn thêm sản phẩm là DIALOG (.ant-modal), 🚫 không phải .ant-drawer — đọc cây trợ năng mới thấy.
  const drawer = page.getByRole('dialog', { name: 'Thêm sản phẩm' });
  await expect(drawer).toBeVisible();
  // Nhãn và ô chọn là hai div anh em trong cùng một khối — bám nhãn rồi leo 2 cấp,
  // 🚫 không dùng .ant-form-item (khối này không phải Form.Item của antd).
  const nhan = drawer.getByText('Phương pháp tính giá vốn', { exact: true });
  await nhan.scrollIntoViewIfNeeded();
  await expect(nhan).toBeVisible();
  await page.screenshot({ path: path.join(ANH_DIR, 'BC-02-them-san-pham.png'), fullPage: true });
});
