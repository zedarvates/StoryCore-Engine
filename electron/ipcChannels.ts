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
import { RoverService } from './services/RoverService';
import { ViteServerManager, LauncherConfig } from './ViteServerManager';
import { getDefaultProjectsDirectory } from './defaultPaths';
import { UpdateManager } from './UpdateManager';
import { ProjectDiscoveryService, DiscoveryResult } from './services/ProjectDiscoveryService';
import { ComfyUIService } from './services/ComfyUIService';
import { LLMService } from './services/LLMService';
import {
  ScanProjectsOptions,
  ScanProjectsResponse,
  MergedProjectsResponse,
  RefreshProjectsResponse,
  ProjectDiscoveryErrorCode,
} from './types/ipc';

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
  PROJECT_UPDATE_METADATA: 'project:update-metadata',

  // Sequence management
  SEQUENCE_UPDATE_SHOT: 'sequence:update-shot',
  SEQUENCE_GET_SHOTS: 'sequence:get-shots',
  SEQUENCE_GET_ALL: 'sequence:get-all',

  // Recent projects
  RECENT_PROJECTS_GET: 'recent-projects:get',
  RECENT_PROJECTS_ADD: 'recent-projects:add',
  RECENT_PROJECTS_REMOVE: 'recent-projects:remove',

  // Project discovery
  DISCOVER_PROJECTS: 'discover-projects',
  PROJECTS_SCAN_DIRECTORY: 'projects:scan-directory',
  PROJECTS_GET_MERGED_LIST: 'projects:get-merged-list',
  PROJECTS_REFRESH: 'projects:refresh',

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

  // Dialogs
  DIALOG_SHOW_OPEN: 'dialog:show-open',
  DIALOG_SHOW_SAVE: 'dialog:show-save',

  // Production Wizard Draft Storage
  DRAFT_SAVE: 'draft:save',
  DRAFT_LOAD: 'draft:load',
  DRAFT_LIST: 'draft:list',
  DRAFT_DELETE: 'draft:delete',

  // LLM integration
  LLM_GET_CONFIG: 'llm:get-config',
  LLM_UPDATE_CONFIG: 'llm:update-config',
  LLM_TEST_CONNECTION: 'llm:test-connection',
  LLM_GET_MODELS: 'llm:get-models',

  // ComfyUI integration
  COMFYUI_EXECUTE_WORKFLOW: 'comfyui:execute-workflow',
  COMFYUI_GET_QUEUE_STATUS: 'comfyui:get-queue-status',
  COMFYUI_UPLOAD_MEDIA: 'comfyui:upload-media',
  COMFYUI_DOWNLOAD_OUTPUT: 'comfyui:download-output',
  COMFYUI_GET_SERVICE_STATUS: 'comfyui:get-service-status',
  COMFYUI_START_SERVICE: 'comfyui:start-service',
  COMFYUI_STOP_SERVICE: 'comfyui:stop-service',
  COMFYUI_GET_CONFIG: 'comfyui:get-config',
  COMFYUI_UPDATE_CONFIG: 'comfyui:update-config',
  COMFYUI_TEST_CONNECTION: 'comfyui:test-connection',

  // Rover (Persistent Memory Layer)
  ROVER_SYNC: 'rover:sync',
  ROVER_GET_HISTORY: 'rover:get-history',
  ROVER_RESTORE_CHECKPOINT: 'rover:restore-checkpoint',

  // File system operations
  FS_READDIR: 'fs:readdir',
  FS_READFILE: 'fs:readFile',
  FS_WRITEFILE: 'fs:writeFile',
  FS_EXISTS: 'fs:exists',
  FS_STAT: 'fs:stat',
  FS_MKDIR: 'fs:mkdir',
  FS_UNLINK: 'fs:unlink',
} as const;

/**
 * IPC handlers manager
 */
export class IPCHandlers {
  private projectService: ProjectService;
  private recentProjectsManager: RecentProjectsManager;
  private serverManager?: ViteServerManager;
  private updateManager?: UpdateManager;
  private projectDiscoveryService: ProjectDiscoveryService;
  private comfyuiService: ComfyUIService;
  private llmService: LLMService;
  private roverService: RoverService;

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
    this.projectDiscoveryService = new ProjectDiscoveryService();
    this.comfyuiService = new ComfyUIService();
    this.llmService = new LLMService();
    this.roverService = new RoverService();
  }

  /**
   * Register all IPC handlers
   */
  registerHandlers(): void {
    this.registerProjectHandlers();
    this.registerSequenceHandlers();
    this.registerRecentProjectsHandlers();
    this.registerProjectDiscoveryHandlers();
    this.registerServerHandlers();
    this.registerUpdateHandlers();
    this.registerAppHandlers();
    this.registerDraftHandlers();
    this.registerLLMHandlers();
    this.registerComfyUIHandlers();
    this.registerFSHandlers();
    this.registerDialogHandlers();
    this.registerRoverHandlers();
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
    ipcMain.removeHandler(IPC_CHANNELS.PROJECT_UPDATE_METADATA);

    // Sequence handlers
    ipcMain.removeHandler(IPC_CHANNELS.SEQUENCE_UPDATE_SHOT);
    ipcMain.removeHandler(IPC_CHANNELS.SEQUENCE_GET_SHOTS);
    ipcMain.removeHandler(IPC_CHANNELS.SEQUENCE_GET_ALL);

    // Recent projects handlers
    ipcMain.removeHandler(IPC_CHANNELS.RECENT_PROJECTS_GET);
    ipcMain.removeHandler(IPC_CHANNELS.RECENT_PROJECTS_ADD);
    ipcMain.removeHandler(IPC_CHANNELS.RECENT_PROJECTS_REMOVE);

    // Project discovery handlers
    ipcMain.removeHandler(IPC_CHANNELS.DISCOVER_PROJECTS);
    ipcMain.removeHandler(IPC_CHANNELS.PROJECTS_SCAN_DIRECTORY);
    ipcMain.removeHandler(IPC_CHANNELS.PROJECTS_GET_MERGED_LIST);
    ipcMain.removeHandler(IPC_CHANNELS.PROJECTS_REFRESH);

    // Server handlers
    ipcMain.removeHandler(IPC_CHANNELS.SERVER_STATUS);
    ipcMain.removeHandler(IPC_CHANNELS.SERVER_RESTART);

    // Draft handlers
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_SAVE);
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_LOAD);
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_LIST);
    ipcMain.removeHandler(IPC_CHANNELS.DRAFT_DELETE);

    // ComfyUI handlers
    ipcMain.removeHandler(IPC_CHANNELS.COMFYUI_EXECUTE_WORKFLOW);
    ipcMain.removeHandler(IPC_CHANNELS.COMFYUI_GET_QUEUE_STATUS);
    ipcMain.removeHandler(IPC_CHANNELS.COMFYUI_UPLOAD_MEDIA);
    ipcMain.removeHandler(IPC_CHANNELS.COMFYUI_DOWNLOAD_OUTPUT);
    ipcMain.removeHandler(IPC_CHANNELS.COMFYUI_GET_SERVICE_STATUS);
    ipcMain.removeHandler(IPC_CHANNELS.COMFYUI_START_SERVICE);
    ipcMain.removeHandler(IPC_CHANNELS.COMFYUI_STOP_SERVICE);

    // FS handlers
    ipcMain.removeHandler(IPC_CHANNELS.FS_READDIR);
    ipcMain.removeHandler(IPC_CHANNELS.FS_READFILE);
    ipcMain.removeHandler(IPC_CHANNELS.FS_WRITEFILE);
    ipcMain.removeHandler(IPC_CHANNELS.FS_EXISTS);
    ipcMain.removeHandler(IPC_CHANNELS.FS_STAT);
    ipcMain.removeHandler(IPC_CHANNELS.FS_MKDIR);
    ipcMain.removeHandler(IPC_CHANNELS.FS_UNLINK);

    // App handlers
    ipcMain.removeAllListeners(IPC_CHANNELS.APP_QUIT);
    ipcMain.removeAllListeners(IPC_CHANNELS.APP_MINIMIZE);
    ipcMain.removeAllListeners(IPC_CHANNELS.APP_SHOW_DEVTOOLS);

    // Dialog handlers
    ipcMain.removeHandler(IPC_CHANNELS.DIALOG_SHOW_OPEN);
    ipcMain.removeHandler(IPC_CHANNELS.DIALOG_SHOW_SAVE);

    // Rover handlers
    ipcMain.removeHandler(IPC_CHANNELS.ROVER_SYNC);
    ipcMain.removeHandler(IPC_CHANNELS.ROVER_GET_HISTORY);
    ipcMain.removeHandler(IPC_CHANNELS.ROVER_RESTORE_CHECKPOINT);
  }

  /**
   * Register Rover handlers
   */
  private registerRoverHandlers(): void {
    // Sync project state and create commit
    ipcMain.handle(
      IPC_CHANNELS.ROVER_SYNC,
      async (_event, projectPath: string, projectId: string, message: string, data: any) => {
        try {
          await this.roverService.initialize(projectPath, projectId);
          const commit = await this.roverService.commit(projectPath, message, data);
          return { success: true, commit };
        } catch (error) {
          console.error('Rover Sync Failed:', error);
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      }
    );

    // Get project history
    ipcMain.handle(IPC_CHANNELS.ROVER_GET_HISTORY, async (_event, projectPath: string) => {
      try {
        const history = await this.roverService.getHistory(projectPath);
        return { success: true, history };
      } catch (error) {
        console.error('Rover Get History Failed:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Restore checkpoint
    ipcMain.handle(IPC_CHANNELS.ROVER_RESTORE_CHECKPOINT, async (_event, projectPath: string, commitId: string) => {
      try {
        const data = await this.roverService.restoreCheckpoint(projectPath, commitId);
        return { success: true, data };
      } catch (error) {
        console.error('Rover Restore Checkpoint Failed:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }

  /**
   * Register dialog handlers
   */
  private registerDialogHandlers(): void {
    // Show open dialog
    ipcMain.handle(
      IPC_CHANNELS.DIALOG_SHOW_OPEN,
      async (event, options: Electron.OpenDialogOptions) => {
        try {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            throw new Error('No window found');
          }

          const result = await dialog.showOpenDialog(window, options);
          return {
            success: true,
            result,
          };
        } catch (error) {
          console.error('Failed to show open dialog:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );

    // Show save dialog
    ipcMain.handle(
      IPC_CHANNELS.DIALOG_SHOW_SAVE,
      async (event, options: Electron.SaveDialogOptions) => {
        try {
          const window = BrowserWindow.fromWebContents(event.sender);
          if (!window) {
            throw new Error('No window found');
          }

          const result = await dialog.showSaveDialog(window, options);
          return {
            success: true,
            result,
          };
        } catch (error) {
          console.error('Failed to show save dialog:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );
  }

  /**
   * Register project management handlers
   */
  private registerProjectHandlers(): void {
    // Create project
    ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, data: NewProjectData) => {
      try {
        // Validate input
        if (!data || !data.name) {
          throw new Error('Invalid project data: name is required');
        }

        // Use default projects directory if location not provided
        const location = data.location || getDefaultProjectsDirectory();
        console.log(`Creating project "${data.name}" at location: ${location}`);

        // Create project with the determined location
        const projectData: NewProjectData = {
          ...data,
          location,
        };

        // Create project
        const project = await this.projectService.createProject(projectData);

        console.log(`Project created successfully at: ${project.path}`);

        // Verify project directory structure
        const verification = await this.verifyProjectStructure(project.path);
        if (!verification.success) {
          console.error('Project verification failed:', verification.errors);
          // Log warning but don't fail - project was created
          console.warn('Project created but verification found issues:', verification.errors);
        } else {
          console.log('Project structure verified successfully');
        }

        // Add to recent projects
        this.recentProjectsManager.addProject({
          id: project.id,
          name: project.name,
          path: project.path,
        });

        return {
          success: true,
          project,
          verification,
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

    // Update project metadata
    ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE_METADATA, async (_event, projectPath: string, metadata: Record<string, any>) => {
      try {
        // Validate input
        if (!projectPath || typeof projectPath !== 'string') {
          throw new Error('Invalid project path');
        }

        if (!metadata || typeof metadata !== 'object') {
          throw new Error('Invalid metadata');
        }

        // Update metadata
        const updatedProject = await this.projectService.updateMetadata(projectPath, metadata);

        return {
          success: true,
          project: updatedProject,
        };
      } catch (error) {
        console.error('Failed to update project metadata:', error);
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
   * Register sequence management handlers
   */
  private registerSequenceHandlers(): void {
    // Update shot in sequence
    ipcMain.handle(
      IPC_CHANNELS.SEQUENCE_UPDATE_SHOT,
      async (_event, projectPath: string, sequenceId: string, shotId: string, updates: Record<string, any>) => {
        try {
          // Validate input
          if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Invalid project path');
          }
          if (!sequenceId || typeof sequenceId !== 'string') {
            throw new Error('Invalid sequence ID');
          }
          if (!shotId || typeof shotId !== 'string') {
            throw new Error('Invalid shot ID');
          }
          if (!updates || typeof updates !== 'object') {
            throw new Error('Invalid updates');
          }

          // Update shot
          await this.projectService.updateShotInSequence(projectPath, sequenceId, shotId, updates);

          return {
            success: true,
          };
        } catch (error) {
          console.error('Failed to update shot in sequence:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }
    );

    // Get shots from sequence
    ipcMain.handle(
      IPC_CHANNELS.SEQUENCE_GET_SHOTS,
      async (_event, projectPath: string, sequenceId: string) => {
        try {
          // Validate input
          if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Invalid project path');
          }
          if (!sequenceId || typeof sequenceId !== 'string') {
            throw new Error('Invalid sequence ID');
          }

          // Get shots
          const shots = await this.projectService.getShotsFromSequence(projectPath, sequenceId);

          return {
            success: true,
            shots,
          };
        } catch (error) {
          console.error('Failed to get shots from sequence:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            shots: [],
          };
        }
      }
    );

    // Get all sequences
    ipcMain.handle(
      IPC_CHANNELS.SEQUENCE_GET_ALL,
      async (_event, projectPath: string) => {
        try {
          // Validate input
          if (!projectPath || typeof projectPath !== 'string') {
            throw new Error('Invalid project path');
          }

          // Get all sequences
          const sequences = await this.projectService.getAllSequences(projectPath);

          return {
            success: true,
            sequences,
          };
        } catch (error) {
          console.error('Failed to get all sequences:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            sequences: [],
          };
        }
      }
    );
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
   * Register project discovery handlers
   */
  private registerProjectDiscoveryHandlers(): void {
    // Discover projects - returns DiscoveryResult with full metadata
    ipcMain.handle(
      IPC_CHANNELS.DISCOVER_PROJECTS,
      async (_event): Promise<DiscoveryResult> => {
        try {
          console.log('[IPC] discover-projects called');

          // Instantiate ProjectDiscoveryService and call scanProjectDirectory()
          const result = await this.projectDiscoveryService.scanProjectDirectory();

          console.log(`[IPC] discover-projects completed: ${result.projects.length} projects found, ${result.errors.length} errors`);

          // Return DiscoveryResult with proper error handling
          return result;
        } catch (error) {
          console.error('[IPC] Failed to discover projects:', error);

          // Return error result with proper structure
          return {
            projects: [],
            scannedPath: '',
            timestamp: Date.now(),
            errors: [{
              path: '',
              error: error instanceof Error ? error.message : 'Failed to discover projects'
            }],
          };
        }
      }
    );

    // Scan project directory
    ipcMain.handle(
      IPC_CHANNELS.PROJECTS_SCAN_DIRECTORY,
      async (_event, options?: ScanProjectsOptions): Promise<ScanProjectsResponse> => {
        try {
          console.log('[IPC] projects:scan-directory called with options:', options);

          // Validate options if provided
          if (options !== undefined && typeof options !== 'object') {
            return {
              success: false,
              error: 'Invalid scan options: must be an object',
              errorCode: ProjectDiscoveryErrorCode.SCAN_FAILED,
            };
          }

          // Perform scan
          const result = await this.projectDiscoveryService.scanProjectDirectory(options);

          return {
            success: true,
            projects: result.projects,
            data: result.projects,
          };
        } catch (error) {
          console.error('[IPC] Failed to scan project directory:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to scan project directory',
            errorCode: ProjectDiscoveryErrorCode.SCAN_FAILED,
          };
        }
      }
    );

    // Get merged project list (discovered + recent)
    ipcMain.handle(
      IPC_CHANNELS.PROJECTS_GET_MERGED_LIST,
      async (_event, options?: ScanProjectsOptions): Promise<MergedProjectsResponse> => {
        try {
          console.log('[IPC] projects:get-merged-list called with options:', options);

          // Validate options if provided
          if (options !== undefined && typeof options !== 'object') {
            return {
              success: false,
              error: 'Invalid scan options: must be an object',
              errorCode: ProjectDiscoveryErrorCode.SCAN_FAILED,
            };
          }

          // Clean up missing projects from recent projects list first
          // This ensures old projects that no longer exist are removed
          await this.recentProjectsManager.cleanupMissingProjects();

          // Scan for discovered projects
          const discoveryResult = await this.projectDiscoveryService.scanProjectDirectory(options);

          // Merge with recent projects
          const merged = await this.recentProjectsManager.getMergedProjectList(discoveryResult.projects);

          console.log(`[IPC] Merged project list: ${merged.length} projects (${merged.filter(p => p.isRecent).length} recent, ${merged.filter(p => !p.isRecent).length} discovered)`);

          return {
            success: true,
            projects: merged,
            data: merged,
          };
        } catch (error) {
          console.error('[IPC] Failed to get merged project list:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to get merged project list',
            errorCode: ProjectDiscoveryErrorCode.MERGE_FAILED,
          };
        }
      }
    );

    // Manual refresh (bypass cache)
    ipcMain.handle(
      IPC_CHANNELS.PROJECTS_REFRESH,
      async (_event): Promise<RefreshProjectsResponse> => {
        try {
          console.log('[IPC] projects:refresh called');

          // Clear cache
          this.projectDiscoveryService.clearCache();

          // Perform fresh scan with cache bypass
          const discoveryResult = await this.projectDiscoveryService.scanProjectDirectory({
            bypassCache: true,
          });

          // Merge with recent projects
          const merged = await this.recentProjectsManager.getMergedProjectList(discoveryResult.projects);

          return {
            success: true,
            projects: merged,
            data: merged,
          };
        } catch (error) {
          console.error('[IPC] Failed to refresh projects:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refresh projects',
            errorCode: ProjectDiscoveryErrorCode.SCAN_FAILED,
          };
        }
      }
    );
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

    // Open folder in file explorer
    ipcMain.on('app:open-folder', (_event, folderPath: string) => {
      const { shell, app } = require('electron');
      
      // Validate path is within expected directories
      const allowedBases = [
        app.getPath('userData'),
        app.getPath('documents'),
        app.getPath('downloads')
      ];
      
      const resolvedPath = require('path').resolve(folderPath);
      const isAllowed = allowedBases.some(base => resolvedPath.startsWith(base));
      
      if (!isAllowed) {
        console.error('Blocked attempt to open path outside allowed directories:', folderPath);
        return;
      }
      
      shell.openPath(folderPath);
    });
  }

  /**
   * Register LLM integration handlers
   */
  private registerLLMHandlers(): void {
    // Get LLM configuration
    ipcMain.handle(IPC_CHANNELS.LLM_GET_CONFIG, async () => {
      try {
        const config = await this.llmService.getConfiguration();
        return {
          success: true,
          config,
        };
      } catch (error) {
        console.error('Failed to get LLM configuration:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get LLM configuration',
        };
      }
    });

    // Update LLM configuration
    ipcMain.handle(IPC_CHANNELS.LLM_UPDATE_CONFIG, async (_event, config: any) => {
      try {
        const updated = await this.llmService.updateConfiguration(config);
        return {
          success: true,
          config: updated,
        };
      } catch (error) {
        console.error('Failed to update LLM configuration:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update LLM configuration',
        };
      }
    });

    // Test LLM connection
    ipcMain.handle(IPC_CHANNELS.LLM_TEST_CONNECTION, async (_event, provider: any) => {
      try {
        const result = await this.llmService.testConnection(provider);
        return {
          success: result.success,
          message: result.message,
        };
      } catch (error) {
        console.error('Failed to test LLM connection:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to test LLM connection',
        };
      }
    });

    // Get available models
    ipcMain.handle(IPC_CHANNELS.LLM_GET_MODELS, async (_event, provider: any) => {
      try {
        const models = await this.llmService.getAvailableModels(provider);
        return {
          success: true,
          models,
        };
      } catch (error) {
        console.error('Failed to get available models:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get available models',
          models: [],
        };
      }
    });
  }

  /**
   * Register ComfyUI integration handlers
   */
  private registerComfyUIHandlers(): void {
    // Get ComfyUI configuration
    ipcMain.handle(IPC_CHANNELS.COMFYUI_GET_CONFIG, async () => {
      try {
        const config = await this.comfyuiService.getConfiguration();
        return {
          success: true,
          config,
        };
      } catch (error) {
        console.error('Failed to get ComfyUI configuration:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get ComfyUI configuration',
        };
      }
    });

    // Update ComfyUI configuration
    ipcMain.handle(IPC_CHANNELS.COMFYUI_UPDATE_CONFIG, async (_event, config: any) => {
      try {
        const updated = await this.comfyuiService.updateConfiguration(config);
        return {
          success: true,
          config: updated,
        };
      } catch (error) {
        console.error('Failed to update ComfyUI configuration:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update ComfyUI configuration',
        };
      }
    });

    // Test ComfyUI connection
    ipcMain.handle(IPC_CHANNELS.COMFYUI_TEST_CONNECTION, async () => {
      try {
        const result = await this.comfyuiService.testConnection();
        return {
          success: result.success,
          message: result.message,
        };
      } catch (error) {
        console.error('Failed to test ComfyUI connection:', error);
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to test ComfyUI connection',
        };
      }
    });

    // Get service status
    ipcMain.handle(IPC_CHANNELS.COMFYUI_GET_SERVICE_STATUS, async () => {
      try {
        const status = await this.comfyuiService.getServiceStatus();
        return {
          success: true,
          status,
        };
      } catch (error) {
        console.error('Failed to get ComfyUI service status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get ComfyUI service status',
        };
      }
    });

    // Start service
    ipcMain.handle(IPC_CHANNELS.COMFYUI_START_SERVICE, async () => {
      try {
        const result = await this.comfyuiService.startService();
        return {
          success: result.success,
          message: result.message,
          error: result.error,
        };
      } catch (error) {
        console.error('Failed to start ComfyUI service:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start ComfyUI service',
        };
      }
    });

    // Stop service
    ipcMain.handle(IPC_CHANNELS.COMFYUI_STOP_SERVICE, async () => {
      try {
        const result = await this.comfyuiService.stopService();
        return {
          success: result.success,
          message: result.message,
          error: result.error,
        };
      } catch (error) {
        console.error('Failed to stop ComfyUI service:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to stop ComfyUI service',
        };
      }
    });

    // Execute workflow
    ipcMain.handle(IPC_CHANNELS.COMFYUI_EXECUTE_WORKFLOW, async (_event, workflowData: any) => {
      try {
        // TODO: Implement ComfyUI workflow execution via Python backend
        console.log('ComfyUI workflow execution requested:', workflowData);
        return {
          success: false,
          error: 'ComfyUI integration not yet implemented',
        };
      } catch (error) {
        console.error('Failed to execute ComfyUI workflow:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Get queue status
    ipcMain.handle(IPC_CHANNELS.COMFYUI_GET_QUEUE_STATUS, async () => {
      try {
        // TODO: Implement queue status retrieval
        return {
          success: true,
          queue: {
            running: [],
            pending: [],
          },
        };
      } catch (error) {
        console.error('Failed to get ComfyUI queue status:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Upload media
    ipcMain.handle(IPC_CHANNELS.COMFYUI_UPLOAD_MEDIA, async (_event, mediaPath: string) => {
      try {
        // TODO: Implement media upload to ComfyUI
        console.log('Media upload requested:', mediaPath);
        return {
          success: false,
          error: 'Media upload not yet implemented',
        };
      } catch (error) {
        console.error('Failed to upload media to ComfyUI:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Download output
    ipcMain.handle(IPC_CHANNELS.COMFYUI_DOWNLOAD_OUTPUT, async (_event, outputId: string) => {
      try {
        // TODO: Implement output download from ComfyUI
        console.log('Output download requested:', outputId);
        return {
          success: false,
          error: 'Output download not yet implemented',
        };
      } catch (error) {
        console.error('Failed to download ComfyUI output:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  /**
   * Register file system handlers
   */
  private registerFSHandlers(): void {
    // Read directory
    ipcMain.handle(IPC_CHANNELS.FS_READDIR, async (_event, dirPath: string) => {
      try {
        const items = fs.readdirSync(dirPath);
        return {
          success: true,
          items,
        };
      } catch (error) {
        console.error('Failed to read directory:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Read file
    ipcMain.handle(IPC_CHANNELS.FS_READFILE, async (_event, filePath: string) => {
      try {
        const buffer = fs.readFileSync(filePath);
        return {
          success: true,
          data: buffer,
        };
      } catch (error) {
        console.error('Failed to read file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Write file
    ipcMain.handle(IPC_CHANNELS.FS_WRITEFILE, async (_event, filePath: string, data: string | Buffer) => {
      try {
        fs.writeFileSync(filePath, data);
        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to write file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Check if path exists
    ipcMain.handle(IPC_CHANNELS.FS_EXISTS, async (_event, filePath: string) => {
      try {
        const exists = fs.existsSync(filePath);
        return {
          success: true,
          exists,
        };
      } catch (error) {
        console.error('Failed to check if path exists:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Get file stats
    ipcMain.handle(IPC_CHANNELS.FS_STAT, async (_event, filePath: string) => {
      try {
        const stats = fs.statSync(filePath);
        return {
          success: true,
          stats: {
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            mtime: stats.mtime,
            birthtime: stats.birthtime,
          },
        };
      } catch (error) {
        console.error('Failed to get file stats:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Create directory
    ipcMain.handle(IPC_CHANNELS.FS_MKDIR, async (_event, dirPath: string, options?: { recursive?: boolean }) => {
      try {
        fs.mkdirSync(dirPath, options);
        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to create directory:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // Delete file
    ipcMain.handle(IPC_CHANNELS.FS_UNLINK, async (_event, filePath: string) => {
      try {
        fs.unlinkSync(filePath);
        return {
          success: true,
        };
      } catch (error) {
        console.error('Failed to delete file:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });
  }

  /**
   * Verify project directory structure
   * @param projectPath Path to the project directory
   * @returns Verification result
   */
  private async verifyProjectStructure(projectPath: string): Promise<{
    success: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if project directory exists
      if (!fs.existsSync(projectPath)) {
        errors.push(`Project directory does not exist: ${projectPath}`);
        return { success: false, errors, warnings };
      }

      // Check if it's a directory
      const stats = fs.statSync(projectPath);
      if (!stats.isDirectory()) {
        errors.push(`Project path is not a directory: ${projectPath}`);
        return { success: false, errors, warnings };
      }

      // Check for required subdirectories
      const requiredDirs = ['sequences', 'characters', 'worlds', 'assets'];
      for (const dir of requiredDirs) {
        const dirPath = path.join(projectPath, dir);
        if (!fs.existsSync(dirPath)) {
          errors.push(`Required directory missing: ${dir}`);
        } else {
          const dirStats = fs.statSync(dirPath);
          if (!dirStats.isDirectory()) {
            errors.push(`Required path is not a directory: ${dir}`);
          }
        }
      }

      // Check for project.json file
      const projectJsonPath = path.join(projectPath, 'project.json');
      if (!fs.existsSync(projectJsonPath)) {
        errors.push('Required file missing: project.json');
      } else {
        // Verify it's a valid JSON file
        try {
          const content = fs.readFileSync(projectJsonPath, 'utf-8');
          JSON.parse(content);
        } catch (error) {
          errors.push(`Invalid project.json file: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Check for optional files (warnings only)
      const optionalFiles = ['README.md', 'PROJECT_SUMMARY.md'];
      for (const file of optionalFiles) {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) {
          warnings.push(`Optional file missing: ${file}`);
        }
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false, errors, warnings };
    }
  }
}