/**
 * Chat Panel Storage Utility
 * Handles localStorage persistence for the floating AI Assistant window
 */

export interface ChatPanelState {
  position: { x: number; y: number };
  size: { width: number; height: number };
  isOpen: boolean;
  isMinimized: boolean;
}

const STORAGE_KEY = 'storycore-chat-panel-state';

// Default values for the chat panel
export const DEFAULT_CHAT_PANEL_STATE: ChatPanelState = {
  position: {
    x: typeof window !== 'undefined' ? window.innerWidth - 424 : 100,
    y: 100
  },
  size: { width: 384, height: 500 },
  isOpen: false,
  isMinimized: false,
};

/**
 * Save chat panel state to localStorage
 * @param state - The chat panel state to save
 */
export function saveChatPanelState(state: ChatPanelState): void {
  try {
    const stateToSave = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, stateToSave);
  } catch (error) {
    console.error('Failed to save chat panel state:', error);
    // Don't throw - gracefully degrade if localStorage is unavailable
  }
}

/**
 * Load chat panel state from localStorage
 * @returns The saved state or default values if none exists
 */
export function loadChatPanelState(): ChatPanelState {
  try {
    const savedState = localStorage.getItem(STORAGE_KEY);

    if (!savedState) {
      return DEFAULT_CHAT_PANEL_STATE;
    }

    const parsedState = JSON.parse(savedState) as ChatPanelState;

    // Validate the loaded state
    if (!isValidChatPanelState(parsedState)) {
      console.warn('Invalid chat panel state in localStorage, using defaults');
      return DEFAULT_CHAT_PANEL_STATE;
    }

    // Ensure position is within current viewport
    const constrainedState = constrainToViewport(parsedState);

    return constrainedState;
  } catch (error) {
    console.error('Failed to load chat panel state:', error);
    return DEFAULT_CHAT_PANEL_STATE;
  }
}

/**
 * Clear chat panel state from localStorage
 */
export function clearChatPanelState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear chat panel state:', error);
  }
}

/**
 * Validate that a loaded state has the correct structure
 * @param state - The state to validate
 * @returns true if valid, false otherwise
 */
function isValidChatPanelState(state: any): state is ChatPanelState {
  return (
    state &&
    typeof state === 'object' &&
    state.position &&
    typeof state.position.x === 'number' &&
    typeof state.position.y === 'number' &&
    state.size &&
    typeof state.size.width === 'number' &&
    typeof state.size.height === 'number' &&
    typeof state.isOpen === 'boolean' &&
    typeof state.isMinimized === 'boolean'
  );
}

/**
 * Constrain window position to viewport boundaries
 * @param state - The state to constrain
 * @returns State with position constrained to viewport
 */
function constrainToViewport(state: ChatPanelState): ChatPanelState {
  if (typeof window === 'undefined') {
    return state;
  }

  const { position, size } = state;
  const maxX = window.innerWidth - size.width;
  const maxY = window.innerHeight - size.height;

  return {
    ...state,
    position: {
      x: Math.max(0, Math.min(position.x, maxX)),
      y: Math.max(0, Math.min(position.y, maxY)),
    },
  };
}

/**
 * Update only the position in the saved state
 * @param position - The new position
 */
export function updateChatPanelPosition(position: { x: number; y: number }): void {
  const currentState = loadChatPanelState();
  saveChatPanelState({ ...currentState, position });
}

/**
 * Update only the size in the saved state
 * @param size - The new size
 */
export function updateChatPanelSize(size: { width: number; height: number }): void {
  const currentState = loadChatPanelState();
  saveChatPanelState({ ...currentState, size });
}

/**
 * Update only the open state in the saved state
 * @param isOpen - The new open state
 */
export function updateChatPanelOpenState(isOpen: boolean): void {
  const currentState = loadChatPanelState();
  saveChatPanelState({ ...currentState, isOpen });
}

/**
 * Update only the minimized state in the saved state
 * @param isMinimized - The new minimized state
 */
export function updateChatPanelMinimizedState(isMinimized: boolean): void {
  const currentState = loadChatPanelState();
  saveChatPanelState({ ...currentState, isMinimized });
}

