import React, { useState, useEffect } from 'react';
import type { APIConfiguration } from '../../electron/configurationTypes';
import { InlineErrorMessage } from './InlineErrorMessage';
import { getFieldStyle } from './FieldHighlight';
import { useNotifications, ErrorNotification } from './ErrorNotification';
import './APISettingsWindow.css';

interface APISettingsWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: APIConfiguration) => Promise<void>;
  onChange?: (config: APIConfiguration) => void;
  initialConfig?: APIConfiguration;
}

interface EndpointConfig {
  serviceName: string;
  url: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  connectionStatus?: 'idle' | 'testing' | 'success' | 'failed';
}

export const APISettingsWindow: React.FC<APISettingsWindowProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState<APIConfiguration>(initialConfig || {
    endpoints: {},
    defaultTimeout: 30000,
    enableLogging: true
  });
  const [endpoints, setEndpoints] = useState<EndpointConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { notifications, addNotification, removeNotification } = useNotifications();

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
      const endpointList = Object.entries(initialConfig.endpoints).map(([serviceName, endpoint]) => ({
        serviceName,
        url: endpoint.url,
        apiKey: endpoint.apiKey || '',
        timeout: endpoint.timeout,
        retryAttempts: endpoint.retryAttempts,
        connectionStatus: 'idle' as const
      }));
      setEndpoints(endpointList);
    }
  }, [initialConfig]);

  const validateField = (field: string, value: any, index?: number): string => {
    let fieldKey = field;
    if (index !== undefined) fieldKey = `${field}_${index}`;

    if (field === 'serviceName') {
      if (!value.trim()) return 'Service name is required';
      if (endpoints.some((e, i) => i !== index && e.serviceName.trim().toLowerCase() === value.trim().toLowerCase())) {
        return 'Service name must be unique';
      }
    } else if (field === 'url') {
      if (!value.trim()) return 'URL is required';
      if (!/^https?:\/\/.+/.test(value)) return 'URL must start with http:// or https://';
      try {
        new URL(value);
      } catch {
        return 'Invalid URL format';
      }
    } else if (field === 'timeout') {
      const num = parseInt(value);
      if (isNaN(num) || num <= 0) return 'Timeout must be a positive number';
    } else if (field === 'retryAttempts') {
      const num = parseInt(value);
      if (isNaN(num) || num < 0) return 'Retry attempts must be a non-negative number';
    } else if (field === 'defaultTimeout') {
      const num = parseInt(value);
      if (isNaN(num) || num <= 0) return 'Default timeout must be a positive number';
    }

    return '';
  };

  const validateAll = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate global config
    const defaultTimeoutError = validateField('defaultTimeout', config.defaultTimeout);
    if (defaultTimeoutError) newErrors.defaultTimeout = defaultTimeoutError;

    // Validate endpoints
    endpoints.forEach((endpoint, index) => {
      const serviceNameError = validateField('serviceName', endpoint.serviceName, index);
      if (serviceNameError) newErrors[`serviceName_${index}`] = serviceNameError;

      const urlError = validateField('url', endpoint.url, index);
      if (urlError) newErrors[`url_${index}`] = urlError;

      const timeoutError = validateField('timeout', endpoint.timeout, index);
      if (timeoutError) newErrors[`timeout_${index}`] = timeoutError;

      const retryError = validateField('retryAttempts', endpoint.retryAttempts, index);
      if (retryError) newErrors[`retryAttempts_${index}`] = retryError;
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addEndpoint = () => {
    setEndpoints([...endpoints, {
      serviceName: '',
      url: '',
      apiKey: '',
      timeout: config.defaultTimeout,
      retryAttempts: 3,
      connectionStatus: 'idle'
    }]);
  };

  const updateEndpoint = (index: number, field: keyof EndpointConfig, value: string | number) => {
    const updated = [...endpoints];
    updated[index] = { ...updated[index], [field]: value };
    setEndpoints(updated);

    // Validate the field
    const error = validateField(field, value, index);
    const fieldKey = `${field}_${index}`;
    setErrors(prev => ({
      ...prev,
      [fieldKey]: error
    }));
  };

  const handleFieldBlur = (field: string, value: any, index?: number) => {
    const error = validateField(field, value, index);
    const fieldKey = index !== undefined ? `${field}_${index}` : field;
    setErrors(prev => ({
      ...prev,
      [fieldKey]: error
    }));
  };

  const removeEndpoint = (index: number) => {
    setEndpoints(endpoints.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!validateAll()) {
      addNotification({
        type: 'error',
        title: 'Validation Failed',
        message: 'Please fix all errors before saving.',
        autoClose: true,
        duration: 3000
      });
      return;
    }

    setIsSaving(true);
    try {
      const endpointsObj: APIConfiguration['endpoints'] = {};
      endpoints.forEach(endpoint => {
        if (endpoint.serviceName.trim()) {
          endpointsObj[endpoint.serviceName] = {
            url: endpoint.url,
            apiKey: endpoint.apiKey || undefined,
            timeout: endpoint.timeout,
            retryAttempts: endpoint.retryAttempts
          };
        }
      });

      const newConfig: APIConfiguration = {
        ...config,
        endpoints: endpointsObj
      };

      await onSave(newConfig);
      addNotification({
        type: 'success',
        title: 'Configuration Saved',
        message: 'API settings have been saved successfully.',
        autoClose: true,
        duration: 3000
      });
      onClose();
    } catch (error) {
      console.error('Failed to save API configuration:', error);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save configuration. Please try again.',
        actions: [
          {
            label: 'Retry',
            onClick: () => handleSave(),
            primary: true
          }
        ]
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (endpoint: EndpointConfig, index: number) => {
    // Update status to testing
    setEndpoints(prev => prev.map((e, i) =>
      i === index ? { ...e, connectionStatus: 'testing' as const } : e
    ));

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

      const response = await fetch(endpoint.url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: endpoint.apiKey ? { 'Authorization': `Bearer ${endpoint.apiKey}` } : {}
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setEndpoints(prev => prev.map((e, i) =>
          i === index ? { ...e, connectionStatus: 'success' as const } : e
        ));
        addNotification({
          type: 'success',
          title: 'Connection Successful',
          message: `${endpoint.serviceName} (${endpoint.url}) is reachable.`,
          autoClose: true,
          duration: 3000
        });
      } else {
        setEndpoints(prev => prev.map((e, i) =>
          i === index ? { ...e, connectionStatus: 'failed' as const } : e
        ));
        addNotification({
          type: 'error',
          title: 'Connection Failed',
          message: `${endpoint.serviceName} (${endpoint.url}) returned status ${response.status}.`,
          actions: [
            {
              label: 'Retry',
              onClick: () => testConnection(endpoint, index),
              primary: true
            }
          ]
        });
      }
    } catch (error) {
      setEndpoints(prev => prev.map((e, i) =>
        i === index ? { ...e, connectionStatus: 'failed' as const } : e
      ));
      addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: `${endpoint.serviceName} (${endpoint.url}) could not be reached.`,
        actions: [
          {
            label: 'Retry',
            onClick: () => testConnection(endpoint, index),
            primary: true
          }
        ]
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="api-settings-modal-overlay" onClick={onClose}>
      <div className="api-settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="api-settings-title">API Settings</h2>

        <div className="api-settings-form-group">
          <label className="api-settings-label">Default Timeout (ms)</label>
          <input
            type="number"
            value={config.defaultTimeout}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 30000;
              setConfig({ ...config, defaultTimeout: value });
              handleFieldBlur('defaultTimeout', value);
            }}
            onBlur={(e) => handleFieldBlur('defaultTimeout', parseInt(e.target.value) || 30000)}
            className="api-settings-input"
            style={getFieldStyle(!!errors.defaultTimeout)}
          />
          {errors.defaultTimeout && <InlineErrorMessage message={errors.defaultTimeout} />}
        </div>

        <div className="api-settings-form-group">
          <label className="api-settings-checkbox-label">
            <input
              type="checkbox"
              checked={config.enableLogging}
              onChange={(e) => setConfig({ ...config, enableLogging: e.target.checked })}
            />
            Enable Logging
          </label>
        </div>

        <h3 className="api-settings-section-title">Endpoints</h3>
        {endpoints.map((endpoint, index) => (
          <div key={index} className="api-settings-endpoint-card">
            <div className="api-settings-form-group">
              <label className="api-settings-label">Service Name</label>
              <input
                type="text"
                value={endpoint.serviceName}
                onChange={(e) => updateEndpoint(index, 'serviceName', e.target.value)}
                onBlur={(e) => handleFieldBlur('serviceName', e.target.value, index)}
                className="api-settings-input"
                style={getFieldStyle(!!errors[`serviceName_${index}`])}
                placeholder="e.g., openai, custom-api"
              />
              {errors[`serviceName_${index}`] && <InlineErrorMessage message={errors[`serviceName_${index}`]} />}
            </div>

            <div className="api-settings-form-group">
              <label className="api-settings-label">
                URL
                <span className={`api-settings-connection-status ${endpoint.connectionStatus || 'idle'}`}>
                  {endpoint.connectionStatus === 'testing' ? 'Testing' :
                   endpoint.connectionStatus === 'success' ? 'Connected' :
                   endpoint.connectionStatus === 'failed' ? 'Failed' :
                   'Not Tested'}
                </span>
              </label>
              <input
                type="url"
                value={endpoint.url}
                onChange={(e) => updateEndpoint(index, 'url', e.target.value)}
                onBlur={(e) => handleFieldBlur('url', e.target.value, index)}
                className="api-settings-input"
                style={getFieldStyle(!!errors[`url_${index}`])}
                placeholder="https://api.example.com"
              />
              {errors[`url_${index}`] && <InlineErrorMessage message={errors[`url_${index}`]} />}
            </div>

            <div className="api-settings-form-group">
              <label className="api-settings-label">API Key (masked)</label>
              <input
                type="password"
                value={endpoint.apiKey}
                onChange={(e) => updateEndpoint(index, 'apiKey', e.target.value)}
                className="api-settings-input"
                placeholder="Enter API key"
              />
            </div>

            <div className="api-settings-form-group">
              <label className="api-settings-label">Timeout (ms)</label>
              <input
                type="number"
                value={endpoint.timeout}
                onChange={(e) => updateEndpoint(index, 'timeout', parseInt(e.target.value) || config.defaultTimeout)}
                onBlur={(e) => handleFieldBlur('timeout', parseInt(e.target.value) || config.defaultTimeout, index)}
                className="api-settings-input"
                style={getFieldStyle(!!errors[`timeout_${index}`])}
              />
              {errors[`timeout_${index}`] && <InlineErrorMessage message={errors[`timeout_${index}`]} />}
            </div>

            <div className="api-settings-form-group">
              <label className="api-settings-label">Retry Attempts</label>
              <input
                type="number"
                value={endpoint.retryAttempts}
                onChange={(e) => updateEndpoint(index, 'retryAttempts', parseInt(e.target.value) || 3)}
                onBlur={(e) => handleFieldBlur('retryAttempts', parseInt(e.target.value) || 3, index)}
                className="api-settings-input"
                style={getFieldStyle(!!errors[`retryAttempts_${index}`])}
              />
              {errors[`retryAttempts_${index}`] && <InlineErrorMessage message={errors[`retryAttempts_${index}`]} />}
            </div>

            <div className="api-settings-button-group">
              <button
                className="api-settings-button api-settings-button-success"
                onClick={() => testConnection(endpoint, index)}
                disabled={!endpoint.url || endpoint.connectionStatus === 'testing'}
              >
                {endpoint.connectionStatus === 'testing' ? 'Testing...' :
                 endpoint.connectionStatus === 'success' ? '✓ Connected' :
                 endpoint.connectionStatus === 'failed' ? '✗ Failed' :
                 'Test Connection'}
              </button>

              <button className="api-settings-button api-settings-button-danger" onClick={() => removeEndpoint(index)}>
                Remove
              </button>
            </div>
          </div>
        ))}

        <button className="api-settings-button api-settings-button-primary" onClick={addEndpoint}>
          Add Endpoint
        </button>

        <div className="api-settings-actions">
          <button
            className="api-settings-button api-settings-button-primary"
            onClick={handleSave}
            disabled={isSaving || Object.keys(errors).some(key => errors[key])}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button className="api-settings-button api-settings-button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
      <ErrorNotification
        notifications={notifications}
        onDismiss={removeNotification}
      />
    </div>
  );
};