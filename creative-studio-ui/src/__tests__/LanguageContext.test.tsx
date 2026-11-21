/**
 * Tests for LanguageContext
 * Validates language initialization, preference management, and translation functionality
 * 
 * Requirements: 3.1, 3.2, 3.4, 3.5, 3.6
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../contexts/LanguageContext';
import { I18nProvider } from '../utils/i18n';
import * as languageDetection from '../utils/languageDetection';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Helper to create wrapper with both I18nProvider and LanguageProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nProvider>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('useLanguage hook', () => {
    it('should throw error when used outside LanguageProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useLanguage());
      }).toThrow('useLanguage must be used within a LanguageProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide context value when used within LanguageProvider', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.currentLanguage).toBeDefined();
      expect(result.current.availableLanguages).toBeDefined();
      expect(result.current.setLanguage).toBeDefined();
      expect(result.current.t).toBeDefined();
    });
  });

  describe('Language Initialization', () => {
    it('should initialize with detected language on first launch', () => {
      // Mock initializeLanguage to return 'en'
      vi.spyOn(languageDetection, 'initializeLanguage').mockReturnValue('en');

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.currentLanguage).toBe('en');
    });

    it('should fallback to English if initialization fails', () => {
      // Mock initializeLanguage to throw an error
      vi.spyOn(languageDetection, 'initializeLanguage').mockImplementation(() => {
        throw new Error('Initialization failed');
      });
      
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.currentLanguage).toBe('en');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Language Selection', () => {
    it('should change language when setLanguage is called', () => {
      const savePreferenceSpy = vi.spyOn(languageDetection, 'saveLanguagePreference');

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Change language to Spanish
      act(() => {
        result.current.setLanguage('es');
      });

      expect(result.current.currentLanguage).toBe('es');
      expect(savePreferenceSpy).toHaveBeenCalledWith('es', true);
    });

    it('should fallback to English for unsupported language codes', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const savePreferenceSpy = vi.spyOn(languageDetection, 'saveLanguagePreference');

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Try to set an unsupported language
      act(() => {
        result.current.setLanguage('xx');
      });

      expect(result.current.currentLanguage).toBe('en');
      expect(savePreferenceSpy).toHaveBeenCalledWith('en', true);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Language code "xx" is not supported')
      );

      consoleSpy.mockRestore();
    });

    it('should update document language attribute when language changes', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setLanguage('fr');
      });

      expect(document.documentElement.lang).toBe('fr');
    });

    it('should handle errors during language change gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const savePreferenceSpy = vi.spyOn(languageDetection, 'saveLanguagePreference')
        .mockImplementation(() => {
          throw new Error('Save failed');
        });

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Should not throw, but log error
      act(() => {
        result.current.setLanguage('de');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to change language:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      savePreferenceSpy.mockRestore();
    });
  });

  describe('Available Languages', () => {
    it('should provide list of all supported languages', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.availableLanguages).toBeDefined();
      expect(result.current.availableLanguages.length).toBeGreaterThan(0);
      
      // Check that English is in the list
      const englishLang = result.current.availableLanguages.find(lang => lang.code === 'en');
      expect(englishLang).toBeDefined();
      expect(englishLang?.name).toBe('English');
      expect(englishLang?.nativeName).toBe('English');
    });

    it('should include all expected languages', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      const languageCodes = result.current.availableLanguages.map(lang => lang.code);
      
      // Check for expected languages from SUPPORTED_LANGUAGES
      expect(languageCodes).toContain('en');
      expect(languageCodes).toContain('es');
      expect(languageCodes).toContain('fr');
      expect(languageCodes).toContain('de');
      expect(languageCodes).toContain('ja');
      expect(languageCodes).toContain('zh');
    });
  });

  describe('Translation Function', () => {
    it('should provide translation function', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.t).toBeDefined();
      expect(typeof result.current.t).toBe('function');
    });

    it('should return translation key if translation not found', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      const translation = result.current.t('nonexistent.key');
      
      // Should return the key itself as fallback
      expect(translation).toBe('nonexistent.key');
    });

    it('should handle translation errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Should not throw even with invalid parameters
      const translation = result.current.t('test.key', { invalid: undefined });
      
      expect(translation).toBeDefined();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Language Persistence', () => {
    it('should save language preference to localStorage', () => {
      const savePreferenceSpy = vi.spyOn(languageDetection, 'saveLanguagePreference');

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setLanguage('ja');
      });

      expect(savePreferenceSpy).toHaveBeenCalledWith('ja', true);
    });

    it('should mark language as user-selected when changed via setLanguage', () => {
      const savePreferenceSpy = vi.spyOn(languageDetection, 'saveLanguagePreference');

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setLanguage('zh');
      });

      // Second parameter should be true (user-selected)
      expect(savePreferenceSpy).toHaveBeenCalledWith('zh', true);
    });
  });

  describe('Multiple Language Changes', () => {
    it('should handle multiple language changes correctly', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Change to Spanish
      act(() => {
        result.current.setLanguage('es');
      });
      expect(result.current.currentLanguage).toBe('es');

      // Change to French
      act(() => {
        result.current.setLanguage('fr');
      });
      expect(result.current.currentLanguage).toBe('fr');

      // Change to German
      act(() => {
        result.current.setLanguage('de');
      });
      expect(result.current.currentLanguage).toBe('de');
    });

    it('should trigger re-render on each language change', () => {
      const { result, rerender } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      const initialLang = result.current.currentLanguage;

      act(() => {
        result.current.setLanguage('es');
      });

      rerender();

      expect(result.current.currentLanguage).not.toBe(initialLang);
      expect(result.current.currentLanguage).toBe('es');
    });
  });
});
