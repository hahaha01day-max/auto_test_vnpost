# Kịch bản auto test — 19 Quản lý khách hàng

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd19_quan_ly_khach_hang/tasks/*.md` (11 task)
- 🚫 Chưa viết script.

## 1. Route

| Màn hình | Route |
|---|---|
| `CUSTOMER_MANAGEMENT` | `/customer` |
| `CUSTOMER_DETAIL` | `/customer/detail/:customerId` |

## 2. Vai

10/11 task khai đủ 4 cấp. Task 050 (ngừng / xoá) **bỏ `DIEM_BAN`** ⇒ `19_050_005` dựng để bắt đúng
ranh giới này. `19_010_002` và `19_PQ_001` kiểm phạm vi dữ liệu của `gdv`.

## 3. Phân loại

> 🔄 **Cập nhật 19/09/2026** — bổ sung 42 case: phủ nốt **32 case gốc** sheet QC (gồm cả nhóm
> `REALTIME__1`–`6`, `dong22`, `dong23` về nâng hạng realtime) cộng 10 case quét kỹ thuật mục 3.4.
> Tổng **70 case** (trước: 28). Độ phủ sheet QC **14/46 → 46/46**.

| Nhãn | Số case |
|---|--:|
| `READY` | 14 |
| `READY_WITH_CODE_LOOKUP` | 12 |
| `BLOCKED` | 44 |

🔴 **32/70 case `mutates`** — cao vì nhóm `020` (thêm khách), `030` (sửa khách) và `130` (nâng hạng)
đều ghi dữ liệu thật. Tất cả `allowMutation: false`.

### 3b. Thông báo nguyên văn — trace 19/09/2026

| Nguyên văn | Ở đâu | Case |
|---|---|---|
| `Khách hàng không tồn tại` | `pages/customer/customerDetail/index.jsx:77,88` | `010_008` |
| `Số tiền phải lớn hơn 0` | `pages/customer/customerDebt/` | `090_005` |
| `Vui lòng nhập số tiền thanh toán lớn hơn 0` | `pages/customer/customerDebt/` | `090_006` |
| `Ảnh up không được vượt quá giới hạn 800Kb!` | `pages/customer/` | `120_006` |
| `Bạn chỉ có thể tải lên file có định dạng image!` | `pages/customer/` | `120_007` |
| `Vui lòng kiểm tra lại thông tin khách hàng` | `components/addAndUpdateCustomer/` | form thêm/sửa |
| `Làm mới điểm khách hàng thành công` | `pages/customer/` | — chưa dùng |
| `Không thể lấy thông tin khách hàng` | `pages/customer/` | — chưa dùng |

⚠️ **Hai thông báo tiền khác nhau cho cùng một loại lỗi:** `Số tiền phải lớn hơn 0` (ghi nợ) và
`Vui lòng nhập số tiền thanh toán lớn hơn 0` (thanh toán) — cùng file, cùng ý. Script phải chép
đúng câu của đúng luồng.

⚠️ Route chốt lại từ code: `config.jsx:207` `CUSTOMER_MANAGEMENT = "/customer"`,
`config.jsx:211` `CUSTOMER_MANAGEMENT_DETAIL = "/customer/detail/:customerId"`;
khai ở `routes/configs/dashboard/customerRoutes.js:8-19`, component
`pages/customer/index.jsx` và `pages/customer/customerDetail/index.jsx`.

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`19_020_001` · `19_020_003` · `19_030_001` · `19_030_002` · `19_050_001` · `19_050_002`
· `19_050_003` · `19_050_004` · `19_090_001` · `19_100_001`

🔴 **Hai case nguy hiểm nhất:**
- `19_050_004` **xoá khách hàng** — HDSD nói thẳng *"không thể hoàn tác"*.
- `19_090_001` **tạo phiếu thu thật trong sổ quỹ**, không chỉ ghi giảm nợ trên hồ sơ. Chọn sai quỹ thu
  hoặc sai nhân viên tạo phiếu là **sai luôn số liệu quỹ**.

⚠️ `19_030_001` có tác dụng phụ HDSD nêu rõ: thông tin sửa **đồng bộ sang đơn hàng đang mở** của khách.
Sửa đúng lúc giao dịch viên khác đang lập đơn là đơn đó đổi theo.

## 5. Lỗ hổng đặc tả

- Task 020 và 030 nói *"hệ thống báo lỗi"* khi trùng số điện thoại nhưng **không ghi nguyên văn**.
- Task 100 không nói **giới hạn kích thước tệp** nhập Excel, cũng không nói hành vi của
  **"Dừng lại khi có lỗi"** khi bỏ tích. Chưa dựng case cho công tắc này.

### 🔄 Bổ sung 19/09/2026

- 🔴 **Sheet QC `FUNC_KHACHHANG__35` chốt cứng nội dung popup xoá** là
  *"Hành động này sẽ..."*. Grep toàn repo: chuỗi `Hành động này sẽ không thể hoàn tác, bạn có chắc
  chắn muốn xóa?` chỉ có ở `features/order/pages/orderDetail/OrderDetail.jsx:1080` — **màn đơn hàng,
  không phải màn khách hàng**. Các chỗ khác dùng `Hành động này không thể hoàn tác` (không có chữ
  "sẽ"). ⇒ `050_007` để kỳ vọng *"ghi lại nguyên văn"*, 🚫 không chốt chuỗi sheet QC đưa ra.
- 🔴 **Nhóm nâng hạng realtime (`130_003`–`130_008`) là loại không hoàn tác được.** Nâng hạng khách
  hàng không có đường hạ lại; chạy nhầm là sai hạng của một khách thật, kéo theo sai ưu đãi họ
  được hưởng. Toàn bộ `BLOCKED`.
- 🔴 **`REALTIME__5` là case ÂM** (đơn nháp thì **không** được nâng hạng) — loại case "chặn" mà
  skill nói quý hơn case chạy trôi. Giữ nguyên hướng kỳ vọng âm, 🚫 đừng đổi thành "nâng hạng thành công".
- ⚠️ **`dong22` / `dong23` không có cột kỳ vọng trong sheet** (ô để trống). Kỳ vọng của `130_007`,
  `130_008` **suy từ `REALTIME__3`** (cùng nghiệp vụ, khác phương thức thanh toán) — cần QC xác nhận.
- ⚠️ **Nhóm nâng hạng nằm giữa hai phân hệ**: điều kiện hạng thuộc `20_khach_hang_than_thiet`
  (đã làm, 104 case), còn thời điểm kích hoạt lại nằm ở luồng thanh toán `18_3`. Case `130_*`
  đặt ở đây theo ánh xạ sheet QC, nhưng khi viết script phải dùng dữ liệu nền của cả ba phân hệ.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `19_020_007` | Bỏ trống Tên khách hàng khi thêm mới | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi ở ô Tên khách hàng |
| `19_020_008` | Bỏ trống Số điện thoại khi thêm mới | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi ở ô Số điện thoại |
| `19_020_009` | Thêm khách hàng với số điện thoại sai định dạng | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi định dạng |
| `19_020_010` | Thêm khách hàng với email sai định dạng | Thiếu nguyên văn thông báo | Bị chặn, không tạo khách. Ghi lại nguyên văn thông báo lỗi định dạng email |
| `19_020_011` | Số điện thoại toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Bị chặn như bỏ trống, KHÔNG được coi là đã nhập. Ghi lại hành vi thật |
| `19_020_012` | Tên khách hàng có khoảng trắng đầu cuối | Chờ chạy để lấy hành vi thật | Tên được cắt khoảng trắng thừa (trim). Ghi lại hành vi thật nếu không trim |
| `19_010_005` | Danh sách khách hàng khi chưa có khách nào | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `19_060_003` | Tab Đơn hàng khi khách chưa có đơn nào | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `19_090_004` | Bấm Thanh toán khi chưa chọn đơn hàng nào | Thiếu nguyên văn thông báo | Bị chặn. Ghi lại nguyên văn thông báo yêu cầu chọn đơn hàng |
| `19_030_004` | Chỉnh sửa bỏ trống Tên khách hàng | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi |
| `19_030_005` | Chỉnh sửa bỏ trống Số điện thoại | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi |
| `19_030_006` | Chỉnh sửa nhập email sai định dạng | Thiếu nguyên văn thông báo | Bị chặn, không lưu. Ghi lại nguyên văn thông báo lỗi định dạng email |
| `19_050_007` | Nội dung popup xác nhận xoá khách hàng | Thiếu nguyên văn thông báo | Ghi lại nguyên văn nội dung popup. Sheet QC đòi chuỗi bắt đầu bằng "Hành động này sẽ" — cần đối chiếu với chuỗi thật trong code |
| `19_130_006` | Nâng hạng realtime khi thanh toán trả góp | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: hạng nâng theo phần đã trả hay chờ tất toán |
| `19_120_002` | Tìm khách bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ khách. Ghi lại hành vi thật |
| `19_120_003` | Tìm khách không dấu ra khách có dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra khách tên có dấu hay không |
| `19_120_004` | Tìm khách bằng chuỗi toàn khoảng trắng | Chờ chạy để lấy hành vi thật | Coi như không lọc hoặc trả rỗng, không lỗi. Ghi lại hành vi thật |

**17/70 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/19_quan_ly_khach_hang/playwright.config.js
```

**18 đạt · 5 hỏng (giữ đỏ có chủ ý) · 47 chưa chạy.**

### Màn thật — đo từ DOM

| Vai | API danh sách | Số khách thấy được | Nút ở `extra` |
|---|---|--:|---|
| `gdv` | `GET /__api/chain-customer/get-all-in-chain-and-shop/<chainId>?shopId=…` | **10.236** | chỉ `Xuất Excel` |
| `province` | `GET /__api/chain-customers/get-all-by-chain` | **0** | `Xuất Excel` · `Nhập Excel` · `Thêm khách hàng` |

Cột bảng (cả hai vai): `# · Mã khách hàng · Tên khách hàng · Số điện thoại · Giới tính · Ngày sinh · Địa chỉ`.
Ô tìm kiếm **tự lọc khi ngừng gõ**, 🚫 không cần Enter. Tên khách là `<a href="/customer/detail/:id">`
nằm **trong** ô — bấm vào ô không điều hướng.

### 🔴 Đã chạy và HỎNG — cần user quyết, 🚫 chưa sửa gì

| Case | Đo được | Phân loại |
|---|---|---|
| `19_120_002` | Gõ `%_` vào ô tìm ⇒ vẫn trả **đúng 10.236 khách** như khi không lọc. Ký tự đại diện SQL lọt xuống backend mà không được escape (hoặc từ khoá bị bỏ qua) | **Lỗi sản phẩm** — người dùng gõ nhầm `%` tưởng đã lọc |
| `19_050_005` | Vai `gdv` (điểm bán) **thấy 1 nút "Ngừng hoạt động"** trên chi tiết khách; kịch bản nói cấp điểm bán không được ngừng hoạt động khách | **Lệch quyền** |
| `19_020_006` | Vai `gdv` **KHÔNG có nút "Thêm khách hàng"** (chỉ `Xuất Excel`), trong khi vai tỉnh có đủ 3 nút. Kịch bản khai case thêm khách cho vai gdv | **Lệch quyền / lệch đặc tả** |
| `19_010_003` | Màn **không có nút "Tùy chỉnh cột hiển thị"** ở bất kỳ vai nào ⇒ 🚫 không bật được cột `Nợ cần thu hiện tại` | **Lệch đặc tả** |
| `19_120_005` | Vai tỉnh thấy **0 ô lọc**; kịch bản đòi 4 ô `Trạng thái · Loại khách hàng · Nhóm khách hàng · Chi nhánh/điểm bán` cho cấp trên điểm bán | **Lệch đặc tả** |

### 🔴 Nghi vấn phạm vi — ghi lại để đối chiếu dữ liệu

`19_PQ_001` **đạt** ở phần kiểm được: request của vai điểm bán có mang `shopId`. Nhưng endpoint tên
`get-all-in-chain-and-shop` trả **10.236 khách cho một điểm bán**, trong khi vai **tỉnh** — cấp cao
hơn — chỉ thấy **0 khách**. Con số này 🚫 không chứng minh được phạm vi đúng hay sai từ giao diện;
cần đối chiếu với dữ liệu thật của điểm bán trước khi kết luận.

### Đã chạy và đạt (trích)

`19_010_001` tự lọc + quay về trang đầu · `19_010_002` cấp điểm bán không có 4 ô lọc ·
`19_010_005` trạng thái rỗng · `19_010_007` mở đúng `/customer/detail/:id` · `19_120_001` phân trang ·
`19_120_003` tìm không dấu ra khách có dấu · `19_120_004` chuỗi trắng không lỗi ·
`19_110_001`/`19_110_003` hộp xuất Excel · `19_050_006`/`19_050_007` popup xoá (nguyên văn:
*"Hành động này sẽ không thể hoàn tác, bạn có chắc chắn muốn xóa?"*) · `19_090_004` chặn thanh toán
khi chưa chọn đơn · `19_060_003` tab Đơn hàng rỗng · `19_030_003` huỷ sửa không lưu.

### Chưa chạy — có lý do

47 lượt: `mutates` (thêm/sửa/xoá khách, ghi nợ, thanh toán công nợ, nhập Excel) hoặc thiếu tiền
điều kiện — lý do nguyên văn trong `test-input.json`, spec skip kèm lý do đó.
