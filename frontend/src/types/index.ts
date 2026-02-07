// ─── API Response Types ──────────────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  label: string;
  confidence: number;
  risk_level: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  bbox: BoundingBox;
  should_blur: boolean;
  /** Polygon contour points [[x1,y1], [x2,y2], ...] for contour blur.
   *  For faces: convex hull from 468 MediaPipe landmarks.
   *  For other body parts: elliptical approximation. */
  contour?: number[][];
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface RiskSummary {
  overall_risk: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  is_safe: boolean;
  distribution: Record<string, number>;
}

export interface DetectionResponse {
  status: string;
  image_dimensions: ImageDimensions;
  detections: Detection[];
  detection_count: number;
  risk_summary: RiskSummary;
  credits_remaining: number | null;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  uptime_seconds: number;
  version: string;
  supported_formats: string[];
  max_upload_size_mb: number;
}

export interface LabelInfo {
  label: string;
  category: string;
  default_risk: string;
  default_blur: boolean;
}

// ─── Studio Types ────────────────────────────────────────────────────────────

export type EffectType = "blur" | "pixelation" | "solid";

export type BlurShape = "rectangle" | "contour";

export type BlurMode = "all" | "selective";

export interface BodyPartGroup {
  id: string;
  label: string;
  /** Raw detection labels that belong to this group */
  detectionLabels: string[];
  enabled: boolean;
}

/** The 8 creator-friendly body part groups */
export const BODY_PART_GROUPS: BodyPartGroup[] = [
  { id: "face", label: "Face", detectionLabels: ["FACE_FEMALE", "FACE_MALE"], enabled: true },
  { id: "breasts", label: "Breasts", detectionLabels: ["FEMALE_BREAST_EXPOSED", "MALE_BREAST_EXPOSED"], enabled: true },
  { id: "buttocks", label: "Buttocks", detectionLabels: ["BUTTOCKS_EXPOSED"], enabled: true },
  { id: "genitalia", label: "Genitalia", detectionLabels: ["FEMALE_GENITALIA_EXPOSED", "MALE_GENITALIA_EXPOSED"], enabled: true },
  { id: "belly", label: "Belly", detectionLabels: ["BELLY_EXPOSED"], enabled: false },
  { id: "anus", label: "Anus", detectionLabels: ["ANUS_EXPOSED"], enabled: true },
  { id: "feet", label: "Feet", detectionLabels: ["FEET_EXPOSED"], enabled: false },
  { id: "armpits", label: "Armpits", detectionLabels: ["ARMPITS_EXPOSED"], enabled: false },
];

export interface CustomRegion {
  id: string;
  bbox: BoundingBox;
  label: string;
}

/** A single blur-able target (either AI-detected or custom-drawn) */
export interface BlurTarget {
  id: string;
  source: "ai" | "custom";
  label: string;
  bbox: BoundingBox;
  confidence?: number;
  enabled: boolean;
  /** Polygon contour points from the API for contour blur mode. */
  contour?: number[][];
}

export interface EffectSettings {
  type: EffectType;
  shape: BlurShape;
  intensity: number; // 1-10
  size: number; // 1-10
  solidColor: string; // hex color for solid mode
}

export interface StudioState {
  // Image
  imageFile: File | null;
  imageUrl: string | null;
  imageDimensions: ImageDimensions | null;

  // Detection
  isProcessing: boolean;
  detectionResult: DetectionResponse | null;
  error: string | null;

  // Controls
  fullScreenBlur: boolean;
  aiDetectionEnabled: boolean;
  bodyPartGroups: BodyPartGroup[];
  blurMode: BlurMode;
  effectSettings: EffectSettings;

  // Targets
  blurTargets: BlurTarget[];
  customRegions: CustomRegion[];

  // Draw mode
  isDrawMode: boolean;

  // Health
  health: HealthResponse | null;
}

export const DEFAULT_EFFECT_SETTINGS: EffectSettings = {
  type: "blur",
  shape: "contour",
  intensity: 5,
  size: 3,
  solidColor: "#000000",
};
