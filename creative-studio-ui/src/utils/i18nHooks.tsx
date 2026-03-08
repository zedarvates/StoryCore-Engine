import { useContext, useCallback } from 'react';
import type { I18nContextType } from './i18nContext';
import { I18nContext } from './i18nContext';

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function useTranslation(namespace: string = 'common') {
  const { t, language } = useI18n();

  const translate = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const fullKey = `${namespace}.${key}`;
      return t(fullKey, params);
    },
    [t, namespace]
  );

  return { t: translate, language };
}
