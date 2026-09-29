# Mapping Page Title ↔ Route — vnpost-web

> Nguồn: `vnpost-web/src/routes/configs/dashboard/index.js` và các file route con import vào đó.
> Path lấy từ `route` / `routeKey` trong `src/utils/constants/config.jsx`.
> Chỉ liệt kê các route đang active (đã bỏ qua các route bị comment).
> `hideInMenu = true` → route tồn tại nhưng không hiển thị trên menu (thường là trang chi tiết/form).

## Top-level (DASHBOARD_ROUTES)

| Page title | Route | Ghi chú |
|---|---|---|
| Tài khoản của tôi | `/profile-account` | hideInMenu |
| Trang chủ | `/home` | |
| Chiến dịch Loyalty | `/care/loyalty` | |
| Cấu hình | `/settings` | |

## Quản lý lịch làm việc / Lịch cá nhân (calendarRoutes)

> Menu đổi theo business: SHOP = "Lịch cá nhân", còn lại = "Quản lý lịch làm việc".

| Page title | Route | Ghi chú |
|---|---|---|
| Ca làm việc | `/lich-ca-nhan/ca-lam-viec` | |
| Lịch tháng | `/lich-ca-nhan/lich-thang` | chỉ SHOP |
| Lịch làm việc | `/calendar` | không phải SHOP |
| Lịch đặt online | `/schedule-orders-online` | không phải SHOP |

## Đơn hàng (orderRoutes — `/order`)

| Page title | Route | Ghi chú |
|---|---|---|
| Đơn hàng đã tạo | `/order/created-orders` | |
| Chi tiết đơn hàng | `/order/created-orders/detail/:orderId/:shopId` | hideInMenu |
| Đơn hàng đổi trả | `/order/return-orders` | |
| Chi tiết đơn hàng (đổi trả) | `/order/return-orders/detail/:orderId/:shopId` | hideInMenu |
| Đơn hàng mẫu | `/order/order-example` | |
| Hoá đơn điện tử | `/order/invoice` | externalLink → https://hoadon.sfin.vn |

## Khách hàng (customerRoutes — `/customer`)

| Page title | Route | Ghi chú |
|---|---|---|
| Khách hàng | `/customer` | index |
| Chi tiết khách hàng | `/customer/detail/:customerId` | hideInMenu |

## Tài chính (financeRoutes — `/finance`)

| Page title | Route | Ghi chú |
|---|---|---|
| Tổng quan | `/finance/expenditure-config` | |
| Quản lý quỹ | `/finance/fund` | |
| Quầy thu ngân | `/finance/cashier-counter` | |
| Phiếu chi | `/finance/expenditure-management` | |
| Phiếu thu | `/finance/receipt-management` | |
| Công nợ khách hàng | `/finance/customer-debt` | |
| Công nợ nhân viên | `/finance/employee-debt` | |
| Công nợ cửa hàng | `/finance/shop-debt` | |
| Công nợ NCC | `/finance/supplier-debt` | chỉ cấp Tỉnh / TCT |
| Công nợ Tỉnh - TCT | `/finance/internal-debt` | |

## Sản phẩm (productRoutes — `/product`)

| Page title | Route | Ghi chú |
|---|---|---|
| Sản phẩm | `/product/normal` | |
| Quản lý danh mục | `/product/category` | hideInMenu |
| Combo sản phẩm | `/product/combo` | |
| Bảo hành | `/product/guarantee` | shopConfig enableProductGuarantee |
| Bảng giá | `/product/pricing` | |
| Bảng giá tiêu chuẩn | `/product/standard-pricing` | |
| Thêm bảng giá | `/product/pricing/create` | hideInMenu |
| Sửa bảng giá | `/product/pricing/edit/:id` | hideInMenu |

## Kho hàng (inventoryRoutes — `/inventory`)

| Page title | Route | Ghi chú |
|---|---|---|
| Tổng quan | `/inventory/overview` | |
| Cảnh báo tồn kho | `/inventory/stock-alerts` | |
| Xuất nhập kho | `/inventory/import` | |
| Chi tiết phiếu nhập xuất | `/inventory/import-receipt` | hideInMenu |
| Quản lý tiêu hao | `/inventory/material-report` | |
| Kiểm kho | `/inventory/inventory-check` | |
| Tồn kho đầu kỳ | `/inventory/opening-balance` | hideInMenu |
| Chuyển kho | `/inventory/transfer-warehouse` | |
| Sản xuất sản phẩm | `/inventory/production` | |
| Quản lý kho | `/inventory/warehouses` | |
| Cài đặt cảnh báo tồn kho | `/inventory/stock-alerts/settings` | hideInMenu |
| Nhà cung cấp | `/inventory/warehouse-supplier` | |
| Nhóm nhà cung cấp | `/inventory/supplier-group` | hideInMenu |
| Sản phẩm theo nhà cung cấp | `/inventory/warehouse-supplier/:supplierId/products` | hideInMenu |
| Bảng giá nhà cung cấp | `/inventory/warehouse-supplier/:supplierId/price-lists` | hideInMenu |
| Phiếu đề xuất đặt hàng | `/inventory/purchase-request` | |
| Tạo phiếu đề xuất | `/inventory/purchase-request/create` | hideInMenu |
| Chỉnh sửa phiếu đề xuất | `/inventory/purchase-request/edit/:id` | hideInMenu |
| Tách phiếu đề xuất | `/inventory/purchase-request/split/:id` | hideInMenu |
| Gộp phiếu đề xuất | `/inventory/purchase-request/merge` | hideInMenu |
| Chi tiết phiếu đề xuất | `/inventory/purchase-request/detail/:id` | hideInMenu |
| Đặt hàng NCC | `/inventory/purchase-order` | |
| Xuất trả NCC | `/inventory/return-to-supplier` | hideInMenu (path tương đối `return-to-supplier`) |
| Tạo phiếu xuất trả NCC | `/inventory/return-to-supplier/create` | hideInMenu |
| Đơn giao thẳng cần xác nhận | `/inventory/purchase-order/direct-delivery/pending` | hideInMenu |
| Chi tiết đơn giao thẳng | `/inventory/purchase-order/direct-delivery/:id` | hideInMenu |
| Tạo đơn đặt hàng | `/inventory/purchase-order/create` | hideInMenu |
| Chi tiết đơn đặt hàng | `/inventory/purchase-order/:id` | hideInMenu |
| Sửa đơn đặt hàng | `/inventory/purchase-order/:id/edit` | hideInMenu |
| Đối soát hoá đơn | `/inventory/invoice-reconcile` | hideInMenu |
| Chi tiết đối soát hoá đơn | `/inventory/invoice-reconcile/detail` | hideInMenu |

## Báo cáo (reportRoutes — `/report`)

| Page title | Route | Ghi chú |
|---|---|---|
| Báo cáo doanh thu | `/report/revenue-sale` | |
| Báo cáo Lãi/Lỗ (P&L) | `/report/profit-loss` | |
| Báo cáo kho | `/report/inventory-value` | |
| Báo cáo đối soát | `/report/po-reconciliation` | |
| Báo cáo tuỳ chỉnh | `/report/dynamic` | |

## Nhân viên (employeeRoutes — `/employee`)

| Page title | Route | Ghi chú |
|---|---|---|
| Quản lý nhân viên | `/employee/list` | |
| Chi tiết nhân viên | `/employee/detail/:employeeName/:sysUserId/:shopId` | hideInMenu |
| Nhật ký làm việc | `/employee/activity` | |
| Công nợ nhân viên | `/employee/debt` | |
| Lịch làm việc | `/employee/schedule` | |
| Quản lý ca làm việc | `/employee/shift` | |
| Báo cáo chốt ca | `/employee/shift-report` | |

## Khuyến mãi (promotionRoutes — `/promotion`)

| Page title | Route | Ghi chú |
|---|---|---|
| Danh sách chương trình | `/promotion/campaign` | |
| Thêm/Sửa chương trình | `/promotion/campaign/:mode` | |
| Danh sách điều kiện | `/promotion/condition` | |
| Danh sách đối tượng | `/promotion/customer-group` | |
| Báo cáo | `/promotion/report` | |

## Chức năng khác (moreFeatures — `/more-features`)

| Page title | Route | Ghi chú |
|---|---|---|
| Quản lý khóa | `/more-features/digital-key` | shopConfig locker |
| Quản lý phòng | `/more-features/room` | shopConfig room |

## Vận hành (chainRoutes — `/chain-management-key`)

| Page title | Route | Ghi chú |
|---|---|---|
| Mô hình tổ chức | `/chain/organization-management` | |
| Quản lý cửa hàng | `/chain/shop-management` | |
| Lịch sử người dùng | `/chain/user-action-history` | |

## Quản lý vai trò (roleRoutes — `/role-management`)

| Page title | Route | Ghi chú |
|---|---|---|
| Quyền (API) | `/role-management/permission` | |
| Chức năng | `/role-management/function` | |
| Vai trò | `/role-management/assign` | |

## Quản lý tài khoản (accountManagementRoutes)

| Page title | Route | Ghi chú |
|---|---|---|
| Quản lý tài khoản | `/account-management` | |
