import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("uvicorn.info")

class MongoDBManager:
    client: AsyncIOMotorClient = None
    db: AsyncIOMotorDatabase = None

mongodb_manager = MongoDBManager()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB")
    try:
        mongodb_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000
        )
        mongodb_manager.db = mongodb_manager.client[settings.DB_NAME]
        # Thử ping server
        await mongodb_manager.client.admin.command('ping')
        # Checkout retries must remain unique even when the seed script was not run.
        await mongodb_manager.db.orders.create_index(
            [("user_id", 1), ("request_id", 1)], unique=True,
            name="idx_user_checkout_request",
            partialFilterExpression={"user_id": {"$type": "string"}, "request_id": {"$type": "string"}},
        )
        await mongodb_manager.db.orders.create_index(
            [("order_code", 1)], unique=True, name="idx_unique_order_code",
        )
        logger.info(f"Successfully connected to MongoDB database: '{settings.DB_NAME}'")
    except Exception as exc:
        logger.warning("MongoDB startup connection failed (%s).", type(exc).__name__)

async def close_mongo_connection():
    if mongodb_manager.client:
        logger.info("Closing MongoDB connection...")
        mongodb_manager.client.close()
        mongodb_manager.client = None
        mongodb_manager.db = None
        logger.info("MongoDB connection closed.")

def get_database() -> AsyncIOMotorDatabase:
    if mongodb_manager.db is None:
        if mongodb_manager.client is None:
            mongodb_manager.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000
            )
        mongodb_manager.db = mongodb_manager.client[settings.DB_NAME]
    return mongodb_manager.db
