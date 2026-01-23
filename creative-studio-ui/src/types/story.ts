// ============================================================================
// Story Types for Storyteller Wizard
// ============================================================================

export interface StorySummary {
  id: string;
  title: string;
  genre: string[];
  tone: string[];
  targetAudience: string;
  videoType: 'court-métrage' | 'métrage' | 'série-episode' | 'web-série';
  duration: number; // minutes
  acts: StoryAct[];
  keyCharacters: string[];
  mainConflict: string;
  resolution: string;
  themes: string[];
  selectedVisualStyle: string; // Style choisi par l'utilisateur
  recommendedVisualStyle: string; // Style recommandé par l'IA
  pacing: string;
  musicSuggestions?: string[]; // Suggestions musicales
  moodPalette?: string[]; // Palette de couleurs d'ambiance
  cameraTechniques?: string[]; // Techniques de caméra suggérées
  createdAt: Date;
  basedOnPreviousEpisode?: string;
  worldContext: string;
}

export interface StoryAct {
  id: string;
  number: number;
  title: string;
  description: string;
  keyScenes: string[];
  characterDevelopment: string;
  duration: number; // minutes
}

export interface StoryContext {
  characters: any[]; // From project characters
  world: any; // From project world
  locations: any[]; // From project locations
  previousEpisodes: any[]; // Previous story summaries
  userPreferences: {
    preferredGenres: string[];
    preferredVideoType: string;
    preferredDuration: number;
    preferredTone: string[];
  };
}

export interface StorytellerWizardData {
  // Context analysis
  selectedCharacters: string[];
  selectedLocations: string[];
  previousEpisodeReference: string;

  // Story parameters
  videoType: 'court-métrage' | 'métrage' | 'série-episode' | 'web-série';
  targetDuration: number;
  genre: string[];
  tone: string[];
  targetAudience: string;
  visualStyle: string;

  // Generated content
  storySummary: string;
  mainConflict: string;
  resolution: string;
  themes: string[];
  acts: StoryAct[];
  recommendedVisualStyle: string; // Style visuel recommandé par l'IA
  pacing: string;
  musicSuggestions?: string[]; // Suggestions musicales
  moodPalette?: string[]; // Palette de couleurs d'ambiance
  cameraTechniques?: string[]; // Techniques de caméra suggérées

  // Validation
  isValidated: boolean;
}