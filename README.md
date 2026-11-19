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
   ├── /api/products       (Dynamic Filter & Text Search)
   ├── /api/pc-builder     (Compatibility Validation Engine)
   ├── /api/orders         (Order checkout with Snapshot)
   ├── /api/analytics      (Aggregation Pipelines: Doanh thu, Tồn kho)
   └── /api/locations      (Single-document Nested Locations)
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
| **Thành viên 1** *(Core Products & PC Builder)* | **1. Quản lý Sản phẩm & Bộ lọc Dynamic Specs**<br>- Thiết kế schema đa hình `products.specs`<br>- Xây dựng API `/api/products` hỗ trợ tìm kiếm toàn văn (Text Search) và lọc theo thuộc tính lồng nhau.<br><br>**2. Tính năng PC Builder & Kiểm tra tương thích**<br>- Xây dựng thuật toán kiểm tra Socket (CPU vs Mainboard), chuẩn RAM (DDR4 vs DDR5), và tính tổng công suất TDP so sánh với công suất PSU.<br>- Giao diện trang `/pc-builder` trực quan, cho phép người dùng chọn linh kiện theo từng khe cắm. | - Thiết lập Text Index trên `name`<br>- Thiết lập Wildcard Index trên `specs.$**`<br>- Xây dựng router `pc_builder.py` với logic validation chuyên sâu.<br>- Frontend: `app/products/page.tsx` và `app/pc-builder/page.tsx`. |
| **Thành viên 2** *(Users, Orders & Analytics)* | **1. Xác thực, Giỏ hàng & Quản lý Đặt hàng**<br>- Quản lý tài khoản `users`, giỏ hàng nhúng `users.cart`.<br>- API đặt hàng `/api/orders`: Áp dụng Snapshot Pattern lưu lịch sử đơn hàng, cập nhật trừ tồn kho `stock`.<br><br>**2. Admin Dashboard & Báo cáo Thống kê NoSQL**<br>- Viết các MongoDB Aggregation Pipelines phức tạp (`$match`, `$unwind`, `$group`, `$sort`) thống kê doanh thu theo trạng thái, top 5 sản phẩm bán chạy.<br>- Cảnh báo hàng tồn kho dưới ngưỡng an toàn (`min_stock_alert`). | - Áp dụng MongoDB Transaction / Atomic Updates (`$inc`) trừ `stock`.<br>- Pipeline thống kê đa chiều cho Admin Dashboard.<br>- Quản lý collection `locations` phục vụ địa chỉ giao hàng.<br>- Frontend: `app/cart/page.tsx`, `app/orders/page.tsx` và `app/admin/page.tsx`. |

---

## 🚀 5. HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY TỪ A–Z

### Bước 1: Chuẩn bị Cơ sở dữ liệu MongoDB
Hệ thống hỗ trợ cả MongoDB cài cục bộ và MongoDB Atlas trên Cloud:
- **Lựa chọn A (Local MongoDB):** Khởi động MongoDB Compass hoặc chạy MongoDB Service trên cổng mặc định `27017`.
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
   - Kiểm tra 5 collections: `products` (25 sản phẩm thực tế), `orders` (các đơn hàng mẫu có snapshot), `users`, `locations` (Tỉnh/Huyện/Xã lồng nhau), `pc_builds`.
   - Xem tab **Indexes** của `products` để xác nhận đã tạo `name_text` và `specs_wildcard`.
2. **Kiểm tra Bộ lọc Specs động:**
   - Mở `http://localhost:3000/products`, chọn danh mục "CPU" và lọc socket "LGA 1700" hoặc "AM4".
3. **Kiểm tra Engine Tương Thích PC Builder:**
   - Mở `http://localhost:3000/pc-builder`.
   - Thử chọn **Intel Core i5-12400F** (Socket LGA 1700) kết hợp với **ASUS ROG Strix B550-F** (Socket AM4) 👉 Hệ thống sẽ lập tức cảnh báo đỏ: *Không tương thích Socket!*
   - Thử chọn **Gigabyte Z690** (Hỗ trợ DDR5) kết hợp với **Kingston Fury DDR4** 👉 Hệ thống sẽ cảnh báo: *Chuẩn RAM không khớp!*
   - Hệ thống tự động tính tổng TDP của CPU, GPU và cộng dự phòng để khuyến nghị công suất nguồn PSU phù hợp.
4. **Kiểm tra Admin Dashboard (Aggregation Pipeline):**
   - Mở `http://localhost:3000/admin` để xem doanh thu, thống kê đơn hàng, và danh sách sản phẩm cảnh báo sắp hết hàng.
