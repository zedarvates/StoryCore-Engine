# Feedback Configuration Management

## Overview

The Feedback & Diagnostics module includes a comprehensive configuration management system that allows users to customize feedback system settings. Configuration is stored in `~/.storycore/config.json` and is automatically loaded when the application starts.

**Requirements:** 7.3

## Configuration Options

### Backend Settings

- **`backend_proxy_url`** (string): URL of the backend proxy service for automatic submission
  - Default: `"http://localhost:3000"`
  - Example: `"https://feedback.storycore.example.com"`

### Submission Settings

- **`default_mode`** (string): Default submission mode
  - Options: `"manual"` or `"automatic"`
  - Default: `"manual"`
  - Manual mode opens a pre-filled GitHub issue in the browser
  - Automatic mode submits directly via the backend proxy

### Privacy Settings

- **`auto_collect_logs`** (boolean): Whether to automatically collect logs
  - Default: `true`
  - When enabled, logs are collected if user gives consent

- **`privacy_consent_given`** (boolean): Whether user has given privacy consent
  - Default: `false`
  - Persisted across sessions

### Collection Limits

- **`max_log_lines`** (number): Maximum number of log lines to collect
  - Default: `500`
  - Range: 0 to unlimited

- **`screenshot_max_size_mb`** (number): Maximum screenshot size in MB
  - Default: `5`
  - Minimum: 1 MB

### Crash Reporting

- **`enable_crash_reports`** (boolean): Whether to enable automatic crash reporting
  - Default: `true`
  - When enabled, critical errors automatically open the feedback panel

## Configuration File Location

The configuration file is stored at:
- **Windows:** `C:\Users\<username>\.storycore\config.json`
- **macOS:** `/Users/<username>/.storycore/config.json`
- **Linux:** `/home/<username>/.storycore/config.json`

## Default Configuration

```json
{
  "feedback": {
    "backend_proxy_url": "http://localhost:3000",
    "default_mode": "manual",
    "auto_collect_logs": true,
    "max_log_lines": 500,
    "screenshot_max_size_mb": 5,
    "enable_crash_reports": true,
    "privacy_consent_given": false
  }
}
```

## Python API

### Basic Usage

```python
from feedback_config import get_config

# Get configuration instance
config = get_config()

# Access settings
backend_url = config.backend_proxy_url
default_mode = config.default_mode

# Update settings
config.backend_proxy_url = "https://feedback.example.com"
config.default_mode = "automatic"

# Update multiple settings
config.update({
    "max_log_lines": 1000,
    "privacy_consent_given": True
})

# Reset to defaults
config.reset_to_defaults()
```

### Initialization

```python
from feedback_config import initialize_config

# Initialize at application startup
config = initialize_config()

# Or with custom path
config = initialize_config(Path("/custom/path/config.json"))
```

### Property Access

```python
# All settings are available as properties
config.backend_proxy_url = "https://new-url.com"
config.default_mode = "automatic"
config.auto_collect_logs = False
config.max_log_lines = 1000
config.screenshot_max_size_mb = 10
config.enable_crash_reports = True
config.privacy_consent_given = True
```

## TypeScript API

### Basic Usage

```typescript
import {
  getFeedbackConfig,
  updateFeedbackConfig,
  getConfigValue,
  setConfigValue
} from './utils/feedbackConfig';

// Get full configuration
const config = await getFeedbackConfig();

// Get specific value
const backendUrl = await getConfigValue('backend_proxy_url');
const defaultMode = await getConfigValue('default_mode');

// Update configuration
await updateFeedbackConfig({
  backend_proxy_url: 'https://feedback.example.com',
  default_mode: 'automatic'
});

// Set specific value
await setConfigValue('privacy_consent_given', true);
```

### Initialization

```typescript
import { initializeFeedbackConfig } from './utils/feedbackConfig';

// Initialize at application startup
const config = await initializeFeedbackConfig();
```

### Convenience Functions

```typescript
import {
  getBackendProxyUrl,
  getDefaultSubmissionMode,
  getAutoCollectLogs,
  getMaxLogLines,
  getScreenshotMaxSize,
  getCrashReportsEnabled,
  getPrivacyConsent,
  setPrivacyConsent
} from './utils/feedbackConfig';

// Get specific settings
const backendUrl = await getBackendProxyUrl();
const mode = await getDefaultSubmissionMode();
const autoCollect = await getAutoCollectLogs();

// Update privacy consent
await setPrivacyConsent(true);
```

## Integration with Feedback Panel

The Feedback Panel automatically loads configuration on mount:

```typescript
// Configuration is loaded automatically
useEffect(() => {
  const loadConfig = async () => {
    await initializeFeedbackConfig();
    const mode = await getDefaultSubmissionMode();
    const consent = await getPrivacyConsent();
    
    setFormState(prev => ({
      ...prev,
      submissionMode: mode,
      logConsent: consent
    }));
  };
  
  loadConfig();
}, []);
```

## Configuration Persistence

- Configuration changes are automatically saved to disk
- Settings persist across application restarts
- Privacy consent is remembered across sessions
- Submission mode preference is stored in both config and localStorage (fallback)

## Environment Variables

The TypeScript configuration system supports environment variable overrides:

```bash
# Vite environment variables
VITE_BACKEND_URL=https://feedback.example.com
VITE_FEEDBACK_DEFAULT_MODE=automatic
```

These are used as fallbacks when the backend configuration is unavailable.

## Electron Bridge

For Electron applications, the configuration system uses IPC to communicate with the Python backend:

```typescript
// Electron API methods (automatically used if available)
window.electronAPI.getFeedbackConfig()
window.electronAPI.updateFeedbackConfig(updates)
window.electronAPI.resetFeedbackConfig()
```

## Example: Customizing Configuration

### Python Example

```python
from feedback_config import get_config

# Get configuration
config = get_config()

# Customize for production environment
config.update({
    "backend_proxy_url": "https://feedback.storycore.app/api/v1/report",
    "default_mode": "automatic",
    "max_log_lines": 1000,
    "enable_crash_reports": True
})

print("Configuration updated for production")
```

### TypeScript Example

```typescript
import { updateFeedbackConfig } from './utils/feedbackConfig';

// Customize for production environment
await updateFeedbackConfig({
  backend_proxy_url: 'https://feedback.storycore.app/api/v1/report',
  default_mode: 'automatic',
  max_log_lines: 1000,
  enable_crash_reports: true
});

console.log('Configuration updated for production');
```

## Testing

The configuration system includes comprehensive unit tests:

```bash
# Run Python tests
python -m pytest src/test_feedback_config.py -v

# Run example
python src/feedback_config_example.py
```

## Troubleshooting

### Configuration Not Loading

1. Check that `~/.storycore/` directory exists
2. Verify `config.json` has valid JSON syntax
3. Check file permissions (should be readable/writable)
4. Look for error messages in console logs

### Configuration Not Persisting

1. Verify write permissions on `~/.storycore/config.json`
2. Check disk space availability
3. Ensure no other process is locking the file

### Invalid Configuration Values

The system validates configuration values:
- `default_mode` must be "manual" or "automatic"
- `max_log_lines` must be non-negative
- `screenshot_max_size_mb` must be at least 1

Invalid values will raise `ValueError` with descriptive messages.

## Security Considerations

- Configuration file is stored in user's home directory (not shared)
- No sensitive credentials are stored in configuration
- Backend proxy URL should use HTTPS in production
- Privacy consent is explicitly tracked and respected

## Future Enhancements

Potential future additions to the configuration system:
- UI settings panel for easy configuration
- Configuration profiles (development, staging, production)
- Configuration validation and migration
- Configuration export/import functionality
- Team-wide configuration sharing

---

**Related Files:**
- Python: `src/feedback_config.py`
- TypeScript: `creative-studio-ui/src/components/feedback/utils/feedbackConfig.ts`
- Tests: `src/test_feedback_config.py`
- Example: `src/feedback_config_example.py`
