# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 12_3 — Công nợ nhà cung cấp

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 12_3_cong_no_nha_cung_cap`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `12_3_cong_no_nha_cung_cap`
- Tài liệu gốc liên quan: [`uat_vnpost_nha_cung_cap.csv`](../test-case-goc/uat_vnpost_nha_cung_cap.csv) · [`uat_vnpost_tai_chinh.csv`](../test-case-goc/uat_vnpost_tai_chinh.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **68** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **68** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 68 |
| — **tài liệu gốc KHÔNG có** | 0 |

**Độ phủ tài liệu gốc: 100%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `NCC_78` | `TaiChinh_44` | Thanh toán sinh phiếu thu |
| `NCC_79` | `TaiChinh_45` | Thanh toán lớn hơn số nợ |
| `NCC_80` | `TaiChinh_46` | Thanh toán bằng đúng số nợ |
| `NCC_81` | `TaiChinh_47` | Thanh toán nhiều lần cho 1 PO |
| `NCC_84` | `TaiChinh_50` | Gạch nợ thành công |
| `NCC_85` | `TaiChinh_51` | Gạch nợ không sinh phiếu thu |
| `NCC_86` | `TaiChinh_52` | Gạch nợ vượt số nợ |
| `NCC_88` | `TaiChinh_54` | Ghi nợ thành công |
| `NCC_89` | `TaiChinh_55` | Ghi nợ không sinh phiếu chi |
| `NCC_90` | `TaiChinh_56` | Ghi nợ số tiền âm |
| `NCC_91` | `TaiChinh_57` | Ghi nợ số tiền bằng 0 |
| `NCC_92` | `TaiChinh_58` | Lưu lịch sử ghi nợ |
| `NCC_93` | `TaiChinh_59` | Kiểm tra tab Lịch sử thanh toán |
| `NCC_94` | `TaiChinh_60` | Kiểm tra tab Lịch sử ghi nợ |
| `NCC_95` | `TaiChinh_61` | Kiểm tra tab Lịch sử trả hàng NCC |
| `NCC_96` | `TaiChinh_62` | Đối chiếu tổng còn nợ |
| `NCC_97` | `TaiChinh_63` | Thanh toán một phần PO |
| `NCC_98` | `TaiChinh_64` | Thanh toán nhiều lần đến hết nợ |
| `NCC_99` | `TaiChinh_65` | Kiểm tra lịch sử khi thanh toán nhiều lần |
| `NCC_100` | `TaiChinh_66` | Gạch nợ một phần công nợ |
| `NCC_101` | `TaiChinh_67` | Ghi nợ bổ sung sau khi đã thanh toán |
| `NCC_102` | `TaiChinh_68` | Xuất Excel lịch sử công nợ |
| `NCC_103` | `TaiChinh_69` | Kiểm tra ghi nhận công nợ khi TCT đặt hàng thẳng về tỉnh |
| `NCC_104` | `TaiChinh_70` | Kiểm tra trừ nợ khi xuất trả hàng NCC |
| `NCC_105` | `TaiChinh_71` | Kiểm tra ghi nhận công nợ NCC của tỉnh |
| `NCC_106` | `TaiChinh_72` | Kiểm tra ghi nhận công nợ NCC khi nhận giao 1 phần |
| `NCC_107` | `TaiChinh_73` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có VAT |
| `NCC_108` | `TaiChinh_74` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có khuyến mãi, quà tặng |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 0 case

Không có.

## 5. Bảng đối chiếu đầy đủ 68 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `NCC_76` | Kiểm tra giao diện màn Lịch sử ghi nợ và thanh toán NCC | `12_3_010_001` |
| `NCC_77` | Thanh toán công nợ thành công | `12_3_020_002` |
| `NCC_78` | Thanh toán sinh phiếu thu | `12_3_020_003` |
| `NCC_79` | Thanh toán lớn hơn số nợ | `12_3_020_004` |
| `NCC_80` | Thanh toán bằng đúng số nợ | `12_3_020_005` |
| `NCC_81` | Thanh toán nhiều lần cho 1 PO | `12_3_020_006` |
| `NCC_82` | Lưu lịch sử từng lần thanh toán | `12_3_020_007` |
| `NCC_83` | Kiểm tra tổng công nợ sau nhiều lần thanh toán | `12_3_020_008` |
| `NCC_84` | Gạch nợ thành công | `12_3_020_009` |
| `NCC_85` | Gạch nợ không sinh phiếu thu | `12_3_020_010` |
| `NCC_86` | Gạch nợ vượt số nợ | `12_3_020_011` |
| `NCC_87` | Lưu lịch sử gạch nợ | `12_3_020_012` |
| `NCC_88` | Ghi nợ thành công | `12_3_020_013` |
| `NCC_89` | Ghi nợ không sinh phiếu chi | `12_3_020_014` |
| `NCC_90` | Ghi nợ số tiền âm | `12_3_020_015` |
| `NCC_91` | Ghi nợ số tiền bằng 0 | `12_3_020_016` |
| `NCC_92` | Lưu lịch sử ghi nợ | `12_3_020_017` |
| `NCC_93` | Kiểm tra tab Lịch sử thanh toán | `12_3_020_018` |
| `NCC_94` | Kiểm tra tab Lịch sử ghi nợ | `12_3_020_019` |
| `NCC_95` | Kiểm tra tab Lịch sử trả hàng NCC | `12_3_020_020` |
| `NCC_96` | Đối chiếu tổng còn nợ | `12_3_020_021` |
| `NCC_97` | Thanh toán một phần PO | `12_3_020_022` |
| `NCC_98` | Thanh toán nhiều lần đến hết nợ | `12_3_020_023` |
| `NCC_99` | Kiểm tra lịch sử khi thanh toán nhiều lần | `12_3_020_024` |
| `NCC_100` | Gạch nợ một phần công nợ | `12_3_020_025` |
| `NCC_101` | Ghi nợ bổ sung sau khi đã thanh toán | `12_3_020_026` |
| `NCC_102` | Xuất Excel lịch sử công nợ | `12_3_020_027` |
| `NCC_103` | Kiểm tra ghi nhận công nợ khi TCT đặt hàng thẳng về tỉnh | `12_3_020_028` |
| `NCC_104` | Kiểm tra trừ nợ khi xuất trả hàng NCC | `12_3_020_029` |
| `NCC_105` | Kiểm tra ghi nhận công nợ NCC của tỉnh | `12_3_020_030` |
| `NCC_106` | Kiểm tra ghi nhận công nợ NCC khi nhận giao 1 phần | `12_3_020_031` |
| `NCC_107` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có VAT | `12_3_020_032` |
| `NCC_108` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có khuyến mãi, quà tặng | `12_3_020_033` |
| `TaiChinh_40` | Kiểm tra giao diện | `12_3_030_001` |
| `TaiChinh_41` | Kiểm tra tìm kiếm tên NCC | `12_3_030_002` |
| `TaiChinh_42` | Kiểm tra phân trang | `12_3_030_003` |
| `TaiChinh_43` | Thanh toán công nợ thành công | `12_3_030_004` |
| `TaiChinh_44` | Thanh toán sinh phiếu thu | `12_3_030_005` |
| `TaiChinh_45` | Thanh toán lớn hơn số nợ | `12_3_030_006` |
| `TaiChinh_46` | Thanh toán bằng đúng số nợ | `12_3_030_007` |
| `TaiChinh_47` | Thanh toán nhiều lần cho 1 PO | `12_3_030_008` |
| `TaiChinh_48` | Lưu lịch sử từng lần thanh toán | `12_3_030_009` |
| `TaiChinh_49` | Kiểm tra tổng công nợ sau nhiều lần thanh toán | `12_3_030_010` |
| `TaiChinh_50` | Gạch nợ thành công | `12_3_030_011` |
| `TaiChinh_51` | Gạch nợ không sinh phiếu thu | `12_3_030_012` |
| `TaiChinh_52` | Gạch nợ vượt số nợ | `12_3_030_013` |
| `TaiChinh_53` | Lưu lịch sử gạch nợ | `12_3_030_014` |
| `TaiChinh_54` | Ghi nợ thành công | `12_3_030_015` |
| `TaiChinh_55` | Ghi nợ không sinh phiếu chi | `12_3_030_016` |
| `TaiChinh_56` | Ghi nợ số tiền âm | `12_3_030_017` |
| `TaiChinh_57` | Ghi nợ số tiền bằng 0 | `12_3_030_018` |
| `TaiChinh_58` | Lưu lịch sử ghi nợ | `12_3_030_019` |
| `TaiChinh_59` | Kiểm tra tab Lịch sử thanh toán | `12_3_030_020` |
| `TaiChinh_60` | Kiểm tra tab Lịch sử ghi nợ | `12_3_030_021` |
| `TaiChinh_61` | Kiểm tra tab Lịch sử trả hàng NCC | `12_3_030_022` |
| `TaiChinh_62` | Đối chiếu tổng còn nợ | `12_3_030_023` |
| `TaiChinh_63` | Thanh toán một phần PO | `12_3_030_024` |
| `TaiChinh_64` | Thanh toán nhiều lần đến hết nợ | `12_3_030_025` |
| `TaiChinh_65` | Kiểm tra lịch sử khi thanh toán nhiều lần | `12_3_030_026` |
| `TaiChinh_66` | Gạch nợ một phần công nợ | `12_3_030_027` |
| `TaiChinh_67` | Ghi nợ bổ sung sau khi đã thanh toán | `12_3_030_028` |
| `TaiChinh_68` | Xuất Excel lịch sử công nợ | `12_3_030_029` |
| `TaiChinh_69` | Kiểm tra ghi nhận công nợ khi TCT đặt hàng thẳng về tỉnh | `12_3_030_030` |
| `TaiChinh_70` | Kiểm tra trừ nợ khi xuất trả hàng NCC | `12_3_030_031` |
| `TaiChinh_71` | Kiểm tra ghi nhận công nợ NCC của tỉnh | `12_3_030_032` |
| `TaiChinh_72` | Kiểm tra ghi nhận công nợ NCC khi nhận giao 1 phần | `12_3_030_033` |
| `TaiChinh_73` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có VAT | `12_3_030_034` |
| `TaiChinh_74` | Kiểm tra ghi nhận công nợ NCC với sản phẩm có khuyến mãi, quà tặng | `12_3_030_035` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 68/68 case gốc (trước đó 1), 1 → 68 case._

### 6.1 🔴 67/68 case là case TIỀN — không có case đọc thuần

Phân hệ này trước đây khai **đúng 1 case** trong khi sheet có **68**. Đó chính là ví dụ mà bàn giao
đã nêu: *"`12_3` khai đúng 1 case và case đó có script, trong khi sheet QC có 68 case"* — cột
"Có script" đánh lừa người đọc. Nay đã phủ đủ.

### 6.2 Ba nghiệp vụ khác nhau ở chỗ CÓ SINH CHỨNG TỪ hay không

Sheet phân biệt rất rõ và đây là điểm dễ sai nhất:

- **Thanh toán** công nợ ⇒ **SINH phiếu thu** (`NCC_78`).
- **Gạch nợ** ⇒ **KHÔNG sinh phiếu thu** (`NCC_85`).
- **Ghi nợ** ⇒ **KHÔNG sinh phiếu chi** (`NCC_89`).

⇒ Ba nghiệp vụ cùng làm đổi số dư nhưng **chỉ một** sinh chứng từ tiền. Đối chiếu sai là kết luận sai
về dòng tiền.

### 6.3 Mọi nghiệp vụ đều phải LƯU LỊCH SỬ, và dòng cũ không được sửa

`NCC_82` `NCC_87` `NCC_92` `NCC_99` đều kiểm lịch sử từng lần. 🔴 Nguyên tắc kế toán: điều chỉnh phải
là **dòng mới**, 🚫 không sửa hay xoá dòng cũ — giống case `04_3_040_005` (huỷ phiếu nhập sinh dòng
cấn trừ mới trong sổ công nợ NCC).

### 6.4 Sáu case ghi nhận công nợ theo LUỒNG, không phải theo màn

`NCC_103`–`NCC_108`: TCT đặt hàng thẳng về tỉnh · xuất trả hàng NCC (trừ nợ) · công nợ NCC của tỉnh ·
nhận giao **một phần** · sản phẩm **có VAT** · sản phẩm **có khuyến mãi, quà tặng**. Sáu case này nối
sang `04_3` (nhập kho), `13_3` (đặt hàng) và `14_x` (trả hàng NCC) — không đo được nếu chỉ mở màn
công nợ.

### 6.5 Hai nhóm từ HAI sheet phải khớp số

Nhóm `NCC_*` từ sheet nhà cung cấp và nhóm `TaiChinh_40`–`53` từ sheet **tài chính** mô tả **cùng một
màn** *Công nợ NCC*. Đã dựng cả hai nhóm (task `020` và `030`) và ghi rõ trong kỳ vọng rằng số liệu
phải khớp. 🔴 Nếu lệch thì một trong hai sheet viết theo bản cũ — báo để user chốt.
