/**
 * MetadataPersistenceService
 * 
 * Handles saving and loading metadata (completeness reports, enrichment data)
 * to the project's /metadata directory.
 */

import { CompletenessReport, EnhancedSceneBreakdown, EnhancedShotPlan } from './wizard/MetadataEnrichmentService';
import { logger } from '@/utils/logger';

export interface MetadataPackage {
  projectId: string;
  report: CompletenessReport;
  scenes: EnhancedSceneBreakdown[];
  shots: EnhancedShotPlan[];
  lastUpdated: number;
}

export class MetadataPersistenceService {
  private static instance: MetadataPersistenceService;

  private constructor() {}

  static getInstance(): MetadataPersistenceService {
    if (!MetadataPersistenceService.instance) {
      MetadataPersistenceService.instance = new MetadataPersistenceService();
    }
    return MetadataPersistenceService.instance;
  }

  /**
   * Save metadata package to project directory
   */
  async saveMetadata(pkg: MetadataPackage, projectPath: string): Promise<boolean> {
    if (!window.electronAPI?.fs) {
      console.warn('[MetadataPersistenceService] Electron API not available, saving to localStorage');
      localStorage.setItem(`metadata-${pkg.projectId}`, JSON.stringify(pkg));
      return true;
    }

    try {
      const metadataDir = `${projectPath}/metadata`;
      const filePath = `${metadataDir}/enrichment_report.json`;

      // Ensure directory exists
      if (window.electronAPI.fs.mkdir) {
        await window.electronAPI.fs.mkdir(metadataDir, { recursive: true });
      }

      // Write file
      await window.electronAPI.fs.writeFile(filePath, JSON.stringify(pkg, null, 2));
      
      logger.info(`[MetadataPersistenceService] Metadata saved to: ${filePath}`);
      return true;
    } catch (error) {
      logger.error('[MetadataPersistenceService] Failed to save metadata:', error);
      return false;
    }
  }

  /**
   * Load metadata package from project directory
   */
  async loadMetadata(projectPath: string, projectId: string): Promise<MetadataPackage | null> {
    if (!window.electronAPI?.fs) {
      const stored = localStorage.getItem(`metadata-${projectId}`);
      return stored ? JSON.parse(stored) : null;
    }

    try {
      const filePath = `${projectPath}/metadata/enrichment_report.json`;
      const exists = await window.electronAPI.fs.exists(filePath);
      
      if (!exists) return null;

      const buffer = await window.electronAPI.fs.readFile(filePath);
      const jsonString = new TextDecoder().decode(buffer);
      return JSON.parse(jsonString) as MetadataPackage;
    } catch (error) {
      logger.error('[MetadataPersistenceService] Failed to load metadata:', error);
      return null;
    }
  }
}

export const metadataPersistenceService = MetadataPersistenceService.getInstance();
