/**
 * Project Integrity Checker
 * 
 * System for verifying data consistency before save
 * and automatically correcting issues.
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { ProjectConfig } from './ProjectValidator';

export interface IntegrityCheckResult {
  isValid: boolean;
  issues: IntegrityIssue[];
  corrections: IntegrityCorrection[];
  canProceed: boolean;
}

export interface IntegrityIssue {
  type: 'missing_file' | 'invalid_data' | 'missing_field' | 'corrupted' | 'inconsistent';
  severity: 'critical' | 'error' | 'warning';
  description: string;
  path?: string;
  canAutoFix: boolean;
}

export interface IntegrityCorrection {
  type: string;
  description: string;
  success: boolean;
  path?: string;
  error?: string;
}

export interface PreSaveValidation {
  projectPath: string;
  configValid: boolean;
  imagesValid: boolean;
  dataValid: boolean;
  backupCreated: boolean;
  issues: IntegrityIssue[];
}

export interface ImageCopyResult {
  success: boolean;
  originalPath: string;
  newPath: string;
  error?: string;
}

/**
 * Project Integrity Checker
 * 
 * Validates project data before save and performs
 * automatic corrections when possible.
 */
export class ProjectIntegrityChecker {
  private projectPath: string;
  private configPath: string;
  private imagesPath: string;
  private backupDir: string;
  private maxBackups: number = 10;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.configPath = path.join(projectPath, 'project.json');
    this.imagesPath = path.join(projectPath, 'images');
    this.backupDir = path.join(projectPath, '.backups');
  }

  /**
   * Run full integrity check
   */
  async runIntegrityCheck(): Promise<IntegrityCheckResult> {
    const issues: IntegrityIssue[] = [];
    const corrections: IntegrityCorrection[] = [];

    // Check project structure
    const structureCheck = await this.checkStructure();
    issues.push(...structureCheck.issues);

    // Check config file
    const configCheck = await this.checkConfig();
    issues.push(...configCheck.issues);
    corrections.push(...configCheck.corrections);

    // Fix images (localize all remote references)
    await this.localizeAllImages();

    // Check images again to report results
    const imageCheck = await this.checkImages();
    issues.push(...imageCheck.issues);
    corrections.push(...imageCheck.corrections);

    // Check data consistency
    const dataCheck = await this.checkDataConsistency();
    issues.push(...dataCheck.issues);
    corrections.push(...dataCheck.corrections);

    const hasCritical = issues.some(i => i.severity === 'critical');

    return {
      isValid: issues.length === 0,
      issues,
      corrections,
      canProceed: !hasCritical
    };
  }

  /**
   * Validate before save
   */
  async validateForSave(): Promise<PreSaveValidation> {
    const issues: IntegrityIssue[] = [];

    // Check config validity
    let configValid = false;
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        JSON.parse(content);
        configValid = true;
      }
    } catch (error) {
      issues.push({
        type: 'invalid_data',
        severity: 'critical',
        description: 'Config file is invalid',
        path: this.configPath,
        canAutoFix: false
      });
    }

    // Check images
    const imageResult = await this.checkImages();
    const imagesValid = !imageResult.issues.some(i => i.severity === 'critical');
    issues.push(...imageResult.issues);

    // Check data
    const dataResult = await this.checkDataConsistency();
    const dataValid = !dataResult.issues.some(i => i.severity === 'critical');
    issues.push(...dataResult.issues);

    // Create backup
    let backupCreated = false;
    try {
      backupCreated = await this.createBackup();
    } catch (error) {
      issues.push({
        type: 'missing_file',
        severity: 'warning',
        description: 'Could not create backup',
        canAutoFix: false
      });
    }

    return {
      projectPath: this.projectPath,
      configValid,
      imagesValid,
      dataValid,
      backupCreated,
      issues
    };
  }

  /**
   * Check project structure
   */
  private async checkStructure(): Promise<{ issues: IntegrityIssue[] }> {
    const issues: IntegrityIssue[] = [];
    const requiredDirs = [
      'sequences',
      'scenes',
      'characters',
      'worlds',
      'assets',
      'images',
      'metadata'
    ];

    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectPath, dir);
      if (!fs.existsSync(dirPath)) {
        // Try to create missing directory
        try {
          fs.mkdirSync(dirPath, { recursive: true });
          issues.push({
            type: 'missing_file',
            severity: 'warning',
            description: `Created missing directory: ${dir}`,
            path: dirPath,
            canAutoFix: true
          });
        } catch (error) {
          issues.push({
            type: 'missing_file',
            severity: 'error',
            description: `Cannot create directory: ${dir}`,
            path: dirPath,
            canAutoFix: false
          });
        }
      }
    }

    return { issues };
  }

  /**
   * Check config file
   */
  private async checkConfig(): Promise<{ issues: IntegrityIssue[]; corrections: IntegrityCorrection[] }> {
    const issues: IntegrityIssue[] = [];
    const corrections: IntegrityCorrection[] = [];

    if (!fs.existsSync(this.configPath)) {
      issues.push({
        type: 'missing_file',
        severity: 'critical',
        description: 'project.json not found',
        path: this.configPath,
        canAutoFix: false
      });
      return { issues, corrections };
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(content) as ProjectConfig;

      // Check for required fields
      const requiredFields = ['schema_version', 'project_name', 'capabilities', 'generation_status'];
      for (const field of requiredFields) {
        if (!(field in config)) {
          issues.push({
            type: 'missing_field',
            severity: 'error',
            description: `Missing required field: ${field}`,
            path: this.configPath,
            canAutoFix: true
          });
        }
      }

      // Check for summary field
      if (!('summary' in config)) {
        issues.push({
          type: 'missing_field',
          severity: 'warning',
          description: 'Missing summary field - header data may be lost',
          path: this.configPath,
          canAutoFix: true
        });

        // Auto-fix: add summary field
        try {
          const configWithSummary = { ...config, summary: '' };
          fs.writeFileSync(this.configPath, JSON.stringify(configWithSummary, null, 2));
          corrections.push({
            type: 'add_field',
            description: 'Added summary field to project.json',
            success: true,
            path: this.configPath
          });
        } catch (error) {
          corrections.push({
            type: 'add_field',
            description: 'Failed to add summary field',
            success: false,
            path: this.configPath,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Check for header field
      if (!('header' in config)) {
        issues.push({
          type: 'missing_field',
          severity: 'warning',
          description: 'Missing header field',
          path: this.configPath,
          canAutoFix: true
        });

        // Auto-fix: add header field
        try {
          const content = fs.readFileSync(this.configPath, 'utf-8');
          const config = JSON.parse(content);
          config.header = '';
          fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
          corrections.push({
            type: 'add_field',
            description: 'Added header field to project.json',
            success: true,
            path: this.configPath
          });
        } catch (error) {
          corrections.push({
            type: 'add_field',
            description: 'Failed to add header field',
            success: false,
            path: this.configPath,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Check for llm field
      if (!('llm' in config) || !config.llm) {
        issues.push({
          type: 'missing_field',
          severity: 'warning',
          description: 'Missing llm configuration',
          path: this.configPath,
          canAutoFix: true
        });

        // Auto-fix: add default LLM config if missing
        try {
          // Re-load to ensure we have current state
          const currentContent = fs.readFileSync(this.configPath, 'utf-8');
          const currentConfig = JSON.parse(currentContent);
          
          if (!currentConfig.llm) {
            currentConfig.llm = {
              provider: 'ollama',
              ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'qwen3-vl:4b',
                temperature: 0.7,
                maxTokens: 2048
              },
              defaultProvider: 'ollama',
              enableFallback: true
            };
            fs.writeFileSync(this.configPath, JSON.stringify(currentConfig, null, 2), 'utf-8');
            corrections.push({
              type: 'restore_field',
              description: 'Restored missing LLM configuration with defaults',
              success: true,
              path: this.configPath
            });
            console.log('[IntegrityChecker] Restored missing LLM config in project.json');
          }
        } catch (error) {
           console.error('[IntegrityChecker] Failed to restore LLM config:', error);
        }
      }

    } catch (error) {
      issues.push({
        type: 'invalid_data',
        severity: 'critical',
        description: 'Config file is corrupted',
        path: this.configPath,
        canAutoFix: false
      });
    }

    return { issues, corrections };
  }

  /**
   * Check images
   */
  private async checkImages(): Promise<{ issues: IntegrityIssue[]; corrections: IntegrityCorrection[] }> {
    const issues: IntegrityIssue[] = [];
    const corrections: IntegrityCorrection[] = [];

    // Ensure images directory exists
    if (!fs.existsSync(this.imagesPath)) {
      try {
        fs.mkdirSync(this.imagesPath, { recursive: true });
        corrections.push({
          type: 'create_directory',
          description: 'Created images directory',
          success: true,
          path: this.imagesPath
        });
      } catch (error) {
        issues.push({
          type: 'missing_file',
          severity: 'error',
          description: 'Cannot create images directory',
          path: this.imagesPath,
          canAutoFix: false
        });
        return { issues, corrections };
      }
    }

    // Check for ComfyUI URLs in config
    if (fs.existsSync(this.configPath)) {
      try {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        
        // Look for ComfyUI URLs
        const comfyUrlPattern = /https?:\/\/[^\s"']*comfyui[^\s"']*/gi;
        const matches = content.match(comfyUrlPattern);
        
        if (matches && matches.length > 0) {
          issues.push({
            type: 'invalid_data',
            severity: 'error',
            description: `Found ${matches.length} ComfyUI URLs that will be unavailable offline`,
            path: this.configPath,
            canAutoFix: true
          });

          corrections.push({
            type: 'image_copy_needed',
            description: `${matches.length} images need to be copied locally`,
            success: false,
            path: this.configPath,
            error: 'Manual intervention required - images must be downloaded from ComfyUI'
          });
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    // Check for broken local image references
    const dataFiles = this.findDataFiles();
    for (const dataFile of dataFiles) {
      try {
        const content = fs.readFileSync(dataFile, 'utf-8');
        const data = JSON.parse(content);
        
        const imageRefs = this.extractImageReferences(data);
        for (const ref of imageRefs) {
          if (!ref.startsWith('http://') && !ref.startsWith('https://')) {
            const fullPath = path.isAbsolute(ref) 
              ? ref 
              : path.join(this.projectPath, ref);
            
            if (!fs.existsSync(fullPath)) {
              issues.push({
                type: 'missing_file',
                severity: 'error',
                description: `Referenced image not found: ${ref}`,
                path: dataFile,
                canAutoFix: false
              });
            } else if (ref.startsWith('http')) {
               // Support for tracking remote images that need localization
            }
          }
        }
      } catch (error) {
        // Skip files that can't be parsed
      }
    }

    return { issues, corrections };
  }

  /**
   * Localize all remote images in the project
   * Scans all project config files (project.json, scene.json, etc.)
   * and downloads remote references to the local project storage.
   */
  async localizeAllImages(): Promise<ImageCopyResult[]> {
    const results: ImageCopyResult[] = [];
    const dataFiles = this.findDataFiles();
    
    console.log(`[Integrity] Scanning ${dataFiles.length} files for remote image references...`);

    for (const dataFile of dataFiles) {
      try {
        const content = fs.readFileSync(dataFile, 'utf-8');
        let data: any;
        
        try {
          data = JSON.parse(content);
        } catch (e) { continue; } // Not a JSON file we can handle
        
        let modified = false;

        // Recursive function to find and fix URLs
        const processValue = async (val: any): Promise<any> => {
          if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
            // Check if it's an image URL by extension
            const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
            const isImage = imageExtensions.some(ext => val.toLowerCase().includes(ext)) || val.includes('/view?filename=');
            
            if (isImage) {
              console.log(`[Integrity] Localizing remote image: ${val}`);
              const result = await this.copyImageToLocal(val);
              results.push(result);
              
              if (result.success) {
                modified = true;
                // Return relative path for persistence
                return path.relative(this.projectPath, result.newPath).replace(/\\/g, '/');
              }
            }
            return val;
          } else if (Array.isArray(val)) {
            const newArr = [];
            for (const item of val) {
              newArr.push(await processValue(item));
            }
            return newArr;
          } else if (val && typeof val === 'object') {
            const newObj: any = {};
            for (const [k, v] of Object.entries(val)) {
              newObj[k] = await processValue(v);
            }
            return newObj;
          }
          return val;
        };

        const updatedData = await processValue(data);

        if (modified) {
          fs.writeFileSync(dataFile, JSON.stringify(updatedData, null, 2), 'utf-8');
          console.log(`[Integrity] Successfully localized images in: ${dataFile}`);
        }
      } catch (error) {
        console.warn(`[Integrity] Failed to process ${dataFile}:`, error);
      }
    }

    return results;
  }

  /**
   * Check data consistency
   */
  private async checkDataConsistency(): Promise<{ issues: IntegrityIssue[]; corrections: IntegrityCorrection[] }> {
    const issues: IntegrityIssue[] = [];
    const corrections: IntegrityCorrection[] = [];

    // Check for state persistence
    const stateFiles = [
      path.join(this.projectPath, 'state.json'),
      path.join(this.projectPath, 'metadata', 'state.json')
    ];

    let stateFileExists = false;
    for (const stateFile of stateFiles) {
      if (fs.existsSync(stateFile)) {
        stateFileExists = true;
        break;
      }
    }

    if (!stateFileExists) {
      issues.push({
        type: 'missing_file',
        severity: 'warning',
        description: 'No state persistence file found - variables may be lost',
        canAutoFix: true
      });

      // Create state file
      try {
        const stateDir = path.join(this.projectPath, 'metadata');
        if (!fs.existsSync(stateDir)) {
          fs.mkdirSync(stateDir, { recursive: true });
        }
        
        const newStateFile = path.join(stateDir, 'state.json');
        fs.writeFileSync(newStateFile, JSON.stringify({
          createdAt: new Date().toISOString(),
          variables: {}
        }, null, 2));
        
        corrections.push({
          type: 'create_file',
          description: 'Created state.json for variable persistence',
          success: true,
          path: newStateFile
        });
      } catch (error) {
        corrections.push({
          type: 'create_file',
          description: 'Failed to create state.json',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { issues, corrections };
  }

  /**
   * Find all data files
   */
  private findDataFiles(): string[] {
    const dataFiles: string[] = [];
    const extensions = ['.json'];

    const scanDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      for (const file of files) {
        // Skip backup and hidden directories
        if (file.startsWith('.') || file === 'node_modules') continue;
        
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
   * Extract image references from data
   */
  private extractImageReferences(obj: unknown, found: string[] = []): string[] {
    if (typeof obj === 'string') {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'];
      if (imageExtensions.some(ext => obj.toLowerCase().includes(ext))) {
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
   * Create backup of project files
   */
  async createBackup(): Promise<boolean> {
    try {
      // Create backup directory if it doesn't exist
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        fs.mkdirSync(backupPath, { recursive: true });
      }

      // Copy project.json
      if (fs.existsSync(this.configPath)) {
        const backupConfigPath = path.join(backupPath, 'project.json');
        fs.copyFileSync(this.configPath, backupConfigPath);
      }

      // Clean old backups
      await this.cleanOldBackups();

      return true;
    } catch (error) {
      console.error('Backup creation failed:', error);
      return false;
    }
  }

  /**
   * Clean old backup files
   */
  private async cleanOldBackups(): Promise<void> {
    if (!fs.existsSync(this.backupDir)) return;

    const backups = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('backup-'))
      .sort()
      .reverse();

    // Remove old backups beyond max
    for (let i = this.maxBackups; i < backups.length; i++) {
      const backupPath = path.join(this.backupDir, backups[i]);
      try {
        fs.rmSync(backupPath, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to remove old backup: ${backupPath}`, error);
      }
    }
  }

  /**
   * Copy image to local storage
   */
  async copyImageToLocal(sourceUrl: string, targetSubdir: string = 'images'): Promise<ImageCopyResult> {
    try {
      // Determine target directory
      const targetDir = path.join(this.projectPath, targetSubdir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const urlParts = sourceUrl.split('/');
      const originalName = urlParts[urlParts.length - 1] || 'image.png';
      const ext = path.extname(originalName) || '.png';
      const newName = `local-${timestamp}${ext}`;
      const targetPath = path.join(targetDir, newName);

      // For local files, just copy
      if (sourceUrl.startsWith('file://') || path.isAbsolute(sourceUrl)) {
        const sourcePath = sourceUrl.startsWith('file://') 
          ? sourceUrl.slice(7) 
          : sourceUrl;
        
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, targetPath);
          return {
            success: true,
            originalPath: sourcePath,
            newPath: targetPath
          };
        }
      }

      // For HTTP URLs, download the file
      if (sourceUrl.startsWith('http')) {
        try {
          const response = await axios({
            method: 'get',
            url: sourceUrl,
            responseType: 'arraybuffer',
            timeout: 10000 // 10s timeout
          });

          fs.writeFileSync(targetPath, Buffer.from(response.data));
          
          return {
            success: true,
            originalPath: sourceUrl,
            newPath: targetPath
          };
        } catch (downloadError) {
          return {
            success: false,
            originalPath: sourceUrl,
            newPath: targetPath,
            error: `Download failed: ${downloadError instanceof Error ? downloadError.message : String(downloadError)}`
          };
        }
      }

      return {
        success: false,
        originalPath: sourceUrl,
        newPath: targetPath,
        error: 'Unsupported URL scheme'
      };
    } catch (error) {
      return {
        success: false,
        originalPath: sourceUrl,
        newPath: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate data before loading
   */
  async validateForLoad(): Promise<{ isValid: boolean; issues: IntegrityIssue[] }> {
    const issues: IntegrityIssue[] = [];

    // Check if project exists
    if (!fs.existsSync(this.projectPath)) {
      issues.push({
        type: 'missing_file',
        severity: 'critical',
        description: 'Project directory does not exist',
        path: this.projectPath,
        canAutoFix: false
      });
      return { isValid: false, issues };
    }

    // Check config file
    if (!fs.existsSync(this.configPath)) {
      issues.push({
        type: 'missing_file',
        severity: 'critical',
        description: 'project.json not found',
        path: this.configPath,
        canAutoFix: false
      });
      return { isValid: false, issues };
    }

    // Validate config JSON
    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      JSON.parse(content);
    } catch (error) {
      issues.push({
        type: 'corrupted',
        severity: 'critical',
        description: 'project.json is corrupted',
        path: this.configPath,
        canAutoFix: false
      });
      return { isValid: false, issues };
    }

    return { isValid: true, issues };
  }

  /**
   * Propose automatic corrections
   */
  async proposeCorrections(): Promise<IntegrityCorrection[]> {
    const corrections: IntegrityCorrection[] = [];
    const checkResult = await this.runIntegrityCheck();

    for (const issue of checkResult.issues) {
      if (issue.canAutoFix) {
        corrections.push({
          type: issue.type,
          description: `Auto-fix available for: ${issue.description}`,
          success: false,
          path: issue.path
        });
      }
    }

    return corrections;
  }
}

/**
 * Factory function to create integrity checker
 */
export function createIntegrityChecker(projectPath: string): ProjectIntegrityChecker {
  return new ProjectIntegrityChecker(projectPath);
}

/**
 * Run integrity check on a project
 */
export async function checkProjectIntegrity(projectPath: string): Promise<IntegrityCheckResult> {
  const checker = new ProjectIntegrityChecker(projectPath);
  return checker.runIntegrityCheck();
}

/**
 * Validate project before save
 */
export async function validateForSave(projectPath: string): Promise<PreSaveValidation> {
  const checker = new ProjectIntegrityChecker(projectPath);
  return checker.validateForSave();
}

/**
 * Validate project before load
 */
export async function validateForLoad(projectPath: string): Promise<{ isValid: boolean; issues: IntegrityIssue[] }> {
  const checker = new ProjectIntegrityChecker(projectPath);
  return checker.validateForLoad();
}
