# Kịch bản auto test — 07_4 Cấu hình vận hành

- **Bổ sung 18/09/2026:** đối chiếu trọn sheet QC + quét 11 kỹ thuật mục 3.4. **13 → 32 case.**
  Phủ **20/20** case gốc (trước đó 1). 🚫 Chưa có script.

## 1. Task

`010` Nhận đặt hàng trước (4) · `020` Hạn mức duyệt — bảng, bật/tắt, sửa (4) ·
`030` Cấu hình thông báo (3) · `040` Hòm mail nhận hoá đơn NCC (3) ·
`050` **Cấu hình luồng phê duyệt** — khoảng tiền, bước duyệt, thứ tự duyệt (17) · `PQ` (1)

## 2. Nhóm `050` — cấu hình luồng phê duyệt, phần nặng nhất

| Ràng buộc | Case |
|---|---|
| Đủ **4 cấp tổ chức**: Điểm bán · Bưu điện xã · Bưu điện tỉnh · Tổng công ty | `07_4_050_006` |
| **Min phải nhỏ hơn Max** — lỗi nguyên văn *"Min phải nhỏ hơn Max"* | `07_4_050_008` |
| Mỗi bước duyệt gán **đúng một vai** | `07_4_050_005` |
| Hai khoảng tiền **giao thoa** ⇒ ưu tiên cấu hình có **nhiều bước duyệt hơn** | `07_4_050_009` |
| Vai bước 2 **không thấy** phiếu khi bước 1 chưa xong | `07_4_050_012` |
| Từ chối ở bước 1 ⇒ phiếu **Từ chối**, không sang bước tiếp | `07_4_050_014` |

🔴 **Đối chiếu liên phân hệ:** `07_4` **có** phép kiểm Min < Max, còn `04_1` (ngưỡng cảnh báo tồn kho)
**không có**. Hai màn không nhất quán — đáng báo một lần cho cả hai.

## 3. 🔴 Năm câu hỏi sinh PHIẾU TREO — không có đặc tả

| Case | Câu hỏi |
|---|---|
| `07_4_020_003` | Cấu hình đang **tắt** ⇒ phiếu thuộc khoảng tiền đó được duyệt thẳng hay bị kẹt? |
| `07_4_020_004` | **Sửa** cấu hình ⇒ phiếu đang chờ duyệt dở đi theo luồng nào? |
| `07_4_050_009` | Hệ thống có **cho lưu** hai khoảng tiền giao thoa, hay chặn lúc lưu? |
| `07_4_050_010` | Phiếu **ngoài mọi khoảng tiền** bị kẹt hay duyệt thẳng? |
| `07_4_050_016` | **Xoá một bước duyệt** ⇒ phiếu đang chờ ở đúng bước đó đi đâu? |

## 4. Phân loại: `READY_WITH_CODE_LOOKUP` 7 · `BLOCKED` 25 · case ghi **22**

🔴 Đổi cấu hình hạn mức duyệt là **đổi đường đi của mọi phiếu phát sinh sau đó**.

## 5. Việc còn lại

1. Trả lời 5 câu hỏi ở mục 3 — mỗi câu là một cách làm phiếu treo.
2. Xin **tài khoản đúng vai của bước 1 và bước 2** trong luồng duyệt, và một vai ngoài luồng.
3. Báo chung mục 2 (Min < Max không nhất quán giữa `07_4` và `04_1`).

## 🔴 Kết quả chạy script — 20/09/2026

**32/32 case có script.** Lượt chạy: **8 đạt · 0 đỏ · 24 skip**.

### Trace đã có — 🚫 đừng tra lại

| Nhóm | `?setting=` | Đo được |
|---|---|---|
| Nhận đặt hàng trước | `bookingReservation` | một biểu mẫu, có cây đơn vị chọn phạm vi |
| Hạn mức duyệt | `approvalLimit` | bảng *STT · Tên cấu hình · Số khoảng tiền* |
| Cấu hình thông báo | `notificationConfig` | nút *Làm mới* · *Thêm cấu hình* · *Chi tiết*; ô tìm kiếm riêng **"Tìm kiếm loại thông báo, theo tính năng"** |
| Hòm mail nhận hoá đơn NCC | `mailInbox` | nút *Thêm hòm mail* · *Sửa* · *Kiểm tra* |
| Luồng phê duyệt đặt hàng | `orderApprovalFlow` | nhóm `050`, toàn case ghi |

`07_4_PQ_001` **ĐẠT**: vai tỉnh mở được Hòm mail và bị chặn ở Hạn mức duyệt.

### 24 case chưa chạy

22 case GHI + 2 case cần dữ liệu nền. 🔴 Nhóm `050` (17 case) quyết định **phiếu của cả mạng lưới
đi qua ai duyệt** — sửa nhầm là phiếu treo không ai duyệt được, nên giữ `allowMutation: false`.
