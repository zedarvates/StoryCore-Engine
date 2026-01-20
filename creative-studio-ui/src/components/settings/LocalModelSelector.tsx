/**
 * Local Model Selector Component
 * 
 * Provides UI for selecting and downloading local LLM models
 * Integrates with Ollama for model management
 */

import { useState, useEffect } from 'react';
import { Download, Check, AlertCircle, Loader2, Trash2, Info, HardDrive, Cpu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  getLocalModelService,
  type LocalModel,
  type ModelDownloadProgress,
  LOCAL_MODELS,
} from '@/services/localModelService';

// ============================================================================
// Types
// ============================================================================

export interface LocalModelSelectorProps {
  selectedModel?: string;
  onModelSelect: (modelId: string) => void;
  endpoint?: string;
  className?: string;
}

interface ModelState {
  installed: boolean;
  downloading: boolean;
  progress: number;
  error?: string;
}

// ============================================================================
// Local Model Selector Component
// ============================================================================

export function LocalModelSelector({
  selectedModel,
  onModelSelect,
  endpoint = 'http://localhost:11434',
  className,
}: LocalModelSelectorProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [isOllamaRunning, setIsOllamaRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modelStates, setModelStates] = useState<Map<string, ModelState>>(new Map());
  const [recommendedModels, setRecommendedModels] = useState<LocalModel[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<LocalModel['family'] | 'all'>('all');
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);

  const modelService = getLocalModelService(endpoint);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    checkOllamaStatus();
  }, [endpoint]);

  useEffect(() => {
    if (isOllamaRunning) {
      loadInstalledModels();
      loadRecommendedModels();
    }
  }, [isOllamaRunning]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const checkOllamaStatus = async () => {
    setIsLoading(true);
    const running = await modelService.isOllamaRunning();
    setIsOllamaRunning(running);
    setIsLoading(false);
  };

  const loadInstalledModels = async () => {
    const installed = await modelService.getInstalledModels();
    const newStates = new Map<string, ModelState>();

    LOCAL_MODELS.forEach(model => {
      newStates.set(model.id, {
        installed: installed.includes(model.id),
        downloading: false,
        progress: 0,
      });
    });

    setModelStates(newStates);
  };

  const loadRecommendedModels = async () => {
    const recommended = await modelService.getRecommendedModels();
    setRecommendedModels(recommended);
  };

  const handleDownloadModel = async (modelId: string) => {
    try {
      // First check if Ollama is running
      const isRunning = await modelService.isOllamaRunning();
      if (!isRunning) {
        setModelStates(prev => {
          const newStates = new Map(prev);
          newStates.set(modelId, {
            installed: false,
            downloading: false,
            progress: 0,
            error: 'Ollama is not running. Please start Ollama and try again.',
          });
          return newStates;
        });
        return;
      }

      // Update state to show downloading
      setModelStates(prev => {
        const newStates = new Map(prev);
        newStates.set(modelId, {
          installed: false,
          downloading: true,
          progress: 0,
        });
        return newStates;
      });

      console.log(`Starting download for model: ${modelId}`);

      // Start download
      const success = await modelService.downloadModel(
        modelId,
        (progress: ModelDownloadProgress) => {
          console.log(`Download progress for ${modelId}:`, progress);
          
          setModelStates(prev => {
            const newStates = new Map(prev);
            newStates.set(modelId, {
              installed: progress.status === 'completed',
              downloading: progress.status === 'downloading',
              progress: progress.progress,
              error: progress.error,
            });
            return newStates;
          });
        }
      );

      if (success) {
        console.log(`Model ${modelId} downloaded successfully`);
        // Automatically select the downloaded model
        onModelSelect(modelId);
      } else {
        console.error(`Model ${modelId} download failed`);
      }
    } catch (error) {
      console.error('Error in handleDownloadModel:', error);
      setModelStates(prev => {
        const newStates = new Map(prev);
        newStates.set(modelId, {
          installed: false,
          downloading: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Download failed',
        });
        return newStates;
      });
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm(`Are you sure you want to delete ${modelId}? This will free up disk space but you'll need to download it again to use it.`)) {
      return;
    }

    const success = await modelService.deleteModel(modelId);
    
    if (success) {
      setModelStates(prev => {
        const newStates = new Map(prev);
        newStates.set(modelId, {
          installed: false,
          downloading: false,
          progress: 0,
        });
        return newStates;
      });

      // If deleted model was selected, clear selection
      if (selectedModel === modelId) {
        onModelSelect('');
      }
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getFilteredModels = (): LocalModel[] => {
    let filtered = LOCAL_MODELS;

    // Filter by family
    if (selectedFamily !== 'all') {
      filtered = filtered.filter(m => m.family === selectedFamily);
    }

    // Filter by installed status
    if (showOnlyInstalled) {
      filtered = filtered.filter(m => modelStates.get(m.id)?.installed);
    }

    return filtered;
  };

  const renderModelCard = (model: LocalModel) => {
    const state = modelStates.get(model.id) || {
      installed: false,
      downloading: false,
      progress: 0,
    };

    const isSelected = selectedModel === model.id;
    const isRecommended = recommendedModels.some(m => m.id === model.id);

    return (
      <Card
        key={model.id}
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-primary',
          !state.installed && !state.downloading && 'opacity-75'
        )}
        onClick={() => {
          if (state.installed) {
            onModelSelect(model.id);
          }
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base flex items-center gap-2">
                {model.displayName}
                {isRecommended && (
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    Recommended
                  </Badge>
                )}
                {state.installed && (
                  <Badge variant="default" className="text-xs">
                    <Check className="h-3 w-3 mr-1" />
                    Installed
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                {model.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Model Info */}
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="gap-1">
              <HardDrive className="h-3 w-3" />
              {model.size}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Cpu className="h-3 w-3" />
              {model.minRAM}GB RAM min
            </Badge>
            {model.requiresGPU && (
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" />
                GPU Required
              </Badge>
            )}
          </div>

          {/* Capabilities */}
          <div className="flex flex-wrap gap-1">
            {model.capabilities.slice(0, 3).map(cap => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
            {model.capabilities.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{model.capabilities.length - 3} more
              </Badge>
            )}
          </div>

          {/* Download Progress */}
          {state.downloading && (
            <div className="space-y-2">
              <Progress value={state.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Downloading... {Math.round(state.progress)}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {state.error && (
            <div className="flex items-start gap-2 p-2 rounded-lg text-xs bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <p>{state.error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!state.installed && !state.downloading && (
              <Button
                size="sm"
                variant="default"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadModel(model.id);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}

            {state.installed && (
              <>
                <Button
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onModelSelect(model.id);
                  }}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    'Select'
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteModel(model.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}

            {state.downloading && (
              <Button size="sm" variant="outline" className="flex-1" disabled>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
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

  if (!isOllamaRunning) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-start gap-2 p-4 rounded-lg text-sm bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Ollama is not running</p>
            <p className="text-xs mt-1 opacity-90">
              Please start Ollama to manage local models. Visit{' '}
              <a
                href="https://ollama.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                ollama.ai
              </a>{' '}
              to download and install.
            </p>
          </div>
        </div>

        <Button onClick={checkOllamaStatus} variant="outline" className="w-full">
          Retry Connection
        </Button>
      </div>
    );
  }

  const filteredModels = getFilteredModels();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Info Banner */}
      <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Local Model Management</p>
          <p className="text-xs mt-1 opacity-90">
            Download and manage local LLM models. Models run on your machine without requiring API keys.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedFamily === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedFamily('all')}
        >
          All Models
        </Button>
        <Button
          size="sm"
          variant={selectedFamily === 'gemma' ? 'default' : 'outline'}
          onClick={() => setSelectedFamily('gemma')}
        >
          Gemma
        </Button>
        <Button
          size="sm"
          variant={selectedFamily === 'llama' ? 'default' : 'outline'}
          onClick={() => setSelectedFamily('llama')}
        >
          Llama
        </Button>
        <Button
          size="sm"
          variant={selectedFamily === 'mistral' ? 'default' : 'outline'}
          onClick={() => setSelectedFamily('mistral')}
        >
          Mistral
        </Button>
        <Button
          size="sm"
          variant={selectedFamily === 'phi' ? 'default' : 'outline'}
          onClick={() => setSelectedFamily('phi')}
        >
          Phi
        </Button>
        <Button
          size="sm"
          variant={selectedFamily === 'qwen' ? 'default' : 'outline'}
          onClick={() => setSelectedFamily('qwen')}
        >
          Qwen
        </Button>

        <Separator orientation="vertical" className="h-8" />

        <Button
          size="sm"
          variant={showOnlyInstalled ? 'default' : 'outline'}
          onClick={() => setShowOnlyInstalled(!showOnlyInstalled)}
        >
          <Check className="h-4 w-4 mr-2" />
          Installed Only
        </Button>
      </div>

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredModels.map(model => renderModelCard(model))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No models found matching your filters.</p>
          <Button
            variant="link"
            onClick={() => {
              setSelectedFamily('all');
              setShowOnlyInstalled(false);
            }}
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}
