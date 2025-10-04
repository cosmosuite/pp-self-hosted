import { NextResponse } from 'next/server';

export async function GET() {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  };
  
  return NextResponse.json(healthCheck, { status: 200 });
}
