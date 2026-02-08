import { useCallback, useRef } from "react";
import type { BlurTarget, EffectSettings } from "../types";

/**
 * Studio canvas rendering engine.
 * Supports three effect types (blur, pixelation, solid color)
 * and two shapes:
 *   - "rectangle"  → standard bounding box
 *   - "contour"    → real polygon from API (MediaPipe face landmarks / elliptical body contours)
 */
export function useStudioCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  // ── Load image onto canvas ──────────────────────────────────────────────

  const loadImage = useCallback((image: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0);
    originalImageRef.current = image;
  }, []);

  // ── Clipping helpers ───────────────────────────────────────────────────

  /** Create a polygon clipping path from an array of [x,y] points. */
  const clipPolygon = (ctx: CanvasRenderingContext2D, points: number[][]) => {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
  };

  /** Create a rectangular clipping path */
  const clipRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.closePath();
  };

  // ── Apply blur effect to a region with clipping ────────────────────────

  /**
   * Compute the bounding box that covers all contour points + the detection bbox.
   * This ensures the blur source region is large enough for contours that extend
   * beyond the detection bbox (e.g. forehead above the face box).
   */
  const getEffectiveBounds = (
    x: number, y: number, w: number, h: number,
    contourPoints: number[][] | null,
    canvasW: number, canvasH: number
  ) => {
    if (!contourPoints || contourPoints.length < 3) return { ex: x, ey: y, ew: w, eh: h };
    let minX = x, minY = y, maxX = x + w, maxY = y + h;
    for (const [px, py] of contourPoints) {
      if (px < minX) minX = px;
      if (py < minY) minY = py;
      if (px > maxX) maxX = px;
      if (py > maxY) maxY = py;
    }
    // Add a small margin for blur bleed
    const margin = 8;
    minX = Math.max(0, minX - margin);
    minY = Math.max(0, minY - margin);
    maxX = Math.min(canvasW, maxX + margin);
    maxY = Math.min(canvasH, maxY + margin);
    return { ex: minX, ey: minY, ew: maxX - minX, eh: maxY - minY };
  };

  const applyBlurClipped = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      intensity: number,
      contourPoints: number[][] | null
    ) => {
      // Use effective bounds that cover the full contour area
      const { ex, ey, ew, eh } = getEffectiveBounds(
        x, y, w, h, contourPoints, ctx.canvas.width, ctx.canvas.height
      );

      const radius = Math.max(4, (intensity / 10) * Math.min(ew, eh) * 0.4);
      const passes = Math.ceil(intensity / 2);

      // Create the blurred version of the effective region (covers contour + bbox)
      const tmp = document.createElement("canvas");
      tmp.width = ew;
      tmp.height = eh;
      const tCtx = tmp.getContext("2d")!;
      tCtx.drawImage(ctx.canvas, ex, ey, ew, eh, 0, 0, ew, eh);
      for (let i = 0; i < passes; i++) {
        tCtx.filter = `blur(${radius}px)`;
        tCtx.drawImage(tmp, 0, 0);
        tCtx.filter = "none";
      }

      // Draw back through a clipping mask
      ctx.save();
      if (contourPoints && contourPoints.length >= 3) {
        clipPolygon(ctx, contourPoints);
      } else {
        clipRect(ctx, x, y, w, h);
      }
      ctx.clip();
      ctx.drawImage(tmp, 0, 0, ew, eh, ex, ey, ew, eh);
      ctx.restore();
    },
    []
  );

  // ── Apply pixelation effect to a region with clipping ──────────────────

  const applyPixelationClipped = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      size: number,
      contourPoints: number[][] | null
    ) => {
      const { ex, ey, ew, eh } = getEffectiveBounds(
        x, y, w, h, contourPoints, ctx.canvas.width, ctx.canvas.height
      );
      const blockSize = Math.max(4, Math.round((size / 10) * 40));

      // Create pixelated version of the effective region
      const tmp = document.createElement("canvas");
      tmp.width = ew;
      tmp.height = eh;
      const tCtx = tmp.getContext("2d")!;
      tCtx.drawImage(ctx.canvas, ex, ey, ew, eh, 0, 0, ew, eh);

      const sw = Math.max(1, Math.ceil(ew / blockSize));
      const sh = Math.max(1, Math.ceil(eh / blockSize));
      const small = document.createElement("canvas");
      small.width = sw;
      small.height = sh;
      const sCtx = small.getContext("2d")!;
      sCtx.imageSmoothingEnabled = false;
      sCtx.drawImage(tmp, 0, 0, sw, sh);

      tCtx.imageSmoothingEnabled = false;
      tCtx.drawImage(small, 0, 0, sw, sh, 0, 0, ew, eh);
      tCtx.imageSmoothingEnabled = true;

      // Draw back through a clipping mask
      ctx.save();
      if (contourPoints && contourPoints.length >= 3) {
        clipPolygon(ctx, contourPoints);
      } else {
        clipRect(ctx, x, y, w, h);
      }
      ctx.clip();
      ctx.drawImage(tmp, 0, 0, ew, eh, ex, ey, ew, eh);
      ctx.restore();
    },
    []
  );

  // ── Apply solid color effect with clipping ─────────────────────────────

  const applySolidClipped = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      color: string,
      contourPoints: number[][] | null
    ) => {
      ctx.fillStyle = color;
      if (contourPoints && contourPoints.length >= 3) {
        clipPolygon(ctx, contourPoints);
        ctx.fill();
      } else {
        // Rounded rectangle for a softer look
        const r = Math.min(8, w / 4, h / 4);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }
    },
    []
  );

  // ── Apply a single effect to a target ──────────────────────────────────

  const applyEffectToTarget = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      effect: EffectSettings,
      contourPoints: number[][] | null
    ) => {
      if (w <= 0 || h <= 0) return;

      // Only use contour when shape mode is "contour"
      const useContour = effect.shape === "contour" ? contourPoints : null;

      switch (effect.type) {
        case "blur":
          applyBlurClipped(ctx, x, y, w, h, effect.intensity, useContour);
          break;
        case "pixelation":
          applyPixelationClipped(ctx, x, y, w, h, effect.size, useContour);
          break;
        case "solid":
          applySolidClipped(ctx, x, y, w, h, effect.solidColor, useContour);
          break;
      }
    },
    [applyBlurClipped, applyPixelationClipped, applySolidClipped]
  );

  // ── Full render pass ────────────────────────────────────────────────────

  const render = useCallback(
    (
      targets: BlurTarget[],
      effect: EffectSettings,
      fullScreenBlur: boolean
    ) => {
      const canvas = canvasRef.current;
      const image = originalImageRef.current;
      if (!canvas || !image) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Redraw original
      ctx.drawImage(image, 0, 0);

      // 2. Full screen blur (always rectangle, no contour needed)
      if (fullScreenBlur) {
        applyEffectToTarget(ctx, 0, 0, canvas.width, canvas.height, effect, null);
        return;
      }

      // 3. Per-target effects
      for (const target of targets) {
        if (!target.enabled) continue;
        const { x, y, width, height } = target.bbox;
        // Clamp to canvas
        const cx = Math.max(0, x);
        const cy = Math.max(0, y);
        const cw = Math.min(width, canvas.width - cx);
        const ch = Math.min(height, canvas.height - cy);
        if (cw <= 0 || ch <= 0) continue;

        applyEffectToTarget(ctx, cx, cy, cw, ch, effect, target.contour || null);
      }
    },
    [applyEffectToTarget]
  );

  // ── Download ────────────────────────────────────────────────────────────

  const downloadImage = useCallback(
    (filename: string = "safevision_output.png") => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
    []
  );

  // ── Get canvas data URL (for thumbnails) ────────────────────────────────

  const getDataUrl = useCallback(() => {
    return canvasRef.current?.toDataURL("image/jpeg", 0.5) || null;
  }, []);

  return {
    canvasRef,
    loadImage,
    render,
    downloadImage,
    getDataUrl,
    originalImageRef,
  };
}
