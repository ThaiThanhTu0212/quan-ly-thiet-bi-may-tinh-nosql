import os
from typing import List
from pydantic_settings import BaseSettings
from pathlib import Path

# Đường dẫn thư mục backend
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "PC Builder E-Commerce API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Server config
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # MongoDB connection
    MONGODB_URI: str = "mongodb://localhost:27017"
    DB_NAME: str = "QuanLyThietBiMayTinh"

    # JWT Config
    JWT_SECRET: str = "supersecret_pcbuilder_2026_nosql_key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000"

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = str(BACKEND_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
