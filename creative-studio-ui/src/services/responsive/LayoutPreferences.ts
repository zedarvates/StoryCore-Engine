/**
 * LayoutPreferences Service
 * 
 * Manages persistence of layout preferences per screen size.
 * Saves and restores user preferences for different breakpoints.
 * 
 * Exigence: 12.8
 */

import type { ResponsiveBreakpoint } from '../../hooks/useResponsiveGrid';

export interface LayoutPreference {
  breakpointName: string;
  columns?: number;
  useListMode?: boolean;
  gridSize?: number;
  showGridLines?: boolean;
  snapEnabled?: boolean;
  customSettings?: Record<string, any>;
  lastUpdated: number;
}

export interface LayoutPreferencesState {
  preferences: Record<string, LayoutPreference>;
  version: string;
}

const STORAGE_KEY = 'storycore_layout_preferences';
const STORAGE_VERSION = '1.0';

/**
 * Layout Preferences Manager
 */
export class LayoutPreferencesManager {
  private preferences: Map<string, LayoutPreference> = new Map();
  private storageAvailable: boolean;

  constructor() {
    this.storageAvailable = this.checkStorageAvailable();
    this.loadPreferences();
  }

  /**
   * Check if localStorage is available
   */
  private checkStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Load preferences from localStorage
   * Exigence: 12.8
   */
  private loadPreferences(): void {
    if (!this.storageAvailable) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const state: LayoutPreferencesState = JSON.parse(stored);
      
      // Check version compatibility
      if (state.version !== STORAGE_VERSION) {
        console.warn('Layout preferences version mismatch, resetting preferences');
        this.clearPreferences();
        return;
      }

      // Load preferences into map
      Object.entries(state.preferences).forEach(([key, pref]) => {
        this.preferences.set(key, pref);
      });
    } catch (error) {
      console.error('Failed to load layout preferences:', error);
      this.clearPreferences();
    }
  }

  /**
   * Save preferences to localStorage
   * Exigence: 12.8
   */
  private savePreferences(): void {
    if (!this.storageAvailable) return;

    try {
      const state: LayoutPreferencesState = {
        version: STORAGE_VERSION,
        preferences: Object.fromEntries(this.preferences)
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save layout preferences:', error);
    }
  }

  /**
   * Get preference for a breakpoint
   * Exigence: 12.8
   */
  getPreference(breakpoint: ResponsiveBreakpoint): LayoutPreference | null {
    return this.preferences.get(breakpoint.name) || null;
  }

  /**
   * Set preference for a breakpoint
   * Exigence: 12.8
   */
  setPreference(breakpoint: ResponsiveBreakpoint, preference: Partial<LayoutPreference>): void {
    const existing = this.preferences.get(breakpoint.name);
    
    const updated: LayoutPreference = {
      breakpointName: breakpoint.name,
      ...existing,
      ...preference,
      lastUpdated: Date.now()
    };

    this.preferences.set(breakpoint.name, updated);
    this.savePreferences();
  }

  /**
   * Update specific preference field
   */
  updatePreference(
    breakpoint: ResponsiveBreakpoint,
    field: keyof LayoutPreference,
    value: any
  ): void {
    const existing = this.preferences.get(breakpoint.name) || {
      breakpointName: breakpoint.name,
      lastUpdated: Date.now()
    };

    const updated = {
      ...existing,
      [field]: value,
      lastUpdated: Date.now()
    };

    this.preferences.set(breakpoint.name, updated);
    this.savePreferences();
  }

  /**
   * Clear all preferences
   */
  clearPreferences(): void {
    this.preferences.clear();
    if (this.storageAvailable) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Clear preference for specific breakpoint
   */
  clearPreference(breakpoint: ResponsiveBreakpoint): void {
    this.preferences.delete(breakpoint.name);
    this.savePreferences();
  }

  /**
   * Get all preferences
   */
  getAllPreferences(): Map<string, LayoutPreference> {
    return new Map(this.preferences);
  }

  /**
   * Export preferences as JSON
   */
  exportPreferences(): string {
    const state: LayoutPreferencesState = {
      version: STORAGE_VERSION,
      preferences: Object.fromEntries(this.preferences)
    };
    return JSON.stringify(state, null, 2);
  }

  /**
   * Import preferences from JSON
   */
  importPreferences(json: string): boolean {
    try {
      const state: LayoutPreferencesState = JSON.parse(json);
      
      if (state.version !== STORAGE_VERSION) {
        console.error('Version mismatch in imported preferences');
        return false;
      }

      this.preferences.clear();
      Object.entries(state.preferences).forEach(([key, pref]) => {
        this.preferences.set(key, pref);
      });

      this.savePreferences();
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  }
}

// Singleton instance
let instance: LayoutPreferencesManager | null = null;

/**
 * Get singleton instance of LayoutPreferencesManager
 */
export const getLayoutPreferencesManager = (): LayoutPreferencesManager => {
  if (!instance) {
    instance = new LayoutPreferencesManager();
  }
  return instance;
};
