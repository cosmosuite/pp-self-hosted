/**
 * /api/v1/health — checks own health + compute server health.
 */

import { Router, Request, Response } from "express";
import { checkComputeHealth } from "../services/compute";

export const healthRouter = Router();

const START_TIME = Date.now();

healthRouter.get("/health", async (_req: Request, res: Response) => {
  let computeHealth: any = null;
  let computeOk = false;

  try {
    computeHealth = await checkComputeHealth();
    computeOk = computeHealth.status === "ok";
  } catch (err) {
    computeHealth = { error: "unreachable" };
  }

  const overallOk = computeOk;

  return res.status(overallOk ? 200 : 503).json({
    status: overallOk ? "ok" : "degraded",
    model_loaded: computeOk && computeHealth?.model_loaded,
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    version: "1.0.0",
    supported_formats: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    max_upload_size_mb: 50,
    compute: computeHealth,
  });
});
