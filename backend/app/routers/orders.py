import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import DuplicateKeyError, OperationFailure
from pymongo.read_concern import ReadConcern
from pymongo.write_concern import WriteConcern

from app.database.connection import get_database
from app.models.order import OrderCreateRequest, OrderResponse
from app.models.user import UserResponse
from app.routers.auth import check_origin, require_admin, require_user
from app.services.cart import combine_items

router = APIRouter(prefix="/orders", tags=["Orders"], dependencies=[Depends(check_origin)])


def owner_filter(user):
    return {"$or": [{"user_id": user.id}, {"user_id": {"$exists": False}, "customer_email": user.email}]}


async def validate_address(db, address, session):
    province = await db.locations.find_one({"province_name": address.province}, session=session)
    districts = province.get("districts", []) if province else []
    district = next((item for item in districts if item["district_name"] == address.district), None)
    if not district or not any(ward["ward_name"] == address.ward for ward in district["wards"]):
        raise HTTPException(422, "Địa chỉ tỉnh, huyện và xã không hợp lệ.")


@router.post("", response_model=OrderResponse, status_code=201)
async def create_order(payload: OrderCreateRequest, user: UserResponse = Depends(require_user)):
    db = get_database()
    identity = {"user_id": user.id, "request_id": payload.request_id}
    existing = await db.orders.find_one(identity, {"_id": 0})
    if existing:
        return existing
    quantities = combine_items(payload.items)
    order_code = f"DH_{uuid.uuid4().hex.upper()}"

    async def place_order(session):
        existing = await db.orders.find_one(identity, {"_id": 0}, session=session)
        if existing:
            return existing
        buyer = await db.users.find_one({"_id": ObjectId(user.id)}, session=session)
        if buyer is None:
            raise HTTPException(401, "Tài khoản không còn tồn tại.")
        cart = combine_items(buyer.get("cart", []))
        for sku, quantity in quantities.items():
            if quantity > cart.get(sku, 0):
                raise HTTPException(409, "Giỏ hàng vừa thay đổi. Vui lòng kiểm tra lại.")
        await validate_address(db, payload.shipping_address, session)
        products = await db.products.find({"sku": {"$in": list(quantities)}}, session=session).to_list(None)
        product_map = {product["sku"]: product for product in products}
        snapshots = []
        for sku, quantity in quantities.items():
            product = product_map.get(sku)
            if product is None or product.get("stock", 0) < quantity:
                raise HTTPException(409, f"Linh kiện {sku} không đủ hàng.")
            snapshots.append({
                "product_id": str(product["_id"]), "sku": sku, "name": product["name"],
                "quantity": quantity, "unit_price": product["price"], "category": product.get("category"),
            })
        total = sum(item["quantity"] * item["unit_price"] for item in snapshots)
        if payload.expected_total is not None and total != payload.expected_total:
            raise HTTPException(409, "Giá linh kiện đã thay đổi. Vui lòng tải lại giỏ hàng trước khi đặt.")
        for item in snapshots:
            result = await db.products.update_one(
                {"sku": item["sku"], "stock": {"$gte": item["quantity"]}},
                {"$inc": {"stock": -item["quantity"]}}, session=session,
            )
            if result.modified_count != 1:
                raise HTTPException(409, f"Linh kiện {item['sku']} vừa hết hàng.")
        now = datetime.now(timezone.utc).isoformat()
        order = {
            **identity, "order_code": order_code, "customer_email": user.email,
            "shipping_address": payload.shipping_address.model_dump(), "items": snapshots,
            "total_amount": total, "status": "Chờ xác nhận", "payment_status": "Chưa thanh toán",
            "payment_method": payload.payment_method,
            "dates": {"created_at": now, "paid_at": None, "estimated_delivery": None},
        }
        await db.orders.insert_one(order, session=session)
        remainder = [
            {"sku": sku, "quantity": qty - quantities.get(sku, 0)}
            for sku, qty in cart.items() if qty > quantities.get(sku, 0)
        ]
        await db.users.update_one({"_id": buyer["_id"]}, {"$set": {"cart": remainder}}, session=session)
        order.pop("_id", None)
        return order

    try:
        async with await db.client.start_session() as session:
            return await session.with_transaction(
                place_order, read_concern=ReadConcern("snapshot"), write_concern=WriteConcern("majority")
            )
    except DuplicateKeyError:
        existing = await db.orders.find_one(identity, {"_id": 0})
        if existing:
            return existing
        raise
    except OperationFailure as error:
        if error.code in (20, 303):
            raise HTTPException(503, "Đặt hàng cần MongoDB Atlas hoặc replica set. Hãy cấu hình MongoDB rồi thử lại.") from None
        raise


@router.get("", response_model=list[OrderResponse])
async def get_orders(
    customer_email: str | None = None, status: str | None = None,
    limit: int = Query(50, ge=1, le=100), skip: int = Query(0, ge=0),
    user: UserResponse = Depends(require_user),
):
    query = {} if user.role == "admin" else owner_filter(user)
    if customer_email and user.role == "admin":
        query["customer_email"] = customer_email
    if status:
        query["status"] = status
    return await get_database().orders.find(query, {"_id": 0}).sort(
        [("dates.created_at", -1), ("order_code", 1)]
    ).skip(skip).limit(limit).to_list(limit)


@router.get("/{order_code}", response_model=OrderResponse)
async def get_order_by_code(order_code: str, user: UserResponse = Depends(require_user)):
    query = {} if user.role == "admin" else owner_filter(user)
    query["order_code"] = order_code
    order = await get_database().orders.find_one(query, {"_id": 0})
    if order is None:
        raise HTTPException(404, "Không tìm thấy đơn hàng.")
    return order


@router.patch("/{order_code}/status", dependencies=[Depends(require_admin)])
async def update_order_status(order_code: str, status: str = Query(pattern="^(Chờ xác nhận|Đang giao|Đã giao|Đã hủy)$")):
    # Cancellation restores stock in the same transaction.
    db = get_database()
    async def update(session):
        order = await db.orders.find_one({"order_code": order_code}, session=session)
        if order is None:
            raise HTTPException(404, "Không tìm thấy đơn hàng.")
        old = order["status"]
        if old == status:
            return {"order_code": order_code, "status": status}
        transitions = {"Chờ xác nhận": {"Đang giao", "Đã hủy"}, "Đang giao": {"Đã giao", "Đã hủy"}}
        if status not in transitions.get(old, set()):
            raise HTTPException(409, "Không thể chuyển trạng thái đơn hàng.")
        if status == "Đã hủy":
            for item in order["items"]:
                await db.products.update_one({"sku": item["sku"]}, {"$inc": {"stock": item["quantity"]}}, session=session)
        changes = {"status": status}
        if status == "Đã giao" and order.get("payment_method", "COD") == "COD":
            changes["payment_status"] = "Đã thanh toán"
            changes["dates.paid_at"] = datetime.now(timezone.utc).isoformat()
        await db.orders.update_one({"_id": order["_id"]}, {"$set": changes}, session=session)
        return {"order_code": order_code, "status": status}
    async with await db.client.start_session() as session:
        return await session.with_transaction(update)


@router.post("/{order_code}/cancel")
async def cancel_my_order(order_code: str, user: UserResponse = Depends(require_user)):
    db = get_database()
    async def cancel(session):
        # Ownership is enforced even for an admin using this customer endpoint.
        order = await db.orders.find_one({**owner_filter(user), "order_code": order_code}, session=session)
        if order is None: raise HTTPException(404, "Không tìm thấy đơn hàng của bạn.")
        if order["status"] == "Đã hủy": return {"order_code": order_code, "status": "Đã hủy"}
        if order["status"] != "Chờ xác nhận": raise HTTPException(409, "Chỉ có thể hủy đơn đang chờ xác nhận.")
        for item in order["items"]:
            await db.products.update_one({"sku": item["sku"]}, {"$inc": {"stock": item["quantity"]}}, session=session)
        result = await db.orders.update_one({"_id": order["_id"], "status": "Chờ xác nhận"}, {"$set": {
            "status": "Đã hủy", "cancelled_by": user.id, "dates.cancelled_at": datetime.now(timezone.utc).isoformat(),
        }}, session=session)
        if result.modified_count != 1: raise HTTPException(409, "Đơn hàng vừa thay đổi. Vui lòng tải lại.")
        return {"order_code": order_code, "status": "Đã hủy"}
    try:
        async with await db.client.start_session() as session:
            return await session.with_transaction(cancel)
    except OperationFailure as error:
        if error.code in (20, 303): raise HTTPException(503, "Hủy đơn cần MongoDB Atlas hoặc replica set.") from None
        raise
