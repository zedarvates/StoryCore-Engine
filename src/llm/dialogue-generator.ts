/**
 * Dialogue Generator for StoryCore LLM Assistant
 * Generates voice-over scripts, character dialogue lines, timing markers, and style consistency
 */

import { LLMProviderManager } from './provider-manager';

// Dialogue style templates by genre
export const DIALOGUE_STYLES = {
  cyberpunk: {
    name: 'Cyberpunk',
    characteristics: ['Snappy', 'Tech-infused', 'Street-wise', 'Cynical'],
    vocabulary: ['Net', 'Deck', 'Ice', 'Jack in', 'Matrix', 'Corp'],
    punctuation: 'Exclamation-heavy, ellipses for tension',
    sample: 'Jack into the net. We got ice ahead. Move fast.',
    voiceOverStyle: 'Gritty, fast-paced, tech terminology'
  },
  fantasy: {
    name: 'Fantasy',
    characteristics: ['Archaic', 'Eloquent', 'Mysterious', 'Formal'],
    vocabulary: ['Thee', 'Thou', 'Hark', 'Mystic', 'Ancient', 'Realm'],
    punctuation: 'Periods for gravitas, commas for dramatic pauses',
    sample: 'Hark! The ancient prophecy speaks of thy destiny.',
    voiceOverStyle: 'Resonant, dramatic, epic'
  },
  horror: {
    name: 'Horror',
    characteristics: ['Whispered', 'Tense', 'Broken', 'Urgent'],
    vocabulary: ['It', 'Behind you', 'Don\'t look', 'Run', 'Noises'],
    punctuation: 'Trailing off, short sentences, ellipses',
    sample: 'Did you hear... that? Something\'s... here.',
    voiceOverStyle: 'Eerie, whispered, unsettling'
  },
  action: {
    name: 'Action',
    characteristics: ['Direct', 'Loud', 'Brief', 'Explosive'],
    vocabulary: ['Go', 'Now', 'Get out', 'Fire', 'Move'],
    punctuation: 'Short bursts, exclamation points',
    sample: 'Go! Now! Move it!',
    voiceOverStyle: 'Urgent, commanding, explosive'
  },
  drama: {
    name: 'Drama',
    characteristics: ['Natural', 'Emotional', 'Reflective', 'Meaningful'],
    vocabulary: ['Feel', 'Think', 'Remember', 'Truth', 'Why'],
    punctuation: 'Varied, natural pauses, commas for thoughts',
    sample: 'I never thought it would come to this... but here we are.',
    voiceOverStyle: 'Intimate, reflective, emotional'
  },
  sci_fi: {
    name: 'Science Fiction',
    characteristics: ['Technical', 'Precise', 'Future-referential', 'Logical'],
    vocabulary: ['Quantum', 'Field', 'Energy', 'Protocol', 'System', 'AI'],
    punctuation: 'Clinical, precise timing',
    sample: 'Initiate quantum protocol. Energy field at 100%.',
    voiceOverStyle: 'Clinical, measured, informative'
  }
};

// Voice-over templates
export const VOOICE_OVER_TEMPLATES = {
  trailer: {
    name: 'Trailer Voice-Over',
    structure: ['Hook', 'Setup', 'Conflict', 'Stakes', 'Climax'],
    timing: { hook: 5, setup: 10, conflict: 15, stakes: 10, climax: 5 },
    style: 'Epic, commanding, memorable punchlines'
  },
  teaser: {
    name: 'Teaser Voice-Over',
    structure: ['Mystery', 'Hint', 'Tease'],
    timing: { mystery: 5, hint: 5, tease: 5 },
    style: 'Mysterious, intriguing, incomplete'
  },
  documentary: {
    name: 'Documentary Voice-Over',
    structure: ['Fact', 'Context', 'Reflection'],
    timing: { fact: 10, context: 15, reflection: 10 },
    style: 'Authoritative, informative, contemplative'
  },
  narration: {
    name: 'Character Narration',
    structure: ['Internal thought', 'Observation', 'Insight'],
    timing: { thought: 8, observation: 10, insight: 7 },
    style: 'Personal, reflective, revealing'
  }
};

// Character dialogue templates
export const DIALOGUE_TEMPLATES = {
  protagonist: {
    role: 'Protagonist',
    purpose: 'Drive the story forward, express goals',
    templates: [
      'I have to [action]. No matter what.',
      'This isn\'t just about me. It\'s about everyone.',
      'I never expected it to come to this...',
      'There has to be another way.',
      'I\'m doing this because [reason].'
    ],
    emotions: ['Determined', 'Hopeful', 'Desperate', 'Resolute']
  },
  antagonist: {
    role: 'Antagonist',
    purpose: 'Oppose protagonist, create conflict',
    templates: [
      'You think you can stop me? You\'re [insult].',
      'It\'s too late. I\'ve already won.',
      'You don\'t understand. This is bigger than all of us.',
      'Join me, and we can [goal] together.',
      'You have no idea what you\'re dealing with.'
    ],
    emotions: ['Menacing', 'Confident', 'Scornful', 'Calculating']
  },
  mentor: {
    role: 'Mentor',
    purpose: 'Guide, advise, provide wisdom',
    templates: [
      'Remember: [lesson].',
      'I\'ve seen this before. Listen to me.',
      'The answer lies within you, not outside.',
      'Trust the process. It will all make sense.',
      'Sometimes, the hardest choice is the right one.'
    ],
    emotions: ['Wise', 'Patient', 'Mysterious', 'Supportive']
  },
  sidekick: {
    role: 'Sidekick',
    purpose: 'Support, comic relief, loyalty',
    templates: [
      'I\'ve got your back.',
      'This is insane! But I\'m in.',
      'You know I\'m not leaving, right?',
      'Let me help. That\'s what I do.',
      'We\'ll figure it out. We always do.'
    ],
    emotions: ['Loyal', 'Enthusiastic', 'Worried', 'Brave']
  },
  loveInterest: {
    role: 'Love Interest',
    purpose: 'Motivate, emotional depth, romance',
    templates: [
      'I believe in you. Even when you don\'t believe in yourself.',
      'This changes everything... doesn\'t it?',
    'I\'ve been waiting for you.',
      'Come back to me. Please.',
      'What we have... it\'s worth fighting for.'
    ],
    emotions: ['Loving', 'Worried', 'Hopeful', 'Passionate']
  }
};

// Default configuration
const DEFAULT_CONFIG = {
  genre: 'drama',
  style: 'natural',
  includeVoiceOver: true,
  includeDialogue: true,
  qualityTier: 'preview' as const
};

/**
 * Configuration for DialogueGenerator
 */
export interface DialogueGeneratorConfig {
  genre?: string;
  style?: string;
  includeVoiceOver?: boolean;
  includeDialogue?: boolean;
  qualityTier?: 'draft' | 'preview' | 'final';
}

/**
 * Input for dialogue generation
 */
export interface DialogueGeneratorInput {
  projectTitle?: string;
  genre?: string;
  mood?: string[];
  characters?: any[];
  scenes?: any[];
  videoType?: string;
  prompt?: string;
  targetDuration?: number;
}

/**
 * Dialogue line configuration
 */
export interface DialogueLine {
  lineId: string;
  characterId: string;
  characterName: string;
  characterRole: string;
  dialogue: string;
  emotion: string;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  sceneId?: string;
  purpose: string;
  styleNotes?: string;
}

/**
 * Voice-over configuration
 */
export interface VoiceOver {
  voId: string;
  type: string;
  script: string;
  speaker?: string;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
  tone: string;
  style: string;
  sceneContext?: string;
}

/**
 * Dialogue scene configuration
 */
export interface DialogueScene {
  sceneId: string;
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  lines: DialogueLine[];
  voiceOvers: VoiceOver[];
  overallMood: string;
  conflictLevel: 'low' | 'medium' | 'high';
  purpose: string;
}

/**
 * Generated dialogue output
 */
export interface DialogueGenerationOutput {
  dialogueId: string;
  projectTitle: string;
  genre: string;
  scenes: DialogueScene[];
  voiceOvers: VoiceOver[];
  characterDialogueMap: Map<string, DialogueLine[]>;
  styleNotes: string;
  totalLines: number;
  totalVoiceOvers: number;
  createdAt: string;
}

/**
 * Main DialogueGenerator class
 */
export class DialogueGenerator {
  private config: DialogueGeneratorConfig;
  private providerManager: LLMProviderManager | null = null;

  constructor(config: DialogueGeneratorConfig = {}) {
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
  updateConfig(newConfig: Partial<DialogueGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate dialogue from input
   */
  generateDialogue(input: DialogueGeneratorInput): DialogueGenerationOutput {
    const genre = input.genre || this.config.genre || 'drama';
    const genreStyle = DIALOGUE_STYLES[genre as keyof typeof DIALOGUE_STYLES] || DIALOGUE_STYLES.drama;
    const duration = input.targetDuration || 60;
    
    const dialogueId = `dialogue_${(input.projectTitle || 'untitled').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    
    // Generate scenes with dialogue
    const scenes = this.generateDialogueScenes(input, genre, genreStyle, duration);
    
    // Generate voice-overs
    const voiceOvers = this.config.includeVoiceOver 
      ? this.generateVoiceOvers(input, genre, genreStyle, duration)
      : [];
    
    // Create character dialogue map
    const characterDialogueMap = new Map<string, DialogueLine[]>();
    
    scenes.forEach(scene => {
      scene.lines.forEach(line => {
        const existing = characterDialogueMap.get(line.characterId) || [];
        existing.push(line);
        characterDialogueMap.set(line.characterId, existing);
      });
    });
    
    return {
      dialogueId,
      projectTitle: input.projectTitle || 'Untitled Project',
      genre,
      scenes,
      voiceOvers,
      characterDialogueMap,
      styleNotes: this.generateStyleNotes(genre, genreStyle),
      totalLines: scenes.reduce((sum, s) => sum + s.lines.length, 0),
      totalVoiceOvers: voiceOvers.length,
      createdAt: new Date().toISOString() + 'Z'
    };
  }

  /**
   * Generate dialogue scenes
   */
  private generateDialogueScenes(
    input: DialogueGeneratorInput,
    genre: string,
    genreStyle: any,
    duration: number
  ): DialogueScene[] {
    const scenes: DialogueScene[] = [];
    const sceneCount = Math.max(3, Math.floor(duration / 15));
    const sceneDuration = duration / sceneCount;
    
    // Determine characters
    const characters = input.characters || [
      { characterId: 'protagonist', name: 'Protagonist', role: 'protagonist' },
      { characterId: 'antagonist', name: 'Antagonist', role: 'antagonist' },
      { characterId: 'mentor', name: 'Mentor', role: 'mentor' }
    ];
    
    for (let i = 0; i < sceneCount; i++) {
      const sceneStart = i * sceneDuration;
      const sceneEnd = sceneStart + sceneDuration;
      const conflictLevel = i < sceneCount * 0.3 ? 'low' : i < sceneCount * 0.7 ? 'medium' : 'high';
      
      const lines = this.generateDialogueLines(
        characters,
        sceneStart,
        sceneDuration,
        conflictLevel,
        genre
      );
      
      scenes.push({
        sceneId: `dialogue_scene_${i + 1}`,
        sceneNumber: i + 1,
        location: this.getSceneLocation(genre, i),
        timeOfDay: this.getTimeOfDay(i, sceneCount),
        lines,
        voiceOvers: [],
        overallMood: this.getSceneMood(i, sceneCount, conflictLevel),
        conflictLevel: conflictLevel as 'low' | 'medium' | 'high',
        purpose: this.getScenePurpose(i, sceneCount)
      });
    }
    
    return scenes;
  }

  /**
   * Generate dialogue lines for a scene
   */
  private generateDialogueLines(
    characters: any[],
    startTime: number,
    duration: number,
    conflictLevel: string,
    genre: string
  ): DialogueLine[] {
    const lines: DialogueLine[] = [];
    const lineCount = Math.max(3, Math.floor(duration / 5));
    const lineDuration = duration / lineCount;
    
    characters.forEach((char, charIndex) => {
      const template = DIALOGUE_TEMPLATES[char.role as keyof typeof DIALOGUE_TEMPLATES];
      if (!template) return;
      
      // Generate 1-2 lines per character per scene
      const linesPerChar = charIndex < 2 ? 2 : 1;
      
      for (let l = 0; l < linesPerChar; l++) {
        const lineIndex = lines.length;
        const lineStart = startTime + (lineIndex * lineDuration * 0.5);
        
        lines.push({
          lineId: `line_${lineIndex + 1}`,
          characterId: char.characterId,
          characterName: char.name,
          characterRole: char.role,
          dialogue: this.generateDialogueLine(template, genre),
          emotion: template.emotions[Math.floor(Math.random() * template.emotions.length)],
          timing: {
            start: Math.round(lineStart * 10) / 10,
            end: Math.round((lineStart + lineDuration * 0.5) * 10) / 10,
            duration: Math.round(lineDuration * 0.5 * 10) / 10
          },
          sceneId: undefined,
          purpose: this.getDialoguePurpose(char.role),
          styleNotes: undefined
        });
      }
    });
    
    return lines;
  }

  /**
   * Generate a single dialogue line
   */
  private generateDialogueLine(template: any, genre: string): string {
    const templates = template.templates;
    const baseTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    // Customize based on genre
    const genreWords = DIALOGUE_STYLES[genre as keyof typeof DIALOGUE_STYLES]?.vocabulary || [];
    
    // Replace placeholders
    let line = baseTemplate;
    line = line.replace('[action]', this.getActionWord(genre));
    line = line.replace('[reason]', this.getReason(genre));
    line = line.replace('[insult]', this.getInsult(genre));
    line = line.replace('[goal]', this.getGoal(genre));
    
    // Occasionally add genre-specific vocabulary
    if (Math.random() > 0.7 && genreWords.length > 0) {
      line = `${genreWords[Math.floor(Math.random() * genreWords.length)]}. ${line}`;
    }
    
    return line;
  }

  /**
   * Generate voice-overs
   */
  private generateVoiceOvers(
    input: DialogueGeneratorInput,
    genre: string,
    genreStyle: any,
    duration: number
  ): VoiceOver[] {
    const voiceOvers: VoiceOver[] = [];
    const voCount = Math.max(2, Math.floor(duration / 20));
    const voDuration = duration / voCount;
    
    const voTypes = ['trailer', 'narration', 'documentary'];
    
    for (let i = 0; i < voCount; i++) {
      const voStart = i * voDuration;
      const voType = voTypes[i % voTypes.length];
      const template = VOOICE_OVER_TEMPLATES[voType as keyof typeof VOOICE_OVER_TEMPLATES];
      
      voiceOvers.push({
        voId: `vo_${i + 1}`,
        type: voType,
        script: this.generateVoiceOverScript(genre, genreStyle, voType, i),
        timing: {
          start: Math.round(voStart * 10) / 10,
          end: Math.round((voStart + voDuration) * 10) / 10,
          duration: Math.round(voDuration * 10) / 10
        },
        tone: genreStyle.voiceOverStyle,
        style: template?.style || 'Narrative',
        sceneContext: undefined
      });
    }
    
    return voiceOvers;
  }

  /**
   * Generate voice-over script
   */
  private generateVoiceOverScript(genre: string, genreStyle: any, voType: string, index: number): string {
    const scripts: Record<string, string[]> = {
      trailer: [
        'In a world where everything has changed...',
        'One hero will rise above the chaos.',
        'This is not just a story. It\'s a warning.',
        'The countdown begins now.'
      ],
      narration: [
        'I remember when it all started...',
        'Looking back, I can see how we got here.',
        'The truth is more complex than anyone knew.',
        'This is what really happened.'
      ],
      documentary: [
        'The events that unfolded changed everything.',
        'What started as a simple mission...',
        'Experts believe this was just the beginning.',
        'History would never be the same.'
      ]
    };
    
    const genreScripts = scripts[voType] || scripts.narration;
    return genreScripts[index % genreScripts.length];
  }

  /**
   * Generate style notes
   */
  private generateStyleNotes(genre: string, genreStyle: any): string {
    return `Dialogue style for ${genre}: ${genreStyle.characteristics.join(', ')}. ` +
      `Vocabulary includes: ${genreStyle.vocabulary.slice(0, 3).join(', ')}. ` +
      `Voice-over approach: ${genreStyle.voiceOverStyle}.`;
  }

  // Helper methods
  private getSceneLocation(genre: string, sceneIndex: number): string {
    const locations: Record<string, string[]> = {
      cyberpunk: ['Neon alley', 'Corporate lobby', 'Cyberspace', 'Underground club'],
      fantasy: ['Ancient hall', 'Forest clearing', 'Battlefield', 'Castle'],
      horror: ['Dark corridor', 'Abandoned room', 'Basement', 'Attic'],
      action: ['City rooftop', 'Industrial zone', 'Highway', 'Warehouse'],
      drama: ['Living room', 'Office', 'Cafe', 'Park bench'],
      sci_fi: ['Space station', 'Lab', 'Bridge', 'Cryo chamber']
    };
    
    const genreLocations = locations[genre] || locations.drama;
    return genreLocations[sceneIndex % genreLocations.length];
  }

  private getTimeOfDay(sceneIndex: number, totalScenes: number): string {
    const times = ['Dawn', 'Morning', 'Afternoon', 'Dusk', 'Night', 'Deep Night'];
    return times[Math.floor((sceneIndex / totalScenes) * times.length)];
  }

  private getSceneMood(sceneIndex: number, totalScenes: number, conflictLevel: string): string {
    if (conflictLevel === 'high') return 'Tense';
    if (conflictLevel === 'medium') return 'Building';
    return 'Exploratory';
  }

  private getScenePurpose(sceneIndex: number, totalScenes: number): string {
    if (sceneIndex === 0) return 'Establish characters and world';
    if (sceneIndex < totalScenes * 0.5) return 'Develop conflict';
    if (sceneIndex < totalScenes * 0.8) return 'Escalate tension';
    return 'Resolve narrative';
  }

  private getDialoguePurpose(role: string): string {
    const purposes: Record<string, string> = {
      protagonist: 'Express goals and drive story',
      antagonist: 'Create conflict and opposition',
      mentor: 'Provide guidance and wisdom',
      sidekick: 'Offer support and comic relief',
      loveInterest: 'Add emotional depth and motivation'
    };
    return purposes[role] || 'Support narrative';
  }

  private getActionWord(genre: string): string {
    const actions: Record<string, string> = {
      cyberpunk: 'jack into the system',
      fantasy: 'answer the call',
      horror: 'survive the night',
      action: 'take them down',
      drama: 'make things right',
      sci_fi: 'activate the protocol'
    };
    return actions[genre] || 'fight back';
  }

  private getReason(genre: string): string {
    const reasons: Record<string, string> = {
      cyberpunk: 'it\'s the only way to bring down the corp',
      fantasy: 'the realm depends on it',
      horror: 'there\'s no other choice',
      action: 'the mission demands it',
      drama: 'I owe it to everyone who believed in me',
      sci_fi: 'humanity\'s survival depends on it'
    };
    return reasons[genre] || 'it\'s the right thing to do';
  }

  private getInsult(genre: string): string {
    const insults: Record<string, string> = {
      cyberpunk: 'a netrunner with a bad deck',
      fantasy: 'a squire who\'s never held a sword',
      horror: 'a ghost who forgot how to haunt',
      action: 'an amateur with a big mouth',
      drama: 'a mess who can\'t even help yourself',
      sci_fi: 'a glitch in the system'
    };
    return insults[genre] || 'just a beginner';
  }

  private getGoal(genre: string): string {
    const goals: Record<string, string> = {
      cyberpunk: 'rewrite the system from within',
      fantasy: 'restore the kingdom to its former glory',
      horror: 'finally rest in peace',
      action: 'complete the mission at any cost',
      drama: 'find peace and redemption',
      sci_fi: 'evolve beyond our limitations'
    };
    return goals[genre] || 'change everything';
  }

  /**
   * Get available dialogue styles
   */
  getStyles(): { value: string; label: string; description: string }[] {
    return [
      { value: 'cyberpunk', label: 'Cyberpunk', description: 'Tech-infused, street-wise dialogue' },
      { value: 'fantasy', label: 'Fantasy', description: 'Archaic, eloquent, magical' },
      { value: 'horror', label: 'Horror', description: 'Tense, whispered, unsettling' },
      { value: 'action', label: 'Action', description: 'Direct, explosive, brief' },
      { value: 'drama', label: 'Drama', description: 'Natural, emotional, reflective' },
      { value: 'sci_fi', label: 'Science Fiction', description: 'Technical, precise, logical' }
    ];
  }

  /**
   * Get voice-over types
   */
  getVoiceOverTypes(): { value: string; label: string; description: string }[] {
    return [
      { value: 'trailer', label: 'Trailer', description: 'Epic, commanding, memorable' },
      { value: 'teaser', label: 'Teaser', description: 'Mysterious, intriguing' },
      { value: 'documentary', label: 'Documentary', description: 'Authoritative, informative' },
      { value: 'narration', label: 'Character Narration', description: 'Personal, reflective' }
    ];
  }
}

export default DialogueGenerator;
