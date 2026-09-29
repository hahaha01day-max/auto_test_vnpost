# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — 11 — Khuyến mại

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 11_khuyen_mai`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `11_khuyen_mai`
- Tài liệu gốc liên quan: [`uat_vnpost_ban_hang.csv`](../test-case-goc/uat_vnpost_ban_hang.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **50** |
| — trong đó **trùng lặp** trong chính sheet gốc | 1 |
| **Case gốc đã dựng** | **49** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **0** |
| Case đã dựng trong `test-cases.csv` | 81 |
| — **tài liệu gốc KHÔNG có** | 32 |

**Độ phủ tài liệu gốc: 98%**

## 2. 🔴 Case trùng lặp trong sheet gốc — 🚫 KHÔNG dựng thêm

So **toàn bộ** nội dung (tình huống, điều kiện, các bước, kết quả mong muốn), giống nhau từng ký tự.
Dựng thêm là chạy hai lần cùng một thao tác, làm độ phủ ảo và nhân đôi rủi ro ghi dữ liệu.

| Giữ lại | Bản trùng | Tình huống |
|---|---|---|
| `dong134` | `dong151` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm % |

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 0 case

✅ Không có. Toàn bộ case gốc (trừ bản trùng) đã được dựng.

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 32 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `11_010_001` | Mo danh sach chuong trinh khuyen mai | HDSD 010 |
| `11_010_002` | Kiem tra bo loc danh sach CTKM | HDSD 010 |
| `11_030_001` | Mo man Them moi CTKM | HDSD 030 |
| `11_030_002` | Validate khi luu CTKM rong | HDSD 030 |
| `11_030_003` | Kiem tra tab Thong tin chung | HDSD 030 |
| `11_030_004` | Kiem tra thoi gian ap dung | HDSD 030 |
| `11_030_005` | Kiem tra Theo don hang | HDSD 030 |
| `11_030_006` | Them chuong trinh khuyen mai dang luu nhap | HDSD 030 |
| `11_040_001` | Kiem tra Theo san pham - Giam gia ban | HDSD 040 |
| `11_040_002` | Kiem tra Theo san pham - Tang kem | HDSD 040 |
| `11_040_003` | Kiem tra Theo san pham - Mua gia thap | HDSD 040 |
| `11_050_001` | Mo cap nhat CTKM | HDSD 050 |
| `11_050_002` | Sua chuong trinh khuyen mai dang luu nhap | HDSD 050 |
| `11_050_003` | Kiem tra CTKM khong co action xoa tren UI hien tai | HDSD 050 |
| `11_060_001` | Kiem tra action dung/tiep tuc/bat dau | HDSD 060 |
| `11_070_001` | Kiem tra tab Pham vi ap dung | HDSD 070 |
| `11_070_002` | Mo danh sach doi tuong | HDSD 070 |
| `11_070_003` | Mo form them nhom doi tuong | HDSD 070 |
| `11_070_004` | Validate them nhom doi tuong rong | HDSD 070 |
| `11_070_005` | Kiem tra cac loai nhom doi tuong | HDSD 070 |
| `11_070_006` | Mo form sua nhom doi tuong | HDSD 070 |
| `11_070_007` | Them nhom doi tuong ap dung hop le | HDSD 070 |
| `11_070_008` | Sua nhom doi tuong ap dung vua tao | HDSD 070 |
| `11_070_009` | Xoa nhom doi tuong ap dung vua tao | HDSD 070 |
| `11_080_001` | Mo danh sach dieu kien | HDSD 080 |
| `11_080_002` | Mo form them dieu kien | HDSD 080 |
| `11_080_003` | Validate them dieu kien rong | HDSD 080 |
| `11_080_004` | Kiem tra cac loai dieu kien | HDSD 080 |
| `11_080_005` | Mo form sua dieu kien | HDSD 080 |
| `11_080_006` | Them dieu kien khuyen mai hop le | HDSD 080 |
| `11_080_007` | Sua dieu kien khuyen mai vua tao | HDSD 080 |
| `11_080_008` | Xoa dieu kien khuyen mai vua tao | HDSD 080 |

## 5. Bảng đối chiếu đầy đủ 50 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `dong97` | Kiểm tra mua sản phẩm áp dụng CT Giảm theo % | `11_090_001` |
| `dong98` | Kiểm tra mua combo áp dụng CT Giảm theo % | `11_090_002` |
| `dong99` | Kiểm tra mua sản phẩm áp dụng CT Giảm theo tiền cố định | `11_090_003` |
| `dong100` | Kiểm tra mua combo áp dụng CT Giảm theo tiền cố định | `11_090_004` |
| `dong101` | Kiểm tra Áp dụng CT Giảm theo tiền cố định đúng bằng giá trị đơn | `11_090_005` |
| `dong102` | Kiểm tra Áp dụng CT Giảm theo tiền cố định lớn hơn giá trị đơn | `11_090_006` |
| `dong103` |  | `11_090_007` |
| `dong104` | Kiểm tra Áp dụng CT giảm giá kèm quà tặng | `11_090_008` |
| `dong105` | Kiểm tra Áp dụng CT giảm giá kèm quà tặng hết hàng | `11_090_009` |
| `dong108` | Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo số tiền cố định | `11_100_001` |
| `dong109` | Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo % | `11_100_002` |
| `dong110` | Kiểm tra tự động áp dụng CTKM Giảm giá bán combo theo số tiền cố định | `11_100_003` |
| `dong111` | Kiểm tra tự động áp dụng CTKM Giảm giá bán combo theo % | `11_100_004` |
| `dong112` | Kiểm tra tự động áp dụng mức điều kiện số lượng lớn hơn trong cùng 1 sản phẩm của 1 CTKM | `11_100_005` |
| `dong113` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm khác (Mua A tặng A) | `11_100_006` |
| `dong114` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm trong danh mục khác theo số lượng | `11_100_007` |
| `dong115` | Kiểm tra tự động áp dụng CTKM Mua sản phẩm A được giảm giá cho sản phẩm B | `11_100_008` |
| `dong116` | Kiểm tra tự động áp dụng CTKM Giảm giá sản phẩm trong danh mục khác theo số lần đạt điều kiện | `11_100_009` |
| `dong117` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm danh mục khác (PROMOTE_4) | `11_100_010` |
| `dong118` | Kiểm tra tự động áp dụng CTKM Tặng kèm sản phẩm chỉ định theo số lượng (PROMOTE_3) | `11_100_011` |
| `dong119` | Kiểm tra tự động áp dụng CTKM Giảm giá sản phẩm thuộc danh mục khác (PROMOTE_3) | `11_100_012` |
| `dong120` | Kiểm tra tự động áp dụng CTKM Giảm giá cho sản phẩm khác chỉ định theo số lượng (PROMOTE_6) | `11_100_013` |
| `dong122` | Kiểm tra tự động áp dụng CTKM Giảm giá bán sản phẩm theo số tiền cho mỗi sản phẩm trong danh mục dM_A_1 | `11_110_001` |
| `dong123` | Kiểm tra tự động áp dụng CTKM Giảm giá theo % (hoặc theo cấu hình trên UI) cho mỗi sản phẩm trong danh mục dM_A_1 | `11_110_002` |
| `dong124` | Kiểm tra tự động áp dụng CTKM Mua sản phẩm danh mục A giảm giá sản phẩm trong danh mục B | `11_110_003` |
| `dong125` | Kiểm tra tự động áp dụng CTKM Mua sản phẩm danh mục A giảm giá sản phẩm trong danh mục B theo số lượng | `11_110_004` |
| `dong126` | Kiểm tra áp dụng CTKM danh mục A giảm giá sản phẩm danh mục B nhân theo số lần đạt điều kiện | `11_110_005` |
| `dong127` | Kiểm tra áp dụng CTKM Mua sản phẩm danh mục A được tặng sản phẩm danh mục B | `11_110_006` |
| `dong128` | Kiểm tra áp dụng CTKM Mua sản phẩm danh mục A tặng sản phẩm chỉ định | `11_110_007` |
| `dong129` | Kiểm tra áp dụng CTKM Giảm giá cho mỗi combo cùng danh mục | `11_110_008` |
| `dong130` | Kiểm tra áp dụng CTKM Mua danh mục combo A được giảm giá danh mục combo B | `11_110_009` |
| `dong131` | Kiểm tra áp dụng CTKM Mua danh mục A tặng quà danh mục B nhân theo số lượng | `11_110_010` |
| `dong132` | Kiểm tra áp dụng CTKM Mua danh mục A tặng quà chỉ định nhân theo số lượng | `11_110_011` |
| `dong134` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm % | `11_120_001` |
| `dong135` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định | `11_120_002` |
| `dong136` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm theo số tiền cố định và theo % | `11_120_003` |
| `dong137` | Kiểm tra Áp dụng cùng lúc CT giảm toàn đơn và CT giảm sau CT khác | `11_120_004` |
| `dong138` | Kiểm tra Áp dụng cùng lúc nhiều CT giảm sau CT khác | `11_120_005` |
| `dong139` | Kiểm tra áp dụng song song KM Sản phẩm và KM Đơn hàng độc lập | `11_120_006` |
| `dong140` | Kiểm tra KM Sản phẩm làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tối thiểu của KM Đơn hàng | `11_120_007` |
| `dong141` | Kiểm tra áp dụng song song KM Danh mục và KM Đơn hàng độc lập | `11_120_008` |
| `dong142` | Kiểm tra KM Danh mục làm giảm tổng tiền đơn hàng xuống dưới ngưỡng tối thiểu của KM Đơn hàng | `11_120_009` |
| `dong143` | Kiểm tra áp dụng đồng thời cả 3 loại: KM Sản phẩm, KM Danh mục và KM Đơn hàng trên cùng một đơn | `11_120_010` |
| `dong144` | Kiểm tra đồng thời nhận nhiều quà tặng từ KM Sản phẩm, KM Danh mục và KM Đơn hàng | `11_120_011` |
| `dong145` | Kiểm tra mua sản phẩm A giảm giá sản phẩm B kết hợp mua danh mục C giảm giá danh mục D | `11_120_012` |
| `dong146` | Kiểm tra giới hạn áp dụng: Đơn hàng thỏa mãn đồng thời 2 CTKM Đơn hàng nhưng chỉ áp dụng CTKM tốt nhất | `11_120_013` |
| `dong147` | Kiểm tra khách hàng thuộc nhóm VIP được hưởng KM VIP + mua sản phẩm đang có KM Sản phẩm cho mọi đối tượng | `11_120_014` |
| `dong148` | Kiểm tra KM Đơn hàng có điều kiện quà tặng (mua sản phẩm X) kết hợp bản thân sản phẩm X đang tham gia KM Sản phẩm | `11_120_015` |
| `dong150` | Kiểm tra CTKM giảm giá theo DM sản phẩm loại trừ CTKM theo đơn hàng | `11_130_001` |
| `dong151` | Kiểm tra Áp dụng cùng lúc nhiều CTKM giảm % | — **chưa dựng** |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_Viết 18/09/2026. Phủ 50/50 case gốc (trước đó 0), 32 → 81 case._

### 6.1 49 case gốc nằm ở sheet `uat_vnpost_ban_hang.csv`, không ở sheet khuyến mại

Nhóm *CTKM Theo đơn hàng* · *Giảm giá bán* · *CTKM Theo danh mục* · *CTKM kết hợp* · *CTKM loại trừ*
đều nằm trong **file bán hàng**, vì chúng đo chiết khấu **trên đơn bán ở POS**, không đo màn khai báo
CTKM. Ánh xạ trong `goc-mapping.js` đã đưa đúng về phân hệ `11`.

### 6.2 Đã chuyển thể NGUYÊN VĂN, không diễn giải lại

Sheet này ghi kỳ vọng **có số liệu đầy đủ** (Tổng tiền · Chiết khấu · Cần thanh toán, kèm công thức
`=500K*5%`). Đã chép nguyên văn cả bước và kỳ vọng vào CSV, chỉ thêm một dòng 🔴 nhắc bẫy của repo ở
cuối mỗi kỳ vọng. 🚫 Viết lại bằng lời khác là làm mất số — mà số chính là đặc tả ở đây.

### 6.3 `dong103` TRỐNG cột tình huống

Chỉ có bước (*giảm 5% sau CT khác*, đơn 500k) và kỳ vọng (*chiết khấu 25.000, thanh toán 475.000*),
không có tên tình huống. Đã đặt tên case theo nội dung bước và ghi rõ trong kỳ vọng là case gốc trống.
🚫 Không bỏ qua.

### 6.4 Ba biên tính tiền quan trọng nhất

- `dong101`: giảm tiền cố định **đúng bằng** giá trị đơn ⇒ thanh toán **0 đ**.
- `dong102`: giảm tiền cố định **lớn hơn** giá trị đơn ⇒ chiết khấu bị **cắt về bằng giá trị đơn**
  (40.000), không âm.
- `dong105`: quà tặng **hết hàng** ⇒ message *"Số lượng trong kho không đủ"* + popup liệt kê tên sản
  phẩm, tồn, số vượt, và **KHÔNG lưu đơn**. 🔴 Đây là case nối trực tiếp với bẫy *dòng tặng kèm chặn
  phiếu xuất kho* đã ghi nhận trong repo.

### 6.5 Nhóm `CTKM kết hợp` là nhóm khó nhất — thứ tự tính

`dong139`–`dong148` cho thấy hệ thống tính **tuần tự**: KM Sản phẩm (dòng) → KM Danh mục → KM Đơn
hàng. Hai câu hỏi đáng chú ý:

- `dong140` `dong142`: KM sản phẩm/danh mục làm tổng đơn **tụt dưới ngưỡng tối thiểu** của KM đơn
  hàng ⇒ KM đơn hàng còn áp không? Sheet có ghi số, nhưng logic cần xác nhận từ code.
- `dong146`: hai CTKM đơn hàng cùng thoả ⇒ hệ thống chọn **cái có lợi nhất cho khách**.

### 6.6 Dữ liệu nền là điều kiện tiên quyết

Sheet dùng **tên CTKM và mã sản phẩm/danh mục cố định** (`PRO_1`…`PRO_6`, `PROMOTE_3` `4` `6`,
`dM_A_1`, *ĐH 1*, *Combo B*, *SP B* hết hàng…). Không dựng đúng bộ này thì 49 case **không chạy được
và cũng không đối chiếu được số**. Đã liệt kê đủ ở `test-cases.md` mục 7.
