# Debugging Guide

## Common Issues and Solutions

### 1. 500 Internal Server Error

**Check the backend logs:**
```bash
cd backend
npm run dev
```

Look for error messages in the console output.

**Common causes:**
- Missing dependencies (run `npm install` in backend folder)
- Sharp library issues (try `npm install sharp` again)
- File permission issues
- Invalid image format

### 2. Test the Backend Separately

Run the simple test server:
```bash
cd backend
node test-server.js
```

Then test with curl:
```bash
curl -X POST -F "image=@/path/to/your/image.jpg" http://localhost:3001/api/test-image
```

### 3. Check File Uploads

Make sure the uploads directory exists:
```bash
ls -la backend/uploads/
ls -la backend/outputs/
```

### 4. Frontend Console Errors

Open browser developer tools (F12) and check the Console tab for errors.

### 5. Network Issues

Check if the backend is running on the correct port:
```bash
curl http://localhost:3001/api/health
```

Should return: `{"status":"OK","timestamp":"..."}`

### 6. Image Processing Issues

The current implementation uses mock detection. To use real SafeVision detection:

1. Install Python dependencies in SafeVision folder
2. Modify `backend/src/services/imageProcessor.ts` to call the Python API
3. Or integrate the ONNX model directly

### 7. Dependencies

Make sure all dependencies are installed:
```bash
# Root
npm install

# Backend
cd backend
npm install

# Frontend  
cd ../frontend
npm install
```

### 8. Port Conflicts

If port 3001 is in use, change it in `backend/src/index.ts`:
```typescript
const PORT = process.env.PORT || 3002; // Change to 3002
```

And update the frontend URL in `frontend/src/components/ImageProcessor.tsx`:
```typescript
const response = await fetch('http://localhost:3002/api/process-image', {
```

## Quick Fixes

1. **Restart everything:**
   ```bash
   # Stop all processes (Ctrl+C)
   # Then restart
   npm run dev
   ```

2. **Clear node_modules and reinstall:**
   ```bash
   rm -rf node_modules
   rm -rf backend/node_modules
   rm -rf frontend/node_modules
   npm run install:all
   ```

3. **Check file permissions:**
   ```bash
   chmod 755 backend/uploads
   chmod 755 backend/outputs
   ```
