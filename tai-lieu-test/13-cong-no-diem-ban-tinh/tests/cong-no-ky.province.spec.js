const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

/** `test-input.json` nằm ở thư mục phân hệ, KHÔNG nằm trong `tests/`. */
const DOC_DIR = path.join(__dirname, '..');

/**
 * Kỳ đối soát công nợ bán hàng — số dư mang sang giữa các kỳ.
 *
 * 🔴 CHẠY SAU `cong-no-ghi.province.spec.js` (tên file đã xếp đúng thứ tự chữ cái): kỳ 🚫 không mở được
 * khi còn điểm bán chưa khai nợ đầu kỳ, nên nhóm khai/ký phải xong trước.
 *
 * 🔴 Công thức số dư kiểm trên DỮ LIỆU API, 🚫 không đọc chữ trên màn: số hiển thị đã qua định dạng
 * nghìn/phẩy, so chuỗi sẽ vừa mong manh vừa che mất sai lệch ở phần thập phân.
 */

const VAI = 'province';
const HUB = '/debt-reconciliation/remittance';
const API_KY = '/remittance/settlement-period';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nhan = (s) => new RegExp(`${esc(s.normalize('NFC'))}|${esc(s.normalize('NFD'))}`);
const so = (v) => Number(v ?? 0);

test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
});

/** Danh sách kỳ của tỉnh, lấy từ chính API màn đang dùng. */
async function danhSachKy(page) {
  const cho = page.waitForResponse(async (r) => {
    if (!r.url().includes(API_KY) || r.request().method() !== 'GET') return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=pos-settlement`, VAI);
  const body = await (await cho).json();
  return body?.data?.content ?? body?.data ?? [];
}

/** Mở modal và chọn ĐÚNG tháng (Date trỏ vào tháng cần mở). */
async function moKy(page, thangCanMo) {
  const main = page.getByRole('main');
  await main.getByRole('button', { name: nhan('Mở kỳ đối soát') }).click();
  const modal = page.getByRole('dialog').filter({ hasText: nhan('Mở kỳ đối soát') });
  await modal.getByPlaceholder(nhan('Chọn tháng')).click();

  const t = thangCanMo;
  // antd đặt `title` ô tháng dạng YYYY-MM, 🚫 không phải nhãn MM/YYYY người dùng nhìn thấy.
  const oThang = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  // Lịch mở ở năm hiện tại; tháng cần chọn có thể ở năm khác ⇒ bấm mũi tên năm cho tới khi thấy ô.
  const lich0 = page.locator('.ant-picker-dropdown:visible').last();
  for (let i = 0; i < 24 && (await lich0.locator(`[title="${oThang}"]`).count()) === 0; i += 1) {
    await lich0.locator('.ant-picker-header-super-next-btn, .ant-picker-header-next-btn').first().click();
  }
  await page.locator('.ant-picker-dropdown:visible').last().locator(`[title="${oThang}"]`).first().click();

  const cho = page.waitForResponse(
    (r) => r.url().includes(API_KY) && r.request().method() === 'POST',
  );
  await modal.getByRole('button', { name: nhan('Mở kỳ') }).click();
  return (await (await cho).json());
}

/** Các dòng điểm bán của một kỳ. */
async function dongCuaKy(page, periodId) {
  // 🔴 Tự đưa về tab kỳ: case có thể vừa ghé tab khác để đọc số đối chiếu (ví dụ CNDB-KY-005 đọc sổ nợ
  //    đầu kỳ), và khi đó bảng kỳ 🚫 không còn trên màn — lỗi hiện ra là "không thấy nút Xem đối soát",
  //    đọc lên y như lỗi locator.
  await moTrang(page, `${HUB}?tab=pos-settlement`, VAI);

  const cho = page.waitForResponse(async (r) => {
    if (!r.url().includes(`${API_KY}/${periodId}/shops`)) return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  const main = page.getByRole('main');
  // 🔴 Trỏ dòng bằng KHOÁ DÒNG (`rowKey="id"`), 🚫 không lọc theo chữ "#id": "#1" còn khớp "#10",
  //    "#12"… nên hoặc bấm nhầm kỳ, hoặc không tìm thấy gì khi kỳ đó nằm ở trang khác.
  await main
    .locator(`tbody tr[data-row-key="${periodId}"]`)
    .first()
    .getByRole('button', { name: nhan('Xem đối soát') })
    .click();
  const body = await (await cho).json();
  return body?.data?.content ?? body?.data ?? [];
}

test('CNDB-KY-004 - Chặn mở kỳ không liền mạch với kỳ trước', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-KY-004');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  let ky = await danhSachKy(page);
  // Chưa có kỳ nào thì mở kỳ THÁNG TRƯỚC làm mốc — đây là tiền đề của phép kiểm liền mạch.
  if (ky.length === 0) {
    const thangTruoc = new Date();
    thangTruoc.setDate(1);
    thangTruoc.setMonth(thangTruoc.getMonth() - 1);
    const tao = await moKy(page, thangTruoc);
    expect(String(tao?.status?.code)).toBe('200');
    ky = await danhSachKy(page);
    expect(ky.length).toBeGreaterThan(0);
  }

  // 🔴 Cách quãng phải tính từ KỲ MỚI NHẤT ĐANG CÓ, 🚫 không từ tháng hiện tại: chạy lần hai trên cùng
  //    môi trường thì kỳ tháng sau đã tồn tại, và "tháng sau" khi đó lại là kỳ LIỀN MẠCH — case sẽ đỏ
  //    trong khi sản phẩm chạy đúng.
  const moiNhat = new Date(ky[0].toDate ?? ky[0].fromDate);
  moiNhat.setDate(1);
  moiNhat.setMonth(moiNhat.getMonth() + 1); // bỏ cách đúng một tháng so với kỳ kế tiếp hợp lệ
  const ketQua = await moKy(page, moiNhat);
  expect(String(ketQua?.status?.code)).not.toBe('200');
  const thongBao = String(ketQua?.status?.message ?? '').normalize('NFC');
  expect(thongBao).toMatch(nhan('phải bắt đầu đúng ngày'));
  expect(thongBao).toMatch(nhan('nối liền kỳ'));
});

test('CNDB-KY-005 - Nợ đầu kỳ của kỳ đầu tiên bằng số đã khai và ký', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-KY-005');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const ky = await danhSachKy(page);
  test.skip(ky.length === 0, 'Tiền điều kiện: chưa có kỳ nào được mở');
  const kyDauTien = ky[ky.length - 1];

  const choNo = page.waitForResponse(async (r) => {
    if (!r.url().includes('/remittance/opening-debt') || r.url().includes('previews')) return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=opening-debt`, VAI);
  const daKy = (await (await choNo).json())?.data ?? [];
  test.skip(daKy.length === 0, 'Tiền điều kiện: chưa có nợ đầu kỳ nào đã ký');

  const dong = await dongCuaKy(page, kyDauTien.id);
  test.skip(dong.length === 0, `Kỳ #${kyDauTien.id} chưa dựng được dòng điểm bán nào`);

  // 🔴 So từng điểm bán, 🚫 không so tổng: tổng có thể khớp trong khi hai dòng bù trừ cho nhau.
  const theoShop = new Map(daKy.map((d) => [d.shopId, so(d.amount)]));
  let daDoi = 0;
  for (const d of dong) {
    if (!theoShop.has(d.shopId)) continue;
    expect(
      Math.abs(so(d.openingBalance) - theoShop.get(d.shopId)),
      `Điểm bán ${d.shopId}: nợ đầu kỳ trên kỳ ${d.openingBalance} ≠ số đã ký ${theoShop.get(d.shopId)}`,
    ).toBeLessThan(0.01);
    daDoi += 1;
  }
  expect(daDoi, 'không đối chiếu được điểm bán nào — kỳ và sổ nợ đầu kỳ không giao nhau').toBeGreaterThan(0);
});

test('CNDB-KY-006 - Công thức số dư mang sang đúng trên từng điểm bán', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-KY-006');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const ky = await danhSachKy(page);
  test.skip(ky.length === 0, 'Tiền điều kiện: chưa có kỳ nào được mở');
  const dong = await dongCuaKy(page, ky[0].id);
  test.skip(dong.length === 0, `Kỳ #${ky[0].id} chưa dựng được dòng điểm bán nào`);

  for (const d of dong) {
    // 🔴 Chỉ NHÓM TIỀN MẶT vào công thức: tiền điện tử về thẳng tài khoản Tỉnh, đưa vào đây là tính
    //    nợ hai lần. Kỳ vọng này 🚫 không được hạ thành "cột có hiển thị".
    const mong = so(d.openingBalance) + so(d.totalCash) - so(d.provinceTotal);
    expect(
      Math.abs(so(d.closingBalance) - mong),
      `Điểm bán ${d.shopId}: nợ cuối ${d.closingBalance} ≠ ${d.openingBalance} + ${d.totalCash} − ${d.provinceTotal}`,
    ).toBeLessThan(0.01);
  }
});

test('CNDB-KY-008 - Tổng kỳ bằng tổng các dòng điểm bán', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-KY-008');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const ky = await danhSachKy(page);
  test.skip(ky.length === 0, 'Tiền điều kiện: chưa có kỳ nào được mở');
  const kyDau = ky[0];
  const dong = await dongCuaKy(page, kyDau.id);
  test.skip(dong.length === 0, `Kỳ #${kyDau.id} chưa dựng được dòng điểm bán nào`);

  const tongDau = dong.reduce((s, d) => s + so(d.openingBalance), 0);
  const tongCuoi = dong.reduce((s, d) => s + so(d.closingBalance), 0);
  expect(Math.abs(so(kyDau.openingTotal) - tongDau)).toBeLessThan(0.01);
  expect(Math.abs(so(kyDau.closingTotal) - tongCuoi)).toBeLessThan(0.01);
});

test('CNDB-KY-007 - Nợ đầu kỳ của kỳ sau bằng nợ cuối kỳ của kỳ trước', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-KY-007');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  let ky = await danhSachKy(page);
  test.skip(ky.length === 0, 'Tiền điều kiện: chưa có kỳ nào được mở');

  if (ky.length < 2) {
    // Mở kỳ LIỀN SAU kỳ đang có — chuỗi số dư chỉ kiểm được khi có hai kỳ nối nhau.
    const keTiep = new Date(ky[0].toDate ?? ky[0].fromDate);
    keTiep.setDate(1);
    const tao = await moKy(page, keTiep);
    test.skip(
      String(tao?.status?.code) !== '200',
      `Không mở được kỳ thứ hai: ${tao?.status?.message ?? ''}`,
    );
    ky = await danhSachKy(page);
  }
  test.skip(ky.length < 2, 'Tiền điều kiện: cần hai kỳ liền mạch của cùng tỉnh');

  const [kySau, kyTruoc] = ky;

  // 🔴 Dựng lại kỳ SAU trước khi so — đã đo (15/09): dựng lại kỳ TRƯỚC 🚫 KHÔNG lan sang kỳ sau, nên
  //    nợ đầu kỳ sau giữ nguyên số chụp lúc mở kỳ. Ví dụ thật: kỳ trước giảm còn 180.000 sau khi ghi
  //    nhận hai phiếu nộp, kỳ sau vẫn để 400.000 — chuỗi số dư đứt mà 🚫 không có cảnh báo nào.
  //    ⚠️ Đây là RỦI RO NGHIỆP VỤ đã báo cho user: kế toán sửa số kỳ cũ mà quên dựng lại kỳ sau thì
  //    số mang sang sai im lặng. 🚫 Đừng coi bước dựng lại này là "mẹo cho test xanh".
  const choDung = page.waitForResponse(
    (r) => r.url().includes(API_KY) && r.request().method() === 'POST',
  );
  await page
    .getByRole('main')
    .locator(`tbody tr[data-row-key="${kySau.id}"]`)
    .first()
    .getByRole('button', { name: nhan('Dựng lại số liệu') })
    .click();
  await page
    .getByRole('dialog')
    .filter({ hasText: nhan('Dựng lại số liệu kỳ đối soát') })
    .getByRole('button', { name: nhan('Dựng lại') })
    .click();
  expect(String((await (await choDung).json())?.status?.code)).toBe('200');

  const dongTruoc = await dongCuaKy(page, kyTruoc.id);
  const dongSau = await dongCuaKy(page, kySau.id);
  const cuoiTruoc = new Map(dongTruoc.map((d) => [d.shopId, so(d.closingBalance)]));

  let daDoi = 0;
  for (const d of dongSau) {
    if (!cuoiTruoc.has(d.shopId)) continue;
    expect(
      Math.abs(so(d.openingBalance) - cuoiTruoc.get(d.shopId)),
      `Điểm bán ${d.shopId}: nợ đầu kỳ sau ${d.openingBalance} ≠ nợ cuối kỳ trước ${cuoiTruoc.get(d.shopId)}`,
    ).toBeLessThan(0.01);
    daDoi += 1;
  }
  expect(daDoi, 'hai kỳ không có điểm bán chung để đối chiếu').toBeGreaterThan(0);
});
