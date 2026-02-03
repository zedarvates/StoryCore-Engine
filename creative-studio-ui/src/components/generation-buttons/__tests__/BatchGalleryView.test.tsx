/**
 * Batch Gallery View Tests
 * 
 * Tests for the batch gallery view component.
 * Requirements: 11.4, 11.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BatchGalleryView } from '../BatchGalleryView';
import { useGenerationStore } from '../../../stores/generationStore';
import type { BatchGenerationState, GeneratedAsset } from '../../../types/generation';

describe('BatchGalleryView', () => {
  const createMockAsset = (id: string, type: 'image' | 'video' | 'audio' = 'image'): GeneratedAsset => ({
    id,
    type,
    url: `test-${id}.jpg`,
    metadata: {
      generationParams: { prompt: 'test' },
      fileSize: 1024 * 1024,
      format: 'jpg',
    },
    relatedAssets: [],
    timestamp: Date.now(),
  });

  const createMockBatch = (): BatchGenerationState => ({
    id: 'batch-1',
    config: {
      enabled: true,
      batchSize: 4,
      variationParams: {
        varySeeds: true,
        varyPrompts: false,
        varyParameters: false,
      },
    },
    tasks: [],
    status: 'completed',
    completedCount: 4,
    failedCount: 0,
    results: [
      createMockAsset('asset-1'),
      createMockAsset('asset-2'),
      createMockAsset('asset-3'),
      createMockAsset('asset-4'),
    ],
    favorites: new Set(['asset-1']),
    discarded: new Set(['asset-3']),
    createdAt: Date.now(),
    completedAt: Date.now(),
  });

  beforeEach(() => {
    // Reset store
    useGenerationStore.setState({
      activeBatch: null,
      batchHistory: [],
    });
  });

  it('should render batch gallery view', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    expect(screen.getByText('Batch Results')).toBeInTheDocument();
    expect(screen.getByText(/4 assets generated/i)).toBeInTheDocument();
  });

  it('should display asset count summary', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    expect(screen.getByText(/1 favorites/i)).toBeInTheDocument();
    expect(screen.getByText(/1 discarded/i)).toBeInTheDocument();
  });

  it('should render all non-discarded assets by default', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    // Should show 3 assets (4 total - 1 discarded)
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(3);
  });

  it('should filter to favorites view', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    const favoritesButton = screen.getByText(/favorites \(1\)/i);
    fireEvent.click(favoritesButton);
    
    // Should show only 1 favorite
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(1);
  });

  it('should filter to unselected view', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    const unselectedButton = screen.getByText('Unselected');
    fireEvent.click(unselectedButton);
    
    // Should show 2 assets (not favorited and not discarded)
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
  });

  it('should mark asset as favorite', () => {
    const batch = createMockBatch();
    useGenerationStore.setState({ activeBatch: batch });
    
    render(<BatchGalleryView batch={batch} />);
    
    const images = screen.getAllByRole('img');
    const firstAsset = images[0].closest('.group');
    
    // Hover to show controls
    fireEvent.mouseEnter(firstAsset!);
    
    const favoriteButton = screen.getAllByLabelText(/add to favorites/i)[0];
    fireEvent.click(favoriteButton);
    
    const store = useGenerationStore.getState();
    expect(store.activeBatch?.favorites.size).toBeGreaterThan(0);
  });

  it('should mark asset as discarded', () => {
    const batch = createMockBatch();
    useGenerationStore.setState({ activeBatch: batch });
    
    render(<BatchGalleryView batch={batch} />);
    
    const images = screen.getAllByRole('img');
    const firstAsset = images[0].closest('.group');
    
    // Hover to show controls
    fireEvent.mouseEnter(firstAsset!);
    
    const discardButton = screen.getAllByLabelText(/discard/i)[0];
    fireEvent.click(discardButton);
    
    const store = useGenerationStore.getState();
    expect(store.activeBatch?.discarded.size).toBeGreaterThan(0);
  });

  it('should clear all selections', () => {
    const batch = createMockBatch();
    useGenerationStore.setState({ activeBatch: batch });
    
    render(<BatchGalleryView batch={batch} />);
    
    const clearButton = screen.getByText('Clear Selections');
    fireEvent.click(clearButton);
    
    const store = useGenerationStore.getState();
    expect(store.activeBatch?.favorites.size).toBe(0);
    expect(store.activeBatch?.discarded.size).toBe(0);
  });

  it('should open asset detail modal on click', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    const images = screen.getAllByRole('img');
    fireEvent.click(images[0]);
    
    expect(screen.getByText('Asset Details')).toBeInTheDocument();
  });

  it('should close asset detail modal', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    const images = screen.getAllByRole('img');
    fireEvent.click(images[0]);
    
    const closeButton = screen.getAllByText('✕')[0];
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Asset Details')).not.toBeInTheDocument();
  });

  it('should display favorite badge on favorited assets', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    expect(screen.getByText('★ Favorite')).toBeInTheDocument();
  });

  it('should show empty state when no assets match filter', () => {
    const batch = createMockBatch();
    batch.results = [];
    render(<BatchGalleryView batch={batch} />);
    
    expect(screen.getByText('No assets to display')).toBeInTheDocument();
  });

  it('should render video assets with video element', () => {
    const batch = createMockBatch();
    batch.results = [createMockAsset('video-1', 'video')];
    render(<BatchGalleryView batch={batch} />);
    
    const container = screen.getByText('Batch Results').closest('.batch-gallery-view');
    const video = container?.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('should render audio assets with icon', () => {
    const batch = createMockBatch();
    batch.results = [createMockAsset('audio-1', 'audio')];
    render(<BatchGalleryView batch={batch} />);
    
    expect(screen.getByText('🎵')).toBeInTheDocument();
  });

  it('should display asset metadata in detail modal', () => {
    const batch = createMockBatch();
    render(<BatchGalleryView batch={batch} />);
    
    const images = screen.getAllByRole('img');
    fireEvent.click(images[0]);
    
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText(/file size/i)).toBeInTheDocument();
  });
});
