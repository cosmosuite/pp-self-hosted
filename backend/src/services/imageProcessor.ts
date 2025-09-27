import sharp from 'sharp';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import { BlurOptions, ProcessingResult, DetectionBox } from '../types';

const execAsync = promisify(exec);

// Call the actual SafeVision Python script for complete blur processing
async function processWithSafeVision(imagePath: string, options: BlurOptions): Promise<ProcessingResult> {
  try {
    console.log(`Calling SafeVision for complete blur processing: ${imagePath}`);
    console.log('Blur options:', options);
    
    // Path to the SafeVision directory
    const safevisionPath = path.join(__dirname, '../../SafeVision');
    const mainScript = path.join(safevisionPath, 'main.py');
    
    // Check if SafeVision main script exists
    if (!fs.existsSync(mainScript)) {
      throw new Error(`SafeVision main.py not found at: ${mainScript}`);
    }
    
    // Create output directory for SafeVision
    const outputDir = path.join(safevisionPath, 'output');
    await fs.ensureDir(outputDir);
    
    // Generate output filename
    const outputFileName = `processed_${uuidv4()}.jpg`;
    const outputPath = path.join(outputDir, outputFileName);
    
    // Build SafeVision command with all options
    let pythonCommand = `cd "${safevisionPath}" && source safevision_env/bin/activate && python3 main.py -i "${imagePath}" -o "${outputPath}"`;
    
    // Add blur option
    if (options.applyBlur) {
      pythonCommand += ' -b'; // Enable blur
    }
    
    // Add enhanced blur (if supported by SafeVision)
    if (options.enhancedBlur) {
      pythonCommand += ' --enhanced-blur';
    }
    
    // Add full blur rule
    if (options.fullBlurRule > 0) {
      pythonCommand += ` --full_blur_rule ${options.fullBlurRule}`;
    }
    
    // Add blur intensity
    if (options.blurIntensity !== undefined) {
      pythonCommand += ` --intensity ${options.blurIntensity}`;
    }
    
    // Add blur area
    if (options.blurArea !== undefined) {
      pythonCommand += ` --area ${options.blurArea}`;
    }
    
    // Add face landmarks option
    if (options.useFaceLandmarks !== undefined) {
      pythonCommand += ` --landmarks ${options.useFaceLandmarks}`;
    }
    
    console.log(`Executing SafeVision: ${pythonCommand}`);
    
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(pythonCommand, { timeout: 60000 });
    const processingTime = Date.now() - startTime;
    
    if (stderr) {
      console.error('SafeVision Python error:', stderr);
    }
    
    console.log('SafeVision Python output:', stdout);
    
    // Check if output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('SafeVision did not produce output file');
    }
    
    // Get file sizes
    const originalSize = fs.statSync(imagePath).size;
    const processedSize = fs.statSync(outputPath).size;
    
    console.log(`SafeVision processing completed in ${processingTime}ms`);
    console.log(`Original size: ${originalSize} bytes, Processed size: ${processedSize} bytes`);
    
    return {
      outputPath,
      fileName: outputFileName,
      stats: {
        originalSize,
        processedSize,
        processingTime,
        detections: 0 // SafeVision handles this internally
      }
    };
    
  } catch (error) {
    console.error('SafeVision processing error:', error);
    throw new Error(`SafeVision processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function shouldApplyBlur(label: string): boolean {
  const blurLabels = [
    'FEMALE_GENITALIA_EXPOSED',
    'FEMALE_BREAST_EXPOSED',
    'BUTTOCKS_EXPOSED',
    'ANUS_EXPOSED',
    'MALE_GENITALIA_EXPOSED'
  ];
  return blurLabels.includes(label);
}

export async function processImage(imagePath: string, options: BlurOptions): Promise<ProcessingResult> {
  try {
    console.log(`Starting SafeVision image processing: ${imagePath}`);
    console.log('Options:', options);

    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    // Use SafeVision for complete processing
    const result = await processWithSafeVision(imagePath, options);
    
    // Copy the result to our outputs directory for serving
    const finalOutputPath = path.join(__dirname, '../../outputs', result.fileName);
    await fs.copy(result.outputPath, finalOutputPath);
    
    // Update the result with the final path
    result.outputPath = finalOutputPath;
    
    console.log(`SafeVision processing completed successfully`);
    return result;

  } catch (error) {
    console.error('SafeVision image processing error:', error);
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}