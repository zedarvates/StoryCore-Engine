/**
 * Music Remix Service - Frontend pour Audio Remix Engine
 * Adaptation intelligente de musique à la durée vidéo
 */

import { backendApiService } from './backendApiService';

export type RemixStyle = 'smooth' | 'beat-cut' | 'structural' | 'dynamic' | 'ai-generative';

export interface BeatMarker {
  timeSeconds: number;
  beatNumber: number;
  measureNumber: number;
  tempo: number;
  confidence: number;
}

export interface SectionMarker {
  startTime: number;
  endTime: number;
  sectionType: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'silence';
  confidence: number;
  label?: string;
}

export interface MusicStructure {
  duration: number;
  tempo: number;
  keySignature: string;
  timeSignature: string;
  beats: BeatMarker[];
  sections: SectionMarker[];
  introDuration: number;
  outroDuration: number;
}

export interface RemixRequest {
  audioId: string;
  audioUrl: string;
  targetDuration: number;
  style: RemixStyle;
  preserveIntro?: boolean;
  preserveOutro?: boolean;
  crossfadeDuration?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  outputFormat?: string;
}

export interface RemixCut {
  startTime: number;
  endTime: number;
  durationRemoved: number;
  reason: string;
  sectionBefore?: string;
  sectionAfter?: string;
}

export interface RemixResult {
  remixId: string;
  originalAudioId: string;
  originalDuration: number;
  targetDuration: number;
  finalDuration: number;
  structure: MusicStructure;
  cuts: RemixCut[];
  crossfades: Array<{
    start: number;
    end: number;
    duration: number;
    type: string;
  }>;
  outputUrl: string;
  processingTime: number;
  qualityScore: number;
  timestamp: string;
}

export interface RemixPreview {
  originalDuration: number;
  targetDuration: number;
  cutsNeeded: number;
  timeSaved: number;
  cutsPreview: Array<{
    start: number;
    end: number;
    duration: number;
    reason: string;
  }>;
  crossfadesCount: number;
  estimatedQuality: number;
  recommendations: {
    originalDuration: number;
    targetDuration: number;
    timeToRemove: number;
    recommendedCuts: Array<{
      type: string;
      start: number;
      end: number;
      duration: number;
      priority: string;
    }>;
    preservationAdvice: string[];
  };
}

export interface MusicRemixService {
  analyzeStructure(audioUrl: string): Promise<MusicStructure>;
  remix(request: RemixRequest): Promise<RemixResult>;
  previewRemix(request: RemixRequest): Promise<RemixPreview>;
  getRemixResult(remixId: string): Promise<RemixResult | null>;
  getRecommendedDuration(structure: MusicStructure, targetDuration: number): Promise<{
    originalDuration: number;
    targetDuration: number;
    timeToRemove: number;
    recommendedCuts: Array<{
      type: string;
      start: number;
      end: number;
      duration: number;
      priority: string;
    }>;
    preservationAdvice: string[];
  }>;
}

class MusicRemixServiceImpl implements MusicRemixService {
  private baseUrl = '/api/v1/audio';
  private structureCache: Map<string, { structure: MusicStructure; timestamp: number }> = new Map();
  private remixCache: Map<string, { result: RemixResult; timestamp: number }> = new Map();
  private cacheTTL = 10 * 60 * 1000; // 10 minutes

  async analyzeStructure(audioUrl: string): Promise<MusicStructure> {
    // Check cache with TTL
    const cacheKey = `structure:${audioUrl}`;
    const cached = this.structureCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      console.log(`[MusicRemix] Cache hit for: ${audioUrl}`);
      return cached.structure;
    }

    try {
      const response = await backendApiService.post<{ structure: MusicStructure }>(
        `${this.baseUrl}/analyze-structure`,
        { audioUrl }
      );

      // Cache with timestamp
      this.structureCache.set(cacheKey, {
        structure: response.structure,
        timestamp: Date.now()
      });

      console.log(`[MusicRemix] Analyzed structure: ${response.structure.tempo} BPM, ${response.structure.sections.length} sections`);
      return response.structure;
    } catch (error) {
      console.error('[MusicRemix] Structure analysis failed:', error);
      // Retourner une structure par défaut
      return this.getDefaultStructure();
    }
  }

  async remix(request: RemixRequest): Promise<RemixResult> {
    try {
      console.log(`[MusicRemix] Starting remix: ${request.audioId} -> ${request.targetDuration}s`);

      const response = await backendApiService.post<RemixResult>(
        `${this.baseUrl}/remix`,
        request
      );

      // Cache with timestamp
      this.remixCache.set(response.remixId, {
        result: response,
        timestamp: Date.now()
      });

      console.log(`[MusicRemix] Remix complete: ${response.cuts.length} cuts, ${response.finalDuration.toFixed(1)}s duration`);
      return response;
    } catch (error) {
      console.error('[MusicRemix] Remix failed:', error);
      throw error;
    }
  }

  async previewRemix(request: RemixRequest): Promise<RemixPreview> {
    try {
      return await backendApiService.post<RemixPreview>(
        `${this.baseUrl}/preview`,
        request
      );
    } catch (error) {
      console.error('[MusicRemix] Preview failed:', error);
      throw error;
    }
  }

  async getRemixResult(remixId: string): Promise<RemixResult | null> {
    // Check cache with TTL first
    const cached = this.remixCache.get(remixId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    try {
      const response = await backendApiService.get<RemixResult>(
        `${this.baseUrl}/remix/${remixId}`
      );

      this.remixCache.set(remixId, {
        result: response,
        timestamp: Date.now()
      });
      return response;
    } catch (error) {
      console.error('[MusicRemix] Get remix result failed:', error);
      return null;
    }
  }

  async getRecommendedDuration(
    structure: MusicStructure,
    targetDuration: number
  ): Promise<{
    originalDuration: number;
    targetDuration: number;
    timeToRemove: number;
    recommendedCuts: Array<{
      type: string;
      start: number;
      end: number;
      duration: number;
      priority: string;
    }>;
    preservationAdvice: string[];
  }> {
    try {
      return await backendApiService.post(
        `${this.baseUrl}/recommend`,
        { structure, targetDuration }
      );
    } catch (error) {
      console.error('[MusicRemix] Get recommendations failed:', error);
      
      // Calcul local simple
      const timeToRemove = Math.max(0, structure.duration - targetDuration);
      return {
        originalDuration: structure.duration,
        targetDuration,
        timeToRemove,
        recommendedCuts: [],
        preservationAdvice: []
      };
    }
  }

  /**
   * Structure par défaut
   */
  private getDefaultStructure(): MusicStructure {
    return {
      duration: 120,
      tempo: 120,
      keySignature: 'C major',
      timeSignature: '4/4',
      beats: [],
      sections: [],
      introDuration: 8,
      outroDuration: 12
    };
  }

  /**
   * Formater la durée en mm:ss
   */
  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Calculer les cuts suggérés pour l'UI
   */
  calculateSuggestedCuts(structure: MusicStructure, targetDuration: number): Array<{
    section: string;
    originalStart: number;
    originalEnd: number;
    suggestedStart: number;
    suggestedEnd: number;
    removed: number;
  }> {
    const cuts = [];
    const timeToRemove = structure.duration - targetDuration;
    
    if (timeToRemove <= 0) return [];

    let removed = 0;
    
    for (const section of structure.sections) {
      if (removed >= timeToRemove) break;
      
      const sectionDuration = section.endTime - section.startTime;
      
      // Priorité: outro > intro > bridge > verse > chorus
      let removeFromSection = 0;
      
      if (section.sectionType === 'outro' && structure.outroDuration > 4) {
        removeFromSection = Math.min(sectionDuration, structure.outroDuration - 4);
      } else if (section.sectionType === 'intro' && structure.introDuration > 2) {
        removeFromSection = Math.min(sectionDuration, structure.introDuration - 2);
      } else if (['bridge', 'verse'].includes(section.sectionType)) {
        removeFromSection = Math.min(sectionDuration, timeToRemove - removed);
      }
      
      if (removeFromSection > 0) {
        cuts.push({
          section: section.sectionType,
          originalStart: section.startTime,
          originalEnd: section.endTime,
          suggestedStart: section.startTime,
          suggestedEnd: section.endTime - removeFromSection,
          removed: removeFromSection
        });
        removed += removeFromSection;
      }
    }
    
    return cuts;
  }

  /**
   * Effacer les caches
   */
  clearCaches(): void {
    this.structureCache.clear();
    this.remixCache.clear();
  }
}

export const musicRemixService = new MusicRemixServiceImpl();

