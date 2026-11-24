from fastapi import APIRouter, Depends
from app.database.connection import get_database
from app.routers.auth import require_admin

router = APIRouter(prefix="/analytics", tags=["Admin & Analytics (Aggregation Pipelines)"],
                   dependencies=[Depends(require_admin)])

@router.get("/overview")
async def get_analytics_overview():
    """
    Thống kê tổng quan Dashboard sử dụng MongoDB Aggregation.
    """
    db = get_database()

    # 1. Tổng doanh thu từ các đơn hàng "Đã giao" hoặc "Đã thanh toán"
    revenue_pipeline = [
        {"$match": {"status": {"$ne": "Đã hủy"}}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total_amount"},
            "total_orders": {"$sum": 1}
        }}
    ]
    revenue_res = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = revenue_res[0]["total_revenue"] if revenue_res else 0
    total_orders = revenue_res[0]["total_orders"] if revenue_res else 0

    # 2. Tổng số linh kiện trong kho
    total_products = await db.products.count_documents({})

    # 3. Số linh kiện có mức tồn kho dưới ngưỡng cảnh báo (stock <= min_stock_alert)
    low_stock_count = await db.products.count_documents({
        "$expr": {"$lte": ["$stock", "$min_stock_alert"]}
    })

    return {
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_products": total_products,
        "low_stock_count": low_stock_count
    }

@router.get("/revenue-by-status")
async def get_revenue_by_status():
    """
    Aggregation Pipeline: Thống kê doanh thu và số lượng đơn theo trạng thái (Đang giao, Đã giao, Đã hủy).
    """
    db = get_database()
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total_amount": {"$sum": "$total_amount"}
            }
        },
        {
            "$project": {
                "status": "$_id",
                "count": 1,
                "total_amount": 1,
                "_id": 0
            }
        },
        {"$sort": {"total_amount": -1}}
    ]
    cursor = db.orders.aggregate(pipeline)
    return await cursor.to_list(length=10)

@router.get("/top-selling-products")
async def get_top_selling_products(limit: int = 5):
    """
    Aggregation Pipeline: $unwind mảng items nhúng -> $group theo SKU để tìm top sản phẩm bán chạy nhất.
    """
    db = get_database()
    pipeline = [
        {"$match": {"status": {"$ne": "Đã hủy"}}},
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.sku",
                "sku": {"$first": "$items.sku"},
                "name": {"$first": "$items.name"},
                "total_quantity_sold": {"$sum": "$items.quantity"},
                "total_revenue": {"$sum": {"$multiply": ["$items.quantity", "$items.unit_price"]}}
            }
        },
        {"$sort": {"total_quantity_sold": -1}},
        {"$limit": limit},
        {"$project": {"_id": 0}}
    ]
    cursor = db.orders.aggregate(pipeline)
    return await cursor.to_list(length=limit)

@router.get("/low-stock-alert")
async def get_low_stock_products():
    """
    Lấy danh sách các linh kiện có nguy cơ hết hàng (stock <= min_stock_alert) để nhập hàng kịp thời.
    """
    db = get_database()
    query = {"$expr": {"$lte": ["$stock", "$min_stock_alert"]}}
    cursor = db.products.find(query, {"_id": 0}).sort("stock", 1)
    return await cursor.to_list(length=50)

@router.get("/category-distribution")
async def get_category_distribution():
    """
    Aggregation Pipeline: Thống kê số lượng linh kiện và giá trị tổng kho theo từng danh mục.
    """
    db = get_database()
    pipeline = [
        {
            "$group": {
                "_id": "$category.name",
                "category_id": {"$first": "$category.id"},
                "product_count": {"$sum": 1},
                "total_stock": {"$sum": "$stock"},
                "avg_price": {"$avg": "$price"}
            }
        },
        {
            "$project": {
                "category_name": "$_id",
                "category_id": 1,
                "product_count": 1,
                "total_stock": 1,
                "avg_price": {"$round": ["$avg_price", 0]},
                "_id": 0
            }
        },
        {"$sort": {"product_count": -1}}
    ]
    cursor = db.products.aggregate(pipeline)
    return await cursor.to_list(length=20)
