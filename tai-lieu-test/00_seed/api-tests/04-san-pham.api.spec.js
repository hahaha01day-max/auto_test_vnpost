'use strict';

/**
 * Bước 4 (API) — DANH MỤC cha/con + SẢN PHẨM, mỗi phương pháp giá vốn một cái.
 * 🔴 SP CHÍNH (`sanPham.sku`/`tenSanPham` trong sổ) là SP Bình quân CÓ BIẾN THỂ / ĐƠN VỊ QUY ĐỔI (4.3) —
 *    SP Bình quân thường đã bỏ (23/09/2026). SKU chính = SKU đơn vị gốc của biến thể đầu tiên.
 * Chuỗi request bám `addAndUpdateCategory.js/index.jsx:196-206` (POST /chain/product-categories/individual)
 * và `AddProductDrawer.jsx:758-866` (POST /chain/products). Sau khi tạo, FE 🚫 không gửi gì thêm.
 * 🔴 `categoryName` FE gửi literal "Sản phẩm" (tree select làm mất label) — giữ nguyên hành vi đó.
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { doc, ghi, kh, lay } = require('../seed-state');

test.describe.configure({ mode: 'serial' });

const GIA_VON = [
  { khoa: 'fifo', nhan: 'Nhập trước xuất trước (FIFO)', ma: 'FIFO', hau: 'FIFO', serial: false },
  { khoa: 'dichDanh', nhan: 'Thực tế đích danh', ma: 'SPECIFIC_IDENTIFICATION', hau: 'DD', serial: true },
  { khoa: 'tieuChuan', nhan: 'Giá tiêu chuẩn', ma: 'STANDARD', hau: 'TC', serial: false },
];

const idCua = (d) => (typeof d === 'object' ? d?.id ?? d?.categoryId ?? d?.productId : d);

test('seed 4.1 — danh mục cha và con', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const maCha = kh('sanPham.maDanhMucCha');
  const tenCha = kh('sanPham.tenDanhMucCha');
  const ma = kh('sanPham.maDanhMuc');
  const ten = kh('sanPham.tenDanhMuc');
  const tao = (catName, code, parentId) => goi('POST', '/chain/product-categories/individual', {
    params: { type: 0 }, data: { catName, type: 0, parentId, code, imageUrl: '', note: '' },
  });
  const idCha = idCua(await tao(tenCha, maCha, 0));
  expect(idCha, 'Tạo danh mục cha không trả id').toBeTruthy();
  const idCon = idCua(await tao(ten, ma, idCha));
  expect(idCon, 'Tạo danh mục con không trả id').toBeTruthy();
  ghi('sanPham', { maDanhMucCha: maCha, tenDanhMucCha: tenCha, maDanhMuc: ma, tenDanhMuc: ten, idDanhMuc: idCon });
});

test('seed 4.2 — ba sản phẩm FIFO, đích danh, giá tiêu chuẩn', async ({ page }) => {
  const { goi, headers } = await moPhienApi(page, 'tct');
  const categoryId = lay('sanPham', 'idDanhMuc');
  const theoGiaVon = {};
  for (const gv of GIA_VON) {
    const tenSanPham = kh(`sanPham.${gv.hau}.ten`);
    const sku = kh(`sanPham.${gv.hau}.sku`);
    // Đã tạo ở lượt trước (lượt đó hỏng ở bước sau) ⇒ 🚫 POST lại, trùng SKU.
    const daCo = ((await goi('POST', '/chain/products/bulk-fields', { data: { skus: [sku], fields: ['vatPercent'], activeOnly: true } })) || {})[sku];
    if (!daCo) await goi('POST', '/chain/products', {
      data: {
        productName: tenSanPham, sku, barCode: sku, accountingCode: sku, deductibleTaxPercent: 0,
        unit: 'Cái', categoryId, categoryName: 'Sản phẩm', isTopping: false, distributionMethod: 'MUA_BAN',
        goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: true, price: 0,
        shopId: headers.shopid ? Number(headers.shopid) : undefined, chainId: Number(headers.chainid),
        type: 0, isSell: 1, attributes: [], options: [], variants: [], productUnits: [], images: [], imageUrl: [],
        description: '', requireStock: true, quantityWarning: null, stockType: gv.ma, isSerialRequired: gv.serial,
        enableVat: true, vatPercent: 0, directTaxPercent: 0, pitTaxPercent: 0, specialProductCategory: null,
        isIngredient: false, clength: null, cwidth: null, cheight: null, active: true, status: 'KICH_HOAT',
        priceBeforeDiscount: 0, isComposite: false, secondaryBarCodes: [],
      },
    });
    const tim = await goi('GET', '/chain/products/basic-search', { params: { sku, pageNum: 0, pageSize: 50, page: 0, size: 50, type: 0 } });
    expect(JSON.stringify(tim || ''), `Tạo xong mà tìm không ra SKU ${sku}`).toContain(sku);
    theoGiaVon[gv.khoa] = { tenSanPham, sku, giaVon: gv.nhan, serial: gv.serial };
  }
  // SP Giá tiêu chuẩn: khai giá tiêu chuẩn cho đơn vị chính — chuỗi request bám
  // `StandardPriceListPage.jsx` (PUT /chain/products/standard-declared-prices).
  const skuTC = theoGiaVon.tieuChuan.sku;
  const tc = ((await goi('POST', '/chain/products/bulk-fields', { data: { skus: [skuTC], fields: ['vatPercent'], activeOnly: true } })) || {})[skuTC];
  expect(tc?.productUnitId, `Không tra được đơn vị của SKU ${skuTC}`).toBeTruthy();
  const giaTieuChuan = Number(kh('sanPham.TC.giaTieuChuan'));
  await goi('PUT', '/chain/products/standard-declared-prices', {
    data: { items: [{ productId: tc.productId, units: [{ productUnitId: tc.productUnitId, macPrice: giaTieuChuan }] }] },
  });
  theoGiaVon.tieuChuan.giaTieuChuan = giaTieuChuan;
  // Gộp — 🚫 ghi đè mất `mac` do 4.3 ghi.
  ghi('sanPham', { sanPhamTheoGiaVon: { ...doc().duLieu?.sanPham?.sanPhamTheoGiaVon, ...theoGiaVon } });
});

/** Bỏ dấu + chỉ giữ chữ số để ghép SKU: "Hộp" → "HOP". */
const maHoa = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'D')
  .replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/**
 * Danh sách SKU của SP biến thể: [{ sku, bienThe, donVi, heSo }] — MỘT nguồn cho bước 4 (tạo) và
 * bước 5 (bảng giá). Biến thể i: `<sku>-<i>`; đơn vị quy đổi: `<sku>[-<i>]-<ĐƠN VỊ>`.
 */
function skuBienThe() {
  const sku = String(kh('sanPham.BT.sku')).trim();
  const goc = String(kh('sanPham.BT.donViGoc')).trim() || 'Cái';
  const giaTri = kh('sanPham.BT.coBienThe')
    ? String(kh('sanPham.BT.giaTri')).split(',').map((x) => x.trim()).filter(Boolean) : [];
  const quyDoi = kh('sanPham.BT.coQuyDoi')
    ? String(kh('sanPham.BT.quyDoi')).split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
      const [ten, he] = x.split('=').map((y) => y.trim());
      if (!ten || !(Number(he) > 1)) throw new Error(`Quy đổi sai dạng "${x}" — cần "Đơn vị=hệ số" (hệ số > 1)`);
      return { ten, heSo: Number(he) };
    }) : [];
  const ra = [];
  const nhanh = giaTri.length ? giaTri.map((v, i) => ({ bienThe: v, goc: `${sku}-${i + 1}` })) : [{ bienThe: null, goc: sku }];
  for (const n of nhanh) {
    ra.push({ sku: n.goc, bienThe: n.bienThe, donVi: goc, heSo: 1 });
    for (const q of quyDoi) ra.push({ sku: `${n.goc}-${maHoa(q.ten)}`, bienThe: n.bienThe, donVi: q.ten, heSo: q.heSo });
  }
  return { sku, goc, giaTri, quyDoi, ra };
}

/**
 * 🔴 Payload đối chiếu request THẬT của FE (bắt rồi abort, 23/09/2026) cho cả 3 dạng:
 *   - có biến thể: cấp SP 🚫 KHÔNG có sku/barCode; `options[]`; mỗi `variants[]` có sku + barCode
 *     (BẮT BUỘC) + `productUnitVariants[]` (sku theo đơn vị, barCode rỗng được); `productUnits[]` chỉ
 *     {exchangeValue, price, unit, unitConvertTo}.
 *   - chỉ quy đổi: sku/barCode ở cấp SP; `productUnits[]` mang thêm sku + barCode của từng đơn vị.
 *   - chỉ biến thể: như dạng 1 nhưng `productUnitVariants: []`, `productUnits: []`.
 */
test('seed 4.3 — sản phẩm chính: Bình quân, có biến thể / đơn vị quy đổi', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const tenSanPham = String(kh('sanPham.BT.ten'));
  const { sku, goc, giaTri, quyDoi, ra } = skuBienThe();
  const thuocTinh = String(kh('sanPham.BT.thuocTinh')).trim() || 'Màu';

  // Tra theo SKU bằng `bulk-fields` (FE dùng ở bảng giá mua) — trả đơn vị + productUnitId từng SKU.
  // 🚫 Đừng tra `basic-search-product-unit?barCode=`: barcode đơn vị quy đổi để rỗng như FE ⇒ tra không ra.
  const tra = async () => (await goi('POST', '/chain/products/bulk-fields', {
    data: { skus: ra.map((x) => x.sku), fields: ['vatPercent'], activeOnly: true },
  })) || {};
  const daCo = await tra();
  const thieu = () => ra.filter((x) => !daCo[x.sku]);

  // Đã tạo ở lượt trước (lượt đó hỏng ở bước kiểm) ⇒ 🚫 POST lại, trùng SKU.
  if (thieu().length === ra.length) {
  const body = {
    productName: tenSanPham, categoryId: lay('sanPham', 'idDanhMuc'), secondaryBarCodes: [], accountingCode: sku,
    deductibleTaxPercent: 0, goodsMaterialType: 'KHONG_PHAN_LOAI', distributionMethod: 'MUA_BAN', isLoyalty: true,
    isIngredient: false, unit: goc, weightUnit: 'g', volumeUnit: 'ml', clength: null, dimensionUnit: 'cm', cwidth: null,
    cheight: null, price: 0, categoryName: 'Sản phẩm', type: 0, isSell: 1, attributes: [], options: [], description: '',
    variants: [], requireStock: true, productUnits: [], images: [], imageUrl: [], stockType: 'MAC', isSerialRequired: false,
    enableVat: true, vatPercent: 0, directTaxPercent: 0, pitTaxPercent: 0, specialProductCategory: null, active: true,
    status: 'KICH_HOAT', priceBeforeDiscount: 0, isComposite: false,
  };
  if (giaTri.length) {
    body.options = [{ name: thuocTinh, value: giaTri, _default: [], images: [] }];
    body.variants = giaTri.map((v, i) => ({
      name: `${thuocTinh}: ${v}`, macPriceProduct: 0, index: String(i), barCode: `${sku}-${i + 1}`, sku: `${sku}-${i + 1}`,
      productUnitVariants: quyDoi.map((q) => ({ barCode: '', price: 0, sku: `${sku}-${i + 1}-${maHoa(q.ten)}`, unit: q.ten })),
      isSerialRequired: false,
    }));
    body.productUnits = quyDoi.map((q) => ({ exchangeValue: q.heSo, price: 0, unit: q.ten, unitConvertTo: goc }));
  } else {
    body.sku = sku;
    body.barCode = sku;
    body.productUnits = quyDoi.map((q) => ({
      barCode: `${sku}-${maHoa(q.ten)}`, exchangeValue: q.heSo, price: 0, sku: `${sku}-${maHoa(q.ten)}`, unit: q.ten, unitConvertTo: goc,
    }));
  }
  await goi('POST', '/chain/products', { data: body });
  Object.assign(daCo, await tra());
  }

  // Kiểm ĐỦ mọi SKU biến thể × đơn vị, đúng đơn vị — 🚫 ghi sổ khi còn SKU thiếu hoặc lệch đơn vị.
  expect(thieu().map((x) => x.sku), 'SKU biến thể/đơn vị chưa có trong hệ thống').toEqual([]);
  for (const x of ra) expect(daCo[x.sku].unit, `SKU ${x.sku} sai đơn vị`).toBe(x.donVi);
  const skus = ra.map((x) => ({ ...x, productId: daCo[x.sku].productId, variantId: daCo[x.sku].variantId, productUnitId: daCo[x.sku].productUnitId }));
  ghi('sanPham', { sanPhamBienThe: { tenSanPham, skuGoc: sku, donViGoc: goc, thuocTinh: giaTri.length ? thuocTinh : null, skus } });
  // SP chính của bộ seed = đơn vị gốc của biến thể đầu tiên — bước 5, 7, 8 đọc `sanPham.sku`.
  const chinh = skus[0];
  const tenBienThe = chinh.bienThe ? `${thuocTinh}: ${chinh.bienThe}` : null;
  ghi('sanPham', {
    tenSanPham, sku: chinh.sku, donViGoc: goc, tenBienThe,
    sanPhamTheoGiaVon: { ...doc().duLieu?.sanPham?.sanPhamTheoGiaVon, mac: { tenSanPham, sku: chinh.sku, giaVon: 'Bình quân gia quyền', serial: false } },
  });
});

