/**
 * API key validation middleware.
 * Extracts customer ID from X-API-Key header.
 * When Autumn is disabled, requests are allowed without a key.
 */

import { Request, Response, NextFunction } from "express";
import { autumnService } from "../services/autumn";

declare global {
  namespace Express {
    interface Request {
      customerId?: string;
    }
  }
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (autumnService.isEnabled) {
    if (!apiKey) {
      return res.status(401).json({
        status: "error",
        error: "Missing API key",
        detail: "Provide your API key in the X-API-Key header",
      });
    }
    // Use the API key as the customer ID for Autumn
    req.customerId = apiKey;
  } else {
    // No auth required — use key if provided, otherwise anonymous
    req.customerId = apiKey || "anonymous";
  }

  next();
}
