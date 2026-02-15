/**
 * FileSystemService - File System Management Service for StoryCore
 *
 * Provides methods to read and write configuration files
 * with error handling and localStorage synchronization
 * 
 * Compatible with browser and Node.js environments
 */

import { AddonConfig } from './AddonManager';
import { logger } from '@/utils/logger';

/**
 * Node.js fs.promises interface
 */
interface NodeFsPromises {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, data: string, encoding: string): Promise<void>;
  access(path: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  unlink(path: string): Promise<void>;
}

/**
 * Node.js path module interface
 */
interface NodePath {
  dirname(path: string): string;
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
}

/**
 * Error with code property (Node.js style error)
 */
interface NodeJSError extends Error {
  code?: string;
}

/**
 * Type guard to check if an error has a code property
 */
function isNodeJSError(error: unknown): error is NodeJSError {
  return error instanceof Error && 'code' in error;
}

// Type guard to check if we are in a Node.js environment
const isNodeEnvironment = typeof globalThis !== 'undefined' && 
                          typeof globalThis.window === 'undefined' && 
                          typeof process !== 'undefined';

// Lazy loading of Node.js modules to avoid errors in browser
let fs: NodeFsPromises | null = null;
let path: NodePath | null = null;

if (isNodeEnvironment) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeFs = require('node:fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodePath = require('node:path');
    fs = nodeFs.promises;
    path = nodePath;
  } catch (error) {
    logger.warn('[FileSystemService] Unable to load Node.js modules:', error);
  }
}

export class FileSystemService {
    private static instance: FileSystemService;
    private readonly useFileSystem: boolean;
    
    private constructor() {
        this.useFileSystem = isNodeEnvironment && fs !== null;
    }
    
    /**
     * Obtient l'instance singleton du service
     */
    static getInstance(): FileSystemService {
        if (!FileSystemService.instance) {
            FileSystemService.instance = new FileSystemService();
        }
        return FileSystemService.instance;
    }
    
    /**
     * Vérifie si le système de fichiers est disponible
     */
    private isFileSystemAvailable(): boolean {
        return this.useFileSystem;
    }
    
    /**
     * Lit le fichier de configuration des add-ons
     * @param filePath Chemin du fichier de configuration
     * @returns Configuration des add-ons
     * @throws Error Si le fichier existe mais est invalide
     */
    async readConfigFile(filePath: string): Promise<AddonConfig> {
        // Utiliser localStorage en premier dans le browser
        if (!this.isFileSystemAvailable() || !fs) {
            return this.readFromLocalStorage();
        }
        
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            
            // Validation du format
            if (!parsed.addons || typeof parsed.addons !== 'object') {
                throw new Error('Format de configuration invalide: la propriété "addons" est manquante ou invalide');
            }
            
            return parsed.addons;
        } catch (error: unknown) {
            // Handle specific errors
            if (isNodeJSError(error) && error.code === 'ENOENT') {
                // File not found - try localStorage
                logger.warn(`[FileSystemService] File not found: ${filePath}, fallback to localStorage`);
                return this.readFromLocalStorage();
            }
            
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON format in ${filePath}: ${error.message}`);
            }
            
            // Handle permission errors
            if (isNodeJSError(error) && (error.code === 'EACCES' || error.code === 'EPERM')) {
                throw new Error(`Permission denied to read file ${filePath}`);
            }
            
            // On error, try localStorage
            logger.warn(`[FileSystemService] Error reading file, fallback to localStorage:`, error);
            return this.readFromLocalStorage();
        }
    }
    
    /**
     * Reads configuration from localStorage
     */
    private readFromLocalStorage(): Promise<AddonConfig> {
        try {
            const data = localStorage.getItem('storycore_addon_config');
            if (data) {
                return Promise.resolve(JSON.parse(data));
            }
        } catch (error) {
            logger.warn('[FileSystemService] Error reading from localStorage:', error);
        }
        return Promise.resolve({});
    }
    
    /**
     * Écrit la configuration des add-ons dans un fichier
     * @param filePath Chemin du fichier de configuration
     * @param config Configuration des add-ons à sauvegarder
     * @throws Error Si l'écriture du fichier échoue
     */
    async writeConfigFile(filePath: string, config: AddonConfig): Promise<void> {
        // Sync with localStorage in all cases
        await this.syncWithLocalStorage(config);
        
        // If no file system available, stop here
        if (!this.isFileSystemAvailable() || !fs || !path) {
            logger.debug('[FileSystemService] Configuration saved to localStorage only (browser)');
            return;
        }
        
        try {
            // Ensure directory exists
            await this.ensureDirectoryExists(path.dirname(filePath));
            
            // Create complete structure with metadata
            const fullConfig = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                addons: config
            };
            
            // Write file with readable JSON formatting
            await fs.writeFile(filePath, JSON.stringify(fullConfig, null, 2), 'utf-8');
            
            logger.debug(`[FileSystemService] Configuration saved to ${filePath}`);
        } catch (error: unknown) {
            // Handle permission errors
            if (isNodeJSError(error) && (error.code === 'EACCES' || error.code === 'EPERM')) {
                throw new Error(`Permission denied to write file ${filePath}`);
            }
            
            // Handle disk space errors
            if (isNodeJSError(error) && error.code === 'ENOSPC') {
                throw new Error(`Insufficient disk space to write file ${filePath}`);
            }
            
            logger.error(`[FileSystemService] Failed to write file ${filePath}:`, error);
            // Don't throw since localStorage sync succeeded
        }
    }
    
    /**
     * Ensures the directory exists, creates it if necessary
     * @param dirPath Directory path
     */
    async ensureDirectoryExists(dirPath: string): Promise<void> {
        if (!this.isFileSystemAvailable() || !fs) {
            return;
        }
        
        try {
            // Check if directory exists
            await fs.access(dirPath);
        } catch {
            // Directory doesn't exist, create it recursively
            try {
                await fs.mkdir(dirPath, { recursive: true });
                logger.debug(`[FileSystemService] Directory created: ${dirPath}`);
            } catch (error: unknown) {
                // Handle permission errors
                if (isNodeJSError(error) && (error.code === 'EACCES' || error.code === 'EPERM')) {
                    throw new Error(`Permission denied to create directory ${dirPath}`);
                }
                
                logger.error(`[FileSystemService] Failed to create directory ${dirPath}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                throw new Error(`Failed to create directory: ${errorMessage}`);
            }
        }
    }
    
    /**
     * Synchronizes configuration with localStorage
     * @param config Configuration to synchronize
     * @throws Error If localStorage synchronization fails
     */
    async syncWithLocalStorage(config: AddonConfig): Promise<void> {
        try {
            // Save to localStorage
            localStorage.setItem('storycore_addon_config', JSON.stringify(config));
            logger.debug('[FileSystemService] Configuration synchronized with localStorage');
        } catch (error: unknown) {
            // Handle quota exceeded errors
            if (error instanceof Error && error.name === 'QuotaExceededError') {
                throw new Error('Local storage quota exceeded');
            }
            
            logger.error('[FileSystemService] Failed to synchronize with localStorage:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to synchronize with localStorage: ${errorMessage}`);
        }
    }
    
    /**
     * Checks if a file exists
     * @param filePath File path
     * @returns true if file exists, false otherwise
     */
    async fileExists(filePath: string): Promise<boolean> {
        if (!this.isFileSystemAvailable() || !fs) {
            return false;
        }
        
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Deletes a configuration file
     * @param filePath Path of the file to delete
     * @throws Error If deletion fails
     */
    async deleteConfigFile(filePath: string): Promise<void> {
        if (!this.isFileSystemAvailable() || !fs) {
            return;
        }
        
        try {
            await fs.unlink(filePath);
            logger.debug(`[FileSystemService] File deleted: ${filePath}`);
        } catch (error: unknown) {
            // Handle specific errors
            if (isNodeJSError(error) && error.code === 'ENOENT') {
                // File not found - not a critical error
                logger.warn(`[FileSystemService] File not found for deletion: ${filePath}`);
                return;
            }
            
            // Handle permission errors
            if (isNodeJSError(error) && (error.code === 'EACCES' || error.code === 'EPERM')) {
                throw new Error(`Permission denied to delete file ${filePath}`);
            }
            
            logger.error(`[FileSystemService] Failed to delete file ${filePath}:`, error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to delete file: ${errorMessage}`);
        }
    }
}

// Export de l'instance singleton
export const fileSystemService = FileSystemService.getInstance();



