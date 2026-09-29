'use strict';

/**
 * PO riêng của làn (seed bước 19, sổ `duLieu.poRieng.ds[]`) — helper cho case dùng PO (phân hệ 27).
 * 🔴 Tách khỏi spec seed: Playwright 🚫 cho spec `require` spec khác.
 */
const { doc, ghi } = require('./seed-state');

const ds = () => doc().duLieu?.poRieng?.ds || [];

/**
 * Lấy một PO riêng CHƯA dùng rồi đánh dấu `dungBoi = <mã case>` NGAY (trước khi thao tác ghi) ⇒ lần chạy sau 🚫 lấy lại
 * PO đã bị hạch toán dở. Trả null khi hết PO trống (chạy lại seed bước 19 để bù).
 */
function layPoTrong(maCase) {
  const x = ds().find((p) => p.daNhapKho && !p.dungBoi);
  if (!x) return null;
  ghi('poRieng', { ds: ds().map((p) => (p.ma === x.ma ? { ...p, dungBoi: maCase, dungLuc: new Date().toISOString() } : p)) });
  return x;
}

/** PO mà case `maCase` đã lấy ở lượt trước (chạy lại case ⇒ dùng lại đúng PO đó). */
const poCuaCase = (maCase) => ds().find((p) => p.dungBoi === maCase) || null;

module.exports = { layPoTrong, poCuaCase, dsPo: ds };
