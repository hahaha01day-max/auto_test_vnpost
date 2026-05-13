# Tài liệu 04 - Quản lý sản phẩm / Danh mục sản phẩm

Nguồn tài liệu:

- `4. Quản lý sản phẩm_Danh mục sản phẩm.docx`

Phạm vi:

- Quản lý danh mục sản phẩm
- Quản lý sản phẩm

## Test case

Quản lý danh mục sản phẩm:

- `/Users/manhle2001/Desktop/Script_document/test-output/testcase/quan-ly-danh-muc-san-pham/quan-ly-danh-muc-san-pham-testcases.md`
- `/Users/manhle2001/Desktop/Script_document/test-output/testcase/quan-ly-danh-muc-san-pham/quan-ly-danh-muc-san-pham-testcases.csv`

Quản lý sản phẩm:

- `/Users/manhle2001/Desktop/Script_document/test-output/testcase/quan-ly-san-pham/quan-ly-san-pham-testcases.md`
- `/Users/manhle2001/Desktop/Script_document/test-output/testcase/quan-ly-san-pham/quan-ly-san-pham-testcases.csv`

## Script

Chạy smoke test an toàn:

```bash
cd /Users/manhle2001/Desktop/Script_document
./tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/scripts/run-product-doc-test-tool.sh smoke
```

Chạy có mở browser thật:

```bash
./tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/scripts/run-product-doc-test-tool.sh smoke-headed
```

Output:

- `tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/test-output/smoke/product-category-smoke-result.json`
- `tai-lieu-test/04-quan-ly-san-pham-danh-muc-san-pham/test-output/smoke/screenshots/`

## Mức độ an toàn

Script smoke hiện tại chỉ kiểm tra điều hướng, hiển thị màn, mở drawer/modal và validation rỗng. Script không xác nhận tạo mới, không import file thật, không xóa dữ liệu.
