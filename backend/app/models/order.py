from typing import Literal
from pydantic import BaseModel, Field, ConfigDict


class CartEntry(BaseModel):
    sku: str = Field(min_length=1, max_length=64)
    quantity: int = Field(ge=1, le=999, strict=True)


class CartBatch(BaseModel):
    items: list[CartEntry] = Field(min_length=1, max_length=100)


class ShippingAddress(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    full_name: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r"^\+?[0-9 ()-]{9,20}$")
    street: str = Field(min_length=1, max_length=250)
    ward: str = Field(min_length=1, max_length=100)
    district: str = Field(min_length=1, max_length=100)
    province: str = Field(min_length=1, max_length=100)


class OrderItemSnapshot(CartEntry):
    category: dict[str, str] | None = None
    product_id: str | None = None
    name: str
    unit_price: float = Field(ge=0)


class OrderCreateRequest(BaseModel):
    request_id: str = Field(min_length=8, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    shipping_address: ShippingAddress
    items: list[CartEntry] = Field(min_length=1, max_length=100)
    payment_method: Literal["COD", "Chuyển khoản"] = "COD"
    expected_total: float | None = Field(default=None, ge=0, allow_inf_nan=False)


class OrderDates(BaseModel):
    cancelled_at: str | None = None
    created_at: str
    paid_at: str | None = None
    estimated_delivery: str | None = None


class OrderResponse(BaseModel):
    order_code: str
    customer_email: str
    shipping_address: ShippingAddress
    items: list[OrderItemSnapshot]
    total_amount: float
    status: str
    payment_status: str
    payment_method: str = "COD"
    dates: OrderDates
