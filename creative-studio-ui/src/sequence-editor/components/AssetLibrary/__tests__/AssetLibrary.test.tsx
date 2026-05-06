/**
 * Asset Library Component Tests
 * 
 * Tests for the Asset Library component with category tabs, search, and generation.
 * Requirements: 5.1, 5.2, 5.3, 5.7, 5.8
 */
import { LegacyAny } from '@/types/legacy';


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AssetLibrary } from '../AssetLibrary';
import { AssetLibraryService } from '../../../../services/assetLibraryService';
import assetsReducer from '../../../store/slices/assetsSlice';
import timelineReducer from '../../../store/slices/timelineSlice';
import historyReducer from '../../../store/slices/historySlice';

// Mock the thumbnail cache to avoid IndexedDB dependencies
vi.mock('../../../utils/thumbnailCache', () => ({
  fetchAndCacheThumbnail: vi.fn((url: string) => Promise.resolve(url)),
  getCachedThumbnail: vi.fn(() => Promise.resolve(null)),
  cacheThumbnail: vi.fn(() => Promise.resolve()),
  clearThumbnailCache: vi.fn(() => Promise.resolve()),
  getCacheStats: vi.fn(() => Promise.resolve({ count: 0, size: 0 })),
}));

// Helper to create a test store
function createTestStore(initialState = {}) {
  return configureStore({
    reducer: {
      assets: assetsReducer,
      timeline: timelineReducer,
      history: historyReducer,
    },
    preloadedState: initialState,
  });
}

// Helper to render with providers
function renderWithProviders(component: React.ReactElement, store = createTestStore()) {
  return render(
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        {component}
      </DndProvider>
    </Provider>
  );
}

// Helper to render and wait for initial loading to finish
async function renderAndLoading(component: React.ReactElement, store = createTestStore()) {
  const result = renderWithProviders(component, store);
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  }, { timeout: 2000 });
  return result;
}

describe('AssetLibrary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for asset service
    vi.spyOn(AssetLibraryService, 'getInstance').mockReturnValue({
      getAllAssets: vi.fn().mockResolvedValue([]),
    } as LegacyAny);
  });

  describe('Requirement 5.1: Category Tabs', () => {
    it('should display 10 category tabs', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const tabs = screen.getAllByRole('button');
      const categoryTabs = tabs.filter(btn => 
        btn.className.includes('asset-category-tab')
      );
      expect(categoryTabs.length).toBe(10);
      
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('Environments')).toBeInTheDocument();
      expect(screen.getByText('Props & Objects')).toBeInTheDocument();
      expect(screen.getByText('Visual Styles')).toBeInTheDocument();
      expect(screen.getByText('Templates')).toBeInTheDocument();
      expect(screen.getByText('Camera Presets')).toBeInTheDocument();
      expect(screen.getByText('Transitions')).toBeInTheDocument();
      expect(screen.getByText('Effects')).toBeInTheDocument();
      expect(screen.getByText('Audio & Sound')).toBeInTheDocument();
      expect(screen.getByText('My Presets')).toBeInTheDocument();
    });

    it('should have category icons', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const tabs = screen.getAllByRole('button');
      const categoryTabs = tabs.filter(btn => 
        btn.className.includes('asset-category-tab')
      );
      
      expect(categoryTabs.length).toBe(10);
      categoryTabs.forEach(tab => {
        const icon = tab.querySelector('.category-icon');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should highlight active category', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const environmentsTab = screen.getByText('Environments').closest('button');
      expect(environmentsTab).toHaveClass('active');
    });

    it('should switch categories on click', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const environmentsTab = screen.getByText('Environments').closest('button');
      fireEvent.click(environmentsTab!);
      
      expect(environmentsTab).toHaveClass('active');
    });
  });

  describe('Requirement 5.2: Search Functionality', () => {
    it('should display search input field', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search query on input', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(searchInput.value).toBe('test');
    });

    it('should show clear button when search has text', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const clearButton = screen.getByTitle('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search on clear button click', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const clearButton = screen.getByTitle('Clear search');
      fireEvent.click(clearButton);
      
      expect(searchInput.value).toBe('');
    });

    it('should debounce search input', async () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      
      // Type quickly
      fireEvent.change(searchInput, { target: { value: 't' } });
      fireEvent.change(searchInput, { target: { value: 'te' } });
      fireEvent.change(searchInput, { target: { value: 'tes' } });
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      // Shoul_d show loading indicator
      await waitFor(() => {
        const loadingIndicator = screen.queryByTitle('Searching...');
        // Loading indicator appears briefly during debounce
      });
    });
  });

  describe('Requirement 5.3: Asset Grid', () => {
    it('should display empty state when no assets', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      // Wait for loading to finish
      await waitFor(() => {
        expect(screen.queryByText(/loading assets/i)).not.toBeInTheDocument();
      });
      
      expect(screen.getByText(/no assets in this category/i)).toBeInTheDocument();
    });

    it('should display asset grid when assets exist', async () => {
      const mockAssets = [
        {
          id: '1',
          name: 'Test Character',
          type: 'image',
          thumbnail: 'char1.png',
          source: 'builtin',
          tags: ['character', 'test'],
          metadata: {
            category: 'character',
            tags: ['character', 'test']
          }
        },
      ];

      // Setup mock BEFORE rendering
      vi.spyOn(AssetLibraryService, 'getInstance').mockReturnValue({
        getAllAssets: vi.fn().mockResolvedValue([
          {
            id: 'source-1',
            name: 'Test Source',
            type: 'library',
            assets: mockAssets,
          }
        ]),
      } as LegacyAny);
      
      // Use act to wrap render when state updates are expected
      await renderAndLoading(<AssetLibrary />);

      // Switch to Characters tab
      const charactersTab = screen.getByRole('button', { name: /characters/i });
      fireEvent.click(charactersTab);

      // Use findByText to wait for the asset to appear
      const asset = await screen.findByText('Test Character', {}, { timeout: 3000 });
      expect(asset).toBeInTheDocument();
    });
  });

  describe('Requirement 5.8: New AI Asset Button', () => {
    it('should display "New AI Asset" button', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const newAssetButton = screen.getByText(/new ai asset/i);
      expect(newAssetButton).toBeInTheDocument();
    });

    it('should open generation dialog on button click', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const newAssetButton = screen.getByText(/new ai asset/i);
      fireEvent.click(newAssetButton);
      
      expect(screen.getByText(/generate new asset/i)).toBeInTheDocument();
    });

    it('should have permanent position at bottom', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const footer = document.querySelector('.asset-library-footer');
      expect(footer).toBeInTheDocument();
      
      const button = footer?.querySelector('.new-asset-button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByLabelText(/search assets/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      searchInput.focus();
      
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Visual Styling', () => {
    it('should apply focus styles to search input', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.focus(searchInput);
      
      const searchContainer = searchInput.closest('.asset-library-search');
      expect(searchContainer).toHaveClass('focused');
    });

    it('should remove focus styles on blur', async () => {
      await renderAndLoading(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.focus(searchInput);
      fireEvent.blur(searchInput);
      
      const searchContainer = searchInput.closest('.asset-library-search');
      expect(searchContainer).not.toHaveClass('focused');
    });
  });
});
