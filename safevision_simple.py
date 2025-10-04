#!/usr/bin/env python3
import os
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
from PIL import Image
import io
import base64
import logging
import json
from flask import Flask, request, jsonify
import warnings
from datetime import datetime

# Suppress warnings
warnings.filterwarnings("ignore")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize MediaPipe components
mp_face_mesh = mp.solutions.face_mesh
mp_pose = mp.solutions.pose
mp_hands = mp.solutions.hands

class SafeVisionProcessor:
    def __init__(self):
        # Initialize MediaPipe components
        self.mp_face_detection = mp.solutions.face_detection
        self.face_detection = self.mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5)
        self.face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, max_num_faces=10, min_detection_confidence=0.5)
        self.hands = mp_hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5)
        self.pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
        
        # Create necessary directories
        self.create_directories()
    
    def create_directories(self):
        directories = ["input", "output", "api_uploads", "api_temp", "api_outputs"]
        for directory in directories:
            if not os.path.exists(directory):
                os.makedirs(directory)
                logger.info(f"Created directory: {directory}")
    
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
