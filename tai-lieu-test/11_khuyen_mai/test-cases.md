# Kịch bản auto test — 11 Khuyến mại

- **Bổ sung 18/09/2026:** đối chiếu trọn sheet QC. **32 → 81 case.** Phủ **50/50** case gốc
  (trước đó 0). 🚫 Chưa có script.

## 1. Task

| Task | Nội dung | Số case |
|---|---|--:|
| `010`–`080` | **Khai báo CTKM**: danh sách · thêm/sửa · thông tin chung · theo đơn hàng · theo sản phẩm · phạm vi · nhóm đối tượng · điều kiện | 32 |
| `090` | 🔴 **Áp dụng CTKM theo ĐƠN HÀNG** trên POS | 9 |
| `100` | 🔴 **Giảm giá bán theo SẢN PHẨM** trên POS | 13 |
| `110` | 🔴 **CTKM theo DANH MỤC** trên POS | 11 |
| `120` | 🔴 **CTKM KẾT HỢP** nhiều chương trình cùng lúc | 15 |
| `130` | 🔴 **CTKM LOẠI TRỪ** | 1 |

## 2. 🔴 Nhóm `090`–`130`: kỳ vọng chuyển thể NGUYÊN VĂN từ sheet

49 case này **không phải case giao diện** mà là case **tính tiền**. Sheet QC ghi sẵn số liệu đầy đủ,
ví dụ `dong97`:

> Thêm sản phẩm ĐH 1 giá 100k, số lượng 5 ⇒ Tổng tiền đơn = 500k · áp CTKM *"Giảm 10% giá trị đơn"*
> ⇒ Tổng tiền **500.000** · Chiết khấu khuyến mãi **50.000** · Cần thanh toán **450.000**

⇒ Đã **chép nguyên văn** bước và kỳ vọng vào CSV thay vì diễn giải lại. 🚫 Không viết lại bằng lời
khác — số liệu là đặc tả.

## 3. Bốn biên tính tiền đáng chú ý trong nhóm `090`

| Case | Tình huống | Kỳ vọng |
|---|---|---|
| `11_090_005` (`dong101`) | giảm tiền cố định **đúng bằng** giá trị đơn (50k / đơn 50k) | Cần thanh toán = **0 đ** |
| `11_090_006` (`dong102`) | giảm tiền cố định **lớn hơn** giá trị đơn (50k / đơn 40k) | Chiết khấu bị **cắt về 40.000**, thanh toán = 0 đ |
| `11_090_008` (`dong104`) | giảm giá **kèm quà tặng** | quà hiện ở **cuối bill**, số lượng 1, **không có giá**, có tag *"Quà tặng"*, phía trên ghi tên CTKM |
| `11_090_009` (`dong105`) | quà tặng **hết hàng** | message *"Số lượng trong kho không đủ"* + popup liệt kê tên SP, tồn, số vượt ⇒ **KHÔNG lưu đơn** |

🔴 `dong103` **TRỐNG cột tình huống** trong sheet (chỉ có bước và kỳ vọng: giảm 5% sau CT khác ⇒
chiết khấu 25.000, thanh toán 475.000). Đã ghi rõ trong kỳ vọng case.

## 4. Nhóm `120` — thứ tự tính là gốc của mọi sai số

Sheet phân biệt rõ ba loại chiết khấu **tính tuần tự**: KM **Sản phẩm** (dòng) → KM **Danh mục** →
KM **Đơn hàng**. Hai case đáng chú ý nhất:

- `dong140` `dong142`: KM sản phẩm / danh mục **làm tổng đơn tụt xuống dưới ngưỡng tối thiểu** của
  KM đơn hàng ⇒ KM đơn hàng có còn áp không?
- `dong146`: đơn thoả **2 CTKM đơn hàng** ⇒ hệ thống tự chọn **CTKM có lợi nhất cho khách**.

## 5. Bẫy đã biết của repo áp vào phân hệ này

| Bẫy | Ảnh hưởng |
|---|---|
| 🔴 **Dòng tặng kèm từng CHẶN phiếu xuất kho** | mọi case nhóm `100` có quà tặng phải kiểm phiếu xuất sinh đủ |
| **Doanh thu tính TRƯỚC VAT** | số trên bill ≠ số vào báo cáo doanh thu |
| **Hàng ký gửi KHÔNG áp CTKM** | nếu CTKM áp được cho hàng ký gửi là lỗi |
| **Danh mục đọc từ `CHAIN_PRODUCTS`** | 🚫 cấm `SHOP_PRODUCTS` |
| **Báo cáo CTKM đang có bẫy dữ liệu** | đối chiếu số ở phân hệ `30_bao_cao_ctkm` phải biết trước |

## 6. Phân loại: `READY_WITH_CODE_LOOKUP` 17 · `BLOCKED` 64 · case ghi **62**

🔴 Toàn bộ nhóm `090`–`130` để `enabled:false`: phải **mở ca, tạo đơn và thanh toán thật** mới đo
được chiết khấu. Không có cách nào đo bằng đọc.

## 7. Dữ liệu nền cần dựng

Sheet dùng **tên CTKM và mã cố định**, phải dựng đúng mới chạy được:
- CTKM: *"Giảm 10% giá trị đơn"* · *"Giảm 50k giá trị đơn"* · *"Giảm 5% sau CT khác"* ·
  *"Giảm 1% tặng SP"* · *"Giảm 1k tặng SP hết hàng"* · `PRO_1`…`PRO_6` · `PROMOTE_3` `PROMOTE_4` `PROMOTE_6`
- Sản phẩm: *ĐH 1* (100k) · *ĐH 2* (25k) · *Bánh mỳ* (20k) · *Combo B* (120k) · *SP A* · *SP B* (hết hàng)
- Danh mục: `dM_A_1` · `dM_B_…` · `dM_CO…`

## 8. Việc còn lại

1. Dựng bộ dữ liệu nền ở mục 7 — không có nó thì 49 case tính tiền vô nghĩa.
2. Xin điểm bán dựng riêng cho nhóm `090`–`130` (phải thanh toán thật).
3. Bổ sung nội dung cho `dong103` (case gốc trống cột tình huống).

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/11_khuyen_mai/playwright.config.js
```

**81/81 case có script.** Lượt chạy: **19 đạt · 0 đỏ · 62 skip**.

### Trace đã có — 🚫 đừng tra lại

| Thứ | Giá trị |
|---|---|
| Route | **`/promotion/campaign`** (link menu *"Danh sách chương trình"*) |
| Tiêu đề màn | **"Quản lý chương trình khuyến mại"** |
| API danh sách | `GET /marketing/campaign/v2/list` — **marketing-service** |
| API phụ | `GET /loyalty/api/v1/customer-group/get-list` (nhóm đối tượng) |
| Ô tìm | `Tìm kiếm theo mã, tên` |
| Khoảng ngày | `Bắt đầu` / `Kết thúc (để trống = vô thời hạn)` — là **RangePicker**, phải chọn đủ hai mốc |
| Cột | Tên chương trình · Hình thức khuyến mại · Loại khuyến mại · Trạng thái · Đối tượng áp dụng · Thời gian hiệu lực · Thao tác |
| Nút | **"Thêm mới chương trình"** |

### 62 case chưa chạy

- **49 case của vai `gdv`**: toàn bộ luồng **áp CTKM khi bán hàng tại quầy** — đó là bán hàng thật,
  ghi đơn thật, trừ tồn thật ⇒ `allowMutation: false`.
- **9 case** cần vào sâu thẻ *Đối tượng* / *Điều kiện* bên trong màn Thêm/Sửa CTKM — 🚫 chưa probe
  được đường đi ổn định, 🚫 không đoán locator.
- 4 case ghi khác của vai `tct`.
