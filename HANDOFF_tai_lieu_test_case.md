# Bàn giao — Hoàn thiện TÀI LIỆU TEST CASE (chưa viết script)

> Viết 18/09/2026. Đọc hết mục 1–4 trước khi sửa dòng nào.
> 🔴 **Phạm vi phiên sau: CHỈ tài liệu test case.** 🚫 Không viết/sửa script Playwright, không chạy
> test. Việc đó ở skill `auto-test` và bàn giao riêng `HANDOFF_auto_test.md`.

## 1. Đang ở đâu

> 🔄 **Cập nhật 18/09/2026 sau phiên hoàn thiện tài liệu** (số cũ để trong ngoặc).

| Chỉ tiêu | Số |
|---|--:|
| Case kịch bản đã dựng | **1.909** ở 48/48 phân hệ *(869)* |
| Case trong 19 sheet QC gốc | **1.644** (1.607 đã gán phân hệ, 37 chưa) |
| Case gốc **đã được phủ** | **1.049** *(330)* |
| Case gốc **CHƯA phủ** | **297** *(1.181)* ← khối lượng còn lại |
| Phân hệ đã hoàn thiện tài liệu | **46/48** *(1)* — xem cột ✅ ở mục 5 · 🔄 cập nhật 19/09/2026 |

🔴 **Một sheet QC THỨ 20 nằm ngoài `test-case-goc/`:** `resource/don_vi_van_tai.xlsx` (96 case, cùng
cấu trúc 19 sheet kia, tự khai *"Tổng các tình huống kiểm thử: 96"*). Công cụ **không đọc** nên 96 case
này không nằm trong tổng 1.644. Đã chuyển thể hết vào `12-don-vi-van-tai`; cần user quyết có chuyển
file vào `test-case-goc/` để công cụ đếm hay không.

Hai nguồn **không bao nhau**: sheet QC mạnh ở biến thể input; HDSD mạnh ở ràng buộc nghiệp vụ và
phân quyền. Riêng module `01`, HDSD cho ra **24 case mà sheet QC không có**. Phải dùng cả hai.

## 2. Bộ công cụ — 🚫 đừng làm tay việc máy đã làm được

```bash
# Xem tiến độ toàn bộ (sinh tự động, đừng sửa tay file _CHECKLIST.md)
node tool/bin/checklist.js

# Đối chiếu một phân hệ với sheet QC → <phân hệ>/doi-chieu-tai-lieu-goc.md
node tool/bin/doi-chieu-goc.js <ma-phan-he>
node tool/bin/doi-chieu-goc.js --tong-hop     # + tai-lieu-test/_DOI_CHIEU_GOC.md

# In song song case đã dựng ↔ case gốc, để khớp TAY
node tool/bin/xem-de-khop.js <ma-phan-he>

# Điền cột Ma goc từ bản đồ JSON {"<ma case>":"<ma goc>;<ma goc>"}
node tool/bin/gan-ma-goc.js <ma-phan-he> <ban-do.json>

# 🔴 Quét case CHƯA CHỐT kỳ vọng → phụ lục cuối từng test-cases.md + tai-lieu-test/_CASE_CHUA_RO.md
node tool/bin/case-chua-ro.js
```

| File | Việc |
|---|---|
| `tool/core/goc.js` | Đọc sheet QC (19 file **không đồng dạng**) |
| `tool/core/goc-mapping.js` | Ánh xạ sheet → phân hệ, khai theo **nhóm chức năng** |
| `tool/bin/doi-chieu-goc.js` | Sinh báo cáo đối chiếu |
| `tool/bin/gan-ma-goc.js` | Điền `Ma goc` + `Nguon`, có kiểm mã tồn tại |
| `tool/bin/checklist.js` | Sinh `_CHECKLIST.md` |
| `tool/bin/case-chua-ro.js` | 🔴 Tách riêng **case chưa chốt kỳ vọng** khỏi bảng độ phủ |

🔧 **Hai lỗi công cụ đã sửa trong phiên 18/09/2026** — biết để không tưởng là lỗi dữ liệu:

1. `doi-chieu-goc.js` **phình file mỗi lần sinh lại**: `nhanXetTayCu()` bắt marker `<!-- NHAN-XET-TAY -->`
   bằng `indexOf`, mà **phần văn xuôi mở đầu của chính báo cáo cũng nhắc tên marker** ⇒ mỗi lần sinh
   lại tha nguyên bản cũ sang bản mới. File `01` đã nhân **8 lần** (110 KB). Nay khớp **trọn dòng**.
   Đã dọn lại cả 38 báo cáo.
2. `checklist.js` **đếm lệch đơn vị**: mẫu số đếm theo **dòng** sheet, tử số đếm theo **mã** duy nhất.
   Sheet có chỗ dùng một mã cho hai case khác nhau (`FUNC_1_142`, `FUNC_1_459` ở `quan_ly_kho`) ⇒ hai
   case đã dựng vẫn bị báo thiếu. Nay đếm **theo dòng** cả hai đầu.

⭐ Nhận xét viết tay đặt **sau dòng `<!-- NHAN-XET-TAY -->`** ở cuối `doi-chieu-tai-lieu-goc.md` thì
được giữ nguyên qua mỗi lần sinh lại. Phần trên bị ghi đè.

## 3. Quy trình chuẩn cho MỖI phân hệ

1. `node tool/bin/doi-chieu-goc.js <phân hệ>` → đọc mục 3 "Case gốc CÓ mà CHƯA dựng".
2. `node tool/bin/xem-de-khop.js <phân hệ>` → khớp tay những case đã dựng còn thiếu `Ma goc`.
3. Viết bản đồ JSON → `node tool/bin/gan-ma-goc.js`.
4. **Quét 11 kỹ thuật ở mục 3.4 của skill `test-scenario`** — đây là bước đẻ ra nhiều case nhất.
5. Bổ sung case còn thiếu vào `test-cases.csv` (**7 cột**), cập nhật `test-input.json` cho khớp 1-1.
6. Chạy lại `doi-chieu-goc.js` + `checklist.js`, ghi nhận xét tay nếu phát hiện mâu thuẫn.

**Bằng chứng bước 4 đáng làm** — module `17` sau khi quét:

| | Trước | Sau |
|---|--:|--:|
| Case | 15 | **45** |
| Phủ sheet QC | 5/28 | **25/28** |

## 4. Luật bất di bất dịch

1. 🚫 **Không ép khớp.** Case gốc và case đã dựng chỉ *na ná* nhau thì để trống `Ma goc`. Ví dụ đã
   gặp: `02_020_003` "trùng **mã** nhân viên" vs `FUNC_NHANVIEN__17` "trùng **số điện thoại**" — khác
   điều kiện, không nối. Số khớp phải là số thật.
2. 🚫 **Không dựng lại case trùng trong sheet.** `DIEMBAN__34`–`37` trùng y hệt `30`–`33`;
   `quan_ly_kho` có 19 cặp. Công cụ đã trừ sẵn khỏi cột "chưa dựng".
3. 🚫 **Không chép kỳ vọng sai từ sheet.** `DIEMBAN__49` là case lọc lịch sử nhập nhưng kỳ vọng chép
   nhầm của case gán nhân viên. Viết lại theo nghiệp vụ đúng.
4. 🔴 **Mọi case `mutates` để `allowMutation: false`.** Môi trường test trỏ **dữ liệu thật**
   (`.env.domain`). Hiện toàn hệ thống không còn case nào bật ghi — giữ nguyên trạng thái đó.
5. **7 cột**: `ID,Ten test case,Tien dieu kien,Buoc kiem thu,Ket qua ky vong,Ma goc,Nguon`.
   `Nguon` không bao giờ để trống.
6. Mã gốc **chỉ duy nhất trong một file** (`FUNC_1` dùng ở hai sheet). Nghi ngờ thì ghi `<file>#<mã>`.
7. Nhiều mã gốc cho một case đã dựng thì ngăn bằng `;`.

## 5. Hàng đợi việc — 🔴 LÀM TUẦN TỰ THEO SỐ ĐÃ ĐÁNH

🚫 **Không xếp hàng đợi theo tiêu chí nào** (không theo "còn thiếu nhiều nhất", không theo "dễ làm
trước"). Đi **lần lượt từ `01` đến `34`** đúng thứ tự số của thư mục phân hệ, làm **đủ 48 phân hệ**,
mỗi phân hệ chạy hết quy trình 6 bước ở mục 3 rồi mới sang phân hệ kế tiếp.

**Bảng tiến độ chính thức là `tai-lieu-test/_CHECKLIST.md`** (sinh tự động bằng
`node tool/bin/checklist.js` — 🚫 đừng sửa tay). Bảng dưới đây là **thứ tự làm việc**, số liệu chốt
lại **18/09/2026 sau phiên hoàn thiện tài liệu**; số liệu lúc làm vẫn phải đọc từ `_CHECKLIST.md`.

✅ = **đã hoàn thiện tài liệu trong phiên 18/09/2026**: phủ hết case gốc (hoặc case còn lại có lý do
ghi trong nhận xét tay), quét đủ 11 kỹ thuật mục 3.4, `test-cases.md` có trace route/API, `test-input.json`
khớp 1-1 với CSV, nhận xét tay ghi rõ lỗ hổng đặc tả.

🔄 **19/09/2026 — hai phân hệ làm ngoài thứ tự theo yêu cầu user:** số **38 `20_khach_hang_than_thiet`**
(10 → **104** case, phủ gốc 9 → **47/52**) và số **39 `24_cong_no_nhan_vien`** (21 → **49** case, phủ gốc
6 → **15/15**) đã xong, làm đầy đủ theo quyết định trace code ở mục 5b. Hai phân hệ này 🚫 **không** nằm
trong dòng chảy tuần tự — **hàng đợi vẫn tiếp tục từ số 32 (`18_1_ban_hang_tai_quay`)**, và khi tới số
38, 39 thì bỏ qua.

⚠️ `20` còn **5 case gốc chưa phủ** (`FUNC_DOITRA__26`–`30`): sheet QC khớp nhầm, nội dung thật là
**đổi hàng** thuộc `18_5_doi_tra_hang` — cần user duyệt sửa `tool/core/goc-mapping.js` (mục 6b câu 24).

🔄 **19/09/2026 — đổi mã phân hệ:** thư mục `14-gia-von-mac-dinh` đánh **sai mã 14** (trùng nhóm
phiếu xuất trả NCC `14_1`/`14_2`/`14_3`, vốn là nghiệp vụ khác hẳn) ⇒ đổi thành
`35-gia-von-mac-dinh`, và trong bảng dưới nó lùi từ số 30 xuống **số 48**. Mã case bên trong giữ
nguyên tiền tố `GVMD-` nên 🚫 không có script nào phải sửa; đã cập nhật mọi tham chiếu ở
`tool/core/goc.js`, `tool/core/goc-mapping.js`, `tool/bin/hdsd-mapping.js` và các file `_*.md`.

| # | Phân hệ | Kịch bản đã khai | Có script | Case gốc | Đã phủ | Gốc chưa phủ |
|--:|---|--:|--:|--:|--:|--:|
| 1 | ✅ `01_quan_ly_diem_ban` | 134 | 71 | 54 | 50 | ✅ 0 |
| 2 | ✅ `02_quan_ly_nhan_vien` | 72 | 4 | 26 | 26 | ✅ 0 |
| 3 | ✅ `03a_quan_ly_ca_lich_lam_viec` | 64 | 0 | 19 | 19 | ✅ 0 |
| 4 | ✅ `03b_ca_lam_viec_nhan_vien` | 48 | 0 | 23 | 23 | ✅ 0 |
| 5 | ✅ `04_1_canh_bao_ton_kho` | 72 | 52 | 30 | 30 | ✅ 0 |
| 6 | ✅ `04_2_ton_kho_dau_ky` | 36 | 0 | 25 | 25 | ✅ 0 |
| 7 | ✅ `04_3_nhap_xuat_chuyen_kho` | 97 | 5 | 107 | 95 | ✅ 0 |
| 8 | ✅ `04_4_kiem_kho` | 33 | 2 | 31 | 31 | ✅ 0 |
| 9 | ✅ `04_5_quan_ly_ton_kho` | 46 | 3 | 45 | 45 | ✅ 0 |
| 10 | ✅ `07_1_cau_hinh_chung` | 29 | 0 | — | — | — |
| 11 | ✅ `07_2_cau_hinh_kho` | 53 | 0 | 35 | 35 | ✅ 0 |
| 12 | ✅ `07_3_don_hang_va_thanh_toan` | 18 | 0 | — | — | — |
| 13 | ✅ `07_4_van_hanh` | 32 | 0 | 20 | 20 | ✅ 0 |
| 14 | ✅ `08_quan_ly_san_pham` | 99 | 17 | 132 | 132 | ✅ 0 |
| 15 | ✅ `09_san_pham_san_xuat` | 23 | 0 | — | — | — |
| 16 | ✅ `10_bang_gia_ban_san_pham` | 87 | 0 | 82 | 81 | ✅ 0 |
| 17 | ✅ `11_khuyen_mai` | 81 | 0 | 50 | 49 | ✅ 0 |
| 18 | ✅ `12_1_ho_so_nha_cung_cap` | 32 | 11 | 25 | 25 | ✅ 0 |
| 19 | ✅ `12_2_san_pham_va_bang_gia_ncc` | 50 | 2 | 50 | 50 | ✅ 0 |
| 20 | ✅ `12_3_cong_no_nha_cung_cap` | 68 | 1 | 68 | 68 | ✅ 0 |
| 21 | ✅ `12_4_hop_dong_va_khuyen_mai_ncc` | 60 | 0 | 65 | 65 | ✅ 0 |
| 22 | ✅ `12-don-vi-van-tai` | 108 | 73 | 12 | 12 | ✅ 0 |
| 23 | ✅ `13_1_phieu_de_xuat_va_phe_duyet` | 55 | 3 | 60 | 53 | ✅ 0 |
| 24 | ✅ `13_2_gop_tach_va_dieu_phoi` | 3 | 1 | 2 | 2 | ✅ 0 |
| 25 | ✅ `13_3_dat_hang_va_nhap_hang` | 98 | 3 | 98 | 98 | ✅ 0 |
| 26 | ✅ `13-cong-no-diem-ban-tinh` | 40 | 28 | — | — | — |
| 27 | ✅ `14_1_lap_va_duyet_phieu_xuat_tra` | 144 | 1 | 26 | 26 | ✅ 0 |
| 28 | ✅ `14_2_gom_tach_va_xu_ly_hang_tra` | 108 | 0 | — | — | — |
| 29 | ✅ `14_3_hoa_don_hang_tra_lai` | 89 | 0 | — | — | — |
| 30 | ✅ `16_hang_ky_gui` | 138 | 0 | — | — | — |
| 31 | ✅ `17_quan_ly_quay_thu_ngan` | 64 | 0 | 28 | 25 | 3 ⚠️ |
| 32 | ✅ `18_1_ban_hang_tai_quay` | 131 | 6 | 56 | 56 | ✅ 0 |
| 33 | ✅ `18_2_khach_hang_va_uu_dai` | 115 | 49 | 10 | 10 | ✅ 0 |
| 34 | ✅ `18_3_thanh_toan_va_bien_lai` | 54 | 3 | 10 | 10 | ✅ 0 |
| 35 | ✅ `18_4_quan_ly_don_hang` | 70 | 4 | — | — | — |
| 36 | ✅ `18_5_doi_tra_hang` | 58 | 0 | 25 | 25 | ✅ 0 |
| 37 | ✅ `19_quan_ly_khach_hang` | 70 | 0 | 46 | 46 | ✅ 0 |
| 38 | ✅ `20_khach_hang_than_thiet` | 104 | 10 | 52 | 47 | **5** ⚠️ |
| 39 | ✅ `24_cong_no_nhan_vien` | 49 | 0 | 15 | 15 | ✅ 0 |
| 40 | ✅ `26_phieu_thu` | 40 | 0 | 15 | 15 | ✅ 0 |
| 41 | ✅ `27_doi_soat_hoa_don` | 36 | 0 | 38 | 31 | ✅ 0 |
| 42 | ✅ `29_bao_cao` | 77 | 0 | 51 | 51 | ✅ 0 |
| 43 | ✅ `30_bao_cao_ctkm` | 20 | 0 | — | — | — |
| 44 | ✅ `31_quan_ly_phan_quyen` | 45 | 12 | 45 | 44 | ✅ 0 |
| 45 | ✅ `32_mo_hinh_to_chuc` | 68 | 12 | 67 | 67 | ✅ 0 |
| 46 | ✅ `33_lich_su_thao_tac_nguoi_dung` | 24 | 0 | — | — | — |
| 47 | ✅ `34_cong_no_khach_hang` | 28 | 0 | 13 | 13 | ✅ 0 |
| 48 | ✅ `35-gia-von-mac-dinh` | 61 | 19 | 51 | 38 | 13 ⚠️ |

> `Kịch bản đã khai` = số dòng trong `test-cases.csv` · `Có script` = số case đó có `test()` ở spec.
> `Case gốc` / `Đã phủ` / `Gốc chưa phủ` = đối chiếu với 19 sheet QC, đã trừ bản trùng trong chính sheet.
> `—` = sheet QC không phủ phân hệ này → việc duy nhất là **quét kỹ thuật mục 3.4**, không có gì để đối chiếu.

🔴 **Bảng này 🚫 KHÔNG nói phân hệ nào "đủ script".** Vì thế đã bỏ cột nhãn trạng thái ở bản trước.
Chưa phân hệ nào được phép coi là xong, vì hai việc còn dở ở **mọi** phân hệ:

1. **Chưa đối chiếu hết case gốc ↔ case đã dựng.** Chỉ `17_quan_ly_quay_thu_ngan` đã quét kỹ thuật
   mục 3.4 (1/38). Cột `Đã phủ` mới là 326/1607 — phần lớn `Ma goc` còn trống, mà trống thì **không
   biết** là chưa phủ hay đã phủ mà chưa khớp.
2. **Case đã dựng cũng chưa phủ hết nghiệp vụ.** `Kịch bản đã khai` không phải mục tiêu: module `17`
   sau khi quét 3.4 nhảy 15 → 45 case. Các phân hệ chưa quét đều còn thiếu tương tự, kể cả phân hệ
   có cột `Có script` bằng `Kịch bản đã khai`.

⇒ Cột `Có script` chỉ đo **script/case ĐÃ KHAI**, tử số và mẫu số đều chưa chốt. Ví dụ rõ nhất:
`12_3`, `14_1`, `13_2` khai đúng 1 case và case đó có script, trong khi sheet QC có 68 / 26 / 2 case.
🚫 Đừng đọc cột đó như độ phủ, và đừng bỏ phân hệ nào khi đi tuần tự.

## 5a. 🔄 Phiên 19/09/2026 — HOÀN TẤT 13 phân hệ cuối (#34–#48)

User yêu cầu: *"lần lượt hoàn thiện tài liệu test case cho các phân hệ ở mục 5 theo thứ tự, bắt đầu
từ #34, #38 và #39 đã làm rồi thì không cần làm lại"*. Đã làm đủ **13/13**: #34 #35 #36 #37 #40 #41
#42 #43 #44 #45 #46 #47 #48.

| Chỉ tiêu | Trước phiên | Sau phiên |
|---|--:|--:|
| Case kịch bản toàn hệ thống | 2.702 | **3.131** |
| Case gốc đã phủ | 1.311 | **1.553** |
| Case gốc chưa phủ | 266 | **28** |
| Phân hệ hoàn thiện tài liệu | 33/48 | **46/48** |
| Case mồ côi | 2 | **0** |
| Phân hệ thiếu cột `Ma goc` | 3 | **0** |

**Việc đã làm ở từng phân hệ** (ngoài việc phủ case gốc):

- **Nhóm A — dựng mới `test-cases.md` + `test-input.json`:** `31` `32` `35` (script đã có, tài liệu rỗng).
- **Nhóm B — nâng CSV từ 5 cột lên 7 cột:** `18_4` `30` `33`.
- **Trace code hai đầu** cho mọi phân hệ, theo quyết định mục 5b: route → API FE ↔ BE →
  `PodException` nguyên văn → xác minh nhãn/cột từ code.
- **Quét 11 kỹ thuật mục 3.4** cho từng màn.

### 🔴 28 case gốc còn lại — KHÔNG phải việc bỏ dở

| Ở đâu | Số | Vì sao |
|---|--:|---|
| `35-gia-von-mac-dinh` | 13 | khối **Thẻ kho** bị ánh xạ nhầm sang phân hệ giá vốn — cột ID bỏ trống, cột kỳ vọng rỗng, nội dung thuộc `04_5`. Cần sửa `goc-mapping.js` (mục 5 của `35/test-cases.md`) |
| các phân hệ khác | 15 | bản **trùng trong chính sheet**, công cụ đã trừ khỏi cột "chưa dựng" |

### 🔴 Lỗ hổng đặc tả MỚI phát hiện trong phiên — cần user quyết

Tiếp số thứ tự mục 6b:

| # | Câu hỏi | Ở đâu |
|--:|---|---|
| 32 | 🔴 **Chặn khách lẻ ghi nợ có ba lối thoát** không tài liệu nào nói: `paymentAuto`, `isPosOffline`, đơn có dòng `SERVICE` (`CheckoutOrder.java:1696-1702`). Sheet QC viết như thể chặn tuyệt đối | `18_3` |
| 33 | 🔴 **Chuỗi `Sai mã OTP, vui lòng thử lại` KHÔNG tồn tại trong repo** dù `dong159` đòi đúng chuỗi đó | `18_3` |
| 34 | 🔴 **Không có phép kiểm "số điểm không vượt số phải thu"** và **không chặn số điểm = 0** dù HDSD yêu cầu | `18_3` |
| 35 | 🔴 **HDSD nói 8 trạng thái đơn, code có 7**; nhãn lệch (`Đơn đã thanh toán` vs `Đã thanh toán`); **HDSD 12 cột, code 15 cột** | `18_4` |
| 36 | 🔴 **Nút phát hành hoá đơn điện tử chưa gắn quyền FE** — `OrderTableData.jsx:357` còn `// TODO: Thêm permKey`, trong khi phát hành HĐ không gỡ lại được | `18_4` |
| 37 | 🔴 **Thông báo lẫn CÓ DẤU và KHÔNG DẤU** trong cùng `ReturnOrderServiceImpl`; `RETURN_POLICY_DAYS_EXCEEDED` là mã lỗi thô lọt ra UI | `18_5` |
| 38 | 🔴 **Hai luật clawback combo song song** (V1/V2, `ReturnOrderServiceImpl:585`) — HDSD không nhắc chữ nào | `18_5` |
| 39 | 🔴 **Popup xoá khách hàng: chuỗi sheet QC đòi không tồn tại** ở màn khách hàng (chỉ có ở màn đơn hàng) | `19` |
| 40 | 🔴 **Phiếu thu tự sinh trải trên 4 phân hệ khác nhưng HDSD phân hệ 26 không nhắc gì** | `26` |
| 41 | 🔴 **Sheet QC đòi 2 thông báo riêng cho xuất/nhập kho sau chốt kỳ, code chỉ có 1 câu chung**; và **6 thông báo kỹ thuật TIẾNG ANH lọt ra UI** ở nhánh chốt kỳ | `29` |
| 42 | 🔴 **HDSD nói "mười chỉ số hiệu quả" — code có 6 thẻ + 9 cột, không chỗ nào ra 10.** Đồng thời nhãn ghi `(gồm VAT)` mâu thuẫn quy ước *doanh thu trước VAT* | `30` |
| 43 | 🔴 **`FUNC_VAITRO__10` đòi kiểm "font chữ chuẩn theo design"** — không đo được, sheet không cho giá trị chuẩn. Đã để `BLOCKED`, 🚫 không hạ kỳ vọng | `31` |
| 44 | **Sheet QC không phủ hai màn `permission-group` và `permission`** — có nằm trong phạm vi bàn giao không? | `31` |
| 45 | 🔴 **Khối Thẻ kho (13 dòng) ánh xạ nhầm vào phân hệ `35`** — cần sửa `goc-mapping.js` | `35` |
| 46 | ⚠️ **Câu hỏi treo số 21 (nhập Excel: nhận một phần hay từ chối cả tệp) nay lặp ở phân hệ thứ tư** là `32` | `08` `10` `12_2` `32` |
| 47 | ⚠️ **Câu hỏi treo số 7 (giá vốn khi tồn âm) nay lặp ở phân hệ thứ tư** là `35` | `04_3` `04_4` `07_2` `35` |
| 48 | ⚠️ **Thu hồi nợ khách hàng nay trùng ở BỐN chỗ** (thêm `19_090_002`/`19_090_003`) — càng cần chốt giữ chỗ nào làm chính | `19` `24` `34` |

### ⚠️ Case `mutates` nguy hiểm nhất phát sinh trong phiên

Ba case thuộc loại **phá huỷ, không hoàn tác được**, đều `enabled: false` + `allowMutation: false`:

1. `32_140_003` — **xoá cấp Tổng công ty = xoá sạch mô hình tổ chức**. Nặng nhất trong cả 48 phân hệ.
2. `31_080_006` — **chọn tất cả chức năng cho một vai trò** = cấp toàn quyền cho mọi người mang vai trò đó.
3. `29_210_016` — **chốt tồn kho toàn bộ phạm vi gồm cấp dưới** = khoá kỳ nhiều đơn vị cùng lúc, không mở lại được.

## 5b. 🔴 Đo độ sâu nguồn — 19/09/2026, và hai quyết định của user

Câu hỏi của user: *"Kịch bản đã khai dựa vào nguồn nào, đã đầy đủ từ HDSD và tra code chưa?"*
Đo trên cả 48 phân hệ (🚫 không ước lượng):

| Nguồn ghi ở cột `Nguon` | Case |
|---|--:|
| Sheet QC | 1.079 |
| HDSD | 529 |
| Kỹ thuật mục 3.4 | 277 |
| khác / không rõ | 98 |
| **Trace code** | **4** |

🔴 **4/2.052 case** khai nguồn trace code, và cả 4 đều của `14_1`. Bước 2 của skill `test-scenario`
(trace route · API · nhãn thật) hiện đạt:

| Hạng mục | Đạt |
|---|--:|
| có `test-cases.md` | 40/48 |
| md có mục **Route** | 24/48 |
| md có mục **API** | **6/48** |
| md dẫn tên file code (`.jsx` / `.java`) | 11/48 |
| CSV đủ **7 cột** | 40/48 |

Ba nhóm hổng:

- **Nhóm A — chưa có `test-cases.md`** (8 phân hệ, 116 case): `18_1` `18_2` `18_3` `18_4` `20` `31`
  `32` `35`. ⚠️ `18_2` (49 case) và `35` (20 case) **đã có script** — script chạy trên tài liệu rỗng.
- **Nhóm B — CSV chưa đủ 7 cột** (8 phân hệ): `14_2` `14_3` `16` `18_4` `30` `33` chỉ **5 cột**
  (thiếu hẳn `Ma goc` + `Nguon` ⇒ 🚫 không nối được sheet QC); `04_1` 8 cột; `01` 11 cột.
- **Nhóm C — có md nhưng chỉ tả màn, không trace code** (24 phân hệ, đông case nhất): `08` (99)
  `12-don-vi-van-tai` (108) `13_3` (98) `10` (87) `11` (81)…

**Quyết định của user 19/09/2026 — áp cho mọi phân hệ còn lại:**

1. ✅ **Trace code ĐẦY ĐỦ như `14_1`** cho từng phân hệ: đọc trọn HDSD → trace route + API **đối
   chiếu hai đầu** (FE `services/*.js` ↔ BE `@RequestMapping`/`@PostMapping`) → grep trọn
   `PodException(` lấy **nguyên văn** thông báo lỗi → **xác minh tên cột/nhãn từ code**, 🚫 không
   chép từ HDSD. Bằng chứng bước cuối đáng làm: ở `14_1`, HDSD tả màn chi tiết có 7 cột, code có
   **11**; và thông báo serial có **ba chuỗi khác nhau** giữa HDSD / FE / BE.
2. ✅ **Giữ đúng thứ tự mục 5, 🚫 không chen ngang.** Nhóm A được xử khi tới lượt, kể cả khi phân hệ
   đó đã có script chạy.

## 5c. 🔴 Case CHƯA CHỐT kỳ vọng — 49 case, tách riêng 19/09/2026

**Vì sao tách.** Nguyên tắc duy nhất của skill: *"case không đo được là case luôn xanh — tệ hơn không
có test, vì nó tạo cảm giác đã phủ"*. Nhưng thực tế nhiều case buộc phải viết kỳ vọng dạng *"ghi lại
hành vi thật"* vì HDSD không nói và code chưa trace tới. 🔴 **Những case đó KHÔNG được trộn vào bảng
độ phủ chung** — trộn vào là con số nhìn đẹp hơn sự thật.

```bash
node tool/bin/case-chua-ro.js
```

Công cụ quét mọi `test-cases.csv`, tìm kỳ vọng còn chứa *"ghi lại hành vi thật"* · *"chưa chốt được"*
· *"cần user quyết"* · *"ghi lại nguyên văn"* · *"chưa rõ"*, rồi ghi **hai** nơi:

1. **Phụ lục cuối từng `<phân hệ>/test-cases.md`**, sau dòng `<!-- PHU-LUC-CHUA-RO -->`.
   ⭐ Chữ viết tay đặt **trước** marker thì được giữ; phần sau marker bị ghi đè.
   ✅ Đã kiểm idempotent: chạy 3 lần kích thước file không đổi (🚫 không mắc lỗi phình file như
   `doi-chieu-goc.js` từng mắc).
2. **Bản tổng hợp `tai-lieu-test/_CASE_CHUA_RO.md`** — đếm theo loại vướng và theo phân hệ.

Số đo 19/09/2026: **49 case ở 16/48 phân hệ**.

| Vướng gì | Case | Ai gỡ được |
|---|--:|---|
| Chờ chạy để lấy hành vi thật | 28 | phiên chạy script |
| Thiếu nguyên văn thông báo | 9 | trace BE, hoặc chạy để chép |
| Điều kiện chưa xác định | 6 | user / QC |
| Chờ user quyết | 6 | **user** |
| Chờ chốt với QC | 4 | **QC** |
| Chưa rõ | 3 | user |
| Chưa đo được | 3 | trace thêm |

| Phân hệ | Chưa chốt / tổng |
|---|--:|
| `18_1_ban_hang_tai_quay` | 13/131 |
| `18_2_khach_hang_va_uu_dai` | 12/115 |
| `04_5_quan_ly_ton_kho` | 4/46 |
| `01` · `14_1` · `14_3` | 3 mỗi phân hệ |
| `17` | 2 |
| `02` `03a` `04_1` `04_2` `04_3` `14_2` `16` `20` `24` | 1 mỗi phân hệ |

⚠️ **28/49 case chỉ cần CHẠY là gỡ được** — chúng không chặn việc viết tài liệu, chỉ chặn việc kết
luận pass/fail. 🔴 Nhưng 13 case còn lại (`Chờ user quyết` + `Chờ chốt với QC` + `Chưa rõ`) thì
🚫 **không ai gỡ hộ được** — phải hỏi.

🔴 **Luật cho phiên viết script:** case nằm trong `_CASE_CHUA_RO.md` thì chạy để **quan sát**,
🚫 **không** viết `expect()` chốt pass/fail, và 🚫 **không** đếm vào độ phủ. Chạy xong ghi hành vi
thật vào cột `Ket qua ky vong` rồi chạy lại `case-chua-ro.js` để nó tự rơi khỏi danh sách.

## 6. 🔴 Câu hỏi CHẶN — cần user quyết, 🚫 đừng tự chọn

1. **37 case gốc chưa có phân hệ nào nhận**: *Phiếu chi* (14 case) và *Công nợ Tỉnh–TCT* (23 case).
   Lập thư mục phân hệ mới hay gộp vào đâu? Khai quyết định vào `tool/core/goc-mapping.js`.
   ⚠️ `goc-mapping.js` **cố ý** để nhóm *Công nợ Tỉnh–TCT* là `module: null` — 🚫 **đừng gán vào**
   `13-cong-no-diem-ban-tinh`, phân hệ đó là vế **Điểm bán ↔ Tỉnh**, còn nhóm này là vế
   **Tỉnh ↔ Tổng công ty**. (File `13-cong-no-diem-ban-tinh/doi-chieu-tai-lieu-goc.md` từng chứa 23
   case này do ánh xạ cũ — đã dọn 18/09/2026.)
2. ✅ **ĐÃ QUYẾT 18/09/2026** — *11 case module `01`*: user chọn **"hai luồng khác nhau"** ⇒ đã bỏ luật
   nhóm trong `goc-mapping.js`, cả sheet `uat_vnpost_mo_hinh_to_chuc.csv` về `32_mo_hinh_to_chuc`.
   Module `01` còn 54 case gốc (từ 65). ⚠️ Bằng chứng cần biết khi làm `32`: `OrganizationDetail.jsx`
   mở **đúng component** `DrawerCreateOrUpdateShop` của màn Quản lý điểm bán, cùng API
   `POST /shops/profile`; và cờ **"Là cửa hàng mẫu"** + dropdown **"Cửa hàng mẫu"** hiện **đã bị
   comment out** trong FE (`DrawerCreateShop.jsx:604`, `DrawerDetailShop.jsx:148-153`) ⇒ `dong64` và
   `FUNC_THUMUC__52` **không test được** ở bản hiện tại.
3. **Phân hệ `27_doi_soat_hoa_don`**: HDSD khai vai nghiệp vụ `nhan_vien_mua_hang` / `ke_toan`, không
   phải 5 vai theo cấp. Tài khoản nào trong `.env.accounts` đóng hai vai đó? Chưa có thì ranh giới
   quyền giữa hai vai **không test được**.
4. **Thu hồi nợ khách hàng trùng nghiệp vụ ở 3 chỗ**: `19_090_001`, `24_040_003`, `34_040_001` cùng
   sinh phiếu thu *"Thu hồi nợ"*. Giữ chỗ nào làm chính?

### 6b. Câu hỏi CHẶN mới phát sinh trong phiên 18/09/2026

Xếp theo mức nguy hiểm. Chi tiết nằm ở `test-cases.md` và nhận xét tay của từng phân hệ.

| # | Câu hỏi | Ở đâu |
|--:|---|---|
| 5 | 🔴 **Dòng bỏ trống số lượng thực tế khi kiểm kho có bị coi là "đếm 0"?** Nếu có thì áp dụng phiếu sẽ **xoá sạch tồn kho của mọi sản phẩm chưa kiểm**. Sheet QC không có case nào cho nó. | `04_4` mục 2 |
| 6 | 🔴 **Xoá kho đang có tồn thì tồn đi đâu?** Kỳ vọng gốc `FUNC_1_220` để ngỏ: *"Xoá kho thành công - Số lượng còn lại trong kho ?"* | `04_5` mục 6 |
| 7 | 🔴 **Giá vốn lấy ở đâu khi tồn ÂM / không còn lô?** Cùng một câu hỏi lặp ở **ba** phân hệ | `04_3` `04_4` `07_2` |
| 8 | 🔴 **Sửa phiếu nhập khi sản phẩm/lô ĐÃ phát sinh xuất**: có chặn giảm dưới số đã xuất? Giá vốn phiếu xuất cũ có tính lại? | `04_3` mục 3 |
| 9 | 🔴 **Không có phép kiểm Min ≤ Max** cho ngưỡng cảnh báo tồn kho (trong khi hạn mức duyệt ở `07_4` **có**) | `04_1` · `07_4` |
| 10 | 🔴 **11 case gốc trống nội dung / không có kỳ vọng** ở phân hệ sản phẩm (`dong21` `dong24` `dong27` `dong30`–`34` `dong45` `dong48` `SANPHAM_56`) | `08` mục 3 |
| 11 | 🔴 **Quy tắc chọn bảng giá khi nhiều bảng cùng hiệu lực** ("muộn nhất thắng") chỉ suy từ sheet, chưa xác nhận từ code | `10` mục 2 |
| 12 | 🔴 **Tắt hết phương thức thanh toán** ⇒ quầy không thu tiền được; hệ thống có chặn? Và **giá trị 0** của ô giới hạn thời gian trả hàng nghĩa là *không cho đổi trả* hay *không giới hạn*? | `07_3` mục 2 |
| 13 | 🔴 **Năm câu hỏi sinh PHIẾU TREO** ở cấu hình luồng phê duyệt (tắt cấu hình · sửa cấu hình · khoảng tiền giao thoa · phiếu ngoài mọi khoảng · xoá bước duyệt) | `07_4` mục 3 |
| 14 | 🔴 **Hàng treo giữa đường**: phiếu chuyển kho lập trước khi khoá kho, hàng đã rời kho gửi, bên nhận bị chặn xác nhận | `07_2` mục 3 |
| 15 | 🔴 **Bán âm × quản lý serial xung đột**: serial không tồn tại thì không có gì để chọn (`FUNC_1_460`) | `04_4` mục 7 |
| 16 | **Hardcode 8 số điện thoại bỏ qua phép chặn ca** trong `routes/helpers.js` — vừa là lỗ kiểm soát, vừa là **bẫy pass giả** cho nhóm `03b_060_*` | `03b` mục 4 |
| 17 | **Giới hạn 90 ngày khi xếp lịch lặp** (HDSD 03a) **không tìm thấy trong FE**, và ô *Ngày kết thúc* không bắt buộc | `03a` mục 8 |
| 18 | **8/32 nhóm cấu hình trong menu chưa có phân hệ nào phủ** (`warehouse` `priorityExpiryLot` `finance` `vat` `boxQR` `reasonCatalog` `other` — riêng `roundingAmountStock` đã bổ sung vào `07_1`) | `07_1` |
| 19 | **`FUNC_NHANVIEN__19` nói trái phân hệ `01`**: trùng đơn vị khác vai trò — `02` đòi chặn, `01_050_009` cho phép | `02` mục 7 |
| 20 | **`FUNC_NHANVIEN__22`**: đổi một phân công sang "Đã nghỉ" thì **toàn bộ** phân công cùng đổi? Code không thấy xử lý lan | `02` mục 7 |
| 21 | **Ba câu hỏi "nhận một phần hay từ chối cả file"** khi import Excel lẫn dòng lỗi — lặp ở `08` `10` `12_2`, nên trả lời một lần | `08` `10` `12_2` |
| 22 | **Barcode có tìm được không** — `FUNC_1_202` (`04_1`) và `FUNC_1_85` (`04_5`) cùng đòi, code không khai | `04_1` `04_5` |
| 23 | **File `don_vi_van_tai.xlsx` đặt ở đâu** — chuyển vào `test-case-goc/` để công cụ đếm, hay giữ ở `resource/` | `12-don-vi-van-tai` mục 2 |
| 24 | 🔴 **`FUNC_DOITRA__26`–`30` khớp nhầm về phân hệ 20**: nằm dưới tiêu đề nhóm *"Kiểm tra chức năng đổi điểm"* của sheet đổi trả hàng nhưng nội dung là **đổi hàng** (phiếu trả `TH_2026xx`, đơn hàng mới). Chuyển sang `18_5` chứ? Cần sửa `goc-mapping.js` | `20` |
| 25 | 🔴 **Luật "không tích điểm cho hoá đơn thanh toán bằng điểm thưởng" bị comment ở BE** (`CampaignService.java:457-462`): ô tích vẫn hiện, giá trị vẫn lưu, nhưng khi bán không có tác dụng — cố ý hay bỏ quên? | `20` |
| 26 | 🔴 **Tỷ lệ tích điểm = 0 lưu được** (FE chỉ chặn số âm, và validator ô này khai sai chữ ký nên không bao giờ báo lỗi) ⇒ chương trình "Đang hoạt động" mà mọi đơn tích 0 điểm, không cảnh báo | `20` |
| 27 | 🔴 **Màn "Lịch sử tích điểm" của khách hàng không tồn tại trong FE** nhưng 18 case gốc (`dong15`–`dong32`) kiểm chứng bằng màn đó. Có nằm trong phạm vi bàn giao không? | `20` |
| 28 | **Ngày bắt đầu quá khứ và ngày kết thúc = hôm nay** xử lý lệch nhau giữa màn tích điểm và đổi điểm, và cả hai đều khác sheet QC. Lấy code hay sheet làm chuẩn? | `20` |
| 29 | 🔴 **Cấp tỉnh/xã chọn điểm bán bị bỏ qua** ở thẻ *Công nợ với cửa hàng*: `EmployeeDebtController.list` đặt `resolvedShopId = null` rồi lọc theo mã tỉnh/xã, trong khi TCT thì nhận đúng `shopId`. Cố ý hay lỗi? | `24` |
| 30 | **Tìm kiếm công nợ nhân viên không bỏ dấu và không escape `%` `_`** (LIKE thuần) ⇒ trái hai case gốc `FUNC_NHANVIEN__49`, `FUNC_NHANVIEN__51`. Sửa code hay sửa kỳ vọng? | `24` |
| 31 | **Nhân viên nộp nhiều hơn tổng nợ** có bị chặn không? Cả HDSD lẫn sheet QC đều không nói | `24` |

## 7. Mâu thuẫn & lỗ hổng đặc tả đã phát hiện — 🚫 không tự sửa tài liệu

| Phân hệ | Vấn đề |
|---|---|
| `17` | 🔴 Sheet QC (`dong57`) đòi **chặn** trùng TÊN quầy; HDSD chỉ ràng buộc **MÃ**. Đã dựng `17_010_012` + `17_020_013` để phơi hành vi thật |
| `01` | `DIEMBAN__49` kỳ vọng chép nhầm; nhóm `38`–`43` mang tiêu đề sai; 3 dòng "Kiểm tra giao diện màn ..." bị cắt cụt |
| `04_2` | Tài liệu có trạng thái dòng **Cảnh báo** nhưng không nói nó là gì và có được ghi nhận không |
| `14_3`, `16`, `27` | Đều nói "đối soát khớp/lệch" nhưng **không có ngưỡng dung sai** ⇒ chưa viết được case biên |
| `29` | Thiếu **công thức vòng quay tồn kho** và **ngưỡng phân nhãn** bán chạy / chậm / hàng chết |
| `30` | Nói *"mười chỉ số hiệu quả"* nhưng không liệt kê là những chỉ số nào |
| `26` | `"Truyền sai tham số"` là thông báo kỹ thuật lọt ra UI — giữ nguyên văn trong case, nhưng đáng báo |
| `12-don-vi-van-tai` | 🔴 CSV **sinh ngược từ spec**, kỳ vọng đang lấy từ assertion của script. Phải chép lại từ `resource/don_vi_van_tai.xlsx` mới có giá trị |
| `uat_vnpost_ban_ton_kho_am.csv` | 4/9 case bên trong là của **danh mục sản phẩm**, trùng file `danh_muc_san_pham` — file bị lẫn nội dung |

## 8. Bẫy đã trả giá — 🚫 đừng lặp lại

1. **Sheet QC 19 file không đồng dạng**: dòng tiêu đề ở dòng **8 hoặc 9**, **11–15 cột**, cột
   `Điều kiện cần có` khi ở vị trí 2 khi ở 3. Lấy cột **theo tên**, 🚫 không theo chỉ số.
2. 🔴 **4/19 file có case nhưng cột ID BỎ TRỐNG**. Lọc theo "có ID" thì 4 file đó ra **0 case** — lỗi
   này đã mắc một lần. Nhận diện case bằng **có `Các bước` HOẶC `Kết quả mong muốn`**.
3. **Tiêu đề nhóm lồng nhau**: sheet chèn "HAPPY CASE" giữa nhóm thật và case ⇒ 30 case rơi vào phân
   hệ mặc định. Đã xử bằng danh sách tiêu đề chung chung. 🚫 Đã thử suy luận cây cha–con và **bỏ** —
   sheet có nhiều tiêu đề rỗng liên tiếp vốn là anh em, suy ra cây sai.
4. **Khớp luật ánh xạ phải đi từ nhóm LÁ ngược lên**, không khớp cả chuỗi — khớp cả chuỗi thì luật của
   nhóm cha nuốt hết nhóm con (đo: `13_3` nhận 242 case thay vì 98).
5. ⚠️ **Hook `rtk` cắt output của `head`**: `head -1 file | grep ...` trả kết quả SAI. Dùng
   `grep -l` trên cả file, hoặc đọc bằng node.
6. **Tự kiểm chứng parser**: mỗi sheet tự khai "Tổng các tình huống kiểm thử" ở dòng 3. Số đếm được
   phải khớp. Hiện lệch ở 2 file (`bang_gia` 82/81, `quan_ly_kho` 508/506) — chưa truy, ghi nhận.

## 9. Thế nào là XONG

- [ ] Mọi phân hệ có case gốc: mục 3 của `doi-chieu-tai-lieu-goc.md` **rỗng**, hoặc mỗi case còn lại
      có lý do ghi trong nhận xét tay.
- [ ] Mọi phân hệ đã quét đủ **11 kỹ thuật** mục 3.4; màn nào có số case ít hơn số ô nhập bắt buộc
      thì phải giải thích được.
- [ ] `test-input.json` khớp 1-1 với `test-cases.csv` ở mọi phân hệ (công cụ `doi-chieu-goc.js` không
      kiểm việc này — kiểm bằng script nhỏ như đã làm).
- [ ] Không phân hệ nào còn case `mutates` bật `allowMutation` (xem mục cuối `_CHECKLIST.md`).
- [ ] `node tool/bin/case-chua-ro.js` chạy sạch, hoặc mọi case còn trong `_CASE_CHUA_RO.md` đều thuộc
      nhóm *"chờ chạy để lấy hành vi thật"* — 🚫 không còn case nào `Chờ user quyết` / `Chờ chốt với QC`.
- [ ] 4 câu hỏi ở mục 6 đã có câu trả lời của user và đã phản ánh vào `goc-mapping.js` / test case.

## 10. Đọc thêm

| Việc | Ở đâu |
|---|---|
| Quy trình dựng kịch bản + **11 kỹ thuật mục 3.4** | `.claude/skills/test-scenario/SKILL.md` |
| Tiến độ script (khác việc này) | `tai-lieu-test/_CHECKLIST.md` |
| Đối chiếu tổng hợp | `tai-lieu-test/_DOI_CHIEU_GOC.md` |
| 🔴 Case chưa chốt kỳ vọng (49 case) | `tai-lieu-test/_CASE_CHUA_RO.md` |
| Mẫu làm đúng, đủ 3 file + nhận xét tay | `tai-lieu-test/17_quan_ly_quay_thu_ngan/` |
| Bàn giao việc VIẾT SCRIPT (phiên khác) | `HANDOFF_auto_test.md` |
