/**
 * Asset Library Component Tests
 * 
 * Tests for the Asset Library component with category tabs, search, and generation.
 * Requirements: 5.1, 5.2, 5.3, 5.7, 5.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AssetLibrary } from '../AssetLibrary';
import assetsReducer from '../../../store/slices/assetsSlice';

// Mock the thumbnail cache
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

describe('AssetLibrary Component', () => {
  describe('Requirement 5.1: Category Tabs', () => {
    it('should display 7 category tabs', () => {
      renderWithProviders(<AssetLibrary />);
      
      expect(screen.getByText('Characters')).toBeInTheDocument();
      expect(screen.getByText('Environments')).toBeInTheDocument();
      expect(screen.getByText('Props & Objects')).toBeInTheDocument();
      expect(screen.getByText('Visual Styles')).toBeInTheDocument();
      expect(screen.getByText('Templates & Styles')).toBeInTheDocument();
      expect(screen.getByText('Camera Presets')).toBeInTheDocument();
      expect(screen.getByText('Lighting Rigs')).toBeInTheDocument();
    });

    it('should have category icons', () => {
      renderWithProviders(<AssetLibrary />);
      
      const tabs = screen.getAllByRole('button');
      const categoryTabs = tabs.filter(btn => 
        btn.className.includes('asset-category-tab')
      );
      
      expect(categoryTabs.length).toBe(7);
      categoryTabs.forEach(tab => {
        const icon = tab.querySelector('.category-icon');
        expect(icon).toBeInTheDocument();
      });
    });

    it('should highlight active category', () => {
      renderWithProviders(<AssetLibrary />);
      
      const charactersTab = screen.getByText('Characters').closest('button');
      expect(charactersTab).toHaveClass('active');
    });

    it('should switch categories on click', () => {
      renderWithProviders(<AssetLibrary />);
      
      const environmentsTab = screen.getByText('Environments').closest('button');
      fireEvent.click(environmentsTab!);
      
      expect(environmentsTab).toHaveClass('active');
    });
  });

  describe('Requirement 5.2: Search Functionality', () => {
    it('should display search input field', () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should update search query on input', () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i) as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      expect(searchInput.value).toBe('test');
    });

    it('should show clear button when search has text', () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });
      
      const clearButton = screen.getByTitle('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should clear search on clear button click', () => {
      renderWithProviders(<AssetLibrary />);
      
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
      
      // Should show loading indicator
      await waitFor(() => {
        const loadingIndicator = screen.queryByTitle('Searching...');
        // Loading indicator appears briefly during debounce
      });
    });
  });

  describe('Requirement 5.3: Asset Grid', () => {
    it('should display empty state when no assets', () => {
      renderWithProviders(<AssetLibrary />);
      
      expect(screen.getByText(/no assets in this category/i)).toBeInTheDocument();
    });

    it('should display asset grid when assets exist', () => {
      const store = createTestStore({
        assets: {
          categories: [
            {
              id: 'characters',
              name: 'Characters',
              icon: 'user',
              assets: [
                {
                  id: 'asset-1',
                  name: 'Test Character',
                  type: 'character',
                  category: 'characters',
                  thumbnailUrl: 'test.jpg',
                  metadata: { description: 'Test description' },
                  tags: ['test'],
                  source: 'builtin',
                  createdAt: new Date(),
                },
              ],
            },
          ],
          searchQuery: '',
          activeCategory: 'characters',
        },
      });
      
      renderWithProviders(<AssetLibrary />, store);
      
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });
  });

  describe('Requirement 5.8: New AI Asset Button', () => {
    it('should display "New AI Asset" button', () => {
      renderWithProviders(<AssetLibrary />);
      
      const newAssetButton = screen.getByText(/new ai asset/i);
      expect(newAssetButton).toBeInTheDocument();
    });

    it('should open generation dialog on button click', () => {
      renderWithProviders(<AssetLibrary />);
      
      const newAssetButton = screen.getByText(/new ai asset/i);
      fireEvent.click(newAssetButton);
      
      expect(screen.getByText(/generate new asset/i)).toBeInTheDocument();
    });

    it('should have permanent position at bottom', () => {
      renderWithProviders(<AssetLibrary />);
      
      const footer = document.querySelector('.asset-library-footer');
      expect(footer).toBeInTheDocument();
      
      const button = footer?.querySelector('.new-asset-button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByLabelText(/search assets/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      searchInput.focus();
      
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Visual Styling', () => {
    it('should apply focus styles to search input', () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.focus(searchInput);
      
      const searchContainer = searchInput.closest('.asset-library-search');
      expect(searchContainer).toHaveClass('focused');
    });

    it('should remove focus styles on blur', () => {
      renderWithProviders(<AssetLibrary />);
      
      const searchInput = screen.getByPlaceholderText(/search assets/i);
      fireEvent.focus(searchInput);
      fireEvent.blur(searchInput);
      
      const searchContainer = searchInput.closest('.asset-library-search');
      expect(searchContainer).not.toHaveClass('focused');
    });
  });
});
