'use strict';

/**
 * Dọn run cũ.
 *
 * 🔴 Không có việc này thì server đầy đĩa rồi chết, và nó chết theo kiểu khó chẩn đoán nhất:
 * Playwright bắt đầu fail ngẫu nhiên vì không ghi nổi video, còn log thì báo lỗi test.
 * Mỗi run giữ ảnh + video + trace của case lỗi; vài trăm KB tới vài MB một case.
 */

const fs = require('node:fs');

const { getDb, runDir } = require('./db');

const DEFAULT_KEEP_DAYS = Number(process.env.TOOL_KEEP_DAYS || 30);

/**
 * Xoá artifact và bản ghi của run cũ hơn `keepDays`.
 * Giữ lại bản ghi hay không là một lựa chọn: ở đây xoá cả hai, vì một run không còn bằng chứng
 * thì con số trong lịch sử cũng không kiểm chứng được nữa.
 */
function cleanup({ keepDays = DEFAULT_KEEP_DAYS } = {}) {
  const cutoff = new Date(Date.now() - keepDays * 24 * 60 * 60 * 1000).toISOString();
  const db = getDb();

  const old = db
    .prepare(`SELECT id FROM runs WHERE queued_at < ? AND status NOT IN ('QUEUED','RUNNING')`)
    .all(cutoff);

  for (const row of old) {
    fs.rmSync(runDir(row.id), { recursive: true, force: true });
    db.prepare('DELETE FROM runs WHERE id = ?').run(row.id);
  }

  return { removed: old.length, cutoff, keepDays };
}

/** Gọi khi khởi động rồi lặp lại mỗi 12 giờ. */
function schedule() {
  const run = () => {
    try {
      const result = cleanup();
      if (result.removed > 0) console.log(`Đã dọn ${result.removed} run cũ hơn ${result.keepDays} ngày.`);
    } catch (err) {
      console.error('Dọn run cũ thất bại:', err.message);
    }
  };

  run();
  const timer = setInterval(run, 12 * 60 * 60 * 1000);
  timer.unref();
  return timer;
}

module.exports = { cleanup, schedule, DEFAULT_KEEP_DAYS };
