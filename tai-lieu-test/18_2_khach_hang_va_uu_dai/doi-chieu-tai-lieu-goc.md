# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 18_2 — Khách hàng và ưu đãi tại quầy

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 18_2_khach_hang_va_uu_dai`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `18_2_khach_hang_va_uu_dai`
- Tài liệu gốc liên quan: [`uat_vnpost_ct_loyalty.csv`](../test-case-goc/uat_vnpost_ct_loyalty.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **10** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **10** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 115 |
| — **tài liệu gốc KHÔNG có** | 105 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 105 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `18_2_010_001` | Tạo đơn hàng từ tìm kiếm sau đó chọn khách | HDSD 010 |
| `18_2_010_002` | Tạo đơn hàng từ Chọn sản phẩm, chọn khách hàng, nhập giảm giá, thanh toán thành công, ghi nhận ở danh sách đơn hàng | HDSD 010 |
| `18_2_010_004` | Ô tìm khách hàng có placeholder đúng | HDSD 010 |
| `18_2_010_005` | Gợi ý khách hàng hiện kèm số điện thoại để phân biệt trùng tên | HDSD 010 |
| `18_2_010_006` | Thêm khách mới ngay trên đơn bằng dấu cộng vàng | HDSD 010 |
| `18_2_010_007` | Sửa số điện thoại hoặc địa chỉ khách từ gợi ý | HDSD 010 |
| `18_2_010_008` | Khối khách hàng hiện đủ ba số sau khi gắn khách | HDSD 010 |
| `18_2_010_009` | Tooltip điểm hiện tại xem được chi tiết tích luỹ | HDSD 010 - mẹo |
| `18_2_010_010` | Ghi chú đơn hàng lưu được | HDSD 010 |
| `18_2_010_011` | Để trống khách là bán cho khách vãng lai | HDSD 010 - lưu ý |
| `18_2_010_012` | 🔴 Đổi khách SAU khi đã áp CTKM thì tính lại toàn bộ ưu đãi | HDSD 010 - lưu ý |
| `18_2_010_013` | 🔴 Gắn khách sau khi đã thu tiền là không sửa được | HDSD 010 - lưu ý |
| `18_2_010_014` | Đơn giao qua đơn vị vận chuyển bắt buộc có khách | HDSD 010 - lưu ý |
| `18_2_010_015` | Tìm khách bằng chuỗi toàn khoảng trắng | Kỹ thuật 2 - khoảng trắng |
| `18_2_010_016` | Tìm khách bằng số điện thoại một phần | Kỹ thuật 8 - tìm kiếm |
| `18_2_010_017` | Tìm khách không dấu | Kỹ thuật 8 - tìm kiếm |
| `18_2_010_018` | Bỏ khách đã gắn khỏi đơn | Kỹ thuật 9 - huỷ giữa chừng |
| `18_2_020_001` | Mở chương trình khuyến mãi | HDSD 020 |
| `18_2_020_002` | Giảm 10% giá trị đơn | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_003` | Giảm 50k giá trị đơn | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_004` | Giảm 50k trên đơn hàng 50k | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_005` | Giảm 50k trên đơn hàng bánh mỳ 40k | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_006` | Giảm 5% sau CT khác | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_007` | Giảm 1% tặng SP (Tồn kho hợp lệ) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_008` | Giảm giá bán PROMOTE_1 theo tiền cố định (qty=2) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_009` | Giảm giá bán PROMOTE_1 theo % (qty=3) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_010` | Giảm giá Combo B theo tiền cố định (qty=3) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_011` | Giảm giá Combo D theo % (qty=3) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_012` | Áp dụng đúng tier khi tăng qty (PROMOTE_7) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_013` | Tặng kèm SP cùng loại (mua 2 PROMOTE_1 tặng 1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_014` | Tặng SP từ danh mục dM_B_1 (qty=5 PROMOTE_1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_015` | Mua 4 PROMOTE_1 được giảm 60k cho PROMOTE_6 | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_016` | Giảm 10k cho SP nước giải khát (9 PROMOTE_1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_017` | Tặng SP dM_A_1 và kiểm tra xóa khi giảm qty PROMOTE_4 | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_018` | Tự động tặng Vở Hồng Hà 80 trang (qty=2 PROMOTE_3) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_019` | Giảm 30k cho SP nước giải khát (5 PROMOTE_3) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_020` | Giảm 80k cho Vở Hồng Hà (7 PROMOTE_6) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_021` | Giảm giá bán theo số tiền cho mỗi SP dM_A_1 (qty=2) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_022` | Giảm giá theo % cho mỗi SP dM_A_1 (qty=3) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_023` | Mua SP danh mục A giảm giá SP danh mục B (5 dM_A_1 -> giảm 2k dM_B_1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_024` | Mua SP danh mục A giảm giá SP danh mục B theo số lượng (6 dM_A_1 -> giảm 4k dM_B_1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_025` | Giảm giá SP dM_B_1 nhân theo số lần đạt điều kiện (12 dM_A_1 -> giảm 40k x 2 dM_B_1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_026` | Mua SP danh mục A tặng SP danh mục B (10 dM_A_1 -> tặng 3 dM_B_1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_027` | Mua SP danh mục A tặng SP chỉ định (7 dM_A_1 -> tặng 2 Vở Hồng Hà) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_028` | Giảm giá cho mỗi combo cùng danh mục (2 Combo A -> giảm 4k/sp) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_029` | Mua danh mục combo A giảm giá danh mục combo B (4 Combo A -> giảm 20k Combo B) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_030` | Mua danh mục A tặng quà danh mục B nhân theo số lượng (4 PROMOTE_1 -> tặng 2 dM_A_1) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_031` | Mua danh mục A tặng quà chỉ định nhân theo số lượng (8 PROMOTE_1 -> tặng 2 Bim bim) | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_032` | Áp dụng cùng lúc nhiều CTKM giảm % | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_033` | Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_034` | Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định và theo % | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_035` | Áp dụng cùng lúc CT giảm toàn đơn và CT giảm sau CT khác | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_036` | Áp dụng cùng lúc nhiều CT giảm sau CT khác | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_037` | Áp dụng song song KM Sản phẩm và KM Đơn hàng độc lập | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_038` | KM Sản phẩm làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tối thiểu | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_039` | Áp dụng song song KM Danh mục và KM Đơn hàng độc lập | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_040` | KM Danh mục làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tối thiểu | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_041` | Áp dụng đồng thời cả 3 loại KM trên cùng một đơn | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_042` | Đồng thời nhận nhiều quà tặng từ các loại KM | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_043` | Mua sản phẩm A giảm giá sản phẩm B kết hợp mua danh mục C giảm giá danh mục D | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_044` | Chỉ áp dụng KM Đơn hàng tốt nhất trong 2 chương trình | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_045` | Khách hàng thuộc nhóm VIP được hưởng KM VIP | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_020_046` | KM Đơn hàng có quà tặng kết hợp bản thân sản phẩm có KM sản phẩm | HDSD 020 + trace tests/vnpost-promotion-pos.playwright.spec.js |
| `18_2_030_001` | Ô Mã coupon có placeholder đúng | HDSD 030 |
| `18_2_030_002` | Áp mã coupon hợp lệ | HDSD 030 |
| `18_2_030_003` | 🔴 Coupon tính ĐỘC LẬP với chiết khấu khuyến mãi | HDSD 030 |
| `18_2_030_004` | Quét mã vạch coupon thay vì gõ tay | HDSD 030 |
| `18_2_030_005` | Bỏ mã coupon đã áp | HDSD 030 |
| `18_2_030_006` | Mã coupon không tồn tại bị chặn | HDSD 030 - lưu ý |
| `18_2_030_007` | Mã coupon hết hiệu lực bị chặn | HDSD 030 - lưu ý |
| `18_2_030_008` | Mã coupon đã dùng rồi bị chặn | HDSD 030 - lưu ý + Kỹ thuật 5 - tính duy nhất |
| `18_2_030_009` | Đơn chưa đạt điều kiện của đợt phát hành bị chặn | HDSD 030 - lưu ý |
| `18_2_030_010` | 🔴 CTKM không dùng chung với coupon | HDSD 030 - lưu ý |
| `18_2_030_011` | Áp mã coupon rỗng | Kỹ thuật 1 - ô bắt buộc |
| `18_2_030_012` | Mã coupon toàn khoảng trắng | Kỹ thuật 2 - khoảng trắng |
| `18_2_030_013` | Mã coupon khác hoa thường | Kỹ thuật 8 - tìm kiếm |
| `18_2_030_014` | Áp hai mã coupon liên tiếp | Kỹ thuật 5 - tính duy nhất |
| `18_2_030_015` | 🔴 Coupon ghi nhận đã dùng khi đơn thanh toán thành công | HDSD 030 - lưu ý |
| `18_2_030_016` | 🔴 Huỷ đơn sau khi đã dùng coupon | HDSD 030 - lưu ý |
| `18_2_030_017` | Coupon in riêng một dòng trên biên lai | HDSD 030 - mẹo |
| `18_2_040_001` | Tích ô Xuất hoá đơn điện tử hiện liên kết Thông tin xuất HĐ | HDSD 040 |
| `18_2_040_002` | Màn Thông tin xuất hoá đơn mở đủ trường | HDSD 040 |
| `18_2_040_003` | Chọn Cá nhân thì hiện đúng bộ trường | HDSD 040 |
| `18_2_040_004` | Chọn Doanh nghiệp / Tổ chức thì đổi bộ trường | HDSD 040 - lưu ý |
| `18_2_040_005` | Đổi đối tượng giữa chừng làm mất ô đang nhập | HDSD 040 - lưu ý |
| `18_2_040_006` | Hệ thống điền sẵn thông tin khách đã gắn vào đơn | HDSD 040 |
| `18_2_040_007` | Bỏ trống Tên đơn vị với khách doanh nghiệp bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `18_2_040_008` | Bỏ trống Mã số thuế với khách doanh nghiệp bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `18_2_040_009` | Bỏ trống Địa chỉ đơn vị bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `18_2_040_010` | Bỏ trống Họ và tên người mua với khách cá nhân bị chặn | Kỹ thuật 1 - ô bắt buộc |
| `18_2_040_011` | Bỏ trống Email nhận hoá đơn bị chặn ở CẢ HAI đối tượng | HDSD 040 + Kỹ thuật 1 - ô bắt buộc |
| `18_2_040_012` | Địa chỉ KHÔNG bắt buộc với khách cá nhân | HDSD 040 |
| `18_2_040_013` | Mã số thuế phải đủ 10 chữ số | Kỹ thuật 3 - giá trị biên + Kỹ thuật 4 - kiểu dữ liệu sai |
| `18_2_040_014` | CMND/CCCD chỉ nhận 9 hoặc 12 chữ số | Kỹ thuật 3 - giá trị biên |
| `18_2_040_015` | Email sai định dạng bị chặn | Kỹ thuật 4 - kiểu dữ liệu sai + HDSD 040 - lưu ý |
| `18_2_040_016` | Các ô bắt buộc toàn khoảng trắng bị coi là rỗng | Kỹ thuật 2 - khoảng trắng |
| `18_2_040_017` | Nút Xoá thông tin làm trắng form | HDSD 040 |
| `18_2_040_018` | Xác nhận ghi thông tin vào đơn | HDSD 040 |
| `18_2_040_019` | Bấm Huỷ không ghi gì vào đơn | Kỹ thuật 9 - huỷ giữa chừng |
| `18_2_040_020` | 🔴 Tích ô xuất HĐĐT mà không nhập thông tin thì biên lai in kèm mã QR | HDSD 040 - lưu ý |
| `18_2_040_021` | Đơn xuất HĐĐT được đánh dấu chờ phát hành sau thanh toán | HDSD 040 |
| `18_2_040_022` | Điểm bán chưa bật HĐĐT thì không có ô này | HDSD 040 |
| `18_2_050_002` | POS hiển thị thông tin điểm sau khi chọn khách | Sheet QC |
| `18_2_050_011` | Đổi số điểm bằng 0 hoặc âm | Kỹ thuật 3 - giá trị biên |
| `18_2_050_012` | Đổi đúng số điểm khách đang có | Kỹ thuật 3 - giá trị biên |

## 5. Bảng đối chiếu đầy đủ 10 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_LOYALTY__30` | Thanh toán đơn hàng bằng điểm thưởng thành công (happy path) | `18_2_050_001` |
| `FUNC_LOYALTY__31` | Hiển thị đúng điểm tích lũy của khách hàng trên màn bán hàng | `18_2_010_003` |
| `FUNC_LOYALTY__32` | Đổi điểm làm giảm đúng tổng tiền phải thanh toán | `18_2_050_003` |
| `FUNC_LOYALTY__33` | Đơn hàng không tick đổi điểm vẫn tích lũy điểm bình thường | `18_2_050_004` |
| `FUNC_LOYALTY__34` | Đổi điểm kết hợp với thanh toán tiền mặt phần còn lại | `18_2_050_005` |
| `FUNC_LOYALTY__35` | Không hiển thị tùy chọn đổi điểm khi không chọn khách hàng | `18_2_050_006` |
| `FUNC_LOYALTY__36` | [NEG] Đổi điểm khi không có chương trình đổi điểm nào đang hoạt động | `18_2_050_007` |
| `FUNC_LOYALTY__37` | [NEG] KH không đủ điểm để đổi cho đơn hàng | `18_2_050_008` |
| `FUNC_LOYALTY__38` | [NEG] Giá trị đơn hàng không đạt tối thiểu để đổi điểm | `18_2_050_009` |
| `FUNC_LOYALTY__39` | [NEG] Chọn KH không có điểm tích lũy và cố đổi điểm | `18_2_050_010` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
