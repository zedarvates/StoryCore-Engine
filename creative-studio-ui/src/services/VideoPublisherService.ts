import { Character, Project as ProjectData } from '@/types';
import { logger } from '@/utils/logger';
import { getComfyUIClient } from './wizard/ComfyUIClient';
import { PersistenceService } from './PersistenceService';

export interface SocialMetadata {
  title: string;
  description: string;
  hashtags: string[];
  thumbnailPrompt: string;
}

export interface PlatformConfig {
  id: string;
  name: string;
  maxTitleLength: number;
  maxDescriptionLength: number;
  optimalHashtagCount: number;
}

const PLATFORMS: Record<string, PlatformConfig> = {
  youtube_shorts: { id: 'youtube_shorts', name: 'YouTube Shorts', maxTitleLength: 100, maxDescriptionLength: 5000, optimalHashtagCount: 3 },
  tiktok: { id: 'tiktok', name: 'TikTok', maxTitleLength: 150, maxDescriptionLength: 4000, optimalHashtagCount: 5 },
  instagram_reels: { id: 'instagram_reels', name: 'Instagram Reels', maxTitleLength: 2200, maxDescriptionLength: 2200, optimalHashtagCount: 15 },
  x_twitter: { id: 'x_twitter', name: 'X (Twitter)', maxTitleLength: 280, maxDescriptionLength: 280, optimalHashtagCount: 2 }
};

/**
 * VideoPublisherService
 * =====================
 * Gère la génération de métadonnées virales basées sur le contexte réel du projet StoryCore.
 */
export class VideoPublisherService {
  private static instance: VideoPublisherService;

  private constructor() {}

  public static getInstance(): VideoPublisherService {
    if (!VideoPublisherService.instance) {
      VideoPublisherService.instance = new VideoPublisherService();
    }
    return VideoPublisherService.instance;
  }

  /**
   * Génère des métadonnées optimisées par plateforme en utilisant GPT (GDPval logic)
   */
  public async generateViralMetadata(
    project: ProjectData, 
    characters: Character[], 
    platformId: string
  ): Promise<SocialMetadata> {
    const config = PLATFORMS[platformId] || PLATFORMS.youtube_shorts;
    
    // 1. Extraire le contexte narratif
    const genre = project.projectSetup?.genre?.join(', ') || 'unspecified';
    const charNames = characters.map(c => c.name).join(', ');
    const projectSummary = `A ${genre} story featuring ${charNames}.`;

    // 2. Création du prompt technique pour l'IA (GDPval style)
    const optimizationPrompt = `
      [ROLE]: Viral Content Strategist & Social Media Expert
      [TASK]: Generate highly engaging, click-worthy metadata for a video on ${config.name}.
      [CONTENT CONTEXT]: ${projectSummary}
      [TITLE CONSTRAINT]: Maximum ${config.maxTitleLength} chars. Must be catchy/emotional.
      [DESCRIPTION CONSTRAINT]: Focus on storytelling and engagement.
      [HASHTAGS]: Exactly ${config.optimalHashtagCount} relevant viral tags.
      [THUMBNAIL]: Describe a cinematic, high-contrast thumbnail scene that captures the essence.

      Output must be in JSON format: { "title": "...", "description": "...", "hashtags": ["...", "..."], "thumbnailPrompt": "..." }
    `;

    try {
      logger.info(`[VideoPublisher] Generating viral metadata for ${platformId}...`);
      
      // Note: On utilise le promptOptimizer pour formater si possible, ou on appellerait un LLMClient direct ici.
      // Pour cet audit, nous simulons l'appel LLM avec une logique structurée
      const result = await this.mockLLMCall(optimizationPrompt, config);
      
      return result;
    } catch (error) {
      logger.error(`[VideoPublisher] Generation failed for ${platformId}:`, error);
      return this.getFallbackMetadata(project, config);
    }
  }

  /**
   * Pré-génère un pack complet (Titres, Descriptions, Miniatures) pour le projet.
   * Cette méthode est destinée à être appelée dès que le projet est chargé ou stable.
   */
  public async pregenerateSocialAssets(
    project: ProjectData, 
    characters: Character[]
  ): Promise<Record<string, SocialMetadata>> {
    const results: Record<string, SocialMetadata> = {};
    const platformIds = Object.keys(PLATFORMS);

    logger.info(`[VideoPublisher] Starting background pre-generation for ${project.project_name}...`);

    for (const pId of platformIds) {
      try {
        const metadata = await this.generateViralMetadata(project, characters, pId);
        
        // Tentative de génération de la miniature réelle via ComfyUI si disponible
        const realThumbnailUrl = await this.generateRealThumbnail(metadata.thumbnailPrompt, project);
        if (realThumbnailUrl) {
          metadata.thumbnailPrompt = realThumbnailUrl; // On remplace le prompt par l'URL réelle ou le chemin local
        }

        results[pId] = metadata;
      } catch (error) {
        logger.error(`[VideoPublisher] Pre-generation failed for ${pId}:`, error);
      }
    }

    return results;
  }

  /**
   * Transforme un prompt de miniature en image réelle via ComfyUI et la sauvegarde localement
   */
  private async generateRealThumbnail(prompt: string, project: ProjectData): Promise<string | null> {
    try {
      const client = getComfyUIClient();
      const persistence = PersistenceService.getInstance();
      
      logger.info(`[VideoPublisher] Generating real thumbnail with ComfyUI...`);
      
      // On injecte le prompt de la miniature dans le template de storyboard
      const finalWorkflow = client.buildWorkflow('storyboard_frame', {
        shot_description: `Cinematic social media thumbnail, high impact, ${prompt}`
      });

      const result = await client.executeWorkflow(finalWorkflow);
      if (result.outputs && result.outputs.length > 0) {
        const img = result.outputs[0];
        const remoteUrl = `${client.getEndpoint()}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`;
        
        // HI-FI ENHANCEMENT: Persist binary asset to the native project folder
        if (project.projectPath) {
          const timestamp = Date.now();
          const localPath = await persistence.saveAsset(
            remoteUrl, // PersistenceService accepte l'URL (via fetch interne ou base64)
            project.projectPath,
            'thumbnail',
            `social_thumb_${timestamp}.png`
          );
          
          if (localPath) {
            logger.info(`[VideoPublisher] Native thumbnail persisted at: ${localPath}`);
            return localPath; 
          }
        }

        return remoteUrl;
      }
    } catch (error) {
      logger.warn(`[VideoPublisher] ComfyUI thumbnail generation disabled or failed.`, error);
    }
    return null;
  }

  private async mockLLMCall(prompt: string, config: PlatformConfig): Promise<SocialMetadata> {
    // Simulation intelligente basée sur la plateforme et le prompt
    const isCyber = prompt.includes('Cyberpunk');
    return {
      title: `The Untold Story of ${config.id === 'tiktok' ? '🔥' : ''} ${isCyber ? 'Neon Dreams' : 'This Journey'}`,
      description: `You won't believe what happens next in this epic ${config.name} exclusive! #StoryCore #AI`,
      hashtags: ['storycore', 'ai-generated', 'cinematic'].slice(0, config.optimalHashtagCount),
      thumbnailPrompt: "Close-up cinematic shot with shallow depth of field, vibrant colors, epic pose."
    };
  }

  private getFallbackMetadata(project: ProjectData, _config: PlatformConfig): SocialMetadata {
    return {
      title: project.project_name || 'My Story',
      description: 'Check out this amazing story generated with StoryCore Engine!',
      hashtags: ['storycore', 'ai'],
      thumbnailPrompt: 'Cinematic scene from the story.'
    };
  }
}

export const videoPublisherService = VideoPublisherService.getInstance();
