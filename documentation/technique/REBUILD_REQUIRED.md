# Rebuild Required - Connection Error Fix

## Issue
The connection error `GET http://localhost:8188/system_stats net::ERR_CONNECTION_REFUSED` is still showing because the browser is using the old cached JavaScript bundle.

## Solution Applied
The code has been fixed in `WizardService.ts` to use the active ComfyUI server from your multi-server configuration instead of the hardcoded `localhost:8188`.

## Required Action: Rebuild the Application

You need to rebuild the React application for the changes to take effect:

### Option 1: Development Mode (Recommended for Testing)
```bash
cd creative-studio-ui
npm run dev
```
This will start the development server with hot-reload enabled. Any further changes will be reflected immediately.

### Option 2: Production Build
```bash
cd creative-studio-ui
npm run build
```
Then restart your application to use the new build.

### Option 3: Clear Cache and Rebuild
If the error persists after rebuilding:

1. **Clear browser cache**:
   - Chrome/Edge: Press `Ctrl+Shift+Delete`, select "Cached images and files", click "Clear data"
   - Or do a hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

2. **Clear Vite cache** (if using dev mode):
   ```bash
   cd creative-studio-ui
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Clear dist folder** (if using production build):
   ```bash
   cd creative-studio-ui
   rm -rf dist
   npm run build
   ```

## Verification Steps

After rebuilding, verify the fix:

1. **Open browser DevTools** (F12)
2. **Go to Console tab**
3. **Look for connection attempts** - they should now use your configured ComfyUI server URL instead of `localhost:8188`

### Expected Behavior

**Before fix:**
```
WizardService.ts:167 GET http://localhost:8188/system_stats net::ERR_CONNECTION_REFUSED
```

**After fix (with no servers configured):**
```
WizardService.ts:167 GET http://localhost:8188/system_stats net::ERR_CONNECTION_REFUSED
(Falls back to default - this is expected)
```

**After fix (with custom server configured at localhost:8189):**
```
WizardService.ts:167 GET http://localhost:8189/system_stats net::ERR_CONNECTION_REFUSED
(Uses your configured server URL)
```

## What Was Fixed

The `WizardService.ts` file now:
1. Imports `getComfyUIServersService` to access multi-server configuration
2. Has a new `getActiveComfyUIEndpoint()` method that retrieves the active server URL
3. Uses the active endpoint in `checkComfyUIConnection()` instead of the hardcoded default

## Related Files
- `creative-studio-ui/src/services/wizard/WizardService.ts` - Main fix
- `creative-studio-ui/src/services/comfyuiServersService.ts` - Multi-server management
- `CONNECTION_ERROR_FIXED.md` - Detailed explanation of the fix

## Note on the Error Message

If you see the error even after the fix, it might be **expected behavior** if:
- You haven't configured any ComfyUI servers yet (falls back to default localhost:8188)
- Your configured ComfyUI server is not running
- The configured server URL is incorrect

To configure a ComfyUI server:
1. Go to **Settings** → **ComfyUI Servers**
2. Click **Add Server**
3. Enter your server details (URL, port, etc.)
4. Click **Save** and set it as active
