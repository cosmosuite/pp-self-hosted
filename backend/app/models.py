"""
SafeVision API - Pydantic Models
Request/response schemas for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from enum import Enum
from datetime import datetime


# ─── Enums ────────────────────────────────────────────────────────────────────

class RiskLevel(str, Enum):
    SAFE = "SAFE"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class DetectionLabel(str, Enum):
    FEMALE_GENITALIA_COVERED = "FEMALE_GENITALIA_COVERED"
    FACE_FEMALE = "FACE_FEMALE"
    BUTTOCKS_EXPOSED = "BUTTOCKS_EXPOSED"
    FEMALE_BREAST_EXPOSED = "FEMALE_BREAST_EXPOSED"
    FEMALE_GENITALIA_EXPOSED = "FEMALE_GENITALIA_EXPOSED"
    MALE_BREAST_EXPOSED = "MALE_BREAST_EXPOSED"
    ANUS_EXPOSED = "ANUS_EXPOSED"
    FEET_EXPOSED = "FEET_EXPOSED"
    BELLY_COVERED = "BELLY_COVERED"
    FEET_COVERED = "FEET_COVERED"
    ARMPITS_COVERED = "ARMPITS_COVERED"
    ARMPITS_EXPOSED = "ARMPITS_EXPOSED"
    FACE_MALE = "FACE_MALE"
    BELLY_EXPOSED = "BELLY_EXPOSED"
    MALE_GENITALIA_EXPOSED = "MALE_GENITALIA_EXPOSED"
    ANUS_COVERED = "ANUS_COVERED"
    FEMALE_BREAST_COVERED = "FEMALE_BREAST_COVERED"
    BUTTOCKS_COVERED = "BUTTOCKS_COVERED"


# ─── Shared Components ───────────────────────────────────────────────────────

class BoundingBox(BaseModel):
    """Pixel coordinates of a detected region."""
    x: int = Field(..., description="Left edge (pixels from left)")
    y: int = Field(..., description="Top edge (pixels from top)")
    width: int = Field(..., description="Width in pixels")
    height: int = Field(..., description="Height in pixels")


class ImageDimensions(BaseModel):
    width: int
    height: int


# ─── Detection Response ─────────────────────────────────────────────────────

class Detection(BaseModel):
    """A single detected body-part region."""
    label: str = Field(..., description="Detection category (e.g. FEMALE_BREAST_EXPOSED)")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence 0-1")
    risk_level: RiskLevel = Field(..., description="Risk classification")
    bbox: BoundingBox = Field(..., description="Bounding box in original image pixels")
    should_blur: bool = Field(True, description="Whether this region should be blurred based on rules")
    contour: Optional[List[List[int]]] = Field(
        None,
        description=(
            "Polygon contour points [[x1,y1], [x2,y2], ...] in original image pixels. "
            "For faces, this is a convex hull from 468 MediaPipe landmarks. "
            "For other body parts, this is an elliptical approximation inscribed in the bbox. "
            "Use these points as a canvas clipping path for natural-looking contour blur."
        ),
    )


class RiskSummary(BaseModel):
    overall_risk: RiskLevel
    is_safe: bool = Field(..., description="True if overall_risk is SAFE or LOW")
    distribution: Dict[str, int] = Field(default_factory=dict, description="Count per risk level")


class DetectionResponse(BaseModel):
    """Response from /api/v1/detect endpoints."""
    status: str = "success"
    detection_id: Optional[str] = Field(None, description="Unique detection record ID (when DB is enabled)")
    image_url: Optional[str] = Field(None, description="URL to the stored original image (when storage is enabled)")
    image_dimensions: ImageDimensions
    detections: List[Detection]
    detection_count: int
    risk_summary: RiskSummary
    credits_remaining: Optional[int] = Field(None, description="Remaining API credits (if auth enabled)")


# ─── Base64 Detection Request ───────────────────────────────────────────────

class Base64DetectRequest(BaseModel):
    """Request body for base64 image detection."""
    image: str = Field(..., description="Base64-encoded image data (with or without data URI prefix)")
    threshold: float = Field(0.25, ge=0.0, le=1.0, description="Minimum confidence threshold")
    blur_rules: Optional[Dict[str, bool]] = Field(
        None,
        description="Per-label blur overrides. e.g. {\"FACE_FEMALE\": false, \"BUTTOCKS_EXPOSED\": true}"
    )


# ─── Labels Response ─────────────────────────────────────────────────────────

class LabelInfo(BaseModel):
    label: str
    category: str = Field(..., description="'exposed', 'covered', or 'face'")
    default_risk: RiskLevel
    default_blur: bool


class LabelsResponse(BaseModel):
    labels: List[LabelInfo]
    count: int


# ─── Blur Rules ──────────────────────────────────────────────────────────────

class BlurRulesResponse(BaseModel):
    rules: Dict[str, bool]
    description: str = "true = blur this label, false = skip"


class BlurRulesRequest(BaseModel):
    rules: Dict[str, bool] = Field(
        ...,
        description="Per-label blur rules. e.g. {\"FACE_FEMALE\": false}"
    )


# ─── Health / Stats ──────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    uptime_seconds: int
    version: str
    supported_formats: List[str]
    max_upload_size_mb: int


# ─── Credits ──────────────────────────────────────────────────────────────────

class CreditsResponse(BaseModel):
    enabled: bool
    customer_id: Optional[str] = None
    credits_remaining: Optional[int] = None
    plan: Optional[str] = None


# ─── Detection History ────────────────────────────────────────────────────────

class DetectionHistoryItem(BaseModel):
    """A single detection record from history."""
    id: str
    image_url: Optional[str] = None
    image_dimensions: ImageDimensions
    detection_count: int
    risk_level: str
    threshold_used: float
    created_at: datetime


class DetectionHistoryDetail(BaseModel):
    """Full detection record with all result data."""
    id: str
    image_url: Optional[str] = None
    processed_image_url: Optional[str] = None
    image_dimensions: ImageDimensions
    detections: List[Detection]
    detection_count: int
    risk_level: str
    threshold_used: float
    created_at: datetime


class DetectionHistoryResponse(BaseModel):
    """Paginated detection history response."""
    items: List[DetectionHistoryItem]
    total: int
    page: int
    page_size: int


# ─── Error ────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    status: str = "error"
    error: str
    detail: Optional[str] = None
