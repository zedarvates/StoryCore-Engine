/**
 * Prompt Generation Button Component
 * 
 * Button that triggers prompt generation dialog.
 * Supports enabled/disabled states, tooltips, and keyboard shortcuts.
 * 
 * Requirements: 1.1, 5.3, 5.4, 5.5, 13.1
 */

import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { FileText } from 'lucide-react';
import { useGenerationStore } from '../../stores/generationStore';
import {
  useKeyboardShortcut,
  useButtonStateAnnouncer,
  getButtonAriaDescription,
} from '../../hooks/useAccessibility';

export interface PromptGenerationButtonProps {
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
 * Prompt Generation Button
 * 
 * Displays a button that opens the prompt generation dialog.
 * Shows appropriate state (enabled, disabled, generating) with visual indicators.
 * Supports keyboard shortcut (Ctrl+Shift+P).
 */
export const PromptGenerationButton: React.FC<PromptGenerationButtonProps> = ({
  disabled = false,
  disabledReason,
  onClick,
  isGenerating = false,
  className = '',
}) => {
  const { currentPipeline } = useGenerationStore();
  
  // Determine button state based on pipeline
  const promptStage = currentPipeline?.stages.prompt;
  const isCompleted = promptStage?.status === 'completed';
  const isFailed = promptStage?.status === 'failed';
  const isInProgress = promptStage?.status === 'in_progress' || isGenerating;
  
  const isButtonDisabled = disabled || isInProgress;
  
  // Register keyboard shortcut with accessibility
  const shortcutString = useKeyboardShortcut(
    'P',
    onClick,
    {
      ctrl: true,
      shift: true,
      enabled: !isButtonDisabled,
    }
  );
  
  // Announce button state changes
  useButtonStateAnnouncer(
    'Prompt generation button',
    isButtonDisabled,
    disabledReason
  );
  
  // Determine tooltip content
  const getTooltipContent = (): string => {
    if (disabledReason) {
      return disabledReason;
    }
    
    if (isInProgress) {
      return 'Generating prompt...';
    }
    
    if (isCompleted) {
      return `Prompt generated. Click to regenerate. (${shortcutString})`;
    }
    
    if (isFailed) {
      return `Prompt generation failed. Click to retry. (${shortcutString})`;
    }
    
    return `Generate AI prompt from categories (${shortcutString})`;
  };
  
  // Get ARIA description
  const ariaDescription = getButtonAriaDescription(
    'prompt',
    isButtonDisabled,
    isInProgress,
    isCompleted,
    isFailed,
    disabledReason
  );
  
  // Determine button variant
  const getButtonVariant = (): 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' => {
    if (isFailed) {
      return 'destructive';
    }
    
    if (isCompleted) {
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
            aria-label="Generate prompt"
            aria-description={ariaDescription}
            aria-busy={isInProgress}
            aria-disabled={isButtonDisabled}
            aria-keyshortcuts={shortcutString}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            {isInProgress ? 'Generating...' : isCompleted ? 'Regenerate Prompt' : 'Generate Prompt'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
