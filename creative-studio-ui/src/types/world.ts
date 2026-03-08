// ============================================================================
// World Data Types
// ============================================================================

export interface World {
  id: string;
  name: string;
  genre: string[];
  timePeriod: string;
  tone: string[];
  locations: Location[];
  rules: WorldRule[];
  atmosphere: string;
  culturalElements: CulturalElements;
  technology: string;
  magic: string;
  technologyMagic?: string; // Combined technology and magic field for hybrid settings
  conflicts: string[];
  keyObjects: WorldObject[]; // Key objects/resources that influence the story
  threats?: string[]; // Optional threats field
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  creation_timestamp?: string; // ISO string for legacy compatibility
  visualIntent?: {
    colors: string[];
    vibe: string;
    style: string;
    lighting?: string;
  };
}

/** Location type for interior/exterior classification */
export type WorldLocationType = 'interior' | 'exterior';

export interface Location {
  id: string;
  name: string;
  description: string;
  significance?: string;
  atmosphere?: string;
  // Extended properties for enhanced location support
  type?: string;
  /** Whether this location is interior (indoor) or exterior (outdoor) */
  location_type?: WorldLocationType;
  tile_image_path?: string;
  metadata?: {
    description?: string;
    atmosphere?: string;
    significance?: string;
    tile_image_path?: string;
    [key: string]: unknown;
  };
}

export interface WorldRule {
  id: string;
  category: 'physical' | 'social' | 'magical' | 'technological';
  rule: string;
  implications: string;
}

export interface CulturalElements {
  languages: string[];
  religions: string[];
  traditions: string[];
  historicalEvents: string[];
  culturalConflicts: string[];
}

export interface WorldObject {
  id: string;
  name: string;
  type: string;
  description: string;
  influence: string; // How it influences the story
  rules?: string; // Specific rules associated with the object
}

// ============================================================================
// Genre and Tone Options
// ============================================================================

export const GENRE_OPTIONS = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'sci-fi', label: 'Science Fiction' },
  { value: 'historical', label: 'Historical' },
  { value: 'contemporary', label: 'Contemporary' },
  { value: 'horror', label: 'Horror' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'romance', label: 'Romance' },
  { value: 'thriller', label: 'Thriller' },
  { value: 'western', label: 'Western' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'post-apocalyptic', label: 'Post-Apocalyptic' },
] as const;

export const TONE_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'gritty', label: 'Gritty' },
  { value: 'whimsical', label: 'Whimsical' },
  { value: 'serious', label: 'Serious' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'epic', label: 'Epic' },
  { value: 'intimate', label: 'Intimate' },
  { value: 'mysterious', label: 'Mysterious' },
  { value: 'hopeful', label: 'Hopeful' },
  { value: 'melancholic', label: 'Melancholic' },
  { value: 'adventurous', label: 'Adventurous' },
] as const;

export const PRODUCTION_MODE_OPTIONS = [
  { value: 'fiction', label: 'Fiction', description: 'Narrative storytelling with characters and arcs' },
  { value: 'documentary', label: 'Documentary', description: 'Factual representation and objective reality' },
  { value: 'interview', label: 'Interview', description: 'One-on-one or group conversation' },
  { value: 'music_video', label: 'Music Video', description: 'Visuals synchronized to music rhythm' },
  { value: 'social_media', label: 'Social Media', description: 'Short, high-impact content for web platforms' },
  { value: 'cinematic', label: 'Cinematic Pro', description: 'High-fidelity cinematic production with custom lens data' },
  { value: 'audiodrama', label: 'Audio Drama', description: 'Voice and sound-centric narrative production' },
  { value: 'recap', label: 'Recap', description: 'Compressed summary of story events or lore' },
  { value: 'influencer', label: 'Influencer', description: 'Direct face-to-camera engaging personal content' },
  { value: 'maker', label: 'Maker/DIY', description: 'Project showcases, tutorials and process builds' },
  { value: 'scientific_review', label: 'Scientific Review', description: 'Technical analysis based on data and research' },
  { value: 'historical_review', label: 'Historical Review', description: 'Educational deep-dives into archival records' },
  { value: 'top_tier_list', label: 'Top / Tier List', description: 'Ranked comparisons and community tier lists' },
  { value: 'faith_spirituality', label: 'Faith & Spirituality', description: 'Contemplative, meditative and reflective content' },
  { value: 'game_review', label: 'Game Review', description: 'Critical analysis of video games and mechanics' },
  { value: 'tech_review', label: 'Tech Review', description: 'Hardware, software and gadget evaluations' },
  { value: 'finance_review', label: 'Finance & Markets', description: 'Economic analysis and investment strategies' },
  { value: 'masterclass', label: 'Masterclass', description: 'Premium educational content with clear chapters and overlays' },
  { value: 'real_estate', label: 'Real Estate', description: 'Fluid property walkthroughs focusing on space and light' },
  { value: 'product_hype', label: 'Product Hype', description: 'Cinematic reveals with macro shots and dramatic lighting' },
  { value: 'legal_recon', label: 'Legal Recon', description: 'Factual, neutral reconstructions with timestamps' },
  { value: 'asmr', label: 'ASMR', description: 'Sensory experiences with high-fidelity audio triggers' },
  { value: 'meditation', label: 'Meditation', description: 'Peaceful guided sessions with atmospheric visuals' },
  { value: 'experimental', label: 'Experimental', description: 'Non-linear abstract journeys with visual effects' },
  { value: 'true_crime', label: 'True Crime', description: 'Investigative narratives with noir atmospheres' },
  { value: 'sports_highlight', label: 'Sports Highlight', description: 'High-energy action compilations with slow-motion impacts' },
  { value: 'gardening', label: 'Gardening', description: 'Professional botanical guides, showcases and tutorials' },
  { value: 'renovation', label: 'Renovation', description: 'Before and After transformation showcases with technical process steps' },
] as const;

export const RULE_CATEGORIES = [
  { value: 'physical', label: 'Physical Laws' },
  { value: 'social', label: 'Social Structures' },
  { value: 'magical', label: 'Magic System' },
  { value: 'technological', label: 'Technology' },
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function createEmptyWorld(): Partial<World> {
  return {
    name: '',
    genre: [],
    timePeriod: '',
    tone: [],
    locations: [],
    rules: [],
    atmosphere: '',
    culturalElements: {
      languages: [],
      religions: [],
      traditions: [],
      historicalEvents: [],
      culturalConflicts: [],
    },
    keyObjects: [],
    technology: '',
    magic: '',
    conflicts: [],
    visualIntent: {
      colors: [],
      vibe: '',
      style: '',
    },
  };
}

export function createEmptyLocation(): Location {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
    significance: '',
    atmosphere: '',
  };
}

export function createEmptyWorldRule(category: WorldRule['category'] = 'physical'): WorldRule {
  return {
    id: crypto.randomUUID(),
    category,
    rule: '',
    implications: '',
  };
}
