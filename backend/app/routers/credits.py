"""
SafeVision API - Credits Router
Endpoints for checking credits and creating checkout sessions.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models import CreditsResponse
from app.services.autumn import autumn_service
from app.middleware.credits import get_customer_id

router = APIRouter(tags=["Credits"])


@router.get(
    "/credits",
    response_model=CreditsResponse,
    summary="Check remaining credits",
    description="Returns your current credit balance and plan information.",
)
async def get_credits(
    customer_id: Optional[str] = Depends(get_customer_id),
):
    if not autumn_service.enabled:
        return CreditsResponse(
            enabled=False,
            customer_id=None,
            credits_remaining=None,
            plan=None,
        )

    if not customer_id:
        raise HTTPException(status_code=401, detail="API key required")

    # Get balance
    credit_info = await autumn_service.check_credits(customer_id)
    customer_info = await autumn_service.get_customer_info(customer_id)

    plan_name = None
    if customer_info and "products" in customer_info:
        products = customer_info["products"]
        if products:
            plan_name = products[0].get("name") if isinstance(products[0], dict) else str(products[0])

    return CreditsResponse(
        enabled=True,
        customer_id=customer_id,
        credits_remaining=credit_info.get("balance"),
        plan=plan_name,
    )


@router.get(
    "/credits/checkout",
    summary="Get checkout URL for purchasing credits",
    description="Returns a Stripe checkout URL to purchase a credit plan.",
)
async def get_checkout_url(
    product_id: str = Query(..., description="Product/plan ID to purchase"),
    customer_id: Optional[str] = Depends(get_customer_id),
):
    if not autumn_service.enabled:
        raise HTTPException(status_code=404, detail="Credit system not enabled")

    if not customer_id:
        raise HTTPException(status_code=401, detail="API key required")

    url = await autumn_service.create_checkout(customer_id, product_id)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

    return {"checkout_url": url}
