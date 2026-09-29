# Kịch bản auto test — 04_2 Tồn kho đầu kỳ

- **Bổ sung 18/09/2026:** trace code FE + quét 11 kỹ thuật mục 3.4. **16 → 36 case.**
  Phủ **25/25** case gốc sheet QC. 🚫 Chưa có script.

## 1. Route và component

| Màn hình | Nơi |
|---|---|
| Tồn đầu kỳ | `/inventory/opening-balance` — `pages/warehouse/opening_balance/OpeningBalancePage.jsx` |
| Drawer khai báo (4 bước) | `pages/warehouse/opening_balance/DrawerOpeningBalance.jsx` |

Lối vào thứ hai: wizard **Thiết lập điểm bán** ở phân hệ `01` (`01_090_003` `01_090_004`) mở đúng
màn này ở tab mới.

## 2. Cấu trúc file Excel và ràng buộc — lấy nguyên văn từ khối hướng dẫn trong code

Cột: **Mã điểm bán / kho · SKU · Tên SP · Tên biến thể · Đơn vị · Mã lô · Serial · Số lượng · Giá vốn
· Ghi chú · Hạn sử dụng**.

| Ràng buộc | Nội dung |
|---|---|
| Nhiều điểm bán trong 1 file | điền `shop_code` ở cột *Mã điểm bán / kho*; **bỏ trống = điểm bán mặc định đang chọn** |
| Mã lô | **FIFO / Đích danh bắt buộc nhập**; **MAC / Tiêu chuẩn bỏ trống thì hệ thống tự sinh** |
| Serial | sản phẩm đích danh có yêu cầu serial phải nhập đủ, **cách nhau dấu phẩy** và **bằng số lượng đơn vị chính** |
| Hạn sử dụng | không bắt buộc, định dạng `dd/mm/yyyy` |
| Định dạng file | chỉ `.xlsx`, `.xls`, **một file mỗi lần** (`maxCount={1}`) |

## 3. Trạng thái — hai tầng, 🚫 đừng lẫn

| Tầng | Giá trị |
|---|---|
| **Lượt khai báo** (bảng ngoài) | Chờ xử lý · Đang xử lý · **Chờ xác nhận** · Đã xác nhận · Thất bại |
| **Từng dòng** (bản xem trước) | Hợp lệ · Lỗi · **Cảnh báo** |

🔴 Lượt ở **Chờ xác nhận** là dữ liệu **CHƯA vào tồn kho** (`04_2_030_003`). Chỉ "Đã xác nhận" mới ghi
tồn. 🔴 Trạng thái dòng **Cảnh báo** có trong code (bộ lọc 4 lựa chọn) nhưng **tài liệu không nói nó
là gì và có được ghi vào tồn hay không**.

## 4. Thông báo nguyên văn

`Đã xử lý xong file. Vui lòng kiểm tra danh sách.` · `Đã cập nhật dòng` · `Đã xóa` ·
`Bản xem trước chưa ở trạng thái chờ xác nhận.` · `Còn <N> dòng lỗi. Vui lòng xóa hoặc sửa lại file.` ·
`Đã tạo phiếu nhập tồn đầu kỳ thành công` · `Đã hủy bản xem trước hiện tại`

Hộp thoại: `Xóa dòng này khỏi bản xem trước?` · `Xác nhận tạo phiếu nhập tồn đầu kỳ?` ·
`Tải lên file excel mới?`

## 5. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 18 |
| `BLOCKED` | 18 |

Tỉ lệ BLOCKED cao vì **mỗi sản phẩm/biến thể chỉ khai tồn đầu kỳ được MỘT LẦN tại một kho** — case ghi
đã confirm một sản phẩm thì không chạy lại được với chính sản phẩm đó, và phần lớn case cần fixture Excel
chưa có. Điểm bán thì khai nhiều lần được, miễn không trùng sản phẩm đã khai hoặc đã có phiếu nhập.

## 6. Case ghi dữ liệu — 🔴 10 case

🔴 **Khai báo tồn đầu kỳ ghi thẳng vào tồn kho và CỘNG DỒN với tồn cũ** (`FUNC_1_105`) — chạy nhầm là
thổi số tồn, không hoàn tác được bằng UI, và kéo theo sai giá vốn bình quân.

## 7. Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | 🔴 **`FUNC_1_109` kỳ vọng CỤT**: *"Hiển thị Mã lô đã tồn tại:"* — chưa rõ **chặn** hay **cộng dồn vào lô có sẵn**. Mã lô là khoá của lô hàng, hai nghiệp vụ này khác nhau hoàn toàn. |
| 2 | 🔴 **`FUNC_1_102`** đòi vô hiệu nút *Tải mẫu excel* + *Khai báo tồn kho đầu kỳ* và hiện chữ *"Đã khai báo tồn kho đầu kỳ"*. Grep code **không thấy** chuỗi đó; phép chặn hiện nằm ở bước tạo phiếu. |
| 3 | 🔴 **Trạng thái dòng "Cảnh báo" không có đặc tả** — không biết nó là gì và có được ghi vào tồn hay không. (Mục này đã có trong bàn giao trước, vẫn chưa được trả lời.) |
| 4 | **Không có ngưỡng dung lượng / số dòng tối đa** cho file Excel ⇒ `04_2_020_023` (file lớn) chưa có biên để kiểm. |
| 5 | **Ô tổng hợp không đổi theo bộ tìm kiếm** trong bản xem trước — cần xác nhận đây là ý định (tổng trên toàn bản) chứ không phải lỗi. |

## 8. Việc còn lại

1. Dựng fixture Excel: file hợp lệ · file có dòng lỗi · file rỗng · file ≥1.000 dòng · file đủ 4
   phương pháp tính giá · file trùng mã lô.
2. Chuẩn bị **sản phẩm chưa khai tồn đầu kỳ** ở điểm bán seed cho nhóm case ghi (mỗi sản phẩm/biến thể
   dùng được một lần tại một kho; bộ seed bước 8 đã khai SP chính, FIFO, Giá tiêu chuẩn).
3. Trình user mục 7.

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/04_2_ton_kho_dau_ky/playwright.config.js
```

Script: `tests/opening-page.js` · `tests/excel-fixture.js` + `ton-dau-ky.shop.spec.js` ·
`tra-cuu-luot.province.spec.js`. **36/36 case có script.**

| Nhóm | Số case |
|---|--:|
| **Đã chạy và ĐẠT** | **7** |
| Đã chạy và hỏng | 0 |
| **Chưa chạy** | 29 |

### 🔴 PHÁT HIỆN 1 — nạp tệp TẠO LƯỢT KHAI BÁO THẬT, không phải thao tác chỉ đọc

`POST /opening-balance/uploads` sinh ngay một **lượt khai báo** hiện trên danh sách (trạng thái
*Chờ xác nhận*), dù chưa chạm tồn kho. Bốn case `020_010` `020_015` `020_016` `020_024` trước đây
phân loại là **đọc** ⇒ đã sửa `test-input.json` thành `mutates: true, allowMutation: false`.

⚠️ **Rác do chính phiên chạy này tạo, cần user xử lý:** điểm bán **Lý Sơn** có **1 lượt khai báo**
lúc **20/09/2026 11:48** (1 dòng · 0 hợp lệ · 1 lỗi · *Chờ xác nhận*). 🔴 Tồn kho **KHÔNG** bị ảnh
hưởng: `confirm` bị chặn ở tầng mạng và lượt đó 0 dòng hợp lệ. Lượt này còn **chặn bước 1 của
drawer** nên `04_2_010_002` sẽ skip cho tới khi được dọn.

### 🔴 PHÁT HIỆN 2 — tệp `.txt` vẫn được gửi lên server

Ô chọn tệp khai đúng `accept=".xlsx,.xls"`, nhưng `accept` **chỉ lọc hộp chọn file của trình duyệt**;
kéo–thả và thao tác máy đều đi vòng qua nó. Đo: tệp `.txt` được gửi tới `POST /opening-balance/uploads`
(auto test chặn lại nên 🚫 không sinh lượt rác), và **không có thông báo nào trên màn**. Phép chặn
thật phải nằm ở `beforeUpload`. Case `04_2_020_015` giữ nguyên kỳ vọng.

### 🔴 PHÁT HIỆN 3 — nút "Tải mẫu excel" ngoài màn KHÔNG tải gì

`OpeningBalancePage.jsx:592`: nút này dùng **đúng handler** với nút "Khai báo tồn đầu kỳ"
(`setSelectedPreview(null); setOpenDrawer(true)`) — bấm chỉ mở drawer. Nút tải thật nằm ở **bước 1
bên trong drawer** và gọi `GET /opening-balance/template` (tệp `mau_nhap_ton_dau_ky.xlsx`).

### Ghi chú môi trường

- Vai `shop` **không có** ô *"Lọc theo Kho / Điểm bán"* (chỉ một kho) ⇒ kiểm ô đó ở vai `province`.
- Một `.ant-alert` hướng dẫn nằm đè vùng nút ⇒ mọi cú bấm ở màn này phải `click({ force: true })`.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `04_2_020_014` | Mã lô đã tồn tại | Chưa rõ | 🔴 Sheet QC `FUNC_1_109` chỉ ghi kỳ vọng dở dang là "Hiển thị Mã lô đã tồn tại:" — chưa rõ là CHẶN hay CỘNG DỒN vào lô đó. Cần đo rồi user chốt: mã lô là khoá của lô hàng, cộng dồn vào lô có sẵn và chặn hẳn là hai nghiệp… |

**1/36 case** của phân hệ này chưa chốt được kỳ vọng.
