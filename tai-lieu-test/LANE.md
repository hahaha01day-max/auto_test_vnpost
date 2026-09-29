# LÀN (lane) — nhiều phiên viết/chạy auto test cùng lúc không giẫm nhau

## Vì sao cần

Hai phiên chạy test cùng lúc giẫm nhau ở ba chỗ, và cả ba đều **sai im lặng**:

| Chỗ giẫm | Triệu chứng |
|---|---|
| Cùng **tài khoản**: hệ thống xoay vòng refresh token | phiên kia test treo ở `waitForResponse`, trông như lỗi locator |
| Cùng **`.auth/<vai>.json`** | test chạy với session của phiên khác, xanh nhầm |
| Cùng **sổ seed** `00_seed/seed-state.json` | bước seed sau đọc nhầm bộ dữ liệu của phiên khác |

## Một làn gồm gì

Đặt `VNPOST_LANE=<n>`, không cần sửa spec nào:

| Thành phần | Không có làn | `VNPOST_LANE=2` |
|---|---|---|
| File tài khoản | `.env` | `.env.lane2` nạp **trước**, đè `.env` |
| Session | `.auth/` | `.auth-lane2/` |
| Sổ seed | `00_seed/seed-state.json` | `00_seed/seed-state.lane2.json` |
| Tiền tố dữ liệu seed | `AUTO_` / mã `AUTO…` | `AUTO2_` / mã `AUTO2…` |
| Tài khoản | bộ chung | TCT · Tỉnh · CHT · GDV riêng (bước seed 3.3–3.6) |

Mã nguồn: `shared/config.js` (`LANE`), `00_seed/seed-state.js` (`FILE`, `PREFIX`, `PREFIX_MA`),
`00_seed/tests/03-tai-khoan-lan.tct.spec.js`.

## Làn đang có

| Làn | Bộ dữ liệu | Tài khoản |
|---|---|---|
| (chung) | `AUTO_` — `seed-state.json` | `.env` |
| 2 | `AUTO2_` — `seed-state.lane2.json` (23/09/2026, seed qua GIAO DIỆN — điểm bán thiếu quầy + 1 ca) | `.env.lane2` |
| 3 | `AUTO3_` — `seed-state.lane3.json` (23/09/2026, seed bằng API — đủ kho, 2 ca, quầy) | `.env.lane3` (seed 3.5 tự sinh — làn 3 chỉ có 4 vai: TCT · Quản lý tỉnh · CHT · GDV) |

## Dùng làn

Chạy MỌI lệnh với biến làn — thiếu biến là rơi về bộ chung:

```bash
VNPOST_LANE=2 rtk proxy npx playwright test --config tai-lieu-test/<NN>/playwright.config.js --project=<vai> -g "<CASE_ID>"
```

Luật cho phiên dùng làn:

1. 🔴 **Mỗi phiên một phân hệ.** `test-output/` nằm trong thư mục phân hệ, hai phiên cùng phân hệ đè kết quả.
2. 🔴 **Không sửa file dùng chung** (`shared/`, `_CHECKLIST.md`, `_VIEC_CAN_LAM.md`, skill) khi phiên khác đang chạy — cần sửa thì báo phiên kia trước.
3. 🚫 **Không chạy `tool/bin/seed-fill-input.js` trong làn** — nó ghi giá trị của sổ vào `test-input.json` dùng chung của phân hệ, làn khác đọc trúng dữ liệu `AUTO2_`. Spec đọc sổ lúc chạy (`doc()` của `00_seed/seed-state`) thì tự theo làn.
4. `VNPOST_SETUP_ROLES` trong `.env.lane<n>` chỉ liệt kê vai **của làn** — bước setup đăng nhập mọi vai trong danh sách, lọt một tài khoản chung là giẫm phiên khác.

## Tạo làn mới (vd làn 4) — bằng API, ~2 phút

Dữ liệu và tài khoản seed **không xoá được** — chỉ tạo làn khi thật sự có thêm phiên chạy song song.

1. `.env.lane4` chỉ một dòng chú thích (bước 1–3 đăng nhập TCT **chung**) — báo các phiên khác đừng chạy vai `tct` ~1 phút.
2. `VNPOST_LANE=4 node tool/bin/seed.js --api --buoc=1`, `--buoc=2`, `--buoc=3`.
   Bước 3 tạo **một tài khoản cho mỗi vai trò trong DB** (danh mục `00_seed/vai-tro.json`, 11 vai) và **tự ghi `.env.lane4`** (seed 3.99).
3. `VNPOST_LANE=4 node tool/bin/seed.js --api` — bước 4–8 chạy bằng TCT riêng của làn.
4. Thử đăng nhập: `VNPOST_LANE=4 rtk proxy npx playwright test --config tai-lieu-test/00_seed/playwright.config.js --project=setup`.
5. Thêm một dòng vào bảng "Làn đang có".

## Chạy toàn bộ trên nhiều làn MỚI — một nút

Tool → **Chạy song song** (`/song-song`) → nhập số làn (mặc định 8) → **Seed + chạy**.
CLI tương đương: `node tool/bin/luot-song-song.js --so-lan=8` (thêm `--chi-chua-chay` để chỉ chạy case chưa có kết quả).

1. Dựng N làn **mới** (số tiếp theo chưa dùng): bước 1–3 nối tiếp từng làn (TCT chung), bước 4–8 + bổ sung
   (9–19) song song 4 làn. Làn thiếu dữ liệu bắt buộc (nền + `caLamViec`) bị **loại** khỏi lượt.
2. `tool/bin/chay-song-song.js` chia việc theo **file spec** (dài trước, làn rảnh lấy tiếp); nhóm cấu hình dùng
   chung của chuỗi (`07_*`, `31`, `32`) chạy nối tiếp trên làn đầu. 🚫 Không cắt nhỏ trong một file spec —
   `describe.serial` phụ thuộc nhau.
3. Mỗi việc ghi `results.json` / báo cáo html / artifact riêng ở `<phân hệ>/test-output/song-song/<lượt>/<file>.lane<n>/`,
   xong là ghi CSV ngay (`cap-nhat-trang-thai.js --ket-qua=…`), cuối lượt sinh lại `_CHECKLIST.md`.

🔴 Độ chính xác là ưu tiên: mỗi lượt dùng dữ liệu MỚI, 🚫 dùng lại làn cũ (lượt trước đã tiêu hàng, chốt kỳ tồn).
🔴 Trần ~8 làn trên máy 10 CPU / 24 GB. Nhóm POS cần chạy trong 05:00–23:45 (giờ ca seed).
