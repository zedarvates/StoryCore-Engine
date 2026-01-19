import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectBrowserLanguage, isSupportedLanguage, getInitialLanguagePreference } from '../languageDetection';
import type { LanguageCode } from '../languageDetection';

describe('languageDetection', () => {
  // Store original navigator.language
  const originalNavigator = global.navigator;
  
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });
  
  afterEach(() => {
    // Restore original navigator
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  describe('detectBrowserLanguage', () => {
    it('should detect French from navigator.language', () => {
      // Mock navigator.language
      Object.defineProperty(global, 'navigator', {
        value: { language: 'fr-FR' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('fr');
    });

    it('should detect English from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en-US' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('en');
    });

    it('should detect Spanish from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'es-ES' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('es');
    });

    it('should detect German from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'de-DE' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('de');
    });

    it('should detect Italian from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'it-IT' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('it');
    });

    it('should detect Portuguese from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'pt-BR' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('pt');
    });

    it('should detect Japanese from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'ja-JP' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('ja');
    });

    it('should detect Chinese from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'zh-CN' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('zh');
    });

    it('should detect Korean from navigator.language', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'ko-KR' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('ko');
    });

    it('should handle language codes without region (e.g., "en" instead of "en-US")', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'fr' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('fr');
    });

    it('should fallback to English for unsupported languages', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'ru-RU' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('en');
    });

    it('should fallback to English when navigator.language is not available', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('en');
    });

    it('should handle case-insensitive language codes', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'FR-FR' },
        writable: true,
        configurable: true,
      });
      
      const result = detectBrowserLanguage();
      expect(result).toBe('fr');
    });
  });

  describe('isSupportedLanguage', () => {
    it('should return true for supported languages', () => {
      const supportedLanguages: LanguageCode[] = ['fr', 'en', 'es', 'de', 'it', 'pt', 'ja', 'zh', 'ko'];
      
      supportedLanguages.forEach(lang => {
        expect(isSupportedLanguage(lang)).toBe(true);
      });
    });

    it('should return false for unsupported languages', () => {
      expect(isSupportedLanguage('ru')).toBe(false);
      expect(isSupportedLanguage('ar')).toBe(false);
      expect(isSupportedLanguage('hi')).toBe(false);
      expect(isSupportedLanguage('invalid')).toBe(false);
    });
  });

  describe('getInitialLanguagePreference', () => {
    it('should return stored language preference if available', () => {
      // Store a language preference
      const storedPreference = {
        code: 'es',
        setAt: new Date().toISOString(),
        autoDetected: false,
      };
      localStorage.setItem('storycore_language_preference', JSON.stringify(storedPreference));
      
      const result = getInitialLanguagePreference();
      expect(result).toBe('es');
    });

    it('should detect browser language when no stored preference exists', () => {
      Object.defineProperty(global, 'navigator', {
        value: { language: 'de-DE' },
        writable: true,
        configurable: true,
      });
      
      const result = getInitialLanguagePreference();
      expect(result).toBe('de');
    });

    it('should fallback to browser detection if stored preference is invalid', () => {
      // Store invalid preference
      localStorage.setItem('storycore_language_preference', 'invalid-json');
      
      Object.defineProperty(global, 'navigator', {
        value: { language: 'fr-FR' },
        writable: true,
        configurable: true,
      });
      
      const result = getInitialLanguagePreference();
      expect(result).toBe('fr');
    });

    it('should fallback to browser detection if stored language is unsupported', () => {
      // Store unsupported language
      const storedPreference = {
        code: 'ru',
        setAt: new Date().toISOString(),
        autoDetected: false,
      };
      localStorage.setItem('storycore_language_preference', JSON.stringify(storedPreference));
      
      Object.defineProperty(global, 'navigator', {
        value: { language: 'en-US' },
        writable: true,
        configurable: true,
      });
      
      const result = getInitialLanguagePreference();
      expect(result).toBe('en');
    });

    it('should handle missing code in stored preference', () => {
      // Store preference without code
      const storedPreference = {
        setAt: new Date().toISOString(),
        autoDetected: false,
      };
      localStorage.setItem('storycore_language_preference', JSON.stringify(storedPreference));
      
      Object.defineProperty(global, 'navigator', {
        value: { language: 'ja-JP' },
        writable: true,
        configurable: true,
      });
      
      const result = getInitialLanguagePreference();
      expect(result).toBe('ja');
    });
  });
});
