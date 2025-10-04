// API Configuration
export const API_CONFIG = {
  // Remote SafeVision GPU API (default)
  SAFEVISION_API_URL: process.env.NEXT_PUBLIC_SAFEVISION_API_URL || 'https://a2g50oun4fr6h4-5001.proxy.runpod.net',
  
  // Fallback for development
  SAFEVISION_API_URL_DEV: process.env.NEXT_PUBLIC_SAFEVISION_API_URL_DEV || 'http://localhost:5001/api/v1',
  
  // Environment
  DEPLOYMENT_ENV: process.env.NEXT_PUBLIC_DEPLOYMENT_ENV || 'production',
  
  // API Timeout settings
  TIMEOUT: 60000, // 60 seconds for processing
  HEALTH_CHECK_TIMEOUT: 10000, // 10 seconds for health checks
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // File upload limits
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  
  // Supported image formats
  SUPPORTED_FORMATS: /jpeg|jpg|png|gif|bmp|tiff/,
  
  // Processing options
  DEFAULT_THRESHOLD: 0.25,
  DEFAULT_BLUR_INTENSITY: 50,
  DEFAULT_BLUR_AREA: 100,
};

// Environment-specific configurations
export const ENV_CONFIG = {
  development: {
    safevision_api_url: 'http://localhost:5000',
    upload_path: './uploads',
    output_path: './outputs',
  },
  production: {
    safevision_api_url: 'https://a2g50oun4fr6h4-5001.proxy.runpod.net/api/v1',
    upload_path: './uploads',
    output_path: './outputs',
  },
};

// Get current environment config
export function getEnvConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env as keyof typeof ENV_CONFIG];
}
