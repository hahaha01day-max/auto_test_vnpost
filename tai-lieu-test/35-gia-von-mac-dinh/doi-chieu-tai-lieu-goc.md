# Đối chiếu tài liệu gốc ↔ kịch bản đã dựng — gia von mac dinh

> 🤖 **Sinh tự động — 🚫 đừng sửa tay phần trên.** Chạy lại:
> `node tool/bin/doi-chieu-goc.js 35-gia-von-mac-dinh`
> Nhận xét viết tay đặt sau dòng `<!-- NHAN-XET-TAY -->` ở cuối file thì được giữ nguyên qua mỗi lần sinh.
> Cập nhật: 19/09/2026

- Phân hệ: `35-gia-von-mac-dinh`
- Tài liệu gốc liên quan: [`uat_vnpost_quan_ly_kho.csv`](../test-case-goc/uat_vnpost_quan_ly_kho.csv)
- Khoá nối: cột **`Ma goc`** trong [`test-cases.csv`](test-cases.csv)

## 1. Tổng hợp

| Chỉ tiêu | Số lượng |
|---|--:|
| Case trong tài liệu gốc (thuộc phân hệ này) | **51** |
| — trong đó **trùng lặp** trong chính sheet gốc | 0 |
| **Case gốc đã dựng** | **38** |
| **Case gốc CHƯA dựng** (đã trừ bản trùng) | **13** |
| Case đã dựng trong `test-cases.csv` | 61 |
| — **tài liệu gốc KHÔNG có** | 23 |

**Độ phủ tài liệu gốc: 75%**

## 3. Case tài liệu gốc CÓ mà CHƯA dựng — 13 case

🔴 **Đây là việc phải làm.** Mỗi dòng là một case sheet QC có mà kịch bản còn thiếu.

| Mã gốc | Nhóm | Tình huống | Kết quả mong muốn (rút gọn) |
|---|---|---|---|
| `Tình huống` | FIFO | Điều kiện cần có |  |
| `Kiểm tra hiển thị giao diện màn Thẻ kho` | FIFO | Người dùng có quyền xem lịch sử xuất nhập kho |  |
| `Kiểm tra bộ lọc Điểm bán/Kho` | FIFO | Có nhiều kho hoặc điểm bán |  |
| `Kiểm tra tìm kiếm theo Tên sản phẩm` | FIFO | Có dữ liệu sản phẩm |  |
| `Kiểm tra tìm kiếm theo SKU` | FIFO | Có SKU tồn tại |  |
| `Kiểm tra tìm kiếm theo Barcode` | FIFO | Có Barcode tồn tại |  |
| `Kiểm tra chọn khoảng thời gian` | FIFO | Có dữ liệu ở nhiều khoảng thời gian |  |
| `Kiểm tra số liệu Tồn đầu kỳ` | FIFO | Có dữ liệu tồn kho trước ngày bắt đầu |  |
| `Kiểm tra số liệu Tổng nhập` | FIFO | Có nhiều phiếu nhập trong khoảng thời gian |  |
| `Kiểm tra số liệu Tổng xuất` | FIFO | Có nhiều phiếu xuất trong khoảng thời gian |  |
| `Kiểm tra số liệu Tồn cuối kỳ` | FIFO | Có dữ liệu nhập và xuất |  |
| `Kiểm tra dữ liệu trên bảng Thẻ kho` | FIFO | Có dữ liệu phát sinh |  |
| `Kiểm tra phân trang` | FIFO | Có số lượng bản ghi lớn hơn số bản ghi trên một trang |  |

## 4. Case đã dựng mà tài liệu gốc KHÔNG có — 23 case

Phần sheet QC bỏ sót, dựng thêm từ HDSD hoặc từ code.

| Mã | Tình huống | Nguồn |
|---|---|---|
| `GVMD-001` | Man Gia von mac dinh mo duoc va goi dung 2 API | HDSD |
| `GVMD-002` | Cau hinh toan he thong hien dung gia tri da seed | HDSD |
| `GVMD-003` | Bang danh muc du cot va co du lieu | HDSD |
| `GVMD-004` | Cot Nguon chi nhan 3 gia tri hop le | HDSD |
| `GVMD-005` | Drawer cau hinh toan he thong mo duoc va khong con LIFO | HDSD |
| `GVMD-006` | Drawer cau hinh danh muc mo dung ten danh muc | HDSD |
| `GVMD-007` | The lich su dot ap hien thi va goi dung API | HDSD |
| `GVMD-009` | Man them san pham lay mac dinh theo cau hinh | HDSD |
| `GVMD-010` | Luu cau hinh toan he thong hien popup xac nhan 2 lua chon | HDSD |
| `GVMD-011` | Luu cau hinh danh muc lam doi cot Nguon thanh Cau hinh rieng | HDSD |
| `GVMD-012` | Bo cau hinh rieng thi danh muc ke thua lai | HDSD |
| `GVMD-013` | API GET /system tra ve phuong phap mac dinh toan he thong | HDSD |
| `GVMD-014` | API GET /categories tra ve cay danh muc kem nguon | HDSD |
| `GVMD-015` | API GET /apply-jobs tra ve phan trang chuan | HDSD |
| `GVMD-016` | API GET /preview-apply tra so lieu canh bao | HDSD |
| `GVMD-017` | Man them san pham lay mac dinh theo cau hinh (gia lap cau hinh FIFO) | HDSD |
| `GVMD-018` | Vai diem ban KHONG goi duoc API cau hinh gia von | HDSD |
| `GVMD-019` | Bang cau hinh theo danh muc hien thi dang cay | HDSD |
| `GVMD-020` | FE dung cay danh muc dung theo parentId (gia lap du lieu) | HDSD |
| `GVMD-021` | Loc danh muc theo nguon cau hinh | HDSD |
| `BC-01` | Menu Cấu hình có mục Giá vốn mặc định và mở đúng tab | Bằng chứng — spec bang-chung.tct.spec.js:17 |
| `BC-02` | Màn thêm sản phẩm có ô Phương pháp tính giá vốn | Bằng chứng — spec bang-chung.tct.spec.js:30 |
| `BC-03` | Ghi lại phản hồi bốn API đọc | Bằng chứng — spec bang-chung-api.tct.spec.js:10 |

## 5. Bảng đối chiếu đầy đủ 51 case gốc

| Mã gốc | Tình huống | Kịch bản đã dựng |
|---|---|---|
| `FUNC_1_416` | Thêm sản phẩm vào danh sách sản phẩm nhà cung cấp | `GVMD-100` |
| `FUNC_1_417` | Thêm bảng giá sản phẩm | `GVMD-101` |
| `FUNC_1_418` | Đặt hàng sản phẩm thực tế đích danh | `GVMD-102` |
| `FUNC_1_419` | Nhập kho sản phẩm thực tế đích danh | `GVMD-103` |
| `FUNC_1_462` | Khai báo giá tiêu chuẩn cho sản phẩm | `GVMD-110` |
| `FUNC_1_463` | Thêm sản phẩm vào danh sách sản phẩm nhà cung cấp | `GVMD-111` |
| `FUNC_1_464` | Đặt hàng sản phẩm tiêu chuẩn | `GVMD-112` |
| `FUNC_1_465` | Đặt hàng sản phẩm tiêu chuẩn có giảm giá | `GVMD-113` |
| `FUNC_1_466` | Tạo bảng giá NCC có giá khác giá tiêu chuẩn | `GVMD-114` |
| `FUNC_1_467` | Tạo nhiều bảng giá cho nhiều NCC | `GVMD-115` |
| `FUNC_1_468` | Nhập kho từ NCC có giá thấp hơn giá tiêu chuẩn | `GVMD-116` |
| `FUNC_1_469` | Nhập kho từ NCC có giá cao hơn giá tiêu chuẩn | `GVMD-117` |
| `FUNC_1_470` | Huỷ bảng giá NCC | `GVMD-118` |
| `FUNC_1_471` | Thay đổi giá tiêu chuẩn | `GVMD-119` |
| `FUNC_1_472` | Nhập kho sau khi thay đổi giá tiêu chuẩn | `GVMD-120` |
| `FUNC_1_473` | Có nhiều NCC cho cùng một sản phẩm | `GVMD-121` |
| `FUNC_1_474` | Bán hàng sau khi nhập kho | `GVMD-122` |
| `FUNC_1_475` | Bán hàng âm | `GVMD-123` |
| `FUNC_1_476` | Nhập kho bù sau bán âm | `GVMD-124` |
| `FUNC_1_477` | Chuyển kho khi tồn kho đủ | `GVMD-125` |
| `FUNC_1_478` | Không cho chuyển kho khi tồn kho bằng 0 | `GVMD-126` |
| `FUNC_1_479` | Không cho chuyển kho khi tồn kho âm | `GVMD-127` |
| `FUNC_1_480` | Xuất kho khi tồn kho đủ | `GVMD-128` |
| `FUNC_1_481` | Không cho xuất kho khi tồn kho bằng 0 | `GVMD-129` |
| `FUNC_1_482` | Kiểm kho tăng tồn | `GVMD-130` |
| `FUNC_1_483` | Kiểm kho giảm tồn | `GVMD-131` |
| `FUNC_1_484` | Không cho kiểm kho giảm khi tồn kho bằng 0 | `GVMD-132` |
| `FUNC_1_485` | Không cho kiểm kho giảm khi tồn kho âm | `GVMD-133` |
| `FUNC_1_486` | Tính lại giá vốn MAC khi nhập kho với giá mới | `GVMD-140` |
| `FUNC_1_487` | Xuất kho bán hàng với phương pháp MAC | `GVMD-141` |
| `FUNC_1_488` | Chuyển kho nội bộ với phương pháp MAC | `GVMD-142` |
| `FUNC_1_489` | Trả hàng nhà cung cấp (Xuất kho) theo MAC | `GVMD-143` |
| `FUNC_1_490` | Bán âm sản phẩm với cấu hình giá MAC | `GVMD-144` |
| `FUNC_1_491` | Xuất kho bán hàng FIFO (Số lượng xuất <= lô đầu) | `GVMD-150` |
| `FUNC_1_492` | Xuất kho bán hàng FIFO (Số lượng xuất > lô đầu - Cắt lô) | `GVMD-151` |
| `FUNC_1_493` | Khách trả lại hàng (Nhập lại kho) với FIFO | `GVMD-152` |
| `FUNC_1_494` | Kiểm kê kho điều chỉnh giảm với FIFO | `GVMD-153` |
| `FUNC_1_495` | Nhập bù kho sau khi bán âm với FIFO | `GVMD-154` |
| `Tình huống` | Điều kiện cần có | — **chưa dựng** |
| `Kiểm tra hiển thị giao diện màn Thẻ kho` | Người dùng có quyền xem lịch sử xuất nhập kho | — **chưa dựng** |
| `Kiểm tra bộ lọc Điểm bán/Kho` | Có nhiều kho hoặc điểm bán | — **chưa dựng** |
| `Kiểm tra tìm kiếm theo Tên sản phẩm` | Có dữ liệu sản phẩm | — **chưa dựng** |
| `Kiểm tra tìm kiếm theo SKU` | Có SKU tồn tại | — **chưa dựng** |
| `Kiểm tra tìm kiếm theo Barcode` | Có Barcode tồn tại | — **chưa dựng** |
| `Kiểm tra chọn khoảng thời gian` | Có dữ liệu ở nhiều khoảng thời gian | — **chưa dựng** |
| `Kiểm tra số liệu Tồn đầu kỳ` | Có dữ liệu tồn kho trước ngày bắt đầu | — **chưa dựng** |
| `Kiểm tra số liệu Tổng nhập` | Có nhiều phiếu nhập trong khoảng thời gian | — **chưa dựng** |
| `Kiểm tra số liệu Tổng xuất` | Có nhiều phiếu xuất trong khoảng thời gian | — **chưa dựng** |
| `Kiểm tra số liệu Tồn cuối kỳ` | Có dữ liệu nhập và xuất | — **chưa dựng** |
| `Kiểm tra dữ liệu trên bảng Thẻ kho` | Có dữ liệu phát sinh | — **chưa dựng** |
| `Kiểm tra phân trang` | Có số lượng bản ghi lớn hơn số bản ghi trên một trang | — **chưa dựng** |

<!-- NHAN-XET-TAY -->

## 6. Nhận xét thủ công

_(Viết vào đây. Phần từ dòng `<!-- NHAN-XET-TAY -->` trở xuống KHÔNG bị ghi đè khi sinh lại.)_
