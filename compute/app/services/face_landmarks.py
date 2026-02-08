"""
SafeVision Compute - Face Landmark Service
Uses Google MediaPipe FaceLandmarker (Tasks API, 478 landmarks) with
FACE_OVAL indices for precise face contour polygons.
For non-face body parts, generates elliptical contours.
"""

import os
import math
import logging
import urllib.request
from typing import List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("safevision.face_landmarks")


# ── MediaPipe FACE_OVAL landmark indices in connected order ──────────────────
# These 36 points trace the face boundary:
#   forehead → right temple → right jaw → chin → left jaw → left temple → forehead
# Derived from the FACEMESH_FACE_OVAL connection set.
FACE_OVAL_ORDERED = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
]

# MediaPipe FaceLandmarker model (Tasks API)
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/"
    "face_landmarker/face_landmarker/float16/1/face_landmarker.task"
)
MODEL_FILENAME = "face_landmarker.task"


class FaceLandmarkService:
    """
    Face contour detection using Google MediaPipe FaceLandmarker (Tasks API).
    478 landmarks per face, FACE_OVAL gives 36 ordered boundary points.
    """

    def __init__(self):
        self._landmarker = None
        self._initialized = False
        self._available = False

    def _ensure_model(self, model_dir: str) -> Optional[str]:
        """Download the FaceLandmarker .task model if not present."""
        model_path = os.path.join(model_dir, MODEL_FILENAME)
        if os.path.exists(model_path):
            return model_path
        os.makedirs(model_dir, exist_ok=True)
        try:
            logger.info(f"Downloading MediaPipe FaceLandmarker model...")
            urllib.request.urlretrieve(MODEL_URL, model_path)
            size_mb = os.path.getsize(model_path) / (1024 * 1024)
            logger.info(f"FaceLandmarker model downloaded ({size_mb:.1f} MB)")
            return model_path
        except Exception as e:
            logger.error(f"Failed to download FaceLandmarker model: {e}")
            if os.path.exists(model_path):
                os.remove(model_path)
            return None

    def _ensure_initialized(self):
        if self._initialized:
            return
        self._initialized = True
        try:
            import mediapipe as mp
            from mediapipe.tasks import python as mp_tasks
            from mediapipe.tasks.python import vision as mp_vision

            # Determine model directory
            try:
                from app.config import settings
                model_dir = getattr(settings, "model_dir", "models")
            except Exception:
                model_dir = "models"

            model_path = self._ensure_model(model_dir)
            if model_path is None:
                logger.warning("FaceLandmarker model not available.")
                return

            base_options = mp_tasks.BaseOptions(
                model_asset_path=model_path
            )
            options = mp_vision.FaceLandmarkerOptions(
                base_options=base_options,
                num_faces=20,
                min_face_detection_confidence=0.25,
                min_face_presence_confidence=0.25,
                min_tracking_confidence=0.25,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
            )
            self._landmarker = mp_vision.FaceLandmarker.create_from_options(
                options
            )
            self._available = True
            logger.info(
                "MediaPipe FaceLandmarker initialized "
                "(Tasks API, 478 landmarks, FACE_OVAL contour)"
            )
        except ImportError as e:
            logger.warning(
                f"mediapipe not installed or import error: {e}. "
                "Face contour will use ellipse fallback."
            )
        except Exception as e:
            logger.warning(
                f"MediaPipe FaceLandmarker init failed: {e}. "
                "Using ellipse fallback."
            )

    @property
    def available(self) -> bool:
        self._ensure_initialized()
        return self._available

    # ── Full-image face landmark detection ────────────────────────────────

    def get_all_face_contours(
        self,
        image_bgr: np.ndarray,
    ) -> List[List[List[int]]]:
        """
        Process the full image with MediaPipe FaceLandmarker and return
        FACE_OVAL contours for every detected face.
        Each contour is 36 [x, y] points forming a closed polygon.
        """
        self._ensure_initialized()
        if not self._available or self._landmarker is None:
            return []

        try:
            import mediapipe as mp

            img_h, img_w = image_bgr.shape[:2]
            rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

            # Create MediaPipe Image from numpy array
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb,
            )

            # Run detection
            result = self._landmarker.detect(mp_image)

            if not result.face_landmarks:
                logger.debug("MediaPipe: no faces detected in image")
                return []

            all_contours = []
            for face_lm in result.face_landmarks:
                # Extract raw FACE_OVAL points in pixel coordinates
                raw_points = []
                for idx in FACE_OVAL_ORDERED:
                    lm = face_lm[idx]
                    px = max(0, min(int(lm.x * img_w), img_w - 1))
                    py = max(0, min(int(lm.y * img_h), img_h - 1))
                    raw_points.append([px, py])

                # Extend forehead: MediaPipe FACE_OVAL stops at the
                # skin boundary (eyebrow/hairline area). For full face
                # anonymization we push the upper points upward.
                extended = self._extend_forehead(raw_points, img_h)
                all_contours.append(extended)

            logger.info(
                f"MediaPipe: detected {len(all_contours)} face(s) "
                f"with {len(FACE_OVAL_ORDERED)}-point contours (forehead-extended)"
            )
            return all_contours

        except Exception as e:
            logger.warning(f"MediaPipe face detection failed: {e}")
            import traceback
            traceback.print_exc()
            return []

    # ── Forehead extension ─────────────────────────────────────────────────

    @staticmethod
    def _extend_forehead(
        contour_points: List[List[int]],
        img_h: int,
    ) -> List[List[int]]:
        """
        Extend the upper portion of the FACE_OVAL upward to cover the
        full forehead. MediaPipe's oval traces the skin boundary which
        stops around the eyebrows/hairline. For anonymization we need
        to cover up to the top of the forehead.

        Approach:
        - Identify the "eye level" (roughly 35% down from the oval top).
        - Any oval point ABOVE eye level gets pushed upward.
        - Push amount is proportional to how close the point is to the
          top of the oval (top-center gets max push, temples get less).
        - Jawline and lower face are left completely untouched.
        """
        pts = np.array(contour_points, dtype=np.float64)

        min_y = float(np.min(pts[:, 1]))
        max_y = float(np.max(pts[:, 1]))
        face_h = max_y - min_y

        if face_h < 10:
            return contour_points

        # Eye level: ~35% down from the top of the current oval
        eye_level = min_y + face_h * 0.35

        # How much to extend: 25% of the face height
        max_extension = face_h * 0.25

        for i in range(len(pts)):
            y = pts[i][1]
            if y < eye_level:
                # t = 0 at eye level, t = 1 at the very top of the oval
                t = (eye_level - y) / (eye_level - min_y) if eye_level > min_y else 0.0
                t = min(1.0, max(0.0, t))
                # Smooth curve: more extension at the top, gentle near eyes
                push = max_extension * (t ** 0.6)
                pts[i][1] = max(0, y - push)

        return pts.astype(np.int32).tolist()

    # ── Match a detection bbox to the closest face contour ────────────────

    @staticmethod
    def match_contour_to_bbox(
        contours: List[List[List[int]]],
        bbox: Tuple[int, int, int, int],
        max_distance: float = 500.0,
    ) -> Optional[List[List[int]]]:
        """
        Match a detection bounding box to the nearest MediaPipe face contour
        by center-point distance.
        """
        if not contours:
            return None

        bx, by, bw, bh = bbox
        bcx = bx + bw / 2.0
        bcy = by + bh / 2.0

        best_contour = None
        best_dist = float("inf")

        for contour in contours:
            pts = np.array(contour)
            ccx = float(np.mean(pts[:, 0]))
            ccy = float(np.mean(pts[:, 1]))
            dist = math.sqrt((bcx - ccx) ** 2 + (bcy - ccy) ** 2)
            if dist < best_dist:
                best_dist = dist
                best_contour = contour

        if best_dist > max_distance:
            logger.debug(
                f"No contour match within {max_distance}px "
                f"(closest: {best_dist:.0f}px)"
            )
            return None

        logger.debug(f"Matched face contour at distance {best_dist:.0f}px")
        return best_contour

    # ── Legacy single-face API ────────────────────────────────────────────

    def get_face_contour(
        self,
        image_bgr: np.ndarray,
        face_bbox: Tuple[int, int, int, int],
        expansion: float = 1.2,
    ) -> Optional[List[List[int]]]:
        """Get face contour for a specific bbox (runs full-image detection)."""
        contours = self.get_all_face_contours(image_bgr)
        return self.match_contour_to_bbox(contours, face_bbox)

    # ── Elliptical fallback for non-face body parts ───────────────────────

    @staticmethod
    def generate_elliptical_contour(
        bbox: dict,
        num_points: int = 36,
        img_width: int = 99999,
        img_height: int = 99999,
    ) -> List[List[int]]:
        """Generate an elliptical contour approximation from a bounding box."""
        cx = bbox["x"] + bbox["width"] / 2
        cy = bbox["y"] + bbox["height"] / 2
        rx = bbox["width"] / 2
        ry = bbox["height"] / 2
        points = []
        for i in range(num_points):
            angle = 2 * math.pi * i / num_points
            px = int(cx + rx * math.cos(angle))
            py = int(cy + ry * math.sin(angle))
            px = max(0, min(px, img_width - 1))
            py = max(0, min(py, img_height - 1))
            points.append([px, py])
        return points


# Singleton
face_landmark_service = FaceLandmarkService()
