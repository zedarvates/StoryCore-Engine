/**
 * Navigation Context Provider
 * 
 * This module provides a React Context for managing navigation state in the StoryCore application.
 * It provides functionality to:
 * - Track the current screen/view
 * - Navigate back to the Project Dashboard
 * - Determine if navigation back is available
 * - Preserve project context during navigation
 * 
 * @module contexts/NavigationContext
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

/**
 * Context value interface for navigation management
 */
export interface NavigationContextValue {
  /** Currently active screen identifier */
  currentScreen: string;
  
  /** Function to navigate back to the Project Dashboard */
  navigateToDashboard: () => void;
  
  /** Whether navigation back to dashboard is available (false when already on dashboard) */
  canNavigateBack: boolean;
}

/**
 * React Context for navigation management
 */
const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

/**
 * Props for the NavigationProvider component
 */
interface NavigationProviderProps {
  /** Child components that will have access to the navigation context */
  children: ReactNode;
}

/**
 * Navigation Provider Component
 * 
 * Provides navigation management functionality to all child components.
 * 
 * Features:
 * - Tracks current screen state (default: 'dashboard')
 * - Provides navigation function to return to dashboard
 * - Indicates whether back navigation is available
 * - Preserves project context during navigation via URL parameters or state
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <NavigationProvider>
 *       <YourApp />
 *     </NavigationProvider>
 *   );
 * }
 * ```
 */
export function NavigationProvider({ children }: NavigationProviderProps): React.ReactElement {
  // Initialize navigation state with dashboard as default
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');

  /**
   * Navigate to the Project Dashboard
   * 
   * This function:
   * 1. Updates the currentScreen state to 'dashboard'
   * 2. Triggers navigation via hash change for compatibility
   * 3. Preserves project context in URL parameters
   * 
   * The function uses hash-based navigation for simplicity and compatibility
   * with the existing application architecture. Project context is preserved
   * through the application's state management (useAppStore).
   * 
   * @example
   * ```tsx
   * const { navigateToDashboard } = useNavigation();
   * 
   * function handleBackClick() {
   *   navigateToDashboard();
   * }
   * ```
   */
  const navigateToDashboard = useCallback(() => {
    try {
      // Update state to dashboard
      setCurrentScreen('dashboard');
      
      // Trigger hash change for navigation
      // This preserves compatibility with existing navigation patterns
      // and allows for browser history integration
      window.location.hash = '#/dashboard';
      
      // Note: Project context is preserved through the application's
      // state management system (useAppStore), which persists across
      // navigation changes. No additional context preservation is needed
      // as the store maintains the project state independently of the view.
    } catch (error) {
      console.error('Failed to navigate to dashboard:', error);
      // Even if hash change fails, state is updated so UI will reflect the change
    }
  }, []);

  /**
   * Determine if navigation back to dashboard is available
   * 
   * Returns false when already on the dashboard, true otherwise.
   * This can be used to conditionally show/hide navigation controls.
   */
  const canNavigateBack = currentScreen !== 'dashboard';

  // Create the context value
  const contextValue: NavigationContextValue = {
    currentScreen,
    navigateToDashboard,
    canNavigateBack
  };

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * Hook to access the Navigation Context
 * 
 * This hook provides access to navigation management functionality.
 * Must be used within a NavigationProvider.
 * 
 * @returns Navigation context value with currentScreen, navigateToDashboard, and canNavigateBack
 * @throws Error if used outside of NavigationProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentScreen, navigateToDashboard, canNavigateBack } = useNavigation();
 *   
 *   return (
 *     <div>
 *       <p>Current screen: {currentScreen}</p>
 *       {canNavigateBack && (
 *         <button onClick={navigateToDashboard}>
 *           Back to Dashboard
 *         </button>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  
  return context;
}

/**
 * Export the context for advanced use cases
 */
export { NavigationContext };
