# PP Self Hosted Backend

Express.js backend API for the SafeVision content filtering application.

## Features

- Image upload and processing
- Content detection and blurring
- Configurable blur options
- File management and cleanup
- RESTful API endpoints

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Image Processing
- `POST /api/process-image` - Process uploaded image with blur options
- `GET /api/download/:filename` - Download processed image
- `GET /api/outputs` - List all processed images

## Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3001)

## File Structure

```
src/
├── index.ts              # Main server file
├── types.ts              # TypeScript type definitions
└── services/
    └── imageProcessor.ts  # Image processing logic
```

## Image Processing Options

- **Apply Blur**: Enable/disable content blurring
- **Enhanced Blur**: Use stronger blur effect
- **Solid Color**: Replace detected content with solid color
- **Mask Color**: RGB values for solid color mask
- **Detection Threshold**: Confidence threshold for content detection
- **Full Blur Rule**: Number of detections to trigger full image blur

## Dependencies

- **Express**: Web framework
- **Multer**: File upload handling
- **Sharp**: Image processing
- **CORS**: Cross-origin resource sharing
- **Helmet**: Security middleware
- **UUID**: Unique identifier generation
