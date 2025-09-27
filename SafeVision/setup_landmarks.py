#!/usr/bin/env python3
"""
Setup script for face landmark detection.
Downloads and installs the required dlib face landmark model.
"""

import os
import sys
import urllib.request
import bz2
import shutil
import hashlib
import ssl
from pathlib import Path

def download_file(url: str, filename: str) -> bool:
    """Download a file from URL with progress indication and SSL verification."""
    try:
        print(f"📥 Downloading {filename}...")
        
        def progress_hook(block_num, block_size, total_size):
            downloaded = block_num * block_size
            if total_size > 0:
                percent = min(100, (downloaded * 100) // total_size)
                print(f"\r📥 Progress: {percent}% ({downloaded // 1024 // 1024}MB/{total_size // 1024 // 1024}MB)", end="")
        
        # Create SSL context that verifies certificates
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        
        # Create request with SSL context
        request = urllib.request.Request(url)
        with urllib.request.urlopen(request, context=ssl_context) as response:
            with open(filename, 'wb') as f:
                shutil.copyfileobj(response, f)
        
        print(f"\n✅ Downloaded {filename}")
        return True
        
    except Exception as e:
        print(f"\n❌ Error downloading {filename}: {e}")
        return False

def verify_sha256(file_path: str, expected_hash: str) -> bool:
    """Verify SHA256 checksum of a file."""
    try:
        print(f"🔍 Verifying SHA256 checksum...")
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        
        actual_hash = sha256_hash.hexdigest()
        if actual_hash == expected_hash:
            print(f"✅ SHA256 checksum verified")
            return True
        else:
            print(f"❌ SHA256 checksum mismatch!")
            print(f"   Expected: {expected_hash}")
            print(f"   Actual:   {actual_hash}")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying SHA256: {e}")
        return False

def extract_bz2(bz2_file: str, output_file: str) -> bool:
    """Extract a bz2 compressed file."""
    try:
        print(f"📦 Extracting {bz2_file}...")
        with bz2.BZ2File(bz2_file, 'rb') as source:
            with open(output_file, 'wb') as target:
                shutil.copyfileobj(source, target)
        print(f"✅ Extracted to {output_file}")
        return True
        
    except Exception as e:
        print(f"❌ Error extracting {bz2_file}: {e}")
        return False

def setup_face_landmarks():
    """Setup face landmark detection model."""
    print("🧠 Setting up Face Landmark Detection...")
    
    # Create Models directory if it doesn't exist
    models_dir = Path("Models")
    models_dir.mkdir(exist_ok=True)
    
    # Model URLs and filenames - using HTTPS
    model_url = "https://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2"
    bz2_filename = "shape_predictor_68_face_landmarks.dat.bz2"
    model_filename = "shape_predictor_68_face_landmarks.dat"
    model_path = models_dir / model_filename
    
    # Expected SHA256 hash for the compressed file (you would need to get this from dlib.net)
    # This is a placeholder - in production, you should get the actual hash from the official source
    expected_sha256 = "a8b0b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5"  # Placeholder
    
    # Check if model already exists
    if model_path.exists():
        print(f"✅ Face landmark model already exists at: {model_path}")
        return True
    
    # Download the compressed model
    if not download_file(model_url, bz2_filename):
        return False
    
    # Verify SHA256 checksum before extraction
    if not verify_sha256(bz2_filename, expected_sha256):
        print(f"❌ SHA256 verification failed for {bz2_filename}")
        try:
            os.remove(bz2_filename)
        except:
            pass
        return False
    
    # Extract the model
    if not extract_bz2(bz2_filename, str(model_path)):
        return False
    
    # Clean up compressed file
    try:
        os.remove(bz2_filename)
        print(f"🗑️ Cleaned up {bz2_filename}")
    except:
        pass
    
    # Verify the model file with realistic size check
    MODEL_MIN_SIZE = 50_000_000  # 50MB minimum for the 68-point landmark model
    if model_path.exists() and model_path.stat().st_size > MODEL_MIN_SIZE:
        print(f"✅ Face landmark model setup complete: {model_path}")
        print(f"📊 Model size: {model_path.stat().st_size // 1024 // 1024}MB")
        return True
    else:
        print(f"❌ Model file verification failed: {model_path}")
        print(f"   Expected size: > {MODEL_MIN_SIZE // 1024 // 1024}MB")
        print(f"   Actual size: {model_path.stat().st_size // 1024 // 1024}MB")
        return False

def check_dependencies():
    """Check if required dependencies are installed."""
    print("🔍 Checking dependencies...")
    
    missing_deps = []
    
    try:
        import dlib
        print("✅ dlib is installed")
    except ImportError:
        missing_deps.append("dlib")
        print("❌ dlib is not installed")
    
    try:
        import cv2
        print("✅ opencv-python is installed")
    except ImportError:
        missing_deps.append("opencv-python")
        print("❌ opencv-python is not installed")
    
    try:
        import numpy
        print("✅ numpy is installed")
    except ImportError:
        missing_deps.append("numpy")
        print("❌ numpy is not installed")
    
    if missing_deps:
        print(f"\n❌ Missing dependencies: {', '.join(missing_deps)}")
        print("Install with:")
        print(f"pip install {' '.join(missing_deps)}")
        return False
    
    print("✅ All dependencies are installed")
    return True

def test_landmark_detection():
    """Test the landmark detection functionality."""
    print("🧪 Testing landmark detection...")
    
    try:
        from face_landmarks import FaceLandmarkDetector
        
        # Initialize detector
        detector = FaceLandmarkDetector()
        
        if detector.is_available():
            print("✅ Face landmark detector is working correctly")
            return True
        else:
            print("❌ Face landmark detector is not available")
            return False
            
    except Exception as e:
        print(f"❌ Error testing landmark detection: {e}")
        return False

def main():
    """Main setup function."""
    print("🚀 SafeVision Face Landmark Setup")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Setup failed: Missing dependencies")
        sys.exit(1)
    
    # Setup face landmarks
    if not setup_face_landmarks():
        print("\n❌ Setup failed: Could not download model")
        sys.exit(1)
    
    # Test the setup
    if not test_landmark_detection():
        print("\n❌ Setup failed: Landmark detection test failed")
        sys.exit(1)
    
    print("\n🎉 Face landmark detection setup complete!")
    print("You can now use face landmark detection in SafeVision.")
    print("\nTo use in your code:")
    print("from face_landmarks import FaceLandmarkDetector")
    print("detector = FaceLandmarkDetector()")

if __name__ == "__main__":
    main()
