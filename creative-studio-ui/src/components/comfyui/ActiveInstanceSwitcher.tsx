/**
 * Active Instance Switcher Component
 *
 * Toolbar component that displays the currently active ComfyUI instance
 * and provides quick switching between available instances.
 */

import { useState, useEffect } from 'react';
import type { ComfyUIInstance } from '../../types/comfyui-instance';
import { ComfyUIInstanceManager } from '../../services/wizard/ComfyUIInstanceManager';
import './ActiveInstanceSwitcher.css';

export interface ActiveInstanceSwitcherProps {
  /** Instance manager instance */
  instanceManager: ComfyUIInstanceManager;
  /** Callback when active instance changes */
  onActiveInstanceChange?: (instanceId: string | null) => void;
  /** Whether to show instance health status */
  showHealthStatus?: boolean;
  /** Whether to show instance metrics */
  showMetrics?: boolean;
  /** Custom CSS class */
  className?: string;
}

/**
 * Active Instance Switcher Component
 */
export function ActiveInstanceSwitcher({
  instanceManager,
  onActiveInstanceChange,
  showHealthStatus = true,
  showMetrics = false,
  className = '',
}: ActiveInstanceSwitcherProps) {
  const [activeInstance, setActiveInstance] = useState<ComfyUIInstance | null>(null);
  const [availableInstances, setAvailableInstances] = useState<ComfyUIInstance[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load instances and active instance
  useEffect(() => {
    const loadInstances = () => {
      const instances = instanceManager.listInstances();
      setAvailableInstances(instances);
      setActiveInstance(instanceManager.getActiveInstance());
    };

    loadInstances();

    // Refresh periodically
    const interval = setInterval(loadInstances, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [instanceManager]);

  const handleInstanceSelect = (instance: ComfyUIInstance) => {
    instanceManager.setActiveInstance(instance.id);
    setActiveInstance(instance);
    onActiveInstanceChange?.(instance.id);
    setIsDropdownOpen(false);
  };

  const handleClearActive = () => {
    instanceManager.setActiveInstance(null);
    setActiveInstance(null);
    onActiveInstanceChange?.(null);
    setIsDropdownOpen(false);
  };

  // Get status color for health/health status
  const getStatusColor = (instance: ComfyUIInstance) => {
    if (instance.status === 'running') {
      switch (instance.health.status) {
        case 'healthy': return 'status-healthy';
        case 'degraded': return 'status-degraded';
        case 'unhealthy': return 'status-unhealthy';
        default: return 'status-unknown';
      }
    }
    return 'status-stopped';
  };

  // Get running instances for dropdown
  const runningInstances = availableInstances.filter(
    instance => instance.status === 'running' && instance.health.status === 'healthy'
  );

  return (
    <div className={`active-instance-switcher ${className}`}>
      <div className="switcher-container">
        {/* Active Instance Display */}
        <div className="active-instance-display">
          <span className="label">ComfyUI:</span>

          {activeInstance ? (
            <div className="active-instance-info">
              <span className="instance-name">{activeInstance.config.name}</span>
              <span className="instance-endpoint">
                {activeInstance.config.host || 'localhost'}:{activeInstance.config.port}
              </span>

              {showHealthStatus && (
                <span className={`status-indicator ${getStatusColor(activeInstance)}`}>
                  {activeInstance.status === 'running' ? activeInstance.health.status : activeInstance.status}
                </span>
              )}

              {showMetrics && activeInstance.status === 'running' && (
                <span className="metrics">
                  {activeInstance.health.systemStats?.activeWorkflows || 0} active
                </span>
              )}
            </div>
          ) : (
            <span className="no-active-instance">No active instance</span>
          )}
        </div>

        {/* Dropdown Toggle */}
        <button
          className="dropdown-toggle"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          title="Switch active instance"
        >
          <span className="toggle-icon">{isDropdownOpen ? '▲' : '▼'}</span>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="instance-dropdown">
            {/* Clear Active Option */}
            {activeInstance && (
              <>
                <div
                  className="dropdown-item clear-active"
                  onClick={handleClearActive}
                >
                  <span className="item-icon">❌</span>
                  <span>Clear active instance</span>
                </div>
                <div className="dropdown-divider"></div>
              </>
            )}

            {/* Available Instances */}
            {runningInstances.length > 0 ? (
              runningInstances.map((instance) => (
                <div
                  key={instance.id}
                  className={`dropdown-item instance-option ${instance.id === activeInstance?.id ? 'active' : ''}`}
                  onClick={() => handleInstanceSelect(instance)}
                >
                  <div className="instance-info">
                    <span className="instance-name">{instance.config.name}</span>
                    <span className="instance-endpoint">
                      {instance.config.host || 'localhost'}:{instance.config.port}
                    </span>
                  </div>

                  <div className="instance-status">
                    <span className={`status-indicator ${getStatusColor(instance)}`}>
                      {instance.health.status}
                    </span>

                    {showMetrics && (
                      <span className="metrics">
                        {instance.health.systemStats?.activeWorkflows || 0} active
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="dropdown-item no-instances">
                <span>No running instances available</span>
              </div>
            )}

            {/* Show all instances if there are stopped ones */}
            {runningInstances.length !== availableInstances.length && availableInstances.length > runningInstances.length && (
              <>
                <div className="dropdown-divider"></div>
                <div className="dropdown-section">
                  <span className="section-label">All Instances:</span>
                  {availableInstances
                    .filter(instance => instance.status !== 'running' || instance.health.status !== 'healthy')
                    .map((instance) => (
                      <div
                        key={instance.id}
                        className={`dropdown-item instance-option disabled`}
                        title="Instance not available for selection"
                      >
                        <div className="instance-info">
                          <span className="instance-name">{instance.config.name}</span>
                          <span className="instance-endpoint">
                            {instance.config.host || 'localhost'}:{instance.config.port}
                          </span>
                        </div>

                        <div className="instance-status">
                          <span className={`status-indicator ${getStatusColor(instance)}`}>
                            {instance.status === 'running' ? instance.health.status : instance.status}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="dropdown-overlay"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}