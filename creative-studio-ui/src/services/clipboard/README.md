# Clipboard System

The clipboard system provides copy/paste functionality for shots in the timeline editor.

## Features

- **Copy/Cut/Paste Operations**: Full clipboard support with keyboard shortcuts
- **Unique ID Generation**: Automatically generates unique IDs for pasted shots
- **Metadata Preservation**: Preserves all shot metadata except IDs and timestamps
- **Cross-Sequence Support**: Paste shots between different sequences
- **Visual Indicator**: Shows clipboard status with count and operation type
- **Keyboard Shortcuts**: Ctrl+C (copy), Ctrl+X (cut), Ctrl+V (paste)

## Requirements Implemented

- **13.1**: Keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X)
- **13.2**: Internal clipboard management
- **13.3**: Unique ID generation for pasted shots
- **13.4**: Metadata preservation (excluding ID and timestamps)
- **13.5**: Cut operation support
- **13.6**: Cross-sequence compatibility
- **13.7**: Visual clipboard indicator
- **13.8**: Compatibility validation

## Usage

### Basic Usage

```typescript
import { useClipboard, useClipboardEvents } from '../hooks/useClipboard';
import { ClipboardIndicator } from '../components/clipboard/ClipboardIndicator';

function MyComponent() {
  const { copy, cut, paste, hasContent, count } = useClipboard();
  
  // Handle keyboard events
  useClipboardEvents(
    () => handleCopy(),
    () => handleCut(),
    () => handlePaste()
  );
  
  const handleCopy = () => {
    copy(selectedShots, 'sequence-1');
  };
  
  const handlePaste = () => {
    const result = paste({
      targetSequenceId: 'sequence-2',
      position: 10,
    });
    
    if (result.success) {
      // Add pasted shots to timeline
      addShots(result.pastedShots);
    }
  };
  
  return (
    <>
      {/* Your UI */}
      <ClipboardIndicator position="bottom-right" />
    </>
  );
}
```

### Direct API Usage

```typescript
import { clipboardManager } from '../services/clipboard/ClipboardManager';

// Copy shots
clipboardManager.copy(shots, 'sequence-1');

// Cut shots
clipboardManager.cut(shots, 'sequence-1');

// Paste shots
const result = clipboardManager.paste({
  targetSequenceId: 'sequence-2',
  position: 5,
  validateCompatibility: true,
});

// Check clipboard status
const hasContent = clipboardManager.hasContent();
const count = clipboardManager.getCount();
const operation = clipboardManager.getOperation(); // 'copy' | 'cut' | null

// Subscribe to changes
const unsubscribe = clipboardManager.subscribe((data) => {
  console.log('Clipboard changed:', data);
});
```

## Architecture

### ClipboardManager

Singleton service that manages the internal clipboard:

- Stores copied/cut shots
- Handles keyboard shortcuts
- Generates unique IDs for pasted shots
- Validates cross-sequence compatibility
- Notifies subscribers of changes

### useClipboard Hook

React hook that provides clipboard functionality:

- Reactive state updates
- Easy-to-use API
- Automatic cleanup

### useClipboardEvents Hook

React hook for handling keyboard events:

- Listens for Ctrl+C, Ctrl+X, Ctrl+V
- Calls provided callbacks
- Ignores events in input fields

### ClipboardIndicator Component

Visual indicator that shows clipboard status:

- Displays when clipboard has content
- Shows operation type (copy/cut)
- Shows shot count
- Animated appearance/disappearance

## ID Generation

Pasted shots receive new unique IDs:

```typescript
// Original shot
{
  id: 'shot-1',
  title: 'Scene 1',
  audioTracks: [{ id: 'audio-1', ... }],
  effects: [{ id: 'effect-1', ... }]
}

// Pasted shot (all IDs are regenerated)
{
  id: 'lx8k9p2-a4b5c6d',  // New unique ID
  title: 'Scene 1',
  audioTracks: [{ id: 'lx8k9p3-e7f8g9h', ... }],  // New ID
  effects: [{ id: 'lx8k9p4-i1j2k3l', ... }]  // New ID
}
```

## Metadata Preservation

All metadata is preserved except:

- `id`: New unique ID generated
- Timestamps in nested objects (audio tracks, effects, etc.)

Preserved metadata includes:

- `title`, `description`, `duration`
- `audioTracks` (with new IDs)
- `effects` (with new IDs)
- `textLayers` (with new IDs)
- `animations` (with new IDs)
- `transitionOut` (with new ID)
- Custom metadata fields

## Cross-Sequence Compatibility

The system validates compatibility when pasting between sequences:

```typescript
const result = paste({
  targetSequenceId: 'sequence-2',
  validateCompatibility: true,  // Enable validation
});

if (!result.success) {
  console.error('Paste failed:', result.errors);
}
```

Validation checks:

- Shot duration compatibility
- Effect support
- Audio format compatibility
- Custom validation rules

## Testing

See `CopyPasteExample.tsx` for a complete working example.

## Future Enhancements

- System clipboard integration (copy/paste between applications)
- Clipboard history (multiple clipboard slots)
- Paste with transformations (scale, adjust timing, etc.)
- Clipboard preview (show thumbnails of copied shots)
- Undo/redo integration
