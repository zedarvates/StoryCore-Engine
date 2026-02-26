
import { logger } from '@/utils/logger';
import { notificationService } from './NotificationService';
import { backendApiService } from './backendApiService';
import { captionStylesService } from './CaptionStylesService';

/**
 * AudioProductionService
 * 
 * Orchestrates advanced audio and subtitles features for professional music videos.
 * - Vocal Recognition & Automatic Captioning
 * - Sound Extraction from Video Clips
 * - Unified Subtitle Management (One-step adjustment)
 * - Auto-Speed synchronization with BPM
 */

export interface SubtitleClip {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  styleId: string;
}

export interface AudioLayer {
  id: string;
  type: 'music' | 'vocal' | 'effect';
  url: string;
  volume: number;
  isExtracted: boolean;
}

class AudioProductionService {
  private subtitles: SubtitleClip[] = [];

  /**
   * Automatically recognizes speech and generates subtitles
   */
  async generateAutoCaptions(videoUrl: string, language: string = 'fr'): Promise<SubtitleClip[]> {
    logger.info(`[AudioProduction] Starting speech recognition for: ${videoUrl}`);
    notificationService.info('Reconnaissance Vocale', 'Analyse de la piste audio en cours...');

    try {
      const response = await backendApiService.post<{ subtitles: SubtitleClip[] }>('/api/audio/auto-captions', {
        videoUrl,
        language
      });
      
      this.subtitles = response.subtitles;
      return this.subtitles;
    } catch (error) {
      logger.error('Auto-captions failed', error);
      notificationService.error('Erreur', 'Échec de la reconnaissance vocale automatique.');
      return [];
    }
  }

  /**
   * Adjusts all subtitles styles in one step
   */
  applyStyleToAllSubtitles(styleId: string): void {
    const style = captionStylesService.getStyle(styleId);
    if (!style) {
      notificationService.error('Erreur', 'Style de sous-titre inconnu.');
      return;
    }

    this.subtitles = this.subtitles.map(sub => ({
      ...sub,
      styleId
    }));

    notificationService.success('Mise à jour', `Style "${style.name}" appliqué à tous les sous-titres.`);
  }

  /**
   * Extracts stems from an audio file (Professional Vocal/Drums/Bass separation)
   */
  async extractStems(audioId: string): Promise<{ job_id: string; status: string }> {
    logger.info(`[AudioProduction] Starting stem extraction for: ${audioId}`);
    notificationService.info('Extraction IA', 'Séparation des stems (Vocal, Drums, Bass)...');

    try {
      return await backendApiService.post<{ job_id: string; status: string }>('/api/audio/extract-stems', {
        audio_id: audioId,
        project_id: 'default'
      });
    } catch (error) {
      logger.error('Stem extraction failed', error);
      notificationService.error('Erreur', 'Échec de l\'extraction des stems.');
      throw error;
    }
  }

  /**
   * Extracts audio from a video clip
   */
  async extractAudioFromClip(videoUrl: string): Promise<AudioLayer> {
    logger.info(`[AudioProduction] Extracting audio from: ${videoUrl}`);
    notificationService.info('Extraction Audio', 'Séparation du flux audio...');

    try {
      const response = await backendApiService.post<AudioLayer>('/api/audio/extract', {
        videoUrl
      });
      return response;
    } catch (error) {
      logger.error('Audio extraction failed', error);
      throw error;
    }
  }

  /**
   * Computes automatic speed points based on audio BPM
   */
  async calculateBeatSpeedPoints(audioUrl: string): Promise<Array<{ time: number; speed: number }>> {
    logger.info(`[AudioProduction] Analyzing BPM for speed trends: ${audioUrl}`);
    
    try {
      const response = await backendApiService.post<Array<{ time: number; speed: number }>>(
        '/api/audio/analyze-trends',
        { audioUrl, trendType: 'auto-speed' }
      );
      return response;
    } catch (error) {
      logger.error('Beat analysis failed', error);
      return [];
    }
  }


  /**
   * Export all production metadata for the video engine
   */
  getProductionMetadata() {
    return {
      subtitles: this.subtitles,
      timestamp: new Date().toISOString()
    };
  }
}

export const audioProductionService = new AudioProductionService();
