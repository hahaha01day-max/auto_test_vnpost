# Kịch bản auto test — 03a Quản lý ca & lịch làm việc

- Dựng 18/09/2026 từ `resource/hdsd/hdsd03a_quan_ly_ca_lich_lam_viec/tasks/*.md` (6 task).
- **Bổ sung 18/09/2026:** trace API + nhãn thật từ code FE và quét 11 kỹ thuật mục 3.4. **22 → 64 case.**
  Phủ **19/19** case gốc sheet QC.
- 🚫 Chưa viết script.

## 1. Route và API — ĐÃ trace từ code (bản trước ghi "API chưa trace")

| Màn hình | Route | Component |
|---|---|---|
| Quản lý ca làm việc | `/employee/shift` | `pages/timekeeping/ShiftPage.jsx` |
| Lịch làm việc | `/employee/schedule` | `pages/timekeeping/ScheduleListPage.jsx` + `WorkScheduleCalendar.jsx` |
| Báo cáo chốt ca | `/employee/shift-report` | `features/timekeeping/pages/ShiftReportListPage.jsx` |
| Drawer xếp lịch | — | `pages/timekeeping/DrawerSchedule.jsx` |
| Drawer cấu hình chấm công | — | `pages/timekeeping/DrawerTimekeepingConfig.jsx` |

| Việc | Method + URL |
|---|---|
| Danh sách ca | `GET /timekeeping/shift-all` |
| Thêm / sửa ca | `POST` / `PUT /timekeeping/shift` |
| Xoá ca | `DELETE /timekeeping/shift` (params `shopId`, `id`) |
| Xếp lịch một ngày | `POST /timekeeping/schedule` |
| Xếp lịch lặp lại | `POST /timekeeping/schedule/batch` |
| Đọc lịch | `GET /timekeeping/schedule` |
| Huỷ lịch (cả 3 phạm vi) | `PUT /timekeeping/schedule/cancel` — body `{type: ONE\|FUTURE\|ALL}` |
| Đổi lịch | `PUT /timekeeping/schedule/{scheduleId}/reschedule` |
| Chấm công vào / ra | `POST /timekeeping/schedule/check-in` · `check-out` |
| Cấu hình chấm công | `GET` / `PUT /timekeeping/config/advanced-rules` |
| Báo cáo chốt ca | `GET /timekeeping/shift-report/closed` · `/unclosed` · `/summary` · `/{id}` · `/{id}/recompute` |

⚠️ Nhãn tiếng Việt trong DOM ở dạng tổ hợp (NFD) — chuẩn hoá trước khi so chuỗi.

## 2. 🔴 Ràng buộc THẬT của màn Quản lý ca — HDSD không nói

| Ràng buộc | Chi tiết | Case |
|---|---|---|
| **Giờ 00:00–04:59 bị vô hiệu** | `disabledHours: [...Array(5).keys(), 24]` ở cả hai ô chọn giờ ⇒ không khai được ca bắt đầu/kết thúc trong khoảng này | `03a_010_010` |
| **Ca qua đêm được hỗ trợ** | `normalizeRange`: `end <= start` thì cộng 24h | `03a_010_004` |
| **Trùng KHÍT giờ thì chặn CỨNG** | `message.error("Đã tồn tại ca cùng giờ bắt đầu và kết thúc: <tên>")`, không có đường đi tiếp | `03a_010_011` |
| **Chồng lấn một phần chỉ CẢNH BÁO** | hộp thoại "Ca làm việc bị chồng lấn" → "Tiếp tục lưu" gửi `allowOverlap: true` | `03a_010_012` `013` |
| 🔴 **Ca Ngừng hoạt động KHÔNG bị kiểm trùng** | cả hai phép kiểm nằm trong `if (values.active)` | `03a_010_014` |
| **Khoảng chấm công phải phủ ngoài khung giờ ca** | giờ bắt đầu chấm công ≤ giờ vào ca; giờ kết thúc ≥ giờ tan ca (giờ khác bị vô hiệu) | `03a_010_015` |
| **Đổi trạng thái luôn phải xác nhận** | ngừng: *"Các phiên thu ngân đang mở trong ca này sẽ được chốt ngay…"*; kích hoạt: *"Ca làm việc sẽ được chuyển sang trạng thái Hoạt động."* | `03a_020_007`–`009` |

Ô bắt buộc của drawer khai ca: **Tên ca làm việc** (*"Vui lòng nhập tên ca"*) · **Thời gian làm việc**
(*"Vui lòng chọn thời gian làm việc"*) · **Thời gian cho phép nhân viên chấm công**
(*"Vui lòng chọn thời gian chấm công"*) · **Trạng thái** (mặc định Hoạt động).

## 3. Cấu hình chấm công — 6 công tắc, nhóm nào bật mới hiện ô con

| Nhóm | Lựa chọn / ô |
|---|---|
| Ghi nhận giờ chấm công | *Theo giờ chấm công thực tế* ↔ *Theo giờ bắt đầu và kết thúc ca* |
| Thiết lập thời gian đi muộn / về sớm | *Tính đi muộn sau* (`min 0`) · *Tính về sớm trước* (`min 0`) — 🔴 **không có giới hạn trên** |
| Cho phép chấm 1 lượt vào ra khi làm nhiều ca liên tục | *Ghi nhận cho tối đa* (`min 1, max 10`) · *Mỗi ca cách nhau tối đa* (`min 0`) |
| Cho phép tự động chấm công | *Áp dụng cho tất cả nhân viên* ↔ *Áp dụng cho nhân viên cụ thể* (ô chọn 🔴 **không required**) |

Thông báo lưu: **"Cập nhật cấu hình thành công"**.

## 4. Huỷ lịch — 3 phạm vi, một endpoint

`ONE` (chỉ ca này, ô Nhân viên bị vô hiệu) · `FUNC`→`FUTURE` (từ một ngày trở đi, có ô *Huỷ từ ngày*)
· `ALL` (tất cả các lịch). 🔴 Thông báo thành công **mang số lịch thật do backend trả về**:
`Đã huỷ <N> lịch của <tên>`, hoặc **"Không có lịch nào phù hợp để huỷ"** khi N = 0.
🚫 Không chấp nhận assert "thấy chữ thành công".

## 5. Vai

HDSD khai `[BUU_DIEN_XA, BUU_DIEN_TINH]` cho cả 6 task ⇒ dùng `ward`. `03a_PQ_001` dùng `gdv` để kiểm chặn.

## 6. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 51 |
| `BLOCKED` | 13 |

`BLOCKED` chia hai loại:

1. **Kỳ vọng chưa chốt / thiếu đặc tả** — `03a_010_009` `03a_010_014` `03a_020_003` `03a_030_002`
   `03a_030_008` `03a_030_009` `03a_040_008`.
2. **Thiếu dữ liệu nền** — `03a_020_004` `03a_050_005` `03a_050_006` `03a_060_003` `03a_060_006`
   `03a_060_007`.

## 7. Case ghi dữ liệu — 🔴 29 case, chưa ai được phép chạy

Bốn nhóm, xếp theo mức khó cứu:

1. 🔴 **Huỷ lịch** (`03a_050_001` `002` `005` `006`) — **huỷ xong không dựng lại được bằng UI** nếu
   không nhớ lịch cũ. Chỉ chạy trên điểm bán dựng riêng.
2. 🔴 **Chốt số ca thủ công** (`03a_060_007`) — ghi một khoản **chênh lệch tiền chờ duyệt** vào sổ.
3. 🔴 **Cấu hình chấm công** (`03a_030_002` `004`–`010`) — áp cho **toàn bộ điểm bán**, đổi là mọi
   nhân viên đang chấm công bị ảnh hưởng ngay.
4. **Khai / sửa ca và xếp lịch** (`03a_010_*` `03a_020_*` `03a_040_*`) — ngừng hoạt động một ca sẽ
   **chốt ngay các phiên thu ngân đang mở** trong ca đó.

## 8. Lỗ hổng đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | **Task 020 nói "hệ thống chặn ở bước lưu"** khi đổi khung giờ ca đã chốt sổ nhưng **không ghi thông báo nguyên văn**; code FE cũng không có phép kiểm này ⇒ nếu có thì ở backend. `03a_020_003` vẫn `BLOCKED`. |
| 2 | **Task 040 nói khoảng lặp "không quá 90 ngày"** nhưng không nói chặn ở FE hay BE. Code FE **không thấy** phép kiểm 90 ngày, và ô *Ngày kết thúc* **không bắt buộc** ⇒ chưa rõ hệ thống xếp đến đâu. |
| 3 | 🔴 **Giờ 00:00–04:59 không khai được ca** — ràng buộc kỹ thuật không có trong tài liệu. Điểm bán làm ca đêm kết thúc 04:00 sẽ bị tắc. |
| 4 | 🔴 **Chồng lấn giờ chỉ là cảnh báo, trùng khít mới chặn.** Hai mức xử lý khác nhau cho cùng một vấn đề, tài liệu không nói. |
| 5 | 🔴 **Ca Ngừng hoạt động không bị kiểm trùng giờ** ⇒ tạo được ca trùng khít rồi kích hoạt sau. Chưa rõ hệ thống xử lý thế nào lúc kích hoạt. |
| 6 | **Không có giới hạn trên cho số phút đi muộn / về sớm** — nhập 9999 phút vẫn lưu. |
| 7 | **Bật "tự động chấm công cho nhân viên cụ thể" mà để trống danh sách** vẫn lưu được (ô không `required`) ⇒ bật mà không ai được áp dụng. |
| 8 | **Sheet QC `FUNC_NHANVIEN__42` `44` `45` đòi kiểm "hệ thống ghi nhận đúng giờ / đúng nhân viên"** — phần đó nằm ở **bảng chấm công phân hệ 03b**, không đo được tại drawer cấu hình. Đã ghi rõ trong kỳ vọng. |

## 8b. 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/03a_quan_ly_ca_lich_lam_viec/playwright.config.js
```

| Nhóm | Số case |
|---|--:|
| **Đã chạy và ĐẠT** | **24** |
| **Đã chạy và HỎNG — phát hiện về sản phẩm, 🚫 không sửa test** | **2** |
| **Chưa chạy** (ghi dữ liệu / kỳ vọng chưa chốt / thiếu dữ liệu nền) | 38 |

Script: `tests/shift-page.js` (helper) + 5 spec — `quan-ly-ca.shop` · `them-sua-ca-ghi.shop` ·
`cau-hinh-cham-cong.shop` · `xep-lich.shop` · `bao-cao-chot-ca.shop` · `phan-quyen.gdv`.

### 🔴 Vai chạy thật là `shop`, KHÔNG phải `ward` như HDSD khai

Đo 20/09/2026: `ward` chưa có tài khoản trong `.env`; `province` (`qltls01`) **mở được màn** nhưng
`GET /timekeeping/shift-all` trả **rỗng** ⇒ chạy ở đó là "pass rỗng". Vai `shop` (`chtls01`,
shopId 68056) có 2 ca, có lịch và 3 ca đã chốt. Đã đổi `role` của 63 case sang `shop`.

### Hai case đỏ — đều là phát hiện về sản phẩm

1. 🔴 **`03a_040_003` — KHÔNG có phép kiểm "không quá 90 ngày".** Khai đủ nhân viên · ca · thứ T2 và
   khoảng **01/01/2026 – 31/12/2026 (365 ngày)**, FE vẫn gửi `POST /timekeeping/schedule/batch`
   (request bị chặn ở tầng mạng nên 🚫 không lịch nào được tạo). Không thông báo nào nhắc 90 ngày.
   ⇒ Nếu ràng buộc có thật thì nó chỉ ở backend — cần user chốt.
2. 🔴 **`03a_PQ_001` — vai Giao dịch viên VÀO ĐƯỢC màn Quản lý ca của điểm bán**, API
   `shift-all` trả **200** hai lần và bảng hiện đủ ca. Kịch bản đòi chặn ⇒ lỗ hổng phân quyền.

### Lệch nhỏ đã đo, ghi để user chốt

- 🔴 **`03a_050_003`**: mở hộp thoại huỷ từ nút chung chỉ có **hai** phạm vi (*Từ một ngày trở đi*,
  *Tất cả các lịch*). Lựa chọn *Chỉ ca này* chỉ xuất hiện khi vào từ nút huỷ của một ca cụ thể —
  đúng như `03a_050_007` mô tả. Kịch bản đòi ba lựa chọn trong cùng một hộp thoại ⇒ case đang đỏ
  ở vế này, 🚫 không hạ kỳ vọng trước khi user quyết.
- **Ô chọn giờ ẩn hẳn giờ 00–04** (`hideDisabledOptions`), 🚫 không phải hiện-mà-mờ.
- **Chi tiết ca đã chốt là MODAL dựng từ dữ liệu đã nạp**, 🚫 không gọi API riêng.

## 9. Việc còn lại

1. ✅ **XONG 20/09/2026** — đã viết script cho toàn bộ 64 case (xem mục 8b).
2. Trình user mục 8, nhất là số 2 (giới hạn 90 ngày), 3, 4, 5.
3. Dựng điểm bán riêng cho nhóm huỷ lịch và nhóm báo cáo chốt ca.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `03a_030_008` | Chọn nhân viên cụ thể nhưng bỏ trống danh sách | Chờ chạy để lấy hành vi thật | 🔴 Phơi hành vi thật: ô `autoCheckinEmployeeIds` KHÔNG có rule `required` trong code ⇒ có thể lưu cấu hình "tự động chấm công cho nhân viên cụ thể" mà danh sách rỗng, tức bật mà không ai được áp dụng. Kỳ vọng nghiệp vụ l… |

**1/64 case** của phân hệ này chưa chốt được kỳ vọng.
