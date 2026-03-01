/**
 * LLM Configuration Window Component
 * 
 * Modal window for configuring language model providers including Ollama
 */

import { useState } from 'react';
import type {
  LLMConfigurationWindowProps,
  LLMConfiguration,
  ValidationResult,
} from '../../types/configuration';
import { useLLMConfig } from '../../hooks/useConfigurationHooks';
import { validateLLMConfiguration } from '../../services/configurationValidator';
import { eventEmitter, WizardEventType } from '../../services/eventEmitter';
import { DEFAULT_LLM_CONFIG } from '../../types/configuration';
import { saveLLMSettings } from '../../utils/secureStorage';
import type { LLMConfig, LLMProvider } from '../../services/llmService';
import './LLMConfigurationWindow.css';

export function LLMConfigurationWindow({ isOpen, onClose, onSave }: LLMConfigurationWindowProps) {
  const llmConfig = useLLMConfig();
  
  // Local state for form
  const [formData, setFormData] = useState<LLMConfiguration | null>(() => {
    if (!llmConfig) return null;
    return {
      ...DEFAULT_LLM_CONFIG,
      ...llmConfig,
      systemPrompts: {
        ...DEFAULT_LLM_CONFIG.systemPrompts,
        ...(llmConfig.systemPrompts || {}),
      },
      parameters: {
        ...DEFAULT_LLM_CONFIG.parameters,
        ...(llmConfig.parameters || {}),
      },
    };
  });
  const [prevConfig, setPrevConfig] = useState<LLMConfiguration | null>(llmConfig);

  // Sync state if config from props changes
  if (llmConfig !== prevConfig) {
    setPrevConfig(llmConfig);
    setFormData(() => {
      if (!llmConfig) return null;
      return {
        ...DEFAULT_LLM_CONFIG,
        ...llmConfig,
        systemPrompts: {
          ...DEFAULT_LLM_CONFIG.systemPrompts,
          ...(llmConfig.systemPrompts || {}),
        },
        parameters: {
          ...DEFAULT_LLM_CONFIG.parameters,
          ...(llmConfig.parameters || {}),
        },
      };
    });
  }

  const [activeTab, setActiveTab] = useState<'provider' | 'prompts'>('provider');
  const [validationErrors, setValidationErrors] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});

  if (!isOpen || !formData) return null;

  // Handle provider change
  const handleProviderChange = (provider: 'ollama' | 'openai' | 'anthropic' | 'custom') => {
    setFormData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        provider,
        defaultProvider: provider,
      };
    });
  };

  // Handle field changes
  const handleFieldChange = (field: string, value: unknown) => {
    setFormData(prev => {
      if (!prev) return prev;
      
      const keys = field.split('.');
      const newData = JSON.parse(JSON.stringify(prev));
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  // Test connection
  const handleTestConnection = async (provider: string) => {
    setConnectionStatus(prev => ({ ...prev, [provider]: 'Testing...' }));
    
    try {
      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes
      const success = Math.random() > 0.2;
      
      setConnectionStatus(prev => ({
        ...prev,
        [provider]: success ? 'Connected' : 'Connection failed',
      }));
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [provider]: `Error: ${error}`,
      }));
    }
  };

  // Handle save
  const handleSave = async () => {
    // Validate configuration
    const validation = validateLLMConfiguration(formData);
    setValidationErrors(validation);
    
    if (!validation.isValid) {
      return;
    }
    
    try {
      // 1. Save to project configuration (localStorage via context)
      await onSave(formData);
      
      // 2. Map to LLMService config format and save to secure storage
      const serviceConfig: LLMConfig = {
        provider: (formData.provider === 'ollama' ? 'local' : formData.provider) as LLMProvider,
        apiKey: (formData.provider === 'openai' ? formData.openai?.apiKey : 
                 formData.provider === 'anthropic' ? formData.anthropic?.apiKey : '') || '',
        apiEndpoint: formData.provider === 'ollama' ? formData.ollama?.baseUrl : 
                    formData.provider === 'custom' ? formData.custom?.baseUrl : undefined,
        model: formData.provider === 'ollama' ? formData.ollama?.model : 
               formData.provider === 'openai' ? formData.openai?.model : 
               formData.provider === 'anthropic' ? formData.anthropic?.model : 
               formData.custom?.model || '',
        parameters: {
          temperature: (formData.provider === 'ollama' ? formData.ollama?.temperature : 
                       formData.provider === 'openai' ? formData.openai?.temperature : 
                       formData.provider === 'anthropic' ? formData.anthropic?.temperature : 
                       formData.parameters?.temperature) ?? 0.7,
          maxTokens: (formData.provider === 'ollama' ? formData.ollama?.maxTokens : 
                     formData.provider === 'openai' ? formData.openai?.maxTokens : 
                     formData.provider === 'anthropic' ? formData.anthropic?.maxTokens : 
                     formData.parameters?.maxTokens) ?? 2000,
          topP: formData.parameters?.topP ?? 1.0,
          frequencyPenalty: formData.parameters?.frequencyPenalty ?? 0,
          presencePenalty: formData.parameters?.presencePenalty ?? 0,
        },
        systemPrompts: {
          worldGeneration: formData.systemPrompts?.worldGeneration || '',
          characterGeneration: formData.systemPrompts?.characterGeneration || '',
          dialogueGeneration: formData.systemPrompts?.dialogueGeneration || '',
        },
        timeout: 300000,
        retryAttempts: 3,
        streamingEnabled: true,
      };
      
      await saveLLMSettings(serviceConfig);

      // 3. Emit event to notify other services
      eventEmitter.emit(WizardEventType.LLM_SETTINGS_UPDATED, {
        provider: formData.provider,
        model: serviceConfig.model,
        timestamp: new Date(),
        source: 'LLMConfigurationWindow',
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
      alert(`Failed to save: ${error}`);
    }
  };

  // Get field error
  const getFieldError = (field: string): string | null => {
    const error = validationErrors.errors.find(e => e.field === field);
    return error ? error.message : null;
  };

return (
    <div className="modal-overlay" style={{ zIndex: 99999 }}>
      <div className="modal-window llm-configuration-window">
        <div className="modal-header">
          <h2>LLM Configuration</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {/* Main Navigation Tabs */}
          <div className="config-tabs">
            <button 
              className={`config-tab ${activeTab === 'provider' ? 'active' : ''}`}
              onClick={() => setActiveTab('provider')}
            >
              Provider Settings
            </button>
            <button 
              className={`config-tab ${activeTab === 'prompts' ? 'active' : ''}`}
              onClick={() => setActiveTab('prompts')}
            >
              System Prompts
            </button>
          </div>

          {activeTab === 'provider' ? (
            <>
              {/* Provider Selection */}
              <div className="form-group">
                <label>LLM Provider</label>
                <div className="provider-tabs">
                  <button
                    className={`provider-tab ${formData.provider === 'ollama' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('ollama')}
                  >
                    Ollama
                  </button>
                  <button
                    className={`provider-tab ${formData.provider === 'openai' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('openai')}
                  >
                    OpenAI
                  </button>
                  <button
                    className={`provider-tab ${formData.provider === 'anthropic' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('anthropic')}
                  >
                    Anthropic
                  </button>
                  <button
                    className={`provider-tab ${formData.provider === 'custom' ? 'active' : ''}`}
                    onClick={() => handleProviderChange('custom')}
                  >
                    Custom
                  </button>
                </div>
              </div>

          {/* Ollama Configuration */}
          {formData.provider === 'ollama' && (
            <div className="provider-config">
              <h3>Ollama Settings</h3>
              
              <div className="form-group">
                <label>Base URL</label>
                <input
                  type="text"
                  value={formData.ollama?.baseUrl || ''}
                  onChange={e => handleFieldChange('ollama.baseUrl', e.target.value)}
                  placeholder="http://localhost:11434"
                  className={getFieldError('ollama.baseUrl') ? 'error' : ''}
                />
                {getFieldError('ollama.baseUrl') && (
                  <span className="error-message">{getFieldError('ollama.baseUrl')}</span>
                )}
              </div>

              <div className="form-group">
                <label>Model</label>
                <input
                  type="text"
                  value={formData.ollama?.model || ''}
                  onChange={e => handleFieldChange('ollama.model', e.target.value)}
                  placeholder="llama2"
                  className={getFieldError('ollama.model') ? 'error' : ''}
                />
                {getFieldError('ollama.model') && (
                  <span className="error-message">{getFieldError('ollama.model')}</span>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.ollama?.temperature || 0.7}
                    onChange={e => handleFieldChange('ollama.temperature', parseFloat(e.target.value))}
                    className={getFieldError('ollama.temperature') ? 'error' : ''}
                  />
                  {getFieldError('ollama.temperature') && (
                    <span className="error-message">{getFieldError('ollama.temperature')}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Max Tokens</label>
                  <input
                    type="number"
                    value={formData.ollama?.maxTokens || 2048}
                    onChange={e => handleFieldChange('ollama.maxTokens', parseInt(e.target.value))}
                    className={getFieldError('ollama.maxTokens') ? 'error' : ''}
                  />
                  {getFieldError('ollama.maxTokens') && (
                    <span className="error-message">{getFieldError('ollama.maxTokens')}</span>
                  )}
                </div>
              </div>

              <button
                className="test-button"
                onClick={() => handleTestConnection('ollama')}
              >
                Test Connection
              </button>
              
              {connectionStatus.ollama && (
                <div className={`connection-status ${connectionStatus.ollama.includes('Connected') ? 'success' : 'error'}`}>
                  {connectionStatus.ollama}
                </div>
              )}
            </div>
          )}

          {/* OpenAI Configuration */}
          {formData.provider === 'openai' && (
            <div className="provider-config">
              <h3>OpenAI Settings</h3>
              
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={formData.openai?.apiKey || ''}
                  onChange={e => handleFieldChange('openai.apiKey', e.target.value)}
                  placeholder="sk-..."
                  className={getFieldError('openai.apiKey') ? 'error' : ''}
                />
                {getFieldError('openai.apiKey') && (
                  <span className="error-message">{getFieldError('openai.apiKey')}</span>
                )}
              </div>

              <div className="form-group">
                <label>Model</label>
                <select
                  value={formData.openai?.model || 'gpt-3.5-turbo'}
                  onChange={e => handleFieldChange('openai.model', e.target.value)}
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
              </div>

              <div className="form-group">
                <label>Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.openai?.temperature || 0.7}
                  onChange={e => handleFieldChange('openai.temperature', parseFloat(e.target.value))}
                />
              </div>

              <button
                className="test-button"
                onClick={() => handleTestConnection('openai')}
              >
                Test Connection
              </button>
              
              {connectionStatus.openai && (
                <div className={`connection-status ${connectionStatus.openai.includes('Connected') ? 'success' : 'error'}`}>
                  {connectionStatus.openai}
                </div>
              )}
            </div>
          )}

          {/* Anthropic Configuration */}
          {formData.provider === 'anthropic' && (
            <div className="provider-config">
              <h3>Anthropic Settings</h3>
              
              <div className="form-group">
                <label>API Key</label>
                <input
                  type="password"
                  value={formData.anthropic?.apiKey || ''}
                  onChange={e => handleFieldChange('anthropic.apiKey', e.target.value)}
                  placeholder="sk-ant-..."
                  className={getFieldError('anthropic.apiKey') ? 'error' : ''}
                />
                {getFieldError('anthropic.apiKey') && (
                  <span className="error-message">{getFieldError('anthropic.apiKey')}</span>
                )}
              </div>

              <div className="form-group">
                <label>Model</label>
                <select
                  value={formData.anthropic?.model || 'claude-3-opus'}
                  onChange={e => handleFieldChange('anthropic.model', e.target.value)}
                >
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </select>
              </div>

              <div className="form-group">
                <label>Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.anthropic?.temperature || 0.7}
                  onChange={e => handleFieldChange('anthropic.temperature', parseFloat(e.target.value))}
                />
              </div>

              <button
                className="test-button"
                onClick={() => handleTestConnection('anthropic')}
              >
                Test Connection
              </button>
              
              {connectionStatus.anthropic && (
                <div className={`connection-status ${connectionStatus.anthropic.includes('Connected') ? 'success' : 'error'}`}>
                  {connectionStatus.anthropic}
                </div>
              )}
            </div>
          )}

          {/* Enable Fallback */}
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.enableFallback}
                onChange={e => handleFieldChange('enableFallback', e.target.checked)}
              />
              Enable fallback to alternative providers
            </label>
          </div>
            </>
          ) : (
            <div className="system-prompts-editor">
              <h3>System Prompts</h3>
              <p className="field-description">Configure the global instructions for the AI in different contexts.</p>
              
              <div className="form-group">
                <label>World Generation Prompt</label>
                <textarea
                  value={formData.systemPrompts?.worldGeneration || ''}
                  onChange={e => handleFieldChange('systemPrompts.worldGeneration', e.target.value)}
                  placeholder="Instructions for world-building..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Character Generation Prompt</label>
                <textarea
                  value={formData.systemPrompts?.characterGeneration || ''}
                  onChange={e => handleFieldChange('systemPrompts.characterGeneration', e.target.value)}
                  placeholder="Instructions for character development..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Dialogue Generation Prompt</label>
                <textarea
                  value={formData.systemPrompts?.dialogueGeneration || ''}
                  onChange={e => handleFieldChange('systemPrompts.dialogueGeneration', e.target.value)}
                  placeholder="Instructions for dialogue writing..."
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label>Parameters</label>
                <div className="form-row">
                  <div className="form-group">
                    <label>Top P</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={formData.parameters?.topP ?? 1.0}
                      onChange={e => handleFieldChange('parameters.topP', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Presence Penalty</label>
                    <input
                      type="number"
                      step="0.1"
                      min="-2"
                      max="2"
                      value={formData.parameters?.presencePenalty ?? 0}
                      onChange={e => handleFieldChange('parameters.presencePenalty', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
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


