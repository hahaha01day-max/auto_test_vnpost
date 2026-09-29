
**Thay đổi quan trọng so với phương án tôi nêu trước:** script so **ba chiều**, không so thẳng Excel với CSV. Khi chạy dry-run so thẳng file Excel ở máy với CSV hiện tại, script báo 46 ô "khác", nhưng phần lớn là do CSV đã được sửa **sau** khi upload (ví dụ các kỳ vọng "User chốt 28/09"). Nếu áp cách so thẳng thì bản mới ở máy sẽ bị ghi đè bằng bản Excel cũ.

**Cách script xử lý từng ô:**
- **Gốc** là bản Excel đã upload cho QC, mặc định `test-case-qc/_tong-hop-test-case.xlsx`.
- QC không sửa so với bản gốc: giữ nguyên CSV.
- QC sửa và máy chưa sửa: ghi nội dung QC vào CSV.
- QC sửa và máy cũng đã sửa: báo **xung đột**, không ghi. Bạn tự quyết từng ô.
- QC xoá case: thêm cột `Trang thai QC = QC_XOA`, không xoá dòng. Case thêm ở máy sau khi upload không bị coi là QC xoá. Nếu QC thêm lại case đó thì script tự bỏ đánh dấu.
- QC thêm case: script thêm dòng mới vào CSV của phân hệ tương ứng.
- Chỉ đụng 5 cột bạn yêu cầu. Các cột `Task` và `Trang thai chay` giữ nguyên, các dòng không đổi cũng giữ nguyên từng byte.

**Cách dùng:**
1. Tải bản QC từ Drive về một **tên khác**, giữ nguyên `_tong-hop-test-case.xlsx` làm bản gốc.
2. Chạy thử, chỉ ghi báo cáo `test-case-qc/_dong-bo-qc.md`:
   ```bash
   node tool/bin/dong-bo-tu-qc.js --file tai-lieu-test/test-case-qc/qc-ban-moi.xlsx
   ```
3. Xem báo cáo, nhất là mục **Xung đột** và mục **Ô mất ghi chú 🔴** (khi ghi nội dung QC đè lên, ghi chú 🔴 và link trong ô đó mất). Rồi mới ghi thật:
   ```bash
   node tool/bin/dong-bo-tu-qc.js --file tai-lieu-test/test-case-qc/qc-ban-moi.xlsx --apply
   ```
4. Sinh lại bản QC và upload lại. Bản này sẽ làm gốc cho lần đồng bộ sau:
   ```bash
   node tool/bin/to-qc-csv.js && node tool/bin/qc-csv-to-xlsx.js --gop
   ```

**Hai điểm cần biết:**
- Phân hệ `50_toan_trinh` không có sheet trong Excel, nên script bỏ qua và không đánh dấu xoá gì.
- Case `QC_XOA` hiện chỉ được loại khỏi bản giao QC. Các tool chạy auto test (`run.js`, `checklist.js`…) chưa đọc cột này nên vẫn chạy những case đó. Bạn có muốn cho các tool đó bỏ qua luôn không?