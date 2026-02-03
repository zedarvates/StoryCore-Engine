# Sequence Editor Interface

Professional-grade sequence editing interface for StoryCore-Engine, built with React 18+, TypeScript, and Redux Toolkit.

## Architecture Overview

The Sequence Editor follows a modular component architecture with centralized state management:

### Technology Stack

- **React 18+**: Modern React with concurrent rendering features
- **TypeScript**: Type-safe development with comprehensive interfaces
- **Redux Toolkit**: Simplified state management with slices
- **react-dnd**: Drag-and-drop functionality for assets and timeline elements
- **react-window**: Virtual scrolling for efficient timeline rendering
- **CSS Grid**: Responsive layout system with four primary panels

### Project Structure

```
sequence-editor/
├── store/
│   ├── index.ts                 # Redux store configuration
│   └── slices/
│       ├── projectSlice.ts      # Project metadata and settings
│       ├── timelineSlice.ts     # Timeline, shots, and tracks
│       ├── assetsSlice.ts       # Asset library management
│       ├── panelsSlice.ts       # Panel layout and focus
│       ├── toolsSlice.ts        # Editing tools state
│       ├── previewSlice.ts      # Preview frame and playback
│       └── historySlice.ts      # Undo/redo functionality
├── types/
│   └── index.ts                 # TypeScript type definitions
├── styles/
│   ├── variables.css            # CSS variables and theming
│   └── layout.css               # Grid layout system
├── SequenceEditor.tsx           # Main component
└── README.md                    # This file
```

## State Management

The Redux store is organized into seven slices:

### 1. Project Slice
- Project metadata (name, path, author, description)
- Project settings (resolution, format, FPS, quality)
- Save status tracking
- Generation status tracking

### 2. Timeline Slice
- Shot management (add, update, delete, reorder)
- Track management (6 track types: media, audio, effects, transitions, text, keyframes)
- Playhead position
- Zoom level
- Element selection

### 3. Assets Slice
- Asset library with 7 categories
- Search functionality
- Asset CRUD operations

### 4. Panels Slice
- Panel layout configuration (resizable panels)
- Active panel tracking
- Shot configuration target

### 5. Tools Slice
- Active tool selection (select, trim, split, transition, text, keyframe)
- Tool-specific settings

### 6. Preview Slice
- Current frame rendering
- Playback state (playing, paused, stopped)
- Playback speed control

### 7. History Slice
- Undo/redo stack management
- State snapshots (50 levels)
- History navigation

## Layout System

The interface uses CSS Grid with four primary panels:

```
┌─────────────────────────────────────────────────────────┐
│                      Toolbar                            │
├──────────┬──────────────────────┬──────────────────────┤
│  Asset   │                      │   Shot               │
│  Library │    Preview Frame     │   Configuration      │
│  (20%)   │       (50%)          │   (30%)              │
│          │                      │                      │
├──────────┴──────────────────────┴──────────────────────┤
│                    Timeline (40%)                       │
└─────────────────────────────────────────────────────────┘
```

### Responsive Breakpoints

- **Large screens (1920px+)**: Default layout
- **Medium screens (1280px-1919px)**: Adjusted proportions
- **Small screens (1024px-1279px)**: Compact layout
- **Tablet (768px-1023px)**: Stacked vertical layout
- **Mobile (<768px)**: Minimal layout

### Panel Constraints

- Asset Library: min-width 200px
- Preview Frame: min-width 640px, min-height 360px
- Shot Configuration: min-width 200px
- Timeline: min-height 150px

## Usage

### Basic Setup

```tsx
import { SequenceEditor } from './sequence-editor/SequenceEditor';

function App() {
  return <SequenceEditor />;
}
```

### Using Redux Hooks

```tsx
import { useAppDispatch, useAppSelector } from './sequence-editor/store';
import { addShot, selectElement } from './sequence-editor/store/slices/timelineSlice';

function MyComponent() {
  const dispatch = useAppDispatch();
  const shots = useAppSelector((state) => state.timeline.shots);
  
  const handleAddShot = () => {
    dispatch(addShot({
      id: 'shot-1',
      name: 'Opening Shot',
      startTime: 0,
      duration: 150,
      layers: [],
      referenceImages: [],
      prompt: '',
      parameters: {
        seed: 42,
        denoising: 0.7,
        steps: 20,
        guidance: 7.5,
        sampler: 'euler',
        scheduler: 'normal',
      },
      generationStatus: 'pending',
    }));
  };
  
  return (
    <button onClick={handleAddShot}>Add Shot</button>
  );
}
```

## Development Guidelines

### Adding New Features

1. Define types in `types/index.ts`
2. Create or update Redux slice in `store/slices/`
3. Implement UI components
4. Add styles to appropriate CSS files
5. Update this README with new functionality

### State Updates

Always use Redux actions for state updates:

```tsx
// ✅ Correct
dispatch(updateShot({ id: 'shot-1', updates: { duration: 200 } }));

// ❌ Incorrect
shots[0].duration = 200; // Direct mutation
```

### Performance Considerations

- Use `React.memo` for expensive components
- Implement virtual scrolling for large lists (react-window)
- Debounce frequent updates (search, auto-save)
- Use `useMemo` and `useCallback` appropriately

## Requirements Mapping

This implementation satisfies the following requirements:

- **Requirement 19.6**: Redux Toolkit for state management
- **Requirement 20.1**: React 18+ with TypeScript
- **Requirement 4.1-4.7**: Resizable panel system with CSS Grid
- **Requirement 1.1-1.8**: Multi-track timeline foundation
- **Requirement 5.1-5.8**: Asset library structure
- **Requirement 18.1-18.7**: Undo/redo system

## Next Steps

The following tasks will build upon this infrastructure:

- **Task 2**: Implement auto-save and undo/redo middleware
- **Task 3**: Build resizable panel system with drag handles
- **Task 4**: Implement timeline component with virtual scrolling
- **Task 5**: Build asset library with categorization
- **Task 6**: Implement drag-and-drop interactions
- **Task 7**: Build preview frame with playback controls
- **Task 8**: Implement shot configuration panel
- **Task 9**: Build contextual tool bar

## Testing

Run tests with:

```bash
npm test
```

## License

Part of StoryCore-Engine project.
