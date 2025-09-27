# Face Landmark Detection Guide

## Overview

SafeVision now includes advanced face landmark detection that provides more accurate face blurring by using 68-point facial landmarks instead of simple rectangular bounding boxes. This ensures complete face coverage including the forehead area.

## Features

- **68-Point Facial Landmarks**: Uses dlib's shape predictor for precise face detection
- **Forehead Coverage**: Automatically includes forehead area in face blurring
- **Better Face Contours**: Elliptical blur patterns that follow natural face shapes
- **Fallback Support**: Falls back to rectangular blur if landmarks fail
- **Toggle Control**: Can be enabled/disabled per request

## Installation

### Quick Setup

```bash
# Run the setup script from project root
./scripts/setup-face-landmarks.sh
```

### Manual Setup

```bash
# Install dependencies
cd SafeVision
pip install -r requirements.txt

# Download and setup face landmark model
python setup_landmarks.py
```

### Dependencies

- `dlib>=19.24.0` - Face landmark detection library
- `opencv-python>=4.5.5` - Image processing
- `numpy>=1.22.0` - Numerical operations

## Usage

### API Usage

#### Enable Face Landmarks (Default)

```bash
curl -X POST http://localhost:5001/api/v1/detect \
  -F "file=@image.jpg" \
  -F "blur=true" \
  -F "use_face_landmarks=true" \
  -F "blur_face_female=true" \
  -F "blur_face_male=true"
```

#### Disable Face Landmarks

```bash
curl -X POST http://localhost:5001/api/v1/detect \
  -F "file=@image.jpg" \
  -F "blur=true" \
  -F "use_face_landmarks=false" \
  -F "blur_face_female=true"
```

### Frontend Usage

The face landmark toggle is available in the BlurSettings component:

```typescript
const blurRules: BlurRules = {
  FACE_FEMALE: true,
  FACE_MALE: true,
  useFaceLandmarks: true, // Enable landmark detection
  // ... other rules
};
```

### Backend Usage

```typescript
const options: BlurOptions = {
  applyBlur: true,
  blurIntensity: 50,
  blurArea: 100,
  useFaceLandmarks: true, // Enable landmark detection
  // ... other options
};
```

## How It Works

### 1. Face Detection
- Uses existing YOLO model to detect face regions
- Identifies `FACE_FEMALE` and `FACE_MALE` detections

### 2. Landmark Detection
- For each face detection, extracts 68 facial landmarks
- Landmarks include: jawline, eyebrows, eyes, nose, mouth

### 3. Face Mask Creation
- Creates a mask covering the entire face including forehead
- Uses jawline points + forehead approximation
- Generates elliptical shape that follows face contours

### 4. Blur Application
- Applies Gaussian blur only within the face mask
- Uses the same intensity settings as rectangular blur
- Provides seamless integration with existing blur controls

## Configuration

### API Configuration

```python
API_CONFIG = {
    'FACE_LANDMARKS_ENABLED': True,        # Enable landmark detection
    'FACE_LANDMARKS_FALLBACK': True,       # Fallback to rectangular if landmarks fail
    'FACE_LANDMARKS_EXPANSION': 1.2,       # Forehead expansion factor
}
```

### Model Path

The face landmark model is located at:
```
SafeVision/Models/shape_predictor_68_face_landmarks.dat
```

## Performance

### Processing Time
- **With Landmarks**: ~50-100ms additional processing per face
- **Without Landmarks**: Standard rectangular blur timing
- **Fallback**: Minimal overhead when landmarks fail

### Memory Usage
- **Model Size**: ~68MB for shape predictor model
- **Runtime Memory**: ~10-20MB additional per detection

## Troubleshooting

### Common Issues

#### 1. Model Not Found
```
⚠️ Face landmark model not found at: Models/shape_predictor_68_face_landmarks.dat
```
**Solution**: Run `python setup_landmarks.py` to download the model

#### 2. dlib Installation Failed
```
❌ Error: dlib is not installed
```
**Solution**: 
```bash
pip install dlib
# Or on some systems:
pip install cmake
pip install dlib
```

#### 3. Landmarks Not Working
```
❌ Face landmark detector is not available
```
**Solution**: Check that the model file exists and is valid (>1MB)

### Debug Mode

Enable debug logging to see landmark detection in action:

```python
# In safevision_api.py, the API will log:
print(f"🎭 Face detection detected: {label}, using landmark-based blur")
print(f"✅ Applied landmark-based blur to face")
```

## API Response

The API response includes information about landmark usage:

```json
{
  "status": "success",
  "detections": [...],
  "processing_info": {
    "landmarks_used": true,
    "blur_applied": true,
    "blur_intensity": 50,
    "blur_area": 100
  }
}
```

## Comparison

### Rectangular Blur (Old)
- ❌ Misses forehead area
- ❌ Rectangular shape doesn't match face
- ❌ Inconsistent coverage

### Landmark Blur (New)
- ✅ Includes entire face including forehead
- ✅ Follows natural face contours
- ✅ Consistent, accurate coverage
- ✅ Better side angle handling

## Future Enhancements

- **Multiple Face Support**: Enhanced handling of multiple faces
- **Profile Face Detection**: Better side angle face coverage
- **Custom Landmark Models**: Support for different landmark models
- **Real-time Optimization**: GPU acceleration for landmark detection

## Support

For issues or questions about face landmark detection:

1. Check the troubleshooting section above
2. Verify all dependencies are installed correctly
3. Test with the setup script: `python setup_landmarks.py`
4. Check API logs for detailed error messages
