const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');

const app = express();
const PORT = 3001;

// Create directories
const uploadsDir = path.join(__dirname, 'uploads');
const outputsDir = path.join(__dirname, 'outputs');

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputsDir);

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Simple image processing test
app.post('/api/test-image', upload.single('image'), async (req, res) => {
  try {
    console.log('Test image upload received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    console.log('File uploaded:', req.file.path);
    
    // Test Sharp processing
    const image = sharp(req.file.path);
    const metadata = await image.metadata();
    
    console.log('Image metadata:', metadata);
    
    // Create a simple blurred version
    const outputPath = path.join(outputsDir, 'test-' + Date.now() + '.jpg');
    
    await image
      .blur(10)
      .jpeg()
      .toFile(outputPath);
    
    console.log('Processed image saved to:', outputPath);
    
    // Clean up uploaded file
    await fs.remove(req.file.path);
    
    res.json({
      success: true,
      message: 'Image processed successfully',
      metadata: metadata,
      outputPath: outputPath
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ 
      error: 'Test failed',
      details: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
});
