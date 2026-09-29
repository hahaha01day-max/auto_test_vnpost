# Kịch bản auto test — 33 Lịch sử thao tác người dùng

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd33_lich_su_thao_tac_nguoi_dung/tasks/*.md` (5 task)
- 🚫 Chưa viết script.

## 1. Route

| Màn hình | Route |
|---|---|
| Lịch sử người dùng | `/chain/user-action-history` |
| Khối nhật ký trên Trang chủ | `/` |

## 2. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 3 |
| `BLOCKED` | 5 |

**Lý do BLOCKED:** cần **thao tác sửa dữ liệu có sẵn** trong nhật ký để mở chi tiết và đối chiếu
trước–sau. Dựng dữ liệu đó nghĩa là phải sửa dữ liệu thật ở phân hệ khác.

⭐ **Đây là phân hệ chỉ đọc duy nhất trong đợt này không có case ghi nào** — an toàn nhất để viết
script trước, nếu môi trường đã sẵn nhật ký.

## 3. Case ghi dữ liệu

**Không có.**

## 4. Lỗ hổng đặc tả

- Không task nào nói **nhật ký giữ bao lâu** (có xoá theo thời gian không?).
- Không nói **thao tác nào được ghi nhật ký** — chỉ nói "thao tác đã thay đổi dữ liệu". Không có danh
  sách thì không kiểm được **thiếu sót ghi nhật ký**, mà đó mới là lỗi đáng sợ của phân hệ này.

---

## 🔄 Cập nhật 19/09/2026 — hoàn thiện tài liệu

CSV nâng từ **5 cột lên 7 cột** (thêm `Ma goc`, `Nguon`) — trước đây thuộc "Nhóm B" mục 5b của
handoff. Sheet QC **không phủ** phân hệ này nên mọi `Ma goc` để trống đúng luật.

Bổ sung **16 case** (8 → **24**), từ bảng trường HDSD `90_tra_cuu_truong.md` + trace code +
quét kỹ thuật mục 3.4.

| Nhãn | Case |
|---|--:|
| `READY` | 11 |
| `READY_WITH_CODE_LOOKUP` | 4 |
| `BLOCKED` | 9 |

Chỉ **1 case `mutates`** (`010_005` — phải sinh một thao tác thật để đo timezone), `allowMutation: false`.

## Trace — 19/09/2026

### Route

`/chain/user-action-history` — `config.jsx:375` (`CHAIN_USER_ACTION_HISTORY`).
Khai ở `routes/configs/dashboard/chainRoutes.js:64-72`, nhãn menu **`Lịch sử người dùng`**,
component `UserActionHistoryPage`.

🔴 **Quyền vào màn:** `routesPermission.js:366` đòi `shop_private_permission` **hoặc**
`manage_price_policy`. Đây là căn cứ của case `070_001`.

⚠️ **`/employee/activity` (`config.jsx:217`, `EMPLOYEE_ACTIVITY`) là màn KHÁC và đang bị comment
out** ở `employeeRoutes.js:57-62`. 🚫 Đừng nhầm hai màn — component `pages/employee/employeeActivities/`
thuộc màn đã tắt đó, không phải màn đang test.

### Nhãn — từ HDSD `90_tra_cuu_truong.md`

**9 cột bảng:** `STT` · `Nhóm nghiệp vụ` · `Hành động` · `Người thao tác` · `Vai trò` · `Đơn vị` ·
`IP` · `Thời gian` · cột hành động cuối (biểu tượng Xem chi tiết, **ghim bên phải**).

**4 ô lọc:** `Tìm theo tên người thao tác` (tự lọc sau khi ngừng gõ, có dấu nhân xoá nhanh) ·
`Nhóm nghiệp vụ` (15 giá trị) · `Hành động` (9 giá trị) · `Từ ngày` – `Đến ngày`.

Quy tắc hiển thị đáng chú ý: **không tra được tên thì hiện `---`**, mã nhân viên vẫn giữ.
**STT đánh số theo TRANG HIỆN TẠI**, không phải số thứ tự tuyệt đối — `060_002` kiểm điểm này.

### 🔴 Lỗ hổng đặc tả

1. **HDSD chốt 15 nhóm nghiệp vụ và 9 hành động nhưng chưa đối chiếu với code.** `020_003` và
   `020_004` để kỳ vọng *"ghi lại nguyên văn nếu code khác"* — cùng dạng sai sót đã gặp ở `18_4`
   (HDSD 12 cột / code 15) và `14_1` (HDSD 7 cột / code 11). Khả năng cao là lệch.
2. ⚠️ **Timezone.** `010_005` kiểm giờ hiển thị. Nhắc lại quy ước dự án: hệ thống lưu DATETIME
   **naive +7** còn DB server chạy UTC. Nếu màn này hiển thị lệch 7 tiếng thì đó là lỗi thật,
   🚫 đừng sửa kỳ vọng cho khớp.
3. **HDSD không nói lịch sử được giữ bao lâu** — không có case nào kiểm được việc dọn log cũ.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `33_020_003` | Ô lọc Nhóm nghiệp vụ có đủ 15 giá trị | Thiếu nguyên văn thông báo | Danh sách có đúng 15 nhóm nghiệp vụ theo HDSD. Ghi lại nguyên văn nếu code khác |
| `33_020_004` | Ô lọc Hành động có đủ 9 giá trị | Thiếu nguyên văn thông báo | Danh sách có đúng 9 hành động theo HDSD. Ghi lại nguyên văn nếu code khác |
| `33_020_008` | Tìm người thao tác bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ bản ghi. Ghi lại hành vi thật |
| `33_020_009` | Tìm người thao tác không dấu | Chờ chạy để lấy hành vi thật | Ghi lại hành vi thật: có tìm ra người tên có dấu hay không |
| `33_020_010` | Lọc khoảng ngày có Đến ngày trước Từ ngày | Chờ chạy để lấy hành vi thật | Bị chặn ở bộ chọn ngày hoặc trả rỗng. Ghi lại hành vi thật |
| `33_060_001` | Danh sách lịch sử rỗng khi kỳ không có thao tác | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |

**6/24 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/33_lich_su_thao_tac_nguoi_dung/playwright.config.js
```

**5 đạt · 6 hỏng · 13 chưa chạy.**

### Màn thật — đo từ DOM (`/chain/user-action-history`)

Tiêu đề `Lịch sử thao tác người dùng`; 9 cột `STT · Nhóm nghiệp vụ · Hành động · Người thao tác ·
Vai trò · Đơn vị · IP · Thời gian · Hành động`; ô `Tìm theo tên người thao tác` (tự lọc khi ngừng
gõ), cặp ngày `Từ ngày`/`Đến ngày`, 2 select `Nhóm nghiệp vụ` · `Hành động`; 20 dòng/trang.

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `33_020_003` | Ô **Nhóm nghiệp vụ** chỉ có **10** giá trị, HDSD khai **15**. Nguyên văn: `Bảng giá sản phẩm · Bảng giá nhà cung cấp · Ngừng hoạt động sản phẩm · Ngừng hoạt động danh mục sản phẩm · Cấu hình chuỗi · Cấu hình tích điểm loyalty · Cấu hình nhóm khách hàng loyalty · Chiến dịch khuyến mãi · Đơn vị tổ chức · Chương trình khuyến mãi đặt hàng NCC` | **Lệch đặc tả** |
| `33_020_004` | Ô **Hành động** có **10** giá trị, HDSD khai **9**: `Thêm mới · Cập nhật · Xóa · Phê duyệt · Kích hoạt · Ngừng kích hoạt · Cập nhật trạng thái kinh doanh · Cấu hình ngừng/cho phép bán sản phẩm · Cấu hình ngừng/cho phép bán danh mục sản phẩm · Vô hiệu cấu hình ngừng/cho phép bán sản phẩm` | **Lệch đặc tả** |
| `33_010_003` | Cột `Hành động` cuối bảng **không được ghim bên phải** (`ant-table-cell-fix-right` không có) ⇒ cuộn ngang là mất nút thao tác | **Lệch đặc tả** |
| `33_020_008` | Tìm bằng `%_` vẫn trả **đủ 20 dòng** | **Lỗi sản phẩm** — cùng họ `19_120_002`, `27_071_001`, `31_040_002` |
| `33_020_009` | Gõ **`Tom 2 NVLAN01`** (không dấu) **không** tìm ra `Tôm 2 NVLAN01` | **Lỗi trải nghiệm** — người dùng gõ nhanh không dấu tưởng không có bản ghi |
| `33_PQ_001` | Vai `gdv` **không bị chặn**: vào được màn, tiêu đề hiện đủ, bảng 0 dòng. Cả 5 task chỉ khai `TONG_CONG_TY · BUU_DIEN_TINH · BUU_DIEN_XA` | **Lệch phân quyền** |

### Đã chạy và đạt

`33_010_002` đúng 9 cột · `33_020_005` tìm khớp một phần, không phân biệt hoa thường ·
`33_020_006` nút xoá nhanh đưa danh sách về như chưa lọc · `33_060_002` phân trang ·
`33_060_003` mặc định xếp mới nhất lên đầu.
