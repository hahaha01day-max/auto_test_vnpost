# Báo cáo lỗi — Phân quyền: nhân viên nhiều vai và vai rỗng quyền

- Ngày phát hiện: **22/09/2026**
- Môi trường: `https://vnpost-api.sfin.vn` (DEV) · FE `https://dev-vnpost.sfin.vn` · chuỗi `chain_id = 626`
- Người phát hiện: đội auto test, trong lúc dựng bộ sinh dữ liệu nền
- Mức độ: **Nghiêm trọng** — cả hai lỗi đều **sai im lặng**, người dùng không nhận được thông báo nào

---

## Lỗi 1 — Nhân viên có NHIỀU vai ở cùng một đơn vị thì API trả 401 dù vai đang chọn đủ quyền

### Hiện tượng

Nhân viên được gán **hai vai ở cùng một điểm bán** (Giao dịch viên + Cửa hàng trưởng). Đăng nhập,
chọn đúng dòng **Cửa hàng trưởng**, vào *Xuất nhập kho → Tồn kho đầu kỳ*:
**toàn bộ nhóm API `/opening-balance` trả `SSHOP-401 Không có quyền truy cập`** — kể cả
`GET /opening-balance/template` và `GET /opening-balance/previews`.

Trong khi vai "Cửa hàng trưởng" **có đủ quyền** đó.

### Bằng chứng

**a) Quyền trong `AUTHEN` đầy đủ ở cả bốn tầng** cho `SHOP_MANAGER`:

```
TBL_PERMISSION          CORE_OPENING_BALANCE_UPLOADS · POST /opening-balance/uploads
                        scope=SHOP_API · owner_only=0 · deleted=0
TBL_FUNCTION_PERMISSION → INVENTORY_OPENING_BALANCE · active=1
TBL_ROLE_FUNCTION       id=1479 · SHOP_MANAGER + INVENTORY_OPENING_BALANCE · active=1
TBL_ROLE_PERMISSION     id=10124 · SHOP_MANAGER + CORE_OPENING_BALANCE_UPLOADS · active=1
```

Cả nhóm `/opening-balance` có **23 permission**, **23/23** đều gắn function
`INVENTORY_OPENING_BALANCE` và **mỗi permission gắn 6 vai** (có `SHOP_MANAGER`).

**b) Phiên đăng nhập đúng vai.** Bản ghi phân công đang dùng:

```
VNPOST_CORE.CHAIN_SHOP_EMPLOYMENT_MANAGE
  id = 29820 · sys_user_id = 123463415 · chain_id = 626
  role_id = 6  (= SHOP_MANAGER "Cửa hàng trưởng")
  org_unit_code = S6239130401A1304 · status = 1
```

`localStorage.oldRoleId = 29820`, khớp đúng dòng vừa chọn.

**c) Gọi API trực tiếp bằng token của tài khoản hai vai → 401:**

```bash
curl 'https://vnpost-api.sfin.vn/opening-balance/previews?shopId=68127&page=0&size=20' \
  -H 'authorization: <token user 123463416>' \
  -H 'appid: SSHOP' -H 'chainid: 626' \
  -H 'orgunitcode: S6239130401A1304' -H 'orgunittype: DIEM_BAN' -H 'shopid: 68127'

{"status":{"code":"SSHOP-401","message":"Không có quyền truy cập","label":"ERROR_UNAUTHORIZED"}}
```

`GET /opening-balance/template` cũng trả **401**.

**d) Phép kiểm quyết định — tài khoản CHỈ MỘT vai thì chạy được.**

Tạo nhân viên mới ở **cùng điểm bán**, **cùng vai Cửa hàng trưởng**, khác mỗi chỗ là **chỉ gán một
vai**. Cùng thao tác, cùng file:

```
POST /opening-balance/uploads → 200
{"status":{"code":"200","message":"Thành công"},
 "data":{"previewId":"618e7fa1-2c0f-4edf-a4b4-c7ce0f420ffa","status":"PENDING"}}
```

| Tài khoản | Vai gán ở điểm bán `S6239130401A1304` | Vai đang chọn | `POST /opening-balance/uploads` |
|---|---|---|---|
| `autonv65402390` (user 123463416) | Giao dịch viên **+** Cửa hàng trưởng | Cửa hàng trưởng | **401** |
| `autonv68051351` | Cửa hàng trưởng | Cửa hàng trưởng | **200** |

### Nhận định

Token 🚫 **không mang `roleId`**. Nếu backend tra quyền theo `(chainId, orgUnitCode, userId)` thì với
nhân viên có nhiều vai **tại cùng một `org_unit_code`**, nó không phân biệt được vai người dùng vừa
chọn và nhiều khả năng lấy nhầm vai còn lại (ở đây là *Giao dịch viên* — vai này **không** có
`INVENTORY_OPENING_BALANCE`).

Rất đáng lưu ý vì hai vai ở điểm bán **bù trừ nhau**, không vai nào làm được cả hai việc:

| Chức năng | `SHOP_SALE` (Giao dịch viên) | `SHOP_MANAGER` (Cửa hàng trưởng) |
|---|---|---|
| `CREATE_IMPORT_STOCK` (lập phiếu nhập kho) | active = 1 | **active = 0** |
| `INVENTORY_OPENING_BALANCE` (tồn kho đầu kỳ) | **không có** | active = 1 |

⇒ Người dùng cần làm cả hai việc buộc phải mang hai vai — và đúng lúc đó thì dính lỗi này.

### Đề nghị

- Đưa `roleId` (hoặc `employmentId`) vào ngữ cảnh kiểm quyền, không chỉ `userId + orgUnitCode`.
- Nếu đã có sẵn, kiểm lại chỗ chọn bản ghi phân công khi một user có nhiều dòng cùng `org_unit_code`.
- Kiểm cả cache phân quyền (Redis, khoá `Result::<chainId>::<orgUnitCode>::<userId>::<METHOD>::<path>`):
  khoá này **không có vai**, nên kết quả của vai này sẽ dùng lại cho vai kia.

### Các bước tái hiện

1. Tạo nhân viên ở một điểm bán, gán **hai** dòng vai trò: *Giao dịch viên* và *Cửa hàng trưởng*.
2. Đăng nhập, ở màn chọn điểm bán bấm dòng **Cửa hàng trưởng**.
3. Vào *Xuất nhập kho → Tồn kho đầu kỳ → Khai báo tồn đầu kỳ*, bấm *Tải mẫu excel*.
4. Quan sát: request trả `SSHOP-401`.
5. Lặp lại với nhân viên chỉ gán **một** vai *Cửa hàng trưởng* → chạy bình thường.

---

## Lỗi 2 — Vai trò mới tạo có `scopes` rỗng, tài khoản một đơn vị rơi vào vòng lặp câm

### Hiện tượng

Tạo vai trò qua *Phân quyền → Thêm vai trò*, gán cho nhân viên. Nhân viên đăng nhập được, chọn điểm
bán, rồi **màn hình quay vòng không vào được**: vòng xoay loading không bao giờ tắt,
`GET /chain-profile/get-list-chain-by-customer-id` bị gọi **liên tục**, và 🚫 **không có thông báo
lỗi nào**.

### Nguyên nhân

Vai trò mới ra đời **không có chức năng nào**:

```
GET /auth/role/get-functions?roleId=66
→ data: [ { "id": 66, "code": "AUTO_VT_62391304", "scopes": {} } ]
```

Hai đoạn code khoá vào nhau:

- `pages/systemAccount/components/shopPage/index.jsx` — `useEffect`: danh sách chỉ có **1** đơn vị
  thì **tự chọn** rồi `navigate("/")`.
- `layout/hooks/useChangeWorkingUnit.js` — quyền không dùng được thì `navigate("/account?act=select-shop")`.

⇒ tự chọn → bị đá về → tự chọn → … vô hạn.

Nhánh chặn 403 *"Tài khoản của bạn không có quyền truy cập vào cửa hàng này"* trong `routes/helpers.js`
chỉ bắt khi mảng quyền **rỗng hoàn toàn** (`data.length === 0`). Ở đây mảng có **1 phần tử** với
`scopes: {}` nên lọt qua, rơi thẳng vào vòng lặp.

### Đề nghị

- Bổ sung điều kiện: mảng có phần tử nhưng `scopes` rỗng cũng phải coi là **không có quyền** → hiện
  màn 403 kèm thông báo, 🚫 không để quay vòng.
- Cân nhắc chặn ngay ở màn chọn đơn vị: vai không có chức năng nào thì báo rõ thay vì cho bấm vào.
- Xem lại việc *Thêm vai trò* tạo ra vai rỗng quyền mà không cảnh báo người tạo.

### Các bước tái hiện

1. *Phân quyền → Thêm vai trò*: nhập mã, tên, phạm vi **Điểm Bán**, lưu. 🚫 Không gán chức năng nào.
2. Tạo nhân viên ở một điểm bán, gán đúng vai vừa tạo (nhân viên chỉ có **một** đơn vị).
3. Đăng nhập bằng tài khoản đó.
4. Quan sát: màn chọn điểm bán quay vòng, tab Network thấy
   `chain-profile/get-list-chain-by-customer-id` gọi lặp không dứt, không có thông báo lỗi.

---

## Lỗi 3 — Hướng dẫn trên màn "Nhập tồn kho đầu kỳ" sai so với file mẫu, file sai cột thì báo "Thất bại" mà không nói vì sao

### Hiện tượng

Màn *Tồn kho đầu kỳ → Khai báo tồn đầu kỳ* in hướng dẫn:

> File Excel gồm các cột: Mã điểm bán / kho, SKU, **Tên SP**, Tên biến thể, Đơn vị, Mã lô, Serial,
> Số lượng, Giá vốn, Ghi chú, Hạn sử dụng.

Nhưng file mẫu thật (`GET /opening-balance/template`, sheet `opening_balance`) có **12 cột**:

```
Mã điểm bán / kho · Mã kho · SKU · Tên sản phẩm · Tên biến thể · Đơn vị ·
Mã lô · Serial · Số lượng · Giá vốn · Ghi chú · Hạn sử dụng
```

Hướng dẫn **thiếu cột "Mã kho"** và gọi cột thứ tư là *"Tên SP"* thay vì *"Tên sản phẩm"*.

### Hệ quả

Người dùng tự dựng file theo hướng dẫn thì upload vẫn trả **200**, job chạy xong nhưng trạng thái là
**"Thất bại"**, ba cột *Tổng dòng / Hợp lệ / Lỗi* hiện **NaN**, tổng giá trị **0 đ**, và 🚫 **không có
một thông báo nào** nói file sai cột. Người dùng không có manh mối để sửa.

### Đề nghị

- Sửa dòng hướng dẫn cho khớp file mẫu.
- Khi đọc file hỏng: trả thông điệp cụ thể (thiếu cột nào, tên cột sai ra sao) thay vì trạng thái
  "Thất bại" trống rỗng; 🚫 đừng để ba cột thống kê hiện `NaN`.

---

## Phụ lục — một điểm lệch nhỏ, chưa gây lỗi

Nhánh `/stock/opening-balance/**` thiếu đúng một permission so với nhánh `/opening-balance/**`:

```
PUT /stock/opening-balance/previews/{previewId}/items/{itemId}   ← chưa khai
PUT /opening-balance/previews/{previewId}/items/{itemId}         ← đã khai (OPENING_BALANCE_PREVIEWS_ITEMS_UPDATE)
```

FE hiện gọi nhánh `/opening-balance/**` nên chưa chạm; luồng nào đi qua `/stock/...` để sửa dòng
xem trước sẽ dính 401.
