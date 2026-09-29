# Web công cụ chạy auto test VNPost

Chọn môi trường → chọn case theo module → chạy → xem/xuất báo cáo. Express + HTMX, một tiến trình Node.

Kế hoạch và các quyết định thiết kế: [`../plan_web_auto_test.md`](../plan_web_auto_test.md).

## Chạy local

```bash
cp .env.tool.example .env.tool   # rồi đọc .env.tool và điền, hoặc thêm thẳng các biến vào .env
npm run tool                     # http://localhost:4100
```

Lần đầu, `TOOL_ADMIN_USER` / `TOOL_ADMIN_PASSWORD` tạo tài khoản quản trị. Sau đó hai biến này vô tác dụng.

## Công cụ dòng lệnh (không cần web)

```bash
node tool/bin/inspect.js                          # danh sách module
node tool/bin/inspect.js 13-cong-no-diem-ban-tinh  # danh sách case + trạng thái
node tool/bin/run.js profiles
node tool/bin/run.js start <profileId> <moduleId> CNDB-ND-001,CNDB-ND-002
```

## Kiến trúc

```
tool/
├─ server.js     Express — CHỈ dịch HTTP ↔ core/, không có logic nghiệp vụ
├─ core/         hàm thuần, không biết req/res
│  ├─ modules.js    quét tai-lieu-test/*
│  ├─ cases.js      test-cases.csv ⨯ `playwright --list` → 4 trạng thái case
│  ├─ inputs.js       dữ liệu đầu vào của case: khuôn test-input.json + lớp đè trong DB → VNPOST_CASE_*
│  ├─ inputs-xlsx.js  xuất khuôn Excel / nạp lại kèm bảng đối chiếu
│  ├─ profiles.js   hồ sơ môi trường → env cho spawn
│  ├─ secrets.js    mã hoá mật khẩu tài khoản test / hash mật khẩu đăng nhập
│  ├─ runner.js     hàng đợi + spawn + stream log
│  ├─ report.js     results.json → báo cáo, so lần trước, dọn artifact
│  ├─ retention.js  xoá run cũ
│  └─ db.js         SQLite
├─ web/          auth.js, verify.js
├─ views/        EJS
└─ bin/          CLI nghiệm thu
```

Quan hệ **một chiều**: `tool/` biết về bộ test; bộ test không import gì từ `tool/`.

## Điều cần biết trước khi sửa

- **Không ghi đè `.env`.** Cấu hình đi qua `spawn(env)`; `shared/config.js` chỉ nạp `.env` khi biến
  chưa có nên biến truyền vào luôn thắng.
- **Mỗi run một `VNPOST_AUTH_DIR` riêng**, xoá ngay khi chạy xong (chứa cookie đăng nhập thật).
- **Test `DỰNG DỮ LIỆU` tự nối vào `--grep`** — người dùng không tick, nhưng thiếu nó là case chạy
  trên dữ liệu rỗng rồi SKIP, trông như lỗi sản phẩm.
- **Hàng đợi 1 run cho mỗi hồ sơ môi trường.** Không phải tối ưu — case ghi dữ liệu thật.
- **Trạng thái `SETUP_FAILED` tách khỏi `FAILED`**: hỏng đăng nhập không phải lỗi sản phẩm.
- **Artifact phục vụ qua route có kiểm tra đăng nhập**, không `express.static` — video quay màn hình
  chứa dữ liệu thật.
- **Phiên đăng nhập nằm trong SQLite** (`web/sessionStore.js`), không dùng `MemoryStore` — nếu không
  thì mỗi lần restart là cả nhóm bị đăng xuất.
- **Input của case: KHÔNG ghi đè `tai-lieu-test/<module>/test-input.json`.** File đó là khuôn +
  giá trị mặc định (nằm trong git); giá trị người dùng khai nằm ở bảng `case_inputs`, tách theo
  **hồ sơ môi trường**, và chỉ đi vào test dưới dạng biến `VNPOST_CASE_<CASE>_<FIELD>`. Ghi đè file
  là người này sửa input, run của người kia đổi theo — test vẫn xanh, chỉ là xanh trên dữ liệu người khác.
- **Chỉ bơm field đã THẬT SỰ bị đè**, không bơm cả giá trị mặc định: mọi thứ qua env đều là chuỗi,
  bơm thừa là biến số trong `test-input.json` thành chuỗi. (`shared/test-input.js` có `coerce()` ép
  lại theo kiểu của giá trị trong file — sửa một trong hai chỗ thì phải nhớ chỗ kia.)
- **Mã case nhận từ đầu title spec**, quy ước dùng chung ở `core/cases.js` và `core/report.js` —
  sửa regex phải sửa cả hai, lệch nhau thì báo cáo mất cột Mã.

## Deploy

```bash
docker build -t vnpost-test-tool .
docker run -d -p 4100:4100 -v /var/lib/vnpost-test-tool:/data \
  -e TOOL_SECRET_KEY=... -e TOOL_ADMIN_USER=admin -e TOOL_ADMIN_PASSWORD=... \
  vnpost-test-tool
```

Server cần gọi được **web dưới test + gateway** qua HTTP. Không cần truy cập MySQL/ClickHouse.
