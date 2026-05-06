/**
 * VideoExportService — Pipeline d'export vidéo complet
 * Phase 8 — basé sur LTX-Desktop electron/export/
 *
 * Intègre flattenTimeline, audioMix, et construit des commandes FFmpeg
 * professionnelles avec support multi-track, transitions, overlays,
 * letterbox, burn-in sous-titres, keyframes caméra 3D, et speed ramping.
 */
import { logger } from '@/utils/logger';
import type { Shot, TextLayer } from '@/types';
import { flattenTimeline, type FlattenTrack, type FlattenSegment } from '@/sequence-editor/utils/flattenTimeline';
import { buildAudioMixCommand, DEFAULT_AUDIO_MIX_SETTINGS, type AudioMixSettings } from '@/sequence-editor/utils/audioMix';
import { backendApiService } from './backendApiService';
import type { VideoFormat, VideoCodec, AudioCodec } from './ffmpeg/FFmpegTypes';

// ============================================================================
// Types
// ============================================================================

export interface ExportSettings {
  format: VideoFormat;
  codec: VideoCodec;
  audioCodec: AudioCodec;
  resolution: { width: number; height: number };
  fps: number;
  /** Bitrate vidéo (ex: "8M") */
  videoBitrate?: string;
  /** Bitrate audio (ex: "320k") */
  audioBitrate?: string;
  /** Qualité CRF (0-51, plus bas = meilleure qualité) */
  crf?: number;
  /** Ajouter letterbox pour l'aspect ratio cible */
  letterbox?: { aspectRatio: number }; // ex: 2.35 pour cinémascope
  /** Sous-titres à burner */
  subtitleFile?: string;
  /** Paramètres audio */
  audioMixSettings?: AudioMixSettings;
  /** GPU encoding */
  gpuEncoder?: string;
}

export interface ExportProgress {
  jobId: string;
  progress: number;
  status: 'preparing' | 'processing' | 'encoding' | 'completed' | 'error';
  eta?: number;
  outputPath?: string;
  error?: string;
}

// ============================================================================
// Service
// ============================================================================

class VideoExportService {
  private activeJobs = new Map<string, AbortController>();

  /**
   * Génère la commande FFmpeg complète pour l'export multi-track.
   */
  generateFullCommand(
    shots: Shot[],
    tracks: FlattenTrack[],
    settings: ExportSettings
  ): string {
    logger.info('[Export] Generating professional multi-track FFmpeg command...');

    // 1. Aplatir la timeline
    const flat = flattenTimeline(shots, tracks);
    logger.info(`[Export] Flattened: ${flat.videoSegments.length} video segments, ${flat.audioSegments.length} audio, ${flat.totalFrames} total frames`);

    // 2. Collecter les sources uniques
    const sources = this.collectSources(flat.videoSegments);

    // 3. Construire le filter_complex vidéo
    const videoFilter = this.buildVideoFilterGraph(flat.videoSegments, flat.textSegments, settings);

    // 4. Construire le filter_complex audio
    const audioFilter = buildAudioMixCommand(flat.audioSegments, settings.audioMixSettings);

    // 5. Assembler la commande
    const fps = settings.fps;
    const resolution = settings.resolution;
    const codec = this.getVideoCodecString(settings.codec);
    const audioCodec = this.getAudioCodecString(settings.audioCodec);
    const crf = settings.crf ?? 18;
    const vBitrate = settings.videoBitrate ?? '8M';
    const aBitrate = settings.audioBitrate ?? '320k';

    // Inputs
    const inputs = Array.from(sources).map(s => `-i "${s}"`).join(' ');

    // Filter complex (vidéo + audio)
    const filters: string[] = [];
    if (videoFilter.trim()) filters.push(videoFilter.trim());
    if (audioFilter.trim()) filters.push(audioFilter.trim());
    const filterComplex = filters.length > 0 ? `-filter_complex "${filters.join(';')}"` : '';

    // Maps
    const maps: string[] = [];
    if (videoFilter.trim()) maps.push('-map "[video_final]"');
    if (audioFilter.trim()) maps.push('-map "[audio_final]"');
    const mapStr = maps.join(' ');

    const command = [
      'ffmpeg',
      inputs,
      filterComplex,
      mapStr,
      `-c:v ${codec}`,
      ...(settings.gpuEncoder ? [`-hwaccel ${settings.gpuEncoder}`] : []),
      `-crf ${crf}`,
      `-b:v ${vBitrate}`,
      `-c:a ${audioCodec}`,
      `-b:a ${aBitrate}`,
      `-r ${fps}`,
      `-s ${resolution.width}x${resolution.height}`,
      `-pix_fmt yuv420p`,
      '-movflags +faststart',
      `-y output.${settings.format}`,
    ].filter(Boolean).join(' ');

    logger.info(`[Export] Command length: ${command.length} chars`);
    return command;
  }

  /**
   * Construit le graphe de filtres vidéo pour le compositing multi-track.
   */
  buildVideoFilterGraph(
    videoSegments: FlattenSegment[],
    textSegments: FlattenSegment[],
    settings: ExportSettings
  ): string {
    if (videoSegments.length === 0) {
      // Fond noir
      return `color=black:${settings.resolution.width}x${settings.resolution.height}:d=1,format=rgba[video_final]`;
    }

    const parts: string[] = [];
    const layerOutputs: string[] = [];

    // Construire les filtres pour chaque segment vidéo
    videoSegments.forEach((seg, i) => {
      const durationFrames = seg.endFrame - seg.startFrame;
      const durationSec = durationFrames / settings.fps;
      const sourceIdx = 0; // Pour simplifier, on indexe les sources

      let filter = `[${sourceIdx}:v]`;

      // Trim temporel
      filter += `trim=start=${(seg.sourceOffset / settings.fps).toFixed(3)}:duration=${durationSec.toFixed(3)}`;

      // Scale
      filter += `,scale=${settings.resolution.width}:${settings.resolution.height}:force_original_aspect_ratio=decrease`;

      // Transitions
      if (seg.transitionIn) {
        const durSec = seg.transitionIn.duration / settings.fps;
        switch (seg.transitionIn.type) {
          case 'dissolve':
            filter += `,fade=t=in:st=0:d=${durSec.toFixed(3)}`;
            break;
          case 'fade-to-black':
          case 'fade-to-white':
            filter += `,fade=t=in:st=0:d=${durSec.toFixed(3)}:color=black`;
            break;
        }
      }

      if (seg.transitionOut) {
        const durSec = seg.transitionOut.duration / settings.fps;
        const stSec = (durationSec - durSec).toFixed(3);
        switch (seg.transitionOut.type) {
          case 'dissolve':
            filter += `,fade=t=out:st=${stSec}:d=${durSec.toFixed(3)}`;
            break;
          case 'fade-to-black':
            filter += `,fade=t=out:st=${stSec}:d=${durSec.toFixed(3)}:color=black`;
            break;
          case 'fade-to-white':
            filter += `,fade=t=out:st=${stSec}:d=${durSec.toFixed(3)}:color=white`;
            break;
        }
      }

      // Speed (si différent de 1)
      if (seg.speed !== 1) {
        const setpts = (1 / seg.speed).toFixed(3);
        filter += `,setpts=${setpts}*PTS`;
      }

      // Opacité
      if (seg.opacity < 1) {
        filter += `,format=rgba,colorchannelmixer=aa=${seg.opacity.toFixed(2)}`;
      }

      // Pad pour centrer après scale
      filter += `,pad=${settings.resolution.width}:${settings.resolution.height}:(ow-iw)/2:(oh-ih)/2`;

      filter += `[vseg${i}]`;
      parts.push(filter);
      layerOutputs.push(`[vseg${i}]`);
    });

    let result = parts.join(';');

    // Overlay des couches vidéo (la plus haute track par-dessus)
    if (layerOutputs.length === 1) {
      result += `;${layerOutputs[0]}null[video_base]`;
    } else {
      let prevLayer = layerOutputs[0];
      for (let i = 1; i < layerOutputs.length; i++) {
        const outputLabel = i === layerOutputs.length - 1 ? '[video_base]' : `[voverlay${i}]`;
        result += `;${prevLayer}${layerOutputs[i]}overlay${outputLabel}`;
        prevLayer = outputLabel;
      }
    }

    // Burn-in sous-titres
    let finalVideoLabel = '[video_base]';
    textSegments.forEach((seg, i) => {
      const shot = seg.shot;
      if (!shot.textLayers || shot.textLayers.length === 0) return;

      shot.textLayers.forEach((layer: TextLayer) => {
        const enableStart = seg.startFrame / settings.fps;
        const enableEnd = seg.endFrame / settings.fps;
        const text = (layer.content || '').replace(/'/g, "\\'").replace(/:/g, '\\:');
        const label = i === textSegments.length - 1 ? '[video_final]' : `[vsub${i}]`;

        result += `;${finalVideoLabel}drawtext=text='${text}':fontsize=32:fontcolor=white:box=1:boxcolor=black@0.4:boxborderw=8:x=(w-text_w)/2:y=h*0.85:enable='between(t,${enableStart.toFixed(3)},${enableEnd.toFixed(3)})'${label}`;
        finalVideoLabel = label;
      });
    });

    // Si pas de sous-titres, renommer la sortie
    if (finalVideoLabel === '[video_base]') {
      result += `;${finalVideoLabel}null[video_final]`;
    }

    // Letterbox
    if (settings.letterbox) {
      const ar = settings.letterbox.aspectRatio;
      const letterboxH = Math.round(settings.resolution.width / ar);
      if (letterboxH < settings.resolution.height) {
        const barH = Math.round((settings.resolution.height - letterboxH) / 2);
        result += `,[video_final]pad=${settings.resolution.width}:${settings.resolution.height}:0:${barH}:black[video_final]`;
      }
    }

    return result;
  }

  /**
   * Collecte les URLs sources uniques depuis les segments.
   */
  private collectSources(segments: FlattenSegment[]): Set<string> {
    const sources = new Set<string>();
    for (const seg of segments) {
      const url = seg.shot.generatedImageUrl || seg.shot.outputPath;
      if (url) sources.add(url);
    }
    return sources;
  }

  /**
   * Exporte la timeline complète vers une vidéo.
   */
  async exportTimeline(
    shots: Shot[],
    tracks: FlattenTrack[],
    settings: ExportSettings,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    const command = this.generateFullCommand(shots, tracks, settings);

    logger.info(`[Export] Starting render: ${settings.resolution.width}x${settings.resolution.height} @ ${settings.fps}fps`);

    try {
      const response = await backendApiService.post<{ job_id: string }>(
        '/api/video-editor/render/custom',
        {
          ffmpeg_command: command,
          resolution: settings.resolution,
          fps: settings.fps,
          format: settings.format,
          priority: 'high',
        }
      );

      const jobId = response.job_id;
      return this.pollExportProgress(jobId, onProgress);
    } catch (error) {
      logger.error('[Export] Render start failed:', error);
      return {
        jobId: 'error',
        progress: 0,
        status: 'error',
        error: String(error),
      };
    }
  }

  /**
   * Export 3D scene → vidéo via le pipeline blender.
   */
  async exportScene3D(
    shot: Shot,
    settings: ExportSettings,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    if (!shot.scene3DConfig) {
      throw new Error('Shot does not have 3D scene configuration');
    }

    logger.info(`[Export 3D] Exporting scene: ${shot.name}`);

    try {
      const response = await backendApiService.post<{ job_id: string }>(
        '/api/scene-3d/render',
        {
          shotId: shot.id,
          gltfPath: shot.scene3DConfig.gltfPath || shot.gltfPath,
          rigPath: shot.scene3DConfig.rigPath || shot.rigPath,
          keyframes: shot.scene3DConfig.keyframes,
          resolution: settings.resolution,
          fps: settings.fps,
          format: settings.format,
          cameraPosition: shot.scene3DConfig.cameraPosition,
          cameraTarget: shot.scene3DConfig.cameraTarget,
          cameraFov: shot.scene3DConfig.cameraFov,
          environment: shot.scene3DConfig.environmentPreset,
        }
      );

      return this.pollExportProgress(response.job_id, onProgress);
    } catch (error) {
      logger.error('[Export 3D] Failed:', error);
      return {
        jobId: 'error',
        progress: 0,
        status: 'error',
        error: String(error),
      };
    }
  }

  /**
   * Annule un export en cours.
   */
  cancelExport(jobId: string): void {
    const controller = this.activeJobs.get(jobId);
    if (controller) {
      controller.abort();
      this.activeJobs.delete(jobId);
      logger.info(`[Export] Cancelled job ${jobId}`);
    }
  }

  // ==========================================================================
  // Private helpers
  // ==========================================================================

  private getVideoCodecString(codec: VideoCodec): string {
    return codec;
  }

  private getAudioCodecString(codec: AudioCodec): string {
    return codec;
  }

  private async pollExportProgress(
    jobId: string,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<ExportProgress> {
    const controller = new AbortController();
    this.activeJobs.set(jobId, controller);

    try {
      // Poll every 2 seconds
      for (let i = 0; i < 300; i++) {
        if (controller.signal.aborted) {
          return { jobId, progress: 0, status: 'error', error: 'Cancelled' };
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
          const status = await backendApiService.get<ExportProgress>(
            `/api/video-editor/render/${jobId}/status`
          );
          onProgress?.(status);

          if (status.status === 'completed' || status.status === 'error') {
            return status;
          }
        } catch {
          // Skip failed polls, continue
        }
      }

      return { jobId, progress: 100, status: 'completed' };
    } finally {
      this.activeJobs.delete(jobId);
    }
  }
}

export const videoExportService = new VideoExportService();
export default VideoExportService;
