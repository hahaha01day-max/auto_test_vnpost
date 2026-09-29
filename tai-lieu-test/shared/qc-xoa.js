const fs = require('node:fs');
const path = require('node:path');

/**
 * Case QC đã xoá trên file Excel — `tool/bin/dong-bo-tu-qc.js` đánh dấu cột `Trang thai QC` = `QC_XOA`
 * trong `test-cases.csv`, KHÔNG xoá dòng và KHÔNG xoá spec.
 *
 * `qcXoaGrepInvert(DOC_ROOT)` trả RegExp cho `grepInvert` của playwright.config.js ⇒ Playwright loại
 * các test đó khỏi cả lượt chạy lẫn `--list`, spec vẫn nằm nguyên. QC thêm lại case thì script bỏ
 * đánh dấu và test tự chạy lại.
 *
 * Khớp theo mã case đứng riêng một từ trong title (`01_010_003 - …`), 🚫 không khớp mã nằm dính trong
 * mã khác (`01_010_0031`).
 */
const COT_QC = 'Trang thai QC';
const QC_XOA = 'QC_XOA';

function parseCsv(text) {
	if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
	const rows = [];
	let row = [];
	let cell = '';
	let quoted = false;
	for (let i = 0; i < text.length; i += 1) {
		const c = text[i];
		if (quoted) {
			if (c === '"') {
				if (text[i + 1] === '"') { cell += '"'; i += 1; } else quoted = false;
			} else cell += c;
			continue;
		}
		if (c === '"') { quoted = true; continue; }
		if (c === ',') { row.push(cell); cell = ''; continue; }
		if (c === '\r') continue;
		if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
		cell += c;
	}
	if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
	return rows;
}

/** Mã case bị QC xoá trong `test-cases.csv` của một phân hệ (thư mục chứa CSV). */
function qcXoaIds(docRoot) {
	const file = path.join(docRoot, 'test-cases.csv');
	if (!fs.existsSync(file)) return [];
	const rows = parseCsv(fs.readFileSync(file, 'utf8'));
	if (rows.length < 2) return [];
	const head = rows[0].map((h) => h.trim());
	const iId = head.indexOf('ID');
	const iQc = head.indexOf(COT_QC);
	if (iId < 0 || iQc < 0) return [];
	return rows.slice(1)
		.filter((r) => (r[iQc] || '').trim() === QC_XOA)
		.map((r) => (r[iId] || '').trim())
		.filter(Boolean);
}

function qcXoaGrepInvert(docRoot) {
	const ids = qcXoaIds(docRoot);
	if (!ids.length) return undefined;
	const esc = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	return new RegExp(`(?<![\\w-])(?:${esc.join('|')})(?![\\w-])`);
}

module.exports = { COT_QC, QC_XOA, qcXoaIds, qcXoaGrepInvert };
