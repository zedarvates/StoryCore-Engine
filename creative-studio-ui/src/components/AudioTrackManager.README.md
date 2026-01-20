# AudioTrackManager Component

## Overview

The `AudioTrackManager` is a container component that provides a complete workflow for managing audio tracks in the ProjectDashboardNew. It integrates three specialized components to enable phrase creation, editing, timeline synchronization, and voice generation.

**Requirements:** 4.1, 4.2, 4.3, 5.1

## Architecture

### Component Integration

```
AudioTrackManager (Container)
├── AudioTimeline (Visual timeline with drag-and-drop)
├── DialoguePhraseEditor (Phrase property editing)
└── VoiceGenerationPanel (Voice synthesis controls)
```

### Data Flow

1. **Timeline Interaction** → Updates phrase timing via ProjectContext
2. **Phrase Selection** → Loads phrase into editor and voice panel
3. **Editor Changes** → Updates phrase properties in ProjectContext
4. **Voice Generation** → Generates audio and updates phrase with audio URL

## Features

### Timeline Management
- **Visual Timeline**: Displays shots and dialogue phrases on a zoomable canvas
- **Drag-and-Drop**: Move and resize phrases directly on the timeline
- **Snap-to-Grid**: Automatic alignment to 5-second intervals
- **Overlap Prevention**: Validates moves to prevent phrase overlaps
- **Current Time Indicator**: Red playhead shows current position

### Phrase Management
- **Add Phrases**: Create new dialogue phrases at the current time
- **Edit Phrases**: Modify text, timing, and metadata
- **Delete Phrases**: Remove phrases with confirmation
- **Shot Linking**: Associate phrases with specific shots
- **Phrase List**: Scrollable list of all phrases with selection

### Voice Generation
- **Voice Parameters**: Configure voice type, speed, pitch, and language
- **Preview**: Generate and preview audio before committing
- **Generate**: Create final audio for the phrase
- **Progress Tracking**: Visual feedback during generation

## Props

```typescript
interface AudioTrackManagerProps {
  className?: string;
}
```

The component uses the `useProject` hook to access project state and management functions.

## Usage

```tsx
import { AudioTrackManager } from './components/AudioTrackManager';
import { ProjectProvider } from './contexts/ProjectContext';

function App() {
  return (
    <ProjectProvider projectId="my-project">
      <AudioTrackManager />
    </ProjectProvider>
  );
}
```

## Layout

### Two-Panel Layout

**Left Panel (60%)**:
- Timeline section with zoom controls
- Phrase list with selection

**Right Panel (40%)**:
- Phrase editor (when phrase selected)
- Voice generation panel (when phrase selected)

### Responsive Behavior

The component uses flexbox for responsive layout:
- Panels adjust proportionally
- Scrollable sections prevent overflow
- Fixed header with actions

## State Management

### Local State

```typescript
const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);
const [currentTime, setCurrentTime] = useState(0);
const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
```

### Context Integration

Uses `useProject` hook for:
- `project`: Current project data
- `addDialoguePhrase`: Create new phrases
- `updateDialoguePhrase`: Modify existing phrases
- `deleteDialoguePhrase`: Remove phrases

## Event Handlers

### Timeline Events

**handlePhraseMove(phraseId, newStartTime)**
- Updates phrase start and end times while maintaining duration
- Triggered by dragging phrases on timeline

**handlePhraseResize(phraseId, newDuration)**
- Updates phrase end time based on new duration
- Triggered by dragging phrase resize handles

**handleTimelineClick(time)**
- Updates current time indicator
- Used for positioning new phrases

### Editor Events

**handlePhraseUpdate(updates)**
- Updates selected phrase properties
- Triggered by editor input changes

**handlePhraseDelete()**
- Removes selected phrase after confirmation
- Clears selection after deletion

### Voice Generation Events

**handleVoiceGenerate(voiceParams)**
- Generates audio for selected phrase
- Updates phrase with voice parameters and audio URL
- Shows loading state during generation

**handleVoicePreview(audioUrl)**
- Previews generated audio
- Handled internally by VoiceGenerationPanel

### Phrase Creation

**handleAddPhrase()**
- Creates new phrase at current time
- Finds shot at current time for linking
- Sets default 3-second duration
- Validates time is within a shot

## Workflow Examples

### Creating a New Phrase

1. Click on timeline to set current time
2. Click "Add Phrase" button
3. New phrase appears at current time (3s duration)
4. Phrase is automatically selected
5. Edit text and properties in editor
6. Generate voice if needed

### Editing an Existing Phrase

1. Click phrase in list or timeline
2. Phrase loads in editor and voice panel
3. Modify text, timing, or metadata
4. Changes auto-save via ProjectContext
5. Adjust timing by dragging on timeline

### Generating Voice

1. Select phrase
2. Configure voice parameters (type, speed, pitch)
3. Click "Preview" to test
4. Click "Generate" to create final audio
5. Audio indicator (🔊) appears on phrase

## Styling

The component uses inline styles for:
- Dark theme consistency (#0a0a0a background)
- Two-panel layout with 60/40 split
- Responsive flexbox containers
- Hover and selection states
- Empty state messaging

### Key Style Features

- **Header**: Fixed height with actions
- **Panels**: Flexible with overflow handling
- **Phrase Items**: Hover effects and selection highlighting
- **Empty States**: Centered with helpful hints
- **Time Display**: Monospace font for readability

## Accessibility

- **ARIA Labels**: All buttons have descriptive labels
- **Keyboard Navigation**: Tab through interactive elements
- **Focus Management**: Clear focus indicators
- **Screen Reader Support**: Semantic HTML structure

## Integration Points

### ProjectContext

Required context methods:
- `addDialoguePhrase(phrase)`
- `updateDialoguePhrase(phraseId, updates)`
- `deleteDialoguePhrase(phraseId)`

### Child Components

**AudioTimeline**:
- Receives shots and phrases
- Emits move/resize/click events

**DialoguePhraseEditor**:
- Receives selected phrase and shots
- Emits update/delete events

**VoiceGenerationPanel**:
- Receives selected phrase
- Emits generate/preview events

## Error Handling

### No Project Loaded
Shows empty state with message

### No Shots Available
Disables "Add Phrase" button with tooltip

### No Phrase Selected
Shows empty state in right panel

### Voice Generation Failure
Displays error in VoiceGenerationPanel

## Future Enhancements

1. **Undo/Redo**: Track phrase changes for undo
2. **Bulk Operations**: Select multiple phrases
3. **Audio Waveforms**: Display waveforms on timeline
4. **Keyboard Shortcuts**: Quick actions for power users
5. **Export Audio**: Export combined audio track
6. **Import Audio**: Upload existing audio files
7. **Timeline Markers**: Add custom markers for reference

## Testing Considerations

### Unit Tests
- Phrase creation at current time
- Phrase selection and deselection
- Timeline event handling
- Voice generation workflow

### Integration Tests
- Complete phrase creation workflow
- Edit and delete workflow
- Voice generation end-to-end
- Timeline synchronization

### Edge Cases
- Empty project (no shots)
- No phrases created yet
- Phrase at timeline boundaries
- Overlapping phrase prevention

## Performance Notes

- **Memoization**: Uses `useMemo` for computed values
- **Callback Optimization**: Uses `useCallback` for event handlers
- **Efficient Rendering**: Only re-renders on relevant state changes
- **Lazy Loading**: Voice generation on demand

## Dependencies

- React 18+
- ProjectContext (custom)
- AudioTimeline component
- DialoguePhraseEditor component
- VoiceGenerationPanel component
- UI components (Button)
- Type definitions (projectDashboard.ts)

## Related Documentation

- [AudioTimeline.README.md](./AudioTimeline.README.md)
- [DialoguePhraseEditor.README.md](./DialoguePhraseEditor.README.md)
- [VoiceGenerationPanel.README.md](./VoiceGenerationPanel.README.md)
- [ProjectContext Documentation](../contexts/ProjectContext.tsx)
