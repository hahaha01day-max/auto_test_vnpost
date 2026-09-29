'use strict';

/**
 * Bước 18 (API) — HÀNG KÝ GỬI ở điểm bán seed của làn. Phục vụ phân hệ 16 (`canSeed: "ky-gui"`):
 * 16_010_021 (HĐ hết hiệu lực bị chặn bán) · 16_010_022 (SP ký gửi chưa gán NCC) · 16_030_007 · 16_060_022.
 *
 * Luật nhận biết + giá (trace pod/core 28/09/2026):
 * - Ký gửi = `VNPOST_CORE.CHAIN_PRODUCTS.distribution_method = 'KY_GUI'` — một cột duy nhất (`ConsignmentResolver`).
 * - Bán ký gửi cần HĐ ký gửi ACTIVE hiệu lực tại ngày bán của NCC gắn SKU (`StockOwnershipStamper.assertContractActive`
 *   ⇒ CONSIGN-005); SKU không gắn NCC ⇒ CONSIGN-002 lúc treo công nợ (`ConsignmentObligationService`).
 * - 🔴 MỘT NCC chỉ có MỘT HĐ ACTIVE trong cùng khoảng thời gian (`validateNoOverlap`) — NCC của làn đã có HĐ mua đứt
 *   1 năm (bước 7) ⇒ tạo 2 NCC MỚI: `KG1` (HĐ ký gửi còn hiệu lực) · `KG2` (HĐ ký gửi, nhập hàng xong thì HUỶ).
 * - 🔴 SP ký gửi CHỈ được giá vốn Thực tế đích danh (core SSHOP-402) — không bắt serial.
 * - HĐ ký gửi bắt buộc `reconciliationCycle` + `maxReturnDays > 0` (`validateConsignmentTerms`).
 * - Giá vốn ký gửi = dòng bảng giá mua gắn HĐ (`contractId`) — phiếu nhập TỪ NCC (`objectType SUPPLIER`) lấy bậc 1.
 *
 * Khuôn request: bước 4 (SP), 5 (bảng giá bán), 6 (NCC), 7 (gắn SP–NCC, HĐ, bảng giá mua), 04_3_010_016 (nhập kho).
 * 🔴 Mỗi bước kiểm "đã có" trước khi tạo — chạy lại 🚫 đẻ trùng (SP / NCC / HĐ không xoá được).
 */
const { test, expect } = require('@playwright/test');
const { moPhienApi } = require('../api');
const { PREFIX, PREFIX_MA, doc, ghi, lay } = require('../seed-state');

test.describe.configure({ mode: 'serial' });
const ds = (d) => (Array.isArray(d) ? d : d?.content || d?.items || d?.data || []);
const hai = (n) => String(n).padStart(2, '0');
const kg = () => doc().duLieu?.kyGui || {};
const ds_ = (d) => (Array.isArray(d) ? d : d?.content || d?.items || d?.data || []);

/** Ba SP ký gửi — `ncc`: NCC gắn SKU (null = cố ý KHÔNG gắn). */
const SP = [
  { khoa: 'conHieuLuc', ten: `${PREFIX}SP_KG`, sku: `${PREFIX}SKU_KG`, ncc: 'KG1' },
  { khoa: 'hetHieuLuc', ten: `${PREFIX}SP_KG_HH`, sku: `${PREFIX}SKU_KG_HH`, ncc: 'KG2' },
  { khoa: 'chuaGanNcc', ten: `${PREFIX}SP_KG_NONCC`, sku: `${PREFIX}SKU_KG_NONCC`, ncc: null },
  // 16_030_007 — nhập theo đường KHÔNG phải từ NCC, HĐ không có bảng giá, không giá danh mục ⇒ resolver trượt,
  // `StockOwnershipStamper` lùi về giá trên phiếu và để TRỐNG `price_source`:
  //   `chuaCoGia`  : phiếu không mang giá ⇒ đơn giá trống ⇒ nhãn ĐỎ "Chưa có giá — chặn chốt kỳ".
  //   `khongRoNguon`: phiếu mang giá ⇒ có giá, thiếu nguồn ⇒ nhãn VÀNG "Không rõ nguồn giá".
  { khoa: 'chuaCoGia', ten: `${PREFIX}SP_KG_CG`, sku: `${PREFIX}SKU_KG_CG`, ncc: 'KG3', khongBangGia: true, giaPhieu: null },
  { khoa: 'khongRoNguon', ten: `${PREFIX}SP_KG_KNG`, sku: `${PREFIX}SKU_KG_KNG`, ncc: 'KG4', khongBangGia: true, giaPhieu: 50000 },
];
const NCC = {
  KG1: { ma: `${PREFIX_MA}NCCKG1`, ten: `${PREFIX}NCC_KG1` }, KG2: { ma: `${PREFIX_MA}NCCKG2`, ten: `${PREFIX}NCC_KG2` },
  // 16_030_007: mỗi nhãn nguồn giá một NCC ⇒ một kỳ riêng, chốt thử kỳ này 🚫 đụng kỳ KG1 mà case khác còn dùng.
  KG3: { ma: `${PREFIX_MA}NCCKG3`, ten: `${PREFIX}NCC_KG3` }, KG4: { ma: `${PREFIX_MA}NCCKG4`, ten: `${PREFIX}NCC_KG4` },
};
const GIA_NHAP = 50000;
const GIA_BAN = 80000;
const SL_NHAP = 20;

async function traSku(goi, skus) {
  return (await goi('POST', '/chain/products/bulk-fields', { data: { skus, fields: ['vatPercent'], activeOnly: true } })) || {};
}
async function timNcc(goi, ten) {
  return ds(await goi('GET', '/chain-supplier', { params: { orgUnitType: 'TONG_CONG_TY', keyword: ten, page: 0, size: 20 } })).find((x) => x.name === ten);
}

test('seed 18.1 — hai nhà cung cấp ký gửi', async ({ page }) => {
  const { goi, headers } = await moPhienApi(page, 'tct');
  const tenNhom = lay('nhaCungCap', 'tenNhomNcc');
  const g = ds(await goi('GET', '/chain-supplier-groups', { params: { size: 100 } })).find((x) => x.name === tenNhom);
  expect(g, `Không thấy nhóm NCC "${tenNhom}" (bước 6)`).toBeTruthy();
  const tinh = (await goi('GET', '/region', { params: { parent_id: 100000 } }))?.[0];
  const xa = (await goi('GET', '/region', { params: { parent_id: tinh.dictItemId } }))?.[0];
  const ra = {};
  for (const [k, n] of Object.entries(NCC)) {
    let x = await timNcc(goi, n.ten);
    if (!x) {
      const dt = `09${String(Date.now()).slice(-8)}`;
      await goi('POST', '/chain-supplier', {
        data: {
          name: n.ten, code: n.ma, companyName: '', taxCode: '', orderOwnerName: n.ten, phone: dt, email: '', address: '',
          provinceId: tinh.dictItemId, provinceName: tinh.itemName, districtId: 0, districtName: '', wardId: xa.dictItemId, wardName: xa.itemName,
          bankId: null, bankAccount: '', bankAccountName: '', categories: [], supplierGroupId: g.id ?? g.supplierGroupId,
          shopIds: [headers.shopid ? Number(headers.shopid) : null], status: 1, note: 'AUTO TEST — NCC ký gửi (seed 18)',
          orderPhone: dt, orderEmail: '', minOrderQuantity: 0, tolerance: 0, complaintOwnerName: n.ten, complaintPhone: dt, complaintEmail: '',
        },
      });
      x = await timNcc(goi, n.ten);
    }
    expect(x?.supplierId, `Tạo NCC "${n.ten}" không ra supplierId`).toBeTruthy();
    ra[k] = { ...n, supplierId: x.supplierId };
  }
  ghi('kyGui', { ncc: ra });
});

test('seed 18.2 — ba sản phẩm ký gửi (distribution_method KY_GUI)', async ({ page }) => {
  const { goi, headers } = await moPhienApi(page, 'tct');
  const categoryId = lay('sanPham', 'idDanhMuc');
  const sp = {};
  for (const s of SP) {
    if (!(await traSku(goi, [s.sku]))[s.sku]) {
      await goi('POST', '/chain/products', {
        data: {
          productName: s.ten, sku: s.sku, barCode: s.sku, accountingCode: s.sku, deductibleTaxPercent: 0,
          unit: 'Cái', categoryId, categoryName: 'Sản phẩm', isTopping: false, distributionMethod: 'KY_GUI',
          goodsMaterialType: 'KHONG_PHAN_LOAI', isLoyalty: true, price: 0,
          shopId: headers.shopid ? Number(headers.shopid) : undefined, chainId: Number(headers.chainid),
          type: 0, isSell: 1, attributes: [], options: [], variants: [], productUnits: [], images: [], imageUrl: [],
          description: '', requireStock: true, quantityWarning: null, stockType: 'SPECIFIC_IDENTIFICATION', isSerialRequired: false,
          enableVat: true, vatPercent: 0, directTaxPercent: 0, pitTaxPercent: 0, specialProductCategory: null,
          isIngredient: false, clength: null, cwidth: null, cheight: null, active: true, status: 'KICH_HOAT',
          priceBeforeDiscount: 0, isComposite: false, secondaryBarCodes: [],
        },
      });
    }
    const t = (await traSku(goi, [s.sku]))[s.sku];
    expect(t?.productId, `Tạo xong mà không tra được SKU ${s.sku}`).toBeTruthy();
    sp[s.khoa] = { ten: s.ten, sku: s.sku, productId: t.productId, variantId: t.variantId, productUnitId: t.productUnitId, unit: t.unit, ncc: s.ncc, khongBangGia: Boolean(s.khongBangGia), giaPhieu: s.giaPhieu };
  }
  ghi('kyGui', { sanPham: sp });
});

test('seed 18.3 — gắn SKU vào NCC (trừ SP chưa gán NCC)', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const { ncc, sanPham } = kg();
  for (const s of Object.values(sanPham).filter((x) => x.ncc)) {
    await goi('POST', '/supplier-products/batch', {
      params: { supplierId: ncc[s.ncc].supplierId },
      data: { items: [{ productId: s.productId, variantId: s.variantId, sku: s.sku, productUnitId: s.productUnitId, productUnitName: s.unit, isDefault: true }] },
    });
  }
  ghi('kyGui', { daGanNcc: true });
});

test('seed 18.4 — hợp đồng ký gửi (duyệt ACTIVE) + bảng giá mua gắn hợp đồng (ban hành)', async ({ page }) => {
  const { goi, headers } = await moPhienApi(page, 'tct');
  const { ncc, sanPham, hopDong = {} } = kg();
  const tu = new Date(); tu.setHours(0, 0, 0, 0);
  const den = new Date(tu); den.setFullYear(den.getFullYear() + 1); den.setHours(23, 59, 59, 999);
  const t = new Date();
  const master = { headers: { shopid: String(headers.shopid) } };
  const ra = { ...hopDong };
  for (const k of Object.keys(ncc)) {
    if (ra[k]?.contractId && (ra[k]?.bangGia || ra[k]?.khongBangGia)) continue;
    const supplierId = ncc[k].supplierId;
    const soHd = `${PREFIX}HD_${k}`;
    // 🔴 HĐ có thể đã tạo ở lượt hỏng giữa chừng (chưa kịp ghi sổ) ⇒ tìm theo số HĐ trước, 🚫 POST lại (SSHOP-409).
    let contractId = ra[k]?.contractId
      ?? ds(await goi('GET', '/chain-supplier-contract', { params: { keyword: soHd, supplierId, page: 0, size: 20 } })).find((x) => x.contractCode === soHd)?.id;
    if (contractId && !ra[k]?.contractId) {
      const hd = ds(await goi('GET', '/chain-supplier-contract', { params: { keyword: soHd, supplierId, page: 0, size: 20 } })).find((x) => x.id === contractId);
      if (hd?.status !== 'ACTIVE') await goi('POST', `/chain-supplier-contract/${contractId}/status`, { params: { status: 'ACTIVE' } });
    }
    if (!contractId) {
      const d = await goi('POST', '/chain-supplier-contract', {
        data: {
          contractCode: soHd, supplierId, contractType: 'FRAMEWORK', effectiveFrom: tu.toISOString(), effectiveTo: den.toISOString(),
          totalValue: null, discountRate: null, creditLimit: null, paymentTermDays: null, maxReturnDays: 30,
          isConsignment: true, reconciliationCycle: 'MONTH', reconciliationAnchorDay: 1,
          salesBonusPolicy: null, defectReturnPolicy: null, note: 'AUTO TEST — HĐ ký gửi (seed 18)',
        },
      });
      contractId = typeof d === 'object' ? d?.id : d;
      expect(contractId, `Tạo HĐ ký gửi ${soHd} không trả id`).toBeTruthy();
      await goi('POST', `/chain-supplier-contract/${contractId}/status`, { params: { status: 'ACTIVE' } });
    }
    const sp = Object.values(sanPham).filter((x) => x.ncc === k && !x.khongBangGia);
    if (!sp.length) {
      ra[k] = { soHd, contractId, khongBangGia: true, trangThai: 'ACTIVE' };
      ghi('kyGui', { hopDong: ra });
      continue;
    }
    const tenBg = `${PREFIX}BGMUA_${k}`;
    let bg = ds(await goi('GET', '/supplier-price-lists', { ...master, params: { supplierId, page: 0, size: 20 } })).find((x) => x.name === tenBg);
    if (!bg) {
      await goi('POST', '/supplier-price-lists', {
        data: {
          scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: lay('toChuc', 'maXa'), shopId: null }],
          name: tenBg, supplierId: Number(supplierId),
          startDate: `${t.getFullYear()}-${hai(t.getMonth() + 1)}-${hai(t.getDate())} 00:00:00`, endDate: null,
          note: 'AUTO TEST — giá ký gửi (seed 18)', contractId, fileIds: [],
          items: sp.map((s) => ({ sku: s.sku, importPrice: GIA_NHAP, vatRate: 0, priceType: 'STANDARD', minQuantity: 1, maxQuantity: null, description: '' })),
        },
      });
      bg = ds(await goi('GET', '/supplier-price-lists', { ...master, params: { supplierId, page: 0, size: 20 } })).find((x) => x.name === tenBg);
      expect(bg, `Không thấy bảng giá mua "${tenBg}"`).toBeTruthy();
      await goi('POST', `/supplier-price-lists/${bg.id ?? bg.priceListId}/publish`);
    }
    ra[k] = { soHd, contractId, bangGia: tenBg, giaNhap: GIA_NHAP, trangThai: ra[k]?.trangThai || 'ACTIVE' };
    ghi('kyGui', { hopDong: ra });
  }
});

test('seed 18.5 — bảng giá bán cho ba SP ký gửi (phê duyệt)', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const { sanPham } = kg();
  const ten = `${PREFIX}BANGGIA_KG`;
  let bg = (await goi('GET', '/chain-price-list/get-all', { params: { page: 0, size: 10, name: ten } }) || []).find((x) => x.name === ten);
  if (!bg) {
    const d = new Date();
    await goi('POST', '/chain-price-list/create', {
      data: {
        name: ten, versionName: `${PREFIX}PB_KG`, startDate: `${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`, endDate: null,
        startTime: null, endTime: null, status: 1, includeTax: 1, priceListScopeMode: 'REGION', scopeType: 3,
        scopes: [{ scopeType: 'BUU_DIEN_XA', orgUnitCode: lay('toChuc', 'maXa') }],
        items: Object.values(sanPham).filter((s) => !s.khongBangGia).map((s) => ({ sku: s.sku, unitPrice: GIA_BAN, listedPrice: GIA_BAN, discountRate: 0 })),
      },
    });
    bg = (await goi('GET', '/chain-price-list/get-all', { params: { page: 0, size: 10, name: ten } }) || []).find((x) => x.name === ten);
    expect(bg?.priceListId, `Không thấy bảng giá bán "${ten}"`).toBeTruthy();
    await goi('PUT', '/chain-price-list/approve', { params: { priceListId: bg.priceListId } });
  }
  ghi('kyGui', { bangGiaBan: { ten, priceListId: bg.priceListId, giaBan: GIA_BAN } });
});

test('seed 18.6 — nhập hàng ký gửi vào điểm bán seed', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'seed_gdv');
  const { ncc, sanPham, tonKho = {} } = kg();
  const shopId = Number(lay('diemBan', 'shopId'));
  const kho = ds(await goi('GET', `/shops/${shopId}/inventory`));
  const khoId = (kho.find((x) => x.isDefault || x.defaultInventory) || kho[0])?.id;
  expect(khoId, 'Điểm bán seed không có kho').toBeTruthy();
  const ngay = new Date().toISOString().slice(0, 10);
  const ra = { ...tonKho };
  for (const s of Object.values(sanPham)) {
    if (ra[s.sku]?.stockInOutId) continue;
    // SP có NCC: nhập TỪ NCC (bậc giá 1 = bảng giá gắn HĐ). SP chưa gán NCC: nhập thường (không có NCC để khai).
    const tuNcc = Boolean(s.ncc) && !s.khongBangGia;
    const gia = s.khongBangGia ? s.giaPhieu : GIA_NHAP;
    const lo = `${PREFIX_MA}KG${s.sku.slice(-4)}`;
    const d = await goi('POST', '/stock/v3/import-export', {
      params: { shopId },
      data: {
        code: `NK${PREFIX_MA}KG${Date.now().toString(36).slice(-4).toUpperCase()}`, objectId: tuNcc ? Number(ncc[s.ncc].supplierId) : 0,
        objectType: tuNcc ? 'SUPPLIER' : 'SHOP', discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
        note: 'AUTO TEST — nhập hàng ký gửi (seed 18)', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
        items: [{ amount: gia, price: gia, productId: s.productId, productName: s.ten, batchCode: null,
          batchProducts: [{ batchCode: lo, quantity: SL_NHAP, manufactureDate: ngay, expiryDate: '2028-12-31', serials: [] }],
          quantity: SL_NHAP, serials: [], totalAmount: gia == null ? null : gia * SL_NHAP, unit: s.unit, variantId: s.variantId, variantName: null, itemId: null,
          shopId, inventoryId: khoId, productUnit: s.unit, convertToMainUnit: 1, productUnitId: s.productUnitId }],
      },
    });
    const id = d?.stockInOutId ?? d?.id;
    expect(id, `Nhập ${s.sku} không trả stockInOutId: ${JSON.stringify(d).slice(0, 300)}`).toBeTruthy();
    await goi('POST', '/stock/v3/import-export/confirm', { params: { shopId, stockInOutId: id } });
    ra[s.sku] = { stockInOutId: id, soLuong: SL_NHAP, lo, tuNcc, giaPhieu: gia };
    ghi('kyGui', { tonKho: ra });
  }
});

test('seed 18.7 — HUỶ hợp đồng ký gửi của NCC KG2 (SP_KG_HH thành hàng hết hợp đồng)', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const { hopDong } = kg();
  if (hopDong.KG2.trangThai !== 'CANCELLED') {
    await goi('POST', `/chain-supplier-contract/${hopDong.KG2.contractId}/status`, { params: { status: 'CANCELLED' } });
  }
  ghi('kyGui', { hopDong: { ...hopDong, KG2: { ...hopDong.KG2, trangThai: 'CANCELLED' } }, xong: true });
});

/**
 * 🔴 Đo 28/09: HĐ bị huỷ thì bậc giá HĐ mất ⇒ bán `SP_KG_HH` bị chặn SỚM bằng CONSIGN-001 ("Chưa khai giá ký gửi"),
 *    🚫 tới được CONSIGN-005. Luật chặn HĐ (`assertContractActive`) sinh ra để bịt đúng lỗ "SKU có `mac_price` ở danh mục
 *    (bậc 2 SKU_MASTER) nên vẫn resolve được giá" ⇒ khai giá vốn danh mục cho SP hết HĐ + SP chưa gán NCC
 *    (SP chưa gán NCC cũng cần giá để đi tới bước treo công nợ CONSIGN-002).
 */
test('seed 18.8 — khai giá vốn danh mục (bậc 2) cho SP hết hợp đồng + SP chưa gán NCC', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const { sanPham } = kg();
  const sp = [sanPham.hetHieuLuc, sanPham.chuaGanNcc];
  await goi('PUT', '/chain/products/standard-declared-prices', {
    data: { items: sp.map((s) => ({ productId: s.productId, units: [{ productUnitId: s.productUnitId, macPrice: GIA_NHAP }] })) },
  });
  ghi('kyGui', { giaDanhMuc: Object.fromEntries(sp.map((s) => [s.sku, GIA_NHAP])) });
});

/** 16_030_007 · 16_060_022 — sinh kỳ đối soát (idempotent, cùng việc job định kỳ làm) rồi ghi id kỳ hiện hành của từng NCC. */
test('seed 18.9 — sinh kỳ đối soát cho các NCC ký gửi', async ({ page }) => {
  const { goi } = await moPhienApi(page, 'tct');
  const { ncc } = kg();
  const kq = await goi('POST', '/consignment-recon/periods/generate');
  const homNay = new Date(); homNay.setHours(12, 0, 0, 0);
  const ds = ds_(await goi('GET', '/consignment-recon/periods', { params: { page: 0, size: 500 } }));
  const ky = {};
  for (const [k, n] of Object.entries(ncc)) {
    const cua = ds.filter((p) => Number(p.chainSupplierId ?? p.supplierId) === Number(n.supplierId));
    const hienHanh = cua.find((p) => new Date(p.periodFrom) <= homNay && homNay <= new Date(new Date(p.periodTo).getTime() + 86_400_000));
    ky[k] = { soKy: cua.length, hienHanh: hienHanh ? { id: hienHanh.id, tu: hienHanh.periodFrom, den: hienHanh.periodTo, status: hienHanh.status } : null };
  }
  expect(ky.KG3?.hienHanh?.id, `Không sinh được kỳ hiện hành cho NCC KG3: ${JSON.stringify({ kq, ky })}`).toBeTruthy();
  expect(ky.KG4?.hienHanh?.id, `Không sinh được kỳ hiện hành cho NCC KG4: ${JSON.stringify({ kq, ky })}`).toBeTruthy();
  ghi('kyGui', { kyDoiSoat: ky });
});

/**
 * 🔴 Đo 28/09: biên bản kỳ đối soát (`/consignment-recon/periods/{id}/summary`) chỉ đọc chứng từ ở POD của `shopId`
 *    trên header. Màn đối soát CHỈ vai TCT mở được, header TCT = shop master (pod 1) ⇒ hàng ký gửi ở điểm bán làn
 *    (pod 2) KHÔNG vào biên bản nào trên giao diện (ghi `_VUONG_MAC.md` B15). Để 16_030_007 đọc được nhãn nguồn giá,
 *    nhập 2 SP `chuaCoGia` / `khongRoNguon` vào KHO CỦA TCT (shop master, pod 1) — chỉ SKU riêng của làn.
 */
test('seed 18.10 — nhập 2 SP nguồn giá vào kho TCT (pod của biên bản TCT)', async ({ page }) => {
  const { goi, headers } = await moPhienApi(page, 'tct');
  const { sanPham, tonKhoTct = {} } = kg();
  const shopId = Number(headers.shopid);
  const kho = ds(await goi('GET', `/shops/${shopId}/inventory`));
  const khoId = (kho.find((x) => x.isDefault || x.defaultInventory) || kho[0])?.id;
  expect(khoId, `Shop master TCT ${shopId} không có kho`).toBeTruthy();
  const ngay = new Date().toISOString().slice(0, 10);
  const ra = { ...tonKhoTct };
  for (const s of [sanPham.chuaCoGia, sanPham.khongRoNguon]) {
    if (ra[s.sku]?.stockInOutId) continue;
    const gia = s.giaPhieu;
    const d = await goi('POST', '/stock/v3/import-export', {
      params: { shopId },
      data: {
        code: `NK${PREFIX_MA}KT${Date.now().toString(36).slice(-4).toUpperCase()}`, objectId: 0, objectType: 'SHOP',
        discountAmount: 0, discountPercentage: '0.00', imageIds: [], paidAmount: 0,
        note: 'AUTO TEST — hàng ký gửi thiếu nguồn giá (seed 18.10)', actionTime: Date.now(), type: 'IMPORT', subType: 'IMPORT', enableVat: false,
        items: [{ amount: gia, price: gia, productId: s.productId, productName: s.ten, batchCode: null,
          batchProducts: [{ batchCode: `${PREFIX_MA}KT${s.sku.slice(-3)}`, quantity: 5, manufactureDate: ngay, expiryDate: '2028-12-31', serials: [] }],
          quantity: 5, serials: [], totalAmount: gia == null ? null : gia * 5, unit: s.unit, variantId: s.variantId, variantName: null, itemId: null,
          shopId, inventoryId: khoId, productUnit: s.unit, convertToMainUnit: 1, productUnitId: s.productUnitId }],
      },
    });
    const id = d?.stockInOutId ?? d?.id;
    expect(id, `Nhập ${s.sku} vào kho TCT không trả stockInOutId: ${JSON.stringify(d).slice(0, 300)}`).toBeTruthy();
    await goi('POST', '/stock/v3/import-export/confirm', { params: { shopId, stockInOutId: id } });
    ra[s.sku] = { shopId, stockInOutId: id, soLuong: 5, giaPhieu: gia };
    ghi('kyGui', { tonKhoTct: ra });
  }
});
