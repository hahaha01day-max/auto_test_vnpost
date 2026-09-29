'use strict';

/**
 * 32 · Mô hình tổ chức — Thêm / sửa / xoá đơn vị, vai `tct`. 🔴 CHỈ ghi trên cây rác `A7MH32*` (helper `org-ghi.js`);
 * mỗi case dọn ở `finally`, thêm `32 don rac` quét sót. Đối chứng DB `VNPOST_CORE.ORGANIZATION_UNIT` (SELECT).
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const o = require('./org-ghi');

const GOC = path.join(__dirname, '..');
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};
const ghiChu = (type, description) => test.info().annotations.push({ type, description: String(description) });

/** Mở màn + bắt header ⇒ ps dùng cho API. */
async function mo(page) {
	const st = o.k.batHeader(page);
	await o.moMan(page, 'tct');
	await expect.poll(() => Boolean(st.h), { timeout: 30_000 }).toBe(true);
	return { page, st };
}
async function don(ps, ...ma) {
	const kq = [];
	for (const m of ma.flat().filter(Boolean)) if (o.conSong(m)) kq.push(await o.xoaDvApi(ps, m));
	ghiChu('dọn', kq.join(' · ') || '(không còn gì)');
}

test.describe('32 · Đơn vị tổ chức — ghi trên cây rác (vai tct)', () => {
	test.describe.configure({ timeout: 180_000 });

	test('32 don rac — xoá nút A7MH32* còn sót', async ({ page }) => {
		const ps = await mo(page);
		ghiChu('đã xoá', (await o.donRac(ps)).join(' · ') || '(không có)');
	});

	test('32_100_001 — Thêm đơn vị cấp Tổng công ty với mã hợp lệ', async ({ page }) => {
		chanNeuTat('32_100_001');
		const ps = await mo(page);
		const ma = `${o.TIEN_TO}C${o.tsNgan()}`;
		try {
			const dr = await o.moThem(page);
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} TCT rác`);
			await o.chonCha(page, dr, o.VNPOST);
			const cap = o.chuan(await o.oForm(dr, 'Loại đơn vị / Cấp tổ chức').locator('.ant-select').innerText());
			const khoa = await o.oForm(dr, 'Loại đơn vị / Cấp tổ chức').locator('.ant-select-disabled').count();
			ghiChu('đo', `chọn cha VNPOST ⇒ "Loại đơn vị / Cấp tổ chức" = "${cap}" (ô khoá: ${khoa > 0})`);
			await dr.getByRole('button', { name: 'Huỷ' }).click();
			// Cấp tự suy theo cha, ô cấp bị khoá; cha chọn được chỉ TCT/tỉnh ⇒ không có đường tạo đơn vị cấp TCT từ giao diện.
			expect(cap, 'Không có cách tạo đơn vị cấp "Tổng công ty" từ form (cấp tự suy = cấp dưới của cha, ô cấp bị khoá)').toBe('Tổng công ty');
		} finally { await don(ps, ma); }
	});

	test('32_100_002 — Thêm đơn vị cấp Bưu điện Tỉnh với mã hợp lệ', async ({ page }) => {
		chanNeuTat('32_100_002');
		const ps = await mo(page);
		const ts = o.tsNgan();
		const ma = `${o.TIEN_TO}T${ts}`;
		const ten = `${o.TIEN_TO} Tỉnh UI ${ts}`;
		try {
			const dr = await o.moThem(page);
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(ten);
			await o.chonCha(page, dr, o.VNPOST);
			const kq = await o.xacNhan(page, dr);
			const db = o.dbDv(ma);
			ghiChu('đo', `${JSON.stringify(kq.req)} · ${kq.res?.status?.code} · tb "${kq.tb}" · DB ${JSON.stringify(db)}`);
			expect(kq.tb).toContain('Thêm đơn vị tổ chức thành công');
			expect(db && [db.loai, db.cha, db.xoa]).toEqual(['BUU_DIEN_TINH', o.VNPOST, false]);
			await o.chonTrenCay(page, ten);
		} finally { await don(ps, ma); }
	});

	test('32_100_003 — Thêm đơn vị cấp Bưu điện Xã với mã hợp lệ', async ({ page }) => {
		chanNeuTat('32_100_003');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 0);
		const ma = `${r.tinh}01`;
		try {
			await page.reload();
			await page.waitForTimeout(5_000);
			const dr = await o.moThem(page);
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} Xã UI`);
			await o.chonCha(page, dr, r.tinh);
			const kq = await o.xacNhan(page, dr);
			const db = o.dbDv(ma);
			ghiChu('đo', `${JSON.stringify(kq.req)} · tb "${kq.tb}" · DB ${JSON.stringify(db)}`);
			expect(kq.tb).toContain('Thêm đơn vị tổ chức thành công');
			expect(db && [db.loai, db.cha, db.tree]).toEqual(['BUU_DIEN_XA', r.tinh, `${o.VNPOST}/${r.tinh}/${ma}`]);
		} finally { await don(ps, ma, r.tinh); }
	});

	test('32_100_004 — Nhập mã cấp Tỉnh ngoài khoảng quy định', async ({ page }) => {
		chanNeuTat('32_100_004');
		const ps = await mo(page);
		// Không có "khoảng mã" nào trong FE (chỉ PATTERN chữ/số/_/-) ⇒ thử mã rất dài + mã số thuần ngoài dải 2 chữ số của tỉnh thật.
		const ma = `${o.TIEN_TO}T${'9'.repeat(40)}`;
		try {
			const dr = await o.moThem(page);
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} Tỉnh mã dài`);
			await o.chonCha(page, dr, o.VNPOST);
			const kq = await o.xacNhan(page, dr);
			ghiChu('nguyên văn', `${kq.res?.status?.code} ${kq.res?.status?.message} · tb "${kq.tb}" · lỗi ô ${kq.loi.join(' | ')}`);
			expect(o.conSong(ma), `Tạo được tỉnh với mã ${ma.length} ký tự — không có kiểm khoảng/độ dài mã`).toBe(false);
		} finally { await don(ps, ma); }
	});

	test('32_100_005 — Nhập mã đơn vị trùng mã đã tồn tại', async ({ page }) => {
		chanNeuTat('32_100_005');
		const ps = await mo(page);
		// 🔴 Đích trùng là tỉnh RÁC (không dùng AUTO7_T — nhập Excel trùng mã từng ghi đè tên tỉnh làn).
		const r = await o.taoNhanhRac(ps, 0);
		try {
			const dr = await o.moThem(page);
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(r.tinh);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} trùng mã`);
			await o.chonCha(page, dr, o.VNPOST);
			const kq = await o.xacNhan(page, dr);
			const db = o.dbDv(r.tinh);
			ghiChu('nguyên văn', `${kq.res?.status?.code} ${kq.res?.status?.message} · tb "${kq.tb}"`);
			expect(kq.tb).not.toContain('thành công');
			expect(db.ten, 'Tên đơn vị có sẵn bị ghi đè').toBe(r.tenTinh);
			expect(kq.tb, 'Không báo lỗi trùng mã').toMatch(/tồn tại|trùng|đã có/i);
		} finally { await don(ps, r.tinh); }
	});

	test('32_100_006 — Bỏ trống Đơn vị cha khi thêm mới', async ({ page }) => {
		chanNeuTat('32_100_006');
		await mo(page);
		const dr = await o.moThem(page);
		await dr.getByPlaceholder('Nhập mã đơn vị').fill(`${o.TIEN_TO}X${o.tsNgan()}`);
		await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} không cha`);
		const kq = await o.xacNhan(page, dr);
		ghiChu('nguyên văn', kq.loi.join(' | '));
		expect(kq.req, 'Vẫn gửi tạo khi thiếu đơn vị cha').toBeNull();
		expect(kq.loi).toContain('Vui lòng chọn đơn vị cha');
	});

	// ───────── 110 · thêm từ nút "+" hover trên cây ─────────

	async function moCong(page, ten) {
		const nut = await o.chonTrenCay(page, ten);
		await nut.hover();
		const cong = nut.locator('button:has(.anticon-plus)').first();
		await expect(cong, `Không thấy nút "+" khi hover "${ten}"`).toBeVisible({ timeout: 5_000 });
		await cong.click();
		const dr = o.drawer(page, 'Thêm đơn vị tổ chức');
		await expect(dr).toBeVisible({ timeout: 10_000 });
		await page.waitForTimeout(1_000);
		return dr;
	}

	test('32_110_001 — Thêm đơn vị con qua icon hover trên cây', async ({ page }) => {
		chanNeuTat('32_110_001');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 0);
		const ma = `${r.tinh}01`;
		try {
			await page.reload();
			await page.waitForTimeout(5_000);
			const dr = await moCong(page, r.tenTinh);
			const cha = o.chuan(await o.oForm(dr, 'Đơn vị cha').locator('.ant-select').innerText());
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} Xã hover`);
			const kq = await o.xacNhan(page, dr);
			const db = o.dbDv(ma);
			ghiChu('đo', `cha nạp sẵn "${cha}" · ${JSON.stringify(kq.req)} · tb "${kq.tb}" · DB ${JSON.stringify(db)}`);
			expect(cha).toContain(r.tenTinh);
			expect(db?.cha, 'Đơn vị con tạo sai chỗ').toBe(r.tinh);
		} finally { await don(ps, ma, r.tinh); }
	});

	test('32_110_002 — Tạo nhanh đơn vị cấp Xã với hai trường', async ({ page }) => {
		chanNeuTat('32_110_002');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 0);
		const ma = `${r.tinh}02`;
		try {
			await page.reload();
			await page.waitForTimeout(5_000);
			const dr = await moCong(page, r.tenTinh);
			const cap = o.chuan(await o.oForm(dr, 'Loại đơn vị / Cấp tổ chức').locator('.ant-select').innerText());
			// CHỈ nhập 2 trường; cấp + cha phải suy từ nút đang đứng.
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} Xã 2 trường`);
			const kq = await o.xacNhan(page, dr);
			const db = o.dbDv(ma);
			ghiChu('đo', `cấp nạp sẵn "${cap}" · body ${JSON.stringify(kq.req)} · tb "${kq.tb}" · lỗi ${kq.loi.join(' | ')}`);
			expect(cap).toBe('Bưu điện xã');
			expect(db && [db.loai, db.cha]).toEqual(['BUU_DIEN_XA', r.tinh]);
		} finally { await don(ps, ma, r.tinh); }
	});

	for (const [id, ten, dien, mong] of [
		['32_110_003', 'Bỏ trống Mã đơn vị khi thêm nhanh từ cây', { ten: 'A7MH32 thiếu mã' }, 'Vui lòng nhập mã đơn vị'],
		['32_110_004', 'Bỏ trống Tên đơn vị khi thêm nhanh từ cây', { ma: true }, 'Vui lòng nhập tên đơn vị'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const ps = await mo(page);
			const r = await o.taoNhanhRac(ps, 0);
			try {
				await page.reload();
				await page.waitForTimeout(5_000);
				const dr = await moCong(page, r.tenTinh);
				if (dien.ma) await dr.getByPlaceholder('Nhập mã đơn vị').fill(`${r.tinh}09`);
				if (dien.ten) await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(dien.ten);
				const kq = await o.xacNhan(page, dr);
				ghiChu('nguyên văn', kq.loi.join(' | '));
				expect(kq.req).toBeNull();
				expect(kq.loi).toContain(mong);
			} finally { await don(ps, `${r.tinh}09`, r.tinh); }
		});
	}

	test('32_110_005 — Nhập mã cấp Xã trùng mã đã tồn tại khi thêm nhanh', async ({ page }) => {
		chanNeuTat('32_110_005');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload();
			await page.waitForTimeout(5_000);
			const dr = await moCong(page, r.tenTinh);
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(r.xa[0].ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${o.TIEN_TO} xã trùng mã`);
			const kq = await o.xacNhan(page, dr);
			const db = o.dbDv(r.xa[0].ma);
			ghiChu('nguyên văn', `${kq.res?.status?.message} · tb "${kq.tb}"`);
			expect(kq.tb).not.toContain('thành công');
			expect(db.ten, 'Tên xã có sẵn bị ghi đè').toBe(r.xa[0].ten);
		} finally { await don(ps, r.xa.map((x) => x.ma), r.tinh); }
	});

	test('32_120_001 — Cây phân cấp hiển thị trạng thái rỗng khi chưa có đơn vị', async ({ page }) => {
		chanNeuTat('32_120_001');
		await mo(page);
		await o.oTim(page).fill('ZZZ_KHONG_CO_DON_VI_NAO_32');
		await page.waitForTimeout(3_000);
		const n = await o.nutCay(page).count();
		const rong = o.khung(page).locator('.ant-tree').locator('xpath=..').locator('.ant-empty, [class*=empty]');
		const chu = o.chuan(await o.khung(page).innerText()).slice(0, 300);
		ghiChu('đo', `${n} nút (${(await o.nutCay(page).allInnerTexts()).map(o.chuan).join(' | ')}) · chữ: ${chu}`);
		expect(n, 'Tìm từ khoá không tồn tại mà cây vẫn còn nút').toBe(0);
		expect(await rong.count() > 0 || /Không có|Trống|No data|Không tìm thấy/i.test(chu), 'Cây rỗng mà KHÔNG có dòng chữ trạng thái rỗng').toBe(true);
	});

	// ───────── 130 · cập nhật ─────────

	async function moCapNhat(page, ten) {
		await o.chonTrenCay(page, ten);
		await o.khungChiTiet(page).getByRole('button', { name: /^Cập nhật$/ }).click();
		const dr = o.drawer(page, 'Cập nhật đơn vị tổ chức');
		await expect(dr).toBeVisible({ timeout: 10_000 });
		await page.waitForTimeout(1_500);
		return dr;
	}

	test('32_130_001 — Chỉnh sửa Đơn vị cha chuyển đơn vị sang nhánh khác', async ({ page }) => {
		chanNeuTat('32_130_001');
		const ps = await mo(page);
		const a = await o.taoNhanhRac(ps, 1);
		const b = await o.taoNhanhRac(ps, 0);
		try {
			// (1) Xã: đổi cha sang tỉnh khác — BE đòi mã xã bắt đầu bằng mã cha mà ô mã bị khoá khi cập nhật ⇒ ghi nhận hành vi.
			const thuXa = await o.k.goiGhi(ps.page, ps.st, 'PUT', '/v1.0/organization-unit', { unitCode: a.xa[0].ma }, { unitCode: a.xa[0].ma, unitName: a.xa[0].ten, unitType: 'BUU_DIEN_XA', parentCode: b.tinh, status: true, regionCodes: [] });
			ghiChu('chuyển XÃ sang tỉnh khác (API)', `${thuXa?.status?.code} ${thuXa?.status?.message}`);
			// (2) Tỉnh (kèm xã con): đổi cha VNPOST → MASTER0001 (TCT khác) qua GIAO DIỆN; nhánh con phải đi theo.
			await page.reload();
			await page.waitForTimeout(5_000);
			const dr = await moCapNhat(page, a.tenTinh);
			await o.chonCha(page, dr, 'MASTER0001');
			const kq = await o.xacNhan(page, dr);
			const p = o.dbDv(a.tinh);
			const x = o.dbDv(a.xa[0].ma);
			ghiChu('đo', `${JSON.stringify(kq.req)} · tb "${kq.tb}" · tỉnh ${JSON.stringify(p)} · xã con ${JSON.stringify(x)}`);
			expect(kq.tb).toContain('Cập nhật đơn vị tổ chức thành công');
			expect(p.cha).toBe('MASTER0001');
			expect(x.tree, 'Nhánh con KHÔNG đi theo đơn vị cha mới (tree của xã con còn đường cũ)').toBe(`${p.tree}/${a.xa[0].ma}`);
			expect(String(thuXa?.status?.code), `Không chuyển được XÃ sang tỉnh khác: ${thuXa?.status?.message}`).toBe('200');
		} finally { await don(ps, a.xa.map((m) => m.ma), a.tinh, b.tinh); }
	});

	for (const [id, ten, gia] of [
		['32_130_002', 'Chỉnh sửa bỏ trống Mã đơn vị', ''],
		['32_130_003', 'Chỉnh sửa đổi Mã đơn vị thành mã đã tồn tại', 'AUTO7_T'],
	]) {
		test(`${id} — ${ten}`, async ({ page }) => {
			chanNeuTat(id);
			const ps = await mo(page);
			const r = await o.taoNhanhRac(ps, 0);
			try {
				await page.reload();
				await page.waitForTimeout(5_000);
				const dr = await moCapNhat(page, r.tenTinh);
				const oMa = dr.getByPlaceholder('Nhập mã đơn vị');
				const khoa = await oMa.isDisabled();
				let kq = null;
				if (!khoa) { await oMa.fill(gia); kq = await o.xacNhan(page, dr); }
				const db = o.dbDv(r.tinh);
				ghiChu('hành vi thật', `ô Mã đơn vị ${khoa ? 'BỊ KHOÁ khi cập nhật (không sửa được mã)' : `sửa được → ${JSON.stringify(kq)}`}`);
				expect(db && !db.xoa, 'Đơn vị gốc mất sau khi sửa mã').toBe(true);
				expect(khoa || (kq?.req == null) || !/thành công/.test(kq?.tb ?? ''), 'Sửa mã thành rỗng/trùng mà vẫn lưu').toBe(true);
			} finally { await don(ps, r.tinh); }
		});
	}

	// ───────── 140 · xoá ─────────

	async function xoaQuaUi(page, ten) {
		await o.chonTrenCay(page, ten);
		await o.khungChiTiet(page).getByRole('button', { name: /^Xoá$/ }).click();
		const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
		await expect(pop).toBeVisible({ timeout: 10_000 });
		const chu = o.chuan(await pop.innerText());
		const cho = page.waitForResponse((r) => r.url().includes('/v1.0/organization-unit') && r.request().method() === 'DELETE', { timeout: 15_000 }).catch(() => null);
		await pop.getByRole('button', { name: /^Xoá$/ }).click();
		const r = await cho;
		await page.waitForTimeout(1_200);
		return { chu, res: r ? await r.json().catch(() => null) : null, tb: await o.thongBao(page) };
	}

	test('32_140_001 — Xoá cấp Xã kéo theo Điểm bán trực thuộc', async ({ page }) => {
		chanNeuTat('32_140_001');
		await mo(page);
		// Tiền đề CỐ ĐỊNH (xem org-ghi.js CO_DINH): xã rác `${CO_DINH}01` chứa nút DIEM_BAN `${CO_DINH}01A01`.
		const xa = o.dbDv(`${o.CO_DINH}01`);
		const shop = `${o.CO_DINH}01A01`;
		test.skip(!xa || xa.xoa, 'Nhánh rác cố định đã bị xoá (có thể BE đã sửa) — tạo lại tiền đề.');
		const kq = await xoaQuaUi(page, xa.ten);
		ghiChu('đo', `popup "${kq.chu}" · ${kq.res?.status?.code} ${kq.res?.status?.message} · tb "${kq.tb}" · xã sống ${o.conSong(xa.ma)} · điểm bán sống ${o.conSong(shop)}`);
		expect(kq.tb, 'Không xoá được xã đang chứa điểm bán (BE chặn thay vì xoá lan)').toContain('Xoá đơn vị thành công');
		expect(o.conSong(shop), 'Xoá xã mà điểm bán trực thuộc VẪN còn (mồ côi)').toBe(false);
	});

	test('32_140_002 — Xoá cấp Tỉnh kéo theo toàn bộ Xã và Điểm bán', async ({ page }) => {
		chanNeuTat('32_140_002');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 2);
		try {
			await page.reload();
			await page.waitForTimeout(5_000);
			const kq = await xoaQuaUi(page, r.tenTinh);
			const con = r.xa.filter((x) => o.conSong(x.ma)).map((x) => x.ma);
			ghiChu('đo', `popup "${kq.chu}" · ${kq.res?.status?.code} ${kq.res?.status?.message} · tb "${kq.tb}" · tỉnh sống ${o.conSong(r.tinh)} · xã còn ${con.join(',')}`);
			expect(o.conSong(r.tinh), `Không xoá được tỉnh có xã con (${kq.res?.status?.message ?? kq.tb})`).toBe(false);
			expect(con, 'Xoá tỉnh mà xã con VẪN còn (mồ côi)').toEqual([]);
		} finally { await don(ps, r.xa.map((x) => x.ma), r.tinh); }
	});

	test('32_140_005 — Nội dung popup xác nhận xoá đơn vị', async ({ page }) => {
		chanNeuTat('32_140_005');
		const ps = await mo(page);
		const r = await o.taoNhanhRac(ps, 1);
		try {
			await page.reload();
			await page.waitForTimeout(5_000);
			await o.chonTrenCay(page, r.tenTinh);
			await o.khungChiTiet(page).getByRole('button', { name: /^Xoá$/ }).click();
			const pop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
			await expect(pop).toBeVisible({ timeout: 10_000 });
			const chu = o.chuan(await pop.innerText());
			ghiChu('nguyên văn popup', chu);
			await pop.getByRole('button', { name: /Huỷ|Hủy/ }).click();
			expect(chu).toContain(r.tenTinh);
			expect(chu, 'Popup KHÔNG nêu hậu quả xoá lan xuống cấp dưới (xã/điểm bán trực thuộc)').toMatch(/cấp dưới|trực thuộc|đơn vị con|toàn bộ/i);
		} finally { await don(ps, r.xa.map((x) => x.ma), r.tinh); }
	});

	test('32_140_003 — Xoá cấp Tổng công ty kéo theo toàn bộ cây', async ({ page }) => {
		chanNeuTat('32_140_003');
		const ps = await mo(page);
		// 🔴 KHÔNG đụng VNPOST: dựng một nút GỐC cấp TỔNG CÔNG TY RÁC (API, parentCode null — dưới VNPOST BE báo "cấp trên phải cao hơn") + tỉnh rác con, rồi xoá nút TCT rác qua giao diện.
		const ts = o.tsNgan();
		const tct = `${o.TIEN_TO}C${ts}`;
		const tinh = `${o.TIEN_TO}CT${ts}`;
		const t = await o.k.goiGhi(ps.page, ps.st, 'POST', '/v1.0/organization-unit', {}, { unitCode: tct, unitName: `${o.TIEN_TO} TCT rác ${ts}`, unitType: 'TONG_CONG_TY', parentCode: null, status: true });
		ghiChu('tạo TCT rác', `${t?.status?.code} ${t?.status?.message}`);
		test.skip(String(t?.status?.code) !== '200', `Không tạo được nút cấp TCT rác (${t?.status?.message}) — không thử xoá trên VNPOST thật.`);
		try {
			await o.taoDvApi(ps, { ma: tinh, ten: `${o.TIEN_TO} Tỉnh dưới TCT rác`, loai: 'BUU_DIEN_TINH', cha: tct });
			await page.reload();
			await page.waitForTimeout(5_000);
			// Nút gốc mới KHÔNG hiện trên cây (cây vẽ từ VNPOST) ⇒ nếu không thấy thì xoá bằng API (đúng endpoint nút "Xoá" gọi).
			await o.oTim(page).fill(`${o.TIEN_TO} TCT rác ${ts}`);
			await page.waitForTimeout(2_500);
			const thay = await o.nutCay(page).filter({ hasText: `${o.TIEN_TO} TCT rác ${ts}` }).count();
			const kq = thay ? await xoaQuaUi(page, `${o.TIEN_TO} TCT rác ${ts}`) : { chu: '(nút gốc rác không có trên cây — xoá qua API)', res: await o.k.goiGhi(ps.page, ps.st, 'DELETE', '/v1.0/organization-unit', { unitCode: tct }), tb: '' };
			ghiChu('đo', `popup "${kq.chu}" · ${kq.res?.status?.code} ${kq.res?.status?.message} · tb "${kq.tb}" · TCT sống ${o.conSong(tct)} · tỉnh con sống ${o.conSong(tinh)}`);
			expect(o.conSong(tct), `Không xoá được đơn vị cấp TCT có cấp dưới (${kq.res?.status?.message ?? kq.tb})`).toBe(false);
			expect(o.conSong(tinh), 'Xoá TCT mà cây bên dưới VẪN còn').toBe(false);
		} finally { await don(ps, tinh, tct); }
	});

	test('32_010_002 — đăng nhập và vào module Mô hình tổ chức', async ({ page }) => {
		chanNeuTat('32_010_002');
		await mo(page);
		await expect(page.locator('.ant-page-header-heading-title').first()).toHaveText('Mô hình tổ chức');
		expect(await o.nutCay(page).count(), 'Cây tổ chức rỗng').toBeGreaterThan(0);
	});

	test('32_020_004 — CRUD đơn vị test: thêm, tìm kiếm, cập nhật, xóa', async ({ page }) => {
		chanNeuTat('32_020_004');
		const ps = await mo(page);
		const ts = o.tsNgan();
		const ma = `${o.TIEN_TO}T${ts}`;
		const ten = `${o.TIEN_TO} CRUD ${ts}`;
		try {
			let dr = await o.moThem(page);
			await dr.getByPlaceholder('Nhập mã đơn vị').fill(ma);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(ten);
			await o.chonCha(page, dr, o.VNPOST);
			expect((await o.xacNhan(page, dr)).tb).toContain('Thêm đơn vị tổ chức thành công');
			await page.reload(); await page.waitForTimeout(5_000);
			await o.chonTrenCay(page, ten);
			await o.khungChiTiet(page).getByRole('button', { name: /^Cập nhật$/ }).click();
			dr = o.drawer(page, 'Cập nhật đơn vị tổ chức');
			await expect(dr).toBeVisible({ timeout: 10_000 });
			await page.waitForTimeout(1_500);
			await dr.getByPlaceholder('VD: Điểm bán Bãi Sậy').fill(`${ten} SỬA`);
			expect((await o.xacNhan(page, dr)).tb).toContain('Cập nhật đơn vị tổ chức thành công');
			expect(o.dbDv(ma).ten).toBe(`${ten} SỬA`);
			const kq = await xoaQuaUi(page, `${ten} SỬA`);
			ghiChu('xoá', kq.tb);
			expect(kq.tb).toContain('Xoá đơn vị thành công');
			expect(o.conSong(ma)).toBe(false);
		} finally { await don(ps, ma); }
	});
});
