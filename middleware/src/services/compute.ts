/**
 * HTTP client to call the Hetzner compute server.
 */

import axios from "axios";
import FormData from "form-data";

const COMPUTE_URL = process.env.COMPUTE_URL || "http://localhost:8000";
const COMPUTE_API_KEY = process.env.COMPUTE_API_KEY || "";

export interface ComputeDetection {
  label: string;
  confidence: number;
  risk_level: string;
  bbox: { x: number; y: number; width: number; height: number };
  should_blur: boolean;
  contour: number[][] | null;
}

export interface ComputeResult {
  image_dimensions: { width: number; height: number };
  detections: ComputeDetection[];
  detection_count: number;
  risk_summary: {
    overall_risk: string;
    is_safe: boolean;
    distribution: Record<string, number>;
  };
}

export interface ComputeLabel {
  label: string;
  category: string;
  default_risk: string;
  default_blur: boolean;
}

/**
 * Forward an image buffer to the compute server for detection.
 */
export async function callComputeDetect(
  imageBuffer: Buffer,
  filename: string,
  mimetype: string,
  threshold: number = 0.25
): Promise<ComputeResult> {
  const form = new FormData();
  form.append("image", imageBuffer, { filename, contentType: mimetype });
  form.append("threshold", threshold.toString());

  const headers: Record<string, string> = {
    ...form.getHeaders(),
  };
  if (COMPUTE_API_KEY) {
    headers["X-Compute-Key"] = COMPUTE_API_KEY;
  }

  const res = await axios.post<ComputeResult>(
    `${COMPUTE_URL}/compute/detect`,
    form,
    {
      headers,
      timeout: 120_000, // 2 minutes for large images
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }
  );

  return res.data;
}

/**
 * Check if the compute server is healthy.
 */
export async function checkComputeHealth(): Promise<{
  status: string;
  model_loaded: boolean;
  uptime_seconds: number;
}> {
  const res = await axios.get(`${COMPUTE_URL}/health`, { timeout: 5000 });
  return res.data;
}

/**
 * Fetch labels from the compute server.
 */
export async function fetchComputeLabels(): Promise<{
  labels: ComputeLabel[];
  count: number;
}> {
  const headers: Record<string, string> = {};
  if (COMPUTE_API_KEY) {
    headers["X-Compute-Key"] = COMPUTE_API_KEY;
  }
  const res = await axios.get(`${COMPUTE_URL}/compute/labels`, {
    headers,
    timeout: 5000,
  });
  return res.data;
}
