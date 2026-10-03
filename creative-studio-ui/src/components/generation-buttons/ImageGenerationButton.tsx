/**
 * Image Generation Button Component
 * 
 * Button that triggers image generation dialog.
 * Supports pipeline state awareness, tooltips, and keyboard shortcuts.
 * 
 * Requirements: 2.1, 5.3, 5.4, 5.5, 13.2
 */

import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Image } from 'lucide-react';
import { useGenerationStore } from '../../stores/generationStore';
import {
  useKeyboardShortcut,
  useButtonStateAnnouncer,
  getButtonAriaDescription,
} from '../../hooks/useAccessibility';

export interface ImageGenerationButtonProps {
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
 * Image Generation Button
 * 
 * Displays a button that opens the image generation dialog.
 * Shows appropriate state (enabled, disabled, generating) with visual indicators.
 * Supports keyboard shortcut (Ctrl+Shift+I).
 * Enabled only after prompt generation is complete.
 */
export const ImageGenerationButton: React.FC<ImageGenerationButtonProps> = ({
  disabled = false,
  disabledReason,
  onClick,
  isGenerating = false,
  className = '',
}) => {
  const { currentPipeline } = useGenerationStore();
  
  // Determine button state based on pipeline
  const promptStage = currentPipeline?.stages.prompt;
  const imageStage = currentPipeline?.stages.image;
  
  const isPromptCompleted = promptStage?.status === 'completed';
  const isImageCompleted = imageStage?.status === 'completed';
  const isImageFailed = imageStage?.status === 'failed';
  const isImageInProgress = imageStage?.status === 'in_progress' || isGenerating;
  
  // Button is enabled only if prompt is completed
  const isButtonDisabled = disabled || !isPromptCompleted || isImageInProgress;
  
  // Register keyboard shortcut with accessibility
  const shortcutString = useKeyboardShortcut(
    'I',
    onClick,
    {
      ctrl: true,
      shift: true,
      enabled: !isButtonDisabled,
    }
  );
  
  // Announce button state changes
  useButtonStateAnnouncer(
    'Image generation button',
    isButtonDisabled,
    disabledReason || (!isPromptCompleted ? 'Complete prompt generation first' : undefined)
  );
  
  // Determine tooltip content
  const getTooltipContent = (): string => {
    if (disabledReason) {
      return disabledReason;
    }
    
    if (!isPromptCompleted) {
      return 'Complete prompt generation first';
    }
    
    if (isImageInProgress) {
      return 'Generating image...';
    }
    
    if (isImageCompleted) {
      return `Image generated. Click to regenerate. (${shortcutString})`;
    }
    
    if (isImageFailed) {
      return `Image generation failed. Click to retry. (${shortcutString})`;
    }
    
    return `Generate image from prompt (${shortcutString})`;
  };
  
  // Get ARIA description
  const ariaDescription = getButtonAriaDescription(
    'image',
    isButtonDisabled,
    isImageInProgress,
    isImageCompleted,
    isImageFailed,
    disabledReason || (!isPromptCompleted ? 'Complete prompt generation first' : undefined)
  );
  
  // Determine button variant
  const getButtonVariant = (): 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' => {
    if (isImageFailed) {
      return 'destructive';
    }
    
    if (isImageCompleted) {
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
            aria-label="Generate image"
            aria-description={ariaDescription}
            aria-busy={isImageInProgress}
            aria-disabled={isButtonDisabled}
            aria-keyshortcuts={shortcutString}
          >
            <Image className="h-4 w-4" aria-hidden="true" />
            {isImageInProgress ? 'Generating...' : isImageCompleted ? 'Regenerate Image' : 'Generate Image'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
