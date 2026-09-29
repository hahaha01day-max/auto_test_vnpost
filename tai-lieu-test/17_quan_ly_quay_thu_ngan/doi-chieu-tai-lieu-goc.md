# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 17 — Quản lý quầy thu ngân

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 17_quan_ly_quay_thu_ngan`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `17_quan_ly_quay_thu_ngan`
- Tài liệu gốc liên quan: [`uat_vnpost_ban_hang.csv`](../test-case-goc/uat_vnpost_ban_hang.csv) · [`uat_vnpost_tai_chinh.csv`](../test-case-goc/uat_vnpost_tai_chinh.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **28** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **25** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **3** |
| Case đã dựng trong `test-cases.csv` | 64 |
| — **tài liệu gốc KHÔNG có** | 43 |

**Độ phủ tài liệu gốc: 89%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 3 case

🔴 **Đây là việc phải làm.** Mỗi dòng là một case sheet QC có mà kịch bản còn thiếu.

| Mã gốc | Nhóm | Tình huống | Kết quả mong muốn (rút gọn) |
|---|---|---|---|
| `TaiChinh_2` | Tổng quan | Kiểm tra phân loại phiếu thu | - Hiển thị danh sách các loại phiếu thu phát sinh trong của hàng ở báo cáo phiếu thu |
| `TaiChinh_3` | Tổng quan | Kiểm tra phân loại phiếu chi | - Hiển thị danh sách các loại phiếu thu phát sinh trong của hàng ở báo cáo phiếu chi |
| `TaiChinh_4` | Tổng quan | Kiểm tra bộ lọc thời gian | - Hiển thị danh sách các loại phiếu , số tiền tương ứng với thời gian |

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 43 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `17_010_001` | Màn Quản lý quầy thu ngân mở được | HDSD 010 |
| `17_010_002` | Cấp trên điểm bán phải chọn điểm bán trước mới thêm quầy được | HDSD 010 |
| `17_010_009` | Tên quầy đúng 255 ký tự lưu được | Quét kỹ thuật 3.4 |
| `17_010_010` | Tên quầy 256 ký tự bị chặn hoặc cắt còn 255 | Quét kỹ thuật 3.4 |
| `17_010_011` | Mã quầy đúng 100 ký tự lưu được, 101 ký tự bị chặn | Quét kỹ thuật 3.4 |
| `17_010_013` | Trùng mã với quầy ĐÃ NGỪNG hoạt động vẫn cho phép | Quét kỹ thuật 3.4 |
| `17_010_015` | Phân trang danh sách quầy thu ngân | Quét kỹ thuật 3.4 |
| `17_010_016` | Điểm bán chưa có quầy nào thì hiện trạng thái rỗng | Quét kỹ thuật 3.4 |
| `17_020_012` | Tìm quầy không phân biệt hoa thường và dấu | Quét kỹ thuật 3.4 |
| `17_030_001` | Ngừng hoạt động quầy | HDSD 030 |
| `17_030_002` | Kích hoạt lại quầy đã ngừng | HDSD 030 |
| `17_030_003` | Ngừng quầy khi còn ca chưa chốt bị chặn | HDSD 030 + trace PodErrorCode.java:201 |
| `17_040_002` | Cấp tiền cho quỹ của quầy | HDSD 040 |
| `17_040_003` | Quầy đã ngừng thì sổ quỹ bị khoá | HDSD 040 |
| `17_050_001` | Chuyển tiền giữa hai quỹ cùng điểm bán | HDSD 050 |
| `17_050_002` | Chặn chuyển quá số dư thực có | HDSD 050 |
| `17_050_003` | Chặn chuyển quỹ giữa hai điểm bán khác nhau | HDSD 050 |
| `17_050_004` | Chặn chuyển quỹ khi Quỹ chuyển trùng Quỹ nhận | Quét kỹ thuật 3.4 |
| `17_050_005` | Chặn chuyển quỹ với số tiền bằng 0 | Quét kỹ thuật 3.4 |
| `17_050_006` | Chặn chuyển quỹ với số tiền âm | Quét kỹ thuật 3.4 |
| `17_050_007` | Chọn Loại quỹ Chuyển khoản thì hiện ô chọn ngân hàng | Quét kỹ thuật 3.4 |
| `17_050_008` | Chặn khi chọn Chuyển khoản mà bỏ trống ngân hàng | Quét kỹ thuật 3.4 |
| `17_050_009` | Ô Số tiền chuyển tự chấm phân cách hàng nghìn | Quét kỹ thuật 3.4 |
| `17_PQ_001` | Vai giao dịch viên không khai báo được quầy | HDSD |
| `17_010_017` | Bỏ trống Tên quầy bị chặn | Kỹ thuật 1 - ô bắt buộc + trace ModalAddOrUpdateCounter.jsx:69 |
| `17_010_018` | Bỏ trống Mã quầy bị chặn | Kỹ thuật 1 - ô bắt buộc + trace ModalAddOrUpdateCounter.jsx:76 |
| `17_010_019` | Tên quầy vượt 255 ký tự bị cắt | Kỹ thuật 3 - giá trị biên + trace ModalAddOrUpdateCounter.jsx:71 |
| `17_010_020` | Mã quầy vượt 100 ký tự bị cắt | Kỹ thuật 3 - giá trị biên + trace ModalAddOrUpdateCounter.jsx:78 |
| `17_010_021` | Trùng MÃ quầy trong cùng điểm bán bị chặn | HDSD 010 + trace PodErrorCode.java:199 |
| `17_010_022` | Thiếu shopId khi gọi API tạo quầy bị chặn | Kỹ thuật 1 - ô bắt buộc + trace CashierCounterServiceImpl.java |
| `17_020_014` | Thiếu counterId khi gọi API sửa quầy bị chặn | Kỹ thuật 1 - ô bắt buộc + trace CashierCounterServiceImpl.java:36 |
| `17_020_015` | Sửa quầy không tồn tại bị chặn | Kỹ thuật 4 - kiểu dữ liệu sai + trace PodErrorCode.java:200 |
| `17_030_004` | Hộp xác nhận ngừng quầy nêu rõ hệ quả khoá quỹ | Trace CashierCounterPage.jsx:53-57 |
| `17_030_005` | Hộp xác nhận kích hoạt lại nêu rõ mở lại quỹ | Trace CashierCounterPage.jsx:77-80 |
| `17_030_006` | Đóng hộp xác nhận ngừng quầy không đổi gì | Kỹ thuật 9 - huỷ giữa chừng |
| `17_030_007` | Quầy đã ngừng hiện đúng nhãn và đổi nút | Kỹ thuật 6 - trạng thái x hành động + trace CashierCounterPage.jsx:115,130,138 |
| `17_030_008` | Ngừng quầy không tìm thấy quỹ tiền mặt | Trace PodErrorCode.java:202 |
| `17_040_004` | Bảng quỹ đọc từ API fund-total và get-all | Trace fundService.js:9,116 |
| `17_050_010` | Chuyển quỹ hiện đủ năm trường bắt buộc | Trace ModalTransferFund.jsx:69-219 |
| `17_050_011` | Bỏ trống từng trường của Chuyển quỹ bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `17_050_012` | Số tiền chuyển bằng 0 hoặc âm | Kỹ thuật 3 - giá trị biên |
| `17_050_013` | Chuyển quỹ vượt số dư | Lỗ hổng đặc tả - cần user quyết |
| `17_050_014` | Chuyển quỹ về chính nó | Kỹ thuật 5 - tính duy nhất |

## 5. Bảng đối chiếu đầy đủ 28 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong38` | Kiểm tra thêm mới quầy thu ngân khi bỏ trống tất cả các trường | `17_010_005` |
| `dong39` | Kiểm tra thêm mới quầy thu ngân khi nhập toàn space vào các trường | `17_010_008` |
| `dong40` | Kiểm tra thêm mới quầy thu ngân khi chỉ bỏ trống trường "Tên quầy" | `17_010_006` |
| `dong41` | Kiểm tra thêm mới quầy thu ngân khi chỉ bỏ trống trường "Mã quầy" | `17_010_007` |
| `dong42` | Kiểm tra thêm mới quầy thu ngân khi nhập trùng tên quầy đã tồn tại | `17_010_012` |
| `dong43` | Kiểm tra thêm mới quầy thu ngân khi nhập trùng mã quầy đã tồn tại | `17_010_004` |
| `dong44` | Kiểm tra thêm quầy thu ngân thành công | `17_010_003` |
| `dong45` | Kiểm tra hủy thao tác thêm quầy thu ngân | `17_010_014` |
| `dong47` | Kiểm tra tìm kiếm khi nhập toàn space | `17_020_011` |
| `dong48` | Kiểm tra tìm kiếm khi nhập chính xác tên quầy thu ngân | `17_020_001` |
| `dong49` | Kiểm tra tìm kiếm khi nhập chính xác 1 phần tên quầy thu ngân | `17_020_001` |
| `dong50` | Kiểm tra tìm kiếm khi nhập tên quầy thu ngân không tồn tại | `17_020_010` |
| `dong51` | Kiểm tra tìm kiếm khi nhập chính xác mã quầy thu ngân | `17_020_008` |
| `dong52` | Kiểm tra tìm kiếm khi nhập chính xác 1 phần mã quầy thu ngân | `17_020_009` |
| `dong53` | Kiểm tra tìm kiếm khi nhập mã quầy thu ngân không tồn tại | `17_020_010` |
| `dong55` | Kiểm tra hiển thị dữ liệu khi chọn sửa quầy thu ngân | `17_020_003` |
| `dong56` | Kiểm tra sửa quầy thu ngân khi xóa hết cả 2 trường | `17_020_004` |
| `dong57` | Kiểm tra sửa quầy thu ngân khi chỉnh sửa tên quầy trùng với tên quầy đã tồn tại | `17_020_013` |
| `dong58` | Kiểm tra sửa quầy thu ngân khi chỉnh sửa mã quầy trùng với mã quầy đã tồn tại | `17_020_005` |
| `dong59` | Kiểm tra sửa quầy thu ngân khi không sửa đổi gì | `17_020_006` |
| `dong60` | Kiểm tra sửa quầy thu ngân thành công khi chỉ sửa tên quầy | `17_020_002` |
| `dong61` | Kiểm tra sửa quầy thu ngân thành công khi chỉ sửa mã quầy | `17_020_002` |
| `dong62` | Kiểm tra sửa quầy thu ngân thành công khi sửa cả tên quầy và mã quầy | `17_020_002` |
| `dong63` | Kiểm tra hủy thao tác sửa quầy thu ngân | `17_020_007` |
| `TaiChinh_1` | Kiểm tra Giao diện | `17_040_001` |
| `TaiChinh_2` | Kiểm tra phân loại phiếu thu | — **chưa dựng** |
| `TaiChinh_3` | Kiểm tra phân loại phiếu chi | — **chưa dựng** |
| `TaiChinh_4` | Kiểm tra bộ lọc thời gian | — **chưa dựng** |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

> Cập nhật 19/09/2026 — phiên bổ sung trace code.

### 6.1 ✅ Mâu thuẫn HDSD ↔ sheet QC đã giải quyết

`dong42` và `dong57` đòi **chặn trùng TÊN quầy**; HDSD 010 chỉ ràng buộc **MÃ**. Trace
`PodErrorCode.java:203` cho ra `COUNTER_NAME_EXISTED` — *"Tên quầy thu ngân đã tồn tại"* (`COUNTER-005`),
ném ở `CashierCounterServiceImpl.java:38` (tạo) và `:65` (sửa).

⇒ 🔴 **Sheet QC đúng, HDSD tả thiếu ràng buộc.** Case `17_010_012` và `17_020_013` đã viết lại kỳ vọng
từ *"chạy để phơi hành vi thật"* thành **"bị chặn kèm thông báo nguyên văn"**. Nên báo người viết HDSD.

### 6.2 🔴 Ba case gốc còn lại KHÔNG thuộc phân hệ này — đề xuất đổi ánh xạ

| Mã gốc | Tình huống | Thuộc về |
|---|---|---|
| `TaiChinh_2` | Kiểm tra phân loại phiếu thu — *"hiển thị danh sách các loại phiếu thu ... ở **báo cáo phiếu thu**"* | `26_phieu_thu` |
| `TaiChinh_3` | Kiểm tra phân loại phiếu chi — *"... ở **báo cáo phiếu chi**"* | `26_phieu_thu` (hoặc phân hệ Phiếu chi chưa lập — xem câu hỏi CHẶN 1 handoff) |
| `TaiChinh_4` | Kiểm tra bộ lọc thời gian của báo cáo đó | `26_phieu_thu` |

Màn **Quản lý quầy thu ngân** (`/finance/cashier-counter`) và **Quản lý quỹ** (`/finance/fund`)
🚫 **không có báo cáo phiếu thu / phiếu chi nào**. Theo luật 1 mục 4 handoff (🚫 không ép khớp) nên
để trống `Ma goc` thay vì nhét bừa vào `17`.

**Đề xuất cần user duyệt:** sửa `tool/core/goc-mapping.js` chuyển nhóm *"Tổng quan"* của sheet
`tai_chinh` — trừ `TaiChinh_1` (bảng quỹ, đúng là của `17`) — sang `26_phieu_thu`. 🚫 Chưa tự sửa vì
việc này đổi mẫu số của **hai** phân hệ cùng lúc.

### 6.3 🔴 Còn treo: chuyển quỹ vượt số dư

`ShopFundService.java` 🚫 **không ném một `PodException` nào** (grep trọn file, 0 kết quả). Nếu không
có lớp chặn nào khác thì **quỹ âm được**. Case `17_050_013` để phơi hành vi thật.

Cùng nhóm: `ShopFundController` có **14 endpoint** nhưng HDSD 17 chỉ tả **2 việc** (cấp quỹ, chuyển
quỹ) ⇒ 7 endpoint chưa có case nào. Xem mục 5c của `test-cases.md`.
