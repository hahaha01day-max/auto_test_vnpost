'use strict';

/**
 * 🌱 **DỰNG NỀN cho phân hệ 03b** — 🚫 KHÔNG phải test case, 🚫 không mang mã case nào.
 *
 * Xếp cho **nhân viên của điểm bán seed** (`AUTO_SHOP_*`) **hai ca của ngày hôm nay**. Không có ca thì màn
 * `/lich-ca-nhan/ca-lam-viec` chỉ hiện "Chưa có ca làm việc hôm nay" và **34/36 case vỏ rỗng** của
 * phân hệ này skip sạch — đó chính là lý do 03b đứng ở 12/48 suốt từ đầu.
 *
 * 🔴 Vì sao HAI ca chứ không phải một: `03b_010_003` (ẩn nút "Mở ca" ở mọi thẻ khác khi đã có ca
 *    mở) và `03b_030_003` (chặn mở ca khi còn ca chưa chốt) đều đòi **≥2 ca trong ngày** mới quan
 *    sát được. Với một ca duy nhất, cả hai case chỉ kiểm được chính cái thẻ đang mở ⇒ **pass giả**.
 *    Cái giá phải trả: `03b_050_004` ("ngày chỉ có đúng 1 ca thì ẩn nút Xem báo cáo") sẽ skip —
 *    đổi 1 case đọc lấy 2 case hành vi, và 🚫 không có cách nào thoả cả hai trong cùng một ngày.
 *
 * 🔴 **Idempotent.** Chạy lại nhiều lần 🚫 không được đẻ thêm lịch. Backend trả
 *    `SSHOP-500 "Nhân viên bị trùng lịch"` khi ca đó đã được xếp — với bộ dựng nền đó là
 *    **đã xong**, 🚫 không phải đỏ. Coi là đỏ thì mỗi lần chạy lại đều đỏ dù mọi thứ đã đúng.
 *
 * 🔴 Chạy ở project `seed`, và project `seed_shop` khai `dependencies: ['seed']` để luôn chạy sau.
 *    Vai `seed_shop` là **Cửa hàng trưởng** của chính điểm bán seed nên tự xếp lịch cho mình được.
 */

const { test, expect } = require('@playwright/test');
const { moManLich } = require('../../03a_quan_ly_ca_lich_lam_viec/tests/shift-page');
const { doc: docSo } = require('../../00_seed/seed-state');

const VAI = 'seed_shop';
/**
 * 🔴 Xếp ca cho **nhân viên của điểm bán seed**, lấy TÊN từ sổ `00_seed/seed-state.json`
 *    (`nhanSu.tenNhanVien`, ví dụ `AUTO_NV_68051351`) — 🚫 KHÔNG hardcode và 🚫 KHÔNG lấy nhãn
 *    phạm vi trong `.env`: ô chọn hiển thị TÊN NHÂN VIÊN, khớp nhầm là xếp ca cho NGƯỜI KHÁC
 *    (lượt 22/09 đã xếp trúng "Lý Sơn - CHT" vì bám nhãn vai).
 */
const NHAN_VIEN = docSo().duLieu?.nhanSu?.tenNhanVien || '';
const TAI_KHOAN = process.env.VNPOST_ACCOUNT_SEED_SHOP || '';
/**
 * 🔴 Nhân viên **THỨ HAI** cùng điểm bán seed — tên suy từ tài khoản `seed_gdv`
 *    (`autonv64359388` → `AUTO_NV_64359388`). Cần cho các case đòi **hai người cùng có ca trong
 *    ngày** (`03b_050_005`) và **ca chưa chốt của NGƯỜI KHÁC** (`03b_030_006`) — 🚫 không dựng
 *    được bằng một tài khoản.
 */
const TAI_KHOAN_2 = process.env.VNPOST_ACCOUNT_SEED_GDV || '';
const NHAN_VIEN_2 = TAI_KHOAN_2 ? `AUTO_NV_${TAI_KHOAN_2.replace(/\D/g, '')}` : '';

/** Số ca cần có trong ngày — xem chú thích đầu file về `010_003` / `030_003`. */
const SO_CA_CAN = 2;

const chuan = (s) => (s ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * Hôm nay dạng **`DD/MM/YYYY`** — đúng `format` của `DatePicker` ở `DrawerSchedule.jsx`.
 * 🔴 Gõ `YYYY-MM-DD` là ô 🚫 không nhận, và 🚫 đừng dùng `toISOString()`: nó trả giờ UTC nên quá
 *    22:00 +7 là lùi mất một ngày, lịch xếp vào HÔM QUA mà 🚫 không báo gì.
 */
function homNay() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

test.describe('🌱 Dựng nền 03b — ca làm việc hôm nay ở điểm bán seed', () => {
  test('seed: bảo đảm nhân viên điểm bán seed có đủ ca hôm nay', async ({ page }) => {
    test.skip(
      !TAI_KHOAN || !NHAN_VIEN,
      'Chưa có tài khoản `seed_shop` trong .env hoặc sổ seed chưa có `nhanSu.tenNhanVien` — '
        + '🚫 không biết xếp ca cho ai. Chạy bộ seed 00_seed bước 3 trước.',
    );
    test.setTimeout(300_000);

    await moManLich(page, VAI);

    const ghi = (mo) => test.info().annotations.push({ type: 'dựng nền', description: mo });

    /**
     * Mở một antd Select và trả về danh sách lựa chọn CỦA CHÍNH nó.
     *
     * 🔴 `.ant-select-dropdown:visible` là bẫy: antd 🚫 không huỷ dropdown cũ mà chỉ gắn class
     *    `-hidden` **sau một nhịp animation**, nên ngay sau khi đóng ô nhân viên, locator vẫn bắt
     *    trúng dropdown đó — lượt chạy 22/09 đã chọn nhầm "Lý Sơn - CHT" (một NHÂN VIÊN) vào ô
     *    **ca làm việc** rồi kẹt ở "element is not stable" tới hết timeout.
     *    Dropdown của một Select mang `id = "<name>_list"` ở phần tử gốc — bám theo đó.
     */
    const moSelect = async (dr, ten) => {
      await dr.locator(`#${ten}`).click();
      const dd = page.locator(`.ant-select-dropdown:has(#${ten}_list)`).last();
      await dd.waitFor({ state: 'visible', timeout: 20_000 });
      return dd.locator('.ant-select-item-option:not(.ant-select-item-option-disabled)');
    };

    /**
     * Xếp ca thứ `chiSoCa` (0-based trong danh sách ca đang hoạt động) cho nhân viên của điểm bán seed.
     * Trả về `'da-co'` khi backend báo trùng lịch, `'moi'` khi xếp mới, `'het-ca'` khi danh sách
     * ca 🚫 không đủ dài.
     */
    const xepCa = async (chiSoCa, ai = NHAN_VIEN) => {
      await page.getByRole('button', { name: 'Xếp lịch làm việc' }).click();
      const dr = page.locator('.ant-drawer-open').last();
      await expect(dr.locator('.ant-drawer-title')).toHaveText('Thêm lịch làm việc', {
        timeout: 20_000,
      });

      // Nhân viên — ô nhiều lựa chọn, tìm theo TÊN nhân viên ghi trong sổ seed.
      const dsNV = await moSelect(dr, 'employeeIds');
      await expect
        .poll(() => dsNV.count(), { timeout: 20_000, message: 'Danh sách nhân viên rỗng' })
        .toBeGreaterThan(0);
      const khop = dsNV.filter({ hasText: ai });
      expect(
        await khop.count(),
        `🚫 Không thấy nhân viên nào khớp "${ai}" trong ô chọn — 🔴 đừng xếp bừa cho người đầu danh sách.`,
      ).toBeGreaterThan(0);
      const chon = khop.first();
      const tenDaChon = chuan(await chon.innerText());
      await chon.click();
      await page.keyboard.press('Escape');
      // Chờ dropdown nhân viên thật sự khuất, 🚫 đừng đi tiếp ngay: xem chú thích ở `moSelect`.
      await page
        .locator('.ant-select-dropdown:has(#employeeIds_list)')
        .last()
        .waitFor({ state: 'hidden', timeout: 10_000 })
        .catch(() => {});

      // Ngày — 🚫 KHÔNG tích "Lặp lại": chỉ cần đúng một ngày hôm nay.
      // 🔴 Ô tên `targetDate` (đo ở `DrawerSchedule.jsx`), 🚫 không phải `workDate`/`date`.
      const oNgay = dr.locator('#targetDate');
      await oNgay.click();
      await oNgay.fill(homNay());
      await page.keyboard.press('Enter');

      // Ca làm việc — danh sách chỉ gồm ca đang hoạt động.
      const dsCa = await moSelect(dr, 'shiftId');
      await expect
        .poll(() => dsCa.count(), {
          timeout: 20_000,
          message: '🔴 Điểm bán chưa có ca nào đang hoạt động — phải tạo ca trước (task 010 của 03a).',
        })
        .toBeGreaterThan(0);
      if ((await dsCa.count()) <= chiSoCa) {
        await page.keyboard.press('Escape');
        await dr.getByRole('button', { name: 'Huỷ' }).first().click().catch(() => {});
        return { ket: 'het-ca', tenCa: null, tenDaChon };
      }
      const oCa = dsCa.nth(chiSoCa);
      const tenCa = chuan(await oCa.innerText());
      await oCa.click();

      const cho = page.waitForResponse(
        (r) => /schedule/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 60_000 },
      );
      await dr.getByRole('button', { name: 'Xác nhận' }).click();
      const res = await cho;
      const body = await res.json().catch(() => null);
      const ma = String(body?.status?.code);
      const loi = String(body?.status?.message ?? '');

      /**
       * 🔴 `Nhân viên bị trùng lịch tại ca <X>` có HAI nghĩa khác hẳn nhau, phân biệt bằng tên ca
       *    trong chính câu lỗi:
       *    - `<X>` là **ca đang xếp** ⇒ ca đó đã có sẵn từ lượt trước ⇒ NỀN ĐÃ XONG, tính là 1 ca.
       *    - `<X>` là **ca khác** ⇒ ca đang xếp **chồng khung giờ** với ca đã có ⇒ 🚫 KHÔNG xếp được,
       *      phải thử ca tiếp theo. Tính nhầm cái này là "đã có" thì sổ báo đủ 2 ca trong khi màn
       *      cá nhân chỉ hiện 1, và `010_003` đỏ với lý do hoàn toàn không liên quan.
       */
      if (ma !== '200' && /trùng lịch/i.test(loi) && !loi.includes(tenCa)) {
        await dr.getByRole('button', { name: 'Huỷ' }).first().click().catch(() => {});
        await page.locator('.ant-drawer-open').waitFor({ state: 'detached', timeout: 10_000 })
          .catch(() => {});
        return { ket: 'chong-gio', tenCa, tenDaChon, loi };
      }
      if (ma !== '200' && /trùng lịch/i.test(loi)) {
        await dr.getByRole('button', { name: 'Huỷ' }).first().click().catch(() => {});
        await page.locator('.ant-drawer-open').waitFor({ state: 'detached', timeout: 10_000 })
          .catch(() => {});
        return { ket: 'da-co', tenCa, tenDaChon, loi };
      }
      expect(
        ma,
        `Xếp ca "${tenCa}" hôm nay cho "${tenDaChon}" thất bại: ${JSON.stringify(body?.status)}`,
      ).toBe('200');
      await page.locator('.ant-drawer-open').waitFor({ state: 'detached', timeout: 15_000 })
        .catch(() => {});
      return { ket: 'moi', tenCa, tenDaChon };
    };

    /**
     * 🔴 Duyệt HẾT danh sách ca chứ 🚫 không lấy ca thứ 0 và thứ 1: backend từ chối ca nào **chồng
     *    khung giờ** với ca đã xếp (`Nhân viên bị trùng lịch tại ca Ca sáng`). Lấy theo chỉ số là
     *    gặp một ca chồng rồi dừng ở đúng một ca, trong khi vẫn còn ca hợp lệ ở cuối danh sách —
     *    và `010_003` / `030_003` skip vì "chỉ có 1 ca" dù điểm bán có ba ca.
     */
    let daXep = 0;
    for (let i = 0; daXep < SO_CA_CAN; i += 1) {
      const kq = await xepCa(i);
      if (kq.ket === 'het-ca') {
        ghi(
          `🔴 Điểm bán chỉ có ${i} ca đang hoạt động — 🚫 không dựng đủ ${SO_CA_CAN} ca. `
            + 'Case 03b_010_003 / 03b_030_003 sẽ skip vì thiếu ca thứ hai.',
        );
        break;
      }
      if (kq.ket === 'chong-gio') {
        ghi(`Ca "${kq.tenCa}" chồng giờ với ca đã xếp (${kq.loi}) — thử ca kế tiếp.`);
        continue;
      }
      daXep += 1;
      ghi(
        kq.ket === 'moi'
          ? `Đã xếp ca "${kq.tenCa}" ngày ${homNay()} cho "${kq.tenDaChon}".`
          : `Ca "${kq.tenCa}" hôm nay đã có sẵn cho "${kq.tenDaChon}" (${kq.loi}) — không xếp thêm.`,
      );
    }

    expect(daXep, 'Không dựng được ca nào cho hôm nay — mọi case 03b sẽ skip').toBeGreaterThan(0);

    // ── Nhân viên THỨ HAI: chỉ cần MỘT ca hôm nay ───────────────────────────────────────────────
    if (!NHAN_VIEN_2) {
      ghi('🚫 Chưa khai VNPOST_ACCOUNT_SEED_GDV — bỏ qua việc xếp ca cho nhân viên thứ hai.');
      return;
    }
    let daXep2 = 0;
    for (let i = 0; daXep2 < 1; i += 1) {
      const kq = await xepCa(i, NHAN_VIEN_2);
      if (kq.ket === 'het-ca') {
        ghi(`🔴 Hết ca để xếp cho "${NHAN_VIEN_2}" — case 03b_050_005 / 03b_030_006 sẽ skip.`);
        break;
      }
      if (kq.ket === 'chong-gio') continue;
      daXep2 += 1;
      ghi(
        kq.ket === 'moi'
          ? `Đã xếp ca "${kq.tenCa}" ngày ${homNay()} cho "${kq.tenDaChon}" (người thứ hai).`
          : `Ca "${kq.tenCa}" hôm nay đã có sẵn cho "${kq.tenDaChon}" (người thứ hai).`,
      );
    }
  });
});
