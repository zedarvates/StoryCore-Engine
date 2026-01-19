/**
 * IPC channel definitions and handlers
 * 
 * Handles communication between main and renderer processes
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { ProjectService, NewProjectData } from './ProjectService';
import { RecentProjectsManager, RecentProject } from './RecentProjectsManager';
import { ViteServerManager, LauncherConfig } from './ViteServerManager';
import { getDefaultProjectsDirectory } from './defaultPaths';
import { UpdateManager } from './UpdateManager';

/**
 * IPC channel names
 */
export const IPC_CHANNELS = {
  // Project management
  PROJECT_CREATE: 'project:create',
  PROJECT_OPEN: 'project:open',
  PROJECT_SELECT_FOR_OPEN: 'project:select-for-open',
  PROJECT_VALIDATE: 'project:validate',
  PROJECT_SELECT_DIRECTORY: 'project:select-directory',
  PROJECT_LIST_DIRECTORY: 'project:list-directory',

  // Recent projects
  RECENT_PROJECTS_GET: 'recent-projects:get',
  RECENT_PROJECTS_ADD: 'recent-projects:add',
  RECENT_PROJECTS_REMOVE: 'recent-projects:remove',

  // Server management
  SERVER_STATUS: 'server:status',
  SERVER_RESTART: 'server:restart',

  // Update management
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  UPDATE_STATUS: 'update:status',
  UPDATE_CANCEL: 'update:cancel',

  // Application controls
  APP_QUIT: 'app:quit',
  APP_MINIMIZE: 'app:minimize',
  APP_SHOW_DEVTOOLS: 'app:show-devtools',

  // Production Wizard Draft Storage
  DRAFT_SAVE: 'draft:save',
  DRAFT_LOAD: 'draft:load',
  DRAFT_LIST: 'draft:list',
  DRAFT_DELETE: 'draft:delete',
} as const;

/**
 * IPC handlers manager
 */
export class IPCHandlers {
  private projectService: ProjectService;
  private recentProjectsManager: RecentProjectsManager;
  private serverManager?: ViteServerManager;
  private updateManager?: UpdateManager;

  constructor(
    projectService: ProjectService,
    recentProjectsManager: RecentProjectsManager,
    serverManager?: ViteServerManager,
    updateManager?: UpdateManager
  ) {
    this.projectService = projectService;
    this.recentProjectsManager = recentProjectsManager;
    this.serverManager = serverManager;
    this.updateManager = updateManager;
  }

  /**
   * Register all IPC handlers
   */
  registerHandlers(): void {
    this.registerProjectHandlers();
    this.registerRecentProjectsHandlers();
    this.registerServerHandlers();
    this.registerUpdateHandlers();
    this.registerAppHandlers();
    this.registerDraftHandlers();
  }

  /**
   * Unregister all IPC handlers
   */
  unregisterHandlers(): void {
    // Project handlers
    ipcMain.removeHandler(IPC_CHANNELS.PROJECT_CREATE);
    ipcMain.removeHandler(IPC_CHANNELS.PROJECT_OPEN);
    ipcMain.removeHandler(IPC_CHANNELS.PROJECT_VALIDATE);
    ipcMain.removeHandler(IPC_CHANNELS.PROJECT_SELECT_DIRECTORY);
    ipcMain.removeHandler(IPC_CHANNELS.PROJECT_LIST_DIRECTORY);

    // Recent projects handlers
    ipcMain.removeHandler(IPC_CHANNELS.RECENT_PROJECTS_GET);
    ipcMain.removeHandler(IPC_CHANNELS.RECENT_PROJECTS_ADD);
    ipcMain.removeHandler(IPC_CHANNELS.RECENT_PROJECTS_REMOVE);

    // Server handlers
    ipcMain.removeHandler(IPC_CHANNELS.SERVER_STATUS);
    ipcMain.removeHandler(IPC_CHANNELS.SERVER_RESTART);

    // Draft handlers
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_SAVE);
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_LOAD);
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_LIST);
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_DELETE);

    // App handlers
    ipcMain.removeAllListeners(IPC_CHANNELS.APP_QUIT);
    ipcMain.removeAllListeners(IPC_CHANNELS.APP_MINIMIZE);
    ipcMain.removeAllListeners(IPC_CHANNELS.APP_SHOW_DEVTOOLS);
  }

  /**
   * Register project management handlers
   */
  private registerProjectHandlers(): void {
    // Create project
    ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, data: NewProjectData) => {
      try {
        // Validate input
        if (!data || !data.name || !data.location) {
          throw new Error('Invalid project data: name and location are required');
        }

        // Create project
        const project = await this.projectService.createProject(data);

        // Add to recent projects
        this.recentProjectsManager.addProject({
          id: project.id,
          name: project.name,
          path: project.path,
        });

        return {
          success: true,
          project,
        };
      } catch (error) {
        console.error('Failed to create project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Open project
    ipcMain.handle(IPC_CHANNELS.PROJECT_OPEN, async (_event, projectPath: string) => {
      try {
        // Validate input
        if (!projectPath || typeof projectPath !== 'string') {
          throw new Error('Invalid project path');
        }

        // Open project
        const project = await this.projectService.openProject(projectPath);

        // Update recent projects
        this.recentProjectsManager.addProject({
          id: project.id,
          name: project.name,
          path: project.path,
        });

        return {
          success: true,
          project,
        };
      } catch (error) {
        console.error('Failed to open project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Select project directory for opening
    ipcMain.handle(IPC_CHANNELS.PROJECT_SELECT_FOR_OPEN, async (event) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          throw new Error('No window found');
        }

        const result = await dialog.showOpenDialog(window, {
          properties: ['openDirectory'],
          title: 'Select StoryCore Project Folder',
          defaultPath: getDefaultProjectsDirectory(),
          buttonLabel: 'Open Project',
        });

        if (result.canceled || result.filePaths.length === 0) {
          return {
            success: true,
            path: null,
          };
        }

        const selectedPath = result.filePaths[0];
        
        // Verify the selected path exists and is a directory
        const fs = require('fs');
        
        try {
          const stats = fs.statSync(selectedPath);
          
          if (!stats.isDirectory()) {
            console.error('Selected path is not a directory:', selectedPath);
            return {
              success: false,
              error: 'Please select a project folder',
            };
          }
        } catch (fsError) {
          console.error('Failed to check selected path:', fsError);
          return {
            success: false,
            error: 'Failed to access the selected folder. Please ensure the folder exists and is accessible.',
          };
        }

        return {
          success: true,
          path: selectedPath,
        };
      } catch (error) {
        console.error('Failed to open folder selection dialog:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to open folder selection dialog. Please try again.',
        };
      }
    });

    // Validate project
    ipcMain.handle(IPC_CHANNELS.PROJECT_VALIDATE, async (_event, projectPath: string) => {
      try {
        // Validate input
        if (!projectPath || typeof projectPath !== 'string') {
          throw new Error('Invalid project path');
        }

        // Validate project
        const validation = await this.projectService.validateProject(projectPath);

        return {
          success: true,
          validation,
        };
      } catch (error) {
        console.error('Failed to validate project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Select directory
    ipcMain.handle(IPC_CHANNELS.PROJECT_SELECT_DIRECTORY, async (event) => {
      try {
        const window = BrowserWindow.fromWebContents(event.sender);
        if (!window) {
          throw new Error('No window found');
        }

        const result = await dialog.showOpenDialog(window, {
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select Project Location',
          defaultPath: getDefaultProjectsDirectory(),
        });

        if (result.canceled || result.filePaths.length === 0) {
          return {
            success: true,
            path: null,
          };
        }

        return {
          success: true,
          path: result.filePaths[0],
        };
      } catch (error) {
        console.error('Failed to select directory:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // List directory contents
    ipcMain.handle(IPC_CHANNELS.PROJECT_LIST_DIRECTORY, async (_event, dirPath: string) => {
      try {
        const fs = require('fs');
        const path = require('path');

        if (!dirPath || typeof dirPath !== 'string') {
          throw new Error('Invalid directory path');
        }

        // Check if directory exists
        if (!fs.existsSync(dirPath)) {
          return {
            success: false,
            error: 'Directory does not exist',
          };
        }

        // Check if it's actually a directory
        const stats = fs.statSync(dirPath);
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: 'Path is not a directory',
          };
        }

        // Read directory contents
        const items = fs.readdirSync(dirPath);
        const contents = items.map((item: string) => {
          const fullPath = path.join(dirPath, item);
          const itemStats = fs.statSync(fullPath);

          return {
            name: item,
            path: fullPath,
            isDirectory: itemStats.isDirectory(),
            size: itemStats.size,
            modified: itemStats.mtime.toISOString(),
          };
        });

        // Sort: directories first, then files, alphabetically
        contents.sort((a: any, b: any) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });

        return {
          success: true,
          contents,
        };
      } catch (error) {
        console.error('Failed to list directory:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  /**
   * Register recent projects handlers
   */
  private registerRecentProjectsHandlers(): void {
    // Get recent projects
    ipcMain.handle(IPC_CHANNELS.RECENT_PROJECTS_GET, async () => {
      try {
        // Check existence of all projects
        await this.recentProjectsManager.checkProjectsExistence();
        
        const projects = this.recentProjectsManager.getProjects();

        return {
          success: true,
          projects,
        };
      } catch (error) {
        console.error('Failed to get recent projects:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          projects: [],
        };
      }
    });

    // Add recent project
    ipcMain.handle(IPC_CHANNELS.RECENT_PROJECTS_ADD, async (_event, project: Omit<RecentProject, 'lastAccessed' | 'exists'>) => {
      try {
        // Validate input
        if (!project || !project.id || !project.name || !project.path) {
          throw new Error('Invalid project data');
        }

        this.recentProjectsManager.addProject(project);

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to add recent project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Remove recent project
    ipcMain.handle(IPC_CHANNELS.RECENT_PROJECTS_REMOVE, async (_event, projectPath: string) => {
      try {
        // Validate input
        if (!projectPath || typeof projectPath !== 'string') {
          throw new Error('Invalid project path');
        }

        this.recentProjectsManager.removeProject(projectPath);

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to remove recent project:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  /**
   * Register server management handlers
   */
  private registerServerHandlers(): void {
    // Get server status
    ipcMain.handle(IPC_CHANNELS.SERVER_STATUS, async () => {
      try {
        if (!this.serverManager) {
          return {
            success: true,
            status: {
              running: false,
              url: null,
              port: null,
            },
          };
        }

        // Server manager doesn't expose isRunning/getServerInfo yet
        // For now, return basic status
        return {
          success: true,
          status: {
            running: true,
            url: null,
            port: null,
          },
        };
      } catch (error) {
        console.error('Failed to get server status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Restart server
    ipcMain.handle(IPC_CHANNELS.SERVER_RESTART, async () => {
      try {
        if (!this.serverManager) {
          throw new Error('Server manager not available');
        }

        // Stop and restart server
        await this.serverManager.stop();
        
        // Start with default config
        const config: LauncherConfig = {
          vitePort: 5173,
          fallbackPorts: [5174, 5175, 5176, 5177, 5178, 5179, 5180, 5181, 5182, 5183],
          serverStartTimeout: 30000,
          autoOpenBrowser: false,
        };
        
        await this.serverManager.start(config);

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to restart server:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  /**
   * Register update system handlers
   */
  private registerUpdateHandlers(): void {
    // Check for updates
    ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
      try {
        if (!this.updateManager) {
          throw new Error('Update manager not available');
        }

        const updateInfo = await this.updateManager.checkForUpdates();

        return {
          success: true,
          updateInfo,
        };
      } catch (error) {
        console.error('Failed to check for updates:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Download update
    ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async () => {
      try {
        if (!this.updateManager) {
          throw new Error('Update manager not available');
        }

        await this.updateManager.downloadUpdate();

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to download update:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Install update
    ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, async () => {
      try {
        if (!this.updateManager) {
          throw new Error('Update manager not available');
        }

        await this.updateManager.installUpdate();

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to install update:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Get update status
    ipcMain.handle(IPC_CHANNELS.UPDATE_STATUS, async () => {
      try {
        if (!this.updateManager) {
          throw new Error('Update manager not available');
        }

        const status = this.updateManager.getStatus();

        return {
          success: true,
          status,
        };
      } catch (error) {
        console.error('Failed to get update status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Cancel update
    ipcMain.on(IPC_CHANNELS.UPDATE_CANCEL, () => {
      if (this.updateManager) {
        this.updateManager.cancelUpdate();
      }
    });
  }

  /**
   * Get drafts directory path
   */
  private getDraftsDir(): string {
    return path.join(app.getPath('userData'), 'drafts');
  }

  /**
   * Ensure drafts directory exists
   */
  private ensureDraftsDir(): void {
    const draftsDir = this.getDraftsDir();
    if (!fs.existsSync(draftsDir)) {
      fs.mkdirSync(draftsDir, { recursive: true });
    }
  }

  /**
   * Register draft storage handlers
   */
  private registerDraftHandlers(): void {
    // Save draft
    ipcMain.handle(IPC_CHANNELS.DRAFT_SAVE, async (_event, wizardType: string, draftId: string, data: any) => {
      try {
        // Validate input
        if (!wizardType || !draftId || !data) {
          throw new Error('Invalid draft data: wizardType, draftId, and data are required');
        }

        this.ensureDraftsDir();
        const filePath = path.join(this.getDraftsDir(), `${wizardType}-${draftId}.json`);

        const draftData = {
          id: draftId,
          wizardType,
          timestamp: Date.now(),
          data,
          version: '1.0',
        };

        fs.writeFileSync(filePath, JSON.stringify(draftData, null, 2), 'utf8');

        return {
          success: true,
          draftId,
        };
      } catch (error) {
        console.error('Failed to save draft:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Load draft
    ipcMain.handle(IPC_CHANNELS.DRAFT_LOAD, async (_event, wizardType: string, draftId: string) => {
      try {
        // Validate input
        if (!wizardType || !draftId) {
          throw new Error('Invalid draft parameters: wizardType and draftId are required');
        }

        const filePath = path.join(this.getDraftsDir(), `${wizardType}-${draftId}.json`);

        if (!fs.existsSync(filePath)) {
          return {
            success: true,
            data: null,
          };
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(fileContent);

        // Check if draft is expired (30 days)
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.timestamp > maxAge) {
          fs.unlinkSync(filePath);
          return {
            success: true,
            data: null,
          };
        }

        return {
          success: true,
          data: parsed.data,
        };
      } catch (error) {
        console.error('Failed to load draft:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // List drafts
    ipcMain.handle(IPC_CHANNELS.DRAFT_LIST, async (_event, wizardType?: string) => {
      try {
        const draftsDir = this.getDraftsDir();

        if (!fs.existsSync(draftsDir)) {
          return {
            success: true,
            drafts: [],
          };
        }

        const files = fs.readdirSync(draftsDir);
        const drafts: any[] = [];
        const prefix = wizardType ? `${wizardType}-` : '';

        for (const file of files) {
          if (file.startsWith(prefix) && file.endsWith('.json')) {
            try {
              const filePath = path.join(draftsDir, file);
              const fileContent = fs.readFileSync(filePath, 'utf8');
              const parsed = JSON.parse(fileContent);

              const draftId = file.replace('.json', '').replace(prefix, '');
              drafts.push({
                id: draftId,
                wizardType: parsed.wizardType,
                timestamp: parsed.timestamp,
                preview: parsed.data?.name || 'Untitled Draft',
                completionPercentage: 50, // Simplified
                lastModified: parsed.timestamp,
              });
            } catch (parseError) {
              console.warn(`Skipping corrupted draft ${file}:`, parseError);
            }
          }
        }

        // Sort by timestamp (newest first)
        drafts.sort((a, b) => b.timestamp - a.timestamp);

        return {
          success: true,
          drafts,
        };
      } catch (error) {
        console.error('Failed to list drafts:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          drafts: [],
        };
      }
    });

    // Delete draft
    ipcMain.handle(IPC_CHANNELS.DRAFT_DELETE, async (_event, wizardType: string, draftId: string) => {
      try {
        // Validate input
        if (!wizardType || !draftId) {
          throw new Error('Invalid draft parameters: wizardType and draftId are required');
        }

        const filePath = path.join(this.getDraftsDir(), `${wizardType}-${draftId}.json`);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to delete draft:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  /**
   * Register application control handlers
   */
  private registerAppHandlers(): void {
    // Quit application
    ipcMain.on(IPC_CHANNELS.APP_QUIT, () => {
      const { app } = require('electron');
      app.quit();
    });

    // Minimize window
    ipcMain.on(IPC_CHANNELS.APP_MINIMIZE, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.minimize();
      }
    });

    // Show DevTools
    ipcMain.on(IPC_CHANNELS.APP_SHOW_DEVTOOLS, (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      if (window) {
        window.webContents.openDevTools();
      }
    });
  }
}


