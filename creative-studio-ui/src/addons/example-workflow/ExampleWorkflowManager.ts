// ============================================================================
// Example Workflow Manager Implementation
// ============================================================================

import type {
  WorkflowStep,
  WorkflowConfig,
  WorkflowState,
  WorkflowOperation,
  ExampleWorkflowState,
} from './types';

export class ExampleWorkflowManager {
  private config: WorkflowConfig;
  private workflows: Record<string, WorkflowState> = {};
  private operations: WorkflowOperation[] = [];
  private readonly MAX_OPERATIONS_SIZE = 100;

  constructor() {
    this.config = {
      autoAdvance: true,
      stepTimeout: 5000,
      maxRetries: 3,
    };
  }

  /**
   * Start a workflow
   */
  async startWorkflow(workflowId: string): Promise<void> {
    this.workflows[workflowId] = {
      isRunning: true,
      currentStep: 0,
      totalSteps: 5, // Example: 5 steps
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    this.recordOperation('start', `Workflow started: ${workflowId}`, workflowId);
  }

  /**
   * Stop a workflow
   */
  async stopWorkflow(workflowId: string): Promise<void> {
    if (this.workflows[workflowId]) {
      this.workflows[workflowId] = {
        ...this.workflows[workflowId],
        isRunning: false,
        completedAt: new Date().toISOString(),
      };

      this.recordOperation('stop', `Workflow stopped: ${workflowId}`, workflowId);
    }
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(workflowId: string): WorkflowState {
    return this.workflows[workflowId] || {
      isRunning: false,
      currentStep: 0,
      totalSteps: 0,
      startedAt: null,
      completedAt: null,
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): WorkflowConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<WorkflowConfig>): void {
    this.config = { ...this.config, ...config };
    this.recordOperation('config', 'Configuration updated', undefined, undefined, { config });
  }

  /**
   * Execute a workflow step
   */
  async executeStep(workflowId: string, stepId: string): Promise<any> {
    const workflow = this.workflows[workflowId];
    if (workflow && workflow.isRunning) {
      // In a real implementation, this would execute the actual step
      workflow.currentStep++;
      this.recordOperation('step', `Executed step: ${stepId}`, workflowId, stepId);

      return { success: true, stepId, result: `Step "${stepId}" executed` };
    }

    return { success: false, error: 'Workflow not running' };
  }

  /**
   * Get workflow logs
   */
  async getWorkflowLogs(workflowId: string): Promise<string[]> {
    return this.operations
      .filter(op => op.workflowId === workflowId)
      .map(op => `${op.timestamp} - ${op.description}`);
  }

  /**
   * Clear workflow logs
   */
  async clearWorkflowLogs(workflowId: string): Promise<void> {
    this.operations = this.operations.filter(op => op.workflowId !== workflowId);
    this.recordOperation('config', `Workflow logs cleared: ${workflowId}`, workflowId);
  }

  /**
   * Serialize manager state
   */
  serialize(): string {
    const state: ExampleWorkflowState = {
      config: this.config,
      workflows: this.workflows,
      operations: this.operations,
      version: '1.0',
      lastModified: new Date().toISOString(),
    };

    return JSON.stringify(state, null, 2);
  }

  /**
   * Deserialize manager state
   */
  deserialize(data: string): void {
    try {
      const state = JSON.parse(data);
      if (this.isValidExampleWorkflowState(state)) {
        this.config = state.config;
        this.workflows = state.workflows || {};
        this.operations = state.operations || [];
      } else {
        console.warn('Invalid example workflow state format');
      }
    } catch (error) {
      console.error('Failed to deserialize example workflow state:', error);
    }
  }

  /**
   * Get operation history
   */
  getOperations(): WorkflowOperation[] {
    return [...this.operations];
  }

  /**
   * Clear operation history
   */
  clearOperations(): void {
    this.operations = [];
  }

  /**
   * Record an operation
   */
  private recordOperation(
    type: WorkflowOperation['type'],
    description: string,
    workflowId?: string,
    stepId?: string,
    details?: unknown
  ): void {
    const operation: WorkflowOperation = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date().toISOString(),
      description,
      workflowId,
      stepId,
      details,
    };

    this.operations.push(operation);

    // Maintain maximum operations size
    if (this.operations.length > this.MAX_OPERATIONS_SIZE) {
      this.operations.shift();
    }
  }

  /**
   * Validate example workflow state
   */
  private isValidExampleWorkflowState(state: unknown): state is ExampleWorkflowState {
    return (
      state !== null &&
      typeof state === 'object' &&
      (state as any).config &&
      typeof (state as any).version === 'string' &&
      typeof (state as any).lastModified === 'string'
    );
  }

  /**
   * Get workflow progress
   */
  getWorkflowProgress(workflowId: string): {
    progress: number;
    completed: boolean;
  } {
    const workflow = this.workflows[workflowId];
    if (!workflow) return { progress: 0, completed: false };

    const progress = workflow.totalSteps > 0
      ? (workflow.currentStep / workflow.totalSteps) * 100
      : 0;

    return {
      progress,
      completed: workflow.currentStep >= workflow.totalSteps,
    };
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.config = {
      autoAdvance: true,
      stepTimeout: 5000,
      maxRetries: 3,
    };

    this.recordOperation('config', 'Configuration reset to defaults');
  }

  /**
   * Get workflow analytics
   */
  getWorkflowAnalytics(): {
    activeWorkflows: number;
    completedWorkflows: number;
    operationCount: number;
  } {
    const activeWorkflows = Object.values(this.workflows).filter(w => w.isRunning).length;
    const completedWorkflows = Object.values(this.workflows).filter(w => !w.isRunning && w.completedAt).length;

    return {
      activeWorkflows,
      completedWorkflows,
      operationCount: this.operations.length,
    };
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Record<string, WorkflowState> {
    return { ...this.workflows };
  }

  /**
   * Remove a workflow
   */
  removeWorkflow(workflowId: string): void {
    delete this.workflows[workflowId];
    this.operations = this.operations.filter(op => op.workflowId !== workflowId);
    this.recordOperation('stop', `Workflow removed: ${workflowId}`, workflowId);
  }
}

