'use strict';

/**
 * HỒ SƠ MÔI TRƯỜNG — thay cho việc ghi đè file `.env` chung.
 *
 * 🔴 Vì sao không ghi `.env`: công cụ chạy trên server dùng chung. Nếu cấu hình nằm ở một file
 * `.env` toàn cục thì người này đổi URL là run của người kia trỏ sang môi trường khác —
 * test VẪN XANH, chỉ là xanh trên môi trường sai. Không có lỗi nào để mà bắt.
 *
 * ⭐ Chỗ dựa: `tai-lieu-test/shared/config.js` chỉ nạp `.env` khi biến CHƯA có
 * (`if (process.env[key] === undefined)`), nên biến ta truyền qua `spawn(..., { env })`
 * luôn THẮNG file `.env`. Đã kiểm chứng. Nhờ vậy không cần chạm vào file `.env` nào cả.
 */

const { ROLES } = require('../../tai-lieu-test/shared/auth/accounts');
const { getDb, nowIso } = require('./db');
const { encrypt, decrypt } = require('./secrets');

/** Vai khai trong `shared/auth/accounts.js` — nguồn sự thật duy nhất, không chép lại ở đây. */
function listRoles() {
  return ROLES.map((role) => ({
    key: role.key,
    label: role.label,
    orgUnitType: role.orgUnitType,
    viec: role.viec,
    envAccount: role.envAccount,
    envPassword: role.envPassword,
    envScope: role.envScope,
  }));
}

function rowToProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.base_url,
    apiBaseUrl: row.api_base_url,
    note: row.note,
    isProd: row.is_prod === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listProfiles() {
  return getDb().prepare('SELECT * FROM profiles ORDER BY name').all().map(rowToProfile);
}

/**
 * @param {number} id
 * @param {{withSecrets?: boolean}} options 🚫 `withSecrets` CHỈ dùng cho runner. Lớp web không được gọi.
 */
function getProfile(id, options = {}) {
  const db = getDb();
  const profile = rowToProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(id));
  if (!profile) return null;

  const rows = db.prepare('SELECT * FROM profile_accounts WHERE profile_id = ?').all(id);
  const byRole = new Map(rows.map((r) => [r.role_key, r]));

  profile.accounts = listRoles().map((role) => {
    const row = byRole.get(role.key);
    const password = row ? decrypt(row.password) : '';
    const account = row ? row.account : '';

    return {
      ...role,
      account,
      scopeLabel: row ? row.scope_label : '',
      // Trạng thái là thứ UI cần; giá trị mật khẩu thì không.
      configured: Boolean(account && password),
      ...(options.withSecrets ? { password } : {}),
    };
  });

  return profile;
}

function createProfile({ name, baseUrl, apiBaseUrl = '', note = '', isProd = false, createdBy = '' }) {
  const now = nowIso();
  const info = getDb()
    .prepare(
      `INSERT INTO profiles (name, base_url, api_base_url, note, is_prod, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(name.trim(), normalizeUrl(baseUrl), normalizeUrl(apiBaseUrl), note, isProd ? 1 : 0, createdBy, now, now);

  return getProfile(info.lastInsertRowid);
}

function updateProfile(id, { name, baseUrl, apiBaseUrl, note, isProd }) {
  const current = getProfile(id);
  if (!current) return null;

  getDb()
    .prepare(
      `UPDATE profiles SET name = ?, base_url = ?, api_base_url = ?, note = ?, is_prod = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      (name ?? current.name).trim(),
      normalizeUrl(baseUrl ?? current.baseUrl),
      normalizeUrl(apiBaseUrl ?? current.apiBaseUrl),
      note ?? current.note,
      (isProd ?? current.isProd) ? 1 : 0,
      nowIso(),
      id,
    );

  return getProfile(id);
}

function deleteProfile(id) {
  getDb().prepare('DELETE FROM profiles WHERE id = ?').run(id);
}

/**
 * Lưu tài khoản một vai.
 * 🔴 `password === undefined` nghĩa là "người dùng không sửa ô mật khẩu" → GIỮ mật khẩu cũ.
 * Nếu coi undefined là xoá thì mỗi lần sửa tên tài khoản là mất mật khẩu, và lỗi chỉ lộ ra
 * lúc chạy test (đăng nhập fail), rất khó lần.
 */
function setAccount(profileId, roleKey, { account, password, scopeLabel }) {
  if (!listRoles().some((role) => role.key === roleKey)) {
    throw new Error(`Vai không hợp lệ: ${roleKey}. Vai hợp lệ: ${listRoles().map((r) => r.key).join(', ')}`);
  }

  const db = getDb();
  // Không kiểm trước thì SQLite ném "FOREIGN KEY constraint failed" — đúng nhưng không nói được
  // hồ sơ nào thiếu, người dùng không biết sửa gì.
  if (!db.prepare('SELECT 1 FROM profiles WHERE id = ?').get(profileId)) {
    throw new Error(`Không có hồ sơ môi trường id=${profileId}`);
  }

  const existing = db
    .prepare('SELECT * FROM profile_accounts WHERE profile_id = ? AND role_key = ?')
    .get(profileId, roleKey);

  const nextPassword = password === undefined ? (existing ? existing.password : '') : encrypt(password);

  db.prepare(
    `INSERT INTO profile_accounts (profile_id, role_key, account, password, scope_label)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(profile_id, role_key) DO UPDATE SET account = excluded.account,
                                                    password = excluded.password,
                                                    scope_label = excluded.scope_label`,
  ).run(
    profileId,
    roleKey,
    account ?? (existing ? existing.account : ''),
    nextPassword,
    scopeLabel ?? (existing ? existing.scope_label : ''),
  );

  db.prepare('UPDATE profiles SET updated_at = ? WHERE id = ?').run(nowIso(), profileId);
}

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/**
 * Dựng object env truyền cho `spawn`.
 * 🚫 KHÔNG ghi ra file, KHÔNG log — object này chứa mật khẩu thật.
 */
function buildEnv(profileId) {
  const profile = getProfile(profileId, { withSecrets: true });
  if (!profile) throw new Error(`Không có hồ sơ môi trường id=${profileId}`);

  const env = {
    VNPOST_BASE_URL: profile.baseUrl,
    VNPOST_API_BASE_URL: profile.apiBaseUrl || profile.baseUrl,
  };

  for (const account of profile.accounts) {
    if (!account.account || !account.password) continue;
    env[account.envAccount] = account.account;
    env[account.envPassword] = account.password;
    if (account.scopeLabel) env[account.envScope] = account.scopeLabel;
  }

  return env;
}

/** Bản chụp để lưu cùng run — 🚫 tuyệt đối không kèm mật khẩu. */
function snapshotFor(profileId) {
  const profile = getProfile(profileId);
  if (!profile) return {};

  return {
    profileId: profile.id,
    profileName: profile.name,
    baseUrl: profile.baseUrl,
    apiBaseUrl: profile.apiBaseUrl || profile.baseUrl,
    isProd: profile.isProd,
    roles: profile.accounts.filter((a) => a.configured).map((a) => ({ key: a.key, account: a.account })),
    takenAt: nowIso(),
  };
}

module.exports = {
  listRoles,
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  setAccount,
  buildEnv,
  snapshotFor,
};
