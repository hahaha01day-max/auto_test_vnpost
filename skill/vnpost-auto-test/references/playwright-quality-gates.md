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
| `filter({ has: ... })` không tìm thấy row dù bảng có dữ liệu | `has` dùng locator đã scope từ chính table nên quan hệ tương đối bị sai | Dùng locator con tương đối hoặc selector row ổn định trong table như `.ant-table-tbody .ant-table-row` |

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
