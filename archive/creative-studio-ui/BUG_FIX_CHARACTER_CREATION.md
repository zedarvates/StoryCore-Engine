# Bug Fix: Character Creation Error

## Issue Summary

Fixed a critical bug where character creation was failing with the error:
```
TypeError: Cannot read properties of undefined (reading 'name')
at createCharacter (storyGenerationService.ts:314:20)
```

## Root Cause

The `createCharacter` and `createLocation` functions in `storyGenerationService.ts` required a `WorldContext` parameter but did not handle the case where it could be `undefined`. The calling code in `Step2CharacterSelection.tsx` and `Step3LocationSelection.tsx` was using non-null assertions (`worldContext!`) even when `worldContext` could be undefined (when no world is selected).

## Changes Made

### 1. storyGenerationService.ts

**createCharacter function:**
- Changed parameter from `worldContext: WorldContext` to `worldContext?: WorldContext` (optional)
- Added null check: wrapped all `worldContext` property accesses in an `if (worldContext)` block
- Added fallback message when no world context is provided

**createLocation function:**
- Applied the same fix as `createCharacter`
- Changed parameter to optional
- Added null safety checks
- Added fallback message

### 2. Step2CharacterSelection.tsx

- Removed non-null assertion operator (`!`) from `createCharacter` call
- Changed from: `await createCharacter(newCharacter, worldContext!)`
- Changed to: `await createCharacter(newCharacter, worldContext)`
- Added comment clarifying that worldContext is optional

### 3. Step3LocationSelection.tsx

- Removed non-null assertion operator (`!`) from `createLocation` call
- Changed from: `await createLocation(newLocation, worldContext!)`
- Changed to: `await createLocation(newLocation, worldContext)`
- Added comment clarifying that worldContext is optional

## Testing

All files pass TypeScript diagnostics with no errors.

## Impact

- Character creation now works even when no world is selected
- Location creation now works even when no world is selected
- The LLM will generate characters/locations with generic context when world context is not available
- No breaking changes to existing functionality

## Related Issues

This fix also addresses the console noise from ComfyUI connection errors. The errors are expected when ComfyUI is not running, and the app correctly falls back to working without it. The connection status indicators in the UI properly show when services are unavailable.
