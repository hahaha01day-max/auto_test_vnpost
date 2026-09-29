# Bàn giao phiên LÀN 7 — phân hệ 19 trở đi (bắt đầu 25/09/2026)

Phiên "Script auto test khách hàng". Chia làn với phiên làn 8 ("Hoàn thành tài liệu BAN_GIAO_PHIEN") lúc 25/09 ~15:00:
- Làn 7 (`VNPOST_LANE=7`, tài khoản `auto7_*`, shop 68151 — dữ liệu ở **VNPOST_POD_02**) · phân hệ **≥ 19** (19, 20, 24, 26…).
- Dùng chung dev server web cổng 3200; 🚫 hai phiên đều không đổi nhánh `vnpost-web` (đang `develop`).
- File chung: phiên làn 8 cho phép append mục 19+ vào `_BAO_CAO_KY_VONG_CAN_CHOT.md`; nhắn trước khi sửa
  `playwright-quality-gates.md` / `shared/`.

## 19_quan_ly_khach_hang

Spec mới (25/09): `them-sua-khach.shop` · `trang-thai-khach.province` · `dong-bo-khach.{tct,gdv}` · `cong-no-khach.shop` ·
`nhap-excel.tct` · tiền đề `tien-de.gdv` · dọn `don-rac.tct`. Helper `tests/khach-ghi.js` (API tạo/xoá/tìm khách bằng phiên
của vai, form thêm/sửa theo nhãn, `selectDb` chỉ-SELECT để dọn khi API tìm kiếm hỏng). `fe-moc.json` ghi 8 spec.

Lệnh:
```bash
# tiền đề khách có nợ (POS làn 7, F8 thanh toán sau) — cần lại sau mỗi lượt vì 050_003 xoá được khách còn nợ (lỗi SP)
VNPOST_LANE=7 VNPOST_TIEN_DE=1 npx playwright test --config tai-lieu-test/19_quan_ly_khach_hang/playwright.config.js --project=gdv -g "tien de 19"
# lượt đủ
VNPOST_LANE=7 npx playwright test --config tai-lieu-test/19_quan_ly_khach_hang/playwright.config.js --grep-invert "tien de|don rac"
# dọn khách rác A7KH19… (xoá cấp chuỗi bằng TCT)
VNPOST_LANE=7 npx playwright test --config tai-lieu-test/19_quan_ly_khach_hang/playwright.config.js --project=tct -g "don rac 19"
```

Bẫy đã gặp:
- Ô SĐT là PhoneInput: `fill('')` KHÔNG xoá (gõ tiếp là nối đuôi) ⇒ chọn hết + Backspace. FE gửi SĐT dạng `84…`.
- Vai `gdv` không có `create_customer` / `update_customer` ⇒ case form chạy vai `shop`.
- Xoá khách bằng phiên điểm bán trả **200** nhưng khách tạo ở cấp chuỗi vẫn `status=1` ⇒ dọn bằng TCT.
- Kết quả nhập Excel là `<Result>` trong drawer (không phải dialog); lô SUCCESS thì drawer tự đóng ⇒ đọc response `customer/status`.
- Seed bước 11 (ca dài + lịch) làn 7 đã chạy 25/09 15:29 (sổ ghi `daXepLich`) — POS làn 7 mở được.
- Lượt JSON: `PLAYWRIGHT_JSON_OUTPUT_FILE=… --reporter=json` (reporter `line` qua rtk nuốt kết quả).

Kết quả 25/09 ~16:10 (lượt đủ làn 7): **40 đạt · 20 đỏ · 14 skip** · checklist **52/70 script thật, 8 vỏ** (`130_*`).
Đỏ đều đã phân loại ở `_BAO_CAO_KY_VONG_CAN_CHOT.md` mục "19 — viết bổ sung 25/09". Nổi bật: xoá được khách còn nợ ·
trùng SĐT vẫn tạo · nhập Excel nhận dòng thiếu tên (tên NULL làm tìm khách cấp chuỗi SSHOP-500) · CHT thiếu quyền
`CREATE_CUSTOMER_DEBT` + nhập Excel (chỉ CORP_ADMIN).
- `130_*` (user cho phép 25/09): spec `nang-hang.gdv` (003–008) · `ctkm-nhom.gdv` (002) · `nhom-doi-tuong.tct` (001), helper `tests/nhom-ghi.js`.
  Đạt 002/003/005 · đỏ 001 (câu chữ) / 004 (đơn nợ đã tính vào nhóm) · 006 ghi hành vi · 007/008 skip môi trường. Checklist 19: **57 thật · 0 vỏ**.
- 28/09: user chốt CHT được thu hồi nợ + nhập Excel khách ⇒ SQL `.claude/sql/update_product/2026-09-28_authen_cht_cong_no_nhap_excel_khach.sql` (chờ user chạy, rồi chạy lại 090_001/060_002/100_001/100_002 bằng vai CHT).
  Tài khoản nhận chuyển khoản điểm bán 68151 (130_007): user tự khai (Claude không nhập số tài khoản ngân hàng). Chờ chốt kỳ vọng 130_004/130_006.
- Dữ liệu để lại: đơn nợ #208, #209 của shop 68151 (khách đã bị 050_003 xoá — chính là lỗi); 2 đơn = 4 × AUTO7_SP_TC đã trừ tồn.
- Tiếp theo: `20_khach_hang_than_thiet`.

## 20_khach_hang_than_thiet (25/09 chiều) — 0 vỏ
- Spec + lệnh: xem mục 20 trong `_BAO_CAO_KY_VONG_CAN_CHOT.md`. 🔴 Sau mọi lượt có sửa loyalty (hoặc lượt hỏng):
  `VNPOST_LANE=7 npx playwright test --config tai-lieu-test/20_khach_hang_than_thiet/playwright.config.js --project=tct -g "khoi phuc loyalty 20"`.
- OTP thanh toán điểm dev = 888888 (user). SMS vẫn gửi thật ⇒ chỉ dùng khách mang SĐT CHT làn (sổ `khach-diem.lane7.json`).
- Bẫy: Enter trong ô ngày antd Form = submit; Escape trong drawer = đóng drawer; nút "Thanh toán bằng điểm" cần chờ modal nạp;
  đo đổi điểm bằng số dòng REDEEM (BE cộng lại điểm cùng giây); giảm theo SP nằm trong giá dòng (đo bằng tổng trước VAT).
- Tiếp theo: `24_cong_no_nhan_vien` (cần tiền đề công nợ nhân viên: phiếu xuất kho hàng hỏng/kiểm kho thiếu thật + ghi nhận công nợ).

## 24_cong_no_nhan_vien (25/09 tối) — 0 vỏ
- Tiền đề: `VNPOST_LANE=7 VNPOST_TIEN_DE=1 npx playwright test --config tai-lieu-test/24_cong_no_nhan_vien/playwright.config.js --project=shop -g "tien de 24"`
  (mỗi lượt +2 phiếu xuất hỏng & 3 khoản nợ NV). Case nộp tiền (070_002/008) tiêu công nợ ⇒ chạy lại tiền đề trước lượt sau.
- Bẫy: thẻ "Công nợ với cửa hàng" render bảng/bộ lọc NGOÀI tabpanel (và drawer chi tiết cũng vậy); RTK Query dùng cache khi tham số trùng
  (không có request) · InputNumber xoá trắng tự điền "0" ⇒ dùng `fill` · nút bung dòng là `img "plus"`.
- Tiếp theo: `26_phieu_thu`.

## 26_phieu_thu (25/09 tối) — 0 vỏ
- `tu-sinh.gdv` bán thật (tiền mặt/nháp/đổi/trả) + đọc phiếu bằng phiên CHT (GDV 401). 060_006/007 kiểm theo dữ liệu 90 ngày (skip có lý do).
- 🔴 Sửa `shared/auth/login.js` (tự vào thẳng khi 1 phạm vi) — đã báo phiên làn 8.
- Tiếp theo: 27 (1 vỏ) → 29 → 30 → 31 → 32 → 33 → 34 → 35.
- 29: xong 0 vỏ; spec bo-sung.{tct,province}, doi-soat-po.tct, chot-kho.shop, don-rac.tct. 210_* chốt kho chờ 10/2026.
- 30: xong 0 vỏ. Tiền đề `hieu-qua.gdv.spec.js` (tạo CTKM rác + bán 1 đơn, lưu test-output/tien-de-30.json dùng lại 12h). Helper `ctkm-page.js` viết lại cho màn mới.
- 31: xong (còn 030_009 BLOCKED hợp lệ). `vai-tro-ghi.tct.spec.js` (vai trò rác A7PQ31_*), `chan-diem-ban.gdv.spec.js`.
- 33: xong 0 vỏ. `lich-su-ghi.tct.spec.js` (vai trò rác A7LS33), `chan-xa.ward.spec.js`.
- 32: xong 0 vỏ. `org-ghi.js` (helper cây rác A7MH32, CO_DINH), `don-vi-ghi.tct`, `nhap-xuat.tct`, `diem-ban.tct` (route chặn POST /shops/profile bằng predicate pathname!), `gan-nv.tct` (NV AUTO7_CUI), `an-quyen.gdv`, `pham-vi-gan.province`. ⚠️ 160_001/002 mỗi lượt tạo 1 điểm bán thật không xoá được — test `32 don rac diem ban` cho Tạm ngừng.
- ⚠️ Chạy 32 THEO TỪNG FILE spec: chạy cả phân hệ >28 phút ⇒ token hết hạn (SSHOP-405) hàng loạt.
- 34: xong 0 vỏ. 28/09 sáng: user chạy SQL gán `VIEW_DEBT_CUSTOMER` cho `SHOP_SALE`/`POS_PLUS_SHOP_SALE`
  (`.claude/sql/update_product/2026-09-28_authen_gdv_xem_cong_no_khach.sql`). Lượt `cong-no-ghi.gdv`: **28 đạt · 6 đỏ thật · 1 skip**.
  Sửa script: 🔴 `fromDate/toDate` là @NotNull — thiếu thì API trả **SSHOP-500** (lỗi 500 hôm 27/09 là do test, không phải backend) ·
  `page` của test phải `cp.moMan` trước `moChiTiet` · ô tìm `/customer` không nhận MÃ khách ⇒ tìm theo tên ·
  route `/customer-debt/:customerId/:shopId` không gắn router (404) ⇒ đi chi tiết khách → thẻ Công nợ · tiền đề tự chọn SP còn tồn (`spConTon`).
  🔴 Tồn làn 7: TC/FIFO = 0, DD = 2 (MAC có dòng -6) — tiền đề cache 12h ở `test-output/tien-de-34.json`; hết cache thì phải nhập tồn.
  Đỏ thật (mục 34 ở `_BAO_CAO_KY_VONG_CAN_CHOT.md`): 040_001 GDV thu hồi nợ 401 · 040_002 vai Tỉnh bấm được Thanh toán nợ ·
  050_005 tìm SĐT dạng 09… không ra (DB lưu 84…) · 030_001 phiếu công nợ không có cột người lập · 060_008 gõ vượt nợ FE tự hạ về số nợ rồi gửi · 050_011 wildcard `%_` không escape · 050_013 tìm theo mã khách ra 0.
- 35: checklist 27/09 báo **61/61 script thật, 0 vỏ** (đã làm xong).
- ✅ Làn 7: mọi phân hệ ≥19 đã 0 vỏ. Việc còn lại chỉ là chờ user (quyền/kỳ vọng) ở từng mục.
