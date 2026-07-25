"""
Motor (async MongoDB) client. Import `get_db()` anywhere a collection is needed.
"""
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URI)
    return _client


def get_db():
    return get_client()[settings.MONGODB_DB_NAME]


# Collection accessors — single source of truth for collection names
def users_collection():
    return get_db()["users"]


def sessions_collection():
    return get_db()["research_sessions"]


def messages_collection():
    return get_db()["research_messages"]


def collections_collection():
    return get_db()["research_collections"]
