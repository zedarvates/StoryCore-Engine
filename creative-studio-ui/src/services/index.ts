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

export { ReferenceSheetService, referenceSheetService } from './referenceSheetService';
export { CommentDrivenGenerationService, getCommentDrivenGenerationService } from './commentDrivenGenerationService';
export { EpisodeReferenceService, episodeReferenceService } from './episodeReferenceService';
export type { 
  ModificationType,
  ParsedIntent,
  GenerationIntent,
  GenerationParameters,
  ShotComment,
  VisualModification,
  GenerationResult,
  CommentParseResult
} from './commentDrivenGenerationService';
export type {
  LinkedEpisode,
  ContinuityValidationResult,
  CharacterContinuityStatus,
  LocationContinuityStatus,
  ContinuityBreak,
  ContinuityFix,
  ImportResult
} from './episodeReferenceService';

export { VideoReplicationService, videoReplicationService } from './videoReplicationService';
export type {
  ReferenceVideo,
  VideoStructureAnalysis,
  ShotInfo,
  CompositionInfo,
  TransitionInfo,
  SceneChange,
  Keyframe,
  DigitalHumanAnalysis,
  HumanSubject,
  HumanFeatures,
  ReplicationProject,
  ReplicatedShot,
  ReplicationSettings,
  ReplicationOptions,
  Shot,
  Sequence
} from './videoReplicationService';

export { ProjectBranchingService, projectBranchingService } from './projectBranchingService';
export type {
  ContextExport,
  BranchInfo,
  ProjectContext,
  CharacterContext,
  WorldContext,
  SequenceContext,
  ShotContext,
  Checkpoint,
  ContextScope,
  BranchStatus
} from './projectBranchingService';
