import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePanelVisibility } from '../usePanelVisibility';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('usePanelVisibility', () => {
  const mockSetShowChat = vi.fn();
  const mockSetPanelSizes = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      showChat: false,
      setShowChat: mockSetShowChat,
      panelSizes: {
        assetLibrary: 20,
        canvas: 50,
        propertiesOrChat: 30,
      },
      setPanelSizes: mockSetPanelSizes,
    });
  });

  describe('toggleChat', () => {
    it('toggles chat visibility', () => {
      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleChat();
      });

      expect(mockSetShowChat).toHaveBeenCalledWith(true);
    });

    it('adjusts panel sizes when showing chat', () => {
      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleChat();
      });

      expect(mockSetPanelSizes).toHaveBeenCalledWith({
        assetLibrary: 20,
        canvas: 40, // reduced from 50
        propertiesOrChat: 40, // increased from 30
      });
    });

    it('adjusts panel sizes when hiding chat', () => {
      (useAppStore as any).mockReturnValue({
        showChat: true,
        setShowChat: mockSetShowChat,
        panelSizes: {
          assetLibrary: 20,
          canvas: 40,
          propertiesOrChat: 40,
        },
        setPanelSizes: mockSetPanelSizes,
      });

      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleChat();
      });

      expect(mockSetPanelSizes).toHaveBeenCalledWith({
        assetLibrary: 20,
        canvas: 50, // increased from 40
        propertiesOrChat: 30, // reduced from 40
      });
    });

    it('respects minimum canvas size', () => {
      (useAppStore as any).mockReturnValue({
        showChat: false,
        setShowChat: mockSetShowChat,
        panelSizes: {
          assetLibrary: 20,
          canvas: 35, // close to minimum
          propertiesOrChat: 45,
        },
        setPanelSizes: mockSetPanelSizes,
      });

      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleChat();
      });

      const newSizes = mockSetPanelSizes.mock.calls[0][0];
      expect(newSizes.canvas).toBeGreaterThanOrEqual(30);
    });

    it('respects maximum propertiesOrChat size', () => {
      (useAppStore as any).mockReturnValue({
        showChat: false,
        setShowChat: mockSetShowChat,
        panelSizes: {
          assetLibrary: 20,
          canvas: 50,
          propertiesOrChat: 35, // close to maximum
        },
        setPanelSizes: mockSetPanelSizes,
      });

      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleChat();
      });

      const newSizes = mockSetPanelSizes.mock.calls[0][0];
      expect(newSizes.propertiesOrChat).toBeLessThanOrEqual(40);
    });
  });

  describe('toggleAssetLibrary', () => {
    it('shows asset library', () => {
      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleAssetLibrary(true);
      });

      expect(mockSetPanelSizes).toHaveBeenCalledWith({
        assetLibrary: 20,
        canvas: 40, // reduced from 50
        propertiesOrChat: 30,
      });
    });

    it('hides asset library', () => {
      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleAssetLibrary(false);
      });

      expect(mockSetPanelSizes).toHaveBeenCalledWith({
        assetLibrary: 0,
        canvas: 60, // increased from 50
        propertiesOrChat: 30,
      });
    });

    it('respects minimum canvas size when showing', () => {
      (useAppStore as any).mockReturnValue({
        showChat: false,
        setShowChat: mockSetShowChat,
        panelSizes: {
          assetLibrary: 0,
          canvas: 45, // close to minimum
          propertiesOrChat: 55,
        },
        setPanelSizes: mockSetPanelSizes,
      });

      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleAssetLibrary(true);
      });

      const newSizes = mockSetPanelSizes.mock.calls[0][0];
      expect(newSizes.canvas).toBeGreaterThanOrEqual(40);
    });

    it('respects maximum canvas size when hiding', () => {
      (useAppStore as any).mockReturnValue({
        showChat: false,
        setShowChat: mockSetShowChat,
        panelSizes: {
          assetLibrary: 20,
          canvas: 65, // close to maximum
          propertiesOrChat: 15,
        },
        setPanelSizes: mockSetPanelSizes,
      });

      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.toggleAssetLibrary(false);
      });

      const newSizes = mockSetPanelSizes.mock.calls[0][0];
      expect(newSizes.canvas).toBeLessThanOrEqual(70);
    });
  });

  describe('resetPanelSizes', () => {
    it('resets panel sizes to defaults', () => {
      (useAppStore as any).mockReturnValue({
        showChat: true,
        setShowChat: mockSetShowChat,
        panelSizes: {
          assetLibrary: 15,
          canvas: 45,
          propertiesOrChat: 40,
        },
        setPanelSizes: mockSetPanelSizes,
      });

      const { result } = renderHook(() => usePanelVisibility());

      act(() => {
        result.current.resetPanelSizes();
      });

      expect(mockSetPanelSizes).toHaveBeenCalledWith({
        assetLibrary: 20,
        canvas: 50,
        propertiesOrChat: 30,
      });
    });
  });

  describe('isAssetLibraryVisible', () => {
    it('returns true when asset library has size', () => {
      const { result } = renderHook(() => usePanelVisibility());

      expect(result.current.isAssetLibraryVisible).toBe(true);
    });

    it('returns false when asset library has zero size', () => {
      (useAppStore as any).mockReturnValue({
        showChat: false,
        setShowChat: mockSetShowChat,
        panelSizes: {
          assetLibrary: 0,
          canvas: 70,
          propertiesOrChat: 30,
        },
        setPanelSizes: mockSetPanelSizes,
      });

      const { result } = renderHook(() => usePanelVisibility());

      expect(result.current.isAssetLibraryVisible).toBe(false);
    });
  });

  describe('return values', () => {
    it('returns showChat from store', () => {
      const { result } = renderHook(() => usePanelVisibility());

      expect(result.current.showChat).toBe(false);
    });

    it('returns panelSizes from store', () => {
      const { result } = renderHook(() => usePanelVisibility());

      expect(result.current.panelSizes).toEqual({
        assetLibrary: 20,
        canvas: 50,
        propertiesOrChat: 30,
      });
    });
  });
});
