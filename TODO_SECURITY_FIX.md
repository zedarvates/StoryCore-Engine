# Security Fix: IPC Configuration Bridge

## Task
Fix security vulnerability where `fs.promises` (Node.js API) was being used directly in renderer/browswer code.

## Implementation Steps

### Step 1: Add IPC channels for configuration (electron/ipcChannels.ts)
- [ ] Add CONFIG_SAVE_PROJECT channel
- [ ] Add CONFIG_LOAD_PROJECT channel
- [ ] Add CONFIG_SAVE_GLOBAL channel
- [ ] Add CONFIG_LOAD_GLOBAL channel

### Step 2: Register IPC handlers for configuration
- [ ] Register config handlers in registerHandlers()
- [ ] Move ConfigurationStore logic to IPC handlers

### Step 3: Update preload.ts with config API
- [ ] Add config namespace to electronAPI
- [ ] Expose saveProjectConfig, loadProjectConfig, saveGlobalConfig, loadGlobalConfig

### Step 4: Update ConfigurationContext.tsx (src/ui/)
- [ ] Remove direct import of ConfigurationStore from electron
- [ ] Use window.electronAPI.config instead

### Step 5: Test the fix
- [ ] Verify no fs.promises error in browser

