from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from models import Base
from engine import GemEngineStandalone
import api.webhooks as webhooks
import api.gems as gems
import api.apps as apps

# Initialize FastAPI
app = FastAPI(
    title="GemReward Standalone Service",
    description="Multi-tenant Gem Economy Microservice",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# DB Initialization
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 GemReward-Service starting up...")
    from db.session import engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/")
async def root():
    return {
        "service": "GemReward-Service",
        "status": "active",
        "version": "1.0.0",
        "documentation": "/docs",
    }


import asyncio


async def worker_cleanup_loop():
    """Periodically check for offline workers."""
    while True:
        try:
            from db.session import AsyncSessionLocal

            async with AsyncSessionLocal() as db:
                engine = GemEngineStandalone(db)
                cleaned = await engine.cleanup_offline_workers(threshold_seconds=60)
                if cleaned > 0:
                    logger.info(f"🧹 Cleaned up {cleaned} offline workers.")
        except Exception as e:
            logger.error(f"Error in worker cleanup loop: {e}")

        await asyncio.sleep(30)  # Check every 30 seconds


@app.on_event("startup")
async def start_cleanup_task():
    asyncio.create_task(worker_cleanup_loop())


# Include Routers
app.include_router(webhooks.router, prefix="/v1/webhooks", tags=["Webhooks"])
app.include_router(gems.router, prefix="/v1/gems", tags=["Gems"])
app.include_router(apps.router, prefix="/v1/apps", tags=["Applications"])

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
