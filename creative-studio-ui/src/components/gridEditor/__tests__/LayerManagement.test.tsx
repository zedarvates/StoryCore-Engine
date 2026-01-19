/**
 * Layer Management System Tests
 * 
 * Tests for layer operations and LayerStack component
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridStore } from '../../../stores/gridEditorStore';
import {
  createImageLayer,
  createAnnotationLayer,
  createEffectLayer,
  duplicateLayer,
  validateLayer,
  canModifyLayer,
  canDeleteLayer,
  toggleLayerVisibility,
  toggleLayerLock,
  updateLayerOpacity,
} from '../LayerOperations';

describe('Layer Operations', () => {
  describe('Layer Creation', () => {
    it('should create a valid image layer', () => {
      const layer = createImageLayer('test.jpg', 800, 600, 'Test Image');
      
      expect(layer.id).toBeDefined();
      expect(layer.name).toBe('Test Image');
      expect(layer.type).toBe('image');
      expect(layer.visible).toBe(true);
      expect(layer.locked).toBe(false);
      expect(layer.opacity).toBe(1.0);
      expect(layer.blendMode).toBe('normal');
      expect(layer.content.type).toBe('image');
      expect((layer.content as any).url).toBe('test.jpg');
    });

    it('should create a valid annotation layer', () => {
      const layer = createAnnotationLayer('Test Annotation');
      
      expect(layer.id).toBeDefined();
      expect(layer.name).toBe('Test Annotation');
      expect(layer.type).toBe('annotation');
      expect(layer.visible).toBe(true);
      expect(layer.locked).toBe(false);
      expect(layer.content.type).toBe('annotation');
    });

    it('should create a valid effect layer', () => {
      const layer = createEffectLayer('blur', { radius: 5 }, 'Blur Effect');
      
      expect(layer.id).toBeDefined();
      expect(layer.name).toBe('Blur Effect');
      expect(layer.type).toBe('effect');
      expect(layer.content.type).toBe('effect');
      expect((layer.content as any).effectType).toBe('blur');
    });
  });

  describe('Layer Validation', () => {
    it('should validate a correct layer', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      const result = validateLayer(layer);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject layer without ID', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      layer.id = '';
      const result = validateLayer(layer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject layer with invalid opacity', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      layer.opacity = 1.5;
      const result = validateLayer(layer);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Layer Duplication', () => {
    it('should duplicate layer with new ID', () => {
      const original = createImageLayer('test.jpg', 800, 600, 'Original');
      const duplicate = duplicateLayer(original);
      
      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Original (Copy)');
      expect(duplicate.locked).toBe(false);
      expect(duplicate.type).toBe(original.type);
      expect(duplicate.opacity).toBe(original.opacity);
    });
  });

  describe('Layer Modification Checks', () => {
    it('should allow modification of unlocked layer', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      expect(canModifyLayer(layer)).toBe(true);
    });

    it('should prevent modification of locked layer', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      layer.locked = true;
      expect(canModifyLayer(layer)).toBe(false);
    });

    it('should allow deletion of unlocked layer', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      expect(canDeleteLayer(layer, 2)).toBe(true);
    });

    it('should prevent deletion of locked layer', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      layer.locked = true;
      expect(canDeleteLayer(layer, 2)).toBe(false);
    });
  });

  describe('Layer Property Updates', () => {
    it('should toggle layer visibility', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      const toggled = toggleLayerVisibility(layer);
      
      expect(toggled.visible).toBe(false);
      expect(toggled.id).toBe(layer.id);
    });

    it('should toggle layer lock', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      const toggled = toggleLayerLock(layer);
      
      expect(toggled.locked).toBe(true);
      expect(toggled.id).toBe(layer.id);
    });

    it('should update layer opacity', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      const updated = updateLayerOpacity(layer, 0.5);
      
      expect(updated.opacity).toBe(0.5);
    });

    it('should clamp opacity to valid range', () => {
      const layer = createImageLayer('test.jpg', 800, 600);
      
      const tooHigh = updateLayerOpacity(layer, 1.5);
      expect(tooHigh.opacity).toBe(1.0);
      
      const tooLow = updateLayerOpacity(layer, -0.5);
      expect(tooLow.opacity).toBe(0);
    });
  });
});

describe('GridStore Layer Management', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useGridStore());
    act(() => {
      result.current.resetConfiguration('test-project');
    });
  });

  it('should add layer to panel', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    const layer = createImageLayer('test.jpg', 800, 600);

    act(() => {
      result.current.addLayer(panel.id, layer);
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    expect(updatedPanel?.layers).toHaveLength(1);
    expect(updatedPanel?.layers[0].id).toBe(layer.id);
  });

  it('should remove layer from panel', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    const layer = createImageLayer('test.jpg', 800, 600);

    act(() => {
      result.current.addLayer(panel.id, layer);
    });

    act(() => {
      result.current.removeLayer(panel.id, layer.id);
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    expect(updatedPanel?.layers).toHaveLength(0);
  });

  it('should reorder layers correctly', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    
    const layer1 = createImageLayer('test1.jpg', 800, 600, 'Layer 1');
    const layer2 = createImageLayer('test2.jpg', 800, 600, 'Layer 2');
    const layer3 = createImageLayer('test3.jpg', 800, 600, 'Layer 3');

    act(() => {
      result.current.addLayer(panel.id, layer1);
      result.current.addLayer(panel.id, layer2);
      result.current.addLayer(panel.id, layer3);
    });

    // Move layer3 to index 0 (bottom)
    act(() => {
      result.current.reorderLayers(panel.id, layer3.id, 0);
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    expect(updatedPanel?.layers[0].id).toBe(layer3.id);
    expect(updatedPanel?.layers[1].id).toBe(layer1.id);
    expect(updatedPanel?.layers[2].id).toBe(layer2.id);
  });

  it('should toggle layer visibility', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    const layer = createImageLayer('test.jpg', 800, 600);

    act(() => {
      result.current.addLayer(panel.id, layer);
    });

    act(() => {
      result.current.toggleLayerVisibility(panel.id, layer.id);
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    expect(updatedPanel?.layers[0].visible).toBe(false);
  });

  it('should toggle layer lock', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    const layer = createImageLayer('test.jpg', 800, 600);

    act(() => {
      result.current.addLayer(panel.id, layer);
    });

    act(() => {
      result.current.toggleLayerLock(panel.id, layer.id);
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    expect(updatedPanel?.layers[0].locked).toBe(true);
  });

  it('should update layer properties', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    const layer = createImageLayer('test.jpg', 800, 600);

    act(() => {
      result.current.addLayer(panel.id, layer);
    });

    act(() => {
      result.current.updateLayer(panel.id, layer.id, {
        opacity: 0.5,
        name: 'Updated Layer',
      });
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    expect(updatedPanel?.layers[0].opacity).toBe(0.5);
    expect(updatedPanel?.layers[0].name).toBe('Updated Layer');
  });

  it('should maintain layer z-order (Requirements: 5.2)', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    
    const bottomLayer = createImageLayer('bottom.jpg', 800, 600, 'Bottom');
    const middleLayer = createImageLayer('middle.jpg', 800, 600, 'Middle');
    const topLayer = createImageLayer('top.jpg', 800, 600, 'Top');

    act(() => {
      result.current.addLayer(panel.id, bottomLayer);
      result.current.addLayer(panel.id, middleLayer);
      result.current.addLayer(panel.id, topLayer);
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    
    // Verify z-order: index 0 = bottom, last index = top
    expect(updatedPanel?.layers[0].name).toBe('Bottom');
    expect(updatedPanel?.layers[1].name).toBe('Middle');
    expect(updatedPanel?.layers[2].name).toBe('Top');
  });

  it('should handle multiple layers with different blend modes (Requirements: 5.8)', () => {
    const { result } = renderHook(() => useGridStore());
    const panel = result.current.getAllPanels()[0];
    
    const layer1 = createImageLayer('test1.jpg', 800, 600, 'Normal');
    layer1.blendMode = 'normal';
    
    const layer2 = createImageLayer('test2.jpg', 800, 600, 'Multiply');
    layer2.blendMode = 'multiply';

    act(() => {
      result.current.addLayer(panel.id, layer1);
      result.current.addLayer(panel.id, layer2);
    });

    const updatedPanel = result.current.getPanelById(panel.id);
    expect(updatedPanel?.layers[0].blendMode).toBe('normal');
    expect(updatedPanel?.layers[1].blendMode).toBe('multiply');
  });
});
