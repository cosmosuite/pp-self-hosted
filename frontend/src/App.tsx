import { useState, useEffect, useCallback, useRef } from "react";
import TopBar from "./components/studio/TopBar";
import LeftPanel from "./components/studio/LeftPanel";
import CenterPanel from "./components/studio/CenterPanel";
import RightPanel from "./components/studio/RightPanel";
import { useStudioCanvas } from "./hooks/useStudioCanvas";
import { useCustomDraw } from "./hooks/useCustomDraw";
import { api } from "./services/api";
import {
  BODY_PART_GROUPS,
  DEFAULT_EFFECT_SETTINGS,
  type BlurMode,
  type BlurTarget,
  type BodyPartGroup,
  type BoundingBox,
  type DetectionResponse,
  type EffectSettings,
  type HealthResponse,
  type ImageDimensions,
} from "./types";

export default function App() {
  // ── Health ─────────────────────────────────────────────────────────────
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  // ── Image state ────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimensions | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResponse | null>(null);

  // ── Controls ───────────────────────────────────────────────────────────
  const [fullScreenBlur, setFullScreenBlur] = useState(false);
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);
  const [bodyPartGroups, setBodyPartGroups] = useState<BodyPartGroup[]>(
    () => BODY_PART_GROUPS.map((g) => ({ ...g }))
  );
  const [blurMode, setBlurMode] = useState<BlurMode>("all");
  const [effectSettings, setEffectSettings] = useState<EffectSettings>(DEFAULT_EFFECT_SETTINGS);
  const [isDrawMode, setIsDrawMode] = useState(false);

  // ── Targets (unified AI + custom) ──────────────────────────────────────
  const [blurTargets, setBlurTargets] = useState<BlurTarget[]>([]);
  const nextCustomId = useRef(0);

  // ── Canvas engine ──────────────────────────────────────────────────────
  const { canvasRef, loadImage, render, downloadImage, originalImageRef } = useStudioCanvas();

  // ── Custom draw ────────────────────────────────────────────────────────
  const handleRegionDrawn = useCallback((bbox: BoundingBox) => {
    const id = `custom_${nextCustomId.current++}`;
    setBlurTargets((prev) => [
      ...prev,
      { id, source: "custom", label: "Custom Area", bbox, enabled: true },
    ]);
    // Exit draw mode after drawing one region
    setIsDrawMode(false);
  }, []);

  const { previewRect, onMouseDown, onMouseMove, onMouseUp } = useCustomDraw(
    canvasRef,
    handleRegionDrawn
  );

  // ── Helpers: build enabled labels set from groups ──────────────────────
  const getEnabledLabels = useCallback((): Set<string> => {
    const set = new Set<string>();
    for (const g of bodyPartGroups) {
      if (g.enabled) {
        for (const l of g.detectionLabels) set.add(l);
      }
    }
    return set;
  }, [bodyPartGroups]);

  // ── Build AI targets from detection result ─────────────────────────────
  const buildAiTargets = useCallback(
    (result: DetectionResponse, mode: BlurMode, enabledLabels: Set<string>): BlurTarget[] => {
      return result.detections
        .filter((d) => enabledLabels.has(d.label))
        .map((d, i) => ({
          id: `ai_${i}`,
          source: "ai" as const,
          label: d.label,
          bbox: d.bbox,
          confidence: d.confidence,
          enabled: mode === "all",
          contour: d.contour, // Real polygon from API (MediaPipe for faces, ellipse for body parts)
        }));
    },
    []
  );

  // ── Handle file upload ─────────────────────────────────────────────────
  const handleFileSelected = useCallback(
    async (file: File) => {
      setImageFile(file);
      setDetectionResult(null);
      setError(null);
      setBlurTargets([]);
      setFullScreenBlur(false);
      setIsDrawMode(false);
      nextCustomId.current = 0;

      // Load image onto canvas
      const img = new Image();
      img.onload = async () => {
        loadImage(img);
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });

        // Auto-detect if AI is enabled
        if (aiDetectionEnabled) {
          setIsProcessing(true);
          try {
            const result = await api.detectImage(file, 0.25);
            setDetectionResult(result);

            const enabledLabels = getEnabledLabels();
            const aiTargets = buildAiTargets(result, blurMode, enabledLabels);
            setBlurTargets(aiTargets);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Detection failed");
          } finally {
            setIsProcessing(false);
          }
        }
      };
      img.src = URL.createObjectURL(file);
    },
    [aiDetectionEnabled, blurMode, loadImage, getEnabledLabels, buildAiTargets]
  );

  // ── Re-render canvas whenever targets/settings change ──────────────────
  useEffect(() => {
    if (!originalImageRef.current) return;
    render(blurTargets, effectSettings, fullScreenBlur);
  }, [blurTargets, effectSettings, fullScreenBlur, render, originalImageRef]);

  // ── Rebuild AI targets when groups, mode, or detection changes ─────────
  useEffect(() => {
    if (!detectionResult) return;
    const enabledLabels = getEnabledLabels();
    const aiTargets = buildAiTargets(detectionResult, blurMode, enabledLabels);
    // Preserve custom targets
    setBlurTargets((prev) => {
      const customs = prev.filter((t) => t.source === "custom");
      return [...aiTargets, ...customs];
    });
  }, [detectionResult, bodyPartGroups, blurMode, getEnabledLabels, buildAiTargets]);

  // ── Re-detect when AI toggle changes ──────────────────────────────────
  useEffect(() => {
    if (!imageFile || !aiDetectionEnabled) {
      if (!aiDetectionEnabled) {
        // Remove AI targets
        setBlurTargets((prev) => prev.filter((t) => t.source === "custom"));
        setDetectionResult(null);
      }
      return;
    }
    // If AI just got turned on and we have an image but no result
    if (!detectionResult && imageFile) {
      (async () => {
        setIsProcessing(true);
        try {
          const result = await api.detectImage(imageFile, 0.25);
          setDetectionResult(result);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Detection failed");
        } finally {
          setIsProcessing(false);
        }
      })();
    }
  }, [aiDetectionEnabled, imageFile, detectionResult]);

  // ── Toggle a body part group ───────────────────────────────────────────
  const handleBodyPartToggle = useCallback((groupId: string) => {
    setBodyPartGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, enabled: !g.enabled } : g))
    );
  }, []);

  // ── Toggle a single target ─────────────────────────────────────────────
  const handleToggleTarget = useCallback((targetId: string) => {
    setBlurTargets((prev) =>
      prev.map((t) => (t.id === targetId ? { ...t, enabled: !t.enabled } : t))
    );
  }, []);

  // ── Delete a custom region ─────────────────────────────────────────────
  const handleDeleteCustom = useCallback((targetId: string) => {
    setBlurTargets((prev) => prev.filter((t) => t.id !== targetId));
  }, []);

  // ── Download ───────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const name = imageFile?.name?.replace(/\.[^.]+$/, "") || "image";
    downloadImage(`${name}_safevision.png`);
  }, [downloadImage, imageFile]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0d0d14] text-zinc-300 overflow-hidden">
      {/* Top Bar */}
      <TopBar
        creditsRemaining={detectionResult?.credits_remaining ?? null}
        onDownload={handleDownload}
        hasImage={!!imageFile}
        modelLoaded={health?.model_loaded ?? false}
        error={error}
      />

      {/* Main 3-panel layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel */}
        <LeftPanel
          fullScreenBlur={fullScreenBlur}
          onFullScreenBlurToggle={() => setFullScreenBlur((v) => !v)}
          isDrawMode={isDrawMode}
          onDrawModeToggle={() => setIsDrawMode((v) => !v)}
          aiDetectionEnabled={aiDetectionEnabled}
          onAiDetectionToggle={() => setAiDetectionEnabled((v) => !v)}
          bodyPartGroups={bodyPartGroups}
          onBodyPartToggle={handleBodyPartToggle}
          blurMode={blurMode}
          onBlurModeChange={setBlurMode}
          effectSettings={effectSettings}
          onEffectSettingsChange={setEffectSettings}
          hasImage={!!imageFile}
        />

        {/* Center Panel */}
        <CenterPanel
          canvasRef={canvasRef}
          hasImage={!!imageFile}
          isProcessing={isProcessing}
          isDrawMode={isDrawMode}
          previewRect={previewRect}
          onFileSelected={handleFileSelected}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />

        {/* Right Panel */}
        <RightPanel
          targets={blurTargets}
          onToggleTarget={handleToggleTarget}
          onDeleteCustom={handleDeleteCustom}
          file={imageFile}
          dimensions={imageDimensions}
        />
      </div>
    </div>
  );
}
