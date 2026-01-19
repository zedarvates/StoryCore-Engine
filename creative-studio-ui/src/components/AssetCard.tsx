import { Asset } from '@/types';
import {
  ImageIcon,
  MusicIcon,
  FileIcon,
  SparklesIcon,
  ZapIcon,
  TypeIcon,
  GripVerticalIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useDrag } from 'react-dnd';
import { DND_ITEM_TYPES, type AssetDragItem } from '@/constants/dnd';

// ============================================================================
// AssetCard Component
// ============================================================================

interface AssetCardProps {
  asset: Asset;
  onSelect?: (asset: Asset) => void;
}

export function AssetCard({ asset, onSelect }: AssetCardProps) {
  // Set up drag functionality
  const [{ isDragging }, drag, preview] = useDrag<AssetDragItem, void, { isDragging: boolean }>({
    type: DND_ITEM_TYPES.ASSET,
    item: {
      type: DND_ITEM_TYPES.ASSET,
      asset: {
        id: asset.id,
        name: asset.name,
        type: asset.type,
        url: asset.url,
        thumbnail: asset.thumbnail,
        metadata: asset.metadata,
      },
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Get icon based on asset type
  const getAssetIcon = () => {
    switch (asset.type) {
      case 'image':
        return <ImageIcon className="h-8 w-8 text-blue-500" />;
      case 'audio':
        return <MusicIcon className="h-8 w-8 text-purple-500" />;
      case 'template':
        return <FileIcon className="h-8 w-8 text-green-500" />;
      default:
        return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  // Get category badge color
  const getCategoryColor = () => {
    switch (asset.type) {
      case 'image':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'audio':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      case 'template':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  // Get subcategory icon if available in metadata
  const getSubcategoryIcon = () => {
    const subcategory = asset.metadata?.subcategory;
    if (!subcategory) return null;

    switch (subcategory) {
      case 'transition':
        return <SparklesIcon className="h-3 w-3" />;
      case 'effect':
        return <ZapIcon className="h-3 w-3" />;
      case 'text-template':
        return <TypeIcon className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div ref={preview as any} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <Card
        className="group cursor-pointer transition-all hover:shadow-lg hover:scale-105 hover:border-primary"
        onClick={() => onSelect?.(asset)}
      >
        <CardContent className="p-3">
          {/* Drag Handle */}
          <div
            ref={drag as any}
            className="absolute top-2 right-2 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Drag to use"
          >
            <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Thumbnail or Icon */}
          <div className="relative mb-2 flex h-24 items-center justify-center rounded-md bg-muted overflow-hidden">
            {asset.thumbnail ? (
              <img
                src={asset.thumbnail}
                alt={asset.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center">
                {getAssetIcon()}
              </div>
            )}
            
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium">
                {isDragging ? 'Dragging...' : 'Click or drag to use'}
              </span>
            </div>
          </div>

          {/* Asset Info */}
          <div className="space-y-1">
            <h4 className="text-sm font-medium truncate" title={asset.name}>
              {asset.name}
            </h4>
            
            <div className="flex items-center justify-between">
              {/* Type Badge */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getCategoryColor()}`}
              >
                {getSubcategoryIcon()}
                {asset.metadata?.subcategory || asset.type}
              </span>
              
              {/* Additional metadata */}
              {asset.metadata?.duration && (
                <span className="text-xs text-muted-foreground">
                  {asset.metadata.duration}s
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
