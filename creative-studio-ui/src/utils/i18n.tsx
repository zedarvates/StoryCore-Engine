import React, { useState, useCallback } from 'react';
import { SupportedLanguage, LANGUAGES } from './i18nData';
import { TRANSLATIONS } from './i18nTranslations';
import { I18nContext } from './i18nContext';
import type { LanguageInfo } from './i18nData';

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
  enableAutoDetect?: boolean;
  storageKey?: string;
}

export function I18nProvider({
  children,
  defaultLanguage = 'en',
  enableAutoDetect = false,
  storageKey = 'storycore-language',
}: I18nProviderProps) {
  // Lazy initializer handles all language detection without effects
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    // 1. Check localStorage first
    const savedLanguage = localStorage.getItem(storageKey);
    if (savedLanguage && LANGUAGES.some((l: LanguageInfo) => l.code === savedLanguage)) {
      return savedLanguage as SupportedLanguage;
    }

    // 2. Optional browser language auto-detection
    if (enableAutoDetect) {
      const browserLang = navigator.language.split('-')[0];
      const matchingLang = LANGUAGES.find(
        (l: LanguageInfo) => l.code === browserLang || browserLang.startsWith(l.code)
      );
      if (matchingLang) {
        return matchingLang.code;
      }
    }

    // 3. Fall back to default
    return defaultLanguage;
  });

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(storageKey, lang);
    const languageInfo = LANGUAGES.find((l: LanguageInfo) => l.code === lang);
    document.documentElement.dir = languageInfo?.dir || 'ltr';
    document.documentElement.lang = lang;
  }, [storageKey]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translations = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = translations[key] || key;
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      });
    }
    return text;
  }, [language]);

  const languageInfo = LANGUAGES.find((l: LanguageInfo) => l.code === language) || LANGUAGES[0];
  const dir = languageInfo?.dir || 'ltr';

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir,
        isRtl: dir === 'rtl',
        languages: LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export default I18nProvider;
