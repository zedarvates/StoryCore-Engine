/**
 * Video Generation Dialog Component
 * 
 * Dialog for generating videos using ComfyUI LTX2 i2v workflow.
 * Provides parameter controls and integrates with the generation pipeline.
 * 
 * Requirements: 3.1, 3.2, 10.2, 10.4
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
import { Slider } from '../ui/slider';
import { Loader2, Video, Check, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { generationOrchestrator } from '../../services/GenerationOrchestrator';
import { useGenerationStore } from '../../stores/generationStore';
import type { VideoGenerationParams, GeneratedAsset } from '../../types/generation';
import { ErrorDisplay } from './ErrorDisplay';
import { PresetManager } from './PresetManager';
import type { VideoPreset } from '../../services/PresetManagementService';
import {
  categorizeError,
  preserveStateOnError,
  suggestParameterAdjustments,
  type CategorizedError,
  type PreservedState,
} from '../../utils/errorHandling';

export interface VideoGenerationDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
  
  /**
   * Source image for video generation
   */
  sourceImage?: GeneratedAsset;
}

/**
 * Default video generation parameters
 */
const DEFAULT_PARAMS: Omit<VideoGenerationParams, 'inputImagePath'> = {
  prompt: '',
  frameCount: 121,
  frameRate: 25,
  width: 768,
  height: 512,
  motionStrength: 0.8,
};

/**
 * Common video dimensions
 */
const COMMON_DIMENSIONS = [
  { label: 'SD (768x512)', width: 768, height: 512 },
  { label: 'HD (1024x576)', width: 1024, height: 576 },
  { label: 'Portrait (512x768)', width: 512, height: 768 },
  { label: 'Square (768x768)', width: 768, height: 768 },
];

/**
 * Frame count presets
 */
const FRAME_COUNT_PRESETS = [
  { label: '2s (49 frames)', frames: 49 },
  { label: '3s (73 frames)', frames: 73 },
  { label: '5s (121 frames)', frames: 121 },
  { label: '8s (193 frames)', frames: 193 },
];

/**
 * Video Generation Dialog
 * 
 * Provides UI for configuring video generation parameters and triggering generation.
 * Integrates with ComfyUIService for LTX2 i2v workflow.
 */
export const VideoGenerationDialog: React.FC<VideoGenerationDialogProps> = ({
  isOpen,
  onClose,
  sourceImage,
}) => {
  const { currentPipeline, completeStage, failStage, updateStageProgress } = useGenerationStore();
  
  // Parameters state
  const [params, setParams] = useState<Omit<VideoGenerationParams, 'inputImagePath'>>(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [categorizedError, setCategorizedError] = useState<CategorizedError | null>(null);
  const [preservedState, setPreservedState] = useState<PreservedState | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // Get source image from pipeline if not provided
  const imageAsset = sourceImage || currentPipeline?.stages.image.result;
  
  // Pre-fill prompt from previous step
  useEffect(() => {
    if (isOpen) {
      const promptStage = currentPipeline?.stages.prompt;
      const imageStage = currentPipeline?.stages.image;
      
      // Use prompt from prompt stage or image stage
      const promptText = promptStage?.result?.text || '';
      
      // Set default motion prompt if empty
      const defaultMotionPrompt = promptText 
        ? `${promptText}, smooth camera movement, cinematic motion`
        : 'smooth camera movement, cinematic motion';
      
      setParams((prev) => ({
        ...prev,
        prompt: defaultMotionPrompt,
      }));
      
      // Match dimensions to source image if available
      if (imageAsset?.metadata.dimensions) {
        setParams((prev) => ({
          ...prev,
          width: imageAsset.metadata.dimensions!.width,
          height: imageAsset.metadata.dimensions!.height,
        }));
      }
      
      setCategorizedError(null);
      setValidationErrors({});
    }
  }, [isOpen, currentPipeline, imageAsset]);
  
  /**
   * Update parameter value
   */
  const updateParam = <K extends keyof Omit<VideoGenerationParams, 'inputImagePath'>>(
    key: K,
    value: Omit<VideoGenerationParams, 'inputImagePath'>[K]
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
   * Apply frame count preset
   */
  const applyFrameCount = (frames: number) => {
    setParams((prev) => ({
      ...prev,
      frameCount: frames,
    }));
  };
  
  /**
   * Load preset parameters
   */
  const handleLoadPreset = (preset: VideoPreset) => {
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
    
    if (!imageAsset) {
      errors.sourceImage = 'Source image is required. Generate an image first.';
    }
    
    if (!params.prompt.trim()) {
      errors.prompt = 'Motion description is required';
    }
    
    if (params.width < 256 || params.width > 1920) {
      errors.width = 'Width must be between 256 and 1920';
    }
    
    if (params.height < 256 || params.height > 1920) {
      errors.height = 'Height must be between 256 and 1920';
    }
    
    if (params.width % 8 !== 0) {
      errors.width = 'Width must be divisible by 8';
    }
    
    if (params.height % 8 !== 0) {
      errors.height = 'Height must be divisible by 8';
    }
    
    if (params.frameCount < 25 || params.frameCount > 257) {
      errors.frameCount = 'Frame count must be between 25 and 257';
    }
    
    if (params.frameRate < 1 || params.frameRate > 60) {
      errors.frameRate = 'Frame rate must be between 1 and 60';
    }
    
    if (params.motionStrength < 0 || params.motionStrength > 1) {
      errors.motionStrength = 'Motion strength must be between 0 and 1';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Calculate video duration
   */
  const calculateDuration = (): string => {
    const duration = params.frameCount / params.frameRate;
    return duration.toFixed(1);
  };
  
  /**
   * Generate video
   */
  const handleGenerate = async () => {
    // Validate parameters
    if (!validateParams()) {
      const error = new Error('Please fix the validation errors before generating');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      return;
    }
    
    if (!imageAsset) {
      const error = new Error('Source image is required. Generate an image first.');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      return;
    }
    
    setIsGenerating(true);
    setCategorizedError(null);
    
    try {
      const fullParams: VideoGenerationParams = {
        ...params,
        inputImagePath: imageAsset.url,
      };
      
      const result = await generationOrchestrator.generateVideo(
        fullParams,
        (progress) => {
          updateStageProgress('video', progress);
        },
        (error) => {
          const categorized = categorizeError(error);
          setCategorizedError(categorized);
          failStage('video', error.message);
          
          // Preserve state on error
          const preserved = preserveStateOnError(
            categorized,
            { params },
            [imageAsset],
            null
          );
          setPreservedState(preserved);
        }
      );
      
      // Complete the video stage
      completeStage('video', result);
      
      // Close dialog
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate video');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      
      // Preserve state on error
      const preserved = preserveStateOnError(
        categorized,
        { params },
        [imageAsset],
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
            <Video className="h-5 w-5" />
            Generate Video
          </DialogTitle>
          <DialogDescription>
            Configure parameters for video generation using LTX2 i2v workflow.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preset Manager */}
          <PresetManager
            type="video"
            currentParams={params}
            onLoadPreset={(preset) => handleLoadPreset(preset as VideoPreset)}
          />
          
          {/* Source Image Preview */}
          {imageAsset && (
            <div className="space-y-2">
              <Label>Source Image</Label>
              <div className="relative rounded-lg border overflow-hidden bg-muted">
                <img
                  src={imageAsset.url}
                  alt="Source for video generation"
                  className="w-full h-auto max-h-64 object-contain"
                />
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  {imageAsset.metadata.dimensions?.width} × {imageAsset.metadata.dimensions?.height}
                </div>
              </div>
            </div>
          )}
          
          {/* No source image error */}
          {!imageAsset && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>No source image available. Please generate an image first.</div>
            </div>
          )}
          
          {/* Motion Description Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">
              Motion Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              value={params.prompt}
              onChange={(e) => updateParam('prompt', e.target.value)}
              placeholder="Describe the motion and camera movement..."
              className="min-h-[100px]"
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Describe how the scene should move and animate (e.g., "camera slowly zooms in, gentle wind blowing")
            </p>
            {validationErrors.prompt && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.prompt}
              </p>
            )}
          </div>
          
          {/* Frame Count */}
          <div className="space-y-2">
            <Label>Frame Count</Label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {FRAME_COUNT_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyFrameCount(preset.frames)}
                  disabled={isGenerating}
                  className={
                    params.frameCount === preset.frames
                      ? 'border-primary'
                      : ''
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Slider
                  id="frameCount"
                  value={[params.frameCount]}
                  onValueChange={([value]) => updateParam('frameCount', value)}
                  min={25}
                  max={257}
                  step={8}
                  disabled={isGenerating}
                />
              </div>
              <div className="w-20">
                <Input
                  type="number"
                  value={params.frameCount}
                  onChange={(e) => updateParam('frameCount', parseInt(e.target.value) || 121)}
                  min={25}
                  max={257}
                  step={8}
                  disabled={isGenerating}
                  className="text-center"
                />
              </div>
            </div>
            {validationErrors.frameCount && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.frameCount}
              </p>
            )}
          </div>
          
          {/* Frame Rate */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="frameRate">Frame Rate (FPS)</Label>
              <span className="text-sm text-muted-foreground">{params.frameRate} fps</span>
            </div>
            <Slider
              id="frameRate"
              value={[params.frameRate]}
              onValueChange={([value]) => updateParam('frameRate', value)}
              min={1}
              max={60}
              step={1}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Duration: {calculateDuration()}s
            </p>
            {validationErrors.frameRate && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.frameRate}
              </p>
            )}
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
                  onChange={(e) => updateParam('width', parseInt(e.target.value) || 768)}
                  min={256}
                  max={1920}
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
                  onChange={(e) => updateParam('height', parseInt(e.target.value) || 512)}
                  min={256}
                  max={1920}
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
          
          {/* Motion Strength */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="motionStrength">Motion Strength</Label>
              <span className="text-sm text-muted-foreground">{params.motionStrength.toFixed(2)}</span>
            </div>
            <Slider
              id="motionStrength"
              value={[params.motionStrength]}
              onValueChange={([value]) => updateParam('motionStrength', value)}
              min={0}
              max={1}
              step={0.05}
              disabled={isGenerating}
            />
            <p className="text-xs text-muted-foreground">
              Higher values create more dramatic motion (0 = subtle, 1 = intense)
            </p>
            {validationErrors.motionStrength && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.motionStrength}
              </p>
            )}
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
            disabled={isGenerating || !imageAsset || !params.prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Generate Video
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
