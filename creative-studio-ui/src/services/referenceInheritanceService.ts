/**
 * ReferenceInheritanceService - Propagates references between levels
 * 
 * Manages reference inheritance across three levels:
 * - Master → Sequence: Character/location/style references
 * - Sequence → Shot: All sequence references
 * 
 * Features:
 * - Automatic inheritance on creation
 * - Reference resolution with precedence rules
 * - Override management for shot-level modifications
 * - Change propagation across the inheritance chain
 */

import type {
  MasterReferenceSheet,
  CharacterAppearanceSheet,
  LocationAppearanceSheet,
  GlobalStyleSheet,
  SequenceReferenceSheet,
  ShotReference,
  ConsistencyOverride,
  SequenceStyle,
  ReferenceImage,
} from '../types/reference';
import { v4 as uuidv4 } from 'uuid';
import { getPerformanceMonitoringService } from './performanceMonitoringService';
import { referenceMetadataCache, estimateSize } from '../utils/memoryMonitor';

// ============================================================================
// Storage Path Helpers
// ============================================================================

/**
 * Cross-platform path joining utility
 */
function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\/+/g, '/');
}

/**
 * Get the path to the references directory for a project
 */
function getReferencesDir(projectPath: string): string {
  return joinPath(projectPath, 'references');
}

/**
 * Get the path to a sequence reference sheet file
 */
function getSequenceSheetPath(projectPath: string, sequenceId: string): string {
  return joinPath(getReferencesDir(projectPath), `sequence_${sequenceId}.json`);
}

/**
 * Get the path to a shot reference file
 */
function getShotReferencePath(projectPath: string, shotId: string): string {
  return joinPath(getReferencesDir(projectPath), `shot_${shotId}.json`);
}

// ============================================================================
// ReferenceInheritanceService Class
// ============================================================================

/**
 * Service for managing reference inheritance across Master → Sequence → Shot levels
 */
export class ReferenceInheritanceService {
  private filePickerActive = false;
  private projectPath: string = '';
  private referenceSheetService: unknown;

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the service with a project path and reference sheet service
   */
  async initialize(projectPath: string, referenceSheetService: unknown): Promise<void> {
    this.projectPath = projectPath;
    this.referenceSheetService = referenceSheetService;
    await this.ensureReferencesDirectory();
  }

  /**
   * Set the project path
   */
  setProjectPath(projectPath: string): void {
    this.projectPath = projectPath;
  }

  /**
   * Set the reference sheet service
   */
  setReferenceSheetService(service: unknown): void {
    this.referenceSheetService = service;
  }

  /**
   * Ensure the references directory exists
   */
  private async ensureReferencesDirectory(): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    try {
      if (window.electronAPI?.fs) {
        const exists = await window.electronAPI.fs.exists(getReferencesDir(this.projectPath));
        if (!exists) {
          await window.electronAPI.fs.mkdir(getReferencesDir(this.projectPath), { recursive: true });
        }
      }
    } catch (error) {
      console.warn('[ReferenceInheritanceService] Could not create references directory:', error);
    }
  }

  // ============================================================================
  // File System Helpers
  // ============================================================================

  /**
   * Read a JSON file from the project
   */
  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      if (window.electronAPI?.fs) {
        const buffer = await window.electronAPI.fs.readFile(filePath);
        const content = buffer.toString('utf-8');
        return JSON.parse(content) as T;
      }
      console.warn('[ReferenceInheritanceService] File system not available');
      return null;
    } catch (error) {
      console.warn(`[ReferenceInheritanceService] Error reading file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Write a JSON file to the project
   */
  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    try {
      if (window.electronAPI?.fs) {
        const json = JSON.stringify(data, null, 2);
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(json);
        await window.electronAPI.fs.writeFile(filePath, uint8Array as any);
      } else {
        console.warn('[ReferenceInheritanceService] File system not available, data not persisted');
      }
    } catch (error) {
      console.error(`[ReferenceInheritanceService] Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Master to Sequence Inheritance
  // ============================================================================

  /**
   * Create a sequence sheet inheriting from master
   */
  async inheritFromMaster(sequenceId: string, masterSheetId: string): Promise<SequenceReferenceSheet> {
    const timer = getPerformanceMonitoringService().createTimer('inheritFromMaster');
    
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const masterSheet = await this.referenceSheetService.getMasterReferenceSheet(masterSheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${masterSheetId}`);
    }

    const sequenceSheet: SequenceReferenceSheet = {
      id: uuidv4(),
      masterSheetId,
      sequenceId,
      inheritedCharacters: [...masterSheet.characterSheets.map((c: CharacterAppearanceSheet) => c.id)],
      inheritedLocations: [...masterSheet.locationSheets.map((l: LocationAppearanceSheet) => l.id)],
      sequenceStyle: {
        styleOverrides: [],
        pacing: 'moderate',
        transitions: [],
        colorGrading: 'default',
      },
      episodeReferences: [],
    };

    const filePath = getSequenceSheetPath(this.projectPath, sequenceId);
    await this.writeJsonFile(filePath, sequenceSheet);

    // Track inheritance performance (depth = 1 for master->sequence)
    const duration = timer.stop({ depth: 1, sequenceId, masterSheetId });
    getPerformanceMonitoringService().trackReferenceInheritance(1, duration);

    console.log('[ReferenceInheritanceService] Created sequence sheet inheriting from master:', sequenceSheet.id);
    return sequenceSheet;
  }

  /**
   * Get characters inherited from master for a sequence
   */
  async getInheritedCharacters(sequenceId: string): Promise<CharacterAppearanceSheet[]> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const sequenceSheet = await this.referenceSheetService.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) {
      console.warn('[ReferenceInheritanceService] Sequence sheet not found:', sequenceId);
      return [];
    }

    const masterSheet = await this.referenceSheetService.getMasterReferenceSheet(sequenceSheet.masterSheetId);
    if (!masterSheet) {
      console.warn('[ReferenceInheritanceService] Master sheet not found:', sequenceSheet.masterSheetId);
      return [];
    }

    // Return only characters that are in the inherited list
    return masterSheet.characterSheets.filter((c: CharacterAppearanceSheet) => 
      sequenceSheet.inheritedCharacters.includes(c.id)
    );
  }

  /**
   * Get locations inherited from master for a sequence
   */
  async getInheritedLocations(sequenceId: string): Promise<LocationAppearanceSheet[]> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const sequenceSheet = await this.referenceSheetService.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) {
      console.warn('[ReferenceInheritanceService] Sequence sheet not found:', sequenceId);
      return [];
    }

    const masterSheet = await this.referenceSheetService.getMasterReferenceSheet(sequenceSheet.masterSheetId);
    if (!masterSheet) {
      console.warn('[ReferenceInheritanceService] Master sheet not found:', sequenceSheet.masterSheetId);
      return [];
    }

    // Return only locations that are in the inherited list
    return masterSheet.locationSheets.filter((l: LocationAppearanceSheet) => 
      sequenceSheet.inheritedLocations.includes(l.id)
    );
  }

  /**
   * Refresh inherited references when master changes
   */
  async refreshInheritedReferences(sequenceId: string): Promise<SequenceReferenceSheet | null> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const sequenceSheet = await this.referenceSheetService.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) {
      console.warn('[ReferenceInheritanceService] Sequence sheet not found:', sequenceId);
      return null;
    }

    const masterSheet = await this.referenceSheetService.getMasterReferenceSheet(sequenceSheet.masterSheetId);
    if (!masterSheet) {
      console.warn('[ReferenceInheritanceService] Master sheet not found:', sequenceSheet.masterSheetId);
      return null;
    }

    // Update inherited references from master
    sequenceSheet.inheritedCharacters = [...masterSheet.characterSheets.map((c: CharacterAppearanceSheet) => c.id)];
    sequenceSheet.inheritedLocations = [...masterSheet.locationSheets.map((l: LocationAppearanceSheet) => l.id)];

    await this.referenceSheetService.updateSequenceReferenceSheet(sequenceSheet);
    console.log('[ReferenceInheritanceService] Refreshed inherited references for sequence:', sequenceId);

    return sequenceSheet;
  }

  // ============================================================================
  // Sequence to Shot Inheritance
  // ============================================================================

  /**
   * Create a shot reference inheriting from sequence
   */
  async inheritFromSequence(shotId: string, sequenceId: string): Promise<ShotReference> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const sequenceSheet = await this.referenceSheetService.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) {
      throw new Error(`Sequence sheet not found: ${sequenceId}`);
    }

    const shotReference: ShotReference = {
      id: uuidv4(),
      shotId,
      sequenceSheetId: sequenceId,
      localReferenceImages: [],
      inheritedFromMaster: [...sequenceSheet.inheritedCharacters, ...sequenceSheet.inheritedLocations],
      inheritedFromSequence: [sequenceSheet.id],
      consistencyOverrides: [],
    };

    const filePath = getShotReferencePath(this.projectPath, shotId);
    await this.writeJsonFile(filePath, shotReference);

    console.log('[ReferenceInheritanceService] Created shot reference inheriting from sequence:', shotReference.id);
    return shotReference;
  }

  /**
   * Get all inherited references for a shot
   */
  async getInheritedReferencesForShot(shotId: string): Promise<{
    fromMaster: Array<CharacterAppearanceSheet | LocationAppearanceSheet>;
    fromSequence: SequenceReferenceSheet | null;
  }> {
    const timer = getPerformanceMonitoringService().createTimer('getInheritedReferencesForShot');
    
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    // Check cache first
    const cacheKey = `shot-refs-${shotId}`;
    const cached = referenceMetadataCache.get(cacheKey);
    if (cached) {
      getPerformanceMonitoringService().trackCustomMetric('cache', 'hit', 1, { operation: 'getInheritedReferencesForShot' });
      return cached as { fromMaster: Array<CharacterAppearanceSheet | LocationAppearanceSheet>; fromSequence: SequenceReferenceSheet | null };
    }

    const shotRef = await this.getShotReference(shotId);
    if (!shotRef) {
      return { fromMaster: [], fromSequence: null };
    }

    const fromMaster: Array<CharacterAppearanceSheet | LocationAppearanceSheet> = [];
    const fromSequence = await this.referenceSheetService.getSequenceReferenceSheet(shotRef.sequenceSheetId);

    if (fromSequence) {
      // Get master sheet to resolve inherited references
      const masterSheet = await this.referenceSheetService.getMasterReferenceSheet(fromSequence.masterSheetId);
      if (masterSheet) {
        // Add characters
        for (const charId of shotRef.inheritedFromMaster) {
          const character = masterSheet.characterSheets.find((c: CharacterAppearanceSheet) => c.id === charId);
          if (character) {
            fromMaster.push(character);
          } else {
            const location = masterSheet.locationSheets.find((l: LocationAppearanceSheet) => l.id === charId);
            if (location) {
              fromMaster.push(location);
            }
          }
        }
      }
    }

    const result = { fromMaster, fromSequence };
    
    // Cache the result
    referenceMetadataCache.set(cacheKey, result, estimateSize(result));

    // Track inheritance performance (depth = 2 for master->sequence->shot)
    const duration = timer.stop({ depth: 2, shotId, refCount: fromMaster.length });
    getPerformanceMonitoringService().trackReferenceInheritance(2, duration);

    return result;
  }

  /**
   * Propagate sequence changes to all shots in that sequence
   */
  async propagateSequenceChanges(sequenceId: string): Promise<void> {
    const timer = getPerformanceMonitoringService().createTimer('propagateSequenceChanges');
    
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    // This would typically be called with a list of shot IDs from the timeline
    // For now, we log that propagation would occur
    console.log('[ReferenceInheritanceService] Would propagate sequence changes to shots in:', sequenceId);
    
    const duration = timer.stop({ sequenceId });
    getPerformanceMonitoringService().trackCustomMetric('inheritance', 'propagateChanges', duration, { sequenceId });
    
    // In a full implementation, this would:
    // 1. Get all shots in the sequence
    // 2. For each shot, update inheritedFromSequence
    // 3. Trigger refresh of cached references
  }

  // ============================================================================
  // Reference Resolution
  // ============================================================================

  /**
   * Get full reference object from source
   */
  async resolveReference(
    source: 'master' | 'sequence',
    referenceId: string
  ): Promise<CharacterAppearanceSheet | LocationAppearanceSheet | GlobalStyleSheet | null> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    if (source === 'master') {
      // Search in all master sheets (would need project context in full implementation)
      console.warn('[ReferenceInheritanceService] resolveReference for master needs project context');
      return null;
    }

    if (source === 'sequence') {
      // Search in sequence references
      console.warn('[ReferenceInheritanceService] resolveReference for sequence needs implementation');
      return null;
    }

    return null;
  }

  /**
   * Get all references available to a sequence (local + inherited)
   */
  async getAllAvailableReferences(sequenceId: string): Promise<{
    characters: CharacterAppearanceSheet[];
    locations: LocationAppearanceSheet[];
    style: GlobalStyleSheet | null;
    localCharacters: CharacterAppearanceSheet[];
    localLocations: LocationAppearanceSheet[];
  }> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const inheritedCharacters = await this.getInheritedCharacters(sequenceId);
    const inheritedLocations = await this.getInheritedLocations(sequenceId);
    const sequenceSheet = await this.referenceSheetService.getSequenceReferenceSheet(sequenceId);

    let style: GlobalStyleSheet | null = null;
    if (sequenceSheet) {
      const masterSheet = await this.referenceSheetService.getMasterReferenceSheet(sequenceSheet.masterSheetId);
      if (masterSheet) {
        style = masterSheet.styleSheet;
      }
    }

    return {
      characters: inheritedCharacters,
      locations: inheritedLocations,
      style,
      localCharacters: [],
      localLocations: [],
    };
  }

  /**
   * Get effective references for a shot (local + inherited)
   */
  async getEffectiveReferencesForShot(shotId: string): Promise<{
    local: ReferenceImage[];
    inherited: ReferenceImage[];
    effective: ReferenceImage[];
  }> {
    const shotRef = await this.getShotReference(shotId);
    if (!shotRef) {
      return { local: [], inherited: [], effective: [] };
    }

    const local = shotRef.localReferenceImages;
    const inheritedRefs = await this.getInheritedReferencesForShot(shotId);
    
    // Convert inherited references to reference images
    const inherited: ReferenceImage[] = [];
    for (const ref of inheritedRefs.fromMaster) {
      if ('characterName' in ref) {
        // It's a character sheet
        for (const img of (ref as CharacterAppearanceSheet).appearanceImages) {
          inherited.push({
            id: img.id,
            url: img.url,
            weight: 1.0,
            source: 'character',
          });
        }
      } else if ('locationName' in ref) {
        // It's a location sheet
        for (const img of (ref as LocationAppearanceSheet).referenceImages) {
          inherited.push({
            id: img.id,
            url: img.url,
            weight: 1.0,
            source: 'environment',
          });
        }
      }
    }

    // Effective references: local take precedence over inherited
    const effective: ReferenceImage[] = [...local];
    for (const inh of inherited) {
      if (!effective.some(e => e.id === inh.id)) {
        effective.push(inh);
      }
    }

    return { local, inherited, effective };
  }

  // ============================================================================
  // Override Management
  // ============================================================================

  /**
   * Apply consistency override to a shot
   */
  async applyOverride(shotId: string, override: ConsistencyOverride): Promise<ShotReference | null> {
    const shotRef = await this.getShotReference(shotId);
    if (!shotRef) {
      console.warn('[ReferenceInheritanceService] Shot reference not found:', shotId);
      return null;
    }

    // Check if override for this target already exists
    const existingIndex = shotRef.consistencyOverrides.findIndex(
      o => o.targetId === override.targetId && o.type === override.type
    );

    const newOverride: ConsistencyOverride = {
      ...override,
      id: override.id || uuidv4(),
    };

    if (existingIndex >= 0) {
      shotRef.consistencyOverrides[existingIndex] = newOverride;
    } else {
      shotRef.consistencyOverrides.push(newOverride);
    }

    await this.saveShotReference(shotRef);
    console.log('[ReferenceInheritanceService] Applied override to shot:', shotId);

    return shotRef;
  }

  /**
   * Remove consistency override from a shot
   */
  async removeOverride(shotId: string, overrideId: string): Promise<ShotReference | null> {
    const shotRef = await this.getShotReference(shotId);
    if (!shotRef) {
      console.warn('[ReferenceInheritanceService] Shot reference not found:', shotId);
      return null;
    }

    shotRef.consistencyOverrides = shotRef.consistencyOverrides.filter(o => o.id !== overrideId);
    await this.saveShotReference(shotRef);
    console.log('[ReferenceInheritanceService] Removed override from shot:', shotId);

    return shotRef;
  }

  /**
   * Get active overrides for a shot
   */
  async getActiveOverrides(shotId: string): Promise<ConsistencyOverride[]> {
    const shotRef = await this.getShotReference(shotId);
    if (!shotRef) {
      return [];
    }

    return shotRef.consistencyOverrides;
  }

  // ============================================================================
  // Shot Reference CRUD (Helper Methods)
  // ============================================================================

  /**
   * Get a shot reference
   */
  async getShotReference(shotId: string): Promise<ShotReference | null> {
    if (!this.projectPath) {
      throw new Error('Project path not set');
    }

    const filePath = getShotReferencePath(this.projectPath, shotId);
    return await this.readJsonFile<ShotReference>(filePath);
  }

  /**
   * Save a shot reference
   */
  private async saveShotReference(shotRef: ShotReference): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set');
    }

    const filePath = getShotReferencePath(this.projectPath, shotRef.shotId);
    await this.writeJsonFile(filePath, shotRef);
  }

  /**
   * Update a shot reference
   */
  async updateShotReference(shotRef: ShotReference): Promise<void> {
    await this.saveShotReference(shotRef);
    console.log('[ReferenceInheritanceService] Updated shot reference:', shotRef.id);
  }

  /**
   * Delete a shot reference
   */
  async deleteShotReference(shotId: string): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set');
    }

    const filePath = getShotReferencePath(this.projectPath, shotId);
    try {
      if (window.electronAPI?.fs) {
        await window.electronAPI.fs.unlink(filePath);
      }
    } catch (error) {
      console.warn(`[ReferenceInheritanceService] Error deleting shot reference ${shotId}:`, error);
    }
  }

  // ============================================================================
  // Sequence Style Management
  // ============================================================================

  /**
   * Update sequence style
   */
  async updateSequenceStyle(sequenceId: string, style: Partial<SequenceStyle>): Promise<SequenceReferenceSheet | null> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const sequenceSheet = await this.referenceSheetService.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) {
      console.warn('[ReferenceInheritanceService] Sequence sheet not found:', sequenceId);
      return null;
    }

    sequenceSheet.sequenceStyle = {
      ...sequenceSheet.sequenceStyle,
      ...style,
    };

    await this.referenceSheetService.updateSequenceReferenceSheet(sequenceSheet);
    console.log('[ReferenceInheritanceService] Updated sequence style:', sequenceId);

    return sequenceSheet;
  }

  /**
   * Get sequence style
   */
  async getSequenceStyle(sequenceId: string): Promise<SequenceStyle | null> {
    if (!this.referenceSheetService) {
      throw new Error('ReferenceSheetService not set');
    }

    const sequenceSheet = await this.referenceSheetService.getSequenceReferenceSheet(sequenceId);
    return sequenceSheet?.sequenceStyle || null;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const referenceInheritanceService = new ReferenceInheritanceService();

