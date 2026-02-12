/**
 * Instance Editor Dialog Component
 *
 * Modal dialog for creating new ComfyUI instances or editing existing ones.
 * Provides form inputs for all instance configuration options.
 */

import { useState, useEffect } from 'react';
import type {
  ComfyUIInstance,
  ComfyUIInstanceConfig,
  CreateInstanceParams,
  UpdateInstanceParams,
} from '../../types/comfyui-instance';
import { ComfyUIInstanceManager } from '../../services/wizard/ComfyUIInstanceManager';
import './InstanceEditorDialog.css';

export interface InstanceEditorDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Callback when instance is saved */
  onSave: () => void;
  /** Instance manager */
  instanceManager: ComfyUIInstanceManager;
  /** Instance to edit (null for creating new) */
  instance?: ComfyUIInstance | null;
}

/**
 * Instance Editor Dialog Component
 */
export function InstanceEditorDialog({
  isOpen,
  onClose,
  onSave,
  instanceManager,
  instance = null,
}: InstanceEditorDialogProps) {
  const isEditing = !!instance;

  // Form state
  const [formData, setFormData] = useState<Partial<ComfyUIInstanceConfig>>({
    name: '',
    port: 8188,
    host: 'localhost',
    gpuDevice: '',
    envVars: {},
    customNodesPath: '',
    maxConcurrentWorkflows: 1,
    timeoutMs: 300000,
    enableQueueMonitoring: true,
    autoStart: false,
    description: '',
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data when dialog opens or instance changes
  useEffect(() => {
    if (isOpen) {
      if (instance) {
        // Editing existing instance
        setFormData({ ...instance.config });
      } else {
        // Creating new instance
        setFormData({
          name: '',
          port: 8188,
          host: 'localhost',
          gpuDevice: '',
          envVars: {},
          customNodesPath: '',
          maxConcurrentWorkflows: 1,
          timeoutMs: 300000,
          enableQueueMonitoring: true,
          autoStart: false,
          description: '',
        });
      }
      setError(null);
      setValidationErrors({});
    }
  }, [isOpen, instance]);

  // Handle input changes
  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle environment variable changes
  const handleEnvVarChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      envVars: {
        ...prev.envVars,
        [key]: value,
      },
    }));
  };

  const removeEnvVar = (key: string) => {
    setFormData(prev => {
      const newEnvVars = { ...prev.envVars };
      delete newEnvVars[key];
      return {
        ...prev,
        envVars: newEnvVars,
      };
    });
  };

  const addEnvVar = () => {
    const key = `VAR_${Object.keys(formData.envVars || {}).length + 1}`;
    handleEnvVarChange(key, '');
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      errors.name = 'Instance name is required';
    }

    if (typeof formData.port !== 'number' || formData.port < 1 || formData.port > 65535) {
      errors.port = 'Port must be a number between 1 and 65535';
    }

    if (formData.host && !/^[a-zA-Z0-9.-]+$/.test(formData.host)) {
      errors.host = 'Host must be a valid hostname or IP address';
    }

    if (formData.maxConcurrentWorkflows && formData.maxConcurrentWorkflows < 1) {
      errors.maxConcurrentWorkflows = 'Max concurrent workflows must be at least 1';
    }

    if (formData.timeoutMs && formData.timeoutMs < 1000) {
      errors.timeoutMs = 'Timeout must be at least 1000ms';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && instance) {
        // Update existing instance
        await instanceManager.updateInstance(instance.id, formData as UpdateInstanceParams);
      } else {
        // Create new instance
        await instanceManager.createInstance(formData as CreateInstanceParams);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save instance');
    } finally {
      setLoading(false);
    }
  };

  // Handle test connection
  const handleTestConnection = async () => {
    if (!formData.port || !formData.host) {
      setError('Please enter host and port first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create temporary instance to test connection
      const testInstance = await instanceManager.createInstance({
        name: 'test-connection',
        port: formData.port,
        host: formData.host || 'localhost',
      });

      // Try to start it (this will check connection)
      await instanceManager.startInstance(testInstance.id);

      // Clean up
      await instanceManager.deleteInstance(testInstance.id);

      setError('Connection successful!');
      setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(`Connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal-window instance-editor-dialog">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit ComfyUI Instance' : 'Create ComfyUI Instance'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && (
            <div className={`message ${error.includes('successful') ? 'success' : 'error'}`}>
              {error}
            </div>
          )}

          <div className="form-sections">
            {/* Basic Settings */}
            <div className="form-section">
              <h3>Basic Settings</h3>

              <div className="form-group">
                <label htmlFor="name">Instance Name *</label>
                <input
                  id="name"
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={validationErrors.name ? 'error' : ''}
                  placeholder="e.g., Primary GPU Instance"
                />
                {validationErrors.name && (
                  <span className="field-error">{validationErrors.name}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="host">Host</label>
                  <input
                    id="host"
                    type="text"
                    value={formData.host || ''}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                    className={validationErrors.host ? 'error' : ''}
                    placeholder="localhost"
                  />
                  {validationErrors.host && (
                    <span className="field-error">{validationErrors.host}</span>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="port">Port *</label>
                  <input
                    id="port"
                    type="number"
                    value={formData.port || ''}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                    className={validationErrors.port ? 'error' : ''}
                    placeholder="8188"
                    min="1"
                    max="65535"
                  />
                  {validationErrors.port && (
                    <span className="field-error">{validationErrors.port}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description of this instance"
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.autoStart || false}
                    onChange={(e) => handleInputChange('autoStart', e.target.checked)}
                  />
                  Auto-start on application launch
                </label>
              </div>
            </div>

            {/* Resource Configuration */}
            <div className="form-section">
              <h3>Resource Configuration</h3>

              <div className="form-group">
                <label htmlFor="gpuDevice">GPU Device</label>
                <input
                  id="gpuDevice"
                  type="text"
                  value={formData.gpuDevice || ''}
                  onChange={(e) => handleInputChange('gpuDevice', e.target.value)}
                  placeholder="e.g., cuda:0, auto, or leave empty"
                />
                <small className="field-help">
                  Specify GPU device (e.g., cuda:0) or leave empty for auto-detection
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="customNodesPath">Custom Nodes Path</label>
                <input
                  id="customNodesPath"
                  type="text"
                  value={formData.customNodesPath || ''}
                  onChange={(e) => handleInputChange('customNodesPath', e.target.value)}
                  placeholder="Path to custom nodes directory"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxConcurrentWorkflows">Max Concurrent Workflows</label>
                <input
                  id="maxConcurrentWorkflows"
                  type="number"
                  value={formData.maxConcurrentWorkflows || ''}
                  onChange={(e) => handleInputChange('maxConcurrentWorkflows', parseInt(e.target.value))}
                  className={validationErrors.maxConcurrentWorkflows ? 'error' : ''}
                  placeholder="1"
                  min="1"
                />
                {validationErrors.maxConcurrentWorkflows && (
                  <span className="field-error">{validationErrors.maxConcurrentWorkflows}</span>
                )}
              </div>
            </div>

            {/* Runtime Settings */}
            <div className="form-section">
              <h3>Runtime Settings</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="timeoutMs">Timeout (ms)</label>
                  <input
                    id="timeoutMs"
                    type="number"
                    value={formData.timeoutMs || ''}
                    onChange={(e) => handleInputChange('timeoutMs', parseInt(e.target.value))}
                    className={validationErrors.timeoutMs ? 'error' : ''}
                    placeholder="300000"
                    min="1000"
                  />
                  {validationErrors.timeoutMs && (
                    <span className="field-error">{validationErrors.timeoutMs}</span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.enableQueueMonitoring || false}
                    onChange={(e) => handleInputChange('enableQueueMonitoring', e.target.checked)}
                  />
                  Enable queue monitoring
                </label>
              </div>
            </div>

            {/* Environment Variables */}
            <div className="form-section">
              <h3>Environment Variables</h3>
              <p className="section-description">
                Custom environment variables for this ComfyUI instance
              </p>

              {Object.entries(formData.envVars || {}).map(([key, value]) => (
                <div key={key} className="env-var-row">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      // Rename key
                      const newKey = e.target.value;
                      const newEnvVars = { ...formData.envVars };
                      delete newEnvVars[key];
                      newEnvVars[newKey] = value;
                      handleInputChange('envVars', newEnvVars);
                    }}
                    placeholder="VARIABLE_NAME"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleEnvVarChange(key, e.target.value)}
                    placeholder="value"
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeEnvVar(key)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button type="button" className="btn-add" onClick={addEnvVar}>
                + Add Environment Variable
              </button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={handleTestConnection}
            disabled={loading}
          >
            Test Connection
          </button>

          <div className="footer-actions">
            <button className="btn-cancel" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={loading || Object.keys(validationErrors).length > 0}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Instance' : 'Create Instance')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

