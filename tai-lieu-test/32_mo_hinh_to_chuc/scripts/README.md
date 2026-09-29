# Hướng dẫn sử dụng scripts test Mô hình tổ chức

Thư mục này chứa các script Playwright/Chromium dùng để test và debug module **Quản lý chuỗi > Mô hình tổ chức** trên `https://vnpost.sfin.vn/`.

## 1. Cách truyền tài khoản

Tất cả script đều đọc tài khoản từ `stdin`, không hard-code account/password trong source.

## 2. Cách chạy dễ nhất bằng tool

Tôi đã tạo wrapper:

```text
scripts/run-vnpost-test-tool.sh
```

Chạy menu:

```bash
cd /Users/manhle2001/Desktop/Script_document
./scripts/run-vnpost-test-tool.sh
```

Tool nội bộ này tự dùng account mặc định:

```text
84862036990 / 123456
```

Bạn không cần nhập account/password khi chạy tool. Các script Playwright bên dưới vẫn nhận credential qua `stdin`, để khi gửi tester có thể đổi credential hoặc truyền từ CI nếu cần.

Chạy nhanh theo lựa chọn:

```bash
./scripts/run-vnpost-test-tool.sh full
./scripts/run-vnpost-test-tool.sh full-headed
./scripts/run-vnpost-test-tool.sh full-debug
./scripts/run-vnpost-test-tool.sh full-trace
./scripts/run-vnpost-test-tool.sh smoke
./scripts/run-vnpost-test-tool.sh inspect
./scripts/run-vnpost-test-tool.sh list
./scripts/run-vnpost-test-tool.sh cleanup
```

Các alias hợp lệ:

| Lệnh | Ý nghĩa |
| --- | --- |
| `full` hoặc `1` | Chạy full E2E |
| `full-headed`, `headed` hoặc `6` | Chạy full E2E và mở browser thật |
| `full-debug`, `debug` hoặc `7` | Chạy headed + slow motion + trace + video + ảnh PASS |
| `full-trace`, `trace`, `video` hoặc `8` | Chạy headless nhưng lưu trace và video |
| `full-screenshots` | Chụp ảnh cả case PASS |
| `full-firefox` | Chạy full E2E bằng Firefox, có trace/video |
| `full-webkit` | Chạy full E2E bằng WebKit, có trace/video |
| `smoke` hoặc `2` | Chạy smoke test |
| `inspect` hoặc `3` | Dò UI/network |
| `list` hoặc `4` | List frontend bundles |
| `cleanup` hoặc `5` | Cleanup theo `unitCode` |

Ví dụ chạy full E2E:

```bash
cd /Users/manhle2001/Desktop/Script_document
./scripts/run-vnpost-test-tool.sh full
```

Ví dụ nếu bạn đang đứng trong thư mục `scripts`:

```bash
./run-vnpost-test-tool.sh full
```

Tool tự cd về project root nên output vẫn ghi đúng vào `test-output/...`.

## 3. Chế độ Playwright nâng cao

Script full E2E hỗ trợ các tính năng Playwright qua biến môi trường:

| Biến | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `PW_BROWSER` | Chọn browser: `chromium`, `firefox`, `webkit` | `PW_BROWSER=firefox` |
| `PW_HEADED` | Mở browser thật thay vì headless | `PW_HEADED=1` |
| `PW_SLOWMO` | Làm chậm mỗi thao tác theo ms | `PW_SLOWMO=400` |
| `PW_TRACE` | Lưu Playwright trace | `PW_TRACE=1` |
| `PW_VIDEO` | Record video phiên chạy | `PW_VIDEO=1` |
| `PW_SCREENSHOT_ALL` | Chụp ảnh cả case PASS | `PW_SCREENSHOT_ALL=1` |

Ví dụ chạy headed:

```bash
./scripts/run-vnpost-test-tool.sh full-headed
```

Ví dụ chạy debug đầy đủ:

```bash
./scripts/run-vnpost-test-tool.sh full-debug
```

Output nâng cao:

```text
test-output/full/trace.zip
test-output/full/videos/
test-output/full/screenshots/all/
test-output/full/screenshots/failures/
```

Mở trace bằng Playwright Trace Viewer:

```bash
npx playwright show-trace test-output/full/trace.zip
```

Nếu `npx` không có trong runtime của bạn, vẫn có thể gửi file `trace.zip` cho tester/dev mở bằng máy có Playwright.

## 4. Playwright Test HTML report

Ngoài các script standalone, tôi đã tạo bộ test chuẩn Playwright Test:

```text
playwright.config.js
tests/vnpost-org.playwright.spec.js
scripts/run-playwright-report-tests.sh
```

Chạy test và sinh HTML report:

```bash
cd /Users/manhle2001/Desktop/Script_document
./scripts/run-playwright-report-tests.sh test
```

Mở HTML report:

```bash
./scripts/run-playwright-report-tests.sh report
```

Các lệnh hữu ích:

| Lệnh | Ý nghĩa |
| --- | --- |
| `./scripts/run-playwright-report-tests.sh test` | Chạy project Chromium và sinh HTML report |
| `./scripts/run-playwright-report-tests.sh all` | Chạy Chromium, Firefox, WebKit |
| `./scripts/run-playwright-report-tests.sh headed` | Chạy Chromium có mở browser thật |
| `./scripts/run-playwright-report-tests.sh debug` | Chạy Playwright debug mode |
| `./scripts/run-playwright-report-tests.sh ui` | Mở Playwright UI mode |
| `./scripts/run-playwright-report-tests.sh report` | Mở HTML report |
| `./scripts/run-playwright-report-tests.sh trace` | Mở trace nếu test fail có sinh trace |

Report chuẩn Playwright nằm ở:

```text
test-output/playwright-report/
```

JSON result nằm ở:

```text
test-output/playwright-results/results.json
```

Nếu muốn chạy bằng account khác:

```bash
VNPOST_ACCOUNT=your_account VNPOST_PASSWORD=your_password ./scripts/run-playwright-report-tests.sh test
```

## 5. Cách chạy trực tiếp bằng Node

Cách này dùng khi không muốn dùng wrapper ở trên.

Cách chạy chung:

```bash
node scripts/<ten-script>.js
```

Sau khi chạy, nhập 2 dòng:

```text
<account>
<password>
```

Ví dụ:

```bash
node scripts/vnpost-org-full-e2e-test.js
```

## 6. Danh sách script

| File | Mục đích | Có thay đổi dữ liệu? | Output chính |
| --- | --- | --- | --- |
| `vnpost-org-full-e2e-test.js` | Chạy full E2E theo tài liệu: login, vào module, import template, thêm/sửa/xóa đơn vị test, tạo điểm bán validation, xem danh sách điểm bán, kiểm tra xuất Excel | Có, nhưng chỉ với dữ liệu test `AUTO_TEST_*` và script tự xóa | `test-output/full/vnpost-org-full-e2e-report.md`, `test-output/full/vnpost-org-full-e2e-result.json`, ảnh fail |
| `vnpost-org-smoke-test.js` | Smoke test an toàn, chỉ kiểm tra luồng chính và validation rỗng | Không | `test-output/vnpost-org-smoke-result.json`, ảnh từng bước |
| `vnpost-org-api-cleanup.js` | Script hỗ trợ cleanup/debug một `unitCode` cụ thể bằng API | Có thể gọi API xóa | Log trên terminal |
| `vnpost-org-inspect.js` | Dò UI/network: mở module, mở form thêm đơn vị, lưu text, network log và screenshot | Không xác nhận tạo/sửa/xóa | `test-output/inspect-text.txt`, `test-output/inspect-network.json`, `test-output/inspect-add-form.png` |
| `vnpost-list-scripts.js` | Dò danh sách bundle JavaScript frontend đang load | Không | `test-output/full/loaded-scripts.txt` |

## 6. Script full E2E

File:

```text
scripts/vnpost-org-full-e2e-test.js
```

Chạy:

```bash
node scripts/vnpost-org-full-e2e-test.js
```

Luồng test chính:

1. Đăng nhập.
2. Chọn phạm vi `Tổng công ty Bưu Điện Việt Nam - Admin`.
3. Mở `Quản lý chuỗi > Mô hình tổ chức`.
4. Kiểm tra cây tổ chức và ô tìm kiếm.
5. Xem chi tiết `Tổng công ty Bưu Điện Việt Nam`.
6. Mở `Nhập từ Excel`, validate chưa chọn file.
7. Tải file mẫu import.
8. Mở form `Thêm đơn vị`, validate rỗng.
9. Validate mã xã/phường sai độ dài.
10. Tạo đơn vị test dưới `Bưu điện Thành phố Hà Nội`.
11. Tìm kiếm đơn vị test.
12. Cập nhật tên đơn vị test.
13. Xóa đơn vị test và verify bằng API detail trả `404`.
14. Tìm kiếm không có kết quả.
15. Mở form `Tạo điểm bán`.
16. Validate rỗng form tạo điểm bán/hub.
17. Mở danh sách điểm bán từ chi tiết Tổng công ty.
18. Kiểm tra chức năng `Xuất Excel` theo tài liệu.

Output:

```text
test-output/full/vnpost-org-full-e2e-report.md
test-output/full/vnpost-org-full-e2e-result.json
test-output/full/screenshots/failures/*.png
test-output/full/MoHinhToChuc_Import.xlsx
```

Lưu ý:

- Script chỉ chụp ảnh khi case fail.
- Dữ liệu test được đặt prefix `AUTO_TEST_<timestamp>`.
- Script có cleanup đơn vị test bằng thao tác UI và verify lại bằng API.
- Nếu case `Xuất Excel` fail thì hiện tại là do UI không thấy nút/chức năng này trong màn `Mô hình tổ chức`.

## 4. Script smoke test

File:

```text
scripts/vnpost-org-smoke-test.js
```

Chạy:

```bash
node scripts/vnpost-org-smoke-test.js
```

Dùng khi cần kiểm tra nhanh:

- Đăng nhập.
- Chọn scope Admin.
- Vào module.
- Mở chi tiết Tổng công ty.
- Mở import Excel.
- Mở thêm đơn vị.
- Validate form thêm đơn vị rỗng.

Script này không tạo/sửa/xóa dữ liệu.

## 5. Script cleanup API

File:

```text
scripts/vnpost-org-api-cleanup.js
```

Chạy:

```bash
node scripts/vnpost-org-api-cleanup.js <unitCode>
```

Ví dụ:

```bash
node scripts/vnpost-org-api-cleanup.js 4308
```

Script sẽ:

1. Đăng nhập.
2. Gọi API detail trước khi xóa.
3. Thử gọi các endpoint DELETE đã dò được.
4. Gọi API detail sau khi xóa.

Lưu ý:

- Đây là script hỗ trợ debug/cleanup, không phải test case chính.
- Chỉ dùng với mã đơn vị test, tránh dùng với dữ liệu thật.

## 6. Script inspect/debug

File:

```text
scripts/vnpost-org-inspect.js
```

Chạy:

```bash
node scripts/vnpost-org-inspect.js
```

Output:

```text
test-output/inspect-text.txt
test-output/inspect-network.json
test-output/inspect-add-form.png
```

Dùng khi:

- Cần dò text/selector trên màn hình.
- Cần xem request/response API khi thao tác UI.
- Cần debug trước khi sửa script E2E.

## 7. Script list frontend bundles

File:

```text
scripts/vnpost-list-scripts.js
```

Chạy:

```bash
node scripts/vnpost-list-scripts.js
```

Output:

```text
test-output/full/loaded-scripts.txt
```

Dùng khi cần biết website đang load các bundle JS nào để dò endpoint/API hoặc logic frontend.

## 8. Bộ file import test

Các file import test nằm ở:

```text
test-output/import-cases/
```

Tài liệu riêng:

[README import cases](/Users/manhle2001/Desktop/Script_document/test-output/import-cases/README.md)

Các file này được sinh từ template `MoHinhToChuc_Import.xlsx`, gồm các case hợp lệ, thiếu trường, sai mã, parent không tồn tại và trùng mã.

## 9. Khuyến nghị sử dụng

Thứ tự chạy nên dùng:

1. Chạy `vnpost-org-smoke-test.js` để kiểm tra login/module còn hoạt động.
2. Chạy `vnpost-org-full-e2e-test.js` để test đầy đủ.
3. Nếu case fail do selector hoặc UI đổi, chạy `vnpost-org-inspect.js` để lấy thêm thông tin.
4. Nếu cần cleanup thủ công một đơn vị test, dùng `vnpost-org-api-cleanup.js`.

Không nên chạy file import hợp lệ trên dữ liệu thật nếu chưa thống nhất cleanup sau import.
