'use strict';

/**
 * Task 030 — Cấu hình chấm công (drawer ở màn `/employee/schedule`).
 *
 * 🔴 Cấu hình này áp cho **toàn bộ điểm bán**: đổi một công tắc là mọi nhân viên đang chấm công bị
 * ảnh hưởng ngay. Vì vậy 7/11 case là case ghi và đều `allowMutation: false`; các case đọc ở đây
 * vẫn bọc `chanGhi` để một cú bấm nhầm không lọt xuống server.
 *
 * Đo từ DOM 20/09/2026: drawer tiêu đề **"Cấu hình chấm công"**, chỉ có nút **"Xác nhận"**
 * (🚫 không có nút Huỷ), ô nhập `#allowLateMinutes` · `#allowEarlyMinutes`, hai công tắc là
 * **checkbox** `#combineShiftsEnabled` · `#autoCheckinEnabled`, và hai radio *Theo giờ chấm công
 * thực tế* / *Theo giờ bắt đầu và kết thúc ca*.
 */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');

const GOC = path.join(__dirname, '..');
const { chanGhi, chuan, drawer, moManLich } = require('./shift-page');

const VAI = 'shop';
const chanNeuTat = (id) => {
	const i = loadCaseInput(GOC, id);
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');
	return i;
};

async function moDrawerCauHinh(page) {
	// 🔴 Drawer hiện ô NGAY, rồi mới `GET /timekeeping/config/advanced-rules` và `setFieldsValue`.
	//    Đọc ô ngay khi hiện là đọc giá trị mặc định (`0`) — và `chupCauHinh` từng chụp đúng giá trị
	//    mặc định đó rồi "khôi phục" nó đè lên cấu hình thật. Phải chờ response nạp cấu hình.
	const cho = page.waitForResponse(
		(r) => r.url().includes('/timekeeping/config/advanced-rules') && r.request().method() === 'GET',
		{ timeout: 60_000 },
	);
	await page.getByRole('button', { name: 'Cấu hình chấm công' }).click();
	const dr = drawer(page);
	await expect(dr.locator('.ant-drawer-title')).toHaveText('Cấu hình chấm công', {
		timeout: 20_000,
	});
	const body = await (await cho).json();
	expect(String(body?.status?.code), 'Không nạp được cấu hình chấm công').toBe('200');
	await expect(dr.locator('#allowLateMinutes')).toHaveValue(String(body?.data?.allowLateMinutes ?? 0));
	return dr;
}

/** Hai ô chỉ hiện sau khi bật công tắc gộp ca. */
const oGopCa = (dr) => dr.getByText('Ghi nhận cho tối đa', { exact: false });
const oKhoangCach = (dr) => dr.getByText('Mỗi ca cách nhau tối đa', { exact: false });

/**
 * 🔴 Radio của antd có `<input>` ẩn — bấm vào input là "element is not visible" tới hết timeout.
 *    Bấm vào VỎ `.ant-radio-wrapper` mang đúng nhãn.
 */
const oRadio = (dr, nhan) => dr.locator('.ant-radio-wrapper').filter({ hasText: nhan }).first();
const daChon = async (dr, nhan) =>
  (await oRadio(dr, nhan).getAttribute('class'))?.includes('ant-radio-wrapper-checked') ?? false;

/**
 * Chụp lại toàn bộ cấu hình đang có để KHÔI PHỤC ở cuối case.
 *
 * 🔴 Cấu hình này áp cho **toàn bộ điểm bán**. Case ghi ở đây đổi nó trong vài giây rồi trả lại
 *    nguyên trạng — 🚫 đừng bỏ bước khôi phục, mọi nhân viên đang chấm công ăn theo cấu hình này.
 */
async function chupCauHinh(dr) {
  const cf = {
    theoCa: await daChon(dr, 'Theo giờ bắt đầu và kết thúc ca'),
    gopCa: await dr.locator('#combineShiftsEnabled').isChecked(),
    tuDong: await dr.locator('#autoCheckinEnabled').isChecked(),
    treMuon: await dr.locator('#allowLateMinutes').inputValue(),
    veSom: await dr.locator('#allowEarlyMinutes').inputValue(),
    apDungTatCa: null,
    soCaGop: null,
    khoangCach: null,
  };
  if (cf.tuDong) cf.apDungTatCa = await daChon(dr, 'Áp dụng cho tất cả nhân viên');
  if (cf.gopCa) {
    cf.soCaGop = await dr.locator('#maxCombineShifts').inputValue();
    cf.khoangCach = await dr.locator('#maxHoursBetweenShifts').inputValue();
  }
  return cf;
}

/** Đặt lại đúng cấu hình đã chụp (chỉ thao tác UI, chưa lưu). */
async function datLaiCauHinh(page, dr, cf) {
  await oRadio(dr, cf.theoCa ? 'Theo giờ bắt đầu và kết thúc ca' : 'Theo giờ chấm công thực tế').click();
  await dr.locator('#allowLateMinutes').fill(cf.treMuon);
  await dr.locator('#allowEarlyMinutes').fill(cf.veSom);

  const gop = dr.locator('#combineShiftsEnabled');
  if ((await gop.isChecked()) !== cf.gopCa) {
    await gop.setChecked(cf.gopCa);
    await page.waitForTimeout(800);
  }
  if (cf.gopCa && cf.soCaGop !== null) {
    await dr.locator('#maxCombineShifts').fill(cf.soCaGop);
    await dr.locator('#maxHoursBetweenShifts').fill(cf.khoangCach);
  }

  const tuDong = dr.locator('#autoCheckinEnabled');
  if ((await tuDong.isChecked()) !== cf.tuDong) {
    await tuDong.setChecked(cf.tuDong);
    await page.waitForTimeout(800);
  }
  if (cf.tuDong && cf.apDungTatCa !== null) {
    await oRadio(dr, cf.apDungTatCa ? 'Áp dụng cho tất cả nhân viên' : 'Áp dụng cho nhân viên cụ thể').click();
    await page.waitForTimeout(500);
  }
}

/**
 * Bấm Xác nhận và chờ ĐÚNG API lưu.
 * 🚫 Đừng chỉ chờ toast: `message.error` cũng là toast, chờ chữ thôi là nhầm lỗi thành thành công.
 */
async function luuCauHinh(page, dr) {
  const cho = page.waitForResponse(
    (r) => r.url().includes('/timekeeping/config/advanced-rules') && r.request().method() === 'PUT',
    { timeout: 60_000 },
  );
  await dr.getByRole('button', { name: 'Xác nhận' }).click();
  const body = await (await cho).json().catch(() => null);
  expect(String(body?.status?.code), `Lưu cấu hình thất bại: ${JSON.stringify(body?.status)}`).toBe('200');
  await expect
    .poll(async () => (await page.locator('.ant-message').allInnerTexts()).map(chuan).join(' | '), {
      timeout: 20_000,
      message: 'Lưu xong không thấy thông báo "Cập nhật cấu hình thành công"',
    })
    .toContain('Cập nhật cấu hình thành công');
}

/** Mở drawer, chụp cấu hình cũ, chạy `viec`, rồi khôi phục — dùng chung cho mọi case ghi ở task 030. */
async function traLaiNguyenTrang(page, viec) {
  const dr = await moDrawerCauHinh(page);
  const cu = await chupCauHinh(dr);
  try {
    await viec(dr, cu);
  } finally {
    const dr2 = (await dr.isVisible().catch(() => false)) ? dr : await moDrawerCauHinh(page);
    await datLaiCauHinh(page, dr2, cu);
    await luuCauHinh(page, dr2);
  }
}

test.describe('03a · 030 — Cấu hình chấm công', () => {
	test.beforeEach(async ({ page }) => {
		await moManLich(page, VAI);
	});

	test('03a_030_001 — Màn Cấu hình chấm công mở được', async ({ page }) => {
		chanNeuTat('03a_030_001');
		await chanGhi(page);

		const dr = await moDrawerCauHinh(page);
		const noi = chuan(await dr.innerText());
		expect(noi).toContain('Ghi nhận giờ chấm công');

		const nhan = (await dr.locator('.ant-radio-wrapper').allInnerTexts()).map(chuan);
		expect(nhan).toEqual(['Theo giờ chấm công thực tế', 'Theo giờ bắt đầu và kết thúc ca']);
	});

	test('03a_030_003 — Hai ô gộp ca chỉ hiện sau khi bật công tắc chấm 1 lượt', async ({ page }) => {
		chanNeuTat('03a_030_003');
		await chanGhi(page);

		const dr = await moDrawerCauHinh(page);
		const congTac = dr.locator('#combineShiftsEnabled');

		// Đưa về trạng thái TẮT trước khi đo — 🚫 không giả định cấu hình hiện tại đang tắt.
		if (await congTac.isChecked()) {
			await congTac.uncheck();
			await page.waitForTimeout(800);
		}
		await expect(oGopCa(dr)).toHaveCount(0);
		await expect(oKhoangCach(dr)).toHaveCount(0);

		await congTac.check();
		await page.waitForTimeout(1_000);
		await expect(oGopCa(dr), 'Bật công tắc mà ô "Ghi nhận cho tối đa" không hiện').toBeVisible();
		await expect(oKhoangCach(dr)).toBeVisible();
	});

	test('03a_030_011 — Hai ô gộp ca ẩn lại khi tắt công tắc', async ({ page }) => {
		chanNeuTat('03a_030_011');
		await chanGhi(page);

		const dr = await moDrawerCauHinh(page);
		const congTac = dr.locator('#combineShiftsEnabled');

		if (!(await congTac.isChecked())) {
			await congTac.check();
			await page.waitForTimeout(1_000);
		}
		await expect(oGopCa(dr)).toBeVisible();

		await congTac.uncheck();
		await page.waitForTimeout(1_000);
		await expect(oGopCa(dr), 'Tắt công tắc mà ô gộp ca vẫn còn').toHaveCount(0);
		await expect(oKhoangCach(dr)).toHaveCount(0);
	});

	// ── Case GHI dữ liệu: giữ `allowMutation: false`, skip có lý do ───────────────────────────────
	test('03a_030_002 — Lưu quy tắc đi muộn về sớm', async ({ page }) => {
		const i = chanNeuTat('03a_030_002');
		const muon = String(i.data?.diMuonSau ?? 5);
		const som = String(i.data?.veSomTruoc ?? 5);
		await traLaiNguyenTrang(page, async (dr, cu) => {
			// 🔴 Giá trị cũ trùng giá trị cần lưu thì "mở lại vẫn là 5" không chứng minh gì — đổi
			//    sang một giá trị khác và lưu trước, để lần lưu chính thật sự đổi dữ liệu.
			if (cu.treMuon === muon || cu.veSom === som) {
				await dr.locator('#allowLateMinutes').fill(String(Number(muon) + 1));
				await dr.locator('#allowEarlyMinutes').fill(String(Number(som) + 1));
				await luuCauHinh(page, dr);
				dr = await moDrawerCauHinh(page);
			}
			await dr.locator('#allowLateMinutes').fill(muon);
			await dr.locator('#allowEarlyMinutes').fill(som);
			await luuCauHinh(page, dr);

			const lai = await moDrawerCauHinh(page);
			expect(await lai.locator('#allowLateMinutes').inputValue(), 'Tính đi muộn sau không được giữ').toBe(muon);
			expect(await lai.locator('#allowEarlyMinutes').inputValue(), 'Tính về sớm trước không được giữ').toBe(som);
		});
	});
	test('03a_030_004 — Ghi nhận giờ theo giờ bắt đầu và kết thúc ca', async ({ page }) => {
		chanNeuTat('03a_030_004');
		await traLaiNguyenTrang(page, async (dr) => {
			await oRadio(dr, 'Theo giờ bắt đầu và kết thúc ca').click();
			await luuCauHinh(page, dr);

			// Kỳ vọng: mở lại drawer thì lựa chọn được GIỮ, 🚫 không quay về mặc định.
			const lai = await moDrawerCauHinh(page);
			expect(
				await daChon(lai, 'Theo giờ bắt đầu và kết thúc ca'),
				'Lưu "Theo giờ bắt đầu và kết thúc ca" xong, mở lại vẫn không được chọn',
			).toBe(true);
			expect(await daChon(lai, 'Theo giờ chấm công thực tế'), 'Hai lựa chọn phải loại trừ nhau').toBe(false);
		});
	});
	test('03a_030_005 — Ghi nhận giờ theo giờ chấm công thực tế', async ({ page }) => {
		chanNeuTat('03a_030_005');
		await traLaiNguyenTrang(page, async (dr) => {
			await oRadio(dr, 'Theo giờ chấm công thực tế').click();
			await luuCauHinh(page, dr);

			const lai = await moDrawerCauHinh(page);
			expect(
				await daChon(lai, 'Theo giờ chấm công thực tế'),
				'Lưu "Theo giờ chấm công thực tế" xong, mở lại vẫn không được chọn',
			).toBe(true);
			expect(await daChon(lai, 'Theo giờ bắt đầu và kết thúc ca'), 'Hai lựa chọn phải loại trừ nhau').toBe(
				false,
			);
		});
	});
	test('03a_030_006 — Tự động chấm công áp dụng cho TẤT CẢ nhân viên', async ({ page }) => {
		chanNeuTat('03a_030_006');
		await traLaiNguyenTrang(page, async (dr) => {
			await dr.locator('#autoCheckinEnabled').setChecked(true);
			await page.waitForTimeout(800);
			await oRadio(dr, 'Áp dụng cho tất cả nhân viên').click();
			await luuCauHinh(page, dr);

			const lai = await moDrawerCauHinh(page);
			expect(await lai.locator('#autoCheckinEnabled').isChecked(), 'Công tắc tự động chấm công không được giữ').toBe(
				true,
			);
			expect(await daChon(lai, 'Áp dụng cho tất cả nhân viên'), 'Phạm vi không được giữ ở "tất cả nhân viên"').toBe(
				true,
			);
			// Kỳ vọng của sheet: phạm vi "tất cả" thì ô chọn nhân viên cụ thể 🚫 KHÔNG hiển thị.
			await expect(
				lai.locator('#autoCheckinEmployeeIds'),
				'Phạm vi "tất cả nhân viên" mà ô chọn nhân viên cụ thể vẫn hiện',
			).toHaveCount(0);
		});
	});
	test('03a_030_007 — Tự động chấm công áp dụng cho nhân viên CỤ THỂ', async ({ page }) => {
		chanNeuTat('03a_030_007');
		await traLaiNguyenTrang(page, async (dr) => {
			await dr.locator('#autoCheckinEnabled').setChecked(true);
			await page.waitForTimeout(800);
			await oRadio(dr, 'Áp dụng cho nhân viên cụ thể').click();
			await page.waitForTimeout(500);

			const o = dr.locator('#autoCheckinEmployeeIds');
			await expect(o, 'Chọn phạm vi "nhân viên cụ thể" mà ô chọn nhân viên không hiện').toBeVisible();
			await o.click();
			const ds = page.locator('.ant-select-dropdown:visible .ant-select-item-option');
			await expect
				.poll(() => ds.count(), { timeout: 20_000, message: 'Danh sách nhân viên rỗng — điểm bán chưa có ai' })
				.toBeGreaterThan(0);
			if ((await ds.count()) < 2) {
				test.skip(true, 'Điểm bán chỉ có 1 nhân viên — case đòi chọn 2 người.');
			}

			const ten = [chuan(await ds.nth(0).innerText()), chuan(await ds.nth(1).innerText())];
			await ds.nth(0).click();
			await ds.nth(1).click();
			await page.keyboard.press('Escape');
			await luuCauHinh(page, dr);

			// Kỳ vọng: mở lại thấy ĐÚNG hai người đã chọn.
			const lai = await moDrawerCauHinh(page);
			// 🔴 `#autoCheckinEmployeeIds` là `<input>` ẩn của antd Select; thẻ đã chọn nằm ở
			//    `.ant-select-selector` **cao hơn hai bậc**, 🚫 không phải ở cha trực tiếp —
			//    `.locator('..')` đọc ra mảng rỗng và báo nhầm là "sản phẩm không giữ lựa chọn".
			const oNV = lai.locator('.ant-select:has(#autoCheckinEmployeeIds)');
			await expect(oNV, 'Mở lại không thấy ô chọn nhân viên cụ thể').toBeVisible({ timeout: 20_000 });
			const daChonTen = (await oNV.locator('.ant-select-selection-item').allInnerTexts()).map(chuan);
			expect(daChonTen, `Mở lại không giữ đúng 2 nhân viên đã chọn (${ten.join(' · ')})`).toHaveLength(2);
			for (const t of ten) expect(daChonTen.join(' | '), `Thiếu nhân viên "${t}"`).toContain(t);
		});
	});
	/** Bấm Xác nhận, gom PUT + thông báo + lỗi dưới ô (🚫 `luuCauHinh` — nó assert PUT 200). */
	async function bamXacNhan(page, dr) {
		const gui = [];
		const nghe = (r) => { if (r.request().method() === 'PUT' && r.url().includes('/timekeeping/config/advanced-rules')) gui.push(r); };
		page.on('response', nghe);
		await dr.getByRole('button', { name: 'Xác nhận' }).click();
		await page.waitForTimeout(3_000);
		page.off('response', nghe);
		const body = gui.length ? await gui[gui.length - 1].json().catch(() => null) : null;
		const req = gui.length ? gui[gui.length - 1].request().postDataJSON() : null;
		const tb = (await page.locator('.ant-message-notice').allInnerTexts()).map(chuan);
		const loi = (await dr.locator('.ant-form-item-explain-error').allInnerTexts().catch(() => [])).map(chuan);
		return { daGui: gui.length > 0, ok: String(body?.status?.code) === '200', body, req, chu: [...tb, ...loi].join(' | ') };
	}
	const goSo = async (page, o, v) => {
		await o.click();
		await o.press('ControlOrMeta+a');
		await o.press('Delete');
		await o.pressSequentially(v, { delay: 60 });
		await o.blur();
		await page.waitForTimeout(400);
	};

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A5): chọn "nhân viên cụ thể" mà không chọn ai ⇒ CHẶN lưu, báo "Vui lòng chọn nhân viên".
	 * Trace vnpost-web f9c5c858 `pages/timekeeping/DrawerTimekeepingConfig.jsx`: `autoCheckinEmployeeIds` KHÔNG có rules ⇒ FE gửi `[]`.
	 * GHI cấu hình chấm công của điểm bán — `traLaiNguyenTrang` khôi phục.
	 */
	test('03a_030_008 — Chọn nhân viên cụ thể nhưng bỏ trống danh sách', async ({ page }) => {
		chanNeuTat('03a_030_008');
		await traLaiNguyenTrang(page, async (dr) => {
			const tuDong = dr.locator('#autoCheckinEnabled');
			if (!(await tuDong.isChecked())) { await tuDong.setChecked(true); await page.waitForTimeout(800); }
			await oRadio(dr, 'Áp dụng cho nhân viên cụ thể').click();
			await page.waitForTimeout(800);
			const oNv = dr.locator('.ant-select').filter({ has: page.locator('#autoCheckinEmployeeIds') }).first();
			for (let i = 0; i < 50 && (await oNv.locator('.ant-select-selection-item-remove, [class*="remove"]').count()); i += 1) {
				await oNv.locator('.ant-select-selection-item-remove, [class*="remove"]').first().click();
			}
			const x = await bamXacNhan(page, dr);
			test.info().annotations.push({ type: 'đo', description: `gửi PUT ${x.daGui} · ${JSON.stringify(x.body?.status)} · autoCheckinTargetType=${x.req?.autoCheckinTargetType} autoCheckinEmployeeIds=${x.req?.autoCheckinEmployeeIds} · "${x.chu}"` });
			expect(x.ok, `🔴 Lưu được "nhân viên cụ thể" với danh sách rỗng (${x.req?.autoCheckinEmployeeIds})`).toBe(false);
			expect(x.chu, 'Không báo "Vui lòng chọn nhân viên"').toContain('Vui lòng chọn nhân viên');
		});
	});

	/**
	 * Kỳ vọng user chốt 28/09/2026 (A6): số phút đi muộn / về sớm tối đa = độ dài ca (phút); vượt (9999) bị chặn, không lưu.
	 * Trace `DrawerTimekeepingConfig.jsx`: hai ô chỉ `min={0}`, KHÔNG `max`. Cấu hình áp cho cả điểm bán ⇒ trần chặt nhất = ca dài nhất
	 * (≤ 1440 phút) — 9999 vượt mọi ca. Kiểm thêm biên dưới: 0 lưu được, -5 không nhận.
	 */
	test('03a_030_009 — Biên số phút đi muộn / về sớm', async ({ page }) => {
		chanNeuTat('03a_030_009');
		await traLaiNguyenTrang(page, async (dr) => {
			const kq = {};
			for (const o of ['allowLateMinutes', 'allowEarlyMinutes']) {
				const oSo = dr.locator(`#${o}`);
				await goSo(page, oSo, '-5');
				kq[`${o}:-5`] = await oSo.inputValue();
				await goSo(page, oSo, '0');
				const x0 = await bamXacNhan(page, dr);
				kq[`${o}:0`] = x0.ok;
				dr = (await dr.isVisible().catch(() => false)) ? dr : await moDrawerCauHinh(page);
				const o2 = dr.locator(`#${o}`);
				await goSo(page, o2, '9999');
				const x = await bamXacNhan(page, dr);
				const lai = await moDrawerCauHinh(page);
				kq[`${o}:9999`] = { luu: x.ok, sauNapLai: await lai.locator(`#${o}`).inputValue(), chu: x.chu };
				dr = lai;
			}
			test.info().annotations.push({ type: 'đo', description: JSON.stringify(kq) });
			for (const o of ['allowLateMinutes', 'allowEarlyMinutes']) {
				expect(kq[`${o}:-5`], `Ô ${o} nhận số âm`).not.toMatch(/^-/);
				expect(kq[`${o}:0`], `Ô ${o} = 0 không lưu được`).toBe(true);
				expect(kq[`${o}:9999`].sauNapLai, `🔴 Ô ${o} lưu được 9999 phút (vượt độ dài mọi ca)`).not.toBe('9999');
			}
		});
	});
	/**
	 * 🔴 Sheet QC mô tả SAI ô thứ hai: **"Mỗi ca cách nhau tối đa" là `TimePicker` định dạng
	 *    `HH:mm`**, 🚫 KHÔNG phải ô số có `min={0}` (đo trong `DrawerTimekeepingConfig.jsx`
	 *    22/09/2026). Vì vậy case chỉ kiểm biên của ô SỐ `maxCombineShifts` (`min={1} max={10}`)
	 *    và kiểm ô khoảng cách nhận được một giờ hợp lệ.
	 *
	 * 🔴 `fill()` trên antd `InputNumber` 🚫 KHÔNG thay được số đang có — ô giữ nguyên giá trị cũ.
	 *    Phải xoá sạch bằng bàn phím rồi gõ, và `blur()` để đẩy vào Form trước khi bấm Xác nhận.
	 */
	test('03a_030_010 — Biên số ca gộp và khoảng cách giữa các ca', async ({ page }) => {
		chanNeuTat('03a_030_010');
		await traLaiNguyenTrang(page, async (dr) => {
			await dr.locator('#combineShiftsEnabled').setChecked(true);
			await page.waitForTimeout(1_000);
			await expect(
				dr.locator('#maxCombineShifts'),
				'Bật gộp ca mà ô "Ghi nhận cho tối đa" không hiện',
			).toBeVisible();

			/** Gõ số vào antd InputNumber: xoá sạch rồi gõ, cuối cùng blur để Form nhận. */
			const goSo = async (o, v) => {
				await o.click();
				await o.press('ControlOrMeta+a');
				await o.press('Delete');
				await o.pressSequentially(v, { delay: 60 });
				await o.blur();
				await page.waitForTimeout(400);
			};

			let cua = dr;
			for (const v of ['1', '10']) {
				const o = cua.locator('#maxCombineShifts');
				await goSo(o, v);
				expect(await o.inputValue(), `Gõ ${v} vào ô "Ghi nhận cho tối đa" mà ô không nhận`).toBe(v);
				await luuCauHinh(page, cua);

				const lai = await moDrawerCauHinh(page);
				expect(
					await lai.locator('#maxCombineShifts').inputValue(),
					`Giá trị hợp lệ ${v} không được lưu`,
				).toBe(v);
				cua = lai;
			}

			// Vượt biên: `max={10}` phải kéo về ≤ 10, 🚫 không được nhận 11.
			const o11 = cua.locator('#maxCombineShifts');
			await goSo(o11, '11');
			expect(
				Number(await o11.inputValue()),
				'Ô "Ghi nhận cho tối đa" nhận giá trị lớn hơn 10',
			).toBeLessThanOrEqual(10);

			// Ô khoảng cách là TimePicker — kiểm nó nhận được một giờ hợp lệ.
			const oGio = cua.locator('#maxHoursBetweenShifts');
			await oGio.click();
			await oGio.press('ControlOrMeta+a');
			await oGio.pressSequentially('00:30', { delay: 60 });
			await page.keyboard.press('Enter');
			await page.waitForTimeout(500);
			expect(
				await oGio.inputValue(),
				'Ô "Mỗi ca cách nhau tối đa" (TimePicker HH:mm) không nhận giá trị 00:30',
			).toBe('00:30');
		});
	});
});
