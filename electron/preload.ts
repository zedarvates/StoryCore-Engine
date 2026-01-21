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
    create: async (data: { name: string; location: string }) => {
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

  // ComfyUI integration
  comfyui: {
    executeWorkflow: async (workflowData: any) => {
      const result = await ipcRenderer.invoke('comfyui:execute-workflow', workflowData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to execute ComfyUI workflow');
      }
      return result;
    },
    getQueueStatus: async () => {
      const result = await ipcRenderer.invoke('comfyui:get-queue-status');
      if (!result.success) {
        throw new Error(result.error || 'Failed to get ComfyUI queue status');
      }
      return result.queue;
    },
    uploadMedia: async (mediaPath: string) => {
      const result = await ipcRenderer.invoke('comfyui:upload-media', mediaPath);
      if (!result.success) {
        throw new Error(result.error || 'Failed to upload media to ComfyUI');
      }
      return result;
    },
    downloadOutput: async (outputId: string) => {
      const result = await ipcRenderer.invoke('comfyui:download-output', outputId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to download ComfyUI output');
      }
      return result;
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
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Export type for use in renderer
export type { ElectronAPI } from './electronAPI';

