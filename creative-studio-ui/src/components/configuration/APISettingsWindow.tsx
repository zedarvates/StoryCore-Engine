/**
 * API Settings Window Component
 * 
 * Modal window for configuring API endpoints and authentication
 */

import { useState, useEffect } from 'react';
import type {
  APISettingsWindowProps,
  APIConfiguration,
  ValidationResult,
} from '../../types/configuration';
import { useAPIConfig } from '../../hooks/useConfigurationHooks';
import {
  validateAPIConfiguration,
} from '../../services/configurationValidator';
import { useToast } from '../../hooks/use-toast';
import './APISettingsWindow.css';

export function APISettingsWindow({ isOpen, onClose, onSave }: APISettingsWindowProps) {
  const apiConfig = useAPIConfig();
  const { toast } = useToast();
  
  // Local state for form
  const [formData, setFormData] = useState<APIConfiguration | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  // Initialize form data when config changes
  useEffect(() => {
    if (apiConfig) {
      setFormData(apiConfig);
    }
  }, [apiConfig]);

  if (!isOpen || !formData) return null;

  // Handle field changes
  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => {
      if (!prev) return prev;
      
      const keys = field.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // Handle endpoint addition
  const handleAddEndpoint = () => {
    const serviceName = prompt('Enter service name:');
    if (!serviceName) return;
    
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        endpoints: {
          ...prev.endpoints,
          [serviceName]: {
            url: '',
            timeout: prev.defaultTimeout,
            retryAttempts: 3,
          },
        },
      };
    });
  };

  // Handle endpoint removal
  const handleRemoveEndpoint = (serviceName: string) => {
    setFormData(prev => {
      if (!prev) return prev;
      const { [serviceName]: removed, ...rest } = prev.endpoints;
      return {
        ...prev,
        endpoints: rest,
      };
    });
  };

  // Test connection to an endpoint
  const handleTestConnection = async (serviceName: string) => {
    const endpoint = formData.endpoints[serviceName];
    if (!endpoint) return;
    
    setIsTesting(true);
    setTestResults(prev => ({ ...prev, [serviceName]: 'Testing...' }));
    
    try {
      // Simulate connection test (replace with actual API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, randomly succeed or fail
      const success = Math.random() > 0.3;
      
      setTestResults(prev => ({
        ...prev,
        [serviceName]: success ? 'Connection successful' : 'Connection failed',
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [serviceName]: `Error: ${error}`,
      }));
    } finally {
      setIsTesting(false);
    }
  };

  // Handle save
  const handleSave = async () => {
    // Validate configuration
    const validation = validateAPIConfiguration(formData);
    setValidationErrors(validation);
    
    if (!validation.isValid) {
      return;
    }
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save API settings:', error);
      toast({
        title: 'Failed to Save',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  // Get field error
  const getFieldError = (field: string): string | null => {
    const error = validationErrors.errors.find(e => e.field === field);
    return error ? error.message : null;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-window api-settings-window">
        <div className="modal-header">
          <h2>API Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Default Timeout */}
          <div className="form-group">
            <label>Default Timeout (ms)</label>
            <input
              type="number"
              value={formData.defaultTimeout}
              onChange={e => handleFieldChange('defaultTimeout', parseInt(e.target.value))}
              className={getFieldError('defaultTimeout') ? 'error' : ''}
              aria-label="Default timeout in milliseconds"
              title="Default timeout in milliseconds"
            />
            {getFieldError('defaultTimeout') && (
              <span className="error-message">{getFieldError('defaultTimeout')}</span>
            )}
          </div>

          {/* Enable Logging */}
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.enableLogging}
                onChange={e => handleFieldChange('enableLogging', e.target.checked)}
              />
              Enable API Logging
            </label>
          </div>

          {/* Endpoints */}
          <div className="endpoints-section">
            <div className="section-header">
              <h3>API Endpoints</h3>
              <button className="add-button" onClick={handleAddEndpoint}>
                + Add Endpoint
              </button>
            </div>

            {Object.entries(formData.endpoints).map(([serviceName, endpoint]) => (
              <div key={serviceName} className="endpoint-card">
                <div className="endpoint-header">
                  <h4>{serviceName}</h4>
                  <button
                    className="remove-button"
                    onClick={() => handleRemoveEndpoint(serviceName)}
                  >
                    Remove
                  </button>
                </div>

                <div className="form-group">
                  <label>URL</label>
                  <input
                    type="text"
                    value={endpoint.url}
                    onChange={e =>
                      handleFieldChange(`endpoints.${serviceName}.url`, e.target.value)
                    }
                    placeholder="https://api.example.com"
                    className={getFieldError(`endpoints.${serviceName}.url`) ? 'error' : ''}
                  />
                  {getFieldError(`endpoints.${serviceName}.url`) && (
                    <span className="error-message">
                      {getFieldError(`endpoints.${serviceName}.url`)}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>API Key (optional)</label>
                  <input
                    type="password"
                    value={endpoint.apiKey || ''}
                    onChange={e =>
                      handleFieldChange(`endpoints.${serviceName}.apiKey`, e.target.value)
                    }
                    placeholder="Enter API key"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Timeout (ms)</label>
                    <input
                      type="number"
                      value={endpoint.timeout}
                      onChange={e =>
                        handleFieldChange(
                          `endpoints.${serviceName}.timeout`,
                          parseInt(e.target.value)
                        )
                      }
                      aria-label={`${serviceName} timeout in milliseconds`}
                      title="Timeout in milliseconds"
                    />
                  </div>

                  <div className="form-group">
                    <label>Retry Attempts</label>
                    <input
                      type="number"
                      value={endpoint.retryAttempts}
                      onChange={e =>
                        handleFieldChange(
                          `endpoints.${serviceName}.retryAttempts`,
                          parseInt(e.target.value)
                        )
                      }
                      aria-label={`${serviceName} retry attempts`}
                      title="Number of retry attempts"
                    />
                  </div>
                </div>

                <button
                  className="test-button"
                  onClick={() => handleTestConnection(serviceName)}
                  disabled={isTesting}
                >
                  Test Connection
                </button>
                
                {testResults[serviceName] && (
                  <div className={`test-result ${testResults[serviceName].includes('successful') ? 'success' : 'error'}`}>
                    {testResults[serviceName]}
                  </div>
                )}
              </div>
            ))}

            {Object.keys(formData.endpoints).length === 0 && (
              <div className="empty-state">
                No endpoints configured. Click "Add Endpoint" to get started.
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={!validationErrors.isValid && validationErrors.errors.length > 0}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
