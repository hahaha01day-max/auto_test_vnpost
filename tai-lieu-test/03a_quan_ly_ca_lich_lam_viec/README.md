# 03a — Quản lý ca và lịch làm việc

Nguồn: `resource/hdsd/hdsd03a_quan_ly_ca_lich_lam_viec/` — 6 task.

**64 test case** · chưa có script · phủ **19/19** case gốc sheet QC.

🔴 **Đọc `test-cases.md` trước khi viết script** — có đủ endpoint đã trace, và mục 2 liệt kê
**4 ràng buộc nghiệp vụ chỉ nằm trong code**: không khai được ca giờ 00:00–04:59 · trùng khít giờ thì
chặn cứng nhưng chồng lấn một phần chỉ cảnh báo · ca Ngừng hoạt động không bị kiểm trùng · khoảng
chấm công bắt buộc phủ ngoài khung giờ ca.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Khai báo ca làm việc | `03a_010_001` … | 18 |
| `020` | Sửa, ngừng hoạt động và xoá ca làm việc | `03a_020_001` … | 10 |
| `030` | Cấu hình quy tắc chấm công | `03a_030_001` … | 11 |
| `040` | Xếp lịch làm việc cho nhân viên | `03a_040_001` … | 9 |
| `050` | Huỷ lịch làm việc đã xếp | `03a_050_001` … | 7 |
| `060` | Tra cứu báo cáo chốt ca | `03a_060_001` … | 8 |
| `PQ` | Phân quyền / phạm vi | `03a_PQ_001` | 1 |

## 🔴 Case ghi dữ liệu — 29 case, `allowMutation: false`

Nặng nhất: **huỷ lịch** (huỷ xong không dựng lại được bằng UI), **chốt số ca thủ công** (ghi chênh
lệch tiền chờ duyệt), **cấu hình chấm công** (áp cho toàn điểm bán), **ngừng hoạt động một ca**
(chốt ngay mọi phiên thu ngân đang mở trong ca đó).

## Cách điền

1. Đọc `resource/hdsd/hdsd03a_quan_ly_ca_lich_lam_viec/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `03a_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
