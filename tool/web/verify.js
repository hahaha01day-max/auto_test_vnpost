'use strict';

/**
 * Kiểm tra hồ sơ môi trường TRƯỚC khi chạy test.
 *
 * 🔴 Vì sao đáng làm: không có bước này thì sai URL hay sai mật khẩu chỉ lộ ra sau 2 phút chạy,
 * dưới dạng "0% đạt" — trông y hệt sản phẩm hỏng. Kiểm trước mất vài giây và nói thẳng sai ở đâu.
 */

const { spawn } = require('node:child_process');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

const { PROJECT_ROOT } = require('../core/modules');
const { buildEnv, getProfile } = require('../core/profiles');

/** Ping trang chủ: chỉ cần biết server có trả lời không. */
async function pingUrl(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(10_000) });
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: err.message };
  }
}

/**
 * Thử đăng nhập từng vai bằng chính `roles.setup.js` của project test.
 *
 * 🔴 Dùng lại đúng file mà test dùng, KHÔNG viết lại logic đăng nhập ở đây: viết lại là hai bản
 * lệch nhau, verify báo xanh còn test vẫn đỏ, và người dùng mất niềm tin vào cả hai.
 */
function loginProbe(profileId) {
  const authDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vnpost-verify-'));
  const jsonOut = path.join(authDir, 'results.json');

  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'playwright',
        'test',
        '--config',
        path.join(PROJECT_ROOT, 'playwright.dynamic.config.js'),
        path.join(PROJECT_ROOT, 'tai-lieu-test/shared/auth/roles.setup.js'),
        '--reporter=json',
      ],
      {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          ...buildEnv(profileId),
          VNPOST_AUTH_DIR: authDir,
          PLAYWRIGHT_JSON_OUTPUT_NAME: jsonOut,
          FORCE_COLOR: '0',
          CI: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('close', () => {
      const roles = [];
      try {
        const parsed = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
        const walk = (suite) => {
          for (const child2 of suite.suites || []) walk(child2);
          for (const spec of suite.specs || []) {
            for (const test of spec.tests || []) {
              const last = (test.results || [])[test.results.length - 1] || {};
              roles.push({
                title: spec.title,
                status: last.status || 'unknown',
                error: last.error ? String(last.error.message || '').split('\n')[0].slice(0, 200) : '',
              });
            }
          }
        };
        for (const suite of parsed.suites || []) walk(suite);
      } catch {
        // Không parse được thì trả rỗng kèm stderr — vẫn hơn là im lặng.
      } finally {
        fs.rmSync(authDir, { recursive: true, force: true });
      }

      resolve({ roles, error: roles.length === 0 ? stderr.slice(-800) : '' });
    });
  });
}

async function verifyProfile(profileId) {
  const profile = getProfile(profileId);
  if (!profile) throw new Error(`Không có hồ sơ môi trường id=${profileId}`);

  const configured = profile.accounts.filter((a) => a.configured);
  const ping = await pingUrl(profile.baseUrl);

  // Web không trả lời thì thử đăng nhập chỉ tốn 2 phút để nhận cùng một câu trả lời.
  if (!ping.ok) {
    return {
      profile,
      ping,
      roles: [],
      skippedLogin: true,
      note: 'Web không trả lời — bỏ qua bước thử đăng nhập.',
    };
  }
  if (configured.length === 0) {
    return { profile, ping, roles: [], skippedLogin: true, note: 'Chưa khai tài khoản vai nào.' };
  }

  const probe = await loginProbe(profileId);
  return { profile, ping, roles: probe.roles, error: probe.error, skippedLogin: false };
}

module.exports = { verifyProfile, pingUrl };
