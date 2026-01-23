/**
 * Language Detection Utilities
 * 
 * Provides functions for detecting and validating browser language preferences.
 * Implements requirement 2.3 from the LLM Chatbox Enhancement spec.
 * 
 * @module languageDetection
 */

/**
 * Language codes supported by the chatbox
 * 
 * Represents the 9 languages supported by the LLM chatbox:
 * - fr: French (Français)
 * - en: English
 * - es: Spanish (Español)
 * - de: German (Deutsch)
 * - it: Italian (Italiano)
 * - pt: Portuguese (Português)
 * - ja: Japanese (日本語)
 * - zh: Chinese (中文)
 * - ko: Korean (한국어)
 */
export type LanguageCode = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ja' | 'zh' | 'ko';

/**
 * Detects the browser's language preference and maps it to a supported language code.
 * 
 * Uses `navigator.language` to detect the browser's language setting and maps it
 * to one of the supported language codes. Falls back to English if the browser
 * language is not supported.
 * 
 * @returns The detected language code or 'en' as fallback
 * 
 * @example
 * ```typescript
 * // Browser language is 'fr-FR'
 * const lang = detectBrowserLanguage(); // Returns 'fr'
 * 
 * // Browser language is 'en-US'
 * const lang = detectBrowserLanguage(); // Returns 'en'
 * 
 * // Browser language is 'sv-SE' (not supported)
 * const lang = detectBrowserLanguage(); // Returns 'en' (fallback)
 * ```
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language | Navigator.language}
 * 
 * Requirement 2.3: Detect browser language from navigator.language
 */
export function detectBrowserLanguage(): LanguageCode {
  // Get browser language (e.g., 'en-US', 'fr-FR', 'es', etc.)
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  
  // Extract the primary language code (e.g., 'en' from 'en-US')
  const primaryLang = browserLang.toLowerCase().split('-')[0];
  
  // Map browser language codes to supported languages
  const languageMap: Record<string, LanguageCode> = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    'ja': 'ja',
    'zh': 'zh',
    'ko': 'ko',
  };
  
  // Return mapped language or fallback to English
  return languageMap[primaryLang] || 'en';
}

/**
 * Checks if a language code is supported by the application.
 * 
 * Type guard function that validates whether a given string is a valid
 * LanguageCode. Useful for runtime validation of language preferences.
 * 
 * @param languageCode - The language code to check
 * @returns True if the language is supported, false otherwise
 * 
 * @example
 * ```typescript
 * if (isSupportedLanguage('fr')) {
 *   // TypeScript knows languageCode is LanguageCode here
 *   const prompt = buildSystemPrompt('fr');
 * }
 * 
 * if (!isSupportedLanguage('sv')) {
 *   // Swedish is not supported
 * }
 * ```
 */
export function isSupportedLanguage(languageCode: string): languageCode is LanguageCode {
  const supportedLanguages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
  return supportedLanguages.includes(languageCode as LanguageCode);
}

/**
 * Gets the initial language preference on first load.
 * 
 * Implements a two-tier preference system:
 * 1. First checks localStorage for previously saved preference
 * 2. Falls back to browser language detection if no preference exists
 * 
 * This ensures users see their preferred language immediately on subsequent
 * visits while providing intelligent defaults for first-time users.
 * 
 * @returns The initial language preference
 * 
 * @example
 * ```typescript
 * // First visit - no stored preference
 * const lang = getInitialLanguagePreference(); // Detects from browser
 * 
 * // Subsequent visits - stored preference exists
 * const lang = getInitialLanguagePreference(); // Returns stored preference
 * ```
 * 
 * @see {@link detectBrowserLanguage} for browser detection logic
 * 
 * Requirement 2.3: Set initial language preference on first load
 */
export function getInitialLanguagePreference(): LanguageCode {
  // Check if language preference exists in localStorage
  const storedLanguage = localStorage.getItem('storycore_language_preference');
  
  if (storedLanguage) {
    try {
      const parsed = JSON.parse(storedLanguage);
      if (parsed.code && isSupportedLanguage(parsed.code)) {
        return parsed.code;
      }
    } catch (error) {
      console.warn('Failed to parse stored language preference:', error);
    }
  }
  
  // No stored preference, detect from browser
  return detectBrowserLanguage();
}
