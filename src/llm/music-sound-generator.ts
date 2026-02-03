/**
 * StoryCore Music & Sound Generator
 * Generates audio descriptions and suggestions for video projects
 */

export interface MusicDescription {
  // Basic Info
  trackId: string;
  trackName: string;
  
  // Musical Characteristics
  mood: string;
  genre: string;
  tempo: TempoInfo;
  instruments: Instrument[];
  key: string;
  timeSignature: string;
  
  // Structure
  structure: TrackStructure;
  
  // Intensity
  intensityCurve: IntensityPoint[];
  buildSections: BuildSection[];
  
  // Sound Design
  soundDesignElements: SoundElement[];
  atmosphere: string;
  
  // Timing
  totalDuration: number;
  introDuration: number;
  outroDuration: number;
  
  // Usage Notes
  usageNotes: string[];
  legalNotes?: string;
}

export interface TempoInfo {
  bpm: number;
  label: 'slow' | 'medium' | 'fast' | 'variable';
  feel: 'even' | 'swing' | 'halftime';
}

export interface Instrument {
  name: string;
  category: 'strings' | 'brass' | 'woodwinds' | 'percussion' | 'electronic' | 'vocals' | 'other';
  role: 'lead' | 'rhythm' | 'pad' | 'bass' | 'effects';
  description?: string;
}

export interface TrackStructure {
  sections: TrackSection[];
  totalBars: number;
  suggestedEditPoints: number[];
}

export interface TrackSection {
  name: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'build' | 'climax' | 'outro';
  bars: number;
  startTime: number;
  intensity: number;
  instruments: string[];
  notes?: string;
}

export interface IntensityPoint {
  time: number;
  value: number; // 0-100
  label?: string;
}

export interface BuildSection {
  name: string;
  startTime: number;
  endTime: number;
  buildType: 'gradual' | 'sudden' | 'cyclic';
  targetIntensity: number;
  techniques: string[];
}

export interface SoundElement {
  name: string;
  category: 'foley' | 'ambience' | 'sfx' | 'nature' | 'urban' | 'industrial' | 'sci-fi' | 'fantasy';
  timing: 'continuous' | 'triggered' | 'periodic';
  description: string;
  layerWithMusic: boolean;
}

export interface SoundMixingGuide {
  musicVolumeCurve: string[];
  dialogueDuckLevel: number;
  sfxPriority: string[];
  reverbSend: number;
  compressionSettings: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
}

export interface MusicGeneratorConfig {
  targetDuration?: number;
  aspectRatio?: string;
  includeSoundDesign?: boolean;
  includeMixingGuide?: boolean;
}

const DEFAULT_CONFIG: MusicGeneratorConfig = {
  targetDuration: 60,
  aspectRatio: '16:9',
  includeSoundDesign: true,
  includeMixingGuide: true,
};

export class MusicSoundGenerator {
  private config: MusicGeneratorConfig;

  constructor(config: Partial<MusicGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate complete music and sound description for a project
   */
  generateAudioDescription(params: {
    projectTitle: string;
    genre: string;
    mood: string[];
    tone: string;
    videoType: string;
    keyElements: string[];
    characters?: Array<{ name: string; role: string }>;
    setting?: string;
    timePeriod?: string;
  }): MusicDescription {
    const { projectTitle, genre, mood, tone, videoType, keyElements, setting, timePeriod } = params;
    
    // Determine tempo based on mood and video type
    const tempo = this.determineTempo(mood, tone, videoType);
    
    // Determine instruments based on genre and mood
    const instruments = this.determineInstruments(genre, mood);
    
    // Determine key
    const key = this.determineKey(genre, mood);
    
    // Generate track structure
    const structure = this.generateStructure(videoType, this.config.targetDuration || 60);
    
    // Generate intensity curve
    const intensityCurve = this.generateIntensityCurve(mood, tone, this.config.targetDuration || 60);
    
    // Generate build sections
    const buildSections = this.generateBuildSections(mood, intensityCurve);
    
    // Generate sound design elements
    const soundDesignElements = this.config.includeSoundDesign
      ? this.generateSoundDesignElements(setting, timePeriod, keyElements, genre)
      : [];
    
    // Generate usage notes
    const usageNotes = this.generateUsageNotes(genre, mood, videoType);
    
    return {
      trackId: 'audio_' + Date.now(),
      trackName: this.generateTrackName(projectTitle, mood, genre),
      mood: mood[0] || 'neutral',
      genre: this.determineMusicGenre(genre, mood),
      tempo,
      instruments,
      key,
      timeSignature: '4/4',
      structure,
      intensityCurve,
      buildSections,
      soundDesignElements,
      atmosphere: this.generateAtmosphere(mood, setting, genre),
      totalDuration: this.config.targetDuration || 60,
      introDuration: this.calculateIntroDuration(videoType),
      outroDuration: this.calculateOutroDuration(videoType),
      usageNotes,
    };
  }

  /**
   * Determine tempo based on mood, tone, and video type
   */
  private determineTempo(mood: string[], tone: string, videoType: string): TempoInfo {
    // Base tempo on mood
    let bpm = 90;
    let label: 'slow' | 'medium' | 'fast' | 'variable' = 'medium';
    let feel: 'even' | 'swing' | 'halftime' = 'even';
    
    if (mood.includes('tense') || mood.includes('dark') || tone === 'intense') {
      bpm = Math.floor(Math.random() * 20) + 80; // 80-100
      label = 'medium';
      feel = 'even';
    }
    
    if (mood.includes('exciting') || mood.includes('epic')) {
      bpm = Math.floor(Math.random() * 30) + 120; // 120-150
      label = 'fast';
    }
    
    if (mood.includes('peaceful') || mood.includes('melancholic')) {
      bpm = Math.floor(Math.random() * 20) + 60; // 60-80
      label = 'slow';
    }
    
    // Video type adjustments
    if (videoType === 'trailer') {
      bpm = Math.floor(Math.random() * 20) + 130; // 130-150 for epic trailers
      label = 'fast';
    }
    
    if (videoType === 'teaser') {
      bpm = Math.floor(Math.random() * 20) + 100;
      label = 'medium';
    }
    
    return { bpm, label, feel };
  }

  /**
   * Determine instruments based on genre and mood
   */
  private determineInstruments(genre: string, mood: string[]): Instrument[] {
    const instruments: Instrument[] = [];
    
    // Base instrument selections by genre
    if (genre === 'cyberpunk' || genre === 'sci-fi') {
      instruments.push(
        { name: 'Synth Bass', category: 'electronic', role: 'bass', description: 'Pulsating bass' },
        { name: 'Analog Synth', category: 'electronic', role: 'pad', description: 'Warm analog pads' },
        { name: 'Digital Arp', category: 'electronic', role: 'rhythm', description: 'Fast arpeggiated patterns' },
        { name: 'Drum Machine', category: 'percussion', role: 'rhythm', description: 'Electronic drums' },
        { name: 'Glitch Effects', category: 'electronic', role: 'effects', description: 'Digital glitch textures' }
      );
    } else if (genre === 'fantasy') {
      instruments.push(
        { name: 'Orchestral Strings', category: 'strings', role: 'lead', description: 'Epic string sections' },
        { name: 'Brass Section', category: 'brass', role: 'lead', description: 'Heroic brass' },
        { name: 'Choir', category: 'vocals', role: 'pad', description: ' ethereal choral pads' },
        { name: 'Harp', category: 'strings', role: 'effects', description: 'Magical arpeggios' },
        { name: 'Timpani', category: 'percussion', role: 'effects', description: 'Dramatic impacts' }
      );
    } else if (genre === 'horror') {
      instruments.push(
        { name: 'Deep Drone', category: 'electronic', role: 'pad', description: 'Low frequency drone' },
        { name: 'String Sustains', category: 'strings', role: 'pad', description: 'Tense string textures' },
        { name: 'Distorted Bass', category: 'electronic', role: 'bass', description: 'Heavy distorted bass' },
        { name: 'Eerie Pads', category: 'electronic', role: 'pad', description: 'Unsettling ambient pads' },
        { name: 'Prepared Piano', category: 'other', role: 'effects', description: 'Dissonant piano textures' }
      );
    } else {
      // Default cinematic
      instruments.push(
        { name: 'Piano', category: 'other', role: 'lead', description: 'Solo piano melody' },
        { name: 'Strings', category: 'strings', role: 'pad', description: 'String pad textures' },
        { name: 'Soft Brass', category: 'brass', role: 'pad', description: 'Muted brass pads' },
        { name: 'Light Percussion', category: 'percussion', role: 'rhythm', description: 'Subtle rhythmic texture' }
      );
    }
    
    // Mood modifications
    if (mood.includes('epic')) {
      instruments.push(
        { name: 'Full Orchestra', category: 'strings', role: 'lead', description: 'Full orchestral swell' }
      );
    }
    
    if (mood.includes('tense')) {
      instruments.push(
        { name: 'High Strings', category: 'strings', role: 'pad', description: 'Tense high string textures' }
      );
    }
    
    return instruments;
  }

  /**
   * Determine musical key
   */
  private determineKey(genre: string, mood: string[]): string {
    const keys = ['C minor', 'D minor', 'E minor', 'F minor', 'G minor', 'A minor', 'B minor'];
    const majorKeys = ['C major', 'D major', 'E major', 'F major', 'G major', 'A major', 'B major'];
    
    if (mood.includes('dark') || mood.includes('tense') || mood.includes('melancholic')) {
      return keys[Math.floor(Math.random() * keys.length)];
    }
    
    if (mood.includes('happy') || mood.includes('peaceful')) {
      return majorKeys[Math.floor(Math.random() * majorKeys.length)];
    }
    
    // Default to minor for most cinematic applications
    return keys[Math.floor(Math.random() * keys.length)];
  }

  /**
   * Generate track structure
   */
  private generateStructure(videoType: string, duration: number): TrackStructure {
    const totalBars = Math.floor((duration / 60) * 120); // Assume 120 BPM average
    const sections: TrackSection[] = [];
    let currentBar = 0;
    
    // Standard structure based on video type
    const structures: Record<string, Array<{type: TrackSection['type'], ratio: number, intensity: number}>> = {
      'trailer': [
        { type: 'intro', ratio: 0.1, intensity: 30 },
        { type: 'verse', ratio: 0.2, intensity: 50 },
        { type: 'build', ratio: 0.15, intensity: 70 },
        { type: 'climax', ratio: 0.3, intensity: 100 },
        { type: 'outro', ratio: 0.1, intensity: 40 },
      ],
      'teaser': [
        { type: 'intro', ratio: 0.2, intensity: 40 },
        { type: 'verse', ratio: 0.3, intensity: 60 },
        { type: 'build', ratio: 0.2, intensity: 80 },
        { type: 'outro', ratio: 0.15, intensity: 50 },
      ],
      'short_film': [
        { type: 'intro', ratio: 0.15, intensity: 30 },
        { type: 'verse', ratio: 0.25, intensity: 50 },
        { type: 'chorus', ratio: 0.2, intensity: 70 },
        { type: 'bridge', ratio: 0.15, intensity: 60 },
        { type: 'verse', ratio: 0.2, intensity: 55 },
        { type: 'outro', ratio: 0.1, intensity: 30 },
      ],
    };
    
    const structureDef = structures[videoType] || structures['short_film'];
    
    for (const section of structureDef) {
      const bars = Math.max(4, Math.floor(totalBars * section.ratio));
      const sectionDuration = (bars / 120) * 60; // Convert to seconds
      
      sections.push({
        name: section.type.charAt(0).toUpperCase() + section.type.slice(1),
        type: section.type,
        bars,
        startTime: currentBar * (60 / 120), // Convert bars to seconds
        intensity: section.intensity,
        instruments: this.getSectionInstruments(section.type),
      });
      
      currentBar += bars;
    }
    
    return {
      sections,
      totalBars,
      suggestedEditPoints: this.generateEditPoints(sections, duration),
    };
  }

  /**
   * Get instruments for a section
   */
  private getSectionInstruments(sectionType: TrackSection['type']): string[] {
    const instrumentSets: Record<string, string[]> = {
      'intro': ['Piano', 'Soft Pad', 'Subtle Percussion'],
      'verse': ['Lead Instrument', 'Rhythm Section', 'Pad'],
      'chorus': ['Full Orchestra', 'Percussion', 'Brass'],
      'build': ['Increasing Layers', 'Rising Elements', 'Percussion'],
      'climax': ['Full Ensemble', 'Impact Sounds', 'Choir'],
      'outro': ['Fading Pad', 'Single Instrument', 'Silence'],
    };
    
    return instrumentSets[sectionType] || instrumentSets['verse'];
  }

  /**
   * Generate suggested edit points
   */
  private generateEditPoints(sections: TrackSection[], duration: number): number[] {
    const points: number[] = [];
    
    // Add edit points at section boundaries
    sections.forEach((section, index) => {
      if (index < sections.length - 1) {
        points.push(sections[index + 1].startTime);
      }
    });
    
    // Add additional points at dramatic moments
    const midPoint = duration / 2;
    if (!points.includes(midPoint)) {
      points.push(midPoint);
    }
    
    return points.sort((a, b) => a - b);
  }

  /**
   * Generate intensity curve
   */
  private generateIntensityCurve(mood: string[], tone: string, duration: number): IntensityPoint[] {
    const points: IntensityPoint[] = [];
    
    // Start with low intensity
    points.push({ time: 0, value: 20, label: 'Opening' });
    
    // Build based on mood
    const hasTense = mood.includes('tense') || mood.includes('dark');
    const hasEpic = mood.includes('epic') || mood.includes('exciting');
    const hasCalm = mood.includes('peaceful') || mood.includes('melancholic');
    
    if (hasEpic) {
      // Classic trailer arc
      points.push({ time: duration * 0.1, value: 35, label: 'Introduction' });
      points.push({ time: duration * 0.3, value: 50, label: 'Development' });
      points.push({ time: duration * 0.5, value: 70, label: 'Rising Action' });
      points.push({ time: duration * 0.75, value: 90, label: 'Climax Build' });
      points.push({ time: duration * 0.9, value: 100, label: 'Peak' });
    } else if (hasTense) {
      // Tense arc - oscillate
      points.push({ time: duration * 0.2, value: 40, label: 'Tension Building' });
      points.push({ time: duration * 0.4, value: 60, label: 'High Tension' });
      points.push({ time: duration * 0.6, value: 45, label: 'Brief Release' });
      points.push({ time: duration * 0.8, value: 75, label: 'Final Tension' });
    } else if (hasCalm) {
      // Calm arc - gentle variations
      points.push({ time: duration * 0.25, value: 30, label: 'Settling' });
      points.push({ time: duration * 0.5, value: 40, label: 'Development' });
      points.push({ time: duration * 0.75, value: 35, label: 'Gentle Close' });
    } else {
      // Standard arc
      points.push({ time: duration * 0.2, value: 40, label: 'Establishing' });
      points.push({ time: duration * 0.4, value: 55, label: 'Development' });
      points.push({ time: duration * 0.6, value: 65, label: 'Building' });
      points.push({ time: duration * 0.8, value: 60, label: 'Resolution' });
    }
    
    // Ensure we have a point at the end
    points.push({ time: duration, value: points[points.length - 1].value * 0.5, label: 'End' });
    
    return points;
  }

  /**
   * Generate build sections
   */
  private generateBuildSections(mood: string[], intensityCurve: IntensityPoint[]): BuildSection[] {
    const builds: BuildSection[] = [];
    
    // Find intensity increases in the curve
    for (let i = 1; i < intensityCurve.length; i++) {
      const current = intensityCurve[i - 1];
      const next = intensityCurve[i];
      
      if (next.value > current.value + 20) {
        builds.push({
          name: 'Intensity Build',
          startTime: current.time,
          endTime: next.time,
          buildType: next.value - current.value > 40 ? 'sudden' : 'gradual',
          targetIntensity: next.value,
          techniques: this.getBuildTechniques(mood),
        });
      }
    }
    
    return builds;
  }

  /**
   * Get build techniques based on mood
   */
  private getBuildTechniques(mood: string[]): string[] {
    const techniques: string[] = [];
    
    if (mood.includes('epic') || mood.includes('exciting')) {
      techniques.push('Layer addition', 'Tempo increase', 'Volume swell', 'Dramatic hit');
    }
    
    if (mood.includes('tense')) {
      techniques.push('Repetition', 'Pitch rise', 'Texture accumulation', 'Rhythmic pressure');
    }
    
    if (mood.includes('dark')) {
      techniques.push('Bass drop', 'Drone swell', 'Harmonic tension', 'Subtle crescendo');
    }
    
    if (techniques.length === 0) {
      techniques.push('Gradual layer addition', 'Dynamic build', 'Orchestral swell');
    }
    
    return techniques;
  }

  /**
   * Generate sound design elements
   */
  private generateSoundDesignElements(
    setting?: string,
    timePeriod?: string,
    keyElements?: string[],
    genre?: string
  ): SoundElement[] {
    const elements: SoundElement[] = [];
    
    // Setting-based elements
    if (setting === 'city' || setting?.includes('urban')) {
      elements.push(
        { name: 'City Ambience', category: 'urban', timing: 'continuous', description: 'Distant city noise, traffic', layerWithMusic: true },
        { name: 'Neon Hum', category: 'urban', timing: 'continuous', description: 'Electrical buzz from neon signs', layerWithMusic: true }
      );
    }
    
    if (setting === 'forest' || setting?.includes('nature')) {
      elements.push(
        { name: 'Wind Through Trees', category: 'nature', timing: 'continuous', description: 'Gentle wind in foliage', layerWithMusic: true },
        { name: 'Bird Calls', category: 'nature', timing: 'periodic', description: 'Occasional birds', layerWithMusic: false }
      );
    }
    
    // Time period elements
    if (timePeriod === 'future' || timePeriod === 'cyberpunk') {
      elements.push(
        { name: 'Drone Whir', category: 'sci-fi', timing: 'continuous', description: 'Futuristic machinery hum', layerWithMusic: true },
        { name: 'Digital Bleeps', category: 'sci-fi', timing: 'periodic', description: 'Computer interface sounds', layerWithMusic: false }
      );
    }
    
    // Key element elements
    if (keyElements) {
      keyElements.forEach(element => {
        const elemLower = element.toLowerCase();
        if (elemLower.includes('drone')) {
          elements.push(
            { name: 'Drone Sound', category: 'sci-fi', timing: 'continuous', description: 'Mechanical drone', layerWithMusic: true }
          );
        }
        if (elemLower.includes('explosion') || elemLower.includes('climax')) {
          elements.push(
            { name: 'Impact Hit', category: 'sfx', timing: 'triggered', description: 'Explosive impact', layerWithMusic: false }
          );
        }
      });
    }
    
    // Genre defaults
    if (genre === 'cyberpunk' || genre === 'sci-fi') {
      elements.push(
        { name: 'Footsteps', category: 'foley', timing: 'triggered', description: 'Character footsteps', layerWithMusic: false },
        { name: 'Weapon Charge', category: 'sci-fi', timing: 'triggered', description: 'Energy weapon charging', layerWithMusic: false }
      );
    }
    
    return elements;
  }

  /**
   * Generate atmosphere description
   */
  private generateAtmosphere(mood: string[], setting?: string, genre?: string): string {
    const parts: string[] = [];
    
    if (mood.includes('dark') || mood.includes('tense')) {
      parts.push('Ominous');
    }
    
    if (mood.includes('epic')) {
      parts.push('Grand');
    }
    
    if (mood.includes('peaceful')) {
      parts.push('Ethereal');
    }
    
    if (setting === 'city' || genre === 'cyberpunk') {
      parts.push('Urban');
    }
    
    if (setting === 'forest' || genre === 'fantasy') {
      parts.push('Organic');
    }
    
    parts.push('Atmosphere');
    
    return parts.join(' ');
  }

  /**
   * Generate track name
   */
  private generateTrackName(projectTitle: string, mood: string[], genre: string): string {
    const moodPrefix = mood[0] ? mood[0].charAt(0).toUpperCase() + mood[0].slice(1) : '';
    const suffix = genre === 'cyberpunk' ? 'Synthwave' : 
                   genre === 'fantasy' ? 'Epic' :
                   genre === 'horror' ? 'Tension' : 'Score';
    
    return moodPrefix + ' ' + suffix;
  }

  /**
   * Determine music genre/style
   */
  private determineMusicGenre(genre: string, mood: string[]): string {
    if (genre === 'cyberpunk' || genre === 'sci-fi') {
      return 'Electronic / Synthwave';
    }
    if (genre === 'fantasy') {
      return 'Cinematic Orchestral';
    }
    if (genre === 'horror') {
      return 'Ambient / Dark Ambient';
    }
    if (mood.includes('epic')) {
      return 'Epic Orchestral';
    }
    return 'Cinematic Score';
  }

  /**
   * Generate usage notes
   */
  private generateUsageNotes(genre: string, mood: string[], videoType: string): string[] {
    const notes: string[] = [];
    
    notes.push('Use intro for establishing shots');
    notes.push('Build sections ideal for action sequences');
    notes.push('Climax section perfect for dramatic peaks');
    
    if (videoType === 'trailer') {
      notes.push('Edit cue points at intensity peaks for maximum impact');
      notes.push('Consider using only the climax section for teaser cutdowns');
    }
    
    if (genre === 'cyberpunk') {
      notes.push('Layer with neon lighting effects');
      notes.push('Consider visual sync with tempo');
    }
    
    if (mood.includes('tense')) {
      notes.push('Use minimal music during dialogue-heavy sections');
      notes.push('Let silence work as a storytelling tool');
    }
    
    return notes;
  }

  /**
   * Calculate intro duration
   */
  private calculateIntroDuration(videoType: string): number {
    const durations: Record<string, number> = {
      'trailer': 8,
      'teaser': 5,
      'short_film': 10,
      'commercial': 3,
      'music_video': 4,
    };
    
    return durations[videoType] || 6;
  }

  /**
   * Calculate outro duration
   */
  private calculateOutroDuration(videoType: string): number {
    const durations: Record<string, number> = {
      'trailer': 5,
      'teaser': 3,
      'short_film': 8,
      'commercial': 2,
      'music_video': 8,
    };
    
    return durations[videoType] || 5;
  }

  /**
   * Get mixing guide
   */
  getMixingGuide(): SoundMixingGuide {
    return {
      musicVolumeCurve: ['Fade in', 'Sustain', 'Build', 'Peak', 'Fade out'],
      dialogueDuckLevel: -6,
      sfxPriority: ['Impact sounds', 'Dialogue', 'Music', 'Ambience'],
      reverbSend: 0.3,
      compressionSettings: {
        threshold: -20,
        ratio: 4,
        attack: 10,
        release: 100,
      },
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<MusicGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export const musicSoundGenerator = new MusicSoundGenerator();

