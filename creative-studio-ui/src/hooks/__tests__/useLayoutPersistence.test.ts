import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLayoutPersistence } from '../useLayoutPersistence';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useLayoutPersistence', () => {
  const mockSetPanelSizes = vi.fn();
  const mockSetShowChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();

    (useAppStore as any).mockReturnValue({
      panelSizes: {
        assetLibrary: 20,
        canvas: 50,
        propertiesOrChat: 30,
      },
      setPanelSizes: mockSetPanelSizes,
      showChat: false,
      setShowChat: mockSetShowChat,
    });
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Loading Layout', () => {
    it('loads layout from localStorage on mount', () => {
      const savedLayout = {
        panelSizes: {
          assetLibrary: 25,
          canvas: 45,
          propertiesOrChat: 30,
        },
        showChat: true,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(savedLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).toHaveBeenCalledWith(savedLayout.panelSizes);
      expect(mockSetShowChat).toHaveBeenCalledWith(true);
    });

    it('does not load if no saved layout exists', () => {
      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).not.toHaveBeenCalled();
      expect(mockSetShowChat).not.toHaveBeenCalled();
    });

    it('handles invalid JSON gracefully', () => {
      localStorageMock.setItem('creative-studio-layout', 'invalid json');

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() => useLayoutPersistence());

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(localStorageMock.getItem('creative-studio-layout')).toBeNull();

      consoleErrorSpy.mockRestore();
    });

    it('validates panel sizes before loading', () => {
      const invalidLayout = {
        panelSizes: {
          assetLibrary: -10, // invalid
          canvas: 50,
          propertiesOrChat: 60,
        },
        showChat: false,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(invalidLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).not.toHaveBeenCalled();
    });

    it('rejects panel sizes with invalid total', () => {
      const invalidLayout = {
        panelSizes: {
          assetLibrary: 20,
          canvas: 50,
          propertiesOrChat: 40, // total = 110
        },
        showChat: false,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(invalidLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).not.toHaveBeenCalled();
    });

    it('rejects panel sizes with values out of range', () => {
      const invalidLayout = {
        panelSizes: {
          assetLibrary: 150, // > 100
          canvas: -20, // < 0
          propertiesOrChat: 30,
        },
        showChat: false,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(invalidLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).not.toHaveBeenCalled();
    });
  });

  describe('Saving Layout', () => {
    it('saves layout to localStorage when panel sizes change', () => {
      const { rerender } = renderHook(() => useLayoutPersistence());

      // Change panel sizes
      (useAppStore as any).mockReturnValue({
        panelSizes: {
          assetLibrary: 25,
          canvas: 45,
          propertiesOrChat: 30,
        },
        setPanelSizes: mockSetPanelSizes,
        showChat: false,
        setShowChat: mockSetShowChat,
      });

      rerender();

      const saved = localStorageMock.getItem('creative-studio-layout');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.panelSizes).toEqual({
        assetLibrary: 25,
        canvas: 45,
        propertiesOrChat: 30,
      });
    });

    it('saves layout to localStorage when chat visibility changes', () => {
      const { rerender } = renderHook(() => useLayoutPersistence());

      // Change chat visibility
      (useAppStore as any).mockReturnValue({
        panelSizes: {
          assetLibrary: 20,
          canvas: 50,
          propertiesOrChat: 30,
        },
        setPanelSizes: mockSetPanelSizes,
        showChat: true,
        setShowChat: mockSetShowChat,
      });

      rerender();

      const saved = localStorageMock.getItem('creative-studio-layout');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.showChat).toBe(true);
    });

    it('includes version in saved layout', () => {
      renderHook(() => useLayoutPersistence());

      const saved = localStorageMock.getItem('creative-studio-layout');
      expect(saved).toBeTruthy();

      const parsed = JSON.parse(saved!);
      expect(parsed.version).toBe('1.0');
    });

    it('handles localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock setItem to throw error
      vi.spyOn(localStorageMock, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });

      renderHook(() => useLayoutPersistence());

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearSavedLayout', () => {
    it('removes layout from localStorage', () => {
      localStorageMock.setItem('creative-studio-layout', JSON.stringify({ test: 'data' }));

      const { result } = renderHook(() => useLayoutPersistence());

      act(() => {
        result.current.clearSavedLayout();
      });

      expect(localStorageMock.getItem('creative-studio-layout')).toBeNull();
    });

    it('handles errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock removeItem to throw error
      vi.spyOn(localStorageMock, 'removeItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useLayoutPersistence());

      act(() => {
        result.current.clearSavedLayout();
      });

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('hasSavedLayout', () => {
    it('returns true when layout exists', () => {
      localStorageMock.setItem('creative-studio-layout', JSON.stringify({ test: 'data' }));

      const { result } = renderHook(() => useLayoutPersistence());

      expect(result.current.hasSavedLayout()).toBe(true);
    });

    it('returns false when layout does not exist', () => {
      const { result } = renderHook(() => useLayoutPersistence());

      expect(result.current.hasSavedLayout()).toBe(false);
    });

    it('handles errors gracefully', () => {
      // Mock getItem to throw error
      vi.spyOn(localStorageMock, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useLayoutPersistence());

      expect(result.current.hasSavedLayout()).toBe(false);
    });
  });

  describe('Validation', () => {
    it('accepts valid panel sizes', () => {
      const validLayout = {
        panelSizes: {
          assetLibrary: 20,
          canvas: 50,
          propertiesOrChat: 30,
        },
        showChat: false,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(validLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).toHaveBeenCalledWith(validLayout.panelSizes);
    });

    it('rejects panel sizes with missing properties', () => {
      const invalidLayout = {
        panelSizes: {
          assetLibrary: 20,
          canvas: 50,
          // missing propertiesOrChat
        },
        showChat: false,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(invalidLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).not.toHaveBeenCalled();
    });

    it('rejects panel sizes with non-number values', () => {
      const invalidLayout = {
        panelSizes: {
          assetLibrary: '20', // string instead of number
          canvas: 50,
          propertiesOrChat: 30,
        },
        showChat: false,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(invalidLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).not.toHaveBeenCalled();
    });

    it('allows small floating point errors in total', () => {
      const validLayout = {
        panelSizes: {
          assetLibrary: 20.1,
          canvas: 49.9,
          propertiesOrChat: 30.0, // total = 100.0
        },
        showChat: false,
        version: '1.0',
      };

      localStorageMock.setItem('creative-studio-layout', JSON.stringify(validLayout));

      renderHook(() => useLayoutPersistence());

      expect(mockSetPanelSizes).toHaveBeenCalledWith(validLayout.panelSizes);
    });
  });
});
