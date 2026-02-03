/**
 * Audio Generation Dialog Component
 * 
 * Dialog for generating audio and voiceovers using TTS services.
 * Provides parameter controls and integrates with the generation pipeline.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 10.3, 10.4
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
import { Textarea } from '../ui/textarea';
import { Slider } from '../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Volume2, Check, AlertCircle, Play } from 'lucide-react';
import { generationOrchestrator } from '../../services/GenerationOrchestrator';
import { useGenerationStore } from '../../stores/generationStore';
import type { AudioGenerationParams } from '../../types/generation';
import { ErrorDisplay } from './ErrorDisplay';
import { PresetManager } from './PresetManager';
import type { AudioPreset } from '../../services/PresetManagementService';
import {
  categorizeError,
  preserveStateOnError,
  type CategorizedError,
  type PreservedState,
} from '../../utils/errorHandling';

export interface AudioGenerationDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
}

/**
 * Default audio generation parameters
 */
const DEFAULT_PARAMS: AudioGenerationParams = {
  text: '',
  voiceType: 'neutral',
  speed: 1.0,
  pitch: 0,
  language: 'en-US',
  emotion: 'neutral',
};

/**
 * Available languages
 */
const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
];

/**
 * Available emotions
 */
const EMOTIONS: Array<AudioGenerationParams['emotion']> = [
  'neutral',
  'happy',
  'sad',
  'excited',
  'calm',
];

/**
 * Audio Generation Dialog
 * 
 * Provides UI for configuring audio generation parameters and triggering generation.
 * Integrates with TTSService for audio generation.
 */
export const AudioGenerationDialog: React.FC<AudioGenerationDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentPipeline, completeStage, failStage, updateStageProgress } = useGenerationStore();
  
  // Parameters state
  const [params, setParams] = useState<AudioGenerationParams>(DEFAULT_PARAMS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [categorizedError, setCategorizedError] = useState<CategorizedError | null>(null);
  const [preservedState, setPreservedState] = useState<PreservedState | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setParams(DEFAULT_PARAMS);
      setCategorizedError(null);
      setValidationErrors({});
      setPreviewAudioUrl(null);
    }
  }, [isOpen]);
  
  /**
   * Update parameter value
   */
  const updateParam = <K extends keyof AudioGenerationParams>(
    key: K,
    value: AudioGenerationParams[K]
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
   * Load preset parameters
   */
  const handleLoadPreset = (preset: AudioPreset) => {
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
    
    if (!params.text.trim()) {
      errors.text = 'Text is required';
    }
    
    if (params.text.length > 5000) {
      errors.text = 'Text must be less than 5000 characters';
    }
    
    if (params.speed < 0.5 || params.speed > 2.0) {
      errors.speed = 'Speed must be between 0.5 and 2.0';
    }
    
    if (params.pitch < -10 || params.pitch > 10) {
      errors.pitch = 'Pitch must be between -10 and 10';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  /**
   * Preview audio
   */
  const handlePreview = async () => {
    // Validate parameters
    if (!validateParams()) {
      const error = new Error('Please fix the validation errors before previewing');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      return;
    }
    
    setIsPreviewing(true);
    setCategorizedError(null);
    
    try {
      const result = await generationOrchestrator.generateAudio(
        params,
        (progress) => {
          // Progress updates for preview
        },
        (error) => {
          const categorized = categorizeError(error);
          setCategorizedError(categorized);
        }
      );
      
      // Set preview audio URL
      setPreviewAudioUrl(result.url);
      
      // Play preview audio
      const audio = new Audio(result.url);
      audio.play();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to preview audio');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
    } finally {
      setIsPreviewing(false);
    }
  };
  
  /**
   * Generate final audio
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
      const result = await generationOrchestrator.generateAudio(
        params,
        (progress) => {
          updateStageProgress('audio', progress);
        },
        (error) => {
          const categorized = categorizeError(error);
          setCategorizedError(categorized);
          failStage('audio', error.message);
          
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
      
      // Complete the audio stage
      completeStage('audio', result);
      
      // Close dialog
      onClose();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate audio');
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
    if (!isGenerating && !isPreviewing) {
      onClose();
    }
  };
  
  /**
   * Calculate character count
   */
  const characterCount = params.text.length;
  const maxCharacters = 5000;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Generate Audio
          </DialogTitle>
          <DialogDescription>
            Configure parameters for audio and voiceover generation using TTS.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preset Manager */}
          <PresetManager
            type="audio"
            currentParams={params}
            onLoadPreset={(preset) => handleLoadPreset(preset as AudioPreset)}
          />
          
          {/* Text Input */}
          <div className="space-y-2">
            <Label htmlFor="text">
              Narration Text <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="text"
              value={params.text}
              onChange={(e) => updateParam('text', e.target.value)}
              placeholder="Enter the text to be spoken..."
              className="min-h-[150px]"
              disabled={isGenerating || isPreviewing}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Enter the text you want to convert to speech</span>
              <span className={characterCount > maxCharacters ? 'text-destructive' : ''}>
                {characterCount} / {maxCharacters}
              </span>
            </div>
            {validationErrors.text && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.text}
              </p>
            )}
          </div>
          
          {/* Voice Type */}
          <div className="space-y-2">
            <Label htmlFor="voiceType">Voice Type</Label>
            <Select
              value={params.voiceType}
              onValueChange={(value) => updateParam('voiceType', value as AudioGenerationParams['voiceType'])}
              disabled={isGenerating || isPreviewing}
            >
              <SelectTrigger id="voiceType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={params.language}
              onValueChange={(value) => updateParam('language', value)}
              disabled={isGenerating || isPreviewing}
            >
              <SelectTrigger id="language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Speed */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="speed">Speed</Label>
              <span className="text-sm text-muted-foreground">{params.speed.toFixed(2)}x</span>
            </div>
            <Slider
              id="speed"
              value={[params.speed]}
              onValueChange={([value]) => updateParam('speed', value)}
              min={0.5}
              max={2.0}
              step={0.05}
              disabled={isGenerating || isPreviewing}
            />
            <p className="text-xs text-muted-foreground">
              Adjust the speaking speed (0.5 = slow, 1.0 = normal, 2.0 = fast)
            </p>
            {validationErrors.speed && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.speed}
              </p>
            )}
          </div>
          
          {/* Pitch */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="pitch">Pitch</Label>
              <span className="text-sm text-muted-foreground">
                {params.pitch > 0 ? '+' : ''}{params.pitch}
              </span>
            </div>
            <Slider
              id="pitch"
              value={[params.pitch]}
              onValueChange={([value]) => updateParam('pitch', value)}
              min={-10}
              max={10}
              step={1}
              disabled={isGenerating || isPreviewing}
            />
            <p className="text-xs text-muted-foreground">
              Adjust the voice pitch (-10 = lower, 0 = normal, +10 = higher)
            </p>
            {validationErrors.pitch && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {validationErrors.pitch}
              </p>
            )}
          </div>
          
          {/* Emotion */}
          <div className="space-y-2">
            <Label htmlFor="emotion">Emotion</Label>
            <Select
              value={params.emotion}
              onValueChange={(value) => updateParam('emotion', value as AudioGenerationParams['emotion'])}
              disabled={isGenerating || isPreviewing}
            >
              <SelectTrigger id="emotion">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMOTIONS.map((emotion) => (
                  <SelectItem key={emotion} value={emotion}>
                    {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the emotional tone for the voice
            </p>
          </div>
          
          {/* Preview Audio Player */}
          {previewAudioUrl && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <audio
                controls
                src={previewAudioUrl}
                className="w-full"
              />
            </div>
          )}
          
          {/* Error Display */}
          {categorizedError && (
            <ErrorDisplay
              error={categorizedError}
              onRetry={categorizedError.canRetry ? handleGenerate : undefined}
              onDismiss={() => setCategorizedError(null)}
              className="mt-4"
            />
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating || isPreviewing}
          >
            Cancel
          </Button>
          
          <Button
            variant="secondary"
            onClick={handlePreview}
            disabled={isGenerating || isPreviewing || !params.text.trim()}
          >
            {isPreviewing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Previewing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Preview
              </>
            )}
          </Button>
          
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isPreviewing || !params.text.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Generate Audio
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
