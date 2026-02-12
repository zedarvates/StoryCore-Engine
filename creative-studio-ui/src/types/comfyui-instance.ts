/**
 * ComfyUI Instance Types and Interfaces
 *
 * Type definitions for multi-instance ComfyUI management system.
 * Provides comprehensive typing for instance configuration, health monitoring,
 * lifecycle management, and persistence.
 */

export type InstanceStatus = 'stopped' | 'starting' | 'running' | 'paused' | 'stopping' | 'error';

export type InstanceHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * ComfyUI Instance Configuration
 */
export interface ComfyUIInstanceConfig {
  /** Unique instance identifier */
  id: string;

  /** Human-readable instance name */
  name: string;

  /** Port number for ComfyUI server */
  port: number;

  /** Host address (default: localhost) */
  host?: string;

  /** GPU device specification */
  gpuDevice?: string;

  /** Environment variables for the instance */
  envVars?: Record<string, string>;

  /** Custom nodes directory path */
  customNodesPath?: string;

  /** Maximum concurrent workflows */
  maxConcurrentWorkflows?: number;

  /** Request timeout in milliseconds */
  timeoutMs?: number;

  /** Enable queue monitoring */
  enableQueueMonitoring?: boolean;

  /** Auto-start instance on application launch */
  autoStart?: boolean;

  /** Optional description */
  description?: string;
}

/**
 * Instance Health Information
 */
export interface InstanceHealth {
  /** Health status */
  status: InstanceHealthStatus;

  /** Last health check timestamp */
  lastChecked: Date;

  /** Response time in milliseconds */
  responseTime: number;

  /** Total error count */
  errorCount: number;

  /** Consecutive failure count */
  consecutiveFailures: number;

  /** System statistics */
  systemStats?: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage?: number;
    activeWorkflows: number;
    queueSize: number;
  };

  /** Last error message */
  lastError?: string;
}

/**
 * Instance Performance Statistics
 */
export interface InstanceStats {
  /** Total workflows executed */
  totalWorkflows: number;

  /** Successful workflow count */
  successfulWorkflows: number;

  /** Failed workflow count */
  failedWorkflows: number;

  /** Average response time in milliseconds */
  averageResponseTime: number;

  /** Instance uptime in milliseconds */
  uptime: number;

  /** Last error timestamp */
  lastErrorAt?: Date;

  /** Last error message */
  lastError?: string;
}

/**
 * ComfyUI Instance Object
 */
export interface ComfyUIInstance {
  /** Unique instance identifier */
  id: string;

  /** Instance configuration */
  config: ComfyUIInstanceConfig;

  /** Current instance status */
  status: InstanceStatus;

  /** Health information */
  health: InstanceHealth;

  /** Performance statistics */
  stats: InstanceStats;

  /** Creation timestamp */
  createdAt: Date;

  /** Last usage timestamp */
  lastUsedAt: Date;

  /** Associated ComfyUI client (lazy-loaded) */
  // Using 'any' to avoid circular import dependency with ComfyUIClient
  client?: unknown; // ComfyUIClient - avoiding circular import
}

/**
 * Instance Configuration Persistence Schema
 */
export interface ComfyUIInstancesConfig {
  /** Configuration version */
  version: string;

  /** Array of instance configurations */
  instances: ComfyUIInstanceConfig[];

  /** Currently active instance ID */
  activeInstanceId?: string;

  /** Last saved timestamp */
  lastSaved: string;
}

/**
 * Instance Creation Parameters
 */
export interface CreateInstanceParams {
  name: string;
  port: number;
  host?: string;
  gpuDevice?: string;
  envVars?: Record<string, string>;
  customNodesPath?: string;
  maxConcurrentWorkflows?: number;
  timeoutMs?: number;
  enableQueueMonitoring?: boolean;
  autoStart?: boolean;
  description?: string;
}

/**
 * Instance Update Parameters
 */
export interface UpdateInstanceParams extends Partial<CreateInstanceParams> {
  name?: string;
}

/**
 * Health Check Result
 */
export interface HealthCheckResult {
  instanceId: string;
  success: boolean;
  responseTime: number;
  systemStats?: InstanceHealth['systemStats'];
  error?: string;
}

/**
 * Load Balancing Strategy
 */
export type LoadBalancingStrategy = 'round-robin' | 'least-loaded' | 'random';

/**
 * Instance Manager Events
 */
export interface InstanceManagerEvents {
  instanceCreated: (instance: ComfyUIInstance) => void;
  instanceUpdated: (instance: ComfyUIInstance) => void;
  instanceDeleted: (instanceId: string) => void;
  instanceStarted: (instance: ComfyUIInstance) => void;
  instanceStopped: (instance: ComfyUIInstance) => void;
  instancePaused: (instance: ComfyUIInstance) => void;
  instanceResumed: (instance: ComfyUIInstance) => void;
  healthChanged: (instance: ComfyUIInstance, previousHealth: InstanceHealthStatus) => void;
  activeInstanceChanged: (instanceId: string | null) => void;
}

/**
 * Migration Result
 */
export interface MigrationResult {
  migrated: boolean;
  fromVersion?: string;
  toVersion: string;
  instancesCreated: number;
  errors: string[];
}

/**
 * Instance Manager Configuration
 */
export interface InstanceManagerConfig {
  /** Health check interval in milliseconds */
  healthCheckIntervalMs?: number;

  /** Maximum consecutive failures before marking unhealthy */
  maxConsecutiveFailures?: number;

  /** Load balancing strategy */
  loadBalancingStrategy?: LoadBalancingStrategy;

  /** Auto-recovery enabled */
  enableAutoRecovery?: boolean;

  /** Configuration file path */
  configPath?: string;

  /** Enable persistence */
  enablePersistence?: boolean;
}

/**
 * Default values
 */
export const DEFAULT_INSTANCE_CONFIG: Partial<ComfyUIInstanceConfig> = {
  host: 'localhost',
  maxConcurrentWorkflows: 1,
  timeoutMs: 300000,
  enableQueueMonitoring: true,
  autoStart: false,
};

export const DEFAULT_INSTANCE_MANAGER_CONFIG: InstanceManagerConfig = {
  healthCheckIntervalMs: 30000,
  maxConsecutiveFailures: 3,
  loadBalancingStrategy: 'least-loaded',
  enableAutoRecovery: true,
  enablePersistence: true,
};

/**
 * Validation schemas and utilities
 */
export interface InstanceConfigValidation {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
}

/**
 * Port availability check result
 */
export interface PortCheckResult {
  port: number;
  available: boolean;
  inUseBy?: string;
  suggestedAlternatives?: number[];
}

