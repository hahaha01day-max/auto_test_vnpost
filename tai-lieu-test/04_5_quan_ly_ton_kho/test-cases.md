# Kịch bản auto test — 04_5 Quản lý tồn kho

- **Dựng 18/09/2026:** đối chiếu trọn sheet QC + quét 11 kỹ thuật mục 3.4. **3 → 46 case.**
  Phủ **45/45** case gốc (trước đó 2). 🚫 Chưa có script cho case mới.

## 1. Task

| Task | Nội dung | Số case |
|---|---|--:|
| `010` | Tổng quan kho: tìm · lọc danh mục · chọn điểm bán · phân trang · xuất Excel | 7 |
| `020` | **Quản lý kho hàng**: thêm/sửa/xoá kho · kho mặc định · bật-tắt · kho vật lý | 16 |
| `030` | **Thẻ kho**: bộ lọc · 4 ô số liệu · 6 loại giao dịch · phân trang | 18 |
| `040` | Báo cáo nhập / xuất | 1 |
| `050` | Đăng nhập theo 4 cấp vai | 4 |

## 2. 🔴 Đẳng thức chốt chặn của Thẻ kho — `04_5_030_011`

**Tồn cuối kỳ = Tồn đầu kỳ + Tổng nhập − Tổng xuất**, và phải khớp tồn thật.

Lệch đẳng thức này là một trong **ba bẫy DW đã gặp thật**:

| Bẫy | Triệu chứng |
|---|---|
| Query thiếu `FINAL` trên `ReplacingMergeTree` | mọi số bị **đếm đôi** (2–24% dòng chưa merge) |
| **Tồn đầu kỳ đếm hai lần** | ô Tồn đầu kỳ gấp đôi |
| **Phiếu con của phiên kiểm kho vào thẻ kho** | Tổng nhập / Tổng xuất bị cộng cả phiếu cha và phiếu con |

Thêm hai điều phải biết khi đối chiếu số: **NXT đo bằng `post − pre`**, 🚫 không lấy `quantity`; và
**chênh lệch kiểm kê đã tách cột riêng từ 07/09** — 🚫 không cộng lẫn vào Tổng nhập/Tổng xuất thường.

## 3. Cột "Loại" của Thẻ kho — hai dòng, 6 tổ hợp

Mỗi giao dịch hiển thị **hai dòng chữ**: dòng trên là chiều (**Nhập kho** xanh / **Xuất kho** đỏ-cam),
dòng dưới là nguồn cụ thể. Sáu tổ hợp sheet QC đòi kiểm:

| Case | Dòng trên | Dòng dưới |
|---|---|---|
| `04_5_030_013` | Nhập kho | từ Nhà cung cấp |
| `04_5_030_014` | Nhập kho | Nhập chuyển kho |
| `04_5_030_015` | Nhập kho | Kiểm kho (tồn thực tế > hệ thống) |
| `04_5_030_016` | Xuất kho | Xuất kho thường |
| `04_5_030_017` | Xuất kho | Xuất chuyển kho |
| `04_5_030_018` | Xuất kho | Kiểm kho (tồn thực tế < hệ thống) |

## 4. Ràng buộc nghiệp vụ nhóm Quản lý kho hàng

| Ràng buộc | Case |
|---|---|
| **Chỉ một kho mặc định** tại một thời điểm; đặt kho mới làm mặc định thì kho cũ mất cờ | `04_5_020_003` `04_5_020_006` |
| Đổi kho mặc định **ảnh hưởng mọi form lập phiếu sau đó** (ô kho tự điền) | `04_5_020_006` |
| Thêm kho cho tỉnh **chưa có HUB** ⇒ kho mới thành **một HUB trực thuộc** trong cây tổ chức | `04_5_020_016` |
| Bỏ trống tên kho ⇒ *"Vui lòng nhập tên kho"* | `04_5_020_005` |

## 5. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 21 |
| `BLOCKED` | 25 |

## 6. Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | 🔴 **`FUNC_1_220` để NGỎ câu hỏi mất hàng**: *"Xoá kho thành công - Số lượng còn lại trong kho ?"* — chính người viết sheet cũng không biết. Xoá kho đang có tồn thì **tồn đi đâu**? |
| 2 | 🔴 **Bốn case gốc có kỳ vọng là `"Check lại"`** (`FUNC_1_222`–`225`): kiểm kho / xuất kho / nhập kho / chuyển kho **với kho vật lý**. Đó là ghi chú của người viết, không phải đặc tả. Đã viết lại theo nghiệp vụ và để `BLOCKED` chờ user. |
| 3 | 🔴 **`FUNC_1_221` chép nhầm kỳ vọng của `FUNC_1_226`**: case *"chuyển kho với kho vật lý"* lại mang kỳ vọng *"Thêm kho mới thành 1 HUB trực thuộc"*. Đã viết lại theo nghiệp vụ đúng. |
| 4 | 🔴 **`FUNC_1_218` chưa rõ**: kho đã tắt thì bị **ẩn khỏi** ô chọn, **hiện kèm nhãn tắt**, hay **chọn được rồi mới báo lỗi**? Ba cách xử lý khác nhau hoàn toàn. |
| 5 | **`FUNC_1_1`–`4` không thuộc nhóm nào** trong sheet — thực chất là case đăng nhập / phạm vi theo 4 cấp vai, **trùng nghiệp vụ với phân hệ `31_quan_ly_phan_quyen`**. Cần user chốt giữ ở đâu. |
| 6 | **`FUNC_1_85` đòi tìm theo barcode** ở Thẻ kho — cùng vấn đề với `FUNC_1_202` của phân hệ `04_1`. Nên trả lời một lần cho cả hai. |
| 7 | **Ba ô tổng hợp ở Tổng quan kho**: sheet nói chúng đổi theo bộ lọc (`FUNC_1_6` `FUNC_1_7`). Nếu thực tế giữ số của toàn kho thì là lỗi — `04_5_010_002` là case đo. |

## 7. Việc còn lại

1. Trả lời mục 6 — số 1 (mất hàng) và số 2 (4 case không có đặc tả) là chặn.
2. Chốt cách đối chiếu số DW trong auto test (post−pre, `FINAL`) trước khi viết assert cho nhóm `030`.
3. Xin kho dựng riêng cho nhóm `020`, vì kho đã phát sinh giao dịch không xoá được.

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/04_5_quan_ly_ton_kho/playwright.config.js
```

**46/46 case có script.** Spec cũ `vnpost-warehouse.playwright.spec.js` đã xoá. Lượt chạy:
**18 đạt · 1 đỏ · 27 skip**.

### 🔴 Case đỏ — `04_5_030_002`: thẻ "Thẻ kho" mở ra RỖNG HOÀN TOÀN

Bấm vào thẻ **Thẻ kho** ở màn Lịch sử xuất nhập kho: tab chuyển sang active đúng
(`.ant-tabs-tab-active` = "Thẻ kho") nhưng khung nội dung **không có gì** — không ô lọc, không
bảng, không một chữ nào, và 🚫 **không request nào** được gửi. Đã thử chờ tới 9 giây.

⇒ Chín case còn lại của nhóm `030` (tìm kiếm, phân trang, sáu loại giao dịch) đều **skip** vì
không có gì để thao tác. Đây là chốt chặn của cả nhóm — cần user xác nhận đây là lỗi hay thẻ này
đang tắt có chủ ý.

### Ghi nhận khác

- **Tiêu đề drawer chọn đơn vị KHÔNG thống nhất**: màn Tổng quan kho dùng *"Chọn Kho / Điểm bán"*,
  màn Chuyển kho dùng *"Chọn Điểm bán / Kho"* — hai thứ tự ngược nhau.
- Ô **"Chọn danh mục"** ở Tổng quan kho mở ra **rỗng** với điểm bán test ⇒ `04_5_010_003` skip.
  Cần user chốt: thiếu dữ liệu nền, hay danh mục đang đọc sai nguồn (quy tắc 1 — phải đọc
  `CHAIN_PRODUCTS`, 🚫 cấm `SHOP_PRODUCTS`).
- Vai `ward` chưa có tài khoản trong `.env` ⇒ `04_5_050_003` skip kèm lý do, 🚫 không gán tạm sang
  vai khác.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_5_020_012` | Kiểm kho với kho vật lý | Chờ user quyết | 🔴 Sheet QC ghi kỳ vọng là *"Check lại"* — **không phải kỳ vọng**, là ghi chú của người viết. Viết theo nghiệp vụ: kiểm kho áp được cho kho vật lý và tồn của đúng kho đó đổi theo số đã đếm, các kho khác không đổi. Cần us… |
| `04_5_020_013` | Xuất kho với kho vật lý | Chờ user quyết | 🔴 Kỳ vọng gốc là *"Check lại"*. Viết theo nghiệp vụ: tồn của đúng kho vật lý đó giảm, kho khác không đổi; giá vốn lấy theo lô của chính kho đó. Cần user xác nhận. |
| `04_5_020_014` | Nhập kho với kho vật lý | Chờ user quyết | 🔴 Kỳ vọng gốc là *"Check lại"*. Viết theo nghiệp vụ: tồn của đúng kho đó tăng; kho khác không đổi. Cần user xác nhận. |
| `04_5_020_015` | Chuyển kho giữa các kho trong CÙNG một đơn vị | Chờ user quyết | 🔴 Kỳ vọng gốc là *"Check lại"*. Viết theo nghiệp vụ: tồn A giảm, tồn B tăng đúng số lượng; **KHÔNG phát sinh công nợ** (cùng một đơn vị, không phải giao dịch giữa hai pháp nhân). Cần user xác nhận phần công nợ. |

**4/46 case** của phân hệ này chưa chốt được kỳ vọng.
