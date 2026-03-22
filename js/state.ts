// TypeScript interfaces for StoryCore Dashboard state management

export interface Panel {
  id: string;
  status: 'ok' | 'auto_fixed' | 'processing';
  sharpness: number;
  initial_sharpness?: number;
  improvement_delta?: number;
}

export interface ModelInfo {
  name: string;
  url: string;
  subfolder: string;
  size: string;
}

export interface ModelDownloadState {
  isDownloading: boolean;
  progress: number;
  currentModel: string;
  mode: 'automatic' | 'manual';
  targetPath: string;
  models: ModelInfo[];
}

export interface MissingModelsState {
  detected: boolean;
  models: ModelInfo[];
}

// Additional state interfaces
export interface DashboardState {
  panels: Panel[];
  backendUrl: string;
  isProcessing: boolean;
  selectedPanel: string;
  modelDownloadState: ModelDownloadState;
  missingModelsState: MissingModelsState;
}

// Export types for external use
export type PanelStatus = Panel['status'];
export type DownloadMode = ModelDownloadState['mode'];