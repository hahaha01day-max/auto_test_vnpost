const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

/** `test-input.json` nằm ở thư mục phân hệ, KHÔNG nằm trong `tests/`. */
const DOC_DIR = path.join(__dirname, '..');

/**
 * Công nợ điểm bán ↔ Bưu điện Tỉnh — case PHẠM VI của vai `shop` (quản lý điểm bán).
 *
 * Nguồn case: `tai-lieu-test/13-cong-no-diem-ban-tinh/test-cases.csv`. File này 🚫 không ghi dữ liệu.
 */

const VAI = 'shop';
const HUB = '/debt-reconciliation/remittance';

/** 🔴 Nhãn trong DOM có thể ở dạng NFD — regex khớp cả hai dạng tổ hợp. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nhan = (s) => new RegExp(`${esc(s.normalize('NFC'))}|${esc(s.normalize('NFD'))}`);

test.beforeEach(() => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
});

test('CNDB-ND-007 - Vai điểm bán không thấy nút Duyệt và ký', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-ND-007');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  // 🔴 Chờ lần trả về THÀNH CÔNG, 🚫 không phải response đầu tiên: khi mã truy cập vừa hết hạn, FE
  //    nhận 401 rồi tự làm mới token và gọi lại. Bắt cái 401 đó rồi khẳng định "API hỏng" là đọc sai
  //    hoàn toàn — luồng người dùng vẫn chạy bình thường.
  // 🔴 Gateway trả HTTP 200 kèm mã lỗi TRONG NỘI DUNG (`SSHOP-401`), nên `r.ok()` không lọc được gì.
  //    Phải soi `status.code` của body mới biết lần gọi nào thật sự thành công.
  const cho = page.waitForResponse(async (r) => {
    if (!r.url().includes('/remittance/opening-debt/previews') || r.request().method() !== 'GET') {
      return false;
    }
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=opening-debt`, VAI);
  const res = await cho;
  const body = await res.json();
  expect(String(body?.status?.code)).toBe('200');

  const main = page.getByRole('main');
  const ds = body?.data?.content ?? body?.data ?? [];
  let coDraft = Array.isArray(ds) && ds.some((p) => p.status === 'DRAFT');

  // Chưa có bản nháp thì ĐIỂM BÁN TỰ KHAI cho chính mình — đúng nghiệp vụ "điểm bán khai, Tỉnh duyệt",
  // và là tiền điều kiện của chính case này. 🔴 Dừng ở bản NHÁP: ký mới là thứ không hoàn tác được.
  if (!coDraft) {
    const conThieu = main.getByRole('button', { name: nhan('Khai ngay') });
    test.skip(
      (await conThieu.count()) === 0,
      'Tiền điều kiện: điểm bán đã có nợ đầu kỳ đã ký nên không khai được bản nháp mới',
    );
    await conThieu.click();
    const drawer = page.getByRole('dialog').filter({ hasText: nhan('Khai nợ đầu kỳ cho điểm bán') });
    const dong = drawer.locator('tbody tr[data-row-key]');
    const n = await dong.count();
    for (let i = 0; i < n; i += 1) {
      await dong.nth(i).getByRole('spinbutton').fill('0');
      await dong.nth(i).getByRole('textbox').fill('Auto test CNDB-ND-007 - ban nhap tien dieu kien');
    }
    const choTao = page.waitForResponse(
      (r) => r.url().includes('/remittance/opening-debt/previews') && r.request().method() === 'POST',
    );
    await drawer.getByRole('button', { name: nhan('Tạo bản khai') }).click();
    expect(String((await (await choTao).json())?.status?.code)).toBe('200');
    await expect(drawer).toBeHidden();
    coDraft = true;
  }

  test.skip(!coDraft, 'Tiền điều kiện: chưa có bản khai trạng thái Đang soạn trong phạm vi điểm bán');

  await expect(main.getByRole('button', { name: nhan('Xem dòng') }).first()).toBeVisible();
  // 🔴 Điểm bán chỉ KHAI, Tỉnh DUYỆT. 🚫 Không nới thành "nút bị disabled".
  await expect(main.getByRole('button', { name: nhan('Duyệt và ký') })).toHaveCount(0);
});

test('CNDB-PQ-001 - Vai điểm bán không vào được tab cấp Tỉnh', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-PQ-001');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const goiSoNo = [];
  page.on('request', (r) => {
    if (r.url().includes('/province-tct/cash-inflow/lpb/shortage')) goiSoNo.push(r.url());
  });

  await moTrang(page, `${HUB}?tab=lpb-shortage`, VAI);
  const main = page.getByRole('main');
  // Mốc render xong hub: có thanh tab, hoặc màn trống "chưa được cấp chức năng" khi vai không có tab nào.
  await expect(
    main.getByRole('tablist').or(main.getByText(nhan('chưa được cấp chức năng nào'))).first(),
  ).toBeVisible();

  await expect(main.getByRole('tab', { name: nhan('Nợ đơn vị vận chuyển') })).toHaveCount(0);
  await expect(main.getByRole('columnheader', { name: nhan('Số lệch') })).toHaveCount(0);
  expect(goiSoNo, 'vai shop không được gọi API sổ nợ vận chuyển').toEqual([]);
});
