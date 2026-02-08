/**
 * /api/v1/credits — check credit balance
 * /api/v1/credits/checkout — create a checkout session
 */

import { Router, Request, Response } from "express";
import { apiKeyAuth } from "../middleware/auth";
import { autumnService } from "../services/autumn";

export const creditsRouter = Router();

creditsRouter.get("/credits", apiKeyAuth, async (req: Request, res: Response) => {
  const customerId = req.customerId || "anonymous";

  if (!autumnService.isEnabled) {
    return res.json({
      enabled: false,
      customer_id: null,
      credits_remaining: null,
      plan: null,
    });
  }

  const info = await autumnService.getCustomerInfo(customerId);
  const { balance } = await autumnService.checkCredits(customerId);

  return res.json({
    enabled: true,
    customer_id: customerId,
    credits_remaining: balance,
    plan: info?.plan || null,
  });
});

creditsRouter.post(
  "/credits/checkout",
  apiKeyAuth,
  async (req: Request, res: Response) => {
    const customerId = req.customerId || "anonymous";
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        status: "error",
        error: "product_id is required",
      });
    }

    if (!autumnService.isEnabled) {
      return res.status(400).json({
        status: "error",
        error: "Credits are not enabled on this server",
      });
    }

    const url = await autumnService.createCheckout(customerId, product_id);
    if (!url) {
      return res.status(500).json({
        status: "error",
        error: "Could not create checkout session",
      });
    }

    return res.json({ url });
  }
);
