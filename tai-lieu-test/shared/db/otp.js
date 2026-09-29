'use strict';

/**
 * Đọc OTP mới nhất gửi tới một SĐT (AUTHEN.OTP_V2) — CHỈ SELECT, qua CLI `mysql --skip-ssl`.
 * Dùng cho luồng cần OTP gửi về SĐT khách test (số giả): thanh toán bằng điểm (`otp_type LOYALTY_POINT_PAYMENT`).
 * Kết nối: VNPOST_DB_HOST / VNPOST_DB_USER / VNPOST_DB_PASSWORD (khai trong `.env`, gitignore).
 * 🔴 created_time trong OTP_V2 là giờ server (UTC) — so theo id tăng dần, 🚫 đừng so giờ.
 */

const { execFileSync } = require('node:child_process');

function chon(sql, db = 'AUTHEN') {
	const { VNPOST_DB_HOST: h, VNPOST_DB_USER: u, VNPOST_DB_PASSWORD: pw } = process.env;
	if (!h || !u || !pw) throw new Error('Thiếu VNPOST_DB_HOST/USER/PASSWORD trong .env');
	if (!/^\s*select\b/i.test(sql)) throw new Error('shared/db chỉ cho SELECT');
	return execFileSync('mysql', ['--skip-ssl', '-h', h, '-P', '3306', '-u', u, `-p${pw}`, db, '-N', '-B', '-e', sql], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** id OTP lớn nhất hiện tại của SĐT (mốc để chờ OTP MỚI). */
function otpIdCuoi(sdt, loai = 'LOYALTY_POINT_PAYMENT') {
	return Number(chon(`SELECT COALESCE(MAX(id),0) FROM OTP_V2 WHERE destination='${String(sdt).replace(/\D/g, '')}' AND otp_type='${loai}'`)) || 0;
}

/** Chờ OTP có id > sauId; trả mã. */
async function choOtp(sdt, sauId, { loai = 'LOYALTY_POINT_PAYMENT', timeout = 30_000 } = {}) {
	const het = Date.now() + timeout;
	while (Date.now() < het) {
		const r = chon(`SELECT otp_code FROM OTP_V2 WHERE destination='${String(sdt).replace(/\D/g, '')}' AND otp_type='${loai}' AND id>${Number(sauId)} ORDER BY id DESC LIMIT 1`);
		if (r) return r;
		await new Promise((ok) => setTimeout(ok, 1_500));
	}
	return null;
}

/** Điểm hiện tại của khách chuỗi (LOYALTY.CHAIN_CUSTOMER_LOYALTY.point); chưa có dòng ⇒ 0. */
function diemKhachDb(chainCustomerId) {
	return Number(chon(`SELECT COALESCE(MAX(point),0) FROM CHAIN_CUSTOMER_LOYALTY WHERE chain_customer_id=${Number(chainCustomerId)}`, 'LOYALTY')) || 0;
}

module.exports = { chon, otpIdCuoi, choOtp, diemKhachDb };
