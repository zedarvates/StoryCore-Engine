/**
 * ExportService
 * 
 * Export service for StoryCore Creative Studio.
 * Handles project export to different formats:
 * - JSON (Data Contract v1 Format)
 * - PDF (Project Report)
 * - Video (Promoted Sequence)
 * 
 * This service uses a project state-based approach (ProjectState)
 * and delegates actual operations to the existing ProjectExportService.
 * 
 * Requirements: 13.1-13.6
 */

import type { Project, Shot, Asset } from '@/types';
import { projectExportService, ExportResult } from './projectExportService';

/**
 * Project state interface for export service
 */
export interface ProjectState {
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  projectName: string;
}

/**
 * Export options for methods
 */
export interface ExportOptions {
  /** Include metadata in export */
  includeMetadata?: boolean;
  /** Export format (default: automatic based on method) */
  format?: string;
  /** Export quality (for PDF and Video) */
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Progress callback for export operations
 */
export type ExportProgressCallback = (progress: number, message: string) => void;

/**
 * ExportService Class
 * 
 * Service principal pour les opérations d'export.
 * Fournit une interface simple basée sur ProjectState.
 * 
 * Example d'utilisation:
 * ```typescript
 * const state: ProjectState = { project, shots, assets, projectName };
 * const exportService = new ExportService(state);
 * const result = await exportService.exportJSON();
 * ```
 */
export class ExportService {
  private projectState: ProjectState;
  private progressCallback?: ExportProgressCallback;
  private onError?: (error: Error) => void;

  /**
   * ExportService constructor
   * 
   * @param projectState - Current project state
   */
  constructor(projectState: ProjectState) {
    this.projectState = projectState;
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: ExportProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Set error callback
   */
  setOnError(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  /**
   * Report progress
   */
  private reportProgress(progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(progress, message);
    }
    console.log(`[ExportService] Progress: ${progress}% - ${message}`);
  }

  /**
   * Handle error
   */
  private handleError(error: Error, context: string): never {
    console.error(`[ExportService] Error in ${context}:`, error);
    if (this.onError) {
      this.onError(error);
    }
    throw error;
  }

  /**
   * Get project from state
   */
  private getProject(): Project | null {
    return this.projectState.project;
  }

  /**
   * Validate project data before export
   * 
   * @returns true if data is valid
   */
  private validateProjectData(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { projectName, shots } = this.projectState;

    // Validate project name
    if (!projectName || projectName.trim().length === 0) {
      errors.push('Le nom du projet est requis');
    }

    // Validate shots
    if (!shots || shots.length === 0) {
      errors.push('Le projet doit contenir au moins un plan');
    }

    // Validate each shot
    shots.forEach((shot, index) => {
      if (!shot.id) {
        errors.push(`Plan ${index + 1}: L'ID est requis`);
      }
      if (!shot.title || shot.title.trim().length === 0) {
        errors.push(`Plan ${index + 1}: Le titre est requis`);
      }
      if (shot.duration <= 0) {
        errors.push(`Plan ${index + 1}: La durée doit être supérieure à 0`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export project to JSON format
   * 
   * Collects project data, validates, and generates a formatted JSON file.
   * Uses Electron API to save file if available.
   * 
   * @param options - Optional export options
   * @returns Promise<ExportResult> - Export result
   */
  async exportJSON(options?: ExportOptions): Promise<ExportResult> {
    const context = 'exportJSON';
    this.reportProgress(0, 'Starting JSON export...');

    try {
      // Valider les données
      this.reportProgress(10, 'Validation des données du projet...');
      const validation = this.validateProjectData();
      
      if (!validation.valid) {
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      const project = this.getProject();
      if (!project) {
        throw new Error('Aucun projet à exporter');
      }

      // Delegate to existing export service
      this.reportProgress(50, 'Generating JSON...');
      const result = await projectExportService.exportJSON(project);

      if (result.success) {
        this.reportProgress(100, 'JSON export completed');
        console.log(`[ExportService] JSON exported successfully: ${result.filePath}`);
      } else {
        this.reportProgress(100, 'JSON export failed');
        if (result.error) {
          this.handleError(result.error, context);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[ExportService] JSON export failed: ${errorMessage}`);
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Export project to PDF format
   * 
   * Uses jsPDF to generate a project report including:
   * - Title page with metadata
   * - Liste des plans avec descriptions
   * - Liste des assets
   * - Statut des capacités et de la génération
   * 
   * @param options - Options d'export optionnelles (quality, includeMetadata)
   * @returns Promise<ExportResult> - Résultat de l'export
   */
  async exportPDF(options?: ExportOptions): Promise<ExportResult> {
    const context = 'exportPDF';
    this.reportProgress(0, 'Starting PDF export...');

    try {
      // Validate data
      this.reportProgress(10, 'Validating project data...');
      const validation = this.validateProjectData();
      
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const project = this.getProject();
      if (!project) {
        throw new Error('No project to export');
      }

      // Delegate to existing export service
      this.reportProgress(30, 'Generating PDF content...');
      const result = await projectExportService.exportPDF(project);

      if (result.success) {
        this.reportProgress(100, 'PDF export completed');
        console.log(`[ExportService] PDF exported successfully: ${result.filePath}`);
      } else {
        this.reportProgress(100, 'PDF export failed');
        if (result.error) {
          this.handleError(result.error, context);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ExportService] PDF export failed: ${errorMessage}`);
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Export project to Video format
   * 
   * Integration with existing video rendering service.
   * Collects promoted shots and assets to generate a video sequence.
   * 
   * Note: Full FFmpeg implementation is in development.
   * Currently returns a placeholder with integration instructions.
   * 
   * @param options - Optional export options (quality)
   * @returns Promise<ExportResult> - Export result
   */
  async exportVideo(options?: ExportOptions): Promise<ExportResult> {
    const context = 'exportVideo';
    this.reportProgress(0, 'Starting video export...');

    try {
      // Validate data
      this.reportProgress(10, 'Validating project data...');
      const validation = this.validateProjectData();
      
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const project = this.getProject();
      if (!project) {
        throw new Error('No project to export');
      }

      // Check for shots with promoted panels
      const shotsWithPanels = project.shots.filter(shot => (shot as any).promoted_panel_path);
      
      if (shotsWithPanels.length === 0) {
        throw new Error('No promoted shots found. Please promote shots before exporting to video.');
      }

      // Delegate to existing export service
      this.reportProgress(40, 'Generating video sequence...');
      const result = await projectExportService.exportVideo(project);

      if (result.success) {
        this.reportProgress(100, 'Video export completed');
        console.log(`[ExportService] Video exported successfully: ${result.filePath}`);
      } else {
        this.reportProgress(100, 'Video export failed');
        if (result.error) {
          this.handleError(result.error, context);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[ExportService] Video export failed: ${errorMessage}`);
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Export multiple formats
   * 
   * Exporte le projet dans plusieurs formats simultanément.
   * 
   * @param formats - Formats à exporter
   * @param options - Options d'export
   * @returns Promise<Map<string, ExportResult>> - Résultats par format
   */
  async exportMultiple(
    formats: ('json' | 'pdf' | 'video')[],
    options?: ExportOptions
  ): Promise<Map<string, ExportResult>> {
    const results = new Map<string, ExportResult>();

    for (const format of formats) {
      let result: ExportResult;
      
      switch (format) {
        case 'json':
          result = await this.exportJSON(options);
          break;
        case 'pdf':
          result = await this.exportPDF(options);
          break;
        case 'video':
          result = await this.exportVideo(options);
          break;
        default:
          result = {
            success: false,
            error: new Error(`Format non supporté: ${format}`),
          };
      }
      
      results.set(format, result);
    }

    return results;
  }
}

/**
 * Factory function pour créer un ExportService à partir de l'état de l'application
 * 
 * @param projectState - État du projet
 * @returns Nouvelle instance de ExportService
 */
export function createExportService(projectState: ProjectState): ExportService {
  return new ExportService(projectState);
}

/**
 * Export par défaut - instance singleton du ExportService
 * Note: Préférez créer une nouvelle instance avec createExportService
 * pour une meilleure isolation des états.
 */
export const exportService = new ExportService({
  project: null,
  shots: [],
  assets: [],
  projectName: '',
});
