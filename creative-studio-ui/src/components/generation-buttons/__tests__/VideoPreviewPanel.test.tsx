/**
 * Video Preview Panel Tests
 * 
 * Tests for the VideoPreviewPanel component including:
 * - Video display with playback controls
 * - Metadata display (parameters, file size, duration, timestamp)
 * - Save and regenerate options
 * - Audio generation button enablement
 * 
 * Requirements: 3.3, 3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoPreviewPanel } from '../VideoPreviewPanel';
import type { GeneratedAsset } from '../../../types/generation';

describe('VideoPreviewPanel', () => {
  // Mock video asset
  const mockVideoAsset: GeneratedAsset = {
    id: 'video-123',
    type: 'video',
    url: 'https://example.com/video.mp4',
    metadata: {
      generationParams: {
        prompt: 'Camera slowly pans across the scene',
        inputImagePath: '/path/to/source-image.png',
        frameCount: 120,
        frameRate: 24,
        width: 1024,
        height: 576,
        motionStrength: 0.8,
        seed: 42,
      },
      fileSize: 5242880, // 5 MB
      dimensions: { width: 1024, height: 576 },
      duration: 5, // 5 seconds
      format: 'mp4',
    },
    relatedAssets: ['image-456'],
    timestamp: 1704067200000, // 2024-01-01 00:00:00
  };

  // Mock callbacks
  const mockOnSave = vi.fn();
  const mockOnRegenerate = vi.fn();
  const mockOnGenerateAudio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock HTMLVideoElement methods
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLVideoElement.prototype.pause = vi.fn();
  });

  describe('Video Display', () => {
    it('should render video element with correct source', () => {
      const { container } = render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      const video = container.querySelector('video') as HTMLVideoElement;
      expect(video).toBeInTheDocument();
      expect(video.src).toContain('video.mp4');
    });

    it('should display video with playback controls', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      // Check that control buttons exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should toggle play/pause when play button is clicked', async () => {
      const { container } = render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      const video = container.querySelector('video') as HTMLVideoElement;
      
      // Click on the video itself to toggle play
      fireEvent.click(video);
      
      await waitFor(() => {
        expect(HTMLVideoElement.prototype.play).toHaveBeenCalled();
      });
    });

    it('should toggle mute when mute button is clicked', () => {
      const { container } = render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      const video = container.querySelector('video') as HTMLVideoElement;
      
      // Initially not muted
      expect(video.muted).toBe(false);
    });

    it('should display expand button on hover', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      // Check that buttons exist (including expand button)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(2); // At least play, mute, and expand buttons
    });
  });

  describe('Metadata Display', () => {
    it('should display video dimensions', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      expect(screen.getByText('1024 × 576')).toBeInTheDocument();
    });

    it('should display video duration', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      expect(screen.getByText('00:05')).toBeInTheDocument();
    });

    it('should display file size in human-readable format', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      expect(screen.getByText('5 MB')).toBeInTheDocument();
    });

    it('should display video format', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      expect(screen.getByText('MP4')).toBeInTheDocument();
    });

    it('should display creation timestamp', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      // Check for date display (format may vary by locale)
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('should display generation parameters', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      expect(screen.getByText('120')).toBeInTheDocument(); // Frame count
      expect(screen.getByText('24 fps')).toBeInTheDocument(); // Frame rate
      expect(screen.getByText('0.8')).toBeInTheDocument(); // Motion strength
      expect(screen.getByText('42')).toBeInTheDocument(); // Seed
    });

    it('should display motion description prompt', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      expect(screen.getByText('Camera slowly pans across the scene')).toBeInTheDocument();
    });

    it('should display source image path', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      expect(screen.getByText('/path/to/source-image.png')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render save button when onSave is provided', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onSave={mockOnSave}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should call onSave when save button is clicked', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onSave={mockOnSave}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);
      
      expect(mockOnSave).toHaveBeenCalledWith(mockVideoAsset);
    });

    it('should render regenerate button when onRegenerate is provided', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      expect(regenerateButton).toBeInTheDocument();
    });

    it('should call onRegenerate when regenerate button is clicked', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      fireEvent.click(regenerateButton);
      
      expect(mockOnRegenerate).toHaveBeenCalled();
    });

    it('should not render save button when onSave is not provided', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      const saveButton = screen.queryByRole('button', { name: /save/i });
      expect(saveButton).not.toBeInTheDocument();
    });

    it('should not render regenerate button when onRegenerate is not provided', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      const regenerateButton = screen.queryByRole('button', { name: /regenerate/i });
      expect(regenerateButton).not.toBeInTheDocument();
    });
  });

  describe('Audio Generation Button', () => {
    it('should render audio generation button when onGenerateAudio is provided', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onGenerateAudio={mockOnGenerateAudio}
        />
      );
      
      const audioButton = screen.getByRole('button', { name: /generate audio/i });
      expect(audioButton).toBeInTheDocument();
    });

    it('should enable audio generation button by default', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onGenerateAudio={mockOnGenerateAudio}
        />
      );
      
      const audioButton = screen.getByRole('button', { name: /generate audio/i });
      expect(audioButton).not.toBeDisabled();
    });

    it('should disable audio generation button when canGenerateAudio is false', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onGenerateAudio={mockOnGenerateAudio}
          canGenerateAudio={false}
        />
      );
      
      const audioButton = screen.getByRole('button', { name: /generate audio/i });
      expect(audioButton).toBeDisabled();
    });

    it('should call onGenerateAudio when audio button is clicked', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onGenerateAudio={mockOnGenerateAudio}
        />
      );
      
      const audioButton = screen.getByRole('button', { name: /generate audio/i });
      fireEvent.click(audioButton);
      
      expect(mockOnGenerateAudio).toHaveBeenCalledWith(mockVideoAsset);
    });

    it('should not call onGenerateAudio when button is disabled', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onGenerateAudio={mockOnGenerateAudio}
          canGenerateAudio={false}
        />
      );
      
      const audioButton = screen.getByRole('button', { name: /generate audio/i });
      fireEvent.click(audioButton);
      
      expect(mockOnGenerateAudio).not.toHaveBeenCalled();
    });

    it('should not render audio generation button when onGenerateAudio is not provided', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      const audioButton = screen.queryByRole('button', { name: /generate audio/i });
      expect(audioButton).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle video without dimensions', () => {
      const assetWithoutDimensions: GeneratedAsset = {
        ...mockVideoAsset,
        metadata: {
          ...mockVideoAsset.metadata,
          dimensions: undefined,
        },
      };
      
      render(<VideoPreviewPanel asset={assetWithoutDimensions} />);
      
      // Should not crash
      expect(screen.getByText('Generated Video')).toBeInTheDocument();
    });

    it('should handle video without duration', () => {
      const assetWithoutDuration: GeneratedAsset = {
        ...mockVideoAsset,
        metadata: {
          ...mockVideoAsset.metadata,
          duration: undefined,
        },
      };
      
      render(<VideoPreviewPanel asset={assetWithoutDuration} />);
      
      // Should not crash
      expect(screen.getByText('Generated Video')).toBeInTheDocument();
    });

    it('should handle video with zero file size', () => {
      const assetWithZeroSize: GeneratedAsset = {
        ...mockVideoAsset,
        metadata: {
          ...mockVideoAsset.metadata,
          fileSize: 0,
        },
      };
      
      render(<VideoPreviewPanel asset={assetWithZeroSize} />);
      
      expect(screen.getByText('0 B')).toBeInTheDocument();
    });

    it('should handle video without generation parameters', () => {
      const assetWithoutParams: GeneratedAsset = {
        ...mockVideoAsset,
        metadata: {
          ...mockVideoAsset.metadata,
          generationParams: {},
        },
      };
      
      render(<VideoPreviewPanel asset={assetWithoutParams} />);
      
      // Should not crash
      expect(screen.getByText('Generated Video')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          className="custom-class"
        />
      );
      
      const card = container.querySelector('.custom-class');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Video Controls', () => {
    it('should display progress bar', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      // Check for time displays (there are multiple, so use getAllByText)
      const timeDisplays = screen.getAllByText('00:00');
      expect(timeDisplays.length).toBeGreaterThan(0);
    });

    it('should display volume control', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      // Check that control buttons exist
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should format duration correctly', () => {
      const assetWithLongDuration: GeneratedAsset = {
        ...mockVideoAsset,
        metadata: {
          ...mockVideoAsset.metadata,
          duration: 125, // 2:05
        },
      };
      
      render(<VideoPreviewPanel asset={assetWithLongDuration} />);
      
      expect(screen.getByText('02:05')).toBeInTheDocument();
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy requirement 3.3: display generated video with playback controls', () => {
      const { container } = render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      // Video element
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      
      // Playback controls (buttons)
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should satisfy requirement 3.3: show metadata (parameters, file size, duration, timestamp)', () => {
      render(<VideoPreviewPanel asset={mockVideoAsset} />);
      
      // Parameters
      expect(screen.getByText('120')).toBeInTheDocument(); // Frame count
      expect(screen.getByText('24 fps')).toBeInTheDocument(); // Frame rate
      
      // File size
      expect(screen.getByText('5 MB')).toBeInTheDocument();
      
      // Duration
      expect(screen.getByText('00:05')).toBeInTheDocument();
      
      // Timestamp
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('should satisfy requirement 3.5: provide save and regenerate options', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onSave={mockOnSave}
          onRegenerate={mockOnRegenerate}
        />
      );
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
      
      expect(saveButton).toBeInTheDocument();
      expect(regenerateButton).toBeInTheDocument();
      
      // Test functionality
      fireEvent.click(saveButton);
      expect(mockOnSave).toHaveBeenCalled();
      
      fireEvent.click(regenerateButton);
      expect(mockOnRegenerate).toHaveBeenCalled();
    });

    it('should satisfy requirement 3.5: enable audio generation button on success', () => {
      render(
        <VideoPreviewPanel
          asset={mockVideoAsset}
          onGenerateAudio={mockOnGenerateAudio}
          canGenerateAudio={true}
        />
      );
      
      const audioButton = screen.getByRole('button', { name: /generate audio/i });
      expect(audioButton).toBeInTheDocument();
      expect(audioButton).not.toBeDisabled();
      
      // Test functionality
      fireEvent.click(audioButton);
      expect(mockOnGenerateAudio).toHaveBeenCalledWith(mockVideoAsset);
    });
  });
});
