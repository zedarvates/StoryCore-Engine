"""
Database Session Management
===========================

Provides SQLAlchemy async engine and session management for StoryCore Engine.
Implements the 'dependency injection' pattern for FastAPI endpoints.

Author: StoryCore Team
Version: 1.0.0
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

from backend.config import settings

logger = logging.getLogger(__name__)

# =============================================================================
# Database Engine Initialization
# =============================================================================

# Convert standard postgresql:// to asyncpg postgresql+asyncpg:// if needed
database_url = settings.DATABASE_URL
if database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create async engine with connection pooling
engine = create_async_engine(
    database_url,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    poolclass=QueuePool,
    echo=settings.DEBUG,
    future=True
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    engine, 
    class_=AsyncSession, 
    expire_on_commit=False,
    autoflush=False
)

# =============================================================================
# Dependency Injection
# =============================================================================

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.
    Automatically closes the session after the request is finished.
    
    Usage:
        @app.get("/items")
        async def read_items(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
