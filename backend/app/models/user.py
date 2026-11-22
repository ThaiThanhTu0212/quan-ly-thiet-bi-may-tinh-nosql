from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

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
    cart: List[CartItem] = Field(default_factory=list)

class UserResponse(UserBase):
    id: Optional[str] = None

class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=72, repr=False)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Mật khẩu vượt quá 72 byte.")
        return value


class RegisterRequest(LoginRequest):
    username: str = Field(min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=72, repr=False)
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=100)

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Vui lòng nhập họ tên.")
        return value.strip()

class TokenResponse(BaseModel):
    access_token: str | None = None
    token_type: str | None = None
    user: UserResponse
