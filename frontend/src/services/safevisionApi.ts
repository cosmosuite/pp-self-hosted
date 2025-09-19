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
    blur: boolean = true,
    blurIntensity: number = 50
  ): Promise<SafeVisionResponse> {
    const formData = new FormData();
    formData.append('file', imageFile);
    formData.append('threshold', threshold.toString());
    formData.append('blur', blur.toString());
    
    // Add blur rules to form data
    if (blur) {
      Object.entries(blurRules).forEach(([key, value]) => {
        formData.append(`blur_${key.toLowerCase()}`, value.toString());
      });
      // Add blur intensity
      formData.append('blur_intensity', blurIntensity.toString());
      // Add timestamp to force processing
      formData.append('timestamp', Date.now().toString());
      console.log('🎚️ Sending blur intensity to API:', blurIntensity);
    }

    const response = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Debug logging
    console.log('🔍 API Response:', {
      status: result.status,
      censored_available: result.censored_available,
      censored_image: result.censored_image,
      detections_count: result.detections?.length || 0
    });
    
    // Note: Blur rules are now handled by the API, no need to process in frontend
    
    return result;
  }


  async processImageBase64(
    imageData: string,
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
