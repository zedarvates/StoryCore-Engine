/**
 * LLM Settings Panel Component
 * 
 * Provides UI for configuring LLM integration settings including:
 * - Provider selection (OpenAI, Anthropic, Local, Custom)
 * - Model selection with info display
 * - Generation parameters (temperature, max tokens, etc.)
 * - System prompt editors
 * - Connection testing and validation
 * 
 * Validates Requirements: 3.1, 3.2, 3.6
 */

import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2, Info, Eye, EyeOff, Download, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type {
  LLMConfig,
  LLMProvider,
} from '@/services/llmService';
import { getAvailableProviders, getDefaultSystemPrompts } from '@/services/llmService';
import {
  saveLLMSettings,
  loadLLMSettings,
  deleteLLMSettings,
  exportSettings,
  importSettings,
  isCryptoAvailable,
  getLastValidationTime,
} from '@/utils/secureStorage';
import { LocalModelSelector } from './LocalModelSelector';

// ============================================================================
// Types
// ============================================================================

export interface LLMSettingsPanelProps {
  currentConfig?: Partial<LLMConfig>;
  onSave: (config: LLMConfig) => void | Promise<void>;
  onCancel?: () => void;
  onTestConnection?: (config: Partial<LLMConfig>) => Promise<boolean>;
  className?: string;
}

interface ConnectionStatus {
  state: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate API key format based on provider
 */
function validateApiKeyFormat(provider: LLMProvider, apiKey: string): string | null {
  if (!apiKey) {
    return 'API key is required';
  }

  switch (provider) {
    case 'openai':
      if (!apiKey.startsWith('sk-')) {
        return 'OpenAI API keys must start with "sk-"';
      }
      if (apiKey.length < 20) {
        return 'OpenAI API key appears to be too short';
      }
      break;
    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-')) {
        return 'Anthropic API keys must start with "sk-ant-"';
      }
      if (apiKey.length < 20) {
        return 'Anthropic API key appears to be too short';
      }
      break;
  }

  return null;
}

/**
 * Validate endpoint URL format
 */
function validateEndpointFormat(endpoint: string): string | null {
  if (!endpoint) {
    return 'API endpoint is required';
  }

  try {
    const url = new URL(endpoint);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'Endpoint must use HTTP or HTTPS protocol';
    }
  } catch {
    return 'Invalid URL format. Please enter a valid endpoint URL.';
  }

  return null;
}

/**
 * Get provider-specific connection error message
 */
function getConnectionErrorMessage(provider: LLMProvider): string {
  switch (provider) {
    case 'openai':
      return 'Connection failed. Please verify your OpenAI API key has the correct permissions and your account has sufficient credits.';
    case 'anthropic':
      return 'Connection failed. Please verify your Anthropic API key is valid and has access to the selected model.';
    case 'local':
      return 'Connection failed. Please ensure your local LLM server is running and accessible at the specified endpoint.';
    case 'custom':
      return 'Connection failed. Please verify the custom endpoint is accessible and the API key (if required) is correct.';
    default:
      return 'Connection failed. Please check your settings and try again.';
  }
}

/**
 * Get provider-specific connection error guidance
 */
function getConnectionErrorGuidance(provider: LLMProvider): string {
  switch (provider) {
    case 'openai':
      return 'Check: 1) API key is correct, 2) Account has credits, 3) Key has proper permissions.';
    case 'anthropic':
      return 'Check: 1) API key is correct, 2) Model access is enabled, 3) Account is active.';
    case 'local':
      return 'Check: 1) Server is running, 2) Endpoint URL is correct, 3) No firewall blocking.';
    case 'custom':
      return 'Check: 1) Endpoint is accessible, 2) Authentication is correct, 3) API is compatible.';
    default:
      return 'Please verify your configuration and try again.';
  }
}

// ============================================================================
// LLM Settings Panel Component
// ============================================================================

export function LLMSettingsPanel({
  currentConfig,
  onSave,
  onCancel,
  onTestConnection,
  className,
}: LLMSettingsPanelProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [provider, setProvider] = useState<LLMProvider>(currentConfig?.provider || 'openai');
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [apiEndpoint, setApiEndpoint] = useState(currentConfig?.apiEndpoint || '');
  const [model, setModel] = useState(currentConfig?.model || '');
  const [temperature, setTemperature] = useState(currentConfig?.parameters?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(currentConfig?.parameters?.maxTokens ?? 2000);
  const [topP, setTopP] = useState(currentConfig?.parameters?.topP ?? 1.0);
  const [frequencyPenalty, setFrequencyPenalty] = useState(currentConfig?.parameters?.frequencyPenalty ?? 0);
  const [presencePenalty, setPresencePenalty] = useState(currentConfig?.parameters?.presencePenalty ?? 0);
  const [timeout, setTimeout] = useState(currentConfig?.timeout ?? 30000);
  const [retryAttempts, setRetryAttempts] = useState(currentConfig?.retryAttempts ?? 3);
  const [streamingEnabled, setStreamingEnabled] = useState(currentConfig?.streamingEnabled ?? true);

  // New creativity and vectorial enhancement parameters
  const [creativityMode, setCreativityMode] = useState(currentConfig?.parameters?.creativityMode || 'balanced');
  const [jokesEnabled, setJokesEnabled] = useState(currentConfig?.parameters?.jokesEnabled || false);
  const [wordGamesEnabled, setWordGamesEnabled] = useState(currentConfig?.parameters?.wordGamesEnabled || false);
  const [probabilityFramingEnabled, setProbabilityFramingEnabled] = useState(currentConfig?.parameters?.probabilityFramingEnabled || false);
  const [vectorialOptimization, setVectorialOptimization] = useState(currentConfig?.parameters?.vectorialOptimization || 'standard');
  const [embeddingModel, setEmbeddingModel] = useState(currentConfig?.parameters?.embeddingModel || 'default');
  const [similarityThreshold, setSimilarityThreshold] = useState(currentConfig?.parameters?.similarityThreshold || 0.7);
  
  const defaultPrompts = getDefaultSystemPrompts();
  const [worldPrompt, setWorldPrompt] = useState(
    currentConfig?.systemPrompts?.worldGeneration || defaultPrompts.worldGeneration
  );
  const [characterPrompt, setCharacterPrompt] = useState(
    currentConfig?.systemPrompts?.characterGeneration || defaultPrompts.characterGeneration
  );
  const [dialoguePrompt, setDialoguePrompt] = useState(
    currentConfig?.systemPrompts?.dialogueGeneration || defaultPrompts.dialogueGeneration
  );

  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ state: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cryptoAvailable, setCryptoAvailable] = useState(true);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);

  const providers = getAvailableProviders();
  const currentProviderInfo = providers.find(p => p.id === provider);
  const currentModelInfo = currentProviderInfo?.models.find(m => m.id === model);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load settings on mount
  useEffect(() => {
    const loadStoredSettings = async () => {
      setIsLoading(true);
      
      // Check if Web Crypto API is available
      if (!isCryptoAvailable()) {
        setCryptoAvailable(false);
        console.warn('Web Crypto API not available. Settings encryption disabled.');
      }

      try {
        // Load settings from secure storage
        const storedConfig = await loadLLMSettings();
        
        if (storedConfig) {
          // Populate form with stored settings
          setProvider(storedConfig.provider);
          setApiKey(storedConfig.apiKey);
          
          // Use stored endpoint or fall back to provider's default
          let endpoint = storedConfig.apiEndpoint || '';
          if (!endpoint && (storedConfig.provider === 'local' || storedConfig.provider === 'custom')) {
            const providerInfo = providers.find(p => p.id === storedConfig.provider);
            endpoint = providerInfo?.defaultEndpoint || '';
          }
          setApiEndpoint(endpoint);
          
          setModel(storedConfig.model);
          setTemperature(storedConfig.parameters.temperature);
          setMaxTokens(storedConfig.parameters.maxTokens);
          setTopP(storedConfig.parameters.topP);
          setFrequencyPenalty(storedConfig.parameters.frequencyPenalty);
          setPresencePenalty(storedConfig.parameters.presencePenalty);
          setTimeout(storedConfig.timeout);
          setRetryAttempts(storedConfig.retryAttempts);
          setStreamingEnabled(storedConfig.streamingEnabled);
          
          // Safely access systemPrompts with fallback to defaults
          if (storedConfig.systemPrompts) {
            setWorldPrompt(storedConfig.systemPrompts.worldGeneration || defaultPrompts.worldGeneration);
            setCharacterPrompt(storedConfig.systemPrompts.characterGeneration || defaultPrompts.characterGeneration);
            setDialoguePrompt(storedConfig.systemPrompts.dialogueGeneration || defaultPrompts.dialogueGeneration);
          } else {
            // Use defaults if systemPrompts is missing
            setWorldPrompt(defaultPrompts.worldGeneration);
            setCharacterPrompt(defaultPrompts.characterGeneration);
            setDialoguePrompt(defaultPrompts.dialogueGeneration);
          }

          // Set last validation time
          const lastValidation = getLastValidationTime();
          setLastValidated(lastValidation);
        } else if (currentConfig) {
          // Fall back to currentConfig prop if no stored settings
          // (This maintains backward compatibility)
        }
      } catch (error) {
        console.error('Failed to load stored settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredSettings();
  }, []); // Only run on mount

  // Update model when provider changes
  useEffect(() => {
    const providerInfo = providers.find(p => p.id === provider);
    if (providerInfo && providerInfo.models.length > 0) {
      // Set first model as default if current model is not available
      const modelExists = providerInfo.models.some(m => m.id === model);
      if (!modelExists) {
        setModel(providerInfo.models[0].id);
      }
    }
  }, [provider, providers, model]);

  // Update endpoint when provider changes
  useEffect(() => {
    const providerInfo = providers.find(p => p.id === provider);
    if (providerInfo && !apiEndpoint) {
      setApiEndpoint(providerInfo.defaultEndpoint);
    }
  }, [provider, providers, apiEndpoint]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const validateCredentials = (): string | null => {
    // Validate provider-specific requirements
    if (currentProviderInfo?.requiresApiKey) {
      const apiKeyError = validateApiKeyFormat(provider, apiKey);
      if (apiKeyError) {
        return apiKeyError;
      }
    }

    // Validate endpoint for local/custom providers
    if (provider === 'local' || provider === 'custom') {
      const endpointError = validateEndpointFormat(apiEndpoint);
      if (endpointError) {
        return endpointError;
      }
    }

    // Validate model selection
    if (!model) {
      return 'Please select a model';
    }

    // Validate parameters are within valid ranges
    if (temperature < 0 || temperature > 2) {
      return 'Temperature must be between 0 and 2';
    }

    if (maxTokens < 1) {
      return 'Max tokens must be at least 1';
    }

    if (currentModelInfo && maxTokens > currentModelInfo.contextWindow) {
      return `Max tokens cannot exceed model limit of ${currentModelInfo.contextWindow.toLocaleString()}`;
    }

    if (topP < 0 || topP > 1) {
      return 'Top P must be between 0 and 1';
    }

    if (frequencyPenalty < -2 || frequencyPenalty > 2) {
      return 'Frequency penalty must be between -2 and 2';
    }

    if (presencePenalty < -2 || presencePenalty > 2) {
      return 'Presence penalty must be between -2 and 2';
    }

    if (timeout < 1000) {
      return 'Timeout must be at least 1000ms (1 second)';
    }

    if (retryAttempts < 0 || retryAttempts > 10) {
      return 'Retry attempts must be between 0 and 10';
    }

    return null;
  };

  const handleTestConnection = async () => {
    if (!onTestConnection) return;

    // Validate before testing
    const validationError = validateCredentials();
    if (validationError) {
      setConnectionStatus({
        state: 'error',
        message: validationError,
      });
      return;
    }

    setConnectionStatus({ state: 'testing', message: 'Testing connection...' });

    try {
      const config: Partial<LLMConfig> = {
        provider,
        apiKey,
        apiEndpoint: (provider === 'local' || provider === 'custom') ? apiEndpoint : undefined,
        model,
      };

      const success = await onTestConnection(config);

      if (success) {
        setConnectionStatus({
          state: 'success',
          message: 'Connection successful! API key is valid and the model is accessible.',
        });
      } else {
        setConnectionStatus({
          state: 'error',
          message: getConnectionErrorMessage(provider),
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setConnectionStatus({
        state: 'error',
        message: `${errorMessage}. ${getConnectionErrorGuidance(provider)}`,
      });
    }
  };

  const handleSave = async () => {
    // Validate before saving
    const validationError = validateCredentials();
    if (validationError) {
      setConnectionStatus({
        state: 'error',
        message: validationError,
      });
      return;
    }

    // Validate connection if handler is provided
    if (onTestConnection && connectionStatus.state !== 'success') {
      setConnectionStatus({
        state: 'error',
        message: 'Please test the connection before saving.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const config: LLMConfig = {
        provider,
        apiKey,
        apiEndpoint: (provider === 'local' || provider === 'custom') ? apiEndpoint : undefined,
        model,
        parameters: {
          temperature,
          maxTokens,
          topP,
          frequencyPenalty,
          presencePenalty,
          creativityMode,
          jokesEnabled,
          wordGamesEnabled,
          probabilityFramingEnabled,
          vectorialOptimization,
          embeddingModel,
          similarityThreshold,
        },
        systemPrompts: {
          worldGeneration: worldPrompt,
          characterGeneration: characterPrompt,
          dialogueGeneration: dialoguePrompt,
        },
        timeout,
        retryAttempts,
        streamingEnabled,
      };

      // Save to secure storage with encryption
      if (cryptoAvailable) {
        await saveLLMSettings(config);
        setLastValidated(new Date());
      }

      // Also call the onSave callback for backward compatibility
      await onSave(config);

      // Show success message
      setConnectionStatus({
        state: 'success',
        message: 'Settings saved successfully with encrypted credentials.',
      });
    } catch (error) {
      setConnectionStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPrompts = () => {
    const defaults = getDefaultSystemPrompts();
    setWorldPrompt(defaults.worldGeneration);
    setCharacterPrompt(defaults.characterGeneration);
    setDialoguePrompt(defaults.dialogueGeneration);
  };

  const handleExportSettings = () => {
    try {
      const exportData = exportSettings();
      
      // Create download link
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `storycore-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setConnectionStatus({
        state: 'success',
        message: 'Settings exported successfully (credentials excluded for security).',
      });
    } catch (error) {
      setConnectionStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to export settings',
      });
    }
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = importSettings(text);

        if (success) {
          // Reload settings
          const storedConfig = await loadLLMSettings();
          if (storedConfig) {
            setProvider(storedConfig.provider);
            setModel(storedConfig.model);
            setTemperature(storedConfig.parameters.temperature);
            setMaxTokens(storedConfig.parameters.maxTokens);
            setTopP(storedConfig.parameters.topP);
            setFrequencyPenalty(storedConfig.parameters.frequencyPenalty);
            setPresencePenalty(storedConfig.parameters.presencePenalty);
            setTimeout(storedConfig.timeout);
            setRetryAttempts(storedConfig.retryAttempts);
            setStreamingEnabled(storedConfig.streamingEnabled);
            
            // Safely access systemPrompts with fallback to defaults
            const defaults = getDefaultSystemPrompts();
            if (storedConfig.systemPrompts) {
              setWorldPrompt(storedConfig.systemPrompts.worldGeneration || defaults.worldGeneration);
              setCharacterPrompt(storedConfig.systemPrompts.characterGeneration || defaults.characterGeneration);
              setDialoguePrompt(storedConfig.systemPrompts.dialogueGeneration || defaults.dialogueGeneration);
            } else {
              setWorldPrompt(defaults.worldGeneration);
              setCharacterPrompt(defaults.characterGeneration);
              setDialoguePrompt(defaults.dialogueGeneration);
            }
          }

          setConnectionStatus({
            state: 'success',
            message: 'Settings imported successfully. Please re-enter your API key.',
          });
        } else {
          throw new Error('Invalid settings file format');
        }
      } catch (error) {
        setConnectionStatus({
          state: 'error',
          message: error instanceof Error ? error.message : 'Failed to import settings',
        });
      }
    };

    input.click();
  };

  const handleDeleteSettings = () => {
    if (!confirm('Are you sure you want to delete all saved settings? This action cannot be undone.')) {
      return;
    }

    try {
      deleteLLMSettings();
      
      // Reset form to defaults
      const defaults = getDefaultSystemPrompts();
      setProvider('openai');
      setApiKey('');
      setApiEndpoint('');
      setModel('');
      setTemperature(0.7);
      setMaxTokens(2000);
      setTopP(1.0);
      setFrequencyPenalty(0);
      setPresencePenalty(0);
      setTimeout(30000);
      setRetryAttempts(3);
      setStreamingEnabled(true);
      setWorldPrompt(defaults.worldGeneration);
      setCharacterPrompt(defaults.characterGeneration);
      setDialoguePrompt(defaults.dialogueGeneration);
      setConnectionStatus({ state: 'idle' });
      setLastValidated(null);

      setConnectionStatus({
        state: 'success',
        message: 'All settings deleted successfully.',
      });
    } catch (error) {
      setConnectionStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete settings',
      });
    }
  };

  const isFormValid = () => {
    if (!provider || !model) return false;
    if (currentProviderInfo?.requiresApiKey && !apiKey) return false;
    if ((provider === 'local' || provider === 'custom') && !apiEndpoint) return false;
    return true;
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Crypto Warning */}
      {!cryptoAvailable && (
        <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Encryption unavailable</p>
            <p className="text-xs mt-1 opacity-90">
              Web Crypto API is not available in your browser. Credentials will be stored without encryption.
            </p>
          </div>
        </div>
      )}

      {/* Last Validated Info */}
      {lastValidated && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3 w-3 text-green-600" />
          <span>Last validated: {lastValidated.toLocaleString()}</span>
        </div>
      )}

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Selection</CardTitle>
          <CardDescription>
            Choose your LLM provider and configure authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Provider</Label>
            <RadioGroup value={provider} onValueChange={(value) => {
              const newProvider = value as LLMProvider;
              setProvider(newProvider);
              
              // Get the default endpoint for the selected provider
              const providerInfo = providers.find(p => p.id === newProvider);
              const defaultEndpoint = providerInfo?.defaultEndpoint || '';
              
              // Set the endpoint to the provider's default
              setApiEndpoint(defaultEndpoint);
              
              // Clear connection status when provider changes
              if (connectionStatus.state !== 'idle') {
                setConnectionStatus({ state: 'idle' });
              }
            }}>
              {providers.map((p) => (
                <div key={p.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={p.id} id={p.id} />
                  <Label htmlFor={p.id} className="font-normal cursor-pointer">
                    {p.name}
                    {p.requiresApiKey && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Requires API Key
                      </Badge>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            {(provider === 'local' || provider === 'custom') ? (
              // Show Local Model Selector for local/custom providers
              <div className="mt-4">
                <LocalModelSelector
                  selectedModel={model}
                  onModelSelect={(modelId) => {
                    setModel(modelId);
                    // Clear connection status when model changes
                    if (connectionStatus.state !== 'idle') {
                      setConnectionStatus({ state: 'idle' });
                    }
                  }}
                  endpoint={apiEndpoint || 'http://localhost:11434'}
                />
              </div>
            ) : (
              // Show regular dropdown for cloud providers
              <>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentProviderInfo?.models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentModelInfo && (
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <div className="flex items-center gap-2">
                      <Info className="h-3 w-3" />
                      <span>Context: {currentModelInfo.contextWindow.toLocaleString()} tokens</span>
                    </div>
                    {currentModelInfo.costPer1kTokens && (
                      <div className="ml-5">
                        Cost: ${currentModelInfo.costPer1kTokens}/1K tokens
                      </div>
                    )}
                    <div className="ml-5">
                      Capabilities: {currentModelInfo.capabilities.join(', ')}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* API Key */}
          {currentProviderInfo?.requiresApiKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    // Clear connection status when API key changes
                    if (connectionStatus.state !== 'idle') {
                      setConnectionStatus({ state: 'idle' });
                    }
                  }}
                  placeholder="sk-..."
                  className={cn(
                    'pr-10',
                    apiKey && validateApiKeyFormat(provider, apiKey) && 'border-red-500 focus-visible:ring-red-500'
                  )}
                  aria-invalid={apiKey ? !!validateApiKeyFormat(provider, apiKey) : undefined}
                  aria-describedby={apiKey && validateApiKeyFormat(provider, apiKey) ? 'apiKey-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {apiKey && validateApiKeyFormat(provider, apiKey) && (
                <p id="apiKey-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {validateApiKeyFormat(provider, apiKey)}
                </p>
              )}
            </div>
          )}

          {/* Custom Endpoint */}
          {(provider === 'local' || provider === 'custom') && (
            <div className="space-y-2">
              <Label htmlFor="apiEndpoint">API Endpoint</Label>
              <Input
                id="apiEndpoint"
                type="url"
                value={apiEndpoint}
                onChange={(e) => {
                  setApiEndpoint(e.target.value);
                  // Clear connection status when endpoint changes
                  if (connectionStatus.state !== 'idle') {
                    setConnectionStatus({ state: 'idle' });
                  }
                }}
                placeholder={currentProviderInfo?.defaultEndpoint || 'http://localhost:8000'}
                className={cn(
                  apiEndpoint && validateEndpointFormat(apiEndpoint) && 'border-red-500 focus-visible:ring-red-500'
                )}
                aria-invalid={apiEndpoint ? !!validateEndpointFormat(apiEndpoint) : undefined}
                aria-describedby={apiEndpoint && validateEndpointFormat(apiEndpoint) ? 'endpoint-error' : undefined}
              />
              <p className="text-xs text-muted-foreground">
                The base URL for your {provider} LLM server (default: {currentProviderInfo?.defaultEndpoint || 'http://localhost:8000'})
              </p>
              {apiEndpoint && validateEndpointFormat(apiEndpoint) && (
                <p id="endpoint-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
                  {validateEndpointFormat(apiEndpoint)}
                </p>
              )}
            </div>
          )}

          {/* Connection Test */}
          {onTestConnection && (
            <div className="space-y-2">
              <Button
                onClick={handleTestConnection}
                disabled={!isFormValid() || connectionStatus.state === 'testing'}
                variant="outline"
                className="w-full"
              >
                {connectionStatus.state === 'testing' && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Test Connection
              </Button>

              {connectionStatus.state !== 'idle' && (
                <div
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg text-sm',
                    connectionStatus.state === 'success' && 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800',
                    connectionStatus.state === 'error' && 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
                    connectionStatus.state === 'testing' && 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                  )}
                  role="alert"
                  aria-live="polite"
                >
                  {connectionStatus.state === 'success' && <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  {connectionStatus.state === 'error' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                  {connectionStatus.state === 'testing' && <Loader2 className="h-4 w-4 mt-0.5 flex-shrink-0 animate-spin" />}
                  <div className="flex-1">
                    <p className="font-medium">{connectionStatus.message}</p>
                    {connectionStatus.state === 'error' && (
                      <p className="mt-1 text-xs opacity-90">
                        {getConnectionErrorGuidance(provider)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {connectionStatus.state === 'success' && (
                <p className="text-xs text-muted-foreground">
                  ✓ Connection verified. You can now save your settings.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generation Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Parameters</CardTitle>
          <CardDescription>
            Fine-tune how the AI generates content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature" className="flex items-center gap-2">
                Temperature
                <TooltipInfo content="Controls randomness. Lower values make output more focused and deterministic, higher values make it more creative and varied." />
              </Label>
              <span className="text-sm text-muted-foreground">{temperature.toFixed(2)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[temperature]}
              onValueChange={([value]) => setTemperature(value)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Focused (0)</span>
              <span>Balanced (1)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens" className="flex items-center gap-2">
              Max Tokens
              <TooltipInfo content="Maximum length of generated response. Higher values allow longer responses but cost more." />
            </Label>
            <Input
              id="maxTokens"
              type="number"
              min={100}
              max={currentModelInfo?.contextWindow || 4096}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
            />
            {currentModelInfo && (
              <p className="text-xs text-muted-foreground">
                Model limit: {currentModelInfo.contextWindow.toLocaleString()} tokens
              </p>
            )}
          </div>

          {/* Top P */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="topP" className="flex items-center gap-2">
                Top P
                <TooltipInfo content="Controls diversity via nucleus sampling. Lower values make output more focused, higher values more diverse." />
              </Label>
              <span className="text-sm text-muted-foreground">{topP.toFixed(2)}</span>
            </div>
            <Slider
              id="topP"
              min={0}
              max={1}
              step={0.05}
              value={[topP]}
              onValueChange={([value]) => setTopP(value)}
            />
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="frequencyPenalty" className="flex items-center gap-2">
                Frequency Penalty
                <TooltipInfo content="Reduces repetition of tokens based on their frequency. Positive values discourage repetition." />
              </Label>
              <span className="text-sm text-muted-foreground">{frequencyPenalty.toFixed(2)}</span>
            </div>
            <Slider
              id="frequencyPenalty"
              min={-2}
              max={2}
              step={0.1}
              value={[frequencyPenalty]}
              onValueChange={([value]) => setFrequencyPenalty(value)}
            />
          </div>

          {/* Presence Penalty */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="presencePenalty" className="flex items-center gap-2">
                Presence Penalty
                <TooltipInfo content="Reduces repetition of topics. Positive values encourage discussing new topics." />
              </Label>
              <span className="text-sm text-muted-foreground">{presencePenalty.toFixed(2)}</span>
            </div>
            <Slider
              id="presencePenalty"
              min={-2}
              max={2}
              step={0.1}
              value={[presencePenalty]}
              onValueChange={([value]) => setPresencePenalty(value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Creativity Enhancement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            Creativity Enhancement
          </CardTitle>
          <CardDescription>
            Configure creativity settings and linguistic enhancements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Creativity Mode */}
          <div className="space-y-2">
            <Label htmlFor="creativityMode">Creativity Mode</Label>
            <Select value={creativityMode} onValueChange={setCreativityMode}>
              <SelectTrigger id="creativityMode">
                <SelectValue placeholder="Select creativity mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative - Focused and precise</SelectItem>
                <SelectItem value="balanced">Balanced - Standard creativity</SelectItem>
                <SelectItem value="creative">Creative - Highly imaginative</SelectItem>
                <SelectItem value="experimental">Experimental - Maximum creativity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jokes & Word Games */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="jokesEnabled">Enable Jokes & Humor</Label>
                <p className="text-xs text-muted-foreground">
                  Allow AI to include jokes and wordplay in responses
                </p>
              </div>
              <Switch
                id="jokesEnabled"
                checked={jokesEnabled}
                onCheckedChange={setJokesEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="wordGamesEnabled">Enable Word Games</Label>
                <p className="text-xs text-muted-foreground">
                  Allow puns, rhymes, and linguistic creativity
                </p>
              </div>
              <Switch
                id="wordGamesEnabled"
                checked={wordGamesEnabled}
                onCheckedChange={setWordGamesEnabled}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="probabilityFramingEnabled">Probability Framing</Label>
                <p className="text-xs text-muted-foreground">
                  Frame responses with confidence levels and alternatives
                </p>
              </div>
              <Switch
                id="probabilityFramingEnabled"
                checked={probabilityFramingEnabled}
                onCheckedChange={setProbabilityFramingEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vectorial Space Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            Vectorial Space Optimization
          </CardTitle>
          <CardDescription>
            Configure vectorial distribution and embedding settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vectorial Optimization Mode */}
          <div className="space-y-2">
            <Label htmlFor="vectorialOptimization">Vectorial Distribution Law</Label>
            <Select value={vectorialOptimization} onValueChange={setVectorialOptimization}>
              <SelectTrigger id="vectorialOptimization">
                <SelectValue placeholder="Select optimization mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard - Default distribution</SelectItem>
                <SelectItem value="gaussian">Gaussian - Bell curve optimization</SelectItem>
                <SelectItem value="exponential">Exponential - Rapid decay optimization</SelectItem>
                <SelectItem value="pareto">Pareto - Power-law distribution (80/20 rule)</SelectItem>
                <SelectItem value="adaptive">Adaptive - Dynamic optimization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Embedding Model */}
          <div className="space-y-2">
            <Label htmlFor="embeddingModel">Embedding Model</Label>
            <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
              <SelectTrigger id="embeddingModel">
                <SelectValue placeholder="Select embedding model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default - Model's built-in embeddings</SelectItem>
                <SelectItem value="text-embedding-ada-002">OpenAI Ada-002 - High quality embeddings</SelectItem>
                <SelectItem value="text-embedding-3-small">OpenAI Embedding-3-Small - Fast and efficient</SelectItem>
                <SelectItem value="text-embedding-3-large">OpenAI Embedding-3-Large - Maximum quality</SelectItem>
                <SelectItem value="local-sentence-transformer">Local Sentence Transformer - Privacy-focused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Similarity Threshold */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="similarityThreshold">Similarity Threshold</Label>
              <span className="text-sm text-muted-foreground">{similarityThreshold.toFixed(2)}</span>
            </div>
            <Slider
              id="similarityThreshold"
              min={0.1}
              max={0.95}
              step={0.05}
              value={[similarityThreshold]}
              onValueChange={([value]) => setSimilarityThreshold(value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum similarity score for vector matching (0.1-0.95)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Prompts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Prompts</CardTitle>
              <CardDescription>
                Customize how the AI behaves for different tasks
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetPrompts}>
              Reset to Defaults
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* World Generation Prompt */}
          <div className="space-y-2">
            <Label htmlFor="worldPrompt">World Generation</Label>
            <Textarea
              id="worldPrompt"
              value={worldPrompt}
              onChange={(e) => setWorldPrompt(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <Separator />

          {/* Character Generation Prompt */}
          <div className="space-y-2">
            <Label htmlFor="characterPrompt">Character Generation</Label>
            <Textarea
              id="characterPrompt"
              value={characterPrompt}
              onChange={(e) => setCharacterPrompt(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>

          <Separator />

          {/* Dialogue Generation Prompt */}
          <div className="space-y-2">
            <Label htmlFor="dialoguePrompt">Dialogue Generation</Label>
            <Textarea
              id="dialoguePrompt"
              value={dialoguePrompt}
              onChange={(e) => setDialoguePrompt(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
          <CardDescription>
            Configure timeout, retry behavior, and streaming
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeout */}
          <div className="space-y-2">
            <Label htmlFor="timeout" className="flex items-center gap-2">
              Timeout (ms)
              <TooltipInfo content="Maximum time to wait for a response before timing out." />
            </Label>
            <Input
              id="timeout"
              type="number"
              min={5000}
              max={120000}
              step={1000}
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value) || 30000)}
            />
          </div>

          {/* Retry Attempts */}
          <div className="space-y-2">
            <Label htmlFor="retryAttempts" className="flex items-center gap-2">
              Retry Attempts
              <TooltipInfo content="Number of times to retry failed requests before giving up." />
            </Label>
            <Input
              id="retryAttempts"
              type="number"
              min={0}
              max={5}
              value={retryAttempts}
              onChange={(e) => setRetryAttempts(parseInt(e.target.value) || 3)}
            />
          </div>

          {/* Streaming */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="streaming">Enable Streaming</Label>
              <p className="text-xs text-muted-foreground">
                Stream responses in real-time for faster perceived performance
              </p>
            </div>
            <Switch
              id="streaming"
              checked={streamingEnabled}
              onCheckedChange={setStreamingEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Settings Management */}
      <Card>
        <CardHeader>
          <CardTitle>Settings Management</CardTitle>
          <CardDescription>
            Export, import, or delete your settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Export Settings */}
            <Button
              variant="outline"
              onClick={handleExportSettings}
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Settings
            </Button>

            {/* Import Settings */}
            <Button
              variant="outline"
              onClick={handleImportSettings}
              className="w-full"
            >
              <Upload className="mr-2 h-4 w-4" />
              Import Settings
            </Button>

            {/* Delete Settings */}
            <Button
              variant="outline"
              onClick={handleDeleteSettings}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete All
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• <strong>Export:</strong> Download settings without credentials (safe to share)</p>
            <p>• <strong>Import:</strong> Load settings from a file (you'll need to re-enter credentials)</p>
            <p>• <strong>Delete:</strong> Permanently remove all saved settings and credentials</p>
          </div>

          {cryptoAvailable && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800">
              <Check className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <p>
                Your API keys are encrypted using AES-256-GCM encryption before being stored locally.
                Encryption keys are session-specific and never leave your browser.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Validation message */}
        {!isFormValid() && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Configuration incomplete</p>
              <p className="text-xs mt-1 opacity-90">
                {validateCredentials() || 'Please fill in all required fields'}
              </p>
            </div>
          </div>
        )}

        {/* Connection test reminder */}
        {onTestConnection && isFormValid() && connectionStatus.state !== 'success' && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Please test the connection before saving to ensure your settings are correct.</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!isFormValid() || isSaving || (onTestConnection && connectionStatus.state !== 'success')}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tooltip Info Component
// ============================================================================

interface TooltipInfoProps {
  content: string;
}

function TooltipInfo({ content }: TooltipInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="More information"
      >
        <Info className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute z-50 w-64 p-2 text-xs bg-popover text-popover-foreground border rounded-md shadow-md left-0 top-full mt-1">
          {content}
        </div>
      )}
    </div>
  );
}
