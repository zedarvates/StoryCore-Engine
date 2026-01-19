/**
 * Annotation System Tests
 * 
 * Tests for annotation drawing tools, rendering, and controls
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 12.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGridStore } from '../../../stores/gridEditorStore';
import type { 
  AnnotationContent,
  DrawingElement,
  TextAnnotation,
  Layer
} from '../../../types/gridEditor';

describe('Annotation System', () => {
  beforeEach(() => {
    // Reset store before each test
    const { result } = renderHook(() => useGridStore());
    act(() => {
      result.current.loadConfiguration({
        version: '1.0',
        projectId: 'test-project',
        panels: [
          {
            id: 'panel-1',
            position: { row: 0, col: 0 },
            layers: [],
            transform: {
              position: { x: 0, y: 0 },
              scale: { x: 1, y: 1 },
              rotation: 0,
              pivot: { x: 0.5, y: 0.5 },
            },
            crop: null,
            annotations: [],
            metadata: {},
          },
        ],
        presets: [],
        metadata: {
          createdAt: new Date().toISOString(),
          modifiedAt: new Date().toISOString(),
        },
      });
    });
  });

  describe('Annotation Layer Creation', () => {
    it('should create annotation layer when adding first annotation', () => {
      const { result } = renderHook(() => useGridStore());

      // Create annotation layer
      const annotationLayer: Layer = {
        id: 'annotation-1',
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings: [],
          textAnnotations: [],
        },
      };

      act(() => {
        result.current.addLayer('panel-1', annotationLayer);
      });

      const panel = result.current.getAllPanels()[0];
      expect(panel.layers).toHaveLength(1);
      expect(panel.layers[0].type).toBe('annotation');
      expect(panel.layers[0].name).toBe('Annotations');
    });

    it('should store drawing elements in annotation layer', () => {
      const { result } = renderHook(() => useGridStore());

      // Create annotation layer with drawing
      const drawing: DrawingElement = {
        id: 'drawing-1',
        type: 'path',
        points: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.2 },
          { x: 0.3, y: 0.3 },
        ],
        style: {
          strokeColor: '#FF0000',
          strokeWidth: 3,
          opacity: 1.0,
        },
      };

      const annotationLayer: Layer = {
        id: 'annotation-1',
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings: [drawing],
          textAnnotations: [],
        },
      };

      act(() => {
        result.current.addLayer('panel-1', annotationLayer);
      });

      const panel = result.current.getAllPanels()[0];
      const content = panel.layers[0].content as AnnotationContent;
      
      expect(content.drawings).toHaveLength(1);
      expect(content.drawings[0].id).toBe('drawing-1');
      expect(content.drawings[0].type).toBe('path');
      expect(content.drawings[0].points).toHaveLength(3);
    });

    it('should store text annotations in annotation layer', () => {
      const { result } = renderHook(() => useGridStore());

      // Create annotation layer with text
      const textAnnotation: TextAnnotation = {
        id: 'text-1',
        text: 'Test annotation',
        position: { x: 0.5, y: 0.5 },
        style: {
          fontSize: 24,
          fontFamily: 'Arial',
          color: '#FFFFFF',
        },
      };

      const annotationLayer: Layer = {
        id: 'annotation-1',
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings: [],
          textAnnotations: [textAnnotation],
        },
      };

      act(() => {
        result.current.addLayer('panel-1', annotationLayer);
      });

      const panel = result.current.getAllPanels()[0];
      const content = panel.layers[0].content as AnnotationContent;
      
      expect(content.textAnnotations).toHaveLength(1);
      expect(content.textAnnotations[0].id).toBe('text-1');
      expect(content.textAnnotations[0].text).toBe('Test annotation');
      expect(content.textAnnotations[0].position).toEqual({ x: 0.5, y: 0.5 });
    });
  });

  describe('Annotation Layer Visibility', () => {
    it('should toggle annotation layer visibility', () => {
      const { result } = renderHook(() => useGridStore());

      // Create annotation layer
      const annotationLayer: Layer = {
        id: 'annotation-1',
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings: [],
          textAnnotations: [],
        },
      };

      act(() => {
        result.current.addLayer('panel-1', annotationLayer);
      });

      // Toggle visibility
      act(() => {
        result.current.updateLayer('panel-1', 'annotation-1', { visible: false });
      });

      let panel = result.current.getAllPanels()[0];
      expect(panel.layers[0].visible).toBe(false);

      // Toggle back
      act(() => {
        result.current.updateLayer('panel-1', 'annotation-1', { visible: true });
      });

      panel = result.current.getAllPanels()[0];
      expect(panel.layers[0].visible).toBe(true);
    });
  });

  describe('Annotation Layer Deletion', () => {
    it('should delete annotation layer and all its content', () => {
      const { result } = renderHook(() => useGridStore());

      // Create annotation layer with content
      const annotationLayer: Layer = {
        id: 'annotation-1',
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings: [
            {
              id: 'drawing-1',
              type: 'path',
              points: [{ x: 0, y: 0 }],
              style: {
                strokeColor: '#FF0000',
                strokeWidth: 3,
                opacity: 1.0,
              },
            },
          ],
          textAnnotations: [
            {
              id: 'text-1',
              text: 'Test',
              position: { x: 0.5, y: 0.5 },
              style: {
                fontSize: 24,
                fontFamily: 'Arial',
                color: '#FFFFFF',
              },
            },
          ],
        },
      };

      act(() => {
        result.current.addLayer('panel-1', annotationLayer);
      });

      let panel = result.current.getAllPanels()[0];
      expect(panel.layers).toHaveLength(1);

      // Delete layer
      act(() => {
        result.current.removeLayer('panel-1', 'annotation-1');
      });

      panel = result.current.getAllPanels()[0];
      expect(panel.layers).toHaveLength(0);
    });
  });

  describe('Multiple Drawing Types', () => {
    it('should support different drawing element types', () => {
      const { result } = renderHook(() => useGridStore());

      const drawings: DrawingElement[] = [
        {
          id: 'path-1',
          type: 'path',
          points: [{ x: 0, y: 0 }, { x: 0.1, y: 0.1 }],
          style: { strokeColor: '#FF0000', strokeWidth: 2, opacity: 1 },
        },
        {
          id: 'line-1',
          type: 'line',
          points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
          style: { strokeColor: '#00FF00', strokeWidth: 3, opacity: 1 },
        },
        {
          id: 'rect-1',
          type: 'rectangle',
          points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }],
          style: { strokeColor: '#0000FF', strokeWidth: 2, fillColor: '#0000FF', opacity: 0.5 },
        },
        {
          id: 'ellipse-1',
          type: 'ellipse',
          points: [{ x: 0.5, y: 0.5 }, { x: 0.8, y: 0.8 }],
          style: { strokeColor: '#FFFF00', strokeWidth: 2, opacity: 1 },
        },
      ];

      const annotationLayer: Layer = {
        id: 'annotation-1',
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings,
          textAnnotations: [],
        },
      };

      act(() => {
        result.current.addLayer('panel-1', annotationLayer);
      });

      const panel = result.current.getAllPanels()[0];
      const content = panel.layers[0].content as AnnotationContent;
      
      expect(content.drawings).toHaveLength(4);
      expect(content.drawings[0].type).toBe('path');
      expect(content.drawings[1].type).toBe('line');
      expect(content.drawings[2].type).toBe('rectangle');
      expect(content.drawings[3].type).toBe('ellipse');
    });
  });

  describe('Annotation Persistence', () => {
    it('should preserve annotations when exporting and importing configuration', () => {
      const { result } = renderHook(() => useGridStore());

      // Create annotation layer
      const annotationLayer: Layer = {
        id: 'annotation-1',
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings: [
            {
              id: 'drawing-1',
              type: 'path',
              points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }],
              style: {
                strokeColor: '#FF0000',
                strokeWidth: 3,
                opacity: 1.0,
              },
            },
          ],
          textAnnotations: [
            {
              id: 'text-1',
              text: 'Test annotation',
              position: { x: 0.5, y: 0.5 },
              style: {
                fontSize: 24,
                fontFamily: 'Arial',
                color: '#FFFFFF',
              },
            },
          ],
        },
      };

      act(() => {
        result.current.addLayer('panel-1', annotationLayer);
      });

      // Export configuration
      const exported = result.current.exportConfiguration();

      // Import into new store instance
      act(() => {
        result.current.loadConfiguration(exported);
      });

      // Verify annotations are preserved
      const panel = result.current.getAllPanels()[0];
      expect(panel.layers).toHaveLength(1);
      
      const content = panel.layers[0].content as AnnotationContent;
      expect(content.drawings).toHaveLength(1);
      expect(content.drawings[0].id).toBe('drawing-1');
      expect(content.textAnnotations).toHaveLength(1);
      expect(content.textAnnotations[0].text).toBe('Test annotation');
    });
  });
});
