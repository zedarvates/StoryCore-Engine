import { createContext } from 'react';
import { SupportedLanguage, LanguageInfo } from './i18nData';

export interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  languages: LanguageInfo[];
}

export const I18nContext = createContext<I18nContextType | null>(null);
