import json
import math
import re
from typing import Literal, Optional

from fastapi import APIRouter, Query, HTTPException, Request
from app.database.connection import get_database
from app.models.product import ProductResponse, ProductListResponse

router = APIRouter(prefix="/products", tags=["Products"])
SORTS = {
    "newest": [("_id", -1)],
    "price_asc": [("price", 1), ("sku", 1)],
    "price_desc": [("price", -1), ("sku", 1)],
    "name": [("name", 1), ("sku", 1)],
}


def dynamic_spec_filters(request: Request) -> dict:
    filters = {}
    for param, raw_value in request.query_params.multi_items():
        if not param.startswith("spec."):
            continue
        key = param.removeprefix("spec.")
        if not re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_]{0,63}", key) or len(raw_value) > 100:
            raise HTTPException(422, "Tên hoặc giá trị thông số không hợp lệ.")
        try:
            value = json.loads(raw_value)
        except ValueError:
            value = raw_value
        if type(value) not in (bool, int, float, str):
            raise HTTPException(422, "Thông số phải là chuỗi, số hoặc giá trị đúng/sai.")
        if type(value) is int and not -(2**63) <= value < 2**63:
            raise HTTPException(422, "Giá trị số nguyên của thông số vượt giới hạn.")
        if type(value) is float and not math.isfinite(value):
            raise HTTPException(422, "Giá trị số của thông số phải hữu hạn.")
        filters[f"specs.{key}"] = value
    return filters

@router.get("", response_model=ProductListResponse)
async def get_products(
    request: Request,
    q: Optional[str] = Query(None, max_length=120, description="Text Search theo tên, hãng hoặc mô tả"),
    category_id: Optional[str] = Query(None, description="Mã danh mục (LSP01, LSP02...)"),
    brand_id: Optional[str] = Query(None, description="Mã thương hiệu (CT01, CT02...)"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    # Các bộ lọc dynamic specs NoSQL
    socket: Optional[str] = Query(None, description="Lọc theo socket CPU/Main (LGA 1700, AM4...)"),
    ram_type: Optional[str] = Query(None, description="Lọc theo chuẩn RAM (DDR4, DDR5)"),
    vram_min: Optional[int] = Query(None, ge=0, description="VRAM tối thiểu cho GPU (GB)"),
    capacity_min: Optional[int] = Query(None, ge=0, description="Dung lượng tối thiểu của RAM hoặc ổ đĩa (GB)"),
    wattage_min: Optional[int] = Query(None, ge=0, description="Công suất tối thiểu cho PSU (W)"),
    sort: Literal["relevance", "newest", "price_asc", "price_desc", "name"] = "relevance",
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Lấy danh sách sản phẩm với bộ lọc đa hình (Dynamic Specs) tối ưu bằng Wildcard Index MongoDB.
    """
    db = get_database()
    filter_query = dynamic_spec_filters(request)

    if q and q.strip():
        filter_query["$text"] = {"$search": q.strip()}

    # Lọc Category & Brand
    if category_id:
        filter_query["category.id"] = category_id
    if brand_id:
        filter_query["brand.id"] = brand_id

    # Lọc Giá
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(422, "Giá tối thiểu phải nhỏ hơn hoặc bằng giá tối đa.")
    price_cond = {}
    if min_price is not None:
        price_cond["$gte"] = min_price
    if max_price is not None:
        price_cond["$lte"] = max_price
    if price_cond:
        filter_query["price"] = price_cond

    # LỌC DYNAMIC SPECS (Tận dụng Wildcard Index "specs.$**")
    if socket:
        filter_query["specs.socket"] = socket
    if ram_type:
        filter_query["specs.ram_type"] = ram_type
    if vram_min is not None:
        filter_query["specs.vram_gb"] = {"$gte": vram_min}
    if capacity_min is not None:
        filter_query["specs.capacity_gb"] = {"$gte": capacity_min}
    if wattage_min is not None:
        filter_query["specs.wattage"] = {"$gte": wattage_min}

    projection = {"_id": 0}
    order = SORTS.get(sort, SORTS["newest"])
    if sort == "relevance" and "$text" in filter_query:
        projection["score"] = {"$meta": "textScore"}
        order = [("score", {"$meta": "textScore"}), ("sku", 1)]
    cursor = db.products.find(filter_query, projection).sort(order).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    total = await db.products.count_documents(filter_query)

    # Lấy danh sách category và brand duy nhất
    categories_cursor = db.products.aggregate([
        {"$group": {"_id": "$category.id", "name": {"$first": "$category.name"}}},
        {"$project": {"id": "$_id", "name": 1, "_id": 0}},
        {"$sort": {"id": 1}}
    ])
    categories = await categories_cursor.to_list(length=50)

    brands_cursor = db.products.aggregate([
        {"$group": {"_id": "$brand.id", "name": {"$first": "$brand.name"}}},
        {"$project": {"id": "$_id", "name": 1, "_id": 0}},
        {"$sort": {"name": 1}}
    ])
    brands = await brands_cursor.to_list(length=50)
    scope = {"category.id": category_id} if category_id else {}
    spec_options = {}
    for key in ("socket", "ram_type", "vram_gb", "capacity_gb"):
        values = await db.products.distinct(f"specs.{key}", scope)
        expected_type = str if key in {"socket", "ram_type"} else int
        spec_options[key] = sorted(value for value in values if type(value) is expected_type)

    return ProductListResponse(
        total=total,
        items=items,
        categories=categories,
        brands=brands,
        spec_options=spec_options,
    )

@router.get("/categories/list")
async def get_categories():
    """Lấy danh sách các danh mục linh kiện (Denormalized Categories)."""
    db = get_database()
    pipeline = [
        {"$group": {"_id": "$category.id", "name": {"$first": "$category.name"}, "count": {"$sum": 1}}},
        {"$project": {"id": "$_id", "name": 1, "count": 1, "_id": 0}},
        {"$sort": {"id": 1}}
    ]
    cursor = db.products.aggregate(pipeline)
    return await cursor.to_list(length=50)

@router.get("/brands/list")
async def get_brands():
    """Lấy danh sách các hãng sản xuất (Denormalized Brands)."""
    db = get_database()
    pipeline = [
        {"$group": {"_id": "$brand.id", "name": {"$first": "$brand.name"}, "count": {"$sum": 1}}},
        {"$project": {"id": "$_id", "name": 1, "count": 1, "_id": 0}},
        {"$sort": {"name": 1}}
    ]
    cursor = db.products.aggregate(pipeline)
    return await cursor.to_list(length=50)

@router.get("/best-sellers", response_model=list[ProductResponse])
async def get_best_sellers(limit: int = Query(8, ge=1, le=30)):
    db = get_database()
    ranking = await db.orders.aggregate([
        {"$match": {"status": "Đã giao"}},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.sku", "quantity": {"$sum": "$items.quantity"}}},
        {"$sort": {"quantity": -1, "_id": 1}},
    ]).to_list(length=None)
    skus = [item["_id"] for item in ranking]
    products = await db.products.find({"sku": {"$in": skus}}, {"_id": 0}).to_list(length=None)
    by_sku = {product["sku"]: product for product in products}
    return [by_sku[sku] for sku in skus if sku in by_sku][:limit]


@router.get("/{sku}", response_model=ProductResponse)
async def get_product_by_sku(sku: str):
    """Lấy chi tiết linh kiện theo mã SKU."""
    db = get_database()
    product = await db.products.find_one({"sku": sku}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy linh kiện với SKU: {sku}")
    return product
