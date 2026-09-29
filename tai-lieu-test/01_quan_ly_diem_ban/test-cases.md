# Kịch bản auto test — 01 Quản lý điểm bán

- Dựng lần đầu từ `resource/hdsd/hdsd01_quan_ly_diem_ban/` (8 task) + sheet QC `uat_vnpost_quan_ly_diem_ban_hub.csv`.
- **Bổ sung 18/09/2026:** quét đủ 11 kỹ thuật thiết kế test (mục 3.4 skill `test-scenario`) và trace lại
  toàn bộ route/API/nhãn từ code FE. **74 → 134 case.**
- Script hiện có: **71** case (theo `tool/bin/checklist.js` — đếm mã ở ĐẦU title `test()`; 2 mã nữa chỉ xuất hiện trong thân spec nên không tính) ở `tests/` (16 file). 60 case mới **chưa có script**.

## 1. Route và API — trace từ code, 🚫 không chép tài liệu

| Màn hình | Route / component |
|---|---|
| Danh sách điểm bán | `/chain/shop-management` — `features/chain/pages/shopManagement/ShopManagement.jsx` |
| Thêm / Sửa điểm bán–hub | drawer `components/DrawerCreateShop.jsx` (**một component dùng cho cả thêm và sửa**, phân biệt bằng prop `record`) |
| Chi tiết điểm bán | drawer `components/DrawerDetailShop.jsx` |
| Gắn nhân viên | drawer `components/DrawerAssignEmployee.jsx` |
| Thiết lập điểm bán (wizard 3 bước) | drawer `components/DrawerShopSetup.jsx` |
| Nhập Excel | drawer `components/DrawerImportExcel.jsx` trên nền `@components/importExcelDrawer/DrawerImportBase.jsx` |

| Việc | Method + URL | Nơi khai |
|---|---|---|
| Danh sách | `GET /shops/profile/chain` | `features/shop/services/shopApi.js` |
| Chi tiết | `GET /shops/profile/detail` | `shopApi.js` |
| Thêm | `POST /shops/profile` | `shopApi.js` `addShop` |
| Sửa | `PUT /shops/profile/{shopId}` (`params.appId = SSHOP`) | `shopApi.js` `updateShopOrHub` |
| Xoá / tạm ngừng | `DELETE /shops/profile/delete/v2` (header `shopId`) | `shopEndpoints.js` `SHOP_UPDATE_STATUS` |
| Đổi trạng thái hoạt động | `PUT /shops/profile/{shopId}/status/{status}` | `shopEndpoints.js` `SHOP_UPDATE_OPERATING_STATUS` |
| Nhập Excel | `POST /import/api/v1/shops/excel` | 🔴 prefix `/import` — **import-service**, không phải core |
| Trạng thái job nhập | `GET /import/api/v1/shops/status` | |
| Lịch sử nhập | `GET /import/api/v1/shops/history` | |
| File lỗi | `GET /import/api/v1/shops/error-file` (blob) | |

## 2. Ô nhập của form Thêm/Sửa — đo từ code, KHÁC tài liệu HDSD

| Ô | `name` | Bắt buộc | Ràng buộc thật |
|---|---|---|---|
| Cấp | `orgLevel` | ✅ (chỉ khi thêm) | radio; chọn xong mới hiện phần còn lại của form |
| Phân loại | `type` | ✅ | radio; `disabled` khi sửa |
| Trạng thái | `status` | — | **chỉ có ở form Sửa** |
| Mã điểm bán / Mã Hub | `shopCode` | ✅ | `maxLength=50`, `disabled` khi sửa |
| Tên điểm bán / Tên Hub | `shopName` | ✅ | `maxLength=200` |
| Loại hình điểm bán | `distributionMethod` | ✅ | multi-select; **ẩn khi Phân loại = Hub** |
| Bưu điện tỉnh/thành phố | `orgProvinceCode` | ✅ | ẩn ở cấp Tổng công ty |
| Bưu điện xã/phường | `orgWardCode` | ✅ | phụ thuộc Bưu điện tỉnh |
| Email | `email` | 🔴 ✅ | `type: email` — **HDSD không khai ô này bắt buộc** |
| Số điện thoại | `shopPhone` | 🔴 ✅ | `PHONE_PATTERN` — **HDSD không khai** |
| SĐT người quản lý | `managerPhone` | — | `PHONE_PATTERN` nếu có nhập |
| Địa chỉ chi tiết | `address` | — | |
| Tỉnh/TP · Xã/Phường | `province` · `ward` | 🔴 — | **KHÔNG bắt buộc**; chọn Tỉnh thì `ward` bị reset |
| Vĩ độ | `shopLat` | — | số trong `[-90, 90]` |
| Kinh độ | `shopLong` | — | số trong `[-180, 180]` |

⇒ Form có **7 ô bắt buộc** cho Pos mini/plus (Cấp, Phân loại, Mã, Tên, Loại hình, Bưu điện tỉnh,
Bưu điện xã) **+ Email + SĐT = 9**. Bộ case cũ chỉ có 2 case bỏ trống ô bắt buộc — đúng dấu hiệu
thiếu quét của "luật rẻ tiền" mục 3.4. Nay đủ 9 case riêng lẻ + 1 case bỏ trống tất cả.

## 3. Vai

`tct` cho mặc định (README mục 8: vai `province` **không có** nút Gắn nhân viên nên không dùng để
kiểm hành vi Hub). `province` cho 3 case phạm vi dữ liệu và phạm vi quyền: `01_010_014`,
`01_010_016`, `01_010_028`.

## 4. Phân loại độ sẵn sàng

| Nhãn | Số case | Ở đâu |
|---|--:|---|
| `READY` | 71 | đã có `test()` trong `tests/` |
| `READY_WITH_CODE_LOOKUP` | 48 | case mới, route/API/nhãn đã trace ở mục 1–2, còn thiếu locator |
| `BLOCKED` | 15 | `enabled:false` + `_blocked` trong `test-input.json` |

Nhóm `BLOCKED` chia hai loại, 🚫 không gộp:

1. **Kỳ vọng chưa chốt** (8 case): `01_010_019` `01_010_022` `01_020_023` `01_020_024` `01_020_032`
   `01_020_033` `01_040_009` `01_080_006`. Đây là case *phơi hành vi thật* — phải đo trước rồi mới
   viết assert. 🚫 Không hạ kỳ vọng thành "màn hình không báo lỗi".
2. **Thiếu dữ liệu nền** (7 case): toàn bộ nhóm wizard cần điểm bán ở trạng thái
   đặc biệt (`01_090_002` `01_090_004` `01_090_006` `01_090_007` `01_090_008` `01_090_011`
   `01_090_013`). Mỗi case đã ghi rõ thiếu **cái gì** trong `_blocked`.

## 5. Case ghi dữ liệu — 🔴 38 case, chưa ai được phép chạy

Toàn bộ 38 case `mutates:true` đang `allowMutation:false`. `.env.domain` trỏ **dữ liệu thật**.

- **Tạo / sửa điểm bán** (`01_020_*`, `01_030_*`): mỗi lần chạy để lại một điểm bán rác trong cây tổ
  chức, và điểm bán rác kéo theo phân công nhân viên rác.
- **Tạm ngừng / khôi phục** (`01_040_003` `005` `006` `007` `008` `009` `010`): tạm ngừng một điểm bán
  đang hoạt động là nhân viên ở đó **không mở được ca bán hàng**.
- **Gắn nhân viên / thôi việc** (`01_050_*`, `01_060_*`): ghi vào phân công thật, ảnh hưởng phân quyền
  của người thật.
- **Nhập Excel** (`01_070_002` `003` `008` `009` `010` `012`): job chạy ngầm ở import-service, đóng màn
  hình **không dừng** được.
- 🔴 **Wizard Thiết lập điểm bán** (`01_090_004` `012` `013`): bước 1 ghi **TỒN KHO ĐẦU KỲ**, bước 3
  ghi **LỊCH LÀM VIỆC**. Đây là nhóm nặng nhất của phân hệ.

## 6. Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | 🔴 **Email và Số điện thoại là ô bắt buộc trong code nhưng HDSD 020 không khai.** Người dùng đọc HDSD sẽ không biết phải chuẩn bị hai thông tin này. |
| 2 | 🔴 **HDSD 020 bước 5 nói "Mã và tên không được trùng"; code FE chỉ ràng buộc `required`** — không có rule duy nhất cho tên. Đã dựng `01_020_033` để phơi hành vi thật. |
| 3 | 🔴 **Sheet QC `DIEMBAN__11` (và case `01_020_001` dựng theo nó) nói mã điểm bán TỰ SINH dạng `DBxxxxx`; code bắt người dùng TỰ NHẬP** `shopCode` (ô bắt buộc, `maxLength=50`). Một trong hai sai — cần user chốt. |
| 4 | **Không ô nào trong form bị trim khoảng trắng.** Tên và Mã nhập toàn dấu cách vẫn qua được validate FE. |
| 5 | **Tỉnh/TP và Xã/Phường (địa chỉ hành chính) không bắt buộc** trong code, trong khi case gốc `FUNC_THUMUC__47` (đã chuyển sang phân hệ `32`) đòi bắt buộc. |
| 6 | 🔴 **Cột Hành động chỉ gác theo `permKey`, không gác theo trạng thái điểm bán.** Chưa có đặc tả nói thao tác nào bị chặn trên điểm bán Ngừng hoạt động ⇒ `01_040_009` là case đo, chưa phải case chặn. |
| 7 | **Cờ "Là cửa hàng mẫu" và dropdown "Cửa hàng mẫu" đã bị comment out** (`DrawerCreateShop.jsx:604`, `DrawerDetailShop.jsx:148-153`) — không còn UI. Các case gốc dựa vào cờ này (`dong64`, `FUNC_THUMUC__52`) không test được ở bản hiện tại. |
| 8 | **Không có ngưỡng dung lượng file** cho bước nhập Excel và bước tồn đầu kỳ ⇒ chưa viết được case biên kích thước file. |

## 7. Việc còn lại

1. Viết script cho 48 case `READY_WITH_CODE_LOOKUP` (skill `auto-test`).
2. Đo 8 case *phơi hành vi thật* rồi chốt kỳ vọng, chuyển khỏi `BLOCKED`.
3. Chuẩn bị dữ liệu nền cho nhóm wizard `01_090_*` (điểm bán chưa khai ca / toàn bộ nhân viên đã nghỉ
   / đã xếp lịch hết) và điền mã vào `test-input.json` (`data.shopCode`).
4. Trình user 8 mục ở phần 6.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `01_010_019` | Tìm kiếm bằng từ khoá toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Hệ thống KHÔNG báo lỗi đỏ; bảng trả về như khi bỏ trống từ khoá (keyword bị coi là rỗng) HOẶC trả trạng thái rỗng "Không có dữ liệu". 🔴 Ghi lại hành vi thật: FE không trim keyword trước khi gửi (ShopManagement.jsx handl… |
| `01_010_022` | Tìm kiếm bằng từ khoá KHÔNG DẤU | Chờ chạy để lấy hành vi thật | 🔴 Ghi lại hành vi thật: nếu backend có chuẩn hoá dấu thì phải trả về điểm bán đó; nếu không thì trả rỗng. Kỳ vọng chốt sau khi đo — 🚫 không đoán, vì dữ liệu VNPost trộn Anh–Việt. |
| `01_080_006` | Xuất Excel khi danh sách đang rỗng | Chờ chạy để lấy hành vi thật | 🔴 Ghi lại hành vi thật: hệ thống nên chặn kèm thông báo "Không có dữ liệu để xuất" thay vì sinh file chỉ có dòng tiêu đề. Kỳ vọng chốt sau khi đo. |

**3/134 case** của phân hệ này chưa chốt được kỳ vọng.
