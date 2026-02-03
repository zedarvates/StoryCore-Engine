/**
 * User Preferences Modal
 * 
 * Provides a comprehensive preferences window for managing user-specific settings.
 * Currently supports language selection with plans for additional preferences.
 * 
 * Features:
 * - Language selection dropdown with all supported languages
 * - Immediate language application on save
 * - Cancel functionality to discard changes
 * - Native language names for better UX
 * 
 * @module components/modals/UserPreferencesModal
 */

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * User Preferences Modal Component
 * 
 * Displays a modal dialog for managing user preferences including language selection.
 * 
 * Implementation Details:
 * - Uses local state to track selected language before saving
 * - Only updates context and persists on Save button click
 * - Cancel button discards changes and closes modal
 * - Language dropdown displays format: "Native Name (English Name)"
 * 
 * @example
 * ```tsx
 * function SettingsMenu() {
 *   const [isOpen, setIsOpen] = useState(false);
 *   
 *   return (
 *     <>
 *       <button onClick={() => setIsOpen(true)}>User Preferences</button>
 *       <UserPreferencesModal 
 *         isOpen={isOpen} 
 *         onClose={() => setIsOpen(false)} 
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function UserPreferencesModal({ isOpen, onClose }: UserPreferencesModalProps) {
  const { currentLanguage, availableLanguages, setLanguage, t } = useLanguage();
  
  // Local state for selected language (not applied until Save is clicked)
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

  /**
   * Sync local state with context when modal opens or current language changes
   * This ensures the dropdown shows the correct current language when reopened
   */
  useEffect(() => {
    if (isOpen) {
      setSelectedLanguage(currentLanguage);
    }
  }, [isOpen, currentLanguage]);

  /**
   * Handle Save button click
   * 
   * Applies the selected language to the context (which triggers immediate UI update
   * and persists to localStorage), then closes the modal.
   */
  const handleSave = () => {
    if (selectedLanguage !== currentLanguage) {
      setLanguage(selectedLanguage);
    }
    onClose();
  };

  /**
   * Handle Cancel button click
   * 
   * Discards any changes by resetting local state to current language,
   * then closes the modal without saving.
   */
  const handleCancel = () => {
    setSelectedLanguage(currentLanguage);
    onClose();
  };

  /**
   * Handle language dropdown change
   * 
   * Updates local state only - does not apply the language until Save is clicked.
   */
  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedLanguage(event.target.value);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCancel}
      title={t('preferences.title') || 'User Preferences'}
      size="md"
    >
      <div className="space-y-6">
        {/* Language Selection Section */}
        <div className="space-y-3">
          <label 
            htmlFor="language-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t('preferences.language') || 'Language'}
          </label>
          
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={handleLanguageChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            aria-label={t('preferences.selectLanguage') || 'Select language'}
          >
            {availableLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName} ({lang.name})
              </option>
            ))}
          </select>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('preferences.languageDescription') || 'Select your preferred language for the interface'}
          </p>
        </div>

        {/* Future preference sections can be added here */}
        {/* Example:
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme
          </label>
          <select className="w-full px-3 py-2 border rounded-md">
            <option>Light</option>
            <option>Dark</option>
            <option>Auto</option>
          </select>
        </div>
        */}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="px-4 py-2"
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          
          <Button
            variant="default"
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('common.save') || 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
