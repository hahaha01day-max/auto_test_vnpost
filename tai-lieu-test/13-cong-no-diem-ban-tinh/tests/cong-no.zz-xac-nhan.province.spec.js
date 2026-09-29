const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

/** `test-input.json` nằm ở thư mục phân hệ, KHÔNG nằm trong `tests/`. */
const DOC_DIR = path.join(__dirname, '..');

/**
 * XÁC NHẬN THỰC NHẬN — nhóm ghi dữ liệu nặng nhất của phân hệ.
 *
 * 🔴 Tên file cố ý xếp CUỐI trong project `province` (`zz-`): xác nhận chuyến làm chuyến rời trạng thái
 * chờ, nên mọi case kiểm đếm (CNDB-CD-002→005) phải chạy XONG trước. Đổi tên file là đổi thứ tự chạy,
 * và nhóm kia sẽ skip im lặng vì "không còn chuyến chờ xác nhận".
 *
 * 🔴 🚫 KHÔNG hoàn tác được: một lần xác nhận sinh bút toán tất toán `Nợ 1112(1121) · Có 1132-LPB`,
 * đóng vòng đời mọi phiếu con, và ghi khoản lệch vào sổ nợ đơn vị vận chuyển.
 */

const VAI = 'province';
const HUB = '/debt-reconciliation/remittance';
const API_DS = '/province-tct/cash-inflow/lpb';
const LECH = 5000; // số tiền đếm thiếu ở đúng MỘT túi

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nhan = (s) => new RegExp(`${esc(s.normalize('NFC'))}|${esc(s.normalize('NFD'))}`);
const so = (v) => Number(v ?? 0);

test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
});

/** Sổ nợ đơn vị vận chuyển — trả cả danh sách lẫn tổng còn treo. */
async function soNoLpb(page) {
  const choDs = page.waitForResponse(async (r) => {
    if (!r.url().includes(`${API_DS}/shortage`) || r.url().includes('/total')) return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=lpb-shortage`, VAI);
  const body = await (await choDs).json();
  return body?.data?.content ?? body?.data ?? [];
}

test('CNDB-CD-007 - Túi thiếu sinh đúng một dòng nợ đơn vị vận chuyển', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-CD-007');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const noTruoc = await soNoLpb(page);

  const choDs = page.waitForResponse(async (r) => {
    if (!new URL(r.url()).pathname.endsWith(API_DS) || r.request().method() !== 'GET') return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=province-cash-inflow`, VAI);
  const dsBody = await (await choDs).json();
  const ds = dsBody?.data?.content ?? dsBody?.data ?? [];
  const chuyen = (Array.isArray(ds) ? ds : []).find((c) => c.status === 'PENDING');
  test.skip(!chuyen, 'Không có chuyến bàn giao nào ở trạng thái chờ xác nhận');

  const main = page.getByRole('main');
  const choTui = page.waitForResponse(async (r) => {
    if (!r.url().includes(`${API_DS}/${chuyen.id}/items`)) return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await main
    .locator(`tbody tr[data-row-key="${chuyen.id}"]`)
    .first()
    .getByRole('button', { name: nhan('Xác nhận thực nhận') })
    .click();
  const tui = (await (await choTui).json())?.data ?? [];
  test.skip(tui.length < 2, `Chuyến #${chuyen.id} cần ≥ 2 túi, đang có ${tui.length}`);

  const drawer = page.getByRole('dialog').filter({ hasText: nhan('Kiểm đếm và xác nhận thực nhận tiền mặt') });
  const dong = drawer.locator('tbody tr[data-row-key]');

  // Túi ĐẦU đếm thiếu 5.000đ, các túi còn lại khớp khai báo.
  let tongThucNhan = 0;
  for (let i = 0; i < tui.length; i += 1) {
    const khai = so(tui[i].declaredAmount);
    const dem = i === 0 ? khai - LECH : khai;
    tongThucNhan += dem;
    await dong.nth(i).getByRole('spinbutton').fill(String(dem));
  }
  await dong.nth(0).getByPlaceholder(nhan('Bắt buộc khi lệch'))
    .fill('Auto test CNDB-CD-007 - dem thieu tai quay');

  const choXacNhan = page.waitForResponse(
    (r) => r.url().includes(`${API_DS}/confirm`) && r.request().method() === 'POST',
  );
  await drawer.getByRole('button', { name: nhan('Xác nhận thực nhận') }).click();
  // modal.confirm cảnh báo hậu quả trước khi ghi sổ — đây là chốt chặn cuối cùng của người dùng.
  const xacNhan = page.getByRole('dialog').filter({ hasText: nhan('Xác nhận thực nhận tiền') });
  await expect(xacNhan).toContainText(nhan('sổ nợ đơn vị vận chuyển'));
  await xacNhan.getByRole('button', { name: nhan('Xác nhận') }).click();

  const ketQua = await (await choXacNhan).json();
  expect(
    String(ketQua?.status?.code),
    `Xác nhận thất bại: ${ketQua?.status?.message ?? ''}`,
  ).toBe('200');

  // 🔴 ĐÚNG MỘT dòng nợ mới, đúng bằng số lệch của đúng túi đó — 🚫 không phải "sổ nợ có dòng nào đó".
  //    Ghi cả chuyến thành một dòng gộp là mất dấu túi nào thiếu, và không tra soát được với đơn vị
  //    vận chuyển.
  const noSau = await soNoLpb(page);
  expect(noSau.length - noTruoc.length, 'phải sinh đúng 1 dòng nợ đơn vị vận chuyển').toBe(1);

  const idCu = new Set(noTruoc.map((x) => x.id));
  const dongMoi = noSau.find((x) => !idCu.has(x.id));
  expect(dongMoi, 'không tìm thấy dòng nợ mới').toBeTruthy();
  expect(so(dongMoi.totalAmount), 'số lệch phải là số ÂM đúng bằng phần đếm thiếu').toBe(-LECH);
  expect(dongMoi.batchId).toBe(chuyen.id);
  expect(dongMoi.status).toBe('OPEN');
  expect(String(dongMoi.note ?? '')).toContain('CNDB-CD-007');
});

test('CNDB-CD-006 - Xác nhận chuyến sinh bút toán và đóng phiếu con', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-CD-006');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const choDs = page.waitForResponse(async (r) => {
    if (!new URL(r.url()).pathname.endsWith(API_DS) || r.request().method() !== 'GET') return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=province-cash-inflow`, VAI);
  const dsBody = await (await choDs).json();
  const ds = dsBody?.data?.content ?? dsBody?.data ?? [];
  const daXacNhan = (Array.isArray(ds) ? ds : []).find((c) => c.status === 'CONFIRMED');
  test.skip(!daXacNhan, 'Chưa có chuyến nào đã xác nhận để soát bút toán');

  // 🔴 Bút toán là bằng chứng tiền đã tất toán khỏi 1132-LPB. Thiếu `entryCode` nghĩa là màn hình báo
  //    "đã nhận" trong khi sổ cái vẫn treo — 🔴 sai im lặng, đúng thứ tab này sinh ra để chặn.
  expect(String(daXacNhan.entryCode ?? ''), 'chuyến đã xác nhận phải có số bút toán').not.toBe('');
  expect(so(daXacNhan.receivedAmount)).toBeGreaterThan(0);
  expect(so(daXacNhan.varianceAmount)).toBe(
    so(daXacNhan.receivedAmount) - so(daXacNhan.declaredAmount),
  );
});

test('CNDB-LPB-003 - Lọc theo trạng thái khoản lệch', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-LPB-003');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  await soNoLpb(page);
  const main = page.getByRole('main');
  const choLoc = page.waitForResponse(
    (r) => r.url().includes(`${API_DS}/shortage?`)
      && new URL(r.url()).searchParams.get('status') === 'OPEN',
  );
  const oLoc = main.locator('.ant-select').filter({ hasText: nhan('Trạng thái') }).first();
  await oLoc.click();
  const dropdown = page.locator('.ant-select-dropdown:visible').last();
  await dropdown.getByText(nhan('Chưa thu hồi'), { exact: true }).click();

  const body = await (await choLoc).json();
  expect(String(body?.status?.code)).toBe('200');
  const ds = body?.data?.content ?? body?.data ?? [];
  test.skip(ds.length === 0, 'Tiền điều kiện: chưa có khoản lệch trạng thái Chưa thu hồi');
  expect(ds.every((d) => d.status === 'OPEN')).toBe(true);

  const dong = main.getByRole('table').first().locator('tbody tr[data-row-key]');
  await expect(dong).toHaveCount(ds.length);
});

test('CNDB-CD-008 - Điểm bán vẫn được trừ đủ số đã giao dù túi bị thiếu', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-CD-008');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const no = await soNoLpb(page);
  const khoanLech = no.find((x) => x.status === 'OPEN' && so(x.totalAmount) < 0);
  test.skip(!khoanLech, 'Chưa có khoản lệch âm nào để đối chiếu');
  const shopId = khoanLech.shopId;
  test.skip(!shopId, 'Khoản lệch không truy được về điểm bán (phiếu ở pod khác)');

  // Kỳ mới nhất của tỉnh — nơi số "Đã nộp" của điểm bán được cộng.
  const choKy = page.waitForResponse(async (r) => {
    if (!r.url().includes('/remittance/settlement-period') || r.request().method() !== 'GET') return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await moTrang(page, `${HUB}?tab=pos-settlement`, VAI);
  const kyBody = await (await choKy).json();
  const ky = kyBody?.data?.content ?? kyBody?.data ?? [];
  test.skip(ky.length === 0, 'Chưa có kỳ đối soát nào');

  // 🔴 Phải lấy kỳ CHỨA ngày ghi nhận khoản lệch, 🚫 không lấy kỳ mới nhất: kỳ tháng sau vừa mở còn
  //    trống trơn, và "Đã nộp = 0" ở đó là đúng — đọc nhầm sang nó sẽ báo lỗi sản phẩm không có thật.
  const moc = so(khoanLech.createdDate) || Date.now();
  const kyDung = ky.find((k) => so(k.fromDate) <= moc && moc < so(k.toDate)) ?? ky[0];

  // 🔴 Kỳ giữ số liệu CHỤP LÚC MỞ KỲ, 🚫 không tự cập nhật: phiếu nộp tiền và chuyến bàn giao phát
  //    sinh sau đó nên phải "Dựng lại số liệu" mới thấy. Bỏ bước này thì "Đã nộp" luôn bằng 0 và case
  //    tố cáo một lỗi không có thật.
  const choDung = page.waitForResponse(
    (r) => r.url().includes('/remittance/settlement-period') && r.request().method() === 'POST',
  );
  await page
    .getByRole('main')
    .locator(`tbody tr[data-row-key="${kyDung.id}"]`)
    .first()
    .getByRole('button', { name: nhan('Dựng lại số liệu') })
    .click();
  const hopThoai = page.getByRole('dialog').filter({ hasText: nhan('Dựng lại số liệu kỳ đối soát') });
  await hopThoai.getByRole('button', { name: nhan('Dựng lại') }).click();
  expect(String((await (await choDung).json())?.status?.code)).toBe('200');

  const choDong = page.waitForResponse(async (r) => {
    if (!r.url().includes(`/remittance/settlement-period/${kyDung.id}/shops`)) return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await page
    .getByRole('main')
    .locator(`tbody tr[data-row-key="${kyDung.id}"]`)
    .first()
    .getByRole('button', { name: nhan('Xem đối soát') })
    .click();
  const dongBody = await (await choDong).json();
  const dong = (dongBody?.data?.content ?? dongBody?.data ?? []).find((d) => d.shopId === shopId);
  test.skip(!dong, `Kỳ #${kyDung.id} không có dòng của điểm bán ${shopId}`);

  // 🔴 Khoản thiếu là nợ của ĐƠN VỊ VẬN CHUYỂN, 🚫 không phải nợ điểm bán: điểm bán hết trách nhiệm
  //    khi trao tiền và cầm biên lai. Trừ thiếu ở đây là bắt điểm bán gánh khoản mình không làm mất.
  expect(
    so(dong.provinceTotal),
    `Điểm bán ${shopId} bị trừ thiếu: "Đã nộp" ${dong.provinceTotal} nhỏ hơn số đã giao`,
  ).toBeGreaterThanOrEqual(Math.abs(so(khoanLech.totalAmount)));
});
