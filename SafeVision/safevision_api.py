#!/usr/bin/env python3
"""
SafeVision API Server
RESTful API endpoint for nudity detection using ONNX model.
Provides HTTP endpoints for image and video content analysis.
"""

import os
import sys
import json
import time
import uuid
import base64
import threading
import mimetypes
from datetime import datetime
from pathlib import Path
from io import BytesIO
import traceback

# Web framework imports
try:
    from flask import Flask, request, jsonify, send_file
    from flask_cors import CORS
    FLASK_AVAILABLE = True
except ImportError:
    print("Flask not available. Install with: pip install flask flask-cors")
    FLASK_AVAILABLE = False

try:
    from werkzeug.utils import secure_filename
    WERKZEUG_AVAILABLE = True
except ImportError:
    print("Werkzeug not available. Install with: pip install werkzeug")
    WERKZEUG_AVAILABLE = False

# Image processing imports
try:
    import cv2
    import numpy as np
    OPENCV_AVAILABLE = True
except ImportError:
    print("OpenCV not available. Install with: pip install opencv-python")
    OPENCV_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    print("PIL not available. Install with: pip install pillow")
    PIL_AVAILABLE = False

# ONNX Runtime imports with error handling
try:
    import onnxruntime
    import onnx
    from onnx import version_converter
    ONNX_AVAILABLE = True
except ImportError as e:
    print(f"ONNX Runtime not available: {e}")
    print("Install with: pip install onnxruntime onnx")
    ONNX_AVAILABLE = False

# Import the main detector if available
try:
    from main import NudeDetector, __labels
    DETECTOR_AVAILABLE = True
except ImportError:
    print("Main detector not available")
    DETECTOR_AVAILABLE = False

# Import face landmark detector
try:
    from face_landmarks import FaceLandmarkDetector
    LANDMARK_AVAILABLE = True
except ImportError as e:
    print(f"Face landmark detector not available: {e}")
    print("Install with: pip install dlib")
    LANDMARK_AVAILABLE = False

# OpenCV DNN face detection (preferred)
try:
    from opencv_face_detector import OpenCVFaceDetector
    OPENCV_FACE_AVAILABLE = True
    print("✅ OpenCV face detector available")
except ImportError as e:
    print(f"OpenCV face detector not available: {e}")
    OPENCV_FACE_AVAILABLE = False

# API Configuration
API_CONFIG = {
    'HOST': '0.0.0.0',
    'PORT': 5001,
    'DEBUG': False,
    'MAX_CONTENT_LENGTH': 50 * 1024 * 1024,  # 50MB max upload
    'UPLOAD_FOLDER': 'api_uploads',
    'OUTPUT_FOLDER': 'api_outputs',
    'TEMP_FOLDER': 'api_temp',
    'DEFAULT_THRESHOLD': 0.25,
    'DEFAULT_BLUR_INTENSITY': 50,
    'DEFAULT_BLUR_AREA': 100,
    'FACE_LANDMARKS_ENABLED': True,
    'FACE_LANDMARKS_FALLBACK': True,
    'FACE_LANDMARKS_EXPANSION': 1.2,
}

# Content labels with API response formatting
CONTENT_LABELS = [
    "FEMALE_GENITALIA_COVERED",
    "FACE_FEMALE",
    "BUTTOCKS_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_BREAST_EXPOSED",
    "ANUS_EXPOSED",
    "FEET_EXPOSED",
    "BELLY_COVERED",
    "FEET_COVERED",
    "ARMPITS_COVERED",
    "ARMPITS_EXPOSED",
    "FACE_MALE",
    "BELLY_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "ANUS_COVERED",
    "FEMALE_BREAST_COVERED",
    "BUTTOCKS_COVERED",
]

# Risk levels for API responses
RISK_LEVELS = {
    'SAFE': ['FACE_FEMALE', 'FACE_MALE', 'FEMALE_GENITALIA_COVERED', 'BELLY_COVERED', 
             'FEET_COVERED', 'ARMPITS_COVERED', 'ANUS_COVERED', 'FEMALE_BREAST_COVERED', 
             'BUTTOCKS_COVERED'],
    'LOW': ['MALE_BREAST_EXPOSED', 'BELLY_EXPOSED', 'ARMPITS_EXPOSED', 'FEET_EXPOSED'],
    'MODERATE': ['BUTTOCKS_EXPOSED'],
    'HIGH': ['FEMALE_BREAST_EXPOSED', 'ANUS_EXPOSED'],
    'CRITICAL': ['FEMALE_GENITALIA_EXPOSED', 'MALE_GENITALIA_EXPOSED']
}

def get_risk_level(label):
    """Get risk level for a given label."""
    for risk, labels in RISK_LEVELS.items():
        if label in labels:
            return risk
    return 'SAFE'

class SafeVisionAPI:
    """Main API class for SafeVision nudity detection."""
    
    def __init__(self, providers=None):
        self.model_loaded = False
        self.detector = None
        self.landmark_detector = None
        
        # Initialize main detector
        if DETECTOR_AVAILABLE:
            try:
                self.detector = NudeDetector(providers)
                self.model_loaded = True
                print("✅ SafeVision detector initialized successfully")
            except Exception as e:
                print(f"❌ Error initializing detector: {e}")
                self.model_loaded = False
        
        # Initialize face detector (prefer OpenCV DNN)
        if OPENCV_FACE_AVAILABLE:
            try:
                print("🔍 DEBUG: Initializing OpenCV face detector...")
                self.landmark_detector = OpenCVFaceDetector()
                print("✅ OpenCV face detector initialized successfully")
            except Exception as e:
                print(f"❌ Error initializing OpenCV detector: {e}")
                import traceback
                traceback.print_exc()
                self.landmark_detector = None
        elif LANDMARK_AVAILABLE:
            try:
                print("🔍 DEBUG: Initializing dlib face landmark detector...")
                self.landmark_detector = FaceLandmarkDetector()
                print(f"🔍 DEBUG: Landmark detector created, checking availability...")
                if self.landmark_detector.is_available():
                    print("✅ Face landmark detector initialized successfully")
                else:
                    print("⚠️ Face landmark detector not available (model missing)")
                    print("🔍 DEBUG: Model path:", self.landmark_detector.model_path)
                    print("🔍 DEBUG: Initialized:", self.landmark_detector.initialized)
            except Exception as e:
                print(f"❌ Error initializing landmark detector: {e}")
                import traceback
                traceback.print_exc()
                self.landmark_detector = None
        else:
            print("⚠️ No face detector available")
    
    def generate_session_id(self):
        """Generate a unique session ID."""
        return str(uuid.uuid4())
    
    def create_censored_image(self, input_path, output_path, detections, blur_intensity=50, blur_area=100, use_landmarks=True):
        """Create censored image with blur applied to detected regions."""
        try:
            print(f"🎭 Creating censored image: {input_path} -> {output_path}")
            print(f"🎭 Blur intensity: {blur_intensity}%, area: {blur_area}%, landmarks: {use_landmarks}")
            
            # Load the image
            image = cv2.imread(input_path)
            if image is None:
                print(f"❌ Could not load image: {input_path}")
                return False
            
            print(f"🔍 Image loaded: {image.shape}")
            
            # Apply blur to detected areas
            for i, detection in enumerate(detections):
                print(f"🔍 Processing detection {i}: {detection}")
                if 'box' in detection:
                    x, y, w, h = detection['box']
                    x, y, w, h = int(x), int(y), int(w), int(h)
                    label = detection.get('class', '')
                    
                    print(f"🔍 Original box: x={x}, y={y}, w={w}, h={h}, label: {label}")
                    
                    # Special handling for face detections with landmarks
                    if (label in ["FACE_FEMALE", "FACE_MALE"] and 
                        use_landmarks and 
                        self.landmark_detector and 
                        self.landmark_detector.is_available()):
                        
                        print(f"🎭 Face detection detected: {label}, using landmark-based blur")
                        print(f"🎭 Landmark detector available: {self.landmark_detector.is_available()}")
                        
                        # Expand face bounding box to include forehead area
                        # Face detection often only covers from eyes down, so we need to extend upward
                        expanded_y = max(0, int(y - h * 0.3))  # Extend 30% of height upward
                        expanded_h = int(h * 1.3)  # Increase height by 30%
                        
                        print(f"🎭 Expanded face box: original y={y}, h={h} -> expanded y={expanded_y}, h={expanded_h}")
                        
                        # Get face detection and create mask
                        if hasattr(self.landmark_detector, 'get_face_landmarks'):
                            # dlib method
                            landmarks = self.landmark_detector.get_face_landmarks(image, (x, expanded_y, w, expanded_h))
                            if landmarks is not None:
                                print(f"🎭 Face landmarks detected: {len(landmarks)} points")
                                image = self.landmark_detector.apply_landmark_blur(
                                    image, landmarks, blur_intensity, 
                                    API_CONFIG['FACE_LANDMARKS_EXPANSION']
                                )
                        else:
                            # OpenCV method - create mask directly from bounding box
                            mask = self.landmark_detector.create_face_mask(image, (x, expanded_y, w, expanded_h), API_CONFIG['FACE_LANDMARKS_EXPANSION'])
                            if np.sum(mask > 0) > 0:
                                print(f"🎭 Face mask created with {np.sum(mask > 0)} pixels")
                                image = self._apply_mask_blur(image, mask, blur_intensity)
                            else:
                                print("⚠️ Empty face mask, falling back to rectangular blur")
                                self._apply_rectangular_blur(image, x, expanded_y, w, expanded_h, blur_intensity, blur_area)
                            print(f"✅ Applied landmark-based blur to face")
                    else:
                        # Non-face detections or when landmarks are disabled
                        print(f"🔧 Using rectangular blur for: {label}")
                        
                        # For face detections, expand the bounding box to include forehead
                        if label in ["FACE_FEMALE", "FACE_MALE"]:
                            expanded_y = max(0, int(y - h * 0.3))  # Extend 30% of height upward
                            expanded_h = int(h * 1.3)  # Increase height by 30%
                            print(f"🔧 Expanded face box for rectangular blur: original y={y}, h={h} -> expanded y={expanded_y}, h={expanded_h}")
                            self._apply_rectangular_blur(image, x, expanded_y, w, expanded_h, blur_intensity, blur_area)
                        else:
                            self._apply_rectangular_blur(image, x, y, w, h, blur_intensity, blur_area)
            
            # Save the censored image
            success = cv2.imwrite(output_path, image)
            if success:
                print(f"✅ Censored image saved to: {output_path}")
                return True
            else:
                print(f"❌ Failed to save censored image to: {output_path}")
                return False
            
        except Exception as e:
            print(f"❌ Error creating censored image: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def _apply_rectangular_blur(self, image, x, y, w, h, blur_intensity, blur_area):
        """Apply rectangular blur (existing logic)."""
        try:
            # Ensure coordinates are within image bounds
            x = max(0, min(x, image.shape[1]))
            y = max(0, min(y, image.shape[0]))
            w = max(0, min(w, image.shape[1] - x))
            h = max(0, min(h, image.shape[0] - y))
            
            print(f"🔍 Clipped box: x={x}, y={y}, w={w}, h={h}")
            
            if w > 0 and h > 0:
                # Validate and sanitize blur_area input
                try:
                    if isinstance(blur_area, str):
                        blur_area = float(blur_area)
                    else:
                        blur_area = float(blur_area)
                except (ValueError, TypeError):
                    print(f"⚠️ Invalid blur_area value '{blur_area}', using default 100%")
                    blur_area = 100.0
                
                # Handle 0/negative values - treat as "no reduction" (100%)
                if blur_area <= 0:
                    print(f"⚠️ blur_area {blur_area}% is <= 0, treating as no reduction (100%)")
                    blur_area = 100.0
                
                # Clamp to safe range (1-100%)
                original_blur_area = blur_area
                blur_area = max(1.0, min(100.0, blur_area))
                
                if original_blur_area != blur_area:
                    print(f"⚠️ blur_area adjusted from {original_blur_area}% to {blur_area}% (clamped to 1-100% range)")
                
                # Apply blur area reduction (1-100% of detection box)
                area_multiplier = blur_area / 100.0
                center_x, center_y = x + w//2, y + h//2
                new_w = int(w * area_multiplier)
                new_h = int(h * area_multiplier)
                
                # Ensure new dimensions are at least 1 pixel
                new_w = max(1, new_w)
                new_h = max(1, new_h)
                
                # Center the reduced area
                new_x = center_x - new_w//2
                new_y = center_y - new_h//2
                
                # Ensure new coordinates are within image bounds
                new_x = max(0, min(new_x, image.shape[1] - 1))
                new_y = max(0, min(new_y, image.shape[0] - 1))
                new_w = max(1, min(new_w, image.shape[1] - new_x))
                new_h = max(1, min(new_h, image.shape[0] - new_y))
                
                print(f"🎯 Blur area: {blur_area}%, original: ({w}x{h}), new: ({new_w}x{new_h})")
                print(f"🎯 New coordinates: x={new_x}, y={new_y}, w={new_w}, h={new_h}")
                
                if new_w > 0 and new_h > 0:
                    # Extract the region with reduced area
                    roi = image[new_y:new_y+new_h, new_x:new_x+new_w]
                    
                    # Calculate blur parameters based on intensity (0-100 scale)
                    if blur_intensity <= 0:
                        kernel_x, kernel_y, sigma = 1, 1, 0   # No blur
                    elif blur_intensity <= 10:
                        kernel_x, kernel_y, sigma = 5, 5, 5   # Very light blur
                    elif blur_intensity <= 20:
                        kernel_x, kernel_y, sigma = 9, 9, 8   # Light blur
                    elif blur_intensity <= 30:
                        kernel_x, kernel_y, sigma = 13, 13, 12  # Light-medium blur
                    elif blur_intensity <= 40:
                        kernel_x, kernel_y, sigma = 17, 17, 16  # Medium blur
                    elif blur_intensity <= 50:
                        kernel_x, kernel_y, sigma = 23, 23, 30  # NORMAL blur (SafeVision standard)
                    elif blur_intensity <= 60:
                        kernel_x, kernel_y, sigma = 27, 27, 35  # Medium-high blur
                    elif blur_intensity <= 70:
                        kernel_x, kernel_y, sigma = 31, 31, 50  # HIGH blur (SafeVision high)
                    elif blur_intensity <= 80:
                        kernel_x, kernel_y, sigma = 45, 45, 60  # Very high blur
                    elif blur_intensity <= 90:
                        kernel_x, kernel_y, sigma = 65, 65, 70  # Maximum blur
                    else:
                        kernel_x, kernel_y, sigma = 99, 99, 75  # FULL blur (SafeVision full)
                    
                    print(f"🔍 Blur intensity: {blur_intensity}%, kernel: ({kernel_x},{kernel_y}), sigma: {sigma}")
                    
                    # Apply blur with calculated parameters
                    blurred_roi = cv2.GaussianBlur(roi, (kernel_x, kernel_y), sigma)
                    
                    # Put the blurred region back using new coordinates
                    image[new_y:new_y+new_h, new_x:new_x+new_w] = blurred_roi
                    print(f"✅ Applied rectangular blur to region")
                else:
                    print(f"⚠️ Skipping invalid region")
            else:
                print(f"⚠️ Skipping invalid region")
                
        except Exception as e:
            print(f"❌ Error applying rectangular blur: {e}")
            import traceback
            traceback.print_exc()

    def _apply_mask_blur(self, image, mask, blur_intensity):
        """Apply blur using a face mask (for MediaPipe)."""
        try:
            print(f"🎭 Applying mask blur with intensity {blur_intensity}")
            
            # Calculate blur parameters based on intensity (0-100 scale)
            if blur_intensity <= 0:
                kernel_x, kernel_y, sigma = 1, 1, 0   # No blur
            elif blur_intensity <= 25:
                kernel_x, kernel_y, sigma = 15, 15, 5  # Light blur
            elif blur_intensity <= 50:
                kernel_x, kernel_y, sigma = 25, 25, 8  # Medium blur
            elif blur_intensity <= 75:
                kernel_x, kernel_y, sigma = 35, 35, 12 # Strong blur
            else:
                kernel_x, kernel_y, sigma = 45, 45, 15 # Very strong blur
            
            # Ensure kernel sizes are odd
            kernel_x = kernel_x if kernel_x % 2 == 1 else kernel_x + 1
            kernel_y = kernel_y if kernel_y % 2 == 1 else kernel_y + 1
            
            print(f"🎭 Blur parameters: kernel=({kernel_x}x{kernel_y}), sigma={sigma}")
            
            # Apply Gaussian blur to the entire image
            blurred_image = cv2.GaussianBlur(image, (kernel_x, kernel_y), sigma)
            
            # Create a 3-channel mask
            mask_3channel = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
            mask_3channel = mask_3channel.astype(np.float32) / 255.0
            
            # Blend original and blurred images using the mask
            result = image.astype(np.float32) * (1 - mask_3channel) + blurred_image.astype(np.float32) * mask_3channel
            
            # Convert back to uint8
            result = np.clip(result, 0, 255).astype(np.uint8)
            
            print(f"✅ Mask blur applied successfully")
            return result
            
        except Exception as e:
            print(f"❌ Error applying mask blur: {e}")
            import traceback
            traceback.print_exc()
            return image

    def process_image(self, image_path, threshold=None, blur=False, session_id=None, blur_rules=None, blur_intensity=50, blur_area=100, use_landmarks=True):
        """Process image for nudity detection."""
        if not self.model_loaded:
            return {
                'error': 'Model not loaded',
                'status': 'error',
                'code': 500
            }
        
        try:
            # Run detection
            detections = self.detector.detect(image_path)
            
            # Apply threshold filter
            if threshold is None:
                threshold = API_CONFIG['DEFAULT_THRESHOLD']
            
            print(f"🔍 DEBUG: Total detections: {len(detections)}")
            print(f"🔍 DEBUG: Threshold: {threshold}")
            for i, detection in enumerate(detections):
                print(f"🔍 DEBUG: Detection {i}: {detection}")
            
            filtered_detections = [
                d for d in detections if d.get('score', d.get('confidence', 0)) >= threshold
            ]
            
            print(f"🔍 DEBUG: Filtered detections: {len(filtered_detections)}")
            
            # Calculate risk assessment
            risk_scores = {}
            highest_risk = 'SAFE'
            
            for detection in filtered_detections:
                label = detection['class']
                risk = get_risk_level(label)
                risk_scores[risk] = risk_scores.get(risk, 0) + 1
                
                # Update highest risk
                risk_order = ['SAFE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']
                if risk_order.index(risk) > risk_order.index(highest_risk):
                    highest_risk = risk
            
            # Apply blur if requested
            censored_available = False
            censored_image = None
            
            print(f"🔍 DEBUG: blur={blur}, filtered_detections={len(filtered_detections)}")
            print(f"🔍 DEBUG: blur_rules={blur_rules}")
            
            if blur and filtered_detections:
                print(f"🔍 DEBUG: Processing {len(filtered_detections)} detections for blur")
                for i, detection in enumerate(filtered_detections):
                    print(f"🔍 DEBUG: Detection {i}: {detection}")
                
                # Check if any detections should be blurred based on rules
                should_blur = False
                if blur_rules:
                    print(f"🔍 DEBUG: Using custom blur rules")
                    for detection in filtered_detections:
                        label = detection['class']
                        rule_enabled = blur_rules.get(label, False)
                        print(f"🔍 DEBUG: Label '{label}' -> rule enabled: {rule_enabled}")
                        if rule_enabled:
                            should_blur = True
                            break
                else:
                    print(f"🔍 DEBUG: Using default blur rules")
                    # Default blur rules - blur faces and exposed content
                    for detection in filtered_detections:
                        label = detection['class']
                        print(f"🔍 DEBUG: Checking label '{label}' for default blur")
                        if (label in ['FACE_FEMALE', 'FACE_MALE'] or 
                            'EXPOSED' in label):
                            print(f"🔍 DEBUG: Label '{label}' matches default blur rules")
                            should_blur = True
                            break
                
                print(f"🔍 DEBUG: should_blur = {should_blur}")
                
                if should_blur:
                    # Generate simple output filename
                    import uuid
                    simple_id = str(uuid.uuid4())[:8]  # Just 8 characters
                    filename = f"processed_{simple_id}.jpg"
                    output_path = os.path.join(API_CONFIG['OUTPUT_FOLDER'], filename)
                    
                    # Create censored image
                    success = self.create_censored_image(
                        image_path, output_path, filtered_detections, 
                        blur_intensity, blur_area, use_landmarks
                    )
                    
                    if success:
                        censored_available = True
                        censored_image = filename
            
            # Prepare response
            response = {
                'status': 'success',
                'detections': filtered_detections,
                'detection_count': len(filtered_detections),
                'risk_assessment': {
                    'highest_risk': highest_risk,
                    'risk_scores': risk_scores
                },
                'censored_available': censored_available,
                'censored_image': censored_image,
                'processing_info': {
                    'threshold': threshold,
                    'blur_applied': blur and should_blur if 'should_blur' in locals() else False,
                    'blur_intensity': blur_intensity,
                    'blur_area': blur_area,
                    'landmarks_used': use_landmarks and self.landmark_detector and self.landmark_detector.is_available()
                }
            }
            
            return response
            
        except Exception as e:
            print(f"❌ Error processing image: {e}")
            import traceback
            traceback.print_exc()
            return {
                'error': str(e),
                'status': 'error',
                'code': 500
            }

# Initialize the API
api = SafeVisionAPI()

# Flask app setup
if FLASK_AVAILABLE:
    app = Flask(__name__)
    CORS(app)
    app.config['MAX_CONTENT_LENGTH'] = API_CONFIG['MAX_CONTENT_LENGTH']
    
    # Create necessary directories
    for folder in [API_CONFIG['UPLOAD_FOLDER'], API_CONFIG['OUTPUT_FOLDER'], API_CONFIG['TEMP_FOLDER']]:
        os.makedirs(folder, exist_ok=True)
    
    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        """Health check endpoint."""
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'model_loaded': api.model_loaded,
            'landmarks_available': api.landmark_detector and api.landmark_detector.is_available() if api.landmark_detector else False,
            'version': '1.0.0'
        })
    
    @app.route('/api/v1/detect', methods=['POST'])
    def detect_endpoint():
        """Main detection endpoint for file uploads."""
        try:
            if 'file' not in request.files:
                return jsonify({'error': 'No file provided', 'status': 'error'}), 400
            
            file = request.files['file']
            if file.filename == '':
                return jsonify({'error': 'No file selected', 'status': 'error'}), 400
            
            # Get parameters
            threshold = float(request.form.get('threshold', API_CONFIG['DEFAULT_THRESHOLD']))
            blur = request.form.get('blur', 'false').lower() == 'true'
            blur_intensity = int(request.form.get('blur_intensity', API_CONFIG['DEFAULT_BLUR_INTENSITY']))
            blur_area = int(request.form.get('blur_area', API_CONFIG['DEFAULT_BLUR_AREA']))
            use_landmarks = request.form.get('use_face_landmarks', 'true').lower() == 'true'
            
            # Get blur rules
            blur_rules = {}
            if blur:
                blur_rules = {
                    'FACE_FEMALE': request.form.get('blur_face_female', 'false').lower() == 'true',
                    'FACE_MALE': request.form.get('blur_face_male', 'false').lower() == 'true',
                    'FEMALE_GENITALIA_EXPOSED': request.form.get('blur_female_genitalia_exposed', 'false').lower() == 'true',
                    'MALE_GENITALIA_EXPOSED': request.form.get('blur_male_genitalia_exposed', 'false').lower() == 'true',
                    'FEMALE_BREAST_EXPOSED': request.form.get('blur_female_breast_exposed', 'false').lower() == 'true',
                    'MALE_BREAST_EXPOSED': request.form.get('blur_male_breast_exposed', 'false').lower() == 'true',
                    'BUTTOCKS_EXPOSED': request.form.get('blur_buttocks_exposed', 'false').lower() == 'true',
                    'ANUS_EXPOSED': request.form.get('blur_anus_exposed', 'false').lower() == 'true',
                    'BELLY_EXPOSED': request.form.get('blur_belly_exposed', 'false').lower() == 'true',
                    'FEET_EXPOSED': request.form.get('blur_feet_exposed', 'false').lower() == 'true',
                    'ARMPITS_EXPOSED': request.form.get('blur_armpits_exposed', 'false').lower() == 'true',
                    'FEMALE_GENITALIA_COVERED': request.form.get('blur_female_genitalia_covered', 'false').lower() == 'true',
                    'FEMALE_BREAST_COVERED': request.form.get('blur_female_breast_covered', 'false').lower() == 'true',
                    'BUTTOCKS_COVERED': request.form.get('blur_buttocks_covered', 'false').lower() == 'true',
                    'ANUS_COVERED': request.form.get('blur_anus_covered', 'false').lower() == 'true',
                    'BELLY_COVERED': request.form.get('blur_belly_covered', 'false').lower() == 'true',
                    'FEET_COVERED': request.form.get('blur_feet_covered', 'false').lower() == 'true',
                    'ARMPITS_COVERED': request.form.get('blur_armpits_covered', 'false').lower() == 'true',
                }
            
            # Save uploaded file with simple name
            if WERKZEUG_AVAILABLE:
                original_filename = secure_filename(file.filename)
            else:
                original_filename = file.filename
            
            # Generate simple filename
            import uuid
            simple_id = str(uuid.uuid4())[:8]
            file_ext = os.path.splitext(original_filename)[1] or '.jpg'
            filename = f"upload_{simple_id}{file_ext}"
            file_path = os.path.join(API_CONFIG['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Process image
            result = api.process_image(
                file_path, threshold, blur, None, blur_rules, 
                blur_intensity, blur_area, use_landmarks
            )
            
            return jsonify(result)
            
        except Exception as e:
            print(f"❌ Error in detect endpoint: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e), 'status': 'error'}), 500
    
    @app.route('/api/v1/detect/base64', methods=['POST'])
    def detect_base64_endpoint():
        """Detection endpoint for base64 encoded images."""
        try:
            data = request.get_json()
            if not data or 'image' not in data:
                return jsonify({'error': 'No image data provided', 'status': 'error'}), 400
            
            # Decode base64 image
            image_data = base64.b64decode(data['image'])
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Save temporary file with simple name
            import uuid
            simple_id = str(uuid.uuid4())[:8]
            filename = f"base64_{simple_id}.jpg"
            file_path = os.path.join(API_CONFIG['TEMP_FOLDER'], filename)
            image.save(file_path, 'JPEG')
            
            # Get parameters
            threshold = data.get('threshold', API_CONFIG['DEFAULT_THRESHOLD'])
            blur = data.get('blur', False)
            blur_intensity = data.get('blur_intensity', API_CONFIG['DEFAULT_BLUR_INTENSITY'])
            blur_area = data.get('blur_area', API_CONFIG['DEFAULT_BLUR_AREA'])
            use_landmarks = data.get('use_face_landmarks', True)
            
            # Get blur rules
            blur_rules = {}
            if blur:
                blur_rules = {
                    'FACE_FEMALE': data.get('blur_face_female', False),
                    'FACE_MALE': data.get('blur_face_male', False),
                    'FEMALE_GENITALIA_EXPOSED': data.get('blur_female_genitalia_exposed', False),
                    'MALE_GENITALIA_EXPOSED': data.get('blur_male_genitalia_exposed', False),
                    'FEMALE_BREAST_EXPOSED': data.get('blur_female_breast_exposed', False),
                    'MALE_BREAST_EXPOSED': data.get('blur_male_breast_exposed', False),
                    'BUTTOCKS_EXPOSED': data.get('blur_buttocks_exposed', False),
                    'ANUS_EXPOSED': data.get('blur_anus_exposed', False),
                    'BELLY_EXPOSED': data.get('blur_belly_exposed', False),
                    'FEET_EXPOSED': data.get('blur_feet_exposed', False),
                    'ARMPITS_EXPOSED': data.get('blur_armpits_exposed', False),
                    'FEMALE_GENITALIA_COVERED': data.get('blur_female_genitalia_covered', False),
                    'FEMALE_BREAST_COVERED': data.get('blur_female_breast_covered', False),
                    'BUTTOCKS_COVERED': data.get('blur_buttocks_covered', False),
                    'ANUS_COVERED': data.get('blur_anus_covered', False),
                    'BELLY_COVERED': data.get('blur_belly_covered', False),
                    'FEET_COVERED': data.get('blur_feet_covered', False),
                    'ARMPITS_COVERED': data.get('blur_armpits_covered', False),
                }
            
            # Process image
            result = api.process_image(
                file_path, threshold, blur, None, blur_rules, 
                blur_intensity, blur_area, use_landmarks
            )
            
            # Clean up temporary file
            try:
                os.remove(file_path)
            except:
                pass
            
            return jsonify(result)
            
        except Exception as e:
            print(f"❌ Error in detect base64 endpoint: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'error': str(e), 'status': 'error'}), 500
    
    def _validate_file_path(filename):
        """Validate and sanitize filename to prevent path traversal attacks."""
        # Sanitize the filename using Werkzeug's secure_filename
        safe_filename = secure_filename(filename)
        
        # Reject if filename contains path traversal or is empty after sanitization
        if not safe_filename or '..' in filename or filename.startswith('/') or filename.startswith('\\'):
            return None, "Invalid filename: contains path traversal or absolute path"
        
        # Build absolute path
        file_path = os.path.join(API_CONFIG['OUTPUT_FOLDER'], safe_filename)
        resolved_path = os.path.realpath(file_path)
        output_folder_resolved = os.path.realpath(API_CONFIG['OUTPUT_FOLDER'])
        
        # Ensure the resolved file path is within the output folder
        if not resolved_path.startswith(output_folder_resolved):
            return None, "Invalid filename: path outside allowed directory"
        
        return resolved_path, None

    @app.route('/api/v1/download/<filename>', methods=['GET'])
    def download_file(filename):
        """Download processed image files."""
        try:
            file_path, error = _validate_file_path(filename)
            if error:
                return jsonify({'error': error, 'status': 'error'}), 400
            
            if os.path.exists(file_path):
                return send_file(file_path, as_attachment=True)
            else:
                return jsonify({'error': 'File not found', 'status': 'error'}), 404
        except Exception as e:
            return jsonify({'error': str(e), 'status': 'error'}), 500

    @app.route('/api/v1/image/<filename>', methods=['GET'])
    def serve_image(filename):
        """Serve processed image files for display."""
        try:
            file_path, error = _validate_file_path(filename)
            if error:
                return jsonify({'error': error, 'status': 'error'}), 400
            
            if os.path.exists(file_path):
                # Determine mimetype dynamically
                mimetype, _ = mimetypes.guess_type(file_path)
                if not mimetype:
                    mimetype = 'application/octet-stream'  # fallback for unknown types
                
                return send_file(file_path, mimetype=mimetype)
            else:
                return jsonify({'error': 'File not found', 'status': 'error'}), 404
        except Exception as e:
            return jsonify({'error': str(e), 'status': 'error'}), 500

if __name__ == '__main__':
    if not FLASK_AVAILABLE:
        print("❌ Flask not available. Cannot start server.")
        sys.exit(1)
    
    print("🚀 Starting SafeVision API Server...")
    print(f"📍 Host: {API_CONFIG['HOST']}")
    print(f"📍 Port: {API_CONFIG['PORT']}")
    print(f"📍 Debug: {API_CONFIG['DEBUG']}")
    print(f"📍 Model loaded: {api.model_loaded}")
    print(f"📍 Landmarks available: {api.landmark_detector and api.landmark_detector.is_available() if api.landmark_detector else False}")
    
    app.run(
        host=API_CONFIG['HOST'],
        port=API_CONFIG['PORT'],
        debug=API_CONFIG['DEBUG']
    )