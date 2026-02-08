/**
 * /api/v1/labels — supported detection labels
 * /api/v1/config/blur-rules — default blur rules
 */

import { Router, Request, Response } from "express";
import { fetchComputeLabels } from "../services/compute";

export const labelsRouter = Router();

// Cache labels from compute server
let cachedLabels: any = null;

labelsRouter.get("/labels", async (_req: Request, res: Response) => {
  try {
    if (!cachedLabels) {
      cachedLabels = await fetchComputeLabels();
    }
    return res.json(cachedLabels);
  } catch (err: any) {
    console.error("Labels fetch error:", err.message);
    return res.status(502).json({
      status: "error",
      error: "Could not fetch labels from compute server",
    });
  }
});

labelsRouter.get("/config/blur-rules", async (_req: Request, res: Response) => {
  try {
    if (!cachedLabels) {
      cachedLabels = await fetchComputeLabels();
    }
    const rules: Record<string, boolean> = {};
    for (const l of cachedLabels.labels) {
      rules[l.label] = l.default_blur;
    }
    return res.json({
      rules,
      description: "true = blur this label, false = skip",
    });
  } catch (err: any) {
    console.error("Blur rules fetch error:", err.message);
    return res.status(502).json({
      status: "error",
      error: "Could not fetch blur rules from compute server",
    });
  }
});
