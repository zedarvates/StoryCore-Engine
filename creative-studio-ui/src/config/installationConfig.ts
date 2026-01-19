/**
 * Configuration for ComfyUI Installation Wizard
 */

import { WizardConfiguration } from '../types/installation';

export const INSTALLATION_CONFIG: WizardConfiguration = {
  // ComfyUI Portable download URL
  downloadUrl: 'https://github.com/comfyanonymous/ComfyUI/releases/latest',
  
  // Expected file details
  expectedFileName: 'ComfyUI_windows_portable_nvidia_cu121_or_cpu.7z',
  expectedFileSizeBytes: 2500000000, // ~2.5 GB
  
  // Installation paths
  downloadZoneRelativePath: 'comfyui_portable/downloads',
  comfyUIInstallDir: 'comfyui_portable/ComfyUI',
  
  // CORS configuration
  corsOrigin: 'http://localhost:3000',
  
  // Required models (to be populated based on project needs)
  requiredModels: [
    {
      id: 'sd15-base',
      name: 'Stable Diffusion 1.5 Base',
      url: 'https://huggingface.co/runwayml/stable-diffusion-v1-5',
      sizeBytes: 4000000000,
      checksum: ''
    }
  ],
  
  // Required workflows
  requiredWorkflows: [
    {
      id: 'basic-generation',
      name: 'Basic Image Generation',
      filePath: 'workflows/basic_generation.json'
    }
  ],
  
  // Polling and timeout settings
  pollingIntervalMs: 2000, // 2 seconds
  installationTimeoutMs: 1800000 // 30 minutes
};

// File validation settings
export const FILE_VALIDATION = {
  maxFileSizeBytes: 5000000000, // 5 GB
  minFileSizeBytes: 1000000000, // 1 GB
  allowedExtensions: ['.zip', '.7z', '.tar.gz'],
  fileNamePattern: /ComfyUI.*portable/i,
  sizeTolerance: 0.05 // 5% tolerance
};

// Installation phases
export const INSTALLATION_PHASES = {
  idle: { label: 'Ready', progress: 0 },
  downloading: { label: 'Downloading', progress: 10 },
  extracting: { label: 'Extracting', progress: 30 },
  configuring: { label: 'Configuring CORS', progress: 50 },
  models: { label: 'Installing Models', progress: 70 },
  workflows: { label: 'Installing Workflows', progress: 85 },
  verifying: { label: 'Verifying', progress: 95 },
  complete: { label: 'Complete', progress: 100 },
  error: { label: 'Error', progress: 0 }
};

// Error codes
export const ERROR_CODES = {
  FILE_NOT_FOUND: 'ERR_FILE_NOT_FOUND',
  FILE_INVALID: 'ERR_FILE_INVALID',
  FILE_CORRUPTED: 'ERR_FILE_CORRUPTED',
  EXTRACTION_FAILED: 'ERR_EXTRACTION_FAILED',
  CORS_CONFIG_FAILED: 'ERR_CORS_CONFIG_FAILED',
  MODEL_DOWNLOAD_FAILED: 'ERR_MODEL_DOWNLOAD_FAILED',
  WORKFLOW_INSTALL_FAILED: 'ERR_WORKFLOW_INSTALL_FAILED',
  VERIFICATION_FAILED: 'ERR_VERIFICATION_FAILED',
  PERMISSION_DENIED: 'ERR_PERMISSION_DENIED',
  DISK_SPACE_INSUFFICIENT: 'ERR_DISK_SPACE_INSUFFICIENT',
  ALREADY_INSTALLED: 'ERR_ALREADY_INSTALLED'
};

// User-friendly error messages
export const ERROR_MESSAGES: Record<string, string> = {
  [ERROR_CODES.FILE_NOT_FOUND]: 'ZIP file not found in the download zone. Please place the file and try again.',
  [ERROR_CODES.FILE_INVALID]: 'The file does not appear to be a valid ComfyUI Portable archive.',
  [ERROR_CODES.FILE_CORRUPTED]: 'The ZIP file appears to be corrupted. Please re-download and try again.',
  [ERROR_CODES.EXTRACTION_FAILED]: 'Failed to extract the archive. Check disk space and permissions.',
  [ERROR_CODES.CORS_CONFIG_FAILED]: 'Failed to configure CORS. The UI may not connect properly to ComfyUI.',
  [ERROR_CODES.MODEL_DOWNLOAD_FAILED]: 'Some models failed to download. You can download them manually later.',
  [ERROR_CODES.WORKFLOW_INSTALL_FAILED]: 'Some workflows failed to install. You can add them manually later.',
  [ERROR_CODES.VERIFICATION_FAILED]: 'Installation verification failed. ComfyUI may not start correctly.',
  [ERROR_CODES.PERMISSION_DENIED]: 'Permission denied. Try running as administrator or check folder permissions.',
  [ERROR_CODES.DISK_SPACE_INSUFFICIENT]: 'Insufficient disk space. Free up at least 5GB and try again.',
  [ERROR_CODES.ALREADY_INSTALLED]: 'ComfyUI is already installed. Choose reinstall to continue.'
};

// Recovery suggestions
export const RECOVERY_SUGGESTIONS: Record<string, string[]> = {
  [ERROR_CODES.FILE_NOT_FOUND]: [
    'Download ComfyUI Portable from the official link',
    'Place the ZIP file in the download zone folder',
    'Click the refresh button to re-check'
  ],
  [ERROR_CODES.FILE_CORRUPTED]: [
    'Delete the corrupted file',
    'Re-download ComfyUI Portable',
    'Verify the download completed successfully'
  ],
  [ERROR_CODES.EXTRACTION_FAILED]: [
    'Check available disk space (need at least 5GB)',
    'Verify folder permissions',
    'Close any programs that might be using the files'
  ],
  [ERROR_CODES.PERMISSION_DENIED]: [
    'Run the application as administrator',
    'Check folder permissions',
    'Choose a different installation directory'
  ]
};
