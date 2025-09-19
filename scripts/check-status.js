#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkStatus() {
  console.log('🔍 Checking service status...\n');

  const services = [
    {
      name: 'Backend (Node.js)',
      port: 3001,
      healthUrl: 'http://localhost:3001/api/health',
      color: '🔵'
    },
    {
      name: 'Frontend (Vite)',
      port: 5173,
      healthUrl: 'http://localhost:5173',
      color: '🟢'
    },
    {
      name: 'SafeVision (Python)',
      port: 5001,
      healthUrl: 'http://localhost:5001/api/v1/health',
      color: '🟣'
    }
  ];

  for (const service of services) {
    try {
      // Check if port is in use
      const { stdout } = await execAsync(`lsof -ti:${service.port}`);
      if (stdout.trim()) {
        // Try to make a health check request
        try {
          const { stdout: healthResponse } = await execAsync(`curl -s ${service.healthUrl}`);
          console.log(`${service.color} ${service.name}: ✅ Running (Port ${service.port})`);
          if (healthResponse) {
            console.log(`   Health: ${healthResponse.substring(0, 100)}...`);
          }
        } catch (healthError) {
          console.log(`${service.color} ${service.name}: ⚠️  Running but not responding (Port ${service.port})`);
        }
      } else {
        console.log(`${service.color} ${service.name}: ❌ Not running (Port ${service.port})`);
      }
    } catch (error) {
      console.log(`${service.color} ${service.name}: ❌ Not running (Port ${service.port})`);
    }
  }

  console.log('\n💡 Use "npm run dev" to start all services');
  console.log('💡 Use "npm run kill:all" to stop all services');
  console.log('💡 Use "npm run restart" to restart all services');
}

// Run the status check
checkStatus().catch(error => {
  console.error('❌ Error checking status:', error);
  process.exit(1);
});

