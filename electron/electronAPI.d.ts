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
