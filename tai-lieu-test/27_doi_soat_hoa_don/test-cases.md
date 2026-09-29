# Kịch bản auto test — 27 Đối soát hoá đơn

- Ngày dựng: **18/09/2026** · skill `test-scenario` · nguồn `hdsd27_doi_soat_hoa_don/tasks/*.md` (6 task)
- 🚫 Chưa viết script.

## 1. Route

HDSD ghi thẳng đường dẫn trong `man_hinh`:

| Màn hình | Route |
|---|---|
| Đối soát hoá đơn | `/supplier/invoice-reconcile` |
| Đối soát chi tiết | `/supplier/invoice-reconcile/detail` |

## 2. 🔴 Vai trong HDSD KHÔNG theo cấp đơn vị

Phân hệ này khai `vai_tro: [nhan_vien_mua_hang, ke_toan]` — **vai nghiệp vụ**, khác hẳn 5 vai theo cấp
(`gdv/shop/ward/province/tct`) mà bộ test đang dùng. 🚫 **Không tự map bừa.**
Tạm dùng `tct` cho toàn bộ và ghi rõ đây là **giả định cần user xác nhận**: tài khoản nào trong
`.env.accounts` đóng vai *nhân viên mua hàng* và *kế toán*?
⚠️ `27_060_00x` (hạch toán) chỉ khai `ke_toan`, `27_050_00x` chỉ khai `nhan_vien_mua_hang` — ranh giới
này **chưa test được** cho tới khi có tài khoản đúng vai.

## 3. Phân loại

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 3 |
| `BLOCKED` | 18 |

## 4. Case ghi dữ liệu — 🔴 chưa ai được phép chạy

`27_010_001` · `27_010_002` · `27_010_003` · `27_040_004` · `27_050_001` · `27_050_002` · `27_060_003`

🔴 **`27_060_003` hạch toán công nợ** là điểm không quay lại: HDSD nói rõ nút đổi nhãn và **không bấm
được nữa**, và **từ lúc đó phiếu nhập kho mới được phép thanh toán công nợ**. Đây là cửa mở dòng tiền.
🔴 `27_010_003` thay thế hoá đơn gốc làm **mất kết quả đối soát của hoá đơn cũ**.

## 5. Lỗ hổng đặc tả

- 🔴 **Không có tài khoản cho hai vai nghiệp vụ** (mục 2) — đây là blocker lớn nhất của phân hệ.
- Task 010 không nói **giới hạn dung lượng / số lượng tệp** mỗi lô upload.
- Task 060 không nói **ngưỡng dung sai** để coi là Khớp — cùng lỗ hổng với 14_3 và 16.

---

## 🔄 Cập nhật 19/09/2026 — hoàn thiện tài liệu

Bổ sung **14 case** (22 → **36**): phủ nốt 7 case gốc sheet QC (`NCC_170` `NCC_174` `NCC_175`
`NCC_182` `NCC_184` `NCC_187` `NCC_188`) cộng 7 case quét kỹ thuật mục 3.4.
Độ phủ sheet QC: **24/38 → 31/38, mục "chưa dựng" = 0** (7 case còn lại là bản **trùng trong chính
sheet**, công cụ đã trừ — 🚫 không dựng thêm, theo luật 4.2 của handoff).

Mã case mới dùng nhóm `070` / `071` vì các nhóm `010`–`060` và `PQ` đã dùng hết ở bộ trước.

| Nhãn | Case |
|---|--:|
| `READY` | 4 |
| `READY_WITH_CODE_LOOKUP` | 6 |
| `BLOCKED` | 26 |

`mutates` (đều `allowMutation: false`): `070_005` `070_006` `071_004` `071_005`.

### 🔴 Còn chặn — cần user quyết

1. **Câu hỏi số 3 mục 6 của handoff vẫn chưa có lời giải.** HDSD phân hệ này khai vai nghiệp vụ
   `nhan_vien_mua_hang` / `ke_toan`, **không phải 5 vai theo cấp** trong `.env.accounts`. Mọi case
   ở đây đang tạm gán vai `shop`. ⇒ **Ranh giới quyền giữa hai vai nghiệp vụ đó chưa test được**,
   và 🚫 không được coi là đã phủ.
2. **`NCC_187` chốt cứng giới hạn 9 ảnh + 1 xml** nhưng không nói nguồn con số. `070_006` giữ
   con số này theo sheet, cần xác minh từ code khi viết script.
3. **Ngưỡng dung sai khớp/lệch vẫn chưa có** — đã ghi ở mục 7 của handoff cho cả `14_3`, `16`, `27`.
   `070_007` chỉ kiểm **tổng các nhóm bằng số đã đối soát**, 🚫 chưa kiểm được việc phân nhóm
   khớp/lệch có đúng không.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `27_070_006` | Tải ảnh vượt giới hạn số lượng ở tab đối soát phiếu PO | Thiếu nguyên văn thông báo | Chỉ ghi nhận 9 ảnh và 1 file xml; phần vượt bị bỏ. Ghi lại nguyên văn thông báo nếu có |
| `27_070_008` | Danh sách phiếu đối soát rỗng | Thiếu nguyên văn thông báo | Hiện trạng thái rỗng, không lỗi kỹ thuật. Ghi lại nguyên văn dòng chữ trạng thái rỗng |
| `27_071_001` | Tìm phiếu bằng ký tự đặc biệt | Chờ chạy để lấy hành vi thật | Không lỗi 500; không trả về toàn bộ phiếu. Ghi lại hành vi thật |
| `27_071_004` | Tải lên tệp sai định dạng thay cho XML | Thiếu nguyên văn thông báo | Bị chặn, không thực hiện đối soát. Ghi lại nguyên văn thông báo |

**4/36 case** của phân hệ này chưa chốt được kỳ vọng.

---

## Kết quả chạy script (20/09/2026)

```bash
npx playwright test --config tai-lieu-test/27_doi_soat_hoa_don/playwright.config.js
```

**10 đạt · 2 hỏng · 27 chưa chạy.**

### Màn thật — đo từ DOM (`/supplier/invoice-reconcile`)

Tiêu đề `Đối soát hoá đơn PO`; 2 thẻ `Theo hoá đơn` · `Theo phiếu PO`;
cột `Mã PO · Hoá đơn · Nhà cung cấp · Mã số thuế · Nguồn · Ngày phát hành · Hạn thanh toán ·
Tổng tiền · File · Đối soát · Hạch toán · Thao tác`;
API `GET /__api/po-invoice-reconcile/invoices?page=&size=`;
bộ lọc `Mã PO, số HĐ, MST, NCC` + 2 cặp ngày + select `Trạng thái` + select `Nhà cung cấp`;
nút `Upload XML`, mỗi dòng có `Chi tiết` + `Đối soát`.

### 🔴 Đổi vai cho 8 case đọc/lọc — đã ghi lý do vào `test-input.json`

Vai `shop` mở màn được nhưng **mọi** lời gọi (`/po-invoice-reconcile/invoices` và
`/shops/<id>/supplier`) đều trả **401** ⇒ 0 dòng, 🚫 không có gì để kiểm. `27_070_001` · `27_070_002`
· `27_070_004` · `27_070_008` · `27_070_009` · `27_071_001` · `27_071_002` · `27_071_003` chuyển
sang vai `tct` (10 dòng thật). Phần phạm vi của vai `shop` giữ nguyên ở `27_PQ_001`.

### 🔴 Đã chạy và HỎNG

| Case | Đo được | Phân loại |
|---|---|---|
| `27_071_001` | Tìm bằng `%_` vẫn trả **đủ 10 dòng** như khi không lọc, trong khi `27_071_002` (mã không tồn tại) trả 0 dòng ⇒ ô tìm **có** hoạt động, nhưng ký tự đại diện SQL **lọt xuống backend không được escape** | **Lỗi sản phẩm** — cùng họ `19_120_002` |
| `27_PQ_001` | Vai `shop` **KHÔNG bị chặn** khỏi màn: vào được, mọi lời gọi 401, bảng trống **không kèm thông báo nào**. Kịch bản chỉ đặc tả hai kết cục *"bị chặn"* hoặc *"API trả lỗi phân quyền có thông báo"* | **Lệch đặc tả / trải nghiệm** — người dùng tưởng chưa có phiếu |

### Đã chạy và đạt

`27_070_001` bố cục + đủ cột · `27_020_002` ô Trạng thái có `Khớp · Lệch · Chưa đối soát` ·
`27_070_002` lọc nhà cung cấp đi vào query · `27_070_004` phân trang · `27_070_008` trạng thái rỗng ·
`27_071_002` mã không tồn tại · `27_071_003` xoá bộ lọc trở về đúng số dòng ban đầu.

`27_070_009` skip có lý do: chọn trạng thái **không sinh lời gọi mới** (màn lọc phía client) nên
🚫 không đo được "điều kiện có vào query" cho tổ hợp lọc.

### Chưa chạy — có lý do

26 lượt còn lại: `mutates` (đối soát, hạch toán, upload XML = ghi vào sổ kế toán) hoặc thiếu dữ liệu
nền. Lý do nguyên văn trong `test-input.json`.
