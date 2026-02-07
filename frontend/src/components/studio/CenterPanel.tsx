import type { BoundingBox } from "../../types";

interface Props {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasImage: boolean;
  isProcessing: boolean;
  isDrawMode: boolean;
  previewRect: BoundingBox | null;
  onFileSelected: (file: File) => void;
  // Custom draw mouse handlers
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
}

export default function CenterPanel({
  canvasRef,
  hasImage,
  isProcessing,
  isDrawMode,
  previewRect,
  onFileSelected,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: Props) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) onFileSelected(file);
  };

  const handleClick = () => {
    if (hasImage && !isDrawMode) return;
    if (!hasImage) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) onFileSelected(file);
      };
      input.click();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d14] overflow-hidden relative min-h-0">
      {/* Upload state */}
      {!hasImage && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-4 cursor-pointer w-full h-full"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#1a1a24] border border-[#2a2a3a] flex items-center justify-center">
            <svg
              className="w-8 h-8 text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm text-zinc-400 font-medium">
              Drop an image here or click to upload
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              PNG, JPEG, GIF, BMP, WebP up to 50MB
            </p>
          </div>
        </div>
      )}

      {/* Canvas */}
      {hasImage && (
        <div
          className={`relative w-full h-full flex items-center justify-center p-4 ${
            isDrawMode ? "cursor-crosshair" : ""
          }`}
          onMouseDown={isDrawMode ? onMouseDown : undefined}
          onMouseMove={isDrawMode ? onMouseMove : undefined}
          onMouseUp={isDrawMode ? onMouseUp : undefined}
          onMouseLeave={isDrawMode ? onMouseUp : undefined}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            style={{ imageRendering: "auto" }}
          />

          {/* Draw-mode preview rectangle */}
          {isDrawMode && previewRect && (
            <DrawPreview canvasRef={canvasRef} rect={previewRect} />
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="flex flex-col items-center gap-3">
                <svg
                  className="animate-spin w-8 h-8 text-violet-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                <span className="text-sm text-violet-300 font-medium">
                  Detecting body parts...
                </span>
              </div>
            </div>
          )}

          {/* Draw mode indicator */}
          {isDrawMode && !isProcessing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-violet-600/90 text-white text-xs font-medium backdrop-blur-sm">
              Click and drag to draw a blur area
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Renders the draw-preview rectangle overlay positioned relative to the canvas */
function DrawPreview({
  canvasRef,
  rect,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  rect: BoundingBox;
}) {
  const canvas = canvasRef.current;
  if (!canvas) return null;

  const cr = canvas.getBoundingClientRect();
  const scaleX = cr.width / canvas.width;
  const scaleY = cr.height / canvas.height;

  // Position relative to the canvas container
  const style: React.CSSProperties = {
    position: "absolute",
    left: cr.left - (canvas.parentElement?.getBoundingClientRect().left ?? 0) + rect.x * scaleX,
    top: cr.top - (canvas.parentElement?.getBoundingClientRect().top ?? 0) + rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
    border: "2px dashed rgba(124, 58, 237, 0.8)",
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    pointerEvents: "none",
    borderRadius: 4,
  };

  return <div style={style} />;
}
