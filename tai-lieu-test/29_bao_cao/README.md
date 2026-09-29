# 29 — Báo cáo quản trị

Nguồn: `resource/hdsd/hdsd29_bao_cao/` — 14 task.

**Chưa có test case nào.** Khung này dựng sẵn để điền vào.

## Task cần phủ

| Mã task | Task | Mã case sẽ dùng | Số case |
|---|---|---|--:|
| `010` | Xem báo cáo doanh thu theo kỳ, đơn vị và ngành hàng | `29_010_001` … | — |
| `020` | Xuất dữ liệu báo cáo doanh thu ra Excel | `29_020_001` … | — |
| `030` | Xem báo cáo lãi lỗ của điểm bán hoặc toàn chuỗi | `29_030_001` … | — |
| `040` | Chốt trị giá tồn kho theo tháng | `29_040_001` … | — |
| `050` | Tra cứu trị giá tồn kho và đối soát với sổ cái | `29_050_001` … | — |
| `060` | Theo dõi nhập - xuất - tồn theo mặt hàng | `29_060_001` … | — |
| `070` | Xem sản lượng bán và hàng khách trả lại | `29_070_001` … | — |
| `080` | Đánh giá vòng quay và số ngày tồn kho | `29_080_001` … | — |
| `090` | Tìm hàng bán chạy, chậm luân chuyển và hàng chết | `29_090_001` … | — |
| `100` | Tra cứu tồn kho theo hạn sử dụng | `29_100_001` … | — |
| `110` | Xem báo cáo đối soát hoá đơn mua hàng và công nợ nhà cung cấp | `29_110_001` … | — |
| `120` | Xem báo cáo nhân viên theo ca làm việc và hàng hoá đã bán | `29_120_001` … | — |
| `130` | Xem các báo cáo tuỳ chỉnh | `29_130_001` … | — |
| `140` | Cấu hình danh mục báo cáo tuỳ chỉnh | `29_140_001` … | — |

## Cách điền

1. Đọc `resource/hdsd/hdsd29_bao_cao/tasks/<mã task>_*.md` — có sẵn vai, màn hình, bước thao tác.
2. Thêm dòng vào `test-cases.csv`, mã đặt theo `29_<mã task>_<STT>`.
3. Viết spec trong `tests/`, title là `'<mã> - <tên case>'`.

🚫 Đừng thêm dòng CSV cho task chưa thật sự có test case — công cụ đếm mỗi dòng là một case,
thêm bừa là số liệu độ phủ thành ảo.
