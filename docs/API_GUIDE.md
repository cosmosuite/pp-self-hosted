# SafeVision API Guide

> Body-part detection API for content moderation.  
> Upload an image, receive bounding box coordinates, apply blur client-side.

**Base URL**: `https://your-backend.railway.app` (or `http://localhost:8000` locally)

**Interactive Docs**: `{BASE_URL}/docs` (Swagger UI) | `{BASE_URL}/redoc` (ReDoc)

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [Health Check](#1-health-check)
  - [Detect (File Upload)](#2-detect-file-upload)
  - [Detect (Base64)](#3-detect-base64)
  - [List Labels](#4-list-labels)
  - [Get Blur Rules](#5-get-blur-rules)
  - [Validate Blur Rules](#6-validate-blur-rules)
  - [Check Credits](#7-check-credits)
  - [Get Checkout URL](#8-get-checkout-url)
- [Detection Labels](#detection-labels)
- [Risk Levels](#risk-levels)
- [Error Codes](#error-codes)
- [Rate Limits](#rate-limits)
- [Credit System (useautumn)](#credit-system)
- [Integration Examples](#integration-examples)
- [Deployment](#deployment)

---

## Architecture Overview

```
Frontend (React)                         Backend (FastAPI)
┌─────────────┐    POST /detect    ┌──────────────────┐
│ Image Upload ├──────────────────►│ Credit Check     │
│              │                   │ (useautumn)      │
│ Canvas Blur  │◄──────────────────┤                  │
│ Engine       │  Bounding Boxes   │ ONNX Detection   │
│              │  + Labels         │ (body parts)     │
│ Blur         │                   │                  │
│ Controls     │                   │ Usage Tracking   │
└─────────────┘                   └──────────────────┘
```

The backend **only detects** -- it returns bounding box pixel coordinates.  
The frontend **applies blur** -- using HTML5 Canvas for full client-side control.

---

## Authentication

When credit-based pricing is **enabled**, include your API key in every request:

```
X-API-Key: your_customer_id_here
```

When credits are **disabled** (default for self-hosted), no authentication is required.

---

## Endpoints

### 1. Health Check

Check if the API is running and the model is loaded.

```
GET /api/v1/health
```

**Response** `200 OK`:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime_seconds": 3600,
  "version": "2.0.0",
  "supported_formats": ["png", "jpg", "jpeg", "gif", "bmp", "tiff", "webp"],
  "max_upload_size_mb": 50
}
```

**cURL**:
```bash
curl https://your-api.railway.app/api/v1/health
```

---

### 2. Detect (File Upload)

Upload an image file for body-part detection. Returns bounding boxes in original image pixel coordinates.

```
POST /api/v1/detect
Content-Type: multipart/form-data
```

**Parameters**:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `image` | file | Yes | - | Image file (PNG, JPEG, GIF, BMP, WebP) |
| `threshold` | float | No | 0.25 | Confidence threshold (0.0 - 1.0) |
| `blur_rules` | string (JSON) | No | null | Per-label blur overrides as JSON string |

**Response** `200 OK`:
```json
{
  "status": "success",
  "image_dimensions": {
    "width": 1920,
    "height": 1080
  },
  "detections": [
    {
      "label": "FEMALE_BREAST_EXPOSED",
      "confidence": 0.9234,
      "risk_level": "HIGH",
      "bbox": {
        "x": 120,
        "y": 340,
        "width": 200,
        "height": 180
      },
      "should_blur": true
    },
    {
      "label": "FACE_FEMALE",
      "confidence": 0.8765,
      "risk_level": "SAFE",
      "bbox": {
        "x": 300,
        "y": 50,
        "width": 150,
        "height": 180
      },
      "should_blur": false
    }
  ],
  "detection_count": 2,
  "risk_summary": {
    "overall_risk": "HIGH",
    "is_safe": false,
    "distribution": {
      "HIGH": 1,
      "SAFE": 1
    }
  },
  "credits_remaining": null
}
```

**cURL**:
```bash
curl -X POST https://your-api.railway.app/api/v1/detect \
  -F "image=@photo.jpg" \
  -F "threshold=0.3"
```

**cURL with custom blur rules**:
```bash
curl -X POST https://your-api.railway.app/api/v1/detect \
  -F "image=@photo.jpg" \
  -F 'blur_rules={"FACE_FEMALE": false, "FEET_EXPOSED": false}'
```

**JavaScript**:
```javascript
const form = new FormData();
form.append("image", fileInput.files[0]);
form.append("threshold", "0.3");

const res = await fetch("/api/v1/detect", {
  method: "POST",
  body: form,
});
const data = await res.json();

// data.detections contains bounding boxes to blur client-side
for (const det of data.detections) {
  if (det.should_blur) {
    applyBlurToCanvas(det.bbox);
  }
}
```

**Python**:
```python
import requests

with open("photo.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/v1/detect",
        files={"image": f},
        data={"threshold": 0.3},
    )

result = response.json()
for detection in result["detections"]:
    print(f"{detection['label']}: {detection['bbox']}")
```

---

### 3. Detect (Base64)

Send a base64-encoded image for detection.

```
POST /api/v1/detect/base64
Content-Type: application/json
```

**Body**:
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ...",
  "threshold": 0.25,
  "blur_rules": {
    "FACE_FEMALE": false,
    "FACE_MALE": false
  }
}
```

The `image` field accepts both raw base64 and data URI format (`data:image/...;base64,...`).

**Response**: Same format as `/api/v1/detect`.

**cURL**:
```bash
curl -X POST https://your-api.railway.app/api/v1/detect/base64 \
  -H "Content-Type: application/json" \
  -d '{
    "image": "'$(base64 -i photo.jpg)'",
    "threshold": 0.3
  }'
```

---

### 4. List Labels

Get all 18 detection labels with their categories and default risk levels.

```
GET /api/v1/labels
```

**Response** `200 OK`:
```json
{
  "labels": [
    {
      "label": "FEMALE_GENITALIA_EXPOSED",
      "category": "exposed",
      "default_risk": "CRITICAL",
      "default_blur": true
    },
    {
      "label": "FACE_FEMALE",
      "category": "face",
      "default_risk": "SAFE",
      "default_blur": false
    }
  ],
  "count": 18
}
```

---

### 5. Get Blur Rules

Get the default blur rules (which labels get blurred).

```
GET /api/v1/config/blur-rules
```

**Response** `200 OK`:
```json
{
  "rules": {
    "FEMALE_GENITALIA_EXPOSED": true,
    "FEMALE_BREAST_EXPOSED": true,
    "FACE_FEMALE": false,
    "FACE_MALE": false,
    "BELLY_COVERED": false,
    ...
  },
  "description": "true = blur this label, false = skip"
}
```

---

### 6. Validate Blur Rules

Merge your custom rules with defaults and validate.

```
POST /api/v1/config/blur-rules/validate
Content-Type: application/json
```

**Body**:
```json
{
  "rules": {
    "FACE_FEMALE": true,
    "FEET_EXPOSED": false
  }
}
```

**Response**: Merged rules (your overrides + defaults).

---

### 7. Check Credits

Check your remaining detection credits.

```
GET /api/v1/credits
```

**Headers**: `X-API-Key: your_customer_id`

**Response** `200 OK`:
```json
{
  "enabled": true,
  "customer_id": "user_123",
  "credits_remaining": 47,
  "plan": "Pro"
}
```

When credits are disabled:
```json
{
  "enabled": false,
  "customer_id": null,
  "credits_remaining": null,
  "plan": null
}
```

---

### 8. Get Checkout URL

Get a Stripe checkout URL to purchase a credit plan.

```
GET /api/v1/credits/checkout?product_id=pro_plan
```

**Headers**: `X-API-Key: your_customer_id`

**Response** `200 OK`:
```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/..."
}
```

---

## Detection Labels

The model detects 18 body-part categories:

| Label | Category | Default Risk | Default Blur |
|-------|----------|-------------|-------------|
| `FEMALE_GENITALIA_EXPOSED` | exposed | CRITICAL | Yes |
| `MALE_GENITALIA_EXPOSED` | exposed | CRITICAL | Yes |
| `FEMALE_BREAST_EXPOSED` | exposed | HIGH | Yes |
| `ANUS_EXPOSED` | exposed | HIGH | Yes |
| `BUTTOCKS_EXPOSED` | exposed | MODERATE | Yes |
| `MALE_BREAST_EXPOSED` | exposed | LOW | Yes |
| `BELLY_EXPOSED` | exposed | LOW | Yes |
| `FEET_EXPOSED` | exposed | LOW | Yes |
| `ARMPITS_EXPOSED` | exposed | LOW | Yes |
| `FEMALE_GENITALIA_COVERED` | covered | SAFE | No |
| `FEMALE_BREAST_COVERED` | covered | SAFE | No |
| `BUTTOCKS_COVERED` | covered | SAFE | No |
| `ANUS_COVERED` | covered | SAFE | No |
| `BELLY_COVERED` | covered | SAFE | No |
| `FEET_COVERED` | covered | SAFE | No |
| `ARMPITS_COVERED` | covered | SAFE | No |
| `FACE_FEMALE` | face | SAFE | No |
| `FACE_MALE` | face | SAFE | No |

---

## Risk Levels

| Level | Description | Typical Labels |
|-------|-------------|---------------|
| `CRITICAL` | Explicit content | Genitalia exposed |
| `HIGH` | Very sensitive content | Breasts, anus exposed |
| `MODERATE` | Moderately sensitive | Buttocks exposed |
| `LOW` | Mildly sensitive | Belly, feet, armpits exposed |
| `SAFE` | Not sensitive | Faces, covered body parts |

---

## Error Codes

| HTTP Status | Meaning | When |
|-------------|---------|------|
| 400 | Bad Request | Invalid file type, bad threshold, corrupt image |
| 401 | Unauthorized | Missing API key (when credits enabled) |
| 403 | Forbidden | No remaining credits |
| 413 | Payload Too Large | File exceeds 50MB limit |
| 429 | Too Many Requests | Rate limit exceeded (60/min) |
| 500 | Internal Error | Server-side processing failure |
| 503 | Service Unavailable | Model not loaded yet |

Error response format:
```json
{
  "status": "error",
  "error": "Short error message",
  "detail": "Detailed explanation (optional)"
}
```

---

## Rate Limits

- **Default**: 60 requests per minute per IP
- Rate limit headers are included in responses
- When exceeded, returns `429 Too Many Requests`

---

## Credit System

SafeVision uses [useautumn.com](https://useautumn.com) for credit-based pricing.

### How it works

1. Each API call to `/detect` or `/detect/base64` costs **1 credit**
2. Credits are checked **before** processing (no charge on failure)
3. Usage is tracked **after** successful detection
4. When credits run out, the API returns `403` with an upgrade URL

### Setup (for API operators)

1. Create an account at [useautumn.com](https://useautumn.com)
2. Connect your Stripe account
3. Create a product with a consumable feature called `detections`
4. Set credit limits per plan tier (e.g., Free: 50/mo, Pro: 5000/mo)
5. Set environment variables:
   ```
   AUTUMN_ENABLED=true
   AUTUMN_SECRET_KEY=your_autumn_secret_key
   ```

### Self-hosted (no credits)

By default, the credit system is **disabled**. All requests are allowed without authentication.
To run without credits, simply don't set `AUTUMN_ENABLED` or set it to `false`.

---

## Integration Examples

### Client-Side Blur with Canvas (JavaScript)

```javascript
// 1. Upload image and get detections
const form = new FormData();
form.append("image", file);
const res = await fetch("/api/v1/detect", { method: "POST", body: form });
const { detections, image_dimensions } = await res.json();

// 2. Draw image on canvas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = image_dimensions.width;
canvas.height = image_dimensions.height;
ctx.drawImage(img, 0, 0);

// 3. Apply blur to each detection
for (const det of detections) {
  if (!det.should_blur) continue;
  const { x, y, width, height } = det.bbox;
  
  // Extract region, blur it, put it back
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);
  tempCtx.filter = "blur(20px)";
  tempCtx.drawImage(tempCanvas, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0, width, height, x, y, width, height);
}
```

### Python Integration

```python
import requests

API_URL = "https://your-api.railway.app"

# Detect
with open("image.jpg", "rb") as f:
    response = requests.post(
        f"{API_URL}/api/v1/detect",
        files={"image": f},
        data={"threshold": 0.3},
        headers={"X-API-Key": "your_key"},  # if credits enabled
    )

result = response.json()
print(f"Risk: {result['risk_summary']['overall_risk']}")
print(f"Detections: {result['detection_count']}")

for det in result["detections"]:
    box = det["bbox"]
    print(f"  {det['label']}: ({box['x']},{box['y']}) {box['width']}x{box['height']}")
```

### React Integration

```tsx
import { useState } from "react";

function App() {
  const [result, setResult] = useState(null);

  async function handleUpload(file: File) {
    const form = new FormData();
    form.append("image", file);

    const res = await fetch("/api/v1/detect", { method: "POST", body: form });
    const data = await res.json();
    setResult(data);
  }

  return (
    <div>
      <input type="file" onChange={e => handleUpload(e.target.files[0])} />
      {result?.detections.map((det, i) => (
        <div key={i}>
          {det.label}: {det.confidence.toFixed(2)} at ({det.bbox.x}, {det.bbox.y})
        </div>
      ))}
    </div>
  );
}
```

---

## Deployment

### Railway (Recommended)

The project is designed for **two separate Railway services**:

#### Backend

```bash
cd backend
railway init
railway up
```

Environment variables to set in Railway:
- `ALLOWED_ORIGINS` = your frontend Railway URL
- `AUTUMN_ENABLED` = true/false
- `AUTUMN_SECRET_KEY` = your key (if enabled)

#### Frontend

```bash
cd frontend
railway init
railway up
```

Build args to set in Railway:
- `VITE_API_URL` = your backend Railway URL (e.g., `https://safevision-api.up.railway.app`)

### Docker Compose (Local Development)

```yaml
version: "3.8"

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - ALLOWED_ORIGINS=http://localhost:5173
      - AUTUMN_ENABLED=false

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://localhost:8000
    ports:
      - "3000:3000"
    depends_on:
      - backend
```

### Local Development (without Docker)

**Backend**:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` requests to the backend automatically.
