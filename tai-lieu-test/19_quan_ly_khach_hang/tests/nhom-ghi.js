'use strict';

/**
 * Helper nhóm đối tượng khách hàng (LOYALTY.CUSTOMER_GROUP) cho `19_130_*`.
 *
 * Trace 25/09/2026: `pages/promotionCampaign/loyaltyGroup/**` (route `/promotion/customer-group`, drawer
 * "Thêm nhóm đối tượng khách hàng áp dụng", footer "Hủy" · "Xác nhận", toast "Thêm nhóm đối tượng thành công").
 * API `loyalty/api/v1/customer-group/{create,update,delete,get-list,get-members}`.
 * `targetType` 1 = theo điều kiện · 2 = khách mới · 3 = tuỳ chỉnh (memberIds). `conditionType` 1 = Tổng tiền hàng đã mua,
 * 10 = Số lần mua hàng; `operator` 1 `>` · 2 `<` · 3 `>=` · 4 `<=` · 5 `=`.
 *
 * 🔴 Nhóm theo điều kiện áp TOÀN CHUỖI ⇒ khoanh bằng khoảng tiền hẹp + "Số lần mua hàng = 1" để chỉ khách rác vừa
 *    mua lọt vào; luôn xoá nhóm ở `finally` (xoá mềm: `is_active=0` cả điều kiện + thành viên).
 * 🔴 Trên `develop` KHÔNG có "hạng" lưu vào khách (hạng chỉ đếm theo điểm, `RankingService.queryRanking`) —
 *    "nâng hạng realtime" đo bằng việc khách VÀO nhóm điều kiện (Kafka `customer-loyalty-sync` → loyalty đánh giá).
 */

const { expect } = require('@playwright/test');
const g = require('./khach-ghi');

const API = '/loyalty/api/v1/customer-group';

async function taoNhomApi(page, st, { ten, conditions = null, memberIds = null, targetType = 1 }) {
	const b = await g.k.goiGhi(page, st, 'POST', `${API}/create`, {}, {
		groupName: ten,
		description: 'AUTO TEST KHONG DUNG — nhóm rác, xoá sau case',
		targetType,
		updateMode: targetType === 1 ? 1 : null,
		autoUpdate: targetType === 1 ? 1 : null,
		conditions,
		memberIds,
		discountPercent: null,
	});
	expect(String(b?.status?.code), `Tạo nhóm lỗi: ${JSON.stringify(b?.status)}`).toBe('200');
	const id = b?.data?.groupId ?? b?.data?.id ?? b?.data;
	if (id && typeof id !== 'object') return id;
	return (await timNhom(page, st, ten))?.groupId;
}

async function timNhom(page, st, ten) {
	const b = await g.k.goiGhi(page, st, 'GET', `${API}/get-list`, { keyword: ten, page: 0, size: 20 });
	const ds = Array.isArray(b?.data) ? b.data : (b?.data?.content ?? []);
	return ds.find((x) => x.groupName === ten) ?? null;
}

async function xoaNhomApi(page, st, groupId) {
	if (!groupId) return null;
	return g.k.goiGhi(page, st, 'DELETE', `${API}/delete`, { groupId });
}

/** Khách `ma` có trong nhóm? */
async function laThanhVien(page, st, groupId, ma) {
	const b = await g.k.goiGhi(page, st, 'GET', `${API}/get-members`, { groupId, keyword: ma, page: 0, size: 20 });
	const ds = Array.isArray(b?.data) ? b.data : (b?.data?.content ?? []);
	return ds.some((x) => JSON.stringify(x).includes(ma));
}

/** Điều kiện khoanh khách vừa mua đúng 1 đơn trong khoảng (tu, den]. */
const dkMotDon = (tu, den) => [
	{ conditionType: 1, operator: 1, valueNumeric: tu, valueInt: null, valueDate: null },
	{ conditionType: 1, operator: 4, valueNumeric: den, valueInt: null, valueDate: null },
	{ conditionType: 10, operator: 5, valueNumeric: 1, valueInt: null, valueDate: null },
];

module.exports = { API, taoNhomApi, timNhom, xoaNhomApi, laThanhVien, dkMotDon };
