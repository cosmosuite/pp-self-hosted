#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testCompleteWorkflow() {
  console.log('🧪 Testing Complete Frontend-Backend-SafeVision Workflow...\n');
  
  try {
    // Test 1: Backend Health Check
    console.log('1️⃣ Testing backend health...');
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend health:', healthData.status);
    
    // Test 2: Image Processing
    console.log('\n2️⃣ Testing image processing...');
    const testImagePath = path.join(__dirname, 'SafeVision/input/1.jpg');
    
    if (!fs.existsSync(testImagePath)) {
      console.error('❌ Test image not found:', testImagePath);
      return false;
    }
    
    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath));
    form.append('applyBlur', 'true');
    form.append('enhancedBlur', 'false');
    form.append('solidColor', 'false');
    form.append('maskColor', JSON.stringify([0, 0, 0]));
    form.append('fullBlurRule', '0');
    form.append('threshold', '0.25');
    
    const processResponse = await fetch('http://localhost:3001/api/process-image', {
      method: 'POST',
      body: form
    });
    
    const processData = await processResponse.json();
    
    if (processData.success) {
      console.log('✅ Image processing successful!');
      console.log('📁 Output file:', processData.fileName);
      console.log('📊 Stats:', processData.stats);
      
      // Test 3: Download processed image
      console.log('\n3️⃣ Testing image download...');
      const downloadResponse = await fetch(`http://localhost:3001/api/download/${processData.fileName}`);
      
      if (downloadResponse.ok) {
        console.log('✅ Image download successful!');
        console.log('📏 Downloaded size:', downloadResponse.headers.get('content-length'), 'bytes');
      } else {
        console.error('❌ Image download failed:', downloadResponse.status);
        return false;
      }
      
    } else {
      console.error('❌ Image processing failed:', processData.error);
      return false;
    }
    
    // Test 4: Frontend accessibility
    console.log('\n4️⃣ Testing frontend accessibility...');
    const frontendResponse = await fetch('http://localhost:5173');
    
    if (frontendResponse.ok) {
      console.log('✅ Frontend is accessible!');
    } else {
      console.error('❌ Frontend not accessible:', frontendResponse.status);
      return false;
    }
    
    console.log('\n🎉 All tests passed! Complete workflow is working!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Backend server running on port 3001');
    console.log('  ✅ SafeVision Python integration working');
    console.log('  ✅ Image processing with real AI detection');
    console.log('  ✅ File upload and download working');
    console.log('  ✅ Frontend accessible on port 5173');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

if (require.main === module) {
  testCompleteWorkflow().then(success => {
    if (success) {
      console.log('\n🚀 Ready to use! Open http://localhost:5173 in your browser');
      process.exit(0);
    } else {
      console.log('\n💥 Some tests failed. Check the errors above.');
      process.exit(1);
    }
  });
}

module.exports = { testCompleteWorkflow };
