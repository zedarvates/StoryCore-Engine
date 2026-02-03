/**
 * Menu State Manager
 * 
 * Manages menu bar state including open/close logic, item focus,
 * navigation, and state change subscriptions.
 * 
 * Requirements: 8.1-8.6
 */

import {
  MenuBarState,
  StateListener,
  DEFAULT_MENU_BAR_STATE,
} from '../../types/menuBarState';

/**
 * MenuStateManager class
 * 
 * Centralized state management for menu bar UI.
 * Provides methods for menu operations and state subscriptions.
 */
export class MenuStateManager {
  private state: MenuBarState;
  private listeners: Set<StateListener<MenuBarState>>;

  constructor(initialState?: Partial<MenuBarState>) {
    this.state = {
      ...DEFAULT_MENU_BAR_STATE,
      ...initialState,
      // Ensure activeModals is a Set
      activeModals: new Set(initialState?.activeModals || []),
    };
    this.listeners = new Set();
  }

  /**
   * Get current menu bar state
   * Returns a deep copy to prevent external mutations
   */
  getState(): MenuBarState {
    return {
      ...this.state,
      activeModals: new Set(this.state.activeModals),
      recentProjects: [...this.state.recentProjects],
    };
  }

  /**
   * Update menu bar state
   * Merges partial updates and notifies listeners
   */
  setState(updates: Partial<MenuBarState>): void {
    const previousState = this.getState();
    
    this.state = {
      ...this.state,
      ...updates,
      // Handle Set properly
      activeModals: updates.activeModals
        ? new Set(updates.activeModals)
        : this.state.activeModals,
      // Handle array properly
      recentProjects: updates.recentProjects
        ? [...updates.recentProjects]
        : this.state.recentProjects,
    };

    // Notify all listeners of state change
    this.notifyListeners();
  }

  /**
   * Open a menu by ID
   * Closes any currently open menu first
   */
  openMenu(menuId: string): void {
    this.setState({
      openMenu: menuId,
      focusedItemIndex: 0, // Focus first item when opening
    });
  }

  /**
   * Close the currently open menu
   * Resets focused item index
   */
  closeMenu(): void {
    this.setState({
      openMenu: null,
      focusedItemIndex: -1,
    });
  }

  /**
   * Toggle menu open/close state
   */
  toggleMenu(menuId: string): void {
    if (this.state.openMenu === menuId) {
      this.closeMenu();
    } else {
      this.openMenu(menuId);
    }
  }

  /**
   * Check if a specific menu is open
   */
  isMenuOpen(menuId: string): boolean {
    return this.state.openMenu === menuId;
  }

  /**
   * Focus a menu item by index
   * Clamps index to valid range
   */
  focusItem(index: number): void {
    this.setState({
      focusedItemIndex: Math.max(-1, index),
    });
  }

  /**
   * Navigate to next menu item
   * Wraps around to first item if at end
   */
  navigateNext(itemCount: number): void {
    if (itemCount === 0) return;

    const currentIndex = this.state.focusedItemIndex;
    const nextIndex = currentIndex >= itemCount - 1 ? 0 : currentIndex + 1;
    
    this.focusItem(nextIndex);
  }

  /**
   * Navigate to previous menu item
   * Wraps around to last item if at beginning
   */
  navigatePrevious(itemCount: number): void {
    if (itemCount === 0) return;

    const currentIndex = this.state.focusedItemIndex;
    const previousIndex = currentIndex <= 0 ? itemCount - 1 : currentIndex - 1;
    
    this.focusItem(previousIndex);
  }

  /**
   * Navigate menu items in specified direction
   */
  navigateItems(direction: 'next' | 'previous', itemCount: number): void {
    if (direction === 'next') {
      this.navigateNext(itemCount);
    } else {
      this.navigatePrevious(itemCount);
    }
  }

  /**
   * Navigate to first menu item
   */
  navigateFirst(): void {
    this.focusItem(0);
  }

  /**
   * Navigate to last menu item
   */
  navigateLast(itemCount: number): void {
    if (itemCount > 0) {
      this.focusItem(itemCount - 1);
    }
  }

  /**
   * Open a modal by ID
   */
  openModal(modalId: string): void {
    const activeModals = new Set(this.state.activeModals);
    activeModals.add(modalId);
    
    this.setState({
      activeModals,
    });
  }

  /**
   * Close a modal by ID
   */
  closeModal(modalId: string): void {
    const activeModals = new Set(this.state.activeModals);
    activeModals.delete(modalId);
    
    this.setState({
      activeModals,
    });
  }

  /**
   * Close all modals
   */
  closeAllModals(): void {
    this.setState({
      activeModals: new Set(),
    });
  }

  /**
   * Check if a modal is open
   */
  isModalOpen(modalId: string): boolean {
    return this.state.activeModals.has(modalId);
  }

  /**
   * Check if any modal is open
   */
  hasOpenModals(): boolean {
    return this.state.activeModals.size > 0;
  }

  /**
   * Add a recent project to the list
   * Maintains max 10 entries, removes oldest if exceeded
   */
  addRecentProject(project: {
    id: string;
    name: string;
    path: string;
    lastModified: Date;
    thumbnail?: string;
  }): void {
    const recentProjects = [...this.state.recentProjects];
    
    // Remove existing entry with same ID if present
    const existingIndex = recentProjects.findIndex(p => p.id === project.id);
    if (existingIndex !== -1) {
      recentProjects.splice(existingIndex, 1);
    }
    
    // Add new entry at the beginning
    recentProjects.unshift(project);
    
    // Keep only the 10 most recent
    if (recentProjects.length > 10) {
      recentProjects.splice(10);
    }
    
    this.setState({
      recentProjects,
    });
  }

  /**
   * Remove a recent project from the list
   */
  removeRecentProject(projectId: string): void {
    const recentProjects = this.state.recentProjects.filter(
      p => p.id !== projectId
    );
    
    this.setState({
      recentProjects,
    });
  }

  /**
   * Clear all recent projects
   */
  clearRecentProjects(): void {
    this.setState({
      recentProjects: [],
    });
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  subscribe(listener: StateListener<MenuBarState>): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const currentState = this.getState();
    
    this.listeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        console.error('Error in state listener:', error);
      }
    });
  }

  /**
   * Reset state to default values
   */
  reset(): void {
    this.state = {
      ...DEFAULT_MENU_BAR_STATE,
      activeModals: new Set(),
    };
    this.notifyListeners();
  }

  /**
   * Get number of active listeners
   * Useful for debugging and testing
   */
  getListenerCount(): number {
    return this.listeners.size;
  }
}

/**
 * Create a new MenuStateManager instance
 */
export function createMenuStateManager(
  initialState?: Partial<MenuBarState>
): MenuStateManager {
  return new MenuStateManager(initialState);
}
