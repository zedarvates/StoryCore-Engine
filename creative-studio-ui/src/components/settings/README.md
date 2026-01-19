# Settings Components

This directory contains configuration UI components for the StoryCore-Engine Creative Studio.

## Components

### LLMSettingsPanel

A comprehensive settings panel for configuring LLM (Large Language Model) integration.

**Features:**
- Provider selection (OpenAI, Anthropic, Local, Custom)
- Model selection with detailed information display
- API key management with show/hide toggle
- Generation parameter controls (temperature, max tokens, top P, penalties)
- System prompt editors for different generation tasks
- Connection testing and validation
- Advanced settings (timeout, retry attempts, streaming)

**Usage:**

```tsx
import { LLMSettingsPanel } from '@/components/settings';
import { getLLMService } from '@/services/llmService';

function SettingsPage() {
  const llmService = getLLMService();

  const handleSave = async (config: LLMConfig) => {
    // Update the LLM service
    llmService.updateConfig(config);
    
    // Save to persistent storage
    localStorage.setItem('llm-config', JSON.stringify(config));
    
    console.log('Settings saved:', config);
  };

  const handleTestConnection = async (config: Partial<LLMConfig>) => {
    const testService = getLLMService();
    testService.updateConfig(config as LLMConfig);
    const result = await testService.validateConnection();
    return result.success && result.data === true;
  };

  return (
    <LLMSettingsPanel
      currentConfig={llmService.getConfig()}
      onSave={handleSave}
      onTestConnection={handleTestConnection}
      onCancel={() => console.log('Cancelled')}
    />
  );
}
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `currentConfig` | `Partial<LLMConfig>` | No | Initial configuration to load |
| `onSave` | `(config: LLMConfig) => void \| Promise<void>` | Yes | Called when user saves settings |
| `onCancel` | `() => void` | No | Called when user cancels (shows cancel button if provided) |
| `onTestConnection` | `(config: Partial<LLMConfig>) => Promise<boolean>` | No | Called to test connection (shows test button if provided) |
| `className` | `string` | No | Additional CSS classes |

**Provider-Specific Fields:**

- **OpenAI / Anthropic**: Requires API key
- **Local / Custom**: Requires API endpoint URL

**Parameter Ranges:**

- **Temperature**: 0-2 (default: 0.7)
- **Max Tokens**: 100 to model limit (default: 2000)
- **Top P**: 0-1 (default: 1.0)
- **Frequency Penalty**: -2 to 2 (default: 0)
- **Presence Penalty**: -2 to 2 (default: 0)
- **Timeout**: 5000-120000 ms (default: 30000)
- **Retry Attempts**: 0-5 (default: 3)

**System Prompts:**

The panel includes editors for three types of system prompts:
1. **World Generation**: Used when generating story world details
2. **Character Generation**: Used when creating character profiles
3. **Dialogue Generation**: Used when generating character dialogue

Each prompt can be customized or reset to defaults.

**Validation:**

The component validates:
- Required fields based on selected provider
- API key presence for OpenAI/Anthropic
- Endpoint URL for Local/Custom providers
- Model selection

The save button is disabled until all required fields are filled.

**Connection Testing:**

When `onTestConnection` is provided, users can test their configuration before saving:
- Validates API credentials
- Checks endpoint accessibility
- Displays success/error messages with details

**Accessibility:**

- Full keyboard navigation support
- ARIA labels on all form fields
- Tooltips with parameter explanations
- Screen reader friendly
- Focus management

**Security:**

- API keys are masked by default (password input)
- Toggle button to show/hide API key
- Keys should be encrypted before storage (handled by parent component)

## Testing

Run tests with:

```bash
npm test -- src/components/settings/__tests__/
```

## Integration

The LLM Settings Panel integrates with:
- `@/services/llmService` - LLM service configuration
- `@/components/ui/*` - shadcn/ui components
- `@/lib/utils` - Utility functions

## Future Enhancements

- [ ] Prompt templates library
- [ ] Cost estimation based on parameters
- [ ] Usage statistics display
- [ ] Multiple provider profiles
- [ ] Import/export settings
- [ ] Preset configurations
