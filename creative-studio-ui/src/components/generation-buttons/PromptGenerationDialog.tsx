/**
 * Prompt Generation Dialog Component
 * 
 * Dialog for generating AI prompts with category selection.
 * Allows users to select genre, shot type, lighting, and other categories,
 * then generates and displays an editable prompt.
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { generationOrchestrator } from '../../services/GenerationOrchestrator';
import { useGenerationStore } from '../../stores/generationStore';
import type { PromptCategories, GeneratedPrompt } from '../../types/generation';
import { ErrorDisplay } from './ErrorDisplay';
import { PresetManager } from './PresetManager';
import type { PromptPreset } from '../../services/PresetManagementService';
import {
  categorizeError,
  preserveStateOnError,
  restorePreservedState,
  type CategorizedError,
  type PreservedState,
} from '../../utils/errorHandling';

export interface PromptGenerationDialogProps {
  /**
   * Whether the dialog is open
   */
  isOpen: boolean;
  
  /**
   * Callback when dialog is closed
   */
  onClose: () => void;
  
  /**
   * Callback when prompt is generated and approved
   */
  onGenerate: (prompt: GeneratedPrompt) => void;
  
  /**
   * Initial categories (optional)
   */
  initialCategories?: PromptCategories;
}

/**
 * Prompt Generation Dialog
 * 
 * Provides UI for selecting prompt categories and generating AI prompts.
 * Users can edit the generated prompt before using it.
 */
export const PromptGenerationDialog: React.FC<PromptGenerationDialogProps> = ({
  isOpen,
  onClose,
  onGenerate,
  initialCategories,
}) => {
  const { completeStage, failStage, updateStageProgress } = useGenerationStore();
  
  // Category state
  const [categories, setCategories] = useState<PromptCategories>(
    initialCategories || {
      genre: 'cinematic',
      shotType: 'medium-shot',
      lighting: 'natural',
      sceneElements: [],
      mood: 'neutral',
    }
  );
  
  // Generated prompt state
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [categorizedError, setCategorizedError] = useState<CategorizedError | null>(null);
  const [preservedState, setPreservedState] = useState<PreservedState | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Restore preserved state if available
      if (preservedState) {
        const restored = restorePreservedState(preservedState);
        setCategories(restored.userInputs.categories || categories);
        setGeneratedPrompt(restored.userInputs.generatedPrompt || '');
        setHasGenerated(!!restored.userInputs.generatedPrompt);
        setPreservedState(null);
      } else {
        setGeneratedPrompt('');
        setHasGenerated(false);
        if (initialCategories) {
          setCategories(initialCategories);
        }
      }
      setCategorizedError(null);
    }
  }, [isOpen, initialCategories, preservedState]);
  
  /**
   * Handle category change
   */
  const handleCategoryChange = (key: keyof PromptCategories, value: string) => {
    setCategories((prev) => ({
      ...prev,
      [key]: value,
    }));
  };
  
  /**
   * Load preset categories
   */
  const handleLoadPreset = (preset: PromptPreset) => {
    setCategories(preset.categories);
  };
  
  /**
   * Generate prompt from categories
   */
  const handleGenerate = async () => {
    setIsGenerating(true);
    setCategorizedError(null);
    
    try {
      const prompt = await generationOrchestrator.generatePrompt(
        categories,
        (progress) => {
          updateStageProgress('prompt', progress);
        },
        (error) => {
          const categorized = categorizeError(error);
          setCategorizedError(categorized);
          failStage('prompt', error.message);
          
          // Preserve state on error
          const preserved = preserveStateOnError(
            categorized,
            { categories, generatedPrompt },
            [],
            null
          );
          setPreservedState(preserved);
        }
      );
      
      setGeneratedPrompt(prompt.text);
      setHasGenerated(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate prompt');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      
      // Preserve state on error
      const preserved = preserveStateOnError(
        categorized,
        { categories, generatedPrompt },
        [],
        null
      );
      setPreservedState(preserved);
    } finally {
      setIsGenerating(false);
    }
  };
  
  /**
   * Handle prompt text edit
   */
  const handlePromptEdit = (value: string) => {
    setGeneratedPrompt(value);
  };
  
  /**
   * Use the generated/edited prompt
   */
  const handleUsePrompt = () => {
    if (!generatedPrompt.trim()) {
      const error = new Error('Prompt cannot be empty');
      const categorized = categorizeError(error);
      setCategorizedError(categorized);
      return;
    }
    
    const prompt: GeneratedPrompt = {
      text: generatedPrompt,
      categories,
      timestamp: Date.now(),
      editable: true,
    };
    
    // Complete the prompt stage
    completeStage('prompt', prompt);
    
    // Call the callback
    onGenerate(prompt);
    
    // Close dialog
    onClose();
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Generate AI Prompt
          </DialogTitle>
          <DialogDescription>
            Select categories to generate an optimized prompt for image generation.
            You can edit the generated prompt before using it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Preset Manager */}
          <PresetManager
            type="prompt"
            currentParams={categories}
            onLoadPreset={(preset) => handleLoadPreset(preset as PromptPreset)}
          />
          
          {/* Category Selectors */}
          <div className="grid grid-cols-2 gap-4">
            {/* Genre */}
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select
                value={categories.genre}
                onValueChange={(value) => handleCategoryChange('genre', value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="genre">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cinematic">Cinematic</SelectItem>
                  <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                  <SelectItem value="fantasy">Fantasy</SelectItem>
                  <SelectItem value="horror">Horror</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                  <SelectItem value="noir">Noir</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Shot Type */}
            <div className="space-y-2">
              <Label htmlFor="shotType">Shot Type</Label>
              <Select
                value={categories.shotType}
                onValueChange={(value) => handleCategoryChange('shotType', value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="shotType">
                  <SelectValue placeholder="Select shot type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="extreme-close-up">Extreme Close-Up</SelectItem>
                  <SelectItem value="close-up">Close-Up</SelectItem>
                  <SelectItem value="medium-shot">Medium Shot</SelectItem>
                  <SelectItem value="full-shot">Full Shot</SelectItem>
                  <SelectItem value="wide-shot">Wide Shot</SelectItem>
                  <SelectItem value="extreme-wide-shot">Extreme Wide Shot</SelectItem>
                  <SelectItem value="over-shoulder">Over-the-Shoulder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Lighting */}
            <div className="space-y-2">
              <Label htmlFor="lighting">Lighting</Label>
              <Select
                value={categories.lighting}
                onValueChange={(value) => handleCategoryChange('lighting', value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="lighting">
                  <SelectValue placeholder="Select lighting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Natural</SelectItem>
                  <SelectItem value="golden-hour">Golden Hour</SelectItem>
                  <SelectItem value="blue-hour">Blue Hour</SelectItem>
                  <SelectItem value="dramatic">Dramatic</SelectItem>
                  <SelectItem value="soft">Soft</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="neon">Neon</SelectItem>
                  <SelectItem value="candlelight">Candlelight</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Mood */}
            <div className="space-y-2">
              <Label htmlFor="mood">Mood</Label>
              <Select
                value={categories.mood}
                onValueChange={(value) => handleCategoryChange('mood', value)}
                disabled={isGenerating}
              >
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="tense">Tense</SelectItem>
                  <SelectItem value="peaceful">Peaceful</SelectItem>
                  <SelectItem value="mysterious">Mysterious</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                  <SelectItem value="melancholic">Melancholic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Generate Button */}
          {!hasGenerated && (
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Prompt...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Prompt
                </>
              )}
            </Button>
          )}
          
          {/* Generated Prompt Display */}
          {hasGenerated && (
            <div className="space-y-2">
              <Label htmlFor="prompt">Generated Prompt (Editable)</Label>
              <Textarea
                id="prompt"
                value={generatedPrompt}
                onChange={(e) => handlePromptEdit(e.target.value)}
                placeholder="Generated prompt will appear here..."
                className="min-h-[150px] font-mono text-sm"
                disabled={isGenerating}
              />
              <p className="text-sm text-muted-foreground">
                You can edit the prompt above before using it for image generation.
              </p>
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
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          
          {hasGenerated && (
            <>
              <Button
                variant="secondary"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              
              <Button
                onClick={handleUsePrompt}
                disabled={isGenerating || !generatedPrompt.trim()}
              >
                <Check className="mr-2 h-4 w-4" />
                Use Prompt
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
