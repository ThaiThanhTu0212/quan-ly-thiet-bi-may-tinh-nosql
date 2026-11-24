from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.errors import DuplicateKeyError
from starlette.concurrency import run_in_threadpool

from app.core.config import settings
from app.database.connection import get_database
from app.models.user import LoginRequest, RegisterRequest, TokenResponse, UserResponse

COOKIE_NAME = "pc_builder_session"
bearer = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/auth", tags=["Auth"])


def check_origin(request: Request):
    origin = request.headers.get("origin")
    if origin and origin not in settings.cors_origins and origin != str(request.base_url).rstrip("/"):
        raise HTTPException(403, "Nguồn yêu cầu không được phép.")


def public_user(user: dict) -> UserResponse:
    return UserResponse(id=str(user["_id"]), **user)


async def require_user(
    request: Request, credentials: HTTPAuthorizationCredentials | None = Depends(bearer)
) -> UserResponse:
    token = credentials.credentials if credentials else request.cookies.get(COOKIE_NAME)
    unauthorized = HTTPException(401, "Phiên đăng nhập không hợp lệ.", headers={"WWW-Authenticate": "Bearer"})
    if not token:
        raise unauthorized
    try:
        claims = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"], options={"require": ["sub", "exp"]})
        subject = claims["sub"]
    except jwt.InvalidTokenError:
        raise unauthorized from None
    if not ObjectId.is_valid(subject):
        raise unauthorized
    user = await get_database().users.find_one({"_id": ObjectId(subject)}, {"password_hash": 0})
    if user is None or user.get("role") not in {"admin", "customer"}:
        raise unauthorized
    return public_user(user)


def require_admin(user: UserResponse = Depends(require_user)) -> UserResponse:
    if user.role != "admin":
        raise HTTPException(403, "Chức năng này yêu cầu quyền quản trị.")
    return user


@router.post("/register", status_code=201, response_model=UserResponse, dependencies=[Depends(check_origin)])
async def register(data: RegisterRequest):
    password_hash = await run_in_threadpool(bcrypt.hashpw, data.password.encode(), bcrypt.gensalt())
    user = {
        "username": data.username.lower(),
        "email": data.email.lower(),
        "full_name": data.full_name,
        "password_hash": password_hash.decode(),
        "role": "customer",
        "cart": [],
    }
    try:
        result = await get_database().users.insert_one(user)
    except DuplicateKeyError:
        raise HTTPException(409, "Tên đăng nhập hoặc email đã được sử dụng.") from None
    user["_id"] = result.inserted_id
    return public_user(user)


@router.post("/login", response_model=TokenResponse, response_model_exclude_none=True,
             dependencies=[Depends(check_origin)])
async def login(data: LoginRequest, response: Response, cookie_only: bool = False):
    identity = data.username.strip().lower()
    field = "email" if "@" in identity else "username"
    user = await get_database().users.find_one({field: identity})
    try:
        verified = bool(user and await run_in_threadpool(
            bcrypt.checkpw, data.password.encode(), user.get("password_hash", "").encode()
        ))
    except ValueError:
        verified = False
    if not verified:
        raise HTTPException(401, "Tên đăng nhập hoặc mật khẩu không đúng.")
    lifetime = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = jwt.encode(
        {"sub": str(user["_id"]), "exp": datetime.now(timezone.utc) + lifetime},
        settings.JWT_SECRET,
        algorithm="HS256",
    )
    response.headers["Cache-Control"] = "no-store"
    response.set_cookie(COOKIE_NAME, token, max_age=int(lifetime.total_seconds()),
                        httponly=True, secure=settings.AUTH_COOKIE_SECURE, samesite="lax")
    current_user = public_user(user)
    if cookie_only:
        return TokenResponse(user=current_user)
    return TokenResponse(access_token=token, token_type="bearer", user=current_user)


@router.get("/me", response_model=UserResponse)
async def me(response: Response, user: UserResponse = Depends(require_user)):
    response.headers["Cache-Control"] = "no-store"
    return user


@router.post("/logout", status_code=204, dependencies=[Depends(check_origin)])
async def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, httponly=True, secure=settings.AUTH_COOKIE_SECURE, samesite="lax")
