# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 04_5 — Quản lý tồn kho và hàng xả kho

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 04_5_quan_ly_ton_kho`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `04_5_quan_ly_ton_kho`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **45** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **45** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 46 |
| — **tài liệu gốc KHÔNG có** | 1 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 1 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `04_5_030_001` | Xem Thẻ kho khi có dữ liệu | HDSD 030 |

## 5. Bảng đối chiếu đầy đủ 45 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_1` | Kiểm tra role admin của cấp tổng công ty | `04_5_050_001` |
| `FUNC_1_2` | Kiểm tra role quản lý tỉnh của cấp tỉnh | `04_5_050_002` |
| `FUNC_1_3` | Kiểm tra role giám đốc xã của cấp xã | `04_5_050_003` |
| `FUNC_1_4` | Kiểm tra role cửa hàng trưởng của cấp điểm bán/kho | `04_5_050_004` |
| `FUNC_1_5` | Kiểm tra hiển thị màn hình | `04_5_010_001` |
| `FUNC_1_6` | Kiểm tra tìm kiếm theo mã SKU, tên sản phẩm | `04_5_010_002` |
| `FUNC_1_7` | Kiểm tra lọc theo danh mục sản phẩm | `04_5_010_003` |
| `FUNC_1_8` | Kiểm tra chọn điểm bán | `04_5_010_004` |
| `FUNC_1_9` | Kiểm tra hiển thị danh sách sản phẩm | `04_5_010_005` |
| `FUNC_1_10` | Kiểm tra tab báo cáo | `04_5_040_001` |
| `FUNC_1_11` | Kiểm tra phân trang | `04_5_010_006` |
| `FUNC_1_12` | Kiểm tra xuất excel | `04_5_010_007` |
| `FUNC_1_81` | Kiểm tra hiển thị giao diện màn Thẻ kho | `04_5_030_002` |
| `FUNC_1_82` | Kiểm tra bộ lọc Điểm bán/Kho | `04_5_030_003` |
| `FUNC_1_83` | Kiểm tra tìm kiếm theo Tên sản phẩm | `04_5_030_004` |
| `FUNC_1_84` | Kiểm tra tìm kiếm theo SKU | `04_5_030_005` |
| `FUNC_1_85` | Kiểm tra tìm kiếm theo Barcode | `04_5_030_006` |
| `FUNC_1_86` | Kiểm tra chọn khoảng thời gian | `04_5_030_007` |
| `FUNC_1_87` | Kiểm tra số liệu Tồn đầu kỳ | `04_5_030_008` |
| `FUNC_1_88` | Kiểm tra số liệu Tổng nhập | `04_5_030_009` |
| `FUNC_1_89` | Kiểm tra số liệu Tổng xuất | `04_5_030_010` |
| `FUNC_1_90` | Kiểm tra số liệu Tồn cuối kỳ | `04_5_030_011` |
| `FUNC_1_91` | Kiểm tra phân trang | `04_5_030_012` |
| `FUNC_1_92` | Kiểm tra hiển thị "Thẻ kho" khi có phát sinh Nhập từ Nhà cung cấp | `04_5_030_013` |
| `FUNC_1_93` | Kiểm tra hiển thị "Thẻ kho" khi có phát sinh Nhập từ Chuyển kho | `04_5_030_014` |
| `FUNC_1_94` | Kiểm tra hiển thị "Thẻ kho" khi có phát sinh Nhập do Kiểm kho (tồn thực tế > tồn hệ thống) | `04_5_030_015` |
| `FUNC_1_95` | Kiểm tra hiển thị "Thẻ kho" khi có phát sinh Xuất thường | `04_5_030_016` |
| `FUNC_1_96` | Kiểm tra hiển thị "Thẻ kho" khi có phát sinh Xuất chuyển kho | `04_5_030_017` |
| `FUNC_1_97` | Kiểm tra hiển thị "Thẻ kho" khi có phát sinh Xuất do Kiểm kho (tồn thực tế < tồn hệ thống) | `04_5_030_018` |
| `FUNC_1_211` | Kiểm tra giao diện | `04_5_020_001` |
| `FUNC_1_212` | Kiểm tra thêm mới kho | `04_5_020_002` |
| `FUNC_1_213` | Kiểm tra thêm mới kho và chọn làm kho mặc định | `04_5_020_003` |
| `FUNC_1_214` | Kiểm tra nhập đầy đủ thông tin | `04_5_020_004` |
| `FUNC_1_215` | Kiểm tra Bỏ trống trường bắt buộc | `04_5_020_005` |
| `FUNC_1_216` | Kiểm tra chuyển đổi kho mặc định | `04_5_020_006` |
| `FUNC_1_217` | Kiểm tra on/off kho | `04_5_020_007` |
| `FUNC_1_218` | Kiểm tra thay đổi kho khi kho off | `04_5_020_008` |
| `FUNC_1_219` | Kiểm tra chỉnh sửa thông tin kho | `04_5_020_009` |
| `FUNC_1_220` | Kiểm tra xoá kho vật lý | `04_5_020_010` |
| `FUNC_1_221` | Kiểm tra thực hiện chuyển kho với kho vật lý | `04_5_020_011` |
| `FUNC_1_222` | Kiểm tra thực hiện kiểm kho với kho vật lý | `04_5_020_012` |
| `FUNC_1_223` | Kiểm tra xuất kho với kho vật lý | `04_5_020_013` |
| `FUNC_1_224` | Kiểm tra nhập kho với kho vật lý | `04_5_020_014` |
| `FUNC_1_225` | Kiểm tra chuyển kho giữa các kho trong 1 đơn vị | `04_5_020_015` |
| `FUNC_1_226` | Kiểm tra thêm kho với tỉnh chưa có HUB trực thuộc | `04_5_020_016` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 45/45 case gốc (trước đó 2), 3 → 46 case._

### 6.1 🔴 Năm case gốc KHÔNG có kỳ vọng dùng được

| Mã gốc | Cột "Kết quả mong muốn" trong sheet | Vấn đề |
|---|---|---|
| `FUNC_1_220` | *"Xoá kho thành công - Số lượng còn lại trong kho ?"* | người viết tự đặt câu hỏi — **tồn đi đâu khi xoá kho?** |
| `FUNC_1_222` | *"Check lại"* | ghi chú, không phải đặc tả |
| `FUNC_1_223` | *"Check lại"* | nt |
| `FUNC_1_224` | *"Check lại"* | nt |
| `FUNC_1_225` | *"Check lại"* | nt |

Đã viết lại cả năm theo nghiệp vụ suy từ code và để `BLOCKED` kèm lý do. 🚫 Không chép "Check lại"
vào assert. `FUNC_1_220` là câu hỏi **mất hàng**, phải trả lời trước khi ai chạy case đó.

### 6.2 `FUNC_1_221` chép nhầm kỳ vọng của `FUNC_1_226`

`FUNC_1_221` là *"thực hiện chuyển kho với kho vật lý"* nhưng kỳ vọng ghi *"Thêm kho mới thành 1 HUB
trực thuộc"* — đó là kỳ vọng của `FUNC_1_226` (*"thêm kho với tỉnh chưa có HUB trực thuộc"*). Đã viết
lại `04_5_020_011` theo nghiệp vụ đúng và giữ nguyên kỳ vọng HUB cho `04_5_020_016`.

### 6.3 Bốn case đầu sheet không thuộc phân hệ này

`FUNC_1_1`–`4` (đăng nhập 4 cấp vai, vào `/lich-ca-nhan/ca-lam-viec`) nằm ở đầu file
`uat_vnpost_quan_ly_kho.csv` nhưng **cột nhóm để trống** nên rơi vào phân hệ mặc định. Nghiệp vụ thật
là **đăng nhập + phạm vi theo cấp**, trùng với `31_quan_ly_phan_quyen` và cả `03b` (màn ca làm việc).
Đã dựng `04_5_050_001`–`004` để không bỏ lọt, `BLOCKED` chờ user chốt giữ ở đâu. 🚫 Không tự chuyển
sang phân hệ khác — đó là quyết định ánh xạ, thuộc `goc-mapping.js`.

### 6.4 Thẻ kho là màn ĐỌC nhưng khó nhất để đối chiếu

Bốn ô số liệu (`FUNC_1_87`–`90`) đọc từ ClickHouse DW. Ba bẫy đã gặp thật đều làm lệch đúng bốn ô
này: query thiếu `FINAL` ⇒ đếm đôi; **tồn đầu kỳ đếm hai lần**; **phiếu con của phiên kiểm kho vào
thẻ kho** ⇒ Tổng nhập/Tổng xuất cộng cả phiếu cha và phiếu con. Thêm hai quy tắc: NXT đo bằng
`post − pre` chứ không phải `quantity`, và chênh lệch kiểm kê **tách cột riêng từ 07/09**.

⇒ Đã để `04_5_030_008`–`011` `BLOCKED` với lý do "chưa chốt cách đối chiếu DW trong auto test".
🚫 Không hạ kỳ vọng thành "ô có hiển thị số" — làm vậy là bỏ lọt đúng loại lỗi đã xảy ra.

### 6.5 Câu hỏi barcode nên trả lời một lần cho hai phân hệ

`FUNC_1_85` (Thẻ kho) và `FUNC_1_202` (Cài đặt cảnh báo, phân hệ `04_1`) đều đòi tìm theo **barcode**
mà code không khai. Nên gộp thành một câu hỏi cho user.
