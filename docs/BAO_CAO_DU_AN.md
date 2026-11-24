# Báo cáo thiết kế PC Builder NoSQL

## Phạm vi và kết quả

Hệ thống bán linh kiện và xây dựng cấu hình PC dùng Next.js, FastAPI và MongoDB. Báo cáo trình bày lựa chọn mô hình dữ liệu, luồng đặt hàng, thống kê doanh thu và phương pháp đo index. Số liệu hiệu năng chỉ được công nhận khi có kết quả chạy thực tế; không suy diễn thời gian truy vấn từ code.

## Mô hình năm collection

| Collection | Dữ liệu nhúng | Lý do |
| --- | --- | --- |
| products | category, brand, specs, images | Đọc một sản phẩm và thuộc tính theo loại trong một document |
| users | cart gồm SKU và số lượng | Cập nhật giỏ hàng theo tài khoản, giới hạn kích thước giỏ |
| orders | items snapshot, shipping_address, dates | Giữ lịch sử mua dù tên, giá hoặc danh mục sản phẩm thay đổi |
| pc_builds | components snapshot | Cấu hình chia sẻ có dữ liệu linh kiện tại thời điểm lưu |
| locations | districts chứa wards | Chọn địa chỉ ba cấp với một truy vấn |

## Denormalization và snapshot

Tên danh mục và thương hiệu được nhúng vào products, giảm các lần đọc bổ sung khi hiển thị danh sách. Khi đổi tên thương hiệu trên toàn hệ thống, ứng dụng phải chủ động cập nhật các bản sao liên quan; đây là chi phí của denormalization.

Mỗi order item giữ SKU, product_id, name, unit_price, quantity và category ở thời điểm mua. Doanh thu theo danh mục lấy từ snapshot này, không tra ngược danh mục hiện tại. Đơn cũ chưa lưu category được nhóm vào “Chưa phân loại (đơn cũ)” để không gán sai lịch sử.

Giỏ hàng chỉ tham chiếu SKU, không tin giá từ client. Khi đặt hàng, server kiểm tra tồn kho, giá và địa chỉ rồi mới tạo snapshot. Giá thay đổi so với expected_total trả lỗi để khách xác nhận lại.

## Embedding và referencing

| Tiêu chí | Embedding | Referencing |
| --- | --- | --- |
| Đọc dữ liệu cùng nhau | Một document chứa dữ liệu liên quan | Thường cần đọc bổ sung |
| Cập nhật dữ liệu dùng chung | Có thể cần cập nhật nhiều bản sao | Đổi tại nguồn dùng chung |
| Lịch sử giá và tên | Snapshot độc lập phù hợp đơn hàng | Dữ liệu hiện tại có thể khác lúc mua |
| Kích thước | Cần giới hạn mảng, tránh document quá lớn | Phù hợp dữ liệu liên quan tăng không giới hạn |

Hệ thống kết hợp hai cách: users.cart tham chiếu SKU, orders.items nhúng snapshot. Không nhúng mọi đơn hàng vào user vì số đơn có thể tăng không giới hạn; orders giữ user_id và có index phục vụ truy vấn lịch sử.

## Toàn vẹn và transaction

Đặt hàng dùng session.with_transaction với readConcern snapshot và writeConcern majority. Trong cùng transaction: kiểm tra giỏ, kiểm tra địa chỉ, đọc giá, trừ kho có điều kiện stock >= quantity, ghi order snapshot và cập nhật giỏ. Lỗi ghi đơn khiến các thay đổi trong transaction bị rollback. Unique index user_id + request_id chống tạo hai đơn cho cùng yêu cầu gửi lại.

Quản trị chỉ chuyển Chờ xác nhận sang Đang giao hoặc Đã hủy; Đang giao sang Đã giao hoặc Đã hủy. Đơn đã giao và đã hủy là trạng thái cuối. Hủy đơn hoàn kho trong cùng transaction; gửi lại cùng trạng thái không hoàn kho lần hai. Đơn COD khi giao được ghi nhận đã thanh toán. Chuyển khoản chưa có tích hợp ngân hàng nên không tự xác nhận thanh toán.

## Ba pipeline doanh thu

1. Theo tháng: match đơn đã giao, chuyển created_at về date, lọc năm theo múi giờ Việt Nam, unwind items, group theo tháng và sum quantity × unit_price, sort tăng dần. API điền tháng không có đơn bằng 0.
2. Top 10: match đơn đã giao, unwind items, group theo SKU, sum số lượng và doanh thu snapshot, sort theo số lượng giảm dần, limit 10.
3. Theo danh mục: match đơn đã giao, unwind items, group theo category.name snapshot, sum doanh thu và số lượng, sort theo doanh thu giảm dần.

Đơn mới trong KPI được định nghĩa là đơn đang Chờ xác nhận. Tổng đơn bao gồm mọi trạng thái. Doanh thu và lượt bán chỉ tính Đã giao. Biểu đồ tháng lọc theo năm; tỷ trọng danh mục và top 10 tính toàn thời gian. Các định nghĩa này được hiển thị trên dashboard.

## Index và phép đo executionStats

Text index trên name, brand.name, description và sku hỗ trợ tìm kiếm văn bản; wildcard specs.$** hỗ trợ specs đa hình. Unique SKU, username và email bảo vệ danh tính. Các index orders hỗ trợ lịch sử và chống trùng request.

Chạy từ thư mục backend:

```powershell
.\.venv\Scripts\python.exe scripts\benchmark_indexes.py
```

Công cụ tạo database tạm week3_benchmark_ với 10.000 sản phẩm tổng hợp, 100 sản phẩm socket AM5. Đo truy vấn giống nhau trước khi tạo wildcard index và sau khi tạo index với hint xác định. Không drop index hay sửa dữ liệu database ứng dụng. Database tạm được xóa khi hoàn tất; database user cần quyền tạo/xóa database thử nghiệm.

Kết quả lưu docs/index-benchmark.json, bao gồm winningPlan và executionStats đầy đủ. Đối chiếu nReturned bằng nhau, totalDocsExamined, totalKeysExamined và executionTimeMillis. Thời gian nhỏ có thể bằng 0 ms và chịu ảnh hưởng cache, nên không kết luận tốc độ từ một lần chạy. Đây là phép đo dữ liệu tổng hợp; không đại diện toàn bộ tải production.

Khi có kết quả, mở hai nhánh before/after trong JSON bằng VS Code hoặc Compass và chụp winningPlan/executionStats để đưa vào bản nộp. Chưa có kết quả chạy thì không ghi số liệu hay hình ảnh giả định vào báo cáo.

## Bảo mật và giao diện

API admin yêu cầu quyền admin tại server; frontend kiểm tra phiên và quyền trước khi hiển thị. Các thao tác ghi kiểm tra Origin. Token lưu cookie HttpOnly, không đưa MongoDB URI vào frontend. Product input kiểm tra số âm, số không hữu hạn và tên khóa specs không hợp lệ. Frontend có skeleton, thông báo lỗi, nút tải lại và toast sau thao tác thành công. Bảng dài có cuộn ngang trên màn hình nhỏ.

## Giới hạn

Chưa có cổng thanh toán hoặc xác minh giao dịch ngân hàng. Xóa sản phẩm không xóa snapshot đơn hàng; cart có SKU đã xóa hiển thị không còn bán. Số liệu đơn cũ không có category snapshot không tự phục hồi được chính xác nên được ghi rõ là chưa phân loại. Merge dev vào main cần review và phê duyệt trước khi thực hiện.
