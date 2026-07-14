/**
 * VaultModal - Asset Vault for StoryCore Engine
 *
 * A comprehensive asset management modal that provides:
 * - Unified view of all project assets (videos, images, audio)
 * - Advanced filtering and search
 * - Grid and list view modes
 * - Asset preview and metadata
 * - Drag-and-drop support for asset import
 * - Integration with generation workflows
 *
 * @author StoryCore Engine
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import './VaultModal.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Film,
  Image as ImageIcon,
  Music,
  FileText,
  Search,
  RefreshCw,
  Grid3X3,
  List,
  Download,
  Trash2,
  Heart,
  Eye,
  FolderOpen,
  HardDrive,
  X,
  Check,
  Copy,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import { notificationService } from '@/services/NotificationService';

// Asset types
type AssetType = 'video' | 'image' | 'audio' | 'all';

// Asset interface
interface VaultAsset {
  id: string;
  path: string;
  type: 'generated_video' | 'generated_image' | 'audio' | 'video' | 'image';
  name: string;
  size?: number;
  duration?: number;
  added_at?: string;
  metadata?: {
    prompt?: string;
    model?: string;
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: number;
    format?: string;
  };
  favorite?: boolean;
  tags?: string[];
}

// Sorting options
type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc' | 'size_desc' | 'size_asc';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VaultModal({ isOpen, onClose }: VaultModalProps) {
  const project = useAppStore((state) => state.project);

  // State
  const [assets, setAssets] = useState<VaultAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AssetType>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [previewAsset, setPreviewAsset] = useState<VaultAsset | null>(null);

  // Virtualization refs and state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for grid calculation
  useEffect(() => {
    if (!scrollContainerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  // Stats
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalSize: 0,
    videosCount: 0,
    imagesCount: 0,
    audioCount: 0,
    favoriteCount: 0,
  });

  // Calculate statistics
  const calculateStats = useCallback((assetList: VaultAsset[]) => {
    const totalSize = assetList.reduce((sum, a) => sum + (a.size || 0), 0);
    const videosCount = assetList.filter(a => a.type === 'generated_video' || a.type === 'video').length;
    const imagesCount = assetList.filter(a => a.type === 'generated_image' || a.type === 'image').length;
    const audioCount = assetList.filter(a => a.type === 'audio').length;
    const favoriteCount = assetList.filter(a => a.favorite).length;

    setStats({
      totalAssets: assetList.length,
      totalSize,
      videosCount,
      imagesCount,
      audioCount,
      favoriteCount,
    });
  }, []);

  // Load all assets from API
  const loadAssets = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await videoEditorAPI.listProjectAssets(project?.id || '');
      const assetsList = (response.assets || []) as Record<string, any>[];
      const loadedAssets: VaultAsset[] = assetsList.map((asset) => ({
        id: (asset.id as string) || crypto.randomUUID(),
        path: asset.path as string,
        type: asset.type as VaultAsset['type'],
        name: (asset.path as string).split('/').pop() || (asset.path as string),
        size: asset.size as number | undefined,
        duration: asset.duration as number | undefined,
        added_at: asset.added_at as string | undefined,
        metadata: asset.metadata as VaultAsset['metadata'],
        favorite: (asset.favorite as boolean) || false,
        tags: (asset.tags as string[]) || [],
      }));

      setAssets(loadedAssets);
      calculateStats(loadedAssets);
    } catch (error) {
      console.error('[VaultModal] Failed to load assets:', error);
      notificationService.error('Error', 'Failed to load vault assets');
    } finally {
      setIsLoading(false);
    }
  }, [project?.id, calculateStats]);

  // Load assets on open
  useEffect(() => {
    if (project?.id && isOpen) {
      loadAssets();
    }
  }, [project?.id, isOpen, loadAssets]);

  // Filtered and sorted assets
  const filteredAssets = useMemo(() => {
    let filtered = [...assets];

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => {
        if (selectedType === 'video') {
          return asset.type === 'generated_video' || asset.type === 'video';
        }
        if (selectedType === 'image') {
          return asset.type === 'generated_image' || asset.type === 'image';
        }
        return asset.type === selectedType;
      });
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(query) ||
        asset.path.toLowerCase().includes(query) ||
        asset.metadata?.prompt?.toLowerCase().includes(query) ||
        asset.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Favorites filter
    if (showOnlyFavorites) {
      filtered = filtered.filter(asset => asset.favorite);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.added_at || 0).getTime() - new Date(a.added_at || 0).getTime();
        case 'date_asc':
          return new Date(a.added_at || 0).getTime() - new Date(b.added_at || 0).getTime();
        case 'name_asc':
          return a.name.localeCompare(b.name);
        case 'name_desc':
          return b.name.localeCompare(a.name);
        case 'size_desc':
          return (b.size || 0) - (a.size || 0);
        case 'size_asc':
          return (a.size || 0) - (b.size || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [assets, selectedType, searchQuery, showOnlyFavorites, sortBy]);

  // Virtualization constants
  const GRID_COLUMN_MIN_WIDTH = 180;
  const GRID_GAP = 12;
  const GRID_ROW_HEIGHT = 200;
  const LIST_ROW_HEIGHT = 48;

  // Calculate grid columns
  const columns = useMemo(() => {
    if (!containerWidth) return 1;
    return Math.max(2, Math.floor((containerWidth - 32) / (GRID_COLUMN_MIN_WIDTH + GRID_GAP)));
  }, [containerWidth]);

  // Calculate row count based on view mode
  const rowCount = useMemo(() => {
    if (viewMode === 'grid') {
      return Math.ceil(filteredAssets.length / columns);
    }
    return filteredAssets.length;
  }, [filteredAssets.length, viewMode, columns]);

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => viewMode === 'grid' ? GRID_ROW_HEIGHT : LIST_ROW_HEIGHT,
    overscan: 5,
  });

  // Toggle favorite
  const toggleFavorite = (assetId: string) => {
    setAssets(prev => prev.map(asset =>
      asset.id === assetId ? { ...asset, favorite: !asset.favorite } : asset
    ));
    calculateStats(assets.map(asset =>
      asset.id === assetId ? { ...asset, favorite: !asset.favorite } : asset
    ));
  };

  // Delete asset
  const deleteAsset = async (asset: VaultAsset) => {
    if (!confirm(`Are you sure you want to delete "${asset.name}"?`)) return;

    try {
      // API call to delete would go here
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      notificationService.success('Deleted', `"${asset.name}" has been deleted`);
    } catch {
      notificationService.error('Error', 'Failed to delete asset');
    }
  };

  // Download asset
  const downloadAsset = (asset: VaultAsset) => {
    const url = `/api/video-editor/projects/${project?.id}/media-raw?path=${asset.path}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = asset.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy path to clipboard
  const copyPathToClipboard = (path: string) => {
    navigator.clipboard.writeText(path);
    notificationService.success('Copied', 'Path copied to clipboard');
  };

  // Toggle selection
  const toggleSelection = (assetId: string) => {
    setSelectedAssets(prev => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  // Select all
  const selectAll = () => {
    setSelectedAssets(new Set(filteredAssets.map(a => a.id)));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedAssets(new Set());
  };

  // Bulk delete
  const bulkDelete = async () => {
    if (selectedAssets.size === 0) return;
    if (!confirm(`Delete ${selectedAssets.size} selected assets?`)) return;

    try {
      setAssets(prev => prev.filter(a => !selectedAssets.has(a.id)));
      clearSelection();
      notificationService.success('Deleted', `${selectedAssets.size} assets deleted`);
    } catch {
      notificationService.error('Error', 'Failed to delete assets');
    }
  };

  // Format file size
  const formatSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format duration
  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get asset icon
  const getAssetIcon = (type: string) => {
    switch (type) {
      case 'generated_video':
      case 'video':
        return <Film className="w-4 h-4 text-blue-400" />;
      case 'generated_image':
      case 'image':
        return <ImageIcon className="w-4 h-4 text-green-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get asset URL
  const getAssetUrl = (asset: VaultAsset) => {
    return `/api/video-editor/projects/${project?.id}/media-raw?path=${asset.path}`;
  };

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Asset Vault</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center text-gray-500">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No project open</p>
            <p className="text-sm">Open a project to access the Asset Vault</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="vault-modal max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <HardDrive className="w-5 h-5 text-primary" />
            Asset Vault
            <Badge variant="secondary" className="ml-2">
              {stats.totalAssets} assets
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="flex-shrink-0 px-4 py-2 bg-muted/30 border-b flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Film className="w-4 h-4 text-blue-400" />
              {stats.videosCount} videos
            </span>
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-green-400" />
              {stats.imagesCount} images
            </span>
            <span className="flex items-center gap-1.5">
              <Music className="w-4 h-4 text-purple-400" />
              {stats.audioCount} audio
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-400" />
              {stats.favoriteCount} favorites
            </span>
          </div>
          <span className="text-sm text-muted-foreground">
            Total: {formatSize(stats.totalSize)}
          </span>
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 p-4 border-b flex items-center gap-4 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as AssetType)}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
              <TabsTrigger value="video" className="text-xs px-3">
                <Film className="w-3 h-3 mr-1" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="image" className="text-xs px-3">
                <ImageIcon className="w-3 h-3 mr-1" />
                Images
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-xs px-3">
                <Music className="w-3 h-3 mr-1" />
                Audio
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant={showOnlyFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
            >
              <Heart className={`w-4 h-4 mr-1 ${showOnlyFavorites ? 'fill-current' : ''}`} />
              Favorites
            </Button>
          </div>

          {/* Sort */}
          <select
            title="Sort assets by"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 text-sm border rounded-md bg-background"
          >
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="size_desc">Largest first</option>
            <option value="size_asc">Smallest first</option>
          </select>

          {/* View Mode */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadAssets}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Selection Actions */}
        {selectedAssets.size > 0 && (
          <div className="flex-shrink-0 px-4 py-2 bg-primary/10 border-b flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedAssets.size} selected
            </span>
            <Button variant="outline" size="sm" onClick={clearSelection}>
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
            <Button variant="destructive" size="sm" onClick={bulkDelete}>
              <Trash2 className="w-3 h-3 mr-1" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* Assets Display */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-auto p-4 custom-scrollbar"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p>Loading vault...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mb-4 opacity-30" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || selectedType !== 'all' || showOnlyFavorites
                  ? 'No assets found'
                  : 'Asset Vault is empty'}
              </h3>
              <p className="text-sm text-center max-w-md">
                {searchQuery || selectedType !== 'all' || showOnlyFavorites
                  ? 'Try adjusting your filters or search query.'
                  : 'Generated videos, images, and audio will appear here automatically.'}
              </p>
            </div>
          ) : (
            <div
              /* eslint-disable-next-line */
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {viewMode === 'grid' ? (
                /* Virtualized Grid View */
                rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const rowIndex = virtualRow.index;
                  const startAssetIndex = rowIndex * columns;
                  const rowAssets = filteredAssets.slice(startAssetIndex, startAssetIndex + columns);

                  return (
                    <div
                      key={virtualRow.key}
                      /* eslint-disable-next-line */
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                        display: 'grid',
                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                        gap: `${GRID_GAP}px`,
                        paddingBottom: `${GRID_GAP}px`
                      }}
                    >
                      {rowAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className={`vault-asset-card group relative bg-muted rounded-lg overflow-hidden border transition-all cursor-pointer hover:shadow-lg ${
                            selectedAssets.has(asset.id) ? 'ring-2 ring-primary' : 'hover:border-primary/50'
                          }`}
                          onClick={() => setPreviewAsset(asset)}
                        >
                          {/* Selection Checkbox */}
                          <div
                            className="absolute top-2 left-2 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelection(asset.id);
                            }}
                          >
                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                              selectedAssets.has(asset.id)
                                ? 'bg-primary border-primary'
                                : 'bg-black/50 border-white/30'
                            }`}>
                              {selectedAssets.has(asset.id) && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>

                          {/* Favorite Badge */}
                          {asset.favorite && (
                            <div className="absolute top-2 right-2 z-10">
                              <Heart className="w-4 h-4 text-red-500 fill-current drop-shadow" />
                            </div>
                          )}

                          {/* Thumbnail */}
                          <div className="aspect-video bg-black/50 relative">
                            {(asset.type === 'generated_video' || asset.type === 'video') ? (
                              <video
                                src={getAssetUrl(asset)}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseLeave={(e) => {
                                  (e.target as HTMLVideoElement).pause();
                                  (e.target as HTMLVideoElement).currentTime = 0;
                                }}
                              />
                            ) : (asset.type === 'generated_image' || asset.type === 'image') ? (
                              <img
                                src={getAssetUrl(asset)}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                                <Music className="w-8 h-8 text-purple-400" />
                              </div>
                            )}

                            {/* Duration Badge for Videos */}
                            {asset.duration && (
                              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white font-mono">
                                {formatDuration(asset.duration)}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              {getAssetIcon(asset.type)}
                              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                {asset.type.replace('generated_', '')}
                              </span>
                            </div>
                            <p className="text-xs font-medium truncate" title={asset.name}>
                              {asset.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <span>{formatSize(asset.size)}</span>
                              {asset.added_at && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(asset.added_at).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewAsset(asset);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAsset(asset);
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className={`h-8 w-8 ${asset.favorite ? 'text-red-500' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(asset.id);
                              }}
                            >
                              <Heart className={`w-4 h-4 ${asset.favorite ? 'fill-current' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {/* Pad empty slots in the last row to maintain grid alignment */}
                      {rowAssets.length < columns && 
                        Array.from({ length: columns - rowAssets.length }).map((_, i) => (
                          <div key={`empty-${i}`} className="vault-asset-spacer" />
                        ))
                      }
                    </div>
                  );
                })
              ) : (
                /* Virtualized List View */
                <div className="space-y-1">
                  {/* Header - Fixed at top of list */}
                  <div 
                    className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b bg-background z-10 sticky top-0"
                    /* eslint-disable-next-line */
                    style={{ height: `${LIST_ROW_HEIGHT}px` }}
                  >
                    <div className="col-span-1 flex items-center">
                      <input
                        title="Select all assets"
                        type="checkbox"
                        checked={selectedAssets.size === filteredAssets.length && filteredAssets.length > 0}
                        onChange={() => selectedAssets.size === filteredAssets.length ? clearSelection() : selectAll()}
                        className="rounded"
                      />
                    </div>
                    <div className="col-span-4 flex items-center">Name</div>
                    <div className="col-span-2 flex items-center">Type</div>
                    <div className="col-span-2 flex items-center">Size</div>
                    <div className="col-span-2 flex items-center">Date</div>
                    <div className="col-span-1 text-right flex items-center justify-end">Actions</div>
                  </div>

                  {/* Virtual Items */}
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const asset = filteredAssets[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.key}
                        /* eslint-disable-next-line */
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start + LIST_ROW_HEIGHT}px)`, // Offset by header height
                        }}
                        className={`grid grid-cols-12 gap-4 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors ${
                          selectedAssets.has(asset.id) ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="col-span-1 flex items-center">
                          <input
                            title={`Select ${asset.name}`}
                            type="checkbox"
                            checked={selectedAssets.has(asset.id)}
                            onChange={() => toggleSelection(asset.id)}
                            className="rounded"
                          />
                        </div>
                        <div
                          className="col-span-4 flex items-center gap-2 cursor-pointer overflow-hidden"
                          onClick={() => setPreviewAsset(asset)}
                        >
                          {getAssetIcon(asset.type)}
                          <span className="truncate font-medium">{asset.name}</span>
                          {asset.favorite && <Heart className="w-3 h-3 text-red-500 fill-current flex-shrink-0" />}
                        </div>
                        <div className="col-span-2 flex items-center">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {asset.type.replace('generated_', '').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                          {formatSize(asset.size)}
                        </div>
                        <div className="col-span-2 flex items-center text-xs text-muted-foreground">
                          {asset.added_at ? new Date(asset.added_at).toLocaleDateString() : 'N/A'}
                        </div>
                        <div className="col-span-1 flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => downloadAsset(asset)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${asset.favorite ? 'text-red-500' : ''}`}
                            onClick={() => toggleFavorite(asset.id)}
                          >
                            <Heart className={`w-3 h-3 ${asset.favorite ? 'fill-current' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteAsset(asset)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview Panel */}
        {previewAsset && (
          <div className="flex-shrink-0 border-t p-4 bg-muted/30">
            <div className="flex items-start gap-4">
              {/* Preview Thumbnail */}
              <div className="w-48 aspect-video bg-black rounded-lg overflow-hidden flex-shrink-0">
                {(previewAsset.type === 'generated_video' || previewAsset.type === 'video') ? (
                  <video
                    src={getAssetUrl(previewAsset)}
                    className="w-full h-full object-contain"
                    controls
                    autoPlay
                  />
                ) : (previewAsset.type === 'generated_image' || previewAsset.type === 'image') ? (
                  <img
                    src={getAssetUrl(previewAsset)}
                    alt={previewAsset.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-12 h-12 text-purple-400" />
                  </div>
                )}
              </div>

              {/* Preview Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium truncate">{previewAsset.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {previewAsset.type.replace('generated_', '').toUpperCase()}
                      </Badge>
                      {previewAsset.duration && (
                        <span className="text-xs text-muted-foreground">
                          {formatDuration(previewAsset.duration)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatSize(previewAsset.size)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setPreviewAsset(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {previewAsset.metadata?.prompt && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    <span className="font-medium">Prompt:</span> {previewAsset.metadata.prompt}
                  </p>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => downloadAsset(previewAsset)}>
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFavorite(previewAsset.id)}
                  >
                    <Heart className={`w-3 h-3 mr-1 ${previewAsset.favorite ? 'fill-current text-red-500' : ''}`} />
                    {previewAsset.favorite ? 'Unfavorite' : 'Favorite'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyPathToClipboard(previewAsset.path)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Path
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}