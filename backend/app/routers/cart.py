from fastapi import APIRouter, Depends, HTTPException
from app.database.connection import get_database
from app.models.order import CartBatch, CartEntry
from app.models.user import UserResponse
from app.routers.auth import check_origin, require_user
from app.services.cart import cart_response, change_cart, combine_items

router = APIRouter(prefix="/cart", tags=["Cart"], dependencies=[Depends(check_origin)])


@router.get("")
async def get_cart(user: UserResponse = Depends(require_user)):
    return await cart_response(get_database(), user.id)


@router.post("/items")
async def add_items(payload: CartBatch, user: UserResponse = Depends(require_user)):
    additions = combine_items(payload.items)

    def add(current):
        for sku, quantity in additions.items():
            current[sku] = current.get(sku, 0) + quantity
        return current

    return await change_cart(get_database(), user.id, add)


@router.put("/items/{sku}")
async def set_quantity(sku: str, payload: CartEntry, user: UserResponse = Depends(require_user)):
    if sku != payload.sku:
        raise HTTPException(422, "Mã linh kiện không khớp.")

    def update(current):
        if sku not in current:
            raise HTTPException(404, "Linh kiện không còn trong giỏ hàng.")
        current[sku] = payload.quantity
        return current

    return await change_cart(get_database(), user.id, update)


@router.delete("/items/{sku}")
async def remove_item(sku: str, user: UserResponse = Depends(require_user)):
    def remove(current):
        current.pop(sku, None)
        return current

    return await change_cart(get_database(), user.id, remove)


@router.delete("")
async def clear_cart(user: UserResponse = Depends(require_user)):
    return await change_cart(get_database(), user.id, lambda current: {})
