/**
 * Error Handling Module
 * 
 * Provides comprehensive error message generation with recovery instructions,
 * error categorization, and actionable guidance for users.
 * 
 * Requirements: 1.3, 1.4, 13.1, 13.3, 13.7
 */

import { WizardError, type WizardErrorCategory } from './types';

/**
 * Error message template
 */
export interface ErrorMessageTemplate {
  title: string;
  description: string;
  recoveryInstructions: string[];
  technicalDetails?: string;
  actionable: boolean;
}

/**
 * Error context for message generation
 */
export interface ErrorContext {
  service?: string;
  endpoint?: string;
  operation?: string;
  details?: Record<string, unknown>;
}

/**
 * Generate comprehensive error message with recovery instructions
 * 
 * Requirements: 1.3, 1.4, 13.1, 13.3, 13.7
 */
export function generateErrorMessage(
  error: WizardError,
  context?: ErrorContext
): ErrorMessageTemplate {
  const category = error.category;
  const service = (context?.service || error.details?.service) as string | undefined;
  const endpoint = (context?.endpoint || error.details?.endpoint) as string | undefined;
  const operation = context?.operation;

  switch (category) {
    case 'connection':
      return generateConnectionErrorMessage(error, service, endpoint);

    case 'validation':
      return generateValidationErrorMessage(error, context);

    case 'generation':
      return generateGenerationErrorMessage(error, service, operation);

    case 'filesystem':
      return generateFilesystemErrorMessage(error, context);

    case 'datacontract':
      return generateDataContractErrorMessage(error, context);

    case 'timeout':
      return generateTimeoutErrorMessage(error, service, operation);

    default:
      return generateUnknownErrorMessage(error, context);
  }
}

/**
 * Generate connection error message
 * 
 * Requirements: 1.3, 1.4
 */
function generateConnectionErrorMessage(
  error: WizardError,
  service?: string,
  endpoint?: string
): ErrorMessageTemplate {
  const serviceName = service || 'Backend Service';
  const serviceEndpoint = endpoint || 'the configured endpoint';

  let recoveryInstructions: string[] = [];

  if (service === 'ollama' || serviceName.toLowerCase().includes('ollama')) {
    recoveryInstructions = [
      'Ensure Ollama is installed on your system',
      'Start Ollama by running: ollama serve',
      'Verify Ollama is running by visiting http://localhost:11434 in your browser',
      'Check that no firewall is blocking port 11434',
      'If using a custom endpoint, verify the endpoint URL is correct',
    ];
  } else if (service === 'comfyui' || serviceName.toLowerCase().includes('comfyui')) {
    recoveryInstructions = [
      'Ensure ComfyUI is installed and configured',
      'Start ComfyUI by running: python main.py (from ComfyUI directory)',
      'Verify ComfyUI is running by visiting http://localhost:8188 in your browser',
      'Check that no firewall is blocking port 8188',
      'If using a custom endpoint, verify the endpoint URL is correct',
      'Ensure ComfyUI has the required models installed',
    ];
  } else {
    recoveryInstructions = [
      `Ensure ${serviceName} is running and accessible`,
      `Verify the service endpoint: ${serviceEndpoint}`,
      'Check your network connection',
      'Verify no firewall is blocking the connection',
      'Try restarting the service',
    ];
  }

  return {
    title: `Cannot Connect to ${serviceName}`,
    description: `Failed to establish connection to ${serviceName} at ${serviceEndpoint}. ${error.message}`,
    recoveryInstructions,
    technicalDetails: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    actionable: true,
  };
}

/**
 * Generate validation error message
 * 
 * Requirements: 13.1
 */
function generateValidationErrorMessage(
  error: WizardError,
  context?: ErrorContext
): ErrorMessageTemplate {
  const validationErrors = (error.details?.errors || []) as string[];
  const fieldName = error.details?.field;

  const recoveryInstructions: string[] = [
    'Review all form fields and ensure they are filled correctly',
  ];

  if (validationErrors.length > 0) {
    recoveryInstructions.push('Fix the following validation errors:');
    validationErrors.forEach((err: string) => {
      recoveryInstructions.push(`  • ${err}`);
    });
  }

  if (fieldName) {
    recoveryInstructions.push(`Check the "${fieldName}" field for errors`);
  }

  recoveryInstructions.push('Ensure all required fields are filled');
  recoveryInstructions.push('Verify that field values meet the specified format requirements');

  return {
    title: 'Validation Error',
    description: error.message,
    recoveryInstructions,
    technicalDetails: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    actionable: true,
  };
}

/**
 * Generate generation error message
 * 
 * Requirements: 13.1, 13.3
 */
function generateGenerationErrorMessage(
  error: WizardError,
  service?: string,
  operation?: string
): ErrorMessageTemplate {
  const serviceName = service || 'the generation service';
  const operationName = operation || 'content generation';

  const recoveryInstructions: string[] = [
    `Verify ${serviceName} is running and responsive`,
    'Check that the service has sufficient resources (CPU, memory, GPU)',
    'Try simplifying your input parameters',
    'Retry the operation - temporary service issues may resolve',
  ];

  if (service === 'ollama' || serviceName.toLowerCase().includes('ollama')) {
    recoveryInstructions.push('Ensure the selected model is downloaded: ollama pull <model-name>');
    recoveryInstructions.push('Try using a different model if the current one is not responding');
    recoveryInstructions.push('Check Ollama logs for detailed error information');
  } else if (service === 'comfyui' || serviceName.toLowerCase().includes('comfyui')) {
    recoveryInstructions.push('Verify all required ComfyUI nodes are installed');
    recoveryInstructions.push('Check that the required models are present in ComfyUI/models/');
    recoveryInstructions.push('Review ComfyUI console output for detailed error messages');
    recoveryInstructions.push('Ensure ComfyUI has sufficient VRAM for the operation');
  }

  return {
    title: `${operationName} Failed`,
    description: `The ${operationName} process encountered an error: ${error.message}`,
    recoveryInstructions,
    technicalDetails: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    actionable: true,
  };
}

/**
 * Generate filesystem error message
 * 
 * Requirements: 13.1, 13.7
 */
function generateFilesystemErrorMessage(
  error: WizardError,
  context?: ErrorContext
): ErrorMessageTemplate {
  const filePath = (error.details?.path || error.details?.filename || 'the file') as string;
  const operation = (context?.operation || error.details?.operation || 'file operation') as string;

  const recoveryInstructions: string[] = [
    'Check that you have the necessary file permissions',
    'Verify the project directory exists and is accessible',
    'Ensure there is sufficient disk space available',
    'Check that the file path is valid and not too long',
  ];

  if (operation.includes('write') || operation.includes('save')) {
    recoveryInstructions.push('Verify you have write permissions for the target directory');
    recoveryInstructions.push('Check that the file is not locked by another application');
  } else if (operation.includes('read') || operation.includes('load')) {
    recoveryInstructions.push('Verify the file exists at the specified path');
    recoveryInstructions.push('Check that you have read permissions for the file');
  }

  return {
    title: 'File System Error',
    description: `Failed to perform ${operation} on ${filePath}: ${error.message}`,
    recoveryInstructions,
    technicalDetails: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    actionable: true,
  };
}

/**
 * Generate data contract error message
 * 
 * Requirements: 13.1
 */
function generateDataContractErrorMessage(
  error: WizardError,
  context?: ErrorContext
): ErrorMessageTemplate {
  const validationErrors = (error.details?.errors || []) as string[];

  const recoveryInstructions: string[] = [
    'This error indicates a backend data format issue',
    'The generated content does not match the expected schema',
  ];

  if (validationErrors.length > 0) {
    recoveryInstructions.push('Schema validation errors:');
    validationErrors.forEach((err: string) => {
      recoveryInstructions.push(`  • ${err}`);
    });
  }

  recoveryInstructions.push('Try regenerating the content');
  recoveryInstructions.push('If the issue persists, this may indicate a backend configuration problem');
  recoveryInstructions.push('Contact support if you continue to see this error');

  return {
    title: 'Data Format Error',
    description: `The generated data does not comply with the expected format: ${error.message}`,
    recoveryInstructions,
    technicalDetails: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    actionable: false,
  };
}

/**
 * Generate timeout error message
 * 
 * Requirements: 13.1, 13.3
 */
function generateTimeoutErrorMessage(
  error: WizardError,
  service?: string,
  operation?: string
): ErrorMessageTemplate {
  const serviceName = service || 'the service';
  const operationName = operation || 'operation';
  const timeoutMs = error.details?.timeoutMs || 'the configured timeout';

  const recoveryInstructions: string[] = [
    `The ${operationName} took longer than ${timeoutMs}ms to complete`,
    'Check your network connection speed and stability',
    `Verify ${serviceName} is responding normally`,
    'Try the operation again - it may complete successfully on retry',
    'Consider simplifying your request to reduce processing time',
  ];

  if (service === 'comfyui' || serviceName.toLowerCase().includes('comfyui')) {
    recoveryInstructions.push('Image generation can take time - ensure ComfyUI is not overloaded');
    recoveryInstructions.push('Check ComfyUI queue status to see if other jobs are running');
  }

  return {
    title: 'Operation Timeout',
    description: `The ${operationName} timed out after waiting ${timeoutMs}ms: ${error.message}`,
    recoveryInstructions,
    technicalDetails: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    actionable: true,
  };
}

/**
 * Generate unknown error message
 * 
 * Requirements: 13.1
 */
function generateUnknownErrorMessage(
  error: WizardError,
  context?: ErrorContext
): ErrorMessageTemplate {
  const recoveryInstructions: string[] = [
    'An unexpected error occurred',
    'Try the operation again',
    'If the error persists, try restarting the application',
    'Check the browser console for additional error details',
    'Contact support if you continue to experience this issue',
  ];

  return {
    title: 'Unexpected Error',
    description: error.message || 'An unknown error occurred',
    recoveryInstructions,
    technicalDetails: error.details ? JSON.stringify(error.details, null, 2) : undefined,
    actionable: false,
  };
}

/**
 * Format error message for display
 * 
 * @param template - Error message template
 * @param includeDetails - Whether to include technical details
 * @returns Formatted error message string
 */
export function formatErrorMessage(
  template: ErrorMessageTemplate,
  includeDetails: boolean = false
): string {
  let message = `${template.title}\n\n${template.description}\n\n`;

  if (template.recoveryInstructions.length > 0) {
    message += 'How to resolve:\n';
    template.recoveryInstructions.forEach((instruction) => {
      message += `${instruction}\n`;
    });
  }

  if (includeDetails && template.technicalDetails) {
    message += `\nTechnical Details:\n${template.technicalDetails}`;
  }

  return message;
}

/**
 * Create a user-friendly error from a WizardError
 * 
 * @param error - WizardError instance
 * @param context - Additional error context
 * @returns Formatted error message template
 */
export function createUserFriendlyError(
  error: WizardError,
  context?: ErrorContext
): ErrorMessageTemplate {
  return generateErrorMessage(error, context);
}

/**
 * Get recovery actions for an error
 * 
 * @param error - WizardError instance
 * @returns Array of recovery action descriptions
 */
export function getRecoveryActions(error: WizardError): string[] {
  const template = generateErrorMessage(error);
  return template.recoveryInstructions;
}

/**
 * Check if an error is actionable by the user
 * 
 * @param error - WizardError instance
 * @returns True if user can take action to resolve the error
 */
export function isErrorActionable(error: WizardError): boolean {
  const template = generateErrorMessage(error);
  return template.actionable;
}

