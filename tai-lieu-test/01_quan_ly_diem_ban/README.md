# 01 — Quản lý điểm bán

Nguồn: `resource/hdsd/hdsd01_quan_ly_diem_ban/` — 8 task.

**134 test case** · đã có script **134/134** (hoàn thiện 19/09/2026).

- 50 case khớp sheet QC `uat_vnpost_quan_ly_diem_ban_hub.csv` (54 case gốc − 4 bản trùng trong sheet)
- 24 case bổ sung từ HDSD
- **60 case bổ sung 18/09/2026 từ quét kỹ thuật mục 3.4** của skill `test-scenario`, gồm 13 case cho
  màn **Thiết lập điểm bán** (task `090`) trước đó không có case nào.

🔴 Đọc `test-cases.md` trước khi viết script: ở đó có bảng route/API trace từ code, **bảng 9 ô bắt
buộc thật của form** (nhiều hơn HDSD), danh sách 15 case `BLOCKED` kèm lý do và 38 case ghi dữ liệu.

🔴 Sheet `uat_vnpost_mo_hinh_to_chuc.csv` **không còn thuộc phân hệ này** (quyết định user 18/09/2026)
— tạo điểm bán từ màn Mô hình tổ chức là luồng riêng, thuộc `32_mo_hinh_to_chuc`.

Nguồn: `01_quan_ly_diem_ban.csv` (Sheet QC, giữ nguyên) + 8 file task HDSD.
Cột `Ma goc` trong `test-cases.csv` giữ mã `DIEMBAN__N` để tra ngược.

## Kết quả chạy task 010 (localhost:3100)

12 pass · 6 skip · 0 fail. Sáu case skip do môi trường chỉ có 3 điểm bán, không có Pos mini,
không có điểm bán Tạm ngừng, không điểm bán nào có nhân viên — cần môi trường nhiều dữ liệu hơn.

## Kết quả chạy 19/09/2026 (nhóm CHỈ ĐỌC, `--grep-invert "GHI DỮ LIỆU THẬT"`)

```bash
cd auto_test_vnpost
npx playwright test --config tai-lieu-test/01_quan_ly_diem_ban/playwright.config.js \
  --project=tct --project=province --project=shop --grep-invert "GHI DỮ LIỆU THẬT"
```

🔴 **`01_090_003` ĐỎ CÓ CHỦ Ý — lỗi sản phẩm, 🚫 đừng "sửa test cho xanh".**
Wizard Thiết lập điểm bán khai `accept=".xlsx,.xls"`, nhưng `accept` chỉ lọc hộp chọn file của
trình duyệt; `beforeUpload` KHÔNG kiểm đuôi file, nên file `.pdf` / `.csv` kéo–thả vào vẫn được
gửi lên `POST /opening-balance/uploads`. Script đã chặn ở tầng mạng nên lần chạy sau không đẩy
rác lên môi trường thật.

## 🔴 Bẫy đã trả giá, đừng vấp lại

1. **`page.goto` trần là mất phiên.** App giữ access token trong RAM, chỉ có `refreshToken` ở cookie
   và hệ thống xoay vòng nó, nên `.auth/<vai>.json` chỉ dùng được cho test ĐẦU TIÊN của vai đó.
   Phải mở bằng `moTrang(page, url, vai)`. Triệu chứng khi sai: `waitForResponse` treo hết timeout,
   KHÔNG báo "chưa đăng nhập" — rất dễ tưởng locator sai.
2. **`input[placeholder*="..."]` không bắt được Select của antd v6** — placeholder render vào `<div>`,
   `<input>` bên trong có placeholder rỗng. Bám theo container hàng lọc + thứ tự.
3. **`.ant-select-dropdown:visible` bắt nhầm dropdown của Select khác** (antd giữ dropdown cũ trong DOM).
   Phải lần theo `aria-controls` → rồi đi NGƯỢC LÊN `.ant-select-dropdown` bọc ngoài; chính phần tử
   `aria-controls` trỏ tới luôn `hidden`.
4. **`waitForResponse` xong không có nghĩa bảng đã vẽ lại.** Đếm dòng ngay là đếm dữ liệu cũ →
   case không skip, rồi giữa chừng bảng rỗng và đỏ với lý do sai. Dùng `settleTable`.
5. **Drawer antd v6 chỉ có `.ant-drawer-open`**, không có `.ant-drawer-content` lồng trong.
6. **Nút `.ant-select-clear` chỉ hiện khi hover** — bấm thẳng không nổ request.
7. **Backend tìm kiếm theo TỪ, không theo chuỗi con**: tìm "hub tỉnh lý" trả về cả điểm bán thuộc
   "Bưu điện tỉnh Lý Sơn". Đừng assert "mọi dòng chứa nguyên văn từ khoá".
8. **antd v6 để giá trị đã chọn của Select ở `.ant-select-content-has-value`**, KHÔNG ở
   `.ant-select-selection-item`. Bám nhầm thì locator luôn rỗng ⇒ `toHaveCount(0)` kiểu "ô lọc đã
   sạch" XANH GIẢ, đúng cả khi ô vẫn còn nguyên giá trị. Dùng `selectValue()` của `shop-page.js`.
9. **`allInnerTexts()` KHÔNG chờ.** Đọc `.ant-form-item-explain-error` ngay sau khi bấm Xác nhận là
   đọc lúc antd chưa vẽ thông báo ⇒ mảng rỗng, case đỏ với lý do sai. Bọc trong `expect.poll`.
10. **Thân form drawer Thêm/Sửa chỉ render sau khi `orgLevel` vào state.** Đọc nhãn ngay sau cú click
   chọn Cấp thì chỉ thấy `['Cấp']`. Với assertion dạng `.not.toContain(...)` đây là XANH GIẢ —
   phải `choThanFormVe(drawer)` trước.
11. **Cột "Số lượng nhân viên" và danh sách phân công trong drawer do API RIÊNG đổ vào**, tới sau
   khi bảng/drawer đã vẽ và `settleTable` đã trả về. Đếm ngay là đếm 0 ⇒ skip sai lý do
   "môi trường không có nhân viên". Dùng `firstRowWithEmployee()` (đã tự poll) và chờ nút ✕ hiện ra.
12. **RTK Query phục vụ lại từ CACHE khi bộ lọc quay về tổ hợp đã gọi trước đó** — bước "xoá hết
   lọc" không sinh request nào, `reloadBy` treo hết timeout. Đo trạng thái cuối bằng màn hình
   (tổng số + ô lọc đã sạch), không bằng query string của "request cuối".
13. **Vai `province` VẪN có `create_shop`** (thấy đủ 3 nút Nhập/Xuất/Thêm). Vai thiếu quyền thật là
   `shop` (chtls01): vùng extra rỗng hoàn toàn. Case `01_010_028` vì vậy chạy bằng `shop`.
14. **Vai `province` KHÔNG có nút Gắn nhân viên** (PermissionButton ẩn hẳn) — case về Hub phải chạy
   bằng `tct`, chạy bằng `province` là kiểm nhầm: không thấy nút vì thiếu quyền, không phải vì là Hub.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Tra cứu và lọc danh sách điểm bán | `01_010_001` … | — |
| `020` | Thêm điểm bán hoặc hub mới | `01_020_001` … | — |
| `030` | Sửa thông tin điểm bán | `01_030_001` … | — |
| `040` | Tạm ngừng hoặc khôi phục hoạt động điểm bán | `01_040_001` … | — |
| `050` | Gắn nhân viên và vai trò cho điểm bán | `01_050_001` … | — |
| `060` | Cho nhân viên thôi việc tại điểm bán | `01_060_001` … | — |
| `070` | Nhập danh sách điểm bán từ Excel | `01_070_001` … | — |
| `080` | Xuất danh sách điểm bán ra Excel | `01_080_001` … | — |
| `090` | Thiết lập điểm bán (wizard Tồn đầu kỳ · Nhân viên · Xếp lịch) | `01_090_001` … | 13 |

## Cách điền

1. Đọc `resource/hdsd/hdsd01_quan_ly_diem_ban/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `01_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
