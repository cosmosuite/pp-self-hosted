"""
SafeVision Compute - Face Landmark Service
Uses dlib's 68-point shape predictor to produce real face contour polygons.
For non-face body parts, generates elliptical contour approximations.
"""

import os
import math
import bz2
import shutil
import logging
import urllib.request
from typing import List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("safevision.face_landmarks")

MODEL_FILENAME = "shape_predictor_68_face_landmarks.dat"
MODEL_URL = "https://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"


def _get_model_path(model_dir: str) -> str:
    return os.path.join(model_dir, MODEL_FILENAME)


def _download_dlib_model(model_dir: str) -> bool:
    model_path = _get_model_path(model_dir)
    if os.path.exists(model_path):
        return True
    os.makedirs(model_dir, exist_ok=True)
    bz2_path = model_path + ".bz2"
    try:
        logger.info(f"Downloading dlib face landmark model from {MODEL_URL} ...")
        urllib.request.urlretrieve(MODEL_URL, bz2_path)
        logger.info("Extracting model...")
        with bz2.BZ2File(bz2_path, "rb") as src, open(model_path, "wb") as dst:
            shutil.copyfileobj(src, dst)
        os.remove(bz2_path)
        logger.info(f"dlib model ready at {model_path} ({os.path.getsize(model_path) // 1024 // 1024} MB)")
        return True
    except Exception as e:
        logger.error(f"Failed to download dlib model: {e}")
        for p in [bz2_path, model_path]:
            if os.path.exists(p):
                os.remove(p)
        return False


class FaceLandmarkService:
    def __init__(self):
        self._predictor = None
        self._detector = None
        self._initialized = False

    def _ensure_initialized(self):
        if self._initialized:
            return
        self._initialized = True
        try:
            import dlib
            from app.config import settings
            model_dir = getattr(settings, "model_dir", "models")
            model_path = _get_model_path(model_dir)
            if not os.path.exists(model_path):
                _download_dlib_model(model_dir)
            if os.path.exists(model_path):
                self._predictor = dlib.shape_predictor(model_path)
                self._detector = dlib.get_frontal_face_detector()
                logger.info(f"dlib 68-point face landmark detector initialized ({model_path})")
            else:
                logger.warning("dlib shape predictor model not found. Contour blur will use ellipse fallback.")
        except ImportError:
            logger.warning("dlib not installed. Contour blur will use ellipse fallback.")
        except Exception as e:
            logger.warning(f"dlib init failed: {e}. Contour blur will use ellipse fallback.")

    @property
    def available(self) -> bool:
        self._ensure_initialized()
        return self._predictor is not None and self._detector is not None

    def get_face_contour(
        self,
        image_bgr: np.ndarray,
        face_bbox: Tuple[int, int, int, int],
        expansion: float = 1.2,
    ) -> Optional[List[List[int]]]:
        self._ensure_initialized()
        if self._predictor is None:
            return None
        import dlib
        try:
            x, y, w, h = face_bbox
            img_h, img_w = image_bgr.shape[:2]
            x = max(0, min(x, img_w - 1))
            y = max(0, min(y, img_h - 1))
            w = max(1, min(w, img_w - x))
            h = max(1, min(h, img_h - y))

            dlib_rect = dlib.rectangle(x, y, x + w, y + h)
            shape = self._predictor(image_bgr, dlib_rect)
            landmarks = np.array([[p.x, p.y] for p in shape.parts()])
            if len(landmarks) < 68:
                return None

            jawline = landmarks[0:17]
            left_eyebrow = landmarks[17:22]
            right_eyebrow = landmarks[22:27]
            nose_cheek = landmarks[31:36]
            mouth_area = landmarks[48:68]
            forehead_points = self._approximate_forehead(landmarks, expansion)

            all_points = np.concatenate([
                jawline, left_eyebrow, right_eyebrow,
                nose_cheek, mouth_area, forehead_points,
            ])
            hull = cv2.convexHull(all_points.astype(np.int32))
            contour = hull.reshape(-1, 2)
            contour[:, 0] = np.clip(contour[:, 0], 0, img_w - 1)
            contour[:, 1] = np.clip(contour[:, 1], 0, img_h - 1)
            return contour.tolist()
        except Exception as e:
            logger.warning(f"dlib face landmark detection failed: {e}")
            return None

    @staticmethod
    def _approximate_forehead(landmarks: np.ndarray, expansion_factor: float) -> np.ndarray:
        try:
            left_eyebrow_center = np.mean(landmarks[17:22], axis=0)
            right_eyebrow_center = np.mean(landmarks[22:27], axis=0)
            left_eye_center = np.mean(landmarks[36:42], axis=0)
            right_eye_center = np.mean(landmarks[42:48], axis=0)
            interpupillary = np.linalg.norm(right_eye_center - left_eye_center)
            dynamic_padding = max(10, min(50, int(interpupillary * 0.25)))
            eyebrow_y = (left_eyebrow_center[1] + right_eyebrow_center[1]) / 2
            nose_tip_y = landmarks[30][1]
            eyebrow_to_nose = nose_tip_y - eyebrow_y
            forehead_height = max(20, min(100, int(eyebrow_to_nose * 0.35 * expansion_factor)))
            forehead_top_y = max(0, int(eyebrow_y - forehead_height))
            forehead_left_x = max(0, int(left_eyebrow_center[0] - dynamic_padding))
            forehead_right_x = int(right_eyebrow_center[0] + dynamic_padding)
            return np.array([
                [forehead_left_x, forehead_top_y],
                [forehead_right_x, forehead_top_y],
                [forehead_right_x, int(eyebrow_y)],
                [forehead_left_x, int(eyebrow_y)],
            ])
        except Exception:
            eyebrow_y = landmarks[19][1] if len(landmarks) > 19 else landmarks[0][1]
            return np.array([
                [landmarks[0][0], max(0, int(eyebrow_y - 50))],
                [landmarks[16][0], max(0, int(eyebrow_y - 50))],
                [landmarks[16][0], int(eyebrow_y)],
                [landmarks[0][0], int(eyebrow_y)],
            ], dtype=np.int32)

    @staticmethod
    def generate_elliptical_contour(
        bbox: dict,
        num_points: int = 36,
        img_width: int = 99999,
        img_height: int = 99999,
    ) -> List[List[int]]:
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


face_landmark_service = FaceLandmarkService()
