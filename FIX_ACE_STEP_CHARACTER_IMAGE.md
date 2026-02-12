# Fix for Edit Character Image - ACE-Step Path Error

## Problem
The "Generate Reference" and "Generate Sheet" functions in the Character Editor were failing because they were trying to connect to a ComfyUI instance that had the ACE-Step custom node installed, but the required model paths were missing:

```
FileNotFoundError: [WinError 3] The system cannot find the path specified: 
'C:\Users\redga\Documents\ComfyUI\models\TTS\ACE-Step-v1-3.5B'
```

## Root Cause
The code was using the old `ComfyUIService.getInstance().getBaseUrl()` to determine which ComfyUI server to connect to. This service was pointing to a ComfyUI Desktop installation (`localhost:8188`) that has ACE-Step custom nodes installed with missing model paths.

## Solution
Updated `CharacterImagesSection.tsx` to use the new `comfyuiServersService` which manages multiple ComfyUI server configurations:

1. **Changed default server URL**: From `http://localhost:8188` to `http://localhost:8000` (ComfyUI Desktop default)
2. **Use user-configured server**: Now retrieves the active server from `comfyuiServersService.getActiveServer().serverUrl`
3. **Updated both functions**:
   - `handleGenerateReference()`
   - `handleGenerateSheet()`

## Changes Made

### Before (Old Code):
```typescript
let serverUrl = 'http://localhost:8188';
try {
  const comfyuiService = (await import('@/services/comfyuiService')).ComfyUIService.getInstance();
  const configuredEndpoint = comfyuiService.getBaseUrl();
  if (configuredEndpoint) serverUrl = configuredEndpoint;
} catch (e) { console.warn('Using default ComfyUI URL'); }
```

### After (Fixed Code):
```typescript
// Get server from comfyuiServersService (user's configured server)
let serverUrl = 'http://localhost:8000'; // Default from user config
try {
  const serversService = (await import('@/services/comfyuiServersService')).getComfyUIServersService();
  const activeServer = serversService.getActiveServer();
  if (activeServer && activeServer.serverUrl) {
    serverUrl = activeServer.serverUrl;
    console.log('Using configured server:', serverUrl);
  }
} catch (e) { console.warn('Using default ComfyUI URL:', e); }
```

## Files Modified
- `creative-studio-ui/src/components/character/editor/CharacterImagesSection.tsx`

## Testing
1. Open the Creative Studio UI
2. Navigate to Character Editor
3. Try generating a reference image
4. Verify it connects to the correct ComfyUI server

