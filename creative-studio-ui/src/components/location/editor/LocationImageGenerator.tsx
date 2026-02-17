import React, { useState } from 'react';
import { Image, Loader2, AlertCircle, MapPin } from 'lucide-react';
import { ComfyUIService } from '@/services/comfyuiService';
import { useAppStore } from '@/stores/useAppStore';
import './LocationImageGenerator.css';

// ============================================================================
// Common Types for Location Image Generation
// ============================================================================

/**
 * Common interface for location data needed for image generation.
 * This interface is compatible with both:
 * - Location from @/types/location (uses location_id)
 * - Location from @/types/world (uses id)
 */
export interface LocationImageData {
  /** Unique identifier (maps to location_id or id depending on source) */
  id?: string;
  /** Location identifier from @/types/location */
  location_id?: string;
  /** Display name of the location */
  name?: string;
  /** Location type for scene context */
  location_type?: 'exterior' | 'interior';
  /** Metadata containing description, atmosphere, etc. */
  metadata?: {
    description?: string;
    atmosphere?: string;
    significance?: string;
    time_period?: string;
    key_features?: string[];
    color_palette?: string[];
    genre_tags?: string[];
    [key: string]: unknown;
  };
}

interface LocationImageGeneratorProps {
  readonly location: LocationImageData;
  readonly onImageGenerated?: (imageUrl: string) => void;
  readonly disabled?: boolean;
}

/**
 * LocationImageGenerator Component
 * 
 * Generates a 512x512 tile/location image using ComfyUI
 * based on the location's name, description, atmosphere, and features.
 */
export function LocationImageGenerator({
  location,
  onImageGenerated,
  disabled = false,
}: LocationImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const comfyuiService = ComfyUIService.getInstance();
  const project = useAppStore((state) => state.project);

  // Get visual style from project
  const visualStyle = (project as any)?.visualStyle || (project as any)?.visual_style || 'realistic';

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
    } else {
      parts.push('Unknown location');
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

    // Time period
    if (metadata?.time_period) {
      parts.push(`Era: ${metadata.time_period}`);
    }

    // Key features/landmarks
    if (metadata?.key_features && metadata.key_features.length > 0) {
      parts.push(`Key features: ${metadata.key_features.join(', ')}`);
    }

    // Color palette
    if (metadata?.color_palette && metadata.color_palette.length > 0) {
      parts.push(`Color palette: ${metadata.color_palette.join(', ')} colors`);
    }

    // Genre tags
    if (metadata?.genre_tags && metadata.genre_tags.length > 0) {
      parts.push(`Genre: ${metadata.genre_tags.join(', ')}`);
    }

    // Add quality tags from user requirements
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
      'people',
      'person',
      'character',
      'human figure',
      'close-up',
      'portrait',
      'clutter',
      'mess',
    ].join(', ');
  };

  /**
   * Handle image generation
   */
  const handleGenerate = async () => {
    if (disabled || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const prompt = buildLocationPrompt();
      const negativePrompt = buildNegativePrompt();

      console.log('Generating location tile image with prompt:', prompt);

      // Generate 512x512 tile image
      const imageUrl = await comfyuiService.generateImage({
        prompt,
        negativePrompt,
        width: 512,
        height: 512,
        steps: 4,
        cfgScale: 1,
        seed: Math.floor(Math.random() * 1000000),
        model: 'z_image_turbo_bf16.safetensors',
        sampler: 'res_multistep',
        scheduler: 'simple',
      });

      setGeneratedImage(imageUrl);

      if (onImageGenerated) {
        onImageGenerated(imageUrl);
      }
    } catch (err) {
      console.error('Failed to generate location image:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="location-image-generator">
      <div className="location-image-generator__header">
        <h4 className="location-image-generator__title">
          <MapPin size={18} />
          Location Tile Image
        </h4>
        <p className="location-image-generator__description">
          Generate a 512x512 tile image based on location details
        </p>
      </div>

      {/* Preview area */}
      <div className="location-image-generator__preview">
        {generatedImage ? (
          <img
            src={generatedImage}
            alt={location.name || 'Generated location tile'}
            className="location-image-generator__image"
          />
        ) : (
          <div className="location-image-generator__placeholder">
            <Image size={48} />
            <p>No image generated yet</p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="location-image-generator__error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Generate button */}
      <button
        className="location-image-generator__button"
        onClick={handleGenerate}
        disabled={disabled || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 size={18} className="location-image-generator__spinner" />
            Generating...
          </>
        ) : (
          <>
            <Image size={18} />
            Generate Tile Image
          </>
        )}
      </button>

      {/* Info text */}
      <p className="location-image-generator__info">
        The image will be generated using ComfyUI based on the location's name, description, atmosphere, and features.
        Make sure ComfyUI is running and configured.
      </p>
    </div>
  );
}
