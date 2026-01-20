# Decryption and Endpoint Errors Fixed

## Issues Resolved

### 1. Decryption Error (OperationError)
**Problem:** Encrypted API keys were failing to decrypt, causing console errors and preventing settings from loading.

**Root Cause:**
- Session-based encryption keys were being lost between sessions
- Corrupted encrypted data in localStorage
- Missing validation for base64 format before decryption

**Solution:**
- Enhanced error handling in `decryptValue()` with better validation
- Added `resetEncryptionKey()` utility to clear corrupted keys
- Improved `loadLLMSettings()` to automatically clear corrupted data
- Added base64 format validation before attempting decryption

**Files Modified:**
- `creative-studio-ui/src/utils/secureStorage.ts`

### 2. Wrong API Endpoint (CSP Violation)
**Problem:** LocalModelSelector was trying to connect to `https://api.openai.com/v1/api/tags` instead of the Ollama endpoint, causing CSP violations.

**Root Cause:**
- When switching providers, the `apiEndpoint` state wasn't being reset to the provider's default
- OpenAI endpoint was persisting when switching to local provider
- Default endpoints defined in provider config weren't being used

**Solution:**
- Added endpoint reset logic in provider change handler to use `defaultEndpoint` from provider config
- Automatically sets endpoint to provider's default when switching (e.g., `http://localhost:11434` for local)
- Enhanced loading logic to use default endpoint if none is stored
- Updated placeholder and help text to show the correct default endpoint dynamically
- Added better error logging in `isOllamaRunning()`

**Files Modified:**
- `creative-studio-ui/src/components/settings/LLMSettingsPanel.tsx`
- `creative-studio-ui/src/services/localModelService.ts`

### 3. Default Endpoint Not Applied
**Problem:** When selecting "Local LLM" provider, the API endpoint field showed OpenAI's endpoint instead of `http://localhost:11434`.

**Root Cause:**
- Provider's `defaultEndpoint` configuration wasn't being applied automatically
- No fallback to default endpoint when loading stored settings

**Solution:**
- Provider change handler now reads `defaultEndpoint` from provider configuration
- Loading logic checks for missing endpoint and applies provider default
- Placeholder text dynamically shows the correct default endpoint
- Help text indicates the default endpoint for the selected provider

**Files Modified:**
- `creative-studio-ui/src/components/settings/LLMSettingsPanel.tsx`

## Technical Details

### Decryption Flow Improvements

```typescript
// Before: Simple error handling
try {
  const decrypted = await crypto.subtle.decrypt(...);
  return decoder.decode(decrypted);
} catch {
  throw new Error('Failed to decrypt value');
}

// After: Comprehensive validation and error handling
try {
  // Validate base64 format
  atob(encrypted);
  atob(iv);
  
  const decrypted = await crypto.subtle.decrypt(...);
  return decoder.decode(decrypted);
} catch (error) {
  if (error.name === 'OperationError') {
    throw new Error('encryption key mismatch (session expired or corrupted data)');
  }
  throw new Error(`Failed to decrypt: ${error.message}`);
}
```

### Provider Change Handler

```typescript
// Before: Hardcoded endpoint reset
onValueChange={(value) => {
  setProvider(value as LLMProvider);
  if (newProvider === 'local' || newProvider === 'custom') {
    setApiEndpoint('http://localhost:11434');
  } else {
    setApiEndpoint('');
  }
}}

// After: Uses provider's defaultEndpoint configuration
onValueChange={(value) => {
  const newProvider = value as LLMProvider;
  setProvider(newProvider);
  
  // Get the default endpoint for the selected provider
  const providerInfo = providers.find(p => p.id === newProvider);
  const defaultEndpoint = providerInfo?.defaultEndpoint || '';
  
  // Set the endpoint to the provider's default
  setApiEndpoint(defaultEndpoint);
  
  setConnectionStatus({ state: 'idle' });
}}
```

### Loading Settings with Default Endpoint

```typescript
// Before: Simple fallback to empty string
setApiEndpoint(storedConfig.apiEndpoint || '');

// After: Falls back to provider's default
let endpoint = storedConfig.apiEndpoint || '';
if (!endpoint && (storedConfig.provider === 'local' || storedConfig.provider === 'custom')) {
  const providerInfo = providers.find(p => p.id === storedConfig.provider);
  endpoint = providerInfo?.defaultEndpoint || '';
}
setApiEndpoint(endpoint);
```

### Dynamic Placeholder

```typescript
// Before: Static placeholder
<Input placeholder="http://localhost:8000" />

// After: Dynamic based on provider
<Input placeholder={currentProviderInfo?.defaultEndpoint || 'http://localhost:8000'} />
<p className="text-xs text-muted-foreground">
  The base URL for your {provider} LLM server (default: {currentProviderInfo?.defaultEndpoint})
</p>
```

## User Impact

### Before Fix
- Console flooded with decryption errors
- CSP violations when checking Ollama status
- Settings couldn't load if encryption key was lost
- Wrong endpoint used when switching providers
- **API endpoint showed OpenAI URL when selecting Local LLM**
- **No indication of what the default endpoint should be**

### After Fix
- Clean console with no decryption errors
- Correct Ollama endpoint used consistently
- Automatic recovery from corrupted encryption data
- Smooth provider switching with correct endpoints
- **API endpoint automatically set to `http://localhost:11434` for Local LLM**
- **Placeholder and help text show the correct default endpoint**
- **Default endpoints applied from provider configuration**

## Testing Recommendations

1. **Test Decryption Recovery:**
   - Open DevTools → Application → Session Storage
   - Delete `encryption-key`
   - Reload page
   - Verify settings load without errors

2. **Test Provider Switching:**
   - Select OpenAI provider
   - Note endpoint field (should be empty or show OpenAI default)
   - Switch to Local LLM provider
   - **Verify endpoint automatically changes to `http://localhost:11434`**
   - **Verify placeholder shows `http://localhost:11434`**
   - **Verify help text shows "default: http://localhost:11434"**
   - Check console for no CSP violations

3. **Test Default Endpoint Application:**
   - Clear all settings
   - Select Local LLM provider
   - Verify endpoint field shows `http://localhost:11434`
   - Save settings
   - Reload page
   - Verify endpoint is still `http://localhost:11434`

4. **Test Ollama Connection:**
   - Ensure Ollama is running on port 11434
   - Select Local LLM provider
   - Verify endpoint is `http://localhost:11434`
   - Click "Check Ollama Status"
   - Verify connection succeeds without errors

## Related Files

- `creative-studio-ui/src/utils/secureStorage.ts` - Encryption utilities
- `creative-studio-ui/src/components/settings/LLMSettingsPanel.tsx` - Settings UI
- `creative-studio-ui/src/services/localModelService.ts` - Ollama integration
- `creative-studio-ui/index.html` - CSP configuration

## Notes

- Encryption keys are session-based for security
- Lost keys result in automatic settings reset (by design)
- CSP allows `http://localhost:*` for local development
- Ollama default port is 11434
- **Each provider has its own `defaultEndpoint` configuration:**
  - OpenAI: `https://api.openai.com/v1`
  - Anthropic: `https://api.anthropic.com/v1`
  - Local LLM: `http://localhost:11434`
  - Custom: `` (empty, user must specify)
- **Default endpoints are automatically applied when switching providers**
- **Placeholder text dynamically shows the correct default for each provider**
