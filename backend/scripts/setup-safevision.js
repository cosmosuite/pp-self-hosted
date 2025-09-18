const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

async function setupSafeVision() {
  console.log('Setting up SafeVision integration...');
  
  const safevisionPath = path.join(__dirname, '../../../SafeVision');
  
  // Check if SafeVision directory exists
  if (!fs.existsSync(safevisionPath)) {
    console.error('SafeVision directory not found!');
    return false;
  }
  
  // Check if Python is available
  try {
    await execAsync('python3 --version');
    console.log('Python3 is available');
  } catch (error) {
    console.error('Python3 is not available. Please install Python 3.7+');
    return false;
  }
  
  // Check if required Python packages are installed
  const requiredPackages = ['onnxruntime', 'opencv-python', 'numpy', 'Pillow'];
  
  for (const package of requiredPackages) {
    try {
      await execAsync(`python3 -c "import ${package}"`);
      console.log(`✓ ${package} is installed`);
    } catch (error) {
      console.log(`✗ ${package} is missing. Installing...`);
      try {
        await execAsync(`pip3 install ${package}`);
        console.log(`✓ ${package} installed successfully`);
      } catch (installError) {
        console.error(`Failed to install ${package}:`, installError.message);
        return false;
      }
    }
  }
  
  // Test the main SafeVision script
  try {
    console.log('Testing SafeVision main script...');
    const testCommand = `cd "${safevisionPath}" && python3 main.py --help`;
    await execAsync(testCommand);
    console.log('✓ SafeVision main script is working');
  } catch (error) {
    console.error('✗ SafeVision main script test failed:', error.message);
    return false;
  }
  
  // Check if models exist
  const modelsDir = path.join(safevisionPath, 'Models');
  const modelFile = path.join(modelsDir, 'best.onnx');
  
  if (!fs.existsSync(modelFile)) {
    console.log('⚠ SafeVision model not found. It will be downloaded on first use.');
  } else {
    console.log('✓ SafeVision model found');
  }
  
  console.log('✓ SafeVision setup completed successfully!');
  return true;
}

function execAsync(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

if (require.main === module) {
  setupSafeVision().then(success => {
    if (success) {
      console.log('SafeVision is ready for use!');
      process.exit(0);
    } else {
      console.error('SafeVision setup failed!');
      process.exit(1);
    }
  });
}

module.exports = { setupSafeVision };
