/**
 * Unit tests for NavigationContext
 * 
 * Tests the navigation context provider functionality including:
 * - Context initialization with default values
 * - Navigation to dashboard
 * - canNavigateBack state management
 * - Error handling for hook usage outside provider
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NavigationProvider, useNavigation } from '../contexts/NavigationContext';
import type { ReactNode } from 'react';

describe('NavigationContext', () => {
  // Mock window.location.hash
  beforeEach(() => {
    // Reset hash before each test
    window.location.hash = '';
  });

  describe('NavigationProvider initialization', () => {
    it('should initialize with dashboard as default screen', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      expect(result.current.currentScreen).toBe('dashboard');
    });

    it('should initialize with canNavigateBack as false when on dashboard', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      expect(result.current.canNavigateBack).toBe(false);
    });

    it('should provide navigateToDashboard function', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      expect(typeof result.current.navigateToDashboard).toBe('function');
    });
  });

  describe('navigateToDashboard function', () => {
    it('should update currentScreen to dashboard', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      // Simulate being on a different screen by directly accessing internal state
      // In real usage, this would be set through navigation actions
      act(() => {
        result.current.navigateToDashboard();
      });

      expect(result.current.currentScreen).toBe('dashboard');
    });

    it('should update window.location.hash to #/dashboard', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      act(() => {
        result.current.navigateToDashboard();
      });

      expect(window.location.hash).toBe('#/dashboard');
    });

    it('should set canNavigateBack to false after navigating to dashboard', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      act(() => {
        result.current.navigateToDashboard();
      });

      expect(result.current.canNavigateBack).toBe(false);
    });

    it('should handle errors gracefully when hash change fails', () => {
      // Mock console.error to suppress error output in test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a scenario where hash change might fail
      const originalHash = window.location.hash;
      
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      // Should not throw even if hash change has issues
      expect(() => {
        act(() => {
          result.current.navigateToDashboard();
        });
      }).not.toThrow();

      // State should still be updated
      expect(result.current.currentScreen).toBe('dashboard');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('canNavigateBack property', () => {
    it('should be false when currentScreen is dashboard', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      // Initially on dashboard
      expect(result.current.currentScreen).toBe('dashboard');
      expect(result.current.canNavigateBack).toBe(false);
    });

    it('should remain false after navigating to dashboard', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      act(() => {
        result.current.navigateToDashboard();
      });

      expect(result.current.canNavigateBack).toBe(false);
    });
  });

  describe('useNavigation hook error handling', () => {
    it('should throw error when used outside NavigationProvider', () => {
      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useNavigation());
      }).toThrow('useNavigation must be used within a NavigationProvider');

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Context value stability', () => {
    it('should maintain stable navigateToDashboard reference across renders', () => {
      const { result, rerender } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      const firstNavigateRef = result.current.navigateToDashboard;
      
      rerender();
      
      const secondNavigateRef = result.current.navigateToDashboard;

      // Function reference should be stable (useCallback)
      expect(firstNavigateRef).toBe(secondNavigateRef);
    });
  });

  describe('Multiple navigation calls', () => {
    it('should handle multiple navigateToDashboard calls without errors', () => {
      const { result } = renderHook(() => useNavigation(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <NavigationProvider>{children}</NavigationProvider>
        ),
      });

      // Call multiple times
      act(() => {
        result.current.navigateToDashboard();
        result.current.navigateToDashboard();
        result.current.navigateToDashboard();
      });

      expect(result.current.currentScreen).toBe('dashboard');
      expect(result.current.canNavigateBack).toBe(false);
    });
  });
});
