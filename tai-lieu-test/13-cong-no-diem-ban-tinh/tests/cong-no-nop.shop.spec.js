const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

/** `test-input.json` nằm ở thư mục phân hệ, KHÔNG nằm trong `tests/`. */
const DOC_DIR = path.join(__dirname, '..');

/**
 * DỰNG DỮ LIỆU cho nhóm "Bưu điện Tỉnh nhận tiền" (CNDB-CD-*) và sổ nợ đơn vị vận chuyển (CNDB-LPB-*).
 *
 * 🔴 Đây 🚫 KHÔNG phải case nghiệm thu — nó không kiểm nghiệp vụ nào của phân hệ 13, mà tạo tiền đề:
 * các case kiểm đếm cần một chuyến bàn giao có **ít nhất 2 túi**, mà túi chỉ sinh ra từ phiếu nộp tiền
 * đã bàn giao của điểm bán. Không có bước này thì toàn bộ nhóm CD chỉ skip, và báo cáo im lặng bỏ qua
 * đúng phần nghiệp vụ rủi ro nhất (bút toán, khoản lệch).
 *
 * 🔴 Lập phiếu HAI LẦN, mỗi lần một khoản: `createDraftByPeriod` gom các khoản cùng kỳ vào MỘT phiếu,
 * nên chọn cả hai khoản một lượt sẽ chỉ ra một túi — và CNDB-CD-002 đòi từ hai túi trở lên.
 *
 * 🔴 Ghi dữ liệu thật: quỹ bị trừ và bút toán được ghi ngay khi xác nhận bàn giao. Chỉ chạy khi
 * `VNPOST_ALLOW_FINANCIAL_MUTATION=true` trên môi trường được phép ghi.
 */

const VAI = 'shop';
const HUB = '/debt-reconciliation/remittance';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nhan = (s) => new RegExp(`${esc(s.normalize('NFC'))}|${esc(s.normalize('NFD'))}`);

test.describe.configure({ mode: 'serial' });

test.beforeEach(() => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
});

test('DỰNG DỮ LIỆU - Lập 2 phiếu nộp tiền rồi bàn giao cho đơn vị vận chuyển', async ({ page }) => {
  // Mượn công tắc an toàn của CNDB-CD-006 (case ghi dữ liệu nặng nhất của nhóm): bước dựng này ghi
  // đúng loại dữ liệu đó, nên 🚫 không được chạy khi case kia còn bị chặn.
  const input = loadCaseInput(DOC_DIR, 'CNDB-CD-006');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const main = page.getByRole('main');

  // 🔴 Đếm phiếu nháp từ DỮ LIỆU API, 🚫 không đếm dòng trên bảng: đếm ngay sau khi điều hướng thì
  //    bảng chưa render xong và `count()` trả 0 — case sẽ "skip vì không có phiếu" trong khi phiếu có
  //    thật. Đây là loại skip nguy hiểm nhất: nó im lặng bỏ qua cả nhóm case phía sau.
  //    Đăng ký chờ TRƯỚC khi mở lại màn, vì `waitForResponse` chỉ bắt được lần gọi kế tiếp.
  const soPhieuDraft = async () => {
    const cho = page.waitForResponse(
      async (r) => {
        if (!/\/remittance\/cash-remittance\?/.test(r.url())) return false;
        const b = await r.json().catch(() => null);
        return String(b?.status?.code) === '200';
      },
      { timeout: 20_000 },
    );
    await moTrang(page, `${HUB}?tab=cash-remittance`, VAI);
    const body = await (await cho).json();
    const ds = body?.data?.content ?? body?.data ?? [];
    return ds.filter((p) => p.status === 'DRAFT').length;
  };

  // Còn phiếu nháp từ lần chạy trước thì dùng lại, 🚫 không lập thêm cho đầy bảng.
  let daCoDraft = await soPhieuDraft();

  const choNguon = page.waitForResponse(async (r) => {
    if (!r.url().includes('/remittance/cash-remittance/pending-sources')) return false;
    const b = await r.json().catch(() => null);
    return String(b?.status?.code) === '200';
  });
  await main.getByRole('button', { name: nhan('Lập phiếu nộp tiền') }).click();
  const khoanTreo = (await (await choNguon).json())?.data ?? [];
  test.skip(
    khoanTreo.length === 0 && daCoDraft < 2,
    'Tiền điều kiện: két không còn khoản nào để nộp (điểm bán chưa bán hàng tiền mặt)',
  );

  const drawer = page.getByRole('dialog').filter({ hasText: nhan('Lập phiếu nộp tiền') });
  const dong = drawer.locator('tbody tr[data-row-key]');

  // Mỗi vòng: bỏ chọn tất cả rồi tích ĐÚNG MỘT khoản ⇒ mỗi lần lập ra một phiếu riêng = một túi.
  for (let lan = 0; lan < 2 && daCoDraft + lan < 2; lan += 1) {
    const con = await dong.count();
    if (con === 0) break;
    const tickAll = drawer.locator('thead input[type="checkbox"]');
    if (await tickAll.isChecked()) await tickAll.click();
    await dong.nth(0).locator('input[type="checkbox"]').check();

    const choLap = page.waitForResponse(
      (r) => r.url().includes('/cash-remittance/draft-by-period') && r.request().method() === 'POST',
    );
    await drawer.getByRole('button', { name: nhan('Lập phiếu') }).click();
    expect(String((await (await choLap).json())?.status?.code)).toBe('200');

    if (lan === 0) {
      await expect(drawer).toBeHidden();
      await main.getByRole('button', { name: nhan('Lập phiếu nộp tiền') }).click();
      await expect(drawer).toBeVisible();
    }
  }
  // 🚫 Không bấm "Huỷ" ở đây: lập phiếu xong drawer tự đóng, và `isVisible()` vẫn trả true trong lúc
  // nó đang chạy hiệu ứng đóng ⇒ click rơi vào phần tử "không ổn định" rồi hết giờ chờ. Chỉ chờ nó ẩn;
  // còn mở thật (vì vòng lặp dừng sớm) thì đóng bằng phím Esc.
  if (!(await drawer.isHidden())) {
    await page.keyboard.press('Escape');
  }
  await expect(drawer).toBeHidden();

  daCoDraft = await soPhieuDraft();
  test.skip(daCoDraft === 0, 'Không lập được phiếu nháp nào để bàn giao');

  // Bàn giao: gom mọi phiếu nháp trong MỘT lượt, mỗi phiếu một số niêm phong riêng (một túi tiền).
  // 🔴 Nhận ra phiếu nháp bằng CHÍNH NÚT "Bàn giao" (chỉ phiếu nháp mới có), 🚫 không lọc theo nhãn
  //    trạng thái: nhãn hiển thị khác hằng số trạng thái trong dữ liệu, lọc theo nó là trượt im lặng.
  const nutBanGiao = main.getByRole('button', { name: nhan('Bàn giao') }).first();
  await expect(nutBanGiao).toBeVisible();
  await nutBanGiao.click();
  const dGiao = page.getByRole('dialog').filter({ hasText: nhan('Bàn giao tiền cho đơn vị vận chuyển') });
  await expect(dGiao).toBeVisible();

  const moc = Date.now().toString().slice(-6);
  await dGiao.getByLabel(nhan('Số biên lai giao nhận')).fill(`AUTOTEST-${moc}`);
  const oNiemPhong = dGiao.getByPlaceholder(nhan('Số niêm phong'));
  const soO = await oNiemPhong.count();
  for (let i = 0; i < soO; i += 1) {
    await oNiemPhong.nth(i).fill(`SEAL-${moc}-${i + 1}`);
  }

  const choGiao = page.waitForResponse(
    (r) => r.url().includes('/cash-remittance/hand-over') && r.request().method() === 'POST',
  );
  await dGiao.getByRole('button', { name: nhan('Xác nhận bàn giao') }).click();
  const ketQua = await (await choGiao).json();
  expect(
    String(ketQua?.status?.code),
    `Bàn giao thất bại: ${ketQua?.status?.message ?? ''}`,
  ).toBe('200');

  // Phiếu phải rời trạng thái nháp — đây là thứ làm chúng hiện ra ở màn nhận tiền của Tỉnh.
  const conNhap = await soPhieuDraft();
  expect(conNhap, 'sau khi bàn giao thì 🚫 không còn phiếu nào ở trạng thái nháp').toBe(0);
});
