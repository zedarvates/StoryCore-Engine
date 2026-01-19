// Configuration type definitions for Central Configuration UI

// Main configuration interfaces
export interface ProjectConfiguration {
  projectId: string;
  api: APIConfiguration;
  llm: LLMConfiguration;
  comfyui: ComfyUIConfiguration;
  wizards: WizardConfiguration[];
}

export interface GlobalConfiguration {
  defaultLLMProvider: string;
  defaultAPITimeout: number;
  theme: 'light' | 'dark';
  enableAnalytics: boolean;
}

// Specific configuration interfaces
export interface APIConfiguration {
  endpoints: {
    [serviceName: string]: {
      url: string;
      apiKey?: string;
      timeout: number;
      retryAttempts: number;
    };
  };
  defaultTimeout: number;
  enableLogging: boolean;
}

export interface LLMConfiguration {
  provider: 'ollama' | 'openai' | 'anthropic' | 'custom';
  ollama?: {
    baseUrl: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  openai?: {
    apiKey: string;
    model: string;
    temperature: number;
  };
  defaultProvider: string;
  enableFallback: boolean;
}

export interface ComfyUIConfiguration {
  serverUrl: string;
  apiKey?: string;
  defaultWorkflows: {
    [taskType: string]: string; // taskType -> workflow ID
  };
  timeout: number;
  enableQueueMonitoring: boolean;
}

// Wizard-related interfaces
export interface WizardDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  requiredConfig?: string[];
}

export interface WizardConfiguration {
  wizardId: string;
  enabled: boolean;
  customSettings?: Record<string, any>;
}

// Validation rule interfaces
export interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  errorMessage: string;
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConnectionError {
  service: string;
  url: string;
  errorType: 'timeout' | 'unreachable' | 'auth_failed';
  message: string;
}

export interface PersistenceError {
  operation: 'save' | 'load';
  location: string;
  errorType: 'permission' | 'quota' | 'corruption' | 'not_found';
  message: string;
}

export interface IntegrationError {
  component: string;
  expectedInterface: string;
  actualInterface: string;
  message: string;
}

// Wizard launch context
export interface ProjectContext {
  projectId: string;
  projectName: string;
  projectConfig: ProjectConfiguration;
}

// Utility types
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  status: 'active' | 'idle' | 'processing';
}