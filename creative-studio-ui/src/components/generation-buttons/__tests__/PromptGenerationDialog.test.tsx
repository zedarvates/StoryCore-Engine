/**
 * PromptGenerationDialog Component Tests
 * 
 * Unit tests for the PromptGenerationDialog component.
 * Tests category selection, prompt generation, editing, and integration with services.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptGenerationDialog } from '../PromptGenerationDialog';
import { generationOrchestrator } from '../../../services/GenerationOrchestrator';
import { useGenerationStore } from '../../../stores/generationStore';

// Mock dependencies
vi.mock('../../../services/GenerationOrchestrator', () => ({
  generationOrchestrator: {
    generatePrompt: vi.fn(),
  },
}));

vi.mock('../../../stores/generationStore', () => ({
  useGenerationStore: vi.fn(),
}));

describe('PromptGenerationDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnGenerate = vi.fn();
  const mockCompleteStage = vi.fn();
  const mockFailStage = vi.fn();
  const mockUpdateStageProgress = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock store
    (useGenerationStore as any).mockReturnValue({
      completeStage: mockCompleteStage,
      failStage: mockFailStage,
      updateStageProgress: mockUpdateStageProgress,
    });
    
    // Mock successful prompt generation
    (generationOrchestrator.generatePrompt as any).mockResolvedValue({
      text: 'A cinematic medium shot with natural lighting',
      categories: {
        genre: 'cinematic',
        shotType: 'medium-shot',
        lighting: 'natural',
      },
      timestamp: Date.now(),
      editable: true,
    });
  });
  
  describe('Basic Rendering', () => {
    it('should render when open', () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      expect(screen.getByText('Generate AI Prompt')).toBeInTheDocument();
    });
    
    it('should not render when closed', () => {
      render(
        <PromptGenerationDialog
          isOpen={false}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      expect(screen.queryByText('Generate AI Prompt')).not.toBeInTheDocument();
    });
    
    it('should render all category selectors', () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      expect(screen.getByLabelText('Genre')).toBeInTheDocument();
      expect(screen.getByLabelText('Shot Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Lighting')).toBeInTheDocument();
      expect(screen.getByLabelText('Mood')).toBeInTheDocument();
    });
    
    it('should render generate button initially', () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      expect(screen.getByRole('button', { name: /generate prompt/i })).toBeInTheDocument();
    });
  });
  
  describe('Category Selection', () => {
    it('should have default category values', () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Check default values are displayed
      expect(screen.getByText('Cinematic')).toBeInTheDocument();
      expect(screen.getByText('Medium Shot')).toBeInTheDocument();
      expect(screen.getByText('Natural')).toBeInTheDocument();
      expect(screen.getByText('Neutral')).toBeInTheDocument();
    });
    
    it('should use initial categories when provided', () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
          initialCategories={{
            genre: 'sci-fi',
            shotType: 'close-up',
            lighting: 'neon',
            mood: 'tense',
          }}
        />
      );
      
      expect(screen.getByText('Sci-Fi')).toBeInTheDocument();
      expect(screen.getByText('Close-Up')).toBeInTheDocument();
      expect(screen.getByText('Neon')).toBeInTheDocument();
      expect(screen.getByText('Tense')).toBeInTheDocument();
    });
  });
  
  describe('Prompt Generation', () => {
    it('should generate prompt when button is clicked', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(generationOrchestrator.generatePrompt).toHaveBeenCalledWith(
          expect.objectContaining({
            genre: 'cinematic',
            shotType: 'medium-shot',
            lighting: 'natural',
          }),
          expect.any(Function),
          expect.any(Function)
        );
      });
    });
    
    it('should display generated prompt in textarea', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Generated Prompt/i);
        expect(textarea).toHaveValue('A cinematic medium shot with natural lighting');
      });
    });
    
    it('should show loading state during generation', async () => {
      // Make generation take some time
      (generationOrchestrator.generatePrompt as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      expect(screen.getByText('Generating Prompt...')).toBeInTheDocument();
    });
    
    it('should handle generation errors', async () => {
      (generationOrchestrator.generatePrompt as any).mockRejectedValue(
        new Error('Generation failed')
      );
      
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText('Generation failed')).toBeInTheDocument();
      });
    });
    
    it('should call generationOrchestrator.generatePrompt', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(generationOrchestrator.generatePrompt).toHaveBeenCalled();
      });
    });
  });
  
  describe('Prompt Editing', () => {
    it('should allow editing generated prompt', async () => {
      const user = userEvent.setup();
      
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Generate prompt first
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Generated Prompt/i)).toBeInTheDocument();
      });
      
      // Edit the prompt
      const textarea = screen.getByLabelText(/Generated Prompt/i);
      await user.clear(textarea);
      await user.type(textarea, 'Edited prompt text');
      
      expect(textarea).toHaveValue('Edited prompt text');
    });
    
    it('should preserve edited prompt when using it', async () => {
      const user = userEvent.setup();
      
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Generate and edit prompt
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Generated Prompt/i)).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Generated Prompt/i);
      await user.clear(textarea);
      await user.type(textarea, 'Custom edited prompt');
      
      // Use the prompt
      const useButton = screen.getByRole('button', { name: /use prompt/i });
      fireEvent.click(useButton);
      
      expect(mockOnGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Custom edited prompt',
        })
      );
    });
  });
  
  describe('Use Prompt Action', () => {
    it('should call onGenerate with prompt data', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Generate prompt
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use prompt/i })).toBeInTheDocument();
      });
      
      // Use prompt
      const useButton = screen.getByRole('button', { name: /use prompt/i });
      fireEvent.click(useButton);
      
      expect(mockOnGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'A cinematic medium shot with natural lighting',
          editable: true,
        })
      );
    });
    
    it('should complete prompt stage when using prompt', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Generate and use prompt
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use prompt/i })).toBeInTheDocument();
      });
      
      const useButton = screen.getByRole('button', { name: /use prompt/i });
      fireEvent.click(useButton);
      
      expect(mockCompleteStage).toHaveBeenCalledWith('prompt', expect.any(Object));
    });
    
    it('should close dialog after using prompt', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Generate and use prompt
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /use prompt/i })).toBeInTheDocument();
      });
      
      const useButton = screen.getByRole('button', { name: /use prompt/i });
      fireEvent.click(useButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should not allow using empty prompt', async () => {
      const user = userEvent.setup();
      
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Generate prompt
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Generated Prompt/i)).toBeInTheDocument();
      });
      
      // Clear the prompt
      const textarea = screen.getByLabelText(/Generated Prompt/i);
      await user.clear(textarea);
      
      // Try to use empty prompt - button should be disabled
      const useButton = screen.getByRole('button', { name: /use prompt/i });
      expect(useButton).toBeDisabled();
      expect(mockOnGenerate).not.toHaveBeenCalled();
    });
  });
  
  describe('Regenerate Action', () => {
    it('should show regenerate button after generation', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
      });
    });
    
    it('should regenerate prompt when regenerate is clicked', async () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Initial generation
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument();
      });
      
      // Regenerate
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      fireEvent.click(regenerateButton);
      
      expect(generationOrchestrator.generatePrompt).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Dialog Controls', () => {
    it('should close dialog when cancel is clicked', () => {
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should not close dialog during generation', async () => {
      // Make generation take some time
      (generationOrchestrator.generatePrompt as any).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );
      
      render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
    
    it('should reset state when dialog reopens', async () => {
      const { rerender } = render(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Generate prompt
      const generateButton = screen.getByRole('button', { name: /generate prompt/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Generated Prompt/i)).toBeInTheDocument();
      });
      
      // Close dialog
      rerender(
        <PromptGenerationDialog
          isOpen={false}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Reopen dialog
      rerender(
        <PromptGenerationDialog
          isOpen={true}
          onClose={mockOnClose}
          onGenerate={mockOnGenerate}
        />
      );
      
      // Should not show generated prompt
      expect(screen.queryByLabelText(/Generated Prompt/i)).not.toBeInTheDocument();
    });
  });
});
