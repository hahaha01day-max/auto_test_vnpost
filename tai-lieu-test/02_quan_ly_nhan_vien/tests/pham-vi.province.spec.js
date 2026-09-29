'use strict';

/**
 * Task 010 — phần chạy bằng vai **Bưu điện Tỉnh** (`province`).
 *
 * 🔴 Ba case này 🚫 KHÔNG được chạy bằng `tct`: tài khoản Tổng công ty thấy toàn mạng lưới nên
 * case phạm vi dữ liệu sẽ luôn xanh trong khi chẳng kiểm được gì — đúng loại "pass giả".
 *
 * 🔴 `02_010_027` VÀ `02_010_028` đều đã chuyển sang `quyen-nut.province_manager.spec.js`. Lý do đo
 * được ngày 22/09: vai `province` ở đây **bị 401** ở chính API danh sách nhân viên (xem
 * `02_010_029`), nên quyền trong token 🚫 không khớp `TBL_ROLE_FUNCTION` và mọi nút đều biến mất —
 * kiểm quyền bằng vai này là đọc nhầm một lỗi phân quyền thành "nút ẩn đúng thiết kế".
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

/** 🔴 `test-input.json` nằm ở GỐC phân hệ, không phải trong `tests/`. */
const GOC = path.join(__dirname, '..');
const { missingRoleReason } = require('../../shared/auth/accounts');
const { boQua, chuan, dong, laApiDanhSach, oLoc, tongSo } = require('./employee-page');
const { moTrang } = require('../../shared/auth/login');

const VAI = 'province';
const chanNeuTat = (id) => {
	const thieuVai = missingRoleReason(VAI);
	test.skip(Boolean(thieuVai), thieuVai ?? '');
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

test.describe('02 · 010 — Phạm vi và quyền, vai Bưu điện Tỉnh', () => {
	test('02_010_029 — Phạm vi dữ liệu theo vai: cấp tỉnh chỉ thấy nhân viên thuộc tỉnh mình', async ({
		page,
	}) => {
		chanNeuTat('02_010_029');

		// 🔴 🚫 KHÔNG dùng `moDanhSach` ở đây: helper đó đòi có response 200, mà chính việc vai này
		//    có gọi nổi API hay không LÀ phép kiểm. Thu hết mã trạng thái rồi kết luận.
		const maTrangThai = [];
		page.on('response', (r) => {
			if (laApiDanhSach(r)) maTrangThai.push(r.status());
		});
		await moTrang(page, '/employee/list', VAI);
		await page.waitForTimeout(12_000);

		expect(maTrangThai.length, 'Vai tỉnh không gọi API danh sách nhân viên lần nào').toBeGreaterThan(
			0,
		);
		// 🔴 401 lặp lại ở MỌI lần gọi (không phải một lần rồi tự làm mới phiên) nghĩa là vai này
		//    không được phép đọc danh sách — và FE 🚫 không báo gì, màn chỉ rỗng.
		expect(
			maTrangThai.includes(200),
			`API danh sách nhân viên trả ${maTrangThai.join(', ')} cho vai ${VAI} — ` +
				'màn rỗng im lặng, không thông báo nào cho người dùng. Đây là phát hiện phân quyền, ' +
				'🚫 không phải lỗi script: mọi API khác của vai này đều 200.',
		).toBe(true);

		const tong = await tongSo(page);
		expect(tong, 'Không đọc được tổng số nhân viên ở tiêu đề bảng').not.toBeNull();

		// 🔴 Cây tổ chức phải bị bó trong phạm vi tỉnh. Thiếu filter phạm vi thì backend trả TOÀN BỘ
		//    pod (KHÔNG phải rỗng) — đó chính là lỗi cần bắt, nên assert vào nội dung cây.
		await oLoc(page, 0).click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nut = (await dd.locator('.ant-select-tree-node-content-wrapper').allInnerTexts()).map(
			chuan,
		);
		await page.keyboard.press('Escape');

		expect(nut.length, 'Cây tổ chức của vai tỉnh rỗng — không kiểm được phạm vi').toBeGreaterThan(
			0,
		);
		expect(
			nut.some((n) => /Tong cong ty/i.test(n)),
			`Vai tỉnh thấy cả cấp Tổng công ty trong cây tổ chức: ${nut.join(' · ')}`,
		).toBe(false);

		const so = await dong(page).count();
		if (so === 0) {
			boQua(test, 'Tỉnh của tài khoản này chưa có nhân viên nào — không đối chiếu được phạm vi.');
		}

		// Mọi nhân viên trả về phải có ít nhất một phân công nằm trong phạm vi tỉnh.
		const kiem = Math.min(so, 3);
		for (let i = 0; i < kiem; i += 1) {
			await dong(page).nth(i).locator('.ant-table-row-expand-icon').click();
			await page.waitForTimeout(1_000);
		}
		const donVi = (
			await page
				.locator('.ant-table-expanded-row .ant-table-tbody tr.ant-table-row td:nth-child(2)')
				.allInnerTexts()
		).map(chuan);
		expect(donVi.length, 'Không đọc được cột Chi nhánh làm việc ở hàng mở rộng').toBeGreaterThan(0);
		for (const d of donVi) {
			expect(d, 'Nhân viên ngoài phạm vi tỉnh lọt vào danh sách').not.toBe('');
		}
	});
});
