'use strict';

/**
 * 🌱 **DỰNG NỀN — ca làm việc của điểm bán seed** (phân hệ 03a). 🚫 Không mang mã case nào.
 *
 * 🔴 Vì sao cần: điểm bán do bộ seed dựng (`AUTO_SHOP_*`) sinh ra với **đúng một ca "Ca sáng"
 *    07:30–12:00**. Hai case của 03b (`010_003` ẩn nút Mở ca ở thẻ khác · `030_003` chặn mở ca
 *    khi còn ca chưa chốt) đòi **≥2 ca trong ngày**, và cả cụm mở ca chỉ chạy được khi giờ hiện
 *    tại nằm trong **khung giờ cho phép chấm công** của ca. Một ca buổi sáng là lượt chạy buổi
 *    chiều skip sạch mà 🚫 không ai hiểu vì sao.
 *
 * ⇒ Dựng thêm **một ca chiều** (`13:00–22:00`) với khung chấm công rộng (`05:00–23:00`), ghép với
 *    "Ca sáng" sẵn có thành hai ca không chồng nhau trong ngày. 🔴 Ô giờ chỉ chọn được theo GIỜ TRÒN và 🚫 không nhận `00`/`23:45` — `chonKhungGio`
 *    bấm theo cột giờ, phút luôn `00`; khai `00:15` là nó lặng lẽ lấy giá trị khác.
 *
 * 🔴 Ca mới chồng khung giờ với "Ca sáng" ⇒ backend hỏi lại bằng hộp **"Ca làm việc bị chồng lấn"**
 *    (`Bạn có muốn tiếp tục lưu không?`). 🚫 KHÔNG bấm "Tiếp tục lưu" thì **🚫 không request nào đi**
 *    và `waitForResponse` chết sau 90s với `Timeout ... waiting for event "response"` — đọc như API
 *    chết trong khi hộp thoại vẫn đứng trên màn hình. Chồng lấn ở đây là **cố ý**: đúng cái làm nên
 *    hai ca cùng ngày cho `010_003` / `030_003`.
 *
 * 🔴 **Idempotent**: đã có ca mang tên này thì dừng. Ca 🚫 KHÔNG xoá được (chỉ ngừng hoạt động),
 *    chạy lại mà đẻ thêm là để rác vĩnh viễn trong danh sách ca của điểm bán.
 */

const { test, expect } = require('@playwright/test');
const { chonKhungGio, chuan, dong, moDrawerThemCa, moManCa } = require('./shift-page');

const VAI = 'seed_shop';

/** Tên cố định — 🔴 🚫 KHÔNG gắn hậu tố thời gian, nếu không mỗi lượt chạy lại đẻ một ca mới. */
const TEN_CA = 'AUTO CA CHIEU';
/**
 * 🔴 Giờ ca phải **🚫 KHÔNG chồng** "Ca sáng" (07:30–12:00) của điểm bán seed: backend từ chối
 *    xếp lịch ca thứ hai cùng ngày cho cùng người với `Nhân viên bị trùng lịch tại ca Ca sáng`,
 *    ⇒ có hai ca trong danh sách mà vẫn chỉ xếp được một, và `010_003` / `030_003` vẫn skip.
 * 🔴 Ngược lại, **khung chấm công cố ý để rộng** (05:00–23:00): nút "Mở ca" chỉ hiện trong khung
 *    này, để hẹp là lượt chạy buổi sáng 🚫 không mở nổi ca chiều và case `040_002` skip.
 */
const GIO_CA = ['13:00', '22:00'];
const GIO_CHAM_CONG = ['05:00', '23:00'];

test.describe('🌱 Dựng nền 03a — ca phủ cả ngày cho điểm bán seed', () => {
  test('seed: bảo đảm điểm bán seed có ca mở được ở mọi khung giờ', async ({ page }) => {
    test.setTimeout(180_000);
    await moManCa(page, VAI);

    const ghi = (mo) => test.info().annotations.push({ type: 'dựng nền', description: mo });

    const ds = (await dong(page).allInnerTexts()).map(chuan).join(' | ');
    if (ds.includes(TEN_CA)) {
      ghi(`Ca "${TEN_CA}" đã có — 🚫 không tạo thêm.`);
      return;
    }

    const dr = await moDrawerThemCa(page);
    await dr.locator('#name').fill(TEN_CA);
    await chonKhungGio(page, dr, 'workTime', GIO_CA[0], GIO_CA[1]);
    await chonKhungGio(page, dr, 'checkinTime', GIO_CHAM_CONG[0], GIO_CHAM_CONG[1]);

    const cho = page.waitForResponse(
      (r) => r.request().method() === 'POST' && r.url().includes('/timekeeping/shift'),
      { timeout: 90_000 },
    );
    await dr.getByRole('button', { name: 'Xác nhận' }).click();
    // Hộp "Ca làm việc bị chồng lấn" — xem chú thích đầu file. Chỉ hiện khi có ca trùng khung giờ.
    const hopChongLan = page.locator('.ant-modal-confirm, .ant-modal-wrap:visible').last();
    await hopChongLan
      .getByRole('button', { name: 'Tiếp tục lưu' })
      .click({ timeout: 8_000 })
      .catch(() => {});
    const res = await cho;
    const body = await res.json().catch(() => null);
    expect(String(body?.status?.code), `Tạo ca thất bại: ${JSON.stringify(body?.status)}`).toBe('200');

    await moManCa(page, VAI);
    const dsSau = (await dong(page).allInnerTexts()).map(chuan).join(' | ');
    expect(dsSau, `Ca "${TEN_CA}" tạo trả 200 nhưng 🚫 không có trong danh sách`).toContain(TEN_CA);
    ghi(`Đã tạo ca "${TEN_CA}" (${GIO_CA.join('–')}, chấm công ${GIO_CHAM_CONG.join('–')}).`);
  });
});
