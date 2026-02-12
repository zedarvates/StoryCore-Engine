/**
 * Complete Cinematic Types System for StoryCore - 38 Camera Movements Edition
 * 
 * Based on AI Filmmaking Masterclass - 38 Cinematic Camera Moves
 * 
 * @module cinematicTypes
 * @version 2.0.0
 * @updated 2026-02-12 - Added generic types to reduce 'any' usage
 */

// ============================================================================
// GENERIC UTILITY TYPES - New additions to replace 'any'
// ============================================================================

/** Generic API response wrapper - replaces Promise<any> */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
  timestamp?: string;
}

/** Generic event handler - replaces (any) => void */
export type EventHandler<T = unknown> = (data: T) => void;

/** Generic error handler */
export type ErrorHandler = (error: Error, context?: Record<string, unknown>) => void;

/** Generic callback type */
export type Callback<T = void> = () => T;

/** Generic async callback */
export type AsyncCallback<T = void> = () => Promise<T>;

/** Generic predicate function */
export type Predicate<T> = (value: T) => boolean;

/** Generic transformer function */
export type Transformer<T, R = T> = (value: T) => R;

/** Generic comparator function */
export type Comparator<T> = (a: T, b: T) => number;

/** Generic factory function */
export type Factory<T> = () => T;

/** Generic repository pattern interface */
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(item: Omit<T, 'id'>): Promise<T>;
  update(id: ID, item: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
}

/** Generic service pattern interface */
export interface Service<T> {
  execute(data: T): Promise<T>;
  validate(data: T): boolean;
  getDefault(): T;
}

/** Generic state container */
export interface State<T> {
  readonly current: T;
  readonly previous: T | null;
  readonly isChanged: boolean;
  set(state: Partial<T>): void;
  reset(): void;
}

/** Generic result wrapper for operations */
export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
  message?: string;
}

/** Pagination parameters */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Paginated response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/** Generic dictionary/map type - replaces Record<string, unknown> */
export type Dictionary<T> = Record<string, T>;

/** Flexible metadata type - replaces object: unknown */
export type Metadata = Record<string, unknown>;

/** Generic JSON value - for flexible data structures */
export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

/** Generic JSON object */
export interface JsonObject {
  [key: string]: JsonValue;
}

/** Generic configuration type */
export interface Config<T = Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K] | undefined;
  set<K extends keyof T>(key: K, value: T[K]): void;
  has<K extends keyof T>(key: K): boolean;
  reset(): void;
  toObject(): T;
}

/** Generic form data type */
export interface FormData<T = Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  reset(): void;
  setFieldValue<K extends keyof T>(key: K, value: T[K]): void;
  setFieldError<K extends keyof T>(key: K, error: string): void;
  validate(): boolean;
  submit(): Promise<T>;
}

/** Generic option/choice type */
export interface Option<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  description?: string;
}

/** Generic status indicator */
export type Status = 'idle' | 'loading' | 'success' | 'error';

/** Generic loading state */
export interface LoadingState<T = unknown> {
  status: Status;
  data?: T;
  error?: Error;
  progress?: number;
}

/** Generic CRUD operations */
export interface CrudOperations<T, CreateDto = Omit<T, 'id'>, UpdateDto = Partial<T>> {
  create(dto: CreateDto): Promise<T>;
  read(id: string): Promise<T | null>;
  readAll(): Promise<T[]>;
  update(id: string, dto: UpdateDto): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// ============================================================================
// STRING LITERAL TYPES
// ============================================================================

export type CameraMovement = 
  | 'steadicam'
  | 'tracking'
  | 'handheld'
  | 'drone'
  | 'crane'
  | 'dolly'
  | 'pan'
  | 'tilt'
  | 'zoom'
  | 'static'
  | 'steady_cam'
  | 'walking'
  | 'running'
  | 'vehicle'
  | 'pov'
  | 'reverse'
  | 'orbital'
  | 'arc'
  | 'spline'
  | 'dolly_slow_in'
  | 'dolly_slow_out'
  | 'dolly_fast_in'
  | 'extreme_macro_zoom'
  | 'cosmic_hyper_zoom'
  | 'over_shoulder_ots'
  | 'fisheye_peephole'
  | 'reveal_from_behind'
  | 'through_shot'
  | 'reveal_from_blur'
  | 'rack_focus'
  | 'tilt_up'
  | 'tilt_down'
  | 'truck_left'
  | 'truck_right'
  | 'orbit_180'
  | 'orbit_360_spin'
  | 'cinematic_arc'
  | 'pedestal_down'
  | 'pedestal_up'
  | 'crane_up'
  | 'crane_down'
  | 'crane_up_high_reveal'
  | 'optical_zoom_in'
  | 'optical_zoom_out'
  | 'snap_crash_zoom'
  | 'drone_fly_over'
  | 'drone_epic_reveal'
  | 'drone_large_orbit'
  | 'drone_top_down'
  | 'drone_fpv_aggressive'
  | 'handheld_documentary'
  | 'whip_pan'
  | 'dutch_angle_roll'
  | 'leading_shot'
  | 'following_shot'
  | 'side_tracking'
  | 'pov_walk'
  | 'vertigo_effect';

export type CameraSpeed = 'slow' | 'medium' | 'fast' | 'variable' | 'very_slow' | 'very_fast';
export type CameraComplexity = 'simple' | 'moderate' | 'complex';
export type CameraCategory = 
  | 'dolly' | 'scale_continuity' | 'character_mounted' | 'obstacle' | 'focus'
  | 'tripod' | 'slider' | 'orbital' | 'vertical' | 'optical' | 'aerial' 
  | 'stylized' | 'tracking' | 'standard';

export type BeatType = 
  | 'opening' | 'setup' | 'confrontation' | 'climax' | 'resolution'
  | 'transition' | 'emotional' | 'reversal' | 'callback' | 'closing';
export type BeatImportance = 'low' | 'medium' | 'high' | 'critical';
export type CharacterFocus = 'lead' | 'supporting' | 'background' | 'off_screen' | 'group';
export type TransitionType = 
  | 'cut' | 'dissolve' | 'wipe' | 'fade' | 'match_cut' | 'j_cut' | 'l_cut' 
  | 'smash_cut' | 'cross_dissolve' | 'hard_cut';
export type Mood = 
  | 'happy' | 'sad' | 'tense' | 'romantic' | 'mysterious' | 'epic'
  | 'intimate' | 'dark' | 'whimsical' | 'melancholic' | 'anxious' | 'triumphant'
  | 'nostalgic' | 'peaceful' | 'chaotic' | 'mystical' | 'ironic'
  | 'surprise' | 'relief';
export type Tone = 
  | 'serious' | 'comedic' | 'dramatic' | 'light' | 'heavy' | 'playful'
  | 'grave' | 'hopeful' | 'cynical' | 'sentimental' | 'irreverent' | 'reverent';
export type Pacing = 'slow' | 'medium' | 'fast' | 'variable';
export type PacingEnergy = 'low' | 'medium' | 'high';
export type NoteType = 
  | 'camera' | 'lighting' | 'acting' | 'sound' | 'pace' | 'emotion' 
  | 'visual' | 'technical' | 'creative';
export type NotePriority = 'low' | 'medium' | 'high' | 'urgent';
export type NoteStatus = 'pending' | 'in_progress' | 'completed' | 'archived';

// ============================================================================
// CINEMATIC INTERFACES
// ============================================================================

export interface CameraMovementConfig {
  type: CameraMovement;
  name: string;
  description: string;
  category: CameraCategory;
  speed: CameraSpeed;
  smoothness: number; // 1-10
  complexity: CameraComplexity;
  promptExample: string;
  requiresSubjectMotion?: boolean;
  typicalDuration?: string;
  bestFor?: string[];
}

export interface BeatConfig {
  type: BeatType;
  name: string;
  description: string;
  duration?: string;
  emotionalTone?: Mood[];
  purpose?: string;
}

export interface PacingConfig {
  type: Pacing;
  name: string;
  description: string;
  shotDuration?: string;
  rhythm?: string;
  energy?: PacingEnergy;
}

export interface MoodArc {
  id: string;
  beats: {
    beatType: BeatType;
    mood: Mood;
    intensity: number; // 0-1
  }[];
  overallTrend: 'rising' | 'falling' | 'flat' | 'complex';
}

export interface PacingAnalysis {
  overallPace: Pacing;
  averageShotDuration: number; // seconds
  pacingCurve: {
    time: number;
    pace: Pacing;
  }[];
  energyLevel: PacingEnergy;
  variationCount: number;
}

export interface DirectorNote {
  id: string;
  note: string;
  type: NoteType;
  priority: NotePriority;
  status: NoteStatus;
  timestamp: string;
  author?: string;
  resolvedAt?: string;
  metadata?: Metadata;
}

export interface CharacterPresence {
  characterId: string;
  focus: CharacterFocus;
  timeStart: number;
  timeEnd: number;
  prominence: number; // 0-1
}

export interface CharacterFocusTrack {
  characterId: string;
  timeline: {
    characterId: string;
    timeStart: number;
    timeEnd: number;
    focus: CharacterFocus;
    cameraMovement?: CameraMovement;
  }[];
  totalScreenTime: number;
  dominantFocus: CharacterFocus;
}

export interface VersionEntry {
  version: string;
  timestamp: string;
  author: string;
  changes: string[];
  snapshot?: string;
}

// ============================================================================
// SHOT & SEQUENCE TYPES
// ============================================================================

export interface Shot {
  id: string;
  name: string;
  description: string;
  order: number;
  duration: number;
  cameraAngle?: string;
  cameraMovement?: CameraMovement;
  characters: string[];
  locationId?: string;
  audio?: string;
  dialogue?: string;
  visualEffects?: string[];
  generatedImage?: string;
  seed?: number;
  prompt?: string;
  negativePrompt?: string;
  cfgScale?: number;
  denoisingStrength?: number;
  width?: number;
  height?: number;
  metadata?: Metadata;
}

export interface SequenceBase {
  id: string;
  name: string;
  description?: string;
  order: number;
  duration?: number;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Metadata;
}

export interface Beat extends SequenceBase {
  type: BeatType;
  importance: BeatImportance;
  suggestedDuration?: number;
  pacing: Pacing;
  mood: Mood;
  tone: Tone;
  characters: CharacterPresence[];
  locationId?: string;
  directorNotes: DirectorNote[];
  metadata?: Metadata;
}

export interface EnhancedShot {
  id: string;
  name: string;
  description: string;
  order: number;
  duration: number;
  beatId?: string;
  cameraMovement?: CameraMovement | null;
  pacing: Pacing;
  mood: Mood;
  tone: Tone;
  characters: CharacterPresence[];
  locationId?: string;
  directorNotes: DirectorNote[];
  metadata?: Metadata;
}

export interface CompleteSequence {
  id: string;
  name: string;
  description: string;
  order: number;
  beats: Beat[];
  shots: EnhancedShot[];
  moodArc?: MoodArc;
  pacingAnalysis?: PacingAnalysis;
  characterFocusTracks: CharacterFocusTrack[];
  directorNotes: DirectorNote[];
  versionHistory: VersionEntry[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CAMERA MOVEMENT PRESETS
// ============================================================================

export const CAMERA_MOVEMENT_PRESETS: Record<CameraMovement, CameraMovementConfig> = {
  // Dolly Moves
  dolly_slow_in: {
    type: 'dolly_slow_in', name: 'Slow Dolly In', description: 'Camera moves slowly toward subject',
    category: 'dolly', speed: 'slow', smoothness: 9, complexity: 'simple',
    promptExample: 'slow dolly in, camera moving steadily toward subject', requiresSubjectMotion: false,
  },
  dolly_slow_out: {
    type: 'dolly_slow_out', name: 'Slow Dolly Out', description: 'Camera moves slowly away',
    category: 'dolly', speed: 'slow', smoothness: 9, complexity: 'simple',
    promptExample: 'slow dolly out, camera moving away from subject', requiresSubjectMotion: false,
  },
  dolly_fast_in: {
    type: 'dolly_fast_in', name: 'Fast Dolly In', description: 'Camera rushes rapidly toward subject',
    category: 'dolly', speed: 'very_fast', smoothness: 8, complexity: 'moderate',
    promptExample: 'fast dolly in, cold rush toward face, sudden urgency', requiresSubjectMotion: false,
  },
  // Scale Continuity
  extreme_macro_zoom: {
    type: 'extreme_macro_zoom', name: 'Extreme Macro Zoom', description: 'Face to micro detail',
    category: 'scale_continuity', speed: 'medium', smoothness: 7, complexity: 'complex',
    promptExample: 'extreme macro zoom, face to micro detail', requiresSubjectMotion: false,
  },
  cosmic_hyper_zoom: {
    type: 'cosmic_hyper_zoom', name: 'Cosmic Hyper Zoom', description: 'Space to street scale',
    category: 'scale_continuity', speed: 'fast', smoothness: 6, complexity: 'complex',
    promptExample: 'cosmic hyper zoom, space to street', requiresSubjectMotion: false,
  },
  // Character Mounted
  over_shoulder_ots: {
    type: 'over_shoulder_ots', name: 'Over the Shoulder (OTS)', description: 'Behind one character, other in focus',
    category: 'character_mounted', speed: 'slow', smoothness: 8, complexity: 'simple',
    promptExample: 'over the shoulder shot, camera mounted behind character', requiresSubjectMotion: false,
  },
  fisheye_peephole: {
    type: 'fisheye_peephole', name: 'Fisheye / Peephole', description: 'Extreme wide angle distortion',
    category: 'character_mounted', speed: 'slow', smoothness: 5, complexity: 'simple',
    promptExample: 'fisheye lens, extreme wide angle distortion', requiresSubjectMotion: false,
  },
  // Obstacle/Environment
  reveal_from_behind: {
    type: 'reveal_from_behind', name: 'Reveal from Behind', description: 'Blocked to reveal subject',
    category: 'obstacle', speed: 'medium', smoothness: 8, complexity: 'moderate',
    promptExample: 'reveal from behind, camera starts blocked by foreground', requiresSubjectMotion: false,
  },
  through_shot: {
    type: 'through_shot', name: 'Through Shot', description: 'Through aperture/window to subject',
    category: 'obstacle', speed: 'medium', smoothness: 7, complexity: 'moderate',
    promptExample: 'through shot, camera flying through window to subject', requiresSubjectMotion: false,
  },
  // Focus/Lens
  reveal_from_blur: {
    type: 'reveal_from_blur', name: 'Reveal from Blur', description: 'Out of focus to sharp',
    category: 'focus', speed: 'slow', smoothness: 9, complexity: 'moderate',
    promptExample: 'reveal from blur, start out of focus, pull to sharp', requiresSubjectMotion: false,
  },
  rack_focus: {
    type: 'rack_focus', name: 'Rack Focus', description: 'Shift from foreground to background',
    category: 'focus', speed: 'medium', smoothness: 8, complexity: 'moderate',
    promptExample: 'rack focus, foreground to background shift', requiresSubjectMotion: false,
  },
  // Tripod
  tilt_up: {
    type: 'tilt_up', name: 'Tilt Up', description: 'Camera moves vertically up',
    category: 'tripod', speed: 'slow', smoothness: 8, complexity: 'simple',
    promptExample: 'tilt up, camera moving vertically up', requiresSubjectMotion: false,
  },
  tilt_down: {
    type: 'tilt_down', name: 'Tilt Down', description: 'Camera moves vertically down',
    category: 'tripod', speed: 'slow', smoothness: 8, complexity: 'simple',
    promptExample: 'tilt down, camera moving vertically down', requiresSubjectMotion: false,
  },
  // Slider
  truck_left: {
    type: 'truck_left', name: 'Truck Left', description: 'Lateral move to the left',
    category: 'slider', speed: 'medium', smoothness: 9, complexity: 'simple',
    promptExample: 'truck left, camera moving sideways toward left', requiresSubjectMotion: false,
  },
  truck_right: {
    type: 'truck_right', name: 'Truck Right', description: 'Lateral move to the right',
    category: 'slider', speed: 'medium', smoothness: 9, complexity: 'simple',
    promptExample: 'truck right, camera moving sideways toward right', requiresSubjectMotion: false,
  },
  // Orbital
  orbit_180: {
    type: 'orbit_180', name: 'Orbit 180', description: 'Half circle around subject',
    category: 'orbital', speed: 'medium', smoothness: 8, complexity: 'moderate',
    promptExample: 'orbit 180, half circle around subject', requiresSubjectMotion: false,
  },
  orbit_360_spin: {
    type: 'orbit_360_spin', name: '360 Orbit Spin', description: 'Full 360 around subject',
    category: 'orbital', speed: 'fast', smoothness: 7, complexity: 'complex',
    promptExample: '360 orbit spin, full rotation around subject', requiresSubjectMotion: false,
  },
  cinematic_arc: {
    type: 'cinematic_arc', name: 'Slow Cinematic Arc', description: 'Gentle wide curve around',
    category: 'orbital', speed: 'slow', smoothness: 9, complexity: 'moderate',
    promptExample: 'slow cinematic arc, gentle wide curve around subject', requiresSubjectMotion: false,
  },
  pedestal_down: {
    type: 'pedestal_down', name: 'Pedestal Down', description: 'Camera lowers vertically',
    category: 'orbital', speed: 'slow', smoothness: 8, complexity: 'simple',
    promptExample: 'pedestal down, camera body physically lowering', requiresSubjectMotion: false,
  },
  // Vertical/Crane
  pedestal_up: {
    type: 'pedestal_up', name: 'Pedestal Up', description: 'Camera rises vertically',
    category: 'vertical', speed: 'slow', smoothness: 9, complexity: 'simple',
    promptExample: 'pedestal up, camera body rising vertically', requiresSubjectMotion: false,
  },
  crane_up: {
    type: 'crane_up', name: 'Crane Up', description: 'Crane movement upward',
    category: 'vertical', speed: 'slow', smoothness: 10, complexity: 'complex',
    promptExample: 'crane up, dramatic crane movement rising', requiresSubjectMotion: false,
  },
  crane_down: {
    type: 'crane_down', name: 'Crane Down', description: 'Crane descending',
    category: 'vertical', speed: 'slow', smoothness: 10, complexity: 'complex',
    promptExample: 'crane down, crane descending slowly', requiresSubjectMotion: false,
  },
  crane_up_high_reveal: {
    type: 'crane_up_high_reveal', name: 'Crane Up High Reveal', description: 'Dramatic overhead',
    category: 'vertical', speed: 'slow', smoothness: 10, complexity: 'complex',
    promptExample: 'crane up high angle reveal, dramatic overhead', requiresSubjectMotion: false,
  },
  // Optical Effects
  optical_zoom_in: {
    type: 'optical_zoom_in', name: 'Smooth Optical Zoom In', description: 'Smooth lens zoom in',
    category: 'optical', speed: 'medium', smoothness: 7, complexity: 'simple',
    promptExample: 'smooth optical zoom in, gradual magnification', requiresSubjectMotion: false,
  },
  optical_zoom_out: {
    type: 'optical_zoom_out', name: 'Smooth Optical Zoom Out', description: 'Smooth lens zoom out',
    category: 'optical', speed: 'medium', smoothness: 7, complexity: 'simple',
    promptExample: 'smooth optical zoom out, gradual magnification away', requiresSubjectMotion: false,
  },
  snap_crash_zoom: {
    type: 'snap_crash_zoom', name: 'Snap / Crash Zoom', description: 'Sudden rapid zoom to eyes',
    category: 'optical', speed: 'very_fast', smoothness: 4, complexity: 'simple',
    promptExample: 'snap crash zoom, sudden rapid zoom to eyes', requiresSubjectMotion: false,
  },
  // Aerial/Drone
  drone_fly_over: {
    type: 'drone_fly_over', name: 'Drone Fly Over', description: 'High altitude horizontal',
    category: 'aerial', speed: 'slow', smoothness: 8, complexity: 'moderate',
    promptExample: 'drone fly over, high altitude aerial shot', requiresSubjectMotion: false,
  },
  drone_epic_reveal: {
    type: 'drone_epic_reveal', name: 'Epic Drone Reveal', description: 'Pedestal plus tilt',
    category: 'aerial', speed: 'slow', smoothness: 8, complexity: 'complex',
    promptExample: 'epic drone reveal, pedestal plus tilt', requiresSubjectMotion: false,
  },
  drone_large_orbit: {
    type: 'drone_large_orbit', name: 'Large Scale Drone Orbit', description: 'Massive aerial circle',
    category: 'aerial', speed: 'slow', smoothness: 9, complexity: 'complex',
    promptExample: 'large scale drone orbit, massive aerial circle', requiresSubjectMotion: false,
  },
  drone_top_down: {
    type: 'drone_top_down', name: 'Top Down', description: "God's eye view overhead",
    category: 'aerial', speed: 'slow', smoothness: 7, complexity: 'moderate',
    promptExample: 'top down drone shot, god eye view, overhead', requiresSubjectMotion: false,
  },
  drone_fpv_aggressive: {
    type: 'drone_fpv_aggressive', name: 'FPV Drone Dive', description: 'First person aggressive dive',
    category: 'aerial', speed: 'very_fast', smoothness: 5, complexity: 'complex',
    promptExample: 'FPV drone aggressive dive, first person perspective', requiresSubjectMotion: false,
  },
  // Stylized
  handheld_documentary: {
    type: 'handheld_documentary', name: 'Handheld Documentary', description: 'Organic handheld with bob',
    category: 'stylized', speed: 'medium', smoothness: 4, complexity: 'simple',
    promptExample: 'handheld documentary style, organic camera movement', requiresSubjectMotion: true,
  },
  whip_pan: {
    type: 'whip_pan', name: 'Whip Pan', description: 'Violent whip with motion blur',
    category: 'stylized', speed: 'very_fast', smoothness: 3, complexity: 'simple',
    promptExample: 'whip pan, violent camera whip with motion blur', requiresSubjectMotion: false,
  },
  dutch_angle_roll: {
    type: 'dutch_angle_roll', name: 'Dutch Angle', description: 'Permanently tilted on Z-axis',
    category: 'stylized', speed: 'slow', smoothness: 5, complexity: 'simple',
    promptExample: 'dutch angle, camera permanently tilted sideways', requiresSubjectMotion: false,
  },
  // Subject Tracking
  leading_shot: {
    type: 'leading_shot', name: 'Leading Shot', description: 'Subject walks toward camera',
    category: 'tracking', speed: 'slow', smoothness: 7, complexity: 'moderate',
    promptExample: 'leading shot, subject walking toward camera, camera backing up', requiresSubjectMotion: true,
  },
  following_shot: {
    type: 'following_shot', name: 'Following Shot', description: 'Subject walks away, camera follows',
    category: 'tracking', speed: 'slow', smoothness: 7, complexity: 'moderate',
    promptExample: 'following shot, subject walking away, camera following', requiresSubjectMotion: true,
  },
  side_tracking: {
    type: 'side_tracking', name: 'Side Tracking', description: 'Lateral tracking',
    category: 'tracking', speed: 'slow', smoothness: 7, complexity: 'moderate',
    promptExample: 'side tracking, subject walking, camera tracking alongside', requiresSubjectMotion: true,
  },
  pov_walk: {
    type: 'pov_walk', name: 'POV Walk', description: 'First person walk',
    category: 'tracking', speed: 'slow', smoothness: 5, complexity: 'simple',
    promptExample: 'POV walk, first person perspective, walking', requiresSubjectMotion: true,
  },
  // Special
  vertigo_effect: {
    type: 'vertigo_effect', name: 'Vertigo Effect', description: 'Dolly back while zooming in',
    category: 'standard', speed: 'medium', smoothness: 6, complexity: 'complex',
    promptExample: 'vertigo effect, zolly, camera backward while zooming in', requiresSubjectMotion: false,
  },
  // Original (compatibility)
  steadicam: {
    type: 'steadicam', name: 'Steadicam', description: 'Mouvement fluide et stable',
    category: 'standard', speed: 'medium', smoothness: 9, complexity: 'moderate',
    promptExample: 'steadicam shot, smooth stable movement',
  },
  tracking: {
    type: 'tracking', name: 'Travelling', description: 'Mouvement horizontal',
    category: 'standard', speed: 'medium', smoothness: 8, complexity: 'simple',
    promptExample: 'tracking shot, camera moving along axis',
  },
  handheld: {
    type: 'handheld', name: 'Camera a l epaule', description: 'Style organique',
    category: 'standard', speed: 'medium', smoothness: 4, complexity: 'simple',
    promptExample: 'handheld camera, organic movement',
  },
  drone: {
    type: 'drone', name: 'Drone', description: 'Mouvements aeriens',
    category: 'aerial', speed: 'slow', smoothness: 7, complexity: 'moderate',
    promptExample: 'drone shot, aerial perspective',
  },
  crane: {
    type: 'crane', name: 'Grues', description: 'Mouvements verticaux spectaculaires',
    category: 'vertical', speed: 'slow', smoothness: 10, complexity: 'complex',
    promptExample: 'crane shot, spectacular vertical',
  },
  dolly: {
    type: 'dolly', name: 'Dolly', description: 'Mouvement sur rails',
    category: 'dolly', speed: 'medium', smoothness: 9, complexity: 'moderate',
    promptExample: 'dolly shot, camera on wheeled platform',
  },
  pan: {
    type: 'pan', name: 'Panoramique', description: 'Rotation horizontale',
    category: 'tripod', speed: 'medium', smoothness: 7, complexity: 'simple',
    promptExample: 'pan shot, horizontal rotation',
  },
  tilt: {
    type: 'tilt', name: 'Tilt', description: 'Rotation verticale',
    category: 'tripod', speed: 'medium', smoothness: 7, complexity: 'simple',
    promptExample: 'tilt shot, vertical rotation',
  },
  zoom: {
    type: 'zoom', name: 'Zoom', description: 'Changement de focale',
    category: 'optical', speed: 'fast', smoothness: 6, complexity: 'simple',
    promptExample: 'zoom lens, dynamic focal change',
  },
  static: {
    type: 'static', name: 'Plan fixe', description: 'Camera immobile',
    category: 'standard', speed: 'slow', smoothness: 10, complexity: 'simple',
    promptExample: 'static shot, camera completely still',
  },
  steady_cam: {
    type: 'steady_cam', name: 'Steady Cam', description: 'Fluide maximale',
    category: 'standard', speed: 'medium', smoothness: 10, complexity: 'moderate',
    promptExample: 'steady cam, maximum fluidity',
  },
  walking: {
    type: 'walking', name: 'Walking Cam', description: 'Camera marchant',
    category: 'standard', speed: 'slow', smoothness: 6, complexity: 'simple',
    promptExample: 'walking camera, gimbal movement',
  },
  running: {
    type: 'running', name: 'Running Cam', description: 'Camera courant',
    category: 'standard', speed: 'fast', smoothness: 5, complexity: 'moderate',
    promptExample: 'running camera, pursuit shots',
  },
  vehicle: {
    type: 'vehicle', name: 'Vehicle Mount', description: 'Camera sur vehicule',
    category: 'standard', speed: 'fast', smoothness: 7, complexity: 'moderate',
    promptExample: 'vehicle mount, car shot',
  },
  pov: {
    type: 'pov', name: 'Point de Vue', description: 'Perspective du personnage',
    category: 'standard', speed: 'medium', smoothness: 6, complexity: 'simple',
    promptExample: 'POV shot, character perspective',
  },
  reverse: {
    type: 'reverse', name: 'Reverse', description: 'Camera reculant',
    category: 'standard', speed: 'medium', smoothness: 7, complexity: 'moderate',
    promptExample: 'reverse shot, camera moving backward',
  },
  orbital: {
    type: 'orbital', name: 'Orbital', description: 'Rotation autour du sujet',
    category: 'orbital', speed: 'medium', smoothness: 8, complexity: 'complex',
    promptExample: 'orbital shot, circling around subject',
  },
  arc: {
    type: 'arc', name: 'Arc', description: 'Mouvement en arc',
    category: 'orbital', speed: 'medium', smoothness: 8, complexity: 'moderate',
    promptExample: 'arc movement, curved camera path',
  },
  spline: {
    type: 'spline', name: 'Spline Path', description: 'Trajectoire complexe',
    category: 'standard', speed: 'variable', smoothness: 9, complexity: 'complex',
    promptExample: 'spline path, complex camera trajectory',
  },
};

// ============================================================================
// BEAT & PACING CONFIGS
// ============================================================================

export const BEAT_CONFIGS: Record<BeatType, BeatConfig> = {
  opening: { type: 'opening', name: 'Opening', description: 'Ouvre une sequence', duration: '5-30s', purpose: 'Capturer attention' },
  setup: { type: 'setup', name: 'Setup', description: 'Etablit le contexte', duration: '30s-2min', purpose: 'Poser les bases' },
  confrontation: { type: 'confrontation', name: 'Confrontation', description: 'Apporte tension', duration: '30s-3min', emotionalTone: ['tense', 'anxious'], purpose: 'Creer tension' },
  climax: { type: 'climax', name: 'Climax', description: 'Point culminant', duration: '10s-2min', emotionalTone: ['tense', 'triumphant'], purpose: 'Maximiser impact' },
  resolution: { type: 'resolution', name: 'Resolution', description: 'Resout les tensions', duration: '15s-1min', emotionalTone: ['peaceful', 'happy'], purpose: 'Apaiser' },
  transition: { type: 'transition', name: 'Transition', description: 'Relie deux moments', duration: '5-20s', purpose: 'Assurer continuite' },
  emotional: { type: 'emotional', name: 'Emotional', description: 'Moment emotion pure', duration: '10s-1min', emotionalTone: ['sad', 'happy'], purpose: 'Creer connexion' },
  reversal: { type: 'reversal', name: 'Reversal', description: 'Changement de situation', duration: '5-30s', emotionalTone: ['surprise', 'tense'], purpose: 'Surprendre' },
  callback: { type: 'callback', name: 'Callback', description: 'Reference element anterieur', duration: '5-30s', emotionalTone: ['nostalgic'], purpose: 'Creer cohesion' },
  closing: { type: 'closing', name: 'Closing', description: 'Ferme la sequence', duration: '10-30s', purpose: 'Conclure' },
};

export const PACING_CONFIGS: Record<Pacing, PacingConfig> = {
  slow: { type: 'slow', name: 'Lent', description: 'Contemplatif', shotDuration: '10-30+ seconds', rhythm: 'Delibere', energy: 'low' },
  medium: { type: 'medium', name: 'Normal', description: 'Rythme standard', shotDuration: '3-10 seconds', rhythm: 'Naturel', energy: 'medium' },
  fast: { type: 'fast', name: 'Rapide', description: 'Action intense', shotDuration: '1-3 seconds', rhythm: 'Soutenu', energy: 'high' },
  variable: { type: 'variable', name: 'Variable', description: 'Melange de rythmes', shotDuration: 'varie', rhythm: 'Evolutif', energy: 'medium' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getCameraMovementConfig(type: CameraMovement): CameraMovementConfig {
  return CAMERA_MOVEMENT_PRESETS[type];
}

export function getBeatConfig(type: BeatType): BeatConfig {
  return BEAT_CONFIGS[type];
}

export function getPacingConfig(type: Pacing): PacingConfig {
  return PACING_CONFIGS[type];
}

export function calculateScreenTimePercentages(tracks: CharacterFocusTrack[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const track of tracks) {
    for (const entry of track.timeline) {
      const duration = entry.timeEnd - entry.timeStart;
      totals[entry.characterId] = (totals[entry.characterId] || 0) + duration;
    }
  }
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (total === 0) return {};
  const percentages: Record<string, number> = {};
  for (const [id, time] of Object.entries(totals)) {
    percentages[id] = Math.round((time / total) * 100);
  }
  return percentages;
}


