import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { AssetLibrary } from '../AssetLibrary';
import type { Asset } from '@/types';

// Mock the store
const mockAddAsset = vi.fn();
vi.mock('@/store', () => ({
  useStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ addAsset: mockAddAsset });
    }
    return { addAsset: mockAddAsset };
  }),
}));

// Helper to wrap component with DnD provider
const renderWithDnd = (ui: React.ReactElement) => {
  return render(<DndProvider backend={HTML5Backend}>{ui}</DndProvider>);
};

// Mock Radix UI components to avoid SSR issues in tests
vi.mock('@radix-ui/react-scroll-area', () => ({
  Root: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Viewport: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Corner: () => null,
  ScrollAreaScrollbar: () => null,
}));

vi.mock('@radix-ui/react-tabs', () => ({
  Root: ({ children, value, onValueChange, ...props }: any) => (
    <div data-value={value} {...props}>{children}</div>
  ),
  List: ({ children, ...props }: any) => <div role="tablist" {...props}>{children}</div>,
  Trigger: ({ children, value, ...props }: any) => (
    <button role="tab" data-value={value} {...props}>{children}</button>
  ),
  Content: ({ children, value, ...props }: any) => (
    <div role="tabpanel" data-value={value} {...props}>{children}</div>
  ),
}));

// Mock assets for testing
const mockAssets: Asset[] = [
  {
    id: 'asset-1',
    name: 'Sunset Image',
    type: 'image',
    url: '/assets/sunset.jpg',
    thumbnail: '/assets/sunset-thumb.jpg',
  },
  {
    id: 'asset-2',
    name: 'Background Music',
    type: 'audio',
    url: '/assets/music.mp3',
  },
  {
    id: 'asset-3',
    name: 'Fade Transition',
    type: 'template',
    url: '/templates/fade.json',
    metadata: {
      subcategory: 'transition',
    },
  },
  {
    id: 'asset-4',
    name: 'Blur Effect',
    type: 'template',
    url: '/templates/blur.json',
    metadata: {
      subcategory: 'effect',
    },
  },
  {
    id: 'asset-5',
    name: 'Title Template',
    type: 'template',
    url: '/templates/title.json',
    metadata: {
      subcategory: 'text-template',
    },
  },
  {
    id: 'asset-6',
    name: 'Shot Template',
    type: 'template',
    url: '/templates/shot.json',
  },
];

describe('AssetLibrary', () => {
  beforeEach(() => {
    mockAddAsset.mockClear();
  });

  it('renders without crashing', () => {
    renderWithDnd(<AssetLibrary assets={[]} />);
    expect(screen.getByText('Asset Library')).toBeInTheDocument();
  });

  it('displays upload button', () => {
    renderWithDnd(<AssetLibrary assets={[]} />);
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
  });

  it('displays all assets in the "All Assets" tab', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Check that the count is correct
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('displays correct count for each category', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // All Assets: 6
    const allTab = screen.getByRole('tab', { name: /All Assets/i });
    expect(allTab).toHaveTextContent('6');
    
    // Images: 1
    const imagesTab = screen.getByRole('tab', { name: /Images/i });
    expect(imagesTab).toHaveTextContent('1');
    
    // Audio: 1
    const audioTab = screen.getByRole('tab', { name: /Audio/i });
    expect(audioTab).toHaveTextContent('1');
    
    // Templates: 1 (only the one without subcategory)
    const templatesTab = screen.getByRole('tab', { name: /^Templates/i });
    expect(templatesTab).toHaveTextContent('1');
    
    // Transitions: 1
    const transitionsTab = screen.getByRole('tab', { name: /Transitions/i });
    expect(transitionsTab).toHaveTextContent('1');
    
    // Effects: 1
    const effectsTab = screen.getByRole('tab', { name: /Effects/i });
    expect(effectsTab).toHaveTextContent('1');
    
    // Text Templates: 1
    const textTemplatesTab = screen.getByRole('tab', { name: /Text Templates/i });
    expect(textTemplatesTab).toHaveTextContent('1');
  });

  it('filters assets by category when tab is clicked', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Click on Images tab
    const imagesTab = screen.getByRole('tab', { name: /Images/i });
    fireEvent.click(imagesTab);
    
    // Should show only image assets
    expect(screen.getByText('Sunset Image')).toBeInTheDocument();
    expect(screen.queryByText('Background Music')).not.toBeInTheDocument();
  });

  it('filters assets by search query', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search assets...');
    fireEvent.change(searchInput, { target: { value: 'music' } });
    
    // Should show only matching assets
    expect(screen.getByText('Background Music')).toBeInTheDocument();
    expect(screen.queryByText('Sunset Image')).not.toBeInTheDocument();
  });

  it('shows empty state when no assets match search', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Type in search box with no matches
    const searchInput = screen.getByPlaceholderText('Search assets...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    // Should show empty state
    expect(screen.getByText('No assets found')).toBeInTheDocument();
    expect(screen.getByText('Try adjusting your search query')).toBeInTheDocument();
  });

  it('shows empty state when no assets are provided', () => {
    renderWithDnd(<AssetLibrary assets={[]} />);
    
    // Should show empty state
    expect(screen.getByText('No assets found')).toBeInTheDocument();
    expect(screen.getByText('Upload assets to get started')).toBeInTheDocument();
  });

  it('calls onAssetSelect when an asset is clicked', () => {
    const onAssetSelect = vi.fn();
    renderWithDnd(<AssetLibrary assets={mockAssets} onAssetSelect={onAssetSelect} />);
    
    // Click on an asset
    const assetCard = screen.getByText('Sunset Image').closest('div[class*="group"]');
    if (assetCard) {
      fireEvent.click(assetCard);
    }
    
    // Should call the callback with the asset
    expect(onAssetSelect).toHaveBeenCalledWith(mockAssets[0]);
  });

  it('filters transitions correctly', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Click on Transitions tab
    const transitionsTab = screen.getByRole('tab', { name: /Transitions/i });
    fireEvent.click(transitionsTab);
    
    // Should show only transition assets
    expect(screen.getByText('Fade Transition')).toBeInTheDocument();
    expect(screen.queryByText('Blur Effect')).not.toBeInTheDocument();
    expect(screen.queryByText('Title Template')).not.toBeInTheDocument();
  });

  it('filters effects correctly', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Click on Effects tab
    const effectsTab = screen.getByRole('tab', { name: /Effects/i });
    fireEvent.click(effectsTab);
    
    // Should show only effect assets
    expect(screen.getByText('Blur Effect')).toBeInTheDocument();
    expect(screen.queryByText('Fade Transition')).not.toBeInTheDocument();
    expect(screen.queryByText('Title Template')).not.toBeInTheDocument();
  });

  it('filters text templates correctly', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Click on Text Templates tab
    const textTemplatesTab = screen.getByRole('tab', { name: /Text Templates/i });
    fireEvent.click(textTemplatesTab);
    
    // Should show only text template assets
    expect(screen.getByText('Title Template')).toBeInTheDocument();
    expect(screen.queryByText('Fade Transition')).not.toBeInTheDocument();
    expect(screen.queryByText('Blur Effect')).not.toBeInTheDocument();
  });

  it('combines category and search filters', () => {
    renderWithDnd(<AssetLibrary assets={mockAssets} />);
    
    // Click on Templates tab
    const templatesTab = screen.getByRole('tab', { name: /^Templates/i });
    fireEvent.click(templatesTab);
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search assets...');
    fireEvent.change(searchInput, { target: { value: 'shot' } });
    
    // Should show only matching template assets
    expect(screen.getByText('Shot Template')).toBeInTheDocument();
    expect(screen.queryByText('Fade Transition')).not.toBeInTheDocument();
  });

  describe('Asset Upload', () => {
    it('categorizes image files correctly', async () => {
      renderWithDnd(<AssetLibrary assets={[]} />);
      
      const file = new File(['image content'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        fireEvent.change(input, { target: { files: [file] } });
        
        await waitFor(() => {
          expect(mockAddAsset).toHaveBeenCalled();
          const addedAsset = mockAddAsset.mock.calls[0][0];
          expect(addedAsset.type).toBe('image');
          expect(addedAsset.name).toBe('test.jpg');
        });
      }
    });

    it('categorizes audio files correctly', async () => {
      renderWithDnd(<AssetLibrary assets={[]} />);
      
      const file = new File(['audio content'], 'test.mp3', { type: 'audio/mpeg' });
      const input = screen.getByRole('button', { name: /upload/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        fireEvent.change(input, { target: { files: [file] } });
        
        await waitFor(() => {
          expect(mockAddAsset).toHaveBeenCalled();
          const addedAsset = mockAddAsset.mock.calls[0][0];
          expect(addedAsset.type).toBe('audio');
          expect(addedAsset.name).toBe('test.mp3');
        });
      }
    });

    it('categorizes JSON files as templates', async () => {
      renderWithDnd(<AssetLibrary assets={[]} />);
      
      const file = new File(['{}'], 'template.json', { type: 'application/json' });
      const input = screen.getByRole('button', { name: /upload/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        fireEvent.change(input, { target: { files: [file] } });
        
        await waitFor(() => {
          expect(mockAddAsset).toHaveBeenCalled();
          const addedAsset = mockAddAsset.mock.calls[0][0];
          expect(addedAsset.type).toBe('template');
          expect(addedAsset.name).toBe('template.json');
        });
      }
    });

    it('handles multiple file uploads', async () => {
      renderWithDnd(<AssetLibrary assets={[]} />);
      
      const files = [
        new File(['image1'], 'test1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'test2.png', { type: 'image/png' }),
      ];
      const input = screen.getByRole('button', { name: /upload/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        fireEvent.change(input, { target: { files } });
        
        await waitFor(() => {
          expect(mockAddAsset).toHaveBeenCalledTimes(2);
        });
      }
    });

    it('includes metadata in uploaded assets', async () => {
      renderWithDnd(<AssetLibrary assets={[]} />);
      
      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const input = screen.getByRole('button', { name: /upload/i }).parentElement?.querySelector('input[type="file"]');
      
      if (input) {
        fireEvent.change(input, { target: { files: [file] } });
        
        await waitFor(() => {
          expect(mockAddAsset).toHaveBeenCalled();
          const addedAsset = mockAddAsset.mock.calls[0][0];
          expect(addedAsset.metadata).toBeDefined();
          expect(addedAsset.metadata.size).toBe(file.size);
          expect(addedAsset.metadata.mimeType).toBe('image/jpeg');
        });
      }
    });
  });
});
