/**
 * Type definitions for Electron API exposed to renderer process
 */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProjectData {
  name: string;
  location?: string;
  template?: string;
  format?: any;
  initialShots?: any[];
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

export interface MergedProject {
  id?: string;
  name: string;
  path: string;
  lastModified: Date;
  createdAt?: Date;
  isRecent: boolean;
  lastOpened?: Date;
  exists?: boolean;
}

export interface DiscoveredProject {
  name: string;
  path: string;
  lastModified: number;
  isValid: boolean;
  metadata?: {
    schema_version: string;
    project_name: string;
    capabilities: Record<string, boolean>;
  };
  createdAt?: Date;
  isRecent: boolean;
}

export interface DiscoveryResult {
  projects: DiscoveredProject[];
  scannedPath: string;
  timestamp: number;
  errors: Array<{ path: string; error: string }>;
}

export interface ScanProjectsOptions {
  bypassCache?: boolean;
  maxDepth?: number;
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

export interface RoverCommit {
  id: string;
  timestamp: string;
  message: string;
  author: string;
  schema_version: string;
  snapshot_path?: string;
}

export interface RoverHistory {
  project_id: string;
  created_at: string;
  updated_at: string;
  current_commit_id: string | null;
  commits: RoverCommit[];
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

    /**
     * Get merged list of discovered and recent projects
     * @param options Optional scan options
     * @returns Array of merged projects
     * @throws Error if retrieval fails
     */
    getMergedList: (options?: ScanProjectsOptions) => Promise<MergedProject[]>;

    /**
     * Refresh project list (bypass cache)
     * @returns Array of merged projects
     * @throws Error if refresh fails
     */
    refresh: () => Promise<MergedProject[]>;
  };

  // Project discovery
  projectDiscovery: {
    /**
     * Discover all valid StoryCore projects in the default projects directory
     * @returns Discovery result with projects, scanned path, timestamp, and errors
     */
    discoverProjects: () => Promise<DiscoveryResult>;
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

    /**
     * Open a folder in the file explorer
     * @param path Path to the folder to open
     * @throws Error if opening fails
     */
    openFolder: (path: string) => Promise<void>;
  };

  // ComfyUI integration
  comfyui: {
    /**
     * Get ComfyUI configuration
     * @returns ComfyUI configuration
     * @throws Error if retrieval fails
     */
    getConfig: () => Promise<any>;

    /**
     * Update ComfyUI configuration
     * @param config Configuration to update
     * @returns Updated configuration
     * @throws Error if update fails
     */
    updateConfig: (config: any) => Promise<any>;

    /**
     * Test ComfyUI connection
     * @returns Connection test result
     */
    testConnection: () => Promise<{ success: boolean; message: string }>;

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

    /**
     * Execute a ComfyUI workflow
     * @param workflow Workflow data to execute
     * @returns Execution result
     * @throws Error if execution fails
     */
    executeWorkflow: (workflow: any) => Promise<any>;

    /**
     * Get ComfyUI queue status
     * @returns Queue status information
     * @throws Error if retrieval fails
     */
    getQueueStatus: () => Promise<any>;

    /**
     * Upload media to ComfyUI
     * @param filePath Path to media file
     * @param filename Filename for the upload
     * @returns Upload result with URL
     * @throws Error if upload fails
     */
    uploadMedia: (filePath: string, filename: string) => Promise<any>;

    /**
     * Download output from ComfyUI
     * @param filename Filename of the output
     * @param outputPath Path to save the output
     * @returns Path to downloaded file
     * @throws Error if download fails
     */
    downloadOutput: (filename: string, outputPath: string) => Promise<any>;
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

  // Dialogs
  dialog: {
    /**
     * Show save dialog
     * @param options Save dialog options
     * @returns Selected file path or canceled status
     */
    showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
  };

  // LLM integration
  llm: {
    /**
     * Get LLM configuration
     * @returns LLM configuration
     * @throws Error if retrieval fails
     */
    getConfig: () => Promise<any>;

    /**
     * Update LLM configuration
     * @param config Configuration to update
     * @returns Updated configuration
     * @throws Error if update fails
     */
    updateConfig: (config: any) => Promise<any>;

    /**
     * Test LLM connection
     * @param provider Provider to test
     * @returns Connection test result
     */
    testConnection: (provider: any) => Promise<{ success: boolean; message: string }>;

    /**
     * Get available models
     * @param provider Provider to get models for
     * @returns List of available models
     * @throws Error if retrieval fails
     */
    getModels: (provider: any) => Promise<any[]>;
  };

  // Rover (Persistent Memory Layer)
  rover: {
    /**
     * Synchronize project state and create a commit
     * @param projectPath Path to the project directory
     * @param projectId ID of the project
     * @param message Commit message
     * @param data Snapshot data to save
     * @returns Created commit
     * @throws Error if sync fails
     */
    sync: (projectPath: string, projectId: string, message: string, data: any) => Promise<RoverCommit>;

    /**
     * Get project history
     * @param projectPath Path to the project directory
     * @returns Project history
     * @throws Error if retrieval fails
     */
    getHistory: (projectPath: string) => Promise<RoverHistory>;

    /**
     * Restore project to a specific checkpoint
     * @param projectPath Path to the project directory
     * @param commitId ID of the commit to restore
     * @returns Snapshot data from the checkpoint
     * @throws Error if restoration fails
     */
    restoreCheckpoint: (projectPath: string, commitId: string) => Promise<any>;
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

export { };
