# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 13_1 — Phiếu đề xuất đặt hàng và phê duyệt

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 13_1_phieu_de_xuat_va_phe_duyet`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `13_1_phieu_de_xuat_va_phe_duyet`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **60** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **53** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **7** |
| Case đã dựng trong `test-cases.csv` | 55 |
| — **tài liệu gốc KHÔNG có** | 2 |

**Độ phủ tài liệu gốc: 88%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 7 case

🔴 **Đây là việc phải làm.** Mỗi dòng là một case sheet QC có mà kịch bản còn thiếu.

| Mã gốc | Nhóm | Tình huống | Kết quả mong muốn (rút gọn) |
|---|---|---|---|
| `FUNC_1_300` | Tổng hợp phiếu đề xuất đặt hàng | Kiểm tra hiển thị màn hình | 1. Hiển thị đầy đủ đúng logo, tiêu đề, các button: - Có nút "Xác nhận gửi" nút "Hủy", nút "X(Đóng)" - Hiển thị |
| `FUNC_1_301` | Tổng hợp phiếu đề xuất đặt hàng | Kiểm tra Tạo phiếu Gửi lên tổng công ty | - Hiển thị Gửi thành công! |
| `FUNC_1_302` | Tổng hợp phiếu đề xuất đặt hàng | Kiểm tra để trống điểm bán nhận hàng | Hiển thị ' Vui lòng chọn điểm bán' |
| `FUNC_1_303` | Tổng hợp phiếu đề xuất đặt hàng | Kiểm tra danh sách điểm bán nhận hàng | Danh sách hiển thị là danh sách các HUB của tỉnh đang truy cập |
| `FUNC_1_304` | Tổng hợp phiếu đề xuất đặt hàng | Kiểm tra để trống mã phiếu đề xuất TCT | Sinh mã tự động cho phiếu |
| `FUNC_1_305` | Tổng hợp phiếu đề xuất đặt hàng | Kiểm tra nút Huỷ | Không gửi phiếu lên TCT, trạng thái phiếu không đổi |
| `FUNC_1_306` | Tổng hợp phiếu đề xuất đặt hàng | Kiểm tra Xem chi tiết phiếu đề xuất | Hiển thị đủ toàn bộ thông tin chung, danh sách sản phẩm, số lượng đề xuất, số lượng đã xác nhận và số lượng đã |

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 2 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `13_1_030_001` | Tạo phiếu đề xuất - mở form và validate rỗng | HDSD 030 |
| `13_1_040_002` | Xem chi tiết phiếu đề xuất khi có dữ liệu | HDSD 040 |

## 5. Bảng đối chiếu đầy đủ 60 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_227` | Kiểm tra hiển thị màn hình | `13_1_040_001` |
| `FUNC_1_228` | Kiểm tra tìm kiếm theo Mã phiếu | `13_1_040_003` |
| `FUNC_1_229` | Kiểm tra lọc theo Trạng thái | `13_1_040_004` |
| `FUNC_1_230` | Kiểm tra tìm Lọc theo Khoảng thời gian (Từ ngày - Đến ngày) | `13_1_040_005` |
| `FUNC_1_231` | Kiểm tra Lọc theo Điểm bán / kho cụ thể | `13_1_040_006` |
| `FUNC_1_232` | Kiểm tra Kết hợp nhiều bộ lọc cùng lúc | `13_1_040_007` |
| `FUNC_1_233` | Kiểm tra Xoá lọc | `13_1_040_008` |
| `FUNC_1_234` | Kiểm tra Tìm kiếm với từ khóa không tồn tại | `13_1_040_009` |
| `FUNC_1_235` | Kiểm tra hiển thị tổng số phiếu | `13_1_040_010` |
| `FUNC_1_236` | Kiểm tra sắp xếp (nếu có click tiêu đề cột) | `13_1_040_011` |
| `FUNC_1_237` | Kiểm tra Nút làm mới | `13_1_040_012` |
| `FUNC_1_238` | Kiểm tra Nút Phóng to/ Thu nhỏ màn hình | `13_1_040_013` |
| `FUNC_1_239` | Kiểm tra Nút tách, gộp, chỉnh sửa | `13_1_040_014` |
| `FUNC_1_240` | Kiểm tra hiển thị màn hình | `13_1_030_002` |
| `FUNC_1_241` | Kiểm tra Tạo phiếu đề xuất đặt hàng nháp | `13_1_030_003` |
| `FUNC_1_242` | Kiểm tra Tạo phiếu đề xuất đặt hàng | `13_1_030_004` |
| `FUNC_1_243` | Kiểm tra Nút " Huỷ" | `13_1_030_005` |
| `FUNC_1_244` | Kiểm tra Bỏ trống trường bắt buộc | `13_1_030_006` |
| `FUNC_1_245` | Kiểm tra Mã phiếu tự sinh | `13_1_030_007` |
| `FUNC_1_246` | Kiểm tra Sửa Mã phiếu tự sinh | `13_1_030_008` |
| `FUNC_1_247` | Kiểm tra Chọn điểm bán | `13_1_030_009` |
| `FUNC_1_248` | Kiểm tra hiển thị màn hình | `13_1_050_001` |
| `FUNC_1_249` | Kiểm tra Tìm kiếm Tỉnh, Xã, Kho/ Điểm bán | `13_1_050_002` |
| `FUNC_1_250` | Kiểm tra hiển thị màn hình | `13_1_060_001` |
| `FUNC_1_251` | Kiểm tra Sửa phiếu đề xuất đặt hàng nháp | `13_1_060_002` |
| `FUNC_1_252` | Kiểm tra Sửa phiếu đề xuất đặt hàng trạng thái chờ duyệt | `13_1_060_003` |
| `FUNC_1_253` | Kiểm tra Nút " Huỷ" | `13_1_060_004` |
| `FUNC_1_254` | Kiểm tra Bỏ trống trường bắt buộc | `13_1_060_005` |
| `FUNC_1_255` | Kiểm tra Sửa Mã phiếu tự sinh | `13_1_060_006` |
| `FUNC_1_256` | Kiểm tra Chọn điểm bán | `13_1_060_007` |
| `FUNC_1_257` | Kiểm tra hiển thị màn hình | `13_1_070_001` |
| `FUNC_1_258` | Kiểm tra Gộp phiếu đề xuất nhập hàng | `13_1_070_002` |
| `FUNC_1_259` | Kiểm tra Gộp phiếu các phiếu khác vào phiếu đã gộp | `13_1_070_003` |
| `FUNC_1_260` | Kiểm tra nút Huỷ | `13_1_070_004` |
| `FUNC_1_261` | Kiểm tra nút Xoá phiếu khi có 2 phiếu | `13_1_070_005` |
| `FUNC_1_262` | Kiểm tra nút Xoá phiếu khi có nhiều hơn 2 phiếu | `13_1_070_006` |
| `FUNC_1_265` | Kiểm tra hiển thị màn hình | `13_1_080_001` |
| `FUNC_1_266` | Kiểm tra Tách phiếu đề xuất nhập hàng nháp | `13_1_080_002` |
| `FUNC_1_267` | Kiểm tra Tách phiếu đề xuất nhập hàng | `13_1_080_003` |
| `FUNC_1_268` | Kiểm tra nút tách thêm phiếu | `13_1_080_004` |
| `FUNC_1_269` | Kiểm tra nút Huỷ | `13_1_080_005` |
| `FUNC_1_270` | Kiểm tra nút Xoá phiếu khi có 2 phiếu | `13_1_080_006` |
| `FUNC_1_271` | Kiểm tra nút Xoá phiếu khi có nhiều hơn 2 phiếu | `13_1_080_007` |
| `FUNC_1_272` | Kiểm tra chỉnh sửa thông tin phiếu | `13_1_080_008` |
| `FUNC_1_273` | Kiểm tra tự đồng điền số lượng còn lại vào phiếu bên cạnh | `13_1_080_009` |
| `FUNC_1_274` | Kiểm tra vai trò Giám đốc xã duyệt tất cả số lượng trong phiếu đề xuất đặt hàng | `13_1_090_001` |
| `FUNC_1_275` | Kiểm tra vai trò Giám đốc xã duyệt một phần số lượng trong phiếu đề xuất đặt hàng | `13_1_090_002` |
| `FUNC_1_276` | Kiểm tra vai trò Giám đốc xã huỷ phiếu | `13_1_090_003` |
| `FUNC_1_277` | Kiểm tra vai trò Giám đốc xã huỷ phiếu bỏ trống trường lí do | `13_1_090_004` |
| `FUNC_1_278` | Kiểm tra cấp Tỉnh gửi phiếu lên cấp TCT | `13_1_090_005` |
| `FUNC_1_279` | Kiểm tra cấu hình hạn mức một bước duyệt | `13_1_090_006` |
| `FUNC_1_280` | Kiểm tra cấu hình hạn mức nhiều bước duyệt, bước 1 đồng ý phiếu | `13_1_090_007` |
| `FUNC_1_281` | Kiểm tra cấu hình hạn mức nhiều bước duyệt, bước 1 từ chối phiếu | `13_1_090_008` |
| `FUNC_1_300` | Kiểm tra hiển thị màn hình | — **chưa dựng** |
| `FUNC_1_301` | Kiểm tra Tạo phiếu Gửi lên tổng công ty | — **chưa dựng** |
| `FUNC_1_302` | Kiểm tra để trống điểm bán nhận hàng | — **chưa dựng** |
| `FUNC_1_303` | Kiểm tra danh sách điểm bán nhận hàng | — **chưa dựng** |
| `FUNC_1_304` | Kiểm tra để trống mã phiếu đề xuất TCT | — **chưa dựng** |
| `FUNC_1_305` | Kiểm tra nút Huỷ | — **chưa dựng** |
| `FUNC_1_306` | Kiểm tra Xem chi tiết phiếu đề xuất | — **chưa dựng** |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 53/60 case gốc (trước đó 1), 3 → 55 case._

### 6.1 🔴 Bảy case còn ở mục 3 là BẢN TRÙNG — đã dựng ở phân hệ `13_3`

`FUNC_1_300`–`306` (nhóm *"Tổng hợp phiếu đề xuất đặt hàng"*) **trùng y hệt** `FUNC_1_293`–`299`
(nhóm *"Gửi TCT"*) trong cùng file `uat_vnpost_quan_ly_kho.csv`:

| Bản trùng (→ `13_1`) | Bản gốc (→ `13_3`) | Nội dung |
|---|---|---|
| `FUNC_1_300` | `FUNC_1_293` | Kiểm tra hiển thị màn hình |
| `FUNC_1_301` | `FUNC_1_294` | Kiểm tra Tạo phiếu Gửi lên tổng công ty |
| `FUNC_1_302` | `FUNC_1_295` | Kiểm tra để trống điểm bán nhận hàng |
| `FUNC_1_303` | `FUNC_1_296` | Kiểm tra danh sách điểm bán nhận hàng |
| `FUNC_1_304` | `FUNC_1_297` | Kiểm tra để trống mã phiếu đề xuất TCT |
| `FUNC_1_305` | `FUNC_1_298` | Kiểm tra nút Huỷ |
| `FUNC_1_306` | `FUNC_1_299` | Kiểm tra Xem chi tiết phiếu đề xuất |

🔴 Hai nhóm này **ánh xạ về hai phân hệ khác nhau** (`13_1` và `13_3`) nên công cụ tính độ phủ **theo
từng phân hệ** vẫn báo 7 case "chưa dựng" ở đây. Đã xử lý bằng cách gắn **cả hai mã** vào 7 case ở
`13_3` (cột `Ma goc` = `FUNC_1_293;FUNC_1_300`…) và ghi lý do vào đây — đúng điều kiện "xong" số 1
của bàn giao: *mục 3 rỗng, hoặc mỗi case còn lại có lý do ghi trong nhận xét tay*.

🚫 **Không dựng lại 7 case này ở `13_1`** — luật 2: dựng thêm bản trùng là chạy hai lần cùng một thao
tác ghi, làm độ phủ ảo.

⚠️ Lưu ý cho lần sau: `checklist.js` **đã trừ** bản trùng nên báo `✅ 0`, còn mục 3 của
`doi-chieu-goc.js` **không trừ**. Hai con số lệch nhau là do vậy, không phải do thiếu case.

### 6.2 Gộp / tách là chốt chặn chống mất hàng

Task `070` (gộp, 6 case) và `080` (tách, 9 case): tổng số lượng sau thao tác phải **bằng** trước.
Nối với `13_2` (lịch sử gộp/tách) để tra ngược. 🔴 Hụt số lượng ở đây là **mất hàng trên giấy tờ**
trước khi kịp mất hàng thật.

### 6.3 Bốn bẫy repo áp trực tiếp

- **`builder()` làm mất `enableVat`** — phiếu đề xuất dựng bằng builder ra sai VAT.
- **`shopId` là MÃ, không phải số** — bộ chọn điểm bán task `050`.
- **Callback TCT→tỉnh so pod SAI** — phê duyệt task `090` có thể không ăn.
- **Thiếu filter phạm vi ⇒ trả TOÀN BỘ pod** (không phải rỗng) — danh sách task `040`.
