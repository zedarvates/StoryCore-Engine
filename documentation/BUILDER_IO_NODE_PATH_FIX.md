# Builder.io Extension - Node.js Path Configuration Guide

## Problem
The Builder.io VSCode extension fails with error:
```
[error] npx not found. Configure the custom Node.js path in the extension settings.
```

## Solution

### Option 1: Run the Auto-Detect Script (Recommended)

**PowerShell (Windows 11 - Recommended):**
```powershell
.\find-node-path.ps1
```

**Command Prompt:**
```cmd
find-node-path.bat
```

This will automatically find your Node.js installation and optionally update the settings.

### Option 2: Manual Configuration

1. **Find your Node.js path:**
   ```powershell
   # PowerShell
   (Get-Command node.exe).Source
   ```
   
   ```cmd
   :: Command Prompt
   where node.exe
   ```

2. **Update VSCode settings:**
   Open `.vscode/settings.json` and update:
   ```json
   "builder.nodePath": "C:/Program Files/nodejs/node.exe"
   ```

### Option 3: Verify Node.js Installation

Check if Node.js is installed:
```bash
node --version
npm --version
```

If not installed, download from: https://nodejs.org/

## Files Created

- `.vscode/settings.json` - Updated with correct Node.js path configuration
- `find-node-path.bat` - Windows Batch script to find Node.js
- `find-node-path.ps1` - PowerShell script to find Node.js (recommended)

## Common Node.js Paths

| Platform | Path |
|----------|------|
| Windows (Program Files) | `C:\Program Files\nodejs\node.exe` |
| Windows (AppData) | `C:\Users\<USER>\AppData\Local\Programs\nodejs\node.exe` |
| Windows (x86) | `C:\Program Files (x86)\nodejs\node.exe` |
| macOS | `/usr/local/bin/node` |
| Linux | `/usr/bin/node` |

## After Configuration

1. Reload VSCode window (`Ctrl+Shift+P` → "Reload Window")
2. Try running the Builder.io command again

## Troubleshooting

If the issue persists:
1. Ensure Node.js is in your system PATH
2. Restart VSCode completely
3. Check Builder.io extension settings in VSCode preferences
4. Try setting `builder.nodePaths` array with multiple fallback paths

## Running the Dev Server Manually

If you still have issues, you can run the dev server directly:

```bash
cd creative-studio-ui
npm install
npm run dev
```

Then use the Builder.io extension with `--serverUrl http://localhost:5173/` flag.

