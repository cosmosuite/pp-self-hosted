from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
from io import BytesIO

from services.runpod_client import RunPodClient

process_bp = Blueprint('process', __name__)
runpod_client = RunPodClient()

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@process_bp.route('/health', methods=['GET'])
def health():
    """Backend health check"""
    runpod_status = runpod_client.health_check()
    return jsonify({
        'backend': 'online',
        'runpod': runpod_status,
        'timestamp': datetime.now().isoformat()
    })

@process_bp.route('/labels', methods=['GET'])
def get_labels():
    """Get available detection labels from RunPod"""
    return jsonify(runpod_client.get_labels())

@process_bp.route('/process', methods=['POST'])
def process_image():
    """Process image with blur detection"""
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    # Get parameters
    blur = request.form.get('blur', 'true').lower() == 'true'
    threshold = float(request.form.get('threshold', 0.25))
    use_face_landmarks = request.form.get('use_face_landmarks', 'true').lower() == 'true'
    
    # Parse blur rules if provided
    blur_rules = None
    if 'blur_rules' in request.form:
        import json
        try:
            blur_rules = json.loads(request.form.get('blur_rules'))
        except:
            pass
    
    # Generate session ID
    session_id = request.form.get('session_id') or str(uuid.uuid4())
    
    # Save file temporarily
    filename = secure_filename(file.filename)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_filename = f"{timestamp}_{filename}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(file_path)
    
    try:
        # Send to RunPod for processing
        with open(file_path, 'rb') as f:
            result = runpod_client.detect_and_blur(
                image_file=f,
                filename=filename,
                blur=blur,
                threshold=threshold,
                blur_rules=blur_rules,
                use_face_landmarks=use_face_landmarks,
                session_id=session_id
            )
        
        # Clean up uploaded file
        os.remove(file_path)
        
        return jsonify(result)
        
    except Exception as e:
        # Clean up on error
        if os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({'error': str(e), 'status': 'error'}), 500

@process_bp.route('/download/<path:image_path>', methods=['GET'])
def download_censored_image(image_path):
    """Proxy download of censored image from RunPod"""
    try:
        image_data = runpod_client.get_censored_image(image_path)
        
        if image_data:
            return send_file(
                BytesIO(image_data),
                mimetype='image/jpeg',
                as_attachment=True,
                download_name=f"blurred_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            )
        else:
            return jsonify({'error': 'Image not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
