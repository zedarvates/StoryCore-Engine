/**
 * IPC Type Definitions
 * 
 * TypeScript interfaces for IPC request and response types
 */

import { DiscoveredProject, DiscoveryResult } from '../services/ProjectDiscoveryService';
import { MergedProject } from '../RecentProjectsManager';

/**
 * Base response interface for all IPC handlers
 */
export interface IPCResponse<T = any> {
  success: boolean;
  error?: string;
  errorCode?: string;
  data?: T;
}

/**
 * Scan options for project discovery
 */
export interface ScanProjectsOptions {
  bypassCache?: boolean;
  maxDepth?: number;
}

/**
 * Response for projects:scan-directory
 */
export interface ScanProjectsResponse extends IPCResponse<DiscoveredProject[]> {
  projects?: DiscoveredProject[];
}

/**
 * Response for projects:get-merged-list
 */
export interface MergedProjectsResponse extends IPCResponse<MergedProject[]> {
  projects?: MergedProject[];
}

/**
 * Response for projects:refresh
 */
export interface RefreshProjectsResponse extends IPCResponse<MergedProject[]> {
  projects?: MergedProject[];
}

/**
 * Error codes for project discovery operations
 */
export enum ProjectDiscoveryErrorCode {
  DIRECTORY_NOT_FOUND = 'DIRECTORY_NOT_FOUND',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INVALID_PROJECT = 'INVALID_PROJECT',
  SCAN_FAILED = 'SCAN_FAILED',
  MERGE_FAILED = 'MERGE_FAILED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Re-export types from ProjectDiscoveryService for IPC communication
 * This ensures type safety between main and renderer processes
 */
export type { DiscoveredProject, DiscoveryResult };
