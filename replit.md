# Overview

SafeVision is a comprehensive AI-powered content moderation system that detects and censors nudity and sensitive content in images, videos, and live streams. The project consists of two main components:

1. **SafeVision Core** - A Python-based ONNX deep learning system providing multi-modal content detection (images, videos, camera feeds, screen capture) with CLI, GUI, and REST API interfaces
2. **Peep Peep Self-Hosted** - A modern web application with React/TypeScript frontend and Flask backend that provides a user-friendly interface for the SafeVision detection service

The system uses ONNX Runtime for high-performance inference with 18+ detection categories including face detection, body part detection, and content safety classification. It supports real-time processing, batch operations, custom blur rules, and multiple visualization options.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Detection Engine (SafeVision)

**AI Model Architecture**
- ONNX-optimized deep learning models for cross-platform inference
- 18 detection categories covering faces, body parts, and exposure levels
- Configurable detection thresholds (0.1-0.9 confidence scores)
- Multiple image processing sizes (224-640 pixels) for speed/accuracy trade-off

**Face Detection Systems** (Multi-layered approach)
- **Primary**: dlib 68-point facial landmarks for precise face contouring
- **Alternative**: MediaPipe 468-point landmarks for full face coverage including forehead/temples
- **Fallback**: OpenCV DNN and Haar cascade classifiers
- Rationale: Multiple detection methods ensure robustness across different face angles, lighting conditions, and image qualities

**Processing Modes**
- Image processing (main.py) - Single/batch image analysis
- Video processing (video.py) - Frame-by-frame video analysis with FFmpeg integration
- Live camera (live.py) - Real-time webcam detection
- Live streaming (live_streamer.py) - OBS integration with virtual camera output and screen capture

**Censoring Options**
- Gaussian blur (configurable strength: normal/high/full)
- Solid color masking
- Pixelation effects
- Face-aware elliptical blur using landmarks

## Web Application (Peep Peep)

**Frontend Architecture**
- React 18 with TypeScript for type safety
- Vite for fast development and optimized production builds
- Component-based architecture: UploadArea, Controls, Canvas, Queue
- Real-time preview and result visualization
- Axios for API communication with request queuing

**Backend Architecture**
- Flask REST API server with CORS support
- Blueprint-based routing for modular endpoints
- Service layer pattern with RunPodClient abstraction
- File upload handling with secure filename validation
- Maximum 50MB file size limit

**API Integration Pattern**
- Backend acts as proxy/adapter to SafeVision API
- Supports both local SafeVision instances and hosted RunPod deployments
- Environment-configurable endpoint URLs
- Health check and label discovery endpoints

## Data Flow

1. User uploads image via React frontend (drag-drop or file picker)
2. File sent to Flask backend via FormData multipart request
3. Backend forwards to SafeVision API with blur rules and settings
4. SafeVision processes with ONNX model, applies censoring
5. Results returned with detection metadata and censored image URL
6. Frontend displays original/censored comparison with risk analysis

## Configuration System

**Detection Rules**
- Customizable per-category blur rules (face, genitalia, breasts, etc.)
- Risk level classification: Safe, Low, Moderate, High, Critical
- Threshold-based filtering with confidence scores
- Rule persistence in JSON format

**Visual Effects Configuration**
- Blur strength parameters (kernel size, sigma)
- Color schemes for detection boxes (BGR format)
- Font scaling and text positioning
- Toggle between blur modes and solid colors

## Cross-Platform Support

**Operating Systems**: Windows, Linux, macOS
**Python Version**: 3.8+
**GUI Framework**: PyQt5 for desktop applications
**Video Processing**: FFmpeg for encoding/decoding

# External Dependencies

## Python ML/CV Stack
- **onnxruntime**: ONNX model inference engine
- **opencv-python**: Image/video processing, camera capture
- **numpy**: Numerical operations and array manipulation
- **pillow**: Image file I/O and manipulation
- **dlib**: Face landmark detection (68-point model)
- **mediapipe**: Alternative face mesh detection (468 landmarks)

## Web Framework Stack
- **flask**: REST API server framework
- **flask-cors**: Cross-origin resource sharing
- **werkzeug**: WSGI utilities and secure filename handling

## Frontend Stack
- **react/react-dom**: UI framework
- **typescript**: Type-safe JavaScript
- **axios**: HTTP client for API requests
- **lucide-react**: Icon components
- **vite**: Build tool and dev server

## Video/Streaming
- **ffmpeg-python**: Python bindings for FFmpeg
- **mss**: Screen capture library
- **pyvirtualcam**: Virtual camera output for streaming
- **obsws-python**: OBS WebSocket integration (optional)

## Development Tools
- **tqdm**: Progress bars for CLI
- **concurrently**: Run multiple npm scripts simultaneously

## Model Files (Downloaded separately)
- shape_predictor_68_face_landmarks.dat (dlib model)
- opencv_face_detector_uint8.pb (OpenCV DNN model)
- opencv_face_detector.pbtxt (OpenCV config)
- ONNX nudity detection model (custom trained)

## Service Integrations
- **RunPod**: Optional hosted GPU inference endpoint
- **OBS Studio**: Streaming software integration via WebSocket
- Local or remote SafeVision API instances