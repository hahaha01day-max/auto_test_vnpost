'use strict';

/**
 * Bước 5 — BẢNG GIÁ BÁN (và phê duyệt).
 *
 * 🔴 Đây là RÀNG BUỘC NỀN, không phải dữ liệu cho vài case: sản phẩm không nằm trong bảng giá còn
 *    hiệu lực tại điểm bán thì 🚫 không thêm được vào bill (`10_130_003`, `18_1_020_021`) ⇒ cụm POS
 *    ~358 case vô dụng, và bước 8 nhập kho cũng thành vô nghĩa vì hàng có tồn mà không bán ra được.
 * 🔴 Tạo xong PHẢI phê duyệt. Bảng giá `isApproved = 0` vẫn hiện trong danh sách, trông như đã
 *    xong, nhưng 🚫 không áp vào bán hàng — sai im lặng, chỉ lộ ra ở màn POS.
 * 🔴 Phạm vi chọn ĐÚNG điểm bán seed (không chọn cấp tỉnh): case POS chạy trên chính điểm bán đó,
 *    chọn cấp trên thì phụ thuộc cách backend nở phạm vi — thêm một ẩn số không cần thiết.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { ghi, lay, PREFIX, runId } = require('../seed-state');
const { bamQuaPopconfirm, chonPhamViDiemBan } = require('../helpers');

test.describe.configure({ mode: 'serial' });

const ROUTE_TAO = '/product/pricing/create';
const ROUTE_DS = '/product/pricing';
const DON_GIA = 100_000;

test('seed 5.1 — tạo bảng giá bán cho điểm bán seed', async ({ page }) => {
  const tenBangGia = `${PREFIX}BANGGIA_${runId()}`;
  const tenPhienBan = `${PREFIX}PB_${runId()}`;
  const sku = lay('sanPham', 'sku');
  const tenTinh = lay('toChuc', 'tenTinh');
  const tenXa = lay('toChuc', 'tenXa');
  const tenShop = lay('diemBan', 'tenShop');

  await moTrang(page, ROUTE_TAO, 'tct');

  // --- Tab Thông tin chung: ba ô bắt buộc (tên, tên phiên bản, ngày bắt đầu).
  // 🔴 "Không cài đặt khung giờ" mặc định ĐÃ tick ⇒ giờ bắt đầu/kết thúc không bắt buộc.
  //    🚫 Đừng bỏ tick, không thì thêm hai ô bắt buộc mà bảng giá chẳng cần.
  const oTen = page.getByPlaceholder('Nhập tên bảng giá');
  await expect(oTen, 'Không mở được trang Thêm bảng giá').toBeVisible({ timeout: 30_000 });
  await oTen.fill(tenBangGia);
  await page.getByPlaceholder('Nhập tên phiên bản').fill(tenPhienBan);

  // Ngày bắt đầu = hôm nay để bảng giá có hiệu lực NGAY; ngày kết thúc để trống = vô thời hạn.
  // 🔴 Để ngày mai là bảng giá chưa hiệu lực, POS vẫn không thêm được sản phẩm — đúng cái lỗi
  //    mình đang đi chữa, mà lại không có thông báo nào.
  const homNay = new Date();
  const hai = (n) => String(n).padStart(2, '0');
  const ngay = `${hai(homNay.getDate())}/${hai(homNay.getMonth() + 1)}/${homNay.getFullYear()}`;
  const oNgay = page.getByPlaceholder('Chọn ngày bắt đầu');
  await oNgay.fill(ngay);
  await oNgay.press('Enter');

  // --- Tab Phạm vi khu vực: tick đúng điểm bán seed.
  await page.getByRole('tab', { name: 'Phạm vi khu vực' }).click();
  await chonPhamViDiemBan(page, page.locator('.sp-body').first(), { tenTinh, tenXa, tenShop });

  // --- Tab Sản phẩm: thêm theo SKU rồi điền đơn giá.
  await page.getByRole('tab', { name: 'Sản phẩm', exact: true }).click();
  // 🔴 "Thêm theo" là `Radio.Button`: thẻ `<input type=radio>` bị ẩn hoàn toàn
  //    (`.ant-radio-button-input`, opacity 0) ⇒ `getByRole('radio')` tìm ra phần tử nhưng click
  //    treo hết timeout với "element is not visible". Phải bấm vào vỏ `.ant-radio-button-wrapper`.
  await page
    .locator('.ant-radio-button-wrapper')
    .filter({ hasText: /^Mã SKU$/ })
    .first()
    .click();
  await page.getByPlaceholder('Nhập mã SKU').fill(sku);
  await page.getByRole('button', { name: 'Thêm vào danh sách' }).click();

  // 🔴 Dòng sản phẩm chỉ xuất hiện sau khi API tra SKU trả về. Không chờ dòng mà nhảy sang điền
  //    giá là điền vào hư không, rồi submit báo "Vui lòng chọn sản phẩm".
  const dong = page.getByRole('row').filter({ hasText: sku }).first();
  await expect(dong, `Thêm SKU "${sku}" vào bảng giá không ăn — không thấy dòng nào`).toBeVisible({
    timeout: 30_000,
  });
  // Ô đơn giá là `InputCurrency` (InputNumber) — 🚫 không phải `<input type=text>` thường,
  // bám theo `.ant-input-number-input` trong chính dòng đó.
  const oGia = dong.locator('.ant-input-number-input').first();
  await oGia.fill(String(DON_GIA));
  // 🔴 `InputCurrency` bật danh sách gợi ý (`.suggestions-portal`) che nút "Lưu" của Popconfirm ⇒
  //    click treo "subtree intercepts pointer events". `blur()` KHÔNG đóng nó (component chỉ nghe
  //    `mousedown` bên ngoài / phím Escape — `components/inputCurrency/InputCurrency.jsx:180`).
  //    Gợi ý bật qua `debounce(150ms)` ⇒ bấm Escape NGAY sau `fill` là đóng trước khi nó mở, rồi
  //    nó mở lại. Phải chờ nó hiện RỒI mới Escape.
  const goiY = page.locator('.suggestions-portal [role="option"]');
  await goiY.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  await oGia.press('Escape');
  await expect(goiY).toHaveCount(0);
  await oGia.blur();

  // --- Lưu: nút "Lưu" bọc trong Popconfirm.
  const cho = page.waitForResponse(
    (r) => /chain-price-list\/create/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45_000 },
  );
  await bamQuaPopconfirm(page, page.getByRole('button', { name: 'Lưu', exact: true }).last(), /^Lưu$/);
  const res = await cho.catch(async (e) => {
    const loi = await page.locator('.ant-form-item-explain-error, .ant-message-error').allInnerTexts();
    throw new Error(`${e.message}\nỨng dụng báo: ${loi.join(' | ') || '(không có thông báo nào)'}`);
  });
  // 🔴 Lưu xong trang tự `navigate(-1)` ⇒ response body bị huỷ cùng trang: `res.text()` ném
  //    "No resource with given identifier found" và test đỏ DÙ bảng giá đã tạo xong.
  //    Chỉ đọc body khi thật sự hỏng, và bọc catch.
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  ghi('bangGiaBan', { tenBangGia, tenPhienBan, donGia: DON_GIA, daPheDuyet: false });
});

test('seed 5.2 — phê duyệt bảng giá', async ({ page }) => {
  const tenBangGia = lay('bangGiaBan', 'tenBangGia');

  await moTrang(page, ROUTE_DS, 'tct');
  await page.getByPlaceholder('Nhập tên bảng giá').fill(tenBangGia);
  await page.getByPlaceholder('Nhập tên bảng giá').press('Enter');

  const dong = page.getByRole('row').filter({ hasText: tenBangGia }).first();
  await expect(dong, `Không tìm thấy bảng giá "${tenBangGia}" trong danh sách`).toBeVisible({
    timeout: 30_000,
  });

  // 🔴 Nút phê duyệt CHỈ hiện khi `isApproved === 0` và chỉ với tài khoản có quyền
  //    `approved_price_product` (PermissionButton ẩn nút khi thiếu quyền — 🚫 không phải nút
  //    disabled, tìm theo nhãn sẽ ra 0 phần tử và lỗi đọc như "giao diện đổi").
  // 🔴 Các nút thao tác đều là nút CHỈ CÓ ICON, không có nhãn chữ ⇒ bám theo lớp icon
  //    (`.anticon-check` = phê duyệt). 🚫 Đừng lấy `getByRole('button').first()` của dòng: nút
  //    đầu dòng là mở chi tiết, bấm vào là rời trang, rồi lỗi báo "không mở được Popconfirm"
  //    trong khi thật ra đang đứng ở màn "Chi tiết bảng giá".
  const nut = dong.locator('button:has(.anticon-check)').first();
  await expect(
    nut,
    'Không thấy nút phê duyệt ở dòng bảng giá. Hai khả năng: bảng giá đã được duyệt, '
      + 'hoặc tài khoản thiếu quyền `approved_price_product` (PermissionButton ẩn nút).',
  ).toBeVisible({ timeout: 15_000 });

  const cho = page.waitForResponse(
    (r) => /chain-price-list\/approve/.test(r.url()) && r.request().method() === 'PUT',
    { timeout: 45_000 },
  );
  await bamQuaPopconfirm(page, nut, /^Đồng ý$/);
  const res = await cho;
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  ghi('bangGiaBan', { daPheDuyet: true });
});
