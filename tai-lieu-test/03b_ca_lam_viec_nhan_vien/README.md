# 03b — Ca làm việc của nhân viên

Nguồn: `resource/hdsd/hdsd03b_ca_lam_viec_nhan_vien/` — 5 task.

**48 test case** · chưa có script · phủ **23/23** case gốc sheet QC.

🔴 **Đọc `test-cases.md` trước khi viết script.** Hai thứ phải biết trước:

1. **Mục 4 — bẫy PASS GIẢ:** `routes/helpers.js` hardcode **8 số điện thoại** được bỏ qua toàn bộ
   phép chặn "phải mở ca mới bán hàng được". Tài khoản test rơi vào danh sách đó là nhóm
   `03b_060_*` pass giả. **Đối chiếu SĐT trước khi chạy.**
2. **Mục 2 — bẫy sai im lặng:** ca khai thiếu giờ bắt đầu/kết thúc thì `isWithinTimekeepingWindow`
   trả `true`, mọi ràng buộc thời gian mất tác dụng, không cảnh báo gì.

**35/48 case `BLOCKED`** — cao nhất trong các phân hệ, và đó là bản chất phân hệ này: mọi case cần
một trạng thái ca cụ thể lúc chạy, mà trạng thái đó chỉ dựng được bằng mở ca / chốt ca **thật**.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Xem ca làm việc của mình trong ngày | `03b_010_001` … | 9 |
| `020` | Chấm công đến và chấm công về | `03b_020_001` … | 7 |
| `030` | Mở ca bán hàng | `03b_030_001` … | 8 |
| `040` | Chốt ca và xử lý lệch quỹ tiền mặt | `03b_040_001` … | 12 |
| `050` | Xem báo cáo ca vừa chốt | `03b_050_001` … | 5 |
| `060` | Chặn bán hàng khi chưa đủ điều kiện ca | `03b_060_001` … | 4 |
| `070` | Chế độ offline và tự đồng bộ | `03b_070_001` … | 2 |
| `PQ` | Phạm vi dữ liệu | `03b_PQ_001` | 1 |

## 🔴 Case ghi dữ liệu — 23 case, `allowMutation: false`

Đây là phân hệ ghi **TIỀN MẶT**: mở ca khai quỹ · chốt ca ghi chênh lệch và sinh phiếu chờ quản lý
duyệt · mở lại ca gỡ khoá số liệu đã chốt · mở ca khi còn ca chưa chốt thì hệ thống **tự chốt ca cũ**
(chốt một ca người thật đang dùng).

## Cách điền

1. Đọc `resource/hdsd/hdsd03b_ca_lam_viec_nhan_vien/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `03b_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
