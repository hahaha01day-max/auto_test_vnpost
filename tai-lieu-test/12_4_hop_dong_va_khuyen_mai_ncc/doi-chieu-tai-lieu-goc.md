# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 12_4 — Hợp đồng và khuyến mãi nhà cung cấp

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 12_4_hop_dong_va_khuyen_mai_ncc`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `12_4_hop_dong_va_khuyen_mai_ncc`
- Tài liệu gốc liên quan: [`uat_vnpost_nha_cung_cap.csv`](../test-case-goc/uat_vnpost_nha_cung_cap.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **65** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **65** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 60 |
| — **tài liệu gốc KHÔNG có** | 6 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 6 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `12_4_010_004` | Lọc Sắp hết hạn chỉ trả hợp đồng còn dưới 30 ngày | HDSD 010 |
| `12_4_040_002` | Hợp đồng ký gửi có nhãn riêng | HDSD 040 |
| `12_4_040_003` | Thẻ Danh sách PO xếp đơn mới nhất trước | HDSD 040 |
| `12_4_050_002` | Lọc chương trình theo nhà cung cấp | HDSD 050 |
| `12_4_060_001` | Chặn lập CTKM khi mặt hàng chưa gán cho nhà cung cấp | HDSD 060 |
| `12_4_070_001` | Nút thao tác CTKM đổi theo trạng thái | HDSD 070 |

## 5. Bảng đối chiếu đầy đủ 65 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `NCC_189` | Kiểm tra hiển thị giao diện màn hình Hợp đồng nhà cung cấp | `12_4_010_001` |
| `NCC_190` | Kiểm tra thêm mới nhà cung cấp nhập đầy đủ thông tin bắt buộc | `12_4_020_001` |
| `NCC_191` | Kiểm tra thêm mới nhà cung cấp bỏ trống trường thông tin bắt buộc | `12_4_020_002` |
| `NCC_192` | Kiểm tra xem chi tiết thông tin hợp đồng | `12_4_040_001` |
| `NCC_193` | Kiểm tra sửa thông tin hợp đồng | `12_4_080_011` |
| `NCC_194` | Kiểm tra phê duyệt hợp đồng | `12_4_030_002` |
| `NCC_195` | Kiểm tra ngừng hợp đồng | `12_4_030_003` |
| `NCC_196` | Kiểm tra kích hoạt hợp đồng | `12_4_080_012` |
| `NCC_197` | Kiểm tra loại hợp đồng | `12_4_080_013` |
| `NCC_198` | Kiểm tra chiết khấu % | `12_4_080_014` |
| `NCC_199` | Kiểm tra theo hạn mức công nợ | `12_4_080_015` |
| `NCC_200` | Kiểm tra hạn thanh toán | `12_4_080_016` |
| `NCC_201` | Kiểm tra thời hạn được trả hàng | `12_4_080_017` |
| `NCC_202` | Tìm kiếm theo số hợp đồng | `12_4_010_002` |
| `NCC_203` | Tìm kiếm theo tên NCC | `12_4_010_002` |
| `NCC_204` | Tìm kiếm theo mã NCC | `12_4_010_002` |
| `NCC_205` | Tìm kiếm không tồn tại | `12_4_080_018` |
| `NCC_206` | Lọc trạng thái Hiệu lực | `12_4_010_003` |
| `NCC_207` | Lọc trạng thái Ngừng | `12_4_010_003` |
| `NCC_208` | Xóa bộ lọc | `12_4_080_019` |
| `NCC_209` | Refresh danh sách | `12_4_080_020` |
| `NCC_210` | Phân trang | `12_4_080_021` |
| `NCC_211` | Mở popup thêm hợp đồng | `12_4_080_022` |
| `NCC_212` | Bỏ trống số hợp đồng | `12_4_020_002` |
| `NCC_213` | Bỏ trống nhà cung cấp | `12_4_020_002` |
| `NCC_214` | Bỏ trống loại hợp đồng | `12_4_020_002` |
| `NCC_215` | Bỏ trống thời hạn hiệu lực | `12_4_020_002` |
| `NCC_216` | Ngày kết thúc nhỏ hơn ngày bắt đầu | `12_4_080_023` |
| `NCC_217` | Thêm hợp đồng thành công | `12_4_020_001` |
| `NCC_218` | Trùng số hợp đồng | `12_4_080_024` |
| `NCC_219` | Upload tài liệu hợp đồng | `12_4_080_025` |
| `NCC_220` | Upload file sai định dạng | `12_4_080_026` |
| `NCC_221` | Upload file vượt dung lượng | `12_4_080_027` |
| `NCC_222` | Hủy thêm mới | `12_4_080_028` |
| `NCC_223` | Xem chi tiết hợp đồng | `12_4_040_001` |
| `NCC_224` | Xem tài liệu hợp đồng | `12_4_080_029` |
| `NCC_225` | Hiển thị đúng trạng thái hợp đồng | `12_4_080_030` |
| `NCC_226` | Kích hoạt hợp đồng đang Ngừng | `12_4_080_031` |
| `NCC_227` | Hủy thao tác kích hoạt | `12_4_080_032` |
| `NCC_228` | Ngừng hợp đồng đang Hiệu lực | `12_4_030_003` |
| `NCC_229` | Hủy thao tác ngừng | `12_4_080_033` |
| `NCC_230` | Không hiển thị nút Kích hoạt khi hợp đồng đang Hiệu lực | `12_4_030_001` |
| `NCC_231` | Không hiển thị nút Ngừng khi hợp đồng đã Ngừng | `12_4_030_001` |
| `NCC_232` | Người không có quyền thao tác | `12_4_PQ_001` |
| `NCC_233` | Kiểm tra tổng giá trị hợp đồng | `12_4_080_034` |
| `NCC_234` | Đóng popup chi tiết | `12_4_080_035` |
| `NCC_235` | Kiểm tra dữ liệu sau khi reload | `12_4_080_036` |
| `NCC_236` | Kiểm tra hiệu lực theo ngày hiện tại | `12_4_080_037` |
| `NCC_237` | Kiểm tra khoảng trắng đầu/cuối khi nhập số HĐ | `12_4_080_038` |
| `NCC_238` | Nhập giá trị âm cho hạn mức công nợ | `12_4_080_039` |
| `NCC_239` | Nhập chiết khấu >100% | `12_4_080_040` |
| `NCC_240` | Kiểm tra hiển thị giao diện màn hình Khuyến mãi đặt hàng NCC | `12_4_050_001` |
| `NCC_241` | Kiểm tra thêm mới chương trình khuyến mãi nhập đầy đủ thông tin bắt buộc | `12_4_060_002` |
| `NCC_242` | Kiểm tra thêm mới CTKM bỏ trống trường thông tin bắt buộc | `12_4_090_011` |
| `NCC_243` | Kiểm tra xem chi tiết thông tin CTKM | `12_4_090_012` |
| `NCC_244` | Kiểm tra sửa thông tin CTKM | `12_4_090_013` |
| `NCC_245` | Kiểm tra ngừng CTKM | `12_4_070_003` |
| `NCC_246` | Kiểm tra kích hoạt CTKM | `12_4_070_002` |
| `NCC_247` | Kiểm tra Huỷ CTKM | `12_4_090_014` |
| `NCC_248` | Kiểm tra chiết khấu % toàn đơn | `12_4_090_015` |
| `NCC_249` | Kiểm tra chiết khấu giảm tiền toàn đơn | `12_4_090_016` |
| `NCC_250` | Kiểm tra hình thức Mua X tặng Y | `12_4_090_017` |
| `NCC_251` | Kiểm tra giảm giá tiền theo sản phẩm | `12_4_090_018` |
| `NCC_252` | Kiểm tra áp dụng CTKM với giá trị đơn tối thiểu | `12_4_090_019` |
| `NCC_253` | Kiểm tra áp dụng CTKM với số lượng đơn tối thiểu | `12_4_090_020` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 65/65 case gốc (trước đó 25), 20 → 60 case._

### 6.1 Bốn điều khoản hợp đồng chi phối TIỀN của mọi PO

`NCC_198` chiết khấu % · `NCC_199` hạn mức công nợ · `NCC_200` hạn thanh toán · `NCC_201` thời hạn
được trả hàng. Sheet tách thành bốn case riêng — đúng, vì mỗi điều khoản ảnh hưởng một nghiệp vụ khác
nhau (giá nhập PO · chặn đặt hàng · tính nợ quá hạn · chặn trả hàng NCC).

🔴 Khi làm `13_3` (đặt hàng) và `14_1` (xuất trả NCC), phải nhớ hai case này là **nguồn ràng buộc** ở
đó: đặt hàng vượt hạn mức công nợ và trả hàng quá thời hạn đều bị chặn theo hợp đồng.

### 6.2 CTKM cấp NCC áp ở mức RULE

Bẫy đã ghi nhận trong repo (`supplier_promotion_ctkm`): khuyến mãi đặt hàng NCC **không áp ở mức sản
phẩm** mà ở **mức rule**. Đã ghi vào kỳ vọng nhóm `090`. Đối chiếu theo từng dòng sản phẩm sẽ ra số
khác và tưởng là lỗi.

### 6.3 Nhóm case UI cuối sheet là case rẻ nhưng đáng giữ

`NCC_205` tìm kiếm không tồn tại · `NCC_208` xoá bộ lọc · `NCC_209` refresh danh sách. Ba case này
thuộc kỹ thuật 7 và 8 của mục 3.4, chạy nhanh và không ghi dữ liệu — nên là nhóm **làm script trước
tiên** của phân hệ này.
