# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 07_4 — Cấu hình vận hành

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 07_4_van_hanh`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `07_4_van_hanh`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **20** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **20** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 32 |
| — **tài liệu gốc KHÔNG có** | 12 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 12 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `07_4_010_001` | Nhóm Nhận đặt hàng trước mở được trên một biểu mẫu | HDSD 010 |
| `07_4_010_002` | Chặn lưu khi bỏ trống Tên cấu hình | HDSD 010 |
| `07_4_010_003` | Chặn lưu khi chưa chọn phạm vi áp dụng | HDSD 010 |
| `07_4_010_004` | Ô Mô tả giới hạn 200 ký tự và có bộ đếm | HDSD 010 |
| `07_4_020_002` | Số khoảng tiền trên bảng khớp số khoảng đã khai trong chi tiết | HDSD 020 |
| `07_4_030_001` | Tìm loại thông báo theo tính năng | HDSD 030 |
| `07_4_030_002` | Không tìm thấy thì báo đúng thông điệp | HDSD 030 |
| `07_4_030_003` | Mã loại thông báo không sửa được khi xem loại đã có | HDSD 030 |
| `07_4_040_001` | Bảng Hòm mail nhận hoá đơn NCC hiện đủ cột | HDSD 040 |
| `07_4_040_002` | Cột Máy chủ ghép đúng định dạng máy chủ cổng giao thức | HDSD 040 |
| `07_4_040_003` | Kiểm tra kết nối hòm mail trả kết quả rõ ràng | HDSD 040 |
| `07_4_PQ_001` | Vai Bưu điện Tỉnh vào được Hòm mail nhưng không vào được Hạn mức duyệt | HDSD |

## 5. Bảng đối chiếu đầy đủ 20 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_366` | Kiểm tra giao diện màn Cấu hình hạn mức duyệt | `07_4_020_001` |
| `FUNC_1_367` | Kiểm tra on/off cấu hình | `07_4_020_003` |
| `FUNC_1_368` | Kiểm tra chỉnh sửa cấu hình | `07_4_020_004` |
| `FUNC_1_369` | Kiểm tra giao diện | `07_4_050_001` |
| `FUNC_1_370` | Tạo hạn mức duyệt thành công với 1 khoảng tiền | `07_4_050_002` |
| `FUNC_1_371` | Tạo nhiều khoảng tiền thành công | `07_4_050_003` |
| `FUNC_1_372` | Một khoảng tiền có nhiều bước duyệt | `07_4_050_004` |
| `FUNC_1_373` | Mỗi bước duyệt gán 1 role | `07_4_050_005` |
| `FUNC_1_374` | Kiểm tra danh sách cấp tổ chức | `07_4_050_006` |
| `FUNC_1_375` | Nhập khoảng Min<Max | `07_4_050_007` |
| `FUNC_1_376` | Nhập khoảng Min>=Max | `07_4_050_008` |
| `FUNC_1_377` | Kiểm tra giao thoa khoảng tiền | `07_4_050_009` |
| `FUNC_1_378` | Phiếu không thuộc khoảng tiền đã cấu hình | `07_4_050_010` |
| `FUNC_1_379` | Luồng duyệt nhiều bước | `07_4_050_011` |
| `FUNC_1_380` | Kiểm tra thứ tự duyệt | `07_4_050_012` |
| `FUNC_1_381` | Kiểm tra bước 2 được phép duyệt sau khi bước 1 hoàn thành | `07_4_050_013` |
| `FUNC_1_382` | Từ chối tại bước 1 | `07_4_050_014` |
| `FUNC_1_383` | Từ chối với phiếu đề xuất không có quyền duyệt | `07_4_050_015` |
| `FUNC_1_384` | Kiểm tra xoá bước duyệt | `07_4_050_016` |
| `FUNC_1_385` | Kiểm tra xoá khoảng tiền | `07_4_050_017` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 20/20 case gốc (trước đó 1), 13 → 32 case._

### 6.1 🔴 Năm câu hỏi đều dẫn tới PHIẾU TREO

Sheet QC mô tả khá đầy đủ luồng phê duyệt nhiều bước, nhưng **không câu nào nói phiếu đang dở sẽ ra
sao** khi cấu hình đổi. Năm chỗ:

1. `FUNC_1_367` tắt cấu hình — phiếu thuộc khoảng tiền đó duyệt thẳng hay kẹt?
2. `FUNC_1_368` sửa cấu hình — phiếu đang chờ đi luồng nào?
3. `FUNC_1_377` khoảng tiền giao thoa — hệ thống cho lưu hay chặn lúc lưu?
4. `FUNC_1_378` phiếu ngoài mọi khoảng — kẹt hay duyệt thẳng?
5. `FUNC_1_384` xoá bước duyệt — phiếu đang chờ ở bước đó đi đâu?

Đã ghi rõ từng câu vào kỳ vọng và để `BLOCKED`. 🚫 Không đoán, vì mỗi câu là một cách làm phiếu treo
vĩnh viễn.

### 6.2 Min < Max: hai màn không nhất quán

`FUNC_1_376` đòi lỗi *"Min phải nhỏ hơn Max"* cho khoảng tiền duyệt — và code **có** phép kiểm này.
Trong khi phân hệ `04_1` (ngưỡng cảnh báo tồn kho Min/Max) **không có** phép kiểm nào tương tự
(`04_1_020_022`). Cùng một loại ràng buộc, hai màn làm khác nhau. Nên báo một lần cho cả hai.

### 6.3 `FUNC_1_380` là case kiểm soát, 🚫 đừng bỏ

*"Kiểm tra thứ tự duyệt → Không nhìn thấy phiếu cần duyệt"*: vai của **bước 2** không được thấy phiếu
khi bước 1 chưa xong. Nếu thấy được thì duyệt vượt cấp. Đây là case **kiểm soát nội bộ**, quan trọng
hơn các case giao diện trong cùng nhóm.

### 6.4 Sheet có lỗi chính tả ở kỳ vọng

`FUNC_1_383`: *"Báo không có duyển từ chối"*. Đã viết lại thành *"báo không có quyền từ chối"* theo
nghiệp vụ và ghi rõ trong `test-cases.md`.

### 6.5 Thiếu tài khoản nền cho 4 case luồng duyệt

`07_4_050_012`–`015` cần tài khoản **đúng vai của bước 1**, **đúng vai bước 2**, và một vai **ngoài
luồng duyệt**. `.env.accounts` hiện chưa có. Không có ba tài khoản này thì phần kiểm soát thứ tự duyệt
và quyền từ chối **không test được** — 🚫 không hạ xuống thành case giao diện.
