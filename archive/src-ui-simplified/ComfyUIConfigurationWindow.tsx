/**
 * ComfyUI Configuration Window Component
 * 
 * QUICK SETUP INTERFACE (Dashboard Page)
 * 
 * This is the simplified ComfyUI configuration interface accessible from:
 * Dashboard > Configuration > ComfyUI Settings
 * 
 * Features:
 * - Single server configuration
 * - Quick connection testing
 * - CORS troubleshooting information
 * - Basic workflow setup
 * 
 * For advanced features (multi-server, workflow assignments, etc.),
 * use Settings > ComfyUI Configuration from the top menu bar.
 * 
 * This quick interface is recommended for:
 * - Initial setup and testing
 * - CORS troubleshooting
 * - Single-server configurations
 * - Quick connection verification
 */

import React, { useState, useEffect } from 'react';
import type { ComfyUIConfiguration } from '../../electron/configurationTypes';
import { useConfiguration } from './ConfigurationContext';
import './ComfyUIConfigurationWindow.css';

interface ComfyUIConfigurationWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: ComfyUIConfiguration) => Promise<void>;
  initialConfig?: ComfyUIConfiguration;
}

export const ComfyUIConfigurationWindow: React.FC<ComfyUIConfigurationWindowProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig
}) => {
  const { saveProjectConfig } = useConfiguration();
  const [config, setConfig] = useState<ComfyUIConfiguration>(initialConfig || {
    serverUrl: 'http://localhost:8000',
    defaultWorkflows: {},
    timeout: 30000,
    enableQueueMonitoring: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [availableWorkflows, setAvailableWorkflows] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const validateField = (field: string, value: any): string => {
    if (field === 'serverUrl') {
      if (!value?.trim()) return 'Server URL is required';
      if (!/^https?:\/\/.+/.test(value)) return 'URL must start with http:// or https://';
      try {
        new URL(value);
      } catch {
        return 'Invalid URL format';
      }
    } else if (field === 'timeout') {
      const timeout = parseInt(value);
      if (isNaN(timeout) || timeout <= 0) return 'Timeout must be a positive number';
    } else if (field === 'defaultWorkflows') {
      // Validate workflow mappings
      const workflows = value as Record<string, string>;
      for (const [taskType, workflowId] of Object.entries(workflows)) {
        if (!taskType?.trim()) return 'Task type cannot be empty';
        if (!workflowId?.trim()) return `Workflow ID for "${taskType}" cannot be empty`;
        // If availableWorkflows is loaded, check if workflow exists
        if (availableWorkflows.length > 0 && !availableWorkflows.some(w => w.id === workflowId)) {
          return `Workflow "${workflowId}" for "${taskType}" is not available on the server`;
        }
      }
    }
    return '';
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    const serverUrlError = validateField('serverUrl', config.serverUrl);
    if (serverUrlError) newErrors.serverUrl = serverUrlError;

    const timeoutError = validateField('timeout', config.timeout);
    if (timeoutError) newErrors.timeout = timeoutError;

    const workflowsError = validateField('defaultWorkflows', config.defaultWorkflows);
    if (workflowsError) newErrors.defaultWorkflows = workflowsError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfigChange = (field: keyof ComfyUIConfiguration, value: any) => {
    setConfig({
      ...config,
      [field]: value
    });

    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const handleWorkflowChange = (taskType: string, workflowId: string) => {
    setConfig({
      ...config,
      defaultWorkflows: {
        ...config.defaultWorkflows,
        [taskType]: workflowId
      }
    });
  };

  const removeWorkflow = (taskType: string) => {
    const newWorkflows = { ...config.defaultWorkflows };
    delete newWorkflows[taskType];
    setConfig({
      ...config,
      defaultWorkflows: newWorkflows
    });
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      // Test ComfyUI connection by making a basic request
      const response = await fetch(`${config.serverUrl}/system_stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(config.timeout)
      });

      if (response.ok) {
        setConnectionStatus('success');
        // Optionally fetch available workflows
        fetchAvailableWorkflows();
      } else {
        setConnectionStatus('failed');
      }
    } catch (error) {
      setConnectionStatus('failed');
    }
  };

  const fetchAvailableWorkflows = async () => {
    try {
      const response = await fetch(`${config.serverUrl}/workflows`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const workflows = await response.json();
        setAvailableWorkflows(workflows.map((w: any) => ({ id: w.id, name: w.name })));
      }
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const handleSave = async () => {
    if (!validateAll()) {
      return;
    }

    setIsSaving(true);
    try {
      await saveProjectConfig({ comfyui: config });
      onClose();
    } catch (error) {
      console.error('Failed to save ComfyUI configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="comfy-config-modal-overlay" onClick={onClose}>
      <div className="comfy-config-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="comfy-config-title">ComfyUI Configuration</h2>

        {/* Server Configuration */}
        <h3 className="comfy-config-section-title">Server Configuration</h3>

        <div className="comfy-config-form-group">
          <label className="comfy-config-label">Server URL</label>
          <input
            type="text"
            value={config.serverUrl}
            onChange={(e) => handleConfigChange('serverUrl', e.target.value)}
            className={`comfy-config-input ${errors.serverUrl ? 'error' : ''}`}
            placeholder="http://localhost:8188"
          />
          {errors.serverUrl && <div className="comfy-config-error">{errors.serverUrl}</div>}
        </div>

        <div className="comfy-config-form-group">
          <label className="comfy-config-label">API Key (Optional)</label>
          <input
            type="password"
            value={config.apiKey || ''}
            onChange={(e) => handleConfigChange('apiKey', e.target.value)}
            className="comfy-config-input"
            placeholder="Enter API key if required"
          />
        </div>

        <div className="comfy-config-form-group">
          <label className="comfy-config-label">Timeout (ms)</label>
          <input
            type="number"
            value={config.timeout}
            onChange={(e) => handleConfigChange('timeout', parseInt(e.target.value) || 30000)}
            className={`comfy-config-input ${errors.timeout ? 'error' : ''}`}
            min="1000"
            max="120000"
          />
          {errors.timeout && <div className="comfy-config-error">{errors.timeout}</div>}
        </div>

        {/* Connection Status */}
        <div className="comfy-config-form-group">
          <label className="comfy-config-label">Connection Status</label>
          <div className="comfy-config-connection-section">
            <span className={`comfy-config-connection-status ${connectionStatus}`}>
              {connectionStatus === 'testing' ? '⏳ Testing...' :
               connectionStatus === 'success' ? '✓ Connected' :
               connectionStatus === 'failed' ? '✗ Failed' :
               '○ Not tested'}
            </span>
            <button
              className="comfy-config-button comfy-config-button-success"
              onClick={testConnection}
              disabled={connectionStatus === 'testing'}
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Workflow Selection */}
        <h3 className="comfy-config-section-title">Default Workflows</h3>
        <div className="comfy-config-form-group">
          <div className="comfy-config-workflow-description">
            Configure default workflows for different task types
          </div>
          {errors.defaultWorkflows && <div className="comfy-config-error">{errors.defaultWorkflows}</div>}

          {Object.entries(config.defaultWorkflows).map(([taskType, workflowId]) => (
            <div key={taskType} className="comfy-config-workflow-item">
              <input
                type="text"
                value={taskType}
                onChange={(e) => {
                  const newWorkflows = { ...config.defaultWorkflows };
                  delete newWorkflows[taskType];
                  newWorkflows[e.target.value] = workflowId;
                  setConfig({ ...config, defaultWorkflows: newWorkflows });
                }}
                className="comfy-config-input"
                placeholder="Task type (e.g., text-to-image)"
              />
              <select
                value={workflowId}
                onChange={(e) => handleWorkflowChange(taskType, e.target.value)}
                className="comfy-config-select"
              >
                <option value="">Select workflow...</option>
                {availableWorkflows.map(workflow => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.name}
                  </option>
                ))}
              </select>
              <button
                className="comfy-config-button comfy-config-button-danger"
                onClick={() => removeWorkflow(taskType)}
              >
                Remove
              </button>
            </div>
          ))}

          <div className="comfy-config-button-group">
            <button
              className="comfy-config-button comfy-config-button-info"
              onClick={() => {
                const taskType = `task_${Object.keys(config.defaultWorkflows).length + 1}`;
                setConfig({
                  ...config,
                  defaultWorkflows: {
                    ...config.defaultWorkflows,
                    [taskType]: ''
                  }
                });
              }}
            >
              Add Workflow Mapping
            </button>
          </div>
        </div>

        {/* Queue Monitoring */}
        <div className="comfy-config-form-group">
          <label className="comfy-config-checkbox-label">
            <input
              type="checkbox"
              checked={config.enableQueueMonitoring}
              onChange={(e) => handleConfigChange('enableQueueMonitoring', e.target.checked)}
            />
            Enable Queue Monitoring
          </label>
        </div>

        <div className="comfy-config-actions">
          <button
            className="comfy-config-button comfy-config-button-primary"
            onClick={handleSave}
            disabled={isSaving || Object.keys(errors).some(key => errors[key])}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button className="comfy-config-button comfy-config-button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};