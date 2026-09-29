#!/usr/bin/env node
'use strict';

/**
 * ĐỐI CHIẾU script auto test với code `vnpost-web` — màn nào đã SỬA từ lúc viết spec, màn nào MỚI
 * chưa có script, mốc nào HỎNG. Chỉ đọc, 🚫 không sửa file nào.
 *
 *   node tool/bin/fe-thay-doi.js                 # mọi phân hệ
 *   node tool/bin/fe-thay-doi.js --phan-he 12_1  # một phân hệ (khớp tiền tố tên thư mục)
 *   node tool/bin/fe-thay-doi.js --json          # in JSON cho máy đọc
 *
 * Nguồn mốc: `tai-lieu-test/<NN>/fe-moc.json` — mỗi spec một mốc commit + danh sách file FE đã trace
 * + route màn (định dạng: xem skill `auto-test`, bước "Ghi mốc FE").
 *
 * 🔴 Gọi `git` TRỰC TIẾP bằng `execFileSync`, 🚫 qua shell: hook rtk rewrite lệnh git trong shell và
 *    từng in SAI commit của `git log -1` (đo 23/09/2026: `rev-parse` ra af8cda07, `git log` qua rtk ra
 *    09426654) ⇒ so mốc bằng output đó là so nhầm commit.
 * 🔴 So với HEAD của repo `vnpost-web` trên MÁY NÀY — 🚫 phải bản đang deploy trên Server dev. Muốn
 *    đối chiếu bản deploy thì checkout đúng commit của bản đó trước.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const AUTO = path.join(__dirname, '..', '..');
const TAI_LIEU = process.env.VNPOST_TAI_LIEU_DIR || path.join(AUTO, 'tai-lieu-test');
const WEB = process.env.VNPOST_WEB_DIR || path.join(AUTO, '..', 'vnpost-web');

const arg = (ten) => { const i = process.argv.indexOf(ten); return i > 0 ? process.argv[i + 1] : null; };
const LOC = arg('--phan-he');
const JSON_RA = process.argv.includes('--json');

function git(...a) {
	return execFileSync('git', ['-C', WEB, ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
const gitOk = (...a) => { try { git(...a); return true; } catch { return false; } };

// ─── Route của vnpost-web ────────────────────────────────────────────────────────────────────────

/**
 * Mọi hằng dạng object trong `utils/constants/config.jsx` (`route`, `routeKey`,
 * `PURCHASE_REQUEST_ROUTE_PATTERNS`…) → map `"<object>.<KEY>"` → đường dẫn. Giá trị là chuỗi, hoặc
 * tham chiếu `route.X` (giải ở lượt 2).
 */
function hangRoute() {
	const s = fs.readFileSync(path.join(WEB, 'src/utils/constants/config.jsx'), 'utf8');
	const m = {};
	const thamChieu = {};
	for (const khoi of s.matchAll(/export const ([A-Za-z0-9_]+)\s*=\s*\{([\s\S]*?)\n\};/g)) {
		const [, obj, than] = khoi;
		for (const [, k, v] of than.matchAll(/^\s*([A-Z0-9_]+)\s*:\s*["'`](\/[^"'`]*)["'`]/gm)) if (!(`${obj}.${k}` in m)) m[`${obj}.${k}`] = v;
		for (const [, k, ref] of than.matchAll(/^\s*([A-Z0-9_]+)\s*:\s*([a-zA-Z0-9_]+\.[A-Z0-9_]+)\s*,/gm)) thamChieu[`${obj}.${k}`] = ref;
	}
	for (const [k, ref] of Object.entries(thamChieu)) if (!(k in m) && m[ref]) m[k] = m[ref];
	return m;
}

/**
 * Mọi route khai trong `src/routes/configs/**` (bỏ `*.bak.js`). Parser tĩnh: tìm `path: <biểu thức>`
 * rồi lấy `lazy`/`element`/`Component` + `handle.name` gần nhất phía sau (trước `path:` kế tiếp).
 * 🔴 Biểu thức không giải được (vd `PR.LIST`, template) vẫn giữ nguyên để người đọc thấy, 🚫 nuốt mất.
 */
function dsRoute() {
	const hang = hangRoute();
	const goc = path.join(WEB, 'src/routes/configs');
	const tep = [];
	const duyet = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) duyet(p); else if (/\.jsx?$/.test(f) && !/\.bak\./.test(f)) tep.push(p); } };
	duyet(goc);
	const ra = [];
	for (const f of tep) {
		const s = fs.readFileSync(f, 'utf8');
		// Bí danh trong file: `const PR = PURCHASE_REQUEST_ROUTE_PATTERNS;`
		const biDanh = Object.fromEntries([...s.matchAll(/const ([A-Z][A-Za-z0-9_]*)\s*=\s*([A-Z][A-Z0-9_]+);/g)].map((x) => [x[1], x[2]]));
		const giai = (bt) => {
			const r = bt.match(/^([A-Za-z0-9_]+)\.([A-Z0-9_]+)$/);
			if (r) return hang[`${biDanh[r[1]] || r[1]}.${r[2]}`] || null;
			const lit = bt.match(/^["'`]([^"'`$]*)["'`]$/);
			return lit ? lit[1] : null;
		};
		const vt = [...s.matchAll(/\bpath\s*:\s*([^,\n}]+)/g)];
		const muc = vt.map((m, i) => {
			const bieuThuc = m[1].trim();
			const doan = s.slice(m.index, i + 1 < vt.length ? vt[i + 1].index : s.length);
			return { bieuThuc, doan, duong: giai(bieuThuc) };
		});
		// Đường dẫn TƯƠNG ĐỐI (`"return-to-supplier"`) nằm trong danh sách con của route cha dạng
		// `routeKey.X` + `children:` cùng file ⇒ ghép với cha đó (chỉ khi file có đúng MỘT cha như vậy).
		const cha = muc.filter((x) => /^routeKey\./.test(x.bieuThuc) && x.duong);
		for (const x of muc) {
			if (x.duong && !x.duong.startsWith('/')) x.duong = cha.length === 1 ? `${cha[0].duong.replace(/\/$/, '')}/${x.duong}` : null;
			const comp = (x.doan.match(/\b(?:lazy|Component)\s*:\s*([A-Za-z0-9_]+)/) || x.doan.match(/element\s*:\s*<\s*([A-Za-z0-9_]+)/) || [])[1] || null;
			const ten = (x.doan.match(/\bname\s*:\s*["'`]([^"'`]+)["'`]/) || [])[1] || null;
			const dau = x.doan.split('\n').slice(0, 4).join('\n');
			// Bỏ route chuyển hướng / nhóm menu chỉ chứa con: không có màn riêng để viết script.
			if (/Navigate|legacy\w*Redirect|DynamicIndexRedirect/.test(dau) && !comp) continue;
			if (/^routeKey\./.test(x.bieuThuc) && !comp) continue;
			// Vỏ bọc chỉ render con (`Outlet`) hoặc chuyển hướng: 🚫 phải màn.
			if (/^(Outlet|DynamicIndexRedirect|Navigate)$/.test(comp || '')) continue;
			// Trang chụp ảnh HDSD / demo (`routes/configs/public`): không phải màn nghiệp vụ, 🚫 cần script.
			if (/_(SHOT|DEMO)_PATH$/.test(x.bieuThuc)) continue;
			ra.push({ duong: x.duong, bieuThuc: x.bieuThuc, comp, ten, tep: path.relative(WEB, f) });
		}
	}
	return ra;
}

/** `/supplier/:id/products` và `/supplier/123/products` coi là một màn. */
const chuanDuong = (p) => String(p || '').replace(/\/+$/, '').replace(/\/:[^/]+/g, '/:x').replace(/\/\d+(?=\/|$)/g, '/:x') || '/';

// ─── Mốc của các phân hệ ─────────────────────────────────────────────────────────────────────────

function docMoc() {
	const ra = [];
	for (const d of fs.readdirSync(TAI_LIEU).sort()) {
		if (LOC && !d.startsWith(LOC)) continue;
		const f = path.join(TAI_LIEU, d, 'fe-moc.json');
		if (!fs.existsSync(f)) continue;
		let j;
		try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { ra.push({ phanHe: d, loiDoc: e.message }); continue; }
		for (const [spec, m] of Object.entries(j.spec || {})) ra.push({ phanHe: d, spec, ...m });
	}
	return ra;
}

function main() {
	if (!fs.existsSync(path.join(WEB, '.git'))) throw new Error(`Không thấy repo vnpost-web ở ${WEB} (đặt VNPOST_WEB_DIR).`);
	const head = git('rev-parse', 'HEAD');
	const nhanh = git('branch', '--show-current') || '(detached)';
	const suaDo = git('status', '--porcelain', '--', 'src').split('\n').filter(Boolean);

	const moc = docMoc();
	const daSua = [];
	const hong = [];
	const manDaKhai = new Set();

	for (const m of moc) {
		if (m.loiDoc) { hong.push({ phanHe: m.phanHe, spec: 'fe-moc.json', loi: `không đọc được: ${m.loiDoc}` }); continue; }
		for (const r of m.man || []) manDaKhai.add(chuanDuong(r));
		if (!m.commit || !gitOk('cat-file', '-e', `${m.commit}^{commit}`)) {
			hong.push({ phanHe: m.phanHe, spec: m.spec, loi: `commit mốc "${m.commit || '(trống)'}" không có trong repo (rebase/nhánh khác?)` });
			continue;
		}
		const fe = m.fe || [];
		if (!fe.length) { hong.push({ phanHe: m.phanHe, spec: m.spec, loi: 'không khai file FE nào — không so được' }); continue; }
		const mat = fe.filter((f) => !gitOk('cat-file', '-e', `HEAD:${f}`));
		for (const f of mat) hong.push({ phanHe: m.phanHe, spec: m.spec, loi: `file ${f} không còn ở HEAD (xoá/đổi tên — màn có thể đã viết lại)` });
		const conLai = fe.filter((f) => !mat.includes(f));
		if (!conLai.length) continue;
		const log = git('log', '--format=%h|%ad|%an|%s', '--date=short', `${m.commit}..HEAD`, '--', ...conLai).split('\n').filter(Boolean);
		const tepDoi = log.length ? git('diff', '--name-only', `${m.commit}..HEAD`, '--', ...conLai).split('\n').filter(Boolean) : [];
		const dangSua = suaDo.map((x) => x.slice(3)).filter((x) => conLai.includes(x));
		if (log.length || dangSua.length) {
			daSua.push({
				phanHe: m.phanHe, spec: m.spec, moc: m.commit.slice(0, 8), ngayMoc: m.ngay || '',
				commit: log.map((l) => { const [h, d, a, ...s] = l.split('|'); return { h, d, a, s: s.join('|') }; }),
				tepDoi, dangSua,
			});
		}
	}

	const routes = dsRoute();
	const daThay = new Set();
	const manMoi = routes.filter((r) => {
		if (!r.duong || manDaKhai.has(chuanDuong(r.duong)) || daThay.has(chuanDuong(r.duong))) return false;
		daThay.add(chuanDuong(r.duong));
		return true;
	});
	const khongGiai = routes.filter((r) => !r.duong);

	const kq = { vnpostWeb: { head, nhanh, suaDoSrc: suaDo.length }, soMoc: moc.length, daSua, manMoi, khongGiai, hong };
	if (JSON_RA) { console.log(JSON.stringify(kq, null, 2)); return; }

	console.log(`vnpost-web: ${nhanh} @ ${head.slice(0, 8)}${suaDo.length ? `  ⚠️ ${suaDo.length} file trong src/ đang sửa dở chưa commit` : ''}`);
	console.log(`Mốc đọc được: ${moc.length} spec${LOC ? ` (lọc "${LOC}")` : ''}\n`);

	console.log(`== 1. Màn đã sửa từ mốc — cần xem lại spec (${daSua.length})`);
	for (const x of daSua) {
		console.log(`${x.phanHe}  ${x.spec}   mốc ${x.moc}${x.ngayMoc ? ` (${x.ngayMoc})` : ''} → ${x.commit.length} commit`);
		for (const c of x.commit.slice(0, 8)) console.log(`      ${c.h} ${c.d} ${c.a}: ${c.s}`);
		if (x.commit.length > 8) console.log(`      … ${x.commit.length - 8} commit nữa`);
		for (const f of x.tepDoi) console.log(`      ~ ${f}`);
		for (const f of x.dangSua) console.log(`      ✎ ${f} (đang sửa dở, chưa commit)`);
	}

	const tongMan = new Set(routes.filter((r) => r.duong).map((r) => chuanDuong(r.duong))).size;
	console.log(`\n== 2. Màn chưa có spec nào khai (${manMoi.length}/${tongMan} màn)`);
	if (!LOC) {
		for (const r of manMoi) console.log(`${r.duong.padEnd(48)} ${r.ten || ''}${r.comp ? `  [${r.comp}]` : ''}  — ${r.tep}`);
		if (khongGiai.length) {
			console.log(`\n   ${khongGiai.length} route có path không giải tĩnh được (tra tay):`);
			for (const r of khongGiai) console.log(`   ${r.bieuThuc.padEnd(46)} ${r.ten || ''}  — ${r.tep}`);
		}
	} else {
		console.log('   (bỏ qua khi lọc --phan-he: cần mốc của MỌI phân hệ mới biết màn nào chưa ai khai)');
	}

	console.log(`\n== 3. Mốc hỏng (${hong.length})`);
	for (const x of hong) console.log(`${x.phanHe}  ${x.spec}   ${x.loi}`);
}

try { main(); } catch (e) { console.error(`LỖI: ${e.message}`); process.exit(1); }
