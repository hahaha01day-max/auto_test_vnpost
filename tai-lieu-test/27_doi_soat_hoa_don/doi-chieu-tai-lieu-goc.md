# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 27 — Đối soát hoá đơn

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 27_doi_soat_hoa_don`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `27_doi_soat_hoa_don`
- Tài liệu gốc liên quan: [`uat_vnpost_nha_cung_cap.csv`](../test-case-goc/uat_vnpost_nha_cung_cap.csv) · [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **38** |
| — trong đó **trùng lặp** trong chính sheet gốc | 7 |
| **Case gốc đã dựng** | **31** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 36 |
| — **tài liệu gốc KHÔNG có** | 18 |

**Độ phủ tài liệu gốc: 82%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `NCC_170` | `FUNC_1_347` | Kiểm tra giao diện |
| `NCC_171` | `FUNC_1_348` | Kiểm tra tìm kiểm theo mã PO |
| `NCC_172` | `FUNC_1_349` | Kiểm tra tìm kiểm theo mã HĐ |
| `NCC_173` | `FUNC_1_350` | Kiểm tra lọc trạng thái đối soát |
| `NCC_174` | `FUNC_1_351` | Kiểm tra lọc trạng theo nhà cung cấp |
| `NCC_175` | `FUNC_1_352` | Kiểm tra hiển thị NCC đúng role cấp tỉnh và TCT |
| `NCC_176` | `FUNC_1_353` | Kiểm tra hiển thị tab theo hoá đơn |
| `NCC_177` | `FUNC_1_354` | Kiểm tra hiển thị tab Theo phiếu PO |
| `NCC_178` | `FUNC_1_355` | Kiểm tra xem chi tiết đối soát khớp hoá đơn |
| `NCC_179` | `FUNC_1_356` | Kiểm tra xem chi tiết đối soát lệch hoá đơn |
| `NCC_180` | `FUNC_1_357` | Kiểm tra xoá file xml |
| `NCC_181` | `FUNC_1_358` | Kiểm tra tải lại đối soát |
| `NCC_182` | `FUNC_1_359` | Kiểm tra phân trang |
| `NCC_183` | `FUNC_1_360` | Kiểm tra upload danh sách file XML |
| `NCC_184` | `FUNC_1_361` | Kiểm tra upload trùng file XML |
| `NCC_185` | `FUNC_1_362` | Kiểm tra upload file lệch sau khi đã upload file khớp |
| `NCC_186` | `FUNC_1_363` | Kiểm tra đổi soát phiếu PO |
| `NCC_187` | `FUNC_1_364` | Kiểm tra tái ảnh vượt giới hạn của tab đổi soát phiếu PO |
| `NCC_188` | `FUNC_1_365` | Kiểm tra báo cáo đối soát |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 18 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `27_010_002` | Một tệp lỗi không làm hỏng cả lô | HDSD 010 |
| `27_020_005` | Cột Hạch toán là trạng thái của cả phiếu không phải của hoá đơn | HDSD 020 |
| `27_030_002` | Chi tiết hoá đơn con hiện dòng hàng đọc từ chính tệp đó | HDSD 030 |
| `27_030_003` | Bảng Chi tiết hàng hoá là số của cả nhóm hoá đơn | HDSD 030 |
| `27_040_002` | Thẻ Phiếu nhập kho đối chiếu số hàng thực nhận | HDSD 040 |
| `27_040_003` | Thẻ Phiếu đặt hàng hiện ba con số theo mặt hàng | HDSD 040 |
| `27_050_001` | Sửa hoá đơn rồi cho đối chiếu lại | HDSD 050 |
| `27_050_002` | Thêm và xoá dòng hàng trong màn chỉnh sửa | HDSD 050 |
| `27_060_001` | Cảnh báo khi còn hoá đơn điều chỉnh chưa rõ dấu | HDSD 060 |
| `27_060_002` | Bảng Đối soát theo sản phẩm chỉ ra chỗ lệch | HDSD 060 |
| `27_PQ_001` | Vai không có quyền đối soát thì không vào được | HDSD |
| `27_070_008` | Danh sách phiếu đối soát rỗng | Kỹ thuật 3.4 #7 — trạng thái rỗng |
| `27_070_009` | Tổ hợp bộ lọc trên màn đối soát | Kỹ thuật 3.4 #7 — tổ hợp bộ lọc |
| `27_071_001` | Tìm phiếu bằng ký tự đặc biệt | Kỹ thuật 3.4 #8 — ký tự đặc biệt |
| `27_071_002` | Tìm phiếu bằng mã PO không tồn tại | Kỹ thuật 3.4 #8 — không tồn tại |
| `27_071_003` | Xoá bộ lọc trở về mặc định | Kỹ thuật 3.4 #7 — xoá lọc |
| `27_071_004` | Tải lên tệp sai định dạng thay cho XML | Kỹ thuật 3.4 #4 — kiểu dữ liệu sai |
| `27_071_005` | Huỷ giữa chừng khi đang đối soát | Kỹ thuật 3.4 #9 — huỷ giữa chừng |

## 5. Bảng đối chiếu đầy đủ 38 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `NCC_170` | Kiểm tra giao diện | `27_070_001` |
| `NCC_171` | Kiểm tra tìm kiểm theo mã PO | `27_020_001` |
| `NCC_172` | Kiểm tra tìm kiểm theo mã HĐ | `27_020_001` |
| `NCC_173` | Kiểm tra lọc trạng thái đối soát | `27_020_002` |
| `NCC_174` | Kiểm tra lọc trạng theo nhà cung cấp | `27_070_002` |
| `NCC_175` | Kiểm tra hiển thị NCC đúng role cấp tỉnh và TCT | `27_070_003` |
| `NCC_176` | Kiểm tra hiển thị tab theo hoá đơn | `27_020_003` |
| `NCC_177` | Kiểm tra hiển thị tab Theo phiếu PO | `27_020_004` |
| `NCC_178` | Kiểm tra xem chi tiết đối soát khớp hoá đơn | `27_030_001` |
| `NCC_179` | Kiểm tra xem chi tiết đối soát lệch hoá đơn | `27_040_001` |
| `NCC_180` | Kiểm tra xoá file xml | `27_040_004` |
| `NCC_181` | Kiểm tra tải lại đối soát | `27_050_003` |
| `NCC_182` | Kiểm tra phân trang | `27_070_004` |
| `NCC_183` | Kiểm tra upload danh sách file XML | `27_010_001` |
| `NCC_184` | Kiểm tra upload trùng file XML | `27_070_005` |
| `NCC_185` | Kiểm tra upload file lệch sau khi đã upload file khớp | `27_010_003` |
| `NCC_186` | Kiểm tra đổi soát phiếu PO | `27_060_003` |
| `NCC_187` | Kiểm tra tái ảnh vượt giới hạn của tab đổi soát phiếu PO | `27_070_006` |
| `NCC_188` | Kiểm tra báo cáo đối soát | `27_070_007` |
| `FUNC_1_347` | Kiểm tra giao diện | — **chưa dựng** |
| `FUNC_1_348` | Kiểm tra tìm kiểm theo mã PO | `27_020_001` |
| `FUNC_1_349` | Kiểm tra tìm kiểm theo mã HĐ | `27_020_001` |
| `FUNC_1_350` | Kiểm tra lọc trạng thái đối soát | `27_020_002` |
| `FUNC_1_351` | Kiểm tra lọc trạng theo nhà cung cấp | — **chưa dựng** |
| `FUNC_1_352` | Kiểm tra hiển thị NCC đúng role cấp tỉnh và TCT | — **chưa dựng** |
| `FUNC_1_353` | Kiểm tra hiển thị tab theo hoá đơn | `27_020_003` |
| `FUNC_1_354` | Kiểm tra hiển thị tab Theo phiếu PO | `27_020_004` |
| `FUNC_1_355` | Kiểm tra xem chi tiết đối soát khớp hoá đơn | `27_030_001` |
| `FUNC_1_356` | Kiểm tra xem chi tiết đối soát lệch hoá đơn | `27_040_001` |
| `FUNC_1_357` | Kiểm tra xoá file xml | `27_040_004` |
| `FUNC_1_358` | Kiểm tra tải lại đối soát | `27_050_003` |
| `FUNC_1_359` | Kiểm tra phân trang | — **chưa dựng** |
| `FUNC_1_360` | Kiểm tra upload danh sách file XML | `27_010_001` |
| `FUNC_1_361` | Kiểm tra upload trùng file XML | — **chưa dựng** |
| `FUNC_1_362` | Kiểm tra upload file lệch sau khi đã upload file khớp | `27_010_003` |
| `FUNC_1_363` | Kiểm tra đổi soát phiếu PO | `27_060_003` |
| `FUNC_1_364` | Kiểm tra tái ảnh vượt giới hạn của tab đổi soát phiếu PO | — **chưa dựng** |
| `FUNC_1_365` | Kiểm tra báo cáo đối soát | — **chưa dựng** |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
