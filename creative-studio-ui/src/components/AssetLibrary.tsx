import { useState, useMemo, useRef, useCallback } from 'react';
import { Asset } from '@/types';
import { AssetCard } from './AssetCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SearchIcon,
  ImageIcon,
  MusicIcon,
  FileIcon,
  SparklesIcon,
  ZapIcon,
  TypeIcon,
  UploadIcon,
} from 'lucide-react';
import { useStore } from '@/store';
import { useVirtualScroll, useScrollPosition } from '@/hooks/useVirtualScroll';
import { generateThumbnail } from '@/utils/imageOptimization';
import { debounce } from '@/utils/memoization';

// ============================================================================
// AssetLibrary Component
// ============================================================================

interface AssetLibraryProps {
  assets: Asset[];
  onAssetSelect?: (asset: Asset) => void;
}

// Asset categories with their display info
const CATEGORIES = [
  { id: 'all' as const, label: 'All Assets', icon: FileIcon },
  { id: 'images' as const, label: 'Images', icon: ImageIcon, type: 'image' as const },
  { id: 'audio' as const, label: 'Audio', icon: MusicIcon, type: 'audio' as const },
  { id: 'templates' as const, label: 'Templates', icon: FileIcon, type: 'template' as const, subcategory: null as null },
  { id: 'transitions' as const, label: 'Transitions', icon: SparklesIcon, type: 'template' as const, subcategory: 'transition' as const },
  { id: 'effects' as const, label: 'Effects', icon: ZapIcon, type: 'template' as const, subcategory: 'effect' as const },
  { id: 'text-templates' as const, label: 'Text Templates', icon: TypeIcon, type: 'template' as const, subcategory: 'text-template' as const },
] as const;

export function AssetLibrary({ assets, onAssetSelect }: AssetLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [scrollTop, setScrollTop] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const addAsset = useStore((state) => state.addAsset);

  // Debounced search to improve performance
  const debouncedSetSearchQuery = useMemo(
    () => debounce((value: string) => setSearchQuery(value), 300),
    []
  );

  // Track scroll position for virtual scrolling
  useScrollPosition(scrollContainerRef, setScrollTop);

  // Handle file upload with optimized thumbnail generation
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        // Determine asset type based on file extension
        const assetType = categorizeFile(file);
        
        // Generate optimized thumbnail for images
        let thumbnail: string | undefined;
        if (assetType === 'image') {
          thumbnail = await generateThumbnail(file, {
            maxWidth: 200,
            maxHeight: 200,
            quality: 0.8,
            format: 'jpeg',
          });
        }

        // Create asset object
        const asset: Asset = {
          id: `asset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: assetType,
          url: URL.createObjectURL(file),
          thumbnail,
          metadata: {
            size: file.size,
            lastModified: file.lastModified,
            mimeType: file.type,
          },
        };

        // Add to store
        addAsset(asset);
      } catch (error) {
        console.error('Error uploading file:', file.name, error);
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Categorize file by extension
  const categorizeFile = (file: File): 'image' | 'audio' | 'template' => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Image extensions
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) {
      return 'image';
    }
    
    // Audio extensions
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(extension || '')) {
      return 'audio';
    }
    
    // Template extensions (JSON)
    if (extension === 'json') {
      return 'template';
    }
    
    // Default to template for unknown types
    return 'template';
  };

  // Generate thumbnail for image files (removed - now using imageOptimization.ts)

  // Filter assets based on search query and active category
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by category
    if (activeCategory !== 'all') {
      const category = CATEGORIES.find((c) => c.id === activeCategory);
      if (category && 'type' in category) {
        filtered = filtered.filter((asset) => {
          // Match type
          if (category.type && asset.type !== category.type) {
            return false;
          }
          // Match subcategory if specified
          if ('subcategory' in category && category.subcategory !== undefined) {
            return asset.metadata?.subcategory === category.subcategory;
          }
          // For 'templates' category, show only templates without specific subcategories
          if (activeCategory === 'templates') {
            return asset.type === 'template' &&
                   !['transition', 'effect', 'text-template'].includes(asset.metadata?.subcategory);
          }
          return true;
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.name.toLowerCase().includes(query) ||
          asset.type.toLowerCase().includes(query) ||
          asset.metadata?.subcategory?.toLowerCase().includes(query) ||
          asset.metadata?.tags?.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [assets, activeCategory, searchQuery]);

  // Get count for each category (memoized for performance)
  const getCategoryCount = useCallback((categoryId: string) => {
    if (categoryId === 'all') return assets.length;
    
    const category = CATEGORIES.find((c) => c.id === categoryId);
    if (!category || !('type' in category)) return 0;

    return assets.filter((asset) => {
      if (category.type && asset.type !== category.type) {
        return false;
      }
      if ('subcategory' in category && category.subcategory !== undefined) {
        return asset.metadata?.subcategory === category.subcategory;
      }
      // Handle templates category specifically
      if (categoryId === 'templates') {
        return asset.type === 'template' &&
               !['transition', 'effect', 'text-template'].includes(asset.metadata?.subcategory);
      }
      return true;
    }).length;
  }, [assets]);

  // Virtual scrolling for large asset lists
  const ITEM_HEIGHT = 240; // Approximate height of asset card
  const CONTAINER_HEIGHT = 600; // Approximate container height
  
  const { virtualItems, totalHeight } = useVirtualScroll(filteredAssets, {
    itemHeight: ITEM_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 2,
  });

  // Use virtual scrolling only for large lists (> 50 items)
  const useVirtualization = filteredAssets.length > 50;

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Asset Library</h2>
          
          {/* Upload Button */}
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-2"
          >
            <UploadIcon className="h-4 w-4" />
            Upload
          </Button>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,audio/*,.json"
            onChange={handleFileUpload}
            className="hidden"
            aria-label="Upload assets"
            title="Upload assets"
          />
        </div>
        
        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search assets..."
            defaultValue={searchQuery}
            onChange={(e) => debouncedSetSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onValueChange={setActiveCategory}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="border-b px-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const count = getCategoryCount(category.id);
              
              return (
                <TabsTrigger
                  key={category.id}
                  value={category.id}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.label}</span>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Asset Grid */}
        <ScrollArea className="flex-1" ref={scrollContainerRef}>
          {CATEGORIES.map((category) => (
            <TabsContent
              key={category.id}
              value={category.id}
              className="mt-0 p-4"
            >
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No assets found</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? 'Try adjusting your search query'
                      : 'Upload assets to get started'}
                  </p>
                </div>
              ) : useVirtualization ? (
                // Virtual scrolling for large lists
                <div style={{ height: totalHeight, position: 'relative' }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {virtualItems.map(({ index, item, offsetTop }) => (
                      <div
                        key={item.id}
                        style={{
                          position: 'absolute',
                          top: offsetTop,
                          left: 0,
                          right: 0,
                        }}
                      >
                        <AssetCard
                          asset={item}
                          onSelect={onAssetSelect}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // Regular grid for small lists
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      onSelect={onAssetSelect}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </div>
  );
}
