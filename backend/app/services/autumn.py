"""
SafeVision API - Autumn Credit Service
Integrates with useautumn.com for credit-based pricing.
"""

import logging
from typing import Optional, Dict, Any

import httpx

from app.config import settings

logger = logging.getLogger("safevision.autumn")

AUTUMN_BASE_URL = "https://api.useautumn.com/v1"


class AutumnService:
    """
    Handles credit checking and usage tracking via useautumn.com.
    When disabled (no API key), all requests are allowed with unlimited credits.
    """

    def __init__(self):
        self.enabled = False
        self.client: Optional[httpx.AsyncClient] = None

    def initialize(self):
        """Initialize the Autumn client if configured."""
        if settings.autumn_enabled and settings.autumn_secret_key:
            self.enabled = True
            self.client = httpx.AsyncClient(
                base_url=AUTUMN_BASE_URL,
                headers={
                    "Authorization": f"Bearer {settings.autumn_secret_key}",
                    "Content-Type": "application/json",
                },
                timeout=10.0,
            )
            logger.info("Autumn credit service enabled")
        else:
            self.enabled = False
            logger.info("Autumn credit service disabled (no API key configured)")

    async def check_credits(self, customer_id: str, feature_id: str = "detections") -> Dict[str, Any]:
        """
        Check if a customer has remaining credits for a feature.
        Returns {"allowed": bool, "balance": int|None}
        """
        if not self.enabled:
            return {"allowed": True, "balance": None}

        try:
            response = await self.client.get(
                "/entitled",
                params={"customer_id": customer_id, "feature_id": feature_id},
            )
            response.raise_for_status()
            data = response.json()
            return {
                "allowed": data.get("allowed", False),
                "balance": data.get("balance"),
            }
        except httpx.HTTPStatusError as e:
            logger.error(f"Autumn API error checking credits: {e.response.status_code} {e.response.text}")
            # Fail open - allow the request if Autumn is down
            return {"allowed": True, "balance": None}
        except Exception as e:
            logger.error(f"Autumn connection error: {e}")
            return {"allowed": True, "balance": None}

    async def track_usage(self, customer_id: str, feature_id: str = "detections", delta: int = 1) -> bool:
        """
        Track usage (decrement credits) after a successful detection.
        Returns True if tracking succeeded.
        """
        if not self.enabled:
            return True

        try:
            response = await self.client.post(
                "/events",
                json={
                    "customer_id": customer_id,
                    "feature_id": feature_id,
                    "delta": delta,
                },
            )
            response.raise_for_status()
            return True
        except httpx.HTTPStatusError as e:
            logger.error(f"Autumn API error tracking usage: {e.response.status_code} {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Autumn connection error: {e}")
            return False

    async def get_customer_info(self, customer_id: str) -> Optional[Dict[str, Any]]:
        """
        Get customer balance and plan information.
        """
        if not self.enabled:
            return None

        try:
            response = await self.client.get(f"/customers/{customer_id}")
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Autumn error fetching customer: {e}")
            return None

    async def create_checkout(self, customer_id: str, product_id: str) -> Optional[str]:
        """
        Create a checkout session for a customer to purchase credits.
        Returns the Stripe checkout URL.
        """
        if not self.enabled:
            return None

        try:
            response = await self.client.post(
                "/attach",
                json={
                    "customer_id": customer_id,
                    "product_id": product_id,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("url")
        except Exception as e:
            logger.error(f"Autumn error creating checkout: {e}")
            return None

    async def close(self):
        """Close the HTTP client."""
        if self.client:
            await self.client.aclose()


# Singleton instance
autumn_service = AutumnService()
