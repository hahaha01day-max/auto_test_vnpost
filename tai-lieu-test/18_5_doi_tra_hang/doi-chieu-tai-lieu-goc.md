# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 18_5 — Đổi trả hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 18_5_doi_tra_hang`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `18_5_doi_tra_hang`
- Tài liệu gốc liên quan: [`uat_vnpost_doi_tra_hang.csv`](../test-case-goc/uat_vnpost_doi_tra_hang.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **25** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **25** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 58 |
| — **tài liệu gốc KHÔNG có** | 37 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 37 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `18_5_010_001` | Mở đổi trả từ chi tiết đơn gốc nạp sẵn đơn | HDSD 010 |
| `18_5_010_002` | Chặn hoàn trả khi chưa chọn đơn gốc | HDSD 010 |
| `18_5_020_002` | Chặn hoàn trả khi bỏ hết hàng khỏi bảng | HDSD 020 |
| `18_5_020_003` | Chỉ thêm được mặt hàng có trong đơn gốc | HDSD 020 |
| `18_5_020_004` | Quà tặng bắt buộc hoàn trả không sửa được số lượng | HDSD 020 |
| `18_5_030_001` | Đổi sang hàng đắt hơn thì chiều tiền là Khách trả | HDSD 030 |
| `18_5_030_003` | Phí trả hàng trừ thẳng vào tiền hoàn | HDSD 030 |
| `18_5_040_001` | Màn xử lý quà tặng chỉ mở khi cần | HDSD 040 |
| `18_5_050_002` | Đơn hoàn trả đã chốt thì không sửa được | HDSD 050 |
| `18_5_050_003` | Đơn gốc quá hạn thì đơn hoàn trả nằm ở Chờ duyệt | HDSD 050 |
| `18_5_060_001` | Tra cứu đơn hoàn trả theo khoảng thời gian và mã đơn | HDSD 060 |
| `18_5_060_002` | Xuất Excel danh sách hoàn trả theo bộ lọc hiện tại | HDSD 060 |
| `18_5_060_003` | Mã đơn hàng và mã đơn trả mở hai màn khác nhau | HDSD 060 |
| `18_5_070_001` | Lọc đơn Chờ duyệt và ba biểu tượng hành động | HDSD 070 |
| `18_5_070_003` | Từ chối đơn hoàn trả quá hạn | HDSD 070 |
| `18_5_080_001` | Chi tiết đơn trả hàng hiện đủ chỉ tiêu tiền | HDSD 080 |
| `18_5_080_002` | Khối Sản phẩm trả hàng hiện đủ cột | HDSD 080 |
| `18_5_PQ_001` | Vai giao dịch viên không duyệt được đơn hoàn trả quá hạn | HDSD |
| `18_5_110_004` | Chặn khi không tìm thấy thành phần của combo | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_001` | Chặn hoàn trả khi ca hiện tại chưa gắn quầy thu ngân | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_002` | Chặn khi không đủ lô để hoàn đúng số lượng | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_003` | Chặn khi không đủ serial để hoàn | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_004` | Chặn số lượng hoàn theo serial không phải số nguyên | Code BE + kỹ thuật 3.4 #4 |
| `18_5_140_005` | Chặn khi serial nhập không tồn tại | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_006` | Chặn khi biến thể hoàn không khớp dòng đơn gốc | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_007` | Chặn khi không xác định được thời gian tạo đơn gốc | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_008` | Chặn đổi hàng khi đơn hoàn trả đang chờ duyệt | Code BE ReturnOrderServiceImpl — PodException |
| `18_5_140_009` | Chặn duyệt đơn hoàn không thuộc điểm bán hiện tại | Code BE + kỹ thuật 3.4 #10 |
| `18_5_140_010` | Chặn duyệt đơn hoàn không ở trạng thái chờ duyệt | Code BE + kỹ thuật 3.4 #6 |
| `18_5_150_001` | Phí trả hàng nhận giá trị âm | Kỹ thuật 3.4 #3 — giá trị âm |
| `18_5_150_002` | Phí trả hàng lớn hơn tiền hoàn | Kỹ thuật 3.4 #3 — giá trị biên |
| `18_5_150_003` | Số lượng trả bằng 0 | Kỹ thuật 3.4 #3 — biên 0 |
| `18_5_160_001` | Phân trang danh sách đơn hoàn trả | Kỹ thuật 3.4 #7 — phân trang |
| `18_5_160_002` | Danh sách đơn hoàn trả rỗng | Kỹ thuật 3.4 #7 — trạng thái rỗng |
| `18_5_160_003` | Tổ hợp bộ lọc trên danh sách đơn hoàn trả | Kỹ thuật 3.4 #7 — tổ hợp bộ lọc |
| `18_5_160_004` | Tìm kiếm đơn hoàn trả bằng ký tự đặc biệt | Kỹ thuật 3.4 #8 — ký tự đặc biệt |
| `18_5_PQ_002` | Vai bưu điện xã không xem được đơn hoàn trả của điểm bán | Kỹ thuật 3.4 #10 — phạm vi theo vai |

## 5. Bảng đối chiếu đầy đủ 25 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_DOITRA__1` | Kiểm tra trả hàng toàn bộ | `18_5_050_001` |
| `FUNC_DOITRA__2` | Kiểm tra trả hàng một phần | `18_5_020_001` |
| `FUNC_DOITRA__3` | Kiểm tra cấu hình thời gian đổi trả (chưa quá hạn trả hàng) | `18_5_050_001` |
| `FUNC_DOITRA__4` | Kiểm tra cấu hình thời gian đổi trả hàng (quá hạn trả hàng) | `18_5_010_003` |
| `FUNC_DOITRA__5` | Kiểm tra duyệt vượt quyền (Admin phê duyệt cho phép đổi trả hàng khi quá hạn) thành công | `18_5_070_002` |
| `FUNC_DOITRA__6` | Kiểm tra duyệt vượt quyền (Admin phê duyệt cho phép đổi trả hàng khi quá hạn) thất bại | `18_5_070_002` |
| `FUNC_DOITRA__7` | Kiểm tra hoàn trả khi đơn hàng không tồn trong hệ thống | `18_5_010_004` |
| `FUNC_DOITRA__8` | Kiểm tra hoàn trả khi đơn hàng có áp dụng giảm giá toàn đơn hàng | `18_5_030_002` |
| `FUNC_DOITRA__9` | Kiểm tra hoàn trả khi đơn hàng có áp dụng giảm giá theo sản phẩm trong đơn hàng | `18_5_030_002` |
| `FUNC_DOITRA__10` | Kiểm tra hoàn trả khi đơn hàng nợ toàn bộ (thanh toán sau) | `18_5_090_001` |
| `FUNC_DOITRA__11` | Kiểm tra hoàn trả khi đơn hàng nợ một phần (trả góp) | `18_5_090_002` |
| `FUNC_DOITRA__12` | Kiểm tra hoàn trả khi đơn hàng ở trạng thái đơn nháp | `18_5_090_003` |
| `FUNC_DOITRA__13` | Kiểm tra hoàn trả khi đơn hàng ở trạng thái Đơn hủy | `18_5_090_004` |
| `FUNC_DOITRA__14` | Kiểm tra hoàn trả toàn bộ khi đơn hàng có VAT | `18_5_100_001` |
| `FUNC_DOITRA__15` | Kiểm tra hoàn trả một phần khi đơn hàng có VAT | `18_5_100_002` |
| `FUNC_DOITRA__16` | Kiểm tra hoàn trả hàng combo (Clawback logic) - Khi phá vỡ combo (trả sản phẩm trong combo) | `18_5_110_001` |
| `FUNC_DOITRA__17` | Kiểm tra hoàn trả hàng combo (Clawback logic) - Khi phá vỡ combo (trả sản phẩm còn lại trong combo) | `18_5_110_002` |
| `FUNC_DOITRA__18` | Kiểm tra hoàn trả combo (Clawback logic) - Mua từ 2 combo trở lên cùng loại | `18_5_110_003` |
| `FUNC_DOITRA__19` | Kiểm tra hoàn trả hàng quà tặng - thu hồi quà tặng | `18_5_040_002` |
| `FUNC_DOITRA__20` | Kiểm tra trả hàng quà tặng - khấu trừ giá trị quà tặng | `18_5_040_002` |
| `FUNC_DOITRA__21` | Kiểm tra Hủy đơn hàng | `18_5_090_005` |
| `FUNC_DOITRA__22` | Kiểm tra thu hồi điểm khi trả hàng | `18_5_120_001` |
| `FUNC_DOITRA__23` | Kiểm tra hoàn điểm sử dụng khi trả hàng | `18_5_120_002` |
| `FUNC_DOITRA__24` | Kiểm tra cấu hình ngưỡng tiền hoàn trả bất thường (tiền mặt) | `18_5_130_001` |
| `FUNC_DOITRA__25` | Kiểm tra lý do trả hàng | `18_5_130_002` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
