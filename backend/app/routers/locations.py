from fastapi import APIRouter
from app.database.connection import get_database

router = APIRouter(prefix="/locations", tags=["Locations (Hierarchical Embedding)"])

@router.get("")
async def get_all_locations():
    """
    Lấy danh sách tỉnh thành kèm toàn bộ quận huyện và phường xã lồng nhau trong 1 lượt truy vấn NoSQL duy nhất.
    """
    db = get_database()
    cursor = db.locations.find({}, {"_id": 0}).sort("province_id", 1)
    return await cursor.to_list(length=100)
