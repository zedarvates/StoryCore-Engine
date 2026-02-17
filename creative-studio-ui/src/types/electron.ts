/**
 * Electron API types for renderer process
 * Aligned with electron/electronAPI.d.ts
 */

export interface ProjectData {
  name: string;
  location?: string;
  template?: string;
  format?: Record<string, unknown>;
  initialShots?: Record<string, unknown>[];
}

export interface Project {
  id: string;
  name: string;
  path: string;
  version: string;
  createdAt: Date;
  modifiedAt: Date;
  config: Record<string, unknown>;
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
  config?: Record<string, unknown>;
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
  // Dialog helpers
  showInputDialog?: (message: string, defaultValue?: string) => Promise<string | null>;

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
    updateMetadata: (path: string, metadata: Record<string, unknown>) => Promise<Project>;
  };

  // Sequence management
  sequence: {
    updateShot: (projectPath: string, sequenceId: string, shotId: string, updates: Record<string, unknown>) => Promise<unknown>;
    getShots: (projectPath: string, sequenceId: string) => Promise<unknown[]>;
    getAll: (projectPath: string) => Promise<unknown[]>;
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
    getConfig: () => Promise<Record<string, unknown>>;
    updateConfig: (config: Record<string, unknown>) => Promise<Record<string, unknown>>;
    testConnection: (provider: Record<string, unknown>) => Promise<{ success: boolean; message: string }>;
    getModels: (provider: Record<string, unknown>) => Promise<unknown[]>;
  };

  // ComfyUI integration
  comfyui: {
    getConfig: () => Promise<Record<string, unknown>>;
    updateConfig: (config: Record<string, unknown>) => Promise<Record<string, unknown>>;
    testConnection: () => Promise<{ success: boolean; message: string }>;
    getServiceStatus: () => Promise<Record<string, unknown>>;
    startService: () => Promise<Record<string, unknown>>;
    stopService: () => Promise<Record<string, unknown>>;
    executeWorkflow: (workflow: Record<string, unknown>) => Promise<Record<string, unknown>>;
    getQueueStatus: () => Promise<Record<string, unknown>>;
    uploadMedia: (filePath: string, filename: string) => Promise<unknown>;
    downloadOutput: (filename: string, outputPath: string) => Promise<unknown>;
  };

  // Rover (Persistent Memory Layer)
  rover: {
    sync: (projectPath: string, projectId: string, message: string, data: Record<string, unknown>) => Promise<RoverCommit>;
    getHistory: (projectPath: string) => Promise<RoverHistory>;
    restoreCheckpoint: (projectPath: string, commitId: string) => Promise<unknown>;
  };

  // Terminal/Command execution
  executeCommand: (options: { command: string; cwd?: string; shell?: boolean }) => Promise<{ success: boolean; output: string; error?: string }>;
}

export { };
