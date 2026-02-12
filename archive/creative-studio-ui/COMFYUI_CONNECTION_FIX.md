# ComfyUI Connection Error Fix

## Problem Analysis

The error `TypeError: Failed to fetch` at `comfyuiService.ts:248` occurs when trying to generate character portraits because:

1. **ComfyUI Server Not Running**: The service tries to connect to `http://localhost:8000` but no server is listening
2. **CORS Issues**: Browser security blocks cross-origin requests even if server is running
3. **No Fallback Mechanism**: The service returns a placeholder SVG but doesn't provide user feedback
4. **Missing Configuration Check**: No validation that ComfyUI is configured before attempting generation

## Root Cause

In `comfyuiService.ts` line 244:
```typescript
const endpoint = 'http://localhost:8000'; // Hardcoded, no config check
```

The service hardcodes the endpoint without:
- Checking if ComfyUI is configured in settings
- Verifying the server is reachable
- Providing user-friendly error messages

## Solution

### 1. Add Configuration Check Before Generation

**File**: `creative-studio-ui/src/services/comfyuiService.ts`

Add a method to check if ComfyUI is properly configured:

```typescript
/**
 * Check if ComfyUI is configured and available
 */
public async isAvailable(): Promise<{ available: boolean; message: string }> {
  // Check if we have a valid endpoint
  const endpoint = this.getConfiguredEndpoint();
  
  if (!endpoint) {
    return {
      available: false,
      message: 'ComfyUI is not configured. Please configure it in Settings > ComfyUI.'
    };
  }
  
  // Quick health check
  try {
    const response = await fetch(`${endpoint}/system_stats`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    
    if (response.ok) {
      return { available: true, message: 'ComfyUI is ready' };
    } else {
      return {
        available: false,
        message: `ComfyUI server responded with error: ${response.status}`
      };
    }
  } catch (error) {
    return {
      available: false,
      message: 'ComfyUI server is not reachable. Please start ComfyUI and check the URL in settings.'
    };
  }
}

/**
 * Get configured endpoint from settings or return null
 */
private getConfiguredEndpoint(): string | null {
  // Try to get from localStorage settings
  try {
    const settings = localStorage.getItem('storycore-settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.comfyui?.config?.serverUrl) {
        return parsed.comfyui.config.serverUrl;
      }
    }
  } catch (error) {
    console.warn('Failed to read ComfyUI settings:', error);
  }
  
  // Return null if not configured
  return null;
}
```

### 2. Update generateImage to Check Availability

**File**: `creative-studio-ui/src/services/comfyuiService.ts`

Replace the hardcoded endpoint with configuration check:

```typescript
public async generateImage(params: {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed?: number;
  model: string;
  sampler: string;
  scheduler: string;
}): Promise<string> {
  console.log('🚀 [ComfyUIService] Starting image generation');
  console.log('📋 Parameters:', params);
  
  try {
    // Check if ComfyUI is available
    const availability = await this.isAvailable();
    
    if (!availability.available) {
      console.warn('⚠️ [ComfyUIService]', availability.message);
      throw new Error(availability.message);
    }
    
    // Get configured endpoint
    const endpoint = this.getConfiguredEndpoint();
    if (!endpoint) {
      throw new Error('ComfyUI endpoint not configured');
    }
    
    console.log('🌐 [ComfyUIService] Using endpoint:', endpoint);
    
    // Build ComfyUI workflow
    const workflow = this.buildSimpleWorkflow(params);
    console.log('🔧 [ComfyUIService] Workflow built');
    
    // Queue the prompt
    console.log('📤 [ComfyUIService] Sending request to ComfyUI...');
    const response = await fetch(`${endpoint}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: workflow,
        client_id: `character_gen_${Date.now()}`,
      }),
    });

    console.log('📥 [ComfyUIService] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ComfyUIService] Request failed:', errorText);
      throw new Error(`ComfyUI request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 [ComfyUIService] Response data:', data);
    
    const promptId = data.prompt_id;
    console.log('🆔 [ComfyUIService] Prompt ID:', promptId);

    // Wait for the image to be generated
    console.log('⏳ [ComfyUIService] Waiting for image generation...');
    const imageUrl = await this.waitForImage(endpoint, promptId);
    
    console.log('✅ [ComfyUIService] Image URL:', imageUrl);
    return imageUrl;
  } catch (error) {
    console.error('❌ [ComfyUIService] Failed to generate image:', error);
    throw error; // Re-throw to let caller handle it
  }
}
```

### 3. Update CharacterCard to Handle Errors Gracefully

**File**: `creative-studio-ui/src/components/character/CharacterCard.tsx`

Add proper error handling with user feedback:

```typescript
const handleGenerateImage = async (e: React.MouseEvent) => {
  e.stopPropagation();
  setIsGeneratingImage(true);

  try {
    const prompt = buildCharacterPrompt();
    const negativePrompt = buildNegativePrompt();

    console.log('🎨 [CharacterCard] Starting image generation');
    console.log('📝 Prompt:', prompt);
    console.log('🚫 Negative:', negativePrompt);
    console.log('🎭 Visual Style:', visualStyle);

    const imageUrl = await comfyuiService.generateImage({
      prompt,
      negativePrompt,
      width: 256,
      height: 256,
      steps: 4,
      cfgScale: 1.0,
      seed: Math.floor(Math.random() * 1000000),
      model: 'z image turbo',
      sampler: 'euler',
      scheduler: 'simple',
    });

    console.log('✅ [CharacterCard] Image generated:', imageUrl);
    setGeneratedImageUrl(imageUrl);
    
    if (onImageGenerated) {
      onImageGenerated(imageUrl);
    }
  } catch (error) {
    console.error('❌ [CharacterCard] Image generation failed:', error);
    
    // Show user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // You can use a toast notification here
    alert(`Failed to generate portrait: ${errorMessage}\n\nPlease check:\n1. ComfyUI is running\n2. Settings > ComfyUI is configured\n3. Server URL is correct`);
    
    // Set a placeholder image
    setGeneratedImageUrl(
      `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="%23f0f0f0" width="256" height="256"/><text x="50%" y="45%" text-anchor="middle" fill="%23999" font-size="14">Generation failed</text><text x="50%" y="55%" text-anchor="middle" fill="%23666" font-size="10">Check ComfyUI settings</text></svg>`
    );
  } finally {
    setIsGeneratingImage(false);
  }
};
```

### 4. Add ComfyUI Status Indicator

**File**: `creative-studio-ui/src/components/character/CharacterImageGenerator.tsx`

Add a status check before allowing generation:

```typescript
import { comfyuiService } from '@/services/comfyuiService';
import { useEffect, useState } from 'react';

export function CharacterImageGenerator() {
  const [comfyuiStatus, setComfyuiStatus] = useState<{
    available: boolean;
    message: string;
  } | null>(null);
  
  useEffect(() => {
    // Check ComfyUI status on mount
    const checkStatus = async () => {
      const status = await comfyuiService.isAvailable();
      setComfyuiStatus(status);
    };
    
    checkStatus();
  }, []);
  
  return (
    <div>
      {/* Status indicator */}
      {comfyuiStatus && !comfyuiStatus.available && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                ComfyUI Not Available
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {comfyuiStatus.message}
              </p>
              <button
                onClick={() => {/* Open settings */}}
                className="text-xs text-yellow-800 underline mt-2"
              >
                Configure ComfyUI
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Rest of component */}
    </div>
  );
}
```

## Quick Fix for Testing

If you want to test without ComfyUI, add a mock mode:

**File**: `creative-studio-ui/src/services/comfyuiService.ts`

```typescript
// At the top of the file
const MOCK_MODE = import.meta.env.VITE_COMFYUI_MOCK === 'true';

public async generateImage(params: any): Promise<string> {
  // Mock mode for testing
  if (MOCK_MODE) {
    console.log('🎭 [ComfyUIService] Running in MOCK mode');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${params.seed}`;
  }
  
  // Real implementation...
}
```

Then in `.env`:
```
VITE_COMFYUI_MOCK=true
```

## User Instructions

### To Fix the Error:

1. **Install and Start ComfyUI Desktop**:
   - Download ComfyUI Desktop from https://www.comfy.org/
   - Or use ComfyUI standalone: https://github.com/comfyanonymous/ComfyUI
   - ComfyUI Desktop runs on port 8000 by default
   - ComfyUI standalone runs on port 8188 by default

2. **Configure in StoryCore**:
   - Open Settings > ComfyUI
   - Set Server URL: `http://localhost:8000` (ComfyUI Desktop)
   - Or: `http://localhost:8188` (ComfyUI standalone)
   - Click "Test Connection"
   - Save settings

3. **Enable CORS** (if using standalone):
   Start ComfyUI with CORS enabled:
   ```bash
   python main.py --enable-cors-header --port 8188
   ```
   
   ComfyUI Desktop has CORS enabled by default.

### Alternative: Use Mock Mode

For development without ComfyUI:
1. Create `.env` file in `creative-studio-ui/`
2. Add: `VITE_COMFYUI_MOCK=true`
3. Restart dev server

## Testing Checklist

- [ ] ComfyUI service checks configuration before generation
- [ ] User sees clear error message when ComfyUI is not configured
- [ ] Status indicator shows ComfyUI availability
- [ ] Error handling doesn't crash the UI
- [ ] Mock mode works for testing without ComfyUI
- [ ] Settings panel allows ComfyUI configuration
- [ ] Connection test validates server availability

## Implementation Priority

1. **High**: Add configuration check and error handling (prevents crashes)
2. **Medium**: Add status indicator (improves UX)
3. **Low**: Add mock mode (nice for development)

---

**Status**: Ready for implementation
**Estimated Time**: 30 minutes
**Files to Modify**: 3 (comfyuiService.ts, CharacterCard.tsx, CharacterImageGenerator.tsx)
