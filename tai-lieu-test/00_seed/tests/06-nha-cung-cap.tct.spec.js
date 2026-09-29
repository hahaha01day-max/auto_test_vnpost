'use strict';

/**
 * Bước 6 — NHÀ CUNG CẤP (kèm nhóm NCC).
 *
 * 🔴 Form NCC bắt "Nhóm NCC" là trường BẮT BUỘC ⇒ phải có nhóm trước. 🚫 Đừng chọn nhóm có sẵn
 *    bất kỳ: nhóm của người khác có thể bị xoá/đổi tên giữa các lượt, và mình cũng mất dấu để dọn.
 *    Tự tạo nhóm `AUTO_` là tự chủ hoàn toàn.
 * 🔴 Vai TCT ghi vào `/chain-supplier` (NCC cấp chuỗi), 🚫 không phải `/shops/{id}/supplier`
 *    (NCC riêng điểm bán) — hai bảng khác nhau (`CHAIN_SUPPLIER` vs `SHOP_SUPPLIER`). Bước 7 và 8
 *    tra NCC cấp chuỗi, nên bước này PHẢI chạy bằng vai TCT.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { ghi, lay, PREFIX, runId } = require('../seed-state');
const { chon } = require('../helpers');

test.describe.configure({ mode: 'serial' });

const ROUTE_NHOM = '/supplier/groups';
const ROUTE_NCC = '/supplier/list';

test('seed 6.1 — tạo nhóm nhà cung cấp', async ({ page }) => {
  const tenNhom = `${PREFIX}NHOMNCC_${runId()}`;

  await moTrang(page, ROUTE_NHOM, 'tct');
  await page.getByRole('button', { name: 'Thêm mới' }).first().click();

  const dr = page.locator('.ant-drawer-open').last();
  await expect(
    dr.getByText('Thêm nhóm nhà cung cấp').first(),
    'Không mở được Drawer thêm nhóm NCC',
  ).toBeVisible({ timeout: 20_000 });
  await dr.getByPlaceholder('Nhập tên nhóm NCC').fill(tenNhom);

  const cho = page.waitForResponse(
    (r) => /supplier-groups/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30_000 },
  );
  // 🔴 Nút "Xác nhận" của Drawer này nằm ở `extra` (góc trên), 🚫 không ở footer — footer là null.
  await dr.getByRole('button', { name: 'Xác nhận' }).first().click();
  const res = await cho.catch(async (e) => {
    const loi = await dr.locator('.ant-form-item-explain-error').allInnerTexts();
    throw new Error(`${e.message}\nÔ bị chặn: ${loi.join(' | ') || '(không có ô nào báo lỗi)'}`);
  });
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  ghi('nhaCungCap', { tenNhomNcc: tenNhom });
});

test('seed 6.2 — tạo nhà cung cấp cấp chuỗi', async ({ page }) => {
  const tenNhom = lay('nhaCungCap', 'tenNhomNcc');
  const maNcc = `ANCC${runId()}`;
  const tenNcc = `${PREFIX}NCC_${runId()}`;
  // Số điện thoại phải hợp lệ theo validate FE (10 số, mở đầu 0).
  const dienThoai = `09${String(runId()).slice(-8)}`;

  await moTrang(page, ROUTE_NCC, 'tct');
  await page.getByRole('button', { name: 'Thêm mới' }).first().click();

  const hop = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').last();
  await expect(
    hop.getByText('Thêm nhà cung cấp').first(),
    'Không mở được form Thêm nhà cung cấp',
  ).toBeVisible({ timeout: 20_000 });

  // 🔴 MƯỜI MỘT trường bắt buộc, chia ba khối: thông tin NCC · người nhận đơn · người xử lí
  //    khiếu nại. Thiếu một ô là validate client chặn, 🚫 không có request nào được gửi.
  await hop.getByPlaceholder('Nhập mã NCC').fill(maNcc);
  await hop.getByPlaceholder('Nhập tên NCC').first().fill(tenNcc);

  // 🔴 "Phường / Xã" nạp theo Tỉnh đã chọn (lazy-load theo `parent_id`) ⇒ phải chọn Tỉnh TRƯỚC,
  //    không thì danh sách xã rỗng và lỗi đọc như "giao diện đổi".
  //    Đây là danh mục hành chính CHUNG, 🚫 không phải đơn vị tổ chức seed ở bước 1 — chọn mục
  //    đầu tiên là đủ, NCC không cần trùng địa bàn với điểm bán.
  await chon(page, hop, /Tỉnh \/ Thành phố/);
  await chon(page, hop, /Phường \/ Xã/);
  await chon(page, hop, /Nhóm NCC/, tenNhom);

  // 🔴 `getByPlaceholder` khớp KHÔNG PHÂN BIỆT hoa/thường và theo chuỗi con ⇒ "Nhập số điện
  //    thoại" (ô của NCC) và "Nhập Số điện thoại" (ô người nhận đơn / người khiếu nại) trúng
  //    CẢ BA ô. Đánh số theo placeholder là lệch một nhịp: ô khiếu nại ở lại rỗng, form chặn
  //    submit và lỗi chỉ nói "Vui lòng nhập số điện thoại" mà không nói ô nào.
  //    🚫 Đừng bám placeholder ở form này — bám accessible name của từng ô.
  const oSdt = (nhanKhoi) => hop.getByRole('textbox', { name: nhanKhoi });
  await oSdt(/^\*? ?Tên người nhận đơn/).fill(tenNcc);
  await oSdt(/^\*? ?Tên người xử lí khiếu nại/).fill(tenNcc);
  const sdt = hop.getByRole('textbox', { name: /^\*? ?Số điện thoại/ });
  for (let i = 0; i < (await sdt.count()); i += 1) await sdt.nth(i).fill(dienThoai);

  // "Dung sai (%)" là `InputNumber` (role spinbutton), 🚫 không phải textbox, và placeholder của
  // nó là "0" — trùng với "Số lượng tối thiểu khi đặt hàng" ngay bên cạnh.
  await hop.getByRole('spinbutton', { name: /Dung sai/ }).fill('0');

  const cho = page.waitForResponse(
    (r) => /\/chain-supplier(\?|$)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await hop.getByRole('button', { name: 'Xác nhận' }).first().click();
  const res = await cho.catch(async (e) => {
    const loi = await hop.locator('.ant-form-item-explain-error').allInnerTexts();
    throw new Error(`${e.message}\nÔ bị chặn: ${loi.join(' | ') || '(không có ô nào báo lỗi)'}`);
  });
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  ghi('nhaCungCap', { maNcc, tenNcc, dienThoaiNcc: dienThoai });
});
