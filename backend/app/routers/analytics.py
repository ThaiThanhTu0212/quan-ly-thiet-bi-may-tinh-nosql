"""Delivered-order revenue pipelines. No application-side joins."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from app.database.connection import get_database
from app.routers.auth import require_admin

router = APIRouter(prefix='/analytics', tags=['Analytics'], dependencies=[Depends(require_admin)])
DELIVERED = {'status': 'Đã giao'}


def monthly_pipeline(year):
    return [
        {'$match': DELIVERED},
        {'$set': {'order_date': {'$convert': {'input': '$dates.created_at', 'to': 'date', 'onError': None, 'onNull': None}}}},
        {'$match': {'order_date': {'$gte': datetime(year, 1, 1, tzinfo=timezone(timedelta(hours=7))), '$lt': datetime(year + 1, 1, 1, tzinfo=timezone(timedelta(hours=7)))}}},
        {'$unwind': '$items'},
        {'$group': {'_id': {'$month': {'date': '$order_date', 'timezone': 'Asia/Ho_Chi_Minh'}}, 'revenue': {'$sum': {'$multiply': ['$items.quantity', '$items.unit_price']}}}},
        {'$sort': {'_id': 1}},
    ]


def category_pipeline():
    return [
        {'$match': DELIVERED}, {'$unwind': '$items'},
        {'$group': {'_id': {'$ifNull': ['$items.category.name', 'Chưa phân loại (đơn cũ)']},
                    'revenue': {'$sum': {'$multiply': ['$items.quantity', '$items.unit_price']}}, 'quantity': {'$sum': '$items.quantity'}}},
        {'$sort': {'revenue': -1}},
        {'$project': {'_id': 0, 'name': '$_id', 'revenue': 1, 'quantity': 1}},
    ]


@router.get('/overview')
async def get_analytics_overview():
    db = get_database()
    rev = await db.orders.aggregate([{'$match': DELIVERED}, {'$group': {'_id': None, 'value': {'$sum': '$total_amount'}}}]).to_list(1)
    return {'total_revenue': rev[0]['value'] if rev else 0,
            'total_orders': await db.orders.count_documents({}),
            'new_orders': await db.orders.count_documents({'status': 'Chờ xác nhận'}),
            'total_products': await db.products.count_documents({}),
            'total_users': await db.users.count_documents({}),
            'low_stock_count': await db.products.count_documents({'$expr': {'$lte': ['$stock', {'$ifNull': ['$min_stock_alert', 5]}]}})}


@router.get('/monthly-revenue')
async def monthly_revenue(year: int = Query(datetime.now().year, ge=2000, le=2100)):
    rows = await get_database().orders.aggregate(monthly_pipeline(year)).to_list(12)
    by_month = {r['_id']: r['revenue'] for r in rows}
    return [{'month': f'{year}-{m:02}', 'revenue': by_month.get(m, 0)} for m in range(1, 13)]


@router.get('/category-revenue')
async def category_revenue():
    return await get_database().orders.aggregate(category_pipeline()).to_list(None)


@router.get('/top-selling-products')
async def get_top_selling_products(limit: int = Query(10, ge=1, le=100)):
    return await get_database().orders.aggregate([
        {'$match': DELIVERED}, {'$unwind': '$items'},
        {'$group': {'_id': '$items.sku', 'sku': {'$first': '$items.sku'}, 'name': {'$first': '$items.name'},
                    'total_quantity_sold': {'$sum': '$items.quantity'}, 'total_revenue': {'$sum': {'$multiply': ['$items.quantity', '$items.unit_price']}}}},
        {'$sort': {'total_quantity_sold': -1, '_id': 1}}, {'$limit': limit}, {'$project': {'_id': 0}}
    ]).to_list(limit)


@router.get('/low-stock-alert')
async def get_low_stock_products():
    return await get_database().products.find({'$expr': {'$lte': ['$stock', {'$ifNull': ['$min_stock_alert', 5]}]}}, {'_id': 0}).sort('stock', 1).to_list(100)


@router.get('/revenue-by-status')
async def get_revenue_by_status():
    return await get_database().orders.aggregate([
        {'$group': {'_id': '$status', 'count': {'$sum': 1}, 'total_amount': {'$sum': '$total_amount'}}},
        {'$project': {'_id': 0, 'status': '$_id', 'count': 1, 'total_amount': 1}}, {'$sort': {'status': 1}}
    ]).to_list(10)


@router.get('/category-distribution')
async def get_category_distribution():
    return await get_database().products.aggregate([
        {'$group': {'_id': '$category.name', 'product_count': {'$sum': 1}, 'total_stock': {'$sum': '$stock'}}},
        {'$project': {'_id': 0, 'category_name': '$_id', 'product_count': 1, 'total_stock': 1}}
    ]).to_list(50)
