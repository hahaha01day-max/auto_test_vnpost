# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 13_2 — Gộp tách phiếu và điều phối nguồn hàng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 13_2_gop_tach_va_dieu_phoi`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `13_2_gop_tach_va_dieu_phoi`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **2** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **2** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 3 |
| — **tài liệu gốc KHÔNG có** | 1 |

**Độ phủ tài liệu gốc: 100%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 1 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `13_2_020_001` | Kiểm tra điều kiện gộp phiếu | HDSD 020 |

## 5. Bảng đối chiếu đầy đủ 2 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_263` | Kiểm tra hiển thị màn hình | `13_2_030_001` |
| `FUNC_1_264` | Kiểm tra Lịch sử gộp/ tách phiếu | `13_2_030_002` |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 2/2 case gốc (trước đó 0), 1 → 3 case._

### 6.1 Phân hệ này từng là ví dụ của bàn giao về cột "Có script" gây hiểu nhầm

Bàn giao viết: *"`13_2` khai đúng 1 case và case đó có script, trong khi sheet QC có 2 case"* — cột
`Có script` = 1/1 = 100% nhưng độ phủ thật là 0/2. Nay đã phủ 2/2.

### 6.2 Sheet nhỏ, nghiệp vụ không nhỏ

Sheet chỉ có **2 case** (nhóm *Xem lịch sử gộp/tách phiếu*), còn nghiệp vụ gộp/tách thực sự nằm ở
`13_1` task `070` `080` (15 case). Phân hệ này là **vế truy nguyên**: từ phiếu tổng tra ngược ra đủ
phiếu con và ngược lại, **tổng số lượng hai chiều phải khớp**.

🔴 Khi làm script, phải chạy cặp: gộp/tách ở `13_1` rồi kiểm lịch sử ở đây. Kiểm riêng lẻ không phát
hiện được hụt số lượng.
