"""
SafeVision Compute Server
Stripped-down FastAPI that does ML inference only.
Secured by a shared COMPUTE_API_KEY header.
"""

import os
import time
import logging
import tempfile
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.detector import detector_service, LABELS, get_risk_level, get_label_category, DEFAULT_BLUR_RULES

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger("safevision.compute")

app = FastAPI(
    title="SafeVision Compute",
    description="Internal ML inference server — ONNX detection + dlib face landmarks",
    version="1.0.0",
    docs_url="/docs" if os.getenv("DEBUG", "").lower() in ("1", "true") else None,
    redoc_url=None,
)

START_TIME = time.time()

# ─── API Key Dependency ──────────────────────────────────────────────────────

async def verify_compute_key(request: Request):
    """Verify the internal API key sent by middleware."""
    if not settings.compute_api_key:
        # No key configured → allow all (dev mode)
        return
    key = request.headers.get("X-Compute-Key", "")
    if key != settings.compute_api_key:
        raise HTTPException(status_code=401, detail="Invalid compute API key")


# ─── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    logger.info("Loading SafeVision ONNX model...")
    ok = detector_service.load_model()
    if not ok:
        logger.error("FAILED to load model — server will return 503 on detect requests")
    else:
        logger.info("Model loaded. Compute server ready.")


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok" if detector_service.model_loaded else "degraded",
        "model_loaded": detector_service.model_loaded,
        "uptime_seconds": int(time.time() - START_TIME),
    }


@app.post("/compute/detect", dependencies=[Depends(verify_compute_key)])
async def detect(
    image: UploadFile = File(...),
    threshold: float = Form(0.25),
):
    """Run ONNX detection + dlib face landmarks on an uploaded image."""
    if not detector_service.model_loaded:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate file type
    content_type = image.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Expected image file, got {content_type}")

    # Read upload to temp file
    contents = await image.read()
    if len(contents) > settings.max_upload_bytes:
        raise HTTPException(status_code=413, detail=f"Image too large (max {settings.max_upload_size_mb}MB)")

    suffix = os.path.splitext(image.filename or "img.jpg")[1] or ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(contents)
        tmp.close()

        result = detector_service.detect(tmp.name, threshold=threshold)
        return JSONResponse(content=result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Detection error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal detection error")
    finally:
        os.unlink(tmp.name)


@app.get("/compute/labels")
async def labels():
    """Return all supported detection labels with metadata."""
    return {
        "labels": [
            {
                "label": label,
                "category": get_label_category(label),
                "default_risk": get_risk_level(label),
                "default_blur": DEFAULT_BLUR_RULES.get(label, False),
            }
            for label in LABELS
        ],
        "count": len(LABELS),
    }
