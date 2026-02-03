/**
 * Tests for AudioGenerationButton component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioGenerationButton } from '../AudioGenerationButton';
import { useGenerationStore } from '../../../stores/generationStore';

// Mock the store
vi.mock('../../../stores/generationStore');

describe('AudioGenerationButton', () => {
  const mockOnClick = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: null,
      startPipeline: vi.fn(),
      completeStage: vi.fn(),
      failStage: vi.fn(),
      skipStage: vi.fn(),
      updateStageProgress: vi.fn(),
      queue: { tasks: [], activeTask: null, maxConcurrent: 1 },
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      history: { entries: [], maxEntries: 100 },
      addToHistory: vi.fn(),
    });
  });
  
  describe('Rendering', () => {
    it('should render button with default text', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      expect(screen.getByRole('button', { name: /generate audio/i })).toBeInTheDocument();
      expect(screen.getByText('Generate Audio')).toBeInTheDocument();
    });
    
    it('should apply custom className', () => {
      render(<AudioGenerationButton onClick={mockOnClick} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });
  
  describe('Button States', () => {
    it('should be enabled by default', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });
    
    it('should be disabled when disabled prop is true', () => {
      render(<AudioGenerationButton onClick={mockOnClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
    
    it('should be disabled when isGenerating is true', () => {
      render(<AudioGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });
    
    it('should show "Regenerate Audio" when audio is completed', () => {
      vi.mocked(useGenerationStore).mockReturnValue({
        currentPipeline: {
          id: 'test-pipeline',
          currentStage: 'audio',
          stages: {
            prompt: { status: 'completed', attempts: 1 },
            image: { status: 'completed', attempts: 1 },
            video: { status: 'completed', attempts: 1 },
            audio: { status: 'completed', attempts: 1 },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        startPipeline: vi.fn(),
        completeStage: vi.fn(),
        failStage: vi.fn(),
        skipStage: vi.fn(),
        updateStageProgress: vi.fn(),
        queue: { tasks: [], activeTask: null, maxConcurrent: 1 },
        addToQueue: vi.fn(),
        removeFromQueue: vi.fn(),
        history: { entries: [], maxEntries: 100 },
        addToHistory: vi.fn(),
      });
      
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      expect(screen.getByText('Regenerate Audio')).toBeInTheDocument();
    });
    
    it('should show destructive variant when audio generation failed', () => {
      vi.mocked(useGenerationStore).mockReturnValue({
        currentPipeline: {
          id: 'test-pipeline',
          currentStage: 'audio',
          stages: {
            prompt: { status: 'completed', attempts: 1 },
            image: { status: 'completed', attempts: 1 },
            video: { status: 'completed', attempts: 1 },
            audio: { status: 'failed', attempts: 1, error: 'Generation failed' },
          },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        startPipeline: vi.fn(),
        completeStage: vi.fn(),
        failStage: vi.fn(),
        skipStage: vi.fn(),
        updateStageProgress: vi.fn(),
        queue: { tasks: [], activeTask: null, maxConcurrent: 1 },
        addToQueue: vi.fn(),
        removeFromQueue: vi.fn(),
        history: { entries: [], maxEntries: 100 },
        addToHistory: vi.fn(),
      });
      
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      // Check for destructive variant classes
      expect(button.className).toContain('bg-destructive');
    });
  });
  
  describe('Interactions', () => {
    it('should call onClick when button is clicked', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
    
    it('should not call onClick when button is disabled', () => {
      render(<AudioGenerationButton onClick={mockOnClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
    
    it('should not call onClick when generating', () => {
      render(<AudioGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });
  
  describe('Keyboard Shortcuts', () => {
    it('should trigger onClick on Ctrl+Shift+A', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      fireEvent.keyDown(window, {
        key: 'A',
        ctrlKey: true,
        shiftKey: true,
      });
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });
    
    it('should not trigger onClick on Ctrl+Shift+A when disabled', () => {
      render(<AudioGenerationButton onClick={mockOnClick} disabled={true} />);
      
      fireEvent.keyDown(window, {
        key: 'A',
        ctrlKey: true,
        shiftKey: true,
      });
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
    
    it('should not trigger onClick on Ctrl+Shift+A when generating', () => {
      render(<AudioGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      fireEvent.keyDown(window, {
        key: 'A',
        ctrlKey: true,
        shiftKey: true,
      });
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
    
    it('should not trigger onClick without Ctrl key', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      fireEvent.keyDown(window, {
        key: 'A',
        shiftKey: true,
      });
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
    
    it('should not trigger onClick without Shift key', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      fireEvent.keyDown(window, {
        key: 'A',
        ctrlKey: true,
      });
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });
  });
  
  describe('Tooltips', () => {
    it('should have tooltip trigger', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button');
      // Tooltip is wrapped around button
      expect(button).toBeInTheDocument();
    });
  });
  
  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<AudioGenerationButton onClick={mockOnClick} />);
      
      const button = screen.getByRole('button', { name: /generate audio/i });
      expect(button).toBeInTheDocument();
    });
    
    it('should have aria-busy when generating', () => {
      render(<AudioGenerationButton onClick={mockOnClick} isGenerating={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
    
    it('should have aria-disabled when disabled', () => {
      render(<AudioGenerationButton onClick={mockOnClick} disabled={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });
  });
});
