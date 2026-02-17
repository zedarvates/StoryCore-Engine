/**
 * Music and Lyrics Generation Types
 * 
 * Types for the music generation, lyrics generation, and dialogue-shot integration features.
 */

// ============================================================================
// Music Generation Types
// ============================================================================

export type MusicStyle = 
  | 'cinematic'
  | 'ambient'
  | 'action'
  | 'romantic'
  | 'horror'
  | 'comedy'
  | 'dramatic'
  | 'epic'
  | 'tender'
  | 'mysterious'
  | 'tension'
  | 'triumphant'
  | 'sad'
  | 'joyful';

export type MusicGenre = 
  | 'orchestral'
  | 'electronic'
  | 'rock'
  | 'pop'
  | 'jazz'
  | 'classical'
  | 'ambient'
  | 'hybrid';

export interface MusicGenerationRequest {
  prompt: string;
  style: MusicStyle;
  genre: MusicGenre;
  duration: number; // seconds
  mood: string[];
  instrumentation?: string[];
  bpm?: number;
  key?: string;
  projectId?: string;
  sequenceId?: string;
  shotIds?: string[];
}

export interface MusicCue {
  id: string;
  name: string;
  description: string;
  startTime: number;
  duration: number;
  style: MusicStyle;
  genre: MusicGenre;
  mood: string[];
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  audioUrl?: string;
  createdAt: string;
  projectId?: string;
  sequenceId?: string;
  shotId?: string;
}

export interface MusicGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  includeVariation?: boolean;
}

// ============================================================================
// Lyrics Generation Types
// ============================================================================

export type LyricsStyle = 
  | 'rap'
  | 'pop'
  | 'rock'
  | 'ballad'
  | 'folk'
  | 'rnb'
  | 'country'
  | 'electronic';

export type LyricsLength = 
  | 'short'   // ~30-60 seconds
  | 'medium'  // ~60-120 seconds
  | 'long';   // ~120-180 seconds

export interface LyricsGenerationRequest {
  theme: string;
  style: LyricsStyle;
  mood: string[];
  length: LyricsLength;
  characters?: string[];    // Characters involved in the song
  shotIds?: string[];       // Shots this lyrics is for
  narrativeContext?: string; // Story context
  projectId?: string;
}

export interface LyricsLine {
  id: string;
  text: string;
  startTime?: number;
  endTime?: number;
  characterId?: string;
  vocalType?: 'lead' | 'background' | 'duet';
}

export interface LyricsSection {
  id: string;
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro';
  lines: LyricsLine[];
}

export interface LyricsCue {
  id: string;
  name: string;
  description: string;
  style: LyricsStyle;
  theme: string;
  mood: string[];
  sections: LyricsSection[];
  totalDuration: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  audioUrl?: string;
  createdAt: string;
  projectId?: string;
  sequenceId?: string;
  shotId?: string;
}

export interface LyricsGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  includeMelody?: boolean;
  includeChords?: boolean;
}

// ============================================================================
// Dialogue-Shot Integration Types
// ============================================================================

export interface ShotDialogueIntegration {
  shotId: string;
  characterId?: string;
  dialogue?: string;
  audioPhraseId?: string;
  voiceType?: 'male' | 'female' | 'child' | 'narrator';
  startTime?: number;
  duration?: number;
}

export interface DialogueShotMapping {
  id: string;
  projectId: string;
  sequenceId: string;
  shotId: string;
  characterId?: string;
  dialogueText: string;
  audioPhraseId: string;
  voiceConfig: {
    type: 'male' | 'female' | 'child' | 'narrator' | 'custom';
    customVoiceId?: string;
  };
  timing: {
    startTime: number;
    duration: number;
    fadeIn?: number;
    fadeOut?: number;
  };
  status: 'pending' | 'recording' | 'completed' | 'failed';
}

// ============================================================================
// Combined Audio Request (Music + Lyrics + Dialogue)
// ============================================================================

export interface AudioProductionRequest {
  projectId: string;
  sequenceId?: string;
  shots?: string[];
  music?: MusicGenerationRequest;
  lyrics?: LyricsGenerationRequest;
  dialogues?: DialogueShotMapping[];
}

export interface AudioProductionResult {
  music?: MusicCue[];
  lyrics?: LyricsCue[];
  dialogues?: DialogueShotMapping[];
  summary: string;
}

