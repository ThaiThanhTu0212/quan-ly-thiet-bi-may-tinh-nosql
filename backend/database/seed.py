"""
Script: seed.py
Nhiệm vụ:
- Kết nối tới MongoDB (Local hoặc MongoDB Atlas qua biến MONGODB_URI)
- Tự động áp dụng $jsonSchema validators và thiết lập Indexes (Text, Wildcard, Unique)
- Nạp dữ liệu mẫu thực tế từ seed_data.json (25 linh kiện, 5 tỉnh thành, users, orders, pc_builds)
"""

import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Thêm đường dẫn để import schema_validation
CURRENT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = CURRENT_DIR.parent
sys.path.append(str(BACKEND_DIR))

from database.schema_validation import apply_collection_validators, create_all_indexes

def run_seed():
    # 1. Load biến môi trường từ .env
    env_path = BACKEND_DIR / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        print("[!] Không tìm thấy file backend/.env, dùng cấu hình mặc định.")

    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "QuanLyThietBiMayTinh")

    print("=" * 65)
    print("🚀 KHỞI TẠO VÀ NẠP DỮ LIỆU SEED MONGODB (PC BUILDER E-COMMERCE)")
    print(f"🔗 MONGODB URI : {mongodb_uri}")
    print(f"📦 DATABASE    : {db_name}")
    print("=" * 65)

    try:
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        # Ping để kiểm tra kết nối
        client.admin.command('ping')
        print(" [OK] Kết nối MongoDB thành công!\n")
    except Exception as e:
        print(f"\n[X] LỖI KẾT NỐI MONGODB: {e}")
        print("\n💡 GỢI Ý KHẮC PHỤC:")
        print("  1. Nếu dùng Local: Hãy khởi động MongoDB Service hoặc MongoDB Compass trên cổng 27017.")
        print("  2. Nếu dùng MongoDB Atlas: Hãy cập nhật MONGODB_URI trong file backend/.env sang chuỗi kết nối Cloud.")
        print("=" * 65)
        sys.exit(1)

    db = client[db_name]

    # 2. Áp dụng JSON Schema Validators & Indexes
    print("--- [BƯỚC 1]: Thiết lập Schema Validation & Indexes ---")
    try:
        apply_collection_validators(db)
        create_all_indexes(db)
    except Exception as e:
        print(f"[!] Cảnh báo khi cấu hình Schema/Index: {e}")

    # 3. Đọc dữ liệu từ seed_data.json
    seed_file_path = CURRENT_DIR / "seed_data.json"
    if not seed_file_path.exists():
        print(f"[X] Không tìm thấy file: {seed_file_path}")
        sys.exit(1)

    with open(seed_file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 4. Nạp dữ liệu vào từng Collection (Xóa dữ liệu cũ để tránh trùng lặp)
    print("\n--- [BƯỚC 2]: Nạp dữ liệu vào Collections ---")

    collections_to_seed = ["products", "locations", "users", "orders", "pc_builds"]

    for coll_name in collections_to_seed:
        items = data.get(coll_name, [])
        if not items:
            continue

        coll = db[coll_name]
        # Xóa dữ liệu cũ
        coll.delete_many({})
        # Chèn danh sách document mới
        result = coll.insert_many(items)
        print(f" [OK] Collection '{coll_name}': Đã nạp thành công {len(result.inserted_ids)} documents.")

    print("\n" + "=" * 65)
    print("🎉 HOÀN TẤT NẠP DỮ LIỆU SEED CHO DATABASE:", db_name)
    print(f" - Tổng linh kiện sẵn sàng : {db.products.count_documents({})} sản phẩm")
    print(f" - Tổng tỉnh/thành phố     : {db.locations.count_documents({})} đơn vị hành chính")
    print(f" - Tổng tài khoản mẫu      : {db.users.count_documents({})} users (admin & customer)")
    print(f" - Tổng đơn hàng mẫu       : {db.orders.count_documents({})} đơn")
    print(f" - Cấu hình PC dựng sẵn    : {db.pc_builds.count_documents({})} bộ")
    print("=" * 65)

if __name__ == "__main__":
    run_seed()
