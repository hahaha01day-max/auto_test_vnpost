const { expect } = require('@playwright/test');
const { credentialsFor, getRole } = require('./accounts');

/**
 * Đăng nhập một vai trên `page` đang mở.
 *
 * Tách riêng khỏi `roles.setup.js` vì phiên lưu ở `.auth/<vai>.json` 🔴 KHÔNG dùng lại được nhiều lần:
 * hệ thống XOAY VÒNG refresh token — test đầu tiên nạp app sẽ gọi `/auth/v2/user/refresh-token`, và
 * refresh token nằm trong file session lập tức hết hiệu lực. Test thứ hai nạp đúng file đó sẽ nhận
 * `SSHOP-420 "Mã truy cập đã hết hạn"` rồi bị đá về `/account`.
 *
 * 🔴 Triệu chứng của bẫy này rất dễ đọc nhầm: case chạy RIÊNG thì xanh, chạy CẢ BỘ thì đỏ, và ảnh chụp
 * lúc hỏng là màn đăng nhập — trông y hệt lỗi môi trường hoặc sai tài khoản.
 */
/**
 * Điền một ô của form đăng nhập rồi KIỂM LẠI, điền bù khi ô bị xoá trắng.
 *
 * 🔴 Form đăng nhập render lại sau lần nhập đầu tiên và có thể nuốt mất giá trị vừa `fill` — đã đo:
 * ô "Tên đăng nhập" giữ được chữ còn ô "Mật khẩu" trống trơn lúc bấm Tiếp tục, nên bước đăng nhập
 * đứng nguyên ở form mà 🚫 không có thông báo lỗi nào của ứng dụng.
 *
 * 🚫 Không dùng `toHaveValue` để kiểm: thông báo lỗi của nó IN NGUYÊN GIÁ TRỊ ra log và báo cáo HTML,
 * tức là in mật khẩu. Chỉ so độ dài.
 */
async function dienChacChan(o, giaTri, ten) {
  for (let i = 0; i < 3; i += 1) {
    await o.fill(giaTri);
    if ((await o.inputValue()).length === giaTri.length) return;
    await o.page().waitForTimeout(300);
  }
  throw new Error(
    `Không điền được ô "${ten}": form xoá trắng giá trị sau mỗi lần nhập (đã thử 3 lần).`,
  );
}

async function dangNhapVai(page, roleKey) {
  const role = getRole(roleKey);
  const cred = credentialsFor(roleKey);

  // 🔴 Lấy theo VAI TRÒ + nhãn, 🚫 KHÔNG `input[type="password"]`: ô khớp đầu tiên là input ẩn
  //    `aria-hidden` chèn để chặn autofill ⇒ chờ nó hiện sẽ timeout 25s với thông báo trông như
  //    lỗi môi trường.
  const username = page.getByRole('textbox', { name: /tên đăng nhập|username/i });
  const password = page.getByRole('textbox', { name: /mật khẩu|password/i });
  await expect(username).toBeVisible({ timeout: 25_000 });

  await dienChacChan(username, cred.account, 'Tên đăng nhập');
  await dienChacChan(password, cred.password, 'Mật khẩu');
  // 🔴 Trang đăng nhập có thêm nút "Đăng nhập bằng VNPOST SSO" ⇒ chỉ lấy nút submit.
  await page.getByRole('button', { name: /tiếp tục|đăng nhập|login|sign in/i }).and(page.locator('button[type="submit"]')).click();

  // 🔴 Phân biệt "đăng nhập hỏng" với "chưa chọn phạm vi": nếu form đăng nhập vẫn còn đó thì mọi lỗi
  //    sau đây đều nói sai bản chất ("không thấy đơn vị X"), khiến người đọc đi sửa nhãn trong .env
  //    trong khi vấn đề thật là sai mật khẩu hoặc tài khoản bị khoá.
  // 🚫 KHÔNG kiểm bằng "form đăng nhập biến mất": đã đo — sau khi đăng nhập xong, trang đã sang
  //    `/account` mà hai ô đăng nhập VẪN nằm trong DOM và vẫn `visible`, nên điều kiện đó không bao
  //    giờ đúng và mọi vai đều đỏ oan. Dấu hiệu vào được là màn chọn phạm vi, hoặc URL đã rời trang
  //    đăng nhập (tài khoản một phạm vi vào thẳng bên trong).
  const vaoDuoc = Promise.race([
    page
      .getByText(/Truy cập trang quản lý|Truy cập điểm bán/)
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 }),
    page.waitForURL((u) => u.pathname !== '/' && !/\/login/.test(u.pathname), { timeout: 20_000 }),
  ]);
  try {
    await vaoDuoc;
  } catch {
    // Trích nguyên văn thông báo hệ thống đang hiện (toast / lỗi dưới ô) — "sai mật khẩu" và "tài khoản bị khoá"
    // cần cách xử lý khác nhau, đoán chung một câu thì người đọc log phải tự đăng nhập lại để biết.
    const loi = (
      await page
        .locator('.ant-message-notice, .ant-notification-notice, .ant-form-item-explain-error, .ant-alert-error')
        .allInnerTexts()
        .catch(() => [])
    )
      .map((t) => t.normalize('NFC').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    throw new Error(
      `Đăng nhập vai ${role.key} (${cred.account}) không qua được: vẫn đứng ở trang đăng nhập sau 20s. ` +
        (loi.length
          ? `Hệ thống báo: "${loi.join(' | ')}". `
          : 'Hệ thống không hiện thông báo lỗi nào (nút đăng nhập có thể không nhận click — lỗi môi trường, chạy lại). ') +
        `Kiểm lại ${role.envAccount}/${role.envPassword}.`,
    );
  }

  // Tài khoản chỉ có MỘT phạm vi thì hệ thống tự vào thẳng, không hiện màn chọn — khi đó bỏ trống
  // `VNPOST_SCOPE_LABEL_<VAI>` là đúng. Vẫn còn ở màn chọn ⇒ tài khoản có nhiều dòng, phải khai nhãn:
  // 🚫 không tự bấm một dòng nào đó, vì bấm nhầm là đăng nhập sai phạm vi mà không ai biết.
  // Khai được MỘT trong hai là đủ khi nó đã đủ tách dòng: `SCOPE_LABEL` là tên đơn vị (cột trái),
  // `ROLE_LABEL` là nhãn vai (chữ bên phải). Khai cả hai khi tài khoản có nhiều dòng dễ lẫn.
  if (!cred.scopeLabel && cred.roleLabel) {
    const dongTheoVai = page.getByText(cred.roleLabel, { exact: true });
    const n = await dongTheoVai.count();
    expect(
      n,
      `Nhãn vai "${cred.roleLabel}" khớp ${n} dòng — cần đúng 1. Khai thêm ${role.envScope} ` +
        '(TÊN ĐƠN VỊ ở cột trái, ví dụ "Bưu điện Hưng Yên") để tách dòng.',
    ).toBe(1);
    await dongTheoVai.click();
    await expect(page).not.toHaveURL(/\/account(?:\?|$)/, { timeout: 30_000 });
    return;
  }

  if (!cred.scopeLabel) {
    await expect(
      page,
      `Tài khoản vai ${role.key} vẫn dừng ở màn chọn phạm vi ⇒ nó có nhiều hơn một phạm vi. ` +
        `Khai ${role.envScope} (tên đơn vị) và ${cred.envRole} (nhãn vai) trong .env.`,
    ).not.toHaveURL(/\/account(?:\?|$)/, { timeout: 30_000 });
    return;
  }

  // 🔴 🚫 KHÔNG dùng `getByText(tên, { exact: true }).first()`: tên đơn vị CHA còn xuất hiện lần nữa
  //    làm PHỤ ĐỀ của các đơn vị con ("Bưu điện Hoàn Kiếm" mang phụ đề "Bưu điện Hà Nội HN"), và
  //    `.first()` sẽ bấm đúng cái phụ đề đó ⇒ đăng nhập vào SAI PHẠM VI mà không có lỗi nào báo ra.
  const ten = page.getByText(cred.scopeLabel, { exact: true });
  // 🔴 Tài khoản MỘT phạm vi có lúc được app TỰ VÀO THẲNG dù `.env` vẫn khai SCOPE_LABEL (đo làn 7/8 25/09/2026:
  //    CHT làn 7 luôn tự vào) ⇒ chờ màn chọn phạm vi là đỏ oan. Đã rời /account mà không có màn chọn ⇒ coi là xong.
  const coMan = await ten.first().waitFor({ state: 'visible', timeout: 10_000 }).then(() => true, () => false);
  if (!coMan && !/\/account(?:\?|$)/.test(new URL(page.url()).pathname + new URL(page.url()).search)) {
    // Kiểm đã vào ĐÚNG phạm vi khi đọc được: tên đơn vị có trên trang (header/ô chọn cửa hàng) ⇒ xác nhận;
    // không thấy ⇒ CẢNH BÁO (tài khoản nhiều phạm vi có thể tự vào phạm vi mặc định — xem log khi case lạ).
    const dung = await page.getByText(cred.scopeLabel, { exact: true }).first().waitFor({ state: 'visible', timeout: 5_000 }).then(() => true, () => false);
    console.log(`[dangNhapVai] ${role.key}: app tự vào thẳng (không có màn chọn phạm vi) — ${dung ? `đã thấy "${cred.scopeLabel}" trên trang` : `⚠️ KHÔNG thấy "${cred.scopeLabel}" trên trang, kiểm lại phạm vi`}`);
    return;
  }
  await expect(
    ten.first(),
    `Không thấy đơn vị "${cred.scopeLabel}" trên màn chọn phạm vi — kiểm lại ${role.envScope}`,
  ).toBeVisible({ timeout: 30_000 });

  const dong = cred.roleLabel
    ? ten.locator(
        `xpath=ancestor::*[.//*[normalize-space(text())=${JSON.stringify(cred.roleLabel)}]][1]`,
      )
    : ten;

  const soDong = await dong.count();
  expect(
    soDong,
    `Nhãn phạm vi khớp ${soDong} dòng — cần đúng 1. Khai thêm ${cred.envRole} ` +
      '(nhãn vai bên phải: Admin / Quản lý tỉnh / Giám đốc xã / Cửa hàng trưởng) để tách dòng.',
  ).toBe(1);
  // 🔴 Lớp `ant-spin-section` phủ lên danh sách trong lúc màn tải phạm vi và **nuốt cú click**:
  //    Playwright báo "subtree intercepts pointer events" rồi retry tới hết timeout, đọc như
  //    không tìm thấy dòng. `{ force: true }` cũng vô ích vì phần tử bị detach khi Spin tắt.
  //    Chờ Spin biến mất trước, 🚫 đừng bấm chồng lên nó.
  // 🔴 Chờ `hidden` chứ 🚫 không phải `detached`, và timeout NGẮN: antd có thể chỉ gắn class ẩn
  //    thay vì gỡ phần tử ⇒ chờ `detached` là chờ tới hết timeout một cách vô ích. Đo 23/09: ba vai
  //    `seed_*` mất **17,5 giây mỗi vai** ở đúng chỗ này, trong khi các vai khác chỉ ~3 giây.
  await page
    .locator('.ant-spin-section')
    .waitFor({ state: 'hidden', timeout: 8_000 })
    .catch(() => {});
  // 🔴 Cú click này có thể "hỏng" dù ĐÃ ăn: app rời màn chọn phạm vi ngay, phần tử bị detach, và
  //    Playwright retry cho tới `Timeout 15000ms exceeded` — lỗi đọc như không bấm được dòng nào
  //    trong khi ảnh chụp cho thấy đã vào hẳn trong ứng dụng. Nuốt lỗi click, rồi để phép kiểm
  //    URL bên dưới phán quyết: 🚫 không rời `/account` mới thật sự là hỏng.
  /**
   * 🔴 `timeout` NGẮN và nuốt lỗi. Cú click này thường "hỏng" dù ĐÃ ăn: app rời màn chọn phạm vi
   *    ngay, phần tử bị detach, Playwright retry **cho đủ timeout mặc định 15 giây** rồi mới ném.
   *    Đo 23/09: ba vai `seed_*` mất **17,5 giây mỗi vai** đúng vì chỗ này — trong khi các vai
   *    khác (click ăn ngay) chỉ ~3 giây. Phép kiểm thật là URL bên dưới, 🚫 không phải cú click.
   */
  await dong.click({ timeout: 3_000 }).catch(() => {});
  await expect(page).not.toHaveURL(/\/account(?:\?|$)/, { timeout: 30_000 });
}

/**
 * Mở một đường dẫn bằng vai `roleKey`, tự đăng nhập lại khi phiên lưu sẵn đã hết hiệu lực.
 *
 * 🔴 Dùng hàm này thay cho `page.goto` trong mọi spec có nhiều hơn một test dùng chung một vai.
 */
/**
 * Điều hướng tới `url` mà KHÔNG nạp lại trang.
 *
 * 🔴 `pushState` + `popstate` KHÔNG ăn với router của app (đo 17/09: URL bật lại `/customer` ngay).
 *    Cách duy nhất chạy được là bấm đúng link trong menu — đó cũng là thao tác người dùng thật.
 *    Link của menu con chỉ được render sau khi mở menu cha, nên phải mở lần lượt rồi tìm lại.
 */
/**
 * Đường đi trong menu tới từng route. 🔴 Menu con render LAZY: trước khi mở menu cha, link
 * `a[href="/chain/shop-management"]` KHÔNG tồn tại trong DOM (đo 17/09: chỉ có 5 `.ant-menu-item`
 * và không link nào của route đích) — nên không thể tìm link trước rồi bấm.
 * Thêm route mới thì khai ở đây; thiếu thì hàm dưới tự quét mọi menu cha, chậm hơn nhưng vẫn chạy.
 */
const MENU_THEO_ROUTE = {
  '/chain/shop-management': ['Vận hành', 'Quản lý cửa hàng'],
  '/inventory/stock-alerts': ['Kho hàng', 'Cảnh báo tồn kho'],
  '/inventory/stock-alerts/auto-propose': ['Kho hàng', 'Cảnh báo tồn kho'],
  '/inventory/purchase-request': ['Kho hàng', 'Phiếu đề xuất đặt hàng'],
};

/**
 * Mở đúng "khung con" mà query string yêu cầu, SAU khi đã tới đúng đường dẫn.
 *
 * 🔴 Vì sao cần: bấm link menu chỉ đưa tới khung mặc định. Hub công nợ luôn mở
 * `?tab=dashboard`, màn cấu hình luôn mở `?setting=roundingAmount`. Không mở đúng khung thì API
 * mà case chờ KHÔNG BAO GIỜ được gọi, `waitForResponse` treo tới hết timeout và ảnh chụp trông
 * như lỗi sản phẩm (đo 18/09: mọi case phân hệ 13 đỏ kiểu này).
 *
 * Hai cơ chế đang dùng trong app — cùng đồng bộ vào URL qua `useSearchParams`:
 *   - `?tab=<key>`      → antd **Tabs** (`RemittanceHubPage`), `data-node-key` = đúng key;
 *   - `?setting=<key>`  → antd **Menu** dọc (`SettingPageNext`), `data-menu-id` kết thúc bằng key.
 *
 * 🔴 Tab tràn khỏi bề ngang bị antd thu vào nút `...`: phần tử `.ant-tabs-tab` VẪN nằm trong DOM
 * và Playwright vẫn báo `visible: true` kèm boundingBox, nhưng bấm vào KHÔNG có tác dụng gì —
 * không đổi URL, không gọi API, `aria-selected` rỗng. Với viewport 1440 thì 3 tab cuối của hub
 * (`opening-debt`, `cash-voucher`, `report`) rơi vào diện này. Phải đi qua nút `...`.
 * ⚠️ Mục trong dropdown `...` KHÔNG có `data-node-key` — nó dùng `data-menu-id` dạng
 * `rc-menu-uuid-rc-tabs-0-more-popup-<key>`.
 */
async function moKhungCon(page, search) {
  const params = new URLSearchParams(search);
  const [ten, khoa] = [...params.entries()][0] || [];
  if (!ten || !khoa) return;

  const daDung = () => new URL(page.url()).searchParams.get(ten) === khoa;
  if (daDung()) return;

  // 🔴 Chờ khung điều khiển render XONG rồi mới dò. Bấm link menu xong là URL đổi ngay, nhưng
  //    thanh tab / menu cấu hình còn đang dựng: dò sớm thì `.ant-tabs-tab` chưa có phần tử nào,
  //    hàm tưởng màn này không dùng Tabs và ném lỗi oan (đo 18/09: hỏng đúng kiểu đó).
  await page
    .locator('.ant-tabs-tab, .ant-menu-item')
    .first()
    .waitFor({ state: 'attached', timeout: 20_000 })
    .catch(() => {});
  await page.waitForTimeout(1_200);
  if (daDung()) return;

  // 1) antd Tabs — bấm thẳng khi tab nằm trọn trong khung nhìn.
  const tab = page.locator(`.ant-tabs-tab[data-node-key="${khoa}"]`);
  if (await tab.count()) {
    const khung = page.viewportSize();
    const hop = await tab.boundingBox().catch(() => null);
    const tronVenTrongKhung = hop && khung && hop.x >= 0 && hop.x + hop.width <= khung.width;

    if (tronVenTrongKhung) {
      await tab.click().catch(() => {});
      await page.waitForFunction(
        ([t, k]) => new URL(location.href).searchParams.get(t) === k,
        [ten, khoa],
        { timeout: 10_000 },
      ).catch(() => {});
      if (daDung()) return;
    }

    // 2) Tab bị thu vào nút `...`.
    const nutMore = page.locator('.ant-tabs-nav-more').first();
    if (await nutMore.count()) {
      await nutMore.click().catch(() => {});
      await page.waitForTimeout(800);
      const muc = page.locator(`.ant-tabs-dropdown-menu-item[data-menu-id$="-popup-${khoa}"]`);
      if (await muc.count()) {
        await muc.first().click().catch(() => {});
        await page.waitForFunction(
          ([t, k]) => new URL(location.href).searchParams.get(t) === k,
          [ten, khoa],
          { timeout: 10_000 },
        ).catch(() => {});
        if (daDung()) return;
      }
    }
  }

  // 3) antd Menu dọc (màn cấu hình).
  const mucMenu = page.locator(`.ant-menu-item[data-menu-id$="-${khoa}"]`);
  if (await mucMenu.count()) {
    await mucMenu.first().click().catch(() => {});
    await page.waitForFunction(
      ([t, k]) => new URL(location.href).searchParams.get(t) === k,
      [ten, khoa],
      { timeout: 10_000 },
    ).catch(() => {});
    if (daDung()) return;
  }

  // 🔴 KHÔNG im lặng bỏ qua. Đứng nhầm khung mà vẫn chạy tiếp thì case đỏ vì `waitForResponse`
  //    treo, và người đọc log đi tìm bug sản phẩm — mất cả buổi. Nói thẳng ra ở đây.
  throw new Error(
    `Không mở được ${ten}=${khoa} trên ${new URL(page.url()).pathname}. ` +
      `URL hiện tại: ${page.url()}. Khung con này có thể dùng cơ chế khác Tabs/Menu, ` +
      'hoặc vai đang đăng nhập không có quyền thấy nó — xem moKhungCon() trong shared/auth/login.js.',
  );
}

/**
 * @param {string} url đường dẫn đích, CÓ THỂ kèm query (vd `/debt-reconciliation/remittance?tab=opening-debt`)
 */
async function dieuHuongTrongApp(page, url) {
  await page.waitForSelector('.ant-pro-layout, .ant-layout-sider', { timeout: 20_000 }).catch(() => {});
  // 🔴 Vừa đăng nhập xong, app còn đang dựng menu; bấm ngay là bấm vào khoảng không.
  await page.waitForTimeout(2_500);

  // 🔴 TÁCH query khỏi đường dẫn TRƯỚC MỌI PHÉP SO. Trước 18/09 hàm này so bằng nguyên `url`,
  //    nên với URL có `?tab=…` thì: `MENU_THEO_ROUTE[url]` trượt, `a[href$="${url}"]` = 0 (link
  //    menu không bao giờ mang query) và `pathname.includes(url)` = false NGAY CẢ KHI đã đứng
  //    đúng trang. Hàm không bao giờ `return`, quét hết menu cha rồi bỏ cuộc, để trang đứng ở
  //    `/customer` — và case đỏ với lý do vô nghĩa. Dính 19 chỗ gọi ở phân hệ 13 và 14.
  const { pathname: duongDan, search: thamSo } = new URL(url, 'http://x');

  const toiNoi = () => new URL(page.url()).pathname.includes(duongDan);

  const duong = MENU_THEO_ROUTE[duongDan];
  if (duong) {
    for (const nhan of duong) {
      const muc = page.locator('.ant-menu-title-content', { hasText: nhan }).first();
      await muc.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {});
      await muc.click().catch(() => {});
      await page.waitForTimeout(1_500);
    }
    await page.waitForURL(() => toiNoi(), { timeout: 20_000 }).catch(() => {});
    if (toiNoi()) return moKhungCon(page, thamSo);
  }

  // Không khai sẵn đường đi: mở lần lượt từng menu cha cho tới khi link của route hiện ra.
  const link = () => page.locator(`a[href$="${duongDan}"]`).first();
  const menuCha = page.locator('.ant-menu-submenu-title');
  const so = await menuCha.count();
  for (let i = 0; i < so; i++) {
    await menuCha.nth(i).click().catch(() => {});
    await page.waitForTimeout(700);
    if (await link().count()) {
      await link().click();
      await page.waitForURL(() => toiNoi(), { timeout: 20_000 }).catch(() => {});
      if (toiNoi()) return moKhungCon(page, thamSo);
    }
  }

  throw new Error(
    `Không điều hướng được tới ${duongDan} (đã quét ${so} menu cha). URL hiện tại: ${page.url()}. ` +
      'Khai đường đi vào MENU_THEO_ROUTE trong shared/auth/login.js, hoặc kiểm quyền của vai đang đăng nhập.',
  );
}

const laManDangNhap = (page) =>
  /\/account(?:\?|$)/.test(page.url()) || /\/login/.test(page.url());

async function moTrang(page, url, roleKey) {
  // Vòng 1: thử phiên đã lưu — nếu còn hiệu lực thì vào thẳng, không phải đăng nhập lại.
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // 🔴 Cú đá về màn đăng nhập xảy ra SAU khi app gọi `refresh-token` và nhận 401 — đọc
  //    `page.url()` ngay sau `goto` là đọc trúng lúc app chưa kịp chuyển hướng.
  //    ⚠️ Mốc chờ này từng là 3s: đủ cho backend local, KHÔNG đủ khi API là `vnpost-api.sfin.vn`.
  //    Chờ thiếu thì hàm tưởng đã vào được app, bỏ qua bước đăng nhập lại, và MỌI case của vai đó
  //    đỏ với lý do vô nghĩa "không mở được màn ...".
  await Promise.race([
    page.waitForURL(/\/account(?:\?|$)|\/login/, { timeout: 15_000 }).catch(() => {}),
    page.waitForSelector('.ant-pro-layout, .ant-layout-sider', { timeout: 15_000 }).catch(() => {}),
  ]);
  if (!laManDangNhap(page) && page.url().includes(url)) return;

  // Vòng 2: đăng nhập rồi đi tới đích.
  //
  // ⭐ ĐÍNH CHÍNH 18/09/2026 — `page.goto` TRONG CÙNG context vừa đăng nhập là AN TOÀN, đi đúng
  //    kiểu người dùng thật gõ URL / bấm F5. Trước đây tưởng `goto` phá phiên; đo lại thì thủ phạm
  //    là **cookie `refreshToken` sai path ở proxy dev**: backend đặt `Path=/auth/v2/user` còn FE
  //    gọi `/__api/auth/v2/user/refresh-token`, path không khớp ⇒ trình duyệt KHÔNG gửi cookie ⇒
  //    `refresh-token` 401 ⇒ đá về `/account`. Đã vá ở `vnpost-web/rsbuild.config.js`
  //    (`rewriteDevCookie` viết lại `Path=/`). Sau khi vá: goto + F5 đều `refresh-token` 200.
  //
  // 🔴 Cái VẪN ĐÚNG: refresh token **xoay vòng**, nên `storageState` lưu sẵn chỉ dùng được cho
  //    context ĐẦU TIÊN (đo: lần 1 vào được, lần 2–3 đều 401). Vì vậy mỗi test vẫn phải tự đăng
  //    nhập trong context của mình — 🚫 đừng tin `.auth/<vai>.json` là vé vào cửa dùng mãi.
  if (laManDangNhap(page)) await dangNhapVai(page, roleKey);

  if (!page.url().includes(url)) {
    // Đi thẳng, y như người dùng dán URL. Kèm được cả `?tab=`/`?setting=` nên không phải mò menu.
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await Promise.race([
      page.waitForURL(/\/account(?:\?|$)|\/login/, { timeout: 15_000 }).catch(() => {}),
      page.waitForSelector('.ant-pro-layout, .ant-layout-sider', { timeout: 15_000 }).catch(() => {}),
    ]);
  }

  /**
   * 🔴 Thử `goto` MỘT LẦN NỮA sau khi ứng dụng đã dựng xong khung.
   *
   * Ngay sau đăng nhập, app còn đang nạp menu/quyền và **đá mọi điều hướng về trang mặc định**
   * (`/lich-ca-nhan/ca-lam-viec`). Cú `goto` ở trên rơi đúng khoảnh khắc đó, rồi hàm rơi xuống
   * đường dò menu và chết với *"Không điều hướng được tới … (đã quét 11 menu cha)"* — đọc y như
   * **vai thiếu quyền**, trong khi cùng vai đó chạy một mình lại xanh (context đầu tiên còn dùng
   * được `storageState` nên 🚫 không phải đăng nhập lại).
   *
   * 🔴 Triệu chứng đặc trưng: **test ĐẦU TIÊN xanh, mọi test sau đỏ** — refresh token xoay vòng nên
   * chỉ context đầu dùng được phiên lưu sẵn.
   */
  if (!laManDangNhap(page) && !page.url().includes(url)) {
    await page
      .waitForSelector('.ant-pro-layout, .ant-layout-sider', { timeout: 20_000 })
      .catch(() => {});
    await page.waitForTimeout(2_000);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page
      .waitForSelector('.ant-pro-layout, .ant-layout-sider', { timeout: 20_000 })
      .catch(() => {});
    await page.waitForTimeout(1_500);
  }

  // Dự phòng: môi trường nào chưa vá cookie path thì `goto` vẫn bị đá về màn đăng nhập —
  // rơi lại đường cũ (đăng nhập + bấm menu) để bộ test không chết hẳn.
  if (laManDangNhap(page)) {
    await dangNhapVai(page, roleKey);
    await dieuHuongTrongApp(page, url);
  } else if (!page.url().includes(url)) {
    await dieuHuongTrongApp(page, url);
  }
}

module.exports = { dangNhapVai, dienChacChan, moTrang };
