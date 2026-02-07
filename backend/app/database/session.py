"""
SafeVision API - Database Session Dependency
Provides an async DB session for FastAPI dependency injection.
"""

from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.engine import async_session_maker


async def get_db() -> AsyncGenerator[Optional[AsyncSession], None]:
    """
    FastAPI dependency that yields an async database session.
    Returns None if the database is not configured.
    """
    if async_session_maker is None:
        yield None
        return

    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
