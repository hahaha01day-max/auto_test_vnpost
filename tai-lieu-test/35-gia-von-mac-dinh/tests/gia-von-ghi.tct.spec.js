const { expect, test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const MODULE_DIR = path.resolve(__dirname, '..');
const ANH_DIR = path.join(MODULE_DIR, 'anh-chup');
const URL_CAU_HINH = '/settings?setting=costMethodDefault';
const API = '/chain-cost-method-config';

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
const NHAN = {
  MAC: 'Bình quân gia quyền',
  FIFO: 'Nhập trước xuất trước',
  SPECIFIC_IDENTIFICATION: 'Thực tế đích danh',
  STANDARD: 'Giá tiêu chuẩn',
};

/**
 * 🔴 Ba case dưới đây GHI vào cấu hình cấp chuỗi. core-service local đang trỏ DB PROD
 * (`all.env` → 103.109.43.112), nên `allowMutation` để **false** trong test-input.json.
 * 🚫 Không tự bật: đổi cấu hình giá vốn mặc định của chuỗi thật là đổi hành vi tạo sản phẩm
 * của toàn hệ thống, và nếu lỡ bấm "Áp dụng cho cả sản phẩm đã có" thì hàng nghìn sản phẩm
 * đổi phương pháp giá vốn — việc này KHÔNG dọn lại được bằng test.
 */
test.beforeEach(async () => {
  test.skip(Boolean(missingRoleReason('tct')), missingRoleReason('tct') ?? '');
});

async function moMan(page) {
  const cho = page.waitForResponse(
    (r) => r.url().includes(`${API}/categories`) && r.request().method() === 'GET',
  );
  await moTrang(page, URL_CAU_HINH, 'tct');
  return (await cho).json().catch(() => null);
}

test('GVMD-010 Lưu cấu hình toàn hệ thống hiện popup xác nhận 2 lựa chọn', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-010');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  await moMan(page);
  await page
    .locator('.ant-pro-card')
    .filter({ hasText: 'Áp dụng cho sản phẩm hình thức phân phối Mua bán' })
    .first()
    .getByRole('button', { name: /Sửa$/ })
    .first()
    .click();

  const drawer = page.getByRole('dialog', {
    name: 'Phương pháp tính giá vốn mặc định toàn hệ thống',
  });
  await drawer.getByRole('combobox').first().click();
  await page
    .locator('.ant-select-dropdown')
    .last()
    .locator('.ant-select-item-option')
    .filter({ hasText: NHAN[input.data.stockType] })
    .first()
    .click();

  const choPreview = page.waitForResponse(
    (r) => r.url().includes(`${API}/preview-apply`) && r.request().method() === 'GET',
  );
  await drawer.getByRole('button', { name: 'Lưu cấu hình' }).click();
  expect(String((await (await choPreview).json())?.status?.code)).toBe('200');

  const popup = page.locator('.ant-modal-confirm').filter({
    hasText: 'Xác nhận thay đổi phương pháp tính giá vốn',
  });
  await expect(popup).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Áp dụng cho cả sản phẩm đã có' })).toBeVisible();
  await expect(popup.getByRole('button', { name: 'Chỉ áp dụng từ nay' })).toBeVisible();
  expect(chuan(await popup.innerText())).toContain('Số sản phẩm sẽ đổi phương pháp');

  await page.screenshot({ path: path.join(ANH_DIR, 'GVMD-010.png'), fullPage: true });

  // 🔴 Đóng popup bằng Esc cũng chạy onCancel ⇒ vẫn LƯU. Case này chỉ chạy khi allowMutation=true,
  //    và khi đó nhánh "Chỉ áp dụng từ nay" là nhánh an toàn nhất: không đụng sản phẩm đã có.
  await popup.getByRole('button', { name: 'Chỉ áp dụng từ nay' }).click();
  await expect(page.getByText('Đã lưu cấu hình phương pháp tính giá vốn mặc định')).toBeVisible();
});

test('GVMD-011 Lưu cấu hình danh mục làm cột Nguồn thành "Cấu hình riêng"', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-011');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const body = await moMan(page);
  const danhMuc = body?.data?.find((item) => item.source !== 'SELF') || body?.data?.[0];
  expect(danhMuc, 'Cần ít nhất 1 danh mục').toBeTruthy();

  const bang = page.locator('.ant-table').first();
  const dong = bang.locator('tbody tr.ant-table-row').filter({ hasText: danhMuc.categoryName }).first();
  await dong.getByRole('button', { name: /Cấu hình$/ }).first().click();

  const drawer = page.getByRole('dialog', { name: /Phương pháp tính giá vốn/ });
  await drawer.getByRole('combobox').first().click();
  await page
    .locator('.ant-select-dropdown')
    .last()
    .locator('.ant-select-item-option')
    .filter({ hasText: NHAN[input.data.stockType] })
    .first()
    .click();
  await drawer.getByRole('button', { name: 'Lưu cấu hình' }).click();

  const popup = page.locator('.ant-modal-confirm');
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: 'Chỉ áp dụng từ nay' }).click();

  await expect(page.getByText('Đã lưu cấu hình cho danh mục')).toBeVisible();
  await expect(dong.locator('.ant-tag')).toHaveText('Cấu hình riêng');
  await expect(dong.getByRole('button', { name: 'Bỏ' })).toBeVisible();
  await page.screenshot({ path: path.join(ANH_DIR, 'GVMD-011.png'), fullPage: true });
});

test('GVMD-012 Bỏ cấu hình riêng thì danh mục kế thừa lại', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-012');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const body = await moMan(page);
  const danhMuc = body?.data?.find((item) => item.source === 'SELF');
  test.skip(!danhMuc, 'Chưa có danh mục nào đang mang cấu hình riêng để bỏ — chạy GVMD-011 trước.');

  const bang = page.locator('.ant-table').first();
  const dong = bang.locator('tbody tr.ant-table-row').filter({ hasText: danhMuc.categoryName }).first();
  await dong.getByRole('button', { name: 'Bỏ', exact: true }).click();

  const popup = page.locator('.ant-modal-confirm').filter({ hasText: 'Bỏ cấu hình riêng của danh mục' });
  await expect(popup).toBeVisible();
  await popup.getByRole('button', { name: 'Bỏ cấu hình' }).click();

  await expect(page.getByText('Đã bỏ cấu hình riêng của danh mục')).toBeVisible();
  await expect(dong.locator('.ant-tag')).not.toHaveText('Cấu hình riêng');
  await page.screenshot({ path: path.join(ANH_DIR, 'GVMD-012.png'), fullPage: true });
});
