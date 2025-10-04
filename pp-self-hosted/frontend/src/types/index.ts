export interface BlurRules {
  FEMALE_GENITALIA_EXPOSED?: boolean;
  MALE_GENITALIA_EXPOSED?: boolean;
  FEMALE_BREAST_EXPOSED?: boolean;
  MALE_BREAST_EXPOSED?: boolean;
  BUTTOCKS_EXPOSED?: boolean;
  ANUS_EXPOSED?: boolean;
  BELLY_EXPOSED?: boolean;
  FEET_EXPOSED?: boolean;
  ARMPITS_EXPOSED?: boolean;
  FACE_FEMALE?: boolean;
  FACE_MALE?: boolean;
  FEMALE_GENITALIA_COVERED?: boolean;
  FEMALE_BREAST_COVERED?: boolean;
  BUTTOCKS_COVERED?: boolean;
  ANUS_COVERED?: boolean;
  BELLY_COVERED?: boolean;
  FEET_COVERED?: boolean;
  ARMPITS_COVERED?: boolean;
}

export interface Detection {
  label: string;
  confidence: number;
  bbox: number[];
  should_blur: boolean;
}

export interface ProcessResult {
  status: string;
  data: {
    detections_count: number;
    risk_level: string;
    risk_distribution: Record<string, number>;
    is_safe: boolean;
    threshold_used: number;
  };
  detections: Detection[];
  censored_image?: string;
  session_id?: string;
}

export interface BlurSettings {
  type: 'blur' | 'pixelation' | 'color';
  intensity: number;
  size: number;
  useFaceLandmarks: boolean;
}

export interface FileQueueItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: ProcessResult;
  error?: string;
  progress?: number;
}
