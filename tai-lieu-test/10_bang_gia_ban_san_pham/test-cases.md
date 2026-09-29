# Kịch bản auto test — 10 Bảng giá bán sản phẩm

- **Bổ sung 18/09/2026:** đối chiếu trọn sheet QC + quét 11 kỹ thuật mục 3.4. **20 → 87 case.**
  Phủ **82/82** case gốc (trước đó 14). 🚫 Chưa có script.

## 1. Task

| Task | Nội dung | Số case |
|---|---|--:|
| `010` | Danh sách · tìm kiếm · lọc · xuất Excel | 9 |
| `020` | Thẻ **Thông tin chung** — ngày/giờ hiệu lực, VAT, trạng thái | 9 |
| `030` | Sửa bảng giá | 6 |
| `040` | Chi tiết bảng giá (3 thẻ, chỉ đọc) | 5 |
| `050` | Phê duyệt | 5 |
| `060` | Xoá bảng giá | 4 |
| `070` | Thẻ **Phạm vi áp dụng** — cây tổ chức 4 cấp | 6 |
| `080` | Thẻ **Sản phẩm** — giao diện theo VAT và hình thức | 8 |
| `090` | Thẻ Sản phẩm — thêm sản phẩm **Mua bán** | 11 |
| `100` | Thẻ Sản phẩm — **giá và tỷ lệ chiết khấu** | 6 |
| `110` | Thẻ Sản phẩm — thêm sản phẩm **Ký gửi** | 7 |
| `120` | Xoá sản phẩm khỏi bảng giá | 2 |
| `130` | 🔴 **Giá bán thực tế trên POS** | 8 |
| `PQ` | Phân quyền | 1 |

## 2. 🔴 Nhóm `130` — ràng buộc nền của cả hệ thống bán hàng

`dong103`–`dong110` không kiểm màn bảng giá mà kiểm **hệ quả ở quầy**:

| Tình huống | Kết quả |
|---|---|
| Không thuộc bảng giá nào hiệu lực tại điểm bán | **KHÔNG bán được** — `Sản phẩm: [Tên] …` |
| Thuộc bảng giá **chưa tới hiệu lực** | không bán được (coi như không có bảng giá) |
| Thuộc bảng giá hiệu lực ở **điểm bán khác** | không bán được — **chốt chặn phạm vi** |
| Nhiều bảng giá hiệu lực, khác **ngày** bắt đầu | lấy bảng có ngày bắt đầu **muộn nhất** |
| Nhiều bảng giá hiệu lực, cùng ngày khác **giờ** | lấy bảng có giờ bắt đầu **muộn nhất** |

🔴 Quy tắc "muộn nhất thắng" **chưa được xác nhận từ code** — `10_130_005` `006` để `BLOCKED`.

## 3. VAT — hai phương thức, hai con số doanh thu

| Phương thức | Giá trên bill | Doanh thu ghi nhận |
|---|---|---|
| Đơn giá **chưa** bao gồm VAT (giá trước thuế) | giá bảng giá **+ VAT** | = giá bảng giá |
| Đơn giá **đã** bao gồm VAT (giá sau thuế) | = giá bảng giá | giá bảng giá **− VAT** |

🔴 Bẫy đã biết: **doanh thu tính TRƯỚC VAT**. Hai bảng giá cùng số tiền trên bill cho **doanh thu khác
nhau** — `10_130_001` vs `10_130_002` là cặp case đo đúng chỗ này.

Với **combo**: note nguyên văn *"Giá combo là giá sau VAT; hệ thống tự tính…"* (`10_080_004`), và đổi
phương thức VAT khi bảng đã có combo thì hiện popup *"Thay đổi Phương thức tính thuế VAT"* —
🔴 chưa rõ combo bị xoá / giữ giá / tính lại giá (`10_080_008`).

## 4. Quy tắc tự sửa giá trị — người dùng KHÔNG được cảnh báo

| Nhập gì | Hệ thống tự làm gì | Case |
|---|---|---|
| Giá bán > giá niêm yết | **giá niêm yết nhảy lên bằng giá bán** | `10_100_001` |
| Giá niêm yết < giá bán | **giá niêm yết nhảy lên bằng giá bán** | `10_100_002` |
| Tỷ lệ chiết khấu > 100 | **nhảy xuống 100** | `10_100_004` |
| Số âm ở ô số | **nhảy về 0** | `10_100_005` |

Tỷ lệ chiết khấu tự tính = **(niêm yết − bán) / niêm yết × 100** (`10_100_003`). 🔴 Với hình thức
**Ký gửi** thì giá bán và tỷ lệ chiết khấu **nhập tay, không tự tính lẫn nhau** (`10_100_006`) — khác
biệt nghiệp vụ quan trọng.

## 5. Mua bán và Ký gửi là hai tập sản phẩm TÁCH BIỆT

Nhập SKU ký gửi vào bảng giá mua bán ⇒ *"Không tìm thấy sản phẩm nào"* (`10_090_003`), và ngược lại
(`10_110_003`). Hình thức của bảng giá **không sửa được** sau khi lưu (`10_030_006`).

## 6. Phân loại: `READY_WITH_CODE_LOOKUP` 20 · `BLOCKED` 67 · case ghi **56**

## 7. Lỗ hổng đặc tả

| # | Vấn đề |
|---|---|
| 1 | 🔴 **Quy tắc chọn bảng giá khi nhiều bảng cùng hiệu lực** chỉ suy từ kỳ vọng sheet, chưa xác nhận từ code (`dong107` `dong108`). |
| 2 | 🔴 **Đổi phương thức VAT khi bảng đã có combo** — popup có cảnh báo nhưng chưa rõ hệ quả với combo đã thêm (`dong73`). |
| 3 | **File Excel lẫn SKU sai hình thức** — nhận phần hợp lệ hay từ chối cả file (`BANGGIA_35`)? |
| 4 | **Sheet dùng trùng mã `BANGGIA_35`** cho hai case khác nhau (tỷ lệ chiết khấu tự tính · upload Excel SKU ký gửi). Đã dựng đủ hai case, cùng mang mã gốc `BANGGIA_35`. |
| 5 | **Ô Hình thức bị disable khi sửa** — hợp lý, nhưng chưa rõ có thông báo giải thích cho người dùng. |

## 8. Việc còn lại

1. Xác nhận quy tắc "bảng giá muộn nhất thắng" từ code trước khi viết assert nhóm `130`.
2. Trả lời mục 7 số 2 và 3.
3. Xin đơn vị + bộ sản phẩm (mua bán, ký gửi, combo) dựng riêng — 56/87 case ghi.

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/10_bang_gia_ban_san_pham/playwright.config.js
```

**87/87 case có script.** Lượt chạy: **19 đạt · 2 đỏ · 66 skip**.

### 🔴 Route THẬT là `/product/pricing`

🚫 Không phải `/product/price` lẫn `/settings/price-policy` — cả hai mở ra **trang trắng**. Lấy
đúng đường từ link menu *"Bảng giá"*. Màn còn người anh em `/product/standard-pricing`
("Bảng giá tiêu chuẩn") — 🚫 đừng lẫn.

| Thứ | Giá trị đo 20/09/2026 |
|---|---|
| API danh sách | `GET /chain-price-list/get-all` |
| Ô tìm | `Nhập tên bảng giá` — **tự lọc khi ngừng gõ**, 🚫 không có nút tìm, 🚫 không theo Enter |
| Bộ lọc | Trạng thái · Trạng thái phê duyệt · Trạng thái áp dụng · Phân loại bảng giá · Phạm vi khu vực · khoảng ngày |
| Cột | STT · Tên bảng giá · Phân loại bảng giá · Thời gian hiệu lực · Giá gồm thuế · Trạng thái · Trạng thái áp dụng · Trạng thái phê duyệt · Thời gian tạo · Thao tác |

### Hai case đỏ — đều là phát hiện

1. 🔴 **`10_PQ_001` — vai điểm bán KHÔNG xem được bảng giá.**
   `GET /chain-price-list/get-all` trả **401 ở MỌI lần gọi** (đã tải lại trang để loại trừ phiên
   cũ). Màn rỗng im lặng: 0 dòng, 0 nút, không thông báo nào. Trái quyền `view_price_product` mà
   kịch bản khai. 🔴 Cùng kiểu với phát hiện `02_010_029` (vai tỉnh ở màn nhân viên).
2. 🔴 **`10_020_002` — màn Thêm bảng giá có BỐN bước, kịch bản khai ba.**
   Thứ tự thật: *Thông tin chung · **Phạm vi khách hàng** · Phạm vi khu vực · Sản phẩm*. Bước
   *Phạm vi khách hàng* không có trong tài liệu ⇒ cần user bổ sung kịch bản (và các case của bước
   đó hiện **chưa ai viết**).

### 66 case chưa chạy

56 case GHI (thêm/sửa/phê duyệt/xoá bảng giá, thêm sản phẩm vào bảng giá) + 10 case cần vào sâu
**thẻ Sản phẩm** của màn Thêm/Sửa — 🚫 chưa probe được đường đi ổn định tới thẻ đó, 🚫 không đoán
locator.
