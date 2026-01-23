/**
 * Type definitions for Electron API exposed to renderer process
 */

export interface ProjectData {
  name: string;
  location: string;
  template?: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  version: string;
  createdAt: Date;
  modifiedAt: Date;
  config: any;
}

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastAccessed: Date;
  exists?: boolean;
}

export interface ServerStatus {
  running: boolean;
  url: string | null;
  port: number | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    message: string;
    path?: string;
  }>;
  warnings: Array<{
    type: string;
    message: string;
    path?: string;
  }>;
  config?: any;
}

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export interface UpdateInfo {
  version: string;
  releaseNotes?: string;
  downloadUrl: string;
  fileSize?: number;
  releaseDate: Date;
  mandatory?: boolean;
}

export interface UpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'installing' | 'error';
  progress?: number;
  message?: string;
  error?: string;
  updateInfo?: UpdateInfo;
}

/**
 * Electron API interface
 */
export interface ElectronAPI {
  // System information
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };

  // Project management
  project: {
    /**
     * Create a new project
     * @param data Project creation data
     * @returns Created project information
     * @throws Error if creation fails
     */
    create: (data: ProjectData) => Promise<Project>;

    /**
     * Open an existing project
     * @param path Path to the project directory
     * @returns Project information
     * @throws Error if opening fails
     */
    open: (path: string) => Promise<Project>;

    /**
     * Show directory selection dialog for opening a project
     * Opens in the default projects directory
     * @returns Selected directory path or null if canceled
     * @throws Error if dialog fails
     */
    selectForOpen: () => Promise<string | null>;

    /**
     * Validate a project directory
     * @param path Path to validate
     * @returns Validation result
     * @throws Error if validation fails
     */
    validate: (path: string) => Promise<ValidationResult>;

    /**
     * Show directory selection dialog
     * @returns Selected directory path or null if canceled
     * @throws Error if dialog fails
     */
    selectDirectory: () => Promise<string | null>;

    /**
     * List contents of a directory
     * @param path Directory path to list
     * @returns Array of directory items
     * @throws Error if listing fails
     */
    listDirectory: (path: string) => Promise<DirectoryItem[]>;

    /**
     * Update project metadata
     * @param path Path to the project directory
     * @param metadata Metadata to update (partial)
     * @returns Updated project information
     * @throws Error if update fails
     */
    updateMetadata: (path: string, metadata: Record<string, any>) => Promise<Project>;
  };

  // Sequence management
  sequence: {
    /**
     * Update a shot in a sequence file
     * @param projectPath Path to the project directory
     * @param sequenceId ID of the sequence (e.g., "001")
     * @param shotId ID of the shot to update
     * @param updates Partial shot data to update
     * @returns Updated shot data
     * @throws Error if update fails
     */
    updateShot: (projectPath: string, sequenceId: string, shotId: string, updates: Record<string, any>) => Promise<any>;

    /**
     * Get all shots from a sequence
     * @param projectPath Path to the project directory
     * @param sequenceId ID of the sequence (e.g., "001")
     * @returns Array of shots in the sequence
     * @throws Error if retrieval fails
     */
    getShots: (projectPath: string, sequenceId: string) => Promise<any[]>;

    /**
     * Get all sequences from a project
     * @param projectPath Path to the project directory
     * @returns Array of all sequences
     * @throws Error if retrieval fails
     */
    getAll: (projectPath: string) => Promise<any[]>;
  };

  // Recent projects management
  recentProjects: {
    /**
     * Get all recent projects
     * @returns Array of recent projects
     * @throws Error if retrieval fails
     */
    get: () => Promise<RecentProject[]>;

    /**
     * Add a project to recent list
     * @param project Project to add
     * @throws Error if addition fails
     */
    add: (project: Omit<RecentProject, 'lastAccessed' | 'exists'>) => Promise<void>;

    /**
     * Remove a project from recent list
     * @param path Project path to remove
     * @throws Error if removal fails
     */
    remove: (path: string) => Promise<void>;
  };

  // Server management
  server: {
    /**
     * Get server status
     * @returns Server status information
     * @throws Error if status retrieval fails
     */
    getStatus: () => Promise<ServerStatus>;

    /**
     * Restart the development server
     * @throws Error if restart fails
     */
    restart: () => Promise<void>;
  };

  // Application controls
  app: {
    /**
     * Quit the application
     */
    quit: () => void;

    /**
     * Minimize the application window
     */
    minimize: () => void;

    /**
     * Show developer tools
     */
    showDevTools: () => void;
  };

  // ComfyUI integration
  comfyui: {
    /**
     * Execute a ComfyUI workflow
     * @param workflowData Workflow data to execute
     * @returns Execution result
     * @throws Error if execution fails
     */
    executeWorkflow: (workflowData: any) => Promise<any>;

    /**
     * Get ComfyUI queue status
     * @returns Queue status information
     * @throws Error if retrieval fails
     */
    getQueueStatus: () => Promise<any>;

    /**
     * Upload media to ComfyUI
     * @param mediaPath Path to media file
     * @returns Upload result
     * @throws Error if upload fails
     */
    uploadMedia: (mediaPath: string) => Promise<any>;

    /**
     * Download output from ComfyUI
     * @param outputId ID of the output to download
     * @returns Download result
     * @throws Error if download fails
     */
    downloadOutput: (outputId: string) => Promise<any>;

    /**
     * Get ComfyUI service status
     * @returns Service status information
     * @throws Error if retrieval fails
     */
    getServiceStatus: () => Promise<any>;

    /**
     * Start ComfyUI service
     * @returns Service start result
     * @throws Error if start fails
     */
    startService: () => Promise<any>;

    /**
     * Stop ComfyUI service
     * @returns Service stop result
     * @throws Error if stop fails
     */
    stopService: () => Promise<any>;
  };

  // File system operations
  fs: {
    /**
     * Read directory contents
     * @param dirPath Path to directory
     * @returns Array of file/directory names
     * @throws Error if read fails
     */
    readdir: (dirPath: string) => Promise<string[]>;

    /**
     * Read file contents
     * @param filePath Path to file
     * @returns File buffer
     * @throws Error if read fails
     */
    readFile: (filePath: string) => Promise<Buffer>;

    /**
     * Write data to file
     * @param filePath Path to file
     * @param data Data to write
     * @throws Error if write fails
     */
    writeFile: (filePath: string, data: string | Buffer) => Promise<void>;

    /**
     * Check if path exists
     * @param filePath Path to check
     * @returns True if exists
     * @throws Error if check fails
     */
    exists: (filePath: string) => Promise<boolean>;

    /**
     * Get file/directory stats
     * @param filePath Path to file/directory
     * @returns Stats object
     * @throws Error if stat fails
     */
    stat: (filePath: string) => Promise<{
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtime: Date;
      birthtime: Date;
    }>;

    /**
     * Create directory
     * @param dirPath Path to directory
     * @param options Options for mkdir
     * @throws Error if creation fails
     */
    mkdir: (dirPath: string, options?: { recursive?: boolean }) => Promise<void>;

    /**
     * Delete file
     * @param filePath Path to file
     * @throws Error if deletion fails
     */
    unlink: (filePath: string) => Promise<void>;
  };
}

/**
 * Global window interface extension
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};