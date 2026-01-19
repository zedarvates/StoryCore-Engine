# Version Control System Implementation

## Overview

The Version Control System provides comprehensive version history management for the Advanced Grid Editor. It enables users to save, restore, compare, and manage different versions of their grid configurations with automatic and manual saving capabilities.

**Requirements Implemented:** 15.1, 15.2, 15.3, 15.4, 15.6, 15.7

## Architecture

### Components

```
Version Control System
├── Services
│   └── VersionControlService.ts      # Core version management logic
├── Hooks
│   └── useAutoSave.ts                # React hooks for auto-save
├── Components
│   ├── VersionHistoryPanel.tsx       # Main version history UI
│   ├── AutoSaveIndicator.tsx         # Auto-save status indicator
│   └── Integration examples          # Usage examples
└── Storage
    └── LocalStorage                  # Version persistence
```

### Data Flow

```
User Action
    ↓
Grid Configuration Change
    ↓
Auto-Save (if enabled) OR Manual Save
    ↓
VersionControlService.saveVersion()
    ↓
LocalStorage Persistence
    ↓
Version History Updated
    ↓
UI Refresh
```

## Features

### 1. Version Saving (Requirement 15.1)

**Manual Saving:**
```typescript
import { versionControlService } from '../../services/gridEditor';

// Save with metadata
const version = versionControlService.saveVersion(
  gridConfiguration,
  {
    description: 'Added new panel transforms',
    author: 'John Doe',
    thumbnail: canvasElement.toDataURL('image/png'),
  }
);
```

**Auto-Saving:**
```typescript
import { useAutoSave } from '../../hooks/useAutoSave';

const { isEnabled, toggle, lastSavedAt } = useAutoSave(
  () => exportConfiguration(),
  {
    interval: 5 * 60 * 1000, // 5 minutes
    enabled: true,
    author: 'Current User',
  }
);
```

### 2. Version Listing and Retrieval (Requirement 15.2)

**List All Versions:**
```typescript
// Get all versions with metadata
const versions = versionControlService.listVersionMetadata(projectId);

// Get full version with configuration
const version = versionControlService.getVersion(projectId, versionId);

// Get latest version
const latest = versionControlService.getLatestVersion(projectId);
```

**Version Metadata Structure:**
```typescript
interface VersionMetadata {
  id: string;
  timestamp: string; // ISO 8601
  author?: string;
  description?: string;
  thumbnail?: string; // Base64 encoded
}
```

### 3. Version Comparison (Requirement 15.3)

**Compare Two Versions:**
```typescript
const comparison = versionControlService.compareVersions(
  projectId,
  versionId1,
  versionId2
);

// Comparison result includes:
// - Version metadata for both versions
// - List of differences with details
```

**Difference Types:**
- `panel_transform` - Transform changes
- `panel_crop` - Crop region changes
- `layer_added` - New layers
- `layer_removed` - Deleted layers
- `layer_modified` - Layer property changes
- `metadata` - Configuration metadata changes

### 4. Version Restoration (Requirement 15.4)

**Restore a Version:**
```typescript
const version = versionControlService.getVersion(projectId, versionId);
if (version) {
  loadConfiguration(version.configuration);
}
```

**With Confirmation:**
```typescript
const handleRestore = (versionId: string) => {
  const confirmed = window.confirm(
    'Restore this version? Unsaved changes will be lost.'
  );
  
  if (confirmed) {
    const version = versionControlService.getVersion(projectId, versionId);
    loadConfiguration(version.configuration);
  }
};
```

### 5. Version Export/Import (Requirement 15.6)

**Export Single Version:**
```typescript
const version = versionControlService.getVersion(projectId, versionId);
const json = JSON.stringify(version.configuration, null, 2);
const blob = new Blob([json], { type: 'application/json' });
// Download blob...
```

**Export All Version History:**
```typescript
const blob = versionControlService.exportVersionHistory(projectId);
// Download blob...
```

**Import Version History:**
```typescript
const count = await versionControlService.importVersionHistory(
  projectId,
  file
);
console.log(`Imported ${count} new versions`);
```

### 6. Auto-Save (Requirement 15.7)

**Configuration:**
```typescript
const service = new VersionControlService({
  maxVersions: 50,              // Keep last 50 versions
  autoSaveInterval: 300000,     // 5 minutes
  storageKey: 'grid-versions',  // LocalStorage key prefix
});
```

**Start/Stop Auto-Save:**
```typescript
// Start
service.startAutoSave(
  () => exportConfiguration(),
  'Current User'
);

// Stop
service.stopAutoSave();
```

**React Hook Integration:**
```typescript
const {
  isEnabled,
  enable,
  disable,
  toggle,
  lastSavedAt,
  saveNow,
} = useAutoSave(
  () => exportConfiguration(),
  {
    interval: 5 * 60 * 1000,
    enabled: false,
    author: 'User',
  }
);
```

## UI Components

### VersionHistoryPanel

Full-featured version history management panel.

**Features:**
- List of all saved versions
- Version thumbnails and metadata
- Compare two versions
- Restore version
- Export version
- Delete version
- Import/export version history

**Usage:**
```tsx
<VersionHistoryPanel
  projectId="my-project"
  onRestore={(version) => {
    console.log('Restored:', version);
  }}
  onClose={() => setShowPanel(false)}
/>
```

### AutoSaveIndicator

Visual indicator for auto-save status.

**Features:**
- Enable/disable toggle
- Last saved timestamp
- Saving/saved animations
- Interval configuration
- Manual save button

**Usage:**
```tsx
<AutoSaveIndicator
  projectId="my-project"
  author="Current User"
  initialInterval={5}
  defaultEnabled={false}
  showControls={true}
  compact={false}
/>
```

**Compact Mode:**
```tsx
<AutoSaveIndicator
  projectId="my-project"
  compact={true}
/>
```

### SimpleAutoSaveToggle

Minimal auto-save toggle for toolbars.

**Usage:**
```tsx
<SimpleAutoSaveToggle
  projectId="my-project"
  author="User"
  intervalMinutes={5}
/>
```

## Storage Management

### LocalStorage Structure

```
Key: grid-editor-versions-{projectId}
Value: Array<SavedVersion>
```

**Storage Stats:**
```typescript
const stats = versionControlService.getStorageStats(projectId);
console.log(stats);
// {
//   versionCount: 25,
//   totalSize: 524288,      // bytes
//   averageSize: 20971.52   // bytes
// }
```

### Storage Limits

- **Max Versions:** Configurable (default: 50)
- **Quota Handling:** Automatic trimming when quota exceeded
- **Cleanup:** Oldest versions removed first

## Integration Examples

### Example 1: Basic Integration

```tsx
import { VersionHistoryPanel } from './VersionHistoryPanel';
import { AutoSaveIndicator } from './AutoSaveIndicator';

function GridEditor() {
  const [showHistory, setShowHistory] = useState(false);
  
  return (
    <div>
      <div className="toolbar">
        <AutoSaveIndicator
          projectId="my-project"
          defaultEnabled={true}
          compact={true}
        />
        <button onClick={() => setShowHistory(true)}>
          History
        </button>
      </div>
      
      {showHistory && (
        <VersionHistoryPanel
          projectId="my-project"
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
```

### Example 2: Auto-Save with Custom Interval

```tsx
import { useAutoSave } from '../../hooks/useAutoSave';

function GridEditorWithAutoSave() {
  const { exportConfiguration } = useGridStore();
  
  const { isEnabled, toggle, lastSavedAt } = useAutoSave(
    () => exportConfiguration(),
    {
      interval: 10 * 60 * 1000, // 10 minutes
      enabled: true,
      author: 'Current User',
      onAutoSave: (timestamp) => {
        console.log('Auto-saved at:', timestamp);
      },
    }
  );
  
  return (
    <div>
      <label>
        <input type="checkbox" checked={isEnabled} onChange={toggle} />
        Auto-Save (10 min)
      </label>
      {lastSavedAt && <span>Last saved: {lastSavedAt}</span>}
    </div>
  );
}
```

### Example 3: Version Comparison

```tsx
function VersionComparisonView() {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  
  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      const result = versionControlService.compareVersions(
        projectId,
        selectedVersions[0],
        selectedVersions[1]
      );
      setComparison(result);
    }
  };
  
  return (
    <div>
      {/* Version selection UI */}
      <button onClick={handleCompare}>Compare</button>
      
      {comparison && (
        <div>
          <h3>Differences: {comparison.differences.length}</h3>
          {comparison.differences.map((diff, i) => (
            <div key={i}>
              <strong>{diff.type}</strong>: {diff.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Example 4: Manual Save with Thumbnail

```tsx
function SaveVersionButton() {
  const { exportConfiguration } = useGridStore();
  
  const handleSave = () => {
    const description = prompt('Version description:');
    if (!description) return;
    
    // Generate thumbnail from canvas
    const canvas = document.querySelector('canvas');
    const thumbnail = canvas?.toDataURL('image/png');
    
    versionControlService.saveVersion(
      exportConfiguration(),
      { description, thumbnail, author: 'User' }
    );
    
    alert('Version saved!');
  };
  
  return <button onClick={handleSave}>Save Version</button>;
}
```

## Best Practices

### 1. Version Naming

- Use descriptive names for manual saves
- Include context about changes made
- Auto-saves use timestamp-based descriptions

### 2. Storage Management

- Monitor storage usage with `getStorageStats()`
- Set appropriate `maxVersions` limit
- Export important versions for backup

### 3. Auto-Save Configuration

- Choose interval based on work frequency
- Longer intervals for stable work
- Shorter intervals for experimental work
- Disable during intensive operations

### 4. Version Restoration

- Always confirm before restoring
- Save current state before restoring
- Review version comparison before restoring

### 5. Performance

- Thumbnails increase storage size
- Use thumbnails selectively
- Clean up old versions periodically
- Export and archive old versions

## Testing

### Unit Tests

```typescript
describe('VersionControlService', () => {
  it('should save version with metadata', () => {
    const version = service.saveVersion(config, {
      description: 'Test version',
      author: 'Test User',
    });
    
    expect(version.metadata.description).toBe('Test version');
    expect(version.metadata.author).toBe('Test User');
  });
  
  it('should list versions in chronological order', () => {
    service.saveVersion(config1, { description: 'First' });
    service.saveVersion(config2, { description: 'Second' });
    
    const versions = service.listVersions(projectId);
    expect(versions[0].metadata.description).toBe('Second');
    expect(versions[1].metadata.description).toBe('First');
  });
  
  it('should compare versions and find differences', () => {
    const v1 = service.saveVersion(config1);
    const v2 = service.saveVersion(config2);
    
    const comparison = service.compareVersions(
      projectId,
      v1.metadata.id,
      v2.metadata.id
    );
    
    expect(comparison?.differences.length).toBeGreaterThan(0);
  });
});
```

### Integration Tests

```typescript
describe('Version Control Integration', () => {
  it('should auto-save at specified interval', async () => {
    const service = new VersionControlService({
      autoSaveInterval: 1000, // 1 second for testing
    });
    
    service.startAutoSave(() => config, 'Test User');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const versions = service.listVersions(projectId);
    expect(versions.length).toBeGreaterThan(0);
    
    service.stopAutoSave();
  });
});
```

## Troubleshooting

### Issue: Versions not saving

**Possible causes:**
- LocalStorage quota exceeded
- Invalid configuration format
- Browser privacy mode

**Solutions:**
- Check storage stats
- Reduce maxVersions limit
- Export and clear old versions

### Issue: Auto-save not working

**Possible causes:**
- Auto-save disabled
- Invalid interval
- Configuration not changing

**Solutions:**
- Verify `isEnabled` state
- Check interval > 0
- Ensure configuration updates

### Issue: Version restoration fails

**Possible causes:**
- Version not found
- Invalid configuration
- Storage corruption

**Solutions:**
- Verify version exists
- Check version format
- Clear and reimport versions

## Future Enhancements

1. **Cloud Storage Integration**
   - Sync versions across devices
   - Team collaboration
   - Unlimited storage

2. **Advanced Comparison**
   - Visual diff viewer
   - Side-by-side comparison
   - Merge capabilities

3. **Version Branching**
   - Create branches from versions
   - Merge branches
   - Branch management UI

4. **Compression**
   - Compress version data
   - Reduce storage usage
   - Faster load times

5. **Conflict Resolution**
   - Detect conflicts
   - Merge strategies
   - Manual resolution UI

## API Reference

See the following files for complete API documentation:
- `VersionControlService.ts` - Core service API
- `useAutoSave.ts` - React hooks API
- `VersionHistoryPanel.tsx` - Component props
- `AutoSaveIndicator.tsx` - Component props

## Summary

The Version Control System provides a complete solution for managing grid configuration versions with:

✅ Manual and automatic version saving  
✅ Version history with metadata  
✅ Version comparison and diff  
✅ Version restoration  
✅ Import/export capabilities  
✅ Auto-save with configurable intervals  
✅ LocalStorage persistence  
✅ React hooks for easy integration  
✅ Comprehensive UI components  

All requirements (15.1-15.7) have been successfully implemented.
