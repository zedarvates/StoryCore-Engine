/**
 * LocationCard Component
 * 
 * Displays a location summary card with thumbnail, name, type, and cube progress.
 * Supports selection mode for Story Generator and action buttons for editing and deletion.
 * 
 * File: creative-studio-ui/src/components/location/LocationCard.tsx
 */

import React, { useState } from 'react';
import { Edit2, Trash2, Image as ImageIcon, Loader2, Box, RefreshCw } from 'lucide-react';
import type { Location } from '@/types/location';
import { getLocationCompletionPercentage } from '@/stores/locationStore';
import { ComfyUIService } from '@/services/comfyuiService';
import { useAppStore } from '@/stores/useAppStore';
import { downloadAndSaveImage } from '@/services/imageStorageService';
import { logger } from '@/utils/logger';
import { devLog } from '@/utils/devOnly';
import './LocationCard.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the LocationCard component
 */
export interface LocationCardProps {
  /** The location to display */
  location: Location;
  
  /** Optional click handler for the card */
  onClick?: () => void;
  
  /** Whether the card is in selection mode */
  selectable?: boolean;
  
  /** Whether the card is currently selected */
  selected?: boolean;
  
  /** Handler for selection changes */
  onSelect?: (selected: boolean) => void;
  
  /** Whether to show action buttons (edit, delete) */
  showActions?: boolean;
  
  /** Handler for edit button click */
  onEdit?: () => void;
  
  /** Handler for delete button click */
  onDelete?: () => void;
  
  /** Handler for image generation */
  onImageGenerated?: (imageUrl: string, prompt?: string) => void | Promise<void>;

  /** Whether the card is in loading state */
  loading?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function LocationCard({
  location,
  onClick,
  selectable = false,
  selected = false,
  onSelect,
  showActions = false,
  onEdit,
  onDelete,
  onImageGenerated,
  loading = false,
}: LocationCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  
  const completionPercentage = getLocationCompletionPercentage(location);
  const hasThumbnail = (location.metadata?.thumbnail_path || generatedImageUrl) && !imageError;

  const comfyuiService = ComfyUIService.getInstance();
  const project = useAppStore((state) => state.project);
  
  // Get visual style from project
  const visualStyle = project?.projectSetup?.visualStyle || 'realistic';

  // Get thumbnail from front face if no dedicated thumbnail
  const displayThumbnail = generatedImageUrl 
    ? generatedImageUrl
    : hasThumbnail 
      ? location.metadata?.thumbnail_path 
      : location.cube_textures?.front?.image_path;
  
  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  };
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit();
  };
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete();
  };
  
  const handleSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) onSelect(e.target.checked);
  };

  /**
   * Build a detailed prompt from location data
   */
  const buildLocationPrompt = (): string => {
    const parts: string[] = [];
    const metadata = location.metadata;

    // Add visual style first
    const styleMap: Record<string, string> = {
      'photorealistic': 'photorealistic',
      'cinematic': 'cinematic',
      'anime': 'anime style',
      'cartoon': 'cartoon style',
      'sketch': 'sketch art',
      'oil-painting': 'oil painting',
      'watercolor': 'watercolor painting',
      'digital-art': 'digital art',
      'comic-book': 'comic book style',
      'noir': 'film noir style',
      'vintage': 'vintage style',
      'modern': 'modern style',
      'minimalist': 'minimalist style',
      'realistic': 'realistic'
    };

    const stylePrefix = styleMap[visualStyle] || visualStyle;
    parts.push(stylePrefix);

    // Location name as main subject
    if (location.name) {
      parts.push(`Location: ${location.name}`);
    }

    // Location type
    if (location.location_type) {
      const typeMap: Record<string, string> = {
        'exterior': 'exterior scene',
        'interior': 'interior scene'
      };
      parts.push(typeMap[location.location_type] || 'location scene');
    }

    // Description
    if (metadata?.description) {
      parts.push(metadata.description);
    }

    // Atmosphere and mood
    if (metadata?.atmosphere) {
      parts.push(`Atmosphere: ${metadata.atmosphere}`);
    }

    // Quality tags
    parts.push(
      'photorealist',
      'cinematic lighting',
      'high quality',
      '8K',
      'detailed',
      'professional shot',
      'wide angle',
      'cinematic composition',
      'sharp focus'
    );

    return parts.join(', ');
  };

  /**
   * Build negative prompt
   */
  const buildNegativePrompt = (): string => {
    return [
      'blurry', 'low quality', 'distorted', 'deformed', 'ugly', 'bad anatomy',
      'watermark', 'text', 'signature', 'people', 'person', 'character',
      'human figure', 'close-up', 'portrait', 'clutter', 'mess',
    ].join(', ');
  };

  /**
   * Handle image generation
   */
  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingImage(true);
    let prompt = '';

    try {
      prompt = buildLocationPrompt();
      const negativePrompt = buildNegativePrompt();

      devLog('🎨 [LocationCard] Starting image generation', { prompt });

      // Generate 1024x576 (16:9) image
      const imageUrl = await comfyuiService.generateImage({
        prompt,
        negativePrompt,
        width: 1024,
        height: 576,
        steps: 4,
        cfgScale: 1,
        seed: Math.floor(Math.random() * 1000000),
        model: 'z_image_turbo_bf16.safetensors',
        sampler: 'res_multistep',
        scheduler: 'simple',
      });

      devLog('✅ [LocationCard] Image generated:', imageUrl);
      setGeneratedImageUrl(imageUrl);

      // Save locally
      const projectPath = project?.metadata?.path as string | undefined;
      if (projectPath) {
        // Sanitize location name for folder path (must match locationStorage.ts)
        const sanitizedName = location.name
          .trim()
          // eslint-disable-next-line no-control-regex
          .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
          .replace(/\s+/g, '_')
          .substring(0, 100);
        
        const subDir = `locations/${sanitizedName}/images`;
        
        const saveResult = await downloadAndSaveImage(
          imageUrl,
          location.location_id,
          projectPath,
          subDir
        );

        if (saveResult.success && saveResult.localPath) {
          if (onImageGenerated) {
            onImageGenerated(saveResult.localPath, prompt);
          }
        } else {
          if (onImageGenerated) {
            onImageGenerated(imageUrl, prompt);
          }
        }
      } else {
        if (onImageGenerated) {
          onImageGenerated(imageUrl, prompt);
        }
      }
    } catch (err) {
      logger.error('❌ [LocationCard] Failed to generate image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
  return (
    <div 
      className={`location-card ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''} ${loading ? 'loading' : ''}`}
      onClick={handleCardClick}
    >
      {loading && (
        <div className="location-card__loading-overlay">
          <Loader2 className="location-card__spinner" />
        </div>
      )}
      
      {selectable && (
        <div className="location-card__checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleSelectChange}
            onClick={(e) => e.stopPropagation()}
            title="Select location"
          />
        </div>
      )}
      
      <div className="location-card__thumbnail">
        {displayThumbnail ? (
          <img 
            src={displayThumbnail} 
            alt={location.name}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="location-card__thumbnail-placeholder">
            {!isGeneratingImage ? (
              <button
                className="location-card__generate-button"
                onClick={handleGenerateImage}
                title="Generate location image with ComfyUI"
                aria-label={`Generate image for ${location.name}`}
              >
                <ImageIcon size={20} />
                <span>Generate Location</span>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <span className="text-sm font-medium text-blue-400">Generating Vision...</span>
              </div>
            )}
          </div>
        )}
        
        {/* Cube Progress Indicator */}
        <div className="location-card__cube-progress">
          <Box size={14} />
          <span>{completionPercentage}%</span>
        </div>
      </div>
      
      <div className="location-card__content">
        <div className="location-card__header">
          <h3 className="location-card__name">{location.name}</h3>
          <span className={`location-card__type location-card__type--${location.location_type}`}>
            {location.location_type === 'exterior' ? 'Exterior' : 'Interior'}
          </span>
        </div>
        
        <p className="location-card__description">
          {location.metadata?.description?.slice(0, 100)}
          {location.metadata?.description?.length > 100 && '...'}
        </p>
        
        {location.metadata?.genre_tags && location.metadata.genre_tags.length > 0 && (
          <div className="location-card__tags">
            {location.metadata.genre_tags.slice(0, 3).map((tag) => (
              <span key={tag} className="location-card__tag">
                {tag}
              </span>
            ))}
            {location.metadata.genre_tags.length > 3 && (
              <span className="location-card__tag location-card__tag--more">
                +{location.metadata.genre_tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="location-card__meta">
          <span className="location-card__created">
            Created: {new Date(location.creation_timestamp).toLocaleDateString()}
          </span>
          {location.is_world_derived && (
            <span className="location-card__derived">
              From World Building
            </span>
          )}
        </div>
      </div>

      {/* Generate image button - consistent with character cards */}
      <div className="location-card__generate">
        {displayThumbnail ? (
          <button
            className="location-card__regenerate-button"
            onClick={handleGenerateImage}
            title="Regenerate location image with ComfyUI"
            aria-label={`Regenerate image for ${location.name}`}
            disabled={isGeneratingImage}
          >
            <RefreshCw size={16} className={isGeneratingImage ? 'location-card__spinner animate-spin' : ''} />
            {isGeneratingImage && <span>Regenerating...</span>}
          </button>
        ) : (
          !isGeneratingImage && (
            <button
              className="location-card__generate-button"
              onClick={handleGenerateImage}
              title="Generate location image with ComfyUI"
              aria-label={`Generate image for ${location.name}`}
            >
              <ImageIcon size={20} />
              <span>Generate Location</span>
            </button>
          )
        )}
        {isGeneratingImage && !displayThumbnail && (
          <div className="location-card__generating">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <span>Generating...</span>
          </div>
        )}
      </div>
      
      {showActions && !loading && (
        <div className="location-card__actions">
          <button 
            className="location-card__action location-card__action--edit"
            onClick={handleEditClick}
            title="Edit location"
          >
            <Edit2 size={16} />
          </button>
          <button 
            className="location-card__action location-card__action--delete"
            onClick={handleDeleteClick}
            title="Delete location"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default LocationCard;
