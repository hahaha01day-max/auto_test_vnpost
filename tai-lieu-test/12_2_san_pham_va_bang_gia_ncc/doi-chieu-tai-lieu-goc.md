# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 12_2 — Sản phẩm và bảng giá nhà cung cấp

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 12_2_san_pham_va_bang_gia_ncc`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `12_2_san_pham_va_bang_gia_ncc`
- Tài liệu gốc liên quan: [`uat_vnpost_nha_cung_cap.csv`](../test-case-goc/uat_vnpost_nha_cung_cap.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **50** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **50** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 50 |
| — **tài liệu gốc KHÔNG có** | 1 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 1 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `12_2_040_001` | Mở Bảng giá NCC khi có dữ liệu | HDSD 040 |

## 5. Bảng đối chiếu đầy đủ 50 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `NCC_26` | Kiểm tra hiển thị màn hình | `12_2_010_001` |
| `NCC_27` | Kiểm tra danh sách sản phẩm | `12_2_010_001` |
| `NCC_28` | Kiểm tra xem lịch sử giá của sản phẩm | `12_2_010_002` |
| `NCC_29` | Kiểm tra ghi nhận lịch sử giá của sản phẩm | `12_2_010_003` |
| `NCC_30` | Kiểm tra xác nhận xoá sản phẩm | `12_2_010_004` |
| `NCC_31` | Kiểm tra huỷ xoá sản phẩm | `12_2_010_005` |
| `NCC_32` | Kiểm tra hiển thị màn hình | `12_2_020_001` |
| `NCC_33` | Kiểm tra Thêm / Cập nhật sản phẩm NCC | `12_2_020_002` |
| `NCC_34` | Kiểm tra Tìm kiếm sản phẩm bằng tên sản phẩm | `12_2_020_003` |
| `NCC_35` | Kiểm tra Tìm kiếm sản phẩm bằng mã SKU | `12_2_020_004` |
| `NCC_36` | Kiểm tra Tìm kiếm sản phẩm bằng mã Barcode | `12_2_020_005` |
| `NCC_37` | Kiểm tra ghi nhận thông tin từ file excel tải lên | `12_2_020_006` |
| `NCC_38` | Kiểm tra thêm sản phầm từ file excel | `12_2_020_007` |
| `NCC_39` | Kiểm tra tải về file excel mẫu | `12_2_020_008` |
| `NCC_40` | Upload file chứa SKU đã mapping | `12_2_020_009` |
| `NCC_41` | Upload file chứa SKU chưa mapping | `12_2_020_010` |
| `NCC_42` | Upload file chứa SKU chưa khai báo | `12_2_020_011` |
| `NCC_43` | Xác nhận import khi có SKU hợp lệ | `12_2_020_012` |
| `NCC_44` | Xác nhận khi không có dữ liệu hợp lệ | `12_2_020_013` |
| `NCC_45` | Upload file chứa SKU có mã trùng nhau | `12_2_020_014` |
| `NCC_46` | Kiểm tra xoá sản phẩm trong danh sách | `12_2_020_015` |
| `NCC_47` | Kiểm tra ghi nhận thông tin từ file excel tải lên | `12_2_020_016` |
| `NCC_48` | Mapping đúng SKU chưa liên kết NCC | `12_2_020_017` |
| `NCC_49` | Mapping đúng SKU đã liên kết NCC | `12_2_020_018` |
| `NCC_50` | Kiểm tra giá nhập bằng 0 | `12_2_020_019` |
| `NCC_51` | Kiểm tra giá nhập âm | `12_2_020_020` |
| `NCC_52` | Kiểm tra VAT = 0% | `12_2_020_021` |
| `NCC_53` | Kiểm tra VAT = 100% | `12_2_020_022` |
| `NCC_54` | Kiểm tra VAT âm | `12_2_020_023` |
| `NCC_55` | Kiểm tra giá nhập có số lẻ | `12_2_020_024` |
| `NCC_56` | Kiểm tra loại giá "Giá gốc" | `12_2_020_025` |
| `NCC_57` | Kiểm tra SL tối thiểu = 0 | `12_2_020_026` |
| `NCC_58` | Kiểm tra SL tối thiểu âm | `12_2_020_027` |
| `NCC_59` | Kiểm tra SL tặng âm | `12_2_020_028` |
| `NCC_60` | Xác nhận import thành công | `12_2_020_029` |
| `NCC_61` | Xác nhận khi tồn tại dòng lỗi | `12_2_020_030` |
| `NCC_62` | Kiểm tra hiển thị màn hình | `12_2_040_002` |
| `NCC_63` | Kiểm tra hiển thị màn hình Tạo bảng giá mới | `12_2_040_003` |
| `NCC_64` | Kiểm tra danh sách bảng giá tổng công ty | `12_2_040_004` |
| `NCC_65` | Kiểm tra Tạo bảng giá nháp | `12_2_040_005` |
| `NCC_66` | Kiểm tra Ban hành bảng giá nháp | `12_2_040_006` |
| `NCC_67` | Kiểm tra Import Excel sản phẩm với phiếu bảng giá nháp | `12_2_040_007` |
| `NCC_68` | Kiểm tra Import Excel sản phẩm khi tạo bảng giá | `12_2_040_008` |
| `NCC_69` | Kiểm tra thêm sản phẩm loại giá gốc | `12_2_040_009` |
| `NCC_70` | Kiểm tra thêm sản phẩm loại giá khuyến mại | `12_2_040_010` |
| `NCC_71` | Kiểm tra thêm sản phẩm loại giá tặng hàng | `12_2_040_011` |
| `NCC_72` | Kiểm tra Huỷ bảng giá | `12_2_040_012` |
| `NCC_73` | Kiểm tra Xem chi tiết bảng giá | `12_2_040_013` |
| `NCC_74` | Kiểm tra Lọc bảng giá | `12_2_040_014` |
| `NCC_75` | Kiểm tra hết hạn bảng giá | `12_2_040_015` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 50/50 case gốc (trước đó 2), 2 → 50 case._

### 6.1 Sheet này có bộ BIÊN GIÁ TRỊ đầy đủ nhất trong 19 sheet

`NCC_50`–`NCC_59` kiểm: giá nhập **0** · giá nhập **âm** · giá nhập **số lẻ** · VAT **0%** ·
VAT **100%** · VAT **âm** · SL tối thiểu **0** · SL tối thiểu **âm** · SL tặng **âm** · loại giá
*"Giá gốc"*. Đã giữ nguyên từng case — 🚫 không gộp, vì gộp thì không biết ô nào hỏng (luật kỹ thuật 1
và 3 của mục 3.4).

### 6.2 Bốn trạng thái SKU khi import là gốc của lỗi hàng loạt

`NCC_40`–`NCC_49`: SKU **đã mapping** NCC · **chưa mapping** · **chưa khai báo** trong hệ thống ·
**trùng nhau trong cùng file**; cộng hai case xác nhận import khi *có* và *không có* dòng hợp lệ.
🔴 Cùng câu hỏi với `08_060_023` và `10_090_010`: **nhận phần hợp lệ hay từ chối cả file**. Nên trả
lời một lần cho cả ba phân hệ.

### 6.3 Bảng giá NHÁP vs ĐÃ BAN HÀNH

`NCC_65` (tạo nháp) và `NCC_66` (ban hành) cho thấy có hai mốc. 🔴 Bảng giá nháp **chưa áp giá nhập**;
mọi case đối chiếu giá vốn phải nói rõ đang ở mốc nào — giống bẫy *phiếu nháp không ghi tồn* ở
`04_3_020_002`.

### 6.4 Lịch sử giá là bằng chứng kế toán

`NCC_28` `NCC_29` (xem và **ghi nhận** lịch sử giá): sửa giá phải **sinh dòng mới**. 🚫 Ghi đè dòng cũ
là xoá bằng chứng — cùng nguyên tắc với sổ công nợ ở `12_3`.
