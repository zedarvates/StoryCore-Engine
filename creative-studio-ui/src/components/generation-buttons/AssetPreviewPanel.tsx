/**
 * Asset Preview Panel Component
 * 
 * Unified component for displaying generated assets of any type (image, video, audio, prompt).
 * Provides asset display, metadata viewer, export controls, regenerate button, and related assets.
 * 
 * Requirements: 9.2, 9.3, 9.4
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Download,
  RefreshCw,
  Image as ImageIcon,
  Video as VideoIcon,
  Volume2 as AudioIcon,
  FileText,
  Calendar,
  HardDrive,
  Link2,
  ExternalLink,
} from 'lucide-react';
import type { GeneratedAsset, ExportFormat } from '../../types/generation';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import { VideoPreviewPanel } from './VideoPreviewPanel';
import { AudioPreviewPanel } from './AudioPreviewPanel';

export interface AssetPreviewPanelProps {
  /**
   * Generated asset to display
   */
  asset: GeneratedAsset;
  
  /**
   * Callback when save is clicked
   */
  onSave?: (asset: GeneratedAsset) => void;
  
  /**
   * Callback when export is clicked
   */
  onExport?: (asset: GeneratedAsset, format: ExportFormat) => void;
  
  /**
   * Callback when regenerate is clicked
   */
  onRegenerate?: () => void;
  
  /**
   * Related assets in the pipeline
   */
  relatedAssets?: GeneratedAsset[];
  
  /**
   * Callback when a related asset is clicked
   */
  onRelatedAssetClick?: (asset: GeneratedAsset) => void;
  
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Get asset type icon
 */
const getAssetIcon = (type: GeneratedAsset['type']) => {
  switch (type) {
    case 'image':
      return ImageIcon;
    case 'video':
      return VideoIcon;
    case 'audio':
      return AudioIcon;
    case 'prompt':
      return FileText;
    default:
      return FileText;
  }
};

/**
 * Get asset type label
 */
const getAssetTypeLabel = (type: GeneratedAsset['type']): string => {
  switch (type) {
    case 'image':
      return 'Image';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Audio';
    case 'prompt':
      return 'Prompt';
    default:
      return 'Asset';
  }
};

/**
 * Get available export formats for asset type
 */
const getExportFormats = (type: GeneratedAsset['type']): ExportFormat[] => {
  switch (type) {
    case 'image':
      return ['original', 'png', 'jpg'];
    case 'video':
      return ['original', 'mp4', 'webm'];
    case 'audio':
      return ['original', 'wav', 'mp3'];
    case 'prompt':
      return ['original'];
    default:
      return ['original'];
  }
};

/**
 * Asset Preview Panel
 * 
 * Unified component that displays any type of generated asset with appropriate
 * preview, metadata, export controls, and related assets.
 */
export const AssetPreviewPanel: React.FC<AssetPreviewPanelProps> = ({
  asset,
  onSave,
  onExport,
  onRegenerate,
  relatedAssets = [],
  onRelatedAssetClick,
  className = '',
}) => {
  const [selectedExportFormat, setSelectedExportFormat] = useState<ExportFormat>('original');
  
  const { metadata } = asset;
  const { fileSize, format } = metadata;
  const AssetIcon = getAssetIcon(asset.type);
  const assetTypeLabel = getAssetTypeLabel(asset.type);
  const exportFormats = getExportFormats(asset.type);
  
  /**
   * Handle save action
   */
  const handleSave = () => {
    if (onSave) {
      onSave(asset);
    }
  };
  
  /**
   * Handle export action
   */
  const handleExport = () => {
    if (onExport) {
      onExport(asset, selectedExportFormat);
    }
  };
  
  /**
   * Handle regenerate action
   */
  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };
  
  /**
   * Handle related asset click
   */
  const handleRelatedAssetClick = (relatedAsset: GeneratedAsset) => {
    if (onRelatedAssetClick) {
      onRelatedAssetClick(relatedAsset);
    }
  };
  
  // For specialized asset types, use their dedicated preview panels
  if (asset.type === 'image') {
    return (
      <div className={className}>
        <ImagePreviewPanel
          asset={asset}
          onSave={onSave}
          onRegenerate={onRegenerate}
        />
        {relatedAssets.length > 0 && (
          <RelatedAssetsSection
            relatedAssets={relatedAssets}
            onAssetClick={handleRelatedAssetClick}
            className="mt-4"
          />
        )}
      </div>
    );
  }
  
  if (asset.type === 'video') {
    return (
      <div className={className}>
        <VideoPreviewPanel
          asset={asset}
          onSave={onSave}
          onRegenerate={onRegenerate}
        />
        {relatedAssets.length > 0 && (
          <RelatedAssetsSection
            relatedAssets={relatedAssets}
            onAssetClick={handleRelatedAssetClick}
            className="mt-4"
          />
        )}
      </div>
    );
  }
  
  if (asset.type === 'audio') {
    return (
      <div className={className}>
        <AudioPreviewPanel
          asset={asset}
          onSave={onSave}
          onRegenerate={onRegenerate}
        />
        {relatedAssets.length > 0 && (
          <RelatedAssetsSection
            relatedAssets={relatedAssets}
            onAssetClick={handleRelatedAssetClick}
            className="mt-4"
          />
        )}
      </div>
    );
  }
  
  // Generic asset preview for prompt or unknown types
  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AssetIcon className="h-5 w-5" />
            Generated {assetTypeLabel}
          </CardTitle>
          <CardDescription>
            {assetTypeLabel} generated successfully. You can save, export, or regenerate.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Asset Display */}
          {asset.type === 'prompt' && metadata.generationParams.text && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm whitespace-pre-wrap">
                {metadata.generationParams.text}
              </p>
            </div>
          )}
          
          {/* Metadata */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Metadata</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {/* File Size */}
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Size:</span>
                <Badge variant="secondary">{formatFileSize(fileSize)}</Badge>
              </div>
              
              {/* Format */}
              <div className="flex items-center gap-2">
                <AssetIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Format:</span>
                <Badge variant="secondary">{format.toUpperCase()}</Badge>
              </div>
              
              {/* Timestamp */}
              <div className="flex items-center gap-2 col-span-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <Badge variant="secondary">{formatTimestamp(asset.timestamp)}</Badge>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Generation Parameters */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Generation Parameters</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(metadata.generationParams).map(([key, value]) => {
                // Skip text field as it's displayed above
                if (key === 'text') return null;
                
                return (
                  <div key={key}>
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}:
                    </span>{' '}
                    <span className="font-medium">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Export Format Selection */}
          {onExport && exportFormats.length > 1 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Export Format</h4>
                <div className="flex flex-wrap gap-2">
                  {exportFormats.map((format) => (
                    <Button
                      key={format}
                      variant={selectedExportFormat === format ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedExportFormat(format)}
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-wrap gap-2">
          {/* Save Button */}
          {onSave && (
            <Button variant="outline" onClick={handleSave}>
              <Download className="mr-2 h-4 w-4" />
              Save
            </Button>
          )}
          
          {/* Export Button */}
          {onExport && (
            <Button variant="outline" onClick={handleExport}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Export as {selectedExportFormat.toUpperCase()}
            </Button>
          )}
          
          {/* Regenerate Button */}
          {onRegenerate && (
            <Button variant="outline" onClick={handleRegenerate} className="ml-auto">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Related Assets */}
      {relatedAssets.length > 0 && (
        <RelatedAssetsSection
          relatedAssets={relatedAssets}
          onAssetClick={handleRelatedAssetClick}
          className="mt-4"
        />
      )}
    </div>
  );
};

/**
 * Related Assets Section Component
 * 
 * Displays related assets in the pipeline with thumbnails and metadata.
 */
interface RelatedAssetsSectionProps {
  relatedAssets: GeneratedAsset[];
  onAssetClick?: (asset: GeneratedAsset) => void;
  className?: string;
}

const RelatedAssetsSection: React.FC<RelatedAssetsSectionProps> = ({
  relatedAssets,
  onAssetClick,
  className = '',
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Related Assets in Pipeline
        </CardTitle>
        <CardDescription>
          Assets generated in the same pipeline workflow
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {relatedAssets.map((relatedAsset) => {
            const RelatedIcon = getAssetIcon(relatedAsset.type);
            const relatedLabel = getAssetTypeLabel(relatedAsset.type);
            
            return (
              <button
                key={relatedAsset.id}
                onClick={() => onAssetClick?.(relatedAsset)}
                className="group relative aspect-square rounded-lg border bg-muted/30 overflow-hidden hover:border-primary transition-colors"
              >
                {/* Thumbnail */}
                {relatedAsset.type === 'image' && (
                  <img
                    src={relatedAsset.url}
                    alt={`Related ${relatedLabel}`}
                    className="w-full h-full object-cover"
                  />
                )}
                
                {relatedAsset.type === 'video' && (
                  <video
                    src={relatedAsset.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                )}
                
                {(relatedAsset.type === 'audio' || relatedAsset.type === 'prompt') && (
                  <div className="w-full h-full flex items-center justify-center">
                    <RelatedIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-2">
                  <RelatedIcon className="h-6 w-6 mb-2" />
                  <span className="text-xs font-medium">{relatedLabel}</span>
                  <span className="text-xs text-white/80 mt-1">
                    {formatTimestamp(relatedAsset.timestamp)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
