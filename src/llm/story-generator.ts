/**
 * Story Generator for StoryCore LLM Assistant
 * Generates narrative structures, scene breakdowns, emotional arcs, and key beats
 */

import { LLMProviderManager } from './provider-manager';

// Story structure templates
export const STORY_STRUCTURES = {
  three_act: {
    name: 'Three-Act Structure',
    description: 'Classic narrative structure with setup, confrontation, and resolution',
    acts: [
      { name: 'Act 1', percentage: 25, description: 'Setup - Introduce world, characters, and inciting incident' },
      { name: 'Act 2', percentage: 50, description: 'Confrontation - Rising action, midpoint, and falling action' },
      { name: 'Act 3', percentage: 25, description: 'Resolution - Climax and denouement' }
    ],
    keyBeats: ['Opening image', 'Inciting incident', 'Break into act 2', 'Midpoint', 'All is lost', 'Break into act 3', 'Finale', 'Final image']
  },
  trailer: {
    name: 'Trailer Structure',
    description: 'Fast-paced structure ideal for trailers and teasers',
    acts: [
      { name: 'Hook', percentage: 10, description: 'Grab attention with striking visual or line' },
      { name: 'Setup', percentage: 20, description: 'Establish tone, genre, and stakes' },
      { name: 'Conflict', percentage: 30, description: 'Introduce main conflict and antagonists' },
      { name: 'Escalation', percentage: 25, description: 'Increase tension and show action' },
      { name: 'Climax', percentage: 15, description: 'Peak moment with dramatic hook' }
    ],
    keyBeats: ['Opening hook', 'World introduction', 'Character setup', 'Conflict reveal', 'Stakes escalation', 'Action montage', 'Final punch']
  },
  hero_journey: {
    name: 'Hero\'s Journey',
    description: 'Monomyth structure following the hero\'s transformation',
    acts: [
      { name: 'Ordinary World', percentage: 10, description: 'Show hero in their normal life' },
      { name: 'Call to Adventure', percentage: 5, description: 'Hero receives their challenge' },
      { name: 'Refusal', percentage: 5, description: 'Hero hesitates or refuses' },
      { name: 'Mentor', percentage: 5, description: 'Hero gains guidance' },
      { name: 'Threshold', percentage: 10, description: 'Hero crosses into the unknown' },
      { name: 'Tests', percentage: 20, description: 'Hero faces challenges and allies' },
      { name: 'Inmost Cave', percentage: 10, description: 'Hero approaches ultimate challenge' },
      { name: 'Ordeal', percentage: 15, description: 'Hero faces their greatest challenge' },
      { name: 'Reward', percentage: 5, description: 'Hero achieves their goal' },
      { name: 'Road Back', percentage: 5, description: 'Hero begins journey home' },
      { name: 'Resurrection', percentage: 5, description: 'Final test and transformation' },
      { name: 'Return', percentage: 5, description: 'Hero returns transformed' }
    ],
    keyBeats: ['Ordinary world', 'Call to adventure', 'Refusal of call', 'Meeting the mentor', 'Crossing the threshold', 'Tests allies enemies', 'Approach to cave', 'Ordeal', 'Reward', 'Road back', 'Resurrection', 'Return with elixir']
  },
  sequence: {
    name: 'Sequence Structure',
    description: 'Series of escalating sequences building to climax',
    acts: [
      { name: 'Opening Sequence', percentage: 15, description: 'Establish tone and hook' },
      { name: 'Escalating Sequence 1', percentage: 20, description: 'First major challenge' },
      { name: 'Escalating Sequence 2', percentage: 20, description: 'Stakes increase' },
      { name: 'Escalating Sequence 3', percentage: 20, description: 'Crisis point' },
      { name: 'Final Sequence', percentage: 25, description: 'Climax and resolution' }
    ],
    keyBeats: ['Opening hook', 'Sequence 1 climax', 'Sequence 2 escalation', 'Sequence 3 crisis', 'Final sequence peak', 'Resolution']
  },
  short_film: {
    name: 'Short Film Structure',
    description: 'Concise structure for short-form content',
    acts: [
      { name: 'Opening', percentage: 15, description: 'Immediate hook or situation' },
      { name: 'Development', percentage: 35, description: 'Conflict and character development' },
      { name: 'Climax', percentage: 30, description: 'Peak moment or turning point' },
      { name: 'Resolution', percentage: 20, description: 'Brief conclusion' }
    ],
    keyBeats: ['Opening hook', 'Central conflict', 'Escalation', 'Climax', 'Resolution']
  }
};

// Genre-specific story beats
export const GENRE_BEATS = {
  cyberpunk: ['Technology failure', 'Corporate betrayal', 'Identity crisis', 'Neon-lit confrontation', 'Hack sequence', 'Augmentation limit'],
  fantasy: ['Magical discovery', 'Prophecy reveal', 'Kingdom threat', 'Artifact quest', 'Dark lord emergence', 'Magical battle'],
  horror: ['Unexplained occurrence', 'Isolation', 'Discovery of threat', 'Failed escape', 'Final confrontation', 'Ambiguous ending'],
  action: ['Action setpiece', 'Car chase', 'Explosion', 'Fistfight', 'Shootout', 'Stunt sequence'],
  drama: ['Personal revelation', 'Relationship conflict', 'Life decision', 'Emotional confrontation', 'Acceptance', 'Growth moment'],
  sci_fi: ['Discovery', 'First contact', 'AI malfunction', 'Space anomaly', 'Tech demonstration', 'Cosmic revelation']
};

// Emotional arc templates
export const EMOTIONAL_ARCS = {
  rising: { name: 'Rising Action', description: 'Tension builds throughout', progression: ['Calm', 'Unease', 'Tension', 'High Stakes', 'Climax'] },
  falling: { name: 'Falling Action', description: 'Tension releases after climax', progression: ['Climax', 'Release', 'Reflection', 'Calm', 'Resolution'] },
  rollercoaster: { name: 'Roller Coaster', description: 'Multiple peaks and valleys', progression: ['Calm', 'Tension', 'Hope', 'Crisis', 'Hope', 'Tension', 'Climax'] },
  tragic: { name: 'Tragic', description: 'Downward spiral to conclusion', progression: ['Hope', 'Success', 'Complications', 'Downfall', 'Tragedy'] },
  triumphant: { name: 'Triumphant', description: 'Overcoming all odds', progression: ['Struggle', 'Low point', 'Determination', 'Building', 'Triumph'] },
  mystery: { name: 'Mystery', description: 'Reveal-focused progression', progression: ['Question', 'Investigation', 'Clue', 'Revelation', 'Resolution'] }
};

// Default configuration
const DEFAULT_CONFIG = {
  structure: 'three_act',
  genre: 'drama',
  targetDuration: 60,
  qualityTier: 'preview' as const,
  includeSummary: true,
  includeBeats: true,
  includeArc: true
};

/**
 * Configuration for StoryGenerator
 */
export interface StoryGeneratorConfig {
  structure?: string;
  genre?: string;
  targetDuration?: number;
  qualityTier?: 'draft' | 'preview' | 'final';
  includeSummary?: boolean;
  includeBeats?: boolean;
  includeArc?: boolean;
}

/**
 * Input for story generation
 */
export interface StoryGeneratorInput {
  projectTitle?: string;
  genre?: string;
  mood?: string[];
  characters?: any[];
  setting?: string;
  timePeriod?: string;
  videoType?: string;
  prompt?: string;
  targetDuration?: number;
}

/**
 * Story beat configuration
 */
export interface StoryBeat {
  beatId: string;
  name: string;
  description: string;
  timing: string;
  duration: number;
  emotionalState: string;
  characters: string[];
  keyEvents: string[];
  visualDirection?: string;
}

/**
 * Act configuration
 */
export interface StoryAct {
  actId: string;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  duration: number;
  percentage: number;
  beats: StoryBeat[];
  summary: string;
}

/**
 * Scene configuration
 */
export interface StoryScene {
  sceneId: string;
  sceneNumber: number;
  title: string;
  description: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  duration: number;
  mood: string;
  purpose: string;
}

/**
 * Emotional arc configuration
 */
export interface EmotionalArc {
  arcType: string;
  progression: string[];
  keyEmotionalMoments: string[];
  tensionCurve: { time: number; level: number; label: string }[];
}

/**
 * Generated story configuration
 */
export interface GeneratedStory {
  storyId: string;
  projectTitle: string;
  structure: string;
  genre: string;
  acts: StoryAct[];
  scenes: StoryScene[];
  emotionalArc: EmotionalArc;
  globalSummary: string;
  themes: string[];
  keyMotifs: string[];
  tone: string;
  targetDuration: number;
  totalActs: number;
  totalScenes: number;
  createdAt: string;
}

/**
 * Main StoryGenerator class
 */
export class StoryGenerator {
  private config: StoryGeneratorConfig;
  private providerManager: LLMProviderManager | null = null;

  constructor(config: StoryGeneratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize with LLM provider manager
   */
  initialize(providerManager: LLMProviderManager): void {
    this.providerManager = providerManager;
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<StoryGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate story from input
   */
  generateStory(input: StoryGeneratorInput): GeneratedStory {
    const structure = STORY_STRUCTURES[this.config.structure as keyof typeof STORY_STRUCTURES] || STORY_STRUCTURES.three_act;
    const genre = input.genre || this.config.genre || 'drama';
    const duration = input.targetDuration || this.config.targetDuration || 60;
    
    const storyId = `story_${(input.projectTitle || 'untitled').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    
    // Generate acts
    const acts = this.generateActs(structure, duration, genre);
    
    // Generate scenes
    const scenes = this.generateScenes(acts, genre);
    
    // Generate emotional arc
    const emotionalArc = this.generateEmotionalArc(genre, duration);
    
    // Generate global summary
    const globalSummary = this.generateGlobalSummary(input, acts, genre);
    
    // Extract themes
    const themes = this.extractThemes(input.prompt, genre);
    
    return {
      storyId,
      projectTitle: input.projectTitle || 'Untitled Project',
      structure: this.config.structure || 'three_act',
      genre,
      acts,
      scenes,
      emotionalArc,
      globalSummary,
      themes,
      keyMotifs: this.generateKeyMotifs(genre),
      tone: this.determineTone(input.mood),
      targetDuration: duration,
      totalActs: acts.length,
      totalScenes: scenes.length,
      createdAt: new Date().toISOString() + 'Z'
    };
  }

  /**
   * Generate story acts with beats
   */
  private generateActs(structure: any, duration: number, genre: string): StoryAct[] {
    const acts: StoryAct[] = [];
    let currentTime = 0;
    
    structure.acts.forEach((actDef: any, index: number) => {
      const actDuration = Math.floor(duration * (actDef.percentage / 100));
      const beats = this.generateBeatsForAct(actDef, actDuration, genre, index);
      
      acts.push({
        actId: `act_${index + 1}`,
        name: actDef.name,
        description: actDef.description,
        startTime: currentTime,
        endTime: currentTime + actDuration,
        duration: actDuration,
        percentage: actDef.percentage,
        beats,
        summary: this.generateActSummary(actDef.name, genre, index)
      });
      
      currentTime += actDuration;
    });
    
    return acts;
  }

  /**
   * Generate beats for an act
   */
  private generateBeatsForAct(actDef: any, duration: number, genre: string, actIndex: number): StoryBeat[] {
    const beats: StoryBeat[] = [];
    const beatCount = Math.max(2, Math.floor(duration / 10));
    const beatDuration = duration / beatCount;
    const genreBeats = GENRE_BEATS[genre as keyof typeof GENRE_BEATS] || GENRE_BEATS.drama;
    
    for (let i = 0; i < beatCount; i++) {
      const beatTime = actDef.startTime + (i * beatDuration);
      
      beats.push({
        beatId: `beat_${actIndex + 1}_${i + 1}`,
        name: this.getBeatName(actIndex, i, genre),
        description: this.getBeatDescription(actIndex, i, genre),
        timing: `${Math.floor(beatTime)}s - ${Math.floor(beatTime + beatDuration)}s`,
        duration: beatDuration,
        emotionalState: this.getEmotionalState(actIndex, i, beatCount),
        characters: this.getCharactersForBeat(actIndex),
        keyEvents: [this.getKeyEvent(actIndex, i, genre, genreBeats)]
      });
    }
    
    return beats;
  }

  /**
   * Generate scenes from acts
   */
  private generateScenes(acts: StoryAct[], genre: string): StoryScene[] {
    const scenes: StoryScene[] = [];
    let sceneNumber = 0;
    
    acts.forEach(act => {
      const sceneCount = Math.max(2, Math.floor(act.duration / 8));
      const sceneDuration = act.duration / sceneCount;
      
      for (let i = 0; i < sceneCount; i++) {
        sceneNumber++;
        const sceneStart = act.startTime + (i * sceneDuration);
        
        scenes.push({
          sceneId: `scene_${sceneNumber}`,
          sceneNumber,
          title: this.getSceneTitle(act.name, i, genre),
          description: this.getSceneDescription(act.name, i, genre),
          location: this.getLocation(genre, i),
          timeOfDay: this.getTimeOfDay(i, sceneCount),
          characters: this.getCharactersForScene(act.name),
          duration: sceneDuration,
          mood: this.getSceneMood(act.name, i),
          purpose: this.getScenePurpose(act.name, i)
        });
      }
    });
    
    return scenes;
  }

  /**
   * Generate emotional arc
   */
  private generateEmotionalArc(genre: string, duration: number): EmotionalArc {
    const arcType = this.determineArcType(genre);
    const arc = EMOTIONAL_ARCS[arcType as keyof typeof EMOTIONAL_ARCS] || EMOTIONAL_ARCS.rising;
    
    const tensionCurve: { time: number; level: number; label: string }[] = [];
    const interval = duration / (arc.progression.length - 1);
    
    arc.progression.forEach((label, index) => {
      let level = 20 + (index * (80 / (arc.progression.length - 1)));
      
      // Add some variation
      if (index > 0 && index < arc.progression.length - 1) {
        level += (Math.random() - 0.5) * 15;
      }
      
      tensionCurve.push({
        time: Math.floor(index * interval),
        level: Math.max(10, Math.min(100, Math.round(level))),
        label
      });
    });
    
    return {
      arcType,
      progression: arc.progression,
      keyEmotionalMoments: this.getEmotionalMoments(genre),
      tensionCurve
    };
  }

  /**
   * Generate global story summary
   */
  private generateGlobalSummary(input: StoryGeneratorInput, acts: StoryAct[], genre: string): string {
    const protagonist = 'the protagonist';
    const setting = input.setting || 'a world of conflict and transformation';
    const conflict = this.getGenreConflict(genre);
    
    return `In ${setting}, ${protagonist} faces ${conflict}. ` +
      `Through ${acts.length} acts of escalating tension, ` +
      `the story explores themes of ${this.getThemeString(genre)} ` +
      `culminating in a transformative climax that challenges everything ` +
      `${protagonist} believed about themselves and their world.`;
  }

  /**
   * Extract themes from prompt
   */
  private extractThemes(prompt?: string, genre?: string): string[] {
    const themes: string[] = [];
    const text = (prompt || '').toLowerCase();
    
    const themeKeywords: Record<string, string[]> = {
      'Redemption': ['redemption', 'second chance', 'atone', 'forgive'],
      'Identity': ['identity', 'who am I', 'self discovery', 'become'],
      'Power': ['power', 'control', 'domination', 'strength'],
      'Love': ['love', 'romance', 'heart', 'passion'],
      'Survival': ['survival', 'survive', 'fight', 'escape'],
      'Justice': ['justice', 'revenge', 'fairness', 'truth'],
      'Technology': ['technology', 'ai', 'machine', 'future'],
      'Freedom': ['freedom', 'liberty', 'escape', 'break free'],
      'Family': ['family', 'parents', 'children', 'legacy'],
      'Fear': ['fear', 'terror', 'horror', 'dread']
    };
    
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        themes.push(theme);
      }
    }
    
    // Add genre-specific themes
    const genreThemes: Record<string, string[]> = {
      cyberpunk: ['Humanity', 'Technology', 'Corporations', 'Identity'],
      fantasy: ['Magic', 'Destiny', 'Good vs Evil', 'Heroism'],
      horror: ['Fear', 'Isolation', 'The Unknown', 'Survival'],
      action: ['Courage', 'Sacrifice', 'Duty', 'Heroism'],
      drama: ['Relationships', 'Growth', 'Choice', 'Consequence'],
      sci_fi: ['Discovery', 'Progress', 'Humanity', 'The Future']
    };
    
    const gThemes = genreThemes[genre || 'drama'] || genreThemes.drama;
    gThemes.forEach(t => {
      if (!themes.includes(t)) themes.push(t);
    });
    
    return themes.length ? themes : ['Conflict', 'Transformation'];
  }

  /**
   * Generate key motifs
   */
  private generateKeyMotifs(genre: string): string[] {
    const motifs: Record<string, string[]> = {
      cyberpunk: ['Neon lights', 'Digital code', 'Corporate logos', 'Augmentation'],
      fantasy: ['Ancient symbols', 'Magical artifacts', 'Prophecies', 'Royal insignia'],
      horror: ['Shadows', 'Unsettling sounds', 'Isolated spaces', 'Unnatural elements'],
      action: ['Explosions', 'Vehicle pursuits', 'Weapons', 'Explosive impacts'],
      drama: ['Meaningful glances', 'Symbolic objects', 'Weather', 'Music'],
      sci_fi: ['Holograms', 'Technology interfaces', 'Space', 'Alien landscapes']
    };
    
    return motifs[genre] || motifs.drama;
  }

  /**
   * Determine tone from mood
   */
  private determineTone(mood?: string[]): string {
    if (!mood || mood.length === 0) return 'Neutral with dramatic peaks';
    
    const moodTones: Record<string, string> = {
      'dark': 'Sombre and intense',
      'tense': 'On-edge and suspenseful',
      'epic': 'Grand and sweeping',
      'happy': 'Upbeat and hopeful',
      'mysterious': 'Enigmatic and intriguing',
      'romantic': 'Passionate and emotional'
    };
    
    const primaryMood = mood[0].toLowerCase();
    return moodTones[primaryMood] || 'Neutral with dramatic peaks';
  }

  // Helper methods for beat generation
  private getBeatName(actIndex: number, beatIndex: number, genre: string): string {
    const names: Record<number, string[]> = {
      0: ['Setup', 'Introduction', 'First Glimpse', 'Normal World'],
      1: ['Challenge', 'Conflict', 'Escalation', 'Rising Action'],
      2: ['Climax', 'Crisis', 'Confrontation', 'Final Battle']
    };
    
    const actNames = names[actIndex] || names[1];
    return actNames[beatIndex % actNames.length];
  }

  private getBeatDescription(actIndex: number, beatIndex: number, genre: string): string {
    return `Key moment in ${actIndex === 0 ? 'establishing' : actIndex === 1 ? 'developing' : 'resolving'} the ${genre} narrative.`;
  }

  private getEmotionalState(actIndex: number, beatIndex: number, totalBeats: number): string {
    const states = ['Calm', 'Curious', 'Tense', 'Anxious', 'Dramatic', 'Intense'];
    return states[Math.min(beatIndex, states.length - 1)];
  }

  private getCharactersForBeat(actIndex: number): string[] {
    return actIndex === 0 
      ? ['Protagonist', 'Supporting cast']
      : actIndex === 1
      ? ['Protagonist', 'Antagonist', 'Key allies']
      : ['All major characters'];
  }

  private getKeyEvent(actIndex: number, beatIndex: number, genre: string, genreBeats: string[]): string {
    const events = [
      'Introduction of main conflict',
      'Character motivation revealed',
      'Stakes are established',
      'Major obstacle encountered',
      'All seems lost',
      'Final confrontation'
    ];
    return events[beatIndex % events.length];
  }

  private getSceneTitle(actName: string, sceneIndex: number, genre: string): string {
    return `${actName} Scene ${sceneIndex + 1}`;
  }

  private getSceneDescription(actName: string, sceneIndex: number, genre: string): string {
    return `A pivotal moment in the ${actName.toLowerCase()} that advances the ${genre} narrative.`;
  }

  private getLocation(genre: string, sceneIndex: number): string {
    const locations: Record<string, string[]> = {
      cyberpunk: ['Neon district', 'Corporate tower', 'Underground club', 'Cyberspace'],
      fantasy: ['Ancient ruins', 'Royal court', 'Mystic forest', 'Battlefield'],
      horror: ['Abandoned building', 'Dark alley', 'Isolated house', 'Creepy location'],
      action: ['City streets', 'Industrial zone', 'Airport', 'Vehicle'],
      drama: ['Home', 'Workplace', 'Public space', 'Intimate setting'],
      sci_fi: ['Space station', 'Lab', 'Alien world', 'Future city']
    };
    
    const genreLocations = locations[genre] || locations.drama;
    return genreLocations[sceneIndex % genreLocations.length];
  }

  private getTimeOfDay(sceneIndex: number, totalScenes: number): string {
    const times = ['Dawn', 'Morning', 'Afternoon', 'Dusk', 'Night', 'Late Night'];
    return times[Math.floor((sceneIndex / totalScenes) * times.length)];
  }

  private getCharactersForScene(actName: string): string[] {
    if (actName.includes('Act 1')) return ['Protagonist'];
    if (actName.includes('Act 2')) return ['Protagonist', 'Antagonist'];
    return ['All characters'];
  }

  private getSceneMood(actName: string, sceneIndex: number): string {
    if (actName.includes('Act 1')) return 'Discovering';
    if (actName.includes('Act 2')) return 'Struggling';
    return 'Resolving';
  }

  private getScenePurpose(actName: string, sceneIndex: number): string {
    if (actName.includes('Act 1')) return 'Establish world and conflict';
    if (actName.includes('Act 2')) return 'Escalate tension and stakes';
    return 'Resolve conflict and themes';
  }

  private determineArcType(genre: string): string {
    const arcs: Record<string, string> = {
      cyberpunk: 'rollercoaster',
      fantasy: 'triumphant',
      horror: 'tragic',
      action: 'rising',
      drama: 'rollercoaster',
      sci_fi: 'mystery'
    };
    return arcs[genre] || 'rising';
  }

  private getEmotionalMoments(genre: string): string[] {
    const moments: Record<string, string[]> = {
      cyberpunk: ['Realizing the truth', 'Betrayal', 'Final choice'],
      fantasy: ['Calling to adventure', 'Magical discovery', 'Final battle'],
      horror: ['First scare', 'Isolation', 'Final confrontation'],
      action: ['Action climax', 'Sacrifice', 'Victory'],
      drama: ['Emotional revelation', 'Relationship test', 'Acceptance'],
      sci_fi: ['First contact', 'Discovery', 'Transformation']
    };
    return moments[genre] || moments.drama;
  }

  private getGenreConflict(genre: string): string {
    const conflicts: Record<string, string> = {
      cyberpunk: 'a corrupt system and their own humanity',
      fantasy: 'an ancient evil and their destined role',
      horror: 'unspeakable terror and survival',
      action: 'overwhelming odds and impossible odds',
      drama: 'personal demons and difficult choices',
      sci_fi: 'unknown dangers and the fate of humanity'
    };
    return conflicts[genre] || 'overwhelming challenges';
  }

  private getThemeString(genre: string): string {
    const themes: Record<string, string> = {
      cyberpunk: 'humanity vs technology',
      fantasy: 'good vs evil',
      horror: 'fear vs survival',
      action: 'courage vs cowardice',
      drama: 'growth vs stagnation',
      sci_fi: 'progress vs tradition'
    };
    return themes[genre] || 'struggle and transformation';
  }

  private generateActSummary(actName: string, genre: string, actIndex: number): string {
    const summaries: Record<number, string> = {
      0: `The ${actName.toLowerCase()} establishes the world, characters, and initial conflict in this ${genre} story.`,
      1: `During the ${actName.toLowerCase()}, tensions escalate as the protagonist faces increasing challenges.`,
      2: `The ${actName.toLowerCase()} brings resolution to the ${genre} narrative through climax and denouement.`
    };
    return summaries[actIndex] || `Key section of the ${genre} story.`;
  }

  /**
   * Get available story structures
   */
  getStructures(): { value: string; label: string; description: string }[] {
    return [
      { value: 'three_act', label: 'Three-Act Structure', description: 'Classic narrative structure' },
      { value: 'trailer', label: 'Trailer Structure', description: 'Fast-paced for trailers' },
      { value: 'hero_journey', label: 'Hero\'s Journey', description: 'Monomyth transformation' },
      { value: 'sequence', label: 'Sequence Structure', description: 'Escalating sequences' },
      { value: 'short_film', label: 'Short Film', description: 'Concise short-form' }
    ];
  }

  /**
   * Get available emotional arcs
   */
  getEmotionalArcs(): { value: string; label: string; description: string }[] {
    return [
      { value: 'rising', label: 'Rising Action', description: 'Tension builds throughout' },
      { value: 'falling', label: 'Falling Action', description: 'Tension releases after climax' },
      { value: 'rollercoaster', label: 'Roller Coaster', description: 'Multiple peaks and valleys' },
      { value: 'tragic', label: 'Tragic', description: 'Downward spiral to conclusion' },
      { value: 'triumphant', label: 'Triumphant', description: 'Overcoming all odds' },
      { value: 'mystery', label: 'Mystery', description: 'Reveal-focused progression' }
    ];
  }
}

export default StoryGenerator;
