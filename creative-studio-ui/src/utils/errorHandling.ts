/**
 * Error Handling Utilities
 * 
 * Provides comprehensive error categorization, recovery strategies,
 * and user guidance for the generation pipeline.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

/**
 * Error categories for generation pipeline
 */
export const ErrorCategory = {
  SERVICE_UNAVAILABLE: 'service_unavailable',
  VALIDATION: 'validation',
  GENERATION: 'generation',
  TIMEOUT: 'timeout',
  FILE_SYSTEM: 'file_system',
  NETWORK: 'network',
  UNKNOWN: 'unknown',
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

/**
 * Recovery strategy types
 */
export const RecoveryStrategy = {
  RETRY: 'retry',
  RETRY_WITH_BACKOFF: 'retry_with_backoff',
  ADJUST_PARAMETERS: 'adjust_parameters',
  FALLBACK: 'fallback',
  USER_ACTION_REQUIRED: 'user_action_required',
  NONE: 'none',
} as const;

export type RecoveryStrategy = typeof RecoveryStrategy[keyof typeof RecoveryStrategy];

/**
 * Categorized error interface
 */
export interface CategorizedError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  originalError: Error;
  userMessage: string;
  technicalDetails: string;
  recoveryStrategy: RecoveryStrategy;
  troubleshootingSteps: string[];
  canRetry: boolean;
  retryDelay?: number;
  suggestedParameters?: Record<string, unknown>;
}

/**
 * Error recovery result
 */
export interface RecoveryResult {
  success: boolean;
  message: string;
  shouldRetry: boolean;
  retryDelay?: number;
  adjustedParameters?: Record<string, unknown>;
}

/**
 * Error categorization patterns
 */
const ERROR_PATTERNS = {
  [ErrorCategory.SERVICE_UNAVAILABLE]: [
    /service.*unavailable/i,
    /connection.*refused/i,
    /ECONNREFUSED/i,
    /not.*configured/i,
    /server.*not.*responding/i,
    /ComfyUI.*not.*available/i,
    /TTS.*service.*unavailable/i,
  ],
  [ErrorCategory.VALIDATION]: [
    /invalid.*parameter/i,
    /validation.*failed/i,
    /out.*of.*range/i,
    /required.*field/i,
    /must.*be/i,
    /cannot.*be.*empty/i,
  ],
  [ErrorCategory.GENERATION]: [
    /generation.*failed/i,
    /workflow.*error/i,
    /processing.*error/i,
    /model.*error/i,
    /inference.*failed/i,
  ],
  [ErrorCategory.TIMEOUT]: [
    /timeout/i,
    /timed.*out/i,
    /exceeded.*time/i,
    /took.*too.*long/i,
  ],
  [ErrorCategory.FILE_SYSTEM]: [
    /ENOENT/i,
    /EACCES/i,
    /EPERM/i,
    /disk.*space/i,
    /permission.*denied/i,
    /file.*not.*found/i,
    /cannot.*write/i,
    /cannot.*read/i,
  ],
  [ErrorCategory.NETWORK]: [
    /network.*error/i,
    /fetch.*failed/i,
    /ETIMEDOUT/i,
    /ENETUNREACH/i,
  ],
};

/**
 * Categorize an error based on its message and type
 * 
 * Requirement: 8.1
 */
export function categorizeError(error: Error): CategorizedError {
  const errorMessage = error.message.toLowerCase();
  
  // Determine category
  let category: ErrorCategory = ErrorCategory.UNKNOWN;
  for (const [cat, patterns] of Object.entries(ERROR_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(errorMessage))) {
      category = cat as ErrorCategory;
      break;
    }
  }
  
  // Determine severity based on category
  const severity = getSeverityForCategory(category);
  
  // Determine recovery strategy
  const recoveryStrategy = getRecoveryStrategy(category, error);
  
  // Generate user-friendly message
  const userMessage = generateUserMessage(category, error);
  
  // Generate troubleshooting steps
  const troubleshootingSteps = generateTroubleshootingSteps(category, error);
  
  // Determine if retry is possible
  const canRetry = determineRetryability(category, recoveryStrategy);
  
  // Calculate retry delay if applicable
  const retryDelay = canRetry ? calculateRetryDelay(category) : undefined;
  
  return {
    category,
    severity,
    message: error.message,
    originalError: error,
    userMessage,
    technicalDetails: error.stack || error.message,
    recoveryStrategy,
    troubleshootingSteps,
    canRetry,
    retryDelay,
  };
}

/**
 * Get severity level for error category
 */
function getSeverityForCategory(category: ErrorCategory): ErrorSeverity {
  switch (category) {
    case ErrorCategory.SERVICE_UNAVAILABLE:
      return ErrorSeverity.HIGH;
    case ErrorCategory.VALIDATION:
      return ErrorSeverity.LOW;
    case ErrorCategory.GENERATION:
      return ErrorSeverity.MEDIUM;
    case ErrorCategory.TIMEOUT:
      return ErrorSeverity.MEDIUM;
    case ErrorCategory.FILE_SYSTEM:
      return ErrorSeverity.HIGH;
    case ErrorCategory.NETWORK:
      return ErrorSeverity.MEDIUM;
    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * Determine recovery strategy for error
 * 
 * Requirement: 8.2
 */
function getRecoveryStrategy(category: ErrorCategory, error: Error): RecoveryStrategy {
  switch (category) {
    case ErrorCategory.SERVICE_UNAVAILABLE:
      return RecoveryStrategy.USER_ACTION_REQUIRED;
    
    case ErrorCategory.VALIDATION:
      return RecoveryStrategy.ADJUST_PARAMETERS;
    
    case ErrorCategory.GENERATION:
      // Check if it's a parameter-related generation error
      if (/parameter|setting|config/i.test(error.message)) {
        return RecoveryStrategy.ADJUST_PARAMETERS;
      }
      return RecoveryStrategy.RETRY_WITH_BACKOFF;
    
    case ErrorCategory.TIMEOUT:
      return RecoveryStrategy.RETRY;
    
    case ErrorCategory.FILE_SYSTEM:
      return RecoveryStrategy.USER_ACTION_REQUIRED;
    
    case ErrorCategory.NETWORK:
      return RecoveryStrategy.RETRY_WITH_BACKOFF;
    
    default:
      return RecoveryStrategy.RETRY;
  }
}

/**
 * Generate user-friendly error message
 * 
 * Requirement: 8.3
 */
function generateUserMessage(category: ErrorCategory, error: Error): string {
  switch (category) {
    case ErrorCategory.SERVICE_UNAVAILABLE:
      if (/ComfyUI/i.test(error.message)) {
        return 'ComfyUI service is not available. Please check your ComfyUI configuration and ensure the server is running.';
      }
      if (/TTS/i.test(error.message)) {
        return 'Text-to-speech service is not available. Please check your TTS configuration.';
      }
      return 'A required service is not available. Please check your configuration.';
    
    case ErrorCategory.VALIDATION:
      return 'Invalid parameters provided. Please check your input values and try again.';
    
    case ErrorCategory.GENERATION:
      return 'Generation failed. This may be due to invalid parameters or a temporary issue with the generation service.';
    
    case ErrorCategory.TIMEOUT:
      return 'The operation took too long to complete. You can try again or adjust your parameters for faster processing.';
    
    case ErrorCategory.FILE_SYSTEM:
      if (/space/i.test(error.message)) {
        return 'Insufficient disk space. Please free up some space and try again.';
      }
      if (/permission/i.test(error.message)) {
        return 'Permission denied. Please check file permissions and try again.';
      }
      return 'File system error. Please check your file permissions and available disk space.';
    
    case ErrorCategory.NETWORK:
      return 'Network error occurred. Please check your internet connection and try again.';
    
    default:
      return 'An unexpected error occurred. Please try again or contact support if the problem persists.';
  }
}

/**
 * Generate troubleshooting steps
 * 
 * Requirement: 8.3
 */
function generateTroubleshootingSteps(category: ErrorCategory, error: Error): string[] {
  switch (category) {
    case ErrorCategory.SERVICE_UNAVAILABLE:
      if (/ComfyUI/i.test(error.message)) {
        return [
          'Verify ComfyUI server is running',
          'Check ComfyUI configuration in settings',
          'Ensure the correct port is configured',
          'Test ComfyUI connection in settings panel',
          'Restart ComfyUI server if necessary',
        ];
      }
      if (/TTS/i.test(error.message)) {
        return [
          'Check TTS service configuration',
          'Verify TTS provider is selected',
          'Test TTS connection in settings',
          'Ensure required TTS dependencies are installed',
        ];
      }
      return [
        'Check service configuration',
        'Verify service is running',
        'Test connection in settings',
        'Restart the service if necessary',
      ];
    
    case ErrorCategory.VALIDATION:
      return [
        'Review the highlighted invalid parameters',
        'Check parameter ranges and constraints',
        'Ensure all required fields are filled',
        'Try using default or recommended values',
      ];
    
    case ErrorCategory.GENERATION:
      return [
        'Try reducing generation complexity (lower steps, smaller dimensions)',
        'Check if the prompt is valid and not too long',
        'Verify model is properly loaded',
        'Try again in a few moments',
        'Check ComfyUI logs for detailed error information',
      ];
    
    case ErrorCategory.TIMEOUT:
      return [
        'Reduce generation parameters (steps, dimensions)',
        'Check system resources (CPU, GPU, memory)',
        'Ensure no other heavy processes are running',
        'Try again when system is less busy',
      ];
    
    case ErrorCategory.FILE_SYSTEM:
      if (/space/i.test(error.message)) {
        return [
          'Free up disk space by deleting unnecessary files',
          'Move old projects to external storage',
          'Check available disk space in system settings',
        ];
      }
      if (/permission/i.test(error.message)) {
        return [
          'Check file and folder permissions',
          'Ensure the application has write access',
          'Try running with appropriate permissions',
          'Check if files are locked by another process',
        ];
      }
      return [
        'Check file permissions',
        'Verify disk space availability',
        'Ensure files are not locked',
        'Try saving to a different location',
      ];
    
    case ErrorCategory.NETWORK:
      return [
        'Check your internet connection',
        'Verify firewall settings',
        'Try again in a few moments',
        'Check if the service is accessible from your network',
      ];
    
    default:
      return [
        'Try the operation again',
        'Check system logs for more details',
        'Restart the application if the problem persists',
        'Contact support with error details',
      ];
  }
}

/**
 * Determine if error is retryable
 */
function determineRetryability(category: ErrorCategory, strategy: RecoveryStrategy): boolean {
  if (strategy === RecoveryStrategy.USER_ACTION_REQUIRED || strategy === RecoveryStrategy.NONE) {
    return false;
  }
  
  const retryableCategories: ErrorCategory[] = [
    ErrorCategory.GENERATION,
    ErrorCategory.TIMEOUT,
    ErrorCategory.NETWORK,
  ];
  
  return retryableCategories.includes(category);
}

/**
 * Calculate retry delay based on category
 */
function calculateRetryDelay(category: ErrorCategory): number {
  switch (category) {
    case ErrorCategory.NETWORK:
      return 2000; // 2 seconds
    case ErrorCategory.TIMEOUT:
      return 5000; // 5 seconds
    case ErrorCategory.GENERATION:
      return 3000; // 3 seconds
    default:
      return 1000; // 1 second
  }
}

/**
 * Automatic retry with exponential backoff
 * 
 * Requirement: 8.2
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxAttempts) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        onRetry?.(attempt, lastError);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Preserve state on error
 * 
 * Requirement: 8.5
 */
export interface PreservedState {
  timestamp: number;
  errorCategory: ErrorCategory;
  userInputs: Record<string, unknown>;
  generatedAssets: unknown[];
  pipelineState: unknown;
}

export function preserveStateOnError(
  error: CategorizedError,
  userInputs: Record<string, unknown>,
  generatedAssets: unknown[] = [],
  pipelineState: unknown = null
): PreservedState {
  return {
    timestamp: Date.now(),
    errorCategory: error.category,
    userInputs: { ...userInputs },
    generatedAssets: [...generatedAssets],
    pipelineState: pipelineState ? { ...pipelineState } : null,
  };
}

/**
 * Restore preserved state
 * 
 * Requirement: 8.5
 */
export function restorePreservedState(preserved: PreservedState): {
  userInputs: Record<string, unknown>;
  generatedAssets: unknown[];
  pipelineState: unknown;
} {
  return {
    userInputs: { ...preserved.userInputs },
    generatedAssets: [...preserved.generatedAssets],
    pipelineState: preserved.pipelineState ? { ...preserved.pipelineState } : null,
  };
}

/**
 * Graceful degradation handler
 * 
 * Requirement: 8.2
 */
export function handleGracefulDegradation(
  error: CategorizedError,
  fallbackOptions: {
    skipStage?: boolean;
    useDefaultParameters?: boolean;
    useCachedResult?: boolean;
  } = {}
): RecoveryResult {
  const { skipStage, useDefaultParameters, useCachedResult } = fallbackOptions;
  
  // If we can skip the stage, suggest that
  if (skipStage && error.category !== ErrorCategory.SERVICE_UNAVAILABLE) {
    return {
      success: true,
      message: 'Stage skipped due to error. You can continue with the next stage.',
      shouldRetry: false,
    };
  }
  
  // If we can use default parameters, suggest that
  if (useDefaultParameters && error.category === ErrorCategory.VALIDATION) {
    return {
      success: true,
      message: 'Using default parameters to continue.',
      shouldRetry: true,
      adjustedParameters: {}, // Would contain actual defaults
    };
  }
  
  // If we can use cached result, suggest that
  if (useCachedResult) {
    return {
      success: true,
      message: 'Using previously generated result.',
      shouldRetry: false,
    };
  }
  
  // No graceful degradation possible
  return {
    success: false,
    message: 'Cannot recover automatically. User action required.',
    shouldRetry: false,
  };
}

/**
 * Suggest parameter adjustments for generation errors
 * 
 * Requirement: 8.2
 */
export function suggestParameterAdjustments(
  error: CategorizedError,
  currentParams: Record<string, unknown>
): Record<string, unknown> | null {
  if (error.category !== ErrorCategory.GENERATION && error.category !== ErrorCategory.TIMEOUT) {
    return null;
  }
  
  const suggestions: Record<string, unknown> = {};
  
  // Reduce complexity for timeout or generation errors
  if (currentParams.steps && currentParams.steps > 20) {
    suggestions.steps = Math.max(10, Math.floor(currentParams.steps * 0.7));
  }
  
  if (currentParams.width && currentParams.width > 1024) {
    suggestions.width = 1024;
  }
  
  if (currentParams.height && currentParams.height > 1024) {
    suggestions.height = 1024;
  }
  
  if (currentParams.cfgScale && currentParams.cfgScale > 7) {
    suggestions.cfgScale = 7;
  }
  
  return Object.keys(suggestions).length > 0 ? suggestions : null;
}

/**
 * Format error for display
 */
export function formatErrorForDisplay(error: CategorizedError): {
  title: string;
  message: string;
  details: string;
  actions: Array<{ label: string; action: string }>;
} {
  const actions: Array<{ label: string; action: string }> = [];
  
  // Add retry action if applicable
  if (error.canRetry) {
    actions.push({
      label: 'Retry',
      action: 'retry',
    });
  }
  
  // Add adjust parameters action if applicable
  if (error.recoveryStrategy === RecoveryStrategy.ADJUST_PARAMETERS) {
    actions.push({
      label: 'Adjust Parameters',
      action: 'adjust_parameters',
    });
  }
  
  // Add configuration action for service unavailable
  if (error.category === ErrorCategory.SERVICE_UNAVAILABLE) {
    actions.push({
      label: 'Open Settings',
      action: 'open_settings',
    });
  }
  
  // Always add cancel action
  actions.push({
    label: 'Cancel',
    action: 'cancel',
  });
  
  return {
    title: getSeverityTitle(error.severity),
    message: error.userMessage,
    details: error.troubleshootingSteps.join('\n• '),
    actions,
  };
}

/**
 * Get title based on severity
 */
function getSeverityTitle(severity: ErrorSeverity): string {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'Input Error';
    case ErrorSeverity.MEDIUM:
      return 'Generation Error';
    case ErrorSeverity.HIGH:
      return 'Service Error';
    case ErrorSeverity.CRITICAL:
      return 'Critical Error';
    default:
      return 'Error';
  }
}



