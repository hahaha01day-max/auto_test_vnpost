const { expect, test } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const ANH_DIR = path.join(path.resolve(__dirname, '..'), 'anh-chup');

/** Bằng chứng dạng dữ liệu cho 4 API đọc: ghi nguyên phản hồi ra file để đính kèm báo cáo. */
test('BC-03 Ghi lại phản hồi 4 API đọc', async ({ page }) => {
  test.skip(Boolean(missingRoleReason('tct')), missingRoleReason('tct') ?? '');

  const cho = page.waitForRequest(
    (r) => Boolean(r.headers().authorization) && Boolean(r.headers().chainid),
    { timeout: 60_000 },
  );
  await moTrang(page, '/', 'tct');
  const mau = await cho;
  const goc = new URL(mau.url()).origin;
  const headers = {};
  for (const [k, v] of Object.entries(mau.headers())) {
    if (['host', 'content-length', 'connection'].includes(k)) continue;
    headers[k] = v;
  }

  const duongDan = [
    '/chain-cost-method-config/system',
    '/chain-cost-method-config/categories',
    '/chain-cost-method-config/apply-jobs?page=0&size=20',
    '/chain-cost-method-config/preview-apply?stockType=FIFO',
  ];

  const ketQua = {};
  for (const d of duongDan) {
    const res = await page.request.get(`${goc}${d}`, { headers });
    const body = await res.json().catch(() => null);
    ketQua[d] = {
      httpStatus: res.status(),
      status: body?.status,
      // Danh mục có hàng trăm dòng — chỉ giữ 3 dòng đầu làm mẫu.
      data: Array.isArray(body?.data) ? body.data.slice(0, 3) : body?.data,
      soDong: Array.isArray(body?.data) ? body.data.length : undefined,
      page: body?.page,
    };
    expect(res.status(), `${d} phải trả 200`).toBe(200);
  }

  fs.writeFileSync(
    path.join(ANH_DIR, 'BC-03-phan-hoi-api.json'),
    JSON.stringify(ketQua, null, 2),
    'utf8',
  );
});
