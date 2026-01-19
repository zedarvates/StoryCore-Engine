/**
 * Electron API types for renderer process
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  projectName?: string;
}

export interface ElectronAPI {
  // Project operations
  createProject: (projectName: string, projectPath: string) => Promise<void>;
  openProject: (projectPath: string) => Promise<void>;
  validateProject: (projectPath: string) => Promise<ValidationResult>;
  selectDirectory: () => Promise<string | null>;

  // Recent projects
  getRecentProjects: () => Promise<Array<{
    id: string;
    name: string;
    path: string;
    lastAccessed: Date;
    exists?: boolean;
  }>>;
  removeRecentProject: (projectPath: string) => Promise<void>;

  // Application controls
  quitApp: () => void;
  minimizeApp: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
