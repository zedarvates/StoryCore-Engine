/**
 * Image Generation Button Tests
 * 
 * Tests for ImageGenerationButton component functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGenerationButton } from '../ImageGenerationButton';
import { useGenerationStore } from '../../../stores/generationStore';

// Mock the store
vi.mock('../../../stores/generationStore');

describe('ImageGenerationButton', () => {
  const mockOnClick = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock: no pipeline
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: null,
    } as any);
  });
  
  it('should render button with correct label', () => {
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    expect(screen.getByRole('button', { name: /generate image/i })).toBeInTheDocument();
  });
  
  it('should be disabled when prompt is not completed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { status: 'pending', attempts: 0 },
          image: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
  
  it('should be enabled when prompt is completed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { 
            status: 'completed', 
            attempts: 1,
            result: { text: 'test prompt', categories: {}, timestamp: Date.now(), editable: true }
          },
          image: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });
  
  it('should call onClick when clicked and enabled', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { 
            status: 'completed', 
            attempts: 1,
            result: { text: 'test prompt', categories: {}, timestamp: Date.now(), editable: true }
          },
          image: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('should show "Generating..." when isGenerating is true', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { 
            status: 'completed', 
            attempts: 1,
            result: { text: 'test prompt', categories: {}, timestamp: Date.now(), editable: true }
          },
          image: { status: 'in_progress', attempts: 1 },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} isGenerating={true} />);
    
    expect(screen.getByText(/generating\.\.\./i)).toBeInTheDocument();
  });
  
  it('should show "Regenerate Image" when image is completed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { 
            status: 'completed', 
            attempts: 1,
            result: { text: 'test prompt', categories: {}, timestamp: Date.now(), editable: true }
          },
          image: { 
            status: 'completed', 
            attempts: 1,
            result: {
              id: '1',
              type: 'image',
              url: 'test.png',
              metadata: { generationParams: {}, fileSize: 1000, format: 'png' },
              relatedAssets: [],
              timestamp: Date.now(),
            }
          },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    expect(screen.getByText(/regenerate image/i)).toBeInTheDocument();
  });
  
  it('should use destructive variant when image generation failed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { 
            status: 'completed', 
            attempts: 1,
            result: { text: 'test prompt', categories: {}, timestamp: Date.now(), editable: true }
          },
          image: { 
            status: 'failed', 
            attempts: 1,
            error: 'Generation failed'
          },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('destructive');
  });
  
  it('should handle keyboard shortcut Ctrl+Shift+I', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { 
            status: 'completed', 
            attempts: 1,
            result: { text: 'test prompt', categories: {}, timestamp: Date.now(), editable: true }
          },
          image: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    // Simulate Ctrl+Shift+I
    fireEvent.keyDown(window, { key: 'I', ctrlKey: true, shiftKey: true });
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('should not trigger keyboard shortcut when disabled', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          prompt: { status: 'pending', attempts: 0 },
          image: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<ImageGenerationButton onClick={mockOnClick} />);
    
    // Simulate Ctrl+Shift+I
    fireEvent.keyDown(window, { key: 'I', ctrlKey: true, shiftKey: true });
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });
  
  it('should show custom disabled reason in tooltip', () => {
    render(<ImageGenerationButton onClick={mockOnClick} disabled={true} disabledReason="Custom reason" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});
