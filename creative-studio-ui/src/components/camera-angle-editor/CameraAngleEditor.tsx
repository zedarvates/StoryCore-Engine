/**
 * CameraAngleEditor Component
 * 
 * Main editor interface for AI-powered camera angle generation.
 * Combines source image preview, angle preset selector, generation options,
 * and results grid into a cohesive editing experience.
 * 
 * Usage:
 * ```tsx
 * <CameraAngleEditor
 *   initialImageId="image-123"
 *   initialImagePath="/path/to/image.jpg"
 *   onGenerationComplete={(results) => handleResults(results)}
 * />
 * ```
 */

import React, { useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Settings2,
  X,
  Upload,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCameraAngleGeneration } from '@/hooks/useCameraAngleGeneration';
import { AnglePresetSelector } from './AnglePresetSelector';
import { ResultsGrid } from './ResultsGrid';
import type {
  CameraAngleResult,
  CameraAngleQuality,
} from '@/types/cameraAngle';

// ============================================================================
// Types
// ============================================================================

export interface CameraAngleEditorProps {
  /** Initial image ID (for reference) */
  initialImageId?: string;
  /** Initial image path or URL */
  initialImagePath?: string;
  /** Callback when generation completes */
  onGenerationComplete?: (results: CameraAngleResult[]) => void;
  /** Callback when generation fails */
  onGenerationError?: (error: string) => void;
  /** Callback when editor closes (optional) */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Show header with title */
  showHeader?: boolean;
  /** Show options panel */
  showOptions?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const CameraAngleEditor: React.FC<CameraAngleEditorProps> = ({
  initialImageId,
  initialImagePath,
  onGenerationComplete,
  onGenerationError,
  onClose,
  className,
  showHeader = true,
  showOptions = true,
}) => {
  // Use the camera angle generation hook
  const {
    job,
    presets,
    selectedAngles,
    sourceImage,
    options,
    error,
    isGenerating,
    hasResults,
    startGeneration,
    cancelGeneration,
    reset,
    setSourceImageFromUrl,
    setSourceImageFromFile,
    setSourceImage,
    toggleAngle,
    setSelectedAngles,
    selectAllAngles,
    clearAngleSelection,
    setOptions,
    clearError,
    downloadResult,
    downloadAllResults,
  } = useCameraAngleGeneration({
    onGenerationComplete,
    onGenerationError,
  });

  /**
   * Load initial image on mount
   */
  useEffect(() => {
    if (initialImagePath && !sourceImage) {
      setSourceImageFromUrl(initialImagePath).catch((err) => {
        console.error('Failed to load initial image:', err);
      });
    }
  }, [initialImagePath, sourceImage, setSourceImageFromUrl]);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        await setSourceImageFromFile(file);
      } catch (err) {
        console.error('Failed to load file:', err);
      }
    },
    [setSourceImageFromFile]
  );

  /**
   * Handle generate button click
   */
  const handleGenerate = useCallback(async () => {
    if (isGenerating) {
      await cancelGeneration();
    } else {
      await startGeneration();
    }
  }, [isGenerating, cancelGeneration, startGeneration]);

  /**
   * Handle retry after error
   */
  const handleRetry = useCallback(() => {
    clearError();
    startGeneration();
  }, [clearError, startGeneration]);

  /**
   * Handle quality change
   */
  const handleQualityChange = useCallback(
    (value: string) => {
      setOptions({ quality: value as CameraAngleQuality });
    },
    [setOptions]
  );

  /**
   * Handle custom prompt change
   */
  const handleCustomPromptChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setOptions({ customPrompt: event.target.value || null });
    },
    [setOptions]
  );

  /**
   * Handle preserve style toggle
   */
  const handlePreserveStyleChange = useCallback(
    (checked: boolean) => {
      setOptions({ preserveStyle: checked });
    },
    [setOptions]
  );

  /**
   * Handle reset
   */
  const handleReset = useCallback(() => {
    reset();
    if (initialImagePath) {
      setSourceImageFromUrl(initialImagePath).catch(console.error);
    }
  }, [reset, initialImagePath, setSourceImageFromUrl]);

  // Determine if generate button should be disabled
  const isGenerateDisabled = !sourceImage || selectedAngles.length === 0;

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      {showHeader && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Camera Angle Editor
            </h2>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Source Image Section */}
        <section>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Source Image
          </h3>
          <div className="flex gap-4">
            {/* Image preview */}
            <div className="relative w-40 h-40 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 overflow-hidden bg-gray-50 dark:bg-gray-800 flex-shrink-0">
              {sourceImage ? (
                <img
                  src={
                    sourceImage.startsWith('data:')
                      ? sourceImage
                      : `data:image/png;base64,${sourceImage}`
                  }
                  alt="Source image"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                  <ImageIcon className="w-8 h-8 mb-2" />
                  <span className="text-xs">No image</span>
                </div>
              )}
            </div>

            {/* Upload controls */}
            <div className="flex-1 flex flex-col justify-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isGenerating}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isGenerating}
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </span>
                </Button>
              </label>
              {sourceImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSourceImage(null)}
                  disabled={isGenerating}
                  className="text-gray-500"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Image
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Angle Preset Selector */}
        <section>
          <AnglePresetSelector
            presets={presets}
            selectedAngles={selectedAngles}
            onAngleToggle={toggleAngle}
            onSelectAll={selectAllAngles}
            onClearSelection={clearAngleSelection}
            disabled={isGenerating}
            columns={4}
          />
        </section>

        {/* Generation Options */}
        {showOptions && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Generation Options
              </h3>
            </div>
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              {/* Preserve Style */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="preserve-style"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Preserve Original Style
                </Label>
                <Switch
                  id="preserve-style"
                  checked={options.preserveStyle}
                  onCheckedChange={handlePreserveStyleChange}
                  disabled={isGenerating}
                />
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <Label
                  htmlFor="quality"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Quality
                </Label>
                <Select
                  value={options.quality}
                  onValueChange={handleQualityChange}
                  disabled={isGenerating}
                >
                  <SelectTrigger id="quality" className="w-full">
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (Fast)</SelectItem>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High (Slow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Prompt */}
              <div className="space-y-2">
                <Label
                  htmlFor="custom-prompt"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Custom Prompt (Optional)
                </Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Add additional instructions for the AI..."
                  value={options.customPrompt || ''}
                  onChange={handleCustomPromptChange}
                  disabled={isGenerating}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          </section>
        )}

        {/* Results Grid */}
        <section>
          <ResultsGrid
            results={job.results}
            presets={presets}
            onDownload={downloadResult}
            onDownloadAll={downloadAllResults}
            isLoading={isGenerating}
            progress={job.progress}
            currentStep={job.currentStep}
            error={error || job.error}
            onRetry={handleRetry}
            columns={3}
          />
        </section>
      </div>

      {/* Footer with action buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          disabled={isGenerating}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset
        </Button>

        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerateDisabled && !isGenerating}
          className="min-w-[140px]"
        >
          {isGenerating ? (
            <>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate ({selectedAngles.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default CameraAngleEditor;
