const { expect, test } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { moTrang } = require('../../shared/auth/login');

const MODULE_DIR = path.resolve(__dirname, '..');
const URL_CAU_HINH = '/settings?setting=costMethodDefault';
const API = '/chain-cost-method-config';

/** Nhãn tiếng Việt trong DOM hay ở dạng tổ hợp (NFD) — chuẩn hoá trước khi so. */
const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/** 4 phương pháp được phép chọn. LIFO đã bị loại khỏi danh sách (COST_METHOD_OPTIONS). */
const NHAN_PHUONG_PHAP = [
  'Bình quân gia quyền',
  'Nhập trước xuất trước',
  'Thực tế đích danh',
  'Giá tiêu chuẩn',
];
const NGUON_HOP_LE = ['Cấu hình riêng', 'Kế thừa', 'Theo toàn hệ thống'];


/** Ảnh chứng minh cho báo cáo: mỗi case xanh để lại một ảnh trong `anh-chup/`. */
const ANH_DIR = path.join(MODULE_DIR, 'anh-chup');
async function chup(page, ten) {
  await page.screenshot({ path: path.join(ANH_DIR, `${ten}.png`), fullPage: true });
}

test.beforeEach(async () => {
  test.skip(Boolean(missingRoleReason('tct')), missingRoleReason('tct') ?? '');
});

/**
 * Màn cấu hình chia 3 tab; bảng và thẻ nằm trong tab tương ứng nên phải bấm tab trước khi tìm.
 * 🚫 Không tìm thẳng trong DOM: antd giữ panel của tab chưa mở ở trạng thái ẩn, locator vẫn
 * "resolve" được nhưng `toBeVisible` luôn trượt — lỗi trông như sai locator.
 */
async function moTab(page, ten) {
  await page.getByRole('tab', { name: ten }).click();
}

/** Mở màn cấu hình và trả về body của 2 API nền. */
async function moManCauHinh(page) {
  // 🔴 Timeout rộng hơn `actionTimeout` (15s): `moTrang` có thể phải đăng nhập lại giữa chừng
  //    khi token đã xoay vòng, và lúc đó request cấu hình chỉ xuất hiện sau cả một lượt đăng nhập.
  //    Để mặc định thì case đỏ ngẫu nhiên khi chạy cả bộ, xanh khi chạy riêng.
  const CHO = { timeout: 60_000 };
  const choSystem = page.waitForResponse(
    (r) => r.url().includes(`${API}/system`) && r.request().method() === 'GET',
    CHO,
  );
  const choCategories = page.waitForResponse(
    (r) => r.url().includes(`${API}/categories`) && r.request().method() === 'GET',
    CHO,
  );
  await moTrang(page, URL_CAU_HINH, 'tct');
  const [resSystem, resCategories] = await Promise.all([choSystem, choCategories]);
  return {
    system: await resSystem.json().catch(() => null),
    categories: await resCategories.json().catch(() => null),
  };
}

test('GVMD-001 Màn Giá vốn mặc định mở được và gọi đúng 2 API', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-001');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { system, categories } = await moManCauHinh(page);

  expect(String(system?.status?.code)).toBe('200');
  expect(String(categories?.status?.code)).toBe('200');

  await expect(
    page.getByText('Phương pháp tính giá vốn mặc định', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText('Cấu hình theo danh mục', { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText('Áp dụng cho sản phẩm hình thức phân phối Mua bán'),
  ).toBeVisible();

  // Màn chia đúng 3 tab.
  const nhanTab = (await page.getByRole('tab').allInnerTexts()).map(chuan);
  expect(nhanTab).toEqual([
    'Phương pháp tính giá vốn mặc định',
    'Cấu hình theo danh mục',
    'Lịch sử áp cho sản phẩm đã có',
  ]);
  await chup(page, 'GVMD-001');
});

test('GVMD-002 Cấu hình toàn hệ thống hiển thị đúng giá trị đã seed', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-002');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { system } = await moManCauHinh(page);
  expect(String(system?.status?.code)).toBe('200');

  // Giá trị hiển thị nằm ngay sau nhãn "Toàn hệ thống:" trong thẻ đầu.
  const dong = page.locator('text=/Toàn hệ thống:/').first();
  await expect(dong).toBeVisible();
  const noiDung = chuan(await dong.innerText());

  // 🔴 Không nới lỏng: API phải trả về một phương pháp, và màn phải hiện tên phương pháp đó —
  //    "---" nghĩa là chuỗi đang đăng nhập KHÔNG có cấu hình toàn hệ thống nào.
  expect(system?.data, 'API /system phải trả về phương pháp mặc định đã seed').toBeTruthy();
  expect(noiDung).not.toContain('---');
  expect(NHAN_PHUONG_PHAP.some((nhan) => noiDung.includes(nhan))).toBeTruthy();
  await chup(page, 'GVMD-002');
});

test('GVMD-003 Bảng danh mục đủ cột và có dữ liệu', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-003');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { categories } = await moManCauHinh(page);
  expect(String(categories?.status?.code)).toBe('200');
  await moTab(page, 'Cấu hình theo danh mục');

  const bang = page.locator('.ant-table').first();
  for (const cot of ['Danh mục', 'Phương pháp đang áp dụng', 'Nguồn', 'Thao tác']) {
    await expect(bang.locator('thead').getByText(cot, { exact: true })).toBeVisible();
  }

  expect(Array.isArray(categories?.data)).toBeTruthy();
  expect(categories.data.length, 'Chuỗi phải có ít nhất 1 danh mục sản phẩm').toBeGreaterThan(0);
  await expect(bang.locator('tbody tr.ant-table-row').first()).toBeVisible();
  await chup(page, 'GVMD-003');
});

test('GVMD-004 Cột Nguồn chỉ nhận 3 giá trị hợp lệ', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-004');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  await moManCauHinh(page);
  await moTab(page, 'Cấu hình theo danh mục');
  const bang = page.locator('.ant-table').first();
  await expect(bang.locator('tbody tr.ant-table-row').first()).toBeVisible();

  const tags = await bang.locator('tbody .ant-tag').allInnerTexts();
  expect(tags.length).toBeGreaterThan(0);
  for (const tag of tags) {
    expect(NGUON_HOP_LE, `Tag nguồn lạ: "${chuan(tag)}"`).toContain(chuan(tag));
  }
  await chup(page, 'GVMD-004');
});

test('GVMD-005 Drawer cấu hình toàn hệ thống mở được và không còn LIFO', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-005');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  await moManCauHinh(page);
  await moTab(page, 'Phương pháp tính giá vốn mặc định');

  // Nút mang cả icon nên tên trợ năng là "edit Sửa" — 🚫 không dùng { exact: true }.
  // Phải giới hạn trong đúng thẻ cấu hình: các tab cài đặt khác cũng có nút "Sửa".
  const theHeThong = page
    .locator('.ant-pro-card')
    .filter({ hasText: 'Áp dụng cho sản phẩm hình thức phân phối Mua bán' })
    .first();
  await theHeThong.getByRole('button', { name: /Sửa$/ }).first().click();
  // Drawer của antd v6 lộ ra dưới role `dialog`, 🚫 không còn khớp `.ant-drawer-content`.
  const drawer = page.getByRole('dialog', {
    name: 'Phương pháp tính giá vốn mặc định toàn hệ thống',
  });
  await expect(drawer).toBeVisible();

  // antd v6: ô chọn lộ ra dưới role `combobox`. 🔴 `getByRole('option')` bắt trúng listbox
  //    trợ năng ẨN của antd (text là mã "MAC", "FIFO"), không phải dropdown người dùng thấy —
  //    phải đọc đúng `.ant-select-item-option` trong dropdown đang mở.
  await drawer.getByRole('combobox').first().click();
  const dsChon = page.locator('.ant-select-dropdown').last().locator('.ant-select-item-option');
  await expect(dsChon.first()).toBeVisible();

  const nhan = (await dsChon.allInnerTexts()).map(chuan);
  expect(nhan.sort()).toEqual([...NHAN_PHUONG_PHAP].sort());
  expect(nhan.join(' | ')).not.toContain('Nhập sau xuất trước');
  await chup(page, 'GVMD-005');
});

test('GVMD-006 Drawer cấu hình danh mục mở đúng tên danh mục', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-006');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { categories } = await moManCauHinh(page);
  const tenDanhMuc = chuan(categories?.data?.[0]?.categoryName);
  expect(tenDanhMuc, 'Cần ít nhất 1 danh mục để mở drawer').toBeTruthy();
  await moTab(page, 'Cấu hình theo danh mục');

  const bang = page.locator('.ant-table').first();
  const dongDau = bang.locator('tbody tr.ant-table-row').first();
  await dongDau.getByRole('button', { name: /Cấu hình$/ }).first().click();

  const drawer = page.getByRole('dialog', { name: /Phương pháp tính giá vốn/ });
  await expect(drawer).toBeVisible();
  expect(chuan(await drawer.innerText())).toContain(tenDanhMuc);
  await expect(drawer.getByRole('button', { name: 'Lưu cấu hình' })).toBeVisible();
  await chup(page, 'GVMD-006');
});

test('GVMD-007 Thẻ lịch sử đợt áp hiển thị và gọi đúng API', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-007');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  await moManCauHinh(page);

  // Thẻ lịch sử nằm ở tab 3 và chỉ mount khi mở tab ⇒ đăng ký chờ TRƯỚC khi bấm tab,
  // 🚫 không chờ ngay lúc vào màn: lúc đó API này chưa được gọi.
  const choJobs = page.waitForResponse(
    (r) => r.url().includes(`${API}/apply-jobs`) && r.request().method() === 'GET',
    { timeout: 60_000 },
  );
  await moTab(page, 'Lịch sử áp cho sản phẩm đã có');
  const body = await (await choJobs).json().catch(() => null);

  expect(String(body?.status?.code)).toBe('200');
  await expect(page.getByRole('button', { name: /Kiểm tra trạng thái/ })).toBeVisible();
  await chup(page, 'GVMD-007');
});

test('GVMD-009 Màn thêm sản phẩm lấy mặc định theo cấu hình', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-009');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { system } = await moManCauHinh(page);
  const mongDoi = system?.data;
  expect(mongDoi, 'Cần có cấu hình toàn hệ thống mới kiểm được mặc định ở màn thêm sản phẩm').toBeTruthy();

  // 🔴 Cấu hình đang là MAC thì case này KHÔNG kết luận được: FE cũng đang hardcode `useState('MAC')`
  //    (`AddProductDrawer.jsx:206`), nên hai bên trùng nhau vì tình cờ. Skip có lý do còn hơn pass giả.
  test.skip(
    mongDoi === 'MAC',
    'Cấu hình toàn hệ thống đang là MAC — trùng với giá trị FE hardcode, không phân biệt được. ' +
      'Đặt cấu hình sang FIFO rồi chạy lại case này.',
  );

  await moTrang(page, '/product/normal', 'tct');
  await page.getByRole('button', { name: /Thêm mới|Thêm sản phẩm/ }).first().click();

  // Màn thêm sản phẩm là DIALOG (.ant-modal), 🚫 không phải .ant-drawer.
  const drawer = page.getByRole('dialog', { name: 'Thêm sản phẩm' });
  await expect(drawer).toBeVisible();

  // Nhãn và ô chọn là hai div anh em trong cùng một khối — bám nhãn rồi leo 2 cấp,
  // 🚫 không dùng .ant-form-item (khối này không phải Form.Item của antd).
  // Đọc cả khối "Kho hàng" rồi đối chiếu nhãn — cấu trúc ô chọn ở màn này không phải
  // Form.Item của antd nên bám theo khối là cách ổn định nhất.
  const khoi = drawer
    .getByText('Phương pháp tính giá vốn', { exact: true })
    .locator('xpath=ancestor::div[3]');
  await khoi.scrollIntoViewIfNeeded();
  const noiDungKhoi = chuan(await khoi.innerText());

  const nhanMongDoi = {
    MAC: 'Bình quân gia quyền',
    FIFO: 'Nhập trước xuất trước',
    SPECIFIC_IDENTIFICATION: 'Thực tế đích danh',
    STANDARD: 'Giá tiêu chuẩn',
  }[mongDoi];

  // 🔴 Giữ nguyên kỳ vọng theo yêu cầu gốc: sản phẩm mới phải lấy mặc định từ cấu hình,
  //    không phải hằng số MAC ở FE.
  expect(noiDungKhoi, `Khối Kho hàng đang hiện: ${noiDungKhoi}`).toContain(nhanMongDoi);
});

test('GVMD-019 Bảng cấu hình theo danh mục hiển thị dạng cây', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-019');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { categories } = await moManCauHinh(page);
  const danhSach = categories?.data || [];

  // Tìm một danh mục THẬT SỰ có con theo dữ liệu API — 🚫 không đoán dòng đầu bảng.
  const conDauTien = danhSach.find(
    (item) => item.parentId && danhSach.some((cha) => cha.categoryId === item.parentId),
  );
  expect(
    conDauTien,
    'API /categories phải trả `parentId` thì FE mới dựng được cây — thiếu trường này là ' +
      'core-service đang chạy bản cũ, khởi động lại rồi chạy lại case.',
  ).toBeTruthy();
  const cha = danhSach.find((item) => item.categoryId === conDauTien.parentId);

  await moTab(page, 'Cấu hình theo danh mục');
  const bang = page.locator('.ant-table').first();

  // 🔴 Bám `data-row-key` (= categoryId), 🚫 không lọc theo tên: tên danh mục là tiền tố của nhau
  //    ("Điện thoại" khớp cả "Điện thoại Việt Nam") nên filter theo text bắt trúng nhiều dòng.
  const dongTheoId = (categoryId) =>
    bang.locator(`tbody tr.ant-table-row[data-row-key="${categoryId}"]`);

  const dongCha = dongTheoId(cha.categoryId);
  await expect(dongCha).toBeVisible();

  // Nút mở rộng chỉ xuất hiện ở dòng có con ⇒ chính là bằng chứng bảng đang ở dạng cây.
  const nutMoRong = dongCha.locator('.ant-table-row-expand-icon-collapsed');
  await expect(nutMoRong).toBeVisible();
  await nutMoRong.click();

  await expect(dongTheoId(conDauTien.categoryId)).toBeVisible();

  // Dòng con phải nằm sâu hơn dòng cha đúng một cấp — đó mới là bằng chứng cây, không phải
  // chỉ là "dòng có xuất hiện".
  const capCha = await dongCha.getAttribute('class');
  const capCon = await dongTheoId(conDauTien.categoryId).getAttribute('class');
  const mucCap = (cls) => Number(/ant-table-row-level-(\d+)/.exec(cls || '')?.[1] ?? -1);
  expect(mucCap(capCon)).toBe(mucCap(capCha) + 1);

  await chup(page, 'GVMD-019');
});

test('GVMD-021 Lọc danh mục theo nguồn cấu hình', async ({ page }) => {
  const input = loadCaseInput(MODULE_DIR, 'GVMD-021');
  test.skip(Boolean(skipReason(input)), skipReason(input) ?? '');

  const { categories } = await moManCauHinh(page);
  const danhSach = categories?.data || [];
  await moTab(page, 'Cấu hình theo danh mục');

  const bang = page.locator('.ant-table').first();
  const NHAN_NGUON = {
    SELF: 'Cấu hình riêng',
    INHERITED: 'Kế thừa',
    SYSTEM: 'Theo toàn hệ thống',
  };

  for (const [nguon, nhan] of Object.entries(NHAN_NGUON)) {
    const soMongDoi = danhSach.filter((item) => item.source === nguon).length;

    // 🔴 antd Segmented đặt `input[type=radio]` thật ở lớp ẩn (opacity 0) — `getByRole('radio')`
    //    bắt trúng nó và `toBeVisible` luôn trượt. Bám vào `.ant-segmented-item` người dùng thấy.
    // Nhãn lọc mang sẵn số đếm ⇒ đọc thẳng từ giao diện, không cần đoán.
    const nutLoc = page
      .locator('.ant-segmented-item')
      .filter({ hasText: new RegExp(`^${nhan} \\(`) })
      .first();
    await expect(nutLoc, `Thiếu mục lọc "${nhan}"`).toBeVisible();
    expect(chuan(await nutLoc.innerText())).toBe(`${nhan} (${soMongDoi})`);

    await nutLoc.click();

    if (soMongDoi === 0) {
      await expect(bang.locator('tbody tr.ant-table-row')).toHaveCount(0);
      continue;
    }

    // Mọi dòng đang hiện phải mang đúng tag nguồn vừa chọn — 🚫 không chỉ kiểm dòng đầu.
    const tags = await bang.locator('tbody .ant-tag').allInnerTexts();
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) {
      expect(chuan(tag)).toBe(nhan);
    }
  }

  await page
    .locator('.ant-segmented-item')
    .filter({ hasText: /^Tất cả \(/ })
    .first()
    .click();
  await chup(page, 'GVMD-021');
});
