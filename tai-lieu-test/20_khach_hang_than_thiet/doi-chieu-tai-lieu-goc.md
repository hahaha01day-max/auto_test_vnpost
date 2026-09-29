# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 20 — Khách hàng thân thiết

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 20_khach_hang_than_thiet`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `20_khach_hang_than_thiet`
- Tài liệu gốc liên quan: [`uat_vnpost_ct_loyalty.csv`](../test-case-goc/uat_vnpost_ct_loyalty.csv) · [`uat_vnpost_doi_tra_hang.csv`](../test-case-goc/uat_vnpost_doi_tra_hang.csv) · [`uat_vnpost_loyalty.csv`](../test-case-goc/uat_vnpost_loyalty.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **52** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **47** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **5** |
| Case đã dựng trong `test-cases.csv` | 104 |
| — **tài liệu gốc KHÔNG có** | 52 |

**Độ phủ tài liệu gốc: 90%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 5 case

🔴 **Đây là việc phải làm.** Mỗi dòng là một case sheet QC có mà kịch bản còn thiếu.

| Mã gốc | Nhóm | Tình huống | Kết quả mong muốn (rút gọn) |
|---|---|---|---|
| `FUNC_DOITRA__26` | Kiểm tra chức năng đổi điểm | Kiểm tra đổi hàng - đổi sản phẩm mới giá trị > sản phẩm trả hàng | 1. Phiếu trả: TH_202606_0019 được tạo 2. Trạng thái đơn hàng: Đã thanh toán 3. Hiển thị mã đơn hàng mới (mã đơ |
| `FUNC_DOITRA__27` | Kiểm tra chức năng đổi điểm | Kiểm tra đổi hàng - đổi sản phẩm mới giá trị < sản phẩm trả hàng | 1. Phiếu trả: TH_202606_0020 được tạo 2. Trạng thái đơn hàng: Đã thanh toán 3. Hiển thị mã đơn hàng mới (mã đơ |
| `FUNC_DOITRA__28` | Kiểm tra chức năng đổi điểm | Kiểm tra đổi hàng - đổi sản phẩm mới giá trị = sản phẩm trả hàng | 1. Phiếu trả: TH_202606_0021 được tạo 2. Trạng thái đơn hàng: Đã thanh toán 3. Hiển thị mã đơn hàng mới (mã đơ |
| `FUNC_DOITRA__29` | Kiểm tra chức năng đổi điểm | Kiểm tra đổi hàng - sản phẩm trả và sản phẩm đổi cùng 1 loại | 1. Phiếu trả: TH_202606_0022 được tạo 2. Trạng thái đơn hàng: Đã thanh toán 3. Hiển thị mã đơn hàng mới (mã đơ |
| `FUNC_DOITRA__30` | Kiểm tra chức năng đổi điểm | Kiểm tra đổi hàng - sản phẩm trả và sản phẩm đổi khác loại | 1. Phiếu trả: TH_202606_0023 được tạo 2. Trạng thái đơn hàng: Đã thanh toán 3. Hiển thị mã đơn hàng mới (mã đơ |

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 52 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `20_010_001` | Mở form Thêm chương trình tích điểm | HDSD 010 |
| `20_010_015` | Đặt ngày bắt đầu ở tương lai rồi bật công tắc | Trace code DrawerUpdateCampaign.jsx:311-316 |
| `20_010_016` | Đặt ngày kết thúc bằng hôm nay rồi bật công tắc | Trace code DrawerUpdateCampaign.jsx:327-332 |
| `20_010_021` | Gõ chữ vào ô Số tiền chi tiêu | Kỹ thuật 3.4 mục 4 |
| `20_010_022` | Nhập số tiền chi tiêu rất lớn | Kỹ thuật 3.4 mục 3 |
| `20_010_023` | Tích ngành hàng nhưng để trống danh mục | HDSD 010 lưu ý 5 |
| `20_010_024` | Đổi loại danh mục sau khi đã chọn danh mục | Trace code DrawerUpdateCampaign.jsx:744-750 |
| `20_010_025` | Chọn trùng một nhóm khách hàng hai lần | HDSD 010 mẹo 1 |
| `20_010_026` | Chọn Nhóm khách hàng nhưng để bảng trống | HDSD 91 sự cố |
| `20_010_027` | Xoá một nhóm khách hàng khỏi bảng đã chọn | Trace code DrawerUpdateCampaign.jsx:211-227 |
| `20_010_028` | Tìm nhóm khách hàng bằng chữ thường và không dấu | Kỹ thuật 3.4 mục 8 |
| `20_010_029` | Cuộn danh sách nhóm khách hàng để tải thêm | Kỹ thuật 3.4 mục 7 |
| `20_010_030` | Bấm Hủy giữa chừng khi đang tạo chương trình tích điểm | Kỹ thuật 3.4 mục 9 |
| `20_010_031` | Tắt công tắc khi đang TẠO MỚI chương trình tích điểm | HDSD 010 lưu ý 3 |
| `20_010_032` | Tạo chương trình tích điểm khi đã có chương trình đang hoạt động | Trace code CampaignService.java:145-149 |
| `20_020_001` | Mở form Thêm chương trình đổi điểm | HDSD 020 |
| `20_020_007` | Đặt ngày bắt đầu tương lai cho chương trình đổi điểm rồi bật công tắc | Trace code DrawerUpdateRedeemCampaign.jsx:84-89 |
| `20_020_008` | Đặt ngày kết thúc bằng hôm nay cho chương trình đổi điểm rồi bật công tắc | Trace code DrawerUpdateRedeemCampaign.jsx:94-99 |
| `20_020_009` | Đặt ngày kết thúc đã qua cho chương trình đổi điểm rồi bật công tắc | Trace code DrawerUpdateRedeemCampaign.jsx:94-99 |
| `20_020_010` | Ô số tiền tối thiểu bị khoá cho tới khi tích ô Giá trị đơn hàng tối thiểu | HDSD 020 bước 4 |
| `20_020_011` | Bấm Đóng giữa chừng ở form đổi điểm | Kỹ thuật 3.4 mục 9 |
| `20_020_012` | Tạo chương trình đổi điểm khi đã có chương trình đang hoạt động | Trace code RedeemCampaignService.java checkCampaignActive |
| `20_030_001` | Phạm vi áp dụng mặc định là Toàn hệ thống | HDSD 030 |
| `20_030_002` | Chọn phạm vi cụ thể nhưng không tích đơn vị nào | HDSD 030 lưu ý 1 |
| `20_030_003` | Khai phạm vi tới cấp Bưu điện tỉnh | HDSD 030 |
| `20_030_004` | Cột Cấp xã phường khi chưa chọn tỉnh | HDSD 030 lưu ý 3 |
| `20_030_005` | Cột Điểm bán khi chưa chọn xã phường | HDSD 030 lưu ý 3 |
| `20_030_006` | Đổi cấp Áp dụng cho sau khi đã tích đơn vị | HDSD 030 lưu ý 2 |
| `20_030_007` | Lọc nhanh bằng ô Hiển thị các đơn vị đã chọn | HDSD 030 mẹo |
| `20_030_008` | Đóng form khi đang khai phạm vi dở dang | HDSD 030 lưu ý 4 |
| `20_030_009` | Tìm đơn vị trong cột Cấp tỉnh | Kỹ thuật 3.4 mục 8 |
| `20_030_010` | Điểm bán ngoài phạm vi áp dụng khi bán hàng | Trace code CampaignController.checkCampaignScope |
| `20_040_001` | Mở màn Quản lý chiến dịch Loyalty | HDSD 040 |
| `20_040_002` | Kiểm tra control chính màn Loyalty | HDSD 040 |
| `20_040_005` | Nhãn hiển thị trên màn chi tiết tích điểm đúng nguyên văn | Trace code DrawerDetailCampaign.jsx:96 |
| `20_040_010` | Bật lại chương trình có ngày kết thúc đã qua | HDSD 040 lưu ý 2 |
| `20_040_011` | Hai thẻ loại tích điểm luôn hiện ở màn Cập nhật | HDSD 040 bước 3 |
| `20_040_012` | Đổi loại tích điểm từ Đơn hàng sang Sản phẩm khi sửa | HDSD 040 lưu ý 4 |
| `20_040_013` | Sửa tỷ lệ tích điểm không tính lại đơn cũ | HDSD 92 FAQ |
| `20_040_014` | Không có nút xoá chương trình trên màn hình | Trace code CampaignController + HDSD 92 |
| `20_040_015` | Mở lại màn Cập nhật sau khi đã lưu phạm vi cụ thể | HDSD 040 lưu ý 3 |
| `20_050_020` | Tích điểm theo ngành hàng chỉ tính sản phẩm thuộc danh mục đã chọn | Trace code calculateLoyaltyAmountFromItems |
| `20_050_021` | Tỷ lệ tích điểm bằng 0 làm đơn không tích điểm mà không báo gì | Kỹ thuật 3.4 mục 11 |
| `20_050_022` | Điểm tích được làm tròn xuống | Kỹ thuật 3.4 mục 3 |
| `20_050_023` | Chương trình chưa tới ngày bắt đầu hoặc đã hết hạn thì không tích điểm | Trace code calculatePointRes dòng 381-389 |
| `20_060_004` | Số tiền đổi điểm lớn hơn giá trị đơn | Trace code calculateLoyaltyAmountRes |
| `20_060_005` | Dùng điểm khi chương trình đổi điểm chưa tới ngày bắt đầu | Trace code RedeemCampaignService |
| `20_060_006` | Dùng điểm khi chương trình đổi điểm đã kết thúc | Trace code RedeemCampaignService |
| `20_060_008` | Dùng điểm ở điểm bán ngoài phạm vi áp dụng | Trace code RedeemCampaignService |
| `20_070_002` | Điểm bán chưa bật cấu hình khách hàng thân thiết | HDSD 91 sự cố |
| `20_070_003` | Giao dịch viên mở màn Chiến dịch Loyalty | Kỹ thuật 3.4 mục 10 |
| `20_070_004` | Cấu hình chương trình là của toàn chain chứ không theo điểm bán | Trace code CampaignController + CampaignService |

## 5. Bảng đối chiếu đầy đủ 52 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_LOYALTY__1` | Kiểm tra Thêm chương trình tích điểm áp dụng theo đơn hàng thành công | `20_010_003` |
| `FUNC_LOYALTY__2` | Kiểm tra thêm chương trình tích điểm áp dụng theo sản phẩm thành công | `20_010_004` |
| `FUNC_LOYALTY__3` | Kiểm tra chương trình tự động 'Đang hoạt động' khi thời gian bắt đầu = hiện tại | `20_040_004` |
| `FUNC_LOYALTY__4` | Kiểm tra hương trình ở trạng thái 'Ngừng hoạt động' khi thời gian bắt đầu là tương lai | `20_040_004` |
| `FUNC_LOYALTY__5` | Kiểm tra chương trình tích điểm theo đơn hàng khi áp dụng điều kiện giá trị đơn hàng tối thiểu | `20_010_005` |
| `FUNC_LOYALTY__6` | Kiểm tra chương trình tích điểm theo sản phẩm khi áp dụng điều kiện giá trị đơn hàng tối thiểu | `20_010_006` |
| `FUNC_LOYALTY__7` | Kiểm tra chương trình tích điểm theo đơn hàng khi áp dụng điều kiện "Không tích điểm cho sản phẩm giảm giá" (khi tick chọn) | `20_010_007` |
| `FUNC_LOYALTY__8` | Kiểm tra chương trình tích điểm theo sản phẩm khi áp dụng điều kiện "Không tích điểm cho sản phẩm giảm giá" (khi tick chọn) | `20_010_008` |
| `FUNC_LOYALTY__9` | Kiểm tra chương trình tích điểm theo đơn hàng khi áp dụng điều kiện "Không tích điểm cho hóa đơn giảm giá" (khi tick chọn) | `20_010_009` |
| `FUNC_LOYALTY__10` | Kiểm tra chương trình tích điểm theo sản phẩm khi áp dụng điều kiện "Không tích điểm cho hóa đơn giảm giá" (khi tick chọn) | `20_010_010` |
| `FUNC_LOYALTY__11` | Kiểm tra chương trình tích điểm theo đơn hàng không tích điểm cho hóa đơn thanh toán bằng điểm thưởng (khi tick chọn) | `20_010_011` |
| `FUNC_LOYALTY__12` | Kiểm tra chương trình tích điểm theo sản phẩm không tích điểm cho hóa đơn thanh toán bằng điểm thưởng (khi tick chọn) | `20_010_012` |
| `FUNC_LOYALTY__13` | Kiểm tra giới hạn phạm vi áp dụng theo nhóm khách hàng cụ thể | `20_010_013`, `20_050_019` |
| `FUNC_LOYALTY__14` | Kiểm tra Bật/Tắt toggle chương trình tích điểm | `20_040_007`, `20_040_008` |
| `FUNC_LOYALTY__15` | [NEG] Kiểm tra tạo chương trình tích điểm không nhập thời gian bắt đầu | `20_010_002` |
| `FUNC_LOYALTY__16` | [NEG] Kiểm tra nhập thời gian bắt đầu là ngày trong quá khứ | `20_010_014` |
| `FUNC_LOYALTY__17` | [NEG] Kiểm tra nhập thời gian kết thúc trước thời gian bắt đầu | `20_010_017` |
| `FUNC_LOYALTY__18` | [NEG] Kiểm tra nhập tỷ lệ tích điểm = 0 hoặc số âm | `20_010_018`, `20_010_019` |
| `FUNC_LOYALTY__19` | [NEG] Kiểm tra bỏ trống tỷ lệ tích điểm | `20_010_002`, `20_010_020` |
| `FUNC_LOYALTY__20` | Kiểm thêm chương trình đổi điểm thành công (happy path) | `20_020_003` |
| `FUNC_LOYALTY__21` | Kiểm tra chương trình đổi điểm tự động kích hoạt khi đến thời gian bắt đầu tương lai | `20_040_004` |
| `FUNC_LOYALTY__22` | Kiểm tra điều kiện giá trị đơn hàng tối thiểu để được đổi điểm | `20_060_001`, `20_060_002` |
| `FUNC_LOYALTY__23` | Kiểm tra tắt chương trình đổi điểm bằng toggle | `20_040_009`, `20_060_007` |
| `FUNC_LOYALTY__24` | Kiểm tra xem chi tiết chương trình đổi điểm hiển thị đúng thông tin | `20_040_003`, `20_040_006` |
| `FUNC_LOYALTY__25` | [NEG] Kiểm tra tạo chương trình đổi điểm không nhập thời gian bắt đầu | `20_020_002` |
| `FUNC_LOYALTY__26` | [NEG] Nhập thời gian bắt đầu là ngày quá khứ | `20_020_006` |
| `FUNC_LOYALTY__27` | [NEG] Nhập tỷ lệ đổi điểm = 0 hoặc số âm | `20_020_004`, `20_020_005` |
| `FUNC_LOYALTY__28` | [NEG] Khách hàng không đủ điểm để đổi vẫn cố gắng đổi điểm | `20_060_003` |
| `FUNC_LOYALTY__29` | [NEG] Thêm mới khi không có quyền | `20_070_001` |
| `FUNC_DOITRA__26` | Kiểm tra đổi hàng - đổi sản phẩm mới giá trị > sản phẩm trả hàng | — **chưa dựng** |
| `FUNC_DOITRA__27` | Kiểm tra đổi hàng - đổi sản phẩm mới giá trị < sản phẩm trả hàng | — **chưa dựng** |
| `FUNC_DOITRA__28` | Kiểm tra đổi hàng - đổi sản phẩm mới giá trị = sản phẩm trả hàng | — **chưa dựng** |
| `FUNC_DOITRA__29` | Kiểm tra đổi hàng - sản phẩm trả và sản phẩm đổi cùng 1 loại | — **chưa dựng** |
| `FUNC_DOITRA__30` | Kiểm tra đổi hàng - sản phẩm trả và sản phẩm đổi khác loại | — **chưa dựng** |
| `dong15` | Kiểm tra tích điểm khi cấu hình tích điểm chỉ áp dụng điều kiện giá trị đơn hàng tối thiểu | `20_050_001` |
| `dong16` |  | `20_050_002` |
| `dong17` |  | `20_050_003` |
| `dong18` | Kiểm tra tích điểm khi cấu hình tích điểm chỉ áp dụng điều kiện không tích điểm cho sản phẩm giảm giá | `20_050_004` |
| `dong19` |  | `20_050_005` |
| `dong20` |  | `20_050_006` |
| `dong21` | Kiểm tra tích điểm khi cấu hình tích điểm chỉ áp dụng điều kiện không tích điểm cho hóa đơn giảm giá | `20_050_007` |
| `dong22` |  | `20_050_008` |
| `dong23` | Kiểm tra tích điểm khi cấu hình tích điểm chỉ áp dụng điều kiện không tích điểm cho hóa đơn thanh toán bằng điểm thưởng | `20_050_009` |
| `dong24` |  | `20_050_010` |
| `dong25` | Kiểm tra tích điểm khi cấu hình tích điểm áp dụng điều kiện Giá trị đơn hàng tối thiểu và Không tích điểm cho sản phẩm giảm giá | `20_050_011` |
| `dong26` |  | `20_050_012` |
| `dong27` |  | `20_050_013` |
| `dong28` |  | `20_050_014` |
| `dong29` | Kiểm tra tích điểm khi cấu hình tích điểm áp dụng điều kiện Giá trị đơn hàng tối thiểu và Không tích điểm cho hóa đơn giảm giá | `20_050_015` |
| `dong30` |  | `20_050_016` |
| `dong31` |  | `20_050_017` |
| `dong32` |  | `20_050_018` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_

## 6. Nhận xét thủ công — 19/09/2026

**5 case còn lại KHÔNG thuộc phân hệ này, 🚫 đừng dựng ở đây.**
`FUNC_DOITRA__26`–`30` nằm trong `uat_vnpost_doi_tra_hang.csv` dưới tiêu đề nhóm *"Kiểm tra chức năng
đổi điểm"*, nên `goc-mapping.js` khớp nhầm về phân hệ 20. Nội dung thật của cả 5 case là **đổi hàng**:
tạo phiếu trả `TH_2026xx_xxxx`, sinh đơn hàng mới, so giá trị sản phẩm trả với sản phẩm đổi — không
chạm chương trình tích điểm/đổi điểm ở bất kỳ bước nào. Đúng chỗ của chúng là `18_5_doi_tra_hang`.
⇒ Cần user duyệt việc sửa luật ánh xạ trong `tool/core/goc-mapping.js`; trước khi sửa thì độ phủ của
phân hệ 20 dừng ở **47/52 = 90%** và 🚫 không được ép khớp để làm đẹp số.

**Kỳ vọng sheet QC đã viết lại, 🚫 không chép nguyên:**

- `FUNC_LOYALTY__16` / `FUNC_LOYALTY__26` đòi lỗi *"Thời gian bắt đầu phải từ hiện tại trở đi"* —
  chuỗi này không có trong mã nguồn; code chỉ chặn ngày bắt đầu ở **tương lai**. Case `20_010_014`,
  `20_020_006` viết theo hành vi thật và ghi rõ mâu thuẫn.
- `FUNC_LOYALTY__18` / `FUNC_LOYALTY__27` đòi *"Tỷ lệ tích điểm phải lớn hơn 0"* — màn **đổi điểm** có
  chuỗi tương đương (`Số tiền chi tiêu phải lớn hơn 0`), màn **tích điểm** thì không: giá trị 0 lưu được
  và làm mọi đơn tích 0 điểm trong im lặng. Case `20_010_018` + hệ quả ở `20_050_021`.
- `FUNC_LOYALTY__28` đòi *"Số điểm không đủ (cần 100, hiện có 50)"* — code trả chung
  `Điều kiện không hợp lệ để sử dụng điểm thưởng` cho cả thiếu điểm lẫn dưới mức tối thiểu.
- `FUNC_LOYALTY__17` đòi *"Thời gian kết thúc phải sau thời gian bắt đầu"* — FE dùng
  `DatePicker.RangePicker` nên không chọn ngược được; không có thông báo nào.
- `dong17`, `dong20`, `dong27`, `dong28`, `dong31`, `dong32` **bỏ trống ô kết quả mong muốn** trong
  sheet. Kỳ vọng được suy từ công thức trong `CampaignService.calculatePointRes` (chép trong
  `test-cases.md` mục 4), 🚫 không đoán.

**Cách kiểm chứng của sheet không dùng được.** Cả 18 case `dong15`–`dong32` kết thúc bằng
*"Kiểm tra lịch sử tích điểm: Khách hàng → chi tiết khách hàng → Lịch sử tích điểm"*. Màn này **không tồn
tại** trong `vnpost-web` (grep chuỗi "Lịch sử tích điểm" ra 0 kết quả); chỗ duy nhất đọc được số điểm là
dòng `Điểm hiện tại: <số>` ở `CustomerRank.jsx`. ⇒ Mỗi case phải bán **một đơn duy nhất** rồi so số dư
trước/sau, không gộp nhiều đơn trong một phiên.
