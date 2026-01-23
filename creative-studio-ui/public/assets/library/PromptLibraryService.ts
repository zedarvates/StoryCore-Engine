/**
 * Prompt Library Service
 * Provides easy access to the prompt library for UI components
 */

export interface PromptVariable {
  type: 'string' | 'enum' | 'number';
  required: boolean;
  description?: string;
  options?: string[];
  examples?: string[];
  default?: string | number;
}

export interface PromptTemplate {
  category: string;
  subcategory: string;
  id: string;
  name: string;
  description: string;
  tags: string[];
  prompt: string;
  variables: Record<string, PromptVariable>;
  examples?: Array<Record<string, string | number>>;
}

export interface PromptCategory {
  name: string;
  description: string;
  prompts: string[];
}

export interface LibraryIndex {
  version: string;
  lastUpdated: string;
  totalPrompts: number;
  categories: Record<string, PromptCategory>;
}

export class PromptLibraryService {
  private static instance: PromptLibraryService;
  private index: LibraryIndex | null = null;
  private cache: Map<string, PromptTemplate> = new Map();
  private basePath = '/assets/library';

  private constructor() {}

  static getInstance(): PromptLibraryService {
    if (!PromptLibraryService.instance) {
      PromptLibraryService.instance = new PromptLibraryService();
    }
    return PromptLibraryService.instance;
  }

  /**
   * Load the library index
   */
  async loadIndex(): Promise<LibraryIndex> {
    if (this.index) return this.index;

    const response = await fetch(`${this.basePath}/index.json`);
    this.index = await response.json();
    return this.index;
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Record<string, PromptCategory>> {
    const index = await this.loadIndex();
    return index.categories;
  }

  /**
   * Load a specific prompt template
   */
  async loadPrompt(path: string): Promise<PromptTemplate> {
    if (this.cache.has(path)) {
      return this.cache.get(path)!;
    }

    const response = await fetch(`${this.basePath}/${path}`);
    const template = await response.json();
    this.cache.set(path, template);
    return template;
  }

  /**
   * Get all prompts in a category
   */
  async getPromptsByCategory(categoryId: string): Promise<PromptTemplate[]> {
    const index = await this.loadIndex();
    const category = index.categories[categoryId];

    if (!category) {
      throw new Error(`Category ${categoryId} not found`);
    }

    const prompts = await Promise.all(
      category.prompts.map(path => this.loadPrompt(path))
    );

    return prompts;
  }

  /**
   * Get total prompt count
   */
  async getTotalPromptCount(): Promise<number> {
    const index = await this.loadIndex();
    return index.totalPrompts;
  }

  /**
   * Category-specific helper methods for wizards
   */
  async getTimeOfDayPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('10-time-of-day');
  }

  async getMoodPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('09-mood-atmosphere');
  }

  async getShotTypePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('03-shot-types');
  }

  async getCameraAnglePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('07-camera-angles');
  }

  async getCameraMovementPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('08-camera-movements');
  }

  async getTransitionPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('11-transitions');
  }

  async getLightingPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('04-lighting');
  }

  async getGenrePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('02-genres');
  }

  async getVisualStylePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('06-visual-styles');
  }

  async getColorPalettePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('12-color-palettes');
  }

  async getUniverseTypePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('13-universe-types');
  }

  async getCharacterArchetypePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('14-character-archetypes');
  }

  async getMasterCoherencePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('01-master-coherence');
  }

  async getSceneElementPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('05-scene-elements');
  }

  /**
   * Search prompts by tags
   */
  async searchByTags(tags: string[]): Promise<PromptTemplate[]> {
    const index = await this.loadIndex();
    const allPromptPaths: string[] = [];
    
    Object.values(index.categories).forEach(category => {
      allPromptPaths.push(...category.prompts);
    });

    const allPrompts = await Promise.all(
      allPromptPaths.map(path => this.loadPrompt(path))
    );

    return allPrompts.filter(prompt => 
      tags.some(tag => prompt.tags.includes(tag))
    );
  }

  /**
   * Search prompts by text query
   */
  async search(query: string): Promise<PromptTemplate[]> {
    const index = await this.loadIndex();
    const allPromptPaths: string[] = [];
    
    Object.values(index.categories).forEach(category => {
      allPromptPaths.push(...category.prompts);
    });

    const allPrompts = await Promise.all(
      allPromptPaths.map(path => this.loadPrompt(path))
    );

    const lowerQuery = query.toLowerCase();
    return allPrompts.filter(prompt => 
      prompt.name.toLowerCase().includes(lowerQuery) ||
      prompt.description.toLowerCase().includes(lowerQuery) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Fill a prompt template with variable values
   */
  fillPrompt(template: PromptTemplate, values: Record<string, string | number>): string {
    let filledPrompt = template.prompt;

    // Replace all variables
    Object.entries(values).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      filledPrompt = filledPrompt.replace(regex, String(value));
    });

    // Check for missing required variables
    const missingVars: string[] = [];
    Object.entries(template.variables).forEach(([key, variable]) => {
      if (variable.required && !values[key]) {
        missingVars.push(key);
      }
    });

    if (missingVars.length > 0) {
      console.warn(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return filledPrompt;
  }

  /**
   * Get a random example for a template
   */
  getRandomExample(template: PromptTemplate): Record<string, string | number> | null {
    if (!template.examples || template.examples.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * template.examples.length);
    return template.examples[randomIndex];
  }

  /**
   * Validate variable values against template
   */
  validateValues(
    template: PromptTemplate, 
    values: Record<string, string | number>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    Object.entries(template.variables).forEach(([key, variable]) => {
      const value = values[key];

      // Check required
      if (variable.required && (value === undefined || value === null || value === '')) {
        errors.push(`${key} is required`);
        return;
      }

      // Check enum options
      if (variable.type === 'enum' && variable.options && value) {
        if (!variable.options.includes(String(value))) {
          errors.push(`${key} must be one of: ${variable.options.join(', ')}`);
        }
      }

      // Check type
      if (value !== undefined && value !== null) {
        if (variable.type === 'number' && typeof value !== 'number') {
          errors.push(`${key} must be a number`);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    this.index = null;
  }
}

// Export singleton instance
export const promptLibrary = PromptLibraryService.getInstance();
