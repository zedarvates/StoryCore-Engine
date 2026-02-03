# Electron Setup Documentation

This document describes the Electron setup for the StoryCore Creative Studio Windows executable launcher.

## Overview

The StoryCore Creative Studio uses Electron to provide a native Windows application experience. The Electron application wraps the existing React/Vite-based Creative Studio UI and provides:

- Native Windows executable (.exe) packaging
- System integration (system tray, file dialogs, etc.)
- Vite server lifecycle management
- Project management capabilities
- Recent projects tracking

## Project Structure

```
storycore-engine/
├── electron/                    # Electron main process code
│   ├── main.ts                 # Main entry point
│   ├── preload.ts              # Preload script (IPC bridge)
│   ├── tsconfig.json           # TypeScript configuration
│   ├── launcher-dev.js         # Development launcher helper
│   └── README.md               # Electron-specific documentation
├── creative-studio-ui/         # React/Vite UI application
│   ├── src/                    # UI source code
│   ├── dist/                   # Production build output
│   └── package.json            # UI dependencies
├── dist/                       # Build output
│   └── electron/               # Compiled Electron code
├── release/                    # Packaged executables
├── electron-builder.json       # Electron Builder configuration
└── package.json                # Root package.json with build scripts
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+ (for the StoryCore backend)
- Windows 10/11 (for Windows builds)

### Install Dependencies

```bash
# Install root dependencies (Electron, build tools)
npm install

# Install UI dependencies
cd creative-studio-ui
npm install
cd ..
```

## Development

### Running in Development Mode

**Option 1: Full Development Environment (Recommended)**

This starts both the Vite dev server and Electron with hot reload:

```bash
npm run dev
```

This command:
1. Starts the TypeScript compiler in watch mode for Electron
2. Starts the Vite dev server for the UI
3. Waits for Vite to be ready
4. Launches Electron pointing to the Vite dev server

**Option 2: Manual Development**

Start the Vite dev server and Electron separately:

```bash
# Terminal 1: Start Vite dev server
cd creative-studio-ui
npm run dev

# Terminal 2: Build and run Electron
npm run electron:build
npm run electron:dev
```

### Development Scripts

- `npm run electron:build` - Compile TypeScript to JavaScript (one-time)
- `npm run electron:build:watch` - Compile TypeScript in watch mode
- `npm run electron:dev` - Run Electron in development mode
- `npm run ui:dev` - Start Vite dev server
- `npm run dev` - Run full development environment

### Development Features

- **Hot Module Replacement**: UI changes are reflected immediately via Vite HMR
- **DevTools**: Automatically opened in development mode (F12 to toggle)
- **Source Maps**: Full TypeScript debugging support
- **Error Handling**: Helpful error messages if Vite server is not running

## Building for Production

### Build the Application

```bash
# Build both UI and Electron
npm run build
```

This command:
1. Builds the React/Vite UI (`creative-studio-ui/dist`)
2. Compiles the Electron TypeScript code (`dist/electron`)

### Package as Executable

```bash
# Package for Windows
npm run package:win

# Package for macOS (requires macOS)
npm run package:mac

# Package for Linux
npm run package:linux

# Package for all platforms
npm run package
```

The packaged executables will be in the `release/` directory.

### Production Build Output

```
release/
├── StoryCore Creative Studio-Setup-1.0.0.exe  # Windows installer
├── win-unpacked/                               # Unpacked Windows app
└── builder-effective-config.yaml               # Build configuration used
```

## Configuration

### Electron Builder Configuration

The `electron-builder.json` file configures how the application is packaged:

```json
{
  "appId": "com.storycore.creative-studio",
  "productName": "StoryCore Creative Studio",
  "directories": {
    "output": "release",
    "buildResources": "build"
  },
  "files": [
    "dist/**/*",
    "creative-studio-ui/dist/**/*",
    "package.json"
  ],
  "win": {
    "target": ["nsis"],
    "icon": "build/icon.ico"
  }
}
```

### TypeScript Configuration

The `electron/tsconfig.json` configures TypeScript compilation:

- **Target**: ES2020
- **Module**: CommonJS (required for Electron)
- **Output**: `dist/electron/`
- **Strict Mode**: Enabled for type safety

## Architecture

### Main Process (electron/main.ts)

The main process is responsible for:
- Creating and managing the application window
- Handling application lifecycle events
- Managing IPC communication with the renderer
- Future: Vite server lifecycle management
- Future: System tray integration

### Preload Script (electron/preload.ts)

The preload script provides a secure bridge:
- Exposes limited APIs via `contextBridge`
- Prevents direct Node.js access from renderer
- Provides type-safe IPC communication
- Prepared for future project management features

### Renderer Process (creative-studio-ui)

The renderer process is the React/Vite UI:
- Runs in a sandboxed environment
- Communicates with main process via `window.electronAPI`
- No direct access to Node.js or Electron APIs

## Security

The application follows Electron security best practices:

1. **Context Isolation**: Enabled - prevents renderer from accessing Node.js
2. **Node Integration**: Disabled - renderer cannot use Node.js APIs
3. **Sandbox**: Enabled - additional security layer
4. **Preload Script**: Uses `contextBridge` to expose only necessary APIs
5. **Content Security Policy**: To be implemented in future tasks

## Troubleshooting

### Electron won't start

**Problem**: Electron fails to launch or shows a blank window

**Solutions**:
1. Ensure Vite dev server is running: `cd creative-studio-ui && npm run dev`
2. Check if port 5173 is available
3. Rebuild Electron: `npm run electron:build`
4. Check console for error messages

### Build fails

**Problem**: `npm run build` or `npm run package` fails

**Solutions**:
1. Clean build artifacts: `rm -rf dist release`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check Node.js version: `node --version` (should be 18+)
4. Ensure all dependencies are installed in both root and `creative-studio-ui`

### TypeScript errors

**Problem**: TypeScript compilation fails

**Solutions**:
1. Check `electron/tsconfig.json` is valid
2. Ensure `@types/node` is installed
3. Run `npm run electron:build` to see detailed errors
4. Check for syntax errors in `electron/main.ts` or `electron/preload.ts`

### Packaged app doesn't work

**Problem**: The .exe runs but doesn't work correctly

**Solutions**:
1. Ensure production build was created: `npm run build`
2. Check that `creative-studio-ui/dist` exists and contains files
3. Verify `electron-builder.json` includes all necessary files
4. Test the production build locally before packaging

## Next Steps

The current setup provides the foundation for the Electron launcher. Future tasks will implement:

1. **Vite Server Management** (Task 2)
   - Automatic server startup
   - Port conflict resolution
   - Server health monitoring

2. **Window Management** (Task 3)
   - System tray integration
   - Splash screen
   - Window state persistence

3. **Project Management** (Tasks 6-7)
   - Project creation and validation
   - File system operations
   - Project structure management

4. **Landing Page UI** (Tasks 12-15)
   - Project management interface
   - Recent projects list
   - Navigation to main studio

5. **Integration** (Tasks 17-20)
   - React Router setup
   - End-to-end testing
   - Production deployment

## Resources

- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [Electron Builder Documentation](https://www.electron.build/)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [Vite Documentation](https://vitejs.dev/)

## Support

For issues or questions:
1. Check this documentation
2. Review the implementation plan in `.kiro/specs/storycore-launcher-executable/`
3. Check the Electron logs in the console
4. Review the task list for known issues
