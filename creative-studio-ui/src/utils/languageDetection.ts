/**
 * Language Detection and Initialization Utilities
 * 
 * This module provides functions for detecting the system language,
 * initializing the language preference on first launch, and persisting
 * user language preferences to localStorage.
 * 
 * @module utils/languageDetection
 */

import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_STORAGE_KEY,
  StoredLanguagePreference
} from '../types/language';

/**
 * Detects the system language from the browser's navigator.language property.
 * 
 * Algorithm:
 * 1. Extract the primary language code from navigator.language (e.g., 'en-US' -> 'en')
 * 2. Check if the language code is in SUPPORTED_LANGUAGES
 * 3. Return the supported language code or fallback to 'en' if unsupported
 * 
 * @returns {string} The detected language code or 'en' as fallback
 * 
 * @example
 * // Browser language is 'es-ES'
 * const lang = detectSystemLanguage(); // Returns 'es'
 * 
 * @example
 * // Browser language is 'xx-XX' (unsupported)
 * const lang = detectSystemLanguage(); // Returns 'en'
 */
export function detectSystemLanguage(): string {
  // Force English as default language instead of auto-detecting browser language
  // This prevents the app from defaulting to French on French systems
  return 'en';
  
  // Original auto-detection code (disabled):
  // const browserLang = navigator.language || (navigator as any).userLanguage || 'en';
  // const primaryLang = browserLang.split('-')[0].toLowerCase();
  // const isSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === primaryLang);
  // return isSupported ? primaryLang : 'en';
}

/**
 * Initializes the language preference on application startup.
 * 
 * Algorithm:
 * 1. Check localStorage for an existing language preference
 * 2. If found and user-selected, return the saved language
 * 3. Otherwise, detect the system language
 * 4. Save the detected language (marked as not user-selected)
 * 5. Return the detected language
 * 
 * This function distinguishes between:
 * - User-selected languages (explicitly chosen by the user)
 * - System-detected languages (automatically detected on first launch)
 * 
 * @returns {string} The initialized language code
 * 
 * @example
 * // First launch, no saved preference
 * const lang = initializeLanguage(); // Detects system language and saves it
 * 
 * @example
 * // User has previously selected a language
 * const lang = initializeLanguage(); // Returns the user's saved preference
 */
export function initializeLanguage(): string {
  try {
    // 1. Check localStorage for existing preference
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    
    if (stored) {
      try {
        const parsed: StoredLanguagePreference = JSON.parse(stored);
        
        // 2. If user has explicitly selected a language, use it
        if (parsed.userLanguage) {
          return parsed.userLanguage;
        }
      } catch (parseError) {
        // Corrupted data - clear it and continue with detection
        console.warn('Corrupted language preference data, re-initializing:', parseError);
        localStorage.removeItem(LANGUAGE_STORAGE_KEY);
      }
    }
    
    // 3. No saved preference or not user-selected - detect system language
    const systemLang = detectSystemLanguage();
    
    // 4. Save detected language (marked as not user-selected)
    saveLanguagePreference(systemLang, false);
    
    // 5. Return the detected language
    return systemLang;
  } catch (error) {
    // localStorage unavailable - fall back to system detection without saving
    console.warn('localStorage unavailable, using in-memory language preference:', error);
    return detectSystemLanguage();
  }
}

/**
 * Alias for initializeLanguage - gets the initial language preference.
 * This function initializes or retrieves the language preference on application startup.
 * 
 * @returns {string} The initialized language code
 * 
 * @example
 * const lang = getInitialLanguagePreference(); // Returns the saved or detected language
 */
export function getInitialLanguagePreference(): string {
  return initializeLanguage();
}

/**
 * Saves the language preference to localStorage.
 * 
 * This function creates a StoredLanguagePreference object with:
 * - Schema version for future migration support
 * - User language (null if system-detected, language code if user-selected)
 * - Timestamp of when the preference was saved
 * 
 * @param {string} language - The language code to save
 * @param {boolean} userSelected - Whether the language was explicitly selected by the user
 * 
 * @example
 * // Save user-selected language
 * saveLanguagePreference('es', true);
 * 
 * @example
 * // Save system-detected language (not user-selected)
 * saveLanguagePreference('en', false);
 */
export function saveLanguagePreference(language: string, userSelected: boolean): void {
  try {
    // Create the preference object
    const preference: StoredLanguagePreference = {
      version: '1.0',
      userLanguage: userSelected ? language : null,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem(LANGUAGE_STORAGE_KEY, JSON.stringify(preference));
  } catch (error) {
    // localStorage unavailable or quota exceeded
    console.error('Failed to save language preference to localStorage:', error);
    // Continue execution - the app will work with in-memory state
  }
}

