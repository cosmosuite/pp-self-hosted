# Cloudflare Images Integration Setup

This document explains how to set up Cloudflare Images integration for storing processed images.

## Prerequisites

1. A Cloudflare account
2. Cloudflare Images enabled on your account
3. API token with Images permissions

## Configuration

### 1. Get Cloudflare Credentials

1. **Account ID**: Found in your Cloudflare dashboard sidebar
2. **API Token**: Create a custom token with the following permissions:
   - `Cloudflare Images:Edit`
   - `Account:Read`
3. **Account Hash**: Found in the Cloudflare Images dashboard URL or API response

### 2. Environment Variables

Add these environment variables to your deployment:

```bash
# Cloudflare Images Configuration
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_HASH=your_account_hash_here

# Optional: Enable/disable Cloudflare integration
ENABLE_CLOUDFLARE=true
```

### 3. Local Development

For local development, create a `.env` file in the backend directory:

```bash
# backend/.env
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here
CLOUDFLARE_ACCOUNT_HASH=your_account_hash_here
ENABLE_CLOUDFLARE=true
```

## How It Works

### Image Processing Flow

1. **Upload**: User uploads image to `/api/process-image`
2. **Processing**: SafeVision processes the image locally
3. **Cloudflare Upload**: Processed image is uploaded to Cloudflare Images
4. **Response**: API returns Cloudflare URLs instead of local paths
5. **Cleanup**: Local processed files are removed (if Cloudflare upload succeeds)

### Fallback Behavior

- If Cloudflare is not configured or upload fails, images are stored locally
- The API response includes both Cloudflare URLs and local paths
- Frontend can prioritize Cloudflare URLs when available

### API Response Format

```json
{
  "success": true,
  "imageUrl": "https://imagedelivery.net/account_hash/image_id/public",
  "thumbnailUrl": "https://imagedelivery.net/account_hash/image_id/thumbnail",
  "cloudflareImageId": "image_id",
  "isCloudflare": true,
  "outputPath": "/local/fallback/path",
  "fileName": "processed_image.jpg",
  "stats": { ... }
}
```

## Benefits

- **Global CDN**: Images served from Cloudflare's global network
- **Automatic Optimization**: Cloudflare optimizes images for different devices
- **Cost Effective**: Pay only for storage and bandwidth used
- **Scalable**: No local storage management required
- **Fast**: Images cached globally for quick access

## Troubleshooting

### Common Issues

1. **Upload Fails**: Check API token permissions and account ID
2. **Images Not Loading**: Verify account hash is correct
3. **Local Fallback**: Check if Cloudflare service is properly initialized

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` to see detailed Cloudflare upload logs.

## Security Considerations

- Keep API tokens secure and rotate them regularly
- Use environment variables, never commit credentials to code
- Consider using signed URLs for sensitive images
- Monitor API usage and costs

## Cost Optimization

- Images are automatically optimized by Cloudflare
- Consider setting up image variants for different use cases
- Monitor storage usage and implement cleanup policies if needed
