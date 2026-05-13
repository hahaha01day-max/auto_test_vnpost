# Tách script theo tài liệu SRS

Thư mục này dùng để quản lý script, test case và output theo từng tài liệu riêng, tránh lẫn giữa các phân hệ.

| Folder | Tài liệu | Phạm vi |
| --- | --- | --- |
| `01-mo-hinh-to-chuc` | `1. Mô hình tổ chức.docx` | Mô hình tổ chức |
| `04-quan-ly-san-pham-danh-muc-san-pham` | `4. Quản lý sản phẩm_Danh mục sản phẩm.docx` | Quản lý danh mục sản phẩm và Quản lý sản phẩm |

## Quy ước

- Mỗi tài liệu có folder riêng.
- Script mới của tài liệu nào đặt trong `tai-lieu-test/<ma-tai-lieu>/scripts`.
- Output tự động của tài liệu nào ghi vào `tai-lieu-test/<ma-tai-lieu>/test-output`.
- Test case sinh từ tài liệu vẫn có bản tổng hợp ở `test-output/testcase`.
