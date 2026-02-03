/**
 * Prompt Generation Components Example
 * 
 * Demonstrates how to use PromptGenerationButton and PromptGenerationDialog together.
 */

import React, { useState } from 'react';
import { PromptGenerationButton } from './PromptGenerationButton';
import { PromptGenerationDialog } from './PromptGenerationDialog';
import type { GeneratedPrompt } from '../../types/generation';

/**
 * Example: Basic Prompt Generation Workflow
 * 
 * Shows the complete workflow from button click to prompt generation.
 */
export const BasicPromptGenerationExample: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  
  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };
  
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };
  
  const handlePromptGenerated = (prompt: GeneratedPrompt) => {
    setGeneratedPrompt(prompt);
    console.log('Prompt generated:', prompt);
    // Here you would typically proceed to image generation
  };
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Prompt Generation Example</h2>
      
      <div className="flex gap-2">
        <PromptGenerationButton onClick={handleOpenDialog} />
      </div>
      
      {generatedPrompt && (
        <div className="p-4 border rounded-md bg-muted">
          <h3 className="font-semibold mb-2">Generated Prompt:</h3>
          <p className="text-sm">{generatedPrompt.text}</p>
          <div className="mt-2 text-xs text-muted-foreground">
            <p>Genre: {generatedPrompt.categories.genre}</p>
            <p>Shot Type: {generatedPrompt.categories.shotType}</p>
            <p>Lighting: {generatedPrompt.categories.lighting}</p>
          </div>
        </div>
      )}
      
      <PromptGenerationDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onGenerate={handlePromptGenerated}
      />
    </div>
  );
};

/**
 * Example: Prompt Generation with Initial Categories
 * 
 * Shows how to pre-populate the dialog with specific categories.
 */
export const PromptGenerationWithInitialCategoriesExample: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const initialCategories = {
    genre: 'sci-fi',
    shotType: 'close-up',
    lighting: 'neon',
    mood: 'tense',
  };
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Prompt Generation with Initial Categories</h2>
      
      <PromptGenerationButton onClick={() => setIsDialogOpen(true)} />
      
      <PromptGenerationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onGenerate={(prompt) => console.log('Generated:', prompt)}
        initialCategories={initialCategories}
      />
    </div>
  );
};

/**
 * Example: Disabled Button with Reason
 * 
 * Shows how to disable the button with a custom reason.
 */
export const DisabledPromptGenerationExample: React.FC = () => {
  const [serviceAvailable, setServiceAvailable] = useState(false);
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Disabled Prompt Generation</h2>
      
      <div className="flex items-center gap-4">
        <PromptGenerationButton
          onClick={() => console.log('Generate prompt')}
          disabled={!serviceAvailable}
          disabledReason={!serviceAvailable ? 'Prompt service is not configured' : undefined}
        />
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={serviceAvailable}
            onChange={(e) => setServiceAvailable(e.target.checked)}
          />
          Service Available
        </label>
      </div>
    </div>
  );
};

/**
 * Example: Complete Pipeline Integration
 * 
 * Shows how prompt generation fits into the complete generation pipeline.
 */
export const CompletePipelineExample: React.FC = () => {
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<GeneratedPrompt | null>(null);
  const [pipelineStage, setPipelineStage] = useState<'prompt' | 'image' | 'video' | 'audio'>('prompt');
  
  const handlePromptGenerated = (prompt: GeneratedPrompt) => {
    setCurrentPrompt(prompt);
    setPipelineStage('image');
    console.log('Proceeding to image generation with prompt:', prompt.text);
  };
  
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Complete Pipeline Example</h2>
      
      <div className="flex gap-2">
        <PromptGenerationButton
          onClick={() => setIsPromptDialogOpen(true)}
          isGenerating={false}
        />
        
        <button
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md"
          disabled={!currentPrompt}
        >
          Generate Image
        </button>
        
        <button
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md"
          disabled={pipelineStage !== 'video'}
        >
          Generate Video
        </button>
        
        <button
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md"
          disabled={pipelineStage !== 'audio'}
        >
          Generate Audio
        </button>
      </div>
      
      <div className="p-4 border rounded-md">
        <p className="text-sm text-muted-foreground">
          Current Stage: <span className="font-semibold">{pipelineStage}</span>
        </p>
        {currentPrompt && (
          <p className="text-sm mt-2">
            Prompt: {currentPrompt.text}
          </p>
        )}
      </div>
      
      <PromptGenerationDialog
        isOpen={isPromptDialogOpen}
        onClose={() => setIsPromptDialogOpen(false)}
        onGenerate={handlePromptGenerated}
      />
    </div>
  );
};
