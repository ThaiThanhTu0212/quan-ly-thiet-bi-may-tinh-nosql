from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from app.database.connection import get_database
from app.models.product import ProductResponse, ProductListResponse

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=ProductListResponse)
async def get_products(
    q: Optional[str] = Query(None, description="Từ khóa tìm kiếm theo tên hoặc mô tả"),
    category_id: Optional[str] = Query(None, description="Mã danh mục (LSP01, LSP02...)"),
    brand_id: Optional[str] = Query(None, description="Mã thương hiệu (CT01, CT02...)"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    # Các bộ lọc dynamic specs NoSQL
    socket: Optional[str] = Query(None, description="Lọc theo socket CPU/Main (LGA 1700, AM4...)"),
    ram_type: Optional[str] = Query(None, description="Lọc theo chuẩn RAM (DDR4, DDR5)"),
    vram_min: Optional[int] = Query(None, description="VRAM tối thiểu cho GPU (GB)"),
    wattage_min: Optional[int] = Query(None, description="Công suất tối thiểu cho PSU (W)"),
    limit: int = Query(50, ge=1, le=100),
    skip: int = Query(0, ge=0)
):
    """
    Lấy danh sách sản phẩm với bộ lọc đa hình (Dynamic Specs) tối ưu bằng Wildcard Index MongoDB.
    """
    db = get_database()
    filter_query = {}

    # Tìm kiếm toàn văn (Text Search hoặc Regex)
    if q and q.strip():
        filter_query["$or"] = [
            {"name": {"$regex": q.strip(), "$options": "i"}},
            {"description": {"$regex": q.strip(), "$options": "i"}},
            {"sku": {"$regex": q.strip(), "$options": "i"}}
        ]

    # Lọc Category & Brand
    if category_id:
        filter_query["category.id"] = category_id
    if brand_id:
        filter_query["brand.id"] = brand_id

    # Lọc Giá
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
    if wattage_min is not None:
        filter_query["specs.wattage"] = {"$gte": wattage_min}

    cursor = db.products.find(filter_query, {"_id": 0}).skip(skip).limit(limit)
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

    return ProductListResponse(
        total=total,
        items=items,
        categories=categories,
        brands=brands
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

@router.get("/{sku}", response_model=ProductResponse)
async def get_product_by_sku(sku: str):
    """Lấy chi tiết linh kiện theo mã SKU."""
    db = get_database()
    product = await db.products.find_one({"sku": sku}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy linh kiện với SKU: {sku}")
    return product
