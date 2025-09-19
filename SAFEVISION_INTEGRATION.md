# SafeVision Frontend Integration

This document describes the implementation of dynamic blur rules in the SafeVision frontend, allowing users to configure what content should be blurred in real-time.

## 🎯 Features Implemented

### 1. Enhanced API (`safevision_api_enhanced.py`)
- **Dynamic Blur Rules**: Accepts custom blur rules as JSON parameters
- **Real-time Configuration**: Users can change settings without restarting
- **Flexible Processing**: Supports both file upload and base64 image processing
- **Rule Application**: Applies custom rules to detection results

### 2. Frontend Components

#### TypeScript Types (`types/safevision.ts`)
- `BlurRules`: Interface for all blur rule configurations
- `SafeVisionResponse`: API response structure
- `Detection`: Individual detection result
- `DEFAULT_BLUR_RULES`: Default configuration
- `BLUR_RULE_LABELS`: Human-readable labels

#### API Service (`services/safevisionApi.ts`)
- `SafeVisionAPI`: Class for API communication
- `processImage()`: Upload and process images with custom rules
- `processImageBase64()`: Process base64 encoded images
- `getHealth()`, `getLabels()`, `getStats()`: Utility endpoints

#### BlurSettings Component (`components/BlurSettings.tsx`)
- **Interactive Switches**: Toggle individual blur rules
- **Quick Presets**: Buttons for common configurations
- **Organized Sections**: Face detection, exposed content, covered content
- **Real-time Updates**: Changes apply immediately

#### ImageProcessor Component (`components/ImageProcessor.tsx`)
- **Drag & Drop Upload**: Easy image upload interface
- **Threshold Control**: Adjustable detection sensitivity
- **Results Display**: Shows detection results and risk levels
- **Censored Preview**: Displays processed images
- **Settings Toggle**: Show/hide blur settings

## 🚀 How to Use

### 1. Start the Enhanced API
```bash
cd SafeVision
source safevision_env/bin/activate
python safevision_api_enhanced.py
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:5173
- API: http://localhost:5001

## 🎛️ Configuration Options

### Quick Presets
- **Faces Only**: Blur only faces, ignore nudity
- **Nudity Only**: Blur only exposed content, ignore faces
- **Everything**: Blur all detected content
- **Nothing**: Show detections but don't blur anything

### Individual Controls
- **Face Detection**: Female faces, Male faces
- **Exposed Content**: All exposed body parts
- **Covered Content**: All covered body parts

### Detection Settings
- **Threshold**: 0.1 (very sensitive) to 0.9 (very strict)
- **Blur Mode**: Enable/disable blurring
- **Real-time Processing**: Immediate results

## 📡 API Endpoints

### POST `/api/v1/detect`
Process image with custom blur rules.

**Parameters:**
- `image`: Image file (multipart/form-data)
- `threshold`: Detection threshold (0.1-0.9)
- `blur`: Enable blurring (true/false)
- `blur_rules`: JSON object with blur rule settings

**Example Request:**
```bash
curl -X POST http://localhost:5001/api/v1/detect \
  -F "image=@test.jpg" \
  -F "threshold=0.25" \
  -F "blur=true" \
  -F 'blur_rules={"FACE_FEMALE": true, "FEMALE_BREAST_EXPOSED": false}'
```

### POST `/api/v1/detect/base64`
Process base64 encoded image.

**Example Request:**
```json
{
  "image": "base64_encoded_image_data",
  "threshold": 0.25,
  "blur": true,
  "blur_rules": {
    "FACE_FEMALE": true,
    "FEMALE_BREAST_EXPOSED": false
  }
}
```

### GET `/api/v1/labels`
Get available detection labels.

### GET `/api/v1/health`
Get API health status.

## 🎨 Frontend Features

### User Interface
- **Modern Design**: Clean, responsive interface
- **Drag & Drop**: Easy image upload
- **Real-time Feedback**: Immediate processing results
- **Settings Panel**: Collapsible configuration options
- **Risk Indicators**: Color-coded risk levels

### Configuration Management
- **Preset Buttons**: Quick configuration options
- **Individual Toggles**: Granular control over each label
- **Threshold Slider**: Adjustable detection sensitivity
- **Visual Feedback**: Clear indication of what will be blurred

## 🔧 Technical Implementation

### Backend Changes
1. **Enhanced API**: Added blur rules parameter support
2. **Rule Processing**: Custom rule application logic
3. **Flexible Censoring**: Dynamic blur application
4. **Error Handling**: Robust error management

### Frontend Changes
1. **TypeScript Types**: Strong typing for all interfaces
2. **React Components**: Modular, reusable components
3. **State Management**: Efficient state handling
4. **API Integration**: Seamless backend communication

## 📝 Example Usage Scenarios

### Scenario 1: Privacy Protection
- **Use Case**: Protect faces in family photos
- **Configuration**: Faces Only preset
- **Result**: Only faces are blurred, nudity is ignored

### Scenario 2: Content Moderation
- **Use Case**: Moderate social media content
- **Configuration**: Nudity Only preset
- **Result**: Only exposed content is blurred, faces are preserved

### Scenario 3: Custom Filtering
- **Use Case**: Specific content requirements
- **Configuration**: Individual toggles
- **Result**: Custom combination of blurred content

## 🚀 Future Enhancements

1. **Rule Persistence**: Save user preferences
2. **Batch Processing**: Process multiple images
3. **Video Support**: Real-time video processing
4. **Advanced Filters**: More granular control options
5. **User Profiles**: Multiple configuration profiles

## 🐛 Troubleshooting

### Common Issues
1. **API Not Responding**: Check if SafeVision API is running
2. **CORS Errors**: Ensure API allows frontend origin
3. **Image Upload Fails**: Check file size and format
4. **Blur Rules Not Applied**: Verify JSON format

### Debug Steps
1. Check API health: `curl http://localhost:5001/api/v1/health`
2. Check frontend console for errors
3. Verify image file format and size
4. Test with different blur rule configurations

## 📊 Performance Considerations

- **Image Size**: Larger images take longer to process
- **Threshold**: Lower thresholds increase processing time
- **Blur Rules**: Complex rules may slow down processing
- **Concurrent Requests**: API handles multiple requests efficiently

This implementation provides a complete solution for dynamic content moderation with user-configurable blur rules, making SafeVision highly flexible and user-friendly.
