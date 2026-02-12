/**
 * ResultsGallery Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ResultsGallery } from '../ResultsGallery';
import type { GeneratedResult } from '@/services/resultService';

// Mock the hook
vi.mock('@/hooks/useResultDisplay');

describe('ResultsGallery', () => {
  const mockResults: GeneratedResult[] = [
    {
      taskId: 'task-1',
      shotId: 'shot-1',
      type: 'grid',
      status: 'success',
      assets: [
        {
          id: 'asset-1',
          type: 'image',
          name: 'test1.png',
          url: 'http://localhost:3000/assets/test1.png',
        },
      ],
      generatedAt: new Date('2024-01-15T10:00:00Z'),
      qualityScore: 85,
    },
    {
      taskId: 'task-2',
      shotId: 'shot-2',
      type: 'promotion',
      status: 'success',
      assets: [
        {
          id: 'asset-2',
          type: 'image',
          name: 'test2.png',
          url: 'http://localhost:3000/assets/test2.png',
        },
      ],
      generatedAt: new Date('2024-01-15T11:00:00Z'),
      qualityScore: 90,
    },
    {
      taskId: 'task-3',
      shotId: 'shot-3',
      type: 'refine',
      status: 'failed',
      assets: [],
      generatedAt: new Date('2024-01-15T12:00:00Z'),
      error: 'Processing failed',
    },
  ];

  const mockHookReturn = {
    results: new Map(mockResults.map((r) => [r.taskId, r])),
    downloadAsset: vi.fn(),
    downloadAllAssets: vi.fn(),
    deleteResult: vi.fn(),
    getPreviewUrl: vi.fn((asset) => asset.url),
    isLoading: false,
    error: null,
    fetchProjectResults: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const { useResultDisplay } = require('@/hooks/useResultDisplay');
    useResultDisplay.mockReturnValue(mockHookReturn);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render results gallery', () => {
      render(<ResultsGallery />);

      expect(screen.getByText('Generated Results')).toBeInTheDocument();
      expect(screen.getByText(/3 results/)).toBeInTheDocument();
    });

    it('should render all results', () => {
      render(<ResultsGallery />);

      expect(screen.getByText('GRID Result')).toBeInTheDocument();
      expect(screen.getByText('PROMOTION Result')).toBeInTheDocument();
      expect(screen.getByText('REFINE Result')).toBeInTheDocument();
    });

    it('should render summary stats', () => {
      render(<ResultsGallery />);

      expect(screen.getByText('2 successful')).toBeInTheDocument();
      expect(screen.getByText('1 failed')).toBeInTheDocument();
      expect(screen.getByText('2 total assets')).toBeInTheDocument();
    });

    it('should render loading state', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        results: new Map(),
        isLoading: true,
      });

      render(<ResultsGallery />);

      expect(screen.getByText('Loading results...')).toBeInTheDocument();
    });

    it('should render error state', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        error: 'Network error',
      });

      render(<ResultsGallery />);

      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should render empty state', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        results: new Map(),
      });

      render(<ResultsGallery />);

      expect(screen.getByText('No results to display')).toBeInTheDocument();
      expect(screen.getByText('Complete some tasks to see results here')).toBeInTheDocument();
    });

    it('should render compact mode', () => {
      render(<ResultsGallery compact />);

      // In compact mode, cards should be in a vertical list
      const gallery = screen.getByText('Generated Results').closest('div');
      expect(gallery?.querySelector('.space-y-2')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter by type', () => {
      render(<ResultsGallery filterType="grid" />);

      expect(screen.getByText('GRID Result')).toBeInTheDocument();
      expect(screen.queryByText('PROMOTION Result')).not.toBeInTheDocument();
      expect(screen.queryByText('REFINE Result')).not.toBeInTheDocument();
    });

    it('should filter by status', () => {
      render(<ResultsGallery filterStatus="success" />);

      expect(screen.getByText('GRID Result')).toBeInTheDocument();
      expect(screen.getByText('PROMOTION Result')).toBeInTheDocument();
      expect(screen.queryByText('REFINE Result')).not.toBeInTheDocument();
    });

    it('should filter by both type and status', () => {
      render(<ResultsGallery filterType="promotion" filterStatus="success" />);

      expect(screen.queryByText('GRID Result')).not.toBeInTheDocument();
      expect(screen.getByText('PROMOTION Result')).toBeInTheDocument();
      expect(screen.queryByText('REFINE Result')).not.toBeInTheDocument();
    });

    it('should show empty state when filters match nothing', () => {
      render(<ResultsGallery filterType="qa" />);

      expect(screen.getByText('No results to display')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort by date descending by default', () => {
      render(<ResultsGallery />);

      const results = screen.getAllByText(/Result$/);
      expect(results[0]).toHaveTextContent('REFINE'); // Latest
      expect(results[1]).toHaveTextContent('PROMOTION');
      expect(results[2]).toHaveTextContent('GRID'); // Oldest
    });

    it('should sort by date ascending', () => {
      render(<ResultsGallery />);

      const sortOrderButton = screen.getByTitle('Descending');
      fireEvent.click(sortOrderButton);

      const results = screen.getAllByText(/Result$/);
      expect(results[0]).toHaveTextContent('GRID'); // Oldest
      expect(results[1]).toHaveTextContent('PROMOTION');
      expect(results[2]).toHaveTextContent('REFINE'); // Latest
    });

    it('should sort by type', () => {
      render(<ResultsGallery />);

      const sortBySelect = screen.getByDisplayValue('Sort by Date');
      fireEvent.change(sortBySelect, { target: { value: 'type' } });

      const results = screen.getAllByText(/Result$/);
      expect(results[0]).toHaveTextContent('GRID');
      expect(results[1]).toHaveTextContent('PROMOTION');
      expect(results[2]).toHaveTextContent('REFINE');
    });

    it('should sort by quality', () => {
      render(<ResultsGallery />);

      const sortBySelect = screen.getByDisplayValue('Sort by Date');
      fireEvent.change(sortBySelect, { target: { value: 'quality' } });

      // Should sort by quality score (descending by default)
      const results = screen.getAllByText(/Result$/);
      expect(results[0]).toHaveTextContent('PROMOTION'); // 90
      expect(results[1]).toHaveTextContent('GRID'); // 85
      expect(results[2]).toHaveTextContent('REFINE'); // 0 (no score)
    });
  });

  describe('interactions', () => {
    it('should refresh results when refresh button clicked', async () => {
      render(<ResultsGallery />);

      const refreshButton = screen.getByText('🔄 Refresh');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockHookReturn.fetchProjectResults).toHaveBeenCalled();
      });
    });

    it('should retry on error', async () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        error: 'Network error',
      });

      render(<ResultsGallery />);

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(mockHookReturn.fetchProjectResults).toHaveBeenCalled();
      });
    });

    it('should call onDownload when result is downloaded', async () => {
      const onDownload = vi.fn();
      mockHookReturn.downloadAllAssets.mockResolvedValueOnce(undefined);

      render(<ResultsGallery onDownload={onDownload} />);

      const downloadButtons = screen.getAllByText('Download All');
      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(mockHookReturn.downloadAllAssets).toHaveBeenCalled();
        expect(onDownload).toHaveBeenCalledWith(mockResults[2]); // First in sorted order
      });
    });

    it('should call onDelete when result is deleted', async () => {
      const onDelete = vi.fn();
      mockHookReturn.deleteResult.mockResolvedValueOnce(undefined);

      render(<ResultsGallery onDelete={onDelete} />);

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockHookReturn.deleteResult).toHaveBeenCalled();
        expect(onDelete).toHaveBeenCalledWith(mockResults[2]); // First in sorted order
      });
    });

    it('should disable refresh button when loading', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        isLoading: true,
      });

      render(<ResultsGallery />);

      const refreshButton = screen.getByText('🔄 Refresh');
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('autoFetch', () => {
    it('should pass autoFetch option to hook', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');

      render(<ResultsGallery autoFetch={false} />);

      expect(useResultDisplay).toHaveBeenCalledWith({ autoFetch: false });
    });

    it('should auto-fetch by default', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');

      render(<ResultsGallery />);

      expect(useResultDisplay).toHaveBeenCalledWith({ autoFetch: true });
    });
  });

  describe('showDetails', () => {
    it('should pass showDetails to ResultCard', () => {
      render(<ResultsGallery showDetails />);

      // Check if details section is rendered (from ResultCard)
      expect(screen.getAllByText('Details').length).toBeGreaterThan(0);
    });
  });

  describe('loading more results', () => {
    it('should show loading indicator when loading with existing results', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        isLoading: true,
      });

      render(<ResultsGallery />);

      expect(screen.getByText('Loading more results...')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle results without quality scores', () => {
      const resultsWithoutScores = mockResults.map((r) => ({
        ...r,
        qualityScore: undefined,
      }));

      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        results: new Map(resultsWithoutScores.map((r) => [r.taskId, r])),
      });

      render(<ResultsGallery />);

      // Should still render without errors
      expect(screen.getByText('Generated Results')).toBeInTheDocument();
    });

    it('should handle single result', () => {
      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        results: new Map([[mockResults[0].taskId, mockResults[0]]]),
      });

      render(<ResultsGallery />);

      expect(screen.getByText(/1 result/)).toBeInTheDocument();
    });

    it('should handle results with no assets', () => {
      const resultsWithNoAssets = mockResults.map((r) => ({
        ...r,
        assets: [],
      }));

      const { useResultDisplay } = require('@/hooks/useResultDisplay');
      useResultDisplay.mockReturnValue({
        ...mockHookReturn,
        results: new Map(resultsWithNoAssets.map((r) => [r.taskId, r])),
      });

      render(<ResultsGallery />);

      expect(screen.getByText('0 total assets')).toBeInTheDocument();
    });
  });
});
