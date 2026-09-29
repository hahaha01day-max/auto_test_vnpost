'use strict';

/**
 * HELPER DÙNG CHUNG cho các bước seed.
 *
 * 🔴 Gom vào một chỗ vì cùng một bẫy antd tái phát ở mọi màn: dropdown chồng lớp, node cây bị
 *    khoá, nút Lưu bọc trong Popconfirm. Vá ở từng spec là vá được một nơi rồi mắc lại ở nơi kế.
 */

const { expect } = require('@playwright/test');

/**
 * Chọn một mục trong ant Select/TreeSelect theo accessible name của combobox.
 *
 * 🔴 Bám dropdown theo `aria-controls` của chính ô, 🚫 KHÔNG dùng `.ant-select-dropdown:visible`
 *    + `.last()`: antd giữ lại dropdown của ô vừa đóng thêm một nhịp, `.last()` trúng đúng cái đó
 *    rồi click vào phần tử đang biến mất — lỗi hiện ra là "element is not stable", không liên quan
 *    gì tới ô mình đang thao tác.
 * 🔴 Node cây bị `disabled` (danh mục cấp 1 ở form sản phẩm) vẫn hiện, vẫn khớp text, click vẫn
 *    "thành công" mà không chọn được gì ⇒ phải loại nó ra và ném lỗi NÓI RÕ, 🚫 đừng để lỗi nổi
 *    lên dưới dạng "timeout chờ response".
 */
async function chon(page, hop, tenO, nhan) {
  const o = hop.getByRole('combobox', { name: tenO });
  await o.click();

  const id = await o.getAttribute('aria-controls');
  let ds = id
    ? page.locator('.ant-select-dropdown').filter({ has: page.locator(`#${id}`) }).first()
    : page.locator('.ant-select-dropdown:visible').last();
  if (!(await ds.count())) ds = page.locator('.ant-select-dropdown:visible').last();
  await expect(ds, `Không mở được danh sách của ô "${tenO}"`).toBeVisible({ timeout: 15_000 });

  const CHON_DUOC = [
    '.ant-select-item-option:not(.ant-select-item-option-disabled)',
    '.ant-select-tree-treenode:not(.ant-select-tree-treenode-disabled) .ant-select-tree-node-content-wrapper',
  ].join(', ');
  const muc = ds.locator(CHON_DUOC);

  if (nhan) {
    // Danh sách dài cuộn ảo ⇒ gõ để lọc, 🚫 không cuộn tìm.
    await o.fill(String(nhan));
    const khop = muc.filter({ hasText: new RegExp(String(nhan)) });
    if (!(await khop.count())) {
      const moiThu = await ds
        .locator('.ant-select-item-option, .ant-select-tree-node-content-wrapper')
        .allInnerTexts();
      const coNhungKhoa = moiThu.some((t) => t.includes(String(nhan)));
      const co = moiThu.slice(0, 8).join(' | ');
      throw new Error(
        coNhungKhoa
          ? `Ô "${tenO}": thấy "${nhan}" nhưng node đang bị KHOÁ (không chọn được). `
            + 'Danh mục cấp 1 không chọn được ở form sản phẩm — phải dùng danh mục CON. '
            + `Danh sách đang có: ${co}`
          : `Không thấy "${nhan}" trong ô "${tenO}". Danh sách đang có: ${co || '(rỗng)'}`,
      );
    }
    await khop.first().click();
  } else {
    await expect(muc.first(), `Ô "${tenO}" không có lựa chọn nào chọn được`).toBeVisible({
      timeout: 15_000,
    });
    await muc.first().click();
  }

  // Đóng hẳn dropdown trước khi sang ô kế — tránh chồng lớp làm click sau bị chặn.
  await expect(ds).toBeHidden({ timeout: 10_000 }).catch(() => {});

  // 🔴 Xác nhận ô ĐÃ nhận giá trị. Click vào node khoá không ném lỗi, ô ở lại rỗng và bước
  //    submit mới vỡ — kiểm ngay tại đây để lỗi chỉ đúng chỗ.
  const daChon = await hop
    .getByRole('combobox', { name: tenO })
    .evaluate((el) => {
      const boc = el.closest('.ant-select');
      return boc ? boc.innerText.trim() : '';
    })
    .catch(() => '');
  if (!daChon) throw new Error(`Ô "${tenO}" vẫn rỗng sau khi click — lựa chọn không được nhận.`);
}

/**
 * Bấm một nút bọc trong `Popconfirm` rồi bấm nút đồng ý của hộp xác nhận.
 *
 * 🔴 Bấm nút gốc KHÔNG gửi request — nó chỉ mở hộp xác nhận. Không bấm tiếp thì spec chờ
 *    response tới hết timeout rồi báo "không có request nào", nghe như backend im lặng.
 */
async function bamQuaPopconfirm(page, nut, nhanDongY = /^(Lưu|Đồng ý|Phê duyệt|OK)$/) {
  await nut.click();
  const hop = page.locator('.ant-popover:visible, .ant-popconfirm:visible').last();
  await expect(hop, 'Không mở được hộp xác nhận (Popconfirm)').toBeVisible({ timeout: 10_000 });
  await hop.getByRole('button', { name: nhanDongY }).first().click();
}

/**
 * Chọn ĐÚNG MỘT điểm bán trong bộ chọn phạm vi 3 cột (`RegionSelector`).
 *
 * 🔴 Ba cột KHÔNG cùng loại tương tác: tên đơn vị ở cột 1/2 là `<button>` để mở cột kế
 *    (`ScopeRow.onActivate`), còn chọn thì phải bấm đúng ô `checkbox` của hàng. Bấm vào tên ở
 *    cột Điểm bán 🚫 không tick gì cả.
 * 🔴 Mỗi cột có ô tìm kiếm riêng và danh sách rất dài ⇒ phải gõ để lọc, 🚫 không cuộn tìm.
 * 🔴 Cột 2/3 chỉ nạp dữ liệu SAU khi bấm tên ở cột trước (lazy-load) — bỏ bước bấm tên thì cột
 *    kế chỉ có dòng chữ "Chọn tỉnh/đơn vị trước".
 */
async function chonPhamViDiemBan(page, khung, { tenTinh, tenXa, tenShop }) {
  const cot = (i) => khung.locator('.sp-column').nth(i);
  const timTrongCot = async (i, chu) => {
    const o = cot(i).locator('.sp-column__search input').first();
    await expect(o, `Cột ${i + 1} của bộ chọn phạm vi không có ô tìm kiếm`).toBeVisible({
      timeout: 15_000,
    });
    await o.fill(chu);
  };
  const hang = (i, chu) => cot(i).locator('.sp-item').filter({ hasText: chu }).first();

  await timTrongCot(0, tenTinh);
  await expect(hang(0, tenTinh), `Không thấy tỉnh "${tenTinh}" ở cột Cấp Tỉnh`).toBeVisible({
    timeout: 20_000,
  });
  await hang(0, tenTinh).locator('.sp-item__label').click();

  await timTrongCot(1, tenXa);
  await expect(hang(1, tenXa), `Không thấy xã "${tenXa}" ở cột Cấp Xã / Phường`).toBeVisible({
    timeout: 20_000,
  });
  await hang(1, tenXa).locator('.sp-item__label').click();

  await timTrongCot(2, tenShop);
  const hangShop = hang(2, tenShop);
  await expect(hangShop, `Không thấy điểm bán "${tenShop}" ở cột Điểm bán`).toBeVisible({
    timeout: 20_000,
  });
  const o = hangShop.locator('input[type="checkbox"]').first();
  await o.check();
  await expect(o, `Tick điểm bán "${tenShop}" không ăn`).toBeChecked();
}

/**
 * Đăng nhập bằng NHÂN VIÊN SEED (bước 3) để vào đúng ĐIỂM BÁN SEED.
 *
 * 🔴 Vì sao không dùng vai `shop` trong `.env`: tài khoản đó (`chtls01`) thuộc **Điểm bán Lý Sơn**,
 *    không phải điểm bán seed. Nhập kho bằng vai đó là ghi tồn vào một điểm bán THẬT đang có dữ
 *    liệu — đúng thứ đã từng làm bẩn môi trường.
 * 🔴 Vì sao không khai vào `.env`: tên đăng nhập đổi theo TỪNG LƯỢT seed (`autonv<runId>`), khai
 *    cứng là lượt sau sai ngay. Lấy thẳng từ sổ `seed-state.json`.
 * 🔴 Mật khẩu mặc định của nhân viên mới là `123456` (user xác nhận 22/09/2026); đổi được bằng
 *    `VNPOST_SEED_PASSWORD`.
 * 🔴 Tài khoản này chỉ có MỘT phạm vi ⇒ vào thẳng, 🚫 không có màn chọn phạm vi.
 */
async function dangNhapNhanVienSeed(page, tenVaiTro) {
  const { doc, lay } = require('./seed-state');
  // 🔴 Làn có tài khoản MỘT VAI (bước 3.3–3.6) ⇒ ưu tiên nó: tài khoản 2 vai của bước 3.2 bị API trả
  //    `SSHOP-401` dù vai đang chọn đủ quyền (đo 23/09/2026 ở `opening-balance/uploads`).
  const VAI_LAN = { 'Cửa hàng trưởng': 'shop', 'Giao dịch viên': 'gdv' };
  const motVai = (doc().duLieu.taiKhoanLan || {})[VAI_LAN[tenVaiTro]];
  if (motVai) {
    // Tài khoản một vai đã khai trong `.env.lane<n>` (vai `seed_shop` / `seed_gdv`) ⇒ đi đúng đường
    // đăng nhập chuẩn của `login.js`. Đo 23/09: luồng tự viết bên dưới vào tài khoản một phạm vi thì
    // dừng ở "Tài khoản chưa được cấp quyền truy cập", còn `dangNhapVai` vào được màn làm việc.
    const { dangNhapVai } = require('../shared/auth/login');
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await dangNhapVai(page, VAI_LAN[tenVaiTro] === 'shop' ? 'seed_shop' : 'seed_gdv');
    return;
  }
  const tenDangNhap = lay('nhanSu', 'tenDangNhap');
  const matKhau = process.env.VNPOST_SEED_PASSWORD || '123456';

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const oTen = page.getByRole('textbox', { name: /tên đăng nhập|username/i });
  const oMat = page.getByRole('textbox', { name: /mật khẩu|password/i });
  await expect(oTen, 'Không mở được form đăng nhập').toBeVisible({ timeout: 25_000 });
  // 🔴 Form đăng nhập có lúc xoá trắng giá trị vừa nhập ⇒ `fill` một lần là bấm "Tiếp tục" với ô mật
  //    khẩu rỗng, lỗi đọc như "sai mật khẩu". Dùng chung cách điền có kiểm lại của `login.js`.
  const { dienChacChan } = require('../shared/auth/login');
  await dienChacChan(oTen, tenDangNhap, 'Tên đăng nhập');
  await dienChacChan(oMat, matKhau, 'Mật khẩu');
  // 🔴 Trang đăng nhập có thêm nút "Đăng nhập bằng VNPOST SSO" ⇒ chỉ lấy nút submit.
  await page.getByRole('button', { name: /tiếp tục|đăng nhập|login|sign in/i }).and(page.locator('button[type="submit"]')).click();

  // 🔴 Sau khi đăng nhập có HAI khả năng, 🚫 đừng giả định một: hoặc dừng ở màn chọn điểm bán
  //    (`/account?act=select-shop`), hoặc hệ thống nhớ điểm bán lần trước và vào thẳng. Ép chờ
  //    màn chọn thì lần vào thẳng sẽ đỏ với thông báo "chưa gán nhân viên về điểm bán" — sai hẳn
  //    nguyên nhân.
  // 🚫 Đừng kiểm "đã rời trang đăng nhập" bằng URL khác `/`: trang đăng nhập CHÍNH LÀ `/account`,
  //    điều kiện đó đúng cả khi đăng nhập hỏng.
  const tenShop = lay('diemBan', 'tenShop');
  // 🔴 Nhân viên seed mang NHIỀU vai ⇒ màn chọn có nhiều dòng cùng tên điểm bán. Phải bám theo
  //    vai, 🚫 đừng lấy dòng đầu: vào nhầm vai là thiếu đúng quyền đang cần, và lỗi hiện ra ở
  //    tận bước sau dưới dạng `SSHOP-401`.
  const dong = tenVaiTro
    ? page
        .locator('div[class*="cursor-pointer"]')
        .filter({ hasText: tenShop })
        .filter({ hasText: tenVaiTro })
        .first()
    : page.getByText(tenShop, { exact: true }).first();
  const boCuc = page.locator('.ant-pro-layout, .ant-layout-sider').first();

  await Promise.race([
    dong.waitFor({ state: 'visible', timeout: 30_000 }),
    boCuc.waitFor({ state: 'visible', timeout: 30_000 }),
  ]).catch(() => {
    throw new Error(
      `Đăng nhập "${tenDangNhap}" không qua được: không thấy màn chọn điểm bán lẫn màn làm việc. `
        + 'Hai khả năng: mật khẩu khác `123456` (đặt `VNPOST_SEED_PASSWORD`), hoặc tài khoản bị khoá.',
    );
  });

  if (await dong.isVisible().catch(() => false)) {
    // 🔴 Lớp loading `.ant-spin-section` phủ lên danh sách và NUỐT click: Playwright báo
    //    "element is visible, enabled and stable" rồi vẫn retry tới hết timeout, log chỉ hiện
    //    "subtree intercepts pointer events".
    // 🔴 Lớp phủ `.ant-spin-section` vẫn nằm đè cả sau khi nạp xong ⇒ click chuột luôn bị nó nuốt,
    //    kể cả `{ force: true }` (force chỉ bỏ kiểm tra actionability, sự kiện chuột vẫn rơi vào
    //    lớp trên cùng). Gọi `el.click()` trong DOM cũng vô ích: `onClick` gắn ở thẻ CHA của dòng,
    //    bấm đúng thẻ chữ thì React không nhận.
    //    Đường đi được: tắt `pointer-events` của lớp phủ rồi click như thường.
    //    Cái chặn thật là lớp phủ `::after` mà antd chèn vào `.ant-spin-container` khi còn
    //    `.ant-spin-blur` (đang nạp). Chờ nó rời đi rồi mới click; hết thời gian thì gỡ lớp phủ.
    await page
      .waitForFunction(() => !document.querySelector('.ant-spin-blur'), null, { timeout: 30_000 })
      .catch(async () => {
        await page.addStyleTag({
          content: '.ant-spin-container::after { display: none !important; }'
            + '.ant-spin-blur { opacity: 1 !important; pointer-events: auto !important; }',
        });
      });
    // 🔴 Danh sách chỉ có MỘT đơn vị thì `ShopPage` TỰ chọn (useEffect) — dòng biến mất giữa
    //    chừng và click ném timeout dù mọi thứ đang đúng. Click là đường dự phòng, 🚫 đừng để
    //    nó quyết định thành/bại; chỗ chốt là màn làm việc dựng lên được hay không.
    await dong.click({ timeout: 8_000 }).catch(() => {});
  }

  // 🔴 Vai trò RỖNG QUYỀN thì đây là chỗ lộ ra: app quay vòng giữa `/account?act=select-shop`
  //    và `/`, `Spin` phủ mãi, 🚫 không thông báo gì. Xem ghi chú đầu `03-nhan-su.tct.spec.js`.
  await expect(
    boCuc,
    'Không dựng được màn làm việc. Nguyên nhân hay gặp nhất: vai trò của nhân viên seed KHÔNG '
      + 'có chức năng nào (`scopes: {}`) ⇒ app quay vòng về màn chọn điểm bán. Bước 3 phải gắn '
      + 'vai trò CÓ SẴN (Cửa hàng trưởng), 🚫 không tạo vai trò mới.',
  ).toBeVisible({ timeout: 45_000 });
}

module.exports = { chon, bamQuaPopconfirm, chonPhamViDiemBan, dangNhapNhanVienSeed };
