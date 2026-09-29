# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 04_2 — Khai báo tồn kho đầu kỳ

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 04_2_ton_kho_dau_ky`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `04_2_ton_kho_dau_ky`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **25** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **25** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 36 |
| — **tài liệu gốc KHÔNG có** | 11 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 11 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `04_2_020_006` | Bỏ trống mã điểm bán thì ghi vào điểm bán đang chọn | HDSD 020 |
| `04_2_020_007` | Số serial phải bằng số lượng quy về đơn vị chính | HDSD 020 |
| `04_2_020_024` | Còn dòng lỗi thì không tạo được phiếu | Quét kỹ thuật 3.4 #1 — trace pages/warehouse/opening_balance/DrawerOpeningBalance.jsx |
| `04_2_020_025` | Bản xem trước chưa ở trạng thái chờ xác nhận thì không tạo được phiếu | Quét kỹ thuật 3.4 #6 — trace pages/warehouse/opening_balance/DrawerOpeningBalance.jsx |
| `04_2_020_026` | Huỷ hộp thoại xác nhận tạo phiếu thì không ghi gì | Quét kỹ thuật 3.4 #9 — trace pages/warehouse/opening_balance/DrawerOpeningBalance.jsx |
| `04_2_030_001` | Lọc danh sách lượt khai báo theo kho hoặc điểm bán | HDSD 030 |
| `04_2_030_002` | Tìm lượt khai báo theo mã preview hoặc tên file | HDSD 030 |
| `04_2_030_004` | Mở lại chi tiết một lượt khai báo | HDSD 030 |
| `04_2_030_005` | Sáu trạng thái lượt khai báo trong bộ lọc | Quét kỹ thuật 3.4 #7 — trace pages/warehouse/opening_balance/OpeningBalancePage.jsx |
| `04_2_030_006` | Bảng danh sách lượt khai báo có đủ 11 cột | Quét kỹ thuật 3.4 #7 — trace pages/warehouse/opening_balance/OpeningBalancePage.jsx |
| `04_2_PQ_001` | Vai Bưu điện Tỉnh xem được lượt khai báo của điểm bán trực thuộc | HDSD |

## 5. Bảng đối chiếu đầy đủ 25 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_98` | Kiểm tra giao diện | `04_2_010_001` |
| `FUNC_1_99` | Kiểm tra Tải file mẫu Excel | `04_2_010_002` |
| `FUNC_1_100` | Kiểm tra upload file excel | `04_2_020_001` |
| `FUNC_1_101` | Kiểm tra Chỉ được khai báo tồn đầu kỳ các sản phẩm chưa khai báo | `04_2_020_009` |
| `FUNC_1_102` | Kiểm tra Hiển thị trạng thái đã khai báo | `04_2_010_003` |
| `FUNC_1_103` | Kiểm tra dữ liệu upload file excel | `04_2_020_002` |
| `FUNC_1_104` | Kiểm tra upload mã SKU không tồn tại | `04_2_020_010` |
| `FUNC_1_105` | Kiểm tra upload mã SKU tồn tại đã có sản phảm tồn kho | `04_2_020_011` |
| `FUNC_1_106` | Kiểm tra để trống mã SKU trong file excel | `04_2_020_003` |
| `FUNC_1_107` | Kiểm tra xoá dòng SKU lỗi | `04_2_020_012` |
| `FUNC_1_108` | Kiểm tra Mã lô hợp lệ | `04_2_020_013` |
| `FUNC_1_109` | Kiểm tra Mã lô đã tồn tại | `04_2_020_014` |
| `FUNC_1_110` | Kiểm tra số lượng bằng 0 | `04_2_020_004` |
| `FUNC_1_111` | Kiểm tra giá vốn âm | `04_2_020_005` |
| `FUNC_1_112` | Kiểm tra updaload file sai định dạng | `04_2_020_015` |
| `FUNC_1_113` | Kiểm tra upload file rỗng | `04_2_020_016` |
| `FUNC_1_114` | Kiểm tra tìm kiếm mã SKU, tên, lô | `04_2_020_017` |
| `FUNC_1_115` | Kiểm tra bộ lọc trạng thái | `04_2_020_018` |
| `FUNC_1_116` | Kiểm tra button tải lại | `04_2_020_019` |
| `FUNC_1_117` | Kiểm tra tải lên file excel mới | `04_2_020_020` |
| `FUNC_1_118` | Kiểm tra phân trang | `04_2_020_021` |
| `FUNC_1_119` | Kiểm tra tải lên file excel nhưng chưa xác nhận nhập kho | `04_2_030_003` |
| `FUNC_1_120` | Kiểm tra lịch sử nhập kho sau khi tạo phiếu | `04_2_020_008` |
| `FUNC_1_121` | Kiểm tra upload file Excel khai báo tồn kho đầu kỳ cho sản phẩm chưa khai báo | `04_2_020_022` |
| `FUNC_1_122` | Kiểm tra upload file lớn | `04_2_020_023` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 25/25 case gốc, 16 → 36 case._

### 6.1 🔴 `FUNC_1_109` có kỳ vọng CỤT — không dựng được assert

Kỳ vọng trong sheet dừng ở giữa câu: *"Hiển thị Mã lô đã tồn tại:"*. Không rõ hệ thống phải **chặn**
hay **cộng dồn vào lô có sẵn**. Mã lô là khoá của lô hàng nên hai hướng này cho ra số tồn khác nhau
hoàn toàn. `04_2_020_014` để `BLOCKED` chờ user, 🚫 không đoán.

### 6.2 `FUNC_1_102` — không tìm thấy trong code

Sheet đòi vô hiệu nút *Tải mẫu excel* và *Khai báo tồn kho đầu kỳ*, kèm chữ *"Đã khai báo tồn kho đầu
kỳ"*. Grep cả hai file của màn: **không có chuỗi đó**, cũng không có `disabled` theo trạng thái đã
khai. Phép chặn "khai lại sản phẩm đã khai" nằm ở bước dựng bản xem trước: dòng đó bị đánh Lỗi
(`hasOpeningBalanceForProduct`, `04_2_020_009` / `FUNC_1_101`).

### 6.3 Trạng thái dòng "Cảnh báo" vẫn chưa có đặc tả

Bộ lọc trạng thái dòng có 4 lựa chọn: Tất cả · Hợp lệ · Lỗi · **Cảnh báo**. Bàn giao trước đã nêu và
vẫn chưa được trả lời: **dòng Cảnh báo có được ghi vào tồn kho hay không.** Đây là câu hỏi số tiền —
trả lời sai là lệch tồn. Đã dựng `04_2_020_018` để đo, `BLOCKED` chờ user.

### 6.4 Ràng buộc Mã lô / Serial nằm trong khối hướng dẫn của UI, không có trong sheet

Code hiện rõ: *FIFO/Đích danh bắt buộc nhập mã lô; MAC/Tiêu chuẩn bỏ trống thì hệ thống tự sinh*;
*serial cách nhau dấu phẩy và phải bằng số lượng đơn vị chính*. Sheet QC không có case nào cho phần
này ngoài `FUNC_1_108` nói chung chung. Đã dựng `04_2_020_013` theo đúng bốn phương pháp tính giá.

### 6.5 Vì sao 18/36 case BLOCKED

**Mỗi sản phẩm/biến thể chỉ khai tồn đầu kỳ được một lần tại một kho** (`04_2_020_009`) ⇒ case ghi
không chạy lại được với sản phẩm đã confirm. Điểm bán thì khai nhiều lần được, miễn không trùng sản phẩm. Cộng với việc chưa có bộ fixture Excel (6 loại file, liệt kê ở `test-cases.md`
mục 8), phần lớn case ghi phải chờ. 🚫 Không hạ kỳ vọng để lấy case chạy được.
