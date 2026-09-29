'use strict';

/**
 * PHIÊN API cho bộ seed — đăng nhập QUA FE một lần, rồi gọi thẳng API bằng đúng header của FE.
 *
 * 🔴 Vì sao lai: luồng xác thực (chọn phạm vi → token theo đơn vị, header shopId/orgUnit do
 *    `shopHeaderUtils` tính) rất dễ dựng lại sai. Đăng nhập bằng `dangNhapVai` (đã chạy ổn) rồi
 *    BẮT header từ một request thật của FE ⇒ lời gọi API mang y hệt danh tính của màn hình.
 * 🔴 Side-effect: gọi ĐÚNG endpoint + đúng thứ tự FE gọi thì backend làm đủ (vd tạo điểm bán tự
 *    sinh kho). Cái mất side-effect là SQL, 🚫 không phải API. Mỗi bước phải trace chuỗi request
 *    của FE trước khi viết.
 * 🔴 🚫 Đừng dùng `page.request` trần: không mang token của phiên ⇒ `SSHOP-405`.
 */

const { expect } = require('@playwright/test');
const { dangNhapVai } = require('../shared/auth/login');

/** Header FE gắn vào request — bỏ các header do trình duyệt tự sinh. */
const BO_QUA = /^(host|connection|content-length|content-type|accept-encoding|cookie|origin|referer|sec-|user-agent|priority)/i;

async function moPhienApi(page, vai) {
  // 🔴 Giữ header của request MỚI NHẤT, 🚫 không phải request đầu: token đổi sau bước chọn phạm vi,
  //    token bắt trước đó gọi API nào cũng `SSHOP-401` (đo 23/09/2026).
  let mau = null;
  // 🔴 FE mở bằng IP gọi qua proxy `/__api`, mở bằng `localhost`/tên miền thì gọi THẲNG `PUBLIC_BASE_URL`
  //    (`vnpost-web/src/utils/constants/config.jsx:37`) ⇒ 🚫 đừng lọc theo `/__api`, lọc theo header token.
  const bat = (req) => {
    if (/refresh-token|login/.test(req.url())) return;
    const h = req.headers();
    if (h.authorization) mau = { url: req.url(), headers: h };
  };
  page.on('request', bat);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await dangNhapVai(page, vai);
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect.poll(() => Boolean(mau), { timeout: 30_000, message: `Không bắt được request có token của vai ${vai}` }).toBe(true);
  page.off('request', bat);

  const headers = Object.fromEntries(Object.entries(mau.headers).filter(([k]) => !BO_QUA.test(k)));
  // Gốc API: có proxy thì tới hết `/__api`, không thì là origin của host API (gateway không có tiền tố).
  const goc = mau.url.includes('/__api/')
    ? mau.url.slice(0, mau.url.indexOf('/__api/') + '/__api'.length)
    : new URL(mau.url).origin;

  /** Gọi API; ném lỗi kèm body khi `status.code` khác "200". Trả `data`. */
  async function goi(method, duong, { params, data, multipart, chapNhan, headers: them } = {}) {
    const url = new URL(goc + duong);
    for (const [k, v] of Object.entries(params || {})) if (v !== undefined) url.searchParams.set(k, String(v));
    const res = await page.request.fetch(url.toString(), { method, headers: { ...headers, ...(them || {}) }, data, multipart });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = null; }
    const code = String(body?.status?.code ?? (res.ok() ? 200 : res.status()));
    if (code !== '200' && !(chapNhan && chapNhan(body))) {
      throw new Error(`${method} ${duong} → HTTP ${res.status()} · ${text.slice(0, 400)}`);
    }
    return body?.data;
  }

  return { goi, headers, goc };
}

module.exports = { moPhienApi };
