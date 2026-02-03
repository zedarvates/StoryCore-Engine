# Project Recovery Null Reference Fix

## Issue
The application was crashing with the error:
```
TypeError: Cannot read properties of null (reading 'created')
at exportProjectToJSON (projectPersistence.ts:76:37)
```

This occurred when the recovery system tried to save automatic snapshots, but the project metadata was null (which is the initial state).

## Root Cause
The `exportProjectToJSON` function in `projectPersistence.ts` was directly accessing `state.project.metadata.created` without checking if `metadata` was null first. According to the Redux store initialization in `projectSlice.ts`, the `metadata` field starts as `null`:

```typescript
const initialState: ProjectState = {
  metadata: null,  // <-- This is the problem
  settings: { ... },
  saveStatus: { ... },
  generationStatus: { ... },
};
```

## Solution
Added null checks and default values in three locations:

### 1. `exportProjectToJSON` function
Added a fallback to create default metadata when it's null:

```typescript
// Handle null metadata by creating default values
const metadata = state.project.metadata || {
  name: 'Untitled Project',
  path: '',
  created: new Date(now),
  modified: new Date(now),
  author: '',
  description: '',
};
```

### 2. `saveProjectToFile` function
Changed from:
```typescript
const projectName = state.project.metadata.name || 'untitled';
```

To:
```typescript
const projectName = state.project.metadata?.name || 'untitled';
```

### 3. `saveRecoverySnapshot` function
Changed from:
```typescript
projectName: state.project.metadata.name,
```

To:
```typescript
projectName: state.project.metadata?.name || 'Untitled Project',
```

## Files Modified
- `creative-studio-ui/src/sequence-editor/services/projectPersistence.ts`
- `creative-studio-ui/src/sequence-editor/services/projectRecovery.ts`

## Testing
- No TypeScript errors after the fix
- The recovery system can now safely save snapshots even when no project is loaded
- Default values ensure the exported JSON is always valid

## Impact
This fix prevents the application from crashing on startup when the recovery manager tries to save its initial snapshot. Users will no longer see the console error, and the recovery system will work correctly from the moment the application loads.
