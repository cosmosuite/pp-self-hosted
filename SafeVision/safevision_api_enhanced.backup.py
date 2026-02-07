import os
import json
import time
import uuid
import traceback
from datetime import datetime
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
import cv2
import numpy as np
from PIL import Image
import onnxruntime
import onnx

# Import the detector from main.py
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import NudeDetector

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

def get_risk_level(label):
    """Determine risk level based on content label."""
    if 'EXPOSED' in label:
        if 'GENITALIA' in label:
            return 'CRITICAL'
        elif 'BREAST' in label and 'FEMALE' in label:
            return 'HIGH'
        elif 'ANUS' in label:
            return 'HIGH'
        elif 'BUTTOCKS' in label:
            return 'MODERATE'
        else:
            return 'LOW'
    elif 'FACE' in label:
        return 'SAFE'
    else:
        return 'SAFE'

class SafeVisionAPI:
    def __init__(self):
        self.model_loaded = False
        self.detector = None
        self.start_time = time.time()
        self.active_sessions = set()
        self.load_model()
    
    def load_model(self):
        """Load the ONNX model."""
        try:
            print("Loading SafeVision model...")
            self.detector = NudeDetector()
            self.model_loaded = True
            print("✅ SafeVision detector loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            self.model_loaded = False
    
    def is_allowed_file(self, filename):
        """Check if file extension is allowed."""
        return '.' in filename and \
               filename.rsplit('.', 1)[1].lower() in API_CONFIG['ALLOWED_EXTENSIONS']
    
    def generate_session_id(self):
        """Generate unique session ID."""
        return str(uuid.uuid4())
    
    def apply_blur_rules(self, detections, blur_rules):
        """Apply custom blur rules to detections."""
        if not blur_rules:
            return detections
        
        filtered = []
        for detection in detections:
            label = detection['class']
            should_blur = blur_rules.get(label, True)  # Default to blur if not specified
            
            detection['should_blur'] = should_blur
            filtered.append(detection)
        
        return filtered
    
    def process_image(self, image_path, threshold=None, blur=False, session_id=None, blur_rules=None):
        """Process image for nudity detection with custom blur rules."""
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
            
            # Apply custom blur rules if provided
            if blur_rules:
                filtered_detections = self.apply_blur_rules(filtered_detections, blur_rules)
            
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
            if blur:
                try:
                    base_name = os.path.splitext(os.path.basename(image_path))[0]
                    censored_path = os.path.join(API_CONFIG['OUTPUT_FOLDER'], f"{base_name}_censored.jpg")
                    
                    # Apply custom blur rules to censoring
                    if blur_rules:
                        self.detector.censor_with_rules(image_path, blur_rules, output_path=censored_path)
                    else:
                        self.detector.censor(image_path, apply_blur=True, output_path=censored_path)
                except Exception as e:
                    print(f"Warning: Failed to create censored version: {e}")
            
            return {
                'status': 'success',
                'data': {
                    'detections_count': len(filtered_detections),
                    'risk_level': highest_risk,
                    'risk_distribution': risk_scores,
                    'is_safe': highest_risk in ['SAFE', 'LOW'],
                    'threshold_used': threshold
                },
                'detections': [
                    {
                        'label': d['class'],
                        'confidence': round(d['score'], 3),
                        'bbox': d['bbox'],
                        'should_blur': d.get('should_blur', True)
                    } for d in filtered_detections
                ],
                'censored_image': censored_path,
                'session_id': session_id
            }
            
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
            'model_loaded': self.model_loaded,
            'uptime_seconds': int(time.time() - self.start_time),
            'active_sessions': len(self.active_sessions),
            'supported_formats': list(API_CONFIG['ALLOWED_EXTENSIONS']),
            'max_file_size_mb': API_CONFIG['MAX_CONTENT_LENGTH'] // (1024 * 1024),
            'version': '1.0.0'
        }
    
    def cleanup_old_files(self):
        """Clean up old files from upload and output folders."""
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

# Initialize Flask app
app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = API_CONFIG['MAX_CONTENT_LENGTH']

# Create necessary directories
for folder in [API_CONFIG['UPLOAD_FOLDER'], API_CONFIG['OUTPUT_FOLDER'], API_CONFIG['TEMP_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

# Initialize API instance
api_instance = SafeVisionAPI()

@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify(api_instance.get_stats())

@app.route('/api/v1/labels', methods=['GET'])
def get_labels():
    """Get available detection labels."""
    return jsonify({
        'labels': CONTENT_LABELS,
        'count': len(CONTENT_LABELS)
    })

@app.route('/api/v1/detect', methods=['POST'])
def detect():
    """Detect nudity in uploaded image with custom blur rules."""
    if 'image' not in request.files:
        return jsonify({
            'error': 'No image file provided',
            'status': 'error'
        }), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({
            'error': 'No file selected',
            'status': 'error'
        }), 400
    
    if not api_instance.is_allowed_file(file.filename):
        return jsonify({
            'error': 'Invalid file type',
            'status': 'error',
            'allowed_types': list(API_CONFIG['ALLOWED_EXTENSIONS'])
        }), 400
    
    # Get parameters
    threshold = request.form.get('threshold', API_CONFIG['DEFAULT_THRESHOLD'], type=float)
    blur = request.form.get('blur', 'false').lower() == 'true'
    session_id = request.form.get('session_id')
    
    # Get blur rules from JSON
    blur_rules_json = request.form.get('blur_rules')
    blur_rules = None
    if blur_rules_json:
        try:
            blur_rules = json.loads(blur_rules_json)
        except:
            blur_rules = None
    
    # Save uploaded file
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(API_CONFIG['UPLOAD_FOLDER'], unique_filename)
    file.save(file_path)
    
    # Process image with custom rules
    result = api_instance.process_image(file_path, threshold, blur, session_id, blur_rules)
    
    if result.get('status') == 'error':
        return jsonify(result), result.get('code', 500)
    
    return jsonify(result)

@app.route('/api/v1/detect/base64', methods=['POST'])
def detect_base64():
    """Detect nudity in base64 encoded image."""
    try:
        data = request.get_json()
        if not data or 'image' not in data:
            return jsonify({
                'error': 'No image data provided',
                'status': 'error'
            }), 400
        
        # Decode base64 image
        import base64
        image_data = base64.b64decode(data['image'])
        
        # Save to temporary file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_filename = f"temp_{timestamp}.jpg"
        temp_path = os.path.join(API_CONFIG['TEMP_FOLDER'], temp_filename)
        
        with open(temp_path, 'wb') as f:
            f.write(image_data)
        
        # Get parameters
        threshold = data.get('threshold', API_CONFIG['DEFAULT_THRESHOLD'])
        blur = data.get('blur', False)
        session_id = data.get('session_id')
        blur_rules = data.get('blur_rules')
        
        # Process image
        result = api_instance.process_image(temp_path, threshold, blur, session_id, blur_rules)
        
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
            'error': f'Base64 processing failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/v1/stats', methods=['GET'])
def get_stats():
    """Get API statistics."""
    return jsonify(api_instance.get_stats())

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'error': 'File too large',
        'max_size_mb': API_CONFIG['MAX_CONTENT_LENGTH'] // (1024 * 1024),
        'status': 'error'
    }), 413

def cleanup_worker():
    """Background cleanup worker."""
    while True:
        time.sleep(API_CONFIG['CLEANUP_INTERVAL'])
        api_instance.cleanup_old_files()

if __name__ == '__main__':
    import threading
    
    # Start cleanup thread
    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()
    
    print(f"🚀 Starting SafeVision API Server...")
    print(f"📡 Host: {API_CONFIG['HOST']}")
    print(f"🔌 Port: {API_CONFIG['PORT']}")
    print(f"🔍 Model loaded: {api_instance.model_loaded}")
    print(f"📁 Upload folder: {API_CONFIG['UPLOAD_FOLDER']}")
    print(f"📁 Output folder: {API_CONFIG['OUTPUT_FOLDER']}")
    
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
        print("\n👋 SafeVision API Server stopped")
