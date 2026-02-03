/**
 * Image Generation Dialog Tests
 * 
 * Tests for ImageGenerationDialog component functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageGenerationDialog } from '../ImageGenerationDialog';
import { useGenerationStore } from '../../../stores/generationStore';
import { generationOrchestrator } from '../../../services/GenerationOrchestrator';

// Mock the store
vi.mock('../../../stores/generationStore');

// Mock the orchestrator
vi.mock('../../../services/GenerationOrchestrator', () => ({
  generationOrchestrator: {
    generateImage: vi.fn(),
  },
}));

describe('ImageGenerationDialog', () => {
  const mockOnClose = vi.fn();
  const mockCompleteStage = vi.fn();
  const mockFailStage = vi.fn();
  const mockUpdateStageProgress = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock store
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: {
            status: 'completed',
            attempts: 1,
            result: {
              text: 'A beautiful landscape',
              categories: {},
              timestamp: Date.now(),
              editable: true,
            },
          },
        },
      },
      completeStage: mockCompleteStage,
      failStage: mockFailStage,
      updateStageProgress: mockUpdateStageProgress,
    } as any);
  });
  
  it('should render dialog when open', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText(/generate image/i)).toBeInTheDocument();
  });
  
  it('should not render dialog when closed', () => {
    render(<ImageGenerationDialog isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText(/generate image/i)).not.toBeInTheDocument();
  });
  
  it('should pre-fill prompt from pipeline', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const promptTextarea = screen.getByLabelText(/^prompt/i) as HTMLTextAreaElement;
    expect(promptTextarea.value).toBe('A beautiful landscape');
  });
  
  it('should use initialPrompt if provided', () => {
    render(
      <ImageGenerationDialog
        isOpen={true}
        onClose={mockOnClose}
        initialPrompt="Custom prompt"
      />
    );
    
    const promptTextarea = screen.getByLabelText(/^prompt/i) as HTMLTextAreaElement;
    expect(promptTextarea.value).toBe('Custom prompt');
  });
  
  it('should allow editing prompt', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const promptTextarea = screen.getByLabelText(/^prompt/i);
    fireEvent.change(promptTextarea, { target: { value: 'New prompt' } });
    
    expect((promptTextarea as HTMLTextAreaElement).value).toBe('New prompt');
  });
  
  it('should allow editing negative prompt', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const negativePromptTextarea = screen.getByLabelText(/negative prompt/i);
    fireEvent.change(negativePromptTextarea, { target: { value: 'bad quality' } });
    
    expect((negativePromptTextarea as HTMLTextAreaElement).value).toBe('bad quality');
  });
  
  it('should allow changing dimensions', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const widthInput = screen.getByLabelText(/width/i);
    fireEvent.change(widthInput, { target: { value: '512' } });
    
    expect((widthInput as HTMLInputElement).value).toBe('512');
  });
  
  it('should apply preset dimensions', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const portraitButton = screen.getByText(/portrait \(768x1024\)/i);
    fireEvent.click(portraitButton);
    
    const widthInput = screen.getByLabelText(/width/i) as HTMLInputElement;
    const heightInput = screen.getByLabelText(/height/i) as HTMLInputElement;
    
    expect(widthInput.value).toBe('768');
    expect(heightInput.value).toBe('1024');
  });
  
  it('should validate empty prompt', async () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const promptTextarea = screen.getByLabelText(/^prompt/i);
    fireEvent.change(promptTextarea, { target: { value: '' } });
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/prompt is required/i)).toBeInTheDocument();
    });
  });
  
  it('should validate width range', async () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const widthInput = screen.getByLabelText(/width/i);
    fireEvent.change(widthInput, { target: { value: '100' } });
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/width must be between 256 and 2048/i)).toBeInTheDocument();
    });
  });
  
  it('should validate width divisibility by 8', async () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const widthInput = screen.getByLabelText(/width/i);
    fireEvent.change(widthInput, { target: { value: '513' } });
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/width must be divisible by 8/i)).toBeInTheDocument();
    });
  });
  
  it('should call generateImage on valid submission', async () => {
    const mockResult = {
      id: '1',
      type: 'image' as const,
      url: 'test.png',
      metadata: {
        generationParams: {},
        fileSize: 1000,
        format: 'png',
      },
      relatedAssets: [],
      timestamp: Date.now(),
    };
    
    vi.mocked(generationOrchestrator.generateImage).mockResolvedValue(mockResult);
    
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(generationOrchestrator.generateImage).toHaveBeenCalled();
    });
  });
  
  it('should complete stage on successful generation', async () => {
    const mockResult = {
      id: '1',
      type: 'image' as const,
      url: 'test.png',
      metadata: {
        generationParams: {},
        fileSize: 1000,
        format: 'png',
      },
      relatedAssets: [],
      timestamp: Date.now(),
    };
    
    vi.mocked(generationOrchestrator.generateImage).mockResolvedValue(mockResult);
    
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockCompleteStage).toHaveBeenCalledWith('image', mockResult);
    });
  });
  
  it('should close dialog on successful generation', async () => {
    const mockResult = {
      id: '1',
      type: 'image' as const,
      url: 'test.png',
      metadata: {
        generationParams: {},
        fileSize: 1000,
        format: 'png',
      },
      relatedAssets: [],
      timestamp: Date.now(),
    };
    
    vi.mocked(generationOrchestrator.generateImage).mockResolvedValue(mockResult);
    
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
  
  it('should display error on generation failure', async () => {
    vi.mocked(generationOrchestrator.generateImage).mockRejectedValue(
      new Error('Generation failed')
    );
    
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
    });
  });
  
  it('should allow closing dialog with cancel button', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });
  
  it('should disable generate button when prompt is empty', () => {
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const promptTextarea = screen.getByLabelText(/^prompt/i);
    fireEvent.change(promptTextarea, { target: { value: '' } });
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    expect(generateButton).toBeDisabled();
  });
  
  it('should show generating state during generation', async () => {
    vi.mocked(generationOrchestrator.generateImage).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );
    
    render(<ImageGenerationDialog isOpen={true} onClose={mockOnClose} />);
    
    const generateButton = screen.getByRole('button', { name: /generate image/i });
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText(/generating\.\.\./i)).toBeInTheDocument();
    });
  });
});
