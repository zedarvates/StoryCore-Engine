/**
 * Director Mode Button Component
 * 
 * Button that triggers the Director Mode (Nano Banana 2) panel.
 */

import React from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Layout } from 'lucide-react';

export interface DirectorModeButtonProps {
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

export const DirectorModeButton: React.FC<DirectorModeButtonProps> = ({
  disabled = false,
  onClick,
  className = '',
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onClick}
            disabled={disabled}
            variant="outline"
            className={`gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10 ${className}`}
          >
            <Layout className="h-4 w-4" />
            Mode Directeur
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Nano Banana 2: Factual Grounding & Scene consistency</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
