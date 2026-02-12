import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import type { PanelSizes } from '@/types';

const LAYOUT_STORAGE_KEY = 'creative-studio-layout';

interface LayoutState {
  panelSizes: PanelSizes;
  showChat: boolean;
  version: string; // for future migrations
}

/**
 * Hook for persisting and restoring layout state to/from localStorage
 */
export function useLayoutPersistence() {
  const { panelSizes, setPanelSizes, showChat, setShowChat } = useAppStore();

  /**
   * Load layout from localStorage on mount
   */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAYOUT_STORAGE_KEY);
      if (stored) {
        const layoutState: LayoutState = JSON.parse(stored);

        // Validate and restore panel sizes
        if (layoutState.panelSizes && isValidPanelSizes(layoutState.panelSizes)) {
          setPanelSizes(layoutState.panelSizes);
        }

        // Restore chat visibility
        if (typeof layoutState.showChat === 'boolean') {
          setShowChat(layoutState.showChat);
        }
      }
    } catch (error) {
      console.error('Failed to load layout from localStorage:', error);
      // Clear invalid data
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
    }
  }, []); // Only run on mount

  /**
   * Save layout to localStorage whenever it changes
   */
  useEffect(() => {
    try {
      const layoutState: LayoutState = {
        panelSizes,
        showChat,
        version: '1.0',
      };

      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layoutState));
    } catch (error) {
      console.error('Failed to save layout to localStorage:', error);
    }
  }, [panelSizes, showChat]);

  /**
   * Clear saved layout
   */
  const clearSavedLayout = () => {
    try {
      localStorage.removeItem(LAYOUT_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear layout from localStorage:', error);
    }
  };

  /**
   * Check if saved layout exists
   */
  const hasSavedLayout = (): boolean => {
    try {
      return localStorage.getItem(LAYOUT_STORAGE_KEY) !== null;
    } catch (error) {
      return false;
    }
  };

  return {
    clearSavedLayout,
    hasSavedLayout,
  };
}

/**
 * Validate panel sizes object
 */
function isValidPanelSizes(sizes: unknown): sizes is PanelSizes {
  if (!sizes || typeof sizes !== 'object') return false;

  const { assetLibrary, canvas, propertiesOrChat } = sizes;

  // Check if all properties exist and are numbers
  if (
    typeof assetLibrary !== 'number' ||
    typeof canvas !== 'number' ||
    typeof propertiesOrChat !== 'number'
  ) {
    return false;
  }

  // Check if values are within reasonable ranges
  if (
    assetLibrary < 0 ||
    assetLibrary > 100 ||
    canvas < 0 ||
    canvas > 100 ||
    propertiesOrChat < 0 ||
    propertiesOrChat > 100
  ) {
    return false;
  }

  // Check if total is approximately 100 (allow small floating point errors)
  const total = assetLibrary + canvas + propertiesOrChat;
  if (Math.abs(total - 100) > 1) {
    return false;
  }

  return true;
}

