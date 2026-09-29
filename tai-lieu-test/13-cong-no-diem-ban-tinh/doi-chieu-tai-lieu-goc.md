# Đối chiếu tài liệu gốc — 13-cong-no-diem-ban-tinh

> 🔴 **Phân hệ này KHÔNG có nhóm nào trong 19 sheet QC.** File báo cáo cũ (23 case *"Công nợ Tỉnh -
> TCT"*) là **dữ liệu STALE** từ một bản ánh xạ đã bị bỏ — `goc-mapping.js` hiện **cố ý** để nhóm đó
> `module: null` kèm ghi chú:
>
> > *"KHÔNG phải `13-cong-no-diem-ban-tinh`. Phân hệ đó là vế **Điểm bán ↔ Tỉnh**; nhóm này là vế
> > **Tỉnh ↔ Tổng công ty**. Gán nhầm thì 23 case Tỉnh–TCT hiện là 'đã có phân hệ' trong khi chẳng ai
> > dựng — che mất một mảng nghiệp vụ chưa phủ."*
>
> ⇒ Đã dọn nội dung stale (18/09/2026). Công cụ `doi-chieu-goc.js` **không sinh lại** file này vì phân
> hệ không có ánh xạ, nên file cũ nằm lại và gây hiểu nhầm là còn 23 case phải dựng.
>
> 🔴 **23 case "Công nợ Tỉnh - TCT" + 14 case "Phiếu chi" vẫn CHƯA có phân hệ nào** — đúng câu hỏi
> chặn số 1 ở mục 6 của bàn giao, chờ user quyết.

<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 18/09/2026

- Phân hệ: `13-cong-no-diem-ban-tinh`
- Tài liệu gốc liên quan: [`uat_vnpost_tai_chinh.csv`](../test-case-goc/uat_vnpost_tai_chinh.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **23** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **0** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **23** |
| Case đã dựng trong `test-cases.csv` | 31 |
| — **tài liệu gốc KHÔNG có** | 31 |

> 🔴 **`test-cases.csv` của phân hệ này CHƯA có cột `Ma goc`** nên không nối được với sheet gốc.
> Con số "đã dựng = 0" ở trên phản ánh **đúng dữ liệu đang có**, không phải phân hệ chưa làm gì.
> Phải điền `Ma goc` cho từng case (việc tay, một lần) rồi chạy lại lệnh sinh.

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 23 case

🔴 **Đây là việc phải làm.** Mỗi dòng là một case sheet QC có mà kịch bản còn thiếu.

| Mã gốc | Nhóm | Tình huống | Kết quả mong muốn (rút gọn) |
|---|---|---|---|
| `TaiChinh_75` | Công nợ Tỉnh - TCT | Kiểm tra giao diện màn hình Công nợ nội bộ TCT | Hiển thị đầy đủ các thành phần: bộ lọc tỉnh, số tỉnh đang nợ, tổng công nợ còn lại, danh sách công nợ, cột STT |
| `TaiChinh_76` | Công nợ Tỉnh - TCT | Kiểm tra giao diện tab Phiếu nợ | Hiển thị đầy đủ các cột: Mã phiếu, Nguồn, Ngày, Tổng, Đã trả, Còn nợ, Trạng thái. Dữ liệu căn chỉnh đúng định  |
| `TaiChinh_77` | Công nợ Tỉnh - TCT | Kiểm tra giao diện tab Phiếu thanh toán | Hiển thị đầy đủ các cột: Thời gian khai báo, Số tiền, Trạng thái, Ghi chú, Thao tác. Trạng thái hiển thị màu s |
| `TaiChinh_78` | Công nợ Tỉnh - TCT | Kiểm tra giao diện tab Lịch sử | Hiển thị đầy đủ các cột: Thời gian, Loại, Nguồn, Số tiền, Còn lại sau. Dữ liệu được sắp xếp theo thời gian mới |
| `TaiChinh_79` | Công nợ Tỉnh - TCT | Kiểm tra giao diện popup Khai báo thanh toán | Hiển thị đầy đủ thông tin: Còn nợ, Đang phân bổ, ô nhập số tiền thanh toán, nút Xóa phân bổ, danh sách phiếu n |
| `TaiChinh_80` | Công nợ Tỉnh - TCT | Phát sinh phiếu công nợ khi TCT đặt hàng NCC chuyển thẳng về tỉnh | Hệ thống phát sinh 01 phiếu công nợ nội bộ từ giao dịch chuyển hàng từ TCT tới tỉnh, Giá trị công nợ bằng giá  |
| `TaiChinh_81` | Công nợ Tỉnh - TCT | Phát sinh phiếu công nợ khi TCT chuyển kho cho tỉnh | Hệ thống phát sinh 01 phiếu công nợ cho tỉnh nhận hàng. Giá trị công nợ bằng giá trị hàng chuyển. |
| `TaiChinh_82` | Công nợ Tỉnh - TCT | Tỉnh khai báo thanh toán và TCT xác nhận | Trước khi xác nhận, phiếu ở trạng thái "Chờ xác nhận", công nợ không giảm. Sau khi TCT xác nhận, công nợ được  |
| `TaiChinh_83` | Công nợ Tỉnh - TCT | Tỉnh khai báo thanh toán và TCT từ chối | Phiếu chuyển trạng thái "Từ chối", lưu lý do từ chối, công nợ không thay đổi. |
| `TaiChinh_84` | Công nợ Tỉnh - TCT | TCT khai báo thanh toán và Tỉnh xác nhận | Trước xác nhận công nợ không thay đổi. Sau xác nhận công nợ giảm tương ứng số tiền thanh toán. |
| `TaiChinh_85` | Công nợ Tỉnh - TCT | Khai báo thanh toán bằng phân bổ thủ công | Hệ thống cho phép phân bổ tiền theo từng phiếu nợ. Tổng tiền phân bổ không vượt quá số tiền thanh toán. |
| `TaiChinh_86` | Công nợ Tỉnh - TCT | Khai báo thanh toán bằng phân bổ tự động | Hệ thống tự động phân bổ tiền vào các phiếu nợ theo thứ tự quy định. Tổng tiền phân bổ bằng số tiền thanh toán |
| `TaiChinh_87` | Công nợ Tỉnh - TCT | Tổng số tiền phân bổ lớn hơn số tiền thanh toán | Hệ thống hiển thị cảnh báo và không cho lưu phiếu. |
| `TaiChinh_88` | Công nợ Tỉnh - TCT | Tổng số tiền phân bổ nhỏ hơn số tiền thanh toán | Hệ thống hiển thị số tiền chưa phân bổ hoặc không cho phép lưu |
| `TaiChinh_89` | Công nợ Tỉnh - TCT | Chuyển kho thành công nhưng tỉnh chưa xác nhận nhận hàng | Chưa phát sinh công nợ cho tỉnh. Không xuất hiện phiếu nợ liên quan đến phiếu chuyển kho. |
| `TaiChinh_90` | Công nợ Tỉnh - TCT | Tỉnh xác nhận nhận hàng từ phiếu chuyển kho | Hệ thống phát sinh phiếu nợ tương ứng với giá trị hàng hóa đã nhận. |
| `TaiChinh_91` | Công nợ Tỉnh - TCT | Kiểm tra công nợ khi sản phẩm có nhiều mức VAT | Giá trị công nợ được tính bằng tổng tiền sau VAT của từng sản phẩm. |
| `TaiChinh_92` | Công nợ Tỉnh - TCT | Kiểm tra tổng giá trị nhận tại màn hình công nợ | Tổng giá trị nhận = Tổng giá trị các phiếu nợ đã phát sinh (đã bao gồm VAT). |
| `TaiChinh_93` | Công nợ Tỉnh - TCT | Kiểm tra công nợ khi nhận một phần hàng chuyển kho | Công nợ chỉ phát sinh trên số lượng thực tế đã nhận, giá trị đã bao gồm VAT. |
| `TaiChinh_94` | Công nợ Tỉnh - TCT | Kiểm tra công nợ sau khi thanh toán được xác nhận | Công nợ còn lại = Công nợ phát sinh - Đã thanh toán - Đã trả hàng. |
| `TaiChinh_95` | Công nợ Tỉnh - TCT | Kiểm tra công nợ khi phiếu thanh toán bị từ chối | Giá trị công nợ không thay đổi. Phiếu thanh toán chuyển trạng thái "Từ chối". |
| `TaiChinh_96` | Công nợ Tỉnh - TCT | Kiểm tra lịch sử công nợ sau khi phát sinh phiếu nợ | Hiển thị bản ghi loại "Ghi nợ", nguồn "Chuyển kho" hoặc "Nhập hàng NCC", số tiền đã bao gồm VAT. |
| `TaiChinh_97` | Công nợ Tỉnh - TCT | Kiểm tra lịch sử công nợ sau khi thanh toán | Hiển thị bản ghi loại "Thanh toán", số tiền thanh toán và số dư công nợ còn lại sau giao dịch. |

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 31 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `CNDB-ND-001` | Man No dau ky diem ban mo duoc va goi dung API | — |
| `CNDB-ND-002` | Canh bao liet ke so diem ban chua khai no dau ky | — |
| `CNDB-ND-003` | Form khai mo san dung cac diem ban con thieu | — |
| `CNDB-ND-004` | Chan tao ban khai khi bo trong so tien | — |
| `CNDB-ND-005` | Chan tao ban khai khi bo trong can cu | — |
| `CNDB-ND-006` | Tao ban khai no dau ky thanh cong | — |
| `CNDB-ND-007` | Vai diem ban khong thay nut Duyet va ky | — |
| `CNDB-ND-008` | Duyet va ky ban khai no dau ky | — |
| `CNDB-ND-009` | Chan khai de len so da ky cua cung diem ban | — |
| `CNDB-KY-001` | Man Doi soat cong no ban hang mo duoc va goi dung API | — |
| `CNDB-KY-002` | Chan mo ky khi ky khong tron thang | — |
| `CNDB-KY-003` | Chan mo ky khi con diem ban chua khai no dau ky | — |
| `CNDB-KY-004` | Chan mo ky khong lien mach voi ky truoc | — |
| `CNDB-KY-005` | No dau ky cua ky dau tien bang so da khai va ky | — |
| `CNDB-KY-006` | Cong thuc so du mang sang dung tren tung diem ban | — |
| `CNDB-KY-007` | No dau ky cua ky sau bang no cuoi ky cua ky truoc | — |
| `CNDB-KY-008` | Tong ky bang tong cac dong diem ban | — |
| `CNDB-KY-009` | Ky van ky duoc khi con phieu da giao ma Tinh chua xac nhan | — |
| `CNDB-CD-001` | Man Buu dien Tinh nhan tien mo duoc va goi dung API | — |
| `CNDB-CD-002` | Drawer kiem dem la bang tung tui va khong co o nhap tong | — |
| `CNDB-CD-003` | Tong thuc nhan tu cong tu cac dong | — |
| `CNDB-CD-004` | Chan xac nhan khi con tui chua kiem dem | — |
| `CNDB-CD-005` | Chan xac nhan khi tui lech ma khong ghi nguyen nhan | — |
| `CNDB-CD-006` | Xac nhan chuyen khop tao but toan va dong phieu con | — |
| `CNDB-CD-007` | Tui thieu sinh dung mot dong no don vi van chuyen | — |
| `CNDB-CD-008` | Diem bantru du so da giao du tui bi thieu | — |
| `CNDB-LPB-001` | Man No don vi van chuyen mo duoc va goi dung API | — |
| `CNDB-LPB-002` | Tong con treo cong tri tuyet doi khong trieu tieu am duong | — |
| `CNDB-LPB-003` | Loc theo trang thai khoan lech | — |
| `CNDB-PQ-001` | Vai diem ban khong vao duoc tab cap Tinh | — |
| `CNDB-PQ-002` | Duong xac nhan le tung phieu da bi khoa o may chu | — |

## 5. Bảng đối chiếu đầy đủ 23 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `TaiChinh_75` | Kiểm tra giao diện màn hình Công nợ nội bộ TCT | — **chưa dựng** |
| `TaiChinh_76` | Kiểm tra giao diện tab Phiếu nợ | — **chưa dựng** |
| `TaiChinh_77` | Kiểm tra giao diện tab Phiếu thanh toán | — **chưa dựng** |
| `TaiChinh_78` | Kiểm tra giao diện tab Lịch sử | — **chưa dựng** |
| `TaiChinh_79` | Kiểm tra giao diện popup Khai báo thanh toán | — **chưa dựng** |
| `TaiChinh_80` | Phát sinh phiếu công nợ khi TCT đặt hàng NCC chuyển thẳng về tỉnh | — **chưa dựng** |
| `TaiChinh_81` | Phát sinh phiếu công nợ khi TCT chuyển kho cho tỉnh | — **chưa dựng** |
| `TaiChinh_82` | Tỉnh khai báo thanh toán và TCT xác nhận | — **chưa dựng** |
| `TaiChinh_83` | Tỉnh khai báo thanh toán và TCT từ chối | — **chưa dựng** |
| `TaiChinh_84` | TCT khai báo thanh toán và Tỉnh xác nhận | — **chưa dựng** |
| `TaiChinh_85` | Khai báo thanh toán bằng phân bổ thủ công | — **chưa dựng** |
| `TaiChinh_86` | Khai báo thanh toán bằng phân bổ tự động | — **chưa dựng** |
| `TaiChinh_87` | Tổng số tiền phân bổ lớn hơn số tiền thanh toán | — **chưa dựng** |
| `TaiChinh_88` | Tổng số tiền phân bổ nhỏ hơn số tiền thanh toán | — **chưa dựng** |
| `TaiChinh_89` | Chuyển kho thành công nhưng tỉnh chưa xác nhận nhận hàng | — **chưa dựng** |
| `TaiChinh_90` | Tỉnh xác nhận nhận hàng từ phiếu chuyển kho | — **chưa dựng** |
| `TaiChinh_91` | Kiểm tra công nợ khi sản phẩm có nhiều mức VAT | — **chưa dựng** |
| `TaiChinh_92` | Kiểm tra tổng giá trị nhận tại màn hình công nợ | — **chưa dựng** |
| `TaiChinh_93` | Kiểm tra công nợ khi nhận một phần hàng chuyển kho | — **chưa dựng** |
| `TaiChinh_94` | Kiểm tra công nợ sau khi thanh toán được xác nhận | — **chưa dựng** |
| `TaiChinh_95` | Kiểm tra công nợ khi phiếu thanh toán bị từ chối | — **chưa dựng** |
| `TaiChinh_96` | Kiểm tra lịch sử công nợ sau khi phát sinh phiếu nợ | — **chưa dựng** |
| `TaiChinh_97` | Kiểm tra lịch sử công nợ sau khi thanh toán | — **chưa dựng** |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
