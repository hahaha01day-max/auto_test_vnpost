'use strict';

/**
 * Bước 4 — DANH MỤC và SẢN PHẨM (kèm SKU).
 *
 * 🔴 Sản phẩm bắt buộc nằm trong **danh mục KHÔNG phải cấp 1**. Form sản phẩm dựng
 *    `CategoryTreeSelect` với `preventRootSelection` (`AddProductDrawer.jsx`), và helper đặt
 *    `selectable: level > 1` (`components/categoryTreeSelect/CategoryTreeSelect.jsx:260`) ⇒ node
 *    danh mục GỐC **không bấm được**. Bấm vào nó KHÔNG báo lỗi gì, ô vẫn rỗng, tới lúc submit mới
 *    hiện "Vui lòng chọn danh mục!" — sai im lặng, mất cả buổi để lần ra.
 *    Vì vậy bước 4.1 tạo **hai** danh mục: một gốc làm CHA, một con trỏ vào cha đó; sản phẩm
 *    dùng danh mục CON. 🚫 Đừng rút lại còn một danh mục gốc.
 * 🔴 SKU là khoá nghiệp vụ, duy nhất toàn hệ thống — đây là khoá mà **128 case** ở 7 phân hệ
 *    đang chờ (`tool/bin/thieu-input.js`), nên bước này gỡ được nhiều case nhất.
 * 🔴 Chỉ tạo sản phẩm **một đơn vị tính, hệ số quy đổi = 1**: sản phẩm nhiều ĐVT kéo theo
 *    `convert_to_main_unit ≠ 1`, và mọi case đo số lượng phải quy đổi — sai đơn vị KHÔNG ném
 *    lỗi, chỉ ra số lệch theo bội số.
 * 🔴 Tạo **BỐN** sản phẩm, mỗi phương pháp tính giá vốn một cái (MAC · FIFO · đích danh có serial ·
 *    giá tiêu chuẩn). Lý do: 15 case của `04_3_nhap_xuat_chuyen_kho` đòi đúng bộ này — chỉ có MAC
 *    thì chúng ở lại trạng thái tắt. Sản phẩm MAC vẫn là sản phẩm **chính** (`sku` trong sổ), ba
 *    cái kia nằm ở `sanPhamTheoGiaVon` để case nào cần thì lấy.
 */

const { test, expect } = require('@playwright/test');
const { moTrang } = require('../../shared/auth/login');
const { doc, ghi, lay, PREFIX, PREFIX_MA, runId } = require('../seed-state');
const { chon } = require('../helpers');

test.describe.configure({ mode: 'serial' });

const ROUTE_DANH_MUC = '/product/category';
const ROUTE_SAN_PHAM = '/product/normal';

/** Tạo một danh mục sản phẩm; `tenCha` rỗng = danh mục GỐC. */
async function taoDanhMuc(page, { ma, ten, tenCha }) {
  // 🔴 Ghi lại MỌI request hỏng: chỉ có mã lỗi mà không có URL thì không phân biệt được
  //    "thiếu quyền ở API tạo" với "một API phụ nào đó 401" — hai nguyên nhân, hai cách chữa.
  const hong = [];
  page.on('response', (r) => {
    if (r.status() >= 400) hong.push(`${r.status()} ${r.request().method()} ${r.url()}`);
  });

  await moTrang(page, ROUTE_DANH_MUC, 'tct');
  await page.getByRole('button', { name: 'Thêm mới' }).first().click();

  const hop = page.locator('.ant-modal-wrap:visible, .ant-drawer-open').last();
  await expect(hop.getByText('Thêm danh mục', { exact: false }).first()).toBeVisible({
    timeout: 20_000,
  });

  await hop.getByPlaceholder('Nhập mã danh mục').fill(ma);
  await hop.getByPlaceholder('Nhập tên danh mục').fill(ten);
  if (tenCha) {
    // Ô "Danh mục cha" KHÔNG đặt `preventRootSelection` ⇒ chọn được danh mục gốc.
    await chon(page, hop, /Danh mục cha/, tenCha);
  }

  const cho = page.waitForResponse(
    (r) => /categor/i.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()),
    { timeout: 30_000 },
  );
  await hop.getByRole('button', { name: /Xác nhận|Lưu|Thêm/ }).last().click();
  const res = await cho.catch(async (e) => {
    const loi = await hop.locator('.ant-form-item-explain-error').allInnerTexts();
    throw new Error(`${e.message}\nÔ bị chặn: ${loi.join(' | ') || '(không có ô nào báo lỗi)'}`);
  });
  expect(res.status(), `${await res.text()}\nRequest hỏng: ${hong.join(' | ')}`).toBeLessThan(400);
}

test('seed 4.1 — tạo danh mục cha và danh mục con cho sản phẩm', async ({ page }) => {
  const maCha = `ADMC${runId()}`;
  const tenCha = `${PREFIX}DANHMUCCHA_${runId()}`;
  const ma = `ADM${runId()}`;
  const ten = `${PREFIX}DANHMUC_${runId()}`;

  await taoDanhMuc(page, { ma: maCha, ten: tenCha });
  ghi('sanPham', { maDanhMucCha: maCha, tenDanhMucCha: tenCha });

  // 🔴 Danh mục con mới là thứ sản phẩm dùng được (cấp > 1).
  await taoDanhMuc(page, { ma, ten, tenCha });
  ghi('sanPham', { maDanhMuc: ma, tenDanhMuc: ten });
});

/**
 * Bốn phương pháp tính giá vốn. 🔴 Nhãn phải khớp `STOCK_TYPES` trong
 * `vnpost-web/src/utils/constants/config.jsx` — 🚫 đừng viết tắt "FIFO" trần, ô Select hiển thị
 * đầy đủ "Nhập trước xuất trước (FIFO)".
 * 🔴 "Thực tế đích danh" mở thêm ô tick **serial**; ô đó chỉ hiện SAU khi chọn phương pháp này,
 *    🚫 không có sẵn trong DOM từ đầu.
 */
const GIA_VON = [
  { khoa: 'mac', nhan: 'Bình quân gia quyền', ma: 'MAC', hau: 'MAC', serial: false },
  { khoa: 'fifo', nhan: 'Nhập trước xuất trước (FIFO)', ma: 'FIFO', hau: 'FIFO', serial: false },
  { khoa: 'dichDanh', nhan: 'Thực tế đích danh', ma: 'SPECIFIC_IDENTIFICATION', hau: 'DD', serial: true },
  { khoa: 'tieuChuan', nhan: 'Giá tiêu chuẩn', ma: 'STANDARD', hau: 'TC', serial: false },
];

/** Tạo một sản phẩm trong danh mục con, theo một phương pháp tính giá vốn. */
async function taoSanPham(page, { tenDanhMuc, tenSanPham, sku, giaVon }) {
  await moTrang(page, ROUTE_SAN_PHAM, 'tct');
  await page.getByRole('button', { name: 'Thêm mới' }).first().click();

  const dr = page.locator('.ant-drawer-open, .ant-modal-wrap:visible').last();

  // 🔴 Form khai `name="form"` nên antd đổi id các ô thành `form_<tên trường>`, 🚫 KHÔNG phải
  //    `#productName`. Bám theo accessible name / placeholder cho khỏi phụ thuộc tiền tố form.
  const oTen = dr.getByPlaceholder('Tên sản phẩm', { exact: true });
  await expect(oTen, 'Không mở được form Thêm sản phẩm').toBeVisible({ timeout: 30_000 });
  await oTen.fill(tenSanPham);

  // 🔴 Chín trường bắt buộc (dấu * trên form): Tên sản phẩm · Danh mục · SKU · Mã barcode ·
  //    Mã kế toán · VAT (bán hàng) · Loại đơn vị quản lý · Đơn vị quản lý · Đơn vị (ĐVT gốc).
  //    Thiếu một ô là validate client chặn, POST 🚫 không được gửi — triệu chứng là bấm Lưu
  //    xong không có request nào, rất dễ tưởng backend im lặng.
  await chon(page, dr, /Danh mục/, tenDanhMuc);
  await dr.getByPlaceholder('Nhập SKU').first().fill(sku);
  await dr.getByPlaceholder('Nhập mã barcode').first().fill(sku);
  await dr.getByPlaceholder('Nhập mã kế toán').first().fill(sku);
  await chon(page, dr, /VAT \(bán hàng\)/);
  await chon(page, dr, /^\*? ?Loại đơn vị quản lý/);

  // 🔴 "Đơn vị quản lý" (`form_orgUnitCode`) bị `disabled` cho tới khi chọn xong "Loại đơn vị
  //    quản lý", và với loại cấp cao nhất thì hệ thống tự điền, ô ở lại trạng thái disabled.
  //    Bấm vào ô disabled thì Playwright treo hết timeout — phải kiểm trạng thái trước.
  const oDonViQuanLy = dr.locator('#form_orgUnitCode');
  if (await oDonViQuanLy.isEnabled().catch(() => false)) {
    await chon(page, dr, /^\*? ?Đơn vị quản lý/);
  }

  // Ô "Đơn vị" là đơn vị tính gốc — 🔴 chỉ dùng MỘT đơn vị, hệ số quy đổi = 1, để case đo
  //    số lượng khỏi phải nhân `convert_to_main_unit`.
  await dr.getByRole('textbox', { name: /^\*? ?Đơn vị$/ }).first().fill('Cái');

  // --- Phương pháp tính giá vốn.
  // 🔴 Ô này 🚫 KHÔNG bắt buộc và form **tự gợi ý theo danh mục**; chọn tay thì FE đánh dấu
  //    `stockTypeTouchedRef` và thôi gợi ý. Không chọn là cả bốn sản phẩm cùng một phương pháp —
  //    sai im lặng, chỉ lộ khi case FIFO/đích danh đo ra số của MAC.
  // 🔴 Ô này 🚫 KHÔNG có accessible name: nhãn "Phương pháp tính giá vốn" nằm ở thẻ riêng cạnh
  //    icon tooltip, không gắn `for` vào input ⇒ `getByRole('combobox', { name })` ra 0 phần tử.
  //    Bám theo KHỐI chứa nhãn rồi lấy ant Select bên trong.
  //    🚫 Cũng đừng lọc `.ant-form-item` theo text: nhãn ở đây 🚫 không nằm trong `.ant-form-item`
  //    nào (label dựng bằng div riêng), lọc ra rỗng rồi `.last()` trúng ô khác.
  //    Đi từ chính thẻ chữ sang ô Select ngay sau nó trong DOM.
  const oGiaVon = dr.locator(
    'xpath=//*[normalize-space(text())="Phương pháp tính giá vốn"]'
      + '/following::div[contains(@class,"ant-select")][1]',
  ).first();
  await expect(oGiaVon, 'Không thấy ô "Phương pháp tính giá vốn"').toBeVisible({ timeout: 20_000 });
  await oGiaVon.click();
  const dsGiaVon = page.locator('.ant-select-dropdown:visible').last();
  const mucGiaVon = dsGiaVon
    .locator('.ant-select-item-option')
    .filter({ hasText: new RegExp(`^${giaVon.nhan.replace(/[()]/g, '\\$&')}$`) });
  await expect(
    mucGiaVon.first(),
    `Không thấy phương pháp "${giaVon.nhan}" trong danh sách. Đang có: `
      + `${(await dsGiaVon.locator('.ant-select-item-option').allInnerTexts()).join(' | ')}`,
  ).toBeVisible({ timeout: 15_000 });
  await mucGiaVon.first().click();

  // 🔴 🚫 Đừng kiểm giá trị bằng DOM của ô: khối "Kho hàng" là một `Collapse`, sau thao tác nó
  //    đóng lại và cả nhãn lẫn ô biến mất khỏi cây — assert nào bám DOM cũng "element not found"
  //    dù giá trị đã nhận đúng. Kiểm ở **payload gửi lên** mới đúng bản chất (xem dưới).
  if (giaVon.serial) {
    // Ô tick serial chỉ render SAU khi chọn "Thực tế đích danh".
    const oSerial = dr.getByRole('checkbox', { name: /serial/i }).first();
    await expect(
      oSerial,
      'Chọn "Thực tế đích danh" xong mà không thấy ô tick quản lý theo serial',
    ).toBeVisible({ timeout: 15_000 });
    await oSerial.check();
  }

  const cho = page.waitForResponse(
    (r) => /product/i.test(r.url()) && r.request().method() === 'POST',
    { timeout: 45_000 },
  );
  // 🔴 Bám ĐÚNG nhãn "Xác nhận", 🚫 đừng dùng regex rộng + `.last()`: trong drawer còn các nút
  //    "Thêm danh mục", "Thêm thương hiệu", "Thêm mới"… — bấm nhầm thì form không submit,
  //    không có POST nào, và lỗi hiện ra là "timeout chờ response" chứ không phải "bấm nhầm nút".
  await dr.getByRole('button', { name: 'Xác nhận', exact: true }).click();

  // 🔴 Không có POST nghĩa là validate client chặn. Đọc luôn thông báo lỗi của từng ô, 🚫 đừng
  //    để lỗi hiện ra chỉ là "timeout chờ response" — nó giấu mất nguyên nhân thật.
  const res = await cho.catch(async (e) => {
    const loi = await dr.locator('.ant-form-item-explain-error').allInnerTexts();
    throw new Error(`${e.message}\nÔ bị chặn: ${loi.join(' | ') || '(không có ô nào báo lỗi)'}`);
  });
  const than = res.status() >= 400 ? await res.text().catch(() => '(không đọc được body)') : '';
  expect(res.status(), than).toBeLessThan(400);

  // 🔴 Kiểm phương pháp giá vốn ở PAYLOAD, 🚫 không ở giao diện. Ô này có GỢI Ý SẴN theo danh mục:
  //    click trượt thì nó giữ nguyên giá trị cũ, form vẫn submit, backend vẫn 200 — bốn sản phẩm
  //    cùng một phương pháp mà 🚫 không có lỗi nào. Chỉ lộ khi case FIFO đo ra số của MAC.
  const guiLen = res.request().postData() || '';
  expect(
    guiLen,
    `Sản phẩm "${tenSanPham}" gửi lên KHÔNG mang stockType=${giaVon.ma}. Payload: ${guiLen.slice(0, 300)}`,
  ).toContain(`"stockType":"${giaVon.ma}"`);
}

test('seed 4.2 — tạo 4 sản phẩm, mỗi phương pháp tính giá vốn một cái', async ({ page }) => {
  const tenDanhMuc = lay('sanPham', 'tenDanhMuc');
  const theoGiaVon = {};

  for (const gv of GIA_VON) {
    const tenSanPham = `${PREFIX}SP_${gv.hau}_${runId()}`;
    const sku = `${PREFIX_MA}SKU${gv.hau}${runId()}`;
    await taoSanPham(page, { tenDanhMuc, tenSanPham, sku, giaVon: gv });
    theoGiaVon[gv.khoa] = { tenSanPham, sku, giaVon: gv.nhan, serial: gv.serial };

    // 🔴 Sản phẩm MAC là sản phẩm CHÍNH của bộ seed: bước 5, 7, 8 và `test-input.json` của các
    //    phân hệ đều lấy `sanPham.sku`.
    // 🔴 🚫 KHÔNG ghi đè khi sổ ĐÃ có sản phẩm chính: bảng giá bán (bước 5), sản phẩm NCC và bảng
    //    giá mua (bước 7), nhất là **tồn kho** (bước 8) đều gắn với SKU cũ — mà tồn đầu kỳ
    //    🚫 chỉ khai được MỘT LẦN cho mỗi điểm bán, không dựng lại cho SKU mới được. Ghi đè là sổ
    //    trỏ một đằng, dữ liệu thật nằm một nẻo, và case lấy `sanPham.sku` sẽ đọc ra tồn 0.
    if (gv.khoa === 'mac' && !doc().duLieu?.sanPham?.sku) ghi('sanPham', { tenSanPham, sku });
  }

  ghi('sanPham', { sanPhamTheoGiaVon: theoGiaVon });
});
