/* eslint-disable react-refresh/only-export-components */
// Barrel file: re-exports non-component i18n utilities.
// The eslint-disable above is intentional — this is a pure utility barrel with no React components.

export type { SupportedLanguage, LanguageInfo } from './i18nData';
export { LANGUAGES } from './i18nData';
export type { I18nContextType } from './i18nContext';
export { I18nContext } from './i18nContext';
export { TRANSLATIONS } from './i18nTranslations';

// Hooks exported separately to satisfy react-refresh in component files.
// Import useI18n and useTranslation from here or directly from './i18nHooks'.
export { useI18n, useTranslation } from './i18nHooks';
