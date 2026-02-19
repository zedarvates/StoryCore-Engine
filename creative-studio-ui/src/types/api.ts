/**
 * Generic API Types
 * Reusable type definitions for API communications
 */

// ============================================================================
// Base API Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: string;
  code: number;
  details?: Record<string, unknown>;
}

export interface ApiRequest<T = unknown> {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: T;
  headers?: Record<string, string>;
}

// ============================================================================
// Task/Job Types
// ============================================================================

export interface TaskStatus {
  taskId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  message?: string;
  result?: unknown;
  error?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

export interface TaskRequest {
  taskId: string;
  project?: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string;
  name: string;
  path: string;
  version: string;
  createdAt: number; // timestamp
  modifiedAt: number; // timestamp
  config: ProjectConfig;
}

export interface ProjectConfig {
  format?: string;
  template?: string;
  settings?: Record<string, unknown>;
}

export interface ProjectCreationRequest {
  name: string;
  theme?: string;
  universe?: string;
  genre?: string;
  description?: string;
  settings?: Record<string, unknown>;
}

export interface ProjectSubmission {
  project: Project;
  tasks?: TaskRequest[];
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface Workflow<T = unknown> {
  id: string;
  name: string;
  steps: WorkflowStep[];
  currentStep: number;
  data: T;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  error?: string;
}

// ============================================================================
// ComfyUI Types
// ============================================================================

export interface ComfyUIWorkflow {
  id: string;
  name: string;
  nodes: ComfyUINode[];
  edges: ComfyUIEdge[];
}

export interface ComfyUINode {
  id: string;
  type: string;
  inputs: ComfyUIInput[];
  outputs: ComfyUIOutput[];
  parameters: Record<string, unknown>;
}

export interface ComfyUIInput {
  name: string;
  type: string;
  connection?: ComfyUIConnection;
}

export interface ComfyUIOutput {
  name: string;
  type: string;
  connections: ComfyUIConnection[];
}

export interface ComfyUIConnection {
  nodeId: string;
  outputIndex: number;
}

export interface ComfyUIEdge {
  source: {
    nodeId: string;
    outputIndex: number;
  };
  target: {
    nodeId: string;
    inputIndex: number;
  };
}

export interface ComfyUIQueueStatus {
  queueSize: number;
  processing: boolean;
  currentPromptId?: string;
}

export interface ComfyUIExecuteRequest {
  workflow: ComfyUIWorkflow;
  parameters?: Record<string, unknown>;
}

export interface ComfyUIExecuteResponse {
  promptId: string;
  status: 'queued' | 'executing' | 'completed' | 'failed';
}

// ============================================================================
// LLM Types
// ============================================================================

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  parameters?: Record<string, unknown>;
}

export interface LLMConnectionTest {
  success: boolean;
  message: string;
  latency?: number;
  models?: string[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: LLMToolCall[];
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMResponse {
  message: LLMMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================================================
// Sequence Types
// ============================================================================

export interface SequenceGenerationRequest {
  projectId: string;
  type: 'beat_sheet' | 'outline' | 'full_script';
  parameters?: Record<string, unknown>;
}

export interface SequenceJob {
  id: string;
  projectId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: SequenceResult;
  error?: string;
}

export interface SequenceResult {
  data: unknown;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Form Types
// ============================================================================

export interface FormField {
  name: string;
  value: unknown;
  error?: string;
  touched: boolean;
  validated: boolean;
}

export interface FormData {
  fields: Record<string, FormField>;
  isValid: boolean;
  isDirty: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

export interface EventPayload<T = unknown> {
  type: string;
  data: T;
  timestamp: number; // timestamp
  source?: string;
}

export interface EventHandler<T = unknown> {
  (event: EventPayload<T>): void | Promise<void>;
}

// ============================================================================
// Callback Types
// ============================================================================

export interface ProgressCallback {
  (progress: number, message?: string): void;
}

export interface CompletionCallback<T = unknown> {
  (result: T): void;
}

export interface ErrorCallback {
  (error: Error | string): void;
}

export interface ProgressHandlers {
  onProgress?: ProgressCallback;
  onComplete?: CompletionCallback;
  onError?: ErrorCallback;
}

// ============================================================================
// Common Generic Types
// ============================================================================

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncResult<T> = Promise<T> & {
  cancel?: () => void;
};

export interface KeyValuePair<K = string, V = unknown> {
  key: K;
  value: V;
}

export interface NamedValue {
  name: string;
  value: unknown;
}

export interface IdLabel {
  id: string;
  label: string;
}

export interface IdLabelDescription extends IdLabel {
  description?: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
}
