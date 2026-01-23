import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Shuffle,
  RotateCcw,
  Save,
  Play,
} from 'lucide-react';

interface ComfyUIParameters {
  // Generation settings
  prompt: string;
  negativePrompt: string;
  seed: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  scheduler: string;
  denoisingStrength: number;

  // Image dimensions
  width: number;
  height: number;

  // Model settings
  checkpoint?: string;
  vae?: string;
  lora?: string[];
}

interface ComfyUIParameterPanelProps {
  parameters: ComfyUIParameters;
  onParametersChange: (parameters: ComfyUIParameters) => void;
  onExecuteWorkflow?: (parameters: ComfyUIParameters) => void;
  className?: string;
}

const AVAILABLE_SAMPLERS = [
  'euler', 'euler_ancestral', 'heun', 'dpm_2', 'dpm_2_ancestral',
  'lms', 'dpm_fast', 'dpm_adaptive', 'dpmpp_2s_ancestral', 'dpmpp_sde',
  'dpmpp_sde_gpu', 'dpmpp_2m', 'dpmpp_2m_sde', 'dpmpp_2m_sde_gpu',
  'ddim', 'plms', 'uni_pc', 'uni_pc_bh2'
];

const AVAILABLE_SCHEDULERS = [
  'normal', 'karras', 'exponential', 'sgm_uniform', 'simple', 'ddim_uniform'
];

const DEFAULT_PARAMETERS: ComfyUIParameters = {
  prompt: '',
  negativePrompt: '',
  seed: -1,
  steps: 20,
  cfgScale: 7.0,
  sampler: 'euler',
  scheduler: 'normal',
  denoisingStrength: 1.0,
  width: 1024,
  height: 1024,
};

export function ComfyUIParameterPanel({
  parameters,
  onParametersChange,
  onExecuteWorkflow,
  className,
}: ComfyUIParameterPanelProps) {
  const { toast } = useToast();
  const [localParams, setLocalParams] = useState<ComfyUIParameters>({
    ...DEFAULT_PARAMETERS,
    ...parameters,
  });

  // Update local params when props change
  useEffect(() => {
    setLocalParams(prev => ({
      ...prev,
      ...parameters,
    }));
  }, [parameters]);

  // Update parent when local params change
  const updateParameter = <K extends keyof ComfyUIParameters>(
    key: K,
    value: ComfyUIParameters[K]
  ) => {
    const newParams = { ...localParams, [key]: value };
    setLocalParams(newParams);
    onParametersChange(newParams);
  };

  // Generate random seed
  const randomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 1000000000);
    updateParameter('seed', newSeed);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    setLocalParams(DEFAULT_PARAMETERS);
    onParametersChange(DEFAULT_PARAMETERS);
    toast({
      title: 'Parameters Reset',
      description: 'All parameters reset to default values',
    });
  };

  // Save as preset
  const saveAsPreset = () => {
    toast({
      title: 'Preset Saved',
      description: 'Parameter preset saved (not implemented yet)',
    });
  };

  // Execute workflow
  const executeWorkflow = () => {
    if (!localParams.prompt.trim()) {
      toast({
        title: 'Missing Prompt',
        description: 'Please enter a prompt before executing',
        variant: 'destructive',
      });
      return;
    }

    onExecuteWorkflow?.(localParams);
  };

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Generation Parameters
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={randomizeSeed}
            className="p-2 hover:bg-muted rounded-md"
            title="Randomize seed"
          >
            <Shuffle className="w-4 h-4" />
          </button>
          <button
            onClick={resetToDefaults}
            className="p-2 hover:bg-muted rounded-md"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={saveAsPreset}
            className="p-2 hover:bg-muted rounded-md"
            title="Save as preset"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Prompts */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Prompt</label>
          <textarea
            value={localParams.prompt}
            onChange={(e) => updateParameter('prompt', e.target.value)}
            placeholder="Describe what you want to generate..."
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={3}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Negative Prompt</label>
          <textarea
            value={localParams.negativePrompt}
            onChange={(e) => updateParameter('negativePrompt', e.target.value)}
            placeholder="Describe what you want to avoid..."
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Generation Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Steps</label>
          <input
            type="number"
            min="1"
            max="150"
            value={localParams.steps}
            onChange={(e) => updateParameter('steps', parseInt(e.target.value) || 20)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Number of generation steps"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">CFG Scale</label>
          <input
            type="number"
            min="1"
            max="30"
            step="0.1"
            value={localParams.cfgScale}
            onChange={(e) => updateParameter('cfgScale', parseFloat(e.target.value) || 7.0)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="CFG scale parameter"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Sampler</label>
          <select
            value={localParams.sampler}
            onChange={(e) => updateParameter('sampler', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Sampler selection"
          >
            {AVAILABLE_SAMPLERS.map(sampler => (
              <option key={sampler} value={sampler}>{sampler}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Scheduler</label>
          <select
            value={localParams.scheduler}
            onChange={(e) => updateParameter('scheduler', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Scheduler selection"
          >
            {AVAILABLE_SCHEDULERS.map(scheduler => (
              <option key={scheduler} value={scheduler}>{scheduler}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Image Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Width</label>
          <input
            type="number"
            min="64"
            max="2048"
            step="64"
            value={localParams.width}
            onChange={(e) => updateParameter('width', parseInt(e.target.value) || 1024)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Image width in pixels"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Height</label>
          <input
            type="number"
            min="64"
            max="2048"
            step="64"
            value={localParams.height}
            onChange={(e) => updateParameter('height', parseInt(e.target.value) || 1024)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Image height in pixels"
          />
        </div>
      </div>

      {/* Seed and Denoising */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Seed</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="-1"
              value={localParams.seed}
              onChange={(e) => updateParameter('seed', parseInt(e.target.value) || -1)}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Generation seed value"
            />
            <button
              onClick={randomizeSeed}
              className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-md"
              title="Random seed"
            >
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            -1 for random seed
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Denoising Strength</label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={localParams.denoisingStrength}
            onChange={(e) => updateParameter('denoisingStrength', parseFloat(e.target.value) || 1.0)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Denoising strength"
          />
        </div>
      </div>

      {/* Execute Button */}
      {onExecuteWorkflow && (
        <div className="pt-4 border-t border-border">
          <button
            onClick={executeWorkflow}
            disabled={!localParams.prompt.trim()}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
          >
            <Play className="w-4 h-4" />
            Generate with ComfyUI
          </button>
        </div>
      )}
    </div>
  );
}
