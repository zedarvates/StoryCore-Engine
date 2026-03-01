/**
 * Image Preview Panel Component
 * 
 * Displays generated image with metadata and action buttons.
 * Provides save, regenerate, and export options.
 * Enables video generation button on success.
 * 
 * Requirements: 2.3, 2.5
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Download,
  RefreshCw,
  Image as ImageIcon,
  Calendar,
  HardDrive,
  Maximize2,
  Video,
  Users,
  UserSquare2,
} from 'lucide-react';
import type { GeneratedAsset } from '../../types/generation';
import { getOptimizedImage, formatFileSize } from '../../utils/assetOptimization';
import { OCRButton } from '../ocr';

export interface ImagePreviewPanelProps {
  /**
   * Generated image asset
   */
  asset: GeneratedAsset;
  
  /**
   * Callback when save is clicked
   */
  onSave?: (asset: GeneratedAsset) => void;
  
  /**
   * Callback when regenerate is clicked
   */
  onRegenerate?: () => void;
  
  /**
   * Callback when video generation is triggered
   */
  onGenerateVideo?: (asset: GeneratedAsset) => void;
  
  /**
   * Whether video generation is available
   */
  canGenerateVideo?: boolean;
  
  /**
   * Callback when multi-angle is triggered
   */
  onGenerateMultiAngle?: (asset: GeneratedAsset) => void;
  
  /**
   * Callback when character sheet is triggered
   */
  onGenerateCharacterSheet?: (asset: GeneratedAsset) => void;
  
  /**
   * Callback when sprite generation is triggered
   */
  onGenerateSprite?: (asset: GeneratedAsset) => void;
  
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Format file size for display
 */
const formatFileSizeLocal = (bytes: number): string => {
  return formatFileSize(bytes);
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Image Preview Panel
 * 
 * Displays generated image with metadata, parameters, and action buttons.
 * Enables video generation workflow on successful image generation.
 * Uses optimized image loading for better performance.
 */
export const ImagePreviewPanel: React.FC<ImagePreviewPanelProps> = ({
  asset,
  onSave,
  onRegenerate,
  onGenerateVideo,
  onGenerateMultiAngle,
  onGenerateCharacterSheet,
  onGenerateSprite,
  canGenerateVideo = true,
  className = '',
}) => {
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [optimizedImageUrl, setOptimizedImageUrl] = useState<string>(asset.url);
  const [isLoadingOptimized, setIsLoadingOptimized] = useState(true);
  
  const { metadata } = asset;
  const { generationParams, fileSize, dimensions, format } = metadata;
  
  // Load optimized image on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadOptimizedImage = async () => {
      try {
        setIsLoadingOptimized(true);
        const optimized = await getOptimizedImage(asset.url, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
        });
        
        if (isMounted) {
          setOptimizedImageUrl(optimized);
        }
      } catch (error) {
        console.error('Failed to optimize image:', error);
        // Fall back to original URL
        if (isMounted) {
          setOptimizedImageUrl(asset.url);
        }
      } finally {
        if (isMounted) {
          setIsLoadingOptimized(false);
        }
      }
    };
    
    loadOptimizedImage();
    
    return () => {
      isMounted = false;
    };
  }, [asset.url]);
  
  /**
   * Handle save action
   */
  const handleSave = () => {
    if (onSave) {
      onSave(asset);
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
   * Handle video generation
   */
  const handleGenerateVideo = () => {
    if (onGenerateVideo && canGenerateVideo) {
      onGenerateVideo(asset);
    }
  };

  /**
   * Handle multi-angle generation
   */
  const handleGenerateMultiAngle = () => {
    if (onGenerateMultiAngle) {
      onGenerateMultiAngle(asset);
    }
  };

  /**
   * Handle character sheet generation
   */
  const handleGenerateCharacterSheet = () => {
    if (onGenerateCharacterSheet) {
      onGenerateCharacterSheet(asset);
    }
  };

  /**
   * Handle generating sprite
   */
  const handleGenerateSprite = () => {
    if (onGenerateSprite) {
      onGenerateSprite(asset);
    }
  };
  
  /**
   * Toggle image expansion
   */
  const toggleImageExpansion = () => {
    setIsImageExpanded(!isImageExpanded);
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Generated Image
        </CardTitle>
        <CardDescription>
          Image generated successfully. You can save, regenerate, or proceed to video generation.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Image Display */}
        <div className="relative group">
          {isLoadingOptimized && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Optimizing image...</span>
            </div>
          )}
          <img
            src={optimizedImageUrl}
            alt="Generated image"
            className={`w-full rounded-lg border ${
              isImageExpanded ? 'max-h-none' : 'max-h-96 object-contain'
            } ${isLoadingOptimized ? 'opacity-50' : 'opacity-100'}`}
            loading="lazy"
          />
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={toggleImageExpansion}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Metadata */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Metadata</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {/* Dimensions */}
            {dimensions && (
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Dimensions:</span>
                <Badge variant="secondary">
                  {dimensions.width} × {dimensions.height}
                </Badge>
              </div>
            )}
            
            {/* File Size */}
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Size:</span>
              <Badge variant="secondary">{formatFileSizeLocal(fileSize)}</Badge>
            </div>
            
            {/* Format */}
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Format:</span>
              <Badge variant="secondary">{format.toUpperCase()}</Badge>
            </div>
            
            {/* Timestamp */}
            <div className="flex items-center gap-2">
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
            {generationParams.steps && (
              <div>
                <span className="text-muted-foreground">Steps:</span>{' '}
                <span className="font-medium">{generationParams.steps}</span>
              </div>
            )}
            {generationParams.cfgScale && (
              <div>
                <span className="text-muted-foreground">CFG Scale:</span>{' '}
                <span className="font-medium">{generationParams.cfgScale}</span>
              </div>
            )}
            {generationParams.sampler && (
              <div>
                <span className="text-muted-foreground">Sampler:</span>{' '}
                <span className="font-medium">{generationParams.sampler}</span>
              </div>
            )}
            {generationParams.scheduler && (
              <div>
                <span className="text-muted-foreground">Scheduler:</span>{' '}
                <span className="font-medium">{generationParams.scheduler}</span>
              </div>
            )}
            {generationParams.seed !== undefined && (
              <div>
                <span className="text-muted-foreground">Seed:</span>{' '}
                <span className="font-medium">{generationParams.seed}</span>
              </div>
            )}
          </div>
          
          {/* Prompt */}
          {generationParams.prompt && (
            <div className="mt-2">
              <span className="text-muted-foreground text-sm">Prompt:</span>
              <p className="text-sm mt-1 p-2 bg-muted rounded-md">
                {generationParams.prompt}
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2">
        {/* Save Button */}
        {onSave && (
          <Button variant="outline" onClick={handleSave}>
            <Download className="mr-2 h-4 w-4" />
            Save
          </Button>
        )}
        
        {/* Regenerate Button */}
        {onRegenerate && (
          <Button variant="outline" onClick={handleRegenerate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        )}
        
        {/* OCR Text Scanner Button */}
        <OCRButton
          imageSource={optimizedImageUrl}
          label="Scan Text"
          variant="outline"
          size="sm"
        />
        
        {/* Generate Video Button */}
        {onGenerateVideo && (
          <Button
            onClick={handleGenerateVideo}
            disabled={!canGenerateVideo}
          >
            <Video className="mr-2 h-4 w-4" />
            Video
          </Button>
        )}

        {/* Multi-Angle Button */}
        {onGenerateMultiAngle && (
          <Button variant="outline" onClick={handleGenerateMultiAngle}>
            <Maximize2 className="mr-2 h-4 w-4 text-purple-400" />
            Multi-Angle
          </Button>
        )}

        {/* Character Sheet Button */}
        {onGenerateCharacterSheet && (
          <Button variant="outline" onClick={handleGenerateCharacterSheet}>
            <Users className="mr-2 h-4 w-4 text-emerald-400" />
            Character Sheet
          </Button>
        )}

        {/* Generate Sprite Button */}
        {onGenerateSprite && (
          <Button variant="outline" onClick={handleGenerateSprite}>
            <UserSquare2 className="mr-2 h-4 w-4 text-orange-400" />
            Sprite
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
