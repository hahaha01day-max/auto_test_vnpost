'use strict';

/**
 * Phân hệ 04_2 — Tồn kho đầu kỳ, vai **điểm bán** (`shop`).
 *
 * 🔴 Ranh giới an toàn: `POST /opening-balance/previews/{id}/confirm` **cộng hàng vào tồn kho thật**
 * và mỗi sản phẩm/biến thể chỉ khai được **một lần tại một kho** ⇒ 🚫 không có case nào ở đây được phép chạm tới nó.
 * Mọi test bọc `chanGhiTon()` — nạp file để dựng bản xem trước thì được, `confirm` thì chặn cứng.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const {
	API_PREVIEWS,
	API_UPLOAD,
	COT_DANH_SACH,
	TRANG_THAI_LUOT,
	boQua,
	chanGhiTon,
	chanMoiGhi,
	chuan,
	cot,
	dong,
	khung,
	moMan,
	oTim,
} = require('./opening-page');
const { doc: soSeed } = require('../../00_seed/seed-state');
const {
	docTieuDe,
	moDrawerKhaiBao,
	taiTepMau,
	taoFileRong,
	taoFileSaiDinhDang,
	themMotDong,
	themNhieuDong,
	huyXemTruocDangDo,
} = require('./excel-fixture');

/**
 * 🔴 Chạy trên **điểm bán seed** (vai `seed_shop2` = Cửa hàng trưởng điểm bán seed), 🚫 KHÔNG phải
 *    điểm bán thật của vai `shop`. Hai lý do, cái nào cũng đủ để đổi:
 *    1. Điểm bán còn **bản xem trước chưa xác nhận** thì drawer mở thẳng vào bước xem trước
 *       (`getInitialStep` trong `DrawerOpeningBalance.jsx`), **bước 1 (tải mẫu / chọn tệp) biến mất**
 *       và mọi case upload đỏ với "click timeout" chẳng liên quan gì tới điều nó kiểm. Điểm bán đã
 *       khai tồn đầu kỳ thì vẫn khai tiếp được — backend chỉ chặn sản phẩm/biến thể đã khai.
 *    2. Nạp tệp là **ghi tồn kho thật** — 🚫 không làm trên điểm bán vận hành.
 */
const VAI = 'seed_shop2';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

/** Mở drawer khai báo và nạp một tệp; trả về response của `uploads`. */
async function napFile(page, duongDan) {
	const dr = await moDrawerKhaiBao(page);
	await expect(dr, 'Không mở được drawer khai báo tồn đầu kỳ').toBeVisible({ timeout: 20_000 });

	let o = dr.locator('input[type="file"]').first();
	if ((await o.count()) === 0) await huyXemTruocDangDo(page, dr);
	o = dr.locator('input[type="file"]').first();
	if ((await o.count()) === 0) {
		boQua(test, 'Drawer khai báo không có ô chọn tệp — có thể điểm bán đã khai báo xong.');
	}

	const cho = page.waitForResponse((r) => r.url().includes(API_UPLOAD), { timeout: 90_000 });
	await o.setInputFiles(duongDan);
	const res = await cho.catch(() => null);
	await page.waitForTimeout(2_500);
	return { dr, res };
}

test.describe('04_2 — Tồn kho đầu kỳ, vai điểm bán', () => {
	test.beforeEach(async ({ page }) => {
		await chanGhiTon(page);
		await moMan(page, VAI);
	});

	test('04_2_010_001 — Màn Nhập tồn kho đầu kỳ mở được và hiện danh sách lượt khai báo', async ({
		page,
	}) => {
		chanNeuTat('04_2_010_001');

		const noi = chuan(await khung(page).innerText());
		expect(noi, 'Không thấy thẻ danh sách lượt khai báo').toContain(
			'Danh sách lượt khai báo tồn kho đầu kỳ',
		);
		await expect(oTim(page), 'Thiếu ô tìm theo mã preview / tên file / ghi chú').toBeVisible();
		// 🔴 Ô "Lọc theo Kho / Điểm bán" CHỈ hiện với vai nhiều đơn vị (tỉnh / TCT). Vai điểm bán
		//    chỉ có một kho nên màn không render nó — kiểm ô đó ở `04_2_030_001` (vai province).
		expect(noi, 'Thiếu bộ lọc trạng thái lượt khai báo').toContain('Tất cả trạng thái');
	});

	test('04_2_010_002 — Tải được tệp mẫu Excel khai báo tồn đầu kỳ', async ({ page }) => {
		chanNeuTat('04_2_010_002');

		// 🔴 Ghi nhận trước: nút "Tải mẫu excel" ở vùng extra KHÔNG tải gì, chỉ mở drawer
		//    (`OpeningBalancePage.jsx:592` — cùng handler với nút "Khai báo tồn đầu kỳ").
		const goiTemplate = [];
		page.on('request', (r) => {
			if (r.url().includes('/opening-balance/template')) goiTemplate.push(r.url());
		});
		await page.getByRole('button', { name: 'Tải mẫu excel' }).first().click({ force: true });
		await page.waitForTimeout(3_000);
		test.info().annotations.push({
			type: 'nhãn nút gây hiểu nhầm',
			description:
				goiTemplate.length === 0
					? 'Nút "Tải mẫu excel" ngoài màn chỉ mở drawer, KHÔNG gọi API tệp mẫu.'
					: 'Nút ngoài màn có gọi API tệp mẫu.',
		});

		// 🔴 Bước 1 (nút tải mẫu) chỉ có khi điểm bán CHƯA có bản xem trước dở. Có bản dở thì
		//    drawer mở thẳng vào bước sau ⇒ skip kèm lý do, 🚫 không báo đỏ oan cho sản phẩm.
		let tep;
		try {
			tep = await taiTepMau(page);
		} catch (loi) {
			boQua(
				test,
				`${loi.message} — dọn lượt khai báo đang ở trạng thái "Chờ xác nhận" của điểm bán rồi chạy lại.`,
			);
		}
		const { tieuDe } = await docTieuDe(tep);
		expect(tieuDe.length, `Tệp mẫu không đọc được tiêu đề cột: ${tep}`).toBeGreaterThan(5);

		const gom = tieuDe.join(' | ').toLowerCase();
		for (const c of ['sku', 'số lượng', 'giá vốn', 'đơn vị']) {
			expect(gom, `Tệp mẫu thiếu cột "${c}"`).toContain(c);
		}
		// 🔴 Ghi lại tiêu đề THẬT để đối chiếu với tài liệu — tài liệu khai 11 cột.
		test.info().annotations.push({ type: 'cột tệp mẫu', description: tieuDe.join(' · ') });
	});

	test('04_2_030_005 — Sáu trạng thái lượt khai báo trong bộ lọc', async ({ page }) => {
		chanNeuTat('04_2_030_005');

		const o = khung(page)
			.locator('.ant-select')
			.filter({ hasText: /trạng thái/i })
			.first();
		if ((await o.count()) === 0) {
			boQua(test, 'Không thấy ô lọc trạng thái trên màn — cần probe lại.');
		}
		await o.click();
		const dd = page.locator('.ant-select-dropdown').last();
		await dd.waitFor({ state: 'visible', timeout: 15_000 });
		const nhan = (await dd.locator('.ant-select-item-option-content').allInnerTexts()).map(chuan);
		await page.keyboard.press('Escape');

		expect(nhan, `Bộ lọc đang có: ${nhan.join(' · ')}`).toEqual(TRANG_THAI_LUOT);
	});

	test('04_2_030_006 — Bảng danh sách lượt khai báo có đủ 11 cột', async ({ page }) => {
		chanNeuTat('04_2_030_006');

		const ten = (await cot(page).allInnerTexts()).map(chuan).filter((t) => t !== '');
		expect(ten).toEqual(COT_DANH_SACH);
	});

	test('04_2_020_015 — Upload file sai định dạng', async ({ page }) => {
		chanNeuTat('04_2_020_015');
		const { daGoi } = await chanMoiGhi(page);

		const dr = await moDrawerKhaiBao(page);
		const o = dr.locator('input[type="file"]').first();
		if ((await o.count()) === 0) boQua(test, 'Drawer không có ô chọn tệp.');
		expect(
			await o.getAttribute('accept'),
			'Ô chọn tệp không khai `accept` — hộp chọn file của trình duyệt cũng không lọc',
		).toContain('.xlsx');

		await o.setInputFiles(taoFileSaiDinhDang());
		await page.waitForTimeout(4_000);

		// 🔴 `accept` CHỈ lọc hộp chọn file của trình duyệt; kéo–thả và `setInputFiles` đều đi vòng
		//    qua nó. Phép chặn thật phải nằm ở `beforeUpload`. Đo 20/09/2026: tệp `.txt` VẪN được
		//    gửi lên `POST /opening-balance/uploads` (request bị auto test chặn lại nên 🚫 không
		//    có lượt khai báo rác nào được tạo). Đây là phát hiện về sản phẩm — 🚫 không sửa test
		//    cho khớp.
		const napTep = daGoi.filter((u) => u.includes(API_UPLOAD));
		expect(
			napTep,
			`File .txt vẫn được gửi lên server ${napTep.length} lần — \`beforeUpload\` không chặn ` +
				`định dạng. Thông báo trên màn: "${chuan((await page.locator('.ant-message').allInnerTexts()).join(' | ')) || '(không có)'}"`,
		).toEqual([]);
	});

	test('04_2_020_016 — Upload file Excel rỗng', async ({ page }) => {
		chanNeuTat('04_2_020_016');

		const mau = await taiTepMau(page);
		const rong = await taoFileRong(mau);
		const { dr, res } = await napFile(page, rong);

		if (res) expect(res.status(), 'Nạp tệp rỗng làm API đổ lỗi').toBeLessThan(500);
		const noi = chuan(await dr.innerText());
		// Bảng xem trước rỗng, 🚫 không có dòng rác nào.
		expect(
			await dr.locator('.ant-table-tbody tr.ant-table-row').count(),
			`Tệp rỗng mà bản xem trước vẫn có dòng. Nội dung drawer: ${noi.slice(0, 200)}`,
		).toBe(0);
	});

	test('04_2_020_010 — Upload SKU không tồn tại', async ({ page }) => {
		const i = chanNeuTat('04_2_020_010');

		const mau = await taiTepMau(page);
		const { duongDan } = await themMotDong(
			mau,
			{ SKU: 'ZZZ-KHONG-TON-TAI-999', 'Số lượng': 1, 'Giá vốn': 1000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-sku-sai.xlsx',
		);
		const { dr } = await napFile(page, duongDan);

		const noi = chuan(await dr.innerText());
		expect(
			/lỗi/i.test(noi),
			`Dòng SKU không tồn tại KHÔNG bị đánh lỗi. Nội dung bản xem trước: ${noi.slice(0, 300)}`,
		).toBe(true);
		void i;
	});

	test('04_2_020_017 — Tìm kiếm trong bản xem trước theo SKU, tên và mã lô', async ({ page }) => {
		chanNeuTat('04_2_020_017');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		test.setTimeout(240_000);
		const { dr } = await napNhieuDong(page, 'ton-dau-ky-tim.xlsx');
		const truoc = await tongHop(dr);
		const tenSP = soSeed().duLieu?.sanPham?.tenSanPham || '';

		const theoSku = await timXemTruoc(page, dr, 'ZZZ-AUTO-07');
		expect(theoSku.length, `Tìm theo SKU ra ${theoSku.length} dòng`).toBe(1);
		expect(theoSku[0]).toContain('ZZZ-AUTO-07');

		if (tenSP) {
			const theoTen = await timXemTruoc(page, dr, tenSP.slice(0, 10));
			expect(theoTen.length, `Tìm theo một phần tên "${tenSP.slice(0, 10)}" không ra dòng nào`).toBeGreaterThan(0);
			for (const d of theoTen) expect(d, 'Tìm theo tên ra dòng không chứa tên đó').toContain(tenSP.slice(0, 10));
		}

		const theoLo = await timXemTruoc(page, dr, LO_TIM);
		expect(theoLo.length, `Tìm theo mã lô ${LO_TIM} ra ${theoLo.length} dòng`).toBe(1);
		expect(theoLo[0]).toContain(LO_TIM);

		const rong = await timXemTruoc(page, dr, 'KHONGTONTAI-ZZZ-999');
		expect(rong, 'Từ khoá không tồn tại mà bảng vẫn có dòng').toEqual([]);

		// Ô tổng hợp tính trên TOÀN bản xem trước ⇒ không đổi theo bộ tìm (ghi rõ hành vi thật).
		expect(await tongHop(dr), 'Ô tổng hợp đổi theo bộ tìm').toEqual(truoc);
	});

	test('04_2_020_021 — Phân trang bản xem trước', async ({ page }) => {
		chanNeuTat('04_2_020_021');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		test.setTimeout(240_000);
		// Giữ khối `page` của response danh sách dòng gần nhất — bằng chứng khi phân trang hỏng.
		let pageApi = null;
		page.on('response', async (r) => {
			if (!/\/previews\/[^/]+\/items/.test(r.url()) || r.request().method() !== 'GET') return;
			const b = await r.json().catch(() => null);
			if (b) pageApi = b.page ?? b.data?.page ?? null;
		});
		const { dr } = await napNhieuDong(page, 'ton-dau-ky-trang.xlsx');
		const truoc = await tongHop(dr);
		const phanTrang = dr.locator('.ant-pagination').last();

		const trang1 = (await dongXT(dr).allInnerTexts()).map(chuan);
		expect(trang1.length, 'Trang 1 không đủ 20 dòng').toBe(20);
		// 🔴 25 dòng, 20 dòng/trang ⇒ PHẢI có trang 2. Không có là người dùng không xem được dòng 21–25.
		await expect(
			phanTrang.locator('.ant-pagination-item-2'),
			`Bản xem trước 25 dòng mà không có trang 2. Khối page của API: ${JSON.stringify(pageApi)} — ` +
				'FE đọc `pageInfo.totalElements`; backend trả snake_case thì total = 0.',
		).toBeVisible({ timeout: 10_000 });

		let cho = page.waitForResponse((r) => /\/previews\/[^/]+\/items/.test(r.url()), { timeout: 30_000 });
		await phanTrang.locator('.ant-pagination-item-2').click();
		await cho;
		await page.waitForTimeout(500);
		const trang2 = (await dongXT(dr).allInnerTexts()).map(chuan);
		expect(trang2.length, 'Trang 2 không đúng 5 dòng còn lại').toBe(5);
		const lap = trang2.filter((d) => trang1.includes(d));
		expect(lap, 'Trang 2 lặp lại dòng của trang 1').toEqual([]);

		// Đổi số dòng mỗi trang (showSizeChanger) → 50 ⇒ một trang chứa đủ 25 dòng.
		await phanTrang.locator('.ant-pagination-options .ant-select').click();
		cho = page.waitForResponse((r) => /\/previews\/[^/]+\/items/.test(r.url()), { timeout: 30_000 });
		await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: /^50/ }).click();
		await cho;
		await page.waitForTimeout(500);
		expect(await dongXT(dr).count(), 'Đổi 50 dòng/trang mà không hiện đủ 25 dòng').toBe(25);
		expect(await tongHop(dr), 'Ô tổng hợp đổi khi đổi trang').toEqual(truoc);
	});

	test('04_2_020_024 — Còn dòng lỗi thì không tạo được phiếu', async ({ page }) => {
		chanNeuTat('04_2_020_024');
		const { daGoi } = await chanGhiTon(page);

		const mau = await taiTepMau(page);
		const { duongDan } = await themMotDong(
			mau,
			{ SKU: 'ZZZ-KHONG-TON-TAI-999', 'Số lượng': 1, 'Giá vốn': 1000 },
			'ton-dau-ky-co-loi.xlsx',
		);
		const { dr } = await napFile(page, duongDan);

		const nutTao = dr.getByRole('button', { name: /Tạo phiếu|Xác nhận tạo/ }).last();
		if ((await nutTao.count()) === 0) {
			boQua(test, 'Không thấy nút tạo phiếu trong drawer — có thể bản xem trước chưa sẵn sàng.');
		}

		// 🔴 Hai cách sản phẩm có thể chặn, đều hợp lệ về nghiệp vụ — ghi rõ cách nào đang dùng,
		//    🚫 đừng ép một cách rồi báo đỏ oan.
		const nutBiKhoa = await nutTao.isDisabled();
		let thongBao = '';
		if (!nutBiKhoa) {
			await nutTao.click({ force: true });
			await page.waitForTimeout(2_500);
			thongBao = [
				...(await page.locator('.ant-message').allInnerTexts()),
				chuan(await dr.innerText()),
			].join(' | ');
			expect(
				/Còn \d+ dòng lỗi/.test(thongBao),
				'Không thấy cảnh báo theo khuôn "Còn <N> dòng lỗi. Vui lòng xóa hoặc sửa lại file." — ' +
					`thông báo thật: ${thongBao.slice(0, 250)}`,
			).toBe(true);
		}

		test.info().annotations.push({
			type: 'cách sản phẩm chặn',
			description: nutBiKhoa
				? 'Nút tạo phiếu bị VÔ HIỆU khi còn dòng lỗi.'
				: `Nút bấm được, chặn bằng thông báo: ${thongBao.slice(0, 160)}`,
		});
		// 🔴 Điều kiện cứng, đúng cho cả hai cách: 🚫 KHÔNG được gửi request tạo phiếu.
		expect(daGoi, '🔴 Còn dòng lỗi mà vẫn gửi request tạo phiếu (ghi vào tồn kho thật)').toEqual([]);
	});

	test('04_2_020_026 — Huỷ hộp thoại xác nhận tạo phiếu thì không ghi gì', async ({ page }) => {
		chanNeuTat('04_2_020_026');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		const { daGoi } = await chanGhiTon(page);
		const { dr } = await napMotDong(
			page,
			{ SKU: SKU_SEED, 'Số lượng': 1, 'Giá vốn': 10_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-huy-tao-phieu.xlsx',
		);
		expect(await oTongHop(dr, 'Lỗi'), 'Tệp một dòng hợp lệ mà vẫn có dòng lỗi').toBe(0);

		const nut = dr.getByRole('button', { name: 'Tạo phiếu nhập kho đầu kỳ' });
		await expect(nut, 'Bản xem trước hợp lệ mà nút tạo phiếu bị khoá').toBeEnabled({ timeout: 30_000 });
		await nut.click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Xác nhận tạo phiếu nhập tồn đầu kỳ?' });
		await expect(hop, 'Không hiện hộp thoại xác nhận tạo phiếu').toBeVisible({ timeout: 15_000 });
		await hop.getByRole('button', { name: /Huỷ|Hủy|Cancel/ }).click();
		await expect(hop).toHaveCount(0);
		await page.waitForTimeout(1_500);

		expect(daGoi, 'Bấm Huỷ mà vẫn gửi request tạo phiếu').toEqual([]);
		// Lượt vẫn ở bước xem trước chờ xác nhận: nút tạo phiếu còn nguyên, chưa sang bước hoàn tất.
		await expect(nut, 'Huỷ xong mà drawer rời bước xem trước').toBeVisible();
		expect(chuan(await page.locator('.ant-message').allInnerTexts().then((x) => x.join(' ')))).not.toContain('Đã tạo phiếu');
	});

	// ── Case đang tắt / ghi dữ liệu ───────────────────────────────────────────────────────────────
	/**
	 * 🔴 Bảy case dưới đây đều **nạp một tệp Excel dựng từ chính tệp mẫu của sản phẩm** rồi đọc bản
	 *    xem trước. Chúng dừng ở bước xem trước, 🚫 KHÔNG bấm "Tạo phiếu" — `confirm` mới là chỗ
	 *    cộng hàng vào tồn kho thật, và sản phẩm/biến thể đã confirm thì 🚫 khai lại được ở kho đó.
	 *
	 * 🔴 Năm ô tổng hợp của drawer (đo `DrawerOpeningBalance.jsx`): **Tổng dòng · Hợp lệ · Lỗi ·
	 *    Tổng SL · Tổng giá trị**. Lý do từng dòng bị loại nằm ở cột **Ghi chú** (`warningMessage`),
	 *    🚫 đừng suy từ con số ở ô "Lỗi" — nó chỉ đếm, 🚫 không nói vì sao.
	 */
	const SKU_SEED = soSeed().duLieu?.sanPham?.sku || '';
	const SKU_SERIAL = soSeed().duLieu?.sanPham?.sanPhamTheoGiaVon?.dichDanh?.sku || '';

	/** Nạp một tệp có đúng một dòng dữ liệu rồi trả về drawer + chữ của bản xem trước. */
	async function napMotDong(page, giaTri, tenFile) {
		const mau = await taiTepMau(page);
		const { duongDan } = await themMotDong(mau, giaTri, tenFile);
		const { dr } = await napFile(page, duongDan);
		return { dr, noi: chuan(await dr.innerText()) };
	}

	/** Giá trị của một ô tổng hợp theo nhãn ("Tổng dòng" · "Hợp lệ" · "Lỗi" · …). */
	async function oTongHop(dr, nhan) {
		const o = dr.getByText(nhan, { exact: true }).first();
		await expect(o, `Drawer thiếu ô tổng hợp "${nhan}"`).toBeVisible({ timeout: 20_000 });
		const giaTri = await o.locator('xpath=following-sibling::*[1]').innerText();
		return Number(chuan(giaTri).replace(/[^\d-]/g, '') || 0);
	}

	/**
	 * Bản xem trước NHIỀU DÒNG: 1 dòng hợp lệ (SKU seed, mã lô riêng) + 24 dòng Lỗi (SKU không tồn
	 * tại `ZZZ-AUTO-NN`) ⇒ 25 dòng, hơn một trang (mặc định 20 dòng/trang). Chỉ dựng bản xem trước,
	 * 🚫 không tạo phiếu (`chanGhiTon` chặn `confirm`).
	 */
	const LO_TIM = 'AUTOLOTIM01';
	async function napNhieuDong(page, tenFile) {
		const mau = await taiTepMau(page);
		const ds = [{ SKU: SKU_SEED, 'Số lượng': 2, 'Giá vốn': 10_000, 'Đơn vị': 'Cái', 'Mã lô': LO_TIM }];
		for (let k = 1; k <= 24; k += 1) {
			ds.push({ SKU: `ZZZ-AUTO-${String(k).padStart(2, '0')}`, 'Số lượng': 1, 'Giá vốn': 1_000, 'Đơn vị': 'Cái' });
		}
		const { duongDan } = await themNhieuDong(mau, ds, tenFile);
		const { dr, res } = await napFile(page, duongDan);
		await expect
			.poll(async () => oTongHop(dr, 'Tổng dòng'), { timeout: 90_000, message: 'Bản xem trước không xử lý xong 25 dòng' })
			.toBe(25);
		return { dr, res };
	}
	const dongXT = (dr) => dr.locator('.ant-table-tbody tr.ant-table-row');
	/** Gõ vào ô tìm của bản xem trước rồi chờ đúng request nạp lại danh sách dòng. */
	async function timXemTruoc(page, dr, tu) {
		const cho = page.waitForResponse((r) => /\/previews\/[^/]+\/items/.test(r.url()) && r.request().method() === 'GET', { timeout: 30_000 });
		const o = dr.locator('input[placeholder="Tìm theo SKU / tên / mã lô"]');
		await o.fill(tu);
		await o.press('Enter');
		await cho;
		await page.waitForTimeout(500);
		return (await dongXT(dr).allInnerTexts()).map(chuan);
	}
	const tongHop = async (dr) => ({
		tong: await oTongHop(dr, 'Tổng dòng'),
		hopLe: await oTongHop(dr, 'Hợp lệ'),
		loi: await oTongHop(dr, 'Lỗi'),
	});

	test('04_2_020_001 — Đọc tệp Excel hợp lệ và hiện năm ô tổng hợp', async ({ page }) => {
		chanNeuTat('04_2_020_001');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku` — chạy bộ seed 00_seed bước 4 trước.');
		const { dr } = await napMotDong(
			page,
			{ SKU: SKU_SEED, 'Số lượng': 5, 'Giá vốn': 50_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-hop-le.xlsx',
		);

		for (const nhan of ['Tổng dòng', 'Hợp lệ', 'Lỗi', 'Tổng SL', 'Tổng giá trị']) {
			await expect(dr.getByText(nhan, { exact: true }).first(), `Thiếu ô "${nhan}"`).toBeVisible();
		}
		expect(await oTongHop(dr, 'Tổng dòng'), 'Tệp một dòng mà "Tổng dòng" 🚫 không bằng 1').toBe(1);
		expect(
			await oTongHop(dr, 'Hợp lệ'),
			`Dòng SKU hợp lệ "${SKU_SEED}" 🚫 không được tính là hợp lệ. Bản xem trước: `
				+ `${chuan(await dr.innerText()).slice(0, 300)}`,
		).toBe(1);
		expect(await oTongHop(dr, 'Lỗi'), 'Tệp hợp lệ mà vẫn đếm dòng lỗi').toBe(0);
		expect(await oTongHop(dr, 'Tổng SL'), 'Tổng SL 🚫 không bằng số lượng đã khai').toBe(5);
	});

	test('04_2_020_002 — Bảng xem trước hiện đủ cột và trạng thái từng dòng', async ({ page }) => {
		chanNeuTat('04_2_020_002');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		const { dr } = await napMotDong(
			page,
			{ SKU: SKU_SEED, 'Số lượng': 3, 'Giá vốn': 40_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-xem-cot.xlsx',
		);

		// Cột bảng xem trước — đo `DrawerOpeningBalance.jsx`.
		for (const ten of [
			'Dòng',
			'Điểm bán / kho',
			'Tên sản phẩm',
			'Đơn vị',
			'Mã lô',
			'Số lượng',
			'Giá vốn',
			'Thành tiền',
			'Trạng thái',
			'Ghi chú',
		]) {
			await expect(
				dr.locator('.ant-table-thead th', { hasText: new RegExp(`^${ten}$`) }).first(),
				`Bảng xem trước thiếu cột "${ten}"`,
			).toBeVisible({ timeout: 20_000 });
		}
		const dongXemTruoc = dr.locator('.ant-table-tbody tr.ant-table-row');
		expect(await dongXemTruoc.count(), 'Bản xem trước 🚫 không có dòng nào').toBeGreaterThan(0);
		// Mỗi dòng phải mang một Tag trạng thái — 🚫 không được để trống.
		expect(
			await dongXemTruoc.first().locator('.ant-tag').count(),
			'Dòng xem trước 🚫 không có Tag trạng thái',
		).toBeGreaterThan(0);
	});

	test('04_2_020_003 — Dòng thiếu SKU bị đánh Lỗi kèm lý do', async ({ page }) => {
		chanNeuTat('04_2_020_003');
		const { dr, noi } = await napMotDong(
			page,
			{ 'Số lượng': 2, 'Giá vốn': 30_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-thieu-sku.xlsx',
		);

		expect(
			await oTongHop(dr, 'Lỗi'),
			`Dòng thiếu SKU mà 🚫 không bị đếm là lỗi. Bản xem trước: ${noi.slice(0, 300)}`,
		).toBeGreaterThan(0);
		// 🔴 Kỳ vọng "kèm lý do": phải có chữ giải thích ở cột Ghi chú, 🚫 không chỉ con số.
		expect(
			/SKU|mã sản phẩm|không tìm thấy|bắt buộc|trống/i.test(noi),
			`Dòng lỗi 🚫 không nói vì sao. Bản xem trước: ${noi.slice(0, 400)}`,
		).toBe(true);
	});

	test('04_2_020_004 — Dòng có số lượng bằng 0 bị chặn', async ({ page }) => {
		chanNeuTat('04_2_020_004');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		const { dr, noi } = await napMotDong(
			page,
			{ SKU: SKU_SEED, 'Số lượng': 0, 'Giá vốn': 30_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-sl-0.xlsx',
		);

		expect(
			await oTongHop(dr, 'Hợp lệ'),
			`Số lượng 0 mà vẫn được tính hợp lệ — sẽ ghi một dòng tồn rỗng. Xem trước: ${noi.slice(0, 300)}`,
		).toBe(0);
	});

	test('04_2_020_005 — Dòng giá vốn âm bị chặn', async ({ page }) => {
		chanNeuTat('04_2_020_005');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		const { dr, noi } = await napMotDong(
			page,
			{ SKU: SKU_SEED, 'Số lượng': 2, 'Giá vốn': -1_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-gia-am.xlsx',
		);

		expect(
			await oTongHop(dr, 'Hợp lệ'),
			`Giá vốn ÂM mà vẫn hợp lệ — giá trị tồn kho sẽ âm theo. Xem trước: ${noi.slice(0, 300)}`,
		).toBe(0);
	});

	test('04_2_020_006 — Bỏ trống mã điểm bán thì ghi vào điểm bán đang chọn', async ({ page }) => {
		chanNeuTat('04_2_020_006');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		// 🔴 `themMotDong` chỉ điền các cột được khai ⇒ cột mã điểm bán để TRỐNG là đúng kịch bản.
		const { dr, noi } = await napMotDong(
			page,
			{ SKU: SKU_SEED, 'Số lượng': 1, 'Giá vốn': 20_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-trong-ma-shop.xlsx',
		);

		expect(
			await oTongHop(dr, 'Hợp lệ'),
			`Bỏ trống mã điểm bán mà dòng 🚫 không được nhận về điểm bán đang chọn. Xem trước: ${noi.slice(0, 300)}`,
		).toBe(1);
		// Cột "Điểm bán / kho" phải được điền sẵn, 🚫 không để trống.
		const oDiemBan = dr.locator('.ant-table-tbody tr.ant-table-row').first().locator('td').nth(1);
		expect(
			chuan(await oDiemBan.innerText()),
			'Cột "Điểm bán / kho" trống ⇒ 🚫 không rõ dòng này sẽ vào kho nào',
		).not.toBe('');
	});

	test('04_2_020_007 — Số serial phải bằng số lượng quy về đơn vị chính', async ({ page }) => {
		chanNeuTat('04_2_020_007');
		test.skip(
			!SKU_SERIAL,
			'Sổ seed chưa có sản phẩm "thực tế đích danh" (`sanPhamTheoGiaVon.dichDanh`) — '
				+ 'case này chỉ đo được trên sản phẩm QUẢN LÝ SERIAL.',
		);
		// Khai 3 sản phẩm nhưng chỉ đưa 1 serial ⇒ phải bị loại.
		const { dr, noi } = await napMotDong(
			page,
			{
				SKU: SKU_SERIAL,
				'Số lượng': 3,
				'Giá vốn': 60_000,
				'Đơn vị': 'Cái',
				Serial: 'AUTOSERIAL001',
			},
			'ton-dau-ky-serial-lech.xlsx',
		);

		expect(
			await oTongHop(dr, 'Hợp lệ'),
			`Khai 3 sản phẩm nhưng chỉ 1 serial mà vẫn hợp lệ ⇒ tồn kho và sổ serial lệch nhau ngay `
				+ `từ đầu kỳ. Xem trước: ${noi.slice(0, 300)}`,
		).toBe(0);
	});
	test('04_2_020_012 — Xoá dòng lỗi khỏi bản xem trước', async ({ page }) => {
		chanNeuTat('04_2_020_012');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		test.setTimeout(240_000);
		const { dr } = await napNhieuDong(page, 'ton-dau-ky-xoa-dong.xlsx');
		const truoc = await tongHop(dr);
		const dongLoi = await timXemTruoc(page, dr, 'ZZZ-AUTO-03');
		expect(dongLoi.length, 'Không tìm thấy dòng lỗi ZZZ-AUTO-03 để xoá').toBe(1);

		await dongXT(dr).first().locator('button:has(.anticon-delete)').click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Xóa dòng này khỏi bản xem trước?' });
		await expect(hop, 'Không hiện hộp thoại "Xóa dòng này khỏi bản xem trước?"').toBeVisible({ timeout: 15_000 });
		const cho = page.waitForResponse((r) => r.request().method() === 'DELETE' && /\/previews\/[^/]+\/items\//.test(r.url()), { timeout: 30_000 });
		await hop.getByRole('button', { name: /OK|Xóa|Xoá|Đồng ý/ }).click();
		await cho;
		await expect.poll(async () => chuan((await page.locator('.ant-message').allInnerTexts()).join(' ')), { timeout: 15_000 }).toContain('Đã xóa');

		await expect.poll(() => tongHop(dr), { timeout: 30_000, message: 'Ô tổng hợp không giảm sau khi xoá dòng lỗi' })
			.toEqual({ tong: truoc.tong - 1, hopLe: truoc.hopLe, loi: truoc.loi - 1 });
		const sau = await timXemTruoc(page, dr, 'ZZZ-AUTO-03');
		expect(sau, 'Dòng đã xoá vẫn còn trong bản xem trước').toEqual([]);
	});
	test('04_2_020_014 — Mã lô đã tồn tại', async () => {
		chanNeuTat('04_2_020_014');
	});
	test('04_2_020_019 — Nút tải lại bản xem trước', async ({ page }) => {
		chanNeuTat('04_2_020_019');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		test.setTimeout(240_000);
		const { dr } = await napNhieuDong(page, 'ton-dau-ky-tai-lai.xlsx');
		const truoc = (await dongXT(dr).allInnerTexts()).map(chuan);
		const tongTruoc = await tongHop(dr);

		const cho = page.waitForResponse((r) => /\/previews\/[^/]+\/items/.test(r.url()) && r.request().method() === 'GET', { timeout: 30_000 });
		await dr.getByRole('button', { name: 'Tải lại' }).click();
		const res = await cho;
		expect(res.status(), 'Tải lại không nạp từ server').toBe(200);
		await page.waitForTimeout(800);

		expect((await dongXT(dr).allInnerTexts()).map(chuan), 'Tải lại mà dữ liệu bản xem trước đổi').toEqual(truoc);
		expect(await tongHop(dr)).toEqual(tongTruoc);
	});
	test('04_2_020_020 — Tải lên file Excel mới khi đang có bản xem trước', async ({ page }) => {
		chanNeuTat('04_2_020_020');
		test.skip(!SKU_SEED, 'Sổ seed chưa có `sanPham.sku`.');
		test.setTimeout(300_000);
		const { dr, res } = await napNhieuDong(page, 'ton-dau-ky-cu.xlsx');
		const idCu = String((await res?.json().catch(() => null))?.data?.id ?? (await res?.json().catch(() => null))?.data?.previewId ?? '');

		// 🔴 `chanGhiTon` chặn MỌI `DELETE previews/{id}` để khỏi huỷ nhầm bản xem trước của người
		//    khác. Ở đây chỉ mở đúng bản xem trước DO CHÍNH CASE NÀY tạo ra (route đăng ký sau chạy trước).
		await page.route('**/opening-balance/**', async (route) => {
			const q = route.request();
			if (q.method() === 'DELETE' && idCu && new RegExp(`/previews/${idCu}(\\?|$)`).test(q.url())) return route.continue();
			return route.fallback();
		});
		expect(idCu, 'Không đọc được id bản xem trước từ response upload').not.toBe('');

		await dr.getByRole('button', { name: 'Tải lên file excel mới' }).first().click();
		const hop = page.locator('.ant-modal-confirm').filter({ hasText: 'Tải lên file excel mới?' });
		await expect(hop, 'Không hiện hộp thoại "Tải lên file excel mới?"').toBeVisible({ timeout: 15_000 });
		const choHuy = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes(`/previews/${idCu}`), { timeout: 30_000 });
		await hop.getByRole('button', { name: /OK|Đồng ý|Xác nhận/ }).click();
		expect((await choHuy).status(), 'Huỷ bản xem trước cũ thất bại').toBeLessThan(400);
		await expect.poll(async () => chuan((await page.locator('.ant-message').allInnerTexts()).join(' ')), { timeout: 15_000 })
			.toContain('Đã hủy bản xem trước hiện tại');

		// Nạp file MỚI một dòng ⇒ bảng thay hẳn, ô tổng hợp tính lại (🚫 không cộng dồn 25 + 1).
		const { dr: dr2 } = await napMotDong(
			page,
			{ SKU: SKU_SEED, 'Số lượng': 4, 'Giá vốn': 10_000, 'Đơn vị': 'Cái' },
			'ton-dau-ky-moi.xlsx',
		);
		await expect.poll(() => oTongHop(dr2, 'Tổng dòng'), { timeout: 60_000, message: 'Tổng dòng không tính lại theo file mới' }).toBe(1);
		expect(await oTongHop(dr2, 'Tổng SL'), 'Tổng SL không theo file mới').toBe(4);
	});
	test('04_2_020_025 — Bản xem trước chưa ở trạng thái chờ xác nhận thì không tạo được phiếu', async () => {
		chanNeuTat('04_2_020_025');
	});
});

void API_PREVIEWS;
void dong;
