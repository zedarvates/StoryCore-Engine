import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// Internationalisation (i18n) Utilities
// Support multilingue avec détection automatique et RTL
// ============================================================================

export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'ja' | 'pt' | 'it' | 'ru' | 'zh';

export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

// ============================================================================
// i18n Context
// ============================================================================

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  isRtl: boolean;
  languages: LanguageInfo[];
}

const I18nContext = createContext<I18nContextType | null>(null);

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

// ============================================================================
// Simple Translation Dictionary (Fallback)
// ============================================================================

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  fr: {
    'common.next': 'Suivant',
    'common.previous': 'Précédent',
    'common.save': 'Sauvegarder',
    'common.cancel': 'Annuler',
    'common.close': 'Fermer',
    'common.generate': 'Générer',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'common.step': 'Étape',
    'common.of': 'sur',
    'common.required': 'Ce champ est obligatoire',
    'common.saveDraft': 'Brouillon sauvegardé',
  },
  en: {
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.generate': 'Generate',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.step': 'Step',
    'common.of': 'of',
    'common.required': 'This field is required',
    'common.saveDraft': 'Draft saved',
  },
  es: {
    'common.next': 'Siguiente',
    'common.previous': 'Anterior',
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.close': 'Cerrar',
    'common.generate': 'Generar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.step': 'Paso',
    'common.of': 'de',
    'common.required': 'Este campo es obligatorio',
    'common.saveDraft': 'Borrador guardado',
  },
  de: {
    'common.next': 'Weiter',
    'common.previous': 'Zurück',
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.close': 'Schließen',
    'common.generate': 'Generieren',
    'common.loading': 'Laden...',
    'common.error': 'Fehler',
    'common.success': 'Erfolg',
    'common.step': 'Schritt',
    'common.of': 'von',
    'common.required': 'Dieses Feld ist erforderlich',
    'common.saveDraft': 'Entwurf gespeichert',
  },
  ja: {
    'common.next': '次へ',
    'common.previous': '前へ',
    'common.save': '保存',
    'common.cancel': 'キャンセル',
    'common.close': '閉じる',
    'common.generate': '生成',
    'common.loading': '読み込み中...',
    'common.error': 'エラー',
    'common.success': '成功',
    'common.step': 'ステップ',
    'common.of': '/',
    'common.required': 'この項目は必須です',
    'common.saveDraft': '下書きを保存しました',
  },
  pt: {
    'common.next': 'Próximo',
    'common.previous': 'Anterior',
    'common.save': 'Salvar',
    'common.cancel': 'Cancelar',
    'common.close': 'Fechar',
    'common.generate': 'Gerar',
    'common.loading': 'Carregando...',
    'common.error': 'Erro',
    'common.success': 'Sucesso',
    'common.step': 'Passo',
    'common.of': 'de',
    'common.required': 'Este campo é obrigatório',
    'common.saveDraft': 'Rascunho salvo',
  },
  it: {
    'common.next': 'Avanti',
    'common.previous': 'Indietro',
    'common.save': 'Salva',
    'common.cancel': 'Annulla',
    'common.close': 'Chiudi',
    'common.generate': 'Genera',
    'common.loading': 'Caricamento...',
    'common.error': 'Errore',
    'common.success': 'Successo',
    'common.step': 'Passo',
    'common.of': 'di',
    'common.required': 'Questo campo è obbligatorio',
    'common.saveDraft': 'Bozza salvata',
  },
  ru: {
    'common.next': 'Далее',
    'common.previous': 'Назад',
    'common.save': 'Сохранить',
    'common.cancel': 'Отмена',
    'common.close': 'Закрыть',
    'common.generate': 'Создать',
    'common.loading': 'Загрузка...',
    'common.error': 'Ошибка',
    'common.success': 'Успех',
    'common.step': 'Шаг',
    'common.of': 'из',
    'common.required': 'Это поле обязательно',
    'common.saveDraft': 'Черновик сохранён',
  },
  zh: {
    'common.next': '下一步',
    'common.previous': '上一步',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.close': '关闭',
    'common.generate': '生成',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.step': '步骤',
    'common.of': '/',
    'common.required': '此字段为必填项',
    'common.saveDraft': '草稿已保存',
  },
};

// ============================================================================
// I18n Provider Component
// ============================================================================

interface I18nProviderProps {
  children: React.ReactNode;
  defaultLanguage?: SupportedLanguage;
  enableAutoDetect?: boolean;
  storageKey?: string;
}

export function I18nProvider({
  children,
  defaultLanguage = 'fr',
  enableAutoDetect = true,
  storageKey = 'storycore-language',
}: I18nProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(defaultLanguage);

  // Détection automatique de la langue du navigateur
  useEffect(() => {
    if (!enableAutoDetect) return;

    const savedLanguage = localStorage.getItem(storageKey);
    if (savedLanguage && LANGUAGES.some(l => l.code === savedLanguage)) {
      setLanguageState(savedLanguage as SupportedLanguage);
      return;
    }

    const browserLang = navigator.language.split('-')[0];
    const matchingLang = LANGUAGES.find(
      l => l.code === browserLang || browserLang.startsWith(l.code)
    );

    if (matchingLang) {
      setLanguageState(matchingLang.code);
    }
  }, [enableAutoDetect, storageKey]);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(storageKey, lang);

    // Mettre à jour l'attribut dir pour RTL
    const languageInfo = LANGUAGES.find(l => l.code === lang);
    document.documentElement.dir = languageInfo?.dir || 'ltr';
    document.documentElement.lang = lang;
  }, [storageKey]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const translations = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = translations[key] || key;

    // Remplacer les paramètres
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
      });
    }

    return text;
  }, [language]);

  const languageInfo = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
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

// ============================================================================
// Language Selector Component
// ============================================================================

import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons' | 'flags';
  showName?: boolean;
  className?: string;
}

export function LanguageSelector({
  variant = 'dropdown',
  showName = true,
  className,
}: LanguageSelectorProps) {
  const { language, setLanguage, languages, t, dir } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'buttons') {
    return (
      <div className={cn('flex flex-wrap gap-1', className)} role="group" aria-label={t('common.language')}>
        {languages.slice(0, 4).map(lang => (
          <Button
            key={lang.code}
            variant={language === lang.code ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setLanguage(lang.code)}
            className={cn(
              'gap-1',
              language === lang.code && 'ring-2 ring-primary'
            )}
            aria-pressed={language === lang.code}
          >
            <span>{lang.flag}</span>
            {showName && <span className="hidden sm:inline">{lang.nativeName}</span>}
          </Button>
        ))}
      </div>
    );
  }

  if (variant === 'flags') {
    return (
      <div className={cn('flex gap-2', className)} role="listbox" aria-label={t('common.language')}>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              'text-2xl transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded',
              language === lang.code && 'ring-2 ring-primary'
            )}
            role="option"
            aria-selected={language === lang.code}
            aria-label={`${lang.name} - ${lang.nativeName}`}
          >
            {lang.flag}
          </button>
        ))}
      </div>
    );
  }

  // Dropdown par défaut
  const currentLang = languages.find(l => l.code === language);

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn('gap-2 min-w-[160px]', dir === 'rtl' && 'flex-row-reverse')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t('common.language')}
      >
        <span>{currentLang?.flag}</span>
        <span>{showName ? currentLang?.nativeName : currentLang?.code.toUpperCase()}</span>
        <ChevronDown className={cn('h-4 w-4 ml-auto', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              'absolute z-50 mt-1 w-full min-w-[160px] bg-popover border rounded-md shadow-lg overflow-hidden',
              dir === 'rtl' ? 'left-0' : 'right-0'
            )}
            role="listbox"
            aria-label={t('common.language')}
          >
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none',
                  'flex items-center gap-2 transition-colors',
                  language === lang.code && 'bg-accent'
                )}
                role="option"
                aria-selected={language === lang.code}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="flex-1">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
                {language === lang.code && (
                  <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// RTL Utilities
// ============================================================================

/**
 * Obtenir la direction miroir pour les positions
 */
export function mirrorPosition(position: string): string {
  const mirrorMap: Record<string, string> = {
    left: 'right',
    right: 'left',
    'margin-left': 'margin-right',
    'margin-right': 'margin-left',
    'border-left': 'border-right',
    'border-right': 'border-left',
    'padding-left': 'padding-right',
    'padding-right': 'padding-left',
    'text-left': 'text-right',
    'text-right': 'text-left',
    'rounded-l': 'rounded-r',
    'rounded-r': 'rounded-l',
  };

  return mirrorMap[position] || position;
}

/**
 * Obtenir la valeur transformée pour RTL
 */
export function getRtlValue(value: string, isRtl: boolean): string {
  if (!isRtl) return value;

  // Extraire la valeur numérique et la position
  const match = value.match(/^(-?\d+\.?\d*)(px|em|rem|%|vh|vw)?$/);
  if (match) {
    // Les valeurs positives ne changent pas en RTL
    // Seules les valeurs négatives changent de signe
    const num = parseFloat(match[1]);
    if (num > 0) return value;
    return `${Math.abs(num)}${match[2] || 'px'}`;
  }

  return value;
}

// ============================================================================
// Date/Number Formatting
// ============================================================================

export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const { language } = useI18n();
  return new Intl.DateTimeFormat(language, options).format(date);
}

export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  const { language } = useI18n();
  return new Intl.NumberFormat(language, options).format(num);
}

export function formatRelativeTime(date: Date): string {
  const { language, t } = useI18n();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return t('time.justNow');
  if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
  if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
  if (diffDays < 7) return t('time.daysAgo', { count: diffDays });

  return formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================================
// Translation Hook with Namespace
// ============================================================================

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

export default I18nProvider;

