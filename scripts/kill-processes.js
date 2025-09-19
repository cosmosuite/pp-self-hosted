#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function killProcesses() {
  console.log('🔍 Checking for running instances...');
  
  const processes = [
    {
      name: 'Backend (Node.js)',
      patterns: ['node dist/index.js', 'ts-node-dev.*src/index.ts'],
      ports: [3001]
    },
    {
      name: 'Frontend (Vite)',
      patterns: ['vite', 'npm run dev'],
      ports: [5173]
    },
    {
      name: 'SafeVision (Python)',
      patterns: ['safevision_api.py', 'python.*safevision_api'],
      ports: [5001]
    }
  ];

  let killedCount = 0;

  for (const process of processes) {
    try {
      // Check for processes by pattern
      for (const pattern of process.patterns) {
        try {
          const { stdout } = await execAsync(`pgrep -f "${pattern}"`);
          if (stdout.trim()) {
            const pids = stdout.trim().split('\n');
            for (const pid of pids) {
              if (pid) {
                console.log(`🔪 Killing ${process.name} (PID: ${pid})`);
                await execAsync(`kill -9 ${pid}`);
                killedCount++;
              }
            }
          }
        } catch (error) {
          // No processes found, continue
        }
      }

      // Check for processes by port
      for (const port of process.ports) {
        try {
          const { stdout } = await execAsync(`lsof -ti:${port}`);
          if (stdout.trim()) {
            const pids = stdout.trim().split('\n');
            for (const pid of pids) {
              if (pid) {
                console.log(`🔪 Killing process on port ${port} (PID: ${pid})`);
                await execAsync(`kill -9 ${pid}`);
                killedCount++;
              }
            }
          }
        } catch (error) {
          // No processes found on this port, continue
        }
      }
    } catch (error) {
      console.log(`⚠️  Error checking ${process.name}:`, error.message);
    }
  }

  if (killedCount === 0) {
    console.log('✅ No running instances found');
  } else {
    console.log(`✅ Killed ${killedCount} process(es)`);
  }

  // Wait a moment for processes to fully terminate
  await new Promise(resolve => setTimeout(resolve, 1000));
}

// Run the cleanup
killProcesses().catch(error => {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
});

