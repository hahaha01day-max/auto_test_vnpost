# Kịch bản auto test — 07_3 Cấu hình đơn hàng & thanh toán

- Dựng 18/09/2026 từ `hdsd07_3_don_hang_va_thanh_toan/tasks/*.md` (4 task).
- **Bổ sung 18/09/2026:** quét 11 kỹ thuật mục 3.4. **13 → 18 case.** CSV nay đủ **7 cột**.
- Sheet QC không phủ phân hệ này ⇒ việc duy nhất là quét kỹ thuật.

## 1. Route và vai (theo HDSD)

| Nhóm | Route | Vai được phép |
|---|---|---|
| Đơn hàng | `/settings?setting=order` | `TONG_CONG_TY` |
| In hoá đơn bán hàng | `/settings?setting=printer` | TCT · Tỉnh · Xã · **Điểm bán** |
| Quản lý tài khoản thanh toán | `/settings?setting=payment` | |
| Cấu hình phương thức thanh toán | `/settings?setting=paymentMethodConfig` | |

## 2. 🔴 Hai câu hỏi chặn

1. **Giá trị 0 của "Giới hạn thời gian trả hàng" nghĩa là gì?** *Không cho đổi trả* hay *không giới
   hạn*? Hai cách hiểu **trái ngược nhau**. Và không có giới hạn trên — nhập 9999 ngày vẫn lưu.
   (`07_3_010_004`)
2. **Tắt HẾT phương thức thanh toán** thì quầy không còn cách thu tiền nào. Hệ thống nên chặn, nhưng
   code không thấy phép kiểm. (`07_3_040_004`)

## 3. Ràng buộc đo được

- Ô Giới hạn thời gian trả hàng **chỉ hiện khi công tắc đổi trả bật**; tắt rồi bật lại phải giữ giá
  trị đã lưu (`07_3_010_005`).
- Logo hoá đơn: chặn sai định dạng và **quá 5 MB**; đúng 5 MB là biên hợp lệ (`07_3_020_004`).
- Nút Lưu **mờ khi nội dung chưa đổi** (`07_3_020_002`).

## 4. Phân loại: `READY_WITH_CODE_LOOKUP` 8 · `BLOCKED` 10 · case ghi **9**

🔴 Tắt một phương thức thanh toán là **chặn ngay khả năng thu tiền ở quầy**; sửa cấu hình in hoá đơn
là đổi mẫu chứng từ giao cho khách.

## 5. Việc còn lại

1. Trả lời hai câu hỏi ở mục 2.
2. Dựng fixture ảnh logo 1 MB và đúng 5 MB.
3. Đo hành vi với đơn **đang mở dở** khi tắt phương thức thanh toán (`07_3_040_003`).

## 🔴 Kết quả chạy script — 20/09/2026

**18/18 case có script.** Lượt chạy: **9 đạt · 1 đỏ · 8 skip**.

### 🔴 Case đỏ `07_3_PQ_001` — PHÁT HIỆN PHÂN QUYỀN

Vai **Bưu điện Tỉnh** mở được nhóm **Đơn hàng** (`?setting=order`) và còn **sửa được**: đếm được
**2 nút Lưu** và **2 công tắc bấm được**. HDSD task 10 chỉ khai vai `TONG_CONG_TY`.
⇒ Cấu hình đơn đổi trả và ngưỡng hoàn trả bất thường — hai thứ áp cho cả mạng lưới — đang để cấp
tỉnh sửa được.

### Đo được, khác kịch bản

`07_3_040_001` kể 4 phương thức thanh toán (Tiền mặt · Chuyển khoản · PostPay · Thẻ VISA); màn thật
có **6**: thêm **Thanh toán bằng điểm** và **Đa phương thức**. Script assert 4 cái kịch bản đòi và
ghi lại danh sách thật — cần user bổ sung kịch bản.

### Bẫy script

Ô `input[placeholder]` **đầu tiên** của mọi màn `/settings` là ô **"Tìm kiếm cấu hình"** của menu
bên trái, 🚫 không phải ô của nhóm đang mở. Bám id thật (`#invoiceTitle`, `#invoiceBottomContent`)
hoặc placeholder riêng của nhóm.
