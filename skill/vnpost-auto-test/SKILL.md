---
name: vnpost-auto-test
description: Create, review, debug, and stabilize VNPost Playwright tests from Excel, CSV, Google Sheet exports, SRS, or manual test cases. Use when working in auto_test_vnpost to assess test-case readiness, map cases to sofin-business routes/components/APIs, generate UI or UI+API tests, add session/config/cleanup support, diagnose Playwright failures from screenshots/traces/error-context, or prevent flaky locators and false-positive tests.
---

# VNPost Auto Test

Build repeatable Playwright tests from business test cases while treating
`sofin-business` source code and observed runtime DOM as the technical truth.

Always use the `vnpost-project` skill first for repository context. Use the
`spreadsheets` skill when the input is `.xlsx`, `.xls`, `.csv`, or a Google
Sheet export.

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

Search `sofin-business` in this order:

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
