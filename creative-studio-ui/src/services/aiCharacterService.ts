/**
 * AI Character Service
 * 
 * Provides character generation and management capabilities using the AI Character Engine.
 * Integrates with the existing service architecture and provides React hooks for UI integration.
 */

import { EventEmitter } from 'events';
import type { CharacterArchetype, CharacterRole, PersonalityTrait } from '../../src/ai_character_engine';

// Character data types
export interface CharacterProfile {
  id: string;
  name: string;
  archetype: CharacterArchetype;
  role: CharacterRole;
  age: number;
  gender: string;
  appearance: CharacterAppearance;
  personality: CharacterPersonality;
  backstory: CharacterBackstory;
  traits: CharacterTraits;
  createdAt: Date;
  updatedAt: Date;
}

export interface CharacterAppearance {
  height: number;
  build: string;
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  distinctiveFeatures: string[];
  clothingStyle: string;
  accessories: string[];
}

export interface CharacterPersonality {
  traits: Record<PersonalityTrait, number>;
  coreBeliefs: string[];
  motivations: string[];
  fears: string[];
  strengths: string[];
  weaknesses: string[];
  speechPatterns: string[];
}

export interface CharacterBackstory {
  origin: string;
  keyEvents: string[];
  relationships: Record<string, string>;
  skills: string[];
  secrets: string[];
  goals: string[];
  conflicts: string[];
}

export interface CharacterTraits {
  courage: number;
  intelligence: number;
  charisma: number;
  humility: number;
  ambition: number;
  loyalty: number;
  cunning: number;
  compassion: number;
}

export interface CharacterGenerationConfig {
  archetype: CharacterArchetype;
  role: CharacterRole;
  personalitySeeds?: Record<PersonalityTrait, number>;
  appearanceConstraints?: Partial<CharacterAppearance>;
  backstoryDepth?: number;
  qualityLevel?: 'preview' | 'standard' | 'high' | 'maximum';
}

export interface CharacterConsistency {
  generationId: string;
  appearanceSeed: number;
  personalitySeed: number;
  lastModified: Date;
  consistencyScore: number;
  variations: string[];
}

// Service events
export interface CharacterServiceEvents {
  'character:created': (character: CharacterProfile) => void;
  'character:updated': (character: CharacterProfile) => void;
  'character:deleted': (characterId: string) => void;
  'character:enhanced': (characterId: string, enhancementType: string) => void;
  'consistency:updated': (characterId: string, consistency: CharacterConsistency) => void;
}

class AICharacterService extends EventEmitter {
  private characters: Map<string, CharacterProfile> = new Map();
  private consistency: Map<string, CharacterConsistency> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize the character service
   */
  async initialize(): Promise<boolean> {
    try {
      // Load characters from storage
      await this.loadCharacters();
      this.isInitialized = true;
      console.log('AI Character Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI Character Service:', error);
      return false;
    }
  }

  /**
   * Generate a new character using AI
   */
  async generateCharacter(config: CharacterGenerationConfig): Promise<CharacterProfile> {
    if (!this.isInitialized) {
      throw new Error('Character service not initialized');
    }

    try {
      // Simulate AI character generation
      const character = await this.simulateCharacterGeneration(config);
      
      // Store character
      this.characters.set(character.id, character);
      this.consistency.set(character.id, character.traits as unknown as CharacterConsistency);
      
      // Save to storage
      await this.saveCharacters();
      
      // Emit event
      this.emit('character:created', character);
      
      return character;
    } catch (error) {
      console.error('Failed to generate character:', error);
      throw error;
    }
  }

  /**
   * Get a character by ID
   */
  getCharacter(id: string): CharacterProfile | undefined {
    return this.characters.get(id);
  }

  /**
   * Get all characters
   */
  getAllCharacters(): CharacterProfile[] {
    return Array.from(this.characters.values());
  }

  /**
   * Get characters by archetype
   */
  getCharactersByArchetype(archetype: CharacterArchetype): CharacterProfile[] {
    return this.getAllCharacters().filter(c => c.archetype === archetype);
  }

  /**
   * Get characters by role
   */
  getCharactersByRole(role: CharacterRole): CharacterProfile[] {
    return this.getAllCharacters().filter(c => c.role === role);
  }

  /**
   * Update character appearance
   */
  async updateCharacterAppearance(
    characterId: string, 
    appearance: Partial<CharacterAppearance>
  ): Promise<CharacterProfile> {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    character.appearance = { ...character.appearance, ...appearance };
    character.updatedAt = new Date();

    await this.saveCharacters();
    this.emit('character:updated', character);

    return character;
  }

  /**
   * Update character personality
   */
  async updateCharacterPersonality(
    characterId: string,
    personality: Partial<CharacterPersonality>
  ): Promise<CharacterProfile> {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    character.personality = { ...character.personality, ...personality };
    character.updatedAt = new Date();

    await this.saveCharacters();
    this.emit('character:updated', character);

    return character;
  }

  /**
   * Update character backstory
   */
  async updateCharacterBackstory(
    characterId: string,
    backstory: Partial<CharacterBackstory>
  ): Promise<CharacterProfile> {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    character.backstory = { ...character.backstory, ...backstory };
    character.updatedAt = new Date();

    await this.saveCharacters();
    this.emit('character:updated', character);

    return character;
  }

  /**
   * Enhance character using AI
   */
  async enhanceCharacter(
    characterId: string,
    enhancementType: 'visual' | 'personality' | 'backstory' | 'dialogue'
  ): Promise<CharacterProfile> {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    // Simulate AI enhancement
    const enhancedCharacter = await this.simulateCharacterEnhancement(character, enhancementType);
    
    this.characters.set(characterId, enhancedCharacter);
    await this.saveCharacters();
    
    this.emit('character:enhanced', characterId, enhancementType);
    this.emit('character:updated', enhancedCharacter);

    return enhancedCharacter;
  }

  /**
   * Delete character
   */
  async deleteCharacter(characterId: string): Promise<void> {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    this.characters.delete(characterId);
    this.consistency.delete(characterId);
    
    await this.saveCharacters();
    this.emit('character:deleted', characterId);
  }

  /**
   * Get character consistency score
   */
  getCharacterConsistency(characterId: string): CharacterConsistency | undefined {
    return this.consistency.get(characterId);
  }

  /**
   * Update character consistency
   */
  async updateCharacterConsistency(
    characterId: string,
    variation: string
  ): Promise<CharacterConsistency> {
    const consistency = this.consistency.get(characterId);
    if (!consistency) {
      throw new Error('Character consistency not found');
    }

    consistency.variations.push(variation);
    consistency.lastModified = new Date();
    consistency.consistencyScore = Math.max(0, consistency.consistencyScore - 0.05);

    this.emit('consistency:updated', characterId, consistency);
    return consistency;
  }

  /**
   * Analyze character for story integration
   */
  analyzeCharacterForStory(characterId: string): CharacterAnalysis {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    return {
      integrationScore: this.calculateIntegrationScore(character),
      storyFit: this.analyzeStoryFit(character),
      developmentOpportunities: this.identifyDevelopmentOpportunities(character),
      relationshipSuggestions: this.suggestRelationships(character),
      arcPotential: this.calculateArcPotential(character)
    };
  }

  /**
   * Generate character dialogue suggestions
   */
  generateDialogueSuggestions(characterId: string, context: string): DialogueSuggestion[] {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    return this.simulateDialogueGeneration(character, context);
  }

  /**
   * Export character data
   */
  exportCharacter(characterId: string, format: 'json' | 'xml' = 'json'): string {
    const character = this.characters.get(characterId);
    if (!character) {
      throw new Error('Character not found');
    }

    if (format === 'json') {
      return JSON.stringify(character, null, 2);
    } else {
      return this.convertToXML(character);
    }
  }

  /**
   * Import character data
   */
  async importCharacter(data: string, format: 'json' | 'xml' = 'json'): Promise<CharacterProfile> {
    let characterData: unknown;

    if (format === 'json') {
      characterData = JSON.parse(data);
    } else {
      characterData = this.parseXML(data);
    }

    const character: CharacterProfile = {
      ...characterData,
      createdAt: new Date(characterData.createdAt),
      updatedAt: new Date(characterData.updatedAt)
    };

    this.characters.set(character.id, character);
    await this.saveCharacters();
    
    this.emit('character:created', character);
    return character;
  }

  // Private methods

  private async simulateCharacterGeneration(config: CharacterGenerationConfig): Promise<CharacterProfile> {
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const id = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      name: this.generateCharacterName(config.archetype, config.role),
      archetype: config.archetype,
      role: config.role,
      age: this.generateAge(config.archetype),
      gender: this.generateGender(),
      appearance: this.generateAppearance(config.appearanceConstraints),
      personality: this.generatePersonality(config.personalitySeeds),
      backstory: this.generateBackstory(config.backstoryDepth || 3),
      traits: this.generateTraits(config.archetype),
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async simulateCharacterEnhancement(
    character: CharacterProfile, 
    enhancementType: string
  ): Promise<CharacterProfile> {
    // Simulate AI enhancement delay
    await new Promise(resolve => setTimeout(resolve, 500));

    switch (enhancementType) {
      case 'visual':
        character.appearance.distinctiveFeatures.push('Enhanced visual detail');
        break;
      case 'personality':
        character.personality.coreBeliefs.push('Enhanced personality trait');
        break;
      case 'backstory':
        character.backstory.keyEvents.push('Enhanced backstory element');
        break;
      case 'dialogue':
        character.personality.speechPatterns.push('Enhanced dialogue pattern');
        break;
    }

    character.updatedAt = new Date();
    return character;
  }

  private simulateDialogueGeneration(character: CharacterProfile, context: string): DialogueSuggestion[] {
    const suggestions: DialogueSuggestion[] = [];
    
    // Generate context-appropriate dialogue based on character traits
    const baseSuggestions = [
      `As a ${character.archetype}, I would say: "This situation requires careful consideration."`,
      `My ${character.personality.traits[PersonalityTrait.COURAGE]} nature tells me: "We must act now!"`,
      `Drawing from my ${character.backstory.origin} background: "I've seen this before, and here's what we should do."`
    ];

    return baseSuggestions.map((text, index) => ({
      id: `dialogue_${character.id}_${index}`,
      text,
      emotion: this.determineEmotion(character, context),
      length: 'medium',
      context: context
    }));
  }

  private calculateIntegrationScore(character: CharacterProfile): number {
    // Calculate how well the character fits into a story
    let score = 0.5;

    // Archetype bonus
    if (character.archetype === CharacterArchetype.PROTAGONIST) score += 0.2;
    if (character.archetype === CharacterArchetype.ANTAGONIST) score += 0.15;

    // Role bonus
    if (character.role === CharacterRole.LEAD) score += 0.2;
    if (character.role === CharacterRole.SUPPORTING) score += 0.1;

    // Personality depth bonus
    const traitCount = Object.keys(character.personality.traits).length;
    if (traitCount >= 5) score += 0.1;

    return Math.min(1.0, score);
  }

  private analyzeStoryFit(character: CharacterProfile): StoryFit {
    return {
      protagonistPotential: character.archetype === CharacterArchetype.PROTAGONIST ? 0.9 : 0.3,
      antagonistPotential: character.archetype === CharacterArchetype.ANTAGONIST ? 0.9 : 0.2,
      supportingRole: character.role === CharacterRole.SUPPORTING ? 0.8 : 0.4,
      genreCompatibility: this.calculateGenreCompatibility(character)
    };
  }

  private identifyDevelopmentOpportunities(character: CharacterProfile): string[] {
    const opportunities: string[] = [];

    if (character.personality.strengths.length < 3) {
      opportunities.push('Develop additional character strengths');
    }

    if (character.backstory.secrets.length === 0) {
      opportunities.push('Add character secrets for depth');
    }

    if (character.personality.fears.length < 2) {
      opportunities.push('Explore character fears for conflict');
    }

    return opportunities;
  }

  private suggestRelationships(character: CharacterProfile): RelationshipSuggestion[] {
    return [
      {
        type: 'mentor',
        description: 'A wise figure who can guide the character',
        traits: ['wisdom', 'experience', 'patience']
      },
      {
        type: 'rival',
        description: 'A character who challenges the protagonist',
        traits: ['ambition', 'skill', 'determination']
      },
      {
        type: 'ally',
        description: 'A loyal companion for the journey',
        traits: ['loyalty', 'bravery', 'support']
      }
    ];
  }

  private calculateArcPotential(character: CharacterProfile): ArcPotential {
    return {
      growthPotential: 0.7,
      conflictPotential: 0.8,
      redemptionPotential: character.personality.weaknesses.length > 0 ? 0.6 : 0.2,
      transformationPotential: 0.5
    };
  }

  // Helper methods for generation
  private generateCharacterName(archetype: CharacterArchetype, role: CharacterRole): string {
    const prefixes = {
      [CharacterArchetype.HERO]: ['Aria', 'Kael', 'Lyra', 'Thorne'],
      [CharacterArchetype.VILLAIN]: ['Malakor', 'Seraphine', 'Vex', 'Nyx'],
      [CharacterArchetype.MENTOR]: ['Eldrin', 'Morgana', 'Thalor', 'Aelwyn']
    };

    const names = prefixes[archetype] || ['Character'];
    return `${names[Math.floor(Math.random() * names.length)]} ${Math.floor(Math.random() * 900) + 100}`;
  }

  private generateAge(archetype: CharacterArchetype): number {
    const ageRanges = {
      [CharacterArchetype.HERO]: [20, 35],
      [CharacterArchetype.VILLAIN]: [30, 50],
      [CharacterArchetype.MENTOR]: [50, 70]
    };

    const [min, max] = ageRanges[archetype] || [25, 40];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private generateGender(): string {
    const genders = ['male', 'female', 'non-binary'];
    return genders[Math.floor(Math.random() * genders.length)];
  }

  private generateAppearance(constraints?: Partial<CharacterAppearance>): CharacterAppearance {
    const defaultAppearance: CharacterAppearance = {
      height: 170,
      build: 'average',
      hairColor: 'brown',
      hairStyle: 'short',
      eyeColor: 'brown',
      skinTone: 'medium',
      distinctiveFeatures: [],
      clothingStyle: 'casual',
      accessories: []
    };

    return { ...defaultAppearance, ...constraints };
  }

  private generatePersonality(seeds?: Record<PersonalityTrait, number>): CharacterPersonality {
    const traits: Record<PersonalityTrait, number> = {};
    
    // Set default trait values
    Object.values(PersonalityTrait).forEach(trait => {
      traits[trait] = seeds?.[trait] ?? Math.random();
    });

    return {
      traits,
      coreBeliefs: ['Belief in justice', 'Loyalty to friends'],
      motivations: ['Achieve greatness', 'Protect loved ones'],
      fears: ['Failure', 'Loss'],
      strengths: ['Courage', 'Intelligence'],
      weaknesses: ['Impulsiveness', 'Pride'],
      speechPatterns: ['I believe in...', 'We must...']
    };
  }

  private generateBackstory(depth: number): CharacterBackstory {
    return {
      origin: 'City of Eldoria',
      keyEvents: ['Childhood trauma', 'Mentor encounter', 'First victory'],
      relationships: { 'mentor': 'wise guide', 'rival': 'childhood friend' },
      skills: ['Swordsmanship', 'Strategy'],
      secrets: ['Hidden lineage'],
      goals: ['Save the kingdom', 'Find true purpose'],
      conflicts: ['Internal struggle', 'External threat']
    };
  }

  private generateTraits(archetype: CharacterArchetype): CharacterTraits {
    const baseTraits = {
      courage: 0.5,
      intelligence: 0.5,
      charisma: 0.5,
      humility: 0.5,
      ambition: 0.5,
      loyalty: 0.5,
      cunning: 0.5,
      compassion: 0.5
    };

    // Adjust traits based on archetype
    if (archetype === CharacterArchetype.HERO) {
      baseTraits.courage = 0.9;
      baseTraits.compassion = 0.8;
      baseTraits.loyalty = 0.9;
    } else if (archetype === CharacterArchetype.VILLAIN) {
      baseTraits.cunning = 0.9;
      baseTraits.ambition = 0.9;
      baseTraits.courage = 0.7;
    } else if (archetype === CharacterArchetype.MENTOR) {
      baseTraits.intelligence = 0.9;
      baseTraits.wisdom = 0.9;
      baseTraits.patience = 0.8;
    }

    return baseTraits as CharacterTraits;
  }

  private determineEmotion(character: CharacterProfile, context: string): string {
    if (context.includes('battle') || context.includes('fight')) {
      return character.personality.traits[PersonalityTrait.COURAGE] > 0.7 ? 'brave' : 'fearful';
    } else if (context.includes('loss') || context.includes('death')) {
      return 'sad';
    } else if (context.includes('victory') || context.includes('win')) {
      return 'triumphant';
    }
    return 'neutral';
  }

  private calculateGenreCompatibility(character: CharacterProfile): number {
    // Calculate compatibility with different genres
    let compatibility = 0.5;

    if (character.archetype === CharacterArchetype.HERO) compatibility += 0.3;
    if (character.role === CharacterRole.LEAD) compatibility += 0.2;

    return Math.min(1.0, compatibility);
  }

  // Storage methods
  private async loadCharacters(): Promise<void> {
    try {
      const saved = localStorage.getItem('ai_characters');
      if (saved) {
        const characters = JSON.parse(saved);
        characters.forEach((char: unknown) => {
          this.characters.set(char.id, {
            ...char,
            createdAt: new Date(char.createdAt),
            updatedAt: new Date(char.updatedAt)
          });
        });
      }
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  }

  private async saveCharacters(): Promise<void> {
    try {
      const characters = Array.from(this.characters.values());
      localStorage.setItem('ai_characters', JSON.stringify(characters));
    } catch (error) {
      console.error('Failed to save characters:', error);
    }
  }

  private convertToXML(character: CharacterProfile): string {
    // Simple XML conversion for export
    return `<character id="${character.id}">
  <name>${character.name}</name>
  <archetype>${character.archetype}</archetype>
  <role>${character.role}</role>
  <age>${character.age}</age>
  <personality>
    ${Object.entries(character.personality.traits).map(([trait, value]) => 
      `<${trait}>${value}</${trait}>`
    ).join('\n    ')}
  </personality>
</character>`;
  }

  private parseXML(xml: string): unknown {
    // Parse XML character data
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parse error: ${parseError.textContent}`);
      }

      const characterElement = doc.querySelector('character');
      if (!characterElement) {
        throw new Error('Invalid character XML: missing character root element');
      }

      const id = characterElement.getAttribute('id') || '';
      const name = characterElement.querySelector('name')?.textContent || 'Unknown';
      const archetype = characterElement.querySelector('archetype')?.textContent || 'hero';
      const role = characterElement.querySelector('role')?.textContent || 'protagonist';
      const age = parseInt(characterElement.querySelector('age')?.textContent || '25', 10);

      // Parse personality traits from XML
      const personalityElement = characterElement.querySelector('personality');
      const traits: Record<string, number> = {};
      if (personalityElement) {
        const traitElements = personalityElement.children;
        for (let i = 0; i < traitElements.length; i++) {
          const trait = traitElements[i];
          traits[trait.tagName] = parseFloat(trait.textContent || '0.5');
        }
      }

      // Return a partial character object that can be merged
      return {
        id,
        name,
        archetype: archetype as CharacterArchetype,
        role: role as CharacterRole,
        age,
        gender: 'unspecified',
        appearance: {
          height: 170,
          build: 'average',
          hairColor: 'brown',
          hairStyle: 'short',
          eyeColor: 'brown',
          skinTone: 'medium',
          distinctiveFeatures: [],
          clothingStyle: 'casual',
          accessories: []
        },
        personality: {
          traits: traits as Record<PersonalityTrait, number>,
          coreBeliefs: [],
          motivations: [],
          fears: [],
          strengths: [],
          weaknesses: [],
          speechPatterns: []
        },
        backstory: {
          origin: '',
          keyEvents: [],
          relationships: {},
          skills: [],
          secrets: [],
          goals: [],
          conflicts: []
        },
        traits: {
          courage: 0.5,
          intelligence: 0.5,
          charisma: 0.5,
          humility: 0.5,
          ambition: 0.5,
          loyalty: 0.5,
          cunning: 0.5,
          compassion: 0.5
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AICharacterService] Failed to parse XML:', error);
      throw new Error(`Failed to parse character XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Type definitions for return values
interface CharacterAnalysis {
  integrationScore: number;
  storyFit: StoryFit;
  developmentOpportunities: string[];
  relationshipSuggestions: RelationshipSuggestion[];
  arcPotential: ArcPotential;
}

interface StoryFit {
  protagonistPotential: number;
  antagonistPotential: number;
  supportingRole: number;
  genreCompatibility: number;
}

interface RelationshipSuggestion {
  type: string;
  description: string;
  traits: string[];
}

interface ArcPotential {
  growthPotential: number;
  conflictPotential: number;
  redemptionPotential: number;
  transformationPotential: number;
}

interface DialogueSuggestion {
  id: string;
  text: string;
  emotion: string;
  length: string;
  context: string;
}

// Export singleton instance
export const aiCharacterService = new AICharacterService();

// Export types for React hooks
export type { CharacterProfile, CharacterAppearance, CharacterPersonality, CharacterBackstory, CharacterTraits };
export type { CharacterGenerationConfig, CharacterConsistency, CharacterAnalysis };


