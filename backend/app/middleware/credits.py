"""
SafeVision API - Credit Check Middleware
Extracts API key, checks credits via Autumn before allowing detection.
"""

import logging
from typing import Optional

from fastapi import Request, HTTPException, Header

from app.services.autumn import autumn_service

logger = logging.getLogger("safevision.middleware.credits")


async def get_customer_id(x_api_key: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extract customer ID from the X-API-Key header.
    When Autumn is disabled, returns None (allows all requests).
    When Autumn is enabled, the API key IS the customer ID.
    """
    if not autumn_service.enabled:
        return None

    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail={
                "error": "API key required",
                "message": "Provide your API key in the X-API-Key header",
                "docs": "See /docs for authentication details",
            },
        )

    return x_api_key


async def check_and_track_credits(customer_id: Optional[str]) -> Optional[int]:
    """
    Check if a customer has remaining credits.
    Returns credits_remaining or None if credits are disabled.
    Raises HTTPException if no credits remain.
    """
    if not autumn_service.enabled or customer_id is None:
        return None

    credit_info = await autumn_service.check_credits(customer_id)

    if not credit_info["allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "Insufficient credits",
                "message": "You have no remaining detection credits",
                "credits_remaining": 0,
                "upgrade_url": "/api/v1/credits/checkout",
            },
        )

    return credit_info.get("balance")


async def track_usage(customer_id: Optional[str]):
    """Track 1 detection credit usage after successful detection."""
    if autumn_service.enabled and customer_id is not None:
        await autumn_service.track_usage(customer_id)
