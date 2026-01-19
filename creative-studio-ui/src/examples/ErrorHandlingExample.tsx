/**
 * Error Handling Example
 * 
 * Demonstrates the error handling and recovery system for wizards.
 */

import { useState } from 'react';
import {
  WizardErrorBoundary,
  ErrorDisplay,
  ErrorNotificationContainer,
  DataExportImportPanel,
  StateRecoveryDialog,
  useStateRecovery,
} from '../components/wizard/errorHandling';
import { useErrorHandling } from '../hooks/useErrorHandling';
import { getErrorHandlingService } from '../services/errorHandlingService';

/**
 * Example component that demonstrates error handling
 */
function ErrorProneComponent() {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    throw new Error('Example error for demonstration');
  }

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-2">Error Prone Component</h3>
      <p className="text-sm text-gray-600 mb-4">
        This component will throw an error when you click the button.
      </p>
      <button
        onClick={() => setShouldError(true)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Trigger Error
      </button>
    </div>
  );
}

/**
 * Example of using error handling hook
 */
function ErrorHandlingHookExample() {
  const {
    error,
    withRetry,
    getRecoveryActions,
    isRetrying,
  } = useErrorHandling({
    autoDismissTimeout: 5000,
  });

  const [result, setResult] = useState<string | null>(null);

  const simulateApiCall = async () => {
    // Simulate random failure
    if (Math.random() > 0.5) {
      throw new Error('API call failed');
    }
    return 'Success!';
  };

  const handleApiCall = async () => {
    try {
      setResult(null);
      const data = await withRetry(simulateApiCall, {
        maxAttempts: 3,
        initialDelay: 1000,
      });
      setResult(data);
    } catch (err) {
      // Error is already handled by the hook
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Error Handling Hook</h3>
        <p className="text-sm text-gray-600 mb-4">
          This example demonstrates automatic retry with exponential backoff.
        </p>
        <button
          onClick={handleApiCall}
          disabled={isRetrying}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isRetrying ? 'Retrying...' : 'Simulate API Call'}
        </button>
        {result && (
          <div className="mt-4 p-3 bg-green-50 text-green-800 rounded">
            {result}
          </div>
        )}
      </div>

      {error && (
        <ErrorDisplay
          error={error}
          recoveryActions={getRecoveryActions()}
          showTechnicalDetails={true}
        />
      )}
    </div>
  );
}

/**
 * Example of state recovery
 */
function StateRecoveryExample() {
  const {
    isCorrupted,
    validationResult,
    checkForCorruption,
    attemptRecovery,
    resetState,
    showRecoveryDialog,
    setShowRecoveryDialog,
  } = useStateRecovery({
    wizardType: 'world',
    autoCheck: false,
  });

  const simulateCorruption = () => {
    // Corrupt the state
    localStorage.setItem('wizard-world', 'invalid-json{');
    checkForCorruption();
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">State Recovery</h3>
        <p className="text-sm text-gray-600 mb-4">
          This example demonstrates state corruption detection and recovery.
        </p>
        <div className="flex gap-2">
          <button
            onClick={simulateCorruption}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Simulate Corruption
          </button>
          <button
            onClick={checkForCorruption}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Check State
          </button>
        </div>
        {isCorrupted && (
          <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">
            State corruption detected!
          </div>
        )}
      </div>

      {validationResult && (
        <StateRecoveryDialog
          wizardType="world"
          validationResult={validationResult}
          onReset={resetState}
          onRecover={attemptRecovery}
          onDismiss={() => setShowRecoveryDialog(false)}
          isOpen={showRecoveryDialog}
        />
      )}
    </div>
  );
}

/**
 * Example of error notifications
 */
function ErrorNotificationExample() {
  const [errors, setErrors] = useState<any[]>([]);
  const errorService = getErrorHandlingService();

  const addError = (severity: 'info' | 'warning' | 'error' | 'critical') => {
    const error = errorService.createError(
      `This is a ${severity} message`,
      'unknown',
      { timestamp: Date.now() }
    );
    setErrors((prev) => [...prev, error]);
  };

  const removeError = (errorId: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId));
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Error Notifications</h3>
        <p className="text-sm text-gray-600 mb-4">
          This example demonstrates toast-style error notifications.
        </p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => addError('info')}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Info
          </button>
          <button
            onClick={() => addError('warning')}
            className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
          >
            Warning
          </button>
          <button
            onClick={() => addError('error')}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Error
          </button>
          <button
            onClick={() => addError('critical')}
            className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
          >
            Critical
          </button>
        </div>
      </div>

      <ErrorNotificationContainer
        errors={errors}
        onDismiss={removeError}
        autoDismiss={5000}
        position="top-right"
        maxNotifications={3}
      />
    </div>
  );
}

/**
 * Main example component
 */
export function ErrorHandlingExample() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Error Handling System Examples
          </h1>
          <p className="text-gray-600">
            Comprehensive examples of the error handling and recovery system.
          </p>
        </div>

        {/* Error Boundary Example */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            1. Error Boundary
          </h2>
          <WizardErrorBoundary
            wizardType="world"
            errorMessage="The component encountered an error. Your data has been preserved."
          >
            <ErrorProneComponent />
          </WizardErrorBoundary>
        </section>

        {/* Error Handling Hook Example */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            2. Error Handling Hook
          </h2>
          <ErrorHandlingHookExample />
        </section>

        {/* State Recovery Example */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            3. State Recovery
          </h2>
          <StateRecoveryExample />
        </section>

        {/* Error Notifications Example */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            4. Error Notifications
          </h2>
          <ErrorNotificationExample />
        </section>

        {/* Data Export/Import Example */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            5. Data Export/Import
          </h2>
          <DataExportImportPanel wizardType="world" compact={false} />
        </section>
      </div>
    </div>
  );
}

export default ErrorHandlingExample;
