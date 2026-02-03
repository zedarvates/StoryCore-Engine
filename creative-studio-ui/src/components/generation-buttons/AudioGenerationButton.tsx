/**
 * Audio Generation Button Component
 * 
 * Button that triggers audio generation dialog.
 * Supports pipeline state awareness, tooltips, and keyboard shortcuts.
 * 
 * Requirements: 4.1, 5.3, 5.4, 5.5, 13.4
 */

import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Volume2 } from 'lucide-react';
import { useGenerationStore } from '../../stores/generationStore';

export interface AudioGenerationButtonProps {
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
 * Audio Generation Button
 * 
 * Displays a button that opens the audio generation dialog.
 * Shows appropriate state (enabled, disabled, generating) with visual indicators.
 * Supports keyboard shortcut (Ctrl+Shift+A).
 * Can be enabled after video generation or independently.
 */
export const AudioGenerationButton: React.FC<AudioGenerationButtonProps> = ({
  disabled = false,
  disabledReason,
  onClick,
  isGenerating = false,
  className = '',
}) => {
  const { currentPipeline } = useGenerationStore();
  
  // Determine button state based on pipeline
  const audioStage = currentPipeline?.stages.audio;
  
  const isAudioCompleted = audioStage?.status === 'completed';
  const isAudioFailed = audioStage?.status === 'failed';
  const isAudioInProgress = audioStage?.status === 'in_progress' || isGenerating;
  
  // Button is always enabled (audio can be generated independently)
  const isButtonDisabled = disabled || isAudioInProgress;
  
  // Register keyboard shortcut (Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
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
    
    if (isAudioInProgress) {
      return 'Generating audio...';
    }
    
    if (isAudioCompleted) {
      return 'Audio generated. Click to regenerate. (Ctrl+Shift+A)';
    }
    
    if (isAudioFailed) {
      return 'Audio generation failed. Click to retry. (Ctrl+Shift+A)';
    }
    
    return 'Generate audio and voiceover (Ctrl+Shift+A)';
  };
  
  // Determine button variant
  const getButtonVariant = (): 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' => {
    if (isAudioFailed) {
      return 'destructive';
    }
    
    if (isAudioCompleted) {
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
            aria-label="Generate audio"
            aria-busy={isAudioInProgress}
            aria-disabled={isButtonDisabled}
          >
            <Volume2 className="h-4 w-4" />
            {isAudioInProgress ? 'Generating...' : isAudioCompleted ? 'Regenerate Audio' : 'Generate Audio'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
