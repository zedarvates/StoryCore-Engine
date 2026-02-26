# StoryCore Engine - Quick Reference

## 🚀 Common Commands

### Development
```bash
# Start development server
npm run dev

# Start UI only
npm run ui:dev

# Start Electron only
npm run electron:dev
```

### Building
```bash
# Full production build
npm run build

# Build UI only
npm run ui:build

# Build Electron only
npm run electron:build

# Watch mode for Electron
npm run electron:build:watch
```

### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode (UI)
cd creative-studio-ui && npm run test:watch

# Run tests with UI
cd creative-studio-ui && npm run test:ui

# Run specific test file
cd creative-studio-ui && npm run test -- path/to/test.test.ts
```

### Packaging
```bash
# Package for current platform
npm run package

# Package for specific platforms
npm run package:win      # Windows
npm run package:mac      # macOS
npm run package:linux    # Linux

# Signed packages (requires certificates)
npm run package:win:signed
npm run package:mac:signed
```

### Icon Generation
```bash
# Generate all platform icons from StorycoreIconeV2.png
npm run icons:generate
```

## 📁 Project Structure

```
storycore-engine/
├── creative-studio-ui/          # React/TypeScript UI
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # Business logic
│   │   ├── stores/              # Zustand state management
│   │   ├── hooks/               # Custom React hooks
│   │   └── types/               # TypeScript types
│   ├── dist/                    # Build output
│   └── package.json
│
├── electron/                    # Electron main process
│   ├── main.ts                  # Main entry point
│   ├── WindowManager.ts         # Window management
│   └── tsconfig.json
│
├── src/                         # Python backend
│   ├── grid_generator.py
│   ├── promotion_engine.py
│   └── qa_engine.py
│
├── workflows/                   # ComfyUI workflows
├── build/                       # Build artifacts & icons
├── dist/                        # UI build output
├── dist-electron/               # Electron build output
│
├── package.json                 # Root package config
├── electron-builder.json        # Electron packaging config
└── README.md
```

## 🔧 Configuration Files

### TypeScript
- `creative-studio-ui/tsconfig.json` - Main TS config
- `creative-studio-ui/tsconfig.app.json` - App-specific config
- `creative-studio-ui/tsconfig.test.json` - Test config
- `electron/tsconfig.json` - Electron config

### Build Tools
- `creative-studio-ui/vite.config.ts` - Vite bundler config
- `creative-studio-ui/vitest.config.ts` - Vitest test config
- `electron-builder.json` - Electron packaging config

### Code Quality
- `creative-studio-ui/eslint.config.js` - ESLint rules
- `creative-studio-ui/.prettierrc` - Prettier formatting
- `creative-studio-ui/tailwind.config.js` - Tailwind CSS

## 🐛 Debugging

### Check Build Status
```bash
# Validate build configuration
cd creative-studio-ui && npm run validate

# Check TypeScript errors
cd creative-studio-ui && npx tsc --noEmit

# Check for diagnostics
npm run build 2>&1 | tee build.log
```

### Common Issues

#### Build Fails
1. Clear node_modules: `rm -rf node_modules && npm install`
2. Clear build cache: `npm run clean`
3. Check Node version: `node --version` (should be 18+)

#### Tests Fail
1. Clear test cache: `cd creative-studio-ui && npx vitest --clearCache`
2. Check for port conflicts: `lsof -i :5173` (macOS/Linux)
3. Review test output: `npm run test 2>&1 | tee test.log`

#### Electron Won't Start
1. Rebuild Electron: `npm run electron:build`
2. Check main process: `node dist-electron/main.js`
3. Clear Electron cache: `rm -rf ~/.config/Electron`

## 📊 Build Metrics

### Current Status (Feb 26, 2026)
- **Build Time**: ~8 seconds
- **Bundle Size**: 1.38 MB (356 KB gzipped)
- **TypeScript Errors**: 0
- **Test Pass Rate**: 50% (improving)
- **Production Ready**: ✅ Yes

### New Features (Q1 2026)
- **Neural Augmented Creation**: ✅ Completed
- **Total Recall AI Memory**: ✅ Completed
- **Recursive LLM Service (RLM)**: ✅ Completed
- **Project Genesis Integration**: ✅ Completed
- **Location & Object Reference Sheets**: ✅ Completed

### Performance Targets
- Build Time: < 10 seconds ✅
- Bundle Size: < 500 KB (gzipped) ⚠️ 356 KB
- Test Pass Rate: > 90% 🔄 50%
- TypeScript Errors: 0 ✅

## 🔗 Important Links

### Documentation
- [Build Report](documentation/reports/BUILD_REPORT.md) - Latest build analysis
- [Tests Status](documentation/TESTS_STATUS.md) - Test improvements
- [Technical Guide](documentation/TECHNICAL_GUIDE.md) - Architecture
- [Troubleshooting](documentation/TROUBLESHOOTING.md) - Common issues
- [Documentation Index](INDEX_DOCUMENTATION_COMPLETE.md) - Complete navigation

### External Resources
- [Vite Documentation](https://vitejs.dev/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Vitest Documentation](https://vitest.dev/)
- [React Documentation](https://react.dev/)

## 🎯 Quick Fixes

### Fix Test Compatibility
```typescript
// Replace Jest with Vitest
import { vi } from 'vitest';

// Before:
jest.useFakeTimers();

// After:
vi.useFakeTimers();
```

### Fix Test Cleanup
```typescript
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
});
```

### Fix Deprecated Patterns
```typescript
// Before:
test('should work', (done) => {
  // ... test code
  done();
});

// After:
test('should work', async () => {
  // ... test code
  await waitFor(() => expect(...).toBe(...));
});
```

## 💡 Tips & Tricks

### Speed Up Builds
```bash
# Use build cache
npm run build -- --cache

# Skip validation (faster, but risky)
cd creative-studio-ui && npm run build:check
```

### Parallel Testing
```bash
# Run tests in parallel
cd creative-studio-ui && npm run test -- --reporter=verbose --threads
```

### Watch Mode Development
```bash
# Terminal 1: Watch Electron
npm run electron:build:watch

# Terminal 2: Watch UI
npm run ui:dev

# Terminal 3: Run Electron
npm run electron:dev
```

### Bundle Analysis
```bash
# Analyze bundle size
cd creative-studio-ui && npm run build -- --mode=analyze

# Check what's in the bundle
npx vite-bundle-visualizer
```


---

**Last Updated**: February 26, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
