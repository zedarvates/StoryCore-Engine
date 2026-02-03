/**
 * World Config Generator for StoryCore LLM Assistant
 * Generates world building configurations from parsed prompts
 */

import { LLMProviderManager } from './provider-manager';

// World type configurations - using any type to avoid strict type checking issues
export const WORLD_TYPES: Record<string, any> = {
  cyberpunk: {
    name: 'Cyberpunk',
    visualStyle: 'Neon-drenched urban landscapes with high-tech/low-life aesthetic',
    colorPalette: ['#00ff9d', '#ff00ff', '#00bfff', '#1a1a2e', '#16213e'],
    architecture: ['Glass skyscrapers', 'Neon signs', 'Illegal marketplaces'],
    technology: ['Advanced AI', 'Cybernetic enhancements', 'Holographic displays'],
    atmosphere: ['Rain-soaked streets', 'Perpetual night', 'Overcrowded districts'],
    socialStructure: ['Corporate oligarchy', 'Underground networks', 'Augmented elite'],
    era: '2084-2150'
  },
  fantasy: {
    name: 'Fantasy',
    visualStyle: 'Magical realms with mystical creatures and ancient powers',
    colorPalette: ['#ffd700', '#8b4513', '#4b0082', '#228b22', '#4169e1'],
    architecture: ['Castles', 'Mystic towers', 'Elven cities'],
    magic: ['Elemental magic', 'Arcane arts', 'Divine intervention'],
    atmosphere: ['Enchanted forests', 'Mystic portals', 'Ancient ruins'],
    socialStructure: ['Monarchies', 'Guilds', 'Mage councils'],
    era: 'Medieval-inspired'
  },
  sci_fi: {
    name: 'Science Fiction',
    visualStyle: 'Futuristic technology with exploration themes',
    colorPalette: ['#c0c0c0', '#00bfff', '#1a1a2e', '#e0e0e0'],
    architecture: ['Space stations', 'Domed cities', 'Orbital colonies'],
    technology: ['FTL travel', 'Artificial gravity', 'Advanced robotics'],
    atmosphere: ['Sterile corridors', 'Observation decks', 'Engine rooms'],
    socialStructure: ['Federations', 'Corporate interests', 'AI governance'],
    era: '2200-2500+'
  },
  horror: {
    name: 'Horror',
    visualStyle: 'Atmospheric dread with terrifying elements',
    colorPalette: ['#000000', '#8b0000', '#2f4f4f', '#4a0e0e'],
    architecture: ['Abandoned asylums', 'Haunted mansions', 'Ancient crypts'],
    threats: ['Supernatural entities', 'Psychological terror', 'Cosmic horror'],
    atmosphere: ['Constant darkness', 'Isolated locations', 'Creeping dread'],
    socialStructure: ['Isolated groups', 'Survivor communities', 'Cult organizations'],
    era: 'Present or historical'
  },
  modern: {
    name: 'Modern/Contemporary',
    visualStyle: 'Realistic settings with current aesthetics',
    colorPalette: ['#ffffff', '#808080', '#2c3e50', '#ecf0f1'],
    architecture: ['Suburban homes', 'Urban apartments', 'Corporate offices'],
    technology: ['Smart devices', 'Social media', 'Cloud computing'],
    atmosphere: ['Urban environments', 'Natural settings', 'Indoor spaces'],
    socialStructure: ['Families', 'Workplaces', 'Social groups'],
    era: '2020-Present'
  },
  historical: {
    name: 'Historical',
    visualStyle: 'Authentic period settings',
    colorPalette: ['#8b4513', '#daa520', '#cd853f', '#4a4a4a'],
    architecture: ['Victorian homes', 'Medieval castles', 'Colonial buildings'],
    atmosphere: ['Cobblestone streets', 'Marketplaces', 'Grand halls'],
    socialStructure: ['Nobility', 'Peasantry', 'Clergy', 'Military'],
    era: 'Pre-1900s'
  },
  post_apocalyptic: {
    name: 'Post-Apocalyptic',
    visualStyle: 'Devastated world with survival themes',
    colorPalette: ['#8b7355', '#696969', '#556b2f', '#8b0000'],
    architecture: ['Ruined cities', 'Fortified compounds', 'Underground bunkers'],
    environment: ['Desolate wastelands', 'Radioactive zones', 'Toxic landscapes'],
    atmosphere: ['Dust storms', 'Gray skies', 'Desperate survival'],
    socialStructure: ['Tribes', 'Warlords', 'Settlement communities'],
    era: 'Near-future after catastrophe'
  }
};

const DEFAULT_CONFIG = {
  aspectRatio: '16:9',
  targetDuration: 60,
  qualityTier: 'preview' as const
};

export interface WorldConfigGeneratorConfig {
  aspectRatio?: string;
  targetDuration?: number;
  qualityTier?: 'draft' | 'preview' | 'final';
}

export interface WorldConfigInput {
  projectTitle?: string;
  genre?: string;
  mood?: string[];
  setting?: string;
  timePeriod?: string;
  location?: string;
  videoType?: string;
  prompt?: string;
}

export interface CharacterConfig {
  characterId: string;
  name: string;
  role: string;
  description: string;
  visualAttributes?: { hair?: string; clothing?: string; distinguishingFeatures?: string[] };
  colorPalette?: string[];
  personalityTraits?: string[];
  relationships?: string[];
  arc?: string;
}

export interface WorldConfig {
  worldId: string;
  projectTitle: string;
  worldType: string;
  genre: string;
  setting: { timePeriod: string; location: string; era: string };
  visualIdentity: { style: string; colorPalette: string[]; lightingStyle: string; architecturalStyle: string[] };
  worldBuilding: {
    society: { government: string; economy: string; socialClasses: string[] };
    technology: { level: string; keyTechnologies: string[] };
    environment: { climate: string; geography: string[] };
  };
  characters: CharacterConfig[];
  themes: string[];
  moodTags: string[];
  firstImagePrompt: string;
  negativePrompt: string;
  totalDuration: number;
  totalShots: number;
  aspectRatio: string;
  qualityTier: string;
  createdAt: string;
}

export class WorldConfigGenerator {
  private config: WorldConfigGeneratorConfig;
  private providerManager: LLMProviderManager | null = null;

  constructor(config: WorldConfigGeneratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  initialize(providerManager: LLMProviderManager): void {
    this.providerManager = providerManager;
  }

  updateConfig(newConfig: Partial<WorldConfigGeneratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  generateWorldConfig(input: WorldConfigInput): WorldConfig {
    const worldType = this.determineWorldType(input.genre, input.prompt);
    const worldTemplate = WORLD_TYPES[worldType as keyof typeof WORLD_TYPES] || WORLD_TYPES.modern;
    const moodTags = input.mood || ['neutral'];
    
    const worldId = `world_${(input.projectTitle || 'untitled').toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    
    const shotsPerMinute = 3;
    const totalShots = Math.ceil((this.config.targetDuration || 60) / 60 * shotsPerMinute);
    
    return {
      worldId,
      projectTitle: input.projectTitle || 'Untitled Project',
      worldType,
      genre: input.genre || 'drama',
      setting: {
        timePeriod: input.timePeriod || worldTemplate.era,
        location: input.location || worldTemplate.architecture[0],
        era: worldTemplate.era
      },
      visualIdentity: {
        style: worldTemplate.visualStyle,
        colorPalette: worldTemplate.colorPalette,
        lightingStyle: this.getLightingStyle(moodTags),
        architecturalStyle: worldTemplate.architecture.slice(0, 3)
      },
      worldBuilding: {
        society: {
          government: this.getGovernmentType(worldType),
          economy: this.getEconomyType(worldType),
          socialClasses: worldTemplate.socialStructure?.slice(0, 3) || []
        },
        technology: {
          level: this.getTechLevel(worldType),
          keyTechnologies: worldTemplate.technology?.slice(0, 4) || []
        },
        environment: {
          climate: this.getClimateType(worldType),
          geography: worldTemplate.architecture?.slice(0, 2) || []
        }
      },
      characters: this.generateCharacterConfigs(),
      themes: this.extractThemes(input.prompt),
      moodTags,
      firstImagePrompt: this.buildFirstImagePrompt(input, worldTemplate),
      negativePrompt: 'low quality, blurry, distorted, ugly, bad anatomy, extra limbs',
      totalDuration: this.config.targetDuration || 60,
      totalShots,
      aspectRatio: this.config.aspectRatio || '16:9',
      qualityTier: this.config.qualityTier || 'preview',
      createdAt: new Date().toISOString() + 'Z'
    };
  }

  private determineWorldType(genre?: string, prompt?: string): string {
    const text = `${genre || ''} ${prompt || ''}`.toLowerCase();
    if (text.includes('cyberpunk')) return 'cyberpunk';
    if (text.includes('fantasy')) return 'fantasy';
    if (text.includes('sci-fi')) return 'sci_fi';
    if (text.includes('horror')) return 'horror';
    if (text.includes('apocalyptic')) return 'post_apocalyptic';
    if (text.includes('historical')) return 'historical';
    return genre || 'modern';
  }

  private buildFirstImagePrompt(input: WorldConfigInput, template: any): string {
    const parts = ['establishing shot'];
    if (template.visualStyle) parts.push(template.visualStyle.split(' ').slice(0, 4).join(' '));
    if (input.genre) parts.push(input.genre);
    if (input.timePeriod) parts.push(input.timePeriod);
    if (input.mood?.length) parts.push(input.mood[0]);
    parts.push('cinematic, 8k, highly detailed, masterpiece');
    return parts.join(', ');
  }

  private getLightingStyle(mood: string[]): string {
    if (mood.includes('dark') || mood.includes('tense')) return 'Low-key lighting with strong shadows';
    if (mood.includes('happy')) return 'High-key lighting with bright, even illumination';
    return 'Naturalistic lighting with subtle contrast';
  }

  private getGovernmentType(worldType: string): string {
    const governments: Record<string, string> = {
      cyberpunk: 'Corporate oligarchy', fantasy: 'Monarchy with advisory councils',
      sci_fi: 'Federation of planetary systems', horror: 'Fragmented/None',
      modern: 'Democratic republic', historical: 'Absolute monarchy', post_apocalyptic: 'Warlord rule'
    };
    return governments[worldType] || 'Unknown';
  }

  private getEconomyType(worldType: string): string {
    const economies: Record<string, string> = {
      cyberpunk: 'Credits and cyberware trade', fantasy: 'Gold and bartering',
      sci_fi: 'Universal basic resources', horror: 'Survival-based',
      modern: 'Capitalist market', historical: 'Agricultural feudalism', post_apocalyptic: 'Barter and scavenge'
    };
    return economies[worldType] || 'Mixed economy';
  }

  private getTechLevel(worldType: string): string {
    const levels: Record<string, string> = {
      cyberpunk: 'High-tech with widespread augmentation', fantasy: 'Pre-industrial with magic',
      sci_fi: 'Advanced spacefaring technology', horror: 'Modern with supernatural elements',
      modern: 'Current technology', historical: 'Pre-industrial revolution', post_apocalyptic: 'Salvaged mixed technology'
    };
    return levels[worldType] || 'Unknown';
  }

  private getClimateType(worldType: string): string {
    const climates: Record<string, string> = {
      cyberpunk: 'Urban pollution with acid rain', fantasy: 'Varied with magical weather',
      sci_fi: 'Controlled environments', horror: 'Perpetual gloom',
      modern: 'Varied contemporary', historical: 'Pre-industrial patterns', post_apocalyptic: 'Harsh post-catastrophe'
    };
    return climates[worldType] || 'Unknown';
  }

  private extractThemes(prompt?: string): string[] {
    const themes: string[] = [];
    const text = (prompt || '').toLowerCase();
    const themeKeywords: Record<string, string[]> = {
      'Redemption': ['redemption', 'second chance'], 'Identity': ['identity', 'self discovery'],
      'Power': ['power', 'control'], 'Love': ['love', 'romance'],
      'Survival': ['survival', 'survive'], 'Justice': ['justice', 'revenge'], 'Freedom': ['freedom', 'liberty']
    };
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (keywords.some(kw => text.includes(kw))) themes.push(theme);
    }
    return themes.length ? themes : ['Main conflict', 'Character journey'];
  }

  private generateCharacterConfigs(): CharacterConfig[] {
    return [
      { characterId: 'protagonist', name: 'Protagonist', role: 'Main character', description: 'Central figure driving the narrative' },
      { characterId: 'antagonist', name: 'Antagonist', role: 'Opposing force', description: 'Creates conflict for the protagonist' }
    ];
  }

  getWorldTypes(): { value: string; label: string; description: string }[] {
    return [
      { value: 'cyberpunk', label: 'Cyberpunk', description: 'Neon-drenched urban dystopia' },
      { value: 'fantasy', label: 'Fantasy', description: 'Magical realms with creatures' },
      { value: 'sci_fi', label: 'Science Fiction', description: 'Futuristic technology' },
      { value: 'horror', label: 'Horror', description: 'Atmospheric dread' },
      { value: 'modern', label: 'Modern', description: 'Realistic settings' },
      { value: 'historical', label: 'Historical', description: 'Period settings' },
      { value: 'post_apocalyptic', label: 'Post-Apocalyptic', description: 'Survival themes' }
    ];
  }

  getColorPalette(worldType: string): string[] {
    return WORLD_TYPES[worldType as keyof typeof WORLD_TYPES]?.colorPalette || WORLD_TYPES.modern.colorPalette;
  }
}

export default WorldConfigGenerator;

