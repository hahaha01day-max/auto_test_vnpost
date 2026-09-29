const { defineConfig, devices } = require('@playwright/test');
const { qcXoaGrepInvert } = require('../shared/qc-xoa');
const path = require('node:path');
const { BASE_URL } = require('../shared/vnpost-config');
const { storageStateFor } = require('../shared/auth/accounts');

const DOC_ROOT = __dirname;

/**
 * 01 — Quản lý điểm bán. Mã phân hệ lấy theo `resource/hdsd/hdsd01_quan_ly_diem_ban/`.
 *
 * 🔴 Phân hệ này có case về PHẠM VI DỮ LIỆU (vai Tỉnh chỉ thấy điểm bán tỉnh mình) và về
 * QUYỀN (cột Hành động chỉ hiện icon theo quyền). Chạy tất cả bằng một tài khoản là **pass giả**:
 * tài khoản TCT thấy toàn chuỗi nên case phạm vi luôn xanh mà chẳng kiểm được gì.
 * Mỗi vai một project, một storageState riêng — 🚫 không gộp.
 *
 * Quy ước tên file: `<ten>.<vai>.spec.js`.
 */
module.exports = defineConfig({
	testDir: path.join(DOC_ROOT, 'tests'),
	// Case QC đã xoá (cột `Trang thai QC` = QC_XOA) — loại khỏi lượt chạy, spec giữ nguyên.
	grepInvert: qcXoaGrepInvert(DOC_ROOT),
	// 🔴 300s: case tạo điểm bán phải chờ `POST /shops/profile` — đo thực tế 120,6s cho một lần gọi.
	timeout: 300_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	forbidOnly: false,
	retries: 0,
	workers: 1,
	outputDir: path.join(DOC_ROOT, 'test-output/playwright-results'),
	reporter: [
		['list'],
		['html', { outputFolder: path.join(DOC_ROOT, 'test-output/playwright-report'), open: 'never' }],
		['json', { outputFile: path.join(DOC_ROOT, 'test-output/playwright-results/results.json') }],
	],
	use: {
		baseURL: BASE_URL,
		viewport: { width: 1440, height: 1000 },
		actionTimeout: 15_000,
		navigationTimeout: 60_000,
		screenshot: 'only-on-failure',
		// 🔴 `video: 'on'` quay MỌI test kể cả case xanh: tốn vài giây mỗi case và đầy đĩa.
		//    Case đỏ mới cần xem lại ⇒ chỉ giữ video của case đỏ.
		video: 'retain-on-failure',
		trace: 'retain-on-failure',
	},
	projects: [
		{
			// 🔴 Phân hệ 01 chỉ dùng 3 vai: tct · province · shop. Setup mặc định đăng nhập cả 6 vai
			//    khai trong `.env`, tốn ~20s mỗi lần chạy và là nguồn flaky (rớt ở vai không ai dùng
			//    vẫn làm đỏ cả lượt chạy). `VNPOST_SETUP_ROLES` giới hạn đúng vai cần.
			name: 'setup',
			testDir: path.join(DOC_ROOT, '..', 'shared', 'auth'),
			testMatch: /roles\.setup\.js/,
			use: { ...devices['Desktop Chrome'] },
		},
		{
			name: 'tct',
			dependencies: ['setup'],
			testMatch: /.*\.tct\.spec\.js/,
			use: { ...devices['Desktop Chrome'], storageState: storageStateFor('tct') },
		},
		{
			name: 'province',
			dependencies: ['setup'],
			testMatch: /.*\.province\.spec\.js/,
			use: { ...devices['Desktop Chrome'], storageState: storageStateFor('province') },
		},
		{
			// Vai điểm bán — dùng cho case kiểm quyền: không có `update_shop` thì không thấy icon Sửa.
			name: 'shop',
			dependencies: ['setup'],
			testMatch: /.*\.shop\.spec\.js/,
			use: { ...devices['Desktop Chrome'], storageState: storageStateFor('shop') },
		},
	],
});
