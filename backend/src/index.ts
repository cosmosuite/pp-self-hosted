import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';
import { processImage } from './services/imageProcessor';
import { BlurOptions } from './types';
const { setupSafeVision } = require('../scripts/setup-safevision');

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Railway requires binding to 0.0.0.0
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create necessary directories
const uploadsDir = path.join(__dirname, '../uploads');
const outputsDir = path.join(__dirname, '../outputs');
const tempDir = path.join(__dirname, '../temp');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputsDir);
fs.ensureDirSync(tempDir);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Routes
app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version
  };
  
  res.status(200).json(healthCheck);
});

// Root endpoint for Railway health checks
app.get('/', (req, res) => {
  res.json({ 
    message: 'PP Self-Hosted Backend API',
    status: 'running',
    endpoints: {
      health: '/api/health',
      processImage: '/api/process-image',
      download: '/api/download/:filename',
      outputs: '/api/outputs'
    }
  });
});

app.post('/api/process-image', upload.single('image'), async (req, res) => {
  let uploadedFilePath: string | undefined;
  
  try {
    console.log('Received image processing request');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    uploadedFilePath = req.file.path;
    console.log(`Uploaded file: ${uploadedFilePath}`);

    const blurOptions: BlurOptions = {
      applyBlur: req.body.applyBlur === 'true',
      enhancedBlur: req.body.enhancedBlur === 'true',
      solidColor: req.body.solidColor === 'true',
      maskColor: req.body.maskColor ? JSON.parse(req.body.maskColor) : [0, 0, 0],
      fullBlurRule: parseInt(req.body.fullBlurRule) || 0,
      threshold: parseFloat(req.body.threshold) || 0.25,
      blurIntensity: parseInt(req.body.blurIntensity) || 50,
      blurArea: parseInt(req.body.blurArea) || 100,
      useFaceLandmarks: req.body.useFaceLandmarks === 'true'
    };

    console.log('Processing options:', blurOptions);

    const result = await processImage(uploadedFilePath, blurOptions);
    
    console.log('Processing completed successfully');

    res.json({
      success: true,
      outputPath: result.outputPath,
      fileName: result.fileName,
      originalFileName: req.file.originalname,
      stats: result.stats
    });

  } catch (error) {
    console.error('Error processing image:', error);
    
    // Clean up uploaded file on error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        await fs.remove(uploadedFilePath);
        console.log('Cleaned up uploaded file after error');
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to process image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    // Clean up uploaded file on success
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try {
        await fs.remove(uploadedFilePath);
        console.log('Cleaned up uploaded file');
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
  }
});

app.get('/api/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(outputsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.get('/api/outputs', (req, res) => {
  try {
    const files = fs.readdirSync(outputsDir)
      .filter(file => /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(file))
      .map(file => ({
        name: file,
        path: `/api/download/${file}`,
        size: fs.statSync(path.join(outputsDir, file)).size,
        created: fs.statSync(path.join(outputsDir, file)).birthtime
      }))
      .sort((a, b) => b.created.getTime() - a.created.getTime());

    res.json(files);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list output files' });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize SafeVision on startup
async function initializeServer() {
  try {
    console.log('Initializing SafeVision integration...');
    const safevisionReady = await setupSafeVision();
    
    if (safevisionReady) {
      console.log('✓ SafeVision is ready for real image processing');
    } else {
      console.log('⚠ SafeVision setup failed - falling back to mock detection');
    }
    
    // Start the server
    app.listen(PORT, HOST, () => {
      console.log(`Server running on ${HOST}:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://${HOST}:${PORT}/api/health`);
      console.log(`Image processing: http://${HOST}:${PORT}/api/process-image`);
    });
    
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Start the server
initializeServer();
