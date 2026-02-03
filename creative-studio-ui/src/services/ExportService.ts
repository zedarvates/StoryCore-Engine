/**
 * ExportService
 * 
 * Service d'export pour StoryCore Creative Studio.
 * Gère l'export des projets vers différents formats:
 * - JSON (Format Data Contract v1)
 * - PDF (Rapport de projet)
 * - Vidéo (Séquence promue)
 * 
 * Ce service utilise une approche basée sur l'état du projet (ProjectState)
 * et délègue les opérations réelles au ProjectExportService existant.
 * 
 * Requirements: 13.1-13.6
 */

import type { Project, Shot, Asset } from '@/types';
import { projectExportService, ExportResult } from './projectExportService';

/**
 * Interface d'état du projet pour le service d'export
 */
export interface ProjectState {
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  projectName: string;
}

/**
 * Options d'export pour les méthodes
 */
export interface ExportOptions {
  /** Inclure les métadonnées dans l'export */
  includeMetadata?: boolean;
  /** Format de l'export (défaut: automatique selon la méthode) */
  format?: string;
  /** Qualité de l'export (pour PDF et Vidéo) */
  quality?: 'low' | 'medium' | 'high';
}

/**
 * Progress callback pour les opérations d'export
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
   * Constructeur du ExportService
   * 
   * @param projectState - État actuel du projet
   */
  constructor(projectState: ProjectState) {
    this.projectState = projectState;
  }

  /**
   * Définir le callback de progression
   */
  setProgressCallback(callback: ExportProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Définir le callback d'erreur
   */
  setOnError(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  /**
   * Signaler la progression
   */
  private reportProgress(progress: number, message: string): void {
    if (this.progressCallback) {
      this.progressCallback(progress, message);
    }
    console.log(`[ExportService] Progress: ${progress}% - ${message}`);
  }

  /**
   * Gérer une erreur
   */
  private handleError(error: Error, context: string): never {
    console.error(`[ExportService] Error in ${context}:`, error);
    if (this.onError) {
      this.onError(error);
    }
    throw error;
  }

  /**
   * Obtenir le projet à partir de l'état
   */
  private getProject(): Project | null {
    return this.projectState.project;
  }

  /**
   * Valider les données du projet avant export
   * 
   * @returns true si les données sont valides
   */
  private validateProjectData(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { projectName, shots } = this.projectState;

    // Valider le nom du projet
    if (!projectName || projectName.trim().length === 0) {
      errors.push('Le nom du projet est requis');
    }

    // Valider les shots
    if (!shots || shots.length === 0) {
      errors.push('Le projet doit contenir au moins un plan');
    }

    // Valider chaque plan
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
   * Export du projet au format JSON
   * 
   * Collecte les données du projet, valide, et génère un fichier JSON formaté.
   * Utilise l'API Electron pour sauvegarder le fichier si disponible.
   * 
   * @param options - Options d'export optionnelles
   * @returns Promise<ExportResult> - Résultat de l'export
   */
  async exportJSON(options?: ExportOptions): Promise<ExportResult> {
    const context = 'exportJSON';
    this.reportProgress(0, 'Démarrage de l\'export JSON...');

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

      // Déléguer au service d'export existant
      this.reportProgress(50, 'Génération du JSON...');
      const result = await projectExportService.exportJSON(project);

      if (result.success) {
        this.reportProgress(100, 'Export JSON terminé');
        console.log(`[ExportService] JSON exporté avec succès: ${result.filePath}`);
      } else {
        this.reportProgress(100, 'Export JSON échoué');
        if (result.error) {
          this.handleError(result.error, context);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[ExportService] Échec de l'export JSON: ${errorMessage}`);
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Export du projet au format PDF
   * 
   * Utilise jsPDF pour générer un rapport de projet incluant:
   * - Page de garde avec les métadonnées
   * - Liste des plans avec descriptions
   * - Liste des assets
   * - Statut des capacités et de la génération
   * 
   * @param options - Options d'export optionnelles (quality, includeMetadata)
   * @returns Promise<ExportResult> - Résultat de l'export
   */
  async exportPDF(options?: ExportOptions): Promise<ExportResult> {
    const context = 'exportPDF';
    this.reportProgress(0, 'Démarrage de l\'export PDF...');

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

      // Déléguer au service d'export existant
      this.reportProgress(30, 'Génération du contenu PDF...');
      const result = await projectExportService.exportPDF(project);

      if (result.success) {
        this.reportProgress(100, 'Export PDF terminé');
        console.log(`[ExportService] PDF exporté avec succès: ${result.filePath}`);
      } else {
        this.reportProgress(100, 'Export PDF échoué');
        if (result.error) {
          this.handleError(result.error, context);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[ExportService] Échec de l'export PDF: ${errorMessage}`);
      
      return {
        success: false,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    }
  }

  /**
   * Export du projet au format Vidéo
   * 
   * Intégration avec le service de rendu vidéo existant.
   * Collecte les plans et assets promoted pour générer une séquence vidéo.
   * 
   * Note: L'implémentation complète avec FFmpeg est en développement.
   * Actuellement retourne un placeholder avec instructions d'intégration.
   * 
   * @param options - Options d'export optionnelles (quality)
   * @returns Promise<ExportResult> - Résultat de l'export
   */
  async exportVideo(options?: ExportOptions): Promise<ExportResult> {
    const context = 'exportVideo';
    this.reportProgress(0, 'Démarrage de l\'export vidéo...');

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

      // Vérifier les plans avec panels promus
      const shotsWithPanels = project.shots.filter(shot => (shot as any).promoted_panel_path);
      
      if (shotsWithPanels.length === 0) {
        throw new Error('Aucun plan promu trouvé. Veuillez promouvoir des plans avant d\'exporter en vidéo.');
      }

      // Déléguer au service d'export existant
      this.reportProgress(40, 'Génération de la séquence vidéo...');
      const result = await projectExportService.exportVideo(project);

      if (result.success) {
        this.reportProgress(100, 'Export vidéo terminé');
        console.log(`[ExportService] Vidéo exportée avec succès: ${result.filePath}`);
      } else {
        this.reportProgress(100, 'Export vidéo échoué');
        if (result.error) {
          this.handleError(result.error, context);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      console.error(`[ExportService] Échec de l'export vidéo: ${errorMessage}`);
      
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
