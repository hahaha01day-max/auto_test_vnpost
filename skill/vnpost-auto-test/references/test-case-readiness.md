# Test Case Readiness

## Minimum fields

| Field | Requirement |
| --- | --- |
| ID | Unique and stable |
| Title | One measurable behavior |
| Role/scope | Concrete role and organization level |
| Preconditions | Reproducible state or fixture |
| Steps | Explicit action sequence |
| Expected UI | Observable result |
| Expected data | API/data side effect for mutations |
| Cleanup | Required for created or changed data |

## Classification

### READY

All minimum fields exist. Technical details may already be present.

### READY_WITH_CODE_LOOKUP

Business intent, role, steps, and expected result are clear. Route, API,
payload, and locator can be resolved from `sofin-business`.

Examples:

- “Open Delivery Units and verify filters and columns.”
- “Submit an empty form and verify required messages.”

### BLOCKED

Do not automate until clarified:

- “Create successfully” without concrete input.
- Depends on “an existing record” with no fixture or lookup rule.
- Requires payment, stock, debt, or deletion without a test tenant and cleanup.
- Expected result says only “correct” or “as designed.”
- Role/scope affects behavior but is unspecified.

## Workbook interpretation

- Blank cells are blank; do not shift values from adjacent cells.
- Ignore execution-only columns when generating expected behavior:
  `Kết quả thực tế`, `Kết quả`, `Người thực hiện`, `Ngày thực hiện`.
- Preserve the source test ID in the Playwright test title.
- Treat failed historical cases as candidates, not as expected failures.
- Split one row into multiple tests if it asserts unrelated behaviors.

## Selection priority

Choose the first sample case by:

1. No data mutation.
2. Clear route/screen.
3. Exact expected labels/columns.
4. Stable API list endpoint.
5. No dependency on an arbitrary existing row.
