import { test, expect } from '@playwright/test';

test.describe('Quản lý nhân viên', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://vnpost.sfin.vn/account');
    
    try {
      await page.getByRole('textbox', { name: 'Tên đăng nhập' }).waitFor({ state: 'visible', timeout: 10000 });
    } catch (error) {
      console.log('Đăng nhập bị timeout, đang tiến hành F5 lại trang...');
      await page.reload();
      await page.getByRole('textbox', { name: 'Tên đăng nhập' }).waitFor({ state: 'visible' });
    }

    await page.getByRole('textbox', { name: 'Tên đăng nhập' }).fill('0862036990');
    await page.getByRole('textbox', { name: 'Mật khẩu' }).fill('123456');
    await page.getByRole('button', { name: 'Tiếp tục' }).click();

    await page.getByText('Admin').click();
    await page.getByText('Nhân viên').click();
    await page.getByRole('link', { name: 'Quản lý nhân viên' }).click();

    const btnThemMoi = page.getByRole('button', { name: 'plus Thêm mới' });
    await btnThemMoi.waitFor({ state: 'visible' });
    await btnThemMoi.click();
  });
  // CASE ĐÚNG
  test('Thêm mới nhân viên thành công', async ({ page }) => {
    const random8Digits = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const maNhanVien = `VNP${random8Digits}`;
    const dauSoVN = ['03', '05', '07', '08', '09'];
    const randomDauSo = dauSoVN[Math.floor(Math.random() * dauSoVN.length)];
    const random8SoCuoi = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    const soDienThoai = `${randomDauSo}${random8SoCuoi}`;

    console.log(`Đang tạo nhân viên: Mã = ${maNhanVien}, SĐT = ${soDienThoai}`);

    await page.getByRole('textbox', { name: '* Mã nhân viên' }).fill(maNhanVien);
    await page.getByRole('textbox', { name: '* Số điện thoại' }).fill(soDienThoai);
    
    await page.getByRole('combobox', { name: 'Giới tính' }).click();
    await page.getByText('Nam', { exact: true }).click();
    
    await page.getByRole('textbox', { name: '* Tên nhân viên' }).fill(`Hoàng Quân ${random8Digits}`);
    await page.getByRole('textbox', { name: 'Căn cước công dân' }).fill('325461231234');
    
    await page.getByRole('textbox', { name: 'Ngày bắt đầu làm việc' }).click();
    await page.getByText('Hôm nay').click();
    
    await page.getByRole('textbox', { name: 'Địa chỉ' }).fill('123456');
    await page.locator('[id="_r_22_"]').click(); 
    await page.getByText('Tổng công ty Bưu Điện Việt Nam').click();

    await page.locator('#workStatus').click();
    await page.locator('.ant-select-dropdown:visible').getByText('Đang làm', { exact: true }).click({ force: true });

    await page.getByRole('button', { name: '+ Thêm vai trò và đơn vị quản' }).click();
    
    await page.getByText('Chọn đơn vị').click({ force: true });
    await page.waitForTimeout(500);
    await page.locator('.ant-select-dropdown:visible')
              .getByText('Tổng công ty Bưu Điện Việt Nam', { exact: true })
              .click({ force: true }); 
    
    await page.getByText('Chọn vai trò').click({ force: true }); 
    await page.waitForTimeout(500);
    await page.locator('.ant-select-dropdown:visible')
              .getByText('Kế toán', { exact: true })
              .click({ force: true });
    
    await page.getByRole('button', { name: 'Lưu' }).click();

    const thongBaoThanhCong = page.getByText(/thành công/i);
    await expect(thongBaoThanhCong).toBeVisible({ timeout: 5000 });
  });

  test('1. Bỏ trống các trường bắt buộc', async ({ page }) => {
    await page.getByRole('button', { name: '+ Thêm vai trò và đơn vị quản' }).click();
    await page.getByRole('button', { name: 'Lưu' }).click();

    await expect(page.getByText('Vui lòng nhập mã nhân viên')).toBeVisible();
    await expect(page.getByText('Số điện thoại / email không được để trống!')).toBeVisible();
    await expect(page.getByText('Vui lòng nhập tên nhân viên')).toBeVisible();
 
    await expect(page.locator('.ant-form-item-explain-error').getByText('Chọn đơn vị', { exact: true })).toBeVisible();
    
    await expect(page.getByText('Vui lòng chọn vai trò nhân viên')).toBeVisible();
  });

  test('2. Thêm trùng mã nhân viên', async ({ page }) => {
    const maNhanVienTrung = 'VNP12345678'; 
    const soDienThoai = `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;

    await page.getByRole('textbox', { name: '* Mã nhân viên' }).fill(maNhanVienTrung);
    await page.getByRole('textbox', { name: '* Số điện thoại' }).fill(soDienThoai);
    await page.getByRole('textbox', { name: '* Tên nhân viên' }).fill('Nguyễn Văn Trùng');

    await page.getByRole('button', { name: '+ Thêm vai trò và đơn vị quản' }).click();
    
    await page.getByText('Chọn đơn vị').click({ force: true });
    await page.waitForTimeout(500);
    await page.locator('.ant-select-dropdown:visible')
              .getByText('Tổng công ty Bưu Điện Việt Nam', { exact: true })
              .click({ force: true }); 
    
    await page.getByText('Chọn vai trò').click({ force: true }); 
    await page.waitForTimeout(500);
    await page.locator('.ant-select-dropdown:visible')
              .getByText('Kế toán', { exact: true })
              .click({ force: true });
    
    await page.getByRole('button', { name: 'Lưu' }).click();
    const thongBaoLoi = page.getByText(/đã tồn tại/i);
    await expect(thongBaoLoi).toBeVisible({ timeout: 5000 });
  });

  test('3. Nhập sai định dạng số điện thoại', async ({ page }) => {
    const maNhanVien = `VNP${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    const sdtSaiDinhDang = '012345'; // Số điện thoại quá ngắn

    await page.getByRole('textbox', { name: '* Mã nhân viên' }).fill(maNhanVien);
    await page.getByRole('textbox', { name: '* Tên nhân viên' }).fill('Nguyễn Văn Sai Số');

    await page.getByRole('textbox', { name: '* Số điện thoại' }).fill(sdtSaiDinhDang);

    await page.getByRole('button', { name: '+ Thêm vai trò và đơn vị quản' }).click();
    await page.getByRole('button', { name: 'Lưu' }).click();

    const thongBaoLoiFormat = page.getByText(/không hợp lệ/i);
    await expect(thongBaoLoiFormat).toBeVisible({ timeout: 5000 });
  });

});