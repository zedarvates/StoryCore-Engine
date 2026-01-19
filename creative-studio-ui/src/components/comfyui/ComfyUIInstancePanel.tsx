/**
 * ComfyUI Instance Panel Component
 *
 * Main panel for managing ComfyUI instances, providing a comprehensive
 * interface for creating, monitoring, and controlling multiple ComfyUI servers.
 *
 * Features:
 * - Grid view of all instances with status and health indicators
 * - Real-time filtering and search capabilities
 * - Instance lifecycle management (create, start, stop, delete)
 * - Active instance selection and management
 * - Automatic refresh and health monitoring
 * - Responsive design with tooltips and help text
 *
 * @example
 * ```tsx
 * <ComfyUIInstancePanel
 *   instanceManager={instanceManager}
 *   onActiveInstanceChange={(instanceId) => setActiveInstance(instanceId)}
 *   isVisible={true}
 * />
 * ```
 */

import { useState, useEffect } from 'react';
import type { ComfyUIInstance, InstanceStatus, InstanceHealthStatus } from '../../types/comfyui-instance';
import { ComfyUIInstanceManager } from '../../services/wizard/ComfyUIInstanceManager';
import { InstanceCard } from './InstanceCard';
import { InstanceEditorDialog } from './InstanceEditorDialog';
import './ComfyUIInstancePanel.css';

export interface ComfyUIInstancePanelProps {
  /** Instance manager instance */
  instanceManager: ComfyUIInstanceManager;
  /** Callback when active instance changes */
  onActiveInstanceChange?: (instanceId: string | null) => void;
  /** Whether the panel is visible */
  isVisible?: boolean;
}

/**
 * Status filter options
 */
type StatusFilter = 'all' | InstanceStatus;

/**
 * Health filter options
 */
type HealthFilter = 'all' | InstanceHealthStatus;

/**
 * ComfyUI Instance Panel Component
 */
export function ComfyUIInstancePanel({
  instanceManager,
  onActiveInstanceChange,
  isVisible = true,
}: ComfyUIInstancePanelProps) {
  const [instances, setInstances] = useState<ComfyUIInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInstance, setEditingInstance] = useState<ComfyUIInstance | null>(null);

  // Load instances on mount and when manager changes
  useEffect(() => {
    loadInstances();

    // Set up periodic refresh
    const interval = setInterval(loadInstances, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [instanceManager]);

  const loadInstances = async () => {
    try {
      setError(null);
      const instanceList = instanceManager.listInstances();
      setInstances(instanceList);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load instances');
      setLoading(false);
    }
  };

  // Filter instances based on current filters
  const filteredInstances = instances.filter(instance => {
    // Status filter
    if (statusFilter !== 'all' && instance.status !== statusFilter) {
      return false;
    }

    // Health filter
    if (healthFilter !== 'all' && instance.health.status !== healthFilter) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        instance.config.name.toLowerCase().includes(query) ||
        instance.config.id.toLowerCase().includes(query) ||
        (instance.config.description?.toLowerCase().includes(query))
      );
    }

    return true;
  });

  const handleCreateInstance = async () => {
    setShowCreateDialog(true);
  };

  const handleEditInstance = (instance: ComfyUIInstance) => {
    setEditingInstance(instance);
  };

  const handleDeleteInstance = async (instance: ComfyUIInstance) => {
    if (window.confirm(`Are you sure you want to delete instance "${instance.config.name}"?`)) {
      try {
        await instanceManager.deleteInstance(instance.id);
        await loadInstances();
      } catch (err) {
        alert(`Failed to delete instance: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const handleStartInstance = async (instance: ComfyUIInstance) => {
    try {
      await instanceManager.startInstance(instance.id);
      await loadInstances();
    } catch (err) {
      alert(`Failed to start instance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleStopInstance = async (instance: ComfyUIInstance) => {
    try {
      await instanceManager.stopInstance(instance.id);
      await loadInstances();
    } catch (err) {
      alert(`Failed to stop instance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSetActiveInstance = async (instance: ComfyUIInstance) => {
    try {
      instanceManager.setActiveInstance(instance.id);
      onActiveInstanceChange?.(instance.id);
    } catch (err) {
      alert(`Failed to set active instance: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleInstanceSaved = async () => {
    setShowCreateDialog(false);
    setEditingInstance(null);
    await loadInstances();
  };

  const activeInstanceId = instanceManager.getActiveInstance()?.id;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="comfyui-instance-panel">
      <div className="panel-header">
        <h2>ComfyUI Instances</h2>
        <div className="header-actions">
          <button
            className="btn-primary"
            onClick={handleCreateInstance}
            title="Create new instance"
          >
            + New Instance
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="panel-filters">
        <div className="filter-group">
          <label title="Filter instances by their current operational status">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            title="Select status to filter instances: All shows everything, Running shows active instances, etc."
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="starting">Starting</option>
            <option value="stopping">Stopping</option>
            <option value="paused">Paused</option>
            <option value="error">Error</option>
          </select>
        </div>

        <div className="filter-group">
          <label title="Filter instances by their health monitoring status">Health:</label>
          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value as HealthFilter)}
            title="Select health status to filter instances: Healthy instances are fully operational"
          >
            <option value="all">All</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="unhealthy">Unhealthy</option>
          </select>
        </div>

        <div className="filter-group search-group">
          <input
            type="text"
            placeholder="Search instances..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            title="Search instances by name, ID, or description. Press Enter to apply filter."
          />
        </div>
      </div>

      {/* Instance Grid */}
      <div className="instance-grid">
        {loading ? (
          <div className="loading">Loading instances...</div>
        ) : error ? (
          <div className="error">Error: {error}</div>
        ) : filteredInstances.length === 0 ? (
          <div className="empty-state">
            <p title={instances.length === 0 ? "No ComfyUI instances have been created yet. Create your first instance to get started with multi-instance management." : "No instances match your current filters. Try adjusting the status, health, or search filters."}>
              {instances.length === 0 ? "No instances found" : "No instances match your filters"}
            </p>
            {instances.length === 0 && (
              <button
                className="btn-secondary"
                onClick={handleCreateInstance}
                title="Open the instance creation dialog to configure your first ComfyUI instance"
              >
                Create your first instance
              </button>
            )}
            {instances.length > 0 && (
              <p className="filter-help">
                Try adjusting your filters or clearing the search to see all instances.
              </p>
            )}
          </div>
        ) : (
          filteredInstances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              isActive={instance.id === activeInstanceId}
              onEdit={() => handleEditInstance(instance)}
              onDelete={() => handleDeleteInstance(instance)}
              onStart={() => handleStartInstance(instance)}
              onStop={() => handleStopInstance(instance)}
              onSetActive={() => handleSetActiveInstance(instance)}
            />
          ))
        )}
      </div>

      {/* Instance Summary */}
      <div className="panel-summary">
        <span title={`${filteredInstances.length} instances shown out of ${instances.length} total instances`}>
          {filteredInstances.length} of {instances.length} instances
        </span>
        {activeInstanceId && (
          <span
            className="active-indicator"
            title={`Active Instance: ${instanceManager.getActiveInstance()?.config.name} - This instance receives all new workflow requests`}
          >
            Active: {instanceManager.getActiveInstance()?.config.name}
          </span>
        )}
      </div>

      {/* Create Instance Dialog */}
      {showCreateDialog && (
        <InstanceEditorDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onSave={handleInstanceSaved}
          instanceManager={instanceManager}
        />
      )}

      {/* Edit Instance Dialog */}
      {editingInstance && (
        <InstanceEditorDialog
          isOpen={!!editingInstance}
          onClose={() => setEditingInstance(null)}
          onSave={handleInstanceSaved}
          instanceManager={instanceManager}
          instance={editingInstance}
        />
      )}
    </div>
  );
}