import { useState, useEffect, useCallback } from 'react';
import { AssetLibraryService, type AssetSource, ASSET_CATEGORIES } from '@/services/assetLibraryService';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  Layers,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface AssetPanelProps {
  projectPath?: string;
  className?: string;
}

export function AssetPanel({ projectPath, className }: AssetPanelProps) {
  const { toast } = useToast();

  // Asset library state
  const [assetSources, setAssetSources] = useState<AssetSource[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<any[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Load assets on mount
  useEffect(() => {
    const loadAssets = async () => {
      setIsLoadingAssets(true);
      try {
        const service = AssetLibraryService.getInstance();
        const sources = await service.getAllAssets(projectPath || undefined);
        setAssetSources(sources);

        // Flatten all assets for initial display
        const allAssets = sources.flatMap(s => s.assets);
        setFilteredAssets(allAssets);

      } catch (error) {
        console.error('Failed to load assets:', error);
        toast({
          title: 'Asset Loading Error',
          description: 'Failed to load asset library',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadAssets();
  }, [projectPath, toast]);

  // Handle asset search with debouncing
  const handleAssetSearch = useCallback(async (query: string) => {
    setAssetSearchQuery(query);

    try {
      const service = AssetLibraryService.getInstance();
      const results = await service.searchAssets(
        {
          query: query.trim() || undefined,
          category: selectedCategory,
        },
        assetSources
      );
      setFilteredAssets(results);
    } catch (error) {
      console.error('Asset search failed:', error);
    }
  }, [selectedCategory, assetSources]);

  // Handle category change
  const handleCategoryChange = useCallback(async (categoryId: string) => {
    setSelectedCategory(categoryId);

    try {
      const service = AssetLibraryService.getInstance();
      const results = await service.searchAssets(
        {
          query: assetSearchQuery.trim() || undefined,
          category: categoryId,
        },
        assetSources
      );
      setFilteredAssets(results);
    } catch (error) {
      console.error('Category filter failed:', error);
    }
  }, [assetSearchQuery, assetSources]);

  // Handle refresh assets
  const handleRefreshAssets = useCallback(async () => {
    setIsLoadingAssets(true);
    try {
      const service = AssetLibraryService.getInstance();
      const sources = await service.refresh(projectPath || undefined);
      setAssetSources(sources);

      // Re-apply current filters
      const results = await service.searchAssets(
        {
          query: assetSearchQuery.trim() || undefined,
          category: selectedCategory,
        },
        sources
      );
      setFilteredAssets(results);

      toast({
        title: 'Assets Refreshed',
        description: `Loaded ${results.length} assets`,
      });
    } catch (error) {
      console.error('Failed to refresh assets:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh asset library',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAssets(false);
    }
  }, [projectPath, assetSearchQuery, selectedCategory, toast]);

  // Handle import assets
  const handleImportAssets = useCallback(() => {
    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,audio/*,video/*';

    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;

      // For now, just show success message
      toast({
        title: 'Assets Selected',
        description: `${files.length} files selected. Full import requires a project.`,
      });
    };

    input.click();
  }, [toast]);

  return (
    <div className={`w-64 border-r border-border bg-card flex flex-col ${className || ''}`}>
      {/* Assets Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Assets</h2>
          <button
            onClick={handleRefreshAssets}
            disabled={isLoadingAssets}
            className="p-1 hover:bg-muted rounded-md disabled:opacity-50"
            title="Refresh assets"
            aria-label="Refresh asset library"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAssets ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <input
          type="text"
          placeholder="Search assets..."
          value={assetSearchQuery}
          onChange={(e) => handleAssetSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Search assets"
        />
      </div>

      {/* Asset Categories */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {/* Category Buttons */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              All
            </button>
            {ASSET_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Grid by Source */}
        {isLoadingAssets ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {assetSources.map((source) => {
              const sourceAssets = filteredAssets.filter(asset =>
                source.assets.some(sa => sa.id === asset.id)
              );

              if (sourceAssets.length === 0) return null;

              return (
                <div key={source.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground">
                      {source.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {sourceAssets.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {sourceAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer border border-border group"
                        title={asset.name}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select asset ${asset.name}`}
                      >
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          {asset.thumbnail ? (
                            <img
                              src={asset.thumbnail}
                              alt={asset.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : asset.type === 'image' ? (
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                          ) : asset.type === 'audio' ? (
                            <Music className="w-6 h-6 text-muted-foreground" />
                          ) : asset.type === 'video' ? (
                            <Video className="w-6 h-6 text-muted-foreground" />
                          ) : (
                            <FileText className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{asset.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {filteredAssets.length === 0 && !isLoadingAssets && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No assets found</p>
                {assetSearchQuery && (
                  <p className="text-xs mt-1">Try a different search</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={handleImportAssets}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors"
          aria-label="Import new assets"
        >
          <Plus className="w-4 h-4" />
          Import Assets
        </button>
      </div>
    </div>
  );
}
