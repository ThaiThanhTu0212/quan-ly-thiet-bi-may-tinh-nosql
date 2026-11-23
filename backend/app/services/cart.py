from collections import Counter

from bson import ObjectId
from fastapi import HTTPException


def combine_items(items):
    quantities = Counter()
    for item in items:
        sku = item["sku"] if isinstance(item, dict) else item.sku
        quantity = item["quantity"] if isinstance(item, dict) else item.quantity
        quantities[sku] += quantity
    if any(quantity < 1 or quantity > 999 for quantity in quantities.values()):
        raise HTTPException(422, "Số lượng mỗi linh kiện phải từ 1 đến 999.")
    if len(quantities) > 100:
        raise HTTPException(422, "Giỏ hàng tối đa 100 loại linh kiện.")
    return dict(quantities)


async def cart_response(db, user_id):
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"cart": 1})
    if user is None:
        raise HTTPException(401, "Tài khoản không còn tồn tại.")
    quantities = combine_items(user.get("cart", []))
    products = await db.products.find({"sku": {"$in": list(quantities)}}, {"_id": 0}).to_list(None)
    by_sku = {product["sku"]: product for product in products}
    items = [
        {"sku": sku, "quantity": quantity, "product": by_sku.get(sku)}
        for sku, quantity in quantities.items()
    ]
    total = sum(item["quantity"] * item["product"]["price"] for item in items if item["product"])
    return {"items": items, "total_amount": total}


async def change_cart(db, user_id, transform):
    identity = {"_id": ObjectId(user_id)}
    for _ in range(8):
        user = await db.users.find_one(identity, {"cart": 1})
        if user is None:
            raise HTTPException(401, "Tài khoản không còn tồn tại.")
        old = user.get("cart", [])
        quantities = transform(combine_items(old))
        combine_items([{"sku": sku, "quantity": qty} for sku, qty in quantities.items()])
        products = await db.products.find({"sku": {"$in": list(quantities)}}).to_list(None)
        stocks = {item["sku"]: item["stock"] for item in products}
        for sku, quantity in quantities.items():
            if sku not in stocks or quantity > stocks[sku]:
                # Allow removing unavailable items while leaving the other cart entries intact.
                previous = combine_items(old).get(sku, 0)
                if quantity > previous:
                    raise HTTPException(409, f"Linh kiện {sku} không đủ hàng.")
        condition = {**identity, "cart": old} if "cart" in user else {**identity, "cart": {"$exists": False}}
        updated = [{"sku": sku, "quantity": qty} for sku, qty in quantities.items()]
        result = await db.users.update_one(condition, {"$set": {"cart": updated}})
        if result.matched_count:
            return await cart_response(db, user_id)
    raise HTTPException(409, "Giỏ hàng vừa thay đổi. Vui lòng thử lại.")
