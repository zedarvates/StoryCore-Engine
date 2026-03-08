
/**
 * High-Impact AI Features API Service
 * 
 * Handles communication with the experimental AI endpoints:
 * - Skin Enhancement
 * - SFX Generation
 * - Clothes Swap / Virtual Try-On
 * - Outfit Change
 * - Style Transfer
 * - Infographics Generation
 * - Face Recognition
 */

import { backendApi, ApiResponse } from './backendApiService';

export interface SkinEnhancementRequest {
  file: File;
  smoothing_intensity?: number;
  preserve_texture?: boolean;
  remove_blemishes?: boolean;
}

export interface SFXRequest {
  prompt: string;
  duration?: number;
}

export interface ClothesSwapRequest {
  person_image: File;
  garment_image: File;
}

export interface OutfitChangeRequest {
  image: File;
  outfit_prompt: string;
}

export interface StyleTransferRequest {
  source_image: File;
  reference_image: File;
}

export interface InfographicsRequest {
  text_data: string;
  style?: string;
}

export interface RecognizeFaceRequest {
  image: File;
}

export interface BackgroundReplaceRequest {
  file: File;
  prompt: string;
  denoise_strength?: number;
}

export interface MusicRemixRequest {
  file: File;
  target_vibe: string;
}

export interface SubtitleRequest {
  file: File;
  target_language: string;
}

export interface HighImpactResult {
  success: boolean;
  image_base64?: string;
  audio_path?: string;
  srt?: string;
  language?: string;
  quality_score?: number;
  processing_time?: number;
  error?: string;
}

export class HighImpactApiService {
  /**
   * Cinematic Skin Enhancement
   */
  async enhanceSkin(params: SkinEnhancementRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.smoothing_intensity !== undefined) formData.append('smoothing_intensity', params.smoothing_intensity.toString());
    if (params.preserve_texture !== undefined) formData.append('preserve_texture', params.preserve_texture.toString());
    if (params.remove_blemishes !== undefined) formData.append('remove_blemishes', params.remove_blemishes.toString());

    return this.postFormData('/api/v1/experimental/enhance/skin', formData);
  }

  /**
   * Generate SFX
   */
  async generateSFX(params: SFXRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('prompt', params.prompt);
    if (params.duration !== undefined) formData.append('duration', params.duration.toString());

    return this.postFormData('/api/v1/experimental/audio/generate-sfx', formData);
  }

  /**
   * Virtual Try-On (Clothes Swap)
   */
  async swapClothes(params: ClothesSwapRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('person_image', params.person_image);
    formData.append('garment_image', params.garment_image);

    return this.postFormData('/api/v1/experimental/image/swap-clothes', formData);
  }

  /**
   * Change Outfit (Prompt-based)
   */
  async changeOutfit(params: OutfitChangeRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('image', params.image);
    formData.append('outfit_prompt', params.outfit_prompt);

    return this.postFormData('/api/v1/experimental/image/change-outfit', formData);
  }

  /**
   * Style Transfer
   */
  async transferStyle(params: StyleTransferRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('source_image', params.source_image);
    formData.append('reference_image', params.reference_image);

    return this.postFormData('/api/v1/experimental/image/transfer-style', formData);
  }

  /**
   * Infographics Generation
   */
  async generateInfographics(params: InfographicsRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('text_data', params.text_data);
    if (params.style) formData.append('style', params.style);

    return this.postFormData('/api/v1/experimental/image/infographics', formData);
  }

  /**
   * Face Recognition
   */
  async recognizeFace(params: RecognizeFaceRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('image', params.image);

    return this.postFormData('/api/v1/experimental/identity/recognize', formData);
  }

  /**
   * Background Replacement
   */
  async replaceBackground(params: BackgroundReplaceRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('prompt', params.prompt);
    if (params.denoise_strength !== undefined) formData.append('denoise_strength', params.denoise_strength.toString());

    return this.postFormData('/api/v1/experimental/image/replace-background', formData);
  }

  /**
   * Music Remix (Stem Separation)
   */
  async remixMusic(params: MusicRemixRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('target_vibe', params.target_vibe);

    return this.postFormData('/api/v1/experimental/audio/remix-music', formData);
  }

  /**
   * AI Subtitles & Translation
   */
  async generateSubtitles(params: SubtitleRequest): Promise<ApiResponse<HighImpactResult>> {
    const formData = new FormData();
    formData.append('file', params.file);
    formData.append('target_language', params.target_language);

    return this.postFormData('/api/v1/experimental/audio/generate-subtitles', formData);
  }

  private async postFormData(url: string, formData: FormData): Promise<ApiResponse<HighImpactResult>> {
    try {
      const config = backendApi.getConfig();
      const response = await fetch(`${config.baseUrl}${url}`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type, browser will do it with boundary
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.detail || 'Request failed',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const highImpactApi = new HighImpactApiService();
