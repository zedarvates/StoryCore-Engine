# Quick Start Guide - Electron Launcher

This guide will help you get started with the StoryCore Creative Studio Electron launcher in under 5 minutes.

## Prerequisites

- Node.js 18+ installed
- npm installed
- Windows 10/11 (for Windows builds)

## Installation

```bash
# 1. Install root dependencies
npm install

# 2. Install UI dependencies
cd creative-studio-ui
npm install
cd ..
```

## Development

### Start the Full Development Environment

```bash
npm run dev
```

This single command will:
1. Compile the Electron TypeScript code
2. Start the Vite dev server for the UI
3. Launch Electron when everything is ready

The application window will open automatically when ready.

### Development Features

- **Hot Reload**: UI changes are reflected immediately
- **DevTools**: Press F12 to open Chrome DevTools
- **Auto-Restart**: Electron restarts when main process code changes

## Building

### Build for Development Testing

```bash
npm run build
```

This creates production-ready files in:
- `dist/electron/` - Compiled Electron code
- `creative-studio-ui/dist/` - Built UI

### Package as Windows Executable

```bash
npm run package:win
```

This creates a Windows installer in the `release/` directory:
- `StoryCore Creative Studio-Setup-1.0.0.exe` - Installer
- `win-unpacked/` - Unpacked application files

## Validation

To verify your setup is correct:

```bash
node scripts/validate-electron-setup.js
```

This checks:
- All required files exist
- Dependencies are installed
- TypeScript compiles successfully
- Scripts are configured correctly

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start full development environment |
| `npm run electron:build` | Compile Electron TypeScript |
| `npm run electron:dev` | Run Electron (requires Vite running) |
| `npm run ui:dev` | Start Vite dev server only |
| `npm run build` | Build for production |
| `npm run package:win` | Create Windows .exe installer |

## Project Structure

```
storycore-engine/
├── electron/              # Electron main process
│   ├── main.ts           # Application entry point
│   └── preload.ts        # IPC bridge
├── creative-studio-ui/   # React/Vite UI
│   └── src/              # UI source code
├── dist/                 # Build output
└── release/              # Packaged executables
```

## Troubleshooting

### Electron won't start

Make sure the Vite dev server is running:
```bash
cd creative-studio-ui
npm run dev
```

Then in another terminal:
```bash
npm run electron:dev
```

### Build errors

Clean and rebuild:
```bash
rm -rf dist release
npm run build
```

### TypeScript errors

Rebuild Electron code:
```bash
npm run electron:build
```

## Next Steps

1. **Explore the Code**: Check `electron/main.ts` and `electron/preload.ts`
2. **Read the Docs**: See `ELECTRON_SETUP.md` for detailed documentation
3. **Review the Plan**: Check `.kiro/specs/storycore-launcher-executable/` for the implementation plan
4. **Start Developing**: Begin implementing the next tasks in the plan

## Getting Help

- **Documentation**: `ELECTRON_SETUP.md`
- **Implementation Plan**: `.kiro/specs/storycore-launcher-executable/tasks.md`
- **Validation Script**: `node scripts/validate-electron-setup.js`

## What's Next?

The current setup (Task 1) provides the foundation. Future tasks will add:

- ✅ **Task 1**: Electron project structure (COMPLETE)
- ⏳ **Task 2**: Vite server lifecycle management
- ⏳ **Task 3**: Window and system tray management
- ⏳ **Task 4**: Error handling and logging
- ⏳ **Task 6-9**: Project management system
- ⏳ **Task 11-15**: Landing page UI
- ⏳ **Task 17-20**: Integration and testing

Happy coding! 🚀
