/**
 * AssetLibraryPanel Component
 * Displays assets organized by type with drag-drop import support
 * Requirements: 9.9
 * 
 * Updated: Added pagination support for large asset lists
 */

import { useState, useMemo, useCallback } from 'react';
import { AssetDropZone } from './AssetDropZone';
import { AssetImportButton } from './AssetImportButton';
import type { AssetMetadata, AssetType, ImportResult } from '@/types/asset';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchIcon, ImageIcon, MusicIcon, VideoIcon, FileIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/pagination';

export interface AssetLibraryPanelProps {
  projectPath: string;
  assets: AssetMetadata[];
  onAssetSelect?: (assetId: string) => void;
  onImportComplete?: (results: ImportResult[]) => void;
}

// Asset categories with their display info
const CATEGORIES = [
  { id: 'all', label: 'All Assets', icon: FileIcon, type: null },
  { id: 'images', label: 'Images', icon: ImageIcon, type: 'image' as AssetType },
  { id: 'audio', label: 'Audio', icon: MusicIcon, type: 'audio' as AssetType },
  { id: 'video', label: 'Video', icon: VideoIcon, type: 'video' as AssetType },
] as const;

export function AssetLibraryPanel({
  projectPath,
  assets,
  onAssetSelect,
  onImportComplete,
}: AssetLibraryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  /**
   * Filter assets based on search query and active category
   */
  const filteredAssets = useMemo(() => {
    let filtered = assets;

    // Filter by category
    if (activeCategory !== 'all') {
      const category = CATEGORIES.find((c) => c.id === activeCategory);
      if (category && category.type) {
        filtered = filtered.filter((asset) => asset.type === category.type);
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (asset) =>
          asset.filename.toLowerCase().includes(query) ||
          asset.type.toLowerCase().includes(query) ||
          asset.id.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [assets, activeCategory, searchQuery]);

  /**
   * Pagination for filtered assets
   */
  const {
    paginatedItems,
    pagination,
    goToPage,
    setPageSize,
  } = usePagination({
    items: filteredAssets,
    pageSize: 12,
    resetOnItemsChange: true,
  });

  /**
   * Get count for each category
   */
  const getCategoryCount = useCallback(
    (categoryId: string) => {
      if (categoryId === 'all') return assets.length;

      const category = CATEGORIES.find((c) => c.id === categoryId);
      if (!category || !category.type) return 0;

      return assets.filter((asset) => asset.type === category.type).length;
    },
    [assets]
  );

  /**
   * Handle asset selection
   */
  const handleAssetSelect = useCallback(
    (assetId: string) => {
      setSelectedAssetId(assetId);
      if (onAssetSelect) {
        onAssetSelect(assetId);
      }
    },
    [onAssetSelect]
  );

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  /**
   * Get asset type icon
   */
  const getAssetIcon = (type: AssetType) => {
    switch (type) {
      case 'image':
        return ImageIcon;
      case 'audio':
        return MusicIcon;
      case 'video':
        return VideoIcon;
      default:
        return FileIcon;
    }
  };

  return (
    <AssetDropZone
      projectPath={projectPath}
      onImportComplete={onImportComplete}
      className="flex h-full flex-col bg-background"
    >
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Asset Library</h2>

          {/* Import Button */}
          <AssetImportButton
            projectPath={projectPath}
            onImportComplete={onImportComplete}
            size="sm"
          />
        </div>

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search assets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
        <ScrollArea className="flex-1">
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
                      : 'Import assets or drag and drop files here'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedItems.map((asset) => {
                      const Icon = getAssetIcon(asset.type);
                      const isSelected = selectedAssetId === asset.id;

                      return (
                        <Card
                          key={asset.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            isSelected ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => handleAssetSelect(asset.id)}
                        >
                          <CardContent className="p-4">
                            {/* Thumbnail or Icon */}
                            <div className="aspect-video bg-muted rounded-md mb-3 flex items-center justify-center overflow-hidden">
                              {asset.thumbnail ? (
                                <img
                                  src={asset.thumbnail}
                                  alt={asset.filename}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <Icon className="h-12 w-12 text-muted-foreground" />
                              )}
                            </div>

                            {/* Asset Info */}
                            <div className="space-y-1">
                              <p className="font-medium text-sm truncate" title={asset.filename}>
                                {asset.filename}
                              </p>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="capitalize">{asset.type}</span>
                                <span>{formatFileSize(asset.size)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(asset.imported_at).toLocaleDateString()}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {/* Pagination Controls */}
                  <Pagination
                    pagination={pagination}
                    onPageChange={goToPage}
                    onPageSizeChange={setPageSize}
                    showPageSizeSelector
                    className="mt-4 pt-4 border-t"
                  />
                </>
               )}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>
    </AssetDropZone>
  );
}
