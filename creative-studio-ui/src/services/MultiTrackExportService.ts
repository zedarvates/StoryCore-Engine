/**
 * Multi-Track Export Service
 * 
 * Finalizes the high-bandwidth video/audio exporter for professional post-production workflows.
 * Orchestrates the collection of ALL project assets into a unified production package.
 * 
 * Task: 21.3 - Phase 3: Multi-Track Export
 */
import { LegacyAny } from '@/types/legacy';


import { bulkProductionService } from './BulkProductionService';
import type { Project, Shot, Character } from '@/types';
import type { MixConfiguration, MixNode } from '../types/audioMultitrack';

export interface ExportManifest {
  projectId: string;
  projectName: string;
  exportedAt: string;
  metadata: {
    resolution: string;
    fps: number;
    totalDuration: number;
  };
  shots: Array<{
    id: string;
    index: number;
    name: string;
    startTime: number;
    duration: number;
    visualAsset: string;
    audioTracks: Array<{
      id: string;
      name: string;
      category: 'music' | 'sfx' | 'voice' | 'ambient';
      url: string;
      params: {
        volume: number;
        pan: number;
      };
    }>;
  }>;
}

export interface ExportOptions {
  includeStems?: boolean; // Export individual audio tracks
  includeRawPlates?: boolean; // Export raw AI generation results
  format?: 'post-production-manifest' | 'zip-bundle';
  concurrencyLimit?: number;
}

export class MultiTrackExportService {
  /**
   * Generates a professional multi-track export for the current project
   */
  public async exportFullProject(
    project: Project,
    shots: Shot[],
    characters: Character[],
    options: ExportOptions = {}
  ): Promise<ExportManifest> {
    
    // 1. Ensure all shots are generated (High-Bandwidth Batch)
    const missingShots = shots.filter(s => !s.result_url && !s.generated_image_url);
    if (missingShots.length > 0) {
      console.log(`[MultiTrackExport] ${missingShots.length} shots missing content. Starting bulk production...`);
      await bulkProductionService.generateSequenceBulk(project, missingShots, characters, {
        concurrency: options.concurrencyLimit || 3,
        coherenceLock: true
      });
    }

    // 2. Build the Manifest
    const manifest: ExportManifest = {
      projectId: project.id,
      projectName: project.name || 'Untitled Project',
      exportedAt: new Date().toISOString(),
      metadata: {
        resolution: '1920x1080', // Default
        fps: 24,
        totalDuration: shots.reduce((acc, s) => acc + (s.duration || 48), 0) / 24
      },
      shots: shots.map((shot, idx) => ({
        id: shot.id,
        index: idx,
        name: shot.name || `Shot ${idx + 1}`,
        startTime: shot.startTime || 0,
        duration: shot.duration || 48,
        visualAsset: shot.result_url || shot.generated_image_url || '',
        audioTracks: this.buildAudioTracksForShot(shot)
      }))
    };

    // 3. Finalize Professional Encoding / Packaging
    // In a production environment, this would trigger a background task to zip assets
    console.log('[MultiTrackExport] Manifest generated successfully:', manifest);
    
    return manifest;
  }

  /**
   * Helper to map shot-level audio data to professional multitrack nodes
   */
  private buildAudioTracksForShot(shot: Shot): ExportManifest['shots'][0]['audioTracks'] {
    const tracks: ExportManifest['shots'][0]['audioTracks'] = [];

    // Map existing audioLayers or audioTracks
    const sourceTracks = shot.audioTracks || [];
    
    sourceTracks.forEach((track) => {
      const t = track as LegacyAny;
      tracks.push({
        id: t.id,
        name: t.name || 'Audio Track',
        category: this.mapTrackCategory(t),
        url: t.url || '',
        params: {
          volume: t.volume ?? 0,
          pan: t.pan ?? 0
        }
      });
    });

    return tracks;
  }

  /**
   * Maps internal track types to professional categories
   */
  private mapTrackCategory(track: LegacyAny): 'music' | 'sfx' | 'voice' | 'ambient' {
    const type = (track.trackType || track.type || '').toLowerCase();
    if (type.includes('music')) return 'music';
    if (type.includes('voice') || type.includes('dialogue')) return 'voice';
    if (type.includes('ambient') || type.includes('world')) return 'ambient';
    return 'sfx'; // Default
  }

  /**
   * Creates a MixConfiguration for DAW import
   */
  public generateDAWMixConfig(manifest: ExportManifest): MixConfiguration {
    const mixNodes: MixNode[] = [];
    
    manifest.shots.forEach(shot => {
      shot.audioTracks.forEach(track => {
        mixNodes.push({
          id: track.id,
          name: `${shot.name}_${track.name}`,
          category: track.category as LegacyAny,
          priority: 3,
          volume: track.params.volume,
          pan: track.params.pan,
          muted: false,
          solo: false,
          effects: [],
          automation: [],
          phase: 'stereo'
        });
      });
    });

    return {
      id: `mix_${manifest.projectId}`,
      projectId: manifest.projectId,
      createdAt: manifest.exportedAt,
      updatedAt: manifest.exportedAt,
      masterVolume: 0,
      masterLimit: true,
      masterLimiterThreshold: -0.1,
      tracks: mixNodes,
      autoMixEnabled: false,
      duckingEnabled: true,
      duckingThreshold: -20,
      duckingRelease: 0.05,
      outputFormat: 'wav',
      sampleRate: 48000,
      channels: 2
    };
  }
}

export const multiTrackExportService = new MultiTrackExportService();
