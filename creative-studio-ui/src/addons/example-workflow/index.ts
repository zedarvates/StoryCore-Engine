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
import type { ExampleWorkflowManager } from './ExampleWorkflowManager';

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

// Export the plugin instance
export const exampleWorkflowPlugin: ExampleWorkflowPlugin = {
  name: 'Example Workflow',
  version: '1.0.0',
  description: 'Example workflow add-on for testing and demonstration',

  initialize: async () => {},
  destroy: async () => {},
  getWorkflowManager: () => {
    throw new Error('ExampleWorkflowManager not initialized');
  },
  onWorkflowStarted: () => {},
  onWorkflowCompleted: () => {},
  startWorkflow: async () => {},
  stopWorkflow: async () => {},
  getWorkflowStatus: () => ({
    isRunning: false,
    currentStep: 0,
    totalSteps: 0,
    startedAt: null,
    completedAt: null,
  }),
};

// Default export
export default exampleWorkflowPlugin;
