from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from pymongo.errors import ConnectionFailure

from app.core.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.routers import auth, cart, products, pc_builder, orders, analytics, locations, admin, account
from app.services.images import UPLOAD_DIR

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động kết nối MongoDB
    await connect_to_mongo()
    try:
        yield
    finally:
        await close_mongo_connection()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hệ thống Backend API cho Website Bán Linh Kiện & Build PC (NoSQL - MongoDB)",
    lifespan=lifespan
)

# Cấu hình CORS cho phép Frontend Next.js gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các Router API
for router in (auth.router, cart.router, products.router, orders.router, analytics.router, locations.router, admin.router, account.router):
    app.include_router(router, prefix="/api/v1")
    for alias in {"/api", settings.API_V1_STR} - {"/api/v1"}:
        app.include_router(router, prefix=alias, include_in_schema=False)
app.include_router(analytics.router, prefix="/api/v1/admin")
app.include_router(pc_builder.router, prefix="/api/v1/builder")
for prefix in {"/api", "/api/v1", settings.API_V1_STR}:
    app.include_router(pc_builder.router, prefix=prefix + "/pc-builder", include_in_schema=False)


@app.exception_handler(ConnectionFailure)
async def database_unavailable(_request: Request, _error: ConnectionFailure):
    return JSONResponse(status_code=503, content={"detail": "MongoDB chưa sẵn sàng. Vui lòng thử lại."})


@app.exception_handler(RequestValidationError)
async def invalid_request(_request: Request, error: RequestValidationError):
    if "/auth/" not in _request.url.path:
        return await request_validation_exception_handler(_request, error)
    details = [
        {key: issue[key] for key in ("loc", "msg", "type")}
        for issue in error.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": details})

# Phục vụ file tĩnh ảnh sản phẩm nếu có
images_dir = Path(__file__).resolve().parent.parent.parent / "images" / "images"
if images_dir.exists():
    app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
for prefix in {"/api/v1", "/api", settings.API_V1_STR}:
    app.mount(prefix + "/media", StaticFiles(directory=str(UPLOAD_DIR)), name="product-media-" + prefix)

@app.get("/")
async def root():
    return {
        "message": "Chào mừng đến với API Website Bán Linh Kiện & Build PC (PC Builder E-Commerce)",
        "docs_url": "/docs",
        "database": settings.DB_NAME,
        "status": "Online"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME, "version": settings.VERSION}
