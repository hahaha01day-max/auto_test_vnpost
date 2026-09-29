#!/usr/bin/env node
'use strict';

/**
 * Đổi `runs.module_id` trong DB theo cây thư mục mới.
 *
 * 🔴 `module_id` lưu ĐÚNG tên thư mục. Đổi tên thư mục mà không chạy cái này thì mọi run cũ
 * trở thành mồ côi: trang lịch sử vẫn liệt kê chúng, nhưng bấm vào là "không có module này",
 * và việc so "lỗi mới / lỗi cũ" mất điểm neo — báo cáo sẽ coi MỌI lỗi là lỗi mới.
 *
 * Module cũ trải trên nhiều phân hệ thì không có đáp án đúng cho run cũ. Chọn thư mục nhận
 * PHẦN LỚN case của module đó, và ghi rõ vào `error` để người đọc lịch sử biết run đó thuộc
 * cây cũ.
 */

const { getDb } = require('../core/db');

const MODULE_ID_MAP = {
  '01-mo-hinh-to-chuc': '32_mo_hinh_to_chuc',
  '02-phan-quyen-vai-tro': '31_quan_ly_phan_quyen',
  '04-quan-ly-san-pham-danh-muc-san-pham': '08_quan_ly_san_pham',
  '05-ban-hang-pos': '18_1_ban_hang_tai_quay',
  '08-khach-hang-than-thiet-loyalty': '20_khach_hang_than_thiet',
  '09-chuong-trinh-khuyen-mai': '18_2_khach_hang_va_uu_dai',
  '10-nha-cung-cap': '12_1_ho_so_nha_cung_cap',
  '11-kho': '04_3_nhap_xuat_chuyen_kho',
  'quan-ly-nhan-vien': '02_quan_ly_nhan_vien',
};

const NOTE = 'Run thuộc cây thư mục cũ (trước khi đổi mã theo HDSD ngày 17/09/2026).';

function main() {
  const db = getDb();
  let moved = 0;

  for (const [oldId, newId] of Object.entries(MODULE_ID_MAP)) {
    const rows = db.prepare('SELECT COUNT(*) AS n FROM runs WHERE module_id = ?').get(oldId).n;
    if (rows === 0) continue;

    db.prepare(
      `UPDATE runs SET module_id = ?, error = CASE WHEN error = '' THEN ? ELSE error || ' | ' || ? END
       WHERE module_id = ?`,
    ).run(newId, NOTE, NOTE, oldId);

    console.log(`  ${oldId} → ${newId}  (${rows} run)`);
    moved += rows;
  }

  console.log(moved > 0 ? `\nĐã chuyển ${moved} run.` : 'Không có run nào thuộc module cũ.');

  const orphan = db
    .prepare('SELECT module_id, COUNT(*) AS n FROM runs GROUP BY module_id')
    .all()
    .filter((r) => Object.keys(MODULE_ID_MAP).includes(r.module_id));
  if (orphan.length > 0) console.log('🔴 Vẫn còn run trỏ module cũ:', orphan);
}

main();
