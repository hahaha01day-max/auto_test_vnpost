# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 34 — Công nợ khách hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 34_cong_no_khach_hang`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `34_cong_no_khach_hang`
- Tài liệu gốc liên quan: [`uat_vnpost_bao_cao_cong_no_khach_hang.csv`](../test-case-goc/uat_vnpost_bao_cao_cong_no_khach_hang.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **13** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **13** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 28 |
| — **tài liệu gốc KHÔNG có** | 17 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 17 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `34_010_002` | Đổi kỳ thì tổng công nợ đổi theo | HDSD 010 |
| `34_020_001` | Công nợ chi tiết của một khách hiện từng khoản | HDSD 020 |
| `34_030_001` | Chi tiết phiếu công nợ cho biết nguồn gốc khoản nợ | HDSD 030 |
| `34_040_001` | Thu hồi nợ khách hàng sinh phiếu thu | HDSD 040 |
| `34_040_002` | Chỉ vai điểm bán mới thu hồi nợ được | HDSD 040 |
| `34_PQ_001` | Giao dịch viên chỉ thấy công nợ trong phạm vi điểm bán | HDSD |
| `34_050_011` | Tìm công nợ bằng ký tự đặc biệt | Kỹ thuật 3.4 #8 — ký tự đặc biệt |
| `34_050_012` | Tìm công nợ theo tên khách không dấu | Kỹ thuật 3.4 #8 — không dấu |
| `34_050_013` | Tìm công nợ không phân biệt hoa thường | Kỹ thuật 3.4 #8 — hoa/thường |
| `34_060_001` | Danh sách công nợ rỗng | Kỹ thuật 3.4 #7 — trạng thái rỗng |
| `34_060_002` | Phân trang danh sách công nợ | Kỹ thuật 3.4 #7 — phân trang |
| `34_060_003` | Đổi bộ lọc thì quay về trang đầu | Kỹ thuật 3.4 #7 — đổi lọc |
| `34_060_004` | Tổng công nợ bằng tổng các dòng chi tiết | Kỹ thuật 3.4 #11 — số liệu liên quan |
| `34_060_005` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Kỹ thuật 3.4 #4 — ngày kết thúc < ngày bắt đầu |
| `34_060_006` | Huỷ giữa chừng khi thu hồi nợ | Kỹ thuật 3.4 #9 — huỷ giữa chừng |
| `34_060_007` | Thu hồi nợ với số tiền bằng 0 | Kỹ thuật 3.4 #3 — biên 0 |
| `34_060_008` | Thu hồi nợ vượt số tiền còn nợ | Kỹ thuật 3.4 #3 — giá trị biên |

## 5. Bảng đối chiếu đầy đủ 13 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong14` | Kiểm tra chọn ngày bắt đầu trùng ngày kết thúc | `34_010_001` |
| `dong15` | Kiểm tra chọn ngày bắt đầu < ngày kết thúc | `34_010_001` |
| `dong16` | Kiểm tra chọn ngày bắt đầu > ngày kết thúc | `34_010_001` |
| `dong18` | Kiểm tra khi nhập space vào ô tìm kiếm | `34_050_001` |
| `dong19` | Kiểm tra nhập chính xác tên khách hàng có công nợ vào ô tìm kiếm | `34_050_002` |
| `dong20` | Kiểm tra nhập chính xác 1 phần tên khách hàng có công nợ vào ô tìm kiếm | `34_050_003` |
| `dong21` | Kiểm tra nhập tên khách hàng không phát sinh công nợ/không tồn tại trên hệ thống vào ô tìm kiếm | `34_050_004` |
| `dong22` | Kiểm tra nhập chính xác SĐT khách hàng có công nợ vào ô tìm kiếm | `34_050_005` |
| `dong23` | Kiểm tra nhập chính xác 1 phần SĐT khách hàng có công nợ vào ô tìm kiếm | `34_050_006` |
| `dong24` | Kiểm tra nhập SĐT khách hàng không phát sinh công nợ/không tồn tại trên hệ thống hoặc SĐT không đúng định dạng vào ô tìm kiếm | `34_050_007` |
| `dong25` | Kiểm tra nhập chính xác mã đơn hàng còn nợ vào ô tìm kiếm | `34_050_008` |
| `dong26` | Kiểm tra nhập chính xác 1 phần mã đơn hàng còn nợ vào ô tìm kiếm | `34_050_009` |
| `dong27` | Kiểm tra nhập mã đơn hàng không còn nợ/không tồn tại vào ô tìm kiếm | `34_050_010` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
