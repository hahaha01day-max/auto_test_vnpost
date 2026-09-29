# Báo cáo auto test — Cấu hình mặc định phương pháp tính giá vốn

- Ngày chạy: 16/09/2026 (lần 3, sau khi sửa Lỗi 1 + Lỗi 4 và chạy xong SQL seed + phân quyền)
- Tính năng: `.claude/plans/2026-09-08_cau-hinh-mac-dinh-phuong-phap-gia-von.md`
- Môi trường: FE `http://localhost:3100` → Gateway `localhost:8082` → core-service `localhost:8002`
  → **DB PROD `103.109.43.112` (`VNPOST_CORE`)** — theo `all.env`
- Vai chạy: `tct` (Admin chuỗi, `0366202390`, chuỗi `chain_id = 626`) và `shop` (cho ca kiểm phạm vi)

```bash
cd auto_test_vnpost && npx playwright test --config tai-lieu-test/35-gia-von-mac-dinh/playwright.config.js
```

- Báo cáo HTML: `test-output/playwright-report/index.html`
- Ảnh & bằng chứng: `anh-chup/`

---

## 1. Tổng kết

| Nhóm | Số case | Case |
|---|---|---|
| ✅ Đã chạy và đạt | 16 | GVMD-001…007, GVMD-013…018, BC-01, BC-02, BC-03 |
| ❌ Đã chạy và hỏng | 0 | — |
| ⏭️ Chưa chạy (skip có lý do) | 4 | GVMD-009, GVMD-010, GVMD-011, GVMD-012 |

---

## 2. Đã chạy và đạt

### Giao diện màn cấu hình (ảnh trong `anh-chup/`)

| Case | Kiểm được gì | Ảnh |
|---|---|---|
| GVMD-001 | Mở `/settings?setting=costMethodDefault`; `GET /system` và `GET /categories` đều `status.code = "200"`; hiện đủ 2 thẻ | `GVMD-001.png` |
| GVMD-002 | Dòng "Toàn hệ thống" hiện tên phương pháp, không phải `---` | `GVMD-002.png` |
| GVMD-003 | Bảng danh mục đủ 4 cột (Danh mục / Phương pháp đang áp dụng / Nguồn / Thao tác), **417 danh mục** | `GVMD-003.png` |
| GVMD-004 | Mọi tag cột Nguồn đều thuộc {Cấu hình riêng, Kế thừa, Theo toàn hệ thống} | `GVMD-004.png` |
| GVMD-005 | Drawer toàn hệ thống mở được; danh sách chọn **đúng 4 mục, không còn LIFO** | `GVMD-005.png` |
| GVMD-006 | Drawer danh mục mở đúng tên danh mục, có nút "Lưu cấu hình" | `GVMD-006.png` |
| GVMD-007 | Thẻ "Lịch sử áp cho sản phẩm đã có" hiển thị; `GET /apply-jobs` trả `200` | `GVMD-007.png` |
| BC-01 | Menu Cấu hình **có** mục "Giá vốn mặc định" và URL giữ đúng `setting=costMethodDefault` | `BC-01-menu-cau-hinh.png` |

### API (bằng chứng: `anh-chup/BC-03-phan-hoi-api.json`)

| Case | Kiểm được gì |
|---|---|
| GVMD-013 | `GET /system` → 200, `data = "MAC"` |
| GVMD-014 | `GET /categories` → 200, 417 dòng, mỗi dòng đủ `categoryId` + `effectiveStockType` + `source` |
| GVMD-015 | `GET /apply-jobs?page=0&size=20` → 200, có `page.total_elements` (đúng `makePaginationResponse`) |
| GVMD-016 | `GET /preview-apply?stockType=FIFO` → 200, `affectedProductCount` hợp lệ |

### Phân quyền

| Case | Kiểm được gì |
|---|---|
| GVMD-018 | Vai **điểm bán** gọi `GET /system` → bị chặn (401/403). Chứng minh 8 quyền mới đã có hiệu lực **đúng phạm vi**: chức năng `CONFIG_ORDER` hiện chỉ gắn cho `CORP_ADMIN`. |

🔴 Không có case này thì bộ test chỉ chứng minh "Admin gọi được" — mà Admin vốn gọi được cả khi
`TBL_ROLE_PERMISSION` còn rỗng, tức không phân biệt được "đã khai quyền" với "chưa khai".

### Mặc định lúc tạo sản phẩm

| Case | Kiểm được gì | Ảnh |
|---|---|---|
| GVMD-017 | Chặn API cấu hình trả `FIFO` ⇒ màn Thêm sản phẩm hiện **"Nhập trước xuất trước"**, không còn "Bình quân gia quyền" | `GVMD-017-mac-dinh-fifo.png` |

🔴 GVMD-017 phải giả lập phản hồi vì cấu hình thật đang là `MAC` — trùng đúng giá trị FE từng hardcode,
chạy với dữ liệu thật thì pass cũng không chứng minh được gì (và không được ghi vào DB prod để đổi).

---

## 3. Chưa chạy — có lý do, KHÔNG tính là đạt

| Case | Lý do |
|---|---|
| GVMD-009 | Bản chạy với dữ liệu thật của GVMD-017. Cấu hình đang là `MAC` nên không phân biệt được với giá trị mặc định cũ ⇒ test tự skip kèm lý do thay vì pass giả. Sau khi seed lại cấu hình (mục 5) thì chạy được. |
| GVMD-010, 011, 012 | `allowMutation = false`. Ba case này GHI cấu hình cấp chuỗi mà core-service đang trỏ **DB PROD**; nhánh "Áp dụng cho cả sản phẩm đã có" đổi phương pháp giá vốn của hàng nghìn sản phẩm thật, **không dọn lại được**. |

---

## 4. Đã sửa trong lần này

### ✅ Lỗi 1 — Mục menu "Giá vốn mặc định" không bao giờ hiện

`SettingPageNext.jsx:246` dùng `hidden: !shopPrivate`, mà `PERMISSION_KEY.shop_private_permission`
không còn trong `permissionKey.js` (chỉ ở `permissionKeyOld.js:118`) ⇒ luôn `undefined` ⇒ mục ẩn với
mọi tài khoản, và `useEffect` ở `:588` ép URL về `setting=roundingAmount`.

**Sửa:** đổi sang `hidden: !isAdmin` (đúng cấp chuỗi, nhất quán với `isAdmin` màn này đã dùng để
khoá nút) và bổ sung `isAdmin` vào deps của `useMemo`.
Kiểm chứng: BC-01 + GVMD-001…007 xanh.

⚠️ Các mục "Tài chính", "Thuế VAT", "Đơn hàng"… vẫn dùng `shopPrivate` nên vẫn đang ẩn — lỗi có sẵn,
ngoài phạm vi yêu cầu, **chưa đụng**.

### ✅ Lỗi 4 — Màn thêm sản phẩm không đọc cấu hình (việc 12 của kế hoạch)

`AddProductDrawer.jsx:206` là `useState("MAC")` cứng. Vì FE **luôn gửi** `stockType`, nhánh mặc định
của backend (`resolveDefaultStockType`) không bao giờ chạy cho sản phẩm tạo từ màn này.

**Sửa:**
- `utils/service/productService.js` — thêm `getCategoryCostMethods()` và `getSystemCostMethod()`
  (giữ **Axios** vì đây là code cũ, không migrate sang RTK Query).
- `AddProductDrawer.jsx` — bỏ mặc định `"MAC"`; nạp cấu hình một lần lúc mở drawer; gợi ý theo
  `categoryId` đang chọn (backend đã resolve sẵn `effectiveStockType`, FE **không** tự leo cây danh mục);
  người dùng tự chọn một lần thì thôi gợi ý (`stockTypeTouchedRef`); không đụng nhánh ký gửi; đọc cấu
  hình lỗi thì rơi về `MAC` như hành vi cũ.

Kiểm chứng: GVMD-017 xanh.

---

## 5. Đã xử lý xong ở phía DB (anh tự chạy, đã kiểm lại)

| Việc | Trạng thái kiểm chứng |
|---|---|
| Seed `DEFAULT_COST_METHOD` cho đúng chuỗi | ✅ `CHAIN_CONFIGS`: `chain_id = 626`, `MAC`, `is_active = 1`. Dòng lạc ở `chain_id = 1` đã dọn. |
| `CHAIN_COST_METHOD_CONFIG_GAN_FUNCTION.sql` | ✅ `TBL_FUNCTION_PERMISSION` = 8 dòng; `TBL_ROLE_PERMISSION`: `CORP_ADMIN` × 8 quyền. |

⚠️ Vai trò duy nhất đang dùng được là `CORP_ADMIN` (chỉ vai này có chức năng `CONFIG_ORDER`).
Muốn Tỉnh/điểm bán xem được thì phải gán thêm `CONFIG_ORDER`, hoặc tách chức năng riêng.

## 6. Còn lại

| Việc | Vì sao chưa làm |
|---|---|
| GVMD-009 | Cấu hình toàn hệ thống vẫn là `MAC`. Đổi sang FIFO qua giao diện (chính là GVMD-010) rồi bật lại case này là chạy được với dữ liệu thật. |
| GVMD-010, 011, 012 | `allowMutation = false` — core-service đang trỏ DB PROD. Chỉ bật khi anh xác nhận. |
| Các mục Cấu hình khác vẫn ẩn | "Tài chính", "Thuế VAT", "Đơn hàng"… còn dùng `shopPrivate` (lỗi có sẵn). Ngoài phạm vi yêu cầu, chưa đụng. |
