import { useCallback, useRef, useState } from "react";
import type { BoundingBox } from "../types";

interface DrawState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Hook for drawing custom blur rectangles on a canvas.
 * Converts mouse coordinates from display space to image space.
 */
export function useCustomDraw(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  onRegionDrawn: (bbox: BoundingBox) => void
) {
  const [previewRect, setPreviewRect] = useState<BoundingBox | null>(null);
  const drawState = useRef<DrawState>({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  /** Convert mouse event coords (display) to image-space coords */
  const toImageCoords = useCallback(
    (e: React.MouseEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: Math.round((e.clientX - rect.left) * scaleX),
        y: Math.round((e.clientY - rect.top) * scaleY),
      };
    },
    [canvasRef]
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pt = toImageCoords(e);
      if (!pt) return;
      drawState.current = {
        isDrawing: true,
        startX: pt.x,
        startY: pt.y,
        currentX: pt.x,
        currentY: pt.y,
      };
      setPreviewRect(null);
    },
    [toImageCoords]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!drawState.current.isDrawing) return;
      const pt = toImageCoords(e);
      if (!pt) return;
      drawState.current.currentX = pt.x;
      drawState.current.currentY = pt.y;

      const { startX, startY, currentX, currentY } = drawState.current;
      setPreviewRect({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: Math.abs(currentX - startX),
        height: Math.abs(currentY - startY),
      });
    },
    [toImageCoords]
  );

  const onMouseUp = useCallback(() => {
    if (!drawState.current.isDrawing) return;
    const { startX, startY, currentX, currentY } = drawState.current;
    drawState.current.isDrawing = false;

    const w = Math.abs(currentX - startX);
    const h = Math.abs(currentY - startY);

    // Only register if the rectangle is meaningful (> 10px)
    if (w > 10 && h > 10) {
      onRegionDrawn({
        x: Math.min(startX, currentX),
        y: Math.min(startY, currentY),
        width: w,
        height: h,
      });
    }

    setPreviewRect(null);
  }, [onRegionDrawn]);

  return {
    previewRect,
    onMouseDown,
    onMouseMove,
    onMouseUp,
  };
}
