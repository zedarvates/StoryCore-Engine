/**
 * StoryCore-Engine Audio-Sequence Integration Service
 */

import type {
  MusicProfile,
  SFXProfile,
  VoiceProfile,
  MixConfiguration
} from '../types/audioMultitrack';
import { audioMultitrackService } from './audioMultitrack';

export type IntegrationAudioType = 'music' | 'sfx' | 'voice' | 'all';
export type IntegrationStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface SequenceAudioContext {
  projectId: string;
  projectType?: string;
  location?: string;
  themes: string[];
  visualStyle?: string;
  emotionalIntensity: string;
  shotId?: string;
  shotType: string;
  shotDescription?: string;
  shotDuration: number;
  actionType?: string;
  actionIntensity?: string;
  visualRhythm?: string;
  autoMix: boolean;
  ducking: boolean;
}

export interface IntegratedAudioResult {
  success: boolean;
  status: IntegrationStatus;
  musicPrompts: TrackPrompt[];
  sfxPrompts: TrackPrompt[];
  voicePrompts: TrackPrompt[];
  errors: string[];
  generatedAt: string;
}

export interface TrackPrompt {
  trackName: string;
  trackType: string;
  prompt: string;
  shotId?: string;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: string;
  clips: TimelineClip[];
  muted: boolean;
  volume: number;
  height: number;
}

export interface TimelineClip {
  id: string;
  name: string;
  startTime: number;
  duration: number;
  audioTrackId: string;
  prompt: string;
  regeneratable: boolean;
}

export interface TimelineSyncData {
  sequenceId: string;
  projectId: string;
  totalDuration: number;
  tracks: TimelineTrack[];
  generatedAt: string;
  audioPrompts: {
    music: TrackPrompt[];
    sfx: TrackPrompt[];
    voice: TrackPrompt[];
  };
}

export class AudioSequenceIntegrationService {
  /**
   * Extract audio contexts from a generated sequence
   */
  extractContextsFromSequence(
    sequence: unknown,
    projectContext?: Record<string, unknown>
  ): SequenceAudioContext[] {
    const contexts: SequenceAudioContext[] = [];
    const projectId = sequence.project_id || '';
    const shots = sequence.shots || [];
    const projType = projectContext?.project_type || '';
    const location = projectContext?.location || '';
    const themes = projectContext?.themes || [];
    const style = projectContext?.visual_style || '';
    const intensity = projectContext?.emotional_intensity || 'medium';

    for (const shot of shots) {
      contexts.push({
        projectId,
        projectType: projType,
        location,
        themes: [...themes],
        visualStyle: style,
        emotionalIntensity: intensity,
        shotId: shot.id,
        shotType: shot.shot_type || 'action',
        shotDescription: shot.prompt || '',
        shotDuration: shot.duration_seconds || 5.0,
        autoMix: true,
        ducking: true
      });
    }
    return contexts;
  }

  /**
   * Generate all audio for a complete sequence
   */
  async generateAudioForSequence(
    sequence: unknown,
    projectContext?: Record<string, unknown>,
    audioTypes: IntegrationAudioType[] = ['all']
  ): Promise<IntegratedAudioResult> {
    const result: IntegratedAudioResult = {
      success: true,
      status: 'completed',
      musicPrompts: [],
      sfxPrompts: [],
      voicePrompts: [],
      errors: [],
      generatedAt: new Date().toISOString()
    };

    const contexts = this.extractContextsFromSequence(sequence, projectContext);
    const shouldGenerateMusic = audioTypes.includes('all') || audioTypes.includes('music');
    const shouldGenerateSFX = audioTypes.includes('all') || audioTypes.includes('sfx');
    const shouldGenerateVoice = audioTypes.includes('all') || audioTypes.includes('voice');

    if (shouldGenerateMusic) {
      for (const context of contexts) {
        result.musicPrompts.push(
          { trackName: 'Base', trackType: 'base', prompt: `Music base for ${context.shotType}`, shotId: context.shotId },
          { trackName: 'Melody', trackType: 'melody', prompt: `Music melody for ${context.shotType}`, shotId: context.shotId },
          { trackName: 'Percussion', trackType: 'percussion', prompt: `Percussion for ${context.shotType}`, shotId: context.shotId },
          { trackName: 'Bass', trackType: 'bass', prompt: `Bass for ${context.shotType}`, shotId: context.shotId },
          { trackName: 'FX', trackType: 'fx', prompt: `Music FX for ${context.shotType}`, shotId: context.shotId },
          { trackName: 'Drones', trackType: 'drones', prompt: `Drones for ${context.shotType}`, shotId: context.shotId }
        );
      }
    }

    if (shouldGenerateSFX) {
      for (const context of contexts) {
        result.sfxPrompts.push(
          { trackName: 'Action', trackType: 'action', prompt: `SFX for ${context.shotType} action`, shotId: context.shotId },
          { trackName: 'Environment', trackType: 'environment', prompt: `Environment sounds for ${context.location || 'scene'}`, shotId: context.shotId },
          { trackName: 'Stylized', trackType: 'stylized', prompt: `Stylized SFX for ${context.shotType}`, shotId: context.shotId },
          { trackName: 'Bullet Time', trackType: 'bullet_time', prompt: `Bullet time SFX for ${context.shotType}`, shotId: context.shotId }
        );
      }
    }

    if (shouldGenerateVoice) {
      for (const context of contexts) {
        result.voicePrompts.push({
          trackName: 'Voice',
          trackType: context.shotType === 'narration' ? 'whisper' : 'raw',
          prompt: context.shotDescription || '',
          shotId: context.shotId
        });
      }
    }

    result.status = result.success ? 'completed' : 'failed';
    return result;
  }

  /**
   * Attach generated audio to a shot
   */
  attachAudioToShot(
    shot: unknown,
    audioResult: IntegratedAudioResult,
    audioType: IntegrationAudioType = 'all'
  ): unknown {
    const shotId = shot.id;
    const musicTracks = audioResult.musicPrompts.filter(p => p.shotId === shotId);
    const sfxTracks = audioResult.sfxPrompts.filter(p => p.shotId === shotId);
    const voiceTracks = audioResult.voicePrompts.filter(p => p.shotId === shotId);
    const audioTracks: unknown[] = [];
    const duration = shot.duration_seconds || 5.0;

    if (audioType === 'all' || audioType === 'music') {
      for (const track of musicTracks) {
        audioTracks.push({
          id: `${shotId}_music_${track.trackName.toLowerCase().replace(' ', '_')}`,
          name: track.trackName,
          type: 'music',
          prompt: track.prompt,
          startTime: 0,
          duration,
          volume: -6.0,
          muted: false,
          regeneratable: true
        });
      }
    }

    if (audioType === 'all' || audioType === 'sfx') {
      for (const track of sfxTracks) {
        audioTracks.push({
          id: `${shotId}_sfx_${track.trackName.toLowerCase().replace(' ', '_')}`,
          name: track.trackName,
          type: 'sfx',
          prompt: track.prompt,
          startTime: 0,
          duration,
          volume: 0.0,
          muted: false,
          regeneratable: true
        });
      }
    }

    if (audioType === 'all' || audioType === 'voice') {
      for (const track of voiceTracks) {
        audioTracks.push({
          id: `${shotId}_voice_${track.trackName.toLowerCase().replace(' ', '_')}`,
          name: track.trackName,
          type: 'voice',
          prompt: track.prompt,
          startTime: 0,
          duration,
          volume: 0.0,
          muted: false,
          regeneratable: true
        });
      }
    }

    return { ...shot, audio_tracks: audioTracks, audio_generated: audioTracks.length > 0 };
  }

  /**
   * Generate timeline synchronization data
   */
  generateTimelineSyncData(sequence: unknown, audioResult: IntegratedAudioResult): TimelineSyncData {
    const shots = sequence.shots || [];
    const timelineTracks: TimelineTrack[] = [
      { id: 'timeline_dialogue', name: 'Dialogue', type: 'voice', clips: [], muted: false, volume: 0, height: 40 },
      { id: 'timeline_sfx_action', name: 'SFX - Action', type: 'sfx', clips: [], muted: false, volume: 0, height: 40 },
      { id: 'timeline_sfx_environment', name: 'SFX - Environment', type: 'sfx', clips: [], muted: false, volume: 0, height: 40 },
      { id: 'timeline_music_base', name: 'Music - Base', type: 'music', clips: [], muted: false, volume: 0, height: 40 },
      { id: 'timeline_music_melody', name: 'Music - Melody', type: 'music', clips: [], muted: false, volume: 0, height: 40 },
      { id: 'timeline_music_percussion', name: 'Music - Percussion', type: 'music', clips: [], muted: false, volume: 0, height: 40 },
      { id: 'timeline_music_bass', name: 'Music - Bass', type: 'music', clips: [], muted: false, volume: 0, height: 40 },
      { id: 'timeline_music_fx', name: 'Music - FX', type: 'music', clips: [], muted: false, volume: 0, height: 40 }
    ];

    let currentTime = 0;
    for (const shot of shots) {
      const shotDuration = shot.duration_seconds || 5.0;
      const shotId = shot.id || '';
      const audioTracks = shot.audio_tracks || [];

      for (const audioTrack of audioTracks) {
        const trackType = audioTrack.type || 'music';
        const trackName = audioTrack.name || '';
        let timelineTrackId = '';

        if (trackType === 'voice') {
          timelineTrackId = 'timeline_dialogue';
        } else if (trackType === 'sfx') {
          timelineTrackId = trackName.toLowerCase().includes('action') ? 'timeline_sfx_action' : 'timeline_sfx_environment';
        } else {
          const nameLower = trackName.toLowerCase();
          if (nameLower.includes('base')) timelineTrackId = 'timeline_music_base';
          else if (nameLower.includes('melody')) timelineTrackId = 'timeline_music_melody';
          else if (nameLower.includes('percussion')) timelineTrackId = 'timeline_music_percussion';
          else if (nameLower.includes('bass')) timelineTrackId = 'timeline_music_bass';
          else if (nameLower.includes('fx')) timelineTrackId = 'timeline_music_fx';
          else timelineTrackId = 'timeline_music_base';
        }

        for (const track of timelineTracks) {
          if (track.id === timelineTrackId) {
            track.clips.push({
              id: audioTrack.id,
              name: trackName,
              startTime: currentTime,
              duration: shotDuration,
              audioTrackId: audioTrack.id,
              prompt: audioTrack.prompt || '',
              regeneratable: audioTrack.regeneratable !== false
            });
            break;
          }
        }
      }
      currentTime += shotDuration;
    }

    return {
      sequenceId: sequence.id || '',
      projectId: sequence.project_id || '',
      totalDuration: currentTime,
      tracks: timelineTracks,
      generatedAt: new Date().toISOString(),
      audioPrompts: { music: audioResult.musicPrompts, sfx: audioResult.sfxPrompts, voice: audioResult.voicePrompts }
    };
  }

  /**
   * Apply audio to entire sequence
   */
  async applyAudioToSequence(
    sequence: unknown,
    projectContext?: Record<string, unknown>,
    audioTypes: IntegrationAudioType[] = ['all']
  ): Promise<{ sequence: unknown; timeline: TimelineSyncData }> {
    const audioResult = await this.generateAudioForSequence(sequence, projectContext, audioTypes);
    const type = audioTypes.includes('all') ? 'all' : audioTypes[0];
    const updatedShots = (sequence.shots || []).map((shot: unknown) => this.attachAudioToShot(shot, audioResult, type));
    const updatedSequence = { ...sequence, shots: updatedShots, audio_generated: audioResult.success, audio_generation_result: audioResult };
    const timeline = this.generateTimelineSyncData(updatedSequence, audioResult);
    return { sequence: updatedSequence, timeline };
  }
}

export const audioSequenceIntegrationService = new AudioSequenceIntegrationService();

export function getDefaultAudioForShotType(shotType: string): { musicIntensity: string; sfxIntensity: string; enableVoice: boolean } {
  const mapping: Record<string, { musicIntensity: string; sfxIntensity: string; enableVoice: boolean }> = {
    'action': { musicIntensity: 'high', sfxIntensity: 'high', enableVoice: false },
    'dialogue': { musicIntensity: 'low', sfxIntensity: 'low', enableVoice: true },
    'ambient': { musicIntensity: 'medium', sfxIntensity: 'medium', enableVoice: false },
    'transition': { musicIntensity: 'low', sfxIntensity: 'low', enableVoice: false },
    'narration': { musicIntensity: 'low', sfxIntensity: 'low', enableVoice: true }
  };
  return mapping[shotType] || { musicIntensity: 'medium', sfxIntensity: 'medium', enableVoice: false };
}

export function estimateAudioGenerationTime(shotCount: number, audioTypes: IntegrationAudioType[]): number {
  return 30 + (shotCount * 10 * audioTypes.length);
}




