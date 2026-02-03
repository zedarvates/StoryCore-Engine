# LLM API Key Error Fix

## Problem
The CharacterCreatorWizard was throwing an OpenAI API key error:
```
Error: You didn't provide an API key. You need to provide your API key in an Authorization header using Bearer auth
```

## Root Cause
The application has two different LLM configuration systems:

1. **Old System** (`llmService.ts`): 
   - DEFAULT_CONFIG defaults to OpenAI provider with empty API key
   - Used when `new LLMService()` is called without parameters

2. **New System** (`ConfigManager.ts`):
   - Defaults to local Ollama provider at `http://localhost:11434`
   - Stores configuration in localStorage
   - Properly configured for local LLM usage

The CharacterCreatorWizard and StorytellerWizard were instantiating LLMService without configuration, causing it to default to OpenAI with no API key.

## Solution
Updated the following files to use ConfigManager for proper LLM configuration:

### 1. CharacterCreatorWizard.tsx
**Before:**
```typescript
const llmService = new LLMService();
```

**After:**
```typescript
import { ConfigManager } from '../../../services/llm/ConfigManager';

const llmConfig = ConfigManager.getLLMConfig();
const llmService = new LLMService(llmConfig);
```

### 2. StorytellerWizard.tsx
**Before:**
```typescript
const llmService = new LLMService();
```

**After:**
```typescript
import { ConfigManager } from '../../../services/llm/ConfigManager';

const llmConfig = ConfigManager.getLLMConfig();
const llmService = new LLMService(llmConfig);
```

### 3. llmService.ts - getLLMService()
Updated the default service factory to use ConfigManager when available:

```typescript
export function getLLMService(): LLMService {
  if (!defaultService) {
    try {
      const configModule = require('./llm/ConfigManager');
      if (configModule && configModule.ConfigManager) {
        const config = configModule.ConfigManager.getLLMConfig();
        // Convert and use ConfigManager config
        defaultService = new LLMService(convertedConfig);
      } else {
        defaultService = new LLMService();
      }
    } catch (error) {
      console.warn('Could not load ConfigManager, using default LLM config:', error);
      defaultService = new LLMService();
    }
  }
  return defaultService;
}
```

## Configuration
The default LLM configuration (from ConfigManager) is:
- **Provider**: local (Ollama)
- **Model**: gemma3:4b
- **Endpoint**: http://localhost:11434
- **Streaming**: Enabled

## Testing
To verify the fix:

1. Ensure Ollama is running locally:
   ```bash
   ollama serve
   ```

2. Open the CharacterCreatorWizard in the application

3. Try generating LLM suggestions - should now connect to local Ollama instead of OpenAI

## Alternative: Using OpenAI
If you want to use OpenAI instead of local Ollama:

1. Open LLM Settings in the application
2. Change provider to "openai"
3. Enter your OpenAI API key
4. Select your preferred model (e.g., gpt-4)
5. Save configuration

The ConfigManager will persist this in localStorage and all LLM calls will use OpenAI.

## Files Modified
- `creative-studio-ui/src/components/editor/sequence-planning/CharacterCreatorWizard.tsx`
- `creative-studio-ui/src/components/editor/sequence-planning/StorytellerWizard.tsx`
- `creative-studio-ui/src/services/llmService.ts`

## Impact
- ✅ Fixes OpenAI API key error
- ✅ Uses properly configured LLM service (defaults to local Ollama)
- ✅ Respects user's LLM configuration from settings
- ✅ No breaking changes to existing functionality
- ✅ Backward compatible with existing code
