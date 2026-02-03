/**
 * Project Discovery Types for Renderer Process
 * 
 * These types mirror the IPC types from the main process to ensure
 * type safety in the renderer process when working with project discovery.
 */

/**
 * Discovered project metadata
 * Mirrors: electron/services/ProjectDiscoveryService.DiscoveredProject
 */
export interface DiscoveredProject {
  name: string;
  path: string;
  lastModified: number;
  isValid: boolean;
  metadata?: {
    schema_version: string;
    project_name: string;
    capabilities: Record<string, boolean>;
  };
  createdAt?: Date;
  isRecent: boolean;
}

/**
 * Result of project discovery scan
 * Mirrors: electron/services/ProjectDiscoveryService.DiscoveryResult
 */
export interface DiscoveryResult {
  projects: DiscoveredProject[];
  scannedPath: string;
  timestamp: number;
  errors: Array<{ path: string; error: string }>;
}

/**
 * Scan options for project discovery
 * Mirrors: electron/types/ipc.ScanProjectsOptions
 */
export interface ScanProjectsOptions {
  bypassCache?: boolean;
  maxDepth?: number;
}

/**
 * Base response interface for IPC handlers
 * Mirrors: electron/types/ipc.IPCResponse
 */
export interface IPCResponse<T = any> {
  success: boolean;
  error?: string;
  errorCode?: string;
  data?: T;
}

/**
 * Response for projects:scan-directory IPC channel
 * Mirrors: electron/types/ipc.ScanProjectsResponse
 */
export interface ScanProjectsResponse extends IPCResponse<DiscoveredProject[]> {
  projects?: DiscoveredProject[];
}

/**
 * Merged project (discovered + recent)
 * Mirrors: electron/RecentProjectsManager.MergedProject
 */
export interface MergedProject extends DiscoveredProject {
  lastAccessed?: number;
}

/**
 * Response for projects:get-merged-list IPC channel
 * Mirrors: electron/types/ipc.MergedProjectsResponse
 */
export interface MergedProjectsResponse extends IPCResponse<MergedProject[]> {
  projects?: MergedProject[];
}

/**
 * Response for projects:refresh IPC channel
 * Mirrors: electron/types/ipc.RefreshProjectsResponse
 */
export interface RefreshProjectsResponse extends IPCResponse<MergedProject[]> {
  projects?: MergedProject[];
}

/**
 * Error codes for project discovery operations
 * Mirrors: electron/types/ipc.ProjectDiscoveryErrorCode
 */
export enum ProjectDiscoveryErrorCode {
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_PROJECT = 'INVALID_PROJECT',
  SCAN_FAILED = 'SCAN_FAILED',
  MERGE_FAILED = 'MERGE_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
