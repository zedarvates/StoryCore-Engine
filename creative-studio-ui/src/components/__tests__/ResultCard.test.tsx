/**
 * ResultCard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResultCard } from '../ResultCard';
import type { GeneratedResult, GeneratedAsset } from '@/services/resultService';

describe('ResultCard', () => {
  const mockAsset: GeneratedAsset = {
    id: 'asset-1',
    type: 'image',
    name: 'test-image.png',
    url: 'http://localhost:3000/assets/test.png',
    thumbnail: 'http://localhost:3000/thumbnails/test.png',
    size: 1024 * 500,
    format: 'png',
    dimensions: { width: 800, height: 600 },
  };

  const mockResult: GeneratedResult = {
    taskId: 'task-1',
    shotId: 'shot-1',
    type: 'grid',
    status: 'success',
    assets: [mockAsset],
    generatedAt: new Date('2024-01-15T10:00:00Z'),
    processingTime: 45,
    qualityScore: 85,
    metrics: {
      sharpness: 92,
      colorBalance: 88,
    },
  };

  const mockGetPreviewUrl = vi.fn((asset: GeneratedAsset) => asset.thumbnail || asset.url);

  describe('rendering', () => {
    it('should render result card', () => {
      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('GRID Result')).toBeInTheDocument();
      expect(screen.getByText(/Task ID:/)).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
    });

    it('should render status badge with correct color', () => {
      const { rerender } = render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      const successBadge = screen.getByText('success');
      expect(successBadge).toHaveClass('bg-green-100', 'text-green-700');

      const failedResult = { ...mockResult, status: 'failed' as const };
      rerender(
        <ResultCard
          result={failedResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      const failedBadge = screen.getByText('failed');
      expect(failedBadge).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('should render asset preview for images', () => {
      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      const image = screen.getByAltText('test-image.png');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', mockAsset.thumbnail);
    });

    it('should render asset list', () => {
      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('Generated Assets (1)')).toBeInTheDocument();
      expect(screen.getByText('test-image.png')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('500.0 KB')).toBeInTheDocument();
      expect(screen.getByText('800×600')).toBeInTheDocument();
    });

    it('should render compact mode', () => {
      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
          compact
        />
      );

      expect(screen.getByText('GRID')).toBeInTheDocument();
      expect(screen.getByText('1 assets')).toBeInTheDocument();
      expect(screen.queryByText('Generated Assets')).not.toBeInTheDocument();
    });

    it('should render details when showDetails is true', () => {
      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
          showDetails
        />
      );

      expect(screen.getByText('Details')).toBeInTheDocument();
      expect(screen.getByText(/Generated:/)).toBeInTheDocument();
      expect(screen.getByText(/Processing Time:/)).toBeInTheDocument();
      expect(screen.getByText(/Quality Score:/)).toBeInTheDocument();
      expect(screen.getByText(/Metrics:/)).toBeInTheDocument();
      expect(screen.getByText('sharpness:')).toBeInTheDocument();
      expect(screen.getByText('92')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onDownloadAsset when download button clicked', () => {
      const onDownloadAsset = vi.fn();

      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
          onDownloadAsset={onDownloadAsset}
        />
      );

      const downloadButtons = screen.getAllByText('Download');
      fireEvent.click(downloadButtons[0]);

      expect(onDownloadAsset).toHaveBeenCalledWith(mockAsset);
    });

    it('should call onDownloadAll when download all button clicked', () => {
      const onDownloadAll = vi.fn();

      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
          onDownloadAll={onDownloadAll}
        />
      );

      const downloadAllButton = screen.getByText('Download All');
      fireEvent.click(downloadAllButton);

      expect(onDownloadAll).toHaveBeenCalled();
    });

    it('should call onDelete when delete button clicked', () => {
      const onDelete = vi.fn();

      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
          onDelete={onDelete}
        />
      );

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalled();
    });

    it('should select asset when clicked', () => {
      const multiAssetResult = {
        ...mockResult,
        assets: [
          mockAsset,
          {
            id: 'asset-2',
            type: 'data' as const,
            name: 'metadata.json',
            url: 'http://localhost:3000/assets/metadata.json',
          },
        ],
      };

      render(
        <ResultCard
          result={multiAssetResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      const secondAsset = screen.getByText('metadata.json');
      fireEvent.click(secondAsset.closest('div')!);

      // Check if the asset card has the selected styling
      expect(secondAsset.closest('div')).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    it('should open preview modal when preview button clicked', () => {
      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      const previewButton = screen.getByText('🔍 Preview');
      fireEvent.click(previewButton);

      // Modal should be visible
      const modal = screen.getByRole('img', { name: 'test-image.png' });
      expect(modal).toBeInTheDocument();
    });

    it('should close preview modal when close button clicked', () => {
      render(
        <ResultCard
          result={mockResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      // Open modal
      const previewButton = screen.getByText('🔍 Preview');
      fireEvent.click(previewButton);

      // Close modal
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      // Modal should be closed (image should not be in modal anymore)
      const images = screen.getAllByRole('img');
      expect(images.length).toBe(1); // Only the thumbnail, not the modal image
    });
  });

  describe('asset types', () => {
    it('should render video asset', () => {
      const videoAsset: GeneratedAsset = {
        id: 'asset-video',
        type: 'video',
        name: 'test-video.mp4',
        url: 'http://localhost:3000/assets/test.mp4',
        duration: 120,
      };

      const videoResult = {
        ...mockResult,
        assets: [videoAsset],
      };

      render(
        <ResultCard
          result={videoResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      expect(screen.getByText('2:00')).toBeInTheDocument();
    });

    it('should render audio asset', () => {
      const audioAsset: GeneratedAsset = {
        id: 'asset-audio',
        type: 'audio',
        name: 'test-audio.wav',
        url: 'http://localhost:3000/assets/test.wav',
        duration: 45,
      };

      const audioResult = {
        ...mockResult,
        assets: [audioAsset],
      };

      render(
        <ResultCard
          result={audioResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('test-audio.wav')).toBeInTheDocument();
      expect(screen.getByText('0:45')).toBeInTheDocument();
    });

    it('should render data asset', () => {
      const dataAsset: GeneratedAsset = {
        id: 'asset-data',
        type: 'data',
        name: 'metadata.json',
        url: 'http://localhost:3000/assets/metadata.json',
        size: 256,
        format: 'json',
      };

      const dataResult = {
        ...mockResult,
        assets: [dataAsset],
      };

      render(
        <ResultCard
          result={dataResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('metadata.json')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();
      expect(screen.getByText('0.2 KB')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle result with no assets', () => {
      const emptyResult = {
        ...mockResult,
        assets: [],
      };

      render(
        <ResultCard
          result={emptyResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('Generated Assets (0)')).toBeInTheDocument();
    });

    it('should handle result without quality metrics', () => {
      const noMetricsResult = {
        ...mockResult,
        qualityScore: undefined,
        metrics: undefined,
      };

      render(
        <ResultCard
          result={noMetricsResult}
          getPreviewUrl={mockGetPreviewUrl}
          showDetails
        />
      );

      expect(screen.queryByText(/Quality Score:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Metrics:/)).not.toBeInTheDocument();
    });

    it('should handle asset without size', () => {
      const noSizeAsset = {
        ...mockAsset,
        size: undefined,
      };

      const noSizeResult = {
        ...mockResult,
        assets: [noSizeAsset],
      };

      render(
        <ResultCard
          result={noSizeResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle asset without dimensions', () => {
      const noDimensionsAsset = {
        ...mockAsset,
        dimensions: undefined,
      };

      const noDimensionsResult = {
        ...mockResult,
        assets: [noDimensionsAsset],
      };

      render(
        <ResultCard
          result={noDimensionsResult}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.queryByText(/×/)).not.toBeInTheDocument();
    });
  });

  describe('type icons', () => {
    it('should show correct icon for grid type', () => {
      render(
        <ResultCard
          result={{ ...mockResult, type: 'grid' }}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('🎨')).toBeInTheDocument();
    });

    it('should show correct icon for promotion type', () => {
      render(
        <ResultCard
          result={{ ...mockResult, type: 'promotion' }}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('⬆️')).toBeInTheDocument();
    });

    it('should show correct icon for refine type', () => {
      render(
        <ResultCard
          result={{ ...mockResult, type: 'refine' }}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('✨')).toBeInTheDocument();
    });

    it('should show correct icon for qa type', () => {
      render(
        <ResultCard
          result={{ ...mockResult, type: 'qa' }}
          getPreviewUrl={mockGetPreviewUrl}
        />
      );

      expect(screen.getByText('🔍')).toBeInTheDocument();
    });
  });
});
