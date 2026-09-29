# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 26 — Phiếu thu

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 26_phieu_thu`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `26_phieu_thu`
- Tài liệu gốc liên quan: [`uat_vnpost_tai_chinh.csv`](../test-case-goc/uat_vnpost_tai_chinh.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **15** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **15** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 40 |
| — **tài liệu gốc KHÔNG có** | 25 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 25 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `26_010_002` | Chọn nguồn thu thì hiện thêm ô chọn đối tượng cụ thể | HDSD 010 |
| `26_010_004` | In được phiếu thu từ danh sách | HDSD 010 |
| `26_020_002` | Chọn Chuyển khoản thì hiện ô tài khoản nhận tiền | HDSD 020 |
| `26_030_001` | Chi tiết phiếu thu là màn chỉ đọc | HDSD 030 |
| `26_030_002` | Cửa hàng và Nhân viên tạo phiếu không sửa được | HDSD 030 |
| `26_030_003` | Sửa phiếu thu điều chỉnh lại ghi nhận quỹ | HDSD 030 |
| `26_040_001` | Xoá phiếu thu hỏi xác nhận không hoàn tác | HDSD 040 |
| `26_040_002` | Xoá phiếu thu huỷ luôn ghi nhận quỹ | HDSD 040 |
| `26_040_003` | Phiếu do hệ thống tự sinh không xoá được | HDSD 040 |
| `26_040_004` | Phiếu thu tiền bán hàng có thông báo riêng khi xoá | HDSD 040 |
| `26_050_001` | Danh mục riêng của điểm bán xếp trước danh mục mặc định | HDSD 050 |
| `26_050_002` | Tìm danh mục bỏ qua dấu tiếng Việt | HDSD 050 |
| `26_050_004` | Danh mục mặc định của hệ thống không xoá được | HDSD 050 |
| `26_PQ_001` | Thiếu quyền tạo thì không lập được phiếu thu | HDSD |
| `26_080_001` | Bỏ trống số tiền khi lập phiếu thu | Kỹ thuật 3.4 #1 — ô bắt buộc |
| `26_080_002` | Lập phiếu thu với số tiền bằng 0 | Kỹ thuật 3.4 #3 — biên 0 |
| `26_080_003` | Lập phiếu thu với số tiền âm | Kỹ thuật 3.4 #3 — giá trị âm |
| `26_080_004` | Bỏ trống danh mục khi lập phiếu thu | Kỹ thuật 3.4 #1 — ô bắt buộc |
| `26_080_005` | Huỷ giữa chừng khi lập phiếu thu | Kỹ thuật 3.4 #9 — huỷ giữa chừng |
| `26_080_006` | Chọn Chuyển khoản mà không chọn tài khoản nhận | Kỹ thuật 3.4 #1 — ô bắt buộc có điều kiện |
| `26_090_001` | Phân trang danh sách phiếu thu | Kỹ thuật 3.4 #7 — phân trang |
| `26_090_002` | Danh sách phiếu thu rỗng | Kỹ thuật 3.4 #7 — trạng thái rỗng |
| `26_090_003` | Tổ hợp bộ lọc trên danh sách phiếu thu | Kỹ thuật 3.4 #7 — tổ hợp bộ lọc |
| `26_090_004` | Tìm phiếu thu bằng ký tự đặc biệt | Kỹ thuật 3.4 #8 — ký tự đặc biệt |
| `26_090_005` | Tìm phiếu thu bằng mã không tồn tại | Kỹ thuật 3.4 #8 — không tồn tại |

## 5. Bảng đối chiếu đầy đủ 15 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `TaiChinh_19` | Hiển thị giao diện | `26_010_005` |
| `TaiChinh_20` | Hiển thị mặc định | `26_010_001` |
| `TaiChinh_21` | Lọc & Tìm kiếm | `26_010_003` |
| `TaiChinh_22` | Thêm danh mục phiếu thu | `26_050_003` |
| `TaiChinh_23` | Thêm phiếu thu thủ công | `26_020_001` |
| `TaiChinh_24` | Bán hàng: Khách thanh toán đơn | `26_060_001` |
| `TaiChinh_25` | Bán hàng: Đơn nháp/Chưa thanh toán | `26_060_002` |
| `TaiChinh_26` | Đổi trả: Thu chênh lệch đổi hàng | `26_060_003` |
| `TaiChinh_27` | Đổi trả: Thu chi phí trả hàng | `26_060_004` |
| `TaiChinh_28` | Kho: Thu hồi nợ nhân viên (hỏng/thiếu) | `26_060_005` |
| `TaiChinh_29` | Kho: Thu hồi nợ ĐV Vận tải | `26_060_006` |
| `TaiChinh_30` | TCT: Nhận thanh toán từ Tỉnh | `26_060_007` |
| `TaiChinh_31` | Cấp cao xem phiếu cấp dưới | `26_070_001` |
| `TaiChinh_32` | Cấp dưới xem phiếu cấp cao | `26_070_002` |
| `TaiChinh_33` | Ngang hàng xem phiếu nhau | `26_070_003` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
