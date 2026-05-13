# Tài liệu 05 - Bán hàng (POS)

Nguồn tài liệu:

- `5. Bán hàng (POS).docx`

Phạm vi:

- Quản lý đơn hàng đã tạo.
- Màn hình Bán hàng POS.
- Tạo đơn hàng, chọn sản phẩm/khách hàng, chiết khấu, khuyến mãi.
- Thanh toán, thanh toán sau, xem danh sách và chi tiết đơn hàng.

## Cách chạy

Chạy qua tool tổng:

```bash
./run-test-tool.sh 05-ban-hang-pos
```

Windows:

```bat
run-test-tool.cmd 05-ban-hang-pos
```

Chạy trực tiếp:

```bash
./tai-lieu-test/05-ban-hang-pos/scripts/run-playwright-report-tests.sh test
```

## Output

- Playwright report: `tai-lieu-test/05-ban-hang-pos/test-output/playwright-report/`
- Playwright results/video/trace: `tai-lieu-test/05-ban-hang-pos/test-output/playwright-results/`

## Ghi chú

Các case hiện tại ưu tiên luồng an toàn và validation theo tài liệu. Những case cần dữ liệu sản phẩm/đơn hàng thật sẽ tự ghi chú `OBSERVED_NO_DATA` nếu môi trường không có dữ liệu phù hợp.
