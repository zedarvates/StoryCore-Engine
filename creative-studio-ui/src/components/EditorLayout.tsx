import React from 'react';
import { cn } from '@/lib/utils';
import { GenerationButtonToolbar } from './generation-buttons/GenerationButtonToolbar';
import { useAppStore } from '@/stores/useAppStore';
import type { GeneratedAsset } from '@/types';

interface EditorLayoutProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Whether to show the generation toolbar
   * @default true
   */
  showGenerationToolbar?: boolean;
  /**
   * Callback when generation completes
   */
  onGenerationComplete?: (asset: GeneratedAsset) => void;
}

export function EditorLayout({ 
  children, 
  className,
  showGenerationToolbar = true,
  onGenerationComplete
}: EditorLayoutProps) {
  const { currentShot, currentSequence } = useAppStore();
  
  return (
    <div className={cn("flex flex-col h-screen bg-background text-foreground", className)}>
      {/* Generation Toolbar */}
      {showGenerationToolbar && (
        <div className="border-b border-border bg-card">
          <GenerationButtonToolbar
            context="editor"
            currentShot={currentShot}
            currentSequence={currentSequence}
            onGenerationComplete={onGenerationComplete}
          />
        </div>
      )}
      
      {/* Main Editor Content */}
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
