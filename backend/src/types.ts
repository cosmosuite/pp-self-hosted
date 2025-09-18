export interface BlurOptions {
  applyBlur: boolean;
  enhancedBlur: boolean;
  solidColor: boolean;
  maskColor: [number, number, number]; // RGB values
  fullBlurRule: number;
  threshold: number;
}

export interface ProcessingResult {
  outputPath: string;
  fileName: string;
  stats: {
    originalSize: number;
    processedSize: number;
    processingTime: number;
    detections: number;
  };
}

export interface DetectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}
