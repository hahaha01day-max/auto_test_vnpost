# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 03a — Quản lý ca và lịch làm việc

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 03a_quan_ly_ca_lich_lam_viec`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `03a_quan_ly_ca_lich_lam_viec`
- Tài liệu gốc liên quan: [`uat_vnpost_nhan_vien.csv`](../test-case-goc/uat_vnpost_nhan_vien.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **19** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **19** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 64 |
| — **tài liệu gốc KHÔNG có** | 47 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 47 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `03a_010_001` | Màn Quản lý ca làm việc mở được và liệt kê ca | HDSD 010 |
| `03a_010_004` | Ca qua đêm được hiểu đúng khi giờ kết thúc sớm hơn giờ bắt đầu | HDSD 010 |
| `03a_010_005` | Bảng ca làm việc có đúng 7 cột | Quét kỹ thuật 3.4 #7 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_006` | Bỏ trống Tên ca làm việc | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_007` | Bỏ trống Thời gian làm việc | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_008` | Bỏ trống Thời gian cho phép nhân viên chấm công | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_009` | Tên ca nhập toàn khoảng trắng | Quét kỹ thuật 3.4 #2 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_010` | Giờ 00:00–04:59 bị vô hiệu ở mọi ô chọn giờ | Quét kỹ thuật 3.4 #3 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_011` | Chặn cứng khi trùng KHÍT giờ bắt đầu và kết thúc của ca khác | Quét kỹ thuật 3.4 #5 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_012` | Ca chồng lấn một phần: chọn Huỷ ở hộp thoại thì không lưu | Quét kỹ thuật 3.4 #9 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_013` | Ca chồng lấn một phần: chọn Tiếp tục lưu thì lưu được | Quét kỹ thuật 3.4 #5 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_014` | Ca khai ở trạng thái Ngừng hoạt động KHÔNG bị kiểm chồng lấn | Quét kỹ thuật 3.4 #6 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_015` | Ô chấm công bị giới hạn theo khung giờ làm việc | Quét kỹ thuật 3.4 #3 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_016` | Trạng thái mặc định khi mở drawer thêm ca | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_017` | Huỷ drawer Thêm ca thì không lưu gì và không giữ dữ liệu cũ | Quét kỹ thuật 3.4 #9 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_010_018` | Sau khi thêm ca: danh sách tăng 1 dòng và Tổng giờ tính đúng | Quét kỹ thuật 3.4 #11 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_020_002` | Chuyển ca sang Ngừng hoạt động thì không xếp lịch được nữa | HDSD 020 |
| `03a_020_003` | Chặn đổi khung giờ của ca đã có phiên chốt sổ | HDSD 020 |
| `03a_020_007` | Đổi trạng thái ca sang Ngừng hoạt động hiện đúng cảnh báo | Quét kỹ thuật 3.4 #6 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_020_008` | Bấm Huỷ ở hộp thoại ngừng hoạt động thì trạng thái không đổi | Quét kỹ thuật 3.4 #9 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_020_009` | Kích hoạt lại ca đang ngừng hiện cảnh báo khác | Quét kỹ thuật 3.4 #6 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_020_010` | Sửa tên ca thành công báo đúng thông báo | Quét kỹ thuật 3.4 #11 — trace pages/timekeeping/ShiftPage.jsx |
| `03a_030_001` | Màn Cấu hình chấm công mở được | HDSD 030 |
| `03a_030_005` | Ghi nhận giờ theo giờ chấm công thực tế | Quét kỹ thuật 3.4 #6 — trace pages/timekeeping/DrawerTimekeepingConfig.jsx |
| `03a_030_008` | Chọn nhân viên cụ thể nhưng bỏ trống danh sách | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/DrawerTimekeepingConfig.jsx |
| `03a_030_009` | Biên số phút đi muộn / về sớm | Quét kỹ thuật 3.4 #3 — trace pages/timekeeping/DrawerTimekeepingConfig.jsx |
| `03a_030_010` | Biên số ca gộp và khoảng cách giữa các ca | Quét kỹ thuật 3.4 #3 — trace pages/timekeeping/DrawerTimekeepingConfig.jsx |
| `03a_030_011` | Hai ô gộp ca ẩn lại khi tắt công tắc | Quét kỹ thuật 3.4 #6 — trace pages/timekeeping/DrawerTimekeepingConfig.jsx |
| `03a_040_002` | Danh sách ca khi xếp lịch chỉ gồm ca đang hoạt động | HDSD 040 |
| `03a_040_003` | Chặn xếp lịch lặp lại quá 90 ngày | HDSD 040 |
| `03a_040_006` | Xếp lịch lặp lại: bỏ trống ca hoặc thứ trong tuần | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/DrawerSchedule.jsx |
| `03a_040_008` | Chế độ lặp: bỏ trống Ngày kết thúc | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/DrawerSchedule.jsx |
| `03a_040_009` | Đóng drawer Xếp lịch giữa chừng thì không lưu gì | Quét kỹ thuật 3.4 #9 — trace pages/timekeeping/DrawerSchedule.jsx |
| `03a_050_003` | Hộp thoại huỷ lịch có đủ ba phạm vi | Quét kỹ thuật 3.4 #6 — trace pages/timekeeping/ScheduleListPage.jsx |
| `03a_050_004` | Chưa chọn nhân viên thì không huỷ được | Quét kỹ thuật 3.4 #1 — trace pages/timekeeping/ScheduleListPage.jsx |
| `03a_050_005` | Huỷ phạm vi "Tất cả các lịch" báo đúng SỐ lịch đã huỷ | Quét kỹ thuật 3.4 #11 — trace pages/timekeeping/ScheduleListPage.jsx |
| `03a_050_006` | Huỷ khi không có lịch nào phù hợp | Quét kỹ thuật 3.4 #11 — trace pages/timekeeping/ScheduleListPage.jsx |
| `03a_050_007` | Vào từ một ca cụ thể thì ô Nhân viên bị vô hiệu | Quét kỹ thuật 3.4 #6 — trace pages/timekeeping/ScheduleListPage.jsx |
| `03a_060_001` | Tra cứu báo cáo chốt ca theo khoảng thời gian | HDSD 060 |
| `03a_060_002` | Báo cáo chi tiết một ca đã chốt hiện đủ chỉ tiêu | HDSD 060 |
| `03a_060_003` | Ca đã chốt cho số liệu ổn định giữa hai lần xem | HDSD 060 |
| `03a_060_004` | Bảng Báo cáo chốt ca có đúng 10 cột | Quét kỹ thuật 3.4 #7 — trace features/timekeeping/pages/ShiftReportListPage.jsx |
| `03a_060_005` | Chi tiết ca đã chốt hiện đủ chỉ tiêu | Quét kỹ thuật 3.4 #7 — trace features/timekeeping/pages/ShiftReportListPage.jsx |
| `03a_060_006` | Tính lại số liệu ca khi đơn offline chưa về đủ | Quét kỹ thuật 3.4 #11 — trace features/timekeeping/pages/ShiftReportListPage.jsx |
| `03a_060_007` | Chốt số thủ công khi đơn không bao giờ về đủ | Quét kỹ thuật 3.4 #11 — trace features/timekeeping/pages/ShiftReportListPage.jsx |
| `03a_060_008` | Lọc báo cáo theo quầy thu ngân | Quét kỹ thuật 3.4 #7 — trace features/timekeeping/pages/ShiftReportListPage.jsx |
| `03a_PQ_001` | Vai giao dịch viên không vào được màn quản lý ca của điểm bán | HDSD |

## 5. Bảng đối chiếu đầy đủ 19 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_NHANVIEN__27` | Kiểm tra thêm ca làm việc thành công với đầy đủ thông tin | `03a_010_002` |
| `FUNC_NHANVIEN__28` | Kiểm tra thêm ca làm việc với trạng thái "Ngừng hoạt động" | `03a_010_002` |
| `FUNC_NHANVIEN__29` | Kiểm tra thêm ca làm việc bỏ trống trường bắt buộc | `03a_010_003` |
| `FUNC_NHANVIEN__30` | Kiểm tra khi chỉnh sửa ca làm việc thành công | `03a_020_001` |
| `FUNC_NHANVIEN__31` | Kiểm tra Hủy chỉnh sửa ca làm việc | `03a_020_006` |
| `FUNC_NHANVIEN__32` | Kiểm tra Xóa ca làm việc thành công | `03a_020_005` |
| `FUNC_NHANVIEN__33` | Kiểm tra Xóa ca làm việc thất bại | `03a_020_004` |
| `FUNC_NHANVIEN__34` | Kiểm tra thêm lịch làm việc không chọn "Lặp lại" | `03a_040_001` |
| `FUNC_NHANVIEN__35` | Kiểm tra thêm lịch làm việc và có tích chọn "Lặp lại" | `03a_040_004` |
| `FUNC_NHANVIEN__36` | Kiểm tra thêm lịch làm việc và có tích chọn "Lặp lại" - chỉ chọn ngày bắt đầu không chọn ngày kết thúc | `03a_040_004` |
| `FUNC_NHANVIEN__37` | Kiểm tra khi thêm lịch làm việc bỏ trống trường thông tin bắt buộc | `03a_040_005` |
| `FUNC_NHANVIEN__38` | Kiểm tra Xem lịch làm việc | `03a_040_007` |
| `FUNC_NHANVIEN__39` | Kiểm tra Xóa lịch làm việc khi chưa có dữ liệu chấm công thành công | `03a_050_001` |
| `FUNC_NHANVIEN__40` | Kiểm tra Xóa lịch làm việc khi chưa có dữ liệu chấm công thành công | `03a_050_002` |
| `FUNC_NHANVIEN__41` | Kiểm trả cấu hình chấm công thành công | `03a_030_002` |
| `FUNC_NHANVIEN__42` | Kiểm tra cấu hình ghi nhận giờ theo ca bắt đầuv à kết thục ca | `03a_030_004` |
| `FUNC_NHANVIEN__43` | Kiểm tra cấu hình cho phép chấm 1 lượt vào - ra khi làm nhiều ca liên tục | `03a_030_003` |
| `FUNC_NHANVIEN__44` | Kiểm tra khi cho phép tự động chấm công áp dụng cho tất cả nhân viên | `03a_030_006` |
| `FUNC_NHANVIEN__45` | Kiểm tra khi cho phép tự động chấm công áp dụng cho nhân viên cụ thể | `03a_030_007` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026, phiên hoàn thiện tài liệu test case. Phủ 19/19 case gốc, 22 → 64 case._

### 6.1 Bản trước ghi "API chưa trace" — nay đã trace xong

Toàn bộ endpoint của 3 màn nằm ở `test-cases.md` mục 1. Điểm đáng chú ý: **huỷ lịch cả ba phạm vi
dùng CHUNG một endpoint** `PUT /timekeeping/schedule/cancel`, phân biệt bằng `type` trong body —
backend tự chọn câu DELETE phù hợp.

### 6.2 🔴 Bốn ràng buộc nghiệp vụ nằm trong code mà tài liệu KHÔNG có

1. **Không khai được ca có giờ bắt đầu hoặc kết thúc trong 00:00–04:59** (`disabledHours` chặn giờ
   0–4 ở cả hai ô chọn giờ). Điểm bán làm ca đêm kết thúc 04:00 sẽ bị tắc — đáng hỏi nghiệp vụ.
2. **Trùng KHÍT giờ thì chặn cứng; chồng lấn một phần thì chỉ CẢNH BÁO** và cho "Tiếp tục lưu" với
   `allowOverlap: true`. Hai mức xử lý cho cùng một vấn đề, tài liệu không nói mức nào là đúng.
3. **Ca ở trạng thái Ngừng hoạt động không bị kiểm trùng giờ** — cả hai phép kiểm nằm trong
   `if (values.active)`. Tạo được ca trùng khít rồi kích hoạt sau; chưa rõ lúc kích hoạt hệ thống xử
   lý thế nào.
4. **Khoảng chấm công bắt buộc phủ NGOÀI khung giờ ca** (giờ bắt đầu chấm công ≤ giờ vào ca, giờ kết
   thúc ≥ giờ tan ca) — do `checkinDisabledTime` vô hiệu các giờ còn lại.

### 6.3 Giới hạn 90 ngày ở task 040 — KHÔNG tìm thấy trong FE

Task `040` nói khoảng lặp *"không quá 90 ngày"*. Đã đọc `DrawerSchedule.jsx`: **không có phép kiểm
nào về 90 ngày**, và ô *Ngày kết thúc* **không bắt buộc** (chỉ `startDate` có rule `required`). Nghĩa
là người dùng xếp lịch lặp lại mà bỏ trống ngày kết thúc thì chưa biết hệ thống xếp tới đâu.
`03a_040_003` (chặn quá 90 ngày) và `03a_040_008` (bỏ trống ngày kết thúc) đều cần user chốt.

### 6.4 Ba case gốc về cấu hình chấm công chỉ đo được MỘT NỬA ở phân hệ này

`FUNC_NHANVIEN__42` `__44` `__45` có kỳ vọng hai phần: (a) lưu cấu hình thành công, (b) *hệ thống ghi
nhận đúng giờ / đúng nhân viên được áp dụng*. Phần (a) đo tại drawer cấu hình — đã dựng
`03a_030_004` `006` `007`. Phần (b) chỉ quan sát được ở **bảng chấm công của phân hệ `03b`**; đã ghi
rõ trong cột kỳ vọng thay vì im lặng bỏ. 🔴 Khi làm `03b` phải nối lại hai nửa này.

### 6.5 Thông báo huỷ lịch mang SỐ, không phải câu chung chung

Backend trả về số lịch thực bị huỷ; FE báo `Đã huỷ <N> lịch của <tên>` hoặc **"Không có lịch nào phù
hợp để huỷ"** khi N = 0. 🚫 Script 🚫 không được assert kiểu "thấy chữ thành công" — làm vậy là bỏ
lọt đúng cái lỗi nguy hiểm nhất: báo thành công mà không xoá gì.
