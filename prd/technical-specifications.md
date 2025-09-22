# Peep Peep - Technical Specifications

## 🏗️ System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        Peep Peep Platform                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)  │  Backend (Express)  │  AI Engine (Python) │
│  Port: 5173        │  Port: 3001         │  Port: 5001         │
│  - User Interface  │  - API Gateway      │  - Content Analysis │
│  - File Upload     │  - Authentication   │  - Blur Processing  │
│  - Real-time UI    │  - File Management  │  - ONNX Inference   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  CDN (CloudFront)  │  Database (RDS)     │  Storage (S3)       │
│  - Static Assets   │  - User Data        │  - File Storage     │
│  - Global Delivery │  - Content Metadata │  - Processed Files  │
│  - Caching         │  - Analytics        │  - Backup Storage   │
└─────────────────────────────────────────────────────────────────┘
```

### Microservices Architecture
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Web UI    │    │   Mobile    │    │   Admin     │
│   Service   │    │   Service   │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                API Gateway (Kong)                      │
│  - Authentication  - Rate Limiting  - Load Balancing   │
└─────────────────────────────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Content   │    │    User     │    │  Analytics  │
│   Service   │    │   Service   │    │   Service   │
└─────────────┘    └─────────────┘    └─────────────┘
    │                      │                      │
    └──────────────────────┼──────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│              AI Processing Service                     │
│  - SafeVision Engine  - ONNX Runtime  - GPU Support   │
└─────────────────────────────────────────────────────────┘
```

---

## 🖥️ Frontend Specifications

### Technology Stack
- **Framework**: React 18.2.0 with TypeScript 5.9.2
- **Build Tool**: Vite 4.5.14
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS 3.3.3
- **State Management**: React Context + Custom Hooks
- **HTTP Client**: Axios 1.6.0
- **File Upload**: React Dropzone
- **Image Processing**: Canvas API + Web Workers

### Component Architecture
```
src/
├── components/
│   ├── ui/                    # shadcn/ui base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── slider.tsx
│   │   └── switch.tsx
│   ├── ImageProcessor.tsx     # Main processing component
│   ├── BlurSettings.tsx       # Blur configuration
│   ├── FileUpload.tsx         # File upload interface
│   ├── PreviewPanel.tsx       # Side-by-side preview
│   └── BatchProcessor.tsx     # Batch processing UI
├── services/
│   ├── api.ts                 # API client
│   ├── auth.ts                # Authentication service
│   └── storage.ts             # Local storage utilities
├── hooks/
│   ├── useAuth.ts             # Authentication hook
│   ├── useProcessing.ts       # Processing state hook
│   └── useUpload.ts           # File upload hook
├── types/
│   ├── api.ts                 # API type definitions
│   ├── content.ts             # Content types
│   └── user.ts                # User types
└── utils/
    ├── constants.ts           # App constants
    ├── helpers.ts             # Utility functions
    └── validation.ts          # Input validation
```

### Performance Requirements
- **Initial Load Time**: <3 seconds
- **Time to Interactive**: <5 seconds
- **Bundle Size**: <2MB gzipped
- **Lighthouse Score**: >90
- **Core Web Vitals**: All green
- **Memory Usage**: <100MB

### Browser Support
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile Safari**: 14+
- **Chrome Mobile**: 90+

---

## ⚙️ Backend Specifications

### Technology Stack
- **Runtime**: Node.js 18.17.0
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.1.6
- **Database**: PostgreSQL 15.0 with Prisma ORM
- **Authentication**: JWT + Passport.js
- **File Upload**: Multer 1.4.5
- **Image Processing**: Sharp 0.32.6
- **Validation**: Joi 17.9.0
- **Documentation**: Swagger/OpenAPI 3.0

### API Architecture
```
/api/v1/
├── auth/
│   ├── POST   /register       # User registration
│   ├── POST   /login          # User login
│   ├── POST   /logout         # User logout
│   ├── POST   /refresh        # Token refresh
│   └── GET    /profile        # User profile
├── content/
│   ├── POST   /upload         # Single file upload
│   ├── POST   /batch-upload   # Batch file upload
│   ├── GET    /list           # List user content
│   ├── GET    /:id            # Get content details
│   ├── PUT    /:id            # Update content
│   └── DELETE /:id            # Delete content
├── processing/
│   ├── POST   /image          # Process image
│   ├── POST   /video          # Process video
│   ├── GET    /:id/status     # Processing status
│   └── GET    /:id/result     # Processing result
├── integrations/
│   ├── POST   /onlyfans/connect    # Connect OnlyFans
│   ├── POST   /fansly/connect      # Connect Fansly
│   ├── POST   /:platform/upload    # Upload to platform
│   └── DELETE /:platform/disconnect # Disconnect platform
└── analytics/
    ├── GET    /usage          # Usage analytics
    ├── GET    /processing     # Processing analytics
    └── GET    /export         # Export analytics data
```

### Database Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    processing_quota INTEGER DEFAULT 100,
    processing_used INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- Content table
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size BIGINT NOT NULL,
    processing_status VARCHAR(20) DEFAULT 'pending',
    blur_settings JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Detections table
CREATE TABLE detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    bounding_box JSONB NOT NULL,
    should_blur BOOLEAN DEFAULT true,
    blur_applied BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Processing jobs table
CREATE TABLE processing_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    job_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Performance Requirements
- **API Response Time**: <200ms (95th percentile)
- **File Upload Speed**: >10MB/s
- **Concurrent Users**: 1,000+
- **Database Queries**: <50ms average
- **Memory Usage**: <512MB per instance
- **CPU Usage**: <70% average

---

## 🤖 AI Engine Specifications

### Technology Stack
- **Language**: Python 3.8+
- **ML Framework**: ONNX Runtime 1.22.1
- **Computer Vision**: OpenCV 4.12.0
- **Image Processing**: PIL/Pillow 11.3.0
- **Web Framework**: Flask 3.1.2
- **Model Format**: ONNX 1.19.0
- **GPU Support**: CUDA 11.8+ (optional)

### Model Specifications
```python
# Model Configuration
MODEL_CONFIG = {
    "input_size": (320, 320, 3),
    "input_name": "input",
    "output_names": ["output"],
    "confidence_threshold": 0.25,
    "nms_threshold": 0.45,
    "max_detections": 100,
    "supported_formats": ["jpg", "jpeg", "png", "gif", "bmp", "tiff"]
}

# Detection Categories
DETECTION_CATEGORIES = [
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
    "BUTTOCKS_COVERED"
]

# Blur Configuration
BLUR_CONFIG = {
    "gaussian_kernel": (23, 23),
    "gaussian_sigma": 30,
    "enhanced_kernel": (31, 31),
    "enhanced_sigma": 50,
    "full_blur_kernel": (99, 99),
    "full_blur_sigma": 75
}
```

### Processing Pipeline
```python
def process_image(image_path: str, blur_settings: dict) -> dict:
    """
    Complete image processing pipeline
    """
    # 1. Load and preprocess image
    image = cv2.imread(image_path)
    preprocessed = preprocess_image(image)
    
    # 2. Run ONNX inference
    detections = run_inference(preprocessed)
    
    # 3. Apply blur rules
    filtered_detections = apply_blur_rules(detections, blur_settings)
    
    # 4. Apply blur effects
    processed_image = apply_blur(image, filtered_detections, blur_settings)
    
    # 5. Save processed image
    output_path = save_processed_image(processed_image)
    
    return {
        "output_path": output_path,
        "detections": filtered_detections,
        "processing_time": processing_time,
        "file_size": os.path.getsize(output_path)
    }
```

### Performance Requirements
- **Image Processing**: <2 seconds per image
- **Video Processing**: <30 seconds per minute of video
- **Detection Accuracy**: >99.5%
- **Memory Usage**: <2GB per process
- **GPU Utilization**: >80% (when available)
- **Batch Processing**: 100+ images per minute

---

## ☁️ Infrastructure Specifications

### Cloud Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                           │
├─────────────────────────────────────────────────────────────┤
│  Route 53 (DNS)  │  CloudFront (CDN)  │  WAF (Security)   │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ECS Fargate     │  ECS Fargate      │  ECS Fargate       │
│  (Frontend)      │  (Backend)        │  (AI Engine)       │
│  2 vCPU, 4GB    │  4 vCPU, 8GB     │  8 vCPU, 16GB     │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                            │
├─────────────────────────────────────────────────────────────┤
│  RDS PostgreSQL  │  ElastiCache Redis  │  S3 (Storage)    │
│  db.r5.xlarge    │  cache.r5.large     │  Standard-IA     │
└─────────────────────────────────────────────────────────────┘
```

### Container Specifications
```yaml
# Frontend Container
frontend:
  image: peep-peep/frontend:latest
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 1000m
      memory: 2Gi
  ports:
    - 5173:5173
  environment:
    - NODE_ENV=production
    - API_URL=https://api.peep-peep.com

# Backend Container
backend:
  image: peep-peep/backend:latest
  resources:
    requests:
      cpu: 1000m
      memory: 2Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  ports:
    - 3001:3001
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://...
    - REDIS_URL=redis://...

# AI Engine Container
ai-engine:
  image: peep-peep/ai-engine:latest
  resources:
    requests:
      cpu: 2000m
      memory: 4Gi
      nvidia.com/gpu: 1
    limits:
      cpu: 4000m
      memory: 8Gi
      nvidia.com/gpu: 1
  ports:
    - 5001:5001
  environment:
    - PYTHON_ENV=production
    - MODEL_PATH=/app/models
    - GPU_ENABLED=true
```

### Scaling Configuration
```yaml
# Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: peep-peep-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: peep-peep-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## 🔒 Security Specifications

### Authentication & Authorization
```typescript
// JWT Token Configuration
const JWT_CONFIG = {
  algorithm: 'RS256',
  expiresIn: '1h',
  refreshExpiresIn: '7d',
  issuer: 'peep-peep.com',
  audience: 'peep-peep-users'
};

// Password Requirements
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true,
  maxAge: 90, // days
  historyCount: 5
};

// Rate Limiting
const RATE_LIMITS = {
  login: '5 attempts per 15 minutes',
  upload: '100 files per hour',
  processing: '1000 requests per hour',
  api: '10000 requests per day'
};
```

### Data Encryption
```yaml
# Encryption at Rest
S3_BUCKET_ENCRYPTION: AES-256
RDS_ENCRYPTION: AES-256
EBS_ENCRYPTION: AES-256

# Encryption in Transit
TLS_VERSION: 1.3
CIPHER_SUITES: 
  - TLS_AES_256_GCM_SHA384
  - TLS_CHACHA20_POLY1305_SHA256
  - TLS_AES_128_GCM_SHA256

# Key Management
KMS_KEY_ROTATION: 90 days
KMS_KEY_ALIAS: peep-peep-encryption
```

### Network Security
```yaml
# VPC Configuration
VPC_CIDR: 10.0.0.0/16
PUBLIC_SUBNETS: 
  - 10.0.1.0/24
  - 10.0.2.0/24
PRIVATE_SUBNETS:
  - 10.0.10.0/24
  - 10.0.20.0/24

# Security Groups
FRONTEND_SG:
  - Port 80: 0.0.0.0/0
  - Port 443: 0.0.0.0/0
BACKEND_SG:
  - Port 3001: Frontend SG
  - Port 5432: Database SG
AI_ENGINE_SG:
  - Port 5001: Backend SG
DATABASE_SG:
  - Port 5432: Backend SG
```

---

## 📊 Monitoring & Observability

### Metrics Collection
```yaml
# Application Metrics
metrics:
  - name: request_count
    type: counter
    labels: [method, endpoint, status_code]
  - name: request_duration
    type: histogram
    labels: [method, endpoint]
  - name: processing_time
    type: histogram
    labels: [file_type, file_size]
  - name: active_users
    type: gauge
  - name: processing_queue_size
    type: gauge

# Infrastructure Metrics
infrastructure:
  - name: cpu_utilization
    type: gauge
  - name: memory_utilization
    type: gauge
  - name: disk_usage
    type: gauge
  - name: network_io
    type: counter
```

### Logging Configuration
```yaml
# Log Levels
LOG_LEVELS:
  production: INFO
  staging: DEBUG
  development: TRACE

# Log Formats
LOG_FORMATS:
  application: json
  access: combined
  error: detailed

# Log Destinations
LOG_DESTINATIONS:
  - CloudWatch Logs
  - Elasticsearch
  - S3 (archival)
```

### Alerting Rules
```yaml
# Critical Alerts
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    
  - name: high_latency
    condition: p95_latency > 2s
    duration: 5m
    severity: warning
    
  - name: low_disk_space
    condition: disk_usage > 90%
    duration: 1m
    severity: critical
    
  - name: processing_failures
    condition: processing_failure_rate > 10%
    duration: 10m
    severity: warning
```

---

## 🚀 Deployment Specifications

### CI/CD Pipeline
```yaml
# GitHub Actions Workflow
name: Deploy Peep Peep
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: |
          npm test
          npm run test:e2e
          
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Images
        run: |
          docker build -t peep-peep/frontend .
          docker build -t peep-peep/backend .
          docker build -t peep-peep/ai-engine .
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        run: |
          aws ecs update-service --cluster peep-peep --service frontend
          aws ecs update-service --cluster peep-peep --service backend
          aws ecs update-service --cluster peep-peep --service ai-engine
```

### Environment Configuration
```yaml
# Production Environment
production:
  replicas:
    frontend: 3
    backend: 5
    ai-engine: 2
  resources:
    frontend:
      cpu: 1000m
      memory: 2Gi
    backend:
      cpu: 2000m
      memory: 4Gi
    ai-engine:
      cpu: 4000m
      memory: 8Gi
      gpu: 1
  scaling:
    min_replicas: 2
    max_replicas: 20
    target_cpu: 70%
    target_memory: 80%
```

---

## 📈 Performance Benchmarks

### Load Testing Results
```yaml
# Load Test Configuration
load_test:
  users: 1000
  duration: 10m
  ramp_up: 2m
  
# Results
results:
  throughput: 500 req/s
  response_time:
    p50: 150ms
    p95: 300ms
    p99: 500ms
  error_rate: 0.1%
  cpu_utilization: 65%
  memory_utilization: 70%
```

### Processing Benchmarks
```yaml
# Image Processing
image_processing:
  small_image (1MB): 0.5s
  medium_image (5MB): 1.2s
  large_image (20MB): 2.0s
  batch_processing: 100 images/min
  
# Video Processing
video_processing:
  short_video (30s): 15s
  medium_video (2min): 45s
  long_video (10min): 4min
  batch_processing: 10 videos/hour
```

---

*This technical specification document will be updated as the system evolves and new requirements are identified.*
