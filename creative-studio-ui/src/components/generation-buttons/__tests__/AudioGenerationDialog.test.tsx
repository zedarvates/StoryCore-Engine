/**
 * Tests for AudioGenerationDialog component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioGenerationDialog } from '../AudioGenerationDialog';
import { useGenerationStore } from '../../../stores/generationStore';
import { generationOrchestrator } from '../../../services/GenerationOrchestrator';

// Mock the store
vi.mock('../../../stores/generationStore');

// Mock the orchestrator
vi.mock('../../../services/GenerationOrchestrator');

describe('AudioGenerationDialog', () => {
  const mockOnClose = vi.fn();
  const mockCompleteStage = vi.fn();
  const mockFailStage = vi.fn();
  const mockUpdateStageProgress = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: null,
      startPipeline: vi.fn(),
      completeStage: mockCompleteStage,
      failStage: mockFailStage,
      skipStage: vi.fn(),
      updateStageProgress: mockUpdateStageProgress,
      queue: { tasks: [], activeTask: null, maxConcurrent: 1 },
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      history: { entries: [], maxEntries: 100 },
      addToHistory: vi.fn(),
    });
    
    // Mock Audio constructor
    global.Audio = vi.fn().mockImplementation(() => ({
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as any;
  });
  
  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/configure parameters for audio/i)).toBeInTheDocument();
    });
    
    it('should not render dialog when closed', () => {
      render(<AudioGenerationDialog isOpen={false} onClose={mockOnClose} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    
    it('should render text input field', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByLabelText(/narration text/i)).toBeInTheDocument();
    });
    
    it('should render action buttons', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate audio/i })).toBeInTheDocument();
    });
  });
  
  describe('Form Interactions', () => {
    it('should update text field', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      expect(textArea).toHaveValue('Test narration');
    });
    
    it('should show character count', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test' } });
      
      expect(screen.getByText(/4 \/ 5000/)).toBeInTheDocument();
    });
    
    it('should disable generate button when text is empty', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const generateButton = screen.getByRole('button', { name: /generate audio/i });
      expect(generateButton).toBeDisabled();
    });
    
    it('should enable generate button when text is provided', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      const generateButton = screen.getByRole('button', { name: /generate audio/i });
      expect(generateButton).not.toBeDisabled();
    });
  });
  
  describe('Validation', () => {
    it('should validate text field', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      expect(textArea).toBeInTheDocument();
      
      // Text area should be empty initially
      expect(textArea).toHaveValue('');
    });
    
    it('should show character count warning for long text', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      const longText = 'a'.repeat(5001);
      fireEvent.change(textArea, { target: { value: longText } });
      
      // Character count should be shown in red
      const charCount = screen.getByText(/5001 \/ 5000/);
      expect(charCount).toHaveClass('text-destructive');
    });
  });
  
  describe('Preview Functionality', () => {
    it('should call generateAudio when preview is clicked', async () => {
      const mockGenerateAudio = vi.fn().mockResolvedValue({
        id: 'audio-1',
        type: 'audio',
        url: 'http://example.com/audio.mp3',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          duration: 5,
          format: 'mp3',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      });
      
      vi.mocked(generationOrchestrator).generateAudio = mockGenerateAudio;
      
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);
      
      await waitFor(() => {
        expect(mockGenerateAudio).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Test narration',
          }),
          expect.any(Function),
          expect.any(Function)
        );
      });
    });
    
    it('should show preview audio player after preview', async () => {
      const mockGenerateAudio = vi.fn().mockResolvedValue({
        id: 'audio-1',
        type: 'audio',
        url: 'http://example.com/audio.mp3',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          duration: 5,
          format: 'mp3',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      });
      
      vi.mocked(generationOrchestrator).generateAudio = mockGenerateAudio;
      
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      const previewButton = screen.getByRole('button', { name: /preview/i });
      fireEvent.click(previewButton);
      
      await waitFor(() => {
        const audioElement = document.querySelector('audio');
        expect(audioElement).toBeInTheDocument();
      });
    });
  });
  
  describe('Generation', () => {
    it('should call generateAudio when generate is clicked', async () => {
      const mockGenerateAudio = vi.fn().mockResolvedValue({
        id: 'audio-1',
        type: 'audio',
        url: 'http://example.com/audio.mp3',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          duration: 5,
          format: 'mp3',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      });
      
      vi.mocked(generationOrchestrator).generateAudio = mockGenerateAudio;
      
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      const generateButton = screen.getByRole('button', { name: /generate audio/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockGenerateAudio).toHaveBeenCalledWith(
          expect.objectContaining({
            text: 'Test narration',
            voiceType: 'neutral',
            speed: 1.0,
            pitch: 0,
            language: 'en-US',
            emotion: 'neutral',
          }),
          expect.any(Function),
          expect.any(Function)
        );
      });
    });
    
    it('should complete stage and close dialog on successful generation', async () => {
      const mockResult = {
        id: 'audio-1',
        type: 'audio' as const,
        url: 'http://example.com/audio.mp3',
        metadata: {
          generationParams: {},
          fileSize: 1024,
          duration: 5,
          format: 'mp3',
        },
        relatedAssets: [],
        timestamp: Date.now(),
      };
      
      const mockGenerateAudio = vi.fn().mockResolvedValue(mockResult);
      vi.mocked(generationOrchestrator).generateAudio = mockGenerateAudio;
      
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      const generateButton = screen.getByRole('button', { name: /generate audio/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(mockCompleteStage).toHaveBeenCalledWith('audio', mockResult);
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
    
    it('should show error on generation failure', async () => {
      const mockGenerateAudio = vi.fn().mockRejectedValue(new Error('Generation failed'));
      vi.mocked(generationOrchestrator).generateAudio = mockGenerateAudio;
      
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      const generateButton = screen.getByRole('button', { name: /generate audio/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });
    });
  });
  
  describe('Dialog Controls', () => {
    it('should call onClose when cancel is clicked', () => {
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnClose).toHaveBeenCalled();
    });
    
    it('should not close dialog when generating', async () => {
      const mockGenerateAudio = vi.fn().mockImplementation(() => new Promise(() => {}));
      vi.mocked(generationOrchestrator).generateAudio = mockGenerateAudio;
      
      render(<AudioGenerationDialog isOpen={true} onClose={mockOnClose} />);
      
      const textArea = screen.getByLabelText(/narration text/i);
      fireEvent.change(textArea, { target: { value: 'Test narration' } });
      
      const generateButton = screen.getByRole('button', { name: /generate audio/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(screen.getByText(/generating/i)).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });
});
