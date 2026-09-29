# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 18_3 — Thu tiền đơn hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 18_3_thanh_toan_va_bien_lai`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `18_3_thanh_toan_va_bien_lai`
- Tài liệu gốc liên quan: [`uat_vnpost_ban_hang.csv`](../test-case-goc/uat_vnpost_ban_hang.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **10** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **10** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 54 |
| — **tài liệu gốc KHÔNG có** | 43 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 43 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `18_3_010_001` | Mở màn thanh toán khi đơn chưa có sản phẩm | Code FE OrderCheckoutComponent.jsx:951 |
| `18_3_010_002` | Mặc định hình thức và phương thức khi mở màn thanh toán | HDSD 90_tra_cuu_truong — bảng trường chung |
| `18_3_010_003` | Hiển thị đủ 3 hình thức thanh toán | Code FE PaymentMethodModal.jsx:1861,1885,1911 |
| `18_3_010_004` | Hiển thị đủ 6 phương thức thanh toán | Code FE PaymentMethodModal.jsx:2007,2039,2073,2104 |
| `18_3_010_005` | Huỷ modal thanh toán không được lưu gì | Kỹ thuật 3.4 #9 — huỷ giữa chừng |
| `18_3_010_006` | Tổng tiền cần thanh toán đã trừ chiết khấu và coupon | HDSD 90_tra_cuu_truong |
| `18_3_020_003` | Chặn tiền khách đưa nhỏ hơn số phải thu khi Thanh toán hết | HDSD 90_tra_cuu_truong — "không được nhỏ hơn số phải thu" |
| `18_3_020_004` | Bỏ trống số tiền khách đưa | Code FE PaymentMethodModal.jsx:1037 + kỹ thuật 3.4 #1 |
| `18_3_020_005` | Nhập số tiền khách đưa bằng 0 | Kỹ thuật 3.4 #3 — giá trị biên 0 |
| `18_3_020_006` | Nhập số tiền khách đưa âm | Kỹ thuật 3.4 #3 — giá trị âm |
| `18_3_020_007` | Nhập chữ vào ô số tiền khách đưa | Kỹ thuật 3.4 #4 — kiểu dữ liệu sai |
| `18_3_020_008` | Chọn nhanh mệnh giá tiền khách đưa | HDSD 90_tra_cuu_truong — Chọn nhanh số tiền khách đưa |
| `18_3_040_002` | Chặn tạo mã QR khi chưa chọn tài khoản nhận | Code FE PaymentMethodModal.jsx:1014 |
| `18_3_040_003` | Tự chọn tài khoản nhận khi điểm bán chỉ có một | HDSD 90_tra_cuu_truong — Quét QR |
| `18_3_040_005` | Nút Hoàn tất giao dịch chỉ bật khi giao dịch đã ghi nhận | HDSD 90_tra_cuu_truong — Quét QR |
| `18_3_040_006` | Quay lại bước chọn tài khoản nhận | HDSD 90_tra_cuu_truong — Quét QR |
| `18_3_050_003` | Chặn thanh toán bằng điểm khi đơn chưa gắn khách hàng | Code FE PaymentMethodModal.jsx:993 |
| `18_3_050_004` | Chặn khi chưa có cấu hình quy đổi điểm | Code FE PaymentMethodModal.jsx:997 |
| `18_3_050_005` | Chặn khi chương trình đổi điểm đang tắt | Code FE PaymentMethodModal.jsx:1042 |
| `18_3_050_006` | Bỏ trống số điểm sử dụng | Code FE PaymentMethodModal.jsx:1005 + kỹ thuật 3.4 #1 |
| `18_3_050_007` | Nhập số điểm vượt điểm khả dụng | Code FE PaymentMethodModal.jsx:1009 + kỹ thuật 3.4 #3 |
| `18_3_050_008` | Nhập đúng bằng điểm khả dụng | Kỹ thuật 3.4 #3 — biên N |
| `18_3_050_009` | Nhập số điểm bằng 0 | HDSD 90_tra_cuu_truong — "Lớn hơn 0" |
| `18_3_050_010` | Nhập số điểm vượt số tiền phải thu | HDSD 90_tra_cuu_truong — Thanh toán bằng điểm |
| `18_3_050_011` | Số tiền quy đổi tính đúng theo tỉ lệ | HDSD 90_tra_cuu_truong |
| `18_3_060_002` | Chặn khi tổng các phương thức khác số phải thu | Code FE PaymentMethodModal.jsx:983 |
| `18_3_060_003` | Chặn khi không nhập phương thức nào | Code FE PaymentMethodModal.jsx:988 + kỹ thuật 3.4 #1 |
| `18_3_060_004` | Chặn khi dùng VietQR mà chưa chọn tài khoản nhận | Code FE PaymentMethodModal.jsx:1014 |
| `18_3_060_005` | Ô phương thức còn lại tự điền phần thiếu | HDSD 90_tra_cuu_truong — Đa phương thức |
| `18_3_060_006` | Ô số điểm chỉ hiện khi đơn có khách và chương trình đổi điểm đang chạy | HDSD 90_tra_cuu_truong — Đa phương thức |
| `18_3_060_007` | Chặn khi chưa hoàn tất lần lượt các màn SDK | Code FE PaymentMethodModal.jsx:1025 |
| `18_3_070_001` | Thu một phần và ghi nợ phần còn lại | HDSD 070_thu_mot_phan_ghi_no |
| `18_3_070_003` | Bỏ trống số tiền trả góp | Code FE PaymentMethodModal.jsx:967 + kỹ thuật 3.4 #1 |
| `18_3_070_004` | Chặn số tiền trả góp bằng hoặc lớn hơn số phải thu | Code FE PaymentMethodModal.jsx:972 + kỹ thuật 3.4 #3 |
| `18_3_070_005` | Chặn số tiền thanh toán lớn hơn tổng tiền đơn hàng | Code BE CheckoutOrder.java:1708 |
| `18_3_080_001` | Lưu đơn nháp bằng nút Đặt hàng trước | HDSD 90_tra_cuu_truong — nút Đặt hàng trước |
| `18_3_080_002` | Nút Đặt hàng trước bị chặn với đơn áp khuyến mại realtime | Code FE customerGroupPreviewUtils.js:6 |
| `18_3_080_003` | Nút Đặt hàng trước không dùng được với đơn online | HDSD 90_tra_cuu_truong + code FE OrderCheckoutComponent.jsx |
| `18_3_090_001` | Thanh toán sau ghi nợ toàn bộ | HDSD 090_thanh_toan_sau |
| `18_3_090_003` | Thanh toán sau khi đơn chưa có sản phẩm | Code FE OrderCheckoutComponent.jsx:951 |
| `18_3_090_004` | Chặn thanh toán đơn không còn ở trạng thái nháp | Code BE CheckoutOrder.java:1694 — PodErrorCode.ONLY_DRAFT_ORDERS_CAN_BE_PAID |
| `18_3_100_001` | Vai bưu điện xã không mở được màn bán hàng của điểm bán | Kỹ thuật 3.4 #10 — phạm vi theo vai |
| `18_3_100_002` | Vai quản lý điểm bán thanh toán được đơn của chính điểm bán | Kỹ thuật 3.4 #10 — phạm vi theo vai |

## 5. Bảng đối chiếu đầy đủ 10 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong153` | Kiểm tra thanh toán bằng phương thức Tiền mặt | `18_3_020_001`, `18_3_020_002` |
| `dong154` | Kiểm tra thanh toán bằng phương thức Quẹt thẻ | `18_3_030_002` |
| `dong155` | Kiểm tra thanh toán bằng phương thức Chuyển khoản | `18_3_030_001` |
| `dong156` | Kiểm tra thanh toán bằng mã QR động thành công | `18_3_040_001` |
| `dong157` | Kiểm tra chức năng Tra soát khi gặp lỗi mạng/Timeout giao dịch QR | `18_3_040_004` |
| `dong158` | Kiểm tra thanh toán bằng điểm Loyalty và xác thực OTP thành công | `18_3_050_001` |
| `dong159` | Kiểm tra chặn thanh toán bằng điểm khi nhập sai mã OTP | `18_3_050_002` |
| `dong160` | Kiểm tra thanh toán đa phương thức | `18_3_060_001` |
| `dong161` | Kiểm tra chặn hình thức "Thanh toán sau" đối với Khách lẻ | `18_3_090_002` |
| `dong162` | Kiểm tra chặn "Thanh toán 1 phần" đối với Khách lẻ | `18_3_070_002` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
