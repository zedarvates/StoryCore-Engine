import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from './electronAPI';

/**
 * Electron API exposed to the renderer process
 * This provides a secure bridge between the main and renderer processes
 */
const electronAPI: ElectronAPI = {
  // System information
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },

  // Project management (to be implemented in future tasks)
  project: {
    create: async (data: { name: string; location?: string; format?: any; initialShots?: any[] }) => {
      const result = await ipcRenderer.invoke('project:create', data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create project');
      }
      return result.project;
    },
    open: async (path: string) => {
      const result = await ipcRenderer.invoke('project:open', path);
      if (!result.success) {
        throw new Error(result.error || 'Failed to open project');
      }
      return result.project;
    },
    selectForOpen: async () => {
      const result = await ipcRenderer.invoke('project:select-for-open');
      if (!result.success) {
        throw new Error(result.error || 'Failed to select project');
      }
      return result.path;
    },
    validate: async (path: string) => {
      const result = await ipcRenderer.invoke('project:validate', path);
      if (!result.success) {
        throw new Error(result.error || 'Failed to validate project');
      }
      return result.validation;
    },
    selectDirectory: async () => {
      const result = await ipcRenderer.invoke('project:select-directory');
      if (!result.success) {
        throw new Error(result.error || 'Failed to select directory');
      }
      return result.path;
    },
    listDirectory: async (path: string) => {
      const result = await ipcRenderer.invoke('project:list-directory', path);
      if (!result.success) {
        throw new Error(result.error || 'Failed to list directory');
      }
      return result.contents;
    },
    updateMetadata: async (path: string, metadata: Record<string, any>) => {
      const result = await ipcRenderer.invoke('project:update-metadata', path, metadata);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update project metadata');
      }
      return result.project;
    },
  },

  // Sequence management
  sequence: {
    updateShot: async (projectPath: string, sequenceId: string, shotId: string, updates: Record<string, any>) => {
      const result = await ipcRenderer.invoke('sequence:update-shot', projectPath, sequenceId, shotId, updates);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update shot in sequence');
      }
      return result.shot;
    },
    getShots: async (projectPath: string, sequenceId: string) => {
      const result = await ipcRenderer.invoke('sequence:get-shots', projectPath, sequenceId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get shots from sequence');
      }
      return result.shots;
    },
    getAll: async (projectPath: string) => {
      const result = await ipcRenderer.invoke('sequence:get-all', projectPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get all sequences');
      }
      return result.sequences;
    },
  },

  // Recent projects management (to be implemented in future tasks)
  recentProjects: {
    get: async () => {
      const result = await ipcRenderer.invoke('recent-projects:get');
      if (!result.success) {
        throw new Error(result.error || 'Failed to get recent projects');
      }
      return result.projects;
    },
    add: async (project: any) => {
      const result = await ipcRenderer.invoke('recent-projects:add', project);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add recent project');
      }
    },
    remove: async (path: string) => {
      const result = await ipcRenderer.invoke('recent-projects:remove', path);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove recent project');
      }
    },
    getMergedList: async (options?: any) => {
      const result = await ipcRenderer.invoke('projects:get-merged-list', options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get merged project list');
      }
      return result.projects;
    },
    refresh: async () => {
      const result = await ipcRenderer.invoke('projects:refresh');
      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh project list');
      }
      return result.projects;
    },
  },

  // Project discovery
  projectDiscovery: {
    discoverProjects: async () => {
      // Returns DiscoveryResult directly (no success wrapper)
      const result = await ipcRenderer.invoke('discover-projects');
      return result;
    },
  },

  // Server management (to be implemented in future tasks)
  server: {
    getStatus: async () => {
      const result = await ipcRenderer.invoke('server:status');
      if (!result.success) {
        throw new Error(result.error || 'Failed to get server status');
      }
      return result.status;
    },
    restart: async () => {
      const result = await ipcRenderer.invoke('server:restart');
      if (!result.success) {
        throw new Error(result.error || 'Failed to restart server');
      }
    },
  },

  // Application controls
  app: {
    quit: () => {
      ipcRenderer.send('app:quit');
    },
    minimize: () => {
      ipcRenderer.send('app:minimize');
    },
    showDevTools: () => {
      ipcRenderer.send('app:show-devtools');
    },
  },

  // File system operations
  fs: {
    readdir: async (dirPath: string) => {
      const result = await ipcRenderer.invoke('fs:readdir', dirPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to read directory');
      }
      return result.items;
    },
    readFile: async (filePath: string) => {
      const result = await ipcRenderer.invoke('fs:readFile', filePath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to read file');
      }
      return result.data;
    },
    writeFile: async (filePath: string, data: string | Buffer) => {
      const result = await ipcRenderer.invoke('fs:writeFile', filePath, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to write file');
      }
    },
    exists: async (filePath: string) => {
      const result = await ipcRenderer.invoke('fs:exists', filePath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to check if path exists');
      }
      return result.exists;
    },
    stat: async (filePath: string) => {
      const result = await ipcRenderer.invoke('fs:stat', filePath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get file stats');
      }
      return result.stats;
    },
    mkdir: async (dirPath: string, options?: { recursive?: boolean }) => {
      const result = await ipcRenderer.invoke('fs:mkdir', dirPath, options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create directory');
      }
    },
    unlink: async (filePath: string) => {
      const result = await ipcRenderer.invoke('fs:unlink', filePath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete file');
      }
    },
  },

  // Dialogs
  dialog: {
    showSaveDialog: async (options: Electron.SaveDialogOptions) => {
      const result = await ipcRenderer.invoke('dialog:show-save', options);
      if (!result.success) {
        throw new Error(result.error || 'Failed to show save dialog');
      }
      return result.result;
    },
  },

  // LLM integration
  llm: {
    getConfig: async () => {
      const result = await ipcRenderer.invoke('llm:get-config');
      if (!result.success) {
        throw new Error(result.error || 'Failed to get LLM configuration');
      }
      return result.config;
    },
    updateConfig: async (config: any) => {
      const result = await ipcRenderer.invoke('llm:update-config', config);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update LLM configuration');
      }
      return result.config;
    },
    testConnection: async (provider: any) => {
      const result = await ipcRenderer.invoke('llm:test-connection', provider);
      return {
        success: result.success,
        message: result.message,
      };
    },
    getModels: async (provider: any) => {
      const result = await ipcRenderer.invoke('llm:get-models', provider);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get available models');
      }
      return result.models;
    },
  },

  // ComfyUI integration (enhanced)
  comfyui: {
    getConfig: async () => {
      const result = await ipcRenderer.invoke('comfyui:get-config');
      if (!result.success) {
        throw new Error(result.error || 'Failed to get ComfyUI configuration');
      }
      return result.config;
    },
    updateConfig: async (config: any) => {
      const result = await ipcRenderer.invoke('comfyui:update-config', config);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update ComfyUI configuration');
      }
      return result.config;
    },
    testConnection: async () => {
      const result = await ipcRenderer.invoke('comfyui:test-connection');
      return {
        success: result.success,
        message: result.message,
      };
    },
    getServiceStatus: async () => {
      const result = await ipcRenderer.invoke('comfyui:get-service-status');
      if (!result.success) {
        throw new Error(result.error || 'Failed to get ComfyUI service status');
      }
      return result.status;
    },
    startService: async () => {
      const result = await ipcRenderer.invoke('comfyui:start-service');
      if (!result.success) {
        throw new Error(result.error || 'Failed to start ComfyUI service');
      }
      return result;
    },
    stopService: async () => {
      const result = await ipcRenderer.invoke('comfyui:stop-service');
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop ComfyUI service');
      }
      return result;
    },
    executeWorkflow: async (workflow: any) => {
      const result = await ipcRenderer.invoke('comfyui:execute-workflow', workflow);
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute workflow');
      }
      return result;
    },
    getQueueStatus: async () => {
      const result = await ipcRenderer.invoke('comfyui:get-queue-status');
      if (!result.success) {
        throw new Error(result.error || 'Failed to get queue status');
      }
      return result.queue;
    },
    uploadMedia: async (filePath: string, filename: string) => {
      const result = await ipcRenderer.invoke('comfyui:upload-media', filePath, filename);
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload media');
      }
      return result.url;
    },
    downloadOutput: async (filename: string, outputPath: string) => {
      const result = await ipcRenderer.invoke('comfyui:download-output', filename, outputPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to download output');
      }
      return result.path;
    },
  },

  // Rover (Persistent Memory Layer)
  rover: {
    sync: async (projectPath: string, projectId: string, message: string, data: any) => {
      const result = await ipcRenderer.invoke('rover:sync', projectPath, projectId, message, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to sync project state');
      }
      return result.commit;
    },
    getHistory: async (projectPath: string) => {
      const result = await ipcRenderer.invoke('rover:get-history', projectPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to get project history');
      }
      return result.history;
    },
    restoreCheckpoint: async (projectPath: string, commitId: string) => {
      const result = await ipcRenderer.invoke('rover:restore-checkpoint', projectPath, commitId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to restore checkpoint');
      }
      return result.data;
    },
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Export type for use in renderer
export type { ElectronAPI } from './electronAPI';

