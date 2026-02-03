/**
 * Generation Button Toolbar Component
 * 
 * Container component that displays generation buttons in editor and dashboard contexts.
 * Manages button visibility, dialog state, and context-aware behavior.
 * 
 * Requirements: 5.1, 5.2
 */

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { PromptGenerationButton } from './PromptGenerationButton';
import { ImageGenerationButton } from './ImageGenerationButton';
import { VideoGenerationButton } from './VideoGenerationButton';
import { AudioGenerationButton } from './AudioGenerationButton';
import { useGenerationStore } from '../../stores/generationStore';
import type { Shot, Sequence } from '../../types';
import type { GeneratedAsset } from '../../types/generation';
import './GenerationButtonToolbar.css';

// Lazy load dialog components for better performance
const PromptGenerationDialog = lazy(() => import('./PromptGenerationDialog').then(m => ({ default: m.PromptGenerationDialog })));
const ImageGenerationDialog = lazy(() => import('./ImageGenerationDialog').then(m => ({ default: m.ImageGenerationDialog })));
const VideoGenerationDialog = lazy(() => import('./VideoGenerationDialog').then(m => ({ default: m.VideoGenerationDialog })));
const AudioGenerationDialog = lazy(() => import('./AudioGenerationDialog').then(m => ({ default: m.AudioGenerationDialog })));
const GenerationProgressModal = lazy(() => import('./GenerationProgressModal').then(m => ({ default: m.GenerationProgressModal })));

export interface GenerationButtonToolbarProps {
  /**
   * Context where toolbar is displayed
   */
  context: 'editor' | 'dashboard';
  
  /**
   * Current shot (editor context)
   */
  currentShot?: Shot;
  
  /**
   * Current sequence (editor context)
   */
  currentSequence?: Sequence;
  
  /**
   * Callback when generation completes
   */
  onGenerationComplete?: (asset: GeneratedAsset) => void;
  
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Generation Button Toolbar
 * 
 * Displays generation buttons in a toolbar layout.
 * Adapts to editor or dashboard context.
 * Manages dialog state and generation workflow.
 */
export const GenerationButtonToolbar: React.FC<GenerationButtonToolbarProps> = ({
  context,
  currentShot,
  currentSequence,
  onGenerationComplete,
  className = '',
}) => {
  const { currentPipeline } = useGenerationStore();
  
  // Dialog state management
  const [activeDialog, setActiveDialog] = useState<'prompt' | 'image' | 'video' | 'audio' | null>(null);
  
  // Determine if generation is in progress
  const isGenerating = currentPipeline?.stages.prompt?.status === 'in_progress' ||
                       currentPipeline?.stages.image?.status === 'in_progress' ||
                       currentPipeline?.stages.video?.status === 'in_progress' ||
                       currentPipeline?.stages.audio?.status === 'in_progress';
  
  // Button click handlers
  const handlePromptClick = useCallback(() => {
    setActiveDialog('prompt');
  }, []);
  
  const handleImageClick = useCallback(() => {
    setActiveDialog('image');
  }, []);
  
  const handleVideoClick = useCallback(() => {
    setActiveDialog('video');
  }, []);
  
  const handleAudioClick = useCallback(() => {
    setActiveDialog('audio');
  }, []);
  
  // Dialog close handlers
  const handleCloseDialog = useCallback(() => {
    setActiveDialog(null);
  }, []);
  
  // Generation complete handler
  const handleGenerationComplete = useCallback((asset: GeneratedAsset) => {
    if (onGenerationComplete) {
      onGenerationComplete(asset);
    }
  }, [onGenerationComplete]);
  
  // Determine toolbar layout based on context
  const toolbarClass = context === 'editor' 
    ? 'generation-toolbar-editor' 
    : 'generation-toolbar-dashboard';
  
  return (
    <>
      {/* Toolbar Container */}
      <div className={`generation-button-toolbar ${toolbarClass} ${className}`}>
        <div className="toolbar-buttons">
          <PromptGenerationButton
            onClick={handlePromptClick}
            isGenerating={currentPipeline?.stages.prompt?.status === 'in_progress'}
          />
          
          <ImageGenerationButton
            onClick={handleImageClick}
            isGenerating={currentPipeline?.stages.image?.status === 'in_progress'}
          />
          
          <VideoGenerationButton
            onClick={handleVideoClick}
            isGenerating={currentPipeline?.stages.video?.status === 'in_progress'}
          />
          
          <AudioGenerationButton
            onClick={handleAudioClick}
            isGenerating={currentPipeline?.stages.audio?.status === 'in_progress'}
          />
        </div>
      </div>
      
      {/* Dialogs - Lazy loaded with Suspense */}
      <Suspense fallback={<div className="dialog-loading">Loading...</div>}>
        {activeDialog === 'prompt' && (
          <PromptGenerationDialog
            isOpen={true}
            onClose={handleCloseDialog}
            onGenerate={(prompt) => {
              handleGenerationComplete({
                id: crypto.randomUUID(),
                type: 'prompt',
                url: '',
                metadata: {
                  generationParams: { text: prompt.text, categories: prompt.categories },
                  fileSize: 0,
                  format: 'text',
                },
                relatedAssets: [],
                timestamp: Date.now(),
              });
              handleCloseDialog();
            }}
          />
        )}
        
        {activeDialog === 'image' && (
          <ImageGenerationDialog
            isOpen={true}
            onClose={handleCloseDialog}
            initialPrompt={currentPipeline?.stages.prompt?.result?.text}
          />
        )}
        
        {activeDialog === 'video' && (
          <VideoGenerationDialog
            isOpen={true}
            onClose={handleCloseDialog}
            sourceImage={currentPipeline?.stages.image?.result}
          />
        )}
        
        {activeDialog === 'audio' && (
          <AudioGenerationDialog
            isOpen={true}
            onClose={handleCloseDialog}
          />
        )}
      </Suspense>
      
      {/* Progress Modal - Lazy loaded with Suspense */}
      {isGenerating && currentPipeline && (
        <Suspense fallback={<div className="modal-loading">Loading progress...</div>}>
          <GenerationProgressModal
            isOpen={isGenerating}
            generationType={
              currentPipeline.stages.prompt?.status === 'in_progress' ? 'prompt' :
              currentPipeline.stages.image?.status === 'in_progress' ? 'image' :
              currentPipeline.stages.video?.status === 'in_progress' ? 'video' :
              'audio'
            }
            progress={
              currentPipeline.stages.prompt?.progress ||
              currentPipeline.stages.image?.progress ||
              currentPipeline.stages.video?.progress ||
              currentPipeline.stages.audio?.progress ||
              {
                stage: 'Initializing',
                stageProgress: 0,
                overallProgress: 0,
                estimatedTimeRemaining: 0,
                message: 'Starting generation...',
                cancellable: false,
              }
            }
            onCancel={() => {
              // Cancel logic would go here
            }}
          />
        </Suspense>
      )}
    </>
  );
};
