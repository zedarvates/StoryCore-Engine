import React, { useState, useEffect, useCallback } from 'react';
import { Edit2, Trash2, User, Image as ImageIcon, Loader2, RefreshCw } from 'lucide-react';
import type { Character } from '@/types/character';
import { ComfyUIService } from '@/services/comfyuiService';
import { useAppStore } from '@/stores/useAppStore';
import { downloadAndSaveImage, getImageDisplayUrl } from '@/services/imageStorageService';
import { devLog, devWarn } from '@/utils/devOnly';
import { logger } from '@/utils/logger';
import './CharacterCard.css';

/**
 * Props for the CharacterCard component
 * Requirements: 1.2, 1.4, 2.1, 4.2
 */
export interface CharacterCardProps {
  /** The character to display */
  character: Character;

  /** Optional click handler for the card */
  onClick?: () => void;

  /** Whether the card is in selection mode (for Story Generator) */
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
  /** Handler for image generation */
  onImageGenerated?: (imageUrl: string, prompt?: string) => void | Promise<void>;

  /** Whether the card is in loading state */
  loading?: boolean;
}

/**
 * CharacterCard Component
 * 
 * Displays a character summary card with thumbnail, name, archetype, age range,
 * and creation date. Supports selection mode for Story Generator and action buttons
 * for editing and deletion.
 * 
 * Requirements:
 * - Req 1.2: Display character name, archetype, age range, creation date
 * - Req 1.4: Display thumbnail if available
 * - Req 2.1: Edit button functionality
 * - Req 4.2: Selection mode for Story Generator
 */
export const CharacterCard = React.memo<CharacterCardProps>(({
  character,
  onClick,
  selectable = false,
  selected = false,
  onSelect,
  showActions = false,
  onEdit,
  onDelete,
  onImageGenerated,
  loading = false,
}) => {
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [displayImageUrl, setDisplayImageUrl] = useState<string | null>(null);

  const comfyuiService = ComfyUIService.getInstance();
  const project = useAppStore((state) => state.project);

  // Get visual style from project
  const visualStyle = (project as any)?.visualStyle || (project as any)?.visual_style || 'realistic';

  // Load display URL for saved portrait
  useEffect(() => {
    const loadDisplayUrl = async () => {
      // Priority 1: Generated image URL (temporary, from current session)
      if (generatedImageUrl) {
        setDisplayImageUrl(generatedImageUrl);
        return;
      }

      // Priority 2: Saved portrait path (persistent)
      if (character.visual_identity?.generated_portrait) {
        const portraitPath = character.visual_identity.generated_portrait;
        const url = await getImageDisplayUrl(
          typeof portraitPath === 'string' ? portraitPath : String(portraitPath),
          project?.metadata?.path as string | undefined
        );
        if (url) {
          setDisplayImageUrl(url);
          return;
        }
      }

      // Priority 3: Legacy thumbnail_url
      if ((character as any).thumbnail_url) {
        setDisplayImageUrl((character as any).thumbnail_url);
        return;
      }

      // No image available
      setDisplayImageUrl(null);
    };

    loadDisplayUrl();
  }, [character, generatedImageUrl, project?.metadata?.path]);
  // Format creation date
  const formatDate = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      // Check if date is valid
      if (Number.isNaN(date.getTime())) {
        return 'Unknown date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Unknown date';
    }
  };

  // Handle card click
  const handleCardClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  }, [selectable, onSelect, selected, onClick]);

  // Handle checkbox change
  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(e.target.checked);
    }
  }, [onSelect]);

  // Handle edit button click
  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  }, [onEdit]);

  // Handle delete button click
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  }, [onDelete]);

  // Get thumbnail URL from visual identity or use placeholder
  const thumbnailUrl = displayImageUrl;

  /**
   * Build visual style prefix for prompt
   */
  const buildStylePrefix = (): string => {
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
    return styleMap[visualStyle] || visualStyle;
  };

  /**
   * Build visual identity details for prompt
   */
  const buildVisualDetails = (): string[] => {
    const details: string[] = [];
    const visual = character.visual_identity;

    if (!visual) return details;

    // Face and hair
    if (visual.hair_color && visual.hair_style) {
      details.push(`${visual.hair_color} ${visual.hair_style} hair`);
    } else if (visual.hair_color) {
      details.push(`${visual.hair_color} hair`);
    }

    if (visual.eye_color) {
      details.push(`${visual.eye_color} eyes`);
    }

    if (visual.facial_structure) {
      details.push(`${visual.facial_structure} face`);
    }

    // Skin and build
    if (visual.skin_tone) {
      details.push(`${visual.skin_tone} skin`);
    }

    if (visual.build) {
      details.push(`${visual.build} build`);
    }

    // Clothing
    if (visual.clothing_style) {
      details.push(`wearing ${visual.clothing_style} clothing`);
    }

    // Distinctive features
    if (visual.distinctive_features && visual.distinctive_features.length > 0) {
      details.push(visual.distinctive_features.join(', '));
    }

    return details;
  };

  /**
   * Build a detailed prompt from character data
   */
  const buildCharacterPrompt = (): string => {
    const parts: string[] = [buildStylePrefix()];
    parts.push(`Portrait of ${character.name}`);
    const visualDetails = buildVisualDetails();
    for (const detail of visualDetails) {
      parts.push(detail);
    }
    parts.push('high quality', 'detailed', 'professional portrait', 'centered composition');
    return parts.join(', ');
  };

  /**
   * Build negative prompt to avoid unwanted elements
   */
  const buildNegativePrompt = (): string => {
    return [
      'blurry',
      'low quality',
      'distorted',
      'deformed',
      'ugly',
      'bad anatomy',
      'watermark',
      'text',
      'signature',
      'multiple people',
      'full body',
      'background clutter',
    ].join(', ');
  };

  /**
   * Handle image generation with automatic model detection and local storage
   */
  const handleGenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsGeneratingImage(true);
    let prompt = ''; // Captured for persistence

    try {
      prompt = buildCharacterPrompt();
      const negativePrompt = buildNegativePrompt();

      devLog('🎨 [CharacterCard] Starting image generation');
      devLog('📝 Prompt:', prompt);
      devLog('🚫 Negative:', negativePrompt);
      devLog('🎭 Visual Style:', visualStyle);

      // Flux Turbo parameters (Z-Image Turbo workflow)
      const imageUrl = await comfyuiService.generateImage({
        prompt,
        negativePrompt,
        width: 784,
        height: 1024,
        steps: 4,
        cfgScale: 1,
        seed: Math.floor(Math.random() * 1000000),
        model: 'z_image_turbo_bf16.safetensors', // Not used in Flux Turbo workflow
        sampler: 'res_multistep',
        scheduler: 'simple',
      });

      devLog('✅ [CharacterCard] Image generated:', imageUrl);
      setGeneratedImageUrl(imageUrl);

      // Download and save image to project folder
      const projectPath = project?.metadata?.path as string | undefined;
      if (projectPath) {
        devLog('💾 [CharacterCard] Saving image to project folder...');
        const saveResult = await downloadAndSaveImage(
          imageUrl,
          character.character_id,
          projectPath
        );

        if (saveResult.success && saveResult.localPath) {
          devLog('✅ [CharacterCard] Image saved locally:', saveResult.localPath);

          // Notify parent component to update character data
          if (onImageGenerated) {
            onImageGenerated(saveResult.localPath, prompt);
          }
        } else {
          devWarn('⚠️ [CharacterCard] Failed to save image locally:', saveResult.error);
          // Still show the image from ComfyUI URL
          if (onImageGenerated) {
            onImageGenerated(imageUrl, prompt);
          }
        }
      } else {
        devWarn('⚠️ [CharacterCard] No project path available, image not saved locally');
        // Fallback: just notify with ComfyUI URL
        if (onImageGenerated) {
          onImageGenerated(imageUrl, prompt);
        }
      }
    } catch (err) {
      logger.error('❌ [CharacterCard] Failed to generate character portrait:', err);

      // Show user-friendly error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Set a placeholder image with error message
      setGeneratedImageUrl(
        `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect fill="%23f0f0f0" width="256" height="256"/><text x="50%" y="40%" text-anchor="middle" fill="%23999" font-size="14" font-weight="bold">Generation Failed</text><text x="50%" y="55%" text-anchor="middle" fill="%23666" font-size="10">Check ComfyUI settings</text><text x="50%" y="65%" text-anchor="middle" fill="%23666" font-size="8">${encodeURIComponent(errorMessage.substring(0, 40))}</text></svg>`
      );

      // You can also show a toast notification here if you have a notification system
      devWarn('💡 [CharacterCard] To fix: 1) Start ComfyUI 2) Configure in Settings > ComfyUI 3) Test connection');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="character-card character-card--loading">
        <div className="character-card__skeleton">
          <div className="character-card__skeleton-thumbnail" />
          <div className="character-card__skeleton-content">
            <div className="character-card__skeleton-line character-card__skeleton-line--title" />
            <div className="character-card__skeleton-line character-card__skeleton-line--subtitle" />
            <div className="character-card__skeleton-line character-card__skeleton-line--text" />
          </div>
        </div>
      </div>
    );
  }

  // Determine if card is clickable
  const isClickable = !!(onClick || selectable);

  // Render the card content
  const renderCardContent = () => (
    <>
      {/* Thumbnail */}
      <div className="character-card__thumbnail">
        {thumbnailUrl ? (
          <div className="character-card__thumbnail-wrapper">
            <img
              src={thumbnailUrl}
              alt={`${character.name} thumbnail`}
              className="character-card__thumbnail-image"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const placeholder = document.createElement('div');
                  placeholder.className = 'character-card__thumbnail-placeholder';
                  placeholder.innerHTML = '<svg class="character-card__thumbnail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
                  parent.appendChild(placeholder);
                }
              }}
            />
          </div>
        ) : (
          <div className="character-card__thumbnail-placeholder">
            <User className="character-card__thumbnail-icon" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="character-card__content">
        <div className="character-card__header">
          <h3 className="character-card__name">{character.name || 'Unnamed Character'}</h3>
          <p className="character-card__archetype">{character.role?.archetype || 'Unspecified'}</p>
        </div>

        <div className="character-card__details">
          <div className="character-card__detail">
            <span className="character-card__detail-label">Age:</span>
            <span className="character-card__detail-value">
              {character.visual_identity?.age_range || 'Not specified'}
            </span>
          </div>
          <div className="character-card__detail">
            <span className="character-card__detail-label">Created:</span>
            <span className="character-card__detail-value">
              {formatDate(character.creation_timestamp)}
            </span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`
        character-card
        ${selectable ? 'character-card--selectable' : ''}
        ${selected ? 'character-card--selected' : ''}
        ${isClickable ? 'character-card--clickable' : ''}
      `}
    >
      {/* Selection checkbox - outside clickable area */}
      {selectable && (
        <div className="character-card__checkbox">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxChange}
            aria-label={`Select ${character.name}`}
          />
        </div>
      )}

      {/* Main clickable area */}
      {isClickable ? (
        <button
          type="button"
          className="character-card__main-button"
          onClick={handleCardClick}
          aria-label={onClick ? `${character.name}` : `${character.name} - click to select`}
        >
          {renderCardContent()}
        </button>
      ) : (
        <div className="character-card__main">
          {renderCardContent()}
        </div>
      )}

      {/* Generate image button - outside clickable area */}
      <div className="character-card__generate">
        {thumbnailUrl ? (
          <button
            className="character-card__regenerate-button"
            onClick={handleGenerateImage}
            title="Regenerate character portrait with ComfyUI"
            aria-label={`Regenerate portrait for ${character.name}`}
            disabled={isGeneratingImage}
          >
            <RefreshCw size={16} className={isGeneratingImage ? 'character-card__spinner' : ''} />
            {isGeneratingImage && <span>Regenerating...</span>}
          </button>
        ) : (
          !isGeneratingImage && (
            <button
              className="character-card__generate-button"
              onClick={handleGenerateImage}
              title="Generate character portrait with ComfyUI"
              aria-label={`Generate portrait for ${character.name}`}
            >
              <ImageIcon size={20} />
              <span>Generate Portrait</span>
            </button>
          )
        )}
        {isGeneratingImage && (
          <div className="character-card__generating">
            <Loader2 size={20} className="character-card__spinner" />
            <span>Generating...</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="character-card__actions">
          {onEdit && (
            <button
              className="character-card__action-button character-card__action-button--edit"
              onClick={handleEditClick}
              aria-label={`Edit ${character.name}`}
              title="Edit character"
            >
              <Edit2 className="character-card__action-icon" />
            </button>
          )}
          {onDelete && (
            <button
              className="character-card__action-button character-card__action-button--delete"
              onClick={handleDeleteClick}
              aria-label={`Delete ${character.name}`}
              title="Delete character"
            >
              <Trash2 className="character-card__action-icon" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});
