const { expect, test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const MODULE_DIR = path.resolve(__dirname, '..');

/**
 * Kiểm PHẠM VI của 8 quyền vừa khai: chức năng `CONFIG_ORDER` hiện chỉ gắn cho vai `CORP_ADMIN`,
 * nên vai điểm bán phải bị chặn.
 *
 * 🔴 Không có case này thì bộ test chỉ chứng minh "Admin gọi được", mà Admin vốn gọi được cả khi
 * TBL_ROLE_PERMISSION còn rỗng — tức là không phân biệt được "đã khai quyền" với "chưa khai".
 */
test('GVMD-018 Vai điểm bán KHÔNG gọi được API cấu hình giá vốn', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-018');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');
  test.skip(Boolean(missingRoleReason('shop')), missingRoleReason('shop') ?? '');

  const cho = page.waitForRequest(
    (r) => Boolean(r.headers().authorization) && Boolean(r.headers().chainid),
    { timeout: 60_000 },
  );
  await moTrang(page, '/', 'shop');
  const mau = await cho;
  const goc = new URL(mau.url()).origin;
  const headers = {};
  for (const [k, v] of Object.entries(mau.headers())) {
    if (['host', 'content-length', 'connection'].includes(k)) continue;
    headers[k] = v;
  }

  const res = await page.request.get(`${goc}/chain-cost-method-config/system`, { headers });
  expect(
    [401, 403],
    `Vai điểm bán nhận HTTP ${res.status()} — 200 nghĩa là quyền đang mở quá phạm vi`,
  ).toContain(res.status());
});
