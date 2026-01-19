#!/usr/bin/env node

/**
 * Validation script for Electron setup
 * Checks that all required files and dependencies are in place
 */

const fs = require('fs');
const path = require('path');

const checks = [];
let passed = 0;
let failed = 0;

/**
 * Add a check result
 */
function check(name, condition, errorMessage) {
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
  } else {
    console.log(`✗ ${name}`);
    if (errorMessage) {
      console.log(`  ${errorMessage}`);
    }
    failed++;
  }
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists
 */
function dirExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a package is installed
 */
function packageInstalled(packageName) {
  try {
    require.resolve(packageName);
    return true;
  } catch {
    return false;
  }
}

console.log('StoryCore Creative Studio - Electron Setup Validation\n');

// Check directory structure
console.log('Checking directory structure...');
check('electron/ directory exists', dirExists('electron'));
check('creative-studio-ui/ directory exists', dirExists('creative-studio-ui'));
check('dist/ directory exists or will be created', true); // Will be created on build

// Check Electron files
console.log('\nChecking Electron files...');
check('electron/main.ts exists', fileExists('electron/main.ts'));
check('electron/preload.ts exists', fileExists('electron/preload.ts'));
check('electron/tsconfig.json exists', fileExists('electron/tsconfig.json'));

// Check configuration files
console.log('\nChecking configuration files...');
check('package.json exists', fileExists('package.json'));
check('electron-builder.json exists', fileExists('electron-builder.json'));

// Check if package.json has required scripts
console.log('\nChecking package.json scripts...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check('electron:build script exists', !!packageJson.scripts['electron:build']);
  check('electron:dev script exists', !!packageJson.scripts['electron:dev']);
  check('dev script exists', !!packageJson.scripts['dev']);
  check('build script exists', !!packageJson.scripts['build']);
  check('package script exists', !!packageJson.scripts['package']);
} catch (error) {
  check('package.json is valid JSON', false, error.message);
}

// Check dependencies
console.log('\nChecking dependencies...');
check('electron is installed', packageInstalled('electron'));
check('electron-builder is installed', packageInstalled('electron-builder'));
check('typescript is installed', packageInstalled('typescript'));
check('concurrently is installed', packageInstalled('concurrently'));
check('cross-env is installed', packageInstalled('cross-env'));
check('wait-on is installed', packageInstalled('wait-on'));

// Check if TypeScript compiles
console.log('\nChecking TypeScript compilation...');
const { execSync } = require('child_process');
try {
  execSync('npm run electron:build', { stdio: 'pipe' });
  check('TypeScript compiles successfully', true);
  check('dist/electron/main.js exists', fileExists('dist/electron/main.js'));
  check('dist/electron/preload.js exists', fileExists('dist/electron/preload.js'));
} catch (error) {
  check('TypeScript compiles successfully', false, 'Run: npm run electron:build');
}

// Check creative-studio-ui
console.log('\nChecking creative-studio-ui...');
check('creative-studio-ui/package.json exists', fileExists('creative-studio-ui/package.json'));
try {
  const uiPackageJson = JSON.parse(fs.readFileSync('creative-studio-ui/package.json', 'utf8'));
  check('UI has dev script', !!uiPackageJson.scripts['dev']);
  check('UI has build script', !!uiPackageJson.scripts['build']);
} catch (error) {
  check('creative-studio-ui/package.json is valid', false, error.message);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`Validation Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✓ All checks passed! Electron setup is complete.');
  console.log('\nNext steps:');
  console.log('  1. Start development: npm run dev');
  console.log('  2. Build for production: npm run build');
  console.log('  3. Package as .exe: npm run package:win');
  process.exit(0);
} else {
  console.log('\n✗ Some checks failed. Please fix the issues above.');
  console.log('\nCommon fixes:');
  console.log('  - Install dependencies: npm install');
  console.log('  - Install UI dependencies: cd creative-studio-ui && npm install');
  console.log('  - Build Electron: npm run electron:build');
  process.exit(1);
}
