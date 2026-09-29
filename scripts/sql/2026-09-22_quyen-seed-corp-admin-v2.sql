-- Cấp quyền cho vai CORP_ADMIN — BẢN 2, đi ĐỦ chuỗi phân quyền.
-- Môi trường: 103.109.43.112 · schema AUTHEN. Sinh ngày 2026-09-22.
--
-- 🔴 VÌ SAO CÓ BẢN 2: bản 1 chỉ thêm `TBL_ROLE_PERMISSION` và VẪN 401. Đo lại thì chuỗi kiểm
--    quyền đi qua FUNCTION:
--        TBL_PERMISSION → TBL_FUNCTION_PERMISSION → TBL_FUNCTION → TBL_ROLE_FUNCTION → vai
--    Bằng chứng: `CHAIN_PRODUCTS` (tạo sản phẩm, CORP_ADMIN dùng được) có gắn function
--    `CREATE_PRODUCT`; còn `CHAIN_PRODUCT_CATEGORIES_INDIVIDUAL_CREATE` 🔴 KHÔNG gắn function nào.
--    ⇒ Thêm mỗi `role_permission` là chưa đủ.
--
-- 🔴 Hai bảng nối khoá theo CODE, phần lớn dòng có `*_id` NULL — 🚫 đừng tra theo id rồi kết luận
--    "chưa gán cho ai": `TBL_ROLE_PERMISSION` có 10418/10447 dòng `role_id` NULL, tra theo id ra 0.
--    Riêng `TBL_ROLE_FUNCTION` thì các dòng mẫu ĐỀU điền cả id lẫn code (xem `CREATE_PRODUCT`),
--    nên ở đây điền cả hai cho khớp khuôn.
--
-- Nhóm PRODUCT_CATEGORIES hiện chỉ có 2 chức năng: xem chi tiết và cấu hình ngừng kích hoạt —
-- 🔴 KHÔNG có chức năng "Thêm danh mục". Phải tạo mới chức năng này.

START TRANSACTION;

-- 1. Chức năng "Thêm danh mục" cho nhóm PRODUCT_CATEGORIES.
INSERT INTO AUTHEN.TBL_FUNCTION (code, name, active, created_date, modified_date, group_function_code, sort_order)
SELECT 'CREATE_PRODUCT_CATEGORIES', 'Thêm danh mục', 1, NOW(), NOW(), 'PRODUCT_CATEGORIES', 0
WHERE NOT EXISTS (SELECT 1 FROM AUTHEN.TBL_FUNCTION WHERE code = 'CREATE_PRODUCT_CATEGORIES');

-- 2. Gắn quyền tạo danh mục vào chức năng vừa tạo.
INSERT INTO AUTHEN.TBL_FUNCTION_PERMISSION (function_id, permission_id, active, function_code, permission_code, sort_order)
SELECT f.function_id, p.id, 1, f.code, p.code, 0
FROM AUTHEN.TBL_FUNCTION f
JOIN AUTHEN.TBL_PERMISSION p ON p.code = 'CHAIN_PRODUCT_CATEGORIES_INDIVIDUAL_CREATE'
WHERE f.code = 'CREATE_PRODUCT_CATEGORIES'
  AND NOT EXISTS (
    SELECT 1 FROM AUTHEN.TBL_FUNCTION_PERMISSION x
    WHERE x.function_code = f.code AND x.permission_code = p.code
  );

-- 3. Gán chức năng đó cho vai CORP_ADMIN.
INSERT INTO AUTHEN.TBL_ROLE_FUNCTION (role_id, function_id, role_code, function_code, active, created_date, modified_date, private_data)
SELECT r.role_id, f.function_id, 'CORP_ADMIN', f.code, 1, NOW(), NOW(), 0
FROM AUTHEN.TBL_FUNCTION f
JOIN AUTHEN.TBL_CHAIN_ROLE r ON r.role_code = 'CORP_ADMIN'
WHERE f.code = 'CREATE_PRODUCT_CATEGORIES'
  AND NOT EXISTS (
    SELECT 1 FROM AUTHEN.TBL_ROLE_FUNCTION x
    WHERE x.role_code = 'CORP_ADMIN' AND x.function_code = f.code
  );

-- 4. Quyền nhập kho (bước 8 của bộ seed) — gắn vào chức năng "Thêm phiếu nhập kho" đã có
--    (function_id 89, CORP_ADMIN đang được gán). 🚫 Không tạo chức năng mới cho cái này.
INSERT INTO AUTHEN.TBL_FUNCTION_PERMISSION (function_id, permission_id, active, function_code, permission_code, sort_order)
SELECT f.function_id, p.id, 1, f.code, p.code, 0
FROM AUTHEN.TBL_FUNCTION f
JOIN AUTHEN.TBL_PERMISSION p ON p.code = 'STOCK_IMPORT_EXPORT_CHECKOUT_CREATE'
WHERE f.code = 'CREATE_IMPORT_STOCK'
  AND NOT EXISTS (
    SELECT 1 FROM AUTHEN.TBL_FUNCTION_PERMISSION x
    WHERE x.function_code = f.code AND x.permission_code = p.code
  );

COMMIT;

-- Đối chiếu — phải ra đủ 3 dòng.
SELECT 'function' loai, code, name FROM AUTHEN.TBL_FUNCTION WHERE code = 'CREATE_PRODUCT_CATEGORIES'
UNION ALL
SELECT 'function_permission', function_code, permission_code FROM AUTHEN.TBL_FUNCTION_PERMISSION
 WHERE permission_code IN ('CHAIN_PRODUCT_CATEGORIES_INDIVIDUAL_CREATE','STOCK_IMPORT_EXPORT_CHECKOUT_CREATE')
UNION ALL
SELECT 'role_function', role_code, function_code FROM AUTHEN.TBL_ROLE_FUNCTION
 WHERE role_code = 'CORP_ADMIN' AND function_code = 'CREATE_PRODUCT_CATEGORIES';
