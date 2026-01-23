/**
 * ComfyUI Instance Manager
 *
 * Core class for managing multiple ComfyUI instances, providing lifecycle management,
 * health monitoring, load balancing, and persistence capabilities.
 */

import type {
  ComfyUIInstance,
  ComfyUIInstanceConfig,
  ComfyUIInstancesConfig,
  CreateInstanceParams,
  UpdateInstanceParams,
  InstanceHealth,
  InstanceHealthStatus,
  InstanceStats,
  HealthCheckResult,
  InstanceManagerConfig,
  MigrationResult,
} from '../../types/comfyui-instance';
import {
  DEFAULT_INSTANCE_CONFIG,
  DEFAULT_INSTANCE_MANAGER_CONFIG,
} from '../../types/comfyui-instance';
import { ComfyUIInstanceStore, getComfyUIInstanceStore } from '../../services/persistence/ComfyUIInstanceStore';
import { ComfyUIClient } from './ComfyUIClient';
import { WizardError } from './types';
import { getLogger } from './logger';
import { generateUniqueId } from './pathUtils';

export class ComfyUIInstanceManager {
  private instances: Map<string, ComfyUIInstance> = new Map();
  private activeInstanceId: string | null = null;
  private config: InstanceManagerConfig;
  private logger = getLogger();
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private roundRobinIndex = 0;
  private store: ComfyUIInstanceStore;

  constructor(config?: Partial<InstanceManagerConfig>) {
    this.config = { ...DEFAULT_INSTANCE_MANAGER_CONFIG, ...config };
    this.store = getComfyUIInstanceStore();
    this.initialize();
  }

  /**
   * Initialize the instance manager
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadInstances();
      await this.migrateLegacyConfig();
      this.startHealthMonitoring();

      // Auto-start configured instances
      await this.startAutoStartInstances();

      this.logger.info('comfyui-instance', 'ComfyUI Instance Manager initialized', {
        instanceCount: this.instances.size,
        activeInstanceId: this.activeInstanceId,
      });
    } catch (error) {
      this.logger.error('comfyui-instance', 'Failed to initialize instance manager', error as Error);
      throw error;
    }
  }

  /**
   * Create a new ComfyUI instance
   */
  async createInstance(params: CreateInstanceParams): Promise<ComfyUIInstance> {
    const config: ComfyUIInstanceConfig = {
      ...DEFAULT_INSTANCE_CONFIG,
      ...params,
      id: generateUniqueId('instance'),
    };

    // Validate configuration
    await this.validateInstanceConfig(config);

    const instance: ComfyUIInstance = {
      id: config.id,
      config,
      status: 'stopped',
      health: this.createInitialHealth(),
      stats: this.createInitialStats(),
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };

    // Create the ComfyUI client for this instance
    instance.client = new ComfyUIClient(config);

    this.instances.set(instance.id, instance);

    // Auto-start if configured
    if (config.autoStart) {
      await this.startInstance(instance.id);
    }

    await this.saveInstances();

    this.logger.info('comfyui-instance', 'Created new ComfyUI instance', {
      instanceId: instance.id,
      name: instance.config.name,
      port: instance.config.port,
    });

    return instance;
  }

  /**
   * Get instance by ID
   */
  getInstance(instanceId: string): ComfyUIInstance | null {
    return this.instances.get(instanceId) || null;
  }

  /**
   * List all instances
   */
  listInstances(): ComfyUIInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Update instance configuration
   */
  async updateInstance(instanceId: string, params: UpdateInstanceParams): Promise<void> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    // Create updated config
    const updatedConfig: ComfyUIInstanceConfig = {
      ...instance.config,
      ...params,
    };

    // Validate updated configuration
    await this.validateInstanceConfig(updatedConfig);

    // Update instance
    instance.config = updatedConfig;

    // Restart if running and critical config changed
    const wasRunning = instance.status === 'running';
    if (wasRunning && this.requiresRestart(instance.config, updatedConfig)) {
      await this.restartInstance(instanceId);
    }

    await this.saveInstances();

    this.logger.info('comfyui-instance', 'Updated ComfyUI instance', {
      instanceId,
      name: updatedConfig.name,
    });
  }

  /**
   * Delete instance
   */
  async deleteInstance(instanceId: string): Promise<void> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    // Stop instance if running
    if (instance.status === 'running' || instance.status === 'paused') {
      await this.stopInstance(instanceId);
    }

    this.instances.delete(instanceId);

    // Update active instance if deleted
    if (this.activeInstanceId === instanceId) {
      this.activeInstanceId = null;
    }

    await this.saveInstances();

    this.logger.info('comfyui-instance', 'Deleted ComfyUI instance', {
      instanceId,
      name: instance.config.name,
    });
  }

  /**
   * Start instance
   */
  async startInstance(instanceId: string): Promise<void> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    if (instance.status === 'running') {
      return; // Already running
    }

    try {
      instance.status = 'starting';

      // Perform health check to verify instance is accessible
      const healthCheck = await this.performHealthCheck(instance);
      if (!healthCheck.success) {
        throw new WizardError(
          `Failed to start instance ${instance.config.name}: ${healthCheck.error}`,
          'connection',
          true,
          true,
          { instanceId, error: healthCheck.error }
        );
      }

      instance.status = 'running';
      instance.health = this.updateHealthFromCheck(instance.health, healthCheck);
      instance.lastUsedAt = new Date();

      await this.saveInstances();

      this.logger.info('comfyui-instance', 'Started ComfyUI instance', {
        instanceId,
        name: instance.config.name,
        port: instance.config.port,
      });
    } catch (error) {
      instance.status = 'error';
      throw error;
    }
  }

  /**
   * Stop instance
   */
  async stopInstance(instanceId: string): Promise<void> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    if (instance.status === 'stopped') {
      return; // Already stopped
    }

    instance.status = 'stopping';

    // Note: In a real implementation, this might need to send a shutdown signal
    // to the ComfyUI process. For now, we just update the status.

    instance.status = 'stopped';
    instance.lastUsedAt = new Date();

    await this.saveInstances();

    this.logger.info('comfyui-instance', 'Stopped ComfyUI instance', {
      instanceId,
      name: instance.config.name,
    });
  }

  /**
   * Pause instance
   */
  async pauseInstance(instanceId: string): Promise<void> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    if (instance.status !== 'running') {
      throw new WizardError(
        `Cannot pause instance ${instance.config.name}: not running`,
        'validation',
        false,
        false,
        { instanceId, currentStatus: instance.status }
      );
    }

    instance.status = 'paused';
    instance.lastUsedAt = new Date();

    await this.saveInstances();

    this.logger.info('comfyui-instance', 'Paused ComfyUI instance', {
      instanceId,
      name: instance.config.name,
    });
  }

  /**
   * Resume instance
   */
  async resumeInstance(instanceId: string): Promise<void> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    if (instance.status !== 'paused') {
      throw new WizardError(
        `Cannot resume instance ${instance.config.name}: not paused`,
        'validation',
        false,
        false,
        { instanceId, currentStatus: instance.status }
      );
    }

    instance.status = 'running';
    instance.lastUsedAt = new Date();

    await this.saveInstances();

    this.logger.info('comfyui-instance', 'Resumed ComfyUI instance', {
      instanceId,
      name: instance.config.name,
    });
  }

  /**
   * Restart instance
   */
  async restartInstance(instanceId: string): Promise<void> {
    await this.stopInstance(instanceId);
    await this.startInstance(instanceId);
  }

  /**
   * Get healthy instance for load balancing
   */
  getHealthyInstance(): ComfyUIInstance | null {
    const healthyInstances = this.listInstances().filter(
      instance => instance.status === 'running' && instance.health.status === 'healthy'
    );

    if (healthyInstances.length === 0) {
      return null;
    }

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.getRoundRobinInstance(healthyInstances);
      case 'least-loaded':
        return this.getLeastLoadedInstance(healthyInstances);
      case 'random':
        return healthyInstances[Math.floor(Math.random() * healthyInstances.length)];
      default:
        return healthyInstances[0];
    }
  }

  /**
   * Set active instance
   */
  setActiveInstance(instanceId: string | null): void {
    const instance = instanceId ? this.getInstance(instanceId) : null;

    if (instanceId && !instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    const previousActiveId = this.activeInstanceId;
    this.activeInstanceId = instanceId;

    if (instance) {
      instance.lastUsedAt = new Date();
    }

    this.logger.info('comfyui-instance', 'Changed active instance', {
      from: previousActiveId,
      to: instanceId,
    });
  }

  /**
   * Get active instance
   */
  getActiveInstance(): ComfyUIInstance | null {
    return this.activeInstanceId ? this.getInstance(this.activeInstanceId) : null;
  }

  /**
   * Check instance health
   */
  async checkInstanceHealth(instanceId: string): Promise<InstanceHealth> {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    const healthCheck = await this.performHealthCheck(instance);
    instance.health = this.updateHealthFromCheck(instance.health, healthCheck);

    return instance.health;
  }

  /**
   * Get instance statistics
   */
  getInstanceStats(instanceId: string): InstanceStats {
    const instance = this.getInstance(instanceId);
    if (!instance) {
      throw new WizardError(
        `Instance ${instanceId} not found`,
        'validation',
        false,
        false,
        { instanceId }
      );
    }

    return { ...instance.stats };
  }

  // Private helper methods

  private async validateInstanceConfig(config: ComfyUIInstanceConfig): Promise<void> {
    // Check for port conflicts
    for (const [id, instance] of this.instances) {
      if (id !== config.id && instance.config.port === config.port) {
        throw new WizardError(
          `Port ${config.port} is already used by instance "${instance.config.name}"`,
          'validation',
          false,
          false,
          { port: config.port, conflictingInstance: id }
        );
      }
    }

    // Validate port range
    if (config.port < 1 || config.port > 65535) {
      throw new WizardError(
        'Port must be between 1 and 65535',
        'validation',
        false,
        false,
        { port: config.port }
      );
    }
  }

  private requiresRestart(oldConfig: ComfyUIInstanceConfig, newConfig: ComfyUIInstanceConfig): boolean {
    return oldConfig.port !== newConfig.port ||
           oldConfig.host !== newConfig.host ||
           oldConfig.gpuDevice !== newConfig.gpuDevice ||
           JSON.stringify(oldConfig.envVars) !== JSON.stringify(newConfig.envVars);
  }

  private createInitialHealth(): InstanceHealth {
    return {
      status: 'unhealthy',
      lastChecked: new Date(),
      responseTime: 0,
      errorCount: 0,
      consecutiveFailures: 0,
    };
  }

  private createInitialStats(): InstanceStats {
    return {
      totalWorkflows: 0,
      successfulWorkflows: 0,
      failedWorkflows: 0,
      averageResponseTime: 0,
      uptime: 0,
    };
  }

  private async performHealthCheck(instance: ComfyUIInstance): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const endpoint = `http://${instance.config.host || 'localhost'}:${instance.config.port}/system_stats`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          instanceId: instance.id,
          success: false,
          responseTime,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      // Try to parse system stats
      let systemStats;
      try {
        const data = await response.json();
        systemStats = {
          cpuUsage: data.system?.cpu_percent || 0,
          memoryUsage: data.system?.memory_percent || 0,
          gpuUsage: data.devices?.[0]?.vram_percent || undefined,
          activeWorkflows: data.active_workflows || 0,
          queueSize: data.queue_size || 0,
        };
      } catch {
        // Ignore parsing errors
      }

      return {
        instanceId: instance.id,
        success: true,
        responseTime,
        systemStats,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        instanceId: instance.id,
        success: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private updateHealthFromCheck(health: InstanceHealth, check: HealthCheckResult): InstanceHealth {
    const now = new Date();

    if (check.success) {
      return {
        ...health,
        status: 'healthy',
        lastChecked: now,
        responseTime: check.responseTime,
        consecutiveFailures: 0,
        systemStats: check.systemStats,
        lastError: undefined,
      };
    } else {
      const consecutiveFailures = health.consecutiveFailures + 1;
      const status: InstanceHealthStatus =
        consecutiveFailures >= (this.config.maxConsecutiveFailures || 3) ? 'unhealthy' : 'degraded';

      return {
        ...health,
        status,
        lastChecked: now,
        errorCount: health.errorCount + 1,
        consecutiveFailures,
        lastError: check.error,
      };
    }
  }

  private getRoundRobinInstance(instances: ComfyUIInstance[]): ComfyUIInstance {
    const instance = instances[this.roundRobinIndex % instances.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % instances.length;
    return instance;
  }

  private getLeastLoadedInstance(instances: ComfyUIInstance[]): ComfyUIInstance {
    return instances.reduce((least, current) => {
      const leastLoad = least.health.systemStats?.activeWorkflows || 0;
      const currentLoad = current.health.systemStats?.activeWorkflows || 0;
      return currentLoad < leastLoad ? current : least;
    });
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      for (const instance of this.instances.values()) {
        if (instance.status === 'running') {
          try {
            await this.checkInstanceHealth(instance.id);
          } catch (error) {
            this.logger.debug('comfyui-instance', 'Health check failed', {
              instanceId: instance.id,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }
    }, this.config.healthCheckIntervalMs || 30000);
  }

  private async startAutoStartInstances(): Promise<void> {
    const autoStartInstances = this.listInstances().filter(instance => instance.config.autoStart);
    for (const instance of autoStartInstances) {
      try {
        await this.startInstance(instance.id);
      } catch (error) {
        this.logger.warn('comfyui-instance', 'Failed to auto-start instance', {
          instanceId: instance.id,
          name: instance.config.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private async loadInstances(): Promise<void> {
    try {
      const config = await this.store.loadInstances();

      // Clear existing instances
      this.instances.clear();

      // Create instance objects from config
      for (const instanceConfig of config.instances) {
        const instance: ComfyUIInstance = {
          id: instanceConfig.id,
          config: instanceConfig,
          status: 'stopped',
          health: this.createInitialHealth(),
          stats: this.createInitialStats(),
          lastUsedAt: new Date(),
        };

        // Create the ComfyUI client for this instance
        instance.client = new ComfyUIClient(instance.config);

        this.instances.set(instance.id, instance);
      }

      // Set active instance
      this.activeInstanceId = config.activeInstanceId || null;

      this.logger.debug('comfyui-instance', 'Loaded instances from storage', {
        instanceCount: this.instances.size,
        activeInstanceId: this.activeInstanceId,
      });
    } catch (error) {
      this.logger.warn('comfyui-instance', 'Failed to load instances, using defaults', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Create default instance if loading fails
      if (this.instances.size === 0) {
        await this.createInstance({
          name: 'Default Instance',
          port: 8188,
          autoStart: false,
          description: 'Default ComfyUI instance',
        });
      }
    }
  }

  private async saveInstances(): Promise<void> {
    try {
      const config: ComfyUIInstancesConfig = {
        version: '1.0',
        instances: Array.from(this.instances.values()).map(instance => instance.config),
        activeInstanceId: this.activeInstanceId || undefined,
        lastSaved: new Date().toISOString(),
      };

      await this.store.saveInstances(config);
    } catch (error) {
      this.logger.error('comfyui-instance', 'Failed to save instances', error as Error);
      throw error;
    }
  }

  private async migrateLegacyConfig(): Promise<MigrationResult> {
    return await this.store.migrateLegacyConfig();
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Stop all running instances
    for (const instance of this.instances.values()) {
      if (instance.status === 'running' || instance.status === 'paused') {
        try {
          await this.stopInstance(instance.id);
        } catch (error) {
          this.logger.warn('comfyui-instance', 'Failed to stop instance during cleanup', {
            instanceId: instance.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    await this.saveInstances();
  }
}
