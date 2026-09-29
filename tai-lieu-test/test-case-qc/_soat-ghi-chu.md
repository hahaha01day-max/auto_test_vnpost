# Soát ghi chú kỹ thuật trong cột `Kết quả mong muốn`

> 🤖 Sinh tự động bởi `tool/bin/to-qc-csv.js` — 🚫 đừng sửa tay.
> Câu ở mục 1 đã bị BỎ khỏi bản QC. Câu ở mục 2 vẫn GIỮ vì máy không chắc là ghi chú —
> soát tay, chỗ nào là ghi chú thì sửa ở `<phân hệ>/test-cases.csv` rồi chạy lại.

## 1. Đã cắt (656 câu)

| Phân hệ | Case | Câu bị cắt |
|---|---|---|
| `01_quan_ly_diem_ban` | `01_010_019` | 🔴 Ghi lại hành vi thật: FE không trim keyword trước khi gửi, nên đây là case phơi hành vi backend. |
| `01_quan_ly_diem_ban` | `01_010_023` | Nếu lần có khoảng trắng trả rỗng thì là lỗi thiếu trim — ghi nhận. |
| `01_quan_ly_diem_ban` | `01_010_027` | Số dòng trang cuối = total_elements mod pageSize; |
| `01_quan_ly_diem_ban` | `01_010_028` | Các nút Nhập/Xuất excel cũng chỉ hiện theo permKey import_shop / get_shop. |
| `01_quan_ly_diem_ban` | `01_020_020` | 🔴 HDSD 020 KHÔNG nói Email là bắt buộc — code thì bắt buộc. |
| `01_quan_ly_diem_ban` | `01_020_020` | Lỗ hổng đặc tả, xem nhận xét tay. |
| `01_quan_ly_diem_ban` | `01_020_021` | 🔴 HDSD 020 cũng không khai ô này là bắt buộc. |
| `01_quan_ly_diem_ban` | `01_020_023` | 🔴 Phơi hành vi thật: rule chỉ có `required: true` nên antd coi chuỗi khoảng trắng là ĐÃ nhập ⇒ request POST /shops/profile được gửi. |
| `01_quan_ly_diem_ban` | `01_020_023` | Nếu backend cũng nhận thì là LỖI, ghi phiếu. |
| `01_quan_ly_diem_ban` | `01_020_024` | 🔴 Phơi hành vi thật như 01_020_023: FE không trim nên không chặn được ở client. |
| `01_quan_ly_diem_ban` | `01_020_027` | Ghi lại giá trị nào được chấp nhận để chốt đúng pattern thật. |
| `01_quan_ly_diem_ban` | `01_020_032` | 🔴 Phơi hành vi thật: FE không kiểm trùng, quyết định nằm ở backend. |
| `01_quan_ly_diem_ban` | `01_020_032` | Ghi lại thông báo thật từ `err.data.status.message`. |
| `01_quan_ly_diem_ban` | `01_020_033` | 🔴 MÂU THUẪN ĐẶC TẢ: HDSD 020 bước 5 nói "Mã và tên không được trùng", nhưng code FE chỉ ràng buộc required — không có rule duy nhất cho tên. |
| `01_quan_ly_diem_ban` | `01_020_033` | Case này để phơi hành vi thật; |
| `01_quan_ly_diem_ban` | `01_020_033` | ghi lại có chặn hay không rồi báo, 🚫 không tự sửa tài liệu. |
| `01_quan_ly_diem_ban` | `01_020_038` | 🔴 Ba ô này KHÔNG bắt buộc trong code (không có rule required) — khác với nhóm "Bưu điện tỉnh/xã" là bắt buộc. |
| `01_quan_ly_diem_ban` | `01_020_038` | Case gốc FUNC_THUMUC__47 (nay thuộc phân hệ 32) khai ngược lại; |
| `01_quan_ly_diem_ban` | `01_020_038` | xem nhận xét tay. |
| `01_quan_ly_diem_ban` | `01_030_008` | không gửi PUT /shops/profile/{shopId}; |
| `01_quan_ly_diem_ban` | `01_030_009` | không gửi PUT /shops/profile/{shopId}. |
| `01_quan_ly_diem_ban` | `01_040_009` | Ghi nhận thực tế từng nút ở cột Hành động của điểm bán đã ngừng hoạt động: nút nào bị chặn và chặn bằng cách nào (ẩn / mờ / báo lỗi). |
| `01_quan_ly_diem_ban` | `01_090_006` | Bạn có thể bỏ qua bước này nếu chưa cần khai báo." — 🔴 khác hẳn thông báo của 01_090_005, không được dùng lẫn. |
| `02_quan_ly_nhan_vien` | `02_010_002` | Sheet QC `FUNC_NHANVIEN__2` khai placeholder là "Tên nhân viên" và chỉ 1 dropdown — KHÔNG khớp code, xem nhận xét tay. |
| `02_quan_ly_nhan_vien` | `02_010_003` | Ba cột mà sheet QC đòi (Vai trò, Chi nhánh làm việc, Trạng thái làm việc) KHÔNG nằm ở bảng chính mà ở hàng mở rộng — xem `02_010_005`. |
| `02_quan_ly_nhan_vien` | `02_010_007` | Placeholder khai "Tìm kiếm theo tên và số điện thoại" nên ô này phải tìm được cả hai — sheet QC không có case này. |
| `02_quan_ly_nhan_vien` | `02_010_009` | 🔴 Ký tự % và _ KHÔNG được hiểu như ký tự đại diện SQL LIKE — nếu trả về toàn bộ danh sách là lỗi thoát ký tự ở backend. |
| `02_quan_ly_nhan_vien` | `02_010_010` | Nếu lần có khoảng trắng ra rỗng thì là lỗi thiếu trim — ghi nhận, 🚫 không chỉnh kỳ vọng. |
| `02_quan_ly_nhan_vien` | `02_010_011` | 🔴 Bước 3 (không dấu) chưa có đặc tả — phải đo rồi mới chốt kỳ vọng, 🚫 không đoán. |
| `02_quan_ly_nhan_vien` | `02_010_012` | code gọi handlSearch() không tham số ngay khi ô rỗng nên KHÔNG cần nhấn Enter lần nữa. |
| `02_quan_ly_nhan_vien` | `02_010_013` | 🔴 FE không trim trước khi gửi nên đây là case đo hành vi backend. |
| `02_quan_ly_nhan_vien` | `02_010_014` | workStatus = 1 hiện Tag "Kích hoạt" màu xanh; |
| `02_quan_ly_nhan_vien` | `02_010_019` | 🔴 ghi rõ hành vi khi một nhân viên vừa có phân công Đang làm vừa có Đã nghỉ — bộ lọc lấy theo phân công hay theo nhân viên. |
| `02_quan_ly_nhan_vien` | `02_010_023` | 🔴 KHÔNG có ô chọn số dòng mỗi trang — khác màn Quản lý điểm bán vốn có. |
| `02_quan_ly_nhan_vien` | `02_010_023` | Đây là kỳ vọng theo code hiện tại, nếu nghiệp vụ muốn có thì là yêu cầu mới, không phải lỗi test. |
| `02_quan_ly_nhan_vien` | `02_010_024` | 🔴 Màn này dùng page 1-based, khác quy ước 0-based ở `frontend_core.md` — chú ý khi assert query string. |
| `02_quan_ly_nhan_vien` | `02_010_025` | Số dòng trang cuối = tổng mod pageSize; |
| `02_quan_ly_nhan_vien` | `02_010_028` | Cả ba nút "Thêm mới", "Nhập từ excel", "Chức danh" đều ẩn — chúng dùng chung `PERMISSION_KEY.create_employee`. |
| `02_quan_ly_nhan_vien` | `02_010_029` | tổng nhỏ hơn tổng khi đăng nhập bằng `tct`. |
| `02_quan_ly_nhan_vien` | `02_010_029` | 🔴 Thiếu filter phạm vi thì backend trả TOÀN BỘ pod, không phải rỗng. |
| `02_quan_ly_nhan_vien` | `02_020_003` | 🔴 FE không kiểm trùng mã — quyết định ở backend. |
| `02_quan_ly_nhan_vien` | `02_020_005` | KHÔNG có ô Cửa hàng, Email, Mật khẩu, Xác nhận mật khẩu, Số tài khoản, Mã hợp đồng — tất cả đã bị comment out trong code. |
| `02_quan_ly_nhan_vien` | `02_020_012` | 🔴 Thông báo không nói giới hạn trên — đáng báo. |
| `02_quan_ly_nhan_vien` | `02_020_014` | 🔴 Phơi hành vi thật: ô này chỉ có rule `required` nên antd cho qua ⇒ request được gửi. |
| `02_quan_ly_nhan_vien` | `02_020_014` | Đối chiếu: ô Tên đăng nhập CÓ validator chặn khoảng trắng, hai ô còn lại thì không — thiếu nhất quán, đáng báo. |
| `02_quan_ly_nhan_vien` | `02_020_015` | 🔴 Ô này quyết định đơn vị chịu chi phí lương — bỏ trống mà hệ thống vẫn nhận thì đáng hỏi nghiệp vụ, ghi nhận vào nhận xét tay. |
| `02_quan_ly_nhan_vien` | `02_020_021` | danh sách vai trò lọc theo `orgUnitType` của đơn vị vừa chọn. |
| `02_quan_ly_nhan_vien` | `02_020_023` | Hệ thống chặn, hiện thông báo lỗi từ backend qua `err.data.status.message`; |
| `02_quan_ly_nhan_vien` | `02_020_023` | 🔴 FE không kiểm trùng nên quyết định hoàn toàn ở backend — ghi lại thông báo thật. |
| `02_quan_ly_nhan_vien` | `02_020_026` | 🔴 Modal này KHÔNG có kiểm trùng ở FE (khác drawer Gắn nhân viên của phân hệ 01 vốn cảnh báo ngay tại chỗ) ⇒ thông báo phải đến từ backend. |
| `02_quan_ly_nhan_vien` | `02_020_026` | Ghi lại nguyên văn thông báo thật. |
| `02_quan_ly_nhan_vien` | `02_020_027` | Ghi lại chính xác các độ dài được `PHONE_PATTERN` chấp nhận. |
| `02_quan_ly_nhan_vien` | `02_020_028` | 🔴 Phơi hành vi thật: ô này chỉ có rule `required` nên antd cho qua ⇒ request được gửi. |
| `02_quan_ly_nhan_vien` | `02_020_028` | Đối chiếu: ô Tên đăng nhập CÓ validator chặn khoảng trắng, ô Tên nhân viên thì không — thiếu nhất quán, đáng báo. |
| `02_quan_ly_nhan_vien` | `02_030_003` | 🔴 Sheet QC `FUNC_NHANVIEN__22` nói "TOÀN BỘ đơn vị + vai trò tự động chuyển sang Ngừng hoạt động". |
| `02_quan_ly_nhan_vien` | `02_030_003` | Code cho đổi trạng thái theo TỪNG DÒNG, không thấy xử lý lan sang dòng khác. |
| `02_quan_ly_nhan_vien` | `02_030_003` | Case này để đo: ghi rõ chỉ dòng vừa đổi sang "Đã nghỉ" hay tất cả các dòng cùng đổi. |
| `02_quan_ly_nhan_vien` | `02_030_003` | 🚫 Không chép kỳ vọng của sheet. |
| `02_quan_ly_nhan_vien` | `02_030_006` | 🔴 Phần "nhân viên ở A không thể truy cập nữa" mà sheet QC nêu phải kiểm bằng cách đăng nhập lại bằng chính nhân viên đó — xem nhận xét tay. |
| `02_quan_ly_nhan_vien` | `02_040_003` | 🔴 Thẻ này tên "Lịch sử làm việc", sheet QC gọi là "Chi nhánh làm việc" — cùng một chỗ, khác tên. |
| `02_quan_ly_nhan_vien` | `02_040_004` | 🔴 Nghiệp vụ công nợ nhân viên thuộc phân hệ `24_cong_no_nhan_vien` — ở đây chỉ kiểm thẻ có hiển thị đúng dữ liệu của nhân viên đang xem, 🚫 không kiểm lại công thức nợ. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_009` | 🔴 Phơi hành vi thật: rule chỉ `required` nên antd cho qua ⇒ request được gửi. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_010` | HDSD không nói giới hạn này — xem nhận xét tay. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_011` | Hiện lỗi nguyên văn `Đã tồn tại ca cùng giờ bắt đầu và kết thúc: Ca sáng`; |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_013` | Gửi POST /timekeeping/shift với `allowOverlap: true`; |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_014` | Lưu thành công, KHÔNG có thông báo trùng và KHÔNG có hộp thoại chồng lấn — code chỉ kiểm khi `values.active` là true. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_020_009` | 🔴 Khác hẳn hộp thoại ở `03a_020_007`, 🚫 không dùng lẫn. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_030_004` | 🔴 Phần "hệ thống lấy đúng giờ từ trường thời gian cho phép chấm công" mà sheet QC nêu phải kiểm ở bảng chấm công của phân hệ `03b`, không kiểm được tại drawer này. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_030_007` | Chỉ hai người đó được tự động chấm công, 🔴 phần kiểm "chỉ nhân viên được chọn được áp dụng" phải đo ở bảng chấm công phân hệ `03b`. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_030_008` | 🔴 Phơi hành vi thật: ô `autoCheckinEmployeeIds` KHÔNG có rule `required` trong code ⇒ có thể lưu cấu hình "tự động chấm công cho nhân viên cụ thể" mà danh sách rỗng, tức bật mà không ai được áp dụng. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_030_008` | Ghi lại hành vi thật rồi báo. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_030_009` | giá trị âm bị ô số chặn không nhập được hoặc bị đưa về 0 — ghi rõ cách chặn. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_030_009` | 🔴 Không có giới hạn TRÊN cho hai ô này: nhập 9999 phút (gần 7 ngày) vẫn lưu được — đáng báo. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_030_010` | 11 bị ô số kéo về 10 hoặc không nhập được — ghi rõ. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_040_006` | 🔴 Đây là `message.warning` ở mức toàn form, KHÔNG phải lỗi dưới từng ô — 🚫 đừng tìm `.ant-form-item-explain-error`. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_040_008` | 🔴 Ghi lại hệ thống xếp đến đâu khi không có ngày kết thúc — liên quan trực tiếp tới `03a_040_003` (giới hạn 90 ngày). |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_040_008` | HDSD không nói, xem nhận xét tay. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_050_005` | Thông báo nguyên văn `Đã huỷ 5 lịch của <tên nhân viên>` — 🔴 con số lấy từ `res.data` của backend, 🚫 không chấp nhận thông báo "thành công" chung chung; |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_050_005` | calendar của A trống sau khi nạp lại. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_050_006` | Thông báo nguyên văn "Không có lịch nào phù hợp để huỷ" (backend trả 0) — 🔴 KHÔNG được báo thành công; |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_050_006` | calendar không đổi. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_060_005` | Chênh lệch = thực tế − sổ, kiểm bằng phép trừ tay trên đúng hai số đang hiển thị. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_060_006` | hai con số khớp `syncedOfflineCount` / `offlineOrderCount`; |
| `03b_ca_lam_viec_nhan_vien` | `03b_010_008` | 🔴 Mỗi ô là một case con, ghi kết quả từng ô. |
| `03b_ca_lam_viec_nhan_vien` | `03b_010_009` | 🔴 Cả hai nút VẪN hiện: `isWithinTimekeepingWindow` trả `true` khi thiếu cấu hình giờ ("Thiếu cấu hình giờ → trả true (không chặn)"). |
| `03b_ca_lam_viec_nhan_vien` | `03b_010_009` | Đây là bẫy SAI IM LẶNG — ca khai thiếu giờ thì mọi ràng buộc thời gian mất tác dụng mà không có cảnh báo nào. |
| `03b_ca_lam_viec_nhan_vien` | `03b_020_007` | Hai số 30 phút lấy từ `checkinAllowableMinutesBefore` / `checkoutAllowableMinutesAfter` khai ở phân hệ 03a. |
| `03b_ca_lam_viec_nhan_vien` | `03b_030_006` | 🔴 Đây là `modal.info` — không có đường đi tiếp, khác trường hợp ca chưa chốt của CHÍNH MÌNH ở `03b_030_007`. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_004` | TUYỆT ĐỐI không có "Tiền dự kiến", không có "Chênh lệch" — ba số đối soát chỉ xuất hiện sau khi `isDraftClosed`. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_005` | Chênh lệch = Tiền thực tế − Tiền dự kiến, kiểm bằng phép trừ tay trên hai số đang hiển thị. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_007` | 🔴 Màn chốt ca KHÔNG hiện trạng thái phiếu chênh lệch — luồng công nợ đã tách từ 12/08/2026, 🚫 đừng tìm trạng thái duyệt ở đây. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_008` | Đây là đối ứng của `03b_040_002` (lệch bằng 0 thì màu xanh `text-green-600`). |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_009` | 🔴 Sheet QC `dong26` đòi "hiển thị cảnh báo và không cho chốt ca". |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_009` | Code FE thì nút "Chốt ca" chỉ phụ thuộc `isShiftStarted`, KHÔNG có phép kiểm giờ nào ⇒ nhiều khả năng chốt được. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_009` | Case này để ĐO; |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_009` | 🚫 không chép kỳ vọng của sheet, cũng 🚫 không hạ xuống "chốt được là đúng". |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_010` | 🚫 Đừng chấp nhận nhãn cũ "Chênh lệch đầu ca/cuối ca" không có phần giải thích — nhãn đã được sửa chính vì người ký không phân biệt được hai thứ. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_012` | Chỉ một lần chốt được ghi nhận — request mang `idempotencyKey` nên lần thứ hai không tạo phiên chốt thứ hai; |
| `03b_ca_lam_viec_nhan_vien` | `03b_050_005` | 🔴 Danh sách ca gọi theo `employeeId` của người đăng nhập — nếu thấy được ca người khác thì là lỗ phạm vi, ghi phiếu ngay. |
| `03b_ca_lam_viec_nhan_vien` | `03b_060_001` | 🔴 Sheet QC `dong16` đòi thông báo riêng "Tài khoản chưa được xếp lịch làm việc" — code dùng CHUNG một hộp thoại cho cả hai tình huống, xem nhận xét tay. |
| `03b_ca_lam_viec_nhan_vien` | `03b_060_002` | Y nguyên hộp thoại và đường điều hướng như `03b_060_001` — điều kiện vào màn bán hàng là có ca với `isOpened === true` và `isClosed !== true`. |
| `03b_ca_lam_viec_nhan_vien` | `03b_060_002` | Đáng báo. |
| `03b_ca_lam_viec_nhan_vien` | `03b_060_003` | 🔴 Danh sách 8 số điện thoại được hardcode trong code nguồn để bỏ qua toàn bộ phép chặn ca. |
| `03b_ca_lam_viec_nhan_vien` | `03b_060_003` | Hệ quả cho test: nếu tài khoản test rơi vào danh sách này thì `03b_060_001` và `03b_060_002` sẽ **PASS GIẢ** — phải kiểm SĐT của tài khoản test trước. |
| `03b_ca_lam_viec_nhan_vien` | `03b_070_001` | 🔴 KHÔNG đo được bằng Playwright trên `vnpost-web`: FE web không có xử lý `navigator.onLine` và không có chế độ offline — nghiệp vụ này thuộc **máy bán hàng / app POS**. |
| `03b_ca_lam_viec_nhan_vien` | `03b_070_001` | Xem `_blocked`. |
| `03b_ca_lam_viec_nhan_vien` | `03b_070_002` | 🔴 Cùng lý do với `03b_070_001` — không đo được trên web. |
| `04_1_canh_bao_ton_kho` | `04_1_010_011` | 🔴 Ô này KHÔNG có nút tìm và KHÔNG chạy theo Enter — bảng tự nạp lại sau **debounce 500ms**, script phải chờ đúng mốc đó. |
| `04_1_canh_bao_ton_kho` | `04_1_010_013` | Nút này bật bằng `options: { reload: true }`. |
| `04_1_canh_bao_ton_kho` | `04_1_010_014` | Nút này bật bằng `options: { setting: true }`. |
| `04_1_canh_bao_ton_kho` | `04_1_010_016` | 🔴 Thẻ "Cài đặt cảnh báo" đã bị comment out khỏi màn này — cài đặt nằm ở màn riêng. |
| `04_1_canh_bao_ton_kho` | `04_1_020_013` | Cấp xã: "Sản phẩm của xã" và "Sản phẩm của Tổng công ty" — 🔴 nhãn đổi theo cấp, sheet QC chỉ nói "của tỉnh". |
| `04_1_canh_bao_ton_kho` | `04_1_020_013` | Cấp `tct`: KHÔNG có thẻ con nào, vào thẳng phần cấu hình. |
| `04_1_canh_bao_ton_kho` | `04_1_020_014` | 🔴 Khối này CHỈ hiện với cấp con (tỉnh / xã) — cấp `tct` không có, vì không có cấp trên để tham khảo. |
| `04_1_canh_bao_ton_kho` | `04_1_020_015` | 🔴 Màn này có nhiều ô cùng placeholder "Tìm SKU, tên sản phẩm..." — script phải bám đúng ô trong khối, 🚫 không bám theo placeholder trần. |
| `04_1_canh_bao_ton_kho` | `04_1_020_016` | 🔴 Sheet QC `FUNC_1_202` đòi tìm được cả **barcode**; |
| `04_1_canh_bao_ton_kho` | `04_1_020_016` | placeholder trong code chỉ ghi "Tìm sản phẩm" / "Tìm SKU, tên sản phẩm...". |
| `04_1_canh_bao_ton_kho` | `04_1_020_016` | Ghi lại barcode có tìm được hay không, 🚫 không giả định. |
| `04_1_canh_bao_ton_kho` | `04_1_020_017` | 🔴 Ba thẻ này BIẾN MẤT khi chọn phạm vi "Nhiều tỉnh / theo vùng miền" — xem `04_1_020_019`. |
| `04_1_canh_bao_ton_kho` | `04_1_020_018` | Hộp thoại tiêu đề "Xác nhận xoá cấu hình?", nội dung theo khuôn `Xoá ngưỡng cảnh báo của SKU <sku> - <tên sản phẩm>.`, nút "Xoá" màu đỏ và nút "Huỷ". |
| `04_1_canh_bao_ton_kho` | `04_1_020_020` | 🔴 Sheet QC `FUNC_1_208` đòi "hiển thị mặc định về số 0". |
| `04_1_canh_bao_ton_kho` | `04_1_020_020` | Thực tế ô là `InputNumber min={0}` của antd: ký tự không phải số **bị bỏ qua khi gõ**, ô giữ giá trị cũ hoặc thành rỗng (null) — 🚫 KHÔNG tự về 0. |
| `04_1_canh_bao_ton_kho` | `04_1_020_020` | Ghi lại hành vi thật; |
| `04_1_canh_bao_ton_kho` | `04_1_020_020` | nếu nghiệp vụ đòi về 0 thì đây là yêu cầu chưa làm. |
| `04_1_canh_bao_ton_kho` | `04_1_020_022` | 🔴 Code chỉ ràng buộc `min={0}` cho từng ô, KHÔNG có phép kiểm Min ≤ Max. |
| `04_1_canh_bao_ton_kho` | `04_1_020_022` | Đo rồi báo, 🚫 không tự sửa tài liệu. |
| `04_2_ton_kho_dau_ky` | `04_2_010_003` | 🔴 Sheet QC `FUNC_1_102` đòi hai nút bị vô hiệu và hiện chữ "Đã khai báo tồn kho đầu kỳ". |
| `04_2_ton_kho_dau_ky` | `04_2_010_003` | Grep code KHÔNG thấy chuỗi đó, cũng không thấy `disabled` theo trạng thái đã khai báo — phép chặn hiện nằm ở bước tạo phiếu (xem `04_2_020_009`). |
| `04_2_ton_kho_dau_ky` | `04_2_010_003` | Case này để ĐO: ghi rõ nút có bị vô hiệu không và có chữ gì. |
| `04_2_ton_kho_dau_ky` | `04_2_020_011` | 🔴 Đây là case ghi tồn kho thật. |
| `04_2_ton_kho_dau_ky` | `04_2_020_014` | 🔴 Sheet QC `FUNC_1_109` chỉ ghi kỳ vọng dở dang là "Hiển thị Mã lô đã tồn tại:" — chưa rõ là CHẶN hay CỘNG DỒN vào lô đó. |
| `04_2_ton_kho_dau_ky` | `04_2_020_014` | Cần đo rồi user chốt: mã lô là khoá của lô hàng, cộng dồn vào lô có sẵn và chặn hẳn là hai nghiệp vụ khác nhau. |
| `04_2_ton_kho_dau_ky` | `04_2_020_014` | 🚫 Không chép kỳ vọng cụt. |
| `04_2_ton_kho_dau_ky` | `04_2_020_017` | các ô tổng hợp KHÔNG đổi theo bộ tìm (tổng hợp tính trên toàn bản xem trước, không trên phần đang lọc) — 🔴 ghi rõ hành vi thật. |
| `04_2_ton_kho_dau_ky` | `04_2_020_018` | 🔴 Trạng thái "Cảnh báo" có trong code nhưng tài liệu không giải thích nó là gì và có được ghi vào tồn hay không — xem nhận xét tay. |
| `04_2_ton_kho_dau_ky` | `04_2_020_020` | 🔴 Bản xem trước cũ bị HUỶ, không cộng thêm — 🚫 đừng kỳ vọng gộp hai file. |
| `04_2_ton_kho_dau_ky` | `04_2_020_022` | 🔴 Case ghi tồn kho thật. |
| `04_2_ton_kho_dau_ky` | `04_2_020_023` | 🔴 Tài liệu không nói ngưỡng dung lượng / số dòng tối đa — nếu có giới hạn thì phải báo. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_002` | 🔴 Vai `shop` không có ô lọc này (chỉ thấy điểm bán của mình) — chạy bằng `shop` là kiểm nhầm. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_005` | 🔴 Thẻ kho là báo cáo đọc từ DW — đối chiếu số phải theo post−pre, 🚫 không lấy `quantity` làm số biến động (xem `.claude/schema/_LINEAGE.md`). |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_008` | 🔴 Phân loại sản phẩm phải đọc từ `CHAIN_PRODUCTS` (Core), 🚫 không dùng `SHOP_PRODUCTS` — xem quy tắc 1 của `.claude/CLAUDE.md`. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_009` | nhãn khớp `IMPORT_TYPE` / `EXPORT_TYPE` trong `utils/constants/config.jsx`. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_010` | 🔴 Các nhãn bị comment out (Nhập hoàn/huỷ đơn, Nhập lại sau dịch vụ, phiếu đã xoá, phiếu nháp) KHÔNG được xuất hiện. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_012` | 🔴 `quantity` trên dòng ĐÃ là số theo đơn vị gốc — 🚫 không nhân thêm `convert_to_main_unit`. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_013` | 🔴 Với sản phẩm MAC, `price` và `basePrice` có thể lệch và phần lệch đi vào `adjust_val` — đối chiếu số phải biết điều này. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_015` | 🔴 Lấy ĐÚNG con số giới hạn từ code trước khi viết assert; |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_015` | 🚫 không đoán. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_017` | 🔴 Đây là case ghi — xoá chứng từ kế toán là xoá bằng chứng, cần biết có lưu vết không. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_019` | 🔴 Sản phẩm MAC VẪN CÓ LÔ — 🚫 đừng kỳ vọng "MAC thì không có lô". |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_021` | 🔴 Nguồn lô duy nhất là JSON `batch_products` — đối chiếu dữ liệu phải đọc từ đó. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_005` | 🔴 Lấy đúng danh sách ô tự điền từ code trước khi assert. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_006` | 🔴 Với hàng ký gửi, `import_price` ĐÃ gồm VAT — 🚫 đừng bóc VAT lần nữa. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_009` | 🔴 Sửa phiếu đã ghi sổ phải sinh chứng từ điều chỉnh (bút toán đảo) — kiểm cả ở danh sách phiếu xuất loại "Điều chỉnh phiếu nhập". |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_010` | 🔴 Sheet QC không ghi rõ kỳ vọng. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_010` | Phải ĐO và ghi rõ: giảm số lượng dưới số đã xuất thì bị chặn (nếu không thì tồn âm), đổi giá thì giá vốn các phiếu xuất đã phát sinh có được tính lại hay không. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_010` | 🚫 Không đoán — đây là câu hỏi số tiền. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_013` | Giá bình quân mới = (Q0×P0 + Q1×P1) / (Q0+Q1), tính tay để đối chiếu. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_013` | 🔴 Nguồn giữ scale 6 chữ số thập phân, chỉ làm tròn lúc trình bày — 🚫 đừng so bằng số đã tròn 2 chữ số. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_016` | 🔴 Nếu giá vốn đổi theo giá nhập thì phương pháp giá tiêu chuẩn đang không được áp — báo ngay. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_006` | 🔴 Ghi rõ lô còn nằm trong danh sách với tồn 0 hay bị ẩn — hai cách hiển thị này ảnh hưởng case tiếp theo khi nhập lại cùng mã lô. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_007` | Lấy nguyên văn thông báo từ hệ thống. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_008` | phải ghi rõ cấu hình đang bật trước khi assert. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_009` | 🔴 Kỳ vọng chưa chốt: tuỳ chính sách tồn âm. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_009` | Phải đo và ghi rõ hệ thống chặn hay cho xuất tiếp làm tồn âm sâu hơn, và giá vốn lấy ở đâu khi không còn lô. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_009` | 🚫 Không đoán — đây là gốc của sai số giá vốn. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_040_001` | Lấy nguyên văn câu cảnh báo từ hệ thống. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_008` | 🔴 Kỳ vọng chưa chốt, giống `04_3_020_010`: chưa rõ có chặn giảm dưới số đã xuất, và giá vốn của các phiếu xuất đã phát sinh có được tính lại hay không. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_008` | Phải đo rồi user chốt. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_010` | 🔴 Giá vốn sau khi bù âm là điểm dễ sai nhất: ghi rõ hệ thống tính bình quân trên số lượng nào. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_010` | Đối chiếu bằng tay. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_005` | 🔴 ghi rõ bộ lọc áp cho nơi CHUYỂN, nơi NHẬN hay cả hai — ảnh hưởng trực tiếp cách đếm. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_006` | Mỗi ô bắt buộc cho một thông báo RIÊNG, lấy nguyên văn từ hệ thống; |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_006` | mỗi lần đều không tạo được phiếu. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_006` | 🚫 Không gộp thành một case "bỏ trống hết". |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_007` | 🔴 Tồn bên chuyển giảm hay chưa tuỳ cấu hình "xuất ngay" — xem `04_3_060_014` và `04_3_060_015`. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_009` | Lấy nguyên văn thông báo. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_010` | 🔴 Nếu chính sách tồn âm đang bật thì kỳ vọng khác — ghi rõ cấu hình đang bật trước khi assert. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_011` | 🔴 Kỳ vọng chưa chốt, giống `04_3_030_009`: tuỳ chính sách tồn âm, và nếu cho chuyển thì giá vốn lấy ở đâu. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_011` | Đo rồi user chốt. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_012` | 🔴 Nguồn lô là JSON `batch_products`. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_013` | 🔴 Event cross-pod phải mang sku/unitId — nếu serial không sang được thì kiểm phần này. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_014` | 🔴 Giá vốn xuất ghi vào phiếu tại thời điểm này — nếu là hàng ký gửi thì `base_price` có thể bằng 0, kiểm cả trường hợp đó. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_016` | nếu có giới hạn số ảnh thì lấy đúng con số từ code. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_017` | 🚫 KHÔNG có giá vốn (phiếu lấy hàng là chứng từ kho, không phải chứng từ tiền) — ghi rõ nếu có. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_002` | 🔴 Đọc cấu hình trước, 🚫 không giả định. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_003` | 🔴 Callback TCT→tỉnh so pod có bẫy đã biết — nếu xác nhận không ăn thì kiểm phần so pod. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_005` | 🔴 Thiếu phiếu IMPORT ở cấp trên là bẫy đã gặp (gây tồn âm) — case này chính là chốt chặn đó. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_012` | 🔴 Kiểm ở phân hệ `13-cong-no-diem-ban-tinh`; |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_012` | số liệu phải khớp giữa hai phân hệ. |
| `04_4_kiem_kho` | `04_4_020_003` | 🔴 Nhận diện theo TÊN là nguồn nhầm lẫn khi hai sản phẩm trùng tên — ghi rõ hệ thống xử lý thế nào. |
| `04_4_kiem_kho` | `04_4_030_003` | 🔴 Phân biệt **"đếm 0"** (đã đếm, kết quả bằng 0) với **"chưa đếm"** (bỏ trống) — hai thứ này hoàn toàn khác nhau, xem `04_4_030_006`. |
| `04_4_kiem_kho` | `04_4_030_004` | 🔴 Sheet QC `FUNC_1_137` ghi kỳ vọng là "Check lại phần tồn kho âm" — **không phải kỳ vọng**, chỉ là ghi chú của người viết. |
| `04_4_kiem_kho` | `04_4_030_004` | Phải đo và ghi rõ: ô có chặn số âm hay không, nếu nhận thì chênh lệch và tồn sau áp dụng ra sao. |
| `04_4_kiem_kho` | `04_4_030_004` | 🚫 Không chép câu đó vào assert. |
| `04_4_kiem_kho` | `04_4_030_005` | 🔴 Sheet QC đòi "Số lượng mới = 0". |
| `04_4_kiem_kho` | `04_4_030_005` | Ô là ô số nên ký tự chữ bị bỏ qua khi gõ — phải đo xem ô thành rỗng hay về 0, và cột "Số lượng mới" hiển thị gì. |
| `04_4_kiem_kho` | `04_4_030_006` | Nếu hệ thống coi bỏ trống là 0 thì **mọi sản phẩm chưa kiểm sẽ bị xoá sạch tồn** — đây là lỗi nghiêm trọng nhất có thể có ở màn này, phải kiểm bằng được. |
| `04_4_kiem_kho` | `04_4_040_004` | 🔴 Kiểm kê tách cột chênh lệch riêng từ 07/09 — 🚫 không lẫn chênh lệch kiểm kê với biến động nhập/xuất. |
| `04_4_kiem_kho` | `04_4_050_004` | 🔴 Lấy đúng danh sách trạng thái từ code (tối thiểu có nháp và đã áp dụng) — 🚫 không đoán. |
| `04_4_kiem_kho` | `04_4_060_001` | 🔴 Nguồn lô là JSON `batch_products`. |
| `04_4_kiem_kho` | `04_4_060_002` | 🔴 Giá vốn của 2 đơn vị thừa lấy ở đâu là câu hỏi số tiền — ghi rõ hệ thống dùng giá lô hiện tại hay giá nào khác. |
| `04_4_kiem_kho` | `04_4_060_003` | lấy nguyên văn thông báo. |
| `04_4_kiem_kho` | `04_4_060_004` | Lấy nguyên văn thông báo. |
| `04_4_kiem_kho` | `04_4_060_005` | 🔴 Giá vốn sau khi bù âm là điểm dễ sai — đối chiếu bằng tay. |
| `04_4_kiem_kho` | `04_4_070_001` | 🔴 Đây là case của phân hệ kế toán kho — ở đây chỉ kiểm phần chứng từ kiểm kho, 🚫 không kiểm lại toàn bộ định khoản. |
| `04_4_kiem_kho` | `04_4_070_002` | 🔴 Kỳ vọng phụ thuộc `NegativeStockPolicySetting` — ghi rõ cấu hình trước khi assert. |
| `04_4_kiem_kho` | `04_4_070_003` | 🔴 Giá vốn ghi trên đơn khi không còn lô là câu hỏi số tiền — ghi rõ hệ thống lấy giá nào. |
| `04_4_kiem_kho` | `04_4_070_004` | 🔴 Sheet chỉ ghi "cho phép bán theo đúng cấu hình bán âm" — nhưng **serial không tồn tại thì không có gì để chọn**. |
| `04_4_kiem_kho` | `04_4_070_004` | Phải đo: hệ thống bỏ qua ràng buộc serial, hay chặn. |
| `04_4_kiem_kho` | `04_4_070_004` | Đây là mâu thuẫn giữa chính sách bán âm và quản lý serial, 🚫 không đoán. |
| `04_4_kiem_kho` | `04_4_070_005` | giá vốn sau bù âm phải đối chiếu bằng tay (bù âm trước, phần dư mới thành tồn dương). |
| `04_5_quan_ly_ton_kho` | `04_5_010_002` | 🔴 Ba ô tổng hợp phải **tính lại theo phần đang lọc** — nếu chúng giữ số của toàn kho thì là lỗi, ghi phiếu. |
| `04_5_quan_ly_ton_kho` | `04_5_010_003` | 🔴 Danh mục phải đọc từ `CHAIN_PRODUCTS`, 🚫 cấm `SHOP_PRODUCTS`. |
| `04_5_quan_ly_ton_kho` | `04_5_010_004` | Vai `province` thấy danh sách điểm bán thuộc tỉnh mình; |
| `04_5_quan_ly_ton_kho` | `04_5_010_004` | vai `shop` chỉ thấy điểm bán của mình (hoặc ô bị khoá). |
| `04_5_quan_ly_ton_kho` | `04_5_010_004` | 🔴 Danh sách phải khớp phạm vi của vai — thiếu filter phạm vi thì backend trả TOÀN BỘ pod, không phải rỗng. |
| `04_5_quan_ly_ton_kho` | `04_5_010_005` | 🔴 Cột đơn vị: nhãn đơn vị có thể lệch số tồn nếu biến thể thiếu `convert_to_main_unit = 1` — đối chiếu phải biết bẫy này. |
| `04_5_quan_ly_ton_kho` | `04_5_010_007` | 🔴 Xuất Excel NXT chạy nền ở `export-service` và SQL sinh tự động từ mapper — nếu số lệch thì kiểm mapper, 🚫 đừng sửa query tay. |
| `04_5_quan_ly_ton_kho` | `04_5_020_002` | 🔴 Case GHI — kho tạo ra không xoá được nếu đã phát sinh giao dịch. |
| `04_5_quan_ly_ton_kho` | `04_5_020_005` | Mỗi ô bắt buộc khác cho một thông báo riêng — lấy nguyên văn từ code, 🚫 không gộp thành một case. |
| `04_5_quan_ly_ton_kho` | `04_5_020_008` | 🔴 Sheet QC chỉ ghi "Báo hiển thị trạng thái kho đã off" — phải đo và ghi rõ: kho tắt bị **ẩn khỏi** ô chọn, hay vẫn hiện kèm nhãn tắt, hay chọn được rồi mới báo lỗi. |
| `04_5_quan_ly_ton_kho` | `04_5_020_010` | 🔴 Sheet QC để ngỏ: *"Xoá kho thành công - Số lượng còn lại trong kho ?"* — chính người viết cũng không biết. |
| `04_5_quan_ly_ton_kho` | `04_5_020_010` | Phải đo và ghi rõ: kho đang có tồn thì bị chặn, hay xoá được và **tồn đi đâu**. |
| `04_5_quan_ly_ton_kho` | `04_5_020_010` | 🚫 Không đoán — đây là câu hỏi mất hàng. |
| `04_5_quan_ly_ton_kho` | `04_5_020_011` | 🔴 Sheet QC ghi kỳ vọng là *"Thêm kho mới thành 1 HUB trực thuộc"* — đó là kỳ vọng của `FUNC_1_226` (thêm kho khi tỉnh chưa có HUB), **chép nhầm**. |
| `04_5_quan_ly_ton_kho` | `04_5_020_012` | 🔴 Sheet QC ghi kỳ vọng là *"Check lại"* — **không phải kỳ vọng**, là ghi chú của người viết. |
| `04_5_quan_ly_ton_kho` | `04_5_020_016` | 🔴 Đây là kỳ vọng thật của `FUNC_1_226`; |
| `04_5_quan_ly_ton_kho` | `04_5_020_016` | `FUNC_1_221` đã chép nhầm kỳ vọng này (xem `04_5_020_011`). |
| `04_5_quan_ly_ton_kho` | `04_5_030_002` | Lấy đúng danh sách thành phần từ code. |
| `04_5_quan_ly_ton_kho` | `04_5_030_004` | 🔴 Backend tìm theo TỪ, không theo chuỗi con — 🚫 đừng assert "mọi dòng chứa nguyên văn từ khoá". |
| `04_5_quan_ly_ton_kho` | `04_5_030_006` | 🔴 Nếu ô tìm không nhận barcode thì đối chiếu với `FUNC_1_202` của phân hệ `04_1` (cùng vấn đề barcode) rồi báo chung một mục. |
| `04_5_quan_ly_ton_kho` | `04_5_030_008` | 🔴 Bẫy đã gặp thật: **tồn đầu kỳ bị đếm hai lần** ở DW. |
| `04_5_quan_ly_ton_kho` | `04_5_030_008` | Nếu số gấp đôi thì không phải lỗi test — ghi phiếu ngay. |
| `04_5_quan_ly_ton_kho` | `04_5_030_009` | 🔴 Số NXT ở DW phải đo bằng **post − pre**, 🚫 không lấy `quantity`; |
| `04_5_quan_ly_ton_kho` | `04_5_030_009` | và phiếu con của phiên kiểm kho bị đếm đôi vào thẻ kho — nếu lệch thì kiểm hai chỗ này trước. |
| `04_5_quan_ly_ton_kho` | `04_5_030_010` | Tổng xuất = tổng số lượng các giao dịch xuất trong khoảng, cùng lưu ý về post − pre và phiếu con kiểm kho như `04_5_030_009`. |
| `04_5_quan_ly_ton_kho` | `04_5_030_011` | 🔴 Đây là **đẳng thức chốt chặn của cả màn** — lệch là một trong ba bẫy DW đã biết: thiếu `FINAL` (đếm đôi), tồn đầu kỳ đếm hai lần, hoặc phiếu con kiểm kho vào thẻ kho. |
| `04_5_quan_ly_ton_kho` | `04_5_050_001` | 🔴 Bốn case `FUNC_1_1`–`4` nằm ở đầu sheet `quan_ly_kho` nhưng **không thuộc nhóm nào** — thực chất là case đăng nhập/phân quyền, trùng nghiệp vụ với phân hệ `31_quan_ly_phan_quyen`. |
| `04_5_quan_ly_ton_kho` | `04_5_050_001` | Giữ ở đây để không bỏ lọt, xem nhận xét tay. |
| `07_1_cau_hinh_chung` | `07_1_010_007` | số thập phân bị làm tròn về nguyên hoặc bị chặn — ghi rõ cách chặn. |
| `07_1_cau_hinh_chung` | `07_1_030_006` | 🔴 Phơi hành vi thật: ô Mô tả không bắt buộc nên chuỗi khoảng trắng có thể lưu được, làm bộ đếm ký tự hiện 10/200 mà nội dung rỗng. |
| `07_1_cau_hinh_chung` | `07_1_030_006` | Ghi lại có trim hay không. |
| `07_1_cau_hinh_chung` | `07_1_050_004` | 🔴 Nếu giá trị đang sửa dở vẫn còn thì người dùng dễ tưởng đã lưu — ghi phiếu. |
| `07_1_cau_hinh_chung` | `07_1_050_005` | 🔴 Case ghi — cấu hình áp cho cả đơn vị. |
| `07_1_cau_hinh_chung` | `07_1_060_001` | 🔴 Đây là nhóm cấu hình **thứ 2** trong menu mà HDSD 07_1 không nhắc — chỉ nói về "Làm tròn tiền". |
| `07_1_cau_hinh_chung` | `07_1_060_001` | Phải ghi rõ: nhóm này có những ô nào, khác "Làm tròn tiền" ở đâu, và **áp cho những con số nào** (giá vốn? thành tiền phiếu kho?). |
| `07_1_cau_hinh_chung` | `07_1_060_002` | Bẫy đã biết: **key tiền vs key số lượng và thứ tự làm tròn**. |
| `07_2_cau_hinh_kho` | `07_2_010_008` | 🔴 Danh mục đọc từ `CHAIN_PRODUCTS`, 🚫 cấm `SHOP_PRODUCTS`. |
| `07_2_cau_hinh_kho` | `07_2_010_009` | 🔴 Sản phẩm tự doanh và sản phẩm TCT là hai tập khác nhau — xem `07_2_010_010`. |
| `07_2_cau_hinh_kho` | `07_2_010_011` | 🔴 Backend tìm theo TỪ không theo chuỗi con — 🚫 đừng assert "mọi dòng chứa nguyên văn từ khoá". |
| `07_2_cau_hinh_kho` | `07_2_010_012` | Chỉ `tct` và `province` thấy và dùng được chức năng cài đặt khoá kho; |
| `07_2_cau_hinh_kho` | `07_2_010_012` | `ward` và `shop` bị chặn (ẩn nút hoặc không vào được nhóm). |
| `07_2_cau_hinh_kho` | `07_2_010_012` | 🔴 Đối chiếu với `07_2_PQ_001` đang khai vai tỉnh **vào được** — hai case phải nhất quán. |
| `07_2_cau_hinh_kho` | `07_2_060_005` | Ghi rõ hệ thống xử lý thế nào. |
| `07_2_cau_hinh_kho` | `07_2_060_006` | 🔴 Ghi rõ trường hợp chênh lệch **tăng** có bị chặn không — sheet không phân biệt. |
| `07_2_cau_hinh_kho` | `07_2_060_008` | 🔴 Sheet QC gán nhãn lệch: `FUNC_1_404` ghi tên *"xuất kho với sản phẩm bỏ khoá"* nhưng kỳ vọng là *"Nhập kho thành công"*, còn `FUNC_1_405` thì ngược lại. |
| `07_2_cau_hinh_kho` | `07_2_060_008` | Đã viết lại theo kỳ vọng, xem nhận xét tay. |
| `07_2_cau_hinh_kho` | `07_2_070_001` | 🔴 Phần "tỉnh khác không bị chặn" là nửa quan trọng mà sheet không nói — thiếu nửa này thì không biết phạm vi có bị nở ra toàn hệ thống. |
| `07_2_cau_hinh_kho` | `07_2_070_004` | Đối chiếu với `07_2_020_005` (một sản phẩm bị nhiều cấu hình khoá cùng lúc). |
| `07_2_cau_hinh_kho` | `07_2_070_005` | 🔴 Sản phẩm mới thêm vào danh mục SAU khi khoá có bị chặn không? Sheet không nói — ghi rõ khi đo. |
| `07_2_cau_hinh_kho` | `07_2_080_001` | 🔴 Đây là câu hỏi số tiền cốt lõi của bán âm — đối chiếu bằng tay. |
| `07_2_cau_hinh_kho` | `07_2_080_002` | Tính tay từng phần để đối chiếu; |
| `07_2_cau_hinh_kho` | `07_2_080_002` | 🚫 không chấp nhận một giá bình quân duy nhất. |
| `07_2_cau_hinh_kho` | `07_2_080_003` | 🔴 Kỳ vọng trong sheet là **chép nhầm** của case thêm danh mục: *"Hiển thị message đỏ dưới trường Nhập tên danh mục"*. |
| `07_2_cau_hinh_kho` | `07_2_080_003` | Phải viết theo nghiệp vụ: ghi rõ giá vốn tạm tính lấy ở đâu khi tồn đã âm sẵn. |
| `07_2_cau_hinh_kho` | `07_2_080_003` | 🚫 Không chép kỳ vọng sai. |
| `07_2_cau_hinh_kho` | `07_2_080_004` | Bước 2: message theo khuôn `Tên danh mục "<tên>" đã tồn tại`. |
| `07_2_cau_hinh_kho` | `07_2_080_004` | 🔴 Hai case `dong24` `dong25` bị đặt trong nhóm *"ghi nhận giá vốn tạm"* của sheet nhưng nội dung là **quản lý danh mục** — file sheet bị lẫn nội dung, xem nhận xét tay. |
| `07_3_don_hang_va_thanh_toan` | `07_3_010_004` | 🔴 Không có giới hạn trên thì nhập 9999 ngày (27 năm) vẫn lưu — đáng báo. |
| `07_3_don_hang_va_thanh_toan` | `07_3_040_003` | 🔴 Ghi rõ hành vi với đơn **đang mở dở** đã chọn phương thức đó trước khi tắt — đơn đó có bị kẹt không. |
| `07_3_don_hang_va_thanh_toan` | `07_3_040_004` | 🔴 Phơi hành vi thật: hệ thống nên chặn tắt hết (không còn cách thu tiền nào). |
| `07_3_don_hang_va_thanh_toan` | `07_3_040_004` | Nếu lưu được thì quầy không bán được hàng — lỗi nghiêm trọng, ghi phiếu. |
| `07_4_van_hanh` | `07_4_020_003` | 🔴 Khi cấu hình đang tắt, phiếu thuộc khoảng tiền đó **không đi qua luồng duyệt** — ghi rõ phiếu được duyệt thẳng hay bị kẹt. |
| `07_4_van_hanh` | `07_4_020_004` | 🔴 Phiếu **đang chờ duyệt dở** theo cấu hình cũ đi theo luồng nào? Sheet không nói — ghi rõ khi đo. |
| `07_4_van_hanh` | `07_4_050_008` | 🔴 Đối chiếu: phân hệ `04_1` **không có** phép kiểm Min ≤ Max cho ngưỡng cảnh báo — hai màn không nhất quán, đáng báo. |
| `07_4_van_hanh` | `07_4_050_009` | Phiếu 4 triệu đi theo **cấu hình có nhiều bước duyệt hơn** (khoảng B, 2 bước) — theo đúng kỳ vọng sheet. |
| `07_4_van_hanh` | `07_4_050_009` | 🔴 Ghi rõ hệ thống có cho lưu hai khoảng giao thoa hay chặn ngay lúc lưu. |
| `07_4_van_hanh` | `07_4_050_010` | 🔴 Ghi rõ phiếu bị kẹt hay được duyệt thẳng — đây là lỗ hổng dễ làm phiếu treo mãi. |
| `07_4_van_hanh` | `07_4_050_012` | 🔴 Nếu thấy được thì vai bước 2 có thể duyệt vượt cấp — lỗi kiểm soát, ghi phiếu ngay. |
| `07_4_van_hanh` | `07_4_050_015` | 🔴 Sheet viết sai chính tả "Báo không có duyển từ chối" — viết lại theo nghiệp vụ. |
| `07_4_van_hanh` | `07_4_050_016` | 🔴 Phiếu **đang chờ ở đúng bước vừa bị xoá** đi đâu? Sheet không nói — ghi rõ khi đo, đây là nguồn phiếu treo. |
| `08_quan_ly_san_pham` | `08_020_005` | Ghi rõ cách ẩn (ẩn hẳn / disabled). |
| `08_quan_ly_san_pham` | `08_020_007` | Ghi rõ hành vi: cột SKU/Barcode của bảng quy đổi có bị ẩn, nhân bản theo biến thể, hay giữ nguyên. |
| `08_quan_ly_san_pham` | `08_020_007` | 🔴 Đây là chỗ sinh ra lỗi **biến thể không có parent_id = 0** và **biến thể thiếu convert_to_main_unit = 1** — hai bẫy đã gặp thật, phải ghi rõ dữ liệu sinh ra thế nào. |
| `08_quan_ly_san_pham` | `08_020_009` | 🔴 Nếu sau khi xoá biến thể mà dòng quy đổi mất `convert_to_main_unit` thì tồn kho sẽ hiển thị sai đơn vị — kiểm bằng cách lưu rồi mở lại. |
| `08_quan_ly_san_pham` | `08_020_010` | 🔴 Trường hợp khác hoa/thường: ghi rõ có chặn hay không — SKU là khoá nghiệp vụ nên kỳ vọng là chặn. |
| `08_quan_ly_san_pham` | `08_020_011` | 0 và số thập phân theo đúng `precision` khai trong code. |
| `08_quan_ly_san_pham` | `08_020_011` | 🔴 Lấy đúng `min`/`max`/`precision` của từng ô từ code trước khi assert. |
| `08_quan_ly_san_pham` | `08_020_012` | 🔴 Case ghi — danh mục tạo ra dùng chung toàn hệ thống. |
| `08_quan_ly_san_pham` | `08_020_014` | 🔴 Biến thể **không được có `parent_id = 0`** — bẫy đã gặp; |
| `08_quan_ly_san_pham` | `08_020_014` | kiểm bằng cách xem biến thể có gắn đúng sản phẩm cha. |
| `08_quan_ly_san_pham` | `08_020_015` | 🔴 Đây là tổ hợp sinh ra nhiều lỗi đơn vị nhất — kiểm cả `convert_to_main_unit` của từng tổ hợp. |
| `08_quan_ly_san_pham` | `08_020_016` | 🔴 Ghi rõ sản phẩm đó có xuất hiện khi lọc theo danh mục **con** hay không — ảnh hưởng mọi báo cáo theo danh mục. |
| `08_quan_ly_san_pham` | `08_020_018` | 🔴 Lấy đúng giới hạn số ảnh và dung lượng từ code, 🚫 không đoán. |
| `08_quan_ly_san_pham` | `08_020_019` | Lấy nguyên văn từ hệ thống. |
| `08_quan_ly_san_pham` | `08_030_004` | 🚫 Không gộp thành một case. |
| `08_quan_ly_san_pham` | `08_030_006` | 🔴 Ghi rõ Barcode có bị ràng buộc duy nhất giống SKU hay không — nếu không thì đây là lỗ hổng vì Barcode dùng để quét bán hàng. |
| `08_quan_ly_san_pham` | `08_030_008` | 🔴 Ghi rõ SKU của sản phẩm sau khi mất hết biến thể là SKU nào. |
| `08_quan_ly_san_pham` | `08_030_009` | 🔴 Case gốc `dong45` **không có kỳ vọng rõ**. |
| `08_quan_ly_san_pham` | `08_030_009` | Phải đo: hệ thống chặn (đúng nghiệp vụ, vì xoá là mất lịch sử kho) hay cho xoá. |
| `08_quan_ly_san_pham` | `08_030_010` | đơn vị gốc (`convert_to_main_unit = 1`) KHÔNG được xoá — ghi rõ hệ thống có bảo vệ đơn vị gốc hay không. |
| `08_quan_ly_san_pham` | `08_030_011` | Ghi rõ hệ thống chặn ở đâu. |
| `08_quan_ly_san_pham` | `08_030_012` | 🔴 Case gốc `dong48` **không có kỳ vọng rõ**. |
| `08_quan_ly_san_pham` | `08_030_012` | Phải đo rồi user chốt. |
| `08_quan_ly_san_pham` | `08_030_014` | 🔴 Nếu xoá được thì lịch sử kho và báo cáo sẽ mất tham chiếu sản phẩm — lỗi nghiêm trọng, ghi phiếu. |
| `08_quan_ly_san_pham` | `08_030_017` | với sản phẩm thường lấy nguyên văn tương ứng từ hệ thống. |
| `08_quan_ly_san_pham` | `08_030_019` | với sản phẩm thường lấy nguyên văn tương ứng. |
| `08_quan_ly_san_pham` | `08_030_020` | lấy nguyên văn thông báo. |
| `08_quan_ly_san_pham` | `08_040_001` | 🔴 Backend tìm theo TỪ không theo chuỗi con — 🚫 đừng assert "mọi dòng chứa nguyên văn từ khoá". |
| `08_quan_ly_san_pham` | `08_040_003` | Ghi rõ có tìm được cả SKU của **biến thể** và của **đơn vị quy đổi** hay chỉ SKU sản phẩm gốc. |
| `08_quan_ly_san_pham` | `08_040_005` | Lấy đúng danh sách trạng thái từ code (tối thiểu có đang kích hoạt / ngừng kích hoạt). |
| `08_quan_ly_san_pham` | `08_040_006` | 🔴 Với hàng **ký gửi**, giá phải lọc theo khu vực shop và `import_price` **đã gồm VAT** — hai bẫy đã gặp, kiểm khi mở chi tiết sản phẩm ký gửi. |
| `08_quan_ly_san_pham` | `08_050_001` | 🔴 Nửa "phạm vi khác vẫn bán được" là nửa sheet không nói — thiếu nó thì không biết phạm vi có nở ra toàn hệ thống. |
| `08_quan_ly_san_pham` | `08_050_003` | 🔴 Hai nửa đều phải kiểm. |
| `08_quan_ly_san_pham` | `08_050_004` | cấu hình ngừng kích hoạt cũ bị bỏ hoặc hết hiệu lực — ghi rõ cách nào. |
| `08_quan_ly_san_pham` | `08_060_007` | 🔴 `dong21` và `dong24` trong sheet **để trống cột tình huống** (chỉ có mã, không có nội dung) ⇒ không biết chúng kiểm gì. |
| `08_quan_ly_san_pham` | `08_060_007` | 🚫 Không đoán nội dung case gốc. |
| `08_quan_ly_san_pham` | `08_060_008` | Trùng tên: message theo khuôn `Tên danh mục "<tên>" đã tồn tại`. |
| `08_quan_ly_san_pham` | `08_060_008` | 🔴 Toàn khoảng trắng: ghi rõ có bị chặn không (nếu không thì tạo được danh mục không tên). |
| `08_quan_ly_san_pham` | `08_060_009` | 🔴 Sáu case gốc `dong27` `dong30` `dong31` `dong32` `dong33` `dong34` **để trống cột tình huống**. |
| `08_quan_ly_san_pham` | `08_060_009` | 🚫 Không đoán. |
| `08_quan_ly_san_pham` | `08_060_011` | Ghi phiếu nếu không chặn. |
| `08_quan_ly_san_pham` | `08_060_013` | 🔴 Nếu xoá được thì sản phẩm mất danh mục ⇒ mọi báo cáo theo danh mục sai, ghi phiếu. |
| `08_quan_ly_san_pham` | `08_060_014` | Ghi rõ hệ thống **xoá cả cây con** hay **chặn vì còn danh mục con**. |
| `08_quan_ly_san_pham` | `08_060_017` | 🔴 ghi rõ cây có tự mở tới danh mục khớp hay chỉ hiện dạng danh sách phẳng. |
| `08_quan_ly_san_pham` | `08_060_023` | 🔴 Ghi rõ hệ thống **nhận phần hợp lệ và bỏ phần lỗi**, hay **từ chối cả file**. |
| `08_quan_ly_san_pham` | `08_060_024` | 🔴 Đối chiếu cột của file mẫu với lý do lỗi ở `08_060_022` — lệch cột là nguồn lỗi import hàng loạt. |
| `08_quan_ly_san_pham` | `08_060_025` | 🔴 Kiểm cả việc file xuất ra có **import lại được** hay không (cùng bộ cột với file mẫu). |
| `08_quan_ly_san_pham` | `08_060_026` | ô nào bị khoá không sửa được thì ghi rõ. |
| `08_quan_ly_san_pham` | `08_060_026` | 🔴 `dong15` xuất hiện HAI LẦN trong sheet với nội dung y hệt — chỉ dựng một case (luật 2 của bàn giao: không dựng lại case trùng). |
| `08_quan_ly_san_pham` | `08_090_003` | 🔴 Ghi rõ combo có xuất hiện khi lọc theo danh mục **con** hay không — cùng câu hỏi với `08_020_016`. |
| `08_quan_ly_san_pham` | `08_090_005` | 🔴 Phải ghi rõ hệ thống **chặn**, **gộp số lượng**, hay **cho hai dòng trùng**. |
| `08_quan_ly_san_pham` | `08_090_005` | 🚫 Không đoán. |
| `08_quan_ly_san_pham` | `08_090_007` | Cùng câu hỏi với `08_090_005` ở mức biến thể — ghi rõ chặn / gộp / cho trùng. |
| `08_quan_ly_san_pham` | `08_090_008` | Nếu chỉ chặn trong cùng loại thì quét mã vạch ở quầy sẽ nhập nhằng, ghi phiếu. |
| `08_quan_ly_san_pham` | `08_090_010` | 🔴 Case ghi. |
| `09_san_pham_san_xuat` | `09_010_004` | 🚫 Không gộp thành một case bỏ trống hết. |
| `09_san_pham_san_xuat` | `09_010_005` | số thập phân theo đúng `precision` khai trong code; |
| `09_san_pham_san_xuat` | `09_010_005` | số rất lớn bị chặn ở bước xác nhận vì thiếu nguyên liệu (nối với `09_030_006`). |
| `09_san_pham_san_xuat` | `09_010_005` | 🔴 Lấy đúng min/max/precision từ code. |
| `09_san_pham_san_xuat` | `09_010_006` | Tính tay để đối chiếu. |
| `09_san_pham_san_xuat` | `09_010_006` | 🔴 `quantity` đã là số theo đơn vị gốc — 🚫 không nhân thêm `convert_to_main_unit`. |
| `09_san_pham_san_xuat` | `09_010_007` | 🔴 Phơi hành vi thật: ghi rõ hệ thống cho sửa tay hay khoá theo công thức. |
| `09_san_pham_san_xuat` | `09_020_003` | 🔴 Số serial phải **bằng số lượng** thành phẩm — kiểm cả trường hợp nhập thiếu và nhập thừa serial. |
| `09_san_pham_san_xuat` | `09_040_006` | 🔴 Nhập thành phẩm sản xuất từng bị **bóc VAT sai** — kiểm cả giá vốn ghi vào phiếu nhập. |
| `10_bang_gia_ban_san_pham` | `10_020_004` | 🔴 Đây là toast ở mức form, 🚫 không phải lỗi dưới từng ô — đừng tìm `.ant-form-item-explain-error`. |
| `10_bang_gia_ban_san_pham` | `10_020_006` | 🔴 Bảng giá có hiệu lực tới GIỜ, không chỉ tới ngày — xem `10_130_006`. |
| `10_bang_gia_ban_san_pham` | `10_020_007` | 🔴 Bảng giá ngừng kích hoạt **không được áp giá ở quầy** — kiểm bằng `10_130_003`. |
| `10_bang_gia_ban_san_pham` | `10_030_006` | 🔴 Hợp lý vì đổi hình thức là đổi cả tập sản phẩm hợp lệ — nhưng ghi rõ có thông báo giải thích cho người dùng hay không. |
| `10_bang_gia_ban_san_pham` | `10_050_004` | 🔴 Bảng giá chờ phê duyệt **chưa được áp giá ở quầy** — kiểm bằng `10_130_003`. |
| `10_bang_gia_ban_san_pham` | `10_070_002` | 🔴 Đếm số đơn vị được tích và đối chiếu với số đơn vị thật của tỉnh — thiếu một đơn vị là bảng giá không áp cho nơi đó. |
| `10_bang_gia_ban_san_pham` | `10_080_002` | 🔴 Ghi rõ cột nào khác — đây là chỗ quyết định số nào là giá trước thuế, số nào sau thuế. |
| `10_bang_gia_ban_san_pham` | `10_080_003` | 🔴 Với ký gửi, `import_price` **ĐÃ gồm VAT** — 🚫 đừng bóc VAT lần nữa khi đối chiếu số. |
| `10_bang_gia_ban_san_pham` | `10_080_007` | 🔴 Đối chiếu số phải biết mình đang đọc bảng nào. |
| `10_bang_gia_ban_san_pham` | `10_080_008` | 🔴 Ghi rõ combo trong bảng bị **xoá**, **giữ nguyên giá**, hay **tính lại giá** — ba cách cho ba con số khác nhau. |
| `10_bang_gia_ban_san_pham` | `10_090_003` | 🔴 Bảng giá mua bán và ký gửi là hai tập sản phẩm tách biệt — kiểm cả chiều ngược lại ở `10_110_003`. |
| `10_bang_gia_ban_san_pham` | `10_090_010` | 🔴 Ghi rõ hệ thống nhận phần hợp lệ hay từ chối cả file. |
| `10_bang_gia_ban_san_pham` | `10_100_001` | 🔴 Ghi rõ ô nào bị sửa tự động — người dùng dễ tưởng mình nhập sai. |
| `10_bang_gia_ban_san_pham` | `10_100_003` | tính tay để đối chiếu. |
| `10_bang_gia_ban_san_pham` | `10_100_003` | 🔴 Chia Decimal ở ClickHouse giữ scale 2 làm cụt tỷ lệ % — nếu đối chiếu qua báo cáo thì biết bẫy này. |
| `10_bang_gia_ban_san_pham` | `10_100_004` | ghi rõ giá bán bị tính lại thành bao nhiêu (chiết khấu 100% nghĩa là giá bán 0). |
| `10_bang_gia_ban_san_pham` | `10_100_005` | ghi rõ vì người dùng không được cảnh báo gì. |
| `10_bang_gia_ban_san_pham` | `10_120_002` | 🔴 Nếu sản phẩm không thuộc bảng giá nào khác thì **không bán được** — xem `10_130_003`. |
| `10_bang_gia_ban_san_pham` | `10_130_001` | 🔴 Doanh thu ghi nhận **trước VAT** — đối chiếu cả con số vào báo cáo. |
| `10_bang_gia_ban_san_pham` | `10_130_002` | 🔴 So sánh trực tiếp với `10_130_001` — hai bảng giá cùng số tiền nhưng doanh thu khác nhau. |
| `10_bang_gia_ban_san_pham` | `10_130_003` | báo lỗi nguyên văn `Sản phẩm: [Tên sản phẩm] chưa nằm trong bảng giá nào có hiệu lực tại điểm bán`. |
| `10_bang_gia_ban_san_pham` | `10_130_004` | Không thêm được, báo lỗi nguyên văn `Sản phẩm: [Tên sản phẩm] chưa nằm trong bảng giá nào có hiệu lực tại điểm bán`. |
| `10_bang_gia_ban_san_pham` | `10_130_005` | giá lấy từ bảng giá có **ngày bắt đầu muộn nhất** (bảng giá mới nhất thắng) — 🔴 xác nhận đúng quy tắc này từ hệ thống rồi mới assert, 🚫 đừng đoán. |
| `10_bang_gia_ban_san_pham` | `10_130_006` | 🔴 Đây là lý do `10_020_006` (giờ kết thúc trước giờ bắt đầu) quan trọng — hiệu lực tính tới GIỜ. |
| `10_bang_gia_ban_san_pham` | `10_130_008` | 🔴 Với bảng giá đã gồm VAT, note ở `10_080_004` nói hệ thống tự tính — đối chiếu con số doanh thu. |
| `11_khuyen_mai` | `11_090_007` | 🔴 Case gốc `dong103` TRỐNG cột tình huống trong sheet — chỉ có bước và kỳ vọng. |
| `11_khuyen_mai` | `11_090_007` | 🔴 Doanh thu ghi nhận TRƯỚC VAT — đối chiếu cả con số vào báo cáo, không chỉ số trên bill. |
| `11_khuyen_mai` | `11_120_004` | Tiền CK của các CTKM khuyến mại giảm toàn đơn = 500*(10%+3%) + 50k + 15k = 130k -> Giá trị còn lại của đơn = 370k Tiếp tục tính toán tiền CK của các CTKM khuyến mại giảm sau CT khác = 370k*(5%+2%)=25,9k => Thông tin đơn hiển thị như sau: - Tổng tiền: 500,000 đ - Chiết khấu đơn hàng: 0 đ - Chiết khấu khuyến mãi: 155,900 đ - Cần thanh toán: 344,100 đ 2. |
| `12_1_ho_so_nha_cung_cap` | `12_1_040_001` | 🔴 Case gốc `NCC_1` nằm ở ĐẦU sheet với cột nhóm TRỐNG nên rơi vào phân hệ mặc định; |
| `12_1_ho_so_nha_cung_cap` | `12_1_040_001` | nghiệp vụ thật là đăng nhập, trùng với `31_quan_ly_phan_quyen` và `04_5_050_*`. |
| `12_1_ho_so_nha_cung_cap` | `12_1_040_001` | 🚫 Sheet ghi thẳng số điện thoại và mật khẩu mẫu — KHÔNG chép vào `test-input.json`, secret nằm ở `.env`. |
| `13-cong-no-diem-ban-tinh` | `CNDB-CD-011` | 🔴 Phiếu `HANDED_OVER` ĐÃ tính là đã nộp — 🚫 đừng chặn ký theo phiếu treo. |
| `13-cong-no-diem-ban-tinh` | `CNDB-KY-010` | 🔴 Phơi hành vi thật: căn cứ là **bằng chứng của bút toán nợ đầu kỳ** — chuỗi khoảng trắng không phải căn cứ. |
| `13-cong-no-diem-ban-tinh` | `CNDB-KY-010` | Ghi rõ có trim và có chặn hay không. |
| `13-cong-no-diem-ban-tinh` | `CNDB-KY-012` | 🔴 **Phiếu nộp tiền lọc theo MÃ ĐƠN VỊ chụp trên phiếu**, 🚫 cấm nở theo shop hiện tại — bẫy đã gặp. |
| `13-cong-no-diem-ban-tinh` | `CNDB-ND-010` | 🔴 Ghi rõ từng biên: 0 có được coi là "đã khai" (khác với chưa khai) hay bị chặn; |
| `13-cong-no-diem-ban-tinh` | `CNDB-ND-010` | số âm phải bị chặn vì nợ đầu kỳ âm nghĩa là điểm bán ứng trước — cần user chốt. |
| `13-cong-no-diem-ban-tinh` | `CNDB-PQ-003` | Vai `tct` thấy **nhiều tỉnh**; |
| `13-cong-no-diem-ban-tinh` | `CNDB-PQ-003` | vai `province` chỉ thấy tỉnh của mình. |
| `13-cong-no-diem-ban-tinh` | `CNDB-PQ-003` | 🔴 Thiếu filter phạm vi thì backend trả **TOÀN BỘ pod**, không phải rỗng — bẫy đã gặp, phải kiểm bằng con số cụ thể. |
| `13_1_phieu_de_xuat_va_phe_duyet` | `13_1_050_001` | - Nút Xem danh sách/ Ẩn danh sách - Dòng Danh sách shopId đã chọn - Cột 1- Cấp tổng công ty/ Cấp tỉnh: Hiển thị ô Tìm kiếm, Danh sách Tỉnh, Icon mũi tên hiển thị các cấp nhỏ - Cột 2 - Cấp xã: + Mặc định khi chưa chọn cột 1 hiển thị chữ mờ "Vui lòng chọn Tỉnh/Tổng công ty trước". |
| `13_3_dat_hang_va_nhap_hang` | `13_3_050_001` | ⚠️ Sheet QC có BẢN TRÙNG y hệt ở mã `FUNC_1_300`, nằm trong nhóm *"Tổng hợp phiếu đề xuất đặt hàng"* (ánh xạ về phân hệ `13_1`). |
| `13_3_dat_hang_va_nhap_hang` | `13_3_050_002` | ⚠️ Sheet QC có BẢN TRÙNG y hệt ở mã `FUNC_1_301`, nằm trong nhóm *"Tổng hợp phiếu đề xuất đặt hàng"* (ánh xạ về phân hệ `13_1`). |
| `13_3_dat_hang_va_nhap_hang` | `13_3_050_003` | ⚠️ Sheet QC có BẢN TRÙNG y hệt ở mã `FUNC_1_302`, nằm trong nhóm *"Tổng hợp phiếu đề xuất đặt hàng"* (ánh xạ về phân hệ `13_1`). |
| `13_3_dat_hang_va_nhap_hang` | `13_3_050_004` | ⚠️ Sheet QC có BẢN TRÙNG y hệt ở mã `FUNC_1_303`, nằm trong nhóm *"Tổng hợp phiếu đề xuất đặt hàng"* (ánh xạ về phân hệ `13_1`). |
| `13_3_dat_hang_va_nhap_hang` | `13_3_050_005` | ⚠️ Sheet QC có BẢN TRÙNG y hệt ở mã `FUNC_1_304`, nằm trong nhóm *"Tổng hợp phiếu đề xuất đặt hàng"* (ánh xạ về phân hệ `13_1`). |
| `13_3_dat_hang_va_nhap_hang` | `13_3_050_006` | ⚠️ Sheet QC có BẢN TRÙNG y hệt ở mã `FUNC_1_305`, nằm trong nhóm *"Tổng hợp phiếu đề xuất đặt hàng"* (ánh xạ về phân hệ `13_1`). |
| `13_3_dat_hang_va_nhap_hang` | `13_3_050_007` | ⚠️ Sheet QC có BẢN TRÙNG y hệt ở mã `FUNC_1_306`, nằm trong nhóm *"Tổng hợp phiếu đề xuất đặt hàng"* (ánh xạ về phân hệ `13_1`). |
| `14_1_lap_va_duyet_phieu_xuat_tra` | `14_1_010_025` | Ghi lại giá trị thực tế hệ thống chấp nhận để đối chiếu với đặc tả |
| `14_1_lap_va_duyet_phieu_xuat_tra` | `14_1_060_003` | request GET /stock/v2/import-export/find mang objectId = id NCC và objectType = SUPPLIER |
| `14_1_lap_va_duyet_phieu_xuat_tra` | `14_1_060_004` | request mang tham số code = chuỗi đã gõ, type=EXPORT, subType=RETURN_TO_SUPPLIER |
| `14_1_lap_va_duyet_phieu_xuat_tra` | `14_1_060_013` | 🔴 Đây là chặn bằng UI, KHÔNG có thông báo lỗi — sheet QC ghi kỳ vọng "Hiển thị là số lượng max có thể trả" đúng với hành vi này |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_010_017` | Phiếu nguồn khép ở "Đã gom phiếu" vĩnh viễn — đây là hành vi đúng theo HDSD, case này để chốt lại với QC |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_050_006` | Đây là điểm HDSD 050 nói "hàng không di chuyển" 🚫 KHÔNG bao — xem mục lỗ hổng |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_060_007` | 🔴 Ghi nhận thành công, KHÔNG bị chặn — placeholder ghi rõ "Lý do từ chối (tuỳ chọn)". |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_060_007` | HDSD 060 bước 5 viết "Nhập lý do từ chối ... |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_060_007` | rồi bấm OK" ngụ ý bắt buộc ⇒ lệch đặc tả |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_011` | HDSD 010 ghi chuỗi khác hẳn: "Chỉ tiếp nhận hoá đơn điều chỉnh giảm cho hàng trả lại" — xem mục lỗ hổng |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_015` | HDSD ghi chuỗi khác: "Hoá đơn này đã được tiếp nhận cho một đợt trả khác" |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_016` | HDSD 020 ghi chuỗi khác: "Hoá đơn này đã được chốt chứng từ" |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_019` | HDSD 🚫 KHÔNG nói điều này |
| `14_3_hoa_don_hang_tra_lai` | `14_3_030_009` | FE vẫn bày lựa chọn này ⇒ 2/3 lựa chọn LUÔN thất bại — xem mục lỗ hổng |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_015` | Case này để chốt lại với QC |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_018` | Ghi lại hành vi thật: hệ thống có trim và coi là rỗng không. |
| `16_hang_ky_gui` | `16_010_012` | ép qua URL thì kết quả rỗng, 🚫 không phải lỗi 500 |
| `16_hang_ky_gui` | `16_030_018` | HDSD 030 viết như thể phải xử lý xong mới chốt được ⇒ xem mục lỗ hổng |
| `16_hang_ky_gui` | `16_030_020` | BE chặn với thông báo dạng "Không chốt được kỳ <id>: tồn đầu kỳ phải cộng dồn từ Thẻ kho, nhưng dữ liệu Thẻ kho trước ngày <ngày> đã bị dọn theo cấu hình tiering ..." 🔴 HDSD 🚫 KHÔNG nhắc trường hợp này |
| `16_hang_ky_gui` | `16_060_005` | Hệ thống tự bỏ đánh dấu chọn kỳ và nút "Đối chiếu với màn Đối soát kỳ" biến mất |
| `16_hang_ky_gui` | `16_070_001` | 🔴 HDSD 16 🚫 KHÔNG nhắc bước này lần nào — xem mục lỗ hổng |
| `17_quan_ly_quay_thu_ngan` | `17_010_012` | 🔴 ĐÃ CHỐT TỪ CODE: bị chặn với thông báo nguyên văn "Tên quầy thu ngân đã tồn tại" (COUNTER-005). |
| `17_quan_ly_quay_thu_ngan` | `17_010_012` | Sheet QC `dong57` ĐÚNG, HDSD tả thiếu ràng buộc này |
| `17_quan_ly_quay_thu_ngan` | `17_020_013` | 🔴 ĐÃ CHỐT TỪ CODE: bị chặn với thông báo nguyên văn "Tên quầy thu ngân đã tồn tại" (COUNTER-005). |
| `17_quan_ly_quay_thu_ngan` | `17_020_013` | Mâu thuẫn HDSD↔sheet QC nay giải quyết: sheet QC đúng |
| `17_quan_ly_quay_thu_ngan` | `17_030_003` | 🔴 ĐÃ CHỐT TỪ CODE: bị chặn với thông báo nguyên văn "Quầy đang có ca chưa chốt, vui lòng chốt ca trước" (COUNTER-003). |
| `17_quan_ly_quay_thu_ngan` | `17_050_004` | Hệ thống chặn — HDSD ghi rõ Quỹ chuyển "không được trùng với Quỹ nhận"; |
| `17_quan_ly_quay_thu_ngan` | `17_050_004` | số dư không đổi |
| `17_quan_ly_quay_thu_ngan` | `17_010_022` | BE trả lỗi nguyên văn "Thiếu shopId" |
| `17_quan_ly_quay_thu_ngan` | `17_020_014` | BE trả lỗi nguyên văn "Thiếu counterId" |
| `17_quan_ly_quay_thu_ngan` | `17_040_004` | 🚫 KHÔNG có prefix service (pod-service không đặt context-path) |
| `17_quan_ly_quay_thu_ngan` | `17_050_012` | Ghi lại thông báo thật — 🔴 HDSD 050 🚫 không nêu thông báo cho trường hợp này |
| `17_quan_ly_quay_thu_ngan` | `17_050_013` | 🔴 CHƯA CHỐT ĐƯỢC: HDSD 050 🚫 không ghi thông báo khi chuyển quá số dư, và `ShopFundService` 🚫 không ném PodException nào. |
| `17_quan_ly_quay_thu_ngan` | `17_050_013` | Chạy để lấy hành vi thật — nếu KHÔNG bị chặn thì đây là lỗ hổng: quỹ âm |
| `17_quan_ly_quay_thu_ngan` | `17_050_014` | Ghi lại hành vi thật. |
| `18_1_ban_hang_tai_quay` | `18_1_010_006` | Ghi lại hành vi thật để chốt với QC |
| `18_1_ban_hang_tai_quay` | `18_1_010_015` | 🔴 Nếu mất thì là lỗ hổng nghiêm trọng — mất đơn của khách đang đứng chờ |
| `18_1_ban_hang_tai_quay` | `18_1_010_019` | Ghi lại nguyên văn thông báo thật |
| `18_1_ban_hang_tai_quay` | `18_1_020_009` | Ghi lại hành vi thật. |
| `18_1_ban_hang_tai_quay` | `18_1_020_009` | 🔴 Dữ liệu VNPost trộn Anh–Việt nên tìm không dấu là thao tác thường ngày của giao dịch viên |
| `18_1_ban_hang_tai_quay` | `18_1_030_011` | Ghi lại xem hệ thống có cảnh báo gì không |
| `18_1_ban_hang_tai_quay` | `18_1_040_007` | Ghi lại nguyên văn thông báo thật |
| `18_1_ban_hang_tai_quay` | `18_1_050_003` | 🔴 Ghi lại xem hệ thống có chặn giá thấp hơn giá vốn hay giá sàn không |
| `18_1_ban_hang_tai_quay` | `18_1_050_004` | Ghi lại hành vi thật. |
| `18_1_ban_hang_tai_quay` | `18_1_050_004` | 🔴 Nếu cho phép giá âm thì đơn hàng trả tiền cho khách — lỗ hổng nghiêm trọng |
| `18_1_ban_hang_tai_quay` | `18_1_050_005` | Ghi lại hành vi thật: dòng hàng bị xoá, hay giữ ở 1, hay báo lỗi |
| `18_1_ban_hang_tai_quay` | `18_1_050_006` | Ghi lại hành vi thật; |
| `18_1_ban_hang_tai_quay` | `18_1_050_006` | khối tiền 🚫 không được tràn số hay hiện NaN |
| `18_1_ban_hang_tai_quay` | `18_1_060_019` | Ghi lại số lượng thật để chốt với QC — đây là chỗ dễ sai tiền nhất |
| `18_1_ban_hang_tai_quay` | `18_1_060_022` | Ghi lại nguyên văn — HDSD chỉ nêu "Không thể kết nối cân, vui lòng thử lại" |
| `18_1_ban_hang_tai_quay` | `18_1_060_023` | Ghi lại hành vi thật — nếu bị reset thì mất tiền của khách |
| `18_2_khach_hang_va_uu_dai` | `18_2_010_017` | Ghi lại hành vi thật — 🔴 giao dịch viên gõ không dấu là thao tác thường ngày |
| `18_2_khach_hang_va_uu_dai` | `18_2_020_035` | Công thức: Chiết khấu khuyến mãi = baseDiscount + afterDiscount. |
| `18_2_khach_hang_va_uu_dai` | `18_2_020_037` | Công thức: expectedOrderDiscount = làm tròn · expectedTotalDiscount = 20000 + expectedOrderDiscount. |
| `18_2_khach_hang_va_uu_dai` | `18_2_020_037` | Khối tiền hiện đúng: ô "Chiết khấu khuyến mãi" = expectedTotalDiscount. |
| `18_2_khach_hang_va_uu_dai` | `18_2_020_039` | Công thức: expectedOrderDiscount = làm tròn · expectedTotalDiscount = 4000 + expectedOrderDiscount. |
| `18_2_khach_hang_va_uu_dai` | `18_2_020_039` | Khối tiền hiện đúng: ô "Chiết khấu khuyến mãi" = expectedTotalDiscount. |
| `18_2_khach_hang_va_uu_dai` | `18_2_020_041` | Công thức: expectedOrderDiscount = làm tròn · expectedTotalDiscount = 24000 + expectedOrderDiscount. |
| `18_2_khach_hang_va_uu_dai` | `18_2_020_041` | Khối tiền hiện đúng: ô "Chiết khấu khuyến mãi" = expectedTotalDiscount. |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_006` | Ghi lại nguyên văn thông báo |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_013` | Ghi lại hành vi thật — 🔴 nếu phân biệt hoa thường thì khách gõ tay dễ bị từ chối oan |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_014` | Ghi lại hành vi thật: mã B thay mã A, hay cộng dồn, hay bị chặn. |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_014` | HDSD 🚫 không nói |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_005` | HDSD khuyên "hãy chọn đúng ngay từ đầu" ⇒ đây là hành vi đã biết, 🚫 không phải lỗi |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_016` | Ghi lại nếu ô nào KHÔNG trim — đó là lỗ hổng |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_020` | Đây là cách xử lý bình thường, 🚫 không phải lỗi — nhưng phải nói rõ với khách là họ cần quét mã để hoàn tất |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_007` | Ghi lại nguyên văn thông báo |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_008` | Ghi lại nguyên văn thông báo |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_009` | Ghi lại nguyên văn thông báo |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_010` | Ghi lại nguyên văn thông báo |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_011` | Ghi lại hành vi thật |
| `18_3_thanh_toan_va_bien_lai` | `18_3_020_003` | Ghi lại nguyên văn thông báo hiện lên |
| `18_3_thanh_toan_va_bien_lai` | `18_3_020_005` | Ghi lại nguyên văn thông báo |
| `18_3_thanh_toan_va_bien_lai` | `18_3_020_006` | Ghi lại hành vi thật |
| `18_3_thanh_toan_va_bien_lai` | `18_3_040_004` | Ghi lại nguyên văn trạng thái hiển thị |
| `18_3_thanh_toan_va_bien_lai` | `18_3_050_002` | Ghi lại nguyên văn thông báo hiện lên |
| `18_3_thanh_toan_va_bien_lai` | `18_3_050_009` | Ghi lại nguyên văn thông báo |
| `18_3_thanh_toan_va_bien_lai` | `18_3_050_010` | Ghi lại nguyên văn thông báo |
| `18_3_thanh_toan_va_bien_lai` | `18_3_080_003` | Ghi lại nguyên văn tooltip |
| `18_3_thanh_toan_va_bien_lai` | `18_3_100_001` | Ghi lại nguyên văn thông báo hoặc hành vi điều hướng |
| `18_4_quan_ly_don_hang` | `18_4_010_007` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `18_4_quan_ly_don_hang` | `18_4_010_008` | Ghi lại hành vi thật |
| `18_4_quan_ly_don_hang` | `18_4_010_009` | Ghi lại hành vi thật |
| `18_4_quan_ly_don_hang` | `18_4_010_012` | Ghi lại hành vi thật |
| `18_4_quan_ly_don_hang` | `18_4_020_006` | Ghi lại hành vi thật: có sinh file rỗng hay báo không có dữ liệu |
| `18_4_quan_ly_don_hang` | `18_4_030_001` | Điều hướng tới /order/created-orders/detail/:orderId/:shopId; |
| `18_4_quan_ly_don_hang` | `18_4_040_003` | Ghi lại nguyên văn thông báo hiện lên |
| `18_4_quan_ly_don_hang` | `18_4_040_004` | Ghi lại nguyên văn thông báo |
| `18_4_quan_ly_don_hang` | `18_4_050_002` | Ghi lại nguyên văn các lựa chọn |
| `18_4_quan_ly_don_hang` | `18_4_080_008` | Hiện message.success nguyên văn "Đã ghi nhận kết quả đối soát" |
| `18_4_quan_ly_don_hang` | `18_4_100_001` | Ghi lại hành vi thật: bị chặn vào màn hay vào được nhưng danh sách rỗng |
| `18_5_doi_tra_hang` | `18_5_150_001` | Ghi lại hành vi thật: ô có nhận số âm không, và tiền hoàn có bị cộng thêm không |
| `18_5_doi_tra_hang` | `18_5_150_002` | Ghi lại hành vi thật: bị chặn, hay tiền hoàn về 0, hay thành số âm |
| `18_5_doi_tra_hang` | `18_5_150_003` | Ghi lại nguyên văn thông báo |
| `18_5_doi_tra_hang` | `18_5_160_002` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `18_5_doi_tra_hang` | `18_5_160_004` | Ghi lại hành vi thật |
| `18_5_doi_tra_hang` | `18_5_PQ_002` | Ghi lại hành vi thật |
| `19_quan_ly_khach_hang` | `19_020_007` | Ghi lại nguyên văn thông báo lỗi ở ô Tên khách hàng |
| `19_quan_ly_khach_hang` | `19_020_008` | Ghi lại nguyên văn thông báo lỗi ở ô Số điện thoại |
| `19_quan_ly_khach_hang` | `19_020_009` | Ghi lại nguyên văn thông báo lỗi định dạng |
| `19_quan_ly_khach_hang` | `19_020_010` | Ghi lại nguyên văn thông báo lỗi định dạng email |
| `19_quan_ly_khach_hang` | `19_020_011` | Ghi lại hành vi thật |
| `19_quan_ly_khach_hang` | `19_020_012` | Ghi lại hành vi thật nếu không trim |
| `19_quan_ly_khach_hang` | `19_010_005` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `19_quan_ly_khach_hang` | `19_010_007` | Điều hướng tới /customer/detail/:customerId của đúng khách đó |
| `19_quan_ly_khach_hang` | `19_060_003` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `19_quan_ly_khach_hang` | `19_090_004` | Ghi lại nguyên văn thông báo yêu cầu chọn đơn hàng |
| `19_quan_ly_khach_hang` | `19_030_004` | Ghi lại nguyên văn thông báo lỗi |
| `19_quan_ly_khach_hang` | `19_030_005` | Ghi lại nguyên văn thông báo lỗi |
| `19_quan_ly_khach_hang` | `19_030_006` | Ghi lại nguyên văn thông báo lỗi định dạng email |
| `19_quan_ly_khach_hang` | `19_050_007` | Ghi lại nguyên văn nội dung popup. |
| `19_quan_ly_khach_hang` | `19_050_007` | Sheet QC đòi chuỗi bắt đầu bằng "Hành động này sẽ" — cần đối chiếu với chuỗi thật trong code |
| `19_quan_ly_khach_hang` | `19_130_006` | Ghi lại hành vi thật: hạng nâng theo phần đã trả hay chờ tất toán |
| `19_quan_ly_khach_hang` | `19_120_002` | Ghi lại hành vi thật |
| `19_quan_ly_khach_hang` | `19_120_003` | Ghi lại hành vi thật: có tìm ra khách tên có dấu hay không |
| `19_quan_ly_khach_hang` | `19_120_004` | Ghi lại hành vi thật |
| `20_khach_hang_than_thiet` | `20_010_003` | POST /loyalty/campaign/create-campaign trả code 200 với campaignType=0; |
| `20_khach_hang_than_thiet` | `20_010_004` | body gửi campaignType=1; |
| `20_khach_hang_than_thiet` | `20_010_005` | body gửi orderAmountConditional=300000; |
| `20_khach_hang_than_thiet` | `20_010_006` | Body gửi campaignType=1 kèm orderAmountConditional=300000; |
| `20_khach_hang_than_thiet` | `20_010_006` | 🔴 Ghi nhận: mức tối thiểu được so với TỔNG TIỀN CÁC DÒNG ĐƯỢC TÍCH ĐIỂM, không phải tổng đơn |
| `20_khach_hang_than_thiet` | `20_010_007` | Body gửi noPointForDiscountedProduct=true; |
| `20_khach_hang_than_thiet` | `20_010_008` | Body gửi campaignType=1 và noPointForDiscountedProduct=true; |
| `20_khach_hang_than_thiet` | `20_010_009` | Body gửi noPointForDiscountedInvoice=true; |
| `20_khach_hang_than_thiet` | `20_010_010` | Body gửi campaignType=1 và noPointForDiscountedInvoice=true; |
| `20_khach_hang_than_thiet` | `20_010_011` | Body gửi noPointForPointPaymentInvoice=true; |
| `20_khach_hang_than_thiet` | `20_010_011` | 🔴 Cấu hình chỉ được LƯU: luật lọc tương ứng trong CampaignService đang bị comment (dòng 457-462) nên không có hiệu lực khi bán — xem 20_050_009 |
| `20_khach_hang_than_thiet` | `20_010_012` | Body gửi campaignType=1 và noPointForPointPaymentInvoice=true; |
| `20_khach_hang_than_thiet` | `20_010_013` | body gửi isAppliedAll=false kèm customerGroupIds; |
| `20_khach_hang_than_thiet` | `20_010_014` | Sheet QC đòi lỗi "Thời gian bắt đầu phải từ hiện tại trở đi" nhưng chuỗi này không tồn tại trong mã nguồn |
| `20_khach_hang_than_thiet` | `20_010_017` | Không có thông báo "Thời gian kết thúc phải sau thời gian bắt đầu" như sheet QC mô tả vì FE không tự kiểm cặp ngày |
| `20_khach_hang_than_thiet` | `20_010_018` | 🔴 Hệ thống LƯU thành công với orderAmountPerPoint=0 — validator FE chỉ chặn giá trị âm/null. |
| `20_khach_hang_than_thiet` | `20_010_018` | Sheet QC đòi "Tỷ lệ tích điểm phải lớn hơn 0" — chuỗi này không có trong mã nguồn |
| `20_khach_hang_than_thiet` | `20_010_022` | Ghi nhận hành vi thật: hoặc lưu được (dòng diễn giải hiện đúng số đã format), hoặc API trả lỗi. |
| `20_khach_hang_than_thiet` | `20_010_028` | Ghi nhận hành vi thật: ô tìm kiếm gửi keyword lên API nên kết quả do backend quyết. |
| `20_khach_hang_than_thiet` | `20_010_028` | Nếu không ra nhóm thì đây là giới hạn tìm kiếm cần báo, không phải lỗi test |
| `20_khach_hang_than_thiet` | `20_020_004` | Chặn hai lớp: validator ô hiện "Số tiền chi tiêu phải lớn hơn 0" và handleUpdate cũng chặn bằng toast cùng nội dung; |
| `20_khach_hang_than_thiet` | `20_020_006` | Kỳ vọng "Thời gian bắt đầu phải từ hiện tại trở đi" của sheet QC không có trong mã nguồn |
| `20_khach_hang_than_thiet` | `20_020_007` | script so chuỗi phải dùng đúng bản này |
| `20_khach_hang_than_thiet` | `20_020_008` | 🔴 KHÔNG bị chặn, chương trình lưu thành công — điều kiện ở đây là endTime.isBefore(now,'day') nên hôm nay vẫn qua, trong khi màn tích điểm (20_010_016) chặn đúng trường hợp này. |
| `20_khach_hang_than_thiet` | `20_020_010` | Sau khi tích: nhập được và body gửi orderAmountConditional=200000; |
| `20_khach_hang_than_thiet` | `20_020_010` | bỏ tích thì body gửi orderAmountConditional=null |
| `20_khach_hang_than_thiet` | `20_020_012` | API trả lỗi nguyên văn "Có một chiến dịch đang chạy, vui lòng tạm ngừng trước khi tiếp tục." — 🔴 lưu ý chuỗi NGẮN HƠN chuỗi của tích điểm (thiếu cụm "chiến dịch hiện tại") |
| `20_khach_hang_than_thiet` | `20_030_001` | body khi lưu gửi scopeType="TONG_CONG_TY" và scopes=[] |
| `20_khach_hang_than_thiet` | `20_030_003` | body gửi scopeType="BUU_DIEN_TINH" kèm scopes có orgUnitCode của tỉnh; |
| `20_khach_hang_than_thiet` | `20_030_009` | Ghi nhận hành vi thật cho từng biến thể |
| `20_khach_hang_than_thiet` | `20_030_010` | Lưu ý kết quả check-scope được cache Redis 60 phút, chỉ xoá sau khi cấu hình chiến dịch thay đổi và transaction đã commit |
| `20_khach_hang_than_thiet` | `20_040_002` | 🔴 Tab "Điểm phân hạng" và nút "Làm mới điểm" đã bị comment trong LoyaltyPage.jsx nên KHÔNG hiển thị |
| `20_khach_hang_than_thiet` | `20_040_005` | Các nhãn đúng nguyên văn kể cả lỗi chính tả trong code: "Giá trị đơn hàng tối thiếu" (thiếu → thiếu, không phải "tối thiểu"). |
| `20_khach_hang_than_thiet` | `20_040_014` | 🔴 API DELETE /loyalty/campaign/delete-campaign/{id} vẫn tồn tại và chỉ đặt active=false — cần xác nhận có tài liệu quyền nào cho phép gọi trực tiếp không |
| `20_khach_hang_than_thiet` | `20_050_001` | 🔴 Sheet QC yêu cầu kiểm ở màn "Lịch sử tích điểm" của khách hàng — màn này KHÔNG tồn tại trong FE hiện tại, chỉ có dòng "Điểm hiện tại: N" |
| `20_khach_hang_than_thiet` | `20_050_002` | điều kiện trong code là baseAmount >= minAmount nên mốc BẰNG được tính |
| `20_khach_hang_than_thiet` | `20_050_003` | Sheet QC bỏ trống ô kỳ vọng của dòng này — kỳ vọng viết lại theo công thức trong CampaignService dòng 492-495 |
| `20_khach_hang_than_thiet` | `20_050_005` | ⚠️ Code chỉ loại dòng có allowPoint=false — dòng giảm giá mà vẫn allow_point=true VẪN được tính, nên kỳ vọng "không tích điểm" của sheet chỉ đúng khi đơn chỉ có đúng dòng bị loại |
| `20_khach_hang_than_thiet` | `20_050_006` | Sheet QC bỏ trống kỳ vọng dòng này |
| `20_khach_hang_than_thiet` | `20_050_007` | calculate-point trả point=0 do cờ isInvoiceDiscounted=true khớp cấu hình |
| `20_khach_hang_than_thiet` | `20_050_009` | Kỳ vọng nghiệp vụ là KHÔNG tích điểm, nên chênh lệch này phải được ghi phiếu. |
| `20_khach_hang_than_thiet` | `20_050_013` | 🔴 Điểm tính trên baseAmount = tổng các dòng CÒN LẠI, và mức tối thiểu cũng so với baseAmount này chứ không so với tổng đơn — nên đơn đạt mức tối thiểu vẫn có thể ra 0 điểm nếu phần còn lại tụt dưới mức. |
| `20_khach_hang_than_thiet` | `20_050_013` | Sheet QC bỏ trống kỳ vọng dòng này |
| `20_khach_hang_than_thiet` | `20_050_014` | Sheet QC bỏ trống kỳ vọng dòng này |
| `20_khach_hang_than_thiet` | `20_050_017` | Sheet QC bỏ trống kỳ vọng dòng này |
| `20_khach_hang_than_thiet` | `20_050_018` | Sheet QC bỏ trống kỳ vọng dòng này |
| `20_khach_hang_than_thiet` | `20_050_021` | 🔴 Điểm tăng 0 và KHÔNG có cảnh báo nào ở màn bán hàng — điều kiện orderAmountPerPoint > 0 khiến toàn bộ nhánh tính điểm bị bỏ qua. |
| `20_khach_hang_than_thiet` | `20_060_002` | POST /loyalty/redeem-campaign/calculate-loyalty-amount trả loyaltyAmount = 50 × 1.000 = 50.000; |
| `20_khach_hang_than_thiet` | `20_060_003` | 🔴 Bị chặn nhưng thông báo là "Điều kiện không hợp lệ để sử dụng điểm thưởng" — KHÔNG phải "Số điểm không đủ (cần 100, hiện có 50)" như sheet QC yêu cầu. |
| `20_khach_hang_than_thiet` | `20_070_001` | Menu không hiện mục Chiến dịch Loyalty và route bị chặn theo ROUTES_PERMISSION.LOYALTY. |
| `20_khach_hang_than_thiet` | `20_070_001` | 🔴 Sheet QC còn đòi nút "Thêm mới" bị ẩn/vô hiệu khi thiếu quyền — nhưng liên kết Thêm chương trình trong CampaignList.jsx là Button trần, KHÔNG bọc PermissionButton, nên chỉ chặn được ở mức route |
| `20_khach_hang_than_thiet` | `20_070_002` | Mục không hiện — careRoutes khai điều kiện cấu hình enableCustomerLoyalty cho route này; |
| `20_khach_hang_than_thiet` | `20_070_003` | Ghi nhận hành vi thật theo quyền đang gán cho vai gdv: vào được thì phải chỉ xem chứ không sửa được cấu hình chain. |
| `20_khach_hang_than_thiet` | `20_070_004` | Hai vai thấy CÙNG một chương trình — API get-campaign lọc theo chainId lấy từ Payload, không theo shopId. |
| `24_cong_no_nhan_vien` | `24_010_005` | Gọi GET /shops/{shopId}/employee/get-debt-summary với keyword vừa gõ; |
| `24_cong_no_nhan_vien` | `24_010_008` | 🔴 Riêng ký tự phần trăm và gạch dưới: truy vấn dùng LIKE CONCAT(phần trăm, keyword, phần trăm) nên đây là ký tự đại diện của SQL — gõ phần trăm có thể trả về TOÀN BỘ danh sách thay vì bảng rỗng như sheet QC mong đợi |
| `24_cong_no_nhan_vien` | `24_010_009` | Kết quả giống hệt khi gõ tên không có khoảng trắng — backend cắt bằng keyword.trim() (EmployeeDebtServiceImpl:207). |
| `24_cong_no_nhan_vien` | `24_010_009` | Lưu ý khoảng trắng GIỮA hai từ KHÔNG bị gộp |
| `24_cong_no_nhan_vien` | `24_010_010` | 🔴 Gõ KHÔNG DẤU trả bảng rỗng — truy vấn không chuẩn hoá dấu, khác kỳ vọng "tìm kiếm không phân biệt" của sheet QC |
| `24_cong_no_nhan_vien` | `24_010_016` | bảng rỗng — đây là hoạt động bình thường, 🚫 không kết luận là lỗi mất dữ liệu |
| `24_cong_no_nhan_vien` | `24_010_018` | Nút bị ẩn/vô hiệu theo PermissionButton permKey=view_employee_debt; |
| `24_cong_no_nhan_vien` | `24_050_005` | 🔴 Danh sách KHÔNG đổi: EmployeeDebtController.list đặt resolvedShopId = null khi orgUnitType là BUU_DIEN_TINH hoặc BUU_DIEN_XA, rồi lọc theo org_province_code / org_ward_code ⇒ ô chọn điểm bán bị bỏ qua ở thẻ này. |
| `24_cong_no_nhan_vien` | `24_070_005` | Ghi nhận hành vi thật: hoặc bị chặn, hoặc chỉ phân bổ đúng tới hết nợ và phần dư không được ghi nhận. |
| `24_cong_no_nhan_vien` | `24_070_005` | 🔴 Nếu hệ thống ghi nhận cả phần dư thì nhân viên thành "trả thừa" mà không có chỗ hoàn — phải báo |
| `24_cong_no_nhan_vien` | `24_PQ_002` | Chỉ thấy công nợ của các điểm bán thuộc xã mình — backend lọc theo org_ward_code lấy từ Payload.orgUnitCode, 🚫 không nhận shopId do FE gửi |
| `24_cong_no_nhan_vien` | `24_PQ_003` | chọn điểm bán nào thì lọc đúng điểm bán đó — 🔴 khác hẳn hành vi ở cấp tỉnh/xã tại case 24_050_005 |
| `26_phieu_thu` | `26_080_001` | Ghi lại nguyên văn thông báo |
| `26_phieu_thu` | `26_080_002` | Ghi lại nguyên văn thông báo |
| `26_phieu_thu` | `26_080_003` | Ghi lại hành vi thật |
| `26_phieu_thu` | `26_080_004` | Ghi lại nguyên văn thông báo |
| `26_phieu_thu` | `26_080_006` | Ghi lại nguyên văn thông báo |
| `26_phieu_thu` | `26_090_002` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `26_phieu_thu` | `26_090_004` | Ghi lại hành vi thật |
| `27_doi_soat_hoa_don` | `27_070_006` | Ghi lại nguyên văn thông báo nếu có |
| `27_doi_soat_hoa_don` | `27_070_008` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `27_doi_soat_hoa_don` | `27_071_001` | Ghi lại hành vi thật |
| `27_doi_soat_hoa_don` | `27_071_004` | Ghi lại nguyên văn thông báo |
| `29_bao_cao` | `29_210_001` | Ghi lại nguyên văn thông báo |
| `29_bao_cao` | `29_210_012` | Ghi lại nguyên văn thông báo |
| `29_bao_cao` | `29_210_013` | Ghi lại nguyên văn thông báo |
| `29_bao_cao` | `29_210_014` | Ghi lại nguyên văn thông báo |
| `29_bao_cao` | `29_210_015` | Ghi lại nguyên văn |
| `29_bao_cao` | `29_220_009` | Ghi lại nguyên văn nếu code khác |
| `29_bao_cao` | `29_220_013` | Ghi lại nguyên văn tên các khối |
| `29_bao_cao` | `29_240_001` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `29_bao_cao` | `29_240_003` | Ghi lại hành vi thật |
| `29_bao_cao` | `29_240_004` | Ghi lại hành vi thật: có tìm ra đơn vị tên có dấu hay không |
| `29_bao_cao` | `29_240_005` | Ghi lại hành vi thật |
| `30_bao_cao_ctkm` | `30_050_001` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `30_bao_cao_ctkm` | `30_050_004` | Ghi lại hành vi thật |
| `30_bao_cao_ctkm` | `30_050_005` | Ghi lại hành vi thật |
| `30_bao_cao_ctkm` | `30_050_006` | Ghi lại hành vi thật: có tìm ra chương trình tên có dấu hay không |
| `31_quan_ly_phan_quyen` | `31_030_002` | Ghi lại nguyên văn placeholder |
| `31_quan_ly_phan_quyen` | `31_030_003` | Ghi lại nguyên văn nhãn nút |
| `31_quan_ly_phan_quyen` | `31_040_001` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `31_quan_ly_phan_quyen` | `31_040_002` | Ghi lại hành vi thật |
| `31_quan_ly_phan_quyen` | `31_040_006` | Ghi lại hành vi thật nếu khác |
| `31_quan_ly_phan_quyen` | `31_050_001` | Ghi lại nguyên văn thông báo trùng tên |
| `31_quan_ly_phan_quyen` | `31_060_002` | Ghi lại nguyên văn thông báo lỗi |
| `31_quan_ly_phan_quyen` | `31_070_001` | Ghi lại nguyên văn — code có chuỗi "Vai trò và toàn bộ phân công nhân viên bên dưới sẽ bị xóa. |
| `31_quan_ly_phan_quyen` | `31_080_002` | Ghi lại hành vi thật |
| `31_quan_ly_phan_quyen` | `31_090_001` | Ghi lại hành vi thật |
| `31_quan_ly_phan_quyen` | `31_030_009` | 🔴 Kỳ vọng này KHÔNG đo được bằng auto test khi chưa có giá trị chuẩn (font-family, font-size, line-height) — xem lý do BLOCKED |
| `32_mo_hinh_to_chuc` | `32_100_004` | Ghi lại nguyên văn thông báo và khoảng mã hợp lệ |
| `32_mo_hinh_to_chuc` | `32_100_005` | Ghi lại nguyên văn thông báo trùng mã |
| `32_mo_hinh_to_chuc` | `32_100_006` | Ghi lại nguyên văn thông báo lỗi ở ô Đơn vị cha |
| `32_mo_hinh_to_chuc` | `32_110_003` | Ghi lại nguyên văn thông báo lỗi |
| `32_mo_hinh_to_chuc` | `32_110_004` | Ghi lại nguyên văn thông báo lỗi |
| `32_mo_hinh_to_chuc` | `32_110_005` | Ghi lại nguyên văn thông báo trùng mã |
| `32_mo_hinh_to_chuc` | `32_120_001` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `32_mo_hinh_to_chuc` | `32_130_002` | Ghi lại nguyên văn thông báo lỗi |
| `32_mo_hinh_to_chuc` | `32_130_003` | Ghi lại nguyên văn thông báo trùng mã |
| `32_mo_hinh_to_chuc` | `32_140_005` | Ghi lại nguyên văn nội dung |
| `32_mo_hinh_to_chuc` | `32_150_002` | Ghi lại nguyên văn thông báo |
| `32_mo_hinh_to_chuc` | `32_150_003` | Ghi lại hành vi thật: nhận phần hợp lệ và báo dòng lỗi, hay từ chối cả tệp. |
| `32_mo_hinh_to_chuc` | `32_150_005` | Ghi lại nguyên văn thông báo |
| `32_mo_hinh_to_chuc` | `32_150_007` | Ghi lại hành vi thật: sinh tệp chỉ có header hay báo không có dữ liệu |
| `32_mo_hinh_to_chuc` | `32_160_003` | 🔴 Cờ "Là cửa hàng mẫu" ĐÃ BỊ COMMENT OUT trong FE — xem lý do BLOCKED. |
| `32_mo_hinh_to_chuc` | `32_160_004` | Ghi lại nguyên văn thông báo lỗi |
| `32_mo_hinh_to_chuc` | `32_160_005` | Ghi lại nguyên văn thông báo lỗi |
| `32_mo_hinh_to_chuc` | `32_160_006` | Ghi lại nguyên văn thông báo lỗi |
| `32_mo_hinh_to_chuc` | `32_160_007` | Ghi lại hành vi thật: Địa chỉ chi tiết có bắt buộc không |
| `32_mo_hinh_to_chuc` | `32_160_010` | 🔴 Dropdown "Cửa hàng mẫu" ĐÃ BỊ COMMENT OUT trong FE — xem lý do BLOCKED. |
| `32_mo_hinh_to_chuc` | `32_170_004` | Ghi lại hành vi thật: nhân viên đã nghỉ có xuất hiện trong dropdown không, và gán được không |
| `32_mo_hinh_to_chuc` | `32_170_005` | Ghi lại hành vi thật: chỉ dòng vừa đổi bị ảnh hưởng hay toàn bộ phân công của nhân viên đó cùng đổi |
| `32_mo_hinh_to_chuc` | `32_170_008` | Ghi lại nguyên văn thông báo |
| `32_mo_hinh_to_chuc` | `32_170_009` | Ghi lại nguyên văn thông báo |
| `32_mo_hinh_to_chuc` | `32_170_010` | Ghi lại nguyên văn thông báo |
| `32_mo_hinh_to_chuc` | `32_170_015` | Ghi lại nguyên văn thông báo hoặc hành vi ẩn đơn vị đó khỏi danh sách |
| `33_lich_su_thao_tac_nguoi_dung` | `33_020_003` | Ghi lại nguyên văn nếu code khác |
| `33_lich_su_thao_tac_nguoi_dung` | `33_020_004` | Ghi lại nguyên văn nếu code khác |
| `33_lich_su_thao_tac_nguoi_dung` | `33_020_008` | Ghi lại hành vi thật |
| `33_lich_su_thao_tac_nguoi_dung` | `33_020_009` | Ghi lại hành vi thật: có tìm ra người tên có dấu hay không |
| `33_lich_su_thao_tac_nguoi_dung` | `33_020_010` | Ghi lại hành vi thật |
| `33_lich_su_thao_tac_nguoi_dung` | `33_060_001` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `34_cong_no_khach_hang` | `34_050_004` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `34_cong_no_khach_hang` | `34_050_011` | Ghi lại hành vi thật |
| `34_cong_no_khach_hang` | `34_050_012` | Ghi lại hành vi thật: có tìm ra khách tên có dấu hay không |
| `34_cong_no_khach_hang` | `34_060_001` | Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `34_cong_no_khach_hang` | `34_060_005` | Ghi lại hành vi thật |
| `34_cong_no_khach_hang` | `34_060_007` | Ghi lại nguyên văn thông báo |
| `34_cong_no_khach_hang` | `34_060_008` | Ghi lại nguyên văn thông báo |
| `35-gia-von-mac-dinh` | `GVMD-126` | Ghi lại nguyên văn thông báo |
| `35-gia-von-mac-dinh` | `GVMD-127` | Ghi lại nguyên văn thông báo |
| `35-gia-von-mac-dinh` | `GVMD-129` | Ghi lại nguyên văn thông báo |
| `35-gia-von-mac-dinh` | `GVMD-132` | Ghi lại nguyên văn thông báo |
| `35-gia-von-mac-dinh` | `GVMD-133` | Ghi lại nguyên văn thông báo |

## 2. Còn ngờ — vẫn giữ trong bản QC (272 câu)

| Phân hệ | Case | Câu |
|---|---|---|
| `01_quan_ly_diem_ban` | `01_010_026` | 🔴 Không được giữ page=2 rồi trả bảng rỗng. |
| `01_quan_ly_diem_ban` | `01_020_034` | 🚫 Không được giữ xã của tỉnh A. |
| `02_quan_ly_nhan_vien` | `02_010_002` | 🔴 Có ĐỦ 5 ô, đúng thứ tự và nguyên văn placeholder: "Tìm kiếm theo tên và số điện thoại" · "Chọn chi nhánh làm việc" · "Chọn vai trò" · "Trạng thái tài khoản" · "Trạng thái làm việc". |
| `02_quan_ly_nhan_vien` | `02_010_003` | 🔴 Bảng chính có ĐÚNG 6 cột: STT · Mã nhân viên · Tên nhân viên · Chức danh · Số điện thoại / Email · Trạng thái. |
| `02_quan_ly_nhan_vien` | `02_010_014` | 🔴 Đây là trạng thái TÀI KHOẢN, khác "Trạng thái làm việc" (Đang làm / Đã nghỉ) nằm ở hàng mở rộng — 🚫 không lẫn hai cái. |
| `02_quan_ly_nhan_vien` | `02_010_020` | 🚫 Không phải điều kiện sau thay thế điều kiện trước. |
| `02_quan_ly_nhan_vien` | `02_020_005` | 🔴 Modal CHỈ có 4 ô bắt buộc ở phần thông tin: Mã nhân viên · Tên đăng nhập · Tên nhân viên · Số điện thoại. |
| `02_quan_ly_nhan_vien` | `02_020_022` | 🚫 Không được giữ R1 của đơn vị A. |
| `02_quan_ly_nhan_vien` | `02_040_001` | 🔴 Danh sách KHÔNG có cột Hành động — lối vào chi tiết duy nhất là liên kết ở tên. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_010` | 🔴 Cả hai ô đều vô hiệu giờ 0, 1, 2, 3, 4 ⇒ KHÔNG khai được ca bắt đầu hoặc kết thúc trong khoảng 00:00–04:59. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_011` | 🔴 chặn CỨNG, không có hộp thoại cho tiếp tục; |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_013` | 🔴 Chồng lấn là CẢNH BÁO chứ không phải ràng buộc — nghiệp vụ cần biết điều này. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_010_014` | 🔴 Hệ quả: ca ngừng hoạt động có thể trùng khít; |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_020_010` | Hiện thông báo nguyên văn "Cập nhật ca thành công" (🔴 khác thông báo khi thêm là "Thêm ca thành công"); |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_060_006` | 🔴 Số liệu ca lúc này là TẠM TÍNH. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_060_007` | 🔴 Đây là thao tác GHI vào chênh lệch tiền, phải chờ duyệt — 🚫 không chạy tự động. |
| `03b_ca_lam_viec_nhan_vien` | `03b_020_006` | 🔴 Hai nút KHÔNG bao giờ hiện cùng lúc (điều kiện `status === "pending"` / `"working"` loại trừ nhau). |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_004` | 🔴 Drawer chỉ hiện Nhân viên · Ca làm việc · Quầy thu ngân · Thời gian mở · Tiền mở ca, cộng khối "Số lượng tờ theo từng mệnh giá" để nhân viên tự đếm. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_010` | Phiếu có đủ: Nhân viên · Mã NV · Ca · Quầy · Thời gian bắt đầu · Thời gian kết thúc · Tổng đơn hàng · Tổng doanh thu · Tiền khách nợ · Hoàn trả · Lượt hoàn tiền, và 🔴 **hai khối chênh lệch TÁCH RIÊNG**: "Đầu ca" / "Đầu ca thực tế" / "Chênh lệch đầu ca (nhận bàn giao so với sổ quỹ)" và "Cuối ca" / "Cuối ca thực tế" / "Chênh lệch cuối ca (thuộc trách nhiệm ca này)". |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_011` | 🔴 Mở lại ca là GHI — số liệu ca đã khoá được mở ra, ảnh hưởng báo cáo chốt ca của quản lý. |
| `03b_ca_lam_viec_nhan_vien` | `03b_060_002` | 🔴 Hai tình huống khác nhau nhưng thông báo GIỐNG NHAU: người dùng chưa được xếp lịch sẽ được bảo "hãy mở ca", mà họ không có ca nào để mở. |
| `04_1_canh_bao_ton_kho` | `04_1_020_019` | 🔴 KHÔNG có thẻ "Sản phẩm của tỉnh" — chỉ cấu hình được sản phẩm cấp Tổng công ty, vì "sản phẩm của tỉnh" là tập khác nhau ở mỗi tỉnh nên không có danh sách chung; |
| `04_2_ton_kho_dau_ky` | `04_2_020_011` | sau khi tạo phiếu, tồn kho = tồn cũ **CỘNG DỒN** số lượng khai báo, 🚫 không ghi đè. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_011` | 🔴 "Điều chỉnh phiếu nhập" là chứng từ bút toán đảo theo Điều 27 Luật Kế toán — 🚫 không lẫn với xuất kho thường. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_010_020` | tổng thành tiền = tổng theo từng lô, 🚫 không dùng một giá bình quân. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_002` | 🔴 tồn kho **CHƯA đổi** — phiếu nháp không ghi tồn. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_004` | 🔴 Đây là mốc ghi tồn — trước duyệt không đổi, sau duyệt mới đổi. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_017` | 🔴 Sản phẩm MAC VẪN CÓ LÔ. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_002` | 🔴 tồn kho **CHƯA giảm**. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_005` | tổng thành tiền = Σ(số lượng lô × giá lô), 🚫 không dùng một giá bình quân chung. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_008` | 🔴 Kỳ vọng phụ thuộc **cấu hình chính sách tồn âm của điểm bán**; |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_040_002` | 🔴 Đây là bút toán đảo theo Điều 27 Luật Kế toán, 🚫 không phải xoá phiếu. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_040_003` | các dòng sản phẩm giữ nguyên để tra cứu, 🚫 không bị xoá. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_040_005` | 🔴 🚫 Dòng cũ KHÔNG được sửa hay xoá — phải là dòng cấn trừ mới. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_004` | 🚫 Không gộp. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_005` | 🔴 Trả hàng LUÔN là điều chỉnh giảm về hoá đơn — 🚫 không sinh hoá đơn huỷ. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_006` | 🚫 không dồn hết về một lô. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_004` | 🔴 Hệ thống lưu DATETIME naive +7 — chọn đúng ngày biên phải ra đúng phiếu, 🚫 không lệch một ngày. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_004` | 🔴 id kho khác nhau mỗi pod — đối chiếu phải theo mã, 🚫 không theo id. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_006` | 🔴 Phiếu nộp tiền lọc theo mã đơn vị chụp trên phiếu — đối chiếu phải theo mã đó. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_070_014` | 🚫 Không bình quân giữa hai dòng. |
| `04_4_kiem_kho` | `04_4_030_005` | Đây là chỗ dễ lẫn với **"chưa đếm"**: nếu chữ bị bỏ thành rỗng thì dòng đó là chưa đếm, 🚫 không được coi là đếm 0. |
| `04_4_kiem_kho` | `04_4_030_006` | 🔴 Dòng A (chưa đếm) và dòng B (đếm 0) phải được xử lý KHÁC nhau: A không sinh điều chỉnh, B sinh điều chỉnh giảm về 0. |
| `04_4_kiem_kho` | `04_4_040_001` | 🔴 **tồn kho CHƯA đổi** — nháp không áp dụng vào kho. |
| `04_4_kiem_kho` | `04_4_040_003` | 🔴 Ràng buộc "một phiếu nháp tại một thời điểm" — quan trọng vì hai phiếu nháp cùng lúc sẽ điều chỉnh tồn hai lần. |
| `04_4_kiem_kho` | `04_4_050_005` | 🔴 DATETIME naive +7 — ngày biên phải ra đúng phiếu, 🚫 không lệch một ngày. |
| `04_4_kiem_kho` | `04_4_070_005` | 🔴 Đây là chỗ giá vốn hay sai nhất khi có bán âm. |
| `04_5_quan_ly_ton_kho` | `04_5_020_006` | 🔴 Đổi kho mặc định ảnh hưởng mọi form lập phiếu sau đó (ô kho tự điền theo kho mặc định). |
| `04_5_quan_ly_ton_kho` | `04_5_020_013` | 🔴 Kỳ vọng gốc là *"Check lại"*. |
| `04_5_quan_ly_ton_kho` | `04_5_020_014` | 🔴 Kỳ vọng gốc là *"Check lại"*. |
| `04_5_quan_ly_ton_kho` | `04_5_020_015` | 🔴 Kỳ vọng gốc là *"Check lại"*. |
| `04_5_quan_ly_ton_kho` | `04_5_030_003` | 🔴 id kho khác nhau mỗi pod — đối chiếu theo mã kho, 🚫 không theo id. |
| `04_5_quan_ly_ton_kho` | `04_5_030_007` | 🔴 DATETIME naive +7 — ngày biên phải ra đúng giao dịch. |
| `04_5_quan_ly_ton_kho` | `04_5_030_015` | 🔴 Từ 07/09 chênh lệch kiểm kê **tách cột riêng** — 🚫 không cộng lẫn vào Tổng nhập của nhập/xuất thường nếu màn đã tách. |
| `07_1_cau_hinh_chung` | `07_1_060_001` | 🔴 Làm tròn tiền phần kho đụng trực tiếp vào giá vốn — nguồn giữ scale 6, chỉ làm tròn lúc tính, nên sai thứ tự làm tròn là lệch tiền. |
| `07_1_cau_hinh_chung` | `07_1_060_002` | 🔴 Hai cấu hình áp cho hai nhóm số khác nhau và KHÔNG được lẫn: tiền bán hàng theo cấu hình thứ nhất, tiền phần kho theo cấu hình thứ hai. |
| `07_2_cau_hinh_kho` | `07_2_060_003` | Sản phẩm đang bị ..."** — 🔴 câu này khác câu của xuất kho, 🚫 không dùng lẫn. |
| `07_2_cau_hinh_kho` | `07_2_060_005` | 🔴 Đây là tình huống nguy hiểm: hàng **đã rời kho gửi** mà bên nhận không nhận được ⇒ hàng treo giữa đường. |
| `07_3_don_hang_va_thanh_toan` | `07_3_010_005` | bật lại thì hiện lại **với giá trị đã lưu trước đó**, 🚫 không về rỗng. |
| `07_3_don_hang_va_thanh_toan` | `07_3_040_004` | 🚫 Không tự kết luận trước khi đo. |
| `07_4_van_hanh` | `07_4_050_005` | chọn vai mới thì thay vai cũ, 🚫 không cộng thêm. |
| `08_quan_ly_san_pham` | `08_020_005` | Khi xoá hết biến thể: hai ô hiện lại **với giá trị đã nhập trước đó**, 🚫 không mất dữ liệu. |
| `08_quan_ly_san_pham` | `08_020_008` | nếu hệ thống nhân bản dòng quy đổi cho từng biến thể thì SKU phải **duy nhất cho từng biến thể**, 🚫 không nhân bản trùng SKU. |
| `08_quan_ly_san_pham` | `08_020_013` | 🔴 Đơn vị gốc phải có `convert_to_main_unit = 1`; |
| `08_quan_ly_san_pham` | `08_030_002` | Trường bỏ trống hiện "—", 🚫 không hiện "null". |
| `08_quan_ly_san_pham` | `08_030_011` | 🔴 Sản phẩm phải còn **ít nhất một đơn vị gốc**; |
| `08_quan_ly_san_pham` | `08_030_017` | 🔴 Nếu xoá được thì CTKM còn tham chiếu sản phẩm không tồn tại. |
| `08_quan_ly_san_pham` | `08_060_011` | 🔴 Đặt cha là chính nó / con của nó phải bị **chặn** — nếu không thì cây danh mục thành vòng lặp và mọi màn đọc cây sẽ treo. |
| `08_quan_ly_san_pham` | `08_060_015` | 🔴 Đây là biên quan trọng nhất của nhóm xoá danh mục. |
| `08_quan_ly_san_pham` | `08_060_020` | 🚫 không giữ trạng thái đã lọc. |
| `08_quan_ly_san_pham` | `08_090_001` | 🚫 Không gộp — gộp thì không biết ô nào hỏng. |
| `08_quan_ly_san_pham` | `08_090_006` | Hệ thống buộc chọn **biến thể cụ thể**, 🚫 không cho chọn sản phẩm cha chung chung. |
| `08_quan_ly_san_pham` | `08_090_008` | Cả hai đều bị chặn — 🔴 SKU phải duy nhất **trên toàn hệ thống**, không phân biệt combo và sản phẩm thường. |
| `10_bang_gia_ban_san_pham` | `10_010_007` | 🔴 DATETIME naive +7 — ngày biên phải ra đúng bảng giá. |
| `10_bang_gia_ban_san_pham` | `10_010_008` | Chỉ hiển thị bảng giá thoả mãn **TẤT CẢ** điều kiện (AND), 🚫 không phải điều kiện sau thay thế điều kiện trước. |
| `10_bang_gia_ban_san_pham` | `10_020_008` | 🔴 Doanh thu tính TRƯỚC VAT — phương thức này quyết định con số vào báo cáo doanh thu. |
| `10_bang_gia_ban_san_pham` | `10_030_005` | 🔴 Nửa "đơn vị bị bỏ không còn áp" là nửa quan trọng nhất. |
| `10_bang_gia_ban_san_pham` | `10_060_004` | 🔴 Bảng giá đang áp dụng mà xoá được thì các đơn đang bán mất giá tham chiếu. |
| `10_bang_gia_ban_san_pham` | `10_070_001` | bảng giá áp cho đúng điểm bán đã chọn, 🚫 không nở ra điểm bán khác. |
| `10_bang_gia_ban_san_pham` | `10_080_004` | 🔴 Doanh thu combo tính trước VAT nên câu note này là mấu chốt để hiểu số nào vào báo cáo. |
| `10_bang_gia_ban_san_pham` | `10_080_006` | 🚫 Không được giữ danh mục của loại cũ — giữ lại là thêm sai sản phẩm vào bảng giá. |
| `10_bang_gia_ban_san_pham` | `10_090_007` | 🔴 Đối chiếu: số trong toast phải bằng số dòng thật được thêm, 🚫 không bằng số sản phẩm của danh mục. |
| `10_bang_gia_ban_san_pham` | `10_100_005` | 🔴 Đây là hành vi "tự sửa giá trị" — khác với chặn bằng thông báo; |
| `10_bang_gia_ban_san_pham` | `10_100_006` | 🔴 Đây là khác biệt nghiệp vụ quan trọng giữa ký gửi và mua bán. |
| `10_bang_gia_ban_san_pham` | `10_110_007` | 🔴 Giá ký gửi phải lọc theo **khu vực shop** — kiểm khi áp giá ở quầy. |
| `10_bang_gia_ban_san_pham` | `10_130_003` | 🔴 Đây là ràng buộc nền: **không có bảng giá thì không bán được**. |
| `10_bang_gia_ban_san_pham` | `10_130_007` | 🔴 Đây là **chốt chặn phạm vi** — nếu thêm được thì bảng giá đang nở ra ngoài phạm vi, lỗi nghiêm trọng. |
| `13-cong-no-diem-ban-tinh` | `CNDB-CD-009` | 🔴 Phải bị chặn — nguyên nhân lệch là **giải trình cho khoản chênh tiền**, chuỗi khoảng trắng không phải giải trình. |
| `13-cong-no-diem-ban-tinh` | `CNDB-CD-010` | số liệu kiểm đếm đã nhập **không được lưu nửa vời** — mở lại drawer phải rõ là chưa kiểm đếm hoặc giữ đúng phần đã lưu, 🚫 không lẫn hai trạng thái. |
| `14_1_lap_va_duyet_phieu_xuat_tra` | `14_1_030_026` | Cột "SL duyệt" hiện "--" màu xám ở mọi dòng, 🚫 KHÔNG lấy giá trị của cột "SL trả" thay thế |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_010_017` | 🔴 Không có chức năng nào hoàn tác việc gom. |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_030_010` | Phiếu IMPORT về kho tỉnh chỉ ghi 5 đơn vị, 🚫 không gồm 3 đã trả và 2 đã huỷ |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_040_004` | 🔴 tồn kho điểm bán KHÔNG đổi; |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_040_005` | 🔴 KHÔNG kho nào tăng tồn; |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_040_009` | 🔴 Chặn bằng UI, không có thông báo |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_050_006` | 🔴 Tồn kho tỉnh GIẢM đúng phần còn lại của phiếu (BE sinh phiếu xuất bàn giao, tránh tồn ảo). |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_060_004` | 🔴 Công nợ NCC KHÔNG đổi. |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_060_004` | Công nợ chỉ ghi giảm khi bấm "NCC xác nhận", 🚫 không phải lúc bấm "Trả hàng" |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_060_009` | Đủ 3 nút: "Huỷ hàng" (đỏ), "Nhập kho TCT", "Hoàn về tỉnh" (nút chính) — 🚫 không có "Hoàn về điểm bán" |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_002` | 🚫 KHÔNG có nút "Tiếp nhận hoá đơn NCC" |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_007` | 🔴 Chặn ở FE, 🚫 KHÔNG phát sinh POST /stock/v2/return-credit-note/upload |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_011` | 🔴 BE trả lỗi dạng "Tệp không phải hoá đơn điều chỉnh (nhận được: <loại>)". |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_014` | 🔴 BE chặn NGAY với "Hoá đơn không có dòng hàng hoá nào đọc được — kiểm tra lại tệp XML"; |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_014` | hoá đơn 🚫 KHÔNG được neo vào đợt trả (trước đây lưu thành công rồi mới vỡ ở bước đối soát) |
| `14_3_hoa_don_hang_tra_lai` | `14_3_010_015` | 🔴 BE trả lỗi nguyên văn "Hoá đơn đã tồn tại trong hệ thống (trùng MST người bán + ký hiệu + số)" (ENTITY_EXISTED). |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_001` | 🚫 không còn nút tiếp nhận hay phát hành |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_006` | cột "Kết quả" là "Chưa ghép được", 🚫 KHÔNG phải "Lệch" |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_007` | 🔴 Lệch dù 1 đơn vị là "Lệch" — số lượng 🚫 KHÔNG có dung sai |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_008` | 🔴 Kết quả = "Khớp"; |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_009` | Kết quả = "Khớp" (phép so là ≤ MONEY_TOLERANCE, 🚫 không phải <) |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_014` | 🔴 Nút ở trạng thái disabled; |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_014` | 🚫 KHÔNG có cách ghi đè nào |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_016` | 🔴 BE trả lỗi nguyên văn "Hoá đơn điều chỉnh đã chốt hoặc đã gắn cho đợt trả khác" (CREDIT_NOTE_ALREADY_SETTLED, RTN-CN-002). |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_019` | 🔴 Đợt TỰ chuyển khỏi "Chờ NCC xác nhận" mà 🚫 KHÔNG cần bấm nút "NCC xác nhận" — hoá đơn khớp là bằng chứng NCC đã nhận hàng. |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_020` | 🔴 Ngày hạch toán = **01/09** (ngày hoá đơn điều chỉnh), 🚫 KHÔNG phải ngày phiếu xuất trả và 🚫 KHÔNG phải ngày bấm chốt |
| `14_3_hoa_don_hang_tra_lai` | `14_3_020_022` | 🔴 Bút toán ghi theo **tổng tiền hoá đơn gồm VAT**, 🚫 không theo batch.amount — hoá đơn là căn cứ pháp lý |
| `14_3_hoa_don_hang_tra_lai` | `14_3_030_007` | hệ thống 🚫 KHÔNG tự mặc định là điều chỉnh giảm |
| `14_3_hoa_don_hang_tra_lai` | `14_3_030_009` | 🔴 BE trả lỗi nguyên văn "Chỉ chọn được điều chỉnh GIẢM cho hoá đơn trả hàng". |
| `14_3_hoa_don_hang_tra_lai` | `14_3_030_014` | Biểu tượng thùng rác 🚫 KHÔNG hiện; |
| `14_3_hoa_don_hang_tra_lai` | `14_3_030_016` | Đợt 🚫 KHÔNG còn chứng từ nào; |
| `14_3_hoa_don_hang_tra_lai` | `14_3_030_016` | Hoá đơn 🚫 không bị ẩn mà bị xoá |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_006` | 🚫 không có bảng hàng hoá; |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_008` | 🔴 Cột để trống hoặc đánh dấu chưa xác định, 🚫 KHÔNG hiện 0%. |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_012` | 🚫 không sinh hoá đơn thứ hai cho cùng đợt |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_015` | 🔴 Không có chức năng nào thu hồi. |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_018` | 🔴 Nếu phát hành được thì hoá đơn ra ngoài cơ quan thuế với dòng diễn giải rỗng |
| `14_3_hoa_don_hang_tra_lai` | `14_3_040_019` | Người dùng 🚫 không chọn được, hệ thống tự quyết theo hồ sơ NCC |
| `16_hang_ky_gui` | `16_010_003` | 🚫 KHÔNG có nút lập khoản nào — mọi khoản do hệ thống tự treo khi bán được hàng ký gửi |
| `16_hang_ky_gui` | `16_010_004` | 🚫 KHÔNG có nút chi tiền. |
| `16_hang_ky_gui` | `16_010_016` | Cột hiện nhãn "Danh mục sản phẩm" màu vàng — nghĩa là hệ thống 🚫 không tìm được giá trong bảng giá NCC nên lấy tạm giá vốn danh mục; |
| `16_hang_ky_gui` | `16_010_017` | Hai giá trị khác nhau — cột Đơn bán 🚫 KHÔNG phải số hoá đơn tài chính |
| `16_hang_ky_gui` | `16_010_018` | 🔴 Chặn kể cả khi khoản Tạm tính thuộc kỳ KHÁC |
| `16_hang_ky_gui` | `16_010_022` | khoản 🚫 không xuất hiện trên màn công nợ |
| `16_hang_ky_gui` | `16_020_004` | tổng số kỳ 🚫 KHÔNG tăng |
| `16_hang_ky_gui` | `16_020_005` | 🚫 KHÔNG sinh kỳ nào cho hợp đồng khai thiếu; |
| `16_hang_ky_gui` | `16_020_007` | 🔴 Con số 🚫 KHÔNG đếm kỳ chưa tới ngày bắt đầu; |
| `16_hang_ky_gui` | `16_020_011` | 🔴 Cột tiền để trống là ĐÚNG — kỳ tất toán theo thiết kế chỉ có trả NCC, khách trả lại, xuất huỷ và kiểm kê, 🚫 không có giao dịch bán |
| `16_hang_ky_gui` | `16_020_012` | 🔴 Cột "Chu kỳ" vẫn ghi "Tuần"/"Tháng" chép từ hợp đồng, nhưng độ dài THẬT bằng thời hạn được phép trả hàng — đọc số ngày ở khối bung mới đúng |
| `16_hang_ky_gui` | `16_030_005` | 🔴 "SL phải trả" 🚫 KHÔNG cộng "Xuất tặng" và "Trả hàng" dù hai lượng đó đã xuất kho. |
| `16_hang_ky_gui` | `16_030_006` | 🔴 Ô hiện dấu gạch ngang nghĩa là **chưa đóng dấu giá**, 🚫 KHÔNG phải giá trị 0. |
| `16_hang_ky_gui` | `16_030_006` | Giá chỉ lấy từ dấu giá đóng lúc lập phiếu, hệ thống 🚫 không tra lại bảng giá NCC |
| `16_hang_ky_gui` | `16_030_007` | 🔴 Nhãn ĐỎ "Chưa có giá — chặn chốt kỳ" thật sự chặn chốt; |
| `16_hang_ky_gui` | `16_030_009` | 🔴 Là COUNT dòng chứng từ đã gộp (trùng nhau về mặt hàng, nghiệp vụ, đơn vị, kho, đơn giá), 🚫 KHÔNG phải số đơn hàng |
| `16_hang_ky_gui` | `16_030_012` | 🔴 Số ÂM được tính là **hàng phải thanh toán** cho NCC (🚫 không xem là mất mát nội bộ) và nằm trên hoá đơn kỳ |
| `16_hang_ky_gui` | `16_030_013` | tổng tiền phải trả NCC 🚫 KHÔNG đổi |
| `16_hang_ky_gui` | `16_030_016` | 🔴 Số trên BIÊN BẢN đối soát vẫn đầy đủ, không giới hạn thời gian |
| `16_hang_ky_gui` | `16_030_018` | 🔴 Kỳ VẪN CHỐT ĐƯỢC dù còn đơn lệch và dòng chưa gán NCC — hộp chỉ khuyên "Nên xử lý trước khi chốt". |
| `16_hang_ky_gui` | `16_030_023` | 🔴 🚫 Không có chức năng nào mở lại kỳ; |
| `16_hang_ky_gui` | `16_030_023` | biên bản đã đóng băng 🚫 không xoá được |
| `16_hang_ky_gui` | `16_030_026` | Biên bản vẫn lấy TOÀN BỘ phát sinh của kỳ và loại mọi giao dịch điều chuyển nội bộ — 🚫 không bị bộ lọc cắt |
| `16_hang_ky_gui` | `16_040_001` | 🚫 KHÔNG có vùng tải tệp |
| `16_hang_ky_gui` | `16_040_004` | Hiện cảnh báo (message.warning) với nội dung do BE trả về, 🚫 không phải thông báo thành công; |
| `16_hang_ky_gui` | `16_040_004` | hoá đơn 🚫 không bị nhân đôi |
| `16_hang_ky_gui` | `16_040_008` | hệ thống 🚫 KHÔNG chặn việc gì |
| `16_hang_ky_gui` | `16_040_010` | 🔴 Hệ thống đối chiếu **tổng của cả cụm** với biên bản, 🚫 KHÔNG đối chiếu từng dòng hàng |
| `16_hang_ky_gui` | `16_040_012` | hệ thống kiểm tổng lại ngay, 🚫 không để số cũ nằm lại |
| `16_hang_ky_gui` | `16_040_017` | 🔴 nghiệp vụ THẬT luôn dùng tệp XML do NCC phát hành — 🚫 không dùng tệp mẫu cho kỳ thật |
| `16_hang_ky_gui` | `16_050_011` | 🚫 không có kho của đơn vị khác |
| `16_hang_ky_gui` | `16_050_014` | 🚫 KHÔNG tạo dữ liệu trùng |
| `16_hang_ky_gui` | `16_050_015` | Hệ thống 🚫 KHÔNG ghi nợ nhưng vẫn khép kỳ — đây là trường hợp bình thường, 🚫 không cần xử lý thêm |
| `16_hang_ky_gui` | `16_050_016` | 🔴 🚫 Không sửa trực tiếp được, chỉ điều chỉnh bằng chứng từ điều chỉnh (§8.5 cấm sửa trực tiếp bút toán đã sinh) |
| `16_hang_ky_gui` | `16_050_017` | Lệnh chi lập được — điều kiện mở khoá là NCC 🚫 KHÔNG còn khoản nào ở trạng thái "Tạm tính", kể cả khoản thuộc kỳ khác |
| `16_hang_ky_gui` | `16_060_002` | 🔴 Đây 🚫 KHÔNG phải số liệu sai — phải đợi rồi xem lại |
| `16_hang_ky_gui` | `16_060_008` | 🚫 KHÔNG truy vấn |
| `16_hang_ky_gui` | `16_060_015` | Hiện dấu gạch ngang vì 🚫 không tính được, 🚫 KHÔNG hiện 0 |
| `16_hang_ky_gui` | `16_060_016` | 🔴 Ô trống kèm nhãn nghĩa là **chưa khai giá**, 🚫 KHÔNG phải giá trị bằng 0 |
| `16_hang_ky_gui` | `16_060_020` | 🔴 Cùng một kỳ thì hai bên PHẢI bằng nhau — lệch là có lỗi cần rà |
| `16_hang_ky_gui` | `16_060_021` | Kết quả "Chưa đối chiếu được" kèm lý do trong ô thông báo — 🚫 KHÔNG được đọc thành "Khớp" |
| `16_hang_ky_gui` | `16_060_022` | 🔴 Báo cáo đọc từ kho dữ liệu báo cáo nên có ĐỘ TRỄ. |
| `16_hang_ky_gui` | `16_060_022` | Số đưa NCC ký luôn lấy từ **biên bản** ở màn chi tiết kỳ, 🚫 không lấy từ báo cáo |
| `16_hang_ky_gui` | `16_060_028` | 🔴 Muốn so với biên bản thì phải chọn ô "Theo kỳ đối soát", 🚫 không gõ tay khoảng ngày |
| `16_hang_ky_gui` | `16_070_004` | Hai số BẰNG NHAU — TCT chỉ chuyển tiếp nghĩa vụ của NCC, 🚫 không ăn chênh lệch |
| `17_quan_ly_quay_thu_ngan` | `17_010_010` | 🔴 Nếu lưu được 256 ký tự là LỖI |
| `17_quan_ly_quay_thu_ngan` | `17_020_012` | 🔴 Danh sách vẫn trả về quầy "Quầy Tài chính" — dữ liệu VNPost trộn Anh–Việt nên tìm kiếm phải bỏ dấu |
| `17_quan_ly_quay_thu_ngan` | `17_050_014` | 🔴 Nếu cho phép thì sinh hai dòng lịch sử quỹ vô nghĩa và số dư không đổi |
| `18_1_ban_hang_tai_quay` | `18_1_010_003` | Hệ thống chặn ngay ở bước vào màn hình bán hàng — 🚫 không cho lập đơn |
| `18_1_ban_hang_tai_quay` | `18_1_010_006` | Tab rỗng: đóng rồi hệ thống mở lại một tab tạm mới (🚫 không để màn trống). |
| `18_1_ban_hang_tai_quay` | `18_1_010_007` | giỏ hàng của tab còn lại 🚫 KHÔNG đổi |
| `18_1_ban_hang_tai_quay` | `18_1_010_009` | đồng ý là mất sạch giỏ hàng của tab đó, 🚫 không lấy lại được. |
| `18_1_ban_hang_tai_quay` | `18_1_010_010` | chuyển tab 🚫 KHÔNG làm lẫn dữ liệu |
| `18_1_ban_hang_tai_quay` | `18_1_010_012` | tab còn lại 🚫 KHÔNG đổi |
| `18_1_ban_hang_tai_quay` | `18_1_010_013` | tab 1 giữ nguyên đơn treo, 🚫 không bị ảnh hưởng |
| `18_1_ban_hang_tai_quay` | `18_1_010_022` | Tab đóng ngay, 🚫 KHÔNG hiện hộp xác nhận (chỉ tab có hàng mới hỏi) |
| `18_1_ban_hang_tai_quay` | `18_1_020_007` | 🚫 không hiện sản phẩm nào; |
| `18_1_ban_hang_tai_quay` | `18_1_020_010` | 🚫 không báo lỗi kỹ thuật |
| `18_1_ban_hang_tai_quay` | `18_1_020_011` | 🚫 không có response 500; |
| `18_1_ban_hang_tai_quay` | `18_1_020_013` | Bảng hàng có một dòng với số lượng 3, 🚫 KHÔNG tạo 3 dòng riêng |
| `18_1_ban_hang_tai_quay` | `18_1_020_017` | 🔴 Chỉ cảnh báo nguyên văn "Chú ý: Sản phẩm này đã hết hàng" rồi VẪN cho thêm vào giỏ |
| `18_1_ban_hang_tai_quay` | `18_1_020_018` | 🔴 Chỉ cảnh báo nguyên văn "Chú ý: Số lượng đang vượt quá số lượng tồn kho" rồi VẪN cho bán tiếp |
| `18_1_ban_hang_tai_quay` | `18_1_020_019` | 🔴 Hệ thống kiểm tồn LẦN NỮA và chặn hoàn tất kèm bảng liệt kê mặt hàng thiếu. |
| `18_1_ban_hang_tai_quay` | `18_1_020_019` | Đây là chỗ chặn thật, 🚫 không phải lúc thêm hàng |
| `18_1_ban_hang_tai_quay` | `18_1_020_020` | Hàng 🚫 KHÔNG vào giỏ |
| `18_1_ban_hang_tai_quay` | `18_1_020_021` | 🚫 không có cách bán vòng qua |
| `18_1_ban_hang_tai_quay` | `18_1_020_024` | Thêm được bình thường — 🚫 không còn cảnh báo khách lẻ |
| `18_1_ban_hang_tai_quay` | `18_1_020_025` | "Tổng tiền", "VAT" và "Cần thanh toán" đổi ngay sau mỗi lần thêm, 🚫 không cần bấm lưu. |
| `18_1_ban_hang_tai_quay` | `18_1_030_001` | hệ thống nhận dãy số ở bất kỳ vị trí nào trên màn hình, 🚫 không cần đưa con trỏ vào ô tìm kiếm trước |
| `18_1_ban_hang_tai_quay` | `18_1_030_003` | 🔴 VẪN thêm sản phẩm vào đơn, chỉ kèm cảnh báo "Chú ý: Sản phẩm này đã hết hàng" |
| `18_1_ban_hang_tai_quay` | `18_1_030_004` | 🔴 VẪN thêm sản phẩm vào đơn |
| `18_1_ban_hang_tai_quay` | `18_1_030_006` | 🔴 Hệ thống VẪN tăng số lượng lên 5, chỉ cảnh báo "Chú ý: Số lượng đang vượt quá số lượng tồn kho" |
| `18_1_ban_hang_tai_quay` | `18_1_030_008` | Hàng 🚫 KHÔNG vào giỏ |
| `18_1_ban_hang_tai_quay` | `18_1_030_011` | 🚫 Không hiển thị sản phẩm nào, 🚫 không có dòng hàng mới. |
| `18_1_ban_hang_tai_quay` | `18_1_030_019` | 🔴 Hệ thống ngừng nhận dữ liệu mã vạch — 🚫 không thêm hàng, không báo lỗi. |
| `18_1_ban_hang_tai_quay` | `18_1_030_020` | Bảng hàng có đủ 3 dòng đúng sản phẩm, 🚫 không lẫn; |
| `18_1_ban_hang_tai_quay` | `18_1_040_003` | 🚫 không phân bổ được |
| `18_1_ban_hang_tai_quay` | `18_1_040_008` | 🔴 Hệ thống tự phân bổ toàn bộ tồn kho của mặt hàng vào bảng lô và hiện dòng "Đã chọn tất cả lô". |
| `18_1_ban_hang_tai_quay` | `18_1_040_013` | Ô 🚫 KHÔNG hiện nữa (chỉ hiện khi còn lô chưa nằm trong bảng) |
| `18_1_ban_hang_tai_quay` | `18_1_040_014` | Bị chặn — 🚫 không bỏ qua được. |
| `18_1_ban_hang_tai_quay` | `18_1_040_016` | 🔴 Hệ thống yêu cầu tách sản phẩm thành hai dòng riêng — một dòng lô xả kho, một dòng lô thường. |
| `18_1_ban_hang_tai_quay` | `18_1_040_018` | 🚫 không ghi phân bổ mới |
| `18_1_ban_hang_tai_quay` | `18_1_050_001` | Cột "Tổng tiền" của dòng và khối tiền bên phải đổi ngay, 🚫 không cần bấm lưu |
| `18_1_ban_hang_tai_quay` | `18_1_050_002` | 🚫 KHÔNG sửa trực tiếp được. |
| `18_1_ban_hang_tai_quay` | `18_1_050_009` | đồng ý là mất sạch giỏ hàng của tab đó, 🚫 không lấy lại từng dòng |
| `18_1_ban_hang_tai_quay` | `18_1_050_011` | 🔴 Ô số lượng của dòng quà tặng 🚫 KHÔNG sửa được. |
| `18_1_ban_hang_tai_quay` | `18_1_060_005` | Hệ thống tự nối lại cổng đã được cấp quyền, 🚫 không phải chọn cổng lại |
| `18_1_ban_hang_tai_quay` | `18_1_060_007` | 🔴 VẪN cho phép bán; |
| `18_1_ban_hang_tai_quay` | `18_1_060_008` | 🔴 VẪN cho phép bán |
| `18_1_ban_hang_tai_quay` | `18_1_060_009` | 🔴 Hệ thống chỉ cộng phần chênh so với lần cân trước nên tổng vẫn đúng = 1,5; |
| `18_1_ban_hang_tai_quay` | `18_1_060_009` | 🚫 KHÔNG cộng dồn thành 2,5 |
| `18_1_ban_hang_tai_quay` | `18_1_060_010` | 🔴 Hệ thống bỏ qua lần cân đó — 🚫 không báo lỗi, 🚫 không thêm gì vào đơn, số lượng dòng hàng 🚫 không đổi |
| `18_1_ban_hang_tai_quay` | `18_1_060_011` | 🔴 Số cân được ghi vào dòng cuối cùng của bảng — 🚫 KHÔNG có cảnh báo nào. |
| `18_1_ban_hang_tai_quay` | `18_1_060_012` | 🔴 Hệ thống bỏ qua — 🚫 không báo lỗi, 🚫 không thêm gì vào đơn |
| `18_1_ban_hang_tai_quay` | `18_1_060_013` | 🔴 Hệ thống ngừng nhận số cân. |
| `18_1_ban_hang_tai_quay` | `18_1_060_014` | Dòng quà tặng 🚫 KHÔNG nhận số cân |
| `18_1_ban_hang_tai_quay` | `18_1_060_018` | Số lượng giữ giá trị mặc định (1), 🚫 không tự nhảy về 0 |
| `18_1_ban_hang_tai_quay` | `18_1_060_019` | 🔴 Khối lượng vào dòng vừa quét (sai sản phẩm). |
| `18_1_ban_hang_tai_quay` | `18_1_060_020` | 🔴 Cả hai VẪN cho thêm vào đơn và cho bán |
| `18_1_ban_hang_tai_quay` | `18_1_060_021` | 🔴 Hệ thống chỉ lấy giá trị cân ổn định (giá trị cuối cùng khi kim đứng yên), 🚫 không lấy giá trị dao động |
| `18_1_ban_hang_tai_quay` | `18_1_060_023` | 🔴 Số lượng đã ghi 🚫 KHÔNG bị xoá về 0 khi nhấc hàng. |
| `18_1_ban_hang_tai_quay` | `18_1_060_024` | 🚫 KHÔNG bị nhầm trọng lượng giữa hai dòng; |
| `18_1_ban_hang_tai_quay` | `18_1_070_006` | 🔴 Màn thanh toán 🚫 KHÔNG mở. |
| `18_1_ban_hang_tai_quay` | `18_1_070_007` | 🔴 Mọi phím tắt tạm ngưng khi có cửa sổ đang mở (chọn sản phẩm, thanh toán, bảng khuyến mại…). |
| `18_1_ban_hang_tai_quay` | `18_1_070_008` | 🚫 Không phím nào có tác dụng — phím tắt chỉ chạy trên màn bán hàng |
| `18_2_khach_hang_va_uu_dai` | `18_2_010_006` | 🚫 không phải rời màn hình bán hàng |
| `18_2_khach_hang_va_uu_dai` | `18_2_010_009` | Hiện chi tiết điểm tích luỹ mà 🚫 không phải mở hồ sơ khách hàng |
| `18_2_khach_hang_va_uu_dai` | `18_2_010_011` | 🔴 **KHÔNG tích điểm**, **KHÔNG ghi nợ** được |
| `18_2_khach_hang_va_uu_dai` | `18_2_010_012` | 🔴 Hệ thống tính lại toàn bộ ưu đãi theo nhóm khách mới; |
| `18_2_khach_hang_va_uu_dai` | `18_2_010_013` | 🔴 🚫 KHÔNG gắn được nữa. |
| `18_2_khach_hang_va_uu_dai` | `18_2_010_015` | 🚫 không báo lỗi kỹ thuật |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_003` | 🔴 Hai dòng "Chiết khấu khuyến mãi" và "Mã coupon" **không trừ lẫn nhau**; |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_006` | Báo lỗi và 🚫 **KHÔNG** ghi mã vào đơn; |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_007` | Báo lỗi và 🚫 không ghi mã vào đơn |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_008` | Báo lỗi và 🚫 không ghi mã vào đơn |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_009` | 🚫 không ghi mã vào đơn |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_010` | 🔴 Hệ thống yêu cầu **bỏ chương trình trước**; |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_010` | 🚫 không áp được cả hai. |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_012` | Bị coi là rỗng (trim) — 🚫 không gọi API hoặc báo lỗi mã không tồn tại |
| `18_2_khach_hang_va_uu_dai` | `18_2_030_015` | Mã chuyển sang đã dùng **sau khi thanh toán thành công**, 🚫 không phải lúc bấm "Áp dụng" |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_003` | 🚫 KHÔNG có "Tên đơn vị" và "Mã số thuế" |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_004` | 🔴 Hiện "Tên đơn vị" (bắt buộc), "Mã số thuế" (bắt buộc), "Người mua hàng" (đổi tên từ "Họ và tên người mua", KHÔNG bắt buộc), "Địa chỉ đơn vị" (bắt buộc). |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_004` | 🚫 KHÔNG có "CMND/CCCD" |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_005` | 🔴 Một số ô **biến mất** kèm dữ liệu đã nhập. |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_011` | 🔴 Cả hai đều bị chặn — "Email nhận hoá đơn" là **trường bắt buộc chung** |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_012` | Xác nhận thành công — với cá nhân, "Địa chỉ" 🚫 không bắt buộc |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_017` | 🚫 không ghi gì vào đơn |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_019` | Thông tin vừa nhập 🚫 KHÔNG được lưu |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_020` | 🔴 Biên lai có **mã QR** để khách tự điền thông tin sau. |
| `18_2_khach_hang_va_uu_dai` | `18_2_040_022` | Ô 🚫 KHÔNG hiện |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_004` | 🚫 không bị trừ |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_006` | Tuỳ chọn đổi điểm 🚫 KHÔNG hiện |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_007` | Tuỳ chọn đổi điểm 🚫 không dùng được; |
| `18_2_khach_hang_va_uu_dai` | `18_2_050_010` | dòng "Điểm hiện tại" hiện 0 hoặc 🚫 không hiện. |
| `20_khach_hang_than_thiet` | `20_010_014` | 🔴 Hệ thống LƯU BÌNH THƯỜNG và toast "Tạo chương trình tích điểm thành công" — FE chỉ chặn ngày bắt đầu ở TƯƠNG LAI. |
| `20_khach_hang_than_thiet` | `20_020_006` | 🔴 Lưu bình thường với toast "Tạo chương trình đổi điểm thành công" — FE chỉ chặn ngày bắt đầu ở tương lai. |
| `20_khach_hang_than_thiet` | `20_020_007` | Chặn với toast nguyên văn "Ngày bắt đầu ở trong tương lai, không thể kich hoạt chương trình" — 🔴 chuỗi thiếu dấu ở chữ "kich hoạt", KHÁC chuỗi của màn tích điểm; |
| `20_khach_hang_than_thiet` | `20_070_003` | 🔴 Hiện màn KHÔNG khoá nút Chỉnh sửa theo vai, nên nếu vai gdv vào được là sửa được cấu hình toàn chain |
| `24_cong_no_nhan_vien` | `24_050_003` | 🚫 Không cộng gộp |
| `24_cong_no_nhan_vien` | `24_010_012` | 🚫 không được trả bảng rỗng |
| `24_cong_no_nhan_vien` | `24_010_013` | 🚫 không phải 6 request |
| `24_cong_no_nhan_vien` | `24_010_014` | cột STT trang sau tiếp tục đánh số (index + size × page + 1), 🚫 không quay về 1 |
| `24_cong_no_nhan_vien` | `24_010_017` | dữ liệu là của điểm bán mới, 🚫 không giữ trang cũ rồi ra bảng rỗng |
| `24_cong_no_nhan_vien` | `24_050_004` | 🔴 Đây là API KHÁC thẻ Công nợ theo đơn hàng — kết quả hai thẻ không phải lúc nào cũng khớp nhau |
| `32_mo_hinh_to_chuc` | `32_140_003` | 🔴 Đây là thao tác xoá sạch mô hình tổ chức |

## 3. 🔴 Kỳ vọng vốn CHỈ LÀ ghi chú — cần soạn lại (43 case)

Bản QC đang ghi *"Chưa chốt kỳ vọng — ghi lại hành vi thật của hệ thống khi test."*
Sửa kỳ vọng thật ở `<phân hệ>/test-cases.csv` rồi chạy lại.

| Phân hệ | Case | Ghi chú gốc |
|---|---|---|
| `01_quan_ly_diem_ban` | `01_020_033` | MÂU THUẪN ĐẶC TẢ: HDSD 020 bước 5 nói "Mã và tên không được trùng", nhưng code FE chỉ ràng buộc required — không có rule duy nhất cho tên. Case này để phơi hành vi thật; ghi lại có chặn hay không rồi báo,  không tự sửa tài liệu. |
| `01_quan_ly_diem_ban` | `01_040_009` | Ghi nhận thực tế từng nút ở cột Hành động của điểm bán đã ngừng hoạt động: nút nào bị chặn và chặn bằng cách nào (ẩn / mờ / báo lỗi).  Mỗi nút là một ô của bảng quyết định, ghi rõ nút nào bị chặn và chặn bằng cách nào (ẩn / disabled / báo lỗi). Cột Hành động hiện nay chỉ gác theo permKey, KHÔNG gác theo trạng thái (ShopManagement.jsx) ⇒ nếu nghiệp vụ đòi chặn thao tác trên điểm bán đã ngừng thì đây là lỗ hổng.  Không kết luận trước khi đo. |
| `02_quan_ly_nhan_vien` | `02_010_023` | KHÔNG có ô chọn số dòng mỗi trang (`showSizeChanger: false`) — khác màn Quản lý điểm bán vốn có. Đây là kỳ vọng theo code hiện tại, nếu nghiệp vụ muốn có thì là yêu cầu mới, không phải lỗi test. |
| `02_quan_ly_nhan_vien` | `02_030_003` | Sheet QC `FUNC_NHANVIEN__22` nói "TOÀN BỘ đơn vị + vai trò tự động chuyển sang Ngừng hoạt động". Code cho đổi trạng thái theo TỪNG DÒNG, không thấy xử lý lan sang dòng khác. Case này để đo: ghi rõ chỉ dòng vừa đổi sang "Đã nghỉ" hay tất cả các dòng cùng đổi.  Không chép kỳ vọng của sheet. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_050_005` | Thông báo nguyên văn `Đã huỷ 5 lịch của <tên nhân viên>` —  con số lấy từ `res.data` của backend,  không chấp nhận thông báo "thành công" chung chung; calendar của A trống sau khi nạp lại. |
| `03a_quan_ly_ca_lich_lam_viec` | `03a_050_006` | Thông báo nguyên văn "Không có lịch nào phù hợp để huỷ" (backend trả 0) —  KHÔNG được báo thành công; calendar không đổi. |
| `03b_ca_lam_viec_nhan_vien` | `03b_010_009` | Cả hai nút VẪN hiện: `isWithinTimekeepingWindow` trả `true` khi thiếu cấu hình giờ ("Thiếu cấu hình giờ → trả true (không chặn)"). Đây là bẫy SAI IM LẶNG — ca khai thiếu giờ thì mọi ràng buộc thời gian mất tác dụng mà không có cảnh báo nào. |
| `03b_ca_lam_viec_nhan_vien` | `03b_040_009` | Sheet QC `dong26` đòi "hiển thị cảnh báo và không cho chốt ca". Code FE thì nút "Chốt ca" chỉ phụ thuộc `isShiftStarted`, KHÔNG có phép kiểm giờ nào (khác nút Chấm công và Mở ca vốn bị `canTimekeep` chặn) ⇒ nhiều khả năng chốt được. Case này để ĐO;  không chép kỳ vọng của sheet, cũng  không hạ xuống "chốt được là đúng". |
| `04_1_canh_bao_ton_kho` | `04_1_020_020` | Sheet QC `FUNC_1_208` đòi "hiển thị mặc định về số 0". Thực tế ô là `InputNumber min={0}` của antd: ký tự không phải số **bị bỏ qua khi gõ**, ô giữ giá trị cũ hoặc thành rỗng (null) —  KHÔNG tự về 0. Ghi lại hành vi thật; nếu nghiệp vụ đòi về 0 thì đây là yêu cầu chưa làm. |
| `04_2_ton_kho_dau_ky` | `04_2_010_003` | Sheet QC `FUNC_1_102` đòi hai nút bị vô hiệu và hiện chữ "Đã khai báo tồn kho đầu kỳ". Grep code KHÔNG thấy chuỗi đó, cũng không thấy `disabled` theo trạng thái đã khai báo — phép chặn hiện nằm ở bước tạo phiếu (xem `04_2_020_009`). Case này để ĐO: ghi rõ nút có bị vô hiệu không và có chữ gì. |
| `04_2_ton_kho_dau_ky` | `04_2_020_014` | Sheet QC `FUNC_1_109` chỉ ghi kỳ vọng dở dang là "Hiển thị Mã lô đã tồn tại:" — chưa rõ là CHẶN hay CỘNG DỒN vào lô đó. Cần đo rồi user chốt: mã lô là khoá của lô hàng, cộng dồn vào lô có sẵn và chặn hẳn là hai nghiệp vụ khác nhau.  Không chép kỳ vọng cụt. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_010` | Sheet QC không ghi rõ kỳ vọng. Phải ĐO và ghi rõ: giảm số lượng dưới số đã xuất thì bị chặn (nếu không thì tồn âm), đổi giá thì giá vốn các phiếu xuất đã phát sinh có được tính lại hay không.  Không đoán — đây là câu hỏi số tiền. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_020_013` | Giá bình quân mới = (Q0×P0 + Q1×P1) / (Q0+Q1), tính tay để đối chiếu.  Nguồn giữ scale 6 chữ số thập phân, chỉ làm tròn lúc trình bày —  đừng so bằng số đã tròn 2 chữ số. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_030_009` | Kỳ vọng chưa chốt: tuỳ chính sách tồn âm. Phải đo và ghi rõ hệ thống chặn hay cho xuất tiếp làm tồn âm sâu hơn, và giá vốn lấy ở đâu khi không còn lô.  Không đoán — đây là gốc của sai số giá vốn. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_050_008` | Kỳ vọng chưa chốt, giống `04_3_020_010`: chưa rõ có chặn giảm dưới số đã xuất, và giá vốn của các phiếu xuất đã phát sinh có được tính lại hay không. Phải đo rồi user chốt. |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_006` | Mỗi ô bắt buộc cho một thông báo RIÊNG, lấy nguyên văn từ hệ thống; mỗi lần đều không tạo được phiếu.  Không gộp thành một case "bỏ trống hết". |
| `04_3_nhap_xuat_chuyen_kho` | `04_3_060_011` | Kỳ vọng chưa chốt, giống `04_3_030_009`: tuỳ chính sách tồn âm, và nếu cho chuyển thì giá vốn lấy ở đâu. Đo rồi user chốt. |
| `04_4_kiem_kho` | `04_4_030_004` | Sheet QC `FUNC_1_137` ghi kỳ vọng là "Check lại phần tồn kho âm" — **không phải kỳ vọng**, chỉ là ghi chú của người viết. Phải đo và ghi rõ: ô có chặn số âm hay không, nếu nhận thì chênh lệch và tồn sau áp dụng ra sao.  Không chép câu đó vào assert. |
| `04_5_quan_ly_ton_kho` | `04_5_010_004` | Vai `province` thấy danh sách điểm bán thuộc tỉnh mình; vai `shop` chỉ thấy điểm bán của mình (hoặc ô bị khoá).  Danh sách phải khớp phạm vi của vai — thiếu filter phạm vi thì backend trả TOÀN BỘ pod, không phải rỗng. |
| `04_5_quan_ly_ton_kho` | `04_5_020_010` | Sheet QC để ngỏ: *"Xoá kho thành công - Số lượng còn lại trong kho ?"* — chính người viết cũng không biết. Phải đo và ghi rõ: kho đang có tồn thì bị chặn, hay xoá được và **tồn đi đâu**.  Không đoán — đây là câu hỏi mất hàng. |
| `04_5_quan_ly_ton_kho` | `04_5_030_010` | Tổng xuất = tổng số lượng các giao dịch xuất trong khoảng, cùng lưu ý về post − pre và phiếu con kiểm kho như `04_5_030_009`. |
| `07_1_cau_hinh_chung` | `07_1_030_006` | Phơi hành vi thật: ô Mô tả không bắt buộc nên chuỗi khoảng trắng có thể lưu được, làm bộ đếm ký tự hiện 10/200 mà nội dung rỗng. Ghi lại có trim hay không. |
| `07_2_cau_hinh_kho` | `07_2_010_012` | Chỉ `tct` và `province` thấy và dùng được chức năng cài đặt khoá kho; `ward` và `shop` bị chặn (ẩn nút hoặc không vào được nhóm).  Đối chiếu với `07_2_PQ_001` đang khai vai tỉnh **vào được** — hai case phải nhất quán. |
| `07_2_cau_hinh_kho` | `07_2_080_003` | Kỳ vọng trong sheet (`dong23`) là **chép nhầm** của case thêm danh mục: *"Hiển thị message đỏ dưới trường Nhập tên danh mục"*. Phải viết theo nghiệp vụ: ghi rõ giá vốn tạm tính lấy ở đâu khi tồn đã âm sẵn.  Không chép kỳ vọng sai. |
| `07_4_van_hanh` | `07_4_050_009` | Phiếu 4 triệu đi theo **cấu hình có nhiều bước duyệt hơn** (khoảng B, 2 bước) — theo đúng kỳ vọng sheet.  Ghi rõ hệ thống có cho lưu hai khoảng giao thoa hay chặn ngay lúc lưu. |
| `08_quan_ly_san_pham` | `08_020_007` | Ghi rõ hành vi: cột SKU/Barcode của bảng quy đổi có bị ẩn, nhân bản theo biến thể, hay giữ nguyên.  Đây là chỗ sinh ra lỗi **biến thể không có parent_id = 0** và **biến thể thiếu convert_to_main_unit = 1** — hai bẫy đã gặp thật, phải ghi rõ dữ liệu sinh ra thế nào. |
| `08_quan_ly_san_pham` | `08_090_007` | Cùng câu hỏi với `08_090_005` ở mức biến thể — ghi rõ chặn / gộp / cho trùng. |
| `13-cong-no-diem-ban-tinh` | `CNDB-KY-010` | Phơi hành vi thật: căn cứ là **bằng chứng của bút toán nợ đầu kỳ** — chuỗi khoảng trắng không phải căn cứ. Ghi rõ có trim và có chặn hay không. |
| `13-cong-no-diem-ban-tinh` | `CNDB-PQ-003` | Vai `tct` thấy **nhiều tỉnh**; vai `province` chỉ thấy tỉnh của mình.  Thiếu filter phạm vi thì backend trả **TOÀN BỘ pod**, không phải rỗng — bẫy đã gặp, phải kiểm bằng con số cụ thể. |
| `14_2_gom_tach_va_xu_ly_hang_tra` | `14_2_060_007` | Ghi nhận thành công, KHÔNG bị chặn — placeholder ghi rõ "Lý do từ chối (tuỳ chọn)". HDSD 060 bước 5 viết "Nhập lý do từ chối ... rồi bấm OK" ngụ ý bắt buộc ⇒ lệch đặc tả |
| `16_hang_ky_gui` | `16_060_005` | Hệ thống tự bỏ đánh dấu chọn kỳ và nút "Đối chiếu với màn Đối soát kỳ" biến mất |
| `17_quan_ly_quay_thu_ngan` | `17_010_012` | ĐÃ CHỐT TỪ CODE: bị chặn với thông báo nguyên văn "Tên quầy thu ngân đã tồn tại" (COUNTER-005). Sheet QC `dong57` ĐÚNG, HDSD tả thiếu ràng buộc này |
| `17_quan_ly_quay_thu_ngan` | `17_020_013` | ĐÃ CHỐT TỪ CODE: bị chặn với thông báo nguyên văn "Tên quầy thu ngân đã tồn tại" (COUNTER-005). Mâu thuẫn HDSD↔sheet QC nay giải quyết: sheet QC đúng |
| `17_quan_ly_quay_thu_ngan` | `17_050_004` | Hệ thống chặn — HDSD ghi rõ Quỹ chuyển "không được trùng với Quỹ nhận"; số dư không đổi |
| `17_quan_ly_quay_thu_ngan` | `17_050_013` | CHƯA CHỐT ĐƯỢC: HDSD 050  không ghi thông báo khi chuyển quá số dư, và `ShopFundService`  không ném PodException nào. Chạy để lấy hành vi thật — nếu KHÔNG bị chặn thì đây là lỗ hổng: quỹ âm |
| `18_1_ban_hang_tai_quay` | `18_1_050_006` | Ghi lại hành vi thật; khối tiền  không được tràn số hay hiện NaN |
| `18_4_quan_ly_don_hang` | `18_4_080_008` | Hiện message.success nguyên văn "Đã ghi nhận kết quả đối soát" |
| `19_quan_ly_khach_hang` | `19_050_007` | Ghi lại nguyên văn nội dung popup. Sheet QC đòi chuỗi bắt đầu bằng "Hành động này sẽ" — cần đối chiếu với chuỗi thật trong code |
| `20_khach_hang_than_thiet` | `20_010_028` | Ghi nhận hành vi thật: ô tìm kiếm gửi keyword lên API (filterOption=false, params.keyword) nên kết quả do backend quyết. Nếu không ra nhóm thì đây là giới hạn tìm kiếm cần báo, không phải lỗi test |
| `20_khach_hang_than_thiet` | `20_050_013` | Điểm tính trên baseAmount = tổng các dòng CÒN LẠI, và mức tối thiểu cũng so với baseAmount này chứ không so với tổng đơn — nên đơn đạt mức tối thiểu vẫn có thể ra 0 điểm nếu phần còn lại tụt dưới mức. Sheet QC bỏ trống kỳ vọng dòng này |
| `20_khach_hang_than_thiet` | `20_070_001` | Menu không hiện mục Chiến dịch Loyalty và route bị chặn theo ROUTES_PERMISSION.LOYALTY.  Sheet QC còn đòi nút "Thêm mới" bị ẩn/vô hiệu khi thiếu quyền — nhưng liên kết Thêm chương trình trong CampaignList.jsx là Button trần, KHÔNG bọc PermissionButton, nên chỉ chặn được ở mức route |
| `24_cong_no_nhan_vien` | `24_010_009` | Kết quả giống hệt khi gõ tên không có khoảng trắng — backend cắt bằng keyword.trim() (EmployeeDebtServiceImpl:207). Lưu ý khoảng trắng GIỮA hai từ KHÔNG bị gộp |
| `24_cong_no_nhan_vien` | `24_070_005` | Ghi nhận hành vi thật: hoặc bị chặn, hoặc chỉ phân bổ đúng tới hết nợ và phần dư không được ghi nhận.  Nếu hệ thống ghi nhận cả phần dư thì nhân viên thành "trả thừa" mà không có chỗ hoàn — phải báo |
