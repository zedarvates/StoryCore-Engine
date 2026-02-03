/**
 * Tests for SecretModeContext
 * Validates keyboard event handling and secret mode state management
 * 
 * Requirements: 1.1, 1.2, 1.4, 5.1, 5.2, 5.4
 */

import { renderHook, act } from '@testing-library/react';
import { SecretModeProvider, useSecretMode } from '../contexts/SecretModeContext';

// Helper to create wrapper with SecretModeProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) => (
    <SecretModeProvider>{children}</SecretModeProvider>
  );
};

describe('SecretModeContext', () => {
  describe('useSecretMode hook', () => {
    it('should throw error when used outside SecretModeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useSecretMode());
      }).toThrow('useSecretMode must be used within SecretModeProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide context value when used within SecretModeProvider', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.isSecretMode).toBe(false);
      expect(result.current.isOnExperimentalPage).toBe(false);
      expect(result.current.currentExperimentalFeature).toBeUndefined();
      expect(result.current.setCurrentExperimentalFeature).toBeDefined();
    });
  });

  describe('Keyboard Event Handling', () => {
    it('should activate secret mode when Ctrl+Shift+Alt are pressed', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isSecretMode).toBe(false);

      // Simulate Ctrl+Shift+Alt keydown
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Control',
          ctrlKey: true,
          shiftKey: true,
          altKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(true);
    });

    it('should deactivate secret mode when any key is released', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      // Activate secret mode
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Control',
          ctrlKey: true,
          shiftKey: true,
          altKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(true);

      // Release Ctrl key
      act(() => {
        const event = new KeyboardEvent('keyup', {
          key: 'Control',
          ctrlKey: false,
          shiftKey: true,
          altKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(false);
    });

    it('should deactivate secret mode on window blur', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      // Activate secret mode
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Control',
          ctrlKey: true,
          shiftKey: true,
          altKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(true);

      // Simulate window blur (user switches tabs)
      act(() => {
        const event = new Event('blur');
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(false);
    });

    it('should not activate secret mode with only two modifier keys', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      // Try Ctrl+Shift only
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Control',
          ctrlKey: true,
          shiftKey: true,
          altKey: false,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(false);

      // Try Ctrl+Alt only
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Control',
          ctrlKey: true,
          shiftKey: false,
          altKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(false);

      // Try Shift+Alt only
      act(() => {
        const event = new KeyboardEvent('keydown', {
          key: 'Shift',
          ctrlKey: false,
          shiftKey: true,
          altKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.isSecretMode).toBe(false);
    });
  });

  describe('Experimental Page Detection', () => {
    it('should detect when on experimental page', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isOnExperimentalPage).toBe(false);

      // Set current experimental feature to an enabled feature
      act(() => {
        result.current.setCurrentExperimentalFeature('advanced-grid-editor');
      });

      expect(result.current.isOnExperimentalPage).toBe(true);
      expect(result.current.currentExperimentalFeature).toBe('advanced-grid-editor');
    });

    it('should not detect experimental page for disabled features', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      // Set current experimental feature to a disabled feature
      act(() => {
        result.current.setCurrentExperimentalFeature('performance-profiler');
      });

      // Should be false because the feature is disabled in the registry
      expect(result.current.isOnExperimentalPage).toBe(false);
    });

    it('should clear experimental page state', () => {
      const { result } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      // Set experimental feature
      act(() => {
        result.current.setCurrentExperimentalFeature('advanced-grid-editor');
      });

      expect(result.current.isOnExperimentalPage).toBe(true);

      // Clear experimental feature
      act(() => {
        result.current.setCurrentExperimentalFeature(undefined);
      });

      expect(result.current.isOnExperimentalPage).toBe(false);
      expect(result.current.currentExperimentalFeature).toBeUndefined();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const { unmount } = renderHook(() => useSecretMode(), {
        wrapper: createWrapper(),
      });

      // Verify event listeners were added
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));

      // Unmount the component
      unmount();

      // Verify event listeners were removed
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });
});
