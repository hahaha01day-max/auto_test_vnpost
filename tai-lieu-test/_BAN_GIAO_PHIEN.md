# Bàn giao phiên — hoàn thiện script vỏ (cập nhật 26/09/2026 sáng)

Goal: dùng skill `auto-test`, lần lượt hoàn thiện case vỏ theo `_CHECKLIST.md` (bắt đầu 13_1), xong mỗi case cập nhật
trạng thái (`node tool/bin/checklist.js`), vấn đề ghi `_BAO_CAO_KY_VONG_CAN_CHOT.md`. Làm tuần tự, không sub-agent.
Env: `VNPOST_LANE=8` (`.env.lane8`). Được phép thêm/sửa, seed thêm, **đụng kho TCT**, phải **phủ đủ case, không né**.
Được phép bật hạn mức duyệt "Duyệt phiếu đề xuất đặt hàng" trong case rồi tắt lại (`finally`).

## Đã xong
- `13_1` — 55/55 script thật. `13_2` — 3/3. `14_2` — 102/108. `14_3` — 89/89 (25/09, mục làn 8 bên dưới). `14_1` — checklist 136 script thật · 2 vỏ (chặn có lý do). `16` — 118/138 (12 vỏ chờ user). `17` — 63/64 (25/09, mục dưới). `18_1` — 119/131 (25/09, mục dưới). `18_2` 74/115 · `18_3` 33/54 · `18_4` 52/70 · `18_5` (mục dưới). ⏸️ User dặn: xong phân hệ 18 thì TẠM DỪNG (25/09 tối). 🔴 Chia làn 25/09 chiều: phiên "Script auto test khách hàng" giữ LÀN 7, làm ≥ 19 (tiến độ ở `_BAN_GIAO_PHIEN_LAN7.md`); phiên này làn 8, tới hết 18_x.
- `13_3` (98/98 — xem mục làn 8 bên dưới): `po.tct.spec.js` (030_*), `gui-tct.province.spec.js` (050_*), `giao-thang-ghi.province.spec.js`
  (040_*), `de-xuat-po.province.spec.js` (010_*), `tu-doanh.province.spec.js` (tỉnh tự đặt NCC).

## 🔴 Chia làn giữa 2 phiên (24/09 ~16:00)
- Phiên "Hoàn thành tài liệu bàn giao" giữ **làn 8** + 14_1/14_2/14_3 + 4 vỏ còn lại của 13_3 + chạy lại `de-xuat-po`.
- Phiên kia chuyển sang **làn 7** (`VNPOST_LANE=7`), làm từ phân hệ 16 trở đi. Làn 4/5 bỏ trống. 25/09: phiên kia đã tắt — phiên làn 8 làm tiếp 16 trên làn 7.
- 🚫 Hai phiên cùng một làn = cùng tài khoản ⇒ đá token nhau, case đỏ vô nghĩa.

## Phiên 24/09 chiều
- API dev sập 13:35 → ~15:10 (`vnpost-api.sfin.vn` 522; DB `103.109.43.112` cũng mất kết nối). Đã sống lại.
- 🔴 Dev server FE build thẳng từ `vnpost-web` trên máy: phiên này có lúc checkout `develop-offline-web` (merge hộ
  user) ⇒ FE "Build failed" (thiếu `dexie`) ⇒ mọi case đỏ ở bước đăng nhập. Đã trả về `develop`. Luật đã ghi ở
  quality-gates. Commit merge `766804f6` còn ở nhánh local `develop-offline-web`, CHƯA push.
- Seed mới **bước 14** (`00_seed/api-tests/14-tu-doanh-tinh.api.spec.js`, chạy CLI `-g "seed 14"`): SP tự doanh
  `TD1` (có giá) / `TD2` (không giá), NCC tỉnh `AUTO8_NCC_TINH`, hợp đồng, bảng giá mua phạm vi tỉnh. Làn 8 đã chạy xanh.
- `13_3` spec mới `tu-doanh.province.spec.js`: 030_023–026, 053–056, 040_010, 040_020 — **10/10 đạt**.
  `po-ghi.js`: `chonNcc(page, ten, hd)`, `chonKho` xử lý vai tỉnh (hộp tích sẵn tỉnh mà chưa nạp kho — ghi báo cáo).
  Tạo `13_3/fe-moc.json` (trước đó KHÔNG có — các spec 13_3 cũ chưa có mốc, cần ghi bù).
- `de-xuat-po.province.spec.js`: lượt 13:3x hỏng 11 case do API sập ⇒ chạy lại sau khi API sống (xem kết quả ở dưới).

## Làn 8 — 13_3 xong, 14_1 (phiên "Hoàn thành tài liệu bàn giao", 24/09 tối)
- `13_3` **98/98 có script**: `xuat-tra-po.tct.spec.js` (030_027/028/057/058) — dựng PO Gửi NCC → NCC xác nhận →
  nhập kho đủ rồi tìm nút "Xuất trả hàng" ⇒ **ĐỎ có lý do**: luồng trả theo PO ngừng 27/07/2026 (nút bị comment,
  route `/create` gỡ, BE chặn). Chờ user chốt bỏ hay chuyển kỳ vọng sang luồng đa cấp. Vỏ 13_3 đã gỡ hết.
- `13_3/de-xuat-po.province.spec.js` chạy lại (API sống, làn 8 riêng): **20 đạt · 6 đỏ** — 002/003/007 lệch câu chữ QC
  ("Điểm bán" vs "Kho đặt hàng", dấu "!"), 005 đổi NCC không hiện cảnh báo ⇒ 006 cũng đỏ (chờ hộp "Loại bỏ & tiếp tục"
  không bao giờ hiện), 008 sửa phiếu đã duyệt làm đổi trạng thái. Không còn case đỏ vì môi trường.
- `14_1` **126/144 có script** (18 vỏ còn lại). Spec mới: `tao-phieu.shop` (010 đọc/validate, chặn ghi) ·
  `tao-phieu-ghi.shop` (010 ghi thật) · `xu-ly.shop` (020/030/040_006/050) · `duyet.ward` · `duyet.province` ·
  `duyet.tct` · `tra-theo-po.shop|province` (060). `fe-moc.json` đã ghi cho cả 9 spec.
  Helper `14_1/tests/return-page.js`: `taoPhieuApi` (payload đối chiếu request thật), `goiDuyet/duyetDu`,
  `donPhieu`, `phieuNhapNhieuLo` (GDV nhập mới N lô SP giá tiêu chuẩn), `menuXuLy/bamMenu`, `vongDoi`, `diToi`
  (điều hướng trong app, 🚫 page.goto), `datPhienChinh` (🔴 phiên phụ CÙNG tài khoản xoay mất token phiên chính).
- Kết quả lượt cuối: phần lớn đạt; đỏ = lỗi sản phẩm / lệch đặc tả đã ghi `_BAO_CAO_KY_VONG_CAN_CHOT.md` (mục 14_1):
  🔴 tỉnh duyệt trừ **sai lô** (010_031/032) · 🔴 phiếu Đã duyệt **không từ chối/hoàn kho được** (050_003) ·
  `resolve-serial` 401 với CHT (010_013) · nộp lại phiếu Chờ duyệt vẫn "Thành công" (020_007) · ô SL tự kẹp nên
  cảnh báo không hiện (010_022/028/029) · Kho nhận tự điền không bỏ trống được (040_018) · "-" thay "--" (030_002) ·
  nhóm 060 luồng cũ đã ngừng (24 case tạo + 4 tra cứu thiếu dữ liệu).
- 18 vỏ còn: serial (010_012/015/026/027/033/040, 040_017) — điểm bán seed **0 serial**, cần seed nhập SP đích danh
  có serial về điểm bán · 010_035/036/042 · cần phiếu đã tách/gom/trả NCC/gửi TCT (030_016/017/019/020/024/027,
  040_009) — dựng cùng 14_2 · 040_003 cần điểm bán trực thuộc tỉnh có tài khoản.
- ⚠️ Dữ liệu không dọn được: các phiếu trả Đã duyệt của shop 68152 (giữ chỗ vài cái `AUTO8_SP_TC`) — do lỗi 050_003.
  Phiếu #45 (Nháp) / #46 (Chờ duyệt) của điểm bán làn 5 (68150) để lại làm tiền đề phạm vi (020_009/010, 040_007/008).
- 🔴 Đã lỡ xoá rồi dựng lại `14_1/tests/chua-chay-duoc.*.spec.js` (thư mục chưa vào git) — nội dung mới chỉ gồm 18 vỏ còn thiếu.
- Tiếp theo (làn 8): ~~14_2~~ · ~~14_3~~ (xong, mục dưới) · ~~18 vỏ 14_1~~ (còn 2, chặn có lý do — mục 14_3 bên dưới).

## Làn 8 — 14_2 xong (24/09 tối → 25/09)
- **102/108 script thật** (`checklist.js`); 2 vỏ = skip có lý do (010_011 chỉ 1 chuỗi · 050_009 không có luồng mất tham chiếu kho giữ).
  Spec: `gom-phieu|gom-ghi|pham-vi-khac|tach-ghi|xu-ly-ghi|serial|tct-dot-tra` (province) · `pham-vi.shop|ward` · `tct-ghi.tct`.
  Helper `14_2/tests/tra-ghi.js`: `phieuDaDuyet(loai TD1|TC|TC_TAY|DK)`, `phieuChuaTra`, `phieuConTinh` (tách thật), `phieuChuaGuiTct`, `goi/doc/tach/xuLy`.
  `fe-moc.json` đã ghi 11 spec. Helper 14_1 `return-page.js` thêm `datPhienSan(vai, p)` — `goiDuyet` dùng lại phiên phụ (tránh xoay token).
- Tiền đề `tien-de.province.spec.js` (`-g "tien de 14_2"`, lượt bổ sung `VNPOST_TIEN_DE_LUOT=N VNPOST_TIEN_DE_SL=300`): TD1 (PO tỉnh→HUB→chuyển) +
  TC (PO TCT→kho TCT→chuyển) + kho phụ HUB. Sổ `duLieu.traNcc14_2.loCoNguon` = lô có nguồn; lô `A8…` là lô GDV nhập tay (không NCC).
  `tien-de-lan-khac.shop.spec.js` chạy `VNPOST_LANE=5` ⇒ phiếu Đã duyệt tỉnh AUTO5_T (id 583) cho 010_010.
- Lượt đủ cuối (run9 + run10): 77 đạt / 39 đỏ / 3 skip; **đỏ đều đã phân loại** ở `_BAO_CAO_KY_VONG_CAN_CHOT.md` mục 14_2:
  🔴 thiếu quyền `receive-to-province` / `resolve-rejection` (không vai nào) + `supplier-batches/confirm` (chỉ CORP_ADMIN) ⇒ ~25 case 401 ·
  🔴 tách tại chỗ giữ `org_unit_type=DIEM_BAN` ⇒ đợt bị từ chối không ai quyết định · 🔴 gửi TCT hàng có nguồn PO TCT luôn bị chặn truy vết ·
  🔴 "Hoàn về điểm bán" luôn ẩn sau lần trả NCC đầu (vế nhập bàn giao HUB) · điểm bán thấy 3 việc xử lý · 7+2+1 không về "Đã xử lý xong".
  ⇒ Sau khi user gán quyền, chạy lại: `VNPOST_LANE=8 npx playwright test --config tai-lieu-test/14_2_gom_tach_va_xu_ly_hang_tra/playwright.config.js --grep-invert "tien de"`.
- 🔴 Bẫy: payload API tạo phiếu trả PHẢI có `inventoryId` (thiếu ⇒ 500 khi SP có tồn ở 2 kho); chuyển kho BE tự FIFO lô (đã ghi quality-gates).
- 🔴 Bài học phiên: 2 lượt Playwright cùng config/cùng làn chạy chồng (tưởng lượt trước đã chết vì log đệm) ⇒ token + outputDir hỏng cả hai.
  Kiểm `pgrep -f playwright.config` TRƯỚC khi chạy lượt mới.

## Làn 8 — 14_2 chạy lại sau khi gán quyền (25/09 chiều)
- Quyền đã gán (tra theo `permission_code`). Lượt đủ: 71 đạt · 35 đỏ · 3 skip. 🔴 16 case chặn vì **điểm bán hết hàng TD1**; bổ sung tiền đề
  lượt 4 kẹt ở bước điểm bán nhận phiếu chuyển (SSHOP-500) — phiếu 91 `AUTO1423870450` IN_TRANSIT giữ 300 cái ở HUB. Cần log pod-service,
  chi tiết `_BAO_CAO_KY_VONG_CAN_CHOT.md` mục "14_2 — chạy lại 25/09". Sau khi thông: `VNPOST_LANE=8 VNPOST_TIEN_DE_LUOT=4 VNPOST_TIEN_DE_SL=300
  npx playwright test --config tai-lieu-test/14_2_gom_tach_va_xu_ly_hang_tra/playwright.config.js -g "tien de 14_2"` rồi chạy lại 16 case.
- `26_phieu_thu`: tên GDV lấy từ sổ seed (`tenGdv()`), `dangNhapVai` trích nguyên văn lỗi đăng nhập — 2 đề xuất treo đã làm.

## Làn 8 — 14_3 xong · 14_1 chốt vỏ (25/09/2026)
- `14_3` **89/89 có script** (checklist: 77 thật + 12 "vỏ" = skip có lý do cụ thể trong thân test, không phải thiếu script).
  Lượt đủ cuối: **50 đạt · 26 đỏ · 13 chưa chạy** — đỏ đều đã phân loại ở `_BAO_CAO_KY_VONG_CAN_CHOT.md` mục 14_3.
  Spec: `tiep-nhan|doi-soat|chot|phat-hanh` (province) · `hoa-don-tra.shop` · `phat-hanh.tct`. Helper `14_3/tests/hoa-don.js`:
  `xmlHd` (khuôn `purchaseOrder/utils/poInvoiceXml.js` — user chỉ; tuỳ chọn `am`, `dau`, `tcdc`, `tong:null`), `dotRanh`, `nap/napApi/goHet`,
  `moKhoi(page, dot, {coHd})`, `oMoTa` (Descriptions bordered). `fe-moc.json` ghi 6 spec (vnpost-web đang ở nhánh `develop-tungnt-hoan-tra`!).
  Đã xoá hết `14_3/tests/chua-chay-duoc.*`.
- 🔴 Lỗi sản phẩm lớn: drawer đối soát tự đóng sau nạp/đối soát lại · nhánh UNKNOWN là code chết · hoá đơn số ÂM luôn LỆCH ·
  nginx 413 với tệp 10MB · DTO chi tiết thiếu `accountingEntry`/`settledByName` (bút toán + người chốt không hiện; DB có ghi) ·
  bút toán 156/1331 không gắn NCC · điểm bán thấy "Tiếp nhận hoá đơn NCC" · BE không trả `returnInvoiceIssuer` ⇒ nhánh VNPost
  phát hành không bao giờ hiện · `POST /issue` bỏ `note` người dùng sửa · bản nháp cấp TCT người bán "Kho tổng — MST null".
- Chờ user: cho phép phát hành HĐĐT thật + SQL khai NCC VNPost (có trong báo cáo) · chốt 6 chỗ lệch câu chữ RTN-CN-002/006 ·
  kỳ vọng 020_007/030_022 (quy đổi ĐVT) · hòm thư IMAP cho 010_018.
- ⚠️ Dữ liệu một chiều: 10 hoá đơn đã chốt chứng từ ở HUB 68154 (9 do lỗi script — đã sửa bằng sổ file
  `14_3/test-output/hd-da-chot.lane8.json`; mỗi lượt sau chỉ chốt 1 ở 020_013).
- ~~`14_1` còn **2 vỏ**~~ (26/09: 010_035 có script, 010_036 chờ 18:59) chặn có lý do (đã ghi rõ trong `chua-chay-duoc.shop.spec.js`): 010_035 cần bật bán âm ở cấu hình CHUỖI dùng chung
  (chờ user) · 010_036 chờ thời gian — sớm nhất **26/09/2026** (phiếu nhập NCC sớm nhất 24/09 17:35) + đặt HĐ NCC tỉnh maxReturnDays = 1 (hỏi user).
  16 vỏ khác đã có script ở `bo-sung.*` / `serial.*` (checklist 136/144).
- Luật mới ở quality-gates: trạng thái dùng chung phải lưu file (worker restart) · khối con vẽ trước query · `toContain` số trên chuỗi gộp là pass rỗng · XML hoá đơn thử cả số âm + kiểm HTTP 413.

## `16_hang_ky_gui` (làn 7) — 118/138 script thật (25/09, phiên làn 8 nhận làn 7 sau khi phiên kia tắt)
🔴 Vai: dữ liệu ký gửi của chuỗi ở TCT (36 kỳ, 5 NCC); tỉnh / xã / điểm bán làn 7 = 0 dòng ⇒ case cần dữ liệu chạy vai `tct`
(`_vai` ghi trong `test-input.json`), case phạm vi giữ vai hẹp.
- Lượt đủ cuối: **92 đạt · 9 đỏ · 37 skip**. 9 đỏ đều lỗi sản phẩm (010_011/015/019/020 · 030_015 · 040_008 · 060_008/019/025) —
  chi tiết `_BAO_CAO_KY_VONG_CAN_CHOT.md` mục 16 (khối "bổ sung 25/09").
- Spec: `tra-cuu-cong-no` · `doi-soat-ky` · `chi-tiet-ky` (tct) · `pham-vi-ky-gui.{shop,ward,province}` · `cong-no-ky-gui.province` ·
  **mới 25/09:** `bao-cao.{tct,province,shop}` (060) · `hoa-don-ky.tct` (040+050) · `sinh-ky.tct` (020_003–006, 070_002/003) ·
  `chi-tiet-ky.shop` (050_020) + 030_003/006/007/009/010/013/015/016/028 nối vào `chi-tiet-ky.tct`. `fe-moc.json` đủ 12 spec.
- An toàn: test giao diện chặn `POST lock / post-debt / post-internal-debt`; hoá đơn thử nạp vào kỳ LOCKED 76/1 đều xoá lại
  (kiểm sau lượt: sạch). "Sinh kỳ" bấm thật (BE chống trùng: 0 kỳ mới, 2 kỳ đã có).
- 🔴 Phát hiện lớn: DW báo cáo ký gửi **thiếu phần lớn giao dịch bán** (mọi kỳ có bán đều LỆCH, kỳ LOCKED 76 DW 400 / MySQL 1.108) ·
  bộ lọc "Phạm vi tổ chức" của báo cáo không chọn được tỉnh/xã · xuất Excel mất chuỗi lỗi BE · "Hạn thanh toán" hiện "-" ·
  bung nhóm "Tổng công ty" xuống điểm bán ra rỗng · điểm bán thấy đủ 36 kỳ TCT ở ô chọn kỳ.
- 12 vỏ còn lại (`chua-chay-duoc.*`) = chờ user cho phép: chốt kỳ thật (030_018–022/025/026), ghi nợ nội bộ (070_001/004),
  lệnh chi (010_018), bán hàng ký gửi cần seed điểm bán làn 7 (010_021/022). Ghi nợ chính thức 050_012/013/015/017 skip trong spec.
- Bẫy: màn đăng nhập dev có lúc kẹt (nút đăng nhập không nhận click) ⇒ cả chuỗi case đỏ `locator.click Timeout` — chạy lại riêng.
  Kỳ 76 biên bản ÂM (−113.791.878đ) — helper `kyChot({duong})` ưu tiên kỳ biên bản dương.

## `17_quan_ly_quay_thu_ngan` (làn 8) — 63/64 script thật (25/09 chiều)
- Spec: `quay-ghi.shop` (quầy: thêm/sửa/ngừng/kích hoạt, validate, API lỗi) · `quy-ghi.shop` (cấp quỹ, chuyển quỹ, 030_003) ·
  `quay-pham-vi.province` (010_002) · `quay-pham-vi.tct` (010_016, 050_003 — vai tỉnh làn 8 chỉ thấy 1 điểm bán) · `quay-pham-vi.gdv` (PQ_001).
  Helper `tests/quay-ghi.js` (API quầy/quỹ, `soDu` = `fund-total.totalMoneyEndPeriod`, `boMa`) · `tests/chon-diem-ban.js` (drawer chọn điểm bán, `chonTheoTen`).
- Lượt đủ: **53 đạt · 10 đỏ · 1 skip** (030_008 — không dựng được quầy thiếu quỹ). Đỏ đều phân loại ở `_BAO_CAO_KY_VONG_CAN_CHOT.md` mục 17:
  🔴 unique `(shop_id, code)` bỏ qua active ⇒ tái dùng mã quầy đã ngừng = 500 · ngừng quầy khi có ca OPEN không bị chặn ·
  cấp tiền vào quỹ đã khoá được · chuyển quá số dư ⇒ quỹ âm · 🔴 chuyển chéo điểm bán qua API: trừ nguồn, đích không nhận (tiền biến mất) ·
  GDV khai được quầy · lệch: khoảng trắng chỉ BE chặn, thiếu shopId vẫn tạo, nhãn "Ngân hàng" thay "Chuyển khoản".
- Chạy lại: `VNPOST_LANE=8 npx playwright test --config tai-lieu-test/17_quan_ly_quay_thu_ngan/playwright.config.js --grep-invert "seed:"` (~13 phút).
- ⚠️ Làn 8 có ca **#45 OPEN** (GDV, quầy Q01, mở 24/09) — 030_003 dựa vào nó; 18_1 (POS) cũng cần ca mở. 🚫 đừng chốt ca này khi chưa xong 18_x.

## `18_1_ban_hang_tai_quay` (làn 8) — 119/131 (25/09 chiều)
- Helper `18_1/tests/pos-18.js`: `moBan` (mở POS sạch; chưa có ca ⇒ `bamCa` = chốt ca ngày trước còn treo rồi mở ca hôm nay),
  `donTab`, `taoKhach` (API `/chain-customer/create`), `chonKhach`, `donTrongDs` (list `v1.3` PHẢI có `status=-1`), `sp()`.
- Spec: `tab-khach` · `tim-them` · `quet-ma` (máy quét = `keyboard.type` nhanh + Enter; mã vạch seed = SKU) · `dong-hang` ·
  `can-dien-tu` (cân giả lập `window.serialBridge` + `__canPush('WT: 1.5kg')`) · `phim-tat` · `chon-lo` · `thanh-toan` · `chan-ban-hang.shop`.
- Đỏ đều phân loại ở báo cáo mục 18_1. 🔴 Thanh toán tiền mặt kẹt ở khối SDK VNPOST "XÁC NHẬN GIAO DỊCH" (bấm không ra request) ⇒ mọi case cần đơn ĐÃ thanh toán chặn.
- ⚠️ Ca #45 (24/09) đã bị chốt để mở ca #48 hôm nay — 17_030_003 giờ dùng ca #48.
- Cũ: `tests/vnpost-pos.playwright.spec.js` (không khớp testMatch nào, không bao giờ chạy) — để nguyên, chờ user quyết xoá.

## 18_2 → 18_5 (làn 8, 25/09 tối) — ⏸️ TẠM DỪNG theo lời user sau phân hệ 18
- 🔴 Thanh toán POS: bước xác nhận ở iframe khác origin `vnpostpayment-dev.postpay.vn/confirm-cash` — helper `18_1/tests/pos-18.js › thanhToanTienMat` (đã dùng chung cho 18_2–18_5, phiên làn 7 cũng dùng). "Thanh toán sau" không qua SDK.
- Spec: 18_2 `hddt-form` · `khach-pos` · `coupon-pos` · `diem-pos` · `thanh-toan-kh` · 18_3 `thanh-toan.gdv` · `chan-ward.ward` · 18_4 `don-hang` · `don-hang-2` · `don-hang-3` · `pham-vi.ward` (helper `dh.js`) · 18_5 `doi-tra.gdv`.
- Đỏ đều phân loại ở báo cáo mục 18_2 / 18_3 / 18_4 / 18_5. Chặn lớn: GDV không có quyền tạo hoàn trả đơn tiền mặt · không có coupon hợp lệ cho AUTO8 · phạm vi tích điểm #14 không gồm AUTO8_T · chưa có phương thức "Thanh toán bằng điểm"/"Thẻ VISA" · phát hành HĐĐT thật chờ cho phép.
- 🔴 Bẫy: lệnh `rtk proxy npx playwright … --reporter=json` chạy NỀN có lúc treo sau khi Playwright đã xong (không còn tiến trình) ⇒ chạy `npx playwright … --reporter=line > file` trực tiếp.
- 🔄 25/09 tối: quyền hoàn trả GDV đã thông ⇒ 18_5 thêm spec `sau-chot.gdv` (11 case, 10 đạt) + helper tách ra `18_5/tests/doi-tra.js`; 18_5 giờ **31/58** thật, 27 vỏ chặn có lý do cụ thể (báo cáo mục 18_5 "Bổ sung 25/09 tối"). Đơn hoàn trả dùng chung lưu `18_5/test-output/don-hoan-tra.lane8.json` (theo ngày). Phiên làn 7 xác nhận không dùng làn 8. Hồi quy `doi-tra.gdv` sau tách helper: đạt trừ 020_003/090_001 (lỗi sản phẩm đã ghi); 150_003 sửa locator (SL 0 đẩy dòng sang "Hàng khách giữ lại") — đạt.
- 🔄 25/09 khuya (user: "môi trường test, làm thoải mái" — memory `auto_test_moi_truong_test_lam_thoai_mai`): tự dựng tiền đề — đợt coupon #83/#84/#85 (admin gốc, `18_2/tests/tien-de-coupon`), thêm AUTO8_T vào loyalty #14/#5 (`tien-de-loyalty`), helper `shared/db/otp.js` (đọc OTP_V2 + điểm LOYALTY, chỉ SELECT; creds DB ở `.env`), helper `18_2/tests/diem.js` (khách điểm, thanh toán điểm/đa phương thức + OTP). Spec mới: 18_2 `coupon-ghi` · `diem-ghi` · 18_3 010_006 · 18_5 `sau-chot` · `qua-han` (⏳ từ chiều 26/09) · `han-hoan-tra` (admin) · `diem-tra`. Kết quả + lỗi ở báo cáo mục 18_5 "Bổ sung 25/09 tối" và "18_2 / 18_3 — bổ sung 25/09/2026 tối". SQL chờ user chạy: `.claude/sql/update_product/2026-09-25_role_permission_ly_do_tra_hang_pos.sql`. Thêm 18_3 `diem.gdv` (9 case) · 18_4 `phat-hanh.gdv` (HĐĐT: điểm bán AUTO8 CHƯA kết nối NCC HĐĐT ⇒ không có mẫu hoá đơn, 070_001/007 skip). ⏰ POS chỉ mở ca 05:00–23:45 — sau giờ này mọi case POS đỏ ở bước mở ca.
- Tiếp theo (khi user cho chạy lại): 18_x còn vỏ có lý do; phân hệ khác — NHẮN phiên làn 7 trước khi nhận (làn 7 đang 20 → 24 → 26 → 27 → 29…).

## Làn 8 — 26/09/2026 sáng: gỡ vỏ 18_x + 14_1 (sau khi user chạy SQL lý do trả hàng POS)
Checklist: 14_1 **138/144** · 18_1 **125/131** · 18_2 97/115 · 18_3 **47/54** · 18_4 59/70 · 18_5 **48/58**. Chi tiết đạt/đỏ: báo cáo mục "18_x + 14_1 — bổ sung 26/09".
- Spec mới: 18_1 `qua-tang` (2 loại quà) · `ton-am` · 040_015 trong `chon-lo` — 18_2 `bien-lai` · `ctkm-nhom` · `tat-hddt` · 050_009/050_012 trong `diem-ghi` —
  18_3 `ca-cht.shop` · `ctkm-realtime` · `doi-diem-tat` — 18_4 `tat-hddt` — 18_5 `qua-tang` · `serial` · `vat` · `no-mot-phan` · `ca-cht.shop` ·
  `tien-de-bat-thuong` · `nguong-bat-thuong` (tài khoản gốc) · 130_001 trong `danh-sach-hoan-tra.shop` · 140_008 trong `qua-han` — 14_1 010_035/036 trong `tao-phieu-ghi`
  (đã xoá `14_1/tests/chua-chay-duoc.shop.spec.js`).
- Helper mới: `18_1/tests/ctkm-qua.js` (CTKM quà `DON`|`SP`, tên có hậu tố thời gian, bật/tắt theo spec) · `shared/ban-am.js` (thêm điểm bán làn vào
  phạm vi bán âm, chụp gốc `shared/test-output/ban-am-goc.json`) · `18_2/tests/ctkm-nhom.js` · `18_2/tests/doi-diem-tam.js` · `18_3/tests/ca-cht.js`
  (quầy riêng `A8CHT`) · `18_4/tests/hddt-shop.js`. `pos-18.moBan` giờ đóng tab "Hoàn trả" treo (`dongTabHoanTra`).
- 🔴 Bẫy mới (đã ghi quality-gates): hộp gợi ý `InputCurrency` che phần tử dưới · tab POS treo · treenode `aria-hidden` · modal tự mở ·
  `mode: 'serial'` skip dây chuyền · tiền đề cấu hình phải đọc lại · tiền hoàn nằm ở RESPONSE `data.totalRefundAmount` (🚫 request).
- ⏳ Tối 26/09: `VNPOST_LANE=8 VNPOST_SETUP_ROLES=gdv,shop npx playwright test --config tai-lieu-test/18_5_doi_tra_hang/playwright.config.js qua-han` (sau ~15:00)
  và `VNPOST_LANE=8 VNPOST_SETUP_ROLES=shop,province npx playwright test --config tai-lieu-test/14_1_lap_va_duyet_phieu_xuat_tra/playwright.config.js tao-phieu-ghi -g 010_036` (sau 18:59).
- ⛔ Chặn: đổi cấu hình ĐIỂM BÁN (`/shops/configs`) không ăn (5 case HĐĐT/VAT skip) · combo chưa có seed (18_5 110_x, 18_4 030_009) · QR ngân hàng thật
  (18_3 040_x/060_x, 18_4 080_x) · phần cứng (18_1 030_011/060_022) · nút huỷ đơn ẩn (18_5 090_004/005, 18_2 030_016) · 18_1 040_016 (lô xả kho), 040_017
  (màn nhật ký — cần user chỉ) · 18_2 010_014 (lối vào đơn giao vận chuyển) · 18_4 020_004/020_006/100_002 · 18_5 140_002/140_007.

## Làn 8 — 26/09 trưa: seed combo (bước 15) + 5 case combo
- Seed `00_seed/api-tests/15-combo.api.spec.js` (`VNPOST_LANE=8 npx playwright test --config tai-lieu-test/00_seed/playwright.api.config.js -g "seed 15"`):
  sổ `duLieu.combo` (dùng cho case) + `duLieu.comboLoiTieuChuan` (bằng chứng lỗi). 🔴 combo chứa SP giá vốn Tiêu chuẩn KHÔNG bán được (báo cáo).
- Spec: 18_5 `combo.gdv` (110_001–004, đạt) · 18_4 `phan-loai-sp.gdv` (030_009, đạt). Tách combo ở màn đổi trả = nút `split-cells`.

## Việc treo ngoài auto test (phiên này)
- Merge `vnpost-web` `develop → develop-offline-web` = commit `766804f6`, **chưa push**; repo đang ở `develop`.
- Seed UAT bộ 9 (`/seed/bo/9`): dừng ở bước 2 — core UAT gọi pod-service `localhost:8005` tạo kho lỗi (log core
  requestId `jMPZhQ`); cần người xem pod-service trên máy UAT.
- Web tool `/seed`: đã thêm ô nhập tiền tố bộ dữ liệu + sửa grep bước (`seed 1` từng khớp `seed 13.1`).
  ~~Đề xuất: spec `26_phieu_thu` tìm NV theo tên cứng; `dangNhapVai` báo thẳng lỗi sai mật khẩu~~ — đã làm 25/09.

## Helper tái dụng
- `13_1/tests/dx-ghi.js` (phiếu đề xuất), `13_1/tests/gop-tach-ghi.js` (`phieuDaDuyet(browser, sls, {ten})`, gộp/tách).
- `13_3/tests/po-ghi.js` (tạo PO kho TCT, `nccXacNhan`, `nhapKho({sl, thieu})`), `tct-ghi.js` (gửi lên TCT),
  `giao-thang-ghi.js` (`donGiaoThang`, `moFormTuPhieu`, `xacNhanGiaoThang({slNhan})`).
- `04_3/tests/ghi-kho.js`: `moPhienPhu`, `goiGhi`, `nhapLo`, `loKhaDung`.
- `14_3/tests/hoa-don.js`: `xmlHd` (XML hoá đơn điều chỉnh theo khuôn PO), `dotRanh` (đợt trả rảnh theo vai), `nap/goHet`, `moKhoi`, `oMoTa`, `chanGhiHd`, `dongHet`.

## Bẫy đã gặp (đã ghi vào `skill/vnpost-auto-test/references/playwright-quality-gates.md`)
- Setup giờ LƯỜI (không đăng nhập sẵn) — `VNPOST_SETUP_LOGIN=1` để đăng nhập như cũ.
- 🚫 Chạy 2 lượt cùng một `playwright.config.js` cùng lúc (xoá `outputDir` của nhau, ENOENT).
- `.ant-modal:visible` không bắt được modal ⇒ dùng `getByRole('dialog')`.
- Hộp chọn kho đóng xong trả focus về ô kho, cướp dropdown mở ngay sau ⇒ chờ hộp ẩn hẳn.
- Output lệnh qua hook rtk bị lọc — xem kết quả Playwright bằng `rtk proxy npx playwright test ...`.

## 26/09/2026 chiều — 08 + 11 xong (99/99 · 81/81), sau đó làm tiếp theo `_CHECKLIST.md` (user giao /goal)
- **08**: spec `sp-form-ghi` · `sp-sua-xoa` · `combo-ghi` · `ngung-kich-hoat` · `danh-muc-ghi` (+060_007/009/016/021–025); helper `08/tests/sp-ghi.js`.
  Thử trên làn 5 (tct riêng) khi làn 8 bận; 050_x và 030_015/016 cần POS ⇒ làn 8. Lỗi/lệch ở báo cáo mục 08 "Bổ sung 26/09".
  ⛔ Nhập Excel danh mục: import-service dev trả FAILED 0 dòng kể cả với file mẫu — chạy lại 060_021–023 khi dịch vụ sống.
- **11**: nhóm 090–130 chạy đơn thật (`km-don` / `km-sp`, helper `km-tinh.js`), `doi-tuong-dieu-kien.tct` (070/080 đọc). Seed mới **16.3**
  (`VNPOST_LANE=8 npx playwright test --config tai-lieu-test/00_seed/playwright.api.config.js -g "seed 16"`). Chạy lại 110_009 (bảng giá COMBO4 mới).
- **Công cụ**: sửa `tool/core/specs.js` (hàm gom có tham số destructuring bị đếm vỏ). Script scratch `go_vo.py` (gỡ vỏ trùng) — logic: xoá test trong
  `chua-chay-duoc.*` nếu mã case đã có ở spec khác.
- Bẫy mới đã ghi quality-gates: `isVisible({timeout})` không chờ · nhãn NFD · toast FE chặn phải gom ngay.

## 26/09/2026 tối (phiên "Kiểm tra tiến độ 04_3/07_4", làn 8) — 04_3 97/97 · 07_4 32/32 · +04_1/09/31/18_5
- **07_4**: 🔴 `VNPOST_CORE.APPROVAL_LIMIT` bị xoá sạch từ 24/09 ⇒ dựng lại bằng `07_4/tests/tien-de-han-muc.tct.spec.js` (`-g "tien de 07_4"`, `VNPOST_TIEN_DE=1`) — 13_1_090 cũng cần nó.
  `han-muc-ghi` tự điền `roleCode` (BE bắt buộc) · `dat-truoc-validate` +010_003 · mới `hom-mail-ghi` (host `.invalid`). Kết quả ở báo cáo mục 07_4 "Bổ sung 26/09 tối".
- **04_3**: spec mới `anh-chung-tu.shop` · `the-kho-excel.shop` · `nhap-tu-po.tct` · `nhap-hoan-tra.gdv` (project `gdv` mới trong config) · `lich-su-lo.shop` · `chuyen-cap.tct` +060_013.
  🔴 Lỗi lớn: TCT→HUB cùng mã lô mà lô ở HUB đã về 0 ⇒ tỉnh không nhận được (500/"Mã lô đã tồn tại"), phiếu treo IN_TRANSIT (6 phiếu POD_01 1073–1075, 1079–1081).
  Bẫy script: danh sách phiếu chuyển trả CŨ TRƯỚC (size 50 mất phiếu mới) · BE tự FIFO lô · `po.nhapKho` trả về trước `/receive` (13_3 dùng chung — nên sửa helper).
- **04_1** 010_015/020_016/020_020 · **09** 020_001 (chuyển sang `san-xuat-lap.seed_gdv`) · **31** 030_009 (`font-chu.tct`, chuẩn = token antd mặc định) · **18_5** 090_004/005 (`huy-don.gdv`: huỷ đơn bị tắt cả FE lẫn BE — đỏ có đo).
- Còn skip hợp lệ (dựng được chỉ bằng sửa DB / nhiều chuỗi): 14_2 010_011/050_009 · 18_5 140_002/140_007.
- Tiếp theo: 18_2_020_* (14 case CTKM trong spec cũ `vnpost-promotion-pos.playwright.spec.js` — viết lại trên `18_1/tests/ctkm-qua.js`, cần POS 05:00–23:45) → 12_2_040_015 · 17_030_008 → phân hệ nhiều vỏ (07_2 25, 16 20, 04_5 18…).
- **26/09 khuya (tiếp)**: 07_2 +17 case (`khoa-kho-pham-vi.tct` — khoá bằng API `stock-freeze/bulk` + đo `freeze-check`; `khoa-kho-drawer.tct`; `khoa-kho-pos.gdv`; `kiem-kho-khoa.shop`; `canh-bao-hsd.tct`; `phan-quyen-khoa.tct`; 030_002 trong validate) · 12_2_040_015 (`bang-gia-het-han.tct`) · 04_5_030_* (`the-kho.shop`) · 02 (010_011/013, 020_014/025/026/028) · 16_030_022 (`chot-ky-ghi.tct` — 🔴 chốt kỳ ký gửi 500 ở MỌI kỳ ⇒ chặn cả dây chuyền 16_030/050/070).
  🔴 Lỗi lớn mới: khoá kho KHÔNG chặn kiểm kho (07_2_060_006) · phiếu chuyển do điểm bán lập tới HUB lưu to_shop = chính nó (07_2) · API `/report/stock-card` trả tối đa 500 dòng/trang.
  Helper 04_4 `demToanKhoExcel` giờ điền cột Serial (SP serial bị BE bỏ dòng) — chạy lại 04_4_040_004 khi rảnh.
  Checklist: 170 vỏ. Chưa làm POS (05:00–23:45): 07_2_080_001/002 (giá vốn bán âm), 18_2_020_* (14 CTKM, spec cũ vnpost-promotion-pos).
