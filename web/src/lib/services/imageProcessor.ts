import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { BlurOptions, ProcessingResult, DetectionBox } from '@/types/backend';
import { API_CONFIG } from '@/lib/config/api';

// Call the remote SafeVision API for complete blur processing
async function processWithRemoteSafeVision(imagePath: string, options: BlurOptions): Promise<ProcessingResult> {
  try {
    console.log(`Calling remote SafeVision API for complete blur processing: ${imagePath}`);
    console.log('Blur options:', options);
    
    // Read the image file
    const imageBuffer = await fs.readFile(imagePath);
    const formData = new FormData();
    
    // Create a File-like object for the upload
    const fileName = path.basename(imagePath);
    const file = new File([imageBuffer], fileName, { type: 'image/jpeg' });
    formData.append('image', file);
    
    // Add all blur options to form data
    const blurRules: Record<string, boolean> = {};
    
    // Set up blur rules based on options
    blurRules.FACE_FEMALE = options.useFaceLandmarks !== false;
    blurRules.FACE_MALE = options.useFaceLandmarks !== false;
    blurRules.FEMALE_GENITALIA_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 3;
    blurRules.MALE_GENITALIA_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 4;
    blurRules.FEMALE_BREAST_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 5;
    blurRules.MALE_BREAST_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 6;
    blurRules.BUTTOCKS_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 7;
    blurRules.ANUS_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 8;
    blurRules.BELLY_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 9;
    blurRules.FEET_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 10;
    blurRules.ARMPITS_EXPOSED = options.fullBlurRule === -1 || options.fullBlurRule === 11;
    
    blurRules.FEMALE_GENITALIA_COVERED = options.fullBlurRule === -1;
    blurRules.FEMALE_BREAST_COVERED = options.fullBlurRule === -1;
    blurRules.BUTTOCKS_COVERED = options.fullBlurRule === -1;
    blurRules.ANUS_COVERED = options.fullBlurRule === -1;
    blurRules.BELLY_COVERED = options.fullBlurRule === -1;
    blurRules.FEET_COVERED = options.fullBlurRule === -1;
    blurRules.ARMPITS_COVERED = options.fullBlurRule === -1;
    
    blurRules.useFaceLandmarks = options.useFaceLandmarks !== false;
    
    // Add blur rules to form data
    for (const [key, value] of Object.entries(blurRules)) {
      formData.append(key, String(value));
    }
    
    // Add threshold
    formData.append('threshold', String(options.threshold || API_CONFIG.DEFAULT_THRESHOLD));
    formData.append('blur_intensity', String(options.blurIntensity || API_CONFIG.DEFAULT_BLUR_INTENSITY));
    formData.append('blur_area', String(options.blurArea || API_CONFIG.DEFAULT_BLUR_AREA));
    formData.append('use_rules', 'true');
    
    console.log('Sending request to remote SafeVision API:', API_CONFIG.SAFEVISION_API_URL);
    
    const startTime = Date.now();
    const response = await fetch(`${API_CONFIG.SAFEVISION_API_URL}/api/v1/process`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
    });
    const processingTime = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SafeVision API error: ${response.status} - ${errorText}`);
      throw new Error(`SafeVision API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log('SafeVision API response:', result);
    
    if (result.status === 'error') {
      throw new Error(result.error || 'Unknown processing error');
    }
    
    // Generate output filename
    const outputFileName = `processed_${uuidv4()}.jpg`;
    const outputPath = path.join(process.cwd(), 'outputs', outputFileName);
    await fs.ensureDir(path.dirname(outputPath));
    
    // Convert base64 censored image to file
    if (result.censored_image) {
      const imageData = result.censored_image.replace(/^data:image\/[a-z]+;base64,/, '');
      await fs.writeFile(outputPath, Buffer.from(imageData, 'base64'));
    }
    
    // Get file sizes
    const originalSize = fs.statSync(imagePath).size;
    let processedSize = originalSize;
    
    try {
      if (fs.existsSync(outputPath)) {
        processedSize = fs.statSync(outputPath).size;
      }
    } catch (e) {
      console.warn('Could not get processed file size:', e);
    }
    
    console.log(`SafeVision API processing completed in ${processingTime}ms`);
    console.log(`Original size: ${originalSize} bytes, Processed size: ${processedSize} bytes`);
    
    return {
      outputPath,
      fileName: outputFileName,
      stats: {
        originalSize,
        processedSize,
        processingTime,
        detections: result.detections?.length || 0
      }
    };
    
  } catch (error) {
    console.error('SafeVision API processing error:', error);
    throw new Error(`SafeVision API processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function processImage(imagePath: string, options: BlurOptions): Promise<ProcessingResult> {
  try {
    console.log(`Starting remote SafeVision image processing: ${imagePath}`);
    console.log('Options:', options);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    console.log('🔄 Using Remote SafeVision API');
    const result = await processWithRemoteSafeVision(imagePath, options);
    
    console.log(`Remote SafeVision processing completed successfully`);
    return result;

  } catch (error) {
    console.error('SafeVision image processing error:', error);
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}