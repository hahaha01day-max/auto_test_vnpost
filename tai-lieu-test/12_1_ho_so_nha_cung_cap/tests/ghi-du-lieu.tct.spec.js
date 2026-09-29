'use strict';

/**
 * 12_1 Hồ sơ nhà cung cấp — nhóm case **GHI DỮ LIỆU** (vai `tct`).
 *
 * 🔴 Tách khỏi `nha-cung-cap.tct.spec.js` (chỉ đọc) vì hai loại có ràng buộc trái nhau: file kia
 *    dùng `chanGhi()` để chứng minh "form rỗng thì 🚫 không gửi request", file này thì phải ghi
 *    thật. Trộn chung là bên nào cũng vô hiệu bên kia.
 *
 * 🔴 Mọi bản ghi do file này tạo mang tiền tố **`AUTOTEST_`** và được **dọn ngay trong chính case**
 *    tạo ra nó, trừ case cố ý để lại cho case sau dùng (070_010 → 070_012 → 070_013 là một chuỗi).
 *    🚫 Đừng để rác: NCC và nhóm NCC dùng chung cho PO và công nợ.
 *
 * 🔴 Chạy NỐI TIẾP: chuỗi 070_010/012/013 thao tác trên **cùng một** nhóm NCC.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chuan, dong, khung, moMan, moNhomNCC, oTim, tim } = require('./supplier-page');

const GOC = path.join(__dirname, '..');
const VAI = 'tct';

test.describe.configure({ mode: 'serial' });

const chanNeuTat = (id) => {
  const i = loadCaseInput(GOC, id);
  const ly = skipReason(i);
  test.skip(Boolean(ly), ly ?? '');
  return i;
};

/** Hậu tố dùng chung cho cả lượt chạy — 🚫 đừng sinh mới ở từng case, chuỗi 070 sẽ lạc nhau. */
const LUOT = String(Date.now()).slice(-8);
const tenNhom = `AUTOTEST_NHOM_${LUOT}`;
const tenNhomSua = `${tenNhom}_SUA`;

/** Hộp thoại đang mở (Drawer hoặc Modal). */
const hop = (page) => page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();

/** Thông báo ứng dụng vừa hiện — gộp cả `message` lẫn lỗi từng ô. */
async function thongBao(page, form) {
  return [
    ...(await page.locator('.ant-message').allInnerTexts()),
    ...(form ? await form.locator('.ant-form-item-explain-error').allInnerTexts() : []),
  ]
    .map(chuan)
    .filter(Boolean);
}

test.describe('12_1 — Hồ sơ nhà cung cấp (case ghi)', () => {
  test('12_1_030_001 — Mở drawer Thêm nhà cung cấp và kiểm tra field chính', async ({ page }) => {
    chanNeuTat('12_1_030_001');
    await moMan(page, VAI);

    await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click();
    const form = hop(page);
    await expect(form, 'Bấm "Thêm mới" mà không mở form nào').toBeVisible({ timeout: 20_000 });
    await expect(form.getByText('Thêm nhà cung cấp').first()).toBeVisible({ timeout: 15_000 });

    // Kỳ vọng của sheet: đủ tiêu đề, 3 nút, và các trường thông tin cơ bản.
    for (const nhan of ['Huỷ', 'Xác nhận']) {
      await expect(
        form.getByRole('button', { name: nhan }).first(),
        `Drawer thiếu nút "${nhan}"`,
      ).toBeVisible();
    }
    for (const ph of ['Nhập mã NCC', 'Nhập tên NCC', 'Nhập số điện thoại']) {
      await expect(form.getByPlaceholder(ph).first(), `Drawer thiếu ô "${ph}"`).toBeVisible();
    }
    for (const nhan of ['Tỉnh / Thành phố', 'Phường / Xã', 'Nhóm NCC']) {
      await expect(
        form.getByText(nhan, { exact: false }).first(),
        `Drawer thiếu trường "${nhan}"`,
      ).toBeVisible();
    }
  });

  test('12_1_030_002 — Thêm NCC - validate form rỗng', async ({ page }) => {
    chanNeuTat('12_1_030_002');
    await moMan(page, VAI);

    await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click();
    const form = hop(page);
    await expect(form).toBeVisible({ timeout: 20_000 });

    // 🔴 Bấm Xác nhận với form RỖNG: phép kiểm là "🚫 KHÔNG có request ghi nào" + có cảnh báo.
    //    Bắt request ngay tại đây thay vì `chanGhi()` toàn cục để 🚫 không chặn nhầm case khác.
    const daGui = [];
    page.on('request', (r) => {
      if (r.method() !== 'GET' && /chain-supplier(?!-groups)/.test(r.url())) daGui.push(r.url());
    });

    await form.getByRole('button', { name: 'Xác nhận' }).first().click();
    await expect
      .poll(async () => (await thongBao(page, form)).length, { timeout: 15_000 })
      .toBeGreaterThan(0);

    const loi = await thongBao(page, form);
    expect(daGui, '🔴 Form NCC trống mà vẫn gửi request ghi').toEqual([]);
    expect(loi.join(' | '), 'Không ô bắt buộc nào báo lỗi').not.toBe('');
  });

  test('12_1_030_003 — Validate định dạng điện thoại và email NCC', async ({ page }) => {
    const input = chanNeuTat('12_1_030_003');
    await moMan(page, VAI);

    await khung(page).getByRole('button', { name: 'Thêm mới' }).first().click();
    const form = hop(page);
    await expect(form).toBeVisible({ timeout: 20_000 });

    // Sheet chỉ định đúng giá trị sai định dạng này.
    await form.getByPlaceholder('Nhập số điện thoại').first().fill('038716');
    await form.getByPlaceholder('Nhập tên NCC').first().click();

    const loi = await thongBao(page, form);
    expect(
      loi.join(' | '),
      `Nhập số điện thoại sai định dạng ("038716") mà 🚫 không có cảnh báo nào. `
        + `Input case: ${JSON.stringify(input.data)}`,
    ).toMatch(/điện thoại|hợp lệ|định dạng/i);
  });

  test('12_1_070_010 — Them nhom NCC hop le', async ({ page }) => {
    chanNeuTat('12_1_070_010');
    await moMan(page, VAI);
    const box = await moNhomNCC(page);

    await box.getByRole('button', { name: /Thêm mới/ }).first().click();
    const form = hop(page);
    await expect(form.getByText('Thêm nhóm nhà cung cấp').first()).toBeVisible({ timeout: 20_000 });
    await form.getByPlaceholder('Nhập tên nhóm NCC').fill(tenNhom);
    await form.getByPlaceholder('Nhập Ghi chú').fill('AUTO TEST - khong su dung');

    const cho = page.waitForResponse(
      (r) => /supplier-groups/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await form.getByRole('button', { name: 'Xác nhận' }).first().click();
    const res = await cho;
    expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

    // Kỳ vọng của sheet: nhóm mới **hiển thị trong danh sách** — 🚫 đừng dừng ở mã 200.
    const oTimNhom = page.getByPlaceholder('Tìm kiếm').first();
    await oTimNhom.fill(tenNhom);
    await expect(
      page.getByRole('row').filter({ hasText: tenNhom }).first(),
      `Tạo nhóm "${tenNhom}" trả 200 nhưng không thấy trong danh sách`,
    ).toBeVisible({ timeout: 20_000 });
  });

  test('12_1_070_011 — Tim kiem nhom NCC vua tao', async ({ page }) => {
    chanNeuTat('12_1_070_011');
    await moMan(page, VAI);
    await moNhomNCC(page);

    // 🔴 Ô tìm nhóm lọc NGAY TRÊN TRÌNH DUYỆT, 🚫 không gửi request ⇒ 🚫 chờ response (đợi hết timeout
    //    vô ích, đo 23/09: 44s). Đồng bộ bằng chính kết quả: dòng của nhóm hiện ra.
    await page.getByPlaceholder('Tìm kiếm').first().fill(tenNhom);
    // Kỳ vọng: lọc ra ĐÚNG nhóm vừa tạo — mọi dòng còn lại đều chứa từ khoá, và có dòng của nhóm đó.
    const dongDs = page.getByRole('row').filter({ has: page.locator('td') });
    await expect(dongDs.filter({ hasText: tenNhom }).first(), `Không lọc ra nhóm "${tenNhom}" (case 070_010 chưa chạy?)`)
      .toBeVisible({ timeout: 20_000 });
    // Chờ bộ lọc áp xong: dòng của nhóm có thể đã hiện TRƯỚC khi lọc (nằm sẵn ở trang 1).
    await expect
      .poll(async () => (await dongDs.allInnerTexts()).map(chuan).filter((x) => x && !x.includes(tenNhom)), {
        message: 'Kết quả tìm còn nhóm không khớp từ khoá', timeout: 15_000,
      })
      .toEqual([]);
  });

  test('12_1_030_011 — Thêm nhóm NCC trùng tên nhóm đã tồn tại', async ({ page }) => {
    chanNeuTat('12_1_030_011');
    await moMan(page, VAI);
    const box = await moNhomNCC(page);

    // 🔴 Dùng chính nhóm case 070_010 vừa tạo, 🚫 đừng lấy tên nhóm có sẵn của người khác: tên đó
    //    có thể bị đổi/xoá bất cứ lúc nào và case sẽ đỏ vì lý do không liên quan.
    await box.getByRole('button', { name: /Thêm mới/ }).first().click();
    const form = hop(page);
    await expect(form).toBeVisible({ timeout: 20_000 });
    await form.getByPlaceholder('Nhập tên nhóm NCC').fill(tenNhom);
    await form.getByRole('button', { name: 'Xác nhận' }).first().click();

    await expect
      .poll(async () => (await thongBao(page, form)).join(' | '), { timeout: 20_000 })
      .toMatch(/tồn tại|trùng|đã có/i);
  });

  test('12_1_070_012 — Chỉnh sửa / Xem chi tiết nhóm NCC vừa tạo', async ({ page }) => {
    chanNeuTat('12_1_070_012');
    await moMan(page, VAI);
    const box = await moNhomNCC(page);

    const oTimNhom = page.getByPlaceholder('Tìm kiếm').first();
    await oTimNhom.fill(tenNhom);
    const dongNhom = page.getByRole('row').filter({ hasText: tenNhom }).first();
    await expect(dongNhom, `Không thấy nhóm "${tenNhom}" — case 070_010 chưa chạy?`).toBeVisible({
      timeout: 20_000,
    });

    // Nút thao tác chỉ có icon ⇒ bám theo lớp icon, 🚫 không theo nhãn chữ.
    await dongNhom.locator('button:has(.anticon-edit), button:has(.anticon-form)').first().click();
    const form = hop(page);
    await expect(form.getByText('Sửa nhóm nhà cung cấp').first(), 'Không mở được form sửa')
      .toBeVisible({ timeout: 20_000 });

    const oTen = form.getByPlaceholder('Nhập tên nhóm NCC');
    // Drawer sửa phải mở ĐÚNG nhóm — kỳ vọng của sheet.
    await expect(oTen, 'Form sửa không nạp đúng tên nhóm đang chọn').toHaveValue(tenNhom);
    await oTen.fill(tenNhomSua);

    const cho = page.waitForResponse(
      (r) => /supplier-groups/.test(r.url()) && r.request().method() === 'PUT',
      { timeout: 30_000 },
    );
    await form.getByRole('button', { name: 'Xác nhận' }).first().click();
    const res = await cho;
    expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

    await oTimNhom.fill(tenNhomSua);
    await expect(
      page.getByRole('row').filter({ hasText: tenNhomSua }).first(),
      'Sửa tên nhóm trả 200 nhưng danh sách vẫn chưa đổi',
    ).toBeVisible({ timeout: 20_000 });
  });

  test('12_1_030_012 — Sửa nhóm NCC thành tên nhóm đã tồn tại', async ({ page }) => {
    chanNeuTat('12_1_030_012');
    await moMan(page, VAI);
    await moNhomNCC(page);

    // Tên "đã tồn tại": lấy một nhóm KHÁC nhóm tự tạo từ chính danh sách nhóm của môi trường.
    const oTimNhom = page.getByPlaceholder('Tìm kiếm').first();
    await oTimNhom.fill('');
    // Cột tên nhóm = ô đầu tiên có chữ, không phải số thứ tự.
    const tenCacNhom = await page.getByRole('row').filter({ has: page.locator('td') }).evaluateAll((rows) => rows
      .map((r) => [...r.querySelectorAll('td')].map((td) => td.innerText.normalize('NFC').trim()).find((t) => t && !/^\d+$/.test(t))));
    const tenKhac = tenCacNhom.find((t) => t && !t.startsWith(tenNhom));
    expect(tenKhac, 'Môi trường không có nhóm NCC nào khác để thử trùng tên').toBeTruthy();

    await oTimNhom.fill(tenNhomSua);
    const dongNhom = page.getByRole('row').filter({ hasText: tenNhomSua }).first();
    await expect(dongNhom, `Không thấy nhóm "${tenNhomSua}" — case 070_012 chưa chạy?`).toBeVisible({ timeout: 20_000 });
    await dongNhom.locator('button:has(.anticon-edit), button:has(.anticon-form)').first().click();
    const form = hop(page);
    const oTen = form.getByPlaceholder('Nhập tên nhóm NCC');
    await expect(oTen).toHaveValue(tenNhomSua, { timeout: 20_000 });
    await oTen.fill(tenKhac);
    await form.getByRole('button', { name: 'Xác nhận' }).first().click();

    // 🔴 Kỳ vọng sheet ghi "Hiển thị và lưu thông tin" — mâu thuẫn với chính tên case (trùng tên) và
    //    với 030_011 (thêm trùng bị chặn). Theo ràng buộc trùng tên: hệ thống phải CHẶN, nhóm giữ tên cũ.
    await expect
      .poll(async () => (await thongBao(page, form)).join(' | '), { timeout: 20_000 })
      .toMatch(/tồn tại|trùng|đã có/i);
    await page.keyboard.press('Escape');
    await oTimNhom.fill(tenNhomSua);
    await expect(page.getByRole('row').filter({ hasText: tenNhomSua }).first(), 'Nhóm bị đổi sang tên trùng dù hệ thống báo lỗi')
      .toBeVisible({ timeout: 20_000 });
  });

  test('12_1_070_013 — Xoá nhóm NCC vừa sửa', async ({ page }) => {
    chanNeuTat('12_1_070_013');
    await moMan(page, VAI);
    await moNhomNCC(page);

    const oTimNhom = page.getByPlaceholder('Tìm kiếm').first();
    await oTimNhom.fill(tenNhomSua);
    const dongNhom = page.getByRole('row').filter({ hasText: tenNhomSua }).first();
    await expect(dongNhom, `Không thấy nhóm "${tenNhomSua}" — case 070_012 chưa chạy?`)
      .toBeVisible({ timeout: 20_000 });

    const cho = page.waitForResponse(
      (r) => /supplier-groups/.test(r.url()) && r.request().method() === 'DELETE',
      { timeout: 30_000 },
    );
    // 🔴 Nút xoá của bảng nhóm NCC mang icon **close**, 🚫 không phải `anticon-delete` — bám nhầm
    //    là hết timeout mà không nói vì sao. Nút cuối dòng là phương án dự phòng (xem 070_015).
    const nutXoa = dongNhom.locator('button:has(.anticon-close), button:has(.anticon-delete)');
    await ((await nutXoa.count()) > 0 ? nutXoa.first() : dongNhom.getByRole('button').last()).click({
      force: true,
    });
    const xacNhan = page.locator('.ant-popconfirm:visible, .ant-popover:visible, .ant-modal-confirm').last();
    await expect(xacNhan, 'Bấm xoá mà không mở hộp xác nhận').toBeVisible({ timeout: 10_000 });
    await xacNhan.getByRole('button', { name: /Đồng ý|Xác nhận|OK|Xoá|Xóa/ }).first().click();
    const res = await cho;
    expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

    // Kỳ vọng: 🚫 KHÔNG còn trong danh sách.
    await oTimNhom.fill(tenNhomSua);
    await expect
      .poll(async () => page.getByRole('row').filter({ hasText: tenNhomSua }).count(), {
        timeout: 20_000,
      })
      .toBe(0);
  });
});
