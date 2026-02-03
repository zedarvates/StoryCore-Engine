/**
 * ExportEngine Service
 * 
 * Responsible for exporting wizard data to StoryCore's Data Contract v1 format.
 * Transforms wizard state into project.json, validates against schema, creates
 * project directory structure, and generates human-readable summary documents.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */

import { z } from 'zod';
import type {
  WizardState,
  ProjectJSON,
  ProjectExport,
  CoherenceConfig,
  SchemaValidationResult,
  GenreStyleData,
} from '../../types/wizard';

// ============================================================================
// Zod Schema for Data Contract v1 Validation
// ============================================================================

const ProjectJSONSchema = z.object({
  schema_version: z.literal('1.0'),
  project_name: z.string().min(1),
  project_metadata: z.object({
    type: z.string(),
    duration_minutes: z.number().positive(),
    genres: z.array(z.string()),
    visual_style: z.string(),
    created_at: z.string().datetime(),
  }),
  world_building: z.object({
    timePeriod: z.string(),
    primaryLocation: z.string(),
    universeType: z.enum(['realistic', 'fantasy', 'sci-fi', 'historical', 'alternate']),
    worldRules: z.string(),
    locations: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      visualCharacteristics: z.string(),
      mood: z.string(),
      referenceImages: z.array(z.string()).optional(),
    })),
    culturalContext: z.string(),
    technologyLevel: z.number().min(0).max(10),
  }),
  characters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['protagonist', 'antagonist', 'supporting', 'background']),
    physicalAppearance: z.string(),
    personalityTraits: z.array(z.string()),
    characterArc: z.string(),
    visualReferences: z.array(z.string()),
    dialogueStyle: z.enum(['formal', 'casual', 'technical', 'poetic', 'terse', 'verbose', 'dialect-specific']),
    relationships: z.array(z.object({
      characterId: z.string(),
      relationshipType: z.string(),
      description: z.string(),
    })),
  })),
  story_structure: z.object({
    premise: z.string().max(500),
    logline: z.string().max(150),
    actStructure: z.enum(['3-act', '5-act', 'hero-journey', 'save-the-cat', 'custom']),
    plotPoints: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      timingMinutes: z.number(),
      actNumber: z.number(),
    })),
    themes: z.array(z.string()),
    motifs: z.array(z.string()),
    narrativePerspective: z.enum(['first-person', 'third-person-limited', 'third-person-omniscient', 'multiple-pov']),
  }),
  scenes: z.array(z.object({
    id: z.string(),
    sceneNumber: z.number(),
    sceneName: z.string(),
    durationMinutes: z.number().positive(),
    locationId: z.string(),
    characterIds: z.array(z.string()),
    timeOfDay: z.enum(['dawn', 'morning', 'afternoon', 'evening', 'night', 'unspecified']),
    emotionalBeat: z.string(),
    keyActions: z.array(z.string()),
    order: z.number(),
  })),
  shots: z.array(z.object({
    id: z.string(),
    sceneId: z.string(),
    shotNumber: z.number(),
    shotType: z.enum(['extreme-wide', 'wide', 'medium', 'close-up', 'extreme-close-up', 'over-the-shoulder', 'pov']),
    cameraAngle: z.enum(['eye-level', 'high-angle', 'low-angle', 'dutch-angle', 'birds-eye', 'worms-eye']),
    cameraMovement: z.enum(['static', 'pan', 'tilt', 'dolly', 'track', 'zoom', 'handheld', 'crane']),
    transition: z.enum(['cut', 'fade', 'dissolve', 'wipe', 'match-cut']),
    compositionNotes: z.string(),
    order: z.number(),
  })),
  capabilities: z.object({
    grid_generation: z.boolean(),
    promotion_engine: z.boolean(),
    qa_engine: z.boolean(),
    autofix_engine: z.boolean(),
  }),
  generation_status: z.object({
    grid: z.enum(['pending', 'done', 'failed', 'passed']),
    promotion: z.enum(['pending', 'done', 'failed', 'passed']),
  }),
});

// ============================================================================
// ExportEngine Class
// ============================================================================

export class ExportEngine {
  /**
   * Generate project.json from wizard state
   * Transforms wizard state to Data Contract v1 format
   * 
   * @param wizardState - Complete wizard state with all project data
   * @returns ProjectJSON conforming to Data Contract v1
   * @throws Error if required wizard data is missing
   */
  generateProjectJSON(wizardState: WizardState): ProjectJSON {
    // Validate required data is present
    if (!wizardState.projectType) {
      throw new Error('Project type is required for export');
    }
    if (!wizardState.genreStyle) {
      throw new Error('Genre and style information is required for export');
    }
    if (!wizardState.worldBuilding) {
      throw new Error('World building information is required for export');
    }
    if (!wizardState.storyStructure) {
      throw new Error('Story structure is required for export');
    }

    const projectName = this.generateProjectName(wizardState);
    const createdAt = new Date().toISOString();

    const projectJSON: ProjectJSON = {
      schema_version: '1.0',
      project_name: projectName,
      project_metadata: {
        type: wizardState.projectType.type,
        duration_minutes: wizardState.projectType.durationMinutes,
        genres: wizardState.genreStyle.genres,
        visual_style: wizardState.genreStyle.visualStyle,
        created_at: createdAt,
      },
      world_building: wizardState.worldBuilding,
      characters: wizardState.characters,
      story_structure: wizardState.storyStructure,
      scenes: wizardState.scenes,
      shots: wizardState.shots,
      capabilities: {
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      },
      generation_status: {
        grid: 'pending',
        promotion: 'pending',
      },
    };

    return projectJSON;
  }

  /**
   * Validate project JSON against Data Contract v1 schema using Zod
   * 
   * @param projectJSON - Project JSON to validate
   * @returns Validation result with errors if any
   */
  validateAgainstSchema(projectJSON: ProjectJSON): SchemaValidationResult {
    try {
      ProjectJSONSchema.parse(projectJSON);
      return {
        isValid: true,
        errors: [],
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map((issue: z.ZodIssue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        }));
        return {
          isValid: false,
          errors,
        };
      }
      return {
        isValid: false,
        errors: [
          {
            path: 'unknown',
            message: error instanceof Error ? error.message : 'Unknown validation error',
          },
        ],
      };
    }
  }

  /**
   * Create project directory structure
   * Creates the directory structure required by StoryCore-Engine
   * 
   * @param projectName - Name of the project
   * @returns Path to the created project directory
   */
  async createProjectDirectory(projectName: string): Promise<string> {
    // Sanitize project name for file system
    const sanitizedName = projectName
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const projectPath = `projects/${sanitizedName}`;

    // In a browser environment, we can't create actual directories
    // This would be implemented differently for desktop/Electron version
    // For now, we return the path that would be created
    
    // TODO: Implement actual directory creation for Electron/desktop version
    // using Node.js fs module or Electron's file system APIs
    
    return projectPath;
  }

  /**
   * Write project files to disk
   * Writes project.json and related files to the project directory
   * 
   * @param projectPath - Path to project directory
   * @param projectJSON - Project JSON data to write
   */
  async writeProjectFiles(
    projectPath: string,
    projectJSON: ProjectJSON
  ): Promise<void> {
    // In a browser environment, we can't write actual files
    // This would be implemented differently for desktop/Electron version
    
    // For browser version, we can:
    // 1. Store in IndexedDB
    // 2. Offer download as JSON file
    // 3. Use File System Access API (if available)
    
    // TODO: Implement actual file writing for Electron/desktop version
    // using Node.js fs module or Electron's file system APIs
    
    // For now, we'll prepare the data for download
    const jsonString = JSON.stringify(projectJSON, null, 2);
    
    // Store in localStorage as fallback (with size limits in mind)
    try {
      localStorage.setItem(`project_${projectJSON.project_name}`, jsonString);
    } catch (error) {
      console.warn('Failed to store project in localStorage:', error);
    }
  }

  /**
   * Generate human-readable project summary document in Markdown format
   * 
   * @param wizardState - Complete wizard state
   * @returns Markdown formatted summary document
   * @throws Error if required wizard data is missing
   */
  generateSummaryDocument(wizardState: WizardState): string {
    // Validate required data is present
    if (!wizardState.projectType) {
      throw new Error('Project type is required for summary generation');
    }
    if (!wizardState.genreStyle) {
      throw new Error('Genre and style information is required for summary generation');
    }
    if (!wizardState.worldBuilding) {
      throw new Error('World building information is required for summary generation');
    }
    if (!wizardState.storyStructure) {
      throw new Error('Story structure is required for summary generation');
    }

    const { projectType, genreStyle, worldBuilding, characters, storyStructure, scenes, shots } = wizardState;

    const markdown = `# Project Summary

## Project Information

**Project Type:** ${this.formatProjectType(projectType.type)}  
**Duration:** ${projectType.durationMinutes} minutes  
**Created:** ${new Date().toLocaleDateString()}

## Genre & Style

**Genres:** ${genreStyle.genres.join(', ')}  
**Visual Style:** ${genreStyle.visualStyle}  
**Color Palette:**
- Primary: ${genreStyle.colorPalette.primary}
- Secondary: ${genreStyle.colorPalette.secondary}
- Accent: ${genreStyle.colorPalette.accent}

**Mood:** ${genreStyle.mood.join(', ')}

## World Building

**Time Period:** ${worldBuilding.timePeriod}  
**Primary Location:** ${worldBuilding.primaryLocation}  
**Universe Type:** ${worldBuilding.universeType}  
**Technology Level:** ${worldBuilding.technologyLevel}/10

**World Rules:**
${worldBuilding.worldRules}

**Cultural Context:**
${worldBuilding.culturalContext}

### Locations

${worldBuilding.locations.map(loc => `
#### ${loc.name}
${loc.description}

**Visual Characteristics:** ${loc.visualCharacteristics}  
**Mood:** ${loc.mood}
`).join('\n')}

## Characters

${characters.map(char => `
### ${char.name} (${char.role})

**Physical Appearance:** ${char.physicalAppearance}

**Personality Traits:** ${char.personalityTraits.join(', ')}

**Character Arc:** ${char.characterArc}

**Dialogue Style:** ${char.dialogueStyle}

${char.relationships.length > 0 ? `**Relationships:**
${char.relationships.map(rel => `- ${rel.relationshipType}: ${rel.description}`).join('\n')}` : ''}
`).join('\n')}

## Story Structure

**Premise:**
${storyStructure.premise}

**Logline:**
${storyStructure.logline}

**Act Structure:** ${storyStructure.actStructure}  
**Narrative Perspective:** ${storyStructure.narrativePerspective}

**Themes:** ${storyStructure.themes.join(', ')}  
**Motifs:** ${storyStructure.motifs.join(', ')}

### Plot Points

${storyStructure.plotPoints.map(pp => `
#### ${pp.name} (Act ${pp.actNumber}, ${pp.timingMinutes} min)
${pp.description}
`).join('\n')}

## Scene Breakdown

**Total Scenes:** ${scenes.length}  
**Total Duration:** ${scenes.reduce((sum, scene) => sum + scene.durationMinutes, 0)} minutes

${scenes.map(scene => `
### Scene ${scene.sceneNumber}: ${scene.sceneName}

**Duration:** ${scene.durationMinutes} minutes  
**Location:** ${worldBuilding.locations.find(l => l.id === scene.locationId)?.name || 'Unknown'}  
**Time of Day:** ${scene.timeOfDay}  
**Characters:** ${scene.characterIds.map(id => characters.find(c => c.id === id)?.name || 'Unknown').join(', ')}

**Emotional Beat:** ${scene.emotionalBeat}

**Key Actions:**
${scene.keyActions.map(action => `- ${action}`).join('\n')}
`).join('\n')}

## Shot Planning

**Total Shots:** ${shots.length}

${scenes.map(scene => {
  const sceneShots = shots.filter(shot => shot.sceneId === scene.id);
  if (sceneShots.length === 0) return '';
  
  return `
### Scene ${scene.sceneNumber}: ${scene.sceneName}

${sceneShots.map(shot => `
#### Shot ${shot.shotNumber}
- **Type:** ${shot.shotType}
- **Angle:** ${shot.cameraAngle}
- **Movement:** ${shot.cameraMovement}
- **Transition:** ${shot.transition}
- **Composition Notes:** ${shot.compositionNotes}
`).join('\n')}
`;
}).join('\n')}

## Project Statistics

- **Total Duration:** ${projectType.durationMinutes} minutes
- **Scene Count:** ${scenes.length}
- **Shot Count:** ${shots.length}
- **Character Count:** ${characters.length}
- **Location Count:** ${worldBuilding.locations.length}

---

*Generated by StoryCore-Engine Project Setup Wizard*
`;

    return markdown;
  }

  /**
   * Initialize Master Coherence Sheet configuration based on visual style parameters
   * 
   * @param genreStyle - Genre and style data from wizard
   * @returns Coherence configuration for Master Coherence Sheet generation
   */
  initializeMasterCoherenceSheetConfig(genreStyle: GenreStyleData): CoherenceConfig {
    const styleConsistencyRules = this.generateStyleConsistencyRules(genreStyle);

    const coherenceConfig: CoherenceConfig = {
      visualStyle: genreStyle.visualStyle,
      colorPalette: genreStyle.colorPalette,
      mood: genreStyle.mood,
      styleConsistencyRules,
    };

    return coherenceConfig;
  }

  /**
   * Export complete project with all files and configurations
   * Main export method that orchestrates the entire export process
   * 
   * @param wizardState - Complete wizard state
   * @returns Complete project export with all data and file paths
   * @throws Error if required wizard data is missing or validation fails
   */
  async exportProject(wizardState: WizardState): Promise<ProjectExport> {
    // Validate required data is present before export
    if (!wizardState.genreStyle) {
      throw new Error('Genre and style information is required for export');
    }

    // Step 1: Generate project JSON
    const projectJSON = this.generateProjectJSON(wizardState);

    // Step 2: Validate against schema
    const validationResult = this.validateAgainstSchema(projectJSON);
    if (!validationResult.isValid) {
      throw new Error(
        `Project validation failed:\n${validationResult.errors.map(e => `- ${e.path}: ${e.message}`).join('\n')}`
      );
    }

    // Step 3: Create project directory
    const projectPath = await this.createProjectDirectory(projectJSON.project_name);

    // Step 4: Write project files
    await this.writeProjectFiles(projectPath, projectJSON);

    // Step 5: Generate summary document
    const summaryDocument = this.generateSummaryDocument(wizardState);

    // Step 6: Initialize coherence sheet configuration
    const coherenceConfig = this.initializeMasterCoherenceSheetConfig(wizardState.genreStyle);

    // Step 7: Create export result
    const projectExport: ProjectExport = {
      projectJSON,
      projectPath,
      summaryDocument,
      coherenceConfig,
      exportTimestamp: new Date(),
    };

    return projectExport;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Generate a project name from wizard state
   * Uses story structure logline or creates a default name
   */
  private generateProjectName(wizardState: WizardState): string {
    if (wizardState.storyStructure?.logline) {
      // Create name from logline (first 50 chars, sanitized)
      return wizardState.storyStructure.logline
        .substring(0, 50)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Fallback to timestamp-based name
    const timestamp = new Date().toISOString().split('T')[0];
    return `project-${timestamp}`;
  }

  /**
   * Format project type for display
   */
  private formatProjectType(type: string): string {
    const typeMap: Record<string, string> = {
      'court-metrage': 'Court-métrage (Short Film)',
      'moyen-metrage': 'Moyen-métrage (Medium Film)',
      'long-metrage-standard': 'Long-métrage Standard (Standard Feature)',
      'long-metrage-premium': 'Long-métrage Premium (Premium Feature)',
      'tres-long-metrage': 'Très Long-métrage (Epic Feature)',
      'special-tv': 'Spécial TV/Streaming',
      'episode-serie': 'Épisode de Série (Series Episode)',
      'custom': 'Custom',
    };
    return typeMap[type] || type;
  }

  /**
   * Generate style consistency rules based on visual style parameters
   */
  private generateStyleConsistencyRules(genreStyle: GenreStyleData): string[] {
    const rules: string[] = [];

    // Visual style rules
    rules.push(`Maintain ${genreStyle.visualStyle} visual style throughout all scenes`);

    // Color palette rules
    rules.push(
      `Use primary color ${genreStyle.colorPalette.primary}, ` +
      `secondary color ${genreStyle.colorPalette.secondary}, ` +
      `and accent color ${genreStyle.colorPalette.accent} consistently`
    );

    // Mood rules
    if (genreStyle.mood.length > 0) {
      rules.push(`Maintain ${genreStyle.mood.join(' and ')} mood throughout the project`);
    }

    // Genre-specific rules
    genreStyle.genres.forEach(genre => {
      const genreRules = this.getGenreSpecificRules(genre);
      rules.push(...genreRules);
    });

    // Visual style-specific rules
    const styleRules = this.getVisualStyleSpecificRules(genreStyle.visualStyle);
    rules.push(...styleRules);

    return rules;
  }

  /**
   * Get genre-specific consistency rules
   */
  private getGenreSpecificRules(genre: string): string[] {
    const genreRules: Record<string, string[]> = {
      'action': ['Maintain high energy and dynamic compositions', 'Use dramatic lighting for action sequences'],
      'drama': ['Focus on character expressions and emotional depth', 'Use naturalistic lighting'],
      'sci-fi': ['Maintain futuristic aesthetic', 'Ensure technological consistency'],
      'fantasy': ['Maintain magical/fantastical elements', 'Ensure world-building consistency'],
      'horror': ['Maintain atmospheric tension', 'Use shadows and contrast effectively'],
      'comedy': ['Maintain light and bright visual tone', 'Use clear, readable compositions'],
    };
    return genreRules[genre] || [];
  }

  /**
   * Get visual style-specific consistency rules
   */
  private getVisualStyleSpecificRules(visualStyle: string): string[] {
    const styleRules: Record<string, string[]> = {
      'realistic': ['Maintain photorealistic quality', 'Use natural lighting and proportions'],
      'anime': ['Maintain anime art style conventions', 'Use characteristic anime color grading'],
      'stylized': ['Maintain consistent stylization approach', 'Use exaggerated features consistently'],
      'noir': ['Maintain high contrast black and white or limited color', 'Use dramatic shadows'],
      'vintage': ['Maintain period-appropriate visual elements', 'Use vintage color grading'],
      'watercolor': ['Maintain soft, flowing aesthetic', 'Use watercolor texture consistently'],
    };
    return styleRules[visualStyle] || [];
  }
}

// Export singleton instance
export const exportEngine = new ExportEngine();
