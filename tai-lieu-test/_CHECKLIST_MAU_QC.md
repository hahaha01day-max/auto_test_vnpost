# Checklist chuyển test case sang MẪU QC (mẫu `test-case-goc/uat_vnpost_*.csv`)

> ✍️ **File này viết tay** — không phải `_CHECKLIST.md` (file đó do `node tool/bin/checklist.js` sinh, cấm sửa).
> Mục tiêu: sinh thư mục mới `test-case-qc/`, mỗi phân hệ 1 file `<ten_phan_he>.csv` trình bày đúng mẫu QC
> (15 cột tiếng Việt + khối metadata + dòng nhóm). Nguồn dữ liệu: `test-cases.csv` hiện có của chính phân hệ đó.
> Tạo ngày 22/09/2026. Câu hỏi chặn đã chốt — xem mục 2.

## 1. Khác biệt cần bù (mẫu hiện tại → mẫu QC)

| Hạng mục | `test-cases.csv` hiện có | Mẫu QC |
|---|---|---|
| Khối metadata đầu file | không có | 9 dòng: Chức năng · Mã Testcase · Tổng tình huống · Chưa thực hiện · Đạt · Không đạt · Thực hiện sau · Không phải thực hiện · File Script |
| Header | 11 cột, ASCII không dấu | 15 cột, tiếng Việt có dấu |
| Mã case | `01_010_001` | mẫu QC dùng `FUNC_<n>_<seq>` — **ta giữ mã cũ**, xem mục 2 |
| Dòng nhóm phân cấp | không có | có, ID rỗng + tiêu đề ở cột `Tình huống` — nguồn ở mục 2b |
| Cột `Sinh test script` | không có | bản lặp các bước, **ghi URL đầy đủ** `https://vnpost.sfin.vn/...` |
| Cột `Kết quả thực tế` / `Kết quả` | không có | để trống (chưa chạy) hoặc `Pass`/`Fail` |
| Cột `Người thực hiện` / `Ngày tạo` / `Ngày thực hiện` / `SCRIPT` | không có | để trống, trừ `SCRIPT` điền tên file spec nếu có |

Mapping 15 cột QC:

| Cột QC | Nguồn |
|---|---|
| `ID` | `ID` — giữ nguyên |
| `Tình huống` | `Ten test case` |
| `Điều kiện cần có` | `Tien dieu kien` |
| `Các bước thực hiện` | `Buoc kiem thu` |
| `Sinh test script` | `Buoc kiem thu`, thay đường dẫn tương đối bằng URL đầy đủ `https://vnpost.sfin.vn/...` |
| `Ưu tiên` | `Uu tien` nếu có, còn lại **để trống** (47/48 phân hệ không có cột này) |
| `Ứng dụng/màn hình` | `Man hinh` nếu có; còn lại lấy route từ bảng màn hình trong `README.md`/`test-cases.md`, không có thì để trống |
| `Kết quả mong muốn` | `Ket qua ky vong` |
| `Kết quả thực tế` · `Kết quả` · `Người thực hiện` · `Ngày tạo` · `Ngày thực hiện` | **để trống** |
| `SCRIPT` | tên file spec trong `tests/` nếu mã case xuất hiện ở title một `test()`, không thì để trống |

Cột `Ma goc` và `Nguon` của file hiện tại **không có chỗ trong 15 cột QC** → bỏ khỏi bản QC
(vẫn còn nguyên ở `test-cases.csv`, không mất truy vết).

## 2. Quyết định đã chốt (user duyệt 22/09/2026)

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | Mã case ở cột `ID` | **Giữ nguyên mã hiện có** (`01_010_001`, `CNDB-CD-001`, `GVMD-001`) — không đánh lại `FUNC_<n>_<seq>` |
| 2 | Cột phụ truy vết mã cũ | **Không cần** (vì mã đã giữ nguyên) |
| 3 | File đầu ra | Thư mục mới `test-case-qc/`, mỗi phân hệ 1 file **cùng tên thư mục phân hệ**: `test-case-qc/01_quan_ly_diem_ban.csv`, `test-case-qc/04_4_kiem_kho.csv`, … |
| 4 | Dòng nhóm | **Lấy mã task trong chính `ID`** + tên task từ bảng "Task và case" ở `README.md` — xem mục 2b |
| 5 | Cột `Kết quả thực tế` / `Kết quả` | **Để trống** toàn bộ |

### 2b. Dòng nhóm — cách làm đã chọn và lý do

🚫 **Không dùng cột `Man hinh` / `Ten task`**: chỉ **1/48** phân hệ (`01_quan_ly_diem_ban`, 11 cột)
có hai cột này; 46 phân hệ còn lại chỉ có 7 cột (`ID, Ten test case, Tien dieu kien, Buoc kiem thu,
Ket qua ky vong, Ma goc, Nguon`) và `04_1_canh_bao_ton_kho` có 8. Lấy theo `Man hinh` là 47 phân hệ
ra dòng nhóm rỗng.

✅ **Nguồn phân cấp dùng chung cho cả 48 phân hệ = khúc mã task nằm trong `ID`:**

- 46 phân hệ theo `<mã phân hệ>_<mã task>_<STT>` → nhóm là khúc `010`/`020`/`030`…
  (`04_4_030_006` → nhóm `030`)
- 2 phân hệ mã chữ: `13-cong-no-diem-ban-tinh` → 5 nhóm `CNDB-CD` `CNDB-KY` `CNDB-LPB` `CNDB-ND`
  `CNDB-PQ`; `35-gia-von-mac-dinh` → 2 nhóm `GVMD` `BC`

**Tên hiển thị của dòng nhóm** lấy từ bảng `| Mã task | Task | …` trong `README.md` của phân hệ
(hoặc bảng `| Nhóm |` với 2 phân hệ mã chữ). Ví dụ `29_bao_cao` nhóm `010` →
`010 — Xem báo cáo doanh thu theo kỳ, đơn vị và ngành hàng`.

Đề xuất thêm **1 cấp nhóm lớn viết HOA** giống mẫu QC (mẫu có `KIỂM TRA PERMISSION` rồi
`KIỂM THỬ CHỨC NĂNG` rồi nhóm con): ở đây dùng tên phân hệ viết HOA làm dòng nhóm lớn duy nhất,
các mã task là nhóm con. Nếu bạn muốn bỏ cấp này thì nói, mình bỏ.

## 3. Cách sinh — ĐÃ TỰ ĐỘNG HOÁ

```bash
node tool/bin/to-qc-csv.js              # sinh 48 file CSV vào test-case-qc/
node tool/bin/to-qc-csv.js --check      # chỉ báo chỗ thiếu, không ghi file
node tool/bin/qc-csv-to-xlsx.js         # xuất .xlsx (Arial 10, freeze header)
```

🔴 **Bản gốc vẫn là `<phân hệ>/test-cases.csv`.** File trong `test-case-qc/` sinh ra được — sửa tay
ở đó là mất khi chạy lại. Đổi nội dung case thì sửa `test-cases.csv`; đổi tên nhóm thì sửa
`test-case-qc/_ten-nhom.json`.

### 12 cột của bản QC

`ID · Tình huống · Điều kiện cần có · Các bước thực hiện · Ưu tiên (Cao/TB/Thấp) · Kết quả mong muốn ·
Kết quả thực tế · Kết quả · Người thực hiện · Ngày tạo · Ngày thực hiện ·` (+1 cột rỗng cuối)

Bỏ khỏi mẫu QC gốc: `Sinh test script`, `Ứng dụng/ màn hình`, `SCRIPT`. Khối metadata bỏ dòng
`File Script`, còn 8 dòng.

🔴 `META_ROWS` / `HEADER_ROW` trong `qc-csv-to-xlsx.js` phải khớp `META_LABELS` của `to-qc-csv.js`.
Đổi số nhãn metadata mà quên sửa là tô đậm nhầm dòng, cố định nhầm hàng — file vẫn sinh bình thường
nên rất dễ lọt.

### Nguồn tên nhóm — theo thứ tự ưu tiên

1. `test-case-qc/_ten-nhom.json` — điền tay, giữ qua mọi lần chạy lại
2. `resource/hdsd/hdsd<phân hệ>/tasks/<mã>_*.md` → frontmatter `tieu_de` — **nguồn chuẩn nhất**
3. `README.md` / `test-cases.md` của phân hệ — bảng `| Mã task | Task |` hoặc văn xuôi `` `010` tên ``

### Mã nhóm rút từ `ID`

| Dạng mã case | Mã nhóm |
|---|---|
| `13_2_030_001` | `030` |
| `26_10_001` | `010` (đệm về 3 chữ số — vài README còn ghi 2 chữ số) |
| `03a_PQ_001` | `PQ` → luôn là *Kiểm tra permission* |
| `CNDB-CD-001` · `GVMD-001` | `CNDB-CD` · `GVMD` |
| `Vantai_7` | không có nhóm con — mọi case nằm thẳng dưới dòng nhóm lớn |

## 4. Kết quả chạy 22/09/2026

**48/48 phân hệ · 3131 case · 48 CSV + 48 XLSX.** Mọi file đúng 12 cột. Không còn nhóm nào thiếu tên,
**không còn case nào rỗng nội dung**.

### Bù 72 case rỗng — đã xong

| Nguồn bù | Số case | Cách làm |
|---|--:|---|
| Sheet QC ở `test-case-goc/` | 33 | `node tool/bin/bu-case-rong.js` — chép **nguyên văn** theo cột `Ma goc` |
| HDSD `resource/hdsd/hdsd<phân hệ>/tasks/` | 27 | soạn tay từ bảng trường bắt buộc và các bước trong HDSD |
| HDSD, case chỉ thiếu cột bước (`31_quan_ly_phan_quyen`) | 12 | soạn tay, giữ nguyên kỳ vọng sẵn có |

`bu-case-rong.js` có 3 bẫy đã xử lý, 🚫 đừng đơn giản hoá:

1. **Mã gốc chỉ duy nhất TRONG một file** — `FUNC_1` có ở cả `quan_ly_kho` lẫn
   `bao_cao_cong_no_khach_hang`. Phải tra qua `fileCuaModule(<phân hệ>)`, tra mã trần là chép nhầm
   nội dung của phân hệ khác.
2. **`Ma goc` có thể gộp nhiều mã** — `SANPHAM_35;SANPHAM_38;SANPHAM_41`. Tra nguyên chuỗi là trượt hết.
3. **4 sheet bỏ trống cột ID** (`ban_ton_kho_am`, `bao_cao_cong_no_khach_hang`, `danh_muc_san_pham`,
   `loyalty`) — case của chúng trỏ bằng số dòng, ghi là `dong17`.

### Bốn lỗi đã sửa khi soát lại

1. 🔴 **Cắt 🔴 làm rỗng 140 case.** Kỳ vọng của chúng **chỉ gồm một đoạn 🔴** — đó chính là kỳ vọng
   ("phơi hành vi thật", "kỳ vọng chốt sau khi đo"), không phải ghi chú thêm.
2. **272 ô viết không dấu** ở 5 phân hệ đã viết lại có dấu (dịch tay 256 ô khác nhau, 🚫 không dùng
   bộ thêm dấu tự động — `so`/`ky`/`chan` nhiều nghĩa, máy đoán là sai nghiệp vụ).
3. 🔴 **Ghi chú kỹ thuật lẫn vào cột `Kết quả mong muốn`.** Xem mục "Lọc ghi chú" dưới.
4. 🔴 **`\b` của JS chỉ hiểu chữ ASCII** — cue `'ghi rõ\b'` KHÔNG BAO GIỜ khớp vì `õ` không phải
   word-char. Lỗi này im lặng: regex vẫn chạy, chỉ là không bao giờ đúng. 🚫 Đừng thêm `\b` sau
   chữ tiếng Việt có dấu.

### Lọc ghi chú kỹ thuật khỏi `Kết quả mong muốn`

Dấu 🔴/🚫 trong `test-cases.csv` dùng cho HAI việc khác nhau, 🚫 cắt mù là hỏng:

| Loại | Ví dụ | Xử lý |
|---|---|---|
| Ghi chú cho người viết script | *"🔴 Ghi rõ có chặn hay không"*, *"🔴 FE không trim (ShopManagement.jsx)"*, *"🚫 không đoán"* | **cắt** khỏi bản QC |
| Nhấn mạnh của chính kỳ vọng | *"🚫 KHÔNG hiện 0%"*, *"🚫 KHÔNG có vùng tải tệp"* | **giữ**, chỉ bỏ ký tự 🔴/🚫 |

Ba điều phải làm đúng, 🚫 đừng đơn giản hoá:

1. **Cắt từ dấu tới hết MỆNH ĐỀ, không cắt cả câu** — ghi chú hay nối vào đuôi một kỳ vọng thật.
   Tách mệnh đề thêm ở `;` vì ghi chú hay dính chung câu qua dấu này.
2. **Ghi chú lồng trong ngoặc** thì bỏ riêng cụm ngoặc.
3. **`CUE_CODE` nhận diện được ngay cả khi mệnh đề không mang 🔴/🚫** — tên file, tên class,
   đường dẫn API, chữ "script" trong kỳ vọng luôn là ghi chú.

Kết quả: **353 câu ghi chú đã cắt · 283 câu giữ lại (nhấn mạnh thật) · 29 case kỳ vọng vốn chỉ là
ghi chú đã được soạn lại**. Báo cáo từng câu ở `test-case-qc/_soat-ghi-chu.md` (sinh tự động).

### Lọc tên hàm / biến trong code — vòng soát thứ hai

Vòng đầu chỉ cắt ghi chú khi mệnh đề có 🔴/🚫, nên tên code **không kèm dấu** lọt hết:
`handlSearch()` · `PHONE_PATTERN` · `disabled={!isAddNew}` · `EMPLOYEE_MANAGEMENT_DETAIL` ·
`route EMPLOYEE_MANAGEMENT_DETAIL` · `pageSize` · `onSelect`. `CUE_CODE` nay bắt **độc lập với dấu**:
tên file · tên class · định danh trong backtick · lời gọi `hàm()` · prop JSX `x={` · `=>` ·
**camelCase** (`shopId`, `orderAmountPerPoint`).

🚫 **KHÔNG bắt ALLCAPS_** (`TONG_CONG_TY`, `HANDED_OVER`, `CREDIT_NOTE_ALREADY_SETTLED`): đó là mã
vai trò, mã trạng thái và mã lỗi nghiệp vụ mà QC vẫn dùng khi lập phiếu bug.

Hai cái bẫy của vòng này, 🚫 đừng lặp lại:

1. 🔴 **Cắt cả mệnh đề vì thấy tên biến là ăn mất kỳ vọng thật.** Ghi chú kiểu tên biến hay nằm
   GIỮA hai vế thật: *"Ô Xã/Phường trở về rỗng (onSelect gọi …); dropdown chỉ liệt kê xã thuộc tỉnh
   B"* — vế sau là kỳ vọng. Vì vậy chỉ ghi chú **kiểu tài liệu** mới kéo dài sang mệnh đề sau; mệnh
   đề bị cắt vì tên biến thì 🚫 không bật cờ nối tiếp.
2. **Cắt sạch mà không có ghi chú kiểu tài liệu** nghĩa là cả ô chỉ nói về code — giữ nguyên văn còn
   hơn thay bằng "chưa chốt", vì nội dung vẫn mô tả hành vi hệ thống.

Bỏ ngoặc phải cho **một cấp lồng** (`form.setFieldsValue({ active: true })`), và cắt mất vế đầu thì
vế sau phải viết hoa lại.

### Vòng soát thứ ba — quét toàn bộ, không chỉ case user nêu

Hai vòng trước chỉ bắt được **mẫu mình đã biết**. Vòng này quét lưới rộng (từ nói về tài liệu / mã
nguồn + giọng ra lệnh cho người test) trên cả 3131 ô rồi đọc tay theo từng ổ. Bắt thêm:

| Ổ ghi chú | Ví dụ | Xử lý |
|---|---|---|
| Giọng ra lệnh cho người test | *"Phải đo và ghi rõ…"*, *"Lấy nguyên văn thông báo"*, *"Đối chiếu bằng tay"*, *"Chạy để lấy hành vi thật"* | cắt |
| Bình luận về tài liệu | *"HDSD 010 ghi chuỗi khác hẳn…"*, *"(lấy trọn câu kỳ vọng từ sheet)"*, *"theo code hiện tại, không phải lỗi test"* | cắt |
| Tên biến / hằng / class | `handlSearch()`, `PHONE_PATTERN`, `disabled={!isAddNew}`, `LoyaltyErrorCode.OUT_OF_SCOPE`, camelCase | cắt |
| Từ viết tắt nội bộ | `BE` → **Hệ thống** · `FE` → **Giao diện** · `HDSD` → **tài liệu hướng dẫn** | thay |

🔴 **Lỗi `\b` sau chữ có dấu tái phát lần hai** ở `CUE_MANH` mới (`'ghi rõ\b'`). Cùng một lỗi, cùng
một cách hỏng im lặng. 🚫 Đừng bao giờ viết `\b` sau chữ tiếng Việt có dấu trong regex JS.

🔴 **Thứ tự nhánh sai**: nhánh cắt "ghi chú sau dấu gạch ngang" chạy TRƯỚC phép kiểm ghi chú nên
nuốt luôn kết quả — phải kiểm ghi chú trước, cắt đuôi sau.

🔴 **Ba lần cắt nhầm kỳ vọng thật**, đều phát hiện bằng cách so độ dài ô nguồn với ô QC (ô nào rút
>70% thì đọc tay):

1. *"Ghi nhận công nợ giữa Tỉnh và NCC"* — `ghi nhận` trần là **hành vi hệ thống**, không phải lệnh.
   Cue thu hẹp còn `ghi nhận thực tế|hành vi|kết quả`.
2. Bốn ô công thức chiết khấu (`18_2_020_035…039`) bị cắt vì tên biến `expectedOrderDiscount` —
   đã **viết lại bằng lời**: *Ô "Chiết khấu khuyến mãi" = 20.000 + làm tròn((tổng tiền ban đầu −
   20.000) × 5%)*.
3. Mệnh đề kỳ vọng nằm sau một mệnh đề chứa tên biến bị cắt lây (xem mục trên).

### Soát lại toàn bộ — 22/09/2026

**3131 case · 48 CSV + 48 XLSX · mọi file đúng 12 cột.**

| Kiểm | Kết quả |
|---|--:|
| Kỳ vọng rỗng | 0 |
| Ký tự 🔴 / 🚫 | 0 |
| Ô viết không dấu | 0 |
| Tên hàm / biến / file / hằng trong code | 0 |
| Câu ra lệnh cho người test | 0 |
| Bình luận về sheet QC / tài liệu hướng dẫn | 0 |
| Câu bị cắt cụt (kết thúc bằng liên từ) | 0 |

**1414 ô** đã được lọc so với nguồn · **656 câu ghi chú bị cắt** · **272 câu giữ lại** vì là nhấn
mạnh của chính kỳ vọng · **64 ô** là *"Chưa chốt kỳ vọng — ghi nhận thực tế: …"* (case chưa ai chốt
kỳ vọng, 🚫 không phải lỗi chuyển đổi).

Năm ô còn token dạng code là **cố ý giữ**: hai khuôn thông báo UI nguyên văn, hai thông báo lỗi
nguyên văn của hệ thống, một đường dẫn màn hình — QC đối chiếu trực tiếp được.

🔴 **Giới hạn:** đây là quét theo mẫu cộng đọc tay 3 mẫu ngẫu nhiên 25–30 ô và toàn bộ các ô rút
ngắn >70%. Mình **chưa đọc hết 3131 ô**. Ghi chú không dùng từ khoá nào trong danh sách trên vẫn
có thể lọt.
