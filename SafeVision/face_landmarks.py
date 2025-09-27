import cv2
import dlib
import numpy as np
from typing import List, Tuple, Optional
import os

class FaceLandmarkDetector:
    def __init__(self, model_path: str = "Models/shape_predictor_68_face_landmarks.dat"):
        """Initialize face landmark detector."""
        self.model_path = model_path
        self.predictor = None
        self.detector = None
        self.initialized = False
        
        try:
            # Validate and secure the model path
            validated_path = self._validate_model_path(model_path)
            if validated_path and os.path.exists(validated_path):
                self.predictor = dlib.shape_predictor(validated_path)
                self.detector = dlib.get_frontal_face_detector()
                self.initialized = True
                print(f"✅ Face landmark detector initialized with model: {validated_path}")
            else:
                print(f"⚠️ Face landmark model not found at: {model_path}")
                print("Download with: wget https://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2")
                print("Then: bunzip2 shape_predictor_68_face_landmarks.dat.bz2")
        except Exception as e:
            print(f"❌ Error initializing face landmark detector: {e}")
            self.initialized = False
    
    def _validate_model_path(self, model_path: str) -> Optional[str]:
        """Validate and secure model path to prevent directory traversal attacks."""
        try:
            # Resolve to absolute normalized path
            abs_path = os.path.abspath(os.path.realpath(model_path))
            
            # Define allowed base models directory (project Models directory)
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            allowed_base = os.path.join(project_root, "Models")
            allowed_base = os.path.abspath(allowed_base)
            
            # Verify the resolved path is inside the allowed base directory
            try:
                common_path = os.path.commonpath([abs_path, allowed_base])
                if common_path != allowed_base:
                    print(f"❌ Security warning: Model path outside allowed directory: {model_path}")
                    print(f"   Resolved to: {abs_path}")
                    print(f"   Allowed base: {allowed_base}")
                    return None
            except ValueError:
                # commonpath raises ValueError if paths don't share a common parent
                print(f"❌ Security warning: Model path outside allowed directory: {model_path}")
                print(f"   Resolved to: {abs_path}")
                print(f"   Allowed base: {allowed_base}")
                return None
            
            # Check if the resolved file exists
            if not os.path.exists(abs_path):
                print(f"❌ Model file does not exist: {abs_path}")
                return None
            
            # Check if it's a file (not a directory)
            if not os.path.isfile(abs_path):
                print(f"❌ Model path is not a file: {abs_path}")
                return None
            
            return abs_path
            
        except Exception as e:
            print(f"❌ Error validating model path: {e}")
            return None
    
    def is_available(self) -> bool:
        """Check if landmark detection is available."""
        return self.initialized and self.predictor is not None
    
    def get_face_landmarks(self, image: np.ndarray, face_box: Tuple[int, int, int, int]) -> Optional[np.ndarray]:
        """Extract 68 facial landmarks from face region."""
        if not self.is_available():
            return None
            
        try:
            x, y, w, h = face_box
            # Ensure coordinates are within image bounds
            x = max(0, min(x, image.shape[1] - 1))
            y = max(0, min(y, image.shape[0] - 1))
            w = max(1, min(w, image.shape[1] - x))
            h = max(1, min(h, image.shape[0] - y))
            
            # Convert to dlib rectangle format
            dlib_rect = dlib.rectangle(x, y, x + w, y + h)
            
            # Get landmarks
            landmarks = self.predictor(image, dlib_rect)
            
            # Convert to numpy array
            points = np.array([[p.x, p.y] for p in landmarks.parts()])
            return points
            
        except Exception as e:
            print(f"❌ Error getting face landmarks: {e}")
            return None
    
    def create_face_mask(self, image_shape: Tuple[int, int], landmarks: np.ndarray, 
                        expansion_factor: float = 1.2) -> np.ndarray:
        """Create a mask covering the entire face including forehead."""
        try:
            mask = np.zeros(image_shape[:2], dtype=np.uint8)
            
            # Get face outline points (jawline + forehead approximation)
            face_outline = self._get_face_outline(landmarks, expansion_factor)
            
            # Fill the face area
            cv2.fillPoly(mask, [face_outline], 255)
            
            return mask
            
        except Exception as e:
            print(f"❌ Error creating face mask: {e}")
            return np.zeros(image_shape[:2], dtype=np.uint8)
    
    def _get_face_outline(self, landmarks: np.ndarray, expansion_factor: float) -> np.ndarray:
        """Create face outline using convex hull for proper closed contour."""
        try:
            print(f"🎭 Creating convex hull contour with {len(landmarks)} landmarks")
            
            # Get all relevant face boundary points
            jawline = landmarks[0:17]  # Points 0-16: jawline
            left_eyebrow = landmarks[17:22]  # Points 17-21: left eyebrow
            right_eyebrow = landmarks[22:27]  # Points 22-26: right eyebrow
            
            # Add some additional face boundary points for better coverage
            # Include some cheek points and temple points
            left_cheek = landmarks[31:36]  # Left side of nose/cheek area
            right_cheek = landmarks[48:68]  # Right side of face
            
            # Create forehead points and add them
            forehead_points = self._approximate_forehead(landmarks, expansion_factor)
            
            # Combine all face boundary points
            all_face_points = np.concatenate([
                jawline,
                left_eyebrow, 
                right_eyebrow,
                left_cheek,
                right_cheek,
                forehead_points
            ])
            
            print(f"🎭 Total face points for convex hull: {len(all_face_points)}")
            print(f"🎭 First few points: {all_face_points[:3]}")
            
            # Use OpenCV's convexHull to create a proper closed contour
            hull = cv2.convexHull(all_face_points.astype(np.int32))
            
            # Convert back to the format we need
            face_outline = hull.reshape(-1, 2)
            
            print(f"🎭 Convex hull created with {len(face_outline)} points")
            print(f"🎭 Hull points: {face_outline[:5]}...")
            
            return face_outline.astype(np.int32)
            
        except Exception as e:
            print(f"❌ Error creating convex hull contour: {e}")
            import traceback
            traceback.print_exc()
            
            # Fallback: Create a proper rectangular contour
            try:
                print("🎭 Falling back to rectangular contour...")
                # Get face bounds from landmarks
                all_points = landmarks
                min_x = int(np.min(all_points[:, 0]))
                max_x = int(np.max(all_points[:, 0]))
                min_y = int(np.min(all_points[:, 1]))
                max_y = int(np.max(all_points[:, 1]))
                
                # Add padding for forehead
                padding_x = int((max_x - min_x) * 0.1)
                padding_y = int((max_y - min_y) * 0.2)  # More padding for forehead
                
                min_x = max(0, min_x - padding_x)
                max_x = max_x + padding_x
                min_y = max(0, min_y - padding_y)
                max_y = max_y + padding_y
                
                # Create closed rectangular contour
                face_outline = np.array([
                    [min_x, min_y],  # Top-left
                    [max_x, min_y],  # Top-right
                    [max_x, max_y],  # Bottom-right
                    [min_x, max_y],  # Bottom-left
                    [min_x, min_y]   # Close the contour
                ])
                
                print(f"🎭 Fallback rectangular contour created: {face_outline.shape}")
                return face_outline.astype(np.int32)
                
            except Exception as fallback_error:
                print(f"❌ Fallback also failed: {fallback_error}")
                # Final fallback
                return np.array([[0, 0], [100, 0], [100, 100], [0, 100], [0, 0]], dtype=np.int32)
    
    def _approximate_forehead(self, landmarks: np.ndarray, expansion_factor: float) -> np.ndarray:
        """Approximate forehead area using eyebrow and eye positions."""
        try:
            # Get eyebrow center points
            left_eyebrow_center = np.mean(landmarks[17:22], axis=0)
            right_eyebrow_center = np.mean(landmarks[22:27], axis=0)
            
            # Calculate interpupillary distance for scaling
            left_eye_center = np.mean(landmarks[36:42], axis=0)  # Left eye points
            right_eye_center = np.mean(landmarks[42:48], axis=0)  # Right eye points
            interpupillary_distance = np.linalg.norm(right_eye_center - left_eye_center)
            
            # Calculate dynamic padding based on face size (20-30% of interpupillary distance)
            dynamic_padding = max(10, min(50, int(interpupillary_distance * 0.25)))
            
            # Calculate forehead height (realistic fraction of eyebrow-to-nose distance)
            eyebrow_y = (left_eyebrow_center[1] + right_eyebrow_center[1]) / 2
            nose_tip_y = landmarks[30][1]  # Nose tip point
            eyebrow_to_nose_distance = nose_tip_y - eyebrow_y
            
            # Use 30-40% of eyebrow-to-nose distance for forehead height
            forehead_height_fraction = 0.35  # 35% of eyebrow-to-nose distance
            forehead_height = max(20, min(100, int(eyebrow_to_nose_distance * forehead_height_fraction * expansion_factor)))
            
            # Create forehead points with dynamic padding
            forehead_top_y = max(0, int(eyebrow_y - forehead_height))
            forehead_left_x = max(0, int(left_eyebrow_center[0] - dynamic_padding))
            forehead_right_x = int(right_eyebrow_center[0] + dynamic_padding)
            
            forehead_points = np.array([
                [forehead_left_x, forehead_top_y],
                [forehead_right_x, forehead_top_y],
                [forehead_right_x, int(eyebrow_y)],
                [forehead_left_x, int(eyebrow_y)]
            ])
            
            return forehead_points
            
        except Exception as e:
            print(f"❌ Error approximating forehead: {e}")
            # Fallback to simple forehead approximation
            eyebrow_y = landmarks[19][1] if len(landmarks) > 19 else landmarks[0][1]
            return np.array([
                [landmarks[0][0], max(0, int(eyebrow_y - 50))],
                [landmarks[16][0], max(0, int(eyebrow_y - 50))],
                [landmarks[16][0], int(eyebrow_y)],
                [landmarks[0][0], int(eyebrow_y)]
            ], dtype=np.int32)
    
    def detect_faces_and_landmarks(self, image: np.ndarray) -> List[dict]:
        """Detect faces and extract landmarks for each face."""
        if not self.is_available():
            return []
            
        try:
            # Convert to grayscale for face detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect faces
            faces = self.detector(gray)
            
            results = []
            for face in faces:
                # Convert dlib rectangle to our format
                x, y, w, h = face.left(), face.top(), face.width(), face.height()
                
                # Get landmarks
                landmarks = self.get_face_landmarks(image, (x, y, w, h))
                
                if landmarks is not None:
                    results.append({
                        'box': [x, y, w, h],
                        'landmarks': landmarks,
                        'confidence': 1.0  # dlib doesn't provide confidence
                    })
            
            return results
            
        except Exception as e:
            print(f"❌ Error detecting faces and landmarks: {e}")
            return []
    
    def apply_landmark_blur(self, image: np.ndarray, landmarks: np.ndarray, 
                           blur_intensity: int, expansion_factor: float = 1.2) -> np.ndarray:
        """Apply blur using face landmark mask."""
        try:
            # Create face mask
            face_mask = self.create_face_mask(image.shape, landmarks, expansion_factor)
            
            # Calculate blur parameters based on intensity
            kernel_x, kernel_y, sigma = self._get_blur_parameters(blur_intensity)
            
            # Apply blur to entire image
            blurred_image = cv2.GaussianBlur(image, (kernel_x, kernel_y), sigma)
            
            # Apply blur only where mask is white
            result_image = image.copy()
            result_image[face_mask == 255] = blurred_image[face_mask == 255]
            
            return result_image
            
        except Exception as e:
            print(f"❌ Error applying landmark blur: {e}")
            return image
    
    def _get_blur_parameters(self, blur_intensity: int) -> Tuple[int, int, int]:
        """Get blur kernel parameters based on intensity (0-100)."""
        if blur_intensity <= 0:
            return 1, 1, 0
        elif blur_intensity <= 10:
            return 5, 5, 5
        elif blur_intensity <= 20:
            return 9, 9, 8
        elif blur_intensity <= 30:
            return 13, 13, 12
        elif blur_intensity <= 40:
            return 17, 17, 16
        elif blur_intensity <= 50:
            return 23, 23, 30
        elif blur_intensity <= 60:
            return 27, 27, 35
        elif blur_intensity <= 70:
            return 31, 31, 50
        elif blur_intensity <= 80:
            return 45, 45, 60
        elif blur_intensity <= 90:
            return 65, 65, 70
        else:
            return 99, 99, 75
