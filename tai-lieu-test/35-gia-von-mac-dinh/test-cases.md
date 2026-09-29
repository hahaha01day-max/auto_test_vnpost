# 35 — Giá vốn mặc định · trace và phân loại

> Viết 19/09/2026. Trước phiên này phân hệ **chưa có `test-cases.md`** (Nhóm A mục 5b của
> `HANDOFF_tai_lieu_test_case.md`) — script đã có và đã chạy, nhưng tài liệu rỗng.
> Bổ sung **41 case** (20 → **61**).

## 1. Đã xử lý 3 case mồ côi

Checklist trước phiên báo `35-gia-von-mac-dinh` có **2 case mồ côi** (spec có mã mà CSV chưa khai).
Truy ra là **ba** mã nhóm bằng chứng, nay đã khai vào CSV:

| Mã | Spec | Việc |
|---|---|---|
| `BC-01` | `bang-chung.tct.spec.js:17` | Menu Cấu hình có mục "Giá vốn mặc định" |
| `BC-02` | `bang-chung.tct.spec.js:30` | Màn thêm sản phẩm có ô "Phương pháp tính giá vốn" |
| `BC-03` | `bang-chung-api.tct.spec.js:10` | Ghi lại phản hồi 4 API đọc |

Sau khi khai, `node tool/bin/checklist.js` báo **0 case mồ côi** trên toàn bộ 48 phân hệ.

## 2. Phủ sheet QC

**38 case gốc mới dựng** (`GVMD-100`–`GVMD-154`), chia theo bốn phương pháp tính giá vốn:

| Nhóm mã | Phương pháp | Case gốc |
|---|---|---|
| `GVMD-100`–`103` | Thực tế đích danh | `FUNC_1_416`–`419` |
| `GVMD-110`–`133` | Giá tiêu chuẩn | `FUNC_1_462`–`485` |
| `GVMD-140`–`144` | MAC (bình quân gia quyền) | `FUNC_1_486`–`490` |
| `GVMD-150`–`154` | FIFO | `FUNC_1_491`–`495` |

Độ phủ: **0/51 → 38/51**. 13 dòng còn lại 🚫 **không dựng** — xem mục 5.

| Nhãn | Case |
|---|--:|
| `READY` | 20 |
| `READY_WITH_CODE_LOOKUP` | 3 |
| `BLOCKED` | 38 |

## 3. 🔴 Vì sao 38/61 case `BLOCKED` — và vì sao nhóm này nguy hiểm riêng một kiểu

Mọi case `GVMD-1xx` đều **ghi thẳng vào tồn kho và giá vốn thật**. Điểm khác biệt so với các
phân hệ khác: **giá vốn sai thuộc nhóm SAI IM LẶNG**. Không có thông báo lỗi, không có phiếu đỏ —
compile xanh, màn hình vẫn hiện số, báo cáo vẫn ra số, chỉ là **số sai**. Và nó lan:

- giá vốn sai → **lợi nhuận** của đơn sai;
- giá vốn sai → **trị giá tồn kho** sai → báo cáo lãi lỗ và bảng cân đối sai;
- với MAC, một lần nhập sai giá làm **lệch vĩnh viễn** giá vốn của toàn bộ tồn còn lại, vì MAC
  bình quân lại theo mỗi lần nhập.

Muốn chạy nhóm này phải có **bộ sản phẩm rác chuyên dùng cho test, cấu hình đủ 4 phương pháp**
(đích danh / tiêu chuẩn / MAC / FIFO), kho riêng, không dính đơn hàng thật. Chưa có bộ đó thì
🚫 không bật `allowMutation` dù user đã cho phép ở phân hệ khác.

## 4. Trace — nhắc lại từ bộ cũ

Bộ 20 case cũ (`GVMD-001`–`021`) đã trace sẵn 4 API đọc:
`GET /system` · `GET /categories` · `GET /apply-jobs` · `GET /preview-apply`.
Xem chi tiết ở `BAO-CAO-KET-QUA.md` cùng thư mục.

⚠️ **Mã case giữ tiền tố `GVMD-`** dù thư mục đã đổi từ `14-gia-von-mac-dinh` sang
`35-gia-von-mac-dinh` (mục 5 handoff, 19/09/2026) — nên 🚫 không script nào phải sửa.

## 5. 🔴 13 dòng "Thẻ kho" bị ánh xạ NHẦM vào phân hệ này — cần user quyết

Mục 3 của `doi-chieu-tai-lieu-goc.md` còn 13 dòng "chưa dựng", nhưng chúng **không phải case của
phân hệ giá vốn**:

```
Tình huống · Kiểm tra hiển thị giao diện màn Thẻ kho · Kiểm tra bộ lọc Điểm bán/Kho
Kiểm tra tìm kiếm theo Tên sản phẩm · theo SKU · theo Barcode · Kiểm tra chọn khoảng thời gian
Kiểm tra số liệu Tồn đầu kỳ · Tổng nhập · Tổng xuất · Tồn cuối kỳ
Kiểm tra dữ liệu trên bảng Thẻ kho · Kiểm tra phân trang
```

Ba dấu hiệu cho thấy đây là lỗi ánh xạ, không phải việc còn thiếu:

1. **Cột `Ma goc` chính là tên tình huống tiếng Việt**, không phải mã dạng `FUNC_1_xxx` — nghĩa là
   cột ID của khối này **bỏ trống** trong sheet, đúng cái bẫy đã ghi ở mục 8 câu 2 của handoff.
2. **Cột kỳ vọng rỗng hoàn toàn** ở cả 13 dòng.
3. **Nội dung là màn Thẻ kho** (tồn đầu kỳ / tổng nhập / tổng xuất / tồn cuối kỳ) — đó là nghiệp vụ
   của `04_5_quan_ly_ton_kho` hoặc báo cáo nhập xuất tồn, 🚫 không liên quan gì tới cấu hình
   phương pháp tính giá vốn.

Dòng đầu tiên mang tên **`Tình huống`** — đó là **dòng tiêu đề của bảng** bị parser nhận nhầm
thành một case.

**Cần user quyết:** chuyển khối này sang phân hệ đúng trong `tool/core/goc-mapping.js`, hay để
nguyên và ghi là ngoài phạm vi. 🚫 Tôi không tự sửa `goc-mapping.js` — đây là cùng loại quyết định
với câu 24 mục 6b của handoff (`FUNC_DOITRA__26`–`30` khớp nhầm về phân hệ `20`).

Trong lúc chờ, mục 3 của báo cáo đối chiếu sẽ vẫn hiện "chưa dựng 13" — **đó là con số đúng của
tình trạng ánh xạ hiện tại**, không phải việc còn bỏ dở.

## 6. Lỗ hổng đặc tả khác

1. **`FUNC_1_468` và `FUNC_1_469` là cặp case quan trọng nhất của nhóm Giá tiêu chuẩn:** nhập từ NCC
   giá thấp hơn **và** cao hơn giá tiêu chuẩn đều phải ghi nhận bằng **giá tiêu chuẩn**. Nếu code
   ghi theo giá NCC thì đó là lỗi giá vốn im lặng. `GVMD-116`/`GVMD-117` dựng riêng hai chiều,
   🚫 không gộp thành một case.
2. **Sheet QC chốt cứng con số** trong kỳ vọng (`120.000`, `110.000đ/cái`, `trừ 5 cái`). 🚫 Không
   chép vào case — số phụ thuộc dữ liệu nền. Đã viết lại thành **công thức** (`GVMD-140`: MAC mới =
   (giá trị tồn cũ + giá trị nhập mới) / (số lượng tồn cũ + số lượng nhập mới)), đúng luật 4.3
   của handoff.
3. ⚠️ **Nhóm bán âm (`GVMD-123`, `GVMD-124`, `GVMD-144`, `GVMD-154`) chạm đúng vùng đã có tiền lệ
   lỗi** trong memory dự án: giá vốn khi tồn âm / không còn lô là **câu hỏi treo số 7** mục 6b của
   handoff, lặp ở ba phân hệ `04_3` `04_4` `07_2`. Nay là **phân hệ thứ tư** hỏi cùng câu:
   *giá vốn lấy ở đâu khi tồn âm?* Sheet QC chỉ nói *"ghi nhận theo MAC tại thời điểm bán"* mà
   không nói MAC của cái gì khi kho rỗng.

<!-- PHU-LUC-CHUA-RO -->

## Phụ lục — 🔴 Case CHƯA CHỐT kỳ vọng

> 🤖 **Sinh tự động — 🚫 đừng sửa tay.** Chạy lại: `node tool/bin/case-chua-ro.js`
> Quét `test-cases.csv` tìm mọi case có kỳ vọng còn chứa *"ghi lại hành vi thật"*,
> *"chưa chốt được"*, *"cần user quyết"*, *"ghi lại nguyên văn"*.
> 🔴 **Đây là những case KHÔNG được coi là đã xong.** Chạy chúng chỉ để *quan sát*,
> 🚫 không để kết luận pass/fail — kỳ vọng chưa có thì 🚫 không có gì để so.

| Mã case | Case | Vướng gì | Kỳ vọng hiện tại (rút gọn) |
|---|---|---|---|
| `GVMD-126` | Chặn chuyển kho khi tồn bằng 0 | Thiếu nguyên văn thông báo | Hệ thống cảnh báo không đủ tồn kho, không tạo phiếu. Ghi lại nguyên văn thông báo |
| `GVMD-127` | Chặn chuyển kho khi tồn âm | Thiếu nguyên văn thông báo | Hệ thống chặn thao tác chuyển kho. Ghi lại nguyên văn thông báo |
| `GVMD-129` | Chặn xuất kho khi tồn bằng 0 | Thiếu nguyên văn thông báo | Hệ thống cảnh báo không đủ tồn kho. Ghi lại nguyên văn thông báo |
| `GVMD-132` | Chặn kiểm kho giảm khi tồn bằng 0 | Thiếu nguyên văn thông báo | Hệ thống chặn điều chỉnh giảm. Ghi lại nguyên văn thông báo |
| `GVMD-133` | Chặn kiểm kho giảm khi tồn âm | Thiếu nguyên văn thông báo | Hệ thống chặn điều chỉnh giảm tồn. Ghi lại nguyên văn thông báo |

**5/61 case** của phân hệ này chưa chốt được kỳ vọng.
