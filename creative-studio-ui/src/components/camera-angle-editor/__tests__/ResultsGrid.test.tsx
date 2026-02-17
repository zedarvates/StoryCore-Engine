/**
 * Unit tests for ResultsGrid Component
 * 
 * Tests for the camera angle results grid component including:
 * - Rendering results
 * - Loading state
 * - Error state
 * - Empty state
 * - Download functionality
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultsGrid } from '../ResultsGrid';
import type { CameraAngleResult, CameraAnglePresetMetadata } from '@/types/cameraAngle';

// Sample mock data
const mockPresets: CameraAnglePresetMetadata[] = [
  { id: 'front', displayName: 'Front View', description: 'Front view', icon: 'Camera', promptSuffix: 'front view' },
  { id: 'left', displayName: 'Left Side', description: 'Left side', icon: 'Camera', promptSuffix: 'left side' },
  { id: 'isometric', displayName: 'Isometric', description: 'Isometric view', icon: 'Camera', promptSuffix: 'isometric' },
];

const mockResults: CameraAngleResult[] = [
  {
    id: 'result-1',
    angleId: 'front',
    originalImageBase64: 'original-base64',
    generatedImageBase64: 'base64-image-data-1',
    promptUsed: 'front view prompt',
    generationTimeSeconds: 5.5,
    metadata: {},
  },
  {
    id: 'result-2',
    angleId: 'left',
    originalImageBase64: 'original-base64',
    generatedImageBase64: 'base64-image-data-2',
    promptUsed: 'left side prompt',
    generationTimeSeconds: 4.2,
    metadata: {},
  },
  {
    id: 'result-3',
    angleId: 'isometric',
    originalImageBase64: 'original-base64',
    generatedImageBase64: 'base64-image-data-3',
    promptUsed: 'isometric prompt',
    generationTimeSeconds: 6.1,
    metadata: {},
  },
];

describe('ResultsGrid', () => {
  const defaultProps = {
    results: [] as CameraAngleResult[],
    presets: mockPresets,
    onDownload: vi.fn(),
    onDownloadAll: vi.fn(),
    isLoading: false,
    progress: 0,
    currentStep: null,
    error: null,
    onRetry: vi.fn(),
    columns: 3 as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Rendering Tests
  // ============================================================================

  describe('Rendering', () => {
    it('should render results when provided', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      expect(screen.getByText('Generated Images (3)')).toBeInTheDocument();
    });

    it('should render result images', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBe(3);
    });

    it('should render angle labels from presets', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      expect(screen.getByText('Front View')).toBeInTheDocument();
      expect(screen.getByText('Left Side')).toBeInTheDocument();
      expect(screen.getByText('Isometric')).toBeInTheDocument();
    });

    it('should render generation time for each result', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      expect(screen.getByText('5.5s')).toBeInTheDocument();
      expect(screen.getByText('4.2s')).toBeInTheDocument();
      expect(screen.getByText('6.1s')).toBeInTheDocument();
    });

    it('should render download all button when multiple results', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      expect(screen.getByText('Download All')).toBeInTheDocument();
    });

    it('should not render download all button for single result', () => {
      render(<ResultsGrid {...defaultProps} results={[mockResults[0]]} />);

      expect(screen.queryByText('Download All')).not.toBeInTheDocument();
    });

    it('should render with different column counts', () => {
      const { container, rerender } = render(<ResultsGrid {...defaultProps} results={mockResults} columns={2} />);
      
      expect(container.querySelector('.grid-cols-2')).toBeInTheDocument();

      rerender(<ResultsGrid {...defaultProps} results={mockResults} columns={3} />);
      expect(container.querySelector('.grid-cols-3')).toBeInTheDocument();

      rerender(<ResultsGrid {...defaultProps} results={mockResults} columns={4} />);
      expect(container.querySelector('.grid-cols-4')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Loading State Tests
  // ============================================================================

  describe('Loading State', () => {
    it('should show loading indicator when loading', () => {
      render(<ResultsGrid {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Generating Camera Angles...')).toBeInTheDocument();
    });

    it('should show progress percentage', () => {
      render(<ResultsGrid {...defaultProps} isLoading={true} progress={50} />);

      expect(screen.getByText('50% complete')).toBeInTheDocument();
    });

    it('should show current step when provided', () => {
      render(<ResultsGrid {...defaultProps} isLoading={true} currentStep="Generating front view..." />);

      expect(screen.getByText('Generating front view...')).toBeInTheDocument();
    });

    it('should show progress bar', () => {
      const { container } = render(<ResultsGrid {...defaultProps} isLoading={true} progress={75} />);

      const progressBar = container.querySelector('.bg-primary');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not show results when loading', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} isLoading={true} />);

      expect(screen.queryByText('Generated Images')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Error State Tests
  // ============================================================================

  describe('Error State', () => {
    it('should show error message when error occurs', () => {
      render(<ResultsGrid {...defaultProps} error="Generation failed" />);

      expect(screen.getByText('Generation Failed')).toBeInTheDocument();
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });

    it('should show retry button when error and onRetry provided', () => {
      render(<ResultsGrid {...defaultProps} error="Generation failed" onRetry={vi.fn()} />);

      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should not show retry button when onRetry not provided', () => {
      render(<ResultsGrid {...defaultProps} error="Generation failed" onRetry={undefined} />);

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });

    it('should call onRetry when retry button clicked', async () => {
      const onRetry = vi.fn();
      render(<ResultsGrid {...defaultProps} error="Generation failed" onRetry={onRetry} />);

      const retryButton = screen.getByText('Try Again');
      await fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();
    });

    it('should not show results when error', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} error="Generation failed" />);

      expect(screen.queryByText('Generated Images')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Empty State Tests
  // ============================================================================

  describe('Empty State', () => {
    it('should show empty state when no results', () => {
      render(<ResultsGrid {...defaultProps} results={[]} />);

      expect(screen.getByText('No Results Yet')).toBeInTheDocument();
    });

    it('should show hint text in empty state', () => {
      render(<ResultsGrid {...defaultProps} results={[]} />);

      expect(screen.getByText('Select camera angles and click Generate to create variations')).toBeInTheDocument();
    });

    it('should show empty state icon', () => {
      render(<ResultsGrid {...defaultProps} results={[]} />);

      // Check for ImageOff icon presence
      const { container } = render(<ResultsGrid {...defaultProps} results={[]} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Download Tests
  // ============================================================================

  describe('Download Functionality', () => {
    it('should call onDownload when download button clicked', async () => {
      const onDownload = vi.fn();
      render(<ResultsGrid {...defaultProps} results={mockResults} onDownload={onDownload} />);

      // Hover over a result to show download button
      const resultCard = screen.getAllByRole('listitem')[0];
      await fireEvent.mouseEnter(resultCard);

      // Find and click download button
      const downloadButtons = screen.getAllByText('Download');
      if (downloadButtons.length > 0) {
        await fireEvent.click(downloadButtons[0]);
        expect(onDownload).toHaveBeenCalled();
      }
    });

    it('should call onDownloadAll when download all button clicked', async () => {
      const onDownloadAll = vi.fn();
      render(<ResultsGrid {...defaultProps} results={mockResults} onDownloadAll={onDownloadAll} />);

      const downloadAllButton = screen.getByText('Download All');
      await fireEvent.click(downloadAllButton);

      expect(onDownloadAll).toHaveBeenCalled();
    });

    it('should not show download buttons when callbacks not provided', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} onDownload={undefined} onDownloadAll={undefined} />);

      expect(screen.queryByText('Download All')).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // Image Display Tests
  // ============================================================================

  describe('Image Display', () => {
    it('should display images with correct src', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('src', 'data:image/png;base64,base64-image-data-1');
    });

    it('should handle images with data URI prefix', () => {
      const resultsWithPrefix: CameraAngleResult[] = [
        {
          ...mockResults[0],
          generatedImageBase64: 'data:image/jpeg;base64,test-data',
        },
      ];

      render(<ResultsGrid {...defaultProps} results={resultsWithPrefix} />);

      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'data:image/jpeg;base64,test-data');
    });

    it('should have correct alt text for images', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('alt', 'Camera angle: Front View');
    });

    it('should use angle ID as fallback label when preset not found', () => {
      const resultsWithUnknownAngle: CameraAngleResult[] = [
        {
          ...mockResults[0],
          angleId: 'unknown_angle' as any,
        },
      ];

      render(<ResultsGrid {...defaultProps} results={resultsWithUnknownAngle} />);

      expect(screen.getByText('unknown_angle')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('should have proper role for grid', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      expect(screen.getByRole('list', { name: 'Generated camera angle images' })).toBeInTheDocument();
    });

    it('should have proper role for list items', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      const items = screen.getAllByRole('listitem');
      expect(items.length).toBe(3);
    });

    it('should have accessible loading indicator', () => {
      render(<ResultsGrid {...defaultProps} isLoading={true} />);

      // Loading indicator should be visible
      expect(screen.getByText('Generating Camera Angles...')).toBeInTheDocument();
    });

    it('should have accessible error message', () => {
      render(<ResultsGrid {...defaultProps} error="Test error" />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Edge Cases Tests
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle empty presets array', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} presets={[]} />);

      // Should still render results, using angle IDs as labels
      expect(screen.getByText('front')).toBeInTheDocument();
    });

    it('should handle zero progress', () => {
      render(<ResultsGrid {...defaultProps} isLoading={true} progress={0} />);

      expect(screen.getByText('0% complete')).toBeInTheDocument();
    });

    it('should handle 100% progress', () => {
      render(<ResultsGrid {...defaultProps} isLoading={true} progress={100} />);

      expect(screen.getByText('100% complete')).toBeInTheDocument();
    });

    it('should handle very long generation times', () => {
      const longTimeResult: CameraAngleResult[] = [
        {
          ...mockResults[0],
          generationTimeSeconds: 125.789,
        },
      ];

      render(<ResultsGrid {...defaultProps} results={longTimeResult} />);

      expect(screen.getByText('125.8s')).toBeInTheDocument();
    });

    it('should handle results without metadata', () => {
      const resultsNoMetadata: CameraAngleResult[] = [
        {
          id: 'result-1',
          angleId: 'front',
          originalImageBase64: 'original-base64',
          generatedImageBase64: 'test-data',
          promptUsed: 'test prompt',
          generationTimeSeconds: 5.0,
          metadata: {},
        },
      ];

      render(<ResultsGrid {...defaultProps} results={resultsNoMetadata} />);

      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Visual State Tests
  // ============================================================================

  describe('Visual States', () => {
    it('should show hover overlay on result cards', () => {
      const { container } = render(<ResultsGrid {...defaultProps} results={mockResults} />);

      const overlay = container.querySelector('.group-hover\\:opacity-100');
      expect(overlay).toBeInTheDocument();
    });

    it('should apply correct styling to result cards', () => {
      render(<ResultsGrid {...defaultProps} results={mockResults} />);

      const cards = screen.getAllByRole('listitem');
      cards.forEach(card => {
        expect(card).toHaveClass('group');
      });
    });

    it('should show loading spinner during generation', () => {
      const { container } = render(<ResultsGrid {...defaultProps} isLoading={true} />);

      // Check for spinner animation class
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });
});
