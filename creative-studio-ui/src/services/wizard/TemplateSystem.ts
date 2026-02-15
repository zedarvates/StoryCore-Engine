/**
 * TemplateSystem Service
 * 
 * Manages project templates for quick starts in the Project Setup Wizard.
 * Provides built-in templates and supports custom template creation.
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.5, 10.6, 10.7
 */

import type {
  WizardState,
} from '../../types/wizard';
import { logger } from '@/utils/logger';

// ============================================================================
// Template Types
// ============================================================================

export type TemplateCategory = 'short-film' | 'feature' | 'series' | 'documentary' | 'custom';

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  data: Partial<WizardState>;
}

export interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  createdAt: Date;
  isBuiltIn: boolean;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY_PREFIX = 'storycore_wizard_template_';
const CUSTOM_TEMPLATES_KEY = 'storycore_wizard_custom_templates';

// ============================================================================
// Built-in Templates
// ============================================================================

const BUILT_IN_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'action-short-film',
    name: 'Action Short Film',
    description: '15-minute action-packed short film with realistic style and 3-act structure',
    category: 'short-film',
    data: {
      projectType: {
        type: 'court-metrage',
        durationMinutes: 15,
        durationRange: { min: 1, max: 30 },
      },
      genreStyle: {
        genres: ['action', 'thriller'],
        visualStyle: 'realistic',
        colorPalette: {
          primary: '#1a1a1a',
          secondary: '#ff4500',
          accent: '#ffd700',
          preset: 'high-contrast',
        },
        mood: ['tense', 'energetic', 'dark'],
      },
      worldBuilding: {
        timePeriod: 'Contemporary',
        primaryLocation: 'Urban City',
        universeType: 'realistic',
        worldRules: 'Modern urban environment with realistic physics and consequences',
        locations: [
          {
            id: 'loc-1',
            name: 'Downtown Street',
            description: 'Busy city street with tall buildings and heavy traffic',
            visualCharacteristics: 'Concrete, glass, neon lights, crowded',
            mood: 'tense',
          },
          {
            id: 'loc-2',
            name: 'Abandoned Warehouse',
            description: 'Dark industrial space with metal structures',
            visualCharacteristics: 'Rusty metal, dim lighting, shadows',
            mood: 'dark',
          },
        ],
        culturalContext: 'Modern urban society',
        technologyLevel: 8,
      },
      characters: [
        {
          id: 'char-1',
          name: 'Alex Chen',
          role: 'protagonist',
          physicalAppearance: 'Athletic build, 30s, determined expression',
          personalityTraits: ['brave', 'resourceful', 'determined'],
          characterArc: 'Overcomes fear to save innocent lives',
          visualReferences: [],
          dialogueStyle: 'terse',
          relationships: [],
        },
      ],
      storyStructure: {
        premise: 'A former special forces operative must stop a terrorist attack in the heart of the city before time runs out.',
        logline: 'One hero. Fifteen minutes. The city\'s only hope.',
        actStructure: '3-act',
        plotPoints: [
          {
            id: 'pp-1',
            name: 'Inciting Incident',
            description: 'Discovers the bomb threat',
            timingMinutes: 2,
            actNumber: 1,
          },
          {
            id: 'pp-2',
            name: 'Midpoint',
            description: 'Confronts the antagonist',
            timingMinutes: 7,
            actNumber: 2,
          },
          {
            id: 'pp-3',
            name: 'Climax',
            description: 'Defuses the bomb with seconds to spare',
            timingMinutes: 13,
            actNumber: 3,
          },
        ],
        themes: ['heroism', 'sacrifice', 'time pressure'],
        motifs: ['ticking clock', 'urban decay'],
        narrativePerspective: 'third-person-limited',
      },
      script: {
        format: 'scene-descriptions',
        content: '',
      },
      scenes: [],
      shots: [],
    },
  },
  {
    id: 'drama-feature',
    name: 'Drama Feature',
    description: '90-minute dramatic feature film with cinematic style and 5-act structure',
    category: 'feature',
    data: {
      projectType: {
        type: 'long-metrage-standard',
        durationMinutes: 90,
        durationRange: { min: 60, max: 120 },
      },
      genreStyle: {
        genres: ['drama'],
        visualStyle: 'realistic',
        colorPalette: {
          primary: '#2c3e50',
          secondary: '#e74c3c',
          accent: '#ecf0f1',
          preset: 'muted-tones',
        },
        mood: ['serious', 'melancholic', 'hopeful'],
      },
      worldBuilding: {
        timePeriod: 'Contemporary',
        primaryLocation: 'Small Town',
        universeType: 'realistic',
        worldRules: 'Realistic contemporary setting with focus on human relationships',
        locations: [
          {
            id: 'loc-1',
            name: 'Family Home',
            description: 'Modest suburban house with lived-in feel',
            visualCharacteristics: 'Warm lighting, family photos, comfortable furniture',
            mood: 'calm',
          },
        ],
        culturalContext: 'Middle-class American family dynamics',
        technologyLevel: 7,
      },
      characters: [
        {
          id: 'char-1',
          name: 'Sarah Mitchell',
          role: 'protagonist',
          physicalAppearance: 'Mid-40s, tired but resilient',
          personalityTraits: ['compassionate', 'conflicted', 'strong-willed'],
          characterArc: 'Learns to forgive and move forward',
          visualReferences: [],
          dialogueStyle: 'casual',
          relationships: [],
        },
      ],
      storyStructure: {
        premise: 'A mother struggles to reconnect with her estranged daughter while dealing with her own past mistakes and seeking redemption.',
        logline: 'Sometimes the hardest journey is the one back home.',
        actStructure: '5-act',
        plotPoints: [
          {
            id: 'pp-1',
            name: 'Setup',
            description: 'Introduction to broken family dynamics',
            timingMinutes: 10,
            actNumber: 1,
          },
          {
            id: 'pp-2',
            name: 'Rising Action',
            description: 'Attempts at reconciliation fail',
            timingMinutes: 30,
            actNumber: 2,
          },
          {
            id: 'pp-3',
            name: 'Midpoint',
            description: 'Revelation of past trauma',
            timingMinutes: 45,
            actNumber: 3,
          },
          {
            id: 'pp-4',
            name: 'Falling Action',
            description: 'Confrontation and truth',
            timingMinutes: 70,
            actNumber: 4,
          },
          {
            id: 'pp-5',
            name: 'Resolution',
            description: 'Forgiveness and new beginning',
            timingMinutes: 85,
            actNumber: 5,
          },
        ],
        themes: ['family', 'forgiveness', 'redemption'],
        motifs: ['broken photographs', 'empty chairs'],
        narrativePerspective: 'third-person-omniscient',
      },
      script: {
        format: 'scene-descriptions',
        content: '',
      },
      scenes: [],
      shots: [],
    },
  },
  {
    id: 'sci-fi-series-episode',
    name: 'Sci-Fi Series Episode',
    description: '45-minute sci-fi episode with futuristic style and hero\'s journey structure',
    category: 'series',
    data: {
      projectType: {
        type: 'special-tv',
        durationMinutes: 45,
        durationRange: { min: 45, max: 90 },
      },
      genreStyle: {
        genres: ['sci-fi', 'adventure'],
        visualStyle: 'futuristic',
        colorPalette: {
          primary: '#0a0e27',
          secondary: '#00d4ff',
          accent: '#ff00ff',
          preset: 'neon-future',
        },
        mood: ['mysterious', 'tense', 'hopeful'],
      },
      worldBuilding: {
        timePeriod: '2247 CE',
        primaryLocation: 'Space Station Nexus',
        universeType: 'sci-fi',
        worldRules: 'Advanced technology, faster-than-light travel, alien species coexist',
        locations: [
          {
            id: 'loc-1',
            name: 'Command Bridge',
            description: 'High-tech control center with holographic displays',
            visualCharacteristics: 'Sleek surfaces, blue lighting, floating interfaces',
            mood: 'tense',
          },
          {
            id: 'loc-2',
            name: 'Alien Marketplace',
            description: 'Bustling trading hub with diverse species',
            visualCharacteristics: 'Colorful, chaotic, exotic architecture',
            mood: 'energetic',
          },
        ],
        culturalContext: 'Post-Earth unified human government, galactic federation',
        technologyLevel: 10,
      },
      characters: [
        {
          id: 'char-1',
          name: 'Commander Zara Nova',
          role: 'protagonist',
          physicalAppearance: 'Tall, athletic, cybernetic eye implant',
          personalityTraits: ['strategic', 'curious', 'diplomatic'],
          characterArc: 'Discovers hidden truth about her past',
          visualReferences: [],
          dialogueStyle: 'formal',
          relationships: [],
        },
      ],
      storyStructure: {
        premise: 'A space station commander uncovers a conspiracy that threatens the fragile peace between human and alien civilizations.',
        logline: 'In space, trust is the rarest commodity.',
        actStructure: 'hero-journey',
        plotPoints: [
          {
            id: 'pp-1',
            name: 'Call to Adventure',
            description: 'Strange signal detected from forbidden sector',
            timingMinutes: 5,
            actNumber: 1,
          },
          {
            id: 'pp-2',
            name: 'Crossing the Threshold',
            description: 'Enters the forbidden zone',
            timingMinutes: 15,
            actNumber: 1,
          },
          {
            id: 'pp-3',
            name: 'Ordeal',
            description: 'Confronts the conspiracy',
            timingMinutes: 30,
            actNumber: 2,
          },
          {
            id: 'pp-4',
            name: 'Return with Elixir',
            description: 'Exposes the truth and saves the alliance',
            timingMinutes: 42,
            actNumber: 3,
          },
        ],
        themes: ['trust', 'identity', 'unity'],
        motifs: ['stars', 'reflections', 'bridges'],
        narrativePerspective: 'third-person-limited',
      },
      script: {
        format: 'scene-descriptions',
        content: '',
      },
      scenes: [],
      shots: [],
    },
  },
  {
    id: 'documentary-short',
    name: 'Documentary Short',
    description: '20-minute documentary with realistic style and narrative structure',
    category: 'documentary',
    data: {
      projectType: {
        type: 'court-metrage',
        durationMinutes: 20,
        durationRange: { min: 1, max: 30 },
      },
      genreStyle: {
        genres: ['documentary'],
        visualStyle: 'realistic',
        colorPalette: {
          primary: '#3e4a59',
          secondary: '#8b9dc3',
          accent: '#dfe3ee',
          preset: 'natural',
        },
        mood: ['serious', 'hopeful', 'calm'],
      },
      worldBuilding: {
        timePeriod: 'Contemporary',
        primaryLocation: 'Various Real Locations',
        universeType: 'realistic',
        worldRules: 'Real-world documentary footage and interviews',
        locations: [
          {
            id: 'loc-1',
            name: 'Interview Studio',
            description: 'Simple backdrop with professional lighting',
            visualCharacteristics: 'Neutral background, soft lighting, intimate',
            mood: 'calm',
          },
        ],
        culturalContext: 'Contemporary society',
        technologyLevel: 7,
      },
      characters: [
        {
          id: 'char-1',
          name: 'Subject 1',
          role: 'protagonist',
          physicalAppearance: 'To be determined by actual subject',
          personalityTraits: ['authentic', 'articulate'],
          characterArc: 'Shares personal journey',
          visualReferences: [],
          dialogueStyle: 'casual',
          relationships: [],
        },
      ],
      storyStructure: {
        premise: 'An exploration of a compelling real-world topic through interviews and observational footage.',
        logline: 'Real stories. Real people. Real impact.',
        actStructure: '3-act',
        plotPoints: [
          {
            id: 'pp-1',
            name: 'Introduction',
            description: 'Establish the topic and stakes',
            timingMinutes: 3,
            actNumber: 1,
          },
          {
            id: 'pp-2',
            name: 'Development',
            description: 'Deep dive into subject matter',
            timingMinutes: 10,
            actNumber: 2,
          },
          {
            id: 'pp-3',
            name: 'Conclusion',
            description: 'Resolution and call to action',
            timingMinutes: 18,
            actNumber: 3,
          },
        ],
        themes: ['truth', 'human experience'],
        motifs: ['interviews', 'b-roll'],
        narrativePerspective: 'third-person-omniscient',
      },
      script: {
        format: 'scene-descriptions',
        content: '',
      },
      scenes: [],
      shots: [],
    },
  },
  {
    id: 'fantasy-feature',
    name: 'Fantasy Feature',
    description: '120-minute fantasy epic with stylized visuals and hero\'s journey structure',
    category: 'feature',
    data: {
      projectType: {
        type: 'long-metrage-premium',
        durationMinutes: 120,
        durationRange: { min: 120, max: 180 },
      },
      genreStyle: {
        genres: ['fantasy', 'adventure'],
        visualStyle: 'stylized',
        colorPalette: {
          primary: '#2d1b4e',
          secondary: '#8b4789',
          accent: '#ffd700',
          preset: 'magical',
        },
        mood: ['mysterious', 'hopeful', 'energetic'],
      },
      worldBuilding: {
        timePeriod: 'Medieval Fantasy Era',
        primaryLocation: 'Kingdom of Eldoria',
        universeType: 'fantasy',
        worldRules: 'Magic exists, mythical creatures roam, ancient prophecies guide fate',
        locations: [
          {
            id: 'loc-1',
            name: 'Crystal Palace',
            description: 'Majestic castle made of enchanted crystal',
            visualCharacteristics: 'Glowing crystals, ethereal light, grand architecture',
            mood: 'mysterious',
          },
          {
            id: 'loc-2',
            name: 'Darkwood Forest',
            description: 'Ancient forest filled with magic and danger',
            visualCharacteristics: 'Twisted trees, glowing mushrooms, mist',
            mood: 'dark',
          },
        ],
        culturalContext: 'Medieval-inspired fantasy kingdom with magic users',
        technologyLevel: 2,
      },
      characters: [
        {
          id: 'char-1',
          name: 'Aria Lightbringer',
          role: 'protagonist',
          physicalAppearance: 'Young woman with silver hair and glowing eyes',
          personalityTraits: ['brave', 'curious', 'compassionate'],
          characterArc: 'Discovers her destiny as the prophesied hero',
          visualReferences: [],
          dialogueStyle: 'poetic',
          relationships: [],
        },
      ],
      storyStructure: {
        premise: 'A young mage must master ancient magic and unite warring kingdoms to defeat an awakening darkness that threatens to consume the world.',
        logline: 'When darkness rises, only light can save the realm.',
        actStructure: 'hero-journey',
        plotPoints: [
          {
            id: 'pp-1',
            name: 'Ordinary World',
            description: 'Life in the village before the call',
            timingMinutes: 10,
            actNumber: 1,
          },
          {
            id: 'pp-2',
            name: 'Meeting the Mentor',
            description: 'Discovers magical heritage',
            timingMinutes: 30,
            actNumber: 1,
          },
          {
            id: 'pp-3',
            name: 'Ordeal',
            description: 'Faces the dark lord',
            timingMinutes: 90,
            actNumber: 2,
          },
          {
            id: 'pp-4',
            name: 'Return with Elixir',
            description: 'Restores peace to the realm',
            timingMinutes: 115,
            actNumber: 3,
          },
        ],
        themes: ['destiny', 'courage', 'unity'],
        motifs: ['light vs darkness', 'ancient prophecy'],
        narrativePerspective: 'third-person-limited',
      },
      script: {
        format: 'scene-descriptions',
        content: '',
      },
      scenes: [],
      shots: [],
    },
  },
  {
    id: 'horror-short',
    name: 'Horror Short',
    description: '10-minute horror short with noir style and 3-act structure',
    category: 'short-film',
    data: {
      projectType: {
        type: 'court-metrage',
        durationMinutes: 10,
        durationRange: { min: 1, max: 30 },
      },
      genreStyle: {
        genres: ['horror', 'thriller'],
        visualStyle: 'noir',
        colorPalette: {
          primary: '#0d0d0d',
          secondary: '#8b0000',
          accent: '#ffffff',
          preset: 'high-contrast-dark',
        },
        mood: ['dark', 'tense', 'mysterious'],
      },
      worldBuilding: {
        timePeriod: 'Contemporary',
        primaryLocation: 'Isolated Location',
        universeType: 'realistic',
        worldRules: 'Realistic world with supernatural elements',
        locations: [
          {
            id: 'loc-1',
            name: 'Abandoned House',
            description: 'Decrepit Victorian mansion on a hill',
            visualCharacteristics: 'Shadows, creaking floors, peeling wallpaper',
            mood: 'dark',
          },
        ],
        culturalContext: 'Modern setting with gothic atmosphere',
        technologyLevel: 7,
      },
      characters: [
        {
          id: 'char-1',
          name: 'Emma',
          role: 'protagonist',
          physicalAppearance: 'Young woman, 20s, vulnerable but determined',
          personalityTraits: ['curious', 'brave', 'isolated'],
          characterArc: 'Confronts her fears',
          visualReferences: [],
          dialogueStyle: 'terse',
          relationships: [],
        },
      ],
      storyStructure: {
        premise: 'A woman investigating her family\'s dark past discovers that some secrets are better left buried.',
        logline: 'The past never stays dead.',
        actStructure: '3-act',
        plotPoints: [
          {
            id: 'pp-1',
            name: 'Setup',
            description: 'Arrives at the abandoned house',
            timingMinutes: 2,
            actNumber: 1,
          },
          {
            id: 'pp-2',
            name: 'Escalation',
            description: 'Discovers disturbing evidence',
            timingMinutes: 5,
            actNumber: 2,
          },
          {
            id: 'pp-3',
            name: 'Climax',
            description: 'Confronts the horror',
            timingMinutes: 9,
            actNumber: 3,
          },
        ],
        themes: ['fear', 'family secrets', 'isolation'],
        motifs: ['shadows', 'mirrors', 'whispers'],
        narrativePerspective: 'third-person-limited',
      },
      script: {
        format: 'scene-descriptions',
        content: '',
      },
      scenes: [],
      shots: [],
    },
  },
];

// ============================================================================
// TemplateSystem Class
// ============================================================================

export class TemplateSystem {
  /**
   * Load a template by ID
   * Supports both built-in and custom templates
   */
  async loadTemplate(templateId: string): Promise<ProjectTemplate> {
    // Check built-in templates first
    const builtInTemplate = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);
    if (builtInTemplate) {
      return builtInTemplate;
    }

    // Check custom templates in localStorage
    const customTemplates = this.getCustomTemplates();
    const customTemplate = customTemplates.find((t) => t.id === templateId);
    
    if (customTemplate) {
      return customTemplate;
    }

    throw new Error(`Template not found: ${templateId}`);
  }

  /**
   * Save a custom template
   * Stores template in localStorage with metadata
   */
  async saveTemplate(
    name: string,
    description: string,
    data: Partial<WizardState>
  ): Promise<string> {
    const templateId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const template: ProjectTemplate = {
      id: templateId,
      name,
      description,
      category: 'custom',
      data,
    };

    // Get existing custom templates
    const customTemplates = this.getCustomTemplates();
    
    // Add new template
    customTemplates.push(template);
    
    // Save to localStorage
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(customTemplates));
    
    return templateId;
  }

  /**
   * List all available templates (built-in + custom)
   * Returns metadata only for efficient listing
   */
  async listTemplates(): Promise<TemplateMetadata[]> {
    const builtInMetadata: TemplateMetadata[] = BUILT_IN_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      createdAt: new Date('2024-01-01'), // Fixed date for built-in templates
      isBuiltIn: true,
    }));

    const customTemplates = this.getCustomTemplates();
    const customMetadata: TemplateMetadata[] = customTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      createdAt: new Date(), // Use current date for custom templates
      isBuiltIn: false,
    }));

    return [...builtInMetadata, ...customMetadata];
  }

  /**
   * Delete a custom template
   * Built-in templates cannot be deleted
   */
  async deleteTemplate(templateId: string): Promise<void> {
    // Check if it's a built-in template
    const isBuiltIn = BUILT_IN_TEMPLATES.some((t) => t.id === templateId);
    if (isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    // Get custom templates
    const customTemplates = this.getCustomTemplates();
    
    // Filter out the template to delete
    const updatedTemplates = customTemplates.filter((t) => t.id !== templateId);
    
    if (updatedTemplates.length === customTemplates.length) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Save updated list
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(updatedTemplates));
  }

  /**
   * Get all custom templates from localStorage
   * Private helper method
   */
  private getCustomTemplates(): ProjectTemplate[] {
    try {
      const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored) as ProjectTemplate[];
    } catch (error) {
      logger.error('[TemplateSystem] Error loading custom templates:', error);
      return [];
    }
  }

  /**
   * Clear all custom templates
   * Useful for testing and reset functionality
   */
  async clearCustomTemplates(): Promise<void> {
    localStorage.removeItem(CUSTOM_TEMPLATES_KEY);
  }
}

// Export singleton instance
export const templateSystem = new TemplateSystem();
