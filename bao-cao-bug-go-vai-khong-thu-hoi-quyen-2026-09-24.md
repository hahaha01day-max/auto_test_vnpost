# [Phân quyền – Quản lý chức năng] Gỡ vai trò (hoặc gỡ API) khỏi chức năng không thu hồi quyền — vai vẫn gọi được API

| | |
|---|---|
| **Môi trường** | DEV (`dev-vnpost.sfin.vn` / `vnpost-api.sfin.vn`, DB `103.109.43.112` schema `AUTHEN`) |
| **Phân hệ** | Quản lý vai trò → Chức năng |
| **Service** | `vnpost-auth-service` |
| **API** | `PUT /auth/function/update` |
| **Infrastructure** | BE |
| **Mức độ** | Medium — lỗ hổng phân quyền: màn hình báo đã gỡ nhưng quyền vẫn còn |
| **Phát hiện khi** | Chẩn bug `recvw2e9pFZIee` (24/09/2026) |

## Hiện tượng

Trên màn **Quản lý vai trò → Chức năng**, mở một chức năng, **bỏ tích một vai trò** rồi bấm Xác nhận.
Màn hình và bảng `TBL_ROLE_FUNCTION` đều ghi nhận vai đã bị gỡ, nhưng **người dùng mang vai đó vẫn gọi
được các API của chức năng**. Quyền chỉ mất khi có ai đó lưu lại chính vai trò đó ở màn **Vai trò**
(hoặc lưu lại API ở màn **Quyền**).

Tương tự: **gỡ một API khỏi chức năng** thì các vai đang giữ chức năng đó vẫn gọi được API vừa gỡ.

## Bước tái hiện

1. Chọn một chức năng đang có vai trò X và API A (vai X chỉ nhận API A qua chức năng này).
2. Đăng nhập tài khoản mang vai X, gọi API A → **200**.
3. Ở màn Quản lý vai trò → Chức năng, mở chức năng đó, **bỏ tích vai X**, bấm Xác nhận.
4. Đăng nhập lại tài khoản vai X, gọi API A.

**ACT:** vẫn **200** — vai X vẫn dùng được API A.
**EXP:** **401** — vai X không còn chức năng nào chứa API A thì phải mất quyền.

## Bằng chứng trên dữ liệu thật (DB DEV)

Ngày 23/09/2026 lúc 16:58:08, vai **Kế toán TCT** (`CORP_ACCOUNTANT`) bị gỡ khỏi chức năng
`ADJUSTMENT_INVOICE_DETAILS` qua màn Chức năng (nhật ký `VNPOST_CORE.USER_OPERATION_HISTORY` id 6992).
Chức năng này sau đó bị xoá (id 6994). Tại thời điểm đó Kế toán không còn chức năng đang bật nào chứa
quyền `STOCK_RETURN_CREDIT_NOTE_GET_2` (`GET /stock/v2/return-credit-note/{id}`), nhưng dòng quyền phẳng
vẫn bật:

```sql
SELECT id, role_code, permission_code, active
FROM AUTHEN.TBL_ROLE_PERMISSION
WHERE id = 16222;
-- 16222 | CORP_ACCOUNTANT | STOCK_RETURN_CREDIT_NOTE_GET_2 | 1   ← vẫn gọi được API
```

Câu kiểm tổng quát — liệt kê mọi cặp vai–quyền đang bật mà vai **không còn chức năng nào** chứa quyền
đó (kết quả khác 0 dòng là đang có quyền "ma"):

```sql
SELECT rp.id, rp.role_code, rp.permission_code
FROM AUTHEN.TBL_ROLE_PERMISSION rp
WHERE rp.active = 1
  AND NOT EXISTS (
    SELECT 1
    FROM AUTHEN.TBL_ROLE_FUNCTION rf
    JOIN AUTHEN.TBL_FUNCTION f            ON f.code = rf.function_code AND f.active = 1
    JOIN AUTHEN.TBL_FUNCTION_PERMISSION fp ON fp.function_code = f.code AND fp.active = 1
    WHERE rf.active = 1
      AND rf.role_code = rp.role_code
      AND fp.permission_code = rp.permission_code);
```

Đo trên DB DEV ngày 24/09/2026: **298 dòng quyền "ma"** trải trên **17 vai trò** (trên tổng 10.521 dòng
quyền đang bật). Không phải dòng nào cũng sinh ra từ lỗi này — một phần có thể do SQL tay — nhưng đó là
số vai–API đang gọi được mà màn quản trị không thể hiện.

## Nguyên nhân

Runtime (gateway → `auth-service`) kiểm quyền bằng bảng phẳng `TBL_ROLE_PERMISSION`. Ba màn quản trị
cập nhật bảng này theo ba cách khác nhau:

| Màn | Hàm | Cập nhật `TBL_ROLE_PERMISSION` |
|---|---|---|
| Vai trò | `ChainRoleServiceImpl.updateRolePermissions` (`ChainRoleServiceImpl.java:334`) | Tính lại từ hợp mọi chức năng của vai → **bật và tắt** đúng |
| Quyền (API) | `PermissionServiceImpl.updateRolePermissions` | Tính lại từ hợp mọi vai của các chức năng chứa quyền → **bật và tắt** đúng |
| **Chức năng** | `FunctionServiceImpl.updateFunction` (`FunctionServiceImpl.java:307`) | **Chỉ bật, không bao giờ tắt** |

Trong `updateFunction`:

- `syncRoleFunctions` (`FunctionServiceImpl.java:372`) tắt `TBL_ROLE_FUNCTION` của vai bị gỡ, nhưng không
  đụng `TBL_ROLE_PERMISSION`.
- `syncFunctionPermissions` (`FunctionServiceImpl.java:414`) tắt `TBL_FUNCTION_PERMISSION` của API bị gỡ,
  cũng không đụng `TBL_ROLE_PERMISSION`.
- `syncRolePermissionMappings` (`FunctionServiceImpl.java:459`) chỉ nhận danh sách vai/API **còn lại**
  trong request và chỉ `setActive(true)` — vai/API vừa bị gỡ không nằm trong danh sách nên dòng quyền
  của chúng giữ nguyên `active = 1`.

Cache vẫn được xoá (`clearAuthorCache`, dòng 348), nên đây không phải lỗi cache: dữ liệu DB sai thật.

## Ảnh hưởng

- **Bảo mật:** thu hồi quyền trên màn Chức năng không có tác dụng — người đã bị gỡ vẫn thao tác được
  (xem, sửa, xoá… tuỳ API).
- **Sai lệch khó thấy:** màn quản trị hiển thị "đã gỡ", nhưng quyền chỉ thực sự mất vào một thời điểm
  ngẫu nhiên sau đó, khi có người lưu lại vai trò ở màn Vai trò — lúc đó quyền mất "không rõ lý do".
  Đây là kiểu biến động đã gặp ở bug `recvw2e9pFZIee` (Admin mất quyền xem chi tiết hoá đơn điều chỉnh
  trong khi Kế toán vẫn còn).

## Đề xuất sửa

Sau bước đồng bộ ở `updateFunction`, tính lại `TBL_ROLE_PERMISSION` cho **mọi vai bị ảnh hưởng** —
gồm vai trước khi sửa lẫn sau khi sửa — theo đúng quy tắc của màn Vai trò: quyền của một vai = hợp
quyền của **tất cả** chức năng đang bật mà vai giữ (không chỉ chức năng đang sửa, vì một API được phép
nằm ở nhiều chức năng).

Gợi ý: tái dùng logic `ChainRoleServiceImpl.updateRolePermissions(roleCode, activeRoleFunctions)` cho
từng vai trong tập `before.roleCodes ∪ after.roleCodes` (khi gỡ API thì mọi vai của chức năng đều bị
ảnh hưởng). Không tắt thẳng theo cặp (vai, API) của riêng chức năng đang sửa — làm vậy sẽ thu hồi nhầm
quyền mà vai còn nhận qua chức năng khác.

**Dữ liệu cũ:** sau khi sửa code cần chạy câu kiểm ở mục "Bằng chứng" trên từng môi trường; các dòng
trả về là quyền "ma" đang tồn tại, cần người phụ trách phân quyền duyệt trước khi tắt (có thể có vai
đang vô tình dựa vào chúng để làm việc).
