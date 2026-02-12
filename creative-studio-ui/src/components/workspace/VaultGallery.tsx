import { useEffect, useState } from 'react';
import { videoEditorAPI } from '@/services/videoEditorAPI';
import { ShotThumbnail } from '../timeline/ShotThumbnail';
import { Loader2, Film, Image as ImageIcon, Search, RefreshCw } from 'lucide-react';

interface VaultGalleryProps {
    projectId: string;
    className?: string;
}

export function VaultGallery({ projectId, className = '' }: VaultGalleryProps) {
    const [assets, setAssets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const fetchAssets = async () => {
        setIsLoading(true);
        try {
            const response = await videoEditorAPI.listProjectAssets(projectId);
            setAssets(response.assets || []);
        } catch (err) {
            console.error('[VaultGallery] Failed to fetch assets:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, [projectId]);

    const filteredAssets = assets.filter(asset =>
        asset.path.toLowerCase().includes(filter.toLowerCase()) ||
        asset.type.toLowerCase().includes(filter.toLowerCase())
    ).reverse(); // Most recent first

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
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
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
                    <div className="grid grid-cols-2 gap-3">
                        {filteredAssets.map((asset, idx) => (
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
                )}
            </div>
        </div>
    );
}
