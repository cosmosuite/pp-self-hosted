"""
SafeVision API - Detection Router
Core endpoints for body-part detection. Returns bounding boxes only (no server-side blur).
Persists original images to R2 and detection results to PostgreSQL when configured.
"""

import os
import uuid
import time
import base64
import logging
import tempfile
from typing import Optional, Dict

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DetectionResponse, Base64DetectRequest, ErrorResponse
from app.config import settings
from app.services.detector import detector_service
from app.services.storage import storage_service
from app.middleware.credits import get_customer_id, check_and_track_credits, track_usage
from app.database.session import get_db
from app.database.models import Detection as DetectionRecord, UsageLog

logger = logging.getLogger("safevision.routers.detect")

router = APIRouter(tags=["Detection"])

ALLOWED_CONTENT_TYPES = {
    "image/png", "image/jpeg", "image/jpg", "image/gif",
    "image/bmp", "image/tiff", "image/webp",
}

CONTENT_TYPE_TO_EXT = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/webp": ".webp",
}


def _save_temp_file(data: bytes, suffix: str = ".jpg") -> str:
    """Save bytes to a temp file and return the path."""
    temp_dir = tempfile.gettempdir()
    filename = f"sv_{uuid.uuid4().hex}{suffix}"
    path = os.path.join(temp_dir, filename)
    with open(path, "wb") as f:
        f.write(data)
    return path


def _cleanup(path: str):
    """Remove a temporary file."""
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def _parse_blur_rules(blur_rules_json: Optional[str]) -> Optional[Dict[str, bool]]:
    """Parse blur rules from JSON string form field."""
    if not blur_rules_json:
        return None
    import json
    try:
        return json.loads(blur_rules_json)
    except (json.JSONDecodeError, TypeError):
        return None


async def _persist_detection(
    db: Optional[AsyncSession],
    file_data: bytes,
    content_type: str,
    ext: str,
    result: dict,
    threshold: float,
) -> tuple[Optional[str], Optional[str]]:
    """
    Upload image to R2 and save detection record to DB.
    Returns (detection_id, image_url) or (None, None) if services are disabled.
    """
    detection_id = None
    image_url = None
    r2_key = None

    # Upload original image to R2
    if storage_service.enabled:
        try:
            r2_key = storage_service.generate_original_key(ext)
            storage_service.upload_image(file_data, r2_key, content_type)
            image_url = storage_service.get_public_url(r2_key) or storage_service.get_signed_url(r2_key)
        except Exception as e:
            logger.error(f"Failed to upload image to R2: {e}")
            r2_key = None
            image_url = None

    # Save detection record to DB
    if db is not None and r2_key is not None:
        try:
            # Serialize detections to dicts for JSON storage
            detections_data = [
                {
                    "label": d["label"],
                    "confidence": d["confidence"],
                    "risk_level": d["risk_level"],
                    "bbox": d["bbox"],
                    "should_blur": d["should_blur"],
                }
                for d in result["detections"]
            ]

            record = DetectionRecord(
                original_image_key=r2_key,
                image_dimensions={
                    "width": result["image_dimensions"]["width"],
                    "height": result["image_dimensions"]["height"],
                },
                detection_count=result["detection_count"],
                risk_level=result["risk_summary"]["overall_risk"],
                detections_data=detections_data,
                threshold_used=threshold,
            )
            db.add(record)
            await db.flush()
            detection_id = str(record.id)
        except Exception as e:
            logger.error(f"Failed to save detection record: {e}")

    return detection_id, image_url


async def _log_usage(
    db: Optional[AsyncSession],
    request: Request,
    endpoint: str,
    status_code: int,
    processing_time_ms: int,
):
    """Log API usage to the database."""
    if db is None:
        return
    try:
        log = UsageLog(
            endpoint=endpoint,
            ip_address=request.client.host if request.client else None,
            status_code=status_code,
            processing_time_ms=processing_time_ms,
        )
        db.add(log)
    except Exception as e:
        logger.error(f"Failed to log usage: {e}")


@router.post(
    "/detect",
    response_model=DetectionResponse,
    responses={400: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Detect body parts in an image (multipart upload)",
    description=(
        "Upload an image file to detect exposed/covered body parts. "
        "Returns bounding box coordinates for each detection so the client can apply blurring. "
        "No server-side blurring is performed."
    ),
)
async def detect_upload(
    request: Request,
    image: UploadFile = File(..., description="Image file (PNG, JPEG, GIF, BMP, TIFF, WebP)"),
    threshold: float = Form(0.25, description="Minimum confidence threshold (0.0-1.0)"),
    blur_rules: Optional[str] = Form(None, description='JSON blur rules: {"FACE_FEMALE": false}'),
    customer_id: Optional[str] = Depends(get_customer_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    start_time = time.time()

    # Validate content type
    if image.content_type and image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {image.content_type}")

    # Validate threshold
    if not (0.0 <= threshold <= 1.0):
        raise HTTPException(status_code=400, detail="Threshold must be between 0.0 and 1.0")

    # Check credits
    credits_remaining = await check_and_track_credits(customer_id)

    # Read file
    file_data = await image.read()
    if len(file_data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"File too large. Max {settings.max_upload_size_mb}MB")

    # Determine file extension and content type
    ext = os.path.splitext(image.filename or "image.jpg")[1] or ".jpg"
    content_type = image.content_type or "image/jpeg"
    temp_path = _save_temp_file(file_data, suffix=ext)

    try:
        # Check model
        if not detector_service.model_loaded:
            raise HTTPException(status_code=503, detail="Detection model not loaded")

        # Run detection
        parsed_rules = _parse_blur_rules(blur_rules)
        result = detector_service.detect(temp_path, threshold=threshold, blur_rules=parsed_rules)

        # Track credit usage
        await track_usage(customer_id)

        # Persist to R2 + DB
        detection_id, image_url = await _persist_detection(
            db, file_data, content_type, ext, result, threshold
        )

        processing_time_ms = int((time.time() - start_time) * 1000)
        await _log_usage(db, request, "/detect", 200, processing_time_ms)

        return DetectionResponse(
            status="success",
            detection_id=detection_id,
            image_url=image_url,
            image_dimensions=result["image_dimensions"],
            detections=result["detections"],
            detection_count=result["detection_count"],
            risk_summary=result["risk_summary"],
            credits_remaining=credits_remaining,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Detection processing failed")
    finally:
        _cleanup(temp_path)


@router.post(
    "/detect/base64",
    response_model=DetectionResponse,
    responses={400: {"model": ErrorResponse}, 403: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Detect body parts in a base64-encoded image",
    description=(
        "Send a base64-encoded image for detection. Accepts with or without data URI prefix. "
        "Returns bounding box coordinates for client-side blurring."
    ),
)
async def detect_base64(
    request: Request,
    body: Base64DetectRequest,
    customer_id: Optional[str] = Depends(get_customer_id),
    db: Optional[AsyncSession] = Depends(get_db),
):
    start_time = time.time()

    # Check credits
    credits_remaining = await check_and_track_credits(customer_id)

    # Decode base64
    try:
        image_data = body.image
        content_type = "image/jpeg"
        if "," in image_data:
            header, image_data = image_data.split(",", 1)
            # Extract content type from data URI if present
            if ":" in header and ";" in header:
                content_type = header.split(":")[1].split(";")[0]
        file_data = base64.b64decode(image_data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data")

    if len(file_data) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"Image too large. Max {settings.max_upload_size_mb}MB")

    ext = CONTENT_TYPE_TO_EXT.get(content_type, ".jpg")
    temp_path = _save_temp_file(file_data, suffix=ext)

    try:
        if not detector_service.model_loaded:
            raise HTTPException(status_code=503, detail="Detection model not loaded")

        result = detector_service.detect(temp_path, threshold=body.threshold, blur_rules=body.blur_rules)

        # Track credit usage
        await track_usage(customer_id)

        # Persist to R2 + DB
        detection_id, image_url = await _persist_detection(
            db, file_data, content_type, ext, result, body.threshold
        )

        processing_time_ms = int((time.time() - start_time) * 1000)
        await _log_usage(db, request, "/detect/base64", 200, processing_time_ms)

        return DetectionResponse(
            status="success",
            detection_id=detection_id,
            image_url=image_url,
            image_dimensions=result["image_dimensions"],
            detections=result["detections"],
            detection_count=result["detection_count"],
            risk_summary=result["risk_summary"],
            credits_remaining=credits_remaining,
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Base64 detection failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Detection processing failed")
    finally:
        _cleanup(temp_path)
