#!/usr/bin/env node
'use strict';

/**
 * Nghiệm thu GĐ 2–3 — chạy bằng tay, chưa có web.
 *
 *   node tool/bin/run.js profiles                                    # liệt kê hồ sơ
 *   node tool/bin/run.js profile:add <tên> <baseUrl>                 # tạo hồ sơ
 *   node tool/bin/run.js account:set <profileId> <vai> <tk> <mk>     # khai tài khoản một vai
 *   node tool/bin/run.js start <profileId> <moduleId> [caseId,...]   # xếp hàng + chạy
 *   node tool/bin/run.js runs                                        # lịch sử
 *   node tool/bin/run.js show <runId>                                # kết quả một run
 */

const profiles = require('../core/profiles');
const runner = require('../core/runner');
const report = require('../core/report');
const { getModule } = require('../core/modules');

const [, , command, ...args] = process.argv;

function printProfiles() {
  const list = profiles.listProfiles();
  if (list.length === 0) return console.log('Chưa có hồ sơ môi trường nào.');

  for (const p of list) {
    const full = profiles.getProfile(p.id);
    const ready = full.accounts.filter((a) => a.configured).map((a) => a.key);
    const missing = full.accounts.filter((a) => !a.configured).map((a) => a.key);
    console.log(`#${p.id}  ${p.name}${p.isProd ? '  [PROD]' : ''}`);
    console.log(`     ${p.baseUrl}`);
    console.log(`     vai đã khai: ${ready.join(', ') || '—'}`);
    console.log(`     còn thiếu  : ${missing.join(', ') || '—'}`);
  }
}

function printRuns() {
  for (const run of runner.listRuns({ limit: 20 })) {
    const s = run.summary || {};
    const detail = s.total ? `${s.passed}/${s.total} đạt (${s.passRate}%)` : '';
    console.log(
      `${run.id}  ${run.status.padEnd(8)}  ${run.module_id.padEnd(38)}  ${run.profile_name.padEnd(14)}  ${detail}`,
    );
  }
}

function showRun(runId) {
  const run = runner.getRun(runId);
  if (!run) return console.error(`Không có run ${runId}`);

  console.log(`\nRun ${run.id}`);
  console.log(`  module     : ${run.module_name} (${run.module_id})`);
  console.log(`  môi trường : ${run.profile_name} → ${run.envSnapshot.baseUrl}`);
  console.log(`  case chọn  : ${run.wholeModule ? 'CẢ MODULE' : run.caseIds.join(', ')}`);
  console.log(`  trạng thái : ${run.status}  (exit ${run.exit_code})`);
  if (run.error) console.log(`  lỗi        : ${run.error}`);

  const results = report.readResults(runId);
  if (!results) return console.log('\n  Chưa có results.json.\n');

  const s = results.stats;
  console.log(`\n  ${s.passed}/${s.total} đạt — lỗi ${s.failed}, bỏ qua ${s.skipped}, ${(s.durationMs / 1000).toFixed(1)}s`);
  console.log(`  bước setup/dựng dữ liệu: ${s.setupTotal}, hỏng ${s.setupFailed}`);
  if (s.setupFailed > 0) {
    console.log('  🔴 Bước setup hỏng → mọi case sau đó vô nghĩa, đừng đọc tỉ lệ đạt.');
  }

  console.log('');
  for (const t of [...results.setupTests, ...results.tests]) {
    const label = report.STATUS_LABEL[t.status] || t.status;
    console.log(`  ${label.padEnd(8)} [${(t.project || '-').padEnd(9)}] ${(t.caseId || '').padEnd(14)} ${t.title.slice(0, 54)}`);
    if (t.error) console.log(`           ↳ ${t.error.split('\n')[0].slice(0, 110)}`);
  }
  console.log('');
}

async function startRun(profileId, moduleId, caseList) {
  const mod = getModule(moduleId);
  if (!mod) return console.error(`Không có module "${moduleId}"`);

  const caseIds = caseList ? caseList.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const run = runner.enqueue({
    profileId: Number(profileId),
    moduleId,
    caseIds,
    wholeModule: caseIds.length === 0,
    createdBy: 'cli',
  });

  console.log(`Run ${run.id} — ${run.status}\n`);

  runner.bus.on('log', ({ runId, line }) => {
    if (runId === run.id) console.log(`  ${line}`);
  });

  await new Promise((resolve) => {
    runner.bus.on('state', ({ runId, status }) => {
      if (runId === run.id && !['QUEUED', 'RUNNING'].includes(status)) resolve();
    });
  });

  showRun(run.id);
}

(async () => {
  runner.recoverOrphans();

  switch (command) {
    case 'profiles':
      printProfiles();
      break;
    case 'profile:add': {
      const [name, baseUrl] = args;
      const created = profiles.createProfile({ name, baseUrl, createdBy: 'cli' });
      console.log(`Đã tạo hồ sơ #${created.id} — ${created.name} → ${created.baseUrl}`);
      break;
    }
    case 'account:set': {
      const [profileId, roleKey, account, password] = args;
      profiles.setAccount(Number(profileId), roleKey, { account, password });
      console.log(`Đã khai vai ${roleKey} cho hồ sơ #${profileId}`);
      break;
    }
    case 'start':
      await startRun(args[0], args[1], args[2]);
      break;
    case 'runs':
      printRuns();
      break;
    case 'show':
      showRun(args[0]);
      break;
    default:
      console.log(require('node:fs').readFileSync(__filename, 'utf8').split('*/')[0].split('/**')[1]);
  }
  process.exit(0);
})();
