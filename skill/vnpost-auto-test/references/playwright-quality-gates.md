# Playwright Quality Gates

## Locator gate

- Scope to `main`, form, drawer, dialog, table, or row.
- Prefer accessible roles and names from the runtime snapshot.
- Avoid `nth()` unless order itself is under test.
- Avoid coordinates.
- Avoid generated Ant Design classes.
- Use a stable CSS class only when accessible selectors are unavailable.

## Synchronization gate

- Register `waitForResponse` before the triggering action.
- Match URL and HTTP method.
- Wait for exact URL or visible state after navigation.
- Do not use fixed sleep as the primary wait.
- Do not depend on `networkidle` in apps with background requests.

## API gate

- Assert HTTP success.
- Parse response and assert `String(status.code) === '200'`.
- Assert `data` type and important fields.
- For list APIs, assert pagination shape where applicable.
- Capture frontend request headers for direct API verification when scope headers
  are required.

## Mutation gate

- Generate unique data using timestamp and worker index.
- Capture returned ID/code.
- Verify through detail/search API.
- Clean up in `finally`.
- Never delete or edit an arbitrary shared row.
- Run financial/inventory mutations only in an approved test scope.


🔴 **Đối chiếu DB là bắt buộc, không phải tuỳ chọn.** HTTP 200 chỉ nói server đã trả lời, không nói
dữ liệu đã vào bảng. Sau mỗi case ghi phải `SELECT` lên bảng đích và đưa kết quả vào báo cáo; thiếu
dòng đó thì case coi như chưa xác minh dù đang xanh. Xem mục cùng tên trong `SKILL.md` để biết ba
ca thật đã bắt được bằng cách này, và bốn quy tắc kèm theo (tra bảng trước, so số dòng sau, SELECT
trước khi chạy lại, loại trừ endpoint phụ như `/check-existing` `/preview` `/validate`).

## Failure diagnosis gate

Inspect in this order:

1. Playwright error and call log.
2. Failure screenshot.
3. `error-context.md` accessible snapshot.
4. Trace network and DOM timeline.
5. Source component/API.

Common diagnoses:

| Symptom | Likely cause | Action |
| --- | --- | --- |
| Element visible in screenshot but locator finds none | Wrong DOM/class assumption | Use accessible snapshot and scoped role/text |
| Ant Design Select visible nhưng `.ant-select-selector` không tìm thấy | Runtime DOM/phiên bản antd không giữ class nội bộ ổn định | Scope tới `Form.Item`/container rồi click `getByRole('combobox')`; chỉ dùng class antd khi snapshot/source xác nhận |
| Test times out after click | Wait registered too late or wrong endpoint | Register response promise before click |
| HTTP 200 but business failed | `status.code` not checked | Assert business response code |
| Test passes with missing prerequisite | Silent return | Use fixture or `test.skip(reason)` |
| CRUD works once then fails | Non-unique data or missing cleanup | Add builder and `finally` cleanup |
| Browser executable missing | Playwright browser not installed | Run `npx playwright install chromium` |
| Một UI requirement thiếu làm dừng kiểm tra các requirement độc lập còn lại | Dùng hard assertion tuần tự cho nhiều tiêu chí độc lập | Dùng `expect.soft` cho tiêu chí độc lập, vẫn giữ test fail và thu thập đầy đủ sai khác |
| Test đầu tiên đăng nhập được nhưng các test sau quay lại `/account` | Access token chỉ nằm trong Redux memory và refresh token bị xoay vòng; nhiều context dùng chung storageState cũ | Không dùng setup storageState cho luồng auth này; đăng nhập/chọn scope trong fixture hoặc `beforeEach` của từng test |
| Strict-mode báo nhiều button cùng tên như “Đóng” | Drawer có cả icon close và nút footer dùng chung accessible name | Scope locator vào `.ant-drawer-footer`, header, form hoặc vùng chức năng cần kiểm tra |
| Mutation qua UI thành công nhưng cleanup bằng APIRequestContext trả 404 ở local | API base URL hoặc dev proxy không xử lý direct request giống browser flow | Dùng endpoint backend chính xác hoặc cleanup qua cùng UI/browser request flow đã được xác minh; luôn kiểm tra cleanup response |
| Click text của Dropdown bắt nhầm Tag/text trong drawer | Ant Design render menu qua portal và cùng nhãn xuất hiện ở nhiều vùng | Sau khi mở menu, scope option vào `.ant-dropdown:visible` hoặc popup visible tương ứng |
| Mutation thành công nhưng `finally` lỗi `ReferenceError` | Locator/ID dùng cho cleanup được khai báo bằng `const` bên trong `try` | Khai báo biến cleanup ở scope ngoài `try`, gán sau khi mở UI, và kiểm tra recovery path trước khi chạy mutation |
| `response.json()` lỗi vì body bắt đầu bằng `<!DOCTYPE html>` dù HTTP 200 | Direct request trúng SPA fallback thay vì API proxy/backend | Kiểm tra URL/content-type và ưu tiên bắt response API thực tế do browser UI phát sinh; không coi HTTP 200 HTML là business success |
| Verify sau mutation nhận dữ liệu trạng thái cũ | `waitForResponse` bắt nhầm request detail ban đầu vẫn đang pending | Chờ và consume request khởi tạo trước; chỉ sau đó đăng ký matcher cho response refetch của mutation |
| Một defect đã biết làm mọi lần chạy suite luôn exit 1 và che lỗi mới | Test vẫn là failure thông thường dù gap đã được xác nhận | Dùng `test.fail(condition, reason)` nhưng giữ assertion; khi defect được sửa, unexpected pass sẽ buộc cập nhật test |
| `filter({ has: ... })` không tìm thấy row/form item dù dữ liệu hiển thị | `has` dùng locator đã scope từ chính container cha nên quan hệ tương đối bị sai | Dùng locator con tương đối, `hasText` có scope hẹp, hoặc selector ổn định trong container như `.ant-table-tbody .ant-table-row` / `.ant-form-item` |

## Continuous learning gate

After fixing a failed generated script:

1. Confirm the root cause using error output, screenshot, accessible snapshot,
   trace, network evidence, or source code.
2. Rerun the focused case when the environment permits.
3. Determine whether the failure pattern can recur.
4. If reusable, update this reference before completing the task.

Record a reusable lesson in the troubleshooting table using:

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |

Rules for updating the skill:

- Describe the failure pattern, not the specific test execution.
- Include the preventive check that should happen before future tests run.
- Merge with an existing row when the lesson is similar.
- Do not add credentials, tokens, personal data, production record IDs, or
  environment-specific secrets.
- Do not record product defects as testing rules unless they expose a reusable
  automation mistake.

## Final validation

```bash
node --check path/to/test.spec.js
npx playwright test --config path/to/playwright.config.js --project=chromium --list
npx playwright test --config path/to/playwright.config.js --project=chromium -g "CASE_ID"
```

Report honestly when the focused E2E run was not possible.

## Reusable failures recorded on 2026-09-15

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Login setup times out 25s on `expect(locator('input[type="password"]').first()).toBeVisible()`, log says `resolved to <input aria-hidden> - unexpected value "hidden"` | The first `input[type="password"]` in the DOM is the hidden anti-autofill input that antd/the browser injects. The real field is only reachable by accessible name. | Select the login fields by role + name: `getByRole('textbox', { name: /tên đăng nhập\|username/i })` and `getByRole('textbox', { name: /mật khẩu\|password/i })`. Never select credentials inputs by `type` or index. |
| A multi-role flow passes end to end even though each step is restricted to a different org level | One over-privileged account was reused for every step, so no step ever hit the permission boundary the case exists to prove | Give each role its own account and its own `.auth/<role>.json` (`shared/auth/accounts.js` + `roles.setup.js`), name spec files `<module>.<role>.spec.js`, and run one role per Playwright project. |
| A role signs in successfully but every later assertion reads the wrong org's data, with no error anywhere | The org picker lists one row per (org × role) pair and repeats a parent org's name as the **subtitle** of each child row, so `getByText(orgName, { exact: true }).first()` clicks the subtitle of some child instead of the intended row | Scope the click to the row that carries **both** the org name and the role label shown on its right, and assert the locator resolves to exactly one row before clicking. Never `.first()` a label that can appear as someone else's subtitle. |
| A case passes when run alone with `-g`, but fails when the whole suite runs, and the failure screenshot is the login page | The app refreshes its token on load and the server **rotates** the refresh token, so the saved `.auth/<role>.json` is spent by the first test that uses it. Every later test replaying that file gets `SSHOP-420 "Mã truy cập đã hết hạn"` and is redirected to the account screen. | Never treat a saved storage state as reusable across tests of the same role. Open pages through a helper that detects the login/account URL and re-authenticates (`shared/auth/login.js` → `moTrang(page, url, role)`), and check the URL **after** waiting a beat: the redirect happens only once the refresh call returns 401. |
| A CSS locator that matches a Vietnamese label (`:text-is("Trạng thái")`, `:has-text(...)`) never resolves, while the same text is plainly visible on screen | The DOM stores the label in decomposed form (NFD); the CSS engine compares the string byte-wise and misses the composed (NFC) literal in the spec | Match Vietnamese labels with a regex that accepts both forms (`new RegExp(nfc + '\|' + nfd)`) through `filter({ hasText })` / `getByText`, never through CSS text pseudo-classes. |
| Clicking an antd dropdown option fails with "element is not visible" after several stable-retry rounds | The preceding click landed on the wrong `combobox` — the screen has several, and `getByRole('combobox').first()` is not the filter under test — so the dropdown that opened belonged to another control and closed again | Anchor a select by its own placeholder or label before opening it, then click the option inside the visible dropdown. Never index into a role that appears more than once on the screen. |
| A case for a role whose account is not configured silently reports as passed | The spec had no guard, so the suite ran it with whatever session was loaded | Guard with `missingRoleReason('<role>')` and `test.skip(Boolean(reason), reason)`. A missing account must always surface as a skip **with a stated reason**, never as a pass. |

## Reusable failures recorded on 2026-09-16

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `.ant-drawer-content` matches nothing although the drawer is plainly open, and the accessible snapshot shows `dialog "<drawer title>"` | Newer antd exposes Drawer through the `dialog` role and no longer guarantees that internal class | Locate drawers with `getByRole('dialog', { name: ... })`. Read the drawer title from its text, not from `.ant-drawer-title`, and never assert a drawer by an antd-internal class. |
| `getByRole('option')` resolves but every option is `hidden`, and the texts are raw enum codes (`MAC`, `FIFO`) instead of the visible labels | antd renders a hidden accessibility listbox next to the real dropdown; the role query hits the hidden one first | Read options from the open dropdown: `page.locator('.ant-select-dropdown').last().locator('.ant-select-item-option')`. Treat option text that looks like a backend enum as proof you are reading the hidden list. |
| `getByRole('option')` / `getByRole('radio')` resolves but the element is always `hidden` | Several antd controls keep their real form element in a visually hidden layer and paint a separate visible node: Select renders a hidden listbox, Segmented renders `input[type=radio]` at `opacity: 0` | Query the node the user actually sees (`.ant-select-item-option`, `.ant-segmented-item`) whenever an ARIA role on an antd control resolves to something permanently hidden. A role that resolves yet never becomes visible is the signature of this pattern. |
| A locator inside a tabbed screen resolves 19 times yet `toBeVisible` always fails | antd keeps the panels of unopened tabs mounted but hidden, so the element exists while never being visible | Click the tab first (`getByRole('tab', { name })`), then query inside it. A locator that resolves but stays `hidden` on a tabbed screen is a wrong-tab problem, not a wrong-selector problem. |
| `waitForResponse` for a panel's API times out even though the endpoint works | The panel lives in a tab that mounts lazily, so its request only fires when the tab is opened | Open the screen, then register the response promise, then click the tab. Registering at `goto` time waits for a call that cannot happen yet. |
| `getByRole('button', { name: 'X', exact: true })` never matches a button that clearly reads `X` | The button carries an icon, so its accessible name includes the icon name (`edit Sửa`, `plus Thêm mới`) | Match icon buttons with a regex anchored on the label (`/Sửa$/`) and scope to the card or row under test, since several cards on a settings screen can share the same label. |
| A direct API call replayed with headers borrowed from the app returns 401 while the same session works in the browser | The borrowed request came from the axios layer, which only sends `authorization` + `appId`; the gateway also needs the scope headers (`chainId`, `shopId`, …) that the RTK Query layer adds | Borrow headers from a request that carries the scope headers, and forward the whole header set rather than an allowlist. Because the server rotates refresh tokens, re-borrow and retry exactly once on the first 401 before reporting a permission problem. |
| A case that should prove "the screen reads configuration X" passes even when the frontend still hardcodes the old default | The configured value happened to equal the hardcoded one, so both behaviours produce the same screen | When the live value cannot distinguish the two behaviours, either skip with a stated reason or stub the config endpoint (`page.route`) with a different value. Never let an indistinguishable run count as a pass. |

## Reusable failures recorded on 2026-09-16 (second pass)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `filter({ hasText })` on a table row matches two rows and fails strict mode, e.g. a row named `X` and another named `X Y` | Category and product names are prefixes of one another, so a text filter is never a unique key | Address rows by their stable key (`tr[data-row-key="<id>"]`) taken from the API response. Reserve text filters for cases where no id is available, and assert the locator resolves to exactly one row. |
| A tree/expand case passes because the child row is visible, although nothing proves the child sits under the parent | "Row exists" is a weaker claim than "row is nested one level deeper" | Assert the nesting itself: compare `ant-table-row-level-N` between the parent and child rows, or read the indent the component renders. |
| A case is green when run with `-g`, red when the whole suite runs, failing on `waitForResponse` timeout | The wait inherits `use.actionTimeout`; when the helper has to re-authenticate mid-run, the awaited request only fires after a full login round trip | Give waits that follow a navigation helper their own generous timeout (60s). A timeout that only fits the happy path turns re-authentication into a random red. |

## Reusable failures recorded on 2026-09-17 (phân hệ 01 — quản lý điểm bán, 8 lần chạy thật)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `waitForResponse` treo tới hết timeout trên MỌI case, trong khi project `setup` đăng nhập xanh; log không hề nói "chưa đăng nhập" | `storageState` không khôi phục được phiên của app này: access token nằm trong RAM, chỉ `refreshToken` ở cookie và hệ thống xoay vòng nó, nên `.auth/<vai>.json` chỉ dùng được cho test ĐẦU TIÊN của vai. `page.goto` trần bị app đá về `/account`, request danh sách không bao giờ nổ. | Mọi spec mở màn bằng `moTrang(page, url, vai)` của `shared/auth/login.js`, 🚫 không `page.goto` trần. Cảnh báo này đã ghi sẵn ở `shared/auth/roles.setup.js` — đọc `login.js` + `roles.setup.js` TRƯỚC khi viết spec đầu tiên của phân hệ. |
| `locator('.ant-select:has(input[placeholder*="..."])')` treo hết `actionTimeout` dù placeholder nhìn thấy trên màn | antd v6 render placeholder của `Select` vào một `<div>`; `<input>` bên trong có `placeholder` rỗng. (Khác `Input` thường — cái đó vẫn có placeholder thật.) | Bắt `Select` theo container của hàng lọc + thứ tự khai trong source, hoặc theo `innerText` của chính `.ant-select`. 🚫 Không dùng `input[placeholder]` cho `Select`. |
| Mở bộ lọc A nhưng đọc ra danh sách lựa chọn của bộ lọc B; case "B lọc theo A" đỏ oan | `.ant-select-dropdown:visible` — antd giữ dropdown đã mở trước đó trong DOM, nên khi màn có nhiều `Select` thì selector này bắt trúng dropdown khác. | Lấy `aria-controls` trên `input` của chính `Select` đó, rồi **đi ngược lên** `.ant-select-dropdown` bọc ngoài: `page.locator('.ant-select-dropdown').filter({ has: page.locator('#' + id) })`. 🔴 Bám thẳng `#id` sẽ `hidden` — đó là phần tử listbox bên trong, không phải lớp hiển thị. |
| `expect(drawer).toBeVisible()` báo `element(s) not found` dù drawer mở rõ ràng trên ảnh chụp | antd v6 chỉ render `ant-drawer ant-drawer-right ant-drawer-open`; **không có** `.ant-drawer-content` lồng trong như các bản cũ. | Bám `.ant-drawer-open`. Kiểm bằng probe DOM, 🚫 đừng chép selector từ ví dụ antd đời trước. |
| Bấm `.ant-select-clear` để bỏ lọc nhưng không có request nào nổ, `waitForResponse` treo | Nút xoá của antd chỉ hiện khi **hover**; click thẳng vào phần tử ẩn không kích hoạt gì. | `hover()` trước khi bấm, hoặc bỏ lọc bằng cách mở lại màn. |
| Case không skip (đếm được dòng), nhưng assert đỏ với lý do `element not found` giữa chừng | `waitForResponse` chỉ chắc API **đã trả về**, không chắc bảng **đã vẽ lại**. Đếm dòng ngay sau đó là đếm dữ liệu cũ, rồi bảng render lại thành rỗng. | Sau mỗi lần đổi bộ lọc: chờ `.ant-spin-spinning` biến mất **và** số dòng đứng yên hai nhịp liên tiếp, rồi mới đọc bảng. |
| Assert "mọi dòng trả về đều chứa từ khoá" đỏ, dù kết quả nhìn hợp lý | Backend tìm kiếm **theo từ**, không theo chuỗi con: tìm `"hub tỉnh lý"` trả về cả điểm bán thuộc `"Bưu điện tỉnh Lý Sơn"`. | Khẳng định thứ kiểm được chắc chắn: bản ghi mà từ khoá lấy ra **phải nằm trong** kết quả. 🚫 Đừng khẳng định chiều ngược lại khi chưa biết luật tìm kiếm của backend. |
| 6/18 case skip "thiếu dữ liệu", dẫn tới kết luận SAI rằng môi trường không đủ dữ liệu | Case được gán cho vai `province`, mà tài khoản province trong `.env` là một tỉnh rất nhỏ (3 điểm bán, toàn Hub, toàn Đang hoạt động, 0 nhân viên). Vai `tct` trên **cùng môi trường** thấy 341 điểm bán, đủ ba phân loại, 10 điểm bán tạm ngừng. | 🔴 **Đo phạm vi thật của từng vai TRƯỚC khi gán case cho vai**: mở màn bằng mỗi vai, đọc tổng số và các giá trị phân loại/trạng thái. Chỉ giữ ở vai hẹp những case *kiểm chính cái phạm vi đó*; case cần dữ liệu phong phú đưa lên vai rộng. 🚫 Không kết luận "môi trường thiếu dữ liệu" khi chưa đối chiếu từng vai. |
| Case XANH nhưng không kiểm được gì: vòng lặp đối chiếu từng dòng chạy 0 lần vì bảng rỗng | "Pass rỗng" — assertion nằm trong vòng lặp trên tập rỗng thì luôn đúng. Nguy hiểm hơn đỏ vì không ai xem lại. | Trước vòng lặp, assert **số lượng tối thiểu** (`expect(count).toBeGreaterThan(0)`) hoặc `skipNoData` có lý do. 🚫 Không để một case kết thúc mà chưa chạy assertion nào. |
| Mỗi lần đoán sai locator tốn một vòng chạy đầy đủ (~15 phút) | Suy locator từ mã nguồn JSX rồi chạy cả bộ để kiểm | Viết một script probe ngắn (`chromium.launch` + `moTrang` + in ra DOM/innerText/số nút) chạy trong ~30 giây. **Probe DOM thật trước, viết locator sau.** Bốn vòng đỏ đầu tiên của phân hệ 01 đều tránh được nếu probe trước. |
| Case "vai X không thấy nút Y" xanh mà vô nghĩa | Chạy bằng vai có đủ quyền: vai `province` không thấy nút *Gắn nhân viên* vì `PermissionButton` **ẩn hẳn** do thiếu quyền — không phải vì dòng đó là Hub. | Case về **trạng thái nút** (mờ/vô hiệu) phải chạy bằng vai **có quyền**; case về **ẩn nút** mới chạy bằng vai thiếu quyền. Đọc `permissionKey.js` để biết nút nào gắn quyền nào. |


## Bẫy mới ghi 17/09/2026

### `expect.poll(...).toBeGreaterThanOrEqual(0)` là poll VÔ NGHĨA
Luôn đúng ngay nhịp đầu nên không chờ gì cả. Đã làm case skip oan với lý do "chuỗi chưa có nhân
viên nào" trong khi DB có 5.559 người. Poll phải so với điều kiện **thật sự sẽ đổi** (`> 0`), và
muốn skip khi hết giờ thì bọc `.then(() => true).catch(() => false)`.

### Bám MÃ, đừng bám chỉ số dòng, khi thao tác có ghi dữ liệu
Sau khi ghi, danh sách tải lại và thứ tự dòng đổi. Mở lại theo chỉ số cũ là mở nhầm bản ghi khác,
rồi kết luận sai rằng "lưu xong không thấy dữ liệu". Ghi lại mã ở lần đọc đầu, lần sau tìm theo mã.
Cùng lỗi này đã **gán nhân viên vào một điểm bán THẬT** trên production.

### Phân biệt "chưa gửi request" với "gửi rồi nhưng chưa có hồi âm"
`waitForResponse` timeout không có nghĩa là request chưa đi. Gộp hai thứ vào một thông báo là dẫn
người đọc đi sai hướng, và tệ hơn: server vẫn xử lý xong nên **để lại dữ liệu rác** mà không ai ngờ.
Bắt luôn `page.on('request')`, khi hết giờ thì nói rõ request đã gửi hay chưa.

### Mã điểm bán phải bắt đầu bằng mã đơn vị cha
Backend trả `SSHOP-402 — Mã điểm bán phải bắt đầu bằng mã đơn vị cha: <mã>`. Ở cấp Xã đơn vị cha là
**bưu điện xã** (`orgWardCode`), ở cấp Tỉnh là `orgProvinceCode` — nên chỉ đặt được mã SAU khi chọn
xong ô đơn vị thấp nhất. Mã đơn vị KHÔNG có trên DOM: gom `unitCode` từ response
`/v1.0/organization-unit/*` mà app đã gọi, và đăng ký `page.on('response')` **trước** khi vào màn.
🚫 Đừng gọi lại API bằng `page.request` — request đó không mang token của app, trả 401.

### Hệ quả: điểm bán đã tạo thì KHÔNG đổi được đơn vị
Ô Mã luôn `disabled` ở màn Sửa, mà mã phải khớp đơn vị cha ⇒ đổi Bưu điện tỉnh/xã luôn bị
`SSHOP-402`. UI vẫn cho chọn. Ghi nhận là lệch tài liệu, cần PO chốt.

### Dropdown phụ thuộc nhau thì phải chờ nạp
Bưu điện xã chỉ gọi API sau khi có `orgProvinceCode`; mở dropdown ngay thì nó rỗng, `count()` = 0 và
test lặng lẽ bỏ qua ô bắt buộc — sau đó đỏ ở chỗ khác với lý do "trường bị chặn".

### Case ăn theo dữ liệu của case khác phải tự bảo vệ
`-g "<mã case>"` chỉ chạy đúng case đó, biến dùng chung còn `null` và `fill(null)` ném
`value: expected string, got object`. Kiểm biến trước, thiếu thì `skipNoData` kèm lý do.

## Nhập file Excel — bẫy riêng (ghi 17/09/2026, phân hệ 01)

Dùng chung cho mọi phân hệ có `DrawerImportBase.jsx`, không riêng điểm bán.

### 🔴 Mã đơn vị trong file mẫu KHÔNG có thật
Dòng ví dụ của `/files/DiemBan_Import.xlsx` dùng `Mã tỉnh = 06`, `Mã phường xã = 0601` — không tồn
tại trong `ORGANIZATION_UNIT`. Nhập vào, job trả **`status = SUCCESS`** nhưng `totalSuccess = 0`,
`totalFailed = 1`, `errorMessage = "Dòng 2: Đơn vị cấp xã/tỉnh không hợp lệ"`. Nhìn lướt thấy
"SUCCESS" là tưởng nhập được. Luôn lấy mã đơn vị THẬT từ DB hoặc từ API danh mục, và mã bản ghi
vẫn phải mở đầu bằng mã đơn vị cha.

### 🔴 Hai kết cục khác hẳn nhau sau khi nhập
- Nhập sạch lỗi → `message.success` rồi **drawer TỰ ĐÓNG** (`handleClose`).
- Có dòng lỗi → drawer Ở LẠI, hiện khối "Import thất bại … / Tải file lỗi / Xem lịch sử".

Chỉ chờ chữ bên trong drawer là hỏng ở trường hợp đầu: drawer biến mất, locator không thấy gì, case
đỏ với lý do "job không kết thúc" trong khi job đã xong. Chờ **cả hai**: drawer ẩn HOẶC khối kết quả
hiện.

### 🔴 `POST /excel` trả `data.jobId`, `/status` trả job dưới khoá `data.id`
Hai giá trị không phải lúc nào cũng khớp. Đừng tra map theo `jobId` của POST.

### 🔴 Đọc kết quả job: nghe response của app, và phải lọc theo thời điểm
App tự hỏi `/status` mỗi 3s (`pollingInterval: 3000`) rồi **ngừng hỏi ngay khi job kết thúc**.
- 🚫 Đừng hỏi `/status` bằng `page.request` — không mang token, trả 401, poll thấy `null` mãi.
- Chỉ tin job đã có `completedDate`; response app kịp nhận thường vẫn là `PENDING` với
  `totalRecords = 0`.
- Map trạng thái để ở phạm vi module thì **giữ nguyên giữa các test**: phải xoá ở `beforeEach` VÀ
  ngay trước khi bấm Xác nhận, cộng thêm lọc theo mốc thời gian — nếu không case sau đọc trúng job
  của case trước. Triệu chứng kinh điển: **chạy riêng thì xanh, chạy cả nhóm thì đỏ**.
- Fallback đọc thẻ Lịch sử nhập cũng nguy hiểm: bảng sắp xếp mới nhất trước, job vừa gửi có thể
  chưa kịp vào bảng ⇒ đọc trúng dòng của lần nhập trước.

### 🔴 `showUploadList={false}` ⇒ không có `.ant-upload-list-item`
Tên file được vẽ thẳng vào `.ant-upload-text` trong vùng kéo thả. File bị `beforeUpload` từ chối
(`Upload.LIST_IGNORE`) thì vùng đó trở lại chữ "Kéo thả hoặc bấm để chọn file".

### 🔴 Cột Trạng thái hiển thị trạng thái SUY RA
`getImportDisplayStatus` (`importStatus.js:5`) đổi `SUCCESS` thành `FAILED` khi `totalFailed > 0`.
Nên lọc `status=SUCCESS` vẫn hiện ra dòng mang nhãn "Thất bại" — đúng sản phẩm. Kiểm bộ lọc bằng
tham số request, đừng assert nhãn từng dòng.

### 🔴 `skipNoData` phải gọi TRƯỚC khi tạo promise chờ
Gọi skip trong lúc `waitForResponse` đang treo thì Playwright huỷ test và báo
`page.waitForResponse: Test ended` — nhìn như lỗi sản phẩm, thực ra chỉ là skip đặt sai chỗ.

### Sinh file Excel: dùng `exceljs` (đã có sẵn trong `auto_test_vnpost`)
Sheet phải đúng tên (`Import_Cua_Hang`) và đủ 14 cột đúng thứ tự. Xem
`tai-lieu-test/01_quan_ly_diem_ban/tests/excel-fixture.js` để dùng lại.

## Bẫy màn Cảnh báo tồn kho (04_1) — ghi 17/09/2026

Đều thuộc loại **"thao tác chạy trót lọt nhưng không có gì xảy ra"**, tốn nhiều vòng nhất.

### 🔴 `.click()` vào tab KHÔNG đổi tab
Dải 9 nhóm tràn bề ngang, antd phủ lớp cuộn lên nên cú bấm tới hộp giới hạn của tab mà không tới
handler: Playwright báo click thành công, tab vẫn nguyên. `dispatchEvent('click')` trên
`.ant-tabs-tab-btn` thì ăn. `role="tab"` nằm ở phần tử con, không phải `.ant-tabs-tab`.

### 🔴 antd GIỮ bảng của tab cũ trong DOM
Panel chỉ bị ẩn chứ không gỡ. `page.locator('th')` gom cả cột của nhóm trước — ở nhóm *Sắp hết hạn*
vẫn đọc ra "Nguồn cấu hình" của nhóm *Dưới định mức Min*, và case đỏ oan vì tưởng sản phẩm không ẩn
cột đúng quy định. Mọi locator bảng phải bó trong `.ant-tabs-tabpane-active`, kể cả đếm dòng.

### 🔴 Tên nhóm có dấu ngoặc làm vỡ regex
`"Sắp hết (7 ngày)"` đưa thẳng vào `new RegExp(\`^${ten}$\`)` thì `(7 ngày)` thành nhóm bắt, locator
khớp 0 phần tử và case báo "thiếu nhóm cảnh báo" dù nó vẫn ở đó. Escape trước khi dựng regex.

### 🔴 Ô chọn điểm bán là DRAWER ba cột, không phải Select
`SelectShopMultiple` mở drawer *Chọn Điểm bán / Kho* với ba cột Tỉnh → Xã → Điểm bán và nút
*Xác nhận*. Tìm `.ant-select-item-option` ra 0 lựa chọn. Cột sau chỉ nạp sau khi cột trước được
chọn; danh sách tỉnh cũng nạp SAU khi drawer hiện, đọc sớm chỉ thấy 1 mục ("Tổng công ty") rồi kết
luận nhầm là môi trường không có điểm bán nào. Cột 3 dùng `.ant-radio-wrapper`, hai cột đầu dùng
`.sp-item`.

### 🔴 `filter({ has: page.getByText(...) })` lọc sai
`page.getByText` tìm trên TOÀN TRANG nên mọi cột đều "khớp" và locator trả rỗng. Lọc theo phần tử
con thì locator `has` phải tương đối với chính phần tử đang lọc, hoặc bám chỉ số cho gọn.


## Reusable failures recorded on 2026-09-18 (phân hệ 13 — công nợ điểm bán ↔ Tỉnh, run thật đầu tiên)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Mọi case trượt `waitForResponse` 15s; ảnh chụp lúc trượt là màn **Quản lý khách hàng**, không phải màn đích. Project `setup` đăng nhập XANH. | `moTrang` nhận URL **kèm `?query`** rồi chuyển nguyên cho `dieuHuongTrongApp`. Cả ba phép so trong hàm đều trượt vĩnh viễn: `MENU_THEO_ROUTE[url]` (bảng khai theo path), `a[href$="${url}"]` = **0** (link menu không mang query), `pathname.includes(url)` = **false ngay cả khi đã ở đúng trang**. Hàm quét hết 13 menu cha rồi bỏ cuộc, để trang đứng nguyên ở `/customer` — API chưa từng được gọi. | Tách `pathname` khỏi `search` ngay đầu `dieuHuongTrongApp`, dùng `pathname` cho cả ba phép so. Trước khi đổ lỗi cho sản phẩm/mạng: **đọc ảnh chụp xem đang đứng ở màn nào** — đứng ở `/customer` là dấu hiệu điều hướng hỏng, không phải API chậm. |
| "Hôm qua chạy được, hôm nay hỏng" | Phân hệ dùng `moTrang` **có query** (`13-*` `?tab=…`, `14-*` `/settings?setting=…`) **chưa từng** đi qua `dieuHuongTrongApp` thành công — 19 chỗ gọi đều dính. Những phân hệ pass ngày 17/09 đi đường khác: `01` dùng thẳng `page.goto` (một lần, trước đăng nhập), `04_1` dùng route đã khai trong `MENU_THEO_ROUTE` **và không có query**. | 🚫 Đừng suy "trước xanh nay đỏ" từ trí nhớ. Kiểm bảng `runs` trong `tool-data/tool.sqlite` — hai run module 13 ngày 17/09 cũng FAILED (`setupFailed 5/8`). |
| Tưởng `storageState` của `setup` dùng lại được cho test đầu tiên của vai | Đo trực tiếp 18/09: context mới dùng đúng state đó, `goto` vẫn bị đá về `/account` **ngay lần đầu**, dù cookie `refreshToken` còn hạn 2 ngày. Server đã xoay vòng token trước khi state được lưu. | Coi `storageState` là **vô dụng cho điều hướng**: mọi test đều phải đi nhánh đăng nhập lại của `moTrang`. Nghĩa là `dieuHuongTrongApp` nằm trên đường đi của **mọi** case — hỏng nó là hỏng cả phân hệ. |
| Bấm `.ant-tabs-tab[data-node-key="<key>"]` không đổi URL, không gọi API nào, dù Playwright báo `visible: true` và có boundingBox hợp lệ | Tab **tràn khỏi bề ngang** bị antd thu vào nút `...`; phần tử vẫn còn trong DOM nhưng trơ. Viewport 1440 → 3 tab cuối của hub (`opening-debt` x=1373 w=129 → chạm 1502, `cash-voucher`, `report`) đều trơ. | So `boundingBox().x + width <= viewport.width`. Trọn trong khung thì bấm thẳng; tràn thì `.ant-tabs-nav-more` → `.ant-tabs-dropdown-menu-item[data-menu-id$="-popup-<key>"]` (mục dropdown **không có** `data-node-key`). Đã đo: cả hai lối đều ra API 200. |
| Vá xong vẫn đỏ: "Không mở được tab=… trên /debt-reconciliation/remittance" | Dò `.ant-tabs-tab` **quá sớm** — bấm link menu là URL đổi ngay nhưng thanh tab còn đang dựng, `count()` = 0 nên hàm kết luận nhầm "màn này không dùng Tabs". | Chờ `.ant-tabs-tab, .ant-menu-item` `attached` (20s) + 1,2s rồi mới dò. Sau khi thêm bước chờ: `CNDB-ND-001` PASSED, `BC-01` (module 14, `?setting=`) PASSED. |
| Đứng nhầm khung con nhưng test vẫn chạy tiếp | Hàm điều hướng `catch(() => {})` rồi trả về êm. Case đỏ ở `waitForResponse`, người đọc log đi tìm bug sản phẩm. | `moKhungCon()` **throw** kèm URL hiện tại và gợi ý (cơ chế khác Tabs/Menu, hoặc vai thiếu quyền). Lỗi ồn ào rẻ hơn case đỏ vô nghĩa. |


## ĐÍNH CHÍNH 2026-09-18 — `page.goto` không phải thủ phạm

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `page.goto` / F5 sau khi đăng nhập luôn bị đá về `/account`, `refresh-token` trả 401 — trong khi người dùng thật bấm F5 vẫn vào được bình thường | **Không phải** do "token nằm trong RAM nên goto là mất phiên". Cookie `refreshToken` có `Path=/auth/v2/user`, còn FE mở bằng IP LAN gọi qua proxy `/__api/auth/v2/user/refresh-token` — path không khớp nên **trình duyệt không gửi cookie**. Đo: request `refresh-token` **không có header `Cookie`**. Prod không có tiền tố `/__api` nên bẫy chỉ tồn tại ở dev. | Vá `rewriteDevCookie` trong `vnpost-web/rsbuild.config.js`: strip `Domain`/`Secure` **và viết lại `Path=/`**. Sau khi vá: goto ×3 + F5 đều 200. 🔴 Khi thấy 401 ở luồng auth, **xem header request có `Cookie` không trước khi đổ cho kiến trúc token** — hai thứ này triệu chứng giống hệt nhau. |
| Tưởng `storageState` hỏng vì cùng lý do trên | Hai lỗi khác nhau chồng lên nhau. Sau khi vá path: context mới dùng `storageState` vào được **lần 1**, lần 2–3 vẫn 401 — đó mới đúng là **rotation** của refresh token. | Mỗi test tự đăng nhập trong context của mình. `.auth/<vai>.json` chỉ là vé một lần. |


## Reusable failures recorded on 2026-09-19 (phân hệ 01 — hoàn thiện 63 case còn thiếu script)

Tất cả đều là bẫy **xanh giả** hoặc **đỏ sai lý do**, gặp lại được ở mọi phân hệ dùng antd v6 + RTK Query.

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `select.locator('.ant-select-selection-item')` luôn rỗng ⇒ `toHaveCount(0)` kiểu "ô lọc đã sạch" hoặc "giá trị đã bị xoá" XANH mọi lúc; assertion `toHaveText(<giá trị>)` thì đỏ với "element(s) not found" | **antd v6 đổi chỗ**: giá trị đã chọn nằm ở `.ant-select-content.ant-select-content-has-value` (kèm attribute `title`), KHÔNG còn ở `.ant-select-selection-item` | Dùng một helper dùng chung kiểu `selectValue(select) = select.locator('.ant-select-content-has-value')`. 🔴 Mọi `toHaveCount(0)` trên locator "giá trị đang hiển thị" phải được đối chứng bằng một lần locator đó KHÁC rỗng, nếu không không phân biệt được "đã xoá" với "bám nhầm class" |
| `expect(await drawer.locator('.ant-form-item-explain-error').allInnerTexts()).toContain('<thông báo>')` đỏ với mảng rỗng, dù chụp màn hình thấy rõ thông báo | `allInnerTexts()` là phép đọc **một lần, không chờ**. Bấm Xác nhận xong antd mất một nhịp mới vẽ thông báo | Bọc trong `expect.poll(() => docLoi(scope)).toContain(...)`. 🚫 Không dùng `allInnerTexts()` trần cho bất cứ thứ gì xuất hiện SAU một hành động |
| Assertion dạng `.not.toContain('<trường>')` / `toHaveCount(0)` xanh, nhưng thật ra form chưa render gì | Thân form drawer bọc trong `{!!<state> && ...}`; state chỉ có sau một nhịp setState hoặc sau khi record về. Đọc nhãn ngay sau cú click ⇒ chỉ thấy ô điều khiển đầu tiên | Trước mọi assertion dạng "KHÔNG có X", chờ thân form render (`poll(() => labels.count()).toBeGreaterThan(1)`). 🔴 Assertion phủ định mà không có bước chờ = xanh giả, nguy hiểm hơn đỏ |
| Case skip hàng loạt với lý do "môi trường không có nhân viên / không có phân trang", trong khi dữ liệu có sẵn | Cột đếm của bảng và danh sách con trong drawer do **API riêng** đổ vào, tới SAU khi bảng/drawer đã vẽ và hàm chờ bảng đã trả về. Đếm ngay là đếm 0 | Hàm dò dữ liệu nền phải **tự poll** (quét lại vài nhịp) trước khi trả `null`; mở drawer xong phải chờ một phần tử của danh sách con hiện ra rồi mới kết luận "không có dữ liệu" |
| Bước "xoá hết bộ lọc" làm `waitForResponse` treo hết timeout | **RTK Query phục vụ lại từ cache** khi tham số quay về một tổ hợp đã gọi trước đó ⇒ KHÔNG có request nào trên mạng | Với bước đưa bộ lọc về trạng thái cũ, đo bằng **màn hình** (tổng số bản ghi, ô lọc đã sạch), 🚫 không bằng `waitForResponse`, cũng 🚫 không bằng query string của "request cuối trong lịch sử" — request đó vẫn là của lần lọc trước |
| Dropdown phụ thuộc (xã theo tỉnh, huyện theo tỉnh…) đọc ra danh sách của lựa chọn CŨ ⇒ kết luận nhầm "sản phẩm không lọc theo cha" | Đổi cha xong, danh sách con nạp bằng một GET riêng; mở dropdown ngay là đọc cache cũ | Đăng ký `waitForResponse` của đúng endpoint danh mục **trước** khi click đổi cha, `await` nó rồi mới mở dropdown con |
| `accept=".xlsx,.xls"` trên Upload nhưng file sai định dạng vẫn lên server | `accept` **chỉ lọc hộp chọn file** của trình duyệt; kéo–thả và `setInputFiles` đều không đi qua nó. Chặn thật phải nằm ở `beforeUpload` | Case "chỉ nhận định dạng X" phải kiểm CẢ `beforeUpload` bằng `setInputFiles` một file sai định dạng, và **chặn request ở tầng mạng** (`page.route` + `abort`) trước khi thử — nếu sản phẩm không chặn thì lần chạy nào cũng đẩy rác lên môi trường thật |
| `await expect.poll(...).toBeGreaterThanOrEqual(0)` "để chờ cho chắc" | Điều kiện luôn đúng ngay nhịp đầu ⇒ không chờ gì cả, rồi bước sau skip/đỏ với lý do sai | 🚫 Không viết poll với điều kiện luôn đúng. Poll phải chờ một điều kiện có thể SAI |


## Bẫy ghi lại 2026-09-20 (phân hệ 02 — quản lý nhân viên, 72 case)

Đều lặp lại được ở mọi phân hệ dùng antd v6 + PageContainer + drawer nạp dữ liệu qua ref.

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `getByRole('button', { name: '<nhãn>', exact: true })` báo **element(s) not found**, trong khi ảnh chụp thấy nút rõ ràng — rất dễ kết luận nhầm "nút bị ẩn vì thiếu quyền" | Nút antd có icon ⇒ **tên trợ năng gồm cả tên icon đứng trước**: `export Xuất Excel`, `plus Thêm mới`, `upload Nhập từ excel` | 🚫 Không `exact: true` cho nút có icon. Dùng tên khớp lỏng, hoặc đọc `innerText` của nút |
| `.ant-pro-page-container-title` không tồn tại ⇒ mọi assertion tiêu đề màn đỏ với "element(s) not found" | PageContainer của bản antd đang dùng render tiêu đề ở **`.ant-page-header-heading-title`** | Bám `.ant-page-header-heading-title`. 🔴 Lớp CSS của thư viện là thứ phải PROBE, 🚫 không suy từ tên component |
| Hàm đọc tổng số bản ghi trả `null` khi bộ lọc không ra kết quả ⇒ case so sánh nào cũng đỏ với lý do vô nghĩa | Bảng rỗng thì sản phẩm **bỏ hẳn** phần `(N bản ghi)` ở tiêu đề **và cả thanh phân trang** — không hiện "(0 …)" như tài liệu mô tả | Hàm đọc tổng phải quy bảng rỗng về **0** (đối chứng bằng `.ant-empty`), và chỗ lệch với tài liệu ghi vào `test-cases.md` |
| Test đầu tiên của một vai đỏ với "API không trả 200 / Received 401", chạy riêng lại xanh | `waitForResponse` bắt **đúng lần gọi của phiên cũ**: `storageState` hết hiệu lực ⇒ lần nạp trang đầu gọi API bằng token cũ → 401 → app đá về `/account` → `moTrang` đăng nhập lại rồi gọi lần hai | Predicate phải loại 401: `(r) => laApi(r) && r.status() !== 401`. 🔴 Nhưng khi **mọi** lần gọi đều 401 thì đó là **phân quyền**, không phải phiên — phân biệt bằng cách thu cả dãy mã trạng thái rồi kết luận |
| Drawer Sửa mở ra **trắng trơn**, mọi ô rỗng ⇒ đỏ với "sản phẩm không nạp lại dữ liệu cũ" — trong khi thao tác tay thì đầy đủ | Nút *Chỉnh sửa* gọi `ref.current.handleUpdateEmployee()` của thẻ đang hiển thị. Bấm **trước khi thẻ nạp xong** thì drawer vẫn mở nhưng `item` rỗng. Người thao tác tay luôn chậm hơn nên không bao giờ gặp | Chờ **dữ liệu của bản ghi hiện ra trên màn** (ví dụ mã bản ghi trong `.ant-tabs-tabpane-active`) rồi mới bấm nút mở drawer. Chờ "nút visible" là chưa đủ |
| Ô `Select` bị vô hiệu nhưng `toHaveClass(/ant-select-disabled/)` trượt, nhận về `"ant-select-content"` | Tổ tiên gần nhất chứa chữ `ant-select` là `.ant-select-content`, không phải thẻ bọc mang lớp `ant-select-disabled` | Bám **thuộc tính `disabled` của chính `<input>`**: `expect(page.locator('#<id>')).toBeDisabled()` |
| Case "xoá trắng ô rồi kiểm thông báo bắt buộc" timeout ở `.ant-select-clear` | Select **không khai `allowClear`** ⇒ không có nút xoá; giá trị lại được code tự đặt khi chọn ô cha. Rule `required` của ô đó là **luật không bao giờ chạm tới được** | 🚫 Không hạ kỳ vọng thành "ô luôn có giá trị". Tắt case kèm lý do "không tái hiện được qua giao diện" và đưa user chốt: bỏ rule hay mở `allowClear` |
| Kiểm **độ dài số điện thoại** luôn xanh dù nhập thiếu/thừa chữ số | `PhoneInput` (react-phone-number-input) chuẩn hoá giá trị form về **E.164** (`091234567` → `+8491234567`), rồi `PHONE_PATTERN` kiểu quốc tế `3+3+{4,6}` khớp cả bản 9 lẫn 11 chữ số | Đo **giá trị form thật** trước khi tin vào regex. Đây là lỗi sản phẩm cần báo, 🚫 không sửa test cho khớp |

### Bổ sung 2026-09-20 — hai bẫy của chính BỘ CÔNG CỤ (không phải của Playwright)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `checklist.js` báo phân hệ "0 case có script" dù spec đã viết đủ | `CASE_ID_IN_TITLE` chỉ nhận mã phân hệ **toàn số** ⇒ `03a_010_001`, `03b_060_002`, `03a_PQ_001` không khớp nhánh nào | Đã sửa regex ở `tool/core/cases.js` (nhận `\d\d[a-z]?` và mã task chữ). 🔴 Khi checklist và mắt thường lệch nhau, nghi **công cụ đếm** trước khi nghi spec |
| Một case lẻ bị báo "chưa có script" trong khi `test()` của nó nằm ngay đó | Title chứa **dấu nháy kép**: bộ đếm bắt title bằng `/(['"`])([^'"`]+)\1/` nên cắt ngang ở dấu nháy và mã case rơi ra ngoài | 🚫 Không đặt `"` hay `'` trong title `test()`. Dùng «…» hoặc bỏ hẳn dấu nháy |

### Bổ sung 2026-09-20 (phân hệ kho 04_2 · 04_3 · 04_4)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Chọn ngày ở bộ lọc xong **không có request nào**, `waitForResponse` treo hết timeout ⇒ rất dễ kết luận nhầm *"bộ lọc thời gian không có tác dụng"* (đã kết luận nhầm đúng một lần) | Hai ô *Ngày bắt đầu* / *Ngày kết thúc* là **một RangePicker**: chọn mốc đầu xong tiêu điểm tự nhảy sang ô sau, panel vẫn mở, và danh sách chỉ nạp lại **sau khi chọn đủ CẢ HAI** mốc | Luôn chọn đủ hai mốc rồi mới chờ response. Và khi chọn **trùng** giá trị đang có thì tham số không đổi ⇒ RTK Query trả cache, cũng không có request — phải chọn ngày KHÁC |
| Ô "Chọn Điểm bán / Kho" bấm vào không mở dropdown; chờ `.ant-select-dropdown` timeout 15s rồi đổ cho vai thiếu quyền | Ô trông như `.ant-select` nhưng mở một **drawer ba cột** Tỉnh → Xã → Điểm bán; cột sau chỉ nạp sau khi cột trước được chọn, và cột 3 là `.ant-radio-wrapper` | Dùng helper riêng cho drawer này (xem `04_1/alert-page.js` hoặc `04_3/warehouse-page.js`). 🔴 Gặp `.ant-select` mà không mở dropdown thì **tìm drawer**, 🚫 đừng kết luận thiếu quyền |
| Case hiện **ĐỎ** với `page.waitForResponse: Test ended` trong khi đúng ra phải là **SKIP** | `waitForResponse` được đăng ký **trước** một bước có thể `test.skip()`; test kết thúc để lại promise treo | Đăng ký chờ **sau** bước có thể skip, hoặc `.catch(() => null)` và `await` nó trước khi skip |
| Nạp tệp Excel bị coi là thao tác "chỉ đọc" | `POST .../uploads` **tạo một lượt khai báo thật** hiện trên danh sách, dù chưa ghi vào tồn kho | Mọi thao tác nạp tệp phải khai `mutates: true`. 🔴 Tiêu chí là **có để lại bản ghi hay không**, 🚫 không phải "có đụng tồn kho hay không" |

### Bổ sung 2026-09-20 — tiêu đề `test()` dựng bằng vòng lặp sinh case TRÙNG

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Một phân hệ 32 case mà `--list` ra **43 test**; mỗi case của vòng lặp hiện **hai lần**, một bản chạy thật và một bản skip | Viết `for (const [id, ten] of [...]) test(\`${id} — ${ten}\`, …)`. Bộ đếm script (và bộ sinh file *case chưa chạy được*) đọc mã case ở **đầu tiêu đề tĩnh**, tiêu đề dựng bằng biến thì không khớp ⇒ case bị coi là "chưa có script" rồi sinh thêm một bản skip trùng | 🔴 **Tiêu đề `test()` luôn viết NGUYÊN VĂN**, 🚫 không dựng bằng biến. Thân test lặp lại thì tách ra một hàm dùng chung và gọi từ từng `test()` có tiêu đề tĩnh. Bộ sinh stub nay còn nhận mã case theo **mọi chuỗi literal** trong spec để không sinh trùng nữa |

### Bổ sung 2026-09-20 — file "case chưa chạy được" từng XANH RỖNG

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| File tạm gồm toàn case chưa viết phép kiểm, chạy lên vẫn **PASS**; báo cáo đếm chúng vào "đã kiểm và đạt" | Thân test chỉ gọi `chanNeuTat(id)`. Case nào `skipReason()` trả `null` (đủ điều kiện chạy) thì test **không skip, không assert gì** rồi kết thúc xanh | 🔴 Trong file stub, khi không có lý do nào khác thì vẫn phải `test.skip(true, 'Case … CHƯA viết phép kiểm')`. 🚫 Không bao giờ để một `test()` kết thúc mà chưa chạy assertion nào |

### 🔴 Bổ sung 2026-09-20 — 9 spec trỏ thẳng vào PRODUCTION

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Spec chạy "bình thường" nhưng thao tác trên dữ liệu **production**, kể cả case GHI (bán hàng, loyalty, phân quyền, mô hình tổ chức) | Chín file spec cũ viết cứng host `https://vnpost.sfin.vn` trong hằng số URL rồi `page.goto(...)` thẳng vào đó, bỏ qua `BASE_URL` của `.env` | 🔴 **Mọi URL trong spec phải lấy từ `BASE_URL`** (`shared/vnpost-config`). 🚫 Không viết host vào spec. Đã sửa cả 9 file 20/09/2026 và thêm dòng cảnh báo ở đầu mỗi file |

## Nhãn tiếng Việt NFD làm `hasText` và `placeholder^=` trượt im lặng

**Triệu chứng.** Test báo *"không thấy ô tìm kiếm"*, *"ô lọc không có lựa chọn nào"*, hoặc
`filter({ hasText: '<nhãn tiếng Việt>' })` trả 0 phần tử — trong khi ảnh chụp cho thấy ô **có** trên
màn với đúng chữ đó.

**Nguyên nhân gốc.** Chuỗi tiếng Việt trong DOM thường ở dạng **tổ hợp (NFD)**: `ế` = `e` +
dấu mũ + dấu sắc. Chuỗi viết trong file test là **NFC**. CSS attribute selector
(`[placeholder^="…"]`) và `hasText` với chuỗi đều so **byte**, 🚫 không chuẩn hoá ⇒ trượt.

**Vì sao nguy hiểm.** Triệu chứng giống hệt *"sản phẩm thiếu ô này"* ⇒ rất dễ ghi vào báo cáo thành
**lỗi sản phẩm không có thật**, và người đọc báo cáo không có cách nào phát hiện.

**Luật phòng ngừa.**
1. 🚫 Không so chuỗi tiếng Việt có dấu trong selector. Bám vào **đoạn không dấu** của nhãn
   (`input[placeholder*="m ki"]`), hoặc lọc trong JS sau khi **bỏ dấu cả hai vế**.
2. Khi một assertion nói *"không thấy X"*, **luôn** in ra danh sách thứ đang thật sự có trên màn
   trong thông báo lỗi — đó là thứ phân biệt lỗi script với lỗi sản phẩm trong vòng 5 giây.

## Bổ sung 2026-09-22/23 — chuyển từ file bàn giao `.claude/plans/2026-09-22_ban-giao-mau-qc-va-seed.md`

### Chạy lệnh và đọc artifact

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Chạy xong mà `results.json`, `playwright-report/` rỗng, trông như mọi case skip sạch | Hook `rtk` thay reporter bằng bản rút gọn | 🔴 Chạy Playwright bằng tay thì luôn dùng `rtk proxy npx playwright …` |
| Có exit code nhưng không biết bao nhiêu case skip | `--reporter=line` **ghi đè** mọi reporter khai trong config | 🚫 Không thêm `--reporter=…` khi cần số liệu |
| `diff` báo "Files are identical" dù `md5` khác; `grep` chuỗi có thật ra 0 kết quả | Hook `rtk` lọc output | Lệnh so sánh/tìm để **xác nhận kết luận** phải qua `rtk proxy`, hoặc dùng `md5`/`cmp` |
| Chạy một case mà mất ~90 giây, hoặc probe làm bộ seed 1→7 chạy lại, đẻ thêm dữ liệu `AUTO_` không xoá được | `dependencies` của project chạy **toàn bộ** spec của project phụ thuộc, 🚫 không lọc theo `--grep` | Sửa một case: `--project=<vai> --no-deps --grep "<mã>"`. `.auth/` có sẵn là đủ, `moTrang()` tự đăng nhập lại |
| Mọi test skip sạch | FE dev (rsbuild) 🚫 không nghe biến `PORT` | Khởi động bằng `pnpm start --port <cổng>` |
| `curl` FE trả 200 nhưng mọi vai đỏ ở bước setup | Trang 200 là màn hình **Build failed** (thiếu gói trong `node_modules`) | Kiểm **nội dung** trang, 🚫 không tin mã HTTP. Backend cũng có lúc 502 toàn bộ ⇒ `curl` API trước khi sửa script |

### Đăng nhập, vai, phiên

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Mọi case của một vai đỏ trong 1–3 ms với `ENOENT` / "Error reading storage state" | Thêm vai vào `projects:` nhưng quên `VNPOST_SETUP_ROLES` trong `.env` ⇒ `.auth/<vai>.json` không được sinh | Thêm vai là sửa **cả hai chỗ** |
| Case chạy bằng sai tài khoản mà vẫn xanh | `testMatch: /.*\.province\.spec\.js/` nuốt luôn `*.province_manager.spec.js` | Chặn bằng lookbehind `(?<!_manager)` khi tên vai là tiền tố của vai khác |
| Đổi vai cho tài khoản xong, setup xanh nhưng case đỏ "Không điều hướng được tới … (đã quét N menu cha)" | `.auth/<vai>.json` mang token cấp **trước** khi đổi vai; auth-service còn cache quyền ở Redis TTL 30 ngày | Đổi quyền xong: `rm .auth/<vai>.json`, và nghi cache Redis. Case hành xử như cũ ⇒ tìm bản sao cũ, 🚫 đừng sửa spec |
| Chạy riêng một case thì xanh, chạy cả bộ thì từ case thứ hai đỏ | Case đầu còn dùng được `storageState`, các case sau phải đăng nhập lại và đi qua menu | Dấu hiệu của quyền/menu cũ trong phiên mới, không phải lỗi locator |
| Case so sánh hai người dùng đỏ oan, hai màn giống hệt nhau | Gọi `moTrang(page, …, <vai 2>)` trên cùng `page` ⇒ phiên người thứ nhất vẫn sống, không đăng nhập lại | Mỗi người dùng một **`browser.newContext()`** riêng |
| Bước setup mất 17 giây/vai thay vì 3 giây | `click()` ở màn chọn phạm vi đã ăn nhưng trang rời đi, phần tử detach, Playwright retry đủ 15 giây; lỗi bị `.catch(() => {})` nuốt | Click dẫn tới điều hướng thì đặt `timeout` ngắn (`3_000`) rồi phán quyết bằng URL |
| Kiểm "nút bị ẩn theo quyền" luôn xanh | Token của vai rỗng quyền (vd. 401) ⇒ **mọi** nút đều ẩn | Kiểm quyền phải kèm **phép kiểm đối chứng**: thứ vai đó CÓ quyền vẫn hiện |

### antd

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Submit báo thiếu trường dù click "thành công" | Node cây `disabled` (vd. danh mục cấp 1 khi `preventRootSelection`) vẫn khớp text | Kiểm lại giá trị ô sau khi chọn; chọn node lá |
| "element is not visible" tới hết timeout | `Radio.Button` có `<input>` ẩn | Bấm vỏ `.ant-radio-button-wrapper` |
| "Timeout chờ response", tưởng API chết | Nút bọc `Popconfirm` / hộp xác nhận (vd. "Ca làm việc bị chồng lấn") — chưa bấm xác nhận thì 🚫 không request nào đi | Chờ và bấm nút xác nhận trước khi chờ response |
| Bấm nhầm nút mở chi tiết, rời trang | Nút thao tác chỉ có icon, `getByRole('button').first()` | Bám icon: `button:has(.anticon-<tên>)`. Đọc tên icon thật trong `error-context.md` (vd. nút xoá mang `close`, 🚫 không phải `delete`) |
| Test đỏ dù dữ liệu đã tạo xong | `res.text()` sau khi trang `navigate(-1)` | Đọc body ngay khi response về, trước thao tác điều hướng |
| Tưởng tạo thất bại dù POST 200 | Bản ghi mới 🚫 không ở đầu danh sách | Tìm bằng ô lọc theo mã |
| "Nhập số điện thoại" trúng nhiều ô, ô cuối rỗng | `getByPlaceholder` 🚫 phân biệt hoa/thường | Giới hạn phạm vi hoặc `exact: true` |
| `getByRole('combobox', { name })` ra 0 phần tử | Nhãn là `div` rời, ô không có accessible name | Neo theo `Form.Item` chứa nhãn |
| "element not found" dù giá trị đúng | Ô nằm trong `Collapse`, khối tự đóng sau thao tác | Kiểm ở **payload request** |
| "intercepts pointer events", `force: true` cũng vô ích | Lớp `Spin` phủ | Chờ `.ant-spin-spinning` biến mất trước khi click |
| Chọn nhầm giá trị của Select khác, rồi kẹt `element is not stable` | `.ant-select-dropdown:visible` bắt dropdown **vừa đóng** (antd gắn `-hidden` sau một nhịp animation) | Bám `.ant-select-dropdown:has(#<name>_list)` |
| Chọn xong nhưng ô vẫn trống, 🚫 không lỗi nào | Component tự trả ô về giá trị cũ (vd. `AssignmentRoleSelect` khi cặp người × vai đã có ở dòng khác) | **Đọc lại ô** sau khi chọn, 🚫 đừng tin cú click |
| So số dòng lệch ("Expected: 2, Received: 15") | Đọc số dòng ngay khi drawer vừa mở, dữ liệu về sau một nhịp mạng | Chờ response nạp danh sách trước khi đếm |
| Cú chọn rơi vào dòng khác của drawer nhiều dòng | Bám ô bằng `.last()` theo placeholder, drawer còn dòng trống khác | Neo vào một ô định danh được của dòng rồi đi tương đối |

### Case ghi và bộ dựng nền

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Case xanh đúng một lần, lượt sau đỏ (form chặn, `waitForResponse` chết 180 giây) | Lấy "dòng đầu danh sách", đã bị chính case này dùng ở lượt trước | Case ghi phải **tự dò dữ liệu chưa bị dùng**; hết thì skip kèm lý do đo được |
| Bộ dựng nền đỏ mỗi lần chạy lại dù mọi thứ đã đúng | Coi lỗi "đã tồn tại / trùng lịch" của backend là đỏ | Idempotent hai lớp: xem dữ liệu trước, và coi lỗi trùng là **đã dựng xong** |
| Bộ dựng nền ghi nhầm cho bản ghi khác | Không khớp tên thì fallback `first()` | 🚫 Không `first()` khi không khớp; ô chọn hiển thị **tên hiển thị**, không phải nhãn phạm vi trong `.env` |
| Case bị khoá ghi dù không ghi gì | Mọi kỳ vọng là "bị chặn, không gửi request" | Chạy dưới `chanGhi()`, 🚫 không cần `allowMutation` |
| Lý do chặn trong `test-input.json` không đúng với code | Lý do ghi từ lâu, code đã đổi | Đọc lại code trước khi tin lý do chặn |
| Rót giá trị seed vào ô trống làm case xanh vì kiểm nhầm thứ khác | Ô trống **ngoài** `required` thường là cố ý ("SKU không tồn tại") | Chỉ rót khoá nằm trong `required` |
| Alert nhập Excel chỉ hiện "0/N dòng hợp lệ", đoán sai nguyên nhân nhiều lần | Lý do từng dòng nằm ở `warningMessage` của API preview | Đọc `GET …/previews/{id}/items`, 🚫 không đoán từ con số Alert |
| API batch trả 200 nhưng một số dòng không được lưu | Dòng hỏng nằm ở `data.errors` | Kiểm `data.errors` rỗng, 🚫 không dừng ở `status.code` |

### Bộ đếm `tool/core/specs.js` (`quetSpec()` — nguồn đếm duy nhất)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Báo 100% có script trong khi 79% là `test.skip` rỗng | Đếm mã case xuất hiện trong `test()` | Phân loại theo **thân test** |
| Case skip có điều kiện bị tính vỏ rỗng | Coi mọi `test.skip(true, …)` là vô điều kiện | Chỉ bắt `\|\| true` |
| Cả file không khớp test nào | Regex tên case dừng ở dấu `"` trong nháy đơn | Khớp tới đúng dấu nháy mở |
| Bỏ sót `await expect\n  .poll(...)` | Chỉ tìm `expect(` | `expect\s*[.(]` |
| Báo nhầm hàng trăm case "tắt không ai biết vì sao" | Chỉ đọc `_blocked` | Đọc cả `blockedReason` và `_note` cấp file |
| Case uỷ thác phép kiểm cho hàm cùng file bị tính vỏ rỗng | Chỉ soi thân `test()` | Gom hàm khai trong **chính file** có `expect`; 🚫 không tính hàm nhập từ `*-page.js` |
| Báo cáo nhiễu dòng "skipped" | Stub trùng mã với spec thật ở file "chưa chạy được" | Viết case thật xong thì xoá stub cùng mã |

## Bổ sung 2026-09-23 (phân hệ 03a — lịch làm việc, cấu hình chấm công)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| `response.json: Protocol error (Network.getResponseBody): No resource with given identifier found`, lúc đỏ lúc xanh | Trang điều hướng/nạp lại ngay sau response (đăng nhập lại trong `moTrang`, màn tự nạp lại sau khi ghi) ⇒ trình duyệt đã bỏ body khi test mới gọi `.json()` | Đọc body **ngay trong predicate async** của `waitForResponse` (`async (r) => { body = await r.json(); return true; }`). 🚫 Đừng chuyển sang `page.route('**/*')` + `route.fetch()`: đã đo, cách đó làm treo request của app |
| Helper chờ response "sạch" (bỏ qua 401 của phiên cũ) treo hết timeout ở request GHI | Lỗi nghiệp vụ như `SSHOP-401` trả kèm **HTTP 401** | Với request ghi, nhận mọi mã HTTP rồi đọc `status.code` trong body; chỉ lọc 401 cho request đọc |
| Đọc ô trong drawer ra `0` / rỗng dù dữ liệu thật khác; helper "chụp rồi khôi phục" ghi đè cấu hình thật bằng giá trị mặc định | Drawer hiện ô ngay, rồi mới gọi API nạp dữ liệu và `setFieldsValue` | Đăng ký `waitForResponse` của API nạp **trước** khi mở drawer, chờ nó, rồi `toHaveValue(<giá trị từ response>)` trước khi đọc/chụp |
| `getByRole('button', { name: /^Huỷ ca ngày/ })` ra 0 dù nút có trên màn | Tên trợ năng có **tiền tố tên icon** (`stop Huỷ ca ngày …`) | 🚫 Không neo `^` khi nút có icon; hoặc ghi đủ tiền tố icon |
| Case "vào từ một bản ghi cụ thể" chạy qua một nút khác trông giống ⇒ đỏ như lỗi sản phẩm | Có hai lối vào cùng một hộp thoại (nút chung ở danh sách vs nút trong drawer của bản ghi), mỗi lối điền sẵn khác nhau | Đọc code xem lối nào đặt trạng thái kịch bản cần, rồi đi đúng lối đó |
| Đếm phần tử lưới ra 0 ngay sau khi "mở màn xong" | Màn gọi API **hai lần** (bản cá nhân trước, bản toàn đơn vị sau); helper mở màn trả về ở response đầu | Chờ chính phần tử cần đếm hiện ra (hoặc chờ đúng response thứ hai), 🚫 đừng đếm ngay |
| Case chạy xanh mà không kiểm gì; trạng thái gộp theo mã báo "Đạt" dù case thật đang skip | Còn **stub rỗng** (`test('<mã> …', async () => { chanNeuTat(id); })`) ở file khác cho một mã đã có phép kiểm thật; khi case được bật, stub chạy xanh | Viết case thật xong thì xoá stub cùng mã: `node tool/bin/xoa-stub-trung.js <phân hệ> --ap-dung` |
| Case "không còn nút X" xanh trên dữ liệu đã tiêu thụ | Tiền đề (vd. "có ca đang mở") không còn đúng nên nút vắng vì lý do khác ⇒ pass rỗng | Kiểm tiền đề trước, không đúng thì `test.skip` kèm lý do đo được. Tiền đề là trạng thái dùng một lần thì 🚫 không `expect` nó (đỏ đọc như lỗi sản phẩm) |
| Ô "Tìm kiếm sản phẩm" luôn báo "Không tìm thấy sản phẩm" dù gõ đúng SKU có thật | `SelectStockRequestProduct` gọi `basic-search-product-unit?productName=` — lọc theo **tên**, 🚫 không theo SKU; kết quả nằm trong popup `div.absolute` tự vẽ, 🚫 không phải `.ant-select-dropdown` | Gõ TÊN sản phẩm; bấm dòng `.cursor-pointer` trong popup. Bắt response API tìm trước khi kết luận "môi trường không có sản phẩm" |
| Thẻ số tổng hợp ra 0 ngay sau khi đổi phạm vi | Thẻ số nạp sau một nhịp mạng | `expect.poll` tới khi thẻ phản ánh dữ liệu đã biết (vd. > 0 khi chính case vừa tạo cấu hình) |

## Bổ sung 2026-09-23 (phân hệ 04_3 — nhập / xuất / chuyển kho)

| Symptom | Root cause | Prevention/action |
| --- | --- | --- |
| Helper mở form chờ `.ant-modal-wrap` treo hết timeout, màn vẫn hiện form bình thường | Form đã đổi từ Modal sang **Drawer** (`.ant-drawer-open`) | Định vị form bằng nội dung (`.ant-drawer-open, .ant-modal-wrap` lọc `hasText` tiêu đề khối), 🚫 không gắn cứng loại vỏ |
| Locator drawer lọc theo chữ trong thân drawer mất tác dụng khi dữ liệu đầy | Khối đó bị ẩn theo điều kiện (vd. khối upload biến mất khi đủ số file tối đa) | Lọc drawer theo `.ant-drawer-title`, 🚫 không theo chữ của khối có điều kiện |
| Assert thông báo toast (`.ant-message`) đỏ "element not found" dù thông báo có hiện | Toast tự tắt sau ~3 giây; test chỉ đọc sau khi chờ một chuỗi request dài | Bắt `waitFor({ state: 'attached' })` **trước** hành động, `await` kết quả sau |
| Vai tạo được bản ghi nhưng không mở lại được để sửa/duyệt | Quyền TẠO và quyền XEM DANH SÁCH tách rời theo vai (vd. vai tạo không thấy thẻ danh sách, vai xem không có nút tạo) | Đo nút/thẻ của TỪNG vai trước khi gán case; case sau tìm lại bản ghi bằng một dấu (ghi chú/mã) do case trước đặt, 🚫 không truyền biến giữa hai project |
| Ô số lượng dòng hàng bị `disabled` không rõ lý do | Form khoá ô khi dòng không có bảng giá (nguồn không phải NCC) | Đọc điều kiện `disabled` trong component bảng trước khi chọn sản phẩm test; chọn SP thoả điều kiện (vd. giá tiêu chuẩn) |

## Thông báo antd: bắt NGAY khi hiện, và chờ toast cũ tắt trước khi bấm

- **Triệu chứng:** assert thông báo ra chuỗi rỗng dù mắt thấy toast; hoặc ra đúng một toast KHÁC (vd.
  "Không có quyền truy cập" của một API lúc tải trang) thay vì thông báo của hành động vừa bấm.
- **Gốc:** `message` antd tự tắt sau ~3 giây — đọc sau khi `await` một `waitForResponse` (FE chặn ⇒ chờ hết
  timeout) là đã mất. Còn `locator('.ant-message-notice').first().waitFor()` resolve ngay nếu toast CŨ còn trên màn.
- **Luật:** trước khi bấm, `expect(notice).toHaveCount(0)` (có timeout); đăng ký `waitFor` thông báo song song
  với `waitForResponse` TRƯỚC khi bấm, rồi `Promise.all`.

## Cột bảng: tìm theo tiêu đề, 🚫 chỉ số `td` cứng

- **Triệu chứng:** case "đọc trạng thái từng dòng" không khớp dòng nào ⇒ "không có dữ liệu để đối chiếu".
- **Gốc:** `td.nth(3)` viết theo thứ tự cột lúc probe; màn thêm/ẩn cột (hoặc cột STT) là lệch.
- **Luật:** đọc `thead th` → `indexOf('<nhãn>')`, assert > −1, rồi mới đọc `td.nth(idx)`.

## 🚫 Hai lượt Playwright cùng lúc bằng CÙNG một tài khoản

- **Triệu chứng:** giữa chừng bị đá về `/account` (màn đăng nhập), `moTrang` báo "Không điều hướng được…",
  bấm một nút trong app là mất phiên; case vốn xanh bỗng đỏ ngẫu nhiên ở CẢ HAI lượt.
- **Gốc:** đăng nhập / xoay refresh-token ở lượt này vô hiệu phiên của lượt kia (refresh-token xoay vòng).
- **Luật:** đang có lượt nền dùng vai X thì 🚫 chạy lượt khác (kể cả probe) bằng vai X. Muốn song song thì dùng
  LÀN khác (`VNPOST_LANE`) — mỗi làn một bộ tài khoản riêng. Lượt nào chạy trong lúc chồng phiên phải chạy lại.

### RangePicker antd: gõ phím không chắc chốt được khoảng ngày

- **Triệu chứng:** ô "Đến ngày" hiện đúng nhưng request gửi đi thiếu `fromDate`/`toDate`; case lúc xanh lúc đỏ.
- **Gốc:** gõ ngày rồi bấm Enter trên RangePicker phụ thuộc vào thời điểm focus chuyển ô — đôi khi khoảng ngày không được chốt vào form.
- **Luật:** chọn ngày bằng cách bấm ô lịch `.ant-picker-dropdown:not(.ant-picker-dropdown-hidden) td[title="YYYY-MM-DD"]` (bấm 2 lần cho cùng một ngày), rồi assert **cả hai** ô Từ ngày / Đến ngày trước khi tìm kiếm.

### Setup lười: không đăng nhập sẵn mọi vai

- **Triệu chứng:** chạy 1 case vẫn mất ~90s cho setup đăng nhập ~15 vai.
- **Gốc:** refresh-token xoay vòng nên phiên lưu sẵn chỉ dùng được cho context đầu; `moTrang` vẫn tự đăng nhập lại.
- **Luật:** `roles.setup.js` mặc định chỉ tạo file phiên rỗng; vai nào dùng thì `moTrang` đăng nhập. Muốn kiểm tài khoản mọi vai thì bật `VNPOST_SETUP_LOGIN=1`. Spec 🚫 được giả định phiên sẵn còn sống — luôn mở màn bằng `moTrang`.

### Hai lượt chạy cùng một `playwright.config.js` cùng lúc

- **Triệu chứng:** `ENOENT: no such file or directory, open '.../test-output/playwright-results/.playwright-artifacts-N/...'`, case đỏ ngẫu nhiên ở CẢ HAI lượt, `results.json` mất.
- **Gốc:** mỗi lượt Playwright xoá sạch `outputDir` lúc khởi động — lượt sau xoá trace/video/screenshot của lượt đang chạy.
- **Luật:** đang có lượt nền của phân hệ X thì 🚫 chạy lượt khác của phân hệ X (dù khác project / khác vai). Muốn song song thì gộp `-g` vào một lượt, hoặc truyền `--output` riêng cho lượt phụ.

### Tiêu đề `test()` phải viết nguyên văn mã case — 🚫 sinh động

- **Triệu chứng:** đã viết hàng chục case chạy thật mà `_CHECKLIST.md` vẫn báo "Script thật" rất thấp.
- **Gốc:** `tool/core/specs.js` tìm mã case trong chuỗi tiêu đề `test('…')` viết thẳng; hàm bọc kiểu `cap(['A','B'], …)` / `caseTct('A', …)` tạo tiêu đề bằng template ⇒ công cụ không thấy.
- **Luật:** gom phép kiểm vào hàm có tên (có `expect` trong thân), còn mỗi mã case là một `test('<mã> — <tên>', …)` viết thẳng gọi hàm đó. Hàm chỉ bọc một tầng (`kiem_x = (p) => huy(p)`) cũng không được đếm — gọi thẳng hàm có `expect`.

### Đổi nhánh `vnpost-web` trên máy đang phục vụ dev server ⇒ mọi case đỏ như lỗi đăng nhập

- **Triệu chứng:** `dangNhapVai` chết ở `getByRole('textbox', { name: /tên đăng nhập/ })` không thấy; `error-context.md` là overlay Rsbuild **"Build failed"** (vd `Can't resolve 'dexie'`), không phải màn đăng nhập.
- **Gốc:** dev server (`192.168.1.47:3200`) build thẳng từ repo `vnpost-web` trên máy — checkout sang nhánh cần gói chưa cài là FE hỏng toàn bộ, mọi phân hệ đỏ cùng lúc.
- **Luật:** trước khi chạy, `git -C ../vnpost-web branch --show-current` phải là nhánh đã cài gói (`develop`); việc git trên `vnpost-web` (merge, rebase) thì làm xong **trả lại nhánh cũ** ngay. Case đỏ ở bước đăng nhập ⇒ đọc snapshot trước, 🚫 sửa locator đăng nhập.

## Phiên phụ CÙNG tài khoản với phiên chính

- **Triệu chứng**: giữa test, API của phiên chính trả `SSHOP-405 "Mã truy cập hết hạn"` / `SSHOP-401`, hoặc test sau
  bị đá về màn đăng nhập ("Không thấy đơn vị … trên màn chọn phạm vi") — chỉ xảy ra khi có bước tiền đề chạy bằng
  `moPhienPhu(browser, <vai đang mở giao diện>)`.
- **Nguyên nhân gốc**: mở phiên phụ là đăng nhập lại cùng tài khoản ⇒ hệ thống xoay refresh token, phiên chính mất hiệu lực.
- **Luật**: helper gọi API "bằng vai X" phải DÙNG LẠI phiên chính khi X là vai của spec (xem `datPhienChinh` trong
  `14_1/tests/return-page.js`); phiên phụ chỉ mở cho vai KHÁC.

## Thông báo lỗi BE có đuôi mã request

- `status.message` của BE kèm đuôi `" (AbCdEf)"` (mã request 6 ký tự). So nguyên văn phải bỏ đuôi trước
  (`msg()` trong `14_1/tests/return-page.js`), 🚫 đừng đổi sang `toContain` cho cả câu ngắn.

## Descriptions dạng bordered

- antd `Descriptions bordered` không có phần tử bao chung nhãn + giá trị (`.ant-descriptions-item`) — lọc theo
  `.ant-descriptions-row` rồi `toContainText`.

## Payload tạo chứng từ bằng API phải mang ĐỦ khoá phân biệt kho (`inventoryId`)
- **Triệu chứng:** tạo phiếu bằng API chạy tốt nhiều ngày rồi đột nhiên SSHOP-500 "Có lỗi xảy ra" với MỌI lô của một SP, lưu nháp vẫn được.
- **Nguyên nhân gốc:** payload tự dựng bỏ `inventoryId` (form thật có gửi). BE tra tồn theo (shop, SP, biến thể) khi thiếu kho — chỉ đúng khi SP có tồn ở MỘT kho; ngay khi SP có tồn ở kho thứ hai (do chính test khác chuyển vào) truy vấn trả nhiều dòng ⇒ 500.
- **Luật:** dựng payload API theo request thật của FE, gồm mọi khoá định danh (shop, kho, lô). Lỗi 500 xuất hiện sau khi dữ liệu nền đổi ⇒ so payload script với payload FE trước khi nghi BE.

## Phiếu chuyển kho: BE tự phân bổ lô FIFO, bỏ qua lô script chỉ định
- **Triệu chứng:** gửi `batchProducts` một lô mới, phiếu tạo ra lại lấy một phần từ lô cũ; bên nhận báo 500 khi lô cũ trùng mã với lô đã có ở kho nhận.
- **Luật:** trước khi chuyển tiền đề, rút/tiêu hết lô cũ ở kho nguồn hoặc đọc lại `items[].batchProducts` của phiếu vừa tạo để biết lô thật.

## Trạng thái dùng chung giữa các test KHÔNG được chỉ nằm trong biến module
- **Triệu chứng:** spec dựng một tiền đề một-chiều (chốt chứng từ, ký, ghi sổ) "một lần cho cả file" bằng biến `let x = null`, vậy mà mỗi lượt lại tạo ra N bản — mỗi case đỏ kéo theo thêm một bản.
- **Nguyên nhân gốc:** test đỏ làm Playwright khởi động lại worker ⇒ module nạp lại, biến về `null` ⇒ case kế tiếp dựng tiền đề lần nữa.
- **Luật:** tiền đề tốn kém hoặc không hoàn tác được thì lưu định danh ra FILE (theo làn) và kiểm lại trạng thái thật trước khi dùng (xem `hdDaChot` trong `14_3/tests/chot.province.spec.js`). Sau lượt chạy, đếm bằng SELECT xem số bản sinh ra có đúng dự kiến không.

## Khối con vẽ trước khi query của nó về
- **Triệu chứng:** đã tạo dữ liệu bằng API (vd. gắn hoá đơn vào đợt) mà giao diện vẫn đọc ra trạng thái rỗng ("Chưa tiếp nhận") — lúc đạt lúc không.
- **Nguyên nhân gốc:** khối con tự gọi query riêng (RTK) sau khi cha đã hiện; đọc `innerText` ngay khi khối visible là đọc trạng thái mặc định.
- **Luật:** chờ một phần tử CHỈ có ở trạng thái mong đợi (nút "Xem đối soát"…) rồi mới đọc; 🚫 đừng coi "khối đã hiện" là "dữ liệu đã về".

## So số bằng `toContain` trên chuỗi gộp là pass rỗng
- **Triệu chứng:** kiểm "dòng tổng có số 3" XANH dù dòng tổng không có ô số lượng nào.
- **Nguyên nhân gốc:** chuỗi gộp "53.000 50.000" chứa ký tự "3".
- **Luật:** so SỐ theo từng ô (`allInnerTexts()` rồi `toContain` trên mảng), 🚫 không `toContain(String(n))` trên `innerText` cả dòng.

## Tệp mẫu cho màn nạp XML hoá đơn: bám khuôn FE đã có, thử cả biến thể số âm
- Dựng XML theo `vnpost-web/src/features/purchaseOrder/utils/poInvoiceXml.js` (nút "Tải XML test" ở chi tiết PO): khối `TTHDLQuan` dùng thẻ `*CLQuan`, dấu điều chỉnh nằm ở `TTChung/TTKhac/ProcessInvNote`, không có `TCDChinh` — đúng kiểu hoá đơn Hilo thật. Helper: `xmlHd()` trong `14_3/tests/hoa-don.js`.
- Hoá đơn điều chỉnh giảm thật có NCC ghi số DƯƠNG, có NCC ghi số ÂM ⇒ luôn thử cả hai biến thể (`am: true`) trước khi kết luận luồng đối soát đúng.
- Kiểm dung lượng tối đa phải xem máy chủ có NHẬN không (HTTP ≠ 413), 🚫 chỉ kiểm FE không chặn.

## antd v6 đổi tên class — locator theo class cũ không khớp mà không báo gì
- **Triệu chứng:** `locator('.ant-alert-message')` / `.ant-select-selection-placeholder` treo hết timeout dù màn hiển thị đúng.
- **Nguyên nhân gốc:** antd v6 đổi `.ant-alert-message` → `.ant-alert-title`, `.ant-select-selection-placeholder` → `.ant-select-placeholder`.
- **Luật:** ưu tiên `getByRole` / `toContainText` trên khối cha; buộc phải dùng class thì viết cả hai tên (`'.ant-alert-title, .ant-alert-message'`).

## AppProTable thay null bằng "-" TRƯỚC khi gọi render
- Cột render kiểu `val ? x : <Tag>Chưa có</Tag>` không bao giờ vào nhánh rỗng — màn hiện "-". Đây là LỖI SẢN PHẨM (giữ assertion đỏ), không phải lỗi locator. Kiểm ô rỗng bằng nhãn kỳ vọng, 🚫 đừng nới sang chấp nhận "-".

## Chuỗi case đỏ liên tiếp cùng `locator.click Timeout` ở nút đăng nhập
- Màn đăng nhập dev có lúc không nhận click (nút visible/enabled/stable nhưng click treo). Mọi case sau thời điểm đó đỏ cùng một kiểu.
- **Luật:** thấy ≥ 3 case đỏ liên tiếp cùng lỗi ở bước đăng nhập ⇒ lỗi môi trường, chạy lại riêng nhóm đó trước khi phân loại.

### Test sinh trong vòng `for` không được `checklist.js` đếm
- **Triệu chứng:** spec chạy đủ case, nhưng `_CHECKLIST.md` vẫn báo case đó là vỏ/thiếu script.
- **Nguyên nhân:** checklist dò mã case bằng chuỗi **literal** trong `test('<mã> — …')`; tiêu đề dạng
  `` test(`${id} — …`) `` trong vòng lặp không khớp.
- **Luật:** mỗi case một `test('<mã> — …')` viết tường minh; phần thân dùng chung đưa vào hàm helper.

### Thông báo lỗi BE có đuôi ` (requestId)`
- **Triệu chứng:** `toBe('Mã quầy thu ngân đã tồn tại')` đỏ, Received `"… (ZCrVNl)"`.
- **Nguyên nhân:** pod-service gắn `requestId` 6 ký tự vào cuối `status.message`.
- **Luật:** so nguyên văn sau khi bỏ đuôi `/\s*\([A-Za-z0-9]{6}\)$/` — 🚫 đừng nới thành `toContain` phần đầu câu.

### Drawer "Chọn Điểm bán" (`SelectShopMultiple`) giữ lựa chọn giữa các lần mở
- **Triệu chứng:** mở drawer lần 2 thì cột Xã/Điểm bán rỗng ("Vui lòng chọn Tỉnh… trước"), hoặc bấm ô không mở drawer.
- **Nguyên nhân:** tỉnh/xã đang chọn bấm lại là BỎ chọn; đóng drawer xong ô vẫn giữ focus nên click tiếp không mở.
- **Luật:** chỉ bấm tỉnh/xã khi cột sau đang rỗng; trước khi bấm ô, click ra ngoài (tiêu đề trang) rồi thử lại tới khi drawer hiện.
  Vai TCT: điểm bán là `button` (có radio bên trong), 🚫 không phải `.ant-radio-wrapper`.

### Thanh toán POS: bước xác nhận nằm trong IFRAME khác origin
- **Triệu chứng:** bấm "Xác nhận thanh toán" ở khối "XÁC NHẬN GIAO DỊCH" không phát sinh request nào (lọc `__api`), đơn không hoàn tất — dễ kết luận "SDK dev hỏng".
- **Nguyên nhân:** khối đó là iframe `vnpostpayment-dev.postpay.vn/confirm-cash`; nút là `div.btn-submit` (không phải `<button>`); request đi thẳng `api-bdvn-dev.postpay.vn` (ngoài `__api`). `getByText` ở frame chính khớp NHẦM chữ trùng.
- **Luật:** dùng `page.frameLocator('iframe[src*="confirm-cash"]').getByText('Xác nhận thanh toán', { exact: true })`; chờ `GET /orders/shops/{shop}/{orderId}/details` làm tín hiệu xong. Helper: `18_1/tests/pos-18.js › thanhToanTienMat`. Khi nghe network để chẩn đoán, 🚫 chỉ lọc `__api` — log cả request khác origin.

### Ô tiền (`InputCurrency`) để lại hộp gợi ý số tiền che phần tử bên dưới
- **Triệu chứng:** click vào Select/TreeSelect ngay dưới một ô tiền báo `<li> from <div class="suggestions-portal"> subtree intercepts pointer events` rồi timeout.
- **Nguyên nhân:** hộp gợi ý mở sau debounce 150ms và chỉ đóng bằng Escape **khi focus còn trong ô** (hoặc mousedown ngoài hộp). `fill` → `Tab` ngay thì hộp mở SAU khi đã rời ô và treo lại.
- **Luật:** `fill` → chờ ~400ms → `press('Escape')` trên chính ô → `press('Tab')` → `expect(.suggestions-portal li).toBeHidden()`.

### Tab POS treo từ lượt trước (trạng thái tab được lưu) làm helper hiểu sai màn
- **Triệu chứng:** "Màn bán hàng vẫn chặn sau khi mở ca" dù ca đang mở; ảnh chụp là màn đổi trả với tab "Hoàn trả: <mã>".
- **Nguyên nhân:** tab POS lưu bền qua lần tải trang; lượt bị dừng giữa chừng để lại tab hoàn trả đang active ⇒ ô tìm SP thường (dấu hiệu "đã mở ca") không hiện.
- **Luật:** helper mở màn phải đóng tab lạ (vd `dongTabHoanTra`) TRƯỚC khi suy luận trạng thái từ việc thiếu một phần tử.

### Cây antd (`.ant-select-tree-treenode`) có một nút `aria-hidden` để đo kích thước
- **Triệu chứng:** `treenode.first().click()` timeout "element is not visible" dù cây có dữ liệu.
- **Nguyên nhân:** virtual list chèn một treenode `aria-hidden="true"` làm nút đo — đứng đầu danh sách.
- **Luật:** lọc `:not([aria-hidden="true"])` trong dropdown đang mở; lá = có `.ant-select-tree-switcher-noop`; nhóm `selectable:false` phải bung ra trước.

### Tiền đề cấu hình tự áp vào MỌI đơn (CTKM, bán âm, HĐĐT điểm bán) phải bật/tắt theo spec
- **Triệu chứng:** các spec khác cùng điểm bán đột ngột đỏ (tổng tiền lệch, mở hộp xử lý quà khi hoàn trả…) sau khi dựng CTKM quà tặng "thường trực".
- **Nguyên nhân:** CTKM theo đơn/sản phẩm và cấu hình điểm bán áp cho mọi đơn của điểm bán, không riêng spec dựng nó.
- **Luật:** bật ở `beforeAll`, tắt/khôi phục ở `afterAll` của CHÍNH spec cần nó (`mode: 'serial'`); cấu hình dùng chung chụp bản gốc ra file trước khi sửa để khôi phục được cả khi lượt chết giữa chừng. Case đỏ ⇒ worker khởi động lại chạy `afterAll` rồi `beforeAll` lại — helper bật phải idempotent.

### Modal nghiệp vụ TỰ MỞ khi vào màn (không cần bấm) che nút chính
- **Triệu chứng:** `click` nút chính (vd "Hoàn trả") timeout "intercepts pointer events"; hover một ô ra tooltip rỗng.
- **Nguyên nhân:** màn mở modal bằng `useEffect` ngay khi đủ điều kiện (vd đổi trả đơn có quà ⇒ `ModalGiftReturn`), script vẫn đi theo thứ tự "bấm nút ⇒ chờ modal".
- **Luật:** trước khi bấm nút mở modal, kiểm modal đã hiện chưa; thao tác vùng bên dưới thì đóng modal trước.

### `mode: 'serial'` biến một case đỏ thành skip dây chuyền
- **Triệu chứng:** case sau báo "skipped" không lý do sau khi một case trước đỏ.
- **Nguyên nhân:** describe `serial` bỏ toàn bộ case còn lại khi một case hỏng.
- **Luật:** chỉ dùng `serial` khi case sau THẬT SỰ cần trạng thái case trước; bật/tắt tiền đề trong `beforeAll/afterAll` không cần `serial` (worker khởi động lại vẫn chạy lại hook).

### Tiền đề cấu hình phải ĐỌC LẠI sau khi ghi
- **Triệu chứng:** PUT trả 200, spec chạy tiếp và đỏ/skip ở chỗ khác (không có VAT, cột vẫn hiện…) — dễ báo nhầm lỗi sản phẩm.
- **Luật:** sau khi sửa cấu hình làm tiền đề, GET lại (có chờ) và đối chiếu; không đổi ⇒ SKIP kèm nguyên văn "PUT trả … nhưng đọc lại …", 🚫 đừng để case đỏ như lỗi màn hình.

### Select lọc theo chữ placeholder chỉ khớp được LẦN ĐẦU
- **Triệu chứng:** chọn giá trị thứ hai của cùng một Select (hoặc chọn nhiều mục) timeout "waiting for …filter({ hasText: '<placeholder>' })".
- **Nguyên nhân:** chọn xong thì placeholder bị thay bằng giá trị đã chọn ⇒ locator `filter({ hasText: placeholder })` không còn khớp.
- **Luật:** định vị Select một lần theo vị trí/cấu trúc (khối cha + `.first()`, `.ant-select-multiple`) rồi giữ biến đó; 🚫 lọc theo placeholder cho thao tác lặp.

### `isVisible({ timeout })` KHÔNG chờ — timeout bị bỏ qua
- **Triệu chứng:** nhánh "nếu hộp/nút hiện thì bấm" không bao giờ chạy dù hộp hiện ngay sau đó; case đỏ ở bước sau ("không có hộp chọn quà", popconfirm chưa bấm…). Đo 26/09 ở 08 combo + 11 hộp chọn SP danh mục.
- **Nguyên nhân:** Playwright bỏ qua tham số `timeout` của `locator.isVisible()` — trả trạng thái TỨC THÌ.
- **Luật:** cần chờ thì `await loc.waitFor({ state: 'visible', timeout }).then(() => true, () => false)`; 🚫 `isVisible({ timeout })`.

### Nhãn tiếng Việt dạng NFD làm `getByRole({ name: /…/ })` không khớp
- **Triệu chứng:** `getByRole('textbox', { name: /Mã vạch/ })` timeout dù snapshot hiện đúng textbox "* Mã vạch" (form combo `/product/combo`).
- **Luật:** khớp cả hai dạng: `new RegExp(\`${t.normalize('NFC')}|${t.normalize('NFD')}\`)` (xem `08/tests/combo-ghi.tct.spec.js › nhan`).

### Hàm gom phép kiểm có tham số destructuring — công cụ checklist từng đếm hụt
- **Triệu chứng:** case gọi `chay(page, browser, { … })` có `expect` đầy đủ vẫn bị `_CHECKLIST.md` báo **vỏ rỗng** (49 case 11_khuyen_mai).
- **Nguyên nhân:** `tool/core/specs.js › quetHamCoExpect` lấy `{` đầu tiên sau `function chay(` — đó là `{` của tham số — làm thân hàm. Đã sửa 26/09 (bỏ qua trọn danh sách tham số). Test sinh bằng vòng lặp với tiêu đề template (`${id} — …`) công cụ cũng không đọc được mã ⇒ viết từng `test('<mã> — …')` tường minh gọi hàm gom.

### Toast FE chặn phải gom NGAY sau khi bấm
- **Triệu chứng:** `luu()` chờ response 15s rồi mới đọc `.ant-message-notice` ⇒ FE chặn (không có request) thì toast đã tắt, đọc ra rỗng.
- **Luật:** sau khi bấm, vòng lặp đọc toast mỗi 300ms tới khi có response hoặc hết hạn (khuôn `08/tests/combo-ghi.tct.spec.js › luu`).

### Select antd v6 — không còn `.ant-select-selection-item`
- **Triệu chứng:** kiểm "ô đã chọn chưa" luôn báo rỗng (hoặc luôn có chữ) ⇒ bước chọn bị bỏ qua, request thiếu trường bắt buộc.
- **Gốc:** antd v6 đổi DOM Select; `innerText` cả Select lại chứa placeholder ("Chọn quầy thu ngân") nên cũng khác rỗng.
- **Luật:** đọc chữ của cả `.ant-select:has(#<field>)` rồi so với placeholder / giá trị mong đợi; 🚫 dựa vào class con của v5.

### `filter({ hasText })` so trên textContent — các thẻ dính liền, không có khoảng trắng
- **Triệu chứng:** regex `- TÊN\s` không khớp dòng hiện rõ trên màn; hoặc tên ngắn khớp nhầm dòng có tên dài chứa nó ("AUTO8_SHOP" ⊂ "AUTO8_SHOP_55976508").
- **Luật:** chọn dòng theo `innerText` của đúng cột (duyệt từng dòng, tách cột bằng regex neo đầu dòng); 🚫 `includes` / `hasText` với tên có thể là chuỗi con của tên khác.
