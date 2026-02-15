/**
 * ReferenceSheetService - Manages reference sheets for continuous creation
 * 
 * Provides three-level reference system:
 * - Master Reference Sheet (Project-level)
 * - Sequence Reference Sheet (Episode/Scene-level)
 * - Shot Reference (Shot-level)
 * 
 * Uses file-based storage with Electron API for persistence.
 */

import type {
  MasterReferenceSheet,
  CharacterAppearanceSheet,
  LocationAppearanceSheet,
  GlobalStyleSheet,
  ReferenceImage,
  SequenceReferenceSheet,
  SequenceStyle,
  PreviousEpisodeReference,
  ShotReference,
  ConsistencyOverride,
  AppearanceImage,
  TransitionType,
} from '../types/reference';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

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
 * Get the path to master reference sheet file
 */
function getMasterSheetPath(projectPath: string): string {
  return joinPath(getReferencesDir(projectPath), 'master.json');
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
// ReferenceSheetService Class
// ============================================================================

/**
 * Service for managing reference sheets across three levels of inheritance
 */
export class ReferenceSheetService {
  private filePickerActive = false;
  private projectPath: string = '';

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the service with a project path
   */
  async initialize(projectPath: string): Promise<void> {
    this.projectPath = projectPath;
    
    // Ensure references directory exists
    await this.ensureReferencesDirectory();
  }

  /**
   * Set the project path
   */
  setProjectPath(projectPath: string): void {
    this.projectPath = projectPath;
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
      console.warn('[ReferenceSheetService] Could not create references directory:', error);
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
      console.warn('[ReferenceSheetService] File system not available');
      return null;
    } catch (error) {
      console.warn(`[ReferenceSheetService] Error reading file ${filePath}:`, error);
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
        console.warn('[ReferenceSheetService] File system not available, data not persisted');
      }
    } catch (error) {
      console.error(`[ReferenceSheetService] Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Delete a file from the project
   */
  private async deleteFile(filePath: string): Promise<void> {
    try {
      if (window.electronAPI?.fs) {
        await window.electronAPI.fs.unlink(filePath);
      }
    } catch (error) {
      console.warn(`[ReferenceSheetService] Error deleting file ${filePath}:`, error);
    }
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      if (window.electronAPI?.fs) {
        return await window.electronAPI.fs.exists(filePath);
      }
      return false;
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Master Reference Sheet Management
  // ============================================================================

  /**
   * Create a new master reference sheet for a project
   */
  async createMasterReferenceSheet(projectId: string): Promise<MasterReferenceSheet> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const now = new Date();
    const masterSheet: MasterReferenceSheet = {
      id: uuidv4(),
      projectId,
      characterSheets: [],
      locationSheets: [],
      styleSheet: {
        id: uuidv4(),
        styleName: 'Default Style',
        artStyle: 'anime',
        colorPalette: [],
        lightingStyle: 'natural',
        compositionGuidelines: [],
        moodBoard: [],
      },
      createdAt: now,
      updatedAt: now,
    };

    const filePath = getMasterSheetPath(this.projectPath);
    await this.writeJsonFile(filePath, masterSheet);

    logger.debug('[ReferenceSheetService] Created master reference sheet:', masterSheet.id);
    return masterSheet;
  }

  /**
   * Get the master reference sheet for a project
   */
  async getMasterReferenceSheet(projectId: string): Promise<MasterReferenceSheet | null> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const filePath = getMasterSheetPath(this.projectPath);
    const masterSheet = await this.readJsonFile<MasterReferenceSheet>(filePath);

    if (masterSheet && masterSheet.projectId !== projectId) {
      console.warn('[ReferenceSheetService] Master sheet projectId mismatch');
    }

    return masterSheet;
  }

  /**
   * Update the master reference sheet
   */
  async updateMasterReferenceSheet(sheet: MasterReferenceSheet): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const updatedSheet: MasterReferenceSheet = {
      ...sheet,
      updatedAt: new Date(),
    };

    const filePath = getMasterSheetPath(this.projectPath);
    await this.writeJsonFile(filePath, updatedSheet);

    logger.debug('[ReferenceSheetService] Updated master reference sheet:', updatedSheet.id);
  }

  /**
   * Delete the master reference sheet
   */
  async deleteMasterReferenceSheet(projectId: string): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const filePath = getMasterSheetPath(this.projectPath);
    await this.deleteFile(filePath);

    logger.debug('[ReferenceSheetService] Deleted master reference sheet for project:', projectId);
  }

  // ============================================================================
  // Character Appearance Management
  // ============================================================================

  /**
   * Add a character appearance to a master sheet
   */
  async addCharacterAppearance(
    sheetId: string,
    character: CharacterAppearanceSheet
  ): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    masterSheet.characterSheets.push(character);
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Added character appearance:', character.id);
  }

  /**
   * Update a character appearance in a master sheet
   */
  async updateCharacterAppearance(
    sheetId: string,
    appearance: CharacterAppearanceSheet
  ): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    const index = masterSheet.characterSheets.findIndex(c => c.id === appearance.id);
    if (index === -1) {
      throw new Error(`Character appearance not found: ${appearance.id}`);
    }

    masterSheet.characterSheets[index] = appearance;
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Updated character appearance:', appearance.id);
  }

  /**
   * Remove a character appearance from a master sheet
   */
  async removeCharacterAppearance(sheetId: string, characterId: string): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    masterSheet.characterSheets = masterSheet.characterSheets.filter(c => c.id !== characterId);
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Removed character appearance:', characterId);
  }

  // ============================================================================
  // Location Appearance Management
  // ============================================================================

  /**
   * Add a location appearance to a master sheet
   */
  async addLocationAppearance(
    sheetId: string,
    location: LocationAppearanceSheet
  ): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    masterSheet.locationSheets.push(location);
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Added location appearance:', location.id);
  }

  /**
   * Update a location appearance in a master sheet
   */
  async updateLocationAppearance(
    sheetId: string,
    appearance: LocationAppearanceSheet
  ): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    const index = masterSheet.locationSheets.findIndex(l => l.id === appearance.id);
    if (index === -1) {
      throw new Error(`Location appearance not found: ${appearance.id}`);
    }

    masterSheet.locationSheets[index] = appearance;
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Updated location appearance:', appearance.id);
  }

  /**
   * Remove a location appearance from a master sheet
   */
  async removeLocationAppearance(sheetId: string, locationId: string): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    masterSheet.locationSheets = masterSheet.locationSheets.filter(l => l.id !== locationId);
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Removed location appearance:', locationId);
  }

  // ============================================================================
  // Style Sheet Management
  // ============================================================================

  /**
   * Update the global style for a master sheet
   */
  async updateGlobalStyle(sheetId: string, style: GlobalStyleSheet): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    masterSheet.styleSheet = style;
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Updated global style:', style.id);
  }

  /**
   * Add a mood board image to a master sheet
   */
  async addMoodBoardImage(sheetId: string, image: ReferenceImage): Promise<void> {
    const masterSheet = await this.getMasterReferenceSheet(sheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${sheetId}`);
    }

    masterSheet.styleSheet.moodBoard.push(image);
    await this.updateMasterReferenceSheet(masterSheet);

    logger.debug('[ReferenceSheetService] Added mood board image:', image.id);
  }

  // ============================================================================
  // Sequence Reference Sheet Management
  // ============================================================================

  /**
   * Create a new sequence reference sheet linked to master
   */
  async createSequenceReferenceSheet(
    masterSheetId: string,
    sequenceId: string
  ): Promise<SequenceReferenceSheet> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const masterSheet = await this.getMasterReferenceSheet(masterSheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${masterSheetId}`);
    }

    const sequenceSheet: SequenceReferenceSheet = {
      id: uuidv4(),
      masterSheetId,
      sequenceId,
      inheritedCharacters: masterSheet.characterSheets.map(c => c.id),
      inheritedLocations: masterSheet.locationSheets.map(l => l.id),
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

    logger.debug('[ReferenceSheetService] Created sequence reference sheet:', sequenceSheet.id);
    return sequenceSheet;
  }

  /**
   * Get a sequence reference sheet
   */
  async getSequenceReferenceSheet(sequenceId: string): Promise<SequenceReferenceSheet | null> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const filePath = getSequenceSheetPath(this.projectPath, sequenceId);
    return await this.readJsonFile<SequenceReferenceSheet>(filePath);
  }

  /**
   * Update a sequence reference sheet
   */
  async updateSequenceReferenceSheet(sheet: SequenceReferenceSheet): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const filePath = getSequenceSheetPath(this.projectPath, sheet.sequenceId);
    await this.writeJsonFile(filePath, sheet);

    logger.debug('[ReferenceSheetService] Updated sequence reference sheet:', sheet.id);
  }

  /**
   * Link a sequence to a master sheet
   */
  async linkToMaster(sequenceId: string, masterSheetId: string): Promise<void> {
    const sequenceSheet = await this.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) {
      throw new Error(`Sequence sheet not found: ${sequenceId}`);
    }

    const masterSheet = await this.getMasterReferenceSheet(masterSheetId);
    if (!masterSheet) {
      throw new Error(`Master sheet not found: ${masterSheetId}`);
    }

    sequenceSheet.masterSheetId = masterSheetId;
    sequenceSheet.inheritedCharacters = masterSheet.characterSheets.map(c => c.id);
    sequenceSheet.inheritedLocations = masterSheet.locationSheets.map(l => l.id);

    await this.updateSequenceReferenceSheet(sequenceSheet);

    logger.debug('[ReferenceSheetService] Linked sequence to master:', sequenceId, masterSheetId);
  }

  /**
   * Add an episode reference for continuity
   */
  async addEpisodeReference(
    sequenceId: string,
    episode: PreviousEpisodeReference
  ): Promise<void> {
    const sequenceSheet = await this.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) {
      throw new Error(`Sequence sheet not found: ${sequenceId}`);
    }

    sequenceSheet.episodeReferences.push(episode);
    await this.updateSequenceReferenceSheet(sequenceSheet);

    logger.debug('[ReferenceSheetService] Added episode reference:', episode.episodeId);
  }

  // ============================================================================
  // Shot Reference Management
  // ============================================================================

  /**
   * Create a new shot reference linked to sequence
   */
  async createShotReference(shotId: string, sequenceSheetId: string): Promise<ShotReference> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const sequenceSheet = await this.getSequenceReferenceSheet(sequenceSheetId);
    if (!sequenceSheet) {
      throw new Error(`Sequence sheet not found: ${sequenceSheetId}`);
    }

    const shotReference: ShotReference = {
      id: uuidv4(),
      shotId,
      sequenceSheetId,
      localReferenceImages: [],
      inheritedFromMaster: [...sequenceSheet.inheritedCharacters, ...sequenceSheet.inheritedLocations],
      inheritedFromSequence: [],
      consistencyOverrides: [],
    };

    const filePath = getShotReferencePath(this.projectPath, shotId);
    await this.writeJsonFile(filePath, shotReference);

    logger.debug('[ReferenceSheetService] Created shot reference:', shotReference.id);
    return shotReference;
  }

  /**
   * Get a shot reference
   */
  async getShotReference(shotId: string): Promise<ShotReference | null> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const filePath = getShotReferencePath(this.projectPath, shotId);
    return await this.readJsonFile<ShotReference>(filePath);
  }

  /**
   * Update a shot reference
   */
  async updateShotReference(reference: ShotReference): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const filePath = getShotReferencePath(this.projectPath, reference.shotId);
    await this.writeJsonFile(filePath, reference);

    logger.debug('[ReferenceSheetService] Updated shot reference:', reference.id);
  }

  /**
   * Add a local reference image to a shot
   */
  async addLocalReference(shotId: string, image: ReferenceImage): Promise<void> {
    const shotReference = await this.getShotReference(shotId);
    if (!shotReference) {
      throw new Error(`Shot reference not found: ${shotId}`);
    }

    shotReference.localReferenceImages.push(image);
    await this.updateShotReference(shotReference);

    logger.debug('[ReferenceSheetService] Added local reference to shot:', shotId, image.id);
  }

  /**
   * Remove a local reference image from a shot
   */
  async removeLocalReference(shotId: string, imageId: string): Promise<void> {
    const shotReference = await this.getShotReference(shotId);
    if (!shotReference) {
      throw new Error(`Shot reference not found: ${shotId}`);
    }

    shotReference.localReferenceImages = shotReference.localReferenceImages.filter(i => i.id !== imageId);
    await this.updateShotReference(shotReference);

    logger.debug('[ReferenceSheetService] Removed local reference from shot:', shotId, imageId);
  }

  /**
   * Add an inherited reference to a shot
   */
  async addInheritedReference(
    shotId: string,
    inheritedId: string,
    source: 'master' | 'sequence'
  ): Promise<void> {
    const shotReference = await this.getShotReference(shotId);
    if (!shotReference) {
      throw new Error(`Shot reference not found: ${shotId}`);
    }

    if (source === 'master') {
      if (!shotReference.inheritedFromMaster.includes(inheritedId)) {
        shotReference.inheritedFromMaster.push(inheritedId);
      }
    } else {
      if (!shotReference.inheritedFromSequence.includes(inheritedId)) {
        shotReference.inheritedFromSequence.push(inheritedId);
      }
    }

    await this.updateShotReference(shotReference);

    logger.debug('[ReferenceSheetService] Added inherited reference to shot:', shotId, inheritedId, source);
  }

  /**
   * Add a consistency override to a shot
   */
  async addConsistencyOverride(shotId: string, override: ConsistencyOverride): Promise<void> {
    const shotReference = await this.getShotReference(shotId);
    if (!shotReference) {
      throw new Error(`Shot reference not found: ${shotId}`);
    }

    shotReference.consistencyOverrides.push(override);
    await this.updateShotReference(shotReference);

    logger.debug('[ReferenceSheetService] Added consistency override to shot:', shotId, override.id);
  }

  /**
   * Remove a consistency override from a shot
   */
  async removeConsistencyOverride(shotId: string, overrideId: string): Promise<void> {
    const shotReference = await this.getShotReference(shotId);
    if (!shotReference) {
      throw new Error(`Shot reference not found: ${shotId}`);
    }

    shotReference.consistencyOverrides = shotReference.consistencyOverrides.filter(o => o.id !== overrideId);
    await this.updateShotReference(shotReference);

    logger.debug('[ReferenceSheetService] Removed consistency override from shot:', shotId, overrideId);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Create a new character appearance sheet
   */
  createCharacterAppearance(
    characterId: string,
    characterName: string
  ): CharacterAppearanceSheet {
    return {
      id: uuidv4(),
      characterId,
      characterName,
      appearanceImages: [],
      styleGuidelines: [],
      colorPalette: [],
      proportions: 'standard',
    };
  }

  /**
   * Create a new appearance image
   */
  createAppearanceImage(
    url: string,
    viewType: AppearanceImage['viewType'],
    description: string
  ): AppearanceImage {
    return {
      id: uuidv4(),
      url,
      viewType,
      description,
    };
  }

  /**
   * Create a new location appearance sheet
   */
  createLocationAppearance(
    locationId: string,
    locationName: string
  ): LocationAppearanceSheet {
    return {
      id: uuidv4(),
      locationId,
      locationName,
      referenceImages: [],
      environmentalGuidelines: [],
    };
  }

  /**
   * Create a new reference image
   */
  createReferenceImage(
    url: string,
    source: ReferenceImage['source'],
    weight: number = 0.5
  ): ReferenceImage {
    return {
      id: uuidv4(),
      url,
      weight,
      source,
    };
  }

  /**
   * Create a new consistency override
   */
  createConsistencyOverride(
    type: ConsistencyOverride['type'],
    targetId: string,
    overrideReason: string
  ): ConsistencyOverride {
    return {
      id: uuidv4(),
      type,
      targetId,
      overrideReason,
    };
  }

  /**
   * Create a new sequence style
   */
  createSequenceStyle(): SequenceStyle {
    return {
      styleOverrides: [],
      pacing: 'moderate',
      transitions: [],
      colorGrading: 'default',
    };
  }

  /**
   * Create a new previous episode reference
   */
  createPreviousEpisodeReference(
    episodeId: string,
    episodeName: string
  ): PreviousEpisodeReference {
    return {
      episodeId,
      episodeName,
      referenceShotIds: [],
      continuityNotes: [],
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const referenceSheetService = new ReferenceSheetService();
