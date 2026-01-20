# LLM Settings Decryption Error Fix

## Problem
Users encountered the error: `failed to load LLM settings: Error: Failed to decrypt value`

This occurred when:
- Browser was refreshed
- New session started
- Encryption key in sessionStorage was cleared

## Root Cause
The secure storage system uses Web Crypto API with a session-specific encryption key stored in `sessionStorage`. When the session ends (browser refresh, new tab), the encryption key is lost, making previously encrypted data unreadable.

## Solution Implemented

### 1. Graceful Decryption Failure Handling
Modified `loadLLMSettings()` to catch decryption errors and automatically clear corrupted settings:

```typescript
try {
  const [encrypted, iv] = settings.llm.encryptedApiKey.split(':');
  if (!encrypted || !iv) {
    throw new Error('Invalid encrypted data format');
  }
  apiKey = await decryptValue(encrypted, iv);
} catch (decryptError) {
  console.warn('Failed to decrypt API key, clearing corrupted settings:', decryptError);
  deleteLLMSettings();
  return null;
}
```

### 2. Input Validation
Added validation in `decryptValue()` to check for missing data:

```typescript
if (!encrypted || !iv) {
  throw new Error('Missing encrypted data or IV');
}
```

### 3. Better Error Messages
Enhanced error reporting to indicate session expiration:

```typescript
if (error instanceof Error && error.message.includes('operation-specific reason')) {
  throw new Error('Failed to decrypt value: encryption key mismatch (session expired)');
}
```

### 4. Modal Error Handling
Updated `LLMSettingsModal` to handle null settings gracefully and start with empty config.

## User Experience

**Before:**
- Error thrown on page load
- Settings modal wouldn't open
- User couldn't configure LLM settings

**After:**
- Corrupted settings automatically cleared
- Modal opens with empty form
- User can re-enter their settings
- No error messages shown to user

## Technical Notes

### Why Session Storage?
The encryption key is stored in `sessionStorage` (not `localStorage`) for security:
- Key is cleared when browser closes
- Prevents long-term storage of encryption keys
- Follows security best practices

### Trade-off
Users need to re-enter API keys after:
- Browser refresh
- New browser session
- Tab closure

This is intentional for security - API keys are sensitive and shouldn't persist indefinitely.

## Alternative Solutions Considered

1. **Store key in localStorage**: Rejected - security risk
2. **Derive key from user password**: Rejected - adds complexity, no password system
3. **Don't encrypt at all**: Rejected - API keys are sensitive
4. **Use browser's credential storage**: Future enhancement

## Future Improvements

1. Integrate with browser's native credential storage API
2. Add "Remember me" option with explicit user consent
3. Implement key derivation from user-provided passphrase
4. Add session timeout warnings

## Testing

To verify the fix:
1. Configure LLM settings with API key
2. Refresh the browser
3. Open LLM settings modal
4. Should open with empty form (no error)
5. Re-enter settings and save
6. Settings should work until next refresh

## Files Modified

- `creative-studio-ui/src/utils/secureStorage.ts`
- `creative-studio-ui/src/components/settings/LLMSettingsModal.tsx`
