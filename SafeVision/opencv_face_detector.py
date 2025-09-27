"""
OpenCV DNN Face Detector for SafeVision
Provides better face detection with improved bounding boxes that include the forehead.
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional, Dict
import os


class OpenCVFaceDetector:
    """OpenCV DNN-based face detection with improved bounding boxes."""
    
    def __init__(self):
        """Initialize OpenCV DNN face detection."""
        self.net = None
        self.initialized = False
        
        try:
            # Load the DNN face detection model
            # Using OpenCV's built-in DNN face detection
            model_path = "Models/opencv_face_detector_uint8.pb"
            config_path = "Models/opencv_face_detector.pbtxt"
            
            if os.path.exists(model_path) and os.path.exists(config_path):
                self.net = cv2.dnn.readNetFromTensorflow(model_path, config_path)
                self.initialized = True
                print("✅ OpenCV DNN face detector initialized successfully")
            else:
                print("⚠️ OpenCV DNN model files not found, using Haar cascade fallback")
                # Fallback to Haar cascade
                self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                self.initialized = True
                print("✅ OpenCV Haar cascade face detector initialized")
                
        except Exception as e:
            print(f"❌ Error initializing OpenCV face detector: {e}")
            # Fallback to Haar cascade
            try:
                self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                self.initialized = True
                print("✅ OpenCV Haar cascade face detector initialized (fallback)")
            except Exception as e2:
                print(f"❌ Fallback also failed: {e2}")
                self.initialized = False
    
    def is_available(self) -> bool:
        """Check if OpenCV face detector is available and working."""
        return self.initialized
    
    def detect_faces(self, image: np.ndarray) -> List[Dict]:
        """Detect faces in the image and return bounding boxes with improved coverage."""
        try:
            faces = []
            h, w = image.shape[:2]
            
            if self.net is not None:
                # Use DNN model
                blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), [104, 117, 123])
                self.net.setInput(blob)
                detections = self.net.forward()
                
                for i in range(detections.shape[2]):
                    confidence = detections[0, 0, i, 2]
                    if confidence > 0.5:  # Confidence threshold
                        # Get bounding box coordinates
                        x1 = int(detections[0, 0, i, 3] * w)
                        y1 = int(detections[0, 0, i, 4] * h)
                        x2 = int(detections[0, 0, i, 5] * w)
                        y2 = int(detections[0, 0, i, 6] * h)
                        
                        # Convert to (x, y, w, h) format
                        x = max(0, x1)
                        y = max(0, y1)
                        width = max(0, x2 - x1)
                        height = max(0, y2 - y1)
                        
                        faces.append({
                            'bbox': (x, y, width, height),
                            'confidence': confidence
                        })
            else:
                # Use Haar cascade
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                face_rects = self.face_cascade.detectMultiScale(gray, 1.1, 4)
                
                for (x, y, w, h) in face_rects:
                    faces.append({
                        'bbox': (x, y, w, h),
                        'confidence': 1.0  # Haar cascade doesn't provide confidence
                    })
            
            # Improve bounding boxes to include forehead
            improved_faces = []
            for face in faces:
                x, y, w, h = face['bbox']
                
                # Expand the bounding box to include forehead
                # Extend 50% upward and increase height by 50%
                expanded_y = max(0, int(y - h * 0.5))  # Extend 50% upward
                expanded_h = int(h * 1.5)  # Increase height by 50%
                
                # Ensure coordinates are within image bounds
                expanded_y = max(0, expanded_y)
                expanded_h = min(expanded_h, h - expanded_y)
                
                # Ensure height is positive
                if expanded_h <= 0:
                    expanded_h = h
                    expanded_y = y
                
                improved_faces.append({
                    'bbox': (x, expanded_y, w, expanded_h),
                    'confidence': face['confidence'],
                    'original_bbox': face['bbox']  # Keep original for reference
                })
            
            print(f"🎭 Detected {len(faces)} faces, improved to {len(improved_faces)} with forehead coverage")
            return improved_faces
            
        except Exception as e:
            print(f"❌ Error detecting faces: {e}")
            return []
    
    def create_face_mask(self, image: np.ndarray, face_bbox: Tuple[int, int, int, int], expansion_factor: float = 1.2) -> np.ndarray:
        """Create a face mask using the improved bounding box."""
        try:
            print(f"🎭 Creating OpenCV face mask with bbox {face_bbox}")
            
            # Create mask
            mask = np.zeros(image.shape[:2], dtype=np.uint8)
            
            x, y, w, h = face_bbox
            
            # Convert numpy types to regular ints
            x = int(x)
            y = int(y)
            w = int(w)
            h = int(h)
            
            # Ensure coordinates are within image bounds
            x = max(0, min(x, image.shape[1]))
            y = max(0, min(y, image.shape[0]))
            w = max(0, min(w, image.shape[1] - x))
            h = max(0, min(h, image.shape[0] - y))
            
            print(f"🎭 Processed bbox: x={x}, y={y}, w={w}, h={h}")
            
            if w > 0 and h > 0:
                # Create a simple rectangular mask
                # For better coverage, we can make it slightly oval-shaped
                center_x = x + w // 2
                center_y = y + h // 2
                
                # Create an oval mask for more natural face shape
                axes_x = int(w * 0.5)
                axes_y = int(h * 0.5)
                
                cv2.ellipse(mask, (center_x, center_y), (axes_x, axes_y), 0, 0, 360, 255, -1)
                
                print(f"🎭 Face mask created: center=({center_x}, {center_y}), axes=({axes_x}, {axes_y})")
            else:
                print("⚠️ Invalid face bounding box, creating empty mask")
            
            return mask
            
        except Exception as e:
            print(f"❌ Error creating face mask: {e}")
            import traceback
            traceback.print_exc()
            return np.zeros(image.shape[:2], dtype=np.uint8)
    
    def get_face_detection_info(self) -> Dict:
        """Get information about OpenCV face detection."""
        return {
            "method": "OpenCV DNN" if self.net is not None else "Haar Cascade",
            "coverage": "Improved bounding boxes including forehead area",
            "accuracy": "High - OpenCV's optimized models",
            "speed": "Fast - optimized for real-time",
            "features": [
                "Better face bounding boxes",
                "Forehead coverage included",
                "Multiple face detection",
                "Confidence scoring",
                "Fallback to Haar cascade"
            ]
        }


def test_opencv_detection():
    """Test OpenCV face detection."""
    try:
        detector = OpenCVFaceDetector()
        
        if not detector.is_available():
            print("❌ OpenCV face detector not available")
            return False
        
        # Load a test image
        test_image_path = "input/1.jpg"
        if os.path.exists(test_image_path):
            image = cv2.imread(test_image_path)
            if image is not None:
                print(f"📸 Testing with image: {test_image_path}")
                
                # Detect faces
                faces = detector.detect_faces(image)
                print(f"👥 Detected {len(faces)} faces")
                
                for i, face in enumerate(faces):
                    print(f"Face {i+1}: bbox={face['bbox']}, confidence={face['confidence']:.3f}")
                    if 'original_bbox' in face:
                        print(f"  Original bbox: {face['original_bbox']}")
                    
                    # Create mask
                    mask = detector.create_face_mask(image, face['bbox'])
                    print(f"🎭 Face {i+1}: mask created with {np.sum(mask > 0)} pixels")
                
                return True
            else:
                print("❌ Could not load test image")
                return False
        else:
            print("❌ Test image not found")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🧪 Testing OpenCV face detection...")
    test_opencv_detection()
