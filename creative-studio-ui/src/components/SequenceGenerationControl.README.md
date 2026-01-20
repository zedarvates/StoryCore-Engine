# SequenceGenerationControl Component

## Overview

The `SequenceGenerationControl` component provides a control interface for triggering sequence generation through the StoryCore pipeline. It displays a "Generate Sequence" button that is enabled only when all shots have valid prompts, and shows a progress modal during generation.

## Requirements

This component implements the following requirements:
- **2.3**: Verify all shots have valid prompts before generation
- **2.4**: Prevent generation and highlight incomplete shots
- **3.1**: Display "Generate Sequence" button enabled only when all shots have valid prompts
- **3.2**: Trigger generation pipeline and display progress modal

## Features

### Core Functionality

1. **Smart Button State**
   - Button enabled only when all shots have valid prompts (10-500 characters, non-empty)
   - Disabled during generation
   - Disabled when project has no shots
   - Clear visual feedback for button state

2. **Prompt Validation Display**
   - Shows completion status (X / Y Complete)
   - Displays count of incomplete prompts
   - Lists validation errors for invalid shots
   - Success message when all prompts are valid

3. **Pipeline Information**
   - Shows all pipeline stages that will be executed
   - Visual icons for each stage
   - Clear description of what each stage does

4. **Generation Progress Modal**
   - Automatically opens when generation starts
   - Shows detailed progress through pipeline stages
   - Displays timing information
   - Provides cancel and retry functionality

## Usage

### Basic Usage

```tsx
import { SequenceGenerationControl } from './components/SequenceGenerationControl';
import { ProjectProvider } from './contexts/ProjectContext';

function App() {
  return (
    <ProjectProvider projectId="my-project">
      <SequenceGenerationControl />
    </ProjectProvider>
  );
}
```

### With Callbacks

```tsx
import { SequenceGenerationControl } from './components/SequenceGenerationControl';
import { ProjectProvider } from './contexts/ProjectContext';
import type { GenerationResults } from './types/projectDashboard';

function App() {
  const handleGenerationComplete = (results: GenerationResults) => {
    console.log('Generation completed:', results);
    // Navigate to results page, show success message, etc.
  };

  const handleGenerationCancel = () => {
    console.log('Generation cancelled');
    // Show cancellation message, cleanup, etc.
  };

  return (
    <ProjectProvider projectId="my-project">
      <SequenceGenerationControl
        onGenerationComplete={handleGenerationComplete}
        onGenerationCancel={handleGenerationCancel}
      />
    </ProjectProvider>
  );
}
```

### With Custom Styling

```tsx
<SequenceGenerationControl
  className="max-w-2xl mx-auto"
  onGenerationComplete={handleComplete}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `className` | `string` | No | `''` | Optional CSS class name for styling |
| `onGenerationComplete` | `(results: GenerationResults) => void` | No | - | Callback when generation completes successfully |
| `onGenerationCancel` | `() => void` | No | - | Callback when generation is cancelled |

## Component Structure

```
SequenceGenerationControl
├── Card Container
│   ├── Header (Title + Description)
│   └── Content
│       ├── Prompt Status Display
│       │   ├── Completion Badge (X / Y Complete)
│       │   └── Incomplete Badge (if any)
│       ├── Validation Errors Alert (if invalid)
│       ├── Success Alert (if all valid)
│       ├── Empty Project Alert (if no shots)
│       ├── Pipeline Information
│       │   └── Stage List with Icons
│       ├── Generate Button
│       └── Generation Info Text
└── GenerationProgressModal (shown during generation)
```

## Button States

### Enabled State
- All shots have valid prompts (10-500 characters, non-empty)
- Not currently generating
- Project has at least one shot
- Button text: "Generate Sequence"
- Button icon: Sparkles icon

### Disabled States

1. **Invalid Prompts**
   - Button text: "Fix Prompts to Generate"
   - Button icon: Sparkles icon
   - Validation errors displayed below

2. **Generating**
   - Button text: "Generating..."
   - Button icon: Spinning loader
   - Progress modal shown

3. **No Shots**
   - Button text: "Generate Sequence"
   - Alert shown: "No shots in project"

## Validation Display

### Prompt Status
Shows completion status with badges:
- **Complete Badge**: Green checkmark + count of valid prompts
- **Incomplete Badge**: Red alert + count of invalid prompts

### Validation Errors
When prompts are invalid, displays:
- Alert with destructive variant (red)
- Count of invalid shots
- List of first 3 invalid shots with error messages
- "...and X more" if more than 3 invalid shots

### Success Message
When all prompts are valid:
- Alert with default variant (blue/green)
- Checkmark icon
- "All prompts are valid. Ready to generate sequence!"

## Pipeline Stages

The component displays information about all pipeline stages:

1. **Master Coherence Sheet** (🎨)
   - Generates 3x3 grid for visual consistency

2. **ComfyUI Image Generation** (⚡)
   - Generates images using AI backend

3. **Promotion Engine Processing** (🚀)
   - Processes and enhances generated images

4. **QA Analysis & Autofix** (🔍)
   - Analyzes quality and applies fixes

5. **Export Package Creation** (📦)
   - Creates final export package

## Integration with ProjectContext

The component uses the following context functions:

- `validateAllShots()`: Check if all shots have valid prompts
- `getPromptCompletionStatus()`: Get counts of complete/incomplete prompts
- `generateSequence()`: Trigger the generation pipeline
- `cancelGeneration()`: Cancel ongoing generation
- `generationStatus`: Current generation status
- `isGenerating`: Whether generation is in progress

## Generation Flow

1. User clicks "Generate Sequence" button
2. Component validates all shots have valid prompts
3. If valid, calls `generateSequence()` from context
4. Progress modal opens automatically
5. Modal shows stage-by-stage progress
6. On completion:
   - Modal shows success message
   - `onGenerationComplete` callback fired
   - User can view results or close modal
7. On error:
   - Modal shows error message
   - User can retry or close modal
8. On cancel:
   - Generation stops
   - `onGenerationCancel` callback fired
   - Modal closes

## Error Handling

The component handles several error scenarios:

1. **Invalid Prompts**
   - Button disabled
   - Validation errors displayed
   - Clear guidance on what needs fixing

2. **Generation Errors**
   - Caught in try-catch block
   - Logged to console
   - Progress modal shows error state
   - Retry option available

3. **Empty Project**
   - Button disabled
   - Alert shown with guidance

## Accessibility

- Semantic HTML structure with proper heading hierarchy
- ARIA labels on interactive elements
- Keyboard navigation support
- Screen reader friendly error messages
- Color contrast meets WCAG AA standards
- Focus indicators on interactive elements

## Performance Considerations

- Uses `useCallback` for event handlers to prevent unnecessary re-renders
- Minimal re-renders through context optimization
- Progress modal only rendered when needed
- Efficient validation checks

## Testing

### Unit Tests
Test the following scenarios:
- Button enabled/disabled based on prompt validity
- Validation error display
- Generation trigger
- Modal display during generation
- Callback invocation

### Integration Tests
Test the following workflows:
- Complete generation workflow
- Error handling and retry
- Cancellation workflow
- Multiple generation attempts

## Related Components

- **GenerationProgressModal**: Displays detailed generation progress
- **PromptManagementPanel**: Manages shot-level prompts
- **ShotPromptEditor**: Edits individual shot prompts
- **ProjectContext**: Provides state management

## Example Scenarios

### Scenario 1: All Prompts Valid
```
Status: ✓ 5 / 5 Complete
Alert: All prompts are valid. Ready to generate sequence!
Button: Enabled - "Generate Sequence"
```

### Scenario 2: Some Invalid Prompts
```
Status: ✓ 3 / 5 Complete, ✗ 2 Incomplete
Alert: Cannot generate: 2 shot(s) have invalid prompts
  • Shot abc123: Prompt is too short (minimum 10 characters)
  • Shot def456: Prompt is empty
Button: Disabled - "Fix Prompts to Generate"
```

### Scenario 3: Generating
```
Status: ✓ 5 / 5 Complete
Button: Disabled - "Generating..." (with spinner)
Modal: Open, showing pipeline progress
```

### Scenario 4: Empty Project
```
Status: 0 / 0 Complete
Alert: No shots in project. Add shots to begin generation.
Button: Disabled - "Generate Sequence"
```

## Future Enhancements

Potential improvements for future versions:
- Batch generation for multiple sequences
- Generation presets (quality vs speed)
- Estimated time before generation starts
- Generation history and comparison
- Partial generation (selected shots only)
- Generation scheduling
- Cloud generation support

## Troubleshooting

### Button Not Enabling
- Check that all shots have prompts between 10-500 characters
- Verify prompts are not empty or whitespace-only
- Ensure project has at least one shot
- Check that generation is not already in progress

### Modal Not Showing
- Verify `showProgressModal` state is being set
- Check that `GenerationProgressModal` is imported correctly
- Ensure context is providing `generationStatus`

### Generation Not Starting
- Check console for errors
- Verify `generateSequence` function is available in context
- Ensure backend services are running
- Check network connectivity

## Version History

- **v1.0.0** (Current): Initial implementation with core functionality
  - Generate button with smart state management
  - Prompt validation display
  - Pipeline information
  - Progress modal integration
  - Error handling and retry
