'use strict';

/**
 * HÀNG ĐỢI + SPAWN Playwright.
 *
 * 🔴 Hàng đợi là BẮT BUỘC, không phải tối ưu: mọi module để `workers: 1`, và nhiều case GHI DỮ LIỆU
 * THẬT. Hai người cùng bấm chạy trên một môi trường là phá dữ liệu của nhau — test vẫn chạy, kết
 * quả vẫn ra, chỉ là sai. Mặc định 1 run tại một thời điểm cho MỖI hồ sơ môi trường.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const crypto = require('node:crypto');

const { PROJECT_ROOT, getModule } = require('./modules');
const seedCore = require('./seed');
const { getCases } = require('./cases');
const { getDb, nowIso, runDir, authDirFor } = require('./db');
const { buildEnv, snapshotFor } = require('./profiles');
const caseInputs = require('./inputs');
const { readResults, compare, pruneArtifacts } = require('./report');

const STATUS = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  /**
   * 🔴 Tách riêng khỏi FAILED: hỏng ở bước đăng nhập / dựng dữ liệu KHÔNG phải lỗi sản phẩm.
   * Gộp chung thì báo cáo gửi QC ghi "0% đạt" và cả nhóm đi tìm bug, trong khi sự thật chỉ là
   * sai URL hoặc sai mật khẩu trong hồ sơ môi trường.
   */
  SETUP_FAILED: 'SETUP_FAILED',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR',
};

/** Sự kiện cho lớp web nghe rồi đẩy SSE: `log`, `state`. */
const bus = new EventEmitter();
bus.setMaxListeners(100);

/** runId → { child, logStream, buffer } của run ĐANG chạy trong tiến trình này. */
const active = new Map();

/** Log giữ trong RAM để người mở trang giữa chừng vẫn thấy phần đã trôi qua. */
const LOG_BUFFER_LINES = 2000;

/**
 * Mã điều khiển terminal trong log của Playwright.
 * 🔴 `FORCE_COLOR=0` và `CI=1` vẫn KHÔNG chặn hết — reporter còn phát mã di chuyển con trỏ
 * (`ESC[1A`, `ESC[2K`) để vẽ lại dòng. Để nguyên thì log trên web đầy ký tự rác.
 */
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;?]*[A-Za-z]`, 'g');

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Dựng biểu thức `--grep`.
 *
 * 🔴 PHẢI nối cả test DỰNG DỮ LIỆU vào: tick CNDB-CD-006 rồi chỉ grep đúng mã đó thì test dựng
 * dữ liệu bị loại, case chạy trên kho rỗng → SKIP/FAIL, trông như lỗi sản phẩm chứ không phải
 * lỗi công cụ. Project `setup` thì không cần grep — nó chạy nhờ `dependencies`, không nhờ tên.
 */
function buildGrep(caseIds, hasFixtures) {
  const parts = caseIds.map(escapeRegex);
  if (hasFixtures) parts.push('DỰNG DỮ LIỆU', 'DUNG DU LIEU');
  return parts.join('|');
}

function insertRun({ profileId, profileName, moduleId, moduleName, caseIds, wholeModule, createdBy, snapshot }) {
  const id = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')}-${crypto.randomBytes(3).toString('hex')}`;

  getDb()
    .prepare(
      `INSERT INTO runs (id, profile_id, profile_name, module_id, module_name, case_ids, whole_module,
                         status, created_by, queued_at, env_snapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      profileId,
      profileName,
      moduleId,
      moduleName,
      JSON.stringify(caseIds),
      wholeModule ? 1 : 0,
      STATUS.QUEUED,
      createdBy,
      nowIso(),
      JSON.stringify(snapshot),
    );

  return getRun(id);
}

function getRun(id) {
  const row = getDb().prepare('SELECT * FROM runs WHERE id = ?').get(id);
  if (!row) return null;

  return {
    ...row,
    caseIds: JSON.parse(row.case_ids || '[]'),
    wholeModule: row.whole_module === 1,
    summary: JSON.parse(row.summary || '{}'),
    envSnapshot: JSON.parse(row.env_snapshot || '{}'),
  };
}

function listRuns({ limit = 50, moduleId, profileId } = {}) {
  const where = [];
  const params = [];
  if (moduleId) { where.push('module_id = ?'); params.push(moduleId); }
  if (profileId) { where.push('profile_id = ?'); params.push(profileId); }

  const sql = `SELECT * FROM runs ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY queued_at DESC LIMIT ?`;
  return getDb().prepare(sql).all(...params, limit).map((row) => ({
    ...row,
    caseIds: JSON.parse(row.case_ids || '[]'),
    wholeModule: row.whole_module === 1,
    summary: JSON.parse(row.summary || '{}'),
  }));
}

function setStatus(id, status, extra = {}) {
  const fields = ['status = ?'];
  const params = [status];

  for (const [key, value] of Object.entries(extra)) {
    fields.push(`${key} = ?`);
    params.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
  }

  getDb().prepare(`UPDATE runs SET ${fields.join(', ')} WHERE id = ?`).run(...params, id);
  bus.emit('state', { runId: id, status });
}

/** Run trước đó của cùng module đã chạy xong — dùng để so lỗi mới / lỗi cũ. */
function previousRunOf(run) {
  return getDb()
    .prepare(
      `SELECT id FROM runs
       WHERE module_id = ? AND id != ? AND status IN ('PASSED','FAILED') AND finished_at IS NOT NULL
       ORDER BY finished_at DESC LIMIT 1`,
    )
    .get(run.module_id, run.id);
}

/**
 * Xếp một run vào hàng đợi. Trả về run ở trạng thái QUEUED hoặc RUNNING.
 *
 * @param {{profileId:number, moduleId:string, caseIds:string[], createdBy:string, wholeModule?:boolean}} input
 */
function enqueue({ profileId, moduleId, caseIds = [], createdBy = '', wholeModule = false, seedLane = null }) {
  const mod = getModule(moduleId);
  if (!mod) throw new Error(`Không có module "${moduleId}"`);
  if (!wholeModule && caseIds.length === 0) throw new Error('Chưa chọn case nào');

  const snapshot = snapshotFor(profileId);
  if (!snapshot.profileId) throw new Error(`Không có hồ sơ môi trường id=${profileId}`);
  // Run seed theo làn: tài khoản lấy từ `.env.lane<n>`, 🚫 không từ hồ sơ — ghi vào snapshot để
  // `start()` biết, và để trang run hiện đúng là run này chạy bằng tài khoản làn.
  if (seedLane) {
    snapshot.seedLane = String(seedLane);
    snapshot.roles = [{ key: 'lane', account: `.env.lane${seedLane}` }];
  }

  const run = insertRun({
    profileId,
    profileName: snapshot.profileName,
    moduleId,
    moduleName: mod.name,
    caseIds,
    wholeModule,
    createdBy,
    snapshot,
  });

  pump();
  return getRun(run.id);
}

/**
 * Lấy run kế tiếp ra chạy, nếu hồ sơ môi trường đó đang rảnh.
 *
 * 🔴 Khoá theo HỒ SƠ chứ không theo toàn cục: hai môi trường khác nhau chạy song song được,
 * cùng một môi trường thì không — vì đó mới là chỗ dữ liệu đụng nhau.
 */
function pump() {
  const db = getDb();
  const queued = db.prepare(`SELECT * FROM runs WHERE status = ? ORDER BY queued_at ASC`).all(STATUS.QUEUED);

  for (const row of queued) {
    const busy = db
      .prepare(`SELECT COUNT(*) AS n FROM runs WHERE status = ? AND profile_id IS ?`)
      .get(STATUS.RUNNING, row.profile_id).n;

    if (busy === 0) start(getRun(row.id));
  }
}

function start(run) {
  const mod = getModule(run.module_id);
  const dir = runDir(run.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(authDirFor(run.id), { recursive: true });

  let grep = '';
  if (!run.wholeModule) {
    const { fixtureTests } = getCases(mod);
    grep = buildGrep(run.caseIds, fixtureTests.length > 0);
  }

  const lane = run.envSnapshot?.seedLane || null;
  const args = [
    'playwright',
    'test',
    '--config',
    lane ? seedCore.API_CONFIG : mod.defaultConfig,
    '--output',
    path.join(dir, 'artifacts'),
    '--reporter=line,json',
  ];
  if (grep) args.push('--grep', grep);

  const env = {
    ...process.env,
    ...buildEnv(run.profile_id),
    // M5: input người dùng đè trên web/Excel, dịch thành `VNPOST_CASE_<CASE>_<FIELD>`.
    // 🔴 Đặt SAU buildEnv nhưng hai bộ không giao nhau (một bên `VNPOST_BASE_URL`/tài khoản, một
    // bên `VNPOST_CASE_*`) — nếu sau này có trùng tên thì input case phải thua secret, đừng đảo.
    ...caseInputs.buildCaseEnv(run.profile_id, run.module_id),
    // 🔴 Mỗi run một thư mục session riêng — xem `shared/config.js`.
    VNPOST_AUTH_DIR: authDirFor(run.id),
    PLAYWRIGHT_JSON_OUTPUT_NAME: path.join(dir, 'results.json'),
    PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(dir, 'html'),
    FORCE_COLOR: '0',
    CI: '1', // tắt mọi thứ cần bàn phím
  };
  if (!mod.hasConfig) env.DOC_TEST_DIR = mod.dir;
  if (lane) {
    // 🔴 Server đã nạp `.env` CHUNG vào process.env, hồ sơ lại bơm tài khoản — cả hai đều THẮNG
    //    `.env.lane<n>` (config.js chỉ nạp biến chưa có). Gỡ hết biến tài khoản, chỉ giữ URL của hồ sơ,
    //    nếu không run "làn 3" đăng nhập bằng tài khoản chung và giẫm phiên khác.
    // 🔴 Khởi động làn MỚI: `.env.lane<n>` chưa có tài khoản ⇒ bước 1–3 cần TCT để dựng tổ chức/điểm
    //    bán/nhân viên. Giữ TCT (của hồ sơ, không có thì của `.env` chung) CHỈ khi file làn chưa có —
    //    seed 3.9 ghi xong file thì các bước sau tự đăng nhập TCT riêng của làn.
    const envLan = path.join(PROJECT_ROOT, `.env.lane${lane}`);
    const lanCoTct = fs.existsSync(envLan) && /^VNPOST_ACCOUNT=\S+/m.test(fs.readFileSync(envLan, 'utf8'));
    const giuTct = lanCoTct ? [] : ['VNPOST_ACCOUNT', 'VNPOST_PASSWORD', 'VNPOST_SCOPE_LABEL', 'VNPOST_ROLE_LABEL'];
    for (const k of Object.keys(env)) {
      if (giuTct.includes(k)) continue;
      if (/^VNPOST_(ACCOUNT|PASSWORD|SCOPE_LABEL|ROLE_LABEL|SETUP_ROLES|CASE_)/.test(k)) delete env[k];
    }
    env.VNPOST_LANE = lane;
  }

  const child = spawn('npx', args, { cwd: PROJECT_ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const logStream = fs.createWriteStream(path.join(dir, 'log.txt'), { flags: 'a' });
  const state = { child, logStream, buffer: [], stopped: false };
  active.set(run.id, state);

  setStatus(run.id, STATUS.RUNNING, { started_at: nowIso(), pid: child.pid });
  emitLog(run.id, state, `$ npx ${args.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`);
  emitLog(run.id, state, `# môi trường: ${run.envSnapshot.profileName} → ${run.envSnapshot.baseUrl}`);

  // Ghi ĐÃ ĐÈ FIELD NÀO, 🚫 không ghi giá trị: input có thể là mã phiếu/số tiền thật, mà log thì
  // ai mở run cũng đọc được. Không ghi gì cả thì sau này nhìn báo cáo không biết run chạy bằng
  // input nào — lỗi tái hiện không ra mà chẳng ai ngờ tới input.
  const overridden = caseInputs.overrideSummary(run.profile_id, run.module_id);
  if (overridden.length > 0) {
    emitLog(run.id, state, `# input đã đè (${overridden.length} case): ${overridden.join(' | ')}`);
  }

  const pipe = (stream) => {
    let pending = '';
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      pending += chunk;
      const lines = pending.split(/\r?\n/);
      pending = lines.pop();
      for (const line of lines) emitLog(run.id, state, line);
    });
    stream.on('end', () => {
      if (pending) emitLog(run.id, state, pending);
    });
  };
  pipe(child.stdout);
  pipe(child.stderr);

  child.on('error', (err) => finish(run.id, null, `Không chạy được Playwright: ${err.message}`));
  child.on('close', (code) => finish(run.id, code, ''));
}

function emitLog(runId, state, rawLine) {
  const line = rawLine.replace(ANSI, '');
  state.buffer.push(line);
  if (state.buffer.length > LOG_BUFFER_LINES) state.buffer.shift();
  state.logStream.write(`${line}\n`);
  bus.emit('log', { runId, line });
}

function finish(runId, exitCode, errorMessage) {
  const state = active.get(runId);
  if (state) {
    state.logStream.end();
    active.delete(runId);
  }

  const run = getRun(runId);
  const results = readResults(runId);

  let status;
  if (state && state.stopped) status = STATUS.STOPPED;
  else if (errorMessage) status = STATUS.ERROR;
  else if (!results) status = STATUS.ERROR;
  else if (results.stats.setupFailed > 0) status = STATUS.SETUP_FAILED;
  else status = results.ok ? STATUS.PASSED : STATUS.FAILED;

  let summary = results ? results.stats : {};
  if (results) {
    const prev = previousRunOf(run);
    const diff = compare(results, prev ? readResults(prev.id) : null);
    summary = {
      ...results.stats,
      newFailures: diff.newFailures.length,
      stillFailing: diff.stillFailing.length,
      fixed: diff.fixed.length,
      comparedWith: prev ? prev.id : null,
    };

    const pruned = pruneArtifacts(runId, results);
    if (pruned.removed > 0) summary.prunedArtifacts = pruned.removed;
  }

  setStatus(runId, status, {
    finished_at: nowIso(),
    exit_code: exitCode === null ? -1 : exitCode,
    summary,
    error: errorMessage || (results ? '' : 'Không sinh được results.json — xem log.txt'),
  });

  // 🔴 Session của run này chứa cookie đăng nhập thật → xoá ngay khi chạy xong.
  fs.rmSync(authDirFor(runId), { recursive: true, force: true });

  // 🔴 Seed theo làn: các bước nối tiếp, bước sau đọc sổ bước trước ghi. Bước này hỏng mà vẫn chạy
  //    tiếp thì mọi bước sau đỏ dây chuyền ("Chưa seed …"), tester tưởng hỏng cả loạt. Huỷ phần còn lại
  //    của CÙNG làn; sửa xong bấm "Chạy tiếp bước chưa xong".
  const lane = run?.envSnapshot?.seedLane;
  if (lane && status !== STATUS.PASSED) {
    const db = getDb();
    for (const row of db.prepare(`SELECT id FROM runs WHERE status = ?`).all(STATUS.QUEUED)) {
      const r = getRun(row.id);
      if (r?.envSnapshot?.seedLane !== lane) continue;
      setStatus(r.id, STATUS.STOPPED, { finished_at: nowIso(), error: `Huỷ vì bước trước (run ${runId}) không đạt` });
    }
  }

  pump();
}

function stop(runId) {
  const state = active.get(runId);
  if (!state) return false;

  state.stopped = true;
  state.child.kill('SIGTERM');
  // Playwright đôi khi không chết ngay vì còn trình duyệt con.
  setTimeout(() => {
    if (active.has(runId)) state.child.kill('SIGKILL');
  }, 5000);
  return true;
}

/** Log đã trôi qua, cho người mở trang giữa chừng. */
function logTail(runId) {
  const state = active.get(runId);
  if (state) return state.buffer.slice();

  const file = path.join(runDir(runId), 'log.txt');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).slice(-LOG_BUFFER_LINES);
}

/**
 * Run mang trạng thái RUNNING nhưng tiến trình đã chết (server restart, máy sập).
 * Không dọn thì hồ sơ đó bị khoá vĩnh viễn, mọi run sau xếp hàng mãi không tới lượt.
 *
 * 🔴 PHẢI kiểm PID còn sống, không được cứ thấy RUNNING là dọn: công cụ có thể chạy nhiều tiến
 * trình (web server + CLI). Dọn mù thì CLI sẽ đánh dấu ERROR cho run mà web server ĐANG chạy thật —
 * run vẫn chạy tiếp ở nền, nhưng DB nói nó hỏng, và hàng đợi thả thêm run thứ hai vào cùng
 * môi trường. Đúng cái mà hàng đợi sinh ra để ngăn.
 */
function isAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM'; // tiến trình có thật, chỉ là của user khác
  }
}

function recoverOrphans() {
  const db = getDb();
  let recovered = 0;

  for (const row of db.prepare('SELECT id, pid FROM runs WHERE status = ?').all(STATUS.RUNNING)) {
    if (active.has(row.id) || isAlive(row.pid)) continue;

    db.prepare('UPDATE runs SET status = ?, finished_at = ?, error = ? WHERE id = ?').run(
      STATUS.ERROR,
      nowIso(),
      'Tiến trình Playwright đã mất (server khởi động lại hoặc bị kill).',
      row.id,
    );
    recovered += 1;
  }
  return recovered;
}

module.exports = { STATUS, bus, enqueue, getRun, listRuns, stop, logTail, pump, recoverOrphans, buildGrep, escapeRegex };
