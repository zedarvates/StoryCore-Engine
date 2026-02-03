# Electron Integration Guide for Menu Tools

## Quick Start

The LLM Assistant and ComfyUI Server tools now work in Electron mode through IPC handlers.

## How to Use in UI Components

### 1. Check if Running in Electron

```typescript
const isElectron = typeof window !== 'undefined' && window.electronAPI;

if (isElectron) {
  // Use Electron APIs
  const config = await window.electronAPI.llm.getConfig();
} else {
  // Use web APIs (direct HTTP)
  const config = await fetchLLMConfig();
}
```

### 2. LLM Configuration Integration

**In LLMConfigurationWindow.tsx:**

```typescript
import { useEffect, useState } from 'react';

export function LLMConfigurationWindow() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      if (window.electronAPI?.llm) {
        const cfg = await window.electronAPI.llm.getConfig();
        setConfig(cfg);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }

  async function testConnection() {
    try {
      const result = await window.electronAPI.llm.testConnection(config.ollama);
      if (result.success) {
        alert(`✓ Connected: ${result.message}`);
      } else {
        alert(`✗ Failed: ${result.message}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function updateConfig(newConfig: any) {
    try {
      const updated = await window.electronAPI.llm.updateConfig(newConfig);
      setConfig(updated);
      alert('Configuration updated successfully');
    } catch (err) {
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function loadModels() {
    try {
      const models = await window.electronAPI.llm.getModels(config.ollama);
      console.log('Available models:', models);
      return models;
    } catch (err) {
      console.error('Failed to load models:', err);
      return [];
    }
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>LLM Configuration</h2>
      {/* Your UI here */}
      <button onClick={testConnection}>Test Connection</button>
      <button onClick={loadModels}>Load Models</button>
    </div>
  );
}
```

### 3. ComfyUI Configuration Integration

**In ComfyUIConfigurationWindow.tsx:**

```typescript
import { useEffect, useState } from 'react';

export function ComfyUIConfigurationWindow() {
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
    checkStatus();
  }, []);

  async function loadConfig() {
    try {
      if (window.electronAPI?.comfyui) {
        const cfg = await window.electronAPI.comfyui.getConfig();
        setConfig(cfg);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkStatus() {
    try {
      if (window.electronAPI?.comfyui) {
        const st = await window.electronAPI.comfyui.getServiceStatus();
        setStatus(st);
      }
    } catch (err) {
      console.error('Failed to check status:', err);
    }
  }

  async function testConnection() {
    try {
      const result = await window.electronAPI.comfyui.testConnection();
      if (result.success) {
        alert(`✓ Connected: ${result.message}`);
      } else {
        alert(`✗ Failed: ${result.message}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function updateConfig(newConfig: any) {
    try {
      const updated = await window.electronAPI.comfyui.updateConfig(newConfig);
      setConfig(updated);
      alert('Configuration updated successfully');
    } catch (err) {
      alert(`Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  async function startService() {
    try {
      const result = await window.electronAPI.comfyui.startService();
      if (result.success) {
        alert(result.message || 'Service started');
        checkStatus();
      } else {
        alert(`Failed: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>ComfyUI Configuration</h2>
      <div>
        Status: {status?.running ? '🟢 Running' : '🔴 Offline'}
        {status?.url && <p>URL: {status.url}</p>}
      </div>
      <button onClick={testConnection}>Test Connection</button>
      <button onClick={startService}>Start Service</button>
      <button onClick={() => updateConfig(config)}>Save Configuration</button>
    </div>
  );
}
```

### 4. Menu Action Integration

**In menuActions.ts:**

```typescript
export const toolsActions = {
  llmAssistant: async (ctx: ActionContext) => {
    try {
      // Check if running in Electron
      if (window.electronAPI?.llm) {
        // Load LLM config from Electron
        const config = await window.electronAPI.llm.getConfig();
        console.log('LLM Config:', config);
      }
      
      // Show LLM chat UI
      ctx.state.showChat = true;
      ctx.services.notification.show({
        type: 'success',
        message: 'LLM Assistant opened',
      });
    } catch (error) {
      ctx.services.notification.show({
        type: 'error',
        message: `Failed to open LLM Assistant: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },

  comfyuiServer: async (ctx: ActionContext) => {
    try {
      // Check if running in Electron
      if (window.electronAPI?.comfyui) {
        // Check ComfyUI status
        const status = await window.electronAPI.comfyui.getServiceStatus();
        if (!status.running) {
          ctx.services.notification.show({
            type: 'warning',
            message: 'ComfyUI server is not running. Please start it manually.',
          });
          return;
        }
      }
      
      // Show ComfyUI configuration UI
      ctx.state.showComfyUIConfig = true;
      ctx.services.notification.show({
        type: 'success',
        message: 'ComfyUI configuration opened',
      });
    } catch (error) {
      ctx.services.notification.show({
        type: 'error',
        message: `Failed to open ComfyUI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  },
};
```

## Error Handling Patterns

### Pattern 1: Try-Catch with User Feedback

```typescript
async function performAction() {
  try {
    const result = await window.electronAPI.llm.testConnection(provider);
    if (result.success) {
      showSuccessNotification(result.message);
    } else {
      showErrorNotification(result.message);
    }
  } catch (error) {
    showErrorNotification(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
```

### Pattern 2: Fallback to Web API

```typescript
async function getConfig() {
  try {
    if (window.electronAPI?.llm) {
      return await window.electronAPI.llm.getConfig();
    } else {
      // Fallback to web API
      return await fetchLLMConfigFromWeb();
    }
  } catch (error) {
    console.error('Failed to get config:', error);
    return getDefaultConfig();
  }
}
```

### Pattern 3: Retry Logic

```typescript
async function testConnectionWithRetry(
  provider: any,
  maxRetries: number = 3
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await window.electronAPI.llm.testConnection(provider);
      if (result.success) return true;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  return false;
}
```

## Common Issues and Solutions

### Issue 1: `window.electronAPI is undefined`

**Cause:** Running in web mode or preload script not loaded

**Solution:**
```typescript
if (typeof window !== 'undefined' && window.electronAPI) {
  // Use Electron API
} else {
  // Use web API
}
```

### Issue 2: IPC timeout

**Cause:** Service not responding or network issue

**Solution:**
```typescript
try {
  const result = await Promise.race([
    window.electronAPI.llm.testConnection(provider),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    ),
  ]);
} catch (error) {
  if (error.message === 'Timeout') {
    showErrorNotification('Connection timeout. Please check your network.');
  }
}
```

### Issue 3: Configuration not persisting

**Cause:** In-memory storage is lost on app restart

**Solution:** Implement file-based persistence
```typescript
// Save to file after update
await window.electronAPI.comfyui.updateConfig(newConfig);
// Configuration is now in memory, implement file persistence in next phase
```

## Testing Checklist

- [ ] LLM configuration loads in Electron
- [ ] LLM connection test works
- [ ] LLM model list loads
- [ ] ComfyUI configuration loads in Electron
- [ ] ComfyUI connection test works
- [ ] ComfyUI service status updates
- [ ] Menu tools open configuration windows
- [ ] Error messages display correctly
- [ ] Web mode still works (fallback)
- [ ] No console errors

## Next Phase: Persistence

To add file-based persistence:

1. Modify `LLMService` to use `ConfigurationStore`
2. Modify `ComfyUIService` to use `ConfigurationStore`
3. Add file I/O operations
4. Implement encryption for API keys
5. Add migration logic for config versions

## Performance Tips

1. **Cache configurations** - Don't reload on every access
2. **Debounce updates** - Batch configuration changes
3. **Lazy load models** - Only fetch when needed
4. **Use timeouts** - Prevent hanging requests
5. **Monitor memory** - In-memory store can grow

## Security Considerations

1. **API Keys** - Currently stored in memory only
2. **HTTPS** - Use for cloud providers
3. **Validation** - Validate all inputs
4. **Logging** - Don't log sensitive data
5. **Encryption** - Implement for persistent storage
