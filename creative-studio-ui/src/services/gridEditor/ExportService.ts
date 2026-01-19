/**
 * Advanced Grid Editor - Export Service
 * 
 * Handles serialization and export of grid configurations to JSON or ZIP formats.
 * Validates exported data against schema and generates downloadable files.
 */

import { GridConfiguration } from '../../stores/gridEditorStore';
import { validateGridConfiguration, GridConfigurationSchema } from '../../types/gridEditor.validation';

export type ExportFormat = 'json' | 'zip';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  prettyPrint?: boolean;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  error?: string;
  validationErrors?: string[];
}

/**
 * Export Service for Grid Editor configurations
 */
export class ExportService {
  /**
   * Exports a grid configuration to a downloadable file
   * 
   * @param config - The grid configuration to export
   * @param options - Export options (format, metadata, etc.)
   * @returns Export result with blob and filename
   */
  async exportConfiguration(
    config: GridConfiguration,
    options: ExportOptions = { format: 'json', prettyPrint: true }
  ): Promise<ExportResult> {
    try {
      // Validate configuration before export
      const validation = this.validateConfiguration(config);
      if (!validation.success) {
        return {
          success: false,
          error: 'Configuration validation failed',
          validationErrors: validation.errors,
        };
      }

      // Update modified timestamp
      const exportConfig: GridConfiguration = {
        ...config,
        metadata: {
          ...config.metadata,
          modifiedAt: new Date().toISOString(),
        },
      };

      // Generate export based on format
      if (options.format === 'json') {
        return await this.exportAsJSON(exportConfig, options);
      } else if (options.format === 'zip') {
        return await this.exportAsZIP(exportConfig, options);
      }

      return {
        success: false,
        error: `Unsupported export format: ${options.format}`,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  }

  /**
   * Exports configuration as JSON file
   */
  private async exportAsJSON(
    config: GridConfiguration,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const jsonString = options.prettyPrint
        ? JSON.stringify(config, null, 2)
        : JSON.stringify(config);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const filename = this.generateFilename(config, 'json');

      return {
        success: true,
        blob,
        filename,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON export failed',
      };
    }
  }

  /**
   * Exports configuration as ZIP file (with images and metadata)
   * Note: This is a placeholder for future implementation with JSZip
   */
  private async exportAsZIP(
    config: GridConfiguration,
    options: ExportOptions
  ): Promise<ExportResult> {
    // For now, export as JSON with a note about ZIP support
    // In production, this would use JSZip to bundle images and config
    const jsonResult = await this.exportAsJSON(config, options);
    
    if (!jsonResult.success) {
      return jsonResult;
    }

    return {
      ...jsonResult,
      filename: this.generateFilename(config, 'zip'),
      error: 'ZIP export not yet implemented - exported as JSON',
    };
  }

  /**
   * Validates configuration against schema
   */
  private validateConfiguration(config: GridConfiguration): {
    success: boolean;
    errors?: string[];
  } {
    const result = validateGridConfiguration(config);
    
    if (result.success) {
      return { success: true };
    }

    // ZodError has an 'issues' property, not 'errors'
    const errors = result.error?.issues.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ) || ['Unknown validation error'];

    return { success: false, errors };
  }

  /**
   * Generates a filename for the export
   */
  private generateFilename(config: GridConfiguration, extension: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const projectName = config.projectId.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    return `grid-config-${projectName}-${timestamp}.${extension}`;
  }

  /**
   * Triggers browser download of the exported file
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Exports a single panel as an image
   * Note: This requires canvas rendering and is a placeholder
   */
  async exportPanelAsImage(
    panelId: string,
    resolution: { width: number; height: number }
  ): Promise<ExportResult> {
    // Placeholder for future implementation
    return {
      success: false,
      error: 'Panel image export not yet implemented',
    };
  }

  /**
   * Exports the entire grid as a single image
   * Note: This requires canvas rendering and is a placeholder
   */
  async exportGridAsImage(
    config: GridConfiguration,
    resolution: { width: number; height: number }
  ): Promise<ExportResult> {
    // Placeholder for future implementation
    return {
      success: false,
      error: 'Grid image export not yet implemented',
    };
  }
}

// Singleton instance
export const exportService = new ExportService();
