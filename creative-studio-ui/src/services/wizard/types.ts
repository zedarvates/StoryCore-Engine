/**
 * Wizard Service Types
 * 
 * Type definitions for wizard backend integration, connection management,
 * and wizard execution workflows.
 */

// ============================================================================
// Connection Status Types
// ============================================================================

export interface ConnectionStatus {
  connected: boolean;
  service: 'ollama' | 'comfyui';
  endpoint: string;
  error?: string;
  latency?: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// Wizard Error Types
// ============================================================================

export type WizardErrorCategory = 
  | 'connection'
  | 'validation'
  | 'generation'
  | 'filesystem'
  | 'datacontract'
  | 'timeout'
  | 'unknown';

export interface WizardErrorDetails {
  category: WizardErrorCategory;
  service?: string;
  endpoint?: string;
  originalError?: Error;
  context?: Record<string, any>;
}

export class WizardError extends Error {
  public readonly category: WizardErrorCategory;
  public readonly recoverable: boolean;
  public readonly retryable: boolean;
  public readonly details?: Record<string, any>;
  public readonly timestamp: Date;

  constructor(
    message: string,
    category: WizardErrorCategory,
    recoverable: boolean = true,
    retryable: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'WizardError';
    this.category = category;
    this.recoverable = recoverable;
    this.retryable = retryable;
    this.details = details;
    this.timestamp = new Date();

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (typeof (Error as any).captureStackTrace === 'function') {
      (Error as any).captureStackTrace(this, WizardError);
    }
  }

  /**
   * Get user-friendly error message with recovery instructions
   */
  getUserMessage(): string {
    switch (this.category) {
      case 'connection':
        return `${this.message}\n\nPlease ensure ${this.details?.service || 'the service'} is running and accessible at ${this.details?.endpoint || 'the configured endpoint'}.`;
      
      case 'validation':
        return `${this.message}\n\nPlease review your input and ensure all required fields are filled correctly.`;
      
      case 'generation':
        return `${this.message}\n\nThe generation process encountered an error. You can retry the operation or adjust your parameters.`;
      
      case 'filesystem':
        return `${this.message}\n\nPlease check file permissions and ensure the project directory is accessible.`;
      
      case 'datacontract':
        return `${this.message}\n\nThe generated data does not match the expected format. This may indicate a backend issue.`;
      
      case 'timeout':
        return `${this.message}\n\nThe operation took too long to complete. Please try again or check your network connection.`;
      
      default:
        return `${this.message}\n\nAn unexpected error occurred. Please try again.`;
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      recoverable: this.recoverable,
      retryable: this.retryable,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }
}

// ============================================================================
// Wizard Output Types
// ============================================================================

export type WizardType = 
  | 'character'
  | 'scene'
  | 'storyboard'
  | 'dialogue'
  | 'world'
  | 'style';

export interface GeneratedFile {
  path: string;
  filename: string;
  type: 'json' | 'image' | 'text';
  size?: number;
  url?: string;
}

export interface WizardMetadata {
  wizardType: WizardType;
  generatedAt: string;
  generationSeed?: number;
  modelUsed?: string;
  processingTime?: number;
  parameters?: Record<string, any>;
}

export interface WizardOutput {
  type: WizardType;
  data: any;
  files: GeneratedFile[];
  metadata: WizardMetadata;
}

// ============================================================================
// Wizard Input Types
// ============================================================================

export interface CharacterWizardInput {
  name: string;
  description: string;
  personality: string[];
  visualAttributes: {
    age: string;
    gender: string;
    appearance: string;
    clothing: string;
  };
}

export interface SceneGeneratorInput {
  concept: string;
  mood: string;
  duration: number;
  characters: string[];
  location: string;
}

export interface StoryboardInput {
  scriptText: string;
  visualStyle: string;
  pacing: 'slow' | 'medium' | 'fast';
  mode: 'replace' | 'append';
}

export interface DialogueInput {
  sceneContext: string;
  characters: string[];
  tone: string;
}

export interface WorldBuildingInput {
  name: string;
  setting: string;
  timePeriod: string;
  locations: string[];
}

export interface StyleTransferInput {
  shotId: string;
  styleReference: string | File;
}

// ============================================================================
// Backend API Types
// ============================================================================

export interface OllamaRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    num_predict?: number;
    seed?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface ComfyUIRequest {
  prompt: Record<string, any>;
  client_id: string;
}

export interface ComfyUIResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, any>;
}

export interface ComfyUIImageOutput {
  filename: string;
  subfolder: string;
  type: string;
}

// ============================================================================
// Wizard State Types
// ============================================================================

export interface WizardState {
  wizardId: string;
  currentStep: number;
  totalSteps: number;
  formData: Record<string, any>;
  connectionStatus: {
    ollama: ConnectionStatus;
    comfyui: ConnectionStatus;
  };
  generationStatus: {
    inProgress: boolean;
    progress: number;
    stage: string;
    error?: WizardError;
  };
  preservedData?: {
    timestamp: string;
    data: Record<string, any>;
  };
}

// ============================================================================
// Logging Types
// ============================================================================

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: string;
  message: string;
  details?: Record<string, any>;
  error?: Error | WizardError;
}

export interface LogFilter {
  level?: 'debug' | 'info' | 'warn' | 'error';
  category?: string;
  startTime?: Date;
  endTime?: Date;
}
