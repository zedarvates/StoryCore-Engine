// ============================================================================
// Example Workflow Types
// ============================================================================

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: 'action' | 'decision' | 'wait' | 'parallel';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WorkflowConfig {
  autoAdvance: boolean;
  stepTimeout: number; // Milliseconds
  maxRetries: number;
}

export interface WorkflowState {
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WorkflowOperation {
  id: string;
  type: 'start' | 'stop' | 'step' | 'config';
  timestamp: string;
  description: string;
  workflowId?: string;
  stepId?: string;
  details?: unknown;
}

export interface ExampleWorkflowState {
  config: WorkflowConfig;
  workflows: Record<string, WorkflowState>;
  operations: WorkflowOperation[];
  version: string;
  lastModified: string;
}
