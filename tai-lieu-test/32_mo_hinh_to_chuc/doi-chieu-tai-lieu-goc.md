# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 32 — Mô hình tổ chức

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 32_mo_hinh_to_chuc`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `32_mo_hinh_to_chuc`
- Tài liệu gốc liên quan: [`uat_vnpost_mo_hinh_to_chuc.csv`](../test-case-goc/uat_vnpost_mo_hinh_to_chuc.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **67** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **67** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 68 |
| — **tài liệu gốc KHÔNG có** | 5 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 5 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `32_010_001` | mở màn và tải cây tổ chức | HDSD 010 |
| `32_010_002` | đăng nhập và vào module Mô hình tổ chức | HDSD 010 |
| `32_010_005` | Kiểm tra chức năng Xuất Excel theo tài liệu | HDSD 010 |
| `32_020_003` | Thêm đơn vị - validate form rỗng | HDSD 020 |
| `32_050_001` | Tạo điểm bán/hub - mở form và validate rỗng | HDSD 050 |

## 5. Bảng đối chiếu đầy đủ 67 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_THUMUC__1` | Thêm mới đơn vị Tổng công ty với mã hợp lệ '00' | `32_100_001` |
| `FUNC_THUMUC__2` | Thêm mới đơn vị Bưu điện Tỉnh với mã hợp lệ trong khoảng 11-97 | `32_100_002` |
| `FUNC_THUMUC__3` | Thêm mới đơn vị Bưu điện Xã với mã 4 số hợp lệ | `32_100_003` |
| `FUNC_THUMUC__4` | Thêm mới đơn vị Điểm bán với mã 6 số hợp lệ | `32_020_002` |
| `FUNC_THUMUC__5` | Bỏ trống Mã đơn vị (bắt buộc) khi thêm mới | `32_020_001` |
| `FUNC_THUMUC__6` | Bỏ trống Tên đơn vị (bắt buộc) khi thêm mới | `32_020_001` |
| `FUNC_THUMUC__7` | Nhập mã cấp Tỉnh ngoài khoảng quy định (11-97) | `32_100_004` |
| `FUNC_THUMUC__8` | Nhập mã đơn vị bị trùng với mã đã tồn tại | `32_100_005` |
| `FUNC_THUMUC__9` | Bỏ trống Đơn vị cha (bắt buộc) khi tạo đơn vị con | `32_100_006` |
| `FUNC_THUMUC__10` | Hủy thao tác thêm đơn vị giữa chừng | `32_100_007` |
| `FUNC_THUMUC__11` | Thêm đơn vị con qua icon hover trên cây phân cấp - tự động fill Đơn vị cha | `32_110_001` |
| `FUNC_THUMUC__12` | Tạo nhanh đơn vị cấp Xã với 2 trường thông tin (Mã + Tên) | `32_110_002` |
| `dong29` | Bỏ trống Mã đơn vị khi thêm nhanh từ cây phân cấp (Cách 2) | `32_110_003` |
| `FUNC_THUMUC__14` | Bỏ trống Tên đơn vị khi thêm nhanh từ cây phân cấp (Cách 2) | `32_110_004` |
| `FUNC_THUMUC__15` | Nhập mã cấp Xã trùng với mã đã tồn tại trong cùng đơn vị cha | `32_110_005` |
| `FUNC_THUMUC__16` | Icon thêm mới không hiển thị khi không hover vào đơn vị | `32_110_006` |
| `FUNC_THUMUC__17` | Xem cây phân cấp hiển thị đầy đủ 4 cấp sau khi thêm mới thành công | `32_010_003` |
| `FUNC_THUMUC__18` | Mở rộng (expand) và thu gọn (collapse) một nhánh cây phân cấp | `32_010_003` |
| `dong36` | Cây phân cấp hiển thị trạng thái rỗng khi chưa có đơn vị nào | `32_120_001` |
| `FUNC_THUMUC__20` | Tìm kiếm đơn vị trên cây phân cấp theo tên | `32_120_002` |
| `FUNC_THUMUC__21` | Tìm kiếm đơn vị với từ khóa không tồn tại | `32_010_004` |
| `FUNC_THUMUC__22` | Xem chi tiết đơn vị hiển thị đầy đủ thông tin đã tạo | `32_020_004` |
| `FUNC_THUMUC__23` | Chỉnh sửa Tên đơn vị thành công | `32_020_004` |
| `dong42` | Chỉnh sửa Đơn vị cha - chuyển đơn vị sang nhánh khác | `32_130_001` |
| `FUNC_THUMUC__25` | Chỉnh sửa - bỏ trống Mã đơn vị (bắt buộc) | `32_130_002` |
| `FUNC_THUMUC__26` | Chỉnh sửa - đổi Mã đơn vị thành mã đã tồn tại của đơn vị khác | `32_130_003` |
| `FUNC_THUMUC__27` | Hủy chỉnh sửa - dữ liệu không bị thay đổi | `32_130_004` |
| `FUNC_THUMUC__28` | Xóa Điểm bán (cấp 4) - chỉ xóa đúng điểm bán được chỉ định | `32_020_004` |
| `FUNC_THUMUC__29` | Xóa cấp Xã - toàn bộ Điểm bán thuộc cấp Xã đó bị xóa theo | `32_140_001` |
| `FUNC_THUMUC__30` | Xóa cấp Tỉnh - toàn bộ Xã/Điểm bán thuộc Tỉnh đó bị xóa theo | `32_140_002` |
| `FUNC_THUMUC__31` | Xóa cấp Tổng công ty - toàn bộ cây phân cấp bị xóa theo | `32_140_003` |
| `FUNC_THUMUC__32` | Hủy xóa đơn vị tại popup confirm | `32_140_004` |
| `FUNC_THUMUC__33` | Nội dung popup confirm xóa hiển thị đúng văn bản theo SRS | `32_140_005` |
| `FUNC_THUMUC__34` | Tải về file mẫu nhập đơn vị tổ chức thành công | `32_040_001` |
| `FUNC_THUMUC__35` | Upload file Excel hợp lệ - tạo hàng loạt đơn vị thành công | `32_150_001` |
| `dong55` | Upload file sai định dạng (không phải .xlsx/.xls) | `32_150_002` |
| `FUNC_THUMUC__37` | Upload file Excel có dòng dữ liệu mã đơn vị bị trùng | `32_150_003` |
| `FUNC_THUMUC__38` | Upload file Excel với Đơn vị cha không tồn tại trong hệ thống/file | `32_150_004` |
| `FUNC_THUMUC__39` | Upload file Excel rỗng (chỉ có header, không có dữ liệu) | `32_150_005` |
| `FUNC_THUMUC__40` | Xuất file Excel danh sách toàn bộ đơn vị tổ chức | `32_150_006` |
| `FUNC_THUMUC__41` | Xuất Excel khi hệ thống chưa có đơn vị nào | `32_150_007` |
| `FUNC_THUMUC__42` | Tạo Điểm bán phân loại 'Pos mini' với đầy đủ trường bắt buộc | `32_160_001` |
| `FUNC_THUMUC__43` | Tạo Điểm bán phân loại 'Pos plus' thuộc Tổng công ty | `32_160_002` |
| `dong64` | Tạo điểm bán phân loại 'Hub' và đánh dấu 'Là cửa hàng mẫu' | `32_160_003` |
| `FUNC_THUMUC__45` | Bỏ trống Tên điểm bán (bắt buộc) khi tạo điểm bán | `32_160_004` |
| `FUNC_THUMUC__46` | Bỏ trống Bưu điện tỉnh/thành phố hoặc Bưu điện xã/phường (bắt buộc) | `32_160_005` |
| `FUNC_THUMUC__47` | Bỏ trống Tỉnh/thành phố hoặc Xã/phường (địa chỉ hành chính, bắt buộc) | `32_160_006` |
| `FUNC_THUMUC__48` | Tạo điểm bán không nhập Địa chỉ chi tiết (trường không bắt buộc) | `32_160_007` |
| `FUNC_THUMUC__49` | Xem danh sách Điểm bán/hub từ màn chi tiết đơn vị | `32_050_002` |
| `FUNC_THUMUC__50` | Xem chi tiết điểm bán và thực hiện chỉnh sửa thông tin | `32_160_008` |
| `FUNC_THUMUC__51` | Xóa điểm bán/hub từ màn chi tiết | `32_160_009` |
| `FUNC_THUMUC__52` | Tạo điểm bán khi danh mục Cửa hàng mẫu đang rỗng (chưa có cửa hàng mẫu nào) | `32_160_010` |
| `FUNC_THUMUC__53` | Mở popup 'Gán nhân viên' từ màn chi tiết đơn vị | `32_170_001` |
| `FUNC_THUMUC__54` | Gán mới 1 nhân viên với vai trò 'Giám đốc xã' cho đơn vị cấp Xã | `32_170_002` |
| `FUNC_THUMUC__55` | Gán cùng 1 nhân viên cho nhiều đơn vị/vai trò khác nhau trong cùng 1 lần lưu | `32_170_003` |
| `FUNC_THUMUC__56` | Gán nhân viên có trạng thái 'Đã nghỉ' vẫn hiển thị trong danh sách (đọc lịch sử) | `32_170_004` |
| `FUNC_THUMUC__57` | Đổi trạng thái nhân viên từ 'Đang làm' sang 'Đã nghỉ' | `32_170_005` |
| `FUNC_THUMUC__58` | Xóa một dòng gán nhân viên bằng nút (x) | `32_170_006` |
| `FUNC_THUMUC__59` | Click '+ Thêm nhân viên & vai trò' nhiều lần liên tiếp | `32_170_007` |
| `FUNC_THUMUC__60` | Click 'Xác nhận' khi dòng mới chưa chọn Nhân viên (bắt buộc) | `32_170_008` |
| `FUNC_THUMUC__61` | Click 'Xác nhận' khi dòng mới chưa chọn Vai trò (bắt buộc) | `32_170_009` |
| `FUNC_THUMUC__62` | Gán trùng cùng 1 nhân viên với cùng 1 vai trò tại cùng 1 đơn vị (đã tồn tại) | `32_170_010` |
| `FUNC_THUMUC__63` | Hủy thao tác Gán nhân viên - dữ liệu không bị thay đổi | `32_170_011` |
| `FUNC_THUMUC__64` | Tìm kiếm/lọc nhân viên trong dropdown 'Nhân viên' theo tên hoặc SĐT | `32_170_012` |
| `FUNC_THUMUC__65` | Đổi Đơn vị của một dòng gán đã tồn tại sang đơn vị khác | `32_170_013` |
| `FUNC_THUMUC__66` | Số lượng nhân viên gán hiển thị đồng bộ trên cây phân cấp sau khi gán mới | `32_170_014` |
| `FUNC_THUMUC__67` | Gán nhân viên cho đơn vị không có quyền (nhân viên thường thao tác) | `32_170_015` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
