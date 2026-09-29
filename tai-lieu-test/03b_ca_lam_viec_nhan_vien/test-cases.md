# Kịch bản auto test — 03b Ca làm việc của nhân viên

- Dựng 18/09/2026 từ `resource/hdsd/hdsd03b_ca_lam_viec_nhan_vien/tasks/*.md` (5 task).
- **Bổ sung 18/09/2026:** trace API + nhãn thật từ code FE, quét 11 kỹ thuật mục 3.4. **19 → 48 case.**
  Phủ **23/23** case gốc sheet QC.
- 🚫 Chưa viết script.

## 1. Route và API — ĐÃ trace từ code (bản trước ghi "API chưa trace")

| Màn hình | Route | Component |
|---|---|---|
| Ca làm việc (cá nhân) | `/lich-ca-nhan/ca-lam-viec` | `features/timekeeping/pages/WorkShiftPage.jsx` |
| Thẻ ca trong ngày | — | `features/timekeeping/components/TodayShiftCard.jsx` |
| Phiếu in chốt ca | — | `features/timekeeping/components/ShiftClosePrintContent.jsx` |
| Chặn vào màn bán hàng | `/order/create-order` | `routes/helpers.js` — `checkOrderCreateAccessLoader` |

| Việc | Hook RTK Query · endpoint |
|---|---|
| Ca hôm nay của mình | `useGetTodayShiftsQuery` · `GET /timekeeping/schedule` |
| Chấm công đến / về | `useCheckinManualMutation` · `useCheckoutManualMutation` — `timekeeping/checkin-manual` · `checkout-manual` |
| Mở ca | `useOpenShiftMutation` · `POST /timekeeping/shift-report/open-shift` |
| Tạm chốt | `useDraftCloseShiftMutation` · `/timekeeping/shift-report/draft-close` |
| Chốt hẳn | `useFinalizeShiftMutation` · `/timekeeping/shift-report/finalize` (có `idempotencyKey`) |
| Mở lại ca | `useReopenShiftMutation` · `/timekeeping/shift-report/reopen` |
| Ca chưa chốt | `useGetUnclosedShiftsQuery` · `/timekeeping/shift-report/unclosed` |
| Báo cáo ca | `useLazyGetShiftReportDetailQuery` · `useLazyGetShiftSummaryQuery` · `/timekeeping/shift-report/summary` |

## 2. Bảng trạng thái × nút trên thẻ ca — mỗi ô là một case

| Điều kiện | Nút chấm công | Nút chính |
|---|---|---|
| Chưa chấm công, trong giờ cho phép | **Chấm công đến** | Mở ca (nếu không có ca nào đang mở) |
| Đang làm, trong giờ cho phép | **Chấm công về** | Mở ca / Chốt ca tuỳ phiên |
| Ngoài giờ cho phép | *(ẩn hẳn)* | *(ẩn nút Mở ca)* |
| Phiên đã mở, chưa tạm chốt | — | **Chốt ca** |
| Phiên đã tạm chốt | — | **Tiếp tục chốt** + Tag cam *"Phiên đang tạm chốt"* |
| Phiên đã chốt hẳn | — | **In chốt ca** (icon máy in) |
| Có ca khác đang mở chưa chốt | — | *(ẩn nút Mở ca — không cho mở song song)* |
| Nhiều hơn 1 ca và phiên đã mở | — | thêm nút **Xem báo cáo** |

Nhãn trạng thái: **Chưa bắt đầu** (xám) · **Đang làm** (xanh lá) · **Đã về** (xanh dương).

🔴 **Bẫy sai im lặng:** `isWithinTimekeepingWindow` **trả `true` khi ca thiếu giờ bắt đầu/kết thúc**
("Thiếu cấu hình giờ → trả true (không chặn)") ⇒ ca khai thiếu giờ thì mọi ràng buộc thời gian mất
tác dụng mà không cảnh báo gì. Case `03b_010_009`.

## 3. Chốt ca — luồng hai bước, đúng nghiệp vụ "chốt ca mù"

| Bước | Drawer hiện gì |
|---|---|
| Trước tạm chốt | Nhân viên · Ca làm việc · Quầy thu ngân · Thời gian mở · **Tiền mở ca**, cộng khối *"Số lượng tờ theo từng mệnh giá"* để tự đếm. 🔴 **KHÔNG có Tiền dự kiến, không có Chênh lệch.** |
| Sau tạm chốt | thêm đúng 3 dòng: **Tiền dự kiến** · **Tiền thực tế** · **Chênh lệch** (đỏ khi ≠ 0, xanh khi = 0), và dòng **Xử lý chênh lệch** = *"Chuyển quản lý điểm bán duyệt sau khi chốt ca"* |

Ô ghi chú đổi theo tình trạng lệch: lệch = 0 ⇒ nhãn *"Ghi chú"*, không bắt buộc; lệch ≠ 0 ⇒ nhãn
*"Giải trình chênh lệch"*, bắt buộc, lỗi *"Vui lòng nhập lý do chênh lệch"*, kèm mô tả *"Chốt ca xong,
nội dung này thành phiếu chênh lệch gửi quản lý điểm bán duyệt. Ca vẫn kết được ngay, không phải chờ
duyệt."*

Thông báo: *"Đã mở ca"* · *"Đã tạm chốt ca — vui lòng kiểm tra đối soát tiền mặt"* · *"Đã chốt ca"* ·
*"Đã mở lại ca"* · *"Đã chốt ca cũ — tiếp tục mở ca mới"*.

Phiếu in **tách hai khối chênh lệch**: *"Chênh lệch đầu ca (nhận bàn giao so với sổ quỹ)"* và
*"Chênh lệch cuối ca (thuộc trách nhiệm ca này)"* — nhãn đã được sửa vì người ký không phân biệt được
hai thứ. 🚫 Đừng chấp nhận nhãn cũ.

## 4. 🔴 Danh sách SỐ ĐIỆN THOẠI BỎ QUA phép chặn ca — bẫy PASS GIẢ

`routes/helpers.js` hardcode **8 số điện thoại** (`bypassPhones`) được **bỏ qua toàn bộ** phép chặn
"phải mở ca mới bán hàng được".

⚠️ **Hệ quả cho test:** nếu số điện thoại của tài khoản test nằm trong danh sách đó thì `03b_060_001`
và `03b_060_002` **PASS GIẢ** — không thấy hộp thoại vì được bỏ qua, không phải vì logic đúng.
**Phải đối chiếu SĐT tài khoản test với danh sách trong code trước khi chạy.** Case `03b_060_003` vừa
là case kiểm vừa là phiếu báo: cơ chế này nên chuyển thành cấu hình.

Phép chặn cũng **chỉ áp cho cấp điểm bán** (`isShopLevel`) — cấp tỉnh/TCT `return true` ngay
(`03b_060_004`).

## 5. Vai

Toàn bộ 5 task HDSD khai `[DIEM_BAN]` ⇒ vai `gdv`. 🔴 Đây là phân hệ của **người bán hàng**, 🚫 đừng
chạy bằng `shop` cho tiện — sẽ ra pass giả ở nhóm phạm vi. `03b_060_004` dùng `province`.

## 6. Phân loại độ sẵn sàng

| Nhãn | Số case |
|---|--:|
| `READY_WITH_CODE_LOOKUP` | 13 |
| `BLOCKED` | 35 |

🔴 **Tỉ lệ BLOCKED cao nhất trong các phân hệ đã làm, và đó là bản chất của phân hệ này**, không phải
do làm tắt: mọi case đều cần **một trạng thái ca cụ thể tại thời điểm chạy** (chưa xếp ca / đã xếp
chưa mở / đang mở / tạm chốt / đã chốt / thiếu cấu hình giờ), mà trạng thái đó chỉ dựng được bằng
cách **mở ca và chốt ca thật** — tức ghi quỹ tiền mặt.

Ba loại lý do, đều ghi cụ thể trong `_blocked`:

1. **Ghi tiền thật** — nhóm `03b_030_*` `03b_040_*`.
2. **Thiếu dữ liệu / tài khoản nền** — cần nhân viên thứ hai cùng điểm bán (`03b_030_006`
   `03b_050_005`), cần ca thiếu cấu hình giờ (`03b_010_009`), cần biết SĐT tài khoản test
   (`03b_060_*`).
3. **Không đo được bằng Playwright trên web** — `03b_020_007` (phải chạy ở ba mốc giờ khác nhau),
   `03b_040_010` (phiếu in), `03b_070_001` `03b_070_002` (chế độ offline).

## 7. Case ghi dữ liệu — 🔴 23 case, chưa ai được phép chạy

Xếp theo mức khó cứu:

1. 🔴 **Chốt ca** (`03b_040_004`–`012`) — khoá số liệu ca và **ghi quỹ tiền mặt**; lệch quỹ sinh
   **phiếu chênh lệch chờ quản lý điểm bán duyệt**. Không hoàn tác được.
2. 🔴 **Mở lại ca** (`03b_040_011`) — gỡ khoá số liệu ca đã chốt, làm sai báo cáo chốt ca của quản lý.
3. 🔴 **Mở ca khi còn ca chưa chốt** (`03b_030_007`) — luồng này **tự chốt ca cũ**, tức chốt một ca
   mà người thật đang dùng.
4. **Chấm công** (`03b_020_001` `003` `005` `006`) — ghi vào bảng công của nhân viên, ảnh hưởng lương.

## 8. Lỗ hổng và mâu thuẫn đặc tả — 🚫 không tự sửa tài liệu

| # | Vấn đề |
|---|---|
| 1 | 🔴 **`dong26`: sheet đòi chặn chốt ca khi chưa đến giờ hết ca.** Code FE: nút "Chốt ca" chỉ phụ thuộc `isShiftStarted`, **không có phép kiểm giờ nào** — khác nút Chấm công và Mở ca vốn bị `canTimekeep` chặn. `03b_040_009` để đo, chờ user quyết. |
| 2 | 🔴 **`dong16` và `dong17` dùng CHUNG một thông báo.** Sheet đòi `dong16` báo *"Tài khoản chưa được xếp lịch làm việc"*; code hiện cùng hộp thoại *"Yêu cầu mở ca trước khi bán hàng"* cho cả hai. ⇒ Người chưa được xếp lịch bị bảo "hãy mở ca", mà họ không có ca nào để mở. |
| 3 | 🔴 **Hardcode 8 số điện thoại bỏ qua phép chặn ca** trong `routes/helpers.js`. Vừa là lỗ kiểm soát, vừa là bẫy pass giả cho test (mục 4). |
| 4 | 🔴 **`isWithinTimekeepingWindow` không chặn khi ca thiếu giờ** — sai im lặng, không cảnh báo. |
| 5 | **Task 040 không nói ngưỡng chênh lệch** nào cần duyệt thêm. Code: **mọi** mức lệch ≠ 0 đều bắt giải trình và đều chuyển quản lý duyệt, không có ngưỡng miễn. |
| 6 | **`dong34` `dong35` (offline mode + tự đồng bộ) không có trên `vnpost-web`** — FE web không xử lý `navigator.onLine`, không có chế độ offline. Nghiệp vụ thuộc **máy bán hàng / app POS**. Chỗ duy nhất nhìn thấy hệ quả trên web là cảnh báo *"đơn offline chưa về đủ (n/N)"* ở `03a_060_006`. |
| 7 | **Task 020 và 030 nói "hệ thống báo lỗi" mà không ghi nguyên văn.** Nay đã lấy đủ nguyên văn từ code cho các trường hợp có thông báo; `03b_020_003` `03b_030_003` vẫn cần xác nhận câu thật từ backend. |

## 9. Nối với phân hệ 03a

Ba case gốc `FUNC_NHANVIEN__42` `__44` `__45` ở **03a** chỉ đo được nửa "lưu cấu hình thành công".
Nửa còn lại — *hệ thống ghi nhận đúng giờ / đúng nhân viên được áp dụng* — quan sát ở **màn này**:

- Cấu hình *"Theo giờ bắt đầu và kết thúc ca"* ⇒ ô **Giờ đến / Giờ về** trên thẻ ca phải lấy giờ CA,
  không lấy giờ nhân viên bấm (đối chiếu `03b_020_005`).
- Cấu hình *"tự động chấm công"* ⇒ ô Giờ đến tự có mà nhân viên không bấm nút nào.

🔴 Chưa dựng case cho hai điều này vì cần **đổi cấu hình chấm công của cả điểm bán** (case ghi ở 03a,
`allowMutation: false`) rồi mới quan sát được ở 03b. Cần user cho một điểm bán dựng riêng để nối trọn
hai nửa.

## 10. Việc còn lại

1. Kiểm SĐT các tài khoản trong `.env.accounts` với `bypassPhones` — **làm trước tiên**, nếu không cả
   nhóm `03b_060_*` vô nghĩa.
2. Trình user mục 8, nhất là số 1, 2, 3.
3. Xin một điểm bán dựng riêng cho nhóm mở ca / chốt ca, và một tài khoản nhân viên thứ hai.
4. Viết script cho 13 case `READY_WITH_CODE_LOOKUP`.

## 🔴 Kết quả chạy script — 20/09/2026

```bash
npx playwright test --config tai-lieu-test/03b_ca_lam_viec_nhan_vien/playwright.config.js
```

Script: `tests/shift-card.js` (helper) + `ca-lam-viec.gdv.spec.js` + `chan-ban-hang.province.spec.js`.
**48/48 case có script.**

| Nhóm | Số case |
|---|--:|
| **Đã chạy và ĐẠT** | **2** — `03b_050_001` · `03b_PQ_001` |
| Đã chạy và hỏng | 0 |
| **Chưa chạy** | 46 |

### 🔴 CHẶN LỚN: không tài khoản nào có ca làm việc HÔM NAY

Đo 20/09/2026 trên cả hai vai có tài khoản:

| Vai | Màn `/lich-ca-nhan/ca-lam-viec` |
|---|---|
| `gdv` (`gdvls01`) | *"Chưa có ca làm việc hôm nay"* · còn **1 ca cũ chưa chốt** (Ca sáng · Quầy 01, mở 12/09/2026, tiền đầu ca 190.000đ) |
| `shop` (`chtls01`) | *"Chưa có ca làm việc hôm nay"* |

⇒ Mọi case đối chiếu **thẻ ca** (`010_001` `010_005` `010_006` `010_008` `020_002` `030_002`
`030_004` `030_008` `050_003`) đều **skip kèm lý do**, 🚫 không "pass rỗng".

🔴 **Việc user cần làm để mở khoá 9 case này:** xếp lịch làm việc **ngày chạy test** cho `gdvls01`
tại điểm bán 68056. 🚫 Auto test 🚫 không tự xếp — đó là ghi dữ liệu thật vào điểm bán đang chạy
(và `03b_030_007` cho thấy hệ thống có thể **tự chốt ca cũ** khi mở ca mới).

### Vì sao 23 case ghi vẫn để `allowMutation: false`

Mở ca / tạm chốt / chốt hẳn / mở lại ca ghi thẳng vào **quỹ tiền mặt thật** của quầy và sinh
**phiếu chênh lệch chờ quản lý duyệt**. 🚫 Không thao tác nào hoàn tác được. Script đã viết đủ,
bật công tắc là chạy — nhưng chỉ khi user xác nhận môi trường được phép ghi.
