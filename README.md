# 🖥️ PC BUILDER E-COMMERCE (HỆ THỐNG XÂY DỰNG CẤU HÌNH & BÁN LINH KIỆN PC)
> **Đồ án môn học:** Cơ sở dữ liệu Phi quan hệ (NoSQL - MongoDB)  
> **Kiến trúc:** Monorepo (FastAPI + Motor + MongoDB & Next.js 14 + Tailwind CSS)  
> **Nhóm thực hiện:** 02 thành viên

---

## 📌 1. TỔNG QUAN ĐỀ TÀI & ĐẶT VẤN ĐỀ

Trong mô hình thương mại điện tử linh kiện máy tính, các sản phẩm có đặc tính thông số kỹ thuật (**Specs**) cực kỳ đa dạng và biến đổi theo từng nhóm linh kiện:
- **CPU**: Cần `socket`, `cores`, `threads`, `base_clock`, `boost_clock`, `tdp_watt`...
- **Mainboard**: Cần `socket`, `chipset`, `form_factor`, `ram_type`, `ram_slots`, `max_ram_speed`...
- **RAM**: Cần `ram_type` (DDR4/DDR5), `capacity_gb`, `bus_speed`...
- **Card đồ họa (GPU)**: Cần `vram_gb`, `tdp_watt`, `recommended_psu_watt`...
- **Nguồn (PSU)**: Cần `wattage`, `efficiency_rating` (80+ Bronze, Gold)...

Khi lưu trữ trên cơ sở dữ liệu quan hệ (RDBMS - SQL), hệ thống thường rơi vào một trong hai cạm bẫy:
1. **Bảng quá rộng (Wide Sparse Table):** Cột thừa thãi, phần lớn mang giá trị `NULL`.
2. **Mô hình EAV (Entity-Attribute-Value):** Quá nhiều bảng nối (`JOIN`), làm suy giảm hiệu năng nghiêm trọng khi truy vấn bộ lọc linh kiện động.

👉 **Giải pháp NoSQL (MongoDB):** Áp dụng **Polymorphic Schema Pattern** (Schema đa hình) với thuộc tính `specs` linh hoạt, kết hợp **Wildcard Index (`specs.$**`)** và **Document Embedding** giúp tối ưu hóa hiệu năng truy vấn, loại bỏ hoàn toàn các phép JOIN phức tạp và phản ánh trực quan nghiệp vụ máy tính thực tế.

---

## 🔄 2. BẢNG ĐỐI CHIẾU CHUYỂN ĐỔI: TỪ SQL SANG NOSQL (MONGODB)

Hệ thống được chuyển đổi và nâng cấp trực tiếp từ mô hình cơ sở dữ liệu quan hệ cũ (file `dbphiquanhe.txt`):

| Nghiệp vụ | Mô hình Cũ (SQL Server) | Mô hình Mới (MongoDB NoSQL) | Lý do kiến trúc & Lợi ích |
| :--- | :--- | :--- | :--- |
| **Linh kiện & Phân loại** | 3 bảng: `SanPham`, `LoaiSanPham`, `CongTy` (nối qua `idLoaiSanPham`, `idCongTy`). | **1 Collection:** `products`<br>Nhúng `category: {id, name}` và `brand: {id, name}`. | **Denormalization:** Loại bỏ phép JOIN giữa 3 bảng. Khi hiển thị card sản phẩm, lấy toàn bộ thông tin chỉ trong 1 lần đọc disk. |
| **Thông số kỹ thuật linh kiện** | Cột `thongSoSanPham NVARCHAR(MAX)` dạng chuỗi text thô xuống dòng, không thể lọc bằng toán tử số học. | Trường **`specs` đa hình (Polymorphic)** dạng BSON Object lồng nhau. | Hỗ trợ lọc động: `specs.socket = "LGA 1700"`, `specs.tdp_watt <= 150`. Đánh **Wildcard Index** `"specs.$**"`. |
| **Đơn đặt hàng & Chi tiết** | 2 bảng: `DonDatHang` (1) và `ChiTietDonHang` (N) nối qua Foreign Key `idDonDat`. | **1 Collection:** `orders`<br>Nhúng mảng `items: [...]`. | **Snapshot Pattern:** Lưu giữ nguyên giá (`unit_price`) và tên sản phẩm tại thời điểm mua. Độc lập khi sản phẩm gốc đổi giá hay bị xóa. |
| **Giỏ hàng** | Bảng trung gian `ChiTietGioHang`. | Nhúng mảng `cart: [...]` trực tiếp trong collection `users`. | Giỏ hàng gắn liền theo vòng đời người dùng, truy xuất cực nhanh theo Session. |
| **Địa giới hành chính** | 3 bảng quan hệ phân cấp: `Tinh` (1) -> `Huyen` (N) -> `XaPhuong` (N). | **1 Collection:** `locations`<br>Nhúng phân cấp lồng nhau: Tỉnh chứa mảng `districts`, mỗi quận/huyện chứa mảng `wards`. | Dữ liệu địa chỉ hiếm khi thay đổi (Read-heavy). Truy vấn 1 document duy nhất lấy trọn vẹn cây địa chỉ cho dropdown chọn tỉnh thành. |
| **Cấu hình PC tự dựng** | *(Chưa có trong SQL cũ)* | **1 Collection:** `pc_builds`<br>Lưu snapshot linh kiện, tổng công suất, và kiểm tra tương thích. | Phục vụ tính năng cốt lõi: Tính toán tương thích socket, chuẩn RAM, công suất PSU real-time. |

---

## 🏗️ 3. SƠ ĐỒ KIẾN TRÚC HỆ THỐNG

```
[ Frontend: Next.js 14 App Router (Port 3000) ]
   ├── Trang chủ (Hero & Sản phẩm nổi bật)
   ├── Danh mục linh kiện (Bộ lọc specs động qua Wildcard Index)
   ├── PC Builder Engine (Chọn linh kiện, tính TDP, kiểm tra tương thích)
   ├── Giỏ hàng & Đặt hàng (Snapshot Pattern)
   └── Admin Dashboard (Biểu đồ thống kê MongoDB Aggregation)
          │
          │ HTTP RESTful API (JSON)
          ▼
[ Backend: Python FastAPI (Port 8000) ]
   ├── /api/v1/auth        (Đăng ký, JWT & phân quyền)
   ├── /api/v1/products    (Dynamic Filter & Text Search)
   ├── /api/v1/pc-builder     (Compatibility Validation Engine)
   ├── /api/v1/orders         (Order checkout with Snapshot)
   ├── /api/v1/analytics      (Aggregation Pipelines: Doanh thu, Tồn kho)
   └── /api/v1/locations      (Single-document Nested Locations)
          │
          │ Async Driver (motor)
          ▼
[ Database: MongoDB 6.0+ (Port 27017 / Atlas Cloud) ]
   Database Name: "QuanLyThietBiMayTinh"
   ├── products   (Text Index: name, Wildcard Index: specs.$**)
   ├── orders     (Snapshot items array, status, dates)
   ├── users      (Embedded cart, role)
   ├── pc_builds  (Saved configurations, estimated wattage)
   └── locations  (Hierarchical province -> districts -> wards)
```

---

## 👥 4. BẢNG PHÂN CHIA NHIỆM VỤ CHI TIẾT (NHÓM 2 NGƯỜI)

| Thành viên | Trách nhiệm chính (Modules & Nghiệp vụ) | Chi tiết kỹ thuật NoSQL & Code |
| :--- | :--- | :--- |
| **Thành viên 1** *(Core Products & PC Builder)* | **1. Quản lý Sản phẩm & Bộ lọc Dynamic Specs**<br>- Thiết kế schema đa hình `products.specs`<br>- Xây dựng API `/api/v1/products` hỗ trợ tìm kiếm toàn văn (Text Search) và lọc theo thuộc tính lồng nhau.<br><br>**2. Tính năng PC Builder & Kiểm tra tương thích**<br>- Xây dựng thuật toán kiểm tra Socket (CPU vs Mainboard), chuẩn RAM (DDR4 vs DDR5), và tính tổng công suất TDP so sánh với công suất PSU.<br>- Giao diện trang `/pc-builder` trực quan, cho phép người dùng chọn linh kiện theo từng khe cắm. | - Thiết lập Text Index trên `name`<br>- Thiết lập Wildcard Index trên `specs.$**`<br>- Xây dựng router `pc_builder.py` với logic validation chuyên sâu.<br>- Frontend: `app/products/page.tsx` và `app/pc-builder/page.tsx`. |
| **Thành viên 2** *(Users, Orders & Analytics)* | **1. Xác thực, Giỏ hàng & Quản lý Đặt hàng**<br>- Quản lý tài khoản `users`, giỏ hàng nhúng `users.cart`.<br>- API đặt hàng `/api/v1/orders`: Áp dụng Snapshot Pattern lưu lịch sử đơn hàng, cập nhật trừ tồn kho `stock`.<br><br>**2. Admin Dashboard & Báo cáo Thống kê NoSQL**<br>- Viết các MongoDB Aggregation Pipelines phức tạp (`$match`, `$unwind`, `$group`, `$sort`) thống kê doanh thu theo trạng thái, top 5 sản phẩm bán chạy.<br>- Cảnh báo hàng tồn kho dưới ngưỡng an toàn (`min_stock_alert`). | - Áp dụng MongoDB Transaction / Atomic Updates (`$inc`) trừ `stock`.<br>- Pipeline thống kê đa chiều cho Admin Dashboard.<br>- Quản lý collection `locations` phục vụ địa chỉ giao hàng.<br>- Frontend: `app/cart/page.tsx`, `app/orders/page.tsx` và `app/admin/page.tsx`. |

---

## 🚀 5. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY TỪ A–Z

### Bước 1: Chuẩn bị Cơ sở dữ liệu MongoDB
Hệ thống hỗ trợ cả MongoDB cài cục bộ và MongoDB Atlas trên Cloud:
- **Lựa chọn A (Local MongoDB):** Chạy MongoDB Service hoặc tiến trình mongod trên cổng mặc định `27017`.
- **Lựa chọn B (MongoDB Atlas Cloud):** Lấy chuỗi kết nối dạng `mongodb+srv://<user>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority` và điền vào `backend/.env`.

---

### Bước 2: Cài đặt và Khởi động Backend (FastAPI)
Mở cửa sổ Terminal thứ nhất:

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Tạo môi trường ảo Python (Virtual Environment)
python -m venv .venv

# 3. Kích hoạt môi trường ảo
# Trên Windows (PowerShell):
.venv\Scripts\Activate.ps1
# Trên Linux/macOS:
source .venv/bin/activate

# 4. Cài đặt các thư viện cần thiết
pip install -r requirements.txt

# 5. Khởi tạo Schema Validation, Indexes và Nạp dữ liệu mẫu vào MongoDB
python database/seed.py

# 6. Khởi động server FastAPI
python main.py
# Server sẽ chạy tại: http://localhost:8000
# Xem tài liệu API tự động tại: http://localhost:8000/docs
```

---

### Bước 3: Cài đặt và Khởi động Frontend (Next.js)
Mở cửa sổ Terminal thứ hai:

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt dependencies (Next.js, Tailwind CSS, Lucide Icons)
npm install

# 3. Khởi động môi trường phát triển (Development Server)
npm run dev
# Truy cập giao diện tại: http://localhost:3000
```

---

## 🧪 6. KIỂM THỬ CÁC TÍNH NĂNG CỐT LÕI

1. **Kiểm tra Schema & Dữ liệu Seed:**
   - Mở MongoDB Compass, kết nối tới database `QuanLyThietBiMayTinh`.
   - Kiểm tra 5 collections: `products` (26 linh kiện mẫu), `orders` (các đơn hàng mẫu có snapshot), `users`, `locations` (Tỉnh/Huyện/Xã lồng nhau), `pc_builds`.
   - Xem tab **Indexes** của `products` để xác nhận đã tạo `idx_text_name_brand_desc` và `idx_wildcard_specs`.
2. **Kiểm tra Bộ lọc Specs động:**
   - Mở `http://localhost:3000/products`, chọn danh mục "CPU" và lọc socket "LGA 1700" hoặc "AM4".
3. **Kiểm tra Engine Tương Thích PC Builder:**
   - Mở `http://localhost:3000/pc-builder`.
   - Thử chọn **Intel Core i5-12400F** (Socket LGA 1700) kết hợp với **ASUS ROG Strix B550-F** (Socket AM4) 👉 Hệ thống sẽ lập tức cảnh báo đỏ: *Không tương thích Socket!*
   - Thử chọn **Gigabyte Z690** (Hỗ trợ DDR5) kết hợp với **Kingston Fury DDR4** 👉 Hệ thống sẽ cảnh báo: *Chuẩn RAM không khớp!*
   - Hệ thống tự động tính tổng TDP của CPU, GPU và cộng dự phòng để khuyến nghị công suất nguồn PSU phù hợp.
4. **Kiểm tra Admin Dashboard (Aggregation Pipeline):**
   - Mở `http://localhost:3000/admin` để xem doanh thu, thống kê đơn hàng, và danh sách sản phẩm cảnh báo sắp hết hàng.

## Bàn giao tuần 1

- Backend dùng tiền tố API chính `/api/v1`. Swagger UI mở tại [localhost:8000/docs](http://localhost:8000/docs).
- Sau khi cấu hình `backend/.env`, chạy `python database/seed.py` trong `backend` để tạo 5 collections, validators, indexes và 26 linh kiện mẫu. Chạy `python database/schema_validation.py` khi chỉ cần áp dụng validators và indexes.
- Đặt `JWT_SECRET` thành chuỗi ngẫu nhiên riêng để giữ phiên sau khi khởi động lại hoặc dùng nhiều worker. Khi triển khai HTTPS, đặt `AUTH_COOKIE_SECURE=true` và thêm địa chỉ frontend vào `ALLOWED_ORIGINS`.
- Đặt `SEED_ADMIN_PASSWORD` riêng trong `backend/.env` trước khi chạy seed để kích hoạt tài khoản admin mẫu. Đăng ký trên website luôn tạo tài khoản customer. Gọi `GET /api/v1/auth/me` để kiểm tra phiên và `GET /api/v1/analytics/overview` để xác nhận quyền truy cập.
- Cấu hình `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api/v1` trong `frontend/.env.local` khi chạy trên máy. Next.js chuyển tiếp yêu cầu đến FastAPI và trình duyệt nhận phiên qua cookie HttpOnly.
- Tại `/products`, thử tìm AMD, chọn CPU và socket AM5, lọc GPU với VRAM từ 10 GB, lọc RAM với dung lượng từ 32 GB, đặt khoảng giá, đổi cách sắp xếp và chuyển trang. Bấm tên linh kiện để mở chi tiết.
- Kiểm tra `GET /api/v1/products?q=AMD&socket=AM5&sort=price_asc&limit=9&skip=0` hoặc dùng lọc thông số tùy chỉnh như `GET /api/v1/products?spec.cores=8`.
- Trang chủ lấy danh mục từ MongoDB. Danh sách bán chạy dựa trên tổng số linh kiện của đơn đã giao.

## Bàn giao tuần 2

### Chức năng khách hàng

- Mở /build-pc để chọn CPU, mainboard, RAM, GPU, ổ đĩa, PSU, case và tản nhiệt. Hệ thống kiểm tra socket, chuẩn RAM, công suất nguồn, tản nhiệt và kích thước GPU. Tổng giá lấy từ danh mục hiện tại.
- Bấm Lưu và chia sẻ để lưu snapshot cấu hình vào pc_builds. Liên kết /build-pc?share=... mở được khi chưa đăng nhập. Khi mở lại, hệ thống kiểm tra tương thích với dữ liệu danh mục hiện tại.
- Đăng nhập và thêm linh kiện từ trang chủ, danh sách sản phẩm hoặc thêm cả cấu hình vào giỏ hàng. Giỏ hàng lưu trong users.cart và được đồng bộ sau khi tải lại trang.
- Mở /cart để tăng giảm số lượng, xóa linh kiện hoặc xóa giỏ hàng. Linh kiện thiếu hàng được cảnh báo.
- Mở /checkout để chọn địa chỉ từ locations theo ba cấp và xác nhận đơn hàng. Giá, tên và tổng tiền được tính lại ở backend. Đơn mới ở trạng thái Chờ xác nhận và Chưa thanh toán.
- Trang /account/orders hiển thị lịch sử và snapshot của tài khoản đang đăng nhập. Các đường dẫn cũ /pc-builder và /orders vẫn truy cập được.

### Chuẩn bị MongoDB cho đặt hàng

Luồng đặt hàng dùng session.with_transaction để trừ kho, tạo snapshot đơn và cập nhật giỏ hàng cùng nhau. Kết nối MongoDB phải hỗ trợ transaction, sử dụng MongoDB Atlas hoặc replica set local.

Sau khi cập nhật code, chạy trong thư mục backend để áp dụng validator trạng thái Chờ xác nhận và index chống tạo trùng đơn.

```powershell
.\.venv\Scripts\python.exe database\schema_validation.py
```

Nếu đang dùng Atlas, giữ kết nối Atlas trong backend/.env rồi chạy seed khi cần bổ sung dữ liệu mẫu.

Nếu MongoDB local hiện tại là standalone, có thể tạo một instance replica set riêng cho đồ án trên cổng 27018. Instance mới dùng dữ liệu riêng trong backend/.mongo-rs. Cần nạp seed và đăng ký tài khoản trên instance này. Các lệnh sau dùng phiên bản MongoDB 8.3 đã cài trên máy.

Trong PowerShell thứ nhất, chạy tại thư mục dự án.

```powershell
cd C:\Dev_CSDLPQH
New-Item -ItemType Directory -Force backend\.mongo-rs
& "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "C:\Dev_CSDLPQH\backend\.mongo-rs" --replSet rs0 --bind_ip 127.0.0.1 --port 27018
```

Giữ tiến trình đó chạy. Trong PowerShell thứ hai, khởi tạo replica set một lần.

```powershell
cd C:\Dev_CSDLPQH\backend
.\.venv\Scripts\python.exe -c "from pymongo import MongoClient; c=MongoClient('mongodb://127.0.0.1:27018/?directConnection=true'); c.admin.command('replSetInitiate', {'_id':'rs0','members':[{'_id':0,'host':'127.0.0.1:27018'}]}); print('Replica set initialized')"
```

Sửa dòng MONGODB_URI trong backend/.env thành giá trị sau rồi lưu file.

```env
MONGODB_URI=mongodb://127.0.0.1:27018/?replicaSet=rs0
```

Chờ replica set có primary rồi nạp dữ liệu và chạy backend.

```powershell
.\.venv\Scripts\python.exe database\seed.py
.\.venv\Scripts\python.exe main.py
```

Nếu đã khởi tạo rs0 trước đó, chỉ cần khởi động mongod bằng lệnh ở trên và chạy backend.

### API tuần 2

| Method | Endpoint | Nội dung |
| --- | --- | --- |
| POST | /api/v1/builder/check-compatibility | Kiểm tra các mã linh kiện theo slot |
| POST | /api/v1/builder/share | Lưu cấu hình của người dùng đã đăng nhập |
| GET | /api/v1/builder/share/{build_code} | Xem cấu hình được chia sẻ |
| GET | /api/v1/builder/builds | Cấu hình đã lưu của tài khoản |
| GET | /api/v1/cart | Giỏ hàng và giá hiện tại |
| POST | /api/v1/cart/items | Thêm một hoặc nhiều linh kiện |
| PUT | /api/v1/cart/items/{sku} | Đặt số lượng linh kiện |
| DELETE | /api/v1/cart/items/{sku} | Xóa linh kiện |
| DELETE | /api/v1/cart | Xóa giỏ hàng |
| POST | /api/v1/orders | Đặt hàng bằng transaction |
| GET | /api/v1/orders | Lịch sử đơn hàng theo quyền |
| GET | /api/v1/orders/{order_code} | Chi tiết snapshot theo quyền |

Đặt hàng nhận request_id duy nhất cho mỗi lần mua. Gửi lại cùng request_id trả về đơn đã tạo. Frontend giữ request_id khi gửi lại yêu cầu sau lỗi mạng. API chỉ nhận SKU và số lượng từ giỏ hàng, tự lấy tên, giá và tài khoản ở server. Các phương thức COD và Chuyển khoản đều chờ xác nhận thanh toán của cửa hàng.

### Kiểm thử tuần 2

Chạy kiểm thử logic tại thư mục backend.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Để chạy thêm kiểm thử với MongoDB replica set local trên cổng 27018, đặt biến môi trường trong PowerShell.

```powershell
$env:TEST_MONGODB_URI="mongodb://127.0.0.1:27018/?replicaSet=rs0"
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
Remove-Item Env:\TEST_MONGODB_URI
```

Kiểm thử tích hợp tạo một database week2_test_ có mã ngẫu nhiên cho mỗi test rồi xóa đúng database đó khi xong. Các ca kiểm thử gồm đặt hàng, gửi lại yêu cầu, giá thay đổi, rollback khi ghi đơn thất bại, hai khách cùng mua sản phẩm cuối và quyền truy cập đơn hàng.

Kiểm tra giao diện bằng cách đăng ký tài khoản, chọn CPU SP01 với mainboard SP05 để thấy lỗi socket, chọn mainboard SP07 với RAM SP08 để thấy lỗi chuẩn RAM, lưu liên kết chia sẻ, thêm linh kiện hợp lệ vào giỏ, thay số lượng, đặt hàng và mở lịch sử. Đăng nhập tài khoản khác để kiểm tra lịch sử được giới hạn theo tài khoản.

## Bàn giao tuần 3

Các trang quản trị yêu cầu tài khoản role admin:

- `/admin`: KPI doanh thu đơn đã giao, đơn chờ xác nhận, sản phẩm, người dùng; biểu đồ Recharts theo tháng và theo danh mục; top 10 bán chạy và cảnh báo kho.
- `/admin/products`: thêm/sửa/xóa sản phẩm, tìm kiếm, phân trang, chỉnh thông số linh hoạt và JSON specs.
- `/admin/orders`: xem snapshot, lọc trạng thái, phân trang, cập nhật đơn và hoàn kho khi hủy.

API chính: `/api/v1/admin/products`, `/api/v1/admin/orders`, `/api/v1/admin/orders/{code}/status` và `/api/v1/admin/analytics/{overview,monthly-revenue,category-revenue,top-selling-products,low-stock-alert}`. Các endpoint analytics cũ vẫn hoạt động.

Để kích hoạt tài khoản seed `admin`, đặt `SEED_ADMIN_PASSWORD` trong backend/.env rồi chạy `database/seed.py`. Không đưa mật khẩu vào Git. Các tài khoản đăng ký từ giao diện luôn có role customer.

Sau khi cập nhật source, chạy `npm install` trong frontend để cài Recharts. Khởi động lại backend trước khi dùng API mới.

Tài liệu đi kèm:

- [Báo cáo thiết kế](docs/BAO_CAO_DU_AN.md)
- [Ma trận kiểm thử và demo](docs/KIEM_THU_VA_DEMO.md)
- Công cụ benchmark: `backend/scripts/benchmark_indexes.py`. Chạy từ backend bằng `.\.venv\Scripts\python.exe scripts\benchmark_indexes.py`; kết quả thực tế xuất vào `docs/index-benchmark.json` và `docs/index-benchmark.html`. Công cụ chỉ dùng database thử nghiệm riêng.

Không tự merge dev vào main trước khi review và nghiệm thu Atlas.

## Ảnh sản phẩm

Form quản trị sản phẩm cho phép nhập URL ảnh trực tiếp (mỗi dòng một URL) hoặc chọn nhiều ảnh từ máy tính. Ảnh đầu tiên là ảnh đại diện; có xem trước và bỏ từng ảnh trước khi lưu sản phẩm. Giới hạn 20 ảnh/sản phẩm, 5 MB/ảnh; hỗ trợ JPG, PNG, WebP, GIF. API upload chỉ cho admin và kiểm tra chữ ký file thay vì tin tên file.

Ảnh upload được lưu ở backend/uploads/products với tên ngẫu nhiên và phục vụ qua /backend-api/media/. Thư mục upload không commit vào Git; khi triển khai cần lưu trên ổ đĩa bền vững và sao lưu thư mục này cùng database. Ảnh cũ trong frontend/public/images vẫn được ưu tiên; ảnh chỉ nằm trong images/images của backend được Next.js chuyển tiếp khi frontend không có file tương ứng. URL ngoài phải là link trực tiếp tới ảnh; website nguồn có thể chặn hotlink, khi đó hãy tải file hợp lệ lên.

Kiểm tra upload và đường dẫn bằng lệnh trong backend:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_images -v
```

## Nâng cấp nhập sản phẩm và Build PC

- `/admin/products`: chọn thương hiệu hiện có hoặc thêm thương hiệu mới. Form thông số thay đổi theo CPU, mainboard, RAM, ổ đĩa, VGA, PSU, case, tản nhiệt và màn hình. Có phần JSON nâng cao để giữ các thuộc tính tùy chỉnh. Khi đổi danh mục, form hỏi xác nhận trước khi xóa thông số của loại cũ.
- `/build-pc`: gọi `POST /api/v1/builder/recommendations` để ưu tiên linh kiện còn hàng và chưa có xung đột theo thông số đã chọn. Mặc định ẩn linh kiện xung đột, hết hàng hoặc thiếu dữ liệu để xác minh; bật “Hiển thị cả…” để xem tất cả. Linh kiện đang chọn luôn được giữ và có giải thích lý do.
- `/products/{sku}`: trang chi tiết có bộ ảnh, phóng to, giá/tồn kho, số lượng, thêm giỏ/mua ngay, mô tả, thông số tiếng Việt và sản phẩm cùng loại. Tên/ảnh trên thẻ sản phẩm mở trang riêng; nút hình mắt vẫn mở xem nhanh.

Gợi ý chỉ kiểm tra các quy tắc đã triển khai và dữ liệu đã nhập, không xác nhận mọi yêu cầu lắp ráp vật lý hoặc BIOS. Khi mua vẫn kiểm tra cấu hình và tồn kho tại backend. PSU ưu tiên theo tổng TDP và ngưỡng nguồn khuyến nghị; nguồn thấp hơn ngưỡng khuyến nghị được đánh dấu có lưu ý.

Kiểm tra nhanh: thêm VGA bằng form thay vì JSON; chọn CPU socket AM5 và kiểm tra danh sách mainboard; bật hiển thị tất cả để thấy lý do xung đột; mở sản phẩm từ danh sách, chuyển ảnh, phóng to và thử thêm giỏ.

Chạy các kiểm thử không cần database tại backend:

```powershell
.\.venv\Scripts\python.exe -m unittest tests.test_recommendations tests.test_week2.CompatibilityTests tests.test_week3.ValidationTests tests.test_images -v
```

## Tài khoản, hủy đơn và so sánh sản phẩm

- `/account`: sửa tên/số điện thoại, thêm/sửa/xóa tối đa 10 địa chỉ, chọn địa chỉ mặc định. Sổ địa chỉ nhúng trong users.addresses và default_address_id. Không có API cho khách tự đổi role, email, password_hash hoặc giỏ hàng qua form hồ sơ.
- `/checkout`: tự chọn địa chỉ mặc định nếu khách chưa nhập dữ liệu, có danh sách địa chỉ đã lưu và cho sửa thông tin riêng của đơn. Địa chỉ đơn hàng vẫn là snapshot, không thay đổi khi sửa sổ địa chỉ.
- `/account/orders`: xem đúng đơn của tài khoản hiện tại (kể cả tài khoản admin), tiến trình giao hàng và hủy đơn Chờ xác nhận. API hủy kiểm tra chủ đơn, hoàn kho và ghi trạng thái trong cùng transaction. Gửi lại yêu cầu hủy không hoàn kho lần hai. Admin vẫn quản lý toàn bộ đơn tại /admin/orders.
- `/compare`: chọn 2–4 sản phẩm cùng loại bằng nút So sánh ở thẻ/trang chi tiết. Danh sách SKU lưu cục bộ để giữ khi chuyển trang; bảng lấy giá, tồn kho, thông số mới nhất từ API. Có chế độ chỉ hiện thông số khác nhau, bỏ từng sản phẩm và thêm giỏ hàng. Có thể chia sẻ URL bảng so sánh.

API mới: GET/PATCH /api/v1/account; POST /api/v1/account/addresses; PUT/DELETE /api/v1/account/addresses/{id}; POST /api/v1/account/addresses/{id}/default; GET /api/v1/account/orders; POST /api/v1/orders/{code}/cancel; GET /api/v1/products/compare?skus=SP01&skus=SP02.

Kiểm tra các luồng này:

```powershell
# Trong backend, kiểm thử logic không cần kết nối MongoDB:
.\.venv\Scripts\python.exe -m unittest tests.test_customer_features.AccountTests tests.test_customer_features.CancellationTests tests.test_customer_features.ComparisonTests -v

# Trong frontend:
npm run test:comparison
npm run build
```

Các test transaction thật trong CustomerMongoTests chỉ chạy khi TEST_MONGODB_URI được đặt. Chúng kiểm tra hai yêu cầu hủy đồng thời, hủy đua với chuyển giao hàng, và địa chỉ giới hạn theo chủ tài khoản. Dữ liệu test nằm trong database riêng và được xóa khi hoàn tất.

Demo: sửa hồ sơ → lưu hai địa chỉ và chọn mặc định → đặt hàng bằng địa chỉ đã lưu → hủy đơn chờ, đối chiếu kho → chọn hai CPU để so sánh → bật chỉ hiện khác nhau → thử chọn RAM vào danh sách CPU để kiểm tra giới hạn.
