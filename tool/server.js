'use strict';

/**
 * Lớp web — CỐ TÌNH MỎNG.
 *
 * 🔴 Quy tắc: file này chỉ dịch HTTP ↔ hàm trong `core/`. Không có logic nghiệp vụ nào ở đây.
 * Nhờ vậy đổi lớp hiển thị (Electron, React, CLI) không phải viết lại phần lõi — và ngược lại,
 * sửa lõi không phải mò trong route.
 */

const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const session = require('express-session');
const ejs = require('ejs');

const { listModules, getModule } = require('./core/modules');
const { getCases } = require('./core/cases');
const profiles = require('./core/profiles');
const caseInputs = require('./core/inputs');
const inputsXlsx = require('./core/inputs-xlsx');
const runner = require('./core/runner');
const report = require('./core/report');
const seedCore = require('./core/seed');
const songSong = require('./core/songSong');
const { runDir, getDb } = require('./core/db');
const auth = require('./web/auth');
const { verifyProfile } = require('./web/verify');
const retention = require('./core/retention');
const { SqliteSessionStore } = require('./web/sessionStore');

/** Thư mục chứa ảnh/video/trace của một run. */
function artifactsDir(runId) {
  return path.join(runDir(runId), 'artifacts');
}

const VIEWS = path.join(__dirname, 'views');
const PORT = Number(process.env.TOOL_PORT || 4100);

const app = express();
app.disable('x-powered-by');
// `extended: true` + limit rộng: form input của M5 gửi mỗi field một ô, module nhiều case thì
// vượt mặc định 1000 field của Express và phần sau bị CẮT ÂM THẦM — người dùng lưu xong thấy
// vài case không đổi gì mà không có lỗi nào.
app.use(express.urlencoded({ extended: true, limit: '5mb', parameterLimit: 20000 }));
// Nạp Excel: trình duyệt POST thẳng nhị phân (xem views/inputs.ejs), không cần multer.
app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));
app.use('/static', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

app.use(
  session({
    // 🔴 KHÔNG dùng MemoryStore mặc định — mỗi lần restart là cả nhóm bị đăng xuất. Xem web/sessionStore.js.
    store: new SqliteSessionStore(),
    secret: process.env.TOOL_SESSION_SECRET || process.env.TOOL_SECRET_KEY || 'doi-secret-nay-di',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 12 * 60 * 60 * 1000 },
  }),
);

/** Render một view con rồi lồng vào layout. */
function page(res, view, data) {
  const body = ejs.render(fs.readFileSync(path.join(VIEWS, `${view}.ejs`), 'utf8'), data, { filename: path.join(VIEWS, `${view}.ejs`) });
  res.send(
    ejs.render(fs.readFileSync(path.join(VIEWS, 'layout.ejs'), 'utf8'), {
      ...data,
      body,
    }),
  );
}

function fragment(res, view, data) {
  res.send(ejs.render(fs.readFileSync(path.join(VIEWS, `${view}.ejs`), 'utf8'), data));
}

const STATUS_CLASS = {
  PASSED: 'b-pass',
  FAILED: 'b-fail',
  SETUP_FAILED: 'b-fail',
  ERROR: 'b-fail',
  RUNNING: 'b-run',
  QUEUED: 'b-no',
  STOPPED: 'b-no',
};

// ─── Đăng nhập ────────────────────────────────────────────────────────────────

app.get('/login', (req, res) => {
  res.send(
    ejs.render(fs.readFileSync(path.join(VIEWS, 'login.ejs'), 'utf8'), {
      error: req.query.error || '',
      next: req.query.next || '/',
    }),
  );
});

app.post('/login', (req, res) => {
  const user = auth.authenticate(req.body.username, req.body.password);
  if (!user) return res.redirect(`/login?error=${encodeURIComponent('Sai tên đăng nhập hoặc mật khẩu.')}`);

  req.session.user = user;
  res.redirect(req.body.next || '/');
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.use(auth.requireLogin);
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});

// ─── M1: hồ sơ môi trường ─────────────────────────────────────────────────────

app.get('/', (req, res) => {
  const list = profiles.listProfiles().map((p) => {
    const full = profiles.getProfile(p.id);
    return {
      ...p,
      ready: full.accounts.filter((a) => a.configured).map((a) => a.key),
      missing: full.accounts.filter((a) => !a.configured).map((a) => a.key),
    };
  });
  page(res, 'profiles', { title: 'Hồ sơ môi trường', user: req.session.user, profiles: list });
});

app.post('/profiles', (req, res) => {
  profiles.createProfile({
    name: req.body.name,
    baseUrl: req.body.baseUrl,
    apiBaseUrl: req.body.apiBaseUrl,
    isProd: Boolean(req.body.isProd),
    createdBy: req.session.user.username,
  });
  res.redirect('/');
});

app.get('/profiles/:id', (req, res) => {
  const profile = profiles.getProfile(Number(req.params.id));
  if (!profile) return res.status(404).send('Không có hồ sơ này.');
  page(res, 'profile', { title: profile.name, user: req.session.user, profile });
});

app.post('/profiles/:id', (req, res) => {
  profiles.updateProfile(Number(req.params.id), {
    name: req.body.name,
    baseUrl: req.body.baseUrl,
    apiBaseUrl: req.body.apiBaseUrl,
    isProd: Boolean(req.body.isProd),
  });
  res.redirect(`/profiles/${req.params.id}`);
});

app.post('/profiles/:id/accounts/:role', (req, res) => {
  profiles.setAccount(Number(req.params.id), req.params.role, {
    account: req.body.account,
    // 🔴 Ô mật khẩu để trống = GIỮ NGUYÊN, không phải xoá. Xem `core/profiles.js`.
    password: req.body.password ? req.body.password : undefined,
    scopeLabel: req.body.scopeLabel,
  });
  res.redirect(`/profiles/${req.params.id}`);
});

app.post('/profiles/:id/verify', async (req, res) => {
  try {
    const result = await verifyProfile(Number(req.params.id));
    fragment(res, '_verify', { result });
  } catch (err) {
    res.send(`<div class="err">${err.message}</div>`);
  }
});

// ─── M2: chọn case ────────────────────────────────────────────────────────────

app.get('/modules', (req, res) => {
  page(res, 'modules', {
    title: 'Chọn & chạy',
    user: req.session.user,
    modules: listModules(),
    profiles: profiles.listProfiles(),
  });
});

app.get('/modules/:id', (req, res) => {
  const mod = getModule(req.params.id);
  if (!mod) return res.status(404).send('Không có module này.');

  const result = getCases(mod);
  // Cảnh báo input NGAY ở màn chọn case: case thiếu input bắt buộc vẫn tick và chạy được, nhưng
  // sẽ SKIP giữa chừng — không nói trước thì người dùng chỉ thấy "0 case chạy" mà không rõ vì sao.
  const described = caseInputs.describe(mod, inputProfileId(req), result.cases);

  page(res, 'cases', {
    title: mod.name,
    user: req.session.user,
    mod,
    profiles: profiles.listProfiles(),
    inputs: described,
    cases: result.cases,
    stats: result.stats,
    projects: result.projects,
    error: result.error,
  });
});

// ─── M5: dữ liệu đầu vào của case ─────────────────────────────────────────────

/** Hồ sơ đang xem input — nhớ theo phiên để chuyển module không phải chọn lại. */
function inputProfileId(req) {
  // Express 5 để `req.body` là undefined khi request không có body (mọi GET) — đọc thẳng là ném
  // TypeError và cả trang 500, dù chỉ thiếu một tham số tuỳ chọn.
  const fromQuery = Number(req.query.profileId || (req.body && req.body.profileId) || 0);
  if (fromQuery) req.session.inputProfileId = fromQuery;
  return req.session.inputProfileId || (profiles.listProfiles()[0] || {}).id || null;
}

function inputsPage(res, req, mod, extra = {}) {
  const profileId = inputProfileId(req);
  const described = caseInputs.describe(mod, profileId, getCases(mod).cases);

  page(res, 'inputs', {
    title: `Input — ${mod.name}`,
    user: req.session.user,
    mod,
    profiles: profiles.listProfiles(),
    profileId,
    profile: profileId ? profiles.getProfile(profileId) : null,
    described,
    notice: '',
    preview: null,
    ...extra,
  });
}

app.get('/modules/:id/inputs', (req, res) => {
  const mod = getModule(req.params.id);
  if (!mod) return res.status(404).send('Không có module này.');
  inputsPage(res, req, mod, { notice: req.query.notice || '' });
});

app.post('/modules/:id/inputs', (req, res) => {
  const mod = getModule(req.params.id);
  if (!mod) return res.status(404).send('Không có module này.');

  const profileId = Number(req.body.profileId);
  if (!profileId) return res.status(400).send('Chưa chọn hồ sơ môi trường.');

  // Form gửi `f[<caseId>][<field>]`. Ô để TRỐNG = bỏ lớp đè, không phải đè bằng chuỗi rỗng.
  const entries = [];
  for (const [caseId, fields] of Object.entries(req.body.f || {})) {
    for (const [field, value] of Object.entries(fields || {})) entries.push({ caseId, field, value });
  }
  // Checkbox KHÔNG gửi gì khi bỏ tick → phải liệt kê riêng, nếu không bỏ tick allowMutation
  // sẽ không được ghi nhận và case ghi dữ liệu vẫn chạy thật.
  for (const key of [].concat(req.body.flagKeys || []).filter(Boolean)) {
    const sep = key.lastIndexOf('::');
    const caseId = key.slice(0, sep);
    const field = key.slice(sep + 2);
    entries.push({ caseId, field, value: req.body.flags && req.body.flags[key] ? 'true' : 'false' });
  }

  // Giá trị trùng mặc định thì KHÔNG lưu thành lớp đè — xem `normalizeAgainstTemplate`.
  const result = caseInputs.setOverrides(
    profileId,
    mod.id,
    caseInputs.normalizeAgainstTemplate(mod, entries),
    req.session.user.username,
  );
  res.redirect(`/modules/${mod.id}/inputs?notice=${encodeURIComponent(`Đã lưu: ${result.written} giá trị đè, ${result.cleared} ô trả về mặc định.`)}`);
});

app.post('/modules/:id/inputs/reset', (req, res) => {
  const mod = getModule(req.params.id);
  if (!mod) return res.status(404).send('Không có module này.');

  const profileId = Number(req.body.profileId);
  const removed = caseInputs.clearModule(profileId, mod.id);
  res.redirect(`/modules/${mod.id}/inputs?notice=${encodeURIComponent(`Đã xoá ${removed} giá trị đè, mọi case về đúng test-input.json.`)}`);
});

app.get('/modules/:id/inputs/template.xlsx', async (req, res) => {
  const mod = getModule(req.params.id);
  if (!mod) return res.status(404).send('Không có module này.');

  const wb = await inputsXlsx.buildTemplate(mod, inputProfileId(req), getCases(mod).cases);
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="input-${mod.id}.xlsx"`,
  });
  await wb.xlsx.write(res);
  res.end();
});

/** Nạp Excel → CHỈ dựng bảng đối chiếu, chưa ghi gì. Ghi ở `/inputs/import/apply`. */
app.post('/modules/:id/inputs/import', async (req, res) => {
  const mod = getModule(req.params.id);
  if (!mod) return res.status(404).send('Không có module này.');

  const profileId = inputProfileId(req);
  try {
    const preview = await inputsXlsx.parseUpload(req.body, mod, profileId, getCases(mod).cases);
    inputsPage(res, req, mod, { preview });
  } catch (err) {
    inputsPage(res, req, mod, { notice: `Không đọc được file: ${err.message}` });
  }
});

app.post('/modules/:id/inputs/import/apply', (req, res) => {
  const mod = getModule(req.params.id);
  if (!mod) return res.status(404).send('Không có module này.');

  const profileId = Number(req.body.profileId);
  // Mỗi dòng của bảng đối chiếu đi kèm form dưới dạng JSON — không cần giữ state phía server
  // giữa bước xem trước và bước xác nhận (server dùng chung, giữ state là chỗ rò rỉ và lẫn người).
  const rows = [].concat(req.body.row || []).filter(Boolean).map((raw) => JSON.parse(raw));

  const result = inputsXlsx.applyRows(mod, profileId, rows, req.session.user.username);
  res.redirect(`/modules/${mod.id}/inputs?notice=${encodeURIComponent(`Nạp Excel xong: ${result.written} giá trị đè, ${result.cleared} ô trả về mặc định.`)}`);
});

// ─── M3: chạy & theo dõi ──────────────────────────────────────────────────────

app.post('/runs', (req, res) => {
  const caseIds = [].concat(req.body.caseIds || []).filter(Boolean);
  const wholeModule = Boolean(req.body.wholeModule);

  try {
    const run = runner.enqueue({
      profileId: Number(req.body.profileId),
      moduleId: req.body.moduleId,
      caseIds,
      wholeModule,
      createdBy: req.session.user.username,
    });
    res.redirect(`/runs/${run.id}`);
  } catch (err) {
    res.status(400).send(`<div class="err">${err.message}</div><p><a href="/modules/${req.body.moduleId}">Quay lại</a></p>`);
  }
});


/**
 * SINH DỮ LIỆU NỀN — chạy các bước seed qua đúng cỗ máy run đã có (hàng đợi, log, artifact).
 *
 * 🔴 Mỗi bước là MỘT run riêng, xếp hàng theo thứ tự: bước sau đọc bản ghi bước trước qua
 * `00_seed/seed-state.json`. Gộp nhiều bước vào một run là mất ranh giới, hỏng bước 3 thì
 * không biết bước 4 đã chạy trên dữ liệu rỗng hay chưa.
 *
 * 🔴 `caseIds` ở đây là chuỗi grep (`"seed 3"`), khớp tiền tố tên test của bước — xem
 * `core/seed.js`. Đó là lý do tên test bắt buộc mở đầu bằng `seed <số>.<n> — …`.
 */
app.get('/seed', (req, res) => {
  page(res, 'seed', {
    title: 'Sinh dữ liệu nền',
    user: req.session.user,
    // 🔴 Mỗi lần "Tạo dữ liệu" là MỘT BỘ MỚI (một làn), 🚫 không chạy đè bộ cũ — xem LANE.md.
    moi: seedCore.boMoi(),
    bo: seedCore.listBo(),
    profiles: profiles.listProfiles(),
    thongBao: req.query.tb || '',
    seedBuoc: (so) => seedCore.BUOC.find((b) => b.so === so),
    phuThuoc: seedCore.PHU_THUOC,
    vaiTro: seedCore.VAI_TRO,
  });
});

/** Xếp hàng các bước seed (bằng API) của một làn, mỗi bước MỘT run, theo thứ tự. */
function xepHangSeed({ lane, profileId, buoc, by }) {
  let dau = null;
  for (const so of buoc) {
    if (!seedCore.daCoSpec(so, true)) continue;
    const run = runner.enqueue({
      profileId: Number(profileId),
      moduleId: seedCore.SEED_MODULE_ID,
      caseIds: seedCore.grepCacCuaBuoc(so),
      createdBy: by,
      seedLane: String(lane),
    });
    dau = dau || run.id;
  }
  return dau;
}

app.post('/seed/tao', (req, res) => {
  try {
    if ([].concat(req.body.buoc || []).length === 0) throw new Error('Chưa chọn bước nào để tạo.');
    const giaTri = {};
    for (const [k, v] of Object.entries(req.body)) if (k.startsWith('gt__')) giaTri[k.slice(4)] = v;
    // 🔴 Nhớ môi trường tạo bộ — dữ liệu bộ chỉ có ở đó; "Chạy tiếp" 🚫 được đổi sang môi trường khác.
    const { lane } = seedCore.taoBo({ lane: req.body.lane, runId: req.body.runId, prefix: req.body.prefix, giaTri, by: req.session.user.username, profileId: req.body.profileId });
    // Server tự tính lại bao đóng phụ thuộc — 🚫 tin vào ô tích của trình duyệt (tắt JS là lọt).
    const buoc = seedCore.kemPhuThuoc([].concat(req.body.buoc || []));
    if (buoc.length === 0) throw new Error('Chưa chọn bước nào để tạo.');
    xepHangSeed({ lane, profileId: req.body.profileId, buoc, by: req.session.user.username });
    res.redirect(`/seed/bo/${lane}`);
  } catch (err) {
    res.status(400).send(`<div class="err">${err.message}</div><p><a href="/seed">Quay lại</a></p>`);
  }
});

/**
 * Tiến độ CẢ BỘ trên một màn: mỗi bước lấy run MỚI NHẤT của nó (theo làn), kèm log của bước đang chạy
 * (hoặc bước vừa kết thúc). Trình duyệt poll `/seed/bo/:lane/state` — 🚫 bắt tester nhảy qua từng run.
 */
function tienDoBo(lane) {
  const rows = getDb().prepare('SELECT id FROM runs WHERE module_id = ? ORDER BY queued_at ASC').all(seedCore.SEED_MODULE_ID);
  const moiNhat = {};
  for (const { id } of rows) {
    const r = runner.getRun(id);
    if (r?.envSnapshot?.seedLane !== String(lane)) continue;
    const so = Number(String(r.caseIds[0] || '').replace(/^seed /, ''));
    if (so) moiNhat[so] = r;
  }
  const bo = seedCore.listBo().find((b) => b.lane === String(lane));
  const buoc = seedCore.BUOC.map((b) => {
    const r = moiNhat[b.so];
    const xong = Boolean(bo?.buoc.find((x) => x.so === b.so)?.xong);
    return {
      so: b.so, ten: b.ten, xong, runId: r?.id || null, status: r?.status || null,
      nhan: r ? (report.RUN_STATUS_LABEL[r.status] || r.status) : (xong ? 'Đã có' : 'Chưa chạy'),
      lop: r ? (STATUS_CLASS[r.status] || 'b-no') : (xong ? 'b-pass' : 'b-no'),
      loi: r?.error || '',
    };
  });
  const dangChay = buoc.find((b) => b.status === 'RUNNING');
  const cuoi = [...buoc].reverse().find((b) => b.runId && !['QUEUED'].includes(b.status));
  const xem = dangChay || cuoi || null;
  return {
    lane: String(lane), prefix: bo?.prefix || '', profileId: bo?.profileId || null, buoc,
    conChay: buoc.some((b) => ['QUEUED', 'RUNNING'].includes(b.status)),
    soXong: buoc.filter((b) => b.xong).length,
    log: xem ? { so: xem.so, ten: xem.ten, runId: xem.runId, dong: runner.logTail(xem.runId).slice(-300).join('\n') } : null,
  };
}

app.get('/seed/bo/:lane', (req, res) => {
  page(res, 'seed-bo', { title: `Bộ dữ liệu ${req.params.lane}`, user: req.session.user, t: tienDoBo(req.params.lane), profiles: profiles.listProfiles() });
});
app.get('/seed/bo/:lane/state', (req, res) => res.json(tienDoBo(req.params.lane)));

/** Chạy tiếp các bước CHƯA xong của một bộ (vd bộ hỏng giữa chừng). Bước đã xong 🚫 chạy lại. */
app.post('/seed/chay-tiep', (req, res) => {
  try {
    const bo = seedCore.listBo().find((b) => b.lane === String(req.body.lane));
    if (!bo) throw new Error(`Không có bộ dữ liệu ${req.body.lane}`);
    const buoc = bo.buoc.filter((b) => !b.xong).map((b) => b.so);
    // Bộ cũ (tạo trước khi sổ nhớ môi trường) mới lấy theo ô chọn.
    const profileId = bo.profileId || req.body.profileId;
    if (!profileId) throw new Error('Bộ này chưa rõ môi trường — chọn môi trường rồi bấm lại.');
    xepHangSeed({ lane: bo.lane, profileId, buoc, by: req.session.user.username });
    res.redirect(`/seed/bo/${bo.lane}`);
  } catch (err) {
    res.status(400).send(`<div class="err">${err.message}</div><p><a href="/seed">Quay lại</a></p>`);
  }
});

app.post('/seed/luu', (req, res) => {
  try {
    const kq = seedCore.luuVaoHoSo({ lane: req.body.lane, profileId: req.body.profileId, by: req.session.user.username });
    const tb = `Đã lưu bộ dữ liệu ${req.body.lane}: ${kq.soVai} vai tài khoản, ${kq.soO} ô input ở ${kq.soModule} module`
      + (kq.boQua ? ` (giữ nguyên ${kq.boQua} ô người dùng đã tự khai)` : '') + '.';
    res.redirect(`/seed?tab=bo&tb=${encodeURIComponent(tb)}`);
  } catch (err) {
    res.status(400).send(`<div class="err">${err.message}</div><p><a href="/seed">Quay lại</a></p>`);
  }
});

// ─── Chạy song song nhiều làn: seed làn MỚI + chạy auto test (một nút) ──────────

app.get('/song-song', (req, res) => {
  page(res, 'song-song', { title: 'Chạy song song', user: req.session.user, luot: songSong.listLuot(), thongBao: req.query.tb || '' });
});

app.post('/song-song/chay', (req, res) => {
  try {
    const luot = songSong.batDau({ soLan: req.body.soLan, chiChuaChay: req.body.chiChuaChay === '1' });
    res.redirect(`/song-song/${luot}`);
  } catch (err) {
    res.redirect(`/song-song?tb=${encodeURIComponent(err.message)}`);
  }
});

app.get('/song-song/:luot', (req, res) => {
  const t = songSong.chiTiet(req.params.luot);
  if (!t) return res.status(404).send('Không có lượt này');
  page(res, 'song-song-luot', { title: `Lượt ${t.luot}`, user: req.session.user, t });
});
app.get('/song-song/:luot/state', (req, res) => res.json(songSong.chiTiet(req.params.luot)));

app.post('/song-song/:luot/dung', (req, res) => {
  try {
    songSong.dung(req.params.luot);
  } catch { /* lượt đã kết thúc */ }
  res.redirect(`/song-song/${req.params.luot}`);
});

// Báo cáo html / artifact của từng việc. 🔴 Chỉ phục vụ file nằm trong `…/test-output/song-song/`.
app.get('/song-song-file/*rel', (req, res) => {
  const rel = [].concat(req.params.rel).join('/');
  const file = path.resolve(path.join(__dirname, '..'), rel);
  if (!file.startsWith(path.resolve(path.join(__dirname, '..'))) || !file.includes(`${path.sep}test-output${path.sep}song-song${path.sep}`)) {
    return res.status(403).send('Không được phép');
  }
  if (!fs.existsSync(file)) return res.status(404).send('Không có file');
  res.sendFile(file);
});

app.get('/runs', (req, res) => {
  const runs = runner.listRuns({ limit: 100 }).map((r) => ({
    ...r,
    statusLabel: report.RUN_STATUS_LABEL[r.status] || r.status,
    statusClass: STATUS_CLASS[r.status] || 'b-no',
  }));
  page(res, 'runs', { title: 'Lịch sử', user: req.session.user, runs });
});

app.get('/runs/:id', (req, res) => {
  const run = runner.getRun(req.params.id);
  if (!run) return res.status(404).send('Không có run này.');

  page(res, 'run', {
    title: `Run ${run.id}`,
    user: req.session.user,
    run,
    statusLabel: report.RUN_STATUS_LABEL[run.status] || run.status,
    statusClass: STATUS_CLASS[run.status] || 'b-no',
    logTail: runner.logTail(run.id).join('\n'),
  });
});

/**
 * SSE log realtime.
 * 🔴 Phải gỡ listener khi client đóng tab, nếu không mỗi lần mở trang là thêm một listener
 * vào `runner.bus` và server rò rỉ bộ nhớ cho tới khi restart.
 */
app.get('/runs/:id/stream', (req, res) => {
  const runId = req.params.id;

  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // để nginx không gom buffer, mất tính realtime
  });
  res.flushHeaders();

  const sendLog = ({ runId: id, line }) => {
    if (id !== runId) return;
    // SSE: mỗi dòng một `data:`; HTML escape vì log đổ thẳng vào DOM.
    res.write(`event: log\ndata: ${escapeHtml(line)}<br>\n\n`);
  };
  const sendState = ({ runId: id, status }) => {
    if (id !== runId) return;
    if (['QUEUED', 'RUNNING'].includes(status)) return;
    res.write(`event: done\ndata: ${status}\n\n`);
  };

  runner.bus.on('log', sendLog);
  runner.bus.on('state', sendState);
  // 🔴 Run xong TRƯỚC khi trình duyệt kịp nối SSE (bước hỏng sớm) thì sự kiện `done` đã phát mất ⇒
  //    trang treo "Đang chạy" mãi. Nối vào mà run đã kết thúc thì báo `done` ngay để trang tải lại.
  const hienTai = runner.getRun(runId);
  if (hienTai && !['QUEUED', 'RUNNING'].includes(hienTai.status)) res.write(`event: done\ndata: ${hienTai.status}\n\n`);

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 20_000);

  req.on('close', () => {
    clearInterval(keepAlive);
    runner.bus.off('log', sendLog);
    runner.bus.off('state', sendState);
  });
});

app.post('/runs/:id/stop', (req, res) => {
  const run = runner.getRun(req.params.id);
  if (!run) return res.status(404).send('Không có run này.');

  // Chỉ người tạo run hoặc quản trị viên mới dừng được — tránh dừng nhầm việc của người khác.
  if (run.created_by !== req.session.user.username && req.session.user.role !== 'admin') {
    return res.status(403).send('Run này của người khác.');
  }

  runner.stop(req.params.id);
  res.redirect(`/runs/${req.params.id}`);
});

// ─── M4: báo cáo ──────────────────────────────────────────────────────────────

/**
 * Đường dẫn artifact tuyệt đối → tương đối so với thư mục `artifacts/` của run.
 * 🔴 Phải lấy mốc là `artifacts/` chứ không phải thư mục run: lấy nhầm mốc thì link thành
 * `/artifacts/artifacts/...` và mọi bằng chứng đều 404 — báo cáo trông vẫn đầy đủ, chỉ là bấm
 * vào không ra gì.
 */
function withRelativeAttachments(results, runId) {
  const base = artifactsDir(runId);
  const map = (test) => ({
    ...test,
    attachments: test.attachments
      .filter((a) => a.path)
      .map((a) => ({ ...a, rel: path.relative(base, a.path) })),
  });
  return { ...results, tests: results.tests.map(map), setupTests: results.setupTests.map(map) };
}

app.get('/runs/:id/report', (req, res) => {
  const run = runner.getRun(req.params.id);
  if (!run) return res.status(404).send('Không có run này.');

  const raw = report.readResults(run.id);
  const results = raw ? withRelativeAttachments(raw, run.id) : null;
  const previousId = run.summary && run.summary.comparedWith;
  const diff = results ? report.compare(results, previousId ? report.readResults(previousId) : null) : { hasPrevious: false };

  page(res, 'report', {
    title: `Báo cáo ${run.id}`,
    user: req.session.user,
    run,
    results,
    diff,
    label: (status) => report.STATUS_LABEL[status] || status,
  });
});

/**
 * Tải artifact (ảnh, video, trace).
 * 🔴 Không `express.static` thẳng vào `tool-data/`: route này đứng sau `requireLogin`, còn static
 * thì không — mở static là mọi video quay màn hình có dữ liệu thật thành công khai với ai biết URL.
 */
app.get('/runs/:id/artifacts/*rel', (req, res) => {
  const base = path.resolve(artifactsDir(req.params.id));
  const raw = Array.isArray(req.params.rel) ? req.params.rel.join('/') : req.params.rel;
  const rel = decodeURIComponent(raw);
  let target = path.resolve(base, rel);

  // Chặn `../` thoát ra ngoài thư mục artifact của run.
  if (!target.startsWith(base + path.sep)) return res.status(400).send('Đường dẫn không hợp lệ.');

  // 🔴 Tên thư mục do Playwright sinh chứa tiếng Việt có dấu. macOS lưu tên tệp ở dạng NFD, còn
  // trình duyệt gửi lên NFC — so thẳng là không khớp và ra 404 dù tệp có thật. Thử cả hai dạng.
  if (!fs.existsSync(target)) {
    const alt = path.resolve(base, rel.normalize(rel.normalize('NFC') === rel ? 'NFD' : 'NFC'));
    if (fs.existsSync(alt)) target = alt;
    else return res.status(404).send('Không có tệp này (có thể đã bị dọn).');
  }

  res.sendFile(target);
});

app.get('/runs/:id/export.xlsx', async (req, res) => {
  const run = runner.getRun(req.params.id);
  if (!run) return res.status(404).send('Không có run này.');

  const results = report.readResults(run.id);
  if (!results) return res.status(404).send('Run này chưa có kết quả.');

  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Kết quả');

  ws.addRow(['Module', run.module_name]);
  ws.addRow(['Môi trường', `${run.profile_name} — ${run.envSnapshot.baseUrl}`]);
  ws.addRow(['Thời điểm', run.queued_at.replace('T', ' ').slice(0, 19)]);
  ws.addRow(['Người chạy', run.created_by]);
  ws.addRow(['Tỉ lệ đạt', `${results.stats.passed}/${results.stats.total} (${results.stats.passRate}%)`]);
  if (results.stats.setupFailed > 0) {
    ws.addRow(['CẢNH BÁO', `${results.stats.setupFailed} bước đăng nhập/dựng dữ liệu hỏng — tỉ lệ đạt không phản ánh chất lượng sản phẩm`]);
  }
  ws.addRow([]);

  const header = ws.addRow(['Mã case', 'Tên case', 'Vai', 'Kết quả', 'Thời lượng (s)', 'Lỗi']);
  header.font = { bold: true };

  for (const test of results.tests) {
    ws.addRow([
      test.caseId || '',
      test.title,
      test.project,
      report.STATUS_LABEL[test.status] || test.status,
      Number((test.durationMs / 1000).toFixed(1)),
      test.error.split('\n')[0],
    ]);
  }

  ws.columns = [{ width: 16 }, { width: 62 }, { width: 12 }, { width: 10 }, { width: 14 }, { width: 70 }];

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="bao-cao-${run.id}.xlsx"`,
  });
  await wb.xlsx.write(res);
  res.end();
});

function escapeHtml(text) {
  return String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

// ─── Khởi động ────────────────────────────────────────────────────────────────

function start() {
  const created = auth.ensureAdmin();
  if (created) console.log(`Đã tạo tài khoản quản trị đầu tiên: ${created.username}`);

  const recovered = runner.recoverOrphans();
  if (recovered > 0) console.log(`Dọn ${recovered} run mồ côi từ lần chạy trước.`);

  runner.pump(); // tiếp tục hàng đợi còn dở
  retention.schedule(); // dọn run cũ ngay rồi lặp mỗi 12h

  app.listen(PORT, () => {
    console.log(`Công cụ auto test VNPost đang chạy: http://localhost:${PORT}`);
  });
}

if (require.main === module) start();

module.exports = { app, start };
