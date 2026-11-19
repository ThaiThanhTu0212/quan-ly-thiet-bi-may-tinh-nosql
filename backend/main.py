import uvicorn
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"🚀 Khởi động Backend FastAPI tại http://localhost:{port}")
    print(f"📖 Tài liệu Swagger UI tại: http://localhost:{port}/docs")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
