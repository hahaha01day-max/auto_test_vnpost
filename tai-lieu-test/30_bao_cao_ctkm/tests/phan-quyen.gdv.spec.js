'use strict';

/** 30 · Phạm vi vai `gdv` trên báo cáo CTKM. 🚫 KHÔNG ghi. */

const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { loadCaseInput, skipReason } = require('../../shared/test-input');
const { chanGhi, dong, moMan, okHet, tomTat } = require('./ctkm-page');

const GOC = path.join(__dirname, '..');

test('30_PQ_001 — Vai điểm bán chỉ thấy số liệu CTKM trong phạm vi', async ({ page }) => {
	const i = loadCaseInput(GOC, '30_PQ_001');
	const ly = skipReason(i);
	test.skip(Boolean(ly), ly ?? '');

	await chanGhi(page);
	const kq = await moMan(page, 'gdv');
	test.info().annotations.push({ type: 'API báo cáo CTKM (http/code)', description: tomTat(kq) });
	if (kq.length === 0) test.skip(true, 'Vai gdv không phát sinh lời gọi báo cáo nào để đo.');
	// 🔴 User chốt 28/09/2026: GDV KHÔNG được xem báo cáo CTKM ⇒ mọi API báo cáo phải từ chối vai gdv
	//    (BE trả lỗi quyền dạng HTTP 200 + code SSHOP-401). Lọt một API trả dữ liệu là lộ số liệu.
	const lot = kq.filter((x) => okHet([x]));
	expect(lot.length, `Vai GDV vẫn đọc được báo cáo CTKM ở: ${tomTat(lot)}`).toBe(0);
});
