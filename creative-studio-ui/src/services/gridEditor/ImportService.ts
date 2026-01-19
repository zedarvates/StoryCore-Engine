/**
 * Advanced Grid Editor - Import Service
 * 
 * Handles parsing and validation of imported grid configurations from JSON files.
 * Provides error handling and user confirmation for unsaved changes.
 */

import { GridConfiguration } from '../../stores/gridEditorStore';
import { validateGridConfiguration } from '../../types/gridEditor.validation';

export interface ImportOptions {
  validateSchema?: boolean;
  confirmUnsavedChanges?: boolean;
}

export interface ImportResult {
  success: boolean;
  data?: GridConfiguration;
  error?: string;
  validationErrors?: string[];
  warnings?: string[];
}

export interface UnsavedChangesCallback {
  (): Promise<boolean>; // Returns true if user confirms, false if cancelled
}

/**
 * Import Service for Grid Editor configurations
 */
export class ImportService {
  private unsavedChangesCallback?: UnsavedChangesCallback;

  /**
   * Sets the callback for handling unsaved changes confirmation
   */
  setUnsavedChangesCallback(callback: UnsavedChangesCallback): void {
    this.unsavedChangesCallback = callback;
  }

  /**
   * Imports a grid configuration from a file
   * 
   * @param file - The file to import
   * @param options - Import options
   * @param hasUnsavedChanges - Whether there are unsaved changes
   * @returns Import result with parsed configuration or errors
   */
  async importConfiguration(
    file: File,
    options: ImportOptions = { validateSchema: true, confirmUnsavedChanges: true },
    hasUnsavedChanges: boolean = false
  ): Promise<ImportResult> {
    try {
      // Check for unsaved changes
      if (hasUnsavedChanges && options.confirmUnsavedChanges) {
        const confirmed = await this.confirmUnsavedChanges();
        if (!confirmed) {
          return {
            success: false,
            error: 'Import cancelled by user',
          };
        }
      }

      // Validate file type
      if (!this.isValidFileType(file)) {
        return {
          success: false,
          error: 'Invalid file type. Please select a JSON file.',
        };
      }

      // Read file content
      const content = await this.readFileContent(file);
      
      // Parse JSON
      const parsed = this.parseJSON(content);
      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error,
        };
      }

      // Validate schema if requested
      if (options.validateSchema) {
        const validation = this.validateConfiguration(parsed.data!);
        if (!validation.success) {
          return {
            success: false,
            error: 'Configuration validation failed',
            validationErrors: validation.errors,
          };
        }
      }

      // Check for warnings (version mismatch, etc.)
      const warnings = this.checkWarnings(parsed.data!);

      return {
        success: true,
        data: parsed.data,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown import error',
      };
    }
  }

  /**
   * Imports configuration from a JSON string
   */
  async importFromJSON(
    jsonString: string,
    options: ImportOptions = { validateSchema: true },
    hasUnsavedChanges: boolean = false
  ): Promise<ImportResult> {
    try {
      // Check for unsaved changes
      if (hasUnsavedChanges && options.confirmUnsavedChanges) {
        const confirmed = await this.confirmUnsavedChanges();
        if (!confirmed) {
          return {
            success: false,
            error: 'Import cancelled by user',
          };
        }
      }

      // Parse JSON
      const parsed = this.parseJSON(jsonString);
      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error,
        };
      }

      // Validate schema if requested
      if (options.validateSchema) {
        const validation = this.validateConfiguration(parsed.data!);
        if (!validation.success) {
          return {
            success: false,
            error: 'Configuration validation failed',
            validationErrors: validation.errors,
          };
        }
      }

      // Check for warnings
      const warnings = this.checkWarnings(parsed.data!);

      return {
        success: true,
        data: parsed.data,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown import error',
      };
    }
  }

  /**
   * Validates file type
   */
  private isValidFileType(file: File): boolean {
    const validTypes = ['application/json', 'text/json'];
    const validExtensions = ['.json'];
    
    return (
      validTypes.includes(file.type) ||
      validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
  }

  /**
   * Reads file content as text
   */
  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('File reading error'));
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * Parses JSON string
   */
  private parseJSON(content: string): {
    success: boolean;
    data?: GridConfiguration;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(content);
      return { success: true, data: parsed };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return {
          success: false,
          error: `JSON parsing error: ${error.message}`,
        };
      }
      return {
        success: false,
        error: 'Failed to parse JSON',
      };
    }
  }

  /**
   * Validates configuration against schema
   */
  private validateConfiguration(config: unknown): {
    success: boolean;
    errors?: string[];
  } {
    const result = validateGridConfiguration(config);
    
    if (result.success) {
      return { success: true };
    }

    const errors = result.error?.issues.map((err: any) => {
      const path = err.path.join('.');
      return path ? `${path}: ${err.message}` : err.message;
    }) || ['Unknown validation error'];

    return { success: false, errors };
  }

  /**
   * Checks for warnings (version mismatch, deprecated fields, etc.)
   */
  private checkWarnings(config: GridConfiguration): string[] {
    const warnings: string[] = [];

    // Check version compatibility
    if (config.version !== '1.0') {
      warnings.push(`Configuration version ${config.version} may not be fully compatible with current version 1.0`);
    }

    // Check for missing optional fields
    if (!config.metadata.author) {
      warnings.push('Configuration does not include author information');
    }

    // Check for empty panels
    const emptyPanels = config.panels.filter(panel => panel.layers.length === 0);
    if (emptyPanels.length > 0) {
      warnings.push(`${emptyPanels.length} panel(s) have no layers`);
    }

    return warnings;
  }

  /**
   * Prompts user for confirmation if there are unsaved changes
   */
  private async confirmUnsavedChanges(): Promise<boolean> {
    if (this.unsavedChangesCallback) {
      return await this.unsavedChangesCallback();
    }

    // Fallback to browser confirm dialog
    return window.confirm(
      'You have unsaved changes. Importing a new configuration will discard them. Continue?'
    );
  }

  /**
   * Validates that imported configuration has all required panels
   */
  validatePanelCompleteness(config: GridConfiguration): {
    valid: boolean;
    missingPanels?: string[];
  } {
    const expectedPanels = 9; // 3x3 grid
    
    if (config.panels.length !== expectedPanels) {
      return {
        valid: false,
        missingPanels: [`Expected ${expectedPanels} panels, found ${config.panels.length}`],
      };
    }

    // Check for duplicate positions
    const positions = new Set<string>();
    const duplicates: string[] = [];

    for (const panel of config.panels) {
      const posKey = `${panel.position.row}-${panel.position.col}`;
      if (positions.has(posKey)) {
        duplicates.push(posKey);
      }
      positions.add(posKey);
    }

    if (duplicates.length > 0) {
      return {
        valid: false,
        missingPanels: [`Duplicate panel positions: ${duplicates.join(', ')}`],
      };
    }

    return { valid: true };
  }

  /**
   * Sanitizes imported configuration (removes invalid data, applies defaults)
   */
  sanitizeConfiguration(config: GridConfiguration): GridConfiguration {
    return {
      ...config,
      panels: config.panels.map(panel => ({
        ...panel,
        // Ensure layers array exists
        layers: panel.layers || [],
        // Ensure annotations array exists
        annotations: panel.annotations || [],
        // Ensure metadata exists
        metadata: panel.metadata || {},
      })),
      // Ensure presets array exists
      presets: config.presets || [],
    };
  }
}

// Singleton instance
export const importService = new ImportService();
