# 🌿 QUY TRÌNH PHỐI HỢP GIT & ĐỒNG BỘ DỮ LIỆU (GIT WORKFLOW & MONGODB SYNC)
> **Dành cho:** Nhóm 2 người làm đồ án môn Cơ sở dữ liệu Phi quan hệ (NoSQL - MongoDB)

---

## 1. MÔ HÌNH PHÂN NHÁNH GIT (BRANCHING MODEL)

Để tránh xung đột code giữa 2 thành viên và duy trì mã nguồn ổn định, nhóm tuân thủ cấu trúc nhánh sau:

```
main (Nhánh chính - Chỉ chứa phiên bản hoàn chỉnh để nộp đồ án & demo)
  └── dev (Nhánh tích hợp - Hai thành viên gộp code kiểm thử tại đây)
        ├── feat/member1-pc-builder-engine
        ├── feat/member1-dynamic-specs-filter
        ├── feat/member2-auth-cart-checkout
        ├── feat/member2-admin-aggregation-dashboard
        └── fix/resolve-socket-compatibility-bug
```

### Nguyên tắc nhánh:
1. **`main`**: Tuyệt đối **KHÔNG** push code trực tiếp. Chỉ merge từ `dev` khi đã test chạy ổn định cả Frontend và Backend.
2. **`dev`**: Nhánh chung để 2 thành viên tích hợp tính năng. Mọi tính năng mới đều phân nhánh từ `dev` và tạo Pull Request (PR) về `dev`.
3. **`feat/<tên-tính-năng>`**: Nhánh làm việc cá nhân của mỗi thành viên.
   - Ví dụ: `feat/dynamic-specs-filter`, `feat/pc-builder-ui`, `feat/admin-dashboard`.
4. **`fix/<tên-lỗi>`**: Nhánh sửa lỗi phát sinh trong quá trình kiểm thử tích hợp.

---

## 2. QUY CHUẨN VIẾT COMMIT MESSAGE (CONVENTIONAL COMMITS)

Mỗi commit phải có tiền tố rõ ràng thể hiện nội dung thay đổi:

- **`feat:`** Thêm tính năng mới (Feature)
  - *Ví dụ:* `feat: add dynamic specs filter with wildcard index for products`
  - *Ví dụ:* `feat: implement real-time wattage and socket compatibility check in pc builder`
- **`fix:`** Sửa lỗi (Bug fix)
  - *Ví dụ:* `fix: correct DDR5 ram validation on z690 motherboard`
- **`db:`** Thay đổi cấu trúc Schema NoSQL, Indexes hoặc dữ liệu Seed
  - *Ví dụ:* `db: add wildcard index specs.$** and update seed_data with 25 pc parts`
- **`docs:`** Cập nhật tài liệu (`README.md`, `GIT_WORKFLOW.md`, API docs)
  - *Ví dụ:* `docs: update setup guide and member task delegation`
- **`refactor:`** Tái cấu trúc code mà không thay đổi tính năng
  - *Ví dụ:* `refactor: extract compatibility validator into separate service`
- **`style:`** Chỉnh sửa giao diện, Tailwind CSS, icon mà không ảnh hưởng logic

---

## 3. QUY TRÌNH LÀM VIỆC TỪNG BƯỚC HÀNG NGÀY

### Bước 1: Bắt đầu làm tính năng mới
Trước khi bắt đầu code, luôn kéo code mới nhất từ nhánh `dev`:

```bash
git checkout dev
git pull origin dev
git checkout -b feat/ten-tinh-nang-moi
```

### Bước 2: Commit và Đẩy nhánh lên Remote Repository
Khi hoàn thành một phần công việc, commit có thông điệp rõ ràng:

```bash
git add .
git commit -m "feat: implement compatibility logic for CPU and motherboard"
git push origin feat/ten-tinh-nang-moi
```

### Bước 3: Tạo Pull Request (PR) & Review Chéo
1. Lên giao diện GitHub/GitLab tạo Pull Request từ `feat/ten-tinh-nang-moi` vào nhánh `dev`.
2. Gán thành viên còn lại làm **Reviewer**.
3. Thành viên còn lại mở PR kiểm tra:
   - Code có vi phạm quy tắc NoSQL không (có viết lệnh JOIN SQL kiểu cũ không)?
   - Các file môi trường (`.env`, `.env.local`) có bị vô tình commit không? (Phải đảm bảo không xuất hiện trong PR).
   - Test chạy thử API và màn hình liên quan.
4. Nhấn **Approve** và tiến hành **Squash & Merge** hoặc **Merge Pull Request** vào `dev`.

### Bước 4: Xử lý Xung Đột Code (Merge Conflicts) nếu có
Nếu hai thành viên cùng sửa vào một file cấu hình chung (ví dụ `main.py` hoặc router):

```bash
# Đang ở nhánh làm việc của bạn:
git checkout feat/ten-tinh-nang-moi
# Kéo code mới nhất từ dev về để giải quyết xung đột cục bộ:
git pull origin dev
# Mở VS Code / Antigravity để chọn accept current/incoming change
git add .
git commit -m "fix: resolve merge conflicts with dev"
git push origin feat/ten-tinh-nang-moi
```

---

## 4. NGUYÊN TẮC ĐỒNG BỘ CƠ SỞ DỮ LIỆU (MONGODB SYNC)

Để tránh tình trạng "trên máy tôi chạy được nhưng máy bạn bị lỗi thiếu dữ liệu/thiếu index":

### Phương án khuyến nghị: Dùng chung MongoDB Atlas (Cloud)
1. Một thành viên tạo 1 cụm Cluster miễn phí (M0 Free Tier) trên **MongoDB Atlas**.
2. Thêm IP truy cập vào Access List: `0.0.0.0/0` (Allow Access from Anywhere) hoặc IP tĩnh của 2 người.
3. Tạo tài khoản database chung (ví dụ `dbUser` / `pcbuilder2026`).
4. Gửi chuỗi kết nối an toàn qua kênh chat nội bộ (Zalo/Discord, **KHÔNG commit chuỗi kết nối có mật khẩu lên Git**).
5. Cả 2 thành viên cùng dán chuỗi kết nối vào file `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://dbUser:pcbuilder2026@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=QuanLyThietBiMayTinh
   ```
👉 **Lợi ích:** Khi Thành viên 1 thêm sản phẩm mới hoặc test đặt hàng, Thành viên 2 mở Admin Dashboard trên máy mình sẽ thấy dữ liệu thay đổi ngay lập tức!

### Phương án dự phòng: Chạy MongoDB Local độc lập
Nếu một trong hai người không có kết nối internet ổn định:
1. Chạy MongoDB Community cục bộ trên máy tại `mongodb://localhost:27017`.
2. Mọi thay đổi về Schema, Index hoặc dữ liệu mẫu bắt buộc phải được commit vào file `backend/database/seed_data.json` và `schema_validation.py`.
3. Khi kéo code mới từ `dev`, chỉ cần chạy lại lệnh:
   ```bash
   cd backend
   python database/seed.py
   ```
   Lệnh này sẽ tự động drop dữ liệu cũ, tái lập indexes và nạp lại toàn bộ dữ liệu chuẩn đã đồng bộ.
