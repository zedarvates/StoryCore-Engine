/**
 * Image Preview Panel Tests
 * 
 * Tests for ImagePreviewPanel component functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImagePreviewPanel } from '../ImagePreviewPanel';
import type { GeneratedAsset } from '../../../types/generation';

describe('ImagePreviewPanel', () => {
  const mockAsset: GeneratedAsset = {
    id: 'test-image-1',
    type: 'image',
    url: 'data:image/png;base64,test',
    metadata: {
      generationParams: {
        prompt: 'A beautiful landscape',
        negativePrompt: 'blurry',
        steps: 20,
        cfgScale: 7.5,
        sampler: 'euler_ancestral',
        scheduler: 'normal',
        seed: 12345,
      },
      fileSize: 1024000, // 1 MB
      dimensions: { width: 1024, height: 1024 },
      format: 'png',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  };
  
  const mockOnSave = vi.fn();
  const mockOnRegenerate = vi.fn();
  const mockOnGenerateVideo = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render image preview', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.getByText(/generated image/i)).toBeInTheDocument();
    expect(screen.getByAltText(/generated image/i)).toBeInTheDocument();
  });
  
  it('should display image dimensions', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.getByText(/1024 × 1024/i)).toBeInTheDocument();
  });
  
  it('should display file size', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.getByText(/1 MB/i)).toBeInTheDocument();
  });
  
  it('should display format', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.getByText(/PNG/i)).toBeInTheDocument();
  });
  
  it('should display generation parameters', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.getByText(/steps:/i)).toBeInTheDocument();
    expect(screen.getByText(/20/)).toBeInTheDocument();
    expect(screen.getByText(/cfg scale:/i)).toBeInTheDocument();
    expect(screen.getByText(/7\.5/)).toBeInTheDocument();
    expect(screen.getByText(/sampler:/i)).toBeInTheDocument();
    expect(screen.getByText(/euler_ancestral/i)).toBeInTheDocument();
  });
  
  it('should display prompt', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.getByText(/a beautiful landscape/i)).toBeInTheDocument();
  });
  
  it('should call onSave when save button is clicked', () => {
    render(<ImagePreviewPanel asset={mockAsset} onSave={mockOnSave} />);
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    expect(mockOnSave).toHaveBeenCalledWith(mockAsset);
  });
  
  it('should call onRegenerate when regenerate button is clicked', () => {
    render(<ImagePreviewPanel asset={mockAsset} onRegenerate={mockOnRegenerate} />);
    
    const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(regenerateButton);
    
    expect(mockOnRegenerate).toHaveBeenCalled();
  });
  
  it('should call onGenerateVideo when generate video button is clicked', () => {
    render(
      <ImagePreviewPanel
        asset={mockAsset}
        onGenerateVideo={mockOnGenerateVideo}
        canGenerateVideo={true}
      />
    );
    
    const videoButton = screen.getByRole('button', { name: /generate video/i });
    fireEvent.click(videoButton);
    
    expect(mockOnGenerateVideo).toHaveBeenCalledWith(mockAsset);
  });
  
  it('should disable video generation button when canGenerateVideo is false', () => {
    render(
      <ImagePreviewPanel
        asset={mockAsset}
        onGenerateVideo={mockOnGenerateVideo}
        canGenerateVideo={false}
      />
    );
    
    const videoButton = screen.getByRole('button', { name: /generate video/i });
    expect(videoButton).toBeDisabled();
  });
  
  it('should not render save button when onSave is not provided', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
  });
  
  it('should not render regenerate button when onRegenerate is not provided', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.queryByRole('button', { name: /regenerate/i })).not.toBeInTheDocument();
  });
  
  it('should not render video button when onGenerateVideo is not provided', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    expect(screen.queryByRole('button', { name: /generate video/i })).not.toBeInTheDocument();
  });
  
  it('should toggle image expansion', () => {
    render(<ImagePreviewPanel asset={mockAsset} />);
    
    const image = screen.getByAltText(/generated image/i);
    expect(image).toHaveClass('max-h-96');
    
    // Find and click the expand button (it's in the image container)
    const expandButton = screen.getByRole('button', { name: '' }); // Icon button without text
    fireEvent.click(expandButton);
    
    expect(image).toHaveClass('max-h-none');
  });
  
  it('should handle asset without dimensions', () => {
    const assetWithoutDimensions: GeneratedAsset = {
      ...mockAsset,
      metadata: {
        ...mockAsset.metadata,
        dimensions: undefined,
      },
    };
    
    render(<ImagePreviewPanel asset={assetWithoutDimensions} />);
    
    expect(screen.queryByText(/1024 × 1024/i)).not.toBeInTheDocument();
  });
  
  it('should handle asset without prompt', () => {
    const assetWithoutPrompt: GeneratedAsset = {
      ...mockAsset,
      metadata: {
        ...mockAsset.metadata,
        generationParams: {
          ...mockAsset.metadata.generationParams,
          prompt: undefined,
        },
      },
    };
    
    render(<ImagePreviewPanel asset={assetWithoutPrompt} />);
    
    expect(screen.queryByText(/a beautiful landscape/i)).not.toBeInTheDocument();
  });
  
  it('should format large file sizes correctly', () => {
    const largeAsset: GeneratedAsset = {
      ...mockAsset,
      metadata: {
        ...mockAsset.metadata,
        fileSize: 5242880, // 5 MB
      },
    };
    
    render(<ImagePreviewPanel asset={largeAsset} />);
    
    expect(screen.getByText(/5 MB/i)).toBeInTheDocument();
  });
  
  it('should format small file sizes correctly', () => {
    const smallAsset: GeneratedAsset = {
      ...mockAsset,
      metadata: {
        ...mockAsset.metadata,
        fileSize: 512, // 512 B
      },
    };
    
    render(<ImagePreviewPanel asset={smallAsset} />);
    
    expect(screen.getByText(/512 B/i)).toBeInTheDocument();
  });
});
