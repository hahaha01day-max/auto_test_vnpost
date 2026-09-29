# Kịch bản auto test — 12_3 Công nợ nhà cung cấp

- **Bổ sung 18/09/2026.** **1 → 68 case.** Phủ **68/68** case gốc (trước đó 1). Script hiện có 1.

## Cách chuyển thể

Sheet NCC ghi **kỳ vọng đầy đủ**, nên các case bổ sung được **chép nguyên văn** bước và kỳ vọng từ
sheet (cột `Nguon` = *"Sheet QC (chuyển thể nguyên văn)"*), chỉ thêm một dòng 🔴 nhắc bẫy của repo ở
cuối mỗi kỳ vọng. 🚫 Không diễn giải lại — số liệu và nguyên văn thông báo chính là đặc tả.

## 🔴 Toàn bộ phân hệ là case TIỀN — 67/68 case ghi

Ba nghiệp vụ, **khác nhau ở chỗ có sinh phiếu hay không** — 🚫 đừng lẫn:

| Nghiệp vụ | Sinh chứng từ? | Case gốc |
|---|---|---|
| **Thanh toán** công nợ | ✅ **sinh phiếu thu** | `NCC_77` `NCC_78` |
| **Gạch nợ** | ❌ **KHÔNG sinh phiếu thu** | `NCC_84` `NCC_85` |
| **Ghi nợ** | ❌ **KHÔNG sinh phiếu chi** | `NCC_88` `NCC_89` |

## Bộ biên sheet đòi kiểm

thanh toán **lớn hơn** số nợ (`NCC_79`) · **đúng bằng** số nợ (`NCC_80`) · **nhiều lần** cho 1 PO
(`NCC_81`) · **một phần** PO (`NCC_97`) · nhiều lần **đến hết nợ** (`NCC_98`) · gạch nợ **vượt** số nợ
(`NCC_86`) · gạch nợ **một phần** (`NCC_100`) · ghi nợ số tiền **âm** (`NCC_90`) · ghi nợ **bằng 0**
(`NCC_91`) · ghi nợ **bổ sung sau khi đã thanh toán** (`NCC_101`).

🔴 **Mọi nghiệp vụ đều phải LƯU LỊCH SỬ** (`NCC_82` `NCC_87` `NCC_92` `NCC_99`) và 🚫 **dòng cũ không
được sửa hay xoá** — điều chỉnh phải là **dòng mới**.

## Bốn case ghi nhận công nợ theo luồng nghiệp vụ

| Case gốc | Tình huống |
|---|---|
| `NCC_103` | **TCT đặt hàng thẳng về tỉnh** — công nợ ghi cho ai? |
| `NCC_104` | **xuất trả hàng NCC** ⇒ **trừ nợ** |
| `NCC_105` | công nợ NCC **của tỉnh** |
| `NCC_106` | **nhận giao một phần** ⇒ công nợ ghi theo phần đã nhận |
| `NCC_107` | sản phẩm **có VAT** |
| `NCC_108` | sản phẩm **có khuyến mãi, quà tặng** |

## Hai nhóm từ HAI sheet khác nhau — phải khớp số

Nhóm `020` (mã `NCC_*`) từ sheet nhà cung cấp; nhóm `030` (mã `TaiChinh_*`) từ sheet **tài chính**,
cùng chủ đề *Công nợ NCC*. 🔴 Hai nhóm mô tả **cùng một màn** ⇒ số liệu phải khớp; nếu lệch thì một
trong hai sheet viết theo bản cũ.

## Phân loại: `BLOCKED` 67 · case ghi **67**

## 🔴 Kết quả chạy script — 20/09/2026

**68/68 case có script.** Lượt chạy: **1 đạt · 0 đỏ · 67 skip**. Hai spec cũ đã xoá.

### Trace đã có — 🚫 đừng tra lại

Vào từ **Quản lý nhà cung cấp** (`/supplier/list`) bằng nút **Công nợ** của dòng NCC; màn mở
**ngay trên trang danh sách** (🚫 không đổi URL).

| Thứ | Giá trị |
|---|---|
| API | `GET /shops/supplier-debt/history?supplierId=…&historyGroup=DEBT&direction=DESC&pageNum&…` |
| Cột | # · Ngày tạo · Mã Phiếu · Mã PO · Ghi chú · Giá trị · Còn nợ · Chi tiết |
| Bộ lọc | khoảng ngày (`Ngày bắt đầu` / `Ngày kết thúc`) |

🔴 Tham số **`historyGroup`** quyết định đang xem nhóm nào — script ghi lại nguyên văn query để
đối chiếu khi viết tiếp các case lọc.

### 67 case chưa chạy

Toàn bộ là case GHI: **trả nợ NCC, đối trừ công nợ, điều chỉnh công nợ** — tiền thật, 🚫 không
hoàn tác được bằng giao diện. Giữ `allowMutation: false` cho tới khi user xác nhận môi trường
được phép ghi.
