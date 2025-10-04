# SafeVision Web App (Next.js Full-Stack)

A complete Next.js implementation of the SafeVision content moderation system with integrated frontend and backend.

## 🚀 Overview

This is a modern, full-stack Next.js application that replaces the separate React frontend and Express backend with a unified solution. It provides:

- **Frontend**: React components with Tailwind CSS for beautiful UI
- **Backend**: Next.js API routes for image processing
- **Integration**: Direct connection to SafeVision Python API
- **Features**: Real-time image blurring with customizable rules

## 📁 Project Structure

```
web/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── health/     # Health check endpoint
│   │   │   ├── process-image/ # Image processing endpoint
│   │   │   └── image/      # Image serving endpoint
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Home page
│   │   └── globals.css     # Global styles
│   ├── components/         # React components
│   │   ├── ui/            # Reusable UI components
│   │   ├── ImageProcessor.tsx
│   │   └── BlurSettings.tsx
│   ├── lib/               # Utilities and services
│   │   ├── config/        # Configuration files
│   │   ├── services/      # API services
│   │   └── utils.ts       # Utility functions
│   ├── types/             # TypeScript type definitions
│   │   ├── safevision.ts  # SafeVision types
│   │   └── backend.ts     # Backend types
├── uploads/               # Temporary upload directory
├── outputs/              # Processed images directory
├── tailwind.config.js    # Tailwind CSS configuration
├── next.config.js        # Next.js configuration
└── package.json         # Dependencies and scripts
```

## 🛠️ Features

### ✨ User Interface
- **Modern Design**: Clean, responsive UI built with Tailwind CSS
- **Drag & Drop**: Easy image upload with drag and drop support
- **Real-time Processing**: Live image blurring as you adjust settings
- **Preset Rules**: Quick presets for common blur scenarios
- **Advanced Settings**: Detailed control over specific body part detection

### 🔧 Backend API
- **Image Processing**: Direct integration with SafeVision Python API
- **File Management**: Automatic cleanup of uploaded files
- **Error Handling**: Robust error handling and logging
- **Health Checks**: Built-in health monitoring endpoints

### 🎛️ Blur Controls
- **Intensity Control**: Adjust blur strength (0-100%)
- **Area Control**: Control blur coverage area (0-100%)
- **Face Landmarks**: Precise facial feature detection
- **Rule Presets**: Faces Only, Nudity Only, Everything, Nothing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- SafeVision Python environment (parent directory)

### Installation

1. **Navigate to the web directory**
   ```bash
   cd web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Verify SafeVision is available**
   ```bash
   ls ../SafeVision/main.py
   ```

### Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   ```
   http://localhost:3000
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run linting
- `npm run type-check` - TypeScript checking

## 🌐 API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and basic information.

### Image Processing
```
POST /api/process-image
Content-Type: multipart/form-data
```
Processes uploaded images with SafeVision.

### Image Serving
```
GET /api/image/[filename]
```
Serves processed images.

## 🔧 Configuration

### Environment Variables
Create a `.env.local` file:

```env
# SafeVision API Configuration
SAFEVISION_API_URL=http://localhost:5000
SAFEVISION_USE_REMOTE=false

# File Upload Configuration
UPLOAD_PATH=./uploads
OUTPUT_PATH=./outputs

# Processing Configuration
DEFAULT_THRESHOLD=0.25
DEFAULT_BLUR_INTENSITY=50
DEFAULT_BLUR_AREA=100
```

### SafeVision Integration

The app automatically detects SafeVision in the parent directory:
```
../SafeVision/main.py
```

To use a remote SafeVision instance:
```env
SAFEVISION_USE_REMOTE=true
SAFEVISION_API_URL=https://your-safevision-instance.com
```

## 📦 Deployment

### Railway Deployment

Railway will automatically detect this as a Next.js application. Simply:

1. **Connect your repository**
   ```bash
   railway link
   ```

2. **Deploy**
   ```bash
   railway up
   ```

### Vercel Deployment

1. **Connect to Vercel**
   ```bash
   npx vercel
   ```

2. **Set environment variables**
   - Go to Vercel dashboard
   - Add environment variables

### Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔍 Troubleshooting

### Common Issues

1. **SafeVision not found**
   - Ensure SafeVision is in the parent directory
   - Check Python environment activation

2. **Image processing fails**
   - Verify SafeVision API is running
   - Check file permissions for uploads/outputs

3. **Build errors**
   - Run `npm install` to ensure all dependencies
   - Check TypeScript configuration

### Logs and Debugging

- Frontend logs appear in browser console
- Backend logs appear in terminal
- Health check endpoint: `/api/health`

## 🔄 Migration from Separate Frontend/Backend

This Next.js app replaces both:
- `frontend/` (React + Vite) 
- `backend/` (Express + TypeScript)

The old folders can be kept for reference or removed after verification.

## 📈 Performance

- **Server-Side Rendering**: Fast initial page loads
- **API Routes**: Efficient image processing
- **Static Assets**: Optimized image serving
- **Caching**: Built-in caching for processed images

## 🛡️ Security

- **File Upload Validation**: Type and size checking
- **CORS Protection**: Configured for development/production
- **Error Handling**: No sensitive information leak
- **File Cleanup**: Automatic temporary file removal

## 🎨 Customization

### UI Themes
Modify `src/app/globals.css` for custom themes.

### Blur Rules
Edit `src/types/safevision.ts` to add new detection rules.

### API Configuration
Update `src/lib/config/api.ts` for different environments.

## 📞 Support

For issues with:
- **SafeVision ML**: Check SafeVision documentation
- **Next.js**: Check Next.js documentation  
- **Deployment**: Check Railway/Vercel documentation

## 📄 License

Same license as the main PP Self-Hosted project.
