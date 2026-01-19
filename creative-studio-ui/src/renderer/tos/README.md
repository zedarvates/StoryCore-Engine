# TOS Dialog Implementation

This directory contains the Terms of Service dialog implementation for StoryCore-Engine.

## File Structure

```
creative-studio-ui/src/renderer/tos/
├── tos.html              # HTML entry point for the TOS dialog window
├── tos-renderer.tsx      # React application initialization
├── tos-preload.ts        # Preload script for secure IPC bridge
├── tos-types.d.ts        # TypeScript type declarations
├── TOSDialog.tsx         # Main React component (placeholder)
├── TOSDialog.css         # Component styles (placeholder)
└── README.md             # This file

electron/
└── tosDialogManager.ts   # Main process TOS dialog manager
```

## Architecture

### Main Process (electron/tosDialogManager.ts)
- Creates and manages the TOS dialog BrowserWindow
- Handles IPC communication from renderer
- Manages application lifecycle (acceptance/exit flows)
- Implements error handling and crash detection

### Renderer Process (creative-studio-ui/src/renderer/tos/)
- **tos.html**: Entry point that loads the React application
- **tos-renderer.tsx**: Initializes React and renders TOSDialog component
- **TOSDialog.tsx**: React component for the dialog UI (to be fully implemented in Task 4)
- **TOSDialog.css**: Styles for the dialog (to be fully implemented in Task 8)
- **tos-preload.ts**: Secure IPC bridge using contextBridge
- **tos-types.d.ts**: TypeScript declarations for window.tosAPI

## TypeScript Interfaces

### TOSDialogConfig
Configuration for the TOS dialog window appearance and content.

```typescript
interface TOSDialogConfig {
  message: string;           // Legal text to display
  windowTitle: string;       // Window title bar text
  acceptButtonText: string;  // "OK"
  exitButtonText: string;    // "Exit"
  width: number;            // 600
  height: number;           // 400
}
```

### TOSWindowState
Internal state tracking for the TOS dialog window.

```typescript
interface TOSWindowState {
  window: BrowserWindow | null;
  isVisible: boolean;
  isAccepted: boolean;
  isExited: boolean;
}
```

### TOSDialogManager
Interface for the main process TOS dialog manager.

```typescript
interface TOSDialogManager {
  createTOSWindow(): Promise<BrowserWindow>;
  handleAcceptance(): void;
  handleExit(): void;
  setupIPCHandlers(): void;
}
```

### TOSElectronAPI
API exposed to renderer process via contextBridge.

```typescript
interface TOSElectronAPI {
  sendAcceptance: () => void;
  sendExit: () => void;
}
```

## IPC Communication

### Renderer → Main
- `tos:accept`: User clicked OK or pressed Enter
- `tos:exit`: User clicked Exit, pressed ESC, or closed window

### Main → Renderer
- Currently none needed (may be added in future enhancements)

## Implementation Status

### ✅ Completed (Task 1)
- File structure created
- TypeScript interfaces defined
- Main process manager with core functions
- Preload script with IPC bridge
- Basic React component structure
- Type declarations

### 🔄 Pending
- Task 2: Full main process implementation
- Task 4: Complete React component with UI
- Task 5: IPC integration testing
- Task 7: Accessibility features
- Task 8: Design system styling

## Requirements Mapping

This implementation addresses the following requirements:
- **Requirement 8.1**: Electron lifecycle integration
- **Requirement 8.2**: IPC communication setup
- **Requirement 1.1**: Display at launch
- **Requirement 5.2**: Modal behavior
- **Requirement 3.2**: Acceptance mechanism
- **Requirement 4.2**: Exit mechanism

## Security Considerations

- **Context Isolation**: Enabled in BrowserWindow webPreferences
- **Sandbox Mode**: Renderer process runs in sandbox
- **No Node Integration**: nodeIntegration disabled
- **Secure IPC**: Uses contextBridge for controlled API exposure
- **CSP**: Content Security Policy set in HTML

## Next Steps

1. Implement full main process logic (Task 2)
2. Complete React component with proper UI (Task 4)
3. Add IPC communication handlers (Task 5)
4. Implement keyboard navigation (Task 7)
5. Apply design system styles (Task 8)
6. Add comprehensive tests (Tasks 2.2, 2.5, 4.2, 4.4, 5.4, 7.4, 7.5, 8.4, 8.5)
