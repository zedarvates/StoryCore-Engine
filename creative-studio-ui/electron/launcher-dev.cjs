/**
 * Electron Development Launcher
 * 
 * Starts Vite dev server and then launches Electron with the loaded UI.
 * This enables hot-reloading for both the main process and renderer.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ELECTRON_PATH = path.join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'electron.cmd');
const VITE_PORT = 5173;

async function main() {
  console.log('🚀 Starting StoryCore Creative Studio (Electron Dev Mode)');
  
// Step 1: Build the UI first (required for Electron)
  console.log('📦 Building UI...');
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  await new Promise((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Build failed with code ${code}`));
      }
    });
    buildProcess.on('error', reject);
  });

  console.log('✅ UI built successfully');

// Step 2: Start Vite dev server for hot-reload during development
  console.log('🌐 Starting Vite dev server...');
  const viteProcess = spawn('npm', ['run', 'dev', '--', '--port', String(VITE_PORT)], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1' }
  });

  // Wait for Vite to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Vite server startup timeout'));
    }, 30000);

    viteProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('localhost')) {
        clearTimeout(timeout);
        console.log('✅ Vite dev server ready');
        resolve();
      }
    });

    viteProcess.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  // Step 3: Launch Electron with the built UI
  console.log('⚡ Launching Electron...');
  
  const electronEnv = { 
    ...process.env, 
    ELECTRON_DISABLE_SANDBOX: '1',
    NODE_ENV: 'development'
  };

  const electronProcess = spawn(ELECTRON_PATH, ['.'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: true,
    env: electronEnv
  });

  // Handle Electron process events
  electronProcess.on('close', (code) => {
    console.log(`Electron exited with code ${code}`);
    // Clean up Vite process when Electron closes
    viteProcess.kill();
    process.exit(code);
  });

  electronProcess.on('error', (err) => {
    console.error('Failed to launch Electron:', err);
    viteProcess.kill();
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    viteProcess.kill();
    electronProcess.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down...');
    viteProcess.kill();
    electronProcess.kill();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('❌ Launcher failed:', error.message);
  process.exit(1);
});

