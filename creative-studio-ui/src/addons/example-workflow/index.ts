// ============================================================================
// Example Workflow Add-on
// ============================================================================

// Core types
export type {
  WorkflowStep,
  WorkflowConfig,
  WorkflowState,
  WorkflowOperation,
} from './types';

// Import types for internal use
import type { WorkflowStep, WorkflowConfig, WorkflowState, WorkflowOperation } from './types';

// Import implementation
export { ExampleWorkflowManager } from './ExampleWorkflowManager';

// Plugin interface
export interface ExampleWorkflowPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Core functionality
  getWorkflowManager(): ExampleWorkflowManager;

  // Integration hooks
  onWorkflowStarted(workflowId: string): void;
  onWorkflowCompleted(workflowId: string): void;

  // API for workflow operations
  startWorkflow(workflowId: string): Promise<void>;
  stopWorkflow(workflowId: string): Promise<void>;
  getWorkflowStatus(workflowId: string): WorkflowState;
}

// Placeholder for ExampleWorkflowManager
export interface ExampleWorkflowManager {
  // Core methods
  startWorkflow(workflowId: string): Promise<void>;
  stopWorkflow(workflowId: string): Promise<void>;
  getWorkflowStatus(workflowId: string): WorkflowState;
  getConfig(): WorkflowConfig;
  setConfig(config: Partial<WorkflowConfig>): void;

  // Workflow operations
  executeStep(workflowId: string, stepId: string): Promise<any>;
  getWorkflowLogs(workflowId: string): Promise<string[]>;
  clearWorkflowLogs(workflowId: string): Promise<void>;

  // State management
  serialize(): string;
  deserialize(data: string): void;
}

// Export the plugin instance
let exampleWorkflowManagerInstance: ExampleWorkflowManager | null = null;

export const exampleWorkflowPlugin: ExampleWorkflowPlugin = {
  name: 'Example Workflow',
  version: '1.0.0',
  description: 'Example workflow add-on for testing and demonstration',

  initialize: async () => {
    // Initialize example workflow manager
    exampleWorkflowManagerInstance = {
      startWorkflow: async (workflowId) => {},
      stopWorkflow: async (workflowId) => {},
      getWorkflowStatus: (workflowId) => ({
        isRunning: false,
        currentStep: 0,
        totalSteps: 0,
        startedAt: null,
        completedAt: null,
      }),
      getConfig: () => ({
        autoAdvance: true,
        stepTimeout: 5000,
        maxRetries: 3,
      }),
      setConfig: (config) => {},
      executeStep: async (workflowId, stepId) => ({}),
      getWorkflowLogs: async (workflowId) => [],
      clearWorkflowLogs: async (workflowId) => {},
      serialize: () => JSON.stringify({}),
      deserialize: (data) => {},
    };
  },

  destroy: async () => {
    exampleWorkflowManagerInstance = null;
  },

  getWorkflowManager: () => {
    if (!exampleWorkflowManagerInstance) {
      throw new Error('ExampleWorkflowManager not initialized. Call initialize() first.');
    }
    return exampleWorkflowManagerInstance;
  },

  onWorkflowStarted: (workflowId) => {},
  onWorkflowCompleted: (workflowId) => {},

  startWorkflow: async (workflowId) => {
    await exampleWorkflowManagerInstance?.startWorkflow(workflowId);
  },

  stopWorkflow: async (workflowId) => {
    await exampleWorkflowManagerInstance?.stopWorkflow(workflowId);
  },

  getWorkflowStatus: (workflowId) => {
    return exampleWorkflowManagerInstance?.getWorkflowStatus(workflowId) || {
      isRunning: false,
      currentStep: 0,
      totalSteps: 0,
      startedAt: null,
      completedAt: null,
    };
  },
};

// Default export
export default exampleWorkflowPlugin;