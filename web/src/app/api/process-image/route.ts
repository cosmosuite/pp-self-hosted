import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { processImage } from '@/lib/services/imageProcessor';
import { BlurOptions } from '@/types/backend';
import { API_CONFIG } from '@/lib/config/api';

export async function POST(request: NextRequest) {
  let uploadedFilePath: string | undefined;
  
  try {
    console.log('Received image processing request');
    
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await require('fs-extra').ensureDir(uploadsDir);

    // Save uploaded file
    const uniqueName = `${uuidv4()}-${imageFile.name}`;
    uploadedFilePath = path.join(uploadsDir, uniqueName);
    const bytes = await imageFile.arrayBuffer();
    await writeFile(uploadedFilePath, Buffer.from(bytes));

    console.log(`Uploaded file: ${uploadedFilePath}`);

    const blurOptions: BlurOptions = {
      applyBlur: formData.get('applyBlur') === 'true',
      enhancedBlur: formData.get('enhancedBlur') === 'true',
      solidColor: formData.get('solidColor') === 'true',
      maskColor: formData.get('maskColor') ? 
        JSON.parse(formData.get('maskColor') as string) : [0, 0, 0],
      fullBlurRule: parseInt(formData.get('fullBlurRule') as string) || 0,
      threshold: parseFloat(formData.get('threshold') as string) || API_CONFIG.DEFAULT_THRESHOLD,
      blurIntensity: parseInt(formData.get('blurIntensity') as string) || API_CONFIG.DEFAULT_BLUR_INTENSITY,
      blurArea: parseInt(formData.get('blurArea') as string) || API_CONFIG.DEFAULT_BLUR_AREA,
      useFaceLandmarks: formData.get('useFaceLandmarks') === 'true'
    };

    console.log('Processing options:', blurOptions);

    const result = await processImage(uploadedFilePath, blurOptions);
    
    console.log('Processing completed successfully');

    return NextResponse.json({
      success: true,
      outputPath: result.outputPath,
      fileName: result.fileName,
      originalFileName: imageFile.name,
      stats: result.stats
    });

  } catch (error) {
    console.error('Error processing image:', error);
    
    // Clean up uploaded file on error
    if (uploadedFilePath) {
      try {
        await unlink(uploadedFilePath);
        console.log('Cleaned up uploaded file after error');

      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Failed to process image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    // Clean up uploaded file on success
    if (uploadedFilePath) {
      try {
        await unlink(uploadedFilePath);
        console.log('Cleaned up uploaded file');
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
  }
}
