# Scripts Reference

Quick reference guide for all build configuration scripts.

## Table of Contents

- [Cleanup Scripts](#cleanup-scripts)
- [Validation Scripts](#validation-scripts)
- [Development Scripts](#development-scripts)
- [Build Scripts](#build-scripts)
- [Testing Scripts](#testing-scripts)

## Cleanup Scripts

### `npm run clean`

Remove all `.js` and `.js.map` files from the `src/` directory.

**Usage:**
```bash
npm run clean
```

**Options:**
```bash
# Preview what would be deleted (dry run)
node scripts/clean-build-artifacts.cjs --dry-run

# Show detailed output
node scripts/clean-build-artifacts.cjs --verbose

# Clean specific directory
node scripts/clean-build-artifacts.cjs --target-dir src/components
```

**When to use:**
- Before starting development
- When encountering module resolution errors
- After accidentally running `tsc` without `noEmit`
- As part of troubleshooting

**What it does:**
- ✅ Removes `**/*.js` from `src/`
- ✅ Removes `**/*.js.map` from `src/`
- ✅ Preserves root-level config files
- ✅ Reports files removed and duration

---

### `npm run clean:dist`

Remove the entire `dist/` directory.

**Usage:**
```bash
npm run clean:dist
```

**When to use:**
- Before production builds
- When build artifacts are corrupted
- To free up disk space

**What it does:**
- ✅ Deletes `dist/` directory completely
- ✅ Ensures clean slate for builds

---

## Validation Scripts

### `npm run validate`

Check build configuration for issues and report problems.

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

**When to use:**
- Before committing changes
- After modifying TypeScript configuration
- When troubleshooting build issues
- In CI/CD pipelines

**What it checks:**
- ✅ No `.js` files in `src/`
- ✅ TypeScript `noEmit` is set correctly
- ✅ `.gitignore` has proper patterns
- ✅ Module resolution is configured correctly

**Exit codes:**
- `0` - Validation passed
- `1` - Validation failed

**Example output:**
```
✓ No .js files found in src/
✓ TypeScript noEmit is correctly set
✗ .gitignore missing src/**/*.js pattern
  Fix: Add 'src/**/*.js' to .gitignore

Validation failed with 1 error(s)
Run 'npm run validate -- --fix' to attempt automatic fixes
```

---

## Development Scripts

### `npm run dev`

Start the Vite development server with automatic cleanup.

**Usage:**
```bash
npm run dev
```

**What happens:**
1. Runs `predev` hook → `npm run clean`
2. Starts Vite dev server on `http://localhost:5173`
3. Enables HMR (Hot Module Replacement)
4. Transforms TypeScript in-memory (no `.js` output)

**When to use:**
- Daily development
- Testing changes locally
- Debugging with browser DevTools

**Features:**
- ⚡ Fast startup with automatic cleanup
- 🔥 Hot Module Replacement
- 🎯 TypeScript transformation in-memory
- 🔍 Source maps for debugging

---

### `npm run preview`

Preview the production build locally.

**Usage:**
```bash
npm run preview
```

**When to use:**
- After building for production
- Testing production optimizations
- Verifying build output

**What it does:**
- Serves the `dist/` directory
- Runs on `http://localhost:4173`
- Simulates production environment

---

## Build Scripts

### `npm run build`

Create an optimized production build with validation.

**Usage:**
```bash
npm run build
```

**What happens:**
1. Runs `prebuild` hook → `npm run clean && npm run validate`
2. Runs TypeScript type checking (`tsc -b`)
3. Runs Vite build (bundles to `dist/`)
4. Runs `postbuild` hook → `npm run validate`

**When to use:**
- Creating production deployments
- Testing production builds
- CI/CD pipelines

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

**Features:**
- 🧹 Automatic cleanup before build
- ✅ Configuration validation
- 📦 Optimized bundles with code splitting
- 🗜️ Minification and compression
- 🔍 Source maps (optional)

---

## Testing Scripts

### `npm test`

Run all tests once.

**Usage:**
```bash
npm test
```

**When to use:**
- Before committing changes
- In CI/CD pipelines
- Verifying functionality

---

### `npm run test:watch`

Run tests in watch mode.

**Usage:**
```bash
npm run test:watch
```

**When to use:**
- During development
- Writing new tests
- Debugging test failures

---

### `npm run test:ui`

Open Vitest UI for interactive testing.

**Usage:**
```bash
npm run test:ui
```

**When to use:**
- Exploring test results
- Debugging complex tests
- Viewing test coverage

---

### `npm run test:coverage`

Generate test coverage report.

**Usage:**
```bash
npm test -- --coverage
```

**When to use:**
- Checking test coverage
- Identifying untested code
- CI/CD quality gates

**Output:**
```
coverage/
├── lcov-report/
│   └── index.html
├── coverage-final.json
└── lcov.info
```

---

## Script Combinations

### Clean Everything and Rebuild

```bash
npm run clean && npm run clean:dist && npm run build
```

**Use case:** Complete fresh build

---

### Validate and Start Development

```bash
npm run validate && npm run dev
```

**Use case:** Ensure configuration is correct before starting

---

### Clean, Validate, and Build

```bash
npm run clean && npm run validate && npm run build
```

**Use case:** Production build with full validation

---

### Test and Build

```bash
npm test && npm run build
```

**Use case:** Ensure tests pass before building

---

## Troubleshooting Commands

### Check for .js files in src/

```bash
find src -name "*.js"
```

---

### View TypeScript configuration

```bash
npx tsc --showConfig
```

---

### Debug Vite

```bash
npm run dev -- --debug
```

---

### Verbose cleanup

```bash
node scripts/clean-build-artifacts.cjs --verbose
```

---

### Dry run cleanup

```bash
node scripts/clean-build-artifacts.cjs --dry-run
```

---

## CI/CD Examples

### GitHub Actions

```yaml
- name: Validate and build
  run: |
    npm ci
    npm run validate -- --ci
    npm run build
    npm run validate -- --ci
```

---

### GitLab CI

```yaml
build:
  script:
    - npm ci
    - npm run validate -- --ci
    - npm run build
    - npm run validate -- --ci
```

---

### Pre-commit Hook

```bash
#!/bin/sh
npm run validate
if [ $? -ne 0 ]; then
  echo "❌ Validation failed"
  exit 1
fi
```

---

## Quick Reference Table

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `npm run clean` | Remove .js from src/ | Before dev, troubleshooting |
| `npm run clean:dist` | Remove dist/ | Before builds |
| `npm run validate` | Check configuration | Before commits, in CI |
| `npm run validate -- --fix` | Auto-fix issues | After config changes |
| `npm run validate -- --ci` | Strict validation | CI/CD pipelines |
| `npm run dev` | Start dev server | Daily development |
| `npm run build` | Production build | Deployments |
| `npm run preview` | Preview build | Testing production |
| `npm test` | Run tests | Before commits |
| `npm run test:watch` | Watch tests | During development |

---

## Common Workflows

### Daily Development

```bash
# Start of day
npm run clean
npm run dev

# During development
# (HMR handles updates automatically)

# Before committing
npm run validate
npm test
git add .
git commit -m "Your message"
```

---

### Production Deployment

```bash
# Clean everything
npm run clean
npm run clean:dist

# Validate configuration
npm run validate

# Run tests
npm test

# Build for production
npm run build

# Preview build
npm run preview

# Deploy dist/ directory
```

---

### Troubleshooting

```bash
# Step 1: Clean everything
npm run clean
npm run clean:dist

# Step 2: Validate configuration
npm run validate

# Step 3: Fix issues if found
npm run validate -- --fix

# Step 4: Try development again
npm run dev
```

---

### CI/CD Pipeline

```bash
# Install dependencies
npm ci

# Validate configuration
npm run validate -- --ci

# Run tests
npm test

# Build project
npm run build

# Post-build validation
npm run validate -- --ci

# Deploy dist/
```

---

## Environment Variables

### Development

```bash
NODE_ENV=development npm run dev
```

---

### Production

```bash
NODE_ENV=production npm run build
```

---

### Debug Mode

```bash
DEBUG=* npm run dev
```

---

## Performance Tips

1. **Use cleanup selectively**: Target specific directories with `--target-dir`
2. **Skip validation in dev**: Only validate before commits
3. **Parallel testing**: Use `--parallel` flag for faster tests
4. **Cache dependencies**: Use `npm ci` in CI/CD for faster installs

---

## Getting Help

- **Documentation**: See [BUILD_CONFIGURATION.md](BUILD_CONFIGURATION.md)
- **README**: See [README.md](../README.md)
- **Issues**: Check GitHub issues for similar problems
- **Support**: Create a new issue with error details

---

## Summary

**Most commonly used scripts:**

```bash
npm run clean      # Clean source directory
npm run validate   # Check configuration
npm run dev        # Start development
npm run build      # Build for production
npm test           # Run tests
```

**Remember:**
- Always clean before troubleshooting
- Validate before committing
- Test before building
- Build before deploying

For detailed information, see [BUILD_CONFIGURATION.md](BUILD_CONFIGURATION.md).
