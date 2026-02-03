# ComfyUI Integration Components

This directory contains React components for ComfyUI Desktop integration, providing UI for generation progress monitoring, status displays, and cancellation controls.

## Components

### GenerationStatusDisplay

Displays current generation status with progress tracking.

**Features:**
- Current step description
- Progress bar with percentage
- Item counter (current/total)
- Elapsed time and estimated remaining time
- Compact and full display modes

**Usage:**
```tsx
import { GenerationStatusDisplay } from '@/components/comfyui';

<GenerationStatusDisplay
  progress={{
    currentStep: 'Generating Master Coherence Sheet',
    progress: 45,
    currentItem: 4,
    totalItems: 9,
    startTime: Date.now() - 60000,
    estimatedCompletion: Date.now() + 60000,
    stage: 'grid',
  }}
/>
```

**Requirements:** 8.1, 8.2, 8.3

---

### MasterCoherenceSheetProgress

Displays progress for Master Coherence Sheet (3x3 grid) generation with individual panel tracking.

**Features:**
- 3x3 grid visualization
- Individual panel status (pending, in-progress, complete, error)
- Overall progress tracking
- Completion statistics
- Panel details list
- Error summary

**Usage:**
```tsx
import { MasterCoherenceSheetProgress } from '@/components/comfyui';

<MasterCoherenceSheetProgress
  panels={[
    { index: 0, status: 'complete', progress: 100 },
    { index: 1, status: 'in-progress', progress: 65 },
    { index: 2, status: 'pending', progress: 0 },
    // ... 6 more panels
  ]}
  overallProgress={35}
/>
```

**Requirements:** 8.4, 8.5

---

### GenerationCompletionSummary

Displays a summary of completed generation session.

**Features:**
- Total generation time
- Success/failure counts
- Average time per image
- Performance metrics
- Success rate calculation
- Failure warnings

**Usage:**
```tsx
import { GenerationCompletionSummary } from '@/components/comfyui';

<GenerationCompletionSummary
  stats={{
    totalTime: 180000, // 3 minutes
    successCount: 8,
    failureCount: 1,
    averageTimePerImage: 20000, // 20 seconds
    startTime: Date.now() - 180000,
    endTime: Date.now(),
    totalImages: 9,
  }}
  onViewResults={() => console.log('View results')}
/>
```

**Requirements:** 8.6

---

### GenerationCancellationDialog

Confirmation dialog for cancelling generation with cleanup progress tracking.

**Features:**
- Confirmation warning
- Cancellation progress
- Cleanup progress tracking
- Error handling
- Auto-close on success

**Usage:**
```tsx
import { GenerationCancellationDialog } from '@/components/comfyui';

<GenerationCancellationDialog
  isOpen={showDialog}
  status="confirming"
  onConfirm={() => console.log('Cancel confirmed')}
  onCancel={() => setShowDialog(false)}
  onClose={() => setShowDialog(false)}
/>
```

**Cancellation Flow:**
1. `confirming` - User sees warning and confirmation buttons
2. `cancelling` - Cancellation in progress
3. `cleaning-up` - Cleanup progress with detailed steps
4. `cancelled` - Success message with auto-close
5. `error` - Error message with close button

**Requirements:** 8.7

---

## Integration Example

Here's a complete example showing how to use these components together:

```tsx
import React, { useState } from 'react';
import {
  GenerationStatusDisplay,
  MasterCoherenceSheetProgress,
  GenerationCompletionSummary,
  GenerationCancellationDialog,
} from '@/components/comfyui';

function GenerationMonitor() {
  const [isGenerating, setIsGenerating] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Generation progress state
  const progress = {
    currentStep: 'Generating Master Coherence Sheet',
    progress: 45,
    currentItem: 4,
    totalItems: 9,
    startTime: Date.now() - 60000,
    estimatedCompletion: Date.now() + 60000,
    stage: 'grid' as const,
  };

  // Panel progress for Master Coherence Sheet
  const panels = Array.from({ length: 9 }, (_, i) => ({
    index: i,
    status: i < 4 ? 'complete' : i === 4 ? 'in-progress' : 'pending',
    progress: i < 4 ? 100 : i === 4 ? 65 : 0,
  }));

  // Completion stats
  const stats = {
    totalTime: 180000,
    successCount: 8,
    failureCount: 1,
    averageTimePerImage: 20000,
    startTime: Date.now() - 180000,
    endTime: Date.now(),
    totalImages: 9,
  };

  return (
    <div className="space-y-4 p-4">
      {/* Current Generation Status */}
      {isGenerating && !isComplete && (
        <>
          <GenerationStatusDisplay progress={progress} />
          
          {progress.stage === 'grid' && (
            <MasterCoherenceSheetProgress
              panels={panels}
              overallProgress={progress.progress}
            />
          )}

          <button
            onClick={() => setShowCancelDialog(true)}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Cancel Generation
          </button>
        </>
      )}

      {/* Completion Summary */}
      {isComplete && (
        <GenerationCompletionSummary
          stats={stats}
          onViewResults={() => console.log('View results')}
        />
      )}

      {/* Cancellation Dialog */}
      <GenerationCancellationDialog
        isOpen={showCancelDialog}
        status="confirming"
        onConfirm={() => {
          console.log('Cancelling...');
          setIsGenerating(false);
        }}
        onCancel={() => setShowCancelDialog(false)}
        onClose={() => setShowCancelDialog(false)}
      />
    </div>
  );
}
```

## Type Definitions

All components export their prop types for TypeScript usage:

```tsx
import type {
  GenerationProgress,
  PanelInfo,
  GenerationStats,
  CancellationStatus,
  CleanupProgress,
} from '@/components/comfyui';
```

## Requirements Mapping

- **8.1**: Current step description display
- **8.2**: Progress bar with percentage and item counters
- **8.3**: Elapsed time and estimated remaining time
- **8.4**: Master Coherence Sheet individual panel progress
- **8.5**: Real-time updates as panels complete
- **8.6**: Generation completion summary with statistics
- **8.7**: Generation cancellation with confirmation and cleanup progress
