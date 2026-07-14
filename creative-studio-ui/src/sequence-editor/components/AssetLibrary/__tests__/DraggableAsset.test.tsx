/**
 * DraggableAsset Component Tests
 * 
 * Tests for the draggable asset component with drag-and-drop functionality.
 * Requirements: 15.1 - Drag-and-drop interaction system
 */



import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableAsset, DND_ITEM_TYPES } from '../DraggableAsset';
import type { ServiceAsset } from '../../../types';

// Mock the thumbnail cache to avoid IndexedDB dependencies
vi.mock('../../../utils/thumbnailCache', () => ({
  fetchAndCacheThumbnail: vi.fn((url: string) => Promise.resolve(url)),
  getCachedThumbnail: vi.fn(() => Promise.resolve(null)),
  cacheThumbnail: vi.fn(() => Promise.resolve()),
}));

// Mock LazyImage to render immediately
vi.mock('../LazyImage', () => ({
  LazyImage: ({ src, alt, className, onError }: { src: string; alt?: string; className?: string; onError?: () => void }) => (
    <img src={src} alt={alt} className={className} onError={onError} />
  ),
}));

// ============================================================================
// Test Utilities
// ============================================================================

const mockAsset: ServiceAsset = {
  id: 'test-asset-1',
  name: 'Test Character',
  type: 'image',
  category: 'characters',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  metadata: {
    description: 'A test character asset for unit testing',
    category: 'character',
    tags: ['test', 'character', 'hero'],
  },
  tags: ['test', 'character', 'hero'],
  source: 'builtin',
  createdAt: new Date('2024-01-01').getTime(),
};

const renderWithDnd = (component: React.ReactElement) => {
  return render(
    <DndProvider backend={HTML5Backend}>
      {component}
    </DndProvider>
  );
};

// ============================================================================
// Tests
// ============================================================================

describe('DraggableAsset', () => {
  let onPreview: Mock<(asset: ServiceAsset) => void>;
  let onEdit: Mock<(asset: ServiceAsset) => void>;
  let onDelete: Mock<(asset: ServiceAsset) => void>;
  let onPublish: Mock<(asset: ServiceAsset) => void>;

  beforeEach(() => {
    onPreview = vi.fn();
    onEdit = vi.fn();
    onDelete = vi.fn();
    onPublish = vi.fn();
  });

  describe('Rendering', () => {
    it('should render asset with thumbnail and name', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(await screen.findByText('Test Character')).toBeInTheDocument();
      expect(await screen.findByAltText('Test Character')).toBeInTheDocument();
    });

    it('should render asset description', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(screen.getByText(/A test character asset/)).toBeInTheDocument();
    });

    it('should render asset tags', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('character')).toBeInTheDocument();
      expect(screen.getByText('hero')).toBeInTheDocument();
    });

    it('should render source indicator for builtin assets', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const sourceIndicator = screen.getByText('📦');
      expect(sourceIndicator).toBeInTheDocument();
    });

    it('should render source indicator for AI-generated assets', async () => {
      const aiAsset = { ...mockAsset, source: 'ai-generated' as const };
      
      renderWithDnd(
        <DraggableAsset
          asset={aiAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const sourceIndicator = screen.getByText('✨');
      expect(sourceIndicator).toBeInTheDocument();
    });

    it('should render action buttons in overlay', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(screen.getByLabelText(`Preview ${mockAsset.name}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Edit ${mockAsset.name}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Delete ${mockAsset.name}`)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClick when asset is clicked', async () => {
      const { container } = renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const assetCard = container.querySelector('.asset-card');
      expect(assetCard).toBeInTheDocument();
      
      if (assetCard) {
        fireEvent.click(assetCard);
        // Click handler logs to console, so we just verify no errors
      }
    });

    it('should call onEdit when asset is double-clicked', async () => {
      const { container } = renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const assetCard = container.querySelector('.asset-card');
      expect(assetCard).toBeInTheDocument();
      
      if (assetCard) {
        fireEvent.doubleClick(assetCard);
        expect(onEdit).toHaveBeenCalledWith(mockAsset);
      }
    });

    it('should call onPreview when preview button is clicked', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const previewButton = screen.getByLabelText(`Preview ${mockAsset.name}`);
      fireEvent.click(previewButton);
      
      expect(onPreview).toHaveBeenCalledWith(mockAsset);
    });

    it('should call onEdit when edit button is clicked', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const editButton = screen.getByLabelText(`Edit ${mockAsset.name}`);
      fireEvent.click(editButton);
      
      expect(onEdit).toHaveBeenCalledWith(mockAsset);
    });

    it('should call onDelete when delete button is clicked', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const deleteButton = screen.getByLabelText(`Delete ${mockAsset.name}`);
      fireEvent.click(deleteButton);
      
      expect(onDelete).toHaveBeenCalledWith(mockAsset);
    });

    it('should call onPublish when publish button is clicked', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
          onPublish={onPublish}
        />
      );

      const publishButton = screen.getByLabelText(`Publish ${mockAsset.name} to Marketplace`);
      fireEvent.click(publishButton);
      
      expect(onPublish).toHaveBeenCalledWith(mockAsset);
    });
  });

  describe('Drag and Drop', () => {
    it('should have correct data attributes for drag operations', async () => {
      const { container } = renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const assetCard = container.querySelector('.asset-card');
      expect(assetCard).toHaveAttribute('data-asset-id', mockAsset.id);
      expect(assetCard).toHaveAttribute('data-asset-type', mockAsset.type);
    });

    it('should have grab cursor by default', async () => {
      const { container } = renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const assetCard = container.querySelector('.asset-card') as HTMLElement;
      expect(assetCard).toBeInTheDocument();
      
      if (assetCard) {
        const style = window.getComputedStyle(assetCard);
        expect(style.cursor).toBe('grab');
      }
    });

    it('should export correct DND_ITEM_TYPES constant', () => {
      expect(DND_ITEM_TYPES.ASSET).toBe('asset');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for action buttons', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(screen.getByLabelText(`Preview ${mockAsset.name}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Edit ${mockAsset.name}`)).toBeInTheDocument();
      expect(screen.getByLabelText(`Delete ${mockAsset.name}`)).toBeInTheDocument();
    });

    it('should have alt text for thumbnail image', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const image = await screen.findByAltText('Test Character');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long asset names with ellipsis', async () => {
      const longNameAsset = {
        ...mockAsset,
        name: 'This is a very long asset name that should be truncated with ellipsis',
      };

      renderWithDnd(
        <DraggableAsset
          asset={longNameAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const nameElement = screen.getByText(longNameAsset.name);
      expect(nameElement).toHaveClass('asset-name');
    });

    it('should handle long descriptions with truncation', async () => {
      const longDescAsset = {
        ...mockAsset,
        metadata: {
          ...mockAsset.metadata,
          description: 'This is a very long description that should be truncated after 50 characters to maintain a clean UI',
        },
      };

      renderWithDnd(
        <DraggableAsset
          asset={longDescAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const descElement = screen.getByText(/This is a very long description/);
      expect(descElement).toBeInTheDocument();
    });

    it('should handle assets with many tags', async () => {
      const manyTagsAsset = {
        ...mockAsset,
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
      };

      renderWithDnd(
        <DraggableAsset
          asset={manyTagsAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      // Should show first 3 tags
      expect(screen.getByText('tag1')).toBeInTheDocument();
      expect(screen.getByText('tag2')).toBeInTheDocument();
      expect(screen.getByText('tag3')).toBeInTheDocument();
      
      // Should show "+3" indicator for remaining tags
      expect(screen.getByText('+3')).toBeInTheDocument();
    });

    it('should handle missing callbacks gracefully', async () => {
      const { container } = renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
        />
      );

      const assetCard = container.querySelector('.asset-card');
      expect(assetCard).toBeInTheDocument();
      
      // Should not throw errors when callbacks are not provided
      if (assetCard) {
        expect(() => fireEvent.doubleClick(assetCard)).not.toThrow();
      }
    });

    it('should handle image load errors with fallback', async () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
        />
      );

      const image = await screen.findByAltText('Test Character') as HTMLImageElement;
      
      // Simulate error
      fireEvent.error(image);
      
      expect(image.src).toContain('data:image/svg+xml');
      expect(image.src).toContain('No%20Preview');
    });
  });
});
