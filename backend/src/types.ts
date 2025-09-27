export interface BlurOptions {
  applyBlur: boolean;
  enhancedBlur: boolean;
  solidColor: boolean;
  maskColor: [number, number, number]; // RGB values
  fullBlurRule: number;
  threshold: number;
  /** 
   * Blur intensity strength as a percentage value.
   * Controls how strong the blur effect is applied to detected regions.
   * @default 50
   * @range 0-100
   * @example 75 // 75% blur intensity
   */
  blurIntensity: number;
  /** 
   * Blur area as a percentage of the detection box size.
   * Controls what portion of each detected region gets blurred.
   * @default 100
   * @range 0-100
   * @example 80 // Blur 80% of the detection box area
   */
  blurArea: number;
  /** 
   * Enable face landmark detection for more accurate face blurring.
   * When enabled, uses 68-point facial landmarks instead of rectangular boxes.
   * Provides better coverage including forehead and face contours.
   * @default true
   * @example true // Use landmark-based face blurring
   */
  useFaceLandmarks: boolean;
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