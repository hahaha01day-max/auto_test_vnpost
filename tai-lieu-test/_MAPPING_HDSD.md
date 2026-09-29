# Bản đồ: module test → mã phân hệ HDSD

> ✅ **ĐÃ THỰC HIỆN 17/09/2026.** Bảng mã chạy thật nằm ở `tool/bin/hdsd-mapping.js`;
> file này giữ lại làm ghi chép quá trình. Quyết định của user: tách đúng theo HDSD,
> mã case KHÔNG kèm slug, 3 module chưa có HDSD thì bổ sung sau.
> Nguồn mã: `resource/hdsd/hdsd<mã>_<slug>/` — 45 phân hệ, 285 task.

## Quy ước đặt tên (đề xuất)

- **Thư mục module test** = mã + slug HDSD, **bỏ tiền tố `hdsd`**: `01_quan_ly_diem_ban`, `04_3_nhap_xuat_chuyen_kho`.
- **Mã test case** = `<mã module>_<mã task>_<STT>_<tiêu đề ngắn>`, không dấu, chữ thường:
  `01_010_001_tra_cuu_danh_sach_mac_dinh`
- Title spec: `test('01_010_001_tra_cuu_danh_sach_mac_dinh - Tra cứu danh sách mặc định', ...)`

## A. Map thẳng — không vướng gì (5 module)

| Module test hiện tại | → Phân hệ HDSD | Số case |
|---|---|--:|
| `01-mo-hinh-to-chuc` | **32** Mô hình tổ chức (8 task) | 3 |
| `02-phan-quyen-vai-tro` | **31** Quản lý phân quyền, chức năng, vai trò (10 task) | 12 |
| `04-quan-ly-san-pham-danh-muc-san-pham` | **08** Quản lý sản phẩm (9 task) | 17 |
| `08-khach-hang-than-thiet-loyalty` | **20** Khách hàng thân thiết (4 task) | 12 |
| `quan-ly-nhan-vien` | **02** Quản lý nhân viên (9 task) | 4 |

## B. 🔴 Một module test trải trên NHIỀU phân hệ HDSD (4 module)

Theo đúng yêu cầu "mã module lấy theo HDSD" thì các thư mục này phải **tách ra**.

### `11-kho` (19 case) → 7 phân hệ
| Case | → HDSD |
|---|---|
| KHO-001, 002, 008 phiếu đề xuất | **13_1** Phiếu đề xuất đặt hàng và phê duyệt |
| KHO-011 gộp phiếu | **13_2** Gộp tách phiếu và điều phối nguồn hàng |
| KHO-016, 017, 023 đặt hàng NCC | **13_3** Đặt hàng NCC và nhập hàng |
| KHO-028, 029, 038, 041, 065, 066 nhập/xuất/chuyển kho | **04_3** Nhập kho, xuất kho và chuyển kho |
| KHO-048, 049 kiểm kho | **04_4** Kiểm kho |
| KHO-054, 055 cảnh báo tồn | **04_1** Cảnh báo tồn kho và đề xuất nhập hàng |
| KHO-062, 063 tổng quan kho, thẻ kho | **04_5** Quản lý tồn kho và hàng xả kho |

### `10-nha-cung-cap` (25 case) → 4 phân hệ
`12_1` hồ sơ NCC · `12_2` sản phẩm & bảng giá NCC · `12_3` công nợ NCC · `14_1` phiếu xuất trả NCC

### `09-chuong-trinh-khuyen-mai` (77 case) → 2 phân hệ
- 32 case CSV (màn quản lý CTKM) → **11** Khuyến mại
- 45 case spec (áp dụng KM tại POS) → **18_2** Khách hàng và ưu đãi trên đơn *(hoặc vẫn 11 — cần chốt)*

### `05-ban-hang-pos` (15 case) → 2–3 phân hệ
`18_1` bán hàng tại quầy · `18_3` thu tiền đơn hàng · `18_4` quản lý đơn hàng

## C. 🔴 KHÔNG có phân hệ HDSD tương ứng (3 module)

Đã tìm trong toàn bộ `resource/hdsd` — **không có** phân hệ nào cho ba mảng này.
Đây là tính năng mới, HDSD chưa viết.

| Module test | Số case | Ghi chú |
|---|--:|---|
| `12-don-vi-van-tai` | 72 | Không có từ khoá "vận tải" trong bất kỳ `meta.md` nào |
| `13-cong-no-diem-ban-tinh` | 31 | "nợ đầu kỳ" chỉ xuất hiện ở `29/110_xem_bao_cao_doi_soat` |
| `35-gia-von-mac-dinh` | 23 | "giá vốn" nằm rải ở `04_2`, `04_3`; không có phân hệ riêng |

**Cần anh chốt:** cấp mã tạm (vd `90`, `91`, `92`) chờ HDSD viết sau? hay gộp vào phân hệ gần nhất?
hay để ngoài cây mới?

## D. Việc phát sinh kèm theo

1. **Mã module nằm trong URL và trong DB.** `runs.module_id` lưu tên thư mục; đổi tên là toàn bộ
   lịch sử chạy mồ côi. Phải chạy `UPDATE runs SET module_id = ...` theo đúng bản đồ này.
2. **Regex nhận mã case phải viết lại.** Mã mới bắt đầu bằng **chữ số** (`01_010_001_...`), trong khi
   regex hiện tại đòi bắt đầu bằng chữ cái. Sửa ở **cả** `tool/core/cases.js` và `tool/core/report.js`.
3. **`test-cases.csv` phải đánh lại mã** cho khớp, nếu không toàn bộ case thành "chưa có script".
4. **Mỗi case phải gắn đúng 1 task.** 285 task sẵn có; việc này phải đọc nội dung task để gắn,
   không suy từ tên case được — đây là phần tốn thời gian nhất.
