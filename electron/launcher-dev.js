#!/usr/bin/env node

/**
 * Development launcher script
 * This script helps with development by providing better error messages
 * and ensuring the Vite dev server is running before launching Electron
 */

const { spawn } = require('child_process');
const http = require('http');

const VITE_URL = 'http://localhost:5173';
const MAX_RETRIES = 30;
const RETRY_DELAY = 1000;

/**
 * Check if Vite dev server is running
 */
function checkViteServer() {
  return new Promise((resolve) => {
    http.get(VITE_URL, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Wait for Vite server to be ready
 */
async function waitForVite() {
  console.log('Waiting for Vite dev server...');
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    const isReady = await checkViteServer();
    if (isReady) {
      console.log('✓ Vite dev server is ready');
      return true;
    }
    
    process.stdout.write('.');
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  }
  
  console.log('\n✗ Vite dev server is not responding');
  console.log('\nPlease start the Vite dev server first:');
  console.log('  cd creative-studio-ui');
  console.log('  npm run dev');
  return false;
}

/**
 * Launch Electron
 */
function launchElectron() {
  console.log('Launching Electron...');
  
  const electron = spawn('electron', ['.'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  electron.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
    process.exit(code);
  });
}

/**
 * Main function
 */
async function main() {
  console.log('StoryCore Creative Studio - Development Launcher\n');
  
  const viteReady = await waitForVite();
  if (!viteReady) {
    process.exit(1);
  }
  
  launchElectron();
}

main();
