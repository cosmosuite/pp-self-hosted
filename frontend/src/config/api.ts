// Environment variables are defined in vite-env.d.ts

// API Configuration
export const API_CONFIG = {
  // Remote SafeVision GPU API
  SAFEVISION_API_URL: (import.meta?.env?.VITE_SAFEVISION_API_URL as string) || 'https://a2g50oun4fr6h4-5001.proxy.runpod.net/api/v1',
  
  // Fallback for development
  SAFEVISION_API_URL_DEV: (import.meta?.env?.VITE_SAFEVISION_API_URL_DEV as string) || 'http://localhost:5001/api/v1',
  
  // Environment
  DEPLOYMENT_ENV: (import.meta?.env?.VITE_DEPLOYMENT_ENV as string) || 'production',
  
  // API Timeout settings
  TIMEOUT: 30000, // 30 seconds for processing
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// CORS settings
export const CORS_CONFIG = {
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://your-production-domain.com', // Update with your actual domain
  ],
};
