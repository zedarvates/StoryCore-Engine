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
  conflicts: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  significance: string;
  atmosphere: string;
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
    technology: '',
    magic: '',
    conflicts: [],
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
