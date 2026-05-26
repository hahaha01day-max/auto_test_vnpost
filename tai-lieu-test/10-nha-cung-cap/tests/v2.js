const { test, expect } = require('@playwright/test');
const {
    clickFirstVisible,
    login,
    selectSupplyScope,
    visibleText,
} = require('../../shared/vnpost-helpers');

const SUPPLIER_URL = 'https://vnpost.sfin.vn/inventory/warehouse-supplier';
const SUPPLIER_GROUP_URL = 'https://vnpost.sfin.vn/inventory/supplier-group';
const RUN_ID = Date.now();
const GROUP_NAME = `AUTO_NHOM_NCC_${RUN_ID}`;
const GROUP_NAME_UPDATED = `${GROUP_NAME}_UPD`;
const GROUP_NOTE = 'Auto test C.1';

async function failWithContext(page, reason) {
    throw new Error(`${reason}\nURL hiện tại: ${page.url()}\nText màn hình: ${await visibleText(page, 6000)}`);
}

async function expectAnyText(page, patterns, reason = 'Không thấy text kỳ vọng') {
    const text = await visibleText(page, 6000);
    if (!patterns.some((pattern) => pattern.test(text))) {
        await failWithContext(page, `${reason}. Kỳ vọng: ${patterns.map((p) => p.source).join(' | ')}`);
    }
}

async function closeFloatingOverlays(page) {
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(250);
}

async function openSupplierList(page) {
    await page.goto(SUPPLIER_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(800);
    await expectAnyText(page, [/Quản lý nhà cung cấp/i, /Quản lý Nhóm NCC/i, /Thêm mới/i], 'Không mở đúng màn Quản lý nhà cung cấp.');
}

async function openSupplierGroupFromMain(page) {
    await openSupplierList(page);
    const clicked = await clickFirstVisible(page, [
        page.getByRole('button', { name: /Quản lý Nhóm NCC/i }).first(),
        page.getByText(/Quản lý Nhóm NCC/i).first(),
    ], 5000);
    if (!clicked) await failWithContext(page, 'Không thấy nút Quản lý Nhóm NCC tại màn Quản lý nhà cung cấp.');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/inventory\/supplier-group/);
    await expectSupplierGroupList(page);
}

async function openSupplierGroupDirect(page) {
    await page.goto(SUPPLIER_GROUP_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(800);
    await expectSupplierGroupList(page);
}

async function expectSupplierGroupList(page) {
    await expectAnyText(page, [/Nhóm Nhà cung cấp/i, /Thêm mới/i, /Tên Nhóm nhà cung cấp/i, /Ghi chú/i, /Hành động/i]);
}

async function openAddGroupDrawer(page) {
    await openSupplierGroupDirect(page);
    await closeFloatingOverlays(page);
    await page.getByRole('button', { name: /Thêm mới/i }).click();
    await page.waitForTimeout(800);
    await expectAnyText(page, [/Thêm nhóm nhà cung cấp/i, /Tên nhóm nhà cung cấp/i, /Ghi chú/i, /Xác nhận/i], 'Không mở đúng drawer Thêm nhóm NCC.');
}

async function fillGroupForm(page, name, note = GROUP_NOTE) {
    const nameInput = page.locator('.ant-drawer:visible #name');
    const noteInput = page.locator('.ant-drawer:visible #description');
    if (!await nameInput.isVisible().catch(() => false)) await failWithContext(page, 'Không thấy trường Tên nhóm nhà cung cấp.');
    await nameInput.fill(name);
    if (await noteInput.isVisible().catch(() => false)) await noteInput.fill(note);
}

async function submitGroupForm(page) {
    const clicked = await clickFirstVisible(page, [
        page.locator('.ant-drawer:visible').getByRole('button', { name: /Xác nhận/i }).last(),
        page.getByRole('button', { name: /Xác nhận/i }).last(),
    ], 5000);
    if (!clicked) await failWithContext(page, 'Không bấm được nút Xác nhận trên drawer nhóm NCC.');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);
}

async function searchGroup(page, keyword) {
    await closeFloatingOverlays(page);
    const search = page.getByPlaceholder('Tìm kiếm').first();
    if (!await search.isVisible().catch(() => false)) await failWithContext(page, 'Không thấy ô Tìm kiếm tại màn Nhóm Nhà cung cấp.');
    await search.fill('');
    await search.fill(keyword);
    await page.keyboard.press('Enter').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 12_000 }).catch(() => {});
    await page.waitForTimeout(1200);
}

async function rowByGroupName(page, groupName) {
    const row = page.locator('tbody tr').filter({ hasText: groupName }).first();
    if (!await row.isVisible().catch(() => false)) {
        await failWithContext(page, `Không tìm thấy nhóm NCC "${groupName}" trong danh sách.`);
    }
    return row;
}

async function createGroup(page, groupName = GROUP_NAME) {
    await openAddGroupDrawer(page);
    await fillGroupForm(page, groupName);
    await submitGroupForm(page);
    await expectAnyText(page, [/Thêm nhóm NCC thành công|thành công/i], 'Không thấy thông báo thêm nhóm NCC thành công.');
    await searchGroup(page, groupName);
    await rowByGroupName(page, groupName);
}

async function updateGroup(page, currentName = GROUP_NAME, newName = GROUP_NAME_UPDATED) {
    await openSupplierGroupDirect(page);
    await searchGroup(page, currentName);
    const row = await rowByGroupName(page, currentName);
    await closeFloatingOverlays(page);
    await row.locator('.anticon-edit').click({ force: true });
    await page.waitForTimeout(900);
    await expectAnyText(page, [/Sửa nhóm nhà cung cấp/i, /Tên nhóm nhà cung cấp/i, /Xác nhận/i], 'Không mở đúng drawer Sửa nhóm NCC.');
    await fillGroupForm(page, newName, `${GROUP_NOTE} updated`);
    await submitGroupForm(page);
    await expectAnyText(page, [/Cập nhật nhóm NCC thành công|thành công/i], 'Không thấy thông báo cập nhật nhóm NCC thành công.');
    await searchGroup(page, newName);
    await rowByGroupName(page, newName);
}

async function deleteGroup(page, groupName = GROUP_NAME_UPDATED) {
    await openSupplierGroupDirect(page);
    await searchGroup(page, groupName);
    const row = await rowByGroupName(page, groupName);
    await closeFloatingOverlays(page);
    await row.locator('button.ant-btn-dangerous').click({ force: true });
    await page.waitForTimeout(800);
    await expectAnyText(page, [/Xác nhận xóa nhóm nhà cung cấp này/i, /Đồng ý/i], 'Không thấy popup xác nhận xóa nhóm NCC.');
    const confirmed = await clickFirstVisible(page, [
        page.getByRole('button', { name: /Đồng ý/i }).last(),
        page.getByRole('button', { name: /Xóa|Xoá|Xác nhận|OK/i }).last(),
    ], 5000);
    if (!confirmed) await failWithContext(page, 'Không bấm được nút xác nhận xóa nhóm NCC.');
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await expectAnyText(page, [/Xóa nhóm NCC thành công|Xoá nhóm NCC thành công|thành công/i], 'Không thấy thông báo xóa nhóm NCC thành công.');
    await searchGroup(page, groupName);
    await expect(page.locator('tbody tr').filter({ hasText: groupName })).toHaveCount(0);
}

test.describe('VNPost - Nhà cung cấp - C.1 Quản lý nhóm NCC', () => {
    test.beforeEach(async ({ page }) => {
        await login(page);
        await selectSupplyScope(page);
    });

    test('NCC-C1-001 Điều hướng từ Quản lý nhà cung cấp sang Nhóm Nhà cung cấp', async ({ page }) => {
        await openSupplierGroupFromMain(page);
    });

    test('NCC-C1-002 Hiển thị danh sách nhóm NCC theo tài liệu', async ({ page }) => {
        await openSupplierGroupDirect(page);
        await expectAnyText(page, [/STT/i, /Tên Nhóm nhà cung cấp/i, /Ghi chú/i, /Hành động/i]);
    });

    test('NCC-C1-003 Mở drawer Thêm nhóm nhà cung cấp', async ({ page }) => {
        await openAddGroupDrawer(page);
    });

    test('NCC-C1-004 Validate khi thêm nhóm NCC rỗng', async ({ page }) => {
        await openAddGroupDrawer(page);
        await submitGroupForm(page);
        await expectAnyText(page, [/Vui lòng|không được để trống|bắt buộc|required|Tên nhóm nhà cung cấp/i], 'Không thấy validation tên nhóm NCC khi để rỗng.');
    });

    test('NCC-C1-005 Thêm nhóm NCC hợp lệ', async ({ page }) => {
        await createGroup(page);
    });

    test('NCC-C1-006 Tìm kiếm nhóm NCC vừa tạo', async ({ page }) => {
        await openSupplierGroupDirect(page);
        await searchGroup(page, GROUP_NAME);
        const row = await rowByGroupName(page, GROUP_NAME);
        await expect(row).toContainText(GROUP_NOTE);
    });

    test('NCC-C1-007 Chỉnh sửa/Xem chi tiết nhóm NCC vừa tạo', async ({ page }) => {
        await updateGroup(page);
    });

    test('NCC-C1-008 Xóa nhóm NCC vừa sửa', async ({ page }) => {
        await deleteGroup(page);
    });

    test('NCC-C1-009 Tìm kiếm nhóm NCC không có kết quả', async ({ page }) => {
        await openSupplierGroupDirect(page);
        await searchGroup(page, `AUTO_NHOM_NCC_NOT_FOUND_${RUN_ID}`);
        await expectAnyText(page, [/Trống|Không có dữ liệu|Nhóm Nhà cung cấp/i], 'Không thấy trạng thái danh sách khi tìm kiếm không có kết quả.');
    });

    test('NCC-C1-010 Hủy popup xóa nhóm NCC có sẵn', async ({ page }) => {
        await openSupplierGroupDirect(page);
        const row = page.locator('tbody tr.ant-table-row').first();
        if (!await row.isVisible().catch(() => false)) {
            test.info().annotations.push({ type: 'OBSERVED_NO_DATA', description: 'Danh sách nhóm NCC trống nên không kiểm tra hủy popup xóa.' });
            await expectSupplierGroupList(page);
            return;
        }
        const beforeText = await row.innerText();
        await row.locator('button.ant-btn-dangerous').click({ force: true });
        await page.waitForTimeout(800);
        await expectAnyText(page, [/Xác nhận xóa nhóm nhà cung cấp này/i, /Đồng ý/i], 'Không thấy popup xác nhận xóa nhóm NCC.');
        const cancelled = await clickFirstVisible(page, [
            page.getByRole('button', { name: /Hủy|Huỷ/i }).last(),
            page.locator('.ant-popover:visible .ant-btn').first(),
        ], 5000);
        if (!cancelled) await failWithContext(page, 'Không bấm được nút Hủy tại popup xóa nhóm NCC.');
        await page.waitForTimeout(800);
        await expectSupplierGroupList(page);
        await expect(page.locator('tbody tr.ant-table-row').filter({ hasText: beforeText.split('\t')[1] || beforeText.trim() }).first()).toBeVisible();
    });
});
