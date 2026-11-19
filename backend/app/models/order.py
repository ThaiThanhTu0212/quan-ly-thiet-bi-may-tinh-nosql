from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    street: str
    ward: str
    district: str
    province: str

class OrderItemSnapshot(BaseModel):
    sku: str
    name: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)

class OrderCreateRequest(BaseModel):
    customer_email: str
    shipping_address: ShippingAddress
    items: List[OrderItemSnapshot]
    payment_method: str = "COD"

class OrderDates(BaseModel):
    created_at: str
    paid_at: Optional[str] = None
    estimated_delivery: Optional[str] = None

class OrderResponse(BaseModel):
    order_code: str
    customer_email: str
    shipping_address: ShippingAddress
    items: List[OrderItemSnapshot]
    total_amount: float
    status: str
    payment_status: str
    payment_method: Optional[str] = "COD"
    dates: OrderDates
