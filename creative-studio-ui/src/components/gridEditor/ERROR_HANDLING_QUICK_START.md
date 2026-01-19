# Error Handling Quick Start Guide

## 5-Minute Setup

### 1. Wrap Your App with Error Boundary

```typescript
import { GridEditorErrorBoundary } from './components/gridEditor/GridEditorErrorBoundary';
import { NotificationContainer } from './components/gridEditor/NotificationSystem';

function App() {
  return (
    <GridEditorErrorBoundary>
      <YourGridEditor />
      <NotificationContainer />
    </GridEditorErrorBoundary>
  );
}
```

### 2. Use Notifications in Your Components

```typescript
import { useNotifications } from './components/gridEditor/NotificationSystem';

function MyComponent() {
  const { showSuccess, showError, showWarning } = useNotifications();

  const handleAction = async () => {
    try {
      await doSomething();
      showSuccess('Success', 'Operation completed');
    } catch (error) {
      showError('Error', 'Operation failed', {
        recoveryOptions: [
          { label: 'Retry', action: handleAction, isPrimary: true },
        ],
      });
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

## Common Patterns

### Pattern 1: Simple Success/Error

```typescript
try {
  await saveData();
  showSuccess('Saved', 'Data saved successfully');
} catch (error) {
  showError('Save Failed', error.message);
}
```

### Pattern 2: Validation Warning

```typescript
if (value <= 0) {
  showWarning('Invalid Value', 'Value must be greater than 0');
  return;
}
```

### Pattern 3: Progress Notification

```typescript
const progressId = showInfo('Processing', 'Please wait...', 0);
try {
  await longOperation();
  dismiss(progressId);
  showSuccess('Complete', 'Operation finished');
} catch (error) {
  dismiss(progressId);
  showError('Failed', error.message);
}
```

### Pattern 4: Batch Operation

```typescript
const results = await Promise.allSettled(items.map(processItem));
const successCount = results.filter(r => r.status === 'fulfilled').length;
const failCount = results.filter(r => r.status === 'rejected').length;

if (failCount === 0) {
  showSuccess('Complete', `Processed ${successCount} items`);
} else {
  showWarning('Partial Success', `${successCount} succeeded, ${failCount} failed`);
}
```

## Predefined Templates

Use these for common operations:

```typescript
import {
  notifyOperationSuccess,
  notifyOperationError,
  notifyValidationWarning,
  notifyImportError,
  notifyExportSuccess,
  notifyGenerationInProgress,
  notifyGenerationComplete,
} from './components/gridEditor/NotificationSystem';

// Operation success
notifyOperationSuccess('Save configuration');

// Operation error with retry
notifyOperationError('save configuration', error, [
  { label: 'Retry', action: handleSave, isPrimary: true },
]);

// Validation warning
notifyValidationWarning('Panel transform', 'Scale must be positive');

// Import/Export
notifyImportError(error);
notifyExportSuccess('grid-config.json');

// Generation
const progressId = notifyGenerationInProgress(3);
// ... later ...
notifyGenerationComplete(3, 0); // 3 success, 0 failed
```

## Emergency Backup

The error boundary automatically saves backups on crash. To manually restore:

```typescript
// Backup is saved automatically on error
// User can restore from error UI or programmatically:

const backup = localStorage.getItem('grid-editor-emergency-backup-latest');
if (backup) {
  const state = JSON.parse(backup);
  useGridStore.getState().loadConfiguration(state.config);
}
```

## Customization

### Custom Error Fallback

```typescript
<GridEditorErrorBoundary
  fallback={(error, reset) => (
    <div>
      <h2>Custom Error UI</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try Again</button>
    </div>
  )}
>
  <YourApp />
</GridEditorErrorBoundary>
```

### Custom Error Handler

```typescript
<GridEditorErrorBoundary
  onError={(error, errorInfo) => {
    // Send to monitoring service
    console.log('Error:', error, errorInfo);
  }}
>
  <YourApp />
</GridEditorErrorBoundary>
```

## Notification Types

| Type | Color | Auto-Dismiss | Use Case |
|------|-------|--------------|----------|
| Success | Green | 3s | Completed operations |
| Error | Red | Manual | Failed operations |
| Warning | Yellow | 5s | Validation issues |
| Info | Blue | 4s | Progress updates |

## Recovery Options

Add recovery options to error notifications:

```typescript
showError('Generation Failed', 'Could not generate image', {
  recoveryOptions: [
    {
      label: 'Retry',
      action: () => generateImage(),
      isPrimary: true, // Highlighted button
    },
    {
      label: 'Use Different Model',
      action: () => openModelSelector(),
    },
    {
      label: 'Cancel',
      action: () => {},
    },
  ],
  technicalDetails: error.stack, // Optional debug info
});
```

## Best Practices

1. **Always wrap async operations in try-catch**
2. **Provide recovery options for errors**
3. **Use appropriate notification types**
4. **Keep messages concise and actionable**
5. **Dismiss progress notifications when done**
6. **Test error scenarios**

## Troubleshooting

### Notifications not showing?
- Ensure `<NotificationContainer />` is rendered
- Check browser console for errors

### Error boundary not catching errors?
- Error boundaries only catch errors in child components
- They don't catch errors in event handlers (use try-catch)

### Backup not saving?
- Check localStorage is available
- Check browser storage quota

## Need Help?

See full documentation in:
- `ERROR_HANDLING_IMPLEMENTATION.md` - Complete implementation details
- `ErrorHandlingIntegration.example.tsx` - More examples
- `__tests__/errorHandling.test.ts` - Test examples
