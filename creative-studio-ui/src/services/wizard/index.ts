/**
 * Wizard Service Layer
 * 
 * Central export point for all wizard-related services, utilities, and types.
 * This module provides the infrastructure for wizard backend integration.
 */

// Export types
export * from './types';

// Export path utilities
export * from './pathUtils';

// Export logger
export * from './logger';

// Export wizard service
export * from './WizardService';

// Export Ollama client
export * from './OllamaClient';

// Export ComfyUI client
export * from './ComfyUIClient';

// Export ValidationEngine
export * from './ValidationEngine';

// Export DraftPersistence
export * from './DraftPersistence';

// Re-export commonly used types for convenience
export type {
  ConnectionStatus,
  WizardErrorCategory,
  WizardType,
  WizardOutput,
  WizardState,
  CharacterWizardInput,
  SceneGeneratorInput,
  StoryboardInput,
  DialogueInput,
  WorldBuildingInput,
  StyleTransferInput,
} from './types';

export { WizardError } from './types';
export { getLogger, createLogger, logWizardOperation } from './logger';
export { WizardService, getWizardService, createWizardService, setWizardService } from './WizardService';
