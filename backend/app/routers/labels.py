"""
SafeVision API - Labels & Blur Rules Router
"""

from fastapi import APIRouter

from app.models import (
    LabelsResponse, LabelInfo, BlurRulesResponse, BlurRulesRequest,
)
from app.services.detector import (
    LABELS, DEFAULT_BLUR_RULES, get_risk_level, get_label_category,
)

router = APIRouter(tags=["Labels & Rules"])


@router.get(
    "/labels",
    response_model=LabelsResponse,
    summary="List detection labels",
    description="Returns all 18 body-part detection labels with their risk levels and categories.",
)
async def get_labels():
    labels = [
        LabelInfo(
            label=label,
            category=get_label_category(label),
            default_risk=get_risk_level(label),
            default_blur="EXPOSED" in label,
        )
        for label in LABELS
    ]
    return LabelsResponse(labels=labels, count=len(labels))


@router.get(
    "/config/blur-rules",
    response_model=BlurRulesResponse,
    summary="Get default blur rules",
    description="Returns the default blur rules. Labels marked true will be blurred by the frontend.",
)
async def get_blur_rules():
    return BlurRulesResponse(rules=DEFAULT_BLUR_RULES)


@router.post(
    "/config/blur-rules/validate",
    response_model=BlurRulesResponse,
    summary="Validate blur rules",
    description="Validates and returns merged blur rules (your overrides merged with defaults).",
)
async def validate_blur_rules(body: BlurRulesRequest):
    merged = {**DEFAULT_BLUR_RULES, **body.rules}
    return BlurRulesResponse(rules=merged)
