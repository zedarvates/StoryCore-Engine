/**
 * Configuration Type Definitions for Central Configuration UI
 * 
 * This file defines all TypeScript interfaces for configuration management,
 * validation rules, and error types used throughout the application.
 */

// ============================================================================
// Core Configuration Interfaces
// ============================================================================

/**
 * API Configuration for external service endpoints
 */
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

/**
 * LLM Configuration for language model providers
 */
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
    maxTokens?: number;
  };
  anthropic?: {
    apiKey: string;
    model: string;
    temperature: number;
    maxTokens?: number;
  };
  custom?: {
    baseUrl: string;
    apiKey?: string;
    model: string;
    // Using 'any' for custom provider properties to support arbitrary LLM provider configurations
    [key: string]: any;
  };
  defaultProvider: string;
  enableFallback: boolean;
}

/**
 * ComfyUI Server configuration
 */
export interface ComfyUIServer {
  id: string; // Unique identifier (UUID)
  name: string; // Display name (e.g., "Localhost", "GPU Server")
  serverUrl: string; // ComfyUI server URL
  apiKey?: string; // Optional API key for authentication
  timeout: number; // Connection timeout in milliseconds
  enableQueueMonitoring: boolean; // Enable queue status monitoring
  availableWorkflows?: string[]; // Workflows fetched from server
  lastTested?: Date; // Last connection test timestamp
  status?: 'connected' | 'disconnected' | 'unknown'; // Connection status
  errorMessage?: string; // Error message from last connection attempt (e.g., CORS errors)
}

/**
 * ComfyUI Configuration for image generation backend
 */
export interface ComfyUIConfiguration {
  servers: ComfyUIServer[]; // Array of configured servers
  defaultServerId: string; // ID of the default server
  workflowAssignments: {
    [taskType: string]: string; // taskType -> serverId mapping
  };
}

/**
 * Wizard Configuration for creative wizards
 */
export interface WizardConfiguration {
  wizardId: string;
  enabled: boolean;
  customSettings?: Record<string, any>;
}

/**
 * Project-specific configuration
 */
export interface ProjectConfiguration {
  projectId: string;
  api: APIConfiguration;
  llm: LLMConfiguration;
  comfyui: ComfyUIConfiguration;
  wizards: WizardConfiguration[];
}

/**
 * Global user preferences
 */
export interface GlobalConfiguration {
  defaultLLMProvider: string;
  defaultAPITimeout: number;
  theme: 'light' | 'dark';
  enableAnalytics: boolean;
}

/**
 * Project metadata
 */
export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  lastModified: string;
  status: 'active' | 'idle' | 'processing';
}

// ============================================================================
// Validation Interfaces
// ============================================================================

/**
 * Validation rule definition
 */
export interface ValidationRule {
  field: string;
  // Using 'any' for validator input to support validation of any field type
  validator: (value: any) => boolean;
  errorMessage: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// Error Type Interfaces
// ============================================================================

/**
 * Connection error details
 */
export interface ConnectionError {
  service: string;
  url: string;
  errorType: 'timeout' | 'unreachable' | 'auth_failed';
  message: string;
}

/**
 * Persistence error details
 */
export interface PersistenceError {
  operation: 'save' | 'load';
  location: string;
  errorType: 'permission' | 'quota' | 'corruption' | 'not_found';
  message: string;
}

/**
 * Integration error details
 */
export interface IntegrationError {
  component: string;
  expectedInterface: string;
  actualInterface: string;
  message: string;
}

// ============================================================================
// Wizard Interfaces
// ============================================================================

/**
 * Wizard definition
 */
export interface WizardDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  requiredConfig?: string[];
  requiresCharacters?: boolean; // Wizard needs characters to function (Requirement 4.4)
  requiresShots?: boolean; // Wizard needs shots to function (Requirement 4.4)
}

/**
 * Wizard context passed to launched wizards
 */
export interface WizardContext {
  projectId: string;
  projectName: string;
  projectConfig: ProjectConfiguration;
}

// ============================================================================
// Configuration Context Interfaces
// ============================================================================

/**
 * Configuration context value provided to components
 */
export interface ConfigurationContextValue {
  // Configuration state
  projectConfig: ProjectConfiguration | null;
  globalConfig: GlobalConfiguration | null;
  activeProject: ProjectMetadata | null;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  
  // Actions
  loadConfiguration: (projectId: string) => Promise<void>;
  saveProjectConfig: (config: Partial<ProjectConfiguration>) => Promise<void>;
  saveGlobalConfig: (config: Partial<GlobalConfiguration>) => Promise<void>;
  // Using 'any' for config parameter to allow validation of various configuration types
  validateConfiguration: (config: any) => ValidationResult;
  resetToDefaults: (scope: 'project' | 'global') => Promise<void>;
  exportConfiguration: () => Promise<string>;
  importConfiguration: (data: string) => Promise<void>;
}

// ============================================================================
// Component Props Interfaces
// ============================================================================

/**
 * Props for CentralConfigurationUI component
 */
export interface CentralConfigurationUIProps {
  projectId: string;
  projectName: string;
  onClose?: () => void;
}

/**
 * Props for ProjectWorkspace component
 */
export interface ProjectWorkspaceProps {
  projectId: string;
  projectName: string;
  onOpenSettings: (window: 'api' | 'llm' | 'comfyui') => void;
}

/**
 * Props for WizardLauncher component
 */
export interface WizardLauncherProps {
  availableWizards: WizardDefinition[];
  onLaunchWizard: (wizardId: string) => void;
}

/**
 * Props for APISettingsWindow component
 */
export interface APISettingsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: APIConfiguration) => Promise<void>;
}

/**
 * Props for LLMConfigurationWindow component
 */
export interface LLMConfigurationWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: LLMConfiguration) => Promise<void>;
}

/**
 * Props for ComfyUIConfigurationWindow component
 */
export interface ComfyUIConfigurationWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ComfyUIConfiguration) => Promise<void>;
}

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default API configuration
 */
export const DEFAULT_API_CONFIG: APIConfiguration = {
  endpoints: {},
  defaultTimeout: 30000,
  enableLogging: false,
};

/**
 * Default LLM configuration
 */
export const DEFAULT_LLM_CONFIG: LLMConfiguration = {
  provider: 'ollama',
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'gemma3:1b',
    temperature: 0.7,
    maxTokens: 2048,
  },
  defaultProvider: 'ollama',
  enableFallback: false,
};

/**
 * Default ComfyUI configuration
 */
export const DEFAULT_COMFYUI_CONFIG: ComfyUIConfiguration = {
  servers: [{
    id: 'default-localhost',
    name: 'Localhost',
    serverUrl: 'http://localhost:8188',
    timeout: 60000,
    enableQueueMonitoring: true,
  }],
  defaultServerId: 'default-localhost',
  workflowAssignments: {},
};

/**
 * Default global configuration
 */
export const DEFAULT_GLOBAL_CONFIG: GlobalConfiguration = {
  defaultLLMProvider: 'ollama',
  defaultAPITimeout: 30000,
  theme: 'dark',
  enableAnalytics: false,
};
