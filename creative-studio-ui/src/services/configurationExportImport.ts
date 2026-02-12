/**
 * Configuration Export/Import Service
 * 
 * Handles exporting and importing configuration files
 */

import type { ProjectConfiguration, GlobalConfiguration } from '../types/configuration';
import { validateProjectConfiguration } from './configurationValidator';

export interface ExportMetadata {
  exportedAt: string;
  exportedBy?: string;
  version: string;
  type: 'project' | 'global';
}

export interface ExportedConfiguration {
  metadata: ExportMetadata;
  configuration: ProjectConfiguration | GlobalConfiguration;
}

export interface ImportResult {
  success: boolean;
  configuration?: ProjectConfiguration | GlobalConfiguration;
  errors?: string[];
  warnings?: string[];
}

/**
 * Export configuration to JSON file
 */
export function exportConfiguration(
  configuration: ProjectConfiguration | GlobalConfiguration,
  type: 'project' | 'global',
  filename?: string
): void {
  const exportData: ExportedConfiguration = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      type,
    },
    configuration,
  };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const defaultFilename = type === 'project'
    ? `project-config-${Date.now()}.json`
    : `global-config-${Date.now()}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export project configuration
 */
export function exportProjectConfiguration(
  configuration: ProjectConfiguration,
  projectName?: string
): void {
  const filename = projectName
    ? `${projectName}-config-${Date.now()}.json`
    : undefined;
  
  exportConfiguration(configuration, 'project', filename);
}

/**
 * Export global configuration
 */
export function exportGlobalConfiguration(
  configuration: GlobalConfiguration
): void {
  exportConfiguration(configuration, 'global');
}

/**
 * Import configuration from JSON file
 */
export async function importConfiguration(
  file: File
): Promise<ImportResult> {
  try {
    // Read file content
    const content = await readFileAsText(file);
    
    // Parse JSON
    let exportedData: ExportedConfiguration;
    try {
      exportedData = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        errors: ['Invalid JSON format'],
      };
    }

    // Validate structure
    if (!exportedData.metadata || !exportedData.configuration) {
      return {
        success: false,
        errors: ['Invalid configuration file structure'],
      };
    }

    // Validate configuration
    // Note: For now we only validate project configurations
    // Global configurations don't have a specific validator yet
    let validation: { isValid: boolean; errors: string[] } = { isValid: true, errors: [] };
    
    if (exportedData.metadata.type === 'project') {
      const validationResult = validateProjectConfiguration(exportedData.configuration as ProjectConfiguration);
      validation = {
        isValid: validationResult.isValid,
        errors: validationResult.errors.map(e => e.message),
      };
    }
    
    if (!validation.isValid) {
      return {
        success: false,
        configuration: exportedData.configuration,
        errors: validation.errors,
      };
    }

    // Check for warnings (version mismatch, etc.)
    const warnings: string[] = [];
    
    if (exportedData.metadata.version !== '1.0.0') {
      warnings.push(`Configuration was exported with version ${exportedData.metadata.version}, current version is 1.0.0`);
    }

    return {
      success: true,
      configuration: exportedData.configuration,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to import configuration'],
    };
  }
}

/**
 * Import configuration from JSON string
 */
export function importConfigurationFromJSON(
  json: string
): ImportResult {
  try {
    const exportedData: ExportedConfiguration = JSON.parse(json);

    if (!exportedData.metadata || !exportedData.configuration) {
      return {
        success: false,
        errors: ['Invalid configuration file structure'],
      };
    }

    const validation = validateProjectConfiguration(exportedData.configuration as ProjectConfiguration);
    
    if (!validation.isValid) {
      return {
        success: false,
        configuration: exportedData.configuration,
        errors: validation.errors.map(e => e.message),
      };
    }

    const warnings: string[] = [];
    
    if (exportedData.metadata.version !== '1.0.0') {
      warnings.push(`Configuration version mismatch: ${exportedData.metadata.version} vs 1.0.0`);
    }

    return {
      success: true,
      configuration: exportedData.configuration,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Failed to parse configuration'],
    };
  }
}

/**
 * Helper function to read file as text
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result) {
        resolve(event.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Validate imported configuration compatibility
 */
export function validateImportCompatibility(
  importedConfig: ProjectConfiguration | GlobalConfiguration,
  currentConfig: ProjectConfiguration | GlobalConfiguration
): {
  compatible: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for missing fields in imported config
  const currentKeys = Object.keys(currentConfig);
  const importedKeys = Object.keys(importedConfig);

  const missingKeys = currentKeys.filter(key => !importedKeys.includes(key));
  if (missingKeys.length > 0) {
    warnings.push(`Imported configuration is missing fields: ${missingKeys.join(', ')}`);
  }

  // Check for extra fields in imported config
  const extraKeys = importedKeys.filter(key => !currentKeys.includes(key));
  if (extraKeys.length > 0) {
    warnings.push(`Imported configuration has extra fields: ${extraKeys.join(', ')}`);
  }

  return {
    compatible: warnings.length === 0,
    warnings,
  };
}

/**
 * Merge configurations (useful for partial imports)
 */
export function mergeConfigurations<T extends Record<string, unknown>>(
  base: T,
  imported: Partial<T>,
  overwrite: boolean = true
): T {
  if (overwrite) {
    return {
      ...base,
      ...imported,
    };
  }

  // Only merge non-existing fields
  const merged = { ...base };
  
  for (const key in imported) {
    if (!(key in base)) {
      merged[key] = imported[key] as any;
    }
  }

  return merged;
}

/**
 * Create configuration backup
 */
export function createConfigurationBackup(
  configuration: ProjectConfiguration | GlobalConfiguration,
  type: 'project' | 'global'
): string {
  const backup: ExportedConfiguration = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      type,
    },
    configuration,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restore configuration from backup
 */
export function restoreConfigurationFromBackup(
  backup: string
): ImportResult {
  return importConfigurationFromJSON(backup);
}

