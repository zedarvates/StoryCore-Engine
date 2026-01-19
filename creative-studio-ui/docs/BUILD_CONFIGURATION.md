# Build Configuration Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Scripts Reference](#scripts-reference)
4. [TypeScript Configuration](#typescript-configuration)
5. [Cleanup System](#cleanup-system)
6. [Validation System](#validation-system)
7. [Troubleshooting](#troubleshooting)
8. [CI/CD Integration](#cicd-integration)
9. [Advanced Topics](#advanced-topics)

## Overview

### The Problem

TypeScript/JavaScript compilation conflicts occur when compiled `.js` files coexist with TypeScript source files (`.ts`, `.tsx`) in the same directory. This causes:

- **Module resolution errors**: The runtime loads the wrong file format
- **Type checking failures**: TypeScript can't find the correct source files
- **Build inconsistencies**: Different environments produce different results
- **Development friction**: HMR (Hot Module Replacement) breaks

### The Solution

This project implements a comprehensive build configuration system that:

1. **Prevents `.js` generation in `src/`**: TypeScript is configured with `noEmit: true`
2. **Automates cleanup**: Pre-build hooks remove any stray `.js` files
3. **Validates configuration**: Scripts detect and report configuration issues
4. **Enforces separation**: Git ignores compiled artifacts in source directories

### Key Principles

- **Source and output separation**: `src/` contains only TypeScript, `dist/` contains only JavaScript
- **Single source of truth**: Vite's esbuild handles all JavaScript generation
- **Defense in depth**: Multiple layers of protection (config, cleanup, validation, git)
- **Developer experience**: Automated processes minimize manual intervention

## Architecture

### Build Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Package.json Scripts                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   dev    │  │  build   │  │  clean   │  │ validate │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cleanup System                            │
│  • Remove .js/.js.map from src/                             │
│  • Preserve root-level config files                         │
│  • Clean dist/ directory                                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              TypeScript Configuration                        │
│  • noEmit: true (no .js generation)                         │
│  • moduleResolution: "bundler"                              │
│  • allowImportingTsExtensions: true                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vite Build System                          │
│  • esbuild transforms .ts → .js in memory                   │
│  • Output only to dist/                                     │
│  • HMR without intermediate files                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Validation System                           │
│  • Detect .js files in src/                                 │
│  • Verify tsconfig settings                                 │
│  • Report conflicts with actionable messages                │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
┌──────────────┐
│   npm run    │
│     dev      │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│   predev     │────▶│    clean     │
│    hook      │     │   script     │
└──────┬───────┘     └──────────────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│     dev      │────▶│     Vite     │
│   command    │     │  dev server  │
└──────────────┘     └──────────────┘
```

## Scripts Reference

### Cleanup Scripts

#### `npm run clean`

Removes all `.js` and `.js.map` files from the `src/` directory while preserving root-level configuration files.

**Usage:**
```bash
npm run clean
```

**Options:**
```bash
# Dry run (preview without deleting)
node scripts/clean-build-artifacts.cjs --dry-run

# Verbose output
node scripts/clean-build-artifacts.cjs --verbose

# Target specific directory
node scripts/clean-build-artifacts.cjs --target-dir src/components
```

**What it does:**
- Recursively scans `src/` directory
- Removes `**/*.js` and `**/*.js.map` files
- Preserves `*.config.js`, `vite.config.ts`, and other root-level files
- Reports number of files removed and duration

**When to use:**
- Before starting development after pulling changes
- When encountering module resolution errors
- After accidentally running `tsc` without `noEmit`
- As part of troubleshooting build issues

#### `npm run clean:dist`

Removes the entire `dist/` directory.

**Usage:**
```bash
npm run clean:dist
```

**What it does:**
- Deletes the `dist/` directory and all contents
- Ensures clean slate for production builds

**When to use:**
- Before production builds
- When build artifacts are corrupted
- To free up disk space

### Validation Scripts

#### `npm run validate`

Checks the build configuration for common issues and reports problems with actionable fixes.

**Usage:**
```bash
npm run validate
```

**Options:**
```bash
# Attempt automatic fixes
npm run validate -- --fix

# CI mode (strict, no prompts)
npm run validate -- --ci
```

**What it checks:**

1. **JavaScript files in src/**
   - Scans `src/` for `.js` files
   - Reports file paths
   - Suggests running cleanup

2. **TypeScript configuration**
   - Verifies `noEmit: true` in `tsconfig.app.json`
   - Checks `moduleResolution` setting
   - Validates `exclude` patterns

3. **Git ignore patterns**
   - Checks for `src/**/*.js` pattern
   - Verifies `dist/` is ignored
   - Reports missing patterns

4. **Module resolution**
   - Validates Vite configuration
   - Checks extension priority

**Output example:**
```
✓ No .js files found in src/
✓ TypeScript noEmit is correctly set
✓ .gitignore patterns are correct
✗ Module resolution priority incorrect
  Fix: Update vite.config.ts resolve.extensions

Validation failed with 1 error(s)
Run 'npm run validate -- --fix' to attempt automatic fixes
```

**Exit codes:**
- `0`: Validation passed
- `1`: Validation failed (errors found)

### Development Scripts

#### `npm run dev`

Starts the Vite development server with automatic cleanup.

**Execution flow:**
1. Runs `predev` hook → `npm run clean`
2. Starts Vite dev server
3. Serves TypeScript files with in-memory transformation

**Usage:**
```bash
npm run dev
```

**What happens:**
- Cleanup removes any `.js` files from `src/`
- Vite starts on `http://localhost:5173`
- HMR enabled for instant updates
- TypeScript files transformed in-memory (no `.js` output)

### Build Scripts

#### `npm run build`

Creates an optimized production build with validation.

**Execution flow:**
1. Runs `prebuild` hook → `npm run clean && npm run validate`
2. Runs TypeScript type checking (`tsc -b`)
3. Runs Vite build
4. Runs `postbuild` hook → `npm run validate`

**Usage:**
```bash
npm run build
```

**What happens:**
- Cleanup ensures clean source directory
- Validation checks configuration
- TypeScript performs type checking (no emit)
- Vite bundles and optimizes to `dist/`
- Post-build validation confirms no `.js` in `src/`

**Output:**
```
dist/
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
├── index.html
└── ...
```

## TypeScript Configuration

### Configuration Files

The project uses three TypeScript configuration files:

1. **`tsconfig.json`** - Base configuration
2. **`tsconfig.app.json`** - Application code
3. **`tsconfig.node.json`** - Node.js scripts
4. **`tsconfig.test.json`** - Test files

### Key Settings Explained

#### `noEmit: true`

**Purpose:** Prevents TypeScript from generating `.js` files.

```json
{
  "compilerOptions": {
    "noEmit": true
  }
}
```

**Why it matters:**
- TypeScript performs type checking only
- Vite handles all JavaScript generation
- Eliminates risk of `.js` files in `src/`

**Without this setting:**
- TypeScript would generate `.js` files alongside `.ts` files
- Module resolution would load the wrong files
- Build would fail with format mismatches

#### `moduleResolution: "bundler"`

**Purpose:** Optimizes module resolution for Vite/bundler environments.

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

**Why it matters:**
- Enables bundler-specific resolution features
- Supports `allowImportingTsExtensions`
- Matches Vite's resolution behavior

#### `allowImportingTsExtensions: true`

**Purpose:** Allows explicit `.ts` extensions in imports.

```json
{
  "compilerOptions": {
    "allowImportingTsExtensions": true
  }
}
```

**Why it matters:**
- Enables explicit imports: `import { foo } from './bar.ts'`
- Improves IDE autocomplete
- Makes imports more explicit

#### `exclude` patterns

**Purpose:** Excludes directories from TypeScript compilation.

```json
{
  "exclude": [
    "dist",
    "node_modules",
    "**/*.js"
  ]
}
```

**Why it matters:**
- Prevents TypeScript from scanning output directories
- Excludes any stray `.js` files
- Improves compilation performance

### Verifying Configuration

Check your TypeScript configuration:

```bash
# View effective configuration
npx tsc --showConfig

# Type check without emit
npx tsc --noEmit

# Validate configuration
npm run validate
```

## Cleanup System

### How It Works

The cleanup system uses Node.js file system APIs to recursively scan and remove compiled artifacts.

### Implementation Details

**File:** `scripts/clean-build-artifacts.cjs`

**Algorithm:**
1. Recursively traverse target directory (default: `src/`)
2. For each file:
   - Check if it matches removal patterns (`**/*.js`, `**/*.js.map`)
   - Check if it matches preserve patterns (`*.config.js`)
   - If matches removal and not preserve, delete file
3. Report results (files removed, errors, duration)

**Patterns:**

```javascript
const config = {
  // Directories to scan
  sourceDirs: ['src'],
  
  // Patterns to remove
  removePatterns: ['**/*.js', '**/*.js.map'],
  
  // Patterns to preserve
  preservePatterns: ['*.config.js', 'vite.config.ts'],
  
  // Directories to exclude
  excludeDirs: ['node_modules', 'dist', '.git']
};
```

### Error Handling

The cleanup script handles common errors:

**Permission denied:**
```
Error: EACCES: permission denied, unlink 'src/file.js'
Solution: Run with appropriate permissions or check file locks
```

**File in use:**
```
Error: EBUSY: resource busy or locked, unlink 'src/file.js'
Solution: Close applications using the file and retry
```

**Directory not found:**
```
Warning: Target directory 'src' does not exist
Solution: Verify project structure
```

### Performance

**Benchmarks:**
- Small projects (< 100 files): < 1 second
- Medium projects (100-500 files): 1-2 seconds
- Large projects (500-1000 files): 2-5 seconds

**Optimization tips:**
- Use `--target-dir` to clean specific directories
- Exclude large directories with `excludeDirs`
- Run cleanup in parallel with other tasks

## Validation System

### How It Works

The validation system performs static analysis of project configuration and file system state.

### Implementation Details

**File:** `scripts/validate-build-config.cjs`

**Validation checks:**

1. **JavaScript file detection**
   ```javascript
   function validateNoJsInSrc() {
     const jsFiles = findJsFiles('src/');
     if (jsFiles.length > 0) {
       return {
         valid: false,
         issues: [{
           type: 'js-in-src',
           severity: 'error',
           message: `Found ${jsFiles.length} .js files in src/`,
           files: jsFiles,
           fix: 'npm run clean'
         }]
       };
     }
     return { valid: true, issues: [] };
   }
   ```

2. **TypeScript configuration**
   ```javascript
   function validateTsConfig() {
     const config = JSON.parse(fs.readFileSync('tsconfig.app.json'));
     if (config.compilerOptions.noEmit !== true) {
       return {
         valid: false,
         issues: [{
           type: 'tsconfig-emit',
           severity: 'error',
           message: 'noEmit should be true',
           file: 'tsconfig.app.json',
           fix: 'Set "noEmit": true in tsconfig.app.json'
         }]
       };
     }
     return { valid: true, issues: [] };
   }
   ```

3. **Git ignore patterns**
   ```javascript
   function validateGitIgnore() {
     const gitignore = fs.readFileSync('.gitignore', 'utf8');
     const requiredPatterns = ['src/**/*.js', 'dist/'];
     const missing = requiredPatterns.filter(p => !gitignore.includes(p));
     
     if (missing.length > 0) {
       return {
         valid: false,
         issues: [{
           type: 'gitignore-missing',
           severity: 'warning',
           message: `Missing patterns: ${missing.join(', ')}`,
           fix: 'npm run validate -- --fix'
         }]
       };
     }
     return { valid: true, issues: [] };
   }
   ```

### Automatic Fixes

The `--fix` flag attempts to automatically resolve issues:

**What it fixes:**
- Adds missing `.gitignore` patterns
- Creates missing configuration files with defaults

**What it doesn't fix:**
- TypeScript configuration (suggests manual changes)
- Existing `.js` files (suggests running cleanup)
- Complex configuration issues

**Example:**
```bash
npm run validate -- --fix
```

Output:
```
Attempting automatic fixes...

✓ Added 'src/**/*.js' to .gitignore
✓ Added 'dist/' to .gitignore
⚠ Cannot automatically fix TypeScript configuration
  Manual action required: Set "noEmit": true in tsconfig.app.json

Fixed 2 issues, 1 requires manual intervention
```

### CI Mode

Use `--ci` flag for continuous integration:

```bash
npm run validate -- --ci
```

**Behavior:**
- Strict validation (no warnings ignored)
- Non-zero exit code on any issue
- No interactive prompts
- Formatted output for CI logs

**Example CI configuration:**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate build configuration
        run: npm run validate -- --ci
      
      - name: Build project
        run: npm run build
      
      - name: Post-build validation
        run: npm run validate -- --ci
```

## Troubleshooting

### Common Issues and Solutions

#### Issue 1: Module Resolution Errors

**Symptoms:**
```
Error: Cannot find module './undoRedo'
Error: exports is not defined
Error: require is not defined
```

**Diagnosis:**
```bash
# Check for .js files in src/
npm run validate
```

**Solution:**
```bash
# Clean and restart
npm run clean
npm run dev
```

**Root cause:** Stray `.js` files in `src/` conflicting with `.ts` files.

**Prevention:**
- Always run cleanup before development
- Enable pre-commit hooks
- Use validation regularly

#### Issue 2: TypeScript Generating .js Files

**Symptoms:**
- `.js` files appearing in `src/` after running `tsc`
- Build creates files in wrong location

**Diagnosis:**
```bash
# Check TypeScript configuration
npm run validate

# View effective config
npx tsc --showConfig
```

**Solution:**
```bash
# Update tsconfig.app.json
{
  "compilerOptions": {
    "noEmit": true
  }
}

# Clean existing files
npm run clean
```

**Root cause:** TypeScript compiler configured to emit JavaScript files.

**Prevention:**
- Validate configuration regularly
- Use `noEmit: true` in all tsconfig files
- Never set `outDir` to `src/`

#### Issue 3: Git Tracking .js Files

**Symptoms:**
- `git status` shows `.js` files in `src/`
- Validation reports missing `.gitignore` patterns

**Diagnosis:**
```bash
# Check git status
git status

# Check .gitignore
npm run validate
```

**Solution:**
```bash
# Add proper patterns
npm run validate -- --fix

# Remove tracked files
git rm src/**/*.js
git commit -m "Remove compiled artifacts"
```

**Root cause:** Missing or incorrect `.gitignore` patterns.

**Prevention:**
- Use validation with `--fix` flag
- Review `.gitignore` regularly
- Set up pre-commit hooks

#### Issue 4: HMR Not Working

**Symptoms:**
- Changes not reflected in browser
- Dev server requires manual refresh
- Console shows module errors

**Diagnosis:**
```bash
# Check for conflicts
npm run validate

# Check dev server logs
npm run dev
```

**Solution:**
```bash
# Clean and restart
npm run clean
npm run dev
```

**Root cause:** Stale `.js` files interfering with HMR.

**Prevention:**
- Run cleanup before starting dev server
- Use `predev` hook (already configured)
- Clear browser cache if issues persist

#### Issue 5: Build Fails with "Cannot Write File"

**Symptoms:**
```
Error: Cannot write file 'src/components/MyComponent.js'
Error: EEXIST: file already exists
```

**Diagnosis:**
```bash
# Check for existing files
npm run validate

# Check TypeScript config
npx tsc --showConfig
```

**Solution:**
```bash
# Remove conflicting files
npm run clean

# Verify configuration
npm run validate

# Rebuild
npm run build
```

**Root cause:** TypeScript trying to write to `src/` directory.

**Prevention:**
- Ensure `noEmit: true` in all tsconfig files
- Run validation before builds
- Use `prebuild` hook (already configured)

### Debugging Tools

#### Check Build Configuration

```bash
# Full validation report
npm run validate

# TypeScript configuration
npx tsc --showConfig

# Vite configuration
npx vite --debug
```

#### Inspect File System

```bash
# Find all .js files in src/
find src -name "*.js"

# Count .js files
find src -name "*.js" | wc -l

# Show file details
ls -la src/**/*.js
```

#### Monitor Build Process

```bash
# Verbose cleanup
node scripts/clean-build-artifacts.cjs --verbose

# Verbose validation
node scripts/validate-build-config.cjs --verbose

# Vite debug mode
npm run dev -- --debug
```

### Getting Help

If you're still experiencing issues:

1. **Check documentation**: Review this guide and README
2. **Run diagnostics**: `npm run validate`
3. **Check logs**: Review build output and error messages
4. **Search issues**: Check GitHub issues for similar problems
5. **Ask for help**: Create a new issue with:
   - Error messages
   - Validation output
   - TypeScript configuration
   - Steps to reproduce

## CI/CD Integration

### GitHub Actions

**Complete workflow example:**

```yaml
name: Build and Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate build configuration
        run: npm run validate -- --ci
      
      - name: Run tests
        run: npm test
      
      - name: Build project
        run: npm run build
      
      - name: Post-build validation
        run: npm run validate -- --ci
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist-${{ matrix.node-version }}
          path: dist/
```

### GitLab CI

```yaml
# .gitlab-ci.yml
image: node:18

stages:
  - validate
  - build
  - test

cache:
  paths:
    - node_modules/

validate:
  stage: validate
  script:
    - npm ci
    - npm run validate -- --ci

build:
  stage: build
  script:
    - npm ci
    - npm run build
    - npm run validate -- --ci
  artifacts:
    paths:
      - dist/
    expire_in: 1 week

test:
  stage: test
  script:
    - npm ci
    - npm test
```

### Pre-commit Hooks

**Using Husky:**

```bash
# Install Husky
npm install --save-dev husky

# Initialize Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run validate"
```

**Pre-commit hook script:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run validation
npm run validate

if [ $? -ne 0 ]; then
  echo "❌ Build configuration validation failed"
  echo "Fix issues before committing"
  exit 1
fi

# Check for .js files in src/
if git diff --cached --name-only | grep -q "^src/.*\.js$"; then
  echo "❌ Attempting to commit .js files in src/"
  echo "These files should not be committed"
  echo "Run 'npm run clean' to remove them"
  exit 1
fi

echo "✅ Build configuration is valid"
exit 0
```

## Advanced Topics

### Custom Cleanup Patterns

Modify `scripts/clean-build-artifacts.cjs` to customize cleanup behavior:

```javascript
const config = {
  // Add custom source directories
  sourceDirs: ['src', 'lib', 'packages'],
  
  // Add custom removal patterns
  removePatterns: [
    '**/*.js',
    '**/*.js.map',
    '**/*.d.ts',      // Remove declaration files
    '**/*.tsbuildinfo' // Remove build info
  ],
  
  // Add custom preserve patterns
  preservePatterns: [
    '*.config.js',
    'vite.config.ts',
    'setupTests.js'    // Preserve test setup
  ],
  
  // Add custom exclude directories
  excludeDirs: [
    'node_modules',
    'dist',
    '.git',
    'coverage'         // Exclude coverage reports
  ]
};
```

### Custom Validation Rules

Add custom validation checks to `scripts/validate-build-config.cjs`:

```javascript
function validateCustomRule() {
  // Example: Check for specific file patterns
  const problematicFiles = findFiles('src/', '**/*.jsx');
  
  if (problematicFiles.length > 0) {
    return {
      valid: false,
      issues: [{
        type: 'jsx-files',
        severity: 'warning',
        message: 'Found .jsx files, prefer .tsx',
        files: problematicFiles,
        fix: 'Rename .jsx files to .tsx'
      }]
    };
  }
  
  return { valid: true, issues: [] };
}

// Add to validation suite
const validationChecks = [
  validateNoJsInSrc,
  validateTsConfig,
  validateGitIgnore,
  validateCustomRule  // Add custom check
];
```

### Monorepo Configuration

For monorepo setups, configure cleanup and validation per package:

```json
{
  "scripts": {
    "clean": "lerna run clean --parallel",
    "validate": "lerna run validate --parallel",
    "build": "lerna run build --stream"
  }
}
```

**Package-level configuration:**

```json
{
  "name": "@myapp/package-a",
  "scripts": {
    "clean": "node ../../scripts/clean-build-artifacts.cjs --target-dir src",
    "validate": "node ../../scripts/validate-build-config.cjs",
    "build": "npm run clean && tsc -b && vite build"
  }
}
```

### Performance Optimization

**Parallel cleanup:**

```javascript
// scripts/clean-build-artifacts.cjs
const { Worker } = require('worker_threads');

async function cleanParallel(directories) {
  const workers = directories.map(dir => {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./clean-worker.js', {
        workerData: { directory: dir }
      });
      worker.on('message', resolve);
      worker.on('error', reject);
    });
  });
  
  return Promise.all(workers);
}
```

**Incremental validation:**

```javascript
// Only validate changed files
function validateIncremental() {
  const changedFiles = execSync('git diff --name-only HEAD')
    .toString()
    .split('\n')
    .filter(f => f.startsWith('src/'));
  
  // Validate only changed files
  return validateFiles(changedFiles);
}
```

### Docker Integration

**Dockerfile with build validation:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Validate build configuration
RUN npm run validate -- --ci

# Build application
RUN npm run build

# Post-build validation
RUN npm run validate -- --ci

# Production stage
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
```

### Debugging Build Issues

**Enable verbose logging:**

```bash
# Verbose cleanup
DEBUG=* node scripts/clean-build-artifacts.cjs --verbose

# Verbose validation
DEBUG=* node scripts/validate-build-config.cjs --verbose

# Vite debug mode
DEBUG=vite:* npm run dev
```

**Trace TypeScript compilation:**

```bash
# Show all files being compiled
npx tsc --listFiles

# Show why files are included
npx tsc --explainFiles

# Show module resolution
npx tsc --traceResolution
```

## Summary

This build configuration system provides:

- ✅ **Automated cleanup** - No manual intervention needed
- ✅ **Configuration validation** - Catch issues early
- ✅ **Clear error messages** - Actionable fixes provided
- ✅ **CI/CD integration** - Works in automated pipelines
- ✅ **Developer experience** - Minimal friction, maximum safety

**Key takeaways:**

1. Always run cleanup before development
2. Use validation regularly to catch issues
3. Enable pre-commit hooks for safety
4. Monitor build output for unexpected behavior
5. Keep TypeScript configuration consistent

For additional help, refer to the [README](../README.md) or create an issue on GitHub.
