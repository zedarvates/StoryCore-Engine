import { LegacyAny } from '@/types/legacy';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import { ShotThumbnail } from '../timeline/ShotThumbnail';
import { Loader2, Film, Image as ImageIcon, Search, RefreshCw } from 'lucide-react';

interface VaultGalleryProps {
    projectId: string;
    className?: string;
}

export function VaultGallery({ projectId, className = '' }: VaultGalleryProps) {
    const [assets, setAssets] = useState<LegacyAny[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [debouncedFilter, setDebouncedFilter] = useState('');
    const parentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilter(filter);
        }, 200);
        return () => clearTimeout(timer);
    }, [filter]);

    const fetchAssets = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await videoEditorAPI.listProjectAssets(projectId);
            setAssets(response.assets || []);
        } catch (err) {
            console.error('[VaultGallery] Failed to fetch assets:', err);
        } finally {
            setIsLoading(false);
        }
    }, [projectId]);

    useEffect(() => {
        fetchAssets();
    }, [projectId, fetchAssets]);

    // Measure container width (if needed for future responsive grid, but currently fixed 2 cols)
    useEffect(() => {
        if (!parentRef.current) return;

        const observer = new ResizeObserver((_entries) => {
            // Placeholder if we ever need to respond to width changes
        });

        observer.observe(parentRef.current);
        return () => observer.disconnect();
    }, []);

    const filteredAssets = assets.filter(asset =>
        asset.path.toLowerCase().includes(debouncedFilter.toLowerCase()) ||
        asset.type.toLowerCase().includes(debouncedFilter.toLowerCase())
    ).reverse(); // Most recent first

    const GRID_GAP = 12;
    const ESTIMATED_ROW_HEIGHT = 100;
    const columns = 2; // Fixed 2 columns for the sidebar gallery
    const rowCount = Math.ceil(filteredAssets.length / columns);

    const rowVirtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: 5,
    });

    return (
        <div className={`flex flex-col h-full bg-card border rounded-lg overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Film className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-sm">Asset Vault</h2>
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                        {assets.length}
                    </span>
                </div>
                <button
                    onClick={fetchAssets}
                    className="p-1.5 hover:bg-muted rounded-md transition-colors"
                    title="Refresh assets"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-border bg-background">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 text-xs bg-muted/50 border-none rounded-md focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* Grid */}
            <div 
                ref={parentRef}
                className="flex-1 overflow-auto p-4 custom-scrollbar"
            >
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <p className="text-xs">Loading vault...</p>
                    </div>
                ) : filteredAssets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/60 text-center px-4">
                        <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">No assets found</p>
                        <p className="text-xs mt-1 italic">Generated videos will appear here automatically.</p>
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
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
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
                                    {rowAssets.map((asset, idx) => (
                                        <div
                                            key={idx}
                                            className="group relative aspect-video bg-muted rounded-md overflow-hidden border border-border hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-md"
                                        >
                                            <ShotThumbnail
                                                videoUrl={asset.type === 'generated_video' ? `/api/video-editor/projects/${projectId}/media-raw?path=${asset.path}` : undefined}
                                                imageUrl={asset.type === 'generated_image' ? `/api/video-editor/projects/${projectId}/media-raw?path=${asset.path}` : undefined}
                                                alt={asset.path}
                                                className="w-full h-full"
                                            />

                                            {/* Overlay Info */}
                                            <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-[10px] text-white truncate font-medium">
                                                    {asset.path.split('/').pop()}
                                                </p>
                                                <p className="text-[8px] text-gray-400">
                                                    {asset.added_at ? new Date(asset.added_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown date'}
                                                </p>
                                            </div>

                                            {/* Badge */}
                                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/60 text-white backdrop-blur-sm border border-white/10 uppercase tracking-wider">
                                                {asset.type.replace('generated_', '')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
