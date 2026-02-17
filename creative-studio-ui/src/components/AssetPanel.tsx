import { useState, useEffect, useCallback, useRef } from 'react';
import { AssetLibraryService, type AssetSource, ASSET_CATEGORIES } from '@/services/assetLibraryService';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  RefreshCw,
  Loader2,
  Check,
  X,
  Trash2,
  Copy,
  Grid,
  List,
  Square,
  Info,
  WifiOff,
  Cloud,
  Database
} from 'lucide-react';
import { VaultGallery } from './workspace/VaultGallery';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageWithHoverButton } from '@/components/camera-angle-editor/ImageHoverButton';
import { useLocalCameraAngleEditorModal } from '@/contexts/CameraAngleEditorContext';
import { CameraAngleEditorModal } from '@/components/camera-angle-editor/CameraAngleEditorModal';

interface AssetPanelProps {
  readonly projectPath?: string;
  readonly className?: string;
}

interface Asset {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'template';
  url: string;
  thumbnail?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Helper function to render the appropriate icon based on asset type
 */
const renderAssetTypeIcon = (type: Asset['type']): React.ReactNode => {
  switch (type) {
    case 'image':
      return <ImageIcon className="w-5 h-5 text-muted-foreground" />;
    case 'audio':
      return <Music className="w-5 h-5 text-muted-foreground" />;
    case 'video':
      return <Video className="w-5 h-5 text-muted-foreground" />;
    default:
      return <FileText className="w-5 h-5 text-muted-foreground" />;
  }
};

export function AssetPanel({ projectPath, className }: AssetPanelProps) {
  const { toast } = useToast();

  // Camera angle editor modal state
  const {
    isOpen: isCameraAngleModalOpen,
    imageId: cameraAngleImageId,
    imagePath: cameraAngleImagePath,
    openModal: openCameraAngleModal,
    closeModal: closeCameraAngleModal,
  } = useLocalCameraAngleEditorModal();

  // Asset library state
  const [assetSources, setAssetSources] = useState<AssetSource[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

  // Selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'library' | 'vault'>('library');
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const assetListRef = useRef<HTMLDivElement>(null);

  /**
   * Helper function to render thumbnail content for an asset
   */
  const renderThumbnail = useCallback((asset: Asset, isImage: boolean): React.ReactNode => {
    if (!asset.thumbnail) {
      return renderAssetTypeIcon(asset.type);
    }
    
    if (isImage) {
      return (
        <ImageWithHoverButton
          src={asset.thumbnail}
          alt={asset.name}
          imageId={asset.id}
          imagePath={asset.url || asset.thumbnail}
          onClick={openCameraAngleModal}
          buttonLabel="Edit Angle"
          enableScaleEffect={false}
          imageClassName="w-full h-full object-cover"
        />
      );
    }
    
    return (
      <img
        src={asset.thumbnail}
        alt={asset.name}
        className="w-full h-full object-cover"
      />
    );
  }, [openCameraAngleModal]);

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

        // Show success message if assets were loaded
        if (allAssets.length > 0) {
          toast({
            title: 'Assets Loaded',
            description: `Loaded ${allAssets.length} assets from ${sources.length} sources`,
          });
        }

      } catch (error) {
        console.error('Failed to load assets:', error);
        toast({
          title: 'Asset Loading Error',
          description: 'Failed to load asset library. Running in demo mode.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingAssets(false);
      }
    };

    loadAssets();
  }, [projectPath, toast]);

  // Handle asset selection
  const handleAssetSelect = useCallback((
    assetId: string,
    index: number,
    event?: React.MouseEvent
  ) => {
    const newSelectedIds = new Set(selectedAssetIds);

    if (event?.ctrlKey || event?.metaKey) {
      // Toggle selection for Ctrl+Click
      if (newSelectedIds.has(assetId)) {
        newSelectedIds.delete(assetId);
      } else {
        newSelectedIds.add(assetId);
      }
      setLastSelectedIndex(index);
    } else if (event?.shiftKey && lastSelectedIndex !== null) {
      // Range selection for Shift+Click
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const visibleAssets = getVisibleAssets();
      for (let i = start; i <= end; i++) {
        if (visibleAssets[i]) {
          newSelectedIds.add(visibleAssets[i].id);
        }
      }
      setLastSelectedIndex(index);
    } else {
      // Single selection (replace)
      newSelectedIds.clear();
      newSelectedIds.add(assetId);
      setLastSelectedIndex(index);
    }

    setSelectedAssetIds(newSelectedIds);
  }, [selectedAssetIds, lastSelectedIndex]);

  // Handle asset double-click for preview
  const handleAssetDoubleClick = useCallback((asset: Asset) => {
    toast({
      title: 'Asset Preview',
      description: `Opening preview for: ${asset.name}`,
    });
    // In a full implementation, this would open a modal
  }, [toast]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedAssetIds(new Set());
    setLastSelectedIndex(null);
  }, []);

  // Select all visible assets
  const selectAll = useCallback(() => {
    const visibleAssets = getVisibleAssets();
    const allIds = new Set(visibleAssets.map(a => a.id));
    setSelectedAssetIds(allIds);
  }, []);

  // Get visible assets based on filters
  const getVisibleAssets = useCallback(() => {
    return filteredAssets;
  }, [filteredAssets]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearSelection();
      } else if (e.key === 'Delete' && selectedAssetIds.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [selectedAssetIds, selectAll, clearSelection]);

  // Handle delete selected assets
  const handleDeleteSelected = useCallback(() => {
    if (selectedAssetIds.size === 0) return;

    const confirmDelete = globalThis.confirm(
      `Delete ${selectedAssetIds.size} selected asset(s)?`
    );

    if (confirmDelete) {
      toast({
        title: 'Assets Deleted',
        description: `${selectedAssetIds.size} asset(s) have been removed from the library`,
      });
      clearSelection();
    }
  }, [selectedAssetIds, toast, clearSelection]);

  // Handle duplicate selected assets
  const handleDuplicateSelected = useCallback(() => {
    if (selectedAssetIds.size === 0) return;

    toast({
      title: 'Assets Duplicated',
      description: `${selectedAssetIds.size} asset(s) have been duplicated`,
    });
  }, [selectedAssetIds, toast]);

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

  // Render asset in grid view
  const renderAssetGridItem = (asset: Asset, index: number) => {
    const isSelected = selectedAssetIds.has(asset.id);
    const isImage = asset.type === 'image';

    return (
      <button
        type="button"
        key={asset.id}
        onClick={(e) => handleAssetSelect(asset.id, index, e)}
        onDoubleClick={() => handleAssetDoubleClick(asset)}
        className={`
          relative w-full flex items-center gap-2 p-2 rounded-md cursor-pointer border transition-all
          ${isSelected
            ? 'bg-primary/10 border-primary ring-2 ring-primary/30'
            : 'hover:bg-muted border-border group'
          }
        `}
        title={asset.name}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAssetSelect(asset.id, index);
          }
        }}
        aria-label={`Select asset ${asset.name}`}
        aria-pressed={isSelected ? 'true' : 'false'}
      >
        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        )}

        {/* Thumbnail */}
        <div className={`
          ${viewMode === 'grid' ? 'w-12 h-12' : 'w-10 h-10'}
          bg-muted rounded flex-shrink-0 flex items-center justify-center overflow-hidden
        `}>
          {renderThumbnail(asset, isImage)}
        </div>

        {/* Asset info */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium truncate">{asset.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
        </div>

        {/* Hover actions */}
        {!isSelected && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-1/2 -translate-y-1/2">
            <div className="bg-background/90 rounded p-1 shadow-sm">
              <Copy className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        )}
      </button>
    );
  };

  // Render asset in list view
  const renderAssetListItem = (asset: Asset, index: number): React.ReactElement => {
    const isSelected = selectedAssetIds.has(asset.id);
    
    return (
      <button
        type="button"
        key={asset.id}
        onClick={(e) => handleAssetSelect(asset.id, index, e)}
        onDoubleClick={() => handleAssetDoubleClick(asset)}
        className={`
          w-full text-left flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-all
          ${isSelected
            ? 'bg-primary/10 border-primary'
            : 'hover:bg-muted border-border'
          }
        `}
        title={asset.name}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleAssetSelect(asset.id, index);
          }
        }}
        aria-label={`Select asset ${asset.name}`}
        aria-pressed={isSelected ? 'true' : 'false'}
      >
        {/* Selection checkbox */}
        <div className={`
          w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
          ${isSelected
            ? 'bg-primary border-primary'
            : 'border-muted-foreground'
          }
        `}>
          {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 bg-muted rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
          {(() => {
            if (asset.thumbnail) {
              return (
                <img
                  src={asset.thumbnail}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
              );
            }
            return renderAssetTypeIcon(asset.type) as React.ReactNode;
          })() as React.ReactNode}
        </div>

        {/* Asset info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{asset.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{asset.type}</p>
        </div>

        {/* Metadata preview */}
        {asset.metadata?.tags && Array.isArray(asset.metadata.tags) && asset.metadata.tags.length > 0 && (
          <div className="hidden md:flex items-center gap-1">
            {(asset.metadata.tags as string[]).slice(0, 2).map((tag: string, tagIndex: number) => (
              <span
                key={tag}
                className="text-xs px-1.5 py-0.5 bg-muted rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={`w-72 border-r border-border bg-card flex flex-col ${className || ''}`}>
      {/* Assets Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Assets</h2>
            {/* Demo Mode Indicator */}
            {!(globalThis as any).electronAPI && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">
                <WifiOff className="w-3 h-3" />
                Demo Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefreshAssets}
              className={`p-1 rounded-md ${isLoadingAssets ? 'animate-spin' : 'hover:bg-muted'}`}
              title="Refresh asset library"
              aria-label="Refresh asset library"
              disabled={isLoadingAssets}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded-md ${viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted'}`}
              title="Grid view"
              aria-label="Switch to grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded-md ${viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted'}`}
              title="List view"
              aria-label="Switch to list view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Demo Mode Info */}
        {!(globalThis as any).electronAPI && (
          <div className="flex items-center gap-1 mb-3 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Running in browser with demo assets</span>
          </div>
        )}
        <input
          type="text"
          placeholder="Search assets..."
          value={assetSearchQuery}
          onChange={(e) => handleAssetSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Search assets"
        />

        {/* Tab Toggle */}
        <div className="mt-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="library" className="flex items-center gap-1.5 text-xs py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Cloud className="w-3.5 h-3.5" />
                Library
              </TabsTrigger>
              <TabsTrigger value="vault" className="flex items-center gap-1.5 text-xs py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Database className="w-3.5 h-3.5" />
                Vault
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selectedAssetIds.size > 0 && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 flex items-center justify-between">
          <span className="text-sm font-medium text-primary">
            {selectedAssetIds.size} selected
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={selectAll}
              className="p-1 hover:bg-primary/20 rounded"
              title="Select all (Ctrl+A)"
              aria-label="Select all"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-primary/20 rounded"
              title="Clear selection (Escape)"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-border mx-1" />
            <button
              onClick={handleDuplicateSelected}
              className="p-1 hover:bg-primary/20 rounded"
              title="Duplicate"
              aria-label="Duplicate selected"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleDeleteSelected}
              className="p-1 hover:bg-red-100 text-red-600 rounded"
              title="Delete (Del)"
              aria-label="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'vault' && projectPath ? (
          <VaultGallery projectId={projectPath.split(/[/\\]/).pop() || ''} className="border-none rounded-none h-full" />
        ) : (
          <>
            <div className="p-2">
              {/* Category Buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                >
                  All
                </button>
                {ASSET_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryChange(category.id)}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Grid/List by Source */}
            {isLoadingAssets ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div ref={assetListRef} className="p-4 space-y-4">
                {assetSources.map((source) => {
                  // Filter source assets based on current search/filter criteria
                  const sourceAssets = source.assets.filter(asset => {
                    // Apply search query filter
                    if (assetSearchQuery.trim()) {
                      const query = assetSearchQuery.toLowerCase();
                      const matchesName = asset.name.toLowerCase().includes(query);
                      const matchesTags = asset.metadata?.tags?.some((tag: string) =>
                        tag.toLowerCase().includes(query)
                      );
                      if (!matchesName && !matchesTags) return false;
                    }

                    // Apply category filter
                    if (selectedCategory !== 'all') {
                      const category = ASSET_CATEGORIES.find(c => c.id === selectedCategory);
                      if (category && !category.filter(asset)) return false;
                    }

                    return true;
                  });

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

                      {/* Grid View */}
                      {viewMode === 'grid' ? (
                        <div className="space-y-2">
                          {sourceAssets.map((asset, index) => renderAssetGridItem(asset, index))}
                        </div>
                      ) : (
                        /* List View */
                        <div className="space-y-1">
                          {sourceAssets.map((asset, index) => renderAssetListItem(asset, index))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredAssets.length === 0 && !isLoadingAssets && (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                        <FileText className="w-8 h-8 opacity-50" />
                      </div>
                    </div>
                    <p className="text-sm font-medium mb-2">No assets found</p>
                    {assetSearchQuery ? (
                      <div className="space-y-2">
                        <p className="text-xs">No assets match your search criteria</p>
                        <button
                          onClick={() => {
                            setAssetSearchQuery('');
                            handleAssetSearch('');
                          }}
                          className="text-xs text-primary hover:text-primary/80 underline"
                        >
                          Clear search
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs">No assets are currently available</p>
                        <div className="text-xs space-y-1">
                          <p>In demo mode, you have access to:</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground">
                            <li>Sample images from the library</li>
                            <li>UI assets and placeholders</li>
                            <li>StoryCore branding assets</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
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

      {/* Camera Angle Editor Modal */}
      <CameraAngleEditorModal
        isOpen={isCameraAngleModalOpen}
        onClose={closeCameraAngleModal}
        initialImageId={cameraAngleImageId || undefined}
        initialImagePath={cameraAngleImagePath || undefined}
      />
    </div>
  );
}

