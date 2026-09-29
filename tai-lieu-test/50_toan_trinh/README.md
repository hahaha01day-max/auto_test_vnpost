# 50 — Case toàn trình

Mỗi **luồng** là một chuỗi nghiệp vụ đi qua nhiều phân hệ; mỗi **bước** là một case (`50_TT<luồng>_<bước>`), chạy
tuần tự trong một spec `describe.serial`. Mục tiêu: chứng từ các bước **nối đúng vào nhau** và **số cuối khớp**
(tồn từng kho, công nợ NCC, trạng thái phiếu gốc). Quy tắc từng bước (quyền, lỗi nhập, điều kiện nút) vẫn kiểm ở
phân hệ gốc — ở đây chỉ kiểm tối thiểu để đi tiếp.

| Luồng | Spec | Bước |
|---|---|---|
| TT01 — Điểm bán đề xuất đặt hàng (TCT giao thẳng HUB tỉnh) | `tests/tt01-de-xuat-dat-hang.tct.spec.js` | 010–080 |
| TT02 — Điểm bán trả hàng NCC (nhánh NCC tỉnh + nhánh TCT) | `tests/tt02-tra-hang-ncc.tct.spec.js` | 010–100 |

- Bước nghiệp vụ dùng lại helper phân hệ gốc (`13_1`, `13_2/tests/dieu-phoi-ghi.js`, `13_3`, `14_x`); đo số ở `tests/toan-trinh-ghi.js`.
- Tiến độ lưu `test-output/tt<NN>.json`: hỏng giữa chừng thì lượt sau đi tiếp đúng bước; chuỗi xong thì lượt sau dựng chuỗi mới.
- 🔴 Ghi dữ liệu thật, ~8 phút/luồng. Tiền đề làn: HUB tỉnh (case `04_5_020_016`) + bảng giá mua phạm vi TCT/tỉnh (seed 13).

```bash
VNPOST_LANE=7 npx playwright test --config tai-lieu-test/50_toan_trinh/playwright.config.js --project=tct tests/tt01
```
