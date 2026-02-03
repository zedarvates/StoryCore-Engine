/**
 * Video Generation Button Component
 * 
 * Button that triggers video generation dialog.
 * Supports pipeline state awareness, tooltips, and keyboard shortcuts.
 * 
 * Requirements: 3.1, 5.3, 5.4, 5.5, 13.3
 */

import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Video } from 'lucide-react';
import { useGenerationStore } from '../../stores/generationStore';

export interface VideoGenerationButtonProps {
  /**
   * Whether the button is disabled
   */
  disabled?: boolean;
  
  /**
   * Reason for disabled state (shown in tooltip)
   */
  disabledReason?: string;
  
  /**
   * Callback when button is clicked
   */
  onClick: () => void;
  
  /**
   * Whether generation is in progress
   */
  isGenerating?: boolean;
  
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Video Generation Button
 * 
 * Displays a button that opens the video generation dialog.
 * Shows appropriate state (enabled, disabled, generating) with visual indicators.
 * Supports keyboard shortcut (Ctrl+Shift+V).
 * Enabled only after image generation is complete.
 */
export const VideoGenerationButton: React.FC<VideoGenerationButtonProps> = ({
  disabled = false,
  disabledReason,
  onClick,
  isGenerating = false,
  className = '',
}) => {
  const { currentPipeline } = useGenerationStore();
  
  // Determine button state based on pipeline
  const imageStage = currentPipeline?.stages.image;
  const videoStage = currentPipeline?.stages.video;
  
  const isImageCompleted = imageStage?.status === 'completed';
  const isVideoCompleted = videoStage?.status === 'completed';
  const isVideoFailed = videoStage?.status === 'failed';
  const isVideoInProgress = videoStage?.status === 'in_progress' || isGenerating;
  
  // Button is enabled only if image is completed
  const isButtonDisabled = disabled || !isImageCompleted || isVideoInProgress;
  
  // Register keyboard shortcut (Ctrl+Shift+V)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        if (!isButtonDisabled) {
          onClick();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isButtonDisabled, onClick]);
  
  // Determine tooltip content
  const getTooltipContent = (): string => {
    if (disabledReason) {
      return disabledReason;
    }
    
    if (!isImageCompleted) {
      return 'Complete image generation first';
    }
    
    if (isVideoInProgress) {
      return 'Generating video...';
    }
    
    if (isVideoCompleted) {
      return 'Video generated. Click to regenerate. (Ctrl+Shift+V)';
    }
    
    if (isVideoFailed) {
      return 'Video generation failed. Click to retry. (Ctrl+Shift+V)';
    }
    
    return 'Generate video from image (Ctrl+Shift+V)';
  };
  
  // Determine button variant
  const getButtonVariant = (): 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' => {
    if (isVideoFailed) {
      return 'destructive';
    }
    
    if (isVideoCompleted) {
      return 'secondary';
    }
    
    return 'default';
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={isButtonDisabled}
            variant={getButtonVariant()}
            className={`gap-2 ${className}`}
            aria-label="Generate video"
            aria-busy={isVideoInProgress}
            aria-disabled={isButtonDisabled}
          >
            <Video className="h-4 w-4" />
            {isVideoInProgress ? 'Generating...' : isVideoCompleted ? 'Regenerate Video' : 'Generate Video'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
