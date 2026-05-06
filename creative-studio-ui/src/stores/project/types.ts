import type { 
  Project, 
  Shot, 
  Asset, 
  GenerationTask, 
  PanelSizes, 
  World, 
  Character, 
  Story, 
  Location as ProductionLocation,
  StoryObject,
  SequencePlan
} from '@/types';
import type { Track, TimelineMarker } from '@/sequence-editor/types';
import type { AlignmentReport } from '@/sequence-editor/components/Alignment/AlignmentDashboard';

/**
 * Unified History Entry
 * Optimized for partial state diffing (Audit Task 7)
 */
export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  // Partial snapshots of what changed (Task 7.3)
  previousState: Partial<ProjectState>;
  nextState: Partial<ProjectState>;
  // Metadata for UI (e.g. "Moved Shot 5")
  metadata?: Record<string, unknown>;
}

/**
 * Unified Project State
 */
export interface ProjectState {
  // Project data
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  worlds: World[];
  characters: Character[];
  locations: ProductionLocation[];
  objects: StoryObject[];
  stories: Story[];
  sequencePlans: SequencePlan[];
  
  // Selection and Time
  selectedShotId: string | null;
  selectedWorldId: string | null;
  currentTime: number;
  
  // Playback
  isPlaying: boolean;
  playbackSpeed: number;
  
  // Timeline UI State (Audit Task 5 & 21)
  tracks: Track[];
  zoomLevel: number;
  selectedElements: string[];
  timelineDuration: number;
  markers: TimelineMarker[];
  
  // NLE Interaction Modes (Audit Task 5)
  snapMode: boolean;
  rippleMode: boolean;
  magneticMode: boolean;
  
  // Tools (Task 21 bridge)
  activeTool: string;
  toolSettings: Record<string, unknown>;
  
  // Task Queue
  taskQueue: GenerationTask[];
  generationStatus: {
    state: 'idle' | 'processing' | 'complete' | 'error';
    stage?: 'grid' | 'promotion' | 'qa' | 'export';
    progress: number;
    error?: string;
  };
  
  // UI Panels (Overlap from AppStore)
  showChat: boolean;
  showTaskQueue: boolean;
  panelSizes: PanelSizes;
  
  // Selection
  selectedEffectId: string | null;
  selectedTextLayerId: string | null;
  selectedKeyframeId: string | null;
  
  // History (Audit Task 7)
  history: HistoryEntry[];
  historyIndex: number;
  lastSavedIndex: number;
  
  // Alignment (Audit Task 4)
  alignmentReport: AlignmentReport | null;
  isAnalyzingAlignment: boolean;
  isRefiningAlignment: boolean;
}

/**
 * Unified Project Actions
 */
export interface ProjectActions {
  // Project
  setProject: (project: Project | null) => void;
  updateProject: (updates: Partial<Project>) => void;
  saveProjectToDisk: () => Promise<{ success: boolean; errors: string[] }>;
  
  // Shots
  setShots: (shots: Shot[]) => void;
  addShot: (shot: Shot, skipHistory?: boolean) => void;
  updateShot: (id: string, updates: Partial<Shot>, skipHistory?: boolean) => void;
  deleteShot: (id: string, skipHistory?: boolean) => void;
  reorderShots: (shots: Shot[], skipHistory?: boolean) => void;
  setSelectedShotId: (id: string | null) => void;
  assignCharacterToShot: (shotId: string, characterId: string) => void;
  removeCharacterFromShot: (shotId: string, characterId: string) => void;
  
  // Timeline UI (Audit Task 5 & 21)
  setTracks: (tracks: Track[]) => void;
  setZoomLevel: (zoomLevel: number) => void;
  setSelectedElements: (elements: string[]) => void;
  setTimelineDuration: (duration: number) => void;
  setMarkers: (markers: TimelineMarker[]) => void;
  
  // Track Management
  addTrack: (track: Track) => void;
  updateTrack: (id: string, updates: Partial<Track>) => void;
  deleteTrack: (id: string) => void;
  reorderTracks: (tracks: Track[]) => void;
  toggleTrackLock: (id: string) => void;
  toggleTrackHidden: (id: string) => void;
  
  // Toggles for interaction modes
  toggleSnapToGrid: () => void;
  toggleRippleEdit: () => void;
  toggleMagneticTimeline: () => void;
  
  // Tools
  setActiveTool: (tool: string) => void;
  updateToolSettings: (settings: Record<string, unknown>) => void;

  // Complex NLE Edits (Audit Task 5)
  rippleEdit: (payload: { shotId: string; delta: number; edge: 'start' | 'end' }) => void;
  rollEdit: (payload: { shotAId: string; shotBId: string; delta: number }) => void;
  slipEdit: (payload: { shotId: string; delta: number }) => void;
  slideEdit: (payload: { shotId: string; delta: number }) => void;
  splitShot: (shotId: string, splitTime: number) => void;

  // Transitions
  addCrossDissolve: (leftShotId: string, rightShotId: string, duration: number) => void;
  removeTransition: (shotId: string, side: 'in' | 'out') => void;
  
  // World entities
  addWorld: (world: World) => void;
  updateWorld: (id: string, updates: Partial<World>) => void;
  deleteWorld: (id: string) => void;
  
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  
  // Stories
  addStory: (story: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  
  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
  
  // Tasks
  addTask: (task: GenerationTask) => void;
  updateTask: (taskId: string, updates: Partial<GenerationTask>) => void;
  removeTask: (taskId: string) => void;
  setGenerationStatus: (status: Partial<ProjectState['generationStatus']>) => void;
  
  // Asset Promotion (Audit Task 21)
  promoteAssetFromShot: (shotId: string) => void;
  promoteAllGeneratedAssets: () => void;
  
  // History
  pushHistory: (entry: HistoryEntry) => void;
  undo: () => void;
  redo: () => void;
  goToHistoryIndex: (index: number) => void;
  clearHistory: () => void;
  markAsSaved: () => void;
  
  // Alignment (Audit Task 4)
  generateAlignmentReport: () => Promise<AlignmentReport>;
  applyAlignmentRepair: (recommendations: string[]) => Promise<void>;
}

export type UnifiedProjectStore = ProjectState & ProjectActions;
