/**
 * Electron Preload Script
 * 
 * Context isolation and secure IPC communication
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected APIs to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Menu APIs
  menu: {
    getTemplate: () => ipcRenderer.invoke('menu:get-template'),
    updateItem: (id: string, enabled: boolean) => 
      ipcRenderer.invoke('menu:update-item', id, enabled),
  },

  // Tray APIs
  tray: {
    showNotification: (options: any) => 
      ipcRenderer.invoke('tray:show-notification', options),
    updateIcon: (iconPath?: string) => 
      ipcRenderer.invoke('tray:update-icon', iconPath),
  },

  // Shortcut APIs
  shortcuts: {
    register: (id: string, config: any) => 
      ipcRenderer.invoke('shortcuts:register', id, config),
    unregister: (id: string) => 
      ipcRenderer.invoke('shortcuts:unregister', id),
    getAll: () => ipcRenderer.invoke('shortcuts:get-all'),
  },

  // File System APIs
  fs: {
    openDialog: (options?: any) => 
      ipcRenderer.invoke('fs:open-dialog', options),
    saveDialog: (options?: any) => 
      ipcRenderer.invoke('fs:save-dialog', options),
    readFile: (path: string, options?: any) => 
      ipcRenderer.invoke('fs:read-file', path, options),
    writeFile: (path: string, data: any, options?: any) => 
      ipcRenderer.invoke('fs:write-file', path, data, options),
    getFileInfo: (path: string) => 
      ipcRenderer.invoke('fs:get-file-info', path),
    readDirectory: (path: string) => 
      ipcRenderer.invoke('fs:read-directory', path),
    deleteFile: (path: string) => 
      ipcRenderer.invoke('fs:delete-file', path),
    moveFile: (sourcePath: string, destPath: string) => 
      ipcRenderer.invoke('fs:move-file', sourcePath, destPath),
    copyFile: (sourcePath: string, destPath: string) => 
      ipcRenderer.invoke('fs:copy-file', sourcePath, destPath),
    createDirectory: (path: string) => 
      ipcRenderer.invoke('fs:create-directory', path),
    getRecentFiles: () => ipcRenderer.invoke('fs:get-recent-files'),
  },

  // Print APIs
  print: {
    currentWindow: (options?: any) => 
      ipcRenderer.invoke('print:current-window', options),
    html: (html: string, options?: any) => 
      ipcRenderer.invoke('print:html', html, options),
    pdf: (pdfPath: string, options?: any) => 
      ipcRenderer.invoke('print:pdf', pdfPath, options),
    showPreview: (options?: any) => 
      ipcRenderer.invoke('print:show-preview', options),
    getPrinters: () => ipcRenderer.invoke('print:get-printers'),
    getJobs: () => ipcRenderer.invoke('print:get-jobs'),
    cancelJob: (jobId: string) => 
      ipcRenderer.invoke('print:cancel-job', jobId),
  },

  // Window APIs
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  },

  // Event listeners
  on: {
    menu: {
      newProject: (callback: () => void) => {
        ipcRenderer.on('menu:new-project', callback);
      },
      openProject: (callback: () => void) => {
        ipcRenderer.on('menu:open-project', callback);
      },
      saveProject: (callback: () => void) => {
        ipcRenderer.on('menu:save-project', callback);
      },
      saveProjectAs: (callback: () => void) => {
        ipcRenderer.on('menu:save-project-as', callback);
      },
      importMedia: (callback: () => void) => {
        ipcRenderer.on('menu:import-media', callback);
      },
      exportProject: (callback: () => void) => {
        ipcRenderer.on('menu:export-project', callback);
      },
      settings: (callback: () => void) => {
        ipcRenderer.on('menu:settings', callback);
      },
      print: (callback: () => void) => {
        ipcRenderer.on('menu:print', callback);
      },
    },
    tray: {
      newProject: (callback: () => void) => {
        ipcRenderer.on('tray:new-project', callback);
      },
      openRecent: (callback: (event: any, projectId: string) => void) => {
        ipcRenderer.on('tray:open-recent', callback);
      },
      preferences: (callback: () => void) => {
        ipcRenderer.on('tray:preferences', callback);
      },
    },
    shortcut: {
      newProject: (callback: () => void) => {
        ipcRenderer.on('shortcut:new-project', callback);
      },
      openProject: (callback: () => void) => {
        ipcRenderer.on('shortcut:open-project', callback);
      },
      saveProject: (callback: () => void) => {
        ipcRenderer.on('shortcut:save-project', callback);
      },
      playPause: (callback: () => void) => {
        ipcRenderer.on('shortcut:play-pause', callback);
      },
      print: (callback: () => void) => {
        ipcRenderer.on('shortcut:print', callback);
      },
    },
  },

  // Remove listeners
  removeListeners: {
    menu: {
      newProject: (callback: () => void) => {
        ipcRenderer.removeListener('menu:new-project', callback);
      },
    },
  },
});

// Type definitions for exposed APIs
declare global {
  interface Window {
    electronAPI: {
      menu: {
        getTemplate: () => Promise<any>;
        updateItem: (id: string, enabled: boolean) => Promise<void>;
      };
      tray: {
        showNotification: (options: any) => Promise<void>;
        updateIcon: (iconPath?: string) => Promise<void>;
      };
      shortcuts: {
        register: (id: string, config: any) => Promise<boolean>;
        unregister: (id: string) => Promise<void>;
        getAll: () => Promise<any>;
      };
      fs: {
        openDialog: (options?: any) => Promise<string[] | null>;
        saveDialog: (options?: any) => Promise<string | null>;
        readFile: (path: string, options?: any) => Promise<any>;
        writeFile: (path: string, data: any, options?: any) => Promise<void>;
        getFileInfo: (path: string) => Promise<any>;
        readDirectory: (path: string) => Promise<any[]>;
        deleteFile: (path: string) => Promise<void>;
        moveFile: (sourcePath: string, destPath: string) => Promise<void>;
        copyFile: (sourcePath: string, destPath: string) => Promise<void>;
        createDirectory: (path: string) => Promise<void>;
        getRecentFiles: () => Promise<string[]>;
      };
      print: {
        currentWindow: (options?: any) => Promise<boolean>;
        html: (html: string, options?: any) => Promise<boolean>;
        pdf: (pdfPath: string, options?: any) => Promise<boolean>;
        showPreview: (options?: any) => Promise<void>;
        getPrinters: () => Promise<any[]>;
        getJobs: () => Promise<any[]>;
        cancelJob: (jobId: string) => Promise<boolean>;
      };
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
        toggleFullscreen: () => Promise<void>;
      };
      on: {
        menu: {
          newProject: (callback: () => void) => void;
          openProject: (callback: () => void) => void;
          saveProject: (callback: () => void) => void;
          saveProjectAs: (callback: () => void) => void;
          importMedia: (callback: () => void) => void;
          exportProject: (callback: () => void) => void;
          settings: (callback: () => void) => void;
          print: (callback: () => void) => void;
        };
        tray: {
          newProject: (callback: () => void) => void;
          openRecent: (callback: (event: any, projectId: string) => void) => void;
          preferences: (callback: () => void) => void;
        };
        shortcut: {
          newProject: (callback: () => void) => void;
          openProject: (callback: () => void) => void;
          saveProject: (callback: () => void) => void;
          playPause: (callback: () => void) => void;
          print: (callback: () => void) => void;
        };
      };
      removeListeners: {
        menu: {
          newProject: (callback: () => void) => void;
        };
      };
    };
  }
}
