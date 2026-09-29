# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 13_3 — Đặt hàng nhà cung cấp và nhập hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 13_3_dat_hang_va_nhap_hang`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `13_3_dat_hang_va_nhap_hang`
- Tài liệu gốc liên quan: [`uat_vnpost_nha_cung_cap.csv`](../test-case-goc/uat_vnpost_nha_cung_cap.csv) · [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **98** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **98** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 98 |
| — **tài liệu gốc KHÔNG có** | 0 |

**Độ phủ tài liệu gốc: 100%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `NCC_130` | `FUNC_1_307` | Kiểm tra giao diện |
| `NCC_131` | `FUNC_1_308` | Tạo phiếu đặt hàng NCC |
| `NCC_132` | `FUNC_1_309` | Tạo phiếu đặt hàng NCC nháp |
| `NCC_133` | `FUNC_1_310` | Chỉnh sửa phiếu đặt hàng nháp |
| `NCC_134` | `FUNC_1_311` | Huỷ phiếu đặt hàng nháp |
| `NCC_135` | `FUNC_1_312` | Xem chi tiết phiếu đặt hàng |
| `NCC_136` | `FUNC_1_313` | Huỷ phiếu đặt hàng NCC chưa xác nhận |
| `NCC_137` | `FUNC_1_314` | Kiểm tra in phiếu đặt hàng |
| `NCC_138` | `FUNC_1_315` | Kiểm tra xác nhận phiếu đặt hàng |
| `NCC_139` | `FUNC_1_316` | Kiểm tra nhập kho từ phiếu đặt hàng NCC |
| `NCC_140` | `FUNC_1_317` | Kiểm tra nhập kho từ mã phiếu PO |
| `NCC_141` | `FUNC_1_318` | Kiểm tra không cho sửa PO NCC xác nhận |
| `NCC_142` | `FUNC_1_319` | Kiểm tra tìm kiếm mã phiếu |
| `NCC_143` | `FUNC_1_320` | Kiểm tra tìm kiếm ghi chú |
| `NCC_144` | `FUNC_1_321` | Kiểm tra bộ lọc theo trạng thái |
| `NCC_145` | `FUNC_1_322` | Kiểm tra bộ lọc PO theo NCC |
| `NCC_146` | `FUNC_1_323` | Kiểm tra lọc PO theo khoảng thời gian |
| `NCC_147` | `FUNC_1_324` | Kiểm tra Xoá bộ lọc |
| `NCC_148` | `FUNC_1_325` | Kiểm tra phân trang |
| `NCC_149` | `FUNC_1_326` | Kiểm tra đặt hàng nhà cung cấp với sản phẩm có phân loại |
| `NCC_150` | `FUNC_1_327` | Kiểm tra nhận hàng số lượng khác dung sai |
| `NCC_151` | `FUNC_1_328` | Kiểm tra chỉnh sửa giá sản phẩm |
| `NCC_152` | `FUNC_1_329` | Kiểm tra đặt hàng nhà cung cấp với giá gốc, giá khuyến mãi, tặng hàng theo bảng giá NCC |
| `NCC_153` | `FUNC_1_330` | Tạo phiếu đặt hàng NCC tại cấp Tỉnh |
| `NCC_154` | `FUNC_1_331` | Phiếu đặt hàng sản phẩm tự doanh của tỉnh không hiển thị ở TCT |
| `NCC_155` | `FUNC_1_332` | Kiểm tra cấp tỉnh chỉ được đặt hàng sản phẩm tự doanh |
| `NCC_156` | `FUNC_1_333` | Kiểm tra không cho đặt hàng khi sản phẩm chưa có bảng giá map với NCC |
| `NCC_157` | `FUNC_1_334` | Kiểm tra xuất trả hàng toàn phần NCC |
| `NCC_158` | `FUNC_1_335` | Kiểm tra xuất trả hàng nhiều lần trong 1 đơn PO cho NCC |
| `NCC_159` | `FUNC_1_336` | Kiểm tra công nợ giữ TCT và NCC |
| `NCC_160` | `FUNC_1_337` | Kiểm tra giao diện |
| `NCC_161` | `FUNC_1_338` | Kiểm tra tìm kiểm theo mã PO |
| `NCC_162` | `FUNC_1_339` | Kiểm tra bộ lọc trạng thái phiếu |
| `NCC_163` | `FUNC_1_340` | Kiểm tra xem chi tiết phiếu PO |
| `NCC_164` | `FUNC_1_341` | Kiểm tra xác nhận phiếu đặt hàng |
| `NCC_165` | `FUNC_1_342` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm MAC |
| `NCC_166` | `FUNC_1_343` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm FIFO |
| `NCC_167` | `FUNC_1_344` | Kiểm tra xác nhận nhận hàng 1 phần |
| `NCC_168` | `FUNC_1_345` | Kiểm tra ghi nhận công nợ nội bộ giữa TCT và tỉnh |
| `NCC_169` | `FUNC_1_346` | Kiểm tra không hiển thị phiếu tỉnh tự đặt hàng NCC |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 0 case

Không có.

## 5. Bảng đối chiếu đầy đủ 98 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `NCC_130` | Kiểm tra giao diện | `13_3_030_001` |
| `NCC_131` | Tạo phiếu đặt hàng NCC | `13_3_010_001` |
| `NCC_132` | Tạo phiếu đặt hàng NCC nháp | `13_3_030_003` |
| `NCC_133` | Chỉnh sửa phiếu đặt hàng nháp | `13_3_030_004` |
| `NCC_134` | Huỷ phiếu đặt hàng nháp | `13_3_030_005` |
| `NCC_135` | Xem chi tiết phiếu đặt hàng | `13_3_030_002` |
| `NCC_136` | Huỷ phiếu đặt hàng NCC chưa xác nhận | `13_3_030_006` |
| `NCC_137` | Kiểm tra in phiếu đặt hàng | `13_3_030_007` |
| `NCC_138` | Kiểm tra xác nhận phiếu đặt hàng | `13_3_030_008` |
| `NCC_139` | Kiểm tra nhập kho từ phiếu đặt hàng NCC | `13_3_030_009` |
| `NCC_140` | Kiểm tra nhập kho từ mã phiếu PO | `13_3_030_010` |
| `NCC_141` | Kiểm tra không cho sửa PO NCC xác nhận | `13_3_030_011` |
| `NCC_142` | Kiểm tra tìm kiếm mã phiếu | `13_3_030_012` |
| `NCC_143` | Kiểm tra tìm kiếm ghi chú | `13_3_030_013` |
| `NCC_144` | Kiểm tra bộ lọc theo trạng thái | `13_3_030_014` |
| `NCC_145` | Kiểm tra bộ lọc PO theo NCC | `13_3_030_015` |
| `NCC_146` | Kiểm tra lọc PO theo khoảng thời gian | `13_3_030_016` |
| `NCC_147` | Kiểm tra Xoá bộ lọc | `13_3_030_017` |
| `NCC_148` | Kiểm tra phân trang | `13_3_030_018` |
| `NCC_149` | Kiểm tra đặt hàng nhà cung cấp với sản phẩm có phân loại | `13_3_030_019` |
| `NCC_150` | Kiểm tra nhận hàng số lượng khác dung sai | `13_3_030_020` |
| `NCC_151` | Kiểm tra chỉnh sửa giá sản phẩm | `13_3_030_021` |
| `NCC_152` | Kiểm tra đặt hàng nhà cung cấp với giá gốc, giá khuyến mãi, tặng hàng theo bảng giá NCC | `13_3_030_022` |
| `NCC_153` | Tạo phiếu đặt hàng NCC tại cấp Tỉnh | `13_3_030_023` |
| `NCC_154` | Phiếu đặt hàng sản phẩm tự doanh của tỉnh không hiển thị ở TCT | `13_3_030_024` |
| `NCC_155` | Kiểm tra cấp tỉnh chỉ được đặt hàng sản phẩm tự doanh | `13_3_030_025` |
| `NCC_156` | Kiểm tra không cho đặt hàng khi sản phẩm chưa có bảng giá map với NCC | `13_3_030_026` |
| `NCC_157` | Kiểm tra xuất trả hàng toàn phần NCC | `13_3_030_027` |
| `NCC_158` | Kiểm tra xuất trả hàng nhiều lần trong 1 đơn PO cho NCC | `13_3_030_028` |
| `NCC_159` | Kiểm tra công nợ giữ TCT và NCC | `13_3_030_029` |
| `NCC_160` | Kiểm tra giao diện | `13_3_040_001` |
| `NCC_161` | Kiểm tra tìm kiểm theo mã PO | `13_3_040_002` |
| `NCC_162` | Kiểm tra bộ lọc trạng thái phiếu | `13_3_040_003` |
| `NCC_163` | Kiểm tra xem chi tiết phiếu PO | `13_3_040_004` |
| `NCC_164` | Kiểm tra xác nhận phiếu đặt hàng | `13_3_040_005` |
| `NCC_165` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm MAC | `13_3_040_006` |
| `NCC_166` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm FIFO | `13_3_040_007` |
| `NCC_167` | Kiểm tra xác nhận nhận hàng 1 phần | `13_3_040_008` |
| `NCC_168` | Kiểm tra ghi nhận công nợ nội bộ giữa TCT và tỉnh | `13_3_040_009` |
| `NCC_169` | Kiểm tra không hiển thị phiếu tỉnh tự đặt hàng NCC | `13_3_040_010` |
| `FUNC_1_282` | Kiểm tra hiển thị màn hình với tạo phiếu đặt hàng trạng thái chờ duyệt | `13_3_010_002` |
| `FUNC_1_283` | Kiểm tra Tạo phiếu đặt hàng NCC | `13_3_010_003` |
| `FUNC_1_284` | Kiểm tra để trống danh sách sản phẩm | `13_3_010_004` |
| `FUNC_1_285` | Kiểm tra chọn nhà cung cấp không cung cấp sản phẩm trong danh sách sản phẩm | `13_3_010_005` |
| `FUNC_1_286` | Kiểm tra loại loại bỏ sản phẩm không thuộc nhà cung cấp | `13_3_010_006` |
| `FUNC_1_287` | Kiểm tra Bỏ trống trường bắt buộc | `13_3_010_007` |
| `FUNC_1_288` | Kiểm tra chỉnh sửa thông tin phiếu | `13_3_010_008` |
| `FUNC_1_289` | Kiểm tra lưu nháp phiếu | `13_3_010_009` |
| `FUNC_1_290` | Kiểm tra nút huỷ | `13_3_010_010` |
| `FUNC_1_291` | Kiểm tra lưu phiếu | `13_3_010_011` |
| `FUNC_1_292` | Kiểm tra danh sách phiếu đề xuất sau tạo đơn | `13_3_010_012` |
| `FUNC_1_293` | Kiểm tra hiển thị màn hình | `13_3_050_001` |
| `FUNC_1_294` | Kiểm tra Tạo phiếu Gửi lên tổng công ty | `13_3_050_002` |
| `FUNC_1_295` | Kiểm tra để trống điểm bán nhận hàng | `13_3_050_003` |
| `FUNC_1_296` | Kiểm tra danh sách điểm bán nhận hàng | `13_3_050_004` |
| `FUNC_1_297` | Kiểm tra để trống mã phiếu đề xuất TCT | `13_3_050_005` |
| `FUNC_1_298` | Kiểm tra nút Huỷ | `13_3_050_006` |
| `FUNC_1_299` | Kiểm tra Xem chi tiết phiếu đề xuất | `13_3_050_007` |
| `FUNC_1_307` | Kiểm tra giao diện | `13_3_030_030` |
| `FUNC_1_308` | Tạo phiếu đặt hàng NCC | `13_3_030_031` |
| `FUNC_1_309` | Tạo phiếu đặt hàng NCC nháp | `13_3_030_032` |
| `FUNC_1_310` | Chỉnh sửa phiếu đặt hàng nháp | `13_3_030_033` |
| `FUNC_1_311` | Huỷ phiếu đặt hàng nháp | `13_3_030_034` |
| `FUNC_1_312` | Xem chi tiết phiếu đặt hàng | `13_3_030_035` |
| `FUNC_1_313` | Huỷ phiếu đặt hàng NCC chưa xác nhận | `13_3_030_036` |
| `FUNC_1_314` | Kiểm tra in phiếu đặt hàng | `13_3_030_037` |
| `FUNC_1_315` | Kiểm tra xác nhận phiếu đặt hàng | `13_3_030_038` |
| `FUNC_1_316` | Kiểm tra nhập kho từ phiếu đặt hàng NCC | `13_3_030_039` |
| `FUNC_1_317` | Kiểm tra nhập kho từ mã phiếu PO | `13_3_030_040` |
| `FUNC_1_318` | Kiểm tra không cho sửa PO NCC xác nhận | `13_3_030_041` |
| `FUNC_1_319` | Kiểm tra tìm kiếm mã phiếu | `13_3_030_042` |
| `FUNC_1_320` | Kiểm tra tìm kiếm ghi chú | `13_3_030_043` |
| `FUNC_1_321` | Kiểm tra bộ lọc theo trạng thái | `13_3_030_044` |
| `FUNC_1_322` | Kiểm tra bộ lọc PO theo NCC | `13_3_030_045` |
| `FUNC_1_323` | Kiểm tra lọc PO theo khoảng thời gian | `13_3_030_046` |
| `FUNC_1_324` | Kiểm tra Xoá bộ lọc | `13_3_030_047` |
| `FUNC_1_325` | Kiểm tra phân trang | `13_3_030_048` |
| `FUNC_1_326` | Kiểm tra đặt hàng nhà cung cấp với sản phẩm có phân loại | `13_3_030_049` |
| `FUNC_1_327` | Kiểm tra nhận hàng số lượng khác dung sai | `13_3_030_050` |
| `FUNC_1_328` | Kiểm tra chỉnh sửa giá sản phẩm | `13_3_030_051` |
| `FUNC_1_329` | Kiểm tra đặt hàng nhà cung cấp với giá gốc, giá khuyến mãi, tặng hàng theo bảng giá NCC | `13_3_030_052` |
| `FUNC_1_330` | Tạo phiếu đặt hàng NCC tại cấp Tỉnh | `13_3_030_053` |
| `FUNC_1_331` | Phiếu đặt hàng sản phẩm tự doanh của tỉnh không hiển thị ở TCT | `13_3_030_054` |
| `FUNC_1_332` | Kiểm tra cấp tỉnh chỉ được đặt hàng sản phẩm tự doanh | `13_3_030_055` |
| `FUNC_1_333` | Kiểm tra không cho đặt hàng khi sản phẩm chưa có bảng giá map với NCC | `13_3_030_056` |
| `FUNC_1_334` | Kiểm tra xuất trả hàng toàn phần NCC | `13_3_030_057` |
| `FUNC_1_335` | Kiểm tra xuất trả hàng nhiều lần trong 1 đơn PO cho NCC | `13_3_030_058` |
| `FUNC_1_336` | Kiểm tra công nợ giữ TCT và NCC | `13_3_030_059` |
| `FUNC_1_337` | Kiểm tra giao diện | `13_3_040_011` |
| `FUNC_1_338` | Kiểm tra tìm kiểm theo mã PO | `13_3_040_012` |
| `FUNC_1_339` | Kiểm tra bộ lọc trạng thái phiếu | `13_3_040_013` |
| `FUNC_1_340` | Kiểm tra xem chi tiết phiếu PO | `13_3_040_014` |
| `FUNC_1_341` | Kiểm tra xác nhận phiếu đặt hàng | `13_3_040_015` |
| `FUNC_1_342` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm MAC | `13_3_040_016` |
| `FUNC_1_343` | Kiểm tra xác nhận phiếu đặt hàng sản phẩm FIFO | `13_3_040_017` |
| `FUNC_1_344` | Kiểm tra xác nhận nhận hàng 1 phần | `13_3_040_018` |
| `FUNC_1_345` | Kiểm tra ghi nhận công nợ nội bộ giữa TCT và tỉnh | `13_3_040_019` |
| `FUNC_1_346` | Kiểm tra không hiển thị phiếu tỉnh tự đặt hàng NCC | `13_3_040_020` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 98/98 case gốc (trước đó 3), 3 → 98 case._

### 6.1 Bảy case mang HAI mã gốc — bản trùng của `13_1`

`FUNC_1_293`–`299` (nhóm *Gửi TCT*) trùng y hệt `FUNC_1_300`–`306` (nhóm *Tổng hợp phiếu đề xuất đặt
hàng*, ánh xạ về `13_1`). Đã gắn **cả hai mã** vào cột `Ma goc` của 7 case ở đây và ghi lý do ở
`13_1`. 🚫 Không dựng lại bên `13_1`.

### 6.2 Ràng buộc quan trọng nhất KHÔNG nằm trong phân hệ này

Đặt hàng NCC chịu bốn ràng buộc từ **hợp đồng NCC** (`12_4` task `080`): chiết khấu % · **hạn mức
công nợ** · hạn thanh toán · thời hạn được trả hàng. 🔴 Đặt hàng **vượt hạn mức công nợ phải bị
chặn** — nếu không thì hạn mức trong hợp đồng là vô nghĩa.

⇒ Khi viết script nhóm `030`, phải đọc hợp đồng NCC trước để biết hạn mức, 🚫 không giả định.

### 6.3 Nhập hàng chạm ba nơi cùng lúc

Một lượt nhập hàng từ NCC ghi vào: **tồn kho** (`04_3`) · **công nợ NCC** (`12_3`) · **trạng thái PO**
(phân hệ này). Nhận giao **một phần** thì công nợ ghi **theo phần đã nhận** (`NCC_106`).
🔴 Đối chiếu phải làm ở cả ba chỗ — kiểm một chỗ rồi kết luận là bỏ lọt.

### 6.4 Nhóm `050` Gửi TCT là luồng cross-pod, có hai bẫy đã gặp

- **Event cross-pod phải mang `sku`/`unitId`** — thiếu thì bên nhận không dựng lại được dòng hàng.
- **Forward vào controller công khai ⇒ 401** — triệu chứng là "gửi TCT không có phản hồi".

Thêm một bẫy nữa cho nhóm `040`: **PO giao thẳng chưa atomic**
(`direct_receive_serial_atomicity`) — nhận giao thẳng có thể ghi nửa vời.
