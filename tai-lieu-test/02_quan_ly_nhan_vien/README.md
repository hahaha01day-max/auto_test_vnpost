# 02 — Quản lý nhân viên

Mã phân hệ lấy theo `resource/hdsd/hdsd02_*`. Mã test case: `<mã phân hệ>_<mã task>_<STT>`.

**72 test case** · đã có script **72/72** (20/09/2026) · phủ **26/26** case gốc sheet QC.

Lần chạy đầy đủ 20/09/2026: **50 đạt · 2 đỏ (lỗi sản phẩm) · 20 chưa chạy** — chi tiết ở mục 7b của
`test-cases.md`. 🚫 Đừng đọc "20 chưa chạy" là "chưa ai viết": đó là case ghi dữ liệu thật, case
kỳ vọng chưa chốt và case thiếu vai.

```bash
npx playwright test --config tai-lieu-test/02_quan_ly_nhan_vien/playwright.config.js
```

🔴 **Đọc `test-cases.md` trước khi viết script** — ở đó có route/API trace từ code, và quan trọng nhất
là **bảng ô nhập THẬT của modal Thêm/Sửa**: phần lớn ô trong file `addOrEditEmployeeModal/index.jsx`
đã bị comment out, chỉ còn 4 ô bắt buộc + khối `roles`. Đếm bằng grep là đếm sai.

## Task và case

| Mã task | Task | Số case |
|---|---|--:|
| 010 | Tra cứu, tìm kiếm và lọc danh sách nhân viên | 29 |
| 020 | Thêm mới nhân viên | 31 |
| 030 | Sửa thông tin và điều chuyển nhân viên | 8 |
| 040 | Xem chi tiết nhân viên (3 thẻ) | 4 |

## Bẫy của màn này

1. **Tìm kiếm chỉ chạy khi nhấn Enter** — gõ xong không nhấn thì không có request nào.
2. **Phân trang 1-based** (`params.page = 1`), khác quy ước 0-based ở `frontend_core.md`.
3. **Không có ô đổi số dòng/trang** và **không có cột Hành động** — vào chi tiết bằng liên kết ở tên.
4. **Vai trò / Chi nhánh làm việc / Trạng thái làm việc ở hàng mở rộng**, không ở bảng chính.
5. **Hai loại trạng thái dễ lẫn:** cột "Trạng thái" là trạng thái TÀI KHOẢN (Kích hoạt / Khóa);
   "Trạng thái làm việc" (Đang làm / Đã nghỉ) là của từng phân công.
6. 🔴 **Tạo nhân viên = tạo tài khoản đăng nhập thật** (`username`) + phân quyền thật. Mọi case ghi
   dữ liệu đều `allowMutation: false`, và màn 🚫 không có chức năng xoá để dọn lại.
7. 🔴 **Vai Bưu điện Tỉnh nhận 401 ở API danh sách** trong khi mọi API khác 200 — màn rỗng im lặng.
   Phát hiện lúc chạy 20/09, chưa sửa ⇒ `02_010_029` còn đỏ. 🚫 Đừng chữa bằng cách đổi vai.
8. 🔴 **Nút *Chỉnh sửa* ở màn chi tiết gọi ref của thẻ đang mở** — bấm trước khi thẻ nạp xong thì
   drawer mở ra trắng trơn. Phải chờ dữ liệu hiện trên màn rồi mới bấm.

## Nguồn

- Sheet QC `test-case-goc/uat_vnpost_quan_ly_nhan_vien.csv` (26 case, phủ hết)
- Trace code `vnpost-web/src/pages/employee/**`
- Quét 11 kỹ thuật thiết kế test, mục 3.4 skill `test-scenario`
