# Kịch bản auto test — 04_4 Kiểm kho

- **Dựng 18/09/2026:** đối chiếu trọn sheet QC + quét 11 kỹ thuật mục 3.4. **2 → 33 case.**
  Phủ **31/31** case gốc (trước đó 1). 🚫 Chưa có script cho case mới.

## 1. Task

`020` file mẫu + upload Excel (5) · `030` tính chênh lệch (6) · `040` nháp → áp dụng (5) ·
`050` danh sách + chi tiết (6) · `060` kiểm kê theo lô, tồn 0 / tồn âm (5) ·
`070` kỳ kế toán và bán âm (5) · `010` form lập phiếu (1)

## 2. 🔴 Câu hỏi NGUY HIỂM NHẤT của màn này — `04_4_030_006`

**Dòng bỏ trống số lượng thực tế có bị coi là "đếm 0" hay không?**

- Nếu **có** ⇒ mọi sản phẩm **chưa kiểm** sẽ bị điều chỉnh về 0, tức **xoá sạch tồn kho** của tất cả
  sản phẩm không nằm trong lượt kiểm.
- Nếu **không** ⇒ dòng bỏ trống không sinh điều chỉnh, đúng nghiệp vụ.

Đây là bẫy đã được ghi nhận trong repo (*"đếm 0" vs "chưa đếm"*). `04_4_030_005` (nhập chữ vào ô số)
nối trực tiếp vào đây: nếu ký tự chữ bị bỏ khiến ô thành **rỗng**, dòng đó trở thành *chưa đếm* — 🚫
tuyệt đối không được coi là *đếm 0*.

## 3. Các phần của chi tiết phiếu — dùng để assert

**Thông tin phiếu** · **Bảng tính chi phí** · 4 thẻ: **Tất cả** / **Tồn kho khớp** / **Tồn kho tăng** /
**Tồn kho giảm**. Số dòng ba thẻ sau cộng lại = số dòng thẻ *Tất cả*.

Quy tắc phân thẻ: chênh lệch > 0 → *Tồn kho tăng*; < 0 → *Tồn kho giảm*; = 0 → *Tồn kho khớp*.

## 4. Ràng buộc nghiệp vụ đo được

| Ràng buộc | Case |
|---|---|
| **Phiếu nháp KHÔNG áp dụng vào kho** | `04_4_040_001` `04_4_040_002` |
| **Chỉ một phiếu nháp tại một thời điểm** — tạo phiếu mới khi còn nháp thì bị chặn | `04_4_040_003` |
| **Tồn mới = số đã đếm**, không phải tồn cũ ± chênh lệch tính lại | `04_4_040_004` |
| **Phiếu đã áp dụng: nút sửa ẩn hẳn** | `04_4_040_005` |
| Sản phẩm **FIFO/LIFO bắt buộc có mã lô** khi upload | `04_4_020_005` |
| Kiểm kho **giảm** khi tồn 0 hoặc tồn âm → **chặn** | `04_4_060_003` `04_4_060_004` |
| Kiểm kho **tăng** khi tồn âm → **cho phép**, tồn sau = số đã đếm | `04_4_060_005` |

## 5. Bẫy đã biết của repo áp vào phân hệ này

| Bẫy | Ảnh hưởng |
|---|---|
| **"đếm 0" vs "chưa đếm"** | `04_4_030_003` `005` `006` — mục 2 |
| **Kiểm kê tách cột chênh lệch riêng từ 07/09** | `04_4_040_004`: 🚫 không lẫn chênh lệch kiểm kê với biến động nhập/xuất |
| **Phiếu con của phiên kiểm vào thẻ kho DW bị đếm đôi** | khi đối chiếu số ở báo cáo, 🚫 không cộng cả phiếu cha và phiếu con |
| **Phiếu mồ côi trôi vào phiên mới** (`check_session_id`) | kiểm kỹ khi lập phiếu mới sau một phiên dở |
| Nguồn lô là JSON **`batch_products`** | `04_4_060_001` `04_4_060_002` |

## 6. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 5 |
| `BLOCKED` | 28 |

22/33 là case **GHI tồn kho**. Áp dụng phiếu kiểm kho **không hoàn tác được bằng UI** — chỉ sửa được
bằng cách lập phiếu kiểm kho mới, mà lại chỉ được có một phiếu nháp tại một thời điểm.

## 7. Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | 🔴 **`FUNC_1_137` không có kỳ vọng**: ô "Kết quả mong muốn" ghi *"Check lại phần tồn kho âm"* — đó là **ghi chú của người viết sheet**, không phải đặc tả. Chưa biết nhập số thực tế âm thì hệ thống làm gì. |
| 2 | 🔴 **`FUNC_1_460` mâu thuẫn**: cho bán âm với sản phẩm quản lý **serial** — nhưng serial không tồn tại thì không có gì để chọn. Chính sách bán âm và quản lý serial xung đột. |
| 3 | 🔴 **Giá vốn của hàng THỪA khi kiểm kê** (`FUNC_1_453`) không được nói lấy từ đâu. |
| 4 | 🔴 **Giá vốn khi bán âm** (`FUNC_1_459`) và **khi bù âm** (`FUNC_1_461`) đều không nói lấy giá nào khi không còn lô. |
| 5 | **Sheet có mã trùng**: `FUNC_1_142` dùng cho hai case khác nhau (nhập chữ vào ô số **và** cập nhật tồn sau áp dụng), `FUNC_1_459` cũng dùng hai lần (kiểm kho tăng khi tồn âm **và** bán hàng khi tồn âm). Cả hai case của mỗi mã đều mang **bare code** để công cụ đối chiếu nhận được (thử ghi `FUNC_1_142#nhap-chu` thì công cụ không khớp) — phân biệt bằng tên case. |
| 6 | **Nhận diện sản phẩm theo TÊN khi upload** (`FUNC_1_131`) — hai sản phẩm trùng tên thì hệ thống chọn cái nào? Không nói. |

## 8. Việc còn lại

1. 🔴 **Trả lời mục 2 trước mọi việc khác** — đó là câu hỏi có thể xoá sạch tồn kho.
2. Xin kho dựng riêng + sản phẩm có lô để mở nhóm `BLOCKED`.
3. Dựng fixture Excel: khai theo SKU · khai theo tên · SKU không tồn tại · FIFO thiếu mã lô.
4. Trace danh sách trạng thái thật của phiếu kiểm kho (`04_4_050_004`).

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/04_4_kiem_kho/playwright.config.js
```

**33/33 case có script.** Spec cũ `vnpost-warehouse.playwright.spec.js` đã xoá (đăng nhập bằng URL
production viết cứng). Lượt chạy: **5 đạt · 0 đỏ · 28 skip**.

### 🔴 Hai màn có TÊN và NỘI DUNG đảo nhau — đo 20/09/2026

| Route | Tiêu đề màn | Bảng liệt kê |
|---|---|---|
| `/inventory/inventory-check` | **Kiểm kho** | **PHIÊN** kiểm kho (*Mã phiên · Người mở phiên · Thuộc phiên · Số phiếu*) |
| `/inventory/inventory-check/session-manage` | **Phiên kiểm kho** | **PHIẾU** (*Mã phiếu · Nhân viên kiểm · Số dòng*) |

Tài liệu gọi chung là "màn Phiếu kiểm kho" ⇒ 🚫 đừng lẫn. Script bám route thứ nhất.

### Vì sao 28 case chưa chạy

- **22 case GHI**: áp dụng phiếu kiểm kho **điều chỉnh tồn kho thật**, và câu hỏi chặn ở mục 2
  (*dòng bỏ trống có bị coi là "đếm 0"?*) vẫn chưa có câu trả lời — sai một lần là **xoá sạch tồn
  của mọi sản phẩm chưa kiểm**.
- Điểm bán test **chưa có phiên / phiếu kiểm kho nào** ⇒ `04_4_050_002` và `04_4_050_006` skip kèm
  lý do. 🚫 Không tự mở phiên để có dữ liệu: mở phiên khoá kho.
