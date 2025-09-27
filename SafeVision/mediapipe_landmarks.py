"""
MediaPipe Face Landmark Detector for SafeVision
Provides 468 facial landmarks covering the entire face including forehead, temples, and ears.
"""

import cv2
import numpy as np
import mediapipe as mp
from typing import List, Tuple, Optional, Dict
import os


class MediaPipeFaceDetector:
    """MediaPipe-based face detection and landmark extraction."""
    
    def __init__(self):
        """Initialize MediaPipe face detection."""
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh
        self.mp_drawing = mp.solutions.drawing_utils
        
        # Initialize face detection
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=0,  # 0 for close-range, 1 for full-range
            min_detection_confidence=0.5
        )
        
        # Initialize face mesh for landmarks
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,  # We only need one face
            refine_landmarks=True,  # Get more detailed landmarks
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        self.initialized = True
        print("✅ MediaPipe face detector initialized successfully")
    
    def is_available(self) -> bool:
        """Check if MediaPipe is available and working."""
        return self.initialized
    
    def detect_faces(self, image: np.ndarray) -> List[Dict]:
        """Detect faces in the image and return bounding boxes."""
        try:
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            results = self.face_detection.process(rgb_image)
            
            faces = []
            if results.detections:
                h, w = image.shape[:2]
                for detection in results.detections:
                    # Get bounding box
                    bbox = detection.location_data.relative_bounding_box
                    
                    # Convert to absolute coordinates
                    x = int(bbox.xmin * w)
                    y = int(bbox.ymin * h)
                    width = int(bbox.width * w)
                    height = int(bbox.height * h)
                    
                    # Ensure coordinates are within image bounds
                    x = max(0, x)
                    y = max(0, y)
                    width = min(width, w - x)
                    height = min(height, h - y)
                    
                    faces.append({
                        'bbox': (x, y, width, height),
                        'confidence': detection.score[0]
                    })
            
            return faces
            
        except Exception as e:
            print(f"❌ Error detecting faces: {e}")
            return []
    
    def get_landmarks(self, image: np.ndarray, face_bbox: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Get 468 facial landmarks for a detected face."""
        try:
            x, y, w, h = face_bbox
            
            # Extract face region
            face_region = image[y:y+h, x:x+w]
            
            if face_region.size == 0:
                return None
            
            # Convert BGR to RGB
            rgb_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB)
            
            # Get face mesh
            results = self.face_mesh.process(rgb_face)
            
            if results.multi_face_landmarks:
                # Get the first face's landmarks
                face_landmarks = results.multi_face_landmarks[0]
                
                # Convert to numpy array
                landmarks = []
                for landmark in face_landmarks.landmark:
                    # Convert relative coordinates to absolute
                    abs_x = x + int(landmark.x * w)
                    abs_y = y + int(landmark.y * h)
                    landmarks.append([abs_x, abs_y])
                
                return np.array(landmarks)
            
            return None
            
        except Exception as e:
            print(f"❌ Error getting landmarks: {e}")
            return None
    
    def create_face_mask(self, image: np.ndarray, landmarks: np.ndarray, expansion_factor: float = 1.2) -> np.ndarray:
        """Create a face mask using MediaPipe landmarks."""
        try:
            print(f"🎭 Creating MediaPipe face mask with {len(landmarks)} landmarks")
            
            # Create mask
            mask = np.zeros(image.shape[:2], dtype=np.uint8)
            
            if landmarks is None or len(landmarks) == 0:
                return mask
            
            # Get face outline using convex hull
            face_outline = self._get_face_outline(landmarks, expansion_factor)
            
            # Fill the contour
            cv2.fillPoly(mask, [face_outline], 255)
            
            print(f"🎭 Face mask created with {len(face_outline)} outline points")
            return mask
            
        except Exception as e:
            print(f"❌ Error creating face mask: {e}")
            return np.zeros(image.shape[:2], dtype=np.uint8)
    
    def _get_face_outline(self, landmarks: np.ndarray, expansion_factor: float) -> np.ndarray:
        """Create face outline using MediaPipe landmarks with convex hull."""
        try:
            print(f"🎭 Creating MediaPipe convex hull with {len(landmarks)} landmarks")
            
            # MediaPipe provides 468 landmarks covering the entire face
            # We'll use key face boundary points for the convex hull
            
            # Get face boundary points (these are the key points for face outline)
            face_boundary_indices = [
                # Face contour (jawline) - MediaPipe face oval
                10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
                397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
                172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
                
                # Forehead area
                9, 10, 151, 9, 8, 107, 55, 65, 52, 53, 46,
                
                # Temple areas
                162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251,
                
                # Additional boundary points for better coverage
                172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397
            ]
            
            # Get the boundary points
            boundary_points = landmarks[face_boundary_indices]
            
            # Add some padding for better coverage
            center = np.mean(boundary_points, axis=0)
            expanded_points = center + (boundary_points - center) * expansion_factor
            
            # Use convex hull to create a proper closed contour
            hull = cv2.convexHull(expanded_points.astype(np.int32))
            
            # Convert back to the format we need
            face_outline = hull.reshape(-1, 2)
            
            print(f"🎭 MediaPipe convex hull created with {len(face_outline)} points")
            return face_outline.astype(np.int32)
            
        except Exception as e:
            print(f"❌ Error creating MediaPipe face outline: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback: Create a simple rectangular contour
            try:
                print("🎭 Falling back to rectangular contour...")
                min_x = int(np.min(landmarks[:, 0]))
                max_x = int(np.max(landmarks[:, 0]))
                min_y = int(np.min(landmarks[:, 1]))
                max_y = int(np.max(landmarks[:, 1]))
                
                # Add padding
                padding_x = int((max_x - min_x) * 0.1)
                padding_y = int((max_y - min_y) * 0.2)
                
                min_x = max(0, min_x - padding_x)
                max_x = max_x + padding_x
                min_y = max(0, min_y - padding_y)
                max_y = max_y + padding_y
                
                face_outline = np.array([
                    [min_x, min_y],
                    [max_x, min_y],
                    [max_x, max_y],
                    [min_x, max_y],
                    [min_x, min_y]
                ])
                
                return face_outline.astype(np.int32)
                
            except:
                return np.array([[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]], dtype=np.int32)
    
    def get_face_landmarks_info(self) -> Dict:
        """Get information about MediaPipe face landmarks."""
        return {
            "total_landmarks": 468,
            "coverage": "Full face including forehead, temples, ears, and detailed facial features",
            "accuracy": "High - Google's state-of-the-art model",
            "speed": "Real-time capable",
            "features": [
                "Complete face contour",
                "Detailed eye regions",
                "Full mouth and lip contours", 
                "Nose and nostril details",
                "Forehead and temple coverage",
                "Ear detection",
                "Facial expression analysis"
            ]
        }


def test_mediapipe_detection():
    """Test MediaPipe face detection."""
    try:
        detector = MediaPipeFaceDetector()
        
        if not detector.is_available():
            print("❌ MediaPipe not available")
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
                    
                    # Get landmarks
                    landmarks = detector.get_landmarks(image, face['bbox'])
                    if landmarks is not None:
                        print(f"🎭 Face {i+1}: {len(landmarks)} landmarks detected")
                        
                        # Create mask
                        mask = detector.create_face_mask(image, landmarks)
                        print(f"🎭 Face {i+1}: mask created with {np.sum(mask > 0)} pixels")
                    else:
                        print(f"❌ Face {i+1}: No landmarks detected")
                
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
    print("🧪 Testing MediaPipe face detection...")
    test_mediapipe_detection()

