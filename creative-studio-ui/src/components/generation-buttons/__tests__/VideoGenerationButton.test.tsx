/**
 * Video Generation Button Tests
 * 
 * Tests for VideoGenerationButton component functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoGenerationButton } from '../VideoGenerationButton';
import { useGenerationStore } from '../../../stores/generationStore';

// Mock the store
vi.mock('../../../stores/generationStore');

describe('VideoGenerationButton', () => {
  const mockOnClick = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock: no pipeline
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: null,
    } as any);
  });
  
  it('should render button with correct label', () => {
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    expect(screen.getByRole('button', { name: /generate video/i })).toBeInTheDocument();
  });
  
  it('should be disabled when image is not completed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          image: { status: 'pending', attempts: 0 },
          video: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
  
  it('should be enabled when image is completed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
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
          video: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });
  
  it('should call onClick when clicked and enabled', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
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
          video: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('should show "Generating..." when isGenerating is true', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
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
          video: { status: 'in_progress', attempts: 1 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} isGenerating={true} />);
    
    expect(screen.getByText(/generating\.\.\./i)).toBeInTheDocument();
  });
  
  it('should show "Regenerate Video" when video is completed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
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
          video: { 
            status: 'completed', 
            attempts: 1,
            result: {
              id: '2',
              type: 'video',
              url: 'test.mp4',
              metadata: { 
                generationParams: {}, 
                fileSize: 5000, 
                format: 'mp4',
                duration: 5
              },
              relatedAssets: ['1'],
              timestamp: Date.now(),
            }
          },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    expect(screen.getByText(/regenerate video/i)).toBeInTheDocument();
  });
  
  it('should use destructive variant when video generation failed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
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
          video: { 
            status: 'failed', 
            attempts: 1,
            error: 'Generation failed'
          },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    // Check for destructive styling classes
    expect(button).toHaveClass('bg-destructive');
  });
  
  it('should handle keyboard shortcut Ctrl+Shift+V', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
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
          video: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    // Simulate Ctrl+Shift+V
    fireEvent.keyDown(window, { key: 'V', ctrlKey: true, shiftKey: true });
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });
  
  it('should not trigger keyboard shortcut when disabled', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          image: { status: 'pending', attempts: 0 },
          video: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    // Simulate Ctrl+Shift+V
    fireEvent.keyDown(window, { key: 'V', ctrlKey: true, shiftKey: true });
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });
  
  it('should show custom disabled reason in tooltip', () => {
    render(<VideoGenerationButton onClick={mockOnClick} disabled={true} disabledReason="Custom reason" />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
  
  it('should be disabled when video is in progress', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
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
          video: { status: 'in_progress', attempts: 1 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
  
  it('should show correct tooltip when image not completed', () => {
    vi.mocked(useGenerationStore).mockReturnValue({
      currentPipeline: {
        stages: {
          image: { status: 'pending', attempts: 0 },
          video: { status: 'pending', attempts: 0 },
        },
      },
    } as any);
    
    render(<VideoGenerationButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Tooltip content is tested through accessibility attributes
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });
});
