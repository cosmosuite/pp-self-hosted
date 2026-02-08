/**
 * /api/v1/detect — multipart image upload
 * /api/v1/detect/base64 — base64 image body
 *
 * Validates auth, checks credits (Autumn), proxies to compute, persists results.
 */

import { Router, Request, Response } from "express";
import multer from "multer";
import { apiKeyAuth } from "../middleware/auth";
import { detectLimiter } from "../middleware/rateLimit";
import { callComputeDetect } from "../services/compute";
import { autumnService } from "../services/autumn";
import { uploadImage, isStorageEnabled, getPresignedUrl } from "../services/storage";
import { getDb } from "../services/db";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

export const detectRouter = Router();

// ─── Multipart detect ────────────────────────────────────────────────────────
detectRouter.post(
  "/detect",
  detectLimiter,
  apiKeyAuth,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          error: "No image file provided",
        });
      }

      const customerId = req.customerId || "anonymous";
      const threshold = parseFloat((req.body?.threshold as string) || "0.25");

      // Check credits
      if (autumnService.isEnabled) {
        const { allowed, balance } = await autumnService.checkCredits(customerId);
        if (!allowed) {
          return res.status(402).json({
            status: "error",
            error: "Insufficient credits",
            credits_remaining: balance,
          });
        }
      }

      // Proxy to compute
      const result = await callComputeDetect(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        threshold
      );

      // Upload original image to Railway bucket
      let imageKey: string | null = null;
      let imageUrl: string | null = null;
      if (isStorageEnabled()) {
        imageKey = await uploadImage(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
        if (imageKey) {
          imageUrl = await getPresignedUrl(imageKey, 86400); // 24h URL
        }
      }

      // Track usage
      let creditsRemaining: number | null = null;
      if (autumnService.isEnabled) {
        await autumnService.trackUsage(customerId);
        const check = await autumnService.checkCredits(customerId);
        creditsRemaining = check.balance;
      }

      // Persist to DB
      let detectionId: string | null = null;
      const db = getDb();
      if (db) {
        try {
          const record = await db.detection.create({
            data: {
              customerId,
              imageUrl: imageKey,  // Store the key, not the presigned URL
              imageDimensions: result.image_dimensions as any,
              detections: result.detections as any,
              detectionCount: result.detection_count,
              riskLevel: result.risk_summary.overall_risk,
              thresholdUsed: threshold,
            },
          });
          detectionId = record.id;
        } catch (dbErr) {
          console.error("DB persist error:", dbErr);
        }
      }

      return res.json({
        status: "success",
        detection_id: detectionId,
        image_url: imageUrl,
        image_dimensions: result.image_dimensions,
        detections: result.detections,
        detection_count: result.detection_count,
        risk_summary: result.risk_summary,
        credits_remaining: creditsRemaining,
      });
    } catch (err: any) {
      console.error("Detection error:", err?.response?.data || err.message);
      const status = err?.response?.status || 500;
      return res.status(status).json({
        status: "error",
        error: err?.response?.data?.detail || err.message || "Detection failed",
      });
    }
  }
);

// ─── Base64 detect ───────────────────────────────────────────────────────────
detectRouter.post(
  "/detect/base64",
  detectLimiter,
  apiKeyAuth,
  async (req: Request, res: Response) => {
    try {
      const { image, threshold = 0.25, blur_rules } = req.body;

      if (!image) {
        return res.status(400).json({
          status: "error",
          error: "No image provided in request body",
        });
      }

      const customerId = req.customerId || "anonymous";

      // Check credits
      if (autumnService.isEnabled) {
        const { allowed, balance } = await autumnService.checkCredits(customerId);
        if (!allowed) {
          return res.status(402).json({
            status: "error",
            error: "Insufficient credits",
            credits_remaining: balance,
          });
        }
      }

      // Parse base64
      let base64Data = image as string;
      let mimetype = "image/jpeg";
      if (base64Data.startsWith("data:")) {
        const match = base64Data.match(/^data:([^;]+);base64,/);
        if (match) {
          mimetype = match[1];
          base64Data = base64Data.slice(match[0].length);
        }
      }

      const buffer = Buffer.from(base64Data, "base64");

      // Proxy to compute
      const result = await callComputeDetect(
        buffer,
        "image.jpg",
        mimetype,
        threshold
      );

      // Track usage
      let creditsRemaining: number | null = null;
      if (autumnService.isEnabled) {
        await autumnService.trackUsage(customerId);
        const check = await autumnService.checkCredits(customerId);
        creditsRemaining = check.balance;
      }

      return res.json({
        status: "success",
        image_dimensions: result.image_dimensions,
        detections: result.detections,
        detection_count: result.detection_count,
        risk_summary: result.risk_summary,
        credits_remaining: creditsRemaining,
      });
    } catch (err: any) {
      console.error("Base64 detection error:", err?.response?.data || err.message);
      const status = err?.response?.status || 500;
      return res.status(status).json({
        status: "error",
        error: err?.response?.data?.detail || err.message || "Detection failed",
      });
    }
  }
);
