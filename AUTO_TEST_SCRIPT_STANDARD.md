# Chuẩn tạo script auto test VNPost nhanh và chính xác

## 1. Mục tiêu

Tài liệu này chuẩn hóa cách chuyển một test case nghiệp vụ thành script Playwright có:

- Tốc độ viết nhanh vì tái sử dụng route, API và helper theo domain.
- Độ ổn định cao, không phụ thuộc quá nhiều vào vị trí hoặc cấu trúc HTML.
- Kiểm tra được cả hành vi UI và dữ liệu thực tế sau thao tác.
- Có thể chạy độc lập, chạy lặp lại và tự dọn dữ liệu.
- Phân biệt rõ lỗi sản phẩm, lỗi dữ liệu, lỗi môi trường và test chưa đủ điều kiện.

Nguồn đối chiếu:

- SRS, test case và script trong `auto_test_vnpost`.
- Route, page, service Axios/RTK Query trong `sofin-business`.
- Quy ước response backend: `status.code` là chuỗi, dữ liệu ở `data`, phân trang ở `page`.

## 2. Quy trình tạo test

### Bước 1 - Chuẩn hóa đầu vào

Không viết script nếu chưa xác định được tối thiểu:

- Test case ID và mục tiêu nghiệp vụ.
- Vai trò, cấp tổ chức và quyền cần có.
- Môi trường chạy.
- Route thật của màn hình.
- Dữ liệu nền cần có.
- API được UI gọi.
- Kết quả UI và kết quả dữ liệu mong đợi.
- Test có tạo/sửa/xóa dữ liệu hay không.
- Cách cleanup.

Nếu SRS khác code đang chạy, ghi riêng:

- `SRS_EXPECTED`: yêu cầu theo tài liệu.
- `IMPLEMENTED_EXPECTED`: hành vi theo code/UI hiện tại.
- Không tự biến khác biệt thành test pass.

### Bước 2 - Truy vết code trước khi ghi locator

Thứ tự tìm trong `sofin-business`:

1. Route trong `src/routes/configs/**`.
2. Page/component được route load.
3. Text, label, placeholder và trạng thái button trong component.
4. Service gọi API:
   - Code mới: `src/features/<domain>/services/*Api.js`.
   - Code cũ: `src/utils/service/*Service.js`.
5. Payload, query params, response và header scope.
6. Permission key và hành vi theo `orgUnitType`, `roleAllowedLevel`, `shopId`.

Lệnh tìm nhanh:

```bash
rg -n "Tên menu|Tên nút|PageContainer" sofin-business/src
rg -n "url:|method:|builder\\.query|builder\\.mutation" sofin-business/src/features/<domain>
rg -n "route\\.|path:" sofin-business/src/routes
```

Ví dụ Mô hình tổ chức:

- Route: `/chain/organization-management`.
- API search: `GET /v1.0/organization-unit/search`.
- API detail: `GET /v1.0/organization-unit/detail?unitCode=...`.
- Tạo: `POST /v1.0/organization-unit`.
- Cập nhật: `PUT /v1.0/organization-unit?unitCode=...`.
- Xóa: `DELETE /v1.0/organization-unit?unitCode=...`.

### Bước 3 - Chọn đúng tầng kiểm thử

| Tầng | Dùng để kiểm tra | Tỷ lệ khuyến nghị |
| --- | --- | --- |
| API | Rule nghiệp vụ, validation, CRUD, trạng thái, phân quyền dữ liệu | Nhiều nhất |
| UI + API verify | Luồng người dùng quan trọng và dữ liệu sau thao tác | Các happy path/P0 |
| UI-only | Hiển thị, điều hướng, form validation phía client, permission button | Một số ít |

Không cần tạo mọi biến thể dữ liệu qua UI. Cách nhanh và ổn định:

1. API tạo prerequisite.
2. UI thực hiện hành vi đang cần kiểm tra.
3. API xác minh side effect.
4. API cleanup.

### Bước 4 - Thiết kế dữ liệu test

Tên/mã test phải nhận diện được:

```js
const runId = `${Date.now()}_${test.info().workerIndex}`;
const testData = {
  code: `AUTO_${runId}`.slice(0, 30),
  name: `AUTO_${test.info().testId}_${runId}`.slice(0, 100),
};
```

Quy tắc:

- Không phụ thuộc vào “dòng đầu tiên” của dữ liệu dùng chung.
- Không sửa/xóa dữ liệu không do test tạo.
- Dữ liệu phải unique khi chạy song song.
- Ghi lại ID/code từ response tạo mới, không tìm lại chỉ bằng text nếu API trả ID.
- Với nghiệp vụ tài chính/tồn kho, ưu tiên shop hoặc tenant chuyên dùng cho automation.

### Bước 5 - Viết script theo mẫu Arrange - Act - Assert - Cleanup

```js
test('ORG-CRUD-001 tạo đơn vị từ UI và verify bằng API', async ({ page, request }) => {
  const data = buildOrganizationData(test.info());
  let created = false;

  try {
    // Arrange
    await loginAs(page, 'ADMIN_TCT');
    await page.goto('/chain/organization-management');

    // Act
    const createResponse = page.waitForResponse(
      (res) =>
        res.url().includes('/v1.0/organization-unit') &&
        res.request().method() === 'POST',
    );
    await organizationPage.create(data);
    const response = await createResponse;

    // Assert transport + response contract
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(String(body?.status?.code)).toBe('200');
    created = true;

    // Assert UI
    await expect(page.getByText(data.name, { exact: true })).toBeVisible();

    // Assert persisted data
    const detail = await organizationApi.detail(request, data.code);
    expect(detail.name).toBe(data.name);
    expect(detail.parentUnitCode).toBe(data.parentUnitCode);
  } finally {
    if (created) {
      await organizationApi.delete(request, data.code);
    }
  }
});
```

## 3. Kiến trúc thư mục chuẩn

```text
auto_test_vnpost/
  playwright.config.js
  .env.example
  tai-lieu-test/
    shared/
      config.js
      fixtures/
        auth.fixture.js
        scope.fixture.js
        api.fixture.js
      api/
        base-api.js
        organization-api.js
        supplier-api.js
      pages/
        login.page.js
        organization.page.js
        supplier.page.js
      builders/
        organization.builder.js
        supplier.builder.js
      assertions/
        response.assertions.js
    01-mo-hinh-to-chuc/
      tests/
        org.smoke.spec.js
        org.validation.spec.js
        org.crud.spec.js
      test-cases.csv
```

Nguyên tắc:

- Page object chỉ chứa thao tác và locator, không chứa toàn bộ business assertion.
- API client chỉ chứa request/parse response.
- Builder tạo dữ liệu hợp lệ mặc định, từng test chỉ override field cần kiểm tra.
- Fixture quản lý login, scope, token và cleanup.
- Không copy helper login vào từng module.

## 4. Chuẩn locator UI

Thứ tự ưu tiên:

1. `getByRole()` với accessible name.
2. `getByLabel()`.
3. `getByPlaceholder()`.
4. `getByText()` trong container đã giới hạn.
5. `data-testid` cho control khó định danh.
6. CSS class ổn định.

Không dùng:

- `locator('input').nth(2)`.
- Click theo tọa độ màn hình.
- Class nội bộ sinh động của Ant Design.
- Text regex quá rộng như `/Tạo|Thêm|Phiếu|Thông tin/`.

Ví dụ:

```js
const drawer = page.getByRole('dialog', { name: /Thêm nhà cung cấp/i });
await drawer.getByLabel(/Tên nhà cung cấp/i).fill(data.name);
await drawer.getByRole('button', { name: 'Xác nhận', exact: true }).click();
```

Nếu component chưa có accessible name ổn định, nên bổ sung vào `sofin-business`:

```jsx
<Input aria-label="Tên nhà cung cấp" />
<Button data-testid="supplier-submit">Xác nhận</Button>
```

`data-testid` là hợp lý cho:

- Icon button không có text.
- Row action trùng tên.
- Thành phần canvas/virtualized.
- Tổng tiền, chiết khấu, tồn kho cần đọc chính xác.

## 5. Chuẩn chờ và đồng bộ

Ưu tiên:

```js
await expect(locator).toBeVisible();
await expect(page).toHaveURL(/\/inventory\/warehouse-supplier/);
await page.waitForResponse(isSupplierSearchResponse);
await expect(saveButton).toBeEnabled();
```

Hạn chế:

```js
await page.waitForTimeout(1000);
await page.waitForLoadState('networkidle');
```

`networkidle` không đáng tin với ứng dụng có polling, websocket hoặc request nền. Khi submit, luôn chờ đúng API:

```js
const responsePromise = page.waitForResponse(
  (res) =>
    res.url().includes('/chain-supplier') &&
    res.request().method() === 'POST',
);
await submitButton.click();
const response = await responsePromise;
```

## 6. Chuẩn xác minh API và dữ liệu

### Response contract

```js
async function expectBusinessSuccess(response) {
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(String(body?.status?.code)).toBe('200');
  return body?.data;
}
```

Không chỉ kiểm tra HTTP 200. Backend có thể trả HTTP 200 nhưng `status.code` là mã lỗi nghiệp vụ.

### Header bắt buộc

API của `sofin-business` có thể cần:

- `Authorization`.
- `appId`.
- `chainId`.
- `shopId`.
- `orgUnitCode`.
- `orgUnitType`.

Không hard-code header từ một tài khoản. Lấy chúng từ fixture sau login/chọn scope, hoặc từ cấu hình role test.

### Ba mức verify

1. Response của mutation đúng contract.
2. API detail/search trả đúng dữ liệu đã lưu.
3. API liên quan phản ánh side effect.

Ví dụ nhập kho:

- Mutation tạo phiếu nhập thành công.
- Detail phiếu có đúng sản phẩm/số lượng/đơn giá.
- Inventory API cho thấy tồn tăng đúng.
- Supplier debt API cho thấy công nợ tăng đúng nếu mua nợ.

Chỉ query database khi:

- Không có API read phù hợp.
- Cần kiểm tra transaction hoặc dữ liệu liên bảng mà API che khuất.
- Có môi trường và tài khoản DB read-only dành cho test.

Ưu tiên API hơn DB vì API đã áp dụng đúng tenant/scope và ít gắn chặt schema.

## 7. Chuẩn đăng nhập và session

- Một project `setup` đăng nhập một lần cho từng role/scope.
- Lưu `storageState` riêng, ví dụ:
  - `.auth/admin-tct.json`
  - `.auth/quan-ly-tinh.json`
  - `.auth/giam-doc-xa.json`
  - `.auth/cua-hang-truong.json`
- Test chọn project/fixture tương ứng.
- Không login lại trong mọi `beforeEach`.

Không lưu username/password/token vào Git. `.env.example` chỉ chứa tên biến:

```dotenv
VNPOST_BASE_URL=
VNPOST_API_BASE_URL=
VNPOST_ADMIN_TCT_ACCOUNT=
VNPOST_ADMIN_TCT_PASSWORD=
VNPOST_TEST_SHOP_ID=
```

## 8. Tiêu chuẩn đầu vào của test case

### Bộ field bắt buộc

| Field | Bắt buộc | Mô tả |
| --- | --- | --- |
| `id` | Có | ID duy nhất, ví dụ `NCC-CRUD-001` |
| `title` | Có | Một hành vi cụ thể |
| `module` | Có | Phân hệ/màn hình |
| `priority` | Có | P0/P1/P2/P3 |
| `test_level` | Có | API, UI, UI_API |
| `role` | Có | Vai trò chạy |
| `org_scope` | Có | TCT/Tỉnh/Xã/Điểm bán và mã scope |
| `route` | Có với UI | Route xác nhận từ code |
| `preconditions` | Có | Dữ liệu/quyền/trạng thái ban đầu |
| `test_data` | Có | Giá trị cụ thể hoặc builder |
| `steps` | Có | Các bước tối thiểu, không mô tả mơ hồ |
| `ui_expected` | Có với UI | Kết quả quan sát trên UI |
| `api_expected` | Có với API/UI_API | Endpoint và dữ liệu cần verify |
| `cleanup` | Có nếu ghi dữ liệu | Endpoint/cách hoàn tác |
| `tags` | Có | smoke, regression, destructive, finance... |

### Template CSV đề xuất

```csv
id,title,module,priority,test_level,role,org_scope,route,preconditions,test_data,steps,ui_expected,api_expected,cleanup,tags
ORG-CRUD-001,Tạo đơn vị cấp xã,Mô hình tổ chức,P0,UI_API,ADMIN_TCT,TONG_CONG_TY,/chain/organization-management,"Có đơn vị cha cấp tỉnh","builder:validXa","Mở form; nhập dữ liệu; xác nhận","Toast thành công; node mới hiển thị","POST status.code=200; GET detail trả đúng code/name/parent","DELETE theo unitCode","smoke;crud"
```

### Điều kiện để test case được automation

Một test case đạt “Ready for Automation” khi:

- Không có từ mơ hồ như “đúng”, “hợp lệ”, “phù hợp” mà thiếu giá trị/rule.
- Có role và scope cụ thể.
- Có dữ liệu đầu vào tái tạo được.
- Có expected result đo được.
- Xác định được API hoặc nguồn dữ liệu để verify.
- Có cleanup cho mọi thao tác ghi.
- Đã thống nhất xử lý nếu SRS khác UI/code.

## 9. Phân loại kết quả test

Không gộp mọi trường hợp thành pass/fail:

| Kết quả | Ý nghĩa |
| --- | --- |
| `PASS` | Đã thực hiện đủ bước và đủ assertion |
| `FAIL_PRODUCT` | Hành vi/response/dữ liệu sai |
| `FAIL_TEST` | Locator, script hoặc test data sai |
| `BLOCKED_ENV` | Môi trường/API/login không sẵn sàng |
| `SKIPPED_PRECONDITION` | Thiếu prerequisite đã khai báo |
| `SRS_GAP` | SRS và implementation khác nhau |

Trong Playwright:

- Dùng `test.skip()` cho prerequisite không có và ghi lý do.
- Dùng annotation `SRS_GAP` cho khác biệt tài liệu.
- Không `return` âm thầm rồi để case pass.

## 10. Chiến lược suite

### Smoke

- Login và chọn scope.
- Mở route chính.
- API list chính trả thành công.
- Nút/action P0 đúng permission.
- Không tạo dữ liệu hoặc chỉ tạo dữ liệu có cleanup chắc chắn.

### Regression

- CRUD.
- Validation boundary.
- Permission theo role/scope.
- State transition.
- Side effect kho, tiền, công nợ, khuyến mãi.

### Destructive/financial

- Tách project riêng.
- Chỉ chạy trên tenant/shop test.
- Không chạy song song nếu dùng chung tồn kho/quỹ/công nợ.
- Có snapshot trước/sau và cleanup/compensating transaction.

## 11. Checklist review script

- [ ] Route lấy từ code, không đoán.
- [ ] API lấy từ service frontend hoặc backend contract.
- [ ] Không có credential hard-code.
- [ ] Locator không dùng index/tọa độ nếu có cách định danh tốt hơn.
- [ ] Không dùng timeout cố định để đồng bộ luồng chính.
- [ ] Mutation chờ đúng response.
- [ ] Kiểm tra cả HTTP status và `String(status.code) === '200'`.
- [ ] Verify dữ liệu bằng detail/search/API liên quan.
- [ ] Test data unique khi chạy parallel.
- [ ] Cleanup chạy cả khi assertion fail.
- [ ] Thiếu prerequisite thì skip rõ lý do, không pass giả.
- [ ] Report có trace/screenshot/video khi fail.
- [ ] Test chạy độc lập và chạy lại không lỗi do dữ liệu cũ.

Nguyên tắc cuối cùng: số lượng test ít nhưng có assertion UI, response và dữ liệu rõ ràng có giá trị hơn một suite lớn chỉ xác nhận “màn hình có text”.
