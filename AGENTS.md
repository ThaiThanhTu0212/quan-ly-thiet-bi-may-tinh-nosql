# AI AGENTS GUIDE & WORKSPACE RULES

Chào mừng AI Agent tham gia dự án **Website Bán Linh Kiện & Build PC (PC Builder E-Commerce)**.
Dự án được xây dựng phục vụ đồ án môn **Cơ sở dữ liệu Phi quan hệ (NoSQL - MongoDB)** với kiến trúc Monorepo (`frontend/` và `backend/`).

## 1. Quyền đọc & cập nhật file môi trường (.env)
- AI Agent được quyền chủ động đọc, ghi và đồng bộ:
  - `backend/.env` & `backend/.env.example`
  - `frontend/.env.local` & `frontend/.env.example`
- Hãy tự động kiểm tra `MONGODB_URI` và `NEXT_PUBLIC_API_URL` để đảm bảo hai bên frontend và backend giao tiếp trơn tru.
- Không in lộ secrets hoặc credentials thô lên log hay commit vào git.

## 2. Tiêu chuẩn NoSQL MongoDB
- **Denormalization / Embedding:**
  - `orders.items`: Snapshot giá và tên sản phẩm lúc mua hàng.
  - `users.cart`: Giỏ hàng nhúng trực tiếp trong user document.
  - `locations`: Tỉnh -> Quận/Huyện -> Phường/Xã trong 1 collection duy nhất thay vì 3 bảng SQL `Tinh`, `Huyen`, `XaPhuong`.
- **Dynamic Specs (Đa hình) & Indexes:**
  - `products.specs`: Chứa các trường linh hoạt theo linh kiện (`socket`, `ram_type`, `tdp_watt`, `vram`, `form_factor`...).
  - Text Index cho trường `name`.
  - Wildcard Index cho `"specs.$**"`.
- **Thống kê bằng Aggregation Pipeline:**
  - Dùng `$match`, `$unwind`, `$group`, `$sort` để tính toán doanh thu và cảnh báo hàng tồn kho `stock <= min_stock_alert`.
