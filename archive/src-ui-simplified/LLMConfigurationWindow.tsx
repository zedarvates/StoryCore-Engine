import React, { useState, useEffect } from 'react';
import type { LLMConfiguration } from '../../electron/configurationTypes';
import { OllamaSettings } from './components/settings/OllamaSettings';
import { useConfiguration } from './ConfigurationContext';
import './LLMConfigurationWindow.css';

interface LLMConfigurationWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: LLMConfiguration) => Promise<void>;
  initialConfig?: LLMConfiguration;
}

export const LLMConfigurationWindow: React.FC<LLMConfigurationWindowProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig
}) => {
  const { saveProjectConfig } = useConfiguration();
  const [config, setConfig] = useState<LLMConfiguration>(initialConfig || {
    provider: 'ollama',
    defaultProvider: 'ollama',
    enableFallback: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  useEffect(() => {
    if (initialConfig) {
      setConfig(initialConfig);
    }
  }, [initialConfig]);

  const parseTemperature = (value: any): number => Number.parseFloat(value);
  const parseTokens = (value: any): number => Number.parseInt(value, 10);
  const isValidNumber = (value: any): boolean => !Number.isNaN(value);

  const validateOpenAI = (field: string, value: any): string => {
    if (field === 'openai.apiKey') {
      if (!value?.trim()) return 'API Key is required for OpenAI';
    } else if (field === 'openai.model') {
      if (!value?.trim()) return 'Model is required for OpenAI';
    } else if (field === 'openai.temperature') {
      const temp = parseTemperature(value);
      if (!isValidNumber(temp) || temp < 0 || temp > 2) return 'Temperature must be between 0 and 2';
    }
    return '';
  };

  const validateOllama = (field: string, value: any): string => {
    if (field === 'ollama.baseUrl') {
      if (!value?.trim()) return 'Base URL is required for Ollama';
      if (!/^https?:\/\/.+/.test(value)) return 'URL must start with http:// or https://';
    } else if (field === 'ollama.model') {
      if (!value?.trim()) return 'Model is required for Ollama';
    } else if (field === 'ollama.temperature') {
      const temp = parseTemperature(value);
      if (!isValidNumber(temp) || temp < 0 || temp > 2) return 'Temperature must be between 0 and 2';
    } else if (field === 'ollama.maxTokens') {
      const tokens = parseTokens(value);
      if (!isValidNumber(tokens) || tokens <= 0) return 'Max tokens must be a positive number';
    }
    return '';
  };

  const validateField = (field: string, value: any): string => {
    if (field.startsWith('openai.')) {
      return validateOpenAI(field, value);
    } else if (field.startsWith('ollama.')) {
      return validateOllama(field, value);
    }
    return '';
  };

  const getOpenAIErrors = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    const apiKeyError = validateField('openai.apiKey', config.openai?.apiKey);
    if (apiKeyError) newErrors['openai.apiKey'] = apiKeyError;

    const modelError = validateField('openai.model', config.openai?.model);
    if (modelError) newErrors['openai.model'] = modelError;

    const tempError = validateField('openai.temperature', config.openai?.temperature);
    if (tempError) newErrors['openai.temperature'] = tempError;
    return newErrors;
  };

  const getOllamaErrors = (): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    const baseUrlError = validateField('ollama.baseUrl', config.ollama?.baseUrl);
    if (baseUrlError) newErrors['ollama.baseUrl'] = baseUrlError;

    const modelError = validateField('ollama.model', config.ollama?.model);
    if (modelError) newErrors['ollama.model'] = modelError;

    const tempError = validateField('ollama.temperature', config.ollama?.temperature);
    if (tempError) newErrors['ollama.temperature'] = tempError;

    const maxTokensError = validateField('ollama.maxTokens', config.ollama?.maxTokens);
    if (maxTokensError) newErrors['ollama.maxTokens'] = maxTokensError;
    return newErrors;
  };

  const validateAll = (): boolean => {
    const providerErrors = config.provider === 'openai' ? getOpenAIErrors() : getOllamaErrors();
    setErrors(providerErrors);
    return Object.keys(providerErrors).length === 0;
  };

  const handleProviderChange = (provider: LLMConfiguration['provider']) => {
    setConfig({
      ...config,
      provider,
      // Reset provider-specific configs when switching
      ollama: provider === 'ollama' ? config.ollama : undefined,
      openai: provider === 'openai' ? config.openai : undefined
    });
    setErrors({});
  };

  const handleOllamaConfigChange = (ollamaConfig: { endpoint: string; model: string }) => {
    setConfig({
      ...config,
      ollama: {
        ...config.ollama,
        baseUrl: ollamaConfig.endpoint,
        model: ollamaConfig.model,
        temperature: config.ollama?.temperature || 0.7,
        maxTokens: config.ollama?.maxTokens || 2048
      }
    });
  };

  const handleOpenAIConfigChange = (field: keyof NonNullable<LLMConfiguration['openai']>, value: string | number) => {
    setConfig({
      ...config,
      openai: {
        ...config.openai,
        [field]: value
      } as NonNullable<LLMConfiguration['openai']>
    });

    const error = validateField(`openai.${field}`, value);
    setErrors(prev => ({
      ...prev,
      [`openai.${field}`]: error
    }));
  };

  const testConnection = async () => {
    if (config.provider === 'ollama') {
      // Ollama connection testing is handled by OllamaSettings component
      return;
    }

    setConnectionStatus('testing');
    try {
      if (config.provider === 'openai' && config.openai?.apiKey) {
        // Test OpenAI connection
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${config.openai.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          setConnectionStatus('success');
        } else {
          setConnectionStatus('failed');
        }
      } else {
        setConnectionStatus('failed');
      }
    } catch (error) {
      setConnectionStatus('failed');
    }
  };

  const handleSave = async () => {
    if (!validateAll()) {
      return;
    }

    setIsSaving(true);
    try {
      await saveProjectConfig({ llm: config });
      onClose();
    } catch (error) {
      console.error('Failed to save LLM configuration:', error);
      alert('Failed to save configuration. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const getConnectionStatusText = (): string => {
    if (connectionStatus === 'testing') {
      return '⏳ Testing...';
    }
    if (connectionStatus === 'success') {
      return '✓ Connected';
    }
    if (connectionStatus === 'failed') {
      return '✗ Failed';
    }
    return '○ Not tested';
  };

  if (!isOpen) return null;

  return (
    <div className="llm-config-modal-overlay" onClick={onClose}>
      <div className="llm-config-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="llm-config-title">LLM Configuration</h2>

        {/* Provider Selection */}
        <div className="llm-config-form-group">
          <label className="llm-config-label" htmlFor="llm-provider-select">LLM Provider</label>
          <select
            id="llm-provider-select"
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value as LLMConfiguration['provider'])}
            className="llm-config-select"
            title="Select your LLM provider"
          >
            <option value="ollama">Ollama (Local)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Provider-specific Configuration */}
        {config.provider === 'ollama' && (
          <div className="llm-config-form-group">
            <h3 className="llm-config-section-title">Ollama Configuration</h3>
            <OllamaSettings onConfigChange={handleOllamaConfigChange} />
          </div>
        )}

        {config.provider === 'openai' && (
          <div className="llm-config-form-group">
            <h3 className="llm-config-section-title">OpenAI Configuration</h3>

            <div className="llm-config-form-group">
              <label className="llm-config-label">API Key</label>
              <input
                type="password"
                value={config.openai?.apiKey || ''}
                onChange={(e) => handleOpenAIConfigChange('apiKey', e.target.value)}
                className={`llm-config-input ${errors['openai.apiKey'] ? 'error' : ''}`}
                placeholder="Enter OpenAI API key"
              />
              {errors['openai.apiKey'] && <div className="llm-config-error">{errors['openai.apiKey']}</div>}
            </div>

            <div className="llm-config-form-group">
              <label className="llm-config-label">Model</label>
              <input
                type="text"
                value={config.openai?.model || ''}
                onChange={(e) => handleOpenAIConfigChange('model', e.target.value)}
                className={`llm-config-input ${errors['openai.model'] ? 'error' : ''}`}
                placeholder="e.g., gpt-4, gpt-3.5-turbo"
              />
              {errors['openai.model'] && <div className="llm-config-error">{errors['openai.model']}</div>}
            </div>

            <div className="llm-config-form-group">
              <label className="llm-config-label" htmlFor="openai-temperature">Temperature</label>
              <input
                id="openai-temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={config.openai?.temperature || 0.7}
                onChange={(e) => handleOpenAIConfigChange('temperature', Number.parseFloat(e.target.value) || 0.7)}
                className={`llm-config-input ${errors['openai.temperature'] ? 'error' : ''}`}
                title="Set the temperature for LLM responses (0-2)"
              />
              {errors['openai.temperature'] && <div className="llm-config-error">{errors['openai.temperature']}</div>}
            </div>
          </div>
        )}

        {config.provider === 'anthropic' && (
          <div className="llm-config-form-group">
            <h3 className="llm-config-section-title">Anthropic Configuration</h3>
            <div className="llm-config-placeholder">Anthropic configuration will be implemented in a future update.</div>
          </div>
        )}

        {config.provider === 'custom' && (
          <div className="llm-config-form-group">
            <h3 className="llm-config-section-title">Custom LLM Configuration</h3>
            <div className="llm-config-placeholder">Custom LLM configuration will be implemented in a future update.</div>
          </div>
        )}

        {/* Connection Status */}
        <div className="llm-config-form-group">
          <label className="llm-config-label">Connection Status</label>
          <div className="llm-config-connection-section">
            <span className={`llm-config-connection-status ${connectionStatus}`}>
              {getConnectionStatusText()}
            </span>
            {config.provider !== 'ollama' && (
              <button
                className="llm-config-button llm-config-button-success"
                onClick={testConnection}
                disabled={connectionStatus === 'testing'}
              >
                Test Connection
              </button>
            )}
          </div>
        </div>

        {/* Global Settings */}
        <div className="llm-config-form-group">
          <label className="llm-config-checkbox-label">
            <input
              type="checkbox"
              checked={config.enableFallback}
              onChange={(e) => setConfig({ ...config, enableFallback: e.target.checked })}
            />
            Enable Fallback Provider
          </label>
        </div>

        <div className="llm-config-actions">
          <button
            className="llm-config-button llm-config-button-primary"
            onClick={handleSave}
            disabled={isSaving || Object.keys(errors).some(key => errors[key])}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button className="llm-config-button llm-config-button-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};