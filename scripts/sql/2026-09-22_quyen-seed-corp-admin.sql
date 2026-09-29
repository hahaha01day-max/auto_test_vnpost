-- Cấp 2 quyền còn thiếu cho vai CORP_ADMIN để bộ seed chạy được hết 9 bước.
-- Môi trường: 103.109.43.112 · schema AUTHEN · chain 626
-- Sinh ngày 2026-09-22.
--
-- Vì sao chỉ 2 dòng: đã quét toàn bộ endpoint mà bước 4–9 cần. CORP_ADMIN ĐÃ CÓ sẵn
--   CHAIN_PRODUCTS (tạo sản phẩm) · CHAIN_PRICE_LIST_CREATE (bảng giá bán)
--   CHAIN_SUPPLIER_CREATE (NCC) · SUPPLIER_PRODUCT_UPSERT (sản phẩm NCC)
--   POD_SUPPLIER_PRICE_LISTS_POST (bảng giá mua) · CREATE_PROMOTION (khuyến mại)
-- Chỉ thiếu đúng hai cái dưới đây.
--
-- 🔴 Khoá duy nhất `TBL_ROLE_PERMISSION_role_code_permission_code_uindex` chỉ gồm
--    (role_code, permission_code) — KHÔNG có cột `active`. Vì vậy INSERT có điều kiện
--    `AND active = 1` vẫn chết 1062 khi đã tồn tại dòng `active = 0`. Dùng
--    `INSERT ... ON DUPLICATE KEY UPDATE active = 1` để vừa thêm mới vừa bật lại dòng cũ.
--
-- 🔴 `role_id` để NULL là ĐÚNG quy ước của bảng này: 10418/10447 dòng hiện có đều NULL,
--    hệ thống tra theo `role_code`. 🚫 Đừng "sửa cho đẹp" bằng cách điền role_id.

START TRANSACTION;

INSERT INTO AUTHEN.TBL_ROLE_PERMISSION (role_id, role_code, permission_id, permission_code, active)
VALUES
  -- Bước 4 — tạo danh mục sản phẩm. Hiện KHÔNG vai nào có quyền này ⇒ không ai tạo được
  -- danh mục qua giao diện, không riêng tài khoản test.
  (NULL, 'CORP_ADMIN', 10503, 'CHAIN_PRODUCT_CATEGORIES_INDIVIDUAL_CREATE', 1),
  -- Bước 9 — nhập kho sinh tồn thật (POST /stock/v2/import-export/checkout).
  (NULL, 'CORP_ADMIN', 11256, 'STOCK_IMPORT_EXPORT_CHECKOUT_CREATE', 1)
ON DUPLICATE KEY UPDATE active = 1;

-- Đối chiếu: phải ra đúng 2 dòng, cột `active` = 1.
SELECT role_code, permission_code, active
FROM AUTHEN.TBL_ROLE_PERMISSION
WHERE role_code = 'CORP_ADMIN'
  AND permission_code IN (
    'CHAIN_PRODUCT_CATEGORIES_INDIVIDUAL_CREATE',
    'STOCK_IMPORT_EXPORT_CHECKOUT_CREATE'
  );

COMMIT;

-- Gỡ lại nếu cần (🚫 không chạy trừ khi muốn thu hồi):
-- UPDATE AUTHEN.TBL_ROLE_PERMISSION SET active = 0
--  WHERE role_code = 'CORP_ADMIN'
--    AND permission_code IN ('CHAIN_PRODUCT_CATEGORIES_INDIVIDUAL_CREATE',
--                            'STOCK_IMPORT_EXPORT_CHECKOUT_CREATE');
