# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 29 — Báo cáo quản trị

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 29_bao_cao`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `29_bao_cao`
- Tài liệu gốc liên quan: [`uat_vnpost_bao_cao.csv`](../test-case-goc/uat_vnpost_bao_cao.csv) · [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **51** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **51** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 77 |
| — **tài liệu gốc KHÔNG có** | 27 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 27 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `29_010_002` | Tổng hợp lại báo cáo cập nhật mốc thời gian | HDSD 010 |
| `29_010_003` | Đổi kỳ thì mọi khối cùng đổi theo | HDSD 010 |
| `29_020_001` | Xuất dữ liệu doanh thu ra Excel | HDSD 020 |
| `29_030_001` | Bảng lãi lỗ cân từ trên xuống | HDSD 030 |
| `29_030_002` | Kỳ không có phiếu chi thì lợi nhuận ròng bằng lợi nhuận gộp | HDSD 030 |
| `29_030_003` | Làm mới số liệu lãi lỗ báo đúng thông điệp | HDSD 030 |
| `29_030_004` | Vai điểm bán không vào được báo cáo lãi lỗ | HDSD 030 |
| `29_040_002` | Tổng hợp báo cáo tồn kho chạy nền và báo khi xong | HDSD 040 |
| `29_060_001` | Báo cáo nhập xuất tồn theo đúng khoảng tháng và phạm vi | HDSD 060 |
| `29_060_002` | Xuất NXT đặt tên tệp đúng quy ước | HDSD 060 |
| `29_070_001` | Sản lượng bán hiện ngày phát sinh bán gần nhất | HDSD 070 |
| `29_080_001` | Vòng quay và số ngày tồn kho tính theo đúng kỳ đã lọc | HDSD 080 |
| `29_090_001` | Lọc theo nhãn hàng bán chạy chậm luân chuyển hàng chết | HDSD 090 |
| `29_100_001` | Tồn theo hạn sử dụng xếp theo mức cấp bách | HDSD 100 |
| `29_120_001` | Báo cáo nhân viên xếp hạng theo ba chỉ tiêu | HDSD 120 |
| `29_120_002` | Tổng hợp báo cáo nhân viên báo đúng thông điệp | HDSD 120 |
| `29_130_001` | Báo cáo tuỳ chỉnh dựng thanh báo cáo và tự chọn báo cáo đầu tiên | HDSD 130 |
| `29_130_002` | Chuyển báo cáo trên thanh nạp lại khung nội dung | HDSD 130 |
| `29_130_003` | Danh mục rỗng báo đúng thông điệp và không phải lỗi quyền | HDSD 130 |
| `29_140_001` | Cấu hình danh mục báo cáo tuỳ chỉnh cập nhật thanh báo cáo ngay | HDSD 140 |
| `29_140_002` | Vai Bưu điện Tỉnh không cấu hình được danh mục báo cáo | HDSD 140 |
| `29_PQ_001` | Vai điểm bán chỉ thấy số liệu trong phạm vi của mình | HDSD |
| `29_240_001` | Báo cáo rỗng khi kỳ không có số liệu | Kỹ thuật 3.4 #7 — trạng thái rỗng |
| `29_240_002` | Phân trang bảng báo cáo | Kỹ thuật 3.4 #7 — phân trang |
| `29_240_003` | Tìm phạm vi bằng ký tự đặc biệt | Kỹ thuật 3.4 #8 — ký tự đặc biệt |
| `29_240_004` | Tìm phạm vi không dấu | Kỹ thuật 3.4 #8 — không dấu |
| `29_240_005` | Chọn khoảng thời gian có ngày kết thúc trước ngày bắt đầu | Kỹ thuật 3.4 #4 — ngày kết thúc < ngày bắt đầu |

## 5. Bảng đối chiếu đầy đủ 51 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `Baocao_1` | Kiểm tra giao diện | `29_050_001` |
| `Baocao_2` | Lọc báo cáo theo tháng | `29_200_001` |
| `Baocao_3` | Chọn phạm vi Tổng công ty | `29_200_002` |
| `Baocao_4` | Chọn phạm vi Tỉnh | `29_200_003` |
| `Baocao_5` | Chọn phạm vi Xã | `29_200_004` |
| `Baocao_6` | Chọn phạm vi Điểm bán | `29_200_005` |
| `Baocao_7` | Chốt tồn kho thành công | `29_040_001` |
| `Baocao_8` | Chốt tồn kho khi còn đơn phát sinh | `29_210_001` |
| `Baocao_9` | Kiểm tra cảnh báo phạm vi chưa chốt | `29_210_002` |
| `Baocao_10` | Kiểm tra số liệu chênh lệch đối soát | `29_050_002` |
| `Baocao_11` | Kiểm tra không ghi nhận phiếu xuất kho nháp | `29_210_003` |
| `Baocao_12` | Kiểm tra không ghi nhận phiếu nhập kho nháp | `29_210_004` |
| `Baocao_13` | Kiểm tra không ghi nhận phiếu bán hàng nháp | `29_210_005` |
| `Baocao_14` | Kiểm tra tìm kiếm tỉnh trong phạm vi | `29_200_006` |
| `Baocao_15` | Kiểm tra tìm kiếm bưu điện xã trong phạm vi | `29_200_007` |
| `Baocao_16` | Kiểm tra tìm kiếm điểm bán/ kho trong phạm vi | `29_200_008` |
| `Baocao_17` | Kiểm tra giao diện màn hình Đối soát công nợ NCC | `29_110_001` |
| `Baocao_18` | Lọc báo cáo theo tháng | `29_220_001` |
| `Baocao_19` | Lọc theo NCC | `29_220_002` |
| `Baocao_20` | Tổng hợp lại báo cáo | `29_110_002` |
| `Baocao_21` | Xuất dữ liệu Excel | `29_220_003` |
| `Baocao_22` | Kiểm tra tổng nợ phải trả NCC | `29_220_004` |
| `Baocao_23` | Kiểm tra PO khớp đối soát | `29_220_005` |
| `Baocao_24` | Kiểm tra PO lệch đối soát | `29_220_006` |
| `Baocao_25` | Kiểm tra PO chưa đối soát | `29_220_007` |
| `Baocao_26` | Mở chi tiết đối soát NCC | `29_220_008` |
| `Baocao_27` | Kiểm tra giao diện pop up Đối soát hóa đơn mua hàng | `29_220_009` |
| `Baocao_28` | Xem chi tiết đối soát NCC | `29_220_010` |
| `Baocao_29` | Kiểm tra bộ lọc trạng thái đối soát | `29_220_011` |
| `Baocao_30` | Kiểm tra bộ lọc trạng thái thanh toán | `29_220_012` |
| `Baocao_31` | Kiểm tra giao diện drawer Chi tiết đối soát PO | `29_220_013` |
| `Baocao_32` | Kiểm tra thông tin của Chi tiết đối soát PO | `29_220_014` |
| `Baocao_33` | Kiểm tra giao diện | `29_010_001` |
| `dong49` | Kiểm tra dữ liệu khi xem báo cáo theo tỉnh các tỉnh | `29_230_001` |
| `dong50` | Kiểm tra dữ liệu khi xem báo cáo theo các xã | `29_230_002` |
| `dong51` | Kiểm tra dữ liệu khi xem báo cáo theo các điểm bán | `29_230_003` |
| `Baocao_37` | Kiểm tra lọc Bảng Doanh thu, Lợi nhuận gộp, Biên LN của các tỉnh theo tháng | `29_230_004` |
| `Baocao_38` | Kiểm tra lọc Bảng Doanh thu, Lợi nhuận gộp, Biên LN theo tên Tỉnh/Xã/Điểm bán | `29_230_005` |
| `FUNC_1_13` | Kiểm tra thời gian chốt tồn kho | `29_210_006` |
| `FUNC_1_14` | Kiểm tra phạm vi chốt kho role cấp điểm bán /hub | `29_210_007` |
| `FUNC_1_15` | Kiểm tra phạm vi chốt kho role cấp tỉnh | `29_210_008` |
| `FUNC_1_16` | Kiểm tra phạm vi chốt kho role cấp TCT | `29_210_009` |
| `FUNC_1_17` | Kiểm tra chỉnh sửa phiếu xuất kho nháp sau khi chốt kho | `29_210_010` |
| `FUNC_1_18` | Kiểm tra chỉnh sửa phiếu nhập kho nháp sau khi chốt kho | `29_210_011` |
| `FUNC_1_19` | Kiểm tra chốt kho tháng sau, khi chưa chốt kho của tháng trước | `29_210_012` |
| `FUNC_1_20` | Kiểm tra chốt kho tháng nhỏ hơn tháng có phiếu tồn kho đầu kỳ | `29_210_013` |
| `FUNC_1_21` | Kiểm tra chốt kho tháng cũ, sau khi đã thêm phiếu tồn kho đầu kỳ vào tháng mới | `29_210_014` |
| `FUNC_1_22` | Kiểm tra chốt kho hai lần trong cùng 1 tháng | `29_210_015` |
| `FUNC_1_23` | Kiểm tra chốt kho với điểm bán tự chọn | `29_040_001` |
| `FUNC_1_24` | Kiểm tra chốt kho với Toàn bộ phạm vi (gồm cấp dưới) | `29_210_016` |
| `FUNC_1_25` | Kiểm tra chốt kho với Chỉ shop trực thuộc TRỰC TIẾP | `29_210_017` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
