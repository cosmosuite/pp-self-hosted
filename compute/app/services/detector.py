"""
SafeVision Compute - Detection Service
Wraps the ONNX-based NudeDetector for body-part detection.
Returns bounding boxes + labels + contour polygons (no blurring).
"""

import os
import math
import logging
import urllib.request
from typing import List, Dict, Any, Optional

import cv2
import numpy as np
import onnx
from onnx import version_converter
import onnxruntime

from app.config import settings
from app.services.face_landmarks import face_landmark_service

logger = logging.getLogger("safevision.detector")

# ─── Labels (must match model output order) ──────────────────────────────────

LABELS = [
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

# ─── Risk mapping ────────────────────────────────────────────────────────────

RISK_MAP = {
    "FEMALE_GENITALIA_EXPOSED": "CRITICAL",
    "MALE_GENITALIA_EXPOSED": "CRITICAL",
    "FEMALE_BREAST_EXPOSED": "HIGH",
    "ANUS_EXPOSED": "HIGH",
    "BUTTOCKS_EXPOSED": "MODERATE",
    "MALE_BREAST_EXPOSED": "LOW",
    "BELLY_EXPOSED": "LOW",
    "FEET_EXPOSED": "LOW",
    "ARMPITS_EXPOSED": "LOW",
}

# Default blur rules (all exposed = blur, covered/face = don't blur)
DEFAULT_BLUR_RULES = {label: ("EXPOSED" in label) for label in LABELS}


def get_risk_level(label: str) -> str:
    if label in RISK_MAP:
        return RISK_MAP[label]
    if "COVERED" in label:
        return "SAFE"
    if "FACE" in label:
        return "SAFE"
    return "SAFE"


def get_label_category(label: str) -> str:
    if "EXPOSED" in label:
        return "exposed"
    if "COVERED" in label:
        return "covered"
    if "FACE" in label:
        return "face"
    return "other"


# ─── Image preprocessing ─────────────────────────────────────────────────────

def _read_image(image_path: str, target_size: int = 320):
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")

    img_height, img_width = img.shape[:2]
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    aspect = img_width / img_height

    if img_height > img_width:
        new_height = target_size
        new_width = int(round(target_size * aspect))
    else:
        new_width = target_size
        new_height = int(round(target_size / aspect))

    resize_factor = math.sqrt(
        (img_width ** 2 + img_height ** 2) / (new_width ** 2 + new_height ** 2)
    )
    img = cv2.resize(img, (new_width, new_height))

    pad_x = target_size - new_width
    pad_y = target_size - new_height
    pad_top, pad_bottom = [int(i) for i in np.floor([pad_y, pad_y]) / 2]
    pad_left, pad_right = [int(i) for i in np.floor([pad_x, pad_x]) / 2]

    img = cv2.copyMakeBorder(
        img, pad_top, pad_bottom, pad_left, pad_right,
        cv2.BORDER_CONSTANT, value=[0, 0, 0],
    )
    img = cv2.resize(img, (target_size, target_size))
    image_data = img.astype("float32") / 255.0
    image_data = np.transpose(image_data, (2, 0, 1))
    image_data = np.expand_dims(image_data, axis=0)

    return image_data, resize_factor, pad_left, pad_top


def _postprocess(output, resize_factor: float, pad_left: int, pad_top: int) -> List[Dict[str, Any]]:
    outputs = np.transpose(np.squeeze(output[0]))
    rows = outputs.shape[0]
    boxes, scores, class_ids = [], [], []

    for i in range(rows):
        classes_scores = outputs[i][4:]
        max_score = np.amax(classes_scores)
        if max_score >= 0.2:
            class_id = np.argmax(classes_scores)
            x, y, w, h = outputs[i][0], outputs[i][1], outputs[i][2], outputs[i][3]
            left = int(round((x - w * 0.5 - pad_left) * resize_factor))
            top = int(round((y - h * 0.5 - pad_top) * resize_factor))
            width = int(round(w * resize_factor))
            height = int(round(h * resize_factor))
            class_ids.append(class_id)
            scores.append(max_score)
            boxes.append([left, top, width, height])

    indices = cv2.dnn.NMSBoxes(boxes, scores, 0.25, 0.45)
    detections = []
    for i in indices:
        detections.append({
            "class": LABELS[class_ids[i]],
            "score": float(scores[i]),
            "box": boxes[i],
        })
    return detections


# ─── Model management ────────────────────────────────────────────────────────

def _ensure_opset15(original_path: str) -> str:
    base, ext = os.path.splitext(original_path)
    conv_path = f"{base}_opset15{ext}"
    if not os.path.exists(conv_path):
        model = onnx.load(original_path)
        converted = version_converter.convert_version(model, 15)
        onnx.save(converted, conv_path)
    return conv_path


def _download_model(url: str, save_path: str) -> bool:
    logger.info(f"Downloading model from {url}...")
    try:
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        urllib.request.urlretrieve(url, save_path)
        logger.info(f"Model downloaded to {save_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        return False


# ─── DetectorService ─────────────────────────────────────────────────────────

class DetectorService:
    FACE_LABELS = {"FACE_FEMALE", "FACE_MALE"}

    def __init__(self):
        self.onnx_session = None
        self.input_name: str = ""
        self.input_width: int = 320
        self.input_height: int = 320
        self.model_loaded: bool = False

    def load_model(self) -> bool:
        try:
            model_dir = settings.model_dir
            model_orig = os.path.join(model_dir, "best.onnx")

            if not os.path.exists(model_orig):
                logger.info("Model not found locally, downloading...")
                if not _download_model(settings.model_url, model_orig):
                    logger.error("Could not download model")
                    return False

            model_path = _ensure_opset15(model_orig)
            providers = onnxruntime.get_available_providers()
            self.onnx_session = onnxruntime.InferenceSession(model_path, providers=providers)

            inp = self.onnx_session.get_inputs()[0]
            self.input_name = inp.name
            self.input_width = inp.shape[2]
            self.input_height = inp.shape[3]
            self.model_loaded = True
            logger.info("SafeVision ONNX model loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            self.model_loaded = False
            return False

    def detect(self, image_path: str, threshold: float = 0.25, blur_rules: Optional[Dict[str, bool]] = None) -> Dict[str, Any]:
        if not self.model_loaded:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        img_height, img_width = img.shape[:2]

        preprocessed, resize_factor, pad_left, pad_top = _read_image(image_path, self.input_width)
        outputs = self.onnx_session.run(None, {self.input_name: preprocessed})
        raw_detections = _postprocess(outputs, resize_factor, pad_left, pad_top)

        rules = blur_rules or DEFAULT_BLUR_RULES
        risk_distribution: Dict[str, int] = {}
        highest_risk = "SAFE"
        risk_priority = ["SAFE", "LOW", "MODERATE", "HIGH", "CRITICAL"]

        detections = []
        for d in raw_detections:
            if d["score"] < threshold:
                continue

            label = d["class"]
            risk = get_risk_level(label)
            risk_distribution[risk] = risk_distribution.get(risk, 0) + 1
            if risk_priority.index(risk) > risk_priority.index(highest_risk):
                highest_risk = risk

            bx, by, bw, bh = d["box"]
            bx = max(0, bx)
            by = max(0, by)
            bw = min(bw, img_width - bx)
            bh = min(bh, img_height - by)
            should_blur = rules.get(label, "EXPOSED" in label)
            bbox = {"x": bx, "y": by, "width": bw, "height": bh}

            # Generate contour polygon
            contour = None
            if label in self.FACE_LABELS:
                try:
                    contour = face_landmark_service.get_face_contour(
                        img, (bx, by, bw, bh), expansion=1.15
                    )
                except Exception as e:
                    logger.warning(f"Face landmark detection failed for {label}: {e}")

            if contour is None:
                contour = face_landmark_service.generate_elliptical_contour(
                    bbox, num_points=36, img_width=img_width, img_height=img_height
                )

            detections.append({
                "label": label,
                "confidence": round(d["score"], 4),
                "risk_level": risk,
                "bbox": bbox,
                "should_blur": should_blur,
                "contour": contour,
            })

        return {
            "image_dimensions": {"width": img_width, "height": img_height},
            "detections": detections,
            "detection_count": len(detections),
            "risk_summary": {
                "overall_risk": highest_risk,
                "is_safe": highest_risk in ["SAFE", "LOW"],
                "distribution": risk_distribution,
            },
        }


# Singleton instance
detector_service = DetectorService()
