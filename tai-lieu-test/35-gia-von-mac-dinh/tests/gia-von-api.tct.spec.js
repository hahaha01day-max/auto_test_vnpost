const { expect, test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const MODULE_DIR = path.resolve(__dirname, '..');
const API = '/chain-cost-method-config';
const STOCK_TYPES = ['MAC', 'FIFO', 'SPECIFIC_IDENTIFICATION', 'STANDARD', 'LIFO'];
const NGUON = ['SELF', 'INHERITED', 'SYSTEM'];

/**
 * Bốn case này gọi thẳng API bằng session của trang, KHÔNG đi qua menu Cấu hình.
 *
 * 🔴 Lý do tách: mục menu "Giá vốn mặc định" đang bị ẩn bởi `hidden: !shopPrivate`
 * (`SettingPageNext.jsx:246`) và quyền `shop_private_permission` không tồn tại trong AUTHEN,
 * nên toàn bộ case đi qua giao diện bị chặn. Tách ra để phân biệt được "backend hỏng"
 * với "không vào được màn" — 🚫 không dùng nhóm này để thay thế case giao diện.
 */
/**
 * 🔴 Gateway đòi JWT ở header `Authorization` (app lấy từ redux), 🚫 không dùng cookie —
 * `fetch(..., {credentials:'include'})` trần trả 401. Nên mượn nguyên bộ header của một
 * request thật mà app vừa gửi: đúng token, đúng `chainId`/`shopId`/`appId` như người dùng.
 */
let headerApp = null;
let goc = null; // gốc API thật mà app đang gọi (localhost:8082 khi chạy local, /__api khi vào bằng IP LAN)

/** Mở lại trang và mượn nguyên bộ header của một request RTK thật (đúng token đang hiệu lực). */
async function muonHeader(page) {
  const choRequest = page.waitForRequest(
    // 🔴 Phải lấy request của RTK Query (có `chainid`): request axios chỉ mang `authorization` +
    //    `appid`, gọi lại bằng bộ header đó là 401 dù token hoàn toàn hợp lệ.
    (r) => Boolean(r.headers().authorization) && Boolean(r.headers().chainid),
    { timeout: 60_000 },
  );
  await moTrang(page, '/', 'tct');
  const mau = await choRequest;
  goc = new URL(mau.url()).origin;
  // Mượn NGUYÊN bộ header (trừ header do tầng vận chuyển tự đặt): lọc theo danh sách trắng
  // từng gây 401 lúc được lúc không vì mỗi endpoint gửi một tập header khác nhau.
  headerApp = {};
  for (const [ten, gt] of Object.entries(mau.headers())) {
    if (['host', 'content-length', 'connection', ':method', ':path', ':scheme', ':authority'].includes(ten)) continue;
    headerApp[ten] = gt;
  }
}

test.beforeEach(async ({ page }) => {
  test.skip(Boolean(missingRoleReason('tct')), missingRoleReason('tct') ?? '');
  await muonHeader(page);
});

async function goi(page, duongDan) {
  let res = await page.request.get(`${goc}${duongDan}`, { headers: headerApp });
  if (res.status() === 401) {
    // Hệ thống xoay vòng refresh token: token mượn lúc beforeEach có thể đã hết hiệu lực.
    // 🚫 Không coi 401 đầu tiên là "thiếu quyền" — mượn lại header rồi thử đúng MỘT lần nữa.
    await muonHeader(page);
    res = await page.request.get(`${goc}${duongDan}`, { headers: headerApp });
  }
  return { httpStatus: res.status(), body: await res.json().catch(() => null) };
}

test('GVMD-013 API /system trả về phương pháp mặc định toàn hệ thống', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-013');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { httpStatus, body } = await goi(page, `${API}/system`);
  expect(httpStatus, '404 = thiếu route gateway, 403 = thiếu quyền').toBe(200);
  expect(String(body?.status?.code)).toBe('200');
  expect(STOCK_TYPES, `data = ${JSON.stringify(body?.data)} — null nghĩa là chuỗi này chưa có cấu hình toàn hệ thống`).toContain(body?.data);
});

test('GVMD-014 API /categories trả về danh mục kèm nguồn', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-014');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { httpStatus, body } = await goi(page, `${API}/categories`);
  expect(httpStatus).toBe(200);
  expect(String(body?.status?.code)).toBe('200');
  expect(Array.isArray(body?.data)).toBeTruthy();
  expect(body.data.length).toBeGreaterThan(0);

  for (const dong of body.data.slice(0, 50)) {
    expect(dong.categoryId).toBeTruthy();
    expect(NGUON).toContain(dong.source);
    expect(STOCK_TYPES).toContain(dong.effectiveStockType);
  }
});

test('GVMD-015 API /apply-jobs trả phân trang chuẩn', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-015');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { httpStatus, body } = await goi(page, `${API}/apply-jobs?page=0&size=20`);
  expect(httpStatus).toBe(200);
  expect(String(body?.status?.code)).toBe('200');
  expect(Array.isArray(body?.data)).toBeTruthy();
  expect(typeof body?.page?.total_elements).toBe('number');
});

test('GVMD-016 API /preview-apply trả số liệu cảnh báo', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-016');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { httpStatus, body } = await goi(page, `${API}/preview-apply?stockType=${input.data.stockType}`);
  expect(httpStatus).toBe(200);
  expect(String(body?.status?.code)).toBe('200');
  expect(typeof body?.data?.affectedProductCount).toBe('number');
  expect(body.data.affectedProductCount).toBeGreaterThanOrEqual(0);
});
