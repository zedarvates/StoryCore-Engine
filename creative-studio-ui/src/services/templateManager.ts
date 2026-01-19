/**
 * Template Manager Service
 * Manages templates for Production Wizards including CRUD operations,
 * import/export, validation, and storage
 */

import { SequenceTemplate, ShotTemplate, GenerationPreset, AssetTemplate } from '../types';
import {
  SEQUENCE_TEMPLATES,
  getSequenceTemplateById,
  getSequenceTemplatesByCategory,
} from '../data/templates/sequenceTemplates';
import {
  SHOT_TEMPLATES,
  getShotTemplateById,
  getShotTemplatesByCategory,
} from '../data/templates/shotTemplates';
import {
  GENERATION_PRESETS,
  getGenerationPresetById,
  getGenerationPresetsByCategory,
} from '../data/templates/generationPresets';
import {
  assetTemplates,
  getAssetTemplateById,
  getAssetTemplatesByCategory,
} from '../data/assetTemplates';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: string[];
}

export interface ExportData {
  version: string;
  exportDate: string;
  sequenceTemplates: SequenceTemplate[];
  shotTemplates: ShotTemplate[];
  generationPresets: GenerationPreset[];
  assetTemplates: AssetTemplate[];
}

// ============================================================================
// Template Manager Class
// ============================================================================

export class TemplateManager {
  private customSequenceTemplates: Map<string, SequenceTemplate> = new Map();
  private customShotTemplates: Map<string, ShotTemplate> = new Map();
  private customGenerationPresets: Map<string, GenerationPreset> = new Map();
  private customAssetTemplates: Map<string, AssetTemplate> = new Map();

  constructor() {
    this.loadCustomTemplates();
  }

  // ============================================================================
  // Sequence Template Operations
  // ============================================================================

  /**
   * Get all sequence templates (built-in + custom)
   */
  getAllSequenceTemplates(): SequenceTemplate[] {
    const builtIn = SEQUENCE_TEMPLATES;
    const custom = Array.from(this.customSequenceTemplates.values());
    return [...builtIn, ...custom];
  }

  /**
   * Get sequence template by ID
   */
  getSequenceTemplate(id: string): SequenceTemplate | undefined {
    // Check custom templates first
    const custom = this.customSequenceTemplates.get(id);
    if (custom) return custom;

    // Check built-in templates
    return getSequenceTemplateById(id);
  }

  /**
   * Get sequence templates by category
   */
  getSequenceTemplatesByCategory(category: string): SequenceTemplate[] {
    const all = this.getAllSequenceTemplates();
    return all.filter(template => template.category === category);
  }

  /**
   * Create a custom sequence template
   */
  async createSequenceTemplate(template: Omit<SequenceTemplate, 'id' | 'isBuiltIn'>): Promise<SequenceTemplate> {
    // Validate template
    const validation = this.validateSequenceTemplate(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    // Generate ID
    const id = this.generateTemplateId('sequence', template.name);

    const newTemplate: SequenceTemplate = {
      ...template,
      id,
      isBuiltIn: false,
    };

    // Store custom template
    this.customSequenceTemplates.set(id, newTemplate);
    await this.saveCustomTemplates();

    return newTemplate;
  }

  /**
   * Update a sequence template
   */
  async updateSequenceTemplate(id: string, updates: Partial<SequenceTemplate>): Promise<SequenceTemplate> {
    const existing = this.getSequenceTemplate(id);
    if (!existing) {
      throw new Error(`Sequence template not found: ${id}`);
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot modify built-in templates');
    }

    const updated: SequenceTemplate = { ...existing, ...updates };

    // Validate updated template
    const validation = this.validateSequenceTemplate(updated);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    this.customSequenceTemplates.set(id, updated);
    await this.saveCustomTemplates();

    return updated;
  }

  /**
   * Delete a sequence template
   */
  async deleteSequenceTemplate(id: string): Promise<void> {
    const template = this.getSequenceTemplate(id);
    if (!template) {
      throw new Error(`Sequence template not found: ${id}`);
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    this.customSequenceTemplates.delete(id);
    await this.saveCustomTemplates();
  }

  /**
   * Duplicate a sequence template
   */
  async duplicateSequenceTemplate(id: string, newName?: string): Promise<SequenceTemplate> {
    const original = this.getSequenceTemplate(id);
    if (!original) {
      throw new Error(`Sequence template not found: ${id}`);
    }

    const duplicated = {
      ...original,
      name: newName || `${original.name} (Copy)`,
    };

    return this.createSequenceTemplate(duplicated);
  }

  // ============================================================================
  // Shot Template Operations
  // ============================================================================

  /**
   * Get all shot templates (built-in + custom)
   */
  getAllShotTemplates(): ShotTemplate[] {
    const builtIn = SHOT_TEMPLATES;
    const custom = Array.from(this.customShotTemplates.values());
    return [...builtIn, ...custom];
  }

  /**
   * Get shot template by ID
   */
  getShotTemplate(id: string): ShotTemplate | undefined {
    // Check custom templates first
    const custom = this.customShotTemplates.get(id);
    if (custom) return custom;

    // Check built-in templates
    return getShotTemplateById(id);
  }

  /**
   * Get shot templates by category
   */
  getShotTemplatesByCategory(category: string): ShotTemplate[] {
    const all = this.getAllShotTemplates();
    return all.filter(template => template.category === category);
  }

  /**
   * Create a custom shot template
   */
  async createShotTemplate(template: Omit<ShotTemplate, 'id' | 'isBuiltIn'>): Promise<ShotTemplate> {
    // Validate template
    const validation = this.validateShotTemplate(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    // Generate ID
    const id = this.generateTemplateId('shot', template.name);

    const newTemplate: ShotTemplate = {
      ...template,
      id,
      isBuiltIn: false,
    };

    // Store custom template
    this.customShotTemplates.set(id, newTemplate);
    await this.saveCustomTemplates();

    return newTemplate;
  }

  /**
   * Update a shot template
   */
  async updateShotTemplate(id: string, updates: Partial<ShotTemplate>): Promise<ShotTemplate> {
    const existing = this.getShotTemplate(id);
    if (!existing) {
      throw new Error(`Shot template not found: ${id}`);
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot modify built-in templates');
    }

    const updated: ShotTemplate = { ...existing, ...updates };

    // Validate updated template
    const validation = this.validateShotTemplate(updated);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    this.customShotTemplates.set(id, updated);
    await this.saveCustomTemplates();

    return updated;
  }

  /**
   * Delete a shot template
   */
  async deleteShotTemplate(id: string): Promise<void> {
    const template = this.getShotTemplate(id);
    if (!template) {
      throw new Error(`Shot template not found: ${id}`);
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    this.customShotTemplates.delete(id);
    await this.saveCustomTemplates();
  }

  /**
   * Duplicate a shot template
   */
  async duplicateShotTemplate(id: string, newName?: string): Promise<ShotTemplate> {
    const original = this.getShotTemplate(id);
    if (!original) {
      throw new Error(`Shot template not found: ${id}`);
    }

    const duplicated = {
      ...original,
      name: newName || `${original.name} (Copy)`,
    };

    return this.createShotTemplate(duplicated);
  }

  // ============================================================================
  // Generation Preset Operations
  // ============================================================================

  /**
   * Get all generation presets (built-in + custom)
   */
  getAllGenerationPresets(): GenerationPreset[] {
    const builtIn = GENERATION_PRESETS;
    const custom = Array.from(this.customGenerationPresets.values());
    return [...builtIn, ...custom];
  }

  /**
   * Get generation preset by ID
   */
  getGenerationPreset(id: string): GenerationPreset | undefined {
    // Check custom presets first
    const custom = this.customGenerationPresets.get(id);
    if (custom) return custom;

    // Check built-in presets
    return getGenerationPresetById(id);
  }

  /**
   * Get generation presets by category
   */
  getGenerationPresetsByCategory(category: string): GenerationPreset[] {
    const all = this.getAllGenerationPresets();
    return all.filter(preset => preset.category === category);
  }

  /**
   * Create a custom generation preset
   */
  async createGenerationPreset(preset: Omit<GenerationPreset, 'id' | 'isBuiltIn'>): Promise<GenerationPreset> {
    // Validate preset
    const validation = this.validateGenerationPreset(preset);
    if (!validation.isValid) {
      throw new Error(`Invalid preset: ${validation.errors.join(', ')}`);
    }

    // Generate ID
    const id = this.generateTemplateId('preset', preset.name);

    const newPreset: GenerationPreset = {
      ...preset,
      id,
      isBuiltIn: false,
    };

    // Store custom preset
    this.customGenerationPresets.set(id, newPreset);
    await this.saveCustomTemplates();

    return newPreset;
  }

  /**
   * Update a generation preset
   */
  async updateGenerationPreset(id: string, updates: Partial<GenerationPreset>): Promise<GenerationPreset> {
    const existing = this.getGenerationPreset(id);
    if (!existing) {
      throw new Error(`Generation preset not found: ${id}`);
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot modify built-in presets');
    }

    const updated: GenerationPreset = { ...existing, ...updates };

    // Validate updated preset
    const validation = this.validateGenerationPreset(updated);
    if (!validation.isValid) {
      throw new Error(`Invalid preset: ${validation.errors.join(', ')}`);
    }

    this.customGenerationPresets.set(id, updated);
    await this.saveCustomTemplates();

    return updated;
  }

  /**
   * Delete a generation preset
   */
  async deleteGenerationPreset(id: string): Promise<void> {
    const preset = this.getGenerationPreset(id);
    if (!preset) {
      throw new Error(`Generation preset not found: ${id}`);
    }

    if (preset.isBuiltIn) {
      throw new Error('Cannot delete built-in presets');
    }

    this.customGenerationPresets.delete(id);
    await this.saveCustomTemplates();
  }

  // ============================================================================
  // Asset Template Operations
  // ============================================================================

  /**
   * Get all asset templates (built-in + custom)
   */
  getAllAssetTemplates(): AssetTemplate[] {
    const builtIn = assetTemplates;
    const custom = Array.from(this.customAssetTemplates.values());
    return [...builtIn, ...custom];
  }

  /**
   * Get asset template by ID
   */
  getAssetTemplate(id: string): AssetTemplate | undefined {
    // Check custom templates first
    const custom = this.customAssetTemplates.get(id);
    if (custom) return custom;

    // Check built-in templates
    return getAssetTemplateById(id);
  }

  /**
   * Get asset templates by category (using tags)
   */
  getAssetTemplatesByCategory(category: string): AssetTemplate[] {
    const all = this.getAllAssetTemplates();
    return all.filter(template => template.tags.includes(category));
  }

  /**
   * Create a custom asset template
   */
  async createAssetTemplate(template: Omit<AssetTemplate, 'id' | 'isBuiltIn'>): Promise<AssetTemplate> {
    // Validate template
    const validation = this.validateAssetTemplate(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    // Generate ID
    const id = this.generateTemplateId('asset', template.name);

    const newTemplate: AssetTemplate = {
      ...template,
      id,
      isBuiltIn: false,
    };

    // Store custom template
    this.customAssetTemplates.set(id, newTemplate);
    await this.saveCustomTemplates();

    return newTemplate;
  }

  /**
   * Update an asset template
   */
  async updateAssetTemplate(id: string, updates: Partial<AssetTemplate>): Promise<AssetTemplate> {
    const existing = this.getAssetTemplate(id);
    if (!existing) {
      throw new Error(`Asset template not found: ${id}`);
    }

    if (existing.isBuiltIn) {
      throw new Error('Cannot modify built-in templates');
    }

    const updated: AssetTemplate = { ...existing, ...updates };

    // Validate updated template
    const validation = this.validateAssetTemplate(updated);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    this.customAssetTemplates.set(id, updated);
    await this.saveCustomTemplates();

    return updated;
  }

  /**
   * Delete an asset template
   */
  async deleteAssetTemplate(id: string): Promise<void> {
    const template = this.getAssetTemplate(id);
    if (!template) {
      throw new Error(`Asset template not found: ${id}`);
    }

    if (template.isBuiltIn) {
      throw new Error('Cannot delete built-in templates');
    }

    this.customAssetTemplates.delete(id);
    await this.saveCustomTemplates();
  }

  /**
   * Duplicate an asset template
   */
  async duplicateAssetTemplate(id: string, newName?: string): Promise<AssetTemplate> {
    const original = this.getAssetTemplate(id);
    if (!original) {
      throw new Error(`Asset template not found: ${id}`);
    }

    const duplicated = {
      ...original,
      name: newName || `${original.name} (Copy)`,
    };

    return this.createAssetTemplate(duplicated);
  }

  // ============================================================================
  // Import/Export Operations
  // ============================================================================

  /**
   * Export all templates as JSON
   */
  exportTemplates(): ExportData {
    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      sequenceTemplates: Array.from(this.customSequenceTemplates.values()),
      shotTemplates: Array.from(this.customShotTemplates.values()),
      generationPresets: Array.from(this.customGenerationPresets.values()),
      assetTemplates: Array.from(this.customAssetTemplates.values()),
    };
  }

  /**
   * Import templates from JSON
   */
  async importTemplates(data: ExportData): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Validate version compatibility
      if (data.version !== '1.0') {
        result.errors.push(`Unsupported version: ${data.version}`);
        return result;
      }

      // Import sequence templates
      for (const template of data.sequenceTemplates || []) {
        try {
          await this.createSequenceTemplate(template);
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Sequence template "${template.name}": ${error}`);
        }
      }

      // Import shot templates
      for (const template of data.shotTemplates || []) {
        try {
          await this.createShotTemplate(template);
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Shot template "${template.name}": ${error}`);
        }
      }

      // Import generation presets
      for (const preset of data.generationPresets || []) {
        try {
          await this.createGenerationPreset(preset);
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Generation preset "${preset.name}": ${error}`);
        }
      }

      // Import asset templates
      for (const template of data.assetTemplates || []) {
        try {
          await this.createAssetTemplate(template);
          result.imported++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Asset template "${template.name}": ${error}`);
        }
      }

      result.success = result.failed === 0;
      return result;
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
      return result;
    }
  }

  // ============================================================================
  // Validation Methods
  // ============================================================================

  /**
   * Validate a sequence template
   */
  validateSequenceTemplate(template: Partial<SequenceTemplate>): TemplateValidationResult {
    const result: TemplateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Required fields
    if (!template.name?.trim()) {
      result.errors.push('Name is required');
      result.isValid = false;
    }

    if (!template.description?.trim()) {
      result.errors.push('Description is required');
      result.isValid = false;
    }

    if (!template.category) {
      result.errors.push('Category is required');
      result.isValid = false;
    }

    if (!template.structure?.acts?.length) {
      result.errors.push('At least one act is required');
      result.isValid = false;
    }

    // Validate act durations sum
    if (template.defaults?.targetDuration && template.structure?.acts) {
      const totalActDuration = template.structure.acts.reduce((sum, act) => sum + act.targetDuration, 0);
      if (totalActDuration > template.defaults.targetDuration) {
        result.warnings.push('Total act duration exceeds sequence target duration');
      }
    }

    // TODO: Add Zod schema validation when schemas are properly exported

    return result;
  }

  /**
   * Validate a shot template
   */
  validateShotTemplate(template: Partial<ShotTemplate>): TemplateValidationResult {
    const result: TemplateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Required fields
    if (!template.name?.trim()) {
      result.errors.push('Name is required');
      result.isValid = false;
    }

    if (!template.description?.trim()) {
      result.errors.push('Description is required');
      result.isValid = false;
    }

    if (!template.category) {
      result.errors.push('Category is required');
      result.isValid = false;
    }

    if (!template.configuration) {
      result.errors.push('Configuration is required');
      result.isValid = false;
    }

    // TODO: Add Zod schema validation when schemas are properly exported

    return result;
  }

  /**
   * Validate a generation preset
   */
  validateGenerationPreset(preset: Partial<GenerationPreset>): TemplateValidationResult {
    const result: TemplateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Required fields
    if (!preset.name?.trim()) {
      result.errors.push('Name is required');
      result.isValid = false;
    }

    if (!preset.description?.trim()) {
      result.errors.push('Description is required');
      result.isValid = false;
    }

    if (!preset.category) {
      result.errors.push('Category is required');
      result.isValid = false;
    }

    if (!preset.parameters) {
      result.errors.push('Parameters are required');
      result.isValid = false;
    }

    // TODO: Add Zod schema validation when schemas are properly exported

    return result;
  }

  /**
   * Validate an asset template
   */
  validateAssetTemplate(template: Partial<AssetTemplate>): TemplateValidationResult {
    const result: TemplateValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Required fields
    if (!template.name?.trim()) {
      result.errors.push('Name is required');
      result.isValid = false;
    }

    if (!template.description?.trim()) {
      result.errors.push('Description is required');
      result.isValid = false;
    }

    if (!template.genre) {
      result.errors.push('Genre is required');
      result.isValid = false;
    }

    if (!template.visualStyle) {
      result.errors.push('Visual style is required');
      result.isValid = false;
    }

    if (!template.lighting) {
      result.errors.push('Lighting is required');
      result.isValid = false;
    }

    if (!template.moodAtmosphere) {
      result.errors.push('Mood atmosphere is required');
      result.isValid = false;
    }

    if (!template.colorPalette) {
      result.errors.push('Color palette is required');
      result.isValid = false;
    }

    if (!template.timeOfDay) {
      result.errors.push('Time of day is required');
      result.isValid = false;
    }

    if (!template.universeType) {
      result.errors.push('Universe type is required');
      result.isValid = false;
    }

    if (!template.tags?.length) {
      result.errors.push('At least one tag is required');
      result.isValid = false;
    }

    // TODO: Add Zod schema validation when schemas are properly exported

    return result;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private generateTemplateId(type: string, name: string): string {
    const baseId = `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    let id = baseId;
    let counter = 1;

    // Ensure uniqueness
    while (
      this.customSequenceTemplates.has(id) ||
      this.customShotTemplates.has(id) ||
      this.customGenerationPresets.has(id) ||
      this.customAssetTemplates.has(id)
    ) {
      id = `${baseId}-${counter}`;
      counter++;
    }

    return id;
  }

  private async saveCustomTemplates(): Promise<void> {
    const data = {
      sequenceTemplates: Array.from(this.customSequenceTemplates.entries()),
      shotTemplates: Array.from(this.customShotTemplates.entries()),
      generationPresets: Array.from(this.customGenerationPresets.entries()),
      assetTemplates: Array.from(this.customAssetTemplates.entries()),
    };

    // Use draftStorage for persistence
    // This will be implemented when we integrate with the draft storage service
    console.log('Saving custom templates:', data);
  }

  private async loadCustomTemplates(): Promise<void> {
    try {
      // Load from draftStorage
      // This will be implemented when we integrate with the draft storage service
      console.log('Loading custom templates...');
    } catch (error) {
      console.warn('Failed to load custom templates:', error);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const templateManager = new TemplateManager();