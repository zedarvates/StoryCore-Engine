/**
 * Asset type definitions for the editor-wizard-integration feature
 */

export type AssetType = 'image' | 'audio' | 'video';

export interface AssetMetadata {
  id: string;
  filename: string;
  type: AssetType;
  path: string;
  size: number;
  imported_at: string;
  thumbnail?: string;
  // Extended properties for asset library
  description?: string;
  author?: string;
  license?: string;
  tags?: string[]; // Array of tags for categorization and search
  category?: string;
  characterMetadata?: Record<string, any>;
  environmentMetadata?: Record<string, any>;
  styleMetadata?: Record<string, any>;
  cameraMetadata?: Record<string, any>;
  lightingMetadata?: Record<string, any>;
  templateMetadata?: Record<string, any>;
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportResult {
  success: boolean;
  assetId?: string;
  assetPath?: string;
  error?: string;
}

export interface AssetValidationRules {
  allowedExtensions: string[];
  maxSize: number;
  minDimensions?: { width: number; height: number };
  minDuration?: number;
}

export const ASSET_VALIDATION_RULES: Record<AssetType, AssetValidationRules> = {
  image: {
    allowedExtensions: ['.png', '.jpg', '.jpeg'],
    maxSize: 50 * 1024 * 1024, // 50MB
    minDimensions: { width: 256, height: 256 },
  },
  audio: {
    allowedExtensions: ['.mp3', '.wav'],
    maxSize: 100 * 1024 * 1024, // 100MB
    minDuration: 0.1, // 0.1 seconds
  },
  video: {
    allowedExtensions: ['.mp4', '.mov'],
    maxSize: 500 * 1024 * 1024, // 500MB
    minDuration: 0.1, // 0.1 seconds
  },
};
