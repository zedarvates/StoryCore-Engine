import { useState, useEffect, memo } from 'react';
import { Settings, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type LLMConfig,
  type LLMProvider,
  getAvailableProviders,
} from '@/services/llmService';

// ============================================================================
// Types
// ============================================================================

export interface LLMConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: LLMConfig;
  onSave: (config: LLMConfig) => Promise<void>;
  onValidateConnection: (config: LLMConfig) => Promise<boolean>;
}

interface ValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
}

// ============================================================================
// LLM Configuration Dialog Component
// ============================================================================

export const LLMConfigDialog = memo(function LLMConfigDialog({
  open,
  onOpenChange,
  currentConfig,
  onSave,
  onValidateConnection,
}: LLMConfigDialogProps) {
  // Form state
  const [provider, setProvider] = useState<LLMProvider>(currentConfig.provider);
  const [model, setModel] = useState(currentConfig.model);
  const [apiKey, setApiKey] = useState(currentConfig.apiKey);
  const [temperature, setTemperature] = useState(currentConfig.parameters.temperature);
  const [maxTokens, setMaxTokens] = useState(currentConfig.parameters.maxTokens);
  const [streamingEnabled, setStreamingEnabled] = useState(currentConfig.streamingEnabled);
  
  // Validation state
  const [validation, setValidation] = useState<ValidationState>({
    isValidating: false,
    isValid: null,
    error: null,
  });
  
  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  
  // Form errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get available providers
  const providers = getAvailableProviders();
  const selectedProvider = providers.find(p => p.id === provider);
  const availableModels = selectedProvider?.models || [];

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setProvider(currentConfig.provider);
      setModel(currentConfig.model);
      setApiKey(currentConfig.apiKey);
      setTemperature(currentConfig.parameters.temperature);
      setMaxTokens(currentConfig.parameters.maxTokens);
      setStreamingEnabled(currentConfig.streamingEnabled);
      setValidation({ isValidating: false, isValid: null, error: null });
      setErrors({});
    }
  }, [open, currentConfig]);

  // Update model when provider changes
  useEffect(() => {
    const newProvider = providers.find(p => p.id === provider);
    if (newProvider && newProvider.models.length > 0) {
      // Check if current model is valid for new provider
      const modelExists = newProvider.models.some(m => m.id === model);
      if (!modelExists) {
        setModel(newProvider.models[0].id);
      }
    }
  }, [provider, providers, model]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!provider) {
      newErrors.provider = 'Provider is required';
    }

    if (!model) {
      newErrors.model = 'Model is required';
    }

    if (selectedProvider?.requiresApiKey && !apiKey.trim()) {
      newErrors.apiKey = 'API key is required for this provider';
    }

    if (maxTokens < 100 || maxTokens > 4000) {
      newErrors.maxTokens = 'Max tokens must be between 100 and 4000';
    }

    if (temperature < 0 || temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate connection
  const handleValidateConnection = async (config: LLMConfig): Promise<boolean> => {
    setValidation({ isValidating: true, isValid: null, error: null });

    try {
      const isValid = await onValidateConnection(config);
      
      if (isValid) {
        setValidation({ isValidating: false, isValid: true, error: null });
        return true;
      } else {
        setValidation({
          isValidating: false,
          isValid: false,
          error: 'Connection validation failed. Please check your API key and network connection.',
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection validation failed';
      setValidation({
        isValidating: false,
        isValid: false,
        error: errorMessage,
      });
      return false;
    }
  };

  // Retry validation
  const handleRetryValidation = async () => {
    if (!validateForm()) {
      return;
    }

    const newConfig: LLMConfig = {
      ...currentConfig,
      provider,
      model,
      apiKey,
      parameters: {
        ...currentConfig.parameters,
        temperature,
        maxTokens,
      },
      streamingEnabled,
    };

    await handleValidateConnection(newConfig);
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Build new config
      const newConfig: LLMConfig = {
        ...currentConfig,
        provider,
        model,
        apiKey,
        parameters: {
          ...currentConfig.parameters,
          temperature,
          maxTokens,
        },
        streamingEnabled,
      };

      // Validate connection
      const isValid = await handleValidateConnection(newConfig);
      
      if (isValid) {
        // Save configuration
        await onSave(newConfig);
        
        // Close dialog after short delay to show success
        setTimeout(() => {
          onOpenChange(false);
        }, 1000);
      }
    } catch (error) {
      setValidation({
        isValidating: false,
        isValid: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    onOpenChange(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  // Mask API key for display
  const maskApiKey = (key: string): string => {
    if (!key || key.length <= 4) return key;
    return '•'.repeat(key.length - 4) + key.slice(-4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[600px] bg-gray-900 text-white border-gray-700"
        aria-labelledby="config-dialog-title"
        aria-describedby="config-dialog-description"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle id="config-dialog-title" className="flex items-center gap-2 text-xl">
            <Settings className="w-5 h-5 text-purple-400" aria-hidden="true" />
            Configure LLM Settings
            {selectedProvider && (
              <span className="text-sm font-normal text-gray-400">
                ({selectedProvider.name} - {availableModels.find(m => m.id === model)?.name || model})
              </span>
            )}
          </DialogTitle>
          <p id="config-dialog-description" className="sr-only">
            Configure your LLM provider, model, and parameters for the AI assistant
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4" role="form" aria-label="LLM configuration form">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider" className="text-gray-200">
              Provider
            </Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as LLMProvider)}>
              <SelectTrigger
                id="provider"
                className="bg-gray-800 border-gray-700 text-white"
                aria-label="Select LLM provider"
                aria-describedby={errors.provider ? "provider-error" : undefined}
              >
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-white">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.provider && (
              <p id="provider-error" className="text-xs text-red-400" role="alert">{errors.provider}</p>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model" className="text-gray-200">
              Model
            </Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger
                id="model"
                className="bg-gray-800 border-gray-700 text-white"
                aria-label="Select AI model"
                aria-describedby={errors.model ? "model-error" : undefined}
              >
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                {availableModels.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-white">
                    <div className="flex flex-col">
                      <span>{m.name}</span>
                      <span className="text-xs text-gray-400">
                        Context: {m.contextWindow.toLocaleString()} tokens
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.model && (
              <p id="model-error" className="text-xs text-red-400" role="alert">{errors.model}</p>
            )}
          </div>

          {/* API Key Input */}
          {selectedProvider?.requiresApiKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-gray-200">
                API Key
              </Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                aria-label="API key"
                aria-describedby={errors.apiKey ? "apikey-error" : "apikey-help"}
                aria-required="true"
              />
              {apiKey && (
                <p id="apikey-help" className="text-xs text-gray-400">
                  Key: {maskApiKey(apiKey)}
                </p>
              )}
              {errors.apiKey && (
                <p id="apikey-error" className="text-xs text-red-400" role="alert">{errors.apiKey}</p>
              )}
            </div>
          )}

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature" className="text-gray-200">
                Temperature
              </Label>
              <span className="text-sm text-gray-400" aria-live="polite">{temperature.toFixed(1)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[temperature]}
              onValueChange={(values) => setTemperature(values[0])}
              className="w-full"
              aria-label="Temperature slider"
              aria-valuemin={0}
              aria-valuemax={2}
              aria-valuenow={temperature}
              aria-valuetext={`${temperature.toFixed(1)}`}
              aria-describedby="temperature-help"
            />
            <p id="temperature-help" className="text-xs text-gray-500">
              Lower values make output more focused and deterministic
            </p>
            {errors.temperature && (
              <p className="text-xs text-red-400" role="alert">{errors.temperature}</p>
            )}
          </div>

          {/* Max Tokens Input */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens" className="text-gray-200">
              Max Tokens
            </Label>
            <Input
              id="maxTokens"
              type="number"
              min={100}
              max={4000}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 100)}
              className="bg-gray-800 border-gray-700 text-white"
              aria-label="Maximum tokens"
              aria-describedby={errors.maxTokens ? "maxtokens-error" : "maxtokens-help"}
            />
            <p id="maxtokens-help" className="text-xs text-gray-500">
              Maximum length of generated response (100-4000)
            </p>
            {errors.maxTokens && (
              <p id="maxtokens-error" className="text-xs text-red-400" role="alert">{errors.maxTokens}</p>
            )}
          </div>

          {/* Streaming Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="streaming" className="text-gray-200">
                Enable Streaming
              </Label>
              <p className="text-xs text-gray-500" id="streaming-help">
                Display responses as they are generated
              </p>
            </div>
            <Switch
              id="streaming"
              checked={streamingEnabled}
              onCheckedChange={setStreamingEnabled}
              aria-label="Enable streaming"
              aria-describedby="streaming-help"
            />
          </div>

          {/* Validation Status */}
          {validation.isValidating && (
            <div 
              className="flex items-center gap-2 p-3 bg-blue-900/20 border border-blue-500/50 rounded-md"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" aria-hidden="true" />
              <span className="text-sm text-blue-300">Validating connection...</span>
            </div>
          )}

          {validation.isValid === true && (
            <div 
              className="flex items-center gap-2 p-3 bg-green-900/20 border border-green-500/50 rounded-md"
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="w-4 h-4 text-green-400" aria-hidden="true" />
              <span className="text-sm text-green-300">Connection validated successfully!</span>
            </div>
          )}

          {validation.isValid === false && validation.error && (
            <div 
              className="space-y-3 p-3 bg-red-900/20 border border-red-500/50 rounded-md"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm text-red-300 font-medium">Connection Failed</p>
                  <p className="text-xs text-red-200/80 mt-1">{validation.error}</p>
                </div>
              </div>
              
              {/* Recovery Suggestions */}
              <div className="pl-6 space-y-1">
                <p className="text-xs text-red-200/70 font-medium">Suggestions:</p>
                <ul className="text-xs text-red-200/60 space-y-0.5 list-disc list-inside">
                  {selectedProvider?.requiresApiKey && (
                    <>
                      <li>Verify your API key is correct</li>
                      <li>Check that your API key has the correct permissions</li>
                      <li>Ensure your account has sufficient credits</li>
                    </>
                  )}
                  <li>Check your internet connection</li>
                  <li>Verify the API endpoint is accessible</li>
                  {provider === 'local' || provider === 'custom' ? (
                    <li>Ensure your local/custom server is running</li>
                  ) : null}
                </ul>
              </div>

              {/* Recovery Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-red-500/30">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetryValidation}
                  disabled={validation.isValidating}
                  className="text-xs bg-red-900/30 border-red-500/50 text-red-200 hover:bg-red-900/50 hover:text-red-100"
                  aria-label="Retry connection validation"
                >
                  {validation.isValidating ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" aria-hidden="true" />
                      Retrying...
                    </>
                  ) : (
                    'Retry Connection'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                  className="text-xs text-red-200/60 hover:text-red-200 hover:bg-red-900/30"
                  aria-label="Cancel configuration"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
            aria-label="Cancel configuration"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || validation.isValidating}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            aria-label="Save LLM configuration"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
