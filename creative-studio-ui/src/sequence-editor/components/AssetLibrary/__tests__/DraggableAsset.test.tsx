/**
 * DraggableAsset Component Tests
 * 
 * Tests for the draggable asset component with drag-and-drop functionality.
 * Requirements: 15.1 - Drag-and-drop interaction system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableAsset, DND_ITEM_TYPES } from '../DraggableAsset';
import type { Asset } from '../../../types';

// ============================================================================
// Test Utilities
// ============================================================================

const mockAsset: Asset = {
  id: 'test-asset-1',
  name: 'Test Character',
  type: 'character',
  category: 'characters',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  metadata: {
    description: 'A test character asset for unit testing',
    characterMetadata: {
      age: '25',
      gender: 'neutral',
      appearance: 'Test appearance',
      personality: 'Test personality',
    },
  },
  tags: ['test', 'character', 'hero'],
  source: 'builtin',
  createdAt: new Date('2024-01-01'),
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
  let onPreview: ReturnType<typeof vi.fn>;
  let onEdit: ReturnType<typeof vi.fn>;
  let onDelete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPreview = vi.fn();
    onEdit = vi.fn();
    onDelete = vi.fn();
  });

  describe('Rendering', () => {
    it('should render asset with thumbnail and name', () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      expect(screen.getByText('Test Character')).toBeInTheDocument();
      expect(screen.getByAltText('Test Character')).toBeInTheDocument();
    });

    it('should render asset description', () => {
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

    it('should render asset tags', () => {
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

    it('should render source indicator for builtin assets', () => {
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

    it('should render source indicator for AI-generated assets', () => {
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

    it('should render action buttons in overlay', () => {
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
    it('should call onClick when asset is clicked', () => {
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

    it('should call onEdit when asset is double-clicked', () => {
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

    it('should call onPreview when preview button is clicked', () => {
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

    it('should call onEdit when edit button is clicked', () => {
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

    it('should call onDelete when delete button is clicked', () => {
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
  });

  describe('Drag and Drop', () => {
    it('should have correct data attributes for drag operations', () => {
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

    it('should have grab cursor by default', () => {
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
    it('should have accessible labels for action buttons', () => {
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

    it('should have alt text for thumbnail image', () => {
      renderWithDnd(
        <DraggableAsset
          asset={mockAsset}
          categoryId="characters"
          onPreview={onPreview}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      );

      const image = screen.getByAltText('Test Character');
      expect(image).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle long asset names with ellipsis', () => {
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

    it('should handle long descriptions with truncation', () => {
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

    it('should handle assets with many tags', () => {
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

    it('should handle missing callbacks gracefully', () => {
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
  });
});
