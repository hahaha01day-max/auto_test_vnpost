const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

/** `test-input.json` nằm ở thư mục phân hệ, KHÔNG nằm trong `tests/`. */
const DOC_DIR = path.join(__dirname, '..');

/**
 * Công nợ điểm bán ↔ Tỉnh — case GHI DỮ LIỆU của vai `province`.
 *
 * 🔴 THỨ TỰ TRONG FILE LÀ MỘT PHẦN CỦA PHÉP KIỂM, 🚫 không sắp xếp lại cho "gọn":
 *   CNDB-KY-003 (chặn mở kỳ vì CÒN điểm bán chưa khai)
 *     → CNDB-ND-006 (khai cho các điểm bán còn thiếu)
 *       → CNDB-ND-008 (duyệt và ký)
 *         → CNDB-ND-009 (khai lại cho điểm bán vừa ký ⇒ phải bị chặn).
 * Ký xong thì KY-003 không còn chặn được nữa — chạy nó sau ND-008 là kiểm một tiền đề đã biến mất.
 *
 * 🔴 File này chỉ chạy khi `VNPOST_ALLOW_FINANCIAL_MUTATION=true` và người chạy biết rõ đang trỏ môi
 * trường được phép ghi. Chữ ký nợ đầu kỳ 🚫 KHÔNG hoàn tác được — không có bước dọn dẹp nào gỡ lại được.
 */

const VAI = 'province';
const HUB = '/debt-reconciliation/remittance';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 🔴 Nhãn tiếng Việt trong DOM ở dạng NFD — regex khớp cả hai dạng tổ hợp. */
const nhan = (s) => new RegExp(`${esc(s.normalize('NFC'))}|${esc(s.normalize('NFD'))}`);

test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
});

/** Mở tab Nợ đầu kỳ, trả danh sách điểm bán còn thiếu do API `/missing` báo về. */
async function moTabNoDauKy(page) {
  const cho = page.waitForResponse(
    (r) => r.url().includes('/remittance/opening-debt/missing') && r.request().method() === 'GET',
  );
  await moTrang(page, `${HUB}?tab=opening-debt`, VAI);
  const body = await (await cho).json();
  expect(String(body?.status?.code)).toBe('200');
  return Array.isArray(body?.data) ? body.data : [];
}

test('CNDB-KY-003 - Chặn mở kỳ khi còn điểm bán chưa khai nợ đầu kỳ', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-KY-003');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const conThieu = await moTabNoDauKy(page);
  test.skip(
    conThieu.length === 0,
    'Tiền điều kiện: tỉnh đã khai đủ nợ đầu kỳ nên không còn gì để chặn',
  );

  await moTrang(page, `${HUB}?tab=pos-settlement`, VAI);
  const main = page.getByRole('main');
  await main.getByRole('button', { name: nhan('Mở kỳ đối soát') }).click();

  const modal = page.getByRole('dialog').filter({ hasText: nhan('Mở kỳ đối soát') });
  await modal.getByPlaceholder(nhan('Chọn tháng')).click();
  // Tháng trước — tháng đã đóng, tránh kỳ dở dang của tháng hiện tại.
  const thang = new Date();
  thang.setDate(1);
  thang.setMonth(thang.getMonth() - 1);
  // antd đặt `title` của ô tháng theo dạng YYYY-MM, 🚫 không phải nhãn MM/YYYY người dùng nhìn thấy.
  const oThang = `${thang.getFullYear()}-${String(thang.getMonth() + 1).padStart(2, '0')}`;
  const lich = page.locator('.ant-picker-dropdown:visible').last();
  await lich.locator(`[title="${oThang}"]`).first().click();

  const choMo = page.waitForResponse(
    (r) => r.url().includes('/remittance/settlement-period') && r.request().method() === 'POST',
  );
  await modal.getByRole('button', { name: nhan('Mở kỳ') }).click();
  const body = await (await choMo).json();

  // 🔴 Phải bị CHẶN kèm tên điểm bán còn thiếu. 🚫 Không nới thành "có hiện thông báo nào đó":
  //    mở kỳ khi chưa khai đủ là cả chuỗi số dư sai từ mắt xích đầu tiên.
  expect(String(body?.status?.code)).not.toBe('200');
  const thongBao = String(body?.status?.message ?? '');
  expect(thongBao).toMatch(nhan('chưa khai nợ đầu kỳ'));
  const tenMotDiemBan = conThieu[0]?.shopName;
  if (tenMotDiemBan) {
    expect(thongBao.normalize('NFC')).toContain(String(tenMotDiemBan).normalize('NFC'));
  }
});

test('CNDB-ND-006 - Tạo bản khai nợ đầu kỳ thành công', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-ND-006');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const conThieu = await moTabNoDauKy(page);
  test.skip(conThieu.length === 0, 'Tiền điều kiện: tỉnh không còn điểm bán nào chưa khai');

  const main = page.getByRole('main');
  await main.getByRole('button', { name: nhan('Khai ngay') }).click();
  const drawer = page.getByRole('dialog').filter({ hasText: nhan('Khai nợ đầu kỳ cho điểm bán') });
  const dong = drawer.locator('tbody tr[data-row-key]');
  await expect(dong).toHaveCount(conThieu.length);

  for (let i = 0; i < conThieu.length; i += 1) {
    await dong.nth(i).getByRole('spinbutton').fill(String(input.data.openingAmount));
    await dong.nth(i).getByRole('textbox').fill(String(input.data.note));
  }

  const choTao = page.waitForResponse(
    (r) => r.url().includes('/remittance/opening-debt/previews') && r.request().method() === 'POST',
  );
  await drawer.getByRole('button', { name: nhan('Tạo bản khai') }).click();
  const body = await (await choTao).json();
  expect(String(body?.status?.code)).toBe('200');
  // 🔴 Dòng lỗi phải bằng 0: bản khai còn dòng hỏng mà vẫn coi là "tạo thành công" thì lỗi chỉ lộ ra
  //    lúc ký, khi người ký tưởng mọi dòng đã sạch.
  expect(Number(body?.data?.errorRows ?? -1)).toBe(0);
  expect(Number(body?.data?.totalRows ?? 0)).toBe(conThieu.length);

  await expect(drawer).toBeHidden();
  const bangBanKhai = main.getByRole('table').first();
  await expect(
    bangBanKhai.locator('tbody tr[data-row-key]').filter({ hasText: nhan('Đang soạn') }).first(),
  ).toBeVisible();

  // 🔴 Tạo THÊM một bản khai thứ hai cho cùng nhóm điểm bán — tiền điều kiện của CNDB-ND-009, phải
  //    làm TẠI ĐÂY: sau khi ND-008 ký thì `/missing` rỗng, nút "Khai ngay" biến mất và 🚫 không còn
  //    đường nào qua giao diện để dựng ca "khai đè lên số đã ký".
  await main.getByRole('button', { name: nhan('Khai ngay') }).click();
  const drawer2 = page.getByRole('dialog').filter({ hasText: nhan('Khai nợ đầu kỳ cho điểm bán') });
  const dong2 = drawer2.locator('tbody tr[data-row-key]');
  const n2 = await dong2.count();
  for (let i = 0; i < n2; i += 1) {
    await dong2.nth(i).getByRole('spinbutton').fill('0');
    await dong2.nth(i).getByRole('textbox').fill('Auto test - ban khai du phong cho CNDB-ND-009');
  }
  const choTao2 = page.waitForResponse(
    (r) => r.url().includes('/remittance/opening-debt/previews') && r.request().method() === 'POST',
  );
  await drawer2.getByRole('button', { name: nhan('Tạo bản khai') }).click();
  expect(String((await (await choTao2).json())?.status?.code)).toBe('200');
});

test('CNDB-ND-008 - Duyệt và ký bản khai nợ đầu kỳ', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-ND-008');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  // 🔴 `/missing` rỗng = mọi điểm bán của tỉnh ĐÃ ký ⇒ bản khai nháp còn sót lại chỉ có thể là bản
  //    khai đè, và ký nó phải bị chặn (đó là việc của CNDB-ND-009). Chạy ND-008 lúc này là kiểm nhầm
  //    ca: nó sẽ đỏ vì backend chặn đúng. Dữ liệu ký 🚫 không hoàn tác được nên lần chạy thứ hai trên
  //    cùng môi trường phải SKIP KÈM LÝ DO, 🚫 không được tự nới kỳ vọng thành "ký thất bại cũng đạt".
  const conThieu = await moTabNoDauKy(page);
  test.skip(
    conThieu.length === 0,
    'Tiền điều kiện đã bị tiêu thụ: mọi điểm bán của tỉnh đã có nợ đầu kỳ ĐÃ KÝ từ lần chạy trước. '
      + 'Cần môi trường có điểm bán chưa ký (hoặc chạy script clear dữ liệu test) mới kiểm lại được.',
  );
  const main = page.getByRole('main');
  const dongDraft = main
    .getByRole('table')
    .first()
    .locator('tbody tr[data-row-key]')
    .filter({ hasText: nhan('Đang soạn') })
    .first();
  test.skip((await dongDraft.count()) === 0, 'Tiền điều kiện: không có bản khai nào Đang soạn');

  await dongDraft.getByRole('button', { name: nhan('Duyệt và ký') }).click();

  // Hộp thoại phải nói rõ hậu quả TRƯỚC khi ký — đây là cảnh báo duy nhất người dùng nhận được.
  const hopThoai = page.getByRole('dialog').filter({ hasText: nhan('Duyệt và ký bản khai') });
  await expect(hopThoai).toContainText(nhan('KHÔNG sửa được nữa'));

  const choKy = page.waitForResponse(
    (r) => r.url().includes('/approve') && r.request().method() === 'POST',
  );
  await hopThoai.getByRole('button', { name: nhan('Duyệt và ký') }).click();
  const body = await (await choKy).json();
  expect(String(body?.status?.code)).toBe('200');

  // Bảng dưới (nợ đầu kỳ đã ký) phải xuất hiện dòng "Đã ký".
  const bangDaKy = main.getByRole('table').nth(1);
  await expect(
    bangDaKy.locator('tbody tr[data-row-key]').filter({ hasText: nhan('Đã ký') }).first(),
  ).toBeVisible();
});

test('CNDB-ND-009 - Chặn khai đè lên số đã ký của cùng điểm bán', async ({ page }) => {
  const input = loadCaseInput(DOC_DIR, 'CNDB-ND-009');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  // Bản khai dự phòng do CNDB-ND-006 tạo sẵn (cùng điểm bán, chưa ký) — giờ điểm bán đó ĐÃ có số ký
  // từ CNDB-ND-008, nên ký tiếp bản này chính là ca "khai đè lên số đã ký".
  await moTabNoDauKy(page);
  const main = page.getByRole('main');
  const conDraft = main
    .getByRole('table')
    .first()
    .locator('tbody tr[data-row-key]')
    .filter({ hasText: nhan('Đang soạn') })
    .first();
  test.skip(
    (await conDraft.count()) === 0,
    'Tiền điều kiện: không còn bản khai Đang soạn nào của điểm bán đã ký',
  );

  await conDraft.getByRole('button', { name: nhan('Duyệt và ký') }).click();
  const hopThoai = page.getByRole('dialog').filter({ hasText: nhan('Duyệt và ký bản khai') });
  const choKy = page.waitForResponse(
    (r) => r.url().includes('/approve') && r.request().method() === 'POST',
  );
  await hopThoai.getByRole('button', { name: nhan('Duyệt và ký') }).click();
  const ketQua = await (await choKy).json();

  // 🔴 Phải chặn. Ghi đè số đã ký là xoá dấu vết của con số người ta đã chịu trách nhiệm.
  expect(String(ketQua?.status?.code)).not.toBe('200');
  const thongBao = String(ketQua?.status?.message ?? '').normalize('NFC');
  expect(thongBao).toMatch(nhan('đã có nợ đầu kỳ'));
  expect(thongBao).toMatch(nhan('không ghi đè'));
});
