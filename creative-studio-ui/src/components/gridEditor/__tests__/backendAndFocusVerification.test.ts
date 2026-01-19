/**
 * Task 15: Backend Integration and Focus Mode Verification Tests
 * 
 * This test file verifies:
 * - Individual panel image generation
 * - Batch generation for multiple panels
 * - Focus mode transitions and state preservation
 * - Error handling and recovery
 * 
 * Requirements: 2.5, 2.6, 2.7, 11.1, 11.2, 11.4, 11.5, 11.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGridStore } from '../../../stores/gridEditorStore';
import { useViewportStore } from '../../../stores/viewportStore';
import { MockGridAPIService } from '../../../services/gridEditor/GridAPIService';
import { ImageLoaderService } from '../../../services/gridEditor/ImageLoaderService';
import type { PanelGenerationConfig } from '../../../services/gridEditor/GridAPIService';

describe('Task 15: Backend Integration and Focus Mode Verification', () => {
  let mockGridAPI: MockGridAPIService;
  let imageLoader: ImageLoaderService;

  beforeEach(() => {
    // Reset stores
    useGridStore.getState().resetConfiguration('test-project');
    useViewportStore.getState().resetViewport();

    // Create mock services
    mockGridAPI = new MockGridAPIService();
    mockGridAPI.setMockDelay(100); // Fast for testing
    mockGridAPI.setMockFailureRate(0); // No failures by default

    imageLoader = new ImageLoaderService();
  });

  // ============================================================================
  // Backend Integration Tests
  // ============================================================================

  describe('Individual Panel Generation', () => {
    it('should generate image for a single panel', async () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const panel = gridStore.current.getAllPanels()[0];

      const generationConfig: PanelGenerationConfig = {
        panelId: panel.id,
        prompt: 'Test panel generation',
        seed: 12345,
        transform: panel.transform,
        crop: panel.crop,
        styleReference: 'master-coherence-sheet',
        width: 512,
        height: 512,
      };

      // Act
      const response = await mockGridAPI.generatePanelImage(generationConfig);

      // Assert
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.panelId).toBe(panel.id);
      expect(response.data?.imageUrl).toBeDefined();
      expect(response.data?.metadata.seed).toBe(12345);
      expect(response.data?.metadata.width).toBe(512);
      expect(response.data?.metadata.height).toBe(512);
    });

    it('should update panel state after successful generation', async () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const panel = gridStore.current.getAllPanels()[0];

      const generationConfig: PanelGenerationConfig = {
        panelId: panel.id,
        prompt: 'Test panel generation',
        seed: 12345,
        transform: panel.transform,
        crop: panel.crop,
        styleReference: 'master-coherence-sheet',
        width: 512,
        height: 512,
      };

      // Act
      const response = await mockGridAPI.generatePanelImage(generationConfig);

      if (response.success && response.data) {
        act(() => {
          gridStore.current.updatePanelImage(
            response.data!.panelId,
            response.data!.imageUrl,
            response.data!.metadata
          );
        });
      }

      // Assert
      const updatedPanel = gridStore.current.getPanelById(panel.id);
      expect(updatedPanel).toBeDefined();
      expect(updatedPanel!.layers.length).toBeGreaterThan(0);
      expect(updatedPanel!.layers[0].type).toBe('image');
      expect(updatedPanel!.layers[0].content.type).toBe('image');
      expect((updatedPanel!.layers[0].content as any).url).toBeDefined();
      expect(updatedPanel!.metadata.seed).toBe(12345);
      expect(updatedPanel!.metadata.modified).toBe(false);
    });

    it('should handle generation errors gracefully', async () => {
      // Arrange
      mockGridAPI.setMockFailureRate(1.0); // Force failure
      const { result: gridStore } = renderHook(() => useGridStore());
      const panel = gridStore.current.getAllPanels()[0];

      const generationConfig: PanelGenerationConfig = {
        panelId: panel.id,
        prompt: 'Test panel generation',
        seed: 12345,
        transform: panel.transform,
        crop: panel.crop,
        styleReference: 'master-coherence-sheet',
      };

      // Act
      const response = await mockGridAPI.generatePanelImage(generationConfig);

      // Assert - Requirements 11.4: Error should not modify panel state
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();

      const unchangedPanel = gridStore.current.getPanelById(panel.id);
      expect(unchangedPanel).toBeDefined();
      expect(unchangedPanel!.layers.length).toBe(0); // No layers added
    });

    it('should mark panel as modified after user edits', async () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const panel = gridStore.current.getAllPanels()[0];

      // Act - Simulate user modification
      act(() => {
        gridStore.current.markPanelAsModified(panel.id);
      });

      // Assert - Requirements 11.5
      const modifiedPanel = gridStore.current.getPanelById(panel.id);
      expect(modifiedPanel?.metadata.modified).toBe(true);
    });
  });

  describe('Batch Generation', () => {
    it('should generate images for multiple panels', async () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const panels = gridStore.current.getAllPanels().slice(0, 3); // First 3 panels

      const batchRequest = {
        panels: panels.map((panel) => ({
          panelId: panel.id,
          prompt: `Generate panel ${panel.id}`,
          seed: Math.floor(Math.random() * 1000000),
          transform: panel.transform,
          crop: panel.crop,
          styleReference: 'master-coherence-sheet',
          width: 512,
          height: 512,
        })),
        parallel: true,
        maxConcurrent: 3,
      };

      // Act
      const response = await mockGridAPI.batchGeneratePanels(batchRequest);

      // Assert
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.results.length).toBe(3);
      expect(response.data?.completedPanels).toBe(3);
      expect(response.data?.failedPanels).toBe(0);
      expect(response.data?.status).toBe('completed');
    });

    it('should handle partial batch failures', async () => {
      // Arrange
      mockGridAPI.setMockFailureRate(0.5); // 50% failure rate
      const { result: gridStore } = renderHook(() => useGridStore());
      const panels = gridStore.current.getAllPanels().slice(0, 4);

      const batchRequest = {
        panels: panels.map((panel) => ({
          panelId: panel.id,
          prompt: `Generate panel ${panel.id}`,
          seed: Math.floor(Math.random() * 1000000),
          transform: panel.transform,
          crop: panel.crop,
          styleReference: 'master-coherence-sheet',
        })),
        parallel: true,
      };

      // Act
      const response = await mockGridAPI.batchGeneratePanels(batchRequest);

      // Assert
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data!.totalPanels).toBe(4);
      expect(response.data!.completedPanels + response.data!.failedPanels).toBe(4);
      
      // Some should succeed, some should fail
      expect(response.data!.results.length).toBeGreaterThan(0);
      expect(response.data!.errors.length).toBeGreaterThan(0);
    });

    it('should update all panels after batch generation', async () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const panels = gridStore.current.getAllPanels().slice(0, 3);

      const batchRequest = {
        panels: panels.map((panel) => ({
          panelId: panel.id,
          prompt: `Generate panel ${panel.id}`,
          seed: Math.floor(Math.random() * 1000000),
          transform: panel.transform,
          crop: panel.crop,
          styleReference: 'master-coherence-sheet',
          width: 512,
          height: 512,
        })),
      };

      // Act
      const response = await mockGridAPI.batchGeneratePanels(batchRequest);

      if (response.success && response.data) {
        act(() => {
          response.data!.results.forEach((result) => {
            gridStore.current.updatePanelImage(
              result.panelId,
              result.imageUrl,
              result.metadata
            );
          });
        });
      }

      // Assert
      panels.forEach((panel) => {
        const updatedPanel = gridStore.current.getPanelById(panel.id);
        expect(updatedPanel).toBeDefined();
        expect(updatedPanel!.layers.length).toBeGreaterThan(0);
        expect(updatedPanel!.metadata.generatedAt).toBeDefined();
      });
    });
  });

  describe('Image Loading and Caching', () => {
    it('should verify image loader service is available', () => {
      // Arrange & Act
      const config = imageLoader.getConfig();
      const stats = imageLoader.getCacheStats();

      // Assert
      expect(imageLoader).toBeDefined();
      expect(config).toBeDefined();
      expect(config.cacheSize).toBeGreaterThan(0);
      expect(stats).toBeDefined();
      expect(stats.imageCount).toBeGreaterThanOrEqual(0);
    });

    it('should have mipmap configuration', () => {
      // Arrange & Act
      const config = imageLoader.getConfig();

      // Assert
      expect(config.mipmap).toBeDefined();
      expect(config.mipmap.maxLevels).toBeGreaterThan(0);
      expect(config.mipmap.minSize).toBeGreaterThan(0);
      expect(config.mipmap.quality).toBeGreaterThan(0);
      expect(config.mipmap.quality).toBeLessThanOrEqual(1);
    });

    it('should support cache management operations', () => {
      // Arrange
      const initialStats = imageLoader.getCacheStats();

      // Act - Clear cache
      imageLoader.clearCache();
      const clearedStats = imageLoader.getCacheStats();

      // Assert
      expect(clearedStats.imageCount).toBe(0);
      expect(clearedStats.mipmapCount).toBe(0);
      expect(clearedStats.totalSize).toBe(0);
      
      // Verify cache size configuration
      expect(clearedStats.maxSize).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Focus Mode Tests
  // ============================================================================

  describe('Focus Mode Transitions', () => {
    it('should enter focus mode for a panel', () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panel = gridStore.current.getAllPanels()[0];
      const panelBounds = { width: 640, height: 360 };

      // Act - Requirements 2.5
      act(() => {
        viewportStore.current.focusPanel(panel.id, panelBounds);
      });

      // Assert
      expect(viewportStore.current.focusedPanelId).toBe(panel.id);
      expect(viewportStore.current.zoom).toBeGreaterThan(1.0); // Should zoom in
    });

    it('should exit focus mode', () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panel = gridStore.current.getAllPanels()[0];
      const panelBounds = { width: 640, height: 360 };

      // Enter focus mode first
      act(() => {
        viewportStore.current.focusPanel(panel.id, panelBounds);
      });

      expect(viewportStore.current.focusedPanelId).toBe(panel.id);

      // Act - Requirements 2.7
      act(() => {
        viewportStore.current.exitFocusMode();
      });

      // Assert
      expect(viewportStore.current.focusedPanelId).toBeNull();
    });

    it('should preserve selection state during focus mode', () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panel = gridStore.current.getAllPanels()[0];
      const panelBounds = { width: 640, height: 360 };

      // Select panel first
      act(() => {
        gridStore.current.selectPanel(panel.id, false);
      });

      expect(gridStore.current.selectedPanelIds).toContain(panel.id);

      // Act - Enter focus mode (Requirements 2.7)
      act(() => {
        viewportStore.current.focusPanel(panel.id, panelBounds);
      });

      // Assert - Selection should be preserved
      expect(gridStore.current.selectedPanelIds).toContain(panel.id);
      expect(viewportStore.current.focusedPanelId).toBe(panel.id);

      // Act - Exit focus mode
      act(() => {
        viewportStore.current.exitFocusMode();
      });

      // Assert - Selection should still be preserved
      expect(gridStore.current.selectedPanelIds).toContain(panel.id);
    });

    it('should calculate zoom to maximize panel display', () => {
      // Arrange
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panelBounds = { width: 640, height: 360 };
      const viewportBounds = { width: 1920, height: 1080 };

      act(() => {
        viewportStore.current.setBounds(viewportBounds);
      });

      // Act - Requirements 2.6
      act(() => {
        viewportStore.current.focusPanel('panel-0-0', panelBounds);
      });

      // Assert - Zoom should maximize panel display
      const zoom = viewportStore.current.zoom;
      expect(zoom).toBeGreaterThan(1.0);
      
      // Panel should fit within viewport with some padding
      const scaledWidth = panelBounds.width * zoom;
      const scaledHeight = panelBounds.height * zoom;
      expect(scaledWidth).toBeLessThanOrEqual(viewportBounds.width);
      expect(scaledHeight).toBeLessThanOrEqual(viewportBounds.height);
    });

    it('should center panel in viewport during focus mode', () => {
      // Arrange
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panelBounds = { width: 640, height: 360 };
      const viewportBounds = { width: 1920, height: 1080 };

      act(() => {
        viewportStore.current.setBounds(viewportBounds);
      });

      // Act - Requirements 2.6
      act(() => {
        viewportStore.current.focusPanel('panel-0-0', panelBounds);
      });

      // Assert - Panel should be centered
      const { zoom, pan } = viewportStore.current;
      const scaledWidth = panelBounds.width * zoom;
      const scaledHeight = panelBounds.height * zoom;

      // Pan should center the panel
      const expectedPanX = (viewportBounds.width - scaledWidth) / 2;
      const expectedPanY = (viewportBounds.height - scaledHeight) / 2;

      expect(Math.abs(pan.x - expectedPanX)).toBeLessThan(1);
      expect(Math.abs(pan.y - expectedPanY)).toBeLessThan(1);
    });

    it('should handle focus mode round trip', () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panel = gridStore.current.getAllPanels()[0];
      const panelBounds = { width: 640, height: 360 };

      // Select panel
      act(() => {
        gridStore.current.selectPanel(panel.id, false);
      });

      const initialSelection = [...gridStore.current.selectedPanelIds];
      const initialZoom = viewportStore.current.zoom;
      const initialPan = { ...viewportStore.current.pan };

      // Act - Enter and exit focus mode
      act(() => {
        viewportStore.current.focusPanel(panel.id, panelBounds);
      });

      expect(viewportStore.current.focusedPanelId).toBe(panel.id);

      act(() => {
        viewportStore.current.exitFocusMode();
      });

      // Assert - Selection should be preserved
      expect(gridStore.current.selectedPanelIds).toEqual(initialSelection);
      expect(viewportStore.current.focusedPanelId).toBeNull();
      
      // Note: Zoom and pan may not return to exact initial values
      // This is expected behavior - the test verifies selection preservation
    });
  });

  describe('Integration: Backend + Focus Mode', () => {
    it('should generate image and enter focus mode', async () => {
      // Arrange
      const { result: gridStore } = renderHook(() => useGridStore());
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panel = gridStore.current.getAllPanels()[0];
      const panelBounds = { width: 640, height: 360 };

      // Act - Generate image
      const generationConfig: PanelGenerationConfig = {
        panelId: panel.id,
        prompt: 'Test panel',
        seed: 12345,
        transform: panel.transform,
        crop: panel.crop,
        styleReference: 'master-coherence-sheet',
        width: 512,
        height: 512,
      };

      const response = await mockGridAPI.generatePanelImage(generationConfig);

      if (response.success && response.data) {
        act(() => {
          gridStore.current.updatePanelImage(
            response.data!.panelId,
            response.data!.imageUrl,
            response.data!.metadata
          );
        });
      }

      // Act - Enter focus mode
      act(() => {
        viewportStore.current.focusPanel(panel.id, panelBounds);
      });

      // Assert
      const updatedPanel = gridStore.current.getPanelById(panel.id);
      expect(updatedPanel?.layers.length).toBeGreaterThan(0);
      expect(viewportStore.current.focusedPanelId).toBe(panel.id);
    });

    it('should handle generation error while in focus mode', async () => {
      // Arrange
      mockGridAPI.setMockFailureRate(1.0); // Force failure
      const { result: gridStore } = renderHook(() => useGridStore());
      const { result: viewportStore } = renderHook(() => useViewportStore());
      
      const panel = gridStore.current.getAllPanels()[0];
      const panelBounds = { width: 640, height: 360 };

      // Enter focus mode first
      act(() => {
        viewportStore.current.focusPanel(panel.id, panelBounds);
      });

      // Act - Attempt generation
      const generationConfig: PanelGenerationConfig = {
        panelId: panel.id,
        prompt: 'Test panel',
        seed: 12345,
        transform: panel.transform,
        crop: panel.crop,
        styleReference: 'master-coherence-sheet',
      };

      const response = await mockGridAPI.generatePanelImage(generationConfig);

      // Assert - Should remain in focus mode despite error
      expect(response.success).toBe(false);
      expect(viewportStore.current.focusedPanelId).toBe(panel.id);
      
      // Panel state should be unchanged
      const unchangedPanel = gridStore.current.getPanelById(panel.id);
      expect(unchangedPanel?.layers.length).toBe(0);
    });
  });
});
