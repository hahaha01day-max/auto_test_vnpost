# 24 — Công nợ nhân viên

Nguồn: `resource/hdsd/hdsd24_cong_no_nhan_vien/` — 7 task · sheet QC `uat_vnpost_nhan_vien.csv`,
`uat_vnpost_tai_chinh.csv` · trace code FE + BE.

Route đúng: **`/debt-reconciliation/employee-debt`** (🚫 không phải `/finance/employee-debt`).
Trace route/API/nhãn/thông báo và lỗ hổng đặc tả: **`test-cases.md`** — đọc trước khi viết script.

## Task và case

| Mã task | Task | Số case |
|---|---|--:|
| `010` | Tra cứu công nợ theo đơn hàng của nhân viên (gồm nhóm tìm kiếm, phân trang, phạm vi) | 18 |
| `020` | Kết xuất danh sách công nợ ra tệp Excel | 2 |
| `030` | Xem chi tiết công nợ theo đơn hàng của một nhân viên | 3 |
| `040` | Ghi nhận tiền khách trả cho các phiếu còn nợ | 3 |
| `050` | Tra cứu công nợ nhân viên với cửa hàng | 8 |
| `060` | Xem chi tiết công nợ nhân viên với cửa hàng | 3 |
| `070` | Ghi nhận nhân viên nộp tiền trả nợ cửa hàng | 8 |
| `PQ` | Phạm vi theo vai và quyền | 4 |
| | **Tổng** | **49** |

Độ phủ sheet QC: **15/15**.

## 🔴 Trước khi chạy

- **13/49 case ghi dữ liệu**, tất cả `allowMutation: false`. Nhóm `040` và `070` **sinh phiếu thu thật
  trong sổ quỹ** — HDSD nói rõ sửa lại phải nhờ bộ phận quản trị.
- Hai thẻ là **hai loại tiền và hai API khác nhau**: *Công nợ theo đơn hàng* = tiền KHÁCH nợ;
  *Công nợ với cửa hàng* = tiền NHÂN VIÊN nợ cửa hàng. 🚫 Không cộng gộp.
