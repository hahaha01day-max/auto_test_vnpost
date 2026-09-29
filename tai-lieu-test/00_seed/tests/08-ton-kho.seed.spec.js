'use strict';

/**
 * Bước 8 — TỒN KHO ĐẦU KỲ, sinh TỒN THẬT ở điểm bán seed.
 *
 * 🔴 Vì sao đi đường "Tồn kho đầu kỳ" chứ không lập phiếu nhập kho: phiếu nhập ở cấp điểm bán
 *    🚫 KHÔNG có ô "Nhà cung cấp" (ô đó chỉ hiện khi `orgType === 1`, không có ở màn này), nên
 *    mọi dòng sản phẩm đều **bị khoá**: `isPriceMissing` trong `TableDrawerImportReceipt.jsx`
 *    khoá dòng khi không có giá NCC **và** không đến từ PO ⇒ ô Số lượng, ô Giảm giá và cả nút
 *    "Nhập lô / serial" đều `disabled`, cột Mức giá hiện "Chưa có bảng giá".
 *    Muốn nhập tay được thì phải có phiếu đặt hàng (PO) trước — đó là cả luồng `13_3`.
 *    Tồn đầu kỳ đúng mục đích hơn: *"lập tồn kho và giá vốn ban đầu cho Kho / Điểm bán"*.
 *
 * 🔴 Màn này 🚫 KHÔNG có form nhập tay, chỉ nhận **file Excel** ⇒ spec tự dựng file bằng
 *    `exceljs` rồi upload. Cột lấy đúng theo hướng dẫn in trên chính màn đó.
 *
 * 🔴 "Chỉ thực hiện 1 lần cho mỗi điểm bán khi mới khởi tạo" — chạy lại lần hai trên cùng điểm
 *    bán là backend từ chối, 🚫 không phải lỗi script.
 */

const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { test, expect } = require('@playwright/test');
const { ghi, lay, runId } = require('../seed-state');
const { moPhienApi } = require('../api');

test.describe.configure({ mode: 'serial' });

const SO_LUONG = 100;
const GIA_VON = 60_000;

/**
 * Cột của file mẫu — 🔴 lấy từ **file mẫu thật** (`GET /opening-balance/template`), 🚫 KHÔNG theo
 * dòng hướng dẫn in trên màn: hướng dẫn đó **thiếu cột "Mã kho"** và gọi cột thứ tư là "Tên SP"
 * trong khi file mẫu ghi "Tên sản phẩm". Dùng theo hướng dẫn thì job dựng bản xem trước chạy xong
 * với trạng thái **"Thất bại"**, các cột Tổng dòng / Hợp lệ / Lỗi hiện **NaN**, và 🚫 không có
 * thông báo nào nói file sai cột.
 * 🔴 Tên sheet phải là `opening_balance`.
 * 🔴 Mã lô để TRỐNG: sản phẩm tính giá vốn MAC / Tiêu chuẩn thì hệ thống tự sinh lô.
 *    FIFO và Đích danh mới bắt buộc khai.
 */
const SHEET = 'opening_balance';
const COT = [
  'Mã điểm bán / kho', 'Mã kho', 'SKU', 'Tên sản phẩm', 'Tên biến thể', 'Đơn vị',
  'Mã lô', 'Serial', 'Số lượng', 'Giá vốn', 'Ghi chú', 'Hạn sử dụng',
];

async function dungFileExcel(duong, dong) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(SHEET);
  ws.addRow(COT);
  ws.addRow(dong);
  fs.mkdirSync(path.dirname(duong), { recursive: true });
  await wb.xlsx.writeFile(duong);
}

test('seed 8 — khai báo tồn kho đầu kỳ', async ({ page }) => {
  const sku = lay('sanPham', 'sku');
  const tenSanPham = lay('sanPham', 'tenSanPham');
  const maShop = lay('diemBan', 'maShop');

  // 🔴 Đi bằng API (đổi 23/09/2026): bản lái giao diện chờ NHÃN "Chờ xác nhận" trên bảng không tự
  //    làm mới ⇒ hỏng dù backend đã xử lý xong (`status: COMPLETED`). Chuỗi request bám đúng
  //    `DrawerOpeningBalance.jsx`: uploads → previews/{id}/status (poll) → previews/{id}/confirm.
  // 🔴 Tồn đầu kỳ cần `INVENTORY_OPENING_BALANCE` — chỉ **Cửa hàng trưởng** có (GDV ⇒ `SSHOP-401`),
  //    và tài khoản phải MỘT vai: tài khoản 2 vai cũng ra `SSHOP-401`.
  const { goi, headers } = await moPhienApi(page, 'seed_shop');
  const shopId = headers.shopid;
  expect(shopId, 'Phiên không mang header shopid — đăng nhập chưa vào điểm bán').toBeTruthy();

  // Đã khai rồi (chỉ khai được 1 lần/điểm bán) ⇒ ghi sổ và dừng, 🚫 không upload lại.
  const daKhai = await goi('GET', `/shops/${shopId}/stock/opening-balance/declared-products`, {
    params: { page: 0, size: 20 },
  });
  // 🔴 API này 🚫 KHÔNG trả sku — chỉ có productName/productId ⇒ so theo tên sản phẩm.
  const coSanPham = (ds) => (ds || []).some((d) => d.productName === tenSanPham);
  if (coSanPham(daKhai)) {
    ghi('tonKho', { sku, soLuong: SO_LUONG, giaVon: GIA_VON, nguon: 'ton-dau-ky', daCoSan: true });
    return;
  }

  // Bản xem trước chưa xác nhận còn treo (lượt trước hỏng giữa chừng) ⇒ dùng lại, 🚫 upload chồng.
  let previewId = (await goi('GET', '/opening-balance/previews/latest', { params: { shopId }, chapNhan: () => true }))?.previewId;
  if (!previewId) {
    const file = path.join(__dirname, '..', 'test-output', `ton-dau-ky-${runId()}.xlsx`);
    await dungFileExcel(file, [
      maShop, '', sku, tenSanPham, 'Mặc định', 'Cái', '', '', SO_LUONG, GIA_VON, 'AUTO TEST', '',
    ]);
    const up = await goi('POST', '/opening-balance/uploads', {
      params: { shopId },
      multipart: {
        file: {
          name: path.basename(file),
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          buffer: fs.readFileSync(file),
        },
      },
    });
    previewId = up?.previewId;
  }
  expect(previewId, 'Không có previewId').toBeTruthy();

  // Job dựng bản xem trước chạy nền ⇒ poll tới khi hết PENDING/PROCESSING.
  let st;
  await expect
    .poll(async () => {
      st = await goi('GET', `/opening-balance/previews/${previewId}/status`, { params: { shopId } });
      return st?.status;
    }, { timeout: 120_000, intervals: [2_000] })
    .toBe('COMPLETED');
  expect(st.validRows, `Bản xem trước có dòng lỗi: ${JSON.stringify(st)}`).toBeGreaterThan(0);
  expect(st.invalidRows, `Bản xem trước có dòng lỗi: ${JSON.stringify(st)}`).toBe(0);

  await goi('POST', `/opening-balance/previews/${previewId}/confirm`, {
    params: { shopId },
    data: { note: 'AUTO TEST seed' },
  });

  // Kiểm kết quả thật: sản phẩm phải nằm trong danh sách đã khai của điểm bán.
  await expect
    .poll(async () => coSanPham(
      await goi('GET', `/shops/${shopId}/stock/opening-balance/declared-products`, { params: { page: 0, size: 20 } }),
    ), { timeout: 60_000, intervals: [3_000] })
    .toBe(true);

  ghi('tonKho', { sku, soLuong: SO_LUONG, giaVon: GIA_VON, nguon: 'ton-dau-ky', previewId });
});
