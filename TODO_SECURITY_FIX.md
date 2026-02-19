# Security Fix: IPC Configuration Bridge

## Task
Fix security vulnerability where `fs.promises` (Node.js API) was being used directly in renderer/browser code.

## Status: ✅ COMPLETED (2026-02-18)

## Implementation Steps

### Step 1: Add IPC channels for configuration (electron/ipcChannels.ts)
- [x] Add CONFIG_SAVE_PROJECT channel
- [x] Add CONFIG_LOAD_PROJECT channel
- [x] Add CONFIG_SAVE_GLOBAL channel
- [x] Add CONFIG_LOAD_GLOBAL channel

### Step 2: Register IPC handlers for configuration
- [x] Register config handlers in registerHandlers()
- [x] Move ConfigurationStore logic to IPC handlers (registerConfigHandlers())

### Step 3: Update preload.ts with config API
- [x] Add config namespace to electronAPI
- [x] Expose saveProjectConfig, loadProjectConfig, saveGlobalConfig, loadGlobalConfig

### Step 4: Update ConfigurationContext.tsx (src/ui/)
- [x] Renderer-side configurationStore uses localStorage (browser-safe, no fs.promises)
- [x] Fixed TypeScript error: validateConfiguration cast `config as ProjectConfiguration` (line 168)

### Step 5: Fix TypeScript errors in configurationStore.ts (creative-studio-ui)
- [x] Fixed `server: unknown` type in encryptSensitiveFields forEach callback
- [x] Fixed `server: unknown` type in decryptSensitiveFields forEach callback
- [x] Fixed `config: unknown` spread in validateAndMergeProjectConfig
- [x] Fixed `config: unknown` spread in validateAndMergeGlobalConfig

### Step 6: Test the fix
- [x] No fs.promises error in browser (renderer uses localStorage)
- [x] TypeScript compilation passes for configurationStore.ts and ConfigurationContext.tsx

## Architecture Summary

```
Renderer (browser)                    Main Process (Node.js)
─────────────────────────────────    ─────────────────────────────────
ConfigurationContext.tsx              electron/ipcChannels.ts
  └─ configurationStore.ts           └─ registerConfigHandlers()
       (localStorage only)                ├─ CONFIG_SAVE_PROJECT
                                          ├─ CONFIG_LOAD_PROJECT
                                          ├─ CONFIG_SAVE_GLOBAL
                                          └─ CONFIG_LOAD_GLOBAL
electron/preload.ts                   electron/configurationStore.ts
  └─ electronAPI.config               └─ (fs.promises - safe in main)
       ├─ saveProject
       ├─ loadProject
       ├─ saveGlobal
       └─ loadGlobal
```

The IPC bridge (window.electronAPI.config) is available for any future use case
where main-process config storage is needed, while the renderer safely uses
localStorage for its own configuration state.
