/**
 * Configuration Validation Service
 * 
 * Provides validation functions for all configuration types,
 * including URL validation, parameter range checking, and
 * required field validation.
 */

import type {
  ValidationRule,
  ValidationResult,
  ValidationError,
  APIConfiguration,
  LLMConfiguration,
  ComfyUIConfiguration,
  ProjectConfiguration,
} from '../types/configuration';

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * URL validation regex pattern
 */
const URL_PATTERN = /^https?:\/\/.+/;

/**
 * Configuration validation rules
 */
export const VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'api.endpoints.*.url',
    validator: (url: string) => URL_PATTERN.test(url),
    errorMessage: 'URL must start with http:// or https://',
  },
  {
    field: 'llm.ollama.baseUrl',
    validator: (url: string) => URL_PATTERN.test(url),
    errorMessage: 'Ollama base URL must be a valid HTTP(S) URL',
  },
  {
    field: 'llm.ollama.temperature',
    validator: (temp: number) => temp >= 0 && temp <= 2,
    errorMessage: 'Temperature must be between 0 and 2',
  },
  {
    field: 'llm.ollama.maxTokens',
    validator: (tokens: number) => tokens > 0 && tokens <= 100000,
    errorMessage: 'Max tokens must be between 1 and 100000',
  },
  {
    field: 'comfyui.serverUrl',
    validator: (url: string) => URL_PATTERN.test(url),
    errorMessage: 'ComfyUI server URL must be a valid HTTP(S) URL',
  },
  {
    field: 'api.defaultTimeout',
    validator: (timeout: number) => timeout >= 1000 && timeout <= 300000,
    errorMessage: 'Timeout must be between 1000ms and 300000ms',
  },
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate URL format
 */
export function validateURL(url: string): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (!url || url.trim() === '') {
    errors.push({
      field: 'url',
      message: 'URL is required',
      severity: 'error',
    });
  } else if (!URL_PATTERN.test(url)) {
    errors.push({
      field: 'url',
      message: 'URL must start with http:// or https://',
      severity: 'error',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate temperature parameter
 */
export function validateTemperature(temperature: number): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (temperature < 0 || temperature > 2) {
    errors.push({
      field: 'temperature',
      message: 'Temperature must be between 0 and 2',
      severity: 'error',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate max tokens parameter
 */
export function validateMaxTokens(maxTokens: number): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (maxTokens <= 0 || maxTokens > 100000) {
    errors.push({
      field: 'maxTokens',
      message: 'Max tokens must be between 1 and 100000',
      severity: 'error',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate timeout parameter
 */
export function validateTimeout(timeout: number): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (timeout < 1000 || timeout > 300000) {
    errors.push({
      field: 'timeout',
      message: 'Timeout must be between 1000ms and 300000ms',
      severity: 'error',
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate API configuration
 */
export function validateAPIConfiguration(config: APIConfiguration): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate default timeout
  const timeoutResult = validateTimeout(config.defaultTimeout);
  errors.push(...timeoutResult.errors);
  
  // Validate each endpoint
  Object.entries(config.endpoints).forEach(([serviceName, endpoint]) => {
    // Validate URL
    const urlResult = validateURL(endpoint.url);
    urlResult.errors.forEach(error => {
      errors.push({
        ...error,
        field: `endpoints.${serviceName}.url`,
      });
    });
    
    // Validate timeout
    const endpointTimeoutResult = validateTimeout(endpoint.timeout);
    endpointTimeoutResult.errors.forEach(error => {
      errors.push({
        ...error,
        field: `endpoints.${serviceName}.timeout`,
      });
    });
    
    // Validate retry attempts
    if (endpoint.retryAttempts < 0 || endpoint.retryAttempts > 10) {
      errors.push({
        field: `endpoints.${serviceName}.retryAttempts`,
        message: 'Retry attempts must be between 0 and 10',
        severity: 'error',
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate LLM configuration
 */
export function validateLLMConfiguration(config: LLMConfiguration): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate provider
  const validProviders = ['ollama', 'openai', 'anthropic', 'custom'];
  if (!validProviders.includes(config.provider)) {
    errors.push({
      field: 'provider',
      message: `Provider must be one of: ${validProviders.join(', ')}`,
      severity: 'error',
    });
  }
  
  // Validate Ollama configuration
  if (config.ollama) {
    const urlResult = validateURL(config.ollama.baseUrl);
    urlResult.errors.forEach(error => {
      errors.push({
        ...error,
        field: 'ollama.baseUrl',
      });
    });
    
    const tempResult = validateTemperature(config.ollama.temperature);
    tempResult.errors.forEach(error => {
      errors.push({
        ...error,
        field: 'ollama.temperature',
      });
    });
    
    const tokensResult = validateMaxTokens(config.ollama.maxTokens);
    tokensResult.errors.forEach(error => {
      errors.push({
        ...error,
        field: 'ollama.maxTokens',
      });
    });
    
    if (!config.ollama.model || config.ollama.model.trim() === '') {
      errors.push({
        field: 'ollama.model',
        message: 'Model name is required',
        severity: 'error',
      });
    }
  }
  
  // Validate OpenAI configuration
  if (config.openai) {
    if (!config.openai.apiKey || config.openai.apiKey.trim() === '') {
      errors.push({
        field: 'openai.apiKey',
        message: 'API key is required',
        severity: 'error',
      });
    }
    
    const tempResult = validateTemperature(config.openai.temperature);
    tempResult.errors.forEach(error => {
      errors.push({
        ...error,
        field: 'openai.temperature',
      });
    });
    
    if (!config.openai.model || config.openai.model.trim() === '') {
      errors.push({
        field: 'openai.model',
        message: 'Model name is required',
        severity: 'error',
      });
    }
  }
  
  // Validate Anthropic configuration
  if (config.anthropic) {
    if (!config.anthropic.apiKey || config.anthropic.apiKey.trim() === '') {
      errors.push({
        field: 'anthropic.apiKey',
        message: 'API key is required',
        severity: 'error',
      });
    }
    
    const tempResult = validateTemperature(config.anthropic.temperature);
    tempResult.errors.forEach(error => {
      errors.push({
        ...error,
        field: 'anthropic.temperature',
      });
    });
    
    if (!config.anthropic.model || config.anthropic.model.trim() === '') {
      errors.push({
        field: 'anthropic.model',
        message: 'Model name is required',
        severity: 'error',
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ComfyUI configuration
 */
export function validateComfyUIConfiguration(config: ComfyUIConfiguration): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate servers array
  if (!config.servers || config.servers.length === 0) {
    errors.push({
      field: 'servers',
      message: 'At least one ComfyUI server must be configured',
      severity: 'error',
    });
  } else {
    config.servers.forEach((server, index) => {
      // Validate server name
      if (!server.name || server.name.trim() === '') {
        errors.push({
          field: `servers.${index}.name`,
          message: 'Server name is required',
          severity: 'error',
        });
      }

      // Validate server URL
      const urlResult = validateURL(server.serverUrl);
      urlResult.errors.forEach(error => {
        errors.push({
          ...error,
          field: `servers.${index}.serverUrl`,
        });
      });

      // Validate timeout
      const timeoutResult = validateTimeout(server.timeout);
      timeoutResult.errors.forEach(error => {
        errors.push({
          ...error,
          field: `servers.${index}.timeout`,
        });
      });
    });
  }

  // Validate default server ID
  if (!config.defaultServerId || config.defaultServerId.trim() === '') {
    errors.push({
      field: 'defaultServerId',
      message: 'Default server must be selected',
      severity: 'error',
    });
  } else if (config.servers && !config.servers.find(s => s.id === config.defaultServerId)) {
    errors.push({
      field: 'defaultServerId',
      message: 'Default server ID must reference an existing server',
      severity: 'error',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete project configuration
 */
export function validateProjectConfiguration(config: ProjectConfiguration): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate project ID
  if (!config.projectId || config.projectId.trim() === '') {
    errors.push({
      field: 'projectId',
      message: 'Project ID is required',
      severity: 'error',
    });
  }
  
  // Validate API configuration
  const apiResult = validateAPIConfiguration(config.api);
  errors.push(...apiResult.errors.map(e => ({ ...e, field: `api.${e.field}` })));
  
  // Validate LLM configuration
  const llmResult = validateLLMConfiguration(config.llm);
  errors.push(...llmResult.errors.map(e => ({ ...e, field: `llm.${e.field}` })));
  
  // Validate ComfyUI configuration
  const comfyuiResult = validateComfyUIConfiguration(config.comfyui);
  errors.push(...comfyuiResult.errors.map(e => ({ ...e, field: `comfyui.${e.field}` })));
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get validation error message for a specific field
 */
export function getFieldError(
  validationResult: ValidationResult,
  fieldName: string
): string | null {
  const error = validationResult.errors.find(e => e.field === fieldName);
  return error ? error.message : null;
}

/**
 * Check if a specific field has errors
 */
export function hasFieldError(
  validationResult: ValidationResult,
  fieldName: string
): boolean {
  return validationResult.errors.some(e => e.field === fieldName);
}
