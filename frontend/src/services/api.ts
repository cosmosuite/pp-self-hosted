import type { DetectionResponse, HealthResponse, LabelInfo } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "";

class SafeVisionAPI {
  private baseUrl: string;
  private apiKey: string | null;

  constructor() {
    this.baseUrl = API_BASE;
    this.apiKey = null;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.apiKey) h["X-API-Key"] = this.apiKey;
    return h;
  }

  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/health`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return res.json();
  }

  async detectImage(
    file: File,
    threshold = 0.25,
    blurRules?: Record<string, boolean>
  ): Promise<DetectionResponse> {
    const form = new FormData();
    form.append("image", file);
    form.append("threshold", threshold.toString());
    if (blurRules) form.append("blur_rules", JSON.stringify(blurRules));

    const res = await fetch(`${this.baseUrl}/api/v1/detect`, {
      method: "POST",
      headers: this.headers(),
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.detail || err.error || `Detection failed: ${res.status}`);
    }

    return res.json();
  }

  async getLabels(): Promise<{ labels: LabelInfo[]; count: number }> {
    const res = await fetch(`${this.baseUrl}/api/v1/labels`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Failed to get labels: ${res.status}`);
    return res.json();
  }

  async getBlurRules(): Promise<{ rules: Record<string, boolean> }> {
    const res = await fetch(`${this.baseUrl}/api/v1/config/blur-rules`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`Failed to get blur rules: ${res.status}`);
    return res.json();
  }
}

export const api = new SafeVisionAPI();
