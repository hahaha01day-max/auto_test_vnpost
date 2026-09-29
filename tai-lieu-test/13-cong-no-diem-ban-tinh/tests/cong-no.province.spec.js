const path = require('node:path');
const { test, expect } = require('@playwright/test');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

/** `test-input.json` nằm ở thư mục phân hệ, KHÔNG nằm trong `tests/`. */
const DOC_DIR = path.join(__dirname, '..');

/**
 * Công nợ điểm bán ↔ Bưu điện Tỉnh — các case CHỈ ĐỌC của vai `province`.
 *
 * Nguồn case: `tai-lieu-test/13-cong-no-diem-ban-tinh/test-cases.csv`.
 * Trace route/API/nhãn: `test-cases.md` (đã đối chiếu code ngày 15/09).
 *
 * 🔴 File này 🚫 KHÔNG chứa case ghi dữ liệu. Case lập phiếu / xác nhận chuyến / ký biên bản nằm
 * ở file riêng và mặc định bị chặn bởi `allowMutation: false`.
 */

const VAI = 'province';
const HUB = '/debt-reconciliation/remittance';

/** 🔴 Nhãn tiếng Việt trong DOM ở dạng NFD — so trực tiếp sẽ trượt dù mắt nhìn giống hệt. */
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** Bỏ qua cả file khi chưa khai tài khoản vai này — 🚫 skip KÈM LÝ DO, không bao giờ tự pass. */
test.beforeEach(() => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
});

/** Mở một tab của hub và bắt đúng response của tab đó. 🔴 Đăng ký chờ TRƯỚC khi điều hướng. */
async function moTab(page, tab, apiPath) {
  const cho = page.waitForResponse(
    (r) => r.url().includes(apiPath) && r.request().method() === 'GET',
  );
  await moTrang(page, `${HUB}?tab=${tab}`, VAI);
  return cho;
}

test.describe('Nợ đầu kỳ điểm bán', () => {
  test('CNDB-ND-001 - Màn Nợ đầu kỳ mở được và gọi đúng API', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-ND-001');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const res = await moTab(page, 'opening-debt', '/remittance/opening-debt');
    const body = await res.json();
    // status.code là CHUỖI — 🚫 không so === 200
    expect(String(body?.status?.code)).toBe('200');

    const main = page.getByRole('main');
    await expect(main.getByText(/Bản khai đang soạn \/ đã duyệt/)).toBeVisible();
    await expect(main.getByText(/Nợ đầu kỳ đã ký/)).toBeVisible();
  });

  test('CNDB-ND-002 - Cảnh báo nêu đúng số điểm bán chưa khai nợ đầu kỳ', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-ND-002');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const cho = page.waitForResponse(
      (r) => r.url().includes('/remittance/opening-debt/missing') && r.request().method() === 'GET',
    );
    await moTrang(page, `${HUB}?tab=opening-debt`, VAI);
    const res = await cho;
    const body = await res.json();
    expect(String(body?.status?.code)).toBe('200');

    const conThieu = Array.isArray(body?.data) ? body.data.length : 0;
    const main = page.getByRole('main');

    if (conThieu > 0) {
      // 🔴 Con số trên cảnh báo phải khớp ĐÚNG số dòng API trả về — đây là thứ đo được,
      //    🚫 không hạ xuống thành "có hiện cảnh báo".
      const canhBao = main.getByText(new RegExp(`Còn ${conThieu} điểm bán chưa khai nợ đầu kỳ`));
      await expect(canhBao).toBeVisible();
      await expect(main.getByRole('button', { name: chuan('Khai ngay') })).toBeVisible();
    } else {
      await expect(
        main.getByText(/Mọi điểm bán của tỉnh đã có nợ đầu kỳ đã ký/),
      ).toBeVisible();
    }
  });
});

test.describe('Kỳ đối soát công nợ bán hàng', () => {
  test('CNDB-KY-001 - Bảng kỳ có đủ cột số dư mang sang', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-KY-001');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const res = await moTab(page, 'pos-settlement', '/remittance/settlement-period');
    const body = await res.json();
    expect(String(body?.status?.code)).toBe('200');

    // 🔴 Hai cột "Nợ đầu kỳ"/"Nợ cuối kỳ" là phần thêm ngày 15/09. Thiếu chúng nghĩa là bản
    //    đang test chưa có sổ công nợ có số dư mang sang — assertion này phải ĐỎ, 🚫 không nới.
    const bang = page.getByRole('main').getByRole('table').first();
    for (const cot of ['Điểm bán thu', 'Chênh lệch', 'Nợ đầu kỳ', 'Nợ cuối kỳ']) {
      await expect(bang.getByRole('columnheader', { name: chuan(cot) })).toBeVisible();
    }
  });
});

test.describe('Nợ đơn vị vận chuyển', () => {
  test('CNDB-LPB-001 - Sổ nợ đơn vị vận chuyển mở được và gọi đúng API', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-LPB-001');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const res = await moTab(page, 'lpb-shortage', '/province-tct/cash-inflow/lpb/shortage');
    const body = await res.json();
    expect(String(body?.status?.code)).toBe('200');

    const main = page.getByRole('main');
    // Tổng còn treo cộng TRỊ TUYỆT ĐỐI — khoản âm và dương 🚫 không được triệt tiêu nhau.
    await expect(main.getByText(/Tổng còn treo:/)).toBeVisible();

    const bang = main.getByRole('table').first();
    for (const cot of ['Chuyến', 'Số lệch', 'Đã thu hồi', 'Trạng thái']) {
      await expect(bang.getByRole('columnheader', { name: chuan(cot) })).toBeVisible();
    }
  });

  // CNDB-LPB-003 chuyển sang `cong-no.zz-xac-nhan.province.spec.js`: nó chỉ có dữ liệu để kiểm SAU
  // khi CNDB-CD-007 sinh ra khoản lệch, mà case đó lại chạy cuối. Giữ hai bản ở hai file là hai kết
  // quả khác nhau cho cùng một mã case trong một lần chạy.
});

/** Regex khớp cả NFC lẫn NFD — dùng cho getByText/getByRole name khi DOM ở dạng tổ hợp. */
function nhan(s) {
  const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`${esc(s.normalize('NFC'))}|${esc(s.normalize('NFD'))}`);
}

/** Ghi lại mọi request ghi tới `apiPath` — case validate phía client phải KHÔNG gửi request nào. */
function batRequestGhi(page, apiPath) {
  const ds = [];
  page.on('request', (r) => {
    if (r.url().includes(apiPath) && r.method() === 'POST') ds.push(r.url());
  });
  return ds;
}

test.describe('Khai nợ đầu kỳ — form', () => {
  /** Mở drawer khai; skip khi tỉnh đã khai đủ (không còn điểm bán thiếu thì không có nút). */
  async function moDrawerKhai(page) {
    const cho = page.waitForResponse(
      (r) => r.url().includes('/remittance/opening-debt/missing') && r.request().method() === 'GET',
    );
    await moTrang(page, `${HUB}?tab=opening-debt`, VAI);
    const body = await (await cho).json();
    expect(String(body?.status?.code)).toBe('200');
    const missing = Array.isArray(body?.data) ? body.data : [];
    test.skip(missing.length === 0, 'Tiền điều kiện: tỉnh không còn điểm bán nào chưa khai nợ đầu kỳ');

    await page.getByRole('main').getByRole('button', { name: nhan('Khai ngay') }).click();
    const drawer = page.getByRole('dialog').filter({ hasText: nhan('Khai nợ đầu kỳ cho điểm bán') });
    await expect(drawer).toBeVisible();
    return { drawer, missing, dong: drawer.locator('tbody tr[data-row-key]') };
  }

  test('CNDB-ND-003 - Form khai mở sẵn đúng các điểm bán còn thiếu', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-ND-003');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const { missing, dong } = await moDrawerKhai(page);
    await expect(dong).toHaveCount(missing.length);
    for (let i = 0; i < missing.length; i += 1) {
      await expect(dong.nth(i).getByRole('spinbutton')).toHaveCount(1);
      await expect(dong.nth(i).getByRole('textbox')).toHaveCount(1);
    }
  });

  test('CNDB-ND-004 - Chặn tạo bản khai khi bỏ trống số tiền', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-ND-004');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const post = batRequestGhi(page, '/remittance/opening-debt/previews');
    const { drawer, dong } = await moDrawerKhai(page);
    const n = await dong.count();
    for (let i = 0; i < n; i += 1) {
      if (i > 0) await dong.nth(i).getByRole('spinbutton').fill('0');
      await dong.nth(i).getByRole('textbox').fill('Auto test - căn cứ kiểm tra chặn');
    }
    await drawer.getByRole('button', { name: nhan('Tạo bản khai') }).click();

    // 🔴 Kiểm ĐÚNG con số 1 — bỏ trống KHÁC khai 0.
    await expect(page.getByText(nhan('Còn 1 điểm bán chưa nhập số'))).toBeVisible();
    await expect(drawer).toBeVisible();
    expect(post, 'không được gọi POST tạo bản khai').toEqual([]);
  });

  test('CNDB-ND-005 - Chặn tạo bản khai khi bỏ trống căn cứ', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-ND-005');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const post = batRequestGhi(page, '/remittance/opening-debt/previews');
    const { drawer, dong } = await moDrawerKhai(page);
    const n = await dong.count();
    for (let i = 0; i < n; i += 1) {
      await dong.nth(i).getByRole('spinbutton').fill('0');
      if (i > 0) await dong.nth(i).getByRole('textbox').fill('Auto test - căn cứ kiểm tra chặn');
    }
    await drawer.getByRole('button', { name: nhan('Tạo bản khai') }).click();

    await expect(page.getByText(nhan('Còn 1 điểm bán chưa ghi căn cứ'))).toBeVisible();
    await expect(drawer).toBeVisible();
    expect(post, 'không được gọi POST tạo bản khai').toEqual([]);
  });

  /**
   * Kỳ vọng user chốt 28/09/2026 (A14): căn cứ toàn dấu cách bị CHẶN như bỏ trống. Trace vnpost-web f9c5c858
   * `features/remittance/pages/OpeningDebtPage.jsx › handleCreate`: `!r.note?.trim()` ⇒ "Còn N điểm bán chưa ghi căn cứ". Không ghi.
   */
  test('CNDB-KY-010 — Ô ghi chú / căn cứ nhập toàn khoảng trắng', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-KY-010');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const post = batRequestGhi(page, '/remittance/opening-debt/previews');
    const { drawer, dong } = await moDrawerKhai(page);
    const n = await dong.count();
    for (let i = 0; i < n; i += 1) {
      await dong.nth(i).getByRole('spinbutton').fill('0');
      await dong.nth(i).getByRole('textbox').fill('          ');
    }
    await drawer.getByRole('button', { name: nhan('Tạo bản khai') }).click();
    await expect(page.getByText(nhan(`Còn ${n} điểm bán chưa ghi căn cứ`))).toBeVisible();
    await expect(drawer).toBeVisible();
    expect(post, '🔴 Căn cứ toàn dấu cách vẫn gọi POST tạo bản khai').toEqual([]);
  });

  /**
   * Kỳ vọng user chốt 28/09/2026 (A15): nợ đầu kỳ = 0 TÍNH LÀ ĐÃ KHAI (tạo được bản khai, không bị coi là bỏ trống); CHO PHÉP số âm
   * (điểm bán ứng trước). Số thập phân / số rất lớn: kịch bản chỉ đòi ghi hành vi ⇒ chỉ ghi số đo, không assert.
   * Trace `OpeningDebtPage.jsx`: ô số `InputNumber min={0}` (không nhận âm). Vế "= 0 tạo được" GHI một bản khai Đang soạn ⇒ HUỶ ngay
   * bằng API nút huỷ (`POST /remittance/opening-debt/previews/{id}/cancel`), 🚫 không duyệt/ký.
   */
  test('CNDB-ND-010 — Bản khai nợ đầu kỳ: biên số tiền 0, số âm, số rất lớn', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-ND-010');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');
    const st = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho').batHeader(page);
    const goiGhi = require('../../04_3_nhap_xuat_chuyen_kho/tests/ghi-kho').goiGhi;

    const { drawer, dong } = await moDrawerKhai(page);
    const o = dong.nth(0).getByRole('spinbutton');
    const doc = async (v) => { await o.fill(''); await o.pressSequentially(v, { delay: 30 }); await o.blur(); await page.waitForTimeout(300); return o.inputValue(); };
    const kq = { am: await doc('-5000'), thapPhan: await doc('1500.5'), rat_lon: await doc('1000000000000000') };
    // Vế "= 0 là đã khai": mọi dòng 0 + căn cứ hợp lệ ⇒ tạo được bản khai, không có dòng lỗi.
    const n = await dong.count();
    for (let i = 0; i < n; i += 1) {
      await dong.nth(i).getByRole('spinbutton').fill('0');
      await dong.nth(i).getByRole('textbox').fill('Auto test CNDB-ND-010 - khai 0 (huỷ ngay)');
    }
    const cho = page.waitForResponse((r) => r.url().includes('/remittance/opening-debt/previews') && r.request().method() === 'POST', { timeout: 30_000 });
    await drawer.getByRole('button', { name: nhan('Tạo bản khai') }).click();
    const res = await cho;
    const b = await res.json().catch(() => null);
    const id = b?.data?.id ?? b?.data?.previewId;
    let huy = null;
    if (id) huy = await goiGhi(page, st, 'POST', `/remittance/opening-debt/previews/${id}/cancel`, {});
    test.info().annotations.push({ type: 'đo', description: `ô số: -5000 ⇒ "${kq.am}" · 1500.5 ⇒ "${kq.thapPhan}" · 1e15 ⇒ "${kq.rat_lon}" · tạo bản khai 0: ${JSON.stringify(b?.status)} totalRows ${b?.data?.totalRows} errorRows ${b?.data?.errorRows} (#${id}) · huỷ ${JSON.stringify(huy?.status)}` });
    // Lý do lỗi từng dòng (SELECT pod) — đo 28/09: dòng khai tay LUÔN lỗi "Thiếu ngày chốt số…" vì FE MANUAL không gửi asOfDate,
    // 🚫 không phải vì số 0 ⇒ tách: vế A15 chỉ đòi lỗi KHÔNG do số tiền; lỗi thiếu ngày chốt ghi riêng (soft).
    const { chon } = require('../../shared/db/otp');
    let loiDong = '';
    for (const db of ['VNPOST_POD_01', 'VNPOST_POD_02', 'VNPOST_POD_03']) {
      try { loiDong = chon(`select group_concat(concat(status,':',coalesce(error_message,''))) from SHOP_OPENING_DEBT_PREVIEW_ITEM where preview_id=${Number(id)} and note like 'Auto test CNDB-ND-010%'`, db); } catch { /* pod khác */ }
      if (loiDong && loiDong !== 'NULL') break;
    }
    test.info().annotations.push({ type: 'lỗi dòng', description: loiDong });
    expect(String(b?.status?.code), `Khai 0 không tạo được bản khai: ${JSON.stringify(b?.status)}`).toBe('200');
    expect(loiDong, '🔴 Dòng khai 0 bị lỗi VÌ SỐ TIỀN (0 phải tính là đã khai)').not.toMatch(/số tiền|amount|bằng 0|lớn hơn 0|> ?0/i);
    expect.soft(Number(b?.data?.errorRows ?? -1), `🔴 Bản khai tay có dòng lỗi: ${loiDong} — FE MANUAL không gửi ngày chốt số (asOfDate)`).toBe(0);
    expect(String(huy?.status?.code), `Huỷ bản khai thử #${id} lỗi — phải huỷ tay`).toBe('200');
    expect(kq.am, '🔴 Ô nợ đầu kỳ không nhận số âm (min=0) — trái A15: phải cho điểm bán ứng trước').toMatch(/^-/);
  });
});

test.describe('Kỳ đối soát — mở kỳ', () => {
  /**
   * Kỳ vọng user chốt 28/09/2026 (B9): modal "Mở kỳ đối soát" chỉ cho chọn THÁNG ⇒ không tạo được kỳ không tròn tháng qua giao diện
   * (đúng mong đợi). Trace vnpost-web f9c5c858 `features/remittance/pages/PosSettlementPage.jsx`: Form.Item "Tháng của kỳ",
   * DatePicker `picker="month"` placeholder "Chọn tháng". Chỉ mở modal + bảng chọn, 🚫 lưu; chặn mạng POST tạo kỳ phòng bấm nhầm.
   */
  test('CNDB-KY-002 - Chặn mở kỳ khi kỳ không tròn tháng', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-KY-002');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');
    const post = [];
    await page.route('**/remittance/settlement-period**', (r) => {
      if (r.request().method() === 'GET') return r.continue();
      post.push(r.request().method());
      return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) });
    });
    await moTrang(page, `${HUB}?tab=pos-settlement`, VAI);
    const nut = page.getByRole('button', { name: nhan('Mở kỳ đối soát') }).first();
    await expect(nut, 'Không có nút "Mở kỳ đối soát" (thiếu quyền hoặc đang có kỳ mở)').toBeVisible({ timeout: 30_000 });
    await nut.click();
    const md = page.getByRole('dialog').filter({ hasText: nhan('Mở kỳ đối soát') }).last();
    await expect(md).toBeVisible();
    const o = md.getByPlaceholder(nhan('Chọn tháng'));
    await expect(o, 'Modal không có ô "Chọn tháng"').toBeVisible();
    const soONgay = await md.getByPlaceholder(/Chọn ngày|Ngày bắt đầu|Ngày kết thúc|Từ ngày|Đến ngày|Start date|End date/i).count();
    const soRange = await md.locator('.ant-picker-range').count();
    await o.click();
    const bang = page.locator('.ant-picker-dropdown:visible').last();
    await expect(bang).toBeVisible();
    const laThang = await bang.locator('.ant-picker-month-panel').count();
    const coNgay = await bang.locator('.ant-picker-date-panel').count();
    test.info().annotations.push({ type: 'đo', description: `nhãn "${(await md.locator('.ant-form-item-label').allInnerTexts()).join(' · ')}" · ô ngày ${soONgay} · ô khoảng ${soRange} · bảng tháng ${laThang} · bảng ngày ${coNgay} · request ghi ${JSON.stringify(post)}` });
    await page.keyboard.press('Escape');
    await md.getByRole('button', { name: nhan('Huỷ') }).or(md.getByRole('button', { name: nhan('Hủy') })).first().click().catch(() => null);
    expect(laThang, 'Ô chọn kỳ không phải bộ chọn THÁNG').toBeGreaterThan(0);
    expect(coNgay + soONgay + soRange, '🔴 Modal cho chọn ngày / khoảng ngày ⇒ tạo được kỳ không tròn tháng').toBe(0);
    expect(post, 'Không được gửi request tạo kỳ').toEqual([]);
  });
});

test.describe('Bưu điện Tỉnh nhận tiền — kiểm đếm', () => {
  const API_DS = '/province-tct/cash-inflow/lpb';

  test('CNDB-CD-001 - Màn Bưu điện Tỉnh nhận tiền mở được và gọi đúng API', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-CD-001');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const cho = page.waitForResponse((r) => {
      const u = new URL(r.url());
      return u.pathname.endsWith(API_DS) && r.request().method() === 'GET';
    });
    await moTrang(page, `${HUB}?tab=province-cash-inflow`, VAI);
    const body = await (await cho).json();
    expect(String(body?.status?.code)).toBe('200');

    // Nhãn cột lấy nguyên văn từ ProvinceCashInflowPage.jsx (kịch bản viết tắt "Khai báo/Thực nhận/Lệch").
    const bang = page.getByRole('main').getByRole('table').first();
    for (const cot of ['Kỳ', 'Số tiền khai báo', 'Số tiền thực nhận', 'Chênh lệch', 'Nơi nhận tiền']) {
      await expect(bang.getByRole('columnheader', { name: nhan(cot) }).first()).toBeVisible();
    }
  });

  /**
   * Mở drawer kiểm đếm; trả drawer + danh sách túi từ API.
   *
   * `batchId` bỏ trống ⇒ tự lấy chuyến PENDING đầu tiên trong danh sách. 🔴 Không bắt điền tay nữa:
   * id chuyến đổi sau mỗi lần dựng lại dữ liệu, và một `batchId` cũ trong `test-input.json` sẽ làm cả
   * nhóm case skip im lặng — trông hệt như "chưa ai viết case".
   */
  async function moKiemDem(page, batchId) {
    const choDs = page.waitForResponse(async (r) => {
      if (!new URL(r.url()).pathname.endsWith(API_DS) || r.request().method() !== 'GET') return false;
      const b = await r.json().catch(() => null);
      return String(b?.status?.code) === '200';
    });
    await moTrang(page, `${HUB}?tab=province-cash-inflow`, VAI);
    const ds = (await (await choDs).json())?.data?.content ?? (await (await choDs).json())?.data ?? [];

    if (!batchId) {
      const cho = (Array.isArray(ds) ? ds : []).find((c) => c.status === 'PENDING');
      test.skip(!cho, 'Không có chuyến bàn giao nào ở trạng thái chờ xác nhận');
      batchId = cho.id;
    }

    const dongChuyen = page
      .getByRole('main')
      .locator('tbody tr[data-row-key]')
      .filter({ hasText: `CHUYEN-${batchId}` });
    test.skip((await dongChuyen.count()) === 0, `Chuyến ${batchId} không có trong danh sách (sai batchId hoặc ngoài khoảng ngày lọc)`);

    const choTui = page.waitForResponse(
      (r) => r.url().includes(`${API_DS}/${batchId}/items`) && r.request().method() === 'GET',
    );
    const nut = dongChuyen.getByRole('button', { name: nhan('Xác nhận thực nhận') });
    test.skip((await nut.count()) === 0, `Chuyến ${batchId} không còn trạng thái PENDING`);
    await nut.click();
    const tui = (await (await choTui).json())?.data ?? [];
    test.skip(tui.length < 2, `Tiền điều kiện: chuyến ${batchId} cần ≥ 2 túi, đang có ${tui.length}`);

    const drawer = page.getByRole('dialog').filter({ hasText: nhan('Kiểm đếm và xác nhận thực nhận tiền mặt') });
    await expect(drawer).toBeVisible();
    const dong = drawer.locator('tbody tr[data-row-key]');
    await expect(dong).toHaveCount(tui.length);
    return { drawer, tui, dong };
  }

  test('CNDB-CD-002 - Drawer kiểm đếm là bảng từng túi, không có ô nhập tổng', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-CD-002');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const { drawer, tui, dong } = await moKiemDem(page, input.data.batchId);
    // Mỗi túi đúng một ô nhập Thực nhận; toàn drawer chỉ có đúng số ô bằng số túi ⇒ không có ô tổng.
    for (let i = 0; i < tui.length; i += 1) {
      await expect(dong.nth(i).getByRole('spinbutton')).toHaveCount(1);
    }
    await expect(drawer.getByRole('spinbutton')).toHaveCount(tui.length);
    await expect(drawer.getByText(nhan('Tổng thực nhận (hệ thống cộng)'))).toBeVisible();
  });

  test('CNDB-CD-003 - Tổng thực nhận tự cộng từ các dòng', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-CD-003');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const { drawer, dong } = await moKiemDem(page, input.data.batchId);
    const oTong = drawer
      .locator('.ant-descriptions-row')
      .filter({ hasText: nhan('Tổng thực nhận (hệ thống cộng)') })
      .locator('.font-bold');
    const so = (s) => Number(String(s).replace(/\D/g, ''));

    await dong.nth(0).getByRole('spinbutton').fill('120000');
    await dong.nth(0).getByRole('spinbutton').blur();
    await expect.poll(async () => so(await oTong.textContent())).toBe(120000);

    await dong.nth(1).getByRole('spinbutton').fill('35000');
    await dong.nth(1).getByRole('spinbutton').blur();
    await expect.poll(async () => so(await oTong.textContent())).toBe(155000);
  });

  test('CNDB-CD-004 - Chặn xác nhận khi còn túi chưa kiểm đếm', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-CD-004');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const post = batRequestGhi(page, `${API_DS}/confirm`);
    const { drawer, tui, dong } = await moKiemDem(page, input.data.batchId);
    // Đếm đủ mọi túi trừ túi thứ 2, lấy đúng số khai báo để không lẫn cảnh báo lệch.
    for (let i = 0; i < tui.length; i += 1) {
      if (i === 1) continue;
      await dong.nth(i).getByRole('spinbutton').fill(String(Number(tui[i].declaredAmount || 0)));
    }
    await drawer.getByRole('button', { name: nhan('Xác nhận thực nhận') }).click();

    await expect(page.getByText(nhan('Còn 1 túi chưa kiểm đếm'))).toBeVisible();
    await expect(page.getByRole('dialog').filter({ hasText: nhan('Xác nhận thực nhận tiền') }).filter({ hasNotText: nhan('Kiểm đếm') })).toHaveCount(0);
    expect(post, 'không được gọi POST xác nhận chuyến').toEqual([]);
  });

  test('CNDB-CD-005 - Chặn xác nhận khi túi lệch mà không ghi nguyên nhân', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-CD-005');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const post = batRequestGhi(page, `${API_DS}/confirm`);
    const { drawer, tui, dong } = await moKiemDem(page, input.data.batchId);
    for (let i = 0; i < tui.length; i += 1) {
      const khai = Number(tui[i].declaredAmount || 0);
      // Túi 1 lệch thiếu 5.000đ (hoặc thừa nếu khai 0); các túi còn lại khớp.
      const dem = i === 0 ? (khai >= 5000 ? khai - 5000 : khai + 5000) : khai;
      await dong.nth(i).getByRole('spinbutton').fill(String(dem));
    }
    await expect(dong.nth(0).getByPlaceholder(nhan('Bắt buộc khi lệch'))).toBeVisible();
    await drawer.getByRole('button', { name: nhan('Xác nhận thực nhận') }).click();

    await expect(page.getByText(nhan('Túi lệch phải ghi rõ nguyên nhân'))).toBeVisible();
    expect(post, 'không được gọi POST xác nhận chuyến').toEqual([]);
  });

  /**
   * Kỳ vọng user chốt 28/09/2026 (A14): ô nguyên nhân lệch nhập toàn dấu cách bị CHẶN như bỏ trống — khuôn CD-005, thêm 10 dấu cách.
   * Không ghi: chặn thì không có POST xác nhận; nếu KHÔNG chặn thì POST bị `batRequestGhi` bắt lại để đo (xem CD-005).
   */
  test('CNDB-CD-009 — Ô nguyên nhân lệch túi nhập toàn khoảng trắng', async ({ page }) => {
    const input = loadCaseInput(DOC_DIR, 'CNDB-CD-009');
    test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

    const post = batRequestGhi(page, `${API_DS}/confirm`);
    // 🔴 CHẶN THẬT POST xác nhận (bút toán tất toán không hoàn tác) — `batRequestGhi` chỉ ghi nhận.
    await page.route(`**${API_DS}/confirm**`, (r) => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ status: { code: '403', message: 'Bị auto test chặn' } }) }));
    const { drawer, tui, dong } = await moKiemDem(page, input.data?.batchId);
    for (let i = 0; i < tui.length; i += 1) {
      const khai = Number(tui[i].declaredAmount || 0);
      const dem = i === 0 ? (khai >= 5000 ? khai - 5000 : khai + 5000) : khai;
      await dong.nth(i).getByRole('spinbutton').fill(String(dem));
    }
    const oNn = dong.nth(0).getByPlaceholder(nhan('Bắt buộc khi lệch'));
    await expect(oNn).toBeVisible();
    await oNn.fill('          ');
    await drawer.getByRole('button', { name: nhan('Xác nhận thực nhận') }).click();
    await page.waitForTimeout(1_500);
    const chu = (await page.locator('.ant-message-notice, .ant-form-item-explain-error').allInnerTexts()).join(' | ');
    test.info().annotations.push({ type: 'đo', description: `10 dấu cách ở ô nguyên nhân ⇒ "${chu}" · POST xác nhận ${post.length}` });
    expect(post, '🔴 Nguyên nhân toàn dấu cách vẫn gửi POST xác nhận chuyến').toEqual([]);
    await expect(page.getByText(nhan('Túi lệch phải ghi rõ nguyên nhân'))).toBeVisible();
  });
});
