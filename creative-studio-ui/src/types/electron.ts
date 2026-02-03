/**
 * Electron API types for renderer process
 * Aligned with electron/electronAPI.d.ts
 */

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

/**
 * Electron API interface
 */
export interface StoryCoreElectronAPI {
  // System information
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };

  // Project management
  project: {
    create: (data: ProjectData) => Promise<Project>;
    open: (path: string) => Promise<Project>;
    selectForOpen: () => Promise<string | null>;
    validate: (path: string) => Promise<ValidationResult>;
    selectDirectory: () => Promise<string | null>;
    listDirectory: (path: string) => Promise<DirectoryItem[]>;
    updateMetadata: (path: string, metadata: Record<string, any>) => Promise<Project>;
  };

  // Sequence management
  sequence: {
    updateShot: (projectPath: string, sequenceId: string, shotId: string, updates: Record<string, any>) => Promise<any>;
    getShots: (projectPath: string, sequenceId: string) => Promise<any[]>;
    getAll: (projectPath: string) => Promise<any[]>;
  };

  // Recent projects management
  recentProjects: {
    get: () => Promise<RecentProject[]>;
    add: (project: Omit<RecentProject, 'lastAccessed' | 'exists'>) => Promise<void>;
    remove: (path: string) => Promise<void>;
    getMergedList: (options?: ScanProjectsOptions) => Promise<MergedProject[]>;
    refresh: () => Promise<MergedProject[]>;
  };

  // Project discovery
  projectDiscovery: {
    discoverProjects: () => Promise<DiscoveryResult>;
  };

  // Server management
  server: {
    getStatus: () => Promise<ServerStatus>;
    restart: () => Promise<void>;
  };

  // Application controls
  app: {
    quit: () => void;
    minimize: () => void;
    showDevTools: () => void;
    openFolder: (path: string) => Promise<void>;
  };

  // File system operations
  fs: {
    readdir: (dirPath: string) => Promise<string[]>;
    readFile: (filePath: string) => Promise<Buffer>;
    writeFile: (filePath: string, data: string | Buffer) => Promise<void>;
    exists: (filePath: string) => Promise<boolean>;
    stat: (filePath: string) => Promise<{
      isFile: boolean;
      isDirectory: boolean;
      size: number;
      mtime: Date;
      birthtime: Date;
    }>;
    mkdir: (dirPath: string, options?: { recursive?: boolean }) => Promise<void>;
    unlink: (filePath: string) => Promise<void>;
  };

  // Dialogs
  dialog: {
    showSaveDialog: (options: Electron.SaveDialogOptions) => Promise<Electron.SaveDialogReturnValue>;
    showOpenDialog: (options: { title: string; buttonLabel: string; properties: string[] }) => Promise<{
      canceled: boolean;
      filePaths: string[];
    }>;
  };

  // LLM integration
  llm: {
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<any>;
    testConnection: (provider: any) => Promise<{ success: boolean; message: string }>;
    getModels: (provider: any) => Promise<any[]>;
  };

  // ComfyUI integration
  comfyui: {
    getConfig: () => Promise<any>;
    updateConfig: (config: any) => Promise<any>;
    testConnection: () => Promise<{ success: boolean; message: string }>;
    getServiceStatus: () => Promise<any>;
    startService: () => Promise<any>;
    stopService: () => Promise<any>;
    executeWorkflow: (workflow: any) => Promise<any>;
    getQueueStatus: () => Promise<any>;
    uploadMedia: (filePath: string, filename: string) => Promise<any>;
    downloadOutput: (filename: string, outputPath: string) => Promise<any>;
  };

  // Rover (Persistent Memory Layer)
  rover: {
    sync: (projectPath: string, projectId: string, message: string, data: any) => Promise<RoverCommit>;
    getHistory: (projectPath: string) => Promise<RoverHistory>;
    restoreCheckpoint: (projectPath: string, commitId: string) => Promise<any>;
  };
}

export { };
