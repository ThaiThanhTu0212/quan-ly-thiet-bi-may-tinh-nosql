"""Apply schema, indexes and insert missing sample documents into MongoDB."""

import json
import os
import sys
from pathlib import Path

import bcrypt
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from schema_validation import apply_collection_validators, create_all_indexes

CURRENT_DIR = Path(__file__).resolve().parent

KEYS = {
    "products": "sku",
    "locations": "province_id",
    "users": "username",
    "orders": "order_code",
    "pc_builds": "build_code",
}


def run_seed(schema_only=False):
    load_dotenv(CURRENT_DIR.parent / ".env")
    uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.getenv("DB_NAME", "QuanLyThietBiMayTinh")
    try:
        with MongoClient(uri, serverSelectionTimeoutMS=5000) as client:
            client.admin.command("ping")
            db = client[db_name]
            apply_collection_validators(db)
            create_all_indexes(db)
            if not schema_only:
                seed_documents(db)
    except PyMongoError as exc:
        print(f"MongoDB: {type(exc).__name__} (mã lỗi: {getattr(exc, 'code', None)}).", file=sys.stderr)
        raise SystemExit(1) from None


def seed_documents(db):
    with (CURRENT_DIR / "seed_data.json").open(encoding="utf-8") as source:
        data = json.load(source)

    admin_password = os.getenv("SEED_ADMIN_PASSWORD", "").encode()
    if admin_password and not 8 <= len(admin_password) <= 72:
        raise SystemExit("SEED_ADMIN_PASSWORD phải có từ 8 đến 72 byte.")

    for collection, key in KEYS.items():
        added = 0
        for item in data[collection]:
            identity = {key: item[key]}
            admin = collection == "users" and item["role"] == "admin"
            if admin:
                if not admin_password:
                    continue
                old_hash = item["password_hash"]
                item["password_hash"] = bcrypt.hashpw(admin_password, bcrypt.gensalt()).decode()
                db.users.update_one({**identity, "role": "admin", "password_hash": old_hash},
                                    {"$set": {"password_hash": item["password_hash"]}})
            result = db[collection].update_one(identity, {"$setOnInsert": item}, upsert=True)
            added += int(result.upserted_id is not None)
        print(f"{collection}: {added} bản ghi mới, {db[collection].count_documents({})} bản ghi hiện có.")


if __name__ == "__main__":
    run_seed()
