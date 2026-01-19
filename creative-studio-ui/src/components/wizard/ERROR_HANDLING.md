# Error Handling and Recovery System

## Overview

This document describes the comprehensive error handling and recovery system implemented for the UI Configuration Wizards. The system provides robust error detection, user-friendly error messages, data preservation, and multiple recovery strategies.

## Requirements Addressed

- **Requirement 8.1**: LLM API error handling with recovery actions
- **Requirement 8.2**: ComfyUI connection error diagnostics
- **Requirement 8.5**: Error recovery without data loss
- **Requirement 8.8**: Data export for manual recovery
- **Requirement 5.6**: State corruption detection and recovery

## Architecture

### Components

#### 1. WizardErrorBoundary
**Location**: `src/components/wizard/WizardErrorBoundary.tsx`

React error boundary specialized for wizard components with:
- Automatic error catching and logging
- Data preservation on critical errors
- Emergency data export functionality
- User-friendly error display
- Recovery options (retry, export, reload)

**Usage**:
```tsx
<WizardErrorBoundary
  wizardType="world"
  onError={(error) => console.error(error)}
  onReset={() => window.location.reload()}
>
  <WorldWizard />
</WizardErrorBoundary>
```

#### 2. ErrorDisplay
**Location**: `src/components/wizard/ErrorDisplay.tsx`

User-friendly error display component with:
- Severity-based styling (info, warning, error, critical)
- Recovery action buttons
- Technical details (development mode)
- Compact and full display modes

**Usage**:
```tsx
<ErrorDisplay
  error={appError}
  recoveryActions={[
    { label: 'Retry', action: handleRetry, primary: true },
    { label: 'Dismiss', action: handleDismiss }
  ]}
  showTechnicalDetails={process.env.NODE_ENV === 'development'}
/>
```

#### 3. ErrorNotification
**Location**: `src/components/wizard/ErrorNotification.tsx`

Toast-style notifications for non-blocking errors:
- Auto-dismiss with progress bar
- Multiple notification stacking
- Position customization
- Severity-based styling

**Usage**:
```tsx
<ErrorNotificationContainer
  errors={errors}
  onDismiss={(errorId) => removeError(errorId)}
  autoDismiss={5000}
  position="top-right"
  maxNotifications={3}
/>
```

#### 4. DataExportImport
**Location**: `src/components/wizard/DataExportImport.tsx`

Data backup and recovery UI:
- Export wizard state as JSON
- Import previously saved data
- Compact and panel display modes
- Success/error feedback

**Usage**:
```tsx
<DataExportImportPanel
  wizardType="character"
  compact={false}
/>
```

#### 5. StateRecoveryDialog
**Location**: `src/components/wizard/StateRecoveryDialog.tsx`

Dialog for handling state corruption:
- Displays validation errors and warnings
- Recommends recovery strategy
- Provides export, recover, and reset options
- Data preservation notice

**Usage**:
```tsx
<StateRecoveryDialog
  wizardType="world"
  validationResult={validationResult}
  onReset={handleReset}
  onRecover={handleRecover}
  isOpen={showDialog}
/>
```

### Services

#### 1. ErrorHandlingService
**Location**: `src/services/errorHandlingService.ts`

Core error handling service with:
- Error categorization (network, validation, backend, timeout, unknown)
- Retry logic with exponential backoff
- Timeout handling
- Recovery action generation
- Error logging

**Usage**:
```tsx
const errorService = getErrorHandlingService();

// With retry
const result = await errorService.withRetry(
  () => fetchData(),
  { maxAttempts: 3, initialDelay: 1000 }
);

// With timeout
const result = await errorService.withTimeout(
  () => fetchData(),
  5000
);
```

#### 2. ErrorLoggingService
**Location**: `src/services/wizard/errorLoggingService.ts`

Comprehensive error logging for debugging:
- Persistent error log storage
- Error filtering and search
- Statistics and analytics
- Export logs as JSON
- Session tracking

**Usage**:
```tsx
const loggingService = getErrorLoggingService();

// Log error
loggingService.logError(appError, { userId: '123' });

// Get statistics
const stats = loggingService.getStatistics();

// Export logs
loggingService.downloadLogs();
```

#### 3. StateValidationService
**Location**: `src/services/wizard/stateValidationService.ts`

State corruption detection and recovery:
- Validates wizard state structure
- Detects version mismatches
- Determines recovery strategy
- Attempts state recovery
- Sanitizes form data

**Usage**:
```tsx
const validationService = getStateValidationService();

// Validate state
const result = validationService.validateState(state);

// Attempt recovery
const recovered = validationService.recoverState(state);
```

### Hooks

#### 1. useErrorHandling
**Location**: `src/hooks/useErrorHandling.ts`

React hook for error handling:
- Execute functions with retry logic
- Handle errors with recovery actions
- Auto-dismiss errors
- Track error history

**Usage**:
```tsx
const {
  error,
  withRetry,
  handleError,
  clearError,
  getRecoveryActions,
  retry
} = useErrorHandling({
  onError: (error) => console.error(error),
  autoDismissTimeout: 5000
});

// Execute with retry
await withRetry(() => fetchData());
```

#### 2. useStateRecovery
**Location**: `src/hooks/useStateRecovery.ts`

React hook for state recovery:
- Auto-check for corruption on mount
- Attempt state recovery
- Reset to clean state
- Show recovery dialog

**Usage**:
```tsx
const {
  isCorrupted,
  validationResult,
  checkForCorruption,
  attemptRecovery,
  resetState,
  showRecoveryDialog
} = useStateRecovery({
  wizardType: 'world',
  autoCheck: true,
  onCorruptionDetected: (result) => console.warn(result)
});
```

### Utilities

#### 1. wizardStorage.ts
**Location**: `src/utils/wizardStorage.ts`

Enhanced with:
- `emergencyExportWizardState()` - Export on critical errors
- `enableAutoExportOnError()` - Auto-export on unhandled errors
- `loadWizardStateWithValidation()` - Load with validation results

## Error Categories

### 1. Network Errors
- Connection timeout
- Server unreachable
- DNS resolution failure

**Recovery**: Retry with exponential backoff, check connection

### 2. Validation Errors
- Required field missing
- Invalid format
- Value out of range

**Recovery**: Review input, show inline errors

### 3. Backend Errors
- Server error (5xx)
- API endpoint not found
- Authentication failure

**Recovery**: Retry, contact support

### 4. Timeout Errors
- Request timeout
- Operation timeout

**Recovery**: Retry with longer timeout

### 5. State Corruption
- Invalid state structure
- Version mismatch
- Expired state

**Recovery**: Attempt recovery, reset to clean state

## Recovery Strategies

### 1. Reset Strategy
Used when state is too corrupted to recover.

**Actions**:
1. Export data for manual recovery
2. Clear corrupted state
3. Start fresh wizard

### 2. Partial Recovery Strategy
Used when some data can be salvaged.

**Actions**:
1. Extract valid form data
2. Sanitize and validate
3. Restore with defaults for missing fields

### 3. Migration Strategy
Used for version mismatches.

**Actions**:
1. Detect version difference
2. Apply migration transformations
3. Validate migrated state

## Best Practices

### For Component Developers

1. **Wrap wizards in error boundaries**:
```tsx
<WizardErrorBoundary wizardType="world">
  <WorldWizard />
</WizardErrorBoundary>
```

2. **Use error handling hook**:
```tsx
const { withRetry, handleError } = useErrorHandling();

try {
  await withRetry(() => generateSuggestions());
} catch (error) {
  // Error is already handled
}
```

3. **Provide recovery actions**:
```tsx
<ErrorDisplay
  error={error}
  recoveryActions={[
    { label: 'Retry', action: handleRetry, primary: true },
    { label: 'Manual Entry', action: switchToManual }
  ]}
/>
```

4. **Check for state corruption**:
```tsx
const { isCorrupted, showRecoveryDialog } = useStateRecovery({
  wizardType: 'character',
  autoCheck: true
});
```

### For Service Developers

1. **Categorize errors correctly**:
```tsx
throw errorService.createError(
  'Connection failed',
  'network',
  { url, statusCode }
);
```

2. **Log errors for debugging**:
```tsx
loggingService.logError(appError, {
  operation: 'generateWorld',
  userId: currentUser.id
});
```

3. **Provide user-friendly messages**:
```tsx
const appError = {
  message: 'ECONNREFUSED',
  userMessage: 'Unable to connect to the server. Please check your internet connection.'
};
```

## Testing

### Unit Tests

Test error handling components:
```tsx
test('displays error with recovery actions', () => {
  const error = createMockError();
  render(<ErrorDisplay error={error} recoveryActions={actions} />);
  
  expect(screen.getByText(error.userMessage)).toBeInTheDocument();
  expect(screen.getByText('Retry')).toBeInTheDocument();
});
```

### Integration Tests

Test error recovery flows:
```tsx
test('recovers from corrupted state', async () => {
  // Corrupt state
  localStorage.setItem('wizard-world', 'invalid-json{');
  
  const { result } = renderHook(() => useStateRecovery({
    wizardType: 'world',
    autoCheck: true
  }));
  
  await waitFor(() => {
    expect(result.current.isCorrupted).toBe(true);
  });
  
  // Attempt recovery
  await act(async () => {
    await result.current.resetState();
  });
  
  expect(result.current.isCorrupted).toBe(false);
});
```

## Monitoring and Debugging

### Error Statistics

```tsx
const loggingService = getErrorLoggingService();
const stats = loggingService.getStatistics();

console.log('Total errors:', stats.total);
console.log('By severity:', stats.bySeverity);
console.log('By category:', stats.byCategory);
console.log('Recent errors:', stats.recentErrors);
```

### Export Error Logs

```tsx
// Export all logs
loggingService.downloadLogs();

// Export filtered logs
loggingService.downloadLogs({
  severity: ['error', 'critical'],
  startDate: new Date('2024-01-01'),
  category: ['network', 'backend']
});
```

## Future Enhancements

1. **Remote Error Reporting**: Send error logs to monitoring service
2. **Error Analytics Dashboard**: Visualize error trends and patterns
3. **Automated Recovery**: AI-powered error recovery suggestions
4. **User Feedback**: Collect user feedback on error messages
5. **A/B Testing**: Test different error message variations

## Related Documentation

- [Wizard Context](./WizardContext.tsx)
- [State Management](../../stores/wizard/README.md)
- [Testing Guide](../../__tests__/README.md)
