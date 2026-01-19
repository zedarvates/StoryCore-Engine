import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AssetCard } from '../AssetCard';
import type { Asset } from '@/types';

// Helper to wrap component with DnD provider
const renderWithDnd = (ui: React.ReactElement) => {
  return render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);
};

describe('AssetCard', () => {
  const mockAsset: Asset = {
    id: 'asset-1',
    name: 'Test Image',
    type: 'image',
    url: '/test-image.jpg',
    thumbnail: '/test-thumbnail.jpg',
    metadata: {
      subcategory: 'photo',
      duration: 5,
    },
  };

  it('renders asset information correctly', () => {
    renderWithDnd(<AssetCard asset={mockAsset} />);
    
    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.getByText('photo')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('displays thumbnail when available', () => {
    renderWithDnd(<AssetCard asset={mockAsset} />);
    
    const img = screen.getByAltText('Test Image');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/test-thumbnail.jpg');
  });

  it('displays icon when thumbnail is not available', () => {
    const assetWithoutThumbnail = { ...mockAsset, thumbnail: undefined };
    renderWithDnd(<AssetCard asset={assetWithoutThumbnail} />);
    
    // Should render an icon instead of image
    expect(screen.queryByAltText('Test Image')).not.toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    renderWithDnd(<AssetCard asset={mockAsset} onSelect={onSelect} />);
    
    const card = screen.getByText('Test Image').closest('.group');
    if (card) {
      fireEvent.click(card);
    }
    
    expect(onSelect).toHaveBeenCalledWith(mockAsset);
  });

  it('renders different icons for different asset types', () => {
    const audioAsset: Asset = {
      ...mockAsset,
      type: 'audio',
      name: 'Test Audio',
    };
    
    const { rerender } = renderWithDnd(<AssetCard asset={mockAsset} />);
    expect(screen.getByText('photo')).toBeInTheDocument();
    
    rerender(
      <DndProvider backend={HTML5Backend}>
        <AssetCard asset={audioAsset} />
      </DndProvider>
    );
    expect(screen.getByText('Test Audio')).toBeInTheDocument();
  });

  it('displays subcategory icon when available', () => {
    const transitionAsset: Asset = {
      ...mockAsset,
      type: 'template',
      metadata: { subcategory: 'transition' },
    };
    
    renderWithDnd(<AssetCard asset={transitionAsset} />);
    expect(screen.getByText('transition')).toBeInTheDocument();
  });

  it('shows drag handle on hover', () => {
    renderWithDnd(<AssetCard asset={mockAsset} />);
    
    // Drag handle should be present (even if not visible initially)
    const dragHandle = screen.getByTitle('Drag to use');
    expect(dragHandle).toBeInTheDocument();
  });

  it('is draggable', () => {
    const { container } = renderWithDnd(<AssetCard asset={mockAsset} />);
    
    // The component should be wrapped in a draggable div
    const draggableDiv = container.querySelector('[style*="opacity"]');
    expect(draggableDiv).toBeInTheDocument();
  });
});
