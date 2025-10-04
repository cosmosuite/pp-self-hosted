import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';

interface RouteParams {
  params: Promise<{
    filename: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { filename } = await params;
    const outputsDir = path.join(process.cwd(), 'outputs');
    const filePath = path.join(outputsDir, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Read file and serve it
    const fileBuffer = await fs.readFile(filePath);
    const contentType = getContentType(filename);
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
  } catch (error) {
    console.error('Error serving image:', error);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}

function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.tiff': 'image/tiff',
  };
  
  return contentTypes[ext] || 'application/octet-stream';
}
