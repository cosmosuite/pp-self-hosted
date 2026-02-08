/**
 * /api/v1/history — detection history from the database.
 */

import { Router, Request, Response } from "express";
import { apiKeyAuth } from "../middleware/auth";
import { getDb, isDbEnabled } from "../services/db";

export const historyRouter = Router();

historyRouter.get("/history", apiKeyAuth, async (req: Request, res: Response) => {
  if (!isDbEnabled()) {
    return res.json({ items: [], total: 0, page: 1, page_size: 20 });
  }

  const db = getDb();
  if (!db) {
    return res.json({ items: [], total: 0, page: 1, page_size: 20 });
  }

  const customerId = req.customerId || "anonymous";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.page_size as string) || "20", 10)));
  const skip = (page - 1) * pageSize;

  try {
    const [items, total] = await Promise.all([
      db.detection.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          imageUrl: true,
          imageDimensions: true,
          detectionCount: true,
          riskLevel: true,
          thresholdUsed: true,
          createdAt: true,
        },
      }),
      db.detection.count({ where: { customerId } }),
    ]);

    return res.json({
      items: items.map((item) => ({
        id: item.id,
        image_url: item.imageUrl,
        image_dimensions: item.imageDimensions,
        detection_count: item.detectionCount,
        risk_level: item.riskLevel,
        threshold_used: item.thresholdUsed,
        created_at: item.createdAt,
      })),
      total,
      page,
      page_size: pageSize,
    });
  } catch (err: any) {
    console.error("History fetch error:", err.message);
    return res.status(500).json({
      status: "error",
      error: "Could not fetch detection history",
    });
  }
});

historyRouter.get("/history/:id", apiKeyAuth, async (req: Request, res: Response) => {
  if (!isDbEnabled()) {
    return res.status(404).json({ status: "error", error: "Not found" });
  }

  const db = getDb();
  if (!db) {
    return res.status(404).json({ status: "error", error: "Not found" });
  }

  try {
    const record = await db.detection.findUnique({
      where: { id: req.params.id as string },
    });

    if (!record) {
      return res.status(404).json({ status: "error", error: "Detection not found" });
    }

    return res.json({
      id: record.id,
      image_url: record.imageUrl,
      image_dimensions: record.imageDimensions,
      detections: record.detections,
      detection_count: record.detectionCount,
      risk_level: record.riskLevel,
      threshold_used: record.thresholdUsed,
      created_at: record.createdAt,
    });
  } catch (err: any) {
    console.error("History detail error:", err.message);
    return res.status(500).json({
      status: "error",
      error: "Could not fetch detection record",
    });
  }
});
