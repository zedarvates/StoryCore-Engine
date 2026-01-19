# Settings Propagation System

## Overview

The Settings Propagation System ensures that configuration changes to LLM and ComfyUI settings are immediately reflected across all dependent features and services in the Creative Studio UI. It provides a centralized mechanism for propagating settings updates and notifying interested components.

**Requirements:** 7.3, 7.4, 7.8

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Settings Propagation Manager                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────┐          │
│  │  Event Emitter   │────────▶│  Propagation     │          │
│  │  (Settings       │         │  Manager         │          │
│  │   Updates)       │         │                  │          │
│  └──────────────────┘         └────────┬─────────┘          │
│                                         │                     │
│                    ┌────────────────────┼────────────────┐   │
│                    │                    │                │   │
│             ┌──────▼──────┐      ┌─────▼─────┐  ┌──────▼───┐│
│             │  LLM Service│      │ Backend   │  │Listeners │││
│             │  Update     │      │ API Update│  │(Features)│││
│             └─────────────┘      └───────────┘  └──────────┘││
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Settings Update Flow

1. **User updates settings** in LLM or ComfyUI settings panel
2. **Settings panel emits event** via event emitter
3. **Propagation manager receives event** and loads full config from storage
4. **Services are updated** with new configuration
5. **Registered listeners are notified** of the change
6. **Dependent features refresh** their state/UI

### 2. Automatic Service Updates

#### LLM Service Updates (Requirement: 7.3)
When LLM settings change:
- LLM service configuration is updated
- Active generation tasks use new settings
- Wizards use updated prompts and parameters
- All LLM-dependent features receive new config

#### Backend API Updates (Requirement: 7.4)
When ComfyUI settings change:
- Backend API service is updated with new ComfyUI config
- Active generation tasks use new workflows
- Model preferences are applied to new jobs
- Connection status is refreshed

### 3. Listener Notifications (Requirement: 7.8)
Registered listeners are notified when settings change:
- Components can refresh their UI
- Services can reload data
- Features can update their state
- Validation can be re-run

## Usage

### Initialization

Initialize the settings propagation system during application startup:

```typescript
import { initializeSettingsPropagation } from '@/services/settingsPropagation';

// In your main App component or initialization code
initializeSettingsPropagation();
```

### Emitting Settings Updates

When settings are saved, emit an event to trigger propagation:

```typescript
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';
import type { LLMSettingsUpdatedPayload } from '@/services/eventEmitter';

// After saving LLM settings
eventEmitter.emit<LLMSettingsUpdatedPayload>(
  WizardEventType.LLM_SETTINGS_UPDATED,
  {
    provider: 'openai',
    model: 'gpt-4',
    previousProvider: 'anthropic',
    previousModel: 'claude-3-opus',
    timestamp: new Date(),
    source: 'LLMSettingsPanel',
  }
);
```

```typescript
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';
import type { ComfyUISettingsUpdatedPayload } from '@/services/eventEmitter';

// After saving ComfyUI settings
eventEmitter.emit<ComfyUISettingsUpdatedPayload>(
  WizardEventType.COMFYUI_SETTINGS_UPDATED,
  {
    serverUrl: 'http://localhost:8188',
    connected: true,
    previousServerUrl: 'http://localhost:8189',
    timestamp: new Date(),
    source: 'ComfyUISettingsPanel',
  }
);
```

### Subscribing to Settings Changes

#### In React Components

```typescript
import { useLLMSettingsChange, useComfyUISettingsChange } from '@/services/settingsPropagation';

function MyComponent() {
  // Subscribe to LLM settings changes
  useLLMSettingsChange((config) => {
    console.log('LLM settings changed:', config);
    // Refresh data, update UI, etc.
  });

  // Subscribe to ComfyUI settings changes
  useComfyUISettingsChange((config) => {
    console.log('ComfyUI settings changed:', config);
    // Refresh workflows, update status, etc.
  });

  return <div>My Component</div>;
}
```

#### In Services or Hooks

```typescript
import { onLLMSettingsChange, onComfyUISettingsChange } from '@/services/settingsPropagation';

// Subscribe to LLM settings changes
const unsubscribeLLM = onLLMSettingsChange((config) => {
  console.log('LLM settings changed:', config);
  // Update service state, refresh data, etc.
});

// Subscribe to ComfyUI settings changes
const unsubscribeComfyUI = onComfyUISettingsChange((config) => {
  console.log('ComfyUI settings changed:', config);
  // Update service state, refresh workflows, etc.
});

// Unsubscribe when done
unsubscribeLLM();
unsubscribeComfyUI();
```

### Manual Propagation

Sometimes you need to manually trigger settings propagation (e.g., after loading settings from a file):

```typescript
import { triggerLLMPropagation, triggerComfyUIPropagation } from '@/services/settingsPropagation';

// Manually trigger LLM settings propagation
await triggerLLMPropagation();

// Manually trigger ComfyUI settings propagation
await triggerComfyUIPropagation();
```

## Integration Points

### 1. LLM Settings Panel
The LLM settings panel should emit an event after successfully saving settings:

```typescript
const handleSave = async (config: LLMConfig) => {
  // Save to localStorage
  localStorage.setItem('llm-config', JSON.stringify(config));

  // Emit event to trigger propagation
  eventEmitter.emit(WizardEventType.LLM_SETTINGS_UPDATED, {
    provider: config.provider,
    model: config.model,
    timestamp: new Date(),
    source: 'LLMSettingsPanel',
  });
};
```

### 2. ComfyUI Settings Panel
The ComfyUI settings panel should emit an event after successfully saving settings:

```typescript
const handleSave = async (config: ComfyUIConfig) => {
  // Save to localStorage
  localStorage.setItem('comfyui-config', JSON.stringify(config));

  // Emit event to trigger propagation
  eventEmitter.emit(WizardEventType.COMFYUI_SETTINGS_UPDATED, {
    serverUrl: config.serverUrl,
    connected: config.connectionStatus === 'connected',
    timestamp: new Date(),
    source: 'ComfyUISettingsPanel',
  });
};
```

### 3. Generation Tasks
Generation tasks automatically use updated settings:

```typescript
import { getLLMService } from '@/services/llmService';
import { backendApi } from '@/services/backendApiService';

// LLM service is automatically updated with latest config
const llmService = getLLMService();
const response = await llmService.generateCompletion({
  prompt: 'Generate a character description...',
});

// Backend API is automatically updated with latest ComfyUI config
const result = await backendApi.executeTaskWithComfyUI(task, project);
```

### 4. Wizards
Wizards automatically use updated LLM settings for generation:

```typescript
function WorldWizard() {
  // LLM service is automatically updated
  const handleGenerateSuggestions = async () => {
    const llmService = getLLMService();
    const response = await llmService.generateCompletion({
      prompt: 'Generate world suggestions...',
      systemPrompt: llmService.getConfig().systemPrompts.worldGeneration,
    });
  };

  return <div>...</div>;
}
```

## Configuration Storage

### LLM Configuration
Stored in localStorage as `llm-config`:

```json
{
  "provider": "openai",
  "model": "gpt-4",
  "encryptedApiKey": "...",
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 2000,
    "topP": 1.0,
    "frequencyPenalty": 0,
    "presencePenalty": 0
  },
  "systemPrompts": {
    "worldGeneration": "...",
    "characterGeneration": "...",
    "dialogueGeneration": "..."
  },
  "timeout": 30000,
  "retryAttempts": 3,
  "streamingEnabled": true
}
```

### ComfyUI Configuration
Stored in localStorage as `comfyui-config`:

```json
{
  "serverUrl": "http://localhost:8188",
  "encryptedCredentials": "...",
  "workflows": {
    "imageGeneration": "workflow-id-1",
    "videoGeneration": "workflow-id-2",
    "upscaling": "workflow-id-3",
    "inpainting": "workflow-id-4"
  },
  "models": {
    "preferredCheckpoint": "sd15-base",
    "preferredVAE": "vae-ft-mse",
    "preferredLora": ["lora-detail"]
  },
  "performance": {
    "batchSize": 1,
    "timeout": 300000,
    "maxConcurrentJobs": 1
  },
  "connectionStatus": "connected"
}
```

## Best Practices

### 1. Always Emit Events After Saving
```typescript
// ✅ Good: Emit event after saving
const handleSave = async (config) => {
  await saveConfig(config);
  eventEmitter.emit(WizardEventType.LLM_SETTINGS_UPDATED, payload);
};

// ❌ Bad: Don't emit event
const handleSave = async (config) => {
  await saveConfig(config);
  // Settings won't propagate!
};
```

### 2. Use Hooks in React Components
```typescript
// ✅ Good: Use hook for automatic cleanup
function MyComponent() {
  useLLMSettingsChange((config) => {
    // Handle change
  });
}

// ❌ Bad: Manual subscription without cleanup
function MyComponent() {
  onLLMSettingsChange((config) => {
    // Handle change
  });
  // Listener never cleaned up!
}
```

### 3. Handle Errors in Listeners
```typescript
// ✅ Good: Handle errors gracefully
onLLMSettingsChange(async (config) => {
  try {
    await updateMyFeature(config);
  } catch (error) {
    console.error('Failed to update feature:', error);
  }
});

// ❌ Bad: Unhandled errors
onLLMSettingsChange(async (config) => {
  await updateMyFeature(config); // May throw!
});
```

### 4. Unsubscribe When Done
```typescript
// ✅ Good: Unsubscribe when component unmounts
useEffect(() => {
  const unsubscribe = onLLMSettingsChange(handleChange);
  return () => unsubscribe();
}, []);

// ❌ Bad: Never unsubscribe
useEffect(() => {
  onLLMSettingsChange(handleChange);
  // Memory leak!
}, []);
```

## Testing

### Testing Settings Propagation
```typescript
import { settingsPropagation } from '@/services/settingsPropagation';
import { eventEmitter, WizardEventType } from '@/services/eventEmitter';

test('propagates LLM settings to service', async () => {
  // Initialize propagation
  settingsPropagation.initialize();

  // Save config to localStorage
  const config = { provider: 'openai', model: 'gpt-4' };
  localStorage.setItem('llm-config', JSON.stringify(config));

  // Emit event
  eventEmitter.emit(WizardEventType.LLM_SETTINGS_UPDATED, {
    provider: 'openai',
    model: 'gpt-4',
    timestamp: new Date(),
    source: 'test',
  });

  // Wait for propagation
  await new Promise(resolve => setTimeout(resolve, 100));

  // Verify service was updated
  const llmService = getLLMService();
  expect(llmService.getConfig().provider).toBe('openai');
});
```

### Testing Listener Notifications
```typescript
test('notifies listeners of settings changes', async () => {
  const listener = vi.fn();
  const unsubscribe = onLLMSettingsChange(listener);

  // Trigger propagation
  await triggerLLMPropagation();

  // Verify listener was called
  expect(listener).toHaveBeenCalled();

  unsubscribe();
});
```

## Performance Considerations

1. **Lazy Loading**: Configuration is loaded from storage only when needed
2. **Async Notifications**: Listeners are notified asynchronously to avoid blocking
3. **Error Isolation**: Errors in one listener don't affect others
4. **Efficient Storage**: Only changed settings are saved to localStorage

## Troubleshooting

### Settings Not Propagating
1. Check that propagation system is initialized: `settingsPropagation.isInitialized()`
2. Verify events are being emitted after saving settings
3. Check browser console for propagation errors
4. Ensure settings are saved to localStorage correctly

### Listeners Not Being Called
1. Verify listener is registered before settings change
2. Check that listener function doesn't throw errors
3. Ensure component hasn't unmounted (use hooks for automatic cleanup)
4. Check listener count: `settingsPropagation.getListenerCounts()`

### Service Not Using New Settings
1. Manually trigger propagation: `await triggerLLMPropagation()`
2. Verify service is using the global instance (not a local copy)
3. Check that configuration is valid and complete
4. Restart the service if necessary

## Future Enhancements

- Settings validation before propagation
- Rollback on propagation failure
- Settings change history and undo
- Cross-tab synchronization
- Settings migration for version updates
