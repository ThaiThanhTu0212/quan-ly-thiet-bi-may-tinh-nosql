"""Customer profile and bounded address book embedded in users."""
from uuid import uuid4
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from app.database.connection import get_database
from app.models.order import ShippingAddress, OrderResponse
from app.models.user import UserResponse
from app.routers.auth import require_user, check_origin
from app.routers.orders import validate_address, owner_filter

router = APIRouter(prefix="/account", tags=["Account"], dependencies=[Depends(check_origin)])


class ProfileWrite(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    full_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(default="", pattern=r"^(?:\+?[0-9 ()-]{9,20})?$")


class AddressWrite(ShippingAddress):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    label: str = Field(default="Nhà riêng", min_length=1, max_length=50)
    set_default: bool = False


async def account_document(db, user_id):
    doc = await db.users.find_one({"_id": ObjectId(user_id)}, {"username": 1, "email": 1, "full_name": 1, "phone": 1, "addresses": 1, "default_address_id": 1})
    if doc is None: raise HTTPException(401, "Tài khoản không còn tồn tại.")
    return {"id": str(doc["_id"]), "username": doc["username"], "email": doc["email"],
            "full_name": (doc.get("full_name") or ""), "phone": (doc.get("phone") or ""),
            "addresses": doc.get("addresses", []), "default_address_id": doc.get("default_address_id")}


@router.get("")
async def get_account(user: UserResponse = Depends(require_user)):
    return await account_document(get_database(), user.id)


@router.patch("")
async def update_profile(payload: ProfileWrite, user: UserResponse = Depends(require_user)):
    db = get_database()
    result = await db.users.update_one({"_id": ObjectId(user.id)}, {"$set": payload.model_dump()})
    if not result.matched_count: raise HTTPException(401, "Tài khoản không còn tồn tại.")
    return await account_document(db, user.id)


@router.get("/orders", response_model=list[OrderResponse])
async def get_my_orders(status: str | None = None, skip: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100), user: UserResponse = Depends(require_user)):
    query = owner_filter(user)
    if status: query["status"] = status
    return await get_database().orders.find(query, {"_id": 0}).sort([("dates.created_at", -1), ("order_code", 1)]).skip(skip).limit(limit).to_list(limit)


async def change_addresses(db, user_id, transform):
    identity = {"_id": ObjectId(user_id)}
    for _ in range(8):
        doc = await db.users.find_one(identity, {"addresses": 1, "default_address_id": 1})
        if doc is None: raise HTTPException(401, "Tài khoản không còn tồn tại.")
        old = doc.get("addresses", [])
        addresses, default_id = transform([dict(item) for item in old], doc.get("default_address_id"))
        if len(addresses) > 10: raise HTTPException(422, "Mỗi tài khoản tối đa 10 địa chỉ.")
        if default_id is not None and not any(item["id"] == default_id for item in addresses):
            raise HTTPException(422, "Địa chỉ mặc định không hợp lệ.")
        query = {**identity, "addresses": old if "addresses" in doc else {"$exists": False},
                 "default_address_id": doc["default_address_id"] if "default_address_id" in doc else {"$exists": False}}
        result = await db.users.update_one(query, {"$set": {"addresses": addresses, "default_address_id": default_id}})
        if result.matched_count: return await account_document(db, user_id)
    raise HTTPException(409, "Sổ địa chỉ vừa thay đổi. Vui lòng tải lại.")


@router.post("/addresses", status_code=201)
async def add_address(payload: AddressWrite, user: UserResponse = Depends(require_user)):
    db = get_database()
    await validate_address(db, payload, None)
    address = {**payload.model_dump(exclude={"set_default"}), "id": uuid4().hex}
    def add(items, default):
        items.append(address)
        return items, address["id"] if payload.set_default or not default else default
    return await change_addresses(db, user.id, add)


@router.put("/addresses/{address_id}")
async def edit_address(address_id: str, payload: AddressWrite, user: UserResponse = Depends(require_user)):
    db = get_database()
    await validate_address(db, payload, None)
    def edit(items, default):
        index = next((i for i, item in enumerate(items) if item["id"] == address_id), None)
        if index is None: raise HTTPException(404, "Không tìm thấy địa chỉ của bạn.")
        items[index] = {**payload.model_dump(exclude={"set_default"}), "id": address_id}
        return items, address_id if payload.set_default else default
    return await change_addresses(db, user.id, edit)


@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str, user: UserResponse = Depends(require_user)):
    def remove(items, default):
        if not any(item["id"] == address_id for item in items): raise HTTPException(404, "Không tìm thấy địa chỉ của bạn.")
        items = [item for item in items if item["id"] != address_id]
        return items, (items[0]["id"] if items else None) if default == address_id else default
    return await change_addresses(get_database(), user.id, remove)


@router.post("/addresses/{address_id}/default")
async def set_default_address(address_id: str, user: UserResponse = Depends(require_user)):
    return await change_addresses(get_database(), user.id, lambda items, default: (items, address_id))
