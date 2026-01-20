/**
 * Error handling and logging system for the StoryCore launcher
 * 
 * This module provides:
 * - Custom error classes for different error categories
 * - Error logger with file persistence
 * - User-friendly error message mapping
 * - Diagnostic information capture
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Base error class for all launcher errors
 */
export abstract class LauncherError extends Error {
  public readonly timestamp: Date;
  public readonly category: ErrorCategory;
  
  constructor(message: string, category: ErrorCategory) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.category = category;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get a user-friendly error message
   */
  abstract getUserMessage(): string;

  /**
   * Get troubleshooting suggestions
   */
  abstract getSuggestions(): string[];
}

/**
 * Error categories for classification
 */
export type ErrorCategory = 'server' | 'project' | 'filesystem' | 'storage';

/**
 * Server-related errors
 */
export enum ServerErrorCode {
  PORT_CONFLICT = 'PORT_CONFLICT',
  SPAWN_FAILED = 'SPAWN_FAILED',
  SERVER_CRASHED = 'SERVER_CRASHED',
  TIMEOUT = 'TIMEOUT',
}

export class ServerError extends LauncherError {
  constructor(
    public readonly code: ServerErrorCode,
    message: string,
    public readonly details?: string
  ) {
    super(message, 'server');
  }

  getUserMessage(): string {
    switch (this.code) {
      case ServerErrorCode.PORT_CONFLICT:
        return 'Unable to start server. All ports are in use.';
      case ServerErrorCode.SPAWN_FAILED:
        return 'Failed to start the development server.';
      case ServerErrorCode.SERVER_CRASHED:
        return 'The server stopped unexpectedly.';
      case ServerErrorCode.TIMEOUT:
        return 'Server is taking longer than expected to start.';
      default:
        return 'An unknown server error occurred.';
    }
  }

  getSuggestions(): string[] {
    switch (this.code) {
      case ServerErrorCode.PORT_CONFLICT:
        return [
          'Close other applications using ports 5173-5183',
          'Check if another instance of StoryCore is running',
          'Restart your computer to free up ports',
        ];
      case ServerErrorCode.SPAWN_FAILED:
        return [
          'Check your installation',
          'Ensure Node.js and npm are installed',
          'Try reinstalling the application',
        ];
      case ServerErrorCode.SERVER_CRASHED:
        return [
          'Click to restart the server',
          'Check the error logs for details',
          'Report the issue if it persists',
        ];
      case ServerErrorCode.TIMEOUT:
        return [
          'Wait a bit longer',
          'Restart the application',
          'Check your system resources',
        ];
      default:
        return ['Restart the application', 'Check the error logs'];
    }
  }
}

/**
 * Project-related errors
 */
export enum ProjectErrorCode {
  INVALID_STRUCTURE = 'INVALID_STRUCTURE',
  MISSING_FILES = 'MISSING_FILES',
  CORRUPTED_CONFIG = 'CORRUPTED_CONFIG',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
}

export interface ValidationError {
  type: 'missing_file' | 'missing_directory' | 'invalid_config' | 'permission';
  path: string;
  message: string;
  suggestion?: string;
}

export class ProjectError extends LauncherError {
  constructor(
    public readonly code: ProjectErrorCode,
    message: string,
    public readonly projectPath?: string,
    public readonly validationErrors?: ValidationError[]
  ) {
    super(message, 'project');
  }

  getUserMessage(): string {
    switch (this.code) {
      case ProjectErrorCode.INVALID_STRUCTURE:
        return 'The selected directory is not a valid StoryCore project.';
      case ProjectErrorCode.MISSING_FILES:
        return 'Required project files are missing.';
      case ProjectErrorCode.CORRUPTED_CONFIG:
        return 'The project configuration file is corrupted.';
      case ProjectErrorCode.PERMISSION_DENIED:
        return 'Permission denied accessing the project directory.';
      case ProjectErrorCode.VERSION_MISMATCH:
        return 'This project was created with a different version of StoryCore.';
      default:
        return 'An error occurred while loading the project.';
    }
  }

  getSuggestions(): string[] {
    switch (this.code) {
      case ProjectErrorCode.INVALID_STRUCTURE:
        return [
          'Select a valid StoryCore project directory',
          'Create a new project instead',
          'Check if the project was moved or renamed',
        ];
      case ProjectErrorCode.MISSING_FILES:
        return [
          'Restore missing files from backup',
          'Create a new project',
          'Check the validation errors for details',
        ];
      case ProjectErrorCode.CORRUPTED_CONFIG:
        return [
          'Restore the project.json file from backup',
          'Create a new project',
          'Contact support for help recovering the project',
        ];
      case ProjectErrorCode.PERMISSION_DENIED:
        return [
          'Run the application as administrator',
          'Check file permissions',
          'Move the project to a different location',
        ];
      case ProjectErrorCode.VERSION_MISMATCH:
        return [
          'Update StoryCore to the latest version',
          'Export and recreate the project',
          'Check compatibility notes',
        ];
      default:
        return ['Try again', 'Create a new project', 'Contact support'];
    }
  }
}

/**
 * File system errors
 */
export enum FileSystemErrorCode {
  CREATE_FAILED = 'CREATE_FAILED',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  INVALID_PATH = 'INVALID_PATH',
  PATH_TOO_LONG = 'PATH_TOO_LONG',
  NOT_FOUND = 'NOT_FOUND',
  WRITE_FAILED = 'WRITE_FAILED',
}

export class FileSystemError extends LauncherError {
  constructor(
    public readonly code: FileSystemErrorCode,
    message: string,
    public readonly filePath?: string
  ) {
    super(message, 'filesystem');
  }

  getUserMessage(): string {
    switch (this.code) {
      case FileSystemErrorCode.CREATE_FAILED:
        return 'Failed to create directory or file.';
      case FileSystemErrorCode.INSUFFICIENT_SPACE:
        return 'Insufficient disk space.';
      case FileSystemErrorCode.INVALID_PATH:
        return 'The path contains invalid characters.';
      case FileSystemErrorCode.PATH_TOO_LONG:
        return 'The path is too long.';
      case FileSystemErrorCode.NOT_FOUND:
        return 'File or directory not found.';
      case FileSystemErrorCode.WRITE_FAILED:
        return 'Failed to write to file.';
      default:
        return 'A file system error occurred.';
    }
  }

  getSuggestions(): string[] {
    switch (this.code) {
      case FileSystemErrorCode.CREATE_FAILED:
        return [
          'Check file permissions',
          'Try a different location',
          'Run as administrator',
        ];
      case FileSystemErrorCode.INSUFFICIENT_SPACE:
        return [
          'Free up disk space',
          'Choose a different drive',
          'Delete unnecessary files',
        ];
      case FileSystemErrorCode.INVALID_PATH:
        return [
          'Remove special characters from the path',
          'Use only letters, numbers, and basic punctuation',
          'Avoid using reserved names',
        ];
      case FileSystemErrorCode.PATH_TOO_LONG:
        return [
          'Use a shorter path',
          'Move the project closer to the root directory',
          'Shorten folder names',
        ];
      case FileSystemErrorCode.NOT_FOUND:
        return [
          'Check if the file or directory exists',
          'Verify the path is correct',
          'Restore from backup if deleted',
        ];
      case FileSystemErrorCode.WRITE_FAILED:
        return [
          'Check file permissions',
          'Ensure the file is not open in another program',
          'Check available disk space',
        ];
      default:
        return ['Try again', 'Choose a different location'];
    }
  }
}

/**
 * Storage errors (configuration persistence)
 */
export enum StorageErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  CORRUPTED_DATA = 'CORRUPTED_DATA',
}

export class StorageError extends LauncherError {
  constructor(
    public readonly code: StorageErrorCode,
    message: string,
    public readonly details?: string
  ) {
    super(message, 'storage');
  }

  getUserMessage(): string {
    switch (this.code) {
      case StorageErrorCode.QUOTA_EXCEEDED:
        return 'Storage quota exceeded.';
      case StorageErrorCode.ACCESS_DENIED:
        return 'Cannot access application storage.';
      case StorageErrorCode.CORRUPTED_DATA:
        return 'Stored configuration data is corrupted.';
      default:
        return 'A storage error occurred.';
    }
  }

  getSuggestions(): string[] {
    switch (this.code) {
      case StorageErrorCode.QUOTA_EXCEEDED:
        return [
          'Clear browser cache',
          'Remove old projects from recent list',
          'The application will continue with default settings',
        ];
      case StorageErrorCode.ACCESS_DENIED:
        return [
          'Check browser permissions',
          'The application will continue with default settings',
        ];
      case StorageErrorCode.CORRUPTED_DATA:
        return [
          'Configuration will be reset to defaults',
          'Your projects are not affected',
        ];
      default:
        return ['The application will continue with default settings'];
    }
  }
}

/**
 * Error log entry
 */
export interface ErrorLog {
  timestamp: Date;
  category: ErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  suggestions: string[];
  stack?: string;
  context?: Record<string, any>;
}

/**
 * Error logger with file persistence
 */
export class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs: number = 100;
  private logFilePath: string;

  constructor() {
    // Store logs in user data directory
    const userDataPath = this.getUserDataPath();
    this.logFilePath = path.join(userDataPath, 'error-logs.json');
    
    // Load existing logs
    this.loadLogs();
  }

  /**
   * Log an error
   * @param error The error to log
   * @param context Additional context information
   */
  log(error: LauncherError | Error, context?: Record<string, any>): void {
    const log: ErrorLog = {
      timestamp: new Date(),
      category: error instanceof LauncherError ? error.category : 'server',
      code: error instanceof LauncherError ? (error as any).code : 'UNKNOWN',
      message: error.message,
      userMessage: error instanceof LauncherError ? error.getUserMessage() : error.message,
      suggestions: error instanceof LauncherError ? error.getSuggestions() : [],
      stack: error.stack,
      context,
    };

    this.logs.push(log);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Persist to file
    this.saveLogs();

    // Also log to console
    console.error(`[${log.category}] ${log.message}`, context);
  }

  /**
   * Get all logs
   */
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  /**
   * Get logs by category
   */
  getLogsByCategory(category: ErrorCategory): ErrorLog[] {
    return this.logs.filter(log => log.category === category);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.saveLogs();
  }

  /**
   * Export logs as JSON string
   */
  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Get diagnostic information for bug reports
   */
  getDiagnostics(): Record<string, any> {
    let appVersion = 'unknown';
    try {
      appVersion = require('../package.json').version;
    } catch (error) {
      // Package.json not found, use default
    }

    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      electronVersion: process.versions.electron,
      appVersion,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length,
      uptime: os.uptime(),
      recentErrors: this.logs.slice(-10),
    };
  }

  /**
   * Load logs from file
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logFilePath)) {
        const data = fs.readFileSync(this.logFilePath, 'utf-8');
        const parsed = JSON.parse(data);
        
        if (Array.isArray(parsed)) {
          // Convert timestamp strings back to Date objects
          this.logs = parsed.map(log => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load error logs:', error);
      this.logs = [];
    }
  }

  /**
   * Save logs to file
   */
  private saveLogs(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.logFilePath, JSON.stringify(this.logs, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save error logs:', error);
    }
  }

  /**
   * Get user data path for storing logs
   */
  private getUserDataPath(): string {
    const appName = 'StoryCore';
    
    switch (process.platform) {
      case 'win32':
        return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), appName);
      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Application Support', appName);
      case 'linux':
        return path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), appName);
      default:
        return path.join(os.homedir(), `.${appName.toLowerCase()}`);
    }
  }
}

// Export singleton instance
export const errorLogger = new ErrorLogger();
