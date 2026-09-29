# 18_1 — Bán hàng tại quầy (POS)

Mã phân hệ lấy theo `resource/hdsd/hdsd18_1_*`. Mã test case: `<mã phân hệ>_<mã task>_<STT>`.

## Task và case

| Mã task | Task (theo HDSD) | Số case |
|---|---|--:|
| 010 | mo_man_hinh_ban_hang (+ tab đơn, khách của tab) | 23 |
| 020 | them_san_pham_vao_don | 26 |
| 030 | quet_ma_vach | 20 |
| 040 | chon_lo_serial | 18 |
| 050 | dieu_chinh_dong_hang | 12 |
| 060 | can_dien_tu | 24 |
| 070 | phim_tat | 8 |
| | **Tổng** | **131** |

Độ phủ sheet QC: **56/56** — xem [`doi-chieu-tai-lieu-goc.md`](doi-chieu-tai-lieu-goc.md).

## 🔴 Điều kiện chạy

- **Ca làm việc phải đang mở**, nếu không hệ thống chặn ngay ở bước vào màn bán hàng.
- Vai: **`gdv`** (giao dịch viên) cho toàn bộ — cả 7 task HDSD chỉ khai `DIEM_BAN`.
- **13/131 case ghi dữ liệu**, tất cả `enabled: false` + `allowMutation: false`. Chúng tạo **đơn hàng
  thật** và **trừ tồn kho thật**.

## 🔴 44 case cần THIẾT BỊ — đọc mục 8 `test-cases.md` trước khi viết script

Nhóm `030` (máy quét mã vạch) và `060` (cân điện tử qua Web Serial API) 🚫 **không tự động hoá trọn
vẹn bằng Playwright được** — hộp chọn cổng của trình duyệt nằm ngoài tầm điều khiển của Playwright.
Khuyến nghị tách thành bộ chạy tay riêng, 🚫 đừng để skip im lặng trong project chung.

## Nguồn

- HDSD: `resource/hdsd/hdsd18_1_ban_hang_tai_quay/tasks/*.md` (đọc trọn 7/7)
- Sheet QC: `dong65`–`dong91` · `BANHANG_135`–`BANHANG_163`
- Code FE: `vnpost-web/src/features/order/**` · `utils/constants/config.jsx`

## Chạy

```bash
npm run test:18_1:list
```
