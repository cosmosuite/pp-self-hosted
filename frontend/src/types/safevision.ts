export interface BlurRule {
  label: string;
  shouldBlur: boolean;
}

export interface BlurRules {
  FACE_FEMALE: boolean;
  FACE_MALE: boolean;
  FEMALE_GENITALIA_EXPOSED: boolean;
  MALE_GENITALIA_EXPOSED: boolean;
  FEMALE_BREAST_EXPOSED: boolean;
  MALE_BREAST_EXPOSED: boolean;
  BUTTOCKS_EXPOSED: boolean;
  ANUS_EXPOSED: boolean;
  BELLY_EXPOSED: boolean;
  FEET_EXPOSED: boolean;
  ARMPITS_EXPOSED: boolean;
  FEMALE_GENITALIA_COVERED: boolean;
  FEMALE_BREAST_COVERED: boolean;
  BUTTOCKS_COVERED: boolean;
  ANUS_COVERED: boolean;
  BELLY_COVERED: boolean;
  FEET_COVERED: boolean;
  ARMPITS_COVERED: boolean;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
  should_blur: boolean;
}

export interface SafeVisionResponse {
  status: 'success' | 'error';
  data?: {
    detections_count: number;
    risk_level: string;
    risk_distribution: Record<string, number>;
    is_safe: boolean;
    threshold_used: number;
  };
  detections?: Detection[];
  censored_image?: string;
  session_id?: string;
  error?: string;
}

export interface SafeVisionStats {
  model_loaded: boolean;
  uptime_seconds: number;
  active_sessions: number;
  supported_formats: string[];
  max_file_size_mb: number;
  version: string;
}

export const DEFAULT_BLUR_RULES: BlurRules = {
  FACE_FEMALE: true,
  FACE_MALE: true,
  FEMALE_GENITALIA_EXPOSED: true,
  MALE_GENITALIA_EXPOSED: true,
  FEMALE_BREAST_EXPOSED: true,
  MALE_BREAST_EXPOSED: true,
  BUTTOCKS_EXPOSED: true,
  ANUS_EXPOSED: true,
  BELLY_EXPOSED: true,
  FEET_EXPOSED: true,
  ARMPITS_EXPOSED: true,
  FEMALE_GENITALIA_COVERED: true,
  FEMALE_BREAST_COVERED: true,
  BUTTOCKS_COVERED: true,
  ANUS_COVERED: true,
  BELLY_COVERED: true,
  FEET_COVERED: true,
  ARMPITS_COVERED: true,
};

export const BLUR_RULE_LABELS = {
  FACE_FEMALE: 'Female Faces',
  FACE_MALE: 'Male Faces',
  FEMALE_GENITALIA_EXPOSED: 'Female Genitalia (Exposed)',
  MALE_GENITALIA_EXPOSED: 'Male Genitalia (Exposed)',
  FEMALE_BREAST_EXPOSED: 'Female Breast (Exposed)',
  MALE_BREAST_EXPOSED: 'Male Breast (Exposed)',
  BUTTOCKS_EXPOSED: 'Buttocks (Exposed)',
  ANUS_EXPOSED: 'Anus (Exposed)',
  BELLY_EXPOSED: 'Belly (Exposed)',
  FEET_EXPOSED: 'Feet (Exposed)',
  ARMPITS_EXPOSED: 'Armpits (Exposed)',
  FEMALE_GENITALIA_COVERED: 'Female Genitalia (Covered)',
  FEMALE_BREAST_COVERED: 'Female Breast (Covered)',
  BUTTOCKS_COVERED: 'Buttocks (Covered)',
  ANUS_COVERED: 'Anus (Covered)',
  BELLY_COVERED: 'Belly (Covered)',
  FEET_COVERED: 'Feet (Covered)',
  ARMPITS_COVERED: 'Armpits (Covered)',
};
