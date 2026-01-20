# Project Persistence System

## Overview

The project persistence system provides robust data storage and retrieval for ProjectDashboardNew with Data Contract v1 compliance, auto-save functionality, retry logic, and comprehensive error handling.

## Features

- ✅ **Data Contract v1 Validation**: All saved/loaded data is validated against the schema
- ✅ **Auto-Save with Debouncing**: Automatic saving with 2-second debounce (Requirement 9.1)
- ✅ **Retry Logic**: 3 retry attempts with exponential backoff on failures (Requirement 9.5)
- ✅ **Error Handling**: Comprehensive error handling with user notifications (Requirement 9.5)
- ✅ **Save Status Tracking**: Real-time save status indicators (Requirement 9.2)
- ✅ **Pluggable Storage**: Support for localStorage, IndexedDB, or backend API
- ✅ **Concurrent Save Protection**: Prevents duplicate saves for the same project

## Architecture

```
ProjectContext
    ↓
ProjectPersistenceService
    ↓
StorageBackend (Interface)
    ↓
├── LocalStorageBackend (Browser)
├── IndexedDBBackend (Future)
└── APIBackend (Future)
```

## Usage

### Basic Usage with Context

```typescript
import { ProjectProvider, useProject } from '../contexts/ProjectContext';
import { SaveStatusIndicator } from '../components/SaveStatusIndicator';

function MyComponent() {
  const { project, updateShot, saveStatus } = useProject();

  // Auto-save is enabled by default
  // Changes trigger auto-save after 2 seconds

  const handleUpdatePrompt = (shotId: string, prompt: string) => {
    // This will trigger auto-save after 2 seconds
    updateShot(shotId, { prompt });
  };

  return (
    <div>
      <SaveStatusIndicator />
      {/* Your UI */}
    </div>
  );
}

// Wrap with provider
<ProjectProvider projectId="my-project">
  <MyComponent />
</ProjectProvider>
```

### Manual Save

```typescript
const { saveProject, isSaving } = useProject();

const handleManualSave = async () => {
  await saveProject();
};

<button onClick={handleManualSave} disabled={isSaving}>
  {isSaving ? 'Saving...' : 'Save Now'}
</button>
```

### Direct Service Usage

```typescript
import {
  saveProject,
  loadProject,
  projectExists,
  listProjects,
} from '../services/persistence/projectPersistence';

// Save project
const result = await saveProject(myProject);
if (result.success) {
  console.log('Saved successfully');
} else {
  console.error('Save failed:', result.error);
}

// Load project
const loadResult = await loadProject('project-id');
if (loadResult.success && loadResult.project) {
  console.log('Loaded:', loadResult.project);
}

// Check if project exists
const exists = await projectExists('project-id');

// List all projects
const projects = await listProjects();
```

### Custom Storage Backend

```typescript
import { ProjectPersistenceService, StorageBackend } from '../services/persistence/projectPersistence';

class CustomBackend implements StorageBackend {
  async save(key: string, data: string): Promise<void> {
    // Your custom save logic
    await fetch('/api/projects', {
      method: 'POST',
      body: data,
    });
  }

  async load(key: string): Promise<string | null> {
    // Your custom load logic
    const response = await fetch(`/api/projects/${key}`);
    return response.text();
  }

  // Implement other methods...
}

const customService = new ProjectPersistenceService(new CustomBackend(), {
  autoSave: true,
  autoSaveDelay: 2000,
  maxRetries: 3,
  onSaveSuccess: (id) => console.log('Saved:', id),
  onSaveError: (error) => console.error('Error:', error),
});
```

## Configuration Options

```typescript
interface PersistenceOptions {
  autoSave?: boolean;           // Enable auto-save (default: true)
  autoSaveDelay?: number;        // Debounce delay in ms (default: 2000)
  maxRetries?: number;           // Max retry attempts (default: 3)
  retryDelay?: number;           // Base retry delay in ms (default: 1000)
  onSaveSuccess?: (projectId: string) => void;
  onSaveError?: (error: Error) => void;
  onLoadSuccess?: (project: Project) => void;
  onLoadError?: (error: Error) => void;
}
```

## Save Status States

The `saveStatus` field in ProjectContext can have the following values:

- `'idle'`: No save operation in progress or recently completed
- `'saving'`: Save operation in progress
- `'saved'`: Save completed successfully (shown for 2 seconds)
- `'error'`: Save failed (retry logic may be in progress)

## Error Handling

### Automatic Retry

The persistence service automatically retries failed save operations:

1. **First attempt fails**: Wait 1 second, retry
2. **Second attempt fails**: Wait 2 seconds, retry
3. **Third attempt fails**: Report error to user

### Error Types

- **Validation Errors**: Project data doesn't match Data Contract v1 schema
- **Storage Errors**: localStorage quota exceeded or unavailable
- **Network Errors**: Backend API unreachable (when using API backend)
- **Corruption Errors**: Stored data is corrupted or invalid JSON

### User Notifications

Errors are communicated through:
- `error` field in ProjectContext
- `saveStatus` set to `'error'`
- SaveStatusIndicator component shows error state
- `onSaveError` callback for custom handling

## Data Contract v1 Compliance

All saved and loaded data is validated against the Project schema:

```typescript
{
  id: string;
  name: string;
  schemaVersion: "1.0";
  sequences: Sequence[];
  shots: Shot[];
  audioPhrases: DialoguePhrase[];
  masterCoherenceSheet?: { url: string; generatedAt: number };
  generationHistory: GenerationRecord[];
  capabilities: {
    gridGeneration: boolean;
    promotionEngine: boolean;
    qaEngine: boolean;
    autofixEngine: boolean;
    voiceGeneration: boolean;
  };
}
```

## Storage Keys

Projects are stored with the key format:
```
storycore_project_{projectId}
```

Example: `storycore_project_my-project-123`

## Performance Considerations

### Auto-Save Debouncing

Auto-save uses a 2-second debounce to prevent excessive saves:
- Multiple rapid changes trigger only one save
- Timer resets on each change
- Final save occurs 2 seconds after last change

### Concurrent Save Protection

The service prevents duplicate saves for the same project:
- If a save is in progress, subsequent saves wait for completion
- Returns the same promise for concurrent save requests
- Ensures data consistency

### Memory Management

- Auto-save timers are cleaned up on component unmount
- Storage backend can be swapped without changing application code
- Minimal memory footprint with efficient serialization

## Testing

Comprehensive test suite covers:
- ✅ Save/load operations
- ✅ Data validation
- ✅ Retry logic
- ✅ Auto-save debouncing
- ✅ Error handling
- ✅ Concurrent operations
- ✅ Callbacks

Run tests:
```bash
npm test projectPersistence.test.ts
```

## Requirements Mapping

- **Requirement 9.1**: Auto-save with 2-second debouncing ✅
- **Requirement 9.2**: Save status indicator ✅
- **Requirement 9.3**: Data Contract v1 compliance ✅
- **Requirement 9.4**: Project restoration on restart ✅
- **Requirement 9.5**: Error handling with retry logic ✅

## Future Enhancements

- [ ] IndexedDB backend for larger projects
- [ ] Backend API integration for cloud storage
- [ ] Conflict resolution for concurrent edits
- [ ] Offline support with sync queue
- [ ] Compression for large projects
- [ ] Incremental saves (delta updates)
- [ ] Version history and rollback

## Examples

See the following files for complete examples:
- `src/examples/PersistenceExample.tsx` - Full interactive example
- `src/__tests__/projectPersistence.test.ts` - Test examples
- `src/contexts/ProjectContext.tsx` - Integration example

## Support

For issues or questions about the persistence system:
1. Check the test suite for usage examples
2. Review the PersistenceExample component
3. Consult the ProjectContext implementation
4. Check browser console for detailed error messages
