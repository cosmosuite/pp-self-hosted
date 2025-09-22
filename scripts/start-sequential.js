#!/usr/bin/env node

const { spawn } = require('child_process');
const { promisify } = require('util');
const exec = require('child_process').exec;
const execAsync = promisify(exec);

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

function log(service, message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${colors[color]}[${timestamp}] [${service}] ${message}${colors.reset}`);
}

async function waitForService(name, port, healthUrl, maxWait = 30000) {
  log(name, `Waiting for service to start on port ${port}...`, 'yellow');
  
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWait) {
    try {
      const { stdout } = await execAsync(`curl -s ${healthUrl}`);
      if (stdout && stdout.trim()) {
        log(name, `✅ Service is ready!`, 'green');
        return true;
      }
    } catch (error) {
      // Service not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  log(name, `❌ Service failed to start within ${maxWait/1000}s`, 'red');
  return false;
}

async function startService(name, command, args, cwd, env = {}) {
  log(name, `Starting ${name}...`, 'cyan');
  
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: cwd,
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, ...env }
    });
    
    child.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(name, output, 'reset');
      }
    });
    
    child.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        log(name, output, 'yellow');
      }
    });
    
    child.on('error', (error) => {
      log(name, `Error: ${error.message}`, 'red');
      reject(error);
    });
    
    child.on('exit', (code) => {
      if (code !== 0) {
        log(name, `Exited with code ${code}`, 'red');
        reject(new Error(`Service ${name} exited with code ${code}`));
      } else {
        log(name, `Service stopped`, 'yellow');
        resolve();
      }
    });
    
    // Store the child process for cleanup
    child._serviceName = name;
    resolve(child);
  });
}

async function startSequential() {
  const services = [];
  
  try {
    log('SYSTEM', '🚀 Starting services in sequence...', 'bright');
    
    // 1. Start SafeVision first
    log('SYSTEM', 'Step 1: Starting SafeVision...', 'magenta');
    const safevision = await startService(
      'SAFEVISION',
      './safevision_env/bin/python',
      ['safevision_api.py'],
      './SafeVision',
      {}
    );
    services.push(safevision);
    
    // Wait for SafeVision to be ready
    const safevisionReady = await waitForService('SAFEVISION', 5001, 'http://localhost:5001/api/v1/health');
    if (!safevisionReady) {
      throw new Error('SafeVision failed to start');
    }
    
    // 2. Start Backend
    log('SYSTEM', 'Step 2: Starting Backend...', 'blue');
    const backend = await startService(
      'BACKEND',
      'npm',
      ['run', 'dev'],
      './backend',
      { PORT: '3001' }
    );
    services.push(backend);
    
    // Wait for Backend to be ready
    const backendReady = await waitForService('BACKEND', 3001, 'http://localhost:3001/api/health');
    if (!backendReady) {
      throw new Error('Backend failed to start');
    }
    
    // 3. Start Frontend
    log('SYSTEM', 'Step 3: Starting Frontend...', 'green');
    const frontend = await startService(
      'FRONTEND',
      'npx',
      ['vite'],
      './frontend',
      {}
    );
    services.push(frontend);
    
    // Wait for Frontend to be ready
    const frontendReady = await waitForService('FRONTEND', 5173, 'http://localhost:5173');
    if (!frontendReady) {
      log('FRONTEND', '⚠️  Frontend may still be starting...', 'yellow');
    }
    
    log('SYSTEM', '🎉 All services started successfully!', 'green');
    log('SYSTEM', '📊 Service URLs:', 'bright');
    log('SYSTEM', '   SafeVision: http://localhost:5001', 'magenta');
    log('SYSTEM', '   Backend:    http://localhost:3001', 'blue');
    log('SYSTEM', '   Frontend:   http://localhost:5173', 'green');
    log('SYSTEM', 'Press Ctrl+C to stop all services', 'yellow');
    
    // Keep the script running and handle cleanup
    process.on('SIGINT', () => {
      log('SYSTEM', '🛑 Shutting down all services...', 'yellow');
      services.forEach(service => {
        if (service && !service.killed) {
          service.kill('SIGTERM');
        }
      });
      process.exit(0);
    });
    
    // Keep the process alive
    await new Promise(() => {});
    
  } catch (error) {
    log('SYSTEM', `❌ Error: ${error.message}`, 'red');
    
    // Cleanup any started services
    services.forEach(service => {
      if (service && !service.killed) {
        service.kill('SIGTERM');
      }
    });
    
    process.exit(1);
  }
}

// Run the sequential startup
startSequential().catch(error => {
  log('SYSTEM', `Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

