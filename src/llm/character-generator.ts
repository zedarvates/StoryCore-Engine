/**
 * Character Generator for StoryCore LLM Assistant
 * Generates character profiles from parsed prompts
 */

import { LLMProviderManager } from './provider-manager';

// Character archetype templates
export const CHARACTER_ARCHETYPES = {
  protagonist: {
    name: 'Protagonist',
    description: 'The central hero who drives the story forward',
    traits: ['Brave', 'Determined', 'Flawed', 'Relatable'],
    arc: 'From ordinary to extraordinary through trials',
    colorPalette: ['#3498db', '#2980b9', '#1abc9c']
  },
  antagonist: {
    name: 'Antagonist',
    description: 'The opposing force that creates conflict',
    traits: ['Powerful', 'Cunning', 'Ruthless', 'Charismatic'],
    arc: 'Represents the main obstacle with understandable motivations',
    colorPalette: ['#e74c3c', '#c0392b', '#8e44ad']
  },
  mentor: {
    name: 'Mentor',
    description: 'Guides the protagonist with wisdom',
    traits: ['Wise', 'Patient', 'Mysterious', 'Supportive'],
    arc: 'Prepares the hero for their journey',
    colorPalette: ['#f39c12', '#d35400', '#f1c40f']
  },
  sidekick: {
    name: 'Sidekick',
    description: 'Loyal companion who supports the protagonist',
    traits: ['Loyal', 'Comedic', 'Brave', 'Reliable'],
    arc: 'Grows alongside the protagonist',
    colorPalette: ['#27ae60', '#2ecc71', '#16a085']
  },
  loveInterest: {
    name: 'Love Interest',
    description: 'Romantic connection that motivates the protagonist',
    traits: ['Charming', 'Mysterious', 'Compassionate', 'Strong'],
    arc: 'Tests and strengthens the protagonist resolve',
    colorPalette: ['#e91e63', '#9c27b0', '#ff69b4']
  },
  rival: {
    name: 'Rival',
    description: 'Competitor who pushes the protagonist to improve',
    traits: ['Ambitious', 'Skilled', 'Jealous', 'Complex'],
    arc: 'May become ally or remain enemy',
    colorPalette: ['#ff5722', '#795548', '#607d8b']
  },
  trickster: {
    name: 'Trickster',
    description: 'Chaotic force that complicates situations',
    traits: ['Clever', 'Unpredictable', 'Mischievous', 'Helpful'],
    arc: 'Often provides crucial assistance unexpectedly',
    colorPalette: ['#9b59b6', '#1abc9c', '#e67e22']
  },
  guardian: {
    name: 'Guardian',
    description: 'Protector who watches over someone or something',
    traits: ['Vigilant', 'Dutiful', 'Strong', 'Sacrificing'],
    arc: 'Tests loyalty and makes ultimate sacrifice',
    colorPalette: ['#34495e', '#2c3e50', '#7f8c8d']
  }
};

// Personality trait categories
export const TRAIT_CATEGORIES = {
  positive: ['Brave', 'Compassionate', 'Loyal', 'Intelligent', 'Charismatic', 'Creative', 'Determined', 'Patient', 'Wise', 'Honest'],
  negative: ['Arrogant', 'Cowardly', 'Greedy', 'Jealous', 'Impatient', 'Rash', 'Deceptive', 'Cruel', 'Selfish', 'Stubborn'],
  complex: ['Quiet', 'Mysterious', 'Rebellious', 'Idealistic', 'Cynical', 'Sentimental', 'Ambitious', 'Lonely', 'Haunted', 'Witty']
};

// Role classifications
export const ROLE_CLASSIFICATIONS = {
  hero: { category: 'Lead', prominence: 'Primary', screenTime: 'High' },
  villain: { category: 'Antagonist', prominence: 'Primary', screenTime: 'High' },
  support: { category: 'Supporting', prominence: 'Secondary', screenTime: 'Medium' },
  comic: { category: 'Comedic', prominence: 'Secondary', screenTime: 'Medium' },
  love: { category: 'Romantic', prominence: 'Secondary', screenTime: 'Medium' },
  mentor: { category: 'Guide', prominence: 'Secondary', screenTime: 'Low' },
  extra: { category: 'Background', prominence: 'Minimal', screenTime: 'Low' }
};

// Default settings
const DEFAULT_CONFIG = {
  generateRelationships: true,
  generateArcs: true,
  generateVisualAttributes: true,
  qualityTier: 'preview' as const
};

/**
 * Configuration for CharacterGenerator
 */
export interface CharacterGeneratorConfig {
  generateRelationships?: boolean;
  generateArcs?: boolean;
  generateVisualAttributes?: boolean;
  qualityTier?: 'draft' | 'preview' | 'final';
}

/**
 * Input for character generation
 */
export interface CharacterGeneratorInput {
  projectTitle?: string;
  genre?: string;
  mood?: string[];
  characters?: Array<{ name: string; role: string; description?: string }>;
  prompt?: string;
  worldType?: string;
  setting?: string;
  timePeriod?: string;
}

/**
 * Character relationship configuration
 */
export interface CharacterRelationship {
  relatedCharacterId: string;
  relationshipType: string;
  description: string;
  dynamic: string;
  tensionLevel: 'low' | 'medium' | 'high';
}

/**
 * Character arc configuration
 */
export interface CharacterArc {
  startingState: string;
  keyIncitingIncidents: string[];
  midpointReversal: string;
  climaxPoint: string;
  endingState: string;
  transformation: string;
}

/**
 * Visual attributes configuration
 */
export interface VisualAttributes {
  ageRange: string;
  build: string;
  height: string;
  hair: string;
  eyes: string;
  clothing: string[];
  distinguishingFeatures: string[];
  colorPalette: string[];
}

/**
 * Generated character configuration
 */
export interface GeneratedCharacter {
  characterId: string;
  name: string;
  archetype: string;
  role: string;
  roleClassification: string;
  description: string;
  backstory: string;
  personalityTraits: {
    primary: string[];
    secondary: string[];
    hidden: string[];
  };
  motivation: {
    external: string;
    internal: string;
    fear: string;
    desire: string;
  };
  visualAttributes: VisualAttributes;
  relationships: CharacterRelationship[];
  arc: CharacterArc;
  dialogueStyle: string;
  keyQuotes: string[];
  scenes: string[];
  colorPalette: string[];
  importanceScore: number;
}

/**
 * Character generation output
 */
export interface CharacterGenerationOutput {
  characters: GeneratedCharacter[];
  relationshipMap: Map<string, CharacterRelationship[]>;
  characterDynamics: string;
  totalCharacters: number;
  protagonistId: string;
  antagonistId: string;
  createdAt: string;
}

/**
 * Main CharacterGenerator class
 */
export class CharacterGenerator {
  private config: CharacterGeneratorConfig;
  private providerManager: LLMProviderManager | null = null;

  constructor(config: CharacterGeneratorConfig = {}) {
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
  updateConfig(newConfig: Partial<CharacterGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Generate characters from input
   */
  generateCharacters(input: CharacterGeneratorInput): CharacterGenerationOutput {
    const characters: GeneratedCharacter[] = [];
    const relationshipMap = new Map<string, CharacterRelationship[]>();
    
    // Extract character hints from prompt
    const characterHints = this.extractCharacterHints(input.prompt);
    
    // Determine required characters based on genre
    const requiredArchetypes = this.determineRequiredArchetypes(input.genre, characterHints.length);
    
    // Generate protagonist
    const protagonist = this.generateProtagonist(input, characterHints);
    characters.push(protagonist);
    
    // Generate antagonist
    const antagonist = this.generateAntagonist(input, protagonist);
    characters.push(antagonist);
    
    // Generate supporting characters
    const supportChars = this.generateSupportingCharacters(input, protagonist, antagonist, requiredArchetypes.slice(2));
    characters.push(...supportChars);
    
    // Generate relationships
    if (this.config.generateRelationships) {
      this.generateAllRelationships(characters, relationshipMap);
    }
    
    // Sort by importance score
    characters.sort((a, b) => b.importanceScore - a.importanceScore);
    
    return {
      characters,
      relationshipMap,
      characterDynamics: this.generateCharacterDynamics(characters),
      totalCharacters: characters.length,
      protagonistId: protagonist.characterId,
      antagonistId: antagonist.characterId,
      createdAt: new Date().toISOString() + 'Z'
    };
  }

  /**
   * Extract character hints from prompt
   */
  private extractCharacterHints(prompt?: string): string[] {
    if (!prompt) return [];
    
    const hints: string[] = [];
    const text = prompt.toLowerCase();
    
    // Common character mentions in prompts
    const characterPatterns = [
      /(?:blanche?-neige|snow white)/i,
      /(?:reine|queen)/i,
      /(?:mercenaire|mercenary)/i,
      /(?:hackeur|hacker)/i,
      /(?:princess|princesse)/i,
      /(?:prince)/i,
      /(?:roi|king)/i,
      /(?:méchant|villain)/i,
      /(?:ami friend)/i
    ];
    
    characterPatterns.forEach(pattern => {
      if (pattern.test(text)) hints.push(text.match(pattern)?.[0] || '');
    });
    
    return [...new Set(hints)];
  }

  /**
   * Determine required archetypes based on genre
   */
  private determineRequiredArchetypes(genre?: string, hintCount: number): string[] {
    const archetypes = ['protagonist', 'antagonist'];
    
    // Add archetypes based on genre
    switch (genre) {
      case 'cyberpunk':
      case 'sci_fi':
        archetypes.push('mentor', 'rival');
        break;
      case 'fantasy':
        archetypes.push('mentor', 'loveInterest');
        break;
      case 'horror':
        archetypes.push('guardian', 'trickster');
        break;
      default:
        archetypes.push('sidekick', 'loveInterest');
    }
    
    // Add based on hint count
    while (archetypes.length < 3 + hintCount) {
      archetypes.push('sidekick');
    }
    
    return archetypes.slice(0, 6); // Maximum 6 characters
  }

  /**
   * Generate protagonist character
   */
  private generateProtagonist(input: CharacterGeneratorInput, hints: string[]): GeneratedCharacter {
    const archetype = CHARACTER_ARCHETYPES.protagonist;
    const genre = input.genre || 'drama';
    
    const characterId = `char_protagonist_${Date.now()}`;
    const name = this.generateName(genre, 'protagonist');
    
    return {
      characterId,
      name,
      archetype: 'protagonist',
      role: 'Main Hero',
      roleClassification: 'Primary Lead',
      description: `The central hero of the ${genre} story, destined to face great challenges.`,
      backstory: this.generateBackstory(genre, 'protagonist'),
      personalityTraits: {
        primary: this.selectTraits(['Brave', 'Determined'], archetype.traits),
        secondary: this.selectTraits(['Compassionate', 'Intelligent'], TRAIT_CATEGORIES.positive),
        hidden: ['Self-doubt', 'Hidden pain']
      },
      motivation: {
        external: `Save ${this.getGenreGoal(genre)}`,
        internal: 'Prove worthiness',
        fear: 'Failure',
        desire: ' redemption/salvation'
      },
      visualAttributes: this.generateVisualAttributes(genre, 'protagonist'),
      relationships: [],
      arc: this.generateArc('protagonist', genre),
      dialogueStyle: 'Heroic and determined',
      keyQuotes: ['I will not fail', 'This is my destiny', 'We can do this'],
      scenes: ['Opening scene', 'Training montage', 'Climax confrontation'],
      colorPalette: archetype.colorPalette,
      importanceScore: 100
    };
  }

  /**
   * Generate antagonist character
   */
  private generateAntagonist(input: CharacterGeneratorInput, protagonist: GeneratedCharacter): GeneratedCharacter {
    const archetype = CHARACTER_ARCHETYPES.antagonist;
    const genre = input.genre || 'drama';
    
    const characterId = `char_antagonist_${Date.now() + 1}`;
    const name = this.generateName(genre, 'antagonist');
    
    return {
      characterId,
      name,
      archetype: 'antagonist',
      role: 'Primary Threat',
      roleClassification: 'Primary Antagonist',
      description: `The powerful force opposing the protagonist with complex motivations.`,
      backstory: this.generateBackstory(genre, 'antagonist'),
      personalityTraits: {
        primary: this.selectTraits(['Powerful', 'Cunning'], archetype.traits),
        secondary: this.selectTraits(['Charismatic', 'Strategic'], TRAIT_CATEGORIES.complex),
        hidden: ['Deep insecurity', 'Twisted justification']
      },
      motivation: {
        external: `Destroy the protagonist's mission`,
        internal: 'Prove superiority',
        fear: 'Being powerless',
        desire: 'Control/dominion'
      },
      visualAttributes: this.generateVisualAttributes(genre, 'antagonist'),
      relationships: [],
      arc: this.generateArc('antagonist', genre),
      dialogueStyle: 'Menacing and confident',
      keyQuotes: ['You cannot stop me', 'Power is destiny', 'Join me or perish'],
      scenes: ['First reveal', 'Midpoint confrontation', 'Final battle'],
      colorPalette: archetype.colorPalette,
      importanceScore: 95
    };
  }

  /**
   * Generate supporting characters
   */
  private generateSupportingCharacters(
    input: CharacterGeneratorInput,
    protagonist: GeneratedCharacter,
    antagonist: GeneratedCharacter,
    archetypes: string[]
  ): GeneratedCharacter[] {
    const characters: GeneratedCharacter[] = [];
    const genre = input.genre || 'drama';
    
    archetypes.forEach((archetypeName, index) => {
      const archetype = CHARACTER_ARCHETYPES[archetypeName as keyof typeof CHARACTER_ARCHETYPES] || CHARACTER_ARCHETYPES.sidekick;
      const characterId = `char_${archetypeName}_${Date.now() + index + 2}`;
      const name = this.generateName(genre, archetypeName);
      
      characters.push({
        characterId,
        name,
        archetype: archetypeName,
        role: archetype.description.split(' ')[0],
        roleClassification: 'Supporting',
        description: archetype.description,
        backstory: this.generateBackstory(genre, archetypeName),
        personalityTraits: {
          primary: this.selectTraits([], archetype.traits),
          secondary: this.selectTraits([], TRAIT_CATEGORIES.positive),
          hidden: ['Secret agenda', 'Personal struggle']
        },
        motivation: {
          external: `Help/hinder the protagonist`,
          internal: 'Personal growth',
          fear: 'Loss',
          desire: ' belonging/redemption'
        },
        visualAttributes: this.generateVisualAttributes(genre, archetypeName),
        relationships: [],
        arc: this.generateArc(archetypeName, genre),
        dialogueStyle: archetypeName === 'trickster' ? 'Witty and sarcastic' : 'Supportive and wise',
        keyQuotes: ['I believe in you', 'Be careful', 'Together we are stronger'],
        scenes: ['Helper moments', 'Key revelations', 'Emotional beats'],
        colorPalette: archetype.colorPalette,
        importanceScore: 70 - (index * 10)
      });
    });
    
    return characters;
  }

  /**
   * Generate relationships between all characters
   */
  private generateAllRelationships(
    characters: GeneratedCharacter[],
    relationshipMap: Map<string, CharacterRelationship[]>
  ): void {
    for (let i = 0; i < characters.length; i++) {
      const relationships: CharacterRelationship[] = [];
      
      for (let j = 0; j < characters.length; j++) {
        if (i === j) continue;
        
        const relation = this.determineRelationship(characters[i], characters[j]);
        relationships.push(relation);
      }
      
      relationshipMap.set(characters[i].characterId, relationships);
      characters[i].relationships = relationships;
    }
  }

  /**
   * Determine relationship between two characters
   */
  private determineRelationship(charA: GeneratedCharacter, charB: GeneratedCharacter): CharacterRelationship {
    // Protagonist relationships
    if (charA.archetype === 'protagonist') {
      if (charB.archetype === 'antagonist') {
        return {
          relatedCharacterId: charB.characterId,
          relationshipType: 'Enemy',
          description: 'Primary conflict with deep opposition',
          dynamic: 'Constant battle of wills',
          tensionLevel: 'high'
        };
      }
      if (charB.archetype === 'mentor') {
        return {
          relatedCharacterId: charB.characterId,
          relationshipType: 'Guide-Student',
          description: 'Teacher-student bond with mutual respect',
          dynamic: 'Guidance and support',
          tensionLevel: 'low'
        };
      }
      if (charB.archetype === 'sidekick') {
        return {
          relatedCharacterId: charB.characterId,
          relationshipType: 'Loyal Companion',
          description: 'Unwavering support through trials',
          dynamic: 'Teamwork and friendship',
          tensionLevel: 'low'
        };
      }
    }
    
    // Antagonist relationships
    if (charA.archetype === 'antagonist') {
      if (charB.archetype === 'protagonist') {
        return {
          relatedCharacterId: charB.characterId,
          relationshipType: 'Enemy',
          description: 'Primary conflict with deep opposition',
          dynamic: 'Battle of wills',
          tensionLevel: 'high'
        };
      }
    }
    
    // Default relationships
    return {
      relatedCharacterId: charB.characterId,
      relationshipType: 'Ally',
      description: 'Working toward common goals',
      dynamic: 'Cooperation',
      tensionLevel: 'medium'
    };
  }

  /**
   * Generate character dynamics summary
   */
  private generateCharacterDynamics(characters: GeneratedCharacter[]): string {
    const dynamics = [
      'Complex web of alliances and conflicts',
      'Intertwined fates drive the narrative',
      'Trust and betrayal shape the story',
      'Personal growth through relationships'
    ];
    
    return dynamics[Math.floor(Math.random() * dynamics.length)];
  }

  /**
   * Generate character name
   */
  private generateName(genre: string, archetype: string): string {
    const firstNames = {
      cyberpunk: ['Kai', 'Nova', 'Raven', 'Jax', 'Vex', 'Cipher'],
      fantasy: ['Aldric', 'Elara', 'Thorne', 'Lyra', 'Rowan', 'Isolde'],
      sci_fi: ['Zara', 'Orion', 'Nova', 'Kael', 'Rhea', 'Xander'],
      horror: ['Elena', 'Marcus', 'Lilith', 'Damian', 'Vera', 'Cole'],
      modern: ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley']
    };
    
    const surnames = {
      cyberpunk: ['Neon', 'Zero', 'Ghost', 'Echo', 'Viper', 'Chrome'],
      fantasy: ['Blackwood', 'Stormwind', 'Darkhollow', 'Ironheart', 'Silvermoon'],
      sci_fi: ['Stellar', 'Void', 'Cosmos', 'Nova', 'Quantum', 'Solar'],
      horror: ['Blackwood', 'Mortis', 'Grimm', 'Nightshade', 'Crimson'],
      modern: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis']
    };
    
    const firstList = firstNames[genre as keyof typeof firstNames] || firstNames.modern;
    const surnameList = surnames[genre as keyof typeof surnames] || surnames.modern;
    
    return `${firstList[Math.floor(Math.random() * firstList.length)]} ${surnameList[Math.floor(Math.random() * surnameList.length)]}`;
  }

  /**
   * Generate character backstory
   */
  private generateBackstory(genre: string, archetype: string): string {
    const backstories: Record<string, string[]> = {
      protagonist: [
        'Orphaned young, raised by mentors who saw potential',
        'Former soldier seeking redemption for past failures',
        'Hidden heir discovering their true destiny',
        'Commoner chosen for an impossible task'
      ],
      antagonist: [
        'Once noble, corrupted by power and betrayal',
        'Lost everything to the system they now oppose',
        'Believes their cruel methods serve a greater good',
        'Former hero turned bitter by past trauma'
      ],
      default: [
        'Brought together by fate and circumstance',
        'Expert in their field with mysterious past',
        'Seeking purpose after major life change',
        'Guardian of ancient knowledge or power'
      ]
    };
    
    const stories = backstories[archetype as keyof typeof backstories] || backstories.default;
    return stories[Math.floor(Math.random() * stories.length)];
  }

  /**
   * Generate visual attributes
   */
  private generateVisualAttributes(genre: string, archetype: string): VisualAttributes {
    const attributes = {
      cyberpunk: {
        ageRange: '20-35',
        build: 'Athletic with cybernetic enhancements',
        height: 'Average to tall',
        hair: 'Dyed vibrant colors, often shaved on one side',
        eyes: 'Often have cybernetic implants with glow effects',
        clothing: ['Leather jacket', 'Neon accents', 'Tech accessories', 'Protective gear'],
        distinguishingFeatures: ['Cybernetic limb', 'Neural port', 'Tattoos with tech motifs'],
        colorPalette: ['#00ff9d', '#ff00ff', '#00bfff', '#1a1a2e']
      },
      fantasy: {
        ageRange: '25-40',
        build: 'Warrior build or ethereal figure',
        height: 'Tall and regal',
        hair: 'Long and flowing or mysterious short',
        eyes: 'Enchanted glow or piercing stare',
        clothing: ['Tunic', 'Cape', 'Armor', 'Robes withrunestones'],
        distinguishingFeatures: ['Scar from battle', 'Magical birthmark', 'Ancient weapon'],
        colorPalette: ['#ffd700', '#8b4513', '#4b0082', '#228b22']
      },
      sci_fi: {
        ageRange: '25-45',
        build: 'Fit from zero-g training',
        height: 'Variable',
        hair: 'Practical, often short or slicked back',
        eyes: 'Alert, scanning',
        clothing: ['Flight suit', 'Uniform', 'Utility vest', 'Space-rated boots'],
        distinguishingFeatures: ['Zero-g adaptation', 'Radiation scar', 'Mission patches'],
        colorPalette: ['#c0c0c0', '#00bfff', '#1a1a2e', '#e0e0e0']
      },
      horror: {
        ageRange: '30-50',
        build: ' gaunt or imposing',
        height: 'Average',
        hair: 'Disheveled or unnaturally styled',
        eyes: 'Unsettling stare',
        clothing: ['Period-appropriate', 'Tattered', 'Dark colors'],
        distinguishingFeatures: ['Strange scar', 'Unnatural movement', 'Unusual mark'],
        colorPalette: ['#000000', '#8b0000', '#2f4f4f', '#4a0e0e']
      },
      modern: {
        ageRange: '20-40',
        build: 'Contemporary fitness level',
        height: 'Average',
        hair: 'Current trends',
        eyes: 'Expressive',
        clothing: ['Casual', 'Professional', 'Trendy'],
        distinguishingFeatures: ['Fashion accessory', 'Unique style', 'Personal trait'],
        colorPalette: ['#ffffff', '#808080', '#2c3e50', '#ecf0f1']
      }
    };
    
    return attributes[genre as keyof typeof attributes] || attributes.modern;
  }

  /**
   * Generate character arc
   */
  private generateArc(archetype: string, genre: string): CharacterArc {
    return {
      startingState: archetype === 'protagonist' ? 'Ordinary life' : 'Position of power',
      keyIncitingIncidents: ['The call to adventure', 'Disruption of normalcy', 'First major challenge'],
      midpointReversal: 'Everything changes - ally becomes enemy or vice versa',
      climaxPoint: 'Face the ultimate test with everything at stake',
      endingState: archetype === 'protagonist' ? 'Transformed hero' : 'Defeated or redeemed',
      transformation: archetype === 'protagonist' ? 'Growth through adversity' : 'Revealed true nature'
    };
  }

  /**
   * Select random traits from pool
   */
  private selectTraits(required: string[], pool: string[]): string[] {
    const selected = [...required];
    const remaining = pool.filter(t => !selected.includes(t));
    
    while (selected.length < 3 && remaining.length > 0) {
      const index = Math.floor(Math.random() * remaining.length);
      selected.push(remaining[index]);
      remaining.splice(index, 1);
    }
    
    return selected;
  }

  /**
   * Get genre-specific goal
   */
  private getGenreGoal(genre: string): string {
    const goals: Record<string, string> = {
      cyberpunk: 'the corrupted system',
      fantasy: 'the kingdom',
      sci_fi: 'humanity',
      horror: 'survival',
      modern: 'their loved ones'
    };
    return goals[genre] || 'their goal';
  }

  /**
   * Get archetype options
   */
  getArchetypes(): { value: string; label: string; description: string }[] {
    return [
      { value: 'protagonist', label: 'Protagonist', description: 'Main hero driving the story' },
      { value: 'antagonist', label: 'Antagonist', description: 'Primary opposing force' },
      { value: 'mentor', label: 'Mentor', description: 'Wise guide for the hero' },
      { value: 'sidekick', label: 'Sidekick', description: 'Loyal companion' },
      { value: 'loveInterest', label: 'Love Interest', description: 'Romantic connection' },
      { value: 'rival', label: 'Rival', description: 'Competitive opponent' },
      { value: 'trickster', label: 'Trickster', description: 'Chaotic wild card' },
      { value: 'guardian', label: 'Guardian', description: 'Protector figure' }
    ];
  }

  /**
   * Get trait categories
   */
  getTraitCategories(): Record<string, string[]> {
    return TRAIT_CATEGORIES;
  }
}

export default CharacterGenerator;

