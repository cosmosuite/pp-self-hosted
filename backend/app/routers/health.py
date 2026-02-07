"""
SafeVision API - Health & Stats Router
"""

import time
from fastapi import APIRouter

from app.models import HealthResponse
from app.config import settings
from app.services.detector import detector_service

router = APIRouter(tags=["Health"])

_start_time = time.time()

SUPPORTED_FORMATS = ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp"]


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns API status, model state, and uptime.",
)
async def health_check():
    return HealthResponse(
        status="healthy" if detector_service.model_loaded else "degraded",
        model_loaded=detector_service.model_loaded,
        uptime_seconds=int(time.time() - _start_time),
        version="2.0.0",
        supported_formats=SUPPORTED_FORMATS,
        max_upload_size_mb=settings.max_upload_size_mb,
    )
