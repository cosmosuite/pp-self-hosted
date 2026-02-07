"""
SafeVision API - Detection History Router
Endpoints for retrieving past detection records.
"""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    DetectionHistoryItem,
    DetectionHistoryDetail,
    DetectionHistoryResponse,
    ErrorResponse,
    ImageDimensions,
    Detection,
    BoundingBox,
)
from app.database.session import get_db
from app.database.models import Detection as DetectionRecord
from app.services.storage import storage_service

logger = logging.getLogger("safevision.routers.history")

router = APIRouter(tags=["Detection History"])


def _get_image_url(key: Optional[str]) -> Optional[str]:
    """Get a URL for an R2 object key."""
    if not key or not storage_service.enabled:
        return None
    try:
        return storage_service.get_public_url(key) or storage_service.get_signed_url(key)
    except Exception:
        return None


@router.get(
    "/detections",
    response_model=DetectionHistoryResponse,
    responses={503: {"model": ErrorResponse}},
    summary="List detection history",
    description="Retrieve paginated detection history. Requires database to be configured.",
)
async def list_detections(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Optional[AsyncSession] = Depends(get_db),
):
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    # Count total records
    count_query = select(func.count()).select_from(DetectionRecord)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Fetch page
    offset = (page - 1) * page_size
    query = (
        select(DetectionRecord)
        .order_by(DetectionRecord.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(query)
    records = result.scalars().all()

    items = []
    for record in records:
        dims = record.image_dimensions or {}
        items.append(
            DetectionHistoryItem(
                id=str(record.id),
                image_url=_get_image_url(record.original_image_key),
                image_dimensions=ImageDimensions(
                    width=dims.get("width", 0),
                    height=dims.get("height", 0),
                ),
                detection_count=record.detection_count,
                risk_level=record.risk_level,
                threshold_used=record.threshold_used,
                created_at=record.created_at,
            )
        )

    return DetectionHistoryResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/detections/{detection_id}",
    response_model=DetectionHistoryDetail,
    responses={404: {"model": ErrorResponse}, 503: {"model": ErrorResponse}},
    summary="Get detection details",
    description="Retrieve full detection results by ID. Requires database to be configured.",
)
async def get_detection(
    detection_id: str,
    db: Optional[AsyncSession] = Depends(get_db),
):
    if db is None:
        raise HTTPException(status_code=503, detail="Database not configured")

    try:
        record_uuid = UUID(detection_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid detection ID format")

    query = select(DetectionRecord).where(DetectionRecord.id == record_uuid)
    result = await db.execute(query)
    record = result.scalar_one_or_none()

    if record is None:
        raise HTTPException(status_code=404, detail="Detection not found")

    dims = record.image_dimensions or {}
    detections_data = record.detections_data or []

    # Reconstruct Detection objects from stored JSON
    detections = []
    for d in detections_data:
        bbox_data = d.get("bbox", {})
        detections.append(
            Detection(
                label=d.get("label", ""),
                confidence=d.get("confidence", 0),
                risk_level=d.get("risk_level", "SAFE"),
                bbox=BoundingBox(
                    x=bbox_data.get("x", 0),
                    y=bbox_data.get("y", 0),
                    width=bbox_data.get("width", 0),
                    height=bbox_data.get("height", 0),
                ),
                should_blur=d.get("should_blur", True),
            )
        )

    return DetectionHistoryDetail(
        id=str(record.id),
        image_url=_get_image_url(record.original_image_key),
        processed_image_url=_get_image_url(record.processed_image_key),
        image_dimensions=ImageDimensions(
            width=dims.get("width", 0),
            height=dims.get("height", 0),
        ),
        detections=detections,
        detection_count=record.detection_count,
        risk_level=record.risk_level,
        threshold_used=record.threshold_used,
        created_at=record.created_at,
    )
