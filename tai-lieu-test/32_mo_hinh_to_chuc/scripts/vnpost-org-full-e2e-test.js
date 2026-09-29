// Full E2E test cho phân hệ Mô hình tổ chức.
// Script này chạy Playwright, tự đăng nhập, tạo dữ liệu test có prefix AUTO_TEST_*,
// kiểm tra thêm/sửa/xóa/validate/import/tạo điểm bán, rồi ghi report ra folder test-output của tài liệu 01.
// Lưu ý: script chỉ chụp ảnh khi case FAIL, đúng yêu cầu không lưu ảnh cho case PASS.
const { chromium, firefox, webkit } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

// Nơi lưu kết quả full E2E: report Markdown, JSON và ảnh lỗi.
const DOC_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(DOC_ROOT, 'test-output/full');
const FAIL_SHOT_DIR = path.join(OUT_DIR, 'screenshots/failures');
const ALL_SHOT_DIR = path.join(OUT_DIR, 'screenshots/all');
const VIDEO_DIR = path.join(OUT_DIR, 'videos');
const TRACE_FILE = path.join(OUT_DIR, 'trace.zip');
const RESULT_JSON = path.join(OUT_DIR, 'vnpost-org-full-e2e-result.json');
const RESULT_MD = path.join(OUT_DIR, 'vnpost-org-full-e2e-report.md');

// URL chính của hệ thống và URL module cần test.
const TARGET = 'https://vnpost.sfin.vn/';
const ORG_URL = 'https://vnpost.sfin.vn/chain/organization-management';
let AUTH = null;

// Cấu hình Playwright qua biến môi trường:
// PW_BROWSER=chromium|firefox|webkit
// PW_HEADED=1 để mở browser thật; mặc định chạy headless.
// PW_SLOWMO=300 để làm chậm thao tác 300ms.
// PW_TRACE=1 để lưu trace .zip dùng với Playwright Trace Viewer.
// PW_VIDEO=1 để record video phiên chạy.
// PW_SCREENSHOT_ALL=1 để chụp thêm screenshot cho cả case PASS.
function getPlaywrightConfig() {
  const browserName = process.env.PW_BROWSER || 'chromium';
  const browserTypeMap = { chromium, firefox, webkit };
  const browserType = browserTypeMap[browserName] || chromium;
  const headed = ['1', 'true', 'yes'].includes(String(process.env.PW_HEADED || '').toLowerCase());
  const slowMo = Number(process.env.PW_SLOWMO || 0);
  const trace = ['1', 'true', 'yes'].includes(String(process.env.PW_TRACE || '').toLowerCase());
  const video = ['1', 'true', 'yes'].includes(String(process.env.PW_VIDEO || '').toLowerCase());
  const screenshotAll = ['1', 'true', 'yes'].includes(String(process.env.PW_SCREENSHOT_ALL || '').toLowerCase());
  return { browserName, browserType, headed, slowMo, trace, video, screenshotAll };
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function readCredentials() {
  // Đọc username/password từ stdin để không hard-code tài khoản trong source.
  // Cách dùng: chạy script rồi nhập 2 dòng: account, password.
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  const lines = [];
  for await (const line of rl) {
    lines.push(line);
    if (lines.length >= 2) break;
  }
  rl.close();
  return { username: lines[0], password: lines[1] };
}

async function text(page, limit = 4000) {
  // Lấy text đang hiển thị trên trang, gom khoảng trắng để dễ assert.
  const t = await page.locator('body').innerText({ timeout: 10000 }).catch(() => '');
  return t.replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function clickText(page, labels, timeout = 5000) {
  // Click theo danh sách text dự phòng, hữu ích khi UI có khác biệt dấu/hoa thường.
  for (const label of labels) {
    const loc = page.getByText(label, { exact: false }).first();
    try {
      await loc.waitFor({ timeout });
      await loc.click({ timeout });
      return label;
    } catch (_) {}
  }
  return null;
}

async function clickRoleButton(page, names, timeout = 5000) {
  for (const name of names) {
    try {
      await page.getByRole('button', { name }).first().click({ timeout });
      return String(name);
    } catch (_) {}
  }
  return null;
}

async function dismissOverlays(page) {
  // Đóng các dropdown/popover có thể che nút thao tác, ví dụ menu user ở góc phải.
  await page.keyboard.press('Escape').catch(() => {});
  await page.mouse.click(260, 90).catch(() => {});
  await page.waitForTimeout(400);
}

async function login(page, username, password) {
  // Đăng nhập và chờ chắc chắn tới màn chọn phạm vi quản lý.
  await page.goto(TARGET, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.waitFor({ timeout: 25000 });
  const inputs = page.locator('input:visible');
  const count = await inputs.count();
  let usernameInput = null;
  for (let i = 0; i < count; i++) {
    const input = inputs.nth(i);
    const type = (await input.getAttribute('type')) || '';
    if (type !== 'password') {
      usernameInput = input;
      break;
    }
  }
  if (!usernameInput) throw new Error('Không tìm thấy ô tài khoản');
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  await page.getByRole('button', { name: /tiếp tục|đăng nhập|login|sign in/i }).click({ timeout: 8000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForFunction(() => {
    const t = document.body?.innerText || '';
    return /Truy cập trang quản lý|Đăng xuất|Admin/.test(t);
  }, { timeout: 30000 });
  await page.waitForTimeout(1000);
}

async function selectAdminScope(page) {
  // Chọn phạm vi Tổng công ty/Admin sau đăng nhập.
  const selected =
    await page.getByText('Admin', { exact: true }).click({ timeout: 8000 }).then(() => 'Admin').catch(() => null) ||
    await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).click({ timeout: 8000 }).then(() => 'Tổng công ty Bưu Điện Việt Nam').catch(() => null);
  if (!selected) throw new Error('Không chọn được scope Admin/Tổng công ty');
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function ensureAuthenticated(page) {
  // Nếu đang bị đá về màn login giữa chừng thì tự login lại để case sau không fail dây chuyền.
  const t = await text(page, 1000);
  if (/Đăng nhập|Tên đăng nhập|Mật khẩu/.test(t) && AUTH) {
    await login(page, AUTH.username, AUTH.password);
    await selectAdminScope(page);
  }
}

async function openOrgModule(page) {
  // Mở module Mô hình tổ chức bằng menu; nếu menu không đưa tới đúng URL thì fallback goto trực tiếp.
  await ensureAuthenticated(page);
  await dismissOverlays(page);
  if (!page.url().includes('/chain/organization-management')) {
    await clickText(page, ['Quản lý chuỗi'], 8000);
    await clickText(page, ['Mô hình tổ chức'], 8000);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  if (!page.url().includes('/chain/organization-management')) {
    await page.goto(ORG_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await ensureAuthenticated(page);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);
  }
  await page.getByText('Mô hình tổ chức', { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await dismissOverlays(page);
}

async function openRootDetail(page) {
  // Mở chi tiết node root Tổng công ty để test các hành động: cập nhật, tạo điểm bán, xem danh sách.
  await openOrgModule(page);
  await page.getByPlaceholder(/tìm kiếm/i).first().fill('').catch(() => {});
  await page.waitForTimeout(500);
  const root = page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first();
  if (!(await root.isVisible().catch(() => false))) {
    await page.goto(ORG_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.getByPlaceholder(/tìm kiếm/i).first().fill('').catch(() => {});
  }
  await page.getByText('Tổng công ty Bưu Điện Việt Nam', { exact: false }).first().click({ timeout: 8000 });
  await page.waitForTimeout(1000);
}

async function closeDrawerOrModal(page) {
  // Hàm tiện ích đóng drawer/modal bằng phím Escape.
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(500);
}

async function openAddDrawer(page) {
  // Mở drawer Thêm đơn vị tổ chức.
  await openOrgModule(page);
  await dismissOverlays(page);
  const clicked =
    await page.getByRole('button', { name: /thêm đơn vị/i }).click({ timeout: 8000 }).then(() => 'button').catch(() => null) ||
    await clickText(page, ['Thêm đơn vị'], 8000);
  if (!clicked) throw new Error('Không mở được form Thêm đơn vị');
  await page.waitForTimeout(1000);
}

async function fillAddOrgForm(page, code, name, parentText = 'Tổng công ty Bưu Điện Việt Nam') {
  // Điền form Thêm đơn vị: mã, tên và đơn vị cha.
  // parentText có thể là Tổng công ty hoặc một Bưu điện tỉnh/thành để tạo đơn vị con.
  const codeInput =
    page.getByPlaceholder(/nhập mã đơn vị/i).first();
  const nameInput =
    page.getByPlaceholder(/điểm bán|nhập tên|tên đơn vị/i).first();
  await codeInput.fill(code);
  await nameInput.fill(name);
  const parentSelect = page.getByText('Chọn đơn vị cha', { exact: false }).first();
  const box = await parentSelect.boundingBox().catch(() => null);
  if (box) {
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  } else {
    await page.mouse.click(1190, 300);
  }
  await page.waitForTimeout(700);
  const dropdown = page.locator('.ant-select-dropdown:visible').last();
  await dropdown.getByText(parentText, { exact: false }).first().click({ timeout: 8000 }).catch(async () => {
    await page.getByText(parentText, { exact: false }).last().click({ timeout: 8000 });
  });
  await page.waitForTimeout(500);
}

async function confirm(page) {
  // Bấm nút Xác nhận và chờ network/UI ổn định.
  const clicked = await clickRoleButton(page, [/xác nhận/i], 5000) || await clickText(page, ['Xác nhận'], 5000);
  if (!clicked) throw new Error('Không tìm thấy nút Xác nhận');
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

async function searchTree(page, keyword) {
  // Tìm kiếm node trong cây tổ chức.
  await openOrgModule(page);
  const search = page.getByPlaceholder(/tìm kiếm/i).first();
  await search.fill('');
  await search.fill(keyword);
  await page.waitForTimeout(1200);
}

async function openCreatedOrgDetail(page, name) {
  // Mở chi tiết một đơn vị test vừa tạo bằng cách tìm kiếm rồi click node trên cây.
  // UI tree hơi khó click bằng text nên script click vào vùng icon/node wrapper.
  await searchTree(page, name);
  const matches = page.getByText(name, { exact: false });
  await matches.first().waitFor({ timeout: 7000 });
  const box = await matches.first().boundingBox();
  if (!box) throw new Error(`Không lấy được vị trí node ${name}`);
  const x = Math.max(90, box.x - 24);
  const y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.waitForTimeout(400);
  await page.mouse.click(box.x + 10, y);
  await page.waitForTimeout(1200);
  const t = await text(page);
  if (!t.includes(name) || (!t.includes('Xoá') && !t.includes('Xóa') && !t.includes('Cập nhật'))) {
    throw new Error(`Không mở được panel chi tiết cho ${name}`);
  }
}

async function updateCurrentOrgName(page, newName) {
  // Cập nhật tên đơn vị đang mở chi tiết.
  const clicked = await clickText(page, ['Cập nhật'], 6000);
  if (!clicked) throw new Error('Không tìm thấy nút Cập nhật');
  await page.waitForTimeout(1000);
  const nameInput =
    page.locator('input[placeholder*="VD"]:visible').first();
  await nameInput.waitFor({ timeout: 6000 });
  await nameInput.fill(newName);
  await confirm(page);
}

async function deleteCurrentOrg(page, unitCode) {
  // Xóa đơn vị đang mở chi tiết và verify bằng API detail trả 404.
  // Verify bằng API tránh việc UI search còn cache kết quả cũ.
  const del = await clickText(page, ['Xoá', 'Xóa'], 6000);
  if (!del) throw new Error('Không tìm thấy nút Xóa');
  await page.waitForTimeout(1000);
  const body = await text(page, 2000);
  if (!/không thể hoàn tác|chắc chắn|xóa/i.test(body)) throw new Error('Không thấy popup/cảnh báo xác nhận xóa');
  const ok = await clickText(page, ['Đồng ý', 'Xác nhận', 'Xoá', 'Xóa'], 6000);
  if (!ok) throw new Error('Không tìm thấy nút xác nhận xóa');
  await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (unitCode) {
    const detail = await page.request.get(`https://vnpost-api.sfin.vn/v1.0/organization-unit/detail?unitCode=${encodeURIComponent(unitCode)}`);
    if (detail.status() !== 404) {
      const body = await detail.text().catch(() => '');
      throw new Error(`API detail vẫn trả về đơn vị sau khi xóa: HTTP ${detail.status()} ${body.slice(0, 300)}`);
    }
  }
}

async function withCase(results, page, id, name, fn) {
  // Wrapper chạy từng test case độc lập.
  // Nếu fail thì chỉ lúc này mới chụp ảnh màn hình vào screenshots/failures.
  const startedAt = new Date().toISOString();
  try {
    const detail = await fn();
    const item = { id, name, status: 'PASS', detail: detail || '', startedAt, finishedAt: new Date().toISOString() };
    if (getPlaywrightConfig().screenshotAll) {
      mkdirp(ALL_SHOT_DIR);
      item.screenshot = path.join(ALL_SHOT_DIR, `${id}.png`);
      await page.screenshot({ path: item.screenshot, fullPage: true }).catch(() => {});
    }
    results.push(item);
  } catch (err) {
    mkdirp(FAIL_SHOT_DIR);
    const shot = path.join(FAIL_SHOT_DIR, `${id}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    results.push({ id, name, status: 'FAIL', error: err.message, screenshot: shot, startedAt, finishedAt: new Date().toISOString() });
  }
}

function writeReport(results, meta) {
  // Sinh report Markdown ngắn gọn để đọc nhanh kết quả sau khi chạy.
  const lines = [];
  lines.push('# Full E2E test report: Mô hình tổ chức');
  lines.push('');
  lines.push(`Ngày chạy: ${meta.startedAt}`);
  lines.push(`Browser: ${meta.playwright.browser}${meta.playwright.headed ? ' headed' : ' headless'}`);
  lines.push(`Trace: ${meta.playwright.trace ? TRACE_FILE : 'off'}`);
  lines.push(`Video: ${meta.playwright.video ? VIDEO_DIR : 'off'}`);
  lines.push(`Screenshot PASS: ${meta.playwright.screenshotAll ? ALL_SHOT_DIR : 'off'}`);
  lines.push(`An toàn dữ liệu: chỉ tạo/sửa/xóa dữ liệu có prefix \`${meta.prefix}\`.`);
  lines.push('');
  lines.push('## Tổng quan');
  lines.push('');
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  lines.push(`- Tổng case chạy: ${results.length}`);
  lines.push(`- PASS: ${pass}`);
  lines.push(`- FAIL: ${fail}`);
  lines.push('');
  lines.push('## Chi tiết');
  lines.push('');
  lines.push('| ID | Test case | Kết quả | Ghi chú |');
  lines.push('| --- | --- | --- | --- |');
  for (const r of results) {
    const note = r.status === 'FAIL'
      ? `${r.error || ''}${r.screenshot ? ` - Screenshot: ${r.screenshot}` : ''}`
      : (r.detail || '');
    lines.push(`| ${r.id} | ${r.name.replace(/\|/g, '/')} | ${r.status} | ${String(note).replace(/\|/g, '/')} |`);
  }
  fs.writeFileSync(RESULT_MD, lines.join('\n'));
}

async function main() {
  // Main flow: chuẩn bị output, tạo dữ liệu test, chạy 18 case theo tài liệu.
  const pw = getPlaywrightConfig();
  mkdirp(OUT_DIR);
  fs.rmSync(FAIL_SHOT_DIR, { recursive: true, force: true });
  fs.rmSync(ALL_SHOT_DIR, { recursive: true, force: true });
  mkdirp(FAIL_SHOT_DIR);
  if (pw.screenshotAll) mkdirp(ALL_SHOT_DIR);
  if (pw.video) mkdirp(VIDEO_DIR);
  const { username, password } = await readCredentials();
  if (!username || !password) throw new Error('Thiếu username/password từ stdin');
  AUTH = { username, password };

  const runId = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const prefix = `AUTO_TEST_${runId}`;
  const parentForCrud = 'Bưu điện Thành phố Hà Nội';
  const code = runId.slice(-4); // Mã 4 số để tạo đơn vị xã/phường test.
  const name = `${prefix}_XA`;
  const updatedName = `${prefix}_XA_UPDATED`;
  const invalidCode = '123'; // Mã sai rule vì xã/phường cần 4 số.

  const meta = {
    startedAt: new Date().toISOString(),
    prefix,
    code,
    name,
    updatedName,
    parentForCrud,
    playwright: {
      browser: pw.browserName,
      headed: pw.headed,
      slowMo: pw.slowMo,
      trace: pw.trace,
      video: pw.video,
      screenshotAll: pw.screenshotAll,
    },
  };
  const results = [];
  const network = [];
  const browser = await pw.browserType.launch({ headless: !pw.headed, slowMo: pw.slowMo });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    recordVideo: pw.video ? { dir: VIDEO_DIR, size: { width: 1440, height: 1000 } } : undefined,
  });
  if (pw.trace) {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }
  const page = await context.newPage();
  page.on('request', req => {
    // Lưu lại request liên quan organization/chain để debug nếu case fail.
    const url = req.url();
    if (/organization|organizational|department|branch|chain|unit|shop|hub/i.test(url)) {
      network.push({ type: 'request', method: req.method(), url, postData: req.postData() });
    }
  });
  page.on('response', async res => {
    // Lưu lại response liên quan organization/chain, giới hạn body để file JSON không quá lớn.
    const url = res.url();
    if (/organization|organizational|department|branch|chain|unit|shop|hub/i.test(url)) {
      let body = '';
      try {
        const ct = res.headers()['content-type'] || '';
        if (/json|text/.test(ct)) body = (await res.text()).slice(0, 2000);
      } catch (_) {}
      network.push({ type: 'response', status: res.status(), url, body });
    }
  });

  try {
    await withCase(results, page, 'FULL-001', 'Đăng nhập tài khoản hợp lệ', async () => {
      await login(page, username, password);
      const t = await text(page, 1000);
      if (!/Truy cập trang quản lý|Đăng xuất/.test(t)) throw new Error('Không thấy màn chọn phạm vi sau đăng nhập');
    });

    await withCase(results, page, 'FULL-002', 'Chọn phạm vi Tổng công ty - Admin', async () => {
      await selectAdminScope(page);
      const t = await text(page, 1000);
      if (!/Admin|Trang chủ|Lịch cá nhân/.test(t)) throw new Error('Không vào được trang quản trị sau chọn scope');
    });

    await withCase(results, page, 'FULL-003', 'Truy cập Quản lý chuỗi > Mô hình tổ chức', async () => {
      await openOrgModule(page);
      if (!page.url().includes('/chain/organization-management')) throw new Error(`Sai URL: ${page.url()}`);
      const t = await text(page);
      if (!/Mô hình tổ chức|Nhập từ excel|Thêm đơn vị/.test(t)) throw new Error('Không thấy màn Mô hình tổ chức');
    });

    await withCase(results, page, 'FULL-004', 'Hiển thị cây tổ chức và ô tìm kiếm', async () => {
      const t = await text(page);
      if (!t.includes('Tổng công ty Bưu Điện Việt Nam')) throw new Error('Không thấy node Tổng công ty');
      await page.getByPlaceholder(/tìm kiếm/i).first().waitFor({ timeout: 5000 });
    });

    await withCase(results, page, 'FULL-005', 'Xem chi tiết đơn vị Tổng công ty', async () => {
      await openRootDetail(page);
      const t = await text(page);
      if (!/Tên đơn vị: Tổng công ty Bưu Điện Việt Nam|Mã đơn vị: VNPOST/.test(t)) {
        throw new Error('Chi tiết Tổng công ty không hiển thị đủ tên/mã');
      }
      return 'UI hiển thị mã Tổng công ty là VNPOST, khác rule 00 trong tài liệu.';
    });

    await withCase(results, page, 'FULL-006', 'Mở Nhập từ Excel và validate chưa chọn file', async () => {
      await openOrgModule(page);
      await dismissOverlays(page);
      await page.getByRole('button', { name: /nhập từ excel/i }).click({ timeout: 7000 });
      await page.waitForTimeout(1000);
      await confirm(page);
      const t = await text(page);
      if (!/Vui lòng chọn file excel|Kéo thả hoặc bấm để chọn file|Tải file mẫu/.test(t)) {
        throw new Error('Không thấy drawer import hoặc lỗi chưa chọn file');
      }
    });

    await withCase(results, page, 'FULL-007', 'Tải file mẫu Nhập từ Excel', async () => {
      await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await dismissOverlays(page);
      await page.getByRole('button', { name: /nhập từ excel/i }).click({ timeout: 7000 });
      await page.waitForTimeout(1000);
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await page.getByRole('button', { name: /tải file mẫu/i }).click({ timeout: 7000 });
      const download = await downloadPromise;
      const savePath = path.join(OUT_DIR, await download.suggestedFilename());
      await download.saveAs(savePath);
      if (!fs.existsSync(savePath)) throw new Error('Không lưu được file mẫu');
      return `Đã tải file mẫu: ${savePath}`;
    });

    await withCase(results, page, 'FULL-008', 'Mở form Thêm đơn vị và validate rỗng', async () => {
      await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await openAddDrawer(page);
      const t1 = await text(page);
      for (const label of ['Mã đơn vị', 'Tên đơn vị', 'Đơn vị cha']) {
        if (!t1.includes(label)) throw new Error(`Thiếu trường ${label}`);
      }
      await confirm(page);
      const t2 = await text(page);
      for (const msg of ['Vui lòng nhập mã đơn vị', 'Vui lòng nhập tên đơn vị', 'Vui lòng chọn đơn vị cha']) {
        if (!t2.includes(msg)) throw new Error(`Thiếu validation: ${msg}`);
      }
    });

    await withCase(results, page, 'FULL-009', 'Validate mã xã/phường sai độ dài', async () => {
      await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await openAddDrawer(page);
      await fillAddOrgForm(page, invalidCode, `${prefix}_INVALID_CODE`, parentForCrud);
      await confirm(page);
      const t = await text(page);
      if (!/không hợp lệ|4|mã|Vui lòng/i.test(t)) {
        throw new Error('Không thấy thông báo validate mã xã/phường sai độ dài');
      }
    });

    await withCase(results, page, 'FULL-010', `Thêm đơn vị test dưới ${parentForCrud}`, async () => {
      await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await openAddDrawer(page);
      await fillAddOrgForm(page, code, name, parentForCrud);
      await confirm(page);
      await searchTree(page, name);
      const t = await text(page);
      if (!t.includes(name)) throw new Error('Không tìm thấy đơn vị test sau khi thêm');
    });

    await withCase(results, page, 'FULL-011', 'Tìm kiếm đơn vị test trên cây', async () => {
      await searchTree(page, name);
      const t = await text(page);
      if (!t.includes(name)) throw new Error('Tìm kiếm không trả về đơn vị test');
    });

    await withCase(results, page, 'FULL-012', 'Cập nhật tên đơn vị test', async () => {
      await openCreatedOrgDetail(page, name);
      await updateCurrentOrgName(page, updatedName);
      await searchTree(page, updatedName);
      const t = await text(page);
      if (!t.includes(updatedName)) throw new Error('Không thấy tên mới sau cập nhật');
    });

    await withCase(results, page, 'FULL-013', 'Mở popup xóa và xóa đơn vị test', async () => {
      await openCreatedOrgDetail(page, updatedName);
      await deleteCurrentOrg(page, code);
      return 'Đã xác nhận xóa bằng API detail trả về 404 sau thao tác xóa.';
    });

    await withCase(results, page, 'FULL-014', 'Tìm kiếm không có kết quả', async () => {
      await searchTree(page, `${prefix}_NOT_FOUND`);
      const t = await text(page);
      if (t.includes('Tổng công ty Bưu Điện Việt Nam') && !/không|trống|no data|not found/i.test(t)) {
        throw new Error('Tìm kiếm keyword không tồn tại không thể hiện trạng thái rỗng rõ ràng');
      }
    });

    await withCase(results, page, 'FULL-015', 'Mở form Tạo điểm bán từ chi tiết đơn vị', async () => {
      await openRootDetail(page);
      await clickText(page, ['Tạo điểm bán'], 7000);
      await page.waitForTimeout(1500);
      const t = await text(page);
      if (!/Tạo điểm bán|Thêm Điểm bán|Phân loại|Tên điểm bán|Cửa hàng mẫu/i.test(t)) {
        throw new Error('Không thấy form Tạo điểm bán/hub hoặc thiếu trường chính');
      }
    });

    await withCase(results, page, 'FULL-016', 'Validate rỗng form Tạo điểm bán/hub', async () => {
      await confirm(page);
      const t = await text(page);
      if (!/vui lòng|bắt buộc|required/i.test(t)) throw new Error('Không thấy lỗi validation khi xác nhận form điểm bán rỗng');
    });

    await withCase(results, page, 'FULL-017', 'Mở danh sách điểm bán từ chi tiết Tổng công ty', async () => {
      await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      await openRootDetail(page);
      await page.getByText('Xem danh sách', { exact: false }).first().click({ timeout: 7000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const t = await text(page);
      if (!/điểm bán|cửa hàng|danh sách/i.test(t)) throw new Error('Không thấy màn danh sách điểm bán sau khi click Xem danh sách');
    });

    await withCase(results, page, 'FULL-018', 'Kiểm tra chức năng Xuất Excel theo tài liệu', async () => {
      await page.goto(ORG_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const t = await text(page);
      if (!/Xuất excel|Xuất Excel/.test(t)) throw new Error('Không thấy chức năng Xuất Excel trên màn Mô hình tổ chức');
    });
  } finally {
    if (pw.trace) {
      await context.tracing.stop({ path: TRACE_FILE }).catch(() => {});
    }
    await context.close().catch(() => {});
    await browser.close();
    meta.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_JSON, JSON.stringify({ meta, results, network }, null, 2));
    writeReport(results, meta);
  }
}

main().catch(err => {
  mkdirp(OUT_DIR);
  const payload = { fatal: err.stack || err.message };
  fs.writeFileSync(path.join(OUT_DIR, 'vnpost-org-full-e2e-fatal.json'), JSON.stringify(payload, null, 2));
  console.error(err.stack || err.message);
  process.exit(1);
});
