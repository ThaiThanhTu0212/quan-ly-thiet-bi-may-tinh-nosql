import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from app.database.connection import get_database
from app.models.order import OrderCreateRequest, OrderResponse, OrderDates
from app.routers.auth import check_origin, require_admin

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("", response_model=OrderResponse)
async def create_order(payload: OrderCreateRequest):
    """
    Tạo đơn đặt hàng mới sử dụng Snapshot Pattern (nhúng items với giá và tên tại thời điểm mua),
    đồng thời kiểm tra và trừ tồn kho (stock) của sản phẩm.
    """
    db = get_database()

    if not payload.items:
        raise HTTPException(status_code=400, detail="Đơn hàng phải chứa ít nhất 1 sản phẩm.")

    # 1. Kiểm tra tồn kho của từng sản phẩm
    skus = [item.sku for item in payload.items]
    products_cursor = db.products.find({"sku": {"$in": skus}})
    product_map = {doc["sku"]: doc async for doc in products_cursor}

    for item in payload.items:
        prod = product_map.get(item.sku)
        if not prod:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy sản phẩm SKU: {item.sku}")
        if prod.get("stock", 0) < item.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Sản phẩm '{prod['name']}' không đủ hàng trong kho (Còn {prod.get('stock', 0)}, yêu cầu {item.quantity})."
            )

    # 2. Tính tổng tiền & chuẩn bị snapshot
    total_amount = sum(item.unit_price * item.quantity for item in payload.items)
    order_code = f"DH_{uuid.uuid4().hex[:6].upper()}"

    now_iso = datetime.now(timezone.utc).isoformat()
    order_doc = {
        "order_code": order_code,
        "customer_email": payload.customer_email,
        "shipping_address": payload.shipping_address.model_dump(),
        "items": [item.model_dump() for item in payload.items],
        "total_amount": total_amount,
        "status": "Đang giao",
        "payment_status": "Đã thanh toán" if payload.payment_method == "Chuyển khoản VNPAY" else "Chưa thanh toán",
        "payment_method": payload.payment_method,
        "dates": {
            "created_at": now_iso,
            "paid_at": now_iso if payload.payment_method == "Chuyển khoản VNPAY" else None,
            "estimated_delivery": None
        }
    }

    # 3. Trừ tồn kho sản phẩm bằng Atomic Updates
    for item in payload.items:
        await db.products.update_one(
            {"sku": item.sku, "stock": {"$gte": item.quantity}},
            {"$inc": {"stock": -item.quantity}}
        )

    # 4. Lưu đơn hàng vào MongoDB
    await db.orders.insert_one(order_doc)

    # Xóa _id trước khi trả về
    order_doc.pop("_id", None)
    return OrderResponse(**order_doc)

@router.get("", response_model=List[OrderResponse])
async def get_orders(
    customer_email: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Đang giao, Đã giao, Đã hủy"),
    limit: int = 50
):
    """Lấy danh sách đơn đặt hàng."""
    db = get_database()
    filter_query = {}
    if customer_email:
        filter_query["customer_email"] = customer_email
    if status:
        filter_query["status"] = status

    cursor = db.orders.find(filter_query, {"_id": 0}).sort("dates.created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)

@router.get("/{order_code}", response_model=OrderResponse)
async def get_order_by_code(order_code: str):
    """Chi tiết đơn hàng theo mã đơn."""
    db = get_database()
    order = await db.orders.find_one({"order_code": order_code}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đơn hàng {order_code}")
    return order

@router.patch("/{order_code}/status", dependencies=[Depends(check_origin), Depends(require_admin)])
async def update_order_status(order_code: str, status: str = Query(..., regex="^(Đang giao|Đã giao|Đã hủy)$")):
    """Cập nhật trạng thái đơn hàng (Dành cho Admin)."""
    db = get_database()
    result = await db.orders.update_one(
        {"order_code": order_code},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đơn hàng {order_code}")
    return {"message": "Cập nhật trạng thái thành công", "order_code": order_code, "status": status}
