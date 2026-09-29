---
name: vnpost-auto-test
description: Create, review, debug, and stabilize VNPost Playwright tests from Excel, CSV, Google Sheet exports, SRS, or manual test cases. Use when working in auto_test_vnpost to assess test-case readiness, map cases to vnpost-web routes/components/APIs, generate UI or UI+API tests, add session/config/cleanup support, diagnose Playwright failures from screenshots/traces/error-context, or prevent flaky locators and false-positive tests.
---

# VNPost Auto Test

Build repeatable Playwright tests from business test cases while treating
`vnpost-web` source code and observed runtime DOM as the technical truth.

## Frontend repository

The frontend under test is `vnpost-web/`, a sibling of `auto_test_vnpost/`
inside the VNPost monorepo:

```text
/Users/tungnguyen/project/java/vnpost/vnpost-web/
```

Trace only this checkout. Never resolve a route, component, service, or locator
from another frontend checkout on the machine — a different checkout has a
different feature set, and its routes and locators do not match the build under
test.

## Repository context

Read these before tracing, instead of a separate project skill. Paths are
relative to the monorepo root `/Users/tungnguyen/project/java/vnpost/`:

- `.claude/rules/frontend/frontend_core.md` — mandatory FE rules: API response
  shape, `AppProTable`, `antdEntry` imports, Tailwind-only styling, pagination.
- `.claude/CLAUDE.md` — services, ports, request flow, gateway headers, infra.

Read the deeper FE docs only when needed:
`.claude/docs/api_response_handling.md`, `.claude/docs/ui_guidelines.md`,
`.claude/docs/page_layout.md`, `.claude/docs/user_scope_detection.md`.

## Môi trường chạy test — đọc TRƯỚC khi chạy lệnh đầu tiên

Ghi 17/09/2026 sau một ngày mất gần hết thời gian vào đúng mấy điểm này.

### Dev server: tự dựng cổng riêng, đừng đụng cổng của user

User thường đang chạy `vnpost-web` ở **cổng 3000** để làm việc. 🚫 Không kill, không chiếm.
Khai một cấu hình riêng trong `/Users/tungnguyen/project/java/vnpost/.claude/launch.json`:

```json
{
  "name": "vnpost-web-test",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["--dir","vnpost-web","exec","dotenv","-e",".env.development.sofin","--",
                  "rsbuild","dev","--mode","development","--port","3200"],
  "port": 3200
}
```

`pnpm --dir <thư mục> <script>` chỉ chạy được script có trong `package.json`; muốn chạy binary
(`dotenv`, `rsbuild`) phải chèn `exec`, nếu không nhận `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`.

### Endpoint: đổi ở `.env.development.sofin`, và phải KHỞI ĐỘNG LẠI dev server

`PUBLIC_BASE_URL` được rsbuild **nhúng vào bundle lúc khởi động**. Sửa file mà không restart thì
trình duyệt vẫn gọi endpoint cũ — kiểm bằng cách bắt `page.on('request')` và in ra origin, đừng
tin file cấu hình.

### 🔴 Dùng SaaS (`https://vnpost-api.sfin.vn`) thì PHẢI mở bằng IP LAN, không phải `localhost`

SaaS không whitelist origin `localhost` ⇒ CORS chặn ngay ở `/auth/v2/user/login`, màn đăng nhập
đứng im không báo gì. FE đã có sẵn đường vòng: `config.jsx` kiểm `isLanIpAccess` (hostname là IP)
rồi chuyển sang proxy cùng origin `/__api` do rsbuild chuyển tiếp. Vì vậy:

```
VNPOST_BASE_URL=http://192.168.1.47:3200      # lấy IP bằng `ipconfig getifaddr en0`
```

### 🔴 Đăng nhập & `page.goto` — ĐÍNH CHÍNH 18/09/2026

> ⚠️ Bản trước của mục này ghi *"sau khi login TUYỆT ĐỐI không `page.goto`"*. **Sai nguyên nhân.**
> Đã đo lại: `goto` trong **cùng context vừa đăng nhập** chạy tốt, đúng như người dùng gõ URL / bấm F5.

Thủ phạm thật là **cookie `refreshToken` sai path ở proxy dev**: backend đặt `Path=/auth/v2/user`,
còn FE (khi mở bằng IP LAN) gọi `/__api/auth/v2/user/refresh-token`. Path không khớp ⇒ **trình duyệt
không gửi cookie** ⇒ `refresh-token` **401** ⇒ đá về `/account`. Đo trực tiếp: header request
`refresh-token` **không có `Cookie`**. Trên prod không có tiền tố `/__api` nên bẫy chỉ lộ ở dev —
vì vậy "người dùng thật F5 vẫn vào được" mà auto test thì không.

**Đã vá** ở `vnpost-web/rsbuild.config.js` → `rewriteDevCookie` viết lại `Path=/`.
Sau khi vá: `goto` 3 lần liên tiếp + F5 đều `refresh-token` **200**, URL giữ nguyên cả `?tab=`.

| Việc | Trước khi vá | Sau khi vá |
|---|---|---|
| `goto` trong context vừa đăng nhập | 401 → `/account` | ✅ 200, giữ nguyên query |
| F5 | 401 → `/account` | ✅ 200 |
| `storageState` dùng lại, context mới | 401 ngay lần 1 | lần 1 ✅, **lần 2–3 vẫn 401** |

🔴 **Điều VẪN ĐÚNG: refresh token xoay vòng** ⇒ `.auth/<vai>.json` chỉ dùng được cho context ĐẦU TIÊN.
Mỗi test vẫn phải tự đăng nhập trong context của mình; 🚫 đừng coi storageState là vé vào cửa dùng mãi.

`moTrang` nay đi đúng kiểu trình duyệt: `goto` thử phiên → chưa đăng nhập thì đăng nhập → **`goto`
thẳng tới đích kèm query**. Đo thật: `CNDB-ND-001` **4,3s** (đường bấm menu: 13,5s). Nhánh bấm menu
giữ lại làm **dự phòng** cho môi trường chưa vá cookie path.

Điều hướng client-side chỉ có một cách chạy được: **bấm menu theo nhãn**.
`history.pushState` + `PopStateEvent` KHÔNG ăn (router bật lại `/customer` ngay). Link của menu con
render **lazy** — trước khi mở menu cha, `a[href="/chain/shop-management"]` không tồn tại trong DOM,
nên cũng không tìm link trước rồi bấm được. Bảng `MENU_THEO_ROUTE` trong `login.js` khai đường đi;
thêm route mới thì khai thêm.

Mốc chờ phát hiện "bị đá về màn đăng nhập" phải **15s**, không phải 3s: qua SaaS cú đá tới chậm hơn.

#### 🔴 `moTrang` với URL có `?query` KHÔNG BAO GIỜ tới đích (đo 18/09/2026)

`storageState` của project `setup` **không tái sử dụng được** — đo trực tiếp: context mới dùng đúng
state đó, `goto` vẫn bị đá về `/account`, cả lần đầu tiên (cookie `refreshToken` còn hạn 2 ngày nhưng
server đã xoay vòng). ⇒ **mọi** test đều rơi xuống nhánh đăng nhập lại, tức luôn đi qua
`dieuHuongTrongApp`. Nhánh này nhận **nguyên URL kèm query**, và cả ba phép so bên trong đều trượt:

| Phép so trong `dieuHuongTrongApp` | Với `/debt-reconciliation/remittance?tab=opening-debt` |
|---|---|
| `MENU_THEO_ROUTE[url]` | trượt — bảng khai theo path, không có query |
| `a[href$="${url}"]` | **0 khớp vĩnh viễn** — link menu không bao giờ mang query |
| `pathname.includes(url)` | **false ngay cả khi đã ở đúng trang** |

Hàm không bao giờ `return`, quét hết 13 menu cha rồi bỏ cuộc, **để trang đứng nguyên ở `/customer`**.
Triệu chứng nhìn thấy: mọi case trượt `waitForResponse` 15s, ảnh chụp là màn **Quản lý khách hàng** —
trông như lỗi sản phẩm hoặc mạng chậm, thật ra API chưa từng được gọi.

🔴 **Đang dính 19 chỗ gọi `moTrang`**: module `13-*` (`?tab=…`) và `14-*`
(`/settings?setting=costMethodDefault`). Những phân hệ từng chạy xanh đi đường khác — module `01`
dùng thẳng `page.goto` (một lần, trước đăng nhập), `04_1` dùng route **đã khai trong
`MENU_THEO_ROUTE` và không có query**. 🚫 Đừng kết luận "hôm qua chạy được, nay hỏng": phân hệ có
query **chưa từng** đi qua `dieuHuongTrongApp` thành công.

**ĐÃ SỬA 18/09** trong `dieuHuongTrongApp`: tách `pathname` khỏi `search` trước mọi phép so, rồi gọi
`moKhungCon(page, search)` để mở đúng khung con. Đã chạy thật: `CNDB-ND-001` **PASSED**,
`BC-01` (module 14) **PASSED**.

##### Mở khung con theo query — 3 lối, đo 18/09

Cả hai màn đều đồng bộ query vào URL qua `useSearchParams`, nên mở đúng khung là **bắt buộc**,
không phải trang trí: sai khung thì API case chờ không bao giờ nổ.

| Query | Cơ chế FE | Selector |
|---|---|---|
| `?tab=<key>` | antd **Tabs** (`RemittanceHubPage`) | `.ant-tabs-tab[data-node-key="<key>"]` |
| `?tab=<key>` khi tab **tràn** khỏi bề ngang | antd thu vào nút `...` | `.ant-tabs-nav-more` → `.ant-tabs-dropdown-menu-item[data-menu-id$="-popup-<key>"]` |
| `?setting=<key>` | antd **Menu** dọc (`SettingPageNext`) | `.ant-menu-item[data-menu-id$="-<key>"]` |

🔴 **Bẫy tab tràn:** `.ant-tabs-tab` của tab bị thu vào `...` **vẫn nằm trong DOM**, Playwright vẫn
báo `visible: true` kèm boundingBox hợp lệ, nhưng bấm vào **không có tác dụng gì** — URL không đổi,
không request nào, `aria-selected` rỗng. Với viewport 1440 thì 3 tab cuối của hub
(`opening-debt`, `cash-voucher`, `report`) rơi vào diện này (tab `opening-debt` ở x=1373 rộng 129 →
chạm 1502). Phải so `boundingBox().x + width <= viewport.width` rồi mới quyết bấm thẳng hay đi qua `...`.
⚠️ Mục trong dropdown `...` **không có** `data-node-key`, chỉ có `data-menu-id`.

🔴 **Phải chờ khung render xong rồi mới dò.** Bấm link menu là URL đổi ngay nhưng thanh tab còn đang
dựng; dò sớm thì `.ant-tabs-tab` chưa có phần tử nào và hàm kết luận nhầm "màn này không dùng Tabs".
Đã mắc đúng lỗi này ở lần vá đầu: chờ `.ant-tabs-tab, .ant-menu-item` `attached` (20s) + 1,2s rồi mới dò.

🔴 **Không mở được khung con thì THROW, đừng chạy tiếp.** Đứng nhầm khung mà im lặng là case đỏ vì
`waitForResponse` treo, và người đọc log đi tìm bug sản phẩm — đúng cái đã mất cả buổi ngày 18/09.

### Tăng tốc mỗi lượt chạy

- `VNPOST_SETUP_ROLES=tct,province,shop` trong `.env` — chỉ đăng nhập vai mà phân hệ dùng. Mặc định
  setup đăng nhập **mọi vai khai trong `.env`**; vai thừa vừa tốn ~7s vừa làm đỏ cả lượt chạy khi
  chính nó lỗi.
- `video: 'retain-on-failure'` thay cho `'on'`.
- Khi phát triển thì lọc bằng `-g "<mã case>"`, đừng chạy cả bộ.

### Backend local chậm bất thường → kiểm Kafka trước khi đổ cho test

Kafka tắt (`nc -z localhost 9092`) mà core vẫn trỏ vào đó thì mỗi `kafkaTemplate.send()` chặn
`max.block.ms` = 60s. Đo thực tế: `POST /shops/profile` mất **120,6 giây**, và vì sự kiện được gửi
**sau commit** nên **bản ghi VẪN được tạo dù client đã timeout** — test báo "không gửi request"
trong khi dữ liệu đã vào DB. Qua SaaS thì API trả trong **0,5 giây**.

## 🔴 Case ghi dữ liệu: đang chạy trên DỮ LIỆU THẬT

Bộ test trỏ vào hệ thống thật, không phải sandbox. Có màn **không hề có chức năng xoá** — ví dụ
Quản lý điểm bán chỉ cho chuyển *Tạm ngừng* — nên mọi bản ghi lỡ tạo là **ở lại vĩnh viễn**.
Ngày 17/09/2026 riêng phân hệ 01 đã để lại **24 điểm bán rác** và **một lần gán nhân viên vào điểm
bán THẬT** (test bám chỉ số dòng thay vì mã).

Trước khi viết case ghi:

1. Đặt tên bản ghi theo khuôn lọc được (`AUTO TEST KHONG DUNG <số>`), mã có tiền tố cố định.
2. **Bám mã bản ghi, không bám chỉ số dòng** — sau khi ghi, danh sách tải lại và thứ tự đổi.
3. Chỉ thao tác trên bản ghi rác; lọc trước rồi mới mở.
4. Case cuối của chuỗi phải **trả trạng thái về như cũ**.
5. `waitForResponse` timeout **KHÔNG** có nghĩa là dữ liệu chưa được ghi — kiểm DB bằng SELECT rồi
   mới kết luận, và mới chạy lại.
6. Case chỉ kiểm validate thì chặn ghi ở tầng mạng (`blockWrites`) và assert danh sách request rỗng.

### 🔴 Cửa kiểm BẮT BUỘC: mọi case ghi phải đối chiếu DB

`status.code = "200"` **không** chứng minh dữ liệu đã được ghi. Sau mỗi case ghi, chạy một câu
`SELECT` lên đúng bảng và **ghi kết quả đối chiếu vào báo cáo**. Không có dòng đối chiếu đó thì case
coi như **chưa xác minh**, dù nó đang xanh.

Ba lần trong một ngày (17/09/2026) API trả 200 mà kết quả khác hẳn:

| Hiện tượng | Sự thật | Phát hiện nhờ |
|---|---|---|
| Case tạo cấu hình hạn dùng "thành công" | KHÔNG bản ghi nào được tạo — ta bắt nhầm response của `POST …/check-existing`, nó **dùng chung đường dẫn gốc** với API tạo | `SELECT … FROM VNPOST_CORE.EXPIRY_ALERT_POLICY` → vẫn 29 dòng, mới nhất 14/09 |
| Case tạo điểm bán "không gửi request" rồi đỏ | Bản ghi **VẪN được tạo**: request đi rồi, chỉ là server trả lời sau 120s | `SELECT … FROM SHOP_PROFILE` → có bản ghi mới |
| Case gán nhân viên "đỏ vì không thấy dữ liệu" | Đã gán thật, nhưng **vào điểm bán khác** do test bám chỉ số dòng | `SELECT … FROM CHAIN_SHOP_EMPLOYMENT_MANAGE` → thấy `org_unit_code` lạ |

Cách làm:

1. **Trước** khi viết case ghi, tra bảng đích trong `.claude/schema/**` và đếm số dòng hiện có.
2. **Sau** khi chạy, `SELECT` lại theo dấu nhận dạng của bản ghi (`AUTO TEST …`) và so số dòng.
3. Khi chờ response hết giờ, 🚫 **đừng chạy lại ngay** — `SELECT` trước, vì server có thể đã ghi xong.
4. Khi bắt response của API ghi, kiểm đường dẫn **chính xác**: nhiều màn có endpoint phụ
   (`/check-existing`, `/preview`, `/validate`) nằm dưới cùng tiền tố. Loại trừ chúng trong predicate.
5. Báo cáo cuối phải có một dòng cho mỗi case ghi, dạng:
   `04_1_040_009 · EXPIRY_ALERT_POLICY: 29 → 29 dòng · KHÔNG tạo được (trùng cấu hình TCT)`.

## Viết nhanh: lấy selector từ nguồn CÓ SẴN, đừng dò từ số không

Đo ngày 17/09/2026 trên phân hệ 04_1: dò locator bằng probe từng bước mất **hơn một tiếng cho 16
case**; chuyển sang đọc nguồn có sẵn thì một case viết xong chạy xanh trong **hai lượt**. Thứ tự đọc:

1. **Kịch bản HDSD của chính phân hệ đó**, nếu có — quý nhất, vì nó đã CHẠY THẬT khi dựng tài liệu:
   - `resource/hdsd/<mã>/video_spec_*.js` — từng bước thao tác kèm `css` selector.
   - `resource/hdsd/<mã>/capture_spec.js` — selector của từng ảnh chụp.
   Chúng chạy trên trang demo có mock, nên **dữ liệu** khác môi trường thật, nhưng **thao tác và
   selector thì đúng**. Ví dụ đã cứu được nhiều vòng dò: điểm bán trong drawer chọn là
   `.ant-radio-wrapper`, không phải mục danh sách thường.
2. **Code màn đó** — nhãn nút, `name`/`id` của Form.Item, điều kiện `disabled`, `hidden` của cột.
   Đọc `hidden: activeTab === ...` là biết ngay nhóm nào ẩn cột nào, khỏi thử từng tab.
3. **Tài liệu HDSD `tasks/*.md`** — đọc TRỌN task, nhất là phần *Trước khi bắt đầu* và các bước đầu.
   🔴 Bỏ qua bước tiền đề là nguyên nhân đỏ hay gặp nhất: ở 04_1 task 020, vai từ Bưu điện xã trở lên
   **bắt buộc chọn tổ chức trước**, không chọn thì thân màn không render và mọi locator chờ hết
   timeout với lý do vô nghĩa "không thấy ô Ngưỡng Min".
4. Probe DOM — chỉ dùng cho phần ba nguồn trên không trả lời được, và **probe một lần lấy trọn**
   (tabs, select, nút, cột, drawer) thay vì mỗi lần một mẩu.

Khi đang sửa lỗi thì chạy đúng MỘT case (`-g "<mã case>"`, ~20 giây), 🚫 đừng chạy cả nhóm (~3 phút).

## Test case input format

Cases under `tai-lieu-test/<module>/test-cases.csv` are already flat CSV
(`ID,Ten test case,Tien dieu kien,Buoc kiem thu,Ket qua ky vong`) — read them
directly. Use the `spreadsheets` skill only when the input is still an
unexported workbook (`.xlsx`, `.xls`) or a live Google Sheet.

## Test input contract

A spec must never hardcode business data. Every concrete value comes from the
module's `test-input.json`, keyed by the source case ID, and is read through
`tai-lieu-test/shared/test-input.js`.

```js
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const CASE_ID = 'NCC-C1-005';
const input = loadCaseInput(__dirname, CASE_ID);

test(`${CASE_ID} - Thêm nhóm NCC hợp lệ`, async ({ page }) => {
  const reason = skipReason(input);
  test.skip(Boolean(reason), reason ?? '');
  const groupName = `${input.data.groupNamePrefix}-${Date.now()}`;
  // ...
});
```

Per-case fields:

| Field | Meaning |
| --- | --- |
| `enabled` | `false` skips the case without deleting it |
| `mutates` | The case writes data |
| `allowMutation` | Permission to actually write; a `mutates` case is skipped while this is `false` |
| `required` | Keys that must be non-empty, otherwise the case is skipped with a named reason |
| `data` | The concrete business values |

Rules:

- Resolution order is environment variable, then `test-input.json`.
- Override one field with `VNPOST_CASE_<CASE_ID>_<FIELD>`, upper snake case —
  case `NCC-C1-005` field `groupNamePrefix` becomes
  `VNPOST_CASE_NCC_C1_005_GROUP_NAME_PREFIX`.
- Keep account, password, and base URL in `.env`; keep business data in
  `test-input.json`. Never put a secret in `test-input.json`.
- A missing required key must skip with a stated reason, never pass silently.
- Financial, stock, debt, or delete cases must declare `mutates: true` and stay
  `allowMutation: false` by default.
- Copy `tai-lieu-test/shared/test-input.example.json` when creating a new
  module input file. Reuse the exact case ID from the source CSV.

## Workflow

### 1. Inspect the input

Read the relevant sheet only. Extract:

- ID, title, priority, role/scope.
- Preconditions and concrete test data.
- Steps and expected UI result.
- Expected API/data result.
- Whether the case mutates data and how it can be cleaned up.

Classify each case:

- `READY`: enough information to implement.
- `READY_WITH_CODE_LOOKUP`: missing technical route/API/locator but business
  behavior is clear and can be resolved from source.
- `BLOCKED`: missing role, prerequisite, measurable expected result, or safe
  cleanup for a destructive case.

Do not use historical `Kết quả thực tế` or `Pass/Fail` as the expected result.
They are execution evidence, not specification.

Read [test-case-readiness.md](references/test-case-readiness.md) when reviewing
a workbook or selecting cases for automation.

### 2. Trace the implementation before coding

Search `vnpost-web/src/` in this order:

1. Route constant and route config.
2. Page component.
3. Drawer/modal/form component.
4. RTK Query or Axios service.
5. Permission and organization-scope behavior.

Use `rg`, not guessed URLs or menus. Record the exact:

- Route.
- Request method and endpoint.
- Payload/query parameters.
- Response shape.
- Visible labels/placeholders/buttons/table columns.

Remember `status.code` is a string. Assert with:

```js
expect(String(body?.status?.code)).toBe('200');
```

### 3. Choose the safest first case

For a new module, implement in this order:

1. Read-only smoke/UI case.
2. Client validation case.
3. Search/filter case with deterministic data.
4. CRUD case with API verification and cleanup.
5. State, stock, debt, payment, or compensation flows.

Never start with a financial or inventory mutation when a read-only case can
validate route, auth, API headers, and selectors first.

### 4. Build the test

Follow Arrange–Act–Assert–Cleanup:

- Arrange session, role/scope, prerequisites, and unique test data.
- Act through the UI behavior being tested.
- Assert the exact API response and scoped UI.
- Verify persisted data through detail/search or a related API.
- Cleanup in `finally` or fixture teardown.

Reuse shared infrastructure under:

```text
auto_test_vnpost/tai-lieu-test/shared/
  config.js
  auth/
  api/
  assertions/
  builders/
  pages/
```

Create a module folder under `tai-lieu-test/<module>/` with its own config,
tests, report output, and README only when repository convention requires it.

### 5. Use resilient locators

Prefer, in order:

1. `getByRole()` with accessible name.
2. `getByLabel()`.
3. `getByPlaceholder()`.
4. Scoped `getByText()`.
5. Stable `data-testid`.
6. A scoped stable CSS class as a last resort.

Always scope assertions to `main`, a form, drawer, dialog, table, or row.
Avoid input indexes, screen coordinates, generated Ant Design internals, and
global broad regex.

For Ant Design Select, inspect the accessible snapshot first. The visible
placeholder may be represented as text surrounding a `combobox`, not as
`.ant-select-selection-placeholder`. Prefer a scoped container:

```js
const main = page.getByRole('main');
const filters = main.locator('form');
await expect(filters.locator('.ant-select').filter({ hasText: 'Loại' })).toBeVisible();
```

Do not invent a locator from source markup alone when runtime evidence exists.

### 6. Synchronize on observable events

Before clicking the action, prepare the matching response wait:

```js
const responsePromise = page.waitForResponse(
  (response) =>
    response.url().includes('/delivery-units') &&
    response.request().method() === 'GET',
);
await page.goto('/delivery/units', { waitUntil: 'domcontentloaded' });
const response = await responsePromise;
```

Prefer URL, response, element state, or dialog visibility. Avoid using
`waitForTimeout()` or `networkidle` for primary synchronization.

### 7. Validate before declaring completion

Run:

1. `node --check` on changed JavaScript.
2. `playwright test --list` for the module configuration.
3. The focused test if browser and environment are available.

If the focused test fails:

1. Read the exact error.
2. Inspect `error-context.md`.
3. View the failure screenshot.
4. Inspect the trace when screenshot/snapshot is insufficient.
5. Compare the accessible snapshot with the locator.
6. Apply the smallest locator/assertion correction.
7. Run the focused test again.

Do not weaken an assertion merely to make the test green. If runtime UI differs
from the test case, report a specification gap.

Read [playwright-quality-gates.md](references/playwright-quality-gates.md)
before finalizing or debugging a generated script.

### 8. Learn from every reusable failure

When a generated or modified script fails, diagnose and fix the test first.
After the focused test passes, decide whether the cause can recur in another
module or test.

If the failure is reusable, update this skill in the same task:

1. Add the symptom, root cause, and prevention rule to
   [playwright-quality-gates.md](references/playwright-quality-gates.md).
2. Update `SKILL.md` when the failure changes the core workflow.
3. Keep the rule generic; do not encode one record ID, account, environment,
   screenshot, or module-specific accident.
4. Avoid duplicate rules. Extend the existing rule or troubleshooting table.
5. Validate the skill structure after editing.

Examples of reusable failures:

- An Ant Design component has a different runtime accessibility tree than its
  source markup suggests.
- A response wait is registered after the triggering click.
- A test silently passes when prerequisite data is absent.
- A mutation test leaves data behind after an assertion failure.
- A required Playwright browser or environment variable is missing.

Do not update the skill for transient production data, one-off network outages,
or a product defect that does not reveal a testing-process improvement.

## Required completion report

State:

- Input case and readiness assessment.
- Route/API/component used.
- Script path and command.
- What was verified.
- Whether E2E actually ran.
- Any blocked prerequisite, environment issue, or specification gap.
- Whether a reusable failure was found and what skill rule was added or updated.
- 🔴 **Đối chiếu DB cho TỪNG case ghi** — một dòng mỗi case, dạng
  `<mã case> · <BẢNG>: <số dòng trước> → <số dòng sau> · <kết luận>`.
  Thiếu dòng này thì case ghi coi như **chưa xác minh**, kể cả khi nó đang xanh; 🚫 không được báo
  "tạo thành công" chỉ vì API trả 200.
