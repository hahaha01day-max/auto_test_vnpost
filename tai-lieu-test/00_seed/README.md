# 00_seed — sinh dữ liệu nền cho auto test

🔴 **Mặc định seed bằng API** (`--api`, thư mục `api-tests/`, đổi 23/09/2026): cả 8 bước ~2 phút,
không flaky. Bản lái giao diện (`tests/`) giữ lại để tham chiếu — đo 23/09 nó **âm thầm thiếu side-effect**
(điểm bán tạo qua giao diện có 1 ca, 0 quầy; bản API có 2 ca + quầy như FE thật gửi).

```bash
node tool/bin/seed.js --api            # seed bằng API
VNPOST_LANE=3 node tool/bin/seed.js --api --so
```

Luật của bản API (`00_seed/api.js`):
- Đăng nhập qua FE bằng `dangNhapVai`, rồi **bắt header của request MỚI NHẤT** (token đổi sau bước chọn phạm vi).
- Gọi **đúng chuỗi request FE gửi**, kể cả request phụ sau khi tạo (vd tạo điểm bán → 2 ca + quầy).
  Cái làm mất side-effect là SQL, 🚫 không phải API.
- 🔴 Payload phải đối chiếu với **request thật của FE** (bắt bằng `page.route` rồi `abort` — không tạo gì),
  🚫 đừng chỉ suy từ đọc JSX: đọc code đoán `roles[]` có 6 trường, thật ra FE gửi 3, gửi thừa là `SSHOP-402`.
- Test xanh chưa đủ — đối chiếu bản ghi trong DB (nhớ điểm bán có thể nằm ở `VNPOST_POD_02/03`).

### Payload SP biến thể / đơn vị quy đổi (bắt từ FE 23/09/2026, bước 4.3)

| Dạng | Cấp sản phẩm | `options` | `variants[]` | `productUnits[]` |
|---|---|---|---|---|
| Biến thể + quy đổi | 🚫 không sku/barCode | `[{name, value[], _default:[], images:[]}]` | `{name:"Màu: Đỏ", sku, barCode (BẮT BUỘC), macPriceProduct:0, index, productUnitVariants:[{sku, barCode:"", price:0, unit}]}` | `{exchangeValue, price:0, unit, unitConvertTo}` |
| Chỉ quy đổi | sku + barCode | `[]` | `[]` | `{sku, barCode, exchangeValue, price:0, unit, unitConvertTo}` |
| Chỉ biến thể | 🚫 không sku/barCode | như trên | như trên, `productUnitVariants: []` | `[]` |

DB lưu (`CHAIN_PRODUCT_UNIT`): mỗi biến thể một dòng theo đơn vị gốc (`convert_to_main_unit=1`) + một dòng mỗi
đơn vị quy đổi (`convert_to_main_unit=<hệ số>`). Tra SKU đơn vị quy đổi bằng `POST /chain/products/bulk-fields`,
🚫 `basic-search-product-unit?barCode=` (barcode đơn vị quy đổi rỗng ⇒ tra không ra).

## Bản lái giao diện (cũ)

Tạo dữ liệu **qua giao diện FE** bằng Playwright.

```bash
cd vnpost-web && pnpm start --port 3200      # FE phải đang chạy (xem bẫy 1)
cd auto_test_vnpost
node tool/bin/seed.js --so                   # xem đã seed tới đâu
node tool/bin/seed.js                        # chạy các bước còn thiếu
node tool/bin/seed.js --buoc=2               # chạy đúng một bước
```

## Vì sao qua FE

Tạo bằng SQL/API là **mất side-effect mà chỉ tầng trên mới làm**. Đo thật: tạo điểm bán qua màn
hình thì hệ thống tự sinh luôn bản ghi `ORGANIZATION_UNIT_SHOP` (ánh xạ đơn vị ↔ điểm bán, do
`OrganizationUnitServiceImpl.assignShopToOrgUnit` ghi) **và tự tạo kho** trong `SHOP_INVENTORY`.
Thiếu kho thì mọi case kho phía sau vẫn skip — đúng thứ đang đi chữa.

## Thứ tự các bước — 🚫 không đảo

| Bước | Nội dung | Khoá trong sổ |
|--:|---|---|
| 1 | Đơn vị tổ chức: Bưu điện Tỉnh → Bưu điện Xã | `toChuc` |
| 2 | Điểm bán dưới xã (**kho tự sinh**, không có bước tạo kho) | `diemBan` |
| 3 | Vai trò và nhân viên | `nhanSu` |
| 4 | Danh mục, sản phẩm, đơn vị tính / SKU | `sanPham` |
| 5 | Bảng giá bán | `bangGiaBan` |
| 6 | Nhà cung cấp | `nhaCungCap` |
| 7 | Sản phẩm NCC và bảng giá mua | `sanPhamNcc` |
| 8 | Nhập kho — sinh tồn thật | `tonKho` |
| 9 | Kho phụ của điểm bán seed (vai `shop`) | `khoPhu` |
| 10 | Sản phẩm sản xuất: tick "Là nguyên liệu sản xuất" cho SP giá tiêu chuẩn, tạo SP sản xuất có công thức + SP sản xuất quản lý serial; ghi sổ 1 SP chế biến cũ KHÔNG công thức (FE không cho tạo) | `sanPhamSanXuat` |

| 11 | Ca `AUTO8_CA_DAI` 05:00–23:45 + lịch 90 ngày cho GDV/CHT điểm bán seed (vai `shop`) — tiền đề MỞ CA bán hàng | `caLamViec` |

| 15 (API, 26/09) | Combo `AUTO<làn>_SP_COMBO2` = FIFO + BT Xanh, bảng giá RIÊNG `AUTO<làn>_BG_COMBO2` 150.000đ; + combo `…_SP_COMBO` (TC + FIFO) làm bằng chứng lỗi giá vốn tiêu chuẩn — chạy `-g "seed 15"` bằng `playwright.api.config.js` | `combo`, `comboLoiTieuChuan` |

| 18 (API, 28/09) | **Hàng ký gửi** (`canSeed: "ky-gui"`): 2 NCC mới `AUTO<làn>_NCC_KG1/KG2` (1 NCC chỉ được 1 HĐ ACTIVE cùng lúc — NCC làn đã có HĐ mua đứt) · 3 SP `distribution_method = KY_GUI`, giá vốn **đích danh** (BE bắt buộc): `SP_KG` (NCC KG1, HĐ ký gửi còn hiệu lực) · `SP_KG_HH` (NCC KG2, HĐ bị HUỶ ở 18.7) · `SP_KG_NONCC` (không gán NCC) · HĐ `FRAMEWORK` + `isConsignment` + kỳ đối soát MONTH + `maxReturnDays` · bảng giá mua gắn HĐ · bảng giá bán `AUTO<làn>_BANGGIA_KG` 80.000đ · nhập 20 cái mỗi SP (SP có NCC nhập TỪ NCC) · 18.8 khai giá vốn danh mục cho `SP_KG_HH` + `SP_KG_NONCC` (thiếu thì bán bị chặn sớm bằng CONSIGN-001) · 18.9 sinh kỳ đối soát (idempotent) · NCC `KG3`/`KG4` + SP `SP_KG_CG` (nhập không giá ⇒ đơn giá 0) / `SP_KG_KNG` (giá trên phiếu, thiếu nguồn) cho 16_030_007 — 18.10 nhập 2 SP này vào **kho TCT** vì biên bản TCT chỉ đọc pod 1 (điểm bán làn ở pod 2, xem `_VUONG_MAC.md` B15). Chạy `node tool/bin/seed.js --api --buoc=18` | `kyGui` |

| 19 (28/09) | **PO riêng của làn** (`canSeed: "po-rieng"`): lái giao diện khuôn `13_3/tests/po-ghi.js` (vai `tct`) — PO kho TCT · NCC + HĐ của làn · SP giá tiêu chuẩn × 3 → Gửi NCC → NCC xác nhận → Nhập kho đủ. Giữ sẵn **3 PO trống**; case lấy PO bằng `layPoTrong(maCase)` của `00_seed/po-rieng.js` (đánh dấu `dungBoi` ngay) — 🔴 upload HĐ khớp là TỰ hạch toán, mỗi case TIÊU 1 PO; chạy lại bước này để bù. Chạy `node tool/bin/seed.js --api --buoc=19` | `poRieng` |

🔴 Combo có thành phần giá vốn TIÊU CHUẨN không thanh toán được (lỗi BE `CheckoutOrder.java` ~1070) ⇒ combo dùng cho case chỉ gồm FIFO/MAC.
🔴 Chạy lẻ bước 9/10/11 phải `--no-deps` (không thì chạy lại bước 1–7 của vai tct, đẻ dữ liệu trùng).

🚫 **Không seed chương trình khuyến mại** (user chốt 22/09/2026) — 49 case `tenCTKM` ở
`11_khuyen_mai` chấp nhận để skip.

🔴 **Bảng giá bán bắt buộc phải có**, dù chỉ 4 case khai khoá tên bảng giá. Nó là ràng buộc nền:
sản phẩm không nằm trong bảng giá còn hiệu lực tại điểm bán thì 🚫 không thêm được vào bill
(`10_130_003`, `18_1_020_021`) — thiếu nó thì cụm POS ~358 case không bán được hàng seed, và
bước nhập kho thành vô dụng.

Mỗi bước ghi kết quả vào `seed-state.json`; bước sau đọc bằng `lay('<nhóm>', '<khoá>')` và **ném lỗi
nếu thiếu**, 🚫 không chạy tiếp với dữ liệu rỗng.

## 🔴 Bẫy đã trả giá — đọc trước khi sửa

1. **FE dev không nghe cổng 3200.** Biến `PORT` bị rsbuild bỏ qua; không có cờ `--port` thì nó nhảy
   sang cổng khác và **mọi test skip sạch** với lý do trông như lỗi môi trường. Dùng
   `pnpm start --port 3200`.
2. **`rtk` nuốt artifact.** Chạy `npx playwright test` qua hook rtk thì hook thay reporter bằng bản
   rút gọn, **không sinh `results.json` lẫn `playwright-report/`**. Phải `rtk proxy npx playwright …`.
3. **placeholder của antd Select là `<span>`**, không phải thuộc tính `placeholder` của `<input>` ⇒
   `getByPlaceholder('Chọn đơn vị cha')` không bao giờ khớp.
4. **`getByText` trúng `<span aria-live="assertive">`** mà antd chèn cho screen-reader — phần tử ẩn,
   click treo 20s ở *"element is not visible"*.
5. **Ô "Đơn vị cha" là TreeSelect**, item là `.ant-select-tree-node-content-wrapper`, 🚫 không có
   `.ant-select-item-option`. Lọc theo `title` = `"<mã> - <tên>"`.
6. **Dropdown tỉnh/xã cuộn ảo** ⇒ phải **gõ để lọc**, 🚫 không cuộn tìm: mục chưa render thì locator
   không thấy dù dữ liệu có thật.
7. **`page.goto` trần bị đá về `/account`** khi phiên hết hạn giữa hai test. Dùng
   `moTrang(page, url, vai)` — tự đăng nhập lại đúng vai.
8. **Mã đơn vị con phải mở đầu bằng mã đơn vị cha THẤP NHẤT** (bưu điện xã, không phải tỉnh).
   Sai thì FE validate chặn trước, POST còn không được gửi — triệu chứng là bấm Xác nhận xong
   không có request nào.
9. **Cấp Tỉnh + phân loại Hub bị backend trả SSHOP-500** (đo 17/09/2026). Dùng cấp Xã + Pos mini.
10. **Chọn đúng đơn vị đã seed, 🚫 không lấy `.first()`** — lấy bừa là điểm bán rơi vào nhánh cây
    của người khác, mọi bước sau đo sai phạm vi.

## 🚫 Không xoá được

Màn điểm bán, nhân viên, đơn vị tổ chức **không có chức năng xoá**. Bản ghi seed ở lại hệ thống
vĩnh viễn ⇒ mỗi lượt seed tạo **đúng một** bộ. `seed.js` mặc định bỏ qua bước đã có trong sổ;
`--lam-lai` là cố ý đẻ bộ mới.

Nhận diện dữ liệu seed: tiền tố `AUTO_` (đổi bằng `VNPOST_SEED_PREFIX`) + hậu tố lượt chạy.

## Thêm một bước mới

1. Viết `tests/<NN>-<ten>.<vai>.spec.js`, title test bắt đầu bằng `seed <NN>.<n> — …`.
2. Đọc dữ liệu bước trước bằng `lay()`, ghi kết quả bằng `ghi()` — cả hai ở `../seed-state`.
3. Khai bước vào mảng `BUOC` trong `tool/bin/seed.js`.
4. Chạy `node tool/bin/seed.js --buoc=<NN>` và **kiểm lại trong DB** trước khi sang bước sau.
