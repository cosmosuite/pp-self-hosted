# PP Self-Hosted - SafeVision Content Filter

A complete web application that integrates SafeVision AI-powered content detection with a React frontend and Express.js backend for real-time image blur processing.

## 🚀 Features

- **Real AI Detection**: Uses SafeVision's ONNX models for accurate content detection
- **Complete Blur Processing**: Full integration with SafeVision's blur algorithms
- **High-Resolution Output**: Preserves original image quality and resolution
- **Clean Blur Results**: No detection boxes or visual indicators
- **Modern UI**: React frontend with shadcn/ui components
- **Real-time Processing**: Upload images and get processed results instantly
- **Configurable Options**: Adjust threshold, blur strength, and processing rules
- **TypeScript**: Full type safety across frontend and backend

## 🏗️ Architecture

```
pp-self-hosted/
├── frontend/          # React + TypeScript + shadcn/ui
├── backend/           # Express.js + TypeScript
├── SafeVision/        # Python AI models and processing
└── outputs/           # Processed images
```

## 📋 Prerequisites

- **Node.js** 18+ 
- **Python** 3.7+
- **npm** or **yarn**

## 🛠️ Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd pp-self-hosted
   npm run install:all
   ```

2. **Setup SafeVision Python environment:**
   ```bash
   npm run setup
   ```

3. **Test the integration:**
   ```bash
   npm run test:safevision
   ```

## 🚀 Quick Start

1. **Start the development servers:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

3. **Upload an image and configure blur options:**
   - Select an image file
   - Adjust detection threshold (0.0 - 1.0)
   - Choose blur options (enhanced blur, solid color, etc.)
   - Click "Process Image"

## 🎛️ Configuration Options

### Frontend Controls
- **Apply Blur**: Enable/disable blur processing
- **Enhanced Blur**: Use stronger blur effect
- **Solid Color**: Replace detected regions with solid color
- **Mask Color**: RGB values for solid color replacement
- **Full Blur Rule**: Number of detections to trigger full image blur
- **Threshold**: Detection confidence threshold (0.0 - 1.0)

### Backend Processing
The backend automatically:
- Calls SafeVision Python script with your options
- Processes images using ONNX AI models
- Applies blur or solid color masks to detected regions
- Returns processed images for download

## 🔧 How It Works

1. **Upload**: User uploads image via React frontend
2. **Options**: User configures blur parameters
3. **Processing**: Backend calls SafeVision Python script:
   ```bash
   python3 main.py -i input.jpg -o output.jpg -b
   ```
4. **AI Detection**: SafeVision uses ONNX models to detect content
5. **Blur Application**: OpenCV applies blur to detected regions
6. **Result**: High-resolution processed image returned to frontend

## 📁 File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ImageProcessor.tsx    # Main upload/processing component
│   │   └── ui/                   # shadcn/ui components
│   ├── App.tsx                   # Main app component
│   └── main.tsx                  # React entry point

backend/
├── src/
│   ├── services/
│   │   └── imageProcessor.ts     # SafeVision integration
│   ├── scripts/
│   │   └── setup-safevision.js   # Python environment setup
│   └── index.ts                  # Express server

SafeVision/
├── main.py                       # Core processing script (modified)
├── safevision_api.py            # Flask API (optional)
├── Models/
│   └── best.onnx                # AI detection model
└── output/                      # SafeVision outputs
```

## ✨ Key Improvements

- **High-Resolution Output**: Images maintain original quality
- **Clean Blur Results**: No green detection boxes or text labels
- **Preserved Original Code**: All modifications are commented, not removed
- **Better File Sizes**: Output files are larger, indicating higher quality

## 🐛 Troubleshooting

### Common Issues

1. **Python not found:**
   ```bash
   # Install Python 3.7+
   brew install python  # macOS
   # or download from python.org
   ```

2. **SafeVision dependencies missing:**
   ```bash
   cd SafeVision
   source venv/bin/activate
   pip install opencv-python onnxruntime numpy Pillow onnx
   ```

3. **Model download fails:**
   - Check internet connection
   - Manually download `best.onnx` to `SafeVision/Models/`

4. **Processing fails:**
   ```bash
   # Check backend logs
   cd backend && npm run dev
   # Look for SafeVision error messages
   ```

### Debug Commands

```bash
# Test SafeVision directly
cd SafeVision
source venv/bin/activate
python3 main.py -i input/1.jpg -o test_output.jpg -b

# Test backend integration
npm run test:safevision

# Check Python packages
python3 -c "import onnxruntime, cv2, numpy, PIL"
```

## 🔄 Development

### Frontend Development
```bash
cd frontend
npm run dev
```

### Backend Development
```bash
cd backend
npm run dev
```

### Full Stack Development
```bash
npm run dev  # Runs both frontend and backend
```

## 📦 Production Build

```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm run test:safevision`
5. Submit a pull request

## 📄 License

This project integrates with SafeVision. Please check SafeVision's license for AI model usage terms.

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `npm run test:safevision` to verify setup
3. Check backend logs for SafeVision errors
4. Ensure Python dependencies are installed

---

**Note**: This application requires SafeVision's AI models to function. The first run will download the required ONNX model automatically.
