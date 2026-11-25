# Kiểm thử và kịch bản demo tuần 3

## Chuẩn bị

1. Cấu hình backend/.env dùng Atlas; frontend/.env.local trỏ API /api/v1. Không đưa secrets vào Git.
2. Tại backend chạy database/seed.py. Để tạo admin mẫu, đặt SEED_ADMIN_PASSWORD trong .env trước khi seed; username admin lấy từ seed_data.json. Không tự nâng quyền từ màn hình đăng ký.
3. Cài dependency frontend bằng npm install, khởi động backend và npm run dev.
4. Chuẩn bị hai tài khoản riêng: customer và admin.

## Ma trận nghiệm thu

| Nhóm | Thao tác | Kết quả |
| --- | --- | --- |
| Auth | Customer mở /admin và gọi API /admin/products | UI từ chối; API trả 403 |
| Auth | Chưa đăng nhập gọi API quản trị | 401 |
| Sản phẩm | Tạo SKU mới và specs có socket, tdp_watt | Lưu đúng kiểu, khách tìm thấy sản phẩm |
| Sản phẩm | Tạo trùng SKU, giá âm, tồn kho thập phân, specs có khóa $ | 409 hoặc 422, dữ liệu không đổi |
| Sản phẩm | Sửa giá, tồn kho và trường specs rồi tải lại | Dữ liệu đúng với server |
| Sản phẩm | Xóa SKU thử nghiệm | Không còn trong danh mục, snapshot cũ vẫn giữ |
| Builder | Chọn CPU/main lệch socket, RAM lệch chuẩn, PSU yếu | Báo xung đột, ngăn thêm toàn bộ |
| Builder | Lưu cấu hình và mở link khi chưa đăng nhập | Xem được cấu hình chia sẻ |
| Giỏ hàng | Thay số lượng rồi tải lại | users.cart giữ số lượng đúng |
| Checkout | Chọn địa chỉ 3 cấp và đặt đơn | Kho giảm, snapshot đúng, giỏ cập nhật |
| Checkout | Gửi lại request_id | Một đơn, chỉ trừ kho một lần |
| Đơn hàng | Chờ xác nhận → Đang giao → Đã giao | Trạng thái đúng; COD chuyển đã thanh toán |
| Đơn hàng | Thử Đã giao → Đã hủy | 409, kho không đổi |
| Hủy | Hủy đơn chờ, gửi lại trạng thái hủy | Kho hoàn đúng một lần |
| Dashboard | Đơn chờ, đơn hủy, đơn đã giao cùng tồn tại | Doanh thu chỉ gồm Đã giao |
| Dashboard | Đổi năm | 12 tháng đúng năm, tháng trống = 0 |
| Snapshot | Đổi tên/giá/danh mục sản phẩm sau khi mua | Đơn và doanh thu lịch sử không đổi |
| Responsive | Màn hình 375px và desktop | Form dùng được, bảng cuộn ngang, biểu đồ vừa khung |
| Lỗi mạng | Ngắt backend rồi mở quản trị | Hiện lỗi và tải lại, không hiện số liệu giả |

## Các lệnh kiểm tra

Trong backend:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
$env:TEST_MONGODB_URI = .\.venv\Scripts\python.exe -c "from app.core.config import settings; print(settings.MONGODB_URI)"
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
Remove-Item Env:\TEST_MONGODB_URI
.\.venv\Scripts\python.exe scripts\benchmark_indexes.py
```

Test tích hợp tạo/xóa database week2_test_ riêng; benchmark dùng week3_benchmark_ riêng. Database user cần quyền trên các database thử nghiệm. Không chạy với tài khoản chỉ có readWrite một database cố định.

Trong frontend:

```powershell
npm run build
```

## Demo bảo vệ khoảng 8 phút

1. Giới thiệu 5 collection và specs đa hình (1 phút).
2. Customer lọc sản phẩm, thử lệch socket rồi chọn cấu hình phù hợp (1 phút).
3. Lưu link chia sẻ, thêm giỏ và đặt hàng địa chỉ 3 cấp (1 phút).
4. Trên Atlas mở order snapshot, đối chiếu giá và kho (1 phút).
5. Admin thêm/sửa specs linh kiện thử nghiệm (1 phút).
6. Chuyển đơn sang Đang giao rồi Đã giao; mở dashboard xem doanh thu (1 phút).
7. Hủy một đơn khác để minh họa hoàn kho một lần (1 phút).
8. Mở kết quả executionStats trước/sau index và giải thích embedding/referencing (1 phút).

## Bàn giao Git

Tạo Pull Request vào dev, nhờ thành viên còn lại review/approve, chạy kiểm thử Atlas và lưu bằng chứng. Chỉ merge dev vào main sau khi đạt nghiệm thu. Không tự động merge trong lúc sửa code.
