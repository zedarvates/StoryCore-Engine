/**
 * Instance Card Component
 *
 * Individual card displaying instance information, status, health,
 * and quick action buttons for a ComfyUI instance.
 *
 * Features:
 * - Real-time status and health indicators
 * - Performance metrics display
 * - System resource monitoring
 * - Quick action buttons with tooltips
 * - Active instance highlighting
 * - Error state display
 *
 * @example
 * ```tsx
 * <InstanceCard
 *   instance={myInstance}
 *   isActive={true}
 *   onEdit={() => openEditDialog(myInstance)}
 *   onDelete={() => deleteInstance(myInstance.id)}
 *   onStart={() => startInstance(myInstance.id)}
 *   onStop={() => stopInstance(myInstance.id)}
 *   onSetActive={() => setActiveInstance(myInstance.id)}
 * />
 * ```
 */

import React from 'react';
import type { ComfyUIInstance } from '../../types/comfyui-instance';
import './InstanceCard.css';

export interface InstanceCardProps {
  /** The instance to display */
  instance: ComfyUIInstance;
  /** Whether this instance is currently active */
  isActive: boolean;
  /** Callback when edit button is clicked */
  onEdit: () => void;
  /** Callback when delete button is clicked */
  onDelete: () => void;
  /** Callback when start button is clicked */
  onStart: () => void;
  /** Callback when stop button is clicked */
  onStop: () => void;
  /** Callback when set active button is clicked */
  onSetActive: () => void;
}

/**
 * Instance Card Component
 */
export function InstanceCard({
  instance,
  isActive,
  onEdit,
  onDelete,
  onStart,
  onStop,
  onSetActive,
}: InstanceCardProps) {
  const { config, status, health, stats } = instance;

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'status-running';
      case 'stopped': return 'status-stopped';
      case 'starting': return 'status-starting';
      case 'stopping': return 'status-stopping';
      case 'paused': return 'status-paused';
      case 'error': return 'status-error';
      default: return 'status-unknown';
    }
  };

  // Health color mapping
  const getHealthColor = (healthStatus: string) => {
    switch (healthStatus) {
      case 'healthy': return 'health-healthy';
      case 'degraded': return 'health-degraded';
      case 'unhealthy': return 'health-unhealthy';
      default: return 'health-unknown';
    }
  };

  // Format uptime
  const formatUptime = (uptimeMs: number) => {
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Format last used time
  const formatLastUsed = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Get status description for tooltips
  const getStatusDescription = (status: string): string => {
    switch (status) {
      case 'running': return 'Instance is active and ready to process workflows';
      case 'stopped': return 'Instance is configured but not running';
      case 'starting': return 'Instance is in the process of starting up';
      case 'stopping': return 'Instance is in the process of shutting down';
      case 'paused': return 'Instance is temporarily suspended but can be resumed';
      case 'error': return 'Instance encountered an error and cannot operate normally';
      default: return 'Unknown status';
    }
  };

  // Get health description for tooltips
  const getHealthDescription = (healthStatus: string): string => {
    switch (healthStatus) {
      case 'healthy': return 'Instance is responding normally with good performance';
      case 'degraded': return 'Instance has intermittent issues but remains operational';
      case 'unhealthy': return 'Instance has critical problems and may fail workflows';
      default: return 'Health status unknown';
    }
  };

  return (
    <div className={`instance-card ${isActive ? 'active' : ''}`}>
      {/* Header */}
      <div className="card-header">
        <div className="instance-info">
          <h3 className="instance-name">{config.name}</h3>
          <div className="instance-details">
            <span className="instance-id">{config.id}</span>
            <span className="instance-endpoint">
              {config.host || 'localhost'}:{config.port}
            </span>
          </div>
        </div>

        <div className="status-indicators">
          <span
            className={`status-badge ${getStatusColor(status)}`}
            title={`Instance Status: ${status.charAt(0).toUpperCase() + status.slice(1)} - ${getStatusDescription(status)}`}
          >
            {status}
          </span>
          <span
            className={`health-badge ${getHealthColor(health.status)}`}
            title={`Health Status: ${health.status.charAt(0).toUpperCase() + health.status.slice(1)} - ${getHealthDescription(health.status)}`}
          >
            {health.status}
          </span>
        </div>
      </div>

      {/* Description */}
      {config.description && (
        <div className="card-description">
          <p>{config.description}</p>
        </div>
      )}

      {/* Metrics */}
      <div className="card-metrics">
        <div className="metric">
          <span className="metric-label">Workflows</span>
          <span
            className="metric-value"
            title={`Total workflows executed: ${stats.totalWorkflows} (${stats.successfulWorkflows} successful, ${stats.failedWorkflows} failed)`}
          >
            {stats.totalWorkflows}
          </span>
        </div>

        <div className="metric">
          <span className="metric-label">Success Rate</span>
          <span
            className="metric-value"
            title={`Workflow success rate: ${stats.successfulWorkflows} of ${stats.totalWorkflows} workflows completed successfully`}
          >
            {stats.totalWorkflows > 0
              ? Math.round((stats.successfulWorkflows / stats.totalWorkflows) * 100)
              : 0
            }%
          </span>
        </div>

        <div className="metric">
          <span className="metric-label">Response Time</span>
          <span
            className="metric-value"
            title={`Average response time for workflow execution: ${stats.averageResponseTime > 0 ? Math.round(stats.averageResponseTime) : 'N/A'} milliseconds`}
          >
            {stats.averageResponseTime > 0
              ? `${Math.round(stats.averageResponseTime)}ms`
              : 'N/A'
            }
          </span>
        </div>

        {status === 'running' && (
          <div className="metric">
            <span className="metric-label">Uptime</span>
            <span
              className="metric-value"
              title={`Instance has been running for ${formatUptime(stats.uptime)}`}
            >
              {formatUptime(stats.uptime)}
            </span>
          </div>
        )}
      </div>

      {/* System Stats (if available) */}
      {health.systemStats && (
        <div className="card-system-stats">
          <div className="system-metric">
            <span className="metric-label">CPU</span>
            <span
              className="metric-value"
              title={`CPU utilization: ${health.systemStats.cpuUsage.toFixed(1)}% of total processing capacity`}
            >
              {health.systemStats.cpuUsage.toFixed(1)}%
            </span>
          </div>

          <div className="system-metric">
            <span className="metric-label">Memory</span>
            <span
              className="metric-value"
              title={`Memory utilization: ${health.systemStats.memoryUsage.toFixed(1)}% of total RAM capacity`}
            >
              {health.systemStats.memoryUsage.toFixed(1)}%
            </span>
          </div>

          {health.systemStats.gpuUsage !== undefined && (
            <div className="system-metric">
              <span className="metric-label">GPU</span>
              <span
                className="metric-value"
                title={`GPU utilization: ${health.systemStats.gpuUsage.toFixed(1)}% of GPU capacity`}
              >
                {health.systemStats.gpuUsage.toFixed(1)}%
              </span>
            </div>
          )}

          <div className="system-metric">
            <span className="metric-label">Active</span>
            <span
              className="metric-value"
              title={`Currently active workflows: ${health.systemStats.activeWorkflows} workflows in progress`}
            >
              {health.systemStats.activeWorkflows}
            </span>
          </div>
        </div>
      )}

      {/* GPU Info */}
      {config.gpuDevice && (
        <div className="card-gpu-info">
          <span className="gpu-label">GPU:</span>
          <span
            className="gpu-value"
            title={`GPU Device: ${config.gpuDevice} - Specifies which GPU this instance will use for processing`}
          >
            {config.gpuDevice}
          </span>
        </div>
      )}

      {/* Last Used */}
      <div className="card-last-used">
        <span title={`Last workflow execution: ${instance.lastUsedAt.toLocaleString()}`}>
          Last used: {formatLastUsed(instance.lastUsedAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="card-actions">
        {/* Status-dependent actions */}
        {status === 'stopped' && (
          <button
            className="btn-action btn-start"
            onClick={onStart}
            title="Start instance"
          >
            ▶️ Start
          </button>
        )}

        {(status === 'running' || status === 'paused') && (
          <button
            className="btn-action btn-stop"
            onClick={onStop}
            title="Stop instance"
          >
            ⏹️ Stop
          </button>
        )}

        {/* Always available actions */}
        {!isActive && status === 'running' && health.status === 'healthy' && (
          <button
            className="btn-action btn-set-active"
            onClick={onSetActive}
            title="Set as active instance"
          >
            ⭐ Set Active
          </button>
        )}

        <button
          className="btn-action btn-edit"
          onClick={onEdit}
          title="Edit instance configuration"
        >
          ✏️ Edit
        </button>

        <button
          className="btn-action btn-delete"
          onClick={onDelete}
          title="Delete instance"
        >
          🗑️ Delete
        </button>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="active-indicator">
          <span>🎯 Active Instance</span>
        </div>
      )}

      {/* Error display */}
      {(health.lastError || stats.lastError) && (
        <div className="card-error">
          <div className="error-icon">⚠️</div>
          <div className="error-message">
            {health.lastError || stats.lastError}
          </div>
        </div>
      )}
    </div>
  );
}
