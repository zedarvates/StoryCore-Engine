/**
 * TypeScript interfaces for ComfyUI API communication
 * Defines data structures for workflow execution, progress updates, and media handling
 */

export interface ComfyUIWorkflowRequest {
  /** Workflow JSON structure as expected by ComfyUI */
  workflow: Record<string, any>;
  /** Optional client identifier */
  clientId?: string;
  /** Optional workflow name/description */
  name?: string;
  /** Optional workflow type (text-to-image, image-to-video, etc.) */
  type?: ComfyUIWorkflowType;
  /** Optional timeout in milliseconds */
  timeout?: number;
}

export interface ComfyUIWorkflowResponse {
  /** Success status */
  success: boolean;
  /** Unique execution ID */
  executionId?: string;
  /** Error message if failed */
  error?: string;
  /** Execution metadata */
  metadata?: ComfyUIExecutionMetadata;
}

export interface ComfyUIExecutionMetadata {
  /** Workflow execution start time */
  startTime: string;
  /** Workflow execution end time */
  endTime?: string;
  /** Total execution time in milliseconds */
  durationMs?: number;
  /** Number of nodes executed */
  nodeCount?: number;
  /** Queue position when queued */
  queuePosition?: number;
}

export enum ComfyUIWorkflowType {
  TEXT_TO_IMAGE = 'text-to-image',
  IMAGE_TO_IMAGE = 'image-to-image',
  TEXT_TO_VIDEO = 'text-to-video',
  IMAGE_TO_VIDEO = 'image-to-video',
  VIDEO_INPAINTING = 'video-inpainting',
  VIDEO_UPSCALING = 'video-upscaling',
  IMAGE_UPSCALING = 'image-upscaling',
  IMAGE_EDITING = 'image-editing',
}

export interface ComfyUIQueueStatus {
  /** Currently running executions */
  running: ComfyUIQueueItem[];
  /** Pending executions in queue */
  pending: ComfyUIQueueItem[];
  /** Queue length */
  length: number;
  /** Is queue processing enabled */
  enabled: boolean;
}

export interface ComfyUIQueueItem {
  /** Unique execution ID */
  id: string;
  /** Client that submitted the execution */
  clientId: string;
  /** Workflow type */
  type?: ComfyUIWorkflowType;
  /** Submission timestamp */
  submittedAt: string;
  /** Estimated completion time */
  estimatedCompletion?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Current execution status */
  status: ComfyUIExecutionStatus;
}

export enum ComfyUIExecutionStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface ComfyUIProgressUpdate {
  /** Execution ID */
  executionId: string;
  /** Current progress (0-100) */
  progress: number;
  /** Current executing node */
  currentNode?: string;
  /** Total nodes to execute */
  totalNodes?: number;
  /** Current step in current node */
  currentStep?: number;
  /** Total steps in current node */
  totalSteps?: number;
  /** Status message */
  message?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface ComfyUIMediaUploadRequest {
  /** File path to upload */
  filePath: string;
  /** Optional subfolder in ComfyUI input directory */
  subfolder?: string;
  /** Whether to overwrite existing file */
  overwrite?: boolean;
  /** Media type */
  type: ComfyUIMediaType;
}

export interface ComfyUIMediaUploadResponse {
  /** Success status */
  success: boolean;
  /** Uploaded file name */
  filename?: string;
  /** ComfyUI subfolder */
  subfolder?: string;
  /** File type */
  type?: string;
  /** Error message */
  error?: string;
}

export interface ComfyUIMediaDownloadRequest {
  /** File name to download */
  filename: string;
  /** ComfyUI subfolder */
  subfolder?: string;
  /** Destination path in local filesystem */
  destinationPath: string;
  /** Whether to overwrite existing file */
  overwrite?: boolean;
}

export interface ComfyUIMediaDownloadResponse {
  /** Success status */
  success: boolean;
  /** Local file path */
  localPath?: string;
  /** File size in bytes */
  size?: number;
  /** Error message */
  error?: string;
}

export enum ComfyUIMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  MASK = 'mask',
  DEPTH = 'depth',
}

export interface ComfyUIServiceStatus {
  /** Is service running */
  running: boolean;
  /** Is service healthy */
  healthy: boolean;
  /** Service URL */
  url?: string;
  /** Service version */
  version?: string;
  /** Uptime in seconds */
  uptimeSeconds?: number;
  /** Last health check timestamp */
  lastHealthCheck?: string;
  /** System stats */
  systemStats?: ComfyUISystemStats;
}

export interface ComfyUISystemStats {
  /** GPU memory used */
  gpuMemoryUsed?: number;
  /** GPU memory total */
  gpuMemoryTotal?: number;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** RAM used */
  ramUsed?: number;
  /** RAM total */
  ramTotal?: number;
  /** Active workflows count */
  activeWorkflows?: number;
  /** Queue length */
  queueLength?: number;
}

export interface ComfyUIExecutionResult {
  /** Execution ID */
  executionId: string;
  /** Success status */
  success: boolean;
  /** Generated outputs */
  outputs: ComfyUIOutput[];
  /** Execution metadata */
  metadata: ComfyUIExecutionMetadata;
  /** Error message if failed */
  error?: string;
  /** Warnings during execution */
  warnings?: string[];
}

export interface ComfyUIOutput {
  /** Output node ID */
  nodeId: string;
  /** Output type */
  type: ComfyUIMediaType;
  /** Generated files */
  files: ComfyUIOutputFile[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface ComfyUIOutputFile {
  /** File name */
  filename: string;
  /** ComfyUI subfolder */
  subfolder?: string;
  /** File type */
  type: string;
  /** File size in bytes */
  size?: number;
  /** Image/video dimensions */
  dimensions?: {
    width: number;
    height: number;
    frames?: number;
    duration?: number;
  };
}

// Event types for real-time communication
export interface ComfyUIEvent {
  type: ComfyUIEventType;
  data: any;
  timestamp: string;
}

export enum ComfyUIEventType {
  WORKFLOW_STARTED = 'workflow-started',
  WORKFLOW_PROGRESS = 'workflow-progress',
  WORKFLOW_COMPLETED = 'workflow-completed',
  WORKFLOW_FAILED = 'workflow-failed',
  QUEUE_UPDATED = 'queue-updated',
  SERVICE_STATUS_CHANGED = 'service-status-changed',
}

// Error types
export class ComfyUIError extends Error {
  constructor(
    message: string,
    public code: ComfyUIErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'ComfyUIError';
  }
}

export enum ComfyUIErrorCode {
  CONNECTION_FAILED = 'connection-failed',
  TIMEOUT = 'timeout',
  INVALID_WORKFLOW = 'invalid-workflow',
  EXECUTION_FAILED = 'execution-failed',
  MEDIA_UPLOAD_FAILED = 'media-upload-failed',
  MEDIA_DOWNLOAD_FAILED = 'media-download-failed',
  SERVICE_UNAVAILABLE = 'service-unavailable',
  QUEUE_FULL = 'queue-full',
  INVALID_REQUEST = 'invalid-request',
}