/**
 * Image Generation Dialog Component
 * 
 * Dialog for generating images using ComfyUI Flux Turbo workflow.
 * Provides parameter controls and integrates with the generation pipeline.
 * 
 * Requirements: 2.1, 2.2, 10.1, 10.4
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { Loader2, Image as ImageIcon, Check, AlertCircle } from 'lucide-react';
import { generationOrchestrator } from '../../services/GenerationOrchestrator';
import { useGenerationStore } from '../../stores/generationStore';
import type { ImageGenerationParams } from '../../types/generation';
import { ErrorDisplay } from './ErrorDisplay';
import { PresetManager } from './PresetManager';
import type { ImagePreset } from '../../services/PresetManagementService';
import {
  categorizeError,
  preserveStateOnError,
  restorePreservedState,
  suggestParameterAdjustments,
  type CategorizedError,
  type PreservedState,
} from '../../utils/errorHandling';

export interface ImageGenerationDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
  
  /**
   * Initial prompt (pre-filled from previous step)
   */
  initialPrompt?: string;
}

/**
 * Default image generation parameters
 */
const DEFAULT_PARAMS: ImageGenerationParams = {
  prompt: '',
  negativePrompt: 'blurry, low quality, distorted, deformed, ugly, bad anatomy',
  width: 1024,
  height: 1024,
  steps: 20,
  cfgScale: 7.5,
  seed: -1, // Random seed
  sampler: 'euler_ancestral',
  scheduler: 'normal',
};

/**
 * Available samplers
 */
const SAMPLERS = [
  'euler',
  'euler_ancestral',
  'heun',
  'dpm_2',
  'dpm_2_ancestral',
  'lms',
  'dpm_fast',
  'dpm_adaptive',
  'dpmpp_2s_ancestral',
  'dpmpp_sde',
  'dpmpp_2m',
  'ddim',
  'uni_pc',
];

/**
 * Available schedulers
 */
const SCHEDULERS = [
  'normal',
  'karras',
  'exponential',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
];

/**
 * Common image dimensions
 */
const COMMON_DIMENSIONS = [
  { label: 'Square (1024x1024)', width: 1024, height: 1024 },
  { label: 'Portrait (768x1024)', width: 768, height: 1024 },
  { label: 'Landscape (1024x768)', width: 1024, height: 768 },
  { label: 'Wide (1280x720)', width: 1280, height: 720 },
  { label: 'Ultra Wide (1920x1080)', width: 1920, height: 1080 },
];

/**
 * Image Generation Dialog
 * 
 * Provides UI for configuring image generation parameters and triggering generation.
 * Integrates with ComfyUIService for z_image_turbo workflow.
 */
export const ImageGenerationDialog: React.FC<ImageGenerationDialogProps> = ({
  isOpen,
  onClose,
  initialPrompt,
}) => {
  const { currentPipeline, completeStage, failStage, updateStageProgress } = useGenerationStore();
  
  // Parameters state
  const [params, setParams] = useState<ImageGenerationParams>(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categorizedError, setCategorizedError] = useState<CategorizedError | null>(null);
  const [preservedState, setPreservedState] = useState<PreservedState | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Pre-fill prompt from previous step
  useEffect(() => {
    if (isOpen) {
      const promptStage = currentPipeline?.stages.prompt;
      const promptText = initialPrompt || promptStage?.result?.text || '';
      
      setParams((prev) => ({
        ...prev,
        prompt: promptText,
      }));
      setCategorizedError(null);
      setValidationErrors({});
    }
  }, [isOpen, initialPrompt, currentPipeline]);
  
  /**
   * Update parameter value
   */
  const updateParam = <K extends keyof ImageGenerationParams>(
    key: K,
    value: ImageGenerationParams[K]
  ) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
    
    // Clear validation error for this field
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };
  
  /**
   * Apply preset dimensions
   */
  const applyDimensions = (width: number, height: number) => {
    setParams((prev) => ({
      ...prev,
      width,
      height,
    }));
  };
  
  /**
   * Load preset parameters
   */
  const handleLoadPreset = (preset: ImagePreset) => {
    setParams((prev) => ({
      ...prev,
      ...preset.params,
    }));
  };
  
  /**
   * Validate parameters
   */
  const validateParams = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!params.prompt.trim()) {
      errors.prompt = 'Prompt is required';
    }
    
    if (params.width < 256 || params.width > 2048) {
      errors.width = 'Width must be between 256 and 2048';
    }
    
    if (params.height < 256 || params.height > 2048) {
      errors.height = 'Height must be between 256 and 2048';
    }
    
    if (params.width % 8 !== 0) {
      errors.width = 'Width must be divisible by 8';
    }
    
    if (params.height % 8 !== 0) {
      errors.height = 'Height must be divisible by 8';
    }
    
    if (params.steps < 1 || params.steps > 150) {
      errors.steps = 'Steps must be between 1 and 150';
    }
    
    if (params.cfgScale < 1 || params.cfgScale > 30) {
      errors.cfgScale = 'CFG Scale must be between 1 and 30';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Generate image
   */
  const handleGenerate = async () => {
    // Validate parameters
    if (!validateParams()) {
      const error = new Error('Please fix the validation errors before generating');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      return;
    }
    
    setIsGenerating(true);
    setCategorizedError(null);
    
    try {
      const result = await generationOrchestrator.generateImage(
        params,
        (progress) => {
          updateStageProgress('image', progress);
        },
        (error) => {
          const categorized = categorizeError(error);
          setCategorizedError(categorized);
          failStage('image', error.message);
          
          // Preserve state on error
          const preserved = preserveStateOnError(
            categorized,
            { params },
            [],
            null
          );
          setPreservedState(preserved);
        }
      );
      
      // Complete the image stage
      completeStage('image', result);
      
      // Close dialog
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate image');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      
      // Preserve state on error
      const preserved = preserveStateOnError(
        categorized,
        { params },
        [],
        null
      );
      setPreservedState(preserved);
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Handle dialog close
   */
  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Generate Image
          </DialogTitle>
          <DialogDescription>
            Configure parameters for image generation using Flux Turbo.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preset Manager */}
          <PresetManager
            type="image"
            currentParams={params}
            onLoadPreset={(preset) => handleLoadPreset(preset as ImagePreset)}
          />
          
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Prompt <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              value={params.prompt}
              onChange={(e) => updateParam('prompt', e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="min-h-[100px]"
              disabled={isGenerating}
            />
            {validationErrors.prompt && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.prompt}
              </p>
            )}
          </div>
          
          {/* Negative Prompt */}
          <div className="space-y-2">
            <Label htmlFor="negativePrompt">Negative Prompt</Label>
            <Textarea
              id="negativePrompt"
              value={params.negativePrompt}
              onChange={(e) => updateParam('negativePrompt', e.target.value)}
              placeholder="What to avoid in the image..."
              className="min-h-[60px]"
              disabled={isGenerating}
            />
          </div>
          
          {/* Dimensions */}
          <div className="space-y-2">
            <Label>Dimensions</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {COMMON_DIMENSIONS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyDimensions(preset.width, preset.height)}
                  disabled={isGenerating}
                  className={
                    params.width === preset.width && params.height === preset.height
                      ? 'border-primary'
                      : ''
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width</Label>
                <Input
                  id="width"
                  type="number"
                  value={params.width}
                  onChange={(e) => updateParam('width', parseInt(e.target.value) || 1024)}
                  min={256}
                  max={2048}
                  step={8}
                  disabled={isGenerating}
                />
                {validationErrors.width && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.width}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  type="number"
                  value={params.height}
                  onChange={(e) => updateParam('height', parseInt(e.target.value) || 1024)}
                  min={256}
                  max={2048}
                  step={8}
                  disabled={isGenerating}
                />
                {validationErrors.height && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.height}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* Steps */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="steps">Steps</Label>
              <span className="text-sm text-muted-foreground">{params.steps}</span>
            </div>
            <Slider
              id="steps"
              value={[params.steps]}
              onValueChange={([value]) => updateParam('steps', value)}
              min={1}
              max={150}
              step={1}
              disabled={isGenerating}
            />
            {validationErrors.steps && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.steps}
              </p>
            )}
          </div>
          
          {/* CFG Scale */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="cfgScale">CFG Scale</Label>
              <span className="text-sm text-muted-foreground">{params.cfgScale.toFixed(1)}</span>
            </div>
            <Slider
              id="cfgScale"
              value={[params.cfgScale]}
              onValueChange={([value]) => updateParam('cfgScale', value)}
              min={1}
              max={30}
              step={0.5}
              disabled={isGenerating}
            />
            {validationErrors.cfgScale && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.cfgScale}
              </p>
            )}
          </div>
          
          {/* Seed */}
          <div className="space-y-2">
            <Label htmlFor="seed">Seed (-1 for random)</Label>
            <Input
              id="seed"
              type="number"
              value={params.seed}
              onChange={(e) => updateParam('seed', parseInt(e.target.value) || -1)}
              disabled={isGenerating}
            />
          </div>
          
          {/* Sampler and Scheduler */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sampler">Sampler</Label>
              <Select
                value={params.sampler}
                onValueChange={(value) => updateParam('sampler', value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="sampler">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLERS.map((sampler) => (
                    <SelectItem key={sampler} value={sampler}>
                      {sampler}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scheduler">Scheduler</Label>
              <Select
                value={params.scheduler}
                onValueChange={(value) => updateParam('scheduler', value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="scheduler">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULERS.map((scheduler) => (
                    <SelectItem key={scheduler} value={scheduler}>
                      {scheduler}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Error Display */}
          {categorizedError && (
            <ErrorDisplay
              error={categorizedError}
              onRetry={categorizedError.canRetry ? handleGenerate : undefined}
              onAdjustParameters={() => {
                // Suggest parameter adjustments
                const suggestions = suggestParameterAdjustments(categorizedError, params);
                if (suggestions) {
                  setParams((prev) => ({ ...prev, ...suggestions }));
                }
                setCategorizedError(null);
              }}
              onDismiss={() => setCategorizedError(null)}
              className="mt-4"
            />
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !params.prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Generate Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
