import os
import cv2
import numpy as np
import mediapipe as mp
from PIL import Image
import io
import base64
import logging
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import warnings
from datetime import datetime
from main import NudeDetector

# Suppress warnings
warnings.filterwarnings("ignore")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MediaPipe components
mp_drawing = mp.solutions.drawing_utils
mp_face_mesh = mp.solutions.face_mesh
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

class FaceLandmarksDetector:
    def __init__(self):
        self.face_mesh = mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.pose = mp_pose.Pose(
            static_image_mode=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.hands = mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

    def detect_body_parts(self, image_path):
        try:
            # Load image
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            height, width, _ = image.shape
            
            results = {
                "image_info": {
                    "width": width,
                    "height": height
                },
                "faces": [],
                "pose": None,
                "hands": []
            }
            
            # Detect faces
            face_results = self.face_mesh.process(image_rgb)
            if face_results.multi_face_landmarks:
                for face_landmarks in face_results.multi_face_landmarks:
                    face_data = {
                        "landmarks": []
                    }
                    for landmark in face_landmarks.landmark:
                        face_data["landmarks"].append({
                            "x": float(landmark.x),
                            "y": float(landmark.y),
                            "z": float(landmark.z)
                        })
                    results["faces"].append(face_data)
            
            # Detect pose
            pose_results = self.pose.process(image_rgb)
            if pose_results.pose_landmarks:
                pose_data = {
                    "landmarks": []
                }
                for landmark in pose_results.pose_landmarks.landmark:
                    pose_data["landmarks"].append({
                        "x": float(landmark.x),
                        "y": float(landmark.y),
                        "z": float(landmark.z),
                        "visibility": float(landmark.visibility)
                    })
                results["pose"] = pose_data
            
            # Detect hands
            hands_results = self.hands.process(image_rgb)
            if hands_results.multi_hand_landmarks:
                for hand_landmarks in hands_results.multi_hand_landmarks:
                    hand_data = {
                        "landmarks": []
                    }
                    for landmark in hand_landmarks.landmark:
                        hand_data["landmarks"].append({
                            "x": float(landmark.x),
                            "y": float(landmark.y),
                            "z": float(landmark.z)
                        })
                    results["hands"].append(hand_data)
            
            return results
            
        except Exception as e:
            logger.error(f"Error detecting landmarks: {str(e)}")
            return {"error": str(e)}

class SafeVisionProcessor:
    def __init__(self):
        # Initialize AI models
        self.ai_model_paths = {
            "face_detection": "Models/haarcascade_frontalface_default.xml",
            "eye_detection": "Models/haarcascade_eye.xml",
            "hand_detection": "Models/haarcascade_hand.xml",
            "nudity_detection": "Models/nudity_model.h5"
        }
        
        # Load OpenCV cascade classifiers
        self.face_cascade = cv2.CascadeClassifier(self.ai_model_paths["face_detection"])
        self.eye_cascade = cv2.CascadeClassifier(self.ai_model_paths["eye_detection"])
        self.hand_cascade = cv2.CascadeClassifier(self.ai_model_paths["hand_detection"])
        
        # Initialize MediaPipe components
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_hands = mp.solutions.hands
        self.mp_pose = mp.solutions.pose
        
        self.face_detection = self.mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
        self.face_mesh = self.mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=10, min_detection_confidence=0.5)
        self.hands = self.mp_hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5)
        self.pose = self.mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
        
        # Initialize landmark detector
        self.landmark_detector = FaceLandmarksDetector()
        
        # Create necessary directories
        self.create_directories()
    
    def create_directories(self):
        directories = [
            "input",
            "output", 
            "Prosses",
            "Models",
            "Logs",
            "api_uploads",
            "api_temp",
            "api_outputs"
        ]
        
        for directory in directories:
            if not os.path.exists(directory):
                os.makedirs(directory)
                logger.info(f"Created directory: {directory}")
    
    def detect_faces_opencv(self, image_path):
        """Detect faces using OpenCV Haar Cascade"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            face_data = []
            for (x, y, w, h) in faces:
                face_data.append({
                    "bbox": {"x": int(x), "y": int(y), "width": int(w), "height": int(h)},
                    "confidence": 1.0,  # Haar cascade doesn't provide confidence
                    "method": "opencv_haar"
                })
            
            return {"faces": face_data}
            
        except Exception as e:
            logger.error(f"Error in OpenCV face detection: {str(e)}")
            return {"error": str(e)}
    
    def detect_faces_mediapipe(self, image_path):
        """Detect faces using MediaPipe"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            height, width, _ = image.shape
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            results = self.face_detection.process(rgb_image)
            
            face_data = []
            if results.detections:
                for detection in results.detections:
                    bbox = detection.location_data.relative_bounding_box
                    x = int(bbox.xmin * width)
                    y = int(bbox.ymin * height)
                    w = int(bbox.width * width)
                    h = int(bbox.height * height)
                    
                    face_data.append({
                        "bbox": {"x": x, "y": y, "width": w, "height": h},
                        "confidence": detection.score[0],
                        "method": "mediapipe"
                    })
            
            return {"faces": face_data}
            
        except Exception as e:
            logger.error(f"Error in MediaPipe face detection: {str(e)}")
            return {"error": str(e)}
    
    def detect_faces_face_recognition(self, image_path):
        """Detect faces using face_recognition library"""
        try:
            image = face_recognition.load_image_file(image_path)
            face_locations = face_recognition.face_locations(image)
            
            face_data = []
            for (top, right, bottom, left) in face_locations:
                face_data.append({
                    "bbox": {"x": left, "y": top, "width": right-left, "height": bottom-top},
                    "confidence": 1.0,  # face_recognition doesn't provide confidence
                    "method": "face_recognition"
                })
            
            return {"faces": face_data}
            
        except Exception as e:
            logger.error(f"Error in face_recognition detection: {str(e)}")
            return {"error": str(e)}
    
    def detect_faces(self, image_path, method="all"):
        """Main face detection function"""
        results = {}
        
        if method in ["all", "opencv"]:
            results["opencv"] = self.detect_faces_opencv(image_path)
        
        if method in ["all", "mediapipe"]:
            results["mediapipe"] = self.detect_faces_mediapipe(image_path)
        
        if method in ["all", "face_recognition"]:
            results["face_recognition"] = self.detect_faces_face_recognition(image_path)
        
        return results
    
    def detect_landmarks(self, image_path):
        """Detect facial landmarks"""
        return self.landmark_detector.detect_body_parts(image_path)
    
    def blur_regions(self, image_path, regions, blur_strength=15):
        """Blur specific regions in an image"""
        try:
            image = cv2.imread(image_path)
            if image is None:
                return {"error": "Could not load image"}
            
            blurred_image = image.copy()
            
            for region in regions:
                if "bbox" in region:
                    bbox = region["bbox"]
                    x, y, w, h = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
                    
                    # Ensure coordinates are within image bounds
                    x = max(0, x)
                    y = max(0, y)
                    w = min(w, image.shape[1] - x)
                    h = min(h, image.shape[0] - y)
                    
                    if w > 0 and h > 0:
                        roi = blurred_image[y:y+h, x:x+w]
                        blurred_roi = cv2.GaussianBlur(roi, (blur_strength, blur_strength), 0)
                        blurred_image[y:y+h, x:x+w] = blurred_roi
            
            # Save blurred image
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"output/blurred_{timestamp}.jpg"
            cv2.imwrite(output_path, blurred_image)
            
            return {"success": True, "output_path": output_path}
            
        except Exception as e:
            logger.error(f"Error in blur_regions: {str(e)}")
            return {"error": str(e)}
    
    def process_image(self, image_data, processing_type="all"):
        """Main processing function"""
        try:
            # Decode base64 image
            if isinstance(image_data, str):
                # Remove data URL prefix if present
                if ',' in image_data:
                    image_data = image_data.split(',')[1]
                
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
            else:
                image_bytes = image_data
                image = Image.open(io.BytesIO(image_bytes))
            
            # Convert PIL image to OpenCV format
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Generate unique filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            filename = f"processed_{timestamp}.jpg"
            input_path = os.path.join("api_uploads", filename)
            
            # Save uploaded image
            cv2.imwrite(input_path, image_cv)
            
            results = {}
            
            if processing_type in ["all", "face_detection"]:
                results["face_detection"] = self.detect_faces(input_path)
            
            if processing_type in ["all", "landmarks"]:
                results["landmarks"] = self.detect_landmarks(input_path)
            
            # Check if any faces were detected
            faces_detected = []
            if "face_detection" in results:
                for method, detection_result in results["face_detection"].items():
                    if "faces" in detection_result:
                        faces_detected.extend(detection_result["faces"])
            
            # If faces detected, create blurred version
            if faces_detected:
                blur_result = self.blur_regions(input_path, faces_detected)
                results["blurred_output"] = blur_result
            
            # Clean up input file
            try:
                os.remove(input_path)
            except:
                pass
            
            return results
            
        except Exception as e:
            logger.error(f"Error in process_image: {str(e)}")
            return {"error": str(e)}

# Initialize Flask app
app = Flask(__name__)
CORS(app)
processor = SafeVisionProcessor()

# Initialize NudeDetector for blur_rules support
try:
    nude_detector = NudeDetector()
    print("✅ NudeDetector loaded successfully")
except Exception as e:
    print(f"❌ Failed to load NudeDetector: {e}")
    nude_detector = None

@app.route('/api/v1/health', methods=['GET'])
def health_check_v1():
    return jsonify({
        "status": "online",
        "model_loaded": nude_detector is not None,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

@app.route('/api/v1/detect', methods=['POST'])
def detect_v1():
    """Detect nudity with custom blur_rules support"""
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
    
    try:
        # Get parameters
        threshold = float(request.form.get('threshold', 0.25))
        blur = request.form.get('blur', 'false').lower() == 'true'
        session_id = request.form.get('session_id', '')
        
        # Get blur rules from JSON
        blur_rules_json = request.form.get('blur_rules')
        blur_rules = None
        if blur_rules_json:
            try:
                blur_rules = json.loads(blur_rules_json)
                print(f"🎚️ Received blur_rules: {blur_rules}")
            except:
                print(f"❌ Failed to parse blur_rules: {blur_rules_json}")
                blur_rules = None
        
        # Save uploaded file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join('api_uploads', unique_filename)
        file.save(file_path)
        
        # Detect using NudeDetector
        if nude_detector is None:
            return jsonify({
                'error': 'NudeDetector not loaded',
                'status': 'error'
            }), 500
        
        detections = nude_detector.detect(file_path)
        print(f"🔍 Detected {len(detections)} items")
        
        # Apply blur if requested
        censored_image = None
        if blur and blur_rules:
            # Convert blur_rules to classes list (only include classes where value is True)
            classes_to_blur = [label for label, should_blur in blur_rules.items() if should_blur]
            print(f"🔍 Classes to blur: {classes_to_blur}")
            
            base_name = os.path.splitext(unique_filename)[0]
            censored_path = os.path.join('api_outputs', f"{base_name}_censored.jpg")
            
            nude_detector.censor(file_path, apply_blur=True, classes=classes_to_blur, output_path=censored_path)
            censored_image = censored_path
            print(f"✅ Censored image saved: {censored_path}")
        
        # Format response
        formatted_detections = []
        for det in detections:
            formatted_detections.append({
                'label': det['class'],
                'confidence': det['score'],
                'bounding_box': det['box']
            })
        
        response = {
            'status': 'success',
            'detections': formatted_detections,
            'censored_available': censored_image is not None,
            'censored_image': censored_image,
            'session_id': session_id
        }
        
        return jsonify(response)
        
    except Exception as e:
        print(f"❌ Error in /api/v1/detect: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'status': 'error'
        }), 500

@app.route('/process', methods=['POST'])
def process_image_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
        
        processing_type = data.get('processing_type', 'all')
        
        result = processor.process_image(data['image'], processing_type)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in process endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/detect-faces', methods=['POST'])
def detect_faces_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
        
        method = data.get('method', 'all')
        
        # Decode base64 image
        if ',' in data['image']:
            image_data = data['image'].split(',')[1]
        else:
            image_data = data['image']
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL image to OpenCV format
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Save temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"temp_face_detection_{timestamp}.jpg"
        temp_path = os.path.join("api_temp", filename)
        
        cv2.setErrorCallback(lambda e, f, l, n, error_message: None)
        cv2.imwrite(temp_path, image_cv)
        
        result = processor.detect_faces(temp_path, method)
        
        # Clean up temporary file
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in detect_faces endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/detect-landmarks', methods=['POST'])
def detect_landmarks_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({"error": "No image data provided"}), 400
        
        # Decode base64 image
        if ',' in data['image']:
            image_data = data['image'].split(',')[1]
        else:
            image_data = data['image']
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL image to OpenCV format
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Save temporary file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        filename = f"temp_landmarks_{timestamp}.jpg"
        temp_path = os.path.join("api_temp", filename)
        
        cv2.setErrorCallback(lambda e, f, l, n, error_message: None)
        cv2.imwrite(temp_path, image_cv)
        
        result = processor.detect_landmarks(temp_path)
        
        # Clean up temporary file
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in detect_landmarks endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/blur-regions', methods=['POST'])
def blur_regions_endpoint():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data or 'regions' not in data:
            return jsonify({"error": "Image data and regions required"}), 400
        
        blur_strength = data.get('blur_strength', 15)
        
        # Decode base64 image
        if ',' in data['image']:
            image_data = data['image'].split(',')[1]
        else:
            image_data = data['image']
        
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL image to OpenCV format
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Save temporary file
        timestamp = datetime.now().strftime(data['image'].split(',')[1])
        filename = f"temp_blur_{timestamp}.jpg"
        temp_path = os.path.join("api_temp", filename)
        
        cv2.setErrorCallback(lambda e, f, l, n, error_message: None)
        cv2.imwrite(temp_path, image_cv)
        
        result = processor.blur_regions(temp_path, data['regions'], blur_strength)
        
        # Clean up temporary file
        try:
            os.remove(temp_path)
        except:
            pass
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in blur_regions endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🚀 Starting SafeVision API Server...")
    print("📡 Host: 0.0.0.0")
    print("🔌 Port: 5001")
    print("🔍 NudeDetector loaded:", nude_detector is not None)
    app.run(host='0.0.0.0', port=5001, debug=False)