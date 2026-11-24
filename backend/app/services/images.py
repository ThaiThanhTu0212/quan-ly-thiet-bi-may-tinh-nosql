"""Product image storage shared by the upload route and static file mount."""
from pathlib import Path
from urllib.parse import urlsplit
from fastapi import HTTPException

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "products"
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def normalize_image_url(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("Đường dẫn ảnh không được để trống")
    if len(value) > 2048 or "\\" in value or any(ord(c) < 32 for c in value):
        raise ValueError("Đường dẫn ảnh không hợp lệ; hãy tải ảnh từ máy lên")
    parsed = urlsplit(value)
    if parsed.scheme in {"http", "https"} and parsed.hostname and not parsed.username and not parsed.password:
        return value
    if value.startswith("/") and not value.startswith("//") and not parsed.scheme and not parsed.netloc:
        if value.startswith("/images/images/"):
            return value.replace("/images/images/", "/images/", 1)
        return value
    raise ValueError("Ảnh phải là URL http/https hoặc đường dẫn bắt đầu bằng /")


def image_extension(data: bytes) -> str:
    """Allow raster formats only; never trust a client filename or MIME type."""
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Mỗi ảnh tối đa 5 MB.")
    if len(data) < 12:
        raise HTTPException(415, "File ảnh không hợp lệ.")
    if data.startswith(b'\xff\xd8\xff') and data.rstrip().endswith(b'\xff\xd9'):
        return ".jpg"
    if data.startswith(b'\x89PNG\r\n\x1a\n') and data[12:16] == b'IHDR' and b'IEND' in data[-16:]:
        return ".png"
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP' and int.from_bytes(data[4:8], 'little') + 8 == len(data):
        return ".webp"
    if data[:6] in {b'GIF87a', b'GIF89a'} and data.endswith(b';'):
        return ".gif"
    raise HTTPException(415, "Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF hợp lệ.")
