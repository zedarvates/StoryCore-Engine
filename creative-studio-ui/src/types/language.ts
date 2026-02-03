/**
 * Language System Types and Constants
 * 
 * This module defines the core types and constants for the StoryCore language system,
 * including language configuration, user preferences, and storage formats.
 * 
 * @module types/language
 */

/**
 * Configuration for a supported language
 */
export interface LanguageConfig {
  /** ISO 639-1 language code (e.g., 'en', 'es', 'fr') */
  code: string;
  
  /** Display name in English (e.g., 'English', 'Spanish') */
  name: string;
  
  /** Display name in the native language (e.g., 'English', 'Español') */
  nativeName: string;
  
  /** Optional fallback language code if translations are incomplete */
  fallback?: string;
}

/**
 * User's language preference state
 */
export interface LanguagePreference {
  /** Language explicitly selected by the user (null if using system default) */
  userSelected: string | null;
  
  /** Language detected from the operating system */
  systemDetected: string;
  
  /** Currently active language code */
  current: string;
}

/**
 * Language preference data structure for localStorage persistence
 */
export interface StoredLanguagePreference {
  /** Schema version for future migration support */
  version: '1.0';
  
  /** User-selected language (null if using system default) */
  userLanguage: string | null;
  
  /** ISO 8601 timestamp of last update */
  lastUpdated: string;
}

/**
 * List of all supported languages in the StoryCore application
 * 
 * Each language includes:
 * - ISO 639-1 code for programmatic use
 * - English name for developer reference
 * - Native name for user-facing display
 */
export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { 
    code: 'en', 
    name: 'English', 
    nativeName: 'English' 
  },
  { 
    code: 'es', 
    name: 'Spanish', 
    nativeName: 'Español' 
  },
  { 
    code: 'fr', 
    name: 'French', 
    nativeName: 'Français' 
  },
  { 
    code: 'de', 
    name: 'German', 
    nativeName: 'Deutsch' 
  },
  { 
    code: 'ja', 
    name: 'Japanese', 
    nativeName: '日本語' 
  },
  { 
    code: 'zh', 
    name: 'Chinese', 
    nativeName: '中文' 
  }
];

/**
 * localStorage key for persisting language preferences
 */
export const LANGUAGE_STORAGE_KEY = 'storycore_language_preference';
