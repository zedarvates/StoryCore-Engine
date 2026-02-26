// ============================================================================
// Comic Generator Addon - TypeScript Types
// ============================================================================

export type ComicStyleType = 'franco-belge' | 'comics-us' | 'manga' | 'webtoon';

export type BubbleShapeType =
  | 'round'
  | 'spiky'
  | 'cloud'
  | 'flame'
  | 'rectangle'
  | 'glitch';

export type NarrativeBeatType =
  | 'setup'
  | 'tension'
  | 'revelation'
  | 'transition'
  | 'climax'
  | 'resolution';

export type MotionEffectType =
  | 'none'
  | 'parallax'
  | 'zoom'
  | 'rain'
  | 'light_flicker'
  | 'typewriter'
  | 'shake';

export type PanelSizeType = 'normal' | 'wide' | 'tall' | 'splash';

// ============================================================================
// Core Structures
// ============================================================================

export interface DialogueLine {
  character: string;
  text: string;
  bubble_shape: BubbleShapeType;
  bubble_color: string;
  text_effect?: string;
}

export interface ComicPanel {
  id: string;
  panel_index: number;
  characters: string[];   // Character names
  location: string;
  visual_cue: string;
  image_prompt: string;
  narrative_beat: NarrativeBeatType;
  panel_size: PanelSizeType;
  dialogue: DialogueLine[];
  generated_image_path?: string;
  motion_effects?: MotionEffectType[];
}

export interface ComicPage {
  id: string;
  chapter_id: string;
  page_number: number;
  narrative_summary: string;
  emotional_tone: string;
  arc_position: string;
  style: ComicStyleType;
  layout_template: string;
  panels: ComicPanel[];
  exported_image_path?: string;
  created_at?: string;
}

export interface ComicChapterSummary {
  chapter_id: string;
  pages: ComicPageSummary[];
}

export interface ComicPageSummary {
  id: string;
  page_number: number;
  narrative_summary: string;
  panels_count: number;
  style: ComicStyleType;
  arc_position: string;
}

// ============================================================================
// State
// ============================================================================

export interface ComicState {
  project_id: string;
  progression: number;
  total_pages: number;
  style: ComicStyleType;
  chapters: string[];
  last_page_generated?: string;
  narrative_summary?: string;
}

// ============================================================================
// API Request/Response
// ============================================================================

export interface GeneratePageRequest {
  project_id: string;
  story_context: string;
  characters?: Record<string, unknown>[];
  locations?: Record<string, unknown>[];
  objects?: Record<string, unknown>[];
  style?: ComicStyleType;
  generate_images?: boolean;
  panels_count?: number;
  narrative_direction?: string;
}

export interface GeneratePageResponse {
  success: boolean;
  page: ComicPage;
}

export interface ComicHistoryResponse {
  project_id: string;
  total_pages: number;
  chapters: ComicChapterSummary[];
}

export interface ExportResponse {
  success: boolean;
  format: string;
  output_path: string;
  pages_exported: number;
}

// ============================================================================
// UI State
// ============================================================================

export interface ComicGeneratorUIState {
  // Current project
  projectId: string | null;
  comicState: ComicState | null;

  // Generation
  isGenerating: boolean;
  generationError: string | null;

  // Current page view
  currentPage: ComicPage | null;
  selectedPanelIndex: number | null;

  // History
  history: ComicChapterSummary[];
  isLoadingHistory: boolean;

  // Settings
  selectedStyle: ComicStyleType;
  panelsCount: number;
  narrativeDirection: string;
  generateImages: boolean;

  // Export
  isExporting: boolean;
  lastExportPath: string | null;
}

// ============================================================================
// Visual Style Metadata
// ============================================================================

export const COMIC_STYLES: Record<ComicStyleType, {
  label: string;
  description: string;
  icon: string;
  panelRange: [number, number];
  layoutHint: string;
}> = {
  'franco-belge': {
    label: 'BD Franco-Belge',
    description: 'Cases carrées, lecture claire, dialogues centraux',
    icon: '🇫🇷',
    panelRange: [4, 6],
    layoutHint: 'Regular square panels, clear reading order, vibrant colors',
  },
  'comics-us': {
    label: 'Comics US',
    description: 'Cases dramatiques, diagonales, splash pages',
    icon: '🇺🇸',
    panelRange: [3, 5],
    layoutHint: 'Dynamic panels with diagonals, bold colors, action lines',
  },
  'manga': {
    label: 'Manga',
    description: 'Rythme variable, grandes cases émotionnelles, trames',
    icon: '🇯🇵',
    panelRange: [4, 6],
    layoutHint: 'Variable panel sizes, emotional large panels, screentone effects',
  },
  'webtoon': {
    label: 'Webtoon',
    description: 'Scroll vertical, respirations visuelles, format mobile',
    icon: '🇰🇷',
    panelRange: [4, 8],
    layoutHint: 'Vertical scroll, wide panels, breathing space, mobile-first',
  },
};

export const NARRATIVE_BEAT_LABELS: Record<NarrativeBeatType, string> = {
  setup: 'Setup',
  tension: 'Tension',
  revelation: 'Révélation',
  transition: 'Transition',
  climax: 'Climax',
  resolution: 'Résolution',
};

export const NARRATIVE_BEAT_COLORS: Record<NarrativeBeatType, string> = {
  setup: '#4A90E2',
  tension: '#E2744A',
  revelation: '#9B4AE2',
  transition: '#4AE2CC',
  climax: '#E24A4A',
  resolution: '#4AE27A',
};
