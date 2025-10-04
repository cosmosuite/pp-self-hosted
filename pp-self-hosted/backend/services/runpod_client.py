import requests
import json
import os
import sys
from typing import Optional, Dict, Any, BinaryIO

class RunPodClient:
    """Client to communicate with SafeVision API on RunPod"""
    
    def __init__(self, base_url: str = None):
        self.base_url = base_url or os.getenv('RUNPOD_API_URL', 'https://a2g50oun4fr6h4-5001.proxy.runpod.net')
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json'
        })
    
    def health_check(self) -> Dict[str, Any]:
        """Check RunPod API health"""
        try:
            response = self.session.get(f'{self.base_url}/api/v1/health')
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {'error': str(e), 'status': 'offline'}
    
    def get_labels(self) -> Dict[str, Any]:
        """Get available detection labels"""
        try:
            response = self.session.get(f'{self.base_url}/api/v1/labels')
            response.raise_for_status()
            return response.json()
        except Exception as e:
            return {'error': str(e)}
    
    def detect_and_blur(
        self,
        image_file: BinaryIO,
        filename: str,
        blur: bool = True,
        threshold: float = 0.25,
        blur_rules: Optional[Dict[str, bool]] = None,
        use_face_landmarks: bool = True,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send image to RunPod for detection and blurring
        
        Args:
            image_file: Binary file object
            filename: Original filename
            blur: Whether to apply blur
            threshold: Detection confidence threshold (0.0-1.0)
            blur_rules: Custom blur rules for each label
            use_face_landmarks: Use advanced face landmark blur
            session_id: Optional session tracking ID
        """
        try:
            files = {'file': (filename, image_file, 'image/jpeg')}
            
            data = {
                'blur': 'true' if blur else 'false',
                'threshold': str(threshold)
            }
            
            if blur_rules:
                data['blur_rules'] = json.dumps(blur_rules)
            
            if session_id:
                data['session_id'] = session_id
            
            sys.stderr.write(f"DEBUG: Sending to {self.base_url}/api/v1/detect\n")
            sys.stderr.write(f"DEBUG: files keys: {list(files.keys())}\n")
            sys.stderr.write(f"DEBUG: data: {data}\n")
            sys.stderr.flush()
            
            response = self.session.post(
                f'{self.base_url}/api/v1/detect',
                files=files,
                data=data,
                timeout=60
            )
            
            sys.stderr.write(f"DEBUG: Response status: {response.status_code}\n")
            sys.stderr.write(f"DEBUG: Response text: {response.text[:500]}\n")
            sys.stderr.flush()
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.Timeout:
            return {'error': 'Request timeout', 'status': 'error'}
        except requests.exceptions.RequestException as e:
            return {'error': str(e), 'status': 'error'}
        except Exception as e:
            return {'error': f'Unexpected error: {str(e)}', 'status': 'error'}
    
    def get_censored_image(self, image_path: str) -> Optional[bytes]:
        """Download censored image from RunPod"""
        try:
            # Construct full URL for the censored image
            image_url = f'{self.base_url}/{image_path}'
            response = self.session.get(image_url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as e:
            print(f"Error downloading censored image: {e}")
            return None
