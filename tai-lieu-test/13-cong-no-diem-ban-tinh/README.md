# Auto test — Công nợ điểm bán ↔ Bưu điện Tỉnh

Bộ kịch bản: [`test-cases.csv`](test-cases.csv) (máy đọc) · [`test-cases.md`](test-cases.md)
(trace route/API/nhãn + phân loại + lý do BLOCKED) · [`test-input.json`](test-input.json) (dữ liệu).

Nguồn nghiệp vụ: `.feature/công nợ điểm bán - tỉnh - tổng công ty/test_plan_cong_no_nghiep_vu.md`
và `huong_dan_test_luong.md` (bản 15/09/2026).

## Khai tài khoản theo vai — 🔴 làm trước tiên

Luồng này đi qua nhiều vai, **mỗi vai một tài khoản và một session riêng**. Chép phần cần dùng từ
`auto_test_vnpost/.env.accounts.example` vào `.env`:

| Vai | Biến bắt buộc | Dùng cho case |
|---|---|---|
| `province` | `VNPOST_ACCOUNT_PROVINCE`, `VNPOST_PASSWORD_PROVINCE`, `VNPOST_SCOPE_LABEL_PROVINCE` | phần lớn case |
| `shop` | `VNPOST_ACCOUNT_SHOP`, `VNPOST_PASSWORD_SHOP`, `VNPOST_SCOPE_LABEL_SHOP` | `CNDB-ND-007`, `CNDB-PQ-001` |

🔴 Thiếu tài khoản vai nào thì case của vai đó **skip kèm lý do**, 🚫 **không bao giờ tự pass** —
đọc kỹ dòng skip trước khi kết luận "đã test xong".

🚫 Đừng dùng một tài khoản quá quyền cho cả luồng: nó làm được cả hai đầu của nghiệp vụ vốn cố ý tách
hai bên (điểm bán khai ↔ Tỉnh duyệt), nên luồng chạy trót lọt trong khi lỗi phân quyền không lộ ra.

## Chạy

```bash
npm run test:cong-no:list          # liệt kê
npm run test:cong-no:province      # chạy các case vai Kế toán Tỉnh
npm run test:cong-no -- -g "CNDB-KY-001"   # chạy một case
```

Báo cáo HTML: `test-output/playwright-report/index.html`.

## 🔴 An toàn dữ liệu

`VNPOST_ALLOW_FINANCIAL_MUTATION=false` (mặc định) ⇒ mọi case ghi dữ liệu bị skip. 11 case đang
`BLOCKED`, trong đó **7 case không hoàn tác được** (ký nợ đầu kỳ, ký biên bản kỳ, xác nhận chuyến sinh
bút toán). Danh sách đầy đủ ở mục 3 của `test-cases.md`.

🚫 Không tự bật cờ để "chạy thử một lần cho biết".

## Trạng thái hiện tại (15/09/2026)

| Nhóm | Số case |
|---|---|
| Đã có script, chạy được khi khai tài khoản vai `province` | 4 (`CNDB-ND-001`, `CNDB-ND-002`, `CNDB-KY-001`, `CNDB-LPB-001`) |
| READY, **chưa có script** | 10 |
| BLOCKED | 11 |

Script: [`tests/cong-no.province.spec.js`](tests/cong-no.province.spec.js).
