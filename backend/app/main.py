"""
SafeVision API - Main Application
FastAPI server for body-part detection. Returns bounding box coordinates
for client-side blurring. No server-side blur is performed.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.services.detector import detector_service
from app.services.autumn import autumn_service
from app.services.storage import storage_service
from app.database.engine import init_db, dispose_db
from app.routers import health, detect, labels, credits, history

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.debug else logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("safevision")

# ─── Rate Limiter ─────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

# ─── Lifespan ─────────────────────────────────────────────────────────────────

async def _run_migrations():
    """Run pending Alembic migrations on startup."""
    if not settings.database_url:
        return
    try:
        import os
        import asyncio
        from alembic.config import Config as AlembicConfig
        from alembic import command

        alembic_ini = os.path.join(os.path.dirname(os.path.dirname(__file__)), "alembic.ini")
        if not os.path.exists(alembic_ini):
            logger.warning("alembic.ini not found — skipping migrations")
            return

        alembic_cfg = AlembicConfig(alembic_ini)
        # Run in executor thread — Alembic's env.py uses asyncio.run() internally,
        # which needs its own event loop (can't nest inside the running one).
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, command.upgrade, alembic_cfg, "head")
        logger.info("Database migrations applied successfully")
    except Exception as e:
        logger.error(f"Failed to run migrations: {e}", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load model, initialize DB, R2, and Autumn. Shutdown: cleanup."""
    logger.info("Starting SafeVision API...")

    # Load ML model
    detector_service.load_model()
    logger.info(f"Model loaded: {detector_service.model_loaded}")

    # Initialize database
    await init_db()
    await _run_migrations()
    logger.info(f"Database configured: {bool(settings.database_url)}")

    # Initialize R2 storage
    storage_service.initialize()
    logger.info(f"R2 storage enabled: {storage_service.enabled}")

    # Initialize credit system
    autumn_service.initialize()
    logger.info(f"Credits enabled: {autumn_service.enabled}")

    yield

    # Shutdown
    await autumn_service.close()
    await dispose_db()
    logger.info("SafeVision API shut down.")


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SafeVision API",
    description=(
        "Body-part detection API for content moderation. "
        "Upload an image and receive bounding box coordinates for detected body parts. "
        "Blurring is performed client-side for maximum control.\n\n"
        "## Authentication\n"
        "When credit-based pricing is enabled, pass your API key in the `X-API-Key` header.\n\n"
        "## Quick Start\n"
        "1. `POST /api/v1/detect` with an image file\n"
        "2. Receive bounding boxes + labels\n"
        "3. Apply blur on the client using the coordinates\n"
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ─── Middleware ────────────────────────────────────────────────────────────────

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────

app.include_router(health.router, prefix="/api/v1")
app.include_router(detect.router, prefix="/api/v1")
app.include_router(labels.router, prefix="/api/v1")
app.include_router(credits.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")

# ─── Root ─────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return {
        "name": "SafeVision API",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


# ─── Global Error Handler ────────────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"status": "error", "error": "Internal server error"},
    )
