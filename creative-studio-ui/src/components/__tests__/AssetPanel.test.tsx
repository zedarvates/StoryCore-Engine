import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetPanel } from '../AssetPanel';
import { AssetLibraryService } from '@/services/assetLibraryService';
import { vi } from 'vitest';
import { useToast } from '@/hooks/use-toast';

// Mock the AssetLibraryService
vi.mock('@/services/assetLibraryService', () => ({
  AssetLibraryService: {
    getInstance: vi.fn(() => ({
      getAllAssets: vi.fn().mockResolvedValue([
        {
          id: 'source1',
          name: 'Test Source',
          assets: [
            { id: 'asset1', name: 'Test Image', type: 'image', thumbnail: 'test.jpg' },
            { id: 'asset2', name: 'Test Audio', type: 'audio' },
          ],
        },
      ]),
      searchAssets: vi.fn().mockImplementation((params, sources) => {
        if (params.query) {
          return sources.flatMap(s => s.assets).filter(a => a.name.includes(params.query));
        }
        if (params.category && params.category !== 'all') {
          return sources.flatMap(s => s.assets).filter(a => a.type === params.category);
        }
        return sources.flatMap(s => s.assets);
      }),
      refresh: vi.fn().mockResolvedValue([
        {
          id: 'source1',
          name: 'Test Source',
          assets: [
            { id: 'asset1', name: 'Test Image', type: 'image', thumbnail: 'test.jpg' },
            { id: 'asset2', name: 'Test Audio', type: 'audio' },
          ],
        },
      ]),
    })),
  },
  ASSET_CATEGORIES: [
    { id: 'image', name: 'Images' },
    { id: 'audio', name: 'Audio' },
    { id: 'video', name: 'Video' },
  ],
}));

describe('AssetPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock useToast hook
    vi.mock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: vi.fn(),
      }),
    }));
  });

  it('should render the AssetPanel component', async () => {
    render(<AssetPanel />);
    
    // Check if the component renders
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search assets...')).toBeInTheDocument();
    expect(screen.getByText('Import Assets')).toBeInTheDocument();
  });

  it('should load assets on mount', async () => {
    render(<AssetPanel />);
    
    // Wait for assets to load
    await waitFor(() => {
      expect(screen.getByText('Test Image')).toBeInTheDocument();
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });
  });

  it('should filter assets by search query', async () => {
    render(<AssetPanel />);
    
    // Wait for assets to load
    await waitFor(() => {
      expect(screen.getByText('Test Image')).toBeInTheDocument();
    });
    
    // Search for "Image"
    const searchInput = screen.getByPlaceholderText('Search assets...');
    fireEvent.change(searchInput, { target: { value: 'Image' } });
    
    // Should only show "Test Image"
    await waitFor(() => {
      expect(screen.getByText('Test Image')).toBeInTheDocument();
      expect(screen.queryByText('Test Audio')).not.toBeInTheDocument();
    });
  });

  it('should filter assets by category', async () => {
    render(<AssetPanel />);
    
    // Wait for assets to load
    await waitFor(() => {
      expect(screen.getByText('Test Image')).toBeInTheDocument();
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });
    
    // Click on "Audio" category
    const audioButton = screen.getByText('Audio');
    fireEvent.click(audioButton);
    
    // Should only show audio assets
    await waitFor(() => {
      expect(screen.queryByText('Test Image')).not.toBeInTheDocument();
      expect(screen.getByText('Test Audio')).toBeInTheDocument();
    });
  });

  it('should handle refresh assets', async () => {
    render(<AssetPanel />);
    
    // Wait for assets to load
    await waitFor(() => {
      expect(screen.getByText('Test Image')).toBeInTheDocument();
    });
    
    // Click refresh button
    const refreshButton = screen.getByLabelText('Refresh asset library');
    fireEvent.click(refreshButton);
    
    // Should reload assets
    await waitFor(() => {
      expect(screen.getByText('Test Image')).toBeInTheDocument();
    });
  });

  it('should handle import assets', async () => {
    render(<AssetPanel />);
    
    // Click import button
    const importButton = screen.getByLabelText('Import new assets');
    fireEvent.click(importButton);
    
    // Should trigger file input click
    expect(document.createElement).toHaveBeenCalledWith('input');
  });
});