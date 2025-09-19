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

# API Configuration
API_CONFIG = {
    'HOST': '0.0.0.0',
    'PORT': 5001,
    'DEBUG': False,
    'MAX_CONTENT_LENGTH': 50 * 1024 * 1024,  # 50MB max upload
    'UPLOAD_FOLDER': 'api_uploads',
    'OUTPUT_FOLDER': 'api_outputs',
    'TEMP_FOLDER': 'api_temp',
    'ALLOWED_EXTENSIONS': {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'mp4', 'avi', 'mov', 'mkv'},
    'DEFAULT_THRESHOLD': 0.25,
    'CLEANUP_INTERVAL': 3600,  # 1 hour
    'MAX_FILE_AGE': 86400,     # 24 hours
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
    """Get risk level for a detected label."""
    for level, labels in RISK_LEVELS.items():
        if label in labels:
            return level
    return 'UNKNOWN'

# Initialize Flask app
if FLASK_AVAILABLE:
    app = Flask(__name__)
    CORS(app)
    app.config['MAX_CONTENT_LENGTH'] = API_CONFIG['MAX_CONTENT_LENGTH']
    
    # Create necessary directories
    for folder in [API_CONFIG['UPLOAD_FOLDER'], API_CONFIG['OUTPUT_FOLDER'], API_CONFIG['TEMP_FOLDER']]:
        os.makedirs(folder, exist_ok=True)

class SafeVisionAPI:
    """Main API class for SafeVision nudity detection."""
    
    def __init__(self):
        self.detector = None
        self.model_loaded = False
        self.request_count = 0
        self.start_time = time.time()
        self.active_sessions = {}
        
        # Initialize detector if available
        if DETECTOR_AVAILABLE and ONNX_AVAILABLE:
            try:
                self.detector = NudeDetector()
                self.model_loaded = True
                print("✅ SafeVision detector loaded successfully")
            except Exception as e:
                print(f"❌ Failed to load detector: {e}")
                self.model_loaded = False
        else:
            print("❌ Dependencies not available for detector initialization")
    
    def allowed_file(self, filename):
        """Check if file extension is allowed."""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in API_CONFIG['ALLOWED_EXTENSIONS']
    
    def generate_session_id(self):
        """Generate unique session ID."""
        return str(uuid.uuid4())
    
    def create_censored_image(self, input_path, output_path, detections):
        """Create a censored version of the image by blurring detected areas."""
        try:
            print(f"🔍 Creating censored image from {input_path} to {output_path}")
            print(f"🔍 OpenCV available: {OPENCV_AVAILABLE}")
            print(f"🔍 Detections to blur: {len(detections)}")
            
            if not OPENCV_AVAILABLE:
                print("⚠️ OpenCV not available, copying original image")
                # Fallback: just copy the original image
                import shutil
                shutil.copy2(input_path, output_path)
                return
            
            # Load the image
            image = cv2.imread(input_path)
            if image is None:
                raise ValueError(f"Could not load image: {input_path}")
            
            print(f"🔍 Image loaded: {image.shape}")
            
            # Apply blur to detected areas
            for i, detection in enumerate(detections):
                print(f"🔍 Processing detection {i}: {detection}")
                if 'box' in detection:
                    x, y, w, h = detection['box']
                    x, y, w, h = int(x), int(y), int(w), int(h)
                    
                    print(f"🔍 Original box: x={x}, y={y}, w={w}, h={h}")
                    
                    # Ensure coordinates are within image bounds
                    x = max(0, min(x, image.shape[1]))
                    y = max(0, min(y, image.shape[0]))
                    w = max(0, min(w, image.shape[1] - x))
                    h = max(0, min(h, image.shape[0] - y))
                    
                    print(f"🔍 Clipped box: x={x}, y={y}, w={w}, h={h}")
                    
                    if w > 0 and h > 0:
                        # Extract the region
                        roi = image[y:y+h, x:x+w]
                        
                        # Apply heavy blur
                        blurred_roi = cv2.GaussianBlur(roi, (99, 99), 0)
                        
                        # Put the blurred region back
                        image[y:y+h, x:x+w] = blurred_roi
                        print(f"✅ Applied blur to region {i}")
                    else:
                        print(f"⚠️ Skipping invalid region {i}")
            
            # Save the censored image
            success = cv2.imwrite(output_path, image)
            if success:
                print(f"✅ Censored image saved to: {output_path}")
            else:
                print(f"❌ Failed to save censored image to: {output_path}")
            
        except Exception as e:
            print(f"❌ Error creating censored image: {e}")
            import traceback
            traceback.print_exc()
            # Fallback: copy original image
            import shutil
            shutil.copy2(input_path, output_path)
            print(f"📋 Fallback: copied original to {output_path}")
    
    def process_image(self, image_path, threshold=None, blur=False, session_id=None, blur_rules=None):
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
            
            filtered_detections = [
                d for d in detections if d['score'] >= threshold
            ]
            
            # Calculate risk assessment
            risk_scores = {}
            highest_risk = 'SAFE'
            
            for detection in filtered_detections:
                label = detection['class']
                risk = get_risk_level(label)
                risk_scores[risk] = risk_scores.get(risk, 0) + 1
                
                # Update highest risk
                risk_priority = ['SAFE', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL']
                if risk_priority.index(risk) > risk_priority.index(highest_risk):
                    highest_risk = risk
            
            # Process censored version if requested
            censored_path = None
            print(f"🔍 Blur requested: {blur}, Detections: {len(filtered_detections)}")
            if blur:
                try:
                    base_name = os.path.splitext(os.path.basename(image_path))[0]
                    censored_path = os.path.join(API_CONFIG['OUTPUT_FOLDER'], f"{base_name}_censored.jpg")
                    print(f"🔍 Creating censored image at: {censored_path}")
                    
                    # Filter detections based on blur rules
                    detections_to_blur = []
                    if blur_rules:
                        for detection in filtered_detections:
                            label = detection['class']
                            should_blur = blur_rules.get(label, False)
                            if should_blur:
                                detections_to_blur.append(detection)
                                print(f"✅ Will blur: {label}")
                            else:
                                print(f"⏭️ Skipping: {label}")
                    else:
                        # If no blur rules provided, blur all detections
                        detections_to_blur = filtered_detections
                        print("⚠️ No blur rules provided, blurring all detections")
                    
                    print(f"🔍 Detections to blur: {len(detections_to_blur)} out of {len(filtered_detections)}")
                    
                    # Create censored image by copying original and applying blur to selected areas
                    self.create_censored_image(image_path, censored_path, detections_to_blur)
                    print(f"✅ Created censored image: {censored_path}")
                except Exception as e:
                    print(f"❌ Warning: Failed to create censored version: {e}")
                    import traceback
                    traceback.print_exc()
                    censored_path = None
            
            # Update request count
            self.request_count += 1
            
            # Prepare response
            response = {
                'status': 'success',
                'session_id': session_id or self.generate_session_id(),
                'timestamp': datetime.now().isoformat(),
                'analysis': {
                    'total_detections': len(filtered_detections),
                    'highest_risk_level': highest_risk,
                    'risk_distribution': risk_scores,
                    'is_safe': highest_risk in ['SAFE', 'LOW'],
                    'threshold_used': threshold
                },
                'detections': [
                    {
                        'label': d['class'],
                        'confidence': round(d['score'], 4),
                        'risk_level': get_risk_level(d['class']),
                        'bounding_box': {
                            'x': int(d['box'][0]),
                            'y': int(d['box'][1]),
                            'width': int(d['box'][2]),
                            'height': int(d['box'][3])
                        }
                    } for d in filtered_detections
                ],
                'censored_available': censored_path is not None,
                'censored_image': censored_path,
                'processing_info': {
                    'model_version': 'best.onnx',
                    'total_requests': self.request_count,
                    'uptime_seconds': int(time.time() - self.start_time)
                }
            }
            
            return response
            
        except Exception as e:
            return {
                'error': f'Processing failed: {str(e)}',
                'status': 'error',
                'code': 500,
                'traceback': traceback.format_exc() if API_CONFIG['DEBUG'] else None
            }
    
    def get_stats(self):
        """Get API statistics."""
        return {
            'status': 'online',
            'model_loaded': self.model_loaded,
            'total_requests': self.request_count,
            'uptime_seconds': int(time.time() - self.start_time),
            'active_sessions': len(self.active_sessions),
            'supported_formats': list(API_CONFIG['ALLOWED_EXTENSIONS']),
            'max_file_size_mb': API_CONFIG['MAX_CONTENT_LENGTH'] // (1024 * 1024),
            'version': '1.0.0'
        }
    
    def cleanup_old_files(self):
        """Clean up old temporary files."""
        try:
            current_time = time.time()
            for folder in [API_CONFIG['UPLOAD_FOLDER'], API_CONFIG['OUTPUT_FOLDER'], API_CONFIG['TEMP_FOLDER']]:
                for file_path in Path(folder).glob('*'):
                    if file_path.is_file():
                        file_age = current_time - file_path.stat().st_mtime
                        if file_age > API_CONFIG['MAX_FILE_AGE']:
                            file_path.unlink()
                            print(f"Cleaned up old file: {file_path}")
        except Exception as e:
            print(f"Cleanup error: {e}")

# Initialize API instance
api_instance = SafeVisionAPI()

# Flask routes
if FLASK_AVAILABLE:
    
    @app.route('/api/v1/health', methods=['GET'])
    def health_check():
        """Health check endpoint."""
        return jsonify(api_instance.get_stats())
    
    @app.route('/api/v1/detect', methods=['POST'])
    def detect_image():
        """Main detection endpoint for images."""
        try:
            # Check if model is loaded
            if not api_instance.model_loaded:
                return jsonify({
                    'error': 'Detection model not available',
                    'status': 'error'
                }), 503
            
            # Validate request
            if 'file' not in request.files:
                return jsonify({
                    'error': 'No file provided',
                    'status': 'error'
                }), 400
            
            file = request.files['file']
            if file.filename == '' or not api_instance.allowed_file(file.filename):
                return jsonify({
                    'error': 'Invalid file type',
                    'status': 'error',
                    'allowed_types': list(API_CONFIG['ALLOWED_EXTENSIONS'])
                }), 400
            
            # Get parameters
            threshold = request.form.get('threshold', API_CONFIG['DEFAULT_THRESHOLD'], type=float)
            blur = request.form.get('blur', 'false').lower() == 'true'
            session_id = request.form.get('session_id')
            
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
            
            # Save uploaded file
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_filename = f"{timestamp}_{filename}"
            file_path = os.path.join(API_CONFIG['UPLOAD_FOLDER'], unique_filename)
            file.save(file_path)
            
            # Process image
            result = api_instance.process_image(file_path, threshold, blur, session_id, blur_rules)
            
            if result.get('status') == 'error':
                return jsonify(result), result.get('code', 500)
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({
                'error': f'Unexpected error: {str(e)}',
                'status': 'error'
            }), 500
    
    @app.route('/api/v1/detect/base64', methods=['POST'])
    def detect_base64():
        """Detection endpoint for base64 encoded images."""
        try:
            data = request.get_json()
            
            if not data or 'image' not in data:
                return jsonify({
                    'error': 'No base64 image data provided',
                    'status': 'error'
                }), 400
            
            # Decode base64 image
            try:
                image_data = base64.b64decode(data['image'])
                
                # Save to temporary file
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                temp_filename = f"temp_{timestamp}.jpg"
                temp_path = os.path.join(API_CONFIG['TEMP_FOLDER'], temp_filename)
                
                with open(temp_path, 'wb') as f:
                    f.write(image_data)
                
            except Exception as e:
                return jsonify({
                    'error': f'Invalid base64 image data: {str(e)}',
                    'status': 'error'
                }), 400
            
            # Get parameters
            threshold = data.get('threshold', API_CONFIG['DEFAULT_THRESHOLD'])
            blur = data.get('blur', False)
            session_id = data.get('session_id')
            
            # Process image
            result = api_instance.process_image(temp_path, threshold, blur, session_id)
            
            # Clean up temp file
            try:
                os.remove(temp_path)
            except:
                pass
            
            if result.get('status') == 'error':
                return jsonify(result), result.get('code', 500)
            
            return jsonify(result)
            
        except Exception as e:
            return jsonify({
                'error': f'Unexpected error: {str(e)}',
                'status': 'error'
            }), 500
    
    @app.route('/api/v1/labels', methods=['GET'])
    def get_labels():
        """Get available detection labels."""
        return jsonify({
            'labels': CONTENT_LABELS,
            'risk_levels': RISK_LEVELS,
            'total_labels': len(CONTENT_LABELS)
        })
    
    @app.route('/api/v1/stats', methods=['GET'])
    def get_statistics():
        """Get detailed API statistics."""
        return jsonify(api_instance.get_stats())
    
    @app.route('/api_outputs/<filename>')
    def serve_censored_image(filename):
        """Serve censored images."""
        try:
            file_path = os.path.join(API_CONFIG['OUTPUT_FOLDER'], filename)
            if os.path.exists(file_path):
                return send_file(file_path, mimetype='image/jpeg')
            else:
                return jsonify({'error': 'File not found'}), 404
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.errorhandler(413)
    def too_large(e):
        return jsonify({
            'error': 'File too large',
            'max_size_mb': API_CONFIG['MAX_CONTENT_LENGTH'] // (1024 * 1024),
            'status': 'error'
        }), 413

def start_cleanup_scheduler():
    """Start background cleanup scheduler."""
    def cleanup_worker():
        while True:
            time.sleep(API_CONFIG['CLEANUP_INTERVAL'])
            api_instance.cleanup_old_files()
    
    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()

def main():
    """Main function to start the API server."""
    if not FLASK_AVAILABLE:
        print("❌ Flask not available. Cannot start API server.")
        print("Install with: pip install flask flask-cors")
        return
    
    if not api_instance.model_loaded:
        print("⚠️  Warning: Detection model not loaded. API will have limited functionality.")
    
    print(f"🚀 Starting SafeVision API Server...")
    print(f"📡 Host: {API_CONFIG['HOST']}")
    print(f"🔌 Port: {API_CONFIG['PORT']}")
    print(f"🔍 Model loaded: {api_instance.model_loaded}")
    print(f"📁 Upload folder: {API_CONFIG['UPLOAD_FOLDER']}")
    print(f"📁 Output folder: {API_CONFIG['OUTPUT_FOLDER']}")
    
    # Start cleanup scheduler
    start_cleanup_scheduler()
    
    # Available endpoints
    print("\n📋 Available Endpoints:")
    print("  GET  /api/v1/health       - Health check")
    print("  POST /api/v1/detect       - Image detection (multipart/form-data)")
    print("  POST /api/v1/detect/base64 - Image detection (base64 JSON)")
    print("  GET  /api/v1/labels       - Available labels")
    print("  GET  /api/v1/stats        - API statistics")
    
    print(f"\n🌐 API Documentation: http://{API_CONFIG['HOST']}:{API_CONFIG['PORT']}/api/v1/health")
    print("="*60)
    
    try:
        app.run(
            host=API_CONFIG['HOST'],
            port=API_CONFIG['PORT'],
            debug=API_CONFIG['DEBUG'],
            threaded=True
        )
    except KeyboardInterrupt:
        print("\n🛑 API Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == '__main__':
    main()
