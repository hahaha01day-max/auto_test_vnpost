'use strict';

/**
 * Bước 7 — SẢN PHẨM THEO NCC · HỢP ĐỒNG NCC · BẢNG GIÁ MUA.
 *
 * 🔴 Ba việc, đúng thứ tự này, 🚫 không đảo:
 *    7.1 gắn SKU vào NCC — bảng giá mua báo "SKU chưa được phân bổ cho Nhà cung cấp" nếu thiếu.
 *    7.2 hợp đồng NCC và PHẢI phê duyệt: ô "Hợp đồng nhà cung cấp" ở form bảng giá mua là trường
 *        BẮT BUỘC và Select bị `disabled` khi NCC chưa có hợp đồng **hiệu lực** — hợp đồng vừa
 *        tạo ở trạng thái DRAFT thì ô vẫn khoá, đọc như "giao diện lỗi".
 *    7.3 bảng giá mua: lưu nháp rồi **BAN HÀNH**. Bảng giá `DRAFT` 🚫 không dùng được cho phiếu
 *        nhập ở bước 8 — sai im lặng, chỉ lộ ra khi bước 8 không tìm thấy giá.
 * 🔴 `supplierId` không có trong sổ và không đoán được ⇒ lấy từ URL sau khi bấm "Sản phẩm" ở
 *    dòng NCC, rồi GHI VÀO SỔ để 7.3 và bước 8 dùng lại.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { ghi, lay, PREFIX, PREFIX_MA, runId } = require('../seed-state');
const { chon, bamQuaPopconfirm, chonPhamViDiemBan } = require('../helpers');

test.describe.configure({ mode: 'serial' });

const ROUTE_NCC = '/supplier/list';
const ROUTE_HOP_DONG = '/supplier/contracts';
const GIA_NHAP = 60_000;

test('seed 7.1 — gắn sản phẩm cho nhà cung cấp', async ({ page }) => {
  const tenNcc = lay('nhaCungCap', 'tenNcc');
  const sku = lay('sanPham', 'sku');

  await moTrang(page, ROUTE_NCC, 'tct');
  const oTim = page.getByPlaceholder(/Tìm kiếm theo tên/).first();
  await oTim.fill(tenNcc);

  const dong = page.getByRole('row').filter({ hasText: tenNcc }).first();
  await expect(dong, `Không tìm thấy NCC "${tenNcc}" trong danh sách`).toBeVisible({
    timeout: 30_000,
  });
  await dong.getByRole('button', { name: 'Sản phẩm' }).click();

  // 🔴 `supplierId` nằm trong URL `/supplier/<id>/products` — đây là chỗ duy nhất lấy được nó
  //    mà không phải gọi API tay.
  await page.waitForURL(/\/supplier\/\d+\/products/, { timeout: 30_000 });
  const supplierId = page.url().match(/\/supplier\/(\d+)\/products/)[1];
  ghi('sanPhamNcc', { supplierId });

  await page.getByRole('button', { name: /Thêm mới \/ Cập nhật SP/ }).first().click();
  const dr = page.locator('.ant-drawer-open').last();
  await expect(
    dr.getByText('Thêm / Cập nhật sản phẩm NCC').first(),
    'Không mở được Drawer sản phẩm NCC',
  ).toBeVisible({ timeout: 20_000 });

  // 🔴 Ô tra sản phẩm ở đây KHÔNG phải ant Select: nó là cặp `Space.Compact` gồm một Select
  //    "trường tìm" (Tên SP / SKU) và một `Input` thường, còn danh sách kết quả là một `<div>`
  //    tự dựng — 🚫 không có `.ant-select-dropdown`, không có `.ant-select-item-option`, và
  //    combobox đầu Drawer là ô "trường tìm" ở trạng thái `readonly` nên `fill` vào đó báo
  //    "element is not editable".
  //    Đổi trường tìm sang SKU rồi gõ + Enter: `onPressEnter` của component tự chọn đúng sản
  //    phẩm khớp SKU (đường quét mã vạch), khỏi phải click vào div kết quả.
  // 🔴 Select "trường tìm" KHÔNG có nhãn nào (accessible name rỗng — nhãn "Tên SP" nằm ở thẻ
  //    bọc ngoài) ⇒ `getByRole('combobox', { name: ... })` ra 0 phần tử. Bám theo vị trí: nó là
  //    ant Select đầu tiên trong khối "Danh sách sản phẩm".
  const oTruongTim = dr.locator('.ant-select').first();
  await oTruongTim.click();
  const dsTruong = page.locator('.ant-select-dropdown:visible').last();
  await dsTruong.getByText('SKU', { exact: true }).first().click();
  const oSp = dr.getByRole('textbox', { name: 'Tìm và thêm sản phẩm' });
  await oSp.fill(sku);
  await oSp.press('Enter');

  // Dòng phải hiện trong bảng trước khi bấm Xác nhận, nếu không là gửi danh sách rỗng.
  await expect(
    dr.getByRole('row').filter({ hasText: sku }).first(),
    `Chọn SKU "${sku}" xong nhưng bảng trong Drawer không có dòng nào`,
  ).toBeVisible({ timeout: 20_000 });

  const cho = page.waitForResponse(
    (r) => /supplier-products\/batch/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await dr.getByRole('button', { name: 'Xác nhận' }).first().click();
  const res = await cho;
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  ghi('sanPhamNcc', { skuNcc: sku });
});

test('seed 7.2 — tạo và phê duyệt hợp đồng nhà cung cấp', async ({ page }) => {
  const tenNcc = lay('nhaCungCap', 'tenNcc');
  const soHopDong = `${PREFIX_MA}HD${runId()}`;

  await moTrang(page, ROUTE_HOP_DONG, 'tct');
  await page.getByRole('button', { name: 'Thêm mới' }).first().click();

  const dr = page.locator('.ant-drawer-open').last();
  await expect(dr.getByText('Thêm hợp đồng NCC').first(), 'Không mở được Drawer hợp đồng').toBeVisible(
    { timeout: 20_000 },
  );

  await dr.getByPlaceholder('Nhập số hợp đồng').fill(soHopDong);
  await chon(page, dr, /Nhà cung cấp/, tenNcc);
  await chon(page, dr, /Loại hợp đồng/);

  // Thời hạn hiệu lực: hôm nay → +1 năm, để hợp đồng còn hiệu lực suốt vòng đời bộ dữ liệu seed.
  // 🔴 `RangePicker` cần điền HAI ô rồi mới đóng; điền một ô là giá trị 🚫 không được nhận.
  const hai = (n) => String(n).padStart(2, '0');
  const dinhDang = (d) => `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`;
  const tuNgay = new Date();
  const denNgay = new Date(tuNgay.getFullYear() + 1, tuNgay.getMonth(), tuNgay.getDate());
  const oKhoang = dr.locator('.ant-picker-range').first();
  await oKhoang.click();
  const oNgay = oKhoang.locator('input');
  await oNgay.nth(0).fill(dinhDang(tuNgay));
  await oNgay.nth(0).press('Enter');
  await oNgay.nth(1).fill(dinhDang(denNgay));
  await oNgay.nth(1).press('Enter');

  const cho = page.waitForResponse(
    (r) => /chain-supplier-contract/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await dr.getByRole('button', { name: 'Thêm mới' }).first().click();
  const res = await cho.catch(async (e) => {
    const loi = await dr.locator('.ant-form-item-explain-error').allInnerTexts();
    throw new Error(`${e.message}\nÔ bị chặn: ${loi.join(' | ') || '(không có ô nào báo lỗi)'}`);
  });
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  // --- Phê duyệt: DRAFT → Hiệu lực. 🔴 Hộp xác nhận ở đây là `modal.confirm` (một modal giữa
  //     màn), 🚫 KHÔNG phải Popconfirm như bảng giá bán — bám sai loại hộp là chờ hết timeout.
  // 🔴 Hợp đồng mới KHÔNG nằm ở đầu danh sách (danh sách không sắp theo ngày tạo) ⇒ tìm bằng ô
  //    lọc, 🚫 đừng dò trang đầu: đã đo — bản ghi vừa tạo không có trong 15 dòng đang hiện, lỗi
  //    đọc như "tạo hợp đồng thất bại" trong khi POST đã 200.
  const oTimHd = page.getByPlaceholder('Tìm số HĐ / tên / mã NCC');
  await oTimHd.fill(soHopDong);
  await oTimHd.press('Enter');

  const dongHd = page.getByRole('row').filter({ hasText: soHopDong }).first();
  await expect(dongHd, `Không thấy hợp đồng "${soHopDong}" trong danh sách`).toBeVisible({
    timeout: 30_000,
  });
  const choDuyet = page.waitForResponse(
    (r) => /chain-supplier-contract\/\d+\/status/.test(r.url()),
    { timeout: 45_000 },
  );
  await dongHd.getByRole('button', { name: 'Phê duyệt' }).click();
  const modal = page.locator('.ant-modal-confirm').last();
  await expect(modal, 'Không mở được hộp xác nhận phê duyệt hợp đồng').toBeVisible({
    timeout: 10_000,
  });
  await modal.getByRole('button', { name: 'Phê duyệt' }).click();
  const resDuyet = await choDuyet;
  const thanDuyet = resDuyet.status() >= 400
    ? await resDuyet.text().catch(() => '(không đọc được body)')
    : '';
  expect(resDuyet.status(), thanDuyet).toBeLessThan(400);

  ghi('sanPhamNcc', { soHopDong });
});

test('seed 7.3 — tạo và ban hành bảng giá mua', async ({ page }) => {
  const supplierId = lay('sanPhamNcc', 'supplierId');
  const sku = lay('sanPham', 'sku');
  const tenBangGiaMua = `${PREFIX}BGMUA_${runId()}`;

  await moTrang(page, `/supplier/${supplierId}/price-lists`, 'tct');
  await page.getByRole('button', { name: 'Tạo bảng giá' }).first().click();

  const dr = page.locator('.ant-drawer-open').last();
  await expect(dr.getByText('Tạo bảng giá mới').first(), 'Không mở được Drawer bảng giá mua')
    .toBeVisible({ timeout: 20_000 });

  await dr.getByPlaceholder(/VD: Bảng giá/).fill(tenBangGiaMua);

  const hai = (n) => String(n).padStart(2, '0');
  const homNay = new Date();
  const ngay = `${hai(homNay.getDate())}/${hai(homNay.getMonth() + 1)}/${homNay.getFullYear()}`;
  // Ngày kết thúc để TRỐNG = vô thời hạn (`allowEmpty[1] = true`).
  const oKhoang = dr.locator('.ant-picker-range').first();
  await oKhoang.click();
  await oKhoang.locator('input').nth(0).fill(ngay);
  await oKhoang.locator('input').nth(0).press('Enter');
  await page.keyboard.press('Escape');

  // 🔴 Ô hợp đồng bị `disabled` khi NCC chưa có hợp đồng hiệu lực ⇒ nói rõ nguyên nhân, 🚫 đừng
  //    để lỗi hiện ra là "click timeout".
  const oHopDong = dr.getByRole('combobox', { name: /Hợp đồng nhà cung cấp/ });
  await expect(
    oHopDong,
    'Ô "Hợp đồng nhà cung cấp" đang bị khoá ⇒ NCC chưa có hợp đồng HIỆU LỰC. '
      + 'Chạy lại bước 7.2 (tạo hợp đồng và PHÊ DUYỆT) trước.',
  ).toBeEnabled({ timeout: 20_000 });
  await chon(page, dr, /Hợp đồng nhà cung cấp/);

  // Một dòng sản phẩm: SKU + giá nhập sau VAT.
  await dr.getByRole('button', { name: 'Thêm dòng' }).click();
  const dong = dr.getByRole('row').last();
  await dong.getByPlaceholder('Nhập SKU').fill(sku);
  await dong.getByPlaceholder('Nhập SKU').blur();
  // 🔴 Có HAI ô giá trên cùng dòng ("Giá nhập trước VAT" và "Giá nhập sau VAT") — chúng suy ngược
  //    lẫn nhau qua VAT. Điền ô CUỐI (sau VAT) vì đó là số trên hoá đơn NCC.
  const oGia = dong.locator('.ant-input-number-input');
  await oGia.last().fill(String(GIA_NHAP));
  await oGia.last().blur();

  // 🔴 Drawer này có tab thứ hai **"Phạm vi áp dụng *"** cũng BẮT BUỘC. Chưa tick đơn vị nào thì
  //    "Lưu nháp" 🚫 không gửi request, form chỉ âm thầm nhảy sang tab đó — 🚫 KHÔNG có thông báo
  //    lỗi nào, kể cả `message`. Triệu chứng y hệt "API chết".
  await dr.getByRole('tab', { name: /Phạm vi áp dụng/ }).click();
  await chonPhamViDiemBan(page, dr, {
    tenTinh: lay('toChuc', 'tenTinh'),
    tenXa: lay('toChuc', 'tenXa'),
    tenShop: lay('diemBan', 'tenShop'),
  });

  const cho = page.waitForResponse(
    (r) => /\/supplier-price-lists(\?|$)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await dr.getByRole('button', { name: 'Lưu nháp' }).click();
  const res = await cho.catch(async (e) => {
    const loi = await dr.locator('.ant-form-item-explain-error, .ant-message-error').allInnerTexts();
    throw new Error(`${e.message}\nỨng dụng báo: ${loi.join(' | ') || '(không có thông báo nào)'}`);
  });
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  // --- Ban hành: DRAFT → PUBLISHED, mở Drawer chi tiết từ dòng vừa tạo.
  const dongBg = page.getByRole('row').filter({ hasText: tenBangGiaMua }).first();
  await expect(dongBg, `Không thấy bảng giá mua "${tenBangGiaMua}" trong danh sách`).toBeVisible({
    timeout: 30_000,
  });
  await dongBg.getByRole('button', { name: 'Xem' }).click();

  const drCt = page.locator('.ant-drawer-open').last();
  await expect(drCt.getByText('Chi tiết bảng giá').first()).toBeVisible({ timeout: 20_000 });
  const choBanHanh = page.waitForResponse(
    (r) => /supplier-price-lists\/\d+\/publish/.test(r.url()),
    { timeout: 45_000 },
  );
  await bamQuaPopconfirm(page, drCt.getByRole('button', { name: 'Ban hành' }), /^(OK|Đồng ý|Lưu)$/);
  const resBh = await choBanHanh;
  const thanBh = resBh.status() >= 400
    ? await resBh.text().catch(() => '(không đọc được body)')
    : '';
  expect(resBh.status(), thanBh).toBeLessThan(400);

  ghi('sanPhamNcc', { tenBangGiaMua, giaNhap: GIA_NHAP, daBanHanh: true });
});
