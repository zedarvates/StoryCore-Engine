/**
 * Panel Generation Controls Component
 * 
 * Provides UI controls for generating panel images via backend integration
 * Displays loading indicators, handles errors, and manages generation state
 * 
 * Validates Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7
 */

import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { useGridStore } from '../../stores/gridEditorStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { gridApi } from '../../services/gridEditor/GridAPIService';
import type { Panel } from '../../types/gridEditor';
import type { PanelGenerationConfig } from '../../services/gridEditor/GridAPIService';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PanelGenerationControlsProps {
  /**
   * Panel to generate image for
   */
  panel: Panel;

  /**
   * Optional CSS class name
   */
  className?: string;

  /**
   * Callback when generation completes
   */
  onGenerationComplete?: (panelId: string, imageUrl: string) => void;

  /**
   * Callback when generation fails
   */
  onGenerationError?: (panelId: string, error: string) => void;
}

/**
 * Generation state
 */
interface GenerationState {
  status: 'idle' | 'generating' | 'success' | 'error';
  progress: number;
  message: string;
  imageUrl?: string;
  error?: string;
}

// ============================================================================
// Component
// ============================================================================

export const PanelGenerationControls: React.FC<PanelGenerationControlsProps> = ({
  panel,
  className = '',
  onGenerationComplete,
  onGenerationError,
}) => {
  const [generationState, setGenerationState] = useState<GenerationState>({
    status: 'idle',
    progress: 0,
    message: '',
  });

  const updatePanelImage = useGridStore((state) => state.updatePanelImage);
  const pushOperation = useUndoRedoStore((state) => state.pushOperation);

  /**
   * Handle generate button click
   * Validates Requirements 11.1, 11.2, 11.3
   */
  const handleGenerate = async () => {
    // Set generating state
    setGenerationState({
      status: 'generating',
      progress: 0,
      message: 'Submitting generation request...',
    });

    try {
      // Build generation config
      const config: PanelGenerationConfig = {
        panelId: panel.id,
        prompt: `Generate image for panel ${panel.position.row}-${panel.position.col}`,
        seed: Math.floor(Math.random() * 1000000),
        transform: panel.transform,
        crop: panel.crop,
        styleReference: 'master-coherence-sheet', // Reference to Master Coherence Sheet
        width: 512,
        height: 512,
      };

      // Update progress
      setGenerationState({
        status: 'generating',
        progress: 25,
        message: 'Generating image...',
      });

      // Call API
      const response = await gridApi.generatePanelImage(config);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Generation failed');
      }

      // Update progress
      setGenerationState({
        status: 'generating',
        progress: 75,
        message: 'Processing result...',
      });

      // Store previous state for undo
      const previousImage = panel.layers[0]?.content;

      // Update panel with generated image
      // Validates Requirement 11.2
      updatePanelImage(panel.id, response.data.imageUrl, response.data.metadata);

      // Add to undo stack
      // Validates Requirement 11.7
      pushOperation({
        type: 'layer_modify',
        timestamp: Date.now(),
        description: `Generate panel image`,
        data: {
          panelId: panel.id,
          before: previousImage,
          after: {
            url: response.data.imageUrl,
            metadata: response.data.metadata,
          },
        },
      });

      // Set success state
      setGenerationState({
        status: 'success',
        progress: 100,
        message: 'Generation complete!',
        imageUrl: response.data.imageUrl,
      });

      // Call success callback
      onGenerationComplete?.(panel.id, response.data.imageUrl);

      // Reset to idle after delay
      setTimeout(() => {
        setGenerationState({
          status: 'idle',
          progress: 0,
          message: '',
        });
      }, 3000);
    } catch (error) {
      // Handle error
      // Validates Requirement 11.4
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setGenerationState({
        status: 'error',
        progress: 0,
        message: 'Generation failed',
        error: errorMessage,
      });

      // Call error callback
      onGenerationError?.(panel.id, errorMessage);

      // Reset to idle after delay
      setTimeout(() => {
        setGenerationState({
          status: 'idle',
          progress: 0,
          message: '',
        });
      }, 5000);
    }
  };

  /**
   * Dismiss error message
   */
  const handleDismissError = () => {
    setGenerationState({
      status: 'idle',
      progress: 0,
      message: '',
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Generate Button */}
      {generationState.status === 'idle' && (
        <button
          onClick={handleGenerate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Sparkles className="h-4 w-4" />
          Generate Image
        </button>
      )}

      {/* Loading State */}
      {generationState.status === 'generating' && (
        <div className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {generationState.message}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                {generationState.progress}% complete
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
              style={{ width: `${generationState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success State */}
      {generationState.status === 'success' && (
        <div className="w-full p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                {generationState.message}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                Image updated successfully
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {generationState.status === 'error' && (
        <div className="w-full p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                {generationState.message}
              </p>
              {generationState.error && (
                <p className="text-xs text-red-700 dark:text-red-300 mt-1 break-words">
                  {generationState.error}
                </p>
              )}
            </div>
            <button
              onClick={handleDismissError}
              className="flex-shrink-0 p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded transition-colors"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>
      )}

      {/* Panel Status Info */}
      {panel.metadata?.modified && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-900 dark:text-yellow-100 font-medium">
            Panel Modified
          </p>
          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            This panel has been edited since last generation. Generate again to update.
          </p>
        </div>
      )}
    </div>
  );
};

export default PanelGenerationControls;
