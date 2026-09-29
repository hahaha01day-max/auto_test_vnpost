/**
 * Sinh file `chua-chay-duoc.<vai>.spec.js` cho các case CHƯA có script.
 * Dùng: node scratchpad/genstub.js <thư mục phân hệ>
 * 🔴 Mọi test sinh ra đều `test.skip(true, '<lý do>')` — 🚫 không bao giờ để pass rỗng.
 */
const fs = require('node:fs');
const path = require('node:path');

const goc = path.resolve(process.argv[2]);
const cases = JSON.parse(fs.readFileSync(path.join(goc, 'test-input.json'), 'utf8')).cases;
const csv = fs.readFileSync(path.join(goc, 'test-cases.csv'), 'utf8');
const ten = new Map();
for (const m of csv.matchAll(/^([0-9][^,]*),("(?:[^"]|"")*"|[^,]*)/gm)) {
	ten.set(m[1], m[2].replace(/^"|"$/g, '').replace(/""/g, '"'));
}

// Case đã có script: quét mọi chuỗi trong tests/*.spec.js (trừ file stub).
const daCo = new Set();
const tests = path.join(goc, 'tests');
for (const f of fs.existsSync(tests) ? fs.readdirSync(tests) : []) {
	if (!f.endsWith('.spec.js') || f.startsWith('chua-chay-duoc.')) continue;
	const t = fs.readFileSync(path.join(tests, f), 'utf8');
	for (const m of t.matchAll(/['"`]([0-9][A-Za-z0-9_]*_[A-Za-z0-9]+_?\d*)/g)) daCo.add(m[1]);
}

const theoVai = new Map();
for (const [id, c] of Object.entries(cases)) {
	if (daCo.has(id)) continue;
	const vai = c.role || 'gdv';
	if (!theoVai.has(vai)) theoVai.set(vai, []);
	theoVai.get(vai).push([id, c]);
}

const lyDo = (id, c) =>
	c.missingRoleReason ||
	c.blockedReason ||
	c._blocked ||
	(c.mutates ? `Case ${id} GHI dữ liệu thật (mutates) — chỉ chạy khi user bật allowMutation.` : null) ||
	`Case ${id}: chưa có phép kiểm tự động — cần thao tác/dữ liệu chưa dựng được an toàn.`;

for (const [vai, ds] of theoVai) {
	const than = ds
		.map(
			([id, c]) =>
				`\ttest(${JSON.stringify(`${id} — ${ten.get(id) || id}`)}, async () => {\n` +
				`\t\ttest.skip(true, ${JSON.stringify(lyDo(id, c))});\n\t});\n`,
		)
		.join('');
	const noi =
		`'use strict';\n\n/**\n * Các case **CHƯA CHẠY ĐƯỢC** của vai \`${vai}\`.\n *\n` +
		` * 🔴 Mọi test ở đây skip KÈM LÝ DO: báo cáo phải phân biệt *"đã kiểm và đạt"* với\n` +
		` * *"chưa ai kiểm"*. 🚫 Tuyệt đối không để test rỗng chạy xong rồi XANH.\n */\n\n` +
		`const { test } = require('@playwright/test');\n\n` +
		`test.describe('Case chưa chạy được (vai ${vai})', () => {\n${than}});\n`;
	fs.writeFileSync(path.join(tests, `chua-chay-duoc.${vai}.spec.js`), noi);
	console.log(vai, ds.length);
}
