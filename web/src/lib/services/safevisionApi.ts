import { BlurRules, SafeVisionResponse } from '@/types/safevision';
import { API_CONFIG } from '@/lib/config/api';

export class SafeVisionAPI {
  private baseUrl: string;
  private healthBaseUrl: string;

  constructor(baseUrl?: string) {
    // Use internal Next.js API for processing (with remote SafeVision backend)
    this.baseUrl = baseUrl || '/api';
    
    // Use remote SafeVision GPU API for health checks
    this.healthBaseUrl = API_CONFIG.SAFEVISION_API_URL;
    
    console.log('🚀 SafeVisionAPI: Processing base URL:', this.baseUrl);
    console.log('🚀 SafeVisionAPI: Health check base URL:', this.healthBaseUrl);
  }

  async processImage(
    imageFile: File,
    blurRules: BlurRules,
    threshold: number = API_CONFIG.DEFAULT_THRESHOLD,
    blur: boolean = true,
    blurIntensity: number = API_CONFIG.DEFAULT_BLUR_INTENSITY,
    blurArea: number = API_CONFIG.DEFAULT_BLUR_AREA
  ): Promise<SafeVisionResponse> {
    const formData = new FormData();
    formData.append('image', imageFile);
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
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    // Debug logging
    console.log('🔍 API Response:', {
      status: result.status,
      censored_available: result.success,
      fileName: result.fileName,
      stats: result.stats
    });
    
    // Transform the response to match SafeVisionResponse interface
    return {
      status: result.success ? 'success' : 'error',
      censored_image: result.fileName,
      error: result.error,
    };
  }

  async getHealth(): Promise<any> {
    // Always use the remote SafeVision API for health checks
    const healthUrl = `${this.healthBaseUrl}/api/v1/health`;
    console.log('🔍 SafeVisionAPI: Getting health from:', healthUrl);
    
    try {
      // Create a controller for manual timeout control
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.HEALTH_CHECK_TIMEOUT);
      
      const response = await fetch(healthUrl, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log('🔍 SafeVisionAPI: Health response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ SafeVisionAPI: Health check failed with status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const healthData = await response.json();
      console.log('✅ SafeVisionAPI: Health data received:', healthData);
      return healthData;
    } catch (error) {
      console.error('❌ SafeVisionAPI: Health check error:', error);
      throw error;
    }
  }

  async downloadProcessedImage(filename: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/download/${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.blob();
  }

  // Retry logic for robust API calls
  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('No attempts made');
    
    for (let attempt = 1; attempt <= API_CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🚀 SafeVision API attempt ${attempt}/${API_CONFIG.RETRY_ATTEMPTS}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ SafeVision API attempt ${attempt} failed:`, error);
        
        if (attempt < API_CONFIG.RETRY_ATTEMPTS) {
          await this.delay(API_CONFIG.RETRY_DELAY * attempt);
        }
      }
    }
    
    throw new Error(`SafeVision API failed after ${API_CONFIG.RETRY_ATTEMPTS} attempts: ${lastError.message}`);
  }
  
  // Utility method for delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Health check with API
  async checkConnection(): Promise<boolean> {
    console.log('🔍 SafeVisionAPI: checkConnection() called');
    try {
      const health = await this.getHealth();
      const isHealthy = health.status === 'OK' || health.status === 'healthy' || health.status === 'online';
      console.log(`🔍 SafeVisionAPI: Health status check - status: ${health.status}, isHealthy: ${isHealthy}`);
      return isHealthy;
    } catch (error) {
      console.error('❌ SafeVisionAPI: Connection failed:', error);
      return false;
    }
  }
}

// Create and export an instance
export const safeVisionAPI = new SafeVisionAPI();

// Also export as default for compatibility
export default safeVisionAPI;
