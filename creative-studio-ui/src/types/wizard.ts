// ============================================================================
// Wizard Shared Types
// Shared types for all wizard components
// ============================================================================

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de';

export interface WizardStep {
  title: string;
  description: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  requiredFields?: string[];
}

export interface WizardValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface DraftData<T> {
  data: T;
  timestamp: number;
  language: SupportedLanguage;
  stepIndex: number;
}

// ============================================================================
// Character Wizard Types
// ============================================================================

export interface CharacterTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  baseStats: {
    personality: string[];
    abilities: string[];
    backstory?: string;
  };
  voiceTraits?: {
    pitch: number;
    speed: number;
    recommendedVoices: string[];
  };
}

export interface CharacterData {
  name: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  personality: string[];
  appearance: string;
  backstory: string;
  voiceId: string;
  abilities: string[];
  worldRelation: string;
  templateId?: string;
}

// ============================================================================
// Story Wizard Types
// ============================================================================

export interface VisualStyleOption {
  value: string;
  label: string;
  description: string;
  examples: string[];
  previewColor: string;
  icon: string;
  moodWords: string[];
  recommendedFor: string[];
  languageVariations?: Record<SupportedLanguage, string>;
}

export interface StorytellerData {
  selectedCharacters: string[];
  selectedLocations: string[];
  previousEpisodeReference: string;
  videoType: string;
  targetDuration: number;
  genre: string[];
  tone: string[];
  targetAudience: string;
  visualStyle: string;
  storySummary: string;
  mainConflict: string;
  resolution: string;
  themes: string[];
  acts: Act[];
  recommendedVisualStyle: string;
  pacing: string;
  musicSuggestions: string[];
  moodPalette: string[];
  cameraTechniques: string[];
  isValidated: boolean;
}

export interface Act {
  id?: string;
  number: number;
  title: string;
  description: string;
  keyScenes: string[];
  characterDevelopment: string;
  duration: number;
}

// ============================================================================
// Wizard Translations
// ============================================================================

export interface WizardTranslations {
  common: {
    next: string;
    previous: string;
    save: string;
    cancel: string;
    close: string;
    generate: string;
    generating: string;
    preview: string;
    loading: string;
    error: string;
    success: string;
    step: string;
    of: string;
    validation: {
      required: string;
      invalid: string;
      minLength: string;
      maxLength: string;
    };
    draft: {
      saved: string;
      autoSave: string;
      restore: string;
      discard: string;
    };
  };
  character: {
    title: string;
    subtitle: string;
    steps: {
      template: { title: string; description: string };
      basic: { title: string; description: string };
      personality: { title: string; description: string };
      backstory: { title: string; description: string };
      abilities: { title: string; description: string };
      preview: { title: string; description: string };
    };
    fields: {
      name: string;
      gender: string;
      age: string;
      personality: string;
      appearance: string;
      backstory: string;
      voice: string;
      abilities: string;
      worldRelation: string;
    };
    gender: {
      male: string;
      female: string;
      other: string;
    };
    templates: {
      hero: string;
      mage: string;
      rogue: string;
      scholar: string;
      villain: string;
      mentor: string;
      sidekick: string;
      rebel: string;
      mystic: string;
    };
  };
  storyteller: {
    title: string;
    subtitle: string;
    steps: {
      analysis: { title: string; description: string };
      format: { title: string; description: string };
      creation: { title: string; description: string };
      structure: { title: string; description: string };
      validation: { title: string; description: string };
    };
    fields: {
      videoType: string;
      duration: string;
      genre: string;
      tone: string;
      targetAudience: string;
      visualStyle: string;
      previousEpisode: string;
    };
    videoTypes: {
      courtMetrage: string;
      metrage: string;
      serieEpisode: string;
      webSerie: string;
    };
    audience: {
      general: string;
      family: string;
      youngAdult: string;
      adult: string;
      mature: string;
    };
    visualStyles: {
      cinematographique: string;
      anime: string;
      documentaire: string;
      artistique: string;
      vintage: string;
      minimaliste: string;
    };
  };
  dialogue: {
    title: string;
    autoGenerate: string;
    manualAdd: string;
    generated: string;
    editing: string;
    fields: {
      character: string;
      text: string;
      voice: string;
      tone: string;
      pitch: string;
      speed: string;
      volume: string;
      position: string;
    };
    tones: {
      neutral: string;
      happy: string;
      sad: string;
      angry: string;
      excited: string;
      calm: string;
      surprised: string;
    };
  };
}

// ============================================================================
// Language Helpers
// ============================================================================

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  de: 'Deutsch'
};

export const LANGUAGE_FLAGS: Record<SupportedLanguage, string> = {
  fr: '🇫🇷',
  en: '🇺🇸',
  es: '🇪🇸',
  de: '🇩🇪'
};

