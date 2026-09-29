# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 04_4 — Kiểm kho

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 04_4_kiem_kho`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `04_4_kiem_kho`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **31** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **31** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 33 |
| — **tài liệu gốc KHÔNG có** | 2 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 2 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `04_4_010_001` | Thêm phiếu kiểm kho - mở form và validate | HDSD 010 |
| `04_4_030_006` | Dòng CHƯA ĐẾM khác dòng ĐẾM 0 | Quét kỹ thuật 3.4 #3 + bẫy đã biết của repo ("đếm 0" vs "chưa đếm") |

## 5. Bảng đối chiếu đầy đủ 31 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_123` | Kiểm tra giao diện | `04_4_050_001` |
| `FUNC_1_124` | Kiểm tra tìm kiếm theo mã phiếu đúng | `04_4_050_002` |
| `FUNC_1_125` | Kiểm tra tìm kiếm theo mã hiển thị mã sai | `04_4_050_003` |
| `FUNC_1_126` | Kiểm tra bộ lọc trạng thái | `04_4_050_004` |
| `FUNC_1_127` | Kiểm tra bộ lọc khoảng thời gian | `04_4_050_005` |
| `FUNC_1_128` | Kiểm tra xem chi tiết phiếu kiểm kho | `04_4_050_006` |
| `FUNC_1_129` | Kiểm tra tải file mẫu Excel trống | `04_4_020_001` |
| `FUNC_1_130` | Kiểm tra tải file mẫu Excel có dữ liệu | `04_4_020_002` |
| `FUNC_1_131` | Kiểm tra upload mã SKU có trong hệ thống hoặc có tên trong hệ thống | `04_4_020_003` |
| `FUNC_1_132` | Kiểm tra upload mã SKU và tên sản phảm không có trong hệ thống | `04_4_020_004` |
| `FUNC_1_133` | Kiểm tra upload bỏ trống cột mã lo đối với sản phẩm fifo | `04_4_020_005` |
| `FUNC_1_134` | Nhập số lượng thực tế lớn hơn tồn kho | `04_4_030_001` |
| `FUNC_1_135` | Nhập số lượng thực tế nhỏ hơn tồn kho | `04_4_030_002` |
| `FUNC_1_136` | Nhập số lượng thực tế bằng tồn kho | `04_4_030_003` |
| `FUNC_1_137` | Nhập tồn kho thực tế âm | `04_4_030_004` |
| `FUNC_1_142` | Kiểm tra nhập chữ vào cột số lượng hiện tại | `04_4_030_005`, `04_4_040_004` |
| `FUNC_1_139` | Kiểm tra tạo phiếu kiểm kho nháp | `04_4_040_001` |
| `FUNC_1_140` | Kiểm tra chỉnh sửa phiếu kiểm kho nháp | `04_4_040_002` |
| `FUNC_1_141` | Kiểm tra thêm phiếu kiểm kho khi còn 1 phiếu kiểm kho nháp | `04_4_040_003` |
| `FUNC_1_142` | Kiểm tra cập nhật tồn kho sau khi áp dụng kiểm kho | `04_4_030_005`, `04_4_040_004` |
| `FUNC_1_143` | Kiểm tra chỉnh sửa phiếu kiểm kho đã áp dụng | `04_4_040_005` |
| `FUNC_1_452` | Kiểm kê thiếu hàng của lô | `04_4_060_001` |
| `FUNC_1_453` | Kiểm kê thừa hàng của lô | `04_4_060_002` |
| `FUNC_1_454` | Kiểm kho giảm khi tồn = 0 | `04_4_060_003` |
| `FUNC_1_455` | Kiểm kho giảm khi tồn âm | `04_4_060_004` |
| `FUNC_1_459` | Kiểm kho tăng khi tồn âm | `04_4_060_005`, `04_4_070_003` |
| `FUNC_1_457` | Đóng kỳ kế toán | `04_4_070_001` |
| `FUNC_1_458` | Bán hàng khi tồn kho = 0 | `04_4_070_002` |
| `FUNC_1_459` | Bán hàng khi tồn kho âm | `04_4_060_005`, `04_4_070_003` |
| `FUNC_1_460` | Bán hàng âm với sản phẩm quản lý Serial | `04_4_070_004` |
| `FUNC_1_461` | Sau khi bán âm, nhập kho bù | `04_4_070_005` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 31/31 case gốc (trước đó 1), 2 → 33 case._

### 6.1 🔴 Câu hỏi có thể XOÁ SẠCH TỒN KHO — phải trả lời trước mọi việc khác

**Dòng bỏ trống số lượng thực tế có bị coi là "đếm 0"?** Nếu có, mọi sản phẩm **chưa kiểm** sẽ bị
điều chỉnh về 0 khi áp dụng phiếu. Đây là bẫy đã ghi nhận trong repo (*"đếm 0" vs "chưa đếm"*) và
sheet QC **không có case nào** cho nó — đã tự dựng `04_4_030_006`.

`FUNC_1_142` (nhập chữ vào ô số) nối trực tiếp vào đây: nếu ký tự chữ bị bỏ khiến ô thành **rỗng**
thì dòng đó thành *chưa đếm*, không phải *đếm 0* như sheet đòi.

### 6.2 Một case gốc KHÔNG có kỳ vọng

`FUNC_1_137` (nhập tồn thực tế âm) ghi ở cột kết quả mong muốn: *"Check lại phần tồn kho âm"*. Đó là
**ghi chú của người viết sheet**, không phải đặc tả. 🚫 Không chép vào assert; đã để `BLOCKED`.

### 6.3 Sheet dùng TRÙNG mã cho hai case khác nhau

- `FUNC_1_142` dùng cho *"nhập chữ vào cột số lượng hiện tại"* **và** *"cập nhật tồn kho sau khi áp
  dụng kiểm kho"*.
- `FUNC_1_459` dùng cho *"kiểm kho tăng khi tồn âm"* **và** *"bán hàng khi tồn kho âm"*.

⚠️ Đã thử ghi `FUNC_1_142#nhap-chu` / `FUNC_1_459#tang-khi-ton-am` theo luật 6 của bàn giao, nhưng
`doi-chieu-goc.js` **không khớp mã có hậu tố** ⇒ hai mã báo là "chưa dựng". Phải dùng **bare code** ở
cả hai case, phân biệt bằng tên case. 🔴 Luật 6 chỉ dùng được cho `<file>#<mã>` khi mã trùng giữa hai
FILE khác nhau, 🚫 không dùng được để phân biệt hai case trong CÙNG file. Dãy `FUNC_1_138` khuyết.

### 6.4 Bốn câu hỏi GIÁ VỐN không được trả lời

Giá vốn của **hàng thừa khi kiểm kê** (`FUNC_1_453`), giá vốn **khi bán âm** (`FUNC_1_459`), giá vốn
**khi nhập bù âm** (`FUNC_1_461`), và giá vốn của **2 đơn vị tăng thêm ở lô** — sheet đều chỉ nói số
lượng, không nói tiền. Đây là phân hệ sinh bút toán nên bỏ trống phần tiền là bỏ trống đúng thứ đáng
kiểm nhất.

### 6.5 Mâu thuẫn bán âm × serial

`FUNC_1_460` đòi *"cho phép bán theo đúng cấu hình bán âm"* với sản phẩm **quản lý serial**. Nhưng
serial không tồn tại trong kho thì không có gì để chọn. Hai ràng buộc này loại trừ nhau — cần user
quyết bên nào thắng.

### 6.6 Ràng buộc "một phiếu nháp tại một thời điểm" làm khó chính việc test

`FUNC_1_141` cho thấy không tạo được phiếu mới khi còn phiếu nháp. Hệ quả: các case cần mở form lập
phiếu (`04_4_020_001` `04_4_020_002`) bị phụ thuộc trạng thái phiếu nháp hiện có — phải dọn nháp
trước, mà dọn nháp cũng là thao tác ghi.
