import axios, { AxiosResponse } from 'axios';
import { BlurOptions, ProcessingResult } from '../types';

export interface RemoteSafeVisionConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface RemoteSafeVisionResponse {
  status: string;
  censored_available: boolean;
  censored_image?: string;
  detections?: Array<{
    label: string;
    confidence: number;
    box: [number, number, number, number];
    should_blur: boolean;
  }>;
  processing_info: {
    processing_time: number;
    model_used: string;
    cuda_enabled: boolean;
  };
}

export class RemoteSafeVisionService {
  private config: RemoteSafeVisionConfig;

  constructor(config?: Partial<RemoteSafeVisionConfig>) {
    this.config = {
      baseUrl: process.env.SAFEVISION_API_URL || 'https://a2g50oun4fr6h4-5001.proxy.runpod.net/api/v1',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  async processImage(
    imageBuffer: Buffer,
    fileName: string,
    options: BlurOptions
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Convert buffer to base64
      const base64Image = imageBuffer.toString('base64');
      
      // Prepare request payload
      const payload = {
        image: base64Image,
        threshold: 0.25,
        blur: options.applyBlur,
        blur_intensity: options.blurIntensity || 50,
        blur_area: options.blurArea || 100,
        use_face_landmarks: options.useFaceLandmarks || false,
        // Add blur rules
        blur_female_genitalia_exposed: options.blurFemaleGenitaliaExposed || false,
        blur_male_genitalia_exposed: options.blurMaleGenitaliaExposed || false,
        blur_buttocks_exposed: options.blurButtocksExposed || false,
        blur_female_breast_exposed: options.blurFemaleBreastExposed || false,
        blur_anus: options.blurAnus || false,
        blur_female_genitalia_covered: options.blurFemaleGenitaliaCovered || false,
        blur_male_genitalia_covered: options.blurMaleGenitaliaCovered || false,
        blur_female_breast_covered: options.blurFemaleBreastCovered || false,
        blur_male_chest: options.blurMaleChest || false,
        blur_belly: options.blurBelly || false,
        blur_feet: options.blurFeet || false,
        blur_arms: options.blurArms || false,
        blur_face: options.blurFace || false,
        blur_wearing_mask: options.blurWearingMask || false,
        blur_wearing_helmet: options.blurWearingHelmet || false,
        blur_glasses: options.blurGlasses || false,
        blur_hair: options.blurHair || false,
        blur_male_face: options.blurMaleFace || false
      };

      const response = await this.executeWithRetry(async () => {
        return await axios.post(`${this.config.baseUrl}/detect/base64`, payload, {
          timeout: this.config.timeout,
          headers: {
            'Content-Type': 'application/json'
          }
        });
      });

      const processingTime = Date.now() - startTime;
      const result = response.data as RemoteSafeVisionResponse;

      // Convert response to ProcessingResult format
      return this.convertResponse(result, fileName, processingTime, options);

    } catch (error) {
      console.error('Remote SafeVision processing error:', error);
      throw new Error(`Remote SafeVision processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('No attempts made');
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        console.log(`🚀 Remote SafeVision API attempt ${attempt}/${this.config.retryAttempts}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Remote SafeVision API attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }
    
    throw new Error(`Remote SafeVision API failed after ${this.config.retryAttempts} attempts: ${lastError.message}`);
  }

  private convertResponse(
    response: RemoteSafeVisionResponse,
    fileName: string,
    processingTime: number,
    options: BlurOptions
  ): ProcessingResult {
    let outputPath: string;
    let processedImageBuffer: Buffer;

    if (response.censored_available && response.censored_image) {
      // Decode base64 censored image
      processedImageBuffer = Buffer.from(response.censored_image, 'base64');
      
      // Generate output filename
      const outputFileName = `processed_${fileName.replace(/\.(jpg|jpeg|png|gif)$/i, '')}_${Date.now()}`;
      const extension = fileName.match(/\.(jpg|jpeg|png|gif)$/i)?.[0] || '.jpg';
      outputPath = `/tmp/${outputFileName}${extension}`;
      
      // For now, we'll return the buffer - in production, save to file system
      console.log(`Remote SafeVision processed image ${fileName} in ${processingTime}ms`);
    } else {
      throw new Error('Remote SafeVision did not return processed image');
    }

    return {
      outputPath,
      fileName: outputPath.split('/').pop() || fileName,
      stats: {
        originalSize: 0, // We don't have original size from remote API
        processedSize: processedImageBuffer.length,
        processingTime,
        detections: response.detections?.length || 0
      }
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/health`, {
        timeout: 5000
      });
      return response.data.status === 'online' || response.data.status === 'healthy';
    } catch (error) {
      console.error('❌ Remote SafeVision API health check failed:', error);
      return false;
    }
  }

  async getStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/stats`, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.error('❌ Remote SafeVision API stats failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const remoteSafeVisionService = new RemoteSafeVisionService();
