/**
 * StoryCore Project Name Generator
 * Generates project names from prompts and handles versioning for duplicates
 */

import * as fs from 'fs';
import * as path from 'path';

export interface ProjectNameSuggestion {
  suggestedName: string;
  version?: number;
  fullName: string;
  isDuplicate: boolean;
  projectPath: string;
}

export interface NameGeneratorConfig {
  basePath?: string;
  maxSuggestions?: number;
  includeYear?: boolean;
  includeGenre?: boolean;
}

const DEFAULT_CONFIG: NameGeneratorConfig = {
  basePath: '.',
  maxSuggestions: 5,
  includeYear: true,
  includeGenre: false,
};

export class ProjectNameGenerator {
  private config: NameGeneratorConfig;
  private usedNames: Set<string> = new Set();

  constructor(config: Partial<NameGeneratorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadExistingProjects();
  }

  /**
   * Load existing project names to avoid duplicates
   */
  private loadExistingProjects(): void {
    try {
      const basePath = this.config.basePath || '.';
      
      if (fs.existsSync(basePath)) {
        const entries = fs.readdirSync(basePath, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory() && !entry.name.startsWith('.')) {
            this.usedNames.add(entry.name.toLowerCase());
          }
        }
      }
    } catch (error) {
      console.warn('[ProjectNameGenerator] Could not load existing projects:', error);
    }
  }

  /**
   * Generate project name suggestions from parsed prompt
   */
  generateSuggestions(parsedPrompt: {
    projectTitle?: string;
    genre?: string;
    setting?: string;
    timePeriod?: string;
    location?: string;
    keyElements?: string[];
  }, count: number = 3): ProjectNameSuggestion[] {
    const suggestions: ProjectNameSuggestion[] = [];
    
    // Generate name variants
    const baseNames = this.generateBaseNames(parsedPrompt);
    
    for (const baseName of baseNames.slice(0, count)) {
      let version = 1;
      let fullName = baseName;
      
      // Check for duplicates and increment version
      while (this.usedNames.has(fullName.toLowerCase())) {
        version++;
        fullName = `${baseName} V${version}`;
      }
      
      const projectPath = path.join(this.config.basePath || '.', fullName);
      
      suggestions.push({
        suggestedName: baseName,
        version: version > 1 ? version : undefined,
        fullName,
        isDuplicate: version > 1,
        projectPath,
      });
    }
    
    return suggestions;
  }

  /**
   * Generate base name variants
   */
  private generateBaseNames(parsedPrompt: {
    projectTitle?: string;
    genre?: string;
    setting?: string;
    timePeriod?: string;
    location?: string;
    keyElements?: string[];
  }): string[] {
    const names: string[] = [];
    
    // 1. Use extracted title if available
    if (parsedPrompt.projectTitle && parsedPrompt.projectTitle.length > 2) {
      const title = this.sanitizeTitle(parsedPrompt.projectTitle);
      names.push(title);
      
      // Add year if time period is future
      if (this.config.includeYear && parsedPrompt.timePeriod?.toLowerCase().includes('future')) {
        const yearMatch = parsedPrompt.setting?.match(/(\d{4})/);
        if (yearMatch) {
          names.push(`${title} ${yearMatch[1]}`);
        } else {
          names.push(`${title} 2048`);
        }
      }
    }
    
    // 2. Generate from genre + setting
    if (parsedPrompt.genre && parsedPrompt.setting && parsedPrompt.setting !== 'unspecified') {
      const genreName = this.capitalizeFirst(parsedPrompt.genre);
      const settingName = this.capitalizeFirst(parsedPrompt.setting);
      names.push(`${genreName} ${settingName}`);
    }
    
    // 3. Generate from genre + location
    if (parsedPrompt.genre && parsedPrompt.location && parsedPrompt.location !== 'unspecified') {
      const genreName = this.capitalizeFirst(parsedPrompt.genre);
      const locationName = this.capitalizeFirst(parsedPrompt.location);
      names.push(`${genreName} ${locationName}`);
    }
    
    // 4. Generate from key elements
    if (parsedPrompt.keyElements && parsedPrompt.keyElements.length > 0) {
      // Take first two key elements
      const elements = parsedPrompt.keyElements.slice(0, 2).map(e => {
        return this.capitalizeFirst(e.replace(/^(neon|mega|cyber|augmented)\s+/i, '').trim());
      });
      
      if (elements.length >= 2) {
        names.push(elements.join(' '));
      } else if (elements.length === 1) {
        names.push(elements[0]);
        
        // Add genre prefix
        if (parsedPrompt.genre) {
          names.push(`${this.capitalizeFirst(parsedPrompt.genre)} ${elements[0]}`);
        }
      }
    }
    
    // 5. Generate from time period + location
    if (parsedPrompt.timePeriod && parsedPrompt.timePeriod !== 'unspecified' && 
        parsedPrompt.location && parsedPrompt.location !== 'unspecified') {
      const timeName = this.capitalizeFirst(parsedPrompt.timePeriod);
      const locationName = this.capitalizeFirst(parsedPrompt.location);
      names.push(`${timeName} ${locationName}`);
    }
    
    // 6. Genre-based fallback
    if (parsedPrompt.genre && names.length === 0) {
      const genreName = this.capitalizeFirst(parsedPrompt.genre);
      names.push(`${genreName} Project`);
      
      if (this.config.includeYear) {
        const currentYear = new Date().getFullYear();
        names.push(`${genreName} ${currentYear}`);
      }
    }
    
    // Remove duplicates and sanitize
    const uniqueNames = [...new Set(names)];
    return uniqueNames
      .map(name => this.sanitizeTitle(name))
      .filter(name => name.length > 2 && name.length < 60);
  }

  /**
   * Sanitize title for use as directory name
   */
  private sanitizeTitle(title: string): string {
    return title
      .replace(/[^a-zA-Z0-9\s\-_éèêëàâäùûüôöîïç]/g, '') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      .replace(/\s+/g, '-'); // Replace spaces with hyphens
  }

  /**
   * Capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str
      .split(/[\s\-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Check if a specific project name exists
   */
  checkExists(name: string): boolean {
    const sanitizedName = this.sanitizeTitle(name);
    return this.usedNames.has(sanitizedName.toLowerCase());
  }

  /**
   * Get next available version for a name
   */
  getNextVersion(name: string): number {
    let version = 1;
    const baseName = this.sanitizeTitle(name);
    
    while (this.usedNames.has(`${baseName} V${version}`.toLowerCase())) {
      version++;
    }
    
    return version;
  }

  /**
   * Generate full name with version
   */
  getFullName(baseName: string, version?: number): string {
    const sanitized = this.sanitizeTitle(baseName);
    if (version && version > 1) {
      return `${sanitized} V${version}`;
    }
    return sanitized;
  }

  /**
   * Register a project name as used
   */
  registerName(name: string): void {
    this.usedNames.add(name.toLowerCase());
  }

  /**
   * Get all currently used names
   */
  getUsedNames(): string[] {
    return Array.from(this.usedNames);
  }

  /**
   * Create project directory structure
   */
  createProjectStructure(projectPath: string, config?: {
    createAssets?: boolean;
    createSubfolders?: string[];
  }): { success: boolean; path: string; error?: string } {
    try {
      // Create main project directory
      fs.mkdirSync(projectPath, { recursive: true });
      
      // Register the name
      const projectName = path.basename(projectPath);
      this.registerName(projectName);
      
      // Create default subfolders
      const defaultSubfolders = ['assets', 'assets/images', 'assets/audio'];
      for (const folder of defaultSubfolders) {
        fs.mkdirSync(path.join(projectPath, folder), { recursive: true });
      }
      
      // Create custom subfolders if specified
      if (config?.createSubfolders) {
        for (const folder of config.createSubfolders) {
          fs.mkdirSync(path.join(projectPath, folder), { recursive: true });
        }
      }
      
      return {
        success: true,
        path: projectPath,
      };
    } catch (error) {
      return {
        success: false,
        path: projectPath,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

export const projectNameGenerator = new ProjectNameGenerator();

