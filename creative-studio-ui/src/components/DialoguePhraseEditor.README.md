# DialoguePhraseEditor Component

## Overview

The `DialoguePhraseEditor` component provides a comprehensive interface for editing individual dialogue phrase properties, including text content, timestamps, shot linking, and metadata. It implements Requirements 4.2, 4.3, and 4.4 from the ProjectDashboardNew specification.

## Features

- **Text Input**: Edit dialogue phrase content with validation
- **Timestamp Controls**: Precise start/end time inputs with validation
- **Shot Linking**: Dropdown selector to link phrases to specific shots
- **Metadata Fields**: Optional character and emotion metadata
- **Delete Confirmation**: Modal dialog to confirm phrase deletion
- **Real-time Validation**: Immediate feedback on invalid inputs
- **Duration Display**: Automatic calculation and display of phrase duration

## Props

```typescript
interface DialoguePhraseEditorProps {
  phrase: DialoguePhrase;           // The dialogue phrase to edit
  shots: Shot[];                     // Available shots for linking
  onUpdate: (updates: Partial<DialoguePhrase>) => void;  // Update callback
  onDelete: () => void;              // Delete callback
  className?: string;                // Optional CSS class
}
```

## Usage

### Basic Usage

```tsx
import { DialoguePhraseEditor } from './components/DialoguePhraseEditor';
import { useProject } from './contexts/ProjectContext';

function MyComponent() {
  const { project, updateDialoguePhrase, deleteDialoguePhrase } = useProject();
  const phrase = project?.audioPhrases[0];

  if (!phrase) return null;

  return (
    <DialoguePhraseEditor
      phrase={phrase}
      shots={project?.shots || []}
      onUpdate={(updates) => updateDialoguePhrase(phrase.id, updates)}
      onDelete={() => deleteDialoguePhrase(phrase.id)}
    />
  );
}
```

### Integration with AudioTrackManager

```tsx
import { DialoguePhraseEditor } from './components/DialoguePhraseEditor';
import { useProject } from './contexts/ProjectContext';

function AudioTrackManager() {
  const { project, updateDialoguePhrase, deleteDialoguePhrase } = useProject();
  const [selectedPhraseId, setSelectedPhraseId] = useState<string | null>(null);

  const selectedPhrase = project?.audioPhrases.find(
    phrase => phrase.id === selectedPhraseId
  );

  return (
    <div>
      {/* Phrase selection UI */}
      {selectedPhrase && (
        <DialoguePhraseEditor
          phrase={selectedPhrase}
          shots={project?.shots || []}
          onUpdate={(updates) => updateDialoguePhrase(selectedPhrase.id, updates)}
          onDelete={() => {
            deleteDialoguePhrase(selectedPhrase.id);
            setSelectedPhraseId(null);
          }}
        />
      )}
    </div>
  );
}
```

## Validation Rules

### Text Validation
- **Required**: Text cannot be empty
- **Trimming**: Whitespace-only text is invalid
- **Feedback**: Real-time error message displayed below input

### Timestamp Validation
- **Start Time**: Must be >= 0
- **End Time**: Must be > start time
- **Minimum Duration**: Enforced by validation (0.1 seconds)
- **Feedback**: Error messages displayed for invalid values

### Shot Linking
- **Optional**: Phrase can exist without a linked shot
- **Validation**: Only existing shots can be selected
- **Display**: Shows shot time range when linked

## Component Structure

```
DialoguePhraseEditor
├── Header
│   ├── Title
│   └── Delete Button
├── Phrase Text Input
│   └── Validation Error (if invalid)
├── Timestamp Controls
│   ├── Start Time Input
│   │   └── Validation Error (if invalid)
│   └── End Time Input
│       └── Validation Error (if invalid)
├── Duration Display
├── Shot Linking Dropdown
│   └── Shot Info Display (if linked)
├── Metadata Fields
│   ├── Character Input (optional)
│   └── Emotion Input (optional)
└── Delete Confirmation Dialog
    ├── Phrase Details
    └── Confirm/Cancel Buttons
```

## Styling

The component uses inline styles for consistency and includes:
- Dark theme color scheme (#1a1a1a background)
- Responsive layout with flexbox
- Clear visual hierarchy
- Accessible color contrast
- Error state styling (#ff4444 for errors)

## Accessibility

- **ARIA Labels**: All inputs have proper labels
- **ARIA Invalid**: Invalid inputs marked with `aria-invalid`
- **ARIA Described By**: Error messages linked to inputs
- **Keyboard Navigation**: Full keyboard support
- **Focus Management**: Proper focus handling in dialog

## Requirements Mapping

- **Requirement 4.2**: Text input for phrase content ✓
- **Requirement 4.3**: Timestamp controls (start/end time inputs) ✓
- **Requirement 4.4**: Shot linking dropdown ✓
- **Requirement 4.4**: Delete button with confirmation ✓

## State Management

The component uses local state for:
- Text input value (controlled input)
- Timestamp input values (controlled inputs)
- Delete confirmation dialog visibility

Updates are propagated to parent via `onUpdate` callback, allowing the parent component (typically using ProjectContext) to manage the source of truth.

## Error Handling

- **Invalid Text**: Displays error message, prevents empty text
- **Invalid Start Time**: Displays error message, prevents negative values
- **Invalid End Time**: Displays error message, prevents values <= start time
- **Missing Shot**: Handles case where linked shot no longer exists
- **Empty Shot List**: Displays appropriate message in dropdown

## Performance Considerations

- **Controlled Inputs**: Uses local state to prevent excessive re-renders
- **Callback Memoization**: Uses `useCallback` for event handlers
- **Validation on Change**: Real-time validation without debouncing
- **Minimal Re-renders**: Only updates when necessary

## Future Enhancements

Potential improvements for future iterations:
- Voice parameter controls integration
- Audio waveform preview
- Keyboard shortcuts for common actions
- Undo/redo support
- Batch editing capabilities
- Copy/paste phrase functionality

## Testing

See `DialoguePhraseEditor.test.tsx` for comprehensive unit tests covering:
- Rendering with valid/invalid data
- Text editing and validation
- Timestamp editing and validation
- Shot linking functionality
- Delete confirmation workflow
- Metadata editing
- Accessibility compliance

## Related Components

- **AudioTimeline**: Visual timeline showing dialogue phrases
- **AudioTrackManager**: Container component managing phrase workflow
- **VoiceGenerationPanel**: Voice generation controls for phrases
- **ProjectContext**: State management for dialogue phrases

## Dependencies

- React 18+
- UI Components: Button, Input, Label, Select, Dialog
- Types: DialoguePhrase, Shot from projectDashboard types
- Context: ProjectContext for state management
