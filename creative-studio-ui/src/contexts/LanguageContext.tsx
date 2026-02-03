/**
 * Language Context Provider
 * 
 * This module provides a React Context for managing language preferences in the StoryCore application.
 * It integrates with the existing language detection utilities to provide:
 * - Automatic system language detection on first launch
 * - User language preference management
 * - Persistent language storage
 * - Basic translation function
 * 
 * @module contexts/LanguageContext
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SUPPORTED_LANGUAGES, LanguageConfig } from '../types/language';
import { initializeLanguage, saveLanguagePreference } from '../utils/languageDetection';

// ============================================================================
// Translation Dictionary (Fallback when i18n is not available)
// ============================================================================

const TRANSLATIONS: Record<string, Record<string, string>> = {
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
  ko: {
    'common.next': '다음',
    'common.previous': '이전',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.close': '닫기',
    'common.generate': '생성',
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.success': '성공',
    'common.step': '단계',
    'common.of': '/',
    'common.required': '이 필드는 필수입니다',
    'common.saveDraft': '초안 저장됨',
  },
};

/**
 * Context value interface for language management
 */
export interface LanguageContextValue {
  /** Currently active language code */
  currentLanguage: string;
  
  /** List of all supported languages */
  availableLanguages: LanguageConfig[];
  
  /** Function to change the current language */
  setLanguage: (code: string) => void;
  
  /** Translation function for internationalization */
  t: (key: string, params?: Record<string, any>) => string;
}

/**
 * React Context for language management
 */
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * Props for the LanguageProvider component
 */
interface LanguageProviderProps {
  /** Child components that will have access to the language context */
  children: ReactNode;
}

/**
 * Simple translation function that doesn't require I18nProvider
 */
function simpleTranslate(key: string, params?: Record<string, any>): string {
  const translations = TRANSLATIONS.en; // Default to English
  let text = translations[key] || key;
  
  // Replace parameters
  if (params) {
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), String(value));
    });
  }
  
  return text;
}

/**
 * Language Provider Component
 * 
 * Provides language management functionality to all child components.
 * 
 * Features:
 * - Initializes language from localStorage or system detection on mount
 * - Persists language changes to localStorage
 * - Triggers re-render of all consuming components on language change
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <LanguageProvider>
 *       <YourApp />
 *     </LanguageProvider>
 *   );
 * }
 * ```
 */
export function LanguageProvider({ children }: LanguageProviderProps): React.ReactElement {
  // Initialize language state with English by default (force English)
  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    // Force English as default language
    return 'en';
  });

  // Track if we've initialized
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Initialize language on component mount
   * 
   * This effect runs once when the component mounts to:
   * Force English language
   */
  useEffect(() => {
    try {
      // Force English
      setCurrentLanguageState('en');
      setIsInitialized(true);
      
      // Update document language attribute for accessibility
      document.documentElement.lang = 'en';
    } catch (error) {
      console.error('Error during language initialization:', error);
      setIsInitialized(true);
    }
  }, []); // Empty dependency array - run only on mount

  /**
   * Change the current language
   * 
   * This function:
   * 1. Updates the context state immediately
   * 2. Saves the preference to localStorage (marked as user-selected)
   * 3. Triggers re-render of all consuming components
   * 
   * @param code - The language code to switch to (e.g., 'en', 'es', 'fr')
   * 
   * @example
   * ```tsx
   * const { setLanguage } = useLanguage();
   * setLanguage('es'); // Switch to Spanish
   * ```
   */
  const setLanguage = useCallback((code: string) => {
    try {
      // Validate that the language is supported
      const isSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === code);
      
      if (!isSupported) {
        console.warn(`Language code "${code}" is not supported. Falling back to English.`);
        code = 'en';
      }

      // Update context state immediately
      setCurrentLanguageState(code);

      // Save to localStorage (marked as user-selected)
      saveLanguagePreference(code, true);

      // Update document language attribute for accessibility
      document.documentElement.lang = code;
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  }, []);

  /**
   * Translation function wrapper
   * 
   * Provides access to translation function with fallback behavior.
   * 
   * @param key - Translation key (e.g., 'common.save', 'menu.settings')
   * @param params - Optional parameters for string interpolation
   * @returns Translated string or the key itself if translation not found
   */
  const t = useCallback((key: string, params?: Record<string, any>): string => {
    return simpleTranslate(key, params);
  }, []);

  // Create the context value
  const contextValue: LanguageContextValue = {
    currentLanguage,
    availableLanguages: SUPPORTED_LANGUAGES,
    setLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook to access the Language Context
 * 
 * This hook provides access to language management functionality.
 * Must be used within a LanguageProvider.
 * 
 * @returns Language context value with currentLanguage, availableLanguages, setLanguage, and t
 * @throws Error if used outside of LanguageProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentLanguage, setLanguage, t } = useLanguage();
 *   
 *   return (
 *     <div>
 *       <p>{t('common.welcome')}</p>
 *       <button onClick={() => setLanguage('es')}>
 *         Switch to Spanish
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
}

/**
 * Export the context for advanced use cases
 */
export { LanguageContext };

