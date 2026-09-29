'use strict';

/**
 * 03b — **VÒNG ĐỜI CA THẬT** trên ĐIỂM BÁN SEED (vai `seed_shop`): chấm công → mở ca → tạm chốt → chốt hẳn.
 *
 * 🔴 Vì sao phải gộp 16 case vào một file chạy NỐI TIẾP: vòng đời ca đi **một chiều**. Ca đã chốt
 *    🚫 không quay lại trạng thái "đang mở" được, nên mọi case quan sát trạng thái giữa chừng
 *    (đang mở · tạm chốt · lệch quỹ) chỉ sống đúng một lần, đúng một thứ tự. Tách ra từng file
 *    độc lập là mỗi file phải tự dựng lại ca — mà mỗi lần dựng là **một ca thật ghi vào quỹ tiền
 *    mặt của quầy**, 🚫 không xoá được.
 *
 * 🔴 Đây là nhóm case GHI nặng nhất của repo: mở/tạm chốt/chốt ca ghi quỹ tiền mặt và khoá số liệu
 *    ca. 🚫 KHÔNG bọc `chanGhi()` ở đây (bọc là vô hiệu chính thứ đang kiểm) — bù lại toàn bộ ghi
 *    chỉ rơi vào **hai ca hôm nay của nhân viên thuộc điểm bán do bộ seed tự dựng**
 *    (`AUTO_SHOP_*`), 🚫 KHÔNG đụng điểm bán vận hành thật: ghi quỹ tiền mặt vào điểm bán thật là
 *    làm bẩn sổ quỹ của người khác và 🚫 không hoàn tác được.
 *
 * Kịch bản tiền mặt — 🔴 con số phải LỆCH có chủ đích, 🚫 đừng khai bừa:
 *
 * | Ca | Mở ca | Tạm chốt | Chênh lệch | Dùng cho |
 * |---|--:|--:|--:|---|
 * | A (ca đầu danh sách) | 1 tờ 100.000 | 2 tờ 100.000 | **+100.000** | 040_001/003/005/006/007/008 |
 * | B (ca thứ hai) | 1 tờ 100.000 | 1 tờ 100.000 | **0** | 040_002 |
 *
 * Không bán hàng nên *tiền dự kiến* = *tiền mở ca*; khai lệch/khớp là cách duy nhất điều khiển
 * được dấu của `cashDifference` mà 🚫 không phải tạo đơn hàng thật.
 *
 * 🔴 Nhãn ô giải trình trong CODE là **"Giải trình chênh lệch"**, 🚫 không phải "Lý do chênh lệch"
 *    như sheet QC viết (đo `WorkShiftPage.jsx`, `isDifferenceReasonRequired`). Phép kiểm bám code
 *    thật và nhận cả hai cách gọi — sửa sheet chứ 🚫 đừng sửa phép kiểm cho khớp chữ sai.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { chuan, khungMan, moManCaCaNhan, soTheCa } = require('./shift-card');

const GOC = path.join(__dirname, '..');
const VAI = 'seed_shop';

/** 🔴 Nối tiếp: mọi case sau ăn trạng thái ca do case trước tạo ra. 🚫 Đừng bật song song. */
test.describe.configure({ mode: 'serial' });

const chanNeuTat = (id) => {
  const thieuVai = missingRoleReason(VAI);
  test.skip(Boolean(thieuVai), thieuVai ?? '');
  const i = loadCaseInput(GOC, id);
  const ly = skipReason(i);
  test.skip(Boolean(ly), ly ?? '');
  return i;
};

/** Mệnh giá 100.000đ đứng thứ 7 trong `CASH_DENOMINATIONS` (0-based: 6). */
const O_100K = 6;
const MENH_GIA_100K = 100_000;

/** Hộp thoại đang mở — Drawer mở ca / chốt ca. */
const drawer = (page) => page.locator('.ant-drawer-open').last();

/** Thẻ ca thứ `i` — mỗi thẻ chứa đúng một nhãn "Tên ca"; leo lên tổ tiên có nút thao tác. */
const theCaThu = (page, i) =>
  khungMan(page)
    .getByText('Tên ca', { exact: true })
    .nth(i)
    .locator('xpath=ancestor::*[.//button][1]');

/**
 * Nút chính của một thẻ ca **khi ca đang mở nhưng chưa kết**.
 *
 * 🔴 Ca đang mở hiện nhãn **"Chốt ca"**, nhưng ca ĐÃ TẠM CHỐT hiện **"Tiếp tục chốt"** — vẫn là ca
 *    chưa kết, vẫn giữ quầy, vẫn chặn mở ca khác. Bám cứng "Chốt ca" là lượt chạy thứ hai trong
 *    cùng ngày đỏ hàng loạt với lý do "ca A chưa mở", trong khi ca A đang mở dở từ lượt trước —
 *    đúng bẫy "case xanh đúng một lần".
 */
const nutCaChuaKet = (the) => the.getByRole('button', { name: /^(Chốt ca|Tiếp tục chốt)$/ });

/**
 * Mở lại drawer chốt ca của một ca **đã tạm chốt**, hoặc skip kèm lý do đo được.
 *
 * 🔴 Ca đã KẾT HẲN mang nhãn "In chốt ca" — bấm vào chỉ in phiếu, 🚫 không mở drawer đối soát.
 *    Chờ drawer ở tình huống đó là đỏ với "toHaveText timeout" nghe như FE hỏng.
 */
async function moLaiDrawerTamChot(page) {
  const nut = theCaThu(page, 0).getByRole('button', { name: 'Tiếp tục chốt', exact: true });
  test.skip(
    (await nut.count()) === 0,
    'Ca A 🚫 không ở trạng thái đã-tạm-chốt (chưa tạm chốt, hoặc đã kết hẳn ⇒ nhãn "In chốt ca"). '
      + 'Trạng thái này chỉ dựng lại được bằng một ca khác.',
  );
  await nut.click();
  return drawer(page);
}

/** Toàn bộ chữ của khối "Thông tin ca làm việc hôm nay". */
const chuThe = async (page) => chuan(await khungMan(page).innerText());

/** Thông báo antd vừa hiện (message + lỗi từng ô của form đang mở). */
async function thongBao(page, form) {
  return [
    ...(await page.locator('.ant-message').allInnerTexts()),
    ...(form ? await form.locator('.ant-form-item-explain-error').allInnerTexts() : []),
  ]
    .map(chuan)
    .filter(Boolean);
}

/** Gõ số tờ cho một mệnh giá trong Form.List tiền mặt của drawer đang mở. */
async function khaiSoTo(dr, chiSo, soTo) {
  const o = dr.locator('input[placeholder="Số tờ"]').nth(chiSo);
  await o.fill(String(soTo));
  await expect(o).toHaveValue(String(soTo));
}

/**
 * Bấm nút rồi xác nhận qua `modal.confirm` ("Xác nhận mở ca" / "Xác nhận tạm chốt").
 *
 * 🔴 `confirmAndSubmitCash()` chèn một `modal.confirm` GIỮA nút bấm và request. Bấm nút rồi
 *    `waitForResponse` ngay là chờ mãi một request chưa ai gửi — đọc như API chết trong khi
 *    hộp xác nhận vẫn đang đứng trên màn hình.
 */
async function bamVaXacNhan(page, dr, tenNut, doiUrl) {
  const cho = page.waitForResponse(
    (r) => doiUrl.test(r.url()) && r.request().method() === 'POST',
    { timeout: 60_000 },
  );
  await dr.getByRole('button', { name: tenNut, exact: true }).last().click();
  const hop = page.locator('.ant-modal-confirm').last();
  await expect(hop, `Bấm "${tenNut}" mà 🚫 không mở hộp xác nhận`).toBeVisible({ timeout: 15_000 });
  await hop.getByRole('button', { name: 'Xác nhận' }).click();
  const res = await cho;
  return res;
}

/** Bỏ qua cả nhóm khi bộ dựng nền chưa xếp được ca nào. */
async function canCoCa(page, soToiThieu = 1) {
  const so = await soTheCa(page);
  test.skip(
    so < soToiThieu,
    `Hôm nay chỉ có ${so} ca — case này cần ≥${soToiThieu}. `
      + 'Bộ dựng nền `seed-ca-hom-nay.shop.spec.js` phải xếp đủ ca trước.',
  );
  return so;
}

test.describe('03b · vòng đời ca — chấm công', () => {
  test.beforeEach(async ({ page }) => {
    await moManCaCaNhan(page, VAI);
  });

  test('03b_020_006 — Sau khi chấm công đến, nút và trạng thái đổi đúng', async ({ page }) => {
    chanNeuTat('03b_020_006');
    await canCoCa(page);

    const the = theCaThu(page, 0);
    const nutDen = the.getByRole('button', { name: 'Chấm công đến' });
    test.skip(
      (await nutDen.count()) === 0,
      'Ca đầu 🚫 không có nút "Chấm công đến" — đã chấm rồi hoặc ngoài khung giờ cho phép. '
        + 'Trạng thái này 🚫 không dựng lại được vì giờ hệ thống không đổi được.',
    );

    const cho = page.waitForResponse(
      (r) => /schedule\/check-in/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await nutDen.click();
    const res = await cho;
    expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

    // Kỳ vọng của sheet: nút đổi sang "Chấm công về" và trạng thái ca sang "đang làm".
    await expect(
      the.getByRole('button', { name: 'Chấm công về' }),
      'Chấm công đến trả 200 nhưng nút 🚫 không đổi sang "Chấm công về"',
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      the.getByRole('button', { name: 'Chấm công đến' }),
      '🔴 Vẫn còn nút "Chấm công đến" sau khi đã chấm — chấm lần hai sẽ lọt',
    ).toHaveCount(0);
  });

  test('03b_020_001 — Chấm công đến ghi nhận giờ lên thẻ ca', async ({ page }) => {
    chanNeuTat('03b_020_001');
    await canCoCa(page);

    // 020_006 đã chấm công đến; ở đây chỉ đọc lại GIỜ ĐẾN đã ghi.
    const the = theCaThu(page, 0);
    const chu = chuan(await the.innerText());
    const sauGioDen = chu.split('Giờ đến')[1] || '';
    expect(
      sauGioDen,
      `Thẻ ca 🚫 không hiện giờ đến sau khi chấm công. Nội dung thẻ: ${chu.slice(0, 300)}`,
    ).toMatch(/\d{1,2}:\d{2}/);
  });

  test('03b_020_003 — Chặn chấm công đến lần thứ hai trong cùng một ca', async ({ page }) => {
    chanNeuTat('03b_020_003');
    await canCoCa(page);

    // 🔴 FE 🚫 KHÔNG còn hiện nút "Chấm công đến" sau lần đầu — đó CHÍNH LÀ cách hệ thống chặn.
    //    Kỳ vọng "hệ thống báo lỗi" của sheet chỉ đúng nếu gọi thẳng API; trên giao diện thì
    //    phép kiểm là **nút biến mất và giờ đến giữ nguyên**.
    const the = theCaThu(page, 0);
    const truoc = chuan(await the.innerText());
    await expect(
      the.getByRole('button', { name: 'Chấm công đến' }),
      '🔴 Ca đã chấm công đến mà nút vẫn còn ⇒ chấm lần hai lọt qua giao diện',
    ).toHaveCount(0);

    await page.waitForTimeout(1_000);
    expect(chuan(await the.innerText()), 'Giờ đến bị đổi dù 🚫 không ai chấm lại').toBe(truoc);
  });
});

test.describe('03b · vòng đời ca — mở ca (ca A)', () => {
  test.beforeEach(async ({ page }) => {
    await moManCaCaNhan(page, VAI);
  });

  test('03b_030_001 — Mở ca với khai tiền mặt theo mệnh giá', async ({ page }) => {
    chanNeuTat('03b_030_001');
    test.setTimeout(180_000);
    await canCoCa(page);

    const the = theCaThu(page, 0);
    const nutMo = the.getByRole('button', { name: 'Mở ca' });
    test.skip(
      (await nutMo.count()) === 0,
      'Ca đầu 🚫 không có nút "Mở ca" — hoặc ca đã mở, hoặc ngoài khung giờ cho phép mở ca.',
    );
    await nutMo.click();

    const dr = drawer(page);
    await expect(dr.locator('.ant-drawer-title')).toHaveText('Mở ca làm việc', { timeout: 20_000 });

    // Quầy thu ngân — `autoSelectSingle` tự chọn khi điểm bán chỉ có một quầy.
    const oQuay = dr.locator('#counterId');
    if (!chuan(await oQuay.innerText())) {
      await oQuay.click();
      const dd = page.locator('.ant-select-dropdown:has(#counterId_list)').last();
      await dd.waitFor({ state: 'visible', timeout: 20_000 });
      const ds = dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
      expect(
        await ds.count(),
        '🔴 Điểm bán chưa có quầy thu ngân nào — phải tạo quầy trước thì mới mở ca được.',
      ).toBeGreaterThan(0);
      await ds.first().click();
    }

    await khaiSoTo(dr, O_100K, 1);
    // Kỳ vọng của sheet: tổng tiền mặt thực tế bằng đúng số đã khai.
    await expect(
      dr.getByText('Tổng tiền mặt thực tế').locator('xpath=ancestor::*[contains(@class,"ant-alert")][1]'),
      'Ô "Tổng tiền mặt thực tế" 🚫 không cộng đúng 1 tờ 100.000',
    ).toContainText('100.000');

    const res = await bamVaXacNhan(page, dr, 'Mở ca', /shift-report\/open-shift/);
    const body = await res.json().catch(() => null);
    expect(String(body?.status?.code), `Mở ca thất bại: ${JSON.stringify(body?.status)}`).toBe('200');

    // Kỳ vọng: nút trên thẻ đổi thành "Chốt ca".
    await expect(
      theCaThu(page, 0).getByRole('button', { name: 'Chốt ca' }),
      'Mở ca trả 200 nhưng nút trên thẻ 🚫 không đổi thành "Chốt ca"',
    ).toBeVisible({ timeout: 30_000 });
  });

  test('03b_010_003 — Đang có ca mở thì ẩn nút Mở ca của mọi ca còn lại', async ({ page }) => {
    chanNeuTat('03b_010_003');
    const so = await canCoCa(page, 2);

    // 🔴 Tiền đề là TRẠNG THÁI DÙNG MỘT LẦN trong ngày (ca A đang mở). Đã chốt rồi thì skip kèm
    //    lý do, 🚫 không đỏ — đỏ ở đây đọc như lỗi sản phẩm trong khi chỉ là tiền đề đã tiêu thụ.
    const dangMo = await nutCaChuaKet(theCaThu(page, 0))
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(
      !dangMo,
      'Ca A hôm nay không ở trạng thái đang mở (đã chốt ở lượt trước) — tiền đề chỉ có lại vào ngày khác.',
    );

    for (let i = 1; i < so; i += 1) {
      await expect(
        theCaThu(page, i).getByRole('button', { name: 'Mở ca' }),
        `🔴 Thẻ ca thứ ${i + 1} vẫn còn nút "Mở ca" trong khi ca A đang mở ⇒ mở song song hai ca`,
      ).toHaveCount(0);
    }
  });

  test('03b_030_003 — Chặn mở ca khi còn ca chưa chốt', async ({ page }) => {
    chanNeuTat('03b_030_003');
    await canCoCa(page, 2);
    // 🔴 Không có ca nào chưa chốt thì "không có nút Mở ca" đúng RỖNG ⇒ pass giả. Kiểm tiền đề.
    const dangMo = await nutCaChuaKet(theCaThu(page, 0))
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(
      !dangMo,
      'Hôm nay không còn ca nào đang mở chưa chốt (đã chốt ở lượt trước) — tiền đề chỉ có lại vào ngày khác.',
    );

    // 🔴 Phép kiểm hai vế: 🚫 không còn đường bấm mở ca, VÀ 🚫 không request open-shift nào đi.
    //    Chỉ kiểm vế nút là pass giả — nút ẩn vì lý do khác (hết giờ ca) cũng xanh.
    const daGui = [];
    page.on('request', (r) => {
      if (/shift-report\/open-shift/.test(r.url()) && r.method() === 'POST') daGui.push(r.url());
    });

    await expect(
      khungMan(page).getByRole('button', { name: 'Mở ca' }),
      '🔴 Còn ca chưa chốt mà giao diện vẫn cho mở ca mới',
    ).toHaveCount(0);
    await expect(
      nutCaChuaKet(theCaThu(page, 0)),
      'Không thấy ca nào đang mở — tiền đề của case chưa đúng',
    ).toBeVisible();

    await page.waitForTimeout(1_500);
    expect(daGui, '🔴 Có request mở ca đi ra trong khi còn ca chưa chốt').toEqual([]);
  });

  test('03b_050_002 — Ca chưa chốt không có phần doanh thu theo hình thức thanh toán', async ({
    page,
  }) => {
    chanNeuTat('03b_050_002');
    await canCoCa(page);

    const dangMo = await nutCaChuaKet(theCaThu(page, 0))
      .waitFor({ state: 'visible', timeout: 20_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(
      !dangMo,
      'Hôm nay không còn ca nào đang mở chưa chốt (đã chốt ở lượt trước) — tiền đề chỉ có lại vào ngày khác.',
    );

    // Báo cáo bên dưới vẫn có chỉ số tổng hợp, nhưng 🚫 KHÔNG có khối doanh thu theo hình thức.
    const chu = await chuThe(page);
    expect(
      /Doanh thu theo hình thức|Hình thức thanh toán/i.test(chu),
      '🔴 Ca chưa chốt mà đã hiện doanh thu theo hình thức thanh toán',
    ).toBe(false);
  });
});

test.describe('03b · vòng đời ca — tạm chốt lệch quỹ (ca A)', () => {
  test.beforeEach(async ({ page }) => {
    await moManCaCaNhan(page, VAI);
  });

  test('03b_040_004 — Chốt ca mù: trước khi tạm chốt KHÔNG hiện tiền dự kiến', async ({ page }) => {
    chanNeuTat('03b_040_004');
    await canCoCa(page);

    // 🔴 Case này chỉ đo được khi ca **chưa tạm chốt**: tạm chốt rồi là ba số đối soát đã hiện,
    //    kiểm "không hiện tiền dự kiến" sẽ đỏ vì lý do hoàn toàn hợp lệ. Lượt chạy thứ hai trong
    //    ngày rơi đúng vào đó ⇒ skip kèm lý do, 🚫 không báo đỏ.
    const nutChot = theCaThu(page, 0).getByRole('button', { name: 'Chốt ca', exact: true });
    test.skip(
      (await nutChot.count()) === 0,
      'Ca A đã tạm chốt (nút là "Tiếp tục chốt") hoặc chưa mở — case "chốt ca mù" chỉ đo được ở ca '
        + 'đang mở và CHƯA tạm chốt. Ca chỉ về lại trạng thái này ở một ngày/một ca khác.',
    );
    await nutChot.click();

    const dr = drawer(page);
    await expect(dr.locator('.ant-drawer-title')).toHaveText('Chốt ca đang mở', { timeout: 20_000 });

    // 🔴 "Chốt ca mù": trước khi tạm chốt, người chốt 🚫 KHÔNG được thấy tiền dự kiến — thấy trước
    //    là khai theo số máy đọc chứ không phải số đếm được trong két.
    const chu = chuan(await dr.innerText());
    for (const nhan of ['Tiền dự kiến', 'Tiền thực tế', 'Chênh lệch']) {
      expect(
        chu.includes(nhan),
        `🔴 Drawer hiện "${nhan}" TRƯỚC khi tạm chốt ⇒ mất tính chất chốt ca mù`,
      ).toBe(false);
    }
    await expect(
      dr.locator('input[placeholder="Số tờ"]').first(),
      'Chưa tạm chốt mà 🚫 không có ô khai số tờ',
    ).toBeVisible();
  });

  test('03b_040_001 — Tạm chốt hiện đủ ba số đối soát', async ({ page }) => {
    chanNeuTat('03b_040_001');
    test.setTimeout(180_000);
    await canCoCa(page);

    const nutChot = theCaThu(page, 0).getByRole('button', { name: 'Chốt ca', exact: true });
    test.skip(
      (await nutChot.count()) === 0,
      'Ca A đã tạm chốt từ lượt trước — thao tác tạm chốt chỉ làm được một lần cho mỗi ca.',
    );
    await nutChot.click();
    const dr = drawer(page);
    await expect(dr.locator('.ant-drawer-title')).toHaveText('Chốt ca đang mở', { timeout: 20_000 });

    // Khai LỆCH có chủ đích: 2 tờ 100.000 trong khi mở ca chỉ 1 tờ ⇒ chênh lệch +100.000.
    await khaiSoTo(dr, O_100K, 2);
    const res = await bamVaXacNhan(page, dr, 'Tạm chốt', /shift-report\/draft-close/);
    const body = await res.json().catch(() => null);
    expect(String(body?.status?.code), `Tạm chốt thất bại: ${JSON.stringify(body?.status)}`).toBe(
      '200',
    );

    // Kỳ vọng của sheet: hiện đủ ba số, và chênh lệch = thực tế − dự kiến.
    for (const nhan of ['Tiền dự kiến', 'Tiền thực tế', 'Chênh lệch']) {
      await expect(dr.getByText(nhan, { exact: true }).first(), `Thiếu dòng "${nhan}"`).toBeVisible({
        timeout: 20_000,
      });
    }
    const soTien = (s) => Number(String(s).replace(/[^\d-]/g, '') || 0);
    const doc = async (nhan) =>
      soTien(
        await dr
          .getByText(nhan, { exact: true })
          .first()
          .locator('xpath=ancestor::tr[1]//td[last()]')
          .innerText(),
      );
    const duKien = await doc('Tiền dự kiến');
    const thucTe = await doc('Tiền thực tế');
    const lech = await doc('Chênh lệch');
    expect(lech, `Chênh lệch ≠ thực tế − dự kiến (${thucTe} − ${duKien})`).toBe(thucTe - duKien);
    expect(lech, 'Kịch bản đòi lệch +100.000 mà số đo ra khác').toBe(MENH_GIA_100K);

    // Ô khai số tờ phải BIẾN MẤT sau khi tạm chốt — khai lại là khai đè số đã đối soát.
    await expect(
      dr.locator('input[placeholder="Số tờ"]'),
      '🔴 Ô khai số tờ vẫn còn sau khi tạm chốt',
    ).toHaveCount(0);
  });

  test('03b_040_005 — Sau khi tạm chốt mới hiện ba số đối soát', async ({ page }) => {
    chanNeuTat('03b_040_005');
    await canCoCa(page);

    // Ca A đang ở DRAFT_CLOSED ⇒ nút thẻ là "Tiếp tục chốt".
    const dr = await moLaiDrawerTamChot(page);
    await expect(dr.locator('.ant-drawer-title')).toHaveText('Chốt ca đang mở', { timeout: 20_000 });

    for (const nhan of ['Tiền dự kiến', 'Tiền thực tế', 'Chênh lệch']) {
      await expect(
        dr.getByText(nhan, { exact: true }).first(),
        `Ca đã tạm chốt mà vẫn thiếu dòng "${nhan}"`,
      ).toBeVisible({ timeout: 20_000 });
    }
  });

  test('03b_040_008 — Chênh lệch khác 0 hiển thị màu đỏ', async ({ page }) => {
    chanNeuTat('03b_040_008');
    await canCoCa(page);

    const dr = await moLaiDrawerTamChot(page);
    const o = dr
      .getByText('Chênh lệch', { exact: true })
      .first()
      // 🔴 `//span[1]` khớp HAI phần tử (span bọc ngoài của antd + span mang class màu) và Playwright
      //    đỏ với "strict mode violation" — 🚫 không phải vì thiếu dòng Chênh lệch. Bám đúng span
      //    mang class màu, vì chính class đó là thứ case này đi kiểm.
      .locator('xpath=ancestor::tr[1]//td[last()]//span[contains(@class,"font-semibold")]');
    await expect(o).toBeVisible({ timeout: 20_000 });
    const lop = (await o.getAttribute('class')) || '';
    expect(lop, `Chênh lệch ≠ 0 phải mang lớp "text-red-500", đang là "${lop}"`).toContain(
      'text-red-500',
    );
    expect(lop, 'Chênh lệch phải in đậm').toContain('font-semibold');
  });

  test('03b_040_007 — Dòng Xử lý chênh lệch xuất hiện khi lệch quỹ', async ({ page }) => {
    chanNeuTat('03b_040_007');
    await canCoCa(page);

    const dr = await moLaiDrawerTamChot(page);
    await expect(
      dr.getByText('Xử lý chênh lệch', { exact: true }).first(),
      'Ca lệch quỹ mà 🚫 không có dòng "Xử lý chênh lệch"',
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      dr.getByText('Chuyển quản lý điểm bán duyệt sau khi chốt ca'),
      'Sai nguyên văn dòng xử lý chênh lệch',
    ).toBeVisible();

    /**
     * 🔴 Màn chốt ca 🚫 KHÔNG hiện TRẠNG THÁI DUYỆT của phiếu chênh lệch — luồng công nợ tách từ
     *    12/08/2026. Kiểm bằng **nhãn hàng** trong bảng đối soát, 🚫 đừng quét chữ "chờ duyệt"
     *    trong toàn bộ drawer: chính dòng mô tả hợp lệ ("Ca vẫn kết được ngay, **không phải chờ
     *    duyệt**") chứa cụm đó ⇒ case đỏ vì đọc trúng câu khẳng định điều ngược lại.
     */
    for (const nhan of ['Trạng thái phiếu', 'Trạng thái duyệt', 'Người duyệt']) {
      await expect(
        dr.getByText(nhan, { exact: true }),
        `🔴 Màn chốt ca lại hiện "${nhan}" — luồng công nợ đã tách khỏi màn này`,
      ).toHaveCount(0);
    }
  });

  test('03b_040_006 — Nhãn ô ghi chú đổi theo tình trạng lệch quỹ', async ({ page }) => {
    chanNeuTat('03b_040_006');
    await canCoCa(page);

    const dr = await moLaiDrawerTamChot(page);
    const oGhiChu = dr.locator('#cashNote');
    await expect(oGhiChu).toBeVisible({ timeout: 20_000 });

    // 🔴 Nguyên văn trong code là "Giải trình chênh lệch" — sheet QC ghi "Lý do chênh lệch".
    const chu = chuan(await dr.innerText());
    expect(
      /Giải trình chênh lệch|Lý do chênh lệch/.test(chu),
      `Ca lệch quỹ mà nhãn ô ghi chú 🚫 không đổi. Nội dung drawer: ${chu.slice(0, 400)}`,
    ).toBe(true);
    expect(chu.includes('Ghi chú'), 'Lệch quỹ mà nhãn vẫn là "Ghi chú"').toBe(false);
    await expect(oGhiChu, 'Placeholder 🚫 không nói rõ là bắt buộc').toHaveAttribute(
      'placeholder',
      'Bắt buộc khi lệch quỹ',
    );
    expect(
      chu.includes('phiếu chênh lệch gửi quản lý điểm bán duyệt'),
      'Thiếu dòng mô tả hệ quả của việc giải trình',
    ).toBe(true);
  });

  test('03b_010_007 — Nhãn "Phiên đang tạm chốt" khi ca mới tạm chốt', async ({ page }) => {
    chanNeuTat('03b_010_007');
    await canCoCa(page);

    const the = theCaThu(page, 0);
    test.skip(
      (await the.getByRole('button', { name: 'Tiếp tục chốt', exact: true }).count()) === 0,
      'Ca A 🚫 không ở trạng thái đã-tạm-chốt — Tag "Phiên đang tạm chốt" chỉ sống ở trạng thái đó.',
    );
    await expect(
      the.getByText('Phiên đang tạm chốt'),
      'Ca đã tạm chốt mà thẻ 🚫 không có Tag "Phiên đang tạm chốt"',
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      the.getByRole('button', { name: 'Tiếp tục chốt' }),
      'Nút chính của thẻ 🚫 không đổi thành "Tiếp tục chốt"',
    ).toBeVisible();
  });

  test('03b_040_003 — Bắt buộc nhập Lý do chênh lệch khi lệch khác 0', async ({ page }) => {
    chanNeuTat('03b_040_003');
    await canCoCa(page);

    const dr = await moLaiDrawerTamChot(page);
    const oGhiChu = dr.locator('#cashNote');
    await expect(oGhiChu).toBeVisible({ timeout: 20_000 });
    await oGhiChu.fill('');

    // 🔴 Phép kiểm là "🚫 KHÔNG có request finalize nào đi", 🚫 đừng dừng ở dòng chữ đỏ.
    const daGui = [];
    page.on('request', (r) => {
      if (/shift-report\/finalize/.test(r.url()) && r.method() === 'POST') daGui.push(r.url());
    });

    await dr.getByRole('button', { name: 'Xác nhận chốt ca' }).click();
    await expect
      .poll(async () => (await thongBao(page, dr)).join(' | '), { timeout: 15_000 })
      .toMatch(/chênh lệch|bắt buộc|lý do|giải trình/i);
    expect(daGui, '🔴 Lý do chênh lệch để trống mà vẫn gửi chốt ca lên server').toEqual([]);
  });
});

test.describe('03b · vòng đời ca — chốt hẳn và ca thứ hai', () => {
  test.beforeEach(async ({ page }) => {
    await moManCaCaNhan(page, VAI);
  });

  test('03b_020_005 — Giờ về trên thẻ ca cập nhật theo giờ đã chấm công', async ({ page }) => {
    chanNeuTat('03b_020_005');
    await canCoCa(page);

    const the = theCaThu(page, 0);
    const nutVe = the.getByRole('button', { name: 'Chấm công về' });
    test.skip(
      (await nutVe.count()) === 0,
      'Ca A 🚫 không có nút "Chấm công về" — chưa chấm công đến hoặc đã chấm về.',
    );

    const cho = page.waitForResponse(
      (r) => /schedule\/check-out/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await nutVe.click();
    const res = await cho;
    expect(res.status(), await res.text().catch(() => '')).toBeLessThan(400);

    await expect
      .poll(async () => chuan(await theCaThu(page, 0).innerText()).split('Giờ về')[1] || '', {
        timeout: 30_000,
      })
      .toMatch(/\d{1,2}:\d{2}/);
  });

  test('03b_040_010 — Chốt hẳn ca rồi thẻ đổi sang In chốt ca', async ({ page }) => {
    chanNeuTat('03b_040_010');
    test.setTimeout(180_000);
    await canCoCa(page);

    const dr = await moLaiDrawerTamChot(page);
    await expect(dr.locator('.ant-drawer-title')).toHaveText('Chốt ca đang mở', { timeout: 20_000 });
    await dr.locator('#cashNote').fill('AUTO TEST — chênh lệch do kịch bản kiểm thử, không phải tiền thật');

    const cho = page.waitForResponse(
      (r) => /shift-report\/finalize/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await dr.getByRole('button', { name: 'Xác nhận chốt ca' }).click();
    const res = await cho;
    const body = await res.json().catch(() => null);
    expect(String(body?.status?.code), `Chốt ca thất bại: ${JSON.stringify(body?.status)}`).toBe(
      '200',
    );

    // 🔴 Phiếu in dựng bằng `print-js` (iframe + window.print) — 🚫 KHÔNG đọc được bằng assert DOM
    //    trong Playwright. Phép kiểm dừng ở chỗ đo được: ca đã chốt hẳn thì nút đổi "In chốt ca".
    await expect(
      theCaThu(page, 0).getByRole('button', { name: 'In chốt ca' }),
      'Chốt ca trả 200 nhưng nút thẻ 🚫 không đổi thành "In chốt ca"',
    ).toBeVisible({ timeout: 30_000 });
  });

  test('03b_040_002 — Chênh lệch bằng 0 hiển thị màu xanh', async ({ page }) => {
    chanNeuTat('03b_040_002');
    test.setTimeout(240_000);
    const so = await canCoCa(page, 2);

    // Ca B: mở rồi tạm chốt với số tờ ĐÚNG BẰNG lúc mở ⇒ chênh lệch 0.
    let chiSo = -1;
    for (let i = 0; i < so; i += 1) {
      if ((await theCaThu(page, i).getByRole('button', { name: 'Mở ca' }).count()) > 0) {
        chiSo = i;
        break;
      }
    }
    test.skip(
      chiSo < 0,
      'Không còn ca nào mở được (ngoài khung giờ hoặc đã dùng hết) — case này cần một ca thứ hai.',
    );

    await theCaThu(page, chiSo).getByRole('button', { name: 'Mở ca' }).click();
    const drMo = drawer(page);
    await expect(drMo.locator('.ant-drawer-title')).toHaveText('Mở ca làm việc', { timeout: 20_000 });
    const oQuay = drMo.locator('#counterId');
    if (!chuan(await oQuay.innerText())) {
      await oQuay.click();
      const dd = page.locator('.ant-select-dropdown:has(#counterId_list)').last();
      await dd.waitFor({ state: 'visible', timeout: 20_000 });
      await dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)').first().click();
    }
    await khaiSoTo(drMo, O_100K, 1);
    const resMo = await bamVaXacNhan(page, drMo, 'Mở ca', /shift-report\/open-shift/);
    expect(String((await resMo.json().catch(() => null))?.status?.code)).toBe('200');

    await expect(theCaThu(page, chiSo).getByRole('button', { name: 'Chốt ca' })).toBeVisible({
      timeout: 30_000,
    });
    await theCaThu(page, chiSo).getByRole('button', { name: 'Chốt ca' }).click();
    const drChot = drawer(page);
    await expect(drChot.locator('.ant-drawer-title')).toHaveText('Chốt ca đang mở', {
      timeout: 20_000,
    });
    // KHỚP: đúng 1 tờ 100.000 như lúc mở ⇒ chênh lệch 0.
    await khaiSoTo(drChot, O_100K, 1);
    const resChot = await bamVaXacNhan(page, drChot, 'Tạm chốt', /shift-report\/draft-close/);
    expect(String((await resChot.json().catch(() => null))?.status?.code)).toBe('200');

    const o = drChot
      .getByText('Chênh lệch', { exact: true })
      .first()
      // 🔴 `//span[1]` khớp HAI phần tử (span bọc ngoài của antd + span mang class màu) và Playwright
      //    đỏ với "strict mode violation" — 🚫 không phải vì thiếu dòng Chênh lệch. Bám đúng span
      //    mang class màu, vì chính class đó là thứ case này đi kiểm.
      .locator('xpath=ancestor::tr[1]//td[last()]//span[contains(@class,"font-semibold")]');
    await expect(o).toBeVisible({ timeout: 20_000 });
    expect(Number(chuan(await o.innerText()).replace(/[^\d-]/g, '') || 0), 'Chênh lệch phải bằng 0').toBe(0);
    const lop = (await o.getAttribute('class')) || '';
    expect(lop, `Chênh lệch = 0 phải mang lớp "text-green-600", đang là "${lop}"`).toContain(
      'text-green-600',
    );

    // 🔴 Lệch 0 thì ô vẫn là "Ghi chú" — đối ứng của 040_006, giữ ở đây để 🚫 không phải dựng
    //    thêm một ca nữa chỉ để kiểm cái nhãn.
    expect(
      chuan(await drChot.innerText()).includes('Giải trình chênh lệch'),
      'Lệch 0 mà nhãn vẫn là "Giải trình chênh lệch"',
    ).toBe(false);

    // Chốt hẳn ca B để 🚫 không để ca treo giữ quầy sang ngày hôm sau.
    const choKet = page.waitForResponse(
      (r) => /shift-report\/finalize/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 60_000 },
    );
    await drChot.getByRole('button', { name: 'Xác nhận chốt ca' }).click();
    const resKet = await choKet;
    expect(
      String((await resKet.json().catch(() => null))?.status?.code),
      '🔴 Ca B tạm chốt xong mà 🚫 không kết được — ca treo sẽ giữ quầy và chặn mọi lượt chạy sau',
    ).toBe('200');
  });
});
