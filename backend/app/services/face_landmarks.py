"""
SafeVision API - Face Landmark Service
Uses MediaPipe Face Mesh (468 landmarks) to produce real face contour polygons.
For non-face body parts, generates elliptical contour approximations.
"""

import math
import logging
from typing import List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger("safevision.face_landmarks")

# ─── MediaPipe face boundary landmark indices ────────────────────────────────
# These cover the face oval (jawline), forehead, and temple areas.
# When we take the convex hull of these points we get a tight face contour.

FACE_BOUNDARY_INDICES = [
    # Face oval / jawline
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
    397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
    172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
    # Forehead area
    9, 151, 8, 107, 55, 65, 52, 53, 46,
    # Temple areas (left + right)
    162, 21, 54, 103, 67, 109, 10, 338, 297, 332, 284, 251,
    # Additional jawline coverage
    172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397,
]


class FaceLandmarkService:
    """
    Extracts face contour polygons using MediaPipe Face Mesh.
    Also generates elliptical contours for non-face body parts.
    """

    def __init__(self):
        self._face_mesh = None
        self._initialized = False

    def _ensure_initialized(self):
        """Lazy-init MediaPipe so we don't import it at module load time."""
        if self._initialized:
            return
        try:
            import mediapipe as mp
            self._face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=10,
                refine_landmarks=True,
                min_detection_confidence=0.3,
                min_tracking_confidence=0.3,
            )
            self._initialized = True
            logger.info("MediaPipe Face Mesh initialized (468 landmarks)")
        except Exception as e:
            logger.warning(f"MediaPipe Face Mesh init failed: {e}. Contour blur will use ellipse fallback.")
            self._initialized = True  # Don't retry on every call
            self._face_mesh = None

    @property
    def available(self) -> bool:
        self._ensure_initialized()
        return self._face_mesh is not None

    # ── Face contour via MediaPipe ────────────────────────────────────────────

    def get_face_contour(
        self,
        image_bgr: np.ndarray,
        face_bbox: Tuple[int, int, int, int],
        expansion: float = 1.15,
    ) -> Optional[List[List[int]]]:
        """
        Given the original BGR image and a face bounding box (x, y, w, h),
        run MediaPipe Face Mesh on the face region and return a convex hull
        polygon [[x1,y1], [x2,y2], ...] in *original image* coordinates.

        Returns None if detection fails.
        """
        self._ensure_initialized()
        if self._face_mesh is None:
            return None

        x, y, w, h = face_bbox
        img_h, img_w = image_bgr.shape[:2]

        # Add generous padding so MediaPipe has enough context
        pad_x = int(w * 0.3)
        pad_y = int(h * 0.3)
        crop_x1 = max(0, x - pad_x)
        crop_y1 = max(0, y - pad_y)
        crop_x2 = min(img_w, x + w + pad_x)
        crop_y2 = min(img_h, y + h + pad_y)

        face_region = image_bgr[crop_y1:crop_y2, crop_x1:crop_x2]
        if face_region.size == 0:
            return None

        # MediaPipe needs RGB
        rgb = cv2.cvtColor(face_region, cv2.COLOR_BGR2RGB)
        results = self._face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return None

        # Use first detected face mesh
        face_lm = results.multi_face_landmarks[0]
        region_h, region_w = face_region.shape[:2]

        # Collect boundary landmark points in original image coords
        boundary_pts = []
        for idx in FACE_BOUNDARY_INDICES:
            if idx >= len(face_lm.landmark):
                continue
            lm = face_lm.landmark[idx]
            abs_x = crop_x1 + int(lm.x * region_w)
            abs_y = crop_y1 + int(lm.y * region_h)
            boundary_pts.append([abs_x, abs_y])

        if len(boundary_pts) < 3:
            return None

        pts = np.array(boundary_pts, dtype=np.int32)

        # Apply expansion around centroid
        center = np.mean(pts, axis=0)
        expanded = center + (pts - center) * expansion
        expanded = expanded.astype(np.int32)

        # Clamp to image bounds
        expanded[:, 0] = np.clip(expanded[:, 0], 0, img_w - 1)
        expanded[:, 1] = np.clip(expanded[:, 1], 0, img_h - 1)

        # Convex hull
        hull = cv2.convexHull(expanded)
        contour = hull.reshape(-1, 2).tolist()

        logger.debug(f"Face contour: {len(contour)} hull points from {len(boundary_pts)} landmarks")
        return contour

    # ── Elliptical contour for non-face body parts ────────────────────────────

    @staticmethod
    def generate_elliptical_contour(
        bbox: dict,
        num_points: int = 36,
        img_width: int = 99999,
        img_height: int = 99999,
    ) -> List[List[int]]:
        """
        Generate an elliptical polygon inscribed in the given bounding box.
        Returns [[x1,y1], [x2,y2], ...] suitable for canvas polygon clipping.
        """
        cx = bbox["x"] + bbox["width"] / 2
        cy = bbox["y"] + bbox["height"] / 2
        rx = bbox["width"] / 2
        ry = bbox["height"] / 2

        points = []
        for i in range(num_points):
            angle = 2 * math.pi * i / num_points
            px = int(cx + rx * math.cos(angle))
            py = int(cy + ry * math.sin(angle))
            # Clamp to image
            px = max(0, min(px, img_width - 1))
            py = max(0, min(py, img_height - 1))
            points.append([px, py])

        return points


# Singleton
face_landmark_service = FaceLandmarkService()
