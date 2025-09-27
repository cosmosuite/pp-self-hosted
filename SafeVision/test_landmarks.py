#!/usr/bin/env python3
"""
Test script for face landmark detection.
"""

import sys
import os
from face_landmarks import FaceLandmarkDetector

def main():
    print("🧪 Face Landmark Detection Test")
    print("=" * 40)
    
    # Initialize detector
    detector = FaceLandmarkDetector()
    
    if not detector.is_available():
        print("❌ Face landmark detector not available")
        print("   Make sure the model file exists and dlib is installed")
        return False
    
    print("✅ Face landmark detector initialized")
    
    # Test with a sample image if provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
        if os.path.exists(image_path):
            print(f"🧪 Testing with image: {image_path}")
            success = detector.test_landmark_detection(image_path)
            if success:
                print("✅ Test completed successfully")
                print("   Check the 'debug_contours' folder for debug images")
            else:
                print("❌ Test failed")
        else:
            print(f"❌ Image file not found: {image_path}")
    else:
        print("ℹ️  No image provided. Usage: python test_landmarks.py <image_path>")
        print("   Example: python test_landmarks.py ../test_image.jpg")
    
    return True

if __name__ == "__main__":
    main()

