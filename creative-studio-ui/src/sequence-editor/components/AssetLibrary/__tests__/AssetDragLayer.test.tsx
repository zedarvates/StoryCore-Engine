/**
 * AssetDragLayer Component Tests
 * 
 * Tests for the custom drag layer that displays ghost images during drag operations.
 * Requirements: 15.1 - Display ghost image following cursor during drag
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndProvider, useDragLayer } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AssetDragLayer } from '../AssetDragLayer';
import { DND_ITEM_TYPES } from '../DraggableAsset';
import type { Asset } from '../../../types';

// ============================================================================
// Mock useDragLayer
// ============================================================================

vi.mock('react-dnd', async () => {
  const actual = await vi.importActual('react-dnd');
  return {
    ...actual,
    useDragLayer: vi.fn(),
  };
});

const mockUseDragLayer = useDragLayer as ReturnType<typeof vi.fn>;

// ============================================================================
// Test Data
// ============================================================================

const mockAsset: Asset = {
  id: 'test-asset-1',
  name: 'Test Character',
  type: 'character',
  category: 'characters',
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  metadata: {
    description: 'A test character asset',
  },
  tags: ['test'],
  source: 'builtin',
  createdAt: new Date('2024-01-01'),
};

const mockDragItem = {
  asset: mockAsset,
  categoryId: 'characters',
  type: DND_ITEM_TYPES.ASSET,
};

// ============================================================================
// Test Utilities
// ============================================================================

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

describe('AssetDragLayer', () => {
  describe('Rendering', () => {
    it('should not render when not dragging', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: null,
        isDragging: false,
        item: null,
        initialOffset: null,
        currentOffset: null,
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      expect(container.querySelector('.asset-drag-layer')).not.toBeInTheDocument();
    });

    it('should not render when dragging wrong item type', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: 'other-type',
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      expect(container.querySelector('.asset-drag-layer')).not.toBeInTheDocument();
    });

    it('should render when dragging asset', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      expect(screen.getByText('Test Character')).toBeInTheDocument();
      expect(screen.getByText('character')).toBeInTheDocument();
    });

    it('should render asset thumbnail in drag preview', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      const thumbnail = screen.getByAltText('Test Character');
      expect(thumbnail).toBeInTheDocument();
      expect(thumbnail).toHaveAttribute('src', mockAsset.thumbnailUrl);
    });

    it('should render drag icon in preview overlay', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      expect(screen.getByText('🎯')).toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should apply transform based on current offset', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 150, y: 200 },
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      const preview = container.querySelector('.asset-drag-preview') as HTMLElement;
      expect(preview).toBeInTheDocument();
      
      if (preview) {
        const style = preview.style;
        expect(style.transform).toContain('translate(150px, 200px)');
      }
    });

    it('should hide preview when offsets are null', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: null,
        currentOffset: null,
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      const preview = container.querySelector('.asset-drag-preview') as HTMLElement;
      expect(preview).toBeInTheDocument();
      
      if (preview) {
        const style = preview.style;
        expect(style.display).toBe('none');
      }
    });

    it('should apply margin offset to preview', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      const preview = container.querySelector('.asset-drag-preview') as HTMLElement;
      expect(preview).toBeInTheDocument();
      
      if (preview) {
        const style = preview.style;
        expect(style.marginLeft).toBe('10px');
        expect(style.marginTop).toBe('10px');
      }
    });
  });

  describe('Asset Information Display', () => {
    it('should display asset name', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      expect(screen.getByText('Test Character')).toBeInTheDocument();
    });

    it('should display asset type', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      expect(screen.getByText('character')).toBeInTheDocument();
    });

    it('should handle different asset types', () => {
      const environmentAsset = {
        ...mockAsset,
        type: 'environment' as const,
      };

      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: {
          asset: environmentAsset,
          categoryId: 'environments',
          type: DND_ITEM_TYPES.ASSET,
        },
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      expect(screen.getByText('environment')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing item gracefully', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: null,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      expect(container.querySelector('.asset-drag-layer')).not.toBeInTheDocument();
    });

    it('should handle long asset names', () => {
      const longNameAsset = {
        ...mockAsset,
        name: 'This is a very long asset name that should be handled properly',
      };

      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: {
          asset: longNameAsset,
          categoryId: 'characters',
          type: DND_ITEM_TYPES.ASSET,
        },
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      const nameElement = screen.getByText(longNameAsset.name);
      expect(nameElement).toHaveClass('asset-drag-name');
    });

    it('should handle image load errors', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      renderWithDnd(<AssetDragLayer />);
      
      const image = screen.getByAltText('Test Character') as HTMLImageElement;
      
      // Simulate image error
      const errorEvent = new Event('error');
      image.dispatchEvent(errorEvent);
      
      // Should have fallback SVG
      expect(image.src).toContain('data:image/svg+xml');
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      expect(container.querySelector('.asset-drag-layer')).toBeInTheDocument();
      expect(container.querySelector('.asset-drag-preview')).toBeInTheDocument();
      expect(container.querySelector('.asset-drag-preview-content')).toBeInTheDocument();
      expect(container.querySelector('.asset-drag-thumbnail')).toBeInTheDocument();
      expect(container.querySelector('.drag-preview-overlay')).toBeInTheDocument();
      expect(container.querySelector('.asset-drag-info')).toBeInTheDocument();
    });

    it('should have drag icon with correct class', () => {
      mockUseDragLayer.mockReturnValue({
        itemType: DND_ITEM_TYPES.ASSET,
        isDragging: true,
        item: mockDragItem,
        initialOffset: { x: 0, y: 0 },
        currentOffset: { x: 100, y: 100 },
      });

      const { container } = renderWithDnd(<AssetDragLayer />);
      
      const dragIcon = container.querySelector('.drag-icon');
      expect(dragIcon).toBeInTheDocument();
      expect(dragIcon).toHaveTextContent('🎯');
    });
  });
});
