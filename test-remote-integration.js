#!/usr/bin/env node

/**
 * Test script for Remote SafeVision API integration
 * This script tests the complete integration flow
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const REMOTE_API_URL = 'https://a2g50oun4fr6h4-5001.proxy.runpod.net/api/v1';
const TEST_IMAGE_PATH = './test-image.jpg';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthEndpoint() {
  log('\n🔍 Testing Health Endpoint...', 'blue');
  
  try {
    const response = await axios.get(`${REMOTE_API_URL}/health`, {
      timeout: 10000
    });
    
    log('✅ Health check passed:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Health check failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testImageDetection() {
  log('\n🖼️  Testing Image Detection...', 'blue');
  
  try {
    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      log(`⚠️  Test image not found: ${TEST_IMAGE_PATH}`, 'yellow');
      log('Please place a test image in the root directory', 'yellow');
      return false;
    }

    // Read and convert image to base64
    const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
    const base64Image = imageBuffer.toString('base64');
    
    const payload = {
      image: base64Image,
      threshold: 0.25,
      blur: true,
      blur_intensity: 50,
      blur_area: 100,
      use_face_landmarks: false,
      // Add some blur rules
      blur_female_genitalia_exposed: true,
      blur_male_genitalia_exposed: true,
      blur_female_breast_exposed: true,
      blur_anus: true
    };

    log('📤 Sending image for processing...', 'cyan');
    const startTime = Date.now();
    
    const response = await axios.post(`${REMOTE_API_URL}/detect/base64`, payload, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const processingTime = Date.now() - startTime;
    
    log('✅ Image detection successful!', 'green');
    console.log(`Processing time: ${processingTime}ms`);
    console.log(`Status: ${response.data.status}`);
    console.log(`Detections: ${response.data.detections?.length || 0}`);
    console.log(`Censored available: ${response.data.censored_available}`);
    
    if (response.data.censored_image) {
      log('📸 Censored image received!', 'green');
      // Could save censored image to file here
    }
    
    return true;
  } catch (error) {
    log('❌ Image detection failed:', 'red');
    console.error(error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

async function testStatsEndpoint() {
  log('\n📊 Testing Stats Endpoint...', 'blue');
  
  try {
    const response = await axios.get(`${REMOTE_API_URL}/stats`, {
      timeout: 5000
    });
    
    log('✅ Stats retrieved successfully:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Stats endpoint failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testLabelsEndpoint() {
  log('\n🏷️  Testing Labels Endpoint...', 'blue');
  
  try {
    const response = await axios.get(`${REMOTE_API_URL}/labels`, {
      timeout: 5000
    });
    
    log('✅ Labels retrieved successfully:', 'green');
    console.log(JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    log('❌ Labels endpoint failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function testFrontendIntegration() {
  log('\n🌐 Testing Frontend Integration...', 'blue');
  
  try {
    const frontendDir = './frontend';
    if (!fs.existsSync(frontendDir)) {
      log('⚠️  Frontend directory not found', 'yellow');
      return false;
    }

    // Check if frontend has been updated with remote API
    const apiServicePath = path.join(frontendDir, 'src/services/safevisionApi.ts');
    if (!fs.existsSync(apiServicePath)) {
      log('⚠️  Frontend API service not found', 'yellow');
      return false;
    }

    const apiServiceContent = fs.readFileSync(apiServicePath, 'utf8');
    const hasRemoteConfig = apiServiceContent.includes('API_CONFIG');
    const hasRemoteUrl = apiServiceContent.includes('runpod.net') || apiServiceContent.includes('a2g50oun4fr6h4');
    const hasTimeoutConfig = apiServiceContent.includes('AbortSignal.timeout');
    const hasRetryLogic = apiServiceContent.includes('executeWithRetry');

    // Debug: show what we found
    log(`File: ${apiServicePath}`, 'cyan');
    log(`Contains 'API_CONFIG': ${apiServiceContent.includes('API_CONFIG')}`, 'cyan');
    log(`Contains 'runpod.net': ${apiServiceContent.includes('runpod.net')}`, 'cyan');
    log(`Contains 'a2g50oun4fr6h4': ${apiServiceContent.includes('a2g50oun4fr6h4')}`, 'cyan');

    log(`API_CONFIG: ${hasRemoteConfig ? '✅' : '❌'}`, hasRemoteConfig ? 'green' : 'red');
    log(`Remote URL: ${hasRemoteUrl ? '✅' : '❌'}`, hasRemoteUrl ? 'green' : 'red');
    log(`Timeout handling: ${hasTimeoutConfig ? '✅' : '❌'}`, hasTimeoutConfig ? 'green' : 'red');
    log(`Retry logic: ${hasRetryLogic ? '✅' : '❌'}`, hasRetryLogic ? 'green' : 'red');

    // Check if config file exists and has correct URL
    const configPath = path.join(frontendDir, 'src/config/api.ts');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf8');
      const configHasRemoteUrl = configContent.includes('runpod.net') || configContent.includes('a2g50oun4fr6h4');
      
      log(`Config file: ${configPath}`, 'cyan');
      log(`Config has remote URL: ${configHasRemoteUrl}`, 'cyan');
      
      if (hasRemoteConfig && configHasRemoteUrl) {
        log('✅ Frontend has remote SafeVision configuration', 'green');
        return true;
      }
    }
    
    log('❌ Frontend needs to be updated for remote SafeVision', 'red');
    return false;
  } catch (error) {
    log('❌ Frontend integration test failed:', 'red');
    console.error(error.message);
    return false;
  }
}

async function runAllTests() {
  log('🚀 Starting Remote SafeVision Integration Tests', 'bright');
  log('=' .repeat(50), 'cyan');

  let passedTests = 0;
  let totalTests = 5;

  // Run all tests
  const tests = [
    { name: 'Health Endpoint', fn: testHealthEndpoint },
    { name: 'Image Detection', fn: testImageDetection },
    { name: 'Stats Endpoint', fn: testStatsEndpoint },
    { name: 'Labels Endpoint', fn: testLabelsEndpoint },
    { name: 'Frontend Integration', fn: testFrontendIntegration }
  ];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passedTests++;
      }
    } catch (error) {
      log(`❌ ${test.name} test crashed:`, 'red');
      console.error(error.message);
    }
  }

  log('\n' + '=' .repeat(50), 'cyan');
  log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`, 
      passedTests === totalTests ? 'green' : passedTests > totalTests / 2 ? 'yellow' : 'red');

  if (passedTests === totalTests) {
    log('🎉 All tests passed! Integration is ready!', 'green');
    log('\n🎯 Next steps:', 'bright');
    log('1. Update backend environment variables', 'cyan');
    log('2. Deploy backend with SAFEVISION_USE_REMOTE=true', 'cyan');
    log('3. Deploy frontend with new configuration', 'cyan');
    log('4. Test the complete workflow in production', 'cyan');
  } else {
    log('⚠️  Some tests failed. Please check the issues above.', 'yellow');
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log('💥 Uncaught Exception:', 'red');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {

  log('💥 Unhandled Rejection:', 'red');
  console.error(reason);
  process.exit(1);
});

// Run tests
runAllTests().catch((error) => {
  log('💥 Test suite failed:', 'red');
  console.error(error);
  process.exit(1);
});
