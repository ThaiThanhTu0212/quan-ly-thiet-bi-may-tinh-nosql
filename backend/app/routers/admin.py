"""Authenticated administration endpoints."""
import math
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from starlette.concurrency import run_in_threadpool
from uuid import uuid4
from pydantic import BaseModel, Field, ConfigDict, field_validator
from pymongo.errors import DuplicateKeyError, OperationFailure
from app.database.connection import get_database
from app.models.product import ProductBase
from app.routers.auth import check_origin, require_admin
from app.routers.orders import get_orders, update_order_status
from app.models.user import UserResponse
from app.services.images import UPLOAD_DIR, MAX_IMAGE_BYTES, image_extension, normalize_image_url

router = APIRouter(prefix="/admin", tags=["Administration"], dependencies=[Depends(require_admin), Depends(check_origin)])


@router.post("/uploads/images", status_code=201)
async def upload_product_image(file: UploadFile = File(...)):
    try:
        data = await file.read(MAX_IMAGE_BYTES + 1)
        extension = image_extension(data)
        filename = uuid4().hex + extension
        def save():
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            (UPLOAD_DIR / filename).write_bytes(data)
        await run_in_threadpool(save)
        return {"url": "/backend-api/media/" + filename}
    finally:
        await file.close()


class ProductWrite(ProductBase):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    sku: str = Field(min_length=1, max_length=64, pattern=r"^[a-zA-Z0-9_-]+$")
    name: str = Field(min_length=1, max_length=200)
    price: float = Field(ge=0, allow_inf_nan=False)
    stock: int = Field(ge=0, strict=True)
    min_stock_alert: int = Field(default=5, ge=0, strict=True)
    images: list[str] = Field(default_factory=list, max_length=20)

    @field_validator("images")
    @classmethod
    def valid_images(cls, values):
        return list(dict.fromkeys(normalize_image_url(value) for value in values))

    @field_validator("category", "brand")
    @classmethod
    def nonempty_labels(cls, value):
        if not value.id.strip() or not value.name.strip():
            raise ValueError("Danh mục và thương hiệu phải có mã và tên")
        value.id = value.id.strip()
        value.name = value.name.strip()
        return value

    @field_validator("specs")
    @classmethod
    def safe_specs(cls, value: dict[str, Any]):
        numeric = {"tdp_watt", "wattage", "recommended_psu_watt", "length_mm", "max_gpu_length_mm", "height_mm", "max_cpu_cooler_height_mm", "max_tdp_cooling_watt", "capacity_gb", "vram_gb", "cores", "threads", "ram_slots", "max_ram_gb", "bus_speed_mhz", "modules", "base_clock_ghz", "boost_clock_ghz", "cache_mb", "voltage_v", "read_speed_mbps", "write_speed_mbps", "rpm", "fan_size_mm", "included_fans", "radiator_size_mm", "screen_size_inch", "refresh_rate_hz", "response_time_ms"}
        for key in numeric & value.keys():
            number = value[key]
            if isinstance(number, bool) or not isinstance(number, (int, float)) or not math.isfinite(number) or number < 0:
                raise ValueError(f"{key} phải là số không âm")
        for key in {"supported_sockets", "supported_motherboards"} & value.keys():
            if not isinstance(value[key], list) or not all(isinstance(item, str) and item.strip() for item in value[key]):
                raise ValueError(f"{key} phải là danh sách chuỗi")
        for key in {"socket", "ram_type", "form_factor"} & value.keys():
            if not isinstance(value[key], str) or not value[key].strip():
                raise ValueError(f"{key} phải là chuỗi không rỗng")
        def check(item):
            if isinstance(item, dict):
                for key, val in item.items():
                    if not key or key.startswith("$") or "." in key or "\x00" in key:
                        raise ValueError("Tên thông số không hợp lệ")
                    check(val)
            elif isinstance(item, list):
                for val in item: check(val)
            elif isinstance(item, float) and not math.isfinite(item):
                raise ValueError("Thông số phải hữu hạn")
        check(value)
        return value


@router.get("/products")
async def list_products(q: str = "", skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    import re
    db = get_database()
    query = {"$or": [{"name": {"$regex": re.escape(q), "$options": "i"}}, {"sku": {"$regex": re.escape(q), "$options": "i"}}]} if q else {}
    return {"total": await db.products.count_documents(query), "items": await db.products.find(query, {"_id": 0}).sort("sku", 1).skip(skip).limit(limit).to_list(limit)}


@router.post("/products", status_code=201)
async def create_product(payload: ProductWrite):
    doc = payload.model_dump()
    try:
        await get_database().products.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(409, "SKU đã tồn tại.") from None
    doc.pop("_id", None)
    return doc


@router.put("/products/{sku}")
async def edit_product(sku: str, payload: ProductWrite):
    if sku != payload.sku:
        raise HTTPException(422, "Không được đổi SKU của linh kiện.")
    result = await get_database().products.update_one({"sku": sku}, {"$set": payload.model_dump()})
    if not result.matched_count: raise HTTPException(404, "Không tìm thấy linh kiện.")
    return payload


@router.delete("/products/{sku}")
async def delete_product(sku: str):
    result = await get_database().products.delete_one({"sku": sku})
    if not result.deleted_count: raise HTTPException(404, "Không tìm thấy linh kiện.")
    return {"deleted": sku}


@router.get("/orders")
async def list_orders(status: str | None = None, skip: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100), user: UserResponse = Depends(require_admin)):
    query = {"status": status} if status else {}
    return {"total": await get_database().orders.count_documents(query), "items": await get_orders(status=status, skip=skip, limit=limit, user=user)}


class StatusWrite(BaseModel):
    status: str = Field(pattern="^(Chờ xác nhận|Đang giao|Đã giao|Đã hủy)$")


@router.patch("/orders/{code}/status")
async def change_status(code: str, payload: StatusWrite):
    try:
        return await update_order_status(code, payload.status)
    except OperationFailure as error:
        if error.code in (20, 303): raise HTTPException(503, "Cần MongoDB Atlas hoặc replica set.") from None
        raise
