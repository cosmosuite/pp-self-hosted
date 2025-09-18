# SafeVision Configuration Guide

This document provides a comprehensive overview of all configurable parameters and settings available in SafeVision for content moderation and nudity detection.

## 📊 Core Detection Settings

### Detection Threshold
- **Parameter**: `DETECTION_THRESHOLD`
- **Default**: `0.2` (video.py) / `0.25` (API)
- **Purpose**: Minimum confidence score (0.0-1.0) for considering a detection valid
- **Range**: 0.1 (very sensitive) to 0.9 (very strict)
- **Usage**: Lower = more detections, Higher = fewer false positives

### Image Processing Size
- **Parameter**: `target_size`
- **Default**: `320` pixels
- **Purpose**: Input image resolution for AI model processing
- **Options**: 224, 320, 416, 512, 640
- **Impact**: Higher = better accuracy but slower processing

## 🎨 Visual Effects & Censoring

### Blur Settings
```python
# Blur strength configurations (kernel_x, kernel_y, sigma)
'BLUR_STRENGTH_NORMAL': (23, 23, 30)    # Standard blur
'BLUR_STRENGTH_HIGH': (31, 31, 50)      # Stronger blur for sensitive content
'FULL_BLUR_STRENGTH': (99, 99, 75)      # Maximum blur for full frame
'ENHANCED_BLUR': False                   # Toggle enhanced blur mode
```

### Color Settings (BGR Format)
```python
# Detection box colors
'BOX_COLOR_NORMAL': (0, 255, 0)         # Green for safe content
'BOX_COLOR_EXPOSED': (0, 0, 255)        # Red for NSFW content

# Text colors
'TEXT_COLOR_NORMAL': (0, 255, 0)        # Green text
'TEXT_COLOR_EXPOSED': (0, 0, 255)       # Red text

# Solid color masking
'USE_SOLID_COLOR': False                 # Use solid color instead of blur
'SOLID_COLOR': (0, 0, 0)                # Black masking color
```

### Text Display Settings
```python
'FONT_SCALE': 0.5                       # Text size multiplier
'FONT_THICKNESS': 1                     # Text line thickness
```

## 📹 Video Processing Settings

### Monitoring Thresholds
```python
'MONITOR_THRESHOLD_PERCENT': 10.0       # Percentage of frames with NSFW content
'MONITOR_THRESHOLD_COUNT': 5            # Number of frames with NSFW content
```

### Full Blur Triggers
```python
'FULL_BLUR_LABELS': 2                   # Number of exposed labels to trigger full blur
'FULL_BLUR_FRAMES': 10                  # Minimum frames with exposed content
```

### Output Settings
```python
'OUTPUT_VIDEO_SUFFIX': '_processed.mp4'
'OUTPUT_VIDEO_BOXES_SUFFIX': '_with_boxes.mp4'
'OUTPUT_VIDEO_AUDIO_SUFFIX': '_with_audio.mp4'
'OUTPUT_VIDEO_BOXES_AUDIO_SUFFIX': '_with_boxes_audio.mp4'
```

## 🌐 API Server Configuration

### Server Settings
```python
API_CONFIG = {
    'HOST': '0.0.0.0',                  # Server host
    'PORT': 5001,                       # Server port
    'DEBUG': False,                     # Debug mode
    'MAX_CONTENT_LENGTH': 50 * 1024 * 1024,  # 50MB max upload
    'DEFAULT_THRESHOLD': 0.25,          # Default detection threshold
    'CLEANUP_INTERVAL': 3600,           # File cleanup interval (seconds)
    'MAX_FILE_AGE': 86400,              # Max file age before cleanup (seconds)
}
```

### File Handling
```python
'UPLOAD_FOLDER': 'api_uploads',         # Upload directory
'OUTPUT_FOLDER': 'api_outputs',         # Output directory
'TEMP_FOLDER': 'api_temp',              # Temporary files
'ALLOWED_EXTENSIONS': {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'mp4', 'avi', 'mov', 'mkv'}
```

## 🎮 Live Streaming Settings

### Performance Settings
```python
'TARGET_FPS': 60,                       # Target output FPS
'PROCESSING_FPS': 30,                   # AI processing FPS
'RESOLUTION': (1920, 1080),             # Streaming resolution
'QUALITY': 'HIGH',                      # HIGH, MEDIUM, LOW
'GPU_ACCELERATION': True,               # Enable GPU processing
'MULTI_THREADING': True,                # Use multiple CPU cores
```

### Virtual Camera
```python
'VIRTUAL_CAM_FPS': 30,                  # Virtual camera FPS
'VIRTUAL_CAM_WIDTH': 1920,              # Virtual camera width
'VIRTUAL_CAM_HEIGHT': 1080,             # Virtual camera height
```

## 🎯 Blur Exception Rules

### Content-Specific Rules (`BlurException.rule`)
```ini
# Each label can be set to true (blur) or false (ignore)
FEMALE_GENITALIA_EXPOSED = true
MALE_GENITALIA_EXPOSED = true
FEMALE_BREAST_EXPOSED = true
BUTTOCKS_EXPOSED = true
ANUS_EXPOSED = true
MALE_BREAST_EXPOSED = true
BELLY_EXPOSED = true
FEET_EXPOSED = true
ARMPITS_EXPOSED = true
FACE_FEMALE = true
FACE_MALE = true
# ... and their COVERED variants
```

### Available Content Labels
- **Exposed Content**: `FEMALE_GENITALIA_EXPOSED`, `MALE_GENITALIA_EXPOSED`, `FEMALE_BREAST_EXPOSED`, `MALE_BREAST_EXPOSED`, `BUTTOCKS_EXPOSED`, `ANUS_EXPOSED`, `BELLY_EXPOSED`, `FEET_EXPOSED`, `ARMPITS_EXPOSED`
- **Covered Content**: `FEMALE_GENITALIA_COVERED`, `FEMALE_BREAST_COVERED`, `BUTTOCKS_COVERED`, `ANUS_COVERED`, `BELLY_COVERED`, `FEET_COVERED`, `ARMPITS_COVERED`
- **Faces**: `FACE_FEMALE`, `FACE_MALE`

## 🎯 Command Line Parameters

### Image Processing (`main.py`)
| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--input` | `-i` | `str` | **Required** | Path to the input image file |
| `--output` | `-o` | `str` | Auto-generated | Path to save the censored image |
| `--blur` | `-b` | `flag` | `False` | Apply blur to NSFW regions |
| `--exception` | `-e` | `str` | `BlurException.rule` | Path to blur exception rules file |
| `--full_blur_rule` | `-fbr` | `int` | `0` | Number of exposed regions to trigger full blur |

### Video Processing (`video.py`)
| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--input` | `-i` | `str` | **Required** | Path to the input video file |
| `--output` | `-o` | `str` | Auto-generated | Path to save the processed video/frames |
| `--task` | `-t` | `str` | `video` | Processing mode: `frames` or `video` |
| `--video_output` | `-vo` | `str` | `video_output` | Directory for video output files |
| `--rule` | `-r` | `str` | `0/0` | Blur monitoring rule: `percentage/count` format |
| `--boxes` | `-b` | `flag` | `False` | Create video with detection boxes overlay |
| `--blur` | | `flag` | `False` | Apply blur when using boxes mode |
| `--with-audio` | `-a` | `flag` | `False` | Include original audio in output video |
| `--codec` | `-c` | `str` | `mp4v` | Video codec: `mp4v`, `avc1`, `xvid`, `mjpg` |
| `--ffmpeg-path` | | `str` | Auto-detect | Custom path to FFmpeg executable |
| `--delete-frames` | `-df` | `flag` | `False` | Delete frame images after video creation |
| `--enhanced-blur` | | `flag` | `False` | Use stronger blur that completely obscures content |
| `--full-blur-rule` | `-fbr` | `str` | None | Full blur rule: `labels/frames` format |
| `--color` | | `flag` | `False` | Use solid color instead of blur |
| `--mask-color` | | `str` | `0,0,0` | BGR color for masking (blue,green,red) |

### Live Detection (`live.py`)
| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--camera` | `-c` | `int` | `0` | Camera ID to use for input |
| `--rules` | `-r` | `str` | Auto-detect | Path to blur exception rules file |
| `--gender-detection` | `-g` | `flag` | `False` | Enable gender and age detection |
| `--no-boxes` | | `flag` | `False` | Disable detection boxes display |
| `--privacy` | | `flag` | `False` | Start in privacy mode (no video display) |
| `--enhanced-blur` | | `flag` | `False` | Use enhanced blur mode |
| `--solid-color` | | `flag` | `False` | Use solid color masking instead of blur |
| `--mask-color` | | `str` | `0,0,0` | Color for solid masking in BGR format |
| `--auto-record` | | `flag` | `False` | Auto-record when nudity is detected |
| `--alert-threshold` | | `int` | `3` | Consecutive detections needed for alert |
| `--skip-frames` | | `int` | `2` | Process every nth frame for performance |

### Live Streaming (`live_streamer.py`)
| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--input` | `-i` | `str` | `camera` | Input source: `camera`, `screen`, `window` |
| `--camera` | `-c` | `int` | `0` | Camera ID for camera input |
| `--monitor` | `-m` | `int` | `1` | Monitor number for screen capture |
| `--window` | `-w` | `str` | None | Window title to capture |
| `--resolution` | | `str` | `1920x1080` | Target resolution (WIDTHxHEIGHT) |
| `--fps` | | `int` | `60` | Target frames per second |
| `--ai-fps` | | `int` | `30` | AI processing frames per second |
| `--obs-host` | | `str` | `localhost` | OBS WebSocket host address |
| `--obs-port` | | `int` | `4455` | OBS WebSocket port |
| `--obs-password` | | `str` | Empty | OBS WebSocket password |
| `--auto-scene-switch` | | `flag` | `False` | Auto switch OBS scenes on detection |
| `--virtual-cam` | | `flag` | `False` | Enable virtual camera output |
| `--vcam-fps` | | `int` | `30` | Virtual camera frames per second |
| `--sensitivity` | | `float` | `0.2` | Detection sensitivity (0.1-0.9) |
| `--blur-strength` | | `int` | `30` | Blur strength for censoring |
| `--privacy` | | `flag` | `False` | Privacy mode (no display) |
| `--safe-timeout` | | `int` | `10` | Safe mode timeout in seconds |
| `--gpu` | | `flag` | `False` | Enable GPU acceleration |
| `--quality` | | `str` | `high` | Processing quality: `low`, `medium`, `high` |

## 🔧 How to Modify Settings

### 1. Edit Configuration Files
Modify the `CONFIG` dictionaries in the respective Python files:
- `video.py` - Video processing settings
- `safevision_api.py` - API server settings
- `live_streamer.py` - Live streaming settings

### 2. Command Line Arguments
Use command-line arguments for runtime configuration without modifying code.

### 3. Blur Rules
Edit `BlurException.rule` file for content-specific settings:
```bash
# Example: Conservative mode
FEMALE_GENITALIA_EXPOSED = true
MALE_GENITALIA_EXPOSED = true
FEMALE_BREAST_EXPOSED = true
BUTTOCKS_EXPOSED = true
ANUS_EXPOSED = true
MALE_BREAST_EXPOSED = false
BELLY_EXPOSED = false
FEET_EXPOSED = false
ARMPITS_EXPOSED = false
FACE_FEMALE = false
FACE_MALE = false
```

### 4. API Settings
Modify `API_CONFIG` in `safevision_api.py` for server configuration.

## 💡 Recommended Settings for Different Use Cases

### Conservative (Maximum Privacy)
```python
DETECTION_THRESHOLD = 0.15
ENHANCED_BLUR = True
# All blur rules = true
```

### Balanced (Default)
```python
DETECTION_THRESHOLD = 0.25
ENHANCED_BLUR = False
# Selective blur rules
```

### Performance Optimized
```python
target_size = 224
PROCESSING_FPS = 15
MULTI_THREADING = True
```

### Streaming Optimized
```python
TARGET_FPS = 60
PROCESSING_FPS = 30
RESOLUTION = (1920, 1080)
GPU_ACCELERATION = True
```

## 🎨 Color Format Reference

### BGR Color Format
- **Format**: `(Blue, Green, Red)`
- **Examples**:
  - `(0, 0, 0)` - Black
  - `(255, 0, 0)` - Blue
  - `(0, 255, 0)` - Green
  - `(0, 0, 255)` - Red
  - `(255, 255, 255)` - White

### Blur Rule Format
- **Single number**: `5` (count threshold)
- **Percentage/Count**: `10/50` (10% or 50 frames)
- **Labels/Frames**: `2/5` (2+ labels in 5+ frames)

## 🚀 Performance Tips

1. **Use GPU acceleration** when available for faster processing
2. **Adjust skip-frames** for real-time performance
3. **Lower AI-FPS** for better system responsiveness
4. **Use delete-frames** to save disk space in video processing
5. **Enable multi-threading** for better CPU utilization

## 📝 Example Configurations

### Basic Image Processing
```bash
python main.py -i image.jpg -b -e custom_rules.rule
```

### Video with Audio Preservation
```bash
python video.py -i video.mp4 -b --blur -a -c mp4v
```

### Live Streaming with OBS
```bash
python live_streamer.py --virtual-cam --obs-host localhost --gpu
```

### API Server with Custom Port
```python
API_CONFIG['PORT'] = 8080
```

This comprehensive configuration system allows SafeVision to be customized for various content moderation needs, from strict parental controls to professional streaming applications.
