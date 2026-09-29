#!/usr/bin/env node
'use strict';

/**
 * Bật lại các case đang `enabled: false` **chỉ vì thiếu dữ liệu nền** mà bộ seed 00_seed nay đã có.
 *
 * 🔴 🚫 KHÔNG bật hàng loạt theo từ khoá. Quét thô cụm "sản phẩm / NCC / kho" ra hơn 1.000 case,
 * nhưng phần lớn cần thứ seed 🚫 KHÔNG tạo (hoá đơn có sẵn, đơn hoàn trả, CTKM, phiếu đặt hàng,
 * sản phẩm đủ 4 phương pháp giá vốn). Bật nhầm là biến "case bị chặn có lý do" thành "case đỏ
 * không ai hiểu vì sao".
 *
 * 🔴 Bật `enabled` 🚫 KHÔNG làm case GHI chạy: `skipReason()` còn hai lớp nữa — thiếu input bắt
 * buộc, và `mutates && !allowMutation`. Tool này chỉ gỡ đúng lớp "tắt vì chưa có dữ liệu nền".
 *
 * 🔴 Lý do cũ được giữ lại ở `_blocked_cu` — 🚫 đừng xoá: mất nó là mất dấu vì sao case từng tắt.
 *
 *   node tool/bin/bat-case-seed-phu.js            # chạy thử, chỉ in ra
 *   node tool/bin/bat-case-seed-phu.js --ap-dung  # ghi vào test-input.json
 */

const fs = require('node:fs');
const path = require('node:path');

const { TEST_ROOT, PROJECT_ROOT } = require('../core/modules');

/**
 * Luật bật — mỗi luật nói rõ **seed đã tạo cái gì** để phủ được case.
 * 🔴 Thêm luật mới thì phải chỉ ra được thứ tương ứng trong `00_seed/seed-state.json`.
 */
const LUAT = [
  {
    module: '04_3_nhap_xuat_chuyen_kho',
    vi: 'điểm bán + kho + tồn thật + BỘ 4 SẢN PHẨM theo 4 phương pháp giá vốn '
      + '(MAC · FIFO · đích danh có serial · giá tiêu chuẩn) — seed bước 2, 4, 8',
    hop: (c) => /đủ 4 phương pháp/.test(c._blocked || ''),
  },
  {
    module: '04_3_nhap_xuat_chuyen_kho',
    vi: 'sản phẩm theo từng phương pháp giá vốn, có lô và serial (seed bước 4)',
    hop: (c) =>
      /(FIFO|đích danh|tiêu chuẩn|MAC).*(chưa có dữ liệu nền)/i.test(c._blocked || ''),
  },
  {
    module: '29_bao_cao',
    vi: 'tài khoản vai `tct` đã khai trong .env và dùng chạy suốt bộ seed',
    // 🔴 Chỉ bật case ĐỌC (`mutates !== true`): lý do "Cần tài khoản vai tct" cũng gắn cho vài
    //    case ghi, 🚫 đừng vơ cả nắm.
    hop: (c) => /Cần tài khoản vai tct/i.test(c.blockedReason || c._blocked || '')
      && c.mutates !== true,
  },
  {
    module: '03a_quan_ly_ca_lich_lam_viec',
    vi: 'nhân viên mới tinh, chưa có lịch làm việc nào (seed bước 3)',
    hop: (c) => /nhân viên nền KHÔNG có lịch/i.test(c._blocked || ''),
  },
];

/** Tên + tiền điều kiện + các bước của case, lấy từ `test-cases.csv` để xét luật. */
function docMoTa(dir) {
  const f = path.join(dir, 'test-cases.csv');
  if (!fs.existsSync(f)) return {};
  const ra = {};
  // Đọc thô: chỉ cần biết dòng của case nói gì, 🚫 không cần bóc đúng từng cột.
  for (const dong of fs.readFileSync(f, 'utf8').split('\n')) {
    const ma = (dong.match(/^"?([0-9][0-9a-z_]*_[0-9]{3})"?,/) || [])[1];
    if (ma) ra[ma] = dong;
  }
  return ra;
}

function main() {
  const apDung = process.argv.includes('--ap-dung');
  let tongBat = 0;

  for (const luat of LUAT) {
    const dir = path.join(TEST_ROOT, luat.module);
    const f = path.join(dir, 'test-input.json');
    if (!fs.existsSync(f)) {
      console.log(`🔴 ${luat.module}: không có test-input.json`);
      continue;
    }
    const json = JSON.parse(fs.readFileSync(f, 'utf8'));
    const moTa = docMoTa(dir);
    const bat = [];

    for (const [ma, c] of Object.entries(json.cases || {})) {
      if (c.enabled !== false) continue;
      if (!luat.hop(c, moTa[ma] || '')) continue;
      bat.push(ma);
      if (apDung) {
        c._blocked_cu = c._blocked || c.blockedReason;
        delete c._blocked;
        delete c.blockedReason;
        c._batBoi = `seed 00_seed — ${luat.vi}`;
        c.enabled = true;
      }
    }

    tongBat += bat.length;
    console.log(`${apDung ? 'ĐÃ BẬT' : 'sẽ bật'} ${bat.length} case · ${luat.module}`);
    console.log(`   vì seed đã có: ${luat.vi}`);
    if (bat.length) console.log(`   ${bat.slice(0, 8).join(', ')}${bat.length > 8 ? ' …' : ''}`);

    if (apDung && bat.length) {
      fs.writeFileSync(f, `${JSON.stringify(json, null, 2)}\n`);
    }
  }

  console.log(`\n${apDung ? 'Đã bật' : 'Sẽ bật'} tổng ${tongBat} case.`);
  if (!apDung) console.log('Chạy lại kèm `--ap-dung` để ghi vào test-input.json.');
  else console.log(`Chạy \`node tool/bin/viec-can-lam.js\` để cập nhật ${path.relative(PROJECT_ROOT, path.join(TEST_ROOT, '_VIEC_CAN_LAM.md'))}.`);
}

main();
