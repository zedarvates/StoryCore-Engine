/**
 * ARCHIVED - Old MenuBar Component
 * 
 * This file has been archived and replaced by the new comprehensive MenuBar
 * implementation located at: src/components/menuBar/MenuBar.tsx
 * 
 * The new implementation provides:
 * - Six main menus (File, Edit, View, Project, Tools, Help)
 * - Full keyboard shortcut support
 * - Accessibility compliance (WCAG AA)
 * - Internationalization support
 * - Modal management
 * - Notification system
 * - Error handling
 * 
 * To use the new MenuBar, import from:
 * import { MenuBar } from '@/components/menuBar';
 * 
 * @deprecated Use the new MenuBar from menuBar directory instead
 * @module components/MenuBar (ARCHIVED)
 */

import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { getViewMenuConfig, getSettingsMenuConfig, MenuItemConfig } from '../config/menuConfig';
import {
  LLMConfigModal,
  ComfyUIConfigModal,
  UserPreferencesModal
} from './modals';

/**
 * @deprecated Use the new MenuBar from menuBar directory instead
 */
export function MenuBarOld(): React.ReactElement {
  // Get language context for translations
  const { t } = useLanguage();
  
  // Get navigation context for dashboard navigation
  const { navigateToDashboard, canNavigateBack } = useNavigation();

  // Modal state management
  const [isLLMConfigOpen, setIsLLMConfigOpen] = useState(false);
  const [isComfyUIConfigOpen, setIsComfyUIConfigOpen] = useState(false);
  const [isUserPreferencesOpen, setIsUserPreferencesOpen] = useState(false);

  // Get menu configurations
  const viewMenuItems = getViewMenuConfig();
  const settingsMenuItems = getSettingsMenuConfig(
    () => setIsLLMConfigOpen(true),
    () => setIsComfyUIConfigOpen(true),
    () => setIsUserPreferencesOpen(true)
  );

  /**
   * Render a menu item button
   */
  const renderMenuItem = (item: MenuItemConfig) => (
    <button
      key={item.id}
      onClick={item.action}
      disabled={!item.enabled}
      className={`
        px-4 py-2 text-sm text-left w-full
        font-medium
        ${item.enabled
          ? 'text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer focus-visible:bg-accent focus-visible:text-accent-foreground'
          : 'text-gray-500 dark:text-gray-400 cursor-not-allowed'
        }
        transition-all duration-150 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      `}
      aria-label={t(item.label)}
    >
      {t(item.label)}
    </button>
  );

  return (
    <>
      <nav 
        className="bg-card border-b border-border shadow-sm"
        role="navigation"
        aria-label={t('menu.main')}
      >
        <div className="flex items-center h-12 px-4">
          {/* Dashboard Navigation Button */}
          {canNavigateBack && (
            <button
              onClick={navigateToDashboard}
              className="
                mr-4 px-3 py-1.5 text-sm font-medium
                text-primary hover:text-primary/90
                hover:bg-primary/10
                rounded-md
                transition-all duration-150 ease-in-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              "
              aria-label={t('menu.backToDashboard')}
            >
              {t('menu.backToDashboard')}
            </button>
          )}

          {/* View Menu */}
          {viewMenuItems.length > 0 && (
            <div className="relative group">
              <button
                className="
                  px-3 py-1.5 text-sm font-medium
                  text-foreground
                  hover:bg-accent hover:text-accent-foreground
                  rounded-md
                  transition-all duration-150 ease-in-out
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                "
                aria-haspopup="true"
                aria-expanded="false"
              >
                {t('menu.view')}
              </button>
              
              {/* View Menu Dropdown */}
              <div
                className="
                  absolute left-0 mt-1 w-48
                  bg-popover text-popover-foreground
                  border border-border
                  rounded-md shadow-lg
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  transition-all duration-150 ease-in-out
                  z-50
                "
                role="menu"
                aria-label={t('menu.view')}
              >
                {viewMenuItems.map(renderMenuItem)}
              </div>
            </div>
          )}

          {/* Settings Menu */}
          <div className="relative group ml-2">
            <button
              className="
                px-3 py-1.5 text-sm font-medium
                text-foreground
                hover:bg-accent hover:text-accent-foreground
                rounded-md
                transition-all duration-150 ease-in-out
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              "
              aria-haspopup="true"
              aria-expanded="false"
            >
              {t('menu.settings')}
            </button>
            
            {/* Settings Menu Dropdown */}
            <div
              className="
                absolute left-0 mt-1 w-64
                bg-popover text-popover-foreground
                border border-border
                rounded-md shadow-lg
                opacity-0 invisible group-hover:opacity-100 group-hover:visible
                transition-all duration-150 ease-in-out
                z-50
              "
              role="menu"
              aria-label={t('menu.settings')}
            >
              {settingsMenuItems.map(renderMenuItem)}
            </div>
          </div>
        </div>
      </nav>

      {/* Configuration Modals */}
      <LLMConfigModal
        isOpen={isLLMConfigOpen}
        onClose={() => setIsLLMConfigOpen(false)}
      />
      
      <ComfyUIConfigModal
        isOpen={isComfyUIConfigOpen}
        onClose={() => setIsComfyUIConfigOpen(false)}
      />
      
      <UserPreferencesModal
        isOpen={isUserPreferencesOpen}
        onClose={() => setIsUserPreferencesOpen(false)}
      />
    </>
  );
}

/**
 * @deprecated Use the new MenuBar from menuBar directory instead
 */
export default MenuBarOld;
