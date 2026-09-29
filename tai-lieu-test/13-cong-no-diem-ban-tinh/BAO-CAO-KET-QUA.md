# Báo cáo auto test — Công nợ điểm bán ↔ Bưu điện Tỉnh (phân hệ 13)

- Thời điểm chạy: **15/09/2026 17:02** · `http://localhost:3100` (DB test)
- Tổng **31 case**: **16 đạt · 0 hỏng · 15 chưa chạy**
- 🔴 "Chưa chạy" KHÁC "đạt": mỗi case bỏ qua đều kèm lý do; 🚫 không tính vào nghiệm thu.
- ⚠️ Nhóm khai/ký nợ đầu kỳ và nhóm kiểm đếm chuyến chỉ chạy được MỘT LẦN trên môi trường sạch.

| Mã case | Nội dung | Kết quả | Ghi chú |
|---|---|---|---|
| `CNDB-ND-001` | Man No dau ky diem ban mo duoc va goi dung API | ✅ Đạt |  |
| `CNDB-ND-002` | Canh bao liet ke so diem ban chua khai no dau ky | ✅ Đạt |  |
| `CNDB-ND-003` | Form khai mo san dung cac diem ban con thieu | ⏳ Chưa chạy | Tiền điều kiện: tỉnh không còn điểm bán nào chưa khai nợ đầu kỳ |
| `CNDB-ND-004` | Chan tao ban khai khi bo trong so tien | ⏳ Chưa chạy | Tiền điều kiện: tỉnh không còn điểm bán nào chưa khai nợ đầu kỳ |
| `CNDB-ND-005` | Chan tao ban khai khi bo trong can cu | ⏳ Chưa chạy | Tiền điều kiện: tỉnh không còn điểm bán nào chưa khai nợ đầu kỳ |
| `CNDB-ND-006` | Tao ban khai no dau ky thanh cong | ⏳ Chưa chạy | Tiền điều kiện: tỉnh không còn điểm bán nào chưa khai |
| `CNDB-ND-007` | Vai diem ban khong thay nut Duyet va ky | ✅ Đạt |  |
| `CNDB-ND-008` | Duyet va ky ban khai no dau ky | ⏳ Chưa chạy | Tiền điều kiện đã bị tiêu thụ: mọi điểm bán của tỉnh đã có nợ đầu kỳ ĐÃ KÝ từ lần chạy trước. Cần môi trường có điểm bán chưa ký (hoặc chạy script clear dữ liệu test) mới kiểm lại được. |
| `CNDB-ND-009` | Chan khai de len so da ky cua cung diem ban | ✅ Đạt |  |
| `CNDB-KY-001` | Man Doi soat cong no ban hang mo duoc va goi dung API | ✅ Đạt |  |
| `CNDB-KY-002` | Chan mo ky khi ky khong tron thang | ⏳ Chưa chạy | Case CNDB-KY-002 đang tắt trong test-input.json. |
| `CNDB-KY-003` | Chan mo ky khi con diem ban chua khai no dau ky | ⏳ Chưa chạy | Tiền điều kiện: tỉnh đã khai đủ nợ đầu kỳ nên không còn gì để chặn |
| `CNDB-KY-004` | Chan mo ky khong lien mach voi ky truoc | ✅ Đạt |  |
| `CNDB-KY-005` | No dau ky cua ky dau tien bang so da khai va ky | ✅ Đạt |  |
| `CNDB-KY-006` | Cong thuc so du mang sang dung tren tung diem ban | ✅ Đạt |  |
| `CNDB-KY-007` | No dau ky cua ky sau bang no cuoi ky cua ky truoc | ✅ Đạt |  |
| `CNDB-KY-008` | Tong ky bang tong cac dong diem ban | ✅ Đạt |  |
| `CNDB-KY-009` | Ky van ky duoc khi con phieu da giao ma Tinh chua xac nhan | ⏳ Chưa chạy | Chưa có script cho case này |
| `CNDB-CD-001` | Man Buu dien Tinh nhan tien mo duoc va goi dung API | ✅ Đạt |  |
| `CNDB-CD-002` | Drawer kiem dem la bang tung tui va khong co o nhap tong | ⏳ Chưa chạy | Không có chuyến bàn giao nào ở trạng thái chờ xác nhận |
| `CNDB-CD-003` | Tong thuc nhan tu cong tu cac dong | ⏳ Chưa chạy | Không có chuyến bàn giao nào ở trạng thái chờ xác nhận |
| `CNDB-CD-004` | Chan xac nhan khi con tui chua kiem dem | ⏳ Chưa chạy | Không có chuyến bàn giao nào ở trạng thái chờ xác nhận |
| `CNDB-CD-005` | Chan xac nhan khi tui lech ma khong ghi nguyen nhan | ⏳ Chưa chạy | Không có chuyến bàn giao nào ở trạng thái chờ xác nhận |
| `CNDB-CD-006` | Xac nhan chuyen khop tao but toan va dong phieu con | ✅ Đạt |  |
| `CNDB-CD-007` | Tui thieu sinh dung mot dong no don vi van chuyen | ⏳ Chưa chạy | Không có chuyến bàn giao nào ở trạng thái chờ xác nhận |
| `CNDB-CD-008` | Diem bantru du so da giao du tui bi thieu | ✅ Đạt |  |
| `CNDB-LPB-001` | Man No don vi van chuyen mo duoc va goi dung API | ✅ Đạt |  |
| `CNDB-LPB-002` | Tong con treo cong tri tuyet doi khong trieu tieu am duong | ⏳ Chưa chạy | Chưa có script cho case này |
| `CNDB-LPB-003` | Loc theo trang thai khoan lech | ✅ Đạt |  |
| `CNDB-PQ-001` | Vai diem ban khong vao duoc tab cap Tinh | ✅ Đạt |  |
| `CNDB-PQ-002` | Duong xac nhan le tung phieu da bi khoa o may chu | ⏳ Chưa chạy | Chưa có script cho case này |

## Bước dựng dữ liệu (không phải case nghiệm thu)

| Bước | Kết quả | Ghi chú |
|---|---|---|
| DỰNG DỮ LIỆU - Lập 2 phiếu nộp tiền rồi bàn giao cho đơn vị vận chuyển | ⏳ Chưa chạy | Không lập được phiếu nháp nào để bàn giao |
| DỰNG DỮ LIỆU - Tỉnh lập chuyến bàn giao gom phiếu đang chờ | ⏳ Chưa chạy | Kỳ 2026-09 không có phiếu nào chờ Tỉnh nhận — điểm bán chưa bàn giao phiếu nào |

## Chạy lại

```bash
cd auto_test_vnpost && npx playwright test --config tai-lieu-test/13-cong-no-diem-ban-tinh/playwright.config.js
```

```bash
cd auto_test_vnpost && npx playwright show-report tai-lieu-test/13-cong-no-diem-ban-tinh/test-output/playwright-report
```