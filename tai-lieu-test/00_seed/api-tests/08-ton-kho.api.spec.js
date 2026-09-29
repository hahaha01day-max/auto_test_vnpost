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
 * 🔴 Tồn đầu kỳ khai được NHIỀU LẦN cho một điểm bán, miễn 🚫 trùng sản phẩm/biến thể đã khai
 *    (`hasOpeningBalanceForProduct`: đã có tồn đầu kỳ HOẶC đã có phiếu nhập ở kho). Bước này chỉ
 *    khai phần CÒN THIẾU — chạy lại không hỏng, và chừa chỗ cho case 04_2 khai sản phẩm khác.
 */

const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { test, expect } = require('@playwright/test');
const { doc, ghi, kh, lay, runId } = require('../seed-state');
const { moPhienApi } = require('../api');

test.describe.configure({ mode: 'serial' });

const SO_LUONG = Number(kh('tonKho.soLuong'));
const GIA_VON = Number(kh('tonKho.giaVon'));

/**
 * Dòng tồn đầu kỳ: mỗi biến thể của SP chính một dòng (đơn vị gốc) + SP FIFO + SP tiêu chuẩn.
 * 🚫 Không có SP đích danh — xem `tonKho.*` trong `seed-state.js`.
 * 🔴 FIFO bắt buộc mã lô (`Sản phẩm FIFO/LIFO bắt buộc có mã lô`); MAC / tiêu chuẩn để trống, hệ thống tự sinh.
 */
function dongTon() {
  const sp = doc().duLieu.sanPham;
  const bt = lay('sanPham', 'sanPhamBienThe');
  const dong = bt.skus.filter((x) => x.heSo === 1).map((x) => ({
    sku: x.sku, ten: bt.tenSanPham, bienThe: x.bienThe ? `${bt.thuocTinh}: ${x.bienThe}` : 'Mặc định', donVi: x.donVi,
    lo: '', soLuong: SO_LUONG, giaVon: GIA_VON,
  }));
  for (const [khoa, hau, lo] of [['fifo', 'FIFO', `${doc().prefix}LO_FIFO`], ['tieuChuan', 'TC', '']]) {
    const x = sp.sanPhamTheoGiaVon[khoa];
    dong.push({ sku: x.sku, ten: x.tenSanPham, bienThe: 'Mặc định', donVi: 'Cái', lo,
      soLuong: Number(kh(`tonKho.soLuong.${hau}`)),
      // Tiêu chuẩn: backend lấy giá tiêu chuẩn đã khai, bỏ qua cột Giá vốn — ghi cho khớp để người đọc file khỏi nhầm.
      giaVon: Number(kh(hau === 'TC' ? 'sanPham.TC.giaTieuChuan' : `tonKho.giaVon.${hau}`)) });
  }
  return dong.filter((d) => d.soLuong > 0);
}

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
  for (const d of dong) ws.addRow(d);
  fs.mkdirSync(path.dirname(duong), { recursive: true });
  await wb.xlsx.writeFile(duong);
}

test('seed 8 — khai báo tồn kho đầu kỳ', async ({ page }) => {
  const sku = lay('sanPham', 'sku');
  const tatCa = dongTon();
  const maShop = lay('diemBan', 'maShop');

  // 🔴 Đi bằng API (đổi 23/09/2026): bản lái giao diện chờ NHÃN "Chờ xác nhận" trên bảng không tự
  //    làm mới ⇒ hỏng dù backend đã xử lý xong (`status: COMPLETED`). Chuỗi request bám đúng
  //    `DrawerOpeningBalance.jsx`: uploads → previews/{id}/status (poll) → previews/{id}/confirm.
  // 🔴 Tồn đầu kỳ cần `INVENTORY_OPENING_BALANCE` — chỉ **Cửa hàng trưởng** có (GDV ⇒ `SSHOP-401`),
  //    và tài khoản phải MỘT vai: tài khoản 2 vai cũng ra `SSHOP-401`.
  const { goi, headers } = await moPhienApi(page, 'seed_shop');
  const shopId = headers.shopid;
  expect(shopId, 'Phiên không mang header shopid — đăng nhập chưa vào điểm bán').toBeTruthy();

  // 🔴 Danh sách đã khai 🚫 trả sku — chỉ productId/variantId ⇒ tra id của từng SKU rồi so theo cặp đó.
  const idSku = (await goi('POST', '/chain/products/bulk-fields', {
    data: { skus: tatCa.map((d) => d.sku), fields: ['vatPercent'], activeOnly: true },
  })) || {};
  const khoaCua = (pid, vid) => `${pid}:${vid}`;
  const daKhaiKhoa = async () => new Set(((await goi('GET', `/shops/${shopId}/stock/opening-balance/declared-products`, {
    params: { page: 0, size: 500 },
  })) || []).map((d) => khoaCua(d.productId, d.variantId)));
  const khoaDong = (d) => khoaCua(idSku[d.sku]?.productId, idSku[d.sku]?.variantId);
  const daKhai = await daKhaiKhoa();
  const dong = tatCa.filter((d) => !daKhai.has(khoaDong(d)));
  if (dong.length === 0) {
    ghi('tonKho', { sku, soLuong: SO_LUONG, giaVon: GIA_VON, nguon: 'ton-dau-ky', daCoSan: true, dong: tatCa });
    return;
  }

  // Bản xem trước chưa xác nhận còn treo (lượt trước hỏng giữa chừng) ⇒ dùng lại, 🚫 upload chồng.
  let previewId = (await goi('GET', '/opening-balance/previews/latest', { params: { shopId }, chapNhan: () => true }))?.previewId;
  if (previewId) {
    // Bản cũ có dòng lỗi (vd dựng lúc SP tiêu chuẩn chưa khai giá) ⇒ dùng lại là hỏng mãi. Xoá rồi upload lại.
    const cu = await goi('GET', `/opening-balance/previews/${previewId}/status`, { params: { shopId } });
    if (cu?.status !== 'COMPLETED' || cu?.invalidRows > 0 || cu?.validRows !== dong.length) {
      await goi('DELETE', `/opening-balance/previews/${previewId}`, { params: { shopId } });
      previewId = null;
    }
  }
  if (!previewId) {
    const file = path.join(__dirname, '..', 'test-output', `ton-dau-ky-${runId()}.xlsx`);
    // Backend dò sản phẩm theo SKU; tên SP / biến thể / đơn vị chỉ để người đọc file.
    await dungFileExcel(file, dong.map((d) => [
      maShop, '', d.sku, d.ten, d.bienThe, d.donVi, d.lo, '', d.soLuong, d.giaVon, 'AUTO TEST', '',
    ]));
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
  if (st.invalidRows > 0) {
    // Nêu rõ dòng nào lỗi, lỗi gì — tester đọc log là biết, 🚫 phải mở màn tồn đầu kỳ tra lại.
    const loi = await goi('GET', `/opening-balance/previews/${previewId}/items`, { params: { shopId, status: 'INVALID', page: 0, size: 50 } });
    const ds = JSON.stringify(loi?.items || loi?.content || loi);
    throw new Error(`Bản xem trước có ${st.invalidRows} dòng lỗi: ${ds.slice(0, 1500)}`);
  }
  expect(st.validRows, `Bản xem trước thiếu dòng hợp lệ: ${JSON.stringify(st)}`).toBe(dong.length);
  expect(st.invalidRows, `Bản xem trước có dòng lỗi: ${JSON.stringify(st)}`).toBe(0);

  await goi('POST', `/opening-balance/previews/${previewId}/confirm`, {
    params: { shopId },
    data: { note: 'AUTO TEST seed' },
  });

  // Kiểm kết quả thật: sản phẩm phải nằm trong danh sách đã khai của điểm bán.
  await expect
    .poll(async () => { const k = await daKhaiKhoa(); return tatCa.every((d) => k.has(khoaDong(d))); },
      { timeout: 60_000, intervals: [3_000] })
    .toBe(true);

  ghi('tonKho', { sku, soLuong: SO_LUONG, giaVon: GIA_VON, nguon: 'ton-dau-ky', previewId, dong: tatCa });
});
