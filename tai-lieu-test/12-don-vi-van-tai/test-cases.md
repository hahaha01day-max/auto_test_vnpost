# Kịch bản auto test — 12 Đơn vị vận chuyển

- 🔴 **DỰNG LẠI TỪ ĐẦU 18/09/2026.** **58 → 108 case.**
- Nguồn: **`resource/don_vi_van_tai.xlsx`** (96 case, chuyển thể nguyên văn) + sheet QC
  `quan_ly_kho` nhóm *Tạo đơn vận chuyển* (12 case, phủ **12/12**).
- Script hiện có **73** (`tests/delivery-unit.*.spec.js`).

## 1. 🔴 Vì sao phải dựng lại

Bản trước có 58 dòng nhưng **mọi kỳ vọng đều là**:

> *"Theo assertion trong spec. 🔴 CHUA DOI CHIEU voi resource/don_vi_van_tai.xlsx"*

và cột bước là *"Da co script — cac buoc nam trong tests/delivery-unit.standard.spec.js"*.

Đó là **lấy kết quả thi hành làm đặc tả** — vi phạm luật của skill `test-scenario`:
🚫 *"Cấm dùng cột Kết quả thực tế / Pass-Fail của lần test trước làm kỳ vọng. Đó là bằng chứng thi
hành, không phải đặc tả; chép nó vào là đóng băng luôn cả lỗi đang có."*

Hệ quả: nếu script đang sai, tài liệu cũng sai theo và **không ai phát hiện được**.

⇒ Đã đọc trực tiếp `don_vi_van_tai.xlsx`, lấy **cột "Tình huống / Điều kiện cần có / Các bước thực
hiện / Kết quả mong muốn"**. 🚫 **Không** dùng hai cột *"Kết quả thực tế"* và *"Kết quả (Pass/Fail)"*
trong file — chúng là bằng chứng thi hành.

## 2. File nguồn là sheet QC THỨ 20 — không nằm trong `test-case-goc/`

`resource/don_vi_van_tai.xlsx` tự khai ở dòng 3: **"Tổng các tình huống kiểm thử: 96"**, và có cả
thống kê *Đạt yêu cầu 85 / Không đạt yêu cầu 11*.

🔴 Công cụ `doi-chieu-goc.js` chỉ đọc `tai-lieu-test/test-case-goc/` nên **96 case này không được
tính** vào con số "1.607 case gốc" của bàn giao. Cần user quyết: chuyển file vào `test-case-goc/` để
công cụ đếm, hay giữ ở `resource/` và ghi nhận riêng.

## 3. Task

| Task | Nội dung | Số case |
|---|---|--:|
| `010` | Quản lý **đơn vị vận chuyển** (danh sách, thêm, sửa, xoá, phân quyền) | 24 |
| `020` | Quản lý **đơn vận chuyển** (danh sách, chi tiết) | 11 |
| `030` | Quản lý **nhân viên vận chuyển** | 27 |
| `040` | 🔴 **Công nợ**: ghi nợ · bồi thường · thu hồi bồi thường · lịch sử | 18 |
| `050` | 🔴 **Thanh toán** đơn vận chuyển và thanh toán nợ vận chuyển | 14 |
| `060` | Chuyển kho → Vận chuyển | 2 |
| `070` | Tạo đơn vận chuyển từ phiếu chuyển kho (sheet QC) | 12 |
| — | 1 case cũ giữ lại có `Ma goc` từ sheet QC | 1 |

## 3b. 🔴 Mã case GIỮ NGUYÊN `Vantai_N` — cố ý

Phân hệ này dùng **mã gốc của file xlsx làm mã case** (`Vantai_1` … `Vantai_96`), khác quy ước
`<phân hệ>_<task>_<STT>` của các phân hệ khác. Lý do: **73 spec đã có đang gọi đúng các mã đó**;
đổi mã là cắt liên kết tài liệu ↔ script và mọi case thành "mồ côi".

⚠️ Đã thử đổi sang `12-vt_<task>_<STT>` trong phiên này và lập tức mất liên kết 71 spec — đã hoàn lại.
Chỉ nhóm `070` (sheet QC, chưa có script) dùng mã `12-vt_070_*`.

## 4. 🔴 Nối trực tiếp với phân hệ 04_3 (chuyển kho)

Nhóm `070` (sheet QC `FUNC_1_169`–`180`) mô tả **drawer tạo đơn vận chuyển từ phiếu chuyển kho**:

| Case gốc | Nghiệp vụ |
|---|---|
| `FUNC_1_174` | nhập **số tiền âm** ⇒ *"Số tiền mặc định là 0"* |
| `FUNC_1_176` | **nhận kho ghi nhận bồi thường** ⇒ số tiền ghi nhận mặc định = số tiền **giao thiếu** |
| `FUNC_1_177` `FUNC_1_179` | **chỉnh sửa số tiền ghi nợ** · **ghi nợ lần 2** ⇒ ghi vào công nợ đơn vị vận chuyển |
| `FUNC_1_180` | 🔴 **kho chuyển thiếu ⇒ CỘNG LẠI tồn kho chuyển** |

`FUNC_1_180` là chốt chặn quan trọng: hàng chuyển thiếu **không được biến mất** — phải cộng lại tồn
kho gửi. Nối với `04_3_070_*` (chuyển kho đa cấp).

## 5. Phân loại: `READY_WITH_CODE_LOOKUP` 23 · `BLOCKED` 86 · case ghi **86**

## 6. Việc còn lại

1. 🔴 **Đối chiếu 58 script hiện có với kỳ vọng vừa dựng lại.** Script viết theo tài liệu cũ (vốn lấy
   từ chính script) nên có thể đang assert sai mà không ai biết. Đây là việc **quan trọng nhất** của
   phân hệ này.
2. User quyết chỗ đặt `don_vi_van_tai.xlsx` (mục 2).
3. Xin đơn vị vận chuyển dựng riêng cho nhóm `040` `050` (case tiền).
