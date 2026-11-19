import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.database.connection import connect_to_mongo, close_mongo_connection
from app.routers import products, pc_builder, orders, analytics, locations

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi động kết nối MongoDB
    await connect_to_mongo()
    yield
    # Ngắt kết nối MongoDB khi tắt server
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
    allow_origins=["*"],  # Trong môi trường dev cho phép gọi từ localhost:3000
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký các Router API
app.include_router(products.router, prefix=settings.API_V1_STR)
app.include_router(pc_builder.router, prefix=settings.API_V1_STR)
app.include_router(orders.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(locations.router, prefix=settings.API_V1_STR)

# Phục vụ file tĩnh ảnh sản phẩm nếu có
images_dir = Path(__file__).resolve().parent.parent.parent / "images" / "images"
if images_dir.exists():
    app.mount("/images", StaticFiles(directory=str(images_dir)), name="images")

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
