
/**
 * Lip Sync Types
 * 
 * TypeScript type definitions for Lip Sync functionality.
 * Used for communication between frontend and backend.
 */

export const LipSyncModel = {
  WAV2LIP: 'wav2lip',
  SADTALKER: 'sadtalker'
} as const;

export type LipSyncModel = typeof LipSyncModel[keyof typeof LipSyncModel];

export const LipSyncStyle = {
  NEUTRAL: 'neutral',
  HAPPY: 'happy',
  SAD: 'sad',
  ANGRY: 'angry',
  SURPRISED: 'surprised'
} as const;

export type LipSyncStyle = typeof LipSyncStyle[keyof typeof LipSyncStyle];

export const LipSyncStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  ENHANCING: 'enhancing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type LipSyncStatus = typeof LipSyncStatus[keyof typeof LipSyncStatus];

export interface LipSyncRequest {
  projectId: string;
  characterFaceImage: string;
  audioFile: string;
  model: LipSyncModel;
  enhancer?: boolean;
  pads?: string;
  nosmooth?: boolean;
  referencePose?: string;
  style?: string;
}

export interface LipSyncResponse {
  job_id: string;
  status: string;
  output_video?: string;
  progress: number;
  estimated_time_seconds?: number;
  message?: string;
}

export interface LipSyncStatusResponse {
  job_id: string;
  status: LipSyncStatus;
  progress: number;
  output_video?: string;
  error?: string;
  created_at: number; // timestamp in ms
  completed_at?: number; // timestamp in ms
}

export interface LipSyncModelInfo {
  id: string;
  name: string;
  description: string;
  requires_ref_pose: boolean;
  enhancer_supported: boolean;
}

export interface LipSyncConnectionTest {
  success: boolean;
  message: string;
  url: string;
}

export interface LipSyncJob {
  id: string;
  projectId: string;
  status: LipSyncStatus;
  progress: number;
  outputVideo?: string;
  error?: string;
  createdAt: number; // timestamp
  completedAt?: number; // timestamp
  model: LipSyncModel;
  characterFaceImage: string;
  audioFile: string;
}

export interface LipSyncOptions {
  model: LipSyncModel;
  enhancer: boolean;
  pads: string;
  nosmooth: boolean;
  style: string;
}

export const DEFAULT_LIP_SYNC_OPTIONS: LipSyncOptions = {
  model: LipSyncModel.WAV2LIP,
  enhancer: true,
  pads: '0 0 0 0',
  nosmooth: false,
  style: 'neutral'
};

export interface LipSyncPreview {
  originalImage: string;
  generatedVideo?: string;
  audioFile: string;
  duration: number;
}

export interface LipSyncWizardStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export const LIP_SYNC_WIZARD_STEPS: LipSyncWizardStep[] = [
  {
    id: 'select-face',
    title: 'Select Face Image',
    description: 'Choose the character face image to animate',
    completed: false
  },
  {
    id: 'select-audio',
    title: 'Select Audio',
    description: 'Choose the dialogue audio file',
    completed: false
  },
  {
    id: 'configure',
    title: 'Configure Options',
    description: 'Set lip sync model and enhancement options',
    completed: false
  },
  {
    id: 'generate',
    title: 'Generate',
    description: 'Generate the lip-synced video',
    completed: false
  },
  {
    id: 'preview',
    title: 'Preview & Export',
    description: 'Preview and export the result',
    completed: false
  }
];

