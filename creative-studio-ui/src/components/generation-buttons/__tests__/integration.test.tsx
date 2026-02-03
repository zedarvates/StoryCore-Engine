/**
 * Integration Tests for Generation Buttons UI
 * 
 * Tests the complete integration of generation buttons, dialogs, and modals.
 * Validates that all components are properly wired together.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GenerationButtonToolbar } from '../GenerationButtonToolbar';
import { useGenerationStore } from '../../../stores/generationStore';

// Mock the generation store
vi.mock('../../../stores/generationStore', () => ({
  useGenerationStore: vi.fn(),
}));

// Mock the generation orchestrator
vi.mock('../../../services/GenerationOrchestrator', () => ({
  generationOrchestrator: {
    generatePrompt: vi.fn(),
    generateImage: vi.fn(),
    generateVideo: vi.fn(),
    generateAudio: vi.fn(),
  },
}));

describe('Generation Buttons Integration', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default store state
    (useGenerationStore as any).mockReturnValue({
      currentPipeline: null,
      completeStage: vi.fn(),
      failStage: vi.fn(),
      updateStageProgress: vi.fn(),
    });
  });
  
  describe('Toolbar Integration', () => {
    it('should render all generation buttons in editor context', () => {
      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button', { name: /prompt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /image/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /video/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /audio/i })).toBeInTheDocument();
    });
    
    it('should render all generation buttons in dashboard context', () => {
      render(
        <GenerationButtonToolbar
          context="dashboard"
          onGenerationComplete={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button', { name: /prompt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /image/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /video/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /audio/i })).toBeInTheDocument();
    });
  });
  
  describe('Dialog Integration', () => {
    it('should open prompt dialog when prompt button is clicked', async () => {
      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={vi.fn()}
        />
      );
      
      const promptButton = screen.getByRole('button', { name: /prompt/i });
      fireEvent.click(promptButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
    
    it('should open image dialog when image button is clicked', async () => {
      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={vi.fn()}
        />
      );
      
      const imageButton = screen.getByRole('button', { name: /image/i });
      fireEvent.click(imageButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
    
    it('should open video dialog when video button is clicked', async () => {
      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={vi.fn()}
        />
      );
      
      const videoButton = screen.getByRole('button', { name: /video/i });
      fireEvent.click(videoButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
    
    it('should open audio dialog when audio button is clicked', async () => {
      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={vi.fn()}
        />
      );
      
      const audioButton = screen.getByRole('button', { name: /audio/i });
      fireEvent.click(audioButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });
  
  describe('Progress Modal Integration', () => {
    it('should show progress modal when generation is in progress', () => {
      (useGenerationStore as any).mockReturnValue({
        currentPipeline: {
          stages: {
            image: {
              status: 'in_progress',
              progress: {
                stage: 'Generating',
                stageProgress: 50,
                overallProgress: 50,
                estimatedTimeRemaining: 30,
                message: 'Generating image...',
                cancellable: true,
              },
            },
          },
        },
        completeStage: vi.fn(),
        failStage: vi.fn(),
        updateStageProgress: vi.fn(),
      });
      
      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={vi.fn()}
        />
      );
      
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });
  });
  
  describe('Generation Complete Callback', () => {
    it('should call onGenerationComplete when prompt generation completes', async () => {
      const onGenerationComplete = vi.fn();
      
      render(
        <GenerationButtonToolbar
          context="editor"
          onGenerationComplete={onGenerationComplete}
        />
      );
      
      const promptButton = screen.getByRole('button', { name: /prompt/i });
      fireEvent.click(promptButton);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Simulate prompt generation
      const generateButton = screen.getByRole('button', { name: /generate/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(onGenerationComplete).toHaveBeenCalled();
      });
    });
  });
});
