/**
 * Electron API types for renderer process
 * Aligned with electron/electronAPI.d.ts
 */

export interface ProjectData {
  name: string;
  location?: string;
  template?: string;
  format?: unknown;
  initialShots?: unknown[];
  initialCharacters?: unknown[];
  initialLocations?: unknown[];
  initialObjects?: unknown[];
  settings?: Record<string, unknown>;
  discussion?: string; // Discussion history to save as markdown
}

export interface ProjectFormat {
  aspectRatio: string;
  resolution: string;
  frameRate: number;
  colorSpace: string;
}

export interface ShotData {
  id: string;
  name?: string;
  type?: string;
  duration?: number;
  parameters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  version: string;
  createdAt: number | string | Date;
  modifiedAt: number | string | Date;
  config: Record<string, unknown>;
}

export interface ProjectConfig {
  [key: string]: unknown;
  autoSave?: boolean;
  defaultOutput?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastAccessed: number; // timestamp
  exists?: boolean;
}

export interface MergedProject {
  id?: string;
  name: string;
  path: string;
  lastModified: number; // timestamp
  createdAt?: number; // timestamp
  isRecent: boolean;
  lastOpened?: number; // timestamp
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
  createdAt?: number; // timestamp
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
  config?: ProjectConfig;
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
  releaseDate: number; // timestamp
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

  // Character management
  character: {
    list: (projectPath: string) => Promise<any[]>;
    get: (projectPath: string, characterId: string) => Promise<any>;
    create: (projectPath: string, data: any) => Promise<any>;
    update: (projectPath: string, characterId: string, data: any) => Promise<any>;
    delete: (projectPath: string, characterId: string) => Promise<void>;
  };

  // World management
  world: {
    list: (projectPath: string) => Promise<any[]>;
    get: (projectPath: string, worldId: string) => Promise<any>;
    update: (projectPath: string, worldId: string, data: any) => Promise<any>;
  };

  // Location management
  location: {
    list: (projectPath: string) => Promise<any[]>;
    get: (projectPath: string, locationId: string) => Promise<any>;
    update: (projectPath: string, locationId: string, data: any) => Promise<any>;
  };

  // Story management
  story: {
    list: (projectPath: string) => Promise<any[]>;
    get: (projectPath: string, storyId: string) => Promise<any>;
    update: (projectPath: string, storyId: string, data: any) => Promise<any>;
  };

  // Sequence management
  sequence: {
    updateShot: (projectPath: string, sequenceId: string, shotId: string, updates: Record<string, unknown>) => Promise<void>;
    getShots: (projectPath: string, sequenceId: string) => Promise<ShotData[]>;
    getAll: (projectPath: string) => Promise<any[]>;
    list: (projectPath: string) => Promise<any[]>;
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
      mtime: number; // timestamp
      birthtime: number; // timestamp
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
    getConfig: () => Promise<LLMConfig>;
    updateConfig: (config: Partial<LLMConfig>) => Promise<LLMConfig>;
    testConnection: (provider: LLMProvider) => Promise<{ success: boolean; message: string }>;
    getModels: (provider: LLMProvider) => Promise<string[]>;
  };

  // ComfyUI integration
  comfyui: {
    getConfig: () => Promise<ComfyUIConfig>;
    updateConfig: (config: Partial<ComfyUIConfig>) => Promise<ComfyUIConfig>;
    testConnection: () => Promise<{ success: boolean; message: string }>;
    getServiceStatus: (url?: string) => Promise<{ running: boolean; pid?: number }>;
    startService: () => Promise<void>;
    stopService: () => Promise<void>;
    executeWorkflow: (workflow: ComfyUIWorkflow) => Promise<{ prompt_id: string }>;
    getQueueStatus: () => Promise<{ queue_remaining: number }>;
    uploadMedia: (filePath: string, filename: string) => Promise<string>;
    downloadOutput: (filename: string, outputPath: string) => Promise<void>;
    /**
     * Discover ComfyUI servers on the local network
     * @returns Array of discovered servers
     */
    discoverNetwork: () => Promise<any[]>;
    /**
     * Discover MCP servers on the local network
     * @returns Array of discovered MCP servers
     */
    discoverMcp: () => Promise<any[]>;
    /**
     * Connect to an MCP server
     */
    connect: (serverId: string, options: any) => Promise<any>;
    /**
     * Disconnect from an MCP server
     */
    disconnect: (serverId: string) => Promise<void>;
    /**
     * List tools available on an MCP server
     */
    listTools: (serverId: string) => Promise<any[]>;
    /**
     * Call a tool on an MCP server
     */
    callTool: (serverId: string, toolName: string, args: any) => Promise<any>;
    /**
     * List resources available on an MCP server
     */
    listResources: (serverId: string) => Promise<any[]>;
    /**
     * Read a resource from an MCP server
     */
    readResource: (serverId: string, resourceUri: string) => Promise<any>;
  };

  // Rover (Persistent Memory Layer)
  rover: {
    sync: (projectPath: string, projectId: string, message: string, data: unknown) => Promise<RoverCommit>;
    getHistory: (projectPath: string) => Promise<RoverHistory>;
    restoreCheckpoint: (projectPath: string, commitId: string) => Promise<void>;
  };

  // Terminal/Command execution
  executeCommand: (options: { command: string; cwd?: string; shell?: boolean }) => Promise<{ success: boolean; output: string; error?: string }>;

  // Chat window management
  chatWindow: {
    open: () => Promise<void>;
    close: () => Promise<void>;
    toggle: () => Promise<void>;
    isOpen: () => Promise<boolean>;
    onStateChanged: (callback: (state: { isOpen: boolean }) => void) => () => void;
    sendMessage: (message: ChatMessage) => void;
    onMessage: (callback: (message: ChatMessage) => void) => () => void;
    syncState: (state: Record<string, unknown>) => void;
    onStateUpdate: (callback: (state: Record<string, unknown>) => void) => () => void;
  };

  // Screen capture
  screen: {
    capture: (options?: { quality?: number; format?: 'png' | 'jpg'; displayIndex?: number }) => Promise<string>;
    startAreaCapture: (options?: { quality?: number; format?: 'png' | 'jpg' }) => Promise<string | null>;
    saveCapture: (data: string, filename: string, projectPath?: string) => Promise<{ success: boolean; path: string }>;
  };

  // Configuration management
  config: {
    saveProject: (projectId: string, config: any) => Promise<void>;
    loadProject: (projectId: string) => Promise<any>;
    saveGlobal: (config: any) => Promise<void>;
    loadGlobal: () => Promise<any>;
    validate: (config: any, rules: any[]) => Promise<any>;
  };

  // Event listening
  on: (channel: string, func: (...args: unknown[]) => void) => () => void;
  once: (channel: string, func: (...args: unknown[]) => void) => void;
  off: (channel: string, func: (...args: unknown[]) => void) => void;
}

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey?: string;
  apiBaseUrl?: string;
  temperature: number;
  maxTokens: number;
}

export interface LLMProvider {
  id: string;
  name: string;
  baseUrl: string;
  type: 'openai' | 'ollama' | 'anthropic' | 'custom';
}

export interface ComfyUIConfig {
  baseUrl: string;
  wsUrl: string;
  outputPath: string;
  inputPath: string;
  gpuId: number;
  lowVram: boolean;
}

export interface ComfyUIWorkflow {
  nodes: Record<string, unknown>[];
  links: Array<[number, number, number, number, number, string]>;
  extra_data?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export { };
