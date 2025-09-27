import { BlurRules, SafeVisionResponse } from '../types/safevision';

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
    blurIntensity: number = 50,
    blurArea: number = 100
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
      // Add blur area
      formData.append('blur_area', blurArea.toString());
      // Add face landmarks setting
      formData.append('use_face_landmarks', blurRules.useFaceLandmarks.toString());
      // Add timestamp to force processing
      formData.append('timestamp', Date.now().toString());
      console.log('🎚️ Sending blur intensity to API:', blurIntensity);
      console.log('🎯 Sending blur area to API:', blurArea);
      console.log('🧠 Sending face landmarks to API:', blurRules.useFaceLandmarks);
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
      detections_count: result.detections?.length || 0,
      processing_info: result.processing_info
    });
    
    // Note: Blur rules are now handled by the API, no need to process in frontend
    
    return result;
  }


  async processImageBase64(
    imageData: string,
    threshold: number = 0.25,
    blur: boolean = true,
    blurIntensity: number = 50,
    blurArea: number = 100,
    blurRules: BlurRules
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
        blur_intensity: blurIntensity,
        blur_area: blurArea,
        use_face_landmarks: blurRules.useFaceLandmarks,
        // Add all blur rules
        ...Object.fromEntries(
          Object.entries(blurRules).map(([key, value]) => [
            `blur_${key.toLowerCase()}`,
            value
          ])
        )
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Debug logging
    console.log('🔍 Base64 API Response:', {
      status: result.status,
      censored_available: result.censored_available,
      censored_image: result.censored_image,
      detections_count: result.detections?.length || 0,
      processing_info: result.processing_info
    });
    
    return result;
  }

  async getHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async downloadProcessedImage(filename: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/download/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.blob();
  }
}

// Create and export an instance
export const safeVisionAPI = new SafeVisionAPI();

// Also export as default for compatibility
export default safeVisionAPI;