# Electron Main Process

This directory contains the Electron main process code for the StoryCore Creative Studio launcher.

## Structure

- **main.ts**: Main entry point for the Electron application. Handles window creation, lifecycle management, and application initialization.
- **preload.ts**: Preload script that exposes a secure API to the renderer process via context bridge. Provides IPC communication between main and renderer processes.
- **tsconfig.json**: TypeScript configuration for the Electron main process.

## Development

### Building

```bash
# Build once
npm run electron:build

# Build and watch for changes
npm run electron:build:watch
```

Run these commands from the repository root. `config/package.json` is a legacy
snapshot with paths such as `electron/tsconfig.json` and `src/ui` that are not
relative to `config/`; it is not a second launcher entry point.

### Startup status checks

`SplashWindow.ts` implements the startup status window used by `main.ts`. It
buffers updates until its local document loads, renders messages as text, and
closes when the main window is ready. It exposes no renderer Node bridge.

```bash
npm run test:electron:splash
npm run electron:build
# Requires the installed Electron binary and a graphical display:
./node_modules/.bin/electron scripts/test-electron-splash.cjs
```

The focused CI checks compilation on Node 22.12.0 and 24.19.0 plus an actual
Electron splash-window smoke on Linux/Xvfb. The smoke harness disables the process
sandbox only for CI; it does not validate sandbox enforcement, complete launcher
startup, backend/provider integration, the Creative Studio renderer, packaging,
or macOS/Windows behavior. The launcher's BrowserWindow sandbox settings remain
enabled.

### Running

```bash
# Run in development mode (connects to Vite dev server)
npm run electron:dev

# Run the full development environment (Vite + Electron)
npm run dev
```

## Architecture

### Main Process (main.ts)

The main process is responsible for:
- Creating and managing application windows
- Managing the Vite server lifecycle (to be implemented)
- Handling system tray integration (to be implemented)
- Processing IPC requests from the renderer
- Managing application lifecycle events

### Preload Script (preload.ts)

The preload script provides a secure bridge between the main and renderer processes:
- Exposes a limited API via `contextBridge`
- Prevents direct access to Node.js APIs from the renderer
- Provides type-safe IPC communication

### Security

The application follows Electron security best practices:
- **Context Isolation**: Enabled to prevent renderer from accessing Node.js APIs
- **Node Integration**: Disabled in renderer process
- **Sandbox**: Enabled for additional security
- **Preload Script**: Uses contextBridge to expose only necessary APIs

## Future Implementation

The following features are prepared but not yet implemented:
- Vite server lifecycle management
- Project creation and validation
- Recent projects management
- System tray integration
- Error handling and logging

These will be implemented in subsequent tasks according to the implementation plan.
