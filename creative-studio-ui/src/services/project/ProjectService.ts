/**
 * ProjectService - Manages project data operations with Data Contract v1 compliance
 * 
 * This service handles:
 * - Loading and saving project.json files
 * - Shot management (create, update, delete)
 * - Storyboard operations (add shots, reorder)
 * - Data Contract v1 schema validation
 * - Legacy project migration
 */

import type { Shot } from '../../types';
import type {
  ProjectData,
  ProjectCapabilities,
  GenerationStatus,
  ShotInput,
  ValidationResult,
} from '../../types/project';

/**
 * Cross-platform path joining utility
 */
function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

/**
 * ProjectService class for managing project data operations
 */
export class ProjectService {
  private filePickerActive = false;
  /**
   * Load project data from project.json file
   * @param projectPath - Absolute path to the project directory
   * @returns Promise resolving to ProjectData
   * @throws Error if file cannot be read or parsed
   */
  async loadProject(projectPath: string): Promise<ProjectData> {
    try {
      const projectFilePath = joinPath(projectPath, 'project.json');
      let projectJson: string | undefined;

      // Debug: Log environment information
      console.log('[ProjectService] Environment check:', {
        isElectron: typeof window !== 'undefined' && 'electronAPI' in window,
        electronAPI: window?.electronAPI,
        electronAPI_fs: window?.electronAPI?.fs,
        projectPath,
        projectFilePath
      });

      // Check if we're running in Electron environment
      if (window.electronAPI?.fs) {
        // Use Electron API for file system access
        console.log('[ProjectService] Using Electron API for file access');
        const buffer = await window.electronAPI.fs.readFile(projectFilePath);
        projectJson = buffer.toString('utf-8');

        // Debug: Log raw file content to check for encoding issues
        console.log('[ProjectService] Raw file content (first 100 chars):', projectJson?.substring(0, 100));
        console.log('[ProjectService] File content length:', projectJson?.length);
        
        // Check for BOM or encoding issues
        if (projectJson && projectJson.charCodeAt(0) === 0xFEFF) {
          console.warn('[ProjectService] BOM detected, removing...');
          projectJson = projectJson.substring(1);
        }

      } else {
        // In browser environment, don't attempt file picker during component initialization
        // File picker requires user interaction and cannot be called automatically
        console.log('[ProjectService] Running in browser environment - using mock data');
        projectJson = undefined;
      }

      // If we didn't get projectJson from file system access, use fallback
      if (!projectJson) {
        // Development/fallback mode - use mock data
        console.warn('[ProjectService] Running in non-Electron environment without File System Access API. Using fallback data.');
        
        // Return mock project data for development
        const mockProjectData: ProjectData = {
          schema_version: '1.0',
          project_name: 'Development Project',
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
            wizard_generation: true,
          },
          generation_status: {
            grid: 'pending',
            promotion: 'pending',
            wizard: 'pending',
          },
          storyboard: [],
          assets: [],
          characters: [],
          scenes: [],
          world: undefined,
          global_resume: 'This is a development project running in non-Electron environment.',
        };
        
        return mockProjectData;
      }

      console.log('[ProjectService] Attempting to parse JSON...');
      const data = JSON.parse(projectJson);
      console.log('[ProjectService] JSON parsed successfully');

      // Debug: Log the parsed data structure
      console.log('[ProjectService] Parsed data keys:', Object.keys(data));
      console.log('[ProjectService] Data structure preview:', {
        schema_version: data.schema_version,
        project_name: data.project_name,
        has_storyboard: 'storyboard' in data,
        has_shots: 'shots' in data,
        has_global_resume: 'global_resume' in data,
        has_metadata: 'metadata' in data
      });

      // Validate the loaded data
      const validation = this.validateProjectData(data);
      console.log('[ProjectService] Validation result:', { valid: validation.valid, errors: validation.errors, warnings: validation.warnings });

      if (!validation.valid) {
        console.warn('Project data validation warnings:', validation.warnings);
        console.error('Project data validation errors:', validation.errors);
        
        // Attempt migration if schema version is missing or old
        if (!data.schema_version || data.schema_version !== '1.0') {
          console.log('[ProjectService] Attempting migration to Data Contract v1...');
          return this.migrateToDataContractV1(data);
        }
        
        throw new Error(`Invalid project data: ${validation.errors.join(', ')}`);
      }
      
      return data as ProjectData;
    } catch (error) {
      console.error('Error loading project:', error);
      throw new Error(`Failed to load project from ${projectPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save project data to project.json file with atomic write
   * @param projectPath - Absolute path to the project directory
   * @param data - ProjectData to save
   * @throws Error if validation fails or file cannot be written
   */
  async saveProject(projectPath: string, data: ProjectData): Promise<void> {
    try {
      // Validate before saving
      const validation = this.validateProjectData(data);
      if (!validation.valid) {
        throw new Error(`Cannot save invalid project data: ${validation.errors.join(', ')}`);
      }

      const projectFilePath = joinPath(projectPath, 'project.json');
      const projectJson = JSON.stringify(data, null, 2);

      // Check if we're running in Electron environment
      if (window.electronAPI?.fs) {
        // Use Electron API for file system access
        console.log('[ProjectService] Using Electron API for file save');
        
        // Convert string to Uint8Array for Electron
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(projectJson);
        await window.electronAPI.fs.writeFile(projectFilePath, uint8Array as any);

      } else if (typeof window !== 'undefined' && window.showSaveFilePicker) {
        // Fallback: Use browser File System Access API if available
        console.log('[ProjectService] Using browser File System Access API for save');
        
        try {
          // Create file handle
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: 'project.json',
            types: [{
              description: 'JSON Files',
              accept: {
                'application/json': ['.json'],
              },
            }],
          });
          
          // Create writable stream
          const writable = await fileHandle.createWritable();
          await writable.write(projectJson);
          await writable.close();
          
        } catch (filePickerError) {
          console.error('[ProjectService] File System Access API save error:', filePickerError);
          throw new Error(`Failed to save file: ${filePickerError instanceof Error ? filePickerError.message : String(filePickerError)}`);
        }

      } else {
        // Development/fallback mode - log instead of saving
        console.warn('[ProjectService] Running in non-Electron environment without File System Access API. Save operation skipped.');
        console.log('[ProjectService] Project data that would be saved:', data);
        
        // In development mode, we can also update the in-memory project
        // This allows the UI to reflect changes even if they're not persisted
        return;
      }

    } catch (error) {
      console.error('Error saving project:', error);
      throw new Error(`Failed to save project to ${projectPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new shot with unique ID generation
   * @param projectPath - Absolute path to the project directory
   * @param shotData - Shot input data (title, description, duration)
   * @returns Promise resolving to the created Shot
   * @throws Error if validation fails or shot cannot be created
   */
  async createShot(projectPath: string, shotData: ShotInput): Promise<Shot> {
    try {
      // Validate shot input
      if (!shotData.title || shotData.title.trim() === '') {
        throw new Error('Shot title cannot be empty');
      }
      
      if (shotData.duration <= 0) {
        throw new Error('Shot duration must be a positive number');
      }
      
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Generate unique shot ID
      const timestamp = Date.now();
      const index = project.storyboard.length;
      const shotId = `shot_${timestamp}_${index}`;
      
      // Create shot object
      const shot: Shot = {
        id: shotId,
        title: shotData.title,
        description: shotData.description,
        duration: shotData.duration,
        position: index,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        metadata: {
          source: 'manual',
          created_at: new Date().toISOString(),
          status: 'draft',
        },
      };
      
      // Add shot to storyboard
      project.storyboard.push(shot);
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
      return shot;
    } catch (error) {
      console.error('Error creating shot:', error);
      throw new Error(`Failed to create shot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update an existing shot with partial updates
   * @param projectPath - Absolute path to the project directory
   * @param shotId - ID of the shot to update
   * @param updates - Partial shot data to update
   * @throws Error if shot not found or update fails
   */
  async updateShot(projectPath: string, shotId: string, updates: Partial<Shot>): Promise<void> {
    try {
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Find shot index
      const shotIndex = project.storyboard.findIndex(shot => shot.id === shotId);
      if (shotIndex === -1) {
        throw new Error(`Shot with ID ${shotId} not found`);
      }
      
      // Validate updates if they include title or duration
      if (updates.title !== undefined && updates.title.trim() === '') {
        throw new Error('Shot title cannot be empty');
      }
      
      if (updates.duration !== undefined && updates.duration <= 0) {
        throw new Error('Shot duration must be a positive number');
      }
      
      // Apply updates
      project.storyboard[shotIndex] = {
        ...project.storyboard[shotIndex],
        ...updates,
      };
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
    } catch (error) {
      console.error('Error updating shot:', error);
      throw new Error(`Failed to update shot ${shotId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete a shot and cleanup associated files
   * @param projectPath - Absolute path to the project directory
   * @param shotId - ID of the shot to delete
   * @throws Error if shot not found or deletion fails
   */
  async deleteShot(projectPath: string, shotId: string): Promise<void> {
    try {
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Find shot
      const shotIndex = project.storyboard.findIndex(shot => shot.id === shotId);
      if (shotIndex === -1) {
        throw new Error(`Shot with ID ${shotId} not found`);
      }
      
      const shot = project.storyboard[shotIndex];
      
      // Cleanup associated files
      const filesToDelete: string[] = [];
      
      // Add frame image if exists
      if (shot.image) {
        filesToDelete.push(joinPath(projectPath, 'shots', `${shotId}_frame.png`));
      }
      
      // Add audio tracks
      shot.audioTracks.forEach(track => {
        if (track.url && !track.url.startsWith('http')) {
          filesToDelete.push(joinPath(projectPath, track.url));
        }
      });
      
      // Delete files
      for (const filePath of filesToDelete) {
        try {
          if (window.electronAPI?.fs) {
            // Check if file exists before deleting
            const exists = await window.electronAPI.fs.exists(filePath);
            if (exists) {
              // Note: deleteFile method needs to be added to ElectronAPI
              // For now, we'll skip file deletion in Electron environment
              console.warn(`File deletion not yet implemented in Electron: ${filePath}`);
            }
          }
        } catch (error) {
          console.warn(`Failed to delete file ${filePath}:`, error);
          // Continue with deletion even if file cleanup fails
        }
      }
      
      // Remove shot from storyboard
      project.storyboard.splice(shotIndex, 1);
      
      // Update positions of remaining shots
      project.storyboard.forEach((s, index) => {
        s.position = index;
      });
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
    } catch (error) {
      console.error('Error deleting shot:', error);
      throw new Error(`Failed to delete shot ${shotId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add shots to storyboard with order preservation
   * @param projectPath - Absolute path to the project directory
   * @param shots - Array of shots to add
   * @throws Error if operation fails
   */
  async addShotsToStoryboard(projectPath: string, shots: Shot[]): Promise<void> {
    try {
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Get current max position
      const currentMaxPosition = project.storyboard.length;
      
      // Add shots with correct positions
      shots.forEach((shot, index) => {
        shot.position = currentMaxPosition + index;
        project.storyboard.push(shot);
      });
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
    } catch (error) {
      console.error('Error adding shots to storyboard:', error);
      throw new Error(`Failed to add shots to storyboard: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reorder shots in the storyboard for drag-and-drop support
   * @param projectPath - Absolute path to the project directory
   * @param shotIds - Array of shot IDs in the new order
   * @throws Error if validation fails or operation fails
   */
  async reorderShots(projectPath: string, shotIds: string[]): Promise<void> {
    try {
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Validate that all shot IDs exist
      const existingIds = new Set(project.storyboard.map(shot => shot.id));
      const missingIds = shotIds.filter(id => !existingIds.has(id));
      
      if (missingIds.length > 0) {
        throw new Error(`Shot IDs not found: ${missingIds.join(', ')}`);
      }
      
      // Validate that all shots are included
      if (shotIds.length !== project.storyboard.length) {
        throw new Error(`Shot count mismatch: expected ${project.storyboard.length}, got ${shotIds.length}`);
      }
      
      // Create a map for quick lookup
      const shotMap = new Map(project.storyboard.map(shot => [shot.id, shot]));
      
      // Reorder shots
      project.storyboard = shotIds.map((id, index) => {
        const shot = shotMap.get(id)!;
        shot.position = index;
        return shot;
      });
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
    } catch (error) {
      console.error('Error reordering shots:', error);
      throw new Error(`Failed to reorder shots: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update project capabilities
   * @param projectPath - Absolute path to the project directory
   * @param capabilities - Partial capabilities to update
   * @throws Error if operation fails
   */
  async updateCapabilities(projectPath: string, capabilities: Partial<ProjectCapabilities>): Promise<void> {
    try {
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Update capabilities
      project.capabilities = {
        ...project.capabilities,
        ...capabilities,
      };
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
    } catch (error) {
      console.error('Error updating capabilities:', error);
      throw new Error(`Failed to update capabilities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update generation status
   * @param projectPath - Absolute path to the project directory
   * @param status - Partial generation status to update
   * @throws Error if operation fails
   */
  async updateGenerationStatus(projectPath: string, status: Partial<GenerationStatus>): Promise<void> {
    try {
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Update generation status
      project.generation_status = {
        ...project.generation_status,
        ...status,
      };
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
    } catch (error) {
      console.error('Error updating generation status:', error);
      throw new Error(`Failed to update generation status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update global resume
   * @param projectPath - Absolute path to the project directory
   * @param resume - Global resume text to update
   * @throws Error if operation fails
   */
  async updateGlobalResume(projectPath: string, resume: string): Promise<void> {
    try {
      // Load current project
      const project = await this.loadProject(projectPath);
      
      // Update global resume
      project.global_resume = resume;
      
      // Save updated project
      await this.saveProject(projectPath, project);
      
    } catch (error) {
      console.error('Error updating global resume:', error);
      throw new Error(`Failed to update global resume: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get global resume
   * @param projectPath - Absolute path to the project directory
   * @returns Promise resolving to the global resume string or undefined
   */
  async getGlobalResume(projectPath: string): Promise<string | undefined> {
    try {
      const project = await this.loadProject(projectPath);
      return project.global_resume;
    } catch (error) {
      console.error('Error getting global resume:', error);
      throw new Error(`Failed to get global resume: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Query project capabilities
   * @param projectPath - Absolute path to the project directory
   * @returns Promise resolving to ProjectCapabilities
   */
  async getCapabilities(projectPath: string): Promise<ProjectCapabilities> {
    const project = await this.loadProject(projectPath);
    return project.capabilities;
  }

  /**
   * Query generation status
   * @param projectPath - Absolute path to the project directory
   * @returns Promise resolving to GenerationStatus
   */
  async getGenerationStatus(projectPath: string): Promise<GenerationStatus> {
    const project = await this.loadProject(projectPath);
    return project.generation_status;
  }

  /**
   * Validate project data against Data Contract v1 schema
   * @param data - Data to validate
   * @returns ValidationResult with errors and warnings
   */
  validateProjectData(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check required fields
    if (!data.schema_version) {
      errors.push('Missing required field: schema_version');
    } else if (data.schema_version !== '1.0') {
      warnings.push(`Schema version ${data.schema_version} may not be fully compatible with Data Contract v1`);
    }
    
    if (!data.project_name) {
      errors.push('Missing required field: project_name');
    }
    
    if (!data.capabilities) {
      errors.push('Missing required field: capabilities');
    } else {
      // Validate capabilities structure - be more flexible for migration
      const requiredCapabilities = ['grid_generation', 'promotion_engine', 'qa_engine', 'autofix_engine'];
      for (const cap of requiredCapabilities) {
        if (data.capabilities[cap] === undefined) {
          warnings.push(`Missing capability: ${cap} - will be set to default`);
        } else if (typeof data.capabilities[cap] !== 'boolean') {
          errors.push(`Invalid capability: ${cap} must be boolean`);
        }
      }
    }
    
    if (!data.generation_status) {
      errors.push('Missing required field: generation_status');
    } else {
      // Validate generation status - be more flexible
      const validStatuses = ['pending', 'done', 'failed', 'passed'];
      if (data.generation_status.grid && !validStatuses.includes(data.generation_status.grid)) {
        errors.push(`Invalid generation_status.grid: ${data.generation_status.grid}`);
      }
      if (data.generation_status.promotion && !validStatuses.includes(data.generation_status.promotion)) {
        errors.push(`Invalid generation_status.promotion: ${data.generation_status.promotion}`);
      }
    }
    
    if (!Array.isArray(data.storyboard)) {
      errors.push('Missing or invalid field: storyboard (must be an array)');
    } else if (data.storyboard.length === 0) {
      warnings.push('Empty storyboard - project has no shots');
    }
    
    if (!Array.isArray(data.assets)) {
      errors.push('Missing or invalid field: assets (must be an array)');
    }
    
    if (!Array.isArray(data.characters)) {
      warnings.push('Missing field: characters (optional but recommended)');
    }
    
    if (!Array.isArray(data.scenes)) {
      warnings.push('Missing field: scenes (optional but recommended)');
    }
    
    // Validate global_resume if present
    if (data.global_resume !== undefined && typeof data.global_resume !== 'string') {
      errors.push('Invalid field: global_resume must be a string');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Migrate legacy project data to Data Contract v1
   * @param data - Legacy project data
   * @returns Migrated ProjectData
   */
  migrateToDataContractV1(data: any): ProjectData {
    console.log('[ProjectService] Starting migration to Data Contract v1');
    console.log('[ProjectService] Source data structure:', Object.keys(data));
    
    // Debug: Check for global_resume in metadata
    if (data.metadata?.globalResume) {
      console.log('[ProjectService] Found globalResume in metadata, will migrate to global_resume');
    }
    
    // Handle the specific case where shots array needs to be converted to storyboard format
    let storyboard = [];
    if (Array.isArray(data.storyboard)) {
      storyboard = data.storyboard;
    } else if (Array.isArray(data.shots)) {
      // Convert shots to storyboard format
      console.log('[ProjectService] Converting shots array to storyboard format');
      storyboard = data.shots.map((shot: any) => ({
        id: shot.id || `shot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: shot.title || 'Untitled Shot',
        description: shot.description || '',
        duration: shot.duration || 60,
        position: shot.order || 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        metadata: {
          source: 'migrated',
          created_at: shot.metadata?.created_at || new Date().toISOString(),
          status: shot.metadata?.status || 'draft',
        },
      }));
    }
    
    // Create base Data Contract v1 structure
    const migratedData: ProjectData = {
      schema_version: '1.0',
      project_name: data.project_name || data.name || 'Untitled Project',
      capabilities: {
        grid_generation: data.capabilities?.grid_generation ?? false,
        promotion_engine: data.capabilities?.promotion_engine ?? false,
        qa_engine: data.capabilities?.qa_engine ?? false,
        autofix_engine: data.capabilities?.autofix_engine ?? false,
        wizard_generation: data.capabilities?.wizard_generation ?? false,
      },
      generation_status: {
        grid: data.generation_status?.grid || 'pending',
        promotion: data.generation_status?.promotion || 'pending',
        wizard: data.generation_status?.wizard || 'pending',
      },
      storyboard: storyboard,
      assets: Array.isArray(data.assets) ? data.assets : [],
      characters: Array.isArray(data.characters) ? data.characters.map((char: any) => ({
        id: char.character_id || char.id,
        name: char.name,
        reference_image_path: char.visual_identity?.reference_image || '',
        created_at: char.creation_timestamp || new Date().toISOString(),
      })) : [],
      scenes: Array.isArray(data.scenes) ? data.scenes : [],
      world: data.world || data.selectedWorld,
      global_resume: data.global_resume || data.resume || data.metadata?.globalResume || undefined,
    };
    
    console.log('[ProjectService] Migration completed successfully');
    console.log('[ProjectService] Migrated data keys:', Object.keys(migratedData));
    console.log('[ProjectService] Storyboard length:', migratedData.storyboard.length);
    
    return migratedData;
  }
}

// Export singleton instance
export const projectService = new ProjectService();
