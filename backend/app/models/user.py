from typing import List, Optional
from pydantic import BaseModel, EmailStr

class CartItem(BaseModel):
    sku: str
    quantity: int = 1

class UserAddress(BaseModel):
    street: Optional[str] = ""
    ward: Optional[str] = ""
    district: Optional[str] = ""
    province: Optional[str] = ""

class UserBase(BaseModel):
    username: str
    email: str
    full_name: Optional[str] = ""
    phone: Optional[str] = ""
    role: str = "customer"
    default_address: Optional[UserAddress] = None
    cart: List[CartItem] = []

class UserResponse(UserBase):
    id: Optional[str] = None

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
