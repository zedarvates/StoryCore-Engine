/**
 * Project Diagnostic Service
 * 
 * Comprehensive diagnostic system for detecting and reporting
 * data persistence issues in StoryCore projects.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectConfig } from './ProjectValidator';

export interface DiagnosticResult {
  timestamp: string;
  projectPath: string;
  overallStatus: 'healthy' | 'warning' | 'critical';
  issues: DiagnosticIssue[];
  checks: DiagnosticCheck[];
  recommendations: string[];
}

export interface DiagnosticIssue {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'images' | 'header' | 'variables' | 'structure' | 'integrity';
  title: string;
  description: string;
  affectedPath?: string;
  possibleFix?: string;
}

export interface DiagnosticCheck {
  name: string;
  status: 'passed' | 'failed' | 'skipped' | 'warning';
  details: string;
  timestamp: string;
}

export interface ImageDiagnostic {
  path: string;
  url: string;
  isValid: boolean;
  isLocal: boolean;
  exists: boolean;
  size?: number;
  issue?: string;
}

export interface ProjectMetadata {
  hasSummary: boolean;
  summary?: string;
  hasHeader: boolean;
  header?: string;
  lastSaved?: string;
  schemaVersion?: string;
}

export interface StateVariableDiagnostic {
  key: string;
  expectedValue?: unknown;
  actualValue?: unknown;
  isPersisted: boolean;
  isLoaded: boolean;
  issue?: string;
}

/**
 * Project Diagnostic Service
 * Provides comprehensive diagnostics for project data integrity
 */
export class ProjectDiagnosticService {
  private projectPath: string;
  private configPath: string;
  private imagesPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.configPath = path.join(projectPath, 'project.json');
    this.imagesPath = path.join(projectPath, 'images');
  }

  /**
   * Run all diagnostic checks on the project
   */
  async runFullDiagnostic(): Promise<DiagnosticResult> {
    const issues: DiagnosticIssue[] = [];
    const checks: DiagnosticCheck[] = [];
    const recommendations: string[] = [];
    const startTime = new Date().toISOString();

    // Run all diagnostic checks
    const structureResult = await this.checkProjectStructure();
    checks.push(structureResult.check);
    issues.push(...structureResult.issues);

    const configResult = await this.checkConfigFile();
    checks.push(configResult.check);
    issues.push(...configResult.issues);

    const metadataResult = await this.checkMetadata();
    checks.push(metadataResult.check);
    issues.push(...metadataResult.issues);

    const imageChecks = await this.checkImages();
    checks.push(...imageChecks.checks);
    issues.push(...imageChecks.issues);

    const variablesResult = await this.checkVariables();
    checks.push(variablesResult.check);
    issues.push(...variablesResult.issues);

    const backupResult = await this.checkBackupFiles();
    checks.push(backupResult.check);
    issues.push(...backupResult.issues);

    // Determine overall status
    const hasCritical = issues.some(i => i.severity === 'critical');
    const hasError = issues.some(i => i.severity === 'error');
    const hasWarning = issues.some(i => i.severity === 'warning');

    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (hasCritical) {
      overallStatus = 'critical';
    } else if (hasError || hasWarning) {
      overallStatus = 'warning';
    }

    // Generate recommendations based on issues found
    recommendations.push(...this.generateRecommendations(issues));

    return {
      timestamp: startTime,
      projectPath: this.projectPath,
      overallStatus,
      issues,
      checks,
      recommendations
    };
  }

  /**
   * Check project directory structure
   */
  async checkProjectStructure(): Promise<{ check: DiagnosticCheck, issues: DiagnosticIssue[] }> {
    const issues: DiagnosticIssue[] = [];
    const requiredDirs = [
      'sequences',
      'scenes',
      'characters',
      'worlds',
      'assets',
      'story',
      'images',
      'videos',
      'audio',
      'prompts',
      'metadata',
      'locations',
      'objects'
    ];

    const missingDirs: string[] = [];
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectPath, dir);
      if (!fs.existsSync(dirPath)) {
        missingDirs.push(dir);
        issues.push({
          id: `STRUCTURE-${dir.toUpperCase()}`,
          severity: 'error',
          category: 'structure',
          title: `Missing directory: ${dir}`,
          description: `The required directory "${dir}" was not found in the project root.`,
          affectedPath: dirPath,
          possibleFix: `Create the "${dir}" directory manually or re-save the project.`
        });
      }
    }

    const check: DiagnosticCheck = {
      name: 'Project Structure',
      status: missingDirs.length > 0 ? 'failed' : 'passed',
      details: missingDirs.length > 0 
        ? `Missing directories: ${missingDirs.join(', ')}`
        : 'All required directories present',
      timestamp: new Date().toISOString()
    };

    return { check, issues };
  }

  /**
   * Check project.json configuration file
   */
  async checkConfigFile(): Promise<{ check: DiagnosticCheck, issues: DiagnosticIssue[] }> {
    const issues: DiagnosticIssue[] = [];
    
    if (!fs.existsSync(this.configPath)) {
      const issue: DiagnosticIssue = {
        id: 'CONFIG-001',
        severity: 'critical',
        category: 'integrity',
        title: 'project.json not found',
        description: 'The primary project configuration file (project.json) is missing.',
        affectedPath: this.configPath,
        possibleFix: 'Try to recover from backup or rebuild the project file.'
      };
      issues.push(issue);

      return {
        check: {
          name: 'Config File',
          status: 'failed',
          details: 'project.json not found',
          timestamp: new Date().toISOString()
        },
        issues
      };
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(content) as ProjectConfig;

      // Check for required fields
      const requiredFields = ['schema_version', 'project_name', 'capabilities', 'generation_status'];
      const missingFields = requiredFields.filter(field => !config[field as keyof ProjectConfig]);

      if (missingFields.length > 0) {
        for (const field of missingFields) {
          issues.push({
            id: `CONFIG-MISSING-${field.toUpperCase()}`,
            severity: 'error',
            category: 'integrity',
            title: `Missing field: ${field}`,
            description: `The required field "${field}" is missing from project.json.`,
            affectedPath: this.configPath
          });
        }

        return {
          check: {
            name: 'Config File',
            status: 'failed',
            details: `Missing required fields: ${missingFields.join(', ')}`,
            timestamp: new Date().toISOString()
          },
          issues
        };
      }

      return {
        check: {
          name: 'Config File',
          status: 'passed',
          details: 'Config file valid with all required fields',
          timestamp: new Date().toISOString()
        },
        issues
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      issues.push({
        id: 'CONFIG-002',
        severity: 'critical',
        category: 'integrity',
        title: 'Config parsing error',
        description: `Failed to parse project.json: ${errorMessage}`,
        affectedPath: this.configPath
      });

      return {
        check: {
          name: 'Config File',
          status: 'failed',
          details: `Config file parsing error: ${errorMessage}`,
          timestamp: new Date().toISOString()
        },
        issues
      };
    }
  }

  /**
   * Check project metadata (header/summary)
   */
  async checkMetadata(): Promise<{ check: DiagnosticCheck, issues: DiagnosticIssue[] }> {
    const issues: DiagnosticIssue[] = [];

    if (!fs.existsSync(this.configPath)) {
      return {
        check: {
          name: 'Metadata',
          status: 'failed',
          details: 'Cannot check metadata - project.json not found',
          timestamp: new Date().toISOString()
        },
        issues
      };
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(content);

      // Check for summary field
      const hasSummary = 'summary' in config;
      const hasHeader = 'header' in config;

      if (!hasSummary) {
        issues.push({
          id: 'METADATA-001',
          severity: 'warning',
          category: 'header',
          title: 'Summary field missing',
          description: 'The project.json does not contain a "summary" field. This field may have been lost during save.',
          affectedPath: this.configPath,
          possibleFix: 'Ensure summary is correctly passed to the save service.'
        });
      }

      if (!hasHeader) {
        issues.push({
          id: 'METADATA-002',
          severity: 'warning',
          category: 'header',
          title: 'Header field missing',
          description: 'The project.json does not contain a "header" field.',
          affectedPath: this.configPath,
          possibleFix: 'Ensure header is correctly passed to the save service.'
        });
      }

      return {
        check: {
          name: 'Metadata',
          status: issues.length > 0 ? 'warning' : 'passed',
          details: issues.length > 0 
            ? `Found ${issues.length} metadata issue(s): ${issues.map(i => i.title).join(', ')}`
            : 'All metadata fields present',
          timestamp: new Date().toISOString()
        },
        issues
      };
    } catch (error) {
      return {
        check: {
          name: 'Metadata',
          status: 'failed',
          details: `Error checking metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        },
        issues: []
      };
    }
  }

  // Removed hacky side-effect property

  /**
   * Check image files and URLs
   */
  async checkImages(): Promise<{ checks: DiagnosticCheck[]; issues: DiagnosticIssue[] }> {
    const checks: DiagnosticCheck[] = [];
    const issues: DiagnosticIssue[] = [];

    // Check images directory
    if (!fs.existsSync(this.imagesPath)) {
      checks.push({
        name: 'Images Directory',
        status: 'failed',
        details: 'Images directory does not exist',
        timestamp: new Date().toISOString()
      });
      return { checks, issues };
    }

    // Scan for image files
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
    const imageDiagnostics: ImageDiagnostic[] = [];

    const scanDirectory = (dir: string, relativePath: string = ''): void => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relPath = path.join(relativePath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDirectory(fullPath, relPath);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (imageExtensions.includes(ext)) {
            imageDiagnostics.push({
              path: relPath,
              url: fullPath,
              isValid: true,
              isLocal: true,
              exists: true,
              size: stat.size
            });
          }
        }
      }
    };

    scanDirectory(this.imagesPath);

    // Check for ComfyUI URLs in config or data files
    const configContent = fs.existsSync(this.configPath) 
      ? fs.readFileSync(this.configPath, 'utf-8') 
      : '';
    
    const hasComfyUIUrls = configContent.includes('comfyui') || 
      configContent.includes('http://') || 
      configContent.includes('https://');

    if (hasComfyUIUrls) {
      issues.push({
        id: 'IMAGE-001',
        severity: 'critical',
        category: 'images',
        title: 'ComfyUI dynamic URLs detected',
        description: 'Project contains ComfyUI dynamic URLs which are not available offline. Images will be lost when ComfyUI is not running.',
        affectedPath: this.configPath,
        possibleFix: 'Implement automatic local image copying during save. Replace dynamic URLs with local file paths.'
      });
    }

    // Check for missing or broken image references
    const dataFiles = this.findDataFiles();
    for (const dataFile of dataFiles) {
      try {
        const content = fs.readFileSync(dataFile, 'utf-8');
        const data = JSON.parse(content);
        
        // Check for image references
        const imageRefs = this.extractImageReferences(data);
        for (const ref of imageRefs) {
          if (ref.startsWith('http://') || ref.startsWith('https://')) {
            // External URL - check if it's a ComfyUI URL
            if (ref.includes('comfyui')) {
              issues.push({
                id: 'IMAGE-002',
                severity: 'critical',
                category: 'images',
                title: 'External ComfyUI image reference',
                description: `Found external ComfyUI URL: ${ref}`,
                affectedPath: dataFile,
                possibleFix: 'Download and store image locally'
              });
            }
          } else {
            // Local path - check if file exists
            const fullImagePath = path.isAbsolute(ref) 
              ? ref 
              : path.join(this.projectPath, ref);
            
            if (!fs.existsSync(fullImagePath)) {
              issues.push({
                id: 'IMAGE-003',
                severity: 'error',
                category: 'images',
                title: 'Missing local image file',
                description: `Referenced image not found: ${ref}`,
                affectedPath: dataFile,
                possibleFix: 'Restore image from backup or regenerate'
              });
            }
          }
        }
      } catch (error) {
        // Skip files that can't be parsed
      }
    }

    checks.push({
      name: 'Images',
      status: issues.filter(i => i.category === 'images').length > 0 ? 'failed' : 'passed',
      details: `Found ${imageDiagnostics.length} local images. ${issues.filter(i => i.category === 'images').length} issue(s) detected.`,
      timestamp: new Date().toISOString()
    });

    return { checks, issues };
  }

  /**
   * Find all data files in the project
   */
  private findDataFiles(): string[] {
    const dataFiles: string[] = [];
    const extensions = ['.json'];

    const scanDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else {
          const ext = path.extname(file).toLowerCase();
          if (extensions.includes(ext)) {
            dataFiles.push(fullPath);
          }
        }
      }
    };

    scanDir(this.projectPath);
    return dataFiles;
  }

  /**
   * Extract image references from data object
   */
  private extractImageReferences(obj: unknown, found: string[] = []): string[] {
    if (typeof obj === 'string') {
      if (obj.match(/\.(png|jpg|jpeg|gif|webp|bmp)$/i) || obj.includes('image')) {
        found.push(obj);
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        this.extractImageReferences(item, found);
      }
    } else if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        this.extractImageReferences(value, found);
      }
    }
    return found;
  }

  /**
   * Check state variables persistence
   */
  async checkVariables(): Promise<{ check: DiagnosticCheck, issues: DiagnosticIssue[] }> {
    const issues: DiagnosticIssue[] = [];

    // Check for state persistence files
    const possibleStateFile = path.join(this.projectPath, 'state.json');
    const alternativeStateFile = path.join(this.projectPath, 'metadata', 'state.json');

    const stateFileFound = fs.existsSync(possibleStateFile) || fs.existsSync(alternativeStateFile);

    if (!stateFileFound) {
      issues.push({
        id: 'VAR-001',
        severity: 'warning',
        category: 'variables',
        title: 'No state persistence file found',
        description: 'No state.json file found. State variables may not be persisted between sessions.',
        possibleFix: 'Implement state persistence system to save critical variables'
      });
    }

    // Check config for critical variables
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const config = JSON.parse(content);
        
        // Check for common state variables that should be persisted
        const expectedVars = ['currentScene', 'currentSequence', 'lastOpened', 'userPreferences'];
        const missingVars: string[] = [];
        
        for (const varName of expectedVars) {
          if (!(varName in config)) {
            missingVars.push(varName);
          }
        }

        if (missingVars.length > 0) {
          issues.push({
            id: 'VAR-002',
            severity: 'warning',
            category: 'variables',
            title: 'Missing state variables in config',
            description: `Expected state variables not found: ${missingVars.join(', ')}`,
            affectedPath: this.configPath,
            possibleFix: 'Add state variables to project config or implement separate state persistence'
          });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    return {
      check: {
        name: 'Variables',
        status: issues.length > 0 ? 'warning' : 'passed',
        details: issues.length > 0 
          ? `Found ${issues.length} variable issue(s)`
          : 'All expected variables present',
        timestamp: new Date().toISOString()
      },
      issues
    };
  }

  /**
   * Check backup files
   */
  async checkBackupFiles(): Promise<{ check: DiagnosticCheck, issues: DiagnosticIssue[] }> {
    const issues: DiagnosticIssue[] = [];
    const backupDir = path.join(this.projectPath, '.backups');
    
    if (!fs.existsSync(backupDir)) {
      issues.push({
        id: 'BACKUP-001',
        severity: 'warning',
        category: 'integrity',
        title: 'No backup directory found',
        description: 'The .backups directory is missing. Data loss risk is increased.',
        possibleFix: 'Enable automatic backups in project settings.'
      });

      return {
        check: {
          name: 'Backups',
          status: 'warning',
          details: 'No backup directory found. Consider enabling automatic backups.',
          timestamp: new Date().toISOString()
        },
        issues
      };
    }

    const backupFiles = fs.readdirSync(backupDir);
    const recentBackups = backupFiles
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 5);

    if (recentBackups.length === 0) {
      issues.push({
        id: 'BACKUP-002',
        severity: 'warning',
        category: 'integrity',
        title: 'No backup files found',
        description: 'The backup directory exists but contains no session backups.',
        possibleFix: 'Perform a manual save to trigger backup creation.'
      });

      return {
        check: {
          name: 'Backups',
          status: 'warning',
          details: 'No backup files found in backup directory',
          timestamp: new Date().toISOString()
        },
        issues
      };
    }

    return {
      check: {
        name: 'Backups',
        status: 'passed',
        details: `Found ${recentBackups.length} recent backup(s)`,
        timestamp: new Date().toISOString()
      },
      issues
    };
  }

  /**
   * Generate recommendations based on issues found
   */
  private generateRecommendations(issues: DiagnosticIssue[]): string[] {
    const recommendations: string[] = [];

    const hasImageIssues = issues.some(i => i.category === 'images');
    const hasHeaderIssues = issues.some(i => i.category === 'header');
    const hasVariableIssues = issues.some(i => i.category === 'variables');

    if (hasImageIssues) {
      recommendations.push('Enable automatic local image copying in project settings');
      recommendations.push('Run ProjectIntegrityChecker to fix missing images');
      recommendations.push('Consider using offline-first image storage');
    }

    if (hasHeaderIssues) {
      recommendations.push('Update ProjectConfig interface to include summary/header fields');
      recommendations.push('Run migration to add missing fields to existing projects');
    }

    if (hasVariableIssues) {
      recommendations.push('Enable Zustand persistence for critical state variables');
      recommendations.push('Implement automatic state backup on project close');
    }

    if (recommendations.length === 0) {
      recommendations.push('Project appears healthy - no action required');
    }

    return recommendations;
  }

  /**
   * Generate a detailed diagnostic report
   */
  async generateReport(): Promise<string> {
    const result = await this.runFullDiagnostic();
    
    let report = `# Project Diagnostic Report\n\n`;
    report += `**Generated:** ${result.timestamp}\n`;
    report += `**Project:** ${result.projectPath}\n`;
    report += `**Status:** ${result.overallStatus.toUpperCase()}\n\n`;
    
    report += `## Summary\n\n`;
    report += `- Total Issues: ${result.issues.length}\n`;
    report += `- Critical: ${result.issues.filter(i => i.severity === 'critical').length}\n`;
    report += `- Errors: ${result.issues.filter(i => i.severity === 'error').length}\n`;
    report += `- Warnings: ${result.issues.filter(i => i.severity === 'warning').length}\n\n`;
    
    report += `## Issues\n\n`;
    for (const issue of result.issues) {
      report += `### ${issue.id}: ${issue.title}\n`;
      report += `- **Severity:** ${issue.severity}\n`;
      report += `- **Category:** ${issue.category}\n`;
      report += `- **Description:** ${issue.description}\n`;
      if (issue.affectedPath) {
        report += `- **Affected Path:** ${issue.affectedPath}\n`;
      }
      if (issue.possibleFix) {
        report += `- **Fix:** ${issue.possibleFix}\n`;
      }
      report += `\n`;
    }
    
    report += `## Checks\n\n`;
    for (const check of result.checks) {
      report += `- **${check.name}:** ${check.status} - ${check.details}\n`;
    }
    
    report += `\n## Recommendations\n\n`;
    for (const rec of result.recommendations) {
      report += `- ${rec}\n`;
    }
    
    return report;
  }

  /**
   * Quick health check - returns boolean for simple status
   */
  async quickHealthCheck(): Promise<boolean> {
    const result = await this.runFullDiagnostic();
    return result.overallStatus === 'healthy';
  }
}

/**
 * Factory function to create diagnostic service
 */
export function createDiagnosticService(projectPath: string): ProjectDiagnosticService {
  return new ProjectDiagnosticService(projectPath);
}

/**
 * Run diagnostic on a project and return results
 */
export async function diagnoseProject(projectPath: string): Promise<DiagnosticResult> {
  const service = new ProjectDiagnosticService(projectPath);
  return service.runFullDiagnostic();
}
