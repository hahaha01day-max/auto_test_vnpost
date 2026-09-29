# Kế hoạch — Web công cụ chạy auto test VNPost

> Trạng thái: GĐ 1–8 **đã viết xong**; GĐ 9 (Google Sheet) chưa làm. Cập nhật: 2026-09-18 (bản 3 — bổ sung **M5 dữ liệu đầu vào của case**;
> bản 2 ngày 2026-09-17 — **deploy web ngay đợt này**).
> Hướng đã chốt: **Express + HTMX**, nằm trong `auto_test_vnpost/tool/`, **nhiều người dùng chung, chạy trên server**.

## 0. Mục tiêu

Một web nội bộ **dùng chung cho cả nhóm test** để:

1. cấu hình thông tin môi trường (URL hệ thống, tài khoản theo vai);
2. chọn test case theo module;
2b. **khai dữ liệu đầu vào cho từng case** — nhập trên giao diện, nạp từ Excel, hoặc đọc từ Google Sheet;
3. bấm chạy — hệ thống tự chạy Playwright theo đúng các case đã chọn;
4. xem và xuất báo cáo kết quả.

🔴 **Khác bản 1:** không còn giai đoạn "chạy local rồi tính sau". Mọi thứ thiết kế cho nhiều người
dùng đồng thời **ngay từ GĐ 1**, vì 4 điểm ở mục 3 nếu làm sai thì phải viết lại chứ không vá được.

## 1. Điểm tựa đã có sẵn (không làm lại từ đầu)

| Thứ đã có | Ở đâu | Dùng cho |
|---|---|---|
| 12 module test | `tai-lieu-test/<NN-ten-module>/` | Danh sách module = quét thư mục này |
| Danh mục case | `test-cases.csv` | Dữ liệu màn "chọn case" |
| **Title spec đã mang mã case** — `test('CNDB-ND-001 - ...')` | `tests/*.spec.js` | Chạy đúng case đã chọn bằng `--grep`, **không phải refactor spec** |
| **Mỗi module có `playwright.config.js` riêng, khai project theo vai** | vd `13-.../playwright.config.js` có `setup`/`shop`/`province` | Dùng **config của chính module**, không dùng `playwright.dynamic.config.js` |
| Đăng nhập theo vai, lưu session | `shared/auth/roles.setup.js` → `.auth/<vai>.json` | Khai tài khoản theo vai |
| **`shared/config.js` chỉ nạp `.env` khi biến CHƯA có** (`process.env[key] === undefined`) | `shared/config.js` | ⭐ Biến truyền qua `spawn` **thắng** file `.env` ⇒ **không cần ghi `.env` chung** |
| Reporter JSON + HTML + video + trace | mỗi `playwright.config.js` | Nguồn dữ liệu báo cáo |
| Quét thư mục module | `run-test-tool.sh:15-22` | Bê sang `core/modules.js` |

Đã đo thực tế: `PLAYWRIGHT_JSON_OUTPUT_NAME=<file> npx playwright test --config <module>/playwright.config.js --list --reporter=json`
trả về **36 test** cho module 13 (gồm cả project `setup`), parse được cây `suites/specs/tests` → lấy `title`, `file`, `projectName`.

## 2. Cấu trúc thư mục

Đặt **trong** `auto_test_vnpost/` — Playwright cần `cwd` này để thấy `node_modules/`, `.auth/`, `tai-lieu-test/`.
Quan hệ **một chiều**: `tool/` biết về project test; project test **không** import gì từ `tool/`.

```
auto_test_vnpost/
├─ tool/
│  ├─ server.js                # Express: route, session, SSE — MỎNG
│  ├─ core/                    # ⚠️ KHÔNG dính req/res
│  │  ├─ modules.js            # quét tai-lieu-test/*, đọc test-cases.csv
│  │  ├─ cases.js              # CSV ⨯ `playwright --list` → trạng thái case
│  │  ├─ profiles.js           # hồ sơ môi trường (CRUD, mã hoá secret)
│  │  ├─ runner.js             # hàng đợi + spawn + stream log
│  │  ├─ report.js             # results.json → báo cáo, so lần trước
│  │  └─ db.js                 # SQLite (better-sqlite3)
│  ├─ web/
│  │  ├─ auth.js               # đăng nhập người dùng công cụ
│  │  └─ routes/               # config, modules, runs, reports
│  ├─ views/                   # EJS
│  └─ public/                  # htmx.min.js + 1 CSS (tự host, KHÔNG CDN)
├─ tool-data/                  # 🔴 gitignore — DB, hồ sơ, artifact (volume khi deploy)
│  ├─ tool.sqlite
│  ├─ auth-runs/<runId>/       # storageState riêng từng run
│  └─ runs/<runId>/            # log, results.json, video, trace, snapshot cấu hình
└─ Dockerfile
```

## 3. 🔴 Bốn thay đổi kiến trúc bắt buộc vì deploy dùng chung

Đây là phần khác hẳn bản 1. Mỗi điểm đều gây **sai im lặng** — test vẫn xanh nhưng vô nghĩa.

### 3.1 Không ghi `.env` chung — truyền env qua `spawn`
Bản 1 định ghi cấu hình vào `.env`. Nhiều người dùng chung thì người này đổi URL là người kia
chạy nhầm môi trường, **test vẫn xanh trên môi trường sai**.

→ Cấu hình lưu thành **hồ sơ môi trường** trong SQLite. Lúc chạy, `runner.js` dựng object env rồi
truyền vào `spawn(..., { env })`. Tận dụng đúng hành vi đã kiểm chứng của `shared/config.js`
(chỉ nạp `.env` khi biến chưa có) ⇒ **không chạm vào file `.env` nào cả**.

### 3.2 `.auth/` phải tách theo run
`shared/config.js` đang hardcode `AUTH_DIR = path.join(PROJECT_ROOT, '.auth')` — **toàn cục**.
Hai run song song với môi trường/tài khoản khác nhau sẽ **ghi đè session của nhau**; đúng cái bẫy mà
comment trong `13-.../playwright.config.js` đã cảnh báo ("hai vai dùng chung storageState → pass/fail
ngẫu nhiên theo thứ tự chạy"), nhưng ở quy mô giữa các run.

→ Sửa **1 dòng** ở `shared/config.js`:
```js
const AUTH_DIR = process.env.VNPOST_AUTH_DIR || path.join(PROJECT_ROOT, '.auth');
```
Mỗi run cấp `tool-data/auth-runs/<runId>/`. Đây là **thay đổi duy nhất chạm vào project test**.

### 3.3 Output phải tách theo run
`outputDir` và reporter đang hardcode `<module>/test-output/...`. Hai run cùng module ghi đè nhau.

→ Lúc spawn, ghi đè hết bằng CLI/env:
```
--output=tool-data/runs/<runId>/artifacts
PLAYWRIGHT_JSON_OUTPUT_NAME=tool-data/runs/<runId>/results.json
PLAYWRIGHT_HTML_OUTPUT_DIR=tool-data/runs/<runId>/html
```

### 3.4 Hàng đợi là bắt buộc, không phải tối ưu
`workers: 1` + các case **ghi dữ liệu thật** (module 13 công nợ, 10 NCC, 11 kho) ⇒ hai người cùng bấm
chạy trên cùng môi trường sẽ phá dữ liệu của nhau.

→ Hàng đợi **1 run đang chạy tại một thời điểm cho mỗi môi trường**; run sau ở trạng thái `QUEUED`,
hiện rõ "đang chờ sau run của <ai>". Run khác môi trường có thể cho chạy song song (cấu hình được,
mặc định **tắt**).

## 4. Năm màn hình

### M1 — Hồ sơ môi trường
- Mỗi hồ sơ: tên, `VNPOST_BASE_URL`, `VNPOST_API_BASE_URL`, bộ tài khoản theo vai.
- Vai đọc từ `shared/auth/accounts.js`; hiện vai nào đã cấu hình / còn thiếu.
- **Kiểm tra kết nối**: ping BASE_URL + thử đăng nhập từng vai → ✅/❌ kèm lý do, **trước khi** chạy.
- Mật khẩu **write-only**: hiển thị `••••` + "đã cấu hình", không render giá trị thật; mã hoá at-rest
  bằng khoá lấy từ biến môi trường `TOOL_SECRET_KEY` của server.
- Hồ sơ trỏ prod → gắn nhãn đỏ + chặn mặc định mọi case `GHI DỮ LIỆU`.

### M2 — Chọn case theo module
- Cây 2 cấp Module → Case; dữ liệu `test-cases.csv` **đối chiếu** `playwright --list`.
- Badge: `RUNNABLE` · `CHƯA CÓ SCRIPT` (có CSV, không spec) · `MỒ CÔI` (có spec, không CSV) · `GHI DỮ LIỆU`.
- Test thuộc project `setup` **không** hiện như case — nó là bước đăng nhập, không phải case nghiệp vụ.
- Hover ra tiền điều kiện + bước kiểm thử từ CSV.
- Lưu được thành **bộ chạy** đặt tên, dùng lại.

### M3 — Chạy & theo dõi
- Chọn hồ sơ môi trường → chọn case → chạy. Log SSE realtime, tiến độ `x/y`, pass/fail từng case.
- Hàng đợi hiện ai đang chạy gì; dừng được run của chính mình.
- 🚫 **Bỏ tuỳ chọn headed** khi chạy trong container (không có X server).

### M4 — Báo cáo
- Parse `results.json` → bảng: mã case, tên, vai (projectName), thời lượng, trạng thái, lỗi rút gọn.
- Chi tiết: screenshot, video, trace; **serve qua route có kiểm tra đăng nhập**, không mở thư mục tĩnh.
- Tổng hợp: tỷ lệ pass theo module, danh sách fail, **so lần chạy trước** (regression mới hay fail cũ).
- Xuất Excel + PDF.
- Mỗi run lưu kèm **snapshot hồ sơ môi trường** (không kèm mật khẩu) — sau còn truy được chạy trên đâu.

### M5 — Dữ liệu đầu vào của case

Hiện input của case nằm ở **3 nguồn**, ưu tiên cao thắng thấp — cơ chế này **đã có và đã kiểm chứng**,
màn M5 chỉ dựng mặt tiền lên trên, không đổi cơ chế:

| Ưu tiên | Nguồn | Nội dung | Ai nạp |
|---|---|---|---|
| 1 | Biến môi trường `VNPOST_CASE_<CASE_ID>_<FIELD>` | Đè từng field của từng case | `shared/test-input.js` → `envKey()` |
| 2 | `tai-lieu-test/<module>/test-input.json` | `enabled`, `mutates`, `allowMutation`, `required[]`, `data{}` | `loadCaseInput(moduleDir, caseId)` |
| 3 | `.env` / `.env.accounts.*` | Secret: URL, tài khoản, mật khẩu theo vai | `shared/config.js` — chỉ set khi biến **chưa** tồn tại |

⭐ **Điểm tựa:** vì env thắng file (mục 3.1), cả ba cách khai báo dưới đây chỉ là **ba mặt tiền đổ vào
cùng một chỗ**: bảng `case_inputs` trong SQLite của tool → runner dịch ra `VNPOST_CASE_*` bơm qua `spawn`.
**Không sửa spec, không sinh file JSON tạm.**

🔴 **CẤM ghi đè `test-input.json` trong repo.** File đó nằm trong git và server dùng chung: người này sửa
input là run của người kia đổi dữ liệu theo — test **vẫn xanh**, chỉ là xanh trên input của người khác,
không có lỗi nào để bắt. Đây đúng là cái bẫy mà mục 3.1 đã tránh với `.env`. File JSON trong repo là
**giá trị mặc định + khuôn mô tả field**; DB là lớp đè theo `(profile_id, module_id, case_id)`.

**(a) Khai trên giao diện** — làm trước, rẻ nhất.
Tool đọc `test-input.json` làm *khuôn*: biết case có field gì, field nào `required`, có `mutates` không.
Render form ngay dưới mỗi case ở M2. Field trống mà `required` → hiện đúng cảnh báo `skipReason()` sẽ báo,
**trước khi** chạy chứ không đợi test skip.

**(b) Nạp từ Excel** — `exceljs` đã có trong deps (mục 11), không thêm phụ thuộc.
Sheet phẳng `case_id | field | value`. **Phải có cả nút xuất khuôn** để tester tải về điền rồi nạp lên —
quan trọng hơn nút nhập, vì không ai gõ đúng tên field nếu không có mẫu. Nhập xong hiện bảng đối chiếu
(dòng nào tạo mới / dòng nào đè / dòng nào không khớp case ID) rồi mới xác nhận.

**(c) Đọc từ Google Sheet** — được, nhưng đắt hơn hẳn; tách ra làm sau. Ba điểm phải chốt trước:
- **Xác thực**: server nội bộ, không OAuth theo từng người → **service account**, chia sẻ sheet cho email
  của nó. Thêm `googleapis` + chỗ cất key JSON (cùng cơ chế `TOOL_SECRET_KEY` như mật khẩu hồ sơ).
- **Chiều đồng bộ**: **một chiều, đọc lúc bấm Run**, sheet là nguồn sự thật. Hai chiều phải xử lý xung đột — không đáng.
- 🔴 **Sheet nằm ngoài server → CẤM để mật khẩu/tài khoản ở đó.** Chỉ dữ liệu nghiệp vụ; secret vẫn nằm
  trong hồ sơ môi trường đã mã hoá at-rest.

🔴 **Việc chặn thật sự không nằm ở màn hình:** **46/48 module chưa có `test-input.json`**
(mới có `13-cong-no-diem-ban-tinh`, `35-gia-von-mac-dinh`; thêm 10 spec đọc thẳng `process.env.VNPOST_*`,
phần còn lại hardcode trong spec). Không có khuôn thì UI không biết render field nào. Hai lối ra:
suy khuôn từ `test-cases.csv`, hoặc bổ sung dần file input theo từng module bằng skill `test-scenario`.
Khối lượng này **lớn hơn bản thân màn hình web** — xem câu hỏi chặn số 3.

## 5. Route

| Route | Trả về |
|---|---|
| `GET /login` · `POST /login` · `POST /logout` | Đăng nhập người dùng công cụ |
| `GET /` | Danh sách hồ sơ môi trường |
| `POST /profiles` · `PUT /profiles/:id` | Tạo/sửa hồ sơ |
| `POST /profiles/:id/verify` | Ping + thử login từng vai → fragment ✅/❌ |
| `GET /modules` | Danh sách module + số case |
| `GET /modules/:id/cases` | Fragment cây case |
| `GET /modules/:id/inputs` · `POST /modules/:id/inputs` | Form dữ liệu đầu vào của case (theo hồ sơ) |
| `GET /modules/:id/inputs/template.xlsx` | Tải khuôn Excel để điền |
| `POST /modules/:id/inputs/import` | Nạp Excel → bảng đối chiếu trước khi xác nhận |
| `POST /modules/:id/inputs/sheet-sync` | (GĐ 9) Kéo dữ liệu từ Google Sheet |
| `POST /runs` | `{profileId, moduleId, caseIds[]}` → `runId` (có thể `QUEUED`) |
| `GET /runs/:id` | Trang theo dõi (`hx-ext="sse"`) |
| `GET /runs/:id/stream` | **SSE**: log + pass/fail từng case |
| `POST /runs/:id/stop` | Dừng (chỉ chủ run hoặc admin) |
| `GET /runs/:id/report` · `/export.xlsx` · `/export.pdf` | Báo cáo |
| `GET /runs/:id/artifacts/*` | Video/screenshot/trace — **có kiểm tra quyền** |
| `GET /runs` | Lịch sử + hàng đợi |

HTMX gánh: `hx-post` form, `hx-get`+`hx-target` cây case, `sse-swap` log — **không viết JS thủ công cho stream**.

## 6. Lệnh chạy thực tế

```bash
# cwd = auto_test_vnpost
VNPOST_BASE_URL=<từ hồ sơ> \
VNPOST_API_BASE_URL=<từ hồ sơ> \
VNPOST_ACC_<VAI>=... VNPOST_PWD_<VAI>=... \
VNPOST_AUTH_DIR=tool-data/auth-runs/<runId> \
PLAYWRIGHT_JSON_OUTPUT_NAME=tool-data/runs/<runId>/results.json \
PLAYWRIGHT_HTML_OUTPUT_DIR=tool-data/runs/<runId>/html \
FORCE_COLOR=0 \
npx playwright test \
  --config tai-lieu-test/13-cong-no-diem-ban-tinh/playwright.config.js \
  --output tool-data/runs/<runId>/artifacts \
  --grep "CNDB-ND-001|CNDB-ND-002" \
  --reporter=line,json
```

- Mã case phải **escape regex** rồi nối `|`. Danh sách >100 case → bỏ `--grep`, lọc lúc báo cáo.
- `--grep` **không được loại project `setup`** (nó phải chạy để có session). Lọc hiển thị ở tầng báo cáo.
- `spawn` với `stdio: pipe`, đọc từng dòng, đẩy SSE.

## 7. Deploy

- **Image**: `mcr.microsoft.com/playwright:v1.59.1-jammy` — 🔴 ghim **đúng 1.59.1** khớp `devDependencies`, lệch version là lỗi khó hiểu.
- **Volume**: `tool-data/` (DB + artifact). Mất volume = mất toàn bộ lịch sử.
- **Biến môi trường server**: `TOOL_SECRET_KEY` (mã hoá mật khẩu tài khoản test), `TOOL_PORT`, `TOOL_ADMIN_*` (tài khoản admin khởi tạo).
- **Chạy non-root**, không mount `.env` của máy dev vào.
- 🔴 **Ràng buộc mạng**: server chỉ cần thấy **web dưới test + gateway** qua HTTP.
  ⚠️ Bản 2 từng ghi "phải thấy MySQL prod/UAT" — **SAI**, đã kiểm và bỏ: project test không có
  client MySQL/ClickHouse nào (`dependencies` chỉ có Playwright), mọi thứ đi qua trình duyệt tới
  `BASE_URL`. Chạm DB là việc của backend VNPost, không phải của máy chạy test.
  Vẫn là **ràng buộc hạ tầng, không phải code** — xác nhận với bên vận hành TRƯỚC GĐ 7.
- 🔴 **Dung lượng**: các module đang để `video: 'on'` — quay **mọi** test. Trên server dùng chung sẽ đầy đĩa
  trong vài tuần. Ghi đè thành `retain-on-failure` khi chạy từ tool, + job dọn run cũ hơn N ngày (mặc định 30).

## 8. Lộ trình

| GĐ | Làm gì | Nghiệm thu |
|---|---|---|
| **1** | `core/modules.js` + `core/cases.js` | In ra 12 module; module 13 đủ 32 case, badge đúng, loại `setup` khỏi danh sách case |
| **2** | `core/db.js` + `core/profiles.js` | Tạo/sửa hồ sơ, mật khẩu mã hoá, đọc lại ra env object đúng |
| **3** | `core/runner.js` + `core/report.js` (chưa có web) | Chạy 2 case bằng hàm với run-id riêng; `.auth` + output nằm trong `tool-data/runs/<id>/`; 2 run liên tiếp không đè nhau |
| **4** | `server.js` + đăng nhập + M2/M3 + SSE | Hai trình duyệt khác nhau: người A chạy, người B thấy `QUEUED` |
| **5** | M1 hồ sơ + verify tài khoản | Đổi hồ sơ → run kế tiếp trỏ đúng môi trường |
| **6** | M4 báo cáo + xuất Excel/PDF | File gửi QC |
| **7** | Dockerfile + deploy + job dọn artifact | Chạy trên server, tester truy cập bằng trình duyệt |
| **8** | M5 (a) form input + (b) xuất/nạp Excel | ✅ **xong 2026-09-18** — xem Phụ lục D |
| **9** | M5 (c) Google Sheet, một chiều | Sửa ô trên sheet → bấm Run → giá trị vào đúng case |

GĐ 1–3 **cố ý chưa có web**: phần khó nằm ở đó.

## 9. Rủi ro đã biết

1. 🔴 **Case chạy GHI dữ liệu thật** (module 13, 10, 11) — cảnh báo đỏ + chặn mặc định trên hồ sơ prod, chỉ mở khi tick xác nhận.
2. **Thiếu `test-cases.csv`**: `01`, `04`, `11`, `12`, `quan-ly-nhan-vien` chưa có; `02`, `05` dùng header khác
   (`ID,Nhom,Test case,Ky vong` thay vì `ID,Ten test case,Tien dieu kien,Buoc kiem thu,Ket qua ky vong`).
   → `core/cases.js` phải **nhận cả hai bộ header**, thiếu cột thì để trống chứ không vỡ.
   Bổ sung CSV bằng skill `test-scenario` — việc độc lập, làm song song được.
3. **CSV có dấu phẩy và ngoặc kép trong ô** (xem module 13) → dùng parser CSV đúng chuẩn, **không `split(',')`**.
4. **`.gitignore` đang chặn `.env*`, `test-output/`** — giữ nguyên, **thêm `tool-data/`**.
5. **Node v22.16.0, project CommonJS** (không có `"type": "module"`) — viết `require`, đừng ESM.
6. 🔴 **46/48 module chưa có `test-input.json`** — M5 không có khuôn để render. Việc bổ sung khuôn nặng hơn
   phần web; làm song song bằng skill `test-scenario`, không chặn GĐ 1–7.
7. **Sửa tối thiểu trong project test — hiện là 2 chỗ**: `AUTH_DIR` ở `shared/config.js` (mục 3.2) và
   `coerce()` ở `shared/test-input.js` (Phụ lục D.3). Mọi thứ khác của `tai-lieu-test/` giữ nguyên.

## 10. Câu hỏi chặn — cần chốt trước GĐ 7

1. **Server đặt ở đâu** và nó có gọi được **web dưới test + gateway** qua HTTP không?
   (Không cần tới MySQL/ClickHouse — xem đính chính ở mục 7.)
2. **Đăng nhập vào công cụ** dùng tài khoản riêng của tool (tự quản trong SQLite) hay đấu nối SSO/LDAP nội bộ?

3. **Dữ liệu đầu vào (M5)**: bổ sung `test-input.json` cho 46 module còn lại theo thứ tự nào, hay để tool
   suy khuôn từ `test-cases.csv`? Câu này chặn GĐ 8, không chặn GĐ 1–7.
4. **Google Sheet (GĐ 9)** có thật sự cần không, hay Excel là đủ? Nếu cần thì ai cấp được service account
   Google Workspace của tổ chức?

Hai câu 1–2 chỉ chặn GĐ 7. GĐ 1–6 làm được ngay, không phụ thuộc câu trả lời.

---

# Phụ lục A — Kết quả GĐ 1 (đo thực tế 2026-09-17)

Đã viết `tool/core/modules.js`, `tool/core/cases.js`, `tool/bin/inspect.js`. Quét toàn bộ 12 module:

| Module | Tổng | Chạy được | Chưa có script | Mồ côi | Ghi DL | Setup | Fixture | Không mã |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| 01-mo-hinh-to-chuc | 3 | 0 | 0 | 3 | 2 | 1 | 0 | 0 |
| 02-phan-quyen-vai-tro | 12 | **12** | 0 | 0 | 5 | 0 | 0 | 0 |
| 04-quan-ly-san-pham... | 17 | 0 | 0 | 17 | 3 | 0 | 0 | 0 |
| 05-ban-hang-pos | 15 | **15** | 0 | 0 | 8 | 0 | 0 | 0 |
| 08-khach-hang-than-thiet | 12 | **12** | 0 | 0 | 7 | 0 | 0 | 0 |
| 09-chuong-trinh-khuyen-mai | 32 | **0** | 32 | 0 | 17 | 0 | 0 | **45** |
| 10-nha-cung-cap | 25 | **0** | 10 | 15 | 7 | 0 | 0 | 0 |
| 11-kho | 19 | 0 | 0 | 19 | 5 | 0 | 0 | 0 |
| 12-don-vi-van-tai | 0 | **0** | 0 | 0 | 0 | 0 | 0 | **72** |
| 13-cong-no-diem-ban-tinh | 31 | **28** | 3 | 0 | 8 | 6 | 2 | 0 |
| 35-gia-von-mac-dinh | 23 | **20** | 0 | 3 | 3 | 6 | 0 | 0 |
| quan-ly-nhan-vien | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |

Thời gian `--list` mỗi module: 0.6–1.0s → đủ nhanh để gọi trực tiếp khi mở màn chọn case, chưa cần cache.

## A.1 🔴 Phát hiện chặn: quy ước "mã case nằm đầu title" KHÔNG phủ hết repo

> ⚠️ **Mục này đã được xử lý xong — xem Phụ lục C.** Giữ lại để ghi nhận quá trình.
> Hai chỗ trong mục này về sau đo lại thấy SAI, Phụ lục C nói rõ.

Kế hoạch bản 1 và 2 đều dựa vào giả định này. Đo ra: **chỉ 5/12 module** chọn được case lẻ
(02, 05, 08, 13, 14). Ba kiểu lệch:

1. **09 — đặt tên khác hẳn.** CSV dùng `CTKM-001`, spec dùng `TC 01: Giảm 10% giá trị đơn`.
   45 test không gắn được mã nào ⇒ 32 case CSV báo "chưa có script" dù script **có tồn tại**.
2. **10 — mã lệch cấp.** CSV `NCC-C1-001`, spec `NCC-001` ⇒ 10 case CSV mồ côi một đầu, 15 spec mồ côi đầu kia.
3. **12 — tiền tố khác.** Spec `Vantai_10 ...`, không có CSV.

**Hệ quả với UI:** 7 module còn lại chỉ chạy được **nguyên module**, không tick lẻ case.

**Hướng xử lý** (chưa làm, cần chốt):
- (a) Đổi title spec cho khớp CSV — đúng gốc, nhưng sửa ~117 test ở 3 module;
- (b) Thêm cột `spec_title` vào `test-cases.csv` để khai ánh xạ thủ công — không đụng spec;
- (c) Chấp nhận: module chưa chuẩn hoá thì UI chỉ cho "chạy cả module".
→ Đề xuất: **(c) trước mắt** để không chặn GĐ 2–7, rồi (a) dần bằng skill `test-scenario`.

## A.2 🔴 Test "DỰNG DỮ LIỆU" — runner bắt buộc phải tự nối vào `--grep`

Module 13 có 2 test `DỰNG DỮ LIỆU - ...` ở project `shop` và `province`. Chúng **không phải case**
nhưng case khác phụ thuộc. Tick CNDB-CD-006 rồi chỉ `--grep "CNDB-CD-006"` là case chạy trên dữ liệu
rỗng → SKIP/FAIL, trông như lỗi sản phẩm. `core/cases.js` đã tách riêng `fixtureTests`;
**`runner.js` (GĐ 3) phải nối chúng vào `--grep`**, không để người dùng tick.

## A.3 Cờ "ghi dữ liệu" phải có bộ lọc case âm

Bản đầu chỉ dò động từ ghi → gắn cờ **25/31** case module 13, cờ thành vô nghĩa.
Thêm bộ lọc "tên mở đầu bằng dấu hiệu case đọc / case bị chặn" (`Chặn…`, `Không…`, `Màn…`, `Cảnh báo…`)
→ còn **8/31**, đúng các case thật sự ghi (tạo bản khai, duyệt và ký, xác nhận chuyến…).
Vẫn là phỏng đoán — **về lâu dài nên thêm hẳn một cột trong `test-cases.csv`** để tài liệu tự khai.

## A.4 Đã xác nhận xử lý đúng các biến thể

- **Hai bộ header CSV** (`02`,`05` khác phần còn lại) — parser nhận cả hai, thiếu cột để rỗng.
- **CSV có phẩy / ngoặc kép lồng / xuống dòng trong ô** — parser RFC4180, không `split(',')`.
- **Module không có config riêng** (`quan-ly-nhan-vien`) — rơi về `playwright.dynamic.config.js` + `DOC_TEST_DIR`.
- **Module có 2 config** (`12`) — lấy `playwright.config.js` làm mặc định, giữ danh sách còn lại.
- **Project `setup`** — loại khỏi danh sách case, đếm riêng.
- **`.gitignore`** — đã thêm `tool-data/`.


---

# Phụ lục B — Kết quả GĐ 2–7 (2026-09-17)

Đã dựng xong toàn bộ, chạy thật trên trình duyệt. Chi tiết vận hành: [`tool/README.md`](tool/README.md).

| GĐ | Nội dung | Trạng thái |
|---|---|---|
| 2 | `core/db.js`, `core/secrets.js`, `core/profiles.js` | ✅ hồ sơ + mã hoá mật khẩu |
| 3 | `core/runner.js`, `core/report.js` + vá `shared/config.js` | ✅ chạy thật, log + results.json |
| 4 | `server.js`, đăng nhập, M2/M3, SSE | ✅ kiểm trên trình duyệt |
| 5 | M1 hồ sơ + kiểm tra kết nối | ✅ |
| 6 | M4 báo cáo + xuất Excel | ✅ |
| 7 | Dockerfile, dọn run cũ | ✅ code xong, **chưa deploy** (chờ mục 10) |

## B.1 Đã kiểm chứng bằng chạy thật

- Đăng nhập → tạo hồ sơ → khai tài khoản 2 vai → mở module 13 → tick `CNDB-ND-001` → bấm Chạy.
- `--grep` sinh ra đúng: `CNDB-ND-001|DỰNG DỮ LIỆU|DUNG DU LIEU` → chạy 9 test (6 setup + 2 dựng dữ liệu + 1 case).
- Log chảy realtime qua SSE; artifact và `results.json` nằm trong `tool-data/runs/<runId>/`.
- Thư mục session `tool-data/auth-runs/<runId>/` bị **xoá sạch** khi run kết thúc.
- Báo cáo hiện đúng, xuất Excel 7KB mở được, tải được ảnh/video/trace.
- Gọi artifact khi **chưa đăng nhập** → 302 về `/login`.

Môi trường thử là `http://localhost:3000` (không có app) nên bước đăng nhập hỏng — đúng như mong đợi,
và chính nó làm lộ giá trị của trạng thái `SETUP_FAILED` ở B.2.

## B.2 Quyết định thiết kế phát sinh trong lúc làm

1. 🔴 **Trạng thái `SETUP_FAILED` tách khỏi `FAILED`.** Hỏng ở bước đăng nhập không phải lỗi sản phẩm.
   Gộp chung thì báo cáo ghi "0% đạt" và cả nhóm đi tìm bug, trong khi thật ra chỉ sai URL hoặc sai
   mật khẩu. Báo cáo có banner đỏ nói thẳng "đừng đọc tỉ lệ đạt bên dưới như lỗi sản phẩm".
2. 🔴 **Nhận run mồ côi phải kiểm PID còn sống**, không được cứ thấy `RUNNING` là dọn. Bản đầu dọn mù,
   và CLI chạy song song đã đánh dấu ERROR cho run mà tiến trình khác **đang chạy thật** — hàng đợi
   khi đó thả thêm run thứ hai vào cùng môi trường, đúng cái nó sinh ra để ngăn.
3. 🔴 **Link artifact phải lấy mốc là `artifacts/`**, không phải thư mục run. Lấy nhầm mốc thì link
   thành `/artifacts/artifacts/...`: báo cáo trông vẫn đầy đủ, bấm vào thì 404.
4. **Dọn artifact của case ĐẠT sau mỗi run.** Mọi module để `video: 'on'`; Playwright không có cờ CLI
   đổi `video`, nên xoá sau là cách rẻ nhất. Thêm `core/retention.js` xoá run cũ hơn 30 ngày.
5. **`FORCE_COLOR=0` + `CI=1` KHÔNG đủ** để log sạch — reporter vẫn phát mã di chuyển con trỏ
   (`ESC[1A`, `ESC[2K`). Phải bóc ANSI khi ghi log.
6. **Ô mật khẩu để trống = giữ nguyên**, không phải xoá. Coi là xoá thì mỗi lần sửa tên tài khoản là
   mất mật khẩu, và lỗi chỉ lộ lúc chạy test.
7. **Kiểm tra kết nối dùng lại chính `roles.setup.js`** của bộ test, không viết lại logic đăng nhập —
   viết lại là hai bản lệch nhau, verify xanh mà test vẫn đỏ.
8. 🔴 **Phiên đăng nhập lưu vào SQLite, không dùng `MemoryStore`** (phát hiện lúc thử restart server).
   MemoryStore rò rỉ bộ nhớ, không chia sẻ được giữa nhiều tiến trình, và **mất sạch mỗi lần restart**.
   Vì công cụ còn tự dọn run mồ côi lúc khởi động, người dùng sẽ thấy "bị đăng xuất ngẫu nhiên" mà
   không hiểu vì sao. `web/sessionStore.js` dùng chung `tool.sqlite`, không thêm phụ thuộc.

## B.3 Thay đổi duy nhất chạm vào bộ test

`tai-lieu-test/shared/config.js` — `AUTH_DIR` nhận `process.env.VNPOST_AUTH_DIR`. Chạy tay không đặt
biến này thì hành vi y như cũ.

## B.4 Phụ thuộc mới

`express`, `express-session`, `ejs`, `better-sqlite3`, `exceljs`, `htmx.org` (tự host, không CDN).
⚠️ `npm audit` báo 1 lỗ mức moderate: `exceljs` → `uuid` (thiếu kiểm biên `buf` ở v3/v5/v6).
Công cụ không truyền `buf` nên không chạm đường lỗi; cần theo dõi bản vá của `exceljs`.


---

# Phụ lục C — Chuẩn hoá mã case (2026-09-17)

Kết quả: **cả 12 module đều tick được từng case**, tổng case chọn được **165 → 265**.

| Module | Trước | Sau | Cách xử lý |
|---|--:|--:|---|
| 12-don-vi-van-tai | 0 | **72** | Nới regex nhận mã — **không sửa spec** |
| 09-chuong-trinh-khuyen-mai | 0 | **45** | Đổi title 45 test |
| quan-ly-nhan-vien | 0 | **4** | Đổi title 4 test |
| 10-nha-cung-cap | 15 | 15 | **Không đụng** — xem C.3 |
| 9 module còn lại | 150 | 150 | không đổi |

## C.1 Đính chính hai kết luận sai ở Phụ lục A

1. **"Chỉ 5/12 module chọn được case lẻ"** — SAI. Case `MỒ CÔI` (có spec, không có trong CSV) vẫn
   `selectable`, nên `01`, `04`, `10`, `11` vốn đã tick được. Thực tế chỉ **3 module** vướng:
   `09`, `12`, `quan-ly-nhan-vien`.
2. **"`10` — mã lệch cấp, CSV `NCC-C1-001` vs spec `NCC-001`"** — mô tả đúng hiện tượng nhưng sai
   nguyên nhân. Không phải cùng một bộ case đánh số lệch: xem C.3.

## C.2 Ba module, ba nguyên nhân khác nhau

**`12-don-vi-van-tai` — không phải lỗi đặt tên.** `Vantai_10` chính là mã case trong nguồn
`resource/don_vi_van_tai.xlsx`. Lỗi nằm ở **regex của công cụ**: nó chỉ nhận chữ HOA nối bằng gạch
ngang. Đã nới để nhận cả `Vantai_10`, với ràng buộc **đoạn cuối bắt buộc có chữ số** — không có ràng
buộc này thì một tiêu đề như "Check-in khách hàng" bị nhận nhầm `Check-in` là mã case.
Regex phải **khớp y hệt** ở cả `core/cases.js` và `core/report.js`; lệch nhau thì màn chọn case nhận
ra mã còn báo cáo thì không, và việc so với run trước mất khoá đối chiếu.

**`09-chuong-trinh-khuyen-mai` — title có mã nhưng sai định dạng.** 45 test đặt `TC 01:`, `TC SP-01:`,
`TC DM-01:`, `TC CB-01:` — dấu cách sau `TC` làm nó không phải mã. Đổi theo đúng nhóm sẵn có,
giữ nguyên ngữ nghĩa:

| Cũ | Mới | Số test |
|---|---|--:|
| `TC 01:` | `CTKM-POS-DH-01 - ` (DH = theo đơn hàng) | 6 |
| `TC SP-01:` | `CTKM-POS-SP-01 - ` | 13 |
| `TC DM-01:` | `CTKM-POS-DM-01 - ` | 11 |
| `TC CB-01:` | `CTKM-POS-CB-01 - ` | 15 |

**`quan-ly-nhan-vien` — không có mã.** 4 test đánh số kiểu `1.`, `2.` → `NV-001`…`NV-004`.

## C.3 🔴 `09` và `10`: CSV và spec là HAI BỘ CASE KHÁC NHAU, không phải lệch số

Đây là lý do **không** ép title spec về mã trong CSV:

- **`09`**: CSV (32 case `CTKM-001…032`) nói về **màn quản lý CTKM** — mở danh sách, bộ lọc, tab
  Thông tin chung, validate form. Spec (45 test) nói về **áp dụng khuyến mãi tại POS** — giảm 10%
  giá trị đơn, tặng kèm, combo. Không có case nào trùng nhau.
- **`10`**: CSV chỉ phủ **chương C.1 — Quản lý nhóm NCC** (10 case `NCC-C1-001…010`), đúng như
  `test-cases.md` ghi. Spec phủ **7 mảng** theo đánh số của tài liệu gốc `.docx`
  (`NCC-001…052`). Ép `NCC-006/007` về `NCC-C1-003` vừa **mất thông tin** vừa chỉ phủ được một phần.

⇒ Giữ nguyên. Hệ quả đúng và trung thực: `09` hiện **32 case CHƯA CÓ SCRIPT + 45 case MỒ CÔI**,
`10` hiện **10 + 15**. Việc cần làm tiếp là **viết CSV cho đúng phạm vi spec** (dùng skill
`test-scenario`), không phải đổi tên test.

## C.4 Đã kiểm

- `--list` chạy lại được trên cả 3 module sau khi sửa (spec không vỡ cú pháp).
- Không còn file nào trong repo tham chiếu title cũ (`TC SP-`, `TC DM-`, `TC CB-`).
- Mọi module: **0 test không có mã**.


---

# Phụ lục D — Tổ chức lại cây thư mục theo mã HDSD (2026-09-17)

Mã module test giờ lấy đúng theo `resource/hdsd/` (45 phân hệ, 285 task).
Mã case: `<mã phân hệ>_<mã task>_<STT>` — ví dụ `04_3_060_001`.

| | Trước | Sau |
|---|--:|--:|
| Thư mục test | 12 | **24** (21 theo HDSD + 3 chờ HDSD) |
| Case | 310 | **503** |
| Case tick được | 265 | **348** |
| Test không có mã | 0 | 0 |

Công cụ: `tool/bin/hdsd-mapping.js` (bảng mã) · `migrate-hdsd.js` (chuyển) ·
`spec-slicer.js` (cắt spec) · `migrate-run-history.js` (đổi `runs.module_id`).

## D.1 Quyết định của user

1. **Tách đúng theo HDSD.** `11-kho` cũ trải 7 phân hệ → tách thành 7 thư mục; `10-nha-cung-cap`
   → 4; `05-ban-hang-pos` → 4; `08-loyalty` → 3 (2 case POS sang `18_2`, `18_3`).
2. **Mã case KHÔNG kèm tiêu đề** — đã có cột "Tên case" riêng.
3. **Ba module chưa có phân hệ HDSD giữ nguyên tên cũ**, bổ sung sau:
   `12-don-vi-van-tai`, `13-cong-no-diem-ban-tinh`, `35-gia-von-mac-dinh`.

## D.2 🔴 Ba lỗi trong quá trình chuyển — đều SAI IM LẶNG

Cả ba đều cho ra file "trông đúng" và Playwright **không báo lỗi cú pháp**, chỉ lặng lẽ
`Total: 0 tests in 0 files`. Không đối chiếu số test trước/sau thì tưởng đã chuyển xong.

1. **`test.describe` lồng nhau.** Bản cắt đầu tiên ghép lại từ mảnh, làm vỡ cân bằng ngoặc ở
   `08-loyalty` (3 tầng describe). Sửa: **không dựng lại từ mảnh** — giữ nguyên file gốc rồi
   *xoá* các khối `test(...)` không thuộc đích, header và phần đóng tự khắc còn nguyên.
2. **Regex literal bị hiểu nhầm là comment.** `toHaveURL(/\/order\/detail\//)` — cặp `//` cuối
   regex bị coi là comment dòng, nuốt luôn `)` đóng lời gọi `test(...)`, khối test chạy tới hết file
   và file sinh ra mất `});` cuối. Sửa: bộ quét phân biệt regex literal bằng ký tự có nghĩa đứng trước.
3. **Tài nguyên cạnh spec bị bỏ quên.** `09` có `tests/helpers/pos-helpers.js`, `10` có `tests/v2.js`.
   Chỉ chép file spec thì `Cannot find module` → `0 tests`, và lỗi đó **không hiện** ở output mặc định.

Kiểm chứng cuối: `node --check` toàn bộ 24 file spec sinh ra + `--list` từng module, đối chiếu
151/151 test.

## D.3 Việc phát sinh đã xử lý

- **Regex nhận mã case** viết lại cho cả hai lối (mã HDSD bắt đầu bằng chữ số, mã cũ bắt đầu bằng
  chữ cái), đồng bộ ở `core/cases.js` **và** `core/report.js`.
- **`runs.module_id`** đổi theo bản đồ bằng `migrate-run-history.js` — không chạy thì lịch sử chạy
  mồ côi và báo cáo coi MỌI lỗi là lỗi mới.
- **`package.json`** cập nhật 5 script trỏ đường dẫn cũ.
- **`scripts/` của 7 module cũ** chuyển sang thư mục mới nhận phần lớn case.
- **`test-cases.csv` sinh lại** cho cả 21 thư mục, gộp cả case chỉ có trong spec (trước là "mồ côi").

## D.4 🔴 Một thay đổi hành vi CỐ TÌNH KHÔNG làm

9 test trong `01-mo-hinh-to-chuc/tests/vnpost-org.playwright.spec.js` hiện **không chạy** —
config cũ dùng `testMatch: /org\.standard\.spec\.js/` loại chúng ra. Cây mới **giữ nguyên** trạng
thái đó bằng `testIgnore` trong `32_mo_hinh_to_chuc/playwright.config.js`. Bật 9 test đang chết là
một thay đổi hành vi, phải do người quyết định chứ không phải tác dụng phụ của việc đổi tên thư mục.

## D.5 Còn lại

- 3 module chờ HDSD (126 case) — khi HDSD viết xong thì thêm vào `hdsd-mapping.js` rồi chạy lại.
- `11_khuyen_mai` có 32 case tài liệu nhưng **0 script**; `12_1` có 10 case tài liệu chưa có script.
  Đây là sự thật từ trước, không phải do đợt chuyển này.


---

# Phụ lục D — Kết quả GĐ 8: dữ liệu đầu vào của case (2026-09-18)

## D.1 Đã viết gì

| File | Việc |
|---|---|
| `tool/core/inputs.js` | Đọc khuôn `test-input.json`, lớp đè trong DB, hợp nhất cho UI, dựng `VNPOST_CASE_*` |
| `tool/core/inputs-xlsx.js` | Xuất khuôn Excel · nạp lại → bảng đối chiếu (chưa ghi) → áp |
| `tool/core/db.js` | Bảng `case_inputs (profile_id, module_id, case_id, field, value)` |
| `tool/core/runner.js` | Bơm `buildCaseEnv()` vào `spawn`, ghi vào log **tên field** đã đè (không ghi giá trị) |
| `tool/core/modules.js` | Cờ `hasInputTemplate` |
| `tool/server.js` | 5 route M5 + cảnh báo input ở màn chọn case |
| `tool/views/inputs.ejs` | Màn khai input |
| `tai-lieu-test/shared/test-input.js` | Thêm `coerce()` — xem D.3 |

## D.2 Bốn quyết định và lý do

1. **Input tách theo HỒ SƠ MÔI TRƯỜNG**, không phải theo module. Mã phiếu / mã kỳ ở UAT khác dev;
   dùng chung một bộ thì đổi môi trường là chạy bằng dữ liệu môi trường kia — vẫn xanh, xanh nhầm chỗ.
2. **Chỉ bơm field đã THẬT SỰ bị đè.** Bơm cả mặc định thì mọi số trong file đi qua env thành chuỗi.
3. **Giá trị trùng mặc định thì không lưu** (`normalizeAgainstTemplate`). Nếu lưu, sau này sửa
   `test-input.json` các case đó vẫn chạy bằng giá trị đông cứng từ lần bấm Lưu cũ.
4. **Nạp Excel không ghi thẳng** — ra bảng đối chiếu (`đè` / `về mặc định` / `không đổi` /
   `bỏ qua vì không khớp khuôn`) rồi mới xác nhận. Dòng `case_id` gõ sai bị **hiện ra**, không nuốt:
   nuốt thì biến sinh ra chẳng spec nào đọc, run vẫn xanh, người điền tưởng đã đổi được input.

## D.3 🔴 Bẫy đã vá trong bộ test

`shared/test-input.js` trước đây gán thẳng giá trị đè (luôn là **chuỗi**, vì đi qua env) vào `data`.
`openingAmount: 1000000` bị đè sẽ thành `"1000000"` — `"1000000" + 1` ra `"10000001"`, **không lỗi nào
phát ra**. Bẫy nằm im vì trước GĐ 8 gần như không ai đè thật. Đã thêm `coerce()` ép về đúng kiểu của
giá trị trong file. Đây là chỗ thứ **hai** phải sửa trong `tai-lieu-test/` (chỗ thứ nhất: `AUTH_DIR`,
mục 3.2) — rủi ro số 7 ở mục 9 ghi "chỉ sửa 1 dòng" nay không còn đúng.

## D.4 Đã kiểm thực tế

- 31 case của `13-cong-no-diem-ban-tinh` lên form đúng; 3 case báo trước lý do sẽ bị bỏ qua.
- Lưu form → `buildCaseEnv()` ra đúng 3 biến; checkbox trùng mặc định **không** thành lớp đè.
- Xuất khuôn Excel (8.9 KB) → sửa 1 ô, xoá 1 ô, thêm 2 dòng rác → nạp lại ra đúng
  `set:1 clear:1 same:68 unknown:2` → áp → env đổi đúng.
- **Chuỗi đầu–cuối**: bơm env của runner vào `loadCaseInput()` thật — `soThieu` ra `12345` **kiểu số**,
  `CNDB-KY-009` vẫn bị `skipReason()` chặn vì chưa bật `allowMutation`, đúng như UI đã báo trước.
- 7 route chính trả 200; module chưa có khuôn (`01_quan_ly_diem_ban`) hiện hướng dẫn tạo file chứ không vỡ.

## D.5 Còn lại

- **46/48 module chưa có `test-input.json`** → chưa khai input trên web được. Không chặn việc chạy test.
- GĐ 9 (Google Sheet) chưa làm — chờ chốt câu hỏi 4 ở mục 10.


## D.6 Run thật đầu tiên (2026-09-18, run `20260918015736-838542`)

Môi trường: FE dev `http://192.168.1.47:3200` (IP LAN, bắt buộc — SaaS không whitelist `localhost`)
→ API `https://vnpost-api.sfin.vn`. Chọn 3 case **chỉ đọc** của module 13, **không** bật `allowMutation`.
Phép thử: tắt `CNDB-ND-002` bằng lớp đè trên web, **không** động vào `test-input.json`.

**M5 chạy đúng:**
- log run ghi `# input đã đè (1 case): CNDB-ND-002: enabled` (tên field, không có giá trị);
- `CNDB-ND-002` **skipped** với đúng lý do từ `skipReason()`, hai case còn lại vẫn chạy;
- `git diff` trên `test-input.json` **trống** — file khuôn không bị sửa.

🔴 **Lỗi phát hiện kèm (KHÔNG phải do M5):** cả 4 test còn lại trượt cùng một kiểu —
`waitForResponse` chờ API `/remittance/...` quá 15s. Ảnh chụp lúc trượt cho thấy trang đang ở
**Quản lý khách hàng**, không phải hub công nợ: `dieuHuongTrongApp()` trong `shared/auth/login.js`
bấm nhầm mục menu, nên API cần chờ không bao giờ được gọi. Ba bước `setup` (đăng nhập tct / province /
shop) đều PASS ⇒ SaaS và tài khoản không có vấn đề. Việc này tách riêng, chưa sửa.

**Đã sửa một chỗ do M5 gây ra:** thông báo skip cũ ghi "đang tắt trong test-input.json" trong khi
nguồn thật là lớp đè — người đọc log sẽ mở file, thấy `enabled: true` và kết luận công cụ hỏng.
Nay nêu cả hai nguồn.
