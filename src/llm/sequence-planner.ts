/**
 * StoryCore Sequence Planner
 * Generates shot sequences with timing, duration, camera movements, and first image prompts
 */

import { AspectRatio } from './prompt-parser';

export interface SequenceShot {
  // Identification
  shotId: string;
  sequenceNumber: number;
  shotNumber: number;
  
  // Timing
  startTime: number;
  endTime: number;
  duration: number;
  
  // Scene Context
  sceneDescription: string;
  sceneIndex: number;
  
  // Camera
  shotType: ShotType;
  cameraAngle: CameraAngle;
  cameraMovement: CameraMovement;
  lens: LensType;
  
  // Visual
  firstImagePrompt: string;
  negativePrompt: string;
  styleNotes: string[];
  
  // Technical
  aspectRatio: AspectRatio;
  resolution: string;
  
  // Transitions
  transitionIn: TransitionType;
  transitionOut: TransitionType;
  
  // Audio
  musicDescription: string;
  soundEffects: string[];
  dialogue: DialogueLine[];
  
  // Metadata
  mood: string;
  intensity: 'low' | 'medium' | 'high';
}

export interface DialogueLine {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

export type ShotType = 'ELS' | 'LS' | 'FS' | 'MCU' | 'CU' | 'ECU';
export type CameraAngle = 'eye-level' | 'low-angle' | 'high-angle' | 'bird-eye' | 'worm-eye';
export type CameraMovement = 'static' | 'dolly-in' | 'dolly-out' | 'pan-left' | 'pan-right' | 'tilt-up' | 'tilt-down' | 'tracking' | 'steadicam';
export type LensType = 'wide' | 'normal' | 'telephoto' | 'fisheye';
export type TransitionType = 'cut' | 'fade' | 'dissolve' | 'wipe' | 'match-cut';

export interface SequencePlan {
  planId: string;
  projectTitle: string;
  createdAt: string;
  
  // Configuration
  aspectRatio: AspectRatio;
  totalDuration: number;
  totalShots: number;
  
  // Sequences
  sequences: SequenceShot[];
  
  // Summary
  shotTypeDistribution: Record<ShotType, number>;
  musicMood: string;
  overallMood: string;
}

export interface SequencePlannerConfig {
  aspectRatio?: AspectRatio;
  targetDuration?: number;
  shotsPerMinute?: number;
  includeAudio?: boolean;
  includeDialogue?: boolean;
}

const DEFAULT_CONFIG: SequencePlannerConfig = {
  aspectRatio: '16:9',
  targetDuration: 60,
  shotsPerMinute: 3,
  includeAudio: true,
  includeDialogue: true,
};

export class SequencePlanner {
  private config: SequencePlannerConfig;

  constructor(config: Partial<SequencePlannerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate complete sequence plan from parsed prompt
   */
  generateSequencePlan(params: {
    prompt: string;
    parsed: {
      genre: string;
      mood: string[];
      tone: string;
      characters: Array<{ name: string; role: string; description: string }>;
      keyElements: string[];
      setting: string;
      timePeriod: string;
      location: string;
      videoType: string;
      style: string[];
      visualReferences?: string[];
    };
  }): SequencePlan {
    const { prompt, parsed } = params;
    
    // Calculate number of shots
    const targetDuration = this.config.targetDuration || 60;
    const shotsPerMinute = this.config.shotsPerMinute || 3;
    const totalShots = Math.max(3, Math.ceil((targetDuration / 60) * shotsPerMinute));
    
    // Generate sequences
    const sequences = this.generateShots(prompt, parsed, totalShots, targetDuration);
    
    // Calculate shot type distribution
    const shotTypeDistribution = this.calculateShotDistribution(sequences);
    
    return {
      planId: 'seq_' + Date.now(),
      projectTitle: parsed.genre || 'Untitled Project',
      createdAt: new Date().toISOString(),
      aspectRatio: this.config.aspectRatio || '16:9',
      totalDuration: targetDuration,
      totalShots,
      sequences,
      shotTypeDistribution,
      musicMood: this.determineMusicMood(parsed.mood, parsed.tone),
      overallMood: parsed.mood[0] || parsed.tone || 'neutral',
    };
  }

  /**
   * Generate individual shots
   */
  private generateShots(
    prompt: string,
    parsed: {
      genre: string;
      mood: string[];
      tone: string;
      characters: Array<{ name: string; role: string; description: string }>;
      keyElements: string[];
      setting: string;
      timePeriod: string;
      location: string;
      videoType: string;
      style: string[];
      visualReferences?: string[];
    },
    totalShots: number,
    duration: number
  ): SequenceShot[] {
    const shots: SequenceShot[] = [];
    
    const avgShotDuration = duration / totalShots;
    let currentTime = 0;
    
    // Determine shot pattern based on video type
    const shotPattern = this.getShotPattern(parsed.videoType);
    
    for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
      const isFirst = shotIndex === 0;
      const isLast = shotIndex === totalShots - 1;
      const position = shotIndex / totalShots;
      
      // Determine shot type from pattern
      const shotType = this.getShotFromPattern(shotPattern, shotIndex, totalShots);
      
      // Calculate timing
      const shotDuration = this.calculateShotDuration(avgShotDuration, shotType, position, isFirst, isLast);
      const endTime = Math.min(currentTime + shotDuration, duration);
      
      // Determine camera settings
      const cameraAngle = this.getCameraAngle(parsed.mood, position);
      const cameraMovement = this.getCameraMovement(parsed.mood, shotType, position);
      const lens = this.getLens(shotType, cameraMovement);
      
      // Generate first image prompt
      const imagePrompt = this.generateImagePrompt(
        prompt,
        parsed,
        shotType,
        cameraAngle,
        cameraMovement,
        shotIndex,
        isFirst,
        isLast
      );
      
      // Generate negative prompt
      const negativePrompt = this.generateNegativePrompt(parsed.genre);
      
      // Generate style notes
      const styleNotes = this.generateStyleNotes(parsed.style, parsed.visualReferences);
      
      // Determine transition
      const transitionIn = isFirst ? 'fade' : 'cut';
      const transitionOut = isLast ? 'fade' : 'cut';
      
      // Determine intensity
      const intensity = this.determineIntensity(position, parsed.mood, parsed.tone);
      
      // Generate audio description
      const musicDescription = this.config.includeAudio 
        ? this.generateMusicDescription(parsed.mood, intensity, position)
        : '';
      
      // Generate dialogue if applicable
      const dialogue = this.config.includeDialogue && parsed.characters.length > 0
        ? this.generateDialogue(parsed.characters, currentTime, shotDuration, shotIndex)
        : [];
      
      shots.push({
        shotId: 'shot_' + (shotIndex + 1).toString().padStart(3, '0'),
        sequenceNumber: shotIndex + 1,
        shotNumber: shotIndex + 1,
        startTime: currentTime,
        endTime: endTime,
        duration: shotDuration,
        sceneDescription: this.generateSceneDescription(parsed, shotIndex, totalShots),
        sceneIndex: Math.floor((shotIndex / totalShots) * 3),
        shotType,
        cameraAngle,
        cameraMovement,
        lens,
        firstImagePrompt: imagePrompt,
        negativePrompt,
        styleNotes,
        aspectRatio: this.config.aspectRatio || '16:9',
        resolution: this.getResolution(),
        transitionIn,
        transitionOut,
        musicDescription,
        soundEffects: this.generateSoundEffects(parsed, shotType),
        dialogue,
        mood: parsed.mood[0] || 'neutral',
        intensity,
      });
      
      currentTime = endTime;
    }
    
    return shots;
  }

  /**
   * Get shot pattern based on video type
   */
  private getShotPattern(videoType: string): string[] {
    const patterns: Record<string, string[]> = {
      'trailer': ['ELS', 'LS', 'FS', 'MCU', 'CU', 'LS', 'MCU', 'FS', 'ELS'],
      'teaser': ['ELS', 'MCU', 'CU', 'MCU', 'LS'],
      'short_film': ['ELS', 'LS', 'MCU', 'CU', 'MCU', 'FS', 'LS'],
      'music_video': ['ELS', 'LS', 'MCU', 'CU', 'MCU', 'LS', 'ELS'],
      'documentary': ['LS', 'MCU', 'LS', 'CU', 'MCU'],
      'commercial': ['ELS', 'MCU', 'CU', 'MCU'],
      'unknown': ['ELS', 'LS', 'MCU', 'CU', 'LS'],
    };
    
    return patterns[videoType] || patterns['unknown'];
  }

  /**
   * Get shot type from pattern
   */
  private getShotFromPattern(pattern: string[], index: number, total: number): ShotType {
    if (pattern.length >= total) {
      return pattern[index] as ShotType;
    }
    
    const patternIndex = index % pattern.length;
    return pattern[patternIndex] as ShotType;
  }

  /**
   * Calculate shot duration
   */
  private calculateShotDuration(
    avgDuration: number,
    shotType: ShotType,
    position: number,
    isFirst: boolean,
    isLast: boolean
  ): number {
    if (isFirst) return avgDuration * 1.5;
    if (isLast) return avgDuration * 1.3;
    
    const typeModifiers: Record<ShotType, number> = {
      'ELS': 1.4,
      'LS': 1.2,
      'FS': 1.0,
      'MCU': 0.9,
      'CU': 0.7,
      'ECU': 0.5,
    };
    
    let positionModifier = 1.0;
    if (position > 0.6 && position < 0.85) {
      positionModifier = 0.85;
    } else if (position >= 0.85) {
      positionModifier = 1.1;
    }
    
    return Math.round(avgDuration * typeModifiers[shotType] * positionModifier * 10) / 10;
  }

  /**
   * Get camera angle based on mood and position
   */
  private getCameraAngle(mood: string[], position: number): CameraAngle {
    const isDark = mood.includes('dark') || mood.includes('tense');
    const isEpic = mood.includes('epic') || mood.includes('exciting');
    
    if (isEpic && position < 0.2) {
      return 'low-angle';
    }
    
    if (isDark && position > 0.7) {
      return 'high-angle';
    }
    
    if (Math.random() > 0.7) {
      return Math.random() > 0.5 ? 'low-angle' : 'high-angle';
    }
    
    return 'eye-level';
  }

  /**
   * Get camera movement based on mood, shot type, and position
   */
  private getCameraMovement(mood: string[], shotType: ShotType, position: number): CameraMovement {
    const isAction = mood.includes('exciting') || mood.includes('tense');
    
    if (shotType === 'CU' || shotType === 'ECU') {
      return 'static';
    }
    
    if (isAction) {
      const movements: CameraMovement[] = ['tracking', 'steadicam', 'dolly-in', 'dolly-out'];
      return movements[Math.floor(Math.random() * movements.length)];
    }
    
    if (shotType === 'ELS' || shotType === 'LS') {
      return Math.random() > 0.5 ? 'pan-right' : 'pan-left';
    }
    
    return 'static';
  }

  /**
   * Get lens type based on shot type and movement
   */
  private getLens(shotType: ShotType, movement: CameraMovement): LensType {
    if (movement === 'tracking' || movement === 'steadicam') {
      return 'wide';
    }
    
    if (shotType === 'ELS' || shotType === 'LS') {
      return 'wide';
    }
    
    if (shotType === 'CU' || shotType === 'ECU') {
      return 'telephoto';
    }
    
    return 'normal';
  }

  /**
   * Generate first image prompt for ComfyUI
   */
  private generateImagePrompt(
    prompt: string,
    parsed: {
      genre: string;
      mood: string[];
      tone: string;
      characters: Array<{ name: string; role: string; description: string }>;
      keyElements: string[];
      setting: string;
      timePeriod: string;
      location: string;
      style: string[];
    },
    shotType: ShotType,
    cameraAngle: CameraAngle,
    cameraMovement: CameraMovement,
    shotIndex: number,
    isFirst: boolean,
    isLast: boolean
  ): string {
    const components: string[] = [];
    
    const shotDescriptions: Record<ShotType, string> = {
      'ELS': 'extreme long shot establishing',
      'LS': 'long shot showing',
      'FS': 'full shot of',
      'MCU': 'medium close-up of',
      'CU': 'close-up on',
      'ECU': 'extreme close-up detail of',
    };
    components.push(shotDescriptions[shotType]);
    
    if (shotType === 'ELS' || shotType === 'LS') {
      if (parsed.setting !== 'unspecified') {
        components.push('a ' + parsed.setting);
      }
      if (parsed.location !== 'unspecified') {
        components.push(parsed.location);
      }
      if (parsed.timePeriod !== 'unspecified') {
        components.push('in the ' + parsed.timePeriod);
      }
    } else if (shotType === 'MCU' || shotType === 'CU' || shotType === 'ECU') {
      if (parsed.characters.length > 0 && parsed.characters[0]?.name) {
        const character = parsed.characters[0];
        components.push(character.name.toLowerCase());
        if (character.description) {
          components.push(character.description.toLowerCase());
        }
      } else {
        components.push('a character');
      }
    }
    
    if (parsed.keyElements.length > 0 && (shotType === 'ELS' || shotType === 'LS')) {
      const relevantElements = parsed.keyElements.slice(0, 2).join(', ');
      components.push('with ' + relevantElements);
    }
    
    if (parsed.mood.length > 0) {
      const moodStr = parsed.mood.join(', ');
      components.push(', ' + moodStr + ' atmosphere');
    }
    
    if (parsed.style.length > 0) {
      const styleStr = parsed.style.join(', ');
      components.push(', ' + styleStr + ' style');
    }
    
    const cameraTerms: string[] = [];
    cameraTerms.push(cameraAngle.replace('-', ' ') + ' view');
    if (cameraMovement !== 'static') {
      cameraTerms.push(cameraMovement.replace('-', ' ') + ' camera movement');
    }
    components.push(', ' + cameraTerms.join(', '));
    
    components.push(', cinematic, 8k, highly detailed, professional cinematography');
    
    if (parsed.genre === 'cyberpunk' || parsed.genre === 'sci-fi') {
      components.push(', neon lights, futuristic technology, dystopian cityscape');
    } else if (parsed.genre === 'fantasy') {
      components.push(', magical elements, epic scale, fantasy world');
    } else if (parsed.genre === 'horror') {
      components.push(', ominous lighting, shadows, tension, dread');
    }
    
    return components.filter(c => c.trim()).join(' ');
  }

  /**
   * Generate negative prompt
   */
  private generateNegativePrompt(genre: string): string {
    const base = 'low quality, blurry, distorted, ugly, bad anatomy, extra limbs, watermark, text, signature';
    
    const genreSpecific: Record<string, string> = {
      'cyberpunk': ', daylight, bright colors, cheerful',
      'fantasy': ', modern technology, sci-fi elements, realistic',
      'horror': ', bright lighting, cheerful, happy',
      'romance': ', violence, action, horror',
    };
    
    return base + (genreSpecific[genre] || '');
  }

  /**
   * Generate style notes
   */
  private generateStyleNotes(style: string[], visualReferences?: string[]): string[] {
    const notes: string[] = [];
    
    if (style.includes('cinematic')) {
      notes.push('Use cinematic color grading');
    }
    if (style.includes('vhs')) {
      notes.push('Apply VHS/retro filter');
    }
    if (style.includes('anime')) {
      notes.push('Maintain anime art style consistency');
    }
    
    if (visualReferences) {
      visualReferences.forEach(ref => {
        notes.push('Reference style from: ' + ref);
      });
    }
    
    return notes;
  }

  /**
   * Generate scene description
   */
  private generateSceneDescription(
    parsed: {
      genre: string;
      setting: string;
      timePeriod: string;
      location: string;
    },
    shotIndex: number,
    totalShots: number
  ): string {
    const position = shotIndex / totalShots;
    
    if (position < 0.2) {
      return 'Opening establishing shot - ' + (parsed.setting !== 'unspecified' ? parsed.setting : 'unknown setting') + 
        ', ' + (parsed.timePeriod !== 'unspecified' ? parsed.timePeriod : 'unknown time period') + 
        '. Sets the tone for the ' + parsed.genre + ' project.';
    }
    
    if (position < 0.8) {
      return 'Development sequence - ' + (parsed.location !== 'unspecified' ? parsed.location : 'scene location') + 
        '. Building tension and narrative progression.';
    }
    
    return 'Climactic sequence - Peak moment of the ' + parsed.genre + ' story. Maximum impact and emotional payoff.';
  }

  /**
   * Determine intensity level
   */
  private determineIntensity(
    position: number,
    mood: string[],
    tone: string
  ): 'low' | 'medium' | 'high' {
    if (position > 0.7) return 'high';
    if (position > 0.4) return 'medium';
    
    if (mood.includes('tense') || mood.includes('exciting') || tone === 'intense') {
      return 'high';
    }
    if (mood.includes('peaceful') || tone === 'calm') {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Generate music description
   */
  private generateMusicDescription(mood: string[], intensity: 'low' | 'medium' | 'high', position: number): string {
    const descriptions: string[] = [];
    
    if (mood.includes('dark') || mood.includes('tense')) {
      descriptions.push('dark ambient drones');
    }
    if (mood.includes('epic')) {
      descriptions.push('orchestral strings, heroic brass');
    }
    if (mood.includes('melancholic')) {
      descriptions.push('piano, melancholic melody');
    }
    if (mood.includes('exciting')) {
      descriptions.push('electronic beats, high energy');
    }
    
    if (intensity === 'high') {
      descriptions.push('building crescendo');
    }
    if (intensity === 'low') {
      descriptions.push('soft, minimal arrangement');
    }
    
    if (position > 0.8) {
      descriptions.push('climactic peak');
    }
    if (position < 0.1) {
      descriptions.push('intro theme');
    }
    
    return descriptions.join(' with ');
  }

  /**
   * Generate sound effects
   */
  private generateSoundEffects(
    parsed: {
      genre: string;
      keyElements: string[];
    },
    shotType: ShotType
  ): string[] {
    const effects: string[] = [];
    
    if (parsed.genre === 'cyberpunk' || parsed.genre === 'sci-fi') {
      effects.push('city ambience', 'distant machinery', 'neon hum');
    }
    if (parsed.genre === 'fantasy') {
      effects.push('wind through trees', 'distant bells', 'magical shimmer');
    }
    if (parsed.genre === 'horror') {
      effects.push('creepy atmosphere', 'distant footsteps', 'unsettling silence');
    }
    
    parsed.keyElements.forEach(element => {
      const elemLower = element.toLowerCase();
      if (elemLower.includes('drone')) {
        effects.push('drone whir');
      }
      if (elemLower.includes('pursuit')) {
        effects.push('footsteps running', 'car engine');
      }
    });
    
    if (shotType === 'ELS') {
      effects.push('ambient environment sound');
    }
    
    return effects.slice(0, 3);
  }

  /**
   * Generate dialogue
   */
  private generateDialogue(
    characters: Array<{ name: string; role: string; description: string }>,
    startTime: number,
    duration: number,
    shotIndex: number
  ): DialogueLine[] {
    // Ensure characters array is not empty and first character has a valid name
    if (!characters || characters.length === 0 || !characters[0]?.name) {
      return [];
    }
    
    const character = characters[0];
    const dialogues = [
      'Voice-over narration by ' + character.name,
      character.name + ' speaks intently',
      character.name + ' delivers key line',
    ];
    
    return [{
      speaker: character.name,
      text: dialogues[Math.floor(Math.random() * dialogues.length)],
      startTime: startTime,
      endTime: startTime + duration,
    }];
  }

  /**
   * Get resolution based on aspect ratio
   */
  private getResolution(): string {
    const resolutions: Record<AspectRatio, string> = {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '1:1': '1080x1080',
      '4:3': '1440x1080',
      '21:9': '2560x1080',
      'auto': '1920x1080',
    };
    
    return resolutions[this.config.aspectRatio || '16:9'];
  }

  /**
   * Calculate shot type distribution
   */
  private calculateShotDistribution(shots: SequenceShot[]): Record<ShotType, number> {
    const distribution: Record<ShotType, number> = {
      'ELS': 0,
      'LS': 0,
      'FS': 0,
      'MCU': 0,
      'CU': 0,
      'ECU': 0,
    };
    
    shots.forEach(shot => {
      distribution[shot.shotType]++;
    });
    
    return distribution;
  }

  /**
   * Determine music mood
   */
  private determineMusicMood(mood: string[], tone: string): string {
    if (mood.includes('dark') || tone === 'intense') {
      return 'tense and ominous';
    }
    if (mood.includes('epic')) {
      return 'heroic and grand';
    }
    if (mood.includes('peaceful')) {
      return 'calm and ambient';
    }
    if (mood.includes('exciting')) {
      return 'energetic and dynamic';
    }
    return 'neutral atmospheric';
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SequencePlannerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SequencePlannerConfig {
    return { ...this.config };
  }
}

export const sequencePlanner = new SequencePlanner();

