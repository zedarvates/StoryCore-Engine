/**
 * Grid Editor Configuration Export/Import Service
 * 
 * Handles exporting and importing grid editor configurations in multiple formats.
 * Supports JSON, YAML, and URL-encoded configurations for sharing.
 * 
 * Exigences: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8
 */

import type { GridLayoutConfig, GridPanel } from '../../types/gridEditorAdvanced';

// ============================================================================
// Types
// ============================================================================

export interface GridEditorConfiguration {
  // Grid layout settings
  layout: GridLayoutConfig;
  
  // Visual preferences
  visualPreferences: {
    theme?: 'light' | 'dark';
    showGridLines: boolean;
    showAlignmentGuides: boolean;
    animationsEnabled: boolean;
  };
  
  // Snap settings
  snapSettings: {
    enabled: boolean;
    threshold: number;
    gridSizes: number[];
  };
  
  // Optional: Panel positions (for full state export)
  panels?: GridPanel[];
}

export interface GridEditorTemplate {
  // Template metadata
  name: string;
  description?: string;
  author?: string;
  tags?: string[];
  
  // Reusable configuration (no panel positions)
  layout: Omit<GridLayoutConfig, 'rows'>; // Rows are dynamic
  visualPreferences: GridEditorConfiguration['visualPreferences'];
  snapSettings: GridEditorConfiguration['snapSettings'];
}

export interface ExportMetadata {
  version: string;
  exportedAt: string;
  exportedBy?: string;
  type: 'full' | 'template';
  format: 'json' | 'yaml' | 'url';
}

export interface ExportedGridConfiguration {
  metadata: ExportMetadata;
  configuration: GridEditorConfiguration | GridEditorTemplate;
}

export interface ImportResult {
  success: boolean;
  configuration?: GridEditorConfiguration | GridEditorTemplate;
  errors?: string[];
  warnings?: string[];
  conflicts?: ConfigurationConflict[];
}

export interface ConfigurationConflict {
  field: string;
  currentValue: any;
  importedValue: any;
  suggestion: 'keep_current' | 'use_imported' | 'merge';
}

export type ExportFormat = 'json' | 'yaml' | 'url';

// ============================================================================
// Constants
// ============================================================================

const CURRENT_VERSION = '1.0.0';
const URL_PREFIX = 'storycore://grid-config/';

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export grid editor configuration
 * Exigences: 15.1, 15.3, 15.7
 */
export function exportGridConfiguration(
  configuration: GridEditorConfiguration,
  format: ExportFormat = 'json',
  filename?: string
): void {
  const exportData: ExportedGridConfiguration = {
    metadata: {
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      type: 'full',
      format
    },
    configuration
  };

  switch (format) {
    case 'json':
      exportAsJSON(exportData, filename);
      break;
    case 'yaml':
      exportAsYAML(exportData, filename);
      break;
    case 'url':
      exportAsURL(exportData);
      break;
  }
}

/**
 * Export as template (reusable configuration without panel positions)
 * Exigence: 15.6
 */
export function exportAsTemplate(
  configuration: GridEditorConfiguration,
  templateInfo: Pick<GridEditorTemplate, 'name' | 'description' | 'author' | 'tags'>,
  format: ExportFormat = 'json',
  filename?: string
): void {
  // Filter out non-reusable parameters
  const template: GridEditorTemplate = {
    ...templateInfo,
    layout: {
      columns: configuration.layout.columns,
      gap: configuration.layout.gap,
      cellSize: configuration.layout.cellSize,
      snapEnabled: configuration.layout.snapEnabled,
      snapThreshold: configuration.layout.snapThreshold,
      showGridLines: configuration.layout.showGridLines
    },
    visualPreferences: configuration.visualPreferences,
    snapSettings: configuration.snapSettings
  };

  const exportData: ExportedGridConfiguration = {
    metadata: {
      version: CURRENT_VERSION,
      exportedAt: new Date().toISOString(),
      type: 'template',
      format
    },
    configuration: template
  };

  switch (format) {
    case 'json':
      exportAsJSON(exportData, filename || `${templateInfo.name}-template.json`);
      break;
    case 'yaml':
      exportAsYAML(exportData, filename || `${templateInfo.name}-template.yaml`);
      break;
    case 'url':
      exportAsURL(exportData);
      break;
  }
}

/**
 * Export as JSON file
 */
function exportAsJSON(data: ExportedGridConfiguration, filename?: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadFile(blob, filename || `grid-config-${Date.now()}.json`);
}

/**
 * Export as YAML file
 */
function exportAsYAML(data: ExportedGridConfiguration, filename?: string): void {
  const yaml = convertToYAML(data);
  const blob = new Blob([yaml], { type: 'text/yaml' });
  downloadFile(blob, filename || `grid-config-${Date.now()}.yaml`);
}

/**
 * Export as shareable URL
 * Exigence: 15.4
 */
function exportAsURL(data: ExportedGridConfiguration): void {
  const json = JSON.stringify(data);
  const base64 = btoa(encodeURIComponent(json));
  const url = `${URL_PREFIX}${base64}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(url).then(() => {
    console.log('Configuration URL copied to clipboard:', url);
    // Show notification to user
    showNotification('Configuration URL copied to clipboard!', 'success');
  }).catch(err => {
    console.error('Failed to copy URL:', err);
    showNotification('Failed to copy URL to clipboard', 'error');
  });
}

// ============================================================================
// Import Functions
// ============================================================================

/**
 * Import configuration from file
 * Exigences: 15.2, 15.5, 15.8
 */
export async function importGridConfiguration(
  file: File
): Promise<ImportResult> {
  try {
    const content = await readFileAsText(file);
    const format = detectFormat(file.name, content);
    
    let exportedData: ExportedGridConfiguration;
    
    switch (format) {
      case 'json':
        exportedData = JSON.parse(content);
        break;
      case 'yaml':
        exportedData = parseYAML(content);
        break;
      default:
        return {
          success: false,
          errors: ['Unsupported file format. Please use JSON or YAML.']
        };
    }
    
    return validateAndProcessImport(exportedData);
  } catch (error) {
    return {
      success: false,
      errors: [
        error instanceof Error ? error.message : 'Failed to import configuration',
        'Please check that the file is a valid grid configuration export.'
      ]
    };
  }
}

/**
 * Import configuration from URL
 * Exigence: 15.4
 */
export function importFromURL(url: string): ImportResult {
  try {
    if (!url.startsWith(URL_PREFIX)) {
      return {
        success: false,
        errors: ['Invalid configuration URL format']
      };
    }
    
    const base64 = url.substring(URL_PREFIX.length);
    const json = decodeURIComponent(atob(base64));
    const exportedData: ExportedGridConfiguration = JSON.parse(json);
    
    return validateAndProcessImport(exportedData);
  } catch (error) {
    return {
      success: false,
      errors: [
        'Failed to decode configuration URL',
        'The URL may be corrupted or invalid.'
      ]
    };
  }
}

/**
 * Import configuration from JSON string
 */
export function importFromJSON(json: string): ImportResult {
  try {
    const exportedData: ExportedGridConfiguration = JSON.parse(json);
    return validateAndProcessImport(exportedData);
  } catch (error) {
    return {
      success: false,
      errors: [
        'Invalid JSON format',
        error instanceof Error ? error.message : 'Failed to parse JSON'
      ]
    };
  }
}

// ============================================================================
// Validation and Processing
// ============================================================================

/**
 * Validate and process imported configuration
 * Exigences: 15.2, 15.8
 */
function validateAndProcessImport(
  exportedData: ExportedGridConfiguration
): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate structure
  if (!exportedData.metadata || !exportedData.configuration) {
    errors.push('Invalid configuration file structure');
    errors.push('The file must contain metadata and configuration sections.');
    return { success: false, errors };
  }
  
  // Validate version
  if (exportedData.metadata.version !== CURRENT_VERSION) {
    warnings.push(
      `Configuration version mismatch: ${exportedData.metadata.version} vs ${CURRENT_VERSION}`,
      'Some features may not work as expected.'
    );
  }
  
  // Validate configuration content
  const configErrors = validateConfiguration(exportedData.configuration);
  if (configErrors.length > 0) {
    errors.push(...configErrors);
    errors.push('Suggestions:');
    errors.push('- Check that all required fields are present');
    errors.push('- Verify that numeric values are within valid ranges');
    errors.push('- Ensure boolean fields are true or false');
    return { success: false, errors };
  }
  
  return {
    success: true,
    configuration: exportedData.configuration,
    warnings: warnings.length > 0 ? warnings : undefined
  };
}

/**
 * Validate configuration content
 */
function validateConfiguration(
  config: GridEditorConfiguration | GridEditorTemplate
): string[] {
  const errors: string[] = [];
  
  // Check if it's a template or full configuration
  const isTemplate = 'name' in config;
  
  if (isTemplate) {
    const template = config as GridEditorTemplate;
    
    if (!template.name || template.name.trim() === '') {
      errors.push('Template name is required');
    }
    
    if (!template.layout) {
      errors.push('Template layout configuration is missing');
    }
  } else {
    const fullConfig = config as GridEditorConfiguration;
    
    if (!fullConfig.layout) {
      errors.push('Layout configuration is missing');
    }
  }
  
  // Validate layout
  const layout = config.layout;
  if (layout) {
    if (layout.columns < 1 || layout.columns > 12) {
      errors.push('Columns must be between 1 and 12');
    }
    
    if (layout.gap < 0 || layout.gap > 100) {
      errors.push('Gap must be between 0 and 100');
    }
    
    if (!layout.cellSize || layout.cellSize.width <= 0 || layout.cellSize.height <= 0) {
      errors.push('Cell size must be positive');
    }
    
    if (layout.snapThreshold < 0 || layout.snapThreshold > 50) {
      errors.push('Snap threshold must be between 0 and 50');
    }
  }
  
  // Validate visual preferences
  if (config.visualPreferences) {
    const prefs = config.visualPreferences;
    
    if (prefs.theme && !['light', 'dark'].includes(prefs.theme)) {
      errors.push('Theme must be "light" or "dark"');
    }
  }
  
  // Validate snap settings
  if (config.snapSettings) {
    const snap = config.snapSettings;
    
    if (snap.gridSizes && snap.gridSizes.length > 0) {
      const invalidSizes = snap.gridSizes.filter(size => size <= 0 || size > 100);
      if (invalidSizes.length > 0) {
        errors.push('Grid sizes must be between 1 and 100');
      }
    }
  }
  
  return errors;
}

/**
 * Detect conflicts between current and imported configuration
 * Exigence: 15.5
 */
export function detectConflicts(
  currentConfig: GridEditorConfiguration,
  importedConfig: GridEditorConfiguration | GridEditorTemplate
): ConfigurationConflict[] {
  const conflicts: ConfigurationConflict[] = [];
  
  // Check layout conflicts
  if ('layout' in importedConfig) {
    const current = currentConfig.layout;
    const imported = importedConfig.layout;
    
    if (current.columns !== imported.columns) {
      conflicts.push({
        field: 'layout.columns',
        currentValue: current.columns,
        importedValue: imported.columns,
        suggestion: 'use_imported'
      });
    }
    
    if (current.gap !== imported.gap) {
      conflicts.push({
        field: 'layout.gap',
        currentValue: current.gap,
        importedValue: imported.gap,
        suggestion: 'use_imported'
      });
    }
    
    if (current.snapEnabled !== imported.snapEnabled) {
      conflicts.push({
        field: 'layout.snapEnabled',
        currentValue: current.snapEnabled,
        importedValue: imported.snapEnabled,
        suggestion: 'use_imported'
      });
    }
  }
  
  // Check visual preferences conflicts
  if (importedConfig.visualPreferences) {
    const current = currentConfig.visualPreferences;
    const imported = importedConfig.visualPreferences;
    
    if (current.theme !== imported.theme) {
      conflicts.push({
        field: 'visualPreferences.theme',
        currentValue: current.theme,
        importedValue: imported.theme,
        suggestion: 'keep_current'
      });
    }
  }
  
  return conflicts;
}

/**
 * Resolve conflicts by applying resolution strategy
 * Exigence: 15.5
 */
export function resolveConflicts(
  currentConfig: GridEditorConfiguration,
  importedConfig: GridEditorConfiguration | GridEditorTemplate,
  conflicts: ConfigurationConflict[],
  resolutionStrategy: 'keep_current' | 'use_imported' | 'merge' = 'use_imported'
): GridEditorConfiguration {
  let resolved = { ...currentConfig };
  
  for (const conflict of conflicts) {
    const strategy = resolutionStrategy === 'merge' 
      ? conflict.suggestion 
      : resolutionStrategy;
    
    if (strategy === 'use_imported') {
      // Apply imported value
      setNestedValue(resolved, conflict.field, conflict.importedValue);
    }
    // If 'keep_current', do nothing (already has current value)
  }
  
  return resolved;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert object to YAML format
 */
function convertToYAML(data: ExportedGridConfiguration): string {
  // Simple YAML converter (for basic structures)
  const lines: string[] = [];
  
  lines.push('# Grid Editor Configuration');
  lines.push('# Generated by StoryCore-Engine');
  lines.push('');
  lines.push('metadata:');
  lines.push(`  version: "${data.metadata.version}"`);
  lines.push(`  exportedAt: "${data.metadata.exportedAt}"`);
  lines.push(`  type: "${data.metadata.type}"`);
  lines.push(`  format: "${data.metadata.format}"`);
  lines.push('');
  lines.push('configuration:');
  
  const config = data.configuration;
  
  if ('name' in config) {
    // Template
    const template = config as GridEditorTemplate;
    lines.push(`  name: "${template.name}"`);
    if (template.description) {
      lines.push(`  description: "${template.description}"`);
    }
  }
  
  lines.push('  layout:');
  lines.push(`    columns: ${config.layout.columns}`);
  lines.push(`    gap: ${config.layout.gap}`);
  lines.push(`    cellSize:`);
  lines.push(`      width: ${config.layout.cellSize.width}`);
  lines.push(`      height: ${config.layout.cellSize.height}`);
  lines.push(`    snapEnabled: ${config.layout.snapEnabled}`);
  lines.push(`    snapThreshold: ${config.layout.snapThreshold}`);
  lines.push(`    showGridLines: ${config.layout.showGridLines}`);
  
  lines.push('  visualPreferences:');
  if (config.visualPreferences.theme) {
    lines.push(`    theme: "${config.visualPreferences.theme}"`);
  }
  lines.push(`    showGridLines: ${config.visualPreferences.showGridLines}`);
  lines.push(`    showAlignmentGuides: ${config.visualPreferences.showAlignmentGuides}`);
  lines.push(`    animationsEnabled: ${config.visualPreferences.animationsEnabled}`);
  
  lines.push('  snapSettings:');
  lines.push(`    enabled: ${config.snapSettings.enabled}`);
  lines.push(`    threshold: ${config.snapSettings.threshold}`);
  lines.push(`    gridSizes: [${config.snapSettings.gridSizes.join(', ')}]`);
  
  return lines.join('\n');
}

/**
 * Parse YAML content (basic parser)
 */
function parseYAML(content: string): ExportedGridConfiguration {
  // For production, use a proper YAML parser like js-yaml
  // This is a simplified version for demonstration
  
  try {
    // Try to extract JSON-like structure from YAML
    // This is a very basic implementation
    const lines = content.split('\n');
    const result: any = { metadata: {}, configuration: {} };
    
    let currentSection: any = result;
    let currentPath: string[] = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('#') || line.trim() === '') continue;
      
      const match = line.match(/^(\s*)(\w+):\s*(.*)$/);
      if (match) {
        const indent = match[1].length;
        const key = match[2];
        let value: any = match[3];
        
        // Parse value
        if (value === 'true') value = true;
        else if (value === 'false') value = false;
        else if (value.match(/^\d+$/)) value = parseInt(value);
        else if (value.match(/^\d+\.\d+$/)) value = parseFloat(value);
        else if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        
        // Set value in result
        if (indent === 0) {
          currentSection = result[key] = value || {};
          currentPath = [key];
        } else {
          // Nested value
          let target = result;
          for (const p of currentPath) {
            target = target[p];
          }
          target[key] = value || {};
        }
      }
    }
    
    return result as ExportedGridConfiguration;
  } catch (error) {
    throw new Error('Failed to parse YAML: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Detect file format
 */
function detectFormat(filename: string, content: string): ExportFormat {
  if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
    return 'yaml';
  }
  
  if (filename.endsWith('.json')) {
    return 'json';
  }
  
  // Try to detect from content
  try {
    JSON.parse(content);
    return 'json';
  } catch {
    return 'yaml';
  }
}

/**
 * Read file as text
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
 * Download file
 */
function downloadFile(blob: Blob, filename: string): void {
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
 * Set nested value in object
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
}

/**
 * Show notification to user
 */
function showNotification(message: string, type: 'success' | 'error' | 'info'): void {
  // This should integrate with your notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // For now, use a simple alert (replace with proper notification UI)
  if (typeof window !== 'undefined') {
    // You can integrate with a toast notification library here
    const event = new CustomEvent('grid-config-notification', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }
}
