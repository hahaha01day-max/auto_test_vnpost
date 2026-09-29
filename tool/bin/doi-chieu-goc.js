#!/usr/bin/env node
'use strict';

/**
 * ĐỐI CHIẾU tài liệu gốc (sheet QC) ↔ kịch bản đã dựng.
 *
 *   node tool/bin/doi-chieu-goc.js <ma-phan-he>   # ghi <phân hệ>/doi-chieu-tai-lieu-goc.md
 *   node tool/bin/doi-chieu-goc.js --tat-ca       # mọi phân hệ có case gốc
 *   node tool/bin/doi-chieu-goc.js --tong-hop     # tai-lieu-test/_DOI_CHIEU_GOC.md
 *
 * 🔴 Khoá nối hai bên là cột **`Ma goc`** trong `test-cases.csv`. Phân hệ chưa có cột đó thì báo cáo
 * sẽ ghi 0% và liệt kê TOÀN BỘ case gốc là "chưa dựng" — đó là **đúng theo dữ liệu đang có**, không
 * phải lỗi công cụ: không ai khai được case nào đã phủ case gốc nào thì không thể kết luận khác.
 * Việc điền `Ma goc` là việc tay, làm một lần cho mỗi phân hệ (xem skill `test-scenario`).
 *
 * 🚫 Công cụ KHÔNG tự khớp theo tên. Hai case cùng chữ chưa chắc cùng nghiệp vụ, và khớp mờ sẽ đẻ ra
 * con số độ phủ đẹp mà sai — thứ nguy hiểm hơn là không có số nào.
 *
 * ⭐ Phần viết tay giữ lại qua mỗi lần sinh: mọi thứ sau dòng `<!-- NHAN-XET-TAY -->` được chép
 * nguyên vào file mới.
 */

const fs = require('node:fs');
const path = require('node:path');

const { listModules, getModule, TEST_ROOT, PROJECT_ROOT } = require('../core/modules');
const { parseCsv } = require('../core/cases');
const goc = require('../core/goc');
const { phanHeCho, fileCuaModule, ANH_XA } = require('../core/goc-mapping');

const MOC_TAY = '<!-- NHAN-XET-TAY -->';
const TEN_FILE = 'doi-chieu-tai-lieu-goc.md';

/** Gom case gốc theo phân hệ. */
function gomCaseGoc() {
  const theoModule = new Map();
  const chuaGan = [];
  const thongTinFile = [];

  for (const file of goc.danhSachFile()) {
    const r = goc.docCaFile(file);
    thongTinFile.push({
      file,
      soCase: r.cases.length,
      tongKhaiBao: r.tongKhaiBao,
      lechKhaiBao: r.tongKhaiBao != null && r.tongKhaiBao !== r.cases.length,
      trungLap: goc.timTrungLap(r.cases),
      loi: r.loi,
    });
    if (r.loi) continue;

    for (const c of r.cases) {
      const { module } = phanHeCho(file, c.nhom);
      if (!module) { chuaGan.push({ ...c, file }); continue; }
      if (!theoModule.has(module)) theoModule.set(module, []);
      theoModule.get(module).push({ ...c, file });
    }
  }
  return { theoModule, chuaGan, thongTinFile };
}

/** Case đã dựng của một phân hệ + bản đồ `Ma goc` → case. */
function docCaseDaDung(mod) {
  if (!mod.csvPath || !fs.existsSync(mod.csvPath)) return { cases: [], coCotMaGoc: false, theoMaGoc: new Map() };

  const rows = parseCsv(fs.readFileSync(mod.csvPath, 'utf8'));
  if (rows.length < 2) return { cases: [], coCotMaGoc: false, theoMaGoc: new Map() };

  const h = rows[0].map((x) => String(x || '').trim().toLowerCase());
  const iId = 0;
  const iTen = h.indexOf('ten test case') >= 0 ? h.indexOf('ten test case') : 1;
  const iMaGoc = h.indexOf('ma goc');
  const iNguon = h.indexOf('nguon');

  const cases = rows.slice(1).filter((r) => (r[iId] || '').trim()).map((r) => ({
    id: (r[iId] || '').trim(),
    ten: (r[iTen] || '').trim(),
    maGoc: iMaGoc >= 0 ? (r[iMaGoc] || '').trim() : '',
    nguon: iNguon >= 0 ? (r[iNguon] || '').trim() : '',
  }));

  // 🔴 MỘT case đã dựng có thể phủ NHIỀU case gốc (sheet QC hay tách một hành vi thành 5 case tìm
  //    kiếm khác nhau). Cho phép `Ma goc` chứa nhiều mã, ngăn bằng dấu `;`. Ép 1-1 thì các mã còn
  //    lại vĩnh viễn nằm ở cột "chưa dựng" dù đã có script phủ.
  const theoMaGoc = new Map();
  for (const c of cases) {
    if (!c.maGoc) continue;
    for (const raw of c.maGoc.split(';')) {
      const ma = (raw.includes('#') ? raw.split('#').pop() : raw).trim();
      if (!ma) continue;
      if (!theoMaGoc.has(ma)) theoMaGoc.set(ma, []);
      theoMaGoc.get(ma).push(c);
    }
  }
  return { cases, coCotMaGoc: iMaGoc >= 0, theoMaGoc };
}

function nhanXetTayCu(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const cu = fs.readFileSync(filePath, 'utf8');
  // 🔴 Marker phải khớp TRỌN DÒNG: phần mở đầu của báo cáo cũng nhắc tên marker trong văn xuôi,
  // bắt bằng indexOf/lastIndexOf thường sẽ dính vào dòng văn xuôi đó và tha cả bản báo cáo cũ sang
  // bản mới (file phình lên gấp đôi mỗi lần sinh).
  const m = [...cu.matchAll(new RegExp('^' + MOC_TAY + '\\s*$', 'gm'))];
  return m.length ? cu.slice(m[m.length - 1].index) : '';
}

const esc = (s) => String(s || '').replace(/\|/g, '/').replace(/\n+/g, ' ').trim();

function bangDoiChieu(mod, caseGoc, daDung) {
  const { theoMaGoc, coCotMaGoc } = daDung;

  const khop = [];
  const thieu = [];
  for (const g of caseGoc) {
    const ma = g.maKhoa;
    const hit = ma && theoMaGoc.get(ma);
    if (hit && hit.length) khop.push({ goc: g, dung: hit });
    else thieu.push(g);
  }

  const maGocDaDung = new Set(caseGoc.map((g) => g.maKhoa).filter(Boolean));
  const ngoaiGoc = daDung.cases.filter((c) => {
    if (!c.maGoc) return true;
    return !c.maGoc.split(';').some((raw) => {
      const ma = (raw.includes('#') ? raw.split('#').pop() : raw).trim();
      return maGocDaDung.has(ma);
    });
  });

  // Trùng lặp trong chính phần case gốc của phân hệ này.
  const trungLap = goc.timTrungLap(caseGoc);
  const maTrung = new Set();
  for (const nhom of trungLap) nhom.slice(1).forEach((c) => maTrung.add(c.maKhoa));
  const thieuThuc = thieu.filter((g) => !maTrung.has(g.maKhoa));

  return { khop, thieu, thieuThuc, ngoaiGoc, trungLap, coCotMaGoc };
}

function sinhBaoCao(moduleId, caseGoc) {
  const mod = getModule(moduleId);
  if (!mod) { console.error(`Không có phân hệ "${moduleId}"`); return null; }

  const daDung = docCaseDaDung(mod);
  const kq = bangDoiChieu(mod, caseGoc, daDung);
  const files = [...new Set(caseGoc.map((c) => c.file))];
  const hom_nay = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');

  let md = `# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — ${mod.name}

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> \`node tool/bin/doi-chieu-goc.js ${moduleId}\`
> Nhận xét viết tay đặt sau dòng \`${MOC_TAY}\` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: ${hom_nay}

- Phân hệ: \`${moduleId}\`
- Tài liệu gốc liên quan: ${files.map((f) => `[\`${f}\`](../test-case-goc/${f})`).join(' · ')}
- Khoá nối: cột **\`Ma goc\`** trong [\`test-cases.csv\`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **${caseGoc.length}** |
| — trong đó **trùng lặp** trong chính sheet gốc | ${caseGoc.length - kq.thieuThuc.length - kq.khop.length >= 0 ? kq.thieu.length - kq.thieuThuc.length : 0} |
| **Case gốc đã dựng** | **${kq.khop.length}** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **${kq.thieuThuc.length}** |
| Case đã dựng trong \`test-cases.csv\` | ${daDung.cases.length} |
| — **tài liệu gốc KHÔNG có** | ${kq.ngoaiGoc.length} |
`;

  if (!daDung.coCotMaGoc) {
    md += `
> 🔴 **\`test-cases.csv\` của phân hệ này CHƯA có cột \`Ma goc\`** nên không nối được với sheet gốc.
> Con số "đã dựng = 0" ở trên phản ánh **đúng dữ liệu đang có**, không phải phân hệ chưa làm gì.
> Phải điền \`Ma goc\` cho từng case (việc tay, một lần) rồi chạy lại lệnh sinh.
`;
  } else if (caseGoc.length > 0) {
    const pct = Math.round((kq.khop.length / caseGoc.length) * 100);
    md += `\n**Độ phủ tài liệu gốc: ${pct}%**\n`;
  }

  if (kq.trungLap.length) {
    md += `\n## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm\n
So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.\n
| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
`;
    for (const n of kq.trungLap) {
      md += `| \`${n[0].maKhoa}\` | ${n.slice(1).map((x) => '`' + x.maKhoa + '`').join(', ')} | ${esc(n[0].ten)} |\n`;
    }
  }

  md += `\n## 3. Case tài liệu gốc CÓ mà CHƯA dựng — ${kq.thieuThuc.length} case\n`;
  if (kq.thieuThuc.length === 0) {
    md += '\n✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.\n';
  } else {
    md += '\n🔴 **Đây là việc phải làm.** Mỗi dòng là một case sheet QC có mà kịch bản còn thiếu.\n\n';
    md += '| Mã gốc | Nhóm | Tình huống | Kết quả mong muốn (rút gọn) |\n|---|---|---|---|\n';
    for (const g of kq.thieuThuc) {
      md += `| \`${g.maKhoa}\` | ${esc(g.nhom).slice(0, 40)} | ${esc(g.ten)} | ${esc(g.kyVong).slice(0, 110)} |\n`;
    }
  }

  md += `\n## 4. Case đã dựng mà tài liệu gốc KHÔNG có — ${kq.ngoaiGoc.length} case\n`;
  if (kq.ngoaiGoc.length === 0) {
    md += '\nKhông có.\n';
  } else {
    md += '\nPhần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.\n\n| Mã | Tình huống | Nguồn |\n|---|---|---|\n';
    for (const c of kq.ngoaiGoc) md += `| \`${c.id}\` | ${esc(c.ten)} | ${esc(c.nguon) || '—'} |\n`;
  }

  md += `\n## 5. Bảng đối chiếu đầy đủ ${caseGoc.length} case gốc\n
| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
`;
  for (const g of caseGoc) {
    const hit = daDung.theoMaGoc.get(g.maKhoa);
    md += `| \`${g.maKhoa}\` | ${esc(g.ten)} | ${hit && hit.length ? hit.map((x) => '`' + x.id + '`').join(', ') : '— **chưa dựng**'} |\n`;
  }

  const tay = nhanXetTayCu(path.join(mod.dir, TEN_FILE));
  md += `\n${tay || `${MOC_TAY}\n\n## 6. Nhận xét thủ công\n\n_(Viết vào đây. Phần từ dòng \`${MOC_TAY}\` trở xuống KHÔNG bị ghi đè khi sinh lại.)_\n`}`;

  fs.writeFileSync(path.join(mod.dir, TEN_FILE), md);
  return { moduleId, ...kq, soGoc: caseGoc.length, soDung: daDung.cases.length, coCotMaGoc: daDung.coCotMaGoc };
}

function sinhTongHop(ketQua, chuaGan, thongTinFile) {
  const hom_nay = new Date().toISOString().slice(0, 10).split('-').reverse().join('/');
  const tongGoc = ketQua.reduce((s, r) => s + r.soGoc, 0);
  const tongKhop = ketQua.reduce((s, r) => s + r.khop.length, 0);
  const tongThieu = ketQua.reduce((s, r) => s + r.thieuThuc.length, 0);
  const chuaCoMaGoc = ketQua.filter((r) => !r.coCotMaGoc);

  let md = `# Đối chiếu tài liệu gốc ↔ kịch bản — tổng hợp

> 🤖 **Sinh tự động.** Chạy lại: \`node tool/bin/doi-chieu-goc.js --tong-hop\`
> Cập nhật: ${hom_nay}

- Case trong 19 tài liệu gốc: **${thongTinFile.reduce((s, f) => s + f.soCase, 0)}**
- Đã gán được phân hệ: **${tongGoc}** · chưa gán: **${chuaGan.length}**
- Case gốc **đã dựng**: **${tongKhop}** · **chưa dựng**: **${tongThieu}**
- Phân hệ **chưa có cột \`Ma goc\`** nên chưa đối chiếu được: **${chuaCoMaGoc.length}/${ketQua.length}**

## 1. Theo phân hệ

| Phân hệ | Case gốc | Đã dựng | Chưa dựng | Ngoài gốc | Nối được? |
|---|--:|--:|--:|--:|---|
`;
  for (const r of [...ketQua].sort((a, b) => b.soGoc - a.soGoc)) {
    md += `| \`${r.moduleId}\` | ${r.soGoc} | ${r.khop.length} | ${r.thieuThuc.length} | ${r.ngoaiGoc.length} | ${r.coCotMaGoc ? '✅' : '🔴 thiếu `Ma goc`'} |\n`;
  }

  md += `\n## 2. Sức khoẻ từng tài liệu gốc\n
| Tài liệu | Case đọc được | Sheet tự khai | Trùng lặp | Ghi chú |
|---|--:|--:|--:|---|
`;
  for (const f of thongTinFile) {
    const soTrung = f.trungLap.reduce((s, n) => s + n.length - 1, 0);
    md += `| \`${f.file}\` | ${f.soCase} | ${f.tongKhaiBao ?? '—'} | ${soTrung || ''} | ${f.loi ? '🔴 ' + f.loi : f.lechKhaiBao ? '⚠️ lệch so với tổng sheet tự khai' : ''} |\n`;
  }

  if (chuaGan.length) {
    md += `\n## 3. 🔴 Case gốc CHƯA có phân hệ nào nhận — ${chuaGan.length} case\n
Không phải lỗi công cụ: nghiệp vụ này chưa có thư mục trong \`tai-lieu-test/\`.\n
| Tài liệu | Nhóm | Số case |
|---|---|--:|
`;
    const gom = {};
    for (const c of chuaGan) { const k = c.file + '|' + c.nhom; gom[k] = (gom[k] || 0) + 1; }
    for (const [k, v] of Object.entries(gom)) md += `| \`${k.split('|')[0]}\` | ${k.split('|')[1]} | ${v} |\n`;
  }

  md += `\n## 4. Việc tiếp theo\n
1. Phân hệ còn **🔴 thiếu \`Ma goc\`** → điền cột đó rồi chạy lại. Chưa điền thì mọi con số độ phủ của
   phân hệ đó là vô nghĩa.
2. Phân hệ có **Chưa dựng > 0** → bổ sung case vào \`test-cases.csv\` (skill \`test-scenario\`).
3. Nhóm ở mục 3 → quyết định lập thư mục phân hệ mới hay gộp vào phân hệ đã có, rồi khai vào
   \`tool/core/goc-mapping.js\`.
`;

  fs.writeFileSync(path.join(TEST_ROOT, '_DOI_CHIEU_GOC.md'), md);
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.log('Dùng: node tool/bin/doi-chieu-goc.js <ma-phan-he> | --tat-ca | --tong-hop');
    process.exit(1);
  }

  const { theoModule, chuaGan, thongTinFile } = gomCaseGoc();

  if (arg === '--tat-ca' || arg === '--tong-hop') {
    const ketQua = [];
    for (const [moduleId, cases] of theoModule) {
      const r = sinhBaoCao(moduleId, cases);
      if (r) ketQua.push(r);
    }
    sinhTongHop(ketQua, chuaGan, thongTinFile);
    console.log(`Đã ghi ${ketQua.length} báo cáo phân hệ + ${path.relative(PROJECT_ROOT, path.join(TEST_ROOT, '_DOI_CHIEU_GOC.md'))}`);
    const thieu = ketQua.filter((r) => !r.coCotMaGoc).length;
    console.log(`  ${ketQua.reduce((s, r) => s + r.khop.length, 0)} case gốc đã dựng · ${ketQua.reduce((s, r) => s + r.thieuThuc.length, 0)} chưa dựng · ${thieu} phân hệ chưa có cột Ma goc`);
    return;
  }

  const cases = theoModule.get(arg);
  if (!cases) {
    console.error(`Không có case gốc nào ánh xạ về "${arg}".`);
    console.error(`Tài liệu gốc khai cho phân hệ này: ${fileCuaModule(arg).join(', ') || '(chưa khai trong goc-mapping.js)'}`);
    process.exit(1);
  }
  const r = sinhBaoCao(arg, cases);
  if (r) console.log(`Đã ghi ${arg}/${TEN_FILE} — gốc ${r.soGoc} · đã dựng ${r.khop.length} · chưa dựng ${r.thieuThuc.length}`);
}

main();
