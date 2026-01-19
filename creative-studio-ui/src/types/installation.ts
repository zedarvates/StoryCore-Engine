/**
 * Type definitions for ComfyUI Installation Wizard
 */

export interface WizardConfiguration {
  downloadUrl: string;
  expectedFileName: string;
  expectedFileSizeBytes: number;
  downloadZoneRelativePath: string;
  comfyUIInstallDir: string;
  corsOrigin: string;
  requiredModels: ModelDefinition[];
  requiredWorkflows: WorkflowDefinition[];
  pollingIntervalMs: number;
  installationTimeoutMs: number;
}

export interface ModelDefinition {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  checksum: string;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  filePath: string;
}

export interface WizardState {
  currentStep: 'download' | 'placement' | 'installation' | 'completion';
  downloadZonePath: string;
  fileDetected: boolean;
  fileValid: boolean;
  installationProgress: number;
  installationStatus: string;
  installationError: string | null;
  installedModels: string[];
  installedWorkflows: string[];
  comfyUIUrl: string | null;
}

export interface InstallationState {
  phase: 'idle' | 'downloading' | 'extracting' | 'configuring' | 'models' | 'workflows' | 'verifying' | 'complete' | 'error';
  currentOperation: string;
  progressPercent: number;
  startTime: number;
  estimatedTimeRemaining: number | null;
  errors: InstallationError[];
}

export interface InstallationError {
  code: string;
  message: string;
  recoverable: boolean;
  timestamp: number;
}

export interface FileValidationResult {
  valid: boolean;
  fileName: string;
  fileSizeBytes: number;
  expectedSizeBytes: number;
  sizeMatch: boolean;
  isZipFile: boolean;
  isReadable: boolean;
  errors: string[];
}

export interface ProgressUpdate {
  step: string;
  progress: number;
  message: string;
  error: string | null;
}

export interface InstallationResult {
  success: boolean;
  comfyui_path: string;
  comfyui_url: string;
  installed_models: string[];
  installed_workflows: string[];
  errors: string[];
}

// API Request/Response types
export interface InitializeResponse {
  downloadZonePath: string;
  downloadUrl: string;
  expectedFileName: string;
  expectedFileSize: number;
}

export interface FileCheckResponse {
  exists: boolean;
  valid: boolean;
  fileName: string | null;
  fileSize: number | null;
  validationError: string | null;
}

export interface InstallRequest {
  zipFilePath: string;
  enableCORS: boolean;
  installModels: string[];
  installWorkflows: string[];
}

export interface VerificationResponse {
  installed: boolean;
  running: boolean;
  corsEnabled: boolean;
  url: string | null;
  models: string[];
  workflows: string[];
  errors: string[];
}

// Component Props
export interface InstallationWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (installationPath: string) => void;
}

export interface DownloadStepProps {
  downloadUrl: string;
  expectedFileName: string;
  expectedFileSize: string;
  onDownloadClick: () => void;
}

export interface PlacementStepProps {
  downloadZonePath: string;
  fileDetected: boolean;
  fileValid: boolean;
  validationError: string | null;
  onOpenFolder: () => void;
  onRefresh: () => void;
}

export interface InstallationStepProps {
  canInstall: boolean;
  isInstalling: boolean;
  progress: number;
  statusMessage: string;
  error: string | null;
  onInstall: () => void;
  onRetry: () => void;
}

export interface CompletionStepProps {
  success: boolean;
  comfyUIUrl: string | null;
  installedModels: string[];
  installedWorkflows: string[];
  onOpenComfyUI: () => void;
  onClose: () => void;
}
