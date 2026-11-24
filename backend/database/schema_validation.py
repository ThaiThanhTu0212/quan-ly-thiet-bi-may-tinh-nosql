"""
Module: schema_validation.py
Nhiệm vụ:
1. Định nghĩa chuẩn $jsonSchema validation cho 5 collections trong MongoDB:
   - products: Specs đa hình, Wildcard Index specs.$**, Text Index name
   - orders: Snapshot Pattern (items nhúng), trạng thái enum chuẩn
   - users: Giỏ hàng nhúng (cart), role enum
   - pc_builds: Snapshot các linh kiện trong bộ PC, estimated_wattage
   - locations: Mô hình phân cấp nhúng Tỉnh -> Huyện -> Xã
2. Hàm setup_database_schema(db): Tạo hoặc cập nhật validator và đánh toàn bộ Indexes.
"""

from typing import Dict, Any

# ==============================================================================
# 1. $jsonSchema CHO COLLECTION "products"
# ==============================================================================
PRODUCT_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["sku", "name", "category", "brand", "price", "stock"],
        "properties": {
            "sku": {
                "bsonType": "string",
                "description": "Mã SKU duy nhất của linh kiện (bắt buộc, string)"
            },
            "name": {
                "bsonType": "string",
                "description": "Tên linh kiện (bắt buộc, string)"
            },
            "category": {
                "bsonType": "object",
                "required": ["id", "name"],
                "properties": {
                    "id": { "bsonType": "string" },
                    "name": { "bsonType": "string" }
                },
                "description": "Nhúng thông tin phân loại (Denormalized Category)"
            },
            "brand": {
                "bsonType": "object",
                "required": ["id", "name"],
                "properties": {
                    "id": { "bsonType": "string" },
                    "name": { "bsonType": "string" }
                },
                "description": "Nhúng thông tin thương hiệu (Denormalized Brand)"
            },
            "price": {
                "bsonType": ["int", "double", "long", "decimal"],
                "minimum": 0,
                "description": "Đơn giá linh kiện (VND), phải >= 0"
            },
            "stock": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Số lượng tồn kho hiện tại, phải >= 0"
            },
            "min_stock_alert": {
                "bsonType": "int",
                "minimum": 0,
                "description": "Ngưỡng cảnh báo sắp hết hàng (soLuongCanDuoi)"
            },
            "images": {
                "bsonType": "array",
                "items": { "bsonType": "string" },
                "description": "Danh sách URL / đường dẫn ảnh sản phẩm"
            },
            "description": {
                "bsonType": "string",
                "description": "Mô tả chi tiết sản phẩm"
            },
            "specs": {
                "bsonType": "object",
                "description": "Thông số kỹ thuật đa hình (Polymorphic JSON) theo từng loại linh kiện"
            }
        }
    }
}

# ==============================================================================
# 2. $jsonSchema CHO COLLECTION "orders" (SNAPSHOT PATTERN)
# ==============================================================================
ORDER_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["order_code", "shipping_address", "items", "total_amount", "status", "payment_status"],
        "properties": {
            "order_code": {
                "bsonType": "string",
                "description": "Mã đơn đặt hàng duy nhất (string)"
            },
            "customer_email": {
                "bsonType": "string",
                "description": "Email người đặt hàng"
            },
            "shipping_address": {
                "bsonType": "object",
                "required": ["full_name", "phone", "street", "ward", "district", "province"],
                "properties": {
                    "full_name": { "bsonType": "string" },
                    "phone": { "bsonType": "string" },
                    "street": { "bsonType": "string" },
                    "ward": { "bsonType": "string" },
                    "district": { "bsonType": "string" },
                    "province": { "bsonType": "string" }
                },
                "description": "Địa chỉ giao hàng hoàn chỉnh dạng nhúng"
            },
            "items": {
                "bsonType": "array",
                "minItems": 1,
                "items": {
                    "bsonType": "object",
                    "required": ["sku", "name", "quantity", "unit_price"],
                    "properties": {
                        "sku": { "bsonType": "string" },
                        "name": { "bsonType": "string" },
                        "quantity": { "bsonType": "int", "minimum": 1 },
                        "unit_price": { "bsonType": ["int", "double", "long", "decimal"], "minimum": 0 }
                    }
                },
                "description": "Snapshot danh sách sản phẩm tại thời điểm mua (Snapshot Pattern)"
            },
            "total_amount": {
                "bsonType": ["int", "double", "long", "decimal"],
                "minimum": 0,
                "description": "Tổng tiền đơn hàng (VND)"
            },
            "status": {
                "enum": ["Chờ xác nhận", "Đang giao", "Đã giao", "Đã hủy"],
                "description": "Trạng thái đơn hàng theo đúng ràng buộc SQL cũ"
            },
            "payment_status": {
                "enum": ["Đã thanh toán", "Chưa thanh toán"],
                "description": "Trạng thái thanh toán theo đúng ràng buộc SQL cũ"
            },
            "payment_method": {
                "bsonType": "string",
                "description": "Phương thức thanh toán (COD, VNPAY, Chuyển khoản...)"
            },
            "dates": {
                "bsonType": "object",
                "properties": {
                    "created_at": { "bsonType": ["string", "date"] },
                    "paid_at": { "bsonType": ["string", "date", "null"] },
                    "estimated_delivery": { "bsonType": ["string", "date", "null"] }
                }
            }
        }
    }
}

# ==============================================================================
# 3. $jsonSchema CHO COLLECTION "users" (EMBEDDED CART)
# ==============================================================================
USER_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["username", "email", "password_hash", "role", "cart"],
        "properties": {
            "username": {
                "bsonType": "string",
                "description": "Tên đăng nhập duy nhất"
            },
            "email": {
                "bsonType": "string",
                "pattern": "^.+@.+$",
                "description": "Địa chỉ email hợp lệ"
            },
            "password_hash": {
                "bsonType": "string",
                "description": "Mật khẩu mã hóa bcrypt"
            },
            "full_name": {
                "bsonType": "string"
            },
            "phone": {
                "bsonType": "string"
            },
            "role": {
                "enum": ["customer", "admin"],
                "description": "Vai trò tài khoản"
            },
            "default_address_id": {"bsonType": ["string", "null"]},
            "addresses": {
                "bsonType": "array", "maxItems": 10,
                "items": {
                    "bsonType": "object",
                    "required": ["id", "label", "full_name", "phone", "street", "ward", "district", "province"],
                    "properties": {key: {"bsonType": "string"} for key in ["id", "label", "full_name", "phone", "street", "ward", "district", "province"]},
                },
            },
            "default_address": {
                "bsonType": "object",
                "properties": {
                    "street": { "bsonType": "string" },
                    "ward": { "bsonType": "string" },
                    "district": { "bsonType": "string" },
                    "province": { "bsonType": "string" }
                }
            },
            "cart": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["sku", "quantity"],
                    "properties": {
                        "sku": { "bsonType": "string" },
                        "quantity": { "bsonType": "int", "minimum": 1 }
                    }
                },
                "description": "Mảng giỏ hàng nhúng trực tiếp trong user"
            }
        }
    }
}

# ==============================================================================
# 4. $jsonSchema CHO COLLECTION "pc_builds"
# ==============================================================================
PC_BUILD_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["title", "components", "total_price", "estimated_wattage"],
        "properties": {
            "build_code": {
                "bsonType": "string"
            },
            "title": {
                "bsonType": "string",
                "description": "Tên bộ PC do người dùng đặt"
            },
            "author": {
                "bsonType": "string"
            },
            "components": {
                "bsonType": "object",
                "description": "Object nhúng snapshot các linh kiện đã chọn (CPU, Main, RAM, GPU, PSU...)"
            },
            "total_price": {
                "bsonType": ["int", "double", "long", "decimal"],
                "minimum": 0
            },
            "estimated_wattage": {
                "bsonType": ["int", "double"],
                "minimum": 0,
                "description": "Tổng công suất tiêu thụ ước tính (W)"
            },
            "is_compatible": {
                "bsonType": "bool",
                "description": "Cờ đánh dấu cấu hình đã kiểm tra tương thích thành công"
            },
            "notes": {
                "bsonType": "string"
            }
        }
    }
}

# ==============================================================================
# 5. $jsonSchema CHO COLLECTION "locations" (HIERARCHICAL EMBEDDING)
# ==============================================================================
LOCATION_SCHEMA: Dict[str, Any] = {
    "$jsonSchema": {
        "bsonType": "object",
        "required": ["province_id", "province_name", "districts"],
        "properties": {
            "province_id": {
                "bsonType": "string",
                "description": "Mã tỉnh thành (ví dụ T001)"
            },
            "province_name": {
                "bsonType": "string",
                "description": "Tên tỉnh thành (Hà Nội, TP Hồ Chí Minh...)"
            },
            "districts": {
                "bsonType": "array",
                "items": {
                    "bsonType": "object",
                    "required": ["district_id", "district_name", "wards"],
                    "properties": {
                        "district_id": { "bsonType": "string" },
                        "district_name": { "bsonType": "string" },
                        "wards": {
                            "bsonType": "array",
                            "items": {
                                "bsonType": "object",
                                "required": ["ward_id", "ward_name"],
                                "properties": {
                                    "ward_id": { "bsonType": "string" },
                                    "ward_name": { "bsonType": "string" }
                                }
                            }
                        }
                    }
                },
                "description": "Mảng quận huyện và phường xã lồng nhau trọn vẹn"
            }
        }
    }
}

# Mapping schema validators
COLLECTION_SCHEMAS = {
    "products": PRODUCT_SCHEMA,
    "orders": ORDER_SCHEMA,
    "users": USER_SCHEMA,
    "pc_builds": PC_BUILD_SCHEMA,
    "locations": LOCATION_SCHEMA
}


def apply_collection_validators(db):
    """
    Tạo hoặc cập nhật $jsonSchema validator cho từng collection.
    """
    existing_collections = set(db.list_collection_names())
    for coll_name, schema in COLLECTION_SCHEMAS.items():
        if coll_name not in existing_collections:
            db.create_collection(coll_name, validator=schema)
            print(f" [V] Created collection '{coll_name}' with $jsonSchema validator.")
        else:
            db.command({
                "collMod": coll_name,
                "validator": schema,
                "validationLevel": "moderate"
            })
            print(f" [V] Updated validator for existing collection '{coll_name}'.")


def create_all_indexes(db):
    """
    Thiết lập toàn bộ Index tối ưu hóa cho hệ thống NoSQL:
    - Text Index và Wildcard Index cho products
    - Unique Indexes cho sku, email, username
    """
    # 1. Indexes cho 'products'
    # Wildcard Index trên "specs.$**" giúp lọc theo bất kỳ thông số kỹ thuật nào
    db.products.create_index([("specs.$**", 1)], name="idx_wildcard_specs")
    # MongoDB cho phép một text index mỗi collection.
    indexes = db.products.index_information()
    if "idx_text_name_desc" in indexes:
        db.products.drop_index("idx_text_name_desc")
    db.products.create_index(
        [("name", "text"), ("brand.name", "text"), ("description", "text"), ("sku", "text")],
        name="idx_text_name_brand_desc",
        weights={"name": 10, "brand.name": 5, "description": 1, "sku": 10},
        default_language="none",
    )
    # Unique Index cho SKU
    db.products.create_index([("sku", 1)], unique=True, name="idx_unique_sku")
    # Compound Index hỗ trợ lọc nhanh theo danh mục và giá
    db.products.create_index([("category.id", 1), ("price", 1)], name="idx_category_price")
    db.products.create_index([("brand.id", 1)], name="idx_brand")
    print(" [V] Created Indexes for 'products' (Text Index, Wildcard specs.$**, Unique SKU).")

    # 2. Indexes cho 'orders'
    db.orders.create_index([("order_code", 1)], unique=True, name="idx_unique_order_code")
    db.orders.create_index([("status", 1)], name="idx_order_status")
    db.orders.create_index([("dates.created_at", -1)], name="idx_created_at_desc")
    db.orders.create_index([("customer_email", 1)], name="idx_customer_email")
    print(" [V] Created Indexes for 'orders' (status, created_at, customer_email).")

    db.orders.create_index(
        [("user_id", 1), ("request_id", 1)], unique=True, name="idx_user_checkout_request",
        partialFilterExpression={"user_id": {"$type": "string"}, "request_id": {"$type": "string"}},
    )
    db.orders.create_index([("user_id", 1), ("dates.created_at", -1)], name="idx_user_orders")
    # 3. Indexes cho 'users'
    db.users.create_index([("username", 1)], unique=True, name="idx_unique_username")
    db.users.create_index([("email", 1)], unique=True, name="idx_unique_email")
    print(" [V] Created Indexes for 'users' (Unique username, Unique email).")

    # 4. Indexes cho 'locations'
    db.locations.create_index([("province_id", 1)], unique=True, name="idx_unique_province_id")
    print(" [V] Created Indexes for 'locations'.")

    # 5. Indexes cho 'pc_builds'
    db.pc_builds.create_index([("build_code", 1)], unique=True, sparse=True, name="idx_unique_build_code")
    db.pc_builds.create_index([("author", 1)], name="idx_build_author")
    print(" [V] Created Indexes for 'pc_builds'.")


if __name__ == "__main__":
    from seed import run_seed

    run_seed(schema_only=True)
