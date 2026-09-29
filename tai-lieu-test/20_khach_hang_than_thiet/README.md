# 20 — Khách hàng thân thiết

Mã phân hệ lấy theo `resource/hdsd/hdsd20_*`.

Mã test case: `<mã phân hệ>_<mã task>_<STT>` — ví dụ `20_010_001`.

Trace route/API/nhãn/thông báo và lỗ hổng đặc tả: **`test-cases.md`** (đọc trước khi viết script).

## Task và case

| Mã task | Task | Số case |
|---|---|--:|
| 010 | tao_chuong_trinh_tich_diem (HDSD 010) | 32 |
| 020 | tao_chuong_trinh_doi_diem (HDSD 020) | 12 |
| 030 | chon_pham_vi_ap_dung (HDSD 030) | 10 |
| 040 | xem_chi_tiet_va_chinh_sua (HDSD 040) | 15 |
| 050 | tích điểm thực tế khi bán hàng (sheet QC `uat_vnpost_loyalty.csv`) | 23 |
| 060 | đổi điểm khi bán hàng (sheet QC + trace `RedeemCampaignService`) | 8 |
| 070 | quyền và phạm vi vai | 4 |
| | **Tổng** | **104** |

## Chạy

```
npm run test:20:list
```

## Nguồn

- `resource/hdsd/hdsd20_khach_hang_than_thiet/` — 4 task + `91_su_co.md` + `92_faq.md`
- Sheet QC `uat_vnpost_ct_loyalty.csv`, `uat_vnpost_loyalty.csv`
- Trace code: `vnpost-web/src/features/loyalty/**` · `vnpost-loyalty-service/src/main/java/sshop/loyalty/**`
- chuyển từ `08-khach-hang-than-thiet-loyalty`

## 🔴 Trước khi chạy

- **57/104 case ghi dữ liệu**, tất cả để `allowMutation: false`. Cấu hình loyalty là **của toàn chain**,
  không của riêng điểm bán — sửa một lần là mọi điểm bán trong chain đổi theo, không có bản cũ để hoàn tác.
- Nhóm `050_*` và `060_*` tạo đơn bán và trừ điểm khách **thật**.
