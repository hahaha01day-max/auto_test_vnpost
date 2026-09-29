# Auto test — còn phải làm gì (cập nhật 28/09/2026)

**Tiến độ:** 3060 / 3152 case có script thật (97%). Còn **92 case** chưa có phép kiểm.
Số tổng luôn lấy ở `_CHECKLIST.md` (`node tool/bin/checklist.js`). File này ghi **việc** và **ai làm**.

> 🔴 **28/09 17:50 đã ĐÓNG KỲ 09/2026 của AUTO8_SHOP (68152, làn 8)** bằng API (`04_4_070_001`, user chốt phương án a). Tới hết 30/09 mọi nghiệp vụ kho ở điểm bán này bị chặn "Tháng 09/2026 đã chốt tồn kho" ⇒ 🚫 chạy spec kho/bán hàng làn 8 trước 01/10 — dùng làn khác.

> 🔴 **SÁNG 29/09: chạy `03b_030_007` TRƯỚC mọi spec POS làn 5** — tiền đề là ca #58 `AUTO5_CA_TOI1` của GDV làn 5 để mở qua đêm; spec POS (`pos-18.bamCa`) sẽ tự chốt nó. Lệnh: `VNPOST_LANE=5 npx playwright test --config tai-lieu-test/03b_ca_lam_viec_nhan_vien/playwright.config.js --project=gdv chot-mo-ca -g 03b_030_007`

---

## 1. Việc ANH/CHỊ cần quyết — Claude đang chờ

Trả lời theo mã ở cột đầu, ví dụ: `A1: a · B2: b · C1: a`. Để trống ô nào nghĩa là Claude chưa được làm case đó.

### Nhóm A — CHƯA CÓ KẾT QUẢ MONG ĐỢI: anh/chị chốt hệ thống phải làm gì

Script chưa viết được vì không biết phải kiểm cái gì. Cột "Gợi ý" là phương án Claude thấy hợp lý nhất — đồng ý thì chỉ cần ghi "gợi ý".

| Mã | Case | Câu hỏi | Gợi ý | Chốt | Kết quả chạy |
|---|---|---|---|---|---|
| A1 | `02_010_019` | Một nhân viên vừa có phân công **Đang làm** vừa có phân công **Đã nghỉ**: lọc "Trạng thái làm việc = Đã nghỉ" thì nhân viên đó có hiện không? | Lọc theo PHÂN CÔNG: hiện, và chỉ hiện dòng phân công Đã nghỉ | ✅ **CHỐT 28/09: phương án 3** — lọc theo NHÂN VIÊN: chỉ hiện người đã nghỉ ở MỌI phân công | 🔴 ĐỎ — lọc theo PHÂN CÔNG |
| A2 | `02_030_003` | Đổi **một** phân công sang Đã nghỉ thì các phân công khác của cùng nhân viên có tự đổi theo không? (sheet QC nói có, code không làm) | Không lan — chỉ đổi đúng phân công đó | ✅ **CHỐT 28/09: a** — không lan, chỉ đổi đúng phân công đó | ✅ ĐẠT |
| A3 | `03a_010_009` | Tên ca nhập toàn dấu cách: backend có phải chặn không? Thông báo là gì? | Chặn, báo như bỏ trống "Vui lòng nhập tên ca" | ✅ **CHỐT 28/09: theo gợi ý** | 🔴 ĐỎ — tạo được ca tên rỗng |
| A4 | `03a_010_014` | Ca **Ngừng hoạt động** có được trùng giờ với ca đang hoạt động không? | Được — chỉ kiểm chồng lấn giữa các ca đang hoạt động | ✅ **CHỐT 28/09: theo gợi ý** | 🔴 ĐỎ — BE vẫn chặn chồng lấn ca ngừng |
| A5 | `03a_030_008` | Tự động chấm công "nhân viên cụ thể" nhưng không chọn ai: có chặn lưu không? | Chặn, báo "Vui lòng chọn nhân viên" | ✅ **CHỐT 28/09: theo gợi ý** | 🔴 ĐỎ — lưu được danh sách rỗng |
| A6 | `03a_030_009` | Số phút đi muộn / về sớm tối đa là bao nhiêu? (hiện nhập 9999 vẫn lưu) | Tối đa = độ dài ca (phút) | ✅ **CHỐT 28/09: theo gợi ý** | 🔴 ĐỎ — lưu được 9999 phút |
| A7 | `03a_040_008` | Xếp lịch lặp mà bỏ trống **Ngày kết thúc** thì xếp tới đâu? | Tối đa 90 ngày như `03a_040_003` | ✅ **CHỐT 28/09: theo gợi ý** | 🔴 ĐỎ — xếp 91 ngày (lệch 1) |
| A8 | `03b_040_009` | Có chặn **chốt ca trước giờ hết ca** không? (sheet QC đòi chặn, code không chặn) | Không chặn — chỉ cảnh báo | ✅ **CHỐT 28/09: CHẶN** (khác gợi ý) — case sẽ đỏ tới khi code chặn | 🔴 ĐỎ — FE không chặn |
| A9 | `04_4_070_004` | Sản phẩm **quản lý serial** có được bán âm không? | Không — serial phải có thật mới bán được | ✅ **CHỐT 28/09: theo gợi ý** | ✅ ĐẠT — nhãn "Hết hàng", không bán được |
| A10 | `07_2_080_001/002` | Bán khi tồn = 0, hoặc bán nhiều hơn tồn: **giá vốn** phần âm tính thế nào? | Giá vốn gần nhất của sản phẩm tại kho | ✅ **CHỐT 28/09: theo gợi ý** | ✅ ĐẠT (080_001/002) |
| A11 | `07_2_080_003` | Tồn đã âm sẵn rồi bán tiếp: giá vốn tạm tính thế nào? (kỳ vọng gốc chép nhầm) | Như A10 | ✅ **CHỐT 28/09: theo gợi ý** | ✅ ĐẠT |
| A12 | `07_3_040_004` | Tắt **hết** phương thức thanh toán: hệ thống có phải chặn không? | Chặn — phải còn ít nhất 1 phương thức | ✅ **CHỐT 28/09: KHÔNG cần chặn** (khác gợi ý) | ✅ ĐẠT phía FE (giả lập mạng) |
| A13 | `10_130_006` | Hai bảng giá cùng hiệu lực, khác **khung giờ trong ngày**: bảng nào thắng? | Bảng có khung giờ chứa giờ bán hiện tại; trùng thì bảng tạo sau | ✅ **CHỐT 28/09: theo gợi ý** | ✅ ĐẠT |
| A14 | `CNDB-CD-009`, `CNDB-KY-010` | Ô ghi chú / căn cứ / nguyên nhân lệch nhập toàn dấu cách: có chặn không? | Chặn như bỏ trống | ✅ **CHỐT 28/09: theo gợi ý** | CD-009 ⏳ chưa có chuyến chờ xác nhận · KY-010 ✅ ĐẠT |
| A15 | `CNDB-ND-010` | Nợ đầu kỳ = 0 có tính là "đã khai" không? Có cho nhập số âm (điểm bán ứng trước) không? | 0 = đã khai · cho phép số âm | ✅ **CHỐT 28/09: theo gợi ý** | 🔴 ĐỎ — không nhận số âm; dòng khai tay lỗi thiếu ngày chốt |
| A16 | `14_3_040_017/018` | Dòng diễn giải hoá đơn trả hàng bỏ trống / toàn dấu cách: có chặn không? | Chặn, báo "Vui lòng nhập diễn giải" | ✅ **CHỐT 28/09: theo gợi ý** | 🔴 ĐỎ — FE không chặn diễn giải rỗng |
| A17 | `04_5_020_008`, `011`–`015` | Kho vật lý thứ hai ở điểm bán: mọi form **không có ô chọn kho** (tự lấy kho mặc định), kỳ vọng gốc chỉ ghi "Check lại". | **a)** đúng thiết kế ⇒ chạy ở cấp tỉnh/HUB · **b)** bỏ 6 case · **c)** lỗi: điểm bán phải chọn được kho | ⏸ **ĐỂ SAU** (user 28/09): sẽ cập nhật mô hình **1 điểm bán – kho vật lý**, chờ rồi quyết lại |  |
| A18 | `16_050_016` | Kiểm "bút toán sau ghi nợ không sửa được" ở **màn nào**? Kịch bản không chỉ màn sổ kế toán. | anh/chị chỉ tên màn |  |  |
| A19 | `18_1_040_017` | "Đổi lô khi bán hàng" được ghi vào nhật ký ở **màn nào**, nhóm nghiệp vụ nào? | anh/chị chỉ tên màn |  |  |

### Nhóm B — ĐÃ CÓ KẾT QUẢ MONG ĐỢI nhưng màn thật làm khác: lỗi sản phẩm hay sửa kịch bản?

Chọn **a)** sửa kịch bản theo màn thật, hoặc **b)** lỗi sản phẩm ⇒ lập phiếu bug, giữ case đỏ.

| Mã | Case | Kịch bản nói | Màn thật làm (đo 28/09) | Chốt |
|---|---|---|---|---|
| B1 | `18_4_020_005/006` | GDV xuất excel danh sách đơn | GDV **thấy nút** nhưng bấm bị "Không có quyền truy cập" (vai GDV thiếu chức năng `EXPORT_EXCEL`). **a)** = cho GDV xuất ⇒ Claude soạn SQL gán quyền · **b)** = ẩn nút với GDV | ✅ **CHỐT 28/09: a** — SQL `.claude/sql/update_product/2026-09-28_authen_gdv_xuat_excel_don_hang.sql` (thiếu đúng GET_EXPORT_TASK_ORDER cho SHOP_SALE/POS_PLUS_SHOP_SALE), chờ chạy + xoá cache |
| B2 | `18_2_020_001` | Bảng CTKM có cột "Áp dụng chung" | Có cột **"Sinh nhật"**, không có "Áp dụng chung" — case đang ĐỎ |  |
| B3 | `18_2_010_002` | Bán hàng có nhập giảm giá tay | POS **không còn ô giảm giá tay** (code đã khoá/comment) | ✅ **CHỐT 28/09**: đổi mong đợi — KHÔNG cho sửa giảm giá tay |
| B4 | `18_4_100_002` | Vai tỉnh thấy đơn của các điểm bán trực thuộc | Chỉ thấy đơn của **1 điểm mặc định (HUB)**; tỉnh không có HUB ⇒ bảng trống — case đang ĐỎ |  |
| B5 | `02_020_020` | Bỏ trống ô Trạng thái của dòng vai trò thì báo "Chọn trạng thái" | Ô tự điền "Hoạt động" và **không xoá được** ⇒ không có cách bỏ trống |  |
| B6 | `03b_060_003` | Có danh sách tài khoản được bỏ qua kiểm ca | Code **không còn** danh sách này — mọi tài khoản đều bị kiểm ca |  |
| B7 | `04_2_010_003` | Đã khai tồn đầu kỳ thì nút bị khoá + hiện chữ "Đã khai báo tồn kho đầu kỳ" | Không có chữ này trong code |  |
| B8 | `18_1_020_020` | Thêm hàng ngừng kinh doanh vào đơn thì bị chặn kèm thông báo | Ô tìm **không hiện** hàng ngừng kinh doanh; quét mã thì không có thông báo gì | ✅ **CHỐT 28/09**: đổi mong đợi — bị chặn kèm thông báo HOẶC không tìm thấy hàng ngừng KD |
| B9 | `CNDB-KY-002` | Chặn mở kỳ đối soát không tròn tháng (01/08–15/08) | Modal chỉ cho chọn **tháng** ⇒ không nhập được khoảng lẻ | ✅ **CHỐT 28/09**: màn thật ĐÚNG mong đợi (chỉ chọn tháng ⇒ không tạo được kỳ lẻ) |
| B10 | `18_2_010_014` | Đơn giao qua đơn vị vận chuyển bắt buộc có khách | Màn bán hàng không có lựa chọn hình thức giao hàng — cần anh/chị chỉ lối vào (nếu có) | ⏸ **ĐỂ SAU** (user 28/09) |
| B11 | `19_060_002` | Đơn khách trả một phần: cột Trạng thái thanh toán = "Chưa thanh toán" | Hiện **"Đơn còn nợ"** (số đúng: đã trả 50.000 · còn nợ 145.000) — case ĐỎ | ✅ **CHỐT 28/09**: đổi mong đợi — "Đơn còn nợ" + số tiền còn nợ; giao diện đã đổi thêm, script cập nhật sau |
| B12 | `19_100_001` | Nhập Excel 4 dòng (2 đúng · 2 sai: thiếu tên, mã 1 ký tự) ⇒ báo tổng 4, thành công 2, lỗi 2; dòng sai KHÔNG thành khách | Job báo **tổng 3 · thành công 3 · lỗi 1** (tổng ≠ thành công + lỗi), và **dòng thiếu tên vẫn được tạo thành khách** — nghi lỗi sản phẩm, case ĐỎ | 🔴 **LỖI SẢN PHẨM** (user xác nhận 28/09) |
| B13 | `19_100_002` | Lần nhập có dòng lỗi thì tải được file lỗi | Lịch sử ghi 1 dòng lỗi nhưng nút **"Tải file lỗi" bị khoá** — case ĐỎ | 🔴 **LỖI SẢN PHẨM** (user xác nhận 28/09) |
| B14 | `16_010_021`, `16_010_022` | Bán hàng ký gửi có HĐ hết hiệu lực / chưa gán NCC ⇒ **bị chặn ngay ở quầy** kèm thông báo (CONSIGN-005 / CONSIGN-002) | Quầy báo **"Thanh toán thành công"**, đơn đã thanh toán, nhưng **không sinh phiếu xuất kho** (tồn không trừ, không treo công nợ NCC) — luật chặn chạy ở bước xuất kho nền (outbox `STOCK_EXPORT_REQUEST`) nên lỗi bị nuốt. Đối chứng SP ký gửi có HĐ hợp lệ: xuất kho + công nợ bình thường. 🔴 nghi lỗi sản phẩm nghiêm trọng | 🔴 **LỖI SẢN PHẨM** (user xác nhận 28/09) |
| B15 | `16_060_022` (và mọi case biên bản của điểm bán ngoài pod 1) | Kỳ đối soát ký gửi gom chứng từ của mọi đơn vị trong phạm vi | Biên bản (`/consignment-recon/periods/{id}/summary`) chỉ đọc chứng từ ở **pod của shopId trên header**. Màn đối soát chỉ vai TCT mở được, header TCT = shop master (pod 1) ⇒ hàng ký gửi ở điểm bán pod 2 (cả 3 điểm bán làn) **không bao giờ vào biên bản** — đo 28/09: cùng kỳ #310, header TCT ra 0 dòng, header shop 68150 ra đúng dòng nhập. 🔴 nghi lỗi sản phẩm (thiếu gộp nhiều pod) | 🔴 **LỖI SẢN PHẨM** (user xác nhận 28/09) |
| B16 | `16_030_007` | Nhãn ĐỎ "Chưa có giá — chặn chốt kỳ" đi cùng việc chặn chốt | FE tô đỏ khi đơn giá `null`, BE chặn chốt khi đơn giá `null` **hoặc ≤ 0**; qua giao diện/API bỏ trống giá thì lưu **0** ⇒ dòng giá 0 hiện nhãn **VÀNG "Không rõ nguồn giá"** mà **bấm chốt bị chặn** ("…biên bản không được có đơn giá 0") |  |
| B17 | `16_030_007` | Kỳ chỉ có dòng nhãn vàng (có giá, thiếu nguồn) vẫn chốt được | Chốt kỳ #316 trả **HTTP 500 "Có lỗi xảy ra…"**, lặp lại 2 lần (requestId `LVmOLr`, `Luxwah`); audit kỳ sạch. Chưa rõ nguyên nhân — cần xem log pod theo requestId. Lưu ý: dòng nhập ở kho TCT theo đường nhập nội bộ (xem seed 18.10) |  |
| B18 | `27_060_001` | HĐ điều chỉnh không xác định được dấu ⇒ dải cảnh báo vàng "Có hoá đơn điều chỉnh chưa xác định được dấu tăng/giảm" + ô chọn Tăng/Giảm/Không đổi | Upload HĐ điều chỉnh (TCHDon=2) KHÔNG có `TCDChinh`, không ghi chú, không `TgTTTBSo` ⇒ BE gán **"Không đổi"**, `needsManualSign=false`, cảnh báo **không hiện**. Nguyên nhân (đọc code): `DefaultVietnamEInvoiceXmlReader.number()` trả **0** khi thiếu thẻ ⇒ nhánh `UNKNOWN` của `resolveAdjustmentType` không bao giờ tới — HĐ điều chỉnh mơ hồ bị ngầm tính "không đổi giá trị". 🔴 nghi lỗi sản phẩm | 🔴 **LỖI SẢN PHẨM** (user xác nhận 28/09) |
| B19 | `27_060_003` | Mọi mặt hàng Khớp ⇒ kế toán bấm "Xác nhận hạch toán công nợ" → "Hạch toán" ⇒ "Đã hạch toán công nợ cho PO" | Hệ thống **tự hạch toán ngay khi upload** HĐ khớp (`autoAccountIfMatched`, ghi chú "Tự động hạch toán khi đối soát hoá đơn khớp") ⇒ nút đã là "Đã hạch toán công nợ" và khoá. Nút tay chỉ bật khi `eligible` — đúng lúc hệ thống đã tự làm ⇒ luồng bấm tay của kịch bản **không có đường tới**. **a)** sửa kịch bản theo tự hạch toán · **b)** lỗi: phải chờ kế toán xác nhận | ✅ **CHỐT 28/09**: đổi mong đợi — hệ thống TỰ ĐỘNG hạch toán |
| B20 | `04_4_070_005` | Nhập bù sau bán âm: bù âm trước, phần dư mới thành tồn dương | 🔴 Tồn (`SHOP_STOCK`) về 0 đúng, nhưng **lô vừa nhập vẫn còn nguyên số lượng** (nhập 4 khi tồn -4 ⇒ tồn 0, lô 4) — tái hiện 3/3 lượt (phiếu 2112, 2115, 2130). Hệ quả dây chuyền: lô dư mãi so với tồn; xuất theo lô bị chặn "Tổng số lượng xuất từ các lô … không khớp"; **kiểm kho theo lô ra số sai** (tồn -2, lô dư 6, khai 3 ⇒ tồn **-5**, phiếu 2137). Case ĐỎ. 🔴 nghi lỗi sản phẩm — làn 8 SP TC hiện Σ lô 155 ≠ tồn 147 | 🔴 **LỖI SẢN PHẨM** (user xác nhận 28/09) |
| B21 | `04_4_060_004` | Khai giảm thêm khi tồn âm ⇒ bị chặn, lấy nguyên văn thông báo | Ô "SL cập nhật" (`min=0`) chỉ không nhận số âm, **không có thông báo nào** — đang ghi ĐẠT (tồn không đổi). **a)** chấp nhận chặn im lặng · **b)** lỗi: phải có thông báo | ✅ **CHỐT 28/09**: logic đã cập nhật — KHÔNG cho kiểm SP đang tồn âm; áp cho cả 04_4_060_004 và 060_005 (kỳ vọng cũ "cho phép, tồn = 3" của 060_005 bỏ) — script cần viết lại |
| B22 | `02_030_006` | Phân công cũ "Đã nghỉ", mới "Đang làm" | Nhãn thật là **"Ngừng hoạt động" / "Đang hoạt động"** (đã ĐẠT theo nghĩa). Thêm: điều chuyển **quay về** đơn vị cũ thì dòng lịch sử cũ ở đơn vị đó **biến mất** (bị dùng lại thành dòng Đang hoạt động) ⇒ lịch sử làm việc mất một lượt. **a)** chấp nhận · **b)** lỗi: lịch sử phải giữ đủ | ✅ **CHỐT 28/09: a** — chấp nhận |
| B23 | `04_4_070_001` | Kế toán đóng kỳ; lập phiếu kiểm kho ngày thuộc kỳ đã đóng bị chặn | "Đóng kỳ" = **Chốt tồn kho tháng** (`/period-closing/close`). Đo 28/09: (1) vai **kế toán** tỉnh/TCT gọi bị **401**, chỉ CHT/Admin gọi được — không vai nào gắn chức năng `PERIOD_CLOSING_CLOSE`; (2) ô "Thời gian tạo phiếu" chỉ đổi ngày **phiếu con**, chứng từ chốt vẫn mang ngày chốt phiên ⇒ lùi ngày vào kỳ đã đóng **có thể không bị chặn** (chốt chặn đọc ngày chứng từ) — đo 28/09 chưa tách được vì hôm nay cũng thuộc tháng đã đóng; (3) 🔴 BE nhận cả tháng **hiện tại / tương lai** (chỉ FE khoá) — gọi API chốt tháng đang chạy là khoá mọi nghiệp vụ kho của điểm bán.| ✅ **CHỐT 28/09**: chạy bằng Cửa hàng trưởng; đóng kỳ 09 bằng API (phương án a) — ĐẠT |
| B24 | nhiều case A (28/09) | Kỳ vọng đã chốt ở nhóm A | Chạy 28/09, **đỏ vì màn thật làm khác kỳ vọng đã chốt** (chi tiết cột KQ nhóm A + CSV): A1 lọc theo phân công · A3 tên ca rỗng tạo được · A4 BE chặn chồng lấn cả ca ngừng · A5/A6 cấu hình chấm công không validate · A7 xếp 91 ngày · A8 không chặn chốt trước giờ · A15 ô nợ đầu kỳ min=0 + **mọi dòng khai tay lỗi "Thiếu ngày chốt số"** (FE không gửi asOfDate) + 1500.5 ⇒ 15.005 · A16 FE không chặn diễn giải rỗng. **Hỏi:** lập phiếu bug cho cả nhóm này? |  |

| B25 | `03b_040_011` | Mở lại ca đã chốt ⇒ "Đã mở lại ca", thẻ về trạng thái đang mở | Thẻ ca đã chốt KHÔNG có nút "Mở lại ca": nút + handler đang bị **comment** ở `WorkShiftPage.jsx` (dòng ~651–658, ~1031–1037) ⇒ tính năng đã gỡ khỏi FE — case ĐỎ. **a)** bỏ case (đã gỡ tính năng) · **b)** lỗi: phải bật lại nút | ✅ **CHỐT 28/09: a** — bỏ case (tính năng đã gỡ) |
### Nhóm C — ĐÃ CÓ KẾT QUẢ MONG ĐỢI, chỉ cần anh/chị cho phép hoặc cấp điều kiện

| Mã | Việc | Chọn | Số case |
|---|---|---|--:|
| C1 | Cho ghi dữ liệu **không hoàn tác** trên dev: chốt kỳ ký gửi, ghi nợ NCC, ký biên bản, hạch toán hoá đơn, ghi nợ đơn vị vận tải, tắt phương thức thanh toán, chốt/mở ca (bảng A chi tiết) | **a)** cho, TRỪ phát hành HĐĐT · **b)** cho cả phát hành HĐĐT ra nhà cung cấp thật · **c)** không cho | 37 — ✅ **CHỐT 28/09 (một phần)**: cho ghi thật chốt/mở ca 03b (`030_007`, `040_011`, `040_012`); các mục C1 khác chưa trả lời |
| C2 | Giao dịch **QR thật** qua ngân hàng (đơn tạm nộp, kiểm tra giao dịch QR, thanh toán điểm qua QR) | **a)** cấp tài khoản nhận QR của điểm bán làn + làm 1 giao dịch thật · **b)** chuyển test tay | 11 |
| C3 | Case cần **thiết bị / hệ thống ngoài**: máy quét, cân, SDK VNPD, POS offline, tiền đề chỉ tạo được bằng sửa DB (bảng D) | **a)** chuyển test tay · **b)** bỏ khỏi bộ test | 23 |
| C4 | Case đặt **nhầm phân hệ**: `04_5_050_001`–`004` (đăng nhập theo vai — trùng phân hệ 31), `07_2_080_004` (thêm danh mục — thuộc 08) | **a)** chuyển sang phân hệ đúng · **b)** giữ và viết tại chỗ | 5 |
| C5 | Tiền đề **không có đường FE**: `18_3_080_003` (màn "Đơn hàng online" bị comment route ⇒ không đưa được đơn online vào POS) · `18_4_020_004` (POS v2 ép thẻ trả trước về tiền mặt; cả 3 pod 0 đơn trả bằng thẻ) | **a)** test tay · **b)** bỏ · **c)** bật lại màn / phương thức rồi Claude viết script | 2 |

### Nhóm D — Việc anh/chị tự làm

| Mã | Việc | Mở khoá |
|---|---|---|
| D1 | Chạy SQL `.claude/sql/update_product/2026-09-28_authen_cht_cong_no_nhap_excel_khach.sql` — ✅ **ĐÃ CHẠY 28/09** (10/10 dòng quyền). Chạy lại: `19_090_001` ĐẠT (chọn quỹ quầy) · `19_060_002`, `19_100_001/002` ĐỎ — xem B11–B13 | — |

## 2. Việc CLAUDE tự làm tiếp — không cần chờ

Theo thứ tự:

1. **Chờ tiền đề còn lại** (bảng E) — không còn. `04_4_070_001` ĐẠT 28/09 (đóng kỳ 09 bằng API, xem B23). `ky-gui` (seed 18) và `po-rieng` (seed 19) đã xong từ trước (làn 5) — case 16/27 còn lại chờ B14–B19, 🚫 không phải chờ tiền đề. ✅ 28/09 đã xong nhóm
   tồn âm 04_4 (5 case — bán âm bật RIÊNG điểm bán làn qua `shared/ban-am.js`, không bật cả chuỗi) + nhóm lẻ `02_030_006`, `03b_030_006`,
   `18_5_140_002` (ĐẠT). `18_3_080_003`, `18_4_020_004` không dựng được qua FE ⇒ chuyển C5.
2. **Chạy trọn bộ theo làn** để biết case nào đạt/đỏ: hiện ~2636 case có script nhưng CHƯA có kết quả chạy trong CSV.
3. **Gom 93 case đang ĐỎ** thành bảng "lỗi sản phẩm hay kịch bản sai" ⇒ thành câu hỏi mới ở mục 1. Nhiều nhất: `10` 32 · `12_2` 11 · `04_3` 8 · `12_3` 8 · `08` 7.
4. **Khai 28 case QC gốc còn thiếu** vào `test-cases.csv` (skill `test-scenario`).

## 3. Nhóm F (lỗi script/tool) — ĐÃ XONG 28/09

53/55 case xử lý xong (viết lại spec cũ không bao giờ chạy, 45 case `18_2_020_*` đánh dấu trùng `11_khuyen_mai`, sửa tool đếm sai). 2 case còn lại chính là câu hỏi 2 và 3 ở mục 1.

---

## Ghi chú kỹ thuật (cho phiên sau)

### Lỗi đếm của tool đã sửa 28/09 — 🚫 đừng khảo sát lại theo số cũ

- `tool/core/specs.js`: test sinh từ vòng lặp `test(\`${id} — …\`)` không được nhận ⇒ 168 case báo "chưa có test" dù đủ `expect`.
- `tool/core/cases.js`: mã `50_TT01_010` không khớp `CASE_ID_IN_TITLE` ⇒ cả `50_toan_trinh` báo 0 script.
- `specs.js`: mọi `|| true` trong thân test bị coi là skip vô điều kiện (`[!dau, dau || true]` ở `04_5_020_007`).
- `specs.js`: spec **không khớp `testMatch`** của config (spec cũ `*.playwright.spec.js`) vẫn được đếm là script thật dù Playwright không bao giờ chạy ⇒ 35 case bị báo xanh giả (31 ở `18_2`, `18_3_050_001`, 3 ở `31`). Đã loại — số script thật giảm 3003 → 2968.
- `specs.js`: case khai `trungVoi: "<mã đích>"` trong `test-input.json` được tính ĐÃ PHỦ nếu case đích là script thật (18_2_020_002…046 ↔ 11_khuyen_mai, user chốt 28/09).
- 🔴 Nhóm "SẴN SÀNG" của `_VIEC_CAN_LAM.md` vẫn đếm cả case **skip có lý do trong spec** mà `test-input.json` còn `enabled: true` — 🚫 không có nghĩa là viết được ngay; đối chiếu bảng dưới.


## Chi tiết từng case (cột cuối = kết quả / quyết định)


### F. Lỗi script/tool — ĐÃ XONG 53/55 (2 case chờ câu hỏi 2, 3)

| Case | Tên | Lý do đo được | Quyết định / trạng thái |
|---|---|---|---|
| `18_2_010_001` | Tạo đơn hàng từ tìm kiếm sau đó chọn khách | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 viết `tao-don.gdv.spec.js`, làn 5 — ĐẠT (đơn 260928681505X1KA trong danh sách, đúng tên khách) |
| `18_2_010_002` | Tạo đơn hàng từ Chọn sản phẩm, chọn khách hàng, nhập giảm gi | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ⏸ CHỜ ANH/CHỊ (câu hỏi 3) — LỆCH ĐẶC TẢ, chờ user: POS không còn ô nhập giảm giá tay (AddOrEditProductModal.jsx:2038 `disabled={true}`, khối giảm giá đơn bị comment) — bỏ bước 3 hay coi là lỗi? |
| `18_2_020_001` | Mở chương trình khuyến mãi | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — chờ anh/chị (câu hỏi 2) — 28/09 viết `tao-don.gdv.spec.js` — ĐỎ vì LỆCH ĐẶC TẢ: bảng CTKM có cột "Sinh nhật", KHÔNG có "Áp dụng chung" (F10 + 3 thẻ đạt). Chờ user: sửa kịch bản hay lỗi sản phẩm |
| `18_2_020_007` | Giảm 1% tặng SP (Tồn kho hợp lệ) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_090_008` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_008` | Giảm giá bán PROMOTE_1 theo tiền cố định (qty=2) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_001` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_009` | Giảm giá bán PROMOTE_1 theo % (qty=3) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_002` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_010` | Giảm giá Combo B theo tiền cố định (qty=3) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_003` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_011` | Giảm giá Combo D theo % (qty=3) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_004` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_012` | Áp dụng đúng tier khi tăng qty (PROMOTE_7) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_005` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_013` | Tặng kèm SP cùng loại (mua 2 PROMOTE_1 tặng 1) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_006` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_014` | Tặng SP từ danh mục dM_B_1 (qty=5 PROMOTE_1) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_007` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_015` | Mua 4 PROMOTE_1 được giảm 60k cho PROMOTE_6 | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_008` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_016` | Giảm 10k cho SP nước giải khát (9 PROMOTE_1) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_009` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_017` | Tặng SP dM_A_1 và kiểm tra xóa khi giảm qty PROMOTE_4 | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_010` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_018` | Tự động tặng Vở Hồng Hà 80 trang (qty=2 PROMOTE_3) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_011` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_019` | Giảm 30k cho SP nước giải khát (5 PROMOTE_3) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_012` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_020` | Giảm 80k cho Vở Hồng Hà (7 PROMOTE_6) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_100_013` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_021` | Giảm giá bán theo số tiền cho mỗi SP dM_A_1 (qty=2) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_001` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_022` | Giảm giá theo % cho mỗi SP dM_A_1 (qty=3) | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_002` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_023` | Mua SP danh mục A giảm giá SP danh mục B (5 dM_A_1 -> giảm 2 | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_003` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_024` | Mua SP danh mục A giảm giá SP danh mục B theo số lượng (6 dM | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_004` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_025` | Giảm giá SP dM_B_1 nhân theo số lần đạt điều kiện (12 dM_A_1 | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_005` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_028` | Giảm giá cho mỗi combo cùng danh mục (2 Combo A -> giảm 4k/s | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_008` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_029` | Mua danh mục combo A giảm giá danh mục combo B (4 Combo A -> | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_009` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_037` | Áp dụng song song KM Sản phẩm và KM Đơn hàng độc lập | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_006` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_038` | KM Sản phẩm làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tố | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_007` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_039` | Áp dụng song song KM Danh mục và KM Đơn hàng độc lập | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_008` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_040` | KM Danh mục làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tố | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_009` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_041` | Áp dụng đồng thời cả 3 loại KM trên cùng một đơn | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_010` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_043` | Mua sản phẩm A giảm giá sản phẩm B kết hợp mua danh mục C gi | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_012` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_045` | Khách hàng thuộc nhóm VIP được hưởng KM VIP | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_014` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_3_050_001` | Thanh toán bằng điểm và xác thực OTP thành công | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 viết `thanh-toan-diem.gdv.spec.js` (OTP 888888), làn 5 — ĐẠT: đơn status 2, REDEEM −100 = số điểm dùng, "Thanh toán thành công" |
| `31_010_009` | Xóa vai trò vừa tạo | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 viết lại ở `vai-tro-ghi.tct.spec.js` trên vai trò rác, làn 5 — ĐẠT (toast "Xóa vai trò thành công", get-detail SSHOP-416) |
| `31_020_002` | Tick quyền chức năng và hủy | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 viết lại ở `vai-tro-ghi.tct.spec.js` — ĐẠT (Đóng: 0 request ghi, BE giữ nguyên 1 chức năng) |
| `31_020_003` | Tick quyền chức năng và xác nhận | Chỉ có ở spec cũ không khớp `testMatch` (không bao giờ chạy) — viết lại thành `*.<vai>.spec.js`  | ✅ XONG — 28/09 viết lại ở `vai-tro-ghi.tct.spec.js` — ĐẠT (toast "Gán chức năng thành công", BE 1 chức năng) |
| `18_1_030_012` | Quét kèm số lượng bằng cú pháp N*mã | —  | ✅ XONG — 28/09 lỗi TOOL: `choSl` là arrow một dòng có `expect.poll` — sửa `specs.js`, case đã là script thật |
| `18_2_020_002` | Giảm 10% giá trị đơn | File `vnpost-promotion-pos.playwright.spec.js` KHÔNG khớp `testMatch` (`*.gdv.spec.js`…) của config ⇒ 45 test khuyến mãi không bao giờ chạy; phép kiểm nằm trong helper nhập ngoài  | ✅ XONG — 28/09 user chốt: TRÙNG `11_090_001` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_003` | Giảm 50k giá trị đơn | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_090_003` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_004` | Giảm 50k trên đơn hàng 50k | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_090_005` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_005` | Giảm 50k trên đơn hàng bánh mỳ 40k | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_090_006` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_006` | Giảm 5% sau CT khác | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_004` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_026` | Mua SP danh mục A tặng SP danh mục B (10 dM_A_1 -> tặng 3 dM | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_006` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_027` | Mua SP danh mục A tặng SP chỉ định (7 dM_A_1 -> tặng 2 Vở Hồ | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_007` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_030` | Mua danh mục A tặng quà danh mục B nhân theo số lượng (4 PRO | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_010` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_031` | Mua danh mục A tặng quà chỉ định nhân theo số lượng (8 PROMO | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_110_011` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_032` | Áp dụng cùng lúc nhiều CTKM giảm % | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_001` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_033` | Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_002` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_034` | Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định và the | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_003` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_035` | Áp dụng cùng lúc CT giảm toàn đơn và CT giảm sau CT khác | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_004` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_036` | Áp dụng cùng lúc nhiều CT giảm sau CT khác | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_005` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_042` | Đồng thời nhận nhiều quà tặng từ các loại KM | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_011` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_044` | Chỉ áp dụng KM Đơn hàng tốt nhất trong 2 chương trình | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_013` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_2_020_046` | KM Đơn hàng có quà tặng kết hợp bản thân sản phẩm có KM sản  | —  | ✅ XONG — 28/09 user chốt: TRÙNG `11_120_015` — `trungVoi` trong test-input, tool tính đã phủ |
| `18_4_020_006` | Xuất excel khi danh sách rỗng | Xuất excel: bấm 'Xuất file excel' trong hộp xuất không phát sinh tải/tác vụ đo được (xem 18_4_020_005 đỏ) — chưa kiểm được nhánh danh sách rỗng.  | ✅ XONG — 28/09 `xuat-excel.shop.spec.js` (vai shop), làn 5 — ĐẠT: job 200, file chỉ có dòng tiêu đề. Kèm sửa `18_4_020_005` (lỗi script bắt nhầm method) — ĐẠT: file 3 đơn = màn 3 đơn |
| `50_TT02_020` | TT02 · Xã duyệt phiếu trả | —  | ✅ XONG — 28/09 phiên làn 7 thêm expect trạng thái WARD_APPROVED |

### E. Thiếu dữ liệu nền — Claude tự dựng (28)

| Case | Tên | Lý do đo được | Quyết định / trạng thái |
|---|---|---|---|
| `02_030_006` | Điều chuyển nhân viên sang đơn vị mới | Phần "nhân viên ở đơn vị cũ không truy cập được nữa" phải đăng nhập bằng chính nhân viên đó mới kiểm được — chưa có tài khoản nền cho việc này. Case còn GHI dữ liệu thật. | ✅ XONG 28/09 — `dieu-chuyen.tct.spec.js` (nhân viên AUTO8DC55976508 có tài khoản, điều chuyển qua lại 2 điểm bán seed) — ĐẠT 2 chiều: 2 ô hiện tại disabled, "Điều chuyển nhân viên thành công", dòng cũ Ngừng hoạt động + dòng mới Đang hoạt động, đăng nhập lại chỉ vào shop mới (xem B22) |
| `02_040_004` | Thẻ Công nợ nhân viên hiển thị phiếu nợ phát sinh trong ca | Cần nhân viên đã từng bán hàng ghi nợ trong ca — chưa có mã nhân viên nền cho tình huống này. | ✅ XONG — 28/09 `cong-no-nv.tct.spec.js`, làn 5: GDV tự bán 1 đơn Thanh toán sau ⇒ thẻ Công nợ nhân viên có dòng "Phiếu nợ đơn hàng" đúng mã đơn, khách, còn nợ 95.000 đ |
| `03b_030_006` | Quầy đang có ca chưa chốt của người khác thì không mở được | Cần quầy đang có ca chưa chốt của NGƯỜI KHÁC — phải có tài khoản nhân viên thứ hai cùng điểm bán và mở ca thật. | ✅ XONG 28/09 — `quay-nguoi-khac.seed_shop.spec.js`, làn 8 — ĐẠT: gdv giữ Quầy 01, CHT mở ca cùng quầy ⇒ COUNTER-003, hộp "Quầy đang có ca chưa chốt" (Nhân viên AUTO8_GDV · Ca AUTO8_CA_DAI · Quầy 01), chỉ nút "Đã hiểu", không có ca mới |
| `04_4_060_004` | Kiểm kho GIẢM khi tồn đang âm | Cần SP đang tồn ÂM ở điểm bán seed — không có (chính sách bán âm chưa đo, xem 070_*). | ✅ XONG 28/09 — `ton-am.shop.spec.js` — ĐẠT (chặn im lặng, xem B21) |
| `04_4_060_005` | Kiểm kho TĂNG khi tồn đang âm | Cần SP đang tồn ÂM — không có. | ✅ XONG 28/09 — ĐẠT trên SP SX tồn -2 không lô: khai 3 ⇒ tồn 3 (dòng điều chỉnh pre -2 post 3); SX bán trả về -2 |
| `04_4_070_001` | Đóng kỳ kế toán thì giá vốn chứng từ đã chốt không đổi | Cần quyền kế toán + kỳ kế toán đóng được (phân hệ kế toán kho) — chưa có dữ liệu nền. | ✅ XONG 28/09 — `ky-ke-toan.shop.spec.js` (CHT, `VNPOST_DONG_KY_API=1`) — ĐẠT: đóng kỳ 09 cho 68152 ⇒ INVENTORY_PERIOD_CLOSE CLOSED; 49 dòng chứng từ kiểm kho 2145 giữ nguyên giá vốn/số lượng; lưu phiếu kiểm mới ngày 15/09 ⇒ INVENTORY_PERIOD_CLOSED "Tháng 09/2026 đã chốt tồn kho…". ⚠️ Chặn vì ngày chứng từ = hôm nay (cũng thuộc tháng 09), chưa chứng minh được chặn theo ngày LÙI |
| `04_4_070_002` | Bán hàng khi tồn kho bằng 0 | Cần bán hàng tại quầy (18_1) trên SP tồn 0 + đọc NegativeStockPolicySetting — ngoài màn kiểm kho, chưa có luồng bán trong phân hệ này. | ✅ XONG 28/09 — ĐẠT: tồn 0 bán 1 ⇒ -1, giá vốn tạm = giá TC 60.000 |
| `04_4_070_003` | Bán hàng khi tồn kho đang âm | Như 04_4_070_002 — cần SP đã tồn âm sau bán. | ✅ XONG 28/09 — ĐẠT: -1 bán 3 ⇒ -4, giá vốn dòng không lô = 60.000 (giá TC) |
| `04_4_070_005` | Nhập kho bù sau khi bán âm | Cần SP đã bán âm (070_002/003) trước. | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — lỗi sản phẩm, xem B20 |
| `04_5_020_008` | Dùng kho đã bị tắt trong nghiệp vụ | Ở cấp điểm bán mọi form nghiệp vụ (nhập/xuất/chuyển/kiểm kho) đều KHÔNG có ô chọn kho: nhập/xuất tự lấy kho mặc định, "Kho nhận" chuyển kho chỉ liệt kê điểm bán (tự lấy kho mặc định), "Mở phiên kiểm kho" tự lấy kho mặc định (đo 23 | ⏸ CHỜ ANH/CHỊ (câu hỏi 10) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `04_5_020_011` | Chuyển kho với kho vật lý | Ở cấp điểm bán mọi form nghiệp vụ (nhập/xuất/chuyển/kiểm kho) đều KHÔNG có ô chọn kho: nhập/xuất tự lấy kho mặc định, "Kho nhận" chuyển kho chỉ liệt kê điểm bán (tự lấy kho mặc định), "Mở phiên kiểm kho" tự lấy kho mặc định (đo 23 | ⏸ CHỜ ANH/CHỊ (câu hỏi 10) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `04_5_020_012` | Kiểm kho với kho vật lý | Ở cấp điểm bán mọi form nghiệp vụ (nhập/xuất/chuyển/kiểm kho) đều KHÔNG có ô chọn kho: nhập/xuất tự lấy kho mặc định, "Kho nhận" chuyển kho chỉ liệt kê điểm bán (tự lấy kho mặc định), "Mở phiên kiểm kho" tự lấy kho mặc định (đo 23 | ⏸ CHỜ ANH/CHỊ (câu hỏi 10) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `04_5_020_013` | Xuất kho với kho vật lý | Ở cấp điểm bán mọi form nghiệp vụ (nhập/xuất/chuyển/kiểm kho) đều KHÔNG có ô chọn kho: nhập/xuất tự lấy kho mặc định, "Kho nhận" chuyển kho chỉ liệt kê điểm bán (tự lấy kho mặc định), "Mở phiên kiểm kho" tự lấy kho mặc định (đo 23 | ⏸ CHỜ ANH/CHỊ (câu hỏi 10) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `04_5_020_014` | Nhập kho với kho vật lý | Ở cấp điểm bán mọi form nghiệp vụ (nhập/xuất/chuyển/kiểm kho) đều KHÔNG có ô chọn kho: nhập/xuất tự lấy kho mặc định, "Kho nhận" chuyển kho chỉ liệt kê điểm bán (tự lấy kho mặc định), "Mở phiên kiểm kho" tự lấy kho mặc định (đo 23 | ⏸ CHỜ ANH/CHỊ (câu hỏi 10) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `04_5_020_015` | Chuyển kho giữa các kho trong CÙNG một đơn vị | Ở cấp điểm bán mọi form nghiệp vụ (nhập/xuất/chuyển/kiểm kho) đều KHÔNG có ô chọn kho: nhập/xuất tự lấy kho mặc định, "Kho nhận" chuyển kho chỉ liệt kê điểm bán (tự lấy kho mặc định), "Mở phiên kiểm kho" tự lấy kho mặc định (đo 23 | ⏸ CHỜ ANH/CHỊ (câu hỏi 10) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `07_2_080_001` | Giá vốn tạm tính khi tồn = 0 và bán âm | 🔴 Câu hỏi giá vốn của bán âm — cần dữ liệu nền tồn = 0 và chính sách bán âm bật; GHI đơn bán thật. | ⏸ CHỜ ANH/CHỊ (câu hỏi 11) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `07_2_080_002` | Giá vốn tạm tính khi tồn > 0 rồi bán vượt thành âm | Như 07_2_080_001, cần tồn dương nhỏ hơn số bán. | ⏸ CHỜ ANH/CHỊ (câu hỏi 11) — 28/09 soát lại: không phải thiếu dữ liệu mà vướng thiết kế / kỳ vọng chưa chốt |
| `16_010_021` | Bán hàng ký gửi khi hợp đồng hết hiệu lực bị chặn | Làn 7 không có điểm bán nào có hàng ký gửi (dữ liệu ký gửi của chuỗi ở điểm bán thật 11265) ⇒ không bán thử được. Cần seed: hợp đồng ký gửi hết hiệu lực + nhập hàng ký gửi cho điểm bán làn 7. | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — chờ anh/chị (B14) — 28/09 `ban-ky-gui.gdv.spec.js` + seed 18 `ky-gui`, làn 5: bán SP có HĐ ký gửi đã HUỶ ⇒ quầy báo "Thanh toán thành công", đơn đã thanh toán, KHÔNG sinh phiếu xuất kho (lỗi CONSIGN-005 nuốt ở bước xuất kho chạy nền) |
| `16_010_022` | Sản phẩm ký gửi chưa gán NCC không treo được công nợ | Làn 7 không có sản phẩm ký gửi chưa gán NCC ở điểm bán làn ⇒ không bán thử được. Cần seed sản phẩm ký gửi chưa gán NCC + tồn ở điểm bán làn 7. | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — chờ anh/chị (B14) — như 16_010_021 với SP ký gửi chưa gán NCC (CONSIGN-002): bán được, không phiếu xuất, không công nợ |
| `16_030_007` | Hai nhãn Nguồn giá có hệ quả khác hẳn nhau | Không kỳ nào có dòng chưa giá / thiếu nguồn giá. | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — chờ anh/chị (B16, B17) — 28/09 `nguon-gia.tct.spec.js` + seed 18.9–18.10, chốt THẬT 2 kỳ riêng làn (#314, #316): dòng đơn giá 0 BỊ CHẶN chốt nhưng hiện nhãn VÀNG; kỳ chỉ có nhãn vàng chốt lỗi HTTP 500 |
| `16_060_022` | Số báo cáo có độ trễ so với biên bản | Cần bán một đơn hàng ký gửi rồi mở ngay báo cáo: làn 7 không có điểm bán nào có hàng ký gửi (dữ liệu ký gửi của chuỗi ở điểm bán thật 11265 — cấm bán thử). Muốn phủ ⇒ seed hợp đồng + nhập hàng ký gửi cho điểm bán làn 7. | ⏸ CHỜ ANH/CHỊ (B15) — seed có, nhưng biên bản không thấy chứng từ điểm bán làn (pod 2) nên không có gì để so |
| `18_1_040_016` | 🔴 Không trộn lô xả kho với lô thường trong cùng dòng hàng | Không có lô XẢ KHO ở điểm bán seed (bảng lô TC không có nhãn 'Xả kho', đo 25/09). | ✅ XONG — 28/09 `xa-kho.gdv.spec.js`, làn 5: tự nhập lô mới + đẩy sang Hàng xả kho (dọn ở finally); thêm lô xả kho vào dòng lô thường ⇒ báo đúng nguyên văn "…tách sản phẩm này thành 2 dòng riêng", lô không được thêm |
| `18_3_080_003` | Nút Đặt hàng trước không dùng được với đơn online | Cần một đơn online (có orderOnlineId) trên điểm bán test | ⛔ không dựng được qua FE — xem C5 |
| `18_4_020_004` | Thẻ thẻ trả trước chỉ hiện khi có phát sinh | Cần một kỳ có phát sinh thẻ trả trước và một kỳ không — chưa xác định được kỳ nào có | ⛔ không dựng được — xem C5 |
| `18_4_100_002` | Vai tỉnh thấy được đơn của các điểm bán thuộc tỉnh | Vai tỉnh làn 8 chỉ quản 1 điểm bán (AUTO8_SHOP) — không đối chiếu được 'không thấy đơn tỉnh khác' trong phạm vi tỉnh; cần tỉnh có ≥ 2 điểm bán có đơn. | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — chờ anh/chị (câu hỏi 9) — 28/09 `pham-vi.province.spec.js`, làn 5: điểm bán trực thuộc có 3 đơn hôm nay, vai tỉnh KHÔNG gọi API đơn nào, bảng trống |
| `18_5_140_002` | Chặn khi không đủ lô để hoàn đúng số lượng | Cần sản phẩm quản lý lô với số lô truy được ít hơn số lượng yêu cầu hoàn | ✅ XONG 28/09 — `lo-thieu.gdv.spec.js` — ĐẠT: đơn bán 149 TC (lô truy 147), trả 149 ⇒ POD-0011 "Không đủ lô để hoàn đúng số lượng yêu cầu", không tạo đơn hoàn. Kèm toast thừa "Không có quyền truy cập" |
| `27_010_001` | Tải hoá đơn XML lên và đối soát tự động | Làn 7 không có PO riêng; upload hoá đơn vào PO của người khác mà khớp là HỆ THỐNG TỰ HẠCH TOÁN + ghi công nợ NCC (autoAccountIfMatched) — không dọn được. Cần seed PO AUTO7_ có phiếu nhập. | ✅ XONG — 28/09 `po-rieng.tct.spec.js` + seed 19 `po-rieng`, làn 5: "Đã upload và đối soát XML", dòng HĐ tự tìm đúng PO riêng, cột Đối soát = Lệch. 🔴 Mỗi lần chạy TIÊU 1 PO riêng |
| `27_060_001` | Cảnh báo khi còn hoá đơn điều chỉnh chưa rõ dấu | Không có hoá đơn điều chỉnh chưa rõ dấu trên server dev (SELECT SHOP_PO_INVOICE_XML: 1 hoá đơn ĐC duy nhất, dấu GIAM). Dựng bằng upload cần PO riêng. | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — chờ anh/chị (B18) — HĐ điều chỉnh không có TCDChinh / ghi chú / tổng tiền vẫn bị đọc thành "Không đổi" ⇒ cảnh báo chưa rõ dấu không bao giờ hiện |

### A. Ghi dữ liệu một chiều — chờ user cho phép (37)

| Case | Tên | Lý do đo được | Quyết định / trạng thái |
|---|---|---|---|
| `03a_060_007` | Chốt số thủ công khi đơn không bao giờ về đủ | 🔴 GHI chênh lệch tiền chờ duyệt. Cần ca ở đúng trạng thái cho chốt thủ công; chạy nhầm là ghi một khoản lệch tiền vào sổ. | |
| `03b_030_007` | Chính mình còn ca chưa chốt thì hệ thống tự chốt ca cũ rồi m | Cần chính tài khoản test còn một ca chưa chốt; luồng này tự CHỐT ca cũ, ghi quỹ tiền mặt thật. | |
| `03b_040_011` | Mở lại ca đã chốt | 🔴 Mở lại ca đã chốt = mở khoá số liệu đã chốt, ảnh hưởng báo cáo của quản lý. | |
| `03b_040_012` | Bấm chốt ca hai lần liên tiếp không tạo hai lần chốt | Cần bấm hai lần trong cùng một khoảnh khắc trên ca đã tạm chốt — GHI chốt ca thật. | |
| `07_1_060_002` | Làm tròn tiền và Làm tròn tiền phần kho đặt khác nhau | 🔴 Cấu hình áp cho CẢ CHUỖI (chainId 626 dùng chung mọi làn test và người dùng dev) — bật/tắt hay lưu là đổi hành vi của mọi người ngay; chỉ chạy khi user cho phép ghi cấu hình chuỗi. Cần đặt hai cấu hình làm tròn khác nhau rồi lậ | |
| `07_3_040_002` | Tắt một phương thức thì quầy không chọn được phương thức đó | TẮT PHƯƠNG THỨC THANH TOÁN THẬT — quầy mất phương thức đó ngay lập tức | |
| `07_3_040_003` | Tắt phương thức thanh toán đang được dùng dở | Cần đơn đang mở dở đã chọn phương thức rồi mới tắt — khó dựng; và GHI cấu hình áp cho cả đơn vị. | |
| `12-don-vi-van-tai_070_003` | Kiểm tra nhập đầy đủ thông tin các trường | — | |
| `12-don-vi-van-tai_070_007` | Kiểm tra nhập số tiền bằng 0 | — | |
| `12-don-vi-van-tai_070_008` | Kiểm tra nhận kho ghi nhận bồi thường | — | |
| `12-don-vi-van-tai_070_009` | Kiểm tra chỉnh sửa số tiền ghi nợ | — | |
| `12-don-vi-van-tai_070_010` | Kiểm tra ghi nợ lần 2 | — | |
| `12-don-vi-van-tai_070_011` | Kiểm tra kho chuyển thiếu, cộng lại tồn kho chuyển | — | |
| `CNDB-CD-010` | Huỷ drawer kiểm đếm giữa chừng thì không tạo bút toán | Cần phiếu nộp tiền đang chờ kiểm đếm; và phải làm dở rồi huỷ — dễ để lại trạng thái nửa vời trên dữ liệu thật. | |
| `CNDB-CD-011` | Sau khi xác nhận nhận tiền, số liệu liên quan đổi đúng | 🔴 GHI: xác nhận nhận tiền tạo BÚT TOÁN thật và đóng phiếu con. Cần điểm bán + phiếu nộp tiền dựng riêng. | |
| `CNDB-KY-009` | Kỳ vẫn ký được khi còn phiếu đã giao mà Tỉnh chưa xác nhận | Ghi dữ liệu: KÝ biên bản kỳ — không hoàn tác được | |
| `CNDB-ND-011` | Huỷ form khai nợ đầu kỳ giữa chừng thì không lưu gì | GHI: mở form khai nợ đầu kỳ trên điểm bán thật. | |
| `CNDB-PQ-002` | Duong xac nhan le tung phieu da bi khoa o may chu | Nếu bản deploy chưa có bản khoá 15/09 thì thao tác này ĐÓNG PHIẾU THẬT | |
| `14_3_040_005` | Phát hành hoá đơn thành công | — | |
| `14_3_040_011` | Phát hành lên hệ thống HĐĐT thất bại | — | |
| `14_3_040_012` | Phát hành lại sau khi thất bại không tạo hoá đơn trùng | — | |
| `14_3_040_015` | Hoá đơn phát hành xong không thu hồi được | — | |
| `16_010_018` | Lập lệnh chi bị chặn khi NCC còn khoản Tạm tính | Lập lệnh chi cho NCC còn khoản Tạm tính: nếu BE không chặn thì sinh lệnh chi thật cho NCC của chuỗi. Cần user cho phép + chỉ định NCC thử. | |
| `16_030_018` | 🔴 Cảnh báo rà soát KHÔNG chặn chốt kỳ | Case kiểm "vẫn CHỐT ĐƯỢC" ⇒ chốt kỳ thật. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho phép rõ (bàn giao 24/09). | |
| `16_030_019` | Chốt kỳ khi còn mặt hàng chưa đóng dấu giá bị chặn | Làn 7 không kỳ nào còn dòng chưa đóng dấu giá (030_006 đo 25/09) ⇒ bấm chốt sẽ CHỐT THẬT thay vì bị chặn. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu là | |
| `16_030_020` | 🔴 Chốt kỳ bị chặn khi Thẻ kho đã bị dọn theo tiering | Không kỳ nào có Thẻ kho trước ngày bắt đầu kỳ đã bị dọn theo tiering (kỳ cũ nhất 2026). Bấm chốt thử là chốt thật. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải d | |
| `16_030_021` | Khoản nghĩa vụ đã thuộc kỳ khác chặn chốt | Không dựng được khoản nghĩa vụ gắn sai kỳ qua hệ thống; bấm chốt thử là chốt thật. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho  | |
| `16_030_025` | Sửa ngày chứng từ về kỳ đã chốt bị chặn | Cần kỳ đã chốt có phiếu sửa được ngày chứng từ — phiếu ký gửi của 2 kỳ LOCKED nằm ở điểm bán thật (không phải làn test); sửa ngày chứng từ thật là ghi dữ liệu nghiệp vụ. Chờ user chỉ định phiếu thử. | |
| `16_030_026` | Bật lọc đơn vị lúc chốt không ảnh hưởng biên bản | Case chốt kỳ (khi đang bật lọc đơn vị) rồi đọc biên bản. Chốt kỳ là MỘT CHIỀU (không mở lại được) trên kỳ THẬT của chuỗi (36 kỳ đều thuộc TCT, NCC dùng chung — không phải dữ liệu làn test) — chờ user cho phép rõ (bàn giao 24/09). | |
| `16_050_012` | Chọn kho của đơn vị khác bị chặn | Chỉ tới được khi kỳ đã KHỚP biên bản ⇒ nếu BE không kiểm kho thuộc đơn vị thì lệnh này GHI NỢ THẬT. … | |
| `16_050_013` | Ghi nợ chính thức thành công | Khép kỳ (đổi trạng thái kỳ sang đã ghi nợ) là một chiều. … | |
| `16_050_015` | Kỳ không phát sinh nghĩa vụ thì khép kỳ mà không ghi nợ | Khép kỳ (đổi trạng thái kỳ sang đã ghi nợ) là một chiều. … | |
| `16_050_017` | Sau khi ghi nợ thì lập được lệnh chi cho NCC | Cần ghi nợ chính thức trước (050_013). … | |
| `16_070_001` | 🔴 Ghi nợ nội bộ TCT ↔ Bưu điện tỉnh sau khi ghi nợ NCC | Ghi nợ nội bộ TCT ↔ BĐT sinh công nợ nội bộ thật, không hoàn tác; kỳ INVOICED duy nhất (id 2) là dữ liệu thật của chuỗi. Chờ user cho phép. | |
| `16_070_004` | 🔴 TCT không ăn chênh trên hàng ký gửi | Cần kỳ đã ghi nợ nội bộ (070_001) — chờ user cho phép ghi nợ nội bộ. | |
| `27_040_004` | Gỡ hoá đơn khỏi đối soát của phiếu | Xoá XML = xoá mềm hoá đơn thật, không có chức năng khôi phục. Cần hoá đơn AUTO7_ riêng (cần PO riêng). | ✅ XONG — 28/09 `po-rieng.tct.spec.js` trên PO riêng làn: Xoá XML → DELETE 200, "Đã xoá hoá đơn XML", HĐ biến khỏi danh sách đối soát |
| `27_060_003` | Xác nhận hạch toán công nợ mở đường cho thanh toán | Hạch toán công nợ không hoàn tác được (ghi công nợ NCC, mở thanh toán) — skill cấm chạy. | 🔴 ĐÃ VIẾT, ĐANG ĐỎ — chờ anh/chị (B19) — HĐ khớp từng mặt hàng ⇒ hệ thống TỰ hạch toán ngay lúc upload, nút đã "Đã hạch toán công nợ" (khoá) trước khi bấm |

### B. Chưa chốt kỳ vọng / đặc tả mâu thuẫn — chờ user quyết (30)

| Case | Tên | Lý do đo được | Quyết định / trạng thái |
|---|---|---|---|
| `02_010_019` | Lọc Trạng thái làm việc = Đã nghỉ | Kỳ vọng chưa chốt: chưa biết bộ lọc Trạng thái làm việc áp theo PHÂN CÔNG hay theo NHÂN VIÊN khi một người vừa Đang làm vừa Đã nghỉ. | ✅ kỳ vọng đã chốt 28/09 (A1=3 / A2=a) — chờ viết script |
| `02_020_020` | Dòng vai trò: bỏ trống Trạng thái | Không tái hiện được qua giao diện: chọn Đơn vị xong code tự đặt status=1 và Select trạng thái KHÔNG khai allowClear ⇒ không có cách để trống ô. Rule "Chọn trạng thái" là luật không chạm tới được — cần user chốt bỏ rule hay mở allo | |
| `02_030_003` | Đổi trạng thái phân công từ Đang làm sang Đã nghỉ | 🔴 Mâu thuẫn đặc tả chưa được user quyết: sheet QC nói đổi một phân công sang Đã nghỉ thì TOÀN BỘ phân công cùng đổi; code không thấy xử lý lan. Case còn GHI dữ liệu thật. | ✅ kỳ vọng đã chốt 28/09 (A1=3 / A2=a) — chờ viết script |
| `03a_010_009` | Tên ca nhập toàn khoảng trắng | Kỳ vọng chưa chốt: FE không trim nên không chặn được ở client, chưa biết backend có chặn tên ca toàn khoảng trắng. Case còn GHI dữ liệu thật. | |
| `03a_010_014` | Ca khai ở trạng thái Ngừng hoạt động KHÔNG bị kiểm chồng lấn | Kỳ vọng chưa chốt: chưa có đặc tả nói ca Ngừng hoạt động có được trùng khít giờ với ca đang hoạt động hay không. Case còn GHI dữ liệu thật. | |
| `03a_030_008` | Chọn nhân viên cụ thể nhưng bỏ trống danh sách | Kỳ vọng chưa chốt: ô chọn nhân viên không có rule required, chưa biết backend có chặn cấu hình rỗng. Case GHI cấu hình áp cho toàn điểm bán. | |
| `03a_030_009` | Biên số phút đi muộn / về sớm | Cần chốt giới hạn TRÊN của số phút đi muộn/về sớm — đặc tả không có. Case GHI cấu hình chấm công thật. | |
| `03a_040_008` | Chế độ lặp: bỏ trống Ngày kết thúc | Chưa có đặc tả: không có Ngày kết thúc thì hệ thống xếp lịch đến đâu, và quan hệ với giới hạn 90 ngày ở 03a_040_003. Case còn GHI lịch thật. | |
| `03b_040_009` | Chốt ca TRƯỚC giờ hết ca — phơi hành vi thật | 🔴 Kỳ vọng chưa chốt: sheet QC đòi chặn chốt ca trước giờ, code FE không có phép kiểm. Cần user quyết. Case còn CHỐT CA THẬT. | |
| `03b_060_003` | 🔴 Tài khoản trong danh sách bỏ qua KHÔNG bị chặn | Tiền đề không còn tồn tại: đo 23/09/2026, checkOrderCreateAccessLoader (vnpost-web/src/routes/helpers.js) KHÔNG còn danh sách SĐT bỏ qua nào — mọi tài khoản cấp điểm bán đều qua phép chặn ca. Lệch đặc tả: kịch bản viết theo code c | |
| `04_2_010_003` | Trạng thái đã khai báo tồn đầu kỳ — phơi hành vi thật | 🔴 Kỳ vọng chưa chốt: sheet QC đòi vô hiệu nút + hiện chữ "Đã khai báo tồn kho đầu kỳ"; grep code không thấy chuỗi đó. Cần user quyết. | |
| `04_4_070_004` | Bán âm với sản phẩm quản lý theo Serial | Mâu thuẫn chính sách bán âm × serial — cần user chốt; cần luồng bán (18_1). | |
| `04_5_050_001` | Vai admin cấp Tổng công ty đăng nhập và vào được màn ca làm  | Case đăng nhập/phân quyền, trùng nghiệp vụ phân hệ 31 — cần user chốt giữ ở đâu (xem nhận xét tay). | |
| `04_5_050_002` | Vai quản lý tỉnh đăng nhập | Cùng lý do 04_5_050_001. | |
| `04_5_050_003` | Vai giám đốc xã đăng nhập | Cùng lý do 04_5_050_001; và chưa có tài khoản vai `ward` xác nhận trong .env.accounts. | |
| `04_5_050_004` | Vai cửa hàng trưởng cấp điểm bán / kho đăng nhập | Cùng lý do 04_5_050_001. | |
| `07_2_080_003` | Giá vốn tạm tính khi tồn đang âm rồi bán tiếp | 🔴 Kỳ vọng gốc (`dong23`) CHÉP NHẦM của case thêm danh mục. Cần user chốt giá vốn tạm tính khi tồn đã âm sẵn. | |
| `07_2_080_004` | Thêm danh mục với các trường không hợp lệ | Case thuộc quản lý DANH MỤC sản phẩm, bị đặt nhầm nhóm trong sheet — cần user chốt giữ ở phân hệ nào (08 quản lý sản phẩm?). | |
| `07_3_040_004` | Tắt HẾT phương thức thanh toán | 🔴 Phơi hành vi thật: tắt hết phương thức thì quầy không thu tiền được. Cần user chốt hệ thống phải chặn hay không. Case còn GHI cấu hình. | |
| `10_130_006` | Nhiều bảng giá hiệu lực, cùng ngày nhưng khác GIỜ bắt đầu | "Giờ bắt đầu/kết thúc" của bảng giá là KHUNG GIỜ trong ngày (ô "Không cài đặt khung giờ", TabGeneralInfo.jsx), không phải thời điểm bắt đầu hiệu lực ⇒ "bảng giờ bắt đầu muộn nhất thắng" chưa xác định được nghĩa. Cần user chốt: hai | |
| `CNDB-CD-009` | Ô nguyên nhân lệch túi nhập toàn khoảng trắng | 🔴 Kỳ vọng chưa chốt như CNDB-KY-010, ở ô nguyên nhân lệch túi. | |
| `CNDB-KY-002` | Chặn mở kỳ khi kỳ không tròn tháng | LỆCH ĐẶC TẢ 15/09: modal Mở kỳ đối soát chỉ cho chọn THÁNG, không chọn được khoảng 01/08–15/08. Chờ user quyết sửa kịch bản | |
| `CNDB-KY-010` | Ô ghi chú / căn cứ nhập toàn khoảng trắng | 🔴 Kỳ vọng chưa chốt: ô căn cứ có trim / có chặn chuỗi khoảng trắng. Căn cứ là bằng chứng bút toán. | |
| `CNDB-ND-010` | Bản khai nợ đầu kỳ: biên số tiền 0, số âm, số rất lớn | 🔴 Cần user chốt: nợ đầu kỳ = 0 có được coi là "đã khai" (khác chưa khai), và số âm có được phép (điểm bán ứng trước). Case còn GHI bút toán nợ đầu kỳ. | |
| `14_3_040_017` | Dòng diễn giải bỏ trống | Kỳ vọng CHƯA CHỐT (phụ lục test-cases.md) — đã ghi hành vi thật: …. Vế BE nhận hay chặn cần phát hành thật: … | |
| `14_3_040_018` | Dòng diễn giải toàn khoảng trắng | Kỳ vọng CHƯA CHỐT — đã ghi hành vi thật: …. Vế BE trim hay không cần phát hành thật: … | |
| `16_050_016` | Bút toán sau ghi nợ không sửa trực tiếp được | Kỳ vọng nêu "mở sổ kế toán tìm bút toán vừa sinh" nhưng kịch bản không chỉ màn sổ kế toán nào hiển thị bút toán ghi nợ ký gửi, và ghi nợ thật đang chờ user cho phép — cần chốt màn kiểm. | |
| `18_1_020_020` | Hàng ngừng kinh doanh KHÔNG thêm được vào đơn | Ô tìm màn bán hàng gọi spa-products với disableProductNotActive=true ⇒ hàng ngừng kinh doanh không bao giờ hiện để chọn; lối còn lại là quét mã — đo ở 18_1_030_008 (quét 'Cốc 20' NGUNG_KICH_HOAT không có thông báo nào). | |
| `18_1_040_017` | Đổi lô được ghi vào nhật ký thao tác | Chưa xác định được màn/nhật ký chứa nhóm nghiệp vụ \ | |
| `18_2_010_014` | Đơn giao qua đơn vị vận chuyển bắt buộc có khách | Đơn giao qua đơn vị vận chuyển: màn bán hàng biến thể shop không có lựa chọn hình thức giao hàng ở cột phải (đo 25/09) — cần xác nhận lối vào. | |

### C. Cần giao dịch QR thật qua ngân hàng — chờ user cấp tài khoản nhận QR (11)

| Case | Tên | Lý do đo được | Quyết định / trạng thái |
|---|---|---|---|
| `18_3_040_001` | Thanh toán bằng mã QR động thành công | Cần tài khoản nhận QR thật đã khai ở điểm bán test và một giao dịch quét mã thật — môi trường trỏ dữ liệu thật, không tự tạo được tiền vào | |
| `18_3_040_004` | Tra soát giao dịch QR khi lỗi mạng hoặc timeout | Cần giao dịch QR thật đang treo để bấm Kiểm tra giao dịch | |
| `18_3_040_005` | Nút Hoàn tất giao dịch chỉ bật khi giao dịch đã ghi nhận | Cần giao dịch QR thật chưa ghi nhận để đọc trạng thái nút Hoàn tất giao dịch | |
| `18_3_040_006` | Quay lại bước chọn tài khoản nhận | Cần đã sinh được mã QR thật mới có nút Quay lại | |
| `18_4_080_002` | Phê duyệt đơn hàng tạm nộp | Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng. | |
| `18_4_080_003` | Từ chối đơn hàng tạm nộp có lý do | Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng. | |
| `18_4_080_004` | Chặn từ chối khi bỏ trống lý do | Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng. | |
| `18_4_080_005` | Chặn đối soát khi bỏ trống số tiền | Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng. | |
| `18_4_080_006` | Chặn đối soát khi chưa chọn lý do lệch | Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng. | |
| `18_4_080_007` | Chặn đối soát khi chọn lý do nhưng bỏ trống ghi chú | Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng. | |
| `18_4_080_008` | Ghi nhận đối soát thành công | Cần đơn TẠM NỘP (thanh toán QR ghi nhận 'Tạm nộp') + vai duyệt/đối soát; tạo được đơn tạm nộp cần giao dịch QR thật qua ngân hàng. | |

### D. Không tự động được / không dựng được tiền đề — chờ user quyết bỏ hay test tay (23)

| Case | Tên | Lý do đo được | Quyết định / trạng thái |
|---|---|---|---|
| `03a_060_006` | Tính lại số liệu ca khi đơn offline chưa về đủ | Cần ca có đơn offline chưa đồng bộ đủ — không dựng được bằng UI, phải có máy bán hàng offline. | |
| `03b_010_009` | Ca thiếu cấu hình giờ chấm công thì KHÔNG bị chặn | Cần một ca khai THIẾU giờ bắt đầu/kết thúc. Không tạo được từ UI 03a (hai ô đều bắt buộc) — phải có dữ liệu cũ hoặc sửa DB. | |
| `03b_020_007` | Khoảng cho phép chấm công tính theo cấu hình của ca | Phải chạy ở ba mốc giờ khác nhau trong ngày — auto test không đổi được giờ hệ thống; cần hoặc ca dựng riêng theo giờ chạy, hoặc chấp nhận chạy tay. | |
| `03b_070_001` | Chế độ offline chỉ cho thanh toán tiền mặt | 🔴 KHÔNG đo được bằng Playwright trên vnpost-web: FE web không có chế độ offline (không xử lý navigator.onLine). Nghiệp vụ thuộc máy bán hàng / app POS. | |
| `03b_070_002` | Dữ liệu bán offline tự đồng bộ khi có mạng trở lại | Cùng lý do 03b_070_001. Hệ quả nhìn thấy trên web là cảnh báo đơn offline chưa về đủ ở 03a_060_006. | |
| `04_2_020_014` | Mã lô đã tồn tại | 26/09/2026: nhánh "Mã lô đã tồn tại" không tới được — lô đã có của CÙNG SP nghĩa là SP đã có tồn/phiếu nhập ở kho ⇒ BE chặn cả dòng trước ("Sản phẩm/biến thể này đã có tồn đầu kỳ hoặc lịch sử nhập kho tại kho", đo ở 04_2_020_009/0 | |
| `04_2_020_025` | Bản xem trước chưa ở trạng thái chờ xác nhận thì không tạo đ | 26/09/2026: file 1.000 dòng xử lý xong trong ~7s và nút "Tạo phiếu" chỉ hiện sau bước xử lý (DrawerOpeningBalance STEP PROCESSING) ⇒ không có cửa sổ bấm tạo phiếu khi Chờ/Đang xử lý qua giao diện; giả trạng thái bằng chặn mạng là  | |
| `04_4_060_003` | Kiểm kho GIẢM khi tồn đang bằng 0 | Cần SP có lô tồn 0 hiện trong drawer "Kiểm kho theo lô" — lô về 0 bị ẩn khỏi danh sách lô (đo 04_3_030_006), nên không khai giảm được cho lô tồn 0. Đo 24/09/2026 làn 8. | |
| `07_2_010_002` | Chưa có cấu hình nào thì báo đúng thông điệp | Cần hệ thống chưa có cấu hình khoá kho nào — không dựng lại được | |
| `14_2_010_011` | Gom phiếu khác chuỗi bị chặn | Không dựng được tiền đề: môi trường chỉ có MỘT chuỗi (626) — đo 24/09/2026 SHOP_STOCK_RETURN_REQUEST của POD_01/02/03 đều 1 chain_id; lập chuỗi mới không thuộc phạm vi auto test. Nhánh "Các phiếu gom phải cùng chuỗi" cũng chỉ tới  | |
| `14_2_050_009` | Không xác định được kho tỉnh đang giữ hàng thì chặn | Không dựng được tiền đề: "mất tham chiếu kho giữ" = phiếu có province_import_stock_in_out_id trỏ tới phiếu nhập không tồn tại — chỉ sinh ra khi sửa/xoá dữ liệu DB, không có luồng giao diện/API nào tạo ra (DB chỉ SELECT). | |
| `14_3_010_018` | Hoá đơn đến qua hộp thư điện tử hiện đúng nguồn tiếp nhận | Chưa dựng được tiền đề: hoá đơn nguồn MAIL chỉ sinh khi job IMAP của pod đọc thư NCC gửi vào hòm thư đơn vị rồi tự ghép đợt trả — không có API/giao diện nạp với source=MAIL, làn test không có hòm thư cấu hình. Cần user cho hòm thư | |
| `14_3_030_003` | Đối soát hoá đơn không có dòng hàng bị chặn | Không dựng được tiền đề: từ khi có kiểm `countGoodsLines` (010_014), hoá đơn không dòng hàng bị chặn ngay lúc nạp và hệ thống không có chức năng xoá dòng hoá đơn ⇒ nhánh "Hoá đơn không có dòng hàng nào" của /reconcile không còn đư | |
| `14_3_030_004` | Đối soát khi phiếu xuất kho không có dòng hàng bị chặn | Không dựng được tiền đề: đợt trả chỉ sinh khi "Trả hàng NCC" với SL > 0, phiếu xuất kho trả NCC luôn có ít nhất một dòng; không có chức năng gỡ dòng phiếu xuất đã hoàn tất. | |
| `14_3_030_022` | Dòng Chưa ghép được sửa quy đổi đơn vị rồi đối soát lại là k | 🔴 Không có đường làm theo kịch bản: đối soát lấy hệ số quy đổi từ SNAPSHOT trên dòng phiếu xuất (convert_to_main_unit_value) và chỉ nhận ĐVT hoá đơn TRÙNG TÊN ĐVT dòng phiếu — sửa quy đổi ở danh mục sản phẩm không làm dòng "Chưa  | |
| `14_3_040_014` | Lấy bản nháp khi phiếu xuất kho không có dòng hàng bị chặn | Không dựng được tiền đề: phiếu xuất kho trả NCC luôn có ít nhất một dòng (đợt chỉ sinh khi trả SL > 0), không có chức năng gỡ dòng phiếu xuất đã hoàn tất. | |
| `16_060_009` | Không xác định được chuỗi thì chặn xem báo cáo | Không có tài khoản thiếu chainId: mọi vai đăng nhập đều mang chainId của chuỗi (useActiveScope). Nhánh validate() "Không xác định được chuỗi (chainId)" chỉ tới được khi sửa state ứng dụng — không phải hành vi người dùng. | |
| `17_030_008` | Ngừng quầy không tìm thấy quỹ tiền mặt | Không dựng được quầy thiếu quỹ tiền mặt qua UI/API | |
| `18_1_030_011` | Quét barcode khi mất kết nối máy quét | Phần cứng: rút máy quét USB — máy quét là thiết bị bàn phím, trình duyệt không nhận biết cắm/rút; không giả lập được. | |
| `18_1_060_022` | Mất kết nối cân sau khi quét barcode | Luồng kết nối/mất kết nối cân không đi qua cầu nối giả lập (xem 18_1_060_001) — cần cân thật hoặc app Electron. | |
| `18_3_060_001` | Thanh toán đa phương thức đủ số phải thu | Phải mở lần lượt các màn SDK VNPD (tiền mặt/thẻ/QR) — SDK bên thứ ba, Playwright không điều khiển được | |
| `18_3_060_007` | Chặn khi chưa hoàn tất lần lượt các màn SDK | Phải bỏ qua một màn SDK VNPD để bắt cảnh báo — SDK bên thứ ba | |
| `18_5_140_007` | Chặn khi không xác định được thời gian tạo đơn gốc | Cần đơn gốc THIẾU thời gian tạo — dữ liệu hỏng, không tự tạo được | |
