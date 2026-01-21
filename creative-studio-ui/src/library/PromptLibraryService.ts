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
    
    try {
      console.log(`[PromptLibraryService] Attempting to load index from: ${this.basePath}/index.json`);
      
      // Try to load from local files first
      try {
        const indexModule = await import(`${this.basePath}/index.json`);
        const localIndex = indexModule.default || indexModule;
        
        if (localIndex) {
          this.index = localIndex;
          console.log(`[PromptLibraryService] Successfully loaded index from local files with ${this.index.totalPrompts} prompts`);
          return this.index;
        }
      } catch (localError) {
        console.log(`[PromptLibraryService] Local file loading failed, trying fetch: ${localError}`);
      }
      
      // Fallback to fetch if local loading fails
      const response = await fetch(`${this.basePath}/index.json`);
      
      if (!response.ok) {
        console.error(`[PromptLibraryService] Failed to load index: HTTP ${response.status} - ${response.statusText}`);
        console.error(`[PromptLibraryService] Response URL: ${response.url}`);
        throw new Error(`Failed to load library index: HTTP ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log(`[PromptLibraryService] Raw response text (first 200 chars): ${responseText.substring(0, 200)}`);
      
      this.index = JSON.parse(responseText);
      console.log(`[PromptLibraryService] Successfully loaded index with ${this.index.totalPrompts} prompts`);
      return this.index;
    } catch (error) {
      console.error(`[PromptLibraryService] Error loading index: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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
 
    try {
      console.log(`[PromptLibraryService] Attempting to load prompt from: ${this.basePath}/${path}`);
      
      // Try to load from local files first
      try {
        const promptModule = await import(`${this.basePath}/${path}`);
        const localPrompt = promptModule.default || promptModule;
        
        if (localPrompt) {
          this.cache.set(path, localPrompt);
          console.log(`[PromptLibraryService] Successfully loaded prompt from local files: ${localPrompt.name}`);
          return localPrompt;
        }
      } catch (localError) {
        console.log(`[PromptLibraryService] Local file loading failed, trying fetch: ${localError}`);
      }
      
      // Fallback to fetch if local loading fails
      const response = await fetch(`${this.basePath}/${path}`);
      
      if (!response.ok) {
        console.error(`[PromptLibraryService] Failed to load prompt ${path}: HTTP ${response.status} - ${response.statusText}`);
        console.error(`[PromptLibraryService] Response URL: ${response.url}`);
        throw new Error(`Failed to load prompt ${path}: HTTP ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log(`[PromptLibraryService] Raw prompt response (first 200 chars): ${responseText.substring(0, 200)}`);
      
      const template = JSON.parse(responseText);
      this.cache.set(path, template);
      console.log(`[PromptLibraryService] Successfully loaded prompt: ${template.name}`);
      return template;
    } catch (error) {
      console.error(`[PromptLibraryService] Error loading prompt ${path}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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

  // ============================================================================
  // Wizard-Specific Query Methods
  // ============================================================================

  /**
   * Get time of day prompts (6 prompts)
   */
  async getTimeOfDayPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('time-of-day');
  }

  /**
   * Get mood/atmosphere prompts (10 prompts)
   */
  async getMoodPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('mood-atmosphere');
  }

  /**
   * Get shot type prompts (7 prompts)
   */
  async getShotTypePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('shot-types');
  }

  /**
   * Get camera angle prompts (6 prompts)
   */
  async getCameraAnglePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('camera-angles');
  }

  /**
   * Get camera movement prompts (8 prompts)
   */
  async getCameraMovementPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('camera-movements');
  }

  /**
   * Get transition prompts (5 prompts)
   */
  async getTransitionPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('transitions');
  }

  /**
   * Get lighting prompts (4 prompts)
   */
  async getLightingPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('lighting');
  }

  /**
   * Get genre prompts (15 prompts)
   */
  async getGenrePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('genres');
  }

  /**
   * Get visual style prompts (11 prompts)
   */
  async getVisualStylePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('visual-styles');
  }

  /**
   * Get color palette prompts (6 prompts)
   */
  async getColorPalettePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('color-palettes');
  }

  /**
   * Get universe type prompts (5 prompts)
   */
  async getUniverseTypePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('universe-types');
  }

  /**
   * Get character archetype prompts (3 prompts)
   */
  async getCharacterArchetypePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('character-archetypes');
  }

  /**
   * Get master coherence prompts (3 prompts)
   */
  async getMasterCoherencePrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('master-coherence');
  }

  /**
   * Get scene element prompts (4 prompts)
   */
  async getSceneElementPrompts(): Promise<PromptTemplate[]> {
    return this.getPromptsByCategory('scene-elements');
  }

  /**
   * Get all prompts organized by category
   * Returns all 93 prompts grouped by their categories
   */
  async getAllPromptsByCategory(): Promise<Record<string, PromptTemplate[]>> {
    const index = await this.loadIndex();
    const result: Record<string, PromptTemplate[]> = {};

    for (const [categoryId, _category] of Object.entries(index.categories)) {
      result[categoryId] = await this.getPromptsByCategory(categoryId);
    }

    return result;
  }

  /**
   * Get total prompt count
   */
  async getTotalPromptCount(): Promise<number> {
    const index = await this.loadIndex();
    return index.totalPrompts;
  }

  /**
   * Get category information
   */
  async getCategoryInfo(categoryId: string): Promise<PromptCategory | null> {
    const index = await this.loadIndex();
    return index.categories[categoryId] || null;
  }

  /**
   * Check if library is fully loaded
   */
  async isLibraryLoaded(): Promise<boolean> {
    try {
      const index = await this.loadIndex();
      return index.totalPrompts === 93;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Filtering Methods
  // ============================================================================

  /**
   * Filter prompts by genre
   * @param prompts - Array of prompts to filter
   * @param genre - Genre to filter by (e.g., 'sci-fi', 'fantasy', 'horror')
   * @returns Filtered prompts that match the genre
   */
  filterByGenre(prompts: PromptTemplate[], genre: string): PromptTemplate[] {
    const genreLower = genre.toLowerCase();
    return prompts.filter(prompt => {
      // Check if genre is in tags
      const hasGenreTag = prompt.tags.some(tag => tag.toLowerCase().includes(genreLower));
      
      // Check if genre is mentioned in description
      const hasGenreInDescription = prompt.description.toLowerCase().includes(genreLower);
      
      // Check if genre is in the prompt category
      const hasGenreInCategory = prompt.category.toLowerCase().includes(genreLower);
      
      return hasGenreTag || hasGenreInDescription || hasGenreInCategory;
    });
  }

  /**
   * Filter prompts by visual style
   * @param prompts - Array of prompts to filter
   * @param style - Visual style to filter by (e.g., 'cinematic', 'anime', 'realistic')
   * @returns Filtered prompts that match the style
   */
  filterByStyle(prompts: PromptTemplate[], style: string): PromptTemplate[] {
    const styleLower = style.toLowerCase();
    return prompts.filter(prompt => {
      // Check if style is in tags
      const hasStyleTag = prompt.tags.some(tag => tag.toLowerCase().includes(styleLower));
      
      // Check if style is mentioned in description
      const hasStyleInDescription = prompt.description.toLowerCase().includes(styleLower);
      
      // Check if style is in the prompt text itself (handle both string and object)
      const promptText = typeof prompt.prompt === 'string' ? prompt.prompt : JSON.stringify(prompt.prompt);
      const hasStyleInPrompt = promptText.toLowerCase().includes(styleLower);
      
      return hasStyleTag || hasStyleInDescription || hasStyleInPrompt;
    });
  }

  /**
   * Filter prompts by universe type
   * @param prompts - Array of prompts to filter
   * @param universeType - Universe type to filter by (e.g., 'realistic', 'fantasy', 'sci-fi')
   * @returns Filtered prompts that match the universe type
   */
  filterByUniverseType(prompts: PromptTemplate[], universeType: string): PromptTemplate[] {
    const universeLower = universeType.toLowerCase();
    return prompts.filter(prompt => {
      // Check if universe type is in tags
      const hasUniverseTag = prompt.tags.some(tag => tag.toLowerCase().includes(universeLower));
      
      // Check if universe type is mentioned in description
      const hasUniverseInDescription = prompt.description.toLowerCase().includes(universeLower);
      
      // Check if universe type is in category
      const hasUniverseInCategory = prompt.category.toLowerCase().includes(universeLower);
      
      // Check subcategory as well (handle undefined)
      const hasUniverseInSubcategory = prompt.subcategory ? 
        prompt.subcategory.toLowerCase().includes(universeLower) : false;
      
      return hasUniverseTag || hasUniverseInDescription || hasUniverseInCategory || hasUniverseInSubcategory;
    });
  }

  /**
   * Apply multiple filters to prompts
   * @param prompts - Array of prompts to filter
   * @param filters - Object containing filter criteria
   * @returns Filtered prompts that match all criteria
   */
  applyFilters(
    prompts: PromptTemplate[],
    filters: {
      genre?: string;
      style?: string;
      universeType?: string;
      tags?: string[];
    }
  ): PromptTemplate[] {
    let filtered = prompts;

    if (filters.genre) {
      filtered = this.filterByGenre(filtered, filters.genre);
    }

    if (filters.style) {
      filtered = this.filterByStyle(filtered, filters.style);
    }

    if (filters.universeType) {
      filtered = this.filterByUniverseType(filtered, filters.universeType);
    }

    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(prompt =>
        filters.tags!.some(tag => prompt.tags.includes(tag))
      );
    }

    return filtered;
  }
}

// Export singleton instance
export const promptLibrary = PromptLibraryService.getInstance();