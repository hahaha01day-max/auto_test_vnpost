const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

/** `test-input.json` nằm ở thư mục phân hệ, KHÔNG nằm trong `tests/`. */
const DOC_DIR = path.join(__dirname, '..');

/**
 * DỰNG DỮ LIỆU — Bưu điện Tỉnh lập chuyến bàn giao gom các phiếu điểm bán đã giao.
 *
 * 🔴 🚫 KHÔNG phải case nghiệm thu. Chạy sau `cong-no-nop.shop.spec.js` (điểm bán đã bàn giao phiếu)
 * và trước `cong-no.province.spec.js` (nhóm CNDB-CD-* kiểm đếm trên chính chuyến này).
 *
 * 🔴 Chuyến lập xong chỉ ở trạng thái CHỜ XÁC NHẬN — 🚫 KHÔNG bấm "Xác nhận thực nhận" ở đây: bước đó
 * sinh bút toán tất toán và đóng phiếu con, không hoàn tác được, và nó là việc của CNDB-CD-006/007.
 */

const VAI = 'province';
const HUB = '/debt-reconciliation/remittance';
const API_DS = '/province-tct/cash-inflow/lpb';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nhan = (s) => new RegExp(`${esc(s.normalize('NFC'))}|${esc(s.normalize('NFD'))}`);

test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
});

test('DỰNG DỮ LIỆU - Tỉnh lập chuyến bàn giao gom phiếu đang chờ', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-CD-006');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const choDs = page.waitForResponse(async (r) => {
    if (!new URL(r.url()).pathname.endsWith(API_DS) || r.request().method() !== 'GET') return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=province-cash-inflow`, VAI);
  const dsChuyen = (await (await choDs).json())?.data?.content ?? (await (await choDs).json())?.data ?? [];

  // Đã có chuyến chờ xác nhận với từ 2 túi trở lên thì dùng lại, 🚫 không lập chồng: mỗi kỳ chỉ được
  // một chuyến, lập nhầm phải huỷ rồi lập lại.
  const daCo = Array.isArray(dsChuyen) && dsChuyen.some((c) => c.status === 'PENDING');
  test.skip(daCo, 'Đã có sẵn chuyến bàn giao chờ xác nhận — dùng lại cho nhóm CNDB-CD-*');

  const main = page.getByRole('main');
  await main.getByRole('button', { name: nhan('Lập chuyến bàn giao') }).click();
  const drawer = page.getByRole('dialog').filter({ hasText: nhan('Lập chuyến bàn giao tiền mặt') });
  await expect(drawer).toBeVisible();

  // 🔴 Kỳ mặc định là THÁNG TRƯỚC (hạn nộp ngày 08–25 là tiền của kỳ trước). Phiếu vừa bàn giao lại
  //    thuộc kỳ THÁNG NÀY, nên phải đổi kỳ — để nguyên thì danh sách phiếu chờ rỗng và không hiểu vì sao.
  const t = new Date();
  const kyNay = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  // 🔴 Phải khớp ĐÚNG kỳ vừa chọn: mở drawer đã bắn sẵn một lần gọi cho kỳ mặc định (tháng trước), và
  //    lần đó thường rỗng. Bắt nhầm nó rồi kết luận "không có phiếu chờ" là bỏ qua cả nhóm case sau.
  const choCho = page.waitForResponse(async (r) => {
    if (!r.url().includes(`${API_DS}/awaiting`)) return false;
    const q = new URL(r.url()).searchParams;
    if (Number(q.get('periodYear')) !== t.getFullYear()
      || Number(q.get('periodMonth')) !== t.getMonth() + 1) return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await drawer.locator('.ant-picker').first().click();
  await page.locator('.ant-picker-dropdown:visible').last().locator(`[title="${kyNay}"]`).first().click();
  const phieuCho = (await (await choCho).json())?.data ?? [];
  test.skip(
    phieuCho.length === 0,
    `Kỳ ${kyNay} không có phiếu nào chờ Tỉnh nhận — điểm bán chưa bàn giao phiếu nào`,
  );

  // Tích toàn bộ phiếu chờ: một chuyến gom nhiều túi, và nhóm CNDB-CD-* cần từ 2 túi trở lên.
  const bang = drawer.locator('tbody tr[data-row-key]');
  await expect(bang).toHaveCount(phieuCho.length);
  const tickAll = drawer.locator('thead input[type="checkbox"]').first();
  if (!(await tickAll.isChecked())) await tickAll.click();

  const choLap = page.waitForResponse(
    (r) => new URL(r.url()).pathname.endsWith(API_DS) && r.request().method() === 'POST',
  );
  await drawer.getByRole('button', { name: nhan('Lập chuyến') }).click();
  const ketQua = await (await choLap).json();
  expect(
    String(ketQua?.status?.code),
    `Lập chuyến thất bại: ${ketQua?.status?.message ?? ''}`,
  ).toBe('200');
});
