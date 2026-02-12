# Redux Serialization & Service Status Fixes

## Date: January 25, 2026

## Issues Fixed

### 1. Redux Non-Serializable State Error ✅

**Problem**: Redux was storing `Date` objects in the state, which are not serializable and caused warnings.

**Error Message**:
```
A non-serializable value was detected in the state, in the path: `project.saveStatus.lastSaveTime`. 
Value: Sun Jan 25 2026 08:03:04 GMT+0100 (Central European Standard Time)
```

**Solution**: Changed `lastSaveTime` from `Date` object to `number` (timestamp in milliseconds).

**Files Modified**:
1. `src/sequence-editor/types/index.ts`
   - Changed `lastSaveTime?: Date` to `lastSaveTime?: number`

2. `src/sequence-editor/store/slices/projectSlice.ts`
   - Changed `lastSaveTime: new Date()` to `lastSaveTime: Date.now()`

3. `src/sequence-editor/store/hooks/useProjectPersistence.ts`
   - Updated timestamp handling to use `Date.now()` instead of `new Date()`
   - Fixed time difference calculation to work with timestamps

4. `src/sequence-editor/services/projectPersistence.ts`
   - Changed type definition from `Date` to `number`
   - Updated export function to use `Date.now()` instead of `new Date()`

### 2. ComfyUI Connection Errors ✅

**Problem**: Multiple components were trying to connect to ComfyUI even when not configured, causing console errors.

**Error Messages**:
```
GET http://localhost:8000/system_stats net::ERR_CONNECTION_REFUSED
GET http://localhost:8188/system_stats net::ERR_CONNECTION_REFUSED
GET http://localhost:8000/job/... net::ERR_CONNECTION_REFUSED
GET http://localhost:8000/generate/image net::ERR_CONNECTION_REFUSED
GET http://localhost:8000/generate/video net::ERR_CONNECTION_REFUSED
```

**Solution**: Added checks to only attempt connection if ComfyUI server is configured.

**Files Modified**:
1. `src/hooks/useServiceStatus.ts`
   - Added check for `activeServer` before attempting connection
   - Returns early with 'disconnected' status if no server is configured

2. `src/services/wizard/WizardService.ts`
   - Removed fallback attempts to localhost:8188 and localhost:8000
   - Only attempts connection if a server is configured
   - Returns clear error message when no server is configured

3. `src/components/workspace/ProjectDashboardNew.tsx`
   - Removed fallback attempt to localhost:8188
   - Only checks configured server
   - Sets disconnected status if no server is configured

4. `src/components/AIGenerationPanel.tsx` ✨ **NEW**
   - Added `comfyUIUrl` state to track configured server
   - Checks for configured ComfyUI server on component mount
   - Only attempts connections if server is configured
   - Shows warning banner when ComfyUI is not configured
   - Disables generate buttons when ComfyUI is not configured
   - Provides clear error messages to users
   - Updated all fetch calls to use configured URL instead of hardcoded localhost:8000

## Benefits

### Redux Serialization Fix
- ✅ No more Redux middleware warnings
- ✅ State can be properly serialized for persistence
- ✅ Redux DevTools work correctly
- ✅ Time travel debugging enabled
- ✅ Better performance (no object serialization overhead)

### ComfyUI Connection Fix
- ✅ No more console errors when ComfyUI is not configured
- ✅ Cleaner console output
- ✅ Reduced unnecessary network requests
- ✅ Better user experience (no false error messages)
- ✅ Faster page load (no waiting for connection timeouts)

## Testing

### Redux Serialization
1. Open the app in browser
2. Open Redux DevTools
3. Perform actions that trigger save status updates
4. Verify no serialization warnings in console
5. Check that timestamps are stored as numbers

### ComfyUI Connection
1. Open the app without ComfyUI configured
2. Check browser console
3. Verify no `ERR_CONNECTION_REFUSED` errors
4. Service status should show 'disconnected' without errors
5. Navigate to different pages (Dashboard, Editor, AI Generation Panel)
6. Verify no connection attempts in console
7. AI Generation Panel should show warning banner
8. Generate buttons should be disabled when ComfyUI is not configured

## Migration Notes

If you have existing saved projects with `Date` objects in `lastSaveTime`, they will be automatically converted to timestamps when loaded. The conversion is handled in `useProjectPersistence.ts`:

```typescript
lastSaveTime: savedProject.timestamp || Date.now()
```

## Related Requirements

- **Requirement 19.2**: Auto-save functionality
- **Requirement 19.3**: Display save timestamp
- **Requirement 19.4**: Save status indicator
- **Requirement 19.5**: Unsaved changes warning

## Conclusion

All issues have been resolved. The application now:
- Properly handles Redux state serialization
- Gracefully handles missing ComfyUI configuration without generating console errors
- Only attempts connections to configured services
- Provides clear feedback when services are not configured
