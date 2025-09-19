import { BlurRules, SafeVisionResponse, SafeVisionStats } from '../types/safevision';

const API_BASE_URL = 'http://localhost:5001/api/v1';

export class SafeVisionAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async processImage(
    imageFile: File,
    blurRules: BlurRules,
    threshold: number = 0.25,
    blur: boolean = true
  ): Promise<SafeVisionResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('threshold', threshold.toString());
    formData.append('blur', blur.toString());
    formData.append('blur_rules', JSON.stringify(blurRules));

    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async processImageBase64(
    imageData: string,
    blurRules: BlurRules,
    threshold: number = 0.25,
    blur: boolean = true
  ): Promise<SafeVisionResponse> {
    const response = await fetch(`${this.baseUrl}/detect/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        threshold,
        blur,
        blur_rules: blurRules,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getHealth(): Promise<SafeVisionStats> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async getLabels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/labels`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.labels;
  }

  async getStats(): Promise<SafeVisionStats> {
    const response = await fetch(`${this.baseUrl}/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const safeVisionAPI = new SafeVisionAPI();
