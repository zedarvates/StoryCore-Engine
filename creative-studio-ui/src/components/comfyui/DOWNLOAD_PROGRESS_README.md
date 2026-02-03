# Download Progress Tracking Components

This document describes the download progress tracking components for ComfyUI model downloads.

## Overview

The download progress tracking system consists of three main components:

1. **DownloadStatusDisplay** - Displays individual download items with progress bars and controls
2. **MultiDownloadProgress** - Shows overall progress summary for multiple downloads
3. **DownloadNotifications** - Manages notifications for download events

## Components

### DownloadStatusDisplay

Displays active model downloads with individual progress bars, download speed, and estimated time remaining.

**Props:**
- `activeDownloads: DownloadProgress[]` - Array of active downloads
- `onPause?: (modelName: string) => void` - Callback when pause button is clicked
- `onResume?: (modelName: string) => void` - Callback when resume button is clicked
- `onCancel?: (modelName: string) => void` - Callback when cancel button is clicked
- `onRetry?: (modelName: string) => void` - Callback when retry button is clicked

**Features:**
- Individual progress bars for each download
- Real-time speed and ETA display
- Pause/resume/cancel controls
- Status indicators (downloading, paused, completed, failed)
- Error message display for failed downloads

**Example:**
```tsx
<DownloadStatusDisplay
  activeDownloads={downloads}
  onPause={handlePause}
  onResume={handleResume}
  onCancel={handleCancel}
  onRetry={handleRetry}
/>
```

### MultiDownloadProgress

Displays overall progress summary for multiple concurrent downloads.

**Props:**
- `downloads: DownloadProgress[]` - Array of all downloads (active and completed)
- `onClearCompleted?: () => void` - Callback to clear completed downloads

**Features:**
- Overall progress bar showing total completion
- Status counts (downloading, paused, completed, failed)
- Total size and downloaded size in MB
- Average download speed
- Clear completed button

**Example:**
```tsx
<MultiDownloadProgress
  downloads={downloads}
  onClearCompleted={handleClearCompleted}
/>
```

### DownloadNotifications

Manages notifications for download events (completion, failure, pause, resume).

**Props:**
- `downloads: DownloadProgress[]` - Array of downloads to monitor
- `onRetry?: (modelName: string) => void` - Callback for retry action in notifications

**Features:**
- Automatic notifications on status changes
- Success notifications for completed downloads
- Error notifications with retry option for failed downloads
- Info notifications for paused/resumed downloads
- Integrates with NotificationService

**Example:**
```tsx
<DownloadNotifications
  downloads={downloads}
  onRetry={handleRetry}
/>
```

**Hook Usage:**
```tsx
// Use the hook instead of the component
useDownloadNotifications(downloads, handleRetry);
```

**Utility Functions:**
```tsx
// Show batch download completion notification
showBatchDownloadComplete(totalCount, successCount, failedCount);

// Show download start notification
showDownloadStart(modelName);

// Show download cancelled notification
showDownloadCancelled(modelName);
```

## Data Types

### DownloadProgress

```typescript
interface DownloadProgress {
  modelName: string;
  totalBytes: number;
  downloadedBytes: number;
  speedMbps: number;
  etaSeconds: number;
  status: 'downloading' | 'paused' | 'completed' | 'failed';
  errorMessage?: string;
}
```

## Usage Example

```tsx
import React, { useState } from 'react';
import {
  DownloadStatusDisplay,
  MultiDownloadProgress,
  useDownloadNotifications,
  DownloadProgress
} from '@/components/comfyui';

function ModelDownloadManager() {
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);

  // Setup notifications
  useDownloadNotifications(downloads, handleRetry);

  const handlePause = (modelName: string) => {
    setDownloads(prev =>
      prev.map(d =>
        d.modelName === modelName
          ? { ...d, status: 'paused' }
          : d
      )
    );
  };

  const handleResume = (modelName: string) => {
    setDownloads(prev =>
      prev.map(d =>
        d.modelName === modelName
          ? { ...d, status: 'downloading' }
          : d
      )
    );
  };

  const handleCancel = (modelName: string) => {
    setDownloads(prev =>
      prev.filter(d => d.modelName !== modelName)
    );
  };

  const handleRetry = (modelName: string) => {
    setDownloads(prev =>
      prev.map(d =>
        d.modelName === modelName
          ? {
              ...d,
              status: 'downloading',
              downloadedBytes: 0,
              errorMessage: undefined
            }
          : d
      )
    );
  };

  const handleClearCompleted = () => {
    setDownloads(prev =>
      prev.filter(d => d.status !== 'completed')
    );
  };

  return (
    <div>
      <MultiDownloadProgress
        downloads={downloads}
        onClearCompleted={handleClearCompleted}
      />
      
      <DownloadStatusDisplay
        activeDownloads={downloads}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
        onRetry={handleRetry}
      />
    </div>
  );
}
```

## Integration with ModelManager

The components are designed to work with the ModelManager from the backend:

```tsx
import { ModelManager } from '@/services/modelManager';

function IntegratedDownloadManager() {
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const modelManager = new ModelManager(config, modelsDir);

  const startDownload = async (modelInfo: ModelInfo) => {
    await modelManager.download_model(
      modelInfo,
      (progress) => {
        setDownloads(prev => {
          const existing = prev.find(d => d.modelName === modelInfo.name);
          if (existing) {
            return prev.map(d =>
              d.modelName === modelInfo.name
                ? {
                    ...d,
                    downloadedBytes: progress.downloaded_bytes,
                    speedMbps: progress.speed_mbps,
                    etaSeconds: progress.eta_seconds,
                    status: progress.status
                  }
                : d
            );
          } else {
            return [...prev, {
              modelName: modelInfo.name,
              totalBytes: modelInfo.file_size,
              downloadedBytes: progress.downloaded_bytes,
              speedMbps: progress.speed_mbps,
              etaSeconds: progress.eta_seconds,
              status: progress.status
            }];
          }
        });
      }
    );
  };

  // ... rest of component
}
```

## Styling

All components use CSS custom properties for theming:

```css
--background-secondary: Background color for containers
--background-tertiary: Background color for items
--border-color: Border color
--text-primary: Primary text color
--text-secondary: Secondary text color
--text-tertiary: Tertiary text color
--button-background: Button background
--button-hover: Button hover state
--accent-color: Accent color for badges
```

Components automatically adapt to dark mode using `prefers-color-scheme: dark`.

## Accessibility

All components follow accessibility best practices:

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly
- Progress bars with proper aria attributes
- Semantic HTML structure

## Requirements Validation

These components validate the following requirements:

- **Requirement 7.2**: Display model name, current size, total size, percentage
- **Requirement 7.3**: Display download speed (MB/s) and estimated time remaining
- **Requirement 7.4**: Show separate progress for each concurrent download
- **Requirement 7.5**: Pause/resume functionality for downloads
- **Requirement 7.6**: Success notification when download completes
- **Requirement 7.7**: Error notification with retry option when download fails

## Testing

See `DownloadProgressExample.tsx` for a complete working example with simulated downloads.

To test:
1. Import and render `DownloadProgressExample`
2. Click "Add Download" to add new downloads
3. Click "Simulate Error" to test error handling
4. Use pause/resume/cancel buttons on individual downloads
5. Observe notifications for status changes
