"""
SafeVision API - Database Engine
Async SQLAlchemy engine and session factory for PostgreSQL.
"""

import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import settings

logger = logging.getLogger("safevision.database")

engine = None
async_session_maker = None


async def init_db():
    """Initialize the async database engine and session factory."""
    global engine, async_session_maker

    if not settings.database_url:
        logger.warning("DATABASE_URL not set — database features disabled")
        return

    db_url = settings.database_url
    # Convert standard postgres:// to postgresql+asyncpg:// if needed
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(
        db_url,
        echo=settings.debug,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )
    async_session_maker = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    logger.info("Database engine initialized")


async def dispose_db():
    """Dispose the database engine on shutdown."""
    global engine
    if engine:
        await engine.dispose()
        logger.info("Database engine disposed")
