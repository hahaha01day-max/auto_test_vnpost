/** Xoá khỏi file stub những case đã có phép kiểm thật ở spec khác. */
const fs = require('node:fs');
const path = require('node:path');
const dir = path.join(process.argv[2], 'tests');
const daCo = new Set();
for (const f of fs.readdirSync(dir)) {
	if (!f.endsWith('.spec.js') || f.startsWith('chua-chay-duoc.')) continue;
	const t = fs.readFileSync(path.join(dir, f), 'utf8');
	for (const m of t.matchAll(/([0-9][A-Za-z0-9-]*_[0-9A-Za-z]+_\d+)/g)) daCo.add(m[1]);
}
let xoa = 0;
for (const f of fs.readdirSync(dir)) {
	if (!f.startsWith('chua-chay-duoc.')) continue;
	const p = path.join(dir, f);
	let t = fs.readFileSync(p, 'utf8');
	for (const id of daCo) {
		const re = new RegExp(`\\ttest\\('${id}[^\\n]*\\n\\t\\ttest\\.skip\\([^\\n]*\\n\\t\\}\\);\\n`, 'g');
		const truoc = t.length;
		t = t.replace(re, '');
		if (t.length !== truoc) xoa += 1;
	}
	fs.writeFileSync(p, t);
}
console.log(path.basename(process.argv[2]), 'đã xoá', xoa, 'stub trùng');
