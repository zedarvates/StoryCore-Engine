/**
 * Electron Development Launcher
 * 
 * Starts Vite dev server and then launches Electron with the loaded UI.
 * This enables hot-reloading for both the main process and renderer.
 */

const { spawn } = require('child_process');
const path = require('path');

const ELECTRON_PATH = path.join(__dirname, '..', 'node_modules', '.bin', 'electron.cmd');
const VITE_PORT = 5173;

async function main() {
  console.log('🚀 Starting StoryCore Creative Studio (Electron Dev Mode)');
  
  // Step 0: Compile Electron TypeScript files
  console.log('🔨 Compiling Electron TypeScript...');
  const tscProcess = spawn('npx', ['tsc', '-p', 'electron/tsconfig.json'], {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'inherit',
    shell: true
  });

  await new Promise((resolve, reject) => {
    tscProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Electron TypeScript compiled');
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed with code ${code}`));
      }
    });
    tscProcess.on('error', reject);
  });
  
  // Step 1: Start Vite dev server for hot-reload during development

  console.log('🌐 Starting Vite dev server...');
  const viteProcess = spawn('npm', ['run', 'dev', '--', '--port', String(VITE_PORT)], {
    cwd: path.join(__dirname, '..'),
    stdio: ['inherit', 'pipe', 'pipe'], // Pipe stdout and stderr to capture output
    shell: true,
    env: { ...process.env, ELECTRON_DISABLE_SANDBOX: '1' }
  });

  // Forward Vite output to console
  viteProcess.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  viteProcess.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Wait for Vite to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Vite server startup timeout'));
    }, 30000);

    viteProcess.stdout.on('data', (data) => {
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

  // Step 2: Launch Electron with the dev server
  console.log('⚡ Launching Electron...');
  
  const electronEnv = { 
    ...process.env, 
    ELECTRON_DISABLE_SANDBOX: '1',
    NODE_ENV: 'development'
  };

  const electronProcess = spawn(ELECTRON_PATH, ['../dist/electron/main.js'], {

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
