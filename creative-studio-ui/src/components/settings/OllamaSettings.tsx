/**
 * Ollama Settings Component
 * 
 * Allows users to configure Ollama local LLM with automatic model selection
 */

import { useState, useEffect } from 'react';
import {
  detectSystemCapabilities,
  getModelRecommendation,
  checkOllamaStatus,
  getInstalledModels,
  isModelInstalled,
  GEMMA3_MODELS,
  DEFAULT_OLLAMA_CONFIG,
  type ModelRecommendation,
  type SystemCapabilities,
  type OllamaModelConfig,
} from '@/services/ollamaConfig';

export interface OllamaSettingsProps {
  onConfigChange?: (config: {
    endpoint: string;
    model: string;
  }) => void;
}

export function OllamaSettings({ onConfigChange }: OllamaSettingsProps) {
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [recommendation, setRecommendation] = useState<ModelRecommendation | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [endpoint, setEndpoint] = useState(DEFAULT_OLLAMA_CONFIG.endpoint);
  const [isOllamaRunning, setIsOllamaRunning] = useState(false);
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detect system capabilities and get recommendation
  useEffect(() => {
    async function initialize() {
      setIsLoading(true);
      setError(null);

      try {
        // Detect system capabilities
        const caps = await detectSystemCapabilities();
        setCapabilities(caps);

        // Get model recommendation
        const rec = await getModelRecommendation();
        setRecommendation(rec);
        setSelectedModel(rec.model.id);

        // Check Ollama status
        const running = await checkOllamaStatus(endpoint);
        setIsOllamaRunning(running);

        if (running) {
          // Get installed models
          const models = await getInstalledModels(endpoint);
          setInstalledModels(models);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize Ollama settings');
      } finally {
        setIsLoading(false);
      }
    }

    initialize();
  }, [endpoint]);

  // Notify parent of config changes
  useEffect(() => {
    if (selectedModel && endpoint) {
      onConfigChange?.({ endpoint, model: selectedModel });
    }
  }, [selectedModel, endpoint, onConfigChange]);

  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
  };

  const handleEndpointChange = (newEndpoint: string) => {
    setEndpoint(newEndpoint);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const running = await checkOllamaStatus(endpoint);
      setIsOllamaRunning(running);

      if (running) {
        const models = await getInstalledModels(endpoint);
        setInstalledModels(models);
      }
    } catch (err) {
      setError('Failed to connect to Ollama');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Detecting system capabilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold">Ollama Configuration</h3>
        <p className="text-sm text-muted-foreground">
          Configure local LLM with automatic model selection based on your system
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Ollama Status */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${
                isOllamaRunning ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <div>
              <p className="font-medium">
                {isOllamaRunning ? 'Ollama is running' : 'Ollama is not running'}
              </p>
              <p className="text-sm text-muted-foreground">{endpoint}</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-md bg-secondary px-3 py-1.5 text-sm hover:bg-secondary/80"
          >
            Refresh
          </button>
        </div>

        {!isOllamaRunning && (
          <div className="mt-4 rounded-md bg-muted p-3 text-sm">
            <p className="font-medium">Ollama not detected</p>
            <p className="mt-1 text-muted-foreground">
              Make sure Ollama is installed and running. Visit{' '}
              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                ollama.ai
              </a>{' '}
              to download.
            </p>
          </div>
        )}
      </div>

      {/* System Capabilities */}
      {capabilities && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-medium">System Capabilities</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total RAM</p>
              <p className="font-medium">{capabilities.totalRAM.toFixed(1)} GB</p>
            </div>
            <div>
              <p className="text-muted-foreground">Available RAM</p>
              <p className="font-medium">{capabilities.availableRAM.toFixed(1)} GB</p>
            </div>
            <div>
              <p className="text-muted-foreground">GPU</p>
              <p className="font-medium">{capabilities.hasGPU ? 'Yes' : 'No'}</p>
            </div>
            {capabilities.gpuVRAM && (
              <div>
                <p className="text-muted-foreground">GPU VRAM</p>
                <p className="font-medium">{capabilities.gpuVRAM.toFixed(1)} GB</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Recommendation */}
      {recommendation && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <svg
              className="h-5 w-5 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h4 className="font-medium">Recommended Model</h4>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">{recommendation.reason}</p>

          {recommendation.warnings.length > 0 && (
            <div className="mb-3 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
              {recommendation.warnings.map((warning, i) => (
                <p key={i}>{warning}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model Selection */}
      <div className="space-y-3">
        <h4 className="font-medium">Select Model</h4>
        <div className="space-y-2">
          {GEMMA3_MODELS.map((model) => {
            const isInstalled = installedModels.includes(model.id);
            const isRecommended = recommendation?.model.id === model.id;
            const canRun = capabilities
              ? capabilities.availableRAM >= model.minRAM
              : true;

            return (
              <label
                key={model.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
                  selectedModel === model.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                } ${!canRun ? 'opacity-50' : ''}`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => handleModelChange(e.target.value)}
                  disabled={!canRun}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{model.name}</p>
                    {isRecommended && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                        Recommended
                      </span>
                    )}
                    {isInstalled && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-700 dark:text-green-400">
                        Installed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{model.description}</p>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span>Min RAM: {model.minRAM}GB</span>
                    <span>Recommended: {model.recommendedRAM}GB</span>
                    {model.minVRAM && <span>Min VRAM: {model.minVRAM}GB</span>}
                  </div>
                  {!canRun && (
                    <p className="mt-2 text-xs text-destructive">
                      Insufficient RAM for this model
                    </p>
                  )}
                  {!isInstalled && isOllamaRunning && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Run: <code className="rounded bg-muted px-1">ollama pull {model.id}</code>
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Endpoint Configuration */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Ollama Endpoint</label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => handleEndpointChange(e.target.value)}
          placeholder="http://localhost:11434"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Default: {DEFAULT_OLLAMA_CONFIG.endpoint}
        </p>
      </div>

      {/* Alternative Models */}
      {recommendation && recommendation.alternatives.length > 0 && (
        <div className="rounded-lg border p-4">
          <h4 className="mb-2 font-medium">Alternative Models</h4>
          <p className="mb-3 text-sm text-muted-foreground">
            Other models compatible with your system
          </p>
          <div className="space-y-2">
            {recommendation.alternatives.map((model) => (
              <div key={model.id} className="flex items-center justify-between text-sm">
                <span>{model.name}</span>
                <span className="text-muted-foreground">{model.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
