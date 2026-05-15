# Hướng dẫn sử dụng chương trình khuyến mãi trong màn hình bán hàng

## Mục đích

Tài liệu này hướng dẫn cách xem, chọn và áp dụng chương trình khuyến mãi trong màn hình tạo đơn hàng.

Chương trình khuyến mãi gồm 2 nhóm chính:

- `Theo đơn hàng`: áp dụng cho toàn bộ đơn hàng.
- `Theo sản phẩm`: áp dụng theo từng sản phẩm trong đơn.

## Mở danh sách chương trình khuyến mãi

1. Vào màn hình tạo đơn hàng.
2. Thêm sản phẩm vào đơn hàng.
3. Chọn khách hàng nếu đơn hàng có khách hàng cụ thể.
4. Bấm `Chương trình khuyến mãi (n)` ở khu vực tổng quan đơn hàng.
5. Hệ thống mở modal `Chương trình khuyến mãi`.

Khi mở modal, hệ thống sẽ tải danh sách chương trình khuyến mãi đang hoạt động tại điểm bán hiện tại.

## Kiểm tra đối tượng áp dụng

Mỗi chương trình khuyến mãi có thể áp dụng cho:

- Tất cả khách hàng.
- Một nhóm khách hàng cụ thể.

Nếu chương trình có `Tất cả khách hàng`, khách lẻ hoặc khách đã chọn đều có thể áp dụng nếu thỏa điều kiện khác.

Nếu chương trình có nhóm khách hàng cụ thể, hệ thống sẽ kiểm tra khách hàng hiện tại có thuộc nhóm đó hay không.

Ví dụ:

- Khách thuộc nhóm `VIP - Tổng mua 10tr v2026` thì chương trình của nhóm này đủ điều kiện về đối tượng.
- Khách không thuộc nhóm đó thì chương trình không đủ điều kiện về đối tượng.

## Trạng thái điều kiện

Trong modal, các điều kiện được hiển thị bằng biểu tượng:

- Tick xanh: điều kiện đã thỏa mãn.
- Chấm than màu warning: điều kiện chưa thỏa mãn.

Một chương trình chỉ chọn được khi tất cả điều kiện cần thiết đã thỏa mãn.

## Tab Theo Đơn Hàng

Tab `Theo đơn hàng` hiển thị các chương trình có phạm vi áp dụng cho toàn bộ đơn.

Các điều kiện thường gặp:

- Giá trị hóa đơn tối thiểu.
- Sản phẩm bắt buộc trong đơn.
- Nhóm khách hàng.

Ví dụ:

```text
Hóa đơn từ 300.000đ trở lên
Mua 1 Sản phẩm 13 (Sắp hết - 30 ngày)
Đối tượng áp dụng: VIP - Tổng mua 10tr v2026
```

Khi áp dụng thành công:

- Chiết khấu khuyến mãi được cộng vào phần `Chiết khấu khuyến mãi`.
- Nếu có quà tặng theo đơn, quà sẽ hiển thị ở khối riêng `Quà tặng đơn hàng`.
- Chiết khấu nhập tay của đơn hàng vẫn tách riêng với chiết khấu khuyến mãi.

## Tab Theo Sản Phẩm

Tab `Theo sản phẩm` hiển thị các chương trình áp dụng cho sản phẩm cụ thể trong đơn.

Danh sách được nhóm theo từng sản phẩm. Mỗi nhóm có thể mở hoặc thu lại.

Người dùng có thể tìm kiếm theo tên sản phẩm trong tab này.

## Quy tắc chọn chương trình theo sản phẩm

Người dùng phải tự tick chương trình muốn áp dụng.

Hệ thống không tự động tick chương trình khi đơn hàng đủ điều kiện.

Nếu sau khi đã áp dụng mà đơn hàng không còn đủ điều kiện, hệ thống sẽ tự gỡ chương trình đó và các dòng khuyến mãi liên quan.

Trong cùng một sản phẩm thực nhận giảm giá, không được chọn cùng lúc nhiều chương trình có hình thức `Giảm giá bán`.

## Giảm Giá Bán Cho Mỗi Sản Phẩm

Loại này giảm trực tiếp trên sản phẩm đang mua.

Ví dụ:

```text
Mua từ 2 Sản phẩm A
Giảm giá 10.000đ sản phẩm Sản phẩm A
```

Khi áp dụng:

- Dòng sản phẩm đang mua được giảm giá.
- Sản phẩm được gắn tag `KM`.
- Không cho sửa đơn giá hoặc giá bán của dòng sản phẩm đã được áp dụng khuyến mãi.

## Giảm Giá Cho Sản Phẩm Tiếp Theo

Loại này không giảm giá cho sản phẩm điều kiện. Sản phẩm đứng ngay sau sản phẩm điều kiện trong đơn mới được giảm.

Ví dụ điều kiện:

```text
Mua 2 sản phẩm A được giảm 10.000đ cho sản phẩm tiếp theo
```

Nếu trong đơn có:

```text
2 sản phẩm A
1 sản phẩm B
```

Thì sản phẩm B là sản phẩm được giảm giá.

Khi áp dụng:

- Sản phẩm điều kiện chỉ dùng để kiểm tra số lượng.
- Sản phẩm kế tiếp được gắn tag `KM`.
- Sản phẩm kế tiếp bị khóa sửa đơn giá hoặc giá bán.

## Tặng Kèm Sản Phẩm Không Bán

Loại này tạo thêm dòng sản phẩm khuyến mãi giá 0.

Ví dụ:

```text
Mua từ 2 Dầu gội thái dương

Tặng 1 sản phẩm Dầu gội
Tặng 2 sản phẩm Dầu xả
Tặng 1 sản phẩm Dịch vụ xông chân
```

Khi áp dụng:

- Các sản phẩm tặng kèm hiển thị dưới sản phẩm mua chính.
- Dòng tặng kèm có tag `KM`.
- Giá bán là 0.
- Không cho sửa số lượng, đơn giá hoặc giá bán.

## Giảm Giá Tổng Của Combo

Loại này tạo thêm dòng combo khuyến mãi với giá đã giảm.

Ví dụ:

```text
Mua từ 5 Sản phẩm A

Giảm giá 30.000đ combo Combo dưỡng tóc
Giảm giá 10% combo Combo dưỡng da
```

Khi áp dụng:

- Combo khuyến mãi hiển thị dưới sản phẩm mua chính.
- Combo có tag `KM`.
- Giá bán hiển thị là giá sau khuyến mãi.
- Giá gốc hiển thị dạng gạch đỏ nếu có dữ liệu.
- Không cho sửa số lượng, đơn giá hoặc giá bán.

## Mua Sản Phẩm Khác Giá Thấp

Loại này cho phép mua thêm sản phẩm khác với giá thấp hơn hoặc được giảm giá.

Ví dụ:

```text
Mua từ 4 Sản phẩm A

Giảm giá 20.000đ sản phẩm Dầu gội
Giảm giá 20% sản phẩm Dầu xả
```

Khi áp dụng:

- Sản phẩm mua kèm hiển thị dưới sản phẩm mua chính.
- Sản phẩm mua kèm có tag `KM`.
- Giá bán là giá sau khuyến mãi.
- Không cho sửa số lượng, đơn giá hoặc giá bán.

## Nhân Số Lượng Theo Số Lượng Mua

Một số chương trình có cấu hình nhân số lượng theo số lượng sản phẩm mua.

Nếu không bật nhân số lượng:

```text
Mua đủ điều kiện một lần hoặc nhiều lần vẫn nhận số lượng khuyến mãi cố định theo cấu hình.
```

Nếu bật nhân số lượng:

```text
Số lượng khuyến mãi = số lần đủ điều kiện x số lượng khuyến mãi cấu hình.
```

Ví dụ:

```text
Mua từ 3 sản phẩm A
Tặng 1 Dầu gội
```

Nếu mua 6 sản phẩm A:

- Không bật nhân số lượng: tặng 1 Dầu gội.
- Có bật nhân số lượng: tặng 2 Dầu gội.

## Khi Đơn Hàng Thay Đổi

Hệ thống kiểm tra lại chương trình khuyến mãi khi:

- Thêm sản phẩm.
- Xóa sản phẩm.
- Đổi số lượng sản phẩm.
- Đổi giá trị đơn hàng.
- Đổi khách hàng.
- Xóa khách hàng.

Nếu chương trình đang áp dụng không còn đủ điều kiện:

- Hệ thống tự gỡ chương trình đó.
- Gỡ chiết khấu khuyến mãi tương ứng.
- Gỡ quà tặng hoặc dòng sản phẩm khuyến mãi tương ứng.

Nếu đơn hàng đủ điều kiện trở lại:

- Hệ thống không tự động áp dụng lại.
- Người dùng phải mở modal và tick lại chương trình muốn áp dụng.

## Hiển Thị Chiết Khấu

Phần tổng quan đơn hàng hiển thị riêng:

- `Chiết khấu đơn hàng`: chiết khấu nhập tay.
- `Chiết khấu khuyến mãi`: chiết khấu từ chương trình khuyến mãi.

Tổng giảm giá khi thanh toán là tổng của 2 phần này.

Ví dụ:

```text
Chiết khấu đơn hàng: 20.000đ
Chiết khấu khuyến mãi: 50.000đ
Tổng chiết khấu gửi thanh toán: 70.000đ
```

## Lưu Ý Khi Thanh Toán

Khi gửi đơn sang backend:

- Tổng chiết khấu được quy về `discountAmount`.
- `discountPercent` gửi là `0`.
- Tạm thời `campaignId` gửi là `null`.
- Dòng quà tặng có giá 0 và được đánh dấu là sản phẩm khuyến mãi.

## Các Trường Hợp Không Được Chọn

Không chọn được chương trình khuyến mãi khi:

- Chưa đạt giá trị hóa đơn tối thiểu.
- Thiếu sản phẩm điều kiện.
- Chưa đủ số lượng sản phẩm điều kiện.
- Khách hàng không thuộc nhóm áp dụng.
- Với giảm giá sản phẩm tiếp theo, không có sản phẩm kế tiếp để nhận giảm.
- Trong cùng một sản phẩm thực nhận giảm giá đã có một chương trình `Giảm giá bán` khác được chọn.

## Tóm Tắt Luồng Sử Dụng

1. Thêm sản phẩm vào đơn.
2. Chọn khách hàng nếu cần áp dụng nhóm khách hàng.
3. Bấm `Chương trình khuyến mãi (n)`.
4. Chọn tab `Theo đơn hàng` hoặc `Theo sản phẩm`.
5. Kiểm tra tick xanh/chấm than ở điều kiện.
6. Tick chương trình muốn áp dụng.
7. Bấm `Áp dụng`.
8. Kiểm tra chiết khấu, quà tặng hoặc dòng sản phẩm KM trong đơn.
9. Nếu sửa đơn hàng, kiểm tra lại danh sách CTKM đang áp dụng.
