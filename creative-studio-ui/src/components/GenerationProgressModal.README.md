# GenerationProgressModal Component

## Overview

The `GenerationProgressModal` component displays detailed progress during sequence generation through the StoryCore pipeline. It provides real-time feedback on generation status, stage-by-stage progress indicators, timing information, and error handling with retry functionality.

## Requirements

This component implements the following requirements:
- **3.6**: Display progress indicators for each pipeline stage
- **8.1**: Show stage-by-stage progress (grid, ComfyUI, promotion, QA, export)
- **8.2**: Display current shot and total shot count
- **8.3**: Show elapsed time during generation
- **8.4**: Display estimated completion time
- **8.5**: Provide cancel button during generation

## Features

### Stage-by-Stage Progress Indicators
- Visual indicators for each pipeline stage (grid, ComfyUI, promotion, QA, export)
- Stage status icons (pending, in-progress, complete, error)
- Stage-specific colors and animations
- Real-time stage updates

### Progress Tracking
- Overall progress bar (0-100%)
- Current shot and total shot display
- Stage-specific progress visualization
- Color-coded progress indicators

### Timing Information
- Elapsed time display (updates every second)
- Estimated time remaining calculation
- Estimated completion timestamp
- Total time display on completion

### Error Handling
- Descriptive error messages
- Retry button for failed generations
- Error stage indication
- Graceful error recovery

### User Controls
- Cancel button during generation
- Close button after completion or error
- Retry button after error
- Modal dismissal prevention during generation

## Usage

### Basic Usage

```tsx
import { GenerationProgressModal } from '@/components/GenerationProgressModal';
import type { GenerationStatus } from '@/types/projectDashboard';

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>({
    stage: 'idle',
    progress: 0,
    startTime: Date.now(),
  });

  const handleCancel = () => {
    // Cancel generation logic
    console.log('Cancelling generation...');
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  const handleRetry = () => {
    // Retry generation logic
    console.log('Retrying generation...');
  };

  return (
    <GenerationProgressModal
      isOpen={isModalOpen}
      status={status}
      onCancel={handleCancel}
      onClose={handleClose}
      onRetry={handleRetry}
    />
  );
}
```

### With Sequence Generation Service

```tsx
import { GenerationProgressModal } from '@/components/GenerationProgressModal';
import { sequenceGenerationService } from '@/services/sequenceGenerationService';
import type { GenerationStatus, Project } from '@/types/projectDashboard';

function SequenceGenerator() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<GenerationStatus>({
    stage: 'idle',
    progress: 0,
  });

  const handleGenerate = async (project: Project) => {
    setIsModalOpen(true);
    setStatus({
      stage: 'grid',
      progress: 0,
      currentShot: 0,
      totalShots: project.shots.length,
      startTime: Date.now(),
    });

    const results = await sequenceGenerationService.generateSequence(project, {
      onProgress: (newStatus) => {
        setStatus(newStatus);
      },
      onError: (error) => {
        setStatus({
          stage: 'error',
          progress: 0,
          error: error.message,
          startTime: status.startTime,
        });
      },
    });

    if (results) {
      setStatus({
        stage: 'complete',
        progress: 100,
        currentShot: project.shots.length,
        totalShots: project.shots.length,
        startTime: status.startTime,
      });
    }
  };

  const handleCancel = () => {
    sequenceGenerationService.cancel();
    setIsModalOpen(false);
  };

  const handleRetry = () => {
    // Retry logic
    handleGenerate(currentProject);
  };

  return (
    <>
      <Button onClick={() => handleGenerate(project)}>
        Generate Sequence
      </Button>
      
      <GenerationProgressModal
        isOpen={isModalOpen}
        status={status}
        onCancel={handleCancel}
        onClose={() => setIsModalOpen(false)}
        onRetry={handleRetry}
      />
    </>
  );
}
```

## Props

### GenerationProgressModalProps

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | Yes | Whether the modal is open |
| `status` | `GenerationStatus` | Yes | Current generation status |
| `onCancel` | `() => void` | No | Callback when cancel button is clicked (during generation) |
| `onClose` | `() => void` | Yes | Callback when close button is clicked (after completion or error) |
| `onRetry` | `() => void` | No | Callback when retry button is clicked (after error) |

### GenerationStatus Interface

```typescript
interface GenerationStatus {
  stage: 'idle' | 'grid' | 'comfyui' | 'promotion' | 'qa' | 'export' | 'complete' | 'error';
  progress: number; // 0-100
  currentShot?: number;
  totalShots?: number;
  error?: string;
  startTime?: number;
  estimatedCompletion?: number;
}
```

## Pipeline Stages

The component displays progress for the following pipeline stages:

1. **Grid (Master Coherence Sheet)** 🎨
   - Generates the 3x3 visual DNA grid
   - Establishes style consistency
   - Weight: 20% of total progress

2. **ComfyUI Generation** 🖼️
   - Generates images for each shot
   - Most time-consuming stage
   - Weight: 40% of total progress

3. **Promotion Engine** ⚡
   - Processes shots through promotion pipeline
   - Applies enhancements and refinements
   - Weight: 15% of total progress

4. **QA Analysis** 🔍
   - Runs quality analysis
   - Applies autofix if needed
   - Weight: 15% of total progress

5. **Export Package** 📦
   - Creates final export package
   - Generates QA reports
   - Weight: 10% of total progress

## Stage Status Indicators

Each stage displays one of four status states:

- **Pending**: Gray circle outline (stage not started)
- **In Progress**: Blue spinning loader (stage currently executing)
- **Complete**: Green checkmark (stage successfully completed)
- **Error**: Red X (stage failed)

## Timing Information

### Elapsed Time
- Updates every second
- Displays time since generation started
- Format: `Xh Ym` or `Xm Ys` or `Xs`

### Estimated Time Remaining
- Calculated based on current progress
- Linear extrapolation from elapsed time
- Updates as generation progresses
- Displays `--` when not available

### Estimated Completion
- Timestamp of expected completion
- Format: `HH:MM:SS AM/PM`
- Only shown during active generation

## Error Handling

When an error occurs:
1. Modal displays error state with red indicators
2. Error message shown in red alert box
3. Failed stage marked with red X icon
4. Retry button appears (if `onRetry` provided)
5. Close button allows dismissal

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: ARIA labels on all interactive elements
- **Focus Management**: Proper focus handling in modal
- **Color Contrast**: WCAG AA compliant colors
- **Status Announcements**: Visual status changes

## Styling

The component uses Tailwind CSS classes and follows the application's design system:
- Consistent spacing and typography
- Color-coded stage indicators
- Smooth animations and transitions
- Responsive layout

## Integration with Generation Service

The component is designed to work seamlessly with `SequenceGenerationService`:

```typescript
// Service provides status updates via callback
const results = await sequenceGenerationService.generateSequence(project, {
  onProgress: (status) => {
    // Update modal with new status
    setGenerationStatus(status);
  },
  onStageComplete: (stage, result) => {
    console.log(`Stage ${stage} completed:`, result);
  },
  onError: (error) => {
    // Update modal with error status
    setGenerationStatus({
      stage: 'error',
      progress: 0,
      error: error.message,
    });
  },
});
```

## Best Practices

1. **Always provide onClose**: Required for modal dismissal
2. **Provide onCancel during generation**: Allows users to cancel long-running operations
3. **Provide onRetry for errors**: Enables error recovery
4. **Update status frequently**: Provide real-time feedback
5. **Handle cancellation**: Clean up resources when user cancels
6. **Prevent dismissal during generation**: Modal prevents accidental closure

## Testing

### Unit Tests
- Test modal rendering with different status states
- Test button visibility based on status
- Test elapsed time updates
- Test stage status calculations
- Test error display

### Integration Tests
- Test with SequenceGenerationService
- Test cancellation flow
- Test retry flow
- Test completion flow
- Test error recovery

## Dependencies

- `@/components/ui/dialog`: Modal dialog component
- `@/components/ui/button`: Button component
- `@/components/ui/progress`: Progress bar component
- `lucide-react`: Icons
- `@/utils/generationStatusTracking`: Status tracking utilities
- `@/types/projectDashboard`: Type definitions

## Related Components

- `SequenceGenerationControl`: Triggers generation and opens modal
- `ProjectDashboardNew`: Main dashboard component
- `SequenceGenerationService`: Backend service for generation

## Future Enhancements

- [ ] Add pause/resume functionality
- [ ] Add detailed logs viewer
- [ ] Add stage-specific progress details
- [ ] Add download progress for assets
- [ ] Add notification on completion (when modal closed)
- [ ] Add generation history tracking
- [ ] Add performance metrics display
