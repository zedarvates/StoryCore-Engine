/**
 * Services Export
 * 
 * Central export point for all service modules
 */

export { ThumbnailCache } from './ThumbnailCache';
export type { ThumbnailCacheConfig, CacheEntry } from './ThumbnailCache';

export { GenerationHistoryService, generationHistoryService } from './GenerationHistoryService';
export type { HistoryQueryOptions } from './GenerationHistoryService';

export { RecentProjectsService, recentProjectsService } from './recentProjects';
export type { RecentProject } from '../types/menuBarState';
