# Báo cáo case cần user chốt kỳ vọng

> Ghi tay trong lúc viết script theo `_CHECKLIST.md`, lần lượt theo mã phân hệ. Mỗi case ở đây **chưa
> viết phép kiểm**, vì skill `auto-test` cấm tự bịa kỳ vọng. User chốt xong thì ghi quyết định vào cột
> **Quyết định**, rồi mở lại case trong `test-input.json`.
>
> Bắt đầu: 23/09/2026.

Có ba loại:

- **Kỳ vọng chưa chốt**: đặc tả chưa nói hệ thống phải làm gì.
- **Lệch đặc tả / nghi lỗi sản phẩm**: script đã chạy, kết quả thật khác tài liệu. Assertion được giữ nguyên nên case đang **đỏ**.
- **Không tự động được / cần quyết định an toàn**: ghi ra để user quyết có làm hay không.

## Tiến độ (cập nhật 23/09/2026)

Trạng thái chạy của từng case nằm ở 3 cột cuối (`Trang thai chay`, `Ngay chay`, `Ghi chu chay`) của `test-cases.csv` trong từng phân hệ. Cột này do `node tool/bin/cap-nhat-trang-thai.js <phân hệ>` ghi sau mỗi lượt chạy.

| Phân hệ | Script thật (trước → sau) | Vỏ còn lại | Lượt chạy trọn bộ gần nhất | Ghi chú |
|---|---|---|---|---|
| `03a_quan_ly_ca_lich_lam_viec` | 47 → **57** / 64 | 7 (đều nằm ở báo cáo này) | Đạt 42 · Không đạt 2 · Chưa chạy 20 | 2 case đỏ là phát hiện về sản phẩm |
| `03b_ca_lam_viec_nhan_vien` | 33 → **38** / 48 | 10 (đều nằm ở báo cáo này) | Đạt 16 · Không đạt 0 · Chưa chạy 32 | Đã xoá 20 stub rỗng chạy xanh giả. Phần lớn case "chưa chạy" là trạng thái ca dùng một lần trong ngày |
| `04_1_canh_bao_ton_kho` | 67 → **69** / 72 (xoá 3 stub trùng mã) | 3 (đều nằm ở báo cáo này) | Đạt 45 · Không đạt 1 · Chưa chạy 26 | `010_013` đỏ là phát hiện về sản phẩm. `020_001`/`020_003` flaky ở lượt đầu, chạy lại thì xanh. `020_018`/`020_021` đã viết, chạy xanh (vai `tct`, điểm bán seed). ⚠️ `020_010`/`020_011` có sẵn đang skip oan: chọn điểm bán rác không có sản phẩm, và bám `.ant-select-dropdown` trong khi ô tìm dùng popup `div` tự vẽ, lọc theo **tên** |
| `04_2_ton_kho_dau_ky` | 20 → **25** / 36 | 10 (đều nằm ở báo cáo này) | Đạt 10 · Không đạt 2 · Chưa chạy 23 | 2 case đỏ là lỗi sản phẩm (phân trang, ô Tổng dòng) |

| `04_3_nhap_xuat_chuyen_kho` | 20 → 55 → **97** / 97 (26/09) | 42 (39 tắt có `_blocked` đo được + 3 skip tại chỗ, đều ở báo cáo này) | Đạt 36 · Không đạt 12 (10 là lệch đặc tả, 2 spec cũ `060_001`, `010_013`) · Chưa chạy 53 | Viết mới 39 case ghi (nhập/xuất/chứng từ/huỷ/chuyển kho) trên làn 8. Phần còn lại bị chặn bởi cấu trúc: điểm bán không có phiếu nhập NCC, chỉ nhập tay SP giá tiêu chuẩn, thiếu HUB tỉnh |
| `04_4_kiem_kho` | 5 → **20** / 33 | 8 (đều có `_blocked` đo được, ở báo cáo này) | Đạt 19 · Không đạt 4 (đều là lệch đặc tả) · Chưa chạy 10 | Kiểm kho theo phiên trên làn 8; đếm toàn kho bằng nhập Excel theo lô |
| `04_5_quan_ly_ton_kho` | 21 → **28** / 46 | 18 (có `_blocked` đo được, ở báo cáo này) | Đạt 14 · Không đạt 2 (spec cũ: 010_005, 030_002) · Chưa chạy 30 | Thêm 8 case quản lý kho hàng (kho tạm có dọn) + khởi tạo HUB tỉnh |
| `07_1_cau_hinh_chung` | 14 → **21** / 29 | 8 (ghi cấu hình CHUỖI dùng chung — chờ user cho phép) | Đạt 15 · Không đạt 1 (spec cũ 010_006: giá trị đang lưu là "Luôn làm tròn lên") · Chưa chạy 12 | 7 case validate chạy KHÔNG ghi (chặn request lưu ở mạng) |
| `07_2_cau_hinh_kho` | 7 → **28** / 53 | 25 (có `_blocked` đo được) | Đạt 22 · Không đạt 4 (đều là phát hiện) · Chưa chạy 17 | Khoá kho theo SKU giới hạn ở điểm bán seed, có bỏ khoá cuối; validate cấu hình chuỗi chạy không ghi |
| `07_3_don_hang_va_thanh_toan` | 7 → **10** / 18 | 8 (cấu hình chuỗi / thiếu dữ liệu) | Đạt 9 · Không đạt 1 (phát hiện 020_004) · Chưa chạy 8 | Logo in hoá đơn trên điểm bán seed; validate đổi trả không ghi |
| `07_4_van_hanh` | 7 → 9 → **32** / 32 (26/09) | 23 (hạn mức/luồng duyệt của cả mạng lưới, cần tài khoản vai duyệt) | xem mục 07_4 | 2 case validate không ghi |

Tiếp theo: `08_quan_ly_san_pham`, rồi đi lần lượt theo mã.

---

## `03a_quan_ly_ca_lich_lam_viec`

### Kỳ vọng chưa chốt

| Case | Tên | Câu hỏi cần chốt | Quyết định |
|---|---|---|---|
| `03a_010_009` | Tên ca nhập toàn khoảng trắng | FE không trim, rule chỉ `required`, nên request vẫn được gửi. Backend có phải chặn không, và thông báo nguyên văn là gì? | |
| `03a_010_014` | Ca Ngừng hoạt động không bị kiểm chồng lấn | Code chỉ kiểm chồng lấn khi ca đang Hoạt động. Ca Ngừng hoạt động có được phép trùng khít giờ với ca đang hoạt động không? | |
| `03a_030_008` | Tự động chấm công "nhân viên cụ thể" nhưng danh sách rỗng | Ô `autoCheckinEmployeeIds` không có rule `required`. Có phải chặn lưu không? Nếu có thì chặn ở FE hay BE, thông báo là gì? | |
| `03a_030_009` | Biên số phút đi muộn / về sớm | Giới hạn **trên** là bao nhiêu phút? Hiện nhập 9999 phút vẫn lưu được. | |
| `03a_040_008` | Chế độ lặp: bỏ trống Ngày kết thúc | Không có ngày kết thúc thì hệ thống xếp lịch tới đâu? Quan hệ với giới hạn 90 ngày của `03a_040_003` thế nào? | |

### Lệch đặc tả / nghi lỗi sản phẩm (case đỏ, giữ nguyên assertion)

| Case | Tài liệu nói | Sản phẩm làm (đo 23/09/2026) | Quyết định |
|---|---|---|---|
| `03a_040_003` | Xếp lịch lặp **không quá 90 ngày** | Khoảng 365 ngày vẫn gửi `POST /timekeeping/schedule/batch`, không có thông báo nào nhắc 90 ngày. Cần chốt: chặn ở FE hay ở BE? | |
| `03a_PQ_001` | Giao dịch viên **không vào được** màn Quản lý ca | Vai `gdv` mở được màn và thấy danh sách ca (API trả 200) ⇒ nghi lỗ hổng phân quyền. | |

### Chưa chạy vì quyền / an toàn (không phải thiếu kỳ vọng)

| Case | Lý do | Cần gì |
|---|---|---|
| `03a_050_002` | Vai `seed_shop` (Cửa hàng trưởng) nhận `SSHOP-401` ở `/timekeeping/schedule/admin/update` ⇒ không tự dựng được "lịch đã chấm công". Script đã viết đủ, đang skip kèm lý do. | Chọn một trong hai: (a) cấp quyền chấm công hộ cho Cửa hàng trưởng; (b) chỉ định một tài khoản có quyền đó. |
| `03a_060_006` | Cần ca có **đơn offline chưa đồng bộ đủ**, chỉ dựng được bằng máy bán hàng offline. | Có máy bán hàng offline, hoặc chấp nhận bỏ case. |
| `03a_060_007` | Chốt số thủ công **ghi một khoản chênh lệch tiền chờ duyệt** vào sổ. Kịch bản ghi rõ "🚫 không chạy tự động". | User xác nhận có cho chạy tự động trên điểm bán seed không. |

---

## `03b_ca_lam_viec_nhan_vien`

### Kỳ vọng chưa chốt

| Case | Tên | Câu hỏi cần chốt | Quyết định |
|---|---|---|---|
| `03b_040_009` | Chốt ca TRƯỚC giờ hết ca | Sheet QC `dong26` đòi "cảnh báo và không cho chốt". Code FE thì nút "Chốt ca" không kiểm giờ nào. Kỳ vọng đúng là **chặn** hay **cho chốt**? | |

### Case lỗi thời (tiền đề không còn tồn tại trong code)

| Case | Vấn đề | Đề xuất | Quyết định |
|---|---|---|---|
| `03b_060_003` | Kịch bản giả định có "danh sách 8 SĐT hardcode được bỏ qua chặn ca" trong `routes/helpers.js`. Đo 23/09/2026: `orderGuard` chỉ còn xét **cấp đơn vị** và **ca OPEN**, không còn danh sách SĐT nào. | Xoá case, hoặc viết lại thành "mọi tài khoản cấp điểm bán đều bị chặn". | |

### Chưa tự động được / cần quyết định

| Case | Lý do | Cần gì |
|---|---|---|
| `03b_010_009` | Cần một ca **thiếu giờ bắt đầu/kết thúc**. Form 03a bắt buộc cả hai ô, nên không dựng được bằng UI. | Có sẵn dữ liệu cũ, hoặc user tự sửa DB (quy tắc: DB chỉ SELECT). |
| `03b_020_007` | Phải quan sát ở **ba mốc giờ** (trước, trong và sau khung). Auto test không đổi được giờ hệ thống. Vế "ngoài khung" đã phủ ở `03b_020_004`. | Chấp nhận chạy tay, hoặc chấp nhận dựng 3 ca riêng theo giờ chạy (ca rác không xoá được vì đã được dùng). |
| `03b_030_006` | Cần quầy **đang có ca chưa chốt của người khác**. Hôm nay mọi ca của điểm bán seed đã chốt, còn ca của `seed_gdv` nằm ngoài giờ. | Cho phép dựng thêm một ca rác trong giờ chạy, và cho phép mở/chốt ca thật (ghi quỹ tiền mặt 0đ) trên điểm bán seed. |
| `03b_030_007` | Luồng này **tự chốt ca cũ** của chính mình, ghi quỹ tiền mặt. Cần người đăng nhập còn một ca chưa chốt. | Như trên. |
| `03b_040_011` | Mở lại ca đã chốt là **mở khoá số liệu đã chốt**, ảnh hưởng báo cáo của quản lý. Cần quyền mở lại. | User xác nhận có cho chạy tự động không, và vai nào có quyền mở lại. |
| `03b_040_012` | Cần một ca **đã tạm chốt** để bấm chốt hai lần. Hôm nay không còn ca nào như vậy. | Như `030_006`. |
| `03b_070_001` · `03b_070_002` | FE web không có chế độ offline; nghiệp vụ thuộc máy bán hàng / app POS. | Bỏ khỏi phạm vi auto test web. |

🔴 Nhiều case của `03b` là **trạng thái dùng một lần trong ngày** (mở ca → tạm chốt → chốt). Sau lượt đầu tiên của mỗi ngày, các case đó **skip kèm lý do**. Muốn có số liệu đầy đủ thì phải chạy vòng đời ca một lần vào đầu ngày, khi bộ dựng nền vừa xếp ca mới.

---

## `04_1_canh_bao_ton_kho`

### Kỳ vọng chưa chốt

| Case | Tên | Câu hỏi cần chốt | Quyết định |
|---|---|---|---|
| `04_1_010_015` | Nút phóng to / thu nhỏ bảng | Sheet QC `FUNC_1_192` đòi có nút này. Bảng chỉ bật `reload` + `setting`, không bật `fullScreen`. Tài liệu viết theo bản khác, hay chức năng bị tắt? | |
| `04_1_020_016` | Tìm kiếm ở thẻ Theo từng sản phẩm | Sheet QC `FUNC_1_202` đòi tìm được theo **barcode**. Ô tìm chỉ ghi "SKU, tên sản phẩm". Có bắt buộc tìm theo barcode không? | |
| `04_1_020_020` | Nhập chữ vào ô Min / Max | Sheet QC `FUNC_1_208` đòi "tự về 0". `InputNumber` của antd bỏ qua ký tự không phải số, ô giữ giá trị cũ hoặc rỗng. Có bắt buộc "về 0" không? | |

### Lệch đặc tả / nghi lỗi sản phẩm (case đỏ, giữ nguyên assertion)

| Case | Tài liệu nói | Sản phẩm làm (đo 23/09/2026) | Quyết định |
|---|---|---|---|
| `04_1_010_013` | Nút làm mới bảng Dự báo hết hàng nạp lại dữ liệu | Bấm nút mà **không có request nào** trong 6 giây, tức là chỉ dùng cache. Chạy lại lần hai vẫn vậy. | |

### Đổi vai so với kịch bản (cần user xác nhận)

| Case | Kịch bản ghi | Thực tế đo 23/09/2026 | Đã làm |
|---|---|---|---|
| `04_1_020_018` · `04_1_020_021` | Vai `province`, phạm vi "Một đơn vị" | Tỉnh Lý Sơn có **0 sản phẩm**. Dưới xã Lý Sơn chỉ có Hub, không có điểm bán nào để chọn. Ô "Tìm sản phẩm" không trả kết quả. | Chạy bằng vai `tct` trên điểm bán rác `AUTO TEST KHONG DUNG…`, giống `04_1_020_011`. Hai case chỉ kiểm ô nhập và nút xoá, không kiểm phạm vi. |

---

## `04_2_ton_kho_dau_ky`

### Lệch đặc tả / nghi lỗi sản phẩm (case đỏ, giữ nguyên assertion)

| Case | Tài liệu nói | Sản phẩm làm (đo 23/09/2026) | Quyết định |
|---|---|---|---|
| `04_2_020_021` | Bản xem trước phân trang đúng | 🔴 **Lỗi FE chắc chắn.** API trả `page = {"total_elements":25,"total_pages":2,…}` (snake_case), nhưng `DrawerOpeningBalance.jsx:902` đọc `pageInfo?.totalElements`, nên `total = 0`. Không có nút trang 2 ⇒ người dùng **không xem được dòng 21 trở đi** của bản xem trước. | |
| `04_2_020_012` | Xoá dòng lỗi thì "Tổng dòng" và "Lỗi" cùng giảm | Ô "Lỗi" giảm 24 → 23, nhưng "Tổng dòng" **vẫn 25** (chờ 30 giây). | |

### Kỳ vọng chưa chốt

| Case | Tên | Câu hỏi cần chốt | Quyết định |
|---|---|---|---|
| `04_2_020_014` | Mã lô đã tồn tại | Sheet QC `FUNC_1_109` chỉ ghi dở "Hiển thị Mã lô đã tồn tại:". Kỳ vọng là **chặn** hay **cộng dồn** vào lô có sẵn? | |
| `04_2_020_018` | Bộ lọc trạng thái dòng | Trạng thái **"Cảnh báo"** có trong code, nhưng tài liệu không nói nó là gì, và dòng "Cảnh báo" có được ghi vào tồn không? | |

### Ghi tồn kho thật, một lần cho mỗi điểm bán (cần user quyết thứ tự chạy)

| Case | Lý do |
|---|---|
| `04_2_020_008` · `020_009` · `020_011` · `020_022` · `020_023` | Bấm "Tạo phiếu" là **cộng hàng vào tồn thật**, và mỗi điểm bán chỉ khai được **một lần**. Điểm bán seed `AUTO_SHOP_52295376` chưa khai lần nào. Chạy một lần là mất vĩnh viễn trạng thái "chưa khai", kéo theo các case bản xem trước ở trên (cần bước 1) **không chạy lại được** trên điểm bán này. Cần user chọn: (a) chạy các case ghi trên điểm bán này, rồi dựng điểm bán seed mới cho bản xem trước; (b) dựng một điểm bán seed riêng chỉ để ghi. |
| `04_2_020_013` | Cần bản xem trước có sản phẩm ở cả 4 phương pháp giá vốn. Sổ seed đã có đủ 4 SKU, nhưng case sửa mã lô rồi lưu. Nhóm với các case ghi ở trên. |
| `04_2_020_025` | Cần bắt bản xem trước ở trạng thái Chờ xử lý / Đang xử lý. Cửa sổ thời gian quá ngắn để đo bằng UI. |
| `04_2_030_003` | Cần một lượt ở trạng thái "Chờ xác nhận" nhìn từ vai tỉnh. |

---

## `04_3_nhap_xuat_chuyen_kho`

> Chạy trên làn 8 (`VNPOST_LANE=8`, điểm bán seed `AUTO8_SHOP`, shopId 68152), 23/09/2026, vnpost-web `af8cda07`.
> Lệnh: `VNPOST_LANE=8 VNPOST_SETUP_ROLES=seed_gdv,shop rtk proxy npx playwright test --config tai-lieu-test/04_3_nhap_xuat_chuyen_kho/playwright.config.js`

### Đo phạm vi vai (quyết định case chạy bằng ai)

| Vai | Nút "Nhập kho" | Nút "Xuất kho" | Thẻ danh sách Phiếu nhập/xuất | Nút Sửa/Duyệt phiếu nháp |
|---|---|---|---|---|
| `seed_gdv` (Giao dịch viên) | có | **không** | **không** (chỉ thấy Thẻ kho, Xuất huỷ hàng) | chỉ ở drawer vừa tạo |
| `shop` (Cửa hàng trưởng) | **không** | có | có | có |
| `province`, `tct` | không | không | — | — |

⇒ Tạo phiếu nhập bằng `seed_gdv`; sửa/duyệt/huỷ phiếu nhập và toàn bộ phiếu xuất bằng `shop`. Case sau tìm lại phiếu của case trước bằng ghi chú (`AUTO test 04_3_020 nhap` / `AUTO test 04_3_030 xuat`).

### Lệch đặc tả / nghi lỗi sản phẩm (case đang ĐỎ, assertion giữ nguyên)

| Case | Kịch bản nói | Hệ thống làm | Quyết định |
|---|---|---|---|
| `04_3_020_001` | "Nhập từ" là ô bắt buộc | Form cấp điểm bán **không có ô "Nhập từ"** (`orgTypeOptions` lọc bỏ NCC cho xã/điểm bán, lọc bỏ "Nội bộ" cho mọi cấp) ⇒ phiếu gửi `objectType=SHOP` | |
| `04_3_030_001` | Báo lỗi ở "Xuất cho", "Lý do xuất" | Form cấp điểm bán **không có ô "Xuất cho"**; "Lý do xuất" cố định "Xuất hàng vỡ, hỏng" (`subType=BROKEN_DAMAGED`) ⇒ mọi phiếu xuất tay ở điểm bán đều là xuất huỷ vỡ hỏng | |
| `04_3_020_003` | Sửa phiếu nháp: đổi SL **và thêm một dòng mới** | Đổi SL lưu đúng, tồn không đổi (đạt). Thêm dòng SP FIFO: **ô số lượng bị khoá, "Chưa có bảng giá"** — ở cấp điểm bán không chọn được NCC nên mọi SP không phải giá tiêu chuẩn đều thiếu giá (`isPriceMissing`) ⇒ điểm bán chỉ nhập tay được SP giá tiêu chuẩn | |

### Kỳ vọng chưa chốt / cần quyết định

| Case | Câu hỏi | Quyết định |
|---|---|---|
| `04_3_030_007` | Đo được: ô SL lô **không nhận quá tồn lô**, nút "Lưu" khoá, drawer nhắc "Cần phân bổ đủ N Cái"; cột "Tồn lô" hiện số khả dụng. **Không có thông báo lỗi nguyên văn** nêu tồn khả dụng như kịch bản viết. Script đang chấp nhận cột "Tồn lô" là "nêu rõ tồn khả dụng" — user xác nhận cách hiểu này, hoặc đòi thông báo riêng | |
| `04_3_010_020` | 🔴 **Nghi lỗi FE**: phiếu xuất SP **FIFO** ở điểm bán không tạo được — `ensureSerialsValid` đòi `batchProducts` đủ SL, nhưng FIFO chỉ có "Xem lô" read-only và `fifoBatches` không bao giờ được nạp ⇒ modal "Sản phẩm chưa phân bổ đủ lô … đã phân bổ 0/1", drawer "Không có lô tồn tại kho nguồn" dù lô `AUTO8_LO_FIFO` còn 100. Case hiện skip vì chưa có 2 lô FIFO giá khác nhau (điểm bán không nhập được FIFO — xem 020_003) | |

### Lệch đặc tả phát hiện thêm (đo 23/09/2026)

| Case | Kịch bản nói | Hệ thống làm | Quyết định |
|---|---|---|---|
| `04_3_050_003` / `050_004` | Trùng mã lô ⇒ hệ thống phát hiện, cho **chọn gộp / đổi tên** | Không có hộp thoại nào. Bấm "Nhập kho": **phiếu vẫn được TẠO** (nháp), bước duyệt báo "Mã lô đã tồn tại: …" ⇒ để lại **phiếu nháp mồ côi**, lô cũ không đổi | |
| `04_3_030_006` | Ghi rõ lô tồn 0 còn hiện hay bị ẩn | Đo: lô xuất hết **không còn trong** `GET /stock/v2/batch-product` (bị ẩn) — ghi lại để case nhập lại cùng mã lô biết | (chỉ ghi nhận) |
| `04_3_060_006` | Mỗi ô bắt buộc một thông báo riêng | "Kho nhận" → "Vui lòng chọn kho nhận"; mã chứng từ → "Nhập mã hoá đơn chứng từ" (đạt). **Kho chuyển / Sản phẩm**: chỉ bị chặn bằng nút "Tạo phiếu" KHOÁ (chưa có dòng SP), không có thông báo. **SL = 0**: ô tự kẹp về 1, không có thông báo (modal "Số lượng chuyển không hợp lệ" trong code không bao giờ hiện qua giao diện) | |
| `04_3_060_009` | SL > tồn ⇒ chặn **kèm thông báo nêu tồn khả dụng** | Ô SL tự kẹp về đúng tồn, không thông báo nào | |
| `04_3_060_007` | Phiếu mới "Chờ xác nhận" hiện trong danh sách | Trạng thái đúng `PENDING`. 🔴 Nhưng **màn Chuyển kho của vai TCT không liệt kê phiếu này** (danh sách TCT chỉ trả phiếu ở pod TCT; phiếu nằm ở pod điểm bán — đọc chi tiết bằng phiên TCT trả `SSHOP-404`). Phiếu chỉ xem được bằng phiên điểm bán | |
| `04_3_060_014` | — | Id phiếu xuất của phiếu chuyển "xuất ngay" nằm ở trường `stockInId`, `stockOutId` = null (đặt tên ngược) | (ghi nhận) |

### Chưa chạy được — lý do (đã ghi `_blocked` trong `test-input.json`)

| Nhóm | Case | Lý do đo được |
|---|---|---|
| Phiếu nhập từ NCC / PO | `020_006`, `020_007`, `020_011`, `020_012`, `040_005`, `050_002` | Điểm bán **không bao giờ** có phiếu nhập NCC: form không có "Nhập từ"; không vai nào (tct, tct_cung_ung, province, province_cung_ung, kế toán) có nút "Nhập kho" ở `/inventory/import`; NCC chỉ về kho TCT qua PO (13_3) |
| Huỷ / điều chỉnh phiếu nhập | `040_001`–`004` (đã viết, đang skip), `020_009`, `020_010`, `050_007`, `050_008` | `/adjustable` chặn `NOT_SUPPLIER_IMPORT` "Chỉ huỷ được phiếu nhập kho từ nhà cung cấp" cho cả "Huỷ phiếu" lẫn "Điều chỉnh phiếu" |
| Giá vốn MAC/FIFO/đích danh | `010_019`, `010_021`, `020_013`–`020_015`, `010_020` (đã viết, skip) | Điểm bán chỉ nhập tay được SP giá tiêu chuẩn (các SP khác "Chưa có bảng giá", ô SL khoá) ⇒ không tạo được lần nhập giá khác |
| Tồn 0 / âm / serial | `030_008`, `030_009`, `030_010`, `050_010`, `060_011`, `060_013` | Không có SP không-serial tồn 0, không có SP tồn âm; SP serial duy nhất tồn 0. Kỳ vọng tồn âm còn chưa chốt |
| Hoàn trả đơn bán | `050_005`, `050_006` | Cần đơn bán đã hoàn trả (18_5) — chưa có dữ liệu nền |
| Lịch sử lô | `050_009` | Không tìm thấy màn lịch sử theo LÔ (Thẻ kho theo sản phẩm). **Cần user chỉ màn** |
| TCT → Tỉnh → điểm bán | `070_001`–`070_014` | Cần **kho HUB của tỉnh `AUTO8_TINH` có tồn** + tồn SP seed ở kho TCT; thẻ "Kho" ở cấp AUTO8_TINH rỗng. Đề xuất bước seed 10 (tạo HUB tỉnh + tồn đầu kỳ) — **chờ user duyệt** vì tạo bản ghi không xoá được |
| DW | `010_005` | (tắt từ trước) Thẻ kho đọc ClickHouse, chưa chốt cách đối chiếu |

### Bổ sung 26/09/2026 tối — 04_3 hết vỏ (97/97 script thật, làn 8)

Spec mới: `anh-chung-tu.shop` (010_016) · `the-kho-excel.shop` (010_005) · `nhap-tu-po.tct` (020_007, 050_002 — vai `tct`, điểm bán không có PO) ·
`nhap-hoan-tra.gdv` (050_005/006, project `gdv` mới trong config) · `lich-su-lo.shop` (050_009) · `chuyen-cap.tct` +060_013 và sửa 070_*/060_017/018.
Đã xoá `tests/chua-chay-duoc.shop.spec.js`. Sửa lỗi script `chuyen-cap`: HUB nhận phải gộp lô; trạng thái cuối là `APPROVED`; BE tự FIFO lô (so với lô thực
xuất trên phiếu); danh sách phiếu chuyển trả CŨ TRƯỚC (size 50 ⇒ phiếu mới rơi trang 2 — dùng size 500); nút in ở "Chi tiết" chỉ hiện khi CHƯA nhận.

| Case | Đo được | Quyết định |
|---|---|---|
| 🔴 (phát hiện khi chạy 070_003) | Lô ở HUB đã về **tồn 0** (HUB chuyển tiếp hết xuống điểm bán) ⇒ TCT chuyển lại CÙNG mã lô: tỉnh nhận có gộp ⇒ **SSHOP-500**, không gộp ⇒ "Mã lô … đã tồn tại ở kho nhận". Phiếu **treo IN_TRANSIT vĩnh viễn**, tồn TCT đã trừ. Hôm nay treo 6 phiếu POD_01 id 1073–1075, 1079–1081 (lô `A8CC8002914`, `A8CC4492040`, HUB `STOCK_BATCH_PRODUCTS` remain 0) | lỗi BE — cần sửa nhánh nhận lô tồn 0 |
| `04_3_070_012` 🔴 ĐỎ | Tỉnh → điểm bán **không ghi công nợ nội bộ**: `StockTransferService` chỉ có hook `recordDebtFromSource` khi TCT → Tỉnh | chốt: có ghi DIEM_BAN_TINH không? |
| `04_3_060_017` 🔴 ĐỎ | Phiếu lấy hàng in "PICKING LIST" nhưng **không có mã lô** cần lấy, cột "BIN lấy hàng" trống. (Biên bản bàn giao đạt; tiêu đề in sai chính tả "BIÊN **BÀN** BÀN GIAO") | |
| `04_3_010_016` 🔴 ĐỎ | Phiếu nhập kèm 1 ảnh (upload `/file/v2/.../image/upload`, kho DISK): API chi tiết **trả 1 ảnh**, drawer chi tiết ở Lịch sử **không hiện ảnh** (khối bị comment `DrawerDetailImportReceipt.jsx` ~1076) ⇒ không tải được ảnh chứng từ | khôi phục khối ảnh? |
| `04_3_010_005` | Đạt: thẻ kho SP TC 30 ngày **514** dòng (🔴 API `/report/stock-card` trả tối đa 500 dòng/trang dù xin size lớn — lượt đầu chỉ so 500 dòng, đã sửa phân trang), file `the_kho_*.xlsx` 514 dòng, mã phiếu khớp, Σnhập 961 / Σxuất 814 = ô tổng trên màn | |
| `04_3_020_007` | Đạt (vai tct): dòng kéo đúng SP/SL 3/giá 60.000 từ PO; nhận 2 ⇒ PO "3 3 2". 🔴 Bẫy script: `po.nhapKho` trả về trước `POST /purchase-orders/{id}/receive` — rời trang sớm là PO không cập nhật (13_3 dùng chung helper) | |
| `04_3_050_002` 🔴 ĐỎ | Nhập đủ 3 ⇒ PO "3 3 3" Đã giao; **không có dòng công nợ NCC** (`SUPPLIER_DEBT_HISTORY` kho 68062 chưa từng có dòng). Theo thiết kế 16/07 (đối soát PO) công nợ phiếu từ PO chỉ ghi sau đối soát HĐ + hạch toán — kịch bản kỳ vọng tăng ngay khi duyệt | chốt kỳ vọng |
| `04_3_050_005` / `050_006` | Đạt: POS xuất **FEFO** (hạn dùng rồi id lô); hoàn trả cộng lại đúng lô đã xuất (111 cái = 110 lô `240926240D` + 1 lô `A8R5381121`), giá vốn từng lô giữ nguyên. Phiếu nhập hoàn `RT…` giá trị = SL × 60.000 (giá tiêu chuẩn), không theo giá lô 55.555 | ghi nhận |
| `04_3_050_009` 🔴 ĐỎ | Không có màn/API lịch sử theo lô: FE không có route, `/report/stock-card` không có tham số lô; Thẻ kho cột "STT · Sản phẩm · Loại · Mã phiếu · Thời gian · Nhập · Xuất · Tồn sau · Ghi chú" | cần màn lịch sử lô? |
| `04_3_060_013` | Đạt: SL 2 + 1 serial ⇒ "cần nhập đủ 2 serial (đang có 1)"; 2 serial sang HUB, serial thứ 3 ở lại TCT | |

### Seed đã thêm cho 04_3

- Bước `00_seed/tests/09-kho-phu.shop.spec.js`: kho thứ hai `AUTO8_KHO2` (id 82) cho điểm bán seed. ⚠️ Rốt cuộc **không dùng được**: ô "Kho nhận" cấp điểm bán chỉ liệt kê điểm bán (tự lấy kho mặc định), bộ chọn cấp TCT cũng chỉ chọn điểm bán ⇒ không chọn được kho thứ hai làm kho nhận/chuyển.
- Sổ seed làn 8 thêm `diemBanNhan` = điểm bán rác `AUTO8_SHOP_55976508` (shopId 68153) — dùng làm điểm NHẬN chuyển kho.
- Thêm 2 lô SP giá tiêu chuẩn (50 + 40) ở điểm bán seed để các case chuyển kho có tồn khả dụng.
- Quan sát chưa rõ nguyên nhân: 16:03–16:2x ngày 23/09 toàn bộ lô SP giá tiêu chuẩn có `reservedQuantity = remainQuantity` dù các phiếu chuyển đã bị từ chối; lần đo sau từ chối nhả giữ chỗ ngay (0 giây). Chưa tái hiện được — ghi để theo dõi.

### ⚠️ Sự cố dữ liệu 23/09/2026 (làn 8) — cần user quyết dọn hay để

Chạy lẻ bước seed mới `00_seed/tests/09-kho-phu.shop.spec.js` mà thiếu `--no-deps` ⇒ Playwright chạy lại các bước `tct` 1–7 bằng giao diện và **tạo thêm một bộ dữ liệu hậu tố `_55976508`** (không xoá được bằng giao diện): Bưu điện tỉnh `S55976508` / `AUTO8_TINH_55976508`, xã `S5597650801` / `AUTO8_XA_55976508`, điểm bán `S5597650801A6508` / `AUTO8_SHOP_55976508`, nhân viên `AUTO8NV55976508`, danh mục `ADMC55976508` / `ADM55976508`, 4 SP `AUTO8_SP_{MAC,FIFO,DD,TC}_55976508`, bảng giá bán `AUTO8_BANGGIA_55976508`, nhóm NCC `AUTO8_NHOMNCC_55976508`, NCC `ANCC55976508` (id 137), hợp đồng `AUTO8HD55976508`, bảng giá mua `AUTO8_BGMUA_55976508`.
Sổ `seed-state.lane8.json` đã bị ghi đè rồi **đã dựng lại tay** về bộ `AUTO8_*` gốc (shopId 68152, supplierId 133); bản hỏng lưu ở scratchpad. `.env.lane8` không bị đổi. Đã ghi cảnh báo `--no-deps` vào đầu bước 09.

---

## `04_4_kiem_kho`

> Làn 8, 24/09/2026, vnpost-web `af8cda07`. Vai `shop` (Cửa hàng trưởng) trên `AUTO8_SHOP`; SP `AUTO8_SP_FIFO` (1 lô, tồn 100).
> Lệnh: `VNPOST_LANE=8 VNPOST_SETUP_ROLES=shop,gdv,province rtk proxy npx playwright test --config tai-lieu-test/04_4_kiem_kho/playwright.config.js`

### Đo được về luồng (ghi để tránh hiểu nhầm)

- Kiểm kho ở cấp điểm bán là **phiên TOÀN KHO** (`productTargetType=ALL`): chốt phiên đòi mọi lô còn tồn có số đếm; thiếu ⇒ `UNCOUNTED_LOTS_WARNING` "Còn N lô/serial chưa được kiểm. Nếu tiếp tục chốt, các lô/serial này sẽ được **áp tồn về 0**" (drawer "Quay lại kiểm tiếp" / "Vẫn chốt (áp tồn về 0)"). ⇒ `04_4_030_006` ĐẠT: hệ thống **không** âm thầm coi "chưa đếm" là 0, nhưng chỉ cần bấm "Vẫn chốt" là xoá tồn mọi lô chưa kiểm.
- Ô số lượng ở trang phiếu khoá; đếm theo **lô** (drawer "Kiểm kho theo lô", ô trống = "Chưa đếm"). Dòng chênh lệch **bắt buộc ghi chú** ở bảng tổng hợp khi chốt (`MISSING_DIFF_NOTE`).
- Phiên đang mở **khoá kho** — script luôn huỷ phiên ở `afterAll`.

### Lệch đặc tả / nghi lỗi sản phẩm (case ĐỎ, giữ nguyên assertion)

| Case | Kịch bản nói | Hệ thống làm | Quyết định |
|---|---|---|---|
| `04_4_050_004` | Lọc trạng thái chỉ còn phiếu đúng trạng thái | 🔴 Ô "Trạng thái" (Nháp / Đã áp dụng) **không gửi `status`** lên `GET /stock/v3/inventory-check/sessions` — chọn gì bảng cũng như cũ (38 phiên, lẫn Đang mở / Đã hủy / Đã chốt). Ngoài ra bộ lựa chọn là trạng thái PHIẾU (DRAFT/COMPLETED) trong khi bảng là PHIÊN (OPEN/CLOSED/CANCELLED) | |
| `04_4_020_003` | Khai theo SKU **hoặc TÊN** đều nhận diện | Theo SKU: nhận. Theo TÊN (bỏ trống SKU): bị bỏ qua "**Thiếu SKU**" | |
| `04_4_020_005` | Nguyên văn "Sản phẩm FIFO/LIFO bắt buộc có mã lô" | Dòng bị bỏ qua đúng, nhưng lý do là "**Sản phẩm tính giá theo lô — bắt buộc nhập mã lô**" | |
| `04_4_010_001` | Vai cấp trên chưa chọn điểm bán thì **không hiện** nút mở phiên | Vai `province` thấy nút "Mở phiên kiểm kho" ngay (cấp trên nút này mở đợt kiểm theo phạm vi) | |

### Kỳ vọng chưa chốt — đã đo

| Case | Đo được | Quyết định |
|---|---|---|
| `04_4_030_004` | Gõ `-5` vào ô số đếm lô ⇒ ô tự thành **0** ⇒ dòng thành **đếm 0**, chênh lệch **-100**. Tức nhập âm không bị chặn mà biến thành "xoá hết tồn lô" nếu chốt. Script đang chỉ kiểm "ô không giữ số âm" (đạt) — user chốt có coi đây là lỗi không | |
| `04_4_030_005` | Gõ `abc` ⇒ ô rỗng (= chưa đếm), không thành 0 — ĐẠT theo đúng lưu ý của kịch bản | (chỉ ghi nhận) |
| `04_4_060_002` | Kiểm thừa +3: giá vốn lô trước 60.000, sau 60.000 (dùng giá lô hiện tại) | |

### Chưa chạy được — lý do (`_blocked` trong `test-input.json`)

| Case | Lý do |
|---|---|
| `060_003` | Lô tồn 0 bị ẩn khỏi drawer đếm lô ⇒ không khai giảm cho lô tồn 0 được |
| `060_004`, `060_005` | Không có SP tồn âm ở điểm bán seed |
| `070_001` | Cần kế toán + kỳ kế toán đóng được |
| `070_002`–`070_005` | Cần luồng bán hàng tại quầy (18_1) + đọc chính sách bán âm; `070_004` còn mâu thuẫn bán âm × serial cần user chốt |

---

## `04_5_quan_ly_ton_kho`

> Làn 8, 24/09/2026. Vai `shop` trên `AUTO8_SHOP`; vai `province` trên `AUTO8_TINH`.

### Đo được

| Case | Đo | Quyết định |
|---|---|---|
| `04_5_020_007` | Kho **vừa tạo** có `isActive = null` ⇒ Switch "Trạng thái" hiện **TẮT** dù kho vẫn dùng được; bật/tắt hai chiều hoạt động đúng | có coi `null` là lỗi không? |
| `04_5_020_003` / `020_006` | Đổi kho mặc định: đúng một kho mặc định, kho cũ mất cờ. 🔴 Gửi `PUT /shops/<id>/inventory/<invId>` kèm **cả object kho** thì BE **bỏ qua `isDefault`** — chỉ payload đúng 8 trường như FE mới đổi được (đã làm mất kho mặc định của điểm bán seed một lần, đã khôi phục) | (ghi nhận cho người viết script) |
| `04_5_020_010` | Xoá kho chưa phát sinh giao dịch: được. Nút xoá của kho mặc định khoá. **Chưa đo được** "xoá kho KHÔNG mặc định đang có tồn — tồn đi đâu" vì không đưa được hàng vào kho thứ hai (xem dưới) | |
| `04_5_020_016` | Tỉnh chưa có HUB: màn Quản lý kho hàng hiện "Chưa chọn đơn vị / điểm bán" + nút **"Khởi tạo Hub"**; khởi tạo ra shop `shopType=HUB` trực thuộc đúng tỉnh, có kho tự sinh. Đã tạo `AUTO8_HUB` (shopId 68154, kho 92) — ghi sổ seed `hubTinh`, **không xoá được** | |

### Chưa chạy được — lý do

| Case | Lý do |
|---|---|
| `020_008`, `020_011`–`020_015` | Ở cấp điểm bán **không form nghiệp vụ nào có ô chọn kho** (nhập/xuất/kiểm tự lấy kho mặc định; "Kho nhận" chuyển kho chỉ liệt kê điểm bán). Kho vật lý thứ hai (`AUTO8_KHO2`) tạo được nhưng không đưa hàng vào/ra được — cần user xác nhận đây là thiết kế hay thiếu tính năng |
| `030_006`, `030_008`–`030_011`, `030_015`, `030_018` | Thẻ "Thẻ kho" ở vai `shop` mở ra rỗng hoàn toàn (xem `030_002` đang đỏ) |
| `050_001`–`050_004` | (từ trước) case đăng nhập/phân quyền trùng phân hệ 31 — chờ user chốt giữ ở đâu |

---

## `07_1_cau_hinh_chung`

> 24/09/2026, vai `tct` làn 8. 🔴 Cấu hình là của **cả chuỗi 626** (mọi làn, mọi người dùng dev) ⇒ không ghi; request lưu bị chặn ở mạng, "lưu được" = FE đã gửi request.

| Case | Đo được | Quyết định |
|---|---|---|
| `07_1_010_005` / `010_007` | Gõ `4` / `-4` vào Đơn vị làm tròn: ô **tự kẹp về 3 / -3 không báo gì**, bấm lưu là **gửi luôn `configValue: "3"`** — người dùng tưởng bị chặn nhưng thực ra lưu một giá trị khác mình gõ. `1.5` xử lý theo InputNumber (xem ghi chú chạy) | có cần thông báo thay vì kẹp im lặng? |
| `07_1_020_003` | Gõ `5` (khoảng 0..3) ⇒ kẹp về 3 và gửi đi, như trên | |
| `07_1_030_004` | Ô "Chọn loại tiền tệ" **không có nút xoá** ⇒ không tái hiện được "chưa chọn" (skip). Cần chốt: bỏ rule bắt buộc hay mở `allowClear` | |
| `07_1_060_001` | "Làm tròn tiền phần kho" có cùng bộ ô với "Làm tròn tiền" (Đơn vị làm tròn -3..3, Phương thức, Xem trước); giá trị đang lưu khác (phần kho: Luôn làm tròn xuống, 12,345.678 → 12,345; tiền: Luôn làm tròn lên → 12,400). **Áp cho con số nào** không đọc được từ form — cần `060_002` (ghi cấu hình chuỗi) | |
| `07_1_010_006` (spec cũ, đỏ) | Giá trị đang lưu của chuỗi là "Luôn làm tròn lên", kịch bản đòi mặc định "Làm tròn thông thường" | có người đã đổi cấu hình chuỗi — chốt giá trị chuẩn |

Chưa chạy (ghi cấu hình chuỗi): `010_002`, `020_001`, `030_003`, `030_006`, `040_002`, `050_001`, `050_005`, `060_002`.

---

## `07_2_cau_hinh_kho`

> 24/09/2026, vai `tct` làn 8 (phiên phụ `shop`, `seed_gdv` cho nghiệp vụ). Khoá kho chỉ trên SP `AUTO8_SP_TC` + điểm bán seed.

### Lệch đặc tả / nghi lỗi sản phẩm (case ĐỎ)

| Case | Kịch bản nói | Hệ thống làm | Quyết định |
|---|---|---|---|
| `07_2_010_006` / `010_013` | Chọn "Áp dụng cho: Điểm bán" + tích 1 điểm bán ⇒ khoá đúng điểm bán đó | 🔴 Xã chỉ có 1 điểm bán ⇒ FE **tự tích luôn xã cha** ("Đã chọn 2 đơn vị") và gửi `{scopeType: "DIEM_BAN", scopes: [{scopeType: "BUU_DIEN_XA", orgUnitCode: "AUTO8_T_01"}]}` ⇒ cấu hình lưu phạm vi **cả Bưu điện xã**, bảng và chi tiết đều ghi "Bưu điện xã" | |
| `07_2_030_001` | Bỏ trống Tên cấu hình bán tồn âm ⇒ "Vui lòng nhập tên cấu hình", không lưu | FE **không chặn** — vẫn gửi request lưu (bị test chặn ở mạng) | |
| `07_2_010_007` | Có bộ lọc phạm vi áp dụng | Màn "Danh sách cấu hình khoá kho" **không có ô lọc nào** | |

### Đo được (đạt, ghi để biết cách chặn)

| Case | Đo |
|---|---|
| `07_2_060_004` Chuyển kho | Chặn NGAY khi chọn SP: "Không thể thực hiện thao tác. Sản phẩm đang bị khoá kho: AUTO8_SP_TC" |
| `07_2_060_002` Xuất kho | FE **không** chặn ở bước chọn SP (không gọi freeze-check); BE chặn khi lưu: `POD-0050` "Không thể xuất kho. Sản phẩm đang bị khoá kho: AUTO8_SP_TC - Mặc định" |
| `07_2_060_003` Nhập kho | FE gọi `freeze-check` nhưng vai Giao dịch viên nhận **401 "Không có quyền truy cập"** rồi vẫn cho thêm dòng (bỏ qua kiểm tra); BE chặn khi lưu: `POD-0050` "Không thể nhập kho…". 🔴 Thiếu quyền `freeze-check` cho vai GDV |
| `07_2_040_005` | Số ngày cảnh báo từng SKU mặc định = số ngày chung (30), sửa riêng từng dòng được |

---

## `07_3_don_hang_va_thanh_toan`

| Case | Đo được | Quyết định |
|---|---|---|
| `07_3_020_004` 🔴 ĐỎ | Vai `shop` (Cửa hàng trưởng) tải logo 1 MB hợp lệ ⇒ `POST /api/v1/admin/configs/printer-logo/upload-file` trả **401 "Không có quyền truy cập"** và màn **không hiện thông báo nào** (lỗi im lặng). Màn In hoá đơn được khai cho cấp điểm bán nhưng vai điểm bán không có quyền tải logo | cấp quyền hay ẩn nút? |
| `07_3_020_003` | Chặn đúng: GIF ⇒ "Logo cửa hàng chỉ hỗ trợ JPG, PNG hoặc WEBP"; PNG 6 MB ⇒ "Logo cửa hàng không được vượt quá 5 MB" (ngưỡng code thật là **5.1 MB**), không gửi request | |
| `07_3_010_003` | Gõ `-5` vào Giới hạn thời gian trả hàng ⇒ ô kẹp về **0**, nút Lưu khoá, không gửi request. Giá trị đang lưu của chuỗi là **1 ngày** (kịch bản 010_002 nói mặc định 7) | |

Chưa chạy: `010_002`, `010_004`, `010_005` (bật/tắt/lưu cấu hình chuỗi), `030_001`, `030_002` (tài khoản thanh toán — thiếu dữ liệu / không dựng được trạng thái rỗng), `040_002`–`040_004` (tắt phương thức thanh toán của cả mạng lưới).

---

## `07_4_van_hanh`

| Case | Đo được | Quyết định |
|---|---|---|
| `07_4_010_002` 🔴 ĐỎ | Form thật của nhóm 010 là **"Cấu hình nhận đặt hàng trước"** (`bookingReservation`, tài liệu gọi nhầm là hạn mức duyệt). Bỏ trống Tên cấu hình rồi bấm "Lưu cấu hình": FE **vẫn gửi request lưu** (bị test chặn), không hiện "Vui lòng nhập tên cấu hình" — dù code có khai rule. Cùng kiểu lỗi với `07_2_030_001` | |
| `07_4_010_004` | Mô tả chặn đúng 200 ký tự, bộ đếm "200 / 200" | |
| Màn Hạn mức duyệt (`approvalLimit`) | Vai `tct` **không có nút thêm** cấu hình (chỉ 4 nút biểu tượng) ⇒ nhóm `050_*` tạo hạn mức không làm được bằng vai này | cần vai nào? |

Chưa chạy: `010_003`, `020_002`–`020_004`, `040_002`, `040_003` (IMAP thật), `050_001`–`050_017` (luồng duyệt của cả mạng lưới + cần tài khoản từng vai duyệt).

### Bổ sung 26/09/2026 tối — 07_4 hết vỏ (32/32 script thật, làn 8)

🔴 **Tiền đề mất:** `VNPOST_CORE.APPROVAL_LIMIT` = **0 dòng** (Update_time 24/09 09:39, auto_increment 2 ⇒ bản gốc id 1 "Duyệt phiếu đề xuất đặt hàng" đã bị xoá — không phải do phiên này). Đã dựng lại bằng
`tests/tien-de-han-muc.tct.spec.js` (`STOCK_REQUESTS_APPROVE`, TẮT; [0, 50tr) Giám đốc xã · [50tr, 999.999.999.999) xã → Quản lý tỉnh). Chạy lại khi mất:
`VNPOST_LANE=8 VNPOST_TIEN_DE=1 npx playwright test --config tai-lieu-test/07_4_van_hanh/playwright.config.js --project=tct -g "tien de 07_4"`.
Script: `han-muc-ghi` tự điền `roleCode` theo cấp (BE bắt buộc — lượt 17:2x đỏ 8 case vì thiếu) · `dat-truoc-validate` +010_003 · mới `hom-mail-ghi` (040_002/003, hòm tạm host `.invalid`).

| Case | Đo được | Quyết định |
|---|---|---|
| `07_4_050_002` 🔴 ĐỎ | Không có nút "Thêm mới" cấu hình hạn mức trên bảng (bị comment) ⇒ chỉ tạo được bằng API | khôi phục nút? |
| `07_4_050_008` 🔴 ĐỎ | Min ≥ Max bị BE chặn (SSHOP-402) nhưng thông báo là chuỗi kỹ thuật **"min_amount phải < max_amount"**, không phải "Min phải nhỏ hơn Max"; FE không validate trước | |
| `07_4_050_009` 🔴 ĐỎ | BE **cho lưu** hai khoảng giao thoa 1–5tr / 3–7tr (200). Truy vấn pod `findActiveFlowForAmount` lấy khoảng có `min_amount` lớn nhất ⇒ phiếu 4tr âm thầm đi luồng 3–7tr | |
| `07_4_050_010` | Không có khe với tiền đề mới. Form **không có lựa chọn "không giới hạn"** cho Max ⇒ phiếu ≥ Max cuối không thuộc khoảng nào (tiền đề dùng 999.999.999.999) | chốt cách khai trần |
| `07_4_050_011`–`015` | Đạt: 54tr ⇒ "Đã duyệt 0/2"; Quản lý tỉnh không thấy phiếu khi xã chưa duyệt, thấy "Bước 2/2" sau khi xã duyệt; từ chối ở bước 1 không sang bước 2; vai shop gọi reject ⇒ 401 | |
| `07_4_010_003` | Đạt: bỏ hết 9 phạm vi ⇒ "Vui lòng chọn ít nhất một phạm vi áp dụng", không gửi request | |
| `07_4_040_002` | Đạt: "imap.auto-test.invalid:993 (imaps)". 🔴 Hòm chưa có "Đọc từ"/"Poll gần nhất" hiện **"Invalid Date"** thay vì "—" | lỗi FE nhỏ |
| `07_4_040_003` | Kiểm tra host không tồn tại ⇒ báo nguyên văn lỗi Java tiếng Anh "Couldn't connect to host, port: …; timeout 15000" (rõ nguyên nhân nhưng không Việt hoá) | chấp nhận? |


---

## `08_quan_ly_san_pham` (xong 99/99 — 26/09/2026)

> 24/09/2026 làn 8. Danh mục tạm tiền tố `AUTO8_DMT_…` được xoá ngay trong case; case "xoá danh mục có sản phẩm" dùng bộ danh mục RÁC `…_55976508`.

### Lệch đặc tả / nghi lỗi (case ĐỎ)

| Case | Kịch bản nói | Hệ thống làm | Quyết định |
|---|---|---|---|
| `08_020_003` | Form rỗng báo đỏ cả SKU và VAT | Có thông báo chung "Vui lòng điền đầy đủ các thông tin được yêu cầu"; báo đỏ Tên SP · Danh mục · Mã barcode · Mã kế toán · Đơn vị — **SKU và VAT không báo đỏ** | |
| `08_020_004` | Chọn Ký gửi thì hiện "Loại hàng ký gửi" | Ô này đã bị **comment-out** trong `AddProductDrawer.jsx`; chọn Ký gửi chỉ ép "Phương pháp tính giá vốn" = Thực tế đích danh | bỏ case hay khôi phục ô? |
| `08_060_008` | Trùng tên: `Tên danh mục "<tên>" đã tồn tại`; tên toàn khoảng trắng phải bị chặn | Trùng tên: "Tên danh mục 'AUTO8_DANHMUC' đã tồn tại **trong cùng cấp cha**" (nháy đơn, chỉ chặn trùng trong cùng cha). 🔴 Tên **toàn khoảng trắng vẫn được gửi đi tạo** (FE không trim) — test chặn ở mạng nên chưa đẻ danh mục rác | |

### Đo được (đạt)

| Case | Đo |
|---|---|
| `08_060_013` | Xoá danh mục lá có SP bị chặn: "Danh mục đang được sử dụng bởi 4 sản phẩm. Vui lòng cập nhật sản phẩm trước khi xóa!" |
| `08_060_014` | Xoá danh mục CHA có cây con rỗng ⇒ **xoá luôn cả cây con** (không hỏi riêng về con) — ghi để user chốt đây có phải hành vi mong muốn |
| `08_060_015` | Xoá cha khi con có SP bị chặn: "Danh mục cấp dưới 'AUTO8_DANHMUC_55976508' đang có 4 sản phẩm đang sử dụng…" |
| `08_060_011` | Không chọn được chính danh mục làm cha của nó (cây khoá node) |
| `08_080_001/002` | "In tem nhãn" có `hidden: isAdmin` — vai Admin (tct) **không thấy**; chạy bằng vai `shop` thì đạt |
| `08_070_002` | Chưa chọn file: nút "Xác nhận nhập" khoá; mô tả "Hỗ trợ .xls, .xlsx" |


### Spec cũ `san-pham.tct.spec.js` đỏ ở lượt 24/09 (không thuộc phạm vi vỏ — cần soát lại)

| Case | Lỗi đo được | Nhận định |
|---|---|---|
| `08_010_002` | Cột thực tế: # · SKU · Tên sản phẩm · Hình thức phân phối · Đơn vị · Giá bán · Danh mục · Thương hiệu · Phương pháp giá vốn · Trạng thái · Hành động | màn đã đổi cột so với kịch bản |
| `08_040_003` | assert dòng chứa `"1"`, dòng 1 là `AUTO8SKUDD55976508` | nghi **lỗi script** (từ khoá tìm lấy cứng) — dữ liệu seed làn 8 làm lệch |
| `08_040_005` | dòng 1 không mang trạng thái đã lọc | cần probe: bộ lọc trạng thái có gửi lên API không |
| `08_030_002` | chi tiết SP thiếu nhóm "kho"; màn vẫn ở danh sách | nghi click mở chi tiết không ăn (script) |

Tổng 08 lượt 24/09: Đạt 26 · Không đạt 7 · Chưa chạy 66.

🔴 **Rác đã dọn:** case `08_060_008` (bản cũ) để trống "Danh mục cha" khi thử trùng tên ⇒ tên seed nằm dưới cha seed
KHÔNG bị coi là trùng ⇒ tạo được danh mục GỐC `AUTO8DMTX572701 - AUTO8_DANHMUC` (lọt vào ô chọn danh mục của
form sản phẩm, làm hỏng bước seed). Đã xoá qua UI 24/09, script sửa lại: chọn đúng cha seed, lỡ tạo thì tự xoá rồi báo đỏ.

---

### Bổ sung 26/09/2026 — gỡ hết vỏ 08 (99/99 script thật)

Spec mới: `sp-form-ghi` (020_005–020) · `sp-sua-xoa` (030) · `combo-ghi` (090, 030_020–022) · `ngung-kich-hoat` (050, 040_006/007) ·
`danh-muc-ghi` (+060_007/009/016/021–025). Helper `tests/sp-ghi.js` (form SP, SP tạm API, nhập kho `seed_gdv`, bảng giá/combo tạm,
bất biến `CHAIN_PRODUCT_UNIT`). SP/combo tạm `AUTO<làn>_SPT_*` đều xoá ở finally. Tiền đề tự dựng trong spec: danh mục combo type 10
`AUTO<làn>_DM_COMBO_CHA › AUTO<làn>_DM_COMBO`.

| Case | Đo được | Nhận định |
|---|---|---|
| `08_020_005` | Có biến thể ⇒ SKU/Barcode cơ bản **disabled** ("Quản lý theo biến thể bên dưới"); xoá hết biến thể ⇒ ô mở lại nhưng **giá trị đã nhập bị xoá trắng** | 🔴 lỗi (kỳ vọng giữ giá trị) |
| `08_020_008/009` | Thêm biến thể ⇒ SKU/Barcode dòng quy đổi bị khoá và **xoá trắng**; xoá biến thể ⇒ không trả lại. DB sau lưu vẫn đúng bất biến (biến thể không có parent_id=0, 1 dòng convert=1) | 🔴 mất dữ liệu nhập |
| `08_020_016` / `08_090_003` | Không chọn được danh mục CHA: form SP khoá danh mục cấp 1 (`preventRootSelection`), form combo chỉ nhận **danh mục cấp cuối** ("Vui lòng chỉ chọn danh mục cấp cuối cùng") | chốt: kịch bản nói "cho phép chọn cha" |
| `08_020_017` | Hai thuộc tính TRÙNG tên ("Mau") vẫn lưu | ghi hành vi — chốt có chặn không |
| `08_020_011` / `08_090_009` | Ô vật lý: chữ bị bỏ, số âm kẹp về 0, nhận 0 và 1.25 | đạt |
| `08_020_010` / `08_090_008` | SKU trùng (kể cả khác hoa/thường) bị chặn "Mã SKU … đã được đăng ký cho sản phẩm khác" — cả combo trùng SKU SP thường | đạt |
| `08_020_019` / `08_090_013` | SP: "Ảnh chỉ hỗ trợ định dạng JPG, PNG hoặc WEBP!" · "Có ảnh vượt quá 5 MB sau khi nén…" · "Mỗi lần chỉ tải lên tối đa 10 ảnh…". Combo: giới hạn **800Kb** ("Ảnh up không được vượt quá giới hạn 800Kb!") và file PDF 900KB báo CẢ HAI lỗi | lệch giới hạn SP (5MB) vs combo (800KB) |
| `08_030_005` | Form "Cập nhật sản phẩm" **khoá ô SKU** ⇒ không sửa SKU được | đạt (theo cách khoá) |
| `08_030_009` / `030_012` / `030_014` | Chặn: "Không thể xóa biến thể/đơn vị tính … vì đã phát sinh giao dịch trong hệ thống." (dong45/dong48 chưa có kỳ vọng — hệ thống CHẶN) | user chốt kỳ vọng dong45/dong48 = chặn? |
| `08_030_015` | SP trong đơn nháp bị chặn xoá nhưng thông báo là "…đã phát sinh giao dịch…" — **không nêu đơn nháp** | lệch câu chữ |
| `08_030_016` | Xoá đơn nháp (`DELETE /orders/shops/{shop}/{order}`) + gỡ bảng giá tạm ⇒ SP xoá được. 🔴 SP còn trong bảng giá thì LUÔN bị chặn xoá — "sau khi xoá đơn nháp thì xoá được" chỉ đúng khi SP không nằm trong bảng giá nào | chốt tiền đề |
| `08_030_017` | Chặn nhưng thông báo lộ tên bảng nội bộ: "không thể xóa đơn vị tính: 'Cái' vì đang được sử dụng trong **PRODUCT_PROMOTION_ITEM**" | 🔴 câu chữ lộ kỹ thuật |
| `08_030_018/019` | Chặn: "…đang được gán trong combo sản phẩm." / "…đang được sử dụng trong bảng giá" | đạt |
| `08_050_001/003/004` | Ngừng bán ở điểm bán khác ⇒ điểm bán seed vẫn bán; ngừng ở seed ⇒ POS không thêm được; đổi phạm vi ⇒ phạm vi cũ bán lại; "Kích hoạt lại" = `DELETE …/sale-scopes` (cấu hình giữ bản ghi `active=false`). Danh sách hiện trạng thái "Khóa một phần" | đạt · 🔴 API: gửi `parentOrgUnitCode` = mã xã ⇒ SSHOP-402 "Truyền sai tham số" |
| `08_060_016` | **Xoá được danh mục đang dùng trong CTKM** (200 "Xoá thành công") | 🔴 lỗi — CTKM còn tham chiếu danh mục đã xoá |
| `08_060_021/022/023` | Nhập Excel danh mục: MỌI file (kể cả **chính file mẫu** `DanhMucSanPham_Import_Mau.xlsx`) ⇒ job FAILED, `totalRecords 0`, "Đã có lỗi xảy ra, vui lòng thử lại." | ⛔ import-service (dev) hỏng — cần xem log `vnpost-import-service`, chạy lại sau |
| `08_060_024` | File mẫu dòng 5 có "Mã danh mục cha" = **1** (số) cho danh mục cấp 1 | 🔴 dữ liệu mẫu sai |
| `08_060_025` | File xuất 336 dòng = 336 danh mục; tiêu đề **bỏ dấu "*"** so với file mẫu | ghi — importer có nhận lại không chờ 060_021 chạy được |
| `08_060_009` | Form sửa danh mục: Loại danh mục + Mã danh mục KHOÁ; Tên / cha / giá vốn / ghi chú sửa được (dong27, dong30–34 trống nội dung — user đối chiếu) | chốt |

---

## `09_san_pham_san_xuat` (xong vỏ 24/09/2026 — lượt cuối: Đạt 13 · Không đạt 5 · Chưa chạy 5)

> Làn 8. Dữ liệu nền mới: `00_seed` bước 10 (`10-san-pham-san-xuat.tct.spec.js`) — tick "Là nguyên liệu sản xuất"
> cho `AUTO8_SP_TC`, tạo `AUTO8_SP_SX_55976508` (công thức 1 × `AUTO8_SP_TC`) và `AUTO8_SP_SXS_55976508` (đích danh + serial).

### 🔴 Phân quyền — không vai nào tự làm trọn luồng ở điểm bán POS

| Vai | Danh sách `/production` | Nút Tạo / Xác nhận (FE) | POST `/production` (BE) |
|---|---|---|---|
| Cửa hàng trưởng (`shop`) | 200 | **ẩn** (thiếu `create_import_stock`) | **200** nếu gọi thẳng API |
| GDV điểm bán (`seed_gdv`) | **401** | có | **401** "Không có quyền truy cập" |
| GDV Lý Sơn (`gdv`) | 401 | có | — |
| Vai tỉnh (`province`) | 200 (sau khi chọn điểm bán) | có | 200 |

- Bốn quyền `PRODUCTION_GET/GET_2/CREATE/CONFIRM_CREATE` (TBL_PERMISSION 11125–11128) **không gắn vào function nào**
  (TBL_FUNCTION_PERMISSION rỗng) ⇒ vai nào đi qua kiểm quyền theo function là 401.
- Vai tỉnh **không lập được phiếu cho điểm bán POS qua UI**: ô "Điểm bán / kho sản xuất" chỉ trả KHO ở chế độ HUB, chọn
  POS thì `inventoryId` rỗng ⇒ không hiện ô chọn thành phẩm.
- ⇒ Case form chạy bằng GDV (chặn POST ở mạng); case xác nhận chạy bằng vai tỉnh, phiếu Nháp tiền đề lập qua API với
  đúng payload FE. Kịch bản ghi "Vai: shop" — cần chốt vai đúng của nghiệp vụ sản xuất.

### Lệch đặc tả / nghi lỗi (case ĐỎ)

| Case | Kịch bản nói | Hệ thống làm | Quyết định |
|---|---|---|---|
| `09_010_002` | SP chế biến chưa có công thức ⇒ KHÔNG lưu được | Thẻ hiện "Chưa có công thức nguyên liệu" nhưng **nút Lưu vẫn gửi POST** (phiếu không có nguyên liệu tiêu hao). Dùng SP cũ `Combo 2309` (FE không cho tạo SP sản xuất thiếu công thức) | |
| `09_010_003` | Lập phiếu Nháp thành công | GDV: BE 401 "Không có quyền truy cập" (xem bảng trên) | chốt phân quyền |
| `09_030_001` | Phiếu Nháp có nút Xác nhận | Vai `shop` (CHT) không có nút ở bất kỳ phiếu nào — thiếu quyền. (Script cũ đọc nhầm cột "Tổng giá vốn" làm trạng thái — đã sửa) | chốt phân quyền |
| `09_PQ_001` | GDV không tạo được phiếu | GDV Lý Sơn **vẫn thấy nút "Tạo phiếu sản xuất"** (BE mới chặn 401) | |
| `09_040_003` | Chi tiết có phần "thành phẩm" | Drawer không có nhãn "Thành phẩm" — hiện tên SP + "Số lượng / Giá vốn/ĐV / Mã lô"; có nhãn "Nguyên liệu", "giá vốn" | sửa kịch bản hay thêm nhãn? |

### Đo được (đạt)

| Case | Đo |
|---|---|
| `09_010_005` | Âm → kẹp về 0; SL 0 → "Vui lòng chọn sản phẩm sản xuất"; **thập phân 1.5 được nhận** (code không khai `precision`, ĐVT "Cái"); SL 100000 → nguyên liệu "Thiếu", **Lưu bị khoá ngay ở form** (sớm hơn kịch bản — bước xác nhận) |
| `09_010_006` | "Cần" = định mức × SL (1, 3, 7); "Tồn" = Σ tồn lô thật |
| `09_010_007` | **Khoá theo công thức**: dòng nguyên liệu không có ô sửa lượng; payload gửi đúng định mức × SL |
| `09_020_002` | Thành phẩm xanh (FE tự sinh mã lô); nguyên liệu xanh khi tự phân bổ đủ, **cam** khi lô chốt tay thiếu so với "Cần". Trạng thái **đỏ không dựng được qua UI** (FE luôn tự sinh/tự phân bổ) |
| `09_020_003` | Bỏ trống serial: "Thành phẩm "…" cần nhập đủ 2 serial"; nhập thiếu 1/2 và thừa 3/2 → nút Xác nhận khoá |
| `09_030_002/003` | Popconfirm đúng nguyên văn + 2 nút; Hủy không gửi request, giữ Nháp |
| `09_030_004` | "Xác nhận sản xuất thành công"; Hoàn thành, mất nút; tồn NL −1, thành phẩm +1 |
| `09_030_005` | Giá vốn TP = Σ chi phí NL / SL (60.000); drawer khớp API |
| `09_040_006` | Sinh 1 phiếu xuất `EXPORT/PRODUCTION` (`…-NL`, COMPLETED) + 1 phiếu nhập `IMPORT/PRODUCTION` (`…-TP`, **CHECKOUT**); pre/post quantity đúng; giá phiếu nhập = giá vốn TP (**không bóc VAT**) |
| `09_030_006` | Phiếu Nháp cần vượt tồn → xác nhận bị BE chặn, phiếu giữ Nháp |

### 🔴 Phát hiện phụ

- **BE không kiểm tồn khi lập Nháp**: HUB `AUTO8_HUB` tồn 0 vẫn tạo được phiếu (id 1); 030_006 dựa vào điểm này.
- Công thức gõ định mức **2** ở form sản phẩm nhưng `CHAIN_PRODUCTS_INGREDIENTS.quantity` lưu **1.0000** — chưa xác minh
  do script (ô InputNumber) hay FE; sổ seed ghi số THẬT (1).
- Phiếu nhập thành phẩm ở trạng thái `CHECKOUT` trong khi phiếu xuất nguyên liệu `COMPLETED` — cần chốt có đúng không.
- Rác để lại (không có chức năng xoá phiếu Nháp): SX1790197597492 (HUB, probe quyền), SX1790197603769 (CHT qua API),
  và các phiếu Nháp của 030_006 (SL ≈ tồn+1 — 🔴 **đừng ai xác nhận tay** khi tồn tăng lên, sẽ rút sạch `AUTO8_SP_TC`).
- Chưa chạy (spec cũ, không phải vỏ): `09_010_004`, `09_020_001`, `09_040_004` skip vì chạy bằng CHT (không có nút tạo) —
  chuyển sang `seed_gdv` là chạy được; `09_040_002`, `09_040_005` skip theo điều kiện dữ liệu.

---

## `10_bang_gia_ban_san_pham` (xong vỏ 24/09/2026 — lượt cuối: Đạt 44 · Không đạt 32 · Chưa chạy 11; 4 case đỏ vì chồng phiên đã chạy lại xanh)

> Làn 8. Bảng giá tạm `AUTO8_BGT_*` áp cho điểm bán RÁC `AUTO8_SHOP_55976508` (tỉnh rác riêng) — phê duyệt
> không đổi giá điểm bán seed. Nhóm POS `10_130` dùng `AUTO8_BGP_*` cho riêng SP sản xuất (không thuộc
> `AUTO8_BANGGIA`), xoá hết ở case cuối. Dữ liệu nền mới: `00_seed` bước 10 đặt VAT 8% cho SP sản xuất,
> bước 11 tạo ca `AUTO8_CA_DAI` 05:00–23:45 + lịch 90 ngày cho GDV/CHT (🔴 gỡ luôn chốt chặn "Yêu cầu mở ca"
> của cả `18_1`). Ca của GDV đang để MỞ.

### 🔴 Ô / luồng kịch bản nhắc tới đã bị GỠ khỏi FE (case ĐỎ — chờ chốt bỏ case hay khôi phục)

| Nhóm | Case | Đo được |
|---|---|---|
| Hình thức Mua bán / Ký gửi của bảng giá | `10_030_006`, `10_080_003`, `10_090_003`, `10_090_006`, `10_100_006`, `10_110_001…007` | `TabProducts.jsx` comment-out, `distributionMethod` cố định `MUA_BAN`; không còn lựa chọn "Ký gửi" ở form tạo lẫn form sửa |
| Giá niêm yết / Tỷ lệ chiết khấu | `10_100_001…004` | `ProductPriceTable.jsx` comment-out — bảng sản phẩm chỉ còn cột "Đơn giá" |
| Nhập Excel | `10_090_009` | Không còn popup "Cảnh báo hình thức phân phối"; "Tạo từ Excel" TẠO THẲNG bảng giá (không đổ vào "Sản phẩm thêm mới") |

### Lệch đặc tả / nghi lỗi

| Case | Kịch bản nói | Hệ thống làm | Quyết định |
|---|---|---|---|
| `10_020_001` | Chặn tạo bảng giá trùng tên | 🔴 **Tạo được** bảng giá thứ hai cùng tên, báo "Thêm bảng giá thành công" | |
| `10_070_001` | Chọn 1 điểm bán ⇒ áp đúng điểm bán đó, không nở | 🔴 Tick điểm bán DUY NHẤT của xã ⇒ phạm vi lưu thành **cấp XÃ** (`BUU_DIEN_XA`) — mọi điểm bán mở sau trong xã cũng nhận giá | |
| `10_060_004` | Không xoá được bảng giá đang Kích hoạt + Đã duyệt | 🔴 **Xoá được** (nút xoá không khoá, BE nhận) | |
| `10_080_008` | Đổi VAT sang "chưa gồm" khi có combo ⇒ popup "Thay đổi phương thức tính thuế VAT" | 🔴 **Không có popup**; combo **biến mất lặng lẽ** khỏi bảng | |
| `10_030_003` | Sửa tên rồi lưu | 🔴 Gõ ngay khi màn Sửa hiện tên ⇒ ~2 giây sau form NẠP LẠI, **đè về tên cũ**, lưu ra tên cũ mà vẫn "Cập nhật thành công". Gõ lại sau khi yên thì lưu đúng (case xanh ở lần gõ lại) | |
| `10_130_003/004/007` | SP không có bảng giá hiệu lực (không có / chưa tới ngày / chỉ ở điểm bán khác) ⇒ KHÔNG thêm được vào bill, báo "Sản phẩm: … chưa nằm trong bảng giá nào có hiệu lực tại điểm bán" | 🔴 **Thêm được vào bill**, dòng hiện "Chưa có bảng giá", giá **0 đ**, không thông báo | |
| `10_090_009/010` | Nhập Excel | 🔴 TCT bấm "Tạo từ Excel" ⇒ **401 "Không có quyền truy cập"** | phân quyền |
| `10_040_003/004` | CHT xem lịch sử bảng giá | 🔴 Vai CHT **và** vai tỉnh: `get-all` trả **0 bảng giá** — không thấy cả `AUTO8_BANGGIA` đang áp cho chính điểm bán | |
| `10_020_002` (spec cũ) | Màn Thêm có 3 thẻ | Có **4** thẻ: Thông tin chung · Phạm vi khu vực · Phạm vi khách hàng · Sản phẩm | sửa kịch bản |
| `10_080_008` (phụ) | — | Tiêu đề popup kịch bản viết "Thay đổi Phương thức…" — FE "Thay đổi phương thức…" (khác hoa/thường) | |

### Đo được (đạt)

| Case | Đo |
|---|---|
| `10_020_004` | Toast "Vui lòng nhập đầy đủ thông tin chung bắt buộc", quay về thẻ Thông tin chung |
| `10_020_005` | Cả hai ô ngày: "Ngày bắt đầu không thể sau ngày kết thúc" |
| `10_070_005` / `10_090_011` | "Vui lòng chọn khu vực áp dụng" (về thẻ Phạm vi) / "Vui lòng chọn sản phẩm" |
| `10_090_002/005/007/008` | "Đã thêm 1 sản phẩm mới." · combo theo SKU · "Tất cả sản phẩm vừa chọn đã tồn tại trên bảng." · "Không tìm thấy sản phẩm nào" (vế danh mục rỗng chưa dựng) |
| `10_100_005` | Đơn giá âm tự về 0, không cảnh báo |
| `10_020_003/007/008`, `10_050_*`, `10_030_001/004/005`, `10_120_*`, `10_060_001/002/003`, `10_070_003/004` | Tạo → Chờ phê duyệt; Ngừng kích hoạt; chưa gồm VAT; popconfirm "Xác nhận phê duyệt bảng giá?"/"Xác nhận xóa bảng giá?"; sửa bảng đã duyệt → về Chờ phê duyệt; SP thêm khi sửa vào bảng "Sản phẩm thêm mới"; xoá mềm vẫn tra được audit-log; phạm vi xã/tỉnh lưu đúng cấp (`scopes[0].unitType`) |
| `10_030_002` | Vai tỉnh không thấy bảng giá TCT; mở thẳng URL sửa ⇒ BE `detail` trả 403 |
| `10_130_001` | Bảng "chưa gồm VAT" 50.000 ⇒ quầy 54.000 (×1,08); ô VAT tính trên số phải thu SAU CTKM đơn "giảm 5k đơn" (tự áp ở điểm bán seed): 3.630 |
| `10_130_002` | Bảng "đã gồm VAT" 70.200 ⇒ quầy 70.200, trước VAT 65.000 |
| `10_130_005` | Hai bảng hiệu lực (bắt đầu hôm qua 61.000 / hôm nay 70.200) ⇒ lấy bảng **bắt đầu muộn nhất** (70.200) |
| `10_130_008` | Combo lấy đúng giá bảng giá (99.000), không phải tổng thành phần |

### Chưa chạy

- `10_130_006` — `_blocked`: "Giờ bắt đầu/kết thúc" là KHUNG GIỜ trong ngày, không phải thời điểm bắt đầu ⇒ cần chốt nghĩa "giờ bắt đầu muộn nhất thắng".

### Phát hiện phụ (seed)

- Ô "VAT (bán hàng)" ở form sản phẩm gắn vào field `deductibleTaxPercent`; payload vẫn kèm `vatPercent: 0` nhưng DB lưu `vat_percent` = giá trị chọn.
- Mục VAT đầu tiên là **0%** ⇒ mọi SP seed tạo bằng "chọn mục đầu" đều VAT 0 — case VAT ở phân hệ khác cần biết.

---

## `11_khuyen_mai` (xong 81/81 — 26/09/2026)

> 49 case `tenCTKM` giữ skip (user chốt 22/09: không seed CTKM chạy thật).

| Case | Đo |
|---|---|
| `11_030_004/005`, `11_040_001…003` | Đủ ô thời gian (ngày/khung giờ + 2 checkbox "Không cài đặt…"); Theo đơn hàng: "Theo % hoá đơn / Theo số tiền / Áp dụng quà tặng"; Theo SP: Mua từ + SL + Sản phẩm áp dụng; chỉ Giảm giá bán có ô giảm/SP |
| `11_030_006` | Lưu NHÁP chạy validate ĐẦY ĐỦ như Lưu (điều kiện, đối tượng, giá trị > 0, ngân sách, phạm vi) — nháp `AUTO8_KM_NHAP_*` (phạm vi tỉnh rác, bắt đầu +30 ngày) |
| `11_050_002` | Sửa nháp: "Cập nhật chiến dịch thành công", tên mới hiện ở danh sách |
| `11_060_001` | Bấm Dừng ⇒ hộp "Thông báo — Chương trình này chưa đến thời gian kết thúc…" nút Đóng/Xác nhận; Đóng không gửi request |
| `11_070_007…009`, `11_080_006…008` | Thêm/sửa/xoá nhóm đối tượng ("Khách mới") và điều kiện tạm: "Thêm nhóm đối tượng thành công" … "Xoá thành công" |

🔴 Rác: CTKM không có chức năng xoá ⇒ nháp `AUTO8_KM_NHAP_*` ở lại (không áp vào đơn).
🔴 Bài học: chạy hai lượt cùng tài khoản `tct` làm mất phiên lẫn nhau (đã ghi quality gate).

### Bổ sung 26/09/2026 — nhóm 090–130 chạy trên đơn bán thật (81/81 script thật)

CTKM mẫu dựng bằng API (`tests/km-tinh.js`, phạm vi CHỈ điểm bán làn, tự dừng), đo "Cần thanh toán" trên POS rồi thanh toán tiền mặt,
đối chiếu Doanh thu ở chi tiết đơn. Seed mới: bước 16 (danh mục B + NGK + combo 3) và **16.3** (danh mục COMBO B type 10 + combo 4).
Helper: `chonSpDanhMuc` (hộp "Chọn sản phẩm khuyến mại" khi tick CTKM theo danh mục), `spHetHang` (SP có giá, tồn 0 — `AUTO<làn>SPHET`).

| Case | Đo được | Nhận định |
|---|---|---|
| `11_120_007` / `11_120_009` | KM đơn "từ 150k/180k" **vẫn áp** khi KM SP/danh mục đã kéo tổng xuống dưới ngưỡng (ngưỡng so trên tổng TRƯỚC giảm): 140k ⇒ còn 126k; 170k ⇒ 160k | 🔴 lệch kịch bản (kịch bản: không áp) |
| `11_120_004` / `11_120_014` | Giảm theo % đơn bị **làm tròn 1.000đ**: 370k × 7% = 25.900 ⇒ trừ 26.000 (cần 344.100 ⇒ 344.000); 90k × 5% = 4.500 ⇒ trừ 4.000 (85.500 ⇒ 86.000) | chốt quy tắc làm tròn |
| `11_090_009` | Quà hết hàng: POS báo "Số lượng trong kho không đủ" + popup "Tồn kho không đủ", đơn không lưu (POD-0005) | đạt (SP quà phải CÓ bảng giá — TD1/TD2 bị chặn "chưa nằm trong bảng giá" trước) |
| `11_100_005` | 2 mức cùng CTKM: bảng CTKM chỉ hiện mức "Mua từ 10" (2 dòng trùng) nhưng SL 5 vẫn áp mức 5 (450k), SL 10 áp 25k (750k); sau khi đổi SL POS **tự tick lại** CTKM chuỗi "giảm 5k" | ghi — hiển thị mức trùng |
| Nhóm danh mục (100_007/009/010/012, 110_003–006/010, 120_011) | Tick CTKM tặng/giảm theo DANH MỤC mở hộp chọn SP; nếu CTKM đã tự tick thì phải bấm link "Chọn sản phẩm trong danh mục". Quà chọn từ hộp là DÒNG GIỎ "… KM - n Chai Quà tặng" | đạt |
| `11_110_009` | Hộp chọn SP của POS chỉ liệt kê combo thuộc **danh mục combo (type 10)** — combo nằm trong danh mục SP không chọn được. Seed 16.3 dựng lại; lượt 26/09 16:50 báo "chưa nằm trong bảng giá có hiệu lực: AUTO8_SP_COMBO4" (bảng giá vừa tạo, chạy lại sau) | chạy lại |
| `11_110_001`, `11_120_008/009` | Giỏ TC + FIFO bị POS **tự gộp thành combo** `AUTO8_SP_COMBO` (combo seed cũ = TC + FIFO) ⇒ đổi giỏ sang TC × 2 | ghi — tự nhận diện combo |

## `12_1_ho_so_nha_cung_cap`

| `12_1_040_001` | Đăng nhập GDV seed từ context trắng ⇒ về `/lich-ca-nhan/ca-lam-viec` (đạt) |
|---|---|

> Lượt cuối 24/09: `11` Đạt 22 · Không đạt 0 · Chưa chạy 59 (49 tenCTKM) · `12_1` Đạt 28 · Không đạt 4.

---

## `12_2_san_pham_va_bang_gia_ncc` (xong vỏ 24/09/2026 — lượt cuối: Đạt 38 · Không đạt 11 · Chưa chạy 1)

> Vật thử: SP rác `AUTO8_SP_TC_55976508` / `AUTO8_SP_FIFO_55976508` (chưa mapping NCC) — SP sản xuất KHÔNG chọn được
> ở màn này (`excludeComposite`). Bảng giá NCC tạm `AUTO8_BGN_*` phạm vi điểm bán rác, huỷ ở cuối. 🚫 Không đụng 7 SKU
> seed đã có `AUTO8_BGMUA`. Validate Excel chặn request ghi, đo payload.

### Lệch / nghi lỗi (ĐỎ)

| Case | Kịch bản | Hệ thống |
|---|---|---|
| `12_2_020_006/016`, `12_2_020_008` | File/mẫu: SKU · Giá nhập · Mặc định | Mẫu "Khai báo sản phẩm và giá": SKU · Giá nhập sau VAT · VAT (%) · Loại giá (STANDARD/PROMO/BONUS) · SL tối thiểu · SL tặng · Mô tả; mẫu "Chỉ khai báo SP": SKU · Đơn vị tính. Không có cột "Mặc định" |
| `12_2_020_014` | SKU trùng trong file ⇒ cảnh báo | 🔴 Không cảnh báo, **gửi thẳng** request batch |
| `12_2_020_019` | Giá nhập = 0 ⇒ cảnh báo | 🔴 Nhận, gửi đi không cảnh báo |
| `12_2_020_027/028` | SL tối thiểu âm / SL tặng âm ⇒ báo lỗi | 🔴 Nhận, gửi đi (FE chỉ chặn Giá < 0 và VAT < 0) |
| `12_2_020_015` | Xoá dòng trong drawer ⇒ thông báo thành công | Xoá dòng ngay, không có thông báo |
| `12_2_040_011` | Loại giá "Tặng hàng" có SL tối thiểu + SL tặng | 🔴 Form bảng giá chỉ có **Giá gốc / Khuyến mại** (mẫu Excel vẫn nhắc BONUS) |
| `12_2_040_013` | Chi tiết hiện NCC | Hiện "NCC **ID: 133**" thay vì tên NCC |
| `12_2_040_014` | Lọc theo bưu điện tỉnh ⇒ bảng giá của tỉnh | 🔴 Lọc tỉnh rác ra **rỗng** dù bảng giá A áp cho điểm bán thuộc tỉnh đó (lọc chỉ khớp bảng giá khai đúng cấp tỉnh?) |

### Đạt (đo)

`020_001` drawer đủ cột (Sản phẩm · SKU · Đơn vị tính · Mặc định) · `020_003/004/005` tìm theo Tên SP / SKU / Barcode ·
`020_002` "Cập nhật sản phẩm thành công" · `010_002` lịch sử giá (Timeline) 60.000 đ Giá gốc · `010_003` ban hành bảng thứ
hai ⇒ lịch sử có cả 11.111 và 22.222 (sinh dòng mới) · `010_004/005` xoá / huỷ xoá · `040_002/003/004/005/006/009/010/012`
(nháp: Xem·Lịch sử·Sửa·Ban hành; đã ban hành: Xem·Lịch sử·Gia hạn·Hủy; "Ban hành/Hủy bảng giá thành công"; Giá gốc không có ô SL,
Khuyến mại có) · `020_009/010/011/017/018` phân tab đúng · `020_013` "Không có SKU đã khai báo để import" · `020_020/023/030`
khoá nút + "Danh sách chứa sản phẩm có VAT < 0 hoặc Giá < 0" · `020_021/022/024/025/026` xem trước đúng (VAT 100% nhận,
SL tối thiểu 0 → hiện 1) · `020_007/012/029` import thành công · `040_007/008` file gửi `import-excel` khi lưu nháp.

- Chưa chạy: `12_2_040_015` (`_blocked`: cần bảng giá đã hết hạn — FE không cho ngày quá khứ).
- Rác: bảng giá NHÁP `PL-2609240740-327` (import 020_029, nháp không huỷ được qua UI) cho SKU rác FIFO.

---

## `12_3_cong_no_nha_cung_cap` (24/09/2026 — lượt cuối: Đạt 6 · Không đạt 8 · Chưa chạy 54)

> Dữ liệu nền: `00_seed` bước 12 — "Điều chỉnh công nợ" TĂNG 1.000.000 đ phải trả `AUTO8_NCC` ở đơn vị "DC TỔNG CÔNG TY",
> lập bằng `tct`, duyệt bằng `tct_ke_toan` (chế độ 4 mắt: "Người lập chứng từ không được tự duyệt").

### 🔴 Lỗi / lệch

| Case | Hệ thống |
|---|---|
| `12_3_020_021`, `12_3_020_019`, `12_3_020_004` | Danh sách: Còn nợ **1.000.000 đ**; drawer chi tiết: "Tổng còn nợ **0 đ**", Lịch sử ghi nợ trống, form Thanh toán "Nợ hiện tại **0**" ⇒ khoản điều chỉnh đã duyệt KHÔNG thanh toán được, hai màn lệch số |
| `12_3_020_009/013/015/016` | Chi tiết công nợ chỉ có nút **Thanh toán** — "Gạch nợ" / "Ghi nợ" không có lối vào (luồng vẫn còn trong `ModalCreateDebt.jsx`) |
| `12_3_020_027` | Nút "Xuất excel" lịch sử công nợ bị comment-out |
| (seed) | 🔴 Điều chỉnh lập ở **điểm bán seed** (pod khác) không ai duyệt/từ chối được: TCT/tỉnh gọi approve/reject → 404 "Thực thể không tồn tại", CHT/GDV → 401; danh sách "Chứng từ điều chỉnh" của TCT không thấy nó. Chứng từ rác `260924AWQC8TDXRT` (id 477, −1.000.000, PENDING) kẹt vĩnh viễn |
| (seed) | Select "Lý do điều chỉnh" không showSearch: Enter chọn mục đầu — chứng từ rác trên bị ghi lý do "Chiết khấu thanh toán" ⇒ chiều GIẢM |

### Đạt

`030_001` cột: Cửa hàng/kho · Nhà cung cấp · Cần thanh toán · Đã thanh toán · Hoàn trả đơn hàng · Còn nợ · Thao tác · `030_002` tìm NCC ·
`030_003` phân trang · `020_018/020` tab Lịch sử thanh toán / trả hàng gọi `supplier-debt/history` đúng `historyGroup`.

### Chưa chạy (54)

Toàn bộ nhóm thanh toán / gạch nợ / ghi nợ THÀNH CÔNG + đối chiếu sau giao dịch (020_002…033, 030_004…035): cần nợ sinh từ **PO nhập hàng thật**
của `AUTO8_NCC` — làm lại sau `13_3`.

Tiếp theo: `13_1_phieu_de_xuat_va_phe_duyet`.


### Bổ sung 26/09/2026 — nhóm TIỀN 020/030 (spec `cong-no-tien.tct`)

🔴 Tiền đề đã rõ: **phiếu nhập LẺ từ NCC** (không gắn PO) ghi nợ IMPORT ngay khi checkout; phiếu thuộc PO chỉ ghi nợ khi **hạch toán PO**
(`PoInvoiceReconcileServiceImpl`) ⇒ nợ từ PO 13_3 = 0 là đúng thiết kế. Spec tự nhập kho SP FIFO từ `AUTO<làn>_NCC` ở kho TCT rồi thanh toán qua UI.

| Case | Đo được | Nhận định |
|---|---|---|
| 020_002/003/005/006/007/008/022/023/024 (+030 tương ứng) | Nợ giảm đúng từng lần; mỗi lần sinh 1 phiếu chi (`SPA_EXPENSES`, source SUPPLIER, CASH); lịch sử thanh toán đủ từng dòng; trả hết về 0; nhập vượt nợ ô tự về số nợ | đạt |
| (phát hiện khi dựng tiền đề) | SP **giá tiêu chuẩn**: nhập 10 × 1.000.000 từ NCC ⇒ BE ghi đơn giá phiếu = **giá tiêu chuẩn 60.000**, dòng nợ NCC 600.000 thay vì 10.000.000 | 🔴 lỗi — công nợ phải theo giá mua (chênh lệch vào tài khoản chênh giá) |
| 020_032 / 030_034 | VAT phiếu nhập lẻ lấy theo **thuế SP** (không theo payload); đơn giá gồm VAT: 2 × 550.000 SP VAT 10% ⇒ nợ 1.100.000, VAT dòng 100.000 | đạt |
| 020_033 / 030_035 | 2 × 500.000 − chiết khấu 100.000 + 1 quà giá 0 ⇒ nợ 900.000 | đạt |
| 020_009–017, 020_025/026, 030_011–019/027/028 | Chi tiết công nợ chỉ có nút **Thanh toán** — không có lối vào Gạch nợ / Ghi nợ (ModalCreateDebt còn luồng WRITE_OFF/DEBT) | 🔴 thiếu chức năng — chờ user chốt bỏ case hay mở lại |
| 020_028/030/031 (+030) | Nợ theo PO (TCT giao thẳng / tỉnh tự đặt / giao 1 phần) chỉ sinh khi hạch toán PO — chạy làn 8 đo số phiếu PO vs dòng nợ | chờ luồng hạch toán PO |

## `13_1_phieu_de_xuat_va_phe_duyet` (đang làm vỏ — làn 8, 24/09/2026)

### Lệch đặc tả / nghi lỗi sản phẩm (case đỏ, giữ nguyên assertion)

| Case | Tài liệu nói | Sản phẩm làm (đo 24/09/2026) | Quyết định |
|---|---|---|---|
| `13_1_040_006` | Lọc danh sách phiếu đề xuất theo **Kho/Điểm bán** | Ô "Điểm bán / kho" chỉ hiện khi `!scope.isShop && shopOptions.length > 1`, mà `shopOptions` = các **phân công cấp điểm bán của chính tài khoản** (`state.chain.shopList`), không phải điểm bán thuộc tỉnh/xã ⇒ vai tỉnh, xã, TCT đều **không thấy ô lọc**; vai điểm bán thì theo thiết kế bị ẩn. Case chạy bằng vai `province` (đổi từ `shop`) và đang ĐỎ. Cần chốt: ô lọc phải lấy danh sách điểm bán trong phạm vi đơn vị? | |
| `13_1_050_001` | Sau khi chọn Xã, cột 3 có thanh lọc **Tất cả / Điểm bán / Kho** và danh sách cửa hàng kèm radio | Cột 3 không có thanh lọc nào; gọi `/shops/profile/chain?orgUnitType=BUU_DIEN_XA&…&shopType=HUB` (ô `shopId` đặt `shopType="INVENTORY"`) ⇒ chỉ ra **kho HUB**, điểm bán `AUTO8_SHOP` của xã không hiện, xã seed ra "Không có dữ liệu". Các phần khác (Đã chọn 0, Xem/Ẩn danh sách, 3 cột + Tìm kiếm, chữ mờ "Vui lòng chọn Tỉnh/Tổng công ty trước" / "Vui lòng chọn Xã / Phường trước", Đóng/Xác nhận) đạt. Cần chốt: phiếu đề xuất tỉnh có được nhận về điểm bán không, hay chỉ kho? | |
| `13_1_060_001`–`060_007`, `13_1_040_014` | CHT sửa được phiếu Nháp / Chờ duyệt; có nút tách, gộp, chỉnh sửa | Vai CHT: cột Hành động **trống**. Cả 3 nút (+ gộp, tách, "Chỉnh sửa phiếu") đều gắn `permKey=stock_requests_merge_split` ⇒ CHT không có quyền gộp/tách thì cũng **mất luôn nút Sửa**. Cần chốt: nút Sửa phải theo quyền sửa phiếu, không theo quyền gộp/tách? | |
| `13_1_030_009` | CHT bấm ô Điểm bán → popup chọn điểm bán | Ô "Điểm bán / Kho nhận hàng" bị khoá với CHT (`disabled={scope.isShop}`), cố định điểm bán của mình. Cần chốt kịch bản hay sản phẩm đúng. | |
| `13_1_030_006` | Bỏ trống sản phẩm → "Vui lòng thêm ít nhất 1 sản phẩm" | Bấm lưu không hiện thông báo này (không bắt được toast nào). Chưa soi kỹ nguyên nhân. | |
| `13_1_080_006` | Tách: xoá phiếu khi chỉ còn 2 → "Yêu cầu chia thành ít nhất 2 phiếu" | `StockRequestSplitPage.handleRemoveGroup` cho xoá tới khi còn 1, chỉ chặn ở 1 phiếu ("Phải giữ lại ít nhất 1 phiếu tách!") ⇒ còn 2 phiếu vẫn xoá được, không có thông báo. | |
| `13_1_080_001` | Màn tách hiện tên Cửa hàng/Kho | Ô Cửa hàng/Kho hiện **ID số `68152`** thay vì tên (màn gộp, cột "Cửa hàng / kho" cũng vậy). | |
| ~~`13_1_090_005`~~ | ĐÃ SỬA 24/09: lỗi SCRIPT, không phải sản phẩm — gửi lên TCT sinh phiếu MỚI mang mã TCT, bản cũ tìm mã gốc ở TCT. Giờ xanh. | | |
| `13_1_090_004` | Giám đốc xã từ chối bỏ trống lý do → "Vui lòng nhập lí do" | Bỏ trống lý do vẫn gửi và nhận "Đã từ chối phiếu" ⇒ 🔴 không bắt buộc lý do. | |

### Ghi chú kỳ vọng

- `13_1_040_011` — kịch bản ghi "sắp xếp theo Ngày tạo"; FE gửi cố định `sort=modifiedDate,desc`, cột không có sorter. Script kiểm `createdDate` giảm dần trên trang đầu — **đang xanh** trên dữ liệu làn 8 lúc đo; nếu một phiếu cũ bị sửa, nó nổi lên đầu (sort theo ngày sửa) và case sẽ đỏ. Cần chốt tiêu chí: Ngày tạo hay Ngày sửa.

### Hạn mức duyệt (090_006–008) — đã chạy, bật/tắt cấu hình trong case

- User cho phép (24/09/2026) bật cấu hình hạn mức "Duyệt phiếu đề xuất đặt hàng" trong lúc test rồi tắt lại. Mỗi case bật đầu case và **trả về trạng thái cũ trong `finally`**; đã kiểm sau lượt chạy: `active=false`.
- Đo: phiếu 120.000 đ → "Đã duyệt 0/1" → xã duyệt → "1/1", tỉnh thấy phiếu. Phiếu 54.000.000 đ → "0/2"; tỉnh KHÔNG thấy trước khi xã duyệt; xã duyệt → "1/2", phiếu vào tab "Phiếu đề xuất vượt hạn mức chờ duyệt" của Quản lý tỉnh ("Bước 2/2"); tỉnh duyệt → "2/2". Xã từ chối bước 1 → phiếu không lên tỉnh.
- 🔴 Phụ phẩm: 3 phiếu 54 triệu từ các lượt probe (`DX2609243679`, `DX2609243856`, `DX2609248910`) đang **chờ bước 2**, thêm `DX2609248169` + `DX2609244188` (probe đầu, chưa ai duyệt bước 1) ở tab vượt hạn mức của tỉnh AUTO8 — khi hạn mức tắt thì chúng nằm treo; không xoá được.

### Ghi chú script

- `13_1_070_002` (viết trước): kiểm `"quantity":5` trong payload gộp — payload `StockRequestMergePage` **không có** trường quantity nên case luôn đỏ oan ⇒ đổi sang kiểm cột "Số lượng" trên bảng sau gộp (= 5). Màn gộp của vai tỉnh để trống ô bắt buộc "Điểm bán" (chỉ tự điền theo cửa hàng chọn ở header) ⇒ script chọn kho tỉnh trước khi Lưu. Cần chốt: phiếu gộp ở cấp tỉnh nên mặc định nhận về đâu?

## `13_2_gop_tach_va_dieu_phoi` (xong 24/09/2026 — Đạt 3/3)

- Đổi vai `shop` → `province` cho cả 3 case: vai điểm bán không có nút gộp/tách/lịch sử. `13_2_030_001` bản cũ chỉ tìm chữ "gộp/tách" trên danh sách (gần như pass rỗng) ⇒ viết lại, mở drawer "Lịch sử gộp / tách phiếu" thật.
- Không phát hiện lệch đặc tả.

## `13_3_dat_hang_va_nhap_hang` (đang làm — làn 8, 24/09/2026)

User cho phép (24/09) đụng kho TCT, yêu cầu phủ đủ case ⇒ PO đặt về **kho TCT**. PO / phiếu nhập / chuyển kho `AUTO TEST 13_3` ở lại (không xoá được).

### Lệch đặc tả / nghi lỗi sản phẩm (case đỏ, giữ nguyên assertion)

| Case | Tài liệu nói | Sản phẩm làm (đo 24/09/2026) | Quyết định |
|---|---|---|---|
| — (phát hiện khi dựng helper) | TCT đặt NCC về kho HUB tỉnh | Chọn Kho đặt = Kho nhận = HUB tỉnh rồi "Gửi nhà cung cấp": FE gửi `status:SENT, shopId:68154` nhưng BE trả `status:DRAFT, shopId:null` — phiếu nằm Bản nháp, chi tiết hiện Kho đặt/Kho nhận "—". Kho TCT thì đúng "Đã gửi NCC". | |
| `13_3_030_001/030` | Bộ lọc có "Điểm bán/Kho" | Không có — cùng gốc `shopOptions` = phân công cấp điểm bán của tài khoản (xem `13_1_040_006`). | |
| `13_3_030_004/033` | Sửa PO nháp lưu được, vẫn Bản nháp | Màn sửa: giá SP về **0 đ**, "Lưu nháp"/"Lưu" bị khoá (`hasNoPriceConfigured`) ⇒ không sửa được PO nháp. | |
| `13_3_030_013/043` | Tìm theo ghi chú | Ô "Mã phiếu" chỉ tìm theo mã: tìm đúng ghi chú của PO vừa tạo ra 0 phiếu. | |
| `13_3_030_019/049` | Đặt NCC SP có phân loại thành công | Dòng biến thể `AUTO8_SKU_BT-1/-2` hiện giá "Chưa cài đặt" dù bảng giá mua seed có đủ 2 SKU (60.000) ⇒ nút gửi bị khoá. | |
| `13_3_030_010/040` | Nhập kho → Chọn nhập kho → Tải mã PO | Mọi vai TCT (tct / tct_cung_ung / tct_ke_toan) ở `/inventory/import` không có nút "Nhập kho" (chỉ "Tồn kho đầu kỳ" / "Xuất excel") — TCT chỉ nhập được từ chi tiết PO. | |
| `13_3_050_001/002/003` | Nhãn "Điểm bán nhận hàng" · "Vui lòng chọn điểm bán" · "Gửi thành công!" | Sản phẩm: "Kho nhận hàng" · "Vui lòng chọn kho" · "Đã gửi phiếu lên tổng công ty". Chức năng đúng, lệch chữ. | |
| `13_3_010_002` | Mở form tạo PO từ phiếu là thấy khu vực "Danh sách hàng hoá"; có trường "Điểm bán" | Khu vực "Danh sách sản phẩm" chỉ hiện sau khi chọn Kho đặt hàng; trường là "Kho đặt hàng" / "Kho nhận hàng". Các nút, "Phiếu đề xuất nhập hàng" (mang mã phiếu nguồn), SP điền sẵn: đạt. | |
| `13_3_010_005` / `010_006` | Đổi sang NCC không cung cấp SP ⇒ báo "Một số sản phẩm không thuộc nhà cung cấp mới", cho loại bỏ | Đổi sang "CÔNG TY MỚI" (không có bảng giá cho `AUTO8_SP_FIFO`): **không cảnh báo**, dòng SP giữ nguyên, tổng tiền 0 đ. (SP giá tiêu chuẩn được code miễn kiểm — case đã dùng SP FIFO.) | |
| `13_3_010_007` | Báo đỏ "Chọn điểm bán" | Báo "Chọn kho đặt hàng" (và thêm "Vui lòng chọn hợp đồng NCC"). | |
| `13_3_010_008` | Sửa phiếu đề xuất **đã duyệt** ⇒ cập nhật, trạng thái vẫn Đã duyệt | Lưu được (ghi chú cập nhật) nhưng phiếu quay về **"Chờ duyệt"**. | |
| `13_3_010_003` | "Tạo phiếu đặt hàng thành công!" | Thông báo không có dấu "!" (chỉ lệch chữ). | |
| `13_3_040_011` | Trạng thái "Xác nhận" / "Chờ xác nhận" | "Đã xác nhận" / "Chờ xác nhận"; đơn nhận thiếu gắn nhãn "Nhận một phần". | |

| — (khi viết `tu-doanh.province.spec.js`) | Vai tỉnh mở "Kho đặt hàng" chọn được kho HUB của tỉnh | Hộp chọn kho mở ra đã **tích sẵn** tỉnh của tài khoản nhưng cột kho "Không có dữ liệu" (không gọi `/shops/profile/chain`); bấm tỉnh là BỎ chọn, bấm lần 2 mới ra `AUTO8_HUB`. Script bấm lại (`po-ghi.js` `chonKho`), 🚫 không che: người dùng thật gặp y hệt. | |

### Tỉnh đặt hàng NCC tự doanh (030_023–026 / 053–056, 040_010 / 020) — viết 24/09/2026, 10/10 đạt
- Tiền đề mới: bước seed 14 (`00_seed/api-tests/14-tu-doanh-tinh.api.spec.js`) — 2 SP `manageType = Tự doanh` của tỉnh làn (`TD1` có bảng giá mua phạm vi tỉnh 50.000 đ, `TD2` map NCC nhưng chưa có giá), NCC cấp tỉnh `<tiền tố>NCC_TINH` do vai tỉnh tạo, hợp đồng ACTIVE.
- Đo: PO `PO2609244214` (SENT, NCC tỉnh, kho HUB tỉnh) — TCT tìm đúng mã ra 0 dòng; danh sách "Phiếu nhập hàng từ NCC thuộc TCT" của tỉnh cũng 0 dòng.
- Ô tìm SP ở form PO chỉ gọi `/supplier-products/by-supplier` của NCC đã chọn ⇒ "chỉ SP tự doanh" thực chất là "chỉ SP đã map NCC tỉnh". Nếu nghiệp vụ muốn chặn cả SP tập trung đã lỡ map vào NCC tỉnh thì cần kiểm tra ở BE — case hiện chỉ chứng minh SP tập trung của làn KHÔNG hiện.
- 030_023 tiền điều kiện trong kịch bản ghi "Vai `tct`" nhưng bước là "Tỉnh đặt hàng" ⇒ chạy bằng vai `province`.

### Quan sát khác
- Sau "NCC xác nhận", ô Ghi chú ở chi tiết PO từ "AUTO TEST 13_3" thành "—" (chưa viết case riêng, cần xác nhận có phải mất dữ liệu).
- Xác nhận đơn giao thẳng sinh đủ 3 chứng từ: TCT nhập NCC `DD-<PO>-IN-TCT`, TCT xuất nội bộ `DD-<PO>`, HUB tỉnh nhập `DD-<PO>-IN` (pod khác) — `13_3_040_005/015` kiểm cả ba.


## 16_hang_ky_gui · 010 tra cứu công nợ ký gửi — viết 24/09/2026 (làn 7, vai `tct`)

Spec `16_hang_ky_gui/tests/tra-cuu-cong-no.tct.spec.js`: 005–010, 012–014, 017 đạt · 011, 015 đỏ (lỗi sản phẩm) · 016 skip (thiếu dữ liệu).
🔴 Đổi vai `province` → `tct` cho 005–017: làn 7 tỉnh / xã / điểm bán có **0** khoản nghĩa vụ, TCT thấy 30 khoản của chuỗi (3 tỉnh, 6 điểm bán) — lọc/tìm trên bảng rỗng là pass rỗng.

| Case | Tài liệu nói | Sản phẩm làm (đo 24/09/2026) | Quyết định |
|---|---|---|---|
| `16_010_011` | Chọn Từ–Đến bao đúng một ngày có khoản ⇒ ra đúng các khoản của ngày đó | Backend coi **Đến ngày là mốc KHÔNG bao gồm**: `fromDate=toDate=2026-08-17` ⇒ 0 khoản (ngày đó có 4); `16/08–17/08` chỉ ra khoản ngày 16. Chọn một ngày trên RangePicker luôn rỗng. | |
| `16_010_015` | Đổi số dòng mỗi trang ⇒ request mang size mới và về trang 1 | Đang ở trang 2, đổi 10→20 dòng: request `page=1&size=20` (vẫn trang 2), không về trang 1. | |
| `16_010_010` | Ba trạng thái Tạm tính / Đã đối soát / Đã đảo | Ô lọc đúng ba nhãn, lọc đúng. Nhưng dữ liệu có thêm trạng thái **`INVOICED`** (3/30 khoản) mà FE không khai nhãn ⇒ cột Trạng thái hiện nguyên chữ `INVOICED`, và không lọc được nhóm này. | |
| `16_010_001` (đo lại) | — | Lần chạy 20/09 ghi API `/consignment-debt/obligations` 401 với vai tỉnh; 24/09 làn 7 trả **200** (0 dòng). | |

| `16_010_019` / `16_010_020` | HDSD 010 khai đủ 4 cấp xem được công nợ ký gửi | Vai **điểm bán** và **xã** (làn 7): `GET /consignment-debt/obligations` trả **401** "Không có quyền truy cập", màn rỗng im lặng — cùng triệu chứng lần đo 20/09 với vai tỉnh (nay tỉnh đã 200). | |
| `16_020_014` / `16_020_015` | Điểm bán / xã bị chặn hoặc không có nút "Sinh kỳ từ hợp đồng" | Nút **vẫn hiện** (FE không kiểm vai; route dùng quyền `STOCK_ALERTS`), danh sách NCC 401 im lặng; bấm "Sinh kỳ" bị API chặn ⇒ case đạt, nhưng màn nên ẩn nút. | |
| `16_020_016` | Tỉnh mở kỳ của đơn vị khác ⇒ "Kỳ đối soát này thuộc đơn vị khác…" | Chưa kiểm được: 36/36 kỳ của chuỗi thuộc `TONG_CONG_TY/VNPOST`; BE cho phạm vi CÓ tổ tiên nên tỉnh mở kỳ TCT là đúng thiết kế. Cần hợp đồng ký gửi cấp tỉnh + sinh kỳ. | |

- `16_010_016` chưa kiểm được: 30/30 khoản có `priceSource` = `CONTRACT` hoặc rỗng, không khoản nào `SKU_MASTER` ("Danh mục sản phẩm"). Cần một lần bán hàng ký gửi SKU không có trong bảng giá NCC.

### 16 — bổ sung 25/09/2026 (phiên làn 8 nhận làn 7 sau khi phiên kia tắt)
Spec mới: `chi-tiet-ky.tct` (chạy lần đầu + 030_003/006/007/009/010/013/015/016/028) · `bao-cao.{tct,province,shop}` (060) ·
`hoa-don-ky.tct` (040 + 050) · `sinh-ky.tct` (020_003–006, 070_002/003) · `chi-tiet-ky.shop` (050_020).
🔴 Vai `tct` cho mọi case cần dữ liệu (tỉnh / điểm bán làn 7 ra 0 dòng ở cả báo cáo lẫn đối soát — đúng phạm vi).
An toàn: mọi test giao diện chặn `POST .../lock`, `.../post-debt`, `.../post-internal-debt`; hoá đơn nạp thử vào kỳ LOCKED đều xoá lại
(kiểm sau lượt: kỳ 76 / 1 không còn hoá đơn, kỳ 2 giữ nguyên). "Sinh kỳ" bấm thật (BE chống trùng, lượt đo: 0 kỳ mới, 2 kỳ đã có).

| Case | Tài liệu nói | Sản phẩm làm (đo 25/09/2026) |
|---|---|---|
| `060_019` (+ `060_020`) | Kỳ đã chốt đối chiếu báo cáo ↔ màn Đối soát kỳ ⇒ Khớp | 🔴 **Mọi kỳ có bán ra đều LỆCH**: kỳ LOCKED 76 DW 400 / MySQL 1.108 (−708); các kỳ tháng 8 DW **0** / MySQL 1.422. 25 kỳ "Khớp" đều là kỳ 0/0 không phát sinh. Kho báo cáo (ClickHouse) thiếu phần lớn giao dịch bán ký gửi. |
| `060_025` | Xuất Excel lỗi ⇒ hiện chuỗi lỗi BE | Luôn "Không xuất được file Excel": `exportConsignmentNxt` khai `responseHandler: blob` ⇒ body lỗi JSON bị đọc thành Blob, mất `status.message`. |
| `060_008` | Chọn xã + 2 tỉnh ⇒ cảnh báo, không truy vấn | Ô "Phạm vi tổ chức" **không chọn được tỉnh/xã**: `ConsignmentFilterPanel` không truyền `allowOrgUnitSelect` ⇒ drawer "Chọn Điểm bán / Kho", chỉ tick điểm bán ⇒ `provinceCodes/wardCodes` không bao giờ có giá trị: báo cáo không lọc được theo đơn vị, cảnh báo của case là code chết. |
| `060_027` (quan sát, case đạt) | Điểm bán chỉ thấy số của mình | Số liệu đúng phạm vi, nhưng ô "Theo kỳ đối soát" của điểm bán / tỉnh liệt kê đủ **36 kỳ của TCT** (API `/report/consignment-report/periods` không lọc theo phạm vi). |
| `040_008` | Hợp đồng chưa khai ngày trả chậm ⇒ cột Hạn thanh toán "Chưa xác định hạn" | Hiện **"-"**: `AppProTable` thay `null` bằng `columnEmptyText` trước khi gọi `render` ⇒ nhánh `val ? … : <Tag>` không bao giờ chạy (đúng bẫy `priceCells.jsx` đã ghi chú). |
| `030_015` | Bung một mặt hàng tỉnh → xã → điểm bán, tổng mỗi cấp bằng cấp dưới | Cấp đơn vị khớp dòng NXT (BN03 tồn cuối 16); bấm "Xem điểm bán" ở nhóm **"Tổng công ty"** ⇒ `by-org?nhom=TCT` trả **0 dòng** (tổng 0 ≠ 16). |

Quan sát khác (không đỏ):
- `040_012`: nạp **hai hoá đơn GỐC** vào một kỳ thì kiểm tổng chỉ tính một bản (vẫn "Khớp") — hoá đơn gốc thứ hai bị bỏ qua im lặng. Cần user chốt đây là thiết kế hay lỗi.
- `040_010/011`: hoá đơn điều chỉnh GIẢM phải ghi tổng **dương**, dấu ở `TCDChinh`; BE trừ theo trị tuyệt đối.
- `040_019` (kỳ vọng chưa chốt — đã đo): dung sai kiểm tổng **10đ** (+5 và +10 Khớp, +11 Lệch) — khớp hằng số FE `DUNG_SAI_KIEM_TONG`.
- Kỳ LOCKED 76 có **biên bản âm** −113.791.878đ (giảm trừ > phát sinh); kỳ LOCKED 1 biên bản 0đ.
- Tiền đề không tới được từ giao diện: `060_006` (RangePicker `allowClear={false}`, xoá chữ không đổi giá trị), `060_007` (RangePicker không nhận Từ > Đến), `060_009` (mọi tài khoản đều có chainId).

Chưa chạy — chờ user cho phép (đã ghi lý do trong `chua-chay-duoc.*.spec.js` / trong spec):
- Chốt kỳ thật (một chiều, kỳ thật của chuỗi): `030_018/019/020/021/022/025/026`, vế "chặn chốt" của `030_007`.
- Ghi nợ chính thức / nội bộ: `050_012/013/015/017`, `070_001/004`; lệnh chi `010_018`.
- Cần seed hàng ký gửi ở điểm bán làn 7: `010_021`, `010_022`, `060_022`.
- Thiếu dữ liệu (đã kiểm phần có dữ liệu rồi skip kèm lý do): `030_006/010/011/013/014/016/017`, `040_006` (nhãn Chưa kiểm), `040_009` (Email/Nhập tay), `050_010`, `060_021` (không kỳ nào "Chưa đối chiếu được"), `020_005`, `020_016`.
- Lượt đủ 25/09: **92 đạt · 9 đỏ · 37 skip** (138 case). 9 đỏ đều lỗi sản phẩm: `010_011` `010_015` `010_019` `010_020` (đã ghi 24/09) · `030_015` `040_008` `060_008` `060_019` `060_025`. Lượt tổng đầu có 18 case đỏ vì màn đăng nhập kẹt từ ~11:10 (+7) — chạy lại riêng đều đạt.


## `14_1_lap_va_duyet_phieu_xuat_tra` — viết 24/09/2026 (làn 8)

Spec: `tao-phieu.shop` · `tao-phieu-ghi.shop` · `xu-ly.shop` · `duyet.ward` · `duyet.province` · `duyet.tct` · `tra-theo-po.shop|province` (+ `lap-phieu.shop` cũ).
Tiền đề tạo bằng API (`taoPhieuApi`, payload đối chiếu request thật của form) + phiếu nhập 2 lô mới mỗi lượt (`phieuNhapNhieuLo`, vai GDV).

### 🔴 Nghi lỗi sản phẩm (case ĐỎ, assertion giữ nguyên)
| Case | Tài liệu nói | Sản phẩm làm (đo 24/09/2026) | Quyết định |
|---|---|---|---|
| `14_1_010_031` / `010_032` | Trả 5 từ lô L001 ⇒ tỉnh duyệt xong lô L001 còn 5, L002 giữ nguyên | Phiếu xuất giữ chỗ `RSV-RTR-*` trừ vào **lô cũ nhất** (`OB68152-…`, lô tồn đầu kỳ) chứ không phải lô đã chọn; L001/L002 vẫn 10. `ReturnRequestStockService.applySelectedBatch` có gắn lô, nhưng engine xuất không trừ đúng lô (SP giá tiêu chuẩn). Sai lô ⇒ truy vết NCC/lô sai. | |
| `14_1_050_003` | Tỉnh "Từ chối" phiếu Đã duyệt ⇒ hàng hoàn về kho điểm bán | FE cho mục "Từ chối" ở phiếu APPROVED nhưng gọi `/approve approved=false` ⇒ BE: "Cấp tỉnh chỉ duyệt được phiếu đã được cấp xã duyệt". Không từ chối được; còn `/cancel` thì đổi trạng thái mà **không hoàn kho**. ⇒ phiếu Đã duyệt không có đường gỡ hàng giữ chỗ. | |
| `14_1_010_013` | Quét serial không có ⇒ báo `Serial "…" không tồn tại hoặc đã xuất kho` | `GET /stock-return-request/resolve-serial` trả **"Không có quyền truy cập"** cho Cửa hàng trưởng ⇒ ô quét serial không dùng được ở điểm bán (thiếu permission). | |
| `14_1_020_007` | Nộp lại phiếu đã Chờ duyệt ⇒ "Chỉ nộp được phiếu đang ở trạng thái Nháp" | `POST /{id}/submit` lần 2 trả **"Thành công"**. | |
| `14_1_010_005` | Mã phiếu nhập không tồn tại ⇒ "Không tìm thấy phiếu nhập/chuyển kho với mã đã nhập" | Màn hiện nguyên thông báo kỹ thuật BE "Thực thể không tồn tại (…mã request)". | |

### Lệch đặc tả (cần chốt kỳ vọng)
| Case | Tài liệu nói | Sản phẩm làm | Quyết định |
|---|---|---|---|
| `14_1_010_022` / `010_029` | Gõ vượt SL khả dụng / tồn lô ⇒ cảnh báo | Ô số có `max` ⇒ tự hạ về trần khi rời ô, cảnh báo không bao giờ hiện (vẫn chặn được, nhưng khác kịch bản). | |
| `14_1_010_028` | 2 lô, SL cả hai = 0 ⇒ "nhập SL trả cho từng lô" | Dòng SL 0 bị lọc trước ⇒ chỉ ra "Nhập số lượng trả cho ít nhất 1 sản phẩm"; thông báo theo lô không tới được. | |
| `14_1_030_002` | Cột "Mã PO tham chiếu" trống hiện `--` | Hiện `-` (AppProTable thay giá trị rỗng). | |
| `14_1_040_018` | "Nhập về kho tỉnh ngay" + bỏ trống Kho nhận ⇒ "Vui lòng chọn kho nhận hàng" | Ô Kho nhận tự điền kho mặc định, không xoá được ⇒ bấm Duyệt là duyệt luôn (case đỏ đã duyệt thật 1 phiếu). | |
| `14_1_020_004` | Thông báo `Sản phẩm "<tên>"…` | BE ghi tên kèm biến thể `"AUTO8_SP_BT (Màu: Đỏ)"` — script đã chấp nhận dạng này. | |
| `14_1_050_007` | Tỉnh từ chối phiếu **Chờ duyệt** rồi đóng hộp | Điểm bán thuộc xã ⇒ tỉnh chỉ thao tác được từ "Xã đã duyệt"; script chạy trên phiếu Xã đã duyệt. | |

### 🔴 Nhóm 060 (xuất trả theo PO) + `13_3_030_027/028/057/058` — luồng ĐÃ NGỪNG
- FE `ReturnToSupplierListPage.jsx`: "Luồng xuất trả NCC cũ đã ngừng sử dụng (2026-07-27) — chỉ còn tra cứu"; route `/create` đã gỡ; nút "Xuất trả hàng" ở chi tiết PO bị comment. BE `ReturnToSupplierController` chặn tạo/sửa/hoàn tất.
- ⇒ 24 case tạo phiếu nhóm 060 + 4 case 13_3 ĐỎ ở bước tiền đề (không có lối tạo phiếu; POST trả "Có lỗi xảy ra…"). 060_001/003/004/028 (tra cứu) chạy được nhưng điểm bán/tỉnh seed **0 phiếu** luồng cũ ⇒ đỏ vì thiếu tiền đề, và ô "Nhà cung cấp" của màn rỗng ở cấp điểm bán.
- **Cần user chốt**: bỏ 28 case này, hay viết lại kỳ vọng theo luồng đa cấp `/inventory/stock-return-request` (đã phủ ở 010–050).


### Bổ sung 25/09/2026 — 16 vỏ đã viết script (`bo-sung.{province,shop,tct}`, `serial.{shop,ward}`)
Tiền đề: helper 14_2 (`tra-ghi.js`) + `return-page.nhapHangSerial` (nhập lô `AUTO8_SP_DD` có serial bằng API, vai GDV).
| Case | Kết quả đo | Phân loại |
|---|---|---|
| `010_012` · `010_015` · `010_033` · `010_040` | Quét serial ⇒ "Không có quyền truy cập" (`resolve-serial` 401 với Cửa hàng trưởng — cùng lỗi 010_013) | 🔴 phân quyền |
| `010_026` · `010_027` | Dòng hàng serial không có ô SL — SL tự bằng số serial ⇒ cảnh báo "cần N serial, đang chọn M" không tới được bằng UI | lệch đặc tả |
| `030_017` | Phiếu con do tỉnh tách hiện "SL duyệt" = `--` (dòng sinh mới với approvedQuantity null) ⇒ không đối chiếu được công thức Còn lại | 🔴 hiển thị |
| `030_019` | Trả NCC lần đầu ⇒ mốc đổi thành "Đã nhập kho về tỉnh" dù chưa ai nhập kho (BE tự ghi vế nhập bàn giao — cùng gốc 14_2_060_008) | 🔴 |
| `030_024` | Phiếu con TCT (`isTct=1`, `createFromId` có) vẫn hiện vòng đời 8 mốc của phiếu thường thay vì 4 mốc | 🔴 |
| `030_027` | Bảng "Lịch sử xử lý" có 9 cột (thêm Đã trả / Đã nhập lại / Đã huỷ…) — kịch bản ghi 6 cột | lệch đặc tả |
| `010_042` · `030_016` · `030_020` · `040_003` (HUB trực thuộc tỉnh) · `040_009` · `040_017` | Đạt | |
| `010_035` · `010_036` | Skip — chưa có tồn âm; hàng có nguồn NCC sớm nhất 24/09 nên chưa quá hạn hợp đồng | chờ dữ liệu |
- ⚠️ Probe lỡ tạo phiếu nhập **Nháp** `stockInOutId 1260` ("SP test 1", 6 cái, điểm bán seed) — chưa chốt nên không đổi tồn; vai GDV xoá bị 401, cần CHT/tỉnh xoá.

### Chưa phủ (18 vỏ `chua-chay-duoc.*`) — lý do
- Serial (010_012/015/026/027/033/040, 040_017): điểm bán seed **không có tồn serial** nào (SHOP_STOCK_SERIAL rỗng), cộng lỗi quyền `resolve-serial` ở 010_013. Cần bước seed nhập SP đích danh có serial về điểm bán (PO TCT → nhập kho có serial → chuyển kho xuống điểm bán).
- 010_035 (tồn âm), 010_036 (hợp đồng `maxReturnDays` quá hạn), 010_042 (2 lô giá nhập khác nhau — điểm bán chỉ nhập tay được SP giá tiêu chuẩn, mọi lô cùng giá).
- 030_016/017/019/020/027, 030_024, 040_009: cần phiếu đã tách/gom/trả NCC/gửi TCT — dựng cùng luồng 14_2.
- 040_003: cần điểm bán trực thuộc tỉnh (không qua xã) có tài khoản — làn 8 chưa có.

### ⚠️ Dữ liệu ghi thật không dọn được (làn 8, shop 68152)
Phiếu trả **Đã duyệt** (tỉnh duyệt ⇒ đã trừ tồn giữ chỗ SP `AUTO8_SP_TC`, lô `OB68152-1262181-5-…`): id 7, 8, 9 và các phiếu APPROVED do 010_031/032, 020_008, 020_012, 040_018/019/024/002, 050_003/004 tạo — mỗi phiếu 1–5 cái. Không gỡ được vì lỗi 050_003. Phiếu Nháp #45 / Chờ duyệt #46 của điểm bán làn 5 (68150) để lại làm tiền đề 020_009/010, 040_007/008.

## `14_2_gom_tach_va_xu_ly_hang_tra` — viết 24/09/2026 (làn 8)

Spec: `gom-phieu` · `gom-ghi` · `pham-vi-khac` · `tach-ghi` · `xu-ly-ghi` · `serial` · `tct-dot-tra` (province) · `pham-vi.shop` · `pham-vi.ward` · `tct-ghi.tct`.
Tiền đề (không phải case): `tien-de.province.spec.js` — PO tỉnh TD1 → HUB → chuyển xuống điểm bán; PO TCT (SP TC) → kho TCT → chuyển xuống điểm bán; kho phụ HUB (`AUTO8_HUB_KHO2`). `tien-de-lan-khac.shop.spec.js` (chạy `VNPOST_LANE=5`) — phiếu Đã duyệt của tỉnh AUTO5_T cho 010_010. Sổ seed: `duLieu.traNcc14_2` (kèm `loCoNguon`).

### 🔴 Lỗi phân quyền (case ĐỎ vì 401 "Không có quyền truy cập", assertion giữ nguyên)
Đo AUTHEN.TBL_ROLE_PERMISSION 24/09: **không vai nào** có `STOCK_STOCK_RETURN_REQUEST_RECEIVE_TO_PROVINCE_CREATE` và `…_SUPPLIER_BATCHES_RESOLVE_REJECTION_CREATE`; `…_SUPPLIER_BATCHES_CONFIRM_CREATE` chỉ `CORP_ADMIN`. Vai tỉnh (PROVINCE_MANAGER) có `…_REJECT_CREATE` nhưng màn vẫn báo 401 khi bấm "NCC từ chối".
⇒ Đỏ: 030_001/005–010 · 050_006 · 060_003/005/006/007/010/011/013/014/015/018–022/024. **Cần gán quyền (user chạy SQL, skill `permission-sql`)** rồi chạy lại.

### 🔴 Nghi lỗi sản phẩm
| Case | Tài liệu nói | Sản phẩm làm (đo 24/09/2026) | Quyết định |
|---|---|---|---|
| `060_008/012/013/014/015/016/023` (gốc) | Đợt bị NCC từ chối ⇒ cấp đang giữ hàng thấy cụm nút quyết định | Phiếu tách **tại chỗ** (1 NCC) giữ `org_unit_type = DIEM_BAN` ⇒ `reject_stage = DIEM_BAN` ⇒ không cấp nào thấy nút / gọi được `resolve-rejection` (156 phiếu làn 8 mang DIEM_BAN). Phiếu con tách thật thì đúng `BUU_DIEN_TINH`. Script 060 đã chuyển sang phiếu con tách thật để kiểm giao diện. | |
| `050_001` / `050_005` / `050_011` | Phiếu "Chưa gửi TCT" hàng TCT ⇒ Gửi lên TCT thành công | Hàng TCT có nguồn thật (PO TCT → kho TCT → chuyển khác pod xuống điểm bán) **luôn** bị chặn "Không xác định được đơn vị đã nhập lô hàng từ nhà cung cấp…" — truy vết không đi qua phiếu chuyển khác pod. | |
| `050_007` | Dòng mất truy xuất nguồn gốc ⇒ chặn gửi TCT | Hàng TC tồn đầu kỳ / lô GDV nhập tay (không PO/NCC) lại **gửi được** (BE lấy chính điểm bán làm đơn vị nhập, phiếu TCT sinh tại điểm bán). | |
| `040_023` | Điểm bán không có 3 việc xử lý | Menu của điểm bán vẫn hiện "Trả hàng NCC / Nhập lại kho / Huỷ vỡ hỏng" cho phiếu Chưa trả hàng (`rowActions` không chặn theo vai). | |
| `040_005` | Huỷ vỡ hỏng ⇒ không kho nào tăng tồn | Phiếu tách tại chỗ chuyển `shopId` sang HUB ⇒ lần xử lý đầu ghi vế NHẬP bàn giao phần còn lại vào HUB (`ghiNhapBanGiaoNeuDoiDonVi`) ⇒ tồn HUB tăng phần chưa xử lý. | |
| `040_007` | 10 = trả 7 + huỷ 2 + nhập lại 1 ⇒ "Đã xử lý xong" | Sau bước cuối phiếu vẫn "Xử lý một phần". | |
| `020_010` | TCT tách phiếu "Đã gửi TCT" bằng menu Xử lý › Tách phiếu | Drawer/menu TCT chỉ mở "Tách phiếu" ở APPROVED; TCT đọc phiếu tỉnh khác pod trả 404. | |
| `060_008` / `060_012` / `060_013` | Hàng chưa nhập kho tỉnh ⇒ có nút "Hoàn về điểm bán" | Lần "Trả hàng NCC" đầu tiên BE tự ghi vế NHẬP bàn giao vào HUB (phiếu đổi `shopId` sang đơn vị nợ NCC) ⇒ `provinceImportStockInOutId` có giá trị ⇒ FE coi "đã nhập kho tỉnh", ẩn "Hoàn về điểm bán" (BE cũng chặn) — với mọi phiếu tự doanh, lựa chọn này không bao giờ xuất hiện. | |
| `060_016` / `060_009` | TCT mở chi tiết phiếu tỉnh | Phiếu tỉnh nằm pod tỉnh; TCT đọc theo id trả 404 / không thấy khung đợt. | |
| `060_002` | Phiếu chưa có đợt trả ⇒ khối rỗng "Chưa có đợt trả" | `SupplierBatchSection` trả `null` ⇒ khối ẩn hẳn. | |

### Lệch đặc tả / tiền đề không tới được
| Case | Ghi chú |
|---|---|
| `030_002` | Ô "Kho nhận" tự điền kho mặc định, không có nút xoá ⇒ cảnh báo "Vui lòng chọn kho nhận hàng" không tới được bằng UI (đỏ, giống 14_1_040_018). |
| `030_008` | Phiếu Đã duyệt không còn hàng treo chỉ dựng được bằng SL duyệt 0 — nhưng khi đó BE chặn trước ở "chưa khoá tồn" ⇒ nhánh "không còn hàng treo" không tới được (đỏ). |
| `030_010` | Nhập kho tỉnh chỉ nhận phiếu APPROVED, còn trả/huỷ chỉ mở sau khi tách ⇒ "trả 3, huỷ 2 rồi nhập kho 5" không xảy ra được theo đúng trạng thái. |
| `010_004` | Nhánh FE "Chọn ít nhất 2 phiếu Đã duyệt để gom" không tới được (nút khoá khi < 2) — đã kiểm BE. |
| `020_014` · `050_009` · `040_018` · `010_011` | Skip có lý do: không tạo được phiếu 0 dòng; không có luồng làm mất tham chiếu kho giữ; mọi nhánh tách đều gán NCC; môi trường chỉ 1 chuỗi. |
| `020_017` · `030_004` · `040_013` | Giả lập response (lỗi `/split`; danh sách kho rỗng; `serials` của dòng) để kiểm phần FE — không đổi dữ liệu. |
| `060_024` | Nhãn SETTLED ("Đã xử lý xong") chưa phủ — cần chốt hoá đơn điều chỉnh. |

### Dữ liệu để lại / sự cố tiền đề
- Mọi phiếu 14_2 ghi chú `AUTO TEST 14_2…`, phiếu tổng `RTG-…`; không dọn được (gom/tách/gửi TCT/xử lý là một chiều).
- Bổ sung hàng lượt 2: BE chuyển kho **tự phân bổ FIFO**, lấy 10 cái từ lô cũ `24092638EE` (trùng mã lô đã có ở điểm bán) ⇒ điểm bán nhận hàng SSHOP-500 kể cả qua giao diện (đáng lẽ `ERROR_TRANSFER_BATCH_DUPLICATE`). Đã rút 10 cái đó về kho phụ `AUTO8_KHO2` của điểm bán (phiếu `AUTO142X565171`).

## `14_3_hoa_don_hang_tra_lai` — viết 25/09/2026 (làn 8, POD_02)

Spec: `tiep-nhan` · `doi-soat` · `chot` · `phat-hanh` (province) · `hoa-don-tra.shop` · `phat-hanh.tct`. Helper `tests/hoa-don.js`
(`xmlHd` dựng XML theo khuôn `purchaseOrder/utils/poInvoiceXml.js` — thẻ `*CLQuan`, dấu ở `ProcessInvNote`; `dotRanh`; `nap/goHet`).
Tiền đề: đợt trả `WAIT_CONFIRM` của HUB tỉnh (14_2 sinh — còn ~60 đợt). Hoá đơn nạp thử đều **gỡ lại**; chỉ chốt chứng từ tiêu hao đợt.
Chạy lại: `VNPOST_LANE=8 npx playwright test --config tai-lieu-test/14_3_hoa_don_hang_tra_lai/playwright.config.js`

### 🔴 Nghi lỗi sản phẩm (case ĐỎ, assertion giữ nguyên)
| Case | Tài liệu nói | Sản phẩm làm (đo 25/09/2026) |
|---|---|---|
| `010_004` `010_005` `030_001` | Nạp XML / "Đối soát lại" xong màn hiển thị kết quả đối soát | Drawer đối soát **tự đóng** ngay sau thao tác (khối đợt re-render khi phiếu tải lại ⇒ mất state `reconcileOpen`); thông báo có hiện nhưng phải bấm lại "Xem đối soát". |
| `010_006` `030_006` `030_007` `030_008` | Tệp không rõ tăng/giảm ⇒ "Chưa xác định dấu", kế toán chọn tay | **Nhánh UNKNOWN là code chết**: parser `number()` trả 0 khi thiếu `TgTTTBSo` ⇒ dấu suy ra `KHONG_DOI` ⇒ bị chặn lúc nạp. Hệ quả kèm: hoá đơn Hilo thật **không có ghi chú** xử lý + tổng dương bị đọc thành TĂNG và bị từ chối. |
| (ngoài kịch bản) | Hoá đơn điều chỉnh giảm | Hoá đơn ghi **số âm** (khuôn `adjust` của PO / nhiều NCC) ⇒ đối soát "phiếu trả 1 / hoá đơn -1 — LỆCH 2" — BE không lấy trị tuyệt đối. Chỉ hoá đơn ghi số dương mới khớp. |
| `010_008` | Tệp đúng 10MB được chấp nhận | FE cho qua, **nginx trả 413** ⇒ người dùng thấy "Đọc XML thất bại". Giới hạn body của gateway/nginx < 10MB. |
| `020_006` | Dòng "Chưa ghép được" hiện "--" ở SL/Tiền phiếu trả | Dòng sai ĐVT vẫn được ghép cặp (`bestMatch`) ⇒ hiện "1" / "50.000" dù Kết quả = "Chưa ghép được". |
| `020_011` | Dòng Tổng cộng cộng cả SL hoá đơn / SL phiếu trả | Chỉ cộng tiền + mức lệch; ô "Tổng cộng" chiếm 5 cột, không có tổng SL. |
| `020_012` | Mỗi dòng có thẻ nguồn thuế suất | Thuế suất lấy từ XML ⇒ `vatRateSource = null` ⇒ không thẻ nào. |
| `020_013` | "Người chốt chứng từ" = tên + thời điểm | Hiện `-- — 25/09/2026 09:03`: DTO chi tiết **không có `settledByName`**. |
| `020_020` `020_021` `020_022` | Bảng "Bút toán ghi giảm công nợ" hiện sau khi chốt | DTO chi tiết **không có `accountingEntry`** ⇒ bảng không bao giờ hiện. DB: bút toán CÓ ghi đúng (ngày hạch toán 01/09 = ngày hoá đơn; Nợ 331 = 49.993 theo hoá đơn, không theo đợt 50.000; Có 156 / Có 1331 tách 2 dòng) nhưng 2 dòng 156/1331 **không gắn đối tượng NCC** (`partner_*` rỗng) — 020_021 vẫn sai kể cả khi hiện. |
| `010_021` | Điểm bán không thấy nút thao tác hoá đơn | Điểm bán mở phiếu con (đã về HUB) thấy **"Tiếp nhận hoá đơn NCC"** — `CreditNoteBatchBlock` không kiểm vai. |
| `010_002` `040_019` | NCC khai VNPost lập ⇒ khối "VNPost phát hành" + nút "Phát hành hoá đơn" | BE **không trả `returnInvoiceIssuer`** trong chi tiết phiếu trả (không có trong DTO) ⇒ FE luôn mặc định `SUPPLIER` ⇒ nhánh B không bao giờ hiện. Kèm: không NCC nào có `return_invoice_issuer = VNPOST`, FE không có ô sửa. |
| `040_004` (kèm 017/018) | Dòng diễn giải sửa được, in lên hoá đơn | FE gửi `note` trong body `POST /issue` nhưng controller chỉ nhận `batchId` ⇒ **nội dung sửa bị bỏ**, BE luôn dùng `draft.note`. FE không chặn diễn giải rỗng / toàn khoảng trắng. |
| `040_020` | Người bán = đơn vị TCT kèm MST | Bản nháp đợt cấp TCT: Người bán **"Kho tổng — MST null"** ⇒ phát hành sẽ ra hoá đơn thiếu MST người bán. |

### Lệch câu chữ kịch bản (mã lỗi ĐÚNG, BE dùng câu riêng từng chỗ) — cần user chốt sửa kịch bản hay sửa BE
| Case | Kịch bản (chuỗi mặc định enum) | BE trả |
|---|---|---|
| `010_017` | "Đợt trả không ở trạng thái chờ xác nhận" | RTN-CN-006 "Đợt trả đã bị từ chối/huỷ, không nhận hoá đơn điều chỉnh" |
| `020_016` `030_012` `030_015` | "Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác" | RTN-CN-002 "Hoá đơn đã chốt chứng từ, không thể thay đổi" |
| `030_005` | như trên | RTN-CN-002 "Hoá đơn đã chốt chứng từ, không đối soát lại" |
| `040_010` | như trên | RTN-CN-002 "Đợt trả đã có hoá đơn đã chốt, không phát hành thêm" |
| `020_018` | "Hoá đơn chưa gắn với đợt trả nào" | Nhánh không tới được: hoá đơn rời đợt duy nhất là hoá đơn đã gỡ (xoá mềm) ⇒ SSHOP-404 "Không tìm thấy hoá đơn điều chỉnh". |

### Chưa chạy — lý do
| Case | Lý do |
|---|---|
| `040_005` `040_011` `040_012` `040_015` (+ vế BE của `040_017` `040_018`) | Phát hành thật đẩy hoá đơn ra invoice-service → nhà cung cấp HĐĐT, **không thu hồi được**. Cần user cho phép + khai NCC VNPost lập (SQL dưới) + sửa BE trả `returnInvoiceIssuer`. |
| `040_009` | Mọi đợt suy được thuế suất (0%, bảng giá NCC) — gọi `/issue` lúc đó là phát hành thật. |
| `020_007` `030_022` | SP trên đợt chỉ có 1 ĐVT; code đối soát cũng không quy đổi ĐVT khác tên (chỉ nhận ĐVT hoá đơn trùng tên ĐVT dòng phiếu) ⇒ cần user chốt lại kỳ vọng. |
| `030_003` `030_004` `040_014` | Tiền đề không tới được (hoá đơn không dòng bị chặn lúc nạp; phiếu xuất trả luôn có dòng). |
| `010_018` | Nguồn MAIL chỉ sinh từ job IMAP — làn test không có hòm thư. |
| `040_017` `040_018` | Kỳ vọng chưa chốt — đã ghi hành vi FE (không chặn, gửi `note` rỗng / 5 dấu cách). |

SQL khai NCC tỉnh làn 8 là "VNPost lập hoá đơn" (user tự chạy khi muốn phủ nhánh B — **chưa đủ**, BE còn phải trả `returnInvoiceIssuer`):
```sql
UPDATE VNPOST_CORE.CHAIN_SUPPLIER SET return_invoice_issuer = 'VNPOST' WHERE supplier_id = 137; -- AUTO8_NCC_55976508 (NCC TCT phụ, không dùng ở 13_3/14_2)
```

### ⚠️ Dữ liệu một chiều đã sinh (dev)
- 10 hoá đơn điều chỉnh đã **chốt chứng từ** ở HUB 68154 (id 57–66 + 1 của lượt 09:1x) ⇒ 10 bút toán `RETURN_CREDIT_NOTE` + ghi giảm công nợ NCC `AUTO8_NCC_TINH`, 10 đợt sang `SETTLED`. 9 bản là do lỗi script (biến module mất khi worker khởi động lại) — đã sửa, lượt sau mỗi lượt chỉ chốt 1 (020_013). Không gỡ được.

## `26_phieu_thu` — đo lại 25/09/2026 (làn 8, sau khi sửa tên GDV lấy từ sổ seed)
`danh-sach-phieu.{shop,gdv}`: **27 đạt · 3 đỏ**. Đổi: tên nhân viên GDV lấy từ `duLieu.taiKhoanLan.gdv.maNhanVien` (`tenGdv()` trong
`26_phieu_thu/tests/receipt-page.js`), 🚫 ghép cứng `AUTO<làn>_GDV`.
| Case | Tài liệu nói | Sản phẩm làm |
|---|---|---|
| `26_050_002` | Tìm danh mục bỏ qua dấu tiếng Việt | Gõ "thu no" ⇒ danh sách rỗng, không ra "Thu hồi công nợ khách hàng". |
| `26_080_006` | Chọn Chuyển khoản mà chưa chọn tài khoản nhận ⇒ chặn | FE vẫn gửi lệnh lập phiếu (bị auto test chặn ở tầng mạng). |
| `26_070_003` | Đơn vị ngang hàng không xem được phiếu của nhau | Lời gọi API kiểm phạm vi trả body không có `status` (Received "undefined") — cần xem lại tiền đề đơn vị ngang hàng của làn 8. |

## `14_2` — chạy lại 25/09/2026 sau khi quyền đã gán (làn 8)
- Quyền `receive-to-province` / `supplier-batches/confirm|reject|resolve-rejection` **đã gán** cho PROVINCE_MANAGER · PROVINCE_ACCOUNTANT ·
  PROVINCE_SUPPLY_CHAIN · CORP_ACCOUNTANT · CORP_ADMIN (🔴 `TBL_ROLE_PERMISSION` nối theo `permission_code`, cột `permission_id` rỗng —
  join theo id sẽ ra "0 vai" sai). Lượt đủ: **71 đạt · 35 đỏ · 3 skip**, hết case 401.
- 🔴 **16 case chặn vì điểm bán hết hàng TD1** (`040_010/011/013/016/017/019–022/024`, `060_012/013/016/017` …). Bổ sung tiền đề lượt 4
  (`VNPOST_TIEN_DE_LUOT=4 VNPOST_TIEN_DE_SL=300`) tạo được PO `PO2609258906` về HUB nhưng **điểm bán nhận phiếu chuyển HUB → điểm bán
  trả SSHOP-500** "Có lỗi xảy ra…" (cả lần nhận thường lẫn `isMerge: true`); chạy lại với `VNPOST_TIEN_DE_HUY_TREO=1` (từ chối + tạo phiếu mới
  `AUTO1423870450`, stock_transfer_id 91, 300 cái) vẫn 500 ở bước nhận. Cần xem log pod-service lúc `PUT /stock/v2/transfer/v2/91/confirm`
  (25/09 ~12:24 +7). Phiếu 91 đang **IN_TRANSIT, giữ chỗ 300 cái ở HUB 68154**.
- Đỏ còn lại (sau khi bỏ 16 case trên và chạy lại nhóm lỗi môi trường): như mục 14_2 cũ + mới lộ ra khi hết 401 —
  `030_002` (Kho nhận tự điền, không bỏ trống được) · `030_008` (nhánh "không còn hàng treo" bị nhánh "chưa khoá tồn" che) ·
  `030_010` (nhập kho tỉnh phần còn treo sau khi đã trả/huỷ một phần bị chặn) · `040_005`/`060_014` (huỷ vỡ hỏng làm TĂNG tồn) ·
  `060_015` (tồn kho tỉnh không tăng đúng) · `060_024` ("Hoàn về điểm bán" bị chặn vì đã nhập kho tỉnh) · `060_002/008/010/011` ·
  `050_001/005/006` (gửi TCT chặn truy vết — đã ghi) · `040_023` · `020_003/010`, `060_009` (TCT đọc phiếu tỉnh khác pod 404 — đã ghi).

## `17_quan_ly_quay_thu_ngan` — viết 25/09/2026 (làn 8, điểm bán seed `AUTO8_SHOP` 68152)

Spec mới: `quay-ghi.shop` (thêm/sửa/ngừng/kích hoạt quầy + validate + API lỗi) · `quy-ghi.shop` (cấp quỹ,
chuyển quỹ) · `quay-pham-vi.province` (010_002) · `quay-pham-vi.tct` (010_016, 050_003) · `quay-pham-vi.gdv` (PQ_001).
Quầy test mang mã `A8Q…`, bị NGỪNG ở `afterEach` (🚫 không xoá cứng được) ⇒ điểm bán seed tích luỹ quầy ngừng.

### 🔴 Lỗi sản phẩm (giữ assertion, case đỏ)

| Case | Hành vi thật | Kỳ vọng |
|---|---|---|
| 17_010_013 | Tạo quầy trùng MÃ với quầy **đã ngừng** ⇒ `SSHOP-500` "Có lỗi xảy ra…". Nguyên nhân: `SHOP_CASHIER_COUNTER` có `UNIQUE uk_counter_shop_code (shop_id, code)` **không tính `active`**, trong khi service chỉ chặn trùng với quầy đang hoạt động | Cho tạo (HDSD: "không trùng với quầy ĐANG hoạt động"). Sửa: bỏ/đổi unique hoặc bắt `DataIntegrityViolation` trả COUNTER-001 |
| 17_030_003 | Quầy Q01 đang có ca **#45 OPEN** (`SHOP_SHIFT_REPORT`, POD_02) — `DELETE /cashier-counter/delete` vẫn "Thành công", quầy + quỹ bị khoá (test đã kích hoạt lại). `COUNTER_HAS_OPEN_SHIFT` chỉ được ném ở **mở ca**, `CashierCounterServiceImpl.delete` không kiểm | Chặn "Quầy đang có ca chưa chốt, vui lòng chốt ca trước" (COUNTER-003) |
| 17_040_003 | Quầy đã ngừng ⇒ quỹ biến khỏi màn (đúng), nhưng `POST /fund/add-history` vào quỹ đã khoá vẫn "Thành công", số dư tăng | Sổ quỹ đã khoá không nhận cấp tiền |
| 17_050_002 / 050_013 | Chuyển 200.000 từ quỹ còn 100.000 ⇒ "Thêm thành công", quỹ nguồn **−100.000** | Chặn chuyển quá số dư (🔴 quỹ tiền mặt âm) |
| 17_050_003 | 🔴 Ô chọn quỹ chỉ liệt kê quỹ của điểm bán đã chọn (đúng). Nhưng gọi thẳng `POST /fund/transfer` với `shopId` A, quỹ nguồn A, quỹ đích của **điểm bán khác** ⇒ "Thành công", **quỹ nguồn bị trừ 1.000đ mà quỹ đích không nhận** — tiền biến mất | Chặn chuyển chéo điểm bán, báo lỗi |
| 17_PQ_001 | GDV (`auto8_gdv`) thấy nút "Thêm quầy" (nút là `Button` thường, không phải `PermissionButton`) và `POST /cashier-counter/create` trả 200 | Không có nút hoặc API chặn quyền (create_fund). Cần user xác nhận GDV có được khai quầy không |

### Lệch đặc tả / câu chữ (chờ user chốt)

| Case | Thực tế | Kịch bản |
|---|---|---|
| 17_010_008 | Toàn khoảng trắng: FE KHÔNG báo lỗi ở ô (rule `required` thiếu `whitespace: true`), request vẫn gửi, BE chặn bằng toast "Tên quầy không được để trống". Không tạo quầy rỗng | Báo lỗi bắt buộc ở CẢ HAI ô |
| 17_010_022 | `POST /cashier-counter/create` bỏ `shopId` trong body vẫn "Thành công" (BE lấy shopId từ header gateway) | "Thiếu shopId" |
| 17_050_007 | Ô Loại quỹ có "Tiền mặt" · **"Ngân hàng"**; chọn "Ngân hàng" thì ô ngân hàng hiện đúng | Nhãn "Chuyển khoản" |

### Chưa chạy được
- 17_030_008 — không dựng được quầy thiếu quỹ tiền mặt (tạo/kích hoạt quầy luôn tự tạo/mở quỹ, không API xoá quỹ). Cần dữ liệu cũ hoặc SQL chuẩn bị do user chạy.

### ⚠️ Dữ liệu để lại
- ~70 quầy `A8Q…` đã ngừng + quỹ đã khoá ở 68152; 1 quỹ chung `A8Q Quỹ chung điểm bán` (không xoá được).
- Quỹ nguồn của 050_003 bị trừ 2.000đ (2 lượt) do lỗi chuyển chéo — không hoàn được qua API.

## `18_1_ban_hang_tai_quay` — viết 25/09/2026 (làn 8, GDV `auto8_gdv`, điểm bán seed 68152)

Tiền đề: GDV có ca #45 (24/09) chưa chốt ⇒ mở ca hôm nay bị `SHIFT-006`. Helper `tests/pos-18.js › bamCa` tự **chốt ca cũ**
(tạm chốt 0 tờ + lý do chênh lệch) rồi mở ca hôm nay (#48). Spec: `tab-khach` · `tim-them` · `quet-ma` · `dong-hang` ·
`can-dien-tu` (cân giả lập qua `window.serialBridge`) · `phim-tat` · `chon-lo` · `thanh-toan` (gdv) · `chan-ban-hang` (shop).
119/131 có script; 12 chặn có lý do (`chua-chay-duoc.gdv.spec.js` + skip trong thân).

### 🔴 Lỗi sản phẩm / lệch kỳ vọng (giữ assertion)
| Case | Thực tế | Kịch bản |
|---|---|---|
| 010_017 | Khối khách chỉ hiện tên + "Tiền phát sinh / Tiền còn nợ" | hiện tên, SĐT, hạng khách |
| 020_005 | Đổi tiêu chí Tên→SKU giữ nguyên từ khoá "AUTO" | xoá trắng ô + gợi ý |
| 020_021 | SP ngoài bảng giá (TD2) VẪN vào giỏ, chỉ cảnh báo hết hàng; chặn dời tới lúc thanh toán ("Đơn hàng có sản phẩm chưa nằm trong bảng giá…") | chặn ngay khi thêm |
| 020_023 | Combo (type 10) thêm cho khách lẻ không cảnh báo — `isProductService` chỉ coi combo là dịch vụ khi BUSINESS ≠ SHOP | "Không thể bán combo liệu trình cho khách lẻ" |
| 020_025 | Giỏ trống mà nút "Thanh toán" vẫn bật | chỉ sáng khi giỏ có hàng |
| 020_026 | F6 đổi tiêu chí Barcode nhưng con trỏ KHÔNG vào ô tìm (F3/F4 đúng) | con trỏ vào ô |
| 020_019 | Chặn thật ở `draft-checkout` (SSHOP-500 "Tồn khả dụng không đủ … có 84, cần 130") — ĐẠT, nhưng chỉ toast, không có "bảng liệt kê mặt hàng thiếu" | bảng liệt kê |
| 030_008 | Quét mã hàng NGỪNG kinh doanh ("Cốc 20", 0030926501) — không thông báo, không thêm | "Sản phẩm '<tên>' đã bị ngừng kinh doanh…" |
| 030_013 | `999*mã` với TC tồn ~470: chỉ cảnh báo vượt tồn, số lượng KHÔNG tăng (giữ 1) | 999 được chấp nhận |
| 030_016 | Tem cân 12 số (thiếu checksum) vẫn nhận (`acceptMissingChecksum: true`) | "Barcode hàng cân thiếu checksum" |
| 040_003 | Hàng còn tồn nhưng không còn lô (FIFO): công tắc "Chọn theo lô" bị ẨN hẳn | "Không có lô nào" |
| 040_006 | Gõ SL lô 5 khi SL bán 2 ⇒ ô tự kẹp về 2, không thông báo | "Tổng số lượng lô lớn hơn…" |
| 040_008 | Bỏ trống SL ⇒ tự thành 0.01, phân bổ 0.01/0.01 | tự phân bổ toàn bộ tồn, "Đã chọn tất cả lô" |
| 040_011 | Ô "Giảm giá (%)" luôn bị khoá (kể cả khi bỏ CTKM đơn) | nhận 0–100 |
| 050_003/004 | Modal "Chọn sản phẩm" hiện giá dạng chữ, không có ô sửa giá; bảng hàng giá cũng readOnly | sửa được giá bán |
| 050_007 | Bấm "Chiết khấu đơn hàng" không mở ô nhập chiết khấu | nhập CK, đổi VNĐ/% |
| 060_013 | 🔴 Màn thanh toán mở mà số cân vẫn ghi vào dòng (1 → 3) | ngừng nhận số cân |
| 060_024 | Cân SP1 1,1 → thêm SP2 → cân 2,3: SP1 thành 1,11 | mỗi dòng đúng khối lượng |
| 070_003 | F8 với khách lẻ: "Thanh toán sau hoặc một phần không thể áp dụng cho khách vãng lai" (đúng); có khách: xem annotation | tạo đơn thanh toán sau |

### Chưa chạy được
- ~~Thanh toán kẹt ở SDK~~ — ĐÃ GIẢI QUYẾT 25/09 tối: nút xác nhận nằm trong iframe khác origin `vnpostpayment-dev.postpay.vn/confirm-cash` (helper `pos-18.js › thanhToanTienMat`). 010_012/013, 020_003 chạy ĐẠT. 040_017 còn chặn: chưa xác định màn nhật ký "Thay đổi lô khi bán hàng".
- Cân: 060_001/002/004/005/022 — luồng kết nối không đi qua `window.serialBridge.connect` (chỉ `onData`), F9 báo "Chưa chọn cổng cân" ⇒ cần cân thật/Electron.
- Dữ liệu: dịch vụ type 1 không hiện ở ô tìm (020_022/024) · không SP tồn âm (030_004, 060_008, 060_020) · SP nhiều ĐVT không có mã vạch (030_006/010) · mã vạch trùng không bán ở điểm bán (030_009) · không lô xả kho (040_016) · không CTKM quà (050_011, 060_014) · chưa có serial DD ở điểm bán (040_015) · 030_011 phần cứng.

### ⚠️ Dữ liệu để lại
- Ca #45 của GDV đã CHỐT (lý do "Auto test…"), ca #48 hôm nay đang mở. Nhiều đơn NHÁP + draft-checkout (orderId 187–2xx) ở 68152; khách `A8KH…` mới trong chuỗi.

## `19_quan_ly_khach_hang` — viết bổ sung 25/09/2026 (LÀN 7, phiên "Script auto test khách hàng")

Lượt đủ làn 7 (25/09 ~16:10): **40 đạt · 20 đỏ · 14 skip**. Đỏ đều là lỗi sản phẩm / lệch đặc tả dưới đây (🚫 không đỏ vì môi trường).
Đối chiếu DB `VNPOST_CORE.CHAIN_CUSTOMER` (mã `A7KH19…`): mọi khách rác đã `status=0` sau lượt (dọn bằng `-g "don rac 19"`).

### 🔴 Lỗi sản phẩm
| Case | Đo được | Kỳ vọng |
|---|---|---|
| 050_003 | 🔴 Khách **còn nợ 195.000đ** (đơn thanh toán sau) XOÁ ĐƯỢC: `DELETE /chain-customer/delete/{id}` → 200, "Xoá khách hàng thành công", `CHAIN_CUSTOMER.status` → 0 | "Vui lòng cập nhật công nợ khách hàng trước khi xóa!", không xoá |
| 020_003 | 🔴 Thêm khách trùng SĐT cùng điểm bán ⇒ "Thêm khách hàng thành công". DB: `304834777444750` và `794507422680553` cùng `84924140694`, cùng shop 68151. BE không trả `LABEL_PHONE_EXISTED` | báo lỗi, không lưu |
| 030_002 | Sửa khách A sang SĐT của khách B ⇒ "Cập nhật thành công" nhưng SĐT A **không đổi** (im lặng bỏ qua) | báo lỗi trùng, không lưu |
| 100_001 | 🔴 Nhập Excel: dòng **thiếu Tên** (cột bắt buộc *) VẪN tạo khách `customer_name = NULL`; job báo `SUCCESS` với total 3 · ok 3 · failed 1 cho tệp **4 dòng** (số tự mâu thuẫn) ⇒ FE báo "Nhập file Excel thành công", drawer đóng | 4 / 2 / 2, "Import hoàn tất, có dữ liệu lỗi" |
| (theo 100_001) | 🔴 Có khách tên NULL là `GET /chain-customers/get-all-by-chain?keyword=…` trả **SSHOP-500** cho mọi từ khoá khớp khách đó (xoá 2 khách NULL xong thì hết) — một dòng Excel lỗi làm hỏng tìm khách cấp chuỗi | không lỗi |
| 100_002 | Lần nhập có dòng lỗi nhưng lịch sử "Thành công" ⇒ nút "Tải file lỗi" **khoá** (FE chỉ bật khi FAILED) | tải được file lỗi |
| (dọn dữ liệu) | Xoá khách **tạo ở cấp chuỗi** bằng phiên điểm bán (`DELETE /chain-customer/delete/{id}`) → 200 "Thành công" nhưng khách vẫn `status=1` | xoá thật hoặc báo không có quyền |
| 020_012 | Tên có khoảng trắng đầu/cuối lưu nguyên `"   A7KH… "` (FE/BE không trim) | trim |

### 🔴 Thiếu quyền (FE hiện nút, BE 401) — tra `AUTHEN.TBL_ROLE_PERMISSION` theo `permission_code`
| Case | Vai | Quyền thiếu | Đang gán cho |
|---|---|---|---|
| 090_001 | CHT (`auto7_cht`) — nút "Thanh toán" tab Công nợ ⇒ `POST /shops/{id}/customer/create-debt` SSHOP-401 | `CREATE_CUSTOMER_DEBT` | CORP_ADMIN, CORP_SUPPLY_CHAIN, PROVINCE_ACCOUNTANT, PROVINCE_MANAGER, TEST_ROLE |
| 100_001/002 | CHT — nút "Nhập Excel" ⇒ `POST /import/api/v1/customer/excel` SSHOP-401 (script chuyển sang vai TCT) | `IMPORT_CUSTOMER_EXCEL_CREATE` · `…_STATUS_GET` · `…_HISTORY_GET` · `CHAIN_CUSTOMER_DOWNLOAD_IMPORT_ERROR` | chỉ CORP_ADMIN |
| 050_004 | Quản lý tỉnh (`auto7_qlt`) không có nút "Xóa" (API xoá SSHOP-401); HDSD task 050 cho cấp tỉnh xoá | `delete_customer` | — |
⇒ 060_002 (đơn trả một phần) skip vì 090_001 không thu được. Sau khi user gán quyền: chạy lại tiền đề + `-g "19_090_001|19_060_002"`.

### Lệch đặc tả / FE
| Case | Đo được | Kỳ vọng |
|---|---|---|
| 090_002 · 090_003 · 090_005 | Tab Công nợ chỉ có nút "Thanh toán" — **"Ghi nợ" / "Gạch nợ" bị comment** (`customerDebt/CustomerDebt.jsx:325-339`) | có nút |
| 090_006 | Thanh toán số tiền 0 ⇒ "Số tiền phải lớn hơn 0" (câu "Vui lòng nhập số tiền thanh toán lớn hơn 0" là của GẠCH NỢ) | chốt câu nào đúng |
| 120_006 | Ảnh ~1,05MB: không báo gì, mở hộp "Chỉnh sửa ảnh" — giới hạn thật là **2MB** ("Dung lượng tối đa 2MB!"), câu "800Kb" chỉ có ở ô ảnh của drawer công nợ | 800Kb |
| 120_007 | Tệp `.txt` vào ô ảnh đại diện: KHÔNG thông báo, vẫn mở hộp cắt ảnh (`antd-img-crop` nuốt `beforeUpload`) | "Bạn chỉ có thể tải lên file có định dạng image!" |
| 080_002 | Tab Sản phẩm đã mua không có cột "Loại" (cột: Ngày mua · Mã đơn hàng · Tên sản phẩm · Đơn vị · Số lượng · Thành tiền) | có cột Loại |
| 020_006 / 030_003 (vai gdv) · 050_005 | GDV không có nút Thêm / Sửa (không `create_customer`/`update_customer`) nhưng **có** nút "Ngừng hoạt động" (nút không kiểm quyền — `CustomerInfoTab.jsx:450-525`). Bản vai shop của 020_006/030_003 đạt | chốt quyền GDV |

### Chưa chạy (chờ user)
- `130_001`–`130_008` (nhóm đối tượng + nâng hạng realtime): tạo nhóm đối tượng có điều kiện là áp **toàn chuỗi** (gán cả khách thật vào nhóm, kéo theo CTKM/giá theo nhóm) và nâng hạng không hạ lại được ⇒ cần user cho phép + chỉ cách khoanh phạm vi nhóm.
- `070_002` skip: khách tiền đề không có biến động điểm (tích điểm chưa cấu hình cho chuỗi/làn?).

## `18_2_khach_hang_va_uu_dai` — viết 25/09/2026 (làn 8, GDV)

Spec mới: `hddt-form` (040) · `khach-pos` (010) · `coupon-pos` (030) · `diem-pos` (điểm) · `thanh-toan-kh` (đơn đã thanh toán).
Helper dùng chung `18_1/tests/pos-18.js`. 70+/115 có script thật; còn lại chặn có lý do trong `chua-chay-duoc.gdv.spec.js`.

### 🔴 Lỗi sản phẩm / lệch kỳ vọng
| Case | Thực tế | Kịch bản |
|---|---|---|
| 010_007 | Sửa khách từ gợi ý (bút chì) ⇒ `SSHOP-401 Không có quyền truy cập` với GDV | sửa được, đơn giữ khách |
| 040_001 | Liên kết "Thông tin xuất HĐ" bị nhãn form-item ĐÈ — bấm chuột thật không tới (Playwright: "intercepts pointer events") | bấm mở màn |
| 040_003 | "CMND/CCCD" là trường BẮT BUỘC với Cá nhân | không bắt buộc |
| 040_006 | Gắn khách rồi mở form: Họ tên người mua KHÔNG điền sẵn | điền sẵn theo hồ sơ |
| 040_013 | MST 9 số và 11 số vẫn nhận (chỉ chặn chữ) | chỉ đúng 10 chữ số |
| 040_016 | "Tên đơn vị", "Địa chỉ đơn vị" toàn khoảng trắng KHÔNG bị chặn (không trim) | coi như rỗng |
| 040_017 | "Xoá thông tin" đóng luôn drawer (form được xoá — đạt vế "trắng") | chỉ làm trắng form |
| 040_021 | 🔴 Tích "Xuất hoá đơn điện tử" + nhập đủ thông tin + thanh toán ⇒ đơn `enableInvoice=false`, `invoiceStatus=null` (email người mua CÓ lưu) | đơn chờ phát hành HĐ |
| 050_004 | Đơn 100.000đ của khách mới ⇒ điểm 0. ⚠️ KHÔNG phải lỗi tích điểm: chương trình tích điểm #14 (chuỗi 626) có `CAMPAIGN_SCOPE` chỉ gồm các Bưu điện tỉnh thật, KHÔNG có `AUTO8_T` ⇒ điểm bán seed nằm ngoài phạm vi (phiên làn 7 đối chiếu `CHAIN_CUSTOMER_LOYALTY_HISTORY`, 25/09). Đỏ vì THIẾU TIỀN ĐỀ — cần thêm `AUTO8_T`/điểm bán seed vào phạm vi #14 rồi chạy lại | điểm tăng theo quy tắc |
| 050_007 | Modal thanh toán không có tuỳ chọn đổi điểm và KHÔNG nêu "không có chương trình đổi điểm" | nêu rõ lý do |

Đạt đáng chú ý: tooltip điểm hiện "Hạng thành viên · Điểm khả dụng 81 · Giá trị quy đổi 8.100 đ"; coupon: không tồn tại / hết hạn chặn đúng nguyên văn, rỗng & khoảng trắng không gọi API, mã chữ thường xử lý như chữ hoa; tìm khách: một phần SĐT, không dấu đều ra.

### Chưa chạy được
- Coupon hợp lệ: KHÔNG có đợt coupon áp cho điểm bán seed (đợt 78 phạm vi TCT trả "Cửa hàng không thuộc phạm vi áp dụng…") ⇒ 030_002–005/008–010/014–017 chờ seed 1 đợt coupon cho AUTO8.
- Đổi điểm: chuỗi chưa có chương trình đổi điểm ⇒ 050_001/003/005/008–012.
- 010_012 (CTKM theo nhóm khách) · 010_013 (chưa probe màn chi tiết đơn — làm cùng 18_4) · 010_014 (không thấy lựa chọn giao hàng trên màn bán hàng) · 040_020 (nội dung biên lai in qua window.print) · 040_022 (tắt HĐĐT điểm bán = sửa cấu hình dùng chung).

### `19_130_*` — nhóm đối tượng + "nâng hạng realtime" (làn 7, 25/09 ~16:50, user cho phép chạy)
🔴 **Đặc tả vs code:** trên `develop` KHÔNG có "hạng" lưu vào khách — hạng (`LOYALTY.RANKING`, theo điểm) chỉ đếm
(`RankingService.queryRanking`), `CustomerLoyaltyRes` bỏ rankName, `customerRank/CustomerRank.jsx:34` TODO "Chưa phân hạng".
"Nâng hạng" được đo bằng việc khách VÀO NHÓM ĐỐI TƯỢNG điều kiện (Kafka `customer-loyalty-sync` → loyalty đánh giá).
Bước chốt realtime (`commitRealtimeGroups`, bảng `CUSTOMER_GROUP_REALTIME_UNLOCK_LOG`) chỉ có ở nhánh `feature/campaign-realtime`.
Cách khoanh: mỗi case một nhóm rác "Tổng tiền hàng đã mua ∈ (a, b] & Số lần mua hàng = 1" + khách rác mới; nhóm/CTKM xoá-dừng sau case
(DB: `LOYALTY.CUSTOMER_GROUP` 194–207 `is_active=0`; `LOYALTY_CAMPAIGN` 688/689 `active=0`). ⚠️ 1–3 khách THẬT từng khớp điều kiện
nhóm trong lúc nhóm tồn tại (vài phút) — không CTKM nào gắn các nhóm đó ngoài 130_002 (phạm vi chỉ điểm bán làn 7).

| Case | Kết quả | Ghi chú |
|---|---|---|
| 130_001 | 🟡 đỏ câu chữ | Tạo nhóm qua UI đạt (vai TCT); toast "**Thêm** nhóm đối tượng thành công" ≠ kịch bản "Tạo…". 🔴 Quyền `customer-group/create` chỉ CORP_ADMIN · CORP_FINANCE · TEST_ROLE — kịch bản ghi vai shop, CHT không có nút |
| 130_002 | ✅ đạt | CTKM ORDER −10% gắn nhóm, `applyRealtime`: giỏ 100k checkbox khoá (giảm 5.000 của CTKM khác), thêm lên 300k ⇒ CTKM tự tick, giảm 35.000 ngay trên đơn |
| 130_003 | ✅ đạt | Tiền mặt (SDK confirm-cash) ⇒ vào nhóm ngay lần kiểm đầu (≤ 5s) |
| 130_004 | 🔴 đỏ | Đơn **Thanh toán sau** (chưa trả đồng nào) ⇒ khách VÀO nhóm sau 5s — tổng tiền đã mua tính cả đơn nợ | kỳ vọng: chỉ vào khi trả nợ |
| 130_005 | ✅ đạt | Đơn nháp (F7) ⇒ không vào nhóm sau 90s |
| 130_006 | ghi hành vi | Trả góp 50% ⇒ vào nhóm ngay (tính theo TỔNG đơn, không theo phần đã trả) — cần user chốt kỳ vọng |
| 130_007 | ⏭ skip môi trường | Chuyển khoản: "Bạn không có bất kì tài khoản thanh toán nào…" — điểm bán làn 7 chưa khai tài khoản nhận |
| 130_008 | ⏭ skip môi trường | Quét QR: sinh được mã VietQR (tài khoản VNPOST) nhưng cần chuyển khoản THẬT để webhook xác nhận |

## `18_3_thanh_toan_va_bien_lai` — viết 25/09/2026 (làn 8, GDV)

Spec: `thanh-toan.gdv` (modal thanh toán, tiền mặt/trả góp/thanh toán sau/đa phương thức/QR, API) · `chan-ward.ward`.
33/54 có script; 21 chặn có lý do (`chua-chay-duoc.gdv.spec.js`). Hoàn tất tiền mặt qua iframe SDK (`pos-18.js › thanhToanTienMat`); "Thanh toán sau" không qua SDK.

### 🔴 Lỗi sản phẩm / lệch kỳ vọng
| Case | Thực tế | Kịch bản |
|---|---|---|
| 010_004 / 030_002 | Modal chỉ có 4 phương thức: Tiền mặt · Chuyển khoản · Quét QR · Đa phương thức — KHÔNG có "Thẻ VISA", "Thanh toán bằng điểm" | 6 phương thức |
| 020_003 / 020_005 | Khách đưa THIẾU (10.000) hoặc 0 ⇒ không chặn phía FE, vẫn gọi `draft-checkout` (tạo đơn) | chặn, không tạo đơn |
| 020_004 | Xoá trắng ô khách đưa ⇒ không có "Cần nhập số tiền thanh toán" | message.warning nguyên văn |
| 020_007 | Ô khách đưa nhận chữ ("abc0") | chỉ nhận số |
| 060_002 / 060_003 | Đa phương thức: luôn báo "Vui lòng chọn tài khoản nhận QR" trước (VietQR mặc định gánh toàn bộ số tiền) — không tới được kiểm "Tổng các phương thức…" / "Vui lòng nhập ít nhất một…" | các thông báo tương ứng |
| 070_003 | Trả góp bỏ trống số tiền ⇒ "Cần nhập số tiền thanh toán" | "Nhập số tiền trả góp" |
| 070_004 | Trả góp = đúng số phải thu ⇒ không thông báo | "Số tiền trả một phần phải nhỏ hơn…" |
| 070_001 / 090_001 | 🔴 Trả góp 30.000/95.000 và Thanh toán sau 95.000 cho khách mới — đơn tạo được (vd #246) nhưng khối khách "Tiền còn nợ" vẫn 0 đ | nợ tăng đúng phần còn lại / toàn bộ |
| 080_001 | Không có nút "Đặt hàng trước" (chỉ phím F7 lưu nháp) | nút Đặt hàng trước |
| 090_004 | 🔴 Gửi lại `draft-checkout` cho đơn ĐÃ thanh toán ⇒ "Thành công" | "Chỉ có thể thanh toán các đơn nháp" |
| 100_001 | 🔴 Vai xã mở `/order/create-order` ⇒ trang VỠ "Đã xảy ra lỗi Maximum update depth exceeded…" (không có thông báo chặn) | chặn có thông báo |

Đạt: đơn trống ⇒ "Đơn hàng không có sản phẩm…"; mặc định Thanh toán hết + Tiền mặt; tiền thừa + chọn nhanh mệnh giá đúng; âm bị chặn; Trả góp/Thanh toán sau khách lẻ ⇒ "…không thể áp dụng cho khách vãng lai"; API vượt tổng ⇒ POD-0004 nguyên văn; QR chưa chọn TK ⇒ "Vui lòng chọn tài khoản nhận QR".

### Chưa chạy được
Chuyển khoản (điểm bán chưa khai TK: "Bạn không có bất kì tài khoản thanh toán nào…") · QR hoàn tất cần chuyển khoản thật · toàn bộ nhóm 050 (không có phương thức điểm) · coupon · CTKM realtime · đơn online · vai shop thanh toán (CHT chưa mở ca).

## `18_4_quan_ly_don_hang` — viết 25/09/2026 (làn 8, GDV)

Spec: `don-hang` · `don-hang-2` · `don-hang-3` (gdv) · `pham-vi.ward`; helper `tests/dh.js` (tạo đơn nhanh qua POS: nháp / thanh toán sau / tiền mặt).

### 🔴 Lỗi sản phẩm / lệch kỳ vọng
| Case | Thực tế | Kịch bản |
|---|---|---|
| 010_004 | Đang lọc "Đơn nháp", chọn tiếp "Đơn còn nợ" ⇒ KHÔNG gọi lại danh sách, bảng giữ kết quả cũ | lọc lại theo tab mới |
| 010_016 | Bảng danh sách đơn không có cột nào sắp xếp được | đảo thứ tự theo cột |
| 010_017 | Bảng có 12 cột (STT · Mã đơn · Tên KH · Thời gian · Trạng thái · TT.Thanh toán · TT. Hoá đơn · TT. CQT · Tổng tiền · Số tiền còn nợ · Chênh lệch làm tròn · Thao tác) | 15 cột |
| 010_020 | 🔴 Lọc "Đã thanh toán" ra đơn có "Số tiền còn nợ" 95.000 | mọi dòng nợ = 0 |
| 020_005 | Hộp "Xuất excel đơn hàng" mở; bấm "Xuất file excel" không tải file, không có request đo được (cần xem lại: script hoặc sản phẩm) | tải file excel |
| 030_002 / 030_003 / 030_004 | Chi tiết đơn KHÔNG có "Chiết khấu", "Giá vốn"/"Giá vốn dự kiến", "Lợi nhuận" (vai GDV — có thể do quyền) | đủ chỉ tiêu |
| 030_005 | Đơn không thuế: VAT hiện "0 đ" | "Không" |
| 040_003 | 🔴 "Cập nhật thanh toán" trả góp 500.000 cho đơn nợ 95.000 ⇒ "Thanh toán thành công" | chặn vượt số nợ |
| 060_001 | "Cập nhật" đơn nháp ⇒ mở lại POS, thêm SP + F7 lưu 200, nhưng chi tiết đơn nháp cũ KHÔNG có SP vừa thêm (lưu thành đơn khác?) | đơn nháp được sửa |
| 070_008 | "Xem thông tin hoá đơn" đơn chưa có HĐ ⇒ "Không thể tải hoá đơn. Vui lòng thử lại sau." | "Không tìm thấy hoá đơn" |

Đạt đáng chú ý: tìm mã chính xác / SĐT / khoảng ngày; thẻ Doanh thu = Σ tổng tiền đơn (bỏ nháp/huỷ) 4.280.000 khớp; SĐT che "09xxx866"; ghi nhận thêm tiền (trả góp 20.000) cập nhật đúng Đã thanh toán/Còn nợ; xoá/huỷ xoá đơn nháp; In nhiệt mở frame in; menu in: In nhiệt · In thường (A4, A5) · In tem dán cốc · Xem trước khi in; vai xã: 0 đơn.

### Chưa chạy được
Phát hành HĐĐT thật (070_001/003/004/007 — chờ cho phép) · tắt HĐĐT điểm bán (010_018, 070_006) · đơn tạm nộp (080_002–008) · thẻ trả trước · vai tỉnh chỉ có 1 điểm bán (100_002) · 060_006 cần đơn đổi trả (18_5).

## `18_5_doi_tra_hang` — viết 25/09/2026 (làn 8, GDV)

Spec mới `doi-tra.gdv` (bán đơn thật → chi tiết → "Đổi trả hàng" ⇒ tab POS "Hoàn trả: <mã>"). 38 case chặn có lý do ở `chua-chay-duoc.gdv.spec.js`.

### 🔴 Lỗi / chặn chính
| Case | Thực tế | Kịch bản |
|---|---|---|
| 050_001 / 020_003 | 🔴 GDV bấm "Hoàn trả" cho đơn TIỀN MẶT (hoặc thêm SP ngoài đơn gốc) ⇒ "Không có quyền truy cập" | tạo đơn hoàn trả / báo "Chỉ có thể thêm sản phẩm có trong đơn hàng gốc" |
| 090_001 | Đơn thanh toán sau, trả hết ⇒ "Tạo đơn hoàn trả thành công" nhưng đơn gốc giữ status 1 | đơn gốc "Đã hủy" |
| 150_001 | Phí trả hàng âm: ô tự về 0 (đạt vế không nhận âm) | ghi nhận |
| 150_002 | Phí 500.000 > tiền hoàn ⇒ "Khách cần thanh toán 500.000 đ" (chiều tiền đảo, không chặn) | ghi nhận |

Đạt: mở đổi trả nạp sẵn đơn (tab mang mã đơn gốc); SL trả kẹp theo số đã bán; bỏ hết hàng ⇒ "Đơn trả hàng cần có ít nhất một sản phẩm trả"; tiền hoàn 95.000 < niêm yết 100.000 (CK phân bổ); phí trả hàng trừ thẳng; đổi hàng đắt hơn ⇒ chiều Khách trả; đơn nháp không có nút "Đổi trả hàng"; SL trả 0 không tạo đơn. Dòng bỏ khỏi "Hàng khách trả lại" chuyển sang bảng "Hàng khách giữ lại".

### 🔄 Bổ sung 25/09/2026 tối — gỡ chặn quyền (spec `sau-chot.gdv`)
GDV **đã tạo được** đơn hoàn trả cho đơn TIỀN MẶT (050_001 ĐẠT) — nhưng vẫn nổ kèm thông báo phụ **"Không có quyền truy cập"** cùng lúc với "Tạo đơn hoàn trả thành công" (một request phụ bị từ chối — cần xem là request nào, 🔴 người dùng thấy 2 thông báo trái nhau).
Chạy `sau-chot.gdv` (11 case): **10 đạt · 1 đỏ**. Đạt: 050_002 (không có nút sửa) · 060_003 (mã trả → `/order/return-orders/detail/...?returnOrderCode=`, mã đơn → `/order/created-orders/detail/...`) · 080_001 (hiện "Phí hoàn trả" khi phí > 0) · 080_002 · 140_006 (`POD-0011` đúng nguyên văn không dấu) · 140_009 · 140_010 · 010_002 · 010_004 · PQ_002 (vai xã 0 dòng).
| Case | Thực tế | Cần user |
|---|---|---|
| 130_002 | 🔴 Cây **"Lý do trả hàng" của chuỗi TRỐNG** ⇒ không chọn được lý do, request gửi `reason: null` | Khai danh mục lý do trả hàng (cấu hình chuỗi dùng chung — auto test không tự ghi) |
| 080_001 (ghi nhận) | "Phí hoàn trả" bị ẩn khi phí = 0 (`OrderDetailOverview.jsx`) — kịch bản nói luôn có 2 dòng | Chốt có coi là lệch không |
| 140_009 / 140_010 | Chặn đúng câu nhưng mã `SSHOP-500` (lỗi 500 chung) thay vì 400 | ghi nhận |
| 090_004 / 090_005 | Nút "Hủy đơn hàng" **tạm ẩn theo yêu cầu nghiệp vụ** (OrderDetail.jsx ~1085) | Bỏ case hay bật lại nút |

**🔴 Gốc của thông báo phụ "Không có quyền truy cập" + cây lý do trống (130_002):** màn đổi trả POS gọi `GET /reasons?feature=RETURN_ORDER` (`OrderNoteField.jsx`) ⇒ vai GDV nhận **SSHOP-401**. Chuỗi CÓ lý do (id 8/9/10 …, vai TCT đọc được). `CORE_REASON_LIST`/`CORE_REASON_POS_LIST` chỉ gắn function `CONFIG_REASON` ⇒ chỉ 6 vai quản lý có. SQL gán quyền đọc cho `SHOP_SALE`/`POS_PLUS_SHOP_SALE`/`SHOP_Employee`: **`.claude/sql/update_product/2026-09-25_role_permission_ly_do_tra_hang_pos.sql` — user chạy**. Nên sửa gốc ở FE: POS dùng `/reasons/pos` (endpoint dành cho POS). Sau khi chạy SQL: chạy lại `sau-chot -g 130_002`.
**Nhóm quá hạn (spec `qua-han.gdv`, 010_003/050_003/070_001–003):** `RETURN_POLICY_DAYS` của chuỗi ĐÃ là **1 (bật)** trước khi phiên này đụng vào. Điểm bán seed **chưa có đơn bán nào trước 25/09** ⇒ ⏳ skip chờ thời gian, sớm nhất **chiều 26/09/2026**. Lệnh: `VNPOST_LANE=8 VNPOST_SETUP_ROLES=gdv,shop npx playwright test --config tai-lieu-test/18_5_doi_tra_hang/playwright.config.js qua-han`. Sửa hạn chỉ `CORP_ADMIN` làm được (`PUT /api/v1/admin/configs`; GET admin không vai nào có) ⇒ spec `han-hoan-tra.gdv` chạy bằng tài khoản gốc `.env` (`VNPOST_HAN_HOAN=<số>|goc`).
Thêm đạt: `18_2_010_013` (chi tiết đơn đã thu tiền không có chỗ gắn/sửa khách) · `18_4_060_006` (đơn đã hoàn trả hết không còn nút "Đổi trả hàng").

27 vỏ còn lại (lý do cụ thể trong `chua-chay-duoc.gdv.spec.js`): CTKM quà tặng · đơn quá hạn chính sách (cấu hình chuỗi) ⇒ kéo theo 070/140_008 · SP VAT · combo · tích điểm AUTO8 · serial · ca không gắn quầy · ngưỡng bất thường 07_3 · nợ một phần · 140_007 chỉ dựng được bằng sửa DB.

### Chưa chạy được
(cũ, trước bổ sung) Toàn bộ nhóm sau khi CHỐT hoàn trả (040, 050_002/003, 070 duyệt, 080 chi tiết, 090_002/004/005, 100 VAT, 110 combo, 120 điểm, 130, 140 chặn BE) — chờ gán quyền hoàn trả cho GDV · đơn quá hạn · quà tặng bắt buộc · màn "Chọn đơn hàng đổi trả" (010_002/004) · PQ_002.

## `20_khach_hang_than_thiet` — viết bổ sung 25/09/2026 (LÀN 7)

Checklist: **0 vỏ** (trước 87). Spec mới: `form-bo-sung.shop` (validate, chặn ghi) · `tao-sua-luu.shop` (tạo/sửa LƯU THẬT) ·
`pham-vi.province` · `tich-diem.gdv` (POS bán thật + đọc điểm DB) · `doi-diem.gdv` (POS thanh toán bằng điểm, OTP 888888) ·
`quyen-cau-hinh.shop` · `loyalty-goc.tct` (`-g "chup loyalty 20"` / 🔴 `-g "khoi phuc loyalty 20"`). Helper `cau-hinh-loyalty.js`, `pos-km.js`.
🔴 Chương trình tích điểm #14 / đổi điểm #5 là của TOÀN CHUỖI 626 — user cho phép sửa tạm; mỗi case khôi phục bản gốc
(`20_khach_hang_than_thiet/test-output/loyalty-goc.json`), lượt kiểm khôi phục cuối (12:14) so khớp từng trường: ĐẠT.
Form TẠO MỚI chỉ hiện khi chuỗi chưa có chương trình ⇒ test giả `get-campaign` rỗng và chuyển `create-campaign` thành
`edit-campaign/<gốc>` (payload form tạo được BE lưu thật, không đẻ chương trình thứ hai).

### Tiền đề môi trường phát hiện được (ghi cho mọi phân hệ POS/loyalty)
- 🔴 Điểm bán làn (AUTO7/AUTO8) **nằm ngoài phạm vi** #14 và #5 (`check-scope`: "Cửa hàng không thuộc phạm vi…") ⇒ đơn làn chưa từng tích điểm.
  Test thêm tạm tỉnh làn vào phạm vi. (Đã báo phiên làn 8: 18_2 050_004 đổi phân loại thành thiếu tiền đề.)
- 🔴 CTKM giảm 5.000đ/đơn đang áp ở điểm bán làn có `allowPoint=false` ⇒ đơn áp nó LUÔN 0 điểm (BE `orderDiscountAllowPoint`).
  Case tích điểm bỏ CTKM đó; case "HĐ giảm giá" dùng CTKM rác riêng `allowPoint=true` (dừng sau case) để tránh PASS GIẢ.
- 🔴 Quyền `REDEEM_CAMPAIGN_CALCULATE_LOYALTY_AMOUNT` (`/loyalty/redeem-campaign/calculate-loyalty-amount`): MỌI dòng
  `TBL_ROLE_PERMISSION` `active=0` ⇒ 401 với mọi vai; FE không gọi API này (đổi điểm đi luồng checkout + Kafka `USE_POINT`).

### Lỗi sản phẩm / lệch kỳ vọng (đã chạy thật)
| Case | Đo được | Kỳ vọng |
|---|---|---|
| 050_013 | Base tích điểm 100k (dòng còn lại) < tối thiểu 101k nhưng tổng đơn 190k ≥ tối thiểu ⇒ **vẫn 100 điểm** — tối thiểu so với TỔNG ĐƠN | kịch bản: so với base ⇒ 0 điểm (cần user chốt) |
| 060_003 | Nhập 350 điểm khi khách có 300 ⇒ FE **tự kẹp về 300 và vẫn đổi điểm** (REDEEM −300), không báo "không đủ điểm" | bị chặn |
| 060_001 | Đơn 100k < tối thiểu 300k ⇒ chặn sau OTP với "Không đủ điều kiện sử dụng điểm thưởng (…)" | nguyên văn "Điều kiện không hợp lệ để sử dụng điểm thưởng" |
| 060_005–008 | Chương trình chưa bắt đầu / đã kết thúc / tắt / ngoài phạm vi ⇒ FE **ẩn hẳn** phương thức "Thanh toán bằng điểm" (không có thông báo) | thông báo lỗi API nguyên văn (test đạt vì không trừ điểm; câu lỗi không có) |
| (060) | Trả bằng điểm ⇒ REDEEM −N và **EARN +floor(tiền điểm / tỷ lệ tích)** cùng giây khi chưa bật loại trừ ⇒ tỷ lệ đổi = tỷ lệ tích thì điểm KHÔNG BAO GIỜ giảm | cần user chốt |
| 010_023 | Tích ngành hàng không chọn danh mục ⇒ chỉ lỗi ô "Vui lòng chọn danh mục hoặc combo"; toast "Bạn chưa chọn ngành hàng nào" KHÔNG hiện (rule form chặn trước — nhánh toast là code chết) | cả hai |
| 020_002 | Bỏ trống tỷ lệ đổi điểm ⇒ không có "Số tiền chi tiêu phải lớn hơn 0" (chỉ lỗi ngày) | có |
| 050_006 | POS KHÔNG cho sửa đơn giá dòng hàng (ô giá khoá) ⇒ không dựng được "SP sửa giá tăng" | sửa được |
| 070_002 | Dev `PUBLIC_BUSINESS=sshop` ⇒ `careRoutes` đặt `shopConfig: []` ⇒ tắt "Cấu hình loyalty" ở điểm bán KHÔNG ẩn menu | ẩn menu |
| 010_014 · 020_006 | Ngày bắt đầu quá khứ LƯU được; toast màn Cập nhật là "Cập nhật chương trình … thành công" (kịch bản ghi câu nhánh Tạo) | — |
| 010_018 · 050_021 | Tỷ lệ 0 LƯU được ⇒ mọi đơn 0 điểm, không báo gì (đã đo bán thật) | chặn 0 |
| 020_008 | Đổi điểm: ngày kết thúc = hôm nay KHÔNG bị chặn (tích điểm thì chặn — 010_016) | hai màn thống nhất |

Đạt đáng chú ý: tối thiểu =/</> · loại trừ SP/HĐ giảm giá · nhóm khách tuỳ chỉnh · ngành hàng · làm tròn xuống · hết hạn · ngoài phạm vi (0 điểm) ·
050_009 HĐ trả HẾT bằng điểm (đơn status 2) KHÔNG được cộng điểm khi bật loại trừ · 010_032/020_012 BE chặn chương trình thứ hai đúng câu.

### ⚠️ Dữ liệu để lại (điểm bán làn 7, shop 68151)
- Đơn bán thật (trừ tồn SP_TC/SP_FIFO): các đơn tiền mặt của tich-diem / doi-diem (orderId ~252–357), gồm **6 đơn tiền mặt ngoài ý muốn**
  (345, 348, 350–352, 354) của một lượt 060 khi phương thức chưa chuyển sang điểm; đơn 336, 357 còn mở (status 1, trả một phần bằng điểm).
- Khách `A7KH19…` có điểm (khách 060 dùng SĐT CHT làn 7 — sổ `test-output/khach-diem.lane7.json`); CTKM rác `A7KH19_KM_*` đều đã dừng.
- Cấu hình "Cấu hình loyalty" điểm bán làn: đã bật lại (070_002 finally).

## `24_cong_no_nhan_vien` — viết bổ sung 25/09/2026 (LÀN 7)

Checklist: **0 vỏ** (trước 36). Spec mới: `don-hang.shop` (thẻ Công nợ theo đơn hàng + trang chi tiết NV + Xuất Excel) ·
`cua-hang.province` (thẻ Công nợ với cửa hàng + drawer chi tiết + nộp tiền) · `thu-tien.shop` (phiếu thu khách trả) ·
`pham-vi-cap.ward` (PQ_002/003/004) · tiền đề `tien-de.shop` (`VNPOST_TIEN_DE=1 … -g "tien de 24"`).
Tiền đề THẬT: phiếu xuất kho hàng hỏng (`BROKEN_DAMAGED`, 1 × SP_TC) ở điểm bán làn + `POST /employee-debt/from-stock-export`
(đúng API của drawer "Ghi nợ nhân viên") ⇒ GDV nợ 30.000 + 20.000, CHT 10.000 (2 lượt: phiếu 1706/1707, 1718/1719).
Đối chiếu DB `EMPLOYEE_DEBT_HISTORY`: nộp 35.000 ⇒ #36 (30.000, cũ nhất) PAY_COMPLETED + #38 +5.000 PAY_PARTIAL; nộp 4.000 ⇒ #38 paid 9.000 — ĐÚNG phân bổ cũ → mới.

### 🔴 Thiếu quyền / lỗi
| Case | Đo được | Kỳ vọng |
|---|---|---|
| (thẻ 1, mọi case vai tỉnh) | `GET /shops/{id}/employee/get-debt-summary` (GET_EMPLOYEE_DEBT_SUMMANRY) chỉ gán CORP_ADMIN · SHOP_MANAGER · TEST_ROLE ⇒ **vai tỉnh không xem được thẻ "Công nợ theo đơn hàng"** (script thẻ 1 chạy vai CHT) | tỉnh xem được |
| 020_001 · 020_002 | Xuất Excel `GET export/task/employee-debt` ⇒ SSHOP-401 — quyền EXPORT_TASK_EMPLOYEE_DEBT_GET **không gán vai nào** | tạo yêu cầu xuất |
| 030_003 | Trang chi tiết NV: lọc "Đã thanh toán" (`debt=false`) vẫn trả đúng 8 phiếu "Còn nợ" như lọc "Còn nợ" ⇒ BE bỏ qua `debt` | chỉ phiếu đã thanh toán |
| 040_003 | Drawer phiếu thu: ô bắt buộc "Nhân viên tạo phiếu" **không có lựa chọn nào** ⇒ không lưu được | chọn được NV |
| PQ_004 | Vai nhân viên kho (không quyền màn): menu ẩn nhưng **gõ URL vẫn vào màn** (route không chặn; API 200 + 401) | route bị chặn |
| (030_*) | Link "Chi tiết" mở `/employee/detail/…?tab=debt` nhưng trang hiện thẻ "Thông tin cá nhân" — phải bấm thẻ "Công nợ nhân viên" | mở đúng thẻ |
| (030_003) | Ô "Trạng thái" chi tiết NV không có "Tất cả"; bỏ chọn (allowClear) mới xem hết | — |

### Hành vi thật (không phải lỗi)
- 070_005: ô "Tổng số tiền thanh toán" KẸP về tổng còn nợ (gõ vượt không nhận) · 070_004: số âm bị kẹp về 0 khi rời ô.
- 050_005: cấp tỉnh — backend bỏ qua `shopId` (gọi với điểm bán khác vẫn cùng danh sách) — khớp kịch bản.
- PQ_002: vai xã gọi được `/employee-debt`, chỉ ra NV của xã mình (truyền shopId xã khác không lọt).
- 050_008 / 010_017: dữ liệu làn chỉ 2 NV (không có trang 2/3) — skip có lý do.
- ⚠️ Dữ liệu để lại: 4 phiếu xuất hỏng (1706/1707/1718/1719) trừ 4 × SP_TC; 3 phiếu nộp tiền NV (SHOP_EMPLOYEE_DEBT_PAYMENT #20–22; #20 = 50.000 do lỗi script
  gõ ô tổng — đã sửa bằng `fill`); còn nợ: CHT 2 × 10.000, GDV 11.000.

## `26_phieu_thu` — viết bổ sung 25/09/2026 (LÀN 7)

Checklist: **0 vỏ** (trước 10). Spec mới: `tu-sinh.gdv` (phiếu tự sinh bán/nháp/đổi/trả, chặn xoá, phạm vi GDV) · `tu-sinh-khac.tct` (060_006/007 theo dữ liệu có sẵn).
GDV bán hàng thật ở điểm bán làn; ĐỌC phiếu bằng phiên CHT. Phiếu thu tự sinh có `cateName`, `cateType: SYSTEM`, `isSystemCreated: true`, KHÔNG mang mã đơn.

| Case | Đo được | Kỳ vọng |
|---|---|---|
| 060_001 | ĐẠT — bán tiền mặt 95.000 ⇒ +1 phiếu "Thanh toán đơn hàng" 95.000, nguồn "KH - ANONYMOUS" (khách lẻ) | — |
| 060_002 | ĐẠT — đơn nháp (F7) không sinh phiếu | — |
| 060_004 | ĐẠT — trả hàng phí 10.000 ⇒ phiếu thu 10.000 | — |
| 040_004 | ĐẠT (BE chặn) — câu có đuôi mã request: "Không được xoá phiếu thu tiền bán hàng (KDmGWe)" | nguyên văn không đuôi |
| 🔴 060_003 | Đổi 1 SP (trả 95.000) sang 2 × FIFO (200.000): modal "Tổng tiền cần thanh toán **200.000 đ**" và phiếu thu **200.000** "Thanh toán đơn hàng" — không phải chênh lệch 105.000 (cần xem có phiếu chi hoàn 95.000 riêng không) | phiếu thu = chênh lệch 105.000 |
| 🔴 060_005 | Nhân viên nộp tiền trả nợ cửa hàng (24_070: SHOP_EMPLOYEE_DEBT_PAYMENT #20–22) ⇒ **KHÔNG sinh phiếu thu "Thu hồi nợ"** nào | phiếu thu "Thu hồi nợ", đối tượng Nhân viên |
| 🔴 070_002 | GDV **401** ở `view_all_receipts` (không xem được cả phiếu của chính điểm bán); không lọt phiếu cấp trên | chỉ thấy phiếu cấp mình |
| 040_003 | Skip: 90 ngày không có phiếu `isSystemCreated` nào ngoài tiền bán hàng (BE xét `orderType==0` TRƯỚC ⇒ phiếu bán hàng luôn nhận câu 040_004) | — |
| 060_006 / 060_007 | Skip theo dữ liệu: chưa có thu hồi nợ vận tải / TCT (shopId 11287) chưa có phiếu tự sinh từ Tỉnh trong 90 ngày — cần dựng luồng 12_070 / 13 (ghi sổ không dọn được) | — |

- Sửa chung (đã báo phiên làn 8): `shared/auth/login.js` — tài khoản 1 phạm vi được app TỰ VÀO THẲNG dù khai SCOPE_LABEL ⇒ coi là xong (log + kiểm tên đơn vị trên trang).

## `27_doi_soat_hoa_don` — 070_005 bổ sung 25/09/2026 (LÀN 7) — 0 vỏ
- Spec `tai-lai-xml.tct`: tải 2 lượt CÙNG một file XML (dựng theo snapshot hoá đơn 52, PO1000) ⇒ cả 2 lượt gắn `invoiceId 52`, PO vẫn 1 hoá đơn,
  kết quả đối soát giữ nguyên ⇒ ĐẠT (không nhân đôi hoá đơn). Mỗi lượt lưu thêm 1 bản ghi FILE (fileId 276, 277). BE không hỏi "Thay thế…".
- ⚠️ XML dựng từ snapshot cho kết quả **Lệch** (hoá đơn gốc Khớp) — chênh ở trường XML nào chưa rõ (NLap/ĐVT…); hoá đơn 52 đã trả snapshot (MATCHED) trong `finally`.
- 🔴 Môi trường làn 7: `VNPOST_API_BASE_URL` phải trỏ proxy `http://…:3200/__api` (helper 26/27 và `shared/api/base-api.js` ghép thẳng) — đã thêm vào `.env.lane7`.

## 29_bao_cao (làn 7)
- 29_050_001: dòng tồn kho SL âm (-2 "Bim bim ngô") mà Tổng giá trị kho 6.864.000 ⇒ SL × đơn giá ≠ tổng.
- 29_050_002: giá trị TK156 = tổng hệ thống (số giả, không đối chiếu sổ).
- 29_060_002: tên file xuất `nhap_xuat_ton_<ts>` không đúng mẫu tài liệu.
- ✅ 29_040_001: user chốt 28/09 — "Chốt tồn kho" trên Báo cáo trị giá tồn kho CHỈ Cửa hàng trưởng thấy ⇒ vai tỉnh không có nút là đúng; đạt.
- 29_220_009: tiêu đề drawer "Đối soát hóa đơn mua hàng — <NCC>" (chính tả "hóa" + kèm tên) khác tài liệu "hoá đơn".
- 29_210_003/004/005/010/011/015: SKIP — điểm bán làn có tồn đầu kỳ 09/2026, tháng hiện tại bị khoá ⇒ không kỳ nào chốt được tới 10/2026. Chạy lại sau 01/10/2026.
- 29_210_001: code chốt kho không kiểm tra đơn đang phát sinh (không có cảnh báo riêng).

## 30_bao_cao_ctkm (làn 7) — màn đã viết lại: route `/report/campaign-effectiveness`, API `/report/campaign/v2/effectiveness*`
- 🔴 30_030_005: dòng CTKM trong bảng báo cáo "Số hoá đơn áp dụng" = 0, Tiền giảm = 0 dù DB `POD_02.SHOP_ORDER_CAMPAIGN` có đơn (và tab "Đơn hàng đã áp dụng" liệt kê đúng đơn đó, giảm 10.000). Mọi CTKM của điểm bán POD_02 (68151) đều 0 đơn ở cả vai shop lẫn tct ⇒ nghi báo cáo chỉ đọc 1 pod.
- 🔴 30_010_001/010_002/020_001/020_002/030_001/030_002/060_001: vai TỈNH (AUTO7_T) thấy 0 chương trình — không thấy CTKM của điểm bán trực thuộc (vai shop thấy 14, tct thấy 601).
- ✅ 30_PQ_001: user chốt 28/09 — GDV KHÔNG được xem báo cáo CTKM ⇒ test kiểm mọi API trả 401; đạt (3/3 API SSHOP-401).
- 30_040_001: tệp Excel có cột khác màn (thêm Mã chương trình, Từ ngày, Đến ngày, Phạm vi ưu đãi…; "Số hoá đơn" ≠ "Số hoá đơn áp dụng") — kịch bản đòi giữ nguyên thứ tự/tên cột.
- 30_050_005: tìm `%` trả về TOÀN BỘ chương trình (LIKE không escape).
- 30_050_003: không có nút xoá/đặt lại bộ lọc (phải xoá tay).
- Phát hiện phụ: CTKM đã STOP (list quản lý CTKM ghi EXPIRED) vẫn hiện "Đang diễn ra" (RUNNING) trong báo cáo.
- Dữ liệu rác: CTKM `A7KH19_KM_30 Giảm giá hè *` (−10% đơn, chỉ shop 68151, hết hạn sau 24h); test `30 don rac` dừng các bản cũ.

## 31_quan_ly_phan_quyen (làn 7) — ghi trên vai trò rác `A7PQ31_*` (DIEM_BAN), xoá ngay sau mỗi case
- 🔴 31_050_001: tạo được vai trò thứ hai TRÙNG TÊN ("Admin") — không chặn.
- 31_080_008: nút "Làm mới" ở drawer Gán chức năng chỉ refetch danh sách, KHÔNG bỏ lựa chọn chưa lưu.
- 31_090_002: danh sách vai trò không phân trang (nạp size=5000 vào cây) — cần chốt kỳ vọng.
- 31_010_002: màn chỉ có ô tìm kiếm, không có ô lọc nào.
- 31_010_003: form Thêm vai trò không có nút "Huỷ" (chỉ nút X "Đóng" + "Xác nhận").
- 31_030_009: vẫn BLOCKED — không có giá trị font chuẩn (repo không có theme fontFamily/design).
- Spec cũ `vnpost-role-permission.playwright.spec.js` không khớp testMatch project nào (không bao giờ chạy) — case 010/020 đã viết lại trong `vai-tro-ghi.tct.spec.js`.

## 18_2 / 18_3 — bổ sung 25/09/2026 tối (làn 8): coupon + thanh toán bằng điểm

User cho phép tự dựng tiền đề trên môi trường test ⇒ đã dựng:
- **Đợt coupon #83** `AUTO8 coupon 18_2` (giảm 5.000đ, 30 mã `A8C…Z`, phạm vi điểm bán `AUTO8_T_01_A01`, 90 ngày). Chỉ `CORP_ADMIN` có `CREATE_COUPON` ⇒ spec `18_2/tests/tien-de-coupon.gdv.spec.js` chạy bằng tài khoản gốc `.env` (`env -u VNPOST_LANE VNPOST_COUPON_LANE=8 VNPOST_COUPON_SHOP_CODE=AUTO8_T_01_A01 VNPOST_SETUP_ROLES=tct … -g "tien de coupon"`). Sổ `18_2/test-output/coupon.lane8.json`.
  - Ghi nhận: BE bắt buộc "Ký tự kết thúc mã" (`codeSuffix`), báo "Ký tự kết thúc mã không được để trống" — xem form FE có đánh dấu bắt buộc không.
- **Loyalty:** thêm tỉnh `AUTO8_T` vào phạm vi tích điểm #14 + đổi điểm #5 (`18_2/tests/tien-de-loyalty.gdv.spec.js`, chỉ THÊM; phiên làn 7 đã cập nhật `loyalty-goc.json` để khôi phục giữ AUTO8_T). Khách riêng làn 8 `84948761877` (sổ `18_2/test-output/khach-diem.lane8.json`).
  - 🔴 Bẫy (phiên làn 7 chỉ ra): CTKM tự áp "giảm 5k đơn" có `allowPoint=false` ⇒ đơn **luôn 0 điểm** ⇒ bán đơn tích điểm phải bỏ CTKM (`20/tests/pos-km.js › boKm`).
  - 🔴 Thanh toán bằng điểm đòi **OTP gửi SĐT khách** (`POST /auth/otp/v2/send` → hộp "Xác thực OTP thanh toán điểm"). Khách test là số giả ⇒ helper mới `shared/db/otp.js` đọc `AUTHEN.OTP_V2` (CHỈ SELECT; biến `VNPOST_DB_HOST/USER/PASSWORD` trong `.env`, gitignore).

| Case | Kết quả | Ghi chú |
|---|---|---|
| 18_2_030_002 / 004 / 008 / 014 / 015 · 18_3_010_006 | ✅ | 014: mã B **thay** mã A (không cộng dồn). Lệch tài liệu: validate gọi **GET** `/coupon/validate` (kịch bản ghi POST) |
| 18_2_030_003 | 🔴 | CTKM + coupon cộng thẳng đúng, nhưng khối tiền **không có dòng "Chiết khấu khuyến mãi"** — CTKM chỉ thể hiện qua "Cần thanh toán" |
| 18_2_030_005 | 🔴 | Bấm × ở ô mã chỉ xoá chữ trong ô; **mã vẫn áp** (dòng "Mã coupon (…)" 5.000đ còn, "Cần thanh toán" không tính lại) |
| 18_2_050_001 / 005 / 008 / 010 / 011 | ✅ | 001: trả trọn bằng điểm (OTP) — điểm 1145 → 245 = −1000 đổi **+100 tích từ chính đơn đó** (#14 `noPointForPointPaymentInvoice=false`; user chốt có muốn tích điểm trên đơn trả bằng điểm không). 005: đa phương thức 2 bước (SDK tiền mặt → OTP điểm). 008: ô tự kẹp về mức tối đa dùng được (950 = trần theo giá trị đơn, không phải 1100 điểm khả dụng). 011: 0/−10 ⇒ ô về 0 |
| 18_2_050_003 | 🔴 | Dùng 81 điểm (8.100đ) cho đơn 95.000đ: dòng "Tổng tiền cần thanh toán" **87.000đ** nhưng "Tổng cần thanh toán" **86.900đ** trong CÙNG modal — lệch 100đ (nghi làm tròn nghìn ở một dòng) |
| (quan sát) | 🔴 | Đơn có CTKM "giảm 5k đơn" + trả bằng điểm ⇒ `draft-checkout` 400 **"Chiến dịch: 'giảm 5k đơn' không hợp lệ"** (1 lần/2 lần đo — lần kia CTKM không áp nên đạt) |
| 18_2_010_013 · 18_4_060_006 | ✅ | (đã ghi ở mục 18_5 bổ sung) |

| 18_2_030_009 | ✅ | Đợt #84 (tối thiểu 200.000đ), giỏ 100.000đ ⇒ "Đơn hàng tối thiểu 200.000 đ để áp dụng mã giảm giá này". 🔴 Ghi nhận: `GET /coupon/validate` trả **200** — ngưỡng chỉ FE kiểm, BE không chặn (gọi API trực tiếp / client khác là qua) |
| 18_2_030_010 | ✅ | Đợt #85 (không dùng chung) + CTKM 5k đang áp ⇒ "Mã giảm giá này không được áp dụng đồng thời với các chương trình khuyến mại khác"; giữ CTKM, không áp mã (validate cũng trả 200, FE chặn) |
| 18_5_120_001 | ✅ | Khách 465 → bán 100.000đ (bỏ CTKM) 565 → trả hết 465 |
| 18_5_120_002 | 🔴 | Đơn 100.000đ = 200 điểm + 80.000đ tiền mặt: 465 → 365 (−200 đổi, +100 tích) → trả hết **485** (kỳ vọng 465). Hoàn đủ 200 điểm đã dùng nhưng chỉ thu hồi **80** điểm (theo phần tiền mặt) thay vì 100 điểm đã tích ⇒ khách **lời 20 điểm** mỗi lần mua–trả. Phiếu chi = 80.000đ (đúng phần tiền mặt), khối trả hàng hiện "Hoàn điểm loyalty (200 điểm) 20.000 đ" |

Còn chặn: 030_016 (huỷ đơn: nút ẩn) · 030_017, 040_020 (đọc biên lai in) · 050_009/012.

### 18_4 — phát hành HĐĐT (spec `phat-hanh.gdv`, 25/09 khuya)
| Case | Kết quả | Ghi chú |
|---|---|---|
| 070_003 | ✅ | Drawer "Xác nhận xuất hoá đơn" đủ 8 cột, chỉ "Mẫu hoá đơn" sửa được |
| 070_004 | 🔴 | Cột "Thao tác" chỉ có nút sửa (✎) — **không có cách bỏ một dòng** khỏi đợt phát hành như kịch bản |
| 070_001 / 070_007 | ⏸️ skip | Ô "Mẫu hoá đơn" **rỗng**: mẫu chỉ có khi điểm bán đã **kết nối nhà cung cấp HĐĐT** (`SelectInvoiceTemplate.jsx › getInvPConnected`). AUTO8 chưa kết nối; kết nối cần tài khoản thật của NCC HĐĐT (HILO/VIN…) ⇒ cần user cấp tài khoản sandbox hoặc chỉ điểm bán test đã kết nối. Cùng lý do chặn 18_2_040_020, 18_4_010_019 (đơn đã có hoá đơn). Ghi nhận thêm: khi mọi đơn thuộc nhóm GTGT, bấm "Xác nhận" **không có thông báo gì** (không báo thiếu mẫu) |

### 18_3 — thanh toán bằng điểm (spec `diem.gdv`, 25/09 khuya — dùng helper `18_2/tests/diem.js`)
| Case | Kết quả | Ghi chú |
|---|---|---|
| 050_002 | ✅ | OTP sai ⇒ verify 400 `SSHOP-606` "Sai mã OTP, vui lòng thử lại"; không checkout, điểm không đổi, hộp OTP giữ nguyên. ⚠️ Không có toast nào trên màn (chỉ BE trả lỗi) |
| 050_006 · 050_008 · 050_010 · 050_011 | ✅ | 006 "Vui lòng nhập số điểm thanh toán" · 008 nhập đúng khả dụng (1285, đơn 2 SP) sang bước OTP · 010 ô kẹp về trần theo số phải thu · 011 37 điểm ⇒ 3.700đ, ô khoá |
| 050_003 | 🔴 | Đơn khách lẻ **ẩn hẳn** nút "Thanh toán bằng điểm" — kịch bản muốn nút có và báo "Vui lòng chọn khách hàng để thanh toán bằng điểm" (chốt cách nào đúng) |
| 050_007 | 🔴 | Gõ N+1 điểm ⇒ ô tự kẹp về N, **không có cảnh báo** "Số điểm thanh toán vượt quá điểm khả dụng" |
| 050_009 | 🔴 | Số điểm 0 ⇒ bấm "Xác nhận thanh toán" không gửi OTP/checkout nhưng **không báo gì** (chặn im lặng) |
| 060_006 | 🔴 | Đa phương thức với **đơn khách lẻ vẫn hiện ô "Số điểm sử dụng"** (kịch bản: không hiện) |
Còn chặn: 050_004 (cần tắt tỉ lệ quy đổi) · 050_005 (cần tắt chương trình đổi điểm #5 — cấu hình chuỗi, làm lượt sau có khôi phục) · 080_002/003.


## 33_lich_su_thao_tac_nguoi_dung (làn 7) — tiền đề: tạo → sửa → xoá vai trò rác `A7LS33_*`
- 🔴 Vai TỈNH (auto7_qlt) nhận SSHOP-401 ở `/operation-history` — 7 case kịch bản vai province (010_001, 020_001, 020_002, 030_001, 040_001, 050_001, 050_002) fail ở phần quyền (expect.soft); phần chức năng đo bằng vai tct đều ĐẠT.
- 🔴 33_010_004: bản ghi "---" (vd #7019 STOCK_BATCH_SELECTION UPDATE) có `operator_id` NULL trong DB — KHÔNG giữ mã/ID người thao tác ⇒ không truy được ai làm.
- Ghi chú: RangePicker màn này định dạng `YYYY-MM-DD` (gõ dd/mm/yyyy không ăn).

## 32_mo_hinh_to_chuc (làn 7) — ghi trên cây rác `A7MH32*`
- 🔴🔴 32_150_003: nhập Excel có dòng TRÙNG MÃ ⇒ GHI ĐÈ đơn vị có sẵn, báo "Nhập file Excel thành công". Lần chạy đầu dùng AUTO7_T ⇒ tên tỉnh làn bị đổi thành "A7MH32 GHI ĐÈ TÊN" (ĐÃ KHÔI PHỤC "AUTO7_TINH" bằng PUT). Test giờ dùng tỉnh rác.
- 🔴 32_150_004: dòng có đơn vị cha không tồn tại — không tạo (đúng) nhưng vẫn báo "Nhập file Excel thành công", không có file lỗi.
- 32_150_005: tệp chỉ có header ⇒ "Nhập file Excel thành công" (không báo tệp rỗng).
- 🔴 32_140_001/140_002/140_003: KHÔNG có xoá lan — BE chặn "Không thể xoá đơn vị khi đơn vị này đang có đơn vị cấp dưới…" (kịch bản kỳ vọng xoá kéo theo). 140_005: popup chỉ "Bạn có chắc chắn muốn xoá đơn vị "…" không ?" — không nêu hậu quả.
- 🔴 32_130_001: không chuyển được đơn vị sang nhánh khác: có cấp dưới ⇒ "Không thể thay đổi đơn vị khi đơn vị này đang có đơn vị cấp dưới"; xã ⇒ "Mã đơn vị phải bắt đầu bằng mã đơn vị cha" mà ô mã bị khoá khi cập nhật.
- 32_100_001: form không tạo được cấp TCT (cấp tự suy = cấp dưới của cha, ô khoá; API dưới VNPOST: "Đơn vị cấp trên phải có cấp cao hơn"). 100_004: không có kiểm khoảng/độ dài mã (tạo được mã 47 ký tự).
- 32_120_001: tìm từ khoá không tồn tại — cây còn 1 nút trống, không có chữ trạng thái rỗng.
- 🔴 32_160_006: bỏ trống Tỉnh/TP + Xã/Phường vẫn gửi tạo điểm bán (hai ô không bắt buộc). 160_009: không có nút xoá điểm bán (ẩn với DIEM_BAN; BE: "Không được phép xoá Điểm bán từ danh mục cây thư mục"). 160_003/160_010: "Là cửa hàng mẫu"/"Mẫu cửa hàng" đã bị gỡ khỏi FE.
- Phát hiện phụ: tạo được điểm bán dưới xã NGỪNG hoạt động, nhưng sau đó sửa lại bị "Không thể kích hoạt đơn vị khi đơn vị cấp trên đang ngưng hoạt động". API org-unit cho TẠO nút DIEM_BAN trực tiếp nhưng không cho xoá.
- 🔴 32_170_013: không đổi được đơn vị của dòng gán đã có (ô đơn vị gốc = đơn vị đang mở). 32_170_014: chi tiết đơn vị không hiển thị số nhân viên được gán.
- 🔴 Vai tct nhận SSHOP-401 ở `DELETE /chain-employment-profile/v1.2/assignment` (nút ✕ xoá phân công đã lưu). Xoá đơn vị VẪN được khi còn phân công ⇒ phân công mồ côi (id 29943, AUTO7_CUI, xã đã xoá — không gỡ được, batch status 0 trả 200 mà không đổi).
- 32_170_010: gán trùng bị chặn im lặng (không toast giải thích) — xem lần chạy.
- 🧹 Rác KHÔNG xoá được (đã cho Tạm ngừng): nhánh cố định `A7MH32T901183` (tỉnh/xã/nút điểm bán, dùng làm tiền đề 140_001); điểm bán `A7MH32 RÁC Pos mini/Pos plus *` (mỗi lượt 160_001/002 thêm 1); 2 điểm bán tạo nhầm dưới AUTO7_T_01 (`AUTO7_T_01Z323538`, `AUTO7_T_01Z348393` — route chặn sai glob, đã sửa).

## `18_x` + `14_1` — bổ sung 26/09/2026 sáng (làn 8)

Sau khi user chạy `.claude/sql/update_product/2026-09-25_role_permission_ly_do_tra_hang_pos.sql`: GDV đọc được cây "Lý do trả hàng".
Tiền đề tự dựng trong spec (bật ở beforeAll, khôi phục ở afterAll/finally): CTKM quà tặng 2 loại (`18_1/tests/ctkm-qua.js`),
CTKM nhóm khách (`18_2/tests/ctkm-nhom.js`), bán âm cho điểm bán làn (`shared/ban-am.js`, chụp phạm vi gốc), đổi điểm sửa tạm
(`18_2/tests/doi-diem-tam.js`), ca CHT quầy riêng `A8CHT` (`18_3/tests/ca-cht.js`). Giữ lại vĩnh viễn: bảng giá `AUTO8_BG_SX_TON_AM`
(SP sản xuất 10.000đ — chỉ SP này), quầy `A8CHT`, tồn âm SP `AUTO8_SP_SX_55976508`.

### Đạt (mới)
18_1_030_004 · 040_015 · 050_011 [đơn+SP] · 060_014 [đơn+SP] · 060_020 — 18_2_010_012 · 030_017 · 040_020 — 18_3_050_004 · 080_002 · 100_002 —
18_5_020_004 [đơn+SP] · 040_001 · 040_002 [đơn+SP] · 130_001 · 140_004 — 14_1_010_035.

### 🔴 Lỗi sản phẩm / lệch đặc tả
| Case | Thực tế | Kịch bản / cần user |
|---|---|---|
| 18_2_050_012 | Đổi HẾT điểm (1.285 điểm, đơn 300k, đa phương thức): FE báo "Đã hoàn tất thanh toán đa phương thức" (tiền mặt đã qua SDK) nhưng `draft-checkout` bị từ chối **POD-0004 "Số tiền thanh toán lớn hơn tổng số tiền của đơn hàng"** — tái hiện 2/2 lần. Đơn dùng 200 điểm thì qua. | Chấp nhận, điểm còn 0. 🔴 Tiền mặt đã thu mà đơn không chốt. |
| 18_1_060_008 | Bán SL **lẻ 0,5** (cân) SP tồn âm ⇒ SSHOP-500 "Không thể kiểm tra thông tin đơn hàng trong chiến dịch" (2/2). Cùng SP SL nguyên thì bán được (060_020). | Vẫn cho bán. Nghi CTKM "giảm 5k đơn" không nhận SL lẻ. |
| 18_5_130_002 | Lý do trả hàng hiện đúng ở chi tiết; đơn gốc trả hết vẫn status 2 | "trạng thái đơn Đã hủy" — theo memory, từ 09/2026 đơn gốc không bị sửa khi hoàn ⇒ user chốt kỳ vọng (cùng 090_001, 100_001). |
| 18_5_090_002 | Đơn 100k trả góp 30k, hoàn trả toàn bộ ⇒ sinh **phiếu chi 30.000đ** | "KHÔNG phát sinh phiếu chi vì khách còn nợ". Trả hết hàng thì hoàn phần đã thu cũng hợp lý ⇒ **user chốt**. |
| 18_5_140_005 | Gửi serial giả trong request ⇒ BE trả chung "Có lỗi xảy ra…" | "Không tìm thấy serial: …". BE truy vết serial từ ĐƠN GỐC, không đọc request ⇒ nhánh này chỉ xảy ra khi serial gốc mất khỏi kho. |
| 18_2_050_009 | Đơn 100k < ngưỡng đổi điểm 200k: BE chặn LOYALTY-002 **"Không đủ điều kiện sử dụng điểm thưởng"** (sau khi đã gửi OTP); FE không kiểm ngưỡng | "chặn và NÊU ngưỡng tối thiểu" — thông báo không nêu ngưỡng. |
| 18_2_030_016 · 18_5_090_004/005 | Chi tiết đơn KHÔNG có nút "Hủy đơn hàng" (tạm ẩn theo nghiệp vụ, `OrderDetail.jsx`) | Bỏ case hay bật lại nút. |
| 18_3_050_005 | Tắt chương trình đổi điểm ⇒ modal ẨN hẳn nút "Thanh toán bằng điểm" (skip) | Kịch bản chờ cảnh báo "Chương trình đổi điểm đang tắt" — code có câu này nhưng không tới được. |
| 18_5_040_002 (ghi nhận) | Khấu trừ quà 100k > tiền hàng trả 95k ⇒ "Tổng tiền hàng trả lại **−5.000 đ**", "Khách cần thanh toán 5.000 đ" | Đúng số; dòng tiền âm hiển thị lạ. |
| 18_5_020_004 (ghi nhận) | `ModalGiftReturn` TỰ MỞ khi vào đổi trả đơn có quà (che bảng) | — |

### ⛔ Chưa dựng được tiền đề (skip kèm lý do đo được)
- 18_2_040_022 · 18_4_010_018 · 070_006 (điểm bán tắt HĐĐT) · 18_5_100_001/002 (VAT): `PUT /shops/configs/68152` — vai `shop` SSHOP-401; vai `tct`
  (header shopid TCT) SSHOP-500; vai `tct` + header shopid=68152 trả **200 nhưng đọc lại không đổi sau 15s**, DB `VNPOST_POD_02.SHOP_CONFIG` cũng
  không đổi (bật VAT 10% ⇒ đơn VAT 0). Cần dev chỉ cách đổi cấu hình điểm bán cho tài khoản nào / API nào.
- 18_5_140_001: ô "Quầy thu ngân" khi mở ca KHÔNG xoá được ⇒ không có ca "chưa gắn quầy" qua giao diện.
- 18_5_140_003: POS không cho thêm 2 × SP serial khi chỉ chọn 1 serial (không báo gì) ⇒ không có đơn gốc thiếu serial.

### ⏳ Chờ thời gian (script sẵn)
- 18_5 `qua-han` (050_003 · 010_003 · 070_001–003 · **140_008 mới**) — đơn bán sớm nhất ≥ 1 ngày: sau ~15:00 26/09.
- 14_1_010_036 — lô TD1 nguồn phiếu nhập NCC 24/09 18:58 ⇒ từ **18:59 26/09** (spec tự skip trước giờ đó; tự đặt HĐ AUTO8HDT maxReturnDays=1 rồi khôi phục).

### Bổ sung 26/09 trưa — combo (seed bước 15)
Seed `00_seed/api-tests/15-combo.api.spec.js`: combo `AUTO8_SP_COMBO2` (#1171384, FIFO + BT Xanh) + bảng giá riêng `AUTO8_BG_COMBO2` 150.000đ.
**Đạt:** 18_5_110_001 (tách combo, trả FIFO giữ BT ⇒ hoàn 50.000 = 150.000 − giá lẻ BT) · 110_002 (trả nốt ⇒ hoàn 100.000, tổng 150.000) ·
110_003 (2 combo, trả 1 FIFO ⇒ hoàn 50.000, chỉ combo bị phá clawback) · 110_004 (item không thuộc combo ⇒ POD-0011 "Khong tim thay component
trong combo") · 18_4_030_009 (lọc "Sản phẩm gộp" / "Sản phẩm" đúng dòng).
| Phát hiện | Thực tế |
|---|---|
| 🔴 Combo có thành phần giá vốn TIÊU CHUẨN không bán được | Thanh toán `AUTO8_SP_COMBO` (TC + FIFO) ⇒ SSHOP-500 "Chưa cấu hình giá vốn tiêu chuẩn cho đơn vị sản phẩm" dù TC đã khai giá (đơn vị 376044 = 60.000) và combo đã khai giá. `CheckoutOrder.java` ~1070 tính giá vốn thành phần bằng `productComboEntity.getProductUnitId()` (đơn vị mặc định của SP TC — dòng không variant 376043, mac_price NULL) thay vì `shopProductCombo.getProductUnitId()`. |
| Combo mới tạo nhận giá vốn Tiêu chuẩn mặc định | `stock_type` NULL ⇒ phải khai giá tiêu chuẩn cho đơn vị bán của combo mới thanh toán được (FE tạo combo không hỏi). |
| Ghi nhận | Request hoàn trả combo nguyên khối mang `productUnitId` = đơn vị của THÀNH PHẦN (376040 FIFO), không phải đơn vị combo (376096). |

---

## Bổ sung 26/09/2026 khuya — gỡ vỏ 04_1 / 07_2 / 09 / 12_2 / 18_5 / 31 (làn 8)

| Case | Đo được | Quyết định |
|---|---|---|
| `04_1_010_015` | Đạt: thanh công cụ bảng Dự báo hết hàng có reload · column-height · setting, **không có** phóng to (sheet QC FUNC_1_192 đòi có) | tài liệu sai hay tắt chức năng? |
| `04_1_020_016` | Đạt: ô tìm "Theo từng sản phẩm" có chọn kiểu **Tên SP / SKU / Barcode**; SKU 1, tên 4, barcode `8932200000061` 1 gợi ý. SP seed AUTO8 có barcode = SKU (không phân biệt được) — đo bằng `SP-TSHIRT-2-RED-S`. SP chuỗi nằm ở thẻ "Sản phẩm của Tổng công ty" | |
| `04_1_020_020` 🔴 ĐỎ | Gõ "abc" vào Min/Max: ô **hiện "abc"** khi gõ, rời ô thành **rỗng** — không về 0 (sheet QC FUNC_1_208) | yêu cầu chưa làm? |
| `07_2_070_001`–`004`, `020_005`, `070_005` | Đạt (khoá dựng bằng API `stock-freeze/bulk`, đo `freeze-check`): khoá tỉnh chặn điểm bán + HUB trong tỉnh, không chặn tỉnh khác · khoá xã chặn đúng xã (HUB ngoài xã không bị) · khoá 1 điểm bán chỉ chặn nó · nhiều cấp trong 1 cấu hình đều chặn, nơi không chọn không bị · 2 cấu hình cùng SKU: bỏ 1 vẫn chặn · khoá danh mục chặn SP thuộc, không chặn SP ngoài. Câu chữ "Không thể xuất kho. Sản phẩm đang bị khoá kho: <tên>" / chuyển kho "Không thể chuyển kho…". BE chỉ nhận `scopes[].{scopeType, orgUnitCode}` — gửi thêm `parentOrgUnitCode` ⇒ "Truyền sai tham số" | |
| `07_2_060_010` / `060_011` | Đạt: HUB đang khoá ⇒ chặn chuyển; bỏ khoá ⇒ lập phiếu HUB → điểm bán IN_TRANSIT, điểm bán nhận APPROVED, tồn +1 | |
| 🔴 (phát hiện ở 060_010) | Phiếu chuyển do vai **điểm bán** lập tới HUB bị lưu `to_shop_id` = chính điểm bán gửi nhưng `to_inventory_id` = kho HUB (POD_02 id 152, LOCAL) ⇒ HUB không thấy phiếu, nhận ở điểm bán sẽ đẩy hàng vào kho của HUB. Đã từ chối + nhập lại (RESTOCKED) | lỗi BE |
| `07_2_060_001` 🔴 ĐỎ | SP đang khoá **biến mất khỏi ô tìm bán hàng POS**, không có thông báo nào; kỳ vọng "Không thể xuất kho. Sản phẩm đang bị …" | chấp nhận ẩn hay phải báo? |
| `07_2_060_007` | Đạt: bỏ khoá ⇒ bán bình thường, tồn −1 | |
| `07_2_010_005` / `010_009` / `010_010` | Đạt: đổi Loại hàng hoá sang Combo xoá sạch 2 danh mục đã tích; tìm theo SKU được cả SP tự doanh `AUTO8SKUTD1` lẫn SP TCT `AUTO8_SKU_TC` | |
| `09_020_001` | Đạt: thanh xám thẻ thành phẩm → "Lô / serial sản phẩm sản xuất"; cuối dòng nguyên liệu → "Phân bổ lô tiêu hao" (chạy vai `seed_gdv`) | |
| `12_2_040_015` | Đạt: bảng giá NCC 01/09–10/09 (dựng bằng API, ban hành được dù đã hết hạn — trạng thái vẫn `PUBLISHED`) **không** được áp: PO lấy 55.556 của bảng hiệu lực, không phải 11.111 | ghi nhận: BE cho ban hành bảng đã hết hạn |
| `17_030_008` | Vẫn skip: 3 pod không có quầy nào thiếu quỹ CASH; COUNTER-004 chỉ ném ở `ShopFundImpl` khi GHI TIỀN MẶT trong ca, không ở luồng "Ngừng quầy" ⇒ kịch bản có thể sai luồng | chốt kịch bản |
| `18_5_090_004` / `090_005` 🔴 ĐỎ | Huỷ đơn bị tắt cả hai đầu: nút FE ẩn (`OrderDetail.jsx` ~1085) và BE `OrderCancelController` **comment `@PostMapping`** ⇒ `POST /order-cancel` 404; POD_02 không có đơn huỷ nào để làm tiền đề 090_004. FE (code ẩn) còn gửi cứng `inventoryId: 100` | bỏ case hay bật lại chức năng? |
| `31_030_009` | Đạt theo chuẩn = token mặc định antd v6 (app không ghi đè font): ô nhập + nút 14px / 22px, một font thống nhất, khớp màn đối chiếu `/role-management/function`. (Font antd khác font `body` Tailwind — toàn app) | có Figma riêng thì thay chuẩn |
| `14_2_010_011` / `050_009`, `18_5_140_002` / `140_007` | Giữ skip: chỉ dựng được bằng sửa DB (cấm) hoặc cần chuỗi thứ hai | |
| `07_2_060_006` 🔴 ĐỎ | **Khoá kho KHÔNG chặn kiểm kho**: khoá TC + FIFO ở điểm bán seed, phiên kiểm toàn kho đếm lô TC 1→0 (giảm) và lô FIFO 1→2 (tăng) ⇒ "Chốt phiên" **200**, cả hai chênh lệch đều áp vào tồn | lỗi BE (khoá kho không có chốt tập trung) |
| `07_2_060_012` | Đạt: bỏ khoá ⇒ kiểm lệch 1→0 chốt thành công, tồn lô = 0 | |
| `07_2_060_005` | Đạt: phiếu HUB → điểm bán lập (xuất ngay) TRƯỚC khi khoá; khoá ở điểm bán nhận ⇒ xác nhận nhận hàng bị chặn **"Không thể nhập kho. Sản phẩm đang bị khoá kho: …"** (POD-0050), phiếu ở IN_TRANSIT (hàng đã rời HUB, treo giữa đường tới khi bỏ khoá). Kịch bản ghi câu "Không thể xuất kho…" — thực tế là "nhập kho" | chốt câu chữ + cách xử lý hàng treo |
| `07_2_010_012` 🔴 ĐỎ | Cả 4 vai (tct / province / **ward** / **shop**) đều vào `/settings?setting=stockFreeze` và thấy nút "Thêm cấu hình khoá kho"; kỳ vọng xã + điểm bán bị chặn | lỗi phân quyền |
| `07_2_030_002` 🔴 ĐỎ | Form bán tồn âm (chuỗi dùng chung, request lưu bị chặn ở mạng): bỏ hết ô đang tick (bật cả "Hiển thị các đơn vị đã chọn") thì bộ đếm vẫn **"Đã chọn 1 đơn vị/điểm bán"** mà không còn ô nào hiện để bỏ — đơn vị ma; bấm Lưu FE vẫn gửi request | lỗi FE |
| `07_2_050_003` | Đạt: 1 cấu hình mặc định (`isDefault`, id 1 "Test 28/07") — Switch vô hiệu, bấm không đổi | |
| `07_2_050_004` | Đạt: sửa ô Số ngày 30→45 + Enter ⇒ PATCH 200, tải lại vẫn 45. 🔴 Bẫy: danh sách ở TCT chỉ trả cấu hình đúng phạm vi đang lọc — cấu hình phạm vi điểm bán không hiện (dùng cấu hình tạm cấp chuỗi) | |
| (helper 04_4) | `demToanKhoExcel` trước đây bỏ trống cột Serial ⇒ file toàn kho bị BE bỏ 12/49 dòng SP serial ("phải nhập danh sách serial"); đã điền serial còn tồn theo lô (04_4_040_004 dùng chung — chạy lại khi rảnh) | |
| `16_030_022` 🔴 ĐỎ | Chốt kỳ ký gửi THẬT qua giao diện (vai tct, môi trường dev) trên 5 kỳ OPEN sạch cảnh báo, có số liệu (id 9, 4, 12, 7, …, cũ → mới): **mọi lần `POST /consignment-recon/periods/{id}/lock` đều SSHOP-500** "Có lỗi xảy ra…" (requestId ISvvHv, EhCsui, qtzPoJ…), kỳ vẫn OPEN. ⇒ Chặn dây chuyền 030_018/019/020/026, 050_013/015/016/017, 070_001/004, 010_018 (đều cần kỳ chốt được). Cần log pod-service dev theo requestId | lỗi BE — cần log |
| `04_5_030_006`–`011` | Đạt (lý do chặn cũ "Thẻ kho vai shop RỖNG" đã lỗi thời): tìm theo Barcode ra đúng SP (SP seed barcode = SKU) · Tồn đầu kỳ 0 = tồn tới 27/08 · Σ nhập 961 = ô Tổng nhập · Σ xuất 814 = ô Tổng xuất · đầu + nhập − xuất = 147 = ô Tồn cuối = tồn thật Σ lô | |
| `04_5_030_015` / `030_018` 🔴 ĐỎ | Dòng kiểm kho trên Thẻ kho chỉ ghi **"Kiểm kho"** (màu cam), **cột Nhập/Xuất hiện "-"** dù API có `quantityIn` 3 / `quantityOut` 1 — không có nhãn "Nhập kho"/"Xuất kho" và không thấy số chênh lệch trên màn | lỗi FE / chốt thiết kế cột kiểm kê riêng |
| `02_010_011` | Đạt: "NGUYỄN" / "nguyễn" / "Nguyễn" đều 539; bản **không dấu "Nguyen" cũng 539** (BE chuẩn hoá dấu) — vế không dấu ghi nhận để chốt | |
| `02_010_013` | Đạt: 5 dấu cách + Enter ⇒ FE gửi `keyword=` (đã trim), vẫn 5.309 như ban đầu | |
| `02_020_014` / `020_028` | Đạt: FE gửi request, **BE chặn** "Mã nhân viên không được để trống" / "Tên nhân viên không được để trống" (SSHOP-415) — FE không có validator khoảng trắng như ô Tên đăng nhập (thiếu nhất quán) | |
| `02_020_025` 🔴 ĐỎ | Cùng đơn vị TCT, khác vai trò (Kế toán + Quản lý cung ứng): **FE chặn** "Mỗi nhân viên chỉ được gán một vai trò trong cùng một đơn vị", không gửi request. Khớp sheet QC FUNC_NHANVIEN__19 nhưng trái phân hệ 01 (drawer gắn nhân viên cho phép) | chốt 1 quy tắc |
| `02_020_026` | Đạt: trùng cả đơn vị + vai trò ⇒ FE chặn cùng câu trên, không tạo bản ghi | |
| `04_2_020_008` / `020_022` | Đạt (SP tạm mới, khai nhiều lần/điểm bán như memory): "Đã tạo phiếu nhập tồn đầu kỳ thành công", tồn +5 (lô tự sinh `OB68152-<variant>-…`), danh sách đã khai đúng SL · giá vốn · tổng giá trị · ngày 26/09/2026 | |
| `04_2_020_009` | Đạt: SP đã khai lượt trước ⇒ dòng Lỗi "Sản phẩm/biến thể này đã có tồn đầu kỳ hoặc lịch sử nhập kho tại kho", SP mới cùng file Hợp lệ, tồn SP cũ không đổi | |
| `04_2_020_011` 🔴 ĐỎ | SP đang có tồn + phiếu nhập (TC seed) ⇒ **Lỗi** cùng câu trên; kịch bản đòi Hợp lệ + CỘNG DỒN. Thiết kế BE (user xác nhận 23/09) là chặn ⇒ kịch bản cần sửa | sửa kịch bản |
| `04_2_020_013` | Đạt: FIFO thiếu mã lô ⇒ "Sản phẩm FIFO bắt buộc có mã lô"; MAC bỏ trống ⇒ Hợp lệ (mã lô tự sinh lúc tạo phiếu, bản xem trước để trống); sửa mã lô ⇒ "Đã cập nhật dòng" | |
| `04_2_020_018` | Đạt: 4 lựa chọn Tất cả · Hợp lệ · Lỗi · Cảnh báo; 2 / 1 / 1 / 0 dòng | |
| `04_2_020_023` | Đạt (vế đọc): 1.000 dòng ⇒ "Tổng dòng" 1000, xử lý ~7s. Vế tạo phiếu 1.000 dòng hợp lệ cần 1.000 SP chưa khai — không dựng | |
| `04_2_030_003` | Đạt: lượt Chờ xác nhận hiện ở vai tỉnh (bảng lượt **không hiện tên file** — tìm theo tên file ra rỗng dù placeholder nói "tên file"), SP chưa vào danh sách đã khai | ghi nhận ô tìm |
| `07_1_010_002` `020_001` `030_003` `040_002` `050_001` | Đạt (cấu hình chuỗi, khôi phục ở finally): bật công tắc báo đúng nguyên văn "Đã bật cấu hình làm tròn" / "…làm tròn số lượng" / "…tiền tệ" / "…VAT mặc định" / "…tự động khóa màn hình"; cả 5 nhóm gốc đều đang BẬT (tắt trước rồi bật để đo) | |
| `07_1_050_005` | Đạt: đổi mô tả Tiền tệ, F5 vẫn giữ; đã trả mô tả gốc "Tiền tệ mặc định của hệ thống bán hàng" (kiểm `CHAIN_CONFIGS`) | |
| `07_1_030_006` | Đạt: FE gửi nguyên 10 dấu cách (`"description":"          "`), sau F5 ô rỗng, bộ đếm 0/200 (BE/FE hiển thị đã trim) | ghi nhận: FE không trim trước khi gửi |
| `07_3_010_002` / `010_005` | Đạt: tắt công tắc đổi trả ⇒ ô "Giới hạn thời gian trả hàng" ẩn; bật ⇒ hiện giá trị đã lưu (chuỗi đang 1 ngày, kịch bản ghi mặc định 7); lưu 3 → tắt → bật giữ 3 | |
| `07_3_010_004` | Đạt + ghi nhận: 0 lưu được (nghĩa của 0 chưa có đặc tả) · 1 lưu · **9999 lưu được** (không có giới hạn trên — đáng báo) · -1 ô tự kẹp về 0 rồi **lưu 0** · 1.5 tự làm tròn **2** rồi lưu. Đã trả về 1 ngày | chốt nghĩa của 0 + giới hạn trên |
| `07_3_030_001` | Đạt: trang "Liên kết thanh toán tích hợp" có tài khoản với nhãn "Đang kết nối" / "Đã hủy kết nối". 030_002 (chưa có tài khoản) không dựng được khi chuỗi đã có tài khoản thật — không tự huỷ liên kết ngân hàng | |

## 34 — chạy 28/09/2026 (làn 7, shop 68151) — thay kết quả 27/09
> Hôm 27/09 báo GDV 401 + Tỉnh 500: 401 đã hết nhờ SQL gán quyền xem; **500 là do test thiếu fromDate/toDate**, không phải lỗi backend.
- 34_040_001 — GDV thu hồi nợ. ✅ Hết 401 (SQL `2026-09-28_authen_gdv_thu_hoi_no_khach.sql`) và hết 500 (pod `575dc1ed`:
  `sum(function("GREATEST"))` trong lọc `orderDebt` làm Hibernate NPE "type is null" — mọi thu hồi nợ không chọn đơn đều 500;
  kèm mặc định `created_by` = người thao tác). Nay: 200, phiếu thu "Thu hồi nợ" CASH vào quỹ quầy, gạch đơn cũ nhất, mở lại màn nợ giảm đúng.
  ✅ 28/09: FE `customerDetail/index.jsx` truyền `setReload` cho `CustomerDebt` + nạp lại ví ⇒ "Tiền còn nợ" tự cập nhật. 34_040_001 ĐẠT.
- 34_040_002 — vai Tỉnh có nút "Thanh toán" nợ khách và bấm được (kịch bản: chỉ điểm bán).
- 34_050_005 — tìm SĐT `09…` ra 0 dòng; DB lưu `84…` ⇒ người dùng gõ số quen thuộc không ra.
- 34_050_011 — từ khoá `%_` trả đủ 7 dòng ⇒ ký tự đại diện SQL không escape.
- 34_050_013 — tìm theo mã khách lấy từ chính danh sách ra 0 dòng.
- 34_030_001 — thẻ Công nợ có cột `Ngày tạo · Mã phiếu/mã đơn · Cửa hàng · Tổng tiền · Đã thanh toán · Còn nợ · Ghi chú`, không có người lập/nhân viên bán.
- 34_060_008 — gõ 290.000 khi nợ 190.000: FE tự hạ về 190.000 và gửi, không báo lỗi. Chốt: tự hạ là đúng hay phải chặn + báo?

## 50_toan_trinh — TT01 điểm bán đề xuất đặt hàng (làn 7, 28/09/2026)
Chuỗi `DX2609286914` → `ĐXTCT-20260928-5634` → `PO2609288191` → `CK2809267F5C`: 010–070 **đạt** (tồn HUB 0→2→0, điểm bán +2 mỗi SP, trạng thái phiếu gốc PENDING → APPROVED → SEND_TO_TCT → TCT_TRANSFERRED → TRANSFERRED → COMPLETED).
- 🔴 50_TT01_080 — PO TCT giao thẳng về HUB `COMPLETED` mà **công nợ NCC không tăng** (kỳ vọng +240.000 đ, thực tế +0; màn Công nợ NCC của TCT không có dòng NCC seed). DB: `VNPOST_POD_01.SHOP_PURCHASE_ORDER` shop 68062 — mọi PO COMPLETED của NCC 132 (làn 7) và 133 (làn 8, >21 triệu) đều `accounting_status NULL`, `SHOP_SUPPLIER_DEBT` không có dòng / total 0. Chốt: lỗi hay công nợ ghi ở bước sau (ghi sổ)?
- 50_TT01_080 — trạng thái cuối phiếu đề xuất sau khi điểm bán nhận: `COMPLETED` — chốt có đúng kỳ vọng không (đang chỉ ghi nhận).

## 50_toan_trinh — TT02 điểm bán trả hàng NCC (làn 7, 28/09/2026)
Phiếu `RTR-CDE74D78` (TD1 lô `28092632F2` + TC lô `28092665HY0B` — TC lấy từ TT01) → tách `-1` NCC tỉnh / `-2` hàng TCT.
- ✅ 010–060 nhánh NCC tỉnh: PENDING → WARD_APPROVED → APPROVED (**tồn điểm bán trừ lúc TỈNH DUYỆT**, phiếu giữ hàng #2077 — không trừ lúc lập) → tách → trả NCC, đợt #189 CONFIRMED 50.000 đ → hoá đơn XML khuôn FE KHỚP, chốt SETTLED → công nợ NCC tỉnh "trả hàng" 0 → 50.000.
- 🔴 50_TT02_070 — tỉnh gửi phiếu con hàng TCT lên TCT: **SSHOP-500 "Đơn vị nhận hàng chưa khai báo kho mặc định để nhận hàng trả từ cấp dưới"** (requestId swWbis) dù kho TCT 68062 (POD_01, kho 404) và HUB 68163 (POD_02, kho 99) đều có kho mặc định. Nghi `ReturnRequestService.importHangBanGiao` (dòng ~1681) tra `shopInventoryDao` ở NHẦM POD (tỉnh POD_02, kho TCT POD_01) — cùng họ lỗi 14_2 050_001 ("hàng TC nguồn PO TCT gửi TCT bị BE chặn", 14_2 lách bằng lô nhập tay). Chờ log `swWbis` để chốt. 080/090 chặn theo.
- Trạng thái cuối (chờ chốt kỳ vọng): gốc SPLIT · con tỉnh RETURNED · con TCT TCT_NOT_SENT.
